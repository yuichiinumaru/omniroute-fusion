/**
 * Task 0161: Docker-only Grok CLI local auth capture.
 *
 * Owns the bounded subprocess + auth-file parsing contract for the
 * "Add Grok CLI account" flow. Reuses Task 0151's safe persistence path
 * and redaction helpers; never exposes raw tokens, JWTs, or auth JSON.
 *
 * Security invariants enforced by this module:
 *  - Pre-login snapshot is held SERVER-SIDE behind an opaque session ID.
 *  - Raw access keys / refresh tokens / JWTs NEVER reach API responses
 *    or frontend state — only SafeAuthRecord (hashed key digest + identity).
 *  - Path traversal is blocked by ensureUnderAllowed() on every resolution.
 *  - Concurrent captures are serialized via a module-level lock.
 *  - Subprocess is cancellable via AbortSignal and killed on timeout/cancel.
 *  - Auth records are validated with bounded Zod-equivalent schema checks.
 */

import { execFile, spawn, type ChildProcess } from "child_process";
import { promisify } from "util";
import { createHash, randomBytes } from "crypto";
import path from "path";
import fs from "fs";
import os from "os";
import { z } from "zod";

import { isRunningInDocker } from "@/lib/zed-oauth/dockerDetect";
import { createProviderConnection, updateProviderConnection, getProviderConnections } from "@/models";
import { redactGrokBuildSecrets } from "./providers/grok-cli";
import { GROK_CLI_CONFIG } from "./constants/oauth";

const execFileAsync = promisify(execFile);

// ---------------------------------------------------------------------------
// Dependency injection interface
// ---------------------------------------------------------------------------

export interface GrokLocalCaptureDeps {
  isDocker: () => boolean;
  execFile: typeof execFileAsync;
  spawn: typeof spawn;
  existsSync: (p: string) => boolean;
  readFile: (p: string, encoding: BufferEncoding) => Promise<string>;
  homedir: () => string;
  now: () => number;
  randomBytes?: (size: number) => Buffer;
  createHash?: (algorithm: string) => ReturnType<typeof createHash>;
  persistence?: {
    getProviderConnections: typeof getProviderConnections;
    createProviderConnection: typeof createProviderConnection;
    updateProviderConnection: typeof updateProviderConnection;
  };
}

