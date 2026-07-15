# Review Report: Task 0030 — PageTabBar + Settings Field Kit + DeployRelayModal — 2026-07-11

## Review Lineage

- **Current task**: Task 0030 (`frontend-ia-page-tabbar-field-kit`); live path `docs/tasks/03-review/0030-frontend-ia-page-tabbar-field-kit.md`
- **Previous reports read**:
  - `docs/reports/reviews/2026-07-10-task-0030-frontend-ia-page-tabbar-field-kit-review.md` (score **91**, `HELD_IN_REVIEW_PATH_TO_100`)
- **Related reports considered**:
  - Task ledger path-to-100 summary on the task file (F1–F4 polish items)
  - `docs/reports/builders/2026-07-10-wave2-closeout.md` (parent wave gate only; not independent review)
- **Review mode**: `re-review` (independent FS + tests; no path-to-100 production patches this session)
- **Reviewer profile**: `reviewers` (Code Quality Reviewer / independent task reviewer)
- **Parent agentID**: `reviewers`

## Score And Verdict

- **Score**: `91/100` (unchanged vs 2026-07-10; primary contract re-confirmed; path-to-100 polish still open)
- **Verdict**: `PASS WITH NOTES` / `HELD_IN_REVIEW_PATH_TO_100`
- **Lane recommendation**: `hold-in-review` (S ≥ 90 — remain in `docs/tasks/03-review/`; do **not** return to `02-doing/`; do **not** promote to `04-completed/`)

### Rubric snapshot

| Dimension | Score | Notes |
| --- | --- | --- |
| Contract / exit conditions | 98 | **3/3** kits shipped; ≥1 production adoption each; tests present |
| PageTabBar URL sync | 90 | Controlled + default `?tab=` + `defaultValue` delete work; dual `replaceState` still fragile at hubs |
| Settings field kit | 96 | Density matches ToggleRow; typed text/password adopted on 3 relay modals |
| DeployRelayModal composition | 99 | Composes `Modal` only; no second system; no hand-rolled `fixed inset-0 z-50` in relays |
| Accessibility | 86 | tablist/tab + `aria-selected` + roving `tabIndex`; missing arrow keys / `aria-controls` |
| Tests / verification | 93 | 10/10 vitest kits + activity redirect 6/6 + typecheck:core PASS; act() stderr noise remains |
| Scope discipline | 98 | Mid-layer kits only; no shadcn migration; CHANGELOG draft deferred (allowed) |

## Delta Summary

### Resolved Since Previous Review

- none of the prior path-to-100 items closed by production/test changes
- **Note on F2 (Observe)**: live `ObserveHubClient.tsx:68` already calls `normalizeObserveSource(next)` (not a bare `as` cast). Analytics still uses `tab as AnalyticsTab` at `page.tsx:95`. Treat Observe normalize as **already correct on disk**; residual F2 is Analytics-only.

### Persistent Findings

- `PERSISTENT` F1 (Medium): dual `history.replaceState` — PageTabBar writes, then hub handlers rewrite again
- `PERSISTENT` F2 (Low): Analytics `onChange` uses `as AnalyticsTab` instead of `normalizeTab`
- `PERSISTENT` F3 (Low): PageTabBar tablist lacks arrow-key navigation / panel `aria-controls`
- `PERSISTENT` F4 (Low): 0030 vitest files omit `IS_REACT_ACT_ENVIRONMENT` → act() stderr noise
- `PERSISTENT` F5 (Info): settings field kit lives under `settings/` while `SettingsToggleRow` is root-level

### Regressions

- none in task scope
- unrelated: `dashboard-shell-tabs` endpoint assertion still fails (pre-existing; not 0030)

### New Findings

- `NEW` N1 (Info / bonus adoption): `EndpointPageClient.tsx` uses `writeTabSearchParam("tab", next, { defaultValue: "apis" })` with `SegmentedControl` — helper reuse beyond Analytics/Observe hubs (positive; not a defect)
- `NEW` N2 (Info): full `npm run typecheck:core` **PASS** this session (unlike some peer 2026-07-11 reviews that hit fusion WIP contamination)

### Evidence Gaps / External Blockers

