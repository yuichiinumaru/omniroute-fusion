# Task 0063: Epic 0004 Acting Closeout — Evidence Map + Status (Link EPIC-11 A6)

> **Status**: `[x]` Implementation complete — **promoted to `03-review/`** (docs-accuracy S=100, 2026-07-19)  
> **Priority**: 🔴 P0
> **Type**: `verification`
> **Origin**: EPIC-10 — Planning Hygiene (T10-B) + fusion residual status from Wave 1/2  
> Evidence: `docs/reports/audits/2026-07-19-omniroute-architect-fusion-residual-audit.md` §3,  
> `docs/reports/audits/2026-07-19-archivist-task-planning-coherence.md` (F-05),  
> `docs/reports/audits/2026-07-19-wave2-ts-reviewer-fusion-runtime-investigation.md` (A6 gap),  
> `docs/reports/audits/2026-07-19-architect-orchestrator-wave-synthesis.md` §3–4  
> Residual product tests tracked under **EPIC-11** (do not implement A6 tests here unless already present — map only)
> **Blocks**: False-gap re-decomposition of Acting as greenfield epic
> **Depends on**: none (soft: better after or parallel with **0062**; does not edit 0003/QUEUE)
> **Parallelism**: `parallel-safe` vs **0062** (different planning file ownership: only **0004** + evidence doc)
> **Review routing**: independent (docs/evidence); bundle with 0062 only if same PR convenience

---

## Objective

Close the **planning-status false gap** on Epic **0004** (Fusion Acting Unit): implementation is substantially complete in runtime/schema/UI/docs/tests, but the epic header still says **“Active (implementation in progress)”** with all acceptance boxes unchecked and no child task series.

Concrete result:

1. An **evidence map** in the epic (or linked short appendix under `docs/reports/` only if epic body would bloat) tying each 0004 acceptance checkbox to real files/tests.
2. Epic status updated to **Closed / Implementation complete** with an explicit residual: **combo-level A6 miss→acting-only tests** owned by **EPIC-11** (not re-opened as greenfield 0004 children).
3. No product feature work; no reimplementation of acting.

## Background Context

### O que já existe (Wave 1 shallow + Wave 2 confirm):
| Acceptance (Epic 0004) | Evidence surface |
|------------------------|------------------|
| Schema top-level `acting` | `src/shared/validation/schemas/combo.ts` (`createComboSchema` / `updateComboSchema`) |
| `resolveFusionUnits` returns acting | `open-sse/services/fusion.ts` |
| `handleFusionChatV2` handoff | `finalizeWithActing` in fusion runtime |
| combo miss + acting → acting only | `dispatchActingOnly` + gate in `open-sse/services/combo.ts` |
| UI Acting section | `FusionUnitsSections.tsx` / fusion editor save payload |
| Unit tests | `tests/unit/fusion-acting.test.ts` (resolve + V2 handoff) |
| Docs | `docs/architecture/FUSION.md` documents acting |
| Backward compat | no `acting` → judge final (A5) |

### O que está faltando / quebrado:
- Epic **0004** status still Active; ACs all `[ ]`.
- **No formal child tasks** ever promoted under 0004 (work absorbed alongside 0003 series + polish).
- Residual **P1 product**: combo-branch A6 tests missing in `tests/unit/combo-fusion-strategy.test.ts` (Wave 2) — **EPIC-11** scope, not this docs closeout.
- Comment/mental-model tension on `dispatchActingOnly` (implementation may be correct) — note only; do not “fix” code here.

---

## Test Requirements

- DEVE mapear **cada** acceptance bullet of Epic 0004 to at least one **verified** path (file exists; symbol exists via `grep`/`rg`).
- DEVE marcar status do epic como closed/complete **implementation** with residual pointer to `docs/tasks/00-planning/EPIC-11-omniroute-fusion-runtime-residuals.md` for A6 combo tests.
- DEVE NÃO criar tasks 0019-style greenfield acting series.
- DEVE NÃO editar fusion product code under `open-sse/services/fusion.ts` or `combo.ts` in this task.
- DEVE NÃO marcar A6 combo tests as done unless they already exist and are grepped true (if present, document; if absent, residual EPIC-11).

---

## Exit Conditions (GDD/TDD)

