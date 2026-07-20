# Task Batch Review — Open Lane 0036 + 0062–0083

> **Date**: 2026-07-19  
> **Role**: gt-task-architect (READ-MOSTLY batch review)  
> **Mode**: Report only — **no task file edits**, no product code  
> **Scope**: All `docs/tasks/01-open/*.md` (22 files: **0036**, **0062–0083**)  
> **Quality bar**: Archive template `docs/tasks/.archive/000-template-moved-to-parent.md` (live `docs/tasks/000-template.md` **missing** — EPIC-14 / Task 0064)  
> **Context**: EPIC-10…14, EPIC-19; Wave synthesis + wave2 (fusion/security/frontend/harness/ts-expert) + wave3 (frontend IA / providers / hotpath / help)

---

## 0. Method

1. Inventory `01-open/` vs `04-completed/` and planning epics.  
2. Read headers, Depends/Parallel, Where ownership, Exit Conditions, and anti-false-gap language on every open task.  
3. Cross-check high-risk pairs (acting chip, fusion `fusion.ts`, EPIC-19 matrix, leaf-count freezes, docs SSoT).  
4. Axes: contradiction · overlap · missing deps · false-gap · evidence links · spec gaps · EPIC-19 collision · HOLD/priority.

**Verdict vocabulary**

| Tag | Meaning |
|-----|---------|
| **blocker** | Must fix (or HOLD task) before parallel promote/execute |
| **major** | Fix before concurrent execution of the named pair/cluster |
| **minor** | Spec polish; safe to ship after or with next touch |

---

## 1. Inventory table

| ID | Epic / origin | Severity | One-line |
|----|---------------|----------|----------|
| **0036** | 0006 / QUEUE Q4 | **major** (HOLD ops) | Live **:21000** dual-mode deploy proof; operator-gated; dry-run path OK; no explicit `HOLD` status banner |
| **0062** | EPIC-10 T10-A/C | minor | Planning hygiene 0003/0005–0008 + QUEUE supersede; solid; body still says “only open product task is 0036” (stale snapshot) |
| **0063** | EPIC-10 T10-B | minor | Epic 0004 closeout evidence; residual A6 correctly parked on EPIC-11/0067 |
| **0064** | EPIC-14 T14-A | minor | Restore template + `docs/tasks/AGENTS.md`; gates 0065 |
| **0065** | EPIC-14 T14-B | minor | DoD overlay + create-tasks npm exit recipe; depends 0064 hard |
| **0066** | EPIC-14 T14-C | minor | Skill inventory + SQLite exception + architects continuity |
| **0067** | EPIC-11 T11-A | minor | A6 combo tests + `dispatchActingOnly` honesty; owns `combo.ts` |
| **0068** | EPIC-11 T11-B | minor | Tool-call window sticky→latest assistant; owns `fusionTriggers.ts` |
| **0069** | EPIC-11 T11-C | minor | Single-survivor no double-upstream fail; owns `fusion.ts` before 0070 |
| **0070** | EPIC-11 T11-D | minor | Panel timeout abort; **hard depends 0069** |
| **0071** | EPIC-11 T11-E | **major** (overlap) | FUSION.md notes + **conditional** list acting chip — collides with **0077** on `fusions/page.tsx` |
| **0072** | EPIC-12 T12-A | minor | Tailscale enable/login LOCAL_ONLY+SPAWN; P0 security; serial `routeGuard` |
| **0073** | EPIC-12 T12-B | minor | Residual `err.message` sanitize; new finding IDs; no 0051 reopen |
| **0074** | EPIC-12 T12-C | minor | Secrets dual-read disposition; no 0041 reopen |
| **0075** | EPIC-13 T13-A | **major** (leaf freeze) | Fusions editor `RoutingHubSubnav`; **hardcodes `PRIMARY_SIDEBAR.length === 9`** |
| **0076** | EPIC-13 T13-B | **major** (leaf freeze + order) | Ops/Testing reverse chrome D1/D2; **freezes length 9**; UI.md reverse section |
| **0077** | EPIC-13 T13-C | **major** (overlap + docs) | List acting chip + NAV-TREE; **owns NAV-TREE** vs 0078/0082; length === 9 |
| **0078** | EPIC-19 T19-A | minor* | SSoT matrix freeze first; *soft doc collision with 0076/0077 NAV-TREE/UI.md |
| **0079** | EPIC-19 T19-B | minor | Providers ← budget/pricing/quota; depends 0078; parallel-safe vs 0080 |
| **0080** | EPIC-19 T19-C | **major** (soft serial) | Observe ← combo-health/route-trace; serial **prefer** vs 0081 on `analytics/page.tsx` only soft |
| **0081** | EPIC-19 T19-D | **major** (soft serial) | Dashboard storytelling + costs overview; must not re-host Observe tabs |
| **0082** | EPIC-19 T19-E | **major** (after B–D + leaf) | Drop analytics/costs primary leaves; exclusive `PRIMARY_SIDEBAR`; updates length tests |
| **0083** | EPIC-19 T19-F | minor | Tools→Ops verify-only; soft after 0082; no new lab leaves |

