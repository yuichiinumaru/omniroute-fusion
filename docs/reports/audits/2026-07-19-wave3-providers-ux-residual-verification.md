# Wave 3 — Providers operator UX residual verification

> **Agent**: gt-frontend-quality-reviewer (providers slice)  
> **Date**: 2026-07-19  
> **Scope**: Residual claims for Providers operator UX (cards density, auth-mode flags, sort, favorites, provider-pools, free-tier flags)  
> **Method**: Source SSoT only — list page, `ProviderCard`, `ProviderListRow`, sort controls, model rows, routes/redirects  
> **Constraint**: Report only under `docs/reports/audits/` — no product code edits, no git ops, no :21000 touch

---

## 1. Executive summary

| # | Residual claim | Verdict | Confidence | EPIC-15 disposition |
|---|----------------|---------|------------|---------------------|
| 1 | Cards still “jungle” — too large, separators, not compact | **PARTIAL residual** | High | **INCLUDE** (scoped density pass) *or* **DEFER** if list-mode is accepted default for power ops |
| 2 | Auth mode flags (oauth / apikey / web-cookie) missing unified flags | **FALSE residual** — present | High | **DEFER / close as shipped** |
| 3 | Sort by account count / preferred models | **PARTIAL** — accounts **exists**; preferred models **missing** | High | Accounts: **close**. Preferred: **INCLUDE** only if favorites ship first |
| 4 | Favorite model button (global by model name, p↔. alias) | **CONFIRMED gap** — missing | High | **INCLUDE** as new feature slice (not a regression fix) |
| 5 | provider-pools page gone/redirect/broken | **GONE** (no route, no redirect) — not a live broken peer | High | **DEFER** unless bookmarks/docs still point there |
| 6 | free-tier flags | **FALSE residual** — present at catalog + UI + peer pages | High | **DEFER / close as shipped** |

**Bottom line:** Several “residual” claims are **already implemented** (auth-mode indicators, sort-by-accounts, free-tier signals, list/grid display modes). The durable open product gaps are **global favorite models** (and any sort/filter that depends on them) plus an optional **grid density / section-jungle** polish. Doc claim “favorites = Live” in `NAV-TREE-TARGET.md` is **overstated**.

---

## 2. Surfaces inspected

| Surface | Path |
|---------|------|
| Providers hub | `src/app/(dashboard)/dashboard/providers/page.tsx` |
| Card | `…/providers/components/ProviderCard.tsx` |
| List row | `…/providers/components/ProviderListRow.tsx` |
| Summary / filters / sort | `…/providers/components/ProviderSummaryCard.tsx` |
| Display mode | `…/providers/components/ProviderDisplayModeControl.tsx`, `providerPageStorage.ts` |
| Sort helpers | `…/providers/providerPageUtils.ts` (`ProviderSortMode`) |
| Auth-status adapters | `src/shared/utils/connectionStatusPresentation.ts` |
| Category / free dots | `…/providers/components/CategoryDot.tsx` |
| Model row / toolbar | `…/providers/[id]/components/ModelRow.tsx` |
| Peer topbar | `…/providers/components/ProvidersTopBar.tsx` |
| Free tiers peer | `…/free-tiers/page.tsx` |
| IA target (doc) | `docs/architecture/NAV-TREE-TARGET.md` L0·2 Providers |
| Redirects | `next.config.mjs` `redirects()` — no `provider-pools` entry |
| Route tree | No `dashboard/provider-pools` under `src/app/(dashboard)/dashboard/` |

---

## 3. Claim-by-claim verdicts

### 3.1 Cards still “jungle” — too large, separators, not compact?

**Verdict: PARTIAL residual (density improved, grid default still section-heavy)**

**What shipped (mitigations already in tree):**

| Control | Evidence |
|---------|----------|
| Grid vs List display mode | `ProviderDisplayModeControl` — modes `grid` \| `list`; legacy `compact` migrates → `list` (`providerPageStorage.ts`) |
| Compact list rows | `ProviderListRow`: single horizontal row, `px-3 py-2.5`, account count, status chips; list stack `gap-1.5` |
| Card padding already small | `ProviderCard` → `Card padding="xs"` (`p-3` in `Card.tsx`) |
| Configured-only filter | Independent chip on summary card (not conflated with display mode after migration) |

**What still feeds the “jungle” perception (grid default):**

| Pattern | Evidence |
|---------|----------|
| Multi-section grid | `page.tsx` renders many category blocks (`compatible`, `oauth`, `ide`, `apikey` families, `web-cookie`, search, audio, local, …) each as `flex flex-col gap-4` with **h2 + description + action buttons + card grid** |
| Card internal chrome | `ProviderCard` is **3 rows**: identity · capability chips · footer with `border-t border-border/40` + multi-badge status + toggle + Test |
| Summary chrome separators | `ProviderSummaryCard` uses multiple `border-t` bands (categories / sort / media filters) |
| Section count | ~15 category sections in unfiltered grid — high vertical scroll for “All” |
| Product policy still open | `NAV-TREE-TARGET.md`: *Demote · Huge provider rectangles … → compact + docs · **Policy*** (not marked Done) |

**Not verified visually live** (no browser screenshot this run). Structure alone supports: **list mode is already compact**; **default grid remains multi-section + multi-badge**.

**INCLUDE / DEFER**

| Option | When |
|--------|------|
| **INCLUDE** (EPIC-15 density slice) | Operators still default to Grid and report scroll fatigue: denser card (single-line identity+status), collapse empty capability row more aggressively, optional “flat grid” without per-section walls when category filter is All |
| **DEFER** | Product accepts List as power-operator default + Configured-only; no new epic until operator feedback on :22000 |

---

### 3.2 Auth mode flags (oauth / apikey / web-cookie) — present or missing?

**Verdict: FALSE residual — unified auth-mode indicators ARE present**

| Layer | Implementation |
|-------|----------------|
| Color-coded category dots | `ProviderCard` / `ProviderListRow` → `CategoryDot` + `DOT_COLORS`: oauth=`bg-blue-500`, apikey=`bg-amber-500`, web-cookie=`bg-purple-500`, free=`bg-green-500`, … |
| Category filter chips | `ProviderSummaryCard` categories include oauth / apikey / webcookie with same colors |
| Auth-status error chips (mode-aware) | `resolveProviderCardAuthStatusCopy` + `mapProviderCardAuthTypeToCredentialMode` maps oauth / apikey / web-cookie / compatible / local / … so OAuth re-auth copy is not primary for apikey (Epic 0007 / Task 0038) |
| Connection count badges | Connected / warning / error badges on card footer and list row |

**Nuance (not a “missing flags” bug):** flags are **dot + tooltip**, not full text pills (“OAuth”, “API Key”, “Web Cookie”) on every card. If the residual claim meant **human-readable text badges**, that is a **presentation upgrade**, not absence of taxonomy.

**INCLUDE / DEFER:** **DEFER / close** — do not re-open as greenfield “add auth mode flags.” Optional micro-polish (text chip next to dot) only if a11y/operators demand it.

---

### 3.3 Sort by account count / preferred models?

**Verdict: PARTIAL — accounts shipped; preferred models absent**

| Sort key | Status | Evidence |
|----------|--------|----------|
| A–Z | **Present** | `ProviderSortMode = "az" \| "accounts"`; summary buttons `sortAz` / `sortByAccounts` |
| Account count (desc) | **Present** | `sortProviderEntriesByAccounts` uses `stats.total`; wired in list (`compactProviderEntries`) and category builders via `sortMode` |
| Preferred / favorite models | **Absent** | No third sort mode; no preferred-model score on provider entries; no UI control |

**INCLUDE / DEFER**

| Item | Disposition |
|------|-------------|
| Sort by accounts | **Close** — residual claim false for this half |
| Sort by preferred models | **INCLUDE only after** global favorites (3.4); otherwise **DEFER** (no data model) |

---

### 3.4 Favorite model button (global by model name, p↔. alias)?

**Verdict: CONFIRMED gap — does not exist in Providers UI**

| Expected | Actual |
|----------|--------|
| Star / favorite control on model rows | **None** — `ModelRow` has copy, test, hide/show, compat popover, **per-provider alias edit** only |
| Global favorite keyed by model **name** | **No** DB/API/UI for model favorites under providers |
| p↔. alias normalization for favorites | **No** favorite path. Model IDs in UI use `providerAlias/modelId` slash form (`CompatibleModelsSection` / `CustomModelsSection`). No star that collapses `provider.model` ↔ `provider/model` for a global key |
| NAV-TREE-TARGET “favorites · Live” | **Doc overclaim** — L2 line lists “OAuth/API/web flags, favorites” as Live; flags exist, **favorites do not** |

Related **non-favorite** features (do not count as the residual):

- Per-model **alias** edit/delete on provider detail  
- Model **visibility** (hide/show, auto-hide failed)  
- VS Code raw tags `selectPreferredModels` (server-side catalog preference, not operator star UI)

**INCLUDE / DEFER:** **INCLUDE** as a **new feature** (EPIC-15-style), not a regression:

1. Storage: global favorite set keyed by normalized model name (define slash/dot/`provider/model` normalization once).  
2. UI: star on `ModelRow` (+ optional hub filter “favorites”).  
3. Optional follow-on: sort/filter providers by favorite-model coverage (closes 3.3 preferred half).

Do **not** claim “fix missing favorites” — this is net-new product surface.

---

### 3.5 provider-pools page — gone / redirect / broken?

**Verdict: GONE — no page, no redirect, no in-app peer link under that name**

| Check | Result |
|-------|--------|
| `src/app/(dashboard)/dashboard/**/provider-pools` | **Absent** |
| `rg provider-pools` / `providerPools` in app + constants | **0 product hits** (only unrelated `providerPool` in auto-combo virtual factory) |
| `next.config.mjs` redirects | **No** `provider-pools` → … mapping |
| `ProvidersTopBar` peers | providers, provider-stats, providers/services, quota, free-provider-rankings, free-tiers, runtime — **no pools** |
| Nearby “pools” concept | **Quota Share pools** at `/dashboard/costs/quota-share` (allocation pools, not a providers hub peer) |

**Interpretation**

- Not a **broken live peer** in current Providers chrome.  
- If external bookmarks/docs still cite `/dashboard/provider-pools`, that is **doc/bookmark lag**, not a dashboard regression.  
- Optional hygiene: permanent redirect to quota-share **only if** historical URL traffic is proven.

**INCLUDE / DEFER:** **DEFER** product work. Optional docs/redirect cleanup outside EPIC-15 UI density.

---

### 3.6 free-tier flags — exist?

**Verdict: FALSE residual — free-tier signals exist at multiple layers**

| Layer | Evidence |
|-------|----------|
| Catalog | Widespread `hasFree: true` + `freeNote` in `src/shared/constants/providers/**` (oauth, apikey, web-cookie, search, local, …) |
| Hub card/list | `CategoryDot` second green dot when `provider.hasFree === true`; tooltip `hasFreeTooltip` (“Free tier available”) |
| Filter | Free Tiers category chip → `showFreeOnly`; filters entries with `hasFree === true` |
| Peer pages | `/dashboard/free-tiers` (`FreeBudgetCard` + `ProvidersTopBar`); `/dashboard/free-provider-rankings` |
| Detail models | Free filter + “Free first” sort via `isFreeModel` / `sortModelsFreeFirst` on model sections |

**INCLUDE / DEFER:** **DEFER / close**. Not an open residual for “add free-tier flags.”

---

## 4. Cross-check vs IA / prior epics

| Source claim | Live HEAD |
|--------------|-----------|
| NAV-TREE-TARGET L2: “OAuth/API/web flags, **favorites** · Live” | Flags **Live**; favorites **Not built** → correct doc to **Partial** |
| NAV-TREE-TARGET Demote: “Huge provider rectangles · compact” **Policy** | Still accurate as **policy residual** for default grid density |
| Epic 0007 / 0038 auth-status on ProviderCard/ListRow | **Met** (mode-aware status copy + badges) |
| Wave 2 dual-mode auth evidence | Consistent — presentation layer distinguishes oauth vs apikey CTAs |

---

## 5. EPIC-15 style backlog (INCLUDE vs DEFER)

Suggested packaging if Wave 3 opens a **Providers operator UX** epic:

### INCLUDE (actionable)

| Priority | Work item | Rationale | Depends on |
|----------|-----------|-----------|------------|
| **P2** | **Global favorite models** (star by normalized model name; define p↔. / slash equivalence) | Confirmed missing; NAV overclaims Live | New storage + ModelRow control |
| **P3** | **Grid density pass** (optional): flatter All view, tighter card footer, fewer section walls | Partial residual; policy still open | Operator preference vs list-mode |
| **P3** | Doc fix: `NAV-TREE-TARGET` favorites status → Partial / Planned | Prevents phantom completion | Docs only |

### DEFER / close (do not re-implement)

| Item | Reason |
|------|--------|
| Auth mode oauth/apikey/web-cookie flags | Already unified via CategoryDot + category chips + status mapper |
| Sort by account count | Shipped (`az` / `accounts`) |
| Free-tier flags / free-only filter / free-tiers peers | Shipped |
| provider-pools route recovery | Page intentionally absent; not in topbar matrix |
| Sort by preferred models | Blocked until favorites exist |

### Explicit non-goals for this residual set

- Rebuilding quota-share as “provider-pools” under Providers hub  
- Replacing list mode with a third “ultra-compact” display mode without operator demand  
- Re-opening Epic 0007 dual-mode status copy (already complete in code)

---

## 6. Suggested acceptance tests (if INCLUDE ships)

| Feature | Minimal regression guard |
|---------|--------------------------|
| Favorites | Unit: normalize key treats `p.m` / `p/m` / bare name per agreed rules; star toggles persist; list filter shows only favorited models |
| Density | Static/UI: default grid card max structural rows ≤ N; list row still keeps Toggle outside Link (existing Task 0057 a11y test) |
| Non-regression | Keep `ProviderSortMode` accounts sort + `CategoryDot` free/oauth colors covered by existing presentation tests |

---

## 7. One-line operator-facing truth

> Providers hub already has **auth-mode dots**, **free-tier markers**, **sort by accounts**, and a **compact list view**; it does **not** have **global model favorites**; the old **provider-pools** page is simply **gone** (use Quota Share for allocation pools); residual “jungle” is mainly **default multi-section grid chrome**, not missing controls.

---

## 8. Evidence index (file anchors)

| Topic | Anchor |
|-------|--------|
| Card structure / footer separator | `ProviderCard.tsx` rows 1–3, `border-t` footer ~L360–434 |
| List compact row | `ProviderListRow.tsx` ~L167–337 |
| Sort A–Z / accounts | `providerPageUtils.ts` L16, L86–107; `ProviderSummaryCard.tsx` L281–316 |
| Display modes | `ProviderDisplayModeControl.tsx`; `providerPageStorage.ts` |
| Auth type colors + free dot | `CategoryDot.tsx`; `DOT_COLORS` in Card/ListRow |
| Auth status mapping | `connectionStatusPresentation.ts` `mapProviderCardAuthTypeToCredentialMode` |
| Model row actions (no star) | `ModelRow.tsx` ~L344–457 |
| Free filter on models | `ModelVisibilityToolbar` freeFilter / sortFreeFirst; `ProviderModelsSection.tsx` |
| Topbar peers (no pools) | `ProvidersTopBar.tsx` `PROVIDERS_TOPBAR_PATHS` |
| Free tiers peer | `free-tiers/page.tsx` |
| IA overclaim | `NAV-TREE-TARGET.md` L102–103 |
