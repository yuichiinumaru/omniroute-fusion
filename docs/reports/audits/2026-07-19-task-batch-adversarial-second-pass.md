# Critique Report — Task Batch Adversarial Second Pass (01-open)

| Field | Value |
|-------|--------|
| **Role** | gt-adversarial-critic (independent second pass) |
| **Date** | 2026-07-19 |
| **Scope** | `docs/tasks/01-open/*.md` with focus on EPIC-19 **0078–0083**, cross-epic **0075–0077**, fusion **0067–0071**, security **0072–0074**, QUEUE / lane hygiene |
| **Ground truth** | Locked matrix in `docs/tasks/00-planning/EPIC-19-omniroute-dashboard-observe-providers-ia-rebalance.md`; live `PRIMARY_SIDEBAR_ITEMS` (9 leaves incl. analytics+costs); empty `02-doing/` / `03-review/` |
| **Verdict** | **needs fixes** |

---

## 1. Method (DAQS + multi-path)

### 1.1 Decompose — claim inventory

| ID | Claim / decision | Source |
|----|------------------|--------|
| C1 | Operator matrix locked: Costs config → Providers; combo-health+route-trace → Observe; rest Analytics + costs overview → Dashboard; Tools → Ops; kill Analytics/Costs leaves | EPIC-19 §2 |
| C2 | Children 0078–0083 = T19-A…F in order A→B/C→D→E; F verify-only | EPIC-19 §6 + task headers |
| C3 | 0078 freezes path builders + redirect matrix; 0079–0081 implement; 0082 drops leaves; 0083 verify Tools | 0078–0083 |
| C4 | 0075–0077 orthogonal to EPIC-19; parallel-safe if file locks held | EPIC-19 §8, 0078 collision notes |
| C5 | Fusion runtime 0067–0070 does not touch combo UI navigation | 0067–0070 file ownership |
| C6 | 0071 coordinates list chip with 0077 (docs-only if 0077 open) | 0071 collision note |
| C7 | Security 0072–0074 isolated from IA chrome | 0072–0074 scopes |
| C8 | QUEUE is historical; only 0036 residual for dual-mode promote | QUEUE + prior audits + 0062 |
| C9 | Pre-cutover chrome length **9**; post-0082 **~7 product + docs** | 0075–0077, 0078, 0082 |
| C10 | No new primary leaves for labs/tools | All IA tasks |

### 1.2 Attack paths explored

1. Happy-path delusion  
2. Temporal trap (T+1 day / post-0082)  
3. Scale / parallel multi-agent  
4. Adversarial builder (wrong QUEUE, dual edit)  
5. Dependency collapse (0078 incomplete)  
6. Assumption audit (orthogonal docs truly disjoint?)  
7. Inversion (what makes matrix fail spectacularly)

---

## 2. Strengths (what works well)

- **Matrix fidelity (HIGH):** 0078–0083 map 1:1 to EPIC-19 §2 surfaces and §6 T19-A…F. Budget/pricing/quota-share → Providers (0079); combo-health/route-trace + `id=` → Observe (0080); storytelling tabs + costs overview → Dashboard (0081); leaf drop (0082); Tools→Ops verify (0083). No alternate product homes invented.
- **Serial gates mostly correct:** 0078 hard-blocks 0079–0082; 0080 serial-before-0081 on `analytics/page.tsx`; 0082 after 0079–0081; 0083 soft-after 0082. Matches Epic dependency tree.
- **SSoT pattern is sound:** Freeze builders in 0078 → implementers import, not freestyle URLs. Gold pattern from `observeHub.ts` / `OBSERVE_REDIRECT_MATRIX` cited.
- **Archive-not-delete / hideable prefs:** Consistently required across 0079–0082.
- **Security isolation (HIGH):** 0072 RouteGuard/spawn, 0073 sanitize sweep, 0074 secrets dual-read — no sidebar, analytics, costs, or fusion chrome ownership. Explicit out-of-scope cross-links. **No IA collision.**
- **Fusion runtime isolation (HIGH):** 0067 `combo.ts`, 0068 `fusionTriggers.ts`, 0069–0070 `fusion.ts` — zero combo **UI** navigation. 0071 is docs + conditional list chip only.
- **0071↔0077 chip collision is named** (rare honesty); 0075 list vs editor split is clear.
- **0079 free-tiers restraint:** Explicitly out of locked matrix — correct (do not invent).
- **0083 verify-only** prevents spending freed leaf budget on Tools/Labs primary peers — aligns with operator quote §9.

