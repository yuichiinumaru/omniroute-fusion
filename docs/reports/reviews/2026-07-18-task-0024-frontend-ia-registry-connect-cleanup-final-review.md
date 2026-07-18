# Review Report: Task 0024 — Frontend IA Registry Connect Cleanup — Final Review 2026-07-18

## Review Lineage

- **Current task**: Task 0024 (`frontend-ia-registry-connect-cleanup`); live path at review start: `docs/tasks/02-doing/0024-frontend-ia-registry-connect-cleanup.md`
- **Previous reports read**:
  - `docs/reports/reviews/2026-07-16-task-0024-frontend-ia-registry-connect-cleanup-reaudit.md` (86/100 REJECTED_TO_DOING)
  - `docs/reports/reviews/2026-07-11-task-0024-frontend-ia-registry-connect-cleanup-rereview.md` (96/100 APPROVED_REMEDIATION)
  - `docs/reports/reviews/2026-07-11-task-0024-frontend-ia-registry-connect-cleanup-review.md` (84/100 REJECT)
  - `docs/reports/reviews/2026-07-10-task-0024-frontend-ia-registry-connect-cleanup-review.md` (95/100)
- **Related reports considered**:
  - `docs/reports/reviews/2026-07-14-task-0059-operations-hub-ia-review.md` — hub dual-catalog regression origin
  - `docs/reports/reviews/2026-07-18-task-0023-frontend-ia-observe-unified-stream-final-review.md` — EXTERNAL_BLOCKER e2e residual accepted at 100
- **Review mode**: `final-gate` (path-to-100 re-review after builder waves 2026-07-18 + 2026-07-18b)
- **Reviewer profile**: `builders` parent; subagent `gt-frontend-quality-reviewer`
- **Skills applied**: code-quality-harness, review-report-lineage, tsjs-harness, frontend-quality-harness

## Score And Verdict

- **Score**: `100/100`
- **Verdict**: `ACCEPTED_100`
- **Lane recommendation**: `hold-in-review` (moved to `docs/tasks/03-review/` — parent promotes to completed)

## Delta Summary

### Resolved Since Previous Review (2026-07-16 reaudit @ 86)

- `RESOLVED` **F5** dual catalog REGRESSION — Operations hub no longer lists retired `/dashboard/api-endpoints` as a discovery peer; only `CONNECT_CATALOG_SSOT_HREF` (`/dashboard/endpoint?tab=catalog`).
- `RESOLVED` **F6** phantom-test gap — `connect-exposure-sidebar.test.ts` + `operations-hub-discoverability-0059.test.ts` now assert single catalog SSoT and explicitly forbid retired path in hub hrefs.
- `RESOLVED` path-to-100 step 4 — Header brands retired path as **API Catalog** alias (`menu_book` / `endpointDescription`), not competing "API Endpoints".
- `RESOLVED` typed SSoT constants — `CONNECT_CATALOG_SSOT_HREF` / `CONNECT_RETIRED_API_ENDPOINTS_HREF` exported from `sidebarVisibility.ts`; hub card imports SSoT.
- `RESOLVED` (partial) **F3** suite enablement — `protocol-visibility.spec.ts` removed from Playwright `testIgnore` so CI/auth-ready envs can run it.

### Persistent Findings

- none in-scope that block ACCEPT

### Regressions

- none (F5 dual-catalog fully reversed)

### New Findings

- none

### Evidence Gaps / External Blockers

- `EXTERNAL_BLOCKER` (accepted residual, **non-blocking**): authenticated Playwright run against local `:22000` failed login (`Invalid password` — e2e default `omniroute-e2e-password` ≠ server password). Spec is re-enabled; unit + static wiring fully prove S5 IA contract. Same residual class as Task 0023 final review.

## Findings

| ID | Class | Severity | Status | Summary | First seen | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| F1 | RESOLVED | High | Still resolved | Shell tabs S5 `apis\|catalog\|context-sources` | 2026-07-11 | `EndpointPageClient.tsx` + `dashboard-shell-tabs` endpoint assert PASS |
| F2 | RESOLVED | Medium | Still resolved | `?tab=mcp\|a2a` redirects | 2026-07-11 | `endpoint/page.tsx` + connect-exposure tests PASS |
| F3 | PERSISTENT | Low | EXTERNAL_BLOCKER accepted | Browser e2e unevidenced on this host (auth) | 2026-07-10 | Spec re-enabled; login blocked on `:22000` |
| F4 | PERSISTENT | Info | SUPERSEDED | Dead pillar arrays / EXPOSURES_GROUP | 2026-07-11 | Flat PRIMARY chrome; dead arrays cleaned in 0025 wave |
| F5 | RESOLVED | Medium | Closed | Dual catalog via Operations hub | 2026-07-16 | `operationsHub.ts` single catalog card + tests |
| F6 | RESOLVED | Medium | Closed | 0024 tests missed hub dual homes | 2026-07-16 | dual-catalog + discovery guards green |

