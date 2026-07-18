# Re-Audit Report: Task 0030 — PageTabBar + Field Kit + DeployRelayModal — 2026-07-16

## Review Lineage

- **Current task**: Task 0030 (`frontend-ia-page-tabbar-field-kit`); live path `docs/tasks/03-review/0030-frontend-ia-page-tabbar-field-kit.md`
- **Previous reports read**:
  - `docs/reports/reviews/2026-07-11-task-0030-frontend-ia-page-tabbar-field-kit-review.md` (score **91**)
  - `docs/reports/reviews/2026-07-10-task-0030-frontend-ia-page-tabbar-field-kit-review.md` (score **91**)
- **Related later work**:
  - Observe hub evolved to `ObserveHubSubnav` (link nav + health)
  - Settings hub layout adopts PageTabBar (Task 0054)
  - Operations / dashboard IA waves
- **Review mode**: `adversarial-reaudit`
- **Reviewer profile**: `reviewers` (Frontend Quality)
- **Parent agentID**: `reviewers`

## Score And Verdict

- **Score**: `90/100` (was 91; −1 Observe PageTabBar adoption replaced)
- **Verdict**: `PASS WITH NOTES` / `HELD_IN_REVIEW_PATH_TO_100`
- **Lane recommendation**: `hold-in-review` (S ≥ 90 — stay `docs/tasks/03-review/`)

### Rubric snapshot

| Dimension | Score | Notes |
| --- | --- | --- |
| ≥2 of 3 kits shipped | 100 | **3/3** still on disk |
| Production adoption | 92 | Analytics + Settings + 3 relays; **Observe no longer uses PageTabBar** |
| URL sync correctness | 88 | Works; dual `replaceState` still open on Analytics |
| Normalize gaps | 90 | Analytics has `normalizeTab` for init; onChange still `as AnalyticsTab` |
| a11y tablist | 84 | Roles + roving tabIndex; no arrow keys / aria-controls |
| Tests | 95 | Kit vitest **10/10** + page-tab-bar 5/5 this session |
| No second modal system | 100 | DeployRelayModal composes `Modal` |

## Delta Summary

### Kits still real

| Kit | Path | Tests | Live adoption |
| --- | --- | --- | --- |
| PageTabBar | `src/shared/components/PageTabBar.tsx` | ✅ | Analytics (`?tab=`), Settings layout (`syncSearchParam={false}` route tabs) |
| Settings field kit | `settings/SettingsFieldRow` + `SettingsTextField` | ✅ | Vercel / CF / Deno relay modals |
| DeployRelayModal | `DeployRelayModal.tsx` | ✅ | Same 3 relay modals |

`writeTabSearchParam` still supports `defaultValue` + `deleteParams`.

### Observe PageTabBar — **replaced, not deleted primitive**

`ObserveHubClient.tsx` now renders:

```tsx
<ObserveHubSubnav active={activeSource} />
```

`ObserveHubSubnav` is a **`<nav>` of `Link`s** (including `/dashboard/health`), not `PageTabBar`.  
This is a deliberate IA evolution (multi-route observe + health), **not** deletion of the kit.  
Original builder proof claimed Observe PageTabBar adoption — **that specific call site is gone**.

Exit bar was **≥1 adoption per kit**, not permanent Observe coupling. PageTabBar remains adopted (Analytics + Settings). Score dips for proof-matrix drift only.

### Persistent path-to-100 (mostly open)

| ID | Severity | Status | Summary |
| --- | --- | --- | --- |
| F1 | Medium | **Open** | Dual `history.replaceState`: PageTabBar writes `?tab=`, then Analytics `handleTabChange` rewrites again to drop `id` |
| F2 | Low | **Partial** | `normalizeTab()` exists for initial state + searchParams; `onChange` still `const next = tab as AnalyticsTab` |
| F3 | Low | **Open** | No ArrowLeft/Right on tablist; no `aria-controls` |
| F4 | Low | **Open** | act() env noise still present on kit vitest |
| F5 | Info | **Open** | Field kit under `settings/` vs root `SettingsToggleRow` |

### Improvements since 2026-07-11

- Analytics gained real `normalizeTab()` for URL read path (F2 half-fixed)
- Bonus Settings PageTabBar adoption (path-based; `syncSearchParam={false}` — correct for route tabs)
- PageTabBar `writeTabSearchParam` already has `deleteParams` — Analytics still does not pass cleanup through it (F1 remains)

### Regressions

- Observe hub **no longer** demonstrates PageTabBar URL sync (`?source=`) — subnav uses full hrefs instead
- Dual-race risk on Analytics unchanged when leaving route-trace with `?id=`

## Tests this session

| Suite | Result |
| --- | --- |
| `page-tab-bar.test.tsx` | **5/5 PASS** |
| `settings-field-row.test.tsx` | **2/2 PASS** |
| `deploy-relay-modal.test.tsx` | **3/3 PASS** |

## Findings

| ID | Class | Severity | Status | Summary | Evidence |
| --- | --- | --- | --- | --- | --- |
| F1 | PERSISTENT | Medium | Open | Dual replaceState on Analytics | `PageTabBar.tsx:66–69` + `analytics/page.tsx:94–105` |
| F2 | PERSISTENT | Low | Partial | onChange cast vs normalizeTab | `analytics/page.tsx:57–69` vs `:95` |
| F3 | PERSISTENT | Low | Open | No arrow-key tablist a11y | `PageTabBar.tsx` |
| F4 | PERSISTENT | Low | Open | act() stderr in kit tests | vitest this session |
| R1 | REGRESSION (adoption) | Low | Accepted evolution | Observe dropped PageTabBar for ObserveHubSubnav | `ObserveHubClient.tsx:58` |
| N1 | NEW | Info | Positive | Settings layout PageTabBar adoption | `settings/layout.tsx` |
| G1 | Guard | Pass | Pass | 3/3 kits on disk | FS |
| G2 | Guard | Pass | Pass | ≥1 adoption each kit | Analytics/Settings + 3 relays |
| G3 | Guard | Pass | Pass | DeployRelayModal → Modal only | composition |

## Path-to-100

1. **F1**: `writeTabSearchParam("tab", next, { defaultValue: "overview", deleteParams: next === "route-trace" ? [] : ["id"] })` — single replaceState; remove parent rewrite
2. **F2**: `setActiveTab(normalizeTab(tab))` in onChange
3. **F3**: ArrowLeft/Right + Home/End on tablist; optional `aria-controls`
4. **F4**: `IS_REACT_ACT_ENVIRONMENT` in kit vitest files
5. Optional: document ObserveHubSubnav as specialized nav (not PageTabBar) in UI.md primitives table

## Lane outcome

**Stay `docs/tasks/03-review/`** (S = 90 ≥ 90). Kits not abandoned; Observe adoption evolved away from PageTabBar without killing the primitive.
