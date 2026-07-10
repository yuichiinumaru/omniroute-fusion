# Review Report: Task 0026 — Frontend IA i18n / Naming Cleanup — 2026-07-10

## Review Lineage

- **Current task**: Task 0026 (`frontend-ia-i18n-naming-cleanup`); live path `docs/tasks/03-review/0026-frontend-ia-i18n-naming-cleanup.md`
- **Previous reports read**: none found for this task ID
- **Related reports considered**:
  - `docs/reports/reviews/2026-07-10-task-0025-frontend-ia-seven-pillar-sidebar-review.md` — pillar titles must remain consistent; tree frozen after S6
- **Review mode**: `initial` (+ narrow path-to-100 residual synonym patch during review)
- **Reviewer profile**: `reviewers` (lane: `gt-frontend-quality-reviewer` + tsjs gates)
- **Parent agentID**: `reviewers`

## Score And Verdict

- **Score**: `95/100` (was ~93 before residual `logs.proxyLogs` alignment during review)
- **Verdict**: `HELD_IN_REVIEW_PATH_TO_100`
- **Lane recommendation**: `hold-in-review` (stay in `03-review/`; do not promote to `04-completed`)

## Delta Summary

### Resolved Since Previous Review
- `RESOLVED` (during this review): residual `en.logs.proxyLogs` still said `"Proxy Logs"` while sidebar/observe used `"Outbound Logs"`. Aligned to `"Outbound Logs"` + contract assert.

### Persistent Findings
- none (first review)

### Regressions
- none

### New Findings
- `NEW` (Low / out-of-scope accepted): Non-en locales that already had English loan values for `logsProxy` (`"Proxy Logs"`) were **not** mass-rewritten — task forbids inventing 42-locale translations; en is source of truth; keys present.
- `NEW` (Improvement): Internal component name `UsageAnalytics` still mixes “Usage” with Analytics surface — code identifier only, not operator i18n.

### Evidence Gaps / External Blockers
- `EVIDENCE_GAP` (Low): Did not re-run full `i18n:check-ui-coverage` in this session (builder reported pre-existing 13 locales &lt;80%; not introduced by task). Key-presence proof re-verified for `analyticsSubtitle` 42/42.
- `EXTERNAL_BLOCKER`: none

## Findings

| ID | Class | Severity | Status | Summary | First seen | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| F1 | RESOLVED | Low | Closed | `logs.proxyLogs` synonym residual | this report | Patch: `en.json` → Outbound Logs; assert in `sidebar-naming-i18n.test.ts` |
| F2 | NEW | Low | Accepted | Non-en loan strings may still show “Proxy Logs” | this report | Task out-of-scope: no mass translation rewrite |
| F3 | NEW | Improvement | Open | Code symbol `UsageAnalytics` still blends vocabulary | this report | `analytics/page.tsx` import name only |

## Contract Compliance (Task MUST / Exit)

| Debt row / MUST | Status | Live proof |
| --- | --- | --- |
| Usage vs Analytics distinct | ✅ | analytics leaf `i18nKey: "analytics"`; en `analytics` ≠ `usage`; distinct subtitles |
| Storage → Data & Storage | ✅ | `sidebar.settingsGeneral` + `settings.systemStorage` = `"Data & Storage"` |
| Skills triad disambiguated | ✅ | Agent Skills / Omni Skills / Plugins + inbound/outbound/MCP subtitles |
| Proxy cluster disambiguated | ✅ | Network vs Outbound Logs vs Embedded Services (distinct primaries) |
| Pillar titles consistent with 0025 | ✅ | All 7 `*Section` keys match `titleFallback` |
| No orphan `i18nKey` in default tree | ✅ | Test: every section titleKey + item i18nKey/subtitleKey resolves in en.sidebar |
| Structure frozen (no tree churn) | ✅ | Naming suite does not alter pillars; 0025 inventory still holds |
| Labels only (no route vanity renames) | ✅ | Routes unchanged; values + stable keys preferred; analytics key wiring only |
| CHANGELOG | ✅ | S7 Unreleased entry present |
| Contract tests | ✅ | `tests/unit/ui/sidebar-naming-i18n.test.ts` 7/7 pass after residual patch |

