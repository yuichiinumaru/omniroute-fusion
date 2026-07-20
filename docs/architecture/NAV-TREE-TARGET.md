---
title: "Navigation Tree Target (OmniRoute Fusion)"
version: 3.8.42+
lastUpdated: 2026-07-19
status: living
sources:
  - .agents/user/chatgpt/ccdesign.md (operator map ~L465–601; GPT 5-pillar sketch ~L382–426)
  - docs/guides/UI.md
  - docs/tasks/00-planning/0005-omniroute-frontend-ia-design-system-epic.md
  - src/shared/constants/sidebarVisibility.ts (PRIMARY_SIDEBAR_ITEMS — live chrome)
  - Epic 0003 Fusion First-Class (fusions UI + runtime)
  - Task 0059 Operations hub (api-manager / cli-code absorbed from primary)
---

# Navigation Tree Target — OmniRoute Fusion

Living map of **how the product should be navigated**: what sits on the **sidebar**, what is an **in-page tab**, and what is a **collapsible block inside a page**.

This is **not** a dump of every `page.tsx` (≈105 dashboard routes). It is the **operator IA** we are converging to. Routes may remain for deep links; discovery goes through hubs.

---

## 1. Invariants (non-negotiable)

| # | Rule |
|---|------|
| 1 | **Sidebar ≤ ~10 primary items** (live **7** after Task **0082**) — flat list, **no accordion / collapsible sections** in the rail |
| 2 | **Nested destinations = in-page only** — top **Tabs** (sub-menus) and **collapsible sections inside the page** (sub-sub), never more sidebar groups |
| 3 | **Do not delete capabilities** (except intentional demotions: gamification peers, noob marketing chrome) — re-home + redirect |
| 4 | **Strategies / engines / presets are not menus** — rows, tabs, or cards inside a hub |
| 5 | **Events are one stream** — Observe hub + filters (`?source=`), not 5–8 log leaves |
| 6 | **Icons neutral** — `currentColor`; active = primary (coreCyan); no rainbow accents |
| 7 | **Archive-not-delete** for removed chrome — `.archive/` + provenance |

**Intent model (operator enters for):** Configure · Investigate · Audit (cost/access) — from `ccdesign.md` / CyberCore sketch.

---

## 2. Live chrome (implemented)

**SSoT:** `PRIMARY_SIDEBAR_ITEMS` in `src/shared/constants/sidebarVisibility.ts` (**7** leaves after Task **0082**).

| # | id | Label (EN `labelFallback`) | Hub route | Role |
|---|-----|----------------------------|-----------|------|
| 1 | `home` | Dashboard (`i18nKey: "dashboard"`) | `/home` | Storytelling cockpit (`?tab=` overview/evals/…/costs-overview) |
| 2 | `providers` | Providers | `/dashboard/providers` | Registry + budget / pricing / quota-share (nested) |
| 3 | `combos` | Routing | `/dashboard/combos` | Combos + **fusions** + compression entry |
| 4 | `activity` | Observe | `/dashboard/activity` | Stream (`?source=`) + combo-health / route-trace (`?panel=`) |
| 5 | `operations` | Operations | `/dashboard/operations` | Hub: API keys, CLI, agents, integrations (Task 0059) |
| 6 | `settings-general` | Settings | `/dashboard/settings/general` | System residual / Interface prefs |
| 7 | `docs` | Docs | `/docs` | Help surface |

> **Label note:** Live chrome uses `labelFallback: "Dashboard"` for `home` (not the word “Home”).
> **Dropped L0 (0082):** `analytics`, `costs` — hideable ids + redirect shells retained. Provenance: `.archive/sidebar/2026-07-19-epic19-analytics-costs-cutover/`.

**Deep links (not primary):**

| Hideable / deep id | Route | Notes |
|--------------------|-------|-------|
| `api-manager` | `/dashboard/api-manager` | Linked from Operations hub; hideable id retained |
| `cli-code` | `/dashboard/cli-code` | CLI tools under Operations; route remains |
| `analytics` | storytelling via `/home?tab=…` (legacy `/dashboard/analytics` redirects) | Hideable id retained |
| `costs` | `/home?tab=costs-overview` (legacy `/dashboard/costs` redirects) | Hideable id retained |

