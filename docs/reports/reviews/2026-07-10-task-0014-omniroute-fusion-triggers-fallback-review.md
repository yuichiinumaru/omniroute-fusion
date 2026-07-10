# Review Report: Task 0014 — Fusion Triggers and Fallback Strategy Runtime — 2026-07-10

## Review Lineage

- **Current task**: Task 0014 (`omniroute-fusion-triggers-fallback`); live path was `docs/tasks/03-review/0014-omniroute-fusion-triggers-fallback.md` (moved to `02-doing/` on REJECT)
- **Previous reports read**: none found (`docs/reports/**/*0014*` empty at review start)
- **Related reports considered**:
  - Task 0018 review (same wave) — test hardening depends on 0014; pure-module coverage is strong, but production immutability gap is not covered
- **Review mode**: `initial`
- **Reviewer profile**: `reviewers` (lane: `gt-ts-code-reviewer`, omniroute fusion awareness)
- **Parent agentID**: `reviewers`

## Score And Verdict

- **Score**: `84/100`
- **Verdict**: `REJECTED_TO_DOING`
- **Lane recommendation**: `return-to-doing`
- **Score routing applied**: S < 90 → REJECT → report + ledger + move to `docs/tasks/02-doing/`

## Delta Summary

### Resolved Since Previous Review
- N/A (initial review)

### Persistent Findings
- none (first review)

### Regressions
- none

### New Findings
- `NEW` F1: In-place `combo.strategy` mutation on trigger miss can poison shared cached combo objects (Axiom 4 Immutability / spooky action at a distance).
- `NEW` F2: No wire-level `handleComboChat` test that forbidden `fallbackStrategy: "fusion"` is rewritten at runtime (D8 only proven on pure helper).
- `NEW` F3: Multiple `as` casts in `fusionTriggers.ts` / fusion gate lack `// SAFETY:` justifications.
- `NEW` F4: Wire miss-path assertion in `combo-fusion-strategy.test.ts` is weak (`fallbackCalls.length + fusionCalls.length >= 1`).

### Evidence Gaps / External Blockers
- `EVIDENCE_GAP`: No automated test proving that a trigger-miss does not permanently alter strategy on a combo object shared via `getCombosCached` / `getCombosCachedForChat` (10s TTL).

## Axiom Compliance

| Axiom | Status | Notes |
|-------|--------|-------|
| 1 Type Purity | ⚠️ | Pure helpers are well-typed; several `as Record<string, unknown>` / `as string` without SAFETY comments (F3) |
| 2 Boundary Integrity | ✅ | Triggers/fallback validated at Zod (Task 0010) + runtime D8 guard; unknown mode fails closed |
| 3 Async Determinism | ✅ | Gate is sync pure functions; combo branch awaits acting-only path correctly |
| 4 Immutability | ❌ | `combo.strategy = fallback` mutates caller-owned / cache-shared objects (F1) |
| 5 State Exclusivity | ✅ | Mode dispatch is exhaustive (always / tool-call / text-match / unknown→false); forbidden fallbacks collapse to priority |

## Findings

| ID | Class | Severity | Status | Summary | First seen | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| F1 | NEW | High | Open | Trigger miss mutates `combo.strategy` in place; local `let strategy` already exists — mutation is unnecessary and unsafe for nested units from `allCombos` cache | 2026-07-10 this report | `open-sse/services/combo.ts:984-985`; cache: `open-sse/handlers/chatCore/comboContextCache.ts` (10s), `src/sse/handlers/chat.ts` `getCombosCachedForChat`; nested unit source: `fusion.ts` `findComboByName(allCombos,…)` |
| F2 | NEW | Medium | Open | Runtime D8 not exercised through `handleComboChat` with `fallbackStrategy: "fusion"` | 2026-07-10 | Pure: `fusion-triggers.test.ts` `resolveFusionFallbackStrategy`; schema: `fusion-contracts.test.ts`; no combo-fusion wire case |
| F3 | NEW | Low | Open | Type assertions without SAFETY comments | 2026-07-10 | `fusionTriggers.ts:63,70-71,99,112,147`; combo gate casts `config as Record…` / `triggers as FusionTriggersConfig` |
| F4 | NEW | Low | Open | Weak wire assertion on fallback path | 2026-07-10 | `tests/unit/combo-fusion-strategy.test.ts` miss branch |

### Contract / exit-condition audit

| Exit condition | Status | Proof |
| --- | --- | --- |
| `fusionTriggers.ts` exports `shouldTriggerFusion`, `hasMatchingToolCall`, `hasMatchingText` | ✅ | Module exists; also exports `matchGlob`, `resolveFusionFallbackStrategy`, `fusionStrategyHasConditionalTriggers`, `extractLatestUserText` |
| `conditional-fusion` uses `shouldTriggerFusion` | ✅ | `combo.ts:965` |
| `always` dispatches fusion | ✅ | Pure + wire `combo-fusion-strategy` always test |
| `text-match` on latest user message | ✅ | Case-insensitive substring; multimodal text join |
| Fallback on miss | ✅ | Falls through after D8 resolve; acting-only preferred when set (Epic 0004 A6 — additive, not conflicting) |
| Default fallback `priority` | ✅ | `resolveFusionFallbackStrategy` |
| Missing triggers on `strategy: "fusion"` → unconditional | ✅ | `fusionStrategyHasConditionalTriggers(undefined) === false` |
| Glob `write*`, `*security*` | ✅ | Tests + implementation |
| Text substring not glob | ✅ | Documented + tested |
| Runtime D8 no fusion self-recursion | ⚠️ | Pure helper yes; in-place strategy mutation undermines safety story for nested cached combos (F1) |
| Tests pass | ✅ | 26/26 `fusion-triggers`; 11/11 `combo-fusion-strategy` (included in 89-pass fusion suite) |
| Private helpers removed from `combo.ts` | ✅ | No local `matchGlob`/`hasMatchingToolCall` left |
| CHANGELOG entry | ✅ | Unreleased Fusion triggers + fallback runtime |

