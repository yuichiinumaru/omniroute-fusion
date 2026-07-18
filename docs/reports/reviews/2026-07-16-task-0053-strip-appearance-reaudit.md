# Review Report: Task 0053 — Strip Appearance Customization — 2026-07-16 (adversarial re-audit)

## Review Lineage

- **Current task**: Task 0053 (`omniroute-strip-appearance-customization`); live path `docs/tasks/03-review/0053-omniroute-strip-appearance-customization.md`
- **Previous reports read**:
  - `docs/reports/reviews/2026-07-14-task-0053-strip-appearance-review.md` — **93/100** PASS WITH NOTES
- **Related reports / deps considered**:
  - Task 0052 theme dark-only / coreCyan (store shared surface)
  - Task 0061 Interface tab relabel (evidence drift on settings layout)
- **Review mode**: `re-review` (adversarial — strip vs hide, dead code, light leaks)
- **Reviewer profile**: `reviewers` (Frontend Quality Reviewer / agentID=reviewers)
- **Parent agentID**: `reviewers`

## Score And Verdict

- **Score**: `92/100`
- **Verdict**: `HELD_IN_REVIEW_PATH_TO_100`
- **Lane recommendation**: `hold-in-review` (S ≥ 90 → stay `docs/tasks/03-review/`)

### Rubric snapshot

| Dimension | Score | Notes |
| --- | --- | --- |
| Customization UI truly stripped | 98 | No theme toggle / presets / branding inputs in AppearanceTab |
| Dead code / ThemeToggle | 98 | Archived + unreferenced in `src/`; store mutators gone |
| Dark-only store freeze | 97 | Fixed dark + coreCyan; `initTheme()` only |
| Residual capability (branding apply) | 88 | Sidebar + layout still **apply** DB branding if present (guardrail-aligned) |
| Light-path residual | 86 | `next-themes` onboarding TierFlowDiagram falls to **light SVG** without provider |
| Docs SSoT | 82 | `design.md` / `UI.md` still describe coral + Appearance presets |
| Task status honesty | 78 | Was “Open → In progress”; corrected this reaudit |
| Tests / typecheck | 96 | Contract tests 11/11; typecheck:core exit 0 |

## Delta Summary

### Resolved Since Previous Review

- none of the prior LOW docs / branding / next-themes residuals were fixed.

### Persistent Findings

- `PERSISTENT` L1 — `docs/guides/UI.md:122` still claims coral primary + Appearance presets
- `PERSISTENT` L2 — `design.md:66-67` still documents `COLOR_THEMES` runtime override
- `PERSISTENT` L3 — Sidebar still fetches/applies `instanceName` / custom logo from `/api/settings`
- `PERSISTENT` L4 — `TierFlowDiagram` uses `next-themes` → light SVG default without NextThemesProvider

### Regressions

- none — customization UI remains stripped; ThemeToggle remains archived.

### New Findings

- `NEW` L5 — **Status honesty**: task header still read as Open/In progress despite completion evidence + prior 93. Corrected this reaudit.
- `NEW` L6 (Info) — Appearance route is **not** a dead stub: it is a live **Interface** functional-prefs page (Option B + Task 0061). Adversarial “hidden dead code” hypothesis **rejected** — theme/branding code paths are removed, not CSS-hidden.

### Evidence Gaps

- Full `npm run build` not re-run.
- CHANGELOG still deferred (builder protocol).

## Adversarial Focus Results

| Probe | Result |
| --- | --- |
| Theme/color/branding UI stripped vs merely hidden? | **Stripped** — AppearanceTab source has no `COLOR_THEMES`, themeAccent, whitelabeling, logo/favicon upload UI |
| ThemeToggle dead import? | **No** — 0 hits under `src/`; lives in `.archive/theme-0053/` |
| Store mutators? | **Gone** — no `setTheme` / `toggleTheme` / `setColorTheme` / `setCustomColorTheme` / `COLOR_THEMES` / `DEFAULT_COLOR_THEME` in `src/` |
| Persist middleware? | **Gone** — frozen constants only |
| Light theme UI path? | **No UI toggle**; residual **asset** path in TierFlowDiagram (light SVG when `resolvedTheme !== "dark"`) |
| Branding customization? | **Inputs removed**; **apply path remains** (API/DB → Sidebar chrome + layout favicon/title) |

## Findings

| ID | Class | Severity | Status | Summary | Evidence |
| --- | --- | --- | --- | --- | --- |
| L1 | PERSISTENT | Low | Open | UI.md still describes coral + Appearance presets | `docs/guides/UI.md:122` |
| L2 | PERSISTENT | Low | Open | design.md still documents COLOR_THEMES override | `design.md:66-67` |
| L3 | PERSISTENT | Low | Accept residual | Branding still applied from settings API | `Sidebar.tsx:66-120,369+`; guardrail #3 |
| L4 | PERSISTENT | Low | Open residual | next-themes TierFlowDiagram defaults to light SVG | `TierFlowDiagram.tsx:3-11`; no NextThemesProvider in app tree |
| L5 | NEW | Info | Fixed this reaudit | Task status claimed Open/In progress | Task header line 3 |
| L6 | NEW | Info | Accept | Option B functional Interface page is intentional | `AppearanceTab.tsx` header + `settings/layout.tsx` Interface tab |

## Contract Compliance

| Exit | Status | Proof |
| --- | --- | --- |
| typecheck:core | ✅ | exit 0 this session |
| Appearance no customization UI | ✅ | AppearanceTab functional prefs only |
| No COLOR_THEMES / mutators in src | ✅ | ripgrep 0 |
| ThemeToggle not in src | ✅ | archived |
| themeStore simplified | ✅ | 39 LOC frozen + initTheme |
| Route not 404 | ✅ | appearance page mounts AppearanceTab |
| Tests | ✅ | theme-store-presets + settings-ui-layout-static pass |
| build | ⚠️ | not re-run |
| CHANGELOG | ⚠️ | deferred |

## Commands Run

```bash
rg -n "COLOR_THEMES|DEFAULT_COLOR_THEME|setColorTheme|setCustomColorTheme|toggleTheme|ThemeToggle" src/
# → 0 for removed APIs / ThemeToggle
node --import tsx/esm --test tests/unit/theme-store-presets.test.ts tests/unit/settings-ui-layout-static.test.ts
# → 11/11 pass
npm run typecheck:core
# → exit 0
```

## Path-to-100

1. Hardcode dark tier-flow SVG (or drop next-themes) in `TierFlowDiagram.tsx`.
2. Rewrite `docs/guides/UI.md` + `design.md` theme sections to dark-only coreCyan (no presets).
3. Optionally document API-only white-label residual or freeze Sidebar brand chrome.
4. Append CHANGELOG after human acceptance.

## Verdict Summary

**PASS WITH NOTES — 92/100.** Appearance customization is **actually stripped**, not CSS-hidden. ThemeToggle is archived; store has no mutators; contract tests green. Residuals are docs drift, intentional branding apply plumbing, and one onboarding light-SVG path via unused `next-themes`. Prior 93 stands; score **92** for unfixed residuals + status honesty correction. Stay in `03-review/`.

- Moved: **no**
- Patched: task status + Review Ledger only
