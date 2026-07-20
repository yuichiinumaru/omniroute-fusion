# EPIC-19 T19-H — Self-Evident URL Migration Phase-0 Plan

> **Task**: `docs/tasks/03-review/0085-omniroute-epic19-self-evident-url-phase0.md`  
> **Date**: 2026-07-19  
> **Role**: planning + redirect / blast-radius freeze (docs only)  
> **Status**: Phase-0 complete — **no** App Router moves, **no** big-bang rename of 112 pages  
> **Inventories (read-only inputs)**:  
> - [`docs/reports/audits/2026-07-19-url-ia-self-evident-path-inventory.md`](../audits/2026-07-19-url-ia-self-evident-path-inventory.md)  
> - [`docs/reports/audits/2026-07-19-url-ia-mechanical-route-counts.md`](../audits/2026-07-19-url-ia-mechanical-route-counts.md)  
> **Taxonomy freeze homes**:  
> - [`docs/architecture/NAV-TREE-TARGET.md`](../../architecture/NAV-TREE-TARGET.md) § **Self-evident path taxonomy**  
> - [`docs/guides/UI.md`](../../guides/UI.md) § **Self-evident path taxonomy (T19-H)**  

---

## 0. Operator north star

Browser URLs must teach the product the same way chrome does:

```text
/{sidebar-leaf}/{topbar-item}
```

| Mental model | Target URL (frozen) |
|--------------|---------------------|
| Providers → Budget | `/providers/budget` |
| Routing → Fusions | `/routing/fusions` |
| Observe → Activity | `/observe` or `/observe/activity` |
| Observe → Health | `/observe/health` |
| Dashboard → story | `/dashboard?tab=…` **or** keep `/home?tab=…` (open product pick — §2.1) |
| Settings → AI | `/settings/ai` |
| Docs | `/docs` (already self-evident) |

**Not preferred:** everything under `/dashboard/*` with opaque segment-2; hub children as **siblings** of the hub root (fusions vs combos; health vs activity); dual storytelling hosts without a single builder.

---

## 1. Non-goals (hard)

| Non-goal | Why |
|----------|-----|
| **No API rename** | `/api/**`, `/v1/**`, protocol paths (MCP/A2A JSON-RPC) stay untouched |
| **No big-bang of 112 `page.tsx`** | Phase-0 freezes map + redirects only; cutover is multi-PR later |
| **No production port `:21000`** | Operator law — never touch prod runtime for IA docs |
| **No route deletion without redirect** | Archive-not-delete; permanent (308) or App Router `redirect()` shells ≥1 release |
| **No second chrome system** | Path work must not invent dual topbars; prefer chrome unify (0079/0081/0084) first |
| **No Observe `source` pollution** | combo-health / route-trace stay `?panel=` (EPIC-19 law) even if later promoted to path |
| **No new primary sidebar leaves** | Path rename is not an excuse for Tools/Labs/Fusions as L0 |
| **No code dual-write required in Phase-0** | Optional builders dual-write is **implement-wave only** (§6) |

---

## 2. Frozen target taxonomy

**Convention**

| Segment | Meaning | Source of truth for labels |
|---------|---------|----------------------------|
| **1** | Sidebar leaf **slug** (operator label vocabulary) | Live labels: Dashboard · Providers · Routing · Observe · Operations · Settings · Docs |
| **2** | Topbar / L1 peer id | Hub topbars: `DashboardTopbar`, `ProvidersTopBar`, `RoutingHubSubnav`, `ObserveHubSubnav`, Settings `PageTabBar` |
| **3+** | Deep editor / engine / detail | e.g. `/routing/fusions/[id]`, `/routing/compression/engines/rtk` |

### 2.1 Sidebar id → path root → topbar segment

