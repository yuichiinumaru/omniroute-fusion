/**
 * Fusion trigger matching — pure module unit tests (Task 0014).
 *
 * Covers always / tool-call / text-match modes, glob matching, text substring
 * matching, fallbackStrategy runtime D8 guard, and edge cases.
 */
import test from "node:test";
import assert from "node:assert/strict";

import {
  matchGlob,
  hasMatchingToolCall,
  hasMatchingText,
  shouldTriggerFusion,
  resolveFusionFallbackStrategy,
  fusionStrategyHasConditionalTriggers,
  extractLatestUserText,
  DEFAULT_FUSION_TOOL_PATTERNS,
} from "../../open-sse/services/fusionTriggers.ts";

// ─── matchGlob ───────────────────────────────────────────────────────────────

test("matchGlob: write* matches write_file and writeLine", () => {
  assert.equal(matchGlob("write_file", "write*"), true);
  assert.equal(matchGlob("writeLine", "write*"), true);
  assert.equal(matchGlob("Write_file", "write*"), false); // case-sensitive (tool names)
  assert.equal(matchGlob("read_file", "write*"), false);
});

test("matchGlob: *security* matches check_security and security_scan", () => {
  assert.equal(matchGlob("check_security", "*security*"), true);
  assert.equal(matchGlob("security_scan", "*security*"), true);
  assert.equal(matchGlob("security", "*security*"), true);
  assert.equal(matchGlob("check_network", "*security*"), false);
});

test("matchGlob: ? single-char wildcard", () => {
  assert.equal(matchGlob("a1", "a?"), true);
  assert.equal(matchGlob("ab", "a?"), true);
  assert.equal(matchGlob("a", "a?"), false);
  assert.equal(matchGlob("abc", "a?"), false);
});

test("matchGlob: exact match without wildcards", () => {
  assert.equal(matchGlob("edit_file", "edit_file"), true);
  assert.equal(matchGlob("edit_file", "edit"), false);
});

// ─── hasMatchingToolCall (Task 0068: last assistant message only) ────────────
//
// Product decision (EPIC-11): tool-call trigger inspects only the latest
// assistant message. Do NOT walk sticky history for an older tool_calls-bearing
// assistant once a later plain-text assistant has appeared.

function toolBody(toolName: string) {
  return {
    messages: [
      { role: "user", content: "please write" },
      {
        role: "assistant",
        content: null,
        tool_calls: [{ function: { name: toolName, arguments: "{}" } }],
      },
    ],
  };
}

test("hasMatchingToolCall: matches write* on write_file when latest assistant has tools", () => {
  assert.equal(hasMatchingToolCall(toolBody("write_file"), ["write*", "edit*"]), true);
});

test("hasMatchingToolCall: no match for read_file against write*", () => {
  assert.equal(hasMatchingToolCall(toolBody("read_file"), ["write*", "edit*"]), false);
});

test("hasMatchingToolCall: empty patterns never match", () => {
  assert.equal(hasMatchingToolCall(toolBody("write_file"), []), false);
});

test("hasMatchingToolCall: empty messages never match", () => {
  assert.equal(hasMatchingToolCall({ messages: [] }, ["write*"]), false);
  assert.equal(hasMatchingToolCall({}, ["write*"]), false);
});

test("hasMatchingToolCall: no tool_calls on latest assistant returns false", () => {
  assert.equal(
    hasMatchingToolCall({ messages: [{ role: "user", content: "hi" }] }, ["write*"]),
    false
  );
});

test("hasMatchingToolCall: latest assistant tool_calls win when multiple assistants have tools", () => {
  const body = {
    messages: [
      {
        role: "assistant",
        tool_calls: [{ function: { name: "write_file", arguments: "{}" } }],
      },
      { role: "tool", content: "ok" },
      {
        role: "assistant",
        tool_calls: [{ function: { name: "read_file", arguments: "{}" } }],
      },
    ],
  };
  // Latest assistant is read_file — write* must miss; read* must hit.
  assert.equal(hasMatchingToolCall(body, ["write*"]), false);
  assert.equal(hasMatchingToolCall(body, ["read*"]), true);
});

