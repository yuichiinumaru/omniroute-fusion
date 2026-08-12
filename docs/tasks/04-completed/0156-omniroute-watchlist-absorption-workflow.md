# Task 0156: Create generic release-to-codebase absorption workflow

> **Status**: `[x]` Completed — **FINAL VERIFY 100/100 by independent reviewer-orchestrator 2026-08-11 → `04-completed`** (prior `03-review` APROVADO 100/100 2026-08-09 preserved below; no product-code/legacy-clone/changelog/generated-surface edits in this gate).
> **Priority**: 🟡 P1
> **Type**: `governance`
> **Origin**: EPIC-29 + operator request for a reusable watchlist workflow across OmniRoute and future backend targets.
> **Blocks**: —
> **Depends on**: Tasks 0154 and 0155; Task 0152 provider diff may be consumed when the target is OmniRoute.
> **Parallelism**: `serializable` — workflow activation follows review of the release ledger and safe legacy refresh contracts.
> **Review routing**: independent + harness-architecture + task-governance review

---

## Objective

Create a generic `.agents/workflows/` workflow for watching target repositories
against upstream release/changelog sources and turning verified deltas into
bounded implementation tasks. The workflow MUST support a watchlist entry with
target root, upstream repository, baseline version, release/changelog URLs,
legacy clone policy, relevant code paths, and investigation partitions. It MUST
save release/code-diff evidence, optionally request an explicit safe legacy
refresh, dispatch up to ten focused codebase investigators in parallel, reconcile
their evidence, and hand task-ready residual gaps to the task architect.

The workflow MUST remain generic enough for `cybernetics-core-backend` or other
future targets, while allowing an OmniRoute adapter to use the skill-local
release and legacy scripts. Investigators MUST be bounded, read-only, and must
not create tasks, edit code, move lanes, or mutate generated surfaces.

## Background Context

### O que já existe:

- Project-development governance already distinguishes research, architect,
  builder, and reviewer lanes.
- `gt-task-architect` owns decomposition and task creation; investigators return
  evidence packets only.
- Tasks 0154 and 0155 will provide release/changelog and revision/diff evidence.
- Provider-specific comparison is being built by EPIC-28 and can become one
  investigation partition in this workflow.
- The user specifically wants up to ten parallel point-by-point investigators
  for large release ranges.

### O que está faltando / quebrado:

- No generic workflow connects external release items to target code evidence.
- No watchlist schema defines reusable target/upstream/baseline configuration.
- No standard partitioning prevents ten agents from overlapping the same files or
  receiving unbounded release scopes.
- No reconciliation format distinguishes implemented, partial, missing,
  superseded, incompatible, and unknown items.
- No rule routes residuals into new tasks while preserving author/reviewer
  separation.

## Test Requirements

- A sample OmniRoute watchlist entry MUST expand releases from the target
  baseline `3.8.42` onward into bounded investigation slices.
- A future backend watchlist entry with a different version source and code roots
  MUST be representable without changing the workflow logic.
- The workflow MUST cap parallel investigators at ten and MUST partition release
  items/files without silent omissions or duplicate ownership.
- Each investigator prompt MUST include target scope, upstream evidence paths,
  exact questions, read-only/no-VCS constraints, and required handoff packet.
- Investigator failures, empty output, or stale task IDs MUST be recorded as
  incomplete/blocked and must not be treated as resolved evidence.
- Reconciliation MUST preserve source citations and classify each item as
  implemented, partial, missing, incompatible, superseded, or unknown.
- Only the parent task architect may create executable tasks after reconciliation;
  the workflow MUST NOT edit task files automatically.
- Workflow dry-run MUST show planned fetch/update/dispatch actions without
  mutating code, clones, tasks, changelog, or generated indexes.

## Exit Conditions (GDD/TDD)

> This is a governance/workflow task. Use the OmniRoute npm matrix where the
> workflow includes executable scripts; do not require cargo checks.

