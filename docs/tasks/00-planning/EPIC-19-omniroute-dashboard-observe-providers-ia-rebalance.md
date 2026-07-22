# EPIC-19 — Dashboard / Observe / Providers IA Rebalance (priority a+b)

> **Status**: **Active** — destination matrix shipped (0078/0082/0083 in review/done); **chrome unify REWORK** open (**0079, 0080, 0081** returned to `01-open/`); path self-evident migration tracked as **T19-G** (0084)  
> **Priority**: **P0 product UX**  
> **Type**: UX_VIS / IA  
> **Project**: omniroute-2  
> **Author**: architect-orchestrator + operator decision  
> **Depends on**: Epic 0005 IA baseline; `AGENTS.md` Dashboard IA / Design System law (2026-07-19)  
> **Does NOT**: rewrite backend; migrate SQLite; Cybernetics/Go; **Operations hub reform** (→ **EPIC-20**)  
> **Evidence**:  
> - Operator matrix (destinations) + **chrome correction** (single topbar per hub, 2026-07-19)  
> - `docs/reports/audits/2026-07-19-wave3-frontend-ia-operator-claims-verification.md`  
> - `docs/reports/audits/2026-07-19-url-ia-self-evident-path-inventory.md`  
> - `docs/reports/audits/2026-07-19-url-ia-mechanical-route-counts.md`

---

## 1. Goal

Make chrome match **intent**:

| Intent | Hub | Meaning |
|--------|-----|---------|
| **Configure** money / quota / price | **Providers** | Mutable policy |
| **Debug / ops health** | **Observe** | Logs, server health, combo health, route path |
| **Data storytelling** (spend, usage, economy) | **Dashboard** (absorbs Analytics) | Charts / aggregate metrics — **not** a second “Analytics” leaf |

Kill **Analytics** and **Costs** as primary mental models (and as default sidebar peers once migration is done).

---

## 2. Locked destination matrix (non-negotiable)

### 2.1 From Costs → Providers (config / action)

| Surface today | Live path | Destination hub | Destination shape (v1) |
|---------------|-----------|-----------------|-------------------------|
| Costs / Budget | `/dashboard/costs/budget` | **Providers** | Providers hub subnav or nested route e.g. `/dashboard/providers/budget` (redirect from old) |
| Costs / Pricing | `/dashboard/costs/pricing` | **Providers** | same family |
| Costs / Quota-sharing | `/dashboard/costs/quota-share` | **Providers** | same family |

**Rationale (operator):** these **modify** limits, pricing rules, quota division — not storytelling.

### 2.2 From Analytics → Observe (operational)

| Surface today | Live path / tab | Destination hub | Destination shape (v1) |
|---------------|-----------------|-----------------|-------------------------|
| Combo Health | `/dashboard/analytics?tab=combo-health` | **Observe** | Observe chrome: new tab/source or nested under activity hub e.g. `?panel=combo-health` or `/dashboard/activity` subnav |
| Route Trace | `/dashboard/analytics?tab=route-trace` (+ alias `route-explain`) | **Observe** | same; preserve `?id=` deep link for request id |
| Logs / server health | activity `?source=*` + `/dashboard/health` | **Observe** | Already Observe pillar; ensure **discoverable** on Observe hub (health link already partially done Task 0061) |

**Rationale:** combo health + route path = **operational/debug**, not economic storytelling.

### 2.3 Remaining Analytics → Dashboard (kill Analytics leaf)

| Surface today | Tab / route | Destination |
|---------------|-------------|-------------|
| Overview (UsageAnalytics + Diversity) | `?tab=overview` | **Dashboard** (`/home` or renamed hub) |
| Evals | `?tab=evals` | **Dashboard** |
| Search analytics | `?tab=search` | **Dashboard** |
| Utilization | `?tab=utilization` | **Dashboard** |
| Compression analytics | `?tab=compression` | **Dashboard** |
| Costs **Overview** only | `/dashboard/costs` | **Dashboard** (economic storytelling) |

