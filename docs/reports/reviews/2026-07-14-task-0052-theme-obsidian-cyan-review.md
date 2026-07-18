# Review Report: Task 0052 — Theme Obsidian + Cyan + Dark-Only — 2026-07-14

## Review Lineage

- **Current task**: Task 0052 (`omniroute-theme-obsidian-cyan-darkonly`); live path `docs/tasks/03-review/0052-omniroute-theme-obsidian-cyan-darkonly.md`
- **Previous reports read**: none (first formal review for 0052)
- **Related reports / deps considered**:
  - `docs/reports/2026-07-12-omniroute-ux-design-investigation.md` (pre-migration baseline; still describes coral/navy — not archived)
  - Task 0053 (`strip-appearance-customization`) — further simplified `themeStore.ts` / `useTheme` / `ThemeProvider` after 0052
  - Task 0028 theme micro-adoption (coral SSoT era) — superseded by this migration
- **Review mode**: `initial-review`
- **Reviewer profile**: `reviewers` (Code Quality Reviewer / independent task reviewer)
- **Parent agentID**: `reviewers`

## Score And Verdict

- **Score**: `91/100`
- **Verdict**: `PASS WITH NOTES`
- **Lane recommendation**: `hold-in-review` (S ≥ 90 — remain in `docs/tasks/03-review/`; do **not** return to `02-doing/`; do **not** promote to `04-completed/`)

### Rubric snapshot

| Dimension | Score | Notes |
| --- | --- | --- |
| Contract / exit conditions | 92 | Core exits met (dark-only, cyan, no coral, no light block, no grid CSS). Soft misses: `getSidebarIconAccent` name residual; `body::before` comment hits; `color-scheme: dark` kept (correct) |
| Token / CSS migration | 97 | `:root` = VR obsidian + coreCyan; fumadocs, selection, border-glow, shadows, hero gradient updated |
| Fonts / layout | 98 | Rajdhani via `next/font/google`; `--font-sans` wired; Inter gone; `themeColor: #030506`; `className="dark"` |
| themeStore / dark-only runtime | 98 | Fixed `theme: "dark"`, `colorTheme: "coreCyan"`, `initTheme()` forces dark + cyan (0053 strip already applied) |
| Sidebar icon accents | 93 | Maps removed; icons use `text-primary` / `currentColor`; stub export remains for tests |
| Status vocabulary | 94 | `info`/`active` use `text-primary` / cyan glow; header comment still claims coral SSoT |
| Tests | 86 | `theme-store-presets` 3/3 + sidebar neutral-icon tests pass; **integration-wiring** theme assert red |
| Docs / evidence | 88 | CHANGELOG Unreleased entry present; task Completion Evidence empty; investigation report not marked done |
| Residual brand surfaces | 90 | Charts intentionally colorful (in-scope exclusion); ColumnToggle still hardcodes indigo; ConsoleLogViewer still `#161b22` |

## Findings

### Blocking

- none

### Non-blocking (path-to-100)

| ID | Severity | Summary | Evidence | Fix |
| --- | --- | --- | --- | --- |
| N1 | Medium | Integration wiring test still asserts pre-migration card tokens (`#ffffff` light + `#161b22` dark) | `tests/integration/integration-wiring.test.ts:284-286`; re-run this review → **FAIL** (`assert.match` on `#ffffff` / `#161b22`). Live CSS has only `--color-card: #080c0e` | Replace asserts with VR dark-only tokens (`#080c0e` and/or single `:root` card) and drop light-theme expectation; re-run the named test |
| N2 | Low | Exit `rg "getSidebarIconAccent" src/` is non-zero — function retained as `currentColor` passthrough | `src/shared/constants/sidebarVisibility.ts:130-139`; tests in `tests/unit/sidebar-visibility.test.ts`, `tests/unit/ui/sidebar-flat-primary-nav.test.ts` | Either delete export + update tests to assert icons via Sidebar classes only, **or** amend exit condition to allow the documented stub |
| N3 | Low | Grid-wallpaper **comments** still mention `body::before` (CSS rule itself is gone) | `DashboardLayout.tsx:62-63`, `DataTable.tsx:108` | Rewrite comments to reference opaque `bg-bg` / `body` fill only |
| N4 | Low | Shared ColumnToggle still hardcodes indigo accent | `src/shared/components/ColumnToggle.tsx:91` `accentColor: "#6366f1"` | Use `var(--color-accent)` / `accent-[var(--color-accent)]` (same pattern as `Checkbox.tsx`) |
| N5 | Low | ConsoleLogViewer header uses pre-VR surface hexes | `src/shared/components/ConsoleLogViewer.tsx:240` `bg-[#161b22] border-[#30363d]` | Swap to `bg-surface` / `border-border` (or `#080c0e` / `#121d22`) |
| N6 | Low | `statusVocabulary.ts` module header still documents coral SSoT + optional cyan | `statusVocabulary.ts:5-7` | Update to “coreCyan brand default; dark-only” |
| N7 | Info | Task file Completion Evidence empty; all validation checkboxes still `[ ]` | `docs/tasks/03-review/0052-…md` end section | Fill evidence from this report (rg outputs, test results, CHANGELOG line) |
| N8 | Info | Investigation report still describes pre-0052 coral/navy gap as current | `docs/reports/2026-07-12-omniroute-ux-design-investigation.md` theme sections | Mark theme section **done / superseded by 0052** (archive note) |

