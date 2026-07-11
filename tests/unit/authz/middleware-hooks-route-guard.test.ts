/**
 * Task 0040 / F-07-W2-001 — middleware hooks must be LOCAL_ONLY + ALWAYS_PROTECTED
 * + SPAWN_CAPABLE so remote / auth-disabled installs cannot compile new Function code.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  isAlwaysProtectedPath,
  isLocalOnlyBypassableByManageScope,
  isLocalOnlyPath,
  isSpawnCapablePath,
} from "../../../src/server/authz/routeGuard.ts";
import { managementPolicy } from "../../../src/server/authz/policies/management.ts";
import { getMachineTokenSync } from "../../../src/lib/machineToken.ts";
import { CLI_TOKEN_HEADER } from "../../../src/server/authz/headers.ts";

test("hooks path is LOCAL_ONLY + ALWAYS_PROTECTED + SPAWN_CAPABLE", () => {
  for (const path of ["/api/middleware/hooks", "/api/middleware/hooks/my-hook"]) {
    assert.equal(isLocalOnlyPath(path), true, path);
    assert.equal(isAlwaysProtectedPath(path), true, path);
    assert.equal(isSpawnCapablePath(path), true, path);
    assert.equal(isLocalOnlyBypassableByManageScope(path), false, path);
  }
});

test("management policy rejects hooks from non-loopback (403 LOCAL_ONLY)", async () => {
  const ctx = {
    request: {
      method: "POST",
      headers: new Headers({ host: "evil.tunnel.io" }),
      cookies: { get: () => undefined },
      nextUrl: { pathname: "/api/middleware/hooks" },
      url: "https://evil.tunnel.io/api/middleware/hooks",
    },
    classification: {
      routeClass: "MANAGEMENT" as const,
      normalizedPath: "/api/middleware/hooks",
      method: "POST",
    },
    requestId: "hooks-remote",
  };
  const outcome = await managementPolicy.evaluate(ctx as never);
  assert.equal(outcome.allow, false);
  if (!outcome.allow) assert.equal(outcome.status, 403);
});

test("management policy allows hooks from loopback with CLI token", async () => {
  const token = getMachineTokenSync();
  const ctx = {
    request: {
      method: "POST",
      headers: new Headers({
        host: "localhost",
        [CLI_TOKEN_HEADER]: token,
      }),
      cookies: { get: () => undefined },
      nextUrl: { pathname: "/api/middleware/hooks" },
      url: "http://localhost/api/middleware/hooks",
      socket: { remoteAddress: "127.0.0.1" },
    },
    classification: {
      routeClass: "MANAGEMENT" as const,
      normalizedPath: "/api/middleware/hooks",
      method: "POST",
    },
    requestId: "hooks-loopback",
  };
  const outcome = await managementPolicy.evaluate(ctx as never);
  assert.equal(outcome.allow, true);
});