---

## 3. Critical Issues (must fix)

### C-01 — Frozen `PRIMARY_SIDEBAR_ITEMS.length === 9` in 0075/0076/0077 will thrash with 0082

**Evidence:**  
- 0075 Test Requirements / Exit: `PRIMARY_SIDEBAR_ITEMS.length === 9`  
- 0076: same  
- 0077: same  
- 0082: removes `analytics` + `costs` → expected ~7–8 leaves  

**Attack:** Temporal trap. Any order fails:

| Order | Failure mode |
|-------|----------------|
| 0075–0077 land **before** 0082 | Tests pin length 9 forever; 0082 must rewrite those tests (blast radius not owned by 0075–0077 Completion Evidence) |
| 0082 lands **before** 0075–0077 | 0075–0077 exit conditions **cannot pass** without re-adding analytics/costs |
| Parallel | Flapping CI; “no-new-leaf” confused with “length always 9” |

**Anti-pattern:** Happy-path only on leaf count; no temporal contract.

**Patch:**

| File | Change |
|------|--------|
| `01-open/0075-…md` | Replace `length === 9` with: assert **no** `fusions`/`playground`/`translator`/`search-tools` primary ids; assert length ∈ {pre:9, post-EPIC-19: measured from 0078 target set}; optional: `>= 7 && <= 9` and **no new ids vs baseline snapshot** |
| `01-open/0076-…md` | Same anti-leaf contract; do not freeze absolute 9 |
| `01-open/0077-…md` | Same; NAV-TREE “live chrome = 9 leaves” → “live chrome matches code at ship time; post-0082 expect no analytics/costs peers” |
| `01-open/0082-…md` | Explicit **depends-on note**: rewrite any 0075–0077 tests that still pin length 9; list in Exit Conditions |

**Confidence:** VERIFIED (text contradiction, no code change needed to prove).

---

### C-02 — Triple ownership of `NAV-TREE-TARGET.md` (0077 / 0078 / 0082)

**Evidence:**  
- 0077: exclusive file ownership includes `docs/architecture/NAV-TREE-TARGET.md` (live chrome = **9** leaves)  
- 0078: exclusive ownership includes same file L0/L1 **rebalance rows** (planned post-EPIC-19)  
- 0082: exclusive ownership of **live** chrome table in NAV-TREE after cutover  
- 0078 Collision notes claim: “IDs 0062–0077 open — **no overlap** if exclusive files held” — **false** for NAV-TREE  

**Attack:** Parallel agents overwrite each other’s “live vs planned” sections; 0077 re-asserts Analytics+Costs peers after 0078 marks retire; 0082 thrice-rewrites.

**Patch:**

| File | Change |
|------|--------|
| `01-open/0077-…md` | Split ownership: **0077 owns only DEVTOOLS/labs wording + Home/Dashboard label fix** in NAV-TREE; **do not** rewrite full L0 primary table if 0078/0082 open. Add “if EPIC-19 open: skip leaf-count table; leave to 0078 planned + 0082 live” |
| `01-open/0078-…md` | Strike “no overlap with 0077”; declare **section locks**: 0078 = `## EPIC-19 target` / planned L0–L1; 0077 = labs/DEVTOOLS residual only; 0082 = flip planned→live |
| `01-open/0082-…md` | Confirm sole owner of **live** L0 primary list post-cutover |
| EPIC-19 §8 | Add row: NAV-TREE section ownership table |

**Confidence:** VERIFIED.

