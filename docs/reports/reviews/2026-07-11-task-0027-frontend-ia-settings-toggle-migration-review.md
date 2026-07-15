# Review Report: Task 0027 — Frontend IA SettingsToggleRow Migration — 2026-07-11

## Review Lineage

- **Current task**: Task 0027 (`frontend-ia-settings-toggle-migration`); live path `docs/tasks/03-review/0027-frontend-ia-settings-toggle-migration.md`
- **Previous reports read**:
  - `docs/reports/reviews/2026-07-10-task-0027-frontend-ia-settings-toggle-migration-review.md` (score 94, `HELD_IN_REVIEW_PATH_TO_100`)
- **Related reports considered**:
  - `docs/reports/builders/2026-07-10-wave2-closeout.md` (parent wave gate; not independent review)
- **Review mode**: `re-review` (independent FS + tests after prior hold; mid-run resume after quota failure)
- **Reviewer profile**: `reviewers` (Code Quality Reviewer / independent task reviewer)
- **Parent agentID**: `reviewers`

## Score And Verdict

- **Score**: `94/100` (unchanged vs 2026-07-10; primary contract re-confirmed)
- **Verdict**: `PASS WITH NOTES` / `HELD_IN_REVIEW_PATH_TO_100`
- **Lane recommendation**: `hold-in-review` (S ≥ 90 — remain in `docs/tasks/03-review/`; do **not** return to `02-doing/`; do **not** promote to `04-completed/`)

### Rubric snapshot

| Dimension | Score | Notes |
| --- | --- | --- |
| Contract / exit conditions | 98 | Primary 16→0 hand-rolled switches; residual allowlist still accurate |
| Production call-site proof | 98 | ApiManager 14× `SettingsToggleRow`; UsageLimitSettings; ApiKeyUsageLimitCard `Toggle` |
| Accessibility | 92 | Shared `Toggle`: `role="switch"`, `aria-checked`, `aria-label`, focus ring, button keyboard |
| Tests / regression guards | 93 | Static SSoT + behavioral; mirror cluster still not full PermissionsModal mount |
| Scope discipline | 95 | No business-logic rewrite; playground/compact residuals documented |
| Type safety / hygiene | 90 | Task files clean; monorepo `typecheck:core` currently dirty from **unrelated** workspace edits |

## Delta Summary

### Resolved Since Previous Review
- none of the prior path-to-100 items were closed by new production/test changes

### Persistent Findings
- `PERSISTENT` F1 (Low): `UsageLimitSettings` hardcodes EN label/description; dead `enabledLabel`/`disabledLabel` BC props
- `PERSISTENT` F2 (Low): behavioral suite mirrors create-key cluster; static source tests remain SSoT for production
- `PERSISTENT` F3 (Info): residual non-primary dashboard `role="switch"` on documented allowlist

### Regressions
- none on Task 0027 production surfaces or targeted migration tests

### New Findings
- `NEW` E1 (Info / evidence drift): `npm run typecheck:core` fails in this shared workspace on `open-sse/services/combo/runtimeUnits.ts:382` (`connectionId: string | undefined` vs `string | null`). File is **unrelated** to Task 0027 and shows as modified/uncommitted alongside many non-0027 paths. Treat as **stale monorepo typecheck evidence**, not a toggle-migration functional failure.

### Evidence Gaps / External Blockers
- `EVIDENCE_GAP`: no Playwright E2E of ApiManager create-key / permissions save flows (out of unit scope; static + UI unit present)
- `EXTERNAL_BLOCKER`: none

## Findings

| ID | Class | Severity | Status | Summary | First seen | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| F1 | PERSISTENT | Low | Open | `UsageLimitSettings` hardcodes `"USD usage quota"` / EN description; `enabledLabel`/`disabledLabel` unused | 2026-07-10 | `UsageLimitSettings.tsx:9-35` |
| F2 | PERSISTENT | Low | Open | Behavioral migration suite tests local `CreateKeySelfServiceCluster` mirror, not `ApiManagerPageClient` mount | 2026-07-10 | `api-manager-settings-toggle-migration.test.tsx` + static guards |
| F3 | PERSISTENT | Info | Open | Residual dashboard `role="switch"` outside primary scope | 2026-07-10 | inventory below |
| E1 | NEW | Info | Open (workspace) | Unrelated `typecheck:core` failure in combo runtimeUnits | this report | `runtimeUnits.ts:382`; dirty tree |
| G1 | — | Guard | Pass | Primary targets zero hand-rolled switches + ≥14 SettingsToggleRow | both reviews | live `rg` + static test |

### Findings (detailed)

#### [LOW] F1 — UsageLimitSettings i18n / dead BC props

**Evidence:** Component requires `enabledLabel`/`disabledLabel` (caller still passes `tc("enabled")`/`tc("disabled")` at `ApiManagerPageClient.tsx:2271-2272`) but renames them `_enabledLabel`/`_disabledLabel` and never renders them. Row copy is fixed English:

