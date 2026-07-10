# Review Report: Task 0028 — Frontend IA Theme Micro VR Adoption — 2026-07-10

## Review Lineage

- **Current task**: Task 0028 (`frontend-ia-theme-micro-adoption`); live path `docs/tasks/03-review/0028-frontend-ia-theme-micro-adoption.md`
- **Previous reports read**: none found under `docs/reports/reviews/` or `docs/reports/` for Task 0028
- **Related reports considered**:
  - `docs/reports/builders/2026-07-10-wave2-closeout.md` — parent wave gate (aggregated green)
- **Review mode**: `initial`
- **Reviewer profile**: `reviewers` (gt-frontend-quality-reviewer + tsjs-harness; parent agentID=reviewers)

## Score And Verdict

- **Score**: `93/100`
- **Verdict**: `HELD_IN_REVIEW_PATH_TO_100`
- **Lane recommendation**: `hold-in-review` (S ≥ 90 — do **not** return to `02-doing/`; do **not** promote to `04-completed/`)

### Rubric snapshot

| Dimension | Score | Notes |
| --- | --- | --- |
| Contract / exit conditions | 97 | Status map, StatCard accent, optional cyan, health glow, no Prism |
| Brand preservation | 100 | `DEFAULT_COLOR_THEME = coral`; `coreCyan` optional only |
| Glow budget | 94 | Soft glow only TokenHealthBadge / DegradationBadge / CB badges; no global layout glow |
| Token dual light+dark | 90 | `--color-info` + `--status-glow-*` in `:root` and `.dark`; glow CSS vars unused by consumers |
| Production adoption | 95 | Badge/status, StatCard KPI accents, health matrix CB, Appearance swatch |
| Tests | 94 | vocab + presets + StatCard accent; no Badge `status`/`glow` component test |
| Scope discipline | 98 | No Orbitron/scanlines/Prism tree; VR comments only |

## Delta Summary

### Resolved Since Previous Review
- `RESOLVED`: n/a (initial review)

### Persistent Findings
- none

### Regressions
- none

### New Findings
- `NEW` F1 (Low): `--status-glow-*` CSS variables are defined (light+dark) but have **zero** production consumers — glow uses Tailwind `color-mix` shadows on `--color-*` instead
- `NEW` F2 (Info): Badge `warning` variant uses `yellow-*` while vocabulary surfaces use `amber-*` (minor visual dual-track)
- `NEW` F3 (Low): No unit test for `Badge` `status`/`glow` prop resolution (helpers covered; component surface not)

### Evidence Gaps / External Blockers
- `EVIDENCE_GAP`: Light/dark visual smoke is code-level checklist only (no screenshots) — accepted by task exit condition
- `EXTERNAL_BLOCKER`: none

## Findings

| ID | Class | Severity | Status | Summary | First seen | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| F1 | NEW | Low | Open | Dead `--status-glow-*` tokens; comment claims consumers use `statusGlowClass()` but that emits color-mix utilities not `var(--status-glow-*)` | this report | `globals.css:51-56,142-145`; `rg 'var\(--status-glow'` → 0 hits |
| F2 | NEW | Info | Open | yellow vs amber warning track between Badge variants and vocab surface classes | this report | `Badge.tsx:13` vs `statusVocabulary.ts:71-74` |
| F3 | NEW | Low | Open | Missing Badge component tests for `status` + `glow` props | this report | tests cover helper + StatCard only |
| G1 | — | Guard | Pass | Coral default + coreCyan optional + existing cyan retained | this report | `themeStore.ts:65-79`; AppearanceTab preset list |
| G2 | — | Guard | Pass | No Orbitron / scanlines / Prism / visual-reference imports under `src/` | this report | grep + theme-store-presets test |
| G3 | — | Guard | Pass | Glow call sites limited to health/breaker surfaces | this report | TokenHealthBadge, DegradationBadge, ProviderHealthMatrix CB badges |

## Evidence Reviewed

### Task / source / tests

- Task: `docs/tasks/03-review/0028-frontend-ia-theme-micro-adoption.md`
- Core map: `src/shared/constants/statusVocabulary.ts` (`STATUS_VOCABULARY`, aliases, `statusToBadgeVariant`, `statusGlowClass`, `STATUS_TONE_ACCENT_CLASS`)
- Primitives:
  - `src/shared/components/Badge.tsx` — optional `status` + `glow` (variant wins when explicit)
  - `src/shared/components/analytics/charts.tsx` — `StatCard` `accent` default `"none"`
