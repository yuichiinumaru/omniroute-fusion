# Review Report: Task 0023 — Frontend IA Observe Unified Stream — 2026-07-11

## Review Lineage

- **Current task**: Task 0023 (`frontend-ia-observe-unified-stream`); live path `docs/tasks/03-review/0023-frontend-ia-observe-unified-stream.md`
- **Previous reports read**:
  - `docs/reports/reviews/2026-07-10-task-0023-frontend-ia-observe-unified-stream-review.md` (score 96; path-to-100 held)
- **Related reports considered**:
  - Task 0025 / 0030 reviews (sidebar chrome + `PageTabBar` dual `replaceState` residual)
  - Epic 0005 §11a child table (S4 marked **done**)
- **Review mode**: `re-review` (independent code-quality gate; narrow path-to-100 test hardening applied)

## Score And Verdict

- **Score**: `99/100`
- **Verdict**: `APPROVED_REMEDIATION` (S ≥ 90 — remains in `docs/tasks/03-review/`; pending parent promote to `04-completed/`)
- **Lane recommendation**: `hold-in-review` for human/parent promote only

## Delta Summary

### Resolved Since Previous Review
- `RESOLVED` F1: Epic 0005 §11a / child table marks S4 Observe stream **done** and Task 0023 `[x]` (live epic file verified).
- `RESOLVED` F3/F4: Prior-reviewer CHANGELOG S4 entry + `normalizeObserveSource` in hub tab handler still present.
- `RESOLVED` (this review): Redirect matrix unit coverage was weak (only “paths include /logs|/audit”); reviewer strengthened `tests/unit/ui/observe-hub-sidebar.test.ts` to assert **every** `OBSERVE_REDIRECT_MATRIX` page is a server redirect with the correct source, plus hub composition smoke.

### Persistent Findings
- none blocking

### Regressions
- none vs 2026-07-10 review; post-S6/flat-primary-nav, S4 invariant still holds (`activity` is the sole Observe stream primary leaf; logs/audit peers absent from default chrome).

### New Findings
- `NEW` (Info / accepted residual): `OBSERVABILITY_ITEMS` in `sidebarVisibility.ts` is now dead after flat primary nav (same class of unused pre-flat section arrays). Not an S4 functional regression; cleanup is optional follow-up outside critical path.
- `EXTERNAL_BLOCKER` (accepted residual): Authenticated browser deep-link smoke still not re-run in this review lane (unit redirect pages + hub composition green).

## Findings

| ID | Class | Severity | Status | Summary | First seen | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| F1 | PERSISTENT→RESOLVED | Low | Resolved | Epic §11a S4 progress | 2026-07-10 | Epic table S4 **done**, 0023 `[x]` |
| F2 | PERSISTENT | Low | Accepted residual | Browser deep-link smoke deferred | 2026-07-10 | No Playwright/dashboard session this lane |
| F3 | PERSISTENT | Low | Resolved (prior) | Dedicated S4 CHANGELOG | 2026-07-10 | `CHANGELOG.md` Unreleased |
| F4 | PERSISTENT | Low | Resolved (prior) | Unsafe source cast | 2026-07-10 | `ObserveHubClient.tsx` uses `normalizeObserveSource` |
| F5 | Info | Info | Accepted residual | Hub chrome filters `source` only | 2026-07-10 | Matches anti-god-logger invariant |
| F6 | NEW | Info | Accepted residual | Dead `OBSERVABILITY_ITEMS` after flat nav | 2026-07-11 this report | `sidebarVisibility.ts` — only declaration site |
| F7 | NEW | Low | Resolved (reviewer) | Matrix redirect pages not per-file unit-asserted | 2026-07-11 this report | Strengthened `observe-hub-sidebar.test.ts` |

## Evidence Reviewed

### Task file(s)
- `docs/tasks/03-review/0023-frontend-ia-observe-unified-stream.md`