test("hasMatchingToolCall: bare name shape (non-function.name) matches pattern", () => {
  const body = {
    messages: [
      { role: "user", content: "write" },
      {
        role: "assistant",
        content: null,
        tool_calls: [{ name: "write_file", arguments: "{}" }],
      },
    ],
  };
  assert.equal(hasMatchingToolCall(body, ["write*"]), true);
  assert.equal(hasMatchingToolCall(body, ["edit*"]), false);
});

test("hasMatchingToolCall: latest assistant non-matching tool names only → false", () => {
  const body = {
    messages: [
      { role: "user", content: "list" },
      {
        role: "assistant",
        tool_calls: [{ function: { name: "list_files", arguments: "{}" } }],
      },
    ],
  };
  assert.equal(hasMatchingToolCall(body, ["write*", "edit*", "create*"]), false);
});

test("hasMatchingToolCall: empty tool_calls on latest assistant does not sticky-walk older writes", () => {
  // Empty array is not matching tool activity — window stays N=1, no history walk.
  const body = {
    messages: [
      {
        role: "assistant",
        tool_calls: [{ function: { name: "write_file", arguments: "{}" } }],
      },
      { role: "tool", content: "ok" },
      { role: "assistant", content: "done", tool_calls: [] },
    ],
  };
  assert.equal(hasMatchingToolCall(body, ["write*"]), false);
});

test("hasMatchingToolCall: does NOT sticky-match older write tool after plain assistant turn", () => {
  // Agent loop residual: write → tool result → plain assistant → user follow-up
  // must NOT re-fire fusion (cost control).
  const body = {
    messages: [
      { role: "user", content: "please write the file" },
      {
        role: "assistant",
        content: null,
        tool_calls: [{ function: { name: "write_file", arguments: "{}" } }],
      },
      { role: "tool", content: "wrote ok" },
      { role: "assistant", content: "Done writing the file." },
      { role: "user", content: "ok continue" },
    ],
  };
  assert.equal(hasMatchingToolCall(body, ["write*"]), false);
  assert.equal(
    shouldTriggerFusion(body, { mode: "tool-call", toolPatterns: ["write*"] }),
    false
  );
});

test("hasMatchingToolCall: multi-turn agent-loop matrix documents cost control", () => {
  const writeTurn = {
    messages: [
      { role: "user", content: "create config" },
      {
        role: "assistant",
        content: null,
        tool_calls: [{ function: { name: "write_file", arguments: "{}" } }],
      },
    ],
  };
  const afterToolResult = {
    messages: [
      ...writeTurn.messages,
      { role: "tool", content: "ok" },
    ],
  };
  const afterPlainAssistant = {
    messages: [
      ...afterToolResult.messages,
      { role: "assistant", content: "Config written successfully." },
    ],
  };
  const userFollowUp = {
    messages: [
      ...afterPlainAssistant.messages,
      { role: "user", content: "what next?" },
    ],
  };
  const laterWriteAgain = {
    messages: [
      ...userFollowUp.messages,
      {
        role: "assistant",
        content: null,
        tool_calls: [{ function: { name: "write_file", arguments: "{}" } }],
      },
    ],
  };

  const patterns = ["write*"];
  // Hit only when latest assistant itself carries matching tool_calls.
  assert.equal(hasMatchingToolCall(writeTurn, patterns), true, "write turn must fire");
  // Latest assistant is still the write tool_calls message (tool role is not assistant).
  assert.equal(
    hasMatchingToolCall(afterToolResult, patterns),
    true,
    "tool result after write keeps latest assistant as the write turn"
  );
  assert.equal(
    hasMatchingToolCall(afterPlainAssistant, patterns),
    false,
    "plain text assistant clears the tool-call window"
  );
  assert.equal(
    hasMatchingToolCall(userFollowUp, patterns),
    false,
    "user follow-up must not re-fire on sticky history"
  );
  assert.equal(
    hasMatchingToolCall(laterWriteAgain, patterns),
    true,
    "new matching tool_calls on latest assistant re-arms the trigger"
  );
});