**Labs (not sidebar chrome):** `playground`, `translator`, `search-tools` stay as **deep routes only**.
Live `DEVTOOLS_ITEMS = []` in `sidebarVisibility.ts` — Task **0060** removed them from the debug
rail. Discover via **Testing hub** (`/dashboard/testing`), Command Palette, or direct URL.
Do **not** re-populate `DEVTOOLS_ITEMS` with lab leaves.

**Conceptual pillars** (`OPERATIONAL_PILLAR_SECTION_IDS`) remain for docs/mapping only — **not** collapsible sidebar sections.

---

## 3. Target hierarchy (versioned map)

Legend:

- **L0** = sidebar item (≤10)  
- **L1** = page **tab** (top of hub)  
- **L2** = **collapsible / drawer / sub-panel** on the page (not rail)

### L0 · 1 · Dashboard (`home`)

| Level | Item | Route / note | Status |
|-------|------|--------------|--------|
| L0 | Dashboard (`labelFallback`) | `/home` storytelling hub (`?tab=`) | **Live** (0081) |
| L1 | Overview | `/home?tab=overview` (widgets + usage) | Live |
| L1 | Evals / Search / Utilization / Compression | `/home?tab=<id>` | Live |
| L1 | Costs overview | `/home?tab=costs-overview` | Live (0081) |
| L1 | Health | `/dashboard/health` | Deep link; **should** become L1 tab |
| L1 | Cache (summary) | `/dashboard/cache` | Deep (Topbar peer) |
| L1 | Quota (summary) | `/dashboard/quota` | Deep |
| L2 | Provider health matrix / dense tables | on health/overview | Live pages |
| Demote | Quickstart walls of text | → Docs / `?` help | Policy |
| Redirects | `/dashboard/analytics` storytelling tabs | → `/home?tab=…` | Live (0081) |

### L0 · 2 · Providers (Registry)

| Level | Item | Route / note | Status |
|-------|------|--------------|--------|
| L0 | Providers | `/dashboard/providers` | Live hub |
| L1 | Manage | list + `/dashboard/providers/[id]` | Live |
| L1 | Embedded services | `/dashboard/providers/services?tab=cliproxy\|9router` | Deep |
| L1 | Media providers | `/dashboard/media-providers/*` | Deep |
| L1 | Exposures / Connect | `/dashboard/endpoint` (catalog, protocols) | Deep |
| L1 | MCP server (OmniRoute control) | `/dashboard/mcp` | Deep |
| L1 | A2A server | `/dashboard/a2a` | Deep |
| L1 | Webhooks | `/dashboard/webhooks` | Deep |
| L2 | Per-provider cards, OAuth/API/web flags, favorites | on manage | Live |
| Demote | Huge provider rectangles / noob “How it works” | compact + docs | Policy |

### L0 · 3 · Routing

| Level | Item | Route / note | Status |
|-------|------|--------------|--------|
| L0 | Routing | `/dashboard/combos` | Live hub |
| L1 | Combos | list + builder `/dashboard/combos`, `/dashboard/combos/[id]` | Live |
| L1 | Combo Studio / Live | `/dashboard/combos/live` | Deep |
| L1 | Combo playground | `/dashboard/combos/playground` | Deep |
| L1 | **Fusions** ✨ | `/dashboard/fusions`, `/new`, `/[id]` | **Fork-first** (Epic 0003) |
| L1 | Compression hub | `/dashboard/context/settings` | Deep |
| L1 | Compression combos | `/dashboard/context/combos` | Deep |
| L1 | Compression studio | `/dashboard/compression/studio` | Deep |
| L1 | Global routing settings | `/dashboard/settings/routing` | Deep |
| L2 | **Engines** (Caveman, RTK, Headroom, Session Dedup, CCR, LLMLingua, Lite/Aggressive/Ultra) | `/dashboard/context/*` | Deep — **never** L0 |
| L2 | Fusion panels / judge / **acting** / triggers / tuning | Fusion editor | Live |
| L2 | Auto-combo / intelligent filters | combos UI | Live |

### L0 · 4 · Observe (Evidence stream)