\*0078 content is sound; severity rises only if executed concurrent with 0077/0082 doc cutovers without section ownership.

**Lane snapshot at review**: `01-open` = 22 · `02-doing` = 0 · `03-review` = 0 · `04-completed` = 50 (+ historical drain 0010–0018, 0020–0061).

---

## 2. Findings

### F-1 — Dual claim: fusions list acting chip (0071 vs 0077)

| Field | Value |
|-------|--------|
| **Severity** | **major** |
| **Task IDs** | **0071**, **0077** |
| **Evidence** | 0071 Origin claims H-FUSION-010 + list chip; Where marks `fusions/page.tsx` **Modificar**; Exit requires chip “here or from 0077.” 0077 Objective is exclusively H-FUSION-010 chip + NAV-TREE; owns `fusions/page.tsx`. 0071 header has a collision note preferring FUSION.md-only if 0077 open — **body still lists dual product outcomes and dual Where rows.** EPIC-11 T11-E and EPIC-13 T13-C both list “list acting chip.” |
| **Recommended fix** | **Single owner**: **0077** = chip + unit test + NAV-TREE labs drift. **0071** = **FUSION.md only** (tool-call window post-0068, fallback H-006, survivor/abort notes post-0069/0070, *link* to list chip). Remove `page.tsx` from 0071 Where/Exits except “verify chip present after 0077.” Soft-depends 0071 on 0077 for the chip sentence. |

### F-2 — Leaf-count freeze (`=== 9`) fights EPIC-19 cutover (0075/0076/0077 vs 0082)

| Field | Value |
|-------|--------|
| **Severity** | **blocker** (if concurrent) / **major** (if ordered wrong) |
| **Task IDs** | **0075**, **0076**, **0077**, **0082** (+ tests they add) |
| **Evidence** | 0075/0076/0077 Exit + Test Requirements: `PRIMARY_SIDEBAR_ITEMS.length === 9` and current ids. EPIC-19 §3 + 0082: drop default-visible `analytics` + `costs` → expected **~7 product leaves + docs**, re-measure. 0082 is exclusive owner of membership cutover and must rewrite length/id tests. If 0075–0077 land tests that hard-fail when length ≠ 9, 0082 breaks them (or 0082 lands first and green 0075–0077 tests become red). |
| **Recommended fix** | In 0075–0077 replace absolute `length === 9` with **no-new-leaf relative asserts**: no `fusions`/labs primary; `DEVTOOLS_ITEMS` empty; do **not** freeze analytics/costs presence. State **0082 owns absolute length/id contract**. Order: residual polish **may** land before 0082, but must not encode pre-EPIC-19 leaf cardinality as permanent law. |

### F-3 — NAV-TREE / UI.md multi-owner without merge order (0076, 0077, 0078, 0082, 0083)

| Field | Value |
|-------|--------|
| **Severity** | **major** |
| **Task IDs** | **0076**, **0077**, **0078**, **0082**, **0083** |
| **Evidence** | 0077: “owns `NAV-TREE-TARGET.md`.” 0078: exclusive ownership of NAV-TREE L0/L1 rebalance + UI.md EPIC-19 sections. 0082: UI.md **live** primary table + NAV-TREE live chrome. 0076: UI.md reverse-chrome section. 0083: Tools interim in UI.md/NAV-TREE. Collision notes exist pairwise but no **global doc section map**. |
| **Recommended fix** | Freeze a **doc ownership matrix** (add to 0078 Completion Evidence or task headers): |

