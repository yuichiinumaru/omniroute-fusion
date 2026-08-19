/**
 * Task 0172: Docker-only Cursor CLI local auth capture.
 *
 * Owns the bounded subprocess + auth-file parsing contract for the
 * Cursor "Experimental Auto" CLI login flow. Reuses safe persistence
 * paths and redaction helpers; never exposes raw tokens, JWTs, or auth JSON.
 *
 * Security invariants enforced by this module:
 *  - Pre-login snapshot is held SERVER-SIDE behind an opaque session ID.
 *  - Raw access tokens / JWTs NEVER reach API responses or frontend state.
 *  - Path traversal is blocked by ensureUnderAllowed() on every resolution.
 *  - Concurrent captures are serialized via a module-level lock.
 *  - Subprocess is cancellable via AbortSignal and killed on timeout/cancel.
 *  - Auth records are validated with bounded schema checks.
 */

import { execFile, spawn, type ChildProcess } from "child_process";
import { promisify } from "util";
import { createHash, randomBytes } from "crypto";
import path from "path";
import fs from "fs";
import os from "os";

import { isRunningInDocker } from "@/lib/zed-oauth/dockerDetect";
import { createProviderConnection, updateProviderConnection, getProviderConnections } from "@/models";

const execFileAsync = promisify(execFile);

// ---------------------------------------------------------------------------
// Dependency injection interface
// ---------------------------------------------------------------------------

export interface CursorLocalCaptureDeps {
  isDocker: () => boolean;
  execFile: typeof execFileAsync;
  spawn: typeof spawn;
  existsSync: (p: string) => boolean;
  readFile: (p: string, encoding: BufferEncoding) => Promise<string>;
  homedir: () => string;
  now: () => number;
  randomBytes?: (size: number) => Buffer;
  createHash?: (algorithm: string) => ReturnType<typeof createHash>;
  resolveCursorAgentBinary?: (deps: CursorLocalCaptureDeps) => string | null;
  persistence?: {
    getProviderConnections: typeof getProviderConnections;
    createProviderConnection: typeof createProviderConnection;
    updateProviderConnection: typeof updateProviderConnection;
  };
}

const defaultDeps: CursorLocalCaptureDeps = {
  isDocker: () => isRunningInDocker(),
  execFile: execFileAsync,
  spawn,
  existsSync: fs.existsSync,
  readFile: (p, enc) => fs.promises.readFile(p, enc),
  homedir: os.homedir,
  now: () => Date.now(),
  randomBytes: (size: number) => randomBytes(size),
  createHash: (algo: string) => createHash(algo),
};

// ---------------------------------------------------------------------------
// Public DTOs — secret-free by design
// ---------------------------------------------------------------------------

export interface CursorAuthRecordIdentity {
  email: string | null;
  userId: string | null;
  machineId: string | null;
}

/**
 * Secret-free auth record exposed in public results.
 * Contains a SHA-256 digest of the access token, never the raw token.
 */
export interface SafeCursorAuthRecord {
  keyDigest: string;
  email: string | null;
  userId: string | null;
  machineId: string | null;
  hasRefreshToken: boolean;
  source: "cursor-agent";
}

/**
 * Internal-only record with raw tokens. NEVER returned from any public
 * function. Used exclusively for encrypted persistence.
 */
export interface InternalCursorAuthRecord {
  accessToken: string;
  refreshToken?: string;
  email: string | null;
  userId: string | null;
  machineId: string | null;
  keyDigest: string;
}

// ---------------------------------------------------------------------------
// Options / Result types
// ---------------------------------------------------------------------------

export interface StartCursorLoginOptions {
  deps?: CursorLocalCaptureDeps;
  timeoutMs?: number;
  cursorBin?: string;
  extraLoginArgs?: string[];
  signal?: AbortSignal;
  authPath?: string;
  allowedBaseDir?: string;
}

export interface StartCursorLoginResult {
  ok: boolean;
  command: string[];
  status:
    | "started"
    | "not-docker"
    | "missing-mount"
    | "missing-binary"
    | "timeout"
    | "cancelled"
    | "failed"
    | "concurrent-session";
  safeMessage: string;
  captureSessionId?: string;
  authUrl?: string;
}

export interface ReadCursorAuthStoreOptions {
  deps?: CursorLocalCaptureDeps;
  authPath?: string;
  allowedBaseDir?: string;
}

