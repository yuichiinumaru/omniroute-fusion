# Harness / Meta-Process / ASW Governance Audit — OmniRoute Child Workspace

| Field | Value |
|:------|:------|
| **Date** | 2026-07-19 |
| **Agent** | `gt-harness-architect` |
| **Parent** | `architect-orchestrator` Wave 1 |
| **Scope** | Harness / meta-process / ASW residual problems (not product feature code) |
| **Repo** | `/home/sephiroth/working/ganthritor/omniroute-2` |
| **Mode** | Read-only audit; **report only** (no asset mutations, no task creation) |
| **Primary skill** | `harness-architecture` → `harness-management` |
| **Evidence basis** | Live files under `.agents/`, `docs/tasks/`, `.memories/`, root `AGENTS.md` / `CLAUDE.md` |

---

## 1. Executive summary

OmniRoute is operating as a **mature child-project product workspace** (Next.js 16 + open-sse + SQLite + npm test matrix) with **strong local product governance** (`AGENTS.md`, `CLAUDE.md`, hard rules, port policy) but a **partially transplanted parent/Khala-centric harness**. The result is a predictable class of residual defects:

1. **Stack-wrong Definition of Done** (cargo/SurrealDB/mod.rs) while builders prove work with `npm` / Node test runners.
2. **Broken onboard chain** (`docs/tasks/AGENTS.md`, `000-template.md`, `tasklist.md`, `.changelog/`, `pm_lens/` missing).
3. **Planning-lane identity pollution** (`00-planning/` files use executable `NNNN-` names).
4. **Missing architects / researchers continuity lanes** (only `builders` + `reviewers` exist under `.memories/_by_lane/`).
5. **Stale generated harness maps** (2026-07-10 vs live 2026-07-19 work).
6. **Learnings from wave 0009 not yet institutionalized** into skills/workflows (U1–U7 candidates).
7. **OmniRoute specialist coverage exists but inventory inside `omniroute` skill is stale** (counts drift vs live product).

**Overall severity**: **High for governance correctness**; **Medium for day-to-day builder throughput** (builders/reviewers already compensated via local `AGENTS.md` + task-local exit conditions). Without remediation, Wave 2 task creation and onboard will keep re-importing Khala/Rust assumptions into a Node stack.

---

## 2. Evidence inventory (what was read / checked)

### 2.1 Must-read surfaces

| Surface | Present? | Notes |
|:--------|:--------:|:------|
| `docs/tasks/00-planning/0009-builder-wave-2026-07-18-review-loop-learnings.md` | ✅ | U1–U7 upgrade candidates; wave drain + :21000 hold |
| `.agents/skills/project-management/SKILL.md` | ✅ | Gateway healthy; assumes `tasklist-sync`, `pm_lens`, `.changelog/` |
| `.agents/skills/harness-architecture/SKILL.md` | ✅ | Gateway healthy; maps + child bootstrap + learning loop |
| `.agents/rules/definition-of-done.md` | ✅ | **Rust/cargo/SurrealDB-centric** |
| `.agents/rules/planning-artifact-naming.md` | ✅ | Active; requires PLAN-/EPIC-/etc. in `00-planning/` |
| `.agents/workflows/gt-ganthritor-onboard.md` | ✅ | Mandates `docs/tasks/AGENTS.md`; Khala/mothership stacks |
| `.agents/skills/omniroute/SKILL.md` | ✅ | Present; operational gateway + generated pack |
| Root `AGENTS.md` + `CLAUDE.md` | ✅ | Strong OmniRoute child-local product governance |

### 2.2 Presence / absence checks

