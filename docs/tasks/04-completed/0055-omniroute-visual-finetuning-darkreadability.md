# Task 0055: Visual Fine-Tuning — Dark-Only Readability Fixes

> **Status**: `[x]` Completed (return-review 100/100 — promoted 2026-07-18 after 22000 redeploy)
> **Priority**: 🟡 P1
> **Type**: `fix` (visual/UX)
> **Action type**: UX_VIS
> **Origin**: User visual review of production build on localhost:22000 (2026-07-13)
> **Depends on**: Task 0052 (theme migration), Task 0054 (settings tabs)
> **Blocks**: none

---

## Reopen Addendum — Phantom Completion Fix Loop (2026-07-15)

User runtime review confirmed search/input surfaces are fixed, but selected chips/buttons still use white text on bright cyan/green surfaces, especially Providers filters/sort/topbar and Provider Onboarding Wizard affordances. The original grep was too narrow (`emerald-4|teal-4|green-4`) and missed `bg-primary text-white` under the cyan theme.

**Reference visual contract**: `src/shared/components/RoutingHubSubnav.tsx`

Selected/active affordances should prefer:

```tsx
"border border-primary/20 bg-primary/10 text-primary"
```

or a darker green/cyan fill with light cyan/green text. Do **not** use `bg-primary text-white` for selected pills/buttons in dark-only UI.

### Additional subtasks

- [x] 7. Audit selected-state classes for `bg-primary text-white`, `bg-emerald-* text-white`, `bg-teal-* text-white`, and `bg-green-* text-white` in high-traffic dashboard UI.
- [x] 8. Fix Providers selected chips: category filters, Configured filter, sort chips, media filters, and ProvidersTopBar active item to use the Routing-style active state.
- [x] 9. Fix Provider Onboarding Wizard/related green button states so text contrast is readable and structurally aligned with sidebar/Routing selected state.
- [x] 10. Preserve legitimate white icon dots/indicators where text contrast is not involved.
- [x] 11. Add/update tests/static checks that fail on `bg-primary text-white` active pills in Providers controls/topbar.
- [x] 12. Do not modify Dashboard, Analytics, or Operations in this fix loop.

### Additional exit conditions

- [x] No Providers filter/sort/topbar selected state uses `bg-primary text-white`.
- [x] No visible button/chip uses white text on light cyan/green background in the checked surfaces.

---

## Objective

Fix dark-mode readability issues surfaced after the VR theme migration went live. The obsidian + cyan palette exposes contrast problems in specific UI surfaces: teal/green buttons with white text on light teal backgrounds, feature flags with dark text on light badges, and search/text input fields with white backgrounds inside an otherwise dark UI.

---

## Issues to Fix

### Issue 1 — Teal/green buttons with white text on light teal

**Problem**: Some buttons use teal/green as background (`bg-emerald-500`, `bg-teal-500`, etc.) with white text. When the teal is light (e.g., `emerald-400`, `teal-300`), white text has poor contrast.

**Fix approach**: Either:
- **Option A**: Darken the teal/green button backgrounds (use `emerald-600`/`teal-600` instead of lighter variants)
- **Option B**: Keep current teal shade but change text to dark (`text-gray-900` or `text-gray-800`)

User preference: whichever is easier. Darkening the button is usually simpler because it doesn't require per-button text class overrides.

**Affected areas** (investigation needed to find exact components):
- Any `<Button>` or `<button>` using `bg-emerald-*` or `bg-teal-*` with `text-white`
- Toggle switches using teal/green as active state
- Selector chips like "7d / 30d" if they use green active state

### Issue 2 — Feature flags with light badges and dark text

**Problem**: In Settings > Feature Flags (`/dashboard/settings/feature-flags`), the flag badges/indicators use light/colorful backgrounds with dark text. User preference is the opposite: dark text on light badge is wrong for a dark-only theme. Should be **light text on dark badge** (or invert: dark badge with light text).

**Affected file**: `src/app/(dashboard)/dashboard/settings/feature-flags/page.tsx` and any shared badge component used there.

