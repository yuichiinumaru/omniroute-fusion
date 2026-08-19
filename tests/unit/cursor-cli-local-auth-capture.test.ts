/**
 * Task 0172: Unit and integration tests for Cursor "Experimental Auto" CLI login capture.
 *
 * Tests:
 * 1. Docker capability gate and missing-mount checks
 * 2. URL extraction from stdout (loginDeepControl and generic login URLs)
 * 3. Auth file parsing, token extraction, and secret redaction
 * 4. Path traversal protection on auth file resolution
 * 5. Concurrent session serialization and AbortSignal cancellation
 * 6. Confirmation and encrypted persistence of safe connection records
 * 7. Route guard verification (LOCAL_ONLY and SPAWN_CAPABLE classification)
 * 8. Route boundary checks (no secret leakage in responses)
 */

import assert from "node:assert/strict";
import path from "node:path";
import os from "node:os";
import fs from "node:fs/promises";
import { EventEmitter } from "node:events";
import { type ChildProcess } from "node:child_process";
import { describe, test, beforeEach, afterEach } from "node:test";

import {
  startLocalCursorLogin,
  confirmAndCaptureCursorLogin,
  cancelCursorCapture,
  readCursorAuthStore,
  extractCursorAuthUrl,
  extractCursorAuthRecord,
  redactCursorAuthRecord,
  redactCursorSecrets,
  resolveAndValidateCursorAuthPath,
  extractJwtClaims,
  _test_clearAllSessions,
  type CursorLocalCaptureDeps,
} from "@/lib/oauth/cursorCliLocalCapture";

const DEFAULT_HOME = os.homedir();

