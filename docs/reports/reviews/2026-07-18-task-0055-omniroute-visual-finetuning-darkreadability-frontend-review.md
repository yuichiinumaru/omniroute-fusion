# Review Report: Task 0055 — Visual Fine-Tuning Dark Readability — Frontend Quality (2026-07-18)

## Review Lineage

- **Current task**: Task 0055 (`omniroute-visual-finetuning-darkreadability`); live path after promote: `docs/tasks/03-review/0055-omniroute-visual-finetuning-darkreadability.md`
- **Previous reports read**: **none found** under `docs/reports/` / `docs/reports/reviews/` for task 0055 prior to this review
- **Related reports considered**:
  - `docs/reports/reviews/2026-07-18-task-0057-providers-ia-cleanup-frontend-review.md` — Providers IA / HUB_SUBNAV active-state contract (shared visual SSOT)
  - `docs/reports/reviews/2026-07-14-task-0052-theme-obsidian-cyan-review.md` — theme migration lineage (primary `#00FFCC`)
  - `docs/reports/reviews/2026-07-18-task-0052-theme-obsidian-cyan-final-review.md` — theme closeout
- **Review mode**: `initial` → `path-to-100` → `final-gate` (same session; parent-ordered path-to-100 apply)
- **Reviewer**: `gt-frontend-quality-reviewer` (parent agentID=`builders`)
- **Skills**: `code-quality-harness` + `frontend-quality-harness` + `tsjs-harness`
- **Constraints honored**: no git; no touch of production `:21000`

## Score And Verdict

- **Score (pre path-to-100)**: `97/100` — Elite (I2 ModelRoutingSection light-first residual)
- **Score (final)**: `100/100` — Perfect for task scope
- **Verdict**: `ACCEPTED_100`
- **Lane recommendation**: `accept-completed` → **moved** to `docs/tasks/03-review/`
- **I1 browser smoke**: classified `EXTERNAL_BLOCKER` / non-blocking — contract exits proven by static/sabotage-capable tests + WCAG math; optional `:22000` paint check left as operator residual only

### Axiom / harness compliance

| Gate / axiom | Status | Notes |
|--------------|--------|-------|
| Type Purity | ✅ | No new `any` / unsafe casts in task surfaces; pure class/token edits |
| Boundary Integrity | ✅ | Theme CSS vars only; no API/auth/DB mutation |
| Async Determinism | ✅ | No new async paths |
| Frontend contrast (task-owned) | ✅ | Solid cyan CTAs use on-primary `#030506` (AAA); light green-4xx+white eliminated |
| Frontend a11y (scoped) | ✅ | FeatureFlagCard switch roles; SetupWizard/onboarding CTA readable; focus rings preserved on shared Button |
| Contract compliance | ✅ | Issues 1–3 + reopen 7–12 exit conditions re-verified from **live files** |
| Verification gate | ✅ | Fresh unit tests (19/19) + typecheck:core this session |
| Sabotage-capable tests | ✅ | Full `src/app`+`src/shared` co-location greps + ModelRoutingSection dark-only guard |
| Analytics chart guardrail | ✅ | Chart color paths not altered for this task’s readability sweep |

### Rubric snapshot

| Dimension | Score | Evidence |
|-----------|------:|----------|
| Issue 1 — light teal/green + white text | 100 | 0 production hits; Done `bg-emerald-700` (AA) |
| Issue 2 — Feature Flags badges | 100 | tinted `/15`–`/20` + `text-*-300` |
| Issue 3 — white inputs root cause | 100 | `<html className="dark">` + `initTheme` + Input/Textarea `bg-white/5` |
| Reopen — Providers chips / onboarding | 100 | Routing-style tint; onboarding solid CTA uses `text-primary-foreground` |
| Token SSoT (on-primary) | 100 | globals + themeStore `#030506`; Button primary/accent wired |
| Static regression guards | 100 | `dark-readability-0055` + provider-connections + theme-store (**19/19**) |
| ModelRoutingSection dark-only (I2) | 100 | `bg-white/[0.02]` / `bg-white/[0.01]`; no `bg-white/70`; unit guard |
| Live browser visual QA (I1) | n/a | EXTERNAL non-blocking; not required for ACCEPTED_100 |

## Delta Summary

### Resolved (builder claims re-verified live)

| ID | Class | Summary | Proof |
|----|-------|---------|-------|
| R1 | RESOLVED | White-on-cyan solid CTAs (contrast fail) | WCAG: white on `#00FFCC` ≈ **1.30:1 FAIL**; obsidian `#030506` on cyan ≈ **15.73:1 AAA** |
| R2 | RESOLVED | Shared Button primary/accent text | `Button.tsx` uses `text-primary-foreground` / `text-accent-foreground` (no `text-white` on primary/accent variants) |
| R3 | RESOLVED | Providers selected chips / topbar | `ProviderSummaryCard` / `ConnectionsListPanel` use `border-primary/20 bg-primary/10 text-primary`; regression test forbids `bg-primary text-white` |
| R4 | RESOLVED | Onboarding + SetupWizard primary CTAs | `text-primary-foreground`; SetupWizard active step Routing-tint; Done `bg-emerald-700 text-white` |
| R5 | RESOLVED | FeatureFlagCard badges + enabled chrome | `bg-*-500/15` + light text; track `bg-emerald-600`; knob `bg-white` (indicator OK) |
| R6 | RESOLVED | White input flash (`.dark` missing) | `layout.tsx` SSR `className="dark"`; `themeStore.initTheme` `classList.add("dark")` + re-pins foreground tokens |
| R7 | RESOLVED | Input / Textarea / secondary Button / SegmentedControl solid white bases | Dark-only translucent defaults |
| R8 | SUPERSEDED | Builder residual “many pages still `bg-primary text-white`” | **Live scan 0 hits** in `src/`; full-tree unit guard in `dark-readability-0055.test.ts` |

### Persistent / accepted residual

| ID | Class | Severity | Summary |
|----|-------|----------|---------|
| I1 | EXTERNAL / EVIDENCE_GAP | Non-blocking | No live browser paint check on `:22000` — optional operator residual only; does **not** block ACCEPTED_100 |
| I2 | RESOLVED (path-to-100) | — | ModelRoutingSection cards → dark-only `bg-white/[0.02]` / `bg-white/[0.01]`; pattern chip `text-amber-300`; regression test added |
| A1 | ACCEPTED | — | Solid `bg-white` toggle knobs remain (intentional indicators; reopen subtask 10) |
| A2 | ACCEPTED | — | Dual `bg-black/5 dark:bg-white/5` leftovers across UI — fine with always-on `.dark`; not exit-condition failures |
| A3 | ACCEPTED | — | Changelog draft only (parent orchestrator publishes) |

### Regressions

- none found vs claimed closeout

### External blockers

- I1 optional browser smoke only. Production `:21000` deliberately not used.

## Findings (detail)

### Critical / Serious

- none

### Debt

- none that block task exit conditions

### Improvements — path-to-100 applied

#### [I2] ModelRoutingSection light-first card surface — **RESOLVED**

**Before**:
```tsx
? "border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/[0.02]"
: "border-black/5 dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.01] opacity-50"
```

**After** (dark-only, Task 0055 path-to-100):
```tsx
? "border-white/10 bg-white/[0.02]"
: "border-white/5 bg-white/[0.01] opacity-50"
```

Also fixed pattern chip `text-amber-700 dark:text-amber-300` → `text-amber-300`. Guard added in `tests/unit/dark-readability-0055.test.ts` (asserts no `bg-white/70`, requires `bg-white/[0.02]`).

#### [I1] No live visual smoke on :22000 — **EXTERNAL / non-blocking**

Static class/token proof + sabotage-capable full-tree greps + WCAG math satisfy contract exits. Optional operator paint check on **`:22000` only** remains a residual note, not a score gate.

### Positive systemic findings (do not re-open)

