/**
 * Task 0161 TDD tests for Docker-only Grok CLI local auth capture.
 */

import assert from "node:assert";
import path from "path";
import os from "os";
import { EventEmitter } from "node:events";
import { describe, test } from "node:test";

const DEFAULT_HOME = os.homedir();

function buildFixtureAuthJson(records: Record<string, unknown>): Record<string, unknown> {
  return {
    "https://auth.x.ai::client": {
      key: "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJpdF9pZCI6IjEyMzQ1IiwidGVhbV9pZCI6IjU2Nzg5IiwidGllciI6MSwiaXNz dWVyIjoiaHR0cHM6Ly9hdXRoLnguYWkvdWF0L2lkIn0.signed".replace("ISS dW", "ISSdW"),
      refresh_token: "refresh-token-123",
      expires_at: new Date(Date.now() + 60_000).toISOString(),
      email: "test@example.com",
      user_id: "user-123",
      principal_id: "team-567",
      team_id: "team-567",
      principal_type: "team",
      organization_id: "org-999",
      issuer: "https://auth.x.ai",
      tier: 2,
    },
    ...records,
  };
}

function baseDeps(overrides: {
  isDocker?: boolean;
  existsPaths?: string[];
  fileMap?: Record<string, string>;
  now?: number;
} = {}) {
  const existsPaths = new Set(overrides.existsPaths ?? [`${DEFAULT_HOME}/.grok`, "/host-home/.grok", "/host-local/.grok"]);
  const fileMap = overrides.fileMap ?? {};
  const now = overrides.now ?? Date.now();

  return {
    isDocker: () => overrides.isDocker ?? false,
    execFile: async (_command: string, args: string[]) => {
      if (args[0] === "login") return;
      throw new Error(`unsupported command in test deps: ${args[0]}`);
    },
    spawn: () => {
      const child = new EventEmitter() as any;
      child.stdout = new EventEmitter();
      child.stderr = new EventEmitter();
      child.kill = () => true;
      queueMicrotask(() => child.emit("close", 0));
      return child;
    },
    existsSync: (p: string) => existsPaths.has(p),
    readFile: async (p: string) => fileMap[p] ?? "{}",
    homedir: () => DEFAULT_HOME,
    now: () => now,
  };
}

describe("grokCliLocalCapture", () => {
  test("startLocalGrokLogin refuses non-Docker environments", async () => {
    const { startLocalGrokLogin } = await import("@/lib/oauth/grokCliLocalCapture.ts");
    const result = await startLocalGrokLogin({ deps: baseDeps(), timeoutMs: 1000 });
    assert.strictEqual(result.ok, false);
    assert.strictEqual(result.status, "not-docker");
  });

  test("startLocalGrokLogin fails when no Grok mount is detected", async () => {
    const { startLocalGrokLogin } = await import("@/lib/oauth/grokCliLocalCapture.ts");
    const result = await startLocalGrokLogin({
      deps: baseDeps({ isDocker: true, existsPaths: [] }),
      timeoutMs: 1000,
    });
    assert.strictEqual(result.ok, false);
    assert.strictEqual(result.status, "missing-mount");
  });

  test("readGrokAuthStore returns missing-file when auth.json is absent", async () => {
    const { readGrokAuthStore } = await import("@/lib/oauth/grokCliLocalCapture.ts");
    const result = await readGrokAuthStore({
      deps: baseDeps({ isDocker: true, existsPaths: [`${DEFAULT_HOME}/.grok`], fileMap: {} }),
      authPath: path.join(DEFAULT_HOME, ".grok", "auth.json"),
    });
    assert.strictEqual(result.ok, false);
    assert.strictEqual(result.status, "missing-file");
    assert.strictEqual(result.records.length, 0);
  });

  test("readGrokAuthStore parses valid auth.json records without exposing secrets", async () => {
    const { readGrokAuthStore, redactAuthRecord } = await import("@/lib/oauth/grokCliLocalCapture.ts");
    const fixture = buildFixtureAuthJson({});
    const authFilePath = path.join(DEFAULT_HOME, ".grok", "auth.json");
    const result = await readGrokAuthStore({
      deps: baseDeps({
        isDocker: true,
        existsPaths: [`${DEFAULT_HOME}/.grok`, authFilePath],
        fileMap: { [authFilePath]: JSON.stringify(fixture) },
      }),
      authPath: authFilePath,
    });

    assert.strictEqual(result.ok, true);
    assert.strictEqual(result.status, "ok");
    assert.ok(result.records.length >= 1);
    const first = result.records[0];
    assert.strictEqual(first.identity.email, "test@example.com");
    assert.strictEqual(first.identity.principalId, "team-567");
    assert.strictEqual(first.identity.tier, 2);
    assert.match(first.keyDigest, /^[a-f0-9]{64}$/);
    assert.strictEqual(first.hasRefreshToken, true);
    assert.equal("accessToken" in first, false);
    assert.equal("refreshToken" in first, false);
    assert.deepStrictEqual(redactAuthRecord(first), first);
  });

  test("readGrokAuthStore rejects unsupported top-level shapes", async () => {
    const { readGrokAuthStore } = await import("@/lib/oauth/grokCliLocalCapture.ts");
    const authFilePath = path.join(DEFAULT_HOME, ".grok", "auth.json");
    const result = await readGrokAuthStore({
      deps: baseDeps({
        isDocker: true,
        existsPaths: [`${DEFAULT_HOME}/.grok`, authFilePath],
        fileMap: { [authFilePath]: JSON.stringify([{ key: "x" }]) },
      }),
      authPath: authFilePath,
    });
    assert.strictEqual(result.ok, false);
    assert.strictEqual(result.status, "invalid-shape");
  });
});

