# Task 0028: Frontend IA — Theme Micro VR Adoption (S9)

> **Status**: `[x]` Completed — implementation complete; awaiting parent review
> **Priority**: 🟡 P1
> **Type**: `feature`
> **Origin**: Epic 0005 — Frontend IA Reform (slice **S9**)
> **Action type**: UX_VIS
> **Blocks**: none
> **Depends on**: Task 0021 soft (shared StatCard/Badge better targets); no hard block
> **Parallel group**: A

---

## Objective

Selectively adopt **visual-reference (VR)** micro-patterns into OmniRoute’s existing token/primitives system — **without** a full Prism/CyberCore port:

| Adopt | How |
|-------|-----|
| **Status vocabulary** | Map VR `STATE_VOCABULARY` → shared `Badge` / health colors (success/warn/danger/neutral/info) |
| **Metric tiles** | Accent bar / density polish on shared `StatCard` (`charts.tsx`) |
| **Glow budget** | Optional subtle emphasis **only** on health / circuit-breaker / critical status (not global neon) |
| **Optional cyan primary preset** | Appearance swatch `#00FFCC` (or design.md-aligned alias) as **optional** preset — not new SSoT |

**Explicit ignores (epic §7):** Orbitron/Rajdhani app chrome, scanlines, neon logo block, Prism component tree, fantasy navigation, cyan/obsidian as forced SSoT.

## Background Context

### What already exists:
- Tokens: `src/app/globals.css` (`@theme inline`)
- Theme runtime: `src/store/themeStore.ts`, `ThemeProvider.tsx`, `AppearanceTab.tsx`
- Primitives: `Badge`, `Card`, shared `StatCard`, health badges (`TokenHealthBadge`, `DegradationBadge`, flow `StatusDot`)
- Design plan: `design.md` (authoritative over stale `DESING.md`)
- Local gitignored `visual-reference/` mock (input only)

### What is missing:
- Documented status→Badge mapping used consistently on health surfaces
- Metric tile accent micro-pattern on shared StatCard
- Optional accent preset without fighting coral marketing identity

---

## Test Requirements

- MUST keep light + dark token pairs for any new CSS variables
- MUST NOT introduce Orbitron/scanlines as default chrome
- MUST extend StatCard or Badge in a backward-compatible way (existing call sites still render)
- MUST add unit tests for status vocabulary mapping helper (if new) and/or StatCard accent prop
- MUST verify Appearance optional preset does not break existing primary swatch flow
- `npm run typecheck:core` + targeted tests MUST pass

---

## Exit Conditions (GDD/TDD)

- [x] Status vocabulary mapped to Badge/health utilities (code + short comment or tiny doc snippet)
- [x] Shared StatCard supports accent bar / density micro-pattern (prop or CSS)
- [x] Glow (if any) limited to health/breaker surfaces — not global layout
- [x] Optional cyan (or approved) primary preset available in Appearance **without** replacing default brand SSoT
- [x] No Orbitron / full Prism components added to `src/`
- [x] Unit tests for new mapping/props pass
- [x] Light + dark visual smoke recorded (screenshots optional; at least checklist)
- [x] `npm run typecheck:core` passes
- [x] CHANGELOG.md entry

---

## Details

### What

Subtasks:
- [x] **Ler código existente**: `globals.css`, `Badge.tsx`, `charts.tsx` StatCard, `AppearanceTab.tsx`, `themeStore.ts`, any VR docs if present under gitignored `visual-reference/` (optional read), `design.md`
- [x] **Define status map**: e.g. `ok|degraded|down|unknown|info` → token classes
- [x] **Implement Badge/health alignment** on 1–2 high-visibility health call sites (not every badge in repo)
- [x] **StatCard accent bar**: optional prop; adopt on analytics hubs already using shared StatCard
- [x] **Optional primary preset** in Appearance
- [x] **Tests** for helpers/props
- [x] **Verificação**: typecheck + tests + light/dark smoke

### Where

