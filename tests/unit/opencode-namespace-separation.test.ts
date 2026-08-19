/**
 * Regression tests for OpenCode Free vs OpenCode Zen namespace separation.
 *
 * Root cause (fixed): model.ts contained `ALIAS_TO_PROVIDER_ID["opencode"] = "opencode-zen"`,
 * which poisoned the canonical provider resolution:
 *   - `parseModel("oc/north-mini-code-free")` resolved provider to "opencode-zen" instead of "opencode"
 *   - the free model catalog embedded "opencode/" prefixes in modelId for "opencode-zen" provider rows
 *   - logs showed `opencode-zen/oc/north-mini-code-free` (double-prefix)
 *
 * Canonical identity rules:
 *   - OpenCode Free: provider id "opencode", alias "oc", bare model IDs
 *   - OpenCode Zen:  provider id "opencode-zen", alias "opencode-zen", its own model IDs
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";

const { parseModel, resolveProviderAlias, resolveCanonicalProviderModel } = await import(
  "../../open-sse/services/model.ts"
);
const { FREE_MODEL_BUDGETS } = await import(
  "../../open-sse/config/freeModelCatalog.data.ts"
);

// ── parseModel: OpenCode Free via "oc/" alias ────────────────────────

describe("parseModel: OpenCode Free (oc/ alias)", () => {
  it("oc/hy3-free resolves to provider 'opencode', bare model", () => {
    const result = parseModel("oc/hy3-free");
    assert.equal(result.provider, "opencode", "provider must be 'opencode', not 'opencode-zen'");
    assert.equal(result.model, "hy3-free", "model must be bare, no embedded prefix");
  });

  it("oc/big-pickle resolves to provider 'opencode'", () => {
    const result = parseModel("oc/big-pickle");
    assert.equal(result.provider, "opencode");
    assert.equal(result.model, "big-pickle");
  });

  it("oc/deepseek-v4-flash-free resolves to provider 'opencode'", () => {
    const result = parseModel("oc/deepseek-v4-flash-free");
    assert.equal(result.provider, "opencode");
    assert.equal(result.model, "deepseek-v4-flash-free");
  });
});

// ── parseModel: OpenCode Free via "opencode/" prefix ─────────────────

describe("parseModel: OpenCode Free (opencode/ prefix)", () => {
  it("opencode/hy3-free resolves to provider 'opencode', not 'opencode-zen'", () => {
    const result = parseModel("opencode/hy3-free");
    assert.equal(result.provider, "opencode", "opencode/ prefix must resolve to provider 'opencode'");
    assert.equal(result.model, "hy3-free");
  });

  it("opencode/mimo-v2.5-free resolves to provider 'opencode'", () => {
    const result = parseModel("opencode/mimo-v2.5-free");
    assert.equal(result.provider, "opencode");
    assert.equal(result.model, "mimo-v2.5-free");
  });
});

// ── parseModel: OpenCode Zen via explicit "opencode-zen/" prefix ─────

describe("parseModel: OpenCode Zen (explicit opencode-zen/ prefix)", () => {
  it("opencode-zen/gpt-5-nano remains provider 'opencode-zen'", () => {
    const result = parseModel("opencode-zen/gpt-5-nano");
    assert.equal(result.provider, "opencode-zen");
    assert.equal(result.model, "gpt-5-nano");
  });

  it("opencode-zen/claude-sonnet-4 remains provider 'opencode-zen'", () => {
    const result = parseModel("opencode-zen/claude-sonnet-4");
    assert.equal(result.provider, "opencode-zen");
    assert.equal(result.model, "claude-sonnet-4");
  });

  it("opencode-zen/big-pickle stays 'opencode-zen' (Zen also has this model)", () => {
    const result = parseModel("opencode-zen/big-pickle");
    assert.equal(result.provider, "opencode-zen");
    assert.equal(result.model, "big-pickle");
  });
});

// ── resolveProviderAlias: canonical provider identity ────────────────

describe("resolveProviderAlias: OpenCode namespace", () => {
  it("'opencode' resolves to itself (not opencode-zen)", () => {
    assert.equal(resolveProviderAlias("opencode"), "opencode");
  });

  it("'oc' resolves to 'opencode'", () => {
    assert.equal(resolveProviderAlias("oc"), "opencode");
  });

  it("'opencode-zen' resolves to itself", () => {
    assert.equal(resolveProviderAlias("opencode-zen"), "opencode-zen");
  });
});

// ── resolveCanonicalProviderModel ────────────────────────────────────

describe("resolveCanonicalProviderModel: no double-prefix in canonical identity", () => {
  it("('opencode', 'hy3-free') stays opencode + bare model", () => {
    const result = resolveCanonicalProviderModel("opencode", "hy3-free");
    assert.equal(result.provider, "opencode");
    assert.equal(result.model, "hy3-free");
  });

  it("('oc', 'hy3-free') resolves to opencode + bare model", () => {
    const result = resolveCanonicalProviderModel("oc", "hy3-free");
    assert.equal(result.provider, "opencode");
    assert.equal(result.model, "hy3-free");
  });

  it("canonical logging string never produces opencode-zen/oc/", () => {
    const result = resolveCanonicalProviderModel("oc", "hy3-free");
    const logString = `${result.provider}/${result.model}`;
    assert.equal(logString.includes("opencode-zen/oc/"), false, `Canonical log must not produce double-prefix, got: ${logString}`);
    assert.equal(logString.includes("opencode-zen/opencode/"), false, `Canonical log must not produce double-prefix, got: ${logString}`);
  });
});

// ── Free catalog: no embedded provider prefix in modelId ─────────────

describe("freeModelCatalog: OpenCode rows have no embedded provider prefix in modelId", () => {
  const opencodeRows = FREE_MODEL_BUDGETS.filter(
    (entry: { provider: string }) => entry.provider === "opencode"
  );
  const opencodeZenRows = FREE_MODEL_BUDGETS.filter(
    (entry: { provider: string }) => entry.provider === "opencode-zen"
  );

  it("provider:opencode rows have bare (non-slash) model IDs", () => {
    for (const row of opencodeRows) {
      assert.equal(
        (row as { modelId: string }).modelId.includes("/"),
        false,
        `OpenCode Free modelId must be bare, found: ${(row as { modelId: string }).modelId}`
      );
    }
  });

  it("provider:opencode-zen rows keep their provider and bare model IDs", () => {
    for (const row of opencodeZenRows) {
      const modelId = (row as { modelId: string }).modelId;
      assert.equal(row.provider, "opencode-zen");
      assert.equal(
        modelId.includes("/"),
        false,
        `OpenCode Zen modelId must be bare, found: ${modelId}`
      );
      assert.equal(
        modelId.startsWith("oc/"),
        false,
        `OpenCode Zen modelId must not embed 'oc/' prefix, found: ${modelId}`
      );
      assert.equal(
        modelId.startsWith("opencode/"),
        false,
        `OpenCode Zen modelId must not embed 'opencode/' prefix, found: ${modelId}`
      );
    }
  });

  it("keeps Free and Zen catalog rows in distinct provider namespaces", () => {
    assert.ok(opencodeRows.length > 0, "Free catalog rows must exist");
    assert.ok(opencodeZenRows.length > 0, "Zen catalog rows must exist");
    assert.ok(
      opencodeRows.every((entry: { provider: string }) => entry.provider === "opencode"),
      "Free rows must remain provider:opencode"
    );
    assert.ok(
      opencodeZenRows.every((entry: { provider: string }) => entry.provider === "opencode-zen"),
      "Zen rows must remain provider:opencode-zen"
    );
  });

  it("excludes delisted north-mini-code-free from both Free and Zen catalogs", () => {
    const northFreeEntry = opencodeRows.find(
      (entry: { modelId: string }) => entry.modelId === "north-mini-code-free"
    );
    assert.equal(northFreeEntry, undefined, "north-mini-code-free must be absent from OpenCode Free catalog");

    const northZenEntry = opencodeZenRows.find(
      (entry: { modelId: string }) => entry.modelId === "north-mini-code-free"
    );
    assert.equal(northZenEntry, undefined, "north-mini-code-free must be absent from OpenCode Zen catalog");
  });
});
