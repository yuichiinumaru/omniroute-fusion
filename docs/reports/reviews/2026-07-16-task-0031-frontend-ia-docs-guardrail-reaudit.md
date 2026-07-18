# Re-Audit Report: Task 0031 — Docs Guide + No-New-Leaf Guardrail — 2026-07-16

## Review Lineage

- **Current task**: Task 0031 (`frontend-ia-docs-guardrail`); path was `docs/tasks/03-review/` → **demoted this reaudit**
- **Previous reports read**:
  - `docs/reports/reviews/2026-07-11-task-0031-frontend-ia-docs-guardrail-review.md` (score **96**)
  - `docs/reports/reviews/2026-07-10-task-0031-frontend-ia-docs-guardrail-review.md` (score **93**)
- **Related later work (must re-verify SSoT)**:
  - Task **0052/0053** — coreCyan dark-only brand; Appearance strip
  - Task **0059** — Operations hub; primary chrome 9 leaves (`operations` absorbs api-manager + cli-code)
- **Review mode**: `adversarial-reaudit` (Doc Accuracy Discipline — live tree only)
- **Reviewer profile**: `reviewers` (Frontend Quality + docs accuracy)
- **Parent agentID**: `reviewers`

## Score And Verdict

- **Score**: `84/100` (**down from 96**)
- **Verdict**: `RETURN_TO_DOING` / `SSoT_DRIFT`
- **Lane recommendation**: `return-to-doing` (S < 90 — move to `docs/tasks/02-doing/`)

### Rubric snapshot

| Dimension | Score | Notes |
| --- | --- | --- |
| Five invariants present | 100 | §1 table complete |
| Conceptual 7 pillars vs code | 100 | Matches `OPERATIONAL_PILLAR_SECTION_IDS` |
| **Live chrome table (§2.1) vs PRIMARY** | **45** | **Stale / wrong ids after 0059** |
| observeHub SSoT | 98 | Correct; MONITORING historical |
| DESING / design dual SSoT | 95 | Stub + archive policy hold |
| Primitives table paths | 96 | Real paths; still accurate |
| Brand / theme claims in UI.md | 40 | Claims coral default + Appearance preset — **false** post-0052/53 |
| Guide length / no fabrication of APIs | 90 | Short; pillar ids real; chrome row contents are fabricated-relative-to-live |

## Live chrome dump (this session)

```
PRIMARY_SIDEBAR_ITEMS (9):
  home, providers, combos, activity, analytics,
  costs, operations, settings-general, docs

SIDEBAR_SECTIONS: main, devtools

OPERATIONAL_PILLAR_SECTION_IDS (7):
  core-pulse, registry, routing, governance,
  operations, observability, system
```

## UI.md §2.1 table (live file) — **mismatch**

| # | UI.md claims | Live PRIMARY |
|---|--------------|--------------|
| 1 | `home` | `home` ✅ |
| 2 | `providers` | `providers` ✅ |
| 3 | `combos` | `combos` ✅ |
| 4 | **`api-manager`** | **missing** — absorbed by Operations hub |
| 5 | `activity` | `activity` (now #4) |
| 6 | `analytics` | `analytics` |
| 7 | `costs` | `costs` |
| 8 | **`cli-code`** | **missing** — replaced by **`operations`** → `/dashboard/operations` |
| 9 | `settings-general` | `settings-general` |
| 10 | `docs` | `docs` |
| count | **10** | **9** |

This is the exact failure mode Task 0031 exists to prevent: **docs that do not match live `PRIMARY_SIDEBAR_ITEMS`**. Prior 96/100 re-review was correct **for 2026-07-11 tree**; tree moved (0059). Guide was not updated.

## Brand / theme claim — **false**

UI.md §4:

> Brand primary remains coral unless the operator picks an Appearance preset.

Live:

- `themeStore`: `colorTheme: "coreCyan"`, dark-only
- `globals.css`: `--color-primary: #00FFCC`
- Appearance customization stripped (0053); no operator coral/cyan swatch flow

Anti-pattern row still cites `` `design.md` coral identity `` — design.md itself is also coral-era, but **UI.md is the IA guide that agents will trust for “current product”**.

## What still holds (do not throw out)

| Exit | Status |
| --- | --- |
| `docs/guides/UI.md` exists | ✅ 153 lines |
| Five invariants | ✅ |
| Seven conceptual pillars listed | ✅ match code |
| Archive policy + DESING stub | ✅ |
| observeHub as Observe SSoT | ✅ |
| Primitives paths exist | ✅ PageTabBar, SettingsToggleRow, ConfigurableToolCard, … |
| Epic points to guide | ✅ (not re-broken this session) |
| No-new-leaf rule | ✅ still correct policy |

## Findings

| ID | Class | Severity | Status | Summary | Evidence |
| --- | --- | --- | --- | --- | --- |
| R1 | REGRESSION | **High** | Open | §2.1 primary chrome table wrong vs live PRIMARY (api-manager/cli-code vs operations; 10 vs 9) | UI.md:45–54 vs `sidebarVisibility.ts:792–873` |
| R2 | REGRESSION | Medium | Open | Brand line claims coral + Appearance presets | UI.md:122; themeStore/globals live coreCyan dark-only |
| R3 | REGRESSION | Low | Open | Anti-pattern “coral identity” wording | UI.md:98 |
| N1 | NEW | Info | Open | `NAV-TREE-TARGET.md` §2 same stale 10-leaf chrome — sibling SSoT drift (out of 0031 file but same family) | NAV-TREE-TARGET.md:43–54 |
| F8 | PERSISTENT | Info | Open | sidebarVisibility header may still lag chrome wording | prior review |
| G1 | Guard | Pass | Pass | 7 conceptual pillars match export | live import |
| G2 | Guard | Pass | Pass | observeHub + five invariants | UI.md §1/§3/§6 |
| G3 | Guard | Pass | Pass | DESING supersede stub | root DESING.md |

## Path-to-100 / return-to-doing work

1. **Rewrite UI.md §2.1** from a fresh dump of `PRIMARY_SIDEBAR_ITEMS` (9 rows; `operations` hub; note api-manager / cli-code deep links + hideable ids).
2. **Fix brand paragraph** to coreCyan dark-only (0052/0053); point Appearance → Interface functional prefs only.
3. **Touch anti-pattern coral row** → status/metric micro-patterns without claiming coral product brand.
4. Optionally fix `NAV-TREE-TARGET.md` §2 live chrome in the same PR (same operator SSoT family).
5. Re-import pillars + primary via `tsx` and paste into evidence; re-run doc accuracy checks for UI.md.

## Lane outcome

**Return to `docs/tasks/02-doing/`** (S = 84 < 90). Governance guide that misstates live chrome fails its own Doc Accuracy Discipline after 0059/0052.
