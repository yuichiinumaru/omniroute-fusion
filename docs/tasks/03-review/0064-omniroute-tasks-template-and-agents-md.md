# Task 0064: Restore `docs/tasks/000-template.md` + Lean `docs/tasks/AGENTS.md`

> **Status**: `[x]` Review-ready — independent docs-accuracy ACCEPT 100 (2026-07-19); promote to `03-review`
> **Priority**: 🔴 P0
> **Type**: `governance`
> **Origin**: EPIC-14 — OmniRoute Child Harness Localization (T14-A)  
> Evidence: `docs/reports/audits/2026-07-19-harness-architect-meta-governance-audit.md` (F2, F3),  
> `docs/reports/audits/2026-07-19-wave2-mechanical-harness-evidence.md` (H-HARNESS-02/03),  
> `docs/reports/audits/2026-07-19-architect-orchestrator-wave-synthesis.md` §3 harness P0s
> **Blocks**: Task **0065** (DoD overlay must point at live template); all future `gt-create-tasks` fidelity
> **Depends on**: none
> **Parallelism**: `serializable` before **0065**; `parallel-safe` vs **0062/0063** (planning) and **0066** (skills/sqlite/memories) if paths do not overlap
> **Review routing**: independent governance review; bundle with 0065 when both ready

---

## Objective

Restore the **live** OmniRoute task governance surfaces required by onboard and create-tasks:

1. **`docs/tasks/000-template.md`** — restore from archive npm-oriented template (not cargo/Khala).
2. **`docs/tasks/AGENTS.md`** — lean child constitution for task lanes, numbering, evidence, OmniRoute exit matrix, and pointers to root `AGENTS.md` / Hard Rules.

Success = onboard Step 1.2 and create-tasks pre-reqs are **satisfiable on disk** without agents inventing protocol.

## Background Context

### O que já existe:
- Archive template: `docs/tasks/.archive/000-template-moved-to-parent.md` — **OmniRoute** header, ≥50 lines, npm exits (`typecheck:core`, `lint`, `test:all` subset).
- Lanes: `00-planning/` … `04-completed/` operational with 50+ completed tasks.
- Root `AGENTS.md` / `CLAUDE.md` product rules (ports, worktrees, Hard Rules).
- `.agents/rules/task-numbering.md`, `planning-artifact-naming.md`, `definition-of-done.md` (parent, cargo-centric — overlay is **0065**).

### O que está faltando / quebrado:
| Asset | Live status |
|-------|-------------|
| `docs/tasks/000-template.md` | **MISSING** (H-HARNESS-03) → **RESTORED** (this task) |
| `docs/tasks/AGENTS.md` | **MISSING** (H-HARNESS-02) → **CREATED** (this task) |
| `docs/tasks/tasklist.md` | Missing — **parent owns generated surfaces**; this task documents “do not hand-edit / parent regenerates”, does **not** invent a full ledger unless parent process is available |

---

## Test Requirements

- DEVE existir `docs/tasks/000-template.md` with ≥50 lines and npm-oriented Exit Conditions (**never** `cargo check` / `cargo test` as required exits).
- DEVE existir `docs/tasks/AGENTS.md` that states: lane dirs, template mandatory, first subtask “read existing”, numbering pointer, OmniRoute npm matrix, CHANGELOG product surface (`CHANGELOG.md` root — dual-mode note if `.changelog/` absent).
- DEVE referenciar archive as provenance without leaving template only in `.archive/`.
- DEVE NÃO copiar Khala/Rust/Surreal DoD into the template as mandatory.
- DEVE NÃO reescrever parent `.agents/workflows/gt-create-tasks.md` in this task (recipe overlay = **0065**).

---

## Exit Conditions (GDD/TDD)