### Behavioral verification (adversarial)

1. **Malicious / odd inputs**: empty patterns fail closed for text-match; tool-call empty → defaults `write*|edit*|create*`; unknown mode → false (fail closed for expensive path).
2. **Racing / shared state**: Concurrent requests sharing `allCombos` array elements can observe mutated `strategy` after another request's trigger miss (F1). Primary path via `getComboByName` is fresh per request, so primary-only traffic is less exposed; nested `combo-ref` uses cached list references.
3. **Closure leakage**: N/A — pure helpers; no request-body retention.

### Runtime wiring proof

- Non-test import: `combo.ts` imports `shouldTriggerFusion`, `resolveFusionFallbackStrategy`, `fusionStrategyHasConditionalTriggers` from `fusionTriggers.ts`.
- Production call chain: `handleComboChat` → strategy gate (`fusion` \| `conditional-fusion`) → `shouldTriggerFusion` → `dispatchFusionStrategy` \| acting-only \| fallback override.
- UI/i18n surfaces reference trigger concepts; runtime gate is not UI-only.

## Evidence Reviewed

- Task: `docs/tasks/03-review/0014-omniroute-fusion-triggers-fallback.md` (pre-move)
- Source: `open-sse/services/fusionTriggers.ts`, `open-sse/services/combo.ts:893-986`, `src/shared/validation/schemas/combo.ts` triggers/fallback, `open-sse/services/fusion.ts` nested dispatch, combo caches
- Tests: `tests/unit/fusion-triggers.test.ts`, `tests/unit/combo-fusion-strategy.test.ts`, related fusion suite
- Commands run:
  ```bash
  node --import tsx/esm --test \
    tests/unit/fusion-triggers.test.ts \
    tests/unit/fusion-panel-tools-none.test.ts \
    tests/unit/fusion-units-resolve.test.ts \
    tests/unit/fusion-combo-ref-dispatch.test.ts \
    tests/unit/fusion-contracts.test.ts \
    tests/unit/combo-fusion-strategy.test.ts \
    tests/integration/combo-matrix/fusion.test.ts
  # → 89 pass / 0 fail
  ```
- Sabotage (conceptual + pure counterfactual): `resolveFusionFallbackStrategy("fusion")` must not return `"fusion"`; tests assert priority — regression-sensitive.
- Commands not run: full `npm run lint` / `typecheck:core` (executor claimed clean; not re-run this wave to save time — not a blocker for F1).

## Path To 100

1. **F1 (must fix)**: Remove `(combo as Record<string, unknown>).strategy = fallback`. Keep only `strategy = fallback as …` local override. If any downstream needs effective strategy, pass it explicitly (e.g. target `effectiveComboStrategy`) without mutating the combo record.
2. **F1 test**: Add a unit test that reuses the same combo object for two `handleComboChat` calls — miss then match — and asserts `combo.strategy` remains `"conditional-fusion"` after the miss while the second call still fuses.
3. **F2**: Wire test: `config.fallbackStrategy = "fusion"`, trigger miss → must not recurse into fusion (no judge fan-out); effective routing behaves as priority (or asserted default).
4. **F3**: Prefer narrow type guards; add `// SAFETY:` only where structural proof is solid after checks.
5. **F4**: Strengthen miss-path asserts (e.g. judge not called + panel fan-out count !== full fusion shape, or first priority model only).

## Task Ledger Patch Suggestion

```markdown
## Review Ledger

### Latest Review
- **Date**: 2026-07-10
- **Reviewer profile**: `reviewers`
- **Score**: `84/100`
- **Verdict**: `REJECTED_TO_DOING`
- **Full report**: `docs/reports/reviews/2026-07-10-task-0014-omniroute-fusion-triggers-fallback-review.md`
- **Lane outcome**: returned to doing
```

## Recommended Patches (concrete)

### Patch A — stop mutating combo (primary)

```ts
// open-sse/services/combo.ts (~979-985)
const fallback = resolveFusionFallbackStrategy(cfg.fallbackStrategy, "priority");
log.info(
  isConditional ? "CONDITIONAL_FUSION" : "FUSION",
  `Trigger miss (mode=${triggers?.mode ?? "tool-call"}) — falling back to "${fallback}"`
);
// Only local override — do NOT write combo.strategy (cache / shared object safety).
strategy = fallback as typeof strategy;
```

### Patch B — regression test sketch

```ts
test("conditional-fusion miss does not mutate combo.strategy for subsequent hits", async () => {
  const combo = {
    name: "cf",
    strategy: "conditional-fusion",
    models: [{ model: "f/a" }, { model: "f/b" }],
    config: {
      judgeModel: "f/judge",
      fallbackStrategy: "priority",
      triggers: { mode: "tool-call", toolPatterns: ["write*"] },
      fusionTuning: { minPanel: 2, stragglerGraceMs: 50, panelHardTimeoutMs: 5000 },
    },
  };
  // miss
  await handleComboChat({ body: { messages: [{ role: "user", content: "chat" }] }, combo, ... });
  assert.equal(combo.strategy, "conditional-fusion");
  // hit on same object must still fuse
  ...
});
```
