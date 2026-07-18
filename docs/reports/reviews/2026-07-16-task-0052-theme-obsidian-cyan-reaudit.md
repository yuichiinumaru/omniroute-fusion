# Review Report: Task 0052 — Theme Obsidian + Cyan + Dark-Only — 2026-07-16 (adversarial re-audit)

## Review Lineage

- **Current task**: Task 0052 (`omniroute-theme-obsidian-cyan-darkonly`); live path `docs/tasks/03-review/0052-omniroute-theme-obsidian-cyan-darkonly.md`
- **Previous reports read**:
  - `docs/reports/reviews/2026-07-14-task-0052-theme-obsidian-cyan-review.md` — **91/100** PASS WITH NOTES (hold-in-review)
- **Related reports / deps considered**:
  - Task 0053 strip-appearance (store freeze / ThemeToggle archive already applied on shared `themeStore.ts`)
  - Task 0055 dark-only Input defaults (tangential token hygiene)
- **Review mode**: `re-review` (adversarial independent re-audit — do **not** rubber-stamp prior 91)
- **Reviewer profile**: `reviewers` (Frontend Quality Reviewer / agentID=reviewers)
- **Parent agentID**: `reviewers`

## Score And Verdict

- **Score**: `90/100`
- **Verdict**: `HELD_IN_REVIEW_PATH_TO_100`
- **Lane recommendation**: `hold-in-review` (S ≥ 90 — remain in `docs/tasks/03-review/`; do **not** return to `02-doing/`; do **not** promote to `04-completed/`)

### Rubric snapshot

| Dimension | Score | Notes |
| --- | --- | --- |
| Dark-only enforcement | 97 | `html.dark`, `color-scheme: dark`, no `.dark {` light override block, `initTheme()` forces class + cyan |
| Coral residual | 98 | `rg "#e54d5e\|#c93d4e" src/` → 0 production hits (comment-only history) |
| Token / CSS migration | 96 | Obsidian `#030506` / panel `#080c0e` / primary `#00FFCC` / border `#121d22`; fumadocs mapped |
| Fonts | 98 | Rajdhani via `next/font/google`; `--font-sans` wired; Inter gone |
| Exit-condition honesty | 84 | Several task exit greps still non-zero by design/stub; integration theme assert still red |
| Residual brand surfaces | 88 | ColumnToggle indigo, ConsoleLogViewer pre-VR hexes, statusVocabulary **header still claims coral SSoT** |
| Task status honesty | 70 | Header still said `[ ] Open` while prior score was 91 — phantom state fixed this reaudit |
| Tests | 85 | theme-store-presets + settings static green; **integration-wiring opaque-theme still FAIL** |

## Delta Summary

### Resolved Since Previous Review

- none of the path-to-100 items (N1–N8) were fixed in production between prior review and this reaudit.

### Persistent Findings

- `PERSISTENT` N1 — integration-wiring asserts light `#ffffff` + old dark `#161b22` card tokens (still FAIL this session)
- `PERSISTENT` N2 — `getSidebarIconAccent` stub export remains (`currentColor` passthrough)
- `PERSISTENT` N3 — `body::before` / grid-wallpaper **comments** in DashboardLayout + DataTable (CSS rule gone)
- `PERSISTENT` N4 — ColumnToggle hardcodes `#6366f1`
- `PERSISTENT` N5 — ConsoleLogViewer header `bg-[#161b22] border-[#30363d]`
- `PERSISTENT` N6 — `statusVocabulary.ts` module header still documents coral SSoT + optional cyan preset (runtime values already use `text-primary` / cyan glow)

### Regressions

- none — VR tokens and dark-only runtime remain greppably intact.

### New Findings

- `NEW` N9 — **Task header honesty**: Status line was still `[ ] Open` while implementation + prior 91 review existed (phantom “open” state). Corrected this reaudit to reflect PASS WITH NOTES / hold-in-review.
- `NEW` N10 (Info) — ~195 files / ~853 `dark:` utility hits remain. Not a light theme leak: `@custom-variant dark` + `html.dark` keep them active. Removing the variant without scrubbing utilities would break status chips (prior Accept).

### Evidence Gaps / External Blockers

- `EVIDENCE_GAP` — no authenticated Home/Settings visual screenshot this session (code-level tokens only).
- Full `npm run build` not re-run (typecheck:core exit 0 this session).

## Findings