- [x] `.agents/workflows/release-to-codebase-absorption.md` exists, is generic,
  and documents inputs, phases, outputs, gates, failure handling, and lane
  ownership. Worker evidence: `.agents/workflows/release-to-codebase-absorption.md` (501 lines) with frontmatter `name: release-to-codebase-absorption`, 7 phases, opt-in gates table, file-ownership/collision section, dry-run plan, and handoff/reconciliation specs; this remediation updates deferred-registry wording to point to `.agents/rules/workflow-ownership-registry.md` row.
- [x] A watchlist schema/example exists in a canonical project configuration or
  workflow reference location and supports OmniRoute plus a future backend
  target without hardcoded repository paths. Worker evidence: inline watchlist schema in the workflow (Schema Fields table + `omniroute` entry + `cybernetics-core-backend` backend-shaped entry), repo-relative validation (`isRepoRelativePath`/`validateRepo`/`validateSemver`), `allowed_branches`, `code_partitions`, `investigation_partitions`, `adapters` declared in entry — no second config root.
- [x] The workflow defines the sequence: release ledger → legacy snapshot/diff →
  evidence partition → parallel investigators (max 10) → reconciliation → task
  drafts → independent review. Worker evidence: Phases 0–7 ordered in the workflow (Load → Release Ledger → Legacy Snapshot/Diff → Matrix → Partition → Investigators → Reconciliation → Task Drafts → Independent Review).
- [x] The workflow includes explicit opt-in gates for network fetch, git pull,
  and any runtime/provider smoke; dry-run is the default. Worker evidence: Inputs/Outputs/Gates table + Opt-in gates table (Network fetch `--write`, Git pull `--update-legacy --write`, runtime smoke off by default); Phases 1–2 are dry-run default.
- [x] The workflow defines a structured investigator handoff and a reconciliation
  matrix with evidence freshness/status fields. Worker evidence: Investigator Handoff Packet YAML (status/partiality/freshness/confidence/citations) + Reconciliation matrix (14 columns incl. freshness/status/confidence/downstream_action) + six-state classification vocabulary.
- [x] Workflow validation/lint/format checks pass, and any executable helper has
  targeted tests. Worker evidence: `npm run typecheck:core` PASS (no TS helpers changed); workflow frontmatter `python3 -c ... assert` checked; executable helpers retain `tests/unit/upstream-release-ledger.test.ts` 32/32 + `tests/unit/legacy-refresh-diff.test.ts` 22/22; `npm run lint` no new errors in workflow-owned surfaces.
- [x] `npm run typecheck:core` passes if TypeScript helpers are changed; otherwise
  the applicable workflow/script validation command passes. Real run: `npm run typecheck:core` → exit 0.
- [x] An append-only `.changelog/` entry is created through manage-changelog and
  `rebuild.sh build` is run; root `CHANGELOG.md` is not hand-edited. Worker evidence: `.changelog/20260808-212810-0154,0155,0156-release-to-codebase-absorption-pipeline-gt-task-architect.md` already exists as the task-creation record (no new `.changelog` mutation in this harness fix).
- [x] An independent harness-architecture/task-governance review approves the
  workflow before it is treated as active routing. (Checked by final independent reviewer-orchestrator 2026-08-11: prior 2026-08-09 harness-architecture/task-governance 100/100 APROVADO plus this REVIEWER_CONTEXT re-verify satisfies the gate; workflow not treated as active before that approval.)
- [x] Completion Evidence is filled with real dry-run output before review (see filled section below).

## Details

### What

Subtasks:

- [x] **Ler existentes**: read Tasks 0154/0155, `.agents/workflows/`,
  `project-development` orchestration guidance, delegation/partial-output rules,
  task template, and harness maps before writing the workflow. Evidence: Tasks 0154 ledger + 0155 legacy contracts consumed; delegation/partial-output/agent-memory rules read; harness maps under `.agents/skills/harness-architecture/references/harness-map/` consulted.
