/**
 * tests/unit/codex-gpt56-compat.test.ts
 *
 * Task 0126 — Codex gpt-5.6 client compatibility (P0 remediation).
 *
 * Proves (TDD red→green) the minimal backport from the upstream reference
 * fork (../legacy/diegosouzapw-omniroute) of:
 *
 *   1. Codex client identity version bumped from 0.142.0 to 0.144.1 to match
 *      the verified reference (`codexClient.ts:1` upstream constant).
 *      Reference: ../legacy/diegosouzapw-omniroute/open-sse/config/codexClient.ts:1
 *
 *   2. Registry entries for the gpt-5.6-{sol,terra,luna} family with full
 *      effort suffix coverage (no `-ultra` for luna, max-tier for luna).
 *      Reference: ../legacy/diegosouzapw-omniroute/open-sse/config/providers/registry/codex/index.ts:28-138
 *
 *   3. GPT_5_6_CODEX_CAPABILITIES capability constant with explicit
 *      contextLength=272000 / maxInputTokens=272000 / maxOutputTokens=128000.
 *      Reference: ../legacy/diegosouzapw-omniroute/open-sse/config/providers/shared.ts:258-266
 *
 *   4. Effort alias parsing distinguishes the gpt-5.6 `max` and `ultra`
 *      aliases from unsupported values. The reference uses
 *      EFFORT_ORDER = ["none", "low", "medium", "high", "xhigh", "max", "ultra"]
 *      and gates which base model accepts which alias.
 *      Reference: ../legacy/diegosouzapw-omniroute/open-sse/executors/codex.ts:121-124, 190-200, 417-421
 *
 *   5. Wire effort mapping: `effort: ultra` (Codex client coordination) is
 *      sent as `max` on the upstream wire.
 *      Reference: ../legacy/diegosouzapw-omniroute/open-sse/executors/codex.ts:1433
 *
 * The existing gpt-5.4 / gpt-5.5 behavior must remain compatible —
 * `claude-codex-identity-version-sync.test.ts` is allowed to drift to the
 * updated 0.144.1 pin (out of scope, will be reconciled by parent in the
 * lockstep sweep).
 */

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// ─── Imports under test ────────────────────────────────────────────────────
const codexCfg = await import("../../open-sse/config/codexClient.ts");
const codexExec = await import("../../open-sse/executors/codex.ts");
const shared = await import("../../open-sse/config/providers/shared.ts");
const { codexProvider } = await import(
  "../../open-sse/config/providers/registry/codex/index.ts"
);

// ─── Helpers ───────────────────────────────────────────────────────────────
const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Group registry models by their base id (strip recognized effort suffix).
 * Aligned with `getCodexUpstreamModel`.
 */
function groupByBaseId(
  models: ReadonlyArray<{ id: string; name: string }>
): Map<string, string[]> {
  const effortSuffixes = [
    "none",
    "low",
    "medium",
    "high",
    "xhigh",
    "max",
    "ultra",
  ];
  const map = new Map<string, string[]>();
  for (const m of models) {
    const id = m.id;
    let base = id;
    for (const suffix of effortSuffixes) {
      const token = `-${suffix}`;
      if (id.endsWith(token)) {
        base = id.slice(0, -token.length);
        break;
      }
    }
    const existing = map.get(base) ?? [];
    existing.push(id);
    map.set(base, existing);
  }
  return map;
}

// ─── (1) Codex client identity ────────────────────────────────────────────
test("T0126: getCodexClientVersion advertises 0.144.1 (verified upstream value)", () => {
  // Reference: ../legacy/diegosouzapw-omniroute/open-sse/config/codexClient.ts:1
  // local pre-fix: 0.142.0
  assert.equal(codexCfg.getCodexClientVersion(), "0.144.1");
});

test("T0126: getCodexUserAgent formats Version header with 0.144.1", () => {
  // Must preserve Windows-10.0.26200 / x64 platform tokens from the reference
  assert.equal(
    codexCfg.getCodexUserAgent(),
    "codex-cli/0.144.1 (Windows 10.0.26200; x64)"
  );
});

