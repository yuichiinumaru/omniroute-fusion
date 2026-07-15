# OmniRoute UX Design Investigation — Consolidated Evidence

> **Date**: 2026-07-12
> **Orchestrator**: architects (omniroute/architect)
> **Sources**: 3 parallel subagent investigations + screenshot analysis + ccdesign.md
> **Related**: `.agents/user/chatgpt/ccdesign.md`, Epic 0005, `docs/guides/UI.md`, `visual-reference/` (68 files)

---

## Executive Summary

Three independent code-level investigations were conducted in parallel. Key findings:

1. **Settings hub is completely broken.** 10 settings sub-pages exist as standalone pages with **zero navigation between them**. No PageTabBar, no intra-page links, no shared layout.tsx. A user on `/dashboard/settings/general` has **no UI path** to Appearance, AI Settings, Routing, Resilience, Advanced, Security, Access Tokens, Feature Flags, or Sidebar customization.

2. **Costs hub lacks PageTabBar.** Same problem — 5 cost sub-pages (Pricing, Budget, Quota Share, Free Tiers, Free Provider Rankings) are separate sidebar entries with zero cross-linking from `/dashboard/costs`.

3. **Only 2 hub pages use PageTabBar.** Analytics (7 tabs) and Observe/Activity (7 tabs) are the only ones. Settings (0), Costs (0), Operations (0), Routing (uses RoutingHubSubnav instead) all lack in-page tab navigation.

4. **visual-reference/ exists with 68 files** — a standalone React/Tailwind prototype ("Prism") with obsidian black `#030506`, cyan `#00FFCC` accent, Orbitron/Rajdhani fonts, 16-state status vocabulary, glow budget rules, scanlines, liquid glass panels. Epic 0005 S9 selectively adopted status vocabulary + cyan accent preset; Orbitron/Rajdhani/scanlines/Prism components were deliberately ignored.

5. **Font proliferation is minimal** — exactly 1 hosted font (Inter), 1 icon font (Material Symbols), 2 system font stacks. No VR fonts leaked.

6. **Theme gap**: OmniRoute is coral `#e54d5e` + indigo `#6366f1` on lighter dark bg `#0b0e14`. VR is cyan `#00FFCC` monochrome on obsidian `#030506`. Deliberate divergence per design.md.

---

## Part I: Sidebar Navigation — Full Code-Verified Inventory

**Subagent**: Sidebar route inventory investigation
**Source**: `src/shared/constants/sidebarVisibility.ts`, all route page.tsx files, i18n keys

### 1.1 Current State

10 primary sidebar leaves (flat, no accordion):

| # | id | href | labelFallback | icon |
|---|-----|------|---------------|------|
| 1 | `home` | `/home` | Home | `home` |
| 2 | `providers` | `/dashboard/providers` | Providers | `dns` |
| 3 | `combos` | `/dashboard/combos` | Routing | `alt_route` |
| 4 | `api-manager` | `/dashboard/api-manager` | API Keys | `key` |
| 5 | `activity` | `/dashboard/activity` | Observe | `timeline` |
| 6 | `analytics` | `/dashboard/analytics` | Analytics | `analytics` |
| 7 | `costs` | `/dashboard/costs` | Costs | `payments` |
| 8 | `cli-code` | `/dashboard/cli-code` | Operations | `terminal` |
| 9 | `settings-general` | `/dashboard/settings/general` | Settings | `settings` |
| 10 | `docs` | `/docs` | Docs | `menu_book` |

Dev Tools (`translator`, `playground`, `search-tools`) appear only in debug mode.

### 1.2 Hidden Items Inventory

**84 hideable IDs total** (10 primary + 74 non-primary). The 74 non-primary items:

- **49 direct-routable pages** — page.tsx exists, URL works, but NOT in default sidebar
- **15 redirect-only pages** — page.tsx exists but only redirects to a hub
- **0 dead routes** — every hideable ID maps to either a direct page or a redirect

### 1.3 Official Retired Item Sets

