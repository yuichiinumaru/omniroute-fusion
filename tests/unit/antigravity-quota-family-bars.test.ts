import test from "node:test";
import assert from "node:assert/strict";

const { getAntigravityUiQuotaFamily, getAntigravityQuotaFamily } = await import(
  "../../open-sse/services/antigravityQuotaFamily.ts"
);
const {
  parseQuotaData,
  groupAntigravityQuotas,
  filterHiddenModelQuotas,
  formatQuotaLabel,
  shouldShowQuotaUsageCount,
  getQuotaRemainingPercentage,
} = await import(
  "../../src/app/(dashboard)/dashboard/usage/components/ProviderLimits/utils.tsx"
);

test("getAntigravityUiQuotaFamily classifies Claude, Gemini 3.x, Gemini legacy, and other", () => {
  assert.equal(getAntigravityUiQuotaFamily("claude-sonnet-4-6"), "claude");
  assert.equal(getAntigravityUiQuotaFamily("claude-opus-4-6-thinking"), "claude");
  assert.equal(getAntigravityUiQuotaFamily("cloud-claude-opus-4"), "claude");
  assert.equal(getAntigravityUiQuotaFamily("gemini-claude-sonnet-4-5"), "claude");

  assert.equal(getAntigravityUiQuotaFamily("gemini-3.5-flash-low"), "gemini_3x");
  assert.equal(getAntigravityUiQuotaFamily("gemini-3.5-flash-medium"), "gemini_3x");
  assert.equal(getAntigravityUiQuotaFamily("gemini-3.5-flash-high"), "gemini_3x");
  assert.equal(getAntigravityUiQuotaFamily("gemini-3.1-pro-high"), "gemini_3x");
  assert.equal(getAntigravityUiQuotaFamily("gemini-3.1-pro-low"), "gemini_3x");
  assert.equal(getAntigravityUiQuotaFamily("gemini-3-pro-preview"), "gemini_3x");
  assert.equal(getAntigravityUiQuotaFamily("gemini-3.1-flash-lite"), "gemini_3x");
  assert.equal(getAntigravityUiQuotaFamily("gemini-pro-agent"), "gemini_3x");

  assert.equal(getAntigravityUiQuotaFamily("gemini-2.5-pro"), "gemini_legacy");
  assert.equal(getAntigravityUiQuotaFamily("gemini-2.5-flash"), "gemini_legacy");
  assert.equal(getAntigravityUiQuotaFamily("gemini-2.5-flash-lite"), "gemini_legacy");
  assert.equal(getAntigravityUiQuotaFamily("gemini-2.5-flash-thinking"), "gemini_legacy");
  assert.equal(getAntigravityUiQuotaFamily("gemini-2.5-computer-use-preview-10-2025"), "gemini_legacy");

  assert.equal(getAntigravityUiQuotaFamily("gpt-oss-120b-medium"), "other");
  assert.equal(getAntigravityUiQuotaFamily("unknown-custom-model"), "other");
});

test("coarse getAntigravityQuotaFamily preserves gemini and claude lockouts for accountFallback", () => {
  assert.equal(getAntigravityQuotaFamily("gemini-3.5-flash-medium"), "gemini");
  assert.equal(getAntigravityQuotaFamily("gemini-2.5-pro"), "gemini");
  assert.equal(getAntigravityQuotaFamily("claude-sonnet-4-6"), "claude");
  assert.equal(getAntigravityQuotaFamily("gpt-oss-120b-medium"), "other");
});

type QuotaRecord = Record<string, unknown>;

test("groupAntigravityQuotas renders at most 3 family bars and keeps credits/unknown explicit", () => {
  const reset1 = new Date(Date.now() + 3600_000).toISOString();
  const reset2 = new Date(Date.now() + 7200_000).toISOString();

  const rawEntries = [
    { name: "gemini-3.5-flash-low", modelKey: "gemini-3.5-flash-low", used: 250, total: 1000, remainingPercentage: 75, resetAt: reset2 },
    { name: "gemini-3.5-flash-high", modelKey: "gemini-3.5-flash-high", used: 600, total: 1000, remainingPercentage: 40, resetAt: reset1 },
    { name: "gemini-2.5-pro", modelKey: "gemini-2.5-pro", used: 100, total: 1000, remainingPercentage: 90, resetAt: null },
    { name: "claude-sonnet-4-6", modelKey: "claude-sonnet-4-6", used: 0, total: 1000, remainingPercentage: 100, resetAt: null },
    { name: "gpt-oss-120b-medium", modelKey: "gpt-oss-120b-medium", used: 200, total: 1000, remainingPercentage: 80, resetAt: null },
    { name: "credits", isCredits: true, remaining: 42, creditCount: 42, resetAt: null },
  ];

  const grouped = groupAntigravityQuotas(rawEntries);

  // Expected 5 entries: Claude, Gemini 3.x, Gemini Legacy, GPT-OSS (other), Credits
  assert.equal(grouped.length, 5);

  const claudeBar = grouped.find((q: QuotaRecord) => q.name === "claude");
  assert.ok(claudeBar);
  assert.equal(claudeBar.displayName, "Claude");
  assert.equal(claudeBar.remainingPercentage, 100);

  const g3xBar = grouped.find((q: QuotaRecord) => q.name === "gemini_3x");
  assert.ok(g3xBar);
  assert.equal(g3xBar.displayName, "Gemini 3.x (Flash/Pro)");
  // Min remaining percentage (40%), not summed!
  assert.equal(g3xBar.remainingPercentage, 40);
  assert.equal(g3xBar.resetAt, reset1);

  const gLegacyBar = grouped.find((q: QuotaRecord) => q.name === "gemini_legacy");
  assert.ok(gLegacyBar);
  assert.equal(gLegacyBar.displayName, "Gemini Legacy (2.x/Lite)");
  assert.equal(gLegacyBar.remainingPercentage, 90);

  const gptOss = grouped.find((q: QuotaRecord) => q.name === "gpt-oss-120b-medium");
  assert.ok(gptOss);
  assert.equal(gptOss.remainingPercentage, 80);

  const credits = grouped.find((q: QuotaRecord) => q.isCredits === true);
  assert.ok(credits);
  assert.equal(credits.remaining, 42);
});

