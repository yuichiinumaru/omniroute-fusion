# URL IA — Self-Evident Path Inventory

**Date:** 2026-07-19  
**Role:** Frontend Quality Reviewer + mechanical inventory  
**Scope:** UI routes under `src/app/(dashboard)/` only — **not** `/api/*`  
**Status:** Inventory / proposal only — **no product code changes**

---

## 0. Operator intent (north star)

Browser URLs should read like the chrome:

```
http://host/{sidebar-leaf}/{topbar-item}
```

**Examples (target):**

| Operator mental model | Target URL |
|----------------------|------------|
| Providers → Budget | `/providers/budget` |
| Routing → Fusions | `/routing/fusions` |
| Observe → Activity | `/observe/activity` |
| Dashboard → Cache | `/dashboard/cache` *or* `/home/cache` (pick one root) |

**Not preferred:**

- Everything dumped under `/dashboard/*` with opaque segment 2 (`/dashboard/fusions` while sidebar says “Routing”)
- Multi-segment legacy (`/dashboard/cache/media`, `/dashboard/analytics?tab=…`)
- Dual homes (`/home` + `/dashboard/…` storytelling peers that leave the home shell)
- Query-only identity for primary topbar slots when a path segment would be clearer (`?tab=` is OK as *secondary* filter, not as the only hub map)

**Operator sequencing note:** **Chrome unify (one topbar pattern per hub)** is preferred **before or with** path rename awareness. Path rename alone without chrome SSoT multiplies dual systems. Chrome unify alone without path alignment leaves the address bar lying about location (and sidebar active-state broken).

---

## 1. Current path taxonomy (problems)

### 1.1 Live primary sidebar (SSoT)

Source: `PRIMARY_SIDEBAR_ITEMS` in `src/shared/constants/sidebarVisibility.ts`  
Cross-freeze: `EPIC19_TARGET_PRIMARY_SIDEBAR_IDS` in `src/shared/constants/epic19Rebalance.ts`  
Live length: **7** (post EPIC-19 / Task 0082).

| # | id | Label (fallback) | Live `href` | Path says… | Chrome says… |
|---|-----|------------------|-------------|------------|--------------|
| 1 | `home` | Dashboard | **`/home`** | home | Dashboard |
| 2 | `providers` | Providers | `/dashboard/providers` | dashboard + providers | Providers |
| 3 | `combos` | **Routing** | `/dashboard/combos` | dashboard + **combos** | **Routing** |
| 4 | `activity` | **Observe** | `/dashboard/activity` | dashboard + **activity** | **Observe** |
| 5 | `operations` | Operations | `/dashboard/operations` | dashboard + operations | Operations |
| 6 | `settings-general` | Settings | `/dashboard/settings/general` | dashboard + settings + **general** (leaf deep) | Settings hub |
| 7 | `docs` | Docs | `/docs` (external) | docs | Docs |

### 1.2 Structural problems

| Problem | Evidence | Operator impact |
|---------|----------|-----------------|
| **`/dashboard` dump prefix** | ~all product pages under `src/app/(dashboard)/dashboard/*` | Address bar never matches “I’m in Providers / Routing / Observe” |
| **Dual home roots** | Sidebar + storytelling: `/home`; residual: `/dashboard` → redirect `/home`; cache/tokens still `/dashboard/*` | Bookmark / share chaos; topbar peers leave “Dashboard” path family |
| **Leaf id ≠ path segment ≠ label** | id `combos` · href `…/combos` · label “Routing”; id `activity` · href `…/activity` · label “Observe” | Docs, tests, and operators disagree on vocabulary |
| **Hub children not under hub root** | Fusions → `/dashboard/fusions`; compression → `/dashboard/context/*` + `/dashboard/compression/*`; health → `/dashboard/health` | Topbar “belongs to Routing/Observe” but URL siblings of hub, not children |
| **Mixed L1 encoding** | Observe: `?source=` + `?panel=`; Dashboard: `?tab=`; Settings: path segment; Providers budget: nested path | No single rule “segment 2 = topbar” |
| **Multi-segment orphans** | `/dashboard/cache/media`, `/dashboard/tools/*`, `/dashboard/system/*`, `/dashboard/media-providers/*` | Deep trees without a first-class hub root in the URL |
| **Redirect shell layer** | analytics/costs/logs/audit/usage → builders; still live `page.tsx` files | Good for bookmarks; inflates route inventory and confuses “canonical vs legacy” |
| **Settings primary points at one tab** | `href: /dashboard/settings/general` | Other settings tabs may not light Settings (prefix is tab-specific, not hub) |