const defaultDeps: GrokLocalCaptureDeps = {
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

export interface AuthRecordIdentity {
  email: string | null;
  principalId: string | null;
  teamId: string | null;
  userId: string | null;
  organizationId: string | null;
  principalType: string | null;
  tier: number | null;
}

/**
 * Secret-free auth record exposed in all public results.
 * Contains a SHA-256 digest of the access key (for diff/comparison),
 * never the raw token. The raw token is only used internally for
 * encrypted persistence.
 */
export interface SafeAuthRecord {
  keyDigest: string;
  issuer: string | null;
  expiresAt: string | null;
  hasRefreshToken: boolean;
  identity: AuthRecordIdentity;
}

/**
 * Internal-only record with raw tokens. NEVER returned from any public
 * function. Used exclusively for encrypted persistence.
 */
interface InternalAuthRecord {
  accessToken: string;
  refreshToken: string | null;
  issuer: string | null;
  expiresAt: string | null;
  identity: AuthRecordIdentity;
  keyDigest: string;
}

// ---------------------------------------------------------------------------
// Options / Result types
// ---------------------------------------------------------------------------

export interface StartLoginOptions {
  deps?: GrokLocalCaptureDeps;
  timeoutMs?: number;
  grokBin?: string;
  extraLoginArgs?: string[];
  signal?: AbortSignal;
  authPath?: string;
  allowedBaseDir?: string;
}

export interface StartLoginResult {
  ok: boolean;
  command: string[];
  status: "started" | "not-docker" | "missing-mount" | "missing-binary" | "timeout" | "cancelled" | "failed" | "concurrent-session";
  safeMessage: string;
  captureSessionId?: string;
}

export interface ReadAuthStoreOptions {
  deps?: GrokLocalCaptureDeps;
  authPath?: string;
  allowedBaseDir?: string;
}

export interface ReadAuthStoreResult {
  ok: boolean;
  status: "ok" | "missing-file" | "missing-mount" | "invalid-shape" | "unsupported-environment" | "path-traversal" | "file-too-large";
  safeMessage: string;
  records: SafeAuthRecord[];
}

export interface ConfirmCaptureOptions {
  captureSessionId: string;
  deps?: GrokLocalCaptureDeps;
  authPath?: string;
  allowedBaseDir?: string;
}

export interface ConfirmCaptureResult {
  ok: boolean;
  status: "captured" | "missing-file" | "invalid-shape" | "stale-record" | "ambiguous-records" | "unsupported-environment" | "invalid-session" | "expired-session" | "path-traversal" | "file-too-large";
  safeMessage: string;
  connectionId?: string;
  identity?: AuthRecordIdentity;
}

// ---------------------------------------------------------------------------
// Constants and validation
// ---------------------------------------------------------------------------

const GROK_AUTH_PATH_ENV = "GROK_AUTH_PATH";
const MAX_AUTH_FILE_BYTES = 1_048_576; // 1 MiB — bounded file read
const MAX_RECORDS_PER_FILE = 50;       // no one has 50 accounts
const MAX_STRING_FIELD_LENGTH = 4096;  // bounded field length
const CAPTURE_SESSION_TTL_MS = 600_000; // 10 minutes
const REQUIRED_ISSUER_PREFIX = "https://auth.x.ai";

// Allowed mount base directories inside Docker
const ALLOWED_MOUNT_BASES = [
  "/root/.grok",
  "/home",
  "/host-home/.grok",
  "/host-local/.grok",
];

const boundedAuthRecordSchema = z.object({
  key: z.string().min(20).max(MAX_STRING_FIELD_LENGTH),
  refresh_token: z.string().min(1).max(MAX_STRING_FIELD_LENGTH).optional(),
  issuer: z.string().url().max(256),
  expires_at: z.string().datetime().max(128),
  email: z.string().email().max(320),
  user_id: z.string().min(1).max(MAX_STRING_FIELD_LENGTH).optional(),
  principal_id: z.string().min(1).max(MAX_STRING_FIELD_LENGTH).optional(),
  team_id: z.string().min(1).max(MAX_STRING_FIELD_LENGTH).optional(),
  organization_id: z.string().min(1).max(MAX_STRING_FIELD_LENGTH).optional(),
  principal_type: z.string().min(1).max(128).optional(),
  tier: z.number().int().min(0).max(100).optional(),
}).strict().superRefine((record, ctx) => {
  if (!record.user_id && !record.principal_id && !record.team_id && !record.organization_id) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "At least one stable identity field is required" });
  }
});

// ---------------------------------------------------------------------------
// Server-side capture session store
// ---------------------------------------------------------------------------

interface CaptureSession {
  id: string;
  snapshotDigests: Set<string>;
  createdAt: number;
  used: boolean;
  authPath: string;
  allowedBaseDir: string;
  terminalStatus?: Extract<StartLoginResult["status"], "timeout" | "cancelled" | "failed" | "missing-binary">;
  timeoutTimer?: ReturnType<typeof setTimeout>;
  forceKillTimer?: ReturnType<typeof setTimeout>;
  abortHandler?: () => void;
}

const captureSessionStore = new Map<string, CaptureSession>();

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

function generateSessionId(deps: GrokLocalCaptureDeps): string {
  return (deps.randomBytes ?? defaultDeps.randomBytes!)(32).toString("hex");
}

function hashKey(deps: GrokLocalCaptureDeps, key: string): string {
  return (deps.createHash ?? defaultDeps.createHash!)("sha256").update(key).digest("hex");
}

// ---------------------------------------------------------------------------
// Path safety
// ---------------------------------------------------------------------------