| Level | Item | Route / note | Status |
|-------|------|--------------|--------|
| L0 | Observe | `/dashboard/activity` | Live hub |
| L1 | Sources via `?source=` | activity, request, proxy, console, audit, mcp, a2a | Live (`observeHub.ts`) |
| L2 | Entity dossier / detail drawer | traffic inspector patterns | Partial |
| Redirects | `/dashboard/logs*`, `/dashboard/audit*` | → Observe | Live |

### ~~L0 · Analytics~~ → absorbed (EPIC-19 / 0081–0082)

> **Not an L0 leaf** after Task **0082**. Hideable id `analytics` retained; `/dashboard/analytics*` is redirect-only.

| Level | Item | Route / note | Status |
|-------|------|--------------|--------|
| ~~L0~~ | ~~Analytics~~ | ~~`/dashboard/analytics`~~ | **Dropped primary** (0082) |
| L1 under Dashboard | Storytelling tabs | `/home?tab=overview\|evals\|search\|utilization\|compression` | Live (0081) |
| L1 under Observe | Combo health / Route trace | `/dashboard/activity?panel=combo-health\|route-trace` | Live (0080) |
| Deep | Provider stats | `/dashboard/provider-stats` | Deep |
| Deep | Runtime detail | `/dashboard/runtime` | Deep |
| Redirects | Legacy analytics tabs / nested paths | → Dashboard story builders or Observe panels | Live |

### ~~L0 · Costs~~ → absorbed (EPIC-19 / 0079–0082)

> **Not an L0 leaf** after Task **0082**. Hideable id `costs` retained; overview + nested config are redirects.

| Level | Item | Route / note | Status |
|-------|------|--------------|--------|
| ~~L0~~ | ~~Costs~~ | ~~`/dashboard/costs`~~ | **Dropped primary** (0082) |
| L1 under Dashboard | Costs overview | `/home?tab=costs-overview` | Live (0081) |
| L1 under Providers | Budget / Pricing / Quota share | `/dashboard/providers/{budget,pricing,quota-share}` | Live (0079) |
| Deep | Free tiers / Quota | `/dashboard/free-tiers`, `/dashboard/quota` | Deep |
| Redirects | `/dashboard/costs`, `/dashboard/costs/{budget,pricing,quota-share}` | → Dashboard / Providers builders | Live |
| Demote | Free provider rankings as peer product | hide / L2 under economics | Policy |

### L0 · 5 · Operations (API · Agents · Integrations hub)

| Level | Item | Route / note | Status |
|-------|------|--------------|--------|
| L0 | Operations | `/dashboard/operations` | **Live hub** (Task 0059) |
| L1 | API Keys | `/dashboard/api-manager` (deep; hideable id `api-manager`) | Live |
| L1 | CLI tools / Clients | `/dashboard/cli-code`, `/dashboard/cli-code/[id]` | Live |
| L1 | CLI agents | `/dashboard/cli-agents` | Deep |
| L1 | ACP agents | `/dashboard/acp-agents` | Deep |
| L1 | Cloud agents | `/dashboard/cloud-agents` | Deep |
| L1 | Agent bridge | `/dashboard/tools/agent-bridge` | Deep |
| L1 | Traffic inspector | `/dashboard/tools/traffic-inspector` | Deep |
| L1 | Batch | `/dashboard/batch`, `/dashboard/batch/files` | Deep |
| L1 | Memory | `/dashboard/memory` | Deep |
| L1 | Omni Skills / Agent Skills / Plugins | `/dashboard/omni-skills`, `agent-skills`, `plugins` | Deep |
| L2 | ConfigurableToolCard shell (Kilo/Cline pilots) | CLI cards | Live partial |
| Demote | Gamification leaderboard/tokens as peers | out of L0 | Policy |
| Future CC | Harness assets / MCP marketplace | not OmniRoute primary | Out of fork scope unless ported |

### L0 · 6 · Settings (residual system)