**Sidebar:** remove default-visible **`analytics`** and **`costs`** leaves after redirects work.  
**Label:** primary leaf stays **Dashboard** (today `home` / i18n “Dashboard”); content becomes storytelling hub with `PageTabBar`.

### 2.4 Tools → Operations (interim)

| Surface | Decision |
|---------|----------|
| Playground / Translator / Search Tools / Batch / Media lab | Stay under **Operations** discovery for now (already: Ops → Testing hub). **No new primary leaf** for Tools. |
| Future “Labs” first-class leaf | **Out of this epic** (optional later; must still respect no-new-leaf budget — only if Dashboard/Analytics merge frees a slot and operator asks). |

---

## 3. Target primary chrome (post-epic)

**Target primary id set (length 7)** after 0082:

`home, providers, combos, activity, operations, settings-general, docs`

| # | Id | Leaf label | Role after EPIC-19 |
|---|-----|------------|--------------------|
| 1 | `home` | **Dashboard** | Storytelling: usage, costs overview, evals, utilization, search, compression |
| 2 | `providers` | **Providers** | Models + services + **budget / pricing / quota-share** |
| 3 | `combos` | **Routing** | Combos / fusions / compression (unchanged) |
| 4 | `activity` | **Observe** | Logs/audit + health + **combo-health** + **route-trace** |
| 5 | `operations` | **Operations** | API / agents / integrations / **tools labs** (unchanged role) |
| 6 | `settings-general` | **Settings** | Unchanged |
| 7 | `docs` | **Docs** | Unchanged |

**Removed (not in target set):** `analytics`, `costs` — redirects only after 0079–0081; leaf drop is **0082**.

Net: **length 7** (docs included as primary id `docs`). **Must re-measure** after implementation; update `UI.md` live table + `PRIMARY_SIDEBAR_ITEMS` + tests. Do **not** keep “or keep 9” as an ambiguous alternative.

---

## 4. Redirect / compat matrix (mandatory)

Old bookmarks and palette entries must not 404:

| From | To (canonical) |
|------|----------------|
| `/dashboard/analytics` | Dashboard hub default tab |
| `/dashboard/analytics?tab=overview` | Dashboard `?tab=overview` (or equivalent) |
| `/dashboard/analytics?tab=combo-health` | Observe combo-health surface |
| `/dashboard/analytics?tab=route-trace` (+ `route-explain`, `id=`) | Observe route-trace surface |
| `/dashboard/analytics?tab=evals|search|utilization|compression` | Dashboard same tab ids |
| `/dashboard/costs` | Dashboard costs-overview tab |
| `/dashboard/costs/budget` | Providers budget surface |
| `/dashboard/costs/pricing` | Providers pricing surface |
| `/dashboard/costs/quota-share` | Providers quota-share surface |

Keep hideable sidebar ids for prefs if required by archive-not-delete (`UI.md` invariant 5).

---

## 5. Explicit non-goals

- No Cybernetics / Flutter rewrite  
- No full URL strip of `/dashboard` prefix (that is HOLD-URL later)  
- No merging ACP + A2A + agent-bridge routes (copy only, other epic)  
- No re-adding Translator/Playground/Search as **three** sidebar leaves  
- No deleting Costs/Pricing **code** — only re-home chrome + redirects  
- Home “notification hover / kill toast spam” — **related polish**, can be child task but not block matrix move

---

## 6. Child task slices (status 2026-07-19)

| ID | Theme | Lane / status |
|----|-------|---------------|
| **0078** T19-A | SSoT path builders + redirect matrix | `03-review` — **keep** (paths OK) |
| **0079** T19-B | Providers absorb budget/pricing/quota + redirects | `01-open` **REWORK** — single Providers topbar |
| **0080** T19-C | Observe combo-health + route-trace | `01-open` **REWORK** — sidebar active for health |
| **0081** T19-D | Dashboard storytelling absorb | `01-open` **REWORK** — single Dashboard topbar |
| **0082** T19-E | Drop analytics/costs primary leaves | `03-review` — **keep** (leaf drop OK) |
| **0083** T19-F | Tools → Ops verify | `03-review` — **keep** |
| **0084** T19-G | Routing + Observe deep-route **sidebar active** (fusions/compression/studio/health) | `01-open` (new) |
| **0085** T19-H | Self-evident URL migration **phase-0** (compat plan; not full rename yet) | `01-open` (new) |

