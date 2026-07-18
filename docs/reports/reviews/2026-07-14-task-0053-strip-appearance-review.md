# Review Report: Task 0053 — Strip Appearance Customization — 2026-07-14

## Review Lineage

- **Current task**: Task 0053 (`omniroute-strip-appearance-customization`); live path `docs/tasks/03-review/0053-omniroute-strip-appearance-customization.md`
- **Previous reports read**: none for 0053 (first independent review)
- **Related reports / deps considered**:
  - Task 0052 (`docs/tasks/03-review/0052-omniroute-theme-obsidian-cyan-darkonly.md`) — dark-only + coreCyan hard-lock; both touch `themeStore.ts`
  - Later IA follow-ons visible in live tree (0061 Option B: Appearance route relabeled **Interface**) — evidence drift only
- **Review mode**: `independent` (code-quality / contract audit)
- **Reviewer profile**: `reviewers` (Code Quality Reviewer)
- **Parent agentID**: `reviewers`

## Score And Verdict

- **Score**: `93/100`
- **Verdict**: `PASS WITH NOTES`
- **Lane recommendation**: `hold-in-review` (S ≥ 90 → stay `docs/tasks/03-review/`; do **not** return to `02-doing/`; do **not** promote to `04-completed/`)

### Rubric snapshot

| Dimension | Score | Notes |
| --- | --- | --- |
| Contract / exit conditions | 96 | Theme/color/branding UI stripped; store methods + presets gone; Option B functional stub |
| Dead-code / toggle removal | 98 | `ThemeToggle` archived; Header/AuthLayout/index clean; `rg` zero in `src/` |
| themeStore / ThemeProvider | 97 | Frozen dark + coreCyan; `initTheme()` only; no persist/mutators |
| Tests | 94 | Static contract tests pass; source-scan quality appropriate for REMOVE task |
| Scope discipline / guardrails | 95 | Branding DB reads retained per guardrail #3; sidebar hideable id kept |
| Docs / residual surfaces | 86 | `design.md` / `UI.md` still describe Appearance presets / coral; branding still applied from API in Sidebar |

## Findings

- [LOW] `docs/guides/UI.md:122` — Stale theme guidance after strip.
  Evidence: line still says *"Brand primary remains coral unless the operator picks an Appearance preset"* while live store is dark-only `coreCyan` with no Appearance color picker.
  Impact: operators/contributors reading UI.md will chase removed customization UI.
  Fix: rewrite to dark-only coreCyan + pointer to Task 0052/0053; no Appearance preset path.

- [LOW] `design.md:66-67` — Stale `themeStore` / `COLOR_THEMES` documentation.
  Evidence: claims system default + runtime primary override via `COLOR_THEMES` at old line numbers; `rg COLOR_THEMES src/` is empty; store is 39 LOC frozen defaults.
  Impact: design SSoT drifts from production; not a runtime bug.
  Fix: document fixed dark + coreCyan `initTheme()` only; drop preset override language.

- [LOW] `src/shared/components/Sidebar.tsx:66-120,369+` — Custom branding still *applied* if present in settings.
  Evidence: Sidebar still reads `instanceName` / `customLogoBase64|Url` from `/api/settings` and renders custom logo; Zod settings schema still accepts branding fields; layout metadata still reads `instanceName`/`customFavicon*`.
  Impact: no UI to *set* branding (Appearance inputs removed), but pre-existing DB values and raw API PATCH still change chrome. Matches guardrail #3 (stop input UI; DB reads OK) — residual capability, not a contract miss.
  Fix (optional follow-on): freeze brand chrome to defaults, or document intentional API-only white-label residual.

- [LOW] `src/app/(dashboard)/dashboard/onboarding/components/TierFlowDiagram.tsx:3-11` — Residual `next-themes` light asset branch.
  Evidence: imports `useTheme` from `next-themes` and swaps light/dark SVGs; no `NextThemesProvider` wiring found under `src/` (app uses custom `ThemeProvider`).
  Impact: out of Task 0053 Where-table; may always fall to light SVG or undefined theme. Not introduced by Appearance strip.
  Fix: hardcode dark SVG under dark-only policy (better owned by 0052 residual or small follow-on).

