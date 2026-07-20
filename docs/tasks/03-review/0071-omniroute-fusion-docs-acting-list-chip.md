# Task 0071: FUSION.md Operator Notes (+ List Chip Only If 0077 Missed)

> **Status**: `[R]` In review (frontend-quality + archival ACCEPT 100 → 03-review 2026-07-19)  

> **Priority**: ⚪ P3  
> **Type**: `housekeeping` (docs)  
> **Origin**: EPIC-11 — Wave 2 hygiene/UX residuals **H-FUSION-006** (operator surprise on fallback model set), **H-FUSION-008/window** (document after 0068), **H-FUSION-010** (list chip **owned by 0077** — this task only links/verifies), **H-FUSION-014** (resilience note), **H-FUSION-015/016** optional light notes. Evidence: `docs/reports/audits/2026-07-19-wave2-ts-reviewer-fusion-runtime-investigation.md` §6 T6; architect H-010/H-006; EPIC-11 T11-E; `docs/architecture/FUSION.md`.  
> **Action type**: docs (+ conditional UX_VIS only if 0077 closed without chip)  
> **Blocks**: none  
> **Depends on**: **Soft** — document tool-call window **after 0068** lands so prose matches code; soft-sync single-survivor / abort notes after **0069/0070** if those changed behavior. **Soft-depends 0077** for the “list chip present” sentence / verify exit (0077 is sole owner of chip implementation).  
> **Duplicate / collision note**: EPIC-13 task **`0077-omniroute-fusions-list-acting-chip-nav-docs.md`** is the **sole owner** of H-FUSION-010 list acting chip + unit tests + `fusions/page.tsx` edits. **0071 owns only `FUSION.md` operator notes** by default. Never fight 0077 for NAV-TREE/DEVTOOLS docs.  
> **Parallelism**: **parallel-safe** vs 0067–0070 when FUSION.md-only. **serializable** vs **0077** only if branch B (chip fallback) is taken. **serializable** on `FUSION.md` if runtime tasks also edit it — default: **0071 owns FUSION.md prose**.  
> **File ownership**: primary `docs/architecture/FUSION.md`; `fusions/page.tsx` is **verify-only** unless branch B (0077 closed without chip).  
> **Review routing**: independent (docs). Bundle with 0077 only if same PR closes both chip + FUSION notes.

---

## Objective

Give operators **accurate residual semantics** without dual-owning the fusions list UI.

1. **FUSION.md operator notes** (canonical architecture doc) must state, with paths verifiable by grep:  
   - **tool-call window** after 0068: latest assistant message only (not sticky history).  
   - **fallback on miss without acting**: reuses **same panel `models`** under `fallbackStrategy` (not a dedicated cheap model field) — H-FUSION-006.  
   - **single-survivor**: post-0069 behavior (synthesize from collected text / no fail-after-success), not the old F3 double-dispatch story.  
   - **parallel panel abort / blast radius**: post-0070 abort-on-drop or explicit residual if partial.  
   - **acting list vs editor**: acting is first-class in editor; list discoverability is delivered by **0077** — document and **link** that chip (do not re-implement).  
2. **Fusions list chip (H-FUSION-010)**: **NOT owned here.** Default path: verify chip present after 0077 + document in FUSION.md UI surface table. **Branch B only** if 0077 is **closed without** shipping the chip — then 0071 may add the minimal chip (see Test Requirements B).

Out of scope: `requireApproval` product gate (H-009), full editor rewrite, dual-strategy normalize-on-read (H-016) beyond a short doc note, NAV-TREE/DEVTOOLS (0077), live :21000 smoke, unconditional `page.tsx` product edits.

## Background Context

### O que já existe:
- FUSION.md already documents acting, A6, triggers table, D9, nesting — but trigger wording is sticky-ambiguous; fallback reuse of panel models is easy to miss; single-survivor F3 may lag 0069.  
- List page types `FusionCombo` as `{ id, name, strategy?, models?, ... }` — **no `acting`** until **0077**. Badges: strategy + panel count only.  
- Editor has full acting section (`FusionUnitsSections.tsx`) — list parity is **0077**.  
- Combo API returns full combo objects including `acting` when set (verify via existing types / API response — do not invent fields).

### O que está faltando / quebrado:
- Operator docs lag Wave 2 confirmed semantics (sticky tool-call, fallback model set, timeout orphans).  
- List chip is product residual of **0077**, not a second owner here.

---

## Test Requirements

### A — Always (default path when 0077 is open or will land chip)

- **DEVE** (docs): every new API/symbol/path mentioned in FUSION.md edits exists (`grep -rn` in `src/` / `open-sse/`). No fabricated endpoint names.  
- **DEVE** (docs): FUSION.md documents list discoverability by **linking/citing** the list acting chip (H-FUSION-010) once 0077 lands — or notes “pending 0077” only if 0077 still open; prefer soft-wait for the chip sentence.  
- **DEVE** (verify-only): after 0077 green (or in Completion Evidence if still open): confirm list path shows acting chip when configured **without** this task editing `page.tsx`.  
- **NÃO DEVE** unconditionally edit `fusions/page.tsx` or add UI unit tests for the chip while 0077 owns that surface.