| Retired Set | Items | Redirect Pattern |
|-------------|-------|------------------|
| `CONNECT_EXPOSURE_RETIRED_SIDEBAR_IDS` | `api-endpoints` (1) | → `/dashboard/endpoint?tab=catalog` |
| `COMPRESSION_ENGINE_SIDEBAR_IDS` | 9 engines | Deep-linkable standalone pages (not leaves) |
| `ANALYTICS_DUAL_NAV_SIDEBAR_IDS` | 5 analytics sub-items | → `/dashboard/analytics?tab=…` |
| `OBSERVE_STREAM_SIDEBAR_IDS` | 7 log/audit items | → `/dashboard/activity?source=…` |

**Source**: `src/shared/constants/sidebarVisibility.ts:331,402-412,715-721`, `src/shared/constants/observeHub.ts:29-37,75-87`

### 1.4 Presets

| Preset | Visible Leaves | Key Difference |
|--------|---------------|----------------|
| `all` | 84 (everything) | Full sidebar |
| `minimal` | 7 | Strips analytics, costs, operations, docs |
| `developer` | 12 | All primary + dev tools, minus docs |
| `admin` | 12 | All primary + settings-security, settings-feature-flags |

**Source**: `src/shared/constants/sidebarVisibility.ts:1018-1061`

---

## Part II: Hub Page Navigation Audit — THE CRITICAL GAPS

**Subagent**: Hub page tab-nav investigation

### 2.1 Settings Hub — BROKEN

**10 settings sub-pages exist** as standalone pages. **Zero navigation between them.**

| Page | Route | Has tab nav? | Intra-page links? | Sidebar ID |
|------|-------|:---:|:---:|------|
| General | `/dashboard/settings/general` | **NO** | **NO** | `settings-general` |
| Appearance | `/dashboard/settings/appearance` | **NO** | **NO** | `settings-appearance` |
| AI Settings | `/dashboard/settings/ai` | **NO** | **NO** | `settings-ai` |
| Global Routing | `/dashboard/settings/routing` | **NO** | **NO** | `settings-routing` |
| Resilience | `/dashboard/settings/resilience` | **NO** | **NO** | `settings-resilience` |
| Advanced | `/dashboard/settings/advanced` | **NO** | **NO** | `settings-advanced` |
| Security | `/dashboard/settings/security` | **NO** | **NO** | `settings-security` |
| Access Tokens | `/dashboard/settings/access-tokens` | **NO** | **NO** | `settings-access-tokens` |
| Feature Flags | `/dashboard/settings/feature-flags` | **NO** | **NO** | `settings-feature-flags` |
| Sidebar | `/dashboard/settings/sidebar` | **NO** | **NO** | `settings-sidebar` |
| Pricing (redirect) | `/dashboard/settings/pricing` | N/A | N/A | N/A |

**No shared `layout.tsx`** under `settings/`. Each page renders a single `*Tab` component with zero navigation to siblings. The hub `/dashboard/settings` itself only handles legacy `?tab=` redirects.

**Evidence**: `src/app/(dashboard)/dashboard/settings/general/page.tsx` renders only `SystemStorageTab`. `src/app/(dashboard)/dashboard/settings/appearance/page.tsx` renders only `AppearanceTab`. No PageTabBar import in any settings page.

**User impact**: A user clicking "Settings" in the sidebar lands on General (Storage). There is **no UI path** to change appearance, configure AI settings, manage routing, or access any other settings page without manually typing the URL or unhiding sidebar entries.

### 2.2 Costs Hub — Missing Tab Nav

`src/app/(dashboard)/dashboard/costs/page.tsx` renders `CostOverviewTab` directly with **no PageTabBar**.

| Sub-page | Route | Sidebar ID | Linked from hub? |
|----------|-------|------------|:---:|
| Overview | `/dashboard/costs` | `costs` | N/A (hub) |
| Pricing | `/dashboard/costs/pricing` | `costs-pricing` | **NO** |
| Budget | `/dashboard/costs/budget` | `costs-budget` | **NO** |
| Quota Share | `/dashboard/costs/quota-share` | `costs-quota-share` | **NO** |
| Free Tiers | `/dashboard/free-tiers` | `costs-free-tiers` | **NO** |
| Free Provider Rankings | `/dashboard/free-provider-rankings` | `free-provider-rankings` | **NO** |

