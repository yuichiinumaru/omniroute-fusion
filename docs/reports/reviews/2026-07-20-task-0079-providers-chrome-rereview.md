# Review Report: Task 0079 — Providers single-topbar chrome — independent re-review 2026-07-20

## Review Lineage

- **Current task**: Task 0079 (`omniroute-epic19-providers-absorb-budget-pricing-quota`); live path: `docs/tasks/03-review/0079-…`
- **Review mode**: independent FULL re-review (agentID=reviewers); builder claims UNTRUSTED
- **Previous reports read**:
  - `docs/reports/reviews/2026-07-19-task-0079-chrome-rework-review.md` (100; dual-strip fix)
  - `docs/reports/reviews/2026-07-19-task-0079-epic19-providers-budget-pricing-quota-independent-rereview.md` (pre-rework dual strip accepted — superseded)
  - `docs/reports/reviews/2026-07-19-task-0079-epic19-providers-budget-pricing-quota-frontend-quality-review.md` (first-pass; dual chrome scored as hierarchy — superseded under Hard Rule #22)
- **Skills**: frontend-quality-harness · tsjs boundary · review-report-lineage
- **Constraints**: no git; no `:21000`; source + unit proof only

## Operator Chrome Contract (scoring axis)

| Rule | Required |
|------|----------|
| Hub strips on Providers list + Budget + Pricing + Quota-share | **Exactly one** |
| Budget / Pricing / Quota Sharing | **Peers on `ProvidersTopBar`** (same strip as Stats…Runtime) |
| `ProvidersPolicySubnav` as second strip | **Forbidden** (stop-mount; archive OK) |
| `CostsSubnav` on Providers policy routes | **Forbidden** |
| Nested destinations + legacy redirects | **Keep** |

## Score And Verdict

- **Score**: `100/100`
- **Verdict**: `ACCEPTED_100`
- **Lane recommendation**: **stay `03-review/`** (no path-to-100 patches required)
- **Patches applied this review**: none

### Dual score

| Dimension | Score | Notes |
|-----------|------:|-------|
| `local_implementation` | 100 | Peers on single topbar; PolicySubnav zero live imports; correct `currentPath` |
| `runtime_enforcement` | 100 | Mount-matrix unit guards; server `redirect()` shells; 0078 SSoT paths |

Overall → **100**.

## Dual-Topbar Evidence Matrix (live source)

| Route / surface | Hub strip mounts | Secondary strip | Verdict |
|-----------------|------------------|-----------------|---------|
| `/dashboard/providers` | `<ProvidersTopBar>` ×1 (`currentPath="/dashboard/providers"`) | none | PASS |
| `/dashboard/providers/budget` | `<ProvidersTopBar>` ×1 (`PROVIDERS_BUDGET_PATH`) | no PolicySubnav / CostsSubnav import or JSX | PASS |
| `/dashboard/providers/pricing` | `<ProvidersTopbar>` ×1 (`PROVIDERS_PRICING_PATH`) | none | PASS |
| `/dashboard/providers/quota-share` | `<ProvidersTopBar>` ×1 (`PROVIDERS_QUOTA_SHARE_PATH`) | content = `QuotaSharePageClient` only | PASS |
| Peer siblings (stats/services/quota/rankings/free-tiers/runtime) | `<ProvidersTopBar>` ×1 each | none | PASS |
| `ProvidersPolicySubnav.tsx` | file retained `@deprecated` | **0** `import` / `<ProvidersPolicySubnav` under `src/` | ARCHIVE OK |
| `CostsSubnav.tsx` | file retained residual | **0** live imports under `src/` | ARCHIVE OK |
| Legacy `/dashboard/costs/{budget,pricing,quota-share}` | redirect shells only | no chrome mounts | PASS |

**Repo-wide greps (src):**

```
CostsSubnav import/JSX mounts:           0
ProvidersPolicySubnav import/JSX mounts: 0
```

**Peer order on `ProvidersTopBar` (operator):**  
Providers · Stats · Services · Quota · Rankings · Free Tiers · Runtime · Budget · Pricing · Quota Sharing

## Destination / Redirect Proof (kept)

| from | to |
|------|-----|
| `/dashboard/costs/budget` | `/dashboard/providers/budget` |
| `/dashboard/costs/pricing` | `/dashboard/providers/pricing` |
| `/dashboard/costs/quota-share` | `/dashboard/providers/quota-share` |
| `/dashboard/usage?tab=budget` | Providers budget |
| `/dashboard/settings/pricing` | Providers pricing |

## Tests Run

```bash
node --import tsx/esm --test \
  tests/unit/ui/epic19-providers-costs-redirect-0079.test.ts \
  tests/unit/provider-connections-ui-regression.test.ts \
  tests/unit/ui/epic19-rebalance-matrix-0078.test.ts \
  # (+ sibling epic19 suite in same batch)
# → 88 pass / 0 fail (batch including 0079/0080/0081/0056/shell)
```

Key anti-phantom asserts in `epic19-providers-costs-redirect-0079.test.ts`:

- canonical policy pages mount **exactly one** `ProvidersTopBar`
- fail if `ProvidersPolicySubnav` or `CostsSubnav` import/JSX present
- PolicySubnav archive-not-delete with zero live mounts
- peer SSoT uses 0078 path constants

## Findings

| ID | Severity | Status | Summary |
|----|----------|--------|---------|
| — | — | none blocking | Single-topbar contract holds end-to-end |

### Non-scoring residuals

| ID | Note |
|----|------|
| NIT-1 | `topbarBudget` / `topbarPricing` / `topbarQuotaSharing` i18n may fall back to English via `providerText` (same pattern as other peers) |
| NIT-2 | `CostsSubnav` / `ProvidersPolicySubnav` remain on disk (archive-not-delete); zero production mounts |
| NIT-3 | Deploy lag on non-prod images may still show old dual chrome until refresh — not a source reject |

## Lane

- **Stay** `docs/tasks/03-review/0079-omniroute-epic19-providers-absorb-budget-pricing-quota.md`
- No move to `02-doing` (S≥90 and no defects requiring path-to-100)

## Reviewer

- **Profile**: `gt-frontend-quality-reviewer` / independent re-reviewers agent
- **Date**: 2026-07-20