---

### C-03 — `UI.md` multi-writer without hard section locks (0076 / 0078 / 0082 / 0083)

**Evidence:**  
- 0076 owns reverse-chrome policy section  
- 0078 owns EPIC-19 rebalance section (+ soft note vs 0076)  
- 0082 owns **live** primary table  
- 0083 may update Tools interim prose  

Soft notes exist but **0078 still claims exclusive** on `docs/guides/UI.md` EPIC-19 sections while 0082/0083 also write. Parallel class “safe if split” is process-only — no mechanical gate.

**Patch:**

| File | Change |
|------|--------|
| `01-open/0078-…md` | File ownership: only heading `## EPIC-19 IA rebalance (planned)` under UI.md; forbid editing reverse-chrome, leaf live dump, Tools verify paragraphs |
| `01-open/0082-…md` | Own `## Primary chrome (live)` only |
| `01-open/0083-…md` | Own `## Tools → Operations (interim)` only; no leaf tables |
| `01-open/0076-…md` | Own `## Hub reverse chrome` only; already mostly OK — add “do not touch EPIC-19 planned/live tables” |

**Confidence:** HIGH.

---

### C-04 — QUEUE supersede language in 0062 is now **wrong** relative to open lanes

**Evidence:**  
- `QUEUE-post-adversarial-return.md` still claims Q1–Q3 in `02-doing`/`03-review`, adversarial in review — **stale** (prior audits; files in `04-completed/`).  
- Task **0062** exit condition: QUEUE banner “only residual executable **0036** remains authoritative.”  
- Reality 2026-07-19: `01-open/` holds **0036 + 0062–0083** (planning hygiene, fusion, security, EPIC-13, EPIC-19).  

**Attack:** Agent runs 0062 → stamps QUEUE “0036 only” → **hides** P0 EPIC-19 / security / fusion queue. Inverse of original QUEUE hazard (rework completed work): now **ignores open work**.

**Patch:**

| File | Change |
|------|--------|
| `01-open/0062-…md` | Rewrite QUEUE exit: **SUPERSEDED** historical Q1–Q3; Q4/0036 remains for dual-mode promote; **add** “Active product lanes are NOT this QUEUE — see `01-open/` and EPIC-10…19 planning files (0067–0083, 0075–0077, 0072–0074).” Do **not** claim sole residual is 0036. |
| `00-planning/QUEUE-post-adversarial-return.md` | Same terminal banner text (when 0062 lands) |
| Optional | New one-pager `00-planning/ACTIVE-LANES-2026-07-19.md` or EPIC-19/11/12/13 index — only if operator wants; not required if 0062 banner is honest |

**Confidence:** VERIFIED.

---

### C-05 — 0078 does not freeze a single destination shape (matrix still “or”)

**Evidence:** Epic §2.1 and 0078 locked table:  
`/dashboard/providers/budget` **or** providers subnav equivalent; Observe `?panel=` **or** activity subnav.  

0078’s job is freeze-one — but Done criteria allow “pick one” without requiring **committed builder signatures** in the task body before 0079 starts. Parallel 0079/0080 can still diverge if 0078 is half-done or review-lagged.

**Attack:** Dependency collapse — 0079 invents `/dashboard/providers?tab=budget` while 0078 later freezes nested routes → dual redirects.

**Patch:**

| File | Change |
|------|--------|
| `01-open/0078-…md` | Add **mandatory freeze table** in Exit Conditions with concrete chosen shapes (no “or” left in Completion Evidence). Recommended defaults (operator-compatible): nested `/dashboard/providers/{budget,pricing,quota-share}`; Observe via `buildObserveHubPath` extension **or** single `?panel=` documented once; Dashboard tabs via `?tab=` on `/home` (match live `href: "/home"`). |
| EPIC-19 §2 | Optional: replace “e.g. or” with “v1 = …” after 0078 lands (docs-only follow-up) |

**Confidence:** HIGH (process risk; product intent clear).

---

## 4. Major Gaps (should fix)

