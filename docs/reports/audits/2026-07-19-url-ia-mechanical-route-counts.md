# URL IA — Mechanical Route Counts

> **Agent**: gt-mechanical-investigator (read-only evidence)  
> **Date**: 2026-07-19  
> **Repo**: `/home/sephiroth/working/ganthritor/omniroute-2`  
> **Scope**: page inventory under `src/app/(dashboard)`, hard-coded `/dashboard` hrefs, EPIC-19 story builders, hub chrome SSoT, `next.config.mjs` dashboard redirects  
> **Constraint**: facts only — no product code changes, no architecture decisions

---

## Mechanical Investigation Packet

### Scope

| Item | Value |
|------|--------|
| **Question** | Baseline mechanical counts for a future URL / IA migration |
| **Allowed paths** | `src/app/(dashboard)/`, `src/shared/constants/{sidebarVisibility,epic19Rebalance,settingsHub,hubSubnavStyles}.ts`, `src/shared/components/{RoutingHubSubnav,ObserveHubSubnav,CommandPalette,Sidebar}.tsx`, hub topbars under `src/app/(dashboard)/`, `next.config.mjs` |
| **Forbidden paths** | Product edits; ports `:21000` / production; out-of-workspace trees |

### Files / Sections Read

| Path | What |
|------|------|
| `src/app/(dashboard)/` tree (`list_dir` + `export default` greps on `**/page.tsx`) | Full `page.tsx` inventory |
| `src/shared/constants/sidebarVisibility.ts` L351–416 | `PRIMARY_SIDEBAR_ITEMS` hrefs |
| `src/shared/constants/epic19Rebalance.ts` L1–136, builders + story tabs | EPIC-19 path builders |
| `src/app/(dashboard)/dashboard/providers/components/ProvidersTopBar.tsx` | Providers hub topbar paths |
| `src/app/(dashboard)/dashboard/providers/components/ProvidersPolicySubnav.tsx` | Providers policy strip |
| `src/app/(dashboard)/dashboard/costs/CostsSubnav.tsx` | Costs residual subnav |
| `src/app/(dashboard)/home/DashboardTopbar.tsx` | Dashboard story topbar |
| `src/shared/components/RoutingHubSubnav.tsx` | Routing hub links |
| `src/shared/components/ObserveHubSubnav.tsx` | Observe hub links |
| `src/shared/constants/settingsHub.ts` + `settings/layout.tsx` | Settings tab hub |
| `next.config.mjs` L309–508 | `headers` + `redirects` (dashboard subset) |
| Greps: `href="/dashboard`, `/home?tab=`, `buildDashboardStoryPath`, epic19 builders under `src/` | Link / builder counts |

### Findings

