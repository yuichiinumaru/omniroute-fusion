# Task 0065: OmniRoute DoD Overlay + Create-Tasks Exit Recipe (Child-Local)

> **Status**: `[x]` Implementation complete — **promoted to `03-review/`** (docs-accuracy S=100, 2026-07-19; bundle story with **0064**)
> **Priority**: 🔴 P0
> **Type**: `governance`
> **Origin**: EPIC-14 — OmniRoute Child Harness Localization (T14-B)  
> Evidence: `docs/reports/audits/2026-07-19-harness-architect-meta-governance-audit.md` (F1, F10),  
> `docs/reports/audits/2026-07-19-wave2-mechanical-harness-evidence.md` (H-HARNESS-01/04/09),  
> `docs/reports/audits/2026-07-19-architect-orchestrator-wave-synthesis.md` harness P0s,  
> `docs/tasks/00-planning/0009-builder-wave-2026-07-18-review-loop-learnings.md` (U5/U6 pointers only)
> **Blocks**: Future tasks shipping cargo exit lies; phantom “not DoD-ready” on npm-proven work
> **Depends on**: Task **0064** (`docs/tasks/000-template.md` + `docs/tasks/AGENTS.md` must exist)
> **Parallelism**: `serializable` after **0064**; `parallel-safe` vs **0062/0063**; careful vs **0066** if both touch `.agents/rules/`
> **Review routing**: bundle with **0064** when both complete (shared harness story)

---

## Objective

Localize Definition-of-Done and create-tasks **exit-condition recipe** for OmniRoute (Node/Next/npm/SQLite) so agents are not forced through Khala/Rust **cargo** / Surreal `.bind()` closeout when proving OmniRoute work.

Concrete artifacts (child-local, prefer overlay over parent rewrite):

