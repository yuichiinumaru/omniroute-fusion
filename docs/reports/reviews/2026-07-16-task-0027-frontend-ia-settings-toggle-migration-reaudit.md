# Re-Audit Report: Task 0027 — SettingsToggleRow / Toggle Migration — 2026-07-16

## Review Lineage

- **Current task**: Task 0027 (`frontend-ia-settings-toggle-migration`); live path `docs/tasks/03-review/0027-frontend-ia-settings-toggle-migration.md`
- **Previous reports read**:
  - `docs/reports/reviews/2026-07-11-task-0027-frontend-ia-settings-toggle-migration-review.md` (score **94**)
  - `docs/reports/reviews/2026-07-10-task-0027-frontend-ia-settings-toggle-migration-review.md` (score **94**)
- **Related later work considered**: Task 0059 (Operations hub absorbs API Keys leaf — does **not** remove ApiManager surfaces); residual settings/memory switches
- **Review mode**: `adversarial-reaudit` (live FS + tests only; prior reports treated as drafts)
- **Reviewer profile**: `reviewers` (Frontend Quality / independent)
- **Parent agentID**: `reviewers`

## Score And Verdict

- **Score**: `94/100` (unchanged)
- **Verdict**: `PASS WITH NOTES` / `HELD_IN_REVIEW_PATH_TO_100`
- **Lane recommendation**: `hold-in-review` (S ≥ 90 — remain in `docs/tasks/03-review/`; do **not** return to `02-doing/`; do **not** promote to `04-completed/`)

### Rubric snapshot

| Dimension | Score | Notes |
| --- | --- | --- |
| Contract / exit conditions | 98 | Primary files still **0** hand-rolled `role="switch"`; SettingsToggleRow retained |
| Residual hand-rolled switches | 93 | Allowlist residual still accurate; no new primary-surface regression |
| Accessibility | 92 | Shared `Toggle` still owns switch a11y |
| Tests / regression guards | 95 | Static + vitest green this session |
| Path-to-100 polish | 88 | F1 i18n / dead BC props still open |
| Scope discipline | 96 | No business-logic rewrite drift |

## Delta Summary

### Resolved Since Previous Review

- none of F1–F3 closed by production edits

### Persistent Findings

- `PERSISTENT` F1 (Low): `UsageLimitSettings` hardcodes EN labels; dead `enabledLabel`/`disabledLabel` BC props
- `PERSISTENT` F2 (Low): behavioral suite mirrors create-key cluster (static tests remain production SSoT)
- `PERSISTENT` F3 (Info): residual non-primary dashboard `role="switch"` on allowlist

### Regressions

- **none** on primary migration targets
- ApiManager still has **0** hand-rolled switches; `SettingsToggleRow` still present (import + 14 row adoptions; `rg -c SettingsToggleRow` → 15)

### New Findings

- `NEW` N1 (Info): Operations hub (0059) moved **API Keys** off primary sidebar into `/dashboard/operations` discovery — ApiManager page + toggles still live at `/dashboard/api-manager` (deep link). Not a 0027 regression.
- `NOTE` N2 (Info): residual allowlist counts reconfirmed live (see inventory)

## Live Proof

### Primary targets (hand-rolled `role="switch"`)

| File | Count |
| --- | --- |
| `ApiManagerPageClient.tsx` | **0** |
| `UsageLimitSettings.tsx` | **0** |
| `ApiKeyUsageLimitCard.tsx` | **0** (uses shared `Toggle`) |

Shared `Toggle.tsx` still owns the only `role="switch"` for these surfaces.

### Residual dashboard inventory (allowlist — still present)

| File | Count | Justification (unchanged) |
| --- | --- | --- |
| `cloud-agents/page.tsx` | 3 | Domain page |
| `settings/components/MemorySkillsTab.tsx` | 3 | Settings residual |
| `memory/components/EmbeddingSourceSelector.tsx` | 2 | Compact config |
| `settings/components/ModelsDevSyncTab.tsx` | 1 | Settings residual |
| `settings/components/FeatureFlagCard.tsx` | 1 | Card-local |
| `playground/components/StructuredOutputEditor.tsx` | 1 | Playground |
| `playground/components/ParamSliders.tsx` | 1 | Playground |
| `memory/page.tsx` | 1 | Header toggle |
| `memory/components/RerankConfigCard.tsx` | 1 | Compact card |
| `memory/components/QdrantConfigCard.tsx` | 1 | Compact card |
| `context/combos/CompressionHub.tsx` | 1 | Compact toolbar |

**Total residual under dashboard**: 16 hand-rolled switches — none in primary Task 0027 targets.

### Tests this session

| Command | Result |
| --- | --- |
| `node --import tsx/esm --test tests/unit/api-manager-page-static.test.ts` | **7/7 PASS** |
| `npx vitest run … settings-toggle-row + usage-limit-settings + api-manager-settings-toggle-migration` | **6/6 PASS** (act() stderr noise only) |

## Findings

| ID | Class | Severity | Status | Summary | Evidence |
| --- | --- | --- | --- | --- | --- |
| F1 | PERSISTENT | Low | Open | Hardcoded EN + dead BC props on UsageLimitSettings | `UsageLimitSettings.tsx:9–35` |
| F2 | PERSISTENT | Low | Open | Mirror-cluster behavioral tests | `api-manager-settings-toggle-migration.test.tsx` |
| F3 | PERSISTENT | Info | Open | Residual allowlist switches | inventory above |
| N1 | NEW | Info | Accepted | API Keys leaf absorbed by Operations hub; page intact | Task 0059 + `PRIMARY_SIDEBAR_ITEMS` |
| G1 | Guard | Pass | Pass | Primary 0 hand-rolled switches | live `rg` |
| G2 | Guard | Pass | Pass | ≥14 SettingsToggleRow on ApiManager | live `rg` |

## Path-to-100

1. i18n `UsageLimitSettings` label/description; drop or use pill BC props
2. Optional: mount real create-key / permissions clusters in vitest (keep static SSoT)
3. Separate EXTEND for residual settings switches (`MemorySkillsTab`, `FeatureFlagCard`, …)

## Lane outcome

**Stay `docs/tasks/03-review/`** (S = 94 ≥ 90).
