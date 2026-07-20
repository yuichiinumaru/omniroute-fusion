# Wave 2 — Frontend IA residual investigation

> **Agent**: gt-frontend-quality-reviewer (adversarial residual probe)  
> **Date**: 2026-07-19  
> **Scope**: H-PRODUCT-007 / H-PRODUCT-008 / H-FUSION-010 + builder learnings 0009 U1/U2 patterns  
> **Method**: Source SSoT + hub mount matrix + dual-nav greps + unit-test contract inspection  
> **Constraint**: Report only under `docs/reports/audits/` — no product code changes, no git ops, no :21000 touch

---

## 1. Executive summary

| Hypothesis | Verdict | Severity if true | One-line |
|------------|---------|------------------|----------|
| **H-PRODUCT-007** | **PARTIAL / EXTERNAL** | Ops P2 | Tree IA is 9-leaf and matches docs; live **:21000 deploy lag** is not disproven by source and is not a code residual |
| **H-PRODUCT-008** | **CONFIRMED (scoped)** | Product UX P2 | Peer-route chrome is **not** uniformly broken; Settings/Costs/Providers/Observe/Analytics are healthy. Residual gaps: **Routing editor/deep peers**, **DashboardTopbar one-way**, **Operations/Testing hub-only (no reverse strip)** |
| **H-FUSION-010** | **CONFIRMED** | Product UX P3 | Fusions list shows strategy + panel count only; **acting unit is editor-only** |
| **0009 U1** (peer-route mount matrix) | **PARTIAL — still present** | Process P1 | Matrix tests exist for some hubs (0054/0056/0057/0058/0061); **missing** for Ops/Testing reverse chrome and Routing editor peers |
| **0009 U2** (HUB_SUBNAV SSOT + absence tests) | **PARTIAL — code OK, harness incomplete** | Process P2 | `hubSubnavStyles` is live SSOT for several strips; Ops/Testing have **no** subnav primitive; harness project-specifics still lack OmniRoute (prior harness audit) |

**Bottom line:** Successor IA (0052–0061) largely fixed the 2026-07-12 “hubs without tabbars” catastrophe for Settings and several peer strips. Residual risk is **one-way hubs** and **deep editor routes that drop hub chrome** — the same phantom-completion class 0009 §2.1 named — plus a small fusion list discoverability gap.

---

## 2. Authority / SSoT checked

| Surface | Path | Role |
|---------|------|------|
| IA rules + primary chrome table | `docs/guides/UI.md` §1–2, anti-patterns §3 | No-new-leaf, 9 hubs, dual-nav ban |
| Live sidebar | `src/shared/constants/sidebarVisibility.ts` → `PRIMARY_SIDEBAR_ITEMS` | 9 ids; `DEVTOOLS_ITEMS = []` |
| Settings hub | `src/shared/constants/settingsHub.ts` + `settings/layout.tsx` | 10-tab PageTabBar, path-based (not `?tab=` chrome) |
| Operations hub | `operationsHub.ts` + `OperationsHubClient.tsx` | Card hub, no peer layout |
| Testing hub | `testingHub.ts` + `TestingHubClient.tsx` | Card hub; labs absent from all sidebar |
| Observe | `observeHub.ts` + `ObserveHubSubnav.tsx` | `?source=` + Health peer page |
| Routing strip | `RoutingHubSubnav.tsx` | Combos / Fusions / Live / Compression Settings / Studio |
| Hub style SSOT | `hubSubnavStyles.ts` | `HUB_SUBNAV_*` used by PageTabBar `variant=subnav`, Routing, Observe, Costs, Providers, DashboardTopbar |
| Learnings | `docs/tasks/00-planning/0009-…-learnings.md` §2.1, §4 U1/U2 | Phantom hub topbar pattern |
| Prior fusion residual | `docs/reports/audits/2026-07-19-omniroute-architect-fusion-residual-audit.md` H-FUSION-010 | List acting parity |

---

## 3. Peer-route mount matrix (live HEAD)

### 3.1 Hubs with **good** multi-route chrome

