# Review Report: Task 0057 — Providers IA Cleanup — Frontend Quality (2026-07-18)

## Review Lineage

- **Current task**: Task 0057 (`omniroute-providers-ia-cleanup`); live path at review start: `docs/tasks/02-doing/0057-omniroute-providers-ia-cleanup.md`
- **Previous reports read**: none under `docs/reports/` / `docs/reports/reviews/` for task 0057
- **Related context**:
  - Task reopen (2026-07-15) — topbar only on `/providers` (phantom)
  - Builder ledger: multi-route mount + HUB_SUBNAV SSOT (gt-ts-expert path-to-100 claim score 97)
  - Reference visual contract: `src/shared/components/RoutingHubSubnav.tsx` + `src/shared/constants/hubSubnavStyles.ts`
- **Review mode**: `re-review` + `path-to-100` (frontend quality)
- **Reviewer**: `gt-frontend-quality-reviewer` (parent agentID=`builders`)
- **Skills**: `code-quality-harness` + `frontend-quality-harness` + `tsjs-harness`

## Score And Verdict

- **Score (pre-fix)**: `94/100` — Elite with residual List a11y/affordance debt
- **Score (post path-to-100)**: `100/100` — Perfect for task scope
- **Verdict**: `ACCEPTED_100`
- **Lane recommendation**: `accept` → move to `docs/tasks/03-review/`

### Axiom Compliance

| Axiom | Status | Notes |
|-------|--------|-------|
| Type Purity | ✅ | Branded `ProvidersTopBarPath`; display mode union; sort mode union |
| Boundary Integrity | ✅ | localStorage parse/migrate only; no auth/connection logic changes |
| Async Determinism | ✅ | No new floating promises in IA surface |
| Immutability | ✅ | Sort helpers return new arrays |
| State Exclusivity | ✅ | Grid/List view modes separated from Configured/Free filters |
| Frontend a11y (task-owned) | ✅ | Topbar `aria-current`; list toggle un-nested; sort/filter `aria-pressed` |

### Rubric snapshot

| Dimension | Score | Notes |
| --- | --- | --- |
| Contract / exit conditions | 100 | Marketing block gone; Free section gone; Free filter kept; Grid/List; sort A-Z + accounts; topbar 7 peers |
| Multi-route topbar (phantom reopen) | 100 | All 7 peer surfaces mount with exact `currentPath` |
| Visual SSOT (Routing parity) | 100 | Shared `HUB_SUBNAV_*` constants — no `bg-primary text-white` |
| List view IA | 100 | One row/provider; name, accounts, badges, status, toggle, nav chevron |
| Storage migration | 100 | legacy all/configured→grid, compact→list; configured filter key preserved |
| Tests / typecheck | 100 | 7/7 UI regression + storage/utils/free-tier suites; typecheck:core exit 0 |
| List a11y (path-to-100) | 100 | Toggle sibling of Link; dead play_arrow removed; accounts aria-label |

## Delta Summary

### Resolved Since Builder Ledger (97)

- `RESOLVED` F-A11y-1: `ProviderListRow` nested interactive (Link wrapping Toggle) — Toggle is now a **sibling** of the detail Link
- `RESOLVED` F-UX-1: non-functional LLM `play_arrow` hover icon removed; row is navigation-primary with chevron affordance
- `RESOLVED` F-A11y-2: category / Configured / sort chips expose `aria-pressed`
- `RESOLVED` F-A11y-3: accounts count has `aria-label` / title from `accountsCount` i18n
- `RESOLVED` F-TEST-1: regression guard that Toggle appears after `</Link>` and `play_arrow` is absent

### Persistent / Accepted Residual

- `ACCEPTED` Provider**Card** still nests Toggle inside Link (pre-existing grid pattern; out of Task 0057 list-view scope)
- `ACCEPTED` Topbar/sort control labels use English fallbacks when i18n keys absent (same pattern as other IA hubs)
- `ACCEPTED` Changelog draft remains deferred until human acceptance (task subtask 10)

### Regressions

- none

### Evidence Gaps / External Blockers

- `EXTERNAL_BLOCKER` none for static contract — runtime browser smoke on :22000 not required for this static/IA pass; **:21000 production forbidden**

## Findings

