# Task 0030: Frontend IA — PageTabBar + Settings Field Kit + DeployRelayModal Shell (Optional Mid-layer)

> **Status**: `[ ]` Open
> **Priority**: 🟢 P2
> **Type**: `feature`
> **Origin**: Epic 0005 — Frontend IA Reform (quickwins §5: PageTabBar, DeployRelayModal, settings field kit)
> **Action type**: EXTEND
> **Blocks**: none
> **Depends on**: Task 0021 soft (primitives culture); **useful after** Task 0023 hub filters and Task 0022 tab pattern
> **Parallel group**: A/C optional (can wait until hubs need it)

---

## Objective

Ship the remaining **medium-impact mid-layer** UI kits that reduce clone chrome during hub consolidation:

1. **`PageTabBar`** — shared tab bar with optional URL `?tab=` sync (used by Analytics hub, Observe hub, Registry exposures, settings nested tabs).
2. **Settings field kit** — small set of labeled field rows (text/select/number) matching `SettingsToggleRow` density for non-boolean settings.
3. **`DeployRelayModal` shell** — shared modal chrome for relay/deploy clone families (~0.2–0.35k LOC epic estimate).

Each sub-deliverable may ship as a focused PR; task is complete when **≥ 2 of 3** land with tests and ≥ 1 real adoption each.

## Background Context

### What already exists:
- `SegmentedControl`, `FilterBar`, various local tab UIs with inconsistent URL sync
- `SettingsToggleRow` (Task 0021) for booleans only
- Multiple relay/deploy modals with duplicated header/footer/a11y
- Analytics dual-nav already redirected to `?tab=` (Task 0022) — consumers need a standard tab bar

### What is missing:
- One PageTabBar primitive with controlled + URL-synced modes
- Non-boolean settings row kit
- Relay modal shell

### Out of scope:
- Full shadcn/Radix migration
- Replacing every tab in the monorepo in one PR

---

## Test Requirements

- MUST implement PageTabBar with: controlled value, onChange, optional `syncSearchParam` (default `tab`)
- MUST unit-test URL sync behavior (jsdom/vitest or node test patterns used in repo)
- MUST implement field kit rows with label + description + control slot or typed variants
- MUST implement DeployRelayModal shell with title/actions/a11y focus trap consistent with `Modal.tsx`
- MUST adopt each shipped piece in ≥ 1 production call site
- `npm run typecheck:core` + targeted tests MUST pass

---

## Exit Conditions (GDD/TDD)

- [ ] ≥ 2 of {PageTabBar, Settings field kit, DeployRelayModal shell} shipped
- [ ] Each shipped piece has unit tests
- [ ] Each shipped piece has ≥ 1 production adoption
- [ ] PageTabBar URL sync does not break existing analytics `?tab=` redirects
- [ ] Modal shell uses existing Modal primitives — no second modal system
- [ ] `npm run typecheck:core` passes
- [ ] Targeted tests pass with 0 failures
- [ ] CHANGELOG.md entry
- [ ] Residual (if only 2 of 3) listed for follow-up

---

## Details

### What

Subtasks:
- [ ] **Ler código existente**: Analytics hub tabs, `Modal.tsx`, `SegmentedControl.tsx`, `SettingsToggleRow.tsx`, relay/deploy modal call sites, Observe hub needs from Task 0023 if in flight
- [ ] **PageTabBar**: implement + test + adopt on one hub
- [ ] **Field kit**: implement labeled field row(s) + adopt on one settings form
- [ ] **DeployRelayModal shell**: extract + migrate 1–2 modals
- [ ] **Refactoring pass**: keep APIs small
- [ ] **Verificação**: typecheck + tests

### Where

| File | Purpose |
|------|---------|
| `src/shared/components/PageTabBar.tsx` | Create (name flexible) |
| `src/shared/components/settings/*Field*.tsx` | Create field kit |
| `src/shared/components/DeployRelayModal.tsx` or shell under modals | Create |
| `src/shared/components/Modal.tsx` | Read/compose |
| `src/shared/components/index.tsx` | Re-export |
| Analytics / Observe / settings hubs | Adopt |
| Relay-related dashboard components | Adopt shell |
| `tests/unit/ui/page-tab-bar.test.tsx` etc. | Create |
| `CHANGELOG.md` | Entry |

### How

1. Prefer controlled components with optional Next.js `useSearchParams` wrapper for URL mode (SSR-safe patterns already in app).
2. Field kit mirrors SettingsToggleRow visual density.
3. Modal shell only structures chrome; domain forms remain children.
4. Stop at 2 of 3 if timeboxed — document residual.

### Why

Hubs from S2–S5 multiply ad-hoc tabs/modals. These kits amortize clone cost without blocking the seven-pillar rebuild.

---

## ⛔ Anti-Hallucination Guardrails

> [!CAUTION]
> DO NOT introduce a second modal library.
> DO NOT require all three kits if timeboxed — **≥ 2 of 3** is the exit bar.
> DO NOT break analytics `?tab=` contracts from Task 0022.

> [!IMPORTANT]
> Adoption ≥ 1 call site per shipped kit is mandatory (no dead primitives).
> Keep SSR/client boundaries correct for URL sync.

---

## 🛡️ Compliance Checklist

- [ ] **Tests** per kit
- [ ] **Adoption** per kit
- [ ] **a11y** for tabs/modals
- [ ] **CHANGELOG**

---

## 📋 Completion Evidence (preenchido pelo agente executor)

- **Kits shipped**: [list]
- **Adoption call sites**: [paths]
- **Testes**: [nomes + resultado]
- **typecheck**: [PASS/FAIL]
- **Residual kit (if any)**: [name]
- **CHANGELOG**: [ref]
- **Agente executor**: [nome]
- **Data de conclusão**: [YYYY-MM-DD]