| File | Purpose |
|------|---------|
| `src/app/globals.css` | Modify — tokens if needed (light+dark) |
| `src/shared/components/Badge.tsx` | Extend — status variants if needed |
| `src/shared/components/analytics/charts.tsx` | Extend — StatCard accent |
| `src/store/themeStore.ts` | Extend — optional preset |
| `src/app/(dashboard)/dashboard/settings/**/AppearanceTab.tsx` | Modify — preset UI |
| Health badge call sites (selective) | Modify — vocabulary adoption |
| `tests/unit/ui/*` | Create/extend |
| `design.md` | Read — brand constraints |
| `CHANGELOG.md` | Entry |

### How

1. Read design.md brand constraints; ignore VR chrome.
2. Encode status vocabulary as a small TS map + Tailwind classes (no second design system).
3. Add StatCard accent using existing border/background tokens.
4. Wire optional preset carefully (default remains current brand).
5. Tests + CHANGELOG.

### Why

Operators need clearer health/status density; full neon redesign would fight OmniRoute identity and blow scope. Micro-adoption is High ops impact / Small effort.

---

## ⛔ Anti-Hallucination Guardrails

> [!CAUTION]
> DO NOT port Prism component tree or Orbitron fonts as app chrome.
> DO NOT set cyan as the only primary default without operator approval.
> DO NOT invent Atomic Design folder ceremony.

> [!IMPORTANT]
> Any new CSS variable MUST define `:root` and `.dark`.
> Prefer extending existing Badge/StatCard over new parallel components.
> visual-reference is **input only** — do not depend on gitignored paths in production imports.

---

## 🛡️ Compliance Checklist

- [x] **Light + dark** tokens
- [x] **No full VR port**
- [x] **Tests** for new APIs
- [x] **CHANGELOG**

---

## 📋 Completion Evidence (preenchido pelo agente executor)

- **Arquivos criados/modificados**:
  - **Created**
    - `src/shared/constants/statusVocabulary.ts` — status → tone/Badge/glow map
    - `tests/unit/status-vocabulary.test.ts`
    - `tests/unit/theme-store-presets.test.ts`
    - `tests/unit/ui/stat-card-accent.test.tsx`
  - **Modified**
    - `src/app/globals.css` — `--color-info` + `--status-glow-*` (light + dark)
    - `src/shared/components/Badge.tsx` — optional `status` + `glow`
    - `src/shared/components/analytics/charts.tsx` — StatCard `accent` prop
    - `src/shared/components/TokenHealthBadge.tsx` — vocab + soft glow on warn/error
    - `src/shared/components/DegradationBadge.tsx` — vocab surface + soft glow
    - `src/shared/components/UsageAnalytics.tsx` — KPI accent bars
    - `src/app/(dashboard)/dashboard/health/ProviderHealthMatrixCard.tsx` — vocab Badge + CB glow
    - `src/store/themeStore.ts` — `coreCyan: #00ffcc`, `DEFAULT_COLOR_THEME = coral`
    - `src/app/(dashboard)/dashboard/settings/components/AppearanceTab.tsx` — coreCyan swatch
    - `src/shared/constants/statusColors.ts` — `info` hex
    - `src/i18n/messages/en.json` — `themeCoreCyan`
    - `CHANGELOG.md` — Unreleased draft entry
- **Status vocabulary map**:

  | Status / alias | Tone | Badge variant | Glow |
  |---|---|---|---|
  | healthy, ok, success, up | success | success | none |
  | degraded, warn, locked | warning | warning | soft (degraded/warn) |
  | offline, down, unavailable | danger | error | none |
  | error, failed | danger | error | soft |
  | unknown / idle / disabled | neutral | default | none |
  | info / active | info | info | soft (active) |
  | OPEN / circuit_open | danger | error | soft |
  | HALF_OPEN | warning | warning | soft |
  | CLOSED | success | success | none |

- **Presets added**: `coreCyan` (`#00ffcc`) — optional; coral remains default SSoT; existing `cyan` (`#06b6d4`) retained
- **Testes**:
  - `node --import tsx/esm --test tests/unit/status-vocabulary.test.ts tests/unit/theme-store-presets.test.ts` → **PASS** (10)
  - `npx vitest run --config vitest.config.ts tests/unit/ui/stat-card-accent.test.tsx` → **PASS** (3)
  - `node --import tsx/esm --test tests/unit/design-grid-background.test.ts` → **PASS** (19)
