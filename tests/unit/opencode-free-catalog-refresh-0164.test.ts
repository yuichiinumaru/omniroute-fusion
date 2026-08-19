/**
 * Task 0164 — OpenCode Free model catalog refresh contract tests.
 *
 * The active parent set below is copied only from the complete output of
 * `opencode models --refresh` captured in Task 0164 Completion Evidence.
 * These tests intentionally do not inspect or mutate the opencode-zen registry.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";

const { opencodeProvider } = await import(
  "../../open-sse/config/providers/registry/opencode/index.ts"
);
const { opencode_zenProvider } = await import(
  "../../open-sse/config/providers/registry/opencode/zen/index.ts"
);
const { FREE_MODEL_BUDGETS } = await import(
  "../../open-sse/config/freeModelCatalog.data.ts"
);

const CURRENT_OPENCODE_IDS = [
  "big-pickle",
  "deepseek-v4-flash-free",
  "hy3-free",
  "laguna-s-2.1-free",
  "mimo-v2.5-free",
  "nemotron-3-ultra-free",
  "nemotron-3.5-lightning-free",
] as const;

const CURRENT_FREE_IDS = CURRENT_OPENCODE_IDS.filter((id) => id.endsWith("-free"));

const HISTORICAL_STALE_IDS = [
  "minimax-m3-free",
  "minimax-m2.5-free",
  "ling-2.6-1t-free",
  "trinity-large-preview-free",
  "nemotron-3-super-free",
  "qwen3.6-plus-free",
] as const;

function registryModelIds(entry: typeof opencodeProvider): string[] {
  return (entry.models ?? []).map((model: { id: string }) => model.id);
}

function catalogEntriesForProvider(provider: string) {
  return FREE_MODEL_BUDGETS.filter((entry: { provider: string }) => entry.provider === provider);
}

function catalogModelIds(provider: string): string[] {
  return catalogEntriesForProvider(provider).map((entry: { modelId: string }) => entry.modelId);
}

describe("Task 0164: parent registry matches refreshed opencode output", () => {
  const parentIds = registryModelIds(opencodeProvider);

  it("contains exactly the verified current OpenCode provider IDs", () => {
    assert.deepEqual(parentIds, CURRENT_OPENCODE_IDS);
  });

  for (const id of CURRENT_OPENCODE_IDS) {
    it(`contains verified current entry: ${id}`, () => {
      assert.ok(parentIds.includes(id));
    });
  }
});

describe("Task 0164: parent/catalog stale-ID negatives", () => {
  const parentIds = registryModelIds(opencodeProvider);
  const parentCatalogIds = catalogModelIds("opencode");

  for (const id of HISTORICAL_STALE_IDS) {
    it(`parent registry excludes historical stale ID: ${id}`, () => {
      assert.equal(parentIds.includes(id), false);
    });

    it(`provider:opencode catalog excludes historical stale ID: ${id}`, () => {
      assert.equal(parentCatalogIds.includes(id), false);
    });
  }
});

describe("Task 0164: parent registry/free catalog parity", () => {
  const parentFreeIds = registryModelIds(opencodeProvider).filter((id) =>
    id.endsWith("-free")
  );
  const catalogIds = catalogModelIds("opencode");

  it("contains exactly the refreshed free IDs in provider:opencode catalog", () => {
    assert.deepEqual(catalogIds, [...CURRENT_OPENCODE_IDS]);
  });

  it("has every refreshed free registry ID represented in provider:opencode catalog", () => {
    assert.deepEqual(parentFreeIds, CURRENT_FREE_IDS);
    assert.deepEqual(
      catalogIds.filter((id) => id.endsWith("-free")),
      CURRENT_FREE_IDS
    );
  });
});

describe("Task 0164: opencode-zen isolation regression guard", () => {
  const zenIds = registryModelIds(opencode_zenProvider);

  it("does not share the parent registry model array", () => {
    assert.notEqual(opencode_zenProvider.models, opencodeProvider.models);
  });

  it("retains its independently maintained model set", () => {
    assert.ok(zenIds.length > 10);
    assert.ok(zenIds.includes("big-pickle"));
    assert.ok(zenIds.includes("deepseek-v4-flash-free"));
    assert.ok(zenIds.includes("gpt-5-nano"));
    assert.ok(zenIds.includes("claude-sonnet-4"));
  });

  it("is not pruned or replaced by the parent refresh", () => {
    assert.ok(zenIds.includes("hy3-free"));
    assert.ok(zenIds.includes("nemotron-3-ultra-free"));
    assert.ok(zenIds.includes("mimo-v2.5-free"));
    assert.ok(zenIds.includes("nemotron-3.5-lightning-free"));
  });
});