- `EVIDENCE_GAP`: no Playwright smoke for Analytics/Observe tab URL sync or DeployRelay open/focus trap (unit + static adoption cover contract)
- `EXTERNAL_BLOCKER`: none

## Findings

| ID | Class | Severity | Status | Summary | First seen | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| F1 | PERSISTENT | Medium | Open | Dual `history.replaceState` (PageTabBar then parent) | 2026-07-10 | `PageTabBar.tsx:64-68` + `analytics/page.tsx:97-104` + `ObserveHubClient.tsx:70-79` |
| F2 | PERSISTENT | Low | Open (Analytics only) | Analytics casts instead of `normalizeTab` | 2026-07-10 | `analytics/page.tsx:95` (`const next = tab as AnalyticsTab`) |
| F3 | PERSISTENT | Low | Open | No ArrowLeft/Right on tablist; no `aria-controls` | 2026-07-10 | `PageTabBar.tsx:71-106` (roles only; SegmentedControl same gap) |
| F4 | PERSISTENT | Low | Open | act() env not set in kit tests | 2026-07-10 | vitest stderr on all 3 kit files this run |
| F5 | PERSISTENT | Info | Open | Field kit path vs ToggleRow root layout | 2026-07-10 | `settings/*` vs `SettingsToggleRow.tsx` |
| N1 | NEW | Info | Accepted | Extra `writeTabSearchParam` adoption on Endpoint | 2026-07-11 | `EndpointPageClient.tsx:1261` |
| G1 | — | Guard | Pass | ≥2 of 3 kits (actual **3/3**) | this report | FS + adoptions |
| G2 | — | Guard | Pass | No second modal system | this report | DeployRelayModal → `./Modal` only |
| G3 | — | Guard | Pass | Analytics `?tab=` default deletes param | this report | `defaultValue="overview"` + test |

## Contract Compliance (Exit Conditions)

| Exit / MUST | Status | Live proof |
| --- | --- | --- |
| ≥ 2 of {PageTabBar, field kit, DeployRelayModal} | ✅ **3/3** | components + barrel exports in `index.tsx` |
| PageTabBar controlled + optional `syncSearchParam` (default `tab`) | ✅ | `PageTabBarProps`; default `"tab"` |
| Unit-test URL sync | ✅ | set `?tab=`, delete default, custom param + `deleteParams` helper |
| Field kit label + description + control | ✅ | `SettingsFieldRow` + `SettingsTextField` |
| DeployRelayModal shell via existing Modal | ✅ | composition; focus trap / Escape / scroll lock inherited |
| ≥ 1 production adoption per kit | ✅ | Analytics + Observe; 3 relay modals |
| Analytics `?tab=` not broken | ✅ | overview default delete; route-explain→route-trace effect retained |
| typecheck:core | ✅ | PASS (this session) |
| Targeted tests | ✅ | vitest 10/10; activity redirect 6/6; analytics shell asserts PageTabBar |
| CHANGELOG publish | ⏭ deferred | draft on task file; parent: no publish (allowed residual) |

### Contract verification (live FS)

| Kit | Implemented | Unit tests | Production adoption | Notes |
|-----|-------------|------------|---------------------|-------|
| PageTabBar | ✅ `PageTabBar.tsx` + `writeTabSearchParam` | ✅ 5 tests | ✅ Analytics `?tab=` + Observe `?source=` | helper also used by Endpoint |
| Settings field kit | ✅ `SettingsFieldRow` + `SettingsTextField` | ✅ 2 tests | ✅ Vercel / CF / Deno | density tokens match ToggleRow |
| DeployRelayModal | ✅ composes `Modal` | ✅ 3 tests (incl. static adoption) | ✅ 3 relay modals | `rg fixed inset-0` clean under proxy/ |

## Evidence Reviewed

- Task: `docs/tasks/03-review/0030-frontend-ia-page-tabbar-field-kit.md`
- Prior review: `docs/reports/reviews/2026-07-10-task-0030-frontend-ia-page-tabbar-field-kit-review.md`
- Source:
  - `src/shared/components/PageTabBar.tsx`
  - `src/shared/components/DeployRelayModal.tsx`
  - `src/shared/components/settings/{SettingsFieldRow,SettingsTextField,index}.ts(x)`
  - `src/shared/components/index.tsx`, `Modal.tsx`, `SettingsToggleRow.tsx`
  - `src/app/(dashboard)/dashboard/analytics/page.tsx`
  - `src/app/(dashboard)/dashboard/activity/ObserveHubClient.tsx`
  - `src/app/(dashboard)/dashboard/settings/components/proxy/{Vercel,Cloudflare,Deno}RelayModal.tsx`
  - `src/app/(dashboard)/dashboard/endpoint/EndpointPageClient.tsx` (helper reuse)
