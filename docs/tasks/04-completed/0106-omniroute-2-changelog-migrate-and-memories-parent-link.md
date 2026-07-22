> **✅ FINAL VERIFY PASS (2026-07-22)** — Score **100/100** ACCEPTED → `04-completed`.
> Report: `docs/reports/reviews/2026-07-21-task-0106-changelog-memories-final-review.md`
> Prior: path-to-100 re-review 100 → `03-review`; independent 57 REPROVADO (path-to-100 closed).
>
# Task 0106: Omniroute 2 Changelog Migrate And Memories Parent Link

> **Status**: `[x]` Final independent verify **100/100** — completed (`04-completed`)
> **Priority**: 🟡 P1
> **Type**: `housekeeping` | `governance`
> **Origin**: Architect audit 2026-07-20 dual ledger / profiles residual
> **Blocks**: Clean agent memory + changelog truth for `omniroute-2`
> **Depends on**: Prefer dry-run before apply; coordinate if dual-writing with active waves
> **Parallelism**: `parallel-safe` vs product code — do **not** co-edit with EPIC-21 `0101–0105` on `CHANGELOG.md` without merge care
> **Review routing**: independent governance review
>
> **Renumber note (2026-07-21)**: Was `0101`; renumbered to **0106** so EPIC-21 could claim reserved IDs **0101–0105** per planning. Content unchanged except task id / script `--task` flags.

---

## Objective

Bootstrap omniroute-2 onto parent conventions: create `.changelog/` via manage-changelog
`migrate` from root CHANGELOG.md; parent-link `.memories` to `../.memories/omniroute-2/`;
fix mis-copied parent MIGRATED.md paths.

## Background Context

### O que já existe:
- Fat root CHANGELOG.md only (LEGACY_ONLY) — **pre-migrate**
- Local real `.memories` with sparse `_by_lane` (not parent bucket) — **pre-migrate**
- profiles: MIGRATED.md only (parent 4522 copy; broken relative paths) — **historical; dir now absent**

### O que está faltando / quebrado (pre-0106):
- No parent `.memories/omniroute-2` bucket
- No `.changelog/`

### Path-to-100 residual after first close (independent review 57/100):
- Dual-mode policy still ordered hand-edit of root `CHANGELOG.md` Unreleased
- False archive path claim; dry-run artifact missing; profiles residual unproven
- Evidence counts stale; `.gitignore` silent on `.memories` / `.changelog`

---

## Test Requirements

- Dry-run of every migration command produces a reviewable plan before apply.
- After apply: canonical surfaces are correct; no data deleted (`mv`/archive only).
- AGENTS.md / local rules no longer instruct live writes under residual `.agents/profiles/` when memories migrated.
- Changelog validate+build (or project-local equivalent) succeeds after repair/migrate.
- Completion Evidence lists exact commands, counts before/after, and residual allowlist.
- **Path-to-100**: dual-mode flipped to ledger write; honest archive/profiles/dry-run/gitignore evidence under `tmp/`.

---

## Exit Conditions (GDD/TDD)

- [x] First subtask (read existing) completed with evidence
- [x] Migration dry-run artifact under `tmp/` or project `tmp/` (see honest note: repair dry-run + prior migrate log)
- [x] Apply completed without deletes
- [x] parent-linked memories
- [x] .changelog has entries
- [x] validate+build
- [x] CHANGELOG / `.changelog` entry for this task (project convention)
- [x] Completion Evidence filled (rewritten honestly 2026-07-22)
- [x] Task ready for `03-review/` — path-to-100 re-review **100/100** (2026-07-22)

### Path-to-100 exits (2026-07-22)

- [x] Dual-mode policy flipped (AGENTS.md, DoD overlay, template, create-tasks exits)
- [x] Symlink proof in `tmp/0106-symlinks.txt`
- [x] Archive residual + honest PROVENANCE (or honest amend — chose residual stub)
- [x] Profiles residual **or** N/A with `ls` proof (`tmp/0106-profiles-na.txt`)
- [x] Dry-run documented (`tmp/0106-repair-dry-run.txt` + `tmp/0106-dry-run-note.txt`)
- [x] Fresh validate/build (`tmp/0106-validate-fresh.txt`, `tmp/0106-build-fresh.txt`)
- [x] `.gitignore` decision documented (`tmp/0106-gitignore-decision.txt` + rules in `.gitignore`)
- [x] Completion Evidence zero false paths