| Claim | Evidence Path/Line | Confidence | Notes |
|-------|-------------------|------------|-------|
| **`page.tsx` count under `src/app/(dashboard)` = 112** | Sum of per-subtree `^export default` greps on `**/page.tsx` + `home/page.tsx` | **High** | Method: count files with `export default` in `page.tsx`. Breakdown below. |
| **111 under `dashboard/`, 1 under `home/`** | `src/app/(dashboard)/dashboard/**/page.tsx` (111) · `src/app/(dashboard)/home/page.tsx` (1) | **High** | Route group `(dashboard)` is not a URL segment. |
| **Unique first-level segments after `dashboard` = 51 + root** | Directory listing of `src/app/(dashboard)/dashboard/` | **High** | See §1.2. Plus URL host `/home` (sibling of `dashboard/`). |
| **`href="/dashboard` literal matches in `src/` = 56** | `rg 'href="/dashboard' src` | **High** | Exact substring. Includes 1 test file (`AutoRoutingBanner.test.tsx`). |
| **Broader `href` + template `/dashboard` = 67** | `rg 'href=\{?["'\`]/dashboard' src` | **High** | Adds template literals e.g. `` href={`/dashboard/providers/${id}`} ``. |
| **Literal `/home?tab=` in `src/` = 7 (all comments)** | `rg '/home\?tab=' src` | **High** | **Zero** runtime string literals; production uses `buildDashboardStoryPath`. |
| **`buildDashboardStoryPath` refs in `src/` = 43 lines** | `rg buildDashboardStoryPath src` | **High** | Def + matrix `to:` + call sites. |
| **All named epic19 path builders in `src/` = 112 lines** | `rg 'buildDashboardStoryPath\|buildProviders…\|buildObserve…' src` | **High** | Includes definition file + imports/calls. |
| **PRIMARY_SIDEBAR hrefs: 7 leaves (6 app + docs)** | `sidebarVisibility.ts` L351–416 | **High** | Live ids: home, providers, combos, activity, operations, settings-general, docs. |
| **`next.config` dashboard permanent redirects: 5 rules (3 rename families)** | `next.config.mjs` L328–507 | **High** | skills, cli-tools, agents. **No** story/costs/analytics → `/home` redirects in next.config. |
| **Legacy URL remaps for analytics/costs live in App Router `redirect()`** | e.g. `analytics/page.tsx`, `costs/page.tsx`, nested analytics/* pages | **High** | Via `epic19Rebalance` builders, not `next.config`. |

---

## 1. `page.tsx` inventory (`src/app/(dashboard)`)

### 1.1 Count

| Location | `page.tsx` count |
|----------|------------------|
| `src/app/(dashboard)/home/` | **1** |
| `src/app/(dashboard)/dashboard/` | **111** |
| **Total** | **112** |

**Count method**: `export default` occurrences in files matching `src/app/(dashboard)/**/page.tsx` (one default export per page file). Nested dynamic segments (`[id]`, `[kind]`, `[name]`) each contribute one `page.tsx`.

### 1.2 Breakdown by first path segment under `/dashboard`

| First segment | `page.tsx` | Sample paths (filesystem → URL) |
|---------------|------------|----------------------------------|
| *(root)* | 1 | `dashboard/page.tsx` → `/dashboard` |
| `a2a` | 1 | `/dashboard/a2a` |
| `acp-agents` | 1 | `/dashboard/acp-agents` |
| `activity` | 1 | `/dashboard/activity` |
| `agent-skills` | 1 | `/dashboard/agent-skills` |
| `analytics` | 6 | `/dashboard/analytics`, `…/evals`, `…/search`, `…/utilization`, `…/combo-health`, `…/compression` |
| `api-endpoints` | 1 | `/dashboard/api-endpoints` |
| `api-manager` | 1 | `/dashboard/api-manager` |
| `audit` | 3 | `/dashboard/audit`, `…/mcp`, `…/a2a` |
| `auto-combo` | 1 | `/dashboard/auto-combo` |
| `batch` | 2 | `/dashboard/batch`, `…/files` |
| `cache` | 2 | `/dashboard/cache`, `…/media` |
| `changelog` | 1 | `/dashboard/changelog` |
| `cli-agents` | 2 | `/dashboard/cli-agents`, `…/[id]` |
| `cli-code` | 2 | `/dashboard/cli-code`, `…/[id]` |
| `cloud-agents` | 1 | `/dashboard/cloud-agents` |
| `combos` | 4 | `/dashboard/combos`, `…/[id]`, `…/live`, `…/playground` |
| `compression` | 3 | `/dashboard/compression`, `…/live`, `…/studio` |
| `context` | 13 | `/dashboard/context` + engines (`lite`, `rtk`, `caveman`, …) + `settings`, `combos` |
| `costs` | 4 | `/dashboard/costs`, `…/budget`, `…/pricing`, `…/quota-share` |
| `endpoint` | 1 | `/dashboard/endpoint` |
| `free-provider-rankings` | 1 | `/dashboard/free-provider-rankings` |
| `free-tiers` | 1 | `/dashboard/free-tiers` |
| `fusions` | 3 | `/dashboard/fusions`, `…/new`, `…/[id]` |
| `gamification` | 1 | `/dashboard/gamification/admin` |
| `health` | 1 | `/dashboard/health` |
| `leaderboard` | 1 | `/dashboard/leaderboard` |
| `limits` | 1 | `/dashboard/limits` |
| `logs` | 4 | `/dashboard/logs`, `…/activity`, `…/console`, `…/proxy` |
| `mcp` | 1 | `/dashboard/mcp` |
| `media-providers` | 3 | `/dashboard/media-providers`, `…/[kind]`, `…/[kind]/[id]` |
| `memory` | 1 | `/dashboard/memory` |
| `omni-skills` | 1 | `/dashboard/omni-skills` |
| `onboarding` | 1 | `/dashboard/onboarding` |
| `operations` | 1 | `/dashboard/operations` |
| `playground` | 1 | `/dashboard/playground` |
| `plugins` | 2 | `/dashboard/plugins`, `…/[name]/config` |
| `profile` | 1 | `/dashboard/profile` |
| `provider-stats` | 1 | `/dashboard/provider-stats` |
| `providers` | 7 | list, `new`, `[id]`, `budget`, `pricing`, `quota-share`, `services` |
| `quota` | 1 | `/dashboard/quota` |
| `relay` | 1 | `/dashboard/relay` |
| `runtime` | 1 | `/dashboard/runtime` |
| `search-tools` | 1 | `/dashboard/search-tools` |
| `settings` | 12 | hub + general/ai/security/routing/…/feature-flags/… |
| `system` | 3 | `1proxy`, `mitm-proxy`, `proxy` |
| `testing` | 1 | `/dashboard/testing` |
| `tokens` | 1 | `/dashboard/tokens` |
| `tools` | 2 | `agent-bridge`, `traffic-inspector` |
| `translator` | 1 | `/dashboard/translator` |
| `usage` | 1 | `/dashboard/usage` |
| `webhooks` | 1 | `/dashboard/webhooks` |
| **`home` (outside `/dashboard`)** | **1** | `/home` (+ `?tab=` story shell) |

**Arithmetic check**: multi-segment families sum to 78; single-leaf first segments + `/dashboard` root = 33; 78+33=111; +`home`=**112**.

### 1.3 Unique path prefixes (first ≤2 segments after `dashboard` or `home`)

Interpretation: public URL path after stripping leading `dashboard` or `home`, taking the first two remaining segments (dynamic segments kept as `[param]`).

#### Host `/home`

| Prefix (after host) | Notes |
|---------------------|--------|
| *(empty)* / `?tab=` | Story hub; tabs are query, not path segments |

**Story tabs** (`DASHBOARD_STORY_TABS` in `epic19Rebalance.ts` L111–118):  
`overview` · `evals` · `search` · `utilization` · `compression` · `costs-overview`  
→ URLs: `/home?tab=<id>` via `buildDashboardStoryPath` only.

#### Host `/dashboard` — unique depth-1 prefixes (51)

```
a2a, acp-agents, activity, agent-skills, analytics, api-endpoints, api-manager,
audit, auto-combo, batch, cache, changelog, cli-agents, cli-code, cloud-agents,
combos, compression, context, costs, endpoint, free-provider-rankings, free-tiers,
fusions, gamification, health, leaderboard, limits, logs, mcp, media-providers,
memory, omni-skills, onboarding, operations, playground, plugins, profile,
provider-stats, providers, quota, relay, runtime, search-tools, settings, system,
testing, tokens, tools, translator, usage, webhooks
```

(+ bare `/dashboard` with no second segment.)

#### Host `/dashboard` — unique depth-2 prefixes that have a `page.tsx` (static names only)

| Prefix | Count of page files under it (approx) |
|--------|----------------------------------------|
| `analytics/{combo-health,compression,evals,search,utilization}` | 5 nested (+ root) |
| `audit/{a2a,mcp}` | 2 nested |
| `batch/files` | 1 |
| `cache/media` | 1 |
| `cli-agents/[id]` | 1 |
| `cli-code/[id]` | 1 |
| `combos/{live,playground,[id]}` | 3 |
| `compression/{live,studio}` | 2 |
| `context/{aggressive,caveman,ccr,combos,headroom,lite,llmlingua,relevance,rtk,session-dedup,settings,ultra}` | 12 (+ root) |
| `costs/{budget,pricing,quota-share}` | 3 (+ root) |
| `fusions/{new,[id]}` | 2 (+ root) |
| `gamification/admin` | 1 |
| `logs/{activity,console,proxy}` | 3 (+ root) |
| `media-providers/[kind]` (+ `[kind]/[id]` depth-3) | 2 nested |
| `plugins/[name]/config` (depth-3) | 1 |
| `providers/{budget,new,pricing,quota-share,services,[id]}` | 6 (+ root) |
| `settings/{access-tokens,advanced,ai,appearance,feature-flags,general,pricing,resilience,routing,security,sidebar}` | 11 (+ root) |
| `system/{1proxy,mitm-proxy,proxy}` | 3 |
| `tools/{agent-bridge,traffic-inspector}` | 2 |

---

## 2. Hard-coded `href="/dashboard…` in `src/`