| Level | Item | Route / note | Status |
|-------|------|--------------|--------|
| L0 | Settings | `/dashboard/settings/general` | Live |
| L1 | Interface | `…/appearance` route kept as **Interface** (functional prefs only; brand/theme stripped 0052–0053) | Live |
| L1 | AI | `…/ai` (memory/skills/vision — re-home over time) | Deep |
| L1 | Resilience | `…/resilience` | Deep |
| L1 | Advanced | `…/advanced` | Deep |
| L1 | Feature flags | `…/feature-flags` (security flags → Governance over time) | Deep |
| L1 | Sidebar prefs | `…/sidebar` | Deep |
| L1 | Network / Proxy | `/dashboard/system/proxy` | Deep |
| Policy | Prefer re-homing “settings of X” into hub X | ccdesign rule | Ongoing |

### L0 · 7 · Docs / Help

| Level | Item | Route / note | Status |
|-------|------|--------------|--------|
| L0 | Docs | `/docs` | Live |
| L1 | Changelog | `/dashboard/changelog` | Deep |
| L1 | Issues | GitHub | External |
| L2 | In-context `?` help replacing noob walls | pattern | Partial |

### Labs / tools (not L0; not DEVTOOLS sidebar)

Post-0060 / **EPIC-19 Tools→Ops interim (0083):** these remain **routable deep links** only.
They are **not** primary leaves and are **not** mounted under `DEVTOOLS_ITEMS` (`[]`).
**Interim home:** **Operations → Testing** (`/dashboard/testing` via Operations Integrations card),
plus Command Palette or direct URL. **No** new L0 Tools / Labs / Testing leaf from EPIC-19.

| Item | Route | Discovery |
|------|-------|-----------|
| Playground | `/dashboard/playground` | Operations → Testing · palette |
| Translator | `/dashboard/translator` | Operations → Testing · palette |
| Search tools | `/dashboard/search-tools` | Operations → Testing · palette |

---

## 4. Fork-first: Fusions (must not become leaf #11 forever)

**Product:** Fusion First-Class (Epic 0003) — multi-panel + judge (+ optional **acting**), triggers, fallback D8.

| Surface | Route | Map placement |
|---------|-------|----------------|
| List | `/dashboard/fusions` | **Routing → L1 tab “Fusions”** |
| Create | `/dashboard/fusions/new` | under Routing |
| Editor | `/dashboard/fusions/[id]` | under Routing |
| Runtime | `strategy: fusion \| conditional-fusion` | Routing domain |
| Docs | `docs/architecture/FUSION.md` | Help / architecture |

**Sidebar:** keep under **Routing** hub only (primary item remains `combos`). Do **not** reintroduce a permanent peer leaf for Fusions.

---

## 5. Delta vs `ccdesign.md` (3.7 sketch) and vs OmniRoute upstream 3.8+

### From ccdesign operator map we adopt

- Flat / short primary nav (live **9** fixed hubs after Task 0059).  
- L1 = tabs, L2 = page collapsibles.  
- Kill gamification peers; unify logs; question “everything is Settings”.  
- Clients / Providers / Dashboard (live `home` label) as hubs rather than 40 leaves.

### Already done in this fork (2026-07)

- Flat primary rail + neutral icons.  
- Observe stream + analytics dual-nav collapse.  
- Compression engines off rail.  
- Seven conceptual pillars → then **flattened** to primary hubs (no accordion); Operations hub lands as L0 `operations` (0059).  
- Fusions UI + runtime (Epic 0003) + optional acting (Epic 0004).  
- Status vocabulary / selective VR micro (not full Prism); brand **coreCyan dark-only** (0052–0053).

### Still missing for “map complete” (implementation)

| Gap | Suggestion |
|-----|------------|
| In-page tab shells on each L0 hub | `PageTabBar` already exists (Task 0030) — wire Providers / Routing / Operations / Settings / Dashboard |
| True **Dashboard** cockpit | Merge health/costs pulse into `/home` tabs |
| Operations hub polish | `/dashboard/operations` is **live** (0059); deepen L1 cards / discoverability |
| Feature flags → Governance/Policies | Gradual re-home |
| Residual dense tables | Visual pass (ops skin) |
| Upstream 3.8+ features not in ccdesign | Catalog in §6; assign L0/L1/L2 |

---

## 6. Upstream / live surface inventory (assign when hubbing)

Surfaces that exist under `src/app/(dashboard)/dashboard/**` and must keep a home (L0/L1/L2 or demote):

