/**
 * Task 0161 additional TDD coverage:
 * - multiple auth records
 * - deterministic record ordering
 * - explicit identity parsing shape
 */

import assert from "node:assert";
import path from "path";
import os from "os";
import { describe, test } from "node:test";

const DEFAULT_HOME = os.homedir();

function buildMultiRecordFixture() {
  return {
    "https://auth.x.ai::client": {
      key: "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJpdF9pZCI6IjEyMzQ1IiwidGVhbV9pZCI6IjU2Nzg5IiwidGllciI6MSwiaXNzdWVyIjoiaHR0cHM6Ly9hdXRoLnguYWkvdWF0L2lkIn0.signed",
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
    "https://auth.x.ai::client-secondary": {
      key: "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6InNlY29uZEBleGFtcGxlLmNvbSIsIml0X2lkIjoiNDU2IiwidGVhbV9pZCI6IjQ1NiIsInRpZXIiOjEsImlzc3VlciI6Imh0dHBzOi8vYXV0aC54LmFpL3VhdC9pZCJ9.secondary",
      refresh_token: "refresh-token-secondary",
      expires_at: new Date(Date.now() + 120_000).toISOString(),
      email: "second@example.com",
      user_id: "user-secondary",
      principal_id: "team-secondary",
      team_id: "team-secondary",
      principal_type: "team",
      organization_id: "org-secondary",
      issuer: "https://auth.x.ai",
      tier: 1,
    },
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
    execFile: async () => {},
    spawn: () => ({ pid: 123, kill: () => {}, stdout: { on: () => {} }, stderr: { on: () => {} } }),
    existsSync: (p: string) => existsPaths.has(p),
    readFile: async (p: string) => fileMap[p] ?? "{}",
    homedir: () => DEFAULT_HOME,
    now: () => now,
  };
}

describe("grokCliLocalCapture additional", () => {
  test("readGrokAuthStore returns multiple records in declaration order", async () => {
    const { readGrokAuthStore } = await import("@/lib/oauth/grokCliLocalCapture.ts");
    const fixture = buildMultiRecordFixture();
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
    assert.strictEqual(result.records.length, 2);
    assert.strictEqual(result.records[0].identity.email, "test@example.com");
    assert.strictEqual(result.records[1].identity.email, "second@example.com");
    assert.match(result.records[0].keyDigest, /^[a-f0-9]{64}$/);
    assert.equal("accessToken" in result.records[0], false);
    assert.equal("refreshToken" in result.records[0], false);
  });

  test("confirm rejects ambiguous fresh records instead of choosing declaration order", async () => {
    const {
      startLocalGrokLogin,
      confirmAndCaptureGrokLogin,
      _test_clearAllSessions,
    } = await import("@/lib/oauth/grokCliLocalCapture.ts");
    _test_clearAllSessions();
    const authFilePath = path.join(DEFAULT_HOME, ".grok", "auth.json");
    const mutableFileMap: Record<string, string> = {
      [authFilePath]: JSON.stringify({}),
    };
    const deps = {
      ...baseDeps({
        isDocker: true,
        existsPaths: [`${DEFAULT_HOME}/.grok`, authFilePath],
        fileMap: mutableFileMap,
      }),
      spawn: (() => {
        const child = {
          stdout: { on: () => {} },
          stderr: { on: () => {} },
          kill: () => true,
          on: (event: string, callback: (code?: number) => void) => {
            if (event === "close") queueMicrotask(() => callback(0));
            return child;
          },
          once: (event: string, callback: (code?: number) => void) => {
            if (event === "close") queueMicrotask(() => callback(0));
            return child;
          },
        };
        return child;
      }) as any,
      persistence: {
        getProviderConnections: async () => [],
        createProviderConnection: async () => ({ id: "created" }),
        updateProviderConnection: async () => ({ id: "updated" }),
      },
    };
    const started = await startLocalGrokLogin({ deps });
    assert.equal(started.ok, true);
    assert.ok(started.captureSessionId);
    mutableFileMap[authFilePath] = JSON.stringify(buildMultiRecordFixture());
    const result = await confirmAndCaptureGrokLogin({
      deps,
      captureSessionId: started.captureSessionId!,
    });
    assert.equal(result.ok, false);
    assert.equal(result.status, "ambiguous-records");
    _test_clearAllSessions();
  });

  test("confirm persists only through the injected encrypted-connection boundary", async () => {
    const {
      startLocalGrokLogin,
      confirmAndCaptureGrokLogin,
      _test_clearAllSessions,
    } = await import("@/lib/oauth/grokCliLocalCapture.ts");
    _test_clearAllSessions();
    const authFilePath = path.join(DEFAULT_HOME, ".grok", "auth.json");
    const mutableFileMap: Record<string, string> = {
      [authFilePath]: JSON.stringify({}),
    };
    let persistedPayload: Record<string, unknown> | null = null;
    const deps = {
      ...baseDeps({
        isDocker: true,
        existsPaths: [`${DEFAULT_HOME}/.grok`, authFilePath],
        fileMap: mutableFileMap,
      }),
      spawn: (() => {
        const child = {
          stdout: { on: () => {} },
          stderr: { on: () => {} },
          kill: () => true,
          on: (event: string, callback: (code?: number) => void) => {
            if (event === "close") queueMicrotask(() => callback(0));
            return child;
          },
          once: (event: string, callback: (code?: number) => void) => {
            if (event === "close") queueMicrotask(() => callback(0));
            return child;
          },
        };
        return child;
      }) as any,
      persistence: {
        getProviderConnections: async () => [],
        createProviderConnection: async (payload: Record<string, unknown>) => {
          persistedPayload = payload;
          return { id: "created" };
        },
        updateProviderConnection: async () => ({ id: "updated" }),
      },
    };
    const started = await startLocalGrokLogin({ deps });
    assert.equal(started.ok, true);
    mutableFileMap[authFilePath] = JSON.stringify({
      "https://auth.x.ai::new": {
        key: "eyJhbGciOiJSUzI1NiJ9.eyJlbWFpbCI6Im5ld0BleGFtcGxlLmNvbSJ9.signed-new",
        refresh_token: "refresh-new",
        expires_at: new Date(Date.now() + 60_000).toISOString(),
        email: "new@example.com",
        user_id: "new-user",
        principal_id: "new-principal",
        team_id: "new-team",
        issuer: "https://auth.x.ai",
      },
    });
    const result = await confirmAndCaptureGrokLogin({ deps, captureSessionId: started.captureSessionId! });
    assert.equal(result.ok, true);
    assert.equal(result.identity?.email, "new@example.com");
    assert.equal(persistedPayload?.provider, "grok-cli");
    assert.equal(persistedPayload?.accessToken, "eyJhbGciOiJSUzI1NiJ9.eyJlbWFpbCI6Im5ld0BleGFtcGxlLmNvbSJ9.signed-new");
    _test_clearAllSessions();
  });

  test("readGrokAuthStore preserves identity fields exactly when present", async () => {
    const { readGrokAuthStore } = await import("@/lib/oauth/grokCliLocalCapture.ts");
    const fixture = {
      "https://auth.x.ai::client": {
        key: "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJpdF9pZCI6IjEyMzQ1IiwidGVhbV9pZCI6IjU2Nzg5IiwidGllciI6MSwiaXNzdWVyIjoiaHR0cHM6Ly9hdXRoLnguYWkvdWF0L2lkIn0.signed",
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
    };
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
    const first = result.records[0];
    assert.deepStrictEqual(first.identity, {
      email: "test@example.com",
      principalId: "team-567",
      teamId: "team-567",
      userId: "user-123",
      organizationId: "org-999",
      principalType: "team",
      tier: 2,
    });
  });
});
