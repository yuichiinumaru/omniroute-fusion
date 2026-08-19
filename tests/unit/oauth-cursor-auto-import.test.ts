import { describe, it } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import os from "node:os";
import fs from "node:fs/promises";
import { SignJWT } from "jose";
import {
  normalizeVscDbValue,
  extractCursorTokensFromRows,
  fuzzyExtractCursorTokensFromRows,
  cursorDbCandidatePaths,
  verifyLinuxCursorInstalled,
  GET,
} from "../../src/app/api/oauth/cursor/auto-import/route";
import { deleteProviderConnection } from "@/models";

describe("normalizeVscDbValue", () => {
  it("unwraps a JSON-encoded string", () => {
    assert.equal(normalizeVscDbValue('"abc"'), "abc");
  });

  it("returns the raw string when JSON parse fails", () => {
    assert.equal(normalizeVscDbValue("not-json"), "not-json");
  });

  it("returns the raw string when JSON parses to non-string", () => {
    assert.equal(normalizeVscDbValue("123"), "123");
    assert.equal(normalizeVscDbValue("{}"), "{}");
  });

  it("passes non-strings through unchanged", () => {
    assert.equal(normalizeVscDbValue(42 as unknown as string), 42);
    assert.equal(normalizeVscDbValue(null as unknown as string), null);
  });
});

describe("extractCursorTokensFromRows", () => {
  it("extracts tokens using exact primary keys", () => {
    const tokens = extractCursorTokensFromRows([
      { key: "cursorAuth/accessToken", value: "tok-1" },
      { key: "storage.serviceMachineId", value: "machine-1" },
    ]);
    assert.equal(tokens.accessToken, "tok-1");
    assert.equal(tokens.machineId, "machine-1");
  });

  it("accepts the alternative `cursorAuth/token` key", () => {
    const tokens = extractCursorTokensFromRows([
      { key: "cursorAuth/token", value: "tok-2" },
      { key: "storage.machineId", value: "machine-2" },
    ]);
    assert.equal(tokens.accessToken, "tok-2");
    assert.equal(tokens.machineId, "machine-2");
  });

  it("accepts the alternative `telemetry.machineId` key", () => {
    const tokens = extractCursorTokensFromRows([
      { key: "cursorAuth/accessToken", value: "tok-3" },
      { key: "telemetry.machineId", value: "machine-3" },
    ]);
    assert.equal(tokens.machineId, "machine-3");
  });

  it("prefers the first match and ignores duplicates", () => {
    const tokens = extractCursorTokensFromRows([
      { key: "cursorAuth/accessToken", value: "first" },
      { key: "cursorAuth/token", value: "second" },
    ]);
    assert.equal(tokens.accessToken, "first");
  });

  it("normalizes JSON-encoded values", () => {
    const tokens = extractCursorTokensFromRows([
      { key: "cursorAuth/accessToken", value: '"json-token"' },
      { key: "storage.serviceMachineId", value: '"json-machine"' },
    ]);
    assert.equal(tokens.accessToken, "json-token");
    assert.equal(tokens.machineId, "json-machine");
  });

  it("returns empty on no matches", () => {
    const tokens = extractCursorTokensFromRows([{ key: "irrelevant", value: "x" }]);
    assert.equal(tokens.accessToken, undefined);
    assert.equal(tokens.machineId, undefined);
  });
});

describe("fuzzyExtractCursorTokensFromRows", () => {
  it("matches keys by substring containing `accesstoken` and `machineid`", () => {
    const tokens = fuzzyExtractCursorTokensFromRows([
      { key: "cursorAuth/someOtherAccessTokenKey", value: "fallback-token" },
      { key: "storage.someMachineId", value: "fallback-machine" },
    ]);
    assert.equal(tokens.accessToken, "fallback-token");
    assert.equal(tokens.machineId, "fallback-machine");
  });

  it("preserves already-found tokens (passes existing through)", () => {
    const tokens = fuzzyExtractCursorTokensFromRows(
      [
        { key: "cursorAuth/someOtherAccessTokenKey", value: "fallback-token" },
        { key: "storage.someMachineId", value: "fallback-machine" },
      ],
      { accessToken: "already-have-it" }
    );
    assert.equal(tokens.accessToken, "already-have-it");
    assert.equal(tokens.machineId, "fallback-machine");
  });

  it("is case-insensitive on the key match", () => {
    const tokens = fuzzyExtractCursorTokensFromRows([
      { key: "Some.ACCESSTOKEN.suffix", value: "tok" },
      { key: "Some.MACHINEID.suffix", value: "mid" },
    ]);
    assert.equal(tokens.accessToken, "tok");
    assert.equal(tokens.machineId, "mid");
  });
});