### Source / test / archive
| Claim | Live proof |
| --- | --- |
| SSoT hub constants | `src/shared/constants/observeHub.ts` — `OBSERVE_HUB_PATH`, `buildObserveHubPath`, `OBSERVE_REDIRECT_MATRIX`, `OBSERVE_STREAM_SIDEBAR_IDS`, `normalizeObserveSource` |
| Hub page | `src/app/(dashboard)/dashboard/activity/page.tsx` mounts `ObserveHubClient` |
| Hub shell | `ObserveHubClient.tsx` — `PageTabBar` + domain viewers (conditional mount) |
| Request panel extract | `logs/RequestLogsPanel.tsx` still wires `RequestLoggerV2` + export |
| Redirects (all matrix paths) | `logs/page.tsx`, `logs/proxy`, `logs/console`, `logs/activity`, `audit/*`, `usage/page.tsx` — server `redirect` / `permanentRedirect` via `buildObserveHubPath` |
| Sidebar collapse | Flat primary: single `activity` Observe hub (`PRIMARY_SIDEBAR_ITEMS`); no logs/audit peers |
| Hideable retention | All `OBSERVE_STREAM_SIDEBAR_IDS` + `activity` remain in `HIDEABLE_SIDEBAR_ITEM_IDS` |
| Archive | `.archive/sidebar/2026-07-10-observe-stream/SNAPSHOT.md` + `.archive/PROVENANCE-INDEX.md` row |
| CHANGELOG | Dedicated Unreleased entry for Epic 0005 S4 / Task 0023 |
| Epic closeout | `docs/tasks/00-planning/0005-…-epic.md` §11a S4 **done**, child 0023 `[x]` |
| Tests | `tests/unit/ui/observe-hub-sidebar.test.ts` (+ monitoring reorg / activity redirect / v388 / engine-items / sidebar-visibility) |

### Runtime wiring proof

```
PRIMARY_SIDEBAR_ITEMS
  → activity → /dashboard/activity (label Observe)
  → (no logs / logs-proxy / logs-console / audit* peers)

/dashboard/logs[/*]  → redirect(buildObserveHubPath(...))
/dashboard/audit[/*] → redirect(buildObserveHubPath(...))
/dashboard/usage     → redirect(... source=request)
/dashboard/activity  → ObserveHubClient → PageTabBar(?source=) → domain viewers
```

### Commands run

```text
node --import tsx/esm --test \
  tests/unit/ui/observe-hub-sidebar.test.ts \
  tests/unit/sidebar-monitoring-reorg.test.ts \
  tests/unit/ui/activity-page-redirect.test.ts \
  tests/unit/v388-phase1-screen-fixes.test.ts \
  tests/unit/ui/sidebar-engine-items.test.ts \
  tests/unit/sidebar-visibility.test.ts
→ 75/75 PASS (pre-hardening suite; includes flat-nav co-tests)

node --import tsx/esm --test tests/unit/ui/observe-hub-sidebar.test.ts
→ 25/25 PASS (post redirect-matrix + hub composition hardening)

npm run typecheck:core → PASS (exit 0, no errors)
```

### Commands not run and why
- Playwright e2e / full browser smoke — no authenticated dashboard session in this review lane; every matrix page is now unit-asserted as server redirect + hub composition source smoke.
- Full `npm run test:all` — out of scope; targeted IA suites green.

### Stale-evidence notes
- Archive SNAPSHOT still describes pre-S6 “Monitoring” wording; live chrome is flat primary `activity` Observe hub. Snapshot remains valid as S4 historical IA note.
- Task Completion Evidence “78/78” is historical; current targeted suite counts differ after flat-nav test rewrites (reviewer re-ran live: 75 then 25 post-patch).
- Task Exit Conditions still lists an unchecked Epic §11a box in the task file markdown; **epic content itself is closed** (verified). Checkbox is documentation lag only.

### Reviewer patches this session
- `tests/unit/ui/observe-hub-sidebar.test.ts` — per-matrix-path redirect page asserts + hub composition guards.

## Contract Compliance

| Exit condition | Status |
| --- | --- |
| Single Observe hub route | PASS — `/dashboard/activity` |
| ≤1 stream hub default | PASS — primary leaf `activity` only for stream |
| Redirects / deep links | PASS — full matrix + live pages + unit asserts |
| Hideable IDs retained | PASS |
| Archive provenance | PASS |
| Unit tests leaf set + redirects | PASS (strengthened) |
| No log/audit API deletion | PASS — APIs + domain viewers remain |
| typecheck:core | PASS |
| CHANGELOG | PASS |
| Epic §11a table | PASS (epic file); task checkbox lag only |

## Path To 100

1. Optional: record one operator browser pass of Completion Evidence deep-link list (closes F2 residual).
2. Optional later cleanup: remove dead pre-flat section arrays including `OBSERVABILITY_ITEMS` (shared with other retired section constants — not S4-blocking).
3. Shared follow-up (Task 0030): single owner of URL write for `PageTabBar` + parent handlers (not 0023-blocking).

No remaining **blocking** path-to-100 items owned solely by Task 0023.

## Task Ledger Patch Suggestion

Append re-review ledger entry: score **99**, verdict **APPROVED_REMEDIATION**, report path this file; residual F2 external only.
