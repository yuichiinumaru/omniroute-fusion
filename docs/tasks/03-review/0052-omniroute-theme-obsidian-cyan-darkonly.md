# Task 0052: Theme Migration — Obsidian + Cyan + Dark-Only (VR Compliance)

> **Status**: `[ ]` Open
> **Priority**: 🔴 P0
> **Type**: `refactor` (visual identity)
> **Action type**: HARDEN + REMOVE
> **Origin**: User request — align with `visual-reference/` Prism prototype
> **Source**: `docs/reports/2026-07-12-omniroute-ux-design-investigation.md`, `.agents/user/chatgpt/ccdesign.md`
> **Investigation files**: `docs/screenshots/SIDEBAR-GAP-ANALYSIS.md`, 3 subagent reports (sidebar inventory, hub navigation, VR audit)
> **Depends on**: none
> **Blocks**: Task 0053 (strip appearance customization — both touch `themeStore.ts`)

---

## Objective

Transform the OmniRoute dashboard look & feel to match the visual-reference Prism prototype: **obsidian black background, cyan accent (`#00FFCC`), dark mode only**, with VR-compatible fonts. Remove all vestiges of the old coral/indigo brand identity, light theme support, grid wallpaper, and sidebar icon color accents.

This is a **hardened** theme change — the app becomes dark-only permanently. There is no fallback, no toggle, no customization.

---

## Background Context

### Investigation Evidence (subagent reports, 2026-07-12)

**Current state** (`src/app/globals.css`):
```
Dark bg:      #0b0e14 (navy)
Dark surface: #161b22 (blue-gray)
Primary:      #e54d5e (coral)
Accent:       #6366f1 (indigo)
```

**Target (visual-reference `tokens.ts`)**:
```
Background:   #030506 (obsidian)
Panel:        #080c0e (near-black)
Primary:      #00FFCC (coreCyan) — single accent
PanelBorder:  #121d22 (green-grey subtle)
```

**Hardcoded coral `#e54d5e` references: only 8 lines** — all in `globals.css` (6) and `themeStore.ts` (1) + test (1). **Zero components** have hardcoded coral — they use `bg-primary`, `text-primary`, `var(--color-primary)` which auto-update with CSS variables.

**~1162 auto-updating references** (Tailwind `bg-primary`, `text-primary`, `border-primary`, `ring-primary`, `from-primary`, etc.) — these will automatically follow the new cyan accent after `--color-primary` changes.

**Current fonts** (layout.tsx + globals.css):
- Body: `--font-sans` = system stack (`-apple-system, BlinkMacSystemFont, "SF Pro Text", ...`)
- Mono: `--font-mono` = `ui-monospace, "JetBrains Mono", "Fira Code", "SF Mono"`
- Loading: Inter via `next/font/google`

**Target fonts** (visual-reference index.css):
- Body: Rajdhani (tactical, highly readable)
- Mono: JetBrains Mono (already in stack)
- No Orbitron (user: "por mim nao precisa")