- [x] `test -f docs/tasks/000-template.md` succeeds
- [x] `test -f docs/tasks/AGENTS.md` succeeds
- [x] Template Exit Conditions include `npm run typecheck:core` (or documented subset) and **exclude** cargo as required
- [x] Template retains: Objective, Background, Test Requirements, Exit Conditions, Details (What/Where/How/Why), Anti-Hallucination, Compliance, Completion Evidence, Review Trail
- [x] `docs/tasks/AGENTS.md` covers lanes `00–04`, promote rules summary, parallel-safe note expectation, and “parent owns tasklist”
- [x] Onboard pre-req readable: agent can open `docs/tasks/AGENTS.md` without 404
- [x] No product runtime code changes
- [x] `npm run typecheck:core` passes
- [x] `CHANGELOG.md` TOP — governance: restore task template + tasks AGENTS
- [x] Completion Evidence filled

---

## Details

### What

Subtasks:
- [x] **Ler existentes**: archive template; EPIC-14; harness audit F2/F3; mechanical H-HARNESS-02/03; sample open task `0036` + one completed task for local conventions; `.agents/rules/task-numbering.md`; `gt-create-tasks.md` pre-req lines (read-only)
- [x] **Restore template**: Copy/adapt archive → `docs/tasks/000-template.md`; ensure numbering note, npm exits, CHANGELOG product path; add optional Parallelism section stub if useful for OmniRoute
- [x] **Author lean AGENTS.md**: Task system constitution only (not full product AGENTS clone). Sections: purpose, lanes, template, create/promote/review rules summary, exit matrix (npm), evidence, numbering, planning vs executable, parent-owned tasklist, link to root AGENTS for Hard Rules / ports
- [x] **Cross-check**: No cargo required exits; no Surreal `.bind()` as OmniRoute law
- [x] **Refactoring pass**: Keep AGENTS.md short (prefer <200 lines); template complete but not novel process invention
- [x] **Verificação**: `test -f` both paths; greps for `cargo check` must be zero in template required exits

### Where

| Arquivo | Propósito |
|---------|-----------|
| `docs/tasks/.archive/000-template-moved-to-parent.md` | Ler — source of truth to restore |
| `docs/tasks/000-template.md` | **Criar** — live template |
| `docs/tasks/AGENTS.md` | **Criar** — lean task constitution |
| `docs/tasks/00-planning/EPIC-14-omniroute-child-harness-localization.md` | Ler — T14-A scope |
| `docs/reports/audits/2026-07-19-harness-architect-meta-governance-audit.md` | Ler — F2/F3 |
| `docs/reports/audits/2026-07-19-wave2-mechanical-harness-evidence.md` | Ler — H-HARNESS-02/03 |
| `.agents/rules/task-numbering.md` | Ler — numbering SSoT pointer |
| `.agents/workflows/gt-create-tasks.md` | Ler — pre-reqs (no edit here) |
| `docs/tasks/01-open/0036-omniroute-deploy-verify-21000-dual-mode-auth.md` | Ler — convention sample |
| `CHANGELOG.md` | Modificar — governance entry |

### How

1. Read archive template end-to-end; restore to live path with minimal diff (OmniRoute npm template already correct).
2. Write `docs/tasks/AGENTS.md` as a **child** doc: “This repo is Node/Next/npm/SQLite OmniRoute; task DoD uses npm matrix; see root AGENTS.md for product Hard Rules.”
3. Explicitly state: generated `tasklist.md` is parent/harness-owned; missing file is not an invitation to hand-write a stale full inventory in-PR unless operator runs sync.
4. Hand off to **0065** for DoD overlay + create-tasks exit recipe that **points at** these restored files.

### Why

Create-tasks and onboard **hard-require** these paths. Without them, every Wave invents shape and re-imports cargo exits (mechanical CONFIRMED). Template restore is the critical path for all subsequent task promotion quality.

---

## Parallelism / file ownership

| Class | Detail |
|-------|--------|
| **parallel-safe** | vs 0062/0063/0066 |
| **serializable** | Must complete before **0065** references live template path |
| **Collision** | Do not parallel-edit template with 0065 DoD text until 0064 lands |

---

## ⛔ Anti-Hallucination Guardrails

> [!CAUTION]
> DO NOT mark complete if only archive path exists.
> DO NOT paste Rust `mod.rs` / Surreal / cargo laws into OmniRoute template required exits.
> DO NOT create `docs/tasklist.md` fake content claiming full sync without parent tool — document ownership only.