export interface ReadCursorAuthStoreResult {
  ok: boolean;
  status:
    | "ok"
    | "missing-file"
    | "missing-mount"
    | "invalid-shape"
    | "unsupported-environment"
    | "path-traversal"
    | "file-too-large";
  safeMessage: string;
  records: SafeCursorAuthRecord[];
}

export interface ConfirmCursorCaptureOptions {
  captureSessionId: string;
  deps?: CursorLocalCaptureDeps;
  authPath?: string;
  allowedBaseDir?: string;
}

export interface ConfirmCursorCaptureResult {
  ok: boolean;
  status:
    | "captured"
    | "missing-file"
    | "invalid-shape"
    | "stale-record"
    | "ambiguous-records"
    | "unsupported-environment"
    | "invalid-session"
    | "expired-session"
    | "path-traversal"
    | "file-too-large"
    | "failed";
  safeMessage: string;
  connectionId?: string;
  identity?: CursorAuthRecordIdentity;
}

// ---------------------------------------------------------------------------
// Constants and validation
// ---------------------------------------------------------------------------

const CURSOR_AUTH_PATH_ENV = "CURSOR_AUTH_PATH";
const MAX_AUTH_FILE_BYTES = 1_048_576; // 1 MiB — bounded file read
const MAX_STRING_FIELD_LENGTH = 4096; // bounded field length
const CAPTURE_SESSION_TTL_MS = 600_000; // 10 minutes

// Allowed mount base directories inside Docker
const ALLOWED_MOUNT_BASES = [
  "/root/.config/cursor",
  "/root/.config",
  "/home",
  "/host-home/.config/cursor",
  "/host-local/.config/cursor",
];

// ---------------------------------------------------------------------------
// Server-side capture session store
// ---------------------------------------------------------------------------

interface CursorCaptureSession {
  id: string;
  snapshotDigests: Set<string>;
  createdAt: number;
  used: boolean;
  authPath: string;
  allowedBaseDir: string;
  authUrl?: string;
  terminalStatus?: Extract<
    StartCursorLoginResult["status"],
    "timeout" | "cancelled" | "failed" | "missing-binary"
  >;
  timeoutTimer?: ReturnType<typeof setTimeout>;
  forceKillTimer?: ReturnType<typeof setTimeout>;
  abortHandler?: () => void;
}

const captureSessionStore = new Map<string, CursorCaptureSession>();

// Active capture lock — only one capture subprocess at a time
let activeCaptureSessionId: string | null = null;
let activeChildProcess: ChildProcess | null = null;

function cleanExpiredSessions(now: number): void {
  for (const [id, session] of captureSessionStore) {
    if (now - session.createdAt > CAPTURE_SESSION_TTL_MS) {
      if (activeCaptureSessionId === id) {
        terminateChild(session, "timeout");
      } else {
        cleanupCapture(id);
      }
    }
  }
}

function generateSessionId(deps: CursorLocalCaptureDeps): string {
  return (deps.randomBytes ?? defaultDeps.randomBytes!)(32).toString("hex");
}

function hashKey(deps: CursorLocalCaptureDeps, key: string): string {
  return (deps.createHash ?? defaultDeps.createHash!)("sha256").update(key).digest("hex");
}

// ---------------------------------------------------------------------------
// Path safety
// ---------------------------------------------------------------------------

export function resolveAndValidateCursorAuthPath(
  deps: CursorLocalCaptureDeps,
  explicit?: string,
  allowedBase?: string
): { path: string; allowedBaseDir: string } {
  let raw: string;
  if (explicit && explicit.trim()) {
    raw = explicit.trim();
  } else {
    const envPath = process.env[CURSOR_AUTH_PATH_ENV];
    if (envPath && envPath.trim()) {
      raw = envPath.trim();
    } else {
      raw = path.join(deps.homedir(), ".config", "cursor", "auth.json");
    }
  }

  const resolved = path.resolve(raw);
  const allowedBases = allowedBase
    ? [allowedBase]
    : [
        path.join(deps.homedir(), ".config", "cursor"),
        path.join(deps.homedir(), ".config"),
        ...ALLOWED_MOUNT_BASES,
      ];
  const matchedBase = allowedBases.find((candidate) => {
    try {
      ensureUnderAllowed(resolved, candidate);
      return true;
    } catch {
      return false;
    }
  });
  if (!matchedBase) {
    throw new Error("Auth path is outside the allowed mount");
  }
  return { path: resolved, allowedBaseDir: path.resolve(matchedBase) };
}