| ID | Class | Severity | Status | Summary | Evidence |
| --- | --- | --- | --- | --- | --- |
| N1 | PERSISTENT | Medium | Open path-to-100 | Integration theme assert still expects pre-migration dual theme card tokens | `tests/integration/integration-wiring.test.ts:284-286` FAIL: expected `/--color-card:\s+#ffffff/`; live CSS has `--color-card: #080c0e` only |
| N2 | PERSISTENT | Low | Open residual | Exit `rg getSidebarIconAccent src/` non-zero | `sidebarVisibility.ts:137-139` stub returns `"currentColor"` |
| N3 | PERSISTENT | Low | Open residual | Grid wallpaper comments remain | `DashboardLayout.tsx:62`, `DataTable.tsx:108` |
| N4 | PERSISTENT | Low | Open residual | ColumnToggle indigo accent | `ColumnToggle.tsx:91` `accentColor: "#6366f1"` |
| N5 | PERSISTENT | Low | Open residual | ConsoleLogViewer pre-VR surfaces | `ConsoleLogViewer.tsx:240` |
| N6 | PERSISTENT | Low | Open residual | statusVocabulary header lies about coral SSoT | `statusVocabulary.ts:5-7`; runtime `info`/`active` already `text-primary` |
| N9 | NEW | Info | Fixed this reaudit | Task status header said Open despite completed implementation | Task file line 3 was `[ ] Open` |
| N10 | NEW | Info | Accept | Massive `dark:` utility surface requires keeping `@custom-variant dark` | `globals.css:22`; not a light-mode path |

### Explicit non-issues (adversarially re-verified)

| Guard | Status | Proof |
| --- | --- | --- |
| No coral hex in `src/` | ✅ | `#e54d5e` / `#c93d4e` → none (comment “OpenClaw coral” only) |
| Primary / accent / info = cyan | ✅ | `globals.css` + `themeStore` `customColor: "#00FFCC"` |
| Obsidian surfaces | ✅ | bg `#030506`, surface/card/sidebar `#080c0e`, border `#121d22` |
| Dark-only CSS block | ✅ | no `.dark {` override block; `color-scheme: dark` only |
| Grid wallpaper CSS | ✅ | no `body::before` rule; no `grid-line` tokens |
| SIDEBAR_ICON_ACCENTS map | ✅ | removed; icons inherit currentColor / text-primary |
| Rajdhani loaded | ✅ | `layout.tsx` `Rajdhani` + `variable: "--font-rajdhani"`; body `font-sans` |
| html forced dark | ✅ | `<html className="dark">` + `initTheme()` `classList.add("dark")` |
| Charts colorful exclusion | ✅ | chart palettes intentionally not scrubbed |

## Contract Compliance (Exit Conditions)

| Exit / MUST | Status | Live proof |
| --- | --- | --- |
| typecheck:core | ✅ | this session exit 0 |
| theme-store-presets | ✅ | 3/3 + settings-ui suite green (11 pass combined) |
| `rg "#e54d5e" src/` = 0 | ✅ | none |
| `rg "#c93d4e" src/` = 0 | ✅ | none |
| `rg SIDEBAR_ICON_ACCENTS src/` = 0 | ✅ | none |
| `rg getSidebarIconAccent src/` = 0 | ⚠️ residual stub | intentional passthrough |
| `rg body::before src/` = 0 | ⚠️ comments only | no CSS rule |
| `rg grid-line src/` = 0 | ✅ | none |
| `rg "\.dark\s+\{" globals.css` = 0 | ✅ | none |
| `rg color-scheme globals.css` = 0 | ⚠️ intentional | `color-scheme: dark` (subtask 2w = remove **light**) |
| Dark + obsidian visual | ✅ code-level | tokens + layout + ThemeProvider |
| Integration opaque-theme | ❌ | still FAIL (N1) |

## Commands Run (this reaudit)

```bash
rg -n "#e54d5e|#c93d4e|SIDEBAR_ICON_ACCENTS|getSidebarIconAccent|body::before|grid-line|color-scheme|\.dark\s+\{" src/
node --import tsx/esm --test tests/unit/theme-store-presets.test.ts tests/unit/settings-ui-layout-static.test.ts
# → 11/11 pass
node --import tsx/esm --test --test-name-pattern "opaque theme" tests/integration/integration-wiring.test.ts
# → FAIL assert #ffffff / #161b22
npm run typecheck:core
# → exit 0
```

## Path-to-100 (ordered; still open)

1. **N1** — Rewrite integration opaque-theme asserts to VR `#080c0e` (drop light `#ffffff` + old `#161b22`).
2. **N2** — Delete `getSidebarIconAccent` stub **or** amend task exit condition documenting the stub.
3. **N3** — Scrub grid-wallpaper comments.
4. **N4–N5** — ColumnToggle / ConsoleLogViewer → CSS tokens.
5. **N6** — Fix statusVocabulary header to “coreCyan brand default; dark-only”.
6. Optional screenshot of Home for visual closeout.

## Verdict Summary

**PASS WITH NOTES — 90/100.** Production VR identity is **real**, not phantom: dark-only is enforced at HTML, CSS, and store layers; coral hexes are gone; cyan + obsidian tokens match the task contract. Prior 91 was directionally correct. Adversarial delta: **no path-to-100 work landed**, the integration theme guard is still red, and the task header falsely claimed Open — score held at **90** (not demoted; not rubber-stamped to 100).

- Task stays: `docs/tasks/03-review/0052-omniroute-theme-obsidian-cyan-darkonly.md`
- Report: `docs/reports/reviews/2026-07-16-task-0052-theme-obsidian-cyan-reaudit.md`
- Moved: **no**
- Patched: task status header + Review Ledger only (no production code)
