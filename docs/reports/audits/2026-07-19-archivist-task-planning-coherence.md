# Archivist Audit — Task / Planning Coherence

| Field | Value |
|-------|-------|
| **Date** | 2026-07-19 |
| **Auditor** | gt-archivist (read-only) |
| **Project** | omniroute-2 / omniroute-fusion |
| **Workspace** | `/home/sephiroth/working/ganthritor/omniroute-2` |
| **Scope** | Task lanes + planning surfaces + planning governance rules + FUSION.md status claims |
| **Not in scope** | Deep product-code review, changelog publish, task moves, index rebuilds |

---

## Scope / method

### Surfaces read

| Surface | Path | Result |
|---------|------|--------|
| Planning artifacts | `docs/tasks/00-planning/*.md` (10 files) | Full read or header + child/lane sections |
| Open lane | `docs/tasks/01-open/*` | 1 file header |
| Doing / review lanes | `docs/tasks/02-doing/`, `03-review/` | Empty directories |
| Completed inventory | `docs/tasks/04-completed/` | Full listing + sample headers (0010, 0017, 0018, 0024, 0025, 0032, 0034, 0037, 0040, 0051, 0061) |
| Queue | `docs/tasks/00-planning/QUEUE-post-adversarial-return.md` | Full |
| Naming rule | `.agents/rules/planning-artifact-naming.md` | Full |
| Lifecycle rule | `.agents/rules/docs-folder-lifecycle-and-indexing.md` | Full |
| Lifecycle guide (canonical) | `docs/guides/docs-folder-lifecycle-and-indexing.md` | **Missing** |
| Architecture status | `docs/architecture/FUSION.md` header + acting claims | Lines 1–80 + acting grep |
| Tasklist | `docs/tasks/tasklist.md` | **Does not exist** |
| Builder closeout (context) | `docs/reports/builders/2026-07-18-wave-closeout.md` | Header (stale vs today for `03-review`) |

### Method

1. Inventory file counts per lane.
2. Compare epic/queue **lane claims** to filesystem reality.
3. Check `00-planning/` filenames against planning-artifact-naming prefixes.
4. Flag status/lifecycle drift (Active/Planning vs completed children).
5. Note missing generated surfaces and broken rule pointers.
6. Produce Wave-2 investigative hypotheses only where docs imply product state that code should confirm.

**No fixes applied. No tasks created. No files moved.**

---

## Inventory counts by lane

| Lane | Path | Count | Notes |
|------|------|------:|-------|
| Planning | `docs/tasks/00-planning/` | **10** | 9 planning artifacts + 1 QUEUE |
| Open | `docs/tasks/01-open/` | **1** | `0036` only (operator-gated :21000 verify) |
| Doing | `docs/tasks/02-doing/` | **0** | Empty |
| Review | `docs/tasks/03-review/` | **0** | Empty (bulk-promoted after 2026-07-18 builder closeout) |
| Completed | `docs/tasks/04-completed/` | **50** | See number map below |
| Tasklist | `docs/tasks/tasklist.md` | **0** | Missing generated surface |
| Archive (tasks) | `docs/tasks/.archive/` | **3** | template + 2 AD stubs only |

### Executable task number map (reality)