---

## Details

### What

Subtasks:
- [x] **Ler o estado existente antes de modificar**: AGENTS.md, `.changelog/`, `docs/changelog/`, `.memories/`, `.agents/profiles/`, and the skill docs cited below
- [x] Confirm classification (migrate vs repair vs profiles-migrate) against live filesystem
- [x] Create parent `.memories/omniroute-2` if missing; re-link child `.memories`
- [x] Move any local _by_lane content into parent bucket without loss
- [x] `rebuild.sh migrate` from CHANGELOG.md → .changelog; validate+build
- [x] Profiles: N/A by design (dir absent) + proof artifact — not recreated for live writes
- [x] Re-read AGENTS.md overlays; **path-to-100**: flip dual-mode → ledger mode in AGENTS / DoD / template / create-tasks
- [x] Validation commands (below) green
- [x] Fill Completion Evidence honestly; leave in `02-doing` for independent re-review

### Migration tooling (must use — do not invent)

**Changelog** — `project-development/sub-skills/manage-changelog`:

```bash
# From project root (or set cwd to the child):
bash ../.agents/skills/project-development/sub-skills/manage-changelog/scripts/rebuild.sh \
  repair --dry-run --agent architects --task 0106
# or when NO trustworthy .changelog entries and only root CHANGELOG.md:
bash ../.agents/skills/project-development/sub-skills/manage-changelog/scripts/rebuild.sh \
  migrate --agent architects --task 0106
# After corpus is unified under .changelog:
bash .../rebuild.sh validate
bash .../rebuild.sh build
```

If history still lives only under `docs/changelog/` (real dir, not symlink):

```bash
GANTHRITOR_CHANGELOG_DIR=docs/changelog bash .../rebuild.sh repair --dry-run --agent architects --task 0106
# then promote/consolidate into .changelog and replace docs/changelog with symlink → ../.changelog
```

**Profiles → memories** — `knowledge/sub-skills/agent-wiki`:

```bash
python3 ../.agents/skills/knowledge/sub-skills/agent-wiki/scripts/migrate_profiles_to_project_memories.py
python3 ../.agents/skills/knowledge/sub-skills/agent-wiki/scripts/migrate_profiles_to_project_memories.py --apply
# Prefer project .memories (parent-linked): ensure child/.memories → ../.memories/<child>/
# nlm/ exception: do not move intentional nlm trees
```

Also read: `manage-agent-memory` SUBSKILL, `agent-wiki` SUBSKILL residual rules, parent
`.agents/rules/agent-memory-and-profiles.md`.

### Where

| Path | Action |
|------|--------|
| `CHANGELOG.md` | Generated only (migrate source historically; now rebuild target) |
| `.changelog/` | Canonical ledger SSoT (create + entries) |
| `.memories/` | Parent-link symlink |
| `.agents/profiles/` | **Absent by design** — N/A residual (no live write root) |
| `docs/tasks/AGENTS.md` | Flip dual-mode → ledger mode |
| `.agents/rules/definition-of-done-omniroute.md` | Flip dual-mode → ledger mode |
| `docs/tasks/000-template.md` | Exit/evidence: `.changelog/` + rebuild |
| `docs/tasks/OMNIROUTE-CREATE-TASKS-EXITS.md` | Exit recipe ledger mode |
| `.gitignore` | Ignore `.memories`; keep `.changelog/` entries trackable |
| `.archive/memories/omniroute-2-local-20260721/PROVENANCE.md` | Honest residual stub |
| `tmp/0106-*.txt` | Evidence artifacts |

### Validation commands

```bash
# Memory
ls -la .memories .agents/profiles 2>/dev/null | head
test -d .memories/_by_lane -o -L .memories && ls .memories/_by_lane 2>/dev/null | head
# Changelog
ls -la .changelog docs/changelog 2>/dev/null | head
bash ../.agents/skills/project-development/sub-skills/manage-changelog/scripts/rebuild.sh validate
# AGENTS no longer mandates profiles as live write root (rg)
rg -n "profiles/.*write|Protocol Zero.*profiles|\\.agents/profiles" AGENTS.md || true
# Ledger policy (post path-to-100)
rg -n "Changelog ledger mode|hand-edit root" docs/tasks/AGENTS.md .agents/rules/definition-of-done-omniroute.md
```

