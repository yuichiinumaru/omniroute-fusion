---
title: "Navigation Tree Target (OmniRoute Fusion)"
version: 3.8.42+
lastUpdated: 2026-07-11
status: living
sources:
  - .agents/user/chatgpt/ccdesign.md (operator map ~L465–601; GPT 5-pillar sketch ~L382–426)
  - docs/guides/UI.md
  - docs/tasks/00-planning/0005-omniroute-frontend-ia-design-system-epic.md
  - src/shared/constants/sidebarVisibility.ts (PRIMARY_SIDEBAR_ITEMS — live chrome)
  - Epic 0003 Fusion First-Class (fusions UI + runtime)
---

# Navigation Tree Target — OmniRoute Fusion

Living map of **how the product should be navigated**: what sits on the **sidebar**, what is an **in-page tab**, and what is a **collapsible block inside a page**.

This is **not** a dump of every `page.tsx` (≈105 dashboard routes). It is the **operator IA** we are converging to. Routes may remain for deep links; discovery goes through hubs.

---

## 1. Invariants (non-negotiable)

| # | Rule |
|---|------|
| 1 | **Sidebar ≤ ~10 primary items** — flat list, **no accordion / collapsible sections** in the rail |
| 2 | **Nested destinations = in-page only** — top **Tabs** (sub-menus) and **collapsible sections inside the page** (sub-sub), never more sidebar groups |
| 3 | **Do not delete capabilities** (except intentional demotions: gamification peers, noob marketing chrome) — re-home + redirect |
| 4 | **Strategies / engines / presets are not menus** — rows, tabs, or cards inside a hub |
| 5 | **Events are one stream** — Observe hub + filters (`?source=`), not 5–8 log leaves |
| 6 | **Icons neutral** — `currentColor`; active = primary; no rainbow accents |
| 7 | **Archive-not-delete** for removed chrome — `.archive/` + provenance |

**Intent model (operator enters for):** Configure · Investigate · Audit (cost/access) — from `ccdesign.md` / CyberCore sketch.

---

## 2. Live chrome (implemented)

**SSoT:** `PRIMARY_SIDEBAR_ITEMS` in `src/shared/constants/sidebarVisibility.ts`.

| # | id | Label (EN) | Hub route | Role |
|---|-----|------------|-----------|------|
| 1 | `home` | Home | `/home` | Cockpit / overview |
| 2 | `providers` | Providers | `/dashboard/providers` | Registry of upstreams |
| 3 | `combos` | Routing | `/dashboard/combos` | Combos + **fusions** + compression entry |
| 4 | `api-manager` | API Keys | `/dashboard/api-manager` | Credentials into OmniRoute |
| 5 | `activity` | Observe | `/dashboard/activity` | Execution stream (`?source=`) |
| 6 | `analytics` | Analytics | `/dashboard/analytics` | Charts / evals / utilization |
| 7 | `costs` | Costs | `/dashboard/costs` | Money / budget / pricing |
| 8 | `cli-code` | Operations | `/dashboard/cli-code` | CLI / agents / inspector entry |
| 9 | `settings-general` | Settings | `/dashboard/settings/general` | System residual |
| 10 | `docs` | Docs | `/docs` | Help surface |

**Debug-only (not primary):** translator, playground, search-tools when `debugMode`.

**Conceptual pillars** (`OPERATIONAL_PILLAR_SECTION_IDS`) remain for docs/mapping only — **not** collapsible sidebar sections.

---

## 3. Target hierarchy (versioned map)

Legend:

- **L0** = sidebar item (≤10)  
- **L1** = page **tab** (top of hub)  
- **L2** = **collapsible / drawer / sub-panel** on the page (not rail)

### L0 · 1 · Dashboard / Home

| Level | Item | Route / note | Status |
|-------|------|--------------|--------|
| L0 | Home / Dashboard | `/home` (target: richer cockpit) | Partial |
| L1 | Overview | current home widgets | Live |
| L1 | Health | `/dashboard/health` | Deep link; **should** become L1 tab |
| L1 | Analytics (summary) | subset of `/dashboard/analytics` | Deep |
| L1 | Costs (pulse) | pulse from `/dashboard/costs` | Deep |
| L1 | Cache (summary) | `/dashboard/cache` | Deep |
| L1 | Quota (summary) | `/dashboard/quota` | Deep |
| L2 | Provider health matrix / dense tables | on health/overview | Live pages |
| Demote | Quickstart walls of text | → Docs / `?` help | Policy |

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

