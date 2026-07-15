# Review Report: Task 0024 — Frontend IA Registry Connect Cleanup — Re-review 2026-07-11

## Review Lineage

- **Current task**: Task 0024 (`frontend-ia-registry-connect-cleanup`); live path at review start: `docs/tasks/03-review/0024-frontend-ia-registry-connect-cleanup.md`
- **Previous reports read**:
  - `docs/reports/reviews/2026-07-11-task-0024-frontend-ia-registry-connect-cleanup-review.md` (84/100 REJECT — shell-tabs pre-S5 + incomplete redirect unit matrix)
  - `docs/reports/reviews/2026-07-10-task-0024-frontend-ia-registry-connect-cleanup-review.md` (95/100 held for e2e; path-to-100 a11y/URL/provenance patches)
- **Related reports considered**:
  - `docs/reports/builders/2026-07-11-nav-tree-gap-routing-registry.md` (flat L0; exposures deep-link / hub-shell gap — discovery, not capability deletion)
- **Review mode**: `re-review` (independent code-quality gate after path-to-100 rework of F1/F2)

## Score And Verdict

- **Score**: `96/100`
- **Verdict**: `APPROVED_REMEDIATION` / `PASS WITH NOTES`
- **Lane recommendation**: `hold-in-review` (S ≥ 90 — remains in `docs/tasks/03-review/`; human/parent promote only)

## Delta Summary

### Resolved Since Previous Review (84 REJECT)

- `RESOLVED` F1 (High): `tests/unit/dashboard-shell-tabs.test.ts` endpoint case rewritten to S5 contract:
  - `EndpointTab = "apis" | "catalog" | "context-sources"`
  - catalog mounts `ApiEndpointsTab`
  - protocol homes links `/dashboard/mcp` + `/dashboard/a2a`
  - asserts MCP/A2A dashboards are **not** re-embedded as peer tabs
  - **live pass** (was FAIL under pre-S5 `mcp|a2a` peer assert)
- `RESOLVED` F2 (Medium): `tests/unit/ui/connect-exposure-sidebar.test.ts` now unit-asserts `endpoint/page.tsx` redirects:
  - `tab === "mcp"` → `redirect("/dashboard/mcp")`
  - `tab === "a2a"` → `redirect("/dashboard/a2a")`
  - plus existing catalog redirect soft-check for `api-endpoints/page.tsx`
- `RESOLVED` F4 (Info): `mcpStatus` / `a2aStatus` typed `Record<string, unknown> | null` (no longer bare `any`)

### Persistent Findings

- `PERSISTENT` (Low / accepted residual): Playwright `tests/e2e/protocol-visibility.spec.ts` / browser smoke still not executed with attached evidence in this lane (auth/session external). Unit + static wiring prove SSoT, redirects, and shell contract.

### Regressions / New Findings

- none vs 84 REJECT or prior accepted repairs (status-dot a11y, `writeTabSearchParam`, PROVENANCE-INDEX, CHANGELOG wording still present).
- `NOTE` (Info / accepted): Conceptual `EXPOSURES_GROUP` / `REGISTRY_ITEMS` remain defined in `sidebarVisibility.ts` but are not wired into live `SIDEBAR_SECTIONS` (flat `PRIMARY_SIDEBAR_ITEMS`). Same class as other pre-flat arrays; discovery of Connect/MCP/A2A is deep-link / hub oriented — not a capability deletion for S5.

### Evidence Gaps / External Blockers

- `EXTERNAL_BLOCKER`: Authenticated browser/e2e not re-run. Does **not** drive S < 90; residual −4 to 100 only.

## Findings

| ID | Class | Severity | Status | Summary | First seen | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| F1 | NEW→RESOLVED | High | Resolved (builder rework) | Stale shell-tabs unit test pre-S5 | 2026-07-11 reject | `dashboard-shell-tabs.test.ts` S5 case; 5/5 pass |
| F2 | NEW→RESOLVED | Medium | Resolved (builder rework) | Redirect matrix incomplete for `?tab=mcp\|a2a` | 2026-07-11 reject | `connect-exposure-sidebar.test.ts` endpoint redirect cases |
| F3 | PERSISTENT | Low | Accepted residual | Browser / e2e not re-run with evidence | 2026-07-10 | `tests/e2e/protocol-visibility.spec.ts` |
| F4 | PERSISTENT→RESOLVED | Info | Resolved | `any` on protocol status state | 2026-07-10 | `EndpointPageClient.tsx:171-172` now `Record<string, unknown>` |
| F5 | NOTE | Info | Accepted residual | Dead conceptual exposures group after flat nav | 2026-07-11 reject | `EXPOSURES_GROUP` unused by `SIDEBAR_SECTIONS` |

## Evidence Reviewed

### Task file(s)

- `docs/tasks/03-review/0024-frontend-ia-registry-connect-cleanup.md` (status Ready for review; path-to-100 rework note present)

### Source / test / archive (live)

