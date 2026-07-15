# Review Report: Task 0026 — Frontend IA i18n / Naming Cleanup — 2026-07-11

## Review Lineage

- **Current task**: Task 0026 (`frontend-ia-i18n-naming-cleanup`); live path `docs/tasks/03-review/0026-frontend-ia-i18n-naming-cleanup.md`
- **Previous reports read**:
  - `docs/reports/reviews/2026-07-10-task-0026-frontend-ia-i18n-naming-cleanup-review.md` (score 95, path-to-100 residual synonym)
- **Related reports considered**:
  - `docs/reports/reviews/2026-07-10-task-0025-frontend-ia-seven-pillar-sidebar-review.md` (structure freeze / pillar IA)
  - Live `docs/guides/UI.md` (flat primary ≤10 hubs + conceptual 7 pillars)
- **Review mode**: `re-review` (+ narrow residual patch during review)
- **Reviewer profile**: `reviewers` (Code Quality Reviewer / independent task reviewer)
- **Parent agentID**: `reviewers`

## Score And Verdict

- **Score**: `97/100` (was 95; residual primary Analytics subtitle re-blend closed this session)
- **Verdict**: `PASS WITH NOTES`
- **Lane recommendation**: `hold-in-review` (remain in `docs/tasks/03-review/`; do **not** promote to `04-completed/`)

## Delta Summary

### Resolved Since Previous Review
- `RESOLVED` (this review): primary flat hub `analytics` `subtitleFallback` was `"Usage · evals · health"`, re-blending token-volume **Usage** into the Analytics chrome. Changed to `"Charts · evals · health"` + contract assert.
- Prior residual `logs.proxyLogs` → `"Outbound Logs"` still holds in `en.json`.

### Persistent Findings
- Non-en locales may still loan-translate `sidebar.logsProxy` / `logs.proxyLogs` as `"Proxy Logs"` (task forbids mass invented locale rewrite; en is SSoT).

### Regressions
- none functional vs S7 debt table in English operator surfaces

### New Findings
- `NEW` (Low, closed in review): primary Analytics `subtitleFallback` Usage lead-in (see Resolved)
- `NEW` (Improvement, open): internal symbol `UsageAnalytics` still blends vocabulary (dev-only; non-operator)
- `NOTE`: default chrome is now **flat primary** (`PRIMARY_SIDEBAR_ITEMS`, 10 hubs) per UI.md / post-0025 evolution; accordion `*Section` pillar titles are no longer the live label surface. Conceptual pillars remain via `OPERATIONAL_PILLAR_SECTION_IDS` (7). Completion Evidence pillar-title matrix is **structurally superseded** but not a functional S7 failure.

## Findings

| ID | Class | Severity | Status | Summary | First seen | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| F1 | RESOLVED | Low | Closed (2026-07-10) | `logs.proxyLogs` synonym residual | prior report | en `logs.proxyLogs` = Outbound Logs; contract assert |
| F2 | PERSISTENT | Low | Accepted OOS | Non-en “Proxy Logs” loan strings | prior report | 38 locales still `sidebar.logsProxy: "Proxy Logs"`; task bans mass fake translation |
| F3 | PERSISTENT | Improvement | Open | Code symbol `UsageAnalytics` | prior report | `src/shared/components/UsageAnalytics.tsx` — identifier only |
| F4 | RESOLVED | Medium→Low | Closed (this review) | Primary Analytics subtitleFallback led with Usage | this report | `sidebarVisibility.ts` PRIMARY item; patched + test |

## Contract Compliance (Task MUST / Exit)

| Debt row / MUST | Status | Live proof |
| --- | --- | --- |
| Usage vs Analytics distinct | ✅ | `en.sidebar.analytics` ≠ `usage`; distinct subtitles; analytics leaf `i18nKey: "analytics"`; primary label Analytics; primary subtitle no longer Usage-led |
| Storage → Data & Storage | ✅ | `sidebar.settingsGeneral` + `settings.systemStorage` = `"Data & Storage"` (settings layout static test + naming suite) |
| Skills triad disambiguated | ✅ | Agent Skills / Omni Skills / Plugins + inbound/outbound subtitles |
| Proxy cluster disambiguated | ✅ | Network vs Outbound Logs vs Embedded Services (en + ObserveHub fallback) |
| Pillar titles / 0025 consistency | ✅* | *Live chrome = flat primary hubs (UI.md §2); 7 conceptual pillar ids still defined; no S7 tree churn for label vanity |
| No orphan `i18nKey` in default tree | ✅ | Naming suite: every section titleKey + item i18nKey/subtitleKey resolves in en.sidebar |
| Labels only (no route vanity) | ✅ | Routes unchanged for rename vanity |
| CHANGELOG | ✅ | Unreleased Changed S7 entry present |
| Contract tests | ✅ | `sidebar-naming-i18n.test.ts` 8/8 + related suites green |
| i18n key presence | ✅ | `analyticsSubtitle` in **42/42** locale files |