| Doc section | Owner task |
|--------------|------------|
| UI.md reverse chrome / Ops-Testing launchpad | **0076** |
| UI.md + NAV-TREE EPIC-19 planned matrix | **0078** |
| NAV-TREE labs/DEVTOOLS drift (pre-cutover) | **0077** (if still before 0078; else fold into 0078) |
| UI.md + NAV-TREE **live** primary after leaf drop | **0082** |
| Tools→Ops interim paragraph | **0083** (or 0078 if 0083 remains verify-only) |

Prefer order: **0076 → 0077 (chip + labs) → 0078 (planned EPIC-19) → 0079–0081 → 0082 (live) → 0083**. If EPIC-19 is prioritized first: fold 0077 NAV-TREE labs fix into 0078 and leave 0077 as chip-only.

### F-4 — `analytics/page.tsx` serial between 0080 and 0081 is soft only

| Field | Value |
|-------|--------|
| **Severity** | **major** |
| **Task IDs** | **0080**, **0081** |
| **Evidence** | Both mark Depends 0078 hard. 0080 “prefer serial before 0081”; 0081 “prefer after 0080”; Parallel class says serializable vs each other — but **Depends on** for 0081 does **not** list 0080 as hard. Collision notes describe dual-tab disposition but an agent could start both worktrees. |
| **Recommended fix** | Make **0080 hard-blocks 0081** (or 0081 hard-depends 0080). Require Completion Evidence line: “operational tabs redirected; storytelling tabs still on analytics for 0081.” Bundle review if same PR. |

### F-5 — 0036 :21000 HOLD / production port correctness

| Field | Value |
|-------|--------|
| **Severity** | **major** (ops / Hard Rule AGENTS) |
| **Task IDs** | **0036** |
| **Evidence** | Status is Open P0, not labeled HOLD. Objective targets container `omniroute-21000` / port **21000**. Root `AGENTS.md`: **PORT 21000 = PRODUÇÃO — NÃO MEXER**. Canary section correctly left 21000 untouched; dry-run on DB copy allowed. Wave synthesis: keep 0036 open as operator HOLD. Task allows docker exec / rebuild of production instance without a mandatory operator-approval gate checkbox. |
| **Recommended fix** | Add header: `> **HOLD**: live :21000 rebuild/restart **operator-only**; agents default to **DRY-RUN** on DB copy + source/bundle greps. Never `docker rm` / recreate 21000 without explicit operator command.` Priority remains P0 for *product correctness*, but execution lane = operator. Align QUEUE/0062 language: 0036 = residual HOLD, not “next free builder pickup.” |

### F-6 — EPIC-13 residual vs EPIC-19 priority (schedule, not matrix fight)

| Field | Value |
|-------|--------|
| **Severity** | **minor** (schedule) / **major** if 0075–0077 rewrite chrome EPIC-19 will re-touch |
| **Task IDs** | **0075–0077**, **0078–0083** |
| **Evidence** | EPIC-19: “0075–0077 orthogonal; do not block EPIC-19.” EPIC-19 Priority P0 product UX ahead of favorites; residual chrome can ship in parallel if file ownership held. 0075 only touches fusions editor — truly orthogonal. 0076 touches Ops peers / UI.md — orthogonal to matrix destinations. 0077 NAV-TREE + leaf 9 — **not** fully orthogonal (F-2/F-3). **No task reverses** Costs→Providers / combo-health→Observe / Analytics→Dashboard. |
| **Recommended fix** | Keep matrix destinations non-negotiable. Parallelize **0075** freely. Gate **0076/0077** docs + leaf asserts per F-2/F-3. Prefer EPIC-19 SSoT (**0078**) before large NAV-TREE rewrites in 0077 if both are queued. |

### F-7 — Fusion runtime chain ordering is sound; residual soft docs lag

| Field | Value |
|-------|--------|
| **Severity** | **minor** |
| **Task IDs** | **0067–0071** |
| **Evidence** | 0067 `combo.ts` ‖ 0068 `fusionTriggers.ts`; 0069 → 0070 serial on `fusion.ts`; 0071 soft after 0068/0069/0070 for prose. Matches EPIC-11 T11-A…E. 0067 allows optional `fusion.ts` export — could collide 0069 if mis-executed (header says default: do not edit fusion.ts). |
| **Recommended fix** | Strengthen 0067: **hard ban** on `fusion.ts` edit unless 0069/0070 already closed; if honesty needs export, bundle with 0069. 0071 wait on 0068 for trigger window prose (already stated — keep). |