test("parseQuotaData for Antigravity applies family grouping and preserves credit/unknown state", () => {
  const parsed = parseQuotaData("antigravity", {
    quotas: {
      "gemini-3.5-flash-high": { used: 100, total: 1000, remainingPercentage: 90 },
      "gemini-2.5-flash": { used: 200, total: 1000, remainingPercentage: 80 },
      "claude-opus-4-6-thinking": { used: 0, total: 1000, remainingPercentage: 100 },
      credits: { remaining: 15 },
    },
  });

  assert.equal(parsed.length, 4); // Claude, Gemini 3.x, Gemini legacy, credits
  const names = parsed.map((q: QuotaRecord) => q.name);
  assert.ok(names.includes("claude"));
  assert.ok(names.includes("gemini_3x"));
  assert.ok(names.includes("gemini_legacy"));
  assert.ok(names.includes("credits"));
});

test("parseQuotaData for agy applies family grouping identically to Antigravity", () => {
  const parsed = parseQuotaData("agy", {
    quotas: {
      "gemini-3.1-pro-high": { used: 500, total: 1000, remainingPercentage: 50 },
      "claude-sonnet-4-6": { used: 100, total: 1000, remainingPercentage: 90 },
    },
  });

  assert.equal(parsed.length, 2);
  assert.equal(parsed[0].name, "claude");
  assert.equal(parsed[1].name, "gemini_3x");
});

test("filterHiddenModelQuotas supports grouped family bars with modelKeys", () => {
  const grouped = [
    { name: "gemini_3x", isFamilyBar: true, modelKeys: ["gemini-3.5-flash-high", "gemini-3.5-flash-low"] },
    { name: "credits", isCredits: true, remaining: 10 },
  ];

  const hidden = ["antigravity/gemini-3.5-flash-low"];
  const visible = filterHiddenModelQuotas("antigravity", grouped, hidden);

  assert.equal(visible.length, 2);
  assert.deepEqual(visible[0].modelKeys, ["gemini-3.5-flash-high"]);
});

test("family bars interface cleanly with QuotaCardExpanded primitives", () => {
  const parsed = parseQuotaData("antigravity", {
    quotas: {
      "gemini-3.5-flash-high": { used: 300, total: 1000, remainingPercentage: 70, resetTime: "2026-08-06T00:00:00Z", quotaSource: "retrieveUserQuota", fractionReported: true },
      "gemini-3.1-pro-high": { used: 500, total: 1000, remainingPercentage: 50, resetTime: "2026-08-05T12:00:00Z", quotaSource: "retrieveUserQuota", fractionReported: true },
      "gemini-2.5-pro": { used: 100, total: 1000, remainingPercentage: 90, resetTime: "2026-08-07T00:00:00Z", quotaSource: "fetchAvailableModels", fractionReported: true },
      "claude-sonnet-4-6": { used: 0, total: 1000, remainingPercentage: 100, fractionReported: true },
      credits: { remaining: 50 },
    },
  });

  // Family bar 1: Claude
  const claude = parsed.find((q: QuotaRecord) => q.name === "claude");
  assert.ok(claude);
  assert.equal(formatQuotaLabel(claude.name), "Claude");
  assert.equal(getQuotaRemainingPercentage(claude), 100);
  assert.equal(shouldShowQuotaUsageCount(claude), false);

  // Family bar 2: Gemini 3.x
  const g3x = parsed.find((q: QuotaRecord) => q.name === "gemini_3x");
  assert.ok(g3x);
  assert.equal(formatQuotaLabel(g3x.name), "Gemini 3.x (Flash/Pro)");
  assert.equal(getQuotaRemainingPercentage(g3x), 50); // Minimum of 70% and 50%
  assert.equal(shouldShowQuotaUsageCount(g3x), false);
  assert.equal(g3x.quotaSource, "retrieveUserQuota");

  // Family bar 3: Gemini Legacy
  const gLegacy = parsed.find((q: QuotaRecord) => q.name === "gemini_legacy");
  assert.ok(gLegacy);
  assert.equal(formatQuotaLabel(gLegacy.name), "Gemini Legacy (2.x/Lite)");
  assert.equal(getQuotaRemainingPercentage(gLegacy), 90);
  assert.equal(shouldShowQuotaUsageCount(gLegacy), false);

  // Explicit credits row
  const credits = parsed.find((q: QuotaRecord) => q.isCredits === true);
  assert.ok(credits);
  assert.equal(credits.creditCount, 50);

  // Total model family bars = 3
  const familyBars = parsed.filter((q: QuotaRecord) => q.isFamilyBar === true);
  assert.equal(familyBars.length, 3);
});

test("non-Antigravity provider quota data is untouched by family grouping", () => {
  const parsed = parseQuotaData("codex", {
    quotas: {
      session: { used: 10, total: 100, remainingPercentage: 90 },
      weekly: { used: 20, total: 100, remainingPercentage: 80 },
    },
  });

  assert.equal(parsed.length, 2);
  assert.equal(parsed[0].name, "session");
  assert.equal(parsed[1].name, "weekly");
});
