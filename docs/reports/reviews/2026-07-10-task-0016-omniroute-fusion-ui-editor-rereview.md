# Review Report: Task 0016 — OmniRoute Fusion UI Editor — 2026-07-10 (re-review)

## Review Lineage

- **Current task**: Task 0016 (`omniroute-fusion-ui-editor`); live path `docs/tasks/03-review/0016-omniroute-fusion-ui-editor.md`
- **Previous reports read**:
  - `docs/reports/reviews/2026-07-10-task-0016-omniroute-fusion-ui-editor-review.md` — **87/100 REJECTED_TO_DOING**
- **Related reports considered**: none additional beyond prior lineage note on Task 0015 shell
- **Review mode**: `re-review`
- **Reviewer profile**: `reviewers` (gt-frontend-quality-reviewer + tsjs + code-quality-harness)
- **Parent agentID**: `reviewers`

## Score And Verdict

- **Score**: `93/100`
- **Verdict**: `HELD_IN_REVIEW_PATH_TO_100`
- **Lane recommendation**: `hold-in-review` (S≥90 — do **not** move to `04-completed`; stay in `03-review`)
- **Level**: Elite — Hard Rule #8 tests landed; residual size/i18n polish only

## Delta Summary

### Resolved Since Previous Review

- `RESOLVED` **F1**: `tests/unit/fusion-editor-types.test.ts` committed (9 tests). Covers always→`fusion`, tool-call→`conditional-fusion`+fallback, update `judge:null`, text-match fallback exclusion, `formFromCombo` legacy `judgeModel`, fusion-without-triggers default mode, `normalizeFusionUnit`, `isFusionStrategy`. All **pass**. Strategy equality assertions are regression-sensitive (invert would fail).
- `RESOLVED` **F3**: Trigger mode control is `role="radiogroup"` + `role="radio"` + `aria-checked` + `aria-label`. Builder had also set `aria-pressed` on `role="radio"`, which fails `jsx-a11y/role-supports-aria-props`. **Re-reviewer narrow patch** removed `aria-pressed` only; eslint fusion tree now **0 errors / 0 warnings** with `--max-warnings 0`.

### Persistent Findings

- `PERSISTENT` **F2**: `FusionEditorClient.tsx` still **910 LOC** (task target ≤500). Pure helpers remain isolated in `fusionEditorTypes.ts` (367 LOC) and are unit-tested — size debt is UI composition, not untested logic. **Does not block ≥90** given F1 resolution + helper isolation; still open for path-to-100.
- `PERSISTENT` **F4**: Chrome/error strings still hardcoded English (`"New fusion"` / `"Edit fusion"` / `"Save fusion"` / `"Back"` / `"Basics"` / panel validation toasts) while field labels mostly use `tx(t, …)`.
- `PERSISTENT` **F5**: `applyPickedModel` still only plumbs `providerId` from the modal; `connectionId` is supported in types/`unitToPayload`/`normalizeFusionUnit` but never set from the picker. `ModelSelectModal` has **no** `connectionId` surface — residual gap vs task wording, not a silent data-loss bug in the modal contract.

### Regressions

- none remaining (transient lint from dual `aria-pressed`+`role=radio` introduced in the fix wave was **fixed in this re-review**)

### New Findings

- none open after re-reviewer a11y patch

### Evidence Gaps / External Blockers

- `EVIDENCE_GAP` (minor): unit tests do not yet couple `buildSavePayload` output to `createComboSchema` / `updateComboSchema` (prior review suggested this). Behavioral matrix is covered; Zod gate is still manual/prior-review smoke only.
- `EVIDENCE_GAP` (minor): no unit coverage for tuning numeric round-trip or combo-ref judge payload shape.
- `EXTERNAL_BLOCKER`: none (Playwright UI e2e not required for this gate)

## Findings

| ID | Class | Severity | Status | Summary | First seen | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| F1 | RESOLVED | Debt | Closed | Unit tests for save/load matrix | 2026-07-10 initial | `tests/unit/fusion-editor-types.test.ts` — 9/9 pass |
| F2 | PERSISTENT | Debt | Open | Client still ~910 LOC vs ≤500 target | 2026-07-10 initial | `wc -l` → 910 `FusionEditorClient.tsx` |
| F3 | RESOLVED | Improvement | Closed | Radiogroup semantics on trigger modes | 2026-07-10 initial | L695–714 radiogroup/radio/`aria-checked`; invalid `aria-pressed` removed |
| F4 | PERSISTENT | Improvement | Open | Mixed i18n / hardcoded chrome + error toasts | 2026-07-10 initial | L489–503, L347–357 hardcoded strings |
| F5 | PERSISTENT | Improvement | Open | connectionId not set from model picker | 2026-07-10 initial | `applyPickedModel` L309–328; ModelSelectModal has no connectionId |

## Contract / Wiring Proof (re-verified)