- Tests:
  - `tests/unit/ui/page-tab-bar.test.tsx`
  - `tests/unit/ui/settings-field-row.test.tsx`
  - `tests/unit/ui/deploy-relay-modal.test.tsx`
  - `tests/unit/ui/activity-page-redirect.test.ts`
  - `tests/unit/dashboard-shell-tabs.test.ts` (analytics case only)

### Commands run (2026-07-11, this review)

```bash
npx vitest run --config vitest.config.ts \
  tests/unit/ui/page-tab-bar.test.tsx \
  tests/unit/ui/settings-field-row.test.tsx \
  tests/unit/ui/deploy-relay-modal.test.tsx
# → 3 files, 10 tests passed
# → stderr: "The current testing environment is not configured to support act(...)" (F4)

node --import tsx/esm --test tests/unit/ui/activity-page-redirect.test.ts
# → 6/6 PASS

node --import tsx/esm --test tests/unit/dashboard-shell-tabs.test.ts
# → analytics PageTabBar assertion PASS
# → endpoint assertion FAIL (pre-existing; expects EndpointTab type string not present)

npm run typecheck:core
# → PASS
```

## Path To 100

1. **F1 (priority)** — Plumb `deleteParams` (or `getDeleteParams?: (next: string) => string[]`) through `PageTabBar` into `writeTabSearchParam` so hubs only `setState` in `onChange`:
   - Analytics: when leaving `route-trace`, delete `id`
   - Observe: always delete legacy `tab`; when leaving `request`, delete `id`/`request`/`connection`
2. **F2** — `onChange={(v) => setActiveTab(normalizeTab(v))}` (drop `as AnalyticsTab`).
3. **F3** — Arrow Left/Right/Home/End on tablist + focus move; optional `aria-controls` when panel ids known.
4. **F4** — In each kit test `beforeEach`:

```ts
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;
```

5. **F5** — Optional re-export note only; not required for accept.

### Suggested narrow patches

#### A — Analytics normalize (F2)

```diff
-  const handleTabChange = (tab: string) => {
-    const next = tab as AnalyticsTab;
-    setActiveTab(next);
+  const handleTabChange = (tab: string) => {
+    const next = normalizeTab(tab);
+    setActiveTab(next);
```

#### B — Fold cleanup into PageTabBar (F1 sketch)

```tsx
// PageTabBarProps addition
getDeleteParams?: (next: string) => string[] | undefined;

// handleSelect
writeTabSearchParam(syncSearchParam, next, {
  defaultValue,
  deleteParams: getDeleteParams?.(next),
});
```

```tsx
// Observe
getDeleteParams={(next) =>
  next === "request"
    ? ["tab"]
    : ["tab", "id", "request", "connection"]
}
// Analytics
getDeleteParams={(next) => (next === "route-trace" ? [] : ["id"])}
```

#### C — Test act env (F4)

```diff
 beforeEach(() => {
+  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean })
+    .IS_REACT_ACT_ENVIRONMENT = true;
   container = document.createElement("div");
```

## Score rationale

Primary exit bar is fully met (3/3 kits, adoptions, green targeted tests, typecheck, Modal composition). Deduct 9 points for the same polish basket as 2026-07-10: dual URL write fragility (F1), Analytics cast (F2 residual), tab keyboard a11y (F3), and act() test noise (F4). No regressions; no blockers for the ≥2/3 contract. **Hold in `03-review`** for path-to-100; do not demote to `02-doing`.

## Lane outcome

- **Moved**: no (remains `docs/tasks/03-review/0030-frontend-ia-page-tabbar-field-kit.md`)
- **Patched**: no production/test patches this review
- **Report path**: `docs/reports/reviews/2026-07-11-task-0030-frontend-ia-page-tabbar-field-kit-review.md`