/**
 * Resolves the auth store path and ALWAYS validates it against allowed bases.
 * Throws if the resolved path escapes the allowed directory.
 */
function resolveAndValidateAuthPath(
  deps: GrokLocalCaptureDeps,
  explicit?: string,
  allowedBase?: string,
): { path: string; allowedBaseDir: string } {
  let raw: string;
  if (explicit && explicit.trim()) {
    raw = explicit.trim();
  } else {
    const envPath = process.env[GROK_AUTH_PATH_ENV];
    if (envPath && envPath.trim()) {
      raw = envPath.trim();
    } else {
      raw = path.join(deps.homedir(), ".grok", "auth.json");
    }
  }

  const resolved = path.resolve(raw);
  const allowedBases = allowedBase
    ? [allowedBase]
    : [path.join(deps.homedir(), ".grok"), ...ALLOWED_MOUNT_BASES];
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

function ensureUnderAllowed(target: string, allowedBaseDir: string): void {
  const resolvedTarget = path.resolve(target);
  const resolvedAllowed = path.resolve(allowedBaseDir);
  if (resolvedTarget !== resolvedAllowed && !resolvedTarget.startsWith(resolvedAllowed + path.sep)) {
    throw new Error("Auth path is outside the allowed mount");
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function safeText(input: unknown, maxLen = MAX_STRING_FIELD_LENGTH): string | undefined {
  if (typeof input !== "string") return undefined;
  const trimmed = input.trim();
  if (!trimmed || trimmed.length > maxLen) return undefined;
  return trimmed;
}

function isValidISODate(s: string): boolean {
  const d = new Date(s);
  return !isNaN(d.getTime()) && d.toISOString() !== "Invalid Date";
}

function isPlausibleToken(s: string): boolean {
  // Must look like a JWT (three dot-separated base64url segments) or a long opaque token
  if (s.length < 20 || s.length > MAX_STRING_FIELD_LENGTH) return false;
  return true;
}

export function buildDockerOnlyError(status: StartLoginResult["status"], safeMessage: string): StartLoginResult {
  return { ok: false, command: [], status, safeMessage };
}

// ---------------------------------------------------------------------------
// Core public functions
// ---------------------------------------------------------------------------

/**
 * Start a Grok CLI login subprocess. Takes a server-side snapshot of existing
 * auth records (by key digest only) and returns an opaque captureSessionId.
 * Raw tokens NEVER leave this function.
 */
export async function startLocalGrokLogin(options: StartLoginOptions = {}): Promise<StartLoginResult> {
  const deps = options.deps ?? defaultDeps;
  const timeoutMs = options.timeoutMs ?? 120_000;
  const grokBin = options.grokBin ?? "grok";
  const extraLoginArgs = options.extraLoginArgs ?? [];
  const signal = options.signal;
  const now = deps.now();

  if (!deps.isDocker()) {
    return buildDockerOnlyError("not-docker", "Local Grok CLI capture is only supported inside Docker.");
  }

  // Check for concurrent capture
  cleanExpiredSessions(now);
  if (activeCaptureSessionId && captureSessionStore.has(activeCaptureSessionId)) {
    return buildDockerOnlyError("concurrent-session", "Another capture session is already active. Cancel or complete it first.");
  }

  const mountCandidates = [
    path.join(deps.homedir(), ".grok"),
    "/host-home/.grok",
    "/host-local/.grok",
  ];
  const hasMount = mountCandidates.some((candidate) => deps.existsSync(candidate));
  if (!hasMount) {
    return buildDockerOnlyError("missing-mount", "No Grok auth mount was detected inside the container.");
  }

  // Validate auth path under allowed mount
  let authPath: string;
  let allowedBase: string;
  try {
    const resolvedPath = resolveAndValidateAuthPath(deps, options.authPath, options.allowedBaseDir);
    authPath = resolvedPath.path;
    allowedBase = resolvedPath.allowedBaseDir;
  } catch {
    return buildDockerOnlyError("failed", "Auth path is outside the allowed mount.");
  }

  // Take server-side snapshot of existing key digests
  const snapshotDigests = new Set<string>();
  if (deps.existsSync(authPath)) {
    try {
      const text = await deps.readFile(authPath, "utf8");
      if (Buffer.byteLength(text, "utf8") <= MAX_AUTH_FILE_BYTES) {
        const root = JSON.parse(text);
        if (root && typeof root === "object" && !Array.isArray(root)) {
          for (const value of Object.values(root)) {
            const rec = value && typeof value === "object" && !Array.isArray(value)
              ? (value as Record<string, unknown>)
              : null;
            if (rec) {
              const key = safeText(rec.key);
              if (key) {
                snapshotDigests.add(hashKey(deps, key));
              }
            }
          }
        }
      }
    } catch {
      // ignore parse errors for snapshot
    }
  }

  // Generate server-side capture session
  const captureSessionId = generateSessionId(deps);
  captureSessionStore.set(captureSessionId, {
    id: captureSessionId,
    snapshotDigests,
    createdAt: now,
    used: false,
    authPath,
    allowedBaseDir: allowedBase,
  });
  activeCaptureSessionId = captureSessionId;

  const loginArgs = ["login", ...extraLoginArgs];
  const command = [grokBin, ...loginArgs];

  try {
    // Check if already aborted.
    if (signal?.aborted) {
      cleanupCapture(captureSessionId);
      return buildDockerOnlyError("cancelled", "Capture was cancelled before starting.");
    }

    const child = deps.spawn(grokBin, loginArgs, {
      stdio: ["ignore", "pipe", "pipe"],
      timeout: timeoutMs,
    });
    activeChildProcess = child;
    const session = captureSessionStore.get(captureSessionId);
    if (!session) {
      try { child.kill("SIGTERM"); } catch { /* already dead */ }
      return buildDockerOnlyError("failed", "Capture session could not be created.");
    }

    let stderr = "";
    const maxOutput = 8192;
    child.stderr?.on("data", (chunk: Buffer) => {
      if (stderr.length < maxOutput) stderr += chunk.toString().slice(0, maxOutput - stderr.length);
    });

    let settled = false;
    const finish = (result: { ok: boolean; status: StartLoginResult["status"]; safeMessage: string }, retainSession = false) => {
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
        // The CLI is done, but confirmation still needs the server-owned
        // snapshot. Release the process lock while retaining the session TTL.
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
      const status: StartLoginResult["status"] = err.code === "ENOENT" ? "missing-binary" :
        (err.code === "ETIMEDOUT" || err.message?.includes("ETIMEDOUT") ? "timeout" : "failed");
      const safeMessage = status === "missing-binary"
        ? "Grok CLI binary was not found. Ensure 'grok' is installed in the container."
        : redactGrokBuildSecrets(err.message);
      finish({ ok: false, status, safeMessage });
    });

    child.once("close", (code: number | null) => {
      // A timeout/cancel is terminal even when Node reports a null exit code.
      if (session.terminalStatus) {
        finish({ ok: false, status: session.terminalStatus, safeMessage: session.terminalStatus === "timeout"
          ? "Grok CLI login timed out."
          : "Capture was cancelled by the user." });
        return;
      }
      if (code !== 0) {
        const message = stderr.trim() || `grok login exited with code ${code ?? "unknown"}`;
        finish({ ok: false, status: "failed", safeMessage: redactGrokBuildSecrets(message) });
        return;
      }
      // Keep the server-owned session available: the user may confirm after
      // the CLI exits and the auth store has been written.
      finish({ ok: true, status: "started", safeMessage: "Login process completed." }, true);
    });

    // Do not await child exit. The browser needs the opaque ID while `grok login`
    // remains open for device/browser approval.
    return {
      ok: true,
      command,
      status: "started",
      safeMessage: "Login process started. Complete approval, then confirm capture.",
      captureSessionId,
    };
  } catch (error) {
    cleanupCapture(captureSessionId);
    const message = error instanceof Error ? error.message : "Login process failed";
    const safe = redactGrokBuildSecrets(message);
    return buildDockerOnlyError("failed", safe);
  }
}

/**
 * Read and parse the Grok auth store. Returns ONLY SafeAuthRecords (no raw tokens).
 * Enforces path validation, file size bounds, record count limits, and schema validation.
 */
export async function readGrokAuthStore(options: ReadAuthStoreOptions = {}): Promise<ReadAuthStoreResult> {
  const deps = options.deps ?? defaultDeps;
  if (!deps.isDocker()) {
    return {
      ok: false,
      status: "unsupported-environment",
      safeMessage: "Local Grok CLI capture is only supported inside Docker.",
      records: [],
    };
  }

  let authPath: string;
  try {
    authPath = resolveAndValidateAuthPath(deps, options.authPath, options.allowedBaseDir).path;
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
      safeMessage: "Grok auth file was not found at the configured path.",
      records: [],
    };
  }

  let text: string;
  try {
    text = await deps.readFile(authPath, "utf8");
  } catch {
    return {
      ok: false,
      status: "invalid-shape",
      safeMessage: "Grok auth file could not be read.",
      records: [],
    };
  }

  // Enforce file size limit
  if (Buffer.byteLength(text, "utf8") > MAX_AUTH_FILE_BYTES) {
    return {
      ok: false,
      status: "file-too-large",
      safeMessage: "Grok auth file exceeds the maximum allowed size.",
      records: [],
    };
  }

  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return {
      ok: false,
      status: "invalid-shape",
      safeMessage: "Grok auth file could not be parsed.",
      records: [],
    };
  }

  const root = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : null;
  if (!root) {
    return {
      ok: false,
      status: "invalid-shape",
      safeMessage: "Grok auth file has an unsupported top-level shape.",
      records: [],
    };
  }

  const entries = Object.entries(root);
  if (entries.length > MAX_RECORDS_PER_FILE) {
    return {
      ok: false,
      status: "invalid-shape",
      safeMessage: "Grok auth file contains too many records.",
      records: [],
    };
  }

  const records: SafeAuthRecord[] = [];

  for (const [rawKey, value] of entries) {
    const record = value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
    if (!record) continue;

    const validated = boundedAuthRecordSchema.safeParse(record);
    if (!validated.success) continue;
    const accessToken = safeText(validated.data.key);
    if (!accessToken || !isPlausibleToken(accessToken)) continue;

    const issuerRaw = safeText(validated.data.issuer);
    const issuer = issuerRaw ?? (rawKey.includes("auth.x.ai") ? REQUIRED_ISSUER_PREFIX : null);

    // Require known issuer prefix
    if (issuer && !issuer.startsWith(REQUIRED_ISSUER_PREFIX)) continue;

    const expiresAt = safeText(record.expires_at) ?? null;
    if (expiresAt && !isValidISODate(expiresAt)) continue;

    const email = safeText(record.email) ?? null;
    const userId = safeText(record.user_id) ?? null;

    // Require explicit email — do NOT fall back from user_id to email (F5 fix)
    const identity: AuthRecordIdentity = {
      email,
      principalId: safeText(record.principal_id) ?? null,
      teamId: safeText(record.team_id) ?? null,
      userId,
      organizationId: safeText(record.organization_id) ?? null,
      principalType: safeText(record.principal_type) ?? null,
      tier: typeof record.tier === "number" && Number.isFinite(record.tier) ? record.tier : null,
    };

    const hasRefreshToken = !!safeText(record.refresh_token);

    records.push({
      keyDigest: hashKey(deps, accessToken),
      issuer,
      expiresAt,
      hasRefreshToken,
      identity,
    });
  }

  return {
    ok: true,
    status: "ok",
    safeMessage: `Parsed ${records.length} Grok auth record(s).`,
    records,
  };
}