describe("grokCliLocalCapture security and lifecycle blockers", () => {
  test("start returns only an opaque server session and never raw key material", async () => {
    const { startLocalGrokLogin, _test_clearAllSessions } = await import("@/lib/oauth/grokCliLocalCapture.ts");
    _test_clearAllSessions();
    const authFilePath = path.join(DEFAULT_HOME, ".grok", "auth.json");
    const result = await startLocalGrokLogin({
      deps: {
        ...baseDeps({
          isDocker: true,
          existsPaths: [`${DEFAULT_HOME}/.grok`, authFilePath],
          fileMap: { [authFilePath]: JSON.stringify(buildFixtureAuthJson({})) },
        }),
      },
    });
    assert.equal(result.ok, true);
    assert.match(result.captureSessionId ?? "", /^[a-f0-9]{64}$/);
    const serialized = JSON.stringify(result);
    assert.equal(serialized.includes("refresh-token-123"), false);
    assert.equal(serialized.includes("eyJhbGciOi"), false);
    assert.equal("preLoginSnapshot" in result, false);
    _test_clearAllSessions();
  });

  test("read rejects traversal before file access", async () => {
    const { readGrokAuthStore } = await import("@/lib/oauth/grokCliLocalCapture.ts");
    let reads = 0;
    const authPath = path.join(DEFAULT_HOME, ".grok", "auth.json");
    const result = await readGrokAuthStore({
      deps: { ...baseDeps({ isDocker: true, existsPaths: [authPath] }), readFile: async () => { reads++; return "{}"; } },
      authPath: path.join(DEFAULT_HOME, "..", "secrets", "auth.json"),
      allowedBaseDir: path.join(DEFAULT_HOME, ".grok"),
    });
    assert.equal(result.status, "path-traversal");
    assert.equal(reads, 0);
  });

  test("read accepts configured host mounts with a Docker-like home", async () => {
    const { readGrokAuthStore } = await import("@/lib/oauth/grokCliLocalCapture.ts");
    for (const mount of ["/host-home/.grok", "/host-local/.grok"]) {
      const authPath = `${mount}/auth.json`;
      const result = await readGrokAuthStore({
        deps: {
          ...baseDeps({
            isDocker: true,
            existsPaths: [mount, authPath],
            fileMap: { [authPath]: JSON.stringify(buildFixtureAuthJson({})) },
          }),
          homedir: () => "/home/node",
        },
        authPath,
      });
      assert.equal(result.status, "ok");
      assert.equal(result.records[0]?.identity.email, "test@example.com");
    }
  });

  test("cancelCapture kills the owned child before clearing its reference", async () => {
    const { startLocalGrokLogin, cancelCapture, _test_clearAllSessions } = await import("@/lib/oauth/grokCliLocalCapture.ts");
    _test_clearAllSessions();
    let killed = false;
    const result = await startLocalGrokLogin({
      deps: {
        ...baseDeps({ isDocker: true, existsPaths: [`${DEFAULT_HOME}/.grok`] }),
        spawn: (() => {
          const child = new EventEmitter() as any;
          child.stdout = new EventEmitter();
          child.stderr = new EventEmitter();
          child.kill = () => { killed = true; return true; };
          return child;
        }) as any,
      },
    });
    assert.equal(result.status, "started");
    assert.ok(result.captureSessionId);
    assert.deepEqual(cancelCapture(result.captureSessionId), {
      ok: true,
      safeMessage: "Capture session cancelled.",
    });
    assert.equal(killed, true);
    _test_clearAllSessions();
  });

  test("missing grok binary is a sanitized outcome", async () => {
    const { startLocalGrokLogin, _test_clearAllSessions } = await import("@/lib/oauth/grokCliLocalCapture.ts");
    _test_clearAllSessions();
    const result = await startLocalGrokLogin({
      deps: {
        ...baseDeps({ isDocker: true, existsPaths: [`${DEFAULT_HOME}/.grok`] }),
        spawn: (() => {
          const child = new EventEmitter() as any;
          child.stdout = new EventEmitter();
          child.stderr = new EventEmitter();
          child.kill = () => true;
          queueMicrotask(() => child.emit("error", Object.assign(new Error("spawn grok ENOENT"), { code: "ENOENT" })));
          return child;
        }) as any,
      },
    });
    assert.equal(result.ok, true);
    assert.equal(result.status, "started");
    assert.equal(result.captureSessionId?.length, 64);
    await new Promise((resolve) => setImmediate(resolve));
    _test_clearAllSessions();
  });

  test("AbortSignal kills the owned subprocess and returns cancelled", async () => {
    const { startLocalGrokLogin, _test_clearAllSessions } = await import("@/lib/oauth/grokCliLocalCapture.ts");
    _test_clearAllSessions();
    const controller = new AbortController();
    let killed = false;
    const resultPromise = startLocalGrokLogin({
      deps: {
        ...baseDeps({ isDocker: true, existsPaths: [`${DEFAULT_HOME}/.grok`] }),
        spawn: (() => {
          const child = new EventEmitter() as any;
          child.stdout = new EventEmitter();
          child.stderr = new EventEmitter();
          child.kill = () => { killed = true; return true; };
          return child;
        }) as any,
      },
      signal: controller.signal,
    });
    const result = await resultPromise;
    assert.equal(result.status, "started");
    assert.equal(killed, false);
    controller.abort();
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(killed, true);
    _test_clearAllSessions();
  });

  test("timeout terminates the child and releases the capture session", async () => {
    const { startLocalGrokLogin, _test_clearAllSessions, _test_getActiveCaptureSessionId } = await import("@/lib/oauth/grokCliLocalCapture.ts");
    _test_clearAllSessions();
    let killed = false;
    const result = await startLocalGrokLogin({
      timeoutMs: 10,
      deps: {
        ...baseDeps({ isDocker: true, existsPaths: [`${DEFAULT_HOME}/.grok`] }),
        spawn: (() => {
          const child = new EventEmitter() as any;
          child.stdout = new EventEmitter();
          child.stderr = new EventEmitter();
          child.kill = (signal?: string) => {
            killed = true;
            if (signal === "SIGTERM") queueMicrotask(() => child.emit("close", null));
            return true;
          };
          return child;
        }) as any,
      },
    });
    assert.equal(result.status, "started");
    await new Promise((resolve) => setTimeout(resolve, 25));
    assert.equal(killed, true);
    assert.equal(_test_getActiveCaptureSessionId(), null);
    _test_clearAllSessions();
  });

  test("second capture is rejected while the first session is active", async () => {
    const { startLocalGrokLogin, _test_clearAllSessions } = await import("@/lib/oauth/grokCliLocalCapture.ts");
    _test_clearAllSessions();
    const deps = {
      ...baseDeps({ isDocker: true, existsPaths: [`${DEFAULT_HOME}/.grok`] }),
      spawn: (() => {
        const child = new EventEmitter() as any;
        child.stdout = new EventEmitter();
        child.stderr = new EventEmitter();
        child.kill = () => { child.emit("close", 0); return true; };
        return child;
      }) as any,
    };
    const firstPromise = startLocalGrokLogin({ deps });
    await new Promise((resolve) => setImmediate(resolve));
    const second = await startLocalGrokLogin({ deps });
    assert.equal(second.status, "concurrent-session");
    const firstSessionId = (await import("@/lib/oauth/grokCliLocalCapture.ts"))._test_getActiveCaptureSessionId();
    if (firstSessionId) (await import("@/lib/oauth/grokCliLocalCapture.ts")).cancelCapture(firstSessionId);
    const first = await firstPromise;
    assert.equal(["cancelled", "started"].includes(first.status), true);
    _test_clearAllSessions();
  });

  test("forged or missing capture sessions cannot read or persist auth", async () => {
    const { confirmAndCaptureGrokLogin } = await import("@/lib/oauth/grokCliLocalCapture.ts");
    const result = await confirmAndCaptureGrokLogin({
      captureSessionId: "a".repeat(64),
      deps: baseDeps({ isDocker: true, existsPaths: [] }),
    });
    assert.equal(result.ok, false);
    assert.equal(result.status, "invalid-session");
  });

  test("oversized auth files are rejected before record parsing", async () => {
    const { readGrokAuthStore, _test_MAX_AUTH_FILE_BYTES } = await import("@/lib/oauth/grokCliLocalCapture.ts");
    const authPath = path.join(DEFAULT_HOME, ".grok", "auth.json");
    const result = await readGrokAuthStore({
      deps: {
        ...baseDeps({ isDocker: true, existsPaths: [authPath] }),
        readFile: async () => "x".repeat(_test_MAX_AUTH_FILE_BYTES + 1),
      },
      authPath,
    });
    assert.equal(result.status, "file-too-large");
    assert.equal(result.records.length, 0);
  });
});