| # | Live sidebar `id` | Label | Live hub `href` | **Target root** | Segment-2 rule |
|---|-------------------|-------|-----------------|-----------------|----------------|
| 1 | `home` | Dashboard | `/home` | **`/dashboard`** *or* **`/home`** — **pick one before Phase C** (recommended freeze: keep story builder host = `/home` short-term; long-term either nest peers under `/home/*` **or** collapse to `/dashboard/*` and redirect `/home` → `/dashboard`) | **Full topbar peers (operator order, single strip):** bare **Dashboard/Home** (`{STORY_ROOT}` no tab) · Overview · Evals · Search · Utilization · Compression · Costs · Cache · Tokens · Leaderboard · Profile. Story tabs = `?tab=` **or** `/…/{tab}`; path peers under **same** root. Bare host **≠** Overview. |
| 2 | `providers` | Providers | `/dashboard/providers` | **`/providers`** | **Full topbar peers (operator order, single strip):** Providers · Stats · Services · Quota · Rankings · Free Tiers · Runtime · **Budget** · **Pricing** · **Quota Sharing**. Nested L1 already live: `budget` / `pricing` / `quota-share` / `services` / `[id]`; **promote** siblings under root (`stats` ← `provider-stats`, `quota`, `free-tiers`, `runtime`). Deep (not topbar): `media` ← `media-providers`. |
| 3 | `combos` | Routing | `/dashboard/combos` | **`/routing`** | Live topbar ids (`RoutingHubSubnav`): `combos` (hub default), `fusions`, `live`, `compression-settings`, `compression-studio` → target nest under `compression` (+ engines) |
| 4 | `activity` | Observe | `/dashboard/activity` | **`/observe`** | Live topbar (`ObserveHubSubnav`): stream `?source=` enum only + **`?panel=`** combo-health/route-trace (**never** `source`) + nest **`health`**; panels may stay query or become path later |
| 5 | `operations` | Operations | `/dashboard/operations` | **`/operations`** | Hub launchpad; deep destinations **optionally** nest under `/operations/*` (Phase C last) |
| 6 | `settings-general` | Settings | `/dashboard/settings/general` | **`/settings`** | Segment-2 = tab (`general`, `appearance`, `ai`, …) — primary leaf href becomes **hub base** `/settings` (not a single tab) |
| 7 | `docs` | Docs | `/docs` | **`/docs`** | Unchanged |

**Slug law:** segment 1 matches **chrome label vocabulary** (`routing`, `observe`), not legacy filesystem ids (`combos`, `activity`). Live `id` fields in `sidebarVisibility.ts` may lag until a dedicated chrome-id rename (optional; not required for path work).

### 2.2 L1 maps (primary + EPIC-19 + teachability wins)

#### Dashboard (story host) — `DashboardTopbar` peer freeze

> **Operator peer order (exactly one strip):** Dashboard/Home · Overview · Evals · Search · Utilization · Compression · Costs · Cache · Tokens · Leaderboard · Profile.  
> Bare **Dashboard/Home** (`/home` with no known story `?tab=`) is **distinct** from **Overview** (`/home?tab=overview`) — never merge aria-current or path targets.

| # | Topbar / peer | Target | Live today |
|---|---------------|--------|------------|
| 1 | **Dashboard/Home** (cockpit) | `{STORY_ROOT}` **without** story tab | `/home` (no `?tab=` / unknown tab) |
| 2 | Overview | `{STORY_ROOT}?tab=overview` via `buildDashboardStoryPath` | `/home?tab=overview` |
| 3 | Evals | `…?tab=evals` | `/home?tab=evals` |
| 4 | Search | `…?tab=search` | `/home?tab=search` |
| 5 | Utilization | `…?tab=utilization` | `/home?tab=utilization` |
| 6 | Compression (story) | `…?tab=compression` | `/home?tab=compression` |
| 7 | Costs | `…?tab=costs-overview` | `/home?tab=costs-overview` |
| 8 | Cache | `{STORY_ROOT}/cache` | `/dashboard/cache` |
| 9 | Tokens | `{STORY_ROOT}/tokens` | `/dashboard/tokens` |
| 10 | Leaderboard | `{STORY_ROOT}/leaderboard` | `/dashboard/leaderboard` |
| 11 | Profile | `{STORY_ROOT}/profile` | `/dashboard/profile` |

`STORY_ROOT` = operator pick (`/home` vs `/dashboard`). Dual roots are **temporary debt**; Phase C kills dual-host. Story tabs SSoT: `DASHBOARD_STORY_TABS` in `epic19Rebalance.ts` (6 tabs; Home is **not** a story tab).

#### Providers → `/providers/{item}` — `ProvidersTopBar` peer freeze