### 2.1 Exact pattern `href="/dashboard`

| Metric | Count |
|--------|------:|
| **Matching lines** | **56** |
| Of which tests | 1 (`AutoRoutingBanner.test.tsx`) |
| Production-ish | 55 |

**Sample destinations** (unique path stems observed):

| Path stem | Example file |
|-----------|--------------|
| `/dashboard` | `src/app/not-found.tsx`, `error.tsx`, `forbidden/page.tsx`, `landing/components/Footer.tsx` |
| `/dashboard/providers` | many (TopBar, lists, empty states) |
| `/dashboard/providers/new` | `TierCoverageWidget.tsx`, `TierTour.tsx` |
| `/dashboard/providers/services` | `CliproxyapiSettingsTab.tsx` |
| `/dashboard/providers/services/9router/embed/` | `NinerouterEmbedFrame.tsx` |
| `/dashboard/combos` | `AutoRoutingBanner.tsx`, `ComboControlCenterClient.tsx` |
| `/dashboard/fusions` | `FusionEditorClient.tsx` |
| `/dashboard/health` | `DegradationBadge.tsx`, `maintenance/page.tsx` |
| `/dashboard/quota` | `ProviderQuotaWidget.tsx`, `RuntimePageClient.tsx` |
| `/dashboard/context/settings` | `EngineConfigPage.tsx`, `CompressionTokenSaverCard.tsx` |
| `/dashboard/cli-code` | `acp-agents/page.tsx`, `UpstreamProxyCard.tsx` |
| `/dashboard/cli-tools` | `VscodeTokenAliasCard.tsx` (**stale name**; next.config redirects → `cli-code`) |
| `/dashboard/endpoint`, `/dashboard/logs` | `HomePageClient.tsx` |
| `/dashboard/mcp`, `/dashboard/a2a` | `EndpointPageClient.tsx` |
| `/dashboard/playground` | `ProviderOnboardingWizard.tsx` |
| `/dashboard/settings`, `settings?tab=routing` | detail cards / `acp-agents` |
| `/dashboard/tools/traffic-inspector` | `AgentBridgePageClient.tsx` |