### 2.3 Operations Hub — No Cross-Navigation

`src/app/(dashboard)/dashboard/cli-code/page.tsx` (labeled "Operations" via `labelFallback`) has inline filter tabs (All/Installed/Not Found) for CLI tools — **not hub sub-navigation**. No links to CLI Agents, ACP Agents, Cloud Agents, Agent Bridge, Traffic Inspector, Memory, Skills, Plugins, Batch, Gamification items.

All operations sub-pages exist as individual routes but are only reachable via sidebar hideable groups.

### 2.4 Working Hubs (for comparison)

| Hub | PageTabBar? | Tabs | Implementation |
|-----|:---:|------|--------|
| **Observe** | ✅ YES | Activity, Request Logs, Outbound, Console, Audit, MCP Audit, A2A Audit (7) | `ObserveHubClient.tsx:84` |
| **Analytics** | ✅ YES | Overview, Evals, Search, Utilization, Combo Health, Compression, Route Trace (7) | `analytics/page.tsx:110` |
| **Routing** | ⚠️ RoutingHubSubnav | Combos, Fusions, Compression (3 links, NOT tabs) | `RoutingHubSubnav.tsx`, `combos/page.tsx:1047` |

### 2.5 PageTabBar Adoption

| Hub Page | Has PageTabBar? |
|----------|:---:|
| Observe/Activity | ✅ |
| Analytics | ✅ |
| Settings | ❌ |
| Costs | ❌ |
| Operations/CLI Code | ❌ |
| Routing/Combos | ⚠️ (RoutingHubSubnav — different component) |

**Only 2 of 6 hub pages use PageTabBar.** Adoption rate: 33%.

**PageTabBar API** (`src/shared/components/PageTabBar.tsx:5-27`):
```typescript
interface PageTabBarOption {
  value: string;
  label: string;
  icon?: string;
}
props: { options, value, onChange, syncSearchParam?: string, defaultValue?: string }
```

---

## Part III: visual-reference/ — Full Audit

**Subagent**: visual-reference directory investigation

### 3.1 Location: Found

**Path**: `/home/sephiroth/working/ganthritor/omniroute-2/visual-reference/`
**Contents**: 68 files — a standalone Vite/React/Tailwind prototype "Prism" (Cybernetics Core mock)

### 3.2 Design Tokens (visual-reference)

```typescript
// src/design/tokens.ts
colors: {
  obsidian: '#030506'        // deepest background
  panel: '#080c0e'           // panel surfaces
  panelHover: '#0c1215'
  panelBorder: '#121d22'     // subtle green-grey
  coreCyan: '#00FFCC'        // PRIMARY accent (only accent)
  coreCyanDim: 'rgba(0,255,204,0.05)'
  textMuted: '#a0aec0'
  textDim: '#64748b'
}
fonts: {
  orbitron: 'var(--font-orbitron)'   // headings/logos
  rajdhani: 'var(--font-rajdhani)'   // body/tactical data
  mono: 'var(--font-mono)'           // JetBrains Mono (code/logs)
}
```

### 3.3 State Vocabulary (visual-reference)

16 states in VR's `states.ts`: healthy, degraded, offline, disabled, active, pending, **blocked**, **restricted**, **expired**, **revoked**, **redacted**, **local_only**, **remote_enabled**, **policy_denied**, **requires_approval**, **budget_exceeded**, **quota_depleted**.

Key: **Active state uses coreCyan** (`#00FFCC`) — the only state that burns the brand accent in VR.

### 3.4 OmniRoute Current Theme

```css
/* src/app/globals.css:35-37 */
--color-primary:    #e54d5e  /* coral red */
--color-primary-hover: #c93d4e
--color-accent:     #6366f1  /* indigo */
--color-accent-hover: #8b5cf6
--color-accent-light: #a855f7
/* dark background: #0b0e14 (not obsidian #030506) */
/* dark surface: #161b22 (not panel #080c0e) */
```