/**
 * Internal-only: parse auth records WITH raw tokens for persistence.
 * Never called from routes or returned to clients.
 */
async function readInternalAuthRecords(deps: GrokLocalCaptureDeps, authPath: string): Promise<InternalAuthRecord[] | null> {
  if (!deps.existsSync(authPath)) return null;

  let text: string;
  try {
    text = await deps.readFile(authPath, "utf8");
  } catch {
    return null;
  }

  if (Buffer.byteLength(text, "utf8") > MAX_AUTH_FILE_BYTES) return null;

  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return null;
  }

  const root = raw && typeof raw === "object" && !Array.isArray(raw)
    ? (raw as Record<string, unknown>)
    : null;
  if (!root) return null;

  const entries = Object.entries(root);
  if (entries.length > MAX_RECORDS_PER_FILE) return null;

  const records: InternalAuthRecord[] = [];

  for (const [rawKey, value] of entries) {
    const record = value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>) : null;
    if (!record) continue;

    const validated = boundedAuthRecordSchema.safeParse(record);
    if (!validated.success) continue;
    const accessToken = safeText(validated.data.key);
    if (!accessToken || !isPlausibleToken(accessToken)) continue;

    const issuerRaw = safeText(validated.data.issuer);
    const issuer = issuerRaw ?? (rawKey.includes("auth.x.ai") ? REQUIRED_ISSUER_PREFIX : null);
    if (issuer && !issuer.startsWith(REQUIRED_ISSUER_PREFIX)) continue;

    const expiresAt = safeText(record.expires_at) ?? null;
    if (expiresAt && !isValidISODate(expiresAt)) continue;

    const refreshToken = safeText(record.refresh_token) ?? null;

    const identity: AuthRecordIdentity = {
      email: safeText(record.email) ?? null,
      principalId: safeText(record.principal_id) ?? null,
      teamId: safeText(record.team_id) ?? null,
      userId: safeText(record.user_id) ?? null,
      organizationId: safeText(record.organization_id) ?? null,
      principalType: safeText(record.principal_type) ?? null,
      tier: typeof record.tier === "number" && Number.isFinite(record.tier) ? record.tier : null,
    };

    records.push({
      accessToken,
      refreshToken,
      issuer,
      expiresAt,
      identity,
      keyDigest: hashKey(deps, accessToken),
    });
  }

  return records;
}