### F-8 — False-gap posture is mostly clean

| Field | Value |
|-------|--------|
| **Severity** | **minor** (watch) |
| **Task IDs** | **0062–0063**, **0067**, **0072–0074**, **0075–0077** |
| **Evidence** | 0062/0063 explicitly close stale epic headers; 0063 rejects re-decompose Acting. 0067 is **tests/honesty** residual (H-FUSION-003/004 CONFIRMED), not re-open of 0010–0018. 0072–0074 cite new Wave2 IDs; forbid reopening 0040–0051/0041. 0075–0077 residual polish after 0052–0061, not re-IA of seven pillars. No open task rebuilds dual-mode helpers (0032–0035 done) except 0036 ops proof. |
| **Recommended fix** | None structural. On 0062: refresh Background “only open product task is 0036” to “as of promote wave: 0036 + EPIC-10…19 children” so hygiene task does not lie mid-execution. |

### F-9 — Spec / quality-bar gaps (template, cargo, exits)

| Field | Value |
|-------|--------|
| **Severity** | **minor** (process) |
| **Task IDs** | all; especially **0064–0065**, older **0036** |
| **Evidence** | Live `docs/tasks/000-template.md` **absent** (confirmed this review). Open 0062–0083 are generally **≥50 lines**, have Objective/Background/Test/Exit/Where/first-subtask read, npm `typecheck:core` + lint, parallel-safe notes. **No** open task mandates `cargo check` / Surreal `.bind()` as OmniRoute exits (0064/0065 exist to lock that). 0036 lacks structured Parallelism block (ops-only). Some tasks omit CHANGELOG when pure docs (0074 flexible) — acceptable if consistent. |
| **Recommended fix** | Land **0064 → 0065** early in governance wave so future audits use live template. Optionally add Parallel class `serializable` / `operator-hold` to 0036. |

### F-10 — CostsSubnav / overview split (0079 vs 0081)

| Field | Value |
|-------|--------|
| **Severity** | **minor** |
| **Task IDs** | **0079**, **0081** |
| **Evidence** | 0079 owns budget/pricing/quota-share → Providers; 0081 owns costs **overview** → Dashboard. Both may touch `CostsSubnav.tsx` (0079 serializable vs 0081 on that file; 0081 soft-coordinate). Matrix-correct if Overview points Dashboard and config tabs Providers. |
| **Recommended fix** | 0079 Completion Evidence: subnav link table (Overview → Dashboard builder from 0078; three config → Providers). 0081 must not rewrite Providers config redirects. Prefer 0079 before 0081 when both edit CostsSubnav. |

### F-11 — 0082 hard deps incomplete without 0078 explicit

| Field | Value |
|-------|--------|
| **Severity** | **minor** |
| **Task IDs** | **0082** |
| **Evidence** | Depends **0079+0080+0081** hard; table also cites **0078** SSoT but header Depends does not list 0078. Transitively OK if B–D require 0078. |
| **Recommended fix** | Add **0078** to Depends header for clarity. |

### F-12 — Priority consistency (0072 P0 vs EPIC-12 “P1 residual”)

| Field | Value |
|-------|--------|
| **Severity** | **minor** |
| **Task IDs** | **0072** |
| **Evidence** | Task priority 🔴 P0; EPIC-12 header “P1 (P0 for Tailscale spawn).” Consistent with spawn Hard Rule #15. No conflict with EPIC-19 matrix. |
| **Recommended fix** | None. May run **before or parallel** to EPIC-19 (disjoint files). |

### F-13 — Labs / no-new-leaf alignment (EPIC-19 + 0076/0077/0083)

| Field | Value |
|-------|--------|
| **Severity** | **minor** (positive) |
| **Task IDs** | **0076**, **0077**, **0078**, **0082**, **0083** |
| **Evidence** | All forbid promoting playground/translator/search-tools primary leaves. Matches EPIC-19 §2.4 and wave3 A1–A5 REJECT. 0083 verify-only post-rebalance is correct success-metric closer. |
| **Recommended fix** | None beyond F-3 doc order. |

