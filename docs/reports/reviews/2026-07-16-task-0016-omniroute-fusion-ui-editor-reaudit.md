# Review Report: Task 0016 — OmniRoute Fusion UI Editor — 2026-07-16 (adversarial re-audit)

## Review Lineage

- **Current task**: Task 0016 (`omniroute-fusion-ui-editor`); live path `docs/tasks/03-review/0016-omniroute-fusion-ui-editor.md`
- **Previous reports read**:
  - `docs/reports/reviews/2026-07-10-task-0016-omniroute-fusion-ui-editor-review.md` — **87/100** `REJECTED_TO_DOING`
  - `docs/reports/reviews/2026-07-10-task-0016-omniroute-fusion-ui-editor-rereview.md` — **93/100** `HELD_IN_REVIEW_PATH_TO_100`
- **Related reports considered**: Task 0015 shell; fusion contracts D8/D1
- **Review mode**: `re-review` (adversarial re-audit)
- **Reviewer profile**: `reviewers` (gt-frontend-quality-reviewer + tsjs + code-quality-harness)
- **Parent agentID**: `reviewers`

## Score And Verdict

- **Score**: `92/100`
- **Verdict**: `HELD_IN_REVIEW_PATH_TO_100`
- **Lane recommendation**: `hold-in-review` (S ≥ 90 → stay `03-review/`)
- **Level**: Elite with residual size/i18n/test-sharpness debt

## Delta Summary

### Resolved Since Previous Review (still hold)

- `RESOLVED` **F1**: `tests/unit/fusion-editor-types.test.ts` present — **9/9 pass**. Strategy matrix (`always`→`fusion`, `tool-call`→`conditional-fusion`) is regression-sensitive (invert would fail).
- `RESOLVED` **F3**: Trigger modes use `role="radiogroup"` + `role="radio"` + `aria-checked`; **no** `aria-pressed` (`rg aria-pressed fusions/` → 0). eslint re-run this wave → **exit 0**.

### Persistent Findings

- `PERSISTENT` **F2 Debt**: `FusionEditorClient.tsx` still **910 LOC** (task target ≤500). Helpers in `fusionEditorTypes.ts` (367 LOC) remain isolated and unit-tested — size debt is composition.
- `PERSISTENT` **F4 Improvement**: Chrome still hardcoded EN: `"New fusion"` / `"Edit fusion"` / `"Save fusion"` / `"Back"` / `"Basics"`; validation toast `"Add at least one panel…"` not fully i18n'd.
- `PERSISTENT` **F5 Improvement**: `applyPickedModel` plumbs `providerId` only; `connectionId` supported in types/`unitToPayload` but never set from picker.

### Regressions

- none (a11y fix holds; no ComboEditor import)

### New Findings

- `NEW` **T1 Debt (test sharpness)**: Test `"buildSavePayload: fallbackStrategy fusion is allowed in form but schema rejects — editor should use non-fusion only"` sets `fallbackStrategy = "priority"` then asserts `notEqual(..., "fusion")`. **Tautological** — does not prove filtering of a fusion value and does not couple to `createComboSchema`/`FALLBACK_STRATEGY_OPTIONS`. Name overclaims D8 editor enforcement.
- `NEW` **T2 Improvement**: No unit case for `text-match` → `strategy: "conditional-fusion"` + `textPatterns` payload (tool-call covered; text-match only partially via formFromCombo load).
- `EVIDENCE_GAP` (carry): still no Zod `safeParse` couple on `buildSavePayload`; no tuning numeric round-trip.

### Evidence Gaps / External Blockers

- Playwright UI e2e not required for this gate.

## Findings

| ID | Class | Severity | Status | Summary | First seen | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| F1 | RESOLVED | Debt | Closed | Unit tests for save/load matrix | 2026-07-10 | 9/9 pass |
| F2 | PERSISTENT | Debt | Open | Client ~910 LOC vs ≤500 | 2026-07-10 | `wc -l` → 910 |
| F3 | RESOLVED | Improvement | Closed | Radiogroup semantics; no aria-pressed | 2026-07-10 | L697–714; rg clean |
| F4 | PERSISTENT | Improvement | Open | Hardcoded chrome/toasts | 2026-07-10 | L489–503, L347–357 area |
| F5 | PERSISTENT | Improvement | Open | connectionId not from picker | 2026-07-10 | `applyPickedModel` L309–328 |
| T1 | NEW | Debt | Open | Weak/tautological fallback D8 unit test | 2026-07-16 | `fusion-editor-types.test.ts` L64–75 |
| T2 | NEW | Improvement | Open | text-match save strategy matrix incomplete | 2026-07-16 | no assert mode text-match → conditional-fusion |

