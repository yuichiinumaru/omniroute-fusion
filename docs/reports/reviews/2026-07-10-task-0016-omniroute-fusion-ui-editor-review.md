# Review Report: Task 0016 — OmniRoute Fusion UI Editor — 2026-07-10

## Review Lineage

- **Current task**: Task 0016 (`omniroute-fusion-ui-editor`); live path at review start `docs/tasks/03-review/0016-omniroute-fusion-ui-editor.md`
- **Previous reports read**: none found
- **Related reports considered**: Task 0015 shell review (parallel) — list navigates into this editor
- **Review mode**: `initial`
- **Reviewer profile**: `reviewers` (gt-frontend-quality-reviewer + tsjs)
- **Parent agentID**: `reviewers`

## Score And Verdict

- **Score**: `87/100`
- **Verdict**: `REJECTED_TO_DOING`
- **Lane recommendation**: `return-to-doing`
- **Level**: Good — functionally correct; missing regression tests + size/a11y debt block ≥90

## Delta Summary

### Resolved Since Previous Review
- N/A (initial review)

### Persistent Findings
- none

### Regressions
- none

### New Findings
- `NEW` F1: No committed unit tests for pure `buildSavePayload` / `formFromCombo` matrix (Hard Rule #8)
- `NEW` F2: `FusionEditorClient.tsx` is 901 LOC (task target &lt; 500)
- `NEW` F3: Trigger mode toggle buttons lack `aria-pressed` / radiogroup semantics
- `NEW` F4: Some editor chrome still hardcoded English despite i18n keys under `combos.*`
- `NEW` F5: Model path captures `providerId` but never `connectionId` (connection picker incomplete vs task wording)

### Evidence Gaps / External Blockers
- `EVIDENCE_GAP` F1: builder claimed manual Zod smoke only; no `tests/unit/*fusion*editor*` file
- `EXTERNAL_BLOCKER`: none

## Findings

| ID | Class | Severity | Status | Summary | First seen | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| F1 | NEW | Debt | Open | Pure save/load helpers untested in repo | 2026-07-10 | `fusionEditorTypes.ts`; no matching test file |
| F2 | NEW | Debt | Open | Editor client exceeds 500-line refactor target | 2026-07-10 | `wc -l` → 901 `FusionEditorClient.tsx` |
| F3 | NEW | Improvement | Open | Mode toggles not exposed as pressed state to AT | 2026-07-10 | trigger buttons ~L703-719 |
| F4 | NEW | Improvement | Open | Mixed i18n / hardcoded chrome | 2026-07-10 | “New fusion”, “Save fusion”, empty-panel copy |
| F5 | NEW | Improvement | Open | No explicit connection picker on model units | 2026-07-10 | `applyPickedModel` only reads `value` + `providerId` |

## Contract / Wiring Proof

| Requirement | Status | Evidence |
| --- | --- | --- |
| `/dashboard/fusions/[id]` editor | ✅ | `[id]/page.tsx` → `FusionEditorClient` |
| `/dashboard/fusions/new` | ✅ | `new/page.tsx` → `id="new"` |
| Panels add/remove/reorder | ✅ | `addPanel`, `setPanel(null)`, `movePanel` + `FusionUnitRow` |
| Model + combo-ref per row | ✅ | `FusionUnitRow` kind toggle + `ModelSelectModal` / select |
| Judge separate (D1) | ✅ | dedicated card; not panel role |
| Triggers always / tool-call / text-match | ✅ | conditional pattern editors + fallback |
| Fallback excludes fusion strategies (D8) | ✅ | `FALLBACK_STRATEGY_OPTIONS` filter; 16 options; Zod rejects forced `fusion` fallback |
| Save `strategy: fusion` when always | ✅ | `buildSavePayload` + live Zod smoke |
| Save `conditional-fusion` for tool-call/text-match | ✅ | same |
| Top-level `judge` on payload | ✅ | create omits when null; update sends `null` to clear |
| Tuning accordion + defaults placeholders | ✅ | `FUSION_UI_DEFAULTS` 2 / 8000 / 90000 |
| Load existing fusion | ✅ | `GET /api/combos/:id` + `formFromCombo` |
| No ComboEditor import (D6) | ✅ | grep clean |
| Existing combo CRUD only (D4) | ✅ | POST `/api/combos`, PUT `/api/combos/:id` |
| typecheck / lint | ✅ | both exit 0 |
| CHANGELOG Task 0016 | ✅ | Unreleased |

### Live Zod smoke (reviewer-run)

```
fallback count 16; has fusion? false
create always → strategy fusion → createComboSchema OK
create tool-call → conditional-fusion + fallbackStrategy priority → OK
create text-match → conditional-fusion → OK
update clear judge → judge:null → updateComboSchema OK
forbidden fallback "fusion" → schema rejects
judge combo-ref → OK; no config.judgeModel for combo-ref judge
```

### Runtime wiring

```
FusionEditorClient
  load: GET /api/combos/builder/options (+ fallback GET /api/combos)
        GET /api/combos/:id | new
        GET /api/providers (activeProviders for ModelSelectModal)
        GET /api/models/alias
  save create: POST /api/combos  → createComboSchema
  save update: PUT  /api/combos/:id → updateComboSchema
  redirect after create: /dashboard/fusions/:id
```

Create API returns full combo with `id` (`createCombo` assigns uuid) — redirect path valid.

### Anti-hallucination / Decision compliance

| Decision | Status |
| --- | --- |
| D1 judge separate field | ✅ |
| D4 no new API routes | ✅ |
| D5 dedicated fusions surface (not ComboEditor mode) | ✅ |
| D6 no full ComboEditor import; picker reuse | ✅ |
| D7 triggers UI | ✅ |
| D8 no fusion in fallback dropdown | ✅ |

**Bonus (out of 0016 scope but present):** Acting section (Epic 0004) wired via top-level `acting` — compatible with schema; not a defect.

## Axiom Compliance (tsjs + frontend)

| Axiom | Status | Notes |
| --- | --- | --- |
| Type Purity | ✅ | Discriminated `FusionUnit`; no `any` in editor modules |
| Boundary Integrity | ✅ | Client validation + server Zod; `parseApiError` for 400 shapes |
| Async Determinism | ✅ | await/void on load/save; saving flag |
| State Exclusivity | ⚠️ | Trigger mode drives strategy on save (good); empty model unit intermediate states allowed until save |
| Accessibility | ⚠️ | Labels mostly present; mode toggles / some raw buttons weak |
| Performance | ✅ | Dynamic `ModelSelectModal` `ssr: false`; no ComboEditor bloat |
| Immutability | ✅ | panel moves via copy arrays |

## Evidence Reviewed

- Task: `docs/tasks/03-review/0016-omniroute-fusion-ui-editor.md`
- Source: `FusionEditorClient.tsx`, `FusionUnitRow.tsx`, `fusionEditorTypes.ts`, `[id]/page.tsx`, `new/page.tsx`
- Schema: `src/shared/validation/schemas/combo.ts` (`judge`/`acting`/`fusionTuning`/`triggers`/`fallbackStrategy`)
- Strategies: `ROUTING_STRATEGIES` (18 total, 16 fallback-eligible)
- Commands run:
  - eslint fusion tree → 0
  - `npm run typecheck:core` → 0
  - node tsx smoke of `buildSavePayload`/`formFromCombo` vs Zod → pass
- Commands not run: Playwright UI e2e; sabotage-gate mutation (blocked by missing baseline unit tests)

## Path To 100

1. **[Blocker for ≥90]** Add `tests/unit/fusion-editor-types.test.ts` covering:
   - always → `fusion`; tool-call/text-match → `conditional-fusion`
   - top-level `judge` present / null-on-update-clear
   - fallback never `fusion`/`conditional-fusion` when mode ≠ always
   - `formFromCombo` legacy `config.judgeModel` + conditional default mode
   - tuning empty vs numeric round-trip
2. Extract `TriggersSection`, `TuningSection`, `BasicsCard` (and optionally Acting) so `FusionEditorClient` stays composition-only (≤500 LOC target).
3. Trigger mode control: `role="radiogroup"` + `aria-checked`/`aria-pressed` on options.
4. Route remaining chrome strings through `combos.*` i18n keys already partially present.
5. (Optional) If connection affinity is required, plumb `connectionId` from modal/providers; otherwise document “model string + providerId” as the supported contract.

## Suggested Patches (non-applied)

### Patch A — unit tests (highest priority)

```ts
// tests/unit/fusion-editor-types.test.ts
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildSavePayload,
  formFromCombo,
  emptyFusionForm,
} from "../../src/app/(dashboard)/dashboard/fusions/fusionEditorTypes.ts";
import {
  createComboSchema,
  updateComboSchema,
} from "../../src/shared/validation/schemas/combo.ts";

test("always saves as fusion with top-level judge", () => {
  const form = emptyFusionForm();
  form.name = "my-fusion";
  form.panels = [{ kind: "model", model: "openai/gpt-4o" }];
  form.judge = { kind: "model", model: "anthropic/claude" };
  const body = buildSavePayload(form, null, "create");
  assert.equal(body.strategy, "fusion");
  assert.ok(body.judge);
  assert.equal(createComboSchema.safeParse(body).success, true);
});

test("text-match saves conditional-fusion and excludes fusion fallback", () => {
  const form = emptyFusionForm();
  form.name = "gated";
  form.panels = [{ kind: "model", model: "a/b" }];
  form.triggers = { mode: "text-match", toolPatterns: [], textPatterns: ["review"] };
  form.fallbackStrategy = "priority";
  const body = buildSavePayload(form, null, "create");
  assert.equal(body.strategy, "conditional-fusion");
  assert.notEqual(body.config.fallbackStrategy, "fusion");
  assert.equal(createComboSchema.safeParse(body).success, true);
});

test("update clears judge with null", () => {
  const form = emptyFusionForm();
  form.name = "x";
  form.panels = [{ kind: "model", model: "a/b" }];
  form.judge = null;
  const body = buildSavePayload(form, {}, "update");
  assert.equal(body.judge, null);
  assert.equal(updateComboSchema.safeParse(body).success, true);
});
```

### Patch B — extract sections

Move trigger UI + pattern inputs + fallback select into `FusionTriggersSection.tsx`; tuning grid into `FusionTuningSection.tsx`. Keep `FusionEditorClient` as load/save orchestrator.

### Patch C — a11y mode group

```tsx
<div role="radiogroup" aria-label={tx(t, "fusionTriggerMode", "Mode")}>
  {opts.map((opt) => (
    <button
      type="button"
      role="radio"
      aria-checked={form.triggers.mode === opt.value}
      ...
    />
  ))}
</div>
```

## Task Ledger Patch Suggestion

```markdown
## Review Ledger
### Latest Review
- Date: 2026-07-10
- Reviewer profile: reviewers
- Score: 87/100
- Verdict: REJECTED_TO_DOING
- Full report: docs/reports/reviews/2026-07-10-task-0016-omniroute-fusion-ui-editor-review.md
- Lane outcome: returned to doing
#### Current Open Blockers
- NEW F1: unit tests for fusionEditorTypes save/load matrix
- NEW F2: split FusionEditorClient toward ≤500 LOC
```
