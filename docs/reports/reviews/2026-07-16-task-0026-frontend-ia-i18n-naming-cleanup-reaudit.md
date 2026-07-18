# Review Report: Task 0026 — Frontend IA i18n / Naming Cleanup — Re-audit 2026-07-16

## Review Lineage

- **Current task**: Task 0026 (`frontend-ia-i18n-naming-cleanup`); live path `docs/tasks/03-review/0026-frontend-ia-i18n-naming-cleanup.md`
- **Previous reports read**:
  - `docs/reports/reviews/2026-07-11-task-0026-frontend-ia-i18n-naming-cleanup-review.md` (97/100 PASS WITH NOTES)
  - `docs/reports/reviews/2026-07-10-task-0026-frontend-ia-i18n-naming-cleanup-review.md` (95/100)
- **Related reports considered**:
  - Task 0025 seven-pillar / flat primary evolution
  - Task 0059 Operations hub labels (`operationsNav`)
  - Task 0023 Observe labels (`observeNav`, Outbound Logs)
- **Review mode**: `re-review` (adversarial re-audit after later IA waves)
- **Reviewer profile**: `reviewers` (agentID=reviewers)
- **Skills applied**: code-quality-harness, review-report-lineage, tsjs-harness, frontend-quality-harness

## Score And Verdict

- **Score**: `96/100`
- **Verdict**: `HELD_IN_REVIEW_PATH_TO_100` / `PASS WITH NOTES`
- **Lane recommendation**: `hold-in-review` (S ≥ 90 — stay in `docs/tasks/03-review/`)

## Delta Summary

### Resolved Since Previous Review

- none required for English S7 debt table (values still live)

### Persistent Findings

- `PERSISTENT` (Low, accepted OOS): non-en locales still loan-translate many `sidebar.logsProxy` as `"Proxy Logs"` (38/42 files); task forbids mass invented locale rewrite
- `PERSISTENT` (Improvement): internal symbol `UsageAnalytics` still blends Usage/Analytics vocabulary (non-operator)

### Regressions

- none on English operator debt matrix or primary hub naming contracts

### New Findings

- `NOTE` (Info / SUPERSEDED structure): primary leaf for settings uses `i18nKey: "settingsNav"` → `"Settings"` (hub), while debt key `settingsGeneral` remains `"Data & Storage"` for deep/settings-general page vocabulary — correct evolution post-flat-nav, not a regression
- `NOTE` (Info): primary Observe/Operations/Routing/Costs use `*Nav` keys covered by `sidebar-naming-i18n.test.ts` (updated for 0059 9-hub count)
- `NEW` (Low / residual copy drift): some non-en locales still carry older blends (`header.usage` “Usage & Analytics”, `AgentSkills` compact forms) — same OOS class as F2

### Evidence Gaps / External Blockers

- none blocking S7 English contract

## Findings

| ID | Class | Severity | Status | Summary | First seen | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| F1 | RESOLVED | Low | Still closed | `logs.proxyLogs` synonym | 2026-07-10 | en `Outbound Logs` |
| F2 | PERSISTENT | Low | Accepted OOS | Non-en “Proxy Logs” loans | prior | 38 locales `sidebar.logsProxy === "Proxy Logs"`; 10 locales `logs.proxyLogs === "Proxy Logs"` |
| F3 | PERSISTENT | Improvement | Open | `UsageAnalytics` identifier | prior | `src/shared/components/UsageAnalytics.tsx` |
| F4 | RESOLVED | Medium→Low | Still closed | Primary analytics subtitleFallback Usage lead-in | 2026-07-11 | still `"Charts · evals · health"` |
| F5 | NOTE | Info | Superseded chrome | Settings primary = Settings hub, not “Data & Storage” leaf title | 2026-07-16 | PRIMARY `settingsNav` / deep `settingsGeneral` |

## Contract Compliance (Task MUST / Exit)

| Debt row / MUST | Status | Live proof |
| --- | --- | --- |
| Usage vs Analytics distinct | ✅ | en analytics ≠ usage; distinct subtitles; primary analytics i18nKey `analytics`; subtitleFallback no Usage lead-in |
| Storage → Data & Storage | ✅ | `sidebar.settingsGeneral` + `settings.systemStorage` = `"Data & Storage"` |
| Skills triad | ✅ | Agent Skills / Omni Skills / Plugins + inbound/outbound subtitles |
| Proxy cluster | ✅ | Network vs Outbound Logs vs Embedded Services (en + ObserveHub “Outbound Logs”) |
| Pillar / primary titles consistent | ✅ | Flat primary `*Nav` keys resolve; 9 hubs after Operations absorb |
| No orphan default-tree i18nKey | ✅ | naming suite iterates `SIDEBAR_SECTIONS` |
| Labels only (no route vanity) | ✅ | no rename-driven route churn for S7 |
| CHANGELOG | ✅ | Unreleased S7 entry present |
| Contract tests | ✅ | `sidebar-naming-i18n.test.ts` 8/8 green live |
| `analyticsSubtitle` presence | ✅ | 42/42 locales (spot-check: 0 missing) |