### M-01 — Incomplete legacy redirect inventory vs live code

**Evidence:** Epic §4 + 0078 matrix rows cover analytics tabs + costs paths. Live code also has:

| Live | Behavior |
|------|----------|
| `src/app/(dashboard)/dashboard/usage/page.tsx` | Conditional `redirect("/dashboard/costs/budget")` |
| Nested `analytics/{evals,search,utilization,compression,combo-health}/page.tsx` | Redirect into analytics query tabs |
| `DashboardTopbar` | Peer links to `/dashboard/costs` |
| Settings hub comment | “Pricing excluded (redirects to costs)” — path may need Providers after 0079 |

None of 0078–0081 **require** `usage → Providers budget` as a matrix row. Bookmarks to `/dashboard/usage?…` budget branch can 404-or-wrong after costs re-home if not updated.

**Patch:**

| File | Change |
|------|--------|
| `01-open/0078-…md` | Add matrix row: any code redirect **into** `/dashboard/costs/*` or analytics operational tabs must be inventoried (`rg "dashboard/costs"` + `dashboard/analytics`) and either updated in implementer tasks or listed as residual |
| `01-open/0079-…md` | Explicit: update `usage/page.tsx` budget branch to 0078 Providers budget builder |
| `01-open/0081-…md` | Already mentions DashboardTopbar — strengthen: full `rg` of `/dashboard/analytics` and `/dashboard/costs` deep links |

**Confidence:** HIGH (usage redirect grepped live).

---

### M-02 — `CostsSubnav.tsx` dual ownership (0079 vs 0081) is soft-serial only

**Evidence:** 0079 allows (a) leave Overview to 0081 or (b) update config links now; 0081 also edits CostsSubnav Overview → Dashboard. No hard lock; “document choice” is not a merge gate.

**Attack:** 0079 rewrites whole subnav; 0081 rebases; dual primary links (Overview still Costs + config already Providers).

**Patch:**

| File | Change |
|------|--------|
| `01-open/0079-…md` | **Hard rule:** 0079 may only change Budget/Pricing/Quota-share **hrefs** (and active states); Overview href left to 0081 **or** 0079 sets Overview → temporary same-page and 0081 only retargets Overview — pick **one** in task text (recommend: 0079 retargets three config links; 0081 retargets Overview only; no other CostsSubnav edits) |
| `01-open/0081-…md` | Mirror: exclusive Overview link + costs overview page redirect |

**Confidence:** HIGH.

---

### M-03 — 0071 internal contradiction (docs-only vs UI Test Requirements)

**Evidence:**  
- Collision note: if 0077 open → **0071 owns only FUSION.md**  
- Test Requirements still **DEVE** list chip UI + type extension on `page.tsx`  
- Exit Conditions: chip either here or from 0077  

Builders following Test Requirements section will still edit `fusions/page.tsx` against 0077.

**Patch:**

| File | Change |
|------|--------|
| `01-open/0071-…md` | Split Test Requirements into **A (always):** FUSION.md accuracy greps; **B (only if 0077 closed without chip):** list UI tests. Default path when 0077 open: B N/A, verify-only checklist item. Remove unconditional UI DEVE. |

**Confidence:** VERIFIED.

---

### M-04 — 0075–0077 vs 0079–0083 “orthogonal” understates test + docs blast

**Evidence:** Epic §8 and 0078 say orthogonal. Product UI files (fusions, ops destinations) are disjoint — **true**. Shared surfaces that are **not** orthogonal:

- `PRIMARY_SIDEBAR_ITEMS` length asserts (C-01)  
- `NAV-TREE-TARGET.md` (C-02)  
- `UI.md` (C-03)  
- `operationsHub.ts` / Testing discoverability (0076 D2 peer pages vs 0083 verify; 0082 palette)  
- Sidebar unit tests rewritten by 0082 while 0075–0077 add new tests pinning old contract  

