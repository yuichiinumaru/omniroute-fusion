# Re-Audit Report: Task 0028 — Theme Micro VR Adoption — 2026-07-16

## Review Lineage

- **Current task**: Task 0028 (`frontend-ia-theme-micro-adoption`); path was `docs/tasks/03-review/` → **demoted this reaudit**
- **Previous reports read**:
  - `docs/reports/reviews/2026-07-11-task-0028-frontend-ia-theme-micro-adoption-review.md` (score **98**)
  - `docs/reports/reviews/2026-07-10-task-0028-frontend-ia-theme-micro-adoption-review.md` (score **93**)
- **Related later work (must not ignore)**:
  - Task **0052** — theme obsidian + coreCyan dark-only brand flip
  - Task **0053** — strip Appearance customization
- **Review mode**: `adversarial-reaudit`
- **Reviewer profile**: `reviewers` (Frontend Quality)
- **Parent agentID**: `reviewers`

## Score And Verdict

- **Score**: `88/100` (**down from 98**)
- **Verdict**: `RETURN_TO_DOING` / `REGRESSION_IN_GUARDS`
- **Lane recommendation**: `return-to-doing` (S < 90 — move to `docs/tasks/02-doing/`)

### Rubric snapshot

| Dimension | Score | Notes |
| --- | --- | --- |
| Status vocabulary production wiring | 96 | Map + Badge/health still live on TokenHealthBadge, DegradationBadge, ProviderHealthMatrixCard |
| StatCard accent | 98 | `accent` default `none`; API intact |
| Glow budget (production) | 94 | Soft glow limited to health/breaker; now CSS utility classes + `globals.css` |
| Brand exit as originally written | 40 | **Superseded**: coral no longer default; coreCyan is fixed brand; Appearance preset UI gone (0052/0053) |
| Regression tests for 0028 | 55 | **FAIL**: `status-vocabulary` glow test + `badge-status` shadow assertion red |
| No Prism / Orbitron | 100 | Still clean |
| Doc honesty in module comments | 70 | `statusVocabulary.ts` header still claims coral SSoT + optional cyan |

## Delta Summary

### Still true (durable micro-adoption)

- `src/shared/constants/statusVocabulary.ts` exists; Badge `status`/`glow` props work
- StatCard `accent` prop remains backward-compatible
- Soft glow still not global layout chrome
- No Orbitron / scanlines / Prism production imports

### Superseded by later tasks (not a silent 0028 code delete)

| Original 0028 exit | Live 2026-07-16 |
| --- | --- |
| `DEFAULT_COLOR_THEME = coral`; coreCyan optional Appearance | `themeStore`: dark-only, `colorTheme: "coreCyan"`, `customColor: "#00FFCC"`; no preset picker |
| Light + dark dual theme | Product is **dark-only** (`color-scheme: dark`; `initTheme` forces `.dark`) |
| Appearance swatch for coreCyan | AppearanceTab is Interface prefs only (0053) |

Treat brand flip as **intentional successor work**, not an accidental 0028 wipe. Score penalty is for **stale regression guards + stale module commentary**, not for removing vocab/StatCard.

### Regressions (this reaudit)

1. **`tests/unit/status-vocabulary.test.ts`** — FAIL  
   Asserts `statusGlowClass("degraded").includes("shadow-")` and `/var\(--status-glow-…\)/` **in the class string**.  
   Live implementation returns CSS class names only (`status-glow-warning`, …); `box-shadow: var(--status-glow-*)` lives in `globals.css`.

2. **`tests/unit/ui/badge-status.test.tsx`** — FAIL  
   Expects className to match `/shadow-\[/`; live Badge applies `status-glow-danger` (utility), not arbitrary Tailwind shadow.

3. **Module header / CHANGELOG narrative** still describe coral-as-SSoT optional cyan — contradicts live brand after 0052/0053.

### Production glow still works

```css
/* globals.css */
.status-glow-danger {
  box-shadow: 0 0 8px var(--status-glow-danger);
}
```

Functional glow path is intact; **tests were not updated** when glow moved off inline `shadow-[…]` utilities (0052-era fix comment in globals).

## Findings

| ID | Class | Severity | Status | Summary | Evidence |
| --- | --- | --- | --- | --- | --- |
| R1 | REGRESSION | High | Open | Task 0028 glow unit tests fail | `status-vocabulary.test.ts:60–68`; `badge-status.test.tsx:80` |
| R2 | SUPERSEDED | Medium | Accepted successor | Coral default + optional cyan exit no longer true | `themeStore.ts` dark-only coreCyan; Appearance stripped |
| R3 | NEW | Low | Open | `statusVocabulary.ts` file header still claims coral SSoT | lines 6–7 |
| N1 | NOTE | Info | Residual | ModelPill degraded still yellow vs Badge amber | ProviderHealthMatrixCard (prior N2) |
| G1 | Guard | Pass | Pass | No Prism/Orbitron/visual-reference production imports | rg + theme-store-presets |
| G2 | Guard | Pass | Pass | StatCard accent default `none` | `charts.tsx` |
| G3 | Guard | Pass | Pass | Health surfaces still use vocabulary | TokenHealthBadge, DegradationBadge, matrix |

## Tests this session

| Suite | Result |
| --- | --- |
| `tests/unit/status-vocabulary.test.ts` | **5/6 FAIL** (glow assertion) |
| `tests/unit/theme-store-presets.test.ts` | **PASS** (rewritten for coreCyan brand) |
| `tests/unit/ui/stat-card-accent.test.tsx` | **3/3 PASS** |
| `tests/unit/ui/badge-status.test.tsx` | **FAIL** (1 test: shadow-\[) |

## Path-to-100 / return-to-doing work

1. **Update glow tests** to assert `status-glow-*` class names + presence of matching rules in `globals.css` (not inline `shadow-` / `var(` inside class strings).
2. **Refresh module header + any 0028 CHANGELOG wording** to state: vocab/StatCard/glow micro-adoption remains; brand SSoT is now coreCyan dark-only (0052/0053).
3. Optional: align ModelPill degraded chroma with amber vocabulary track.
4. Re-run the four test files above to green; then re-review.

## Lane outcome

**Return to `docs/tasks/02-doing/`** (S = 88 < 90). Production micro-patterns mostly hold; **regression-guard suite red** is disqualifying under adversarial reaudit.
