/**
 * Unit tests for LMArena model resolution and catalog (models.ts)
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  resolveLMArenaModelId,
  pickLMArenaModelId,
  normalizeLMArenaModelsForCatalog,
} from "../../open-sse/executors/lmarena/models.ts";

describe("lmarena-models.ts", () => {
  it("resolveLMArenaModelId resolves human-readable model name to Arena UUID", async () => {
    // "claude-sonnet-5" should resolve to a valid UUID from directModels catalog
    const uuid = await resolveLMArenaModelId("claude-sonnet-5");
    assert.match(uuid, /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    assert.equal(uuid, "019f19f2-41f1-7c6d-9891-48d02fd9952c");
  });

  it("returns raw UUID if already a UUID", async () => {
    const rawUuid = "019f19f2-41f1-7c6d-9891-48d02fd9952c";
    const resolved = await resolveLMArenaModelId(rawUuid);
    assert.equal(resolved, rawUuid);
  });

  it("normalizes catalog entries for chat models", () => {
    const rawModels = [
      {
        id: "019f19f2-41f1-7c6d-9891-48d02fd9952c",
        publicName: "claude-sonnet-5",
        displayName: "Claude Sonnet 5",
        userSelectable: true,
        rankByModality: { chat: 1 },
        capabilities: {
          inputCapabilities: { text: true },
          outputCapabilities: { text: true },
        },
      },
    ];

    const normalized = normalizeLMArenaModelsForCatalog(rawModels);
    assert.equal(normalized.length, 1);
    assert.equal(normalized[0].id, "claude-sonnet-5");
    assert.equal(normalized[0].name, "Claude Sonnet 5");
  });
});