**Patch:** EPIC-19 §8 table: change “orthogonal” → “product routes orthogonal; **shared chrome SSoT serial-sensitive** (leaf count, UI.md, NAV-TREE).” Mirror in 0075–0077 / 0078 collision notes.

**Confidence:** HIGH.

---

### M-05 — Observe destination scheme may collide with `observeHub` source enum (0080 + 0078)

**Evidence:** Live Observe uses `?source=` for log streams. Epic/0078 allow `?panel=combo-health` **or** activity subnav. 0080 may “extend source enum only if 0078 chose that.” Mixing `source` (logs) with operational panels without a frozen scheme risks polluting log filters or dual query keys.

**Patch:** 0078 Exit Conditions: forbid inventing a third key; choose either (a) `source` values `combo-health` | `route-trace` with health still deep-link, or (b) separate `panel=` reserved for non-log panels — document interaction with `buildObserveHubPath`.

**Confidence:** MEDIUM–HIGH (design risk, not current bug).

---

### M-06 — Epic §3 leaf numbering confuses post-cutover count

**Evidence:** §3 table rows 1–9 still number ~~Analytics~~ / ~~Costs~~ as 5–6 then Operations as 7… Net text says “7 product leaves + docs” vs “or keep 9”. 0082 re-measure is correct but builders may assert wrong expected length (7 vs 8 vs 9).

**Live ids today:** `home, providers, combos, activity, analytics, costs, operations, settings-general, docs` (9).  
**Post-drop expected:** 7 ids if analytics+costs removed and nothing else added.

**Patch:** EPIC-19 §3: list **target id set** explicitly (`home, providers, combos, activity, operations, settings-general, docs`) length **7**; remove struck rows from numbered list.

**Confidence:** HIGH.

---

### M-07 — 0080 soft-serial vs 0081 is “prefer” not hard — dual analytics shell risk

**Evidence:** 0081 Depends: “prefer after 0080”; parallel class serializable but not hard-blocked. If 0081 lands first, it may re-host all tabs including operational ones then 0080 fights for redirects.

**Patch:** 0081 header: **Depends on 0080 hard** (or explicit gate: “if 0080 not done, 0081 must not delete/rehome combo-health/route-trace mounts — only storytelling”). Prefer hard depends for clarity.

**Confidence:** MEDIUM (tasks already prefer serial; escalate to hard).

---

### M-08 — Planning hygiene 0062 background claims “only product open task 0036”

**Evidence:** 0062 Background “Only product open task: 0036” is false for this batch date. Risk: executor doesn’t re-`ls 01-open` and writes epic headers that omit EPIC-11/12/13/19 open children.

**Patch:** 0062 Background: strike “only 0036”; require `ls docs/tasks/01-open` in Completion Evidence; epic header updates must not claim empty open queue.

**Confidence:** VERIFIED.

---

## 5. Minor Issues (polish)

| ID | Issue | Suggested fix |
|----|-------|----------------|
| m1 | 0081 Where paths hedge `home/**` vs `dashboard/HomePageClient` — live primary `href: "/home"` | Pin to `src/app/(dashboard)/home/**` after one grep line in task |
| m2 | 0078 soft-blocks 0083 only if docs disagree — 0083 can race 0078 and write Tools prose wrong | Soft-depends 0083 on 0078 docs section green (or “re-run verify after 0078”) |
| m3 | 0075–0077 CHANGELOG required; EPIC-19 tasks mostly omit CHANGELOG exit | Align: all UX_VIS P0 tasks require Unreleased CHANGELOG entry |
| m4 | 0070 may thread AbortSignal into combo base — soft touch near 0067 combo gate | Already serial on fusion.ts; add “do not edit dispatchActingOnly / A6 gate” |
| m5 | costs-free-tiers hideable id exists; no matrix home | Leave residual note in 0078/0079 Completion Evidence template: free-tiers stay under costs redirects or deferred — not Providers unless operator asks |
| m6 | EPIC-13 still “Planning (promote children next)” while children already in 01-open | Header: Status → Active; children 0075–0077 open (0062-class hygiene) |
| m7 | Fusion 0071 P3 vs 0077 P2 both claim H-FUSION-010 | OK if 0071 docs-only; make P3 objective title “FUSION.md notes (+ chip only if 0077 missed)” |
| m8 | 0036 still only QUEUE Q4 — correct — but no open task points builders **away** from QUEUE for 0078+ | 0078 Origin already cites Epic 19; optional banner in QUEUE after 0062 |