### 1.3 Sidebar active-state (path mismatch contribution)

Matcher: `src/shared/utils/sidebarRouteMatch.ts`

```ts
// prefix match: pathname === href || pathname.startsWith(`${href}/`)
// home uses exact: true
```

| Current URL | Expected lit leaf | Actually lit? | Why |
|-------------|-------------------|---------------|-----|
| `/dashboard/combos` | Routing | Yes | prefix of `/dashboard/combos` |
| `/dashboard/combos/live` | Routing | Yes | under combos |
| `/dashboard/fusions` | Routing | **No** | does **not** start with `/dashboard/combos` |
| `/dashboard/context/settings` | Routing | **No** | sibling tree |
| `/dashboard/compression/studio` | Routing | **No** | sibling tree |
| `/dashboard/activity` | Observe | Yes | hub root |
| `/dashboard/activity?panel=combo-health` | Observe | Yes | same path |
| `/dashboard/health` | Observe | **No** | separate path (topbar deep link only) |
| `/dashboard/api-manager` | Operations | **No** | not under `/dashboard/operations/` |
| `/dashboard/settings/ai` | Settings | **No** | primary href is `…/settings/general` (exact prefix fails) |
| `/home?tab=costs-overview` | Dashboard | Yes | exact `/home` |
| `/dashboard/cache` | Dashboard | **No** | different root — topbar peer without sidebar map |

**Root cause for fusions/compression/health:** chrome groups them under Routing/Observe, but **filesystem + href roots do not nest under the primary leaf path**. Prefix matching cannot invent that relationship.

**Fix vectors (conceptual):**

1. **Path rename (strong):** nest children under hub root → `/routing/fusions`, `/observe/health`.
2. **Active-map (chrome-only, weaker for URLs):** explicit `activeWhen` path prefixes per leaf (does not make URLs self-evident).
3. **Both:** path rename + keep matcher simple.

---

## 2. Target taxonomy proposal (leaf → href root)

Convention: **segment 1 = sidebar leaf slug**, **segment 2 = topbar id** (path preferred over query for durable L1).

| Sidebar leaf (label) | Proposed root | Live root today | Notes |
|----------------------|---------------|-----------------|-------|
| Dashboard | `/dashboard` *or* `/home` (**pick one**) | `/home` + many `/dashboard/*` peers | Prefer **one** storytelling host; migrate cache/tokens under it |
| Providers | `/providers` | `/dashboard/providers` | Nested budget/pricing/quota-share already almost right under providers |
| Routing | `/routing` | `/dashboard/combos` | **Rename slug** to match label; nest fusions + compression |
| Observe | `/observe` | `/dashboard/activity` | Nest health; promote panels to path *or* keep `?panel=` under `/observe` |
| Operations | `/operations` | `/dashboard/operations` | Nest deep destinations or accept hub-launchpad + redirects |
| Settings | `/settings` | `/dashboard/settings/general` | Primary href = hub base; segment 2 = tab |
| Docs | `/docs` | `/docs` | Keep (already self-evident) |

### 2.1 Suggested L1 maps (illustrative)

**Providers** → `/providers/{item}`