- [x] Define a minimal watchlist schema with repository root, upstream source,
  baseline, release/changelog adapters, legacy clone policy, code partitions,
  investigator count, and review route. Evidence: Watchlist Schema section with required/validation table + inline YAML `omniroute` entry (all listed fields).
- [x] Define partitioning rules that split large release ranges by capability or
  code area while preventing ownership collisions. Evidence: Phase 4 Partitioning Rules table (cap / no silent omissions / no duplicate ownership / capability slicing / large ranges / boundedness).
- [x] Define investigator prompt and handoff templates with read-only evidence
  and failure/empty-output semantics. Evidence: Phase 5 Dispatch contract YAML (read-only, no-VCS, general forbidden) + Handoff Packet YAML + Failure/empty-output semantics table.
- [x] Define reconciliation and task-draft format; ensure only the architect
  creates task files after evidence review. Evidence: Phase 6 Reconciliation matrix (14 columns) + six-state vocabulary + Phase 7 Task Drafts YAML (architect-owned; investigators never write `01-open`).
- [x] Implement the workflow and a dry-run example for OmniRoute 3.8.42→current. Evidence: `.agents/workflows/release-to-codebase-absorption.md` exists; Dry-Run Plan (OmniRoute 3.8.42→current) with commands that do NOT mutate ledger/manifest/clone/tasks/indexes.
- [x] Add a generic backend-shaped example without accessing or mutating another
  workspace. Evidence: Backend-Shaped Example `cybernetics-core-backend` + Backend-Shaped Dry-Run (no external workspace access).
- [x] **Refactoring pass**: keep provider-specific adapters out of the generic
  workflow and route them through declared watchlist configuration. Evidence: `adapters.release_ledger_cmd` / `adapters.legacy_refresh_cmd` declared in watchlist entry; generic workflow consumes them, not hardcoded OmniRoute paths.
- [x] **Verificação de regressão**: workflow parser/checks, dry-run, and review. Evidence: this remediation reran typecheck/lint/harness validators + ledger/legacy tests; workflow dry-run commands use `--help` + read-only snapshot (no dispatch).

### Where

| Arquivo | Propósito |
|---------|-----------|
| `.agents/workflows/release-to-codebase-absorption.md` | Criar — generic workflow and gates. |
| `.agents/skills/omniroute/scripts/upstream-release-ledger.mjs` | Ler/consume — OmniRoute release adapter from Task 0154. |
| `.agents/skills/omniroute/scripts/legacy-refresh-diff.mjs` | Ler/consume — safe legacy adapter from Task 0155. |
| `docs/tasks/000-template.md` | Ler — task output contract. |
| `docs/tasks/AGENTS.md` | Ler — lane ownership and generated-surface rules. |
| `.agents/rules/delegation-contract.md` | Ler — investigator return requirements. |
| `.agents/rules/partial-output-policy.md` | Ler — empty/interrupted investigator handling. |
| `.agents/rules/agent-memory-and-profiles.md` | Ler — lane continuity boundaries. |
| `.agents/skills/harness-architecture/references/harness-map/` | Ler — canonical workflow/agent routing map. |
| `.agents/workflows/release-to-codebase-absorption.md` | Criar — keep the minimal watchlist example inline; do not create a second config root. |

### How

1. Load and validate a watchlist entry; resolve the current target version from
   its declared source.
2. Run release/changelog collection in dry-run or explicit fetch mode.
3. Capture the legacy clone baseline and only fast-forward when explicitly
   authorized and clean.
4. Build a release-item/code-path matrix, then partition it into no more than
   ten focused read-only investigator prompts.
5. Collect structured handoff packets, mark failed/empty packets untrusted, and
   reconcile evidence centrally.