---

## 6. Cross-epic matrices

### 6.1 EPIC-19 (0078–0083) vs locked matrix

| Matrix row | Task | Status |
|------------|------|--------|
| Costs budget/pricing/quota-share → Providers | 0079 | Match |
| Combo-health + route-trace (+ id) → Observe | 0080 | Match |
| Logs + health → Observe discoverability | 0080 | Match |
| Remaining analytics + costs overview → Dashboard | 0081 | Match |
| Drop analytics/costs leaves | 0082 | Match |
| Tools → Ops verify | 0083 | Match |
| SSoT freeze first | 0078 | Match (shape still soft — C-05) |
| Redirect matrix Epic §4 | 0078–0081 tests | Match intent; incomplete inventory — M-01 |

**Internal consistency of 0078–0083 with each other:** CONDITIONAL PASS (deps/order good; shared docs + length freeze issues are cross-epic).

### 6.2 0075–0077 vs 0079–0083 (sidebar/ops ownership)

| Surface | Owner residual | Owner EPIC-19 | Collision? |
|---------|----------------|---------------|------------|
| Fusions editor RoutingHubSubnav | 0075 | — | No product route collision |
| Fusions list acting chip | 0077 (0071 backup) | — | No EPIC-19 collision |
| Ops/Testing reverse chrome | 0076 | 0083 verify only | Soft: 0083 must not re-litigate D1/D2 — already stated |
| PRIMARY length/id tests | 0075–0077 pin 9 | 0082 drops | **Yes — C-01** |
| NAV-TREE | 0077 | 0078+0082 | **Yes — C-02** |
| UI.md | 0076 | 0078+0082+0083 | **Yes — C-03** |
| operationsHub Testing card | 0076 | 0083 restore-if-regression | Acceptable if 0083 minimal |

### 6.3 Fusion 0067–0071 vs combo UI navigation

| Task | Touches combo **routing UI**? | Notes |
|------|-------------------------------|-------|
| 0067 | No | `combo.ts` + tests |
| 0068 | No | `fusionTriggers.ts` |
| 0069–0070 | No | `fusion.ts` runtime |
| 0071 | List page **only** if 0077 fails | Not Routing hub; not sidebar; coordinates 0077 |

**No collision with EPIC-19 navigation rebalance.** Residual risk is only dual-edit of `fusions/page.tsx` (0071/0077) — already flagged (M-03).

### 6.4 Security 0072–0074 isolation

| Task | Files | Collides IA? |
|------|-------|--------------|
| 0072 | routeGuard, spawnCapable, tailscale enable/login, ROUTE_GUARD_TIERS | **No** |
| 0073 | version SSE, db-backups, vacuum, management JSON sanitize | **No** |
| 0074 | secrets dual-read disposition | **No** |

Optional 0072 stretch sanitizes enable/login — 0073 lists same; tasks already say do once. **Isolation PASS.**

### 6.5 QUEUE / wrong lanes

| Artifact | Points builders to wrong lane? |
|----------|--------------------------------|
| QUEUE-post-adversarial-return | **Yes** if read as live queue (Q1–Q3 rework completed tasks) |
| 0062 supersede “0036 only” | **Yes** if applied without listing current 01-open (C-04/M-08) |
| 0078–0083 Origin | Correct (EPIC-19) — **do not** cite QUEUE |
| 0075–0077 Origin | EPIC-13 / wave2 — correct |
| 0067–0071 Origin | EPIC-11 — correct |
| 0072–0074 Origin | EPIC-12 — correct |
| Completed 0024/0025 still link QUEUE | Historical; low risk if QUEUE superseded |