## Contract / Wiring Proof (re-verified)

| Requirement | Status | Evidence |
| --- | --- | --- |
| Editor routes `[id]` + `new` | ✅ | pages present |
| Panels / judge / triggers / tuning | ✅ | client sections + `FusionUnitRow` |
| D1 judge separate | ✅ | top-level `judge` in `buildSavePayload` |
| D8 fallback excludes fusion (UI) | ✅ | `FALLBACK_STRATEGY_OPTIONS` filters 18→16; no fusion values |
| always → fusion / non-always → conditional-fusion | ✅ | helpers + unit tests (tool-call) |
| Hard Rule #8 tests | ✅ | 9 pass; strategy asserts strong except T1 |
| No ComboEditor import (D6) | ✅ | comments + no import |
| eslint fusion tree | ✅ | `--max-warnings 0` exit 0 |

## Axiom Compliance (tsjs + frontend)

| Axiom | Status | Notes |
| --- | --- | --- |
| Type Purity | ✅ | No `any` in editor modules |
| Boundary Integrity | ✅ | Client checks + server Zod; UI D8 filter |
| Async Determinism | ✅ | load/save awaited / voided |
| Accessibility | ✅ | Radiogroup correct; optional roving tabindex polish |
| Performance | ✅ | Dynamic modal `ssr: false` |
| Test integrity | ⚠️ | Core strategy matrix good; T1 weak |

## Evidence Reviewed

- Task + prior rereview
- Source: `FusionEditorClient.tsx`, `fusionEditorTypes.ts`, `FusionUnitRow.tsx`
- Tests: `tests/unit/fusion-editor-types.test.ts`
- Commands:
  ```bash
  node --import tsx/esm --test tests/unit/fusion-editor-types.test.ts  # 9 pass
  npx eslint "src/app/(dashboard)/dashboard/fusions/**/*.{ts,tsx}" --max-warnings 0  # 0
  wc -l .../FusionEditorClient.tsx  # 910
  node -e 'ROUTING_STRATEGIES filter' → 16 fallback options, no fusion
  ```

## Scoring Rationale

Prior 93; −1 for newly formalized weak D8 editor unit test (T1) under adversarial “not tautologies” focus. Functional editor contract still holds.

| Finding | Deduction |
| --- | --- |
| F2 size debt | −5 |
| F4 i18n chrome | −2 |
| F5 connectionId | −1 |
| T1 weak test | −1? (net −1 from prior 93 → **92**) |

## Path To 100

1. **F2**: Extract `FusionTriggersSection`, `FusionTuningSection`, `FusionBasicsCard` so client is orchestration ≤500 LOC.
2. **F4**: Route chrome + validation toasts through i18n.
3. **F5**: Document supported picker contract **or** plumb connectionId when modal exposes it.
4. **T1/T2**: Replace tautology with (a) assert `FALLBACK_STRATEGY_OPTIONS` excludes fusion family; (b) `buildSavePayload` text-match → conditional-fusion; (c) optional `createComboSchema.safeParse` on payload.

## Patches Applied On Re-Audit

- none (read-only)

## Task Ledger Patch Suggestion

```markdown
### Latest Review
- Date: 2026-07-16
- Score: 92/100
- Verdict: HELD_IN_REVIEW_PATH_TO_100
- Full report: docs/reports/reviews/2026-07-16-task-0016-omniroute-fusion-ui-editor-reaudit.md
- Lane outcome: remains in review

#### Current Open Blockers
- PERSISTENT F2 ~910 LOC
- PERSISTENT F4 i18n chrome
- PERSISTENT F5 connectionId
- NEW T1 weak fallback unit test
- NEW T2 text-match save matrix
```