test("T0126: getCodexDefaultHeaders exposes Version=0.144.1 without leaking secrets", () => {
  const headers = codexCfg.getCodexDefaultHeaders();
  assert.equal(headers.Version, "0.144.1");
  assert.match(headers["User-Agent"], /^codex-cli\/0\.144\.1 \(/);
  // Headers must NOT carry credentials or user-controlled secrets
  for (const [key, value] of Object.entries(headers)) {
    assert.ok(!key.toLowerCase().includes("auth"), `${key} must not look like an auth header`);
    assert.ok(
      typeof value === "string" && value.length > 0 && value.length <= 256,
      `${key} value must be bounded`
    );
  }
});

test("T0126: CODEX_CLIENT_VERSION env override still wins over the default", () => {
  const previous = process.env.CODEX_CLIENT_VERSION;
  try {
    process.env.CODEX_CLIENT_VERSION = "1.2.3-custom";
    assert.equal(codexCfg.getCodexClientVersion(), "1.2.3-custom");
  } finally {
    if (previous === undefined) delete process.env.CODEX_CLIENT_VERSION;
    else process.env.CODEX_CLIENT_VERSION = previous;
  }
});

// ─── (2) GPT_5_6_CODEX_CAPABILITIES constant ──────────────────────────────
test("T0126: GPT_5_6_CODEX_CAPABILITIES exposes Codex-specific capability metadata", () => {
  // Reference: ../legacy/diegosouzapw-omniroute/open-sse/config/providers/shared.ts:258-266
  const caps = (shared as unknown as { GPT_5_6_CODEX_CAPABILITIES?: Record<string, unknown> })
    .GPT_5_6_CODEX_CAPABILITIES;
  assert.ok(caps, "GPT_5_6_CODEX_CAPABILITIES must be exported from shared.ts");
  assert.equal(caps.targetFormat, "openai-responses");
  assert.equal(caps.toolCalling, true);
  assert.equal(caps.supportsReasoning, true);
  assert.equal(caps.supportsVision, true);
  assert.equal(caps.supportsXHighEffort, true);
  assert.equal(caps.contextLength, 272000);
  assert.equal(caps.maxInputTokens, 272000);
  assert.equal(caps.maxOutputTokens, 128000);
});

test("T0126: GPT_5_5_CODEX_CAPABILITIES shape remains backward compatible", () => {
  const caps = (shared as unknown as { GPT_5_5_CODEX_CAPABILITIES: Record<string, unknown> })
    .GPT_5_5_CODEX_CAPABILITIES;
  assert.equal(caps.contextLength, 1050000);
  assert.equal(caps.supportsReasoning, true);
  assert.equal(caps.supportsXHighEffort, true);
});

test("T0126: GPT_5_4_CODEX_CAPABILITIES shape remains backward compatible", () => {
  const caps = (shared as unknown as { GPT_5_4_CODEX_CAPABILITIES: Record<string, unknown> })
    .GPT_5_4_CODEX_CAPABILITIES;
  assert.equal(caps.contextLength, 200000);
  assert.equal(caps.maxOutputTokens, 128000);
  assert.equal(caps.supportsXHighEffort, true);
});

// ─── (3) Registry entries ─────────────────────────────────────────────────
test("T0126: codexProvider registry contains the gpt-5.6 family with full suffix coverage", () => {
  const modelIds = new Set(codexProvider.models.map((m) => m.id));
  // Sol family — full set
  for (const id of [
    "gpt-5.6-sol",
    "gpt-5.6-sol-ultra",
    "gpt-5.6-sol-max",
    "gpt-5.6-sol-xhigh",
    "gpt-5.6-sol-high",
    "gpt-5.6-sol-medium",
    "gpt-5.6-sol-low",
  ]) {
    assert.ok(modelIds.has(id), `${id} must be registered in codexProvider`);
  }
  // Terra family — full set
  for (const id of [
    "gpt-5.6-terra",
    "gpt-5.6-terra-ultra",
    "gpt-5.6-terra-max",
    "gpt-5.6-terra-xhigh",
    "gpt-5.6-terra-high",
    "gpt-5.6-terra-medium",
    "gpt-5.6-terra-low",
  ]) {
    assert.ok(modelIds.has(id), `${id} must be registered in codexProvider`);
  }
  // Luna family — max/xhigh/high/medium/low but NO ultra per reference
  for (const id of [
    "gpt-5.6-luna",
    "gpt-5.6-luna-max",
    "gpt-5.6-luna-xhigh",
    "gpt-5.6-luna-high",
    "gpt-5.6-luna-medium",
    "gpt-5.6-luna-low",
  ]) {
    assert.ok(modelIds.has(id), `${id} must be registered in codexProvider`);
  }
  // Luna must NOT advertise ultra (reference line 139: ultra is gpt-5.6-sol/terra only)
  assert.ok(
    !modelIds.has("gpt-5.6-luna-ultra"),
    "gpt-5.6-luna-ultra is NOT supported per upstream ultra-tier table"
  );
});

test("T0126: every registered gpt-5.6 model carries the GPT_5_6_CODEX_CAPABILITIES payload", () => {
  const ids = Array.from(
    new Set(
      codexProvider.models
        .filter((m) => m.id.startsWith("gpt-5.6-"))
        .map((m) => m.id)
    )
  );
  for (const id of ids) {
    const entry = codexProvider.models.find((m) => m.id === id);
    assert.ok(entry, `${id} should be in the registry`);
    assert.equal(entry?.contextLength, 272000, `${id} contextLength = 272000`);
    assert.equal(
      entry?.maxOutputTokens,
      128000,
      `${id} maxOutputTokens = 128000`
    );
    assert.equal(
      entry?.targetFormat,
      "openai-responses",
      `${id} targetFormat = openai-responses`
    );
    assert.equal(entry?.toolCalling, true, `${id} toolCalling`);
    assert.equal(entry?.supportsReasoning, true, `${id} supportsReasoning`);
    assert.equal(entry?.supportsVision, true, `${id} supportsVision`);
    assert.equal(
      entry?.supportsXHighEffort,
      true,
      `${id} supportsXHighEffort`
    );
  }
});

test("T0126: reasoning-heavy gpt-5.6 tiers get a larger upstream timeout", () => {
  // Reference: timeoutMs: 1200000 on xhigh/high tiers of sol/terra/luna
  const heavyTiers = [
    "gpt-5.6-sol-xhigh",
    "gpt-5.6-sol-high",
    "gpt-5.6-terra-xhigh",
    "gpt-5.6-terra-high",
    "gpt-5.6-luna-xhigh",
    "gpt-5.6-luna-high",
  ];
  for (const id of heavyTiers) {
    const entry = codexProvider.models.find((m) => m.id === id);
    assert.ok(entry, `${id} must be registered`);
    assert.equal(
      entry?.timeoutMs,
      1200000,
      `${id} timeoutMs = 1200000`
    );
  }
  // And lighter tiers should NOT have it (avoids needless slowdown)
  for (const id of [
    "gpt-5.6-sol",
    "gpt-5.6-sol-low",
    "gpt-5.6-sol-medium",
    "gpt-5.6-terra",
    "gpt-5.6-terra-low",
    "gpt-5.6-terra-medium",
    "gpt-5.6-luna",
    "gpt-5.6-luna-low",
    "gpt-5.6-luna-medium",
  ]) {
    const entry = codexProvider.models.find((m) => m.id === id);
    assert.ok(entry, `${id} must be registered`);
    assert.ok(
      entry?.timeoutMs === undefined,
      `${id} must NOT advertise a heavy-tier timeout override`
    );
  }
});

test("T0126: existing gpt-5.4 / gpt-5.5 / gpt-5.3 entries are preserved", () => {
  const ids = new Set(codexProvider.models.map((m) => m.id));
  for (const id of [
    "gpt-5.5",
    "gpt-5.5-xhigh",
    "gpt-5.5-high",
    "gpt-5.5-medium",
    "gpt-5.5-low",
    "gpt-5.4",
    "gpt-5.4-xhigh",
    "gpt-5.4-high",
    "gpt-5.4-medium",
    "gpt-5.4-low",
    "gpt-5.4-mini",
    "gpt-5.3-codex-spark",
    "gpt-5.3-codex",
  ]) {
    assert.ok(ids.has(id), `legacy Codex entry ${id} must remain registered`);
  }
});

// ─── (4) Effort alias parsing ─────────────────────────────────────────────
test("T0126: getCodexUpstreamModel strips gpt-5.6 max/ultra aliases correctly", () => {
  // References lines 124, 190-200: alias-aware suffix parsing
  assert.equal(codexExec.getCodexUpstreamModel("gpt-5.6-sol-ultra"), "gpt-5.6-sol");
  assert.equal(codexExec.getCodexUpstreamModel("gpt-5.6-sol-max"), "gpt-5.6-sol");
  assert.equal(codexExec.getCodexUpstreamModel("gpt-5.6-terra-ultra"), "gpt-5.6-terra");
  assert.equal(codexExec.getCodexUpstreamModel("gpt-5.6-terra-max"), "gpt-5.6-terra");
  assert.equal(codexExec.getCodexUpstreamModel("gpt-5.6-luna-max"), "gpt-5.6-luna");
});

test("T0126: gpt-5.6-luna-ultra is rejected (no upstream tier for luna)", () => {
  // Reference: GPT_5_6_ULTRA_ALIAS_MODELS = {sol, terra}; luna is intentionally absent
  const result = codexExec.getCodexUpstreamModel("gpt-5.6-luna-ultra");
  assert.notEqual(
    result,
    "gpt-5.6-luna",
    "luna-ultra must not collapse to luna — it must fall through to the unsupported suffix"
  );
});

test("T0126: existing gpt-5.4 / gpt-5.5 effort suffix parsing is unchanged", () => {
  // Preserves backward compatibility from codex-effort-alias-priority.test.ts
  assert.equal(codexExec.getCodexUpstreamModel("gpt-5.5-xhigh"), "gpt-5.5");
  assert.equal(codexExec.getCodexUpstreamModel("gpt-5.5-medium"), "gpt-5.5");
  assert.equal(codexExec.getCodexUpstreamModel("gpt-5.4-high"), "gpt-5.4");
  assert.equal(codexExec.getCodexUpstreamModel("gpt-5.5"), "gpt-5.5");
});

// ─── (5) Wire effort mapping (ultra → max on the wire) ────────────────────
test("T0126: transformRequest sends reasoning.effort=max when user requests gpt-5.6-sol-ultra", () => {
  const executor = new codexExec.CodexExecutor();
  const body = {
    model: "gpt-5.6-sol-ultra",
    input: [{ type: "message", role: "user", content: [{ type: "input_text", text: "hi" }] }],
    stream: true,
  };
  const credentials = { providerSpecificData: { workspaceId: "ws-1" } };
  const transformed = executor.transformRequest(
    "gpt-5.6-sol-ultra",
    body,
    true,
    credentials as unknown as Parameters<typeof executor.transformRequest>[3]
  ) as Record<string, unknown>;
  // Wire model name strips the alias
  assert.equal(transformed.model, "gpt-5.6-sol");
  // Wire effort is `max` (not `ultra`) — reference executor.ts:1433
  const reasoning = transformed.reasoning as Record<string, unknown> | undefined;
  assert.ok(reasoning?.effort, "transformRequest must populate reasoning.effort");
  assert.equal(
    reasoning?.effort,
    "max",
    "Codex upstream wire only accepts `max` for ultra-coordinating delegation; ultra is the client-side tier label only"
  );
});

test("T0126: transformRequest preserves reasoning.effort=medium for gpt-5.5-medium (backward compat)", () => {
  const executor = new codexExec.CodexExecutor();
  const body = {
    model: "gpt-5.5-medium",
    input: [{ type: "message", role: "user", content: [{ type: "input_text", text: "hi" }] }],
    stream: true,
  };
  const credentials = { providerSpecificData: { workspaceId: "ws-1" } };
  const transformed = executor.transformRequest(
    "gpt-5.5-medium",
    body,
    true,
    credentials as unknown as Parameters<typeof executor.transformRequest>[3]
  ) as Record<string, unknown>;
  const reasoning = transformed.reasoning as Record<string, unknown> | undefined;
  assert.equal(reasoning?.effort, "medium");
});

// ─── (6) Sanitized error behavior ─────────────────────────────────────────
test("T0126: encodeResponseSseEvent redacts response.failed payloads into sanitized structure", () => {
  // Hard rule: error responses must use a sanitized body (no raw stack/message leakage)
  const upstreamRaw = JSON.stringify({
    type: "response.failed",
    response: {
      id: "resp_test_1",
      error: {
        code: "newer_version_required",
        message:
          "client version 0.142.0 is no longer accepted; please upgrade to >= 0.144.1",
      },
    },
  });
  const out = codexExec.encodeResponseSseEvent(upstreamRaw);
  assert.ok(out.sse.length > 0, "must emit a non-empty SSE block");
  const parsed = JSON.parse(
    out.sse.split("\n").find((line) => line.startsWith("data: "))?.slice(6) ?? "{}"
  ) as { type?: string; response?: { status?: string; error?: { code?: string } } };
  assert.equal(parsed.response?.status, "failed");
  assert.equal(parsed.response?.error?.code, "newer_version_required");
  assert.ok(
    !out.sse.includes("at /"),
    "response.failed payload must not surface a stack trace (Hard Rule #12)"
  );
});

// ─── (7) Source-of-truth regression checks ────────────────────────────────
test("T0126: shared.ts not edited outside the documented Codex capability surface", () => {
  // Verifies the bug class where refactors regress unrelated shared exports.
  const sharedPath = path.resolve(
    __dirname,
    "../../open-sse/config/providers/shared.ts"
  );
  const src = fs.readFileSync(sharedPath, "utf8");
  assert.ok(
    src.includes("GPT_5_6_CODEX_CAPABILITIES"),
    "shared.ts must export GPT_5_6_CODEX_CAPABILITIES"
  );
  assert.ok(
    src.includes("GPT_5_5_CODEX_CAPABILITIES"),
    "shared.ts must still export GPT_5_5_CODEX_CAPABILITIES"
  );
  assert.ok(
    src.includes("GPT_5_4_CODEX_CAPABILITIES"),
    "shared.ts must still export GPT_5_4_CODEX_CAPABILITIES"
  );
});

test("T0126: codexClient.ts DEFAULT_CODEX_CLIENT_VERSION string is exactly 0.144.1", () => {
  const clientPath = path.resolve(__dirname, "../../open-sse/config/codexClient.ts");
  const src = fs.readFileSync(clientPath, "utf8");
  const match = src.match(/DEFAULT_CODEX_CLIENT_VERSION\s*=\s*"([^"]+)"/);
  assert.ok(match, "DEFAULT_CODEX_CLIENT_VERSION must be defined");
  assert.equal(match![1], "0.144.1");
});

test("T0126: codexProvider registry contains every documented gpt-5.6 model id (grouped)", () => {
  const grouped = groupByBaseId(codexProvider.models);
  for (const base of ["gpt-5.6-sol", "gpt-5.6-terra", "gpt-5.6-luna"]) {
    const variants = grouped.get(base) ?? [];
    assert.ok(variants.includes(base), `${base} bare must be registered`);
    assert.ok(
      variants.some((id) => id.endsWith("-xhigh")),
      `${base} must have an xhigh variant`
    );
    assert.ok(
      variants.some((id) => id.endsWith("-low")),
      `${base} must have a low variant`
    );
    assert.ok(
      variants.some((id) => id.endsWith("-max")),
      `${base} must have a max variant`
    );
  }
});