/**
 * Confirm and capture a Grok CLI login. Requires a valid server-issued
 * captureSessionId (single-use, expiring). Uses the server-held snapshot
 * to identify newly added records. Rejects ambiguous multi-record results.
 */
export async function confirmAndCaptureGrokLogin(options: ConfirmCaptureOptions): Promise<ConfirmCaptureResult> {
  const deps = options.deps ?? defaultDeps;
  const now = deps.now();

  if (!deps.isDocker()) {
    return {
      ok: false,
      status: "unsupported-environment",
      safeMessage: "Local Grok CLI capture is only supported inside Docker.",
    };
  }

  // Validate server-side capture session
  cleanExpiredSessions(now);
  const session = captureSessionStore.get(options.captureSessionId);
  if (!session) {
    return {
      ok: false,
      status: "invalid-session",
      safeMessage: "Capture session not found or already used. Start a new capture.",
    };
  }

  if (session.used) {
    return {
      ok: false,
      status: "invalid-session",
      safeMessage: "This capture session has already been used. Start a new capture.",
    };
  }

  if (now - session.createdAt > CAPTURE_SESSION_TTL_MS) {
    captureSessionStore.delete(session.id);
    cleanupCapture(session.id);
    return {
      ok: false,
      status: "expired-session",
      safeMessage: "Capture session has expired. Start a new login.",
    };
  }

  // Mark session as used (single-use)
  session.used = true;

  // Use session's stored auth path (server-controlled, validated at start time)
  const authPath = session.authPath;
  const allowedBase = session.allowedBaseDir;

  // Re-validate path (defense in depth)
  try {
    ensureUnderAllowed(authPath, allowedBase);
  } catch {
    cleanupCapture(session.id);
    return {
      ok: false,
      status: "path-traversal",
      safeMessage: "Auth path is outside the allowed mount.",
    };
  }

  if (!deps.existsSync(authPath)) {
    cleanupCapture(session.id);
    return {
      ok: false,
      status: "missing-file",
      safeMessage: "Grok auth file was not found after login confirmation.",
    };
  }

  const allRecords = await readInternalAuthRecords(deps, authPath);
  if (!allRecords) {
    cleanupCapture(session.id);
    return { ok: false, status: "invalid-shape", safeMessage: "Grok auth file could not be parsed." };
  }

  // Filter unexpired records
  const unexpired = allRecords.filter((r) => !r.expiresAt || Date.parse(r.expiresAt) > now);

  // Identify newly added records using server-held snapshot digests
  const newRecords = unexpired.filter((r) => !session.snapshotDigests.has(r.keyDigest));

  if (newRecords.length === 0) {
    cleanupCapture(session.id);
    return {
      ok: false,
      status: "stale-record",
      safeMessage: "No new auth record was found after login. The auth store may not have changed.",
    };
  }

  // Reject ambiguous: more than one genuinely new record
  if (newRecords.length > 1) {
    cleanupCapture(session.id);
    return {
      ok: false,
      status: "ambiguous-records",
      safeMessage: `Found ${newRecords.length} new auth records. Expected exactly one new record after login. Resolve manually.`,
    };
  }

  const selected = newRecords[0];
  const identity = selected.identity;

  // Match existing connections using full identity (email + principalId + teamId)
  const persistence = deps.persistence ?? {
    getProviderConnections,
    createProviderConnection,
    updateProviderConnection,
  };
  const existing = await persistence.getProviderConnections({ provider: "grok-cli" });
  const match = existing.find((c: Record<string, unknown>) => {
    const existingEmail = typeof c.email === "string" ? c.email : "";
    const recordEmail = identity.email ?? "";
    if (!recordEmail || !existingEmail) return false;
    if (existingEmail.toLowerCase() !== recordEmail.toLowerCase()) return false;
    const matchIdentity = (existingValue: unknown, selectedValue: string | null): boolean => {
      if (!selectedValue || typeof existingValue !== "string") return true;
      return existingValue === selectedValue;
    };
    const existingSpecific = (c.providerSpecificData as Record<string, unknown>) ?? {};
    if (!matchIdentity(existingSpecific.userId, identity.userId)) return false;
    if (!matchIdentity(existingSpecific.principalId, identity.principalId)) return false;
    if (!matchIdentity(existingSpecific.teamId, identity.teamId)) return false;
    if (!matchIdentity(existingSpecific.organizationId, identity.organizationId)) return false;
    return true;
  });

  const payload: Record<string, unknown> = {
    provider: "grok-cli",
    authType: "oauth",
    accessToken: selected.accessToken,
    refreshToken: selected.refreshToken ?? undefined,
    expiresAt: selected.expiresAt ?? undefined,
    tokenExpiresAt: selected.expiresAt ?? undefined,
    email: identity.email ?? undefined,
    name: identity.email || "Grok CLI (captured)",
    testStatus: "active",
    providerSpecificData: {
      ...(identity.userId ? { userId: identity.userId } : {}),
      ...(identity.principalId ? { principalId: identity.principalId } : {}),
      ...(identity.teamId ? { teamId: identity.teamId } : {}),
      ...(identity.organizationId ? { organizationId: identity.organizationId } : {}),
      ...(identity.principalType ? { principalType: identity.principalType } : {}),
      ...(identity.tier !== null ? { tier: identity.tier } : {}),
      issuer: selected.issuer ?? undefined,
      capturedAt: new Date(now).toISOString(),
      captureSource: "grok-cli-login",
    },
  };

  let connection: { id: string } | undefined;
  if (match?.id) {
    const updated = await persistence.updateProviderConnection(match.id as string, payload);
    connection = updated ?? { id: match.id as string };
  } else {
    connection = await persistence.createProviderConnection(payload);
  }

  cleanupCapture(session.id);

  return {
    ok: true,
    status: "captured",
    safeMessage: "Grok CLI login captured successfully.",
    connectionId: connection?.id,
    identity,
  };
}