### 3.5 Theme Gap

| Aspect | visual-reference | OmniRoute Actual | Gap |
|--------|-----------------|------------------|-----|
| Primary color | `#00FFCC` (cyan) | `#e54d5e` (coral) | **Deliberate** — coral is OmniRoute SSoT |
| Dark background | `#030506` (obsidian) | `#0b0e14` | VR ~3x darker |
| Panel surface | `#080c0e` | `#161b22` | VR panels near-black |
| Accent | Only cyan | Coral + Indigo dual-accent | VR is monochromatic |
| Font headings | Orbitron | System sans | **Deliberately ignored** (Epic 0005) |
| Font body | Rajdhani | Inter + system sans | **Deliberately ignored** |
| Status vocabulary | 16 states | 12 states | Missing 11 VR states |
| Status "active" color | `#00FFCC` | `#3b82f6` (blue) | Divergent |
| Scanlines | Yes | No | **Deliberately ignored** |
| Glow budget | Code-level limits | Documentation policy | VR stricter |

### 3.6 What Epic 0005 S9 (Task 0028) Adopted from VR

- Status vocabulary → Badge/health mapping (12 of 16 states adapted)
- `coreCyan: #00ffcc` as optional Appearance preset (NOT default)
- Status glow CSS variables (`--status-glow-*`) for health/breakers
- StatCard accent bar
- Extended Badge with optional `status` + `glow` props

### 3.7 What Epic 0005 Explicitly Ignored

- Orbitron/Rajdhani fonts — 0 occurrences in `src/`
- Scanlines overlay — not implemented
- Prism component tree — OmniRoute maintains own primitives
- Fantasy IA/views (psionic-matrix, twilight-council, etc.) — not applicable
- Cyan `#00FFCC` as SSoT primary — coral remains default

### 3.8 Font Proliferation: MINIMAL

Only **4 unique `font-family:` declarations** in entire codebase:
1. `globals.css:272` — `var(--font-sans)` (system sans stack)
2. `globals.css:364` — Material Symbols Outlined (icon font)
3. API docs route — inline system sans
4. OAuth server page — inline system-ui

**1 hosted font** (Inter via next/font), **1 icon font** (Material Symbols self-hosted), **2 system stacks**. No VR fonts leaked.

---

## Part IV: The Three User-Identified Problems — Verified Status

### 4.1 "Theme colors far from visual-reference"

**Verified: Deliberate divergence.** design.md explicitly chose coral `#e54d5e` as SSoT. visual-reference cyan `#00FFCC` is available as optional Appearance preset but NOT default. Background is lighter (`#0b0e14` vs `#030506` obsidian). Dual-accent (coral+indigo) vs VR monochrome cyan.

**Gap**: Not a bug — a conscious product identity choice. The user may want to revisit this decision.

### 4.2 "Sidebar items removed without alternative routes"

**Partially verified.** The retire/redirect protocol was followed correctly for:
- All 7 log/audit items → Observe hub `?source=`
- All 5 analytics sub-items → Analytics hub `?tab=`
- api-endpoints → endpoint `?tab=catalog`
- compression engines → deep-linkable pages retained
- mitm-proxy/1proxy → redirect

**But the REAL gap is different**: Settings, Costs, Operations hub pages lack PageTabBar. The items weren't "removed" — they were collapsed into hubs that have no sub-navigation. The routes exist, the pages exist, but there's no UI path between siblings within a hub.

**Specific gaps found**:
- **Settings**: 10 sub-pages with no intra-page nav. `General` page has no links to `Appearance`, `AI`, etc.
- **Costs**: 5 sub-pages with no intra-page nav. Overview page has no links to `Pricing`, `Budget`, etc.
- **Operations**: CLI Code page labeled "Operations" has no links to `CLI Agents`, `ACP Agents`, `Cloud Agents`, `Agent Bridge`, etc.
- **Routing**: ✅ Has `RoutingHubSubnav` (Combos ↔ Fusions ↔ Compression), but Compression Studio page lacks return nav.

