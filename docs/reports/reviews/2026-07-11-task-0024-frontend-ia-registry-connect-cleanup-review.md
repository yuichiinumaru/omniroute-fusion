# Review Report: Task 0024 — Frontend IA Registry Connect Cleanup — 2026-07-11

## Review Lineage

- **Current task**: Task 0024 (`frontend-ia-registry-connect-cleanup`); live path at review start: `docs/tasks/03-review/0024-frontend-ia-registry-connect-cleanup.md`
- **Previous reports read**:
  - `docs/reports/reviews/2026-07-10-task-0024-frontend-ia-registry-connect-cleanup-review.md` (95/100, held for e2e/smoke)
- **Related reports considered**:
  - `docs/reports/builders/2026-07-11-nav-tree-gap-routing-registry.md` (flat L0; exposures deep-link / hub-shell gap)
- **Review mode**: `re-review` (independent code-quality gate after prior path-to-100 hold)

## Score And Verdict

- **Score**: `84/100`
- **Verdict**: `NEEDS FIX` / `REJECT`
- **Lane recommendation**: `return-to-doing` (S < 90 — move to `docs/tasks/02-doing/`)

## Delta Summary

### Resolved Since Previous Review
- Prior reviewer patches still present: protocol status-dot a11y (`role="img"` + `aria-label`), Connect `?tab=` URL sync via `writeTabSearchParam`, PROVENANCE-INDEX row, CHANGELOG Registry wording.
- Product S5 wiring still live: catalog redirect, protocol tab redirects, protocol homes pages, hideable `api-endpoints`, `CONNECT_EXPOSURE_RETIRED_SIDEBAR_IDS`.

### Persistent Findings
- `PERSISTENT` (Low): Playwright `protocol-visibility.spec.ts` / browser smoke still not executed with attached evidence.
- `PERSISTENT` (Info): `mcpStatus` / `a2aStatus` still typed `any` in `EndpointPageClient.tsx`.

### Regressions / New Findings
- `NEW` (High): `tests/unit/dashboard-shell-tabs.test.ts` still encodes **pre-S5** contract (`EndpointTab = "apis" | "mcp" | "a2a"` + embedded `McpDashboardPage` / `A2ADashboardPage`). **Fails live** against post-S5 shell (`apis | catalog | context-sources` + protocol home links). Undermines “targeted unit tests pass” / regression-guard claims.
- `NEW` (Medium): `tests/unit/ui/connect-exposure-sidebar.test.ts` redirect coverage is incomplete vs Test Requirements matrix — only soft-checks `api-endpoints` page for `"redirect" || "tab=catalog"`; **no unit assert** that `endpoint/page.tsx` redirects `?tab=mcp|a2a`.
- `NOTE` (Evidence drift, not S5 functional fail): Live chrome is flat 10-leaf `PRIMARY_SIDEBAR_ITEMS`; conceptual `EXPOSURES_GROUP` / `REGISTRY_ITEMS` remain defined but **unreferenced** by `SIDEBAR_SECTIONS` (post-S6/flat-nav). Discovery of Connect/MCP/A2A from Providers hub is still deep-link oriented (tracked in nav-tree gap assessment), not a capability deletion.

### Evidence Gaps / External Blockers
- `EXTERNAL_BLOCKER`: e2e/browser smoke for protocol homes not run in this lane (auth/session). Does **not** alone drive S < 90; the failing unit suite does.

## Findings

| ID | Class | Severity | Status | Summary | First seen | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| F1 | NEW | High | Open | Stale shell-tabs unit test asserts pre-S5 MCP/A2A peer tabs | 2026-07-11 this report | `tests/unit/dashboard-shell-tabs.test.ts:37-47` fails vs `EndpointPageClient.tsx` |
| F2 | NEW | Medium | Open | Redirect matrix unit tests incomplete for `?tab=mcp|a2a` | 2026-07-11 this report | `connect-exposure-sidebar.test.ts` only covers `api-endpoints` |
| F3 | PERSISTENT | Low | Open | Browser / e2e not re-run with evidence | 2026-07-10 | `tests/e2e/protocol-visibility.spec.ts` |
| F4 | PERSISTENT | Info | Open residual | `any` on protocol status state | 2026-07-10 | `EndpointPageClient.tsx:171-172` |

## Evidence Reviewed

### Task file(s)
- `docs/tasks/03-review/0024-frontend-ia-registry-connect-cleanup.md`

### Source / test / archive (live)

| Claim | Live proof | Status |
| --- | --- | --- |
| Exposure matrix | Task Completion Evidence + `.archive/sidebar/2026-07-10-connect-exposure/SNAPSHOT.md` | PASS |
| No triple MCP/A2A/API Endpoints peers in default chrome | Default leaves = 10 primary hubs; no `mcp`/`a2a`/`api-endpoints`/`endpoints` | PASS (stronger than original S5) |
| Catalog redirect | `api-endpoints/page.tsx` → `redirect("/dashboard/endpoint?tab=catalog")` | PASS |
| Protocol tab redirects | `endpoint/page.tsx` redirects `tab===mcp|a2a` | PASS (code) |
| Shell tabs post-S5 | `EndpointTab = "apis" \| "catalog" \| "context-sources"`; catalog mounts `ApiEndpointsTab`; protocol bar → `/dashboard/mcp` \| `/dashboard/a2a` | PASS (product) |
| Capabilities retained | `/dashboard/mcp` mounts `MCPDashboard`; `/dashboard/a2a` mounts `A2ADashboard` | PASS |
| Hideable retention | `api-endpoints`, `mcp`, `a2a`, `endpoints` in `HIDEABLE_SIDEBAR_ITEM_IDS`; `CONNECT_EXPOSURE_RETIRED_SIDEBAR_IDS = ["api-endpoints"]` | PASS |
| Keys separate | `api-manager` remains primary leaf | PASS |
| Archive + index | SNAPSHOT + PROVENANCE-INDEX row | PASS |
| CHANGELOG | Unreleased Task 0024 bullet | PASS |
| Unit suite for S5 | `connect-exposure-sidebar.test.ts` + related sidebar suites **pass** | PASS partial |
| Related endpoint shell unit | `dashboard-shell-tabs.test.ts` endpoint case **FAILS** | **FAIL** |
| typecheck:core | `npm run typecheck:core` → exit 0 | PASS |
| e2e / manual smoke | Not executed this review | Gap |