1. **DoD overlay or stack-parameterized pointer** usable for OmniRoute: npm matrix (`lint`, `typecheck:core`, relevant `test:unit` / `test:vitest`, Hard Rule #18), **no** cargo as mandatory.
2. **Create-tasks exit recipe note** (workflow overlay fragment or child doc under `docs/tasks/` / `.agents/rules/`) that replaces cargo defaults with npm exits and points at live `000-template.md`.
3. **Changelog dual-mode note**: product uses root `CHANGELOG.md`; `.changelog/` ledger absent — document intentional dual-mode (do not force full ledger migration without operator decision).

Out of scope: full parent harness rewrite; implementing EPIC-11/12/13 product features; forcing `.changelog/` migration.

## Background Context

### O que já existe:
- Parent DoD: `.agents/rules/definition-of-done.md` — cargo check/test, Surreal bind, `mod.rs`, `.changelog/` ledger (H-HARNESS-01/09 CONFIRMED).
- Parent create-tasks: `.agents/workflows/gt-create-tasks.md` L41 still lists cargo exits (H-HARNESS-04).
- Product truth: root `AGENTS.md` / `CLAUDE.md` npm matrix + dual test runners + coverage ratchet.
- After **0064**: live template + `docs/tasks/AGENTS.md` should exist as targets for pointers.

### O que está faltando / quebrado:
- No child-local DoD row/overlay for OmniRoute npm stack.
- Create-tasks continues to export cargo into new tasks unless author overrides.
- Agents may reject completed npm work as “missing cargo evidence” or invent cargo outputs.

---

## Test Requirements

- DEVE existir um artefato child-local (recommended paths below) that an OmniRoute builder can follow end-to-end without running cargo.
- DEVE listar binary exits: at least `npm run typecheck:core`; `npm run lint` (no new errors); and **relevant** unit command (`node --import tsx/esm --test …` and/or `npm run test:vitest` when MCP/autoCombo touched).
- DEVE apontar template para `docs/tasks/000-template.md` (post-0064).
- DEVE documentar CHANGELOG: edit product `CHANGELOG.md` TOP when task requires product/governance note; `.changelog/` not mandatory in this child until operator adopts ledger.
- DEVE NÃO apagar parent DoD without overlay strategy; prefer additive overlay or clear “OmniRoute stack” section/file that takes precedence for this repo.
- DEVE NÃO require `cargo check` for OmniRoute TypeScript tasks.

---

## Exit Conditions (GDD/TDD)

- [x] Task **0064** complete or template/AGENTS already on disk before marking this done
- [x] Child-local DoD overlay **or** OmniRoute section exists and is discoverable from `docs/tasks/AGENTS.md` and/or `.agents/rules/`
- [x] Create-tasks exit **recipe** exists (child workflow note / rule / section) with npm exits, not cargo-only defaults
- [x] Recipe references dual runners: Node native unit **and** vitest when those surfaces change
- [x] Changelog dual-mode (product `CHANGELOG.md` vs optional `.changelog/`) documented
- [x] Grep recipe/overlay for required `cargo check` as OmniRoute mandatory → **0 hits** (parent file may still mention cargo for other stacks if stack-parameterized)
- [x] No product feature code under `src/` / `open-sse/` beyond incidental doc links
- [x] `npm run typecheck:core` passes
- [x] `CHANGELOG.md` TOP — governance: OmniRoute DoD/npm exit localization
- [x] Completion Evidence filled

---

## Details

### What

Subtasks:
- [x] **Ler existentes**: parent `definition-of-done.md`; `gt-create-tasks.md`; post-0064 `docs/tasks/000-template.md` + `docs/tasks/AGENTS.md`; EPIC-14 §3; harness F1/F10; mechanical H-HARNESS-01/04/09; root AGENTS test matrix section
- [x] **Choose overlay strategy** (document choice in How/Evidence):
  - (A) New `.agents/rules/definition-of-done-omniroute.md` + pointer from `docs/tasks/AGENTS.md`, **or**
  - (B) Stack table added carefully to local DoD copy policy without breaking parent intent, **or**
  - (C) `docs/tasks/OMNIROUTE-DOD.md` + tasks AGENTS pointer (if rules dir write is constrained)
- [x] **Author npm DoD checklist**: compile, lint, unit subset, vitest when needed, no incomplete stubs in new code, Zod/security hard rules pointers, Completion Evidence fields with npm results not cargo
- [x] **Author create-tasks exit recipe**: short “when promoting drafts in this repo, Exit Conditions MUST include …” block; reference template; forbid cargo-only defaults
- [x] **Changelog dual-mode**: one explicit note in DoD overlay + tasks AGENTS
- [x] **Institutionalize pointers only** for 0009 U5 (docs accuracy / live counts as exit when docs claim inventory) — no full U1–U7 product work
- [x] **Refactoring pass**: prefer one clear SSoT overlay; avoid duplicating entire parent DoD
- [x] **Verificação**: agent-sim read path “I am closing a TS task in OmniRoute” → never lands on cargo-only checklist

### Where

| Arquivo | Propósito |
|---------|-----------|
| `.agents/rules/definition-of-done.md` | Ler — parent cargo DoD; edit only if stack-parameterizing carefully |
| `.agents/rules/definition-of-done-omniroute.md` | **Criar (recommended)** — child overlay |
| `.agents/workflows/gt-create-tasks.md` | Ler — cargo default L41; prefer **not** full parent rewrite; optional minimal OmniRoute callout if child workflow overlay not enough |
| `docs/tasks/AGENTS.md` | Modificar — pointer to DoD overlay + exit recipe (requires **0064**) |
| `docs/tasks/000-template.md` | Ler — ensure recipe matches template exits (requires **0064**) |
| `docs/tasks/OMNIROUTE-CREATE-TASKS-EXITS.md` | **Criar (optional)** — exit recipe if not embedding in AGENTS |
| `docs/tasks/00-planning/EPIC-14-omniroute-child-harness-localization.md` | Ler — T14-B |
| `docs/reports/audits/2026-07-19-harness-architect-meta-governance-audit.md` | Ler |
| `docs/reports/audits/2026-07-19-wave2-mechanical-harness-evidence.md` | Ler |
| `AGENTS.md` | Ler — npm matrix / Hard Rule #18 |
| `CHANGELOG.md` | Modificar — governance entry |

### How

1. Confirm 0064 artifacts exist (`test -f`).
2. Write OmniRoute DoD checklist mirroring real CI-relevant commands from root AGENTS (not invented gates).
3. Write create-tasks recipe as copy-pasteable Exit Conditions block for future task-architect runs.
4. Link from `docs/tasks/AGENTS.md` so onboard finds it.
5. Document dual-mode changelog; do not create empty `.changelog/` without operator ask.
6. Leave skill count / SQLite exception to **0066**.

**Strategy chosen: (A)** — additive child overlay `.agents/rules/definition-of-done-omniroute.md` + `docs/tasks/OMNIROUTE-CREATE-TASKS-EXITS.md` + pointers from `docs/tasks/AGENTS.md`, parent DoD header (non-destructive), and minimal callouts on `gt-create-tasks.md` / `gt-implement-task.md`. Parent cargo DoD retained.

### Why

Wave 2 CONFIRMED cargo DoD + create-tasks cargo defaults against a Node monorepo. Without overlay, every new task re-exports wrong stack gates and evidence fields, producing either phantom cargo claims or false “not done” on green npm work.

---

## Parallelism / file ownership

| Class | Detail |
|-------|--------|
| **Depends on** | **0064** first |
| **parallel-safe** | vs 0062/0063 |
| **serializable** | vs 0066 if both edit `.agents/rules/*` — coordinate or sequence |
| **API blast radius** | None product; agent behavior only |

---

## ⛔ Anti-Hallucination Guardrails

> [!CAUTION]
> DO NOT complete without 0064 live template path (or prove equivalent already restored).
> DO NOT make cargo mandatory for OmniRoute TS tasks.
> DO NOT claim parent Khala mothership onboard rewrite done — localize only.

> [!IMPORTANT]
> Prefer additive overlay over deleting parent DoD history.
> Hard Rule #18 (TDD or VPS) stays; express it in npm/ops language, not cargo.

---

## 🛡️ Compliance Checklist (Leis Primárias do AGENTS.md)

- [x] **Doc Accuracy**: Commands named match `package.json` scripts
- [x] **Zod Validation**: N/A
- [x] **Security**: N/A
- [x] **Error Sanitization**: N/A
- [x] **No Raw SQL**: N/A
- [x] **Archive Protocol**: Parent DoD not deleted without archive/overlay

---

## 📋 Completion Evidence (preenchido pelo agente executor)

- **Arquivos criados/modificados**:
  - **Created**: `.agents/rules/definition-of-done-omniroute.md` (OmniRoute DoD SSoT — npm matrix)
  - **Created**: `docs/tasks/OMNIROUTE-CREATE-TASKS-EXITS.md` (create-tasks copy-paste Exit Conditions recipe)
  - **Modified**: `docs/tasks/AGENTS.md` (pointers to overlay + recipe; dual-mode finalized; §9 create-tasks override)
  - **Modified**: `.agents/rules/definition-of-done.md` (additive OmniRoute pointer header only; cargo body retained)
  - **Modified**: `.agents/workflows/gt-create-tasks.md` (Exit Conditions line → npm recipe, forbid cargo defaults)
  - **Modified**: `.agents/workflows/gt-implement-task.md` (DoD + evidence + test commands → OmniRoute npm path)
  - **Modified**: `CHANGELOG.md` TOP governance entry for 0065
  - **Modified**: this task file (evidence + checkboxes)
- **Strategy**: **(A)** child overlay + recipe + discoverability pointers; no parent DoD deletion; no product `src/` / `open-sse/` code
- **Testes que verificam o trabalho**:
  - Path existence: `test -f` on overlay, recipe, `000-template.md`, `docs/tasks/AGENTS.md`
  - `package.json` scripts present: `typecheck:core`, `lint`, `test:vitest`, `test:unit`, `test:all`
  - Policy grep: no positive `- [ ] … cargo check` / “cargo check passa” required checklist rows in overlay/recipe
  - Dual-runner language present in overlay + recipe + tasks AGENTS
- **Resultado dos testes**:
  - Paths: **PASS** (all present)
  - Scripts: **PASS** (all five named scripts exist)
  - Positive cargo-check mandatory checklist hits on overlay/recipe: **0 — PASS**
  - Cargo mentions only as **forbidden / parent non-authoritative** (expected)
- **Resultado do lint**: N/A for pure governance docs (no production TS changed). No new lint surface.
- **Resultado do typecheck/build**: `npm run typecheck:core` — **PASS** (exit 0; `tsc --pretty false -p tsconfig.typecheck-core.json`)
- **Entrada no changelog**: `CHANGELOG.md` → `[Unreleased]` → **Changed** → “OmniRoute DoD overlay + create-tasks exit recipe (EPIC-14 / Task 0065)”
- **Agent-sim close path**: Builder closing TS work → `definition-of-done-omniroute.md` + npm evidence; create-tasks author → `OMNIROUTE-CREATE-TASKS-EXITS.md` §2/§3; parent cargo file only via explicit “other stacks” pointer
- **Agente executor**: gt-ts-engineer (governance) / builders parent
- **Data de conclusão**: 2026-07-19
- **Lane note**: Left in `02-doing/` per dispatch; do **not** move to `03-review/` in this session

---

## 🔍 Review Trail (preenchido pelo reviewer)

### Previous Reports
- `docs/reports/reviews/2026-07-19-task-0065.md` (builders docs-accuracy ACCEPT 100)

### Latest (independent FULL re-review, parent `reviewers`)
- **Reviewer**: independent FULL re-reviewer (parent agentID=`reviewers`)
- **Data da review**: 2026-07-19
- **Veredito**: **ACCEPTED_100**
- **Score (path to 100)**: **100**
- **Full report**: `docs/reports/reviews/2026-07-19-task-0065-dod-exits-rereview.md`
- **Lane outcome**: remains in `03-review/` (parent promotes)
- **Notas**: Overlay + recipe + AGENTS/DoD/create-tasks/implement-task pointers reconfirmed; package.json scripts real; cargo only forbidden; dual-mode CHANGELOG OK. Parent implement-task deeper cargo examples remain out of scope.
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
- **Full report**: `docs/reports/reviews/2026-07-19-task-0065-dod-exits-rereview.md`
- **Lane outcome**: remains in review
- **Task reference**: Task 0065 (`omniroute-dod-overlay-create-tasks-exit-recipe`)

#### Current Open Blockers

- None in 0065 ownership.

#### Path-to-100 Summary

- Closed — OmniRoute DoD/npm recipe discoverable; regression guard: never reintroduce cargo-mandatory OmniRoute exits; keep dual runners + root CHANGELOG dual-mode.