\*Structure freeze: naming work did not re-churn the flat primary inventory for vanity renames.

## Production Wiring Proof

```
PRIMARY_SIDEBAR_ITEMS / SIDEBAR_SECTIONS (main + debug)
  → Sidebar.tsx resolveItem() → useTranslations("sidebar") + labelFallback/subtitleFallback
  → en.json sidebar.* (debt values) + header.* descriptions + skills.title + settings.systemStorage
  → ObserveHubClient.tsx proxy tab: labelKey logsProxy / fallback "Outbound Logs"
  → logs.proxyLogs synonym aligned
```

UI.md §2 hub table: Analytics hub id `analytics` — matches wiring; Observe is unified stream (Proxy Logs not a peer pillar).

## Rename Matrix Spot-Check (en live)

| Surface | Value |
| --- | --- |
| `sidebar.proxy` / `proxyGroup` | Network |
| `sidebar.logsProxy` / `logs.proxyLogs` | Outbound Logs |
| `sidebar.settingsGeneral` / `settings.systemStorage` | Data & Storage |
| `sidebar.agentSkills` / `omniSkills` | Agent Skills / Omni Skills |
| `sidebar.analytics` / `usage` | Analytics / Usage (distinct) |
| `sidebar.analyticsSubtitle` / `usageSubtitle` | Charts…utilization / Token volume… |
| PRIMARY analytics `subtitleFallback` | Charts · evals · health (**patched**) |
| Observe proxy tab fallback | Outbound Logs |

No fabricated sidebar keys detected for debt rows; new key `analyticsSubtitle` present 42/42.

## Evidence Reviewed

- Task file Completion Evidence + rename matrix + prior Review Ledger
- `src/i18n/messages/en.json` (sidebar/header/settings/logs/skills)
- `src/shared/constants/sidebarVisibility.ts` (PRIMARY + deep debt fallbacks)
- `src/app/(dashboard)/dashboard/activity/ObserveHubClient.tsx`
- `docs/guides/UI.md` §2 flat primary + conceptual pillars
- Epic 0005 naming debt table row reference
- `tests/unit/ui/sidebar-naming-i18n.test.ts`, `settings-ui-layout-static.test.ts`, `sidebar-seven-pillars.test.ts`, `settings-i18n-keys.test.ts`, `observe-hub-sidebar.test.ts`
- `CHANGELOG.md` Unreleased S7 entry

## Commands Run

```bash
node --import tsx/esm --test \
  tests/unit/ui/sidebar-naming-i18n.test.ts \
  tests/unit/settings-ui-layout-static.test.ts \
  tests/unit/ui/sidebar-seven-pillars.test.ts \
  tests/unit/settings-i18n-keys.test.ts \
  tests/unit/ui/observe-hub-sidebar.test.ts
# pre-patch: 51 pass / 0 fail

node --import tsx/esm --test \
  tests/unit/ui/sidebar-naming-i18n.test.ts \
  tests/unit/settings-ui-layout-static.test.ts \
  tests/unit/ui/sidebar-seven-pillars.test.ts
# post-patch: 18 pass / 0 fail (suite subset; naming 8/8)

node -e '/* analyticsSubtitle 42/42 + debt string dump + locale Proxy Logs loan count */'
# analyticsSubtitle 42/42; non-en logsProxy "Proxy Logs" loans: 38
```

## Commands Not Run And Why

- Full `npm run i18n:check` / `i18n:check-ui-coverage`: builder evidence + key-presence re-verified; coverage under 80% on 13 locales is pre-existing translation depth, not missing keys introduced by S7.
- Mass locale synonym rewrite: explicitly out of scope (anti-hallucination / no invented translations).

## Path To 100 (optional remaining)

1. **Done in this review**: primary Analytics `subtitleFallback` Usage lead-in (F4).
2. Optional product follow-up: human locale pass for high-traffic locales still loaning `"Proxy Logs"` (F2) — not required by S7.
3. Optional rename of internal `UsageAnalytics` component (F3) — no operator impact.

## Patches Applied In This Review

| File | Change |
| --- | --- |
| `src/shared/constants/sidebarVisibility.ts` | PRIMARY analytics `subtitleFallback`: `"Usage · evals · health"` → `"Charts · evals · health"` |
| `tests/unit/ui/sidebar-naming-i18n.test.ts` | Restore/strengthen debt asserts (distinct subtitles, Data & Storage, proxy triad, logs.proxyLogs, primary Analytics no Usage lead-in) |

## Residual Risks

- Operators on non-en locales with English loan values still see “Proxy Logs” until a human translation pass.
- `settings.storage` remains `"Storage"` as a nested settings key (not the settings-general nav / H1 surface covered by S7; systemStorage H1 is correct).
- MITM target copy in `src/mitm/targets/kiro.ts` still says “Proxy Logs” in a verify step string (non-dashboard chrome).

## Task Ledger Patch Suggestion

See compact `Review Ledger` written on the task file by this review.