| Requirement | Status | Evidence |
| --- | --- | --- |
| Editor routes `[id]` + `new` | ✅ | unchanged wiring |
| Panels / judge / triggers / tuning | ✅ | client sections + `FusionUnitRow` |
| D1 judge separate | ✅ | top-level `judge` in `buildSavePayload` |
| D8 fallback excludes fusion | ✅ | `FALLBACK_STRATEGY_OPTIONS` filter |
| always → fusion / non-always → conditional-fusion | ✅ | helpers + unit tests |
| Hard Rule #8 production change + tests | ✅ | test file + 9 pass |
| typecheck:core | ✅ | exit 0 |
| eslint fusion tree | ✅ | exit 0 after a11y patch |
| No ComboEditor import (D6) | ✅ | (prior; not re-grepped as regression) |

## Axiom Compliance (tsjs + frontend)

| Axiom | Status | Notes |
| --- | --- | --- |
| Type Purity | ✅ | No `any` in editor modules |
| Boundary Integrity | ✅ | Client checks + server Zod; tests assert payload shape |
| Async Determinism | ✅ | load/save awaited / voided |
| Accessibility | ✅ | Trigger modes correct radiogroup; residual: no arrow-key roving tabindex (optional polish) |
| Performance | ✅ | Dynamic modal `ssr: false` |
| State Exclusivity | ⚠️ | Intermediate empty units until save (unchanged, acceptable) |

## Evidence Reviewed

- Task: `docs/tasks/03-review/0016-omniroute-fusion-ui-editor.md` (incl. path-to-100 fix wave notes)
- Prior report: full initial review (87/100)
- Source: `FusionEditorClient.tsx`, `fusionEditorTypes.ts`, `FusionUnitRow.tsx`
- Tests: `tests/unit/fusion-editor-types.test.ts`
- Commands run:
  - `node --import tsx/esm --test tests/unit/fusion-editor-types.test.ts` → **9 pass**
  - `npm run typecheck:core` → **0**
  - `npx eslint src/app/(dashboard)/dashboard/fusions/**/*.{ts,tsx} --max-warnings 0` → **0** (after patch; was exit 1 on `aria-pressed`)
  - `wc -l FusionEditorClient.tsx` → **910**
  - Sabotage-lite probe: strategy matrix equality would catch inverted strategy mapping
- Commands not run: Playwright e2e; full `test:unit` suite

## Scoring Rationale

Start 100, subtract residual only:

| Finding | Deduction |
| --- | --- |
| F2 size debt (helpers tested; composition residual) | −5 |
| F4 i18n chrome | −2 |
| F5 connectionId gap (picker-limited) | −1 |
| Minor test matrix gaps (no Zod couple / tuning RT) | −1? absorbed in F2/elite polish → final **93** |

F1 and F3 no longer deduct. Prior 87 recovered primarily via Hard Rule #8 tests (+a11y).

## Path To 100

1. **F2**: Extract `FusionTriggersSection`, `FusionTuningSection`, `FusionBasicsCard` (and optionally Acting) so `FusionEditorClient` is load/save orchestration only (≤500 LOC).
2. **F4**: Route remaining chrome + validation toasts through `combos.*` / new `fusions.*` keys (`New fusion`, `Save fusion`, empty-panel errors).
3. **F5**: Either plumb connection affinity if/when `ModelSelectModal` exposes it, or document “model + optional providerId only” as the supported editor contract (close as SUPERSEDED).
4. **Optional elite**: Extend unit tests with `createComboSchema`/`updateComboSchema` `safeParse`, tuning round-trip, combo-ref judge payload.

## Patches Applied This Re-Review

### Patch R1 — remove invalid `aria-pressed` on `role="radio"`

**File**: `src/app/(dashboard)/dashboard/fusions/FusionEditorClient.tsx`  
**Change**: Drop `aria-pressed={selected}` from trigger mode radios; keep `role="radiogroup"` / `role="radio"` / `aria-checked`.  
**Why**: `jsx-a11y/role-supports-aria-props` — `aria-pressed` is for toggle buttons, not radio.  
**Proof**: eslint fusion tree exit 0.

## Task Ledger Patch Suggestion

```markdown
### Latest Review
- Date: 2026-07-10
- Reviewer profile: reviewers
- Score: 93/100
- Verdict: HELD_IN_REVIEW_PATH_TO_100
- Full report: docs/reports/reviews/2026-07-10-task-0016-omniroute-fusion-ui-editor-rereview.md
- Lane outcome: remains in review (03-review)

#### Current Open Blockers
- PERSISTENT F2: FusionEditorClient still ~910 LOC (path-to-100 polish)
- PERSISTENT F4: remaining hardcoded chrome/toasts → i18n
- PERSISTENT F5: connectionId not plumbed from model picker (picker has no field)

#### Path-to-100 Summary
1. Extract Triggers/Tuning/Basics sections
2. Finish i18n chrome + error strings
3. Document or plumb connectionId; optional Zod-coupled tests
```