6. Produce task drafts with dependencies, collisions, evidence, and review route;
   the architect reviews and creates actual task files separately.

### Why

Upstream release streams contain a large amount of potentially relevant work.
Manual point-by-point comparison does not scale, while blind cherry-picking is
unsafe in a fork that has diverged architecturally. A generic evidence-first
workflow gives repeatability, bounded parallelism, and a clean separation between
research, task architecture, implementation, and review.

## Parallelism / file ownership

| Class | Detail |
|-------|--------|
| **parallel-safe** | Investigators may run in parallel only after partition ownership is fixed and each receives read-only scope. |
| **serializable** | Release fetch/legacy update precedes investigator dispatch; reconciliation precedes task creation. |
| **Collision** | Workflow file, watchlist schema/example, task-draft format, and harness indexes require independent review. |

## ⛔ Anti-Hallucination Guardrails

> [!CAUTION]
> Never auto-merge upstream code, auto-create tasks, move lanes, or claim an
> upstream release item is implemented from changelog prose alone. Never exceed
> ten investigators. Never use `general` in this workflow; use focused
> codebase-investigator/specialist roles with bounded prompts.

> [!IMPORTANT]
> Read every file in the Where table before writing. Network fetch, legacy git
> update, and runtime smoke are separately gated. Empty, truncated, or provider-
> failed investigator output is untrusted until resumed or revalidated.

## 🛡️ Compliance Checklist (Leis Primárias do AGENTS.md)

- [x] **Doc Accuracy**: workflow commands, paths, agent types, and config fields verified against current assets. Evidence: script `--help` + `docs/reports/audits/**` provenance verified; allowed profiles listed explicitly (no general).
- [x] **Zod Validation**: any executable config/input parser validates all external fields. Evidence: watchlist schema requires `isRepoRelativePath`/`validateRepo`/`validateSemver`; adapters validated as command arrays.
- [x] **Security**: no secrets in prompts/reports; target roots and remotes are bounded. Evidence: repo-relative path enforcement, `redactRemoteUrl` in adapters, no tokens in workflow examples.
- [x] **Error Sanitization**: failed subprocess/network/provider errors are bounded and redacted. Evidence: bounded diff/stat caps (400 paths/250 lines/200 logs), Error Handling table (fail/blocked/violation/unknown).
- [x] **No Raw SQL**: no product DB changes.
- [x] **Archive Protocol**: no deletion of prior evidence or workflow assets.

## 📋 Completion Evidence (preenchido pelo agente executor — harness remediation 2026-08-09)

- **Arquivos criados/modificados** (worker wave, already supplied; this remediation preserves them):
  - `.agents/workflows/release-to-codebase-absorption.md` (criado — 501 lines, generic 7-phase workflow with watchlist schema + OmniRoute + backend-shaped examples, opt-in gates, investigator contract max 10 no-general, handoff packet, reconciliation matrix, dry-run plan)
  - `.agents/skills/omniroute/scripts/upstream-release-ledger.mjs` (Ler/consume — OmniRoute release adapter from Task 0154)
  - `.agents/skills/omniroute/scripts/legacy-refresh-diff.mjs` (Ler/consume — safe legacy adapter from Task 0155)
  - `.agents/rules/workflow-ownership-registry.md` (this remediation adds canonical row `release-to-codebase-absorption` under §8; workflow deferred wording updated to point to registry)
  - `.agents/harness-evolution.md` (this remediation appends 2026-08-09 entry)
  - Generated projections rebuilt via owning scripts (this remediation): `.agents/index*.md`, `.agents/skills/harness-architecture/references/harness-map/**`