### 2.2 Broader pattern (includes template literals)

| Metric | Count |
|--------|------:|
| `href={?["'`]/dashboard` | **67** |

Extra samples: `` `/dashboard/providers/${id}` ``, `` `/dashboard/fusions/${id}` ``, `` `/dashboard/logs?connection=…` ``, `` `/dashboard/context/${id}` ``, `` `/dashboard/media-providers/…` ``.

---

## 3. `/home?tab=` and EPIC-19 builders

### 3.1 Literal `/home?tab=`

| Scope | Matches | Runtime string literals? |
|-------|--------:|--------------------------|
| `src/` | **7** | **No** — comments/docs only |

Files: `epic19Rebalance.ts` (2), `sidebarVisibility.ts` (2), `DashboardStoryHubClient.tsx` (1), `DashboardTopbar.tsx` (1), `analytics/page.tsx` (1).

### 3.2 `buildDashboardStoryPath`

| Scope | Line matches |
|-------|-------------:|
| `src/` total | **43** |
| Definition | `epic19Rebalance.ts` L132 (+ 11 matrix `to:` rows L262–322) |
| Call / import sites (non-def) | home shell, CostsSubnav, ProvidersPolicySubnav, CommandPalette, analytics/* redirects, costs/page, HomePageClient, ApiManagerPageClient, ComboControlCenterClient |

**Builder contract** (`epic19Rebalance.ts` L126–136):

```ts
DASHBOARD_STORY_HUB_PATH = "/home"
buildDashboardStoryPath(tab) → `/home?tab=<tab>`  // tab never omitted
```

### 3.3 Other epic19 builders (same SSoT file)

| Builder | Canonical destination | Role |
|---------|----------------------|------|
| `buildProvidersBudgetPath` | `/dashboard/providers/budget` | Costs budget rehome |
| `buildProvidersPricingPath` | `/dashboard/providers/pricing` | Pricing rehome |
| `buildProvidersQuotaSharePath` | `/dashboard/providers/quota-share` | Quota-share rehome |
| `buildObserveOperationalPanelPath` | `/dashboard/activity?panel=…` | Observe ops panels |
| `buildObserveComboHealthPath` | panel `combo-health` | Analytics combo-health rehome |
| `buildObserveRouteTracePath` | panel `route-trace` | Route-trace rehome |
| `buildDashboardStoryPath` | `/home?tab=…` | Storytelling rehome |

**Combined grep** of those seven symbols under `src/`: **112** matching lines (definition + matrix + consumers).

**Import consumers of `epic19Rebalance`** (22 files under `src/`): CommandPalette, ObserveHubSubnav, DashboardStoryHubClient, DashboardTopbar, HomePageClient, ObserveHubClient, CostsSubnav, costs/* redirects, analytics/* redirects, usage, settings/pricing, ApiManagerPageClient, ComboControlCenterClient, ProvidersPolicySubnav, providers/{budget,pricing,quota-share} page comments.

---

## 4. PRIMARY_SIDEBAR + hub topbars / subnavs

### 4.1 Primary sidebar (SSoT)

**File**: `src/shared/constants/sidebarVisibility.ts`  
**Export**: `PRIMARY_SIDEBAR_ITEMS` (L351–416)  
**Consumed by**: `SIDEBAR_SECTIONS` → `src/shared/components/Sidebar.tsx`

| id | href | Notes |
|----|------|--------|
| `home` | `/home` | `exact: true` |
| `providers` | `/dashboard/providers` | |
| `combos` | `/dashboard/combos` | Routing hub entry |
| `activity` | `/dashboard/activity` | Observe hub entry |
| `operations` | `/dashboard/operations` | Hub (card grid) |
| `settings-general` | `/dashboard/settings/general` | Settings entry |
| `docs` | `/docs` | `external: true` |

**Count**: 7 primary items (EPIC-19 target; analytics/costs leaves dropped).  
Mirror: `EPIC19_TARGET_PRIMARY_SIDEBAR_IDS` in `epic19Rebalance.ts` L146+.

### 4.2 Hub chrome definition files

| Component / SSoT | Path | Defines hrefs for |
|------------------|------|-------------------|
| **ProvidersTopBar** | `src/app/(dashboard)/dashboard/providers/components/ProvidersTopBar.tsx` | Providers peers: stats, services, quota, free rankings/tiers, runtime |
| **ProvidersPolicySubnav** | `…/providers/components/ProvidersPolicySubnav.tsx` | costs-overview story + budget/pricing/quota-share builders |
| **DashboardTopbar** | `src/app/(dashboard)/home/DashboardTopbar.tsx` | story overview/costs-overview + cache, tokens, leaderboard, profile |
| **CostsSubnav** | `src/app/(dashboard)/dashboard/costs/CostsSubnav.tsx` | residual costs strip (same destinations as policy subnav) |
| **RoutingHubSubnav** | `src/shared/components/RoutingHubSubnav.tsx` | combos, fusions, live, context/settings, compression/studio |
| **ObserveHubSubnav** | `src/shared/components/ObserveHubSubnav.tsx` | activity streams + combo-health/route-trace builders + health |
| **Settings hub** | `src/shared/constants/settingsHub.ts` + `settings/layout.tsx` | `SETTINGS_TABS` via `PageTabBar` (not a `*TopBar` component) |
| **CommandPalette** | `src/shared/components/CommandPalette.tsx` | epic19 hub extras + deep links |
| **hubSubnavStyles** | `src/shared/constants/hubSubnavStyles.ts` | shared active/inactive classes only |
| **Operations hub** | `operationsHub.ts` + `OperationsHubClient.tsx` | card grid — **no** topbar/subnav component |
| **Testing hub** | `testingHub.ts` + `TestingHubClient.tsx` | card grid — **no** TestingHubSubnav |

#### ProvidersTopBar path contract (`PROVIDERS_TOPBAR_PATHS`)

```
/dashboard/providers
/dashboard/provider-stats
/dashboard/providers/services
/dashboard/quota
/dashboard/free-provider-rankings
/dashboard/free-tiers
/dashboard/runtime
```

#### RoutingHubSubnav LINKS

```
/dashboard/combos
/dashboard/fusions
/dashboard/combos/live
/dashboard/context/settings
/dashboard/compression/studio
```

#### DashboardTopbar LINKS

```
buildDashboardStoryPath("overview")      → /home?tab=overview
buildDashboardStoryPath("costs-overview") → /home?tab=costs-overview
/dashboard/cache
/dashboard/tokens
/dashboard/leaderboard
/dashboard/profile
```

#### ObserveHubSubnav (sample)

```
/dashboard/activity
/dashboard/activity?source={request|proxy|console|audit|mcp|a2a}
buildObserveComboHealthPath() / buildObserveRouteTracePath()
/dashboard/health
```

---

## 5. `next.config.mjs` redirects for dashboard

### 5.1 Present (permanent)

| source | destination | Lines |
|--------|-------------|-------|
| `/dashboard/skills` | `/dashboard/omni-skills` | L328–332 |
| `/dashboard/cli-tools` | `/dashboard/cli-code` | L496 |
| `/dashboard/cli-tools/:path*` | `/dashboard/cli-code/:path*` | L497–500 |
| `/dashboard/agents` | `/dashboard/acp-agents` | L502 |
| `/dashboard/agents/:path*` | `/dashboard/acp-agents/:path*` | L503–506 |

**Dashboard redirect rule count**: **5** entries (3 rename families).

### 5.2 Related but not redirects

| Kind | Path | Note |
|------|------|------|
| CSP header | `/dashboard/providers/services/:name/embed/:path*` | L318–321 — `frame-ancestors 'self'` only |
| rewrites | `/chat/completions`, `/responses` | API aliases — not dashboard UI |

### 5.3 Negative evidence (next.config)

| Missing in `next.config` redirects | Where remapping actually lives |
|------------------------------------|--------------------------------|
| `/dashboard` → `/home` | Not observed in next.config |
| `/dashboard/analytics*` → `/home?tab=*` | App Router `redirect()` + `buildDashboardStoryPath` |
| `/dashboard/costs*` → story / providers paths | `costs/page.tsx` + nested costs/* + providers builders |
| `/dashboard/usage` → providers budget | `usage/page.tsx` → `buildProvidersBudgetPath()` |
| `/dashboard/logs*` → activity | separate page-level redirects under `logs/` |
| `/dashboard/audit*` → activity | page-level redirects under `audit/` |

---

### Negative Evidence

| Check | Result |
|-------|--------|
| Literal production `"/home?tab=…"` strings in `src/` | **None** (comments only) |
| `next.config` redirects for storytelling / costs / analytics rehome | **None** |
| `OperationsHubSubnav` / `TestingHubSubnav` components | **Do not exist** (docs/comments explicitly say card-grid only) |
| Primary sidebar still listing `analytics` / `costs` leaves | **Not in live `PRIMARY_SIDEBAR_ITEMS`** (7 items post-0082) |
| Shell command `find … \| wc -l` | Not used; count is export-default grep + tree enumeration |

### Parent Decision Points

| Status | Item |
|--------|------|
| **Confirmed** | 112 `page.tsx` under `(dashboard)`; 56 exact `href="/dashboard`; story URLs only via `buildDashboardStoryPath`; 5 next.config dashboard renames |
| **Confirmed** | Primary chrome SSoT + 6 hub subnav/topbar definition surfaces listed in §4 |
| **Needs judgment** | Whether URL migration should collapse depth-2 namespaces (context/*, settings/*, tools/*) vs keep epic19 dual shape (`/home?tab=` + nested `/dashboard/providers/*`) |
| **Needs judgment** | Priority of sweeping 56+ hard-coded `href="/dashboard` (incl. stale `/dashboard/cli-tools` links that rely on next.config) |
| **Blocked** | Nothing for counting; migration design is out of this packet’s scope |

---

## Appendix A — Quick reference counts

| Metric | Value |
|--------|------:|
| `page.tsx` under `src/app/(dashboard)` | **112** |
| `page.tsx` under `dashboard/` only | **111** |
| `page.tsx` under `home/` | **1** |
| Unique `/dashboard/*` first segments | **51** (+ bare root) |
| Story tabs on `/home` | **6** |
| Primary sidebar items | **7** |
| `href="/dashboard` in `src/` | **56** |
| Broader href+template `/dashboard` | **67** |
| `/home?tab=` literals in `src/` | **7** (comments) |
| `buildDashboardStoryPath` lines in `src/` | **43** |
| All 7 epic19 path-builder symbol lines in `src/` | **112** |
| `next.config` dashboard permanent redirects | **5** |

---

## Appendix B — Method notes

1. **Page count**: Prefer `export default` in `**/page.tsx` over filename glob alone; matches Next App Router page modules one-to-one in this tree.
2. **href counts**: Exact `href="/dashboard` is the operator-requested metric; template form is supplemental.
3. **Story URLs**: Treat `buildDashboardStoryPath` as the only production constructor; do not invent alternate `/dashboard/home` hosts (`epic19Rebalance.ts` L126–127).
4. **Redirects**: Distinguish config-level permanent renames (next.config) from in-app `redirect()` cutovers (EPIC-19 page modules).
)
