# Independent Re-Review: Task 0079 — Providers absorb budget/pricing/quota — 2026-07-19

## Review Lineage

- **Current task**: Task 0079 (`omniroute-epic19-providers-absorb-budget-pricing-quota`); lane `docs/tasks/03-review/`
- **Reviewer**: independent FULL RE-REVIEWER (`reviewers` agentID) — **builders claims untrusted**
- **Previous reports read**:
  - `docs/reports/reviews/2026-07-19-task-0079-epic19-providers-budget-pricing-quota-frontend-quality-review.md` (builders 100)
  - Bundled blast radius `2026-07-19-epic19-0079-0080-0081-bundled-blast-radius.md`
  - 0078 independent re-review (same session)
- **Skills**: frontend-quality-harness · tsjs-harness · code-quality
- **Review mode**: independent adversarial re-review (source static proof + unit + live 22000)

## Score And Verdict

- **Score**: `100/100`
- **Verdict**: `ACCEPTED_100`
- **Lane**: **stay `03-review/`**

### Dual score

| Dimension | Score | Notes |
|-----------|------:|-------|
| `local_implementation` | 100 | Nested Providers routes + PolicySubnav + server redirect shells via 0078 builders only |
| `runtime_enforcement` | 100 (source) / gap (deploy) | Source `redirect(buildProviders*Path())` proven by unit source-read tests. Live `:22000` image **does not include** this code yet (stale Docker) — ops residual, not 0079 source failure |

## Live adversarial IA proof (sidebar/hubs)

Authenticated probes on **`:22000` only**:

| Path | Live result | Source truth |
|------|-------------|--------------|
| `/dashboard/costs/budget` | **200** + `data-costs-subnav` (legacy UI still rendered) | Server redirect shell → `/dashboard/providers/budget` |
| `/dashboard/costs/pricing` | 200 legacy | redirect → providers/pricing |
| `/dashboard/costs/quota-share` | 200 legacy | redirect → providers/quota-share |
| `/dashboard/usage?tab=budget` | 200 no hop | redirect → `buildProvidersBudgetPath()` |
| `/dashboard/settings/pricing` | 200 no hop | redirect → `buildProvidersPricingPath()` |
| `/dashboard/providers/budget` | 200 (no `data-providers-policy-subnav` in SSR HTML of stale image) | mounts TopBar + PolicySubnav + BudgetTab |

**Root cause of live miss:** container `0b23cb31f48b` / `omniroute:base` predates 2026-07-19 EPIC-19 source (workspace `.build/next` ~ Jul 15). **Do not score as implementation defect.** Rebuild/redeploy 22000 is required for live green.

## Diff Ownership (verified exclusive)

| Surface | Owner | Present |
|---------|--------|---------|
| `providers/{budget,pricing,quota-share}/page.tsx` | 0079 | ✅ |
| `ProvidersPolicySubnav.tsx` | 0079 | ✅ HUB_SUBNAV + builders + `aria-label` / `aria-current` / `focus-ring` |
| `costs/{budget,pricing,quota-share}/page.tsx` | 0079 redirect shells | ✅ no `"use client"`, no UI remount |
| CostsSubnav config hrefs | 0079 (+ Overview via 0081) | ✅ builders only |
| `usage` budget + `settings/pricing` | 0079 | ✅ |
| PRIMARY leaf drop | 0082 | not this task |
| costs overview content | 0081 | not this task |

## Delta Summary

### Resolved Since Previous Review

- none required in exclusive product code; independent verify confirms prior ACCEPT

### New Findings

| ID | Severity | Status | Summary |
|----|----------|--------|---------|
| F-ENV-1 | Info | Open (ops) | Live 22000 not serving 0079 redirects until rebuild |
| F-NIT-1 | Improvement | Accept residual | `ProvidersTopBar` does not list budget/pricing/quota-share — PolicySubnav + CommandPalette deep links cover discoverability (prior review accepted) |

### Regressions

- none in source

## Contract Compliance

| Exit | Status | Evidence |
|------|--------|----------|
| Three Providers surfaces + chrome | PASS | budget/pricing/quota-share pages mount PolicySubnav + domain tabs |
| Legacy costs config server redirect | PASS | static read: `redirect` + `epic19Rebalance` builders; unit suite |
| usage/settings aliases | PASS | `usage/page.tsx` budget branch; settings pricing |
| CostsSubnav config-only ownership | PASS | Budget/Pricing/Quota → Providers; Overview → Dashboard builder (0081) |
| no-new-leaf | PASS | PRIMARY has `providers`, not budget/pricing/quota-share peers; post-0082 no `costs` leaf in **source** |
| hideable ids archive | PASS | `costs-budget` / `costs-pricing` / `costs-quota-share` retained |
| archive-not-delete quota tree | PASS | `QuotaSharePageClient` imported from costs tree |
| Unit tests | PASS | `epic19-providers-costs-redirect-0079.test.ts` green in 72-test bundle |

## Frontend quality

| Check | Result |
|-------|--------|
| Hub chrome hierarchy | **Strong** — ProvidersTopBar + PolicySubnav (HUB_SUBNAV) |
| Active states | pathname exact / nested; Overview storyTab on `/home` |
| A11y | `aria-label="Providers policy sections"`, `aria-current`, `focus-ring`, icon `aria-hidden` |
| Dual-host | legacy redirect-only; UI only on Providers |
| Discoverability | Policy strip on nested pages + palette builders (0082 extras) |

## TS/JS axiom compliance

| Axiom | Status |
|-------|--------|
| Type Purity | ✅ |
| Boundary Integrity | ✅ server redirects; 0078 builders only |
| Async Determinism | ✅ |
| Immutability | ✅ static POLICY_LINKS |
| State Exclusivity | ✅ one nested path per surface |

## Commands run (fresh)

```bash
node --import tsx/esm --test \
  tests/unit/ui/epic19-providers-costs-redirect-0079.test.ts \
  tests/unit/ui/epic19-rebalance-matrix-0078.test.ts
# → pass

# Static:
# costs/* → redirect(buildProviders*Path()) confirmed
# providers/* → PolicySubnav + BudgetTab|PricingTab|QuotaSharePageClient
```

## Path-to-100 applied

- No exclusive product code patch required (already 100 on source).
- Documented live deploy gap so future reviewers do not false-reject.

## Lane outcome

- **Stay `03-review/`** at **100/100**