Primary recommended command class for this project: **migrate changelog; rehome memories parent-link**

---

## ⛔ Anti-Hallucination Guardrails

> [!CAUTION]
> NEVER `rm` history. NEVER raw `migrate` when a fat dual ledger already exists
> under both `.changelog/` and `docs/changelog/` — consolidate + **repair** instead.
> NEVER delete `.agents/profiles/` content — migrate with the official script then
> leave residual shells + `MIGRATED.md`. Do not use git/jj unless user-authorized.
> Do not run monorepo-wide graphify as part of this task.
> Do not claim archive paths or dry-run files that are not on disk.

---

## 📋 Completion Evidence

### Before (2026-07-21, first apply)

- No `.changelog/` directory
- Root `CHANGELOG.md` ~1.4MB fat product history
- Local real `.memories/` dir with `_by_lane` (not parent-linked)
- `.agents/profiles/` historically residual / broken paths (now absent)

### Commands run — first apply (2026-07-21)

- `rebuild.sh migrate --task 0106` → legacy snapshot + migration entry  
  - Evidence: `tmp/0106-migrate.txt` (`entries=2` at that moment)
- `docs/changelog` symlink → `../.changelog`
- Local `_by_lane` re-homed into `../.memories/omniroute-2/`; child `.memories` → `../.memories/omniroute-2`
- Prior validate/build: `tmp/0106-validate.txt`, `tmp/0106-build.txt` (stale counts relative to live ledger)

### Commands run — path-to-100 (2026-07-22, this session)

| Step | Command / action | Artifact |
|------|------------------|----------|
| Symlinks | `ls -la` + `readlink` / `readlink -f` | `tmp/0106-symlinks.txt` |
| Profiles N/A | `ls .agents/profiles` (missing) + parent check | `tmp/0106-profiles-na.txt` |
| Archive residual | Create shell + honest PROVENANCE (no second lane copy) | `.archive/memories/omniroute-2-local-20260721/PROVENANCE.md` |
| Dry-run | `repair --dry-run --agent builders --task 0106` (corpus already exists; raw re-migrate skipped) | `tmp/0106-repair-dry-run.txt` (`Files needing repair: 0`) + `tmp/0106-dry-run-note.txt` |
| Validate | `rebuild.sh validate` | `tmp/0106-validate-fresh.txt` → `issues=0 entries=10` then **11** after closeout entry |
| Build | `rebuild.sh build` | `tmp/0106-build-fresh.txt` |
| Counts | live entry list | `tmp/0106-counts.txt` → **classified_entries=11** |
| Gitignore | Ignore `.memories` + lock; **do not** ignore ledger entries | `.gitignore` + `tmp/0106-gitignore-decision.txt` |
| Policy flip | AGENTS / DoD / template / create-tasks exits → ledger mode | files in Where table |
| Changelog closeout | `rebuild.sh add` path-to-100 entry + validate/build | `.changelog/20260721-230604-0106-0106-path-to-100-ledger-policy-flip-honest-residuals-builders.md` |

### After layout (live, verified)

| Surface | State |
|---------|--------|
| `.memories` | symlink → `../.memories/omniroute-2` |
| `docs/changelog` | symlink → `../.changelog` |
| `.changelog/` | ledger SSoT; **11** classified entry files (plus index/README/template/views) |
| Root `CHANGELOG.md` | auto-generated banner: *Do NOT edit manually* |
| Parent lanes | `architects`, `builders`, `reviewers` under `../.memories/omniroute-2/_by_lane/` |
| `.agents/profiles` | **missing** (N/A by design; constitution forbids live writes there) |
| Archive residual | `.archive/memories/omniroute-2-local-20260721/PROVENANCE.md` only (content lives in parent bucket — no false claim of full file tree dump) |

### AGENTS / policy patches (path-to-100)