### L0 · 4 · API Keys (Credentials & Access)

| Level | Item | Route / note | Status |
|-------|------|--------------|--------|
| L0 | API Keys | `/dashboard/api-manager` | Live |
| L1 | Access tokens | `/dashboard/settings/access-tokens` | Deep |
| L1 | Security / control | `/dashboard/settings/security` | Deep |
| L2 | Per-key scopes, usage limits, self-service visibility | api-manager | Live |

### L0 · 5 · Observe (Evidence stream)

| Level | Item | Route / note | Status |
|-------|------|--------------|--------|
| L0 | Observe | `/dashboard/activity` | Live hub |
| L1 | Sources via `?source=` | activity, request, proxy, console, audit, mcp, a2a | Live (`observeHub.ts`) |
| L2 | Entity dossier / detail drawer | traffic inspector patterns | Partial |
| Redirects | `/dashboard/logs*`, `/dashboard/audit*` | → Observe | Live |

### L0 · 6 · Analytics

| Level | Item | Route / note | Status |
|-------|------|--------------|--------|
| L0 | Analytics | `/dashboard/analytics` | Live hub |
| L1 | Overview | default tab | Live |
| L1 | Evals / Search / Utilization / Combo Health / Compression / Route Trace | `?tab=` | Live |
| L1 | Provider stats | `/dashboard/provider-stats` | Deep |
| L1 | Runtime detail | `/dashboard/runtime` | Deep |

### L0 · 7 · Costs (Economics)

| Level | Item | Route / note | Status |
|-------|------|--------------|--------|
| L0 | Costs | `/dashboard/costs` | Live hub |
| L1 | Overview | `/dashboard/costs` | Live |
| L1 | Pricing | `/dashboard/costs/pricing` | Deep |
| L1 | Budget | `/dashboard/costs/budget` | Deep |
| L1 | Free tiers | `/dashboard/free-tiers` | Deep |
| L1 | Quota | `/dashboard/quota` | Deep |
| L1 | Quota share | `/dashboard/costs/quota-share` | Deep |
| Demote | Free provider rankings as peer product | hide / L2 under costs | Policy |

### L0 · 8 · Operations (Clients / Agents / Tools entry)

| Level | Item | Route / note | Status |
|-------|------|--------------|--------|
| L0 | Operations | `/dashboard/cli-code` (entry; target: true ops hub) | Partial hub |
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

### L0 · 9 · Settings (residual system)

| Level | Item | Route / note | Status |
|-------|------|--------------|--------|
| L0 | Settings | `/dashboard/settings/general` | Live |
| L1 | Appearance | `…/appearance` | Deep |
| L1 | AI | `…/ai` (memory/skills/vision — re-home over time) | Deep |
| L1 | Resilience | `…/resilience` | Deep |
| L1 | Advanced | `…/advanced` | Deep |
| L1 | Feature flags | `…/feature-flags` (security flags → Governance over time) | Deep |
| L1 | Sidebar prefs | `…/sidebar` | Deep |
| L1 | Network / Proxy | `/dashboard/system/proxy` | Deep |
| Policy | Prefer re-homing “settings of X” into hub X | ccdesign rule | Ongoing |

### L0 · 10 · Docs / Help

| Level | Item | Route / note | Status |
|-------|------|--------------|--------|
| L0 | Docs | `/docs` | Live |
| L1 | Changelog | `/dashboard/changelog` | Deep |
| L1 | Issues | GitHub | External |
| L2 | In-context `?` help replacing noob walls | pattern | Partial |

### Debug-only (not L0)

| Item | Route |
|------|-------|
| Playground | `/dashboard/playground` |
| Translator | `/dashboard/translator` |
| Search tools | `/dashboard/search-tools` |

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

- Flat / short primary nav (now **10** fixed hubs).  
- L1 = tabs, L2 = page collapsibles.  
- Kill gamification peers; unify logs; question “everything is Settings”.  
- Clients / Providers / Dashboard as hubs rather than 40 leaves.

### Already done in this fork (2026-07)