**No EPIC-19 child task currently points Status/Depends to QUEUE for dispatch.** Residual hazard is **ambient** QUEUE + 0062 wording, not 0078–0083 headers.

---

## 7. Antifragility stress test

| Stressor | Current response | Verdict |
|----------|------------------|---------|
| Missing 0078 freeze | 0079+ say stop — good | Robust |
| Parallel 0079+0080 | File lists mostly disjoint | Robust |
| Parallel 0080+0081 | Soft serial only | Fragile (M-07) |
| 0082 before content homes | Gated hard | Robust |
| length===9 tests after drop | Fail hard / force re-add leaves | **Fragile (C-01)** |
| Multi-writer NAV-TREE/UI.md | Soft prose only | **Fragile (C-02/C-03)** |
| Stale QUEUE | Can re-open completed or hide open | **Fragile (C-04)** |
| Wrong destination invent | 0078 intended antifragile; “or” weakens | Semi-robust (C-05) |
| Security + IA parallel | Isolated files | Antifragile enough |
| Fusion runtime + IA | Isolated | Antifragile enough |

**Critique goal:** Batch is **robust** on product matrix intent; **fragile** on shared chrome SSoT and governance timestamps. Not antifragile under multi-agent parallel load.

---

## 8. Multi-agent simulation (disagreements)

### The Purist
- Demands C-01/C-02 fixed before any 0079 code.  
- Demands 0078 concrete URL freeze with zero “or”.  
- Hard-depends 0081 on 0080.  
- 0062 must not lie about open set.

### The Pragmatist
- Matrix is good enough to ship 0078 with nested Providers paths as default in one PR.  
- length===9 fix is a one-line test pattern change — do it while 0075 is still open.  
- Don’t block security 0072 on IA docs thrash.

### The Doomsayer
- Two agents same day: 0077 rewrites NAV-TREE live 9-leaf table; 0078 marks Analytics retired; 0082 mid-flight → thrice conflict, false dual-nav, operator sees Analytics leaf with Dashboard hosting same charts.  
- 0062 lands “0036 only” mid-wave → EPIC-19 tasks treated as “orphan drafts” and abandoned.

**Strongest disagreement:** Purist “freeze everything first” vs Pragmatist “ship 0079 with provisional paths.” **Decision requiring explicit justification:** 0078 Completion Evidence must include frozen builder names **before** 0079 is allowed to start (already process; enforce as hard gate in 0079 Depends text: “0078 in 04-completed or same PR with green matrix tests”).

---

## 9. Hard Questions (10) — mandatory

1. **What is the single frozen string** for Providers budget path after 0078 — nested route or query tab — and which task fails CI if either 0079 or docs diverge? — **Critical**  
2. **Who wins** if 0077 and 0078 edit `NAV-TREE-TARGET.md` on the same day — and is that encoded as a hard file lock or only a comment? — **Critical**  
3. After 0082, do 0075/0076/0077 tests that assert `length === 9` get rewritten by **0082** or by the residual tasks — and is that ownership written? — **Critical**  
4. When 0062 supersedes QUEUE to “0036 only,” how do builders discover 0072/0078–0083 without reading all of `01-open/`? — **Critical**  
5. Does `/dashboard/usage` → costs/budget get rewired to Providers in 0079, or is it an accepted orphan? — **Major**  
6. If 0081 starts while 0080 is mid-flight, can combo-health temporarily live on both Analytics and Observe? — **Major**  
7. Is Costs Overview **also** linked from Providers chrome after 0079, or only from Dashboard — dual-nav risk? — **Major**  
8. After leaf drop, do sidebar presets (`admin`/`developer`/`minimal`) that hid analytics/costs still behave, and who tests hideable id retention? — **Major** (0082 claims hideable keep; presets need explicit Exit row)  
9. Will 0076 D2 reverse chrome on ~15 Ops peers collide with 0082 CommandPalette rewrites in the same release train? — **Minor–Major**  
10. Is free-tiers / costs-free-tiers intentionally left under a redirect shell forever, and is that stated so implementers don’t invent a Providers home? — **Minor**