### Runtime wiring proof (current)

```
PRIMARY_SIDEBAR_ITEMS (default chrome)
  home, providers, combos, api-manager, activity, analytics,
  costs, cli-code, settings-general, docs
  — no mcp / a2a / endpoints / api-endpoints peers

/dashboard/api-endpoints          → redirect → /dashboard/endpoint?tab=catalog
/dashboard/endpoint?tab=mcp       → redirect → /dashboard/mcp
/dashboard/endpoint?tab=a2a       → redirect → /dashboard/a2a
/dashboard/endpoint               → EndpointPageClient
  tabs apis|catalog|context-sources
  protocol homes bar → /dashboard/mcp | /dashboard/a2a
  catalog → ApiEndpointsTab
/dashboard/mcp                    → McpPage + MCPDashboard (capability retained)
/dashboard/a2a                    → A2APage + A2ADashboard (capability retained)

Conceptual (not wired to SIDEBAR_SECTIONS):
  EXPOSURES_GROUP / REGISTRY_ITEMS still defined in sidebarVisibility.ts
```

### Commands run

```text
node --import tsx/esm --test tests/unit/ui/connect-exposure-sidebar.test.ts tests/unit/sidebar-visibility.test.ts
→ 12/12 PASS

node --import tsx/esm --test tests/unit/ui/connect-exposure-sidebar.test.ts \
  tests/unit/ui/sidebar-engine-items.test.ts tests/unit/sidebar-monitoring-reorg.test.ts \
  tests/unit/ui/sidebar-seven-pillars.test.ts
→ 50/50 PASS

node --import tsx/esm --test tests/unit/dashboard-shell-tabs.test.ts
→ 4/5 PASS, 1 FAIL
  FAIL: "endpoint page keeps APIs, MCP, and A2A as in-page tabs"
  AssertionError: type EndpointTab = "apis" | "mcp" | "a2a" not in source

npm run typecheck:core → EXIT:0
```

### Commands not run and why
- `tests/e2e/protocol-visibility.spec.ts` — needs dashboard auth/browser; unit/static wiring used for homes links.
- Full app runtime smoke — same constraint.

### Stale-evidence notes
- Prior review’s live tree description (`registry → EXPOSURES_GROUP → endpoints,mcp,a2a,webhooks`) is **historical** relative to current flat `PRIMARY_SIDEBAR_ITEMS`. Product redirects/homes still hold; chrome membership evolved after S6/flat-nav.
- Builder “51/51” suite no longer matches current related file set; re-ran live subsets above.
- Task exit “targeted unit tests pass” is incomplete while `dashboard-shell-tabs` endpoint case fails.

## Contract Compliance

| Exit condition | Status |
| --- | --- |
| Exposure matrix written | PASS |
| No triple MCP/A2A/API Endpoints peers | PASS |
| Redirects for retired paths | PASS (code); unit coverage incomplete (F2) |
| Hideable IDs retained | PASS |
| Provenance under `.archive/sidebar/` | PASS |
| Unit tests leaf set + redirects | **PARTIAL** — leaf policy pass; redirect matrix incomplete; related shell test fails |
| Capabilities not deleted | PASS |
| Keys not merged into Providers | PASS |
| typecheck:core | PASS |
| CHANGELOG | PASS |
| Manual smoke | Deferred |

## Path To 100

1. **Required**: Rewrite `tests/unit/dashboard-shell-tabs.test.ts` endpoint case to S5 contract:
   - `EndpointTab = "apis" | "catalog" | "context-sources"`
   - catalog mounts `ApiEndpointsTab`
   - protocol homes bar links to `/dashboard/mcp` and `/dashboard/a2a`
   - assert MCP/A2A dashboards are **not** re-embedded as peer tabs
2. **Required**: Extend `tests/unit/ui/connect-exposure-sidebar.test.ts` (or sibling) to read `endpoint/page.tsx` and assert redirects for `tab=mcp` → `/dashboard/mcp` and `tab=a2a` → `/dashboard/a2a`.
3. **Required for green evidence**: Re-run failing file + connect suite; paste pass output.
4. **Residual → 100**: Run Playwright `protocol-visibility.spec.ts` or operator browser smoke; optional type `mcpStatus`/`a2aStatus`.

## Task Ledger Patch Suggestion

```markdown
### Latest Review
- Date: 2026-07-11
- Score: 84/100
- Verdict: REJECT / return to 02-doing
- Full report: docs/reports/reviews/2026-07-11-task-0024-frontend-ia-registry-connect-cleanup-review.md
- Blockers: F1 stale dashboard-shell-tabs endpoint assert; F2 incomplete redirect unit matrix
```