1. **Token SSoT** — `globals.css` + `themeStore` pin `--color-primary-foreground` / `--color-accent-foreground` to `#030506`; `@theme inline` exposes utilities.
2. **Full-tree regression** — unit test walks `src/app` + `src/shared` and fails on any same-segment `bg-primary` + `text-white` co-location (including `focus:bg-primary focus:text-white` class of bugs).
3. **WCAG math** (computed this session):

| Pair | Ratio | AA |
|------|------:|----|
| white on `#00FFCC` | 1.30 | FAIL |
| `#030506` on `#00FFCC` | 15.73 | AAA |
| `#030506` on `#66ffdd` (accent-light / grad end) | 16.45 | AAA |
| white on emerald-700 | 5.48 | AA |
| white on emerald-500/400 | 2.54 / 1.92 | FAIL (no longer used for CTA text fills in scope) |

4. **Providers active chips** align with `HUB_SUBNAV_ACTIVE_CLASS` = `border border-primary/20 bg-primary/10 text-primary` (`src/shared/constants/hubSubnavStyles.ts`).
5. **Shared Button** primary uses brand gradient + on-primary text — correct for bright cyan brand.

## Runtime wiring

Not a backend runtime task. Theme wiring proven:

```
layout.tsx <html className="dark">
  → ThemeProvider → themeStore.initTheme()
    → documentElement.classList.add("dark")
    → setProperty(--color-primary-foreground, #030506)
    → setProperty(--color-accent-foreground, #030506)
Tailwind @custom-variant dark (&:where(.dark, .dark *)) → dark: utilities live
```

Production call sites for solid primary CTAs now resolve `text-primary-foreground` (sample: OnboardingWizard, SetupWizard, ImportProgressModal, playground builders, webhooks, analytics CTAs — all use on-primary, not white).

## Commands run (this review session)

```bash
# Pre path-to-100
node --import tsx/esm --test \
  tests/unit/dark-readability-0055.test.ts \
  tests/unit/provider-connections-ui-regression.test.ts \
  tests/unit/theme-store-presets.test.ts
# → 18 pass

npm run typecheck:core  # exit 0

# Path-to-100 re-verify (after ModelRoutingSection + test guard)
node --import tsx/esm --test \
  tests/unit/dark-readability-0055.test.ts \
  tests/unit/provider-connections-ui-regression.test.ts \
  tests/unit/theme-store-presets.test.ts
# → 19 pass, 0 fail

rg 'bg-white/70|bg-white dark:|text-amber-700' src/shared/components/ModelRoutingSection.tsx
# → clean
```

## Path to 100 — applied

| # | Action | Result |
|---|--------|--------|
| 1 | I2: ModelRoutingSection dark-only card + amber chip | **DONE** |
| 2 | Regression test for `bg-white/70` ban on that surface | **DONE** (19th unit) |
| 3 | I1 browser smoke | **EXTERNAL non-blocking** — not required for 100 |
| 4 | Final score + move to `03-review/` | **DONE** |

Builder residual risk #1 (“many ad-hoc `bg-primary text-white`”) remains **SUPERSEDED** (live 0 hits + full-tree guard).

## Task Ledger Patch Suggestion

Applied in-task (see task Review Ledger after promote).

## Review learning candidates

1. **White-on-cyan is a systemic WCAG failure** on VR primary `#00FFCC` — never pair solid `bg-primary` with `text-white`; encode via `--color-primary-foreground` + tree-wide static test (institutionalized in 0055 tests).
2. **Dark-only apps must force `.dark` on `<html>`** when Tailwind uses `@custom-variant dark (&:where(.dark, .dark *))` — dual `bg-white dark:…` bases become white flashes when class is missing (root cause of Issue 3).
3. Narrow greps (`emerald-4|teal-4`) miss brand-token failures (`bg-primary text-white`) — prefer token + co-location scans.
4. Light-first dual pairs (`bg-white/70 dark:bg-white/[0.02]`) reintroduce Issue-3 class failures if `.dark` is dropped — prefer dark-only translucent defaults even when SSR forces `.dark`.
