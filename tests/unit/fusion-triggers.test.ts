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

// ─── hasMatchingToolCall ─────────────────────────────────────────────────────

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

test("hasMatchingToolCall: matches write* on write_file", () => {
  assert.equal(hasMatchingToolCall(toolBody("write_file"), ["write*", "edit*"]), true);
});

test("hasMatchingToolCall: no match for read_file against write*", () => {
  assert.equal(hasMatchingToolCall(toolBody("read_file"), ["write*", "edit*"]), false);
});

test("hasMatchingToolCall: empty patterns never match", () => {
  assert.equal(hasMatchingToolCall(toolBody("write_file"), []), false);
});

test("hasMatchingToolCall: no tool_calls returns false", () => {
  assert.equal(
    hasMatchingToolCall({ messages: [{ role: "user", content: "hi" }] }, ["write*"]),
    false
  );
});

test("hasMatchingToolCall: uses last assistant tool_calls when multiple", () => {
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
  // Most recent assistant tool call is read_file — write* should miss.
  assert.equal(hasMatchingToolCall(body, ["write*"]), false);
  assert.equal(hasMatchingToolCall(body, ["read*"]), true);
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