### Issue 3 — Search and text input fields with white backgrounds

**Problem**: Some input/search fields have `bg-white` or light backgrounds, which is jarring in a dark-only theme. User reports seeing this in:
- Providers page: "Search providers" / "Search by model" inputs
- Translator page: input fields
- Possibly other pages

**Affected areas** (investigation needed):
- `src/app/(dashboard)/dashboard/providers/` — search inputs
- `src/app/(dashboard)/dashboard/translator/` — text inputs
- Any other `<input>` or `<textarea>` with explicit `bg-white` or `bg-gray-100` that should be dark-themed

---

## Subtasks

- [x] 1. Read all relevant component files before modifying
- [x] 2. Issue 1: Find all teal/green buttons with white text on light teal
  - [x] 2a. Grep for `bg-emerald-4|bg-teal-4|bg-green-4` combined with `text-white` in src/
  - [x] 2b. Decide: darken button OR change text to dark
  - [x] 2c. Apply fix
- [x] 3. Issue 2: Fix feature flags badge contrast
  - [x] 3a. Read `src/app/(dashboard)/dashboard/settings/feature-flags/page.tsx`
  - [x] 3b. Identify badge/flag components using light bg + dark text
  - [x] 3c. Invert to dark bg + light text (or use theme-aware classes)
- [x] 4. Issue 3: Find all white-background input/search fields
  - [x] 4a. Grep for `bg-white|bg-gray-100|bg-gray-50` in dashboard page files
  - [x] 4b. For each, decide: make it `bg-surface`/`bg-bg`/`bg-card` with `text-text-main`
  - [x] 4c. Apply fix
- [x] 5. Run typecheck + build to confirm no breakage
- [x] 6. Update `.changelog/` (drafted in this task file; parent orchestrator owns append)

---

## Anti-Hallucination Guardrails

1. **Do NOT change Analytics chart colors** — user explicitly exempted them from the monochrome cyan rule
2. **Do NOT change the overall theme** — this is a contrast/readability fix only, not a color scheme change
3. **Prefer existing CSS variables** (`--color-surface`, `--color-bg`, `--color-text-main`) over hardcoded hex values
4. **Read each component before editing** — some buttons may have intentional light teal for specific states

---

## Validation / Exit Conditions

- [x] `npm run typecheck:core` passes with 0 errors
- [x] No `text-white` on `bg-emerald-4|bg-teal-4|bg-green-4` combinations in button contexts (or text is changed to dark)
- [x] Feature flags badges use dark bg + light text (or theme-aware classes)
- [x] No solid `bg-white` (without dark-only default) on shared Input/Textarea and key dashboard form controls
- [x] Root cause of white inputs fixed: `.dark` class restored on `<html>` so Tailwind `@custom-variant dark` works

---

## Where

| File | Action | Purpose |
|------|--------|---------|
| `src/app/(dashboard)/dashboard/settings/feature-flags/page.tsx` | READ | Thin wrapper → FeatureFlagsGrid |
| `src/app/(dashboard)/dashboard/settings/components/FeatureFlagCard.tsx` | MODIFY | Dark-only badge styles (category/source/restart) |
| `src/app/(dashboard)/dashboard/tools/agent-bridge/components/SetupWizard.tsx` | MODIFY | Darken emerald Done button |
| `src/app/(dashboard)/dashboard/plugins/page.tsx` | MODIFY | Dark marketplace input + badges |
| `src/app/(dashboard)/dashboard/translator/components/SimpleControls.tsx` | MODIFY | Dark textarea background |
| `src/app/(dashboard)/dashboard/providers/[id]/components/ModelCompatPopover.tsx` | MODIFY | Dark popover + inputs |
| `src/shared/components/Input.tsx` | MODIFY | Dark-only default input surface |
| `src/shared/components/Textarea.tsx` | MODIFY | Dark-only default textarea surface |
| `src/shared/components/Button.tsx` | MODIFY | Secondary variant no solid white |
| `src/shared/components/SegmentedControl.tsx` | MODIFY | Selected chip no solid white |
| `src/shared/components/ModelRoutingSection.tsx` | MODIFY | Form controls dark defaults |
| `src/shared/components/ThemeProvider.tsx` | MODIFY | Doc that initTheme re-asserts `.dark` |
| `src/store/themeStore.ts` | MODIFY | `classList.add("dark")` in initTheme |
| `src/app/layout.tsx` | MODIFY | SSR `className="dark"` on `<html>` |
| Multiple dashboard form pages (combos/fusions/endpoint/settings/api-manager) | MODIFY | Replace `bg-white dark:bg-*` with dark-only defaults |
| `.changelog/` | DRAFT ONLY | See Changelog Draft below |