- Flat primary rail + neutral icons.  
- Observe stream + analytics dual-nav collapse.  
- Compression engines off rail.  
- Seven conceptual pillars → then **flattened** to 10 hubs (no accordion).  
- Fusions UI + runtime (Epic 0003).  
- Status vocabulary / selective VR micro (not full Prism).

### Still missing for “map complete” (implementation)

| Gap | Suggestion |
|-----|------------|
| In-page tab shells on each L0 hub | `PageTabBar` already exists (Task 0030) — wire Providers / Routing / Operations / Settings / Dashboard |
| True **Dashboard** cockpit | Merge health/costs pulse into `/home` tabs |
| True **Operations** hub page | `/dashboard/operations` or shell on `cli-code` with L1 links |
| **Clients** label vs “API Keys” + “Operations” | Optional rename pass when hub pages exist |
| Feature flags → Governance/Policies | Gradual re-home |
| Residual blue / dense tables | Visual pass (ops skin) |
| Upstream 3.8+ features not in ccdesign | Catalog in §6; assign L0/L1/L2 |

---

## 6. Upstream / live surface inventory (assign when hubbing)

Surfaces that exist under `src/app/(dashboard)/dashboard/**` and must keep a home (L0/L1/L2 or demote):

| Cluster | Examples | Default home in this map |
|---------|----------|---------------------------|
| Providers | providers, services, media-providers | Providers |
| Routing | combos, live, playground, **fusions**, context/*, compression/* | Routing |
| Connect | endpoint, api-endpoints→catalog, mcp, a2a, webhooks | Providers L1 |
| Authz | api-manager, access-tokens, security | API Keys / Settings |
| Observe | activity, logs*, audit* | Observe |
| Analytics | analytics?tab=*, provider-stats, runtime, health | Analytics / Dashboard pulse |
| Costs | costs*, free-tiers, quota, quota-share | Costs |
| Ops | cli-*, agents, bridge, inspector, batch, memory, skills, plugins | Operations |
| System | settings/*, proxy | Settings |
| Dev | playground, translator, search-tools | Debug |
| Demote | leaderboard, profile, tokens, gamification/admin | Out of L0 |
| Redirects | auto-combo, limits, usage, compression root | Keep redirects |

---

## 7. CyberCore note (out of OmniRoute-fusion primary scope)

The GPT **5-pillar** sketch (Overview / Registry / Routing / Governance / Observability + System footer) and MetaMCP / Harness / Warp Prism Flutter ADS are **target identities for Cybernetics Core**, not a forced rewrite of this Next dashboard in one PR.

OmniRoute-fusion **absorbs the IA lessons** (short rail, intent hubs, stream, kill dump) while remaining a Next.js operator console. Visual full Prism port is **opt-in / later**, not SSoT (`design.md` coral + this map).

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
| [`docs/dependency-tree.md`](../dependency-tree.md) | Task DAG (Epic 0005) |
| [`docs/routing/AUTO-COMBO.md`](../routing/AUTO-COMBO.md) | Strategies including fusion |
| `.agents/user/chatgpt/ccdesign.md` | Source conversation (local, not ship authority) |

---

## 10. Gap assessments (parallel, 2026-07-11)

| Report | Focus |
|--------|--------|
| [`docs/reports/builders/2026-07-11-nav-tree-gap-routing-registry.md`](../reports/builders/2026-07-11-nav-tree-gap-routing-registry.md) | Routing, Registry, **Fusions**, compression, exposures |
| [`docs/reports/builders/2026-07-11-nav-tree-gap-ops-observe-settings.md`](../reports/builders/2026-07-11-nav-tree-gap-ops-observe-settings.md) | Observe, Analytics, Costs, Operations, Settings, Help, demotions |

**Shared conclusion:** L0 flat-10 is the right chrome; main debt is **L1 hub shells** (PageTabBar on Providers / Routing / Operations / Settings / Dashboard) so Fusions and other deep pages are discoverable without re-growing the rail. Orphans to assign: `relay`, dual Media, `compression/live`, onboarding, free-provider-rankings.

## 11. Change log (map itself)

| Date | Change |
|------|--------|
| 2026-07-11 | Initial versioned map: flat 10 L0 + L1/L2 rules + Fusions under Routing + post-3.8 inventory + ccdesign synthesis |
| 2026-07-11 | Linked dual gap-assessment reports (routing/registry + ops/observe/settings) |
