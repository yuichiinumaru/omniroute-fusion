# Review Report: Task 0079 — EPIC-19 Providers absorb budget/pricing/quota-share — 2026-07-19

## Review Lineage

- **Current task**: Task 0079 (`omniroute-epic19-providers-absorb-budget-pricing-quota`); live path: `docs/tasks/02-doing/0079-omniroute-epic19-providers-absorb-budget-pricing-quota.md`
- **Previous reports read**:
  - `docs/reports/reviews/2026-07-19-task-0078-epic19-ssot-rebalance-matrix-frontend-quality-review.md` — freeze SSoT **100**; consumers (including this task) already import builders
- **Related**: EPIC-19 product matrix; bundled wave with **0080** / **0081**
- **Review mode**: first independent formal review (frontend-quality + tsjs + code-quality; gt-subagent-review; bundled multi-task wave)
- **Previous task-embedded Review Trail**: empty

## Score And Verdict

- **Score**: `100/100`
- **Verdict**: `ACCEPTED_100`
- **Lane recommendation**: `accept-completed` → parent may move to `03-review/` (score gate 100)

### Dual score

| Dimension | Score | Notes |
|-----------|------:|-------|
| `local_implementation` | 100 | Providers nested routes + PolicySubnav + server redirect shells + 0078 builders only |
| `runtime_enforcement` | 100 | Live `redirect()` on legacy costs config + usage budget + settings/pricing; canonical pages mount UI |

## Diff Ownership

| Surface | Owner |
|---------|--------|
| `providers/{budget,pricing,quota-share}/page.tsx` | **0079** |
| `providers/components/ProvidersPolicySubnav.tsx` | **0079** |
| `costs/{budget,pricing,quota-share}/page.tsx` redirect shells | **0079** |
| CostsSubnav **Budget/Pricing/Quota-share** hrefs | **0079** |
| `usage/page.tsx` `?tab=budget` | **0079** |
| `settings/pricing/page.tsx` | **0079** |
| `tests/unit/ui/epic19-providers-costs-redirect-0079.test.ts` | **0079** |
| CostsSubnav **Overview** + `costs/page.tsx` overview | **0081** (not 0079) |
| PRIMARY_SIDEBAR leaf drop | **0082** |

## Delta Summary

### Resolved Since Previous Review

- N/A (first formal review)

### Persistent Findings

- none

### Regressions

- none owned by 0079

### New Findings

- none material for 0079 scope (discoverability residual after **0081** orphaned `CostsSubnav` is scored on **0081** blast radius)

### Evidence Gaps / External Blockers

- none for 0079 exits
- Browser smoke / e2e not required by task unit gate; not run (no :21000; :22000 not required for static redirect proof)

## Findings

| ID | Class | Severity | Status | Summary | Evidence |
| --- | --- | --- | --- | --- | --- |
| — | — | — | — | No open findings in 0079 exclusive scope | — |

## Contract Compliance (exit conditions)

| Exit | Status | Evidence |
|------|--------|----------|
| Three Providers-canonical surfaces under Providers chrome | PASS | `providers/budget|pricing|quota-share/page.tsx` mount `ProvidersTopBar` + `ProvidersPolicySubnav` + `BudgetTab` / `PricingTab` / `QuotaSharePageClient` |
| Legacy costs config routes server-redirect | PASS | `costs/{budget,pricing,quota-share}/page.tsx` call `redirect(buildProviders*Path())` — no `"use client"`, no UI remount |
| Unit test redirect matrix | PASS | `epic19-providers-costs-redirect-0079.test.ts` green this review |
| CostsSubnav config hrefs only; Overview for 0081 | PASS | Budget/Pricing/Quota-share → builders; Overview → `buildDashboardStoryPath("costs-overview")` (0081 already applied) |
| usage budget branch → Providers | PASS | `usage/page.tsx` `tab === "budget"` → `buildProvidersBudgetPath()` |
| no-new-leaf | PASS | PRIMARY still has `costs`; no `budget`/`pricing`/`quota-share` peer leaves |
| hideable ids retained | PASS | `costs-budget` / `costs-pricing` / `costs-quota-share` still in `HIDEABLE_SIDEBAR_ITEM_IDS` |
| archive-not-delete quota-share tree | PASS | `QuotaSharePageClient` imported from `costs/quota-share/` |
| typecheck:core | PASS | exit 0 this review |
| eslint touched files | PASS | exit 0 `--max-warnings 0` |

## Frontend quality (IA re-home lens)

| Check | Result |
|-------|--------|
| Visual hierarchy / hub chrome | **Strong** — `HUB_SUBNAV_*` + `ProvidersPolicySubnav` with `aria-label`, `aria-current`, `focus-ring`, material icons |
| Active states | **Correct** — pathname exact / nested match on policy hrefs |
| Responsive subnav | Shared hub shell (`overflow` patterns via HUB_SUBNAV) |
| Dual-host risk | **Mitigated** — legacy pages redirect-only; UI only on Providers |
| Discoverability from Providers root | Policy strip mounts on nested pages only; `ProvidersTopBar` does **not** list budget/pricing/quota-share. Acceptable for 0079 letter (redirects + nested chrome); residual operator discovery after 0081 kills Costs mount is **0081 cross-task** |
| Accessibility | Policy links are real `<Link>` with `aria-current="page"`; icon `aria-hidden` |

## TS/JS axiom compliance

| Axiom | Status | Notes |
|-------|--------|-------|
| Type Purity | ✅ | `as const satisfies readonly PolicyTabLink[]`; builders typed |
| Boundary Integrity | ✅ | Server redirects; no new untrusted I/O parsers |
| Async Determinism | ✅ | Server redirect pages; client policy subnav sync |
| Immutability | ✅ | Static link tables |
| State Exclusivity | ✅ | One nested path shape per policy surface (0078 freeze) |

## Evidence Reviewed

- Task file + Completion Evidence
- Source: Providers policy pages/subnav; costs redirect shells; CostsSubnav (config hrefs); usage + settings/pricing redirects
- SSoT: `src/shared/constants/epic19Rebalance.ts` (0078)
- Tests: `tests/unit/ui/epic19-providers-costs-redirect-0079.test.ts` (+ matrix 0078)

### Commands run (fresh this review)

```bash
node --import tsx/esm --test \
  tests/unit/ui/epic19-providers-costs-redirect-0079.test.ts \
  tests/unit/ui/epic19-rebalance-matrix-0078.test.ts
# → all pass (included in 95-test epic19 bundle)

npx eslint <0079 product + test files> --max-warnings 0
# → exit 0

npm run typecheck:core
# → exit 0
```

### Commands not run and why

- Browser / Playwright — unit + static source proof sufficient for redirect shells; no :21000
- Full `npm run test:unit` — scoped epic19 suites + typecheck + eslint

## Path To 100

Closed.

Optional non-blocking (other tasks):

1. **0081**: restore operator discoverability to Providers policy after CostsSubnav became unmounted (ProvidersTopBar policy peers or costs-overview entry chips)
2. **0082**: drop `costs` primary leaf once discovery path is solid

## Task Ledger Patch Suggestion

```markdown
## Review Ledger

### Latest Review
- **Date**: 2026-07-19
- **Reviewer profile**: `builders` / gt-frontend-quality-reviewer
- **Score**: `100/100`
- **Verdict**: `ACCEPTED_100`
- **Full report**: `docs/reports/reviews/2026-07-19-task-0079-epic19-providers-budget-pricing-quota-frontend-quality-review.md`
- **Lane outcome**: eligible for `03-review/`
```
