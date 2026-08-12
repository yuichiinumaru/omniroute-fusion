# OmniRoute — Create-Tasks Exit Conditions Recipe

> **Purpose**: Copy-pasteable **Exit Conditions** block for Task Architects promoting drafts into `01-open/` in this child repo.  
> **Stack**: Node / Next / TypeScript / npm / SQLite — **not** cargo.  
> **Template SSoT**: [`000-template.md`](./000-template.md)  
> **DoD SSoT**: [`cybernetics-core/AGENTS-definition-of-done-omniroute.md`](../../../AGENTS-definition-of-done-omniroute.md) (relocated Task 4586 from `.agents/rules/`; archive at `.archive/rules/definition-of-done-omniroute.md`)  
> **Lane constitution**: [`AGENTS.md`](./AGENTS.md)  
> **Origin**: EPIC-14 / Task **0065** (H-HARNESS-04 overlay)

Parent workflows [`.agents/workflows/gt-create-tasks.md`](../../.agents/workflows/gt-create-tasks.md) and skill-local project-management methods may still mention **cargo** as a historical Khala default. **When authoring tasks for OmniRoute, override those defaults with this recipe.**

---

## 1. Hard rules for promotion

1. Structure = `docs/tasks/000-template.md` (live path; ≥50 lines when open).  
2. First subtask = **Ler código existente** / **Ler existentes**.  
3. Exit Conditions are **binary** checkboxes — npm commands only unless the task is explicitly non-code docs/governance (still no cargo).  
4. **Forbidden** as OmniRoute required exits: `cargo check`, `cargo test`, `cargo clippy`, Surreal `.bind()`, hand-edit of generated root `CHANGELOG.md`.  
5. Changelog: append-only entry under **`.changelog/`** via manage-changelog; then `rebuild.sh build` (root `CHANGELOG.md` is generated — Task 0106 ledger mode).  
6. Dual test runners: Node native unit **and** `npm run test:vitest` when MCP / autoCombo / cache (vitest-owned) surfaces change.  
7. Bug-fix tasks: include Hard Rule #18 (TDD fail→pass **or** documented VPS live proof).  
8. Docs that claim live inventory counts: add an exit that runs a **live** count/grep (0009 U5 pointer).

---

## 2. Default Exit Conditions block (product / code tasks)

Paste into the task and **adapt** file paths / test names. Keep the npm gates.

```markdown
## Exit Conditions (GDD/TDD)

> OmniRoute npm matrix — see `docs/tasks/OMNIROUTE-CREATE-TASKS-EXITS.md`.
> Do **not** require cargo check/test for this stack.

- [ ] [Concrete artifact 1 — path or behavior]
- [ ] [Concrete artifact 2 — path or behavior]
- [ ] Relevant unit tests pass:
      `node --import tsx/esm --test tests/unit/<file>.test.ts`
- [ ] If MCP / autoCombo / cache (or other vitest-owned) surfaces changed:
      `npm run test:vitest` passes
- [ ] `npm run typecheck:core` passes without errors
- [ ] `npm run lint` passes without **new** errors
- [ ] Bug fix only: Hard Rule #18 — failing-then-passing test **or** documented VPS live proof
- [ ] Entrada no ledger `.changelog/` via manage-changelog + `rebuild.sh build` (do **not** hand-edit root `CHANGELOG.md`)
- [ ] Completion Evidence filled with real npm command output (no cargo lines)
```

---

## 3. Docs / governance-only subset

When **no** production code under `src/`, `open-sse/`, `electron/`, or `bin/` changes:

```markdown
## Exit Conditions (GDD/TDD)

- [ ] [Doc/governance artifact paths exist and are linked]
- [ ] Grep/doc-accuracy checks named in Test Requirements pass (no fabricated API names)
- [ ] `npm run typecheck:core` passes (repo still type-clean; skip only if task forbids any toolchain run **and** operator agrees — default is still run)
- [ ] Entrada no ledger `.changelog/` + rebuild when the change is operator-visible governance
- [ ] Completion Evidence filled
- [ ] No cargo-required exits
```

---

## 4. Create-tasks author checklist (before writing `01-open/`)

- [ ] Read `docs/tasks/AGENTS.md`  
- [ ] Read `docs/tasks/000-template.md`  
- [ ] Read this recipe + OmniRoute DoD overlay  
- [ ] Numbering per `.agents/rules/task-numbering.md` (no collisions across lanes)  
- [ ] Exit Conditions use **§2 or §3** — not parent cargo defaults  
- [ ] Filename: `NNNN-omniroute-<descricao>.md`  
- [ ] Parallelism / Depends-on filled when multi-agent wave  

---

## 5. Agent-sim sanity (closing a TS task)

If the agent’s mental model is “I am closing TypeScript work in OmniRoute”:

| Do | Do not |
|----|--------|
| Run `npm run typecheck:core` | Require `cargo check` |
| Run targeted `node --import tsx/esm --test …` | Claim cargo test PASS |
| Run `npm run test:vitest` when vitest surfaces change | Treat parent DoD cargo rows as mandatory |
| Write `.changelog/` entry + `rebuild.sh build` | Hand-edit root `CHANGELOG.md` Unreleased |
| Use `cybernetics-core/AGENTS-definition-of-done-omniroute.md` | Copy-only parent `definition-of-done.md` cargo checklist |

---

## 6. Pointers

| Path | Role |
|------|------|
| [`cybernetics-core/AGENTS-definition-of-done-omniroute.md`](../../../AGENTS-definition-of-done-omniroute.md) | Full DoD checklist (relocated Task 4586) |
| [`.agents/rules/definition-of-done.md`](../../.agents/rules/definition-of-done.md) | Parent cargo DoD (non-authoritative here) |
| [`000-template.md`](./000-template.md) | Task shape + npm exit notes |
| [`AGENTS.md`](./AGENTS.md) | Lanes + exit matrix summary |
| Root [`AGENTS.md`](../../AGENTS.md) | Hard Rules #18 etc. |
| [`.agents/workflows/gt-create-tasks.md`](../../.agents/workflows/gt-create-tasks.md) | Legacy `/create-tasks` — **override cargo defaults with this recipe** |