| Asset | Expected by harness | Live status in this workspace |
|:------|:--------------------|:------------------------------|
| `docs/tasks/AGENTS.md` | Onboard step 1.2; create-tasks pre-req | **MISSING** |
| `docs/tasks/000-template.md` | DoD §5; create-tasks target template | **MISSING** |
| `docs/tasks/tasklist.md` (or `docs/tasklist.md`) | tasklist-sync / onboard / create-tasks | **MISSING** |
| `.changelog/` ledger | PM skill + DoD closeout | **MISSING** (root `CHANGELOG.md` exists as product changelog) |
| `pm_lens/` tool tree | `pm-lens-query` default discovery | **MISSING** |
| `.memories/_by_lane/architects/` | Onboard continuity for architects | **MISSING** |
| `.memories/_by_lane/researchers/` | Lane architecture | **MISSING** |
| `.memories/_by_lane/builders/` | Continuity | ✅ (index rebuilt 2026-07-18) |
| `.memories/_by_lane/reviewers/` | Continuity | ✅ (session 2026-07-18) |
| Harness maps | consult-harness-map | ✅ but **stale** (`2026-07-10T22:18:55Z`) |
| Live agents under `.agents/agents/*.md` | Map count 59 | **59 profiles** (count matches map) |
| `docs/tasks` lanes | PM model | `00-planning` 10 · `01-open` 1 · `02-doing` 0 · `03-review` 0 · `04-completed` 50 |

### 2.3 Planning-lane naming sample (all noncompliant with rule)

Rule (`.agents/rules/planning-artifact-naming.md`): files in `00-planning/` MUST use `ROADMAP-` / `EPIC-` / `STORY-` / `PLAN-` / `HOLD-` / `CANDIDATE-`, **not** executable `NNNN-…` identity.

| File | Observed class | Rule-compliant? |
|:-----|:---------------|:---------------:|
| `0001-omniroute-web-providers-fix-plan.md` | plan content, **NNNN** name | ❌ should be `PLAN-` |
| `0002-omniroute-qwen-web-captcha-solver.md` | candidate/hold-like | ❌ |
| `0003-…-fusion-first-class-epic.md` | epic content, **NNNN** name | ❌ should be `EPIC-` |
| `0004-…-fusion-acting-unit-epic.md` | epic | ❌ |
| `0005-…-frontend-ia-design-system-epic.md` | epic | ❌ |
| `0006-…-dual-mode-auth-…-epic.md` | epic | ❌ |
| `0007-…-provider-connection-…-epic.md` | epic | ❌ |
| `0008-…-adversarial-remediation-epic.md` | epic | ❌ |
| `0009-builder-wave-…-learnings.md` | plan / process learnings | ❌ should be `PLAN-` |
| `QUEUE-post-adversarial-return.md` | queue / hold-ish | ⚠️ not EPIC/PLAN/HOLD prefix |

---

## 3. Findings table