| Range | Expected epic / theme | Actual locations |
|-------|----------------------|------------------|
| 0010–0018 | Fusion first-class (0003) | All **04-completed/** (9 files; no 0019) |
| 0020–0031 | Frontend IA (0005) | All **04-completed/** (12 files) |
| 0032–0035 | Dual-mode auth (0006) | All **04-completed/** |
| **0036** | Dual-mode deploy verify (0006 S5) | **01-open/** only open executable |
| 0037–0039 | Auth-status UX (0007) | All **04-completed/** |
| 0040–0051 | Adversarial remediation (0008) | All **04-completed/** (12 files) |
| 0052–0061 | Post-0005 IA / theme / hubs (no parent epic status) | All **04-completed/** (10 files) |
| **0019** | — | **Gap** (never present in this tree) |

**Executable tasks total:** 51 files (50 completed + 1 open).  
**Planning-only IDs 0001–0009** share the numeric namespace with tasks but live only under `00-planning/` (naming-rule violation; see findings).

### Freshest coherent snapshot (partial)

`0009-builder-wave-2026-07-18-review-loop-learnings.md` correctly records post-builder state as of **2026-07-18** (`02-doing` empty, `01-open` = 0036 only). It still claims **`03-review/` holds 17 tasks at 100/100** — that was true at wave closeout, but **today those files are in `04-completed/`** and `03-review/` is empty. QUEUE (2026-07-11) is older and fully stale.

---

## Findings table

| ID | Severity | Evidence path | Claim vs Reality | Hypothesis for code investigation (if any) |
|----|----------|---------------|------------------|--------------------------------------------|
| F-01 | **blocker** | `docs/tasks/00-planning/QUEUE-post-adversarial-return.md` | QUEUE claims 0040–0051 in `03-review/`, dual-mode 0032–0039 in `03-review/`, fusion 0010–0018 holds in `03-review/`, hard-queue 0024/0025/0017 in `02-doing/` with REJECT scores; Progress still marks Q1–Q3 as done→`03-review` and Q4 pending. **Reality:** only **0036** remains open; **0024/0025/0017 and 0040–0051 are all in `04-completed/`** with Status Completed 100/100 (promoted 2026-07-18). | None (docs-only). Rebuild or supersede QUEUE before any builder session uses it. |
| F-02 | **blocker** | `docs/tasks/00-planning/0003-omniroute-fusion-first-class-epic.md:3` | Header: “Active (Epic) — child tasks in `docs/tasks/01-open/0010`–`0018`”. **Reality:** 0010–0018 all under `04-completed/`; none in `01-open/`. Epic §13 acceptance (“all children in 04-completed”) is **met on filesystem** but status line still **Active** with wrong lane. | Optional: confirm fusion runtime still matches epic acceptance scenarios A–G; docs claim completion evidence on tasks, not re-verified here. |
| F-03 | **blocker** | `docs/tasks/00-planning/0008-omniroute-adversarial-remediation-epic.md:3,79-81,221-243` | Status: “Planning (children already in `01-open/` as 0040–0051)”; stop-criteria still list 0017 in `02-doing` and fusion/dual-mode/IA blocks in `03-review`. **Reality:** 0040–0051 **04-completed/**; 0017 **04-completed/**; `02-doing`/`03-review` empty. | Residual adversarial P2/P3 items deferred in epic may still exist in code; Wave-2 reviewers should not re-open closed task IDs without new findings. |
| F-04 | **major** | `docs/tasks/00-planning/0006-…epic.md:3,210-218`; `0007-…epic.md:3,136-142` | Both: “Planning (promote child tasks next)” while § Child tasks already list paths under `01-open/0032–0039`. **Reality:** 0032–0035, 0037–0039 **completed**; only **0036** still open (deploy/verify). Epic success metrics for live :21000 heal remain **unproven** until 0036. | Code for dual-mode helpers may be shipped; **production :21000 data** may still hold false `no_refresh_token` apikey rows until 0036 runs (ops/data, not planning). |
| F-05 | **major** | `docs/tasks/00-planning/0004-omniroute-fusion-acting-unit-epic.md:3,76-84` vs `docs/architecture/FUSION.md:1-74` | Epic 0004: **Active (implementation in progress)**; acceptance checklist **all unchecked**; **no child tasks** under any executable lane. FUSION.md (lastUpdated 2026-07-18) documents acting as first-class (units table, miss→acting-only, `finalizeWithActing`). Completed tasks 0010/0017/0018 evidence references acting/DAG walk. | **H1:** Acting was absorbed into 0003 children (0010–0018) without promoting 0004 tasks or updating 0004 acceptance. Confirm `acting` in Zod schema, `resolveFusionUnits`, `handleFusionChatV2`, combo miss path, UI editor section. |
| F-06 | **major** | `.agents/rules/planning-artifact-naming.md` vs all `00-planning/000N-*.md` | Rule: planning files MUST use `EPIC-`/`STORY-`/`PLAN-`/`HOLD-`/`ROADMAP-`/`CANDIDATE-`, not bare `NNNN-project-description.md` (executable identity). **Reality:** every planning file is `0001`…`0009-…md` bare task-style names (plus QUEUE). | None (rename/governance only). |
| F-07 | **major** | `docs/tasks/tasklist.md` (absent); refs in `0003` L521, `0008` L223 | Epics reference `tasklist.md` as a surface “not to edit / parent may refresh”. **Reality:** file **does not exist** under `docs/tasks/`. Agents have no single lane ledger. | None unless project process requires generated tasklist from parent harness. |
| F-08 | **major** | `.agents/rules/docs-folder-lifecycle-and-indexing.md` → `docs/guides/docs-folder-lifecycle-and-indexing.md` | Binding rule points at canonical guide. **Reality:** `docs/guides/` has no `docs-folder-lifecycle-and-indexing.md` (only UI.md and product guides). | None (missing doc asset; rule pointer broken). |
| F-09 | **major** | `docs/tasks/00-planning/0005-…epic.md:3,397-417` | Epic status correctly **S0–S10 closeout complete**; most child paths `04-completed/`. **Stale paths:** 0026 path “`docs/tasks/` lane for …” (vague); 0031 path still `03-review/… → promote` while file is **`04-completed/0031-…`**. Closeout note still allows S10 in `02-doing`. | None for 0005 core; later **0052–0061** continue IA/theme without linking back into 0005 status (see F-12). |
| F-10 | **minor** | `docs/tasks/00-planning/0009-…learnings.md:13-14` + `docs/reports/builders/2026-07-18-wave-closeout.md:10-12` | Accurate as-of 2026-07-18 for open/doing; claim **17 tasks remain in `03-review/`**. **Reality 2026-07-19:** `03-review/` empty; those tasks live in `04-completed/` (Status lines say promoted 2026-07-18). | None — date-stamp / supersede narrative after bulk promote. |
| F-11 | **minor** | `docs/tasks/04-completed/*` sample Status blocks | Many completed files still embed historical lane notes (“remain in `03-review`”, “not auto-promoted”) inside body sections while header is Completed. Confusing for agents grepping “03-review” inside completed files. | None (archival body hygiene). |
| F-12 | **minor** | `04-completed/0052`–`0061` vs epic 0005 | Theme/IA hub wave (0052–0061) completed without an updated parent epic or ROADMAP in `00-planning/`. Overlaps 0005 “maintenance only” claim. | Product IA may have diverged from UI.md leaf counts after 0059 Operations hub (0005 itself notes primary chrome 9 after 0059). |
| F-13 | **minor** | `0001` PLAN-class web providers; `0002` deferred captcha; fusion epic related links | Orthogonal plans still “Planning”; 0002 explicitly deferred. No lane contradiction. Naming still bare `NNNN-`. | Optional product: web providers still broken for fusion panels (out of this audit). |
| F-14 | **minor** | Number gap **0019** | Fusion numbering jumps 0018→0020; no orphan file found. | None unless historical cancel without archive note. |

---

## Planning naming violations (question 1)

Per `.agents/rules/planning-artifact-naming.md`, **all** of the following violate the required prefixes (should be `EPIC-` / `PLAN-` / `HOLD-` / `CANDIDATE-` / `ROADMAP-`, not bare `NNNN-`):

| Current filename | Suggested class |
|------------------|-----------------|
| `0001-omniroute-web-providers-fix-plan.md` | `PLAN-` |
| `0002-omniroute-qwen-web-captcha-solver.md` | `HOLD-` or `CANDIDATE-` (deferred) |
| `0003-omniroute-fusion-first-class-epic.md` | `EPIC-` |
| `0004-omniroute-fusion-acting-unit-epic.md` | `EPIC-` |
| `0005-omniroute-frontend-ia-design-system-epic.md` | `EPIC-` |
| `0006-omniroute-dual-mode-auth-refresh-correctness-epic.md` | `EPIC-` |
| `0007-omniroute-provider-connection-auth-status-ux-epic.md` | `EPIC-` |
| `0008-omniroute-adversarial-remediation-epic.md` | `EPIC-` |
| `0009-builder-wave-2026-07-18-review-loop-learnings.md` | `PLAN-` or `ROADMAP-` (process learnings) |
| `QUEUE-post-adversarial-return.md` | Acceptable non-`NNNN` name; still a **stale queue** artifact (F-01) |

Historical-import exception in the rule does **not** fit: these are active planning epics, not frozen imports.

---

## Epic child-lane mismatches (questions 2, 5, 7)

| Epic | Declared status / children lane | Reality | Lifecycle verdict |
|------|----------------------------------|---------|-------------------|
| **0003** Fusion first-class | Active; children `01-open/0010–0018` | Children **04-completed/**; epic acceptance §13 largely filesystem-true | **Should not stay “Active”** as open work; archive/close narrative or mark COMPLETE with residual note |
| **0004** Fusion acting | Active, unchecked ACs, no children | Runtime docs claim acting shipped; no 0004 tasks ever promoted | **Status/doc mismatch** — close as absorbed into 0003 **or** spawn verification task after code check (H1) |
| **0005** Frontend IA | Closeout complete; mostly correct paths | 0026/0031 path strings stale; later 0052–0061 unlinked | **Best of the set**; minor path fixes only |
| **0006** Dual-mode auth | Planning / promote next; children listed as `01-open/` | 0032–0035 done; **0036 open** | Epic not closable until 0036; status should be **partial complete / blocked on ops verify** |
| **0007** Auth-status UX | Planning / promote next; children `01-open/0037–0039` | All three **04-completed/** | Epic children done; should close or mark COMPLETE |
| **0008** Adversarial | Planning; children `01-open/0040–0051` | All **04-completed/** | Same as 0003/0007 — **stale Active/Planning** |

### Completed claims still “Active/Planning” (question 7)

- **0003, 0004, 0006, 0007, 0008** headers still read as open planning/implementation.
- **0005** is the only epic whose top-level status matches completion.
- **QUEUE** still frames adversarial/return work as current builder queue despite completion.

---

## QUEUE staleness (question 3)

| QUEUE claim | Reality 2026-07-19 |
|-------------|-------------------|
| 0040–0051 in `03-review/` awaiting independent review | All in `04-completed/`, headers 100/100 promoted 2026-07-18 |
| 0032–0039 stay `03-review` | All completed except 0036 open |
| Fusion 0010–0016, 0018 S≥90 holds in `03-review` | All fusion tasks 0010–0018 in `04-completed/` |
| Q1 0024 / Q2 0025 in `02-doing` REJECT 84/81 | Both completed; 02-doing empty |
| Q3 0017 in `02-doing` score 88 | Completed in 04-completed |
| Q4 0036 pending in `01-open` | **Still true** — only accurate hard-queue item |
| Soft path-to-100 polish for dual-mode / tab kit / fusion | Superseded by 100/100 promote wave |

**Conclusion:** QUEUE is an historical snapshot (2026-07-11 + partial progress same day). It is unsafe as an operational pickup list. Prefer superseding with a dated “CLOSED — see 04-completed” banner or archive under planning hygiene (docs-only).

---

## Missing generated surfaces (question 4)

| Surface | Expected role | Status |
|---------|---------------|--------|
| `docs/tasks/tasklist.md` | Generated/refreshed lane ledger (referenced by epics) | **Missing** |
| `docs/guides/docs-folder-lifecycle-and-indexing.md` | Canonical lifecycle guide for binding rule | **Missing** (rule is a dangling pointer) |
| `docs/tasks/03-review/` content | Mid-lifecycle review parking | Empty (OK if promote complete; docs still point here) |
| Planning indexes / ROADMAP | Ordering of residual 0001/0002/0004/0009 | No `ROADMAP-*` file present |

---

## Duplicate / overlapping planning narratives (question 6)

| Overlap | Artifacts | Risk |
|---------|-----------|------|
| Fusion design thrice | Epic 0003 + Epic 0004 + `docs/architecture/FUSION.md` | 0004 looks unfinished while FUSION.md treats acting as shipped |
| Builder queue thrice | QUEUE (2026-07-11) + 0009 learnings (2026-07-18) + builder closeout report | Agents may pick QUEUE and rework completed tasks |
| Dual-mode status | 0006 epic “promote next” + completed 0032–0035 + open 0036 | Confuses “code done” vs “prod verified” |
| Frontend IA continuum | 0005 closeout + completed 0052–0061 without epic rollup | Looks like new unplanned IA epic already finished |
| Web providers for fusion | 0001 plan + 0003 related + 0002 deferred captcha | Still valid deferred track; low urgency |

---

## Recommendations

### Docs-only remediations (no code)

1. **Supersede QUEUE** with a terminal banner: only residual executable is **0036**; Q1–Q3 closed to `04-completed/`.
2. **Refresh epic headers** (status + child path tables):
   - 0003 → COMPLETE (or COMPLETE with residual metrics check) — children `04-completed/0010–0018`
   - 0004 → ABSORBED INTO 0003 / COMPLETE pending H1, **or** explicit open verification child
   - 0005 → keep COMPLETE; fix 0026/0031 paths to `04-completed/`
   - 0006 → IN PROGRESS — blocked on **0036** only
   - 0007 → COMPLETE (0037–0039)
   - 0008 → COMPLETE (0040–0051) with residual deferred list only
3. **Rename** `00-planning/` files to `EPIC-`/`PLAN-`/`HOLD-` prefixes (preserve content; update inbound links from epics/QUEUE carefully).
4. **Restore or create** `docs/guides/docs-folder-lifecycle-and-indexing.md` (or retarget the binding rule if the guide lives only in parent repo).
5. **Regenerate or explicitly drop** `docs/tasks/tasklist.md` references so agents do not hunt a phantom ledger.
6. **Date-stamp** 0009 / builder closeout as historical (`03-review` empty after bulk promote).
7. Optionally add a short `ROADMAP-` residual: 0036 ops verify; 0001 web providers; 0002 HOLD captcha; 0009 process upgrades as CANDIDATE tasks.

### Need code / ops investigation (not docs-only)

1. **H1 Acting unit (Epic 0004):** Does production code fully implement unchecked 0004 ACs, or only docs/tests partial?
2. **H2 Dual-mode on :21000 (0036):** Are live apikey rows still `no_refresh_token`? (Operator-gated; AGENTS.md prod ban on :21000 — verify via approved process only.)
3. **H3 Adversarial residuals:** Deferred fusion findings F-03-012 / F-03-W2-006 and any P2 stretch from 0051 — still open in code?
4. **H4 IA leaf counts after 0059:** UI.md / PRIMARY_SIDEBAR_ITEMS vs 0005 success metrics drift.

---

## Explicit investigative hypotheses (Wave 2 reviewers)

| ID | Hypothesis | Why it matters | Suggested verify (Wave 2) |
|----|------------|----------------|---------------------------|
| **H1** | Fusion **acting** unit is fully implemented in schema + runtime + UI despite Epic 0004 remaining Active with empty ACs | Prevents duplicate “implement acting” work or false “missing feature” bugs | Grep/assert `acting` in `combo.ts` schema, `resolveFusionUnits`, `handleFusionChatV2` / `finalizeWithActing` / `dispatchActingOnly`, fusions editor UI, unit tests |
| **H2** | Workspace dual-mode guards shipped (0032–0035) but **:21000 runtime/data** still lag (0036 unclosed) | Operators may still see false re-auth UX on prod data | Runbook on non-prod first; only operator-approved 21000 SQLite counts of `auth_type=apikey AND error_code=no_refresh_token` |
| **H3** | Epic 0008 “COMPLETE” on tasks does not imply **zero residual** adversarial findings | Security backlog may hide under deferred IDs | Cross-walk `docs/reports/0[0-8]-*.md` P0/P1 IDs to 0040–0051 Completion Evidence; list unmapped |
| **H4** | Post-0005 tasks **0052–0061** changed sidebar/hub IA after UI.md guardrail without epic rollup | No-new-leaf / leaf-count metrics may be stale | Live dump `PRIMARY_SIDEBAR_ITEMS` / presets vs `docs/guides/UI.md` § inventory |
| **H5** | QUEUE / epic wrong lanes could cause builders to **re-edit completed** fusion/IA/security surfaces | Regression risk from “path-to-100” rework already merged | Process only: ignore QUEUE hard queue except 0036; treat 04-completed as source of truth |
| **H6** | `tasklist.md` absence + bare `NNNN` planning IDs cause **namespace collisions** (planning 0003 vs task 0036 style) | Agents mis-route “Task 0003” vs “Epic 0003” | Confirm no automation keys on bare planning numbers; prefer EPIC- prefix rename |

---

## Verdict

**NEEDS GOVERNANCE FIX** (and secondary **NEEDS DOC FIX**)

| Dimension | Result |
|-----------|--------|
| Lane filesystem | Healthy: 1 open, 0 doing, 0 review, 50 completed |
| Planning status coherence | **Broken** for 0003/0004/0006/0007/0008 + QUEUE |
| Naming governance | **Broken** (0 of 9 artifacts use required prefixes) |
| Generated indexes | **Missing** tasklist; lifecycle guide pointer dead |
| Product-code implication | Likely mostly docs drift; **H1/H2** need Wave-2 confirmation |

Primary message: **executable work is nearly drained (only 0036 remains), but planning surfaces still advertise large Active/Planning queues and wrong lanes.** Treat `04-completed/` + single open `0036` as ground truth until epic headers and QUEUE are refreshed.

---

## Appendix A — Planning file inventory (headers)

| File | Declared status (header) |
|------|--------------------------|
| 0001 web providers plan | Planning |
| 0002 qwen captcha | Planning (deferred) |
| 0003 fusion first-class | Active — children 01-open 0010–0018 (**false**) |
| 0004 fusion acting | Active implementation (**no children; docs claim done**) |
| 0005 frontend IA | S0–S10 closeout complete (**mostly true**) |
| 0006 dual-mode auth | Planning promote next (**stale**; 0036 residual) |
| 0007 auth-status UX | Planning promote next (**stale**; children completed) |
| 0008 adversarial | Planning children 01-open 0040–0051 (**false**) |
| 0009 builder learnings | Planning only (process) — partially stale on 03-review |
| QUEUE-post-adversarial-return | Operational queue 2026-07-11 — **fully stale except 0036** |

## Appendix B — Sample completed task headers (promotion truth)

All sampled completed files share pattern:

```text
> **Status**: `[x]` Completed (… 100/100 — promoted 2026-07-18 …)
```

Examples: `0010`, `0017`, `0018`, `0024`, `0025`, `0032`, `0034`, `0037`, `0040`, `0051`, `0061`.

Bodies often still say “remain in 03-review” from pre-promote review protocol — historical, not current lane.

---

*End of audit. Read-only; no remediations applied.*