## Contract Compliance (live)

| Exit / MUST | Status | Live proof |
| --- | --- | --- |
| Exposure matrix documented | ✅ | Task Completion Evidence + `.archive/sidebar/2026-07-10-connect-exposure/SNAPSHOT.md` + PROVENANCE-INDEX |
| No triple MCP/A2A/API Endpoints **primary peers** | ✅ | `PRIMARY_SIDEBAR_ITEMS` (9): no mcp/a2a/endpoints/api-endpoints |
| Single clear catalog home | ✅ | Hub + constants: only `CONNECT_CATALOG_SSOT_HREF`; retired path redirect-only |
| Redirects for retired paths | ✅ | `api-endpoints/page.tsx` → catalog; `endpoint?tab=mcp\|a2a` → protocol homes |
| Hideable IDs retained | ✅ | `CONNECT_EXPOSURE_RETIRED_SIDEBAR_IDS`, mcp, a2a, endpoints, api-manager |
| Keys separate (`api-manager`) | ✅ | Operations hub link; not provider cards; not primary peer |
| No capability deleted | ✅ | MCP/A2A pages mount dashboards; catalog via shell tab |
| Unit tests leaf + redirects + hub | ✅ | connect-exposure + ops hub suites green |
| Manual/e2e smoke | ⚠️ residual | EXTERNAL_BLOCKER auth; unit mounts + redirects cover |
| `typecheck:core` | ✅ | PASS |
| CHANGELOG | ✅ | Unreleased Fixed entries for S5 + path-to-100 |

## Production Wiring Proof (2026-07-18)

```
PRIMARY_SIDEBAR_ITEMS (9)
  home, providers, combos, activity, analytics, costs,
  operations → /dashboard/operations, settings-general, docs
  — no mcp / a2a / endpoints / api-endpoints peers  ✅

CONNECT_CATALOG_SSOT_HREF         = /dashboard/endpoint?tab=catalog
CONNECT_RETIRED_API_ENDPOINTS_HREF = /dashboard/api-endpoints  (redirect-only)

/dashboard/api-endpoints          → redirect → CONNECT catalog SSoT  ✅
/dashboard/endpoint?tab=mcp       → redirect → /dashboard/mcp  ✅
/dashboard/endpoint?tab=a2a       → redirect → /dashboard/a2a  ✅
/dashboard/endpoint               → EndpointPageClient (apis|catalog|context-sources)
/dashboard/mcp | /dashboard/a2a   → capability retained  ✅

Operations hub API/Endpoints group (single catalog home):
  API Keys      → /dashboard/api-manager
  Endpoints     → /dashboard/endpoint
  API Catalog   → CONNECT_CATALOG_SSOT_HREF   ← only catalog discovery peer
  MCP Server    → /dashboard/mcp
  A2A Server    → /dashboard/a2a
  — NOT listed: /dashboard/api-endpoints  ✅

Header retired path: titleFallback "API Catalog", icon menu_book  ✅
CommandPalette: no hardcoded /dashboard/api-endpoints  ✅
Endpoint shell: protocol homes nav (role=navigation) → /dashboard/mcp|a2a  ✅
  status dots: role=img + aria-label  ✅
```

## Frontend Quality Notes

| Surface | Assessment |
| --- | --- |
| IA hierarchy | Single Operations hub discovery; no triple peers |
| Keyboard / SR | Protocol homes `role="navigation"` + labeled status dots; SegmentedControl `aria-label="Endpoint sections"` |
| Focus / links | Standard Next `Link` targets for protocol homes |
| Motion | No new motion debt |
| Performance | Constants-only + server redirects — no client bundle bloat |
| Type safety | Exported `as const` href SSoTs; hub imports constant |

## Phantom-Test Proof (updated)

| Guard | What it catches | Status |
| --- | --- | --- |
| `connect-exposure-sidebar` primary peers | Re-adding mcp/a2a/api-endpoints/endpoints to default leaves | ✅ |
| `connect-exposure` hub dual-catalog | Re-listing retired path or dual catalogish hrefs in ops hub | ✅ |
| `connect-exposure` Header/palette | Competing "API Endpoints" brand; palette href to retired path | ✅ |
| `operations-hub-discoverability-0059` | Required SSoT catalog; forbids retired dual | ✅ |
| `dashboard-shell-tabs` endpoint case | Pre-S5 mcp/a2a peer tabs; re-embed MCP/A2A dashboards | ✅ (endpoint assert PASS) |
| `protocol-visibility` e2e | Live protocol homes bar + page mounts | Re-enabled; host auth EXTERNAL_BLOCKER |