/**
 * Cancel an active capture session.
 */
export function cancelCapture(sessionId: string): { ok: boolean; safeMessage: string } {
  const session = captureSessionStore.get(sessionId);
  if (!session) {
    return { ok: false, safeMessage: "Session not found." };
  }

  // Capture the owned child before cleanup clears the module-level reference.
  session.terminalStatus = "cancelled";
  const child = activeCaptureSessionId === sessionId ? activeChildProcess : null;
  if (child) {
    try {
      child.kill("SIGTERM");
    } catch { /* already dead */ }
  }
  cleanupCapture(sessionId);
  return { ok: true, safeMessage: "Capture session cancelled." };
}

function cleanupCapture(sessionId: string): void {
  const session = captureSessionStore.get(sessionId);
  if (session?.timeoutTimer) clearTimeout(session.timeoutTimer);
  if (session?.forceKillTimer) clearTimeout(session.forceKillTimer);
  if (session?.abortHandler) {
    // The request signal may outlive the returned start response.
    session.abortHandler = undefined;
  }
  captureSessionStore.delete(sessionId);
  if (activeCaptureSessionId === sessionId) {
    activeCaptureSessionId = null;
    activeChildProcess = null;
  }
}

function terminateChild(session: CaptureSession, status: "timeout" | "cancelled"): void {
  session.terminalStatus = status;
  if (!activeChildProcess || activeCaptureSessionId !== session.id) return;
  try {
    activeChildProcess.kill("SIGTERM");
  } catch {
    // The child may already have exited.
  }
  const forceKill = () => {
    try {
      activeChildProcess?.kill("SIGKILL");
    } catch {
      // The child may already have exited.
    }
    cleanupCapture(session.id);
  };
  session.forceKillTimer = setTimeout(forceKill, 3_000);
}

