# Review Report: Task 0010 — OmniRoute Fusion Contracts — 2026-07-16 (REAUDIT)

## Review Lineage

- **Current task**: Task 0010 (`omniroute-fusion-contracts`); live path `docs/tasks/03-review/0010-omniroute-fusion-contracts.md`
- **Previous reports read**:
  - `docs/reports/reviews/2026-07-10-task-0010-omniroute-fusion-contracts-review.md` — score 95/100, HELD_IN_REVIEW_PATH_TO_100
- **Related reports considered**:
  - `docs/reports/reviews/2026-07-10-task-0011-omniroute-fusion-resolve-units-review.md`
  - `docs/reports/reviews/2026-07-10-task-0012-omniroute-fusion-runtime-dispatch-review.md`
  - `docs/reports/reviews/2026-07-10-task-0013-omniroute-fusion-combo-branch-wire-review.md`
- **Review mode**: `re-review` (adversarial; prior claims guilty until proven on live FS)
- **Reviewer profile**: `reviewers` (parent agentID=reviewers; OmniRoute Architect adversarial re-audit)

## Score And Verdict

- **Score**: `94/100`
- **Verdict**: `HELD_IN_REVIEW_PATH_TO_100`
- **Lane recommendation**: `hold-in-review` (remain `03-review/`; do **not** move to `04-completed/`; do **not** return to `02-doing`)
- **Delta vs prior**: 95 → 94 (−1 for still-unpublished CHANGELOG + unchanged DAG residual)

## Delta Summary

### Resolved Since Previous Review

- none required for exit conditions (contracts still live)

### Persistent Findings

- `PERSISTENT` F1 (Improvement): Task 0010 CHANGELOG bullet remains draft-only in Completion Evidence — no dedicated Unreleased “Task 0010 / Fusion contracts” entry in `CHANGELOG.md` (only later epic/0013 narrative).
- `PERSISTENT` F2 (Improvement / deferred): `validateComboDAG` still walks `combo.models` only — top-level `judge` / `acting` combo-refs are not create-time DAG-validated (`open-sse/services/combo/comboStructure.ts:317-343`). Runtime cycle/depth still enforced in `buildFusionChildNesting`.

### Regressions

- none

### New Findings

- `NEW` (Note / evidence reinforce): Contracts are **not dead types**. Live production chain proven again:
  `createComboSchema.judge` + `comboRuntimeConfigSchema` D8/triggers → `resolveFusionUnits` → `handleFusionChatV2` → `combo.ts::dispatchFusionStrategy`.
- `NEW` (Improvement, low): No schema→resolve round-trip unit still (prior path-to-100 optional).

### Evidence Gaps / External Blockers

- none blocking Task 0010 exits

## Findings

| ID | Class | Severity | Status | Summary | First seen | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| F1 | PERSISTENT | Improvement | Open | CHANGELOG draft not published for 0010 | 2026-07-10 | Task Completion Evidence; `rg "Task 0010" CHANGELOG.md` empty for contracts bullet |
| F2 | PERSISTENT | Improvement | Open (deferred 0018) | DAG ignores top-level judge/acting combo-refs | 2026-07-10 | `comboStructure.ts:336-343` models loop only |
| F3 | NEW | Note | Accepted | Types/schemas production-wired (not phantom) | this reaudit | `combo.ts` schema + `fusion.ts` types + `combo.ts` dispatch |

## Contract Compliance (vs task exit conditions)

| Exit condition | Status | Live proof |
| --- | --- | --- |
| `triggers.mode` ∈ always \| tool-call \| text-match | ✅ | `src/shared/validation/schemas/combo.ts:205` |
| `triggers.textPatterns` string[] | ✅ | `combo.ts:207` |
| `fallbackStrategy` rejects fusion / conditional-fusion | ✅ | superRefine `combo.ts:216-228` (case-insensitive) |
| Top-level `judge` as `comboModelEntry` | ✅ | create `267`, update `325` |
| `ResolvedFusionUnit` + `HandleFusionChatOptionsV2` exported | ✅ | `open-sse/services/fusion.ts:254-283` |
| No `role:"judge"`; no `fusions` table | ✅ | separate `judge` field only |
| `fusion` + `conditional-fusion` in strategy registry | ✅ | `ROUTING_STRATEGY_VALUES` (confirmed via tests) |
| Unit tests | ✅ | `fusion-contracts` 16/16; `combo-config` subset green in combined run |
| typecheck:core | ✅ | exit 0 (this reaudit) |