### 4.3 "Naming convention confusion"

**Verified: ID ≠ Label.** Several sidebar IDs differ from user-facing labels:

| ID | User Label | Route |
|----|------------|-------|
| `combos` | "Routing" | `/dashboard/combos` |
| `api-manager` | "API Keys" | `/dashboard/api-manager` |
| `activity` | "Observe" | `/dashboard/activity` |
| `cli-code` | "Operations" | `/dashboard/cli-code` |
| `settings-general` | "Settings" | `/dashboard/settings/general` |

This is by design (`labelFallback` in `PRIMARY_SIDEBAR_ITEMS`), but causes confusion when discussing features.

---

## Part V: Dead Routes & Redirects — Full Map

### Redirect-Only Pages (page.tsx = redirect)

| From | To | Evidence |
|------|----|----------|
| `/dashboard` | `/home` | `dashboard/page.tsx:6` |
| `/dashboard/settings` | `/dashboard/settings/general` | `settings/page.tsx:29` |
| `/dashboard/logs` | `/dashboard/activity?source=request` | `logs/page.tsx:20-22` |
| `/dashboard/logs/proxy` | `/dashboard/activity?source=proxy` | `logs/proxy/page.tsx:6` |
| `/dashboard/logs/console` | `/dashboard/activity?source=console` | `logs/console/page.tsx:6` |
| `/dashboard/logs/activity` | `/dashboard/activity?source=activity` | `logs/activity/page.tsx:6` |
| `/dashboard/audit` | `/dashboard/activity?source=audit` | `audit/page.tsx:6` |
| `/dashboard/audit/mcp` | `/dashboard/activity?source=mcp` | `audit/mcp/page.tsx:6` |
| `/dashboard/audit/a2a` | `/dashboard/activity?source=a2a` | `audit/a2a/page.tsx:6` |
| `/dashboard/usage` | `/dashboard/activity?source=request` | `usage/page.tsx:6` |
| `/dashboard/api-endpoints` | `/dashboard/endpoint?tab=catalog` | `api-endpoints/page.tsx:8` |
| `/dashboard/limits` | `/dashboard/quota` | `limits/page.tsx:4` |
| `/dashboard/settings/pricing` | `/dashboard/costs/pricing` | `settings/pricing/page.tsx:4` |
| `/dashboard/auto-combo` | `/dashboard/combos?filter=intelligent` | `auto-combo/page.tsx:4` |
| `/dashboard/system/mitm-proxy` | `/dashboard/tools/agent-bridge` (+ banner) | `system/mitm-proxy/page.tsx:17` |
| `/dashboard/system/1proxy` | `/dashboard/system/proxy?tab=free-pool` | `system/1proxy/page.tsx:4` |
| `/dashboard/media-providers` | `/dashboard/media-providers/embedding` | `media-providers/page.tsx:8` |

### Non-Redirected Legacy Pages (still live)

- `/dashboard/health` — live, not absorbed into Observe hub
- `/dashboard/runtime` — live, not redirected

### No middleware redirects. No next.config redirects.

All redirects are page-level `redirect()` or `permanentRedirect()`.

---

## Part VI: ccdesign.md Proposals vs Current State

The ccdesign.md proposes a complete reorganization of OmniRoute (lines 458-604). Key proposals:

| ccdesign.md Proposal | Current State | Gap |
|----------------------|---------------|-----|
| Dashboard replaces home as main page | Home is #1 leaf, routed to `/home` | ccdesign wants `/dashboard` as main hub |
| Overview (renamed from home) | Home shows health + docs + providers | Partially aligned |
| Analytics broken into pieces under Dashboard | Analytics is standalone leaf | ccdesign wants analytics sub-pages under Dashboard |
| "Settings - o que restar... essa página não faz sentido" | Settings is leaf #9 with 10 sub-pages | ccdesign wants Settings dissolved |
| Dev Tools (Translator, Playground) should not need debug mode | Dev Tools are debug-mode only | ccdesign wants them visible |
| All settings sub-items accessible via top bar | NO top bar exists in Settings | Critical gap |
| "tirar as explicações noob-friendly" | Many pages have verbose explanations | UX clutter issue |
| Wiki-style modularized docs | Docs links to `/docs` (fumadocs) | Partially aligned |

