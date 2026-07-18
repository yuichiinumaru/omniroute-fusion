# Review Report: Task 0056 — Dashboard IA Consolidation — 2026-07-14

## Review Lineage

- **Current task**: Task 0056 (`omniroute-dashboard-ia-consolidation`); path at review start: `docs/tasks/03-review/0056-omniroute-dashboard-ia-consolidation.md`
- **Previous reports**: none for 0056 (first independent review)
- **Related context**:
  - Commit `6bfed18` (`feat(ui): apply obsidian IA redesign`) — ships `DashboardTopbar`, `CostsSubnav`, cache flatten, sidebar label
  - Adjacent IA tests: `tests/unit/ui/testing-hub-discoverability-0060.test.ts` asserts `home.labelFallback === "Dashboard"` only
- **Review mode**: independent FS + typecheck + related unit tests (no production patches this session)
- **Reviewer profile**: `reviewers` (Code Quality Reviewer / independent task reviewer)
- **Parent agentID**: `reviewers`

## Score And Verdict

- **Score**: `88/100`
- **Verdict**: `NEEDS FIX`
- **Lane recommendation**: move to `docs/tasks/02-doing/` (S < 90). Do **not** promote to `04-completed/`. Changelog remains draft-only until acceptance.

### Rubric snapshot

| Dimension | Score | Notes |
| --- | --- | --- |
| Contract / exit conditions | 94 | Rename, hub topbar, costs subnav, cache flatten all live; smoke deferred by task design |
| Sidebar Home → Dashboard | 98 | `PRIMARY_SIDEBAR_ITEMS[0]` uses `i18nKey: "dashboard"` + `labelFallback: "Dashboard"`; `id`/`href` stay `home`/`/home`; 42/42 locales have `sidebar.dashboard` |
| Dashboard topbar | 92 | `DashboardTopbar` on `/home` after onboarding redirect; top-level grouped links (not dense Analytics deep list) — matches subtask 3b decision |
| Costs subnav | 95 | `CostsSubnav` on overview/budget/pricing/quota-share; exact match for overview active state |
| Cache flatten | 96 | `activeView` / switcher removed; Prompt → Semantic → Reasoning stacked; loading/empty preserved |
| Tests / verification | 62 | typecheck:core PASS; related sidebar tests PASS; **no** test file covers `DashboardTopbar`, `CostsSubnav`, or cache flatten regression |
| Scope discipline | 96 | No `/home` removal; Analytics chart colors untouched; Analytics redirects untouched |

## Findings

### [MEDIUM] F1 — No regression tests for production IA wiring

**Evidence:**

- `rg DashboardTopbar|CostsSubnav tests` → **0** hits
- Only incidental coverage: `tests/unit/ui/testing-hub-discoverability-0060.test.ts:41` asserts `home.labelFallback === "Dashboard"` (not `i18nKey`, not topbar/costs/cache)
- Task completion evidence lists typecheck only; no unit/vitest for new components
- Hard rule #8 / parent ask: production UI changes should ship regression guards

**Impact:** A future IA pass can reintroduce the cache mini-topbar, drop `CostsSubnav` from a costs leaf, or revert the sidebar label without CI failure.

**Fix (required for path-to-100 / S ≥ 90):** Add a focused unit suite (Node native or vitest), e.g. `tests/unit/ui/dashboard-ia-consolidation-0056.test.ts`, asserting:

1. `PRIMARY_SIDEBAR_ITEMS` home entry: `id === "home"`, `href === "/home"`, `i18nKey === "dashboard"`, `labelFallback === "Dashboard"`
2. `DashboardTopbar.tsx` source (or shallow render) includes hrefs: `/home`, `/dashboard/analytics`, `/dashboard/costs`, `/dashboard/cache`, `/dashboard/tokens`, `/dashboard/leaderboard`, `/dashboard/profile`
3. `home/page.tsx` imports/renders `DashboardTopbar` and still redirects when `!setupComplete`
4. All four costs pages import `CostsSubnav`; `CostsSubnav` lists Overview/Budget/Pricing/Quota Share hrefs
5. `cache/page.tsx` has no `activeView`/`CacheView`/`setActiveView`, and still references Prompt + Semantic + `ReasoningCacheTab` in stacked order

### [LOW] F2 — Route smoke still deferred

**Evidence:** Task validation: “Relevant route smoke checks return 200/307” unchecked; subtask 8 defers prod rebuild to wave-level.

**Impact:** No live 200/307 proof for `/home` and costs/cache routes in this task’s evidence. Static wiring is correct.

**Fix (optional residual):** Wave-level smoke after rebuild on **22000 only** (not 21000). Not a functional code defect.

### [INFO] F3 — Dashboard topbar is hub-only (by design)

**Evidence:** `DashboardTopbar` mounts only in `src/app/(dashboard)/home/page.tsx`. Destination pages (Analytics, Costs, …) do not re-show the hub strip.

**Impact:** Navigation from hub is one-way; reverse discovery relies on sidebar + Costs own subnav + Analytics `PageTabBar`. Matches subtask 4 (“Add Dashboard topbar to `/home` / Dashboard hub”) and 3b density decision.

**Fix:** None required unless product wants persistent hub chrome on all listed surfaces.

### [INFO] F4 — Dead `CORE_PULSE_ITEMS` still labels Home