### Zod vs runtime drift (adversarial focus)

| Surface | Zod | Runtime | Drift? |
| --- | --- | --- | --- |
| triggers.mode | enum 3 values, default tool-call | `shouldTriggerFusion` defaults tool-call; unknown fail-closed | ✅ aligned |
| textPatterns | optional string[] | text-match empty → never match | ✅ aligned |
| fallbackStrategy D8 | superRefine reject | `resolveFusionFallbackStrategy` collapses forbidden → priority | ✅ defense-in-depth |
| top-level judge | comboModelEntry optional | `resolveJudgeUnit` precedence D1 | ✅ aligned |
| requireApproval | boolean default false | reserved (not enforced) | ✅ intentional reserved |

## Runtime Wiring Proof (not dead types)

```
API create/update (Zod combo schemas)
  → DB JSON blob preserves judge/acting via ...data + normalizeComboRecord spread
  → handleComboChat → dispatchFusionStrategy
      → resolveFusionUnits (consumes ResolvedFusionUnit)
      → handleFusionChatV2 (HandleFusionChatOptionsV2)
```

## Axiom Compliance (tsjs)

| Axiom | Status | Notes |
| --- | --- | --- |
| Type Purity | ✅ | Discriminated ResolvedFusionUnit |
| Boundary Integrity | ✅ | Zod create/update + D8 superRefine; triggers.strict() |
| Async Determinism | ✅ | contracts/types only |
| Immutability | ✅ | schema transforms return new objects |
| State Exclusivity | ✅ | D1 separate judge field |

## Evidence Reviewed

- Task: `docs/tasks/03-review/0010-omniroute-fusion-contracts.md`
- Prior report: `docs/reports/reviews/2026-07-10-task-0010-omniroute-fusion-contracts-review.md`
- Source: `src/shared/validation/schemas/combo.ts`, `open-sse/services/fusion.ts`, `open-sse/services/combo.ts`, `open-sse/services/fusionTriggers.ts`, `open-sse/services/combo/comboStructure.ts`, `src/lib/db/combos.ts`, `src/lib/combos/steps.ts`
- Commands (fresh this reaudit):
  ```bash
  node --import tsx/esm --test \
    tests/unit/fusion-contracts.test.ts \
    tests/unit/fusion-units-resolve.test.ts \
    tests/unit/fusion-combo-ref-dispatch.test.ts \
    tests/unit/combo-fusion-strategy.test.ts \
    tests/unit/combo-config.test.ts \
    tests/integration/combo-matrix/fusion.test.ts
  # → 102/102 pass

  node --import tsx/esm --test tests/unit/fusion-contracts.test.ts  # 16/16
  npm run typecheck:core  # exit 0
  ```

## Path To 100

1. Publish Task 0010 CHANGELOG Unreleased bullet (F1) at parent wave closeout.
2. Optional: one unit that `createComboSchema.safeParse(...).data` → `resolveFusionUnits` without field loss.
3. Defer DAG judge/acting walk to Task 0018 (F2); do not regress D8 or trigger enum.

## Regression Guards

- Keep D8 superRefine case-insensitive reject of fusion / conditional-fusion fallback.
- Keep triggers.mode enum + textPatterns + requireApproval reserved.
- Keep top-level judge as comboModelEntry (never role:"judge" on steps).
- Keep ResolvedFusionUnit shape (model | combo-ref + optional label).

## Task Ledger Patch Suggestion

```markdown
### Latest Review
- Date: 2026-07-16
- Score: 94/100
- Verdict: HELD_IN_REVIEW_PATH_TO_100
- Full report: docs/reports/reviews/2026-07-16-task-0010-omniroute-fusion-contracts-reaudit.md
- Lane outcome: remains in review
```
