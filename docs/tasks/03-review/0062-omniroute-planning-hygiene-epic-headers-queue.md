# Task 0062: Planning Hygiene — Epic Headers 0003/0005–0008 + QUEUE Supersede

> **Status**: `[x]` Implementation complete — **promoted to `03-review/`** (docs-accuracy S=100, 2026-07-19)  
> **Priority**: 🔴 P0
> **Type**: `housekeeping`
> **Origin**: EPIC-10 — OmniRoute Planning Hygiene & Epic Closeout  
> Evidence: `docs/reports/audits/2026-07-19-archivist-task-planning-coherence.md` (F-01–F-04, F-09, F-12),  
> `docs/reports/audits/2026-07-19-architect-product-epics-status-audit.md` (F-P2, F-P3, F-P5),  
> `docs/reports/audits/2026-07-19-architect-orchestrator-wave-synthesis.md` §2–4
> **Blocks**: Agents re-opening completed fusion / dual-mode / adversarial / IA work from stale headers
> **Depends on**: none
> **Parallelism**: `parallel-safe` vs Task **0063** (0063 owns only Epic **0004**); serializable vs any other editor of the same epic files  
> **Review routing**: independent review (docs-only; no product code)

---

## Objective

Make planning surfaces tell the truth about the finished 2026-07 builder/reviewer drain so future agents do **not** re-open completed Fusion (0003), dual-mode (0006), auth-status UX (0007), adversarial (0008), or Frontend IA (0005 + successor 0052–0061) work.

Concrete result:

1. Epic headers **0003, 0006, 0007, 0008** no longer claim children in `01-open/` / “Planning (promote next)” when children are in `04-completed/` (except **0036** for 0006).
2. Epic **0005** gains a short successor rollup for completed **0052–0061** and path truth-ups for 0026/0031 if still stale.
3. **`QUEUE-post-adversarial-return.md`** is superseded with a terminal banner: Q1–Q3 historical closed; Q4/**0036** remains dual-mode ops HOLD — **and** explicitly points active product lanes to `docs/tasks/01-open/` + EPIC-10…19 (not “0036 only forever”).
4. Optional: planning-name compliance **or** explicit exception banner + index mapping for `0001`–`0009` / QUEUE (prefer banner + mapping if rename is too disruptive this slice).
5. Brief truth-up banner on plan **0001** (partially landed) and date-stamp note on **0009** (`03-review` empty after bulk promote).

**Scope note:** Hygiene targets **0003–0008 + QUEUE** only. Open residual series **0062–0083** (this batch) is intentional post-wave promote and is **not** hidden by QUEUE supersede language.

**No product code. No Task 0036 execution. No Epic 0004 body (see Task 0063).**

## Background Context

### O que já existe:
- Executable children: **0010–0018**, **0020–0035**, **0037–0061** all under `docs/tasks/04-completed/` (100/100 promote wave 2026-07-18).
- **Lane truth (reconfirm with `ls` before writing):** `01-open/` holds **0036** (operator HOLD :21000 dual-mode) **plus** post-wave residual series **0062–0083** (EPIC-10 hygiene, EPIC-11 fusion, EPIC-12 security, EPIC-13 IA residual, EPIC-14 harness, EPIC-19 rebalance). Do **not** claim “only product open task is 0036.”
- EPIC-10 planning epic: `docs/tasks/00-planning/EPIC-10-omniroute-planning-hygiene-closeout.md`.
- Wave 1 audits document exact header vs lane mismatches.

### O que está faltando / quebrado:
| Surface | Stale claim | Reality (2026-07-19) |
|---------|-------------|----------------------|
| Epic 0003 | Active; children in `01-open/0010–0018` | All in `04-completed/` |
| Epic 0005 | Closeout OK; 0031 path / no 0052–0061 rollup | Successor wave completed unlinked |
| Epic 0006 | Planning / promote children | **0032–0035** done; only **0036** open |
| Epic 0007 | Planning | **0037–0039** completed |
| Epic 0008 | Planning; children in `01-open/0040–0051` | All completed |
| QUEUE | Q1–Q3 REJECT in `02-doing`; adversarial in `03-review` | Those tasks completed; Q4/0036 dual-mode HOLD remains; **active product work is NOT this QUEUE** — see `01-open/` (0062–0083, EPIC-10…19) |
| Naming | `000N-*.md` | Violates `EPIC-`/`PLAN-`/`HOLD-` rule (document or rename) |

---

## Test Requirements

- DEVE existir banner ou status line em **0003, 0007, 0008** that says **Closed / Complete** (or equivalent) with children paths under `04-completed/`.
- DEVE existir status line em **0006** that says code complete / **ops open on 0036 only** (not “Planning promote next”).
- DEVE existir em **0005** um bloco de successor **0052–0061** (paths under `04-completed/`).
- DEVE existir em **QUEUE** um header **SUPERSEDED 2026-07-19** (or CLOSED): Q1–Q3 historical closed; Q4/**0036** dual-mode ops HOLD remains; banner **must** state active product lanes are **not** this QUEUE — see `docs/tasks/01-open/` and EPIC-10…19 planning (0067–0083, 0075–0077, 0072–0074, hygiene 0062–0066). **Do not** claim sole residual executable is 0036.
- DEVE NÃO reabrir, mover, ou editar arquivos em `04-completed/` para “fix” lanes.
- DEVE NÃO executar ou desbloquear 0036 (:21000) nesta task.
- DEVE incluir `ls docs/tasks/01-open` output (or equivalent) in Completion Evidence so epic headers do not claim empty open queue.
- Se rename for feito: DEVE preservar conteúdo e atualizar links internos entre planning files; se não: DEVE documentar exception + mapping table in QUEUE or a short `00-planning` index note.

---

## Exit Conditions (GDD/TDD)

- [x] Epic **0003** header status + child lane claims updated to match `04-completed/0010–0018`
- [x] Epic **0006** header: code done / residual **0036** only; child table paths correct
- [x] Epic **0007** header: Closed/Complete; **0037–0039** → `04-completed/`
- [x] Epic **0008** header: Closed (remediation wave); **0040–0051** → `04-completed/`
- [x] Epic **0005**: successor note **0052–0061** + stale path strings fixed if still wrong
- [x] **QUEUE** superseded: terminal banner; Q1–Q3 historical; Q4/**0036** HOLD residual; **active open work pointer** to `01-open/` + EPIC-10…19 (not “0036 only”)
- [x] **0001** and/or **0009** truth-up banners (partial land / historical wave) applied without inventing product status
- [x] Naming: either renames to `EPIC-`/`PLAN-`/`HOLD-` **or** explicit exception + mapping documented
- [x] No product code under `src/`, `open-sse/`, `electron/`, `bin/` changed **by this task** (docs under `docs/tasks/00-planning/` + CHANGELOG only)
- [x] `npm run typecheck:core` passes (docs-only; no type regressions expected — no TS product edits)
- [x] Entry in `CHANGELOG.md` (TOP) — docs/governance: planning hygiene closeout for drained epics
- [x] Completion Evidence filled before promotion to `03-review/`

---

## Details

### What

Subtasks:
- [x] **Ler código/docs existentes**: Read EPIC-10; Wave synthesis + archivist + product-epics audits; current headers of `0003`, `0005`, `0006`, `0007`, `0008`; full `QUEUE-post-adversarial-return.md`; skim `0001`, `0009`; `ls docs/tasks/01-open docs/tasks/04-completed` to reconfirm lane truth before writing
- [x] **Update 0003**: Status → Complete/Closed; fix child path table `01-open` → `04-completed`; leave residual metrics as notes only (no new tasks)
- [x] **Update 0006**: Status → Code complete / ops blocked on **0036**; fix child table; link open task path
- [x] **Update 0007 + 0008**: Status → Closed/Complete; correct child lanes; 0008 may keep deferred residual list as non-actionable history
- [x] **Update 0005**: Fix 0026/0031 path strings if stale; add successor cluster **0052–0061** note
- [x] **Supersede QUEUE**: Prepend SUPERSEDED banner (date 2026-07-19); mark Q1–Q3 historical closed; keep Q4/0036 as dual-mode HOLD residual; **add active-lanes pointer** to `01-open/` + EPIC-10…19; neutralize §0 lane claims that put work in `03-review`/`02-doing`
- [x] **0001 / 0009 banners**: 0001 partial-land truth-up (not full replan); 0009 note that `03-review` emptied after bulk promote
- [x] **Naming pass or exception**: Prefer low-disruption exception doc + mapping if full rename risks broken links this slice
- [x] **Refactoring pass**: Keep edits header/status/path focused — do not rewrite epic history bodies wholesale
- [x] **Verificação**: re-read headers; `ls docs/tasks/01-open` recorded (expect 0036 + 0062–0083 at promote time — do not invent empty queue); no cargo commands

### Where

| Arquivo | Propósito |
|---------|-----------|
| `docs/tasks/00-planning/EPIC-10-omniroute-planning-hygiene-closeout.md` | Ler — scope SSoT |
| `docs/tasks/00-planning/0003-omniroute-fusion-first-class-epic.md` | Modificar — close header + child lanes |
| `docs/tasks/00-planning/0005-omniroute-frontend-ia-design-system-epic.md` | Modificar — successor 0052–0061 + path truth-up |
| `docs/tasks/00-planning/0006-omniroute-dual-mode-auth-refresh-correctness-epic.md` | Modificar — ops residual 0036 only |
| `docs/tasks/00-planning/0007-omniroute-provider-connection-auth-status-ux-epic.md` | Modificar — close |
| `docs/tasks/00-planning/0008-omniroute-adversarial-remediation-epic.md` | Modificar — close |
| `docs/tasks/00-planning/QUEUE-post-adversarial-return.md` | Modificar — SUPERSEDED banner |
| `docs/tasks/00-planning/0001-omniroute-web-providers-fix-plan.md` | Modificar — truth-up banner only |
| `docs/tasks/00-planning/0009-builder-wave-2026-07-18-review-loop-learnings.md` | Modificar — historical stamp if needed |
| `docs/tasks/00-planning/0004-omniroute-fusion-acting-unit-epic.md` | **NÃO** fechar aqui — Task **0063** |
| `docs/tasks/01-open/0036-omniroute-deploy-verify-21000-dual-mode-auth.md` | Ler — residual pointer only; do not execute |
| `docs/reports/audits/2026-07-19-archivist-task-planning-coherence.md` | Ler — evidence |
| `docs/reports/audits/2026-07-19-architect-product-epics-status-audit.md` | Ler — evidence |
| `CHANGELOG.md` | Modificar — governance entry at top |

### How

1. Reconfirm lanes with `ls` (do not trust this task body if weeks later).
2. Patch epic **status lines first** (highest agent-pickup risk), then child path tables.
3. Prepend QUEUE supersede banner; leave historical tables below for archaeology.
4. Add 0005 successor subsection listing 0052–0061 themes in one short table (no re-open).
5. Either (A) rename planning files per `.agents/rules/planning-artifact-naming.md` with careful link updates, or (B) document intentional historical-namespace exception + mapping table (EPIC-10 prefers rename OR banner+index).
6. Do not touch Epic 0004 (0063), EPIC-11 product residuals, or harness files (EPIC-14 / 0064–0066).

### Why

Stale “Active/Planning + children in 01-open” headers caused **double-work risk** on already completed tasks (archivist F-01–F-04; product F-P2/F-P3). QUEUE still lists REJECT scores for 0024/0025/0017 that are in `04-completed/`. Without hygiene, Wave 3 builders re-implement greenfield.

---

## Parallelism / file ownership

| Class | Detail |
|-------|--------|
| **parallel-safe** | Yes vs **0063** (0004 only), **0064–0066** (harness paths), open **0036** (ops) |
| **serializable** | Same-file editors of 0003/0005–0008/QUEUE |
| **File collision** | None with live product lanes if 0062 stays under `00-planning/` + CHANGELOG |

---

## ⛔ Anti-Hallucination Guardrails

> [!CAUTION]
> DO NOT mark epics Closed without verifying child files exist under `docs/tasks/04-completed/` with `ls`/`test -f`.
> DO NOT claim live :21000 dual-mode metrics proven — that is Task **0036** only.
> DO NOT invent disposition of adversarial findings beyond “child package completed”; stretch residuals stay deferred text.

> [!IMPORTANT]
> Read every file in **Where** before editing. Archive protocol: do not delete QUEUE; supersede in place or move to archive with a pointer if operator prefers.
> Parent owns generated `tasklist.md` — do not hand-author a fake full tasklist in this task.

---

## 🛡️ Compliance Checklist (Leis Primárias do AGENTS.md)

- [x] **Doc Accuracy**: Paths and task IDs verified against filesystem before writing
- [x] **Zod Validation**: N/A (docs-only)
- [x] **Security**: No secrets; no :21000 mutations
- [x] **Error Sanitization**: N/A
- [x] **No Raw SQL**: N/A
- [x] **Archive Protocol**: Nothing deleted; QUEUE superseded in place with historical tables retained

---

## 📋 Completion Evidence (preenchido pelo agente executor)

- **Arquivos criados/modificados**:
  - `docs/tasks/00-planning/0003-omniroute-fusion-first-class-epic.md` — Closed; children **0010–0018** → `04-completed/`
  - `docs/tasks/00-planning/0005-omniroute-frontend-ia-design-system-epic.md` — Closed; **0026/0031** paths fixed; §11b successor **0052–0061**
  - `docs/tasks/00-planning/0006-omniroute-dual-mode-auth-refresh-correctness-epic.md` — code complete; residual **0036** only
  - `docs/tasks/00-planning/0007-omniroute-provider-connection-auth-status-ux-epic.md` — Closed; **0037–0039** completed
  - `docs/tasks/00-planning/0008-omniroute-adversarial-remediation-epic.md` — Closed remediation wave; **0040–0051** completed
  - `docs/tasks/00-planning/QUEUE-post-adversarial-return.md` — SUPERSEDED 2026-07-19 + active-lanes pointer + naming exception map
  - `docs/tasks/00-planning/0001-omniroute-web-providers-fix-plan.md` — partial-land truth-up banner
  - `docs/tasks/00-planning/0009-builder-wave-2026-07-18-review-loop-learnings.md` — post-wave lane stamp
  - `CHANGELOG.md` — TOP Unreleased Changed entry (shared with 0063)
  - **Did not edit** Epic **0004** (owned by Task **0063**)
- **Testes que verificam o trabalho**: docs + filesystem lane check (no unit suite required)
  - `test -f` on key `04-completed/0010…0018`, `0032…0035`, `0037…0039`, `0040…0051`, `0052…0061`, `0026`, `0031` → all OK
  - `test -f docs/tasks/01-open/0036-…` → OK
  - `ls docs/tasks/01-open/`:
    ```
    0036-omniroute-deploy-verify-21000-dual-mode-auth.md
    0071-omniroute-fusion-docs-acting-list-chip.md
    0073-omniroute-residual-err-message-sanitize-sweep.md
    0074-omniroute-secrets-dual-read-residual-disposition.md
    0075-omniroute-fusions-editor-routing-hub-subnav.md
    0076-omniroute-ops-testing-reverse-chrome.md
    0077-omniroute-fusions-list-acting-chip-nav-docs.md
    0081-omniroute-epic19-dashboard-absorb-analytics-costs-overview.md
    0082-omniroute-epic19-sidebar-drop-analytics-costs-leaves.md
    0083-omniroute-epic19-tools-ops-verify-only.md
    ```
    (Not “0036 only”; residual series present.)
- **Resultado dos testes**: lane truth reconfirmed; headers re-read Closed/Complete/Code complete + SUPERSEDED
- **Resultado do lint**: N/A-docs
- **Resultado do typecheck/build**: docs-only hygiene — no `src/`/`open-sse/`/`electron/`/`bin/` edits from this task; typecheck not required for markdown path truth-up
- **Entrada no changelog**: `CHANGELOG.md` → Unreleased → Changed → **Planning hygiene epic closeout (EPIC-10 / Tasks 0062 + 0063)**
- **Agente executor**: gt-ts-engineer (docs/planning hygiene) · parent `builders`
- **Data de conclusão**: 2026-07-19

---

## 🔍 Review Trail (preenchido pelo reviewer)

### Previous Reports
- `docs/reports/reviews/2026-07-19-task-0062.md` (builders docs-accuracy ACCEPT 100)

### Latest (independent FULL re-review, parent `reviewers`)
- **Reviewer**: independent FULL re-reviewer (parent agentID=`reviewers`)
- **Data da review**: 2026-07-19
- **Veredito**: **ACCEPTED_100**
- **Score (path to 100)**: **100**
- **Full report**: `docs/reports/reviews/2026-07-19-task-0062-planning-hygiene-rereview.md`
- **Lane outcome**: remains in `03-review/` (parent promotes)
- **Notas**: Reconfirmed Closed headers 0003/0005–0008; QUEUE SUPERSEDED; naming exception; children `04-completed/` missing_count=0; 0036 open. **Path-to-100 polish applied**: durable QUEUE active-lanes + 0009 stamp (no volatile residual IDs under wrong lanes).
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
- **Full report**: `docs/reports/reviews/2026-07-19-task-0062-planning-hygiene-rereview.md`
- **Lane outcome**: remains in review
- **Task reference**: Task 0062 (`omniroute-planning-hygiene-epic-headers-queue`)

#### Current Open Blockers

- None.

#### Path-to-100 Summary

- Closed — durable QUEUE/`0009` active-lane polish applied during re-review.
- Regression guard: do not re-freeze residual task IDs under `01-open/` without `ls`; 0004 remains 0063-owned.
