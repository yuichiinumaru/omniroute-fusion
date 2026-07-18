# Task 0028: Frontend IA — Theme Micro VR Adoption (S9)

> **Status**: `[x]` Completed (return-review 100/100 — promoted 2026-07-18 after 22000 redeploy)
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

### Path-to-100 rework (2026-07-18 — gt-ts-engineer / parent `builders`)

**Open blockers closed:**

| ID | Fix |
|----|-----|
| R1 REGRESSION glow tests | Assert `status-glow-*` class names + `globals.css` rules (not inline `shadow-` / `var(` in class strings) |
| R2 SUPERSEDED brand | Docs/tests already accept coreCyan dark-only (0052/0053); no coral re-litigation |
| R3 module header | `statusVocabulary.ts` header already documents dark-only coreCyan (verified) |
| N1 ModelPill amber | `ProviderHealthMatrixCard` degraded pill `yellow` → `amber` (Badge warning track) |

**Files modified this wave:**

- `tests/unit/status-vocabulary.test.ts` — glow asserts `status-glow-warning|danger|info`; new CSS rule presence test
- `tests/unit/ui/badge-status.test.tsx` — glow asserts `status-glow-danger` (not `/shadow-\[/`)
- `tests/unit/theme-store-presets.test.ts` — primary-foreground + `.status-glow-warning` guards
- `src/app/(dashboard)/dashboard/health/ProviderHealthMatrixCard.tsx` — ModelPill degraded amber

**Tests (2026-07-18):**

```
node --import tsx/esm --test \
  tests/unit/status-vocabulary.test.ts \
  tests/unit/theme-store-presets.test.ts
→ PASS (10)

npx vitest run --config vitest.config.ts \
  tests/unit/ui/stat-card-accent.test.tsx \
  tests/unit/ui/badge-status.test.tsx
→ PASS (7)
```

**Regression guards honored:**

- Soft glow limited to health/breaker; utilities = `status-glow-*` + `--status-glow-*` in `globals.css`
- StatCard `accent` default `none`
- No Orbitron / scanlines / Prism / `visual-reference` production imports
- Badge warning chroma amber
- Brand default **coreCyan dark-only** (0052/0053 successor truth)

**Residual risks:** none for R1–R3. Wider app still has ad-hoc `bg-primary text-white` outside 0028 scope (owned by 0055). No live browser QA this session.

---

### Original completion evidence (2026-07-10 — retained for lineage)

- **Created**: `statusVocabulary.ts`, status-vocabulary / theme-store-presets / stat-card-accent tests
- **Modified**: Badge, StatCard, TokenHealthBadge, DegradationBadge, ProviderHealthMatrixCard, globals status-glow tokens
- **Status map**: healthy→success; degraded/warn→warning+soft glow; offline→danger; error/OPEN→danger+soft; HALF_OPEN→warning+soft; CLOSED→success; info/active→info
- **Agente**: builder 2026-07-10; path-to-100 fixer 2026-07-18 (`gt-ts-engineer`)

### Changelog Draft (for parent publish if needed)

```md
### Fixed
- **Task 0028 path-to-100** — glow regression tests assert `status-glow-*` CSS utilities (not stale Tailwind `shadow-[…]`); ModelPill degraded uses amber vocabulary track. Brand narrative remains coreCyan dark-only (0052/0053).
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

### Latest Review (independent FULL return-review · agentID `reviewers`)

- **Date**: 2026-07-18
- **Reviewer**: Frontend Quality Reviewer (parent `reviewers`)
- **Score**: `100/100`
- **Verdict**: `ACCEPTED_100`
- **Full report**: `docs/reports/reviews/2026-07-18-task-0028-frontend-ia-theme-micro-adoption-return-review.md`
- **Lane**: `docs/tasks/03-review/` (hold; patches **0**)
- **Proof**: 21 targeted tests green; glow → `status-glow-*` + globals rules; ModelPill amber; info → primary

#### Current Open Blockers

- _(none)_

#### Resolved this return-review (re-verified live; prior scores untrusted)

- `RESOLVED` **R1** (reaudit 88): glow tests assert `status-glow-*` class names + CSS rules (not inline `shadow-`/`var(`)
- `RESOLVED` **R2/R3**: brand narrative = coreCyan dark-only (0052/0053); module header clean
- `RESOLVED` **N1–N3**: ModelPill amber; Badge/StatCard info primary; CHANGELOG Fixed
- Non-blocking residuals only: W1 ad-hoc cache tiles outside shared StatCard; W2 no browser session

#### Regression Guards (updated 2026-07-18 return-review)

- Soft glow limited to health/breaker; utilities = `status-glow-*` + `--status-glow-*` in `globals.css`
- Glow unit tests **must not** require `shadow-` or `var(--status-glow-*)` inside the **class string** from `statusGlowClass`
- StatCard `accent` default **`none`**
- No Orbitron / scanlines / Prism / `visual-reference` production imports under `src/`
- Badge / vocab **warning** chroma stays **amber**
- Badge / StatCard / vocab **info** chroma stays **primary/coreCyan** (not blue)
- Brand default **coreCyan dark-only** (0052/0053)

### Previous Reports

- `docs/reports/reviews/2026-07-18-task-0028-frontend-ia-theme-micro-adoption-return-review.md` (**100/100** ACCEPTED · this session)
- `docs/reports/reviews/2026-07-18-task-0028-frontend-ia-theme-micro-adoption-review.md` (claimed 100; untrusted until this return-review)
- `docs/reports/reviews/2026-07-18-task-0028-frontend-ia-theme-micro-adoption-path-to-100.md` (97/100 path-to-100)
- `docs/reports/reviews/2026-07-16-task-0028-frontend-ia-theme-micro-adoption-reaudit.md` (88/100, RETURN_TO_DOING)
- `docs/reports/reviews/2026-07-11-task-0028-frontend-ia-theme-micro-adoption-review.md` (98/100)
- `docs/reports/reviews/2026-07-10-task-0028-frontend-ia-theme-micro-adoption-review.md` (93/100, path-to-100 F1–F3)

## Lane promotion

- **Promoted to 04-completed**: 2026-07-18 — parent after return-review 100/100 + healthy 22000 redeploy (`omniroute:base` sha256:799b53a4c368).