## Completion Evidence

### Path-to-100 / phantom-completion closeout (2026-07-18 — gt-ts-engineer / parent `builders`)

Prior reopen evidence claimed chips fixed, but solid **white-on-cyan** CTAs remained on bright `#00FFCC` (WCAG fail). This wave:

1. **Token SSoT** — `globals.css`: `--color-primary-foreground` / `--color-accent-foreground` = `#030506` (obsidian on cyan); wired into `@theme inline`.
2. **Shared Button** — primary/accent variants use `text-primary-foreground` / `text-accent-foreground` (no `text-white` on cyan fills).
3. **Providers onboarding CTA** — `ProviderOnboardingWizard` solid primary link → `text-primary-foreground`.
4. **SetupWizard** — Next/DNS CTAs → on-primary text; active step indicator → Routing-style `border-primary/20 bg-primary/10 text-primary`; Done stays `bg-emerald-700`.
5. **Providers error + ImportProgressModal** — solid primary CTAs → on-primary text.
6. **FeatureFlagCard** — enabled border/track dark-only (`border-green-500/30`, `bg-emerald-600`, track `bg-white/20`); toggle knob `bg-white` kept (indicator).
7. **Tests**
   - New: `tests/unit/dark-readability-0055.test.ts` (Input/Textarea, Button, `.dark` html, FeatureFlagCard, SetupWizard, no light green-4xx+white)
   - Extended: `provider-connections-ui-regression.test.ts` (onboarding no white-on-primary; Routing active pattern)
   - Extended: `theme-store-presets.test.ts` (primary-foreground tokens)

**Commands (green):**

```
node --import tsx/esm --test \
  tests/unit/dark-readability-0055.test.ts \
  tests/unit/provider-connections-ui-regression.test.ts \
  tests/unit/theme-store-presets.test.ts
→ PASS

# Related 0028 vitest still green (shared theme surface)
npx vitest run --config vitest.config.ts \
  tests/unit/ui/badge-status.test.tsx \
  tests/unit/ui/stat-card-accent.test.tsx
→ PASS (7)
```

**Did not touch** (reopen subtask 12): Dashboard home, Analytics, Operations hub.

### Reopen Addendum Completion Evidence (2026-07-16)

- Completed subtasks 7-12:
  - Audited high-traffic selected-state classes in the providers dashboard area.
  - Replaced all active states using `bg-primary text-white border-primary` in `ProviderSummaryCard.tsx` (all categories, configured filter, sort modes, media filter chips) and `ConnectionsListPanel.tsx` (status filter pills) to use Routing-style `border-primary/20 bg-primary/10 text-primary` to avoid text-contrast issues.
  - Updated Done button in `SetupWizard.tsx` to `bg-emerald-700 hover:bg-emerald-800 text-white` (darker fill) to establish dark readability.
  - Kept legitimate white indicator elements where text readability is not affected.
  - Added new static tests to `tests/unit/provider-connections-ui-regression.test.ts` to assert that no active pills use `bg-primary text-white` and peer provider pages correctly mount `ProvidersTopBar`.
- Verified all exit conditions:
  - No Providers filter/sort/topbar selected state uses `bg-primary text-white`.
  - Static unit tests pass successfully.

### Root cause (Issue 3)

After Task 0053 stripped theme customization, `themeStore.initTheme()` stopped adding `class="dark"` to `<html>`, and `layout.tsx` never set it either. Tailwind v4 is configured as:

```css
@custom-variant dark (&:where(.dark, .dark *));
```

So every `dark:bg-white/5` / `dark:bg-zinc-900` override was **dead**. Components fell back to solid `bg-white`, producing white search/text inputs across the dashboard (including providers search via shared `Input`).

### Files modified (exact changes)

1. **`src/app/layout.tsx`** — `<html className="dark">` for SSR-safe first paint
2. **`src/store/themeStore.ts`** — `document.documentElement.classList.add("dark")` in `initTheme()`
3. **`src/shared/components/ThemeProvider.tsx`** — comment update documenting dual SSR/client dark class
4. **`src/shared/components/Input.tsx`** — default `bg-white dark:bg-white/5` → `bg-white/5` (dark-only)
5. **`src/shared/components/Textarea.tsx`** — same dark-only default
6. **`src/shared/components/Button.tsx`** — secondary variant `bg-white/10` (no solid white)
7. **`src/shared/components/SegmentedControl.tsx`** — selected state `bg-white/10`
8. **`src/shared/components/ModelRoutingSection.tsx`** — form inputs/selects `bg-black/20`
9. **`src/app/(dashboard)/dashboard/tools/agent-bridge/components/SetupWizard.tsx`** — Done button `bg-emerald-600 hover:bg-emerald-500` (Option A)
10. **`src/app/(dashboard)/dashboard/settings/components/FeatureFlagCard.tsx`** — category/source badges always transparent tint + light text (`bg-*-500/15 text-*-300`); restart chip dark-only
11. **`src/app/(dashboard)/dashboard/plugins/page.tsx`** — marketplace URL input dark; hook/tag badges tinted; `text-text-muted` instead of `text-gray-*`
12. **`src/app/(dashboard)/dashboard/translator/components/SimpleControls.tsx`** — textarea `bg-white/5`
13. **`src/app/(dashboard)/dashboard/providers/[id]/components/ModelCompatPopover.tsx`** — panel/inputs dark zinc (no white fallback)
14. **`src/app/(dashboard)/dashboard/settings/components/OneproxyTab.tsx`** — protocol fallback badge dark tint
15. **`src/app/(dashboard)/dashboard/settings/components/RoutingTab.tsx`**, **ComboDefaultsTab.tsx**, **ModelAliasesUnified.tsx** — form/chip dark defaults
16. **`src/app/(dashboard)/dashboard/combos/page.tsx`**, **fusions/***, **endpoint/ApiEndpointsTab.tsx**, **api-manager/ApiManagerPageClient.tsx`** — bulk replace `bg-white dark:bg-*` form defaults with dark-only classes

### Typecheck result

```
npm run typecheck:core
> tsc --pretty false -p tsconfig.typecheck-core.json
(exit 0 — 0 errors)
```

### Grep / static verification

| Check | Result |
|-------|--------|
| `bg-emerald-4\|bg-teal-4\|bg-green-4` + `text-white` in src/ | 0 hits |
| SetupWizard Done button | `bg-emerald-600 hover:bg-emerald-500` |
| FeatureFlagCard category security badge | `bg-red-500/15` + `text-red-300` |
| Shared Input default | `bg-white/5 border border-white/10` |
| `<html className="dark">` | present in layout.tsx |
| `classList.add("dark")` | present in themeStore.initTheme |
| Analytics chart colors | untouched |

### Screenshot of affected pages

Not captured in this agent session (no browser automation). Root-cause fix (`class="dark"`) + shared Input default change addresses providers search and translator inputs systemically.

### CHANGELOG ref

See **Changelog Draft** below (not written to CHANGELOG.md / `.changelog/` per parent rules).

---

## Changelog Draft

```markdown
## [2026-07-18] - Dark-only readability path-to-100 (Task 0055)
### Fixed
- On-primary text tokens (`--color-primary-foreground` / `--color-accent-foreground` = obsidian) so solid cyan fills never use white text
- Shared `Button` primary/accent variants use on-primary text
- Provider Onboarding Wizard + SetupWizard primary CTAs; SetupWizard active step uses Routing-style tint
- FeatureFlagCard enabled border/track dark-only; toggle knob remains white (indicator)
### Tests
- `tests/unit/dark-readability-0055.test.ts` + extended provider-connections + theme-store guards
**Author**: builders (Task 0055, gt-ts-engineer)

## [2026-07-14] - Dark-only readability fixes (Task 0055)
### Fixed
- Restored Tailwind `dark` class on `<html>` (SSR + `initTheme`) so `dark:` variants activate after the dark-only theme migration
- Shared `Input` / `Textarea` / secondary `Button` / `SegmentedControl` no longer use solid `bg-white` as the base style
- Feature Flags category/source badges: light text on tinted dark badges
- Agent Bridge SetupWizard Done button darkened for white-text contrast
- Dashboard form controls use dark-only input surfaces
**Author**: builders (Task 0055)
```

---

## Review Ledger

### 2026-07-18 — independent return review (agentID=reviewers)

- **Score: 100/100 — ACCEPTED_100**
- **Report**: [`docs/reports/reviews/2026-07-18-task-0055-visual-finetuning-darkreadability-return-review.md`](../../reports/reviews/2026-07-18-task-0055-visual-finetuning-darkreadability-return-review.md)
- Fresh proof: dark-readability 9/9 + provider-connections + theme-store; typecheck:core exit 0; Button primary-foreground sabotage OK; 0 `bg-primary`+`text-white` hits in src/.
- Live public login paint on `:22000`: dark shell + dark password field (asset under `docs/reports/reviews/assets/`). Authenticated dashboard EXTERNAL (429 + stale image).
- Path-to-100: none required. **Lane**: stay `03-review`.


### Frontend quality — path-to-100 final (2026-07-18)

- **Report**: [`docs/reports/reviews/2026-07-18-task-0055-omniroute-visual-finetuning-darkreadability-frontend-review.md`](../../reports/reviews/2026-07-18-task-0055-omniroute-visual-finetuning-darkreadability-frontend-review.md)
- **Score**: **100/100** (pre path-to-100: 97; I2 applied)
- **Verdict**: `ACCEPTED_100`
- **Lane**: moved `02-doing/` → `03-review/`
- **Path-to-100 applied**:
  - I2: `ModelRoutingSection` mapping cards dark-only (`bg-white/[0.02]` / `bg-white/[0.01]`); pattern chip `text-amber-300`
  - Regression: `tests/unit/dark-readability-0055.test.ts` asserts no `bg-white/70` on that surface
  - Re-verify: 19/19 unit pass (dark-readability + provider-connections + theme-store)
- **I1**: optional `:22000` paint smoke left as non-blocking operator residual (EXTERNAL)
- **Superseded residual**: “many ad-hoc `bg-primary text-white` remain” — live 0 hits + full-tree unit guard
- **Reviewer**: `gt-frontend-quality-reviewer` (parent `builders`)

### Builder closeout note (2026-07-18)

- Phantom gap: solid primary CTAs still used `text-white` on bright coreCyan after chip fixes.
- Systemic fix: `primary-foreground` token + shared Button; scoped providers/onboarding/wizard/error.
- Residual claim of widespread `bg-primary text-white` **superseded** at re-review (0 hits).

## Remaining risks

1. ~~Residual ad-hoc `bg-primary text-white`~~ — **cleared** (tree-wide static guard + live 0 hits).
2. Residual dual `bg-black/5 dark:bg-white/5` pairs may remain outside surgically fixed surfaces (toggle knobs intentionally stay `bg-white`).
3. Optional live browser visual QA on **:22000 only** (not a score gate) — providers search, onboarding CTA, feature-flags, SetupWizard.
4. Analytics chart colors were not modified (guardrail honored).

## Lane promotion

- **Promoted to 04-completed**: 2026-07-18 — parent after return-review 100/100 + healthy 22000 redeploy (`omniroute:base` sha256:799b53a4c368).