- [INFO] Task evidence drift (not a functional failure).
  Evidence: Completion notes claim settings `SETTINGS_TABS` does not include `appearance`; live `settings/layout.tsx` includes `{ value: "appearance", label: "Interface" }` (Task 0061 Option B). Tests already encode the later contract (`settings-ui-layout-static`, `observe-settings-ia-gaps-0061`).
  Impact: historical task markdown is stale; production behavior is coherent (functional Interface page, no theme/branding UI).

## Open Questions

- none blocking approval

## Contract Compliance (Exit Conditions)

| Exit / MUST | Status | Live proof |
| --- | --- | --- |
| `typecheck:core` 0 errors | ✅ | Re-run 2026-07-16: `npm run typecheck:core` exit 0 |
| `npm run build` | ⚠️ not re-run | Evidence gap only; typecheck + targeted tests green |
| Appearance no longer shows customization UI | ✅ | `AppearanceTab.tsx` (447 LOC): tunnels, home pins, combo mode, quota refresh, email privacy, health logs, Electron autostart only |
| No dead imports to removed store APIs | ✅ | `rg COLOR_THEMES\|DEFAULT_COLOR_THEME\|setColorTheme\|setCustomColorTheme\|toggleTheme\|ThemeToggle src/` → 0 |
| ThemeToggle removed from live tree | ✅ | Archived `.archive/theme-0053/`; `.archive` in tsconfig excludes |
| themeStore simplified | ✅ | `themeStore.ts`: frozen `dark`/`coreCyan`/`#00FFCC` + `initTheme()` only |
| ThemeProvider simplified | ✅ | Mount-only `initTheme()` wrapper |
| Header / AuthLayout no toggle | ✅ | No ThemeToggle import/usage |
| Option B route (no 404) | ✅ | `appearance/page.tsx` still mounts gutted `AppearanceTab` |
| Tests | ✅ | `theme-store-presets` + `settings-ui-layout-static` + `observe-settings-ia-gaps-0061` → 20/20 pass this review |
| CHANGELOG | ⚠️ deferred | Allowed by builder protocol; owner/reviewer backlog |

## Production Wiring Proof

```
ThemeProvider (layout) → useThemeStore.initTheme()
  → html.dark + --color-primary/#00FFCC + --color-primary-hover

useTheme() dark-only shim → DefaultToolCard { isDark: true }

Appearance route /dashboard/settings/appearance
  → AppearanceTab functional prefs only
  → no COLOR_THEMES / themeAccent / whitelabeling / ThemeToggle

ThemeToggle → .archive/theme-0053/ (+ SNAPSHOT.md)
```

## Anti-Phantom Checks

| Claim | Verified independently? |
| --- | --- |
| Theme toggle / presets / branding inputs gone from AppearanceTab | Yes — full file read; only functional sections remain |
| `COLOR_THEMES` / mutators absent from `src/` | Yes — ripgrep |
| ThemeToggle not in `src/` | Yes — file absent + no imports |
| typecheck clean | Yes — re-run |
| Unit contract tests green | Yes — re-run 20/20 |
| Full production build | No — not re-run this review |

## Residual Risks / Unrun Checks

- Full `npm run build` not re-verified for this task.
- Docs SSoT (`design.md`, `UI.md`) still describe pre-0052/0053 Appearance customization.
- Branding API + Sidebar consumption remain (guardrail-aligned residual).
- `next-themes` still a dependency with one onboarding consumer.
- Task markdown checkboxes / evidence still partially reflect pre-0061 tab labeling.

## Lane Action

- **Moved**: no (score 93 ≥ 90 → remain `docs/tasks/03-review/0053-omniroute-strip-appearance-customization.md`)
- **Patched**: no production patches this review (no blocking findings)
- **Report path**: `docs/reports/reviews/2026-07-14-task-0053-strip-appearance-review.md`

## Verdict

**PASS WITH NOTES** — Task 0053 production contract is met: Appearance customization UI is stripped, theme store is dark-only coreCyan without mutators/presets, ThemeToggle is archived and unreferenced, and contract tests + typecheck pass. Residual issues are documentation drift and intentional non-UI branding plumbing, not incomplete removal of the Appearance customization surface.