- [x] Epic **0004** header status no longer “Active (implementation in progress)” for open greenfield work
- [x] Evidence map table filled with **verified** file paths for schema, resolve, handoff, miss path, UI, unit tests, FUSION.md
- [x] Residual A6 combo-level tests explicitly linked to **EPIC-11** (not false-closed) — **note:** A6 combo tests **exist** (`combo-fusion-strategy.test.ts`); EPIC-11 residual is other fusion runtime polish, not “missing A6”
- [x] Acceptance checkboxes in 0004 either checked with evidence footnotes **or** replaced by “see evidence map” without claiming unproven A6 combo coverage
- [x] `rg`/`grep` verification recorded in Completion Evidence for each mapped symbol
- [x] No changes to `src/` / `open-sse/` product logic **by this task**
- [x] `npm run typecheck:core` passes (docs-only; no product TS edits)
- [x] Optional docs accuracy: any new code references in the map pass fabricated-name discipline (`grep` exists)
- [x] `CHANGELOG.md` TOP entry — planning closeout for Acting epic status (docs)
- [x] Completion Evidence filled

---

## Details

### What

Subtasks:
- [x] **Ler existentes**: Epic 0004 full file; FUSION.md acting sections; fusion residual audit §3; Wave 2 ts-reviewer report A6 notes; EPIC-11 planning file; files in evidence table via `rg`
- [x] **Prove surfaces**: For each AC, run `rg` for symbol/path; record line hits in Completion Evidence
- [x] **Check A6 combo tests**: `rg dispatchActingOnly|acting` in `tests/unit/combo-fusion-strategy.test.ts` (and related); if missing, residual → EPIC-11 only
- [x] **Edit Epic 0004**: status header; evidence map; residual section; do not invent new product ACs
- [x] **Cross-link**: EPIC-10 theme T10-B satisfied; mention Task 0062 does not own 0004
- [x] **Refactoring pass**: Keep epic body; avoid rewriting Goal/Locked decisions
- [x] **Verificação**: re-read status; ensure agents cannot treat 0004 as open implementation epic

### Where

| Arquivo | Propósito |
|---------|-----------|
| `docs/tasks/00-planning/0004-omniroute-fusion-acting-unit-epic.md` | Modificar — status + evidence map + residual |
| `docs/tasks/00-planning/EPIC-10-omniroute-planning-hygiene-closeout.md` | Ler — T10-B scope |
| `docs/tasks/00-planning/EPIC-11-omniroute-fusion-runtime-residuals.md` | Ler — A6 residual owner |
| `docs/architecture/FUSION.md` | Ler — acting claims verification |
| `docs/reports/audits/2026-07-19-omniroute-architect-fusion-residual-audit.md` | Ler — evidence baseline |
| `docs/reports/audits/2026-07-19-wave2-ts-reviewer-fusion-runtime-investigation.md` | Ler — A6 gap |
| `src/shared/validation/schemas/combo.ts` | Ler — `acting` field (no edit) |
| `open-sse/services/fusion.ts` | Ler — resolve / finalizeWithActing (no edit) |
| `open-sse/services/combo.ts` | Ler — dispatchActingOnly / gate (no edit) |
| `tests/unit/fusion-acting.test.ts` | Ler — unit coverage (no edit) |
| `tests/unit/combo-fusion-strategy.test.ts` | Ler — confirm A6 absence/presence |
| `src/app/(dashboard)/dashboard/fusions/` (editor sections) | Ler — UI Acting section paths |
| `CHANGELOG.md` | Modificar — docs status entry |

### How

1. Build the evidence map from live `rg`, not audit memory alone.
2. Update 0004 header to something like: **Closed (implementation complete 2026-07-19) — residual A6 combo tests → EPIC-11**.
3. In Acceptance section: check boxes that are code-true; leave A6 combo-branch as residual open **in EPIC-11**, not as “0004 still active”.
4. Add one paragraph: “Do not re-decompose Acting; false-gap rejected by Wave 1–2 audits.”
5. Changelog docs line only.

### Why

Archivist F-05 and fusion residual audit: agents see Active 0004 + unchecked ACs and may spawn greenfield acting epics while `finalizeWithActing` already ships. Closing with an evidence map + EPIC-11 residual pointer is the anti-idiot control for planning thrash.

---

## Parallelism / file ownership

| Class | Detail |
|-------|--------|
| **parallel-safe** | Yes vs 0062 (0003/0005–0008/QUEUE), 0064–0066 (harness) |
| **serializable** | Concurrent edits of `0004-…epic.md` only |
| **API blast radius** | None (docs) |

---

## ⛔ Anti-Hallucination Guardrails

> [!CAUTION]
> DO NOT check “Unit tests for miss path at combo gate” as complete without grepping `combo-fusion-strategy` (or equivalent) for acting cases.
> DO NOT implement EPIC-11 product tests inside this task.
> DO NOT claim Wave 2 runtime bugs (sticky tool-call, double upstream, panel timeout) are fixed by this closeout.

> [!IMPORTANT]
> First subtask is always prior inspection. Prefer citing `path:symbol` over paraphrasing behavior.
> Parent owns tasklist generation — do not create phantom 0004 child task files.