> **Operator peer order (exactly one strip — no stacked Policy/Costs subnav):** Providers · Stats · Services · Quota · Rankings · Free Tiers · Runtime · **Budget** · **Pricing** · **Quota Sharing**.  
> Live path constants: `PROVIDERS_TOPBAR_PATHS` (+ `PROVIDERS_*_PATH` from `epic19Rebalance.ts` for budget/pricing/quota-share).

| # | Surface (topbar?) | Target | Live today |
|---|-------------------|--------|------------|
| 1 | Manage / list (**topbar**) | `/providers` | `/dashboard/providers` |
| 2 | Stats (**topbar**) | `/providers/stats` | `/dashboard/provider-stats` ❌ sibling |
| 3 | Services (**topbar**) | `/providers/services` | `/dashboard/providers/services` ✅ |
| 4 | Quota (**topbar**) | `/providers/quota` | `/dashboard/quota` ❌ |
| 5 | Free rankings (**topbar**) | `/providers/free-provider-rankings` | `/dashboard/free-provider-rankings` ❌ |
| 6 | Free tiers (**topbar**) | `/providers/free-tiers` | `/dashboard/free-tiers` ❌ |
| 7 | Runtime (**topbar**) | `/providers/runtime` | `/dashboard/runtime` ❌ |
| 8 | Budget (**topbar**) | `/providers/budget` | `/dashboard/providers/budget` ✅ |
| 9 | Pricing (**topbar**) | `/providers/pricing` | `/dashboard/providers/pricing` ✅ |
| 10 | Quota Sharing (**topbar**) | `/providers/quota-share` | `/dashboard/providers/quota-share` ✅ |
| — | Detail (deep, not topbar) | `/providers/[id]` | `/dashboard/providers/[id]` |
| — | Media registry (**deep nest only** — not a `ProvidersTopBar` peer today) | `/providers/media`… | `/dashboard/media-providers`… ❌ |

#### Routing → `/routing/{item}`

| Topbar | Target | Live today |
|--------|--------|------------|
| Combos (default) | `/routing` or `/routing/combos` | `/dashboard/combos` |
| Combo editor | `/routing/combos/[id]` | `/dashboard/combos/[id]` |
| Live | `/routing/live` | `/dashboard/combos/live` |
| Playground (deep) | `/routing/playground` *or* keep under Operations Testing | `/dashboard/combos/playground` |
| **Fusions** | **`/routing/fusions`** (+ `/new`, `/[id]`) | `/dashboard/fusions` ❌ |
| Compression settings | `/routing/compression` | `/dashboard/context/settings` ❌ |
| Compression combos | `/routing/compression/combos` | `/dashboard/context/combos` ❌ |
| Compression studio | `/routing/compression/studio` | `/dashboard/compression/studio` ❌ |
| Engines (L2) | `/routing/compression/engines/{id}` | `/dashboard/context/{engine}` ❌ |

#### Observe → `/observe/{item}` — `ObserveHubSubnav` peer freeze

> **Law:** log stream filters use **`?source=`** only (`OBSERVE_SOURCES` in `observeHub.ts`). Combo Health / Route Trace use **`?panel=`** only (`OBSERVE_OPERATIONAL_PANELS` in `epic19Rebalance.ts`). **Never** put combo-health / route-trace into the source enum. Health is a **page**, not a source or panel.

| Surface | Target | Live today |
|---------|--------|------------|
| Activity stream (default) | `/observe` | `/dashboard/activity` |
| Source filters (request/proxy/console/audit/mcp/a2a) | `/observe?source=` *or* `/observe/{source}` later | `?source=` via `buildObserveHubPath` |
| Combo health | `/observe?panel=combo-health` *or* `/observe/combo-health` | `buildObserveComboHealthPath()` → `?panel=combo-health` |
| Route trace | `/observe?panel=route-trace` (+ `id=`) | `buildObserveRouteTracePath(id)` |
| **Health** | **`/observe/health`** | `/dashboard/health` ❌ (`OBSERVE_HEALTH_DEEP_LINK`) |

#### Operations → `/operations` (+ optional nest)