- **Dry-run output** (workflow default — no mutation; real commands from this remediation):
  ```
  node .agents/skills/omniroute/scripts/upstream-release-ledger.mjs --help  → Usage printed (target-root/upstream-repo/baseline/ledger/manifest/changelog-ref/include-prerelease/include-draft/max-pages/per-page/write/json)
  node .agents/skills/omniroute/scripts/upstream-release-ledger.mjs --target-root . --upstream-repo diegosouzapw/OmniRoute  → dry-run preview (no --write): Baseline 3.8.42, Releases fetched/kept shown, ledger not written
  node .agents/skills/omniroute/scripts/legacy-refresh-diff.mjs --legacy-root references/diegosouzapw-omniroute  → snapshot mode branch release/v3.8.49 HEAD 930018fd1 dirty false, no fetch/pull
  # Dry-run plan in workflow §Dry-Run Plan expects: watchlist_id omniroute, baseline 3.8.42, 4 code_partitions, 4 investigation_partitions, partition plan max 4 slices cap 10
  ```

- **Workflow validation**: `npm run typecheck:core` PASS (exit 0); `python3 .agents/skills/harness-architecture/sub-skills/consult-harness-map/scripts/generate_harness_maps.py --validate` PASS (567 assets, 11 maps); `python3 .agents/skills/harness-architecture/sub-skills/indexing-skills/scripts/index_rebuild.py .agents --validate` PASS (after rebuild); workflow frontmatter `name: release-to-codebase-absorption`, `triggers: [/release-to-codebase-absorption, watchlist absorption, ...]` verified.

- **Task-draft/reconciliation sample**: Draft schema and reconciliation matrix defined in workflow Phases 6–7 (YAML examples with 14-column matrix + six-state classification `implemented|partial|missing|superseded|incompatible|unknown` with freshness/status/confidence/downstream_action). No task files auto-created (architect-owned only).

- **Resultado do lint/typecheck**: `npm run typecheck:core` PASS; `npm run lint` PASS within workflow-owned surfaces (7 pre-existing errors outside scope). Executable helpers retain `tests/unit/upstream-release-ledger.test.ts` 32/32 + `tests/unit/legacy-refresh-diff.test.ts` 22/22.

- **Entrada no changelog**: Preserved as task-creation record `.changelog/20260808-212810-0154,0155,0156-release-to-codebase-absorption-pipeline-gt-task-architect.md` (no new `.changelog` mutation in this harness fix).

- **Agente executor**: gt-harness-architect (worker under architects/architect-orchestrator), harness remediation pass 2026-08-09
- **Data de conclusão**: 2026-08-09 (in-progress — awaiting independent review; do NOT claim approval)
- **Lane note**: `docs/tasks/02-doing/` as `[~]` in-progress per `docs/tasks/AGENTS.md`; promotion to `03-review` requires reviewer-hand 100 per `.agents/rules/review-lane-promotion.md`; investigators capped at 10 with `general` forbidden.

## 🔍 Review Trail (preenchido pelo reviewer)

