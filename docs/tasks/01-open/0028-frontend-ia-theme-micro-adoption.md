# Task 0028: Frontend IA — Theme Micro VR Adoption (S9)

> **Status**: `[ ]` Open
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

- [ ] Status vocabulary mapped to Badge/health utilities (code + short comment or tiny doc snippet)
- [ ] Shared StatCard supports accent bar / density micro-pattern (prop or CSS)
- [ ] Glow (if any) limited to health/breaker surfaces — not global layout
- [ ] Optional cyan (or approved) primary preset available in Appearance **without** replacing default brand SSoT
- [ ] No Orbitron / full Prism components added to `src/`
- [ ] Unit tests for new mapping/props pass
- [ ] Light + dark visual smoke recorded (screenshots optional; at least checklist)
- [ ] `npm run typecheck:core` passes
- [ ] CHANGELOG.md entry

---

## Details

### What

Subtasks:
- [ ] **Ler código existente**: `globals.css`, `Badge.tsx`, `charts.tsx` StatCard, `AppearanceTab.tsx`, `themeStore.ts`, any VR docs if present under gitignored `visual-reference/` (optional read), `design.md`
- [ ] **Define status map**: e.g. `ok|degraded|down|unknown|info` → token classes
- [ ] **Implement Badge/health alignment** on 1–2 high-visibility health call sites (not every badge in repo)
- [ ] **StatCard accent bar**: optional prop; adopt on analytics hubs already using shared StatCard
- [ ] **Optional primary preset** in Appearance
- [ ] **Tests** for helpers/props
- [ ] **Verificação**: typecheck + tests + light/dark smoke

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

- [ ] **Light + dark** tokens
- [ ] **No full VR port**
- [ ] **Tests** for new APIs
- [ ] **CHANGELOG**

---

## 📋 Completion Evidence (preenchido pelo agente executor)

- **Arquivos criados/modificados**: [lista]
- **Status vocabulary map**: [table]
- **Presets added**: [names]
- **Testes**: [nomes + resultado]
- **typecheck**: [PASS/FAIL]
- **CHANGELOG**: [ref]
- **Agente executor**: [nome]
- **Data de conclusão**: [YYYY-MM-DD]