---

## 🛡️ Compliance Checklist (Leis Primárias do AGENTS.md)

- [x] **Doc Accuracy**: Every mapped API/path grepped
- [x] **Zod Validation**: N/A (no schema edits)
- [x] **Security**: N/A
- [x] **Error Sanitization**: N/A
- [x] **No Raw SQL**: N/A
- [x] **Archive Protocol**: No deletes of epic history

---

## 📋 Completion Evidence (preenchido pelo agente executor)

- **Arquivos criados/modificados**:
  - `docs/tasks/00-planning/0004-omniroute-fusion-acting-unit-epic.md` — status Closed; evidence map; ACs checked; EPIC-11 residual; anti-greenfield note (0062 does not own 0004)
  - `CHANGELOG.md` — shared TOP entry with Task **0062**
  - **No** product edits under `src/` / `open-sse/` / tests (read-only `rg`)
- **Testes que verificam o trabalho**: evidence `rg` (symbol existence), not product TDD for this docs task
  ```
  # schema
  src/shared/validation/schemas/combo.ts:270:  acting: comboModelEntry.optional(),
  src/shared/validation/schemas/combo.ts:327:    acting: comboModelEntry.optional().nullable(),
  # resolve + handoff
  open-sse/services/fusion.ts:620:export function resolveFusionUnits(
  open-sse/services/fusion.ts:670:async function finalizeWithActing(args: {
  # combo A6 gate
  open-sse/services/combo.ts:949:  const dispatchActingOnly = async (): Promise<Response | null> => {
  # unit + combo A6 tests
  tests/unit/fusion-acting.test.ts — resolveFusionUnits acting + handleFusionChatV2 handoff + legacy no-acting
  tests/unit/combo-fusion-strategy.test.ts:675+ — A6 miss+model, miss+combo-ref, stream/tools, immutability,
    miss+no acting fallback, hit still fuses
  # docs / UI
  docs/architecture/FUSION.md — 45 acting hits
  FusionUnitsSections.tsx — Acting section + scope:"acting"
  ```
- **Resultado dos testes**: all mapped symbols/paths grepped present; A6 combo tests **present** (Wave 2 gap closed in tree — documented; EPIC-11 still owns other residuals)
- **Resultado do lint**: N/A-docs
- **Resultado do typecheck/build**: docs-only; no product TS changes from this task
- **Entrada no changelog**: `CHANGELOG.md` → Unreleased → Changed → **Planning hygiene epic closeout (EPIC-10 / Tasks 0062 + 0063)**
- **Agente executor**: gt-ts-engineer (docs/planning hygiene) · parent `builders`
- **Data de conclusão**: 2026-07-19

---

## 🔍 Review Trail (preenchido pelo reviewer)

### Previous Reports
- `docs/reports/reviews/2026-07-19-task-0063.md` (builders docs-accuracy ACCEPT 100)

### Latest (independent FULL re-review, parent `reviewers`)
- **Reviewer**: independent FULL re-reviewer (parent agentID=`reviewers`)
- **Data da review**: 2026-07-19
- **Veredito**: **ACCEPTED_100**
- **Score (path to 100)**: **100**
- **Full report**: `docs/reports/reviews/2026-07-19-task-0063-acting-closeout-rereview.md`
- **Lane outcome**: remains in `03-review/` (parent promotes)
- **Notas**: Live re-grep: schema acting L270/327; resolveFusionUnits L640; finalizeWithActing L678; dispatchActingOnly L949; 6× A6 tests; UI Acting; FUSION.md 53 hits. EPIC-11 H-FUSION-003 residual still out of ownership.
- **Se REJEITADO**: mover para `02-doing/` com motivo documentado no topo.

---

## Review Ledger

> [!IMPORTANT]
> Before path-to-100 work, read the latest full report and all reports listed under Previous Reports.

### Latest Review

- **Date**: 2026-07-19
- **Reviewer profile**: `reviewers`
- **Score**: `100/100`
- **Verdict**: `ACCEPTED_100`
- **Full report**: `docs/reports/reviews/2026-07-19-task-0063-acting-closeout-rereview.md`
- **Lane outcome**: remains in review
- **Task reference**: Task 0063 (`omniroute-epic-0004-acting-closeout-evidence`)

#### Current Open Blockers

- None in 0063 ownership.
- `EXTERNAL` (non-blocking): EPIC-11 may still claim missing A6 combo tests — separate epic.

#### Path-to-100 Summary

- Closed — evidence map verified live; do not re-open 0004 greenfield; do not uncheck A6 without re-grepping combo-fusion-strategy.
