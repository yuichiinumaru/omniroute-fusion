# Review Report: Task 0010 — OmniRoute Fusion Contracts — 2026-07-10

## Review Lineage

- **Current task**: Task 0010 (`omniroute-fusion-contracts`); live path `docs/tasks/03-review/0010-omniroute-fusion-contracts.md`
- **Previous reports read**: none found under `docs/reports/reviews/` for 0010 / fusion-contracts
- **Related reports considered**: none (first independent review wave for this task)
- **Review mode**: `initial`
- **Reviewer profile**: `reviewers` (parent agentID=reviewers; OmniRoute Architect + tsjs rigor)

## Score And Verdict

- **Score**: `95/100`
- **Verdict**: `HELD_IN_REVIEW_PATH_TO_100`
- **Lane recommendation**: `hold-in-review` (do **not** move to `04-completed`; do **not** return to `02-doing`)

## Delta Summary

### Resolved Since Previous Review

- N/A — initial review.

### Persistent Findings

- none

### Regressions

- none

### New Findings

- `NEW` (Improvement): CHANGELOG entry is drafted in Completion Evidence only; not published to `CHANGELOG.md` (parent wave closeout is the agreed path).
- `NEW` (Improvement / residual epic risk): `validateComboDAG` walks `models` only — top-level `judge` / `acting` combo-refs are **not** validated at API create time. Runtime still protects via `buildFusionChildNesting` (cycle/depth → 503). Out of pure Task 0010 scope (contracts/types), but worth tracking for Task 0018 hardening.

### Evidence Gaps / External Blockers

- none for Task 0010 exit conditions

## Findings

| ID | Class | Severity | Status | Summary | First seen | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| F1 | NEW | Improvement | Open | CHANGELOG drafted, not published | this report | Task Completion Evidence draft; `CHANGELOG.md` concurrent |
| F2 | NEW | Improvement | Open (deferred) | DAG create validation ignores top-level judge/acting combo-refs | this report | `open-sse/services/combo/comboStructure.ts:317-343` walks `combo.models` only |

## Contract Compliance (vs task exit conditions)

| Exit condition | Status | Evidence |
| --- | --- | --- |
| `triggers.mode` ∈ always \| tool-call \| text-match | ✅ | `combo.ts:205`; tests pass |
| `triggers.textPatterns` as `string[]` | ✅ | `combo.ts:207`; tests pass |
| `fallbackStrategy` rejects fusion / conditional-fusion | ✅ | `combo.ts:216-228` superRefine; case-insensitive |
| Top-level `judge` as `comboModelEntry` | ✅ | create `combo.ts:267`; update `combo.ts:325` + null clear |
| `ResolvedFusionUnit` + `HandleFusionChatOptionsV2` exported | ✅ | `fusion.ts:254-283` |
| Existing combo-config fusion tests still pass | ✅ | 42/42 |
| New `fusion-contracts.test.ts` | ✅ | 16/16 |
| typecheck:core | ✅ | exit 0 |
| lint on touched files | ✅ | clean |
| No new `fusions` table; no `role:"judge"` | ✅ | schema uses separate `judge` field (D1) |

## Runtime Wiring Proof (not dead types)

Types from Task 0010 are live on the production path:

1. **Schema boundary**: `createComboSchema` / `updateComboSchema` / `comboRuntimeConfigSchema` accept judge + extended triggers + D8 guard.
2. **Resolve**: `resolveFusionUnits` returns `ResolvedFusionUnit` panels/judge (Task 0011).
3. **Dispatch**: `handleFusionChatV2({ panels, judge, ... }: HandleFusionChatOptionsV2)` is the live fusion runtime.
4. **Combo branch**: `open-sse/services/combo.ts` `dispatchFusionStrategy` calls `resolveFusionUnits` → `handleFusionChatV2` for `strategy === "fusion" | "conditional-fusion"`.

