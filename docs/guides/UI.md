---
title: "OmniRoute — UI / Information Architecture Guide"
version: 3.8.42
lastUpdated: 2026-07-19
---

# OmniRoute — UI / Information Architecture Guide

> **Authority**: IA + mid-layer adoption rules for the dashboard.  
> **Token / visual SSoT**: root [`design.md`](../../design.md) + `src/app/globals.css` (not this file).  
> **Live tree SSoT**: `src/shared/constants/sidebarVisibility.ts` (`PRIMARY_SIDEBAR_ITEMS`, `SIDEBAR_SECTIONS`, `OPERATIONAL_PILLAR_SECTION_IDS`).  
> **Epic**: [0005 — Frontend IA Reform](../tasks/00-planning/0005-omniroute-frontend-ia-design-system-epic.md) · [dependency tree](../dependency-tree.md)  
> **Target nav map (L0/L1/L2)**: [`docs/architecture/NAV-TREE-TARGET.md`](../architecture/NAV-TREE-TARGET.md)  
> **Archive policy**: [`.archive/README.md`](../../.archive/README.md)

This guide permanently bans the **feature → route → sidebar leaf** reflex. Prefer short accuracy over encyclopedic coverage.

---

## 1. Five invariants (must not regress)

| # | Rule | Meaning |
|---|------|---------|
| 1 | **No new default-visible sidebar leaf** without pillar mapping + a note on Epic 0005 (or a successor task) | New capability → map to a pillar first; add as tab/drawer/filter/row when possible |
| 2 | **Strategies / engines / presets are not menus** | Routing strategies, compression engines, sidebar presets ≠ peer leaves |
| 3 | **Event tables are one stream + filters** | Logs / audit / activity → Observability hub (`activity`) + `?source=` (or equivalent), not five peer leaves |
| 4 | **Presets are role views, not architecture** | `all` / `minimal` / `developer` / `admin` hide items for personas; they do not redefine the product tree |
| 5 | **Archive-not-delete** | Re-home capabilities; keep routes or redirects; keep hideable ids if prefs may store them; log under `.archive/` with provenance |

> **Rule of thumb:** if you need to hide ~60% of menus to make the product usable, the menu is wrong.

Code mirror of these rules: file header on `src/shared/constants/sidebarVisibility.ts` (Task 0020 / S0).

### 1.1 Chrome & path law (fork operator — 2026-07-19)

Binding also in root **`AGENTS.md`** (Dashboard IA section) and **CLAUDE.md Hard Rules #22–#23**:

- **Organização tem que ser auto-evidente, ou não é organização.**
- **Exactly one** hub-level topbar per hub page family when re-homing content (no stacked inherited subnavs).
- Architects **must ask** before encoding multi-topbar or path dumps that conflict with this guide.
- Target URL shape (phased): `/{sidebar-leaf}/{topbar-item}` — inventory: `docs/reports/audits/2026-07-19-url-ia-self-evident-path-inventory.md`.

### 1.2 Self-evident path taxonomy (T19-H / Task 0085)