| Cluster | Examples | Default home in this map |
|---------|----------|---------------------------|
| Providers | providers, services, media-providers | Providers |
| Routing | combos, live, playground, **fusions**, context/*, compression/* | Routing |
| Connect | endpoint, api-endpoints→catalog, mcp, a2a, webhooks | Providers L1 |
| Authz | api-manager, access-tokens, security | Operations (api-manager) / Settings |
| Observe | activity, logs*, audit* | Observe |
| Analytics | analytics?tab=*, provider-stats, runtime, health | Analytics / Dashboard pulse |
| Costs | costs*, free-tiers, quota, quota-share | Costs |
| Ops | cli-*, agents, bridge, inspector, batch, memory, skills, plugins | Operations |
| System | settings/*, proxy | Settings |
| Labs | playground, translator, search-tools | Testing hub / palette (not sidebar; `DEVTOOLS_ITEMS = []`) |
| Demote | leaderboard, profile, tokens, gamification/admin | Out of L0 |
| Redirects | auto-combo, limits, usage, compression root | Keep redirects |

---

## 7. CyberCore note (out of OmniRoute-fusion primary scope)

The GPT **5-pillar** sketch (Overview / Registry / Routing / Governance / Observability + System footer) and MetaMCP / Harness / Warp Prism Flutter ADS are **target identities for Cybernetics Core**, not a forced rewrite of this Next dashboard in one PR.

OmniRoute-fusion **absorbs the IA lessons** (short rail, intent hubs, stream, kill dump) while remaining a Next.js operator console. Visual full Prism port is **opt-in / later**, not SSoT (`design.md` + coreCyan dark tokens in `globals.css` + this map / `docs/guides/UI.md`).

---

## 8. Implementation checklist (next engineering waves)

1. [ ] **Hub shells** — Dashboard, Providers, Routing (incl. Fusions L1), Operations, Settings using `PageTabBar`.  
2. [ ] **Label pass** — align EN copy to this map (Dashboard vs Home, Clients vs Operations if desired).  
3. [ ] **Deep-link matrix** — freeze redirects; command palette entries point at L0+L1.  
4. [ ] **Assessment refresh** — re-run gap agents after each hub lands.  
5. [ ] **Do not** re-grow primary leaves without updating this file + `docs/guides/UI.md`.

---

## 9. Related docs

| Doc | Role |
|-----|------|
| [`docs/guides/UI.md`](../guides/UI.md) | Enforcement rules for agents |
| [`docs/architecture/FUSION.md`](./FUSION.md) | Fusion runtime/UI contract |
| [Self-evident URL Phase-0 plan](../reports/builders/2026-07-19-epic19-self-evident-url-phase0-plan.md) | T19-H path freeze + redirects (Task 0085) |
| [`docs/dependency-tree.md`](../dependency-tree.md) | Task DAG (Epic 0005) |
| [`docs/routing/AUTO-COMBO.md`](../routing/AUTO-COMBO.md) | Strategies including fusion |
| `.agents/user/chatgpt/ccdesign.md` | Source conversation (local, not ship authority) |

---

## 10. Gap assessments (parallel, 2026-07-11)

| Report | Focus |
|--------|--------|
| [`docs/reports/builders/2026-07-11-nav-tree-gap-routing-registry.md`](../reports/builders/2026-07-11-nav-tree-gap-routing-registry.md) | Routing, Registry, **Fusions**, compression, exposures |
| [`docs/reports/builders/2026-07-11-nav-tree-gap-ops-observe-settings.md`](../reports/builders/2026-07-11-nav-tree-gap-ops-observe-settings.md) | Observe, Analytics, Costs, Operations, Settings, Help, demotions |

**Shared conclusion:** L0 flat-**9** is the right live chrome (Task 0059 Operations hub; budget still ≤~10); main debt is **L1 hub shells** (PageTabBar on Providers / Routing / Operations / Settings / Dashboard) so Fusions and other deep pages are discoverable without re-growing the rail. Orphans to assign: `relay`, dual Media, `compression/live`, onboarding, free-provider-rankings.

## EPIC-19 target

> **Status**: **L0 live as of Task 0082** (2026-07-19). §2 Live chrome documents the **7**-leaf primary set (no Analytics/Costs peers). Destination shapes (Providers nested / Observe `?panel=` / Dashboard `?tab=`) remain frozen in `epic19Rebalance.ts`.
>
> **Code SSoT**: `src/shared/constants/epic19Rebalance.ts` + `PRIMARY_SIDEBAR_ITEMS` in `sidebarVisibility.ts`.
> **Owners**: matrix freeze **0078**; content homes **0079–0081**; leaf drop + live §2 **0082**. Labs / DEVTOOLS residual → **0077**.
> **Law**: [`EPIC-19 planning`](../tasks/00-planning/EPIC-19-omniroute-dashboard-observe-providers-ia-rebalance.md).

### Live / target L0 (length 7 — matches §2)

| # | id | Label (EN) | Hub route | Role after EPIC-19 |
|---|-----|------------|-----------|--------------------|
| 1 | `home` | Dashboard | `/home` | Storytelling: usage, costs overview, evals, utilization, search, compression (`?tab=`) |
| 2 | `providers` | Providers | `/dashboard/providers` | Models + services + **budget / pricing / quota-share** (nested L1) |
| 3 | `combos` | Routing | `/dashboard/combos` | Combos / fusions / compression (unchanged) |
| 4 | `activity` | Observe | `/dashboard/activity` | Logs/audit (`?source=`) + health deep link + **combo-health** + **route-trace** (`?panel=`) |
| 5 | `operations` | Operations | `/dashboard/operations` | API / agents / integrations / **tools labs** via Testing hub |
| 6 | `settings-general` | Settings | `/dashboard/settings/general` | Unchanged |
| 7 | `docs` | Docs | `/docs` | Unchanged |

**Dropped from L0 (0082 only):** `analytics`, `costs`. Keep hideable ids if prefs require (archive-not-delete).

### Planned L1 by hub

#### Dashboard (`home`)

| L1 tab id | Path | Notes |
|-----------|------|-------|
| `overview` | `/home?tab=overview` | Former analytics overview |
| `evals` | `/home?tab=evals` | |
| `search` | `/home?tab=search` | |
| `utilization` | `/home?tab=utilization` | |
| `compression` | `/home?tab=compression` | |
| `costs-overview` | `/home?tab=costs-overview` | Former `/dashboard/costs` overview only |

Builder: `buildDashboardStoryPath(tab)`.

#### Providers

| L1 | Path | From (redirect) |
|----|------|-----------------|
| Budget | `/dashboard/providers/budget` | `/dashboard/costs/budget`, `/dashboard/usage?tab=budget` |
| Pricing | `/dashboard/providers/pricing` | `/dashboard/costs/pricing`, `/dashboard/settings/pricing` |
| Quota share | `/dashboard/providers/quota-share` | `/dashboard/costs/quota-share` |

Builders: `buildProvidersBudgetPath` / `Pricing` / `QuotaShare`. **Nested routes only** (no Providers `?tab=` dual shape).

#### Observe (`activity`)

| L1 | Path / query | Notes |
|----|--------------|-------|
| Log sources | `?source=` | Unchanged — `observeHub.ts` enum only |
| Combo health | `?panel=combo-health` | **Not** a `source` value |
| Route trace | `?panel=route-trace` (+ `id=`) | Alias `route-explain`; preserve request id |
| Health | `/dashboard/health` | Deep link + hub discoverability (Task 0061) |

#### Operations / tools labs

Playground, Translator, Search Tools, Batch, Media lab remain under **Operations → Testing** (`testingHub.ts`). **No** new L0 leaf for Tools / Labs / Testing in EPIC-19.

### Redirect freeze

Full matrix: `EPIC19_REDIRECT_MATRIX`. Product wiring: 0079 (Providers), 0080 (Observe panels), 0081 (Dashboard tabs), 0082 (sidebar leaf drop).

---

## Self-evident path taxonomy (T19-H / Task 0085)

> **Status**: **target freeze** (2026-07-19). Live routes remain under `/dashboard/*` + `/home` until implement waves.  
> **Phase-0 plan (executable)**: [`docs/reports/builders/2026-07-19-epic19-self-evident-url-phase0-plan.md`](../reports/builders/2026-07-19-epic19-self-evident-url-phase0-plan.md)  
> **Inventories**: [`url-ia-self-evident-path-inventory`](../reports/audits/2026-07-19-url-ia-self-evident-path-inventory.md) · [`url-ia-mechanical-route-counts`](../reports/audits/2026-07-19-url-ia-mechanical-route-counts.md)  
> **Law**: URLs read `/{sidebar-leaf}/{topbar-item}`; **no** big-bang of ~112 pages; **no** `/api` or `/v1` rename; always redirect old → new.

### Target roots (segment 1 = chrome vocabulary)

| Live sidebar `id` | Label | Live hub | **Target root** | Segment-2 |
|-------------------|-------|----------|-----------------|-----------|
| `home` | Dashboard | `/home` | `/home` *or* `/dashboard` (**pick before strip**) | **Operator topbar order (one strip):** bare **Home** · Overview · Evals · Search · Utilization · Compression · Costs · `cache` · `tokens` · `leaderboard` · `profile` under **one** host (Home ≠ Overview) |
| `providers` | Providers | `/dashboard/providers` | **`/providers`** | **Operator topbar order (one strip):** Providers · Stats · Services · Quota · Rankings · Free Tiers · Runtime · **Budget** · **Pricing** · **Quota Sharing** (`PROVIDERS_TOPBAR_PATHS`) |
| `combos` | Routing | `/dashboard/combos` | **`/routing`** | `combos` · **`fusions`** · `live` · `compression` (+ studio/engines) |
| `activity` | Observe | `/dashboard/activity` | **`/observe`** | stream `?source=` only · ops **`?panel=`** (not source) · nest **`health`** |
| `operations` | Operations | `/dashboard/operations` | **`/operations`** | hub launchpad; optional nest of deep destinations |
| `settings-general` | Settings | `/dashboard/settings/general` | **`/settings`** | tab segment (`general` · `appearance` · `ai` · …) |
| `docs` | Docs | `/docs` | **`/docs`** | unchanged |

### Highest teachability nests (P2 before full strip)

| Live (sibling of hub) | Target |
|-----------------------|--------|
| `/dashboard/fusions`… | `/routing/fusions`… |
| `/dashboard/context/*`, `/dashboard/compression/*` | `/routing/compression`… |
| `/dashboard/health` | `/observe/health` |

### Phases (summary)

| Phase | Goal |
|-------|------|
| **P0** | Chrome unify + active-map (preferred before path PR; Task 0084) |
| **P1** | Dual-write builders + permanent redirects (implement wave — not required in Phase-0 code) |
| **P2** | Nest fusions / compression / health under hub roots |
| **P3** | Hub-by-hub strip `/dashboard` (Providers → Settings → Observe → Routing → Dashboard dual-root → Operations last) |
| **P4** | Ratchet freezes / e2e path map / i18n / soak-delete redirect shells |

§2 **Live chrome** remains authoritative for **today’s** hrefs until a path cutover PR updates builders + this table’s “live” column together.

---

## 11. Change log (map itself)

| Date | Change |
|------|--------|
| 2026-07-20 | **T19-H segment-2 operator peer freeze:** Dashboard Home≠Overview full order; Providers Budget/Pricing/Quota Sharing order; Observe panel≠source |
| 2026-07-19 | **Self-evident path taxonomy (0085 / T19-H):** target roots `/{sidebar}/{topbar}`; P0–P4 phases; link phase-0 plan + inventories; no live route move |
| 2026-07-19 | **Tools→Ops interim (0083):** labs discovery note = Operations → Testing + palette; not debug-only orphan; no L0 Tools/Labs/Testing leaf |
| 2026-07-19 | **EPIC-19 target** planned L0–L1 section (Task 0078); live §2 unchanged until 0082 |
| 2026-07-18 | §2 live chrome + §10 conclusion: **9** primary leaves (`operations` hub); api-manager/cli-code deep-only; coreCyan brand note |
| 2026-07-11 | Initial versioned map: flat 10 L0 + L1/L2 rules + Fusions under Routing + post-3.8 inventory + ccdesign synthesis |
| 2026-07-11 | Linked dual gap-assessment reports (routing/registry + ops/observe/settings) |
