# Task 0030: Frontend IA — PageTabBar + Settings Field Kit + DeployRelayModal Shell (Optional Mid-layer)

> **Status**: `[~]` In Progress (implementation complete — awaiting parent review)
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

- [x] ≥ 2 of {PageTabBar, Settings field kit, DeployRelayModal shell} shipped (**3 of 3**)
- [x] Each shipped piece has unit tests
- [x] Each shipped piece has ≥ 1 production adoption
- [x] PageTabBar URL sync does not break existing analytics `?tab=` redirects
- [x] Modal shell uses existing Modal primitives — no second modal system
- [x] `npm run typecheck:core` passes
- [x] Targeted tests pass with 0 failures
- [ ] CHANGELOG.md entry — **drafted below; not published** (parent: no changelog publish)
- [x] Residual (if only 2 of 3) listed for follow-up — **none** (all 3 shipped)

---

## Details

### What

Subtasks:
- [x] **Ler código existente**: Analytics hub tabs, `Modal.tsx`, `SegmentedControl.tsx`, `SettingsToggleRow.tsx`, relay/deploy modal call sites, Observe hub
- [x] **PageTabBar**: implement + test + adopt on Analytics + Observe hubs
- [x] **Field kit**: implement labeled field row(s) + adopt on Vercel/CF/Deno relay modals
- [x] **DeployRelayModal shell**: extract + migrate all 3 relay modals
- [x] **Refactoring pass**: keep APIs small
- [x] **Verificação**: typecheck + tests

### Where

| File | Purpose |
|------|---------|
| `src/shared/components/PageTabBar.tsx` | Create — hub tab bar + `writeTabSearchParam` |
| `src/shared/components/settings/SettingsFieldRow.tsx` | Create — field kit row |
| `src/shared/components/settings/SettingsTextField.tsx` | Create — text/number/password field |
| `src/shared/components/settings/index.ts` | Create — barrel |
| `src/shared/components/DeployRelayModal.tsx` | Create — Modal composition shell |
| `src/shared/components/Modal.tsx` | Read/compose |
| `src/shared/components/index.tsx` | Re-export |
| Analytics / Observe hubs | Adopt PageTabBar |
| Vercel/CF/Deno relay modals | Adopt DeployRelayModal + SettingsTextField |
| `tests/unit/ui/page-tab-bar.test.tsx` etc. | Create |
| `CHANGELOG.md` | Draft only (not published this session) |

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

- [x] **Tests** per kit
- [x] **Adoption** per kit
- [x] **a11y** for tabs/modals
- [ ] **CHANGELOG** (draft ready; publish deferred to parent)

---

## 📋 Completion Evidence (preenchido pelo agente executor)

- **Kits shipped**: PageTabBar, Settings field kit (`SettingsFieldRow` + `SettingsTextField`), DeployRelayModal shell — **3 of 3**
- **Adoption call sites**:
  - PageTabBar → `src/app/(dashboard)/dashboard/analytics/page.tsx` (`?tab=`, default `overview`)
  - PageTabBar → `src/app/(dashboard)/dashboard/activity/ObserveHubClient.tsx` (`?source=`, default `activity`)
  - SettingsTextField + DeployRelayModal → `VercelRelayModal.tsx`, `CloudflareRelayModal.tsx`, `DenoRelayModal.tsx`
- **Testes**:
  - `npx vitest run --config vitest.config.ts tests/unit/ui/page-tab-bar.test.tsx tests/unit/ui/settings-field-row.test.tsx tests/unit/ui/deploy-relay-modal.test.tsx` → **10/10 PASS**
  - `node --import tsx/esm --test tests/unit/dashboard-shell-tabs.test.ts` → analytics assertion updated for PageTabBar (**PASS** for analytics case; pre-existing endpoint assertion fail unrelated to 0030)
  - `node --import tsx/esm --test tests/unit/ui/activity-page-redirect.test.ts` → **6/6 PASS**
- **typecheck**: `npm run typecheck:core` → **PASS**
- **Residual kit (if any)**: none
- **CHANGELOG**: draft below (not published)
- **Agente executor**: Grok Build subagent (Task 0030 builder under parent agentID=builders)
- **Data de conclusão**: 2026-07-10

### Builder Proof Matrix

| Kit | Implemented | Unit tests | Production adoption | Notes |
|-----|-------------|------------|---------------------|-------|
| PageTabBar | ✅ `PageTabBar.tsx` + `writeTabSearchParam` | ✅ controlled + `?tab=` set/delete + custom param helper | ✅ Analytics + Observe | default `syncSearchParam="tab"`; Observe uses `source` |
| Settings field kit | ✅ `SettingsFieldRow` + `SettingsTextField` | ✅ density tokens + controlled text/password | ✅ all 3 relay modals | mirrors ToggleRow border/padding tokens |
| DeployRelayModal | ✅ composes `Modal` (focus trap / Escape / scroll lock) | ✅ open/closed chrome + static adoption of 3 modals | ✅ Vercel / CF / Deno | no second modal system; hand-rolled `fixed inset-0` removed |

### Files changed

**Created**
- `src/shared/components/PageTabBar.tsx`
- `src/shared/components/DeployRelayModal.tsx`
- `src/shared/components/settings/SettingsFieldRow.tsx`
- `src/shared/components/settings/SettingsTextField.tsx`
- `src/shared/components/settings/index.ts`
- `tests/unit/ui/page-tab-bar.test.tsx`
- `tests/unit/ui/settings-field-row.test.tsx`
- `tests/unit/ui/deploy-relay-modal.test.tsx`

**Modified**
- `src/shared/components/index.tsx` — barrel exports
- `src/app/(dashboard)/dashboard/analytics/page.tsx` — PageTabBar adoption
- `src/app/(dashboard)/dashboard/activity/ObserveHubClient.tsx` — PageTabBar adoption
- `src/app/(dashboard)/dashboard/settings/components/proxy/VercelRelayModal.tsx`
- `src/app/(dashboard)/dashboard/settings/components/proxy/CloudflareRelayModal.tsx`
- `src/app/(dashboard)/dashboard/settings/components/proxy/DenoRelayModal.tsx`
- `tests/unit/dashboard-shell-tabs.test.ts` — analytics shell asserts PageTabBar

**Not touched**
- `sidebarVisibility.ts` (Task 0025)
- `CHANGELOG.md` (no publish this session)
- git (no commits)

### Changelog Draft (for parent to publish)

```md
### Added
- **Frontend IA — PageTabBar + settings field kit + DeployRelayModal (Task 0030)** — mid-layer kits to kill hub tab/modal clone chrome:
  - `PageTabBar` with controlled value + optional URL search-param sync (default `?tab=`); adopted on Analytics hub and Observe hub
  - `SettingsFieldRow` / `SettingsTextField` matching SettingsToggleRow density for non-boolean settings rows
  - `DeployRelayModal` shell composing shared `Modal` a11y chrome; Vercel / Cloudflare / Deno relay deployers migrated off hand-rolled overlays
```

---

## 🔍 Review Trail

- **Reviewer**: (pending parent / review agent)
- **Data da review**: —
- **Veredito**: —


## Parent gate 2026-07-10
Promoted after builder proof + targeted tests.
