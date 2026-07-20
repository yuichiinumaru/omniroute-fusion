# Wave 3 — Frontend IA operator claims verification

> **Agent**: gt-frontend-quality-reviewer (adversarial, evidence-only)  
> **Date**: 2026-07-19  
> **Repo root**: `/home/sephiroth/working/ganthritor/omniroute-2`  
> **Constraint**: Report only — **no product code**, **no tasks**, no git ops, no `:21000` touch  
> **Purpose**: PRD-ready findings for a possible future Frontend IA epic. Do **not** spawn work items from this file alone.

---

## 0. Method

Read + grep live SSoT and mount points:

| Surface | Path |
|---------|------|
| IA rules (9-leaf, no-new-leaf) | `docs/guides/UI.md` §1–2 |
| Primary chrome | `src/shared/constants/sidebarVisibility.ts` → `PRIMARY_SIDEBAR_ITEMS` |
| Operations hub | `operationsHub.ts` + `OperationsHubClient.tsx` |
| Testing hub | `testingHub.ts` + `TestingHubClient.tsx` |
| Palette extras | `CommandPalette.tsx` |
| Home cockpit | `home/page.tsx`, `DashboardTopbar.tsx`, `HomePageClient.tsx` |
| Costs | `CostsSubnav.tsx` + tab pages |
| Analytics | `analytics/page.tsx` |
| Token health / toasts | `TokenHealthBadge.tsx`, `notificationStore.ts`, `NotificationToast.tsx` |
| CLI split | `cliTools.ts`, `cliCatalog.ts`, `CliCodePageClient.tsx`, `CliAgentsPageClient.tsx` |
| Prior residual | `docs/reports/audits/2026-07-19-wave2-frontend-ia-residual-investigation.md` |

**Verdict vocabulary**

| Tag | Meaning |
|-----|---------|
| **CONFIRMED** | Claim matches code/docs today |
| **PARTIAL** | Directionally true; scope/wording needs correction |
| **FALSE** | Claim is wrong against live code |
| **OUT-OF-SCOPE** | Not a frontend-IA residual (ops deploy, taste, etc.) |
| **PRODUCT-DECISION** | Taste / product preference, not a defect |

**EPIC scope tags (for a future PRD only)**

| Tag | Meaning |
|-----|---------|
| **INCLUDE** | Worth a future epic slice if product prioritizes it |
| **DEFER** | Real, lower urgency or depends on larger IA pass |
| **REJECT** | Do not open work; violates IA invariants or is not a bug |

---

## 1. Verdict table (all operator claims)

### A. Labs discovery

| # | Claim | Verdict | EPIC |
|---|-------|---------|------|
| A1 | Translator, Playground, Search Tools are **not** on the primary sidebar today | **CONFIRMED** | — |
| A2 | They live under Testing hub + palette (+ direct URL); not Operations chrome itself | **CONFIRMED** | — |
| A3 | Testing hub is reached via Operations → Integrations (buried) | **CONFIRMED** | INCLUDE (discoverability) |
| A4 | Testing hub is **not** a primary sidebar leaf | **CONFIRMED** | — |
| A5 | Promoting labs to a **new primary sidebar leaf** would violate UI.md no-new-leaf / 9-leaf budget | **CONFIRMED** (strict: new *default-visible* leaf) | REJECT as primary leaves; INCLUDE only as hub/tab redesign |
| A6 | Operator pain: labs hard to find | **PRODUCT-DECISION** (valid UX concern; intentional 0060 design) | INCLUDE as discoverability polish, not “add leaf” |

### B. Dashboard vs Analytics vs Costs

