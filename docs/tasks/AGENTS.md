# OmniRoute — Task System Constitution (`docs/tasks/`)

> **Scope**: Executable task discipline for this child repo only.  
> **Stack**: Node.js / Next.js / TypeScript / npm / better-sqlite3 (SQLite is canonical product storage).  
> **Not this file**: Product Hard Rules, ports, worktrees, provider pipeline — see root [`AGENTS.md`](../../AGENTS.md) and [`CLAUDE.md`](../../CLAUDE.md).  
> **Template SSoT**: [`000-template.md`](./000-template.md) (restored EPIC-14 / Task 0064; provenance archive under `.archive/`).

This document exists so onboard Step 1.2 and create-tasks pre-reqs are **satisfiable on disk**. Do not invent a parallel protocol.

---

## 1. Purpose

- Give every agent a single place for **lane layout**, **template rules**, **npm exit matrix**, **evidence**, and **numbering** for OmniRoute tasks.
- Prevent re-import of parent Khala/Rust **cargo** / Surreal DoD as mandatory closes for this repo.
- Point to product law in root `AGENTS.md` without cloning it here.

---

## 2. Lanes (`docs/tasks/`)

| Dir | Name | Who writes | Meaning |
|-----|------|------------|---------|
| `00-planning/` | Planning | architects / operators | Epics, roadmaps, queues, learnings — **not** executable `NNNN` identity unless historical import |
| `01-open/` | Open | task architects | Ready for pickup; follows template; ≥50 lines |
| `02-doing/` | In progress | builders | Active execution; status `[~]` or `[/]` |
| `03-review/` | Review | independent reviewer | All subtasks + Exit Conditions + Completion Evidence filled by executor |
| `04-completed/` | Done | after review pass | Review Trail filled; veredito APROVADO |
| `.archive/` | Archive | anyone retiring docs | **Move, never delete** live assets when superseding |

**Promote rules (summary)**:

1. **Planning → open**: Use `/create-tasks` (or equivalent). Output lands in `01-open/` from `000-template.md`. First subtask must be “read existing”.
2. **Open → doing**: Claim work; set status in progress; do not leave phantom claims without file ownership notes.
3. **Doing → review**: All subtasks `[x]`, Exit Conditions `[x]`, Completion Evidence filled with real command output. **Different agent** reviews.
4. **Review → completed**: Reviewer fills Review Trail; score path-to-100 as required by wave policy. Reject → back to `02-doing/` with reason at top.
5. **Never** jump open → completed without independent review.

---

## 3. Template (mandatory)

- **Live path**: `docs/tasks/000-template.md` — required structure for every executable task in `01-open/` and later.
- **Minimum**: ≥50 lines when promoted to open.
- **Required sections**: Objective · Background · Test Requirements · Exit Conditions · Details (What / Where / How / Why) · Anti-Hallucination · Compliance · Completion Evidence · Review Trail.
- **First subtask**: always “Ler código existente” / “Ler existentes” before edits.
- **Filename**: `NNNN-omniroute-<descricao>.md` (local namespace from `0001`). Last digit `0` = blocker; `1–9` = parallelizable when useful. `AD-*` / `RD-*` per [`.agents/rules/task-numbering.md`](../../.agents/rules/task-numbering.md).
- **Planning artifacts** in `00-planning/`: prefixes `EPIC-*`, `ROADMAP-*`, `PLAN-*`, `QUEUE-*`, etc. — see [`.agents/rules/planning-artifact-naming.md`](../../.agents/rules/planning-artifact-naming.md). Do not assign bare `Task NNNN` identity to ordinary planning files.

---

## 4. Parallelism notes (expected on multi-agent tasks)

Executable tasks that share a wave SHOULD state:

- **`parallel-safe`** — may run with listed siblings if file paths do not collide  
- **`serializable`** — must wait for / gate another task  
- **`operator-hold`** — production/ops only (e.g. :21000)

Template includes a Parallelism header + optional ownership table. Prefer explicit collision paths over silent co-edits.

---

## 5. Exit matrix — OmniRoute (npm, not cargo)

Use these as the **default required exits** for product/code tasks (docs/governance may subset):

| Check | Command / rule |
|-------|----------------|
| Types | `npm run typecheck:core` |
| Lint | `npm run lint` (no **new** errors) |
| Unit (Node native) | `node --import tsx/esm --test tests/unit/<file>.test.ts` |
| Vitest surfaces | `npm run test:vitest` when MCP / autoCombo / cache (or other vitest-owned) files change — **non-overlapping** with `test:unit` |
| Full suite | `npm run test:all` only when scope warrants |
| Bug fix proof | Hard Rule #18: TDD (fail→pass) **or** documented live test on VPS — see root AGENTS |
| Changelog | Append-only entry under [`.changelog/`](../../.changelog/) via manage-changelog; then `rebuild.sh build` projects root [`CHANGELOG.md`](../../CHANGELOG.md) |

**Forbidden as OmniRoute mandatory exits** (unless the task is explicitly about a Rust/cargo surface, which this product is not):

- `cargo check` / `cargo test` as required closeout  
- SurrealDB `.bind()` laws  
- Hand-editing root `CHANGELOG.md` / `CHANGELOG-FULL.md` / the `docs/changelog` symlink as a write path

