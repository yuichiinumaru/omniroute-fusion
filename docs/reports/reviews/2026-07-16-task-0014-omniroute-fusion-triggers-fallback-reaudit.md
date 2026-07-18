# Review Report: Task 0014 — Fusion Triggers and Fallback Strategy Runtime — 2026-07-16 (adversarial re-audit)

## Review Lineage

- **Current task**: Task 0014 (`omniroute-fusion-triggers-fallback`); live path `docs/tasks/03-review/0014-omniroute-fusion-triggers-fallback.md`
- **Previous reports read**:
  - `docs/reports/reviews/2026-07-10-task-0014-omniroute-fusion-triggers-fallback-review.md` — **84/100** `REJECTED_TO_DOING`
  - `docs/reports/reviews/2026-07-10-task-0014-omniroute-fusion-triggers-fallback-rereview.md` — **97/100** `HELD_IN_REVIEW_PATH_TO_100`
- **Related reports considered**:
  - `docs/reports/reviews/2026-07-10-task-0018-omniroute-fusion-tests-hardening-review.md` — shared suite floors / D8+immutability tests
- **Review mode**: `re-review` (adversarial re-audit)
- **Reviewer profile**: `reviewers` (gt-ts-code-reviewer + code-quality-harness + tsjs-harness)
- **Parent agentID**: `reviewers`

## Score And Verdict

- **Score**: `98/100`
- **Verdict**: `HELD_IN_REVIEW_PATH_TO_100`
- **Lane recommendation**: `hold-in-review` (S ≥ 90 → stay in `docs/tasks/03-review/`; do **not** move to `04-completed`)
- **Level**: Elite

## Delta Summary

### Resolved Since Previous Review

- `RESOLVED` **F1 High** (re-confirmed live): No in-place `combo.strategy` write on trigger miss. Gate assigns local `strategy` only (`combo.ts` ~987–996). Repo-wide `rg 'combo\.strategy\s*=' open-sse/services/combo.ts` → **0 hits**. Regression test `conditional-fusion: trigger miss must not mutate combo.strategy (shared-object safety)` still green (miss → still `"conditional-fusion"` → hit still fuses on **same object**).
- `RESOLVED` **F2 Medium** (re-confirmed live): Wire D8 `conditional-fusion: forbidden fallbackStrategy fusion collapses to priority (D8 wire)` still green — no judge fan-out, bounded non-fusion calls.
- `RESOLVED` **F3 / F4**: SAFETY comments still present; miss-path asserts still forbid judge (`!includes("f/judge")` / `judgeRuns.length === 0`).

### Persistent Findings

- `PERSISTENT` **I1 Improvement** (hygiene): Task path-to-100 fix wave still claims **48/48**; live named suite for `combo-fusion-strategy` + `fusion-triggers` is **39/39** (13 + 26). Functional impact: none.

### Regressions

- none (immutability + D8 still hold; no cache-poison path reintroduced)

### New Findings

- `NEW` **I2 Improvement** (coverage completeness, non-blocking): D8 **wire** test covers `strategy: "conditional-fusion"` + `fallbackStrategy: "fusion"` only. Gated `strategy: "fusion"` + forbidden fallback, and `fallbackStrategy: "conditional-fusion"` string, rely on pure `resolveFusionFallbackStrategy` + shared gate code path. Pure helper already rejects both forbidden strings case-insensitively.

### Evidence Gaps / External Blockers

- Full monorepo `lint` / `typecheck:core` not re-run this wave (delta re-audit of already-landed logic; focused unit suite green).

## Axiom Compliance

| Axiom | Status | Notes |
|-------|--------|-------|
| 1 Type Purity | ✅ | No `any` on task surface; SAFETY on chat-payload boundary casts |
| 2 Boundary Integrity | ✅ | Zod write-path D8 + runtime `resolveFusionFallbackStrategy` |
| 3 Async Determinism | ✅ | `await dispatchActingOnly()` before fallback fall-through |
| 4 Immutability | ✅ | Local `strategy` only; shared combo object stable across miss→hit |
| 5 State Exclusivity | ✅ | Mode dispatch exhaustive; unknown mode fails closed |

## Findings

| ID | Class | Severity | Status | Summary | First seen | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| F1 | RESOLVED | High | Closed | No `combo.strategy` mutation; immutability wire green | 2026-07-10 initial | `combo.ts:987–996`; test L344–401; `rg` no assignment |
| F2 | RESOLVED | Medium | Closed | D8 forbidden fallback via `handleComboChat` | 2026-07-10 initial | test L403–434; pure helper L201–206 |
| F3 | RESOLVED | Low | Closed | SAFETY on boundary casts | 2026-07-10 initial | `fusionTriggers.ts` + gate casts |
| F4 | RESOLVED | Low | Closed | Strong miss-path judge absence asserts | 2026-07-10 initial | combo-fusion-strategy miss paths |
| I1 | PERSISTENT | Improvement | Open | Completion evidence 48 vs 39 hygiene | 2026-07-10 rereview | task fix-wave note vs live 13+26 |
| I2 | NEW | Improvement | Open | Optional extra D8 wire variants | 2026-07-16 reaudit | pure helper covers; wire is single shape |