### F-14 — 0062 inventory drift inside hygiene task

| Field | Value |
|-------|--------|
| **Severity** | **minor** |
| **Task IDs** | **0062** |
| **Evidence** | Background claims only product open task is 0036; at review time 0062–0083 also open. Risk: executor “closes hygiene” while assuming empty open lane. Same class of drift can leave QUEUE “only 0036 residual” language hiding 0067–0083. |
| **Recommended fix** | Scope note: hygiene targets **0003–0008 + QUEUE** only; open residual series 0062+ is intentional post-wave promote. QUEUE terminal banner must list **0036 HOLD** plus pointer to open EPIC-10…19 children (or “see `01-open/`”). |

### F-15 — 0078 matrix may leave destination shape as “or” (implementer drift)

| Field | Value |
|-------|--------|
| **Severity** | **major** |
| **Task IDs** | **0078** (feeds 0079–0081) |
| **Evidence** | Epic + 0078 still phrase Providers destinations as e.g. `/dashboard/providers/budget` **or** providers subnav equivalent; Observe as `?panel=` **or** activity subnav. Task says “pick **one** and export builder” but Exit Conditions do not fail closed if both schemes appear in prose without a single exported canonical. Parallel second-pass: `docs/reports/audits/2026-07-19-task-batch-adversarial-second-pass.md` C-05. |
| **Recommended fix** | 0078 Exit: **exactly one** string form per destination family in code SSoT; unit test fails if matrix `to` strings diverge from builders. No “or” in frozen constants. |

### F-16 — Possible missing legacy redirect: `usage` → costs/budget family

| Field | Value |
|-------|--------|
| **Severity** | **minor** (confirm live) |
| **Task IDs** | **0078**, **0079**, **0082** |
| **Evidence** | Adversarial second-pass flags legacy **`usage` → `/dashboard/costs/budget`** style aliases may exist outside Epic §4 table. If live `OBSERVE_REDIRECT`-style or sidebar/palette still links `usage`/`costs` aliases, EPIC-19 matrix incompleteness. **Must grep** before inventing: `rg "usage|costs/budget" src/shared src/app`. |
| **Recommended fix** | If grep hits: add rows to 0078 redirect matrix + 0079/0082 tests. If zero hits: document “no legacy usage path” in 0078 Completion Evidence (anti false-gap). |

---

## 3. Overlap matrix (high-risk pairs)

| Pair / cluster | Shared surface | Overlap type | Safe if… | Risk if ignored |
|----------------|----------------|--------------|----------|-----------------|
| **0071 ↔ 0077** | `fusions/page.tsx`, H-FUSION-010 | **Double work / dual ownership** | 0071 docs-only; 0077 chip | Conflicting chips / double PR thrash |
| **0075 ↔ 0077** | fusions list vs editor | File split OK | 0075 = editor/client; 0077 = list page | Low if ownership held |
| **0075 ↔ 0076** | none product | Parallel-safe | As written | Low |
| **0069 ↔ 0070** | `open-sse/services/fusion.ts` | Serial runtime | 0069 then 0070 | Merge conflict / abort vs finalize races |
| **0067 ↔ 0069** | optional `fusion.ts` | Soft serial | 0067 no fusion.ts edit | Honesty refactor breaks survivor tests |
| **0067 ↔ 0068** | combo vs triggers | Parallel-safe | File split | Low |
| **0076 ↔ 0082** | UI.md live table; leaf count tests | **Contract fight** | Soften ===9; 0082 owns length | Red CI on leaf drop |
| **0077 ↔ 0082** | NAV-TREE live; length === 9 | **Doc + test fight** | Order + ownership matrix | Stale 9-leaf docs/tests |
| **0077 ↔ 0078** | NAV-TREE-TARGET.md | Doc ownership | Section split or fold labs into 0078 | Overwrite labs vs planned matrix |
| **0076 ↔ 0078** | UI.md | Section ownership | reverse chrome vs EPIC-19 sections | Mid-file thrash |
| **0078 ↔ 0079–0082** | path builders | Hard chain | 0078 first | Invented homes / dual schemes |
| **0079 ↔ 0080** | none if ownership held | Parallel-safe | 0079 Providers; 0080 Observe | Low |
| **0080 ↔ 0081** | `analytics/page.tsx` | **Serial required** | 0080 hard before 0081 | Dual shells / wrong tab redirects |
| **0079 ↔ 0081** | `CostsSubnav`, costs overview | Soft serial | 0079 config first; 0081 overview only | Broken Overview vs budget links |
| **0082 ↔ 0083** | primary chrome dump | Soft order | 0083 after 0082 | Verify against pre-cutover chrome |
| **0076 ↔ 0083** | Ops/Testing hubs | Compatible | 0076 D1/D2; 0083 no Labs leaf | Low if 0083 doesn’t re-open reverse chrome |
| **0072 ↔ 0073** | tailscale enable/login stretch sanitize | Soft serial | 0073 avoid enable/login if 0072 open | Double edit routes |
| **0036 ↔ *all*** | :21000 ops | Orthogonal files | HOLD live mutate | Production session kill |
| **0062 ↔ 0063** | planning files | Parallel-safe | 0062 ≠ 0004; 0063 = 0004 only | Low |
| **0064 ↔ 0065** | template/AGENTS | Hard serial | 0064 then 0065 | 0065 points at missing template |