## Production Wiring Proof

```
sidebarVisibility.ts (analytics i18nKey/subtitleKey + label/subtitleFallback for debt leaves)
  → Sidebar.tsx resolveItem() → useTranslations("sidebar") + labelFallback
  → ObserveHubClient.tsx OBSERVE_TABS proxy tab labelKey logsProxy fallback "Outbound Logs"
  → Header description keys (header.proxyDescription, logsProxyDescription, …)
  → en.json sidebar.* / header.* / skills.title / settings.systemStorage
```

- **Structure frozen**: default section ids and leaf graph remain the seven-pillar tree from Task 0025.
- **Vocabulary enforced**: unit contract binds en strings to tree wiring (not free-floating copy).

## Rename Matrix Spot-Check (en live)

| Surface | Value |
| --- | --- |
| `sidebar.proxy` | Network |
| `sidebar.logsProxy` | Outbound Logs |
| `sidebar.settingsGeneral` | Data & Storage |
| `sidebar.agentSkills` | Agent Skills |
| `sidebar.omniSkills` | Omni Skills |
| `sidebar.analytics` / `usage` | Analytics / Usage (distinct) |
| `sidebar.analyticsSubtitle` | Charts, trends, evals, and utilization |
| `logs.proxyLogs` | Outbound Logs (aligned this review) |
| Pillars | Core Pulse … System (unchanged) |

`analyticsSubtitle` present in **42/42** locale files.

## Evidence Reviewed

- Task file Completion Evidence + rename matrix
- `src/i18n/messages/en.json` (sidebar/header/settings/logs/skills)
- `src/shared/constants/sidebarVisibility.ts` analytics + fallback fields
- `src/app/(dashboard)/dashboard/activity/ObserveHubClient.tsx`
- `tests/unit/ui/sidebar-naming-i18n.test.ts`, `settings-ui-layout-static.test.ts`, `settings-i18n-keys.test.ts`
- Sibling Task 0025 inventory (structure freeze)

## Commands Run

```bash
node --import tsx/esm --test \
  tests/unit/ui/sidebar-seven-pillars.test.ts \
  tests/unit/ui/sidebar-naming-i18n.test.ts \
  tests/unit/ui/observe-hub-sidebar.test.ts \
  tests/unit/ui/sidebar-engine-items.test.ts \
  tests/unit/settings-i18n-keys.test.ts \
  tests/unit/settings-ui-layout-static.test.ts
# → 130 pass / 0 fail (pre residual patch)

node --import tsx/esm --test tests/unit/ui/sidebar-naming-i18n.test.ts
# → 7 pass / 0 fail (post residual patch)

node -e '/* analyticsSubtitle 42/42 + debt string dump */'
```

## Commands Not Run And Why

- `npm run i18n:check` / `fill-missing-from-en`: builder evidence accepted; re-verified key presence programmatically for `analyticsSubtitle`.
- Mass locale synonym rewrite: explicitly out of scope.

## Path To 100

1. **Done in review**: align residual `logs.proxyLogs` synonym (F1).
2. Optional product follow-up: high-traffic locales that still loan-translate `sidebar.logsProxy` as `"Proxy Logs"` can be human-updated in a locale pass (F2) — not required by S7.
3. Optional rename of internal `UsageAnalytics` component for developer clarity only (F3) — no operator impact.

## Patches Applied In This Review

| File | Change |
| --- | --- |
| `src/i18n/messages/en.json` | `logs.proxyLogs`: `"Proxy Logs"` → `"Outbound Logs"` |
| `tests/unit/ui/sidebar-naming-i18n.test.ts` | Assert `logs.proxyLogs` stays aligned with Outbound Logs |

## Task Ledger Patch Suggestion

See compact `Review Ledger` written on the task file by this review.