function buildJwt(email: string, userId: string): string {
  const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({ email, sub: userId, exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url");
  return `${header}.${payload}.signature1234567890abcdef`;
}

function buildFixtureCursorAuthJson(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  const token = buildJwt("user@cursor.com", "user_12345");
  return {
    accessToken: token,
    refreshToken: "cursor_refresh_token_abc",
    email: "user@cursor.com",
    userId: "user_12345",
    machineId: "mach-uuid-1234-5678-90ab",
    ...overrides,
  };
}

function baseDeps(overrides: {
  isDocker?: boolean;
  existsPaths?: string[];
  fileMap?: Record<string, string>;
  now?: number;
  stdoutOutput?: string;
  stderrOutput?: string;
} = {}): CursorLocalCaptureDeps {
  const existsPaths = new Set(
    overrides.existsPaths ?? [
      path.join(DEFAULT_HOME, ".config", "cursor"),
      path.join(DEFAULT_HOME, ".config"),
      "/root/.config/cursor",
      "/host-home/.config/cursor",
      path.join(DEFAULT_HOME, ".local", "bin", "cursor-agent"),
    ]
  );
  const fileMap = overrides.fileMap ?? {};
  const now = overrides.now ?? Date.now();

  return {
    isDocker: () => overrides.isDocker ?? false,
    execFile: async (_command: string, args: string[]) => {
      if (args[0] === "logout") return { stdout: "", stderr: "" };
      throw new Error(`unsupported command in test execFile: ${args[0]}`);
    },
    spawn: () => {
      const child = Object.assign(new EventEmitter(), {
        stdout: new EventEmitter(),
        stderr: new EventEmitter(),
        kill: () => true,
      }) as unknown as ChildProcess;

      // Simulate output emission
      queueMicrotask(() => {
        if (overrides.stdoutOutput) {
          child.stdout?.emit("data", Buffer.from(overrides.stdoutOutput));
        }
        if (overrides.stderrOutput) {
          child.stderr?.emit("data", Buffer.from(overrides.stderrOutput));
        }
        child.emit("close", 0);
      });
      return child;
    },
    existsSync: (p: string) => existsPaths.has(p),
    readFile: async (p: string) => fileMap[p] ?? "{}",
    homedir: () => DEFAULT_HOME,
    now: () => now,
    resolveCursorAgentBinary: () => path.join(DEFAULT_HOME, ".local", "bin", "cursor-agent"),
  };
}

describe("cursorCliLocalCapture - Gating & Environment", () => {
  beforeEach(() => {
    _test_clearAllSessions();
  });

  afterEach(() => {
    _test_clearAllSessions();
  });

  test("startLocalCursorLogin refuses non-Docker environments", async () => {
    const deps = baseDeps({ isDocker: false });
    const result = await startLocalCursorLogin({ deps, timeoutMs: 1000 });
    assert.equal(result.ok, false);
    assert.equal(result.status, "not-docker");
    assert.match(result.safeMessage, /only supported inside Docker/i);
  });

  test("startLocalCursorLogin fails when no Cursor mount is detected", async () => {
    const deps = baseDeps({ isDocker: true, existsPaths: [] });
    const result = await startLocalCursorLogin({ deps, timeoutMs: 1000 });
    assert.equal(result.ok, false);
    assert.equal(result.status, "missing-mount");
    assert.match(result.safeMessage, /No Cursor auth mount/i);
  });

  test("startLocalCursorLogin detects missing cursor-agent binary", async () => {
    const deps = baseDeps({
      isDocker: true,
      existsPaths: [path.join(DEFAULT_HOME, ".config", "cursor")],
    });
    deps.resolveCursorAgentBinary = () => null;

    const result = await startLocalCursorLogin({ deps, timeoutMs: 1000 });
    assert.equal(result.ok, false);
    assert.equal(result.status, "missing-binary");
  });
});

describe("cursorCliLocalCapture - URL Extraction & Redaction", () => {
  test("extractCursorAuthUrl parses deep control authentication URLs from stdout", () => {
    const output = "Opening authentication URL in browser: https://cursor.com/loginDeepControl?token=abc123xyz-456\nPlease log in.";
    const url = extractCursorAuthUrl(output);
    assert.equal(url, "https://cursor.com/loginDeepControl?token=abc123xyz-456");
  });

  test("extractCursorAuthUrl parses login URLs from subdomains and complex queries", () => {
    const output = "Please visit: https://auth.cursor.com/loginDeepControl?challenge=test_chall&redirect=done to continue";
    const url = extractCursorAuthUrl(output);
    assert.equal(url, "https://auth.cursor.com/loginDeepControl?challenge=test_chall&redirect=done");
  });

  test("extractCursorAuthUrl falls back to generic cursor login URLs", () => {
    const output = "Navigate to https://cursor.com/login?code=987654";
    const url = extractCursorAuthUrl(output);
    assert.equal(url, "https://cursor.com/login?code=987654");
  });

  test("extractCursorAuthUrl returns null when no matching URL is present", () => {
    assert.equal(extractCursorAuthUrl("Logged out successfully. Waiting for user input..."), null);
    assert.equal(extractCursorAuthUrl(""), null);
  });

  test("redactCursorSecrets redacts JWTs and tokens in error messages", () => {
    const token = buildJwt("secret@example.com", "usr_999");
    const raw = `Error occurred with token: ${token} and Bearer eyJhbGciOiJSUzI1NiJ9.test and accessToken="secret-123"`;
    const redacted = redactCursorSecrets(raw);
    assert.equal(redacted.includes(token), false);
    assert.match(redacted, /\[REDACTED/);
  });

  test("extractJwtClaims decodes claims safely from valid JWTs", () => {
    const token = buildJwt("dev@cursor.com", "user_dev_001");
    const claims = extractJwtClaims(token);
    assert.equal(claims.email, "dev@cursor.com");
    assert.equal(claims.userId, "user_dev_001");
  });

  test("extractJwtClaims handles invalid tokens gracefully", () => {
    assert.deepEqual(extractJwtClaims("not-a-jwt"), { email: null, userId: null });
    assert.deepEqual(extractJwtClaims("a.b.c"), { email: null, userId: null });
  });
});

describe("cursorCliLocalCapture - Auth File Reading & Validation", () => {
  beforeEach(() => {
    _test_clearAllSessions();
  });

  test("readCursorAuthStore returns missing-file when auth.json is absent", async () => {
    const authFilePath = path.join(DEFAULT_HOME, ".config", "cursor", "auth.json");
    const deps = baseDeps({
      isDocker: true,
      existsPaths: [path.join(DEFAULT_HOME, ".config", "cursor")],
      fileMap: {},
    });
    const result = await readCursorAuthStore({ deps, authPath: authFilePath });
    assert.equal(result.ok, false);
    assert.equal(result.status, "missing-file");
    assert.equal(result.records.length, 0);
  });

  test("readCursorAuthStore parses valid auth.json records without exposing secrets", async () => {
    const authFilePath = path.join(DEFAULT_HOME, ".config", "cursor", "auth.json");
    const fixture = buildFixtureCursorAuthJson();
    const deps = baseDeps({
      isDocker: true,
      existsPaths: [path.join(DEFAULT_HOME, ".config", "cursor"), authFilePath],
      fileMap: { [authFilePath]: JSON.stringify(fixture) },
    });

    const result = await readCursorAuthStore({ deps, authPath: authFilePath });
    assert.equal(result.ok, true);
    assert.equal(result.status, "ok");
    assert.equal(result.records.length, 1);

    const record = result.records[0];
    assert.equal(record.email, "user@cursor.com");
    assert.equal(record.userId, "user_12345");
    assert.equal(record.machineId, "mach-uuid-1234-5678-90ab");
    assert.equal(record.hasRefreshToken, true);
    assert.match(record.keyDigest, /^[a-f0-9]{64}$/);
    assert.equal("accessToken" in record, false);
    assert.equal("refreshToken" in record, false);

    assert.deepEqual(redactCursorAuthRecord(record), record);
  });

  test("readCursorAuthStore rejects path traversal attempts", async () => {
    const deps = baseDeps({ isDocker: true });
    const result = await readCursorAuthStore({
      deps,
      authPath: "/etc/shadow",
      allowedBaseDir: path.join(DEFAULT_HOME, ".config", "cursor"),
    });
    assert.equal(result.ok, false);
    assert.equal(result.status, "path-traversal");
  });

  test("resolveAndValidateCursorAuthPath rejects paths outside allowed directory", () => {
    const deps = baseDeps({ isDocker: true });
    assert.throws(() => {
      resolveAndValidateCursorAuthPath(deps, "/tmp/evil/auth.json", path.join(DEFAULT_HOME, ".config", "cursor"));
    }, /outside the allowed mount/i);
  });

  test("extractCursorAuthRecord supports token and nested auth structures", () => {
    const token = buildJwt("nested@example.com", "usr_nested");
    const record1 = extractCursorAuthRecord({ token });
    assert.ok(record1);
    assert.equal(record1.accessToken, token);
    assert.equal(record1.email, "nested@example.com");

    const record2 = extractCursorAuthRecord({ auth: { accessToken: token } });
    assert.ok(record2);
    assert.equal(record2.accessToken, token);

    const recordInvalid = extractCursorAuthRecord({ token: "short" });
    assert.equal(recordInvalid, null);
  });
});

describe("cursorCliLocalCapture - Subprocess Lifecycle & Persistence", () => {
  beforeEach(() => {
    _test_clearAllSessions();
  });

  afterEach(() => {
    _test_clearAllSessions();
  });

  test("startLocalCursorLogin captures stdout URL and generates opaque session", async () => {
    const authUrl = "https://cursor.com/loginDeepControl?token=session_token_123";
    const deps = baseDeps({
      isDocker: true,
      stdoutOutput: `Initiating login...\nOpening URL: ${authUrl}\nWaiting for browser auth...`,
    });

    const result = await startLocalCursorLogin({ deps, timeoutMs: 5000 });
    assert.equal(result.ok, true);
    assert.equal(result.status, "started");
    assert.match(result.captureSessionId ?? "", /^[a-f0-9]{64}$/);
    assert.equal(result.authUrl, authUrl);
    assert.deepEqual(result.command, [path.join(DEFAULT_HOME, ".local", "bin", "cursor-agent"), "login"]);
  });

  test("startLocalCursorLogin blocks concurrent sessions while one is active", async () => {
    const deps: CursorLocalCaptureDeps = {
      ...baseDeps({ isDocker: true }),
      spawn: (() => {
        const child = Object.assign(new EventEmitter(), {
          stdout: new EventEmitter(),
          stderr: new EventEmitter(),
          kill: () => {
            child.emit("close", 0);
            return true;
          },
        }) as unknown as ChildProcess;
        return child;
      }) as typeof import("child_process").spawn,
    };

    const firstPromise = startLocalCursorLogin({ deps, timeoutMs: 10000 });
    await new Promise((resolve) => setImmediate(resolve));
    const second = await startLocalCursorLogin({ deps, timeoutMs: 10000 });
    assert.equal(second.ok, false);
    assert.equal(second.status, "concurrent-session");

    const { _test_getActiveCaptureSessionId } = await import("@/lib/oauth/cursorCliLocalCapture");
    const activeId = _test_getActiveCaptureSessionId();
    if (activeId) cancelCursorCapture(activeId, deps);
    const first = await firstPromise;
    assert.equal(["cancelled", "started"].includes(first.status), true);
    _test_clearAllSessions();
  });

  test("cancelCursorCapture terminates active session and frees lock", async () => {
    const deps = baseDeps({
      isDocker: true,
      stdoutOutput: "https://cursor.com/loginDeepControl?token=session_cancel",
    });

    const started = await startLocalCursorLogin({ deps, timeoutMs: 10000 });
    assert.equal(started.ok, true);

    const cancelled = cancelCursorCapture(started.captureSessionId!, deps);
    assert.equal(cancelled.ok, true);
    assert.equal(cancelled.status, "cancelled");

    // Can start a new session now
    const restarted = await startLocalCursorLogin({ deps, timeoutMs: 10000 });
    assert.equal(restarted.ok, true);
  });

  test("confirmAndCaptureCursorLogin verifies newly generated token and persists connection", async () => {
    const authFilePath = path.join(DEFAULT_HOME, ".config", "cursor", "auth.json");
    const mutableFileMap: Record<string, string> = {
      [authFilePath]: JSON.stringify({}),
    };

    let persistedPayload: Record<string, unknown> | null = null;
    const deps = {
      ...baseDeps({
        isDocker: true,
        existsPaths: [
          path.join(DEFAULT_HOME, ".config", "cursor"),
          authFilePath,
          path.join(DEFAULT_HOME, ".local", "bin", "cursor-agent"),
        ],
        fileMap: mutableFileMap,
        stdoutOutput: "https://cursor.com/loginDeepControl?token=session_test",
      }),
      persistence: {
        getProviderConnections: async () => [],
        createProviderConnection: async (payload: Record<string, unknown>) => {
          persistedPayload = payload;
          return { id: "cursor-conn-123" };
        },
        updateProviderConnection: async () => ({ id: "cursor-conn-updated" }),
      },
    };

    const started = await startLocalCursorLogin({ deps });
    assert.equal(started.ok, true);
    assert.ok(started.captureSessionId);

    // Simulate login writing auth.json
    const fixture = buildFixtureCursorAuthJson({ email: "captured@cursor.com", userId: "usr_captured" });
    mutableFileMap[authFilePath] = JSON.stringify(fixture);

    const confirmed = await confirmAndCaptureCursorLogin({
      deps,
      captureSessionId: started.captureSessionId!,
    });

    assert.equal(confirmed.ok, true);
    assert.equal(confirmed.status, "captured");
    assert.equal(confirmed.connectionId, "cursor-conn-123");
    assert.equal(confirmed.identity?.email, "captured@cursor.com");
    assert.equal(confirmed.identity?.userId, "usr_captured");

    assert.equal(persistedPayload?.provider, "cursor");
    assert.equal(persistedPayload?.authType, "oauth");
    assert.equal(persistedPayload?.accessToken, fixture.accessToken);
    assert.equal((persistedPayload?.providerSpecificData as Record<string, unknown>)?.authMethod, "cursor-agent");
  });

  test("confirmAndCaptureCursorLogin rejects unchanged/stale auth record (stale-record)", async () => {
    const authFilePath = path.join(DEFAULT_HOME, ".config", "cursor", "auth.json");
    const preExistingFixture = buildFixtureCursorAuthJson({ email: "old@cursor.com", userId: "usr_old" });
    const mutableFileMap: Record<string, string> = {
      [authFilePath]: JSON.stringify(preExistingFixture),
    };

    const deps = {
      ...baseDeps({
        isDocker: true,
        existsPaths: [
          path.join(DEFAULT_HOME, ".config", "cursor"),
          authFilePath,
          path.join(DEFAULT_HOME, ".local", "bin", "cursor-agent"),
        ],
        fileMap: mutableFileMap,
      }),
      persistence: {
        getProviderConnections: async () => [],
        createProviderConnection: async () => ({ id: "should-not-persist" }),
        updateProviderConnection: async () => ({ id: "should-not-update" }),
      },
    };

    // Start captures preExistingFixture in snapshotDigests
    const started = await startLocalCursorLogin({ deps });
    assert.equal(started.ok, true);
    assert.ok(started.captureSessionId);

    // User confirms without auth.json changing (stale)
    const confirmed = await confirmAndCaptureCursorLogin({
      deps,
      captureSessionId: started.captureSessionId!,
    });

    assert.equal(confirmed.ok, false);
    assert.equal(confirmed.status, "stale-record");
    assert.match(confirmed.safeMessage, /No new auth record was found/i);
  });

  test("confirmAndCaptureCursorLogin rejects ambiguous multi-record auth files (ambiguous-records)", async () => {
    const authFilePath = path.join(DEFAULT_HOME, ".config", "cursor", "auth.json");
    const mutableFileMap: Record<string, string> = {
      [authFilePath]: JSON.stringify({}),
    };

    const deps = {
      ...baseDeps({
        isDocker: true,
        existsPaths: [
          path.join(DEFAULT_HOME, ".config", "cursor"),
          authFilePath,
          path.join(DEFAULT_HOME, ".local", "bin", "cursor-agent"),
        ],
        fileMap: mutableFileMap,
      }),
      persistence: {
        getProviderConnections: async () => [],
        createProviderConnection: async () => ({ id: "should-not-persist" }),
        updateProviderConnection: async () => ({ id: "should-not-update" }),
      },
    };

    const started = await startLocalCursorLogin({ deps });
    assert.equal(started.ok, true);

    // Two new tokens written into auth.json (ambiguous)
    const token1 = buildJwt("user1@cursor.com", "usr_1");
    const token2 = buildJwt("user2@cursor.com", "usr_2");
    mutableFileMap[authFilePath] = JSON.stringify([
      { accessToken: token1, email: "user1@cursor.com", userId: "usr_1" },
      { accessToken: token2, email: "user2@cursor.com", userId: "usr_2" },
    ]);

    const confirmed = await confirmAndCaptureCursorLogin({
      deps,
      captureSessionId: started.captureSessionId!,
    });

    assert.equal(confirmed.ok, false);
    assert.equal(confirmed.status, "ambiguous-records");
    assert.match(confirmed.safeMessage, /Found 2 new auth records/i);
  });

  test("startLocalCursorLogin respects pre-aborted AbortSignal", async () => {
    const controller = new AbortController();
    controller.abort();

    const deps = baseDeps({ isDocker: true });
    const result = await startLocalCursorLogin({ deps, signal: controller.signal });
    assert.equal(result.ok, false);
    assert.equal(result.status, "cancelled");
  });

  test("confirmAndCaptureCursorLogin updates existing matching connection", async () => {
    const authFilePath = path.join(DEFAULT_HOME, ".config", "cursor", "auth.json");
    const fixture = buildFixtureCursorAuthJson({ email: "existing@cursor.com", userId: "usr_existing" });
    const mutableFileMap: Record<string, string> = {
      [authFilePath]: JSON.stringify({}),
    };

    let updatedId: string | null = null;
    let updatedPayload: Record<string, unknown> | null = null;

    const deps = {
      ...baseDeps({
        isDocker: true,
        existsPaths: [
          path.join(DEFAULT_HOME, ".config", "cursor"),
          authFilePath,
          path.join(DEFAULT_HOME, ".local", "bin", "cursor-agent"),
        ],
        fileMap: mutableFileMap,
      }),
      persistence: {
        getProviderConnections: async () => [
          {
            id: "existing-conn-id",
            provider: "cursor",
            authType: "oauth",
            email: "existing@cursor.com",
            providerSpecificData: { userId: "usr_existing" },
          },
        ],
        createProviderConnection: async () => ({ id: "should-not-create" }),
        updateProviderConnection: async (id: string, payload: Record<string, unknown>) => {
          updatedId = id;
          updatedPayload = payload;
          return { id, ...payload };
        },
      },
    };

    const started = await startLocalCursorLogin({ deps });
    assert.equal(started.ok, true);

    mutableFileMap[authFilePath] = JSON.stringify(fixture);

    const confirmed = await confirmAndCaptureCursorLogin({
      deps,
      captureSessionId: started.captureSessionId!,
    });

    assert.equal(confirmed.ok, true);
    assert.equal(confirmed.status, "captured");
    assert.equal(updatedId, "existing-conn-id");
    assert.equal(updatedPayload?.accessToken, fixture.accessToken);
    assert.equal((updatedPayload?.providerSpecificData as Record<string, unknown>)?.source, "cursor-agent");
  });

  test("confirmAndCaptureCursorLogin rejects invalid or expired session IDs", async () => {
    const deps = baseDeps({ isDocker: true });
    const result = await confirmAndCaptureCursorLogin({
      deps,
      captureSessionId: "0000000000000000000000000000000000000000000000000000000000000000",
    });
    assert.equal(result.ok, false);
    assert.equal(result.status, "invalid-session");
  });

  test("oversized auth files (> 1MB) are rejected by readCursorAuthStore and confirm", async () => {
    const authFilePath = path.join(DEFAULT_HOME, ".config", "cursor", "auth.json");
    const hugeJson = JSON.stringify({ accessToken: "a".repeat(1_050_000) });
    const deps = baseDeps({
      isDocker: true,
      existsPaths: [path.join(DEFAULT_HOME, ".config", "cursor"), authFilePath],
      fileMap: { [authFilePath]: hugeJson },
    });

    const result = await readCursorAuthStore({ deps, authPath: authFilePath });
    assert.equal(result.ok, false);
    assert.equal(result.status, "file-too-large");
  });
});

describe("cursorCliLocalCapture - Route Guard & API Boundaries", () => {
  test("route guard blocks Cursor CLI capture actions for remote requests", async () => {
    const { isLocalOnlyPath, isSpawnCapablePath } = await import("@/server/authz/routeGuard");
    for (const action of ["start-cli-login", "capture-cli-auth", "cancel-cli-auth"]) {
      assert.equal(isLocalOnlyPath(`/api/oauth/cursor/${action}`, "POST"), true);
      assert.equal(isSpawnCapablePath(`/api/oauth/cursor/${action}`), true);
      // Boundary check: extra segment must NOT match
      assert.equal(isLocalOnlyPath(`/api/oauth/cursor/${action}/extra`, "POST"), false);
    }
  });

  test("route implementation binds Cursor actions to cursorCliLocalCapture and prevents secret exposure", async () => {
    const routePath = path.join(process.cwd(), "src/app/api/oauth/[provider]/[action]/route.ts");
    const routeSource = await fs.readFile(routePath, "utf8");

    assert.match(routeSource, /startLocalCursorLogin/);
    assert.match(routeSource, /confirmAndCaptureCursorLogin/);
    assert.match(routeSource, /cancelCursorCapture/);

    const captureBranch = routeSource.slice(routeSource.indexOf('if (provider === "cursor")'));
    assert.doesNotMatch(captureBranch.slice(0, 500), /accessToken|refreshToken|rawAuthJson/);
  });

  test("auto-import route never returns raw accessToken or JWT in response", async () => {
    const autoImportPath = path.join(process.cwd(), "src/app/api/oauth/cursor/auto-import/route.ts");
    const autoImportSource = await fs.readFile(autoImportPath, "utf8");

    assert.match(autoImportSource, /persistAutoImportToken/);
    // Response handler must return sanitized metadata only
    const getHandler = autoImportSource.slice(autoImportSource.indexOf("export async function GET"));
    assert.doesNotMatch(getHandler, /NextResponse\.json\(\s*\{[^}]*accessToken/);
  });

  test("confirmAndCaptureCursorLogin sentinel JWT test: raw token absent from safe results and messages", async () => {
    const sentinelJwt = "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6InNlbnRpbmVsQGN1cnNvci5jb20iLCJzdWIiOiJzZW50aW5lbF91c2VyIn0.SENTINEL_SIGNATURE_SECRET_XYZ_987654";
    const authFilePath = path.join(DEFAULT_HOME, ".config", "cursor", "auth.json");
    const mutableFileMap: Record<string, string> = {
      [authFilePath]: JSON.stringify({}),
    };

    const deps = {
      ...baseDeps({
        isDocker: true,
        existsPaths: [
          path.join(DEFAULT_HOME, ".config", "cursor"),
          authFilePath,
          path.join(DEFAULT_HOME, ".local", "bin", "cursor-agent"),
        ],
        fileMap: mutableFileMap,
      }),
      persistence: {
        getProviderConnections: async () => [],
        createProviderConnection: async () => ({ id: "sentinel-conn-id" }),
        updateProviderConnection: async () => ({ id: "sentinel-conn-id" }),
      },
    };

    const started = await startLocalCursorLogin({ deps });
    assert.equal(started.ok, true);

    mutableFileMap[authFilePath] = JSON.stringify({
      accessToken: sentinelJwt,
      refreshToken: "sentinel_refresh_secret_123",
      email: "sentinel@cursor.com",
      userId: "sentinel_user",
    });

    const confirmed = await confirmAndCaptureCursorLogin({
      deps,
      captureSessionId: started.captureSessionId!,
    });

    assert.equal(confirmed.ok, true);
    assert.equal(confirmed.status, "captured");

    // The public result must NOT contain the sentinel token string anywhere
    const resultJson = JSON.stringify(confirmed);
    assert.equal(resultJson.includes(sentinelJwt), false);
    assert.equal(resultJson.includes("sentinel_refresh_secret_123"), false);
    assert.equal(confirmed.safeMessage.includes(sentinelJwt), false);
  });
});