```28:35:src/app/(dashboard)/dashboard/api-manager/components/UsageLimitSettings.tsx
      <SettingsToggleRow
        id="usage-limit-settings"
        label="USD usage quota"
        description="Blocks this key with a 400 API error after its local USD spend reaches the configured daily or weekly quota."
        checked={enabled}
        onChange={onEnabledChange}
        className="border-emerald-500/20 bg-emerald-500/5"
      />
```

**Impact:** Non-EN operators get English-only quota row while sibling ApiManager toggles use `t(...)`. Dead required props create a false i18n surface.

**Fix:** Add optional/required `label` + `description` props (or wire `useTranslations("apiManager")` with real keys) and drop or truly use pill-era `enabledLabel`/`disabledLabel`.

#### [LOW] F2 — Mirror behavioral test

**Evidence:** `tests/unit/ui/api-manager-settings-toggle-migration.test.tsx` defines local `CreateKeySelfServiceCluster` with the same disabled-cascade pattern as production create-key / permissions rows, but does not import `ApiManagerPageClient` / `PermissionsModal`. Production wiring is guarded by `tests/unit/api-manager-page-static.test.ts` (source assertions: 0 `role="switch"`, create-key 4 rows, permissions ≥10 rows).

**Impact:** Cascade logic could diverge from production without failing the behavioral suite; static source tests mitigate for structure, not runtime handlers inside the huge client file.

**Fix (optional):** Keep static SSoT; silence act warnings via `IS_REACT_ACT_ENVIRONMENT` (pattern in `tests/unit/AutoComboCatalog.test.tsx` etc.); or extract a tiny shared cluster component used by production + test.

#### [INFO] F3 — Residual allowlist (out of task primary scope)

Live residual `role="switch"` under `src/app/(dashboard)/dashboard` (re-grep 2026-07-11) matches prior allowlist counts:

| File | Count | Justification |
| --- | --- | --- |
| `settings/components/MemorySkillsTab.tsx` | 3 | Settings residual; not ApiManager primary |
| `cloud-agents/page.tsx` | 3 | Domain page |
| `memory/components/EmbeddingSourceSelector.tsx` | 2 | Compact config |
| `settings/components/ModelsDevSyncTab.tsx` | 1 | Settings residual |
| `settings/components/FeatureFlagCard.tsx` | 1 | Card-local |
| `playground/components/StructuredOutputEditor.tsx` | 1 | Out of scope |
| `playground/components/ParamSliders.tsx` | 1 | Out of scope |
| `memory/page.tsx` | 1 | Header toggle |
| `memory/components/RerankConfigCard.tsx` | 1 | Compact + testids |
| `memory/components/QdrantConfigCard.tsx` | 1 | Compact + testids |
| `context/combos/CompressionHub.tsx` | 1 | Toolbar-style intentional |

#### [INFO] E1 — typecheck:core evidence drift (unrelated)

**Evidence:** Reviewer run of `npm run typecheck:core` failed:

```
open-sse/services/combo/runtimeUnits.ts(382,36): error TS2345: ...
  Types of property 'connectionId' are incompatible.
    Type 'string | undefined' is not assignable to type 'string | null'.
```

`git status` shows many modified non-0027 paths (`open-sse/services/combo/*`, executors, etc.). Task 0027 files are presentation-only and were green under prior independent review. Do **not** fail the toggle migration on this alone.

**Impact:** Completion Evidence claim “typecheck:core PASS” is **not currently reproducible** on this dirty shared workspace; re-run on a clean tree / Task 0027 worktree before final human completion.

## Contract Compliance (Task MUST / Exit)

| Exit / MUST | Status | Live proof |
| --- | --- | --- |
| Reduce ApiManager hand-rolled `role="switch"` | ✅ | `rg role="switch"` on ApiManager path → **0** matches |
| Majority ApiManager settings rows use SettingsToggleRow/Toggle | ✅ | **14** `<SettingsToggleRow` in `ApiManagerPageClient.tsx` |
| UsageLimitSettings + ApiKeyUsageLimitCard migrated | ✅ | SettingsToggleRow / shared Toggle; 0 raw switches |
| Residual allowlist documented | ✅ | task Completion Evidence + re-grep match |
| Preserve handlers / disabled cascade | ✅ | create-key `1338-1352`; permissions `2245-2259` clear+disable account quota when own-usage off |
| Preserve behavior / no business rewrite | ✅ | presentation-only migration |
| Static + UI tests | ✅ | static **7/7**; vitest **3 files / 6 tests** |
| settings-toggle-row still green | ✅ | 1/1 pass |
| CHANGELOG | ✅ | Unreleased Changed Task 0027 entry |
| typecheck:core | ⚠ | **Fails today** on unrelated dirty combo code (E1); not Task 0027 source |
| No new raw switches in touched files | ✅ | primary trio zero |

## Production Wiring Proof