| # | Claim | Verdict | EPIC |
|---|-------|---------|------|
| B1 | `/home` shows topology + updates + “social” + (optional) quota | **PARTIAL** | INCLUDE (home content audit) |
| B2 | Home is “useless cockpit” / wrong mental model vs Analytics | **PRODUCT-DECISION** | DEFER / product brief |
| B3 | Toast/popup for unhealthy API keys; once-per-session | **PARTIAL** (toast yes; “session” ≠ browser session) | INCLUDE (notification model) |
| B4 | TokenHealthBadge / notification center can absorb those toasts | **PARTIAL** (badge ≠ API keys; **no** notification center) | INCLUDE if redesigning health UX |
| B5 | Costs tabs mix pure analytics vs config (budget/pricing/quota-share) | **CONFIRMED** | INCLUDE (IA rename or split) |
| B6 | Analytics combo-health / route-trace / cache overlap Observe | **PARTIAL** (conceptual adjacency; different SSoT) | DEFER |
| B7 | Cache under dashboard is analytics not routing | **CONFIRMED** (cache page = metrics; not routing control) | DEFER |

### C. Operations hub

| # | Claim | Verdict | EPIC |
|---|-------|---------|------|
| C1 | Option A: card grid only, **no** topbar/subnav | **CONFIRMED** | DEFER (reverse chrome = design choice) |
| C2 | CLI Agents vs CLI Code is a real coding vs broad split | **PARTIAL** (real `code`/`agent` split; labels ≠ “coding vs broad”) | REJECT merge unless catalog re-taxonomy |
| C3 | Dual ACP surfaces (acp-agents / a2a / agent-bridge) are redundant | **FALSE** as “same surface”; **PARTIAL** naming confusion | DEFER (copy/nav grouping only) |
| C4 | Testing link buried under Integrations | **CONFIRMED** | INCLUDE |

### D. URL IA

| # | Claim | Verdict | EPIC |
|---|-------|---------|------|
| D1 | URL pattern chaos examples (e.g. `/dashboard/cache/media` for media lab) | **CONFIRMED** | INCLUDE (redirect map) |
| D2 | Future `/hub/tab` or `?tab=` SSoT is feasible | **PARTIAL** (already used on Analytics; mixed elsewhere) | DEFER (large migration) |

---

## 2. Evidence by claim

### A. Labs discovery

#### A1–A2 — Not primary; live on Testing hub + palette

**Primary chrome (9 leaves)** — no playground / translator / search-tools / testing:

```344:425:src/shared/constants/sidebarVisibility.ts
export const PRIMARY_SIDEBAR_ITEMS: readonly SidebarItemDefinition[] = [
  { id: "home", href: "/home", ... },
  { id: "providers", href: "/dashboard/providers", ... },
  { id: "combos", href: "/dashboard/combos", ... },
  { id: "activity", href: "/dashboard/activity", ... },
  { id: "analytics", href: "/dashboard/analytics", ... },
  { id: "costs", href: "/dashboard/costs", ... },
  { id: "operations", href: "/dashboard/operations", ... },
  { id: "settings-general", href: "/dashboard/settings/general", ... },
  { id: "docs", href: "/docs", ... },
];
```

UI.md mirrors this table (`docs/guides/UI.md` §2.1, lines 52–61). Unit contract: `tests/unit/ui/sidebar-flat-primary-nav.test.ts` asserts `PRIMARY_SIDEBAR_ITEMS.length === 9`.

**Testing hub SSoT** intentionally excludes labs from all sidebar chrome:

```1:8:src/shared/constants/testingHub.ts
 * Hub route: `/dashboard/testing` — discoverability only; no primary sidebar leaf
 * (primary-nav budget stays ~9 leaves after Task 0059).
 * Existing routes remain deep-linkable. Playground / Translator / Search Tools are
 * intentionally NOT listed in any sidebar section (including debug DEVTOOLS);
```

Labs inventory (`testingHub.ts` 42–65):

| Lab | href | `isLab` |
|-----|------|--------|
| Playground | `/dashboard/playground` | true |
| Translator | `/dashboard/translator` | true |
| Search Tools | `/dashboard/search-tools` | true |

Also on hub: Batch, Batch Files, Media (`/dashboard/cache/media`), Plugins.