Not phantom: types are consumed outside tests by `fusion.ts` runtime and `combo.ts` strategy branch.

## Axiom Compliance (tsjs)

| Axiom | Status | Notes |
| --- | --- | --- |
| Type Purity | ✅ | Discriminated `ResolvedFusionUnit`; no `any` in new surface |
| Boundary Integrity | ✅ | Zod at create/update; superRefine for D8; triggers `.strict()` |
| Async Determinism | ✅ | Contracts-only / types; N/A async |
| Immutability | ✅ | Schema transforms return new objects; types are value shapes |
| State Exclusivity | ✅ | `kind: "model" \| "combo-ref"` union; judge separate field (D1) |

## Evidence Reviewed

- Task file: `docs/tasks/03-review/0010-omniroute-fusion-contracts.md`
- Source: `src/shared/validation/schemas/combo.ts`, `open-sse/services/fusion.ts`, `open-sse/services/combo.ts` (dispatchFusionStrategy), `src/shared/constants/routingStrategies.ts`, `src/lib/db/combos.ts` (JSON blob preserves top-level judge via `...data`)
- Tests: `tests/unit/fusion-contracts.test.ts`, `tests/unit/combo-config.test.ts`
- Commands run (fresh this review):
  ```bash
  node --import tsx/esm --test \
    tests/unit/fusion-contracts.test.ts \
    tests/unit/fusion-units-resolve.test.ts \
    tests/unit/combo-config.test.ts \
    tests/unit/combo-fusion-strategy.test.ts
  # → 83/83 pass

  npx eslint src/shared/validation/schemas/combo.ts \
    open-sse/services/fusion.ts \
    tests/unit/fusion-contracts.test.ts \
    tests/unit/fusion-units-resolve.test.ts
  # → clean

  npm run typecheck:core
  # → exit 0
  ```
- Commands not run: full `npm run lint` / full suite (targeted evidence sufficient for this scope)

## Path To 100

1. **Parent wave closeout**: publish the drafted CHANGELOG Unreleased bullet for Task 0010 (F1).
2. **Optional polish (not blocking)**: add a single integration-style unit that `createComboSchema.safeParse({…judge, triggers…}).data` feeds `resolveFusionUnits` without loss.
3. **Deferred residual (Task 0018 / DAG)**: extend `validateComboDAG` (or a fusion-specific preflight) to walk top-level `judge` / `acting` combo-refs so create-time validation matches runtime cycle guards (F2). Do not regress D8 superRefine or trigger enum when touching this.

## Narrow Patches (path-to-100)

```diff
# Patch A — CHANGELOG (parent only; avoid concurrent Unreleased races)
### Added
- **Fusion contracts (Epic 0003 / Task 0010)**: Zod combo schemas accept
  `triggers.mode` ∈ {always, tool-call, text-match}, optional `triggers.textPatterns`,
  top-level `judge` as `comboModelEntry`, and reject `fallbackStrategy` of
  `fusion` / `conditional-fusion` (D8). Exported `ResolvedFusionUnit` +
  `HandleFusionChatOptionsV2` from `open-sse/services/fusion.ts`.
```

```diff
# Patch B (optional, Task 0018) — validateComboDAG also walks judge/acting
# After models loop in validateComboDAG:
+ for (const extra of [combo.judge, combo.acting]) {
+   if (!extra) continue;
+   const name = normalizeModelEntry(extra).model; // or normalizeComboStep → comboName
+   if (combos.find((c) => c.name === name)) {
+     validateComboDAG(name, combos, new Set(visited), depth + 1, maxDepth);
+   }
+ }
```

## Task Ledger Patch Suggestion

```markdown
## Review Ledger
### Latest Review
- Date: 2026-07-10
- Score: 95/100
- Verdict: HELD_IN_REVIEW_PATH_TO_100
- Full report: docs/reports/reviews/2026-07-10-task-0010-omniroute-fusion-contracts-review.md
- Lane outcome: remains in review
```