> **Phase-0 freeze only** — live routes stay on `/dashboard/*` + `/home` until implement waves.  
> **Full plan + redirect matrix + blast radius**:  
> [`docs/reports/builders/2026-07-19-epic19-self-evident-url-phase0-plan.md`](../reports/builders/2026-07-19-epic19-self-evident-url-phase0-plan.md)  
> **Map section**: [`NAV-TREE-TARGET.md` § Self-evident path taxonomy](../architecture/NAV-TREE-TARGET.md#self-evident-path-taxonomy-t19-h--task-0085)

| Live id | Label | Target root (segment 1) | Segment-2 = live hub topbar (operator freeze) |
|---------|-------|-------------------------|-----------------------------------------------|
| `home` | Dashboard | `/home` *or* `/dashboard` (pick one host) | **Home · Overview · Evals · Search · Utilization · Compression · Costs · Cache · Tokens · Leaderboard · Profile** (Home ≠ Overview; one strip) |
| `providers` | Providers | `/providers` | **Providers · Stats · Services · Quota · Rankings · Free Tiers · Runtime · Budget · Pricing · Quota Sharing** (one strip) |
| `combos` | Routing | `/routing` | Combos · Fusions · Live · Topology · Compression Settings · Compression Studio |
| `activity` | Observe | `/observe` | Stream `?source=` · ops `?panel=` (never source) · Health nest |
| `operations` | Operations | `/operations` | Hub launchpad (+ optional nest) |
| `settings-general` | Settings | `/settings` | Settings tab segments |
| `docs` | Docs | `/docs` | unchanged |

**Agent rules for path work:**

1. Prefer **nest under hub** (fusions → `/routing/fusions`, health → `/observe/health`) before pure aesthetic rename.  
2. Always **redirect** old → new; never delete a route without a redirect row.  
3. **Do not** rename `/api/**` or `/v1/**`.  
4. **Do not** big-bang all ~112 `page.tsx` in one PR — hub-by-hub after chrome/active-map gate.  
5. Path builders (`epic19Rebalance.ts`, `observeHub.ts`, `settingsHub.ts`) are the only place to invent destinations — palette/Header must not hardcode new roots ad-hoc.  
6. Dual-write of builders is an **implement-wave** concern (P1); Phase-0 docs freeze the map only.  
7. Path segment-2 must track **one** hub topbar peer list — **never** invent a multi-topbar stack or Observe `source` values for combo-health / route-trace.

---

## 2. Primary chrome (live) — flat sidebar (7 leaves) + conceptual pillars

### 2.1 What the chrome shows (SSoT)

**Default sidebar is a flat list of 7 primary hubs** — `PRIMARY_SIDEBAR_ITEMS` in
`sidebarVisibility.ts` (Task **0082** EPIC-19 cutover; Task **0059** Operations hub).
Sections: `main` + optional `devtools` (debug only). Re-dump before editing this table:

```bash
node --import tsx/esm -e "
import { PRIMARY_SIDEBAR_ITEMS } from './src/shared/constants/sidebarVisibility.ts';
for (const i of PRIMARY_SIDEBAR_ITEMS) console.log(i.id, i.href);
"
```

| # | id | Hub route | Role |
|---|-----|-----------|------|
| 1 | `home` | `/home` | Dashboard storytelling (overview · evals · costs pulse · … via `?tab=`) |
| 2 | `providers` | `/dashboard/providers` | Providers + budget / pricing / quota-share (nested) |
| 3 | `combos` | `/dashboard/combos` | Routing (fusions / compression / studio → **on page**) |
| 4 | `activity` | `/dashboard/activity` | Observe (logs/audit `?source=` · health · combo/route `?panel=`) |
| 5 | `operations` | `/dashboard/operations` | Operations hub (API keys, CLI, agents, integrations → **on page**) |
| 6 | `settings-general` | `/dashboard/settings/general` | Settings (Interface = functional prefs only) |
| 7 | `docs` | `/docs` | Docs |

**Dropped from default primary (Task 0082):** `analytics`, `costs` — routes remain as redirects; **hideable** ids retained. Provenance: `.archive/sidebar/2026-07-19-epic19-analytics-costs-cutover/`.

**Deep links (not primary leaves):**

| Former primary id | Route | Status |
|-------------------|-------|--------|
| `api-manager` | `/dashboard/api-manager` | Deep link from Operations hub; **hideable** id retained for prefs |
| `cli-code` | `/dashboard/cli-code` | Deep link under Operations; route remains |
| `analytics` | `/home?tab=overview` (storytelling; legacy `/dashboard/analytics` redirects) | Hideable id retained |
| `costs` | `/home?tab=costs-overview` (legacy `/dashboard/costs` redirects) | Hideable id retained |

Do **not** re-list `api-manager`, `cli-code`, `analytics`, or `costs` as default-visible primary chrome.

**No collapsible accordion sections in the sidebar.** Nested destinations use in-page
tabs / subnav / drawers only. Collapsibles in the rail are banned (government-site UX).

Icons use **neutral** `currentColor` (active = primary / coreCyan). No rainbow icon accents.

### 2.2 Conceptual pillars (docs / mapping only)

`OPERATIONAL_PILLAR_SECTION_IDS` still names the product map for hubbing and docs —
they are **not** accordion sidebar sections (chrome is §2.1):

| # | Pillar id | Role (mapping) |
|---|-----------|----------------|
| 1 | `core-pulse` | Home / health pulse |
| 2 | `registry` | Providers, services, exposures |
| 3 | `routing` | Combos, fusions, compression |
| 4 | `governance` | Keys, tokens, security, quota, costs policy |
| 5 | `operations` | CLI, agents, tools, batch, gamification, API manager |
| 6 | `observability` | Observe stream, analytics, cache, runtime |
| 7 | `system` | Settings residual + proxy |

Verify before documenting or adding leaves:

```bash
# pillar ids + live chrome
rg -n "OPERATIONAL_PILLAR_SECTION_IDS|PRIMARY_SIDEBAR_ITEMS|SIDEBAR_SECTIONS" src/shared/constants/sidebarVisibility.ts
```

Pre-S6 snapshot: `.archive/sidebar/2026-07-10-seven-pillars/`.

---

## 3. Anti-patterns (ban list)

| Anti-pattern | Do instead |
|--------------|------------|
| New feature dumps a permanent peer leaf | Map to pillar; extend hub with tab / drawer / filter / row |
| One compression engine per sidebar item | Hub under Routing (`compression-context`); engines on page |
| Separate Activity / Logs / Proxy logs / Console / Audit leaves as defaults | One Observe hub: `/dashboard/activity` + `?source=` filters (SSoT: `src/shared/constants/observeHub.ts`) |
| Analytics dual-nav (sidebar leaf **and** nested route for same shell) | Single hub + `?tab=`; nested routes redirect |
| Triple exposure of MCP/A2A/API catalog as peer Connect leaves | Registry exposures + SSoT routes; retire duplicates (keep hideable ids) |
| Treat sidebar preset as a new product architecture | Rebuild `SIDEBAR_PRESETS` only as role views after IA is fixed |
| Silent `rm` of a surface | Move to `.archive/…` + `PROVENANCE.md` / index row |
| Full port of `visual-reference/` neon / Orbitron / Prism shell | Tokens + selective status/metric micro-patterns only (dark-only coreCyan / `#00FFCC`) |
| Re-add multi-accent / light theme / Appearance brand swatches | Fixed coreCyan dark-only (Tasks 0052–0053); Settings **Interface** = functional prefs only |
| Competing design docs (`DESING.md` typo vs `design.md`) | **`design.md` only** for tokens; IA rules live here |

---

## Hub reverse chrome

> **Owner**: Task **0076** (D1 freeze); **0099** updates Testing absorb into Ops Labs/Media.
> **Decision date**: 2026-07-19 · **Product decision: D1 — intentional one-way launchpads**
> **EPIC-20 update (0099)**: Testing hub **retired** — labs/media discovery is Ops topbar peers, not a second Testing launchpad.

### Operations hub (and retired Testing)

**Operations** (`/operations`, sidebar leaf) is the L1 shell with **one** `OperationsTopbar` for peers (`/operations/{id}`). Destination peers do **not** mount reverse strips / `OperationsHubSubnav`.

**Testing** (`/dashboard/testing`) is **no longer a living hub** (EPIC-20 / 0099): it **redirects to Labs** (`/operations/labs`). Do not reintroduce Testing reverse chrome, a Testing card on Ops Integrations, or Testing as an intermediate hop.

| Surface | Primary leaf? | After navigation… | Return path |
|---------|---------------|-------------------|-------------|
| Operations | Yes (`operations` → `/operations`) | Peers under `/operations/*` use layout-owned Ops topbar only — **not** reverse strips on legacy `/dashboard/*` | Primary **Operations** leaf · Ops topbar · CommandPalette · browser history |
| Testing (retired) | **No** | Redirect-only shell → Labs; no `TestingHubSubnav` | Ops topbar **Labs** / **Media** · CommandPalette · deep URL |

**Why D1 (not D2 reverse chrome):** mounting reverse chrome on every historical destination would bloat peer pages and recreate dual-nav pressure after Task 0060 removed labs from sidebar chrome. EPIC-20 keeps labs **out of primary/`DEVTOOLS_ITEMS`** and puts continuous chrome only as Ops topbar peers (Labs, Media, …).

**What is still continuous chrome (for contrast):**

- **Operations topbar** (`OperationsTopbar`) — 10 peers on `/operations/*` (EPIC-20 / 0086–0087); Labs/Media are peers, not reverse chrome.
- **Routing hub** (`RoutingHubSubnav`) — Combos / Fusions / Live / Topology / Compression Settings / Studio stay on peer pages (including fusion editor — Task **0075**).
- **Providers / Observe** hub strips — own peer matrices; not reopened by 0076/0099.

**Guards (tests):** `tests/unit/ui/ops-testing-reverse-chrome-0076.test.ts` (absence of reverse subnav + anti-new-leaf); `tests/unit/ui/epic20-retire-testing-0099.test.ts` (Testing redirect + Ops Labs/Media deep links). Discoverability: 0059/0060 rewritten for EPIC-20. **0 new sidebar leaves.**

SSoT: `operationsHub.ts` · `testingHub.ts` (retired redirect + absorb map) · `epic20Operations.ts`.

---

## Tools → Operations (EPIC-20 absorb)

> **Owner**: Task **0083** interim (EPIC-19) **superseded for discovery** by **0096 Labs / 0097 Media / 0099 Testing retire**.
> Do **not** reintroduce Operations → Testing as the product home for labs.
> **Product law**: EPIC-20 §1–§2 — labs/media under Ops topbar; Testing content only via Labs/Media (or redirects).

**Home for Tools / labs:** **Operations topbar → Labs / Media** — not a first-class primary sidebar leaf, and **not** a separate Testing hub.

| Surface | Discovery path | Primary leaf? |
|---------|----------------|---------------|
| Testing hub (retired) | `/dashboard/testing` **redirects** → `/operations/labs` | **No** (`testing` hideable only) |
| Playground / Translator / Search Tools / Batch | Ops topbar **Labs** · CommandPalette · legacy `/dashboard/*` redirects | **No** — never re-add to `PRIMARY_SIDEBAR_ITEMS` or `DEVTOOLS_ITEMS` |
| Media lab | Ops topbar **Media** · CommandPalette · legacy `/dashboard/cache/media` redirect | **No** |
| Plugins | Ops topbar **Integrations** · CommandPalette | **No** as primary Tools peers |

**Why no Labs L0 leaf:** EPIC-19 freed Analytics/Costs for Dashboard / Providers / Observe — **not** Tools primary peers. EPIC-20 keeps that budget law: Labs/Media are **Ops topbar peers** only.

**SSoT:** `epic20Operations.ts` (`buildOperationsPath("labs"|"media")`) · `operationsHub.ts` (Labs/Media cards, no Testing card) · `testingHub.ts` (redirect SSoT + absorb archive) · `sidebarVisibility.ts` (`DEVTOOLS_ITEMS = []`; hideable ids retained).

**Guards:** `tests/unit/ui/epic20-retire-testing-0099.test.ts` + 0059/0060 EPIC-20 contracts + `epic19-tools-ops-verify-0083.test.ts` (anti-leaf / DEVTOOLS). **0 new primary leaves** for Translator / Playground / Search Tools / Testing / Tools / Labs.

---

## 4. Shared primitives (prefer these)

Import from `src/shared/components/` (verified paths). Prefer these over hand-rolled clones.

| Primitive | Path | Use when |
|-----------|------|----------|
| `EmptyState` | `src/shared/components/EmptyState.tsx` | Empty lists / no-data screens |
| `SettingsToggleRow` | `src/shared/components/SettingsToggleRow.tsx` | Settings / permission rows with label + description + switch |
| `Toggle` | `src/shared/components/Toggle.tsx` | Standalone switch control (no raw `role="switch"` pills) |
| `Badge` | `src/shared/components/Badge.tsx` | Status chips; optional status vocabulary / glow (Task 0028) |
| `Modal` | `src/shared/components/Modal.tsx` | Dialogs; do not fork one-off modal shells |
| `StatCard` | `src/shared/components/analytics/charts.tsx` | KPI / metric tiles (shared; optional accent bar) |
| `PageTabBar` | `src/shared/components/PageTabBar.tsx` | In-page tab bars with URL sync patterns |
| `DeployRelayModal` | `src/shared/components/DeployRelayModal.tsx` | Relay deploy modal shell |
| `ConfigurableToolCard` | `src/shared/components/cli/ConfigurableToolCard.tsx` | CLI tool card shell (Operations → Tools) |
| `Button` / `Checkbox` / `Textarea` | `src/shared/components/*.tsx` | Form primitives already on the token path |

**Status vocabulary:** `src/shared/constants/statusVocabulary.ts` — map domain status → Badge/health tone; do not invent ad-hoc color maps per page.

**Theme / tokens:** `src/app/globals.css` + `src/store/themeStore.ts`. Product brand is **dark-only coreCyan** (`colorTheme: "coreCyan"`, primary `#00FFCC`, bg `#030506` / panels `#080c0e`). Coral identity and Appearance color-theme presets were removed (Tasks **0052–0053**). Settings **Interface** tab holds functional prefs only — do not reintroduce ThemeToggle, light mode, or `COLOR_THEMES` swatches.

---

## 5. Checklist: before adding UI surface

1. **Capability type?** Strategy / engine / preset / event row / true operator home.  
2. **If not a true home** → tab, filter, drawer, card row, or settings deep link — **no leaf**.  
3. **If true home** → which of the **7 pillars**? Document in PR + Epic 0005 / successor note.  
4. **Hideable id** — add to `HIDEABLE_SIDEBAR_ITEM_IDS` only when prefs may need it; do not grow default `SIDEBAR_SECTIONS` casually.  
5. **Deep links** — preserve or redirect old paths (pattern from Tasks 0022–0024).  
6. **Primitives** — reuse EmptyState / SettingsToggleRow / StatCard / Toggle / Badge / Modal before cloning.  
7. **Archive** — removals go to `.archive/` with provenance (`.archive/README.md`).  
8. **i18n** — `src/i18n/messages/en.json` `sidebar.*` keys must resolve for any `i18nKey`.  
9. **Tests** — sidebar inventory / hub tests under `tests/unit/ui/` when the default tree changes.  
10. **Do not rewrite** entire `SIDEBAR_SECTIONS` in drive-by PRs — sole structural owner was Task 0025 (S6); successors need explicit IA tasks.

---

## EPIC-19 IA rebalance (intent + freeze)

> **Status**: **live as of Task 0082** (2026-07-19). Primary chrome dump is **§2.1** (length **7** — no `analytics` / `costs` peers). Path builders + redirect matrix remain SSoT for destination shapes.
>
> **SSoT code**: `src/shared/constants/epic19Rebalance.ts` (path builders + `EPIC19_REDIRECT_MATRIX`); live leaves = `PRIMARY_SIDEBAR_ITEMS` in `sidebarVisibility.ts`.
> **Product law**: [`EPIC-19 planning`](../tasks/00-planning/EPIC-19-omniroute-dashboard-observe-providers-ia-rebalance.md).
> **Owners**: matrix freeze **0078**; content homes **0079–0081**; leaf drop + live §2 **0082**. Reverse-chrome / Tools interim → **0076** / **0083**.

### Intent model (post-rebalance)

| Intent | Hub | Leaf id | Meaning |
|--------|-----|---------|---------|
| Configure money / quota / price | **Providers** | `providers` | Mutable policy: budget, pricing, quota-share |
| Debug / ops health | **Observe** | `activity` | Logs (`?source=`), server health, **combo-health** + **route-trace** (`?panel=`) |
| Data storytelling | **Dashboard** | `home` | Charts / aggregates (usage, evals, search, utilization, compression, costs overview) |
| Tools / labs | **Operations → Labs/Media** (EPIC-20; Testing retired) | (not primary) | Playground / Translator / Search Tools / Batch under Labs; Media peer — **0** new primary leaves |

### Live primary chrome (0082 cutover)

Ids length **7**: `home`, `providers`, `combos`, `activity`, `operations`, `settings-general`, `docs` — matches §2.1.

**Removed from default primary:** `analytics`, `costs` — hideable ids + redirect shells retained (archive-not-delete). Provenance: `.archive/sidebar/2026-07-19-epic19-analytics-costs-cutover/`.

### Canonical destination shapes (one shape per family)

| Family | Frozen path shape | Builder |
|--------|-------------------|---------|
| Providers budget | `/dashboard/providers/budget` | `buildProvidersBudgetPath()` |
| Providers pricing | `/dashboard/providers/pricing` | `buildProvidersPricingPath()` |
| Providers quota-share | `/dashboard/providers/quota-share` | `buildProvidersQuotaSharePath()` |
| Observe combo-health | `/dashboard/activity?panel=combo-health` | `buildObserveComboHealthPath()` |
| Observe route-trace | `/dashboard/activity?panel=route-trace` (+ `id=`) | `buildObserveRouteTracePath(id?)` |
| Observe health | `/dashboard/health` (deep link; hub discoverability) | document only |
| Dashboard storytelling | `/home?tab=<id>` | `buildDashboardStoryPath(tab)` |

Dashboard tabs: `overview` \| `evals` \| `search` \| `utilization` \| `compression` \| `costs-overview`.

**Forbidden:** Providers as `?tab=` on providers root; Observe operational panels inside log `source` enum; dual Dashboard hosts (`/home` vs `/dashboard/...` without the builder above); promoting playground / translator / search-tools / labs to primary leaves.

### Redirect matrix summary (from → to)

| From (today) | To (canonical) |
|--------------|----------------|
| `/dashboard/costs/budget` | Providers budget |
| `/dashboard/costs/pricing` | Providers pricing |
| `/dashboard/costs/quota-share` | Providers quota-share |
| `/dashboard/usage?tab=budget` | Providers budget (legacy) |
| `/dashboard/settings/pricing` | Providers pricing (legacy) |
| `/dashboard/analytics?tab=combo-health` (+ nested) | Observe `panel=combo-health` |
| `/dashboard/analytics?tab=route-trace` / `route-explain` (+ `id=`) | Observe `panel=route-trace` |
| Remaining analytics tabs + `/dashboard/costs` overview | `/home?tab=<id>` |
| Playground / Translator / Search Tools | Operations → Labs (EPIC-20; no new leaf) |

Full testable rows: `EPIC19_REDIRECT_MATRIX` in `epic19Rebalance.ts`. Product page `redirect()` wiring landed in **0079–0081**; this section remains destination-shape SSoT (builders + matrix), not a second wiring surface.

### Cross-links

- Invariants §1 still apply (no-new-leaf, archive-not-delete).
- Observe log stream SSoT remains `observeHub.ts` (`?source=` only).
- Target L0–L1 map: [`NAV-TREE-TARGET.md` § EPIC-19 target](../architecture/NAV-TREE-TARGET.md#epic-19-target).
- Self-evident URL Phase-0 (T19-H): §1.2 + [phase-0 plan](../reports/builders/2026-07-19-epic19-self-evident-url-phase0-plan.md).

---

## EPIC-20 Operations hub reform (planned)

> **Status**: **planned / destination freeze only** (Task **0086** / T20-A, 2026-07-20).  
> Live Operations chrome remains the **card launchpad** at `/dashboard/operations` until **0087** mounts the single topbar shell.  
> **Do not** claim live `/operations/*` product routes render content yet.
>
> **SSoT code**: `src/shared/constants/epic20Operations.ts` (`OPERATIONS_TOPBAR_IDS`, `buildOperationsPath`, `OPERATIONS_REDIRECT_MATRIX`, Traffic Observe builder).  
> **Product law**: [`EPIC-20 planning`](../tasks/00-planning/EPIC-20-omniroute-operations-hub-reform.md) §2 topbar (I) + §5 path matrix (II).  
> **Owners**: matrix freeze **0086**; shell **0087**; fusions **0088–0097**; Traffic→Observe **0098**; Testing absorb **0099**; chrome gate **0100**.

### Chrome law (Hard Rule #22)

- **Exactly one** Operations hub topbar: the **10 peers** below — no second “Endpoint sub-topbar” family (APIs / Catalog / Context) and no MCP/A2A protocol strip as a competing L1 under Endpoint.  
- Hierarchy: **sidebar (Operations)** → **single topbar** → **vertical collapsibles** on fused pages.  
- **0 new primary sidebar leaves** for Labs, Testing, CoreMCP, Agents, Media, Memory, etc. Still one leaf: `operations`.  
- Traffic Inspector is **not** an Operations topbar peer → **Observe** (see freeze below).

### Locked Operations topbar (exactly 10, order frozen)

| # | Topbar id | Label | Canonical path |
|---|-----------|--------|----------------|
| 1 | `endpoints` | Endpoint | `/operations/endpoints` |
| 2 | `core-mcp` | CoreMCP | `/operations/core-mcp` |
| 3 | `agents` | Agents | `/operations/agents` |
| 4 | `cloud-agents` | Cloud Agents | `/operations/cloud-agents` |
| 5 | `a2a-acp-bridge` | A2A/ACP Bridge | `/operations/a2a-acp-bridge` |
| 6 | `skills` | Skills | `/operations/skills` |
| 7 | `integrations` | Integrations | `/operations/integrations` |
| 8 | `memory` | Memory | `/operations/memory` |
| 9 | `labs` | Labs | `/operations/labs` |
| 10 | `media` | Media | `/operations/media` |

### Hub root + path builders (one shape — no “or”)

| Concern | Frozen choice |
|---------|----------------|
| Hub root | **`/operations`** via `buildOperationsHubPath()` |
| Peer pages | **`/operations/{id}`** via `buildOperationsPath(id)` |
| Default topbar **selection** (shell highlight when path is hub root) | `OPERATIONS_DEFAULT_TOPBAR_ID = "endpoints"` — does **not** rewrite hub root to `/operations/endpoints` |
| Dual host | Forbidden as builder product — no `/dashboard/operations/{id}` canonical |

### Traffic Inspector → Observe (out of Operations)

| Concern | Frozen value |
|---------|----------------|
| Destination | **`/dashboard/activity?panel=traffic`** |
| Constant | `EPIC20_TRAFFIC_INSPECTOR_PATH` / `buildObserveTrafficInspectorPath()` |
| Owner | Task **0098** (T20-M) mounts the panel |
| Not | Operations topbar peer; not log `?source=traffic` |

### Redirect matrix summary (legacy → builder)

| From (today) | To (canonical) |
|--------------|----------------|
| `/dashboard/operations` | `/operations` (hub root) |
| `/dashboard/api-manager`, `/dashboard/endpoint` (+ `?tab=apis` / catalog / `api-endpoints`) | `/operations/endpoints` |
| `/dashboard/endpoint?tab=context-sources` | `/operations/integrations` |
| `/dashboard/mcp` | `/operations/core-mcp` |
| `/dashboard/cli-agents`, `/dashboard/cli-code` | `/operations/agents` |
| `/dashboard/cloud-agents` | `/operations/cloud-agents` |
| Agent Bridge / A2A / ACP | `/operations/a2a-acp-bridge` |
| Omni / Agent Skills | `/operations/skills` |
| Webhooks / Plugins | `/operations/integrations` |
| `/dashboard/memory` (+ tab aliases) | `/operations/memory` |
| Playground / Translator / Search Tools / Batch(+files) / Testing | `/operations/labs` |
| `/dashboard/cache/media` | `/operations/media` |
| `/dashboard/tools/traffic-inspector` | Observe `?panel=traffic` |

Full testable rows: `OPERATIONS_REDIRECT_MATRIX` in `epic20Operations.ts`. Product `redirect()` wiring is **0087–0099** — this section freezes destinations only.

### Forbidden under EPIC-20

- Primary leaves for topbar ids or Testing/Labs/MCP/Media  
- Multi-topbar stacks (Endpoint dual strip + protocol strip as peer topbars)  
- Putting Traffic Inspector on Operations topbar  
- Ad-hoc `/operations/...` strings outside `epic20Operations.ts` builders (0087+)

### Cross-links

- Invariants §1 + chrome law §1.1 still apply.  
- Reverse-chrome D1 (0076) remains true **until 0087** replaces the launchpad with the single topbar shell.  
- EPIC-19 path builders (`epic19Rebalance.ts`) are orthogonal — do not reopen Costs/Analytics here.  
- Epic source: [`EPIC-20-omniroute-operations-hub-reform.md`](../tasks/00-planning/EPIC-20-omniroute-operations-hub-reform.md).

---

## 6. Related docs

| Doc | Role |
|-----|------|
| [`design.md`](../../design.md) | Design tokens, grid, phases 1–6 — **visual SSoT** |
| [Epic 0005](../tasks/00-planning/0005-omniroute-frontend-ia-design-system-epic.md) | Diagnosis, slices S0–S10, success metrics |
| [EPIC-19](../tasks/00-planning/EPIC-19-omniroute-dashboard-observe-providers-ia-rebalance.md) | Dashboard / Observe / Providers IA rebalance (locked matrix) |
| [EPIC-20](../tasks/00-planning/EPIC-20-omniroute-operations-hub-reform.md) | Operations hub reform (topbar + fusion + `/operations/{id}` pilot) |
| `src/shared/constants/epic19Rebalance.ts` | EPIC-19 path builders + redirect matrix (destination freeze SSoT) |
| `src/shared/constants/epic20Operations.ts` | EPIC-20 Operations topbar ids + path builders + redirect matrix (destination freeze SSoT; Task 0086) |
| [Self-evident URL Phase-0 plan](../reports/builders/2026-07-19-epic19-self-evident-url-phase0-plan.md) | T19-H target taxonomy, redirect matrix, blast radius (Task 0085) |
| [`docs/dependency-tree.md`](../dependency-tree.md) | Serial vs parallel Frontend IA tasks |
| `src/shared/constants/observeHub.ts` | Observe hub path + `?source=` filters + redirect matrix |
| [`docs/architecture/MONITORING_SECTIONS.md`](../architecture/MONITORING_SECTIONS.md) | **Historical** pre–Epic 0005 Monitoring/Costs nav (not live chrome; see §2.1 + `observeHub.ts`) |
| [`.archive/README.md`](../../.archive/README.md) | Archive-not-delete policy |
| `src/shared/constants/sidebarVisibility.ts` | Live pillars, hideables, role presets |

Stale typo doc **`DESING.md`** is superseded: root file is a pointer stub; full historical copy under `.archive/docs/2026-07-10-desing-typo/`.
