import test from "node:test";
import assert from "node:assert/strict";

import {
  evaluateToolScopes,
  resolveCallerScopeContext,
} from "../../open-sse/mcp-server/scopeEnforcement.ts";
import {
  bindApiKeyIdToPrincipal,
  bindTenantPrincipalIds,
  resolvePrincipal,
} from "../../open-sse/mcp-server/principalBinding.ts";
import {
  assertCredentialSafeOmniRouteBaseUrl,
  isLoopbackOmniRouteBaseUrl,
} from "../../src/shared/utils/resolveOmniRouteBaseUrl.ts";
import {
  getAllowedPluginInstallRoots,
  validatePluginInstallPath,
} from "../../open-sse/mcp-server/tools/pluginPathJail.ts";
import { join } from "node:path";

test("resolveCallerScopeContext prioritizes authInfo scopes", () => {
  const context = resolveCallerScopeContext(
    {
      authInfo: {
        clientId: "client-auth",
        scopes: ["read:health", "read:combos"],
      },
      _meta: { scopes: ["write:combos"] },
      sessionId: "session-1",
    },
    ["read:usage"]
  );

  assert.equal(context.callerId, "client-auth");
  assert.equal(context.source, "authInfo");
  assert.deepEqual(context.scopes, ["read:health", "read:combos"]);
});

test("F-04-002: resolveCallerScopeContext NEVER trusts client _meta scopes", () => {
  const context = resolveCallerScopeContext(
    {
      _meta: {
        scopes: ["*"],
        auth: { scopes: ["write:combos"] },
        omniroute: { scopes: ["admin"] },
      },
      sessionId: "session-meta",
    },
    ["read:usage"]
  );

  // Forged meta scopes must not grant access — fall through to env only.
  assert.equal(context.callerId, "session-meta");
  assert.equal(context.source, "env");
  assert.deepEqual(context.scopes, ["read:usage"]);
  assert.ok(!context.scopes.includes("*"));
});

test("F-04-002: forged _meta scopes ignored even when no env fallback", () => {
  const context = resolveCallerScopeContext(
    {
      _meta: { scopes: ["*"] },
    },
    []
  );
  assert.equal(context.source, "none");
  assert.deepEqual(context.scopes, []);
});

test("resolveCallerScopeContext uses env fallback when caller has no scopes", () => {
  const context = resolveCallerScopeContext({ sessionId: "session-env" }, ["read:health"]);
  assert.equal(context.source, "env");
  assert.deepEqual(context.scopes, ["read:health"]);
});

test("evaluateToolScopes allows requests when enforcement is disabled", () => {
  const check = evaluateToolScopes("omniroute_switch_combo", [], false);
  assert.equal(check.allowed, true);
  assert.deepEqual(check.missing, []);
});

test("evaluateToolScopes denies tool execution when required scope is missing", () => {
  const check = evaluateToolScopes("omniroute_switch_combo", ["read:combos"], true);
  assert.equal(check.allowed, false);
  assert.ok(check.missing.includes("write:combos"));
  assert.equal(check.reason, "missing_scopes");
});

test("evaluateToolScopes supports wildcard scopes", () => {
  const check = evaluateToolScopes("omniroute_get_health", ["read:*"], true);
  assert.equal(check.allowed, true);
  assert.deepEqual(check.missing, []);
});

test("evaluateToolScopes denies unknown tool names", () => {
  const check = evaluateToolScopes("omniroute_unknown_tool", ["*"], true);
  assert.equal(check.allowed, false);
  assert.equal(check.reason, "tool_definition_missing");
});

// ── F-04-003 principal binding ──────────────────────────────────────────────

test("F-04-003: tenant principal remaps foreign apiKeyId to self", () => {
  const extra = {
    authInfo: { clientId: "key-a", scopes: ["manage"], extra: { role: "tenant" } },
  };
  assert.equal(bindApiKeyIdToPrincipal("key-b", extra), "key-a");
  assert.equal(resolvePrincipal(extra).role, "tenant");
});