> [!IMPORTANT]
> First subtask: read archive + EPIC-14 + audits before writing.
> Product CHANGELOG is root `CHANGELOG.md` (H-HARNESS-09); note dual-mode if DoD still mentions `.changelog/`.

---

## 🛡️ Compliance Checklist (Leis Primárias do AGENTS.md)

- [x] **Doc Accuracy**: Paths verified (`test -f`; greps against live files)
- [x] **Zod Validation**: N/A — docs-only governance
- [x] **Security**: N/A — docs-only governance
- [x] **Error Sanitization**: N/A — docs-only governance
- [x] **No Raw SQL**: N/A — docs-only governance
- [x] **Archive Protocol**: Archive retained; live path is copy/restore not delete-only

---

## 📋 Completion Evidence (preenchido pelo agente executor)

- **Arquivos criados/modificados**:
  - `docs/tasks/000-template.md` (created — 187 lines; from archive + Parallelism stub + npm matrix notes)
  - `docs/tasks/AGENTS.md` (created — 156 lines; lean lanes / npm exits / parent tasklist)
  - `CHANGELOG.md` (TOP Unreleased → Changed governance bullet)
  - `docs/tasks/02-doing/0064-omniroute-tasks-template-and-agents-md.md` (this file — evidence only; **not moved**)
  - Archive `docs/tasks/.archive/000-template-moved-to-parent.md` **retained** (not deleted)
- **Testes que verificam o trabalho**:
  - `test -f docs/tasks/000-template.md` → success
  - `test -f docs/tasks/AGENTS.md` → success
  - Template required exits list `npm run typecheck:core` / lint / targeted tests; cargo appears only as **forbidden** guidance (not a checkbox required exit)
  - `rg "cargo (check|test)" docs/tasks/000-template.md` → single advisory line (“Do not list…”)
- **Resultado dos testes**: PASS — both paths exist; TEMPLATE_OK / AGENTS_OK
- **Resultado do lint**: N/A (docs-only; no product source edited)
- **Resultado do typecheck/build**: `npm run typecheck:core` → PASS (exit 0)
- **Entrada no changelog**: `CHANGELOG.md` `[Unreleased]` → **Changed** — Task governance surfaces restored (EPIC-14 / Task 0064)
- **Agente executor**: gt-ts-engineer (governance) / builders parent
- **Data de conclusão**: 2026-07-19

---

## 🔍 Review Trail (preenchido pelo reviewer)

### Previous Reports
- `docs/reports/reviews/2026-07-19-task-0064-0078-path-to-100-gt-ts-expert.md` (builders path-to-100)
- `docs/reports/reviews/2026-07-19-task-0064.md` (docs-accuracy independent ACCEPT 100)

### Latest (independent FULL re-review, parent `reviewers`)
- **Reviewer**: independent FULL re-reviewer (parent agentID=`reviewers`)
- **Data da review**: 2026-07-19
- **Veredito**: **ACCEPTED_100**
- **Score (path to 100)**: **100**
- **Full report**: `docs/reports/reviews/2026-07-19-task-0064-template-agents-rereview.md`
- **Lane outcome**: remains in `03-review/` (parent promotes)
- **Notas**: template **187** lines; AGENTS **165**; npm exits; cargo advisory-only; archive retained; CHANGELOG 0064 present. Evidence “156 lines” cosmetic drift only.
- **Se REJEITADO**: n/a

---

## Review Ledger

> [!IMPORTANT]
> Before path-to-100 work, read the latest full report and all reports listed under Previous Reports.

### Latest Review

- **Date**: 2026-07-19
- **Reviewer profile**: `reviewers`
- **Score**: `100/100`
- **Verdict**: `ACCEPTED_100`
- **Full report**: `docs/reports/reviews/2026-07-19-task-0064-template-agents-rereview.md`
- **Lane outcome**: remains in review
- **Task reference**: Task 0064 (`omniroute-tasks-template-and-agents-md`)

#### Current Open Blockers

- None.

#### Path-to-100 Summary

- Closed — live template + AGENTS restore verified; regression guard: never cargo-required exits; archive must remain.