Note: `dashboard-shell-tabs` has an **unrelated** failing settings-root assert (`buildSettingsPath` SSoT drift from Task 0054/0025). Out of scope for 0024; endpoint S5 case is green.

## Evidence Reviewed

- Task 0024 Completion Evidence + Review Ledger (builder waves 2026-07-18 + 2026-07-18b)
- `src/shared/constants/operationsHub.ts`
- `src/shared/constants/sidebarVisibility.ts` (PRIMARY, CONNECT_*, hideables)
- `api-endpoints/page.tsx`, `endpoint/page.tsx`, `EndpointPageClient.tsx` (tabs + protocol bar)
- `Header.tsx` OPERATIONS_DEEP_HEADER_META api-endpoints alias
- `CommandPalette.tsx` operations extras
- `.archive/sidebar/2026-07-10-connect-exposure/SNAPSHOT.md` + PROVENANCE-INDEX
- `playwright.config.ts` testIgnore
- Tests: connect-exposure, ops hub 0059, shell-tabs (endpoint)

## Commands Run

```text
# Dual-catalog + primary peer programmatic audit
→ dualCatalog=false, catalogish=[CONNECT_CATALOG_SSOT_HREF], primaryCount=9

node --import tsx/esm --test \
  tests/unit/ui/connect-exposure-sidebar.test.ts \
  tests/unit/ui/operations-hub-discoverability-0059.test.ts
→ 25/25 PASS (when run alone; shell-tabs settings fail is out-of-scope)

# Endpoint S5 shell assert
node --import tsx/esm --test tests/unit/dashboard-shell-tabs.test.ts
→ endpoint S5 case PASS; settings case FAIL (unrelated)

npm run typecheck:core → PASS

# E2E attempt (test server only — never :21000)
DASHBOARD_PORT=22000 npx playwright test tests/e2e/protocol-visibility.spec.ts
→ login Invalid password on :22000 (EXTERNAL_BLOCKER)
```

## Commands Not Run And Why

- Full `test:all` / `test:e2e` suite — out of residual scope; targeted gates suffice
- Authenticated browser smoke with correct `INITIAL_PASSWORD` — not available in this lane without mutating host secrets

## Path To 100

**Reached 100** for in-scope contract. Optional post-accept hygiene (non-blocking):

1. Run `protocol-visibility.spec.ts` in CI / operator env with matching `OMNIROUTE_E2E_PASSWORD` / `INITIAL_PASSWORD`.
2. Unrelated: repair `dashboard-shell-tabs` settings-root assert for `buildSettingsPath("general")` (Task 0025/0054 surface).

## Regression Guards

- Default chrome: no `api-endpoints` / mcp / a2a / endpoints **primary peers**
- `/dashboard/api-endpoints` remains **redirect only**, not a discovery peer (Operations hub, palette, Header competing brand)
- Operations hub may list Endpoints shell + single catalog via `CONNECT_CATALOG_SSOT_HREF` — never dual with retired redirect path
- `endpoint?tab=mcp|a2a` → protocol homes; do not re-embed MCP/A2A as Endpoint peer tabs
- `api-manager` stays keys-separate (not provider cards)
- `dashboard-shell-tabs` endpoint case must not reintroduce pre-S5 MCP/A2A tab asserts
- Keep `protocol-visibility.spec.ts` **out of** `testIgnore` unless a new nav break is documented

## Scoring Notes

- Start 100
- F5 dual catalog: closed → 0
- F6 phantom tests: closed → 0
- F3 e2e: EXTERNAL_BLOCKER accepted (unit/static proof complete; suite re-enabled) → 0
- **= 100** → move to `03-review`

## Task Ledger Patch Suggestion

```markdown
### Final review (2026-07-18) — gt-frontend-quality-reviewer

- **Score**: 100/100 ACCEPTED_100
- **Full report**: `docs/reports/reviews/2026-07-18-task-0024-frontend-ia-registry-connect-cleanup-final-review.md`
- **Closed**: F5 dual catalog, F6 phantom guards, Header SSoT brand, typed href constants, e2e un-ignore
- **Residual**: F3 EXTERNAL_BLOCKER host auth for Playwright (non-blocking)
- **Lane**: `docs/tasks/03-review/`
```
