# Review Report: Task 0015 — OmniRoute Fusion UI Shell — 2026-07-10

## Review Lineage

- **Current task**: Task 0015 (`omniroute-fusion-ui-shell`); live path `docs/tasks/03-review/0015-omniroute-fusion-ui-shell.md`
- **Previous reports read**: none found
- **Related reports considered**: none (Task 0016 editor reviewed in parallel)
- **Review mode**: `initial`
- **Reviewer profile**: `reviewers` (gt-frontend-quality-reviewer + tsjs)
- **Parent agentID**: `reviewers`

## Score And Verdict

- **Score**: `93/100`
- **Verdict**: `HELD_IN_REVIEW_PATH_TO_100`
- **Lane recommendation**: `hold-in-review`
- **Level**: Elite (minor polish / evidence gaps only)

## Delta Summary

### Resolved Since Previous Review
- N/A (initial review)

### Persistent Findings
- none

### Regressions
- none

### New Findings
- `NEW` F1: Card whole-card `onClick` is mouse-oriented (keyboard still has Edit `Link`)
- `NEW` F2: List chrome uses English literals (documented Task 0017 / scope deviation)
- `NEW` F3: No dedicated list-page unit test for strategy filter (sidebar registration is covered)

### Evidence Gaps / External Blockers
- `EVIDENCE_GAP` F3: pure list filter/delete happy-path not encoded as automated UI/unit test
- `EXTERNAL_BLOCKER`: none (browser smoke not required for shell wiring proof)

## Findings

| ID | Class | Severity | Status | Summary | First seen | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| F1 | NEW | Improvement | Open | Card click-to-edit lacks `role`/`tabIndex`/`onKeyDown`; Edit link mitigates | 2026-07-10 | `src/app/(dashboard)/dashboard/fusions/page.tsx:166-171` |
| F2 | NEW | Improvement | Open | List strings hardcoded EN (sidebar i18n done) | 2026-07-10 | `page.tsx:123-129`, task deviation note |
| F3 | NEW | Debt | Open | No automated assertion that list filters only fusion strategies | 2026-07-10 | no `tests/**/*fusion*ui*` covering list |

## Contract / Wiring Proof

| Requirement | Status | Evidence |
| --- | --- | --- |
| `"fusions"` in `HIDEABLE_SIDEBAR_ITEM_IDS` after `combos-live` | ✅ | `sidebarVisibility.ts` indices adjacent (combos-live → fusions) |
| Sidebar item in routing tree after `combos-live`, `href: /dashboard/fusions`, icon `hub` | ✅ | `ROUTING_ITEMS` (current equivalent of task’s `OMNI_PROXY_ITEMS`) `id: "fusions"` |
| `SIDEBAR_ICON_ACCENTS.fusions` | ✅ | `#E879F9` |
| `/dashboard/fusions/page.tsx` list shell | ✅ | client page, 226 LOC |
| Client filter `strategy ∈ {fusion, conditional-fusion}` | ✅ | `FUSION_STRATEGIES` + `isFusionStrategy` |
| Create / Delete / click-to-edit | ✅ | Create → `/new`; Edit → `/[id]`; `DELETE /api/combos/:id` |
| Empty / loading / error states | ✅ | `CardSkeleton`, `EmptyState`, feedback + `notify.error` |
| i18n `sidebar.fusions` + `fusionsSubtitle` | ✅ | `en.json` |
| No new list API routes | ✅ | `GET /api/combos` only |
| No ComboEditor clone | ✅ | independent page; reuses `Card`/`Button`/`EmptyState` |
| CHANGELOG Unreleased entry | ✅ | Task 0015 entry present |
| typecheck / lint | ✅ | `npm run typecheck:core` exit 0; eslint fusion + sidebar exit 0 |
| Sidebar placement tests | ✅ | `tests/unit/ui/sidebar-seven-pillars.test.ts`, `tests/unit/sidebar-visibility.test.ts` (52 pass) |

### Runtime wiring (non-test call sites)

```
Sidebar ROUTING_ITEMS.fusions
  → href /dashboard/fusions
  → FusionsPage (client)
  → fetch GET /api/combos  (requireManagementAuth)
  → filter fusion strategies
  → Create: router.push /dashboard/fusions/new
  → Edit:   /dashboard/fusions/:id
  → Delete: DELETE /api/combos/:id
```

API handlers verified: `src/app/api/combos/route.ts` GET/POST; `src/app/api/combos/[id]/route.ts` GET/PUT/DELETE.

## Axiom Compliance (tsjs + frontend)

| Axiom | Status | Notes |
| --- | --- | --- |
| Type Purity | ✅ | Local `FusionCombo` type; no `any` in page |
| Boundary Integrity | ✅ | Parses API JSON defensively; no raw trust of shape beyond arrays/objects |
| Async Determinism | ✅ | `void loadFusions()` / `void handleDelete`; errors to notify |
| Accessibility (keyboard) | ⚠️ | Edit/Delete buttons OK; whole-card navigate is mouse-first |
| Performance | ✅ | Small page; memoized sort; no heavy deps |
| No ComboEditor clone | ✅ | Focused shell |

## Evidence Reviewed

- Task: `docs/tasks/03-review/0015-omniroute-fusion-ui-shell.md`
- Source: `fusions/page.tsx`, `[id]/page.tsx` (editor owned by 0016), `sidebarVisibility.ts`, `en.json`, `CHANGELOG.md`
- API: `src/app/api/combos/route.ts`, `[id]/route.ts`
- Tests: sidebar unit suites
- Commands run:
  - `npx eslint --max-warnings 0` on fusions + sidebarVisibility → exit 0
  - `npm run typecheck:core` → exit 0
  - `node --import tsx/esm --test tests/unit/ui/sidebar-seven-pillars.test.ts tests/unit/sidebar-visibility.test.ts` → 52 pass
- Commands not run: Playwright e2e (not required for shell wiring; no dedicated e2e task)

## Path To 100

1. Add a tiny pure export or inline-tested helper for `isFusionStrategy` / list filter + unit test with sample combos (including non-fusion and hidden).
2. Prefer making the card a single keyboard-accessible control (wrap in `Link` or add `role="link"` + Enter/Space) **or** drop whole-card `onClick` and keep explicit Edit only.
3. Optionally migrate list chrome strings to `next-intl` when Task 0017 lands (do not block 0015).

## Suggested Patches (non-applied)

### Patch A — unit-test list filter helper

Extract:

```ts
export function filterFusionCombos(combos: FusionCombo[]): FusionCombo[] {
  return combos.filter((c) => !c.isHidden && isFusionStrategy(c.strategy));
}
```

Test cases: fusion, conditional-fusion, priority, hidden fusion.

### Patch B — keyboard card navigation

```tsx
// Option 1: remove Card onClick; rely on Edit Link only
// Option 2:
onKeyDown={(e) => {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    router.push(`/dashboard/fusions/${combo.id}`);
  }
}}
role="link"
tabIndex={0}
```

## Task Ledger Patch Suggestion

```markdown
## Review Ledger
### Latest Review
- Date: 2026-07-10
- Reviewer profile: reviewers
- Score: 93/100
- Verdict: HELD_IN_REVIEW_PATH_TO_100
- Full report: docs/reports/reviews/2026-07-10-task-0015-omniroute-fusion-ui-shell-review.md
- Lane outcome: remains in review
```