**Command palette** always injects Testing hub + the three labs without debug mode (`CommandPalette.tsx` 257–299).

`DEVTOOLS_ITEMS = []` (`sidebarVisibility.ts` 333–334) — labs are **not** even debug-sidebar leaves.

#### A3–A4 — Testing is deep-linked under Operations, not a primary leaf

Operations hub last group “Integrations / Tools” ends with:

```161:167:src/shared/constants/operationsHub.ts
      {
        id: "testing",
        href: "/dashboard/testing",
        label: "Testing",
        description: "Playground, translator, batch, media lab, plugins",
        icon: "science",
      },
```

Discovery path for a new operator:

1. Sidebar **Operations** (primary leaf #7)  
2. Scroll to **Integrations / Tools**  
3. Card **Testing**  
4. Then lab card  

That is **two hops + scroll** vs a primary leaf. Claim “buried” is fair.

Hideable ids retain `testing`, `translator`, `playground`, `search-tools` for prefs (`sidebarVisibility.ts` 92–96) but they are **not** default chrome.

#### A5 — Promoting labs to primary leaves vs UI.md budget

UI.md invariant #1 (`docs/guides/UI.md` lines 22–24):

> **No new default-visible sidebar leaf** without pillar mapping + a note on Epic 0005 (or a successor task)

Live budget: **9** leaves; file header says target **≤ ~10** (`sidebarVisibility.ts` lines 3–4, 341).

| Promotion idea | Budget math | IA legality |
|----------------|-------------|-------------|
| Add **one** “Labs/Testing” primary leaf | 9 → 10 (still ≤~10 stretch) | Still **new leaf** → needs pillar map + epic note; violates “prefer tab/hub” spirit |
| Add Playground + Translator + Search Tools as three leaves | 9 → 12 | **Breaks** ≤10 budget + dual/triple lab anti-pattern |
| Promote only Testing hub to primary | 9 → 10 | Legal only with explicit IA task; **does not** violate “no three lab leaves” |

**Verdict**: Operator claim “would violate no-new-leaf / 9-leaf budget” is **CONFIRMED** for “make labs primary peer leaves.” The **correct** product move, if any, is raise Testing discoverability **without** three new leaves (e.g. Operations grouping, reverse subnav, palette promotion already done).

---

### B. Dashboard vs Analytics vs Costs

#### B1 — What `/home` actually shows

Mount (`home/page.tsx` 18–24):

1. **`DashboardTopbar`** — one-way strip (home only; peers do **not** remount it)  
2. Bootstrap / AutoRouting banners (conditional)  
3. **`HomePageClient`** body  

**DashboardTopbar links** (`DashboardTopbar.tsx` 22–65):

| Link | href | Role |
|------|------|------|
| Dashboard | `/home` | Self |
| Analytics | `/dashboard/analytics` | Primary leaf already |
| Costs | `/dashboard/costs` | Primary leaf already |
| Cache | `/dashboard/cache` | **Not** primary; hideable only |
| Tokens | `/dashboard/tokens` | Gamification |
| Leaderboard | `/dashboard/leaderboard` | Gamification |
| Profile | `/dashboard/profile` | Gamification |

**HomePageClient sections (live render order)**:

| Section | Default | Evidence |
|---------|---------|----------|
| Update progress overlay | on update | ~789–901 |
| Update available banner | when `versionInfo.updateAvailable` | ~903–1040 |
| News banner | when `versionInfo.news` | ~1042–1071 |
| **Provider quota widget** | **OFF** (`pinProviderQuotaToHome` default `false`) | 201, 1076–1082 |
| Quick Start | **ON** | 203, 1084–1173 |
| Provider topology | **ON** after settings load (`shouldShowProviderTopologyOnHome`) | `homeAppearance.ts` 16–17; 1175–1181 |
| Unhealthy API-key toast side-effect | when connections loaded | 337–421 |

**Not rendered despite existing code**:

- `ProviderOverviewCard` is **defined** (~1196+) but **never mounted** — dead UI for provider grid.  
- `TierCoverageWidget` has **zero** importers outside its own file.

**“Social”**: no Discord/community feed. Closest match is **gamification** destinations on the home-only topbar (Tokens / Leaderboard / Profile). Claim of “social” is **PARTIAL** — gamification, not external social.

**“Useless quota”**: **PARTIAL**. Quota widget is **opt-in** (`pinProviderQuotaToHome` defaults false). Operators who never pinned it do **not** see quota on home. Topology + Quick Start + update banners are the default bulk.

#### B2 — Mental model: Home vs Analytics vs Costs

| Surface | Product role today | Primary leaf? |
|---------|-------------------|---------------|
| `/home` | Cockpit: update channel, onboarding quick start, optional topology/quota | Yes (`home`) |
| `/dashboard/analytics` | Charts · evals · utilization · combo health · compression · route-trace (`?tab=`) | Yes |
| `/dashboard/costs` | Money: explorer + budget limits + pricing tables + quota-share pools | Yes |
| Observe `/dashboard/activity` | Event stream (`?source=`) | Yes (`activity`) |

Operator frustration that Home is not a “pulse of usage/cost” is a **PRODUCT-DECISION**, not a routing bug. Topbar duplicates Analytics/Costs that already have primary leaves — residual from Task 0056 “hub-only topbar” design (see wave2 report §3.2).

#### B3 — Unhealthy API-key toast path

```337:415:src/app/(dashboard)/dashboard/HomePageClient.tsx
  // T07: Check for unhealthy API keys and show notification (once per session)
  const notifiedUnhealthyKeys = useRef<Set<string>>(new Set());
  useEffect(() => {
    const checkApiKeyHealth = () => {
      // ... reads conn.providerSpecificData.apiKeyHealth
      // status "invalid" | "warning"
      useNotificationStore.getState().addNotification({
        type: notificationType,
        message: tp(...),
        title: tp(...),
        duration: 10000,
        onClick: () => router.push(navigateTo),
      });
      newUnhealthyKeys.forEach((k) => notifiedUnhealthyKeys.current.add(k));
    };
    if (providerConnections.length > 0) checkApiKeyHealth();
  }, [providerConnections, t, tp, router]);
```

| Operator phrase | Reality |
|-----------------|---------|
| Toast/popup | **CONFIRMED** — `notificationStore` + global `NotificationToast` (top-right stack) |
| Once-per-session | **PARTIAL** — `useRef` only; **not** `sessionStorage` / server session. Survives within SPA mount; **remount of Home** or hard navigation that remounts client can re-fire for the same keys |
| Only on Home | **CONFIRMED** — effect lives in `HomePageClient`; other pages do not run this check |

#### B4 — TokenHealthBadge vs notification center

**TokenHealthBadge** (`TokenHealthBadge.tsx`):

- Header control; polls `/api/token-health` every 60s.  
- Reports **OAuth token** health (`total`, `healthy`, `errored`, `warning`) — **not** provider `apiKeyHealth` from connections.  
- Hover tooltip only; no click-through list, no history, no persistence.

**Notification “center”**:

- **Does not exist.** Only `NotificationToast` (ephemeral stack, auto-dismiss) + Zustand store.  
- Header has: command palette, language, DegradationBadge, TokenHealthBadge, logout — no bell/inbox.

| Absorb strategy | Feasible? |
|-----------------|-----------|
| Route API-key health into TokenHealthBadge | **Misleading** without renaming — badge is OAuth-token scoped |
| Persist toasts into a notification drawer | **New surface** — INCLUDE as product feature, not a free fix |
| Keep toast + deep-link to Providers | **Current** design |

#### B5 — Costs tabs: analytics vs config

`CostsSubnav` (`CostsSubnav.tsx` 23–48):

| Tab | href | Content nature | Evidence |
|-----|------|----------------|----------|
| Overview | `/dashboard/costs` | **Analytics** — cost explorer, charts, metrics | `CostOverviewTab.tsx` (usage analytics + explorer) |
| Budget | `/dashboard/costs/budget` | **Config / policy** — daily/weekly/monthly limits per key | wraps `usage/components/BudgetTab.tsx` |
| Pricing | `/dashboard/costs/pricing` | **Config / catalog** — reuses Settings `PricingTab` | `pricing/page.tsx` imports `../../settings/components/PricingTab` |
| Quota Share | `/dashboard/costs/quota-share` | **Config + ops** — pools, allocation wizard | `QuotaSharePageClient` + PoolWizard |

**CONFIRMED**: Costs is a **mixed governance hub**, not pure analytics. UI.md pillar map places costs under **governance** (`OPERATIONAL_PILLAR` row 4) while Analytics sits under observability — operator mental model that “Costs = money charts only” is incomplete.

#### B6 — Analytics vs Observe overlap

**Analytics tabs** (`analytics/page.tsx` 24–47): overview, evals, search, utilization, **combo-health**, compression, **route-trace**.

**Observe** (`observeHub.ts`): activity / request / proxy / console / audit / mcp / a2a streams on `/dashboard/activity?source=`.

| Topic | Analytics | Observe | Same? |
|-------|-----------|---------|-------|
| Combo health | Aggregate health/forecast/scoring UI | No | **No** |
| Route-trace | Explainability of a request (`?tab=route-trace&id=`) | Request **logs** stream | Adjacent, different UX |
| Cache | Not an Analytics tab; own route `/dashboard/cache` | No | N/A |
| Logs/audit | No | Yes | Observe only |

**PARTIAL**: operator may *feel* “health” lives in both places (Analytics combo-health vs Observe/Health). Code keeps **metrics dashboards** on Analytics and **event streams** on Observe (+ `/dashboard/health` as peer with Observe subnav per Task 0061).

#### B7 — Cache route role

- `/dashboard/cache` — semantic/prompt cache **stats**, entries, trends, reasoning cache (analytics/ops of caching).  
- Discovered via **DashboardTopbar** and hideable id `cache` — **not** primary sidebar, **not** Operations hub.  
- `/dashboard/cache/media` — **media generation lab** (image/video/music/speech), documented legacy path in `testingHub.ts` 90–93.

**CONFIRMED**: cache root is observability/efficiency analytics, **not** routing control. Media child is a lab mis-parented under `/cache/`.

---

### C. Operations hub

#### C1 — Option A: cards only, no topbar

```7:11:src/app/(dashboard)/dashboard/operations/OperationsHubClient.tsx
/**
 * Operations hub landing page (Task 0059 Option A).
 * Discovers API keys, endpoints/protocols, agents, and integrations via
 * grouped link cards — does not embed heavy page content.
 */
```

No `PageTabBar`, no `HUB_SUBNAV_*`, no layout-level strip under `operations/`. Destination pages (api-manager, cli-code, …) have **no reverse “Operations” chrome**. Wave2 residual already classified this as intentional hub-only UX.

#### C2 — CLI Agents vs CLI Code

**Schema** (`cliCatalog.ts` 3–4): `category: z.enum(["code", "agent"])`.

**Pages**:

| Page | Filter |
|------|--------|
| `/dashboard/cli-code` | `category === "code" && baseUrlSupport !== "none"` |
| `/dashboard/cli-agents` | `category === "agent"` |

Examples: Cursor = `code`; Goose / Open Interpreter / Warp / Agent Deck / Open Claw = `agent`. Hermes is dual-entry (`hermes` code guide vs `hermes-agent` agent) — comments in `cliTools.ts` 317–319.

**PARTIAL vs operator wording**:

- Split is **real in code**.  
- It is **not** strictly “coding tools vs broad tools” — both are CLI integration catalogs filtered by catalog taxonomy. Overlap in user mind (coding agents that are `agent` vs IDE CLIs that are `code`) is **PRODUCT-DECISION** copy/IA, not a false dual page.

**REJECT** naive merge of the two routes without re-taxonomy work (large catalog + detection matrix).

#### C3 — acp-agents vs a2a vs agent-bridge

| Surface | href | Purpose (from code) |
|---------|------|---------------------|
| **A2A Server** | `/dashboard/a2a` | Agent-to-Agent **protocol server** toggle + `A2ADashboard` (JSON-RPC / skills tasks) |
| **ACP Agents** | `/dashboard/acp-agents` | **Agent Communication Protocol registry** — detect installed agent binaries, custom agents (`/api/acp/agents`) |
| **Agent Bridge** | `/dashboard/tools/agent-bridge` | **MITM interop** — spoof targets, cert trust, model mappings for external agents |

These are **distinct stacks**. Naming similarity (ACP / A2A / Agent) is a **discoverability/copy** problem, not functional redundancy.

Cross-link: ACP page links to CLI Code setup (`acp-agents/page.tsx` ~200).

**FALSE** that they are the same feature thrice. **PARTIAL** that operators will confuse them.

#### C4 — Testing under Integrations

Already evidenced in A3. Group order in Operations:

1. API / Endpoints (5 links)  
2. Agents (5 links)  
3. Integrations / Tools (6 links, **Testing last**)

---

### D. URL IA

#### D1 — Chaos examples (live)

| URL | What users get | Why chaotic |
|-----|----------------|-------------|
| `/dashboard/cache/media` | Media **lab** (generate image/video/music/speech) | Parent path says “cache” |
| `/dashboard/cache` | Cache **analytics** | Sibling of media lab; different product job |
| `/dashboard/analytics?tab=combo-health` vs nested redirects | Single shell + `?tab=` | Good SSoT (anti dual-nav) |
| `/dashboard/activity?source=request` vs old `/dashboard/logs` | Observe hub | Redirect matrix OK; dual-form bookmarks remain |
| `/dashboard/settings/general` vs legacy `?tab=` | Path-based Settings hub | Soft dual-form (wave2 §4.2) |
| `/home` vs label “Dashboard” | Primary leaf `i18nKey: "dashboard"` | Doc says Home/cockpit; chrome says Dashboard |

Media path is **documented** as intentional legacy in `testingHub.ts` 90–93 — still bad for URL literacy.

#### D2 — Feasibility of `/hub/tab` or `?tab=` SSoT

**Already live patterns**:

| Pattern | Where | File impact if standardized |
|---------|-------|-----------------------------|
| Single route + `?tab=` + `PageTabBar` | Analytics | Low for analytics (done); model for others |
| Path segments + shared layout tab bar | Settings (`settings/layout.tsx`) | Medium — already migrated |
| Path segments + per-page Link subnav | Costs, Providers, Routing, Observe | Medium — style SSOT exists (`hubSubnavStyles.ts`) |
| Card hub only | Operations, Testing | High if converting to tabs (every peer page needs strip or query map) |
| One-way topbar on home only | DashboardTopbar | Medium — either remove, or mount on peers, or fold into Analytics |

**Opinion (reviewer, not implement)**:

1. **Do not** invent a third pattern (`/hub/tab` path literal) if `?tab=` (Analytics) and path-subnav (Settings/Costs) already work. Pick **one per hub class**.  
2. **High value / lower risk**: rename or redirect `/dashboard/cache/media` → e.g. `/dashboard/testing/media` or `/dashboard/media` with permanent redirect (Testing hub + palette + Header matchers).  
3. **Medium value / high risk**: force Operations/Testing onto `?tab=` — every deep link, e2e, and hideable id would churn; Option A was deliberate. Prefer reverse subnav **on destinations** over collapsing 16+ ops routes into one page.  
4. **File impact estimate** for a full “all hubs `?tab=` SSoT” (order of magnitude, not a plan):  
   - Constants: `operationsHub.ts`, `testingHub.ts`, possibly new `*Hub.ts`  
   - ~15–25 route files under `operations` destinations if reparented  
   - `CommandPalette.tsx`, Header title matchers, tests under `tests/unit/ui/*0059*/*0060*`  
   - i18n keys + NAV docs  
   → **large** (multi-task epic), not a drive-by.

---

## 3. Recommended future EPIC scope (INCLUDE / DEFER / REJECT)

> Explicit: **do not create tasks** from this list. Tags are PRD guidance only.

### INCLUDE (high signal for a future IA PRD)

| ID | Finding | Rationale |
|----|---------|-----------|
| I-1 | Raise **Testing** discoverability without new primary leaves | Operator pain is real; 0060 intentionally hid labs; bury under Integrations last is harsh |
| I-2 | Fix **URL literacy**: `/dashboard/cache/media` → media lab path + redirect | Confirmed chaos; small, high clarity |
| I-3 | **Costs** IA copy: mark Budget/Pricing/Quota Share as governance/config vs Overview analytics | Confirmed mixed hub; cheap if copy-only |
| I-4 | Clarify **API-key health** vs **OAuth TokenHealthBadge** + toast “session” semantics | PARTIAL session claim; no notification center |
| I-5 | **ACP / A2A / Agent Bridge** grouping/copy under Operations Agents | Distinct code; confused names |

**Non-goals for INCLUDE**: adding Playground/Translator/Search Tools as primary leaves.

### DEFER

| ID | Finding | Rationale |
|----|---------|-----------|
| D-1 | Operations/Testing reverse subnav on destination peers | Intentional Option A; wave2 residual; product must want hub permanence |
| D-2 | Global `?tab=` / path SSoT migration | Large surface; partial SSoT already exists |
| D-3 | Home content redesign (topology vs usage pulse) | PRODUCT-DECISION; needs product brief |
| D-4 | Merge Analytics combo-health with Observe/Health | Different jobs; only if metrics product unifies |
| D-5 | Cache primary discovery (topbar-only today) | Real gap; lower than Testing bury for many operators |

### REJECT

| ID | Finding | Rationale |
|----|---------|-----------|
| R-1 | Add Playground / Translator / Search Tools as default primary leaves | Violates UI.md §1 invariant #1 + 9-leaf product budget spirit |
| R-2 | Merge CLI Code + CLI Agents pages “because both are tools” | Real `code`/`agent` catalog taxonomy; merge needs re-taxonomy epic |
| R-3 | Delete A2A or ACP or Agent Bridge as “duplicates” | Distinct protocols/MITM; would remove features |
| R-4 | Treat TokenHealthBadge as already covering API-key toasts | Wrong data domain (OAuth tokens vs connection apiKeyHealth) |

---

## 4. Cross-cutting observations (PRD context)

1. **Intentional hiding vs accidental burial**  
   Labs are intentionally absent from sidebar (`testingHub.ts` header). Burial under Operations → Integrations → Testing is the **operational** problem. PRD should separate “no primary leaf” (keep) from “one hop from Operations” (improve).

2. **Home is not a metrics dashboard**  
   Default home = updates + quick start + topology. Provider cards dead. Quota opt-in. Gamification topbar is the “social-ish” noise. Any “make home useful” work is content strategy, not sidebar math.

3. **Three notification primitives, no center**  
   - Ephemeral toast store  
   - OAuth TokenHealthBadge  
   - Home-only API-key health effect  
   Unifying them is a product feature, not a bugfix.

4. **Wave2 residual still true**  
   Operations/Testing hub-only chrome; DashboardTopbar one-way. This verification does not reopen dual-nav regressions that were already fixed for Analytics/Settings.

5. **Budget math cheat-sheet for PRD authors**

   | Change | Leaves after | OK? |
   |--------|--------------|-----|
   | Status quo | 9 | Yes |
   | + Testing primary | 10 | Stretch; needs IA epic note |
   | + three labs | 12 | No |
   | Collapse Costs into Analytics | 8 | Allowed by budget; product may not want |

---

## 5. Evidence index (path:line anchors)

| Topic | Anchor |
|-------|--------|
| No-new-leaf invariant | `docs/guides/UI.md:22-24` |
| 9 primary hubs table | `docs/guides/UI.md:52-61` |
| PRIMARY_SIDEBAR_ITEMS | `src/shared/constants/sidebarVisibility.ts:344-425` |
| DEVTOOLS empty | `src/shared/constants/sidebarVisibility.ts:333-334` |
| Hideable testing/labs | `src/shared/constants/sidebarVisibility.ts:92-96` |
| Operations groups + Testing link | `src/shared/constants/operationsHub.ts:31-169` |
| Testing hub labs | `src/shared/constants/testingHub.ts:1-113` |
| Ops hub card-only UI | `src/app/(dashboard)/dashboard/operations/OperationsHubClient.tsx:7-71` |
| Testing hub card-only UI | `src/app/(dashboard)/dashboard/testing/TestingHubClient.tsx:7-80` |
| Palette testing extras | `src/shared/components/CommandPalette.tsx:257-340` |
| Home mount + topbar | `src/app/(dashboard)/home/page.tsx:18-24` |
| DashboardTopbar links | `src/app/(dashboard)/home/DashboardTopbar.tsx:22-65` |
| Topology default ON | `src/app/(dashboard)/dashboard/homeAppearance.ts:16-17` |
| API-key toast effect | `src/app/(dashboard)/dashboard/HomePageClient.tsx:337-421` |
| Quota pin default off | `src/app/(dashboard)/dashboard/HomePageClient.tsx:201-203` |
| TokenHealthBadge | `src/shared/components/TokenHealthBadge.tsx:50-148` |
| Toast store (no center) | `src/store/notificationStore.ts` + `NotificationToast.tsx:145-183` |
| Costs subnav | `src/app/(dashboard)/dashboard/costs/CostsSubnav.tsx:23-48` |
| Analytics tabs | `src/app/(dashboard)/dashboard/analytics/page.tsx:24-47` |
| Observe sources | `src/shared/constants/observeHub.ts:7-33` |
| CLI category enum | `src/shared/schemas/cliCatalog.ts:3-4` |
| CLI Code filter | `src/app/(dashboard)/dashboard/cli-code/CliCodePageClient.tsx:15-17` |
| CLI Agents filter | `src/app/(dashboard)/dashboard/cli-agents/CliAgentsPageClient.tsx:25-28` |
| Media legacy path note | `src/shared/constants/testingHub.ts:89-95` |
| 9-leaf unit contract | `tests/unit/ui/sidebar-flat-primary-nav.test.ts:19-20` |

---

## 6. Explicit non-actions

- **No tasks** created or updated.  
- **No product code** changed.  
- **No** recommendation to touch production `:21000`.  
- This document is **PRD-ready evidence** only; campaign workflows must open a separate epic/plan before any implementation.

---

## 7. One-paragraph PRD seed (if product later prioritizes)

> **Problem**: After Epic 0005 flat-nav (9 leaves), high-frequency **labs** (Playground, Translator, Search Tools) and the **Testing** hub are discoverable only via Operations → Integrations → Testing, command palette, or direct URL — by design of Task 0060, but costly for operators. Home is a **cockpit** (updates, topology, quick start, gamification topbar) not a metrics home; Costs mixes **analytics** (Overview) with **governance config** (Budget/Pricing/Quota Share); API-key unhealthy alerts are Home-only ephemeral toasts unrelated to OAuth TokenHealthBadge.  
> **Non-goals**: New primary leaves for individual labs; merging CLI Code/Agents without catalog re-taxonomy; deleting A2A/ACP/Agent Bridge.  
> **Candidate outcomes**: (1) Testing one hop from Operations or primary stretch leaf with epic note; (2) media URL un-legacy; (3) Costs tab semantics; (4) unified health notification model — **pending product priority, not auto-scheduled.**