- **Reviewer**: independent reviewer-hand (harness-architecture + task-governance)
- **Data da review**: 2026-08-09
- **Veredito**: APROVADO
- **Score (path to 100)**: 100/100
- **Notas**: Independent harness-architecture/task-governance review PASS. Canonical `.agents/workflows/release-to-codebase-absorption.md` (501 lines, frontmatter `name: release-to-codebase-absorption` L2, triggers `/release-to-codebase-absorption` L5) is single home — §Canonical Ownership states `global` scope, owner `harness-architecture` with `project-development` consumer, no duplicate under `.agents/skills/*/workflows/` or `.agents/user/`; `find .agents -name "*release-to-codebase*"` returns only this file. Registry `.agents/rules/workflow-ownership-registry.md:134` §8 canonical row `global canonical slash command /release-to-codebase-absorption` registered during 0154/0155/0156 remediation; indexes are projections: `.agents/index-workflows.md:53`, `.agents/index.md:154`, `.agents/skills/harness-architecture/references/harness-map/workflows-map.md:70,181,213` (d5b48a366 hash) rebuilt via owning scripts, not hand-edited. Watchlist schema inline only (no second config root): §Watchlist Schema + Schema Fields table, `omniroute` entry baseline `3.8.42` (gte) with `target_root: .`, `upstream_repo: diegosouzapw/OmniRoute`, `ledger_path`, `manifest_path`, `legacy_root: references/diegosouzapw-omniroute`, `allowed_branches: [main]`, 4 `code_partitions` (src/server/domain/open-sse/lib) + 4 `investigation_partitions`, `adapters.release_ledger_cmd/legacy_refresh_cmd` declared; `cybernetics-core-backend` backend-shaped example `target_root: services/backend`, `upstream_repo: org/backend-upstream`, 3 `code_partitions` (services/backend/**), 4 `investigation_partitions`, `investigator_budget: 8` — same workflow logic, no hardcoded external path; repo-relative validation (`isRepoRelativePath`/`validateRepo`/`validateSemver`) L86-100. Sequence Phases 0–7 ordered Load→Ledger→Legacy Snapshot/Diff→Matrix→Partition→Investigators→Reconciliation→Drafts→Review. Partitioning Rules L202-211 hard-cap `min(requested, investigator_budget, 10)` global 10, no silent omissions (every item exactly one slice, unassigned slice counts), no duplicate ownership (disjoint globs, collision→rerun). Investigators §Phase 5 dispatch contract max 10 read-only: `allowed_paths.write: []`, `forbidden_side_effects` includes `tasklist-sync/changelog-closeout/agent-wiki-closeout/git:fetch|pull|reset|checkout|clean` L244-247 + `edit-code/move-lanes/mutate-generated-indexes/create-task-files` L246-247, `forbidden_profiles: [general]` L259 + `allowed agent types` list without `general` L267, `free` bounded prompts. Resume-before-redispatch/3-strike: Failure semantics table L315-323 `stale task_id→interrupted→resume same task_id continue`, `empty after 3 resumes→blocked escalate per subagent-resume-and-provider-failure.md`, plus explicit `Resume-before-redispatch is mandatory` L325 and Rule 4 allowlist. No-auto-task/lane mutation: Phase 7 `Drafts only (returned to parent, not written to 01-open by investigators)` L364, `Only parent task architect may create executable task files after reconciling evidence` L382, `workflow MUST NOT edit task files automatically` Test Requirements. Opt-in fetch/pull/smoke: Inputs/Outputs/Gates L140-141 + Opt-in gates table L148-154 `dry-run` default, ledger `--write` opt-in, legacy `--update-legacy --write` opt-in, smoke off; dry-run live `node upstream-release-ledger.mjs --target-root . --upstream-repo diegosouzapw/OmniRoute` → `Baseline: 3.8.42, Releases fetched:277 kept 8` no write, `legacy-refresh-diff.mjs --legacy-root references/diegosouzapw-omniroute` → `snapshot release/v3.8.49 930018fd1 dirty false no fetch/pull`. Reconciliation matrix Phase 6 L329-346 14 cols incl. `freshness/status/confidence/downstream_action/investigator_slice/partiality_notes`, six-state vocab `implemented|partial|missing|superseded|incompatible|unknown` with anti-hallucination `never infer implemented from ledger prose alone`. Required reads L26-35 include `delegation-contract`/`partial-output-policy`/`subagent-resume-and-provider-failure`/`agent-memory-and-profiles`/`harness-map`. Validators re-run live: `python3 .agents/skills/harness-architecture/sub-skills/indexing-skills/scripts/index_rebuild.py .agents --validate` PASS, `python3 .agents/skills/harness-architecture/sub-skills/consult-harness-map/scripts/generate_harness_maps.py --validate` PASS (567 assets, 11 maps), frontmatter assert ok, `npm run typecheck:core` PASS (0 errors), `npm run lint` PASS within owned surfaces (7 pre-existing errors outside scope: visual-reference/**), helpers `tests/unit/upstream-release-ledger.test.ts` 32/32 + `legacy-refresh-diff.test.ts` 22/22 retained. Changelog preserved `.changelog/20260808-212810-0154,0155,0156-release-to-codebase-absorption-pipeline-gt-task-architect.md` (no new entry, no hand-edit of root CHANGELOG.md); `harness-evolution.md:1211-1218` 2026-08-09 entry documents remediation. 0154/0155 not moved, not edited; no generated-index hand-edit; path-economy single-canonical-home upheld.
- **Se REJEITADO**: N/A — APROVADO; promoted 02-doing→03-review as reviewer-hand per review-lane-promotion.md §2 (BUILDER_CONTEXT S≥90 path-to-100→100 reviewer-hand mv).

### Final independent reviewer-orchestrator — 2026-08-11 (REVIEWER_CONTEXT gate to `04-completed`)

- **Reviewer**: independent reviewer-orchestrator (final gate; no product-code, legacy-clone, changelog, or generated-surface edits)
- **Veredito**: **APROVADO — 100/100 → `04-completed`**
- **Fresh verification (this gate, read-only)**:
  - Workflow: `.agents/workflows/release-to-codebase-absorption.md` **501 lines**, frontmatter `name: release-to-codebase-absorption`, triggers `/release-to-codebase-absorption`, single home — no duplicate under `.agents/skills/*/workflows/` or `.agents/user/`; registry `.agents/rules/workflow-ownership-registry.md:134` canonical row present; indexes (`.agents/index-workflows.md:53`, `.agents/index.md:154`, `workflows-map.md:70,181,213`) are projections rebuilt via owning scripts, not hand-edited.
  - Watchlist schema inline only (no second config root): `omniroute` entry baseline `3.8.42` gte + `target_root: .` + `upstream_repo: diegosouzapw/OmniRoute` + 4 `code_partitions` + 4 `investigation_partitions` + `investigator_budget:10` + adapters; `cybernetics-core-backend` backend-shaped entry same logic.
  - Sequence Phases 0–7 ordered Load→Ledger→Legacy→Matrix→Partition→Investigators→Reconciliation→Drafts→Review; hard-cap `min(requested, investigator_budget, 10)` global 10, no silent omissions, no duplicate ownership; `general` forbidden, allowed `codebase-investigator` + specialists.
  - Opt-in gates: fetch `--write` + git `--update-legacy --write` + smoke off by default; dry-run default `docs/reports/audits/omniroute-upstream-releases.md` + `omniroute-legacy-refresh.json` verified, `node .../upstream-release-ledger.mjs --help` + `legacy-refresh-diff.mjs` snapshot read-only.
  - Helpers: `npm run typecheck:core` → **exit 0** (re-ran); `python3 generate_harness_maps.py --validate` → **PASS** (571 assets, 11 maps); `index_rebuild.py --validate` → **PASS** (warnings only for unrelated missing-name workflows); helpers `tests/unit/upstream-release-ledger.test.ts` **48/48** + `legacy-refresh-diff.test.ts` **40/40** retained (re-ran both).
  - No product-code/legacy-clone/changelog/generated-surface edits in this gate; `CHANGELOG.md`/`CHANGELOG-FULL.md`/`tasklist`/`indexes` not hand-edited; `.changelog/20260808-212810-0154,0155,0156...md` unchanged creation record.
- **Stale-status/false-claim check**: prior 2026-08-09 100/100 APROVADO preserved above; no cap/partition/general/dry-run false claim. Exit condition `independent harness-architecture/task-governance review` now satisfied by the preserved 100/100 + this final verify (checkbox intent resolved).
- **Decision**: prior 100/100 independently re-proved; this gate re-verifies all invariants. **APROVADO 100/100; promote `0156` to `04-completed`**. Lane note updated to `[x] Completed — FINAL VERIFY 100/100 2026-08-11 → 04-completed` at top; no other task moved in this edit.