| Claim | Live proof | Status |
| --- | --- | --- |
| Exposure matrix | Task Completion Evidence + `.archive/sidebar/2026-07-10-connect-exposure/SNAPSHOT.md` | PASS |
| No triple MCP/A2A/API Endpoints peers in default chrome | Flat primary leaves; unit asserts no `mcp`/`a2a`/`api-endpoints`/`endpoints` peers | PASS |
| Catalog redirect | `api-endpoints/page.tsx` → `redirect("/dashboard/endpoint?tab=catalog")` | PASS |
| Protocol tab redirects | `endpoint/page.tsx` `tab===mcp\|a2a` → protocol homes; **unit-asserted** | PASS |
| Shell tabs post-S5 | `EndpointTab = "apis" \| "catalog" \| "context-sources"`; catalog → `ApiEndpointsTab`; protocol bar links | PASS |
| No re-embedded MCP/A2A peer tabs | Shell test asserts no `<McpDashboardPage` / `<A2ADashboard` in client; homes mount components | PASS |
| Capabilities retained | `/dashboard/mcp` imports `MCPDashboard`; `/dashboard/a2a` imports `A2ADashboard` | PASS |
| Hideable retention | `api-endpoints`, `mcp`, `a2a`, `endpoints` in `HIDEABLE_SIDEBAR_ITEM_IDS`; `CONNECT_EXPOSURE_RETIRED_SIDEBAR_IDS = ["api-endpoints"]` | PASS |
| Keys separate | `api-manager` remains primary leaf | PASS |
| Prior path-to-100 repairs | `role="img"` + `aria-label` dots; `writeTabSearchParam`; PROVENANCE-INDEX row; CHANGELOG | PASS |
| Archive + index | SNAPSHOT + `.archive/PROVENANCE-INDEX.md` connect-exposure row | PASS |
| Related shell unit | `dashboard-shell-tabs.test.ts` **5/5 PASS** | PASS |
| Connect + related sidebar units | see commands below — **64/64 PASS** | PASS |
| typecheck:core | `npm run typecheck:core` → exit 0 | PASS |
| e2e / manual smoke | Not executed this review | Gap (residual) |

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
node --import tsx/esm --test \
  tests/unit/dashboard-shell-tabs.test.ts \
  tests/unit/ui/connect-exposure-sidebar.test.ts \
  tests/unit/sidebar-visibility.test.ts \
  tests/unit/ui/sidebar-engine-items.test.ts \
  tests/unit/sidebar-monitoring-reorg.test.ts \
  tests/unit/ui/sidebar-seven-pillars.test.ts
→ 64/64 PASS (0 fail)
  including:
  ✔ endpoint page uses S5 tabs + protocol homes (not embedded MCP/A2A peers)
  ✔ endpoint page redirects tab=mcp to /dashboard/mcp
  ✔ endpoint page redirects tab=a2a to /dashboard/a2a
  ✔ api-endpoints page redirects to catalog

npm run typecheck:core → EXIT:0
```

### Commands not run and why

- `tests/e2e/protocol-visibility.spec.ts` — needs dashboard auth/browser; unit/static wiring used for homes links + mount imports.
- Full app runtime smoke — same constraint.

### Stale-evidence notes

- Reject report’s FAIL on `dashboard-shell-tabs` is closed by builder rework; current source no longer asserts pre-S5 peers.
- Task exit note “targeted unit tests … re-opened” is stale vs live 64/64 green (ledger updated this re-review).
- Prior review’s live tree description (registry accordion exposures) remains historical vs flat primary; product redirects/homes still hold.

## Contract Compliance

| Exit condition | Status |
| --- | --- |
| Exposure matrix written | PASS |
| No triple MCP/A2A/API Endpoints peers | PASS |
| Redirects for retired paths | PASS (code + unit matrix including `?tab=mcp\|a2a`) |
| Hideable IDs retained | PASS |
| Provenance under `.archive/sidebar/` | PASS |
| Unit tests leaf set + redirects | PASS |
| Related shell S5 contract unit | PASS |
| Capabilities not deleted | PASS |
| Keys not merged into Providers | PASS |
| typecheck:core | PASS |
| CHANGELOG | PASS |
| Manual / e2e smoke | Deferred (accepted residual) |

## Path To 100

1. **Residual only**: Run Playwright `tests/e2e/protocol-visibility.spec.ts` (or operator browser smoke) with evidence:
   - Connect shell `data-testid="connect-protocol-homes"` links
   - `/dashboard/mcp` and `/dashboard/a2a` mount without error
2. Optional (non-blocking): remove unused conceptual `EXPOSURES_GROUP` wiring or document as intentional pillar map for Task 0025 — do **not** reintroduce triple peers.
3. Do **not** undo accepted repairs (S5 shell, redirects, status-dot a11y, `?tab=` URL sync, PROVENANCE-INDEX, CHANGELOG, typed status state).

## Task Ledger Patch Applied

```markdown
### Latest Review
- Date: 2026-07-11 (re-review)
- Score: 96/100
- Verdict: APPROVED_REMEDIATION / PASS WITH NOTES — hold in 03-review
- Full report: docs/reports/reviews/2026-07-11-task-0024-frontend-ia-registry-connect-cleanup-rereview.md
- Open blockers: none (e2e smoke residual only)
```

## Lane Outcome

- **Moved**: no (stays `docs/tasks/03-review/`)
- **Patched**: task ledger + exit evidence only; no product code patches required this re-review
- **Promote to `04-completed/`**: human/parent only (reviewer authority ends here)