| Hub | Chrome | Mount strategy | Peer coverage | Tests |
|-----|--------|----------------|---------------|-------|
| **Settings** | `PageTabBar` `variant="subnav"` | **Shared `settings/layout.tsx`** wraps all `settings/*` | All 10 `SETTINGS_TABS` (pricing excluded → costs redirect) | `settings-hub-tabnav-0054.test.ts`, `observe-settings-ia-gaps-0061.test.ts`, `settings-ui-layout-static.test.ts` |
| **Costs** | `CostsSubnav` | Per-page import | overview + budget + pricing + quota-share | `dashboard-ia-consolidation-0056.test.ts` asserts all four `<CostsSubnav` |
| **Providers** | `ProvidersTopBar` + `PROVIDERS_TOPBAR_PATHS` | Per-page `currentPath` | 7 peers including free-tiers, free-rankings, runtime, quota, services, stats | `provider-connections-ui-regression.test.ts` peer matrix (Task 0057) — **best-in-class anti-phantom test** |
| **Observe** | `ObserveHubSubnav` | Activity hub for streams; Health page mounts same strip | 7 `?source=` streams on one route + `/dashboard/health` | `observe-settings-ia-gaps-0061.test.ts` |
| **Analytics** | `PageTabBar` + `?tab=` | Single hub page | Nested `/analytics/{evals,search,…}` **redirect** to `?tab=` | Dual-nav retired comments on nested pages; no competing shell |

### 3.2 Hubs with **intentional hub-only** chrome (documented residual)

| Hub | Chrome on landing | Chrome on destination peers | Design note |
|-----|-------------------|-----------------------------|-------------|
| **Dashboard / Home** | `DashboardTopbar` (7 high-level links) | **None** on analytics/costs/cache/tokens/leaderboard/profile | Task **0056** return review **F3**: “hub-only topbar — By design; only `home/page.tsx` imports `DashboardTopbar`”. Tests assert **home mount only**, not peers. |
| **Operations** | Card grid (`OperationsHubClient`) | **No** Operations subnav / back-strip on api-manager, mcp, cli-code, webhooks, … | Task **0059** Option A: discoverability hub only. Tests assert hub href inventory + deep pages exist; **do not** assert reverse chrome. |
| **Testing** | Card grid (`TestingHubClient`) | **No** Testing subnav on playground / translator / batch / plugins / … | Task **0060** Option A. Tests assert lab **absence** from sidebar + hub/palette discovery; **do not** assert reverse chrome. |

These are **not** dual-nav regressions. They **are** the 0009 U1 “topbar exists on primary page, peers lose chrome” UX class when the product intent was “hub as L1 forever,” not “launchpad then orphan.”

### 3.3 Routing hub — **PARTIAL** peer matrix (confirmed gap)

| Route | `RoutingHubSubnav`? | Notes |
|-------|---------------------|-------|
| `/dashboard/combos` | ✅ `active="combos"` | Primary Routing leaf |
| `/dashboard/fusions` | ✅ `active="fusions"` | List only |
| `/dashboard/combos/live` | ✅ `active="live"` | Tested 0058 |
| `/dashboard/context/settings` | ✅ `active="compression-settings"` | Tested 0058 |
| `/dashboard/compression/studio` | ✅ `active="compression-studio"` | Tested 0058 |
| `/dashboard/fusions/new` | ❌ | `FusionEditorClient` only; Back → list |
| `/dashboard/fusions/[id]` | ❌ | Same editor shell |
| `/dashboard/combos/[id]` | ❌ | Control center; Back → Combos text link |
| `/dashboard/combos/playground` | ❌ | Playground; link to combos only |
| Standalone `context/{engine}` pages | ❌ | Engine routes still exist; settings embeds engines when enabled |

**Evidence:** `rg RoutingHubSubnav` under `dashboard/fusions` hits **only** `fusions/page.tsx`. `FusionEditorClient` mounts units/triggers/tuning + Back button, not hub strip. Routing unit tests assert the five top-level mounts only (`routing-hub-discoverability-0025.test.ts`) — **no sabotage test that editor routes must keep the strip**.

### 3.4 PageTabBar adoption (post-0054 reality)

| Surface | Uses PageTabBar? |
|---------|------------------|
| Settings layout | Yes (`variant=subnav`) |
| Analytics hub | Yes (`syncSearchParam="tab"`) |
| Costs / Providers / Routing / Observe / Dashboard strips | Link-subnav (not PageTabBar) — acceptable if `HUB_SUBNAV_*` |
| Operations / Testing | No tab bar (card hub) |

The July-12 UX investigation claim “Settings has zero PageTabBar” is **stale** after Task 0054.

---

## 4. Dual-nav residual greps

### 4.1 Analytics (anti-pattern retired) — **FALSE residual**

Nested routes under `dashboard/analytics/{evals,search,utilization,combo-health,compression}/page.tsx` only `redirect("/dashboard/analytics?tab=…")` with “Dual-nav retired” comments. Single shell + `?tab=` matches UI.md ban list.

### 4.2 Settings path vs legacy `?tab=` — **PARTIAL soft dual-form**

| Form | Status |
|------|--------|
| Canonical chrome | Path segments via `settingsHub` + layout PageTabBar (`syncSearchParam={false}`) |
| Hub root `/dashboard/settings?tab=X` | Redirect map in `settings/page.tsx` (incl. access-tokens aliases) |
| Stale deep links | Still hardcoded: `403/page.tsx` → `settings?tab=security`; `429/page.tsx` → `settings?tab=resilience`; `acp-agents/page.tsx` → `settings?tab=routing`; e2e resilience/error-pages still hit `?tab=` |

**Verdict:** Not competing chrome (redirect works). Residual **bookmark dual-form** + test/error-page copy lag. Low severity; clean by pointing links at `buildSettingsPath(...)`.

### 4.3 Connect / catalog dual-home — **FALSE residual (guarded)**

`operationsHub.ts` uses `CONNECT_CATALOG_SSOT_HREF` and comments forbid re-listing retired `/dashboard/api-endpoints`. Unit tests assert hub does not dual-home catalog (0059 suite).

### 4.4 Doc dual-nav / inventory drift — **PARTIAL**

| Doc claim | Live code |
|------------|-----------|
| UI.md §2.1 Home / cockpit | `PRIMARY_SIDEBAR_ITEMS[0]` `labelFallback: "Dashboard"`, `i18nKey: "dashboard"` |
| NAV-TREE-TARGET §2 “Debug-only: translator, playground, search-tools” | `DEVTOOLS_ITEMS = []`; 0060 absence tests pass |
| NAV-TREE-TARGET Home label “Home” | Live: Dashboard |

Docs lag is the 0009 §2.2 class, not a nav double-render.

---

## 5. Hypothesis verdicts (detail)

### H-PRODUCT-007 — IA deploy lag :21000 vs :22000

**Verdict: PARTIAL / EXTERNAL**

| Check | Result |
|-------|--------|
| Source `PRIMARY_SIDEBAR_ITEMS.length` / ids | **9**: home, providers, combos, activity, analytics, costs, operations, settings-general, docs — matches UI.md §2.1 |
| Operations / Testing / Settings hubs present in tree | Yes |
| Live HTML proof on :21000 vs :22000 | **Not executed** (prod ban; prior 0056 review already recorded :22000 image lag as EXTERNAL F2) |

**Interpretation:** If operators still see pre-0059 primary chrome on **:21000**, that is a **deploy/build promotion** problem (same family as Task 0036 dual-mode auth hold), not an incomplete IA tree in workspace HEAD. Source residual for H-PRODUCT-007 is **false**; ops residual remains **unfalsified without read-only live dump**.

**Suggested probe (operator-gated, read-only):** Compare served sidebar inventory / bundle SHA on 22000 vs 21000 after canary promote — never mutate 21000 from builders.

---

### H-PRODUCT-008 — Successor IA (0052–0061) peer-route / dual-nav residual

**Verdict: CONFIRMED (scoped)** — not a wholesale dual-nav reintroduction.

#### Confirmed residual issues

| ID | Finding | Evidence | Severity |
|----|---------|----------|----------|
| **R-IA-01** | Routing **editor** peers drop `RoutingHubSubnav` | `fusions/page.tsx` only; `FusionEditorClient` no import | P2 |
| **R-IA-02** | Combo control-center / playground drop Routing strip | `combos/[id]`, `combos/playground` no `RoutingHubSubnav` | P3 |
| **R-IA-03** | DashboardTopbar one-way from `/home` | Only `home/page.tsx` mounts; 0056 F3 by design | P3 UX (accepted residual unless product reopens) |
| **R-IA-04** | Operations destinations have no reverse hub strip | No `OperationsHubSubnav`; no “Back to Operations” in api-manager etc. | P2 UX for deep operators |
| **R-IA-05** | Testing destinations have no reverse hub strip | Same for playground/translator/… | P2 for labs after 0060 sidebar purge |
| **R-IA-06** | Soft dual-form Settings `?tab=` links on error/ACP pages | 403/429/acp-agents + e2e | P3 |

#### Explicitly healthy (do not re-open as phantom failures)

| Area | Why |
|------|-----|
| Settings peer tabs | Shared layout PageTabBar + settingsHub SSoT |
| Costs 4-leaf strip | Mounted + tested |
| Providers 7-path strip | Mounted + `currentPath` matrix tested (U1 gold pattern) |
| Observe streams + Health | Subnav + health active state tested |
| Analytics dual-nav | Nested → redirect |
| Lab absence from sidebar | DEVTOOLS empty + 0060 absence suite |

#### Dual-nav competing chrome?

**No** evidence of simultaneous sidebar leaf + nested peer shell for Analytics, Settings, Observe streams, or compression engines as default primary leaves. Residual is **missing reverse chrome**, not **double chrome**.

---

### H-FUSION-010 — Fusions list does not show acting unit

**Verdict: CONFIRMED**

| Surface | Acting? |
|---------|---------|
| Editor `FusionUnitsSections` | Yes — card `data-testid="fusion-acting"`, copy for miss-path / final voice |
| Types `FusionEditorForm.acting` / `ComboRecord.acting` | Yes |
| Runtime/tests `fusion-acting.test.ts` | Yes (resolve + handoff) |
| **List** `fusions/page.tsx` | **No** — local `FusionCombo` type omits `acting`; cards render strategy badge + `panelCount(models)` only |

```text
List card affordances today:
  name · description · strategy badge · "N panel model(s)" · Edit / Delete
Missing vs editor:
  acting configured? · acting label · trigger mode · judge summary
```

**Severity:** P3 discoverability / ops parity (architect residual already filed). Not a runtime correctness bug.

**Minimal product fix shape (out of scope for this report):** extend list type + optional badge “Acting” / short unit label when `combo.acting` present; unit test that list source includes `acting` field path.

---

## 6. Builder learnings 0009 U1 / U2 — still present?

### U1 — IA contract matrix (peer routes × mount × active style)

| Hub family | Matrix test? | Pattern quality |
|------------|--------------|-----------------|
| Providers (0057) | **Yes** — explicit peers × `currentPath` | Gold template for U1 |
| Costs (0056) | Yes — four pages | Good |
| Settings (0054) | Layout + SETTINGS_TABS order | Good (layout-based) |
| Routing (0025/0058) | Top-level five only | **Incomplete** vs editor/deep peers |
| Observe (0061) | Hub + health | Good for intended L1 |
| Operations (0059) | Hub inventory + deep pages exist | **No reverse-chrome contract** |
| Testing (0060) | Hub inventory + sidebar absence | **No reverse-chrome contract** |
| DashboardTopbar (0056) | Home only (intentional) | Encodes hub-only, not full peer matrix |

**Verdict:** U1 failure mode **still reproduces** on Routing deep routes and Ops/Testing reverse discovery. Institutionalization incomplete (matches harness audit H-HARNESS-11).

### U2 — Nested controls; `HUB_SUBNAV_*`; absence tests

| Item | Status |
|------|--------|
| `hubSubnavStyles` SSOT | **Present** and consumed by Routing / Observe / Costs / Providers / PageTabBar subnav / DashboardTopbar |
| White-on-primary ban | Providers regression asserts no `bg-primary text-white` on topbar |
| Absence tests for removed nav | **Strong** for labs (0060 DEVTOOLS empty + hideable retained) |
| Operations/Testing subnav SSOT | **Absent** (by Option A) |
| OmniRoute `frontend-quality-harness` project-specifics | Prior harness audit: **cyberneticscore only** — process residual |

**Verdict:** Product code partially internalized U2; harness packaging of U2 still lagging.

---

## 7. Extra issues found (beyond named hypotheses)

| ID | Issue | Severity | Notes |
|----|-------|----------|-------|
| **X1** | `NAV-TREE-TARGET.md` still claims debug sidebar labs | P3 docs | Conflicts 0060 / empty `DEVTOOLS_ITEMS` |
| **X2** | UI.md / NAV-TREE “Home” vs live “Dashboard” label | P3 docs | `i18nKey: dashboard` after 0056 |
| **X3** | Compression combos (`/dashboard/context/combos`) not in `RoutingHubSubnav` | P3 | Reachable via compression settings / hideable; not strip peer |
| **X4** | Media providers use own kind nav, not ProvidersTopBar | P3 | Separate product surface; not on `PROVIDERS_TOPBAR_PATHS` |
| **X5** | No dashboard-level `layout.tsx` for Routing/Ops (only Settings has hub layout) | P3 architecture | Per-page mounts increase drift risk (seen on fusions editor) |
| **X6** | Tests still encode “deep page exists” more than “chrome continuous” for Ops/Testing | P2 process | Exact 0009 checkbox-without-sabotage pattern |

---

## 8. Recommended disposition (no new tasks invented here)

Architect/orchestrator may promote these to tasks; this report only ranks.

| Priority | Action class | Target residual |
|----------|--------------|-----------------|
| P2 | Product polish (optional IA slice) | Mount `RoutingHubSubnav` on fusion editor + combo control-center (or shared `fusions/layout.tsx` / routing layout) + unit matrix test |
| P2 | Product polish | Ops/Testing reverse strip **or** explicit “Back to hub” + palette-only acceptance documented in UI.md |
| P3 | Product polish | H-FUSION-010 list acting badge |
| P3 | Docs-only | NAV-TREE-TARGET + UI.md Home/Dashboard + debug labs line |
| P3 | Link hygiene | Replace error/ACP `settings?tab=` with `buildSettingsPath` |
| P1 process | Harness | Institutionalize U1 template from Providers 0057 peer matrix; add OmniRoute frontend project-specifics (U2 home) |
| EXTERNAL | Ops | H-PRODUCT-007 live sidebar dump after promote — with 0036, not as tree rewrite |

**Do not** re-open completed 0054–0061 without a failing matrix assertion for a **new** finding ID.

---

## 9. Evidence index (paths inspected)

- `docs/guides/UI.md`
- `docs/architecture/NAV-TREE-TARGET.md` (live chrome section)
- `docs/tasks/00-planning/0009-builder-wave-2026-07-18-review-loop-learnings.md`
- `docs/reports/audits/2026-07-19-architect-product-epics-status-audit.md` (H-PRODUCT-007/008)
- `docs/reports/audits/2026-07-19-omniroute-architect-fusion-residual-audit.md` (H-FUSION-010)
- `docs/reports/reviews/2026-07-18-task-0056-dashboard-ia-consolidation-return-review.md` (F3 hub-only topbar)
- `src/shared/constants/sidebarVisibility.ts` (`PRIMARY_SIDEBAR_ITEMS`, `DEVTOOLS_ITEMS`)
- `src/shared/constants/{settingsHub,operationsHub,testingHub,observeHub,hubSubnavStyles}.ts`
- `src/app/(dashboard)/dashboard/settings/layout.tsx`
- `src/app/(dashboard)/dashboard/{operations,testing,fusions,activity,costs,analytics,providers}/**`
- `src/app/(dashboard)/home/DashboardTopbar.tsx` + `home/page.tsx`
- `src/app/(dashboard)/dashboard/fusions/{page.tsx,FusionEditorClient.tsx,FusionUnitsSections.tsx,fusionEditorTypes.ts}`
- Unit: `tests/unit/ui/{dashboard-ia-consolidation-0056,settings-hub-tabnav-0054,observe-settings-ia-gaps-0061,operations-hub-discoverability-0059,testing-hub-discoverability-0060,routing-hub-discoverability-0025}.test.ts`
- Unit: `tests/unit/provider-connections-ui-regression.test.ts` (Providers peer matrix)

---

## 10. Verdict scorecard

```text
H-PRODUCT-007  PARTIAL/EXTERNAL   source tree OK; live deploy lag unproven here
H-PRODUCT-008  CONFIRMED scoped   reverse-chrome + Routing editor gaps; dual-nav core false
H-FUSION-010   CONFIRMED          list omits acting display
0009 U1        STILL PRESENT      incomplete matrices (esp. Routing deep + Ops/Testing reverse)
0009 U2        PARTIAL            HUB_SUBNAV live; harness packaging lag
```

**Adversarial confidence:** High on source-level claims; Medium on operator-facing severity of hub-only Ops/Testing (may be intentional Option A still preferred). Low on :21000 HTML without live probe.
)