### Contract / exit-condition audit

| Exit condition | Status | Proof |
| --- | --- | --- |
| `fusionTriggers.ts` exports trigger helpers | ✅ | `shouldTriggerFusion`, `hasMatchingToolCall`, `hasMatchingText`, `matchGlob`, `resolveFusionFallbackStrategy`, `fusionStrategyHasConditionalTriggers` |
| `conditional-fusion` uses `shouldTriggerFusion` | ✅ | `combo.ts` import + gate branch |
| `always` / `text-match` / tool-call + fallback | ✅ | pure + wire tests |
| Default fallback `priority` | ✅ | `resolveFusionFallbackStrategy` |
| Runtime D8 no fusion self-recursion | ✅ | pure + wire |
| Shared combo immutability | ✅ | miss→hit same object |
| Private helpers removed from `combo.ts` | ✅ | no local `matchGlob` / `hasMatchingToolCall` |
| Unit tests | ✅ | **39/39** on named files; broader fusion suite **100/100** incl. editor/integration |

### Behavioral verification (adversarial)

1. **Malicious / odd inputs**: empty textPatterns fail closed; unknown mode → false; forbidden fallback strings (incl. case/space variants) → `"priority"`.
2. **Racing / shared state**: F1 still fixed — concurrent consumers of the same combo record cannot observe strategy rewrite after a trigger miss (local override only; comment documents cache/shared-object hazard).
3. **Self-recursion (D8)**: Forbidden fallback cannot re-enter fusion gate via local `strategy = fallback` because `resolveFusionFallbackStrategy` collapses fusion family → priority before assignment.
4. **Closure leakage**: N/A — pure helpers; no request retention.

### Runtime wiring proof

```
handleComboChat
  → phaseComboSetup (initialStrategy)
  → fusion / conditional-fusion gate
  → shouldTriggerFusion(body, triggers)
  → hit: dispatchFusionStrategy()
  → miss: await dispatchActingOnly() | strategy = resolveFusionFallbackStrategy(...)  // local only
```

Non-test import: `combo.ts` imports from `fusionTriggers.ts`.

## Evidence Reviewed

- Task: `docs/tasks/03-review/0014-omniroute-fusion-triggers-fallback.md`
- Priors: initial review + rereview (2026-07-10)
- Source: `open-sse/services/fusionTriggers.ts`, `open-sse/services/combo.ts` (gate ~951–997)
- Tests: `tests/unit/fusion-triggers.test.ts`, `tests/unit/combo-fusion-strategy.test.ts`
- Commands run:
  ```bash
  rg -n 'combo\.strategy\s*=' open-sse/services/combo.ts   # none
  rg -n '\(combo as' open-sse/services/combo.ts            # none
  node --import tsx/esm --test \
    tests/unit/combo-fusion-strategy.test.ts \
    tests/unit/fusion-triggers.test.ts \
    tests/unit/fusion-panel-tools-none.test.ts \
    tests/unit/fusion-units-resolve.test.ts \
    tests/unit/fusion-combo-ref-dispatch.test.ts \
    tests/unit/fusion-contracts.test.ts \
    tests/unit/fusion-editor-types.test.ts \
    tests/integration/combo-matrix/fusion.test.ts
  # → tests 100 · pass 100 · fail 0
  # named 0014 pair: 13 + 26 = 39
  ```
- Commands not run: full monorepo `lint` / `typecheck:core` (out of narrow re-audit delta).

## Scoring Rationale

Start from prior 97; re-confirm all functional blockers closed; +1 for sustained green immutability+D8 under adversarial re-check and broader suite green. Residual −2 total for optional hygiene/coverage polish (I1+I2).

## Path To 100

1. **I1**: Align task Completion Evidence / fix-wave notes to **39/39** for the two named files (or list exact multi-file composition if 48 was intentional).
2. **I2 (optional)**: Add wire cases for `fallbackStrategy: "conditional-fusion"` and gated `strategy: "fusion"` + forbidden fallback (same asserts as existing D8 wire).
3. No functional blockers for acceptance gate (S ≥ 90).

## Patches Applied On Re-Audit

- none (read-only adversarial re-audit)

## Task Ledger Patch Suggestion

```markdown
### Latest Review
- **Date**: 2026-07-16
- **Reviewer profile**: `reviewers`
- **Score**: `98/100`
- **Verdict**: `HELD_IN_REVIEW_PATH_TO_100`
- **Full report**: `docs/reports/reviews/2026-07-16-task-0014-omniroute-fusion-triggers-fallback-reaudit.md`
- **Lane outcome**: remains in review (APPROVE S≥90; not completed)

#### Current Open Blockers
- none functional
- PERSISTENT I1: evidence test-count hygiene (optional)
- NEW I2: optional extra D8 wire shapes (optional)

#### Regression Guards
- Never reintroduce `combo.strategy =` mutation on trigger miss
- Keep immutability + D8 wire tests green
```