**Evidence:** `sidebarVisibility.ts:204-212` still has `i18nKey: "home"` under unused `CORE_PULSE_ITEMS`. Live chrome is `PRIMARY_SIDEBAR_ITEMS` → `SIDEBAR_SECTIONS` only (file header + `Sidebar.tsx`).

**Impact:** None on rendered UI. Pre-existing dead inventory (see Task 0025 F4).

**Fix:** Out of scope for 0056; optional inventory cleanup later.

## Contract Compliance (Exit Conditions)

| Exit / MUST | Status | Live proof |
| --- | --- | --- |
| Sidebar shows **Dashboard**, not Home | ✅ | `PRIMARY_SIDEBAR_ITEMS` `i18nKey: "dashboard"`, `labelFallback: "Dashboard"`; `sidebar.dashboard` in 42 locales |
| `/home` still redirects to onboarding when setup incomplete | ✅ | `home/page.tsx:13-15` `redirect("/dashboard/onboarding")` before JSX |
| Dashboard topbar/subnav exposes target routes or grouped equivalent | ✅ | Grouped top-level: Dashboard, Analytics, Costs, Cache, Tokens, Leaderboard, Profile (deep Analytics/Costs stay on those hubs) |
| `/dashboard/cache` shows Prompt + Semantic + Reasoning together | ✅ | Three stacked cards; no view switcher |
| No internal cache view switcher | ✅ | `activeView`/`CacheView` removed in `6bfed18` |
| `npm run typecheck:core` | ✅ | exit 0 this session |
| Route smoke 200/307 | ⏭ deferred | Allowed residual per task |
| CHANGELOG | ⏭ draft only | Correct — do not apply until acceptance |

### Anti-hallucination guardrails

| Guard | Status |
| --- | --- |
| Do not remove `/home` | ✅ route + `id: "home"` preserved |
| Do not delete Analytics chart colors | ✅ no analytics chart edits in 0056 surfaces |
| Topbar not unusably dense | ✅ `flex-wrap` + 7 top-level links |
| Do not break `/dashboard/analytics/*` redirects | ✅ no analytics route edits |
| Do not remove cache functionality while flattening | ✅ Prompt/Semantic/Reasoning content + clear/refresh preserved |

## Evidence Reviewed

- Task: `docs/tasks/03-review/0056-omniroute-dashboard-ia-consolidation.md`
- Source:
  - `src/shared/constants/sidebarVisibility.ts` (PRIMARY home entry ~792–800)
  - `src/app/(dashboard)/home/page.tsx`
  - `src/app/(dashboard)/home/DashboardTopbar.tsx`
  - `src/app/(dashboard)/dashboard/costs/{page,CostsSubnav,budget/page,pricing/page,quota-share/page}.tsx`
  - `src/app/(dashboard)/dashboard/cache/page.tsx` (+ `ReasoningCacheTab` import)
- i18n: `src/i18n/messages/*.json` — `sidebar.dashboard` present in **42/42** locales; costs subnav keys present
- Tests (related only):
  - `tests/unit/ui/testing-hub-discoverability-0060.test.ts`
  - `tests/unit/ui/sidebar-flat-primary-nav.test.ts`
  - `tests/unit/sidebar-visibility.test.ts`

### Commands run (2026-07-14, this review)

```bash
npm run typecheck:core
# exit 0

node --import tsx/esm --test \
  tests/unit/ui/testing-hub-discoverability-0060.test.ts \
  tests/unit/ui/sidebar-flat-primary-nav.test.ts \
  tests/unit/sidebar-visibility.test.ts
# 25 pass / 0 fail
```

Static FS contract spot-check (Python): sidebar rename, topbar hrefs, costs four-page wire, cache no `activeView`, section stack order — **PASS**.

## Residual Risks / Unrun Checks

- No Playwright / curl smoke on `/home`, `/dashboard/costs/*`, `/dashboard/cache` (deferred)
- No component render test for active-state edge cases (`/dashboard/costs` exact vs `/dashboard/costs/budget` prefix)
- Workspace has unrelated WIP in other IA tasks (0054/0055/0057/0060/0061) — not attributed to 0056

## Lane Action

- **Moved**: `docs/tasks/03-review/0056-omniroute-dashboard-ia-consolidation.md` → `docs/tasks/02-doing/0056-omniroute-dashboard-ia-consolidation.md`
- **Patched**: none (review-only)
- **Blocker for S ≥ 90**: F1 regression tests only

## Findings (severity-ordered summary)

```markdown
## Findings
- [MEDIUM] `tests/` — Missing regression suite for DashboardTopbar / CostsSubnav / cache flatten / sidebar i18nKey.
  Evidence: zero test references to DashboardTopbar or CostsSubnav; only labelFallback asserted elsewhere.
  Impact: IA wiring can regress silently.
  Fix: add `dashboard-ia-consolidation-0056` unit tests covering the five assertions listed under F1.

- [LOW] Route smoke deferred (task-allowed).
  Evidence: exit checklist unchecked; no local server required by task.
  Impact: no HTTP proof this session.
  Fix: wave-level smoke on port 22000 after rebuild.

## Open Questions
- None blocking; hub-only topbar is an intentional product choice (F3).

## Verdict
NEEDS FIX (88/100) — return to 02-doing for F1 tests.
```