describe("cursorDbCandidatePaths", () => {
  it("returns standard + Insiders paths on macOS", () => {
    const paths = cursorDbCandidatePaths("darwin", { home: "/Users/test" });
    assert.equal(paths.length, 2);
    assert.ok(paths[0].includes("Cursor/User/globalStorage/state.vscdb"));
    assert.ok(paths[1].includes("Cursor - Insiders/User/globalStorage/state.vscdb"));
  });

  it("returns a single path on Linux", () => {
    const paths = cursorDbCandidatePaths("linux", { home: "/home/test" });
    assert.deepEqual(paths, [
      "/home/test/.config/Cursor/User/globalStorage/state.vscdb",
    ]);
  });

  it("returns a single path on Windows using APPDATA", () => {
    const paths = cursorDbCandidatePaths("win32", {
      home: "C:/Users/test",
      appdata: "C:/Users/test/AppData/Roaming",
    });
    assert.equal(paths.length, 1);
    assert.ok(paths[0].includes("Cursor/User/globalStorage/state.vscdb"));
  });

  it("returns empty array for unsupported platforms", () => {
    assert.deepEqual(cursorDbCandidatePaths("freebsd" as NodeJS.Platform, { home: "/x" }), []);
  });
});

describe("verifyLinuxCursorInstalled (port: 9router#313)", () => {
  const okExec = async () => ({ stdout: "/usr/bin/cursor\n", stderr: "" });
  const failExec = async () => {
    throw new Error("which: no cursor in PATH");
  };
  const okAccess = async () => {};
  const failAccess = async () => {
    throw Object.assign(new Error("ENOENT"), { code: "ENOENT" });
  };

  it("returns true when `which cursor` succeeds (does not probe the .desktop file)", async () => {
    let accessCalled = false;
    const installed = await verifyLinuxCursorInstalled({
      execFile: okExec,
      access: async () => {
        accessCalled = true;
      },
      home: "/home/test",
    });
    assert.equal(installed, true);
    assert.equal(accessCalled, false);
  });

  it("falls back to the cursor.desktop launcher when `which` fails", async () => {
    let probedPath = "";
    const installed = await verifyLinuxCursorInstalled({
      execFile: failExec,
      access: async (p) => {
        probedPath = p;
      },
      home: "/home/test",
    });
    assert.equal(installed, true);
    assert.equal(probedPath, "/home/test/.local/share/applications/cursor.desktop");
  });

  it("returns false when neither `which` nor the .desktop file resolve (phantom config)", async () => {
    const installed = await verifyLinuxCursorInstalled({
      execFile: failExec,
      access: failAccess,
      home: "/home/test",
    });
    assert.equal(installed, false);
  });

  it("probes `which cursor` with a fixed binary name and a bounded timeout", async () => {
    let calledWith: { file: string; args: string[]; timeout: number } | null = null;
    const installed = await verifyLinuxCursorInstalled({
      execFile: async (file, args, options) => {
        calledWith = { file, args, timeout: options.timeout };
        return { stdout: "/usr/bin/cursor", stderr: "" };
      },
      access: okAccess,
      home: "/home/test",
    });
    assert.equal(installed, true);
    assert.deepEqual(calledWith, {
      file: "which",
      args: ["cursor"],
      timeout: 5000,
    });
  });
});

function buildTestJwt(email: string, userId: string): string {
  const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(
    JSON.stringify({ email, sub: userId, exp: Math.floor(Date.now() / 1000) + 3600 })
  ).toString("base64url");
  return `${header}.${payload}.SENTINEL_SIGNATURE_AUTO_IMPORT_TEST_987654`;
}

async function createAuthHeaders(): Promise<Headers> {
  const secretStr = process.env.JWT_SECRET || "jwt-test-secret-auto-import-0172";
  process.env.JWT_SECRET = secretStr;
  const secret = new TextEncoder().encode(secretStr);
  const token = await new SignJWT({ authenticated: true })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(secret);
  return new Headers({
    cookie: `auth_token=${token}`,
  });
}

