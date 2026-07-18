# Return Review Report: Task 0024 — Frontend IA Registry Connect Cleanup — 2026-07-18

## Review Lineage

- **Current task**: Task 0024 (`frontend-ia-registry-connect-cleanup`); path at review: `docs/tasks/03-review/0024-frontend-ia-registry-connect-cleanup.md`
- **Previous reports read** (prior scores **UNTRUSTED** until re-proven):
  - `docs/reports/reviews/2026-07-18-task-0024-frontend-ia-registry-connect-cleanup-final-review.md` (claimed 100 — re-audited)
  - `docs/reports/reviews/2026-07-16-task-0024-frontend-ia-registry-connect-cleanup-reaudit.md` (86 REJECTED_TO_DOING — dual catalog)
  - `docs/reports/reviews/2026-07-11-task-0024-frontend-ia-registry-connect-cleanup-rereview.md` (96)
  - `docs/reports/reviews/2026-07-11-task-0024-frontend-ia-registry-connect-cleanup-review.md` (84)
  - `docs/reports/reviews/2026-07-10-task-0024-frontend-ia-registry-connect-cleanup-review.md` (95)
- **Related**: Task 0059 Operations hub dual-catalog regression origin; Task 0025 flat primary chrome
- **Review mode**: `return-review` (independent adversarial FULL re-review; prior 100 untrusted)
- **Reviewer**: independent FULL RE-REVIEWER (`agentID=reviewers`)
- **Skills**: frontend-quality-harness, code-quality, tsjs, review-report-lineage
- **No git. No :21000.**

## Score And Verdict

- **Pre-patch independent score**: `97/100` (S ≥ 90 → path-to-100 in-lane)
- **Post path-to-100 score**: `100/100`
- **Verdict**: `ACCEPTED_100`
- **Lane**: stay `docs/tasks/03-review/` (do not demote to `02-doing`)

## Delta Summary

### Resolved Since Prior Trusted Adversarial (2026-07-16 @ 86)

| Prior ID | Status | Live proof |
| --- | --- | --- |
| F5 dual catalog via Operations hub | **RESOLVED** | Hub hrefs exclude `/dashboard/api-endpoints`; single `CONNECT_CATALOG_SSOT_HREF` |
| F6 phantom-test gap | **RESOLVED** | `connect-exposure-sidebar` + ops-hub dual-catalog guards green |
| Header competing "API Endpoints" brand | **RESOLVED** | Defensive alias titleFallback "API Catalog" / `menu_book` |

### New Finding Closed This Return-Review (path-to-100)

| ID | Severity | Status | Summary |
| --- | --- | --- | --- |
| R1 | Low (SSoT drift) | **RESOLVED** | `api-endpoints/page.tsx` hard-coded `redirect("/dashboard/endpoint?tab=catalog")` instead of `CONNECT_CATALOG_SSOT_HREF` — dual string risk vs hub constant |

### Non-blocking residual

| ID | Status | Notes |
| --- | --- | --- |
| F3 e2e | EXTERNAL_BLOCKER accepted | `protocol-visibility.spec.ts` re-enabled (not in `testIgnore`); host auth for :22000 not available in this lane |
| Soft dual | Accepted product rule | Operations hub may list **Endpoints shell** + **API Catalog** (`CONNECT_CATALOG_SSOT_HREF`) — not dual with retired redirect path |

## Findings

| ID | Class | Severity | Status | Summary | Evidence |
| --- | --- | --- | --- | --- | --- |
| F5 | REGRESSION→RESOLVED | Medium | Closed | Dual catalog via hub | `operationsHub.ts` + inventory `dualCatalog=false` |
| F6 | NEW→RESOLVED | Medium | Closed | Tests missed hub dual homes | connect-exposure + 0059 tests |
| R1 | NEW→RESOLVED | Low | Closed this review | Redirect not on SSoT constant | `api-endpoints/page.tsx` now imports `CONNECT_CATALOG_SSOT_HREF` |
| F3 | PERSISTENT | Low | EXTERNAL_BLOCKER | Browser e2e unevidenced here | Playwright re-enabled; auth not in lane |

## Contract Compliance (live adversarial)

| Exit / MUST | Status | Live proof |
| --- | --- | --- |
| Exposure matrix documented | ✅ | Task Completion Evidence + `.archive/sidebar/2026-07-10-connect-exposure/` |
| No triple MCP/A2A/API Endpoints **primary peers** | ✅ | `PRIMARY` ids: no mcp/a2a/endpoints/api-endpoints |
| Single catalog discovery SSoT | ✅ | Hub: only `CONNECT_CATALOG_SSOT_HREF`; retired path redirect-only |
| Redirects for retired paths | ✅ | `api-endpoints` → SSoT constant; `endpoint?tab=mcp\|a2a` → protocol homes |
| Hideable IDs retained | ✅ | `CONNECT_EXPOSURE_RETIRED_SIDEBAR_IDS`, mcp, a2a, endpoints, api-manager |
| Keys separate (`api-manager`) | ✅ | Ops hub link; not primary peer; not provider cards |
| No capability deleted | ✅ | MCP/A2A pages + protocol homes bar on endpoint shell |
| Unit tests leaf + redirects + hub | ✅ | connect-exposure + ops hub green post-patch |
| `typecheck:core` | ✅ | PASS |
| CHANGELOG | ✅ | Unreleased Fixed this return-review |

