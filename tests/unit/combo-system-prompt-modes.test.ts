import test from "node:test";
import assert from "node:assert/strict";

import {
  applyComboAgentMiddleware,
  applySystemMessageMode,
  applySystemMessageOverride,
} from "../../open-sse/services/comboAgentMiddleware.ts";
import { getComboFromData, toComboLike } from "../../open-sse/services/combo/comboStructure.ts";
import type { ComboLike } from "../../open-sse/services/combo/types.ts";
import { injectSystemPrompt, setSystemPromptConfig } from "../../open-sse/services/systemPrompt.ts";
import { createComboSchema, updateComboSchema } from "../../src/shared/validation/schemas/combo.ts";

test("applySystemMessageMode defaults to override for legacy/missing mode", () => {
  const messages = [
    { role: "system", content: "Original system message" },
    { role: "user", content: "Hello world" },
  ];

  // Missing mode
  const res1 = applySystemMessageMode(messages, "Combo prompt");
  assert.deepEqual(res1, [
    { role: "system", content: "Combo prompt" },
    { role: "user", content: "Hello world" },
  ]);

  // Explicit override
  const res2 = applySystemMessageMode(messages, "Combo prompt", "override");
  assert.deepEqual(res2, [
    { role: "system", content: "Combo prompt" },
    { role: "user", content: "Hello world" },
  ]);

  // Invalid mode falls back to override
  const res3 = applySystemMessageMode(messages, "Combo prompt", "invalid_mode");
  assert.deepEqual(res3, [
    { role: "system", content: "Combo prompt" },
    { role: "user", content: "Hello world" },
  ]);
});

test("applySystemMessageMode handles prefix mode correctly", () => {
  const messagesWithSys = [
    { role: "system", content: "Original system message" },
    { role: "user", content: "Hello world" },
  ];

  const res1 = applySystemMessageMode(messagesWithSys, "Combo prefix", "prefix");
  assert.deepEqual(res1, [
    { role: "system", content: "Combo prefix" },
    { role: "system", content: "Original system message" },
    { role: "user", content: "Hello world" },
  ]);

  // No system message in request
  const messagesNoSys = [{ role: "user", content: "Hello world" }];
  const res2 = applySystemMessageMode(messagesNoSys, "Combo prefix", "prefix");
  assert.deepEqual(res2, [
    { role: "system", content: "Combo prefix" },
    { role: "user", content: "Hello world" },
  ]);
});

test("applySystemMessageMode handles suffix mode correctly", () => {
  const messagesWithSys = [
    { role: "system", content: "First sys" },
    { role: "system", content: "Second sys" },
    { role: "user", content: "Hello world" },
  ];

  const res1 = applySystemMessageMode(messagesWithSys, "Combo suffix", "suffix");
  assert.deepEqual(res1, [
    { role: "system", content: "First sys" },
    { role: "system", content: "Second sys" },
    { role: "system", content: "Combo suffix" },
    { role: "user", content: "Hello world" },
  ]);

  // No system message in request
  const messagesNoSys = [{ role: "user", content: "Hello world" }];
  const res2 = applySystemMessageMode(messagesNoSys, "Combo suffix", "suffix");
  assert.deepEqual(res2, [
    { role: "system", content: "Combo suffix" },
    { role: "user", content: "Hello world" },
  ]);
});

test("applySystemMessageMode is a no-op for empty or whitespace combo text", () => {
  const messages = [
    { role: "system", content: "Original sys" },
    { role: "user", content: "Hello" },
  ];

  assert.deepEqual(applySystemMessageMode(messages, ""), messages);
  assert.deepEqual(applySystemMessageMode(messages, "   \n\t  "), messages);
  assert.deepEqual(applySystemMessageMode(messages, "", "prefix"), messages);
  assert.deepEqual(applySystemMessageMode(messages, "", "suffix"), messages);
});