describe("GET /api/oauth/cursor/auto-import (HTTP Route Handler)", () => {
  it("returns HTTP 401 when authentication is required and request lacks credentials", async () => {
    const unauthRequest = new Request("http://localhost/api/oauth/cursor/auto-import");
    const response = await GET(unauthRequest);
    assert.equal(response.status, 401);
    const body = (await response.json()) as Record<string, unknown>;
    assert.equal(body.error, "Unauthorized");
  });

  it("returns found=false with descriptive error when no credentials exist", async () => {
    const headers = await createAuthHeaders();
    const response = await GET(
      new Request("http://localhost/api/oauth/cursor/auto-import", { headers }),
      {
        readIdeAuth: async () => ({ found: false, error: "Cursor IDE database not found" }),
        readAgentAuth: async () => ({ found: false, error: "cursor-agent auth.json not found" }),
      }
    );
    assert.equal(response.status, 200);

    const body = (await response.json()) as Record<string, unknown>;
    assert.equal(body.success, false);
    assert.equal(body.found, false);
    assert.equal(typeof body.error, "string");
    assert.equal(body.accessToken, undefined);
    assert.equal(body.refreshToken, undefined);

    const rawJson = JSON.stringify(body);
    assert.equal(rawJson.includes("accessToken"), false);
    assert.equal(rawJson.includes("refreshToken"), false);
  });

  it("extracts agent auth, persists server-side, and returns sanitized response without raw tokens", async () => {
    const sentinelJwt = buildTestJwt("sentinel-auto@cursor.com", "sentinel-sub-12345");
    const sentinelSecret = "sentinel_secret_refresh_token_xyz";
    let persistedPayload: Record<string, unknown> | null = null;

    const headers = await createAuthHeaders();
    const response = await GET(
      new Request("http://localhost/api/oauth/cursor/auto-import", { headers }),
      {
        readIdeAuth: async () => ({ found: false, error: "not installed" }),
        readAgentAuth: async () => ({
          found: true,
          accessToken: sentinelJwt,
          source: "cursor-agent",
        }),
        persistence: {
          getProviderConnections: async () => [],
          createProviderConnection: async (payload) => {
            persistedPayload = payload;
            return { id: "sentinel-created-conn-1" };
          },
          updateProviderConnection: async () => ({}),
        },
      }
    );
    assert.equal(response.status, 200);

    const body = (await response.json()) as Record<string, unknown>;
    assert.equal(body.success, true);
    assert.equal(body.found, true);
    assert.equal(body.connectionId, "sentinel-created-conn-1");
    assert.equal(body.email, "sentinel-auto@cursor.com");
    assert.equal(body.hasMachineId, false);
    assert.equal(body.source, "cursor-agent");

    // Sentinel verification: raw tokens MUST NOT appear anywhere in the response
    assert.equal(body.accessToken, undefined);
    assert.equal(body.refreshToken, undefined);
    const rawJson = JSON.stringify(body);
    assert.equal(rawJson.includes(sentinelJwt), false);
    assert.equal(rawJson.includes(sentinelSecret), false);
    assert.equal(rawJson.includes("sentinel-sub-12345"), false);

    // Verify token was persisted server-side
    assert.ok(persistedPayload);
    assert.equal((persistedPayload as Record<string, unknown>).accessToken, sentinelJwt);
    assert.equal((persistedPayload as Record<string, unknown>).email, "sentinel-auto@cursor.com");
  });

  it("extracts IDE auth with machineId, persists server-side, and returns sanitized response", async () => {
    const sentinelJwt = buildTestJwt("sentinel-ide@cursor.com", "sentinel-ide-sub-67890");
    let persistedPayload: Record<string, unknown> | null = null;

    const headers = await createAuthHeaders();
    const response = await GET(
      new Request("http://localhost/api/oauth/cursor/auto-import", { headers }),
      {
        readIdeAuth: async () => ({
          found: true,
          accessToken: sentinelJwt,
          machineId: "mach-uuid-9999",
          source: "cursor-ide",
        }),
        readAgentAuth: async () => ({ found: false }),
        persistence: {
          getProviderConnections: async () => [],
          createProviderConnection: async (payload) => {
            persistedPayload = payload;
            return { id: "sentinel-ide-conn-2" };
          },
          updateProviderConnection: async () => ({}),
        },
      }
    );
    assert.equal(response.status, 200);

    const body = (await response.json()) as Record<string, unknown>;
    assert.equal(body.success, true);
    assert.equal(body.found, true);
    assert.equal(body.connectionId, "sentinel-ide-conn-2");
    assert.equal(body.email, "sentinel-ide@cursor.com");
    assert.equal(body.hasMachineId, true);
    assert.equal(body.source, "cursor-ide");

    // Sentinel verification
    assert.equal(body.accessToken, undefined);
    assert.equal(body.refreshToken, undefined);
    const rawJson = JSON.stringify(body);
    assert.equal(rawJson.includes(sentinelJwt), false);
    assert.equal(rawJson.includes("sentinel-ide-sub-67890"), false);

    // Verify persistence payload
    assert.ok(persistedPayload);
    assert.equal((persistedPayload as Record<string, unknown>).accessToken, sentinelJwt);
    const psData = (persistedPayload as Record<string, unknown>).providerSpecificData as Record<string, unknown>;
    assert.equal(psData.machineId, "mach-uuid-9999");
    assert.equal(psData.authMethod, "cursor-ide");
  });

  it("captures errors safely and never leaks raw token in error message, response, or logs", async () => {
    const sentinelJwt = buildTestJwt("sentinel-err@cursor.com", "sentinel-err-sub");
    const originalConsoleError = console.error;
    const capturedLogs: string[] = [];

    try {
      console.error = (...args: unknown[]) => {
        capturedLogs.push(args.map((a) => (typeof a === "object" ? JSON.stringify(a) : String(a))).join(" "));
      };

      const headers = await createAuthHeaders();
      const response = await GET(
        new Request("http://localhost/api/oauth/cursor/auto-import", { headers }),
        {
          readIdeAuth: async () => ({
            found: true,
            accessToken: sentinelJwt,
            source: "cursor-ide",
          }),
          persistence: {
            getProviderConnections: async () => {
              throw new Error("Simulated database failure with secret=" + sentinelJwt);
            },
          },
        }
      );
      assert.equal(response.status, 500);

      const body = (await response.json()) as Record<string, unknown>;
      assert.equal(body.success, false);
      assert.equal(body.found, false);
      assert.equal(body.error, "Internal server error");

      const rawJson = JSON.stringify(body);
      assert.equal(rawJson.includes(sentinelJwt), false);
      assert.equal(rawJson.includes("Simulated database failure"), false);

      // Verify captured logs do not contain raw unhandled tokens
      const combinedLogs = capturedLogs.join("\n");
      assert.ok(combinedLogs.includes("Cursor auto-import error"));
      assert.equal(combinedLogs.includes(sentinelJwt), false, "Logs must never contain the raw sentinel JWT");
    } finally {
      console.error = originalConsoleError;
    }
  });

  it("upserts existing provider connection on repeat auto-import with same email", async () => {
    const sentinelJwt1 = buildTestJwt("sentinel-upsert@cursor.com", "sentinel-upsert-1");
    const sentinelJwt2 = buildTestJwt("sentinel-upsert@cursor.com", "sentinel-upsert-2");

    let existingConnections: Array<{
      id: string;
      authType?: string;
      email?: string | null;
      accessToken?: string;
      providerSpecificData?: Record<string, unknown>;
    }> = [];
    let updatedPayload: Record<string, unknown> | null = null;

    const deps: CursorAutoImportDeps = {
      readIdeAuth: async () => ({ found: false }),
      readAgentAuth: async () => ({
        found: true,
        accessToken: sentinelJwt1,
        source: "cursor-agent",
      }),
      persistence: {
        getProviderConnections: async () => existingConnections,
        createProviderConnection: async (payload) => {
          const conn = {
            id: "conn-upsert-123",
            authType: "oauth",
            email: payload.email,
            accessToken: payload.accessToken,
            providerSpecificData: payload.providerSpecificData,
          };
          existingConnections = [conn];
          return conn;
        },
        updateProviderConnection: async (_id, payload) => {
          updatedPayload = payload;
          return {};
        },
      },
    };

    const headers = await createAuthHeaders();
    const response1 = await GET(
      new Request("http://localhost/api/oauth/cursor/auto-import", { headers }),
      deps
    );
    assert.equal(response1.status, 200);
    const body1 = (await response1.json()) as Record<string, unknown>;
    assert.equal(body1.success, true);
    assert.equal(body1.connectionId, "conn-upsert-123");

    // Second import with updated token for the same email
    deps.readAgentAuth = async () => ({
      found: true,
      accessToken: sentinelJwt2,
      source: "cursor-agent",
    });

    const response2 = await GET(
      new Request("http://localhost/api/oauth/cursor/auto-import", { headers }),
      deps
    );
    assert.equal(response2.status, 200);
    const body2 = (await response2.json()) as Record<string, unknown>;
    assert.equal(body2.success, true);
    assert.equal(body2.connectionId, "conn-upsert-123");

    // Assert that updateProviderConnection was called with the second token
    assert.ok(updatedPayload);
    assert.equal(updatedPayload!.accessToken, sentinelJwt2);
    assert.equal(body2.accessToken, undefined);
    assert.equal(JSON.stringify(body2).includes(sentinelJwt2), false);
  });
});