---

## 10. Confidence assessment

| Section | Confidence | Reasoning |
|---------|------------|-----------|
| EPIC-19 matrix ↔ 0078–0083 product mapping | **HIGH** | Direct section-to-task correspondence |
| Leaf-count temporal thrash (C-01) | **VERIFIED** | Explicit `length === 9` vs 0082 drop |
| NAV-TREE/UI.md multi-writer (C-02/C-03) | **VERIFIED** | Conflicting exclusive ownership claims |
| QUEUE / 0062 lane honesty (C-04/M-08) | **VERIFIED** | File contents + `ls 01-open` |
| Fusion UI non-collision | **HIGH** | File ownership lists |
| Security isolation | **HIGH** | Disjoint paths |
| usage→budget gap (M-01) | **HIGH** | Grepped live redirect |
| Observe query scheme risk (M-05) | **MEDIUM** | Design ambiguity only |
| 0081 soft serial failure probability | **MEDIUM** | Process discipline may hold |

---

## 11. Concrete patch checklist (do not apply — propose only)

Priority order for a docs-only fix PR:

1. **C-01** — Edit 0075, 0076, 0077: replace absolute length===9 with anti-new-leaf + optional baseline set; 0082 Exit: rewrite residual length pins.  
2. **C-02 / C-03** — Section-lock table in 0077, 0078, 0082, 0076, 0083 for NAV-TREE + UI.md.  
3. **C-04 / M-08** — Rewrite 0062 QUEUE supersede language; fix Background “only 0036”.  
4. **C-05** — 0078 Exit: mandatory chosen path table (no “or”).  
5. **M-01** — 0078 inventory + 0079 `usage/page.tsx` row.  
6. **M-02** — Hard split CostsSubnav edits 0079 vs 0081.  
7. **M-03** — 0071 conditional Test Requirements.  
8. **M-06** — EPIC-19 §3 target id set length 7.  
9. **M-07** — 0081 hard-depends 0080.  
10. **M-04** — EPIC-19 §8 “orthogonal” language fix.

---

## 12. What is clean (do not thrash)

- Product destination matrix (who hosts what) — **do not reopen operator lock**.  
- Security 0072–0074 scopes — **leave isolated**.  
- Fusion 0067–0070 runtime file ownership — **leave**.  
- T19-A…F task split and order — **structurally correct**.  
- 0083 verify-only Tools decision — **correct**.  
- 0079 exclusion of costs overview and free-tiers invention — **correct**.  
- 0071/0077 dual-chip **awareness** — keep; fix test section only.

---

## 13. Overall Verdict

### **needs fixes**

EPIC-19 children **0078–0083 are product-consistent with the locked matrix** and correctly ordered. Security and fusion-runtime tasks **do not collide** with IA navigation.  

The batch is **not clean** for multi-agent execution because:

1. Residual IA tasks **freeze leaf count 9** while EPIC-19 **must drop to 7**.  
2. **NAV-TREE / UI.md exclusive ownership claims conflict**.  
3. **QUEUE + 0062 “0036 only”** is false and dangerous for this open set.  
4. **0078 still leaves destination shape as “or”**; legacy **usage→costs/budget** not in matrix.  
5. **0071** still mandates UI work that its own collision note forbids when 0077 is open.

**Ship product code only after docs patches for C-01, C-02, C-04, C-05 (minimum).** C-03 and M-01–M-03 should land in the same hygiene PR.

---

## 14. Reviewer attestation

- Independent second pass; did not apply patches.  
- Did not use QUEUE as work order for scoring open EPIC-19 tasks.  
- Live verification: `PRIMARY_SIDEBAR_ITEMS` includes analytics+costs; home `href: "/home"`; `usage/page.tsx` redirects to costs/budget.  
- Report path: `docs/reports/audits/2026-07-19-task-batch-adversarial-second-pass.md`