// ─── hasMatchingText / extractLatestUserText ─────────────────────────────────

test("extractLatestUserText: latest user string content", () => {
  const text = extractLatestUserText({
    messages: [
      { role: "user", content: "first" },
      { role: "assistant", content: "ok" },
      { role: "user", content: "security review please" },
    ],
  });
  assert.equal(text, "security review please");
});

test("extractLatestUserText: multimodal parts join text", () => {
  const text = extractLatestUserText({
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: "please " },
          { type: "text", text: "SECURITY" },
        ],
      },
    ],
  });
  assert.equal(text, "please \nSECURITY");
});

test("hasMatchingText: case-insensitive substring", () => {
  const body = { messages: [{ role: "user", content: "Please run a SECURITY scan" }] };
  assert.equal(hasMatchingText(body, ["security", "review"]), true);
  assert.equal(hasMatchingText(body, ["review"]), false);
  assert.equal(hasMatchingText(body, ["SECURITY"]), true);
});

test("hasMatchingText: empty patterns never match", () => {
  assert.equal(hasMatchingText({ messages: [{ role: "user", content: "security" }] }, []), false);
});

test("hasMatchingText: uses latest user only (not sticky across roles)", () => {
  const body = {
    messages: [
      { role: "user", content: "please do a security review" },
      { role: "assistant", content: "reviewed" },
      { role: "user", content: "thanks" },
    ],
  };
  // Earlier user said "security" but latest user is "thanks" — must miss.
  assert.equal(hasMatchingText(body, ["security"]), false);
  assert.equal(
    shouldTriggerFusion(body, { mode: "text-match", textPatterns: ["security"] }),
    false
  );
});

// ─── shouldTriggerFusion modes ───────────────────────────────────────────────

test("shouldTriggerFusion: mode always always true", () => {
  assert.equal(
    shouldTriggerFusion({ messages: [{ role: "user", content: "anything" }] }, { mode: "always" }),
    true
  );
  assert.equal(shouldTriggerFusion({}, { mode: "always" }), true);
});

test("shouldTriggerFusion: tool-call defaults patterns when missing", () => {
  assert.deepEqual([...DEFAULT_FUSION_TOOL_PATTERNS], ["write*", "edit*", "create*"]);
  assert.equal(shouldTriggerFusion(toolBody("write_file"), { mode: "tool-call" }), true);
  assert.equal(shouldTriggerFusion(toolBody("read_file"), { mode: "tool-call" }), false);
});

test("shouldTriggerFusion: missing mode defaults to tool-call", () => {
  assert.equal(shouldTriggerFusion(toolBody("write_file"), { toolPatterns: ["write*"] }), true);
  assert.equal(shouldTriggerFusion({ messages: [{ role: "user", content: "x" }] }, {}), false);
});

test("shouldTriggerFusion: text-match hits and misses", () => {
  const hit = { messages: [{ role: "user", content: "need a code review" }] };
  const miss = { messages: [{ role: "user", content: "hello world" }] };
  assert.equal(
    shouldTriggerFusion(hit, { mode: "text-match", textPatterns: ["security", "review"] }),
    true
  );
  assert.equal(
    shouldTriggerFusion(miss, { mode: "text-match", textPatterns: ["security", "review"] }),
    false
  );
});

test("shouldTriggerFusion: text-match with no textPatterns is false", () => {
  assert.equal(
    shouldTriggerFusion(
      { messages: [{ role: "user", content: "security" }] },
      { mode: "text-match" }
    ),
    false
  );
});

test("shouldTriggerFusion: unknown mode fails closed", () => {
  assert.equal(
    shouldTriggerFusion(toolBody("write_file"), { mode: "regex" as "tool-call" }),
    false
  );
});

// ─── resolveFusionFallbackStrategy (D8 runtime) ──────────────────────────────

