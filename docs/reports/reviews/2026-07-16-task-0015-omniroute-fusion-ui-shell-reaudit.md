# Review Report: Task 0015 — OmniRoute Fusion UI Shell — 2026-07-16 (adversarial re-audit)

## Review Lineage

- **Current task**: Task 0015 (`omniroute-fusion-ui-shell`); live path `docs/tasks/03-review/0015-omniroute-fusion-ui-shell.md`
- **Previous reports read**:
  - `docs/reports/reviews/2026-07-10-task-0015-omniroute-fusion-ui-shell-review.md` — **93/100** `HELD_IN_REVIEW_PATH_TO_100`
- **Related reports considered**:
  - Task 0016 editor reports (sibling surface)
  - Theme task 0052 (removed `SIDEBAR_ICON_ACCENTS` map — supersedes exit bullet on accent color)
- **Review mode**: `re-review` (adversarial re-audit)
- **Reviewer profile**: `reviewers` (gt-frontend-quality-reviewer + tsjs + code-quality-harness)
- **Parent agentID**: `reviewers`

## Score And Verdict

- **Score**: `93/100`
- **Verdict**: `HELD_IN_REVIEW_PATH_TO_100`
- **Lane recommendation**: `hold-in-review` (S ≥ 90 → stay `03-review/`)
- **Level**: Elite (polish / evidence debt only)

## Delta Summary

### Resolved Since Previous Review

- N/A functional fixes since initial hold — shell wiring re-confirmed intact.

### Persistent Findings

- `PERSISTENT` **F1 Improvement**: Card whole-card `onClick` is mouse-oriented; `Card` spreads HTML attrs but page does not set `role` / `tabIndex` / `onKeyDown`. Explicit Edit `Link` still provides keyboard path.
- `PERSISTENT` **F2 Improvement**: List chrome still English literals (`Fusions`, `Create Fusion`, empty state, delete confirm) while sidebar keys use i18n.
- `PERSISTENT` **F3 Debt**: No automated test that the **list page** filter keeps only `fusion` / `conditional-fusion` and excludes hidden/non-fusion. `isFusionStrategy` on the list page is a **private duplicate** of the tested helper in `fusionEditorTypes.ts` — editor unit tests do **not** guard the list filter.

### Regressions

- none functional for shell wiring

### New Findings

- `NEW` **S1 SUPERSEDED**: Exit condition / prior claim `SIDEBAR_ICON_ACCENTS.fusions = #E879F9` is **obsolete**. Theme Task 0052 removed colored sidebar icon accents (`rg SIDEBAR_ICON_ACCENTS src/` → 0). Live sidebar still has `fusions` in `HIDEABLE_SIDEBAR_ITEM_IDS` after `combos-live` and `ROUTING_ITEMS` with `href: /dashboard/fusions`, icon `hub`. Test `icon accents are neutral` encodes the new design.
- `NEW` **F4 Improvement**: List filter helper is duplicated (`page.tsx` local `isFusionStrategy` vs `fusionEditorTypes.isFusionStrategy`) — drift risk if one side changes acceptance set.

### Evidence Gaps / External Blockers

- `EVIDENCE_GAP` F3: pure list filter + hidden exclusion not encoded as automated test against the page module (page does not export the filter).
- Playwright e2e not required for shell wiring proof.

## Findings

| ID | Class | Severity | Status | Summary | First seen | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| F1 | PERSISTENT | Improvement | Open | Card click-to-edit keyboard affordance incomplete | 2026-07-10 | `page.tsx:169–174`; `Card.tsx` passes through props only |
| F2 | PERSISTENT | Improvement | Open | List chrome hardcoded EN | 2026-07-10 | `page.tsx:124–131`, empty/delete strings |
| F3 | PERSISTENT | Debt | Open | No list-filter unit test on shell | 2026-07-10 | no `tests/**` covering fusions `page.tsx` filter |
| S1 | SUPERSEDED | n/a | Closed | Accent map removed by theme 0052 | 2026-07-10 claim / 2026-07-16 reaudit | `SIDEBAR_ICON_ACCENTS` gone; neutral accents test |
| F4 | NEW | Improvement | Open | Duplicate `isFusionStrategy` (list vs editor types) | 2026-07-16 | `page.tsx:15–29` vs `fusionEditorTypes` export |

