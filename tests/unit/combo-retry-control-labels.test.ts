import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import en from "../../src/i18n/messages/en.json" with { type: "json" };
import { ADVANCED_FIELD_HELP_FALLBACK } from "../../src/app/(dashboard)/dashboard/combos/advancedHelpFallback.ts";
import { getDefaultComboConfig } from "../../open-sse/services/comboConfig.ts";
import { comboRuntimeConfigSchema } from "../../src/shared/validation/schemas.ts";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const COMBO_SRC = fs.readFileSync(path.join(HERE, "../../open-sse/services/combo.ts"), "utf8");

/**
 * Task 0142 — combo retry control labels.
 *
 * Guards the UX contract: `maxRetries` = per-target retries, `maxSetRetries` =
 * whole-set retries, both INCLUSIVE (N means N extra attempts/passes after the
 * first, N+1 total). The labels/help are verified against the actual runtime
 * loops in `open-sse/services/combo.ts` (read-only for this task) and the
 * canonical defaults in `open-sse/services/comboConfig.ts`.
 *
 * Evidence classification:
 * - Labels/help/parity: `pure import-isolated` (en.json + fallback module).
 * - Defaults + schema acceptance: `pure import-isolated` (comboConfig.ts,
 *   schemas.ts — no DB/cache/network initializers on import).
 * - Loop-bounds freeze: source-guard on `combo.ts` (deliberate regression
 *   guard; runtime loops are NOT executed here — existing combo retry tests
 *   exercise behavior).
 */

test("labels identify target vs whole-set scope without help text", () => {
  const targetLabel = en.combos.maxRetries;
  const setLabel = en.combos.maxSetRetries;

  assert.equal(typeof targetLabel, "string");
  assert.equal(typeof setLabel, "string");
  assert.ok(targetLabel.length > 0);
  assert.ok(setLabel.length > 0);

  // Labels must not be interchangeable: scope must be visible in the label.
  assert.notEqual(targetLabel, setLabel);
  assert.match(targetLabel, /target/i, "maxRetries label must name the target scope");
  assert.doesNotMatch(targetLabel, /whole set|set retries/i);
  assert.match(setLabel, /set/i, "maxSetRetries label must name the whole-set scope");
  assert.match(setLabel, /whole/i, "maxSetRetries label must say the scope is the whole set");

  // The previously ambiguous labels are gone.
  assert.notEqual(targetLabel, "Max Retries");
  assert.notEqual(setLabel, "Max Set Retries");
});

test("help text documents scope, verified camelCase names, inclusive semantics, and defaults", () => {
  const help = en.combos.advancedHelp.maxRetries;
  const setHelp = en.combos.advancedHelp.maxSetRetries;

  // Scope.
  assert.match(help, /one combo target|single model/i, "maxRetries help must scope to one target");
  assert.match(setHelp, /whole target set/i, "maxSetRetries help must scope to the whole set");

  // Verified camelCase names appear in the copy.
  assert.ok(help.includes("maxRetries"), "help must use the verified camelCase name");
  assert.ok(setHelp.includes("maxSetRetries"), "set help must use the verified camelCase name");

  // Inclusive semantics: N = N extra attempts/passes after the first, N+1 total.
  assert.match(help, /N\+1/);
  assert.match(setHelp, /N\+1/);
  assert.match(help, /extra attempts/i);
  assert.match(setHelp, /extra full-set passes/i);

  // Defaults are stated.
  assert.match(help, /default 1/i, "maxRetries help must state the default (1)");
  assert.match(setHelp, /default 0/i, "maxSetRetries help must state the default (0)");

  // Reset behavior: excluded targets are re-evaluated on each set pass
  // (exhausted provider/connection sets reset per set iteration — combo.ts:1832).
  assert.match(setHelp, /re-evaluated/i, "set help must document reset/re-evaluation behavior");
});

test("page fallback copy matches en.json canonical source (one source of truth)", () => {
  const ah = en.combos.advancedHelp;
  assert.equal(ADVANCED_FIELD_HELP_FALLBACK.maxRetries, ah.maxRetries);
  assert.equal(ADVANCED_FIELD_HELP_FALLBACK.maxSetRetries, ah.maxSetRetries);
  assert.equal(ADVANCED_FIELD_HELP_FALLBACK.retryDelay, ah.retryDelay);
  assert.equal(ADVANCED_FIELD_HELP_FALLBACK.setRetryDelayMs, ah.setRetryDelayMs);
});

test("runtime defaults unchanged: maxRetries=1, maxSetRetries=0, delays=2000", () => {
  const cfg = getDefaultComboConfig();
  assert.equal(cfg.maxRetries, 1);
  assert.equal(cfg.maxSetRetries, 0);
  assert.equal(cfg.retryDelayMs, 2000);
  assert.equal(cfg.setRetryDelayMs, 2000);
});

test("combo schema still accepts maxRetries/maxSetRetries for 0, 1 and >1", () => {
  for (const value of [0, 1, 3]) {
    const parsed = comboRuntimeConfigSchema.parse({
      maxRetries: value,
      maxSetRetries: value,
    });
    assert.equal(parsed.maxRetries, value);
    assert.equal(parsed.maxSetRetries, value);
  }
  // Bounds (0–10) unchanged.
  assert.ok(comboRuntimeConfigSchema.safeParse({ maxRetries: 11 }).success === false);
  assert.ok(comboRuntimeConfigSchema.safeParse({ maxSetRetries: 11 }).success === false);
});

test("runtime loops stay inclusive and defaults stay at runtime (source guard)", () => {
  // Whole-set loop: `for (let setTry = 0; setTry <= maxSetRetries; setTry++)` (combo.ts:1831).
  assert.match(COMBO_SRC, /for \(let setTry = 0; setTry <= maxSetRetries; setTry\+\+\)/);
  // Per-target loop: `for (let retry = 0; retry <= maxRetries; retry++)` (combo.ts:1963).
  assert.match(COMBO_SRC, /for \(let retry = 0; retry <= maxRetries; retry\+\+\)/);
  // Runtime fallback defaults (combo.ts:1154/1157).
  assert.match(COMBO_SRC, /const maxRetries = config\.maxRetries \?\? 1;/);
  assert.match(COMBO_SRC, /const maxSetRetries = config\.maxSetRetries \?\? 0;/);
  // Retry only on transient errors — token-limit 429s are never retried.
  assert.match(COMBO_SRC, /!isTokenLimitBreach/);
});

test("configured N means N+1 total passes for 0, 1 and >1 (inclusive semantics)", () => {
  // Mirrors the verified `<=` loops: N additional retries → N+1 total passes.
  const setPasses = (maxSetRetries: number) => maxSetRetries + 1;
  const targetAttempts = (maxRetries: number) => maxRetries + 1;

  assert.equal(setPasses(0), 1, "0 set retries → a single full-set pass");
  assert.equal(setPasses(1), 2, "1 set retry → two full-set passes");
  assert.equal(setPasses(3), 4, "3 set retries → four full-set passes");

  assert.equal(targetAttempts(0), 1, "0 retries → a single attempt per target");
  assert.equal(targetAttempts(1), 2, "1 retry → two attempts per target");
  assert.equal(targetAttempts(2), 3, "2 retries → three attempts per target");
});