- **typecheck**: `npm run typecheck:core` → **PASS**
- **Light/dark smoke checklist** (code-level; no screenshot run):
  - [x] `:root` and `.dark` both define `--color-info` and `--status-glow-*`
  - [x] StatCard `accent="none"` (default) leaves existing tiles unchanged
  - [x] No Orbitron / scanlines / Prism imports under `src/`
  - [x] Appearance default `colorTheme: "coral"` unchanged
- **CHANGELOG**: `[Unreleased]` → Frontend IA theme micro-adoption (Task 0028)
- **Agente executor**: builder (Task 0028, parent agentID=builders)
- **Data de conclusão**: 2026-07-10

### Changelog Draft (for parent publish if needed)

```md
### Added
- **Frontend IA theme micro-adoption (Task 0028 / Epic 0005 S9)** — selective visual-reference patterns without a full Prism/CyberCore port. Coral brand SSoT unchanged; cyan is optional Appearance only.
  - statusVocabulary → Badge/health tones; soft glow only on health/breaker surfaces
  - StatCard optional accent bar; UsageAnalytics KPIs adopt it
  - Appearance optional coreCyan (#00FFCC) preset
  - Tests: status-vocabulary, theme-store-presets, stat-card-accent
```


---

## Parent builder wave gate (2026-07-10)

- Aggregated unit/vitest green in Wave 2 closeout
- Promoted to `04-completed` for epic drain; independent reviewer may re-open if regressions found
- Closeout: `docs/reports/builders/2026-07-10-wave2-closeout.md`

---

## Review Ledger

> [!IMPORTANT]
> Before path-to-100 work, read the latest full report and all reports listed
> under Previous Reports. Persistent findings and regression guards are part of
> the acceptance contract; do not fix the latest finding by undoing a previously
> accepted repair.

### Latest Review

- **Date**: 2026-07-11
- **Reviewer profile**: `reviewers`
- **Score**: `98/100`
- **Verdict**: `PASS WITH NOTES`
- **Full report**: `docs/reports/reviews/2026-07-11-task-0028-frontend-ia-theme-micro-adoption-review.md`
- **Lane outcome**: remains in `03-review/` (S ≥ 90 — not returned to doing; not promoted to completed)
- **Task reference**: Task 0028 (`frontend-ia-theme-micro-adoption`); resolve current path from `docs/tasks/tasklist.md` or search under `docs/tasks/`

#### Current Open Blockers

- none blocking (score ≥ 90)
- `NEW` Info OOS: full `typecheck:core` red on unrelated uncommitted fusion combo WIP (`runtimeUnits.ts` connectionId) — not Task 0028 surfaces
- `NOTE` Info residual: `ProviderHealthMatrixCard` ModelPill degraded still yellow (Badge/vocab amber track closed)

#### Path-to-100 Summary

- prior F1–F3 closed this re-review (glow CSS vars wired; Badge amber; badge-status tests)
- residual: clean workspace typecheck:core; optional ModelPill amber polish

#### Regression Guards

- `DEFAULT_COLOR_THEME` / store default must remain **`coral`**; `coreCyan` stays optional Appearance-only
- Existing `COLOR_THEMES.cyan` (`#06b6d4`) must not be overwritten by core cyan
- Soft glow must remain limited to health/breaker surfaces (TokenHealthBadge, DegradationBadge, CB badges)
- Glow utilities must keep referencing dual light/dark `--status-glow-*` tokens
- StatCard `accent` default **`none`** (backward compatible)
- No Orbitron / scanlines / Prism / `visual-reference` production imports under `src/`
- Dual light+dark pairs for any new CSS variables
- Badge `warning` chroma stays **amber** (aligned with statusVocabulary)

### Previous Reports

- `docs/reports/reviews/2026-07-10-task-0028-frontend-ia-theme-micro-adoption-review.md` (93/100, path-to-100 F1–F3)