### EPIC-19 matrix compliance (destinations)

| Matrix row | Task coverage | Fights matrix? |
|------------|---------------|----------------|
| Costs budget/pricing/quota → **Providers** | 0078 freeze + **0079** | **No** |
| Combo-health + route-trace (+`id=`) → **Observe** | 0078 + **0080** | **No** |
| Remaining analytics + costs overview → **Dashboard** | 0078 + **0081** | **No** |
| Drop Analytics/Costs leaves | **0082** | **No** (0075–77 freeze length is process fight, not destination fight) |
| Tools → Operations (no new leaf) | **0083** + 0076/0077 no-new-leaf | **No** |

---

## 4. Dependency DAG (executable order sketch)

```
Governance (EPIC-10/14):
  0062 ‖ 0063 ‖ 0064 ‖ 0066
                └→ 0065

Security (EPIC-12):
  0072  (serial routeGuard)
  0073  (‖ 0072 if file-disjoint; after if shared tailscale routes)
  0074  (‖)

Fusion runtime (EPIC-11):
  0067 ‖ 0068
  0069 → 0070
  0071  (after 0068; after 0069/0070 for prose; chip via 0077)

Frontend residual (EPIC-13) — after F-2/F-3 fixes:
  0075 ‖ 0076
  0077  (chip; NAV-TREE labs only if not folded into 0078)

EPIC-19:
  0078
   ├→ 0079 ‖ 0080
   │         └→ 0081  (hard after 0080)
   └→ 0082  (after 0079+0080+0081)
        └→ 0083  (soft)

Ops HOLD:
  0036  (operator; never parallel with docker touch of 21000)
```

---

## 5. Axis summary

| Axis | Result |
|------|--------|
| **1. Contradiction** | No product outcome contradiction on EPIC-19 destinations. **Process contradiction**: length===9 forever vs post-0082 shorter chrome (F-2). |
| **2. Overlap / double work** | **0071/0077** acting chip (F-1). Doc multi-owner (F-3). CostsSubnav soft (F-10). |
| **3. Missing deps** | 0081 should hard-depend 0080 (F-4). 0082 should list 0078 (F-11). 0071 soft-dep 0077 for chip (F-1). |
| **4. False-gap** | Clean — residuals use new IDs; 0003–0008 closeout tasks prevent rework (F-8). |
| **5. Evidence links** | Strong Wave2/Wave3/EPIC citations on 0062–0083. 0036 older but has canary evidence. |
| **6. Spec gaps** | Live template missing (0064). 0036 missing Parallel/HOLD banner (F-5/F-9). Otherwise exits binary + npm (not cargo). |
| **7. EPIC-19 matrix** | **Aligned** on destinations. **Not aligned** on absolute leaf-count freezes in EPIC-13 tasks. |
| **8. Priority / HOLD** | 0036 must remain **operator HOLD** for live :21000 (F-5). Labs: no task opens new primary leaves. 0072 P0 spawn correctly elevated. |

---

## 6. Verdict

# **APPROVE_WITH_FIXES**

(with **execution HOLD** semantics for live **0036/:21000** — task stays open; agents do not rebuild production without operator)