- `docs/tasks/AGENTS.md` §5–§6: changelog = `.changelog/` + rebuild; dual-mode hand-edit **retired**
- `.agents/rules/definition-of-done-omniroute.md` §4 + ledger section
- `docs/tasks/000-template.md` exit + evidence fields
- `docs/tasks/OMNIROUTE-CREATE-TASKS-EXITS.md` §1–§5 recipe

### Residuals / allowlist

- Honest PROVENANCE shell (not a full copy of migrated lane files — would dual-truth)
- `.agents/profiles` **not** recreated (parent Task 4522 / constitution: live → `_by_lane`)
- Prior false claim “archive shell with full content” **corrected**

### CHANGELOG refs

- Migrate: `.changelog/20260721-154708-0106-changelog-migrate-and-memories-parent-link-builders.md`
- System migration: `.changelog/20260721-154553-0106-changelog-system-migration-builders.md`
- Path-to-100: `.changelog/20260721-230604-0106-0106-path-to-100-ledger-policy-flip-honest-residuals-builders.md`

### Agent / date

- **Executor (path-to-100)**: gt-ts-engineer (builders)
- **Date**: 2026-07-22
- **Lane**: left in `docs/tasks/02-doing/` for independent re-review (no self-promote)

---

## 🔍 Independent review (2026-07-22)

- **Reviewer**: independent orchestrator + gt-documentation-accuracy-reviewer  
- **Data**: 2026-07-22  
- **Veredito**: `REPROVADO`  
- **Score**: `57/100`  
- **Report**: `docs/reports/reviews/2026-07-22-task-0106-changelog-memories-parent-link-independent-review.md`  
- **Live checks**: `.memories` and `docs/changelog` symlinks OK; parent `_by_lane` present; claimed archive shell **missing** (at review time)  
- **Required before re-submit**: path-to-100 list in report  

### Path-to-100 note for re-review (executor)

- Dual-mode flip, symlink proof, honest archive PROVENANCE, profiles N/A proof, repair dry-run, fresh validate/build (entries=11), gitignore decision, rewritten evidence — all on disk under `tmp/0106-*` and policy files above.

### Path-to-100 re-review (2026-07-22) — ACCEPTED 100

- **Reviewer**: independent re-reviewer (documentation-accuracy / parent builders dual-hat)  
- **Score**: **100/100**  
- **Verdict**: `ACCEPTED_100`  
- **Report**: `docs/reports/reviews/2026-07-22-task-0106-path-to-100-rereview.md`  
- **Live proof**: `.memories` + `docs/changelog` symlinks; parent `_by_lane` OK; `validate` issues=0 entries=11; policy ledger mode; archive PROVENANCE stub; tmp artifacts; gitignore  
- **Lane**: → `docs/tasks/03-review/`

## Review Ledger

| Date | Mode | Score | Verdict | Report |
|------|------|-------|---------|--------|
| 2026-07-22 | independent review | 57 | REPROVADO | `docs/reports/reviews/2026-07-22-task-0106-changelog-memories-parent-link-independent-review.md` |
| 2026-07-22 | path-to-100 re-review | **100** | ACCEPTED → `03-review` | `docs/reports/reviews/2026-07-22-task-0106-path-to-100-rereview.md` |
| 2026-07-22 | **final independent verify** | **100** | **ACCEPTED_100 → `04-completed`** | `docs/reports/reviews/2026-07-21-task-0106-changelog-memories-final-review.md` |

### Final verify (2026-07-22) — ACCEPTED 100

- **Reviewer**: independent final verifier (reviewers lane; not path-to-100 dual-hat)
- **Score**: **100/100**
- **Verdict**: `ACCEPTED_100`
- **Report**: `docs/reports/reviews/2026-07-21-task-0106-changelog-memories-final-review.md`
- **Live proof**: `.memories` + `docs/changelog` symlinks; parent `_by_lane` OK; `validate issues=0 entries=11`; ledger policy on AGENTS/DoD/template/exits; PROVENANCE stub; all `tmp/0106-*`; gitignore
- **Lane**: → `docs/tasks/04-completed/`

### Previous Reports

- `docs/reports/reviews/2026-07-22-task-0106-changelog-memories-parent-link-independent-review.md`
- `docs/reports/reviews/2026-07-22-task-0106-path-to-100-rereview.md`
- `docs/reports/reviews/2026-07-21-task-0106-changelog-memories-final-review.md`