### 6.1 Chrome law (operator correction — non-negotiable)

**Exactly one hub topbar per hub page family.** Re-homed items become **peers on the destination hub topbar**, never a second/third inherited strip (`CostsSubnav`, dual `PageTabBar`, `ProvidersPolicySubnav` under `ProvidersTopBar`).

| Hub | Single topbar peers (target) |
|-----|------------------------------|
| **Dashboard** | Home/Dashboard · Overview · Evals · Search · Utilization · Compression · Costs · Cache · Tokens · Leaderboard · Profile |
| **Providers** | Providers · Stats · Services · Quota · Rankings · Free Tiers · Runtime · Budget · Pricing · Quota Sharing |
| **Routing** | existing Routing strip; sidebar lights green on fusions + compression deep routes |
| **Observe** | existing Observe strip; sidebar lights green on health + combo-health + route-trace |

Law also in root **`AGENTS.md`** (Dashboard IA section) and **CLAUDE.md Hard Rules #22–#23**.

### 6.2 Self-evident paths (follow-on)

Target shape: `/{sidebar-leaf}/{topbar-item}` (e.g. `/providers/budget`, `/routing/fusions`).  
Today: most UI under `/dashboard/*` + dual `/home` (~112 pages).  
**Do chrome unify first (0079/0080/0081/0084); path rename is 0085 phased.**  
Inventory: `docs/reports/audits/2026-07-19-url-ia-self-evident-path-inventory.md`.

---

## 7. Success metrics

- [x] No default sidebar leaf named Analytics or Costs (0082)  
- [x] Budget / Pricing / Quota-share reachable under Providers **paths** + redirects (0079 destination)  
- [ ] Budget / Pricing / Quota Sharing on **one** Providers topbar (0079 rework)  
- [x] Combo Health + Route Trace on Observe destinations (0080)  
- [ ] Observe sidebar active on **health** (+ panels) (0080 rework / 0084)  
- [x] Dashboard hosts storytelling content + redirects (0081 destination)  
- [ ] Dashboard **one** topbar with full peer list (0081 rework)  
- [ ] Routing sidebar active on fusions / compression / studio (0084)  
- [ ] Self-evident path plan + phased redirects documented (0085)  
- [x] Tools labs under Operations (0083)  

---

## 8. Relation to open tasks

| Task / epic | Relation |
|-------------|----------|
| **0075–0077** | Fusions editor strip / ops — coordinate with **0084** active-state |
| **0078–0083** | T19-A…F destinations; **0079–0081 rework chrome** |
| **0084–0085** | T19-G/H active-state + URL path plan (same epic) |
| **EPIC-13** | Overlaps 0084 if fusions active-state still open |
| **Favorites / density** | After chrome unify |
| **EPIC-20** Operations reform | **Out of EPIC-19** — Testing absorb, Ops topbar 10 peers, Labs fusion, Traffic→Observe, `/operations/{id}` pilot. See `EPIC-20-omniroute-operations-hub-reform.md` |

### Doc section ownership (serial-sensitive SSoT)

| Doc section | Owner |
|-------------|--------|
| UI.md reverse chrome / Ops-Testing launchpad | **0076** |
| UI.md `## EPIC-19 IA rebalance (planned)` | **0078** |
| UI.md `## Primary chrome (live)` post-cutover | **0082** |
| UI.md Tools→Ops interim paragraph | **0083** |
| NAV-TREE labs/DEVTOOLS residual | **0077** |
| NAV-TREE `## EPIC-19 target` planned L0–L1 | **0078** |
| NAV-TREE live L0 after leaf drop | **0082** |

---

## 9. Operator quote (source of truth)

> Costs Budget/Pricing/Quota-sharing → Providers.  
> Analytics Combo-Health + Route-Trace → Observe.  
> Logs + server health → Observe.  
> Rest of analytics → Dashboard; end Analytics leaf.  
> Tools → Operations for now.