**Not APPROVE_ALL**: F-1 dual chip ownership, F-2 leaf freeze, F-3 doc multi-owner, F-4 soft analytics serial would thrash parallel waves.

**Not HOLD_SOME** for the batch as a whole: content of 0062–0083 matches epics/evidence; fixes are header/ownership/order amendments, not gap rejection. Optional soft-hold: do not start **0082** until 0079–0081 green; do not start **0071 chip work** until 0077 disposition applied.

---

## 7. Ordered fix list for parent (task-architect edit pass — not done this run)

1. **F-1 — 0071 / 0077**  
   - 0077 sole owner of list acting chip + test.  
   - 0071: FUSION.md-only; remove page.tsx Modificar; soft-depends 0077 for “chip verified” exit.

2. **F-2 — 0075 / 0076 / 0077**  
   - Replace `PRIMARY_SIDEBAR_ITEMS.length === 9` with relative no-new-leaf asserts (no fusions/labs primary; DEVTOOLS empty).  
   - Document: absolute length/ids owned by **0082**.

3. **F-3 — Doc section matrix**  
   - Patch headers of 0076, 0077, 0078, 0082, 0083 with exclusive section ownership (table in §2 F-3).  
   - Prefer order 0076 → 0077(chip) → 0078 → … → 0082 → 0083; or fold 0077 NAV-TREE into 0078.

4. **F-4 — 0080 / 0081**  
   - 0081 **Depends on: 0078 + 0080 (hard)**.  
   - 0080 **Blocks: 0081 (hard)**.

5. **F-5 — 0036**  
   - Add HOLD / operator-only live :21000 banner; default DRY-RUN exit path for agents.  
   - Reaffirm AGENTS production port ban.

6. **F-7 — 0067**  
   - Hard: do not edit `fusion.ts` while 0069/0070 open.

7. **F-10 — 0079 / 0081**  
   - Prefer 0079 before CostsSubnav edits in 0081; document Overview href in 0079 evidence.

8. **F-11 — 0082**  
   - Depends header: add **0078**.

9. **F-14 — 0062**  
   - Fix stale “only 0036 open” background sentence.

10. **Process — 0064 → 0065 early**  
    - Restore live template so quality bar path exists (does not block product tasks but unblocks harness law).

11. **F-15 — 0078**  
    - Freeze **one** concrete builder form per family; unit-test matrix `to` ≡ builders (no dual “or” schemes).

12. **F-16 — 0078**  
    - Grep legacy `usage` / costs aliases; extend matrix or document absence.

13. **Schedule note (no file edit strictly required)**  
    - Parallel tracks: (A) governance 0062–0066, (B) security 0072–0074, (C) fusion 0067–0070, (D) 0075, (E) EPIC-19 after 0078.  
    - Serialize doc-heavy 0076/0077 with 0078/0082 per F-3.

**Cross-check:** Adversarial second-pass report  
`docs/reports/audits/2026-07-19-task-batch-adversarial-second-pass.md` (C-01≈F-2, C-02≈F-3, C-04≈F-14, C-05≈F-15). Consensus: same critical clusters; no task file edits applied in either pass.

---

## 8. What this review did *not* do

- No edits under `docs/tasks/01-open/` or `00-planning/`.  
- No product code, no git commits, no :21000/:22000 operations.  
- No re-score of completed 0010–0061 (false-gap scan only).  
- Parent may apply §7 fixes in a follow-up task-architect pass.

---

## 9. Source index

| Kind | Path |
|------|------|
| Open tasks | `docs/tasks/01-open/0036-*.md`, `0062-*.md` … `0083-*.md` |
| Epics | `docs/tasks/00-planning/EPIC-10` … `EPIC-14`, `EPIC-19` |
| Synthesis | `docs/reports/audits/2026-07-19-architect-orchestrator-wave-synthesis.md` |
| Wave 2 | fusion runtime, security residual, frontend IA residual, mechanical harness, ts-expert auth |
| Wave 3 | frontend IA operator claims (+ providers/hotpath/help reports as residual context) |
| Template archive | `docs/tasks/.archive/000-template-moved-to-parent.md` |
| Completed baseline | `docs/tasks/04-completed/` (0010–0018, 0020–0061) |

---

*End of batch review — gt-task-architect 2026-07-19*