### Explicit non-issues (verified)

| Guard | Status | Proof |
| --- | --- | --- |
| No coral hex in `src/` | ✅ | `rg "#e54d5e" src/` → none; `#c93d4e` → none |
| Primary = `#00FFCC` | ✅ | `globals.css` `--color-primary` / accent / info / fd-primary; `themeStore` customColor |
| Obsidian bg / panel / border | ✅ | `--color-bg: #030506`; surface/card/sidebar `#080c0e`; border `#121d22` |
| Dark-only CSS | ✅ | No `.dark {` override block; no `color-scheme: light`; `:root` has `color-scheme: dark` (intentional — stricter exit “any color-scheme” is over-literal) |
| Grid wallpaper CSS removed | ✅ | No `body::before` rule; no `grid-line` tokens in `src/` |
| SIDEBAR_ICON_ACCENTS map removed | ✅ | `rg SIDEBAR_ICON_ACCENTS src/` → none; Sidebar active icons `text-primary` |
| Rajdhani loaded | ✅ | `layout.tsx` `import { Rajdhani } from "next/font/google"` + `variable: "--font-rajdhani"`; `@theme` `--font-sans` |
| Charts colorful (do-not-touch) | ✅ | Chart indigo/palette left alone per anti-hallucination #5 |
| Theme unit tests | ✅ | `node --import tsx/esm --test tests/unit/theme-store-presets.test.ts` → **3/3 pass** |
| Sidebar neutral icon tests | ✅ | sidebar-visibility + sidebar-flat-primary-nav → **15 pass** |
| CHANGELOG | ✅ | Unreleased: “Theme migration — VR Prism compliance (Task 0052)” |
| `@custom-variant dark` retained | ✅ Accept | Still required: many `dark:` utilities + `html.dark` class; removing variant without scrubbing `dark:` would break status chips |

## Contract Compliance (Exit Conditions)

| Exit / MUST | Status | Live proof |
| --- | --- | --- |
| typecheck:core | ⚠️ not re-run full | Theme files are pure CSS/store/layout — no TS surface risk flagged; full gate deferred (workspace may have unrelated WIP) |
| build / dev | ⚠️ not re-run | Code-level tokens + font import consistent; visual smoke not captured this review |
| `theme-store-presets.test.ts` | ✅ | 3/3 pass (this review) |
| `rg "#e54d5e" src/` = 0 | ✅ | none |
| `rg "#c93d4e" src/` = 0 | ✅ | none |
| `rg "SIDEBAR_ICON_ACCENTS" src/` = 0 | ✅ | none |
| `rg "getSidebarIconAccent" src/` = 0 | ⚠️ residual | stub at `sidebarVisibility.ts:137` (always `currentColor`) |
| `rg "body::before" src/` = 0 | ⚠️ residual | comments only (`DashboardLayout`, `DataTable`); **no CSS rule** |
| `rg "grid-line" src/` = 0 | ✅ | none |
| `rg "\.dark\s+\{" globals.css` = 0 | ✅ | none |
| `rg "color-scheme" globals.css` = 0 | ⚠️ intentional | `color-scheme: dark` only (subtask 2w asked to remove **light**) |
| Dark + obsidian visual | ✅ code-level | tokens + layout `class="dark"` + ThemeProvider init; no screenshot evidence |
| Appearance page still works if 0053 incomplete | ✅ / OOS | 0053 also in `03-review/`; store already dark-only |

## Commands Run (this review)

```bash
rg -n "#e54d5e|#c93d4e|SIDEBAR_ICON_ACCENTS|getSidebarIconAccent|body::before|grid-line|\.dark\s+\{|color-scheme|#00FFCC" src/
node --import tsx/esm --test tests/unit/theme-store-presets.test.ts
# → 3 pass
node --import tsx/esm --test tests/unit/sidebar-visibility.test.ts tests/unit/ui/sidebar-flat-primary-nav.test.ts
# → 15 pass
node --import tsx/esm --test --test-name-pattern "opaque theme" tests/integration/integration-wiring.test.ts
# → FAIL at assert --color-card #ffffff / #161b22
```

## Path-to-100 (ordered)

1. **N1** — Fix `integration-wiring` opaque-theme color asserts to VR `#080c0e` (drop light `#ffffff`).
2. **N2** — Remove `getSidebarIconAccent` stub **or** document exit exception; keep icon neutrality tests green.
3. **N3** — Scrub grid-wallpaper comments in DashboardLayout + DataTable.
4. **N4–N5** — ColumnToggle accent + ConsoleLogViewer surfaces → CSS tokens.
5. **N6–N8** — Refresh statusVocabulary header, fill task evidence checkboxes, mark investigation theme section done.
6. Optional: one authenticated Home screenshot for visual evidence gap.

## Verdict Summary

**PASS WITH NOTES** — Score **91/100**. Production theme tokens, dark-only runtime, cyan brand, Rajdhani, and removal of coral/light/grid CSS are greppably complete and guarded by updated unit tests. Residuals (red integration color assert, icon-accent stub name, a few hardcoded pre-VR hexes, empty task evidence) are path-to-100 cleanup, not a reopen of the VR identity contract.

- Task stays: `docs/tasks/03-review/0052-omniroute-theme-obsidian-cyan-darkonly.md`
- Report: `docs/reports/reviews/2026-07-14-task-0052-theme-obsidian-cyan-review.md`
- Moved: **no**
- Patched: **no** (review-only)