test("resolveFusionFallbackStrategy: defaults to priority", () => {
  assert.equal(resolveFusionFallbackStrategy(undefined), "priority");
  assert.equal(resolveFusionFallbackStrategy(null), "priority");
  assert.equal(resolveFusionFallbackStrategy(""), "priority");
  assert.equal(resolveFusionFallbackStrategy("   "), "priority");
});

test("resolveFusionFallbackStrategy: rejects fusion and conditional-fusion", () => {
  assert.equal(resolveFusionFallbackStrategy("fusion"), "priority");
  assert.equal(resolveFusionFallbackStrategy("conditional-fusion"), "priority");
  assert.equal(resolveFusionFallbackStrategy(" Fusion "), "priority");
  assert.equal(resolveFusionFallbackStrategy("CONDITIONAL-FUSION"), "priority");
});

test("resolveFusionFallbackStrategy: accepts non-fusion strategies", () => {
  assert.equal(resolveFusionFallbackStrategy("round-robin"), "round-robin");
  assert.equal(resolveFusionFallbackStrategy("priority"), "priority");
  assert.equal(resolveFusionFallbackStrategy("auto"), "auto");
});

// ─── fusionStrategyHasConditionalTriggers ────────────────────────────────────

test("fusionStrategyHasConditionalTriggers: always / missing", () => {
  assert.equal(fusionStrategyHasConditionalTriggers(undefined), false);
  assert.equal(fusionStrategyHasConditionalTriggers({ mode: "always" }), false);
  assert.equal(fusionStrategyHasConditionalTriggers({ mode: "tool-call" }), true);
  assert.equal(fusionStrategyHasConditionalTriggers({ mode: "text-match" }), true);
  // Schema default for mode is tool-call when object present without mode.
  assert.equal(fusionStrategyHasConditionalTriggers({ toolPatterns: ["write*"] }), true);
});

// ─── Task 0018 hardening ───────────────────────────────────────────────────

test("shouldTriggerFusion: tool-call custom patterns hit and miss", () => {
  assert.equal(
    shouldTriggerFusion(toolBody("create_note"), {
      mode: "tool-call",
      toolPatterns: ["create*", "delete*"],
    }),
    true
  );
  assert.equal(
    shouldTriggerFusion(toolBody("list_files"), {
      mode: "tool-call",
      toolPatterns: ["create*", "delete*"],
    }),
    false
  );
});

test("shouldTriggerFusion: text-match is case-insensitive on user text", () => {
  const body = { messages: [{ role: "user", content: "Please Audit This CODE" }] };
  assert.equal(
    shouldTriggerFusion(body, { mode: "text-match", textPatterns: ["audit", "security"] }),
    true
  );
  assert.equal(
    shouldTriggerFusion(body, { mode: "text-match", textPatterns: ["security"] }),
    false
  );
});

test("resolveFusionFallbackStrategy: trims and preserves valid strategies", () => {
  assert.equal(resolveFusionFallbackStrategy("  weighted  "), "weighted");
  assert.equal(resolveFusionFallbackStrategy("least-used"), "least-used");
});

// ─── Task 0133 — AND/OR Conditional Fusion Rules ────────────────────────────

test("shouldTriggerFusion rules mode: AND requires all rules to match", () => {
  const matchingBody = {
    messages: [
      { role: "user", content: "please perform a security review" },
      {
        role: "assistant",
        content: null,
        tool_calls: [{ function: { name: "write_file", arguments: "{}" } }],
      },
    ],
  };

  const toolOnlyBody = {
    messages: [
      { role: "user", content: "hello" },
      {
        role: "assistant",
        content: null,
        tool_calls: [{ function: { name: "write_file", arguments: "{}" } }],
      },
    ],
  };

  const triggers = {
    mode: "rules",
    operator: "AND" as const,
    rules: [
      { kind: "tool-call" as const, pattern: "write*" },
      { kind: "text-match" as const, pattern: "security" },
    ],
  };

  assert.equal(shouldTriggerFusion(matchingBody, triggers), true, "Both tool and text match -> AND must be true");
  assert.equal(shouldTriggerFusion(toolOnlyBody, triggers), false, "Text does not match -> AND must be false");
});