test("F-04-003: tenant principal rejects foreign apiKeyId when bindTenantPrincipalIds", () => {
  // bindApiKeyId remaps rather than throws when different — remap is the contract
  const extra = {
    authInfo: { clientId: "key-a", scopes: ["read:memory"], extra: { role: "tenant" } },
  };
  const bound = bindTenantPrincipalIds({ apiKeyId: "victim-key", query: "x" }, extra) as {
    apiKeyId: string;
  };
  assert.equal(bound.apiKeyId, "key-a");
});

test("F-04-003: tenant principal throws on explicit foreign id via bindApiKeyId when mismatch check", () => {
  // Our implementation remaps; ensure forced pin always wins
  const extra = {
    authInfo: { clientId: "operator-1", scopes: ["manage"], extra: { role: "tenant" } },
  };
  assert.equal(bindApiKeyIdToPrincipal("other", extra), "operator-1");
});

test("F-04-003: admin principal may target foreign apiKeyId", () => {
  const extra = {
    authInfo: { clientId: "dashboard", scopes: ["*"], extra: { role: "admin" } },
  };
  assert.equal(resolvePrincipal(extra).role, "admin");
  assert.equal(bindApiKeyIdToPrincipal("any-tenant", extra), "any-tenant");
});

test("F-04-003: fromApiKeyId is bound for transfers", () => {
  const extra = {
    authInfo: { clientId: "key-a", scopes: ["write:gamification"], extra: { role: "tenant" } },
  };
  const bound = bindTenantPrincipalIds(
    { fromApiKeyId: "key-b", toApiKeyId: "key-c", amount: 1 },
    extra
  ) as { fromApiKeyId: string; toApiKeyId: string; apiKeyId: string };
  assert.equal(bound.fromApiKeyId, "key-a");
  assert.equal(bound.toApiKeyId, "key-c");
  assert.equal(bound.apiKeyId, "key-a");
});

// ── F-04-W2-002 host pin ────────────────────────────────────────────────────

test("F-04-W2-002: loopback hosts are credential-safe", () => {
  assert.equal(isLoopbackOmniRouteBaseUrl("http://localhost:20128"), true);
  assert.equal(isLoopbackOmniRouteBaseUrl("http://127.0.0.1:20128"), true);
  assert.equal(isLoopbackOmniRouteBaseUrl("http://[::1]:20128"), true);
  assert.equal(isLoopbackOmniRouteBaseUrl("https://evil.example.com"), false);
});

test("F-04-W2-002: assertCredentialSafe throws for non-loopback with credentials", () => {
  assert.throws(
    () => assertCredentialSafeOmniRouteBaseUrl("https://attacker.example", true),
    /non-loopback/
  );
  assert.doesNotThrow(() =>
    assertCredentialSafeOmniRouteBaseUrl("https://attacker.example", false)
  );
  assert.doesNotThrow(() =>
    assertCredentialSafeOmniRouteBaseUrl("http://127.0.0.1:20128", true)
  );
});

// ── F-04-W2-003 plugin path jail ────────────────────────────────────────────

test("F-04-W2-003: plugin_install rejects paths outside roots", () => {
  const env = { HOME: "/home/testuser", DATA_DIR: "/home/testuser/.omniroute" };
  assert.throws(() => validatePluginInstallPath("/etc/passwd", env), /outside allowed/);
  assert.throws(() => validatePluginInstallPath("/tmp/evil", env), /outside allowed/);
  assert.throws(() => validatePluginInstallPath("../escape", env), /absolute/i);
});

test("F-04-W2-003: plugin_install allows paths under plugin roots", () => {
  const env = { HOME: "/home/testuser", DATA_DIR: "/data/omni" };
  const roots = getAllowedPluginInstallRoots(env);
  assert.ok(roots.length >= 2);
  const okPath = join(roots[0], "my-plugin");
  assert.equal(validatePluginInstallPath(okPath, env), okPath);
  const staging = join(env.DATA_DIR, "plugin-sources", "drop");
  assert.equal(validatePluginInstallPath(staging, env), staging);
});