**DoD SSoT (Task 0065, ledger adopted Task 0106)**: [`.agents/rules/definition-of-done-omniroute.md`](../../.agents/rules/definition-of-done-omniroute.md) takes precedence for OmniRoute closes. Parent [`.agents/rules/definition-of-done.md`](../../.agents/rules/definition-of-done.md) remains cargo-centric for multi-stack history and is **not** mandatory here. This section + `000-template.md` + the overlay are the authoritative exits.

---

## 6. Changelog ledger mode (H-HARNESS-09 — adopted Task 0106)

| Surface | Role in this repo |
|---------|-------------------|
| [`.changelog/`](../../.changelog/) | **Canonical append-only SSoT** — write entries here (manage-changelog `add` / `closeout` / engine) |
| Root [`CHANGELOG.md`](../../CHANGELOG.md) | **Generated only** — `rebuild.sh build` (or closeout path). Banner: *Do NOT edit manually* |
| `docs/changelog` | **Compat symlink** → `../.changelog` — not a separate write root |

**Policy (Task 0106 supersedes Task 0065 dual-mode hand-edit)**: agents **must not** hand-edit root `CHANGELOG.md` Unreleased (or any section). All product/governance notes go through `.changelog/` + rebuild. Full wording in the OmniRoute DoD overlay § changelog ledger.

---

## 7. Completion Evidence (no phantom closes)

Before `03-review/`, executor MUST fill (npm field shape — see DoD overlay):

- Files created/modified (paths)  
- Tests that verify the work + **real** PASS/FAIL output (Node unit and/or vitest)  
- Lint + `typecheck:core` results  
- Changelog entry reference (`.changelog/<entry>.md` + rebuild; never claim hand-edit of root `CHANGELOG.md`)  
- Agent id + date  

Missing evidence = not reviewable. Reviewer must be a **different** agent than the executor. **Never** paste fabricated cargo PASS lines.

---

## 8. Parent-owned generated surfaces

| Path | Ownership |
|------|-----------|
| `docs/tasks/tasklist.md` or `docs/tasklist.md` | **Parent / harness regenerates** via tasklist-sync (or operator). **Do not hand-write** a stale full inventory “for completeness” in a random PR. Missing file ≠ invitation to invent a ledger. |
| `docs/tasks/000-template.md` | Child live SSoT (this repo) |
| `docs/tasks/AGENTS.md` | Child live SSoT (this file) |
| `docs/tasks/OMNIROUTE-CREATE-TASKS-EXITS.md` | Child create-tasks exit recipe (0065) |
| `.agents/rules/definition-of-done-omniroute.md` | Child DoD overlay (0065) |

If tasklist is missing, work from lane directories (`ls docs/tasks/01-open/` etc.) and numbering rules — not from a fabricated index.

---

## 9. Create-tasks pre-reqs + exit recipe

Workflow [`.agents/workflows/gt-create-tasks.md`](../../.agents/workflows/gt-create-tasks.md) may still mention cargo (parent/legacy default). **For OmniRoute overrides are mandatory:**

1. Read **this** file.  
2. Use **`docs/tasks/000-template.md`** as structure.  
3. Emit **npm** Exit Conditions from **[`OMNIROUTE-CREATE-TASKS-EXITS.md`](./OMNIROUTE-CREATE-TASKS-EXITS.md)** (copy-paste blocks §2/§3) — not cargo-only defaults.  
4. Close against [`.agents/rules/definition-of-done-omniroute.md`](../../.agents/rules/definition-of-done-omniroute.md).

Do not re-import cargo exits into new `01-open/` tasks for this product.

---

## 10. Product holds (summary only)

Full text lives in root `AGENTS.md`. Non-negotiable for task agents:

- **`:21000` = production** — no docker rm/restart/mutate without explicit operator command. Prefer `:22000` / dry-run for agent work.  
- **No commit to `main`**; worktrees under `.claude/worktrees/` per Hard Rule #19.  
- **Doc accuracy**: if `grep` finds zero hits, do not document the name. When docs claim inventory counts, require a live verification exit (0009 U5).  
- SQLite via `src/lib/db/` is intentional product storage — not a temporary stand-in to abolish.
  Agent-readable exception: [`.agents/rules/sqlite-omniroute-product-exception.md`](../../.agents/rules/sqlite-omniroute-product-exception.md)
  (scanner ledger: `.agents/rules/sqlite-abolition-exceptions.json`; policy cross-ref in
  `sqlite-abolition-policy.md`).

---

## 11. Related

| Artifact | Role |
|----------|------|
| [`000-template.md`](./000-template.md) | Live task shape |
| [`OMNIROUTE-CREATE-TASKS-EXITS.md`](./OMNIROUTE-CREATE-TASKS-EXITS.md) | Create-tasks npm exit recipe (0065) |
| [`.agents/rules/definition-of-done-omniroute.md`](../../.agents/rules/definition-of-done-omniroute.md) | OmniRoute DoD overlay (0065) — **authoritative** |
| [`.archive/000-template-moved-to-parent.md`](./.archive/000-template-moved-to-parent.md) | Provenance for template restore |
| [`00-planning/EPIC-14-omniroute-child-harness-localization.md`](./00-planning/EPIC-14-omniroute-child-harness-localization.md) | Harness localization epic |
| Root [`AGENTS.md`](../../AGENTS.md) | Product constitution + Hard Rules |
| [`.agents/rules/task-numbering.md`](../../.agents/rules/task-numbering.md) | Numbering SSoT |
| [`.agents/rules/definition-of-done.md`](../../.agents/rules/definition-of-done.md) | Parent DoD (cargo) — non-authoritative for OmniRoute product |
