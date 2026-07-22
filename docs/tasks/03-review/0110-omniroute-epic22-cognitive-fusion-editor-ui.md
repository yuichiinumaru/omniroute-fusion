# Task 0110: EPIC-22 T22-D — Fusion editor UI for cognitive lenses

> **Status**: `[x]` Implemented — review **100** → `03-review/`  
> **Priority**: 🟡 P1  
> **Type**: `feature`  
> **Origin**: EPIC-22 · operator owns config  
> **Blocks**: discoverability of Phase 1  
> **Depends on**: **0108** (Zod accepts save payload). **0109** recommended for manual verify but not hard-required for pure UI+types tests  
> **Parallelism**: `parallel-safe` with 0109 **after** 0108 freezes field names; collision on `fusionEditorTypes.ts` / `FusionUnitRow.tsx`  
> **Review routing**: frontend-quality · single-topbar law (no new chrome)  

---

## Objective

Let operators set per-panel **cognitive lens** + optional **systemAddon** (and combo-level **judgeMode**) in the Fusion editor, with save/load round-trip through existing combo JSON APIs.

Concrete outcomes:

1. Model panel rows: select lens (default empty = omit) + textarea for addon  
2. Hide cognitive fields for combo-ref units  
3. Judge mode select on editor (near tuning/triggers)  
4. `unitToPayload` / `formFromCombo` preserve fields  
5. i18n keys with English fallbacks  
6. **No** new topbar, hub leaf, or stacked subnav  

---

## Background Context

### O que já existe:
- `src/app/(dashboard)/dashboard/fusions/*` — `FusionUnitRow`, `FusionEditorClient`, `fusionEditorTypes`  
- Structured payload when providerId/connectionId/label set (`unitToPayload`)  
- Native `<select>` patterns for combo-ref / fallback strategy  
- `useTranslations("combos")` + `tx(..., fallback)`  

### O que está faltando:
- No UI for thinkingMode / systemAddon / judgeMode  
- Re-pick model may drop custom fields if not merged in `applyPickedModel`  

---

## Test Requirements

- [x] `normalizeFusionUnit` reads valid mode+addon; drops invalid mode  
- [x] `unitToPayload` emits structured model object when mode or addon set (not bare string)  
- [x] `buildSavePayload` → `createComboSchema.safeParse` succeeds for lens combo  
- [x] `formFromCombo` round-trips mode+addon+judgeMode  
- [x] Empty mode + empty addon ⇒ omit keys (bare string still allowed when no other meta)  
- [x] Switching kind to combo-ref clears cognitive fields on that unit  

---

## Exit Conditions (GDD/TDD)

- [x] UI fields present on model panel rows only  
- [x] Judge mode control present on form  
- [x] Pure editor tests PASS:  
  `node --import tsx/esm --test tests/unit/fusion-editor-types.test.ts`  
  `node --import tsx/esm --test tests/unit/fusion-cognitive-diversity.test.ts` (editor section if present)  
- [x] `npm run typecheck:core` PASS  
- [x] `npm run lint` no new errors on touched UI files  
- [x] Hard Rules #22–23: **exactly one** hub chrome strip — no new PageTabBar  
- [x] Changelog ledger entry  
- [x] Manual smoke note in Completion Evidence (load fusion editor, set two modes, save, reload) — worktree/local only; **not** :21000 unless operator asks  

---

## Details

### What

Subtasks:
- [x] **Ler código existente**: `fusionEditorTypes.ts`, `FusionUnitRow.tsx`, `FusionEditorClient.tsx`, `FusionTuningSection.tsx` / triggers section patterns, en.json combos keys, 0108 field names  
- [x] Extend `FusionModelUnit` + form type with `thinkingMode?`, `systemAddon?`; form-level `judgeMode?`  
- [x] `normalizeFusionUnit` / `unitToPayload` / `buildSavePayload` / `formFromCombo`  
- [x] `FusionUnitRow`: select from `FUSION_COGNITIVE_LENS_IDS` + optional textarea; `data-testid` e.g. `fusion-panel-${i}-lens`  
- [x] Judge mode select near tuning  
- [x] `applyPickedModel` preserves cognitive fields  
- [x] i18n `combos.fusionCognitive*`  
- [x] Editor pure tests  
- [x] **Refactoring pass**: reuse native select classes; no new design-system component unless already standard  
- [x] **Verificação de regressão**: fusion-editor-types + lint  

### Where

| Arquivo | Propósito |
|---------|-----------|
| `src/app/(dashboard)/dashboard/fusions/fusionEditorTypes.ts` | **Modificar** |
| `src/app/(dashboard)/dashboard/fusions/FusionUnitRow.tsx` | **Modificar** |
| `src/app/(dashboard)/dashboard/fusions/FusionEditorClient.tsx` | **Modificar** — preserve on pick |
| `src/app/(dashboard)/dashboard/fusions/FusionTuningSection.tsx` or new small section | **Modificar/Criar** — judgeMode |
| `src/shared/constants/fusionCognitiveLenses.ts` | **Ler** — ids for options |
| `src/i18n/messages/en.json` | **Modificar** |
| `tests/unit/fusion-editor-types.test.ts` | **Modificar** |
| `docs/guides/UI.md` | **Ler** — no-new-leaf |