## Contract / Wiring Proof (re-verified)

| Requirement | Status | Evidence |
| --- | --- | --- |
| `"fusions"` in `HIDEABLE_SIDEBAR_ITEM_IDS` after `combos-live` | ✅ | `sidebarVisibility.ts:31–33` |
| Sidebar item after combos-live, href `/dashboard/fusions`, icon `hub` | ✅ | `ROUTING_ITEMS` L361–368 |
| `SIDEBAR_ICON_ACCENTS.fusions` | ⛔ SUPERSEDED | Accents removed repo-wide (Task 0052) |
| `/dashboard/fusions/page.tsx` list shell | ✅ | client page, **229 LOC** (≤300) |
| Client filter `strategy ∈ {fusion, conditional-fusion}` | ✅ | `FUSION_STRATEGIES` + filter L72 |
| Create / Delete / click-to-edit | ✅ | Create → `/new`; Edit → `/[id]`; DELETE `/api/combos/:id` |
| Empty / loading / error states | ✅ | skeleton, EmptyState, feedback + notify |
| i18n sidebar keys | ✅ | `en.json` `fusions` / `fusionsSubtitle` |
| No new list API routes | ✅ | GET `/api/combos` only |
| No ComboEditor clone | ✅ | focused shell + `RoutingHubSubnav` |
| Sidebar unit tests | ✅ | seven-pillars + visibility — **10 pass** this wave |

### Runtime wiring

```
Sidebar ROUTING_ITEMS.fusions → /dashboard/fusions
  → FusionsPage (client)
  → GET /api/combos → filter fusion strategies + !isHidden
  → Create: /dashboard/fusions/new
  → Edit:   /dashboard/fusions/:id
  → Delete: DELETE /api/combos/:id
```

## Axiom Compliance (tsjs + frontend)

| Axiom | Status | Notes |
| --- | --- | --- |
| Type Purity | ✅ | Local `FusionCombo`; no `any` |
| Boundary Integrity | ✅ | Defensive JSON parse; error toasts |
| Async Determinism | ✅ | `void loadFusions()` / `void handleDelete` |
| Accessibility | ⚠️ | Edit/Delete keyboard OK; whole-card navigate mouse-first |
| Performance | ✅ | Small page; memoized sort |
| No ComboEditor clone | ✅ | D6 shell |

## Evidence Reviewed

- Task + prior review (2026-07-10)
- Source: `fusions/page.tsx`, `sidebarVisibility.ts`, `RoutingHubSubnav.tsx`, `Card.tsx`
- Commands:
  ```bash
  node --import tsx/esm --test \
    tests/unit/ui/sidebar-seven-pillars.test.ts \
    tests/unit/sidebar-visibility.test.ts
  # → 10 pass / 0 fail
  rg -n 'SIDEBAR_ICON_ACCENTS' src/   # none (superseded)
  wc -l src/app/(dashboard)/dashboard/fusions/page.tsx  # 229
  ```

## Scoring Rationale

Prior 93 retained. Wiring still elite; residual deductions for F1/F2 polish and F3/F4 testability drift. SUPERSEDED accent map is not scored as a regression.

## Path To 100

1. **F3+F4**: Export a shared pure `filterFusionCombos` / reuse `isFusionStrategy` from `fusionEditorTypes` (or a tiny `fusionsList.ts`) and unit-test: fusion, conditional-fusion, priority, hidden fusion.
2. **F1**: Drop whole-card `onClick` **or** add `role="link"` + Enter/Space + `tabIndex={0}`.
3. **F2**: Migrate list chrome to next-intl when Task 0017 keys land (non-blocking).

## Patches Applied On Re-Audit

- none (read-only)

## Task Ledger Patch Suggestion

```markdown
### Latest Review
- Date: 2026-07-16
- Score: 93/100
- Verdict: HELD_IN_REVIEW_PATH_TO_100
- Full report: docs/reports/reviews/2026-07-16-task-0015-omniroute-fusion-ui-shell-reaudit.md
- Lane outcome: remains in review

#### Current Open Blockers
- PERSISTENT F1 keyboard card
- PERSISTENT F2 list i18n
- PERSISTENT F3 list filter test
- NEW F4 duplicate isFusionStrategy
- SUPERSEDED: SIDEBAR_ICON_ACCENTS (theme 0052)
```