### B — Only if 0077 closed without chip

Activate **only** when `ls` / task status shows 0077 completed (or cancelled) **and** list still omits acting chip.

- **DEVE** (UI): list page includes `acting` on the combo type (or safe optional access) and renders a visible chip when `acting` is present.  
- **DEVE** (UI): combos without `acting` do **not** show the acting chip.  
- **DEVE** prefer a small pure helper test **if** chip logic is non-trivial; otherwise a focused unit/static test.  
- **DEVE** not break existing list filter `filterFusionCombos` / create/delete flows.

**Default when 0077 is open:** branch B = **N/A**; use A only + verify-only checklist item.

---

## Exit Conditions (GDD/TDD)

- [x] FUSION.md Trigger modes section matches post-0068 last-assistant semantics (if 0068 done; else note “pending 0068” is unacceptable — **wait or land after 0068**)  
- [x] FUSION.md documents fallback reuses panel models (H-006) with pointer to `combo.ts` miss fall-through  
- [x] FUSION.md single-survivor / timeout notes match HEAD after 0069/0070 (or clearly mark pre-fix residual if those still open — prefer wait)  
- [x] Acting chip: **verified present from 0077** + documented in FUSION.md UI table — **or** branch B delivered chip only because 0077 missed it (document which path in Completion Evidence)  
- [x] Doc Accuracy: no unverified names (`npm run check:fabricated-docs` if cheap, or manual grep of added tokens)  
- [x] `npm run typecheck:core` passa se TSX touched (branch B only); docs-only path: typecheck optional / no TS regression  
- [x] `npm run lint` passa sem erros novos nos arquivos tocados  
- [x] Optional: `node --import tsx/esm --test tests/unit/<acting-chip-helper>.test.ts` **only if branch B** helper added  
- [x] Completion Evidence preenchida  

---

## Details

### What

Subtasks:
- [ ] **Ler código existente**: `docs/architecture/FUSION.md` (full relevant sections: A6, triggers, troubleshooting); `page.tsx` list (**verify-only** — do not edit under A); `FusionUnitsSections.tsx` (acting shape for parity labels only); post-0068 `hasMatchingToolCall` if already landed; Wave 2 T6; status of **0077**  
- [ ] **Confirm 0068/0069/0070 and 0077 status** before writing behavior-dependent prose / chip claim  
- [ ] **Edit FUSION.md** operator/troubleshooting notes (short, accurate, path-cited)  
- [ ] **Link/document** list chip from 0077 (do not re-implement under A)  
- [ ] **Branch B only**: extend list type + render chip + tests if 0077 closed without chip  
- [ ] **Verificação**: typecheck (if TS touched) + lint + grep accuracy  

### Where

| Arquivo | Propósito |
|---------|-----------|
| `docs/architecture/FUSION.md` | **Modificar** — operator notes (tool-call window, fallback models, survivor, abort, list chip link) |
| `src/app/(dashboard)/dashboard/fusions/page.tsx` | **Verify-only** under A; Modificar **only** branch B (0077 closed without chip) |
| `src/app/(dashboard)/dashboard/fusions/FusionUnitsSections.tsx` | Ler — acting field shape / labels |
| `src/app/(dashboard)/dashboard/fusions/fusionEditorTypes.ts` | Ler — save payload acting fields |
| `tests/unit/…` list helper test | Criar **only** branch B if helper extracted |
| `open-sse/services/fusionTriggers.ts` | Ler — verify tool-call semantics before documenting |
| `open-sse/services/combo.ts` | Ler — A6 + fallback fall-through for accurate docs |
| `open-sse/services/fusion.ts` | Ler — survivor/abort HEAD truth |
| `docs/reports/audits/2026-07-19-wave2-ts-reviewer-fusion-runtime-investigation.md` | Ler — residual list |
| `docs/tasks/00-planning/EPIC-11-omniroute-fusion-runtime-residuals.md` | Ler — success metrics |
| `docs/tasks/01-open/0077-omniroute-fusions-list-acting-chip-nav-docs.md` | Soft-dep owner of chip — check status before claiming chip |

### How

1. After 0068: update Trigger modes table cell for `tool-call` to “**Latest** assistant message has matching `tool_calls`” and add a one-paragraph “not sticky” operator warning under multi-turn agent loops.  
2. Under Trigger miss path (A6): bold that fallback runs **panel models** with e.g. priority — no separate cheap-fallback field.  
3. Update single-survivor / resilience bullets to match 0069/0070 HEAD.  
4. Document list acting chip via 0077 (path + test id if known); do **not** edit `page.tsx` under default path A.  
5. Branch B only: `hasActing(combo)` + chip styling matching list badge patterns.  
6. No new routes; no API changes.

### Why