| Topbar / surface | Target | Live today |
|------------------|--------|------------|
| Manage (list) | `/providers` | `/dashboard/providers` |
| Detail | `/providers/[id]` | `/dashboard/providers/[id]` |
| Budget | `/providers/budget` | `/dashboard/providers/budget` ✅ almost |
| Pricing | `/providers/pricing` | `/dashboard/providers/pricing` ✅ |
| Quota share | `/providers/quota-share` | `/dashboard/providers/quota-share` ✅ |
| Services | `/providers/services` | `/dashboard/providers/services` ✅ |
| Stats / Quota / Runtime / Free… | `/providers/stats` etc. **or** keep as peers then redirect | Currently **siblings** under `/dashboard/*` (not nested) |

**Routing** → `/routing/{item}`

| Topbar | Target | Live today |
|--------|--------|------------|
| Combos | `/routing` or `/routing/combos` | `/dashboard/combos` |
| Fusions | `/routing/fusions` | `/dashboard/fusions` ❌ |
| Live | `/routing/live` | `/dashboard/combos/live` |
| Compression settings | `/routing/compression` | `/dashboard/context/settings` ❌ |
| Compression studio | `/routing/compression/studio` | `/dashboard/compression/studio` ❌ |

**Observe** → `/observe/{item}`

| Topbar | Target | Live today |
|--------|--------|------------|
| Activity | `/observe` or `/observe/activity` | `/dashboard/activity` |
| Request / proxy / … | `/observe/request` *or* `/observe?source=request` | `?source=` |
| Combo health | `/observe/combo-health` *or* `?panel=` | `?panel=combo-health` |
| Route trace | `/observe/route-trace` | `?panel=route-trace` |
| Health | `/observe/health` | `/dashboard/health` ❌ |

**Dashboard** → single root

| Topbar | Target options | Live today |
|--------|----------------|------------|
| Overview / story tabs | `/dashboard?tab=` or `/dashboard/overview` | `/home?tab=` |
| Cache | `/dashboard/cache` | `/dashboard/cache` (orphan of `/home`) |
| Tokens / leaderboard / profile | under same root | `/dashboard/tokens` etc. |

### 2.2 What EPIC-19 already froze (builders — do not invent alternate shapes)

Source: `src/shared/constants/epic19Rebalance.ts`

| Family | Builder / constant | Canonical shape (live) |
|--------|--------------------|------------------------|
| Providers budget/pricing/quota | `buildProviders*Path()` | `/dashboard/providers/{budget\|pricing\|quota-share}` |
| Observe operational | `buildObserveOperationalPanelPath()` | `/dashboard/activity?panel=` (**not** `source`) |
| Observe stream | `buildObserveHubPath()` (`observeHub.ts`) | `/dashboard/activity?source=` |
| Dashboard story | `buildDashboardStoryPath()` | **`/home?tab=`** (never omit tab in builder) |
| Health | `OBSERVE_HEALTH_DEEP_LINK` | `/dashboard/health` (deep, not panel) |

Any self-evident path migration should **extend these builders** (or replace them in one cutover) so palette, redirects, and tests stay single-sourced.

---

## 3. Full route inventory (grouped by hub)

**Method:** all `page.tsx` under `src/app/(dashboard)/` as of 2026-07-19.  
**Total:** ≈ **105** routes (matches NAV-TREE-TARGET “≈105 dashboard routes” claim).  
**API routes:** out of scope.

### 3.1 Counts by conceptual hub