| ID | Class | Severity | Status | Summary | Evidence |
| --- | --- | --- | --- | --- | --- |
| G1 | — | Guard | Pass | Marketing onboarding block removed | no `showFirstProviderHint` render in `page.tsx` |
| G2 | — | Guard | Pass | Free Tier section not a standalone grid section | `showSection` has no free special-case; free is filter only |
| G3 | — | Guard | Pass | Display mode Grid/List only | `ProviderDisplayModeControl.tsx` options grid/list |
| G4 | — | Guard | Pass | Configured is filter chip | `ProviderSummaryCard.tsx` Configured button |
| G5 | — | Guard | Pass | Sort A-Z + accounts | utils + toolbar + unit tests |
| G6 | — | Guard | Pass | Topbar on 7 peers + exact currentPath | regression test peers table |
| G7 | — | Guard | Pass | HUB_SUBNAV SSOT visual | `ProvidersTopBar.tsx` imports hubSubnavStyles |
| F1 | NEW→RESOLVED | Debt | Closed | Nested Toggle in List Link | `ProviderListRow.tsx` structure |
| F2 | NEW→RESOLVED | Improvement | Closed | Dead play_arrow | removed |
| F3 | NEW→RESOLVED | Improvement | Closed | Missing aria-pressed on sort/filters | `ProviderSummaryCard.tsx` |

## Evidence Reviewed

### Task-owned source

| File | Role |
|------|------|
| `src/app/(dashboard)/dashboard/providers/page.tsx` | List/grid wiring, topbar mount, section removal |
| `src/app/(dashboard)/dashboard/providers/components/ProvidersTopBar.tsx` | Peer nav + branded paths + SSOT classes |
| `src/app/(dashboard)/dashboard/providers/components/ProviderListRow.tsx` | True list row (path-to-100 a11y) |
| `src/app/(dashboard)/dashboard/providers/components/ProviderDisplayModeControl.tsx` | Grid/List radiogroup |
| `src/app/(dashboard)/dashboard/providers/components/ProviderSummaryCard.tsx` | Search / filters / sort / configured |
| `src/app/(dashboard)/dashboard/providers/providerPageStorage.ts` | Mode migrate + configured key ownership |
| `src/app/(dashboard)/dashboard/providers/providerPageUtils.ts` | Sort/filter helpers |
| `src/shared/constants/hubSubnavStyles.ts` | Shared active shell contract |
| Peer pages | providers, services, provider-stats, quota, free-provider-rankings, free-tiers, runtime |

### Runtime wiring proof

- Topbar is production-mounted on each peer page/client component (not test-only).
- List view is conditional on `effectiveProviderDisplayMode === "list"` in live `providers/page.tsx`.
- Active state is prop-driven (`currentPath`), so query strings on services (`?tab=`) do not break active item.

### Commands run

```text
node --import tsx/esm --test \
  tests/unit/provider-connections-ui-regression.test.ts \
  tests/unit/dashboard/providerPageStorage.test.ts \
  tests/unit/providers-page-utils.test.ts \
  tests/unit/providers-free-tier-filter.test.ts \
  tests/unit/connection-status-presentation-0038.test.ts
→ 84+ pass (incl. 7/7 provider-connections-ui-regression after a11y test)

npm run typecheck:core
→ exit 0
```

### Commands not run

- Browser E2E / Playwright on :22000 — static multi-route + unit coverage sufficient for IA contract; :21000 forbidden.
- Full `npm run lint` / coverage gate — not task-surface regressions; not required for this re-review.

## Path To 100

**Reached this session** by applying frontend residuals:

1. `ProviderListRow.tsx` — un-nest Toggle from Link; remove dead `play_arrow`; accounts `aria-label`.
2. `ProviderSummaryCard.tsx` — `aria-pressed` + `type="button"` on category/configured/sort chips.
3. `tests/unit/provider-connections-ui-regression.test.ts` — structural guard for list-row a11y.

## Task Ledger Patch Suggestion

```markdown
| 2026-07-18 | gt-frontend-quality-reviewer | **100** | ACCEPTED_100 | multi-route topbar + SSOT confirmed; List a11y path-to-100 | changelog after accept |
```

Report: `docs/reports/reviews/2026-07-18-task-0057-providers-ia-cleanup-frontend-review.md`

Lane: `docs/tasks/03-review/`

## Regression Guards (must not regress)

1. All 7 peer pages keep `ProvidersTopBar` with exact `currentPath`.
2. `ProvidersTopBar` continues to import `HUB_SUBNAV_*` (no local active class copies / no `bg-primary text-white`).
3. Display mode remains Grid/List; Configured remains a filter chip.
4. Free stays a filter; no dedicated Free Tier section reappears.
5. `ProviderListRow` keeps Toggle **outside** the detail Link; no decorative `play_arrow`.