/**
 * Redact a SafeAuthRecord (already safe, but for symmetry / test assertions).
 * @deprecated SafeAuthRecord never contains raw tokens. Use directly.
 */
export function redactAuthRecord(record: SafeAuthRecord): SafeAuthRecord {
  return { ...record };
}

// ---------------------------------------------------------------------------
// Test helpers — exported for test instrumentation only
// ---------------------------------------------------------------------------

/** @internal */
export function _test_clearAllSessions(): void {
  for (const session of captureSessionStore.values()) {
    if (session.timeoutTimer) clearTimeout(session.timeoutTimer);
    if (session.forceKillTimer) clearTimeout(session.forceKillTimer);
    if (session.abortHandler) session.abortHandler = undefined;
  }
  if (activeChildProcess) {
    try { activeChildProcess.kill("SIGTERM"); } catch { /* already dead */ }
  }
  captureSessionStore.clear();
  activeCaptureSessionId = null;
  activeChildProcess = null;
}

/** @internal */
export function _test_getSession(id: string): CaptureSession | undefined {
  return captureSessionStore.get(id);
}

/** @internal */
export function _test_getActiveCaptureSessionId(): string | null {
  return activeCaptureSessionId;
}

/** @internal */
export { hashKey as _test_hashKey };
/** @internal */
export { ensureUnderAllowed as _test_ensureUnderAllowed };
/** @internal */
export { MAX_AUTH_FILE_BYTES as _test_MAX_AUTH_FILE_BYTES };
/** @internal */
export { CAPTURE_SESSION_TTL_MS as _test_CAPTURE_SESSION_TTL_MS };