export function ensureUnderAllowed(target: string, allowedBaseDir: string): void {
  const resolvedTarget = path.resolve(target);
  const resolvedAllowed = path.resolve(allowedBaseDir);
  if (resolvedTarget !== resolvedAllowed && !resolvedTarget.startsWith(resolvedAllowed + path.sep)) {
    throw new Error("Auth path is outside the allowed mount");
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function redactCursorSecrets(message: string): string {
  if (!message || typeof message !== "string") return "";
  return message
    .replace(/eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g, "[REDACTED_JWT]")
    .replace(/Bearer\s+[^\s]+/gi, "Bearer [REDACTED]")
    .replace(
      /(?:accessToken|refreshToken|token|secret|key)["']?\s*[:=]\s*["']?[^"'\s,]+/gi,
      "$1: [REDACTED]"
    );
}

export function redactCursorAuthRecord(record: SafeCursorAuthRecord): SafeCursorAuthRecord {
  return {
    keyDigest: record.keyDigest,
    email: record.email,
    userId: record.userId,
    machineId: record.machineId,
    hasRefreshToken: record.hasRefreshToken,
    source: record.source,
  };
}

export function extractJwtClaims(jwt: string): { email: string | null; userId: string | null } {
  try {
    const parts = jwt.split(".");
    if (parts.length === 3) {
      let payload = parts[1];
      while (payload.length % 4) {
        payload += "=";
      }
      const decoded = JSON.parse(
        Buffer.from(payload.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8")
      );
      const email =
        typeof decoded.email === "string" && decoded.email.includes("@") ? decoded.email : null;
      const userId =
        typeof decoded.sub === "string"
          ? decoded.sub
          : typeof decoded.user_id === "string"
            ? decoded.user_id
            : null;
      return { email, userId };
    }
  } catch {
    // ignore parse error
  }
  return { email: null, userId: null };
}

export function extractCursorAuthUrl(output: string): string | null {
  if (!output || typeof output !== "string") return null;
  const deepControlMatch = output.match(
    /https:\/\/(?:[a-zA-Z0-9-]+\.)?cursor\.com\/loginDeepControl[^\s"'<>)]*/i
  );
  if (deepControlMatch) return deepControlMatch[0];

  const loginMatch = output.match(/https:\/\/(?:[a-zA-Z0-9-]+\.)?cursor\.com\/login[^\s"'<>)]*/i);
  if (loginMatch) return loginMatch[0];

  return null;
}

export function resolveCursorAgentBinary(deps: CursorLocalCaptureDeps): string | null {
  const home = deps.homedir();
  const candidates = [
    path.join(home, ".local", "bin", "cursor-agent"),
    "/root/.local/bin/cursor-agent",
    "/usr/local/bin/cursor-agent",
    "/usr/bin/cursor-agent",
  ];
  for (const candidate of candidates) {
    if (deps.existsSync(candidate)) return candidate;
  }
  const pathDirs = (process.env.PATH || "").split(path.delimiter).filter(Boolean);
  for (const dir of pathDirs) {
    const candidate = path.join(dir, "cursor-agent");
    if (deps.existsSync(candidate)) return candidate;
  }
  return null;
}

export function extractCursorAuthRecord(
  rawJson: unknown,
  deps: CursorLocalCaptureDeps = defaultDeps
): InternalCursorAuthRecord | null {
  if (!rawJson || typeof rawJson !== "object") return null;

  let accessToken: string | null = null;
  let refreshToken: string | undefined = undefined;
  let email: string | null = null;
  let userId: string | null = null;
  let machineId: string | null = null;

  const doc = rawJson as Record<string, unknown>;

  if (typeof doc.accessToken === "string" && doc.accessToken.length >= 20) {
    accessToken = doc.accessToken;
  } else if (typeof doc.token === "string" && doc.token.length >= 20) {
    accessToken = doc.token;
  } else if (doc.auth && typeof doc.auth === "object") {
    const authObj = doc.auth as Record<string, unknown>;
    if (typeof authObj.accessToken === "string" && authObj.accessToken.length >= 20) {
      accessToken = authObj.accessToken;
    } else if (typeof authObj.token === "string" && authObj.token.length >= 20) {
      accessToken = authObj.token;
    }
  }

  if (!accessToken || accessToken.length > MAX_STRING_FIELD_LENGTH) return null;

  if (
    typeof doc.refreshToken === "string" &&
    doc.refreshToken.length > 0 &&
    doc.refreshToken.length <= MAX_STRING_FIELD_LENGTH
  ) {
    refreshToken = doc.refreshToken;
  }
  if (
    typeof doc.email === "string" &&
    doc.email.includes("@") &&
    doc.email.length <= 320
  ) {
    email = doc.email;
  }
  if (
    typeof doc.userId === "string" &&
    doc.userId.length > 0 &&
    doc.userId.length <= MAX_STRING_FIELD_LENGTH
  ) {
    userId = doc.userId;
  }
  if (
    typeof doc.machineId === "string" &&
    doc.machineId.length > 0 &&
    doc.machineId.length <= MAX_STRING_FIELD_LENGTH
  ) {
    machineId = doc.machineId;
  }

  // Fall back to extracting claims from JWT
  if (!email || !userId) {
    const jwtClaims = extractJwtClaims(accessToken);
    if (!email && jwtClaims.email) email = jwtClaims.email;
    if (!userId && jwtClaims.userId) userId = jwtClaims.userId;
  }

  const keyDigest = hashKey(deps, accessToken);

  return {
    accessToken,
    refreshToken,
    email,
    userId,
    machineId,
    keyDigest,
  };
}

/**
 * Internal-only: parse all Cursor auth records with raw tokens for snapshotting
 * and persistence. Supports single-object, array of accounts, and nested auth maps.
 * Never returned from public functions or API routes.
 */
export async function readInternalCursorAuthRecords(
  deps: CursorLocalCaptureDeps,
  authPath: string
): Promise<InternalCursorAuthRecord[] | null> {
  if (!deps.existsSync(authPath)) return null;

  let text: string;
  try {
    text = await deps.readFile(authPath, "utf8");
  } catch {
    return null;
  }

  if (Buffer.byteLength(text, "utf8") > MAX_AUTH_FILE_BYTES) return null;

  let rawJson: unknown;
  try {
    rawJson = JSON.parse(text);
  } catch {
    return null;
  }

  if (!rawJson || typeof rawJson !== "object") return null;

  const recordsMap = new Map<string, InternalCursorAuthRecord>();

  if (Array.isArray(rawJson)) {
    for (const item of rawJson) {
      const rec = extractCursorAuthRecord(item, deps);
      if (rec && !recordsMap.has(rec.keyDigest)) {
        recordsMap.set(rec.keyDigest, rec);
      }
    }
  } else {
    const obj = rawJson as Record<string, unknown>;
    if (Array.isArray(obj.accounts)) {
      for (const item of obj.accounts) {
        const rec = extractCursorAuthRecord(item, deps);
        if (rec && !recordsMap.has(rec.keyDigest)) {
          recordsMap.set(rec.keyDigest, rec);
        }
      }
    }
    const single = extractCursorAuthRecord(obj, deps);
    if (single && !recordsMap.has(single.keyDigest)) {
      recordsMap.set(single.keyDigest, single);
    }
    for (const val of Object.values(obj)) {
      if (val && typeof val === "object" && !Array.isArray(val)) {
        const nested = extractCursorAuthRecord(val, deps);
        if (nested && !recordsMap.has(nested.keyDigest)) {
          recordsMap.set(nested.keyDigest, nested);
        }
      }
    }
  }

  if (recordsMap.size === 0) return null;
  return Array.from(recordsMap.values());
}

export function buildDockerOnlyError(
  status: StartCursorLoginResult["status"],
  safeMessage: string
): StartCursorLoginResult {
  return { ok: false, command: [], status, safeMessage };
}

function terminateChild(
  session: CursorCaptureSession,
  reason: "timeout" | "cancelled"
): void {
  session.terminalStatus = reason;
  if (activeChildProcess) {
    try {
      activeChildProcess.kill("SIGTERM");
    } catch {
      /* ignore */
    }
    const proc = activeChildProcess;
    session.forceKillTimer = setTimeout(() => {
      try {
        proc.kill("SIGKILL");
      } catch {
        /* ignore */
      }
    }, 2000);
  }
  cleanupCapture(session.id);
}

function cleanupCapture(sessionId: string): void {
  const session = captureSessionStore.get(sessionId);
  if (session) {
    if (session.timeoutTimer) clearTimeout(session.timeoutTimer);
    session.timeoutTimer = undefined;
    if (session.forceKillTimer) clearTimeout(session.forceKillTimer);
    session.forceKillTimer = undefined;
    captureSessionStore.delete(sessionId);
  }
  if (activeCaptureSessionId === sessionId) {
    activeCaptureSessionId = null;
    activeChildProcess = null;
  }
}

// ---------------------------------------------------------------------------
// Core public functions
// ---------------------------------------------------------------------------

/**
 * Start a Cursor CLI login subprocess (`cursor-agent logout && cursor-agent login`).
 * Captures stdout for browser authentication URL and returns an opaque captureSessionId.
 */
export async function startLocalCursorLogin(
  options: StartCursorLoginOptions = {}
): Promise<StartCursorLoginResult> {
  const deps = options.deps ?? defaultDeps;
  const timeoutMs = options.timeoutMs ?? 120_000;
  const signal = options.signal;
  const now = deps.now();

  if (!deps.isDocker()) {
    return buildDockerOnlyError(
      "not-docker",
      "Local Cursor CLI capture is only supported inside Docker."
    );
  }

  cleanExpiredSessions(now);
  if (activeCaptureSessionId && captureSessionStore.has(activeCaptureSessionId)) {
    return buildDockerOnlyError(
      "concurrent-session",
      "Another capture session is already active. Cancel or complete it first."
    );
  }

  const mountCandidates = [
    path.join(deps.homedir(), ".config", "cursor"),
    path.join(deps.homedir(), ".config"),
    "/root/.config/cursor",
    "/root/.config",
    "/host-home/.config/cursor",
    "/host-local/.config/cursor",
    "/home",
  ];
  const hasMount = mountCandidates.some((candidate) => deps.existsSync(candidate));
  if (!hasMount) {
    return buildDockerOnlyError(
      "missing-mount",
      "No Cursor auth mount was detected inside the container."
    );
  }

  let authPath: string;
  let allowedBase: string;
  try {
    const resolved = resolveAndValidateCursorAuthPath(
      deps,
      options.authPath,
      options.allowedBaseDir
    );
    authPath = resolved.path;
    allowedBase = resolved.allowedBaseDir;
  } catch {
    return buildDockerOnlyError("failed", "Auth path is outside the allowed mount.");
  }

  const binaryResolver = deps.resolveCursorAgentBinary ?? resolveCursorAgentBinary;
  const cursorBin = options.cursorBin ?? binaryResolver(deps) ?? "cursor-agent";

  if (!options.cursorBin && !binaryResolver(deps)) {
    if (!deps.existsSync(cursorBin)) {
      return buildDockerOnlyError(
        "missing-binary",
        "cursor-agent binary was not found. Ensure 'cursor-agent' is installed in the container."
      );
    }
  }

  // Snapshot existing token digests
  const snapshotDigests = new Set<string>();
  if (deps.existsSync(authPath)) {
    try {
      const records = await readInternalCursorAuthRecords(deps, authPath);
      if (records) {
        for (const rec of records) {
          snapshotDigests.add(rec.keyDigest);
        }
      }
    } catch {
      // ignore parse errors for snapshot
    }
  }

  const captureSessionId = generateSessionId(deps);
  const session: CursorCaptureSession = {
    id: captureSessionId,
    snapshotDigests,
    createdAt: now,
    used: false,
    authPath,
    allowedBaseDir: allowedBase,
  };
  captureSessionStore.set(captureSessionId, session);
  activeCaptureSessionId = captureSessionId;

  // Best-effort logout to clear stale state
  try {
    await deps.execFile(cursorBin, ["logout"]);
  } catch {
    // ignore logout errors if not logged in
  }

  const loginArgs = ["login", ...(options.extraLoginArgs ?? [])];
  const command = [cursorBin, ...loginArgs];

  try {
    if (signal?.aborted) {
      cleanupCapture(captureSessionId);
      return buildDockerOnlyError("cancelled", "Capture was cancelled before starting.");
    }

    const child = deps.spawn(cursorBin, loginArgs, {
      stdio: ["ignore", "pipe", "pipe"],
      timeout: timeoutMs,
    });
    activeChildProcess = child;

    let stderr = "";
    let stdout = "";
    const maxOutput = 8192;

    let detectedUrl: string | null = null;
    let urlResolveCallback: ((url: string | null) => void) | null = null;

    const onData = (chunk: Buffer | string) => {
      const str = typeof chunk === "string" ? chunk : chunk.toString();
      if (stdout.length < maxOutput) stdout += str.slice(0, maxOutput - stdout.length);
      if (!detectedUrl) {
        const url = extractCursorAuthUrl(stdout) || extractCursorAuthUrl(str);
        if (url) {
          detectedUrl = url;
          session.authUrl = url;
          if (urlResolveCallback) {
            urlResolveCallback(url);
            urlResolveCallback = null;
          }
        }
      }
    };

    child.stdout?.on("data", onData);
    child.stderr?.on("data", (chunk: Buffer | string) => {
      const str = typeof chunk === "string" ? chunk : chunk.toString();
      if (stderr.length < maxOutput) stderr += str.slice(0, maxOutput - stderr.length);
      onData(chunk);
    });

    let settled = false;
    const finish = (
      result: {
        ok: boolean;
        status: StartCursorLoginResult["status"];
        safeMessage: string;
      },
      retainSession = false
    ) => {
      if (settled) return;
      settled = true;
      if (session.timeoutTimer) clearTimeout(session.timeoutTimer);
      session.timeoutTimer = undefined;
      if (signal && session.abortHandler) signal.removeEventListener("abort", session.abortHandler);
      session.abortHandler = undefined;
      activeChildProcess = null;
      if (!retainSession) {
        cleanupCapture(captureSessionId);
      } else {
        activeCaptureSessionId = null;
      }
      return result;
    };

    const onAbort = () => {
      terminateChild(session, "cancelled");
    };
    session.abortHandler = onAbort;
    if (signal) signal.addEventListener("abort", onAbort, { once: true });

    session.timeoutTimer = setTimeout(() => {
      terminateChild(session, "timeout");
    }, timeoutMs);

    child.once("error", (err: NodeJS.ErrnoException) => {
      const status: StartCursorLoginResult["status"] =
        err.code === "ENOENT"
          ? "missing-binary"
          : err.code === "ETIMEDOUT" || err.message?.includes("ETIMEDOUT")
            ? "timeout"
            : "failed";
      const safeMessage =
        status === "missing-binary"
          ? "cursor-agent binary was not found. Ensure 'cursor-agent' is installed in the container."
          : redactCursorSecrets(err.message);
      finish({ ok: false, status, safeMessage });
    });

    child.once("close", (code: number | null) => {
      if (session.terminalStatus) {
        finish({
          ok: false,
          status: session.terminalStatus,
          safeMessage:
            session.terminalStatus === "timeout"
              ? "Cursor CLI login timed out."
              : "Capture was cancelled by the user.",
        });
        return;
      }
      if (code !== 0 && code !== null) {
        const message = stderr.trim() || `cursor-agent login exited with code ${code ?? "unknown"}`;
        finish({ ok: false, status: "failed", safeMessage: redactCursorSecrets(message) });
        return;
      }
      finish({ ok: true, status: "started", safeMessage: "Login process completed." }, true);
    });

    // Wait briefly for initial URL emission
    const urlWaitPromise = new Promise<string | null>((resolve) => {
      if (detectedUrl) {
        resolve(detectedUrl);
        return;
      }
      urlResolveCallback = resolve;
      setTimeout(() => {
        if (urlResolveCallback) {
          urlResolveCallback(null);
          urlResolveCallback = null;
        }
      }, 500);
    });

    const initialUrl = await urlWaitPromise;

    return {
      ok: true,
      command,
      status: "started",
      safeMessage: "Cursor CLI login started. Open the URL to authorize, then proceed.",
      captureSessionId,
      authUrl: initialUrl || session.authUrl,
    };
  } catch (error) {
    cleanupCapture(captureSessionId);
    const message = error instanceof Error ? error.message : "Login process failed";
    return buildDockerOnlyError("failed", redactCursorSecrets(message));
  }
}

/**
 * Read the Cursor auth store (`~/.config/cursor/auth.json`) safely.
 */
export async function readCursorAuthStore(
  options: ReadCursorAuthStoreOptions = {}
): Promise<ReadCursorAuthStoreResult> {
  const deps = options.deps ?? defaultDeps;
  let authPath: string;
  let allowedBase: string;

  try {
    const resolved = resolveAndValidateCursorAuthPath(
      deps,
      options.authPath,
      options.allowedBaseDir
    );
    authPath = resolved.path;
    allowedBase = resolved.allowedBaseDir;
  } catch {
    return {
      ok: false,
      status: "path-traversal",
      safeMessage: "Auth path is outside the allowed mount.",
      records: [],
    };
  }

  if (!deps.existsSync(authPath)) {
    return {
      ok: false,
      status: "missing-file",
      safeMessage: "Cursor auth.json file not found.",
      records: [],
    };
  }

  let text: string;
  try {
    text = await deps.readFile(authPath, "utf8");
  } catch {
    return {
      ok: false,
      status: "missing-file",
      safeMessage: "Failed to read Cursor auth.json.",
      records: [],
    };
  }

  if (Buffer.byteLength(text, "utf8") > MAX_AUTH_FILE_BYTES) {
    return {
      ok: false,
      status: "file-too-large",
      safeMessage: "Cursor auth.json exceeds maximum size.",
      records: [],
    };
  }

  const allRecords = await readInternalCursorAuthRecords(deps, authPath);
  if (!allRecords || allRecords.length === 0) {
    return {
      ok: false,
      status: "invalid-shape",
      safeMessage: "Invalid auth.json shape.",
      records: [],
    };
  }

  const safeRecords: SafeCursorAuthRecord[] = allRecords.map((record) => ({
    keyDigest: record.keyDigest,
    email: record.email,
    userId: record.userId,
    machineId: record.machineId,
    hasRefreshToken: !!record.refreshToken,
    source: "cursor-agent",
  }));

  return {
    ok: true,
    status: "ok",
    safeMessage: `Parsed ${safeRecords.length} Cursor auth record(s).`,
    records: safeRecords,
  };
}

/**
 * Confirm capture and securely persist the newly generated token from auth.json.
 */
export async function confirmAndCaptureCursorLogin(
  options: ConfirmCursorCaptureOptions
): Promise<ConfirmCursorCaptureResult> {
  const deps = options.deps ?? defaultDeps;
  const now = deps.now();
  cleanExpiredSessions(now);

  const session = captureSessionStore.get(options.captureSessionId);
  if (!session) {
    return {
      ok: false,
      status: "invalid-session",
      safeMessage: "Invalid capture session. Please start the login flow again.",
    };
  }

  if (now - session.createdAt > CAPTURE_SESSION_TTL_MS) {
    cleanupCapture(options.captureSessionId);
    return {
      ok: false,
      status: "expired-session",
      safeMessage: "Capture session has expired. Please start the login flow again.",
    };
  }

  if (session.used) {
    return {
      ok: false,
      status: "invalid-session",
      safeMessage: "Capture session has already been used.",
    };
  }

  const authPath = options.authPath ?? session.authPath;
  const allowedBase = options.allowedBaseDir ?? session.allowedBaseDir;

  try {
    ensureUnderAllowed(authPath, allowedBase);
  } catch {
    cleanupCapture(options.captureSessionId);
    return {
      ok: false,
      status: "path-traversal",
      safeMessage: "Auth path is outside the allowed mount.",
    };
  }

  if (!deps.existsSync(authPath)) {
    cleanupCapture(options.captureSessionId);
    return {
      ok: false,
      status: "missing-file",
      safeMessage: "Cursor auth.json was not found. Complete login in the browser first.",
    };
  }

  let fileText: string;
  try {
    fileText = await deps.readFile(authPath, "utf8");
  } catch {
    cleanupCapture(options.captureSessionId);
    return {
      ok: false,
      status: "missing-file",
      safeMessage: "Failed to read Cursor auth.json.",
    };
  }

  if (Buffer.byteLength(fileText, "utf8") > MAX_AUTH_FILE_BYTES) {
    cleanupCapture(options.captureSessionId);
    return {
      ok: false,
      status: "file-too-large",
      safeMessage: "Cursor auth.json exceeds maximum allowed size.",
    };
  }

  const allRecords = await readInternalCursorAuthRecords(deps, authPath);
  if (!allRecords || allRecords.length === 0) {
    cleanupCapture(options.captureSessionId);
    return {
      ok: false,
      status: "invalid-shape",
      safeMessage: "Cursor auth.json does not contain valid token fields.",
    };
  }

  // Identify newly added/modified records using server-held snapshot digests
  const newRecords = allRecords.filter((r) => !session.snapshotDigests.has(r.keyDigest));

  if (newRecords.length === 0) {
    cleanupCapture(options.captureSessionId);
    return {
      ok: false,
      status: "stale-record",
      safeMessage: "No new auth record was found after login. The auth store may not have changed.",
    };
  }

  if (newRecords.length > 1) {
    cleanupCapture(options.captureSessionId);
    return {
      ok: false,
      status: "ambiguous-records",
      safeMessage: `Found ${newRecords.length} new auth records. Expected exactly one new record after login. Resolve manually.`,
    };
  }

  const record = newRecords[0];

  const persistence = deps.persistence ?? {
    getProviderConnections,
    createProviderConnection,
    updateProviderConnection,
  };

  try {
    const existing = await persistence.getProviderConnections({ provider: "cursor" });
    const match = existing.find((c: any) => {
      if (c.authType !== "oauth") return false;
      if (record.email && c.email && c.email.toLowerCase() === record.email.toLowerCase()) return true;
      if (record.userId && c.providerSpecificData?.userId === record.userId) return true;
      return false;
    });

    const expiresAt = new Date(deps.now() + 86400 * 1000).toISOString();
    let connection: any;

    if (match?.id) {
      connection = await persistence.updateProviderConnection(match.id, {
        accessToken: record.accessToken,
        refreshToken: record.refreshToken || null,
        expiresAt,
        email: record.email || match.email || null,
        providerSpecificData: {
          ...match.providerSpecificData,
          machineId: record.machineId || match.providerSpecificData?.machineId || null,
          authMethod: "cursor-agent",
          source: "cursor-agent",
          userId: record.userId || match.providerSpecificData?.userId || null,
        },
        testStatus: "active",
        isActive: true,
      });
    } else {
      connection = await persistence.createProviderConnection({
        provider: "cursor",
        authType: "oauth",
        accessToken: record.accessToken,
        refreshToken: record.refreshToken || null,
        expiresAt,
        email: record.email || null,
        providerSpecificData: {
          machineId: record.machineId || null,
          authMethod: "cursor-agent",
          source: "cursor-agent",
          userId: record.userId || null,
        },
        testStatus: "active",
      });
    }

    session.used = true;
    cleanupCapture(options.captureSessionId);

    return {
      ok: true,
      status: "captured",
      safeMessage: "Cursor connection captured and saved successfully.",
      connectionId: connection?.id,
      identity: {
        email: record.email,
        userId: record.userId,
        machineId: record.machineId,
      },
    };
  } catch (err) {
    cleanupCapture(options.captureSessionId);
    const message = err instanceof Error ? err.message : "Failed to persist connection";
    return {
      ok: false,
      status: "failed",
      safeMessage: redactCursorSecrets(message),
    };
  }
}

/**
 * Cancel an active Cursor CLI capture session and kill any child process.
 */
export function cancelCursorCapture(
  sessionId: string,
  deps: CursorLocalCaptureDeps = defaultDeps
): { ok: boolean; status: "cancelled" | "not-found"; safeMessage: string } {
  cleanExpiredSessions(deps.now());
  const session = captureSessionStore.get(sessionId);
  if (!session) {
    return { ok: false, status: "not-found", safeMessage: "Capture session not found." };
  }
  terminateChild(session, "cancelled");
  return { ok: true, status: "cancelled", safeMessage: "Capture session cancelled." };
}

/**
 * Test helper to clear all sessions and active child processes.
 */
export function _test_getActiveCaptureSessionId(): string | null {
  return activeCaptureSessionId;
}

export function _test_clearAllSessions(): void {
  for (const [id, session] of captureSessionStore) {
    if (session.timeoutTimer) clearTimeout(session.timeoutTimer);
    if (session.forceKillTimer) clearTimeout(session.forceKillTimer);
  }
  captureSessionStore.clear();
  activeCaptureSessionId = null;
  if (activeChildProcess) {
    try {
      activeChildProcess.kill("SIGKILL");
    } catch {
      /* ignore */
    }
    activeChildProcess = null;
  }
}