---

## Part VII: Verified Gap Summary — What Needs Tasks

### CRITICAL (P0)

| # | Gap | Evidence |
|---|-----|----------|
| G1 | **Settings hub has no PageTabBar** — 10 sub-pages unreachable without sidebar unhiding | 0 PageTabBar imports in any settings/*/page.tsx |
| G2 | **Costs hub has no PageTabBar** — 5 sub-pages unreachable from hub context | `costs/page.tsx` renders only `CostOverviewTab` |
| G3 | **Operations hub has no sub-navigation** — "Operations" leaf opens CLI catalog only, no links to agents/bridge/inspector/batch | `cli-code/page.tsx` has filter tabs only, not hub sub-nav |

### HIGH (P1)

| # | Gap | Evidence |
|---|-----|----------|
| G4 | **Dev Tools locked behind debug mode** — Translator, Playground, Search Tools invisible to normal users | `sidebarVisibility.ts:989-997`, `Sidebar.tsx:151` |
| G5 | **Compression Studio has no return nav** — can get there via RoutingHubSubnav but can't get back | `compression/studio/page.tsx` does NOT use RoutingHubSubnav |
| G6 | **Naming confusion** — 5 primary leaves have ID ≠ label (combos≠Routing, api-manager≠API Keys, etc.) | `PRIMARY_SIDEBAR_ITEMS` labelFallback values |
| G7 | **Health and Runtime not integrated into Observe hub** — still standalone pages with no tab link from Observe | Health has no redirect; Runtime has no redirect |

### MEDIUM (P2)

| # | Gap | Evidence |
|---|-----|----------|
| G8 | **visual-reference status vocabulary partially adopted** — 11 VR states missing from implementation | `statusVocabulary.ts` has 12 states vs VR's 16 |
| G9 | **Active/info status color diverges from VR** — VR uses cyan `#00FFCC`, OmniRoute uses blue `#3b82f6` | `statusVocabulary.ts` tone definitions |
| G10 | **~100 stale i18n keys** from pre-S6 seven-pillar accordion era — harmless but clutter | `en.json` sidebar namespace has ~234 keys, ~120 used |

### Theme/Visual (Separate Decision Track)

Not classified as bugs — these are intentional design choices that the user may want to revisit:

| Aspect | Current | VR Target | Decision needed |
|--------|---------|-----------|-----------------|
| Primary color | `#e54d5e` coral | `#00FFCC` cyan | Revisit design.md SSoT |
| Background darkness | `#0b0e14` | `#030506` obsidian | Deeper bg or keep lighter |
| Accent system | Coral+Indigo dual | Cyan monochrome | Keep dual or simplify |
| Fonts | System sans + Inter | Orbitron/Rajdhani | Epic 0005 said ignore — revisit? |

---

## Part VIII: Investigation Source Files

| Subagent | Scope | Key Files Read |
|----------|-------|----------------|
| Sidebar inventory | Routes, redirects, i18n | `sidebarVisibility.ts`, `observeHub.ts`, all settings/page.tsx, all redirect pages, `en.json`, `middleware.ts` (not found), `next.config.*` |
| visual-reference | VR contents, theme comparison | 68 VR files including `tokens.ts`, `states.ts`, `index.css`, 22 docs; `globals.css`, `themeStore.ts`, `statusVocabulary.ts`, `design.md`, `layout.tsx` |
| Hub navigation | PageTabBar usage, hub structures | All settings/*/page.tsx, `costs/page.tsx`, `cli-code/page.tsx`, `combos/page.tsx`, `analytics/page.tsx`, `activity/page.tsx`, `PageTabBar.tsx`, `RoutingHubSubnav.tsx` |

**Total files read**: ~100+ across all 3 investigations. Every finding cites file:line.