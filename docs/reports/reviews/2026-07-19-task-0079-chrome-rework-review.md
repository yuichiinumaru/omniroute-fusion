# Review Report: Task 0079 — EPIC-19 Providers chrome unify (Budget/Pricing/Quota Sharing) — 2026-07-19

## Review Lineage

- **Current task**: Task 0079 (`omniroute-epic19-providers-absorb-budget-pricing-quota`); live path at review start: `docs/tasks/02-doing/0079-omniroute-epic19-providers-absorb-budget-pricing-quota.md`
- **Review mode**: formal **chrome rework** review after operator dual-strip rejection (Hard Rule #22 / single-topbar law)
- **Previous reports read**:
  - `docs/reports/reviews/2026-07-19-task-0079-epic19-providers-budget-pricing-quota-frontend-quality-review.md` — first-pass 100 that **accepted dual chrome** (`ProvidersTopBar` + `ProvidersPolicySubnav`) — **superseded on chrome**
  - `docs/reports/reviews/2026-07-19-task-0079-epic19-providers-budget-pricing-quota-independent-rereview.md` — independent re-review pre-rework
- **Skills applied**: frontend-quality-harness (IA/chrome/a11y), tsjs-harness (boundary/redirect purity), code-quality (SSOT/archive-not-delete)
- **Constraints honored**: no git; no `:21000`; source + unit proof only

## Operator Chrome Contract (scoring axis)

| Rule | Required |
|------|----------|
| Hub strips on Providers list + Budget + Pricing + Quota-share | **Exactly one** |
| Budget / Pricing / Quota Sharing | **Peers on `ProvidersTopBar`** (same strip as Stats / Services / …) |
| `ProvidersPolicySubnav` as second strip | **Forbidden** (stop-mount; archive OK) |
| `CostsSubnav` on Providers policy routes | **Forbidden** |
| Nested `/dashboard/providers/{budget,pricing,quota-share}` + redirects | **Keep** (not undone) |

## Score And Verdict

- **Score**: `100/100`
- **Verdict**: `ACCEPTED_100`
- **Lane recommendation**: `accept-completed` → move to `docs/tasks/03-review/`

### Dual score

| Dimension | Score | Notes |
|-----------|------:|-------|
| `local_implementation` | 100 | Single topbar peers + stop-mount PolicySubnav + redirects + 0078 SSoT paths |
| `runtime_enforcement` | 100 | Unit mount matrix + anti-phantom import/JSX guards; server `redirect()` shells; sidebar prefix lights Providers |

## Diff Ownership (chrome rework surface)

| Surface | Status |
|---------|--------|
| `providers/components/ProvidersTopBar.tsx` | Budget / Pricing / Quota Sharing peers in `PROVIDERS_TOPBAR_PATHS` + `TOPBAR_LINKS` |
| `providers/budget\|pricing\|quota-share/page.tsx` | Single `ProvidersTopBar` + correct `currentPath`; no Policy/Costs strip |
| `providers/components/ProvidersPolicySubnav.tsx` | `@deprecated` archive-not-delete; **zero** live imports |
| Redirect shells + CostsSubnav config hrefs + usage/settings | Unchanged from destination re-home (still valid) |
| `tests/unit/ui/epic19-providers-costs-redirect-0079.test.ts` | Anti-phantom single topbar |
| `tests/unit/provider-connections-ui-regression.test.ts` | Peer matrix includes policy routes + dual-strip fail |

## Delta Summary

### Resolved Since Previous Reviews (chrome)

| Was | Now |
|-----|-----|
| Dual strip: `ProvidersTopBar` (often wrong `currentPath="/dashboard/providers"`) **+** `ProvidersPolicySubnav` | Exactly one `ProvidersTopBar`; peer `currentPath` from 0078 path constants |
| Policy destinations not discoverable from hub topbar | Budget / Pricing / Quota Sharing are topbar peers (operator order) |
| First formal review scored dual chrome as “strong hierarchy” | Corrected under Hard Rule #22 |

### Persistent Findings

- none blocking

### Regressions

- none in exclusive product chrome

### New Findings

- none material

### Non-scoring residuals (documented)

| ID | Severity | Note |
|----|----------|------|
| NIT-1 | Improvement | `topbarBudget` / `topbarPricing` / `topbarQuotaSharing` (and other pre-existing topbar keys) rely on English fallbacks via `providerText` — same pattern as Stats/Services/… peers; not a chrome-contract fail |
| NIT-2 | Ops | Live deploy lag on non-prod containers may still show pre-rework chrome until image refresh — **not** a source reject (no `:21000` touch) |
| NIT-3 | Cross-task | `CostsSubnav.tsx` remains on disk with zero production mounts (0081/0082 residual) — not mounted on Providers policy routes |

## Findings Table

| ID | Class | Severity | Status | Summary | Evidence |
| --- | --- | --- | --- | --- | --- |
| — | — | — | — | No open findings in 0079 chrome rework exclusive scope | — |

## Contract Compliance

### Chrome unify (operator rework)

| Exit | Status | Evidence |
|------|--------|----------|
| Exactly one hub topbar on Budget / Pricing / Quota-share | **PASS** | Each page: one `<ProvidersTopBar`; zero PolicySubnav/CostsSubnav import or JSX |
| Budget / Pricing / Quota Sharing peers on same topbar | **PASS** | `TOPBAR_LINKS` order: Stats → Services → Quota → Rankings → Free Tiers → Runtime → **Budget → Pricing → Quota Sharing**; paths via `PROVIDERS_*_PATH` |
| No PolicySubnav second strip | **PASS** | Grep: no `import ProvidersPolicySubnav` anywhere under `src/`; file retained with `@deprecated` |
| No CostsSubnav on Providers policy routes | **PASS** | Policy pages + unit anti-phantom; CostsSubnav unused as production mount |
| Sidebar Providers active on nested policy paths | **PASS** | `matchesSidebarHref` prefix; `sidebar-route-match.test.ts` asserts `/dashboard/providers/budget` → `/dashboard/providers` |
| typecheck + unit tests | **PASS** | See Verification |

### Destination re-home (kept — still green)

| Exit | Status | Evidence |
|------|--------|----------|
| Canonical nested routes render UI | **PASS** | `BudgetTab` / `PricingTab` / `QuotaSharePageClient` under Providers chrome |
| Legacy costs config server redirects | **PASS** | `costs/{budget,pricing,quota-share}/page.tsx` → `redirect(buildProviders*Path())` |
| usage `?tab=budget` + settings/pricing | **PASS** | builders only; no legacy costs targets |
| no-new-leaf | **PASS** | PRIMARY has no budget/pricing/quota-share leaves; costs leaf already dropped by 0082 |
| hideable ids archive-not-delete | **PASS** | `costs-budget` / `costs-pricing` / `costs-quota-share` retained |
| quota-share tree not deleted | **PASS** | `costs/quota-share/QuotaSharePageClient` imported by Providers route |

## Frontend Quality (chrome rework lens)

| Check | Result |
|-------|--------|
| Single-topbar law | **Pass** — one strip; operator peers explicit |
| Peer active state | **Pass** — exact `currentPath === link.href`; policy pages pass `PROVIDERS_*_PATH` (not Providers root) |
| Visual SSOT | **Pass** — `HUB_SUBNAV_*` only (no `bg-primary text-white`) |
| Keyboard / a11y | **Pass** — `HUB_SUBNAV_ITEM_BASE_CLASS` focus-visible ring; `aria-current="page"`; decorative icons `aria-hidden`; nav `aria-label` + `data-testid="providers-topbar"` |
| Responsive resilience | **Pass** — shell `flex-wrap` + topbar `overflow-x-auto shrink-0` for 10 peers |
| Layout double-mount | **Pass** — no providers `layout.tsx` injecting second bar |
| Anti-phantom tests | **Pass** — mount count = 1; import/JSX dual-strip fail on policy peers + providers home |

## TS/JS / Code Quality

| Axiom | Status | Notes |
|-------|--------|-------|
| Type purity | ✅ | `ProvidersTopBarPath` branded union extended with 0078 constants |
| Boundary integrity | ✅ | Server redirects; client UI only on canonical routes |
| SSOT | ✅ | Paths from `epic19Rebalance`; no ad-hoc destination strings on shells |
| Archive-not-delete | ✅ | PolicySubnav + QuotaShare client tree retained |
| Test durability | ✅ | Anti-phantom uses import/JSX regex (comments may name retired strip without failing) |

## Verification (this review)

```text
node --import tsx/esm --test \
  tests/unit/provider-connections-ui-regression.test.ts \
  tests/unit/ui/epic19-providers-costs-redirect-0079.test.ts
→ 18/18 pass

node --import tsx/esm --test tests/unit/sidebar-route-match.test.ts
→ 11/11 pass (includes providers/budget → Providers leaf)

npm run typecheck:core → exit 0

npx eslint --max-warnings 0 <0079 chrome-touched files> → exit 0
```

### Source mount matrix (re-verified)

| Route page | `ProvidersTopBar` count | PolicySubnav | CostsSubnav | `currentPath` |
|------------|------------------------:|:------------:|:-----------:|---------------|
| `providers/page.tsx` | 1 | no | no | `/dashboard/providers` |
| `providers/budget/page.tsx` | 1 | no | no | `PROVIDERS_BUDGET_PATH` |
| `providers/pricing/page.tsx` | 1 | no | no | `PROVIDERS_PRICING_PATH` |
| `providers/quota-share/page.tsx` | 1 | no | no | `PROVIDERS_QUOTA_SHARE_PATH` |

Peer order after **Providers**: Stats · Services · Quota · Rankings · Free Tiers · Runtime · **Budget · Pricing · Quota Sharing** — matches operator completion evidence.

## Lane Outcome

- **Score 100** → move task file to `docs/tasks/03-review/0079-omniroute-epic19-providers-absorb-budget-pricing-quota.md`
- Report path: `docs/reports/reviews/2026-07-19-task-0079-chrome-rework-review.md`
- Reviewer: `gt-frontend-quality-reviewer` (parent `builders`)

## Path-to-100

Not required (already 100). No code changes made by this review.