test("applySystemMessageMode preserves user and assistant messages without removing or reordering", () => {
  const messages = [
    { role: "system", content: "Sys 1" },
    { role: "user", content: "User 1" },
    { role: "assistant", content: "Bot 1" },
    { role: "system", content: "Sys 2" },
    { role: "user", content: "User 2" },
  ];

  const prefixRes = applySystemMessageMode(messages, "P", "prefix");
  assert.equal(prefixRes[0].content, "P");
  assert.equal(prefixRes[1].content, "Sys 1");
  assert.equal(prefixRes[2].content, "User 1");
  assert.equal(prefixRes[3].content, "Bot 1");
  assert.equal(prefixRes[4].content, "Sys 2");
  assert.equal(prefixRes[5].content, "User 2");

  const suffixRes = applySystemMessageMode(messages, "S", "suffix");
  assert.equal(suffixRes[0].content, "Sys 1");
  assert.equal(suffixRes[1].content, "User 1");
  assert.equal(suffixRes[2].content, "Bot 1");
  assert.equal(suffixRes[3].content, "Sys 2");
  assert.equal(suffixRes[4].content, "S");
  assert.equal(suffixRes[5].content, "User 2");
});

test("applyComboAgentMiddleware integrates system_message_mode", () => {
  const body = {
    messages: [
      { role: "system", content: "Base system message" },
      { role: "user", content: "Hello" },
    ],
  };

  // Prefix combo
  const prefixCombo = {
    system_message: "Combo prefix text",
    system_message_mode: "prefix",
  };
  const { body: prefixBody } = applyComboAgentMiddleware(body, prefixCombo, "");
  assert.deepEqual(prefixBody.messages, [
    { role: "system", content: "Combo prefix text" },
    { role: "system", content: "Base system message" },
    { role: "user", content: "Hello" },
  ]);

  // Suffix combo
  const suffixCombo = {
    system_message: "Combo suffix text",
    system_message_mode: "suffix",
  };
  const { body: suffixBody } = applyComboAgentMiddleware(body, suffixCombo, "");
  assert.deepEqual(suffixBody.messages, [
    { role: "system", content: "Base system message" },
    { role: "system", content: "Combo suffix text" },
    { role: "user", content: "Hello" },
  ]);

  // Override combo (explicit)
  const overrideCombo = {
    system_message: "Combo override text",
    system_message_mode: "override",
  };
  const { body: overrideBody } = applyComboAgentMiddleware(body, overrideCombo, "");
  assert.deepEqual(overrideBody.messages, [
    { role: "system", content: "Combo override text" },
    { role: "user", content: "Hello" },
  ]);
});

test("ordering of global system prompt and combo system prompt is preserved without duplicate global injection", () => {
  setSystemPromptConfig({
    enabled: true,
    prefixPrompt: "GLOBAL_PREFIX",
    suffixPrompt: "GLOBAL_SUFFIX",
  });

  const rawBody = {
    messages: [{ role: "user", content: "User question" }],
  };

  // Global prompt injection first
  const bodyWithGlobal = injectSystemPrompt(rawBody);

  // Apply combo prefix
  const comboPrefix = {
    system_message: "COMBO_PREFIX",
    system_message_mode: "prefix",
  };
  const { body: finalPrefixBody } = applyComboAgentMiddleware(bodyWithGlobal, comboPrefix, "");

  assert.deepEqual(finalPrefixBody.messages, [
    { role: "system", content: "COMBO_PREFIX" },
    { role: "system", content: "GLOBAL_PREFIX\n\nGLOBAL_SUFFIX" },
    { role: "user", content: "User question" },
  ]);

  // Apply combo suffix
  const comboSuffix = {
    system_message: "COMBO_SUFFIX",
    system_message_mode: "suffix",
  };
  const { body: finalSuffixBody } = applyComboAgentMiddleware(bodyWithGlobal, comboSuffix, "");

  assert.deepEqual(finalSuffixBody.messages, [
    { role: "system", content: "GLOBAL_PREFIX\n\nGLOBAL_SUFFIX" },
    { role: "system", content: "COMBO_SUFFIX" },
    { role: "user", content: "User question" },
  ]);

  // Reset global system prompt config
  setSystemPromptConfig({ enabled: false, prefixPrompt: "", suffixPrompt: "" });
});