**Color accent system:**
- Current: dual-accent (coral primary + indigo secondary) — confusing color usage
- Target: monochrome cyan primary — colors only where they mean status
- 16 VR status states vs 12 current (but user said don't touch charts)

### What is missing

1. Obsidian background not implemented — `#030506` vs current `#0b0e14`
2. Cyan primary not implemented — `#00FFCC` vs current coral `#e54d5e`
3. Light theme values exist in CSS — waste, no user uses light mode
4. Grid wallpaper (`body::before`) adds rendering complexity, user explicitly wants removed
5. Sidebar icon color accents (`SIDEBAR_ICON_ACCENTS` map) — colorful icons, user explicitly wants removed
6. Coral-branded shadow glow (`--shadow-warm`, `border-glow` animation) — needs cyan update or removal
7. Fumadocs CSS vars still reference coral — need to update to cyan
8. Font body is system stack, not Rajdhani
9. Current `--color-accent` (indigo) needs cleanup — VR is monochrome cyan

### Files to touch

| File | Action | Purpose |
|------|--------|---------|
| `src/app/globals.css` | MODIFY | Change all `--color-*` tokens to VR specs; remove light theme `.dark` → new default; remove `::before` grid wallpaper; remove `bg-hero-gradient`; update `::selection`, `border-glow`, fumadocs vars, shadows |
| `src/store/themeStore.ts` | MODIFY | Change `DEFAULT_COLOR_THEME` to `coreCyan`; remove coral preset; remove light/dark toggle (no-op) |
| `src/app/layout.tsx` | MODIFY | Import Rajdhani (or alternative readable sans); apply as body font; remove Inter import |
| `src/shared/constants/sidebarVisibility.ts` | MODIFY | Remove `SIDEBAR_ICON_ACCENTS` map; remove `getSidebarIconAccent`; remove `getDeterministicIconAccent` |
| `src/shared/components/Sidebar.tsx` | MODIFY | Stop reading icon accents — use `currentColor` only |
| `src/shared/constants/statusVocabulary.ts` | MODIFY | Change `info`/`active` tone from blue `#3b82f6` to cyan `#00FFCC` |
| `tests/unit/theme-store-presets.test.ts` | MODIFY | Update `COLOR_THEMES.coral` test to reference coreCyan |
| `docs/reports/2026-07-12-omniroute-ux-design-investigation.md` | ARCHIVE | Work complete — mark theme section as done |
| `.changelog/` | APPEND | Record theme migration |

---

## Subtasks

- [ ] 1. Read all files listed in the "Where" table above before making changes
- [ ] 2. Update `globals.css`:
  - [ ] 2a. Change `:root` (now = light) to be dark-only single source
  - [ ] 2b. `--color-bg: #030506` (obsidian)
  - [ ] 2c. `--color-surface: #080c0e` (panel)
  - [ ] 2d. `--color-card: #080c0e`
  - [ ] 2e. `--color-sidebar: #080c0e`
  - [ ] 2f. `--color-border: #121d22` (VR green-grey)
  - [ ] 2g. `--color-primary: #00FFCC` (coreCyan)
  - [ ] 2h. `--color-primary-hover` (darker cyan, ~`#00CCA3`)
  - [ ] 2i. Update `--color-accent*` — change to cyan derivative or remove
  - [ ] 2j. Update `--color-info` from blue `#3b82f6` to cyan `#00FFCC` (or bright cyan)
  - [ ] 2k. Remove all light-theme `--color-*` tokens
  - [ ] 2l. Remove `.dark` block entirely (dark is now the only state)
  - [ ] 2m. Remove `::before` grid wallpaper (body::before)
  - [ ] 2n. Update `--shadow-warm` from coral to cyan
  - [ ] 2o. Update `--grad-brand` gradient to cyan → cyan-light
  - [ ] 2p. Update `::selection` to cyan tint
  - [ ] 2q. Update `border-glow` animation keyframes from coral to cyan
  - [ ] 2r. Update `bg-hero-gradient` to dark-only
  - [ ] 2s. Update all `--color-fd-*` fumadocs tokens from coral to cyan
  - [ ] 2t. Update `--table-*` tokens for new dark scheme
  - [ ] 2u. Update static color references (`--color-bg-light`, `--color-surface-dark`, etc.)
  - [ ] 2v. Remove `@custom-variant dark` (no longer needed, no light mode)
  - [ ] 2w. Remove `color-scheme: light` from `:root`
- [ ] 3. Update `themeStore.ts`:
  - [ ] 3a. Change `DEFAULT_COLOR_THEME` from `"coral"` to `"coreCyan"`
  - [ ] 3b. Update `COLOR_THEMES` — remove coral, keep coreCyan as primary
  - [ ] 3c. Simplify `applyTheme()` — remove light/dark/system toggle (always dark)
  - [ ] 3d. Simplify `initTheme()` — no need to read stored theme
  - [ ] 3e. Keep only `applyColorTheme` for potential future use (but no UI toggle)
- [ ] 4. Update `layout.tsx`:
  - [ ] 4a. Replace `Inter` Google Font import with Rajdhani (or alternative readable sans)
  - [ ] 4b. Apply Rajdhani as `--font-sans` via CSS variable or Tailwind class
  - [ ] 4c. Update `next/font/google` import
- [ ] 5. Remove sidebar icon color accents:
  - [ ] 5a. Remove `SIDEBAR_ICON_ACCENTS` typed map from `sidebarVisibility.ts`
  - [ ] 5b. Remove `SIDEBAR_SUBITEM_ICON_ACCENTS`
  - [ ] 5c. Remove `getSidebarIconAccent()` function
  - [ ] 5d. Remove `getDeterministicIconAccent()` helper
  - [ ] 5e. Update `Sidebar.tsx` to use `currentColor` only for icons
- [ ] 6. Update `statusVocabulary.ts`:
  - [ ] 6a. Change `active`/`info` state color from blue to cyan
  - [ ] 6b. Update corresponding Badge variant if needed
- [ ] 7. Update test file `theme-store-presets.test.ts` to reference coreCyan instead of coral
- [ ] 8. Run typecheck + build to confirm no breakage
- [ ] 9. Run relevant tests: `node --import tsx/esm --test tests/unit/theme-store-presets.test.ts`
- [ ] 10. Verify visual: open app, screenshot Home + Settings + Analytics, compare against VR mock
- [ ] 11. Update `.changelog/`

---

## Anti-Hallucination Guardrails

1. **No partial removal of `.dark`** — either the `.dark` block is fully removed and its values promoted to `:root`, or not. Half-migration = broken light mode for anyone who doesn't exist.
2. **Rajdhani font family must be actually loaded** — `next/font/google` import is mandatory; don't just change `--font-sans` to a string value that doesn't resolve.
3. **Verify cyan contrast** — `#00FFCC` on `#030506` has ~5.5:1 contrast ratio, fine. But `#00FFCC` on `#080c0e` might be lower. Test text-on-surface contrast.
4. **Fumadocs `neutral.css`/`preset.css`** — these are third-party CSS that may override vars. After changes, verify docs pages render correctly.
5. **Do NOT touch Analytics chart colors** — user explicitly said charts should remain colorful (pie charts, donut, bars). Only change global tokens.

---

## Validation / Exit Conditions

- [ ] `npm run typecheck:core` passes with 0 errors
- [ ] `npm run build` succeeds (or `npm run dev` starts without errors)
- [ ] `node --import tsx/esm --test tests/unit/theme-store-presets.test.ts` passes
- [ ] `rg "#e54d5e" src/` returns 0 (no coral hex left)
- [ ] `rg "#c93d4e" src/` returns 0 (no coral hover left)
- [ ] `rg "SIDEBAR_ICON_ACCENTS" src/` returns 0 (removed)
- [ ] `rg "getSidebarIconAccent" src/` returns 0 (removed)
- [ ] `rg "body::before" src/` returns 0 (grid wallpaper removed)
- [ ] `rg "grid-line" src/` returns 0 (grid tokens removed)
- [ ] `rg "\.dark\s+\{" src/app/globals.css` returns 0 (no dark block)
- [ ] `rg "color-scheme" src/app/globals.css` returns 0 (no light scheme reference)
- [ ] App loads in dark mode with obsidian background (visual check)
- [ ] Settings page loads without appearance customization (if Task 0053 not done, appearance page should still work but with new colors)

---

## Where

| File | Action | Purpose |
|------|--------|---------|
| `src/app/globals.css` | MODIFY | See Subtask 2 — all token changes + removals |
| `src/store/themeStore.ts` | MODIFY | Default coreCyan, remove light/dark toggle, simplify |
| `src/app/layout.tsx` | MODIFY | Replace Inter with Rajdhani font import |
| `src/shared/constants/sidebarVisibility.ts` | MODIFY | Remove icon accent maps and functions |
| `src/shared/components/Sidebar.tsx` | MODIFY | Remove icon accent references |
| `src/shared/constants/statusVocabulary.ts` | MODIFY | Update info/active to cyan |
| `tests/unit/theme-store-presets.test.ts` | MODIFY | Update coral → coreCyan |
| `.changelog/` | APPEND | Record theme migration changes |

## Completion Evidence

(Filled by executor when closing the task)

- globals.css diff:
- themeStore.ts diff:
- layout.tsx diff:
- sidebarVisibility.ts diff:
- Status vocabulary diff:
- `rg` exit condition outputs:
- Typecheck result:
- Test result:
- Screenshot of Home page after migration:
- CHANGELOG ref:
