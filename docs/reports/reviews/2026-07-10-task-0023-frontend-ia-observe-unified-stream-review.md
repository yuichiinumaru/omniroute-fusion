# Review Report: Task 0023 — Frontend IA Observe Unified Stream — 2026-07-10

## Review Lineage

- **Current task**: Task 0023 (`frontend-ia-observe-unified-stream`); live path `docs/tasks/03-review/0023-frontend-ia-observe-unified-stream.md`
- **Previous reports read**:
  - none found under `docs/reports/reviews/` for Task 0023
- **Related reports considered**:
  - `docs/reports/builders/2026-07-10-wave2-closeout.md` (builder wave gate; not independent review)
  - Task 0025 / seven-pillar rebuild coexists: Observe hub leaf now under `observability` section (S4 invariant preserved)
- **Review mode**: `initial` (independent frontend-quality + code-quality gate) with path-to-100 patches applied in-session

## Score And Verdict

- **Score**: `96/100`
- **Verdict**: `HELD_IN_REVIEW_PATH_TO_100`
- **Lane recommendation**: `hold-in-review` (S ≥ 90 — remains in `docs/tasks/03-review/`)

## Delta Summary

### Resolved Since Previous Review
- `RESOLVED`: N/A (first independent review). Builder claims verified live.

### Persistent Findings
- none (no prior independent report)

### Regressions
- none detected vs builder completion matrix

### New Findings
- `NEW` (Low): Epic 0005 §11a / child table progress checkbox left unchecked in task Exit Conditions (process gap only).
- `NEW` (Low): Manual browser deep-link smoke still deferred to operator (unit redirect matrix covers static redirect pages).
- `NEW` (Low → patched): Dedicated CHANGELOG Unreleased entry for S4 was missing (only S6 “S4 preserved” cross-ref); reviewer added Task 0023 CHANGELOG entry.
- `NEW` (Low → patched): `ObserveHubClient` cast `next as ObserveSource` replaced with `normalizeObserveSource(next)`.

### Evidence Gaps / External Blockers
- `EXTERNAL_BLOCKER`: Live browser navigation not exercised in this review environment (Playwright suite not run here). Unit + source wiring prove redirects and hub composition.
- Residual (shared): `PageTabBar` uses roving `tabIndex` without arrow-key handlers — pre-existing shared primitive debt, not introduced solely by S4.

## Findings

| ID | Class | Severity | Status | Summary | First seen | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| F1 | NEW | Low | Open | Epic §11a child table not updated | 2026-07-10 this report | Task Exit Conditions unchecked box |
| F2 | NEW | Low | Open | Browser deep-link smoke deferred | 2026-07-10 this report | Task Completion Evidence + no Playwright run this review |
| F3 | NEW | Low | Resolved (reviewer) | Dedicated S4 CHANGELOG entry missing | 2026-07-10 this report | `CHANGELOG.md` Unreleased |
| F4 | NEW | Low | Resolved (reviewer) | Unsafe source cast in hub tab handler | 2026-07-10 this report | `ObserveHubClient.tsx` `handleSourceChange` |
| F5 | NEW | Info | Accepted residual | Hub chrome filters only `source`; time/severity live in domain viewers (matches anti-god-logger invariant) | 2026-07-10 this report | `ObserveHubClient.tsx` + task false-gap |

## Evidence Reviewed

### Task file(s)
- `docs/tasks/03-review/0023-frontend-ia-observe-unified-stream.md`

### Source / test / archive
| Claim | Live proof |
| --- | --- |
| SSoT hub constants | `src/shared/constants/observeHub.ts` — `OBSERVE_HUB_PATH`, `buildObserveHubPath`, `OBSERVE_REDIRECT_MATRIX`, `OBSERVE_STREAM_SIDEBAR_IDS` |
| Hub page | `src/app/(dashboard)/dashboard/activity/page.tsx` mounts `ObserveHubClient` |
| Hub shell composition | `ObserveHubClient.tsx` — `PageTabBar` + `ActivityFeedClient` / `RequestLogsPanel` / `ProxyLogger` / `ConsoleLogViewer` / audit tabs (conditional mount) |
| Request panel extract | `logs/RequestLogsPanel.tsx` still wires `RequestLoggerV2` + export |
| Redirects | `logs/page.tsx`, `logs/proxy`, `logs/console`, `logs/activity`, `audit/*`, `usage/page.tsx` — server `redirect` / `permanentRedirect` via `buildObserveHubPath` |
| Sidebar collapse | `sidebarVisibility.ts` `OBSERVABILITY_ITEMS` — single `activity` stream leaf; no LOGS_GROUP/AUDIT_GROUP in tree |
| Hideable retention | `HIDEABLE_SIDEBAR_ITEM_IDS` still contains all `OBSERVE_STREAM_SIDEBAR_IDS` + `activity` |
| Archive | `.archive/sidebar/2026-07-10-observe-stream/SNAPSHOT.md` + PROVENANCE-INDEX row |
| Tests | `tests/unit/ui/observe-hub-sidebar.test.ts` (+ monitoring reorg / activity redirect / v388 / engine-items co-suite) |

### Runtime wiring proof

```
SIDEBAR_SECTIONS[observability].children
  → activity → /dashboard/activity
  → (no logs / logs-proxy / logs-console / audit* peers)

/dashboard/logs[/*]  → redirect(buildObserveHubPath(...))
/dashboard/audit[/*] → redirect(buildObserveHubPath(...))
/dashboard/usage     → redirect(... source=request)
/dashboard/activity  → ObserveHubClient → PageTabBar(?source=) → domain viewers
```

Sidebar only renders `SIDEBAR_SECTIONS` items; hideable IDs retain prefs without resurrecting removed leaves into the default tree.

### Commands run

```text
node --import tsx/esm --test \
  tests/unit/ui/observe-hub-sidebar.test.ts \
  tests/unit/sidebar-monitoring-reorg.test.ts \
  tests/unit/ui/activity-page-redirect.test.ts \
  tests/unit/v388-phase1-screen-fixes.test.ts \
  tests/unit/ui/sidebar-engine-items.test.ts \
  tests/unit/ui/connect-exposure-sidebar.test.ts \
  tests/unit/sidebar-visibility.test.ts
→ 91/91 PASS (initial suite)

node --import tsx/esm --test \
  tests/unit/ui/observe-hub-sidebar.test.ts \
  tests/unit/ui/connect-exposure-sidebar.test.ts \
  tests/unit/sidebar-monitoring-reorg.test.ts \
  tests/unit/ui/activity-page-redirect.test.ts
→ 50/50 PASS (post path-to-100)

npm run typecheck:core → PASS (exit 0, no errors)
```

### Commands not run and why
- Playwright e2e / full browser smoke — no authenticated dashboard session in this review lane; unit redirect matrix + page source asserts cover contract.
- Full `npm run test:all` — out of scope; targeted IA suites green.

### Stale-evidence notes
- Archive SNAPSHOT still describes pre-S6 “Monitoring” section wording; live tree is `observability` after Task 0025. Snapshot remains valid as pre-S6 historical IA note; tests assert live `observability` section.
- Builder claimed 78/78 targeted suite; reviewer re-ran broader related suite at 91/91 then 50/50 post-patch.

## Contract Compliance

| Exit condition | Status |
| --- | --- |
| Single Observe hub route | PASS — `/dashboard/activity` |
| ≤1 stream hub default under Observability | PASS — `activity` only for stream; analytics peers separate |
| Redirects / deep links | PASS — matrix + live pages |
| Hideable IDs retained | PASS |
| Archive provenance | PASS |
| Unit tests leaf set + redirects | PASS |
| No log/audit API deletion | PASS — APIs and domain viewers remain |
| typecheck:core | PASS |
| CHANGELOG | PASS (reviewer added dedicated S4 entry) |
| Epic §11a table | FAIL (process only) |

## Path To 100

1. Update Epic 0005 §11a / child table to mark S4 done (docs-only).
2. Optional operator browser smoke of the Completion Evidence deep-link list (record once in task evidence).
3. Optional shared follow-up: arrow-key navigation on `PageTabBar` (not S4-blocking).

## Task Ledger Patch Suggestion

See task file `## Review Ledger` written by this review.
