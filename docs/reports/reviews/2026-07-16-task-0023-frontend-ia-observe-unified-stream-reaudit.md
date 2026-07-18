# Review Report: Task 0023 — Frontend IA Observe Unified Stream — Re-audit 2026-07-16

## Review Lineage

- **Current task**: Task 0023 (`frontend-ia-observe-unified-stream`); live path `docs/tasks/03-review/0023-frontend-ia-observe-unified-stream.md`
- **Previous reports read**:
  - `docs/reports/reviews/2026-07-11-task-0023-frontend-ia-observe-unified-stream-review.md` (99/100 APPROVED_REMEDIATION)
  - `docs/reports/reviews/2026-07-10-task-0023-frontend-ia-observe-unified-stream-review.md` (96/100)
- **Related reports considered**:
  - Task 0061 observe/health subnav reopen (topbar unity; must not break S4 redirects)
  - Task 0059 operations hub (out of observe stream scope)
- **Review mode**: `re-review` (adversarial re-audit after later IA waves 0056+)
- **Reviewer profile**: `reviewers` (agentID=reviewers)
- **Skills applied**: code-quality-harness, review-report-lineage, tsjs-harness, frontend-quality-harness

## Score And Verdict

- **Score**: `92/100`
- **Verdict**: `HELD_IN_REVIEW_PATH_TO_100` / `PASS WITH NOTES`
- **Lane recommendation**: `hold-in-review` (S ≥ 90 — stay in `docs/tasks/03-review/`)

## Delta Summary

### Resolved Since Previous Review

- none required (S4 core contract still live)

### Persistent Findings

- `PERSISTENT` (Low / accepted residual): authenticated browser deep-link smoke not re-run this lane
- `PERSISTENT` (Info): pre-flat arrays such as `OBSERVABILITY_ITEMS` remain dead after flat primary nav

### Regressions

- none on primary S4 invariants (single `activity` hub; matrix redirects; hideable retention)

### New Findings

- `NEW` (Medium): `/dashboard/usage?tab=limits` is still linked from `ProviderQuotaWidget` but `usage/page.tsx` unconditionally redirects to Observe request stream, dropping `tab` and mis-routing operators away from Provider Limits (`/dashboard/quota`)
- `NEW` (Low / test honesty): observe unit suite does not assert inbound callers of `/dashboard/usage*` or query-param preservation
- `NEW` (Info): `ObserveHubClient.tsx` still defines unused `OBSERVE_TABS` (+ helper surface) after `ObserveHubSubnav` extraction (Task 0061) — dead chrome, not a dual-home

### Evidence Gaps / External Blockers

- `EXTERNAL_BLOCKER` (accepted residual): no authenticated Playwright/browser session for Completion Evidence smoke list

## Findings

| ID | Class | Severity | Status | Summary | First seen | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| F1 | PERSISTENT | Low | Accepted residual | Browser deep-link smoke deferred | 2026-07-10 | No dashboard session this lane |
| F2 | PERSISTENT | Info | Accepted residual | Dead `OBSERVABILITY_ITEMS` after flat nav | 2026-07-11 | `sidebarVisibility.ts` pre-flat arrays |
| F3 | NEW | Medium | Open | `usage?tab=limits` deep link broken by S4 usage→request redirect | 2026-07-16 this reaudit | `ProviderQuotaWidget.tsx:296` → `usage/page.tsx` → `buildObserveHubPath("request")`; real home = `quota/page.tsx` + `ProviderLimits` |
| F4 | NEW | Low | Open | Tests do not catch F3 | 2026-07-16 | `observe-hub-sidebar.test.ts` asserts matrix pages only |
| F5 | NEW | Info | Open residual | Dead `OBSERVE_TABS` in hub client | 2026-07-16 | `ObserveHubClient.tsx` defines tabs never referenced after subnav split |

## Contract Compliance (live)

| Exit / MUST | Status | Live proof |
| --- | --- | --- |
| Single Observe hub route | ✅ | `/dashboard/activity` + `ObserveHubClient` |
| ≤1 stream hub in default chrome | ✅ | `PRIMARY_SIDEBAR_ITEMS` has `activity` only; no logs/audit peers |
| Redirect matrix | ✅ | All 8 `OBSERVE_REDIRECT_MATRIX` pages still server-redirect via `buildObserveHubPath` |
| Hideable retention | ✅ | All `OBSERVE_STREAM_SIDEBAR_IDS` + `activity` in `HIDEABLE_SIDEBAR_ITEM_IDS` |
| No god-logger | ✅ | Hub composes domain viewers behind `?source=` |
| Archive provenance | ✅ | `.archive/sidebar/2026-07-10-observe-stream/` + PROVENANCE-INDEX |
| Deep links preserve intent | ⚠️ | Path-level redirects OK; **usage query tabs not preserved** (F3) |
| Unit tests leaf + redirects | ✅ (partial) | Leaf + matrix green; F3 unguarded |

## Production Wiring Proof (2026-07-16)

```
PRIMARY_SIDEBAR_ITEMS (9 hubs)
  activity → /dashboard/activity (Observe)
  — no logs / logs-proxy / logs-console / audit* peers

OBSERVE_REDIRECT_MATRIX (8) → server redirect/permanentRedirect pages:
  /dashboard/logs[/*], /dashboard/audit[/*], /dashboard/usage
  → /dashboard/activity?source=…

Hub: ObserveHubClient + ObserveHubSubnav(?source=)
  → ActivityFeed | RequestLogsPanel | ProxyLogger | ConsoleLogViewer
  → ComplianceTab | McpAuditTab | A2aAuditTab

BROKEN caller (not matrix-covered):
  /home ProviderQuotaWidget → /dashboard/usage?tab=limits
    → redirect(/dashboard/activity?source=request)  // loses limits intent
  Real limits UI: /dashboard/quota → ProviderLimits
```

## Evidence Reviewed

- Task file + Review Ledger (prior 99)
- `src/shared/constants/observeHub.ts`
- `src/shared/constants/sidebarVisibility.ts` (`PRIMARY_SIDEBAR_ITEMS`)
- Redirect pages under `logs/**`, `audit/**`, `usage/page.tsx`
- `activity/ObserveHubClient.tsx`, `ObserveHubSubnav.tsx`
- `ProviderQuotaWidget.tsx`, `quota/page.tsx`
- Archive + CHANGELOG S4 entries
- Tests: `tests/unit/ui/observe-hub-sidebar.test.ts` (+ related sidebar suites)

## Commands Run

```text
node --import tsx/esm --test \
  tests/unit/ui/observe-hub-sidebar.test.ts \
  tests/unit/ui/connect-exposure-sidebar.test.ts \
  tests/unit/ui/sidebar-naming-i18n.test.ts \
  tests/unit/ui/operations-hub-discoverability-0059.test.ts
→ 51/51 PASS

node --import tsx/esm --test \
  tests/unit/dashboard-shell-tabs.test.ts \
  tests/unit/sidebar-visibility.test.ts \
  tests/unit/ui/sidebar-engine-items.test.ts
→ 51/51 PASS (related; no observe regressions)

Programmatic:
  stream ids not primary = true
  OBSERVE_REDIRECT_MATRIX.length = 8
```

## Commands Not Run And Why

- Playwright e2e / full browser smoke — no auth session; unit matrix still green
- Full `npm run test:all` / `typecheck:core` — out of narrow reaudit scope; prior gates + targeted units green

## Path To 100

1. Fix F3: point `ProviderQuotaWidget` “View details” at `/dashboard/quota` (or preserve `tab=limits` via a non-observe usage alias that re-homes to quota/costs).
2. Optionally harden `usage/page.tsx` to branch on known legacy tabs (`limits` → `/dashboard/quota`, `budget` → costs budget, etc.) instead of unconditional request-stream redirect.
3. Add a unit assert that no production `href="/dashboard/usage?tab=limits"` remains (or that usage redirect preserves known tabs).
4. Delete unused `OBSERVE_TABS` / dead helpers in `ObserveHubClient.tsx` if still unreferenced.
5. Optional: operator smoke of Completion Evidence deep-link list.

## Regression Guards (do not regress)

- Default chrome: single `activity` Observe stream hub — no logs/audit peer leaves in `PRIMARY_SIDEBAR_ITEMS`
- Every `OBSERVE_REDIRECT_MATRIX.from` page remains a server redirect to hub + source
- `OBSERVE_STREAM_SIDEBAR_IDS` stay hideable; do not delete log/audit APIs or domain viewers
- Hub composes domain viewers behind `?source=` — no god-logger merge
- `/dashboard/logs/proxy` and related deep links must keep working after Observe subnav changes (0061)

## Scoring Notes

- Start 100
- −6 F3 broken usage→limits deep link (Debt / operator mis-route)
- −1 F4 test gap for F3
- −1 F5 dead hub tab array
- Residual browser smoke already accepted in prior 99 → no further cut
- **= 92**