```
SettingsToggleRow(label) → Toggle(ariaLabel={label})
  → <button type="button" role="switch" aria-checked aria-label focus:ring>

ApiManagerPageClient (create-key + PermissionsModal)
  → 14× SettingsToggleRow (i18n labels via t(...))
  → UsageLimitSettings → 1× SettingsToggleRow (hardcoded EN label — F1)

ApiKeyUsageLimitCard
  → shared Toggle ariaLabel="API key USD quota"

src/shared/components/index.tsx
  → re-exports Toggle + SettingsToggleRow
```

### Live inventory (2026-07-11 re-grep)

| File | Hand-rolled `role="switch"` | Shared adoption |
| --- | --- | --- |
| `ApiManagerPageClient.tsx` | **0** | **14**× `SettingsToggleRow` |
| `UsageLimitSettings.tsx` | **0** | **1**× `SettingsToggleRow` |
| `ApiKeyUsageLimitCard.tsx` | **0** | **1**× `Toggle` |
| **Primary total** | **0** | matches Completion Evidence 16→0 |

## Evidence Reviewed

- Task: `docs/tasks/03-review/0027-frontend-ia-settings-toggle-migration.md` (Completion Evidence + Review Ledger)
- Prior review: `docs/reports/reviews/2026-07-10-task-0027-frontend-ia-settings-toggle-migration-review.md`
- Primitives: `src/shared/components/SettingsToggleRow.tsx`, `src/shared/components/Toggle.tsx`, `src/shared/components/index.tsx`
- Production:
  - `ApiManagerPageClient.tsx` clusters (create-key ~1327–1359; permissions ~1931–2285)
  - `UsageLimitSettings.tsx`
  - `ApiKeyUsageLimitCard.tsx`
- Tests:
  - `tests/unit/api-manager-page-static.test.ts`
  - `tests/unit/ui/settings-toggle-row.test.tsx`
  - `tests/unit/ui/usage-limit-settings.test.tsx`
  - `tests/unit/ui/api-manager-settings-toggle-migration.test.tsx`
- CHANGELOG Unreleased Task 0027 entry

## Commands run (fresh this review)

```bash
rg -n 'role="switch"' \
  "src/app/(dashboard)/dashboard/api-manager/" \
  "src/app/(dashboard)/dashboard/costs/components/ApiKeyUsageLimitCard.tsx"
# → ZERO matches

rg -c '<SettingsToggleRow' \
  "src/app/(dashboard)/dashboard/api-manager/ApiManagerPageClient.tsx"
# → 14

rg -c 'role="switch"' "src/app/(dashboard)/dashboard"
# → residual allowlist table above (unchanged counts)

node --import tsx/esm --test tests/unit/api-manager-page-static.test.ts
# → 7/7 PASS

npx vitest run --config vitest.config.ts \
  tests/unit/ui/settings-toggle-row.test.tsx \
  tests/unit/ui/usage-limit-settings.test.tsx \
  tests/unit/ui/api-manager-settings-toggle-migration.test.tsx
# → 3 files / 6 tests PASS
# (stderr: React act environment warnings — non-failing; F2 hygiene residual)

npm run typecheck:core
# → FAIL open-sse/services/combo/runtimeUnits.ts:382 (unrelated dirty workspace — E1)
```

## Commands not run and why

- Playwright E2E ApiManager save/load — not required by exit conditions; unit/static cover migration contract
- Full monorepo residual eradication — explicitly out of scope
- Clean worktree isolated typecheck — shared checkout is multi-agent dirty; E1 noted as drift

## Path To 100

1. **F1**: i18n `UsageLimitSettings` (prefer `label`/`description` props from parent `t(...)`, or dedicated `apiManager` message keys). Remove or repurpose dead `enabledLabel`/`disabledLabel`.
2. **F2**: Act-environment hygiene (`IS_REACT_ACT_ENVIRONMENT = true`) and/or extract shared cluster used by production + test; keep static source assertions as structure SSoT.
3. **F3 (follow-up EXTEND, not this task)**: next residual batch (`MemorySkillsTab`, `FeatureFlagCard`, `ModelsDevSyncTab`).
4. **E1**: re-run `typecheck:core` on a clean tree before human promotion; do not mix with combo/runtime fixes under this task.

## Regression Guards (must hold)

- Primary files stay at **0** hand-rolled `role="switch"`: `ApiManagerPageClient.tsx`, `UsageLimitSettings.tsx`, `ApiKeyUsageLimitCard.tsx`
- `ApiManagerPageClient` retains **≥14** `SettingsToggleRow` adoptions
- Disabled cascade: shared account quota clears/disables when own-usage off (create-key + permissions)
- `tests/unit/api-manager-page-static.test.ts` + UI toggle suites stay green

## Task Ledger Patch Applied

See task file Review Ledger update (this session).

## Lane Outcome

- **Moved**: none (stays `docs/tasks/03-review/0027-frontend-ia-settings-toggle-migration.md`)
- **Patched production/tests**: none this session (path-to-100 residual only; no blockers)
- **Report path**: `docs/reports/reviews/2026-07-11-task-0027-frontend-ia-settings-toggle-migration-review.md`