| ID | Severity | Area | Finding | Evidence | Impact if unfixed |
|:---|:---------|:-----|:--------|:---------|:------------------|
| **F1** | **P0** | DoD / stack | Global DoD is **cargo/SurrealDB/mod.rs** and does not map to OmniRoute npm matrix | `.agents/rules/definition-of-done.md` L12–20, L33–34 (`cargo check/test`, `mod.rs`, SurrealDB `.bind()`) vs root `AGENTS.md` / `CLAUDE.md` (`npm run typecheck:core`, `test:unit`, `test:vitest`, `test:coverage`, Hard Rule #18) | Agents can mark tasks "not DoD-ready" for missing cargo, or invent cargo evidence; phantom completions relative to real gates |
| **F2** | **P0** | Onboard / tasks | Onboard **requires** `docs/tasks/AGENTS.md` which **does not exist** | `gt-ganthritor-onboard.md` L34–38; `gt-create-tasks.md` L14; zero file under `docs/tasks/**/AGENTS.md` | Mandatory onboard is unsatisfiable; create-tasks pre-req false; new sessions invent task protocol |
| **F3** | **P0** | Task template | DoD and create-tasks require `docs/tasks/000-template.md`; **missing** | DoD §5 L42; create-tasks L9, L15–16; no template file in `docs/tasks/` | Task shape drifts; 50-line / first-subtask rules unenforceable |
| **F4** | **P1** | Tasklist | No generated `tasklist.md`; PM skill forbids hand-edit and expects rebuild | No `docs/tasks/tasklist.md` / `docs/tasklist.md`; PM skill L114; create-tasks L29 references `docs/tasklist.md` | Discovery defaults to raw `ls`; risk of number collision / stale open-set views |
| **F5** | **P1** | Onboard locus | Onboard is **mothership/Khala/multi-repo** centric, not OmniRoute-child | `gt-ganthritor-onboard.md` §2.1–2.5, §5.2 (cyberneticscore, ganthritor-rs, mothership, Khala synthesis, SurrealDB crates) | Wastes context; steers agents toward wrong stack docs; competes with local `AGENTS.md` |
| **F6** | **P1** | Planning naming | **All** `00-planning/` numeric files violate planning-artifact-naming | Rule vs `docs/tasks/00-planning/0001`–`0009` filenames | Builders may treat epics/plans as pickup tasks; number-space collision with executable tasks (0010+ already used in completed) |
| **F7** | **P1** | Continuity | **Architects lane memory missing**; researchers missing | `.memories/_by_lane/` has only `builders/`, `reviewers/` | Architect Wave 1 has no durable continuity; onboard step 1.4 fails for `architects` |
| **F8** | **P1** | PM tooling | `pm_lens` runtime **not installed** in this workspace | `pm_lens/` path absent; skill points to `pm_lens/.venv` + index DB | `pm-lens-query` cannot be default discovery path here; agents fall back to recursive walks the skill forbids |
| **F9** | **P1** | Changelog protocol | PM/DoD require project-local **`.changelog/`** ledger; absent | DoD L29–35; PM skill L116–133; no `.changelog/` dir (product `CHANGELOG.md` only) | Closeout protocol broken or diverted to wrong surface; manage-changelog not usable as documented |
| **F10** | **P1** | Create-tasks defaults | `gt-create-tasks.md` still bakes **cargo check/test** into exit conditions | L41 Exit Conditions list | New OmniRoute tasks re-export Rust gates unless author overrides |
| **F11** | **P1** | Review path-to-100 | Learning U4 conflicts with live review protocol | 0009 U4 wants 90–99 **must patch before return**; `gt-subagent-review.md` L133–135: **does not implement fixes**; builder owns path-to-100 | Recurrence of 0055-style residual (score 97 left in doing / parent resume) |
| **F12** | **P2** | Harness maps | Maps generated **2026-07-10**; 9 days behind live activity | `harness-map/rebuild-log.md` L3–17; count still 59 agents | Routing uses stale projection; onboard tells agents to trust maps first |
| **F13** | **P2** | Skill inventory drift | `omniroute` skill **stale product counts** | SKILL.md: "14 strategies", "37 tools", "16 scopes" vs live product (~18 strategies, 94 tools, 30 scopes per `AGENTS.md`) | Operational agents quote wrong inventory; same failure mode as 0009 §2.2 docs drift |
| **F14** | **P2** | Frontend harness locality | `frontend-quality-harness` project-specifics cover **cyberneticscore**, not OmniRoute | `frontend-quality-harness/project-specifics/` | U1/U2 IA matrix learnings have no OmniRoute-local checklist home |
| **F15** | **P2** | SQLite governance tension | Parent **sqlite-abolition** doctrine coexists with OmniRoute **better-sqlite3 as primary DB** | `.agents/rules/sqlite-abolition-policy.md` + exceptions listing OmniRoute backups as "migration residue" pending PostgreSQL | Agents may treat intentional SQLite as policy violation or plan wrong migrations |
| **F16** | **P2** | Coding-execution cargo residue | Hypothesis-loop sub-skill still cargo-centric | `coding-execution-harness/.../hypothesis-loop/SUBSKILL.md` L62, L70 | Implementation loops suggest `cargo check` mid-edit on TS code |
| **F17** | **P2** | Specialist gaps (suggest only) | Strong OmniRoute architect exists; gaps in **engineer dual**, **IA/nav specialist**, **prod-port operator protocol**, **docs-count gate agent skill wiring** | `gt-omniroute-architect` + `gt-9router-domain-reviewer` present; no dedicated `gt-omniroute-engineer`; no frontend-ia specialist; U6 prod-port hold not first-class in builder orchestration | Overloads architect; IA phantom failures recur without specialist checklist |
| **F18** | **P3** | QUEUE artifact class | `QUEUE-post-adversarial-return.md` is useful but outside naming taxonomy and **stale vs 2026-07-18 drain** | Queue still lists 0024/0025/0017 as hard returns; 0009 says those promoted | Agents may re-queue completed work |
| **F19** | **P3** | Index vs map parity | Root `index-agents.md` and maps both say 59; live `*.md` agent count is 59 | Spot-check consistent **on count**, but map timestamp stale | Low risk unless new agents added without rebuild |

---

## 4. Deep-dive analyses (focus areas)

### 4.1 DoD cargo-centric vs OmniRoute npm/test matrix — **governance gap: confirmed**

**Parent/universal DoD** (`.agents/rules/definition-of-done.md`) encodes:

- `cargo check` / `cargo test`
- Rust empty-body / `todo!()` / `panic!` checks
- SurrealDB bind discipline
- `mod.rs` export wiring
- Evidence fields that record cargo results

**OmniRoute child truth** (root `AGENTS.md` / `CLAUDE.md`):

- Validation matrix: `npm run lint`, `typecheck:core`, `typecheck:noimplicit:core`, `test:unit` (Node native), `test:vitest` (non-overlapping), `test:coverage` (60/60/60/60), `check:cycles`, quality ratchets
- Hard Rule #18: TDD or documented VPS test for bug fixes
- Prod port ban `:21000`; test on `:22000`
- Worktree isolation under `.claude/worktrees/`

**Gap class**: **Parent universal rule not stack-parameterized for child.**  
**Not a product bug** — a harness localization failure. Child has excellent product rules but DoD is still the wrong checklist for closeout.

**Recommended direction (Wave 2, not implemented here)**:

- Either child-local DoD overlay (`.agents/rules/definition-of-done.md` OmniRoute edition), **or** stack-switch table in universal DoD (Rust | TS/Node | Python | Flutter).
- OmniRoute row should cite real commands and dual-runner rule, not cargo.

### 4.2 Onboard missing `docs/tasks/AGENTS.md` — **gap: confirmed**

`gt-ganthritor-onboard.md` Step 1.2 is mandatory:

```text
Read: docs/tasks/AGENTS.md
```

Live tree: **no such file**. Related missing companions:

- `docs/tasks/000-template.md`
- `docs/tasks/tasklist.md` / `docs/tasklist.md`
- `.changelog/` (PM/DoD write surface)
- `pm_lens/` (default governance search)

Child **does** have strong root `AGENTS.md` task conventions implicitly (lane dirs under `docs/tasks/`, completed body of work), but the **harness-mandated** task-system constitution is absent.

**Recommended direction**:

- Author lean child `docs/tasks/AGENTS.md` that points to OmniRoute stack, lane model, evidence rules, and prod-port holds — **not** a copy of Khala task constitution.
- Or change onboard (parent-canonical) to: "read `docs/tasks/AGENTS.md` **if present**, else root `AGENTS.md` task sections" (child-local bootstrap).

### 4.3 Learnings in 0009 → skill/workflow upgrade candidates (list only)

From `0009` §4 (U1–U7). Status below is **institutionalization readiness**, not implementation.

| ID | Surface | Proposal (from 0009) | Current harness state | Wave-2 action class |
|:---|:--------|:---------------------|:----------------------|:--------------------|
| **U1** | `coding-execution-harness` | IA contract matrix: peer routes × mount × active style SSoT | No OmniRoute IA matrix template found; hypothesis-loop still cargo | Skill patch / reference add |
| **U2** | `frontend-quality-harness` | Nested controls; `HUB_SUBNAV_*` SSOT; absence tests for removed nav | Project-specifics = cyberneticscore only | Add `project-specifics/omniroute-dashboard.md` |
| **U3** | `security-harness` | Path-segment SSoT + multi vs single segment matrix; redirect re-validation | SSRF refs exist (`ssrf-validation-builder-patterns.md`); no explicit OmniRoute dual-helper rule | Sub-skill or reference upgrade |
| **U4** | `gt-subagent-review.md` | 90–99 cannot return without path-to-100 **patch** + re-score | Live protocol: subagent **does not patch**; builder owns fixes; parent owns moves | **Policy decision required** before edit (conflict) |
| **U5** | `archival-knowledge-harness` / docs accuracy | Live-count dump for inventory claims | Product has `check:docs-all` / fabricated-docs discipline; skill not wired as exit-condition template | Skill + create-tasks exit template |
| **U6** | `project-management` builder orchestration | Operator-gated prod ports (`:21000`) as first-class blocker type | Documented in root AGENTS.md; **not** first-class in builder-orchestration skill | Workflow + blocker taxonomy patch |
| **U7** | Test policy (cross-skill) | Sabotage-lite negatives (absence of dual href, white-on-primary, dead pillars) | code-quality sabotage-gate exists generically; not OmniRoute IA-specific | Reference + coding-execution checklist |

**Additional learning from 0009 not numbered but actionable**:

- Collision-aware waves, max 2 tasks/engineer, expert internal pass, specialized reviewers, numeric score-only promotion — **worked**; consider capturing in `builder-orchestration.md` "OmniRoute proven defaults" reference.

### 4.4 Planning naming noncompliance — **harness governance issue: confirmed**

Rule is clear; practice is the opposite. Planning files reuse the **same numeric namespace** as executable tasks (0001–0009 planning; 0010–0061 executable). That is exactly the anti-pattern the rule exists to prevent:

> Do not name a planning artifact `NNNN-project-description.md` merely because it will probably become a task later.

**Severity nuance**: Content of 0003–0008 is correctly *epic-shaped*, and 0009 is process planning — the defect is **filename/identity**, not that epics lack substance. Risk is agent pickup and ID collision, not empty planning.

### 4.5 Architects continuity / tasklist / pm_lens readiness

| Capability | Ready? | Evidence | Blocker type |
|:-----------|:------:|:---------|:-------------|
| Architects continuity | ❌ | No `.memories/_by_lane/architects/` | Missing lane bootstrap |
| Researchers continuity | ❌ | No researchers lane dir | Missing lane bootstrap |
| Builders continuity | ✅ | Continuity index 2026-07-18 wave drain | — |
| Reviewers continuity | ✅ | 2026-07-18 return-reviews session | — |
| tasklist-sync | ❌ | No tasklist artifact; skill assumes rebuild from lanes | Generated surface never created |
| pm_lens query | ❌ | No `pm_lens/` package/index in workspace | Tooling not absorbed / not bootstrapped |
| manage-changelog (project-local) | ❌ | No `.changelog/` | Ledger missing; product CHANGELOG is different surface |

**Wave readiness implication**: Architect orchestration can still run on **manual lane inventory** (as this audit did), but **must not claim** pm_lens-default or tasklist-synced state.

### 4.6 Agent / skill gaps for OmniRoute (suggestions only — no profiles created)

| Gap | Exists today | Suggested profile / asset (candidate only) | Rationale |
|:----|:-------------|:-------------------------------------------|:----------|
| Platform architecture + pipeline | `gt-omniroute-architect` | Keep; refresh stale strategy counts in body | Live agent good |
| 9Router domain review | `gt-9router-domain-reviewer` | Keep | Specialized reviewer present |
| OmniRoute **implementation** dual | Architect doubles as builder | Optional `gt-omniroute-engineer` (or explicit dual-mode section) | Reduces architect overload on pure build slices |
| Dashboard IA / nav contract | `gt-frontend-quality-reviewer` generic | Project-specific skill pack, not necessarily new agent | 0009 §2.1 phantom IA |
| Docs inventory accuracy | `gt-documentation-accuracy-reviewer` | Wire OmniRoute live-count commands into skill | 0009 §2.2 |
| Security path/SSRF OmniRoute | `gt-security-reviewer` + security-harness | Path-helper SSoT sub-skill | 0009 §2.3 |
| Prod port operator gate | root AGENTS.md only | Workflow blocker type + builder-orchestration hold list | Task 0036 / U6 |
| DevOps/runtime OmniRoute ports | `gt-devops-engineer` / runtime reviewer | Ensure :21000 ban + :22000 test matrix in prompts | Prod ban already hard in AGENTS |

**Not recommended**: proliferating generic "harness" agents; `gt-harness-architect` + `architect-orchestrator` already cover meta-work.

### 4.7 Stale harness map generation vs live agents

| Metric | Map (2026-07-10) | Live (2026-07-19) |
|:-------|:-----------------|:------------------|
| Generated at | `2026-07-10T22:18:55Z` | — |
| Agent count | 59 | 59 `*.md` profiles |
| Skill count (map) | 35 | not re-counted exhaustively |
| Subskill count (map) | 347 | not re-counted |
| Workflow count (map) | 87 | workflows dir has 50+ global files (skill-local extra) |

**Finding**: Count parity on agents reduces acute routing failure risk, but **content SHA stamps and lane maps are 9 days old**. Post-2026-07-10 wave activity (large IA + security closeout) is not reflected in map-derived routing notes. Onboard still mandates map consult for non-trivial delegation.

**Remediation class**: regenerate via  
`python3 .agents/skills/harness-architecture/sub-skills/consult-harness-map/scripts/generate_harness_maps.py --validate`  
(Wave 2 / parent-owned; **not done in this audit**).

### 4.8 Child-project governance surfaces (positive control)

| Surface | Status | Assessment |
|:--------|:------:|:-----------|
| Root `AGENTS.md` | ✅ | High-quality OmniRoute constitution; port ban; doc accuracy discipline |
| `CLAUDE.md` | ✅ | Engineering quickstart aligned with product |
| Local `.agents/` tree | ✅ | Full parent-derived harness present (not thin overlay only) |
| Product docs under `docs/` | ✅ | Deep architecture/security/framework docs |
| Task lanes under `docs/tasks/` | ✅ | Active; 50 completed; 1 open operator-gated |
| Memory lanes | ⚠️ | Partial (builders/reviewers only) |
| Parent-canonical skills | ✅ | Large tree present; localization incomplete |

This is **child-local product governance strong / harness localization incomplete** — not "no governance."

---

## 5. Hypotheses for Wave 2 (H-HARNESS-*)

These are **verification/remediation hypotheses**, not tasks. Wave 2 may convert selected ones into governed tasks. Several are **docs/rule verification only**.

| Hypothesis ID | Claim | Verification method (Wave 2) | Expected fix class | Priority |
|:--------------|:------|:-----------------------------|:-------------------|:--------:|
| **H-HARNESS-01** | Universal DoD is incompatible with OmniRoute proof gates and drives false/missing evidence | Diff DoD checklist items against last 10 completed tasks' exit conditions + review reports | Child DoD overlay **or** stack-parameterized DoD | P0 |
| **H-HARNESS-02** | Mandatory onboard fails closed on missing `docs/tasks/AGENTS.md` | Dry-run onboard checklist; confirm step 1.2 unsatisfiable | Create lean child `docs/tasks/AGENTS.md` **or** soften onboard "if present" | P0 |
| **H-HARNESS-03** | Missing `000-template.md` causes task shape drift and unenforceable DoD §5 | Sample completed tasks vs claimed template rules (line count, first subtask) | Add OmniRoute task template; retarget create-tasks | P0 |
| **H-HARNESS-04** | `gt-create-tasks.md` cargo defaults will re-infect new OmniRoute tasks | Read create-tasks exit-condition defaults; scan 01-open future drafts | Stack-aware exit condition recipes in create-tasks | P0 |
| **H-HARNESS-05** | Planning `NNNN-` names risk builder pickup / ID confusion with executable tasks | Policy check + agent pickup simulation; list collisions 0001–0009 planning vs historical | Rename planning files to EPIC-/PLAN-/HOLD- (archive-safe); keep content | P1 |
| **H-HARNESS-06** | Architect wave continuity is incomplete without `_by_lane/architects` | Onboard step 1.4 for architects agentID | Bootstrap architects (and researchers) continuity via agentlog | P1 |
| **H-HARNESS-07** | Without `tasklist.md`, wave planning under-counts open/review pressure | Compare manual lane inventory vs missing tasklist | Parent-owned `tasklist-sync` once template/AGENTS exist | P1 |
| **H-HARNESS-08** | `pm-lens-query` is documented as default but non-functional here | `test -d pm_lens` + ensure_index script | Bootstrap `pm_lens` **or** document child exception (manual inventory allowed) | P1 |
| **H-HARNESS-09** | `.changelog/` protocol cannot run as written; product CHANGELOG is a different surface | Trace manage-changelog expected paths vs root CHANGELOG.md | Either adopt project `.changelog/` ledger **or** localize PM closeout to product changelog rules | P1 |
| **H-HARNESS-10** | U4 (reviewer must patch 90–99) conflicts with `gt-subagent-review` non-implement authority | Diff 0009 U4 vs gt-subagent-review L133–145 vs parallel-review-builder | Explicit policy: either promote reviewer-owned path-to-100 for residual polish **or** reject U4 and keep builder-owned PATH_TO_100 | P1 |
| **H-HARNESS-11** | U1/U2 not institutionalized ⇒ IA phantom completion will recur on next dashboard wave | Trace 0054/0055/0057/0060/0061 failure patterns vs skill checklists | Skill patches + peer-route mount matrix template | P1 |
| **H-HARNESS-12** | U3 path dual-SSoT residual remains a harness gap even if code was fixed | Grep dual path helpers; check security-harness for single-SSoT rule | Security sub-skill / reference upgrade | P1 |
| **H-HARNESS-13** | U5 live-count discipline is product-script-strong but harness-exit-weak | Check create-tasks/DoD for mandatory live dump commands | Exit-condition template + archival-knowledge/docs-accuracy wiring | P2 |
| **H-HARNESS-14** | U6 prod-port hold is only in AGENTS hard rule, not builder-orchestration blocker type | Read builder-orchestration for operator-gated blockers | First-class EXTERNAL/OPERATOR_GATE blocker | P2 |
| **H-HARNESS-15** | Stale harness maps cause silent misrouting despite agent-count parity | Regenerate maps; diff SHA/status fields vs live | Rebuild maps; optional CI/ratchet on map age | P2 |
| **H-HARNESS-16** | `omniroute` skill inventory drift will produce wrong operational claims | Grep skill for strategy/tool/scope counts vs code constants | Skill inventory refresh + live-count rule (ties U5) | P2 |
| **H-HARNESS-17** | SQLite-abolition parent policy mis-frames OmniRoute intentional SQLite runtime | Read abolition policy + OmniRoute ARCHITECTURE/DB modules | Child exception / scope carve-out: OmniRoute SQLite is canonical, not residue | P2 |
| **H-HARNESS-18** | `QUEUE-post-adversarial-return.md` is stale vs 2026-07-18 drain and may re-queue done work | Diff queue task IDs vs `04-completed/` and 0009 promoted list | Archive or rewrite queue; prefer HOLD-/PLAN- naming | P3 |
| **H-HARNESS-19** | frontend-quality project-specifics lack OmniRoute ⇒ U2 has no home | Inspect `project-specifics/` | Add omniroute-dashboard project-specific pack | P2 |
| **H-HARNESS-20** | coding-execution hypothesis-loop cargo residue leaks into TS implementation loops | Grep coding-execution for cargo | Stack-switch snippets (npm matrix for OmniRoute) | P2 |

---

## 6. Suggested Wave-2 conversion priority (not tasks)

If architect-orchestrator converts findings later, suggested **order of governance ROI**:

1. **P0 localization pack**: DoD stack overlay + `docs/tasks/AGENTS.md` + `000-template.md` + create-tasks cargo defaults (H-01…H-04).
2. **P1 continuity + closeout surfaces**: architects lane memory, tasklist-sync once, changelog protocol decision, planning rename policy (H-05…H-09).
3. **P1 review policy decision**: U4 vs subagent non-implement (H-10).
4. **P1 skill institutionalization of 0009 U1–U3/U5–U7** (H-11…H-14, H-19).
5. **P2 hygiene**: map rebuild, omniroute skill counts, sqlite policy carve-out, coding-execution cargo residue (H-15…H-17, H-20).
6. **P3**: stale QUEUE cleanup (H-18).

**Do not** open product feature tasks from this audit. Operator-gated **Task 0036** remains the only product open item identified by 0009.

---

## 7. What is already healthy (keep)

| Asset / practice | Why it is healthy |
|:-----------------|:------------------|
| Root `AGENTS.md` port ban + doc accuracy + Hard Rules | Strong child constitution; overrides vague parent defaults in practice |
| Lane model under `docs/tasks/{00..04}-*` | Operational and populated (50 completed) |
| `gt-omniroute-architect` + `omniroute` skill existence | Domain specialist route exists |
| Specialized reviewers used in 0009 wave | Security / frontend / docs / ts split worked |
| Collision-aware waves + numeric 100 gate | Explicitly "what worked" in 0009 §3 |
| Builders + reviewers continuity after 2026-07-18 | Partial memory routing is real and recent |
| `planning-artifact-naming.md` rule existence | Correct rule; practice lags |
| CFA pack under harness-architect | Available for meta-audits |

---

## 8. Explicit non-actions (this Wave 1 audit)

Per mission constraints:

- ❌ No git / jj
- ❌ No deletes / archives
- ❌ No skill/workflow/rule/agent mutations
- ❌ No task creation from U1–U7
- ❌ No map regeneration
- ❌ No product code changes

Only deliverable: **this report**.

---

## 9. Residual risks for parent orchestrator

1. **Wave 2 implementers will re-read onboard and block on missing files** unless parent injects compact contract that exempts missing `docs/tasks/AGENTS.md` with root `AGENTS.md` substitute.
2. **DoD as written makes OmniRoute "never done"** if followed literally (no cargo).
3. **U4 without policy resolution** will produce contradictory reviewer instructions if promoted naively.
4. **pm_lens absence** means any instruction saying "use pm-lens first" is currently aspirational in this checkout.
5. **Planning numeric IDs** remain a latent collision footgun when creating next epic batch.

---

## 10. Audit completion checklist

- [x] Read 0009 learnings
- [x] Read project-management + harness-architecture gateways
- [x] Read DoD + planning-artifact-naming
- [x] Read onboard (Khala/mothership-centric sections noted)
- [x] Confirmed missing `docs/tasks/AGENTS.md`
- [x] Sampled omniroute skill presence + inventory drift
- [x] Noted child AGENTS.md/CLAUDE.md
- [x] Mapped F1–F19 findings
- [x] Emitted H-HARNESS-01…20 for Wave 2
- [x] No asset mutations beyond this report

---

*Report author: gt-harness-architect · Workflow: gt-harness-architecture · Sub-skill: harness-management · Parent: architect-orchestrator Wave 1*