| Surface | Target (optional nest) | Live today |
|---------|------------------------|------------|
| Hub | `/operations` | `/dashboard/operations` |
| API manager | `/operations/api-manager` *or* keep deep + redirect | `/dashboard/api-manager` |
| Endpoint / MCP / A2A | `/operations/endpoint` etc. | `/dashboard/endpoint`, `/mcp`, `/a2a` |
| CLI / agents / tools / batch / memory / skills / plugins | under `/operations/…` when cut over | various `/dashboard/*` |
| Testing labs | `/operations/testing` | `/dashboard/testing` |

#### Settings → `/settings/{tab}`

| Tab | Target | Live today |
|-----|--------|------------|
| general … sidebar (10 tabs) | `/settings/{tab}` | `/dashboard/settings/{tab}` |
| Hub entry | `/settings` → default tab | `/dashboard/settings` redirect |
| Pricing | **redirect →** `/providers/pricing` | already EPIC-19 |

---

## 3. Phased execution plan (implement waves — not this task)

```text
P0  Chrome done gate (preferred prerequisite)
      → single hub topbar language; active-map for deep routes (Task 0084)
      → topbar ids stable before they become URL segment 2
        ↓
P1  Dual-write builders + permanent redirects (compat)
      → target path constants alongside live; builders may emit NEW paths
      → old URLs always redirect; no page deletion
        ↓
P2  Nest teachability wins under hub prefixes
      → fusions + compression under /routing/*
      → health under /observe/*
      → (optional) providers peer promotion under /providers/*
        ↓
P3  Strip /dashboard prefix + align segment-2 = topbar (hub-by-hub)
      → Providers → Settings → Observe → Routing → Dashboard dual-root kill → Operations last
        ↓
P4  Ratchet: freezes, e2e path map, i18n, delete redirect-only shells after soak
```

| Phase | Deliverable | Effort | Code in 0085? |
|-------|-------------|--------|---------------|
| **P0** | Chrome unify + active-state map (0079/0081/0084) | M | **No** — preferred **before** path PR |
| **P1** | Compat redirects + builder dual-write hooks | M | **Optional only**; default = implement wave |
| **P2** | Nest fusions/compression/health | L / M | Later PR(s) |
| **P3** | Hub-by-hub strip `/dashboard` | L multi-PR | Later |
| **P4** | Ratchet + soak delete | M | Later |

### P0 gate checklist (before any mass path PR)

- [ ] Hub topbars: exactly one strip per hub family (no multi-topbar regression).
- [ ] Sidebar lights Routing for fusions/context/compression; Observe for health; Settings for all `/settings/*` (active-map **or** nested paths).
- [ ] EPIC-19 builders remain single SSoT for destinations (`epic19Rebalance.ts`, `observeHub.ts`, `settingsHub.ts`).
- [ ] Operator review checkpoint signed off on **target roots** in §2.1 (especially Dashboard `/home` vs `/dashboard`).

### P1 dual-write notes (implement wave — optional in Phase-0)

**Default decision for 0085:** **builders only change in implement wave**. Phase-0 does **not** stub dual-write code.

When implementers start P1:

1. Introduce **target** constants next to live ones, e.g.:
   - `ROUTING_ROOT_TARGET = "/routing"`
   - `OBSERVE_ROOT_TARGET = "/observe"`
   - `PROVIDERS_ROOT_TARGET = "/providers"`
   - keep live `OBSERVE_HUB_PATH = "/dashboard/activity"` until cutover flag
2. Prefer **one emission path**: builders return **new** paths; redirects keep old.
3. Wire redirects in **both**:
   - App Router thin `page.tsx` shells (`redirect()`) for query-preserving cases
   - `next.config.mjs` permanent redirects for pure path renames (skills/cli-tools/agents pattern)
4. Unit tests: **both** old and new builder outputs resolve (matrix freeze) before filesystem moves.
5. Feature flag / env dual-serve is **optional** — permanent redirects usually enough.

### Hub cutover order (P2–P3)

1. **Providers** strip `/dashboard` only (already nested budget/pricing/quota) — **S–M**  
2. **Settings** strip prefix; keep tab segments — **S–M**  
3. **Observe** root + nest health — **M**  
4. **Routing** nest fusions + compression (**biggest teachability win**) — **L**  
5. **Dashboard** dual-root collapse — **M** (bookmarks heavy)  
6. **Operations** nest deep links — **L** last  

---

## 4. Redirect matrix inventory

### 4.1 Already live (must keep / re-target when roots move)