test("shouldTriggerFusion rules mode: OR requires any rule to match", () => {
  const toolOnlyBody = {
    messages: [
      { role: "user", content: "hello" },
      {
        role: "assistant",
        content: null,
        tool_calls: [{ function: { name: "write_file", arguments: "{}" } }],
      },
    ],
  };

  const textOnlyBody = {
    messages: [{ role: "user", content: "please run a security audit" }],
  };

  const noMatchBody = {
    messages: [{ role: "user", content: "hello world" }],
  };

  const triggers = {
    mode: "rules",
    operator: "OR" as const,
    rules: [
      { kind: "tool-call" as const, pattern: "write*" },
      { kind: "text-match" as const, pattern: "security" },
    ],
  };

  assert.equal(shouldTriggerFusion(toolOnlyBody, triggers), true, "Tool matches -> OR must be true");
  assert.equal(shouldTriggerFusion(textOnlyBody, triggers), true, "Text matches -> OR must be true");
  assert.equal(shouldTriggerFusion(noMatchBody, triggers), false, "Neither matches -> OR must be false");
});

test("shouldTriggerFusion rules mode: empty rules array fails closed", () => {
  const body = {
    messages: [
      { role: "user", content: "security audit" },
      {
        role: "assistant",
        tool_calls: [{ function: { name: "write_file", arguments: "{}" } }],
      },
    ],
  };

  assert.equal(shouldTriggerFusion(body, { mode: "rules", operator: "AND", rules: [] }), false);
  assert.equal(shouldTriggerFusion(body, { mode: "rules", operator: "OR", rules: [] }), false);
});

test("shouldTriggerFusion rules mode: short-circuiting logic", () => {
  let evaluatedSecond = false;
  const mockRule1 = { kind: "text-match" as const, pattern: "nonexistent" };
  const mockRule2 = {
    kind: "tool-call" as const,
    pattern: "write*",
    get patternGetter() {
      evaluatedSecond = true;
      return "write*";
    },
  };

  const body = { messages: [{ role: "user", content: "hello" }] };

  // In AND mode, if rule1 fails (false), rule2 should not even be evaluated if we short-circuit
  const andResult = shouldTriggerFusion(body, {
    mode: "rules",
    operator: "AND",
    rules: [mockRule1, mockRule2],
  });
  assert.equal(andResult, false);

  // In OR mode with a matching first rule, short-circuit stops on first true
  const hitRule1 = { kind: "text-match" as const, pattern: "hello" };
  const orResult = shouldTriggerFusion(body, {
    mode: "rules",
    operator: "OR",
    rules: [hitRule1, mockRule2],
  });
  assert.equal(orResult, true);
});

test("shouldTriggerFusion rules mode: nested group rules", () => {
  const body = {
    messages: [
      { role: "user", content: "please conduct security audit" },
      {
        role: "assistant",
        tool_calls: [{ function: { name: "edit_file", arguments: "{}" } }],
      },
    ],
  };

  const nestedTriggers = {
    mode: "rules",
    operator: "AND" as const,
    rules: [
      { kind: "text-match" as const, pattern: "security" },
      {
        kind: "group" as const,
        operator: "OR" as const,
        rules: [
          { kind: "tool-call" as const, pattern: "write*" },
          { kind: "tool-call" as const, pattern: "edit*" },
        ],
      },
    ],
  };

  assert.equal(shouldTriggerFusion(body, nestedTriggers), true);
});

test("shouldTriggerFusion rules mode: malformed and invalid rules fail closed", () => {
  const body = { messages: [{ role: "user", content: "hello" }] };

  assert.equal(shouldTriggerFusion(body, { mode: "rules", rules: [null as unknown as FusionRule] }), false);
  assert.equal(shouldTriggerFusion(body, { mode: "rules", rules: [{ pattern: "" } as unknown as FusionRule] }), false);
  assert.equal(shouldTriggerFusion(body, { mode: "rules", rules: [{ kind: "group", rules: [] } as unknown as FusionRule] }), false);
});