test("createComboSchema and updateComboSchema validate system_message_mode", () => {
  // createComboSchema defaults to "override"
  const createdDefault = createComboSchema.parse({ name: "test-combo" });
  assert.equal(createdDefault.system_message_mode, "override");

  // createComboSchema accepts valid modes
  const createdPrefix = createComboSchema.parse({
    name: "test-combo",
    system_message: "sys",
    system_message_mode: "prefix",
  });
  assert.equal(createdPrefix.system_message_mode, "prefix");

  // createComboSchema rejects invalid mode
  assert.throws(() => {
    createComboSchema.parse({
      name: "test-combo",
      system_message_mode: "invalid_mode",
    });
  });

  // updateComboSchema accepts valid mode
  const updatedSuffix = updateComboSchema.parse({
    system_message_mode: "suffix",
  });
  assert.equal(updatedSuffix.system_message_mode, "suffix");

  // updateComboSchema rejects invalid mode
  assert.throws(() => {
    updateComboSchema.parse({
      system_message_mode: "invalid_mode",
    });
  });
});

test("toComboLike normalizes ComboInput into ComboLike preserving system_message_mode", () => {
  const rawPrefix = {
    id: "combo-1",
    name: "prefix-combo",
    models: ["openai/gpt-4o"],
    system_message: "Prefix prompt",
    system_message_mode: "prefix",
  };
  const comboLikePrefix: ComboLike = toComboLike(rawPrefix);
  assert.equal(comboLikePrefix.system_message_mode, "prefix");
  assert.equal(comboLikePrefix.system_message, "Prefix prompt");

  const rawSuffix = {
    id: "combo-2",
    name: "suffix-combo",
    models: ["openai/gpt-4o"],
    system_message: "Suffix prompt",
    system_message_mode: "suffix",
  };
  const comboLikeSuffix: ComboLike = toComboLike(rawSuffix);
  assert.equal(comboLikeSuffix.system_message_mode, "suffix");

  const rawLegacy = {
    id: "combo-3",
    name: "legacy-combo",
    models: ["openai/gpt-4o"],
    system_message: "Legacy prompt",
  };
  const comboLikeLegacy: ComboLike = toComboLike(rawLegacy);
  assert.equal(comboLikeLegacy.system_message_mode, null);
});

test("production path: getComboFromData -> toComboLike -> applyComboAgentMiddleware end-to-end propagation", () => {
  const rawCombos = [
    {
      id: "c1",
      name: "smart-prefix-combo",
      models: ["provider/m1"],
      system_message: "COMBO_PREFIX_RULE",
      system_message_mode: "prefix",
    },
    {
      id: "c2",
      name: "smart-suffix-combo",
      models: ["provider/m1"],
      system_message: "COMBO_SUFFIX_RULE",
      system_message_mode: "suffix",
    },
    {
      id: "c3",
      name: "smart-legacy-combo",
      models: ["provider/m1"],
      system_message: "COMBO_LEGACY_RULE",
    },
  ];

  const body = {
    messages: [
      { role: "system", content: "REQUEST_SYS_PROMPT" },
      { role: "user", content: "User query" },
    ],
  };

  // 1. Prefix propagation
  const prefixCombo = getComboFromData("smart-prefix-combo", rawCombos);
  assert.notEqual(prefixCombo, null);
  const { body: prefixResult } = applyComboAgentMiddleware(body, prefixCombo, "provider/m1");
  assert.deepEqual(prefixResult.messages, [
    { role: "system", content: "COMBO_PREFIX_RULE" },
    { role: "system", content: "REQUEST_SYS_PROMPT" },
    { role: "user", content: "User query" },
  ]);

  // 2. Suffix propagation
  const suffixCombo = getComboFromData("smart-suffix-combo", rawCombos);
  assert.notEqual(suffixCombo, null);
  const { body: suffixResult } = applyComboAgentMiddleware(body, suffixCombo, "provider/m1");
  assert.deepEqual(suffixResult.messages, [
    { role: "system", content: "REQUEST_SYS_PROMPT" },
    { role: "system", content: "COMBO_SUFFIX_RULE" },
    { role: "user", content: "User query" },
  ]);

  // 3. Legacy (override default) propagation
  const legacyCombo = getComboFromData("smart-legacy-combo", rawCombos);
  assert.notEqual(legacyCombo, null);
  const { body: legacyResult } = applyComboAgentMiddleware(body, legacyCombo, "provider/m1");
  assert.deepEqual(legacyResult.messages, [
    { role: "system", content: "COMBO_LEGACY_RULE" },
    { role: "user", content: "User query" },
  ]);
});