## Production Wiring Proof (reviewer-executed 2026-07-18)

```
PRIMARY (9): home, providers, combos, activity, analytics, costs,
             operations, settings-general, docs
  — forbidden peers mcp/a2a/endpoints/api-endpoints: none  ✅

CONNECT_CATALOG_SSOT_HREF          = /dashboard/endpoint?tab=catalog
CONNECT_RETIRED_API_ENDPOINTS_HREF = /dashboard/api-endpoints

Operations hub catalogish hrefs:
  /dashboard/endpoint
  /dashboard/endpoint?tab=catalog
  dualCatalog with retired path: false
  hubHasRetired: false  ✅

/dashboard/api-endpoints → redirect(CONNECT_CATALOG_SSOT_HREF)  ✅ (path-to-100)
/dashboard/endpoint?tab=mcp → /dashboard/mcp  ✅
/dashboard/endpoint?tab=a2a → /dashboard/a2a  ✅
Endpoint shell tabs: apis | catalog | context-sources (not mcp/a2a peers)  ✅
Protocol homes bar: role=navigation → /dashboard/mcp|a2a  ✅
```

## Frontend Quality

| Gate | Result |
| --- | --- |
| IA hierarchy | Single catalog SSoT; protocol homes separate; keys under Operations |
| Keyboard / SR | Protocol homes `role="navigation"` + aria-label; SegmentedControl endpoint sections |
| Motion | No new motion |
| Performance | Constants + server redirects |
| Type safety | `as const` href SSoTs; hub + redirect import same constant |

## Phantom-Test Proof

| Guard | Catches | Status |
| --- | --- | --- |
| connect-exposure primary peers | Re-adding mcp/a2a/api-endpoints/endpoints leaves | ✅ |
| connect-exposure hub dual-catalog | Retired path or multi catalog-ish hrefs | ✅ |
| connect-exposure redirect uses constant | Dual hardcoded catalog string in redirect page | ✅ (this review) |
| connect-exposure Header/palette | Competing brand / palette retired href | ✅ |
| ops-hub-discoverability-0059 | Required SSoT catalog; forbids retired dual | ✅ |
| dashboard-shell-tabs endpoint case | Pre-S5 mcp/a2a peer tabs | ✅ |

## Path-to-100 Applied This Review

1. **R1** — `src/app/(dashboard)/dashboard/api-endpoints/page.tsx`: `redirect(CONNECT_CATALOG_SSOT_HREF)`.
2. **Tests** — `connect-exposure-sidebar.test.ts`: require constant import + usage (not only substring `tab=catalog`).
3. **CHANGELOG** — Unreleased Fixed entry for return-review.

## Commands Run

```bash
# Live inventory (tsx) → dualCatalog=false, primaryCount=9, hubHasRetired=false

node --import tsx/esm --test \
  tests/unit/ui/connect-exposure-sidebar.test.ts \
  tests/unit/ui/operations-hub-discoverability-0059.test.ts \
  tests/unit/dashboard-shell-tabs.test.ts \
  # + expanded sidebar cluster (shared with 0025)
# → 179/179 PASS (expanded IA cluster)

npm run typecheck:core  # → PASS
```

## Commands Not Run And Why

- Authenticated Playwright on `:22000` — EXTERNAL_BLOCKER (host password ≠ e2e default); never touch `:21000` prod.
- Full `test:all` — targeted contract gates sufficient for this IA slice.

## Regression Guards (do not regress)

- Default chrome: no `api-endpoints` / mcp / a2a / endpoints **primary peers**
- `/dashboard/api-endpoints` remains **redirect only** via `CONNECT_CATALOG_SSOT_HREF` — never a discovery peer
- Operations hub may list Endpoints shell + single catalog SSoT — never dual with retired redirect path
- `endpoint?tab=mcp|a2a` → protocol homes; do not re-embed MCP/A2A as Endpoint peer tabs
- `api-manager` stays keys-separate
- Keep `protocol-visibility.spec.ts` out of Playwright `testIgnore` unless a new nav break is documented

## Scoring Notes

- Adversarial start (post dual-catalog fix verification): **97** (−3 R1 hardcoded redirect SSoT)
- Path-to-100 closed R1 → **100**
- F3 e2e EXTERNAL_BLOCKER accepted (unit + static wiring complete; suite re-enabled) → no score hold

## Task Ledger Patch Applied

See Review Ledger on task file (this return-review entry).