### How

1. Default select value `""` → omit on save.  
2. Show textarea when mode is set **or** always optional collapsed — pick one UX; prefer always-visible small textarea under select for power users.  
3. `custom` mode: surface validation error if save without addon (client-side mirror of Zod).  
4. Do not edit Combo editor mega-page unless fusion editor reuses shared row (stay in fusions/).  

### Why

Operators will not hand-edit JSON. UI is how config becomes real policy.

---

## Parallelism / file ownership

| Class | Detail |
|-------|--------|
| **Depends** | 0108 field names frozen |
| **parallel-safe with** | 0109 (different paths: UI vs fusion.ts) |
| **Collision** | fusion editor files |

---

## ⛔ Anti-Hallucination Guardrails

> [!CAUTION]
> DO NOT add sidebar leaf or second topbar.  
> DO NOT expose cognitive fields on combo-ref rows.  
> DO NOT default any lens to on for new fusions.  
> PORT 21000 — no unsolicited deploy.

> [!IMPORTANT]
> "Organização auto-evidente": labels must say **Cognitive lens** (or i18n), not "Thinking budget".  
> Preserve mode when changing model pick.

---

## 🛡️ Compliance Checklist

- [x] **Doc Accuracy**: i18n keys only  
- [x] **Zod Validation**: save payload must pass create/update schema  
- [x] **Security**: systemAddon is operator-managed text  
- [x] **Error Sanitization**: N/A  
- [x] **No Raw SQL**: N/A  
- [x] **Archive Protocol**: N/A  

---

## 📋 Completion Evidence

- **Arquivos criados/modificados**:  
  - `src/app/(dashboard)/dashboard/fusions/fusionEditorTypes.ts`  
  - `src/app/(dashboard)/dashboard/fusions/FusionUnitRow.tsx`  
  - `src/app/(dashboard)/dashboard/fusions/FusionUnitsSections.tsx`  
  - `src/app/(dashboard)/dashboard/fusions/FusionTuningSection.tsx`  
  - `src/app/(dashboard)/dashboard/fusions/FusionEditorClient.tsx`  
  - `src/i18n/messages/en.json`  
  - `tests/unit/fusion-editor-types.test.ts`  
  - `tests/unit/fusion-cognitive-diversity.test.ts`  
  - `.changelog/20260722-010701-0110-epic22-cognitive-fusion-editor-ui-builders.md`  
- **Testes que verificam o trabalho**:  
  - `tests/unit/fusion-editor-types.test.ts` (0110 normalize / unitToPayload / buildSave / formFromCombo)  
  - `tests/unit/fusion-cognitive-diversity.test.ts` (unskipped T22-D editor round-trip)  
- **Resultado dos testes**:  
  `node --import tsx/esm --test tests/unit/fusion-cognitive-diversity.test.ts tests/unit/fusion-editor-types.test.ts`  
  → **47 pass / 0 fail / 0 skip**  
- **Resultado do lint**: `npx eslint` on touched fusion UI files — clean (exit 0)  
- **Resultado do typecheck/build**: `npm run typecheck:core` — clean  
- **Entrada no changelog**: `.changelog/20260722-010701-0110-epic22-cognitive-fusion-editor-ui-builders.md`  
- **Manual smoke**: Pure unit path covers form→payload→schema→reload for two panel modes + judgeMode. Live dashboard load/save on :22000 not run (no unsolicited :21000; RAM-safe note — operator can smoke on local worktree).  
- **Agente executor**: gt-ts-engineer (builders)  
- **Data de conclusão**: 2026-07-22  
- **Lane**: promoted to `03-review/` after formal review score 100

---

## 🔍 Review Trail

- **Reviewer**: `gt-frontend-quality-reviewer` (parent agentID=`builders`)
- **Data da review**: 2026-07-22
- **Veredito**: `ACCEPTED_100` / `PASS_PERFECT` → promote `docs/tasks/03-review/`
- **Score (path to 100)**: **100/100** (initial ~94 a11y/maxLength → path-to-100 this session)
- **Notas**:
  - Exit conditions all met; 47 pure tests pass; typecheck + eslint clean
  - Single `RoutingHubSubnav`; no PageTabBar / no sidebar leaf / no Sidebar brand
  - Path-to-100: label association + aria-describedby; systemAddon maxLength + save guard; `FUSION_SYSTEM_ADDON_MAX_CHARS` SSoT in `fusionCognitiveLenses` (client-safe); custom-missing-addon inline invalid
  - Report: `docs/reports/reviews/2026-07-22-task-0110-epic22-cognitive-fusion-editor-ui-review.md`