| Hub (chrome) | Live path prefix(es) | Approx. `page.tsx` | Role |
|--------------|----------------------|--------------------|------|
| **Dashboard / home** | `/home`, `/dashboard` (redirect), cache/tokens/leaderboard/profile, analytics* redirects, costs* redirects | ~15 | Storytelling + peers + retired analytics/costs shells |
| **Providers** | `/dashboard/providers*`, provider-stats, quota, free-*, runtime, media-providers* | ~15 | Registry + economics nested |
| **Routing** | combos*, fusions*, context*, compression*, auto-combo redirect | ~25 | Combos + fusions + compression engines |
| **Observe** | activity, health, logs*, audit*, usage redirect | ~12 | Stream + health + redirect shells |
| **Operations** | operations, api-manager, endpoint, mcp, a2a, cli-*, agents, tools/*, webhooks, memory, skills, plugins, batch*, testing labs | ~25 | Hub + deep destinations |
| **Settings / system** | settings*, system/* | ~15 | Settings tabs + proxy |
| **Other** | onboarding, changelog, relay, gamification/admin, limits redirect | ~5 | Onboarding / help / misc |

### 3.2 Dashboard / Home

| Route | Kind | Notes |
|-------|------|-------|
| `/home` | **Canonical story host** | `DashboardTopbar` + `?tab=` story tabs |
| `/dashboard` | redirect | → `/home` |
| `/dashboard/cache` | live peer | Topbar link from home; **not under `/home`** |
| `/dashboard/cache/media` | live multi-seg | Media lab (also Testing discovery) |
| `/dashboard/tokens` | live peer | Gamification residual |
| `/dashboard/leaderboard` | live peer | |
| `/dashboard/profile` | live peer | |
| `/dashboard/analytics` | redirect shell | → `buildDashboardStoryPath` / Observe panels |
| `/dashboard/analytics/{combo-health,evals,search,utilization,compression}` | redirect shells | EPIC-19 matrix |
| `/dashboard/costs` | redirect shell | → `/home?tab=costs-overview` |
| `/dashboard/costs/{budget,pricing,quota-share}` | redirect shells | → Providers builders |

### 3.3 Providers

| Route | Kind |
|-------|------|
| `/dashboard/providers` | hub list |
| `/dashboard/providers/new` | create |
| `/dashboard/providers/[id]` | detail (large subtree of components) |
| `/dashboard/providers/budget` | nested L1 ✅ |
| `/dashboard/providers/pricing` | nested L1 ✅ |
| `/dashboard/providers/quota-share` | nested L1 ✅ |
| `/dashboard/providers/services` | nested L1 |
| `/dashboard/provider-stats` | **sibling** (topbar peer, not nested) |
| `/dashboard/quota` | sibling |
| `/dashboard/free-tiers` | sibling |
| `/dashboard/free-provider-rankings` | sibling |
| `/dashboard/runtime` | sibling |
| `/dashboard/media-providers`, `/[kind]`, `/[kind]/[id]` | media registry tree |

### 3.4 Routing

| Route | Kind |
|-------|------|
| `/dashboard/combos` | hub (primary leaf points here) |
| `/dashboard/combos/[id]` | editor |
| `/dashboard/combos/live` | topbar Live |
| `/dashboard/combos/playground` | deep |
| `/dashboard/auto-combo` | redirect → combos filter |
| `/dashboard/fusions`, `/new`, `/[id]` | **not under combos path** |
| `/dashboard/context` | tab redirect hub |
| `/dashboard/context/settings` | compression settings (Routing topbar) |
| `/dashboard/context/combos` | compression combos |
| `/dashboard/context/{caveman,rtk,headroom,session-dedup,ccr,llmlingua,lite,aggressive,ultra,relevance}` | engine deep pages |
| `/dashboard/compression` | redirect → context/settings |
| `/dashboard/compression/studio` | studio |
| `/dashboard/compression/live` | live cascade |

### 3.5 Observe

| Route | Kind |
|-------|------|
| `/dashboard/activity` | hub (`?source=`, `?panel=`) |
| `/dashboard/health` | deep; Observe topbar |
| `/dashboard/logs`, `/logs/{proxy,console,activity}` | redirect → Observe |
| `/dashboard/audit`, `/audit/{mcp,a2a}` | redirect → Observe |
| `/dashboard/usage` | redirect (budget → Providers; else Observe request) |

### 3.6 Operations (+ Testing labs)

| Route | Kind |
|-------|------|
| `/dashboard/operations` | hub cards |
| `/dashboard/api-manager` | deep |
| `/dashboard/endpoint` | deep (+ tab catalog SSoT) |
| `/dashboard/api-endpoints` | redirect → catalog |
| `/dashboard/mcp`, `/dashboard/a2a` | protocols |
| `/dashboard/cli-code`, `/[id]` | CLI |
| `/dashboard/cli-agents`, `/[id]` | agents |
| `/dashboard/cloud-agents`, `/dashboard/acp-agents` | agents |
| `/dashboard/tools/agent-bridge`, `/tools/traffic-inspector` | tools nest |
| `/dashboard/webhooks`, `/memory`, `/omni-skills`, `/agent-skills` | integrations |
| `/dashboard/plugins`, `/plugins/[name]/config` | plugins |
| `/dashboard/batch`, `/batch/files` | batch |
| `/dashboard/testing` | testing hub |
| `/dashboard/playground`, `/translator`, `/search-tools` | labs (no primary leaf) |

### 3.7 Settings / system / other

| Route | Kind |
|-------|------|
| `/dashboard/settings` | redirect by tab |
| `/dashboard/settings/{general,appearance,ai,routing,resilience,security,access-tokens,feature-flags,advanced,sidebar}` | path-segment tabs ✅ |
| `/dashboard/settings/pricing` | redirect → Providers pricing |
| `/dashboard/system/proxy`, `/system/mitm-proxy`, `/system/1proxy` | network |
| `/dashboard/onboarding` | wizard |
| `/dashboard/changelog` | help deep |
| `/dashboard/relay` | proxy residual |
| `/dashboard/limits` | redirect → quota |
| `/dashboard/gamification/admin` | admin residual |

---

## 4. Redirect / deep-link blast radius

### 4.1 In-app `redirect()` (UI pages)

Roughly **~30** UI redirect call sites under `src/app/(dashboard)/` and root `src/app/page.tsx` (`/` → `/dashboard`).

**Families that must rewire if roots change:**

| Family | Sources | Destination builders |
|--------|---------|----------------------|
| EPIC-19 analytics/costs | `analytics/*`, `costs/*`, `settings/pricing`, `usage?tab=budget` | `epic19Rebalance.ts` |
| Observe stream | `logs/*`, `audit/*`, usage default | `observeHub.ts` |
| Connect catalog | `api-endpoints` | `CONNECT_CATALOG_SSOT_HREF` |
| Home / dashboard alias | `/dashboard`, `/` chain | `/home` |
| Compression alias | `/dashboard/compression` | context/settings |
| Auto-combo | `/dashboard/auto-combo` | combos filter |
| Settings hub | `/dashboard/settings?tab=` | path segments |
| System proxy | `1proxy` | `system/proxy?tab=` |

### 4.2 `next.config.mjs` permanent redirects (dashboard subset)

| Source | Destination |
|--------|-------------|
| `/dashboard/skills` | `/dashboard/omni-skills` |
| `/dashboard/cli-tools`, `/:path*` | `/dashboard/cli-code…` |
| `/dashboard/agents`, `/:path*` | `/dashboard/acp-agents…` |

Plus **large** `/docs/*` redirect table (orthogonal to dashboard IA, but share config file).

### 4.3 EPIC-19 redirect matrix (documented freeze)

`EPIC19_REDIRECT_MATRIX` — **16+** from→to entries (costs→providers, analytics tabs→story/observe). Page wiring already uses builders for 0079–0081.

### 4.4 Command palette

`src/shared/components/CommandPalette.tsx` hardcodes **dozens** of `/dashboard/…` hrefs (routing hub extras, ops, testing, health, EPIC-19 builders). Full rewiring required for any root rename; **should go through builders only**.

### 4.5 Hub chrome components (topbars)

| Component | Paths owned |
|-----------|-------------|
| `DashboardTopbar` | `/home?tab=`, `/dashboard/cache|tokens|leaderboard|profile` |
| `ProvidersTopBar` | `PROVIDERS_TOPBAR_PATHS` — **7** path constants, several **not** under `/providers` |
| `RoutingHubSubnav` | combos, fusions, live, context/settings, compression/studio |
| `ObserveHubSubnav` | activity + `?source` + `?panel` + **health** |
| `CostsSubnav` | story costs-overview + providers policy paths |
| Settings `PageTabBar` / `settingsHub.ts` | `/dashboard/settings/{tab}` |
| Operations hub | **no reverse subnav** (launchpad only — Task 0076) |

### 4.6 Header title matcher

`src/shared/components/Header.tsx` — long `match(pathname)` table for titles (ops deep routes, health special-case, settings appearance). Path rename = full table pass.

### 4.7 Tests

| Layer | Risk |
|-------|------|
| Unit UI freezes | `tests/unit/ui/epic19-*.test.ts`, `dashboard-ia-*.test.ts`, `observe-settings-ia-*.test.ts`, `sidebar-route-match.test.ts` — string-assert live hrefs |
| Unit string includes | Many tests `src.includes('href: "/dashboard/…')` — **brittle SSoT locks** |
| E2E | Widespread `gotoDashboardRoute(page, "/dashboard/…")` — combos, playground, translator, settings, traffic-inspector, skills, etc. |
| Component tests | Cache page tests under `dashboard/cache/__tests__`, endpoint tests, webhook tests |

### 4.8 i18n deep-link risk

Locale JSON embeds operator-facing path strings, e.g.:

- `configuredProvidersHint` → `/dashboard/providers`
- `protocolTroubleshooting3` → `/dashboard/mcp`, `/dashboard/a2a`
- `noEligibleConnections` → `/dashboard/quota`

**42 locales** → either:

- keep English path tokens (acceptable if paths stay English product IDs), or  
- centralize help copy without raw paths, or  
- bulk-update on cutover (high cost).

### 4.9 Docs / NAV-TREE

- `docs/architecture/NAV-TREE-TARGET.md` — full L0/L1 map with live paths  
- `docs/guides/UI.md` — chrome contracts  
- Task freezes 0078–0083 — absolute path strings  

Docs rewrite is **mandatory companion** to path rename (already governed by `check:fabricated-docs` / docs-sync gates).

### 4.10 Out of blast radius (explicit)

| Surface | Why safe |
|---------|----------|
| `/api/*` | Not under dashboard tree; do **not** prefix-rename with UI |
| Provider upstream URLs | Unrelated |
| MCP/A2A **protocol** paths | Separate from dashboard UI routes (except dashboard *control* pages) |

---

## 5. Phased plan

### Principle

**P0 chrome unify** is smaller and unblocks “one topbar language.”  
**Path rename** is larger (filesystem + redirects + tests + i18n + freezes) and should **not** invent a second chrome system.

```
Phase A — Chrome unify (address bar may still lie)
    ↓
Phase B — Compat redirects + builder dual-write
    ↓
Phase C — Strip /dashboard prefix + align segment 2 = topbar
    ↓
Phase D — Delete dual systems / ratchet tests / docs freeze
```

### Phase A — Chrome unify (P0) — effort **M**

**Goal:** One topbar *pattern* per hub; fix discoverability and (optionally) active-state map **without** mass path moves.

| Work item | Detail |
|-----------|--------|
| Single topbar contract | All hubs use `HUB_SUBNAV_*` + shared “active id” API (already partial) |
| Active-state map | Extend matcher: Routing lit for `/dashboard/fusions`, `/dashboard/context/*`, `/dashboard/compression/*`; Observe lit for `/dashboard/health`; Settings lit for `/dashboard/settings/*` |
| Settings primary href | Point leaf at `/dashboard/settings` or `/dashboard/settings/general` with hub-wide match |
| Dashboard peers | Either mount topbar on cache/tokens pages **or** nest under story host (soft path move) |
| Providers topbar | Prefer nesting peer paths under providers **or** document siblings as intentional |
| Operations reverse chrome | Policy already “no reverse strip” — keep; don’t invent 2nd topbar |
| Freeze builders | No new ad-hoc href strings in palette/Header |

**Does not deliver:** self-evident URLs. **Does deliver:** chrome truth + lit sidebar while paths still legacy.

**Depends on:** nothing hard; can ship before path epic.  
**Dependency for path work:** **yes — strongly preferred first** so rename doesn’t thrash dual topbars.

### Phase B — Compat layer (builders dual-write) — effort **M**

| Work item | Detail |
|-----------|--------|
| Introduce target path constants | e.g. `ROUTING_ROOT = "/routing"` alongside live |
| Builders return **new** paths | redirects keep old |
| next.config + page redirects | old → new permanent (308) |
| Feature flag / env (optional) | dual-serve during rollout |

### Phase C — Path rename cutover — effort **L**

Order by hub (minimize cross-file thrash):

1. **Providers** (already nested budget/pricing/quota) — strip `/dashboard` only → **M**  
2. **Settings** — strip prefix; keep segment-2 tabs → **S–M**  
3. **Observe** — `/observe` + health nest; decide path vs query for sources/panels → **M**  
4. **Routing** — `/routing` + nest fusions/compression (**hardest URL teachability win**) → **L**  
5. **Dashboard** — collapse `/home` vs `/dashboard` dual root → **M** (emotionally + bookmark heavy)  
6. **Operations** — nest or redirect deep links under `/operations/*` → **L** (many destinations)

**Filesystem note:** App Router folder moves under `src/app/(dashboard)/` are mechanical but high conflict risk with parallel worktrees — use isolated worktree per CLAUDE.md Hard Rule #19.

### Phase D — Ratchet & delete — effort **M**

| Work item | Detail |
|-----------|--------|
| Update all unit freezes | epic19-*, dashboard-ia-*, observe-*, ops-* |
| E2E helper | single `gotoDashboardRoute` base + path map |
| i18n path strings | batch or de-path help copy |
| NAV-TREE + UI.md | single live table |
| Remove redirect-only pages after soak | optional archive-not-delete |
| Active matcher tests | assert fusions/health light correct leaf |

---

## 6. Effort estimate & dependency on chrome-unify

| Track | Effort | Depends on chrome-unify first? |
|-------|--------|--------------------------------|
| **A. Chrome unify + active-map only** | **M** (~1 focused PR / task slice) | — (this *is* P0) |
| **B. Compat redirects + builder dual-write** | **M** | Soft-yes (avoid dual chrome + dual paths simultaneously) |
| **C. Full self-evident path rename (all hubs)** | **L** (multi-PR epic) | **Hard-yes preferred** — otherwise thrash topbars twice |
| Providers-only strip `/dashboard` | **S–M** | Soft |
| Routing nest (fusions/compression) | **L** | Soft for active-state; hard for “URL teaches chrome” |
| Observe nest (health) + optional path panels | **M** | Soft |
| Dashboard single-root + cache under it | **M** | Soft |
| Operations nest all deep links | **L** | Soft |
| Tests + e2e + i18n + docs for full rename | **L** | After path freeze |

**Rough sequencing recommendation (operator-aligned):**

1. **Ship Phase A** (chrome unify + sidebar active-map) — operator feels “one product.”  
2. Land **path taxonomy freeze** (this doc → task epic; extend `epic19Rebalance`-style builders).  
3. **Providers + Settings** path strip (high confidence, lower risk).  
4. **Routing nest** (fixes fusions/compression address bar + natural active state).  
5. **Observe nest health** (same).  
6. **Dashboard dual-root kill**.  
7. **Operations** last (largest deep-link surface).

---

## 7. Break risks (UI only)

| Risk | Severity | Mitigation |
|------|----------|------------|
| Bookmarks / shared URLs | High | Permanent redirects; keep shells ≥1 release |
| Unit freezes on href strings | High | Change freezes with builders in same PR |
| E2E brittle paths | High | Central path map helper |
| i18n path literals (42 locales) | Medium | Prefer non-path help copy long-term |
| Parallel agent worktrees on `app/(dashboard)` | High | Isolated branch; small hub slices |
| Confusing `/home` vs `/dashboard` mid-migration | Medium | Pick target root early; dual redirect both ways briefly |
| Settings/tab deep links | Medium | Keep segment names stable when stripping prefix |
| Observe `source` vs `panel` pollution | High (product law) | Keep EPIC-19 rule: never put combo-health in `source` |
| Accidental API rewrite | Critical if mistaken | **Do not touch `/api`** |
| Electron / deep-link configs | Medium | Grep `dashboard/` outside app router |
| Operator docs & NAV-TREE | Medium | Same-PR docs; docs-sync gates |

---

## 8. Active-state issue (explicit operator claim)

| Claim | Verified? | Mechanism |
|-------|-----------|-----------|
| Fusions doesn’t light **Routing** | **Yes** | Primary href `/dashboard/combos`; fusions at `/dashboard/fusions` — no prefix match |
| Compression doesn’t light **Routing** | **Yes** | `/dashboard/context/*`, `/dashboard/compression/*` outside combos prefix |
| Health doesn’t light **Observe** | **Yes** | Primary href `/dashboard/activity`; health at `/dashboard/health` |

**Path mismatch is a direct contributor** (not only a missing CSS class).  
**Chrome-only fix:** `activeWhen` prefixes.  
**Self-evident URL fix:** nest under `/routing/*` and `/observe/*` so matcher stays dumb and URLs teach the tree.

Related secondary bug: **Settings** leaf href is tab-specific (`…/settings/general`), so other settings tabs likely also fail to light Settings — same class of prefix error.

---

## 9. Inventory sources (read live)

| Artifact | Path |
|----------|------|
| Primary sidebar | `src/shared/constants/sidebarVisibility.ts` → `PRIMARY_SIDEBAR_ITEMS` |
| EPIC-19 builders / redirect matrix | `src/shared/constants/epic19Rebalance.ts` |
| Observe hub | `src/shared/constants/observeHub.ts` |
| Settings hub | `src/shared/constants/settingsHub.ts` |
| Operations hub | `src/shared/constants/operationsHub.ts` |
| Sidebar matcher | `src/shared/utils/sidebarRouteMatch.ts` |
| Topbars | `DashboardTopbar`, `ProvidersTopBar`, `RoutingHubSubnav`, `ObserveHubSubnav`, `CostsSubnav` |
| Palette | `src/shared/components/CommandPalette.tsx` |
| NAV-TREE | `docs/architecture/NAV-TREE-TARGET.md` |
| next redirects | `next.config.mjs` `redirects()` |
| App pages | `src/app/(dashboard)/**/page.tsx` |

---

## 10. Non-goals (this report)

- No product code, no route moves, no redirect implementation  
- No decision on final root name (`/home` vs `/dashboard` vs `/`) — **flagged as open product choice**  
- No claim that query-less Observe is mandatory — path vs `?source=`/`?panel=` is a Phase C design fork  
- API / MCP protocol URLs unchanged  

---

## 11. Bottom line

| Question | Answer |
|----------|--------|
| Are URLs self-evident today? | **No** — `/dashboard` dump + leaf slug ≠ label + hub children as siblings |
| Did EPIC-19 help? | **Yes** for *destination* consolidation (analytics/costs → story/observe/providers) — **not** for address-bar taxonomy |
| Smallest valuable fix? | **Chrome unify + active-map** (Phase A, **M**) |
| Self-evident pattern cost? | **L** epic; **do after or with** chrome unify; rewire builders first |
| Biggest teachability win? | Nest **fusions + compression under Routing** and **health under Observe** |
| Sidebar bug root? | **Path mismatch** vs primary href prefixes |

**Do not implement from this document** — treat as freeze input for a future path-IA epic (companion to chrome-unify).