#### EPIC-19 `EPIC19_REDIRECT_MATRIX` (20 entries — destinations via builders)

| From | To (live builder) | Hub |
|------|-------------------|-----|
| `/dashboard/costs/budget` | `buildProvidersBudgetPath()` → `/dashboard/providers/budget` | providers |
| `/dashboard/costs/pricing` | `buildProvidersPricingPath()` | providers |
| `/dashboard/costs/quota-share` | `buildProvidersQuotaSharePath()` | providers |
| `/dashboard/usage?tab=budget` | Providers budget | providers |
| `/dashboard/settings/pricing` | Providers pricing | providers |
| `/dashboard/analytics?tab=combo-health` | `buildObserveComboHealthPath()` | observe |
| `/dashboard/analytics/combo-health` | combo-health panel | observe |
| `/dashboard/analytics?tab=route-trace` | `buildObserveRouteTracePath()` | observe |
| `/dashboard/analytics?tab=route-explain` | route-trace (alias) | observe |
| `/dashboard/analytics` (+ nested evals/search/utilization/compression + `?tab=`) | `buildDashboardStoryPath(…)` | dashboard |
| `/dashboard/costs` | `buildDashboardStoryPath("costs-overview")` | dashboard |

When Providers/Observe/Dashboard roots rename, **matrix `to:` values update only through builders** — never ad-hoc strings.

#### Observe stream `OBSERVE_REDIRECT_MATRIX`

| From | Source |
|------|--------|
| `/dashboard/logs` | `request` |
| `/dashboard/logs/proxy` | `proxy` |
| `/dashboard/logs/console` | `console` |
| `/dashboard/logs/activity` | `activity` |
| `/dashboard/audit` | `audit` |
| `/dashboard/audit/mcp` | `mcp` |
| `/dashboard/audit/a2a` | `a2a` |
| `/dashboard/usage` | `request` (budget query branch → Providers) |

#### `next.config.mjs` permanent (dashboard subset — 5 rules / 3 families)

| Source | Destination |
|--------|-------------|
| `/dashboard/skills` | `/dashboard/omni-skills` |
| `/dashboard/cli-tools`, `/:path*` | `/dashboard/cli-code…` |
| `/dashboard/agents`, `/:path*` | `/dashboard/acp-agents…` |

#### Other live aliases (App Router)

| From | To (live) |
|------|-----------|
| `/` → `/dashboard` chain | story / home (see `src/app/page.tsx`) |
| `/dashboard` | → `/home` (story host) |
| `/dashboard/auto-combo` | combos filter |
| `/dashboard/compression` | context/settings |
| `/dashboard/api-endpoints` | Connect catalog SSoT |
| `/dashboard/limits` | quota |
| `/dashboard/settings?tab=` | path-segment tabs |
| `/dashboard/system/1proxy` | system/proxy tabs |

### 4.2 Target matrix — PRIMARY leaves + EPIC-19 destinations + high-traffic deep routes

> **Rule:** every row is **old → new**. Implement waves add 308 / `redirect()`; never delete old without a row here.

#### A. Primary leaf roots

| From (live) | To (target) | Priority |
|-------------|-------------|----------|
| `/home` | `/home` *or* `/dashboard` (story host pick) | P3 |
| `/dashboard/providers` | `/providers` | P3 |
| `/dashboard/combos` | `/routing` or `/routing/combos` | P2–P3 |
| `/dashboard/activity` | `/observe` | P2–P3 |
| `/dashboard/operations` | `/operations` | P3 |
| `/dashboard/settings` | `/settings` | P3 |
| `/dashboard/settings/general` | `/settings/general` | P3 |
| `/docs` | `/docs` | — |

#### B. EPIC-19 destinations (builders) — intermediate live → final target

