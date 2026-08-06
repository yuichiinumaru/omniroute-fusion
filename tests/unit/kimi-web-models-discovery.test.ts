import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  resolveKimiModelId,
  KIMI_WEB_MODELS,
} from "../../open-sse/config/providers/registry/kimi/web/runtime.ts";

describe("resolveKimiModelId", () => {
  it("resolves 'k3' to k3 model config with supportsReasoning: true", () => {
    const config = resolveKimiModelId("k3");
    assert.equal(config.id, "k3");
    assert.equal(config.name, "Kimi k3");
    assert.equal(config.supportsReasoning, true);
    assert.ok(config.maxTokens && config.maxTokens > 0, "maxTokens should be positive");
  });

  it("resolves 'k2d6' to k2d6 model config with supportsReasoning: true", () => {
    const config = resolveKimiModelId("k2d6");
    assert.equal(config.id, "k2d6");
    assert.equal(config.name, "Kimi k2d6");
    assert.equal(config.supportsReasoning, true);
  });

  it("resolves 'K2D6' (case-insensitive) to k2d6 model", () => {
    const config = resolveKimiModelId("K2D6");
    assert.equal(config.id, "k2d6");
  });

  it("resolves 'kimi-k2d6' (with prefix) to k2d6 model", () => {
    const config = resolveKimiModelId("kimi-k2d6");
    assert.equal(config.id, "k2d6");
  });

  it("defaults to k3 for unknown model names", () => {
    const config = resolveKimiModelId("unknown-model");
    assert.equal(config.id, "k3", "Unknown models should default to k3");
  });

  it("defaults to k3 for empty string", () => {
    const config = resolveKimiModelId("");
    assert.equal(config.id, "k3");
  });
});

describe("KIMI_WEB_MODELS catalog", () => {
  it("has exactly 2 model entries (k3 and k2d6)", () => {
    const keys = Object.keys(KIMI_WEB_MODELS);
    assert.equal(keys.length, 2);
    assert.ok(keys.includes("k3"), "Should include k3");
    assert.ok(keys.includes("k2d6"), "Should include k2d6");
  });

  it("all models have required fields", () => {
    for (const [key, model] of Object.entries(KIMI_WEB_MODELS)) {
      assert.ok(model.id, `${key} should have id`);
      assert.ok(model.name, `${key} should have name`);
      assert.equal(typeof model.supportsReasoning, "boolean", `${key} should have boolean supportsReasoning`);
      assert.ok(
        typeof model.maxTokens === "number" && model.maxTokens > 0,
        `${key} should have positive maxTokens`
      );
    }
  });
});