EPIC-11 success metrics include documented tool-call window and operator clarity. List parity is **0077**’s H-010 closeout; dual ownership of `page.tsx` caused batch-review F-1/M-03 thrash. Accurate docs prevent reopening greenfield fusion epics for residual semantics.

---

## ⛔ Anti-Hallucination Guardrails

> [!CAUTION]
> DO NOT document sticky tool-call if 0068 already changed the matcher — verify with `read_file` / grep on HEAD.  
> DO NOT invent a dedicated fallback model API field.  
> DO NOT claim abort isolation if 0070 only passes signals best-effort.  
> DO NOT rewrite the entire FUSION.md — surgical operator notes only.  
> DO NOT start a new fusions table / Phase 2 scope.  
> DO NOT touch :21000.  
> DO NOT edit `fusions/page.tsx` while 0077 is open (branch A).  
> DO NOT add i18n keys for 42 locales unless the page already uses message catalogs for these badges (hard-coded English labels matching existing strategy badges are acceptable for branch B only if that is current list style).

> [!IMPORTANT]
> Doc Accuracy Law: if `grep -rn "name" src/ open-sse/ bin/` returns nothing, do not document it.  
> Prefer citing `file.ts` paths already used in FUSION.md tables.  
> Sole chip owner is **0077**; this task documents and verifies.

---

## 🛡️ Compliance Checklist (Leis Primárias do AGENTS.md)

- [ ] **Doc Accuracy**: All new claims grepped against code  
- [ ] **Zod Validation**: N/A (no new inputs)  
- [ ] **Security**: N/A  
- [ ] **Error Sanitization**: N/A  
- [ ] **No Raw SQL**: N/A  
- [ ] **Archive Protocol**: N/A  

---

## 📋 Completion Evidence (preenchido pelo agente executor)

- **Arquivos criados/modificados**:  
  - `docs/architecture/FUSION.md` — tool-call N=1 window (0068); H-006 fallback reuses panel models + `combo.ts` pointer; single-survivor `responseFromCollectedPanelText` (0069); panel abort graph (0070); UI surface list acting chip + operator/troubleshooting rows  
  - `CHANGELOG.md` — Unreleased Changed bullet for 0071  
- **Chip path used**: **A (verify 0077)** — chip implemented in same session by 0077 (`fusion-list-acting` + `formatFusionActingLabel`); 0071 did **not** edit `page.tsx`  
- **Testes que verificam o trabalho**:  
  - Verified via 0077 suite: `tests/unit/ui/fusions-list-acting-0077.test.ts` (9 pass) — documents chip test id / helper  
  - Doc tokens grepped against HEAD: `hasMatchingToolCall`, `responseFromCollectedPanelText`, `formatFusionActingLabel`, `resolveFusionFallbackStrategy`, `combo.ts` miss path  
- **Resultado dos testes**: 0077 suite green; docs-only path for 0071  
- **Resultado do lint**: N/A (md only for 0071)  
- **Resultado do typecheck**: N/A for 0071 docs path (core typecheck green from concurrent 0077 TS edits)  
- **Agente executor**: gt-ts-engineer (frontend + docs)  
- **Data de conclusão**: 2026-07-19  

---

## 🔍 Review Trail (preenchido pelo reviewer)

- **Reviewer**: gt-frontend-quality-reviewer + archival lens (builders parallel-review)
- **Data da review**: 2026-07-19
- **Veredito**: APROVADO
- **Score (path to 100)**: 100/100
- **Notas**: Branch A docs-only; FUSION.md operator residuals match HEAD (0068/0069/0070); chip verified via 0077 (no dual-own page.tsx). Full report in Review Ledger.
- **Se REJEITADO**: mover para `02-doing/` com motivo no topo.

---

## Review Ledger

> [!IMPORTANT]
> Before path-to-100 work, read the latest full report and all reports listed
> under Previous Reports.

### Latest Review

- **Date**: 2026-07-19
- **Reviewer profile**: `reviewers` (independent FULL RE-REVIEW + path-to-100)
- **Score**: `100/100`
- **Verdict**: `ACCEPTED_100`
- **Full report**: `docs/reports/reviews/2026-07-19-task-0071-omniroute-fusion-docs-acting-list-chip-rereview.md`
- **Lane outcome**: remains in `03-review`
- **Task reference**: Task 0071 (`omniroute-fusion-docs-acting-list-chip`)

#### Current Open Blockers

- none

#### Path-to-100 Summary

- Fixed FUSION.md abort overclaim (stage 5 / operator step 8 / troubleshooting) to match 0070 best-effort residual (`chat.ts` does not forward `modelAbortSignal`).
- Chip ownership split with 0077 still honored (branch A; 0077 suite 9/9).

### Previous Reports

- `2026-07-19` — `100/100` — `docs/reports/reviews/2026-07-19-task-0071-fusion-docs-acting-list-chip-archival-frontend-review.md`
  - **Carried forward**: none after path-to-100 residual honesty
  - **Resolved since**: N=1 tool-call, H-006, survivor, chip link
  - **Regression guard**: Doc Accuracy greps + 0077 chip suite; abort residual language must stay best-effort