## Rename Matrix Spot-Check (en live 2026-07-16)

| Surface | Value |
| --- | --- |
| `sidebar.proxy` / `proxyGroup` | Network |
| `sidebar.logsProxy` / `logs.proxyLogs` | Outbound Logs |
| `sidebar.settingsGeneral` / `settings.systemStorage` | Data & Storage |
| `sidebar.agentSkills` / `omniSkills` | Agent Skills / Omni Skills |
| `sidebar.analytics` / `usage` | Analytics / Usage (distinct) |
| `sidebar.analyticsSubtitle` / `usageSubtitle` | Charts…utilization / Token volume… |
| PRIMARY analytics `subtitleFallback` | Charts · evals · health |
| PRIMARY hubs | Routing / Observe / Operations / Settings / Costs (en `*Nav`) |
| Observe proxy tab fallback | Outbound Logs |

## Production Wiring Proof

```
PRIMARY_SIDEBAR_ITEMS (9)
  → Sidebar resolveItem() → useTranslations("sidebar")
  → en.sidebar.* debt values + *Nav hub titles
  → ObserveHubSubnav / ObserveHubClient proxy: Outbound Logs
  → operationsHub.ts skill card labels mirror Agent Skills / Omni Skills (hardcoded EN)
```

Hardcoded Operations hub strings for skills match S7 triad English; not i18n-driven (acceptable residual for 0059; not an S7 key orphan).

## Evidence Reviewed

- Task 0026 Completion Evidence rename matrix + prior Review Ledger
- `src/i18n/messages/en.json` (sidebar/header/settings/logs/skills)
- Locale scan: 42 files, `analyticsSubtitle` present, Proxy Logs loan counts
- `src/shared/constants/sidebarVisibility.ts` PRIMARY + debt fallbacks
- `tests/unit/ui/sidebar-naming-i18n.test.ts` (live 8/8)
- Related: observe-hub, connect-exposure, operations-hub suites green as co-check

## Commands Run

```text
node --import tsx/esm --test tests/unit/ui/sidebar-naming-i18n.test.ts
→ 8/8 PASS (within 51/51 multi-suite run)

node -e '/* locale loan + analyticsSubtitle */'
→ files 42; missingAnalyticsSubtitle 0;
  sidebar.logsProxy "Proxy Logs" loans 38;
  logs.proxyLogs "Proxy Logs" 10;
  en logs.proxyLogs "Outbound Logs"
```

## Commands Not Run And Why

- Full `i18n:check-ui-coverage` — known pre-existing under-80% locale coverage; not introduced by S7; en contract is the task SSoT
- Mass locale rewrite — explicitly out of scope

## Path To 100

1. Optional high-traffic locale synonym pass (Outbound Logs / Network / Data & Storage) — **not required** by task scope
2. Optional rename internal `UsageAnalytics` component for dev clarity
3. Optional: assert Operations hub skill labels stay aligned with en triad if those strings remain hardcoded

## Regression Guards (do not regress)

- Analytics hub uses `i18nKey: analytics` (not usage); distinct `usageSubtitle` / `analyticsSubtitle`
- PRIMARY analytics `labelFallback` = Analytics; `subtitleFallback` must not lead with Usage
- `settingsGeneral` / `systemStorage` = Data & Storage
- Skills triad: Agent Skills / Omni Skills / Plugins + inbound/outbound subtitles
- Network ≠ Outbound Logs ≠ Embedded Services; `logs.proxyLogs` stays Outbound Logs
- Every default-tree sidebar i18nKey resolves in `en.sidebar`
- Flat primary chrome ≤ 10 hubs (currently 9 after 0059); do not re-churn for label vanity

## Scoring Notes

- Start 100
- −3 F2 non-en Proxy Logs loans (accepted OOS but still residual vs perfect)
- −1 F3 UsageAnalytics identifier
- **= 96** (vs prior 97; −1 for residual non-en drift still material after later waves, no English regression)