- Theme:
  - `src/store/themeStore.ts` — `coreCyan: "#00ffcc"`, `DEFAULT_COLOR_THEME = "coral"`, store default `colorTheme: "coral"`
  - `src/app/(dashboard)/dashboard/settings/components/AppearanceTab.tsx` — coreCyan swatch
  - `src/i18n/messages/en.json` — `themeCoreCyan`
- Health surfaces:
  - `TokenHealthBadge.tsx` — vocab + soft glow warn/error
  - `DegradationBadge.tsx` — vocab surface + soft glow
  - `ProviderHealthMatrixCard.tsx` — `Badge status=…` + CB `glow` for OPEN/HALF_OPEN
- Metric tiles: `UsageAnalytics.tsx` KPI StatCards with `accent="primary|success|warning"`
- Tokens: `src/app/globals.css` — `--color-info`, `--status-glow-*` in light + dark
- Tests:
  - `tests/unit/status-vocabulary.test.ts`
  - `tests/unit/theme-store-presets.test.ts`
  - `tests/unit/ui/stat-card-accent.test.tsx`
- CHANGELOG: `[Unreleased]` Added entry for Task 0028 present

### Status vocabulary → Badge (sample)

| Input | Resolved id | Badge variant | Glow class non-empty |
| --- | --- | --- | --- |
| healthy / ok / up | healthy | success | no |
| degraded / warn / locked | warning | warning | yes (degraded/warn) |
| offline / down | offline | error | no |
| error / failed | error | error | yes |
| OPEN | circuit_open | error | yes |
| HALF_OPEN | circuit_half_open | warning | yes |
| CLOSED | circuit_closed | success | no |
| unknown / idle | unknown/disabled | default | no |

### Production call-site proof (glow budget)

```
statusGlowClass / Badge glow=
  ✓ TokenHealthBadge.tsx (header health)
  ✓ DegradationBadge.tsx (header degraded chip)
  ✓ ProviderHealthMatrixCard.tsx (circuit breaker Badge glow for OPEN | HALF_OPEN)
  ✗ not applied to layout chrome / Sidebar / global Card
```

Landing coral marketing shadows pre-exist and are **not** status vocabulary glow — out of scope; brand-consistent.

### Commands run (fresh this review)

```bash
rg -n 'Orbitron|scanlines|Prism' src/   # → no app-chrome hits
rg -n 'var\(--status-glow' src/         # → NO consumers
rg -n 'statusGlowClass|glow=\{' src/shared/components src/app/(dashboard)

node --import tsx/esm --test \
  tests/unit/status-vocabulary.test.ts \
  tests/unit/theme-store-presets.test.ts
# → 10/10 PASS (6 vocab + 4 presets)

npx vitest run --config vitest.config.ts tests/unit/ui/stat-card-accent.test.tsx
# → 3/3 PASS

npm run typecheck:core
# → PASS
```

### Commands not run and why

- Visual screenshot matrix light/dark — task allows code checklist; tokens dual-defined verified by tests
- Full badge inventory rewrite across repo — task requires 1–2 high-visibility health sites (done)

## Path To 100

1. **F1**: Either (a) wire `statusGlowClass` / `glowClass` entries to `shadow-[…_var(--status-glow-*)]` so light/dark CSS tokens actually drive glow, **or** (b) remove unused `--status-glow-*` and document color-mix-only approach (keep light/dark on `--color-*` which are already used). Prefer (a) for token SSoT honesty.
2. **F2**: Align Badge `warning` utility track with vocab amber (or map vocab warning surfaces to yellow) — single warning chroma.
3. **F3**: Add a small `tests/unit/ui/badge-status.test.tsx` covering `status` resolution, variant override, and `glow` no-op for neutral statuses.
4. Re-run typecheck + targeted tests; confirm coral remains default and no Prism/Orbitron leak.

## Task Ledger Patch Suggestion

```markdown
## Review Ledger

### Latest Review
- **Date**: 2026-07-10
- **Reviewer profile**: `reviewers`
- **Score**: `93/100`
- **Verdict**: `HELD_IN_REVIEW_PATH_TO_100`
- **Full report**: `docs/reports/reviews/2026-07-10-task-0028-frontend-ia-theme-micro-adoption-review.md`
- **Lane outcome**: remains in `03-review/`

#### Current Open Blockers
- none blocking (S ≥ 90)
- `NEW` Low: unused `--status-glow-*` CSS tokens
- `NEW` Low: no Badge status/glow component test

#### Path-to-100 Summary
- wire or drop dead glow CSS vars
- align warning yellow/amber
- Badge component unit test
```