| Live canonical | Final target | Notes |
|----------------|--------------|-------|
| `/dashboard/providers/budget` | `/providers/budget` | Keep costs/* → this chain (double hop OK short-term) |
| `/dashboard/providers/pricing` | `/providers/pricing` | |
| `/dashboard/providers/quota-share` | `/providers/quota-share` | |
| `/dashboard/activity?panel=combo-health` | `/observe?panel=combo-health` *or* `/observe/combo-health` | Never `source=` |
| `/dashboard/activity?panel=route-trace` | `/observe?panel=route-trace` (+ `id=`) | Preserve `id` |
| `/dashboard/health` | `/observe/health` | Teachability win |
| `/home?tab=overview` (etc.) | same host or `/dashboard?tab=` after pick | Story builder only |

Legacy EPIC-19 **from** paths (`/dashboard/costs/*`, `/dashboard/analytics*`) stay permanent redirects; their **to** hops through builders as roots change.

#### C. Routing teachability (top of P2)

| From | To |
|------|----|
| `/dashboard/fusions` | `/routing/fusions` |
| `/dashboard/fusions/new` | `/routing/fusions/new` |
| `/dashboard/fusions/[id]` | `/routing/fusions/[id]` |
| `/dashboard/combos/live` | `/routing/live` |
| `/dashboard/combos/playground` | `/routing/playground` *or* ops testing (product pick) |
| `/dashboard/combos/[id]` | `/routing/combos/[id]` |
| `/dashboard/context/settings` | `/routing/compression` |
| `/dashboard/context/combos` | `/routing/compression/combos` |
| `/dashboard/context/{engine}` | `/routing/compression/engines/{engine}` |
| `/dashboard/compression/studio` | `/routing/compression/studio` |
| `/dashboard/compression/live` | `/routing/compression/live` |
| `/dashboard/compression` | `/routing/compression` |
| `/dashboard/auto-combo` | `/routing` (+ filter) |

#### D. Observe high-traffic

| From | To |
|------|----|
| `/dashboard/activity` | `/observe` |
| `/dashboard/activity?source=*` | `/observe?source=*` |
| `/dashboard/activity?panel=*` | `/observe?panel=*` |
| `/dashboard/health` | `/observe/health` |
| `/dashboard/logs*` | `/observe?source=…` (existing matrix, retarget host) |
| `/dashboard/audit*` | `/observe?source=…` |

#### E. Providers peers + nested

| From | To |
|------|----|
| `/dashboard/providers/*` | `/providers/*` (prefix strip) |
| `/dashboard/provider-stats` | `/providers/stats` |
| `/dashboard/quota` | `/providers/quota` |
| `/dashboard/free-tiers` | `/providers/free-tiers` |
| `/dashboard/free-provider-rankings` | `/providers/free-provider-rankings` |
| `/dashboard/runtime` | `/providers/runtime` |
| `/dashboard/media-providers`… | `/providers/media`… |

#### F. Settings + system

| From | To |
|------|----|
| `/dashboard/settings/{tab}` | `/settings/{tab}` |
| `/dashboard/system/proxy` | `/settings/network` *or* `/operations/proxy` (product pick) — default **keep under settings cluster** as `/settings/proxy` if promoted |
| `/dashboard/system/mitm-proxy` | under settings/ops nest |
| `/dashboard/system/1proxy` | under settings/ops nest |

#### G. Dashboard peers

| From | To |
|------|----|
| `/dashboard/cache` | `{STORY_ROOT}/cache` |
| `/dashboard/cache/media` | `{STORY_ROOT}/cache/media` *or* ops testing |
| `/dashboard/tokens` | `{STORY_ROOT}/tokens` |
| `/dashboard/leaderboard` | `{STORY_ROOT}/leaderboard` |
| `/dashboard/profile` | `{STORY_ROOT}/profile` |

#### H. Operations / labs high-traffic (top 20+ deep)

| From | To (preferred nest) |
|------|---------------------|
| `/dashboard/operations` | `/operations` |
| `/dashboard/api-manager` | `/operations/api-manager` |
| `/dashboard/endpoint` | `/operations/endpoint` |
| `/dashboard/mcp` | `/operations/mcp` |
| `/dashboard/a2a` | `/operations/a2a` |
| `/dashboard/cli-code` (+ `/[id]`) | `/operations/cli-code`… |
| `/dashboard/cli-agents`… | `/operations/cli-agents`… |
| `/dashboard/cloud-agents` | `/operations/cloud-agents` |
| `/dashboard/acp-agents`… | `/operations/acp-agents`… |
| `/dashboard/tools/agent-bridge` | `/operations/tools/agent-bridge` |
| `/dashboard/tools/traffic-inspector` | `/operations/tools/traffic-inspector` |
| `/dashboard/webhooks` | `/operations/webhooks` |
| `/dashboard/memory` | `/operations/memory` |
| `/dashboard/omni-skills` | `/operations/omni-skills` |
| `/dashboard/agent-skills` | `/operations/agent-skills` |
| `/dashboard/plugins`… | `/operations/plugins`… |
| `/dashboard/batch`… | `/operations/batch`… |
| `/dashboard/testing` | `/operations/testing` |
| `/dashboard/playground` | `/operations/testing/playground` *or* keep deep + redirect |
| `/dashboard/translator` | `/operations/testing/translator` |
| `/dashboard/search-tools` | `/operations/testing/search-tools` |

#### I. next.config renames (re-chain after ops nest)

| From | Intermediate (live) | Final (if ops nest) |
|------|---------------------|---------------------|
| `/dashboard/skills` | `/dashboard/omni-skills` | `/operations/omni-skills` |
| `/dashboard/cli-tools`… | `/dashboard/cli-code`… | `/operations/cli-code`… |
| `/dashboard/agents`… | `/dashboard/acp-agents`… | `/operations/acp-agents`… |

### 4.3 Redirect implementation policy

1. **Always** old → new (308 permanent preferred for pure paths).  
2. Query-preserving cases (Observe `source`/`panel`, story `tab`, route-trace `id`) → App Router `redirect()` that reuses builders.  
3. Double-hop during migration is OK (`costs/budget` → live providers path → final `/providers/budget`) if each hop is permanent.  
4. Soak ≥1 release before deleting redirect-only `page.tsx` (archive-not-delete).  
5. **Never** redirect `/api` or `/v1`.

---

## 5. Blast radius (quantified from inventories + re-check 2026-07-19)

| Surface | Metric | Value | Impact if paths change |
|---------|--------|------:|------------------------|
| App Router pages | `page.tsx` under `(dashboard)` | **112** (111 `dashboard/` + 1 `home/`) | Filesystem moves hub-by-hub; not one PR |
| Unique `/dashboard/*` first segments | depth-1 prefixes | **51** (+ bare root) | Redirect coverage must hit each family |
| Hard `href="/dashboard` in `src/` | exact lines | **56** | Must migrate to builders; 1 test file included |
| Broader href/template `/dashboard` | lines | **~67** | Templates e.g. `` `/dashboard/providers/${id}` `` |
| EPIC-19 path builder symbol lines | `src/` | **~100+** | Single cutover point if dual-write done right |
| `buildDashboardStoryPath` lines | `src/` | **~45** | Story host pick |
| Primary sidebar leaves | count | **7** | Segment-1 map |
| Hub chrome surfaces | topbars/subnavs | **6+** definition surfaces (Dashboard, Providers, Policy, Costs residual, Routing, Observe, Settings tabs) | Segment-2 owners — **exactly one strip per hub family** (no multi-topbar stack) |
| Command palette | hard `/dashboard/…` | **dozens** (must go through builders) | High — palette is operator entry |
| Header title matcher | `Header.tsx` path table | long `match(pathname)` table | Full pass on rename |
| Sidebar matcher | prefix `href` / `href/` | fusions/health fail today | Nest paths **or** activeWhen (0084) |
| In-app UI `redirect()` | rough | **~35** call sites (`src/app/**/page.tsx`) | Rewire destinations |
| next.config dashboard redirects | rules | **5** (3 families) | Re-chain |
| E2E `gotoDashboardRoute` | files / call sites | **25** e2e files · **~101** calls (+ helper def; unit may import) | Central path map helper |
| Unit UI freezes | `tests/unit/ui` files touching paths | **large** (href freezes, epic19-*, dashboard-ia-*, observe-*, ops-*) | Update with builders same PR |
| i18n locales | message files | **42** | Path literals in help copy (en has `/dashboard/…` strings) — batch or de-path |
| Docs | NAV-TREE + UI.md + task freezes | mandatory companion | docs-sync / fabricated-docs gates |

### Risk list (UI only)

| Risk | Severity | Mitigation |
|------|----------|------------|
| Bookmarks / shared URLs | High | Permanent redirects; shells ≥1 release |
| Unit freezes on absolute href strings | High | Change freezes + builders same PR |
| E2E brittle paths | High | Single `gotoDashboardRoute` path map |
| i18n path literals (42 locales) | Medium | Prefer non-path help copy long-term |
| Parallel worktrees on `app/(dashboard)` | High | Isolated worktree per hub slice (Hard Rule #19) |
| `/home` vs `/dashboard` mid-migration | Medium | Operator pick early; dual redirect |
| Observe source vs panel | High (product) | Keep EPIC-19 panel law |
| Accidental API rewrite | Critical if mistaken | **Do not touch `/api` / `/v1`** |
| Electron / external deep links | Medium | Grep `dashboard/` outside app router before cutover |

### Out of blast radius

| Surface | Why safe |
|---------|----------|
| `/api/*`, `/v1/*` | Explicit non-goal |
| Provider upstream URLs | Unrelated |
| MCP/A2A **protocol** endpoints | Not dashboard UI routes |

---

## 6. Dual-write decision (Phase-0)

| Option | Decision |
|--------|----------|
| Stub dual-write in `epic19Rebalance.ts` / hub builders **now** | **No** (out of Phase-0 code scope; avoids thrash before P0 chrome gate) |
| Document implement-wave dual-write | **Yes** — §3 P1 |
| Unit tests for old+new builders | **When** dual-write lands — not required for Phase-0 docs |

---

## 7. Operator review checkpoint (required before mass rename PR)

Confirm explicitly:

1. **Story host:** keep `/home` long-term **or** collapse to `/dashboard`?  
2. **Routing default URL:** `/routing` vs `/routing/combos`?  
3. **Observe panels:** stay query (`?panel=`) or promote to path?  
4. **Operations nest:** full nest under `/operations/*` vs hub + permanent deep siblings?  
5. **System proxy** home: Settings vs Operations?  
6. Chrome unify / active-map (0084) status green?

Do **not** open a multi-hub filesystem PR until (1)–(3) are answered.

---

## 8. SSoT & ownership

| Artifact | Role |
|----------|------|
| This plan | Phase-0 executable freeze (T19-H) |
| Inventories | Mechanical counts + full route groups |
| `NAV-TREE-TARGET.md` § Self-evident path taxonomy | Living target roots + L1 map |
| `UI.md` § Self-evident path taxonomy | Agent enforcement pointer |
| `epic19Rebalance.ts` | Live destination builders + EPIC-19 redirect matrix |
| `observeHub.ts` | Observe hub + stream redirects |
| `settingsHub.ts` | Settings tabs + `buildSettingsPath` |
| `sidebarVisibility.ts` | Live primary hrefs (segment-1 live) |
| `RoutingHubSubnav` / hub topbars | Segment-2 live hrefs |
| `next.config.mjs` `redirects()` | Permanent pure renames |

**Implement task series (suggested naming):**  
`T19-H1` dual-write + redirects · `T19-H2` nest routing/observe · `T19-H3` strip providers/settings · `T19-H4` dashboard dual-root · `T19-H5` operations nest · `T19-H6` ratchet/soak.

---

## 9. Exit criteria for Phase-0 (this document)

- [x] Phase plan P0→P4 written  
- [x] Target taxonomy table (sidebar → root → topbar)  
- [x] Redirect inventory: primary + EPIC-19 + high-traffic deep (incl. top ~20 ops/labs)  
- [x] Blast radius quantified  
- [x] Non-goals explicit (no API, no big-bang, no delete without redirect)  
- [x] Dual-write deferred to implement wave (documented)  
- [x] Operator checkpoint listed  
- [x] Taxonomy mirrored in NAV-TREE-TARGET + UI.md  

**Not claimed:** path migration complete; builders dual-write shipped; 112 pages moved.

---

## 10. Change log

| Date | Change |
|------|--------|
| 2026-07-19 | Phase-0 plan from inventories + live SSoT (`epic19Rebalance`, hubs, next.config); Task 0085 |
| 2026-07-19 | Doc-accuracy path-to-100: `EPIC19_REDIRECT_MATRIX` **20** entries (not 16); refresh story-builder / `redirect()` call counts |
| 2026-07-20 | Independent re-review path-to-100: freeze **full operator topbar peer lists** (Dashboard Home≠Overview; Providers Budget/Pricing/Quota Sharing order; Observe `source`/`panel`/`health`); `redirect()` ~35; task lane path `03-review/` |
