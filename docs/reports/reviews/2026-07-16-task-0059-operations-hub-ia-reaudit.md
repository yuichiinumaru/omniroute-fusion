# Review Report: Task 0059 — Operations Hub IA — 2026-07-16 (adversarial re-audit)

## Review Lineage

- **Current task**: Task 0059 (`omniroute-operations-hub-ia`); live path `docs/tasks/03-review/0059-omniroute-operations-hub-ia.md`
- **Previous reports read**:
  - `docs/reports/reviews/2026-07-14-task-0059-operations-hub-ia-review.md` — independent re-verify **93/100** (superseded prior TS 100/100)
  - Task file Review Ledger entries (2026-07-14 100, 2026-07-16 93)
- **Related**: Task 0060 Testing hub (extra Testing card on Operations), Task 0056 home labelFallback
- **Review mode**: `re-review` (adversarial — dual leaves, deep links, i18nKey, test drift)
- **Reviewer profile**: `reviewers` (Frontend Quality Reviewer / agentID=reviewers)
- **Parent agentID**: `reviewers`

## Score And Verdict

- **Score**: `93/100`
- **Verdict**: `HELD_IN_REVIEW_PATH_TO_100`
- **Lane recommendation**: `hold-in-review` (S ≥ 90 → stay `docs/tasks/03-review/`)

### Rubric snapshot

| Dimension | Score | Notes |
| --- | --- | --- |
| Dual primary leaves | 99 | Single Operations primary; API Keys + cli-code absorbed (not dual primaries) |
| Hub inventory / deep links | 98 | All 16 required hrefs present; all target pages exist |
| i18nKey (sidebar primary) | 96 | `operationsNav` resolves in en; hub **card** copy is English-hardcoded |
| Header coherence | 86 | traffic-inspector desc still wrong; agent-bridge reuses agentsDescription |
| Tests after later moves | 97 | Fresh **46/46** ops+sidebar suite this session |
| Scope / Testing bleed | 92 | Extra `/dashboard/testing` card (0060) still present |

## Delta Summary

### Resolved Since Previous Review

- none of N1–N3 path-to-100 items fixed since 2026-07-16 independent re-verify.

### Persistent Findings

- `PERSISTENT` N1 (Medium) — traffic-inspector header `descKey: "cliToolsDescription"` → “Configure CLI tools”
- `PERSISTENT` N2 (Low) — agent-bridge reuses `agentsDescription` (cloud-agent wording)
- `PERSISTENT` N3 (Low) — Operations hub includes Testing card outside original Architecture Decision list
- `PERSISTENT` N4 (Note) — command-palette ops extras filtered under non-`all` role presets

### Regressions

- none — primary leaf, hub inventory, deep links, presets, tests all still green.

### New Findings

- `NEW` N5 (Low) — Operations hub UI strings are **hardcoded English** in `operationsHub.ts` / `OperationsHubClient.tsx` (no `useTranslations`). Sidebar primary `i18nKey: "operationsNav"` is fine; card labels are not i18n-wired. Not a dual-leaf or broken-link failure; residual for multi-locale operators.
- `NEW` N6 (Info) — Adversarial “dual leaves” probe: `api-manager` and `cli-code` remain in hideable inventory and group definitions but are **not** primary peers of `operations`. No dual primary leaf bug.

### Evidence Gaps

- Visual browser smoke of hub not run this session (static + unit coverage only).
- CHANGELOG still draft-only.

## Adversarial Focus Results

| Probe | Result |
| --- | --- |
| Dual primary leaves (API Keys + Operations)? | **No** — primary ids: home, providers, combos, activity, analytics, costs, **operations**, settings-general, docs (count **9**). `api-manager` / `cli-code` not primary. |
| Broken deep links? | **No** — all 16 Task 0059 target pages present; hub hrefs complete; `/401` still → `/dashboard/api-manager` |
| i18nKey broken? | **Primary OK** — `operationsNav` → “Operations” in en.json; naming test asserts every default-tree i18nKey resolves |
| Missing tests after later moves? | **No** — operations-hub-0059 + 5 sidebar suites **46/46 pass** this session |
| Header coherence exit? | **Partial** — traffic-inspector description still wrong (N1) |

## Findings

| ID | Class | Severity | Status | Summary | Evidence |
| --- | --- | --- | --- | --- | --- |
| N1 | PERSISTENT | Medium | Open | Traffic Inspector header description wrong | `Header.tsx:208-212` `descKey: "cliToolsDescription"`; en `header.cliToolsDescription` = “Configure CLI tools” |
| N2 | PERSISTENT | Low | Open | Agent Bridge header reuses agentsDescription | `Header.tsx:192-196` |
| N3 | PERSISTENT | Low | Accept residual | Extra Testing card on Operations hub | `operationsHub.ts:161-167` |
| N4 | PERSISTENT | Low/systemic | Accept | Palette extras suppressed by role hidden sets | `CommandPalette.tsx` filter |
| N5 | NEW | Low | Open residual | Hub card labels not i18n | `operationsHub.ts` string literals; client renders `link.label` directly |
| N6 | NEW | Info | Pass | No dual primary leaves | programmatic PRIMARY_SIDEBAR_ITEMS count 9 |

## Contract Compliance

| Exit | Status | Live proof |
| --- | --- | --- |
| Operations leaf → hub | ✅ | `operations` → `/dashboard/operations` |
| Hub exposes all targets | ✅ | `OPERATIONS_HUB_HREFS` missing required `[]` |
| API Keys discoverable | ✅ | hub first card + hideable id retained |
| Deep routes work | ✅ | pages exist; no hard redirect off api-manager |
| Header coherent | ⚠️ | N1/N2 residual |
| Sidebar tests | ✅ | **46/46** this session |
| typecheck:core | ✅ | exit 0 this session |

## Commands Run

```bash
node --import tsx/esm --test \
  tests/unit/ui/operations-hub-discoverability-0059.test.ts \
  tests/unit/ui/sidebar-flat-primary-nav.test.ts \
  tests/unit/sidebar-visibility.test.ts \
  tests/unit/ui/connect-exposure-sidebar.test.ts \
  tests/unit/ui/sidebar-naming-i18n.test.ts \
  tests/unit/sidebar-tools-group.test.ts
# → 46/46 pass

node --import tsx/esm -e '/* PRIMARY + OPERATIONS_HUB inventory */'
# primary count 9; missing required []; hideable operations/api-manager/cli-code true

npm run typecheck:core
# → exit 0
```

## Path-to-100

1. Add `header.trafficInspectorDescription` (+ optional agentBridgeDescription); wire `OPERATIONS_DEEP_HEADER_META`.
2. Optionally i18n hub group/link labels (or document English-only hub SSOT).
3. Drop/re-home Testing card if Architecture Decision inventory must be exact.
4. Publish changelog draft after acceptance.

## Verdict Summary

**PASS WITH NOTES — 93/100.** Confirms prior independent re-verify: Option A hub is real, API Keys absorbed without dual primary leaves, all deep links intact, tests green. Path-to-100 header copy issues remain open. No demotion. Stay `03-review/`.

- Moved: **no**
- Patched: task status honesty already correct (93); ledger appended
