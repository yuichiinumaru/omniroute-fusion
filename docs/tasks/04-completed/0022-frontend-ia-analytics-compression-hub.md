# Task 0022: Frontend IA — Analytics Dual-Nav Kill + Compression Hub Collapse (S2 + S3)

> **Status**: `[x]` Completed
> **Priority**: 🔴 P0
> **Type**: `feature`
> **Origin**: Epic 0005 — Frontend IA Reform (slices **S2** + **S3**)
> **Action type**: UX_VIS
> **Blocks**: Task 0025 (seven-pillar rebuild builds on reduced leaf set)
> **Depends on**: Task 0020 (archive policy), Task 0021 (shared primitives — parallel-friendly)
> **Parent review**: Wave 1 shipped 2026-07-10 — commit `d96e677` (+ epic §11a)

---

## Objective

1. **S2 — Kill Analytics dual navigation**: nested analytics routes must **redirect** into a single Analytics shell via `?tab=`; remove dual-nav leaves from the default sidebar tree while keeping hideable IDs for prefs and deep links.
2. **S3 — Compression sidebar hub only**: engines are **not** top-level leaves; default tree keeps Settings / Combos / Studio (hub) with engine routes still deep-linkable; provenance snapshot under `.archive/sidebar/`.

Net effect (epic §11a): default sidebar leaves **~81 → ~67** (≈ −14: 5 analytics dual-nav + 9 compression engines).

## Background Context

### What already exists (pre-Wave 1):
- Analytics hub at `/dashboard/analytics` with `?tab=` in-page navigation
- Nested routes also exposed as sidebar leaves (`utilization`, `search`, `evals`, `compression`, `combo-health`, …)
- Compression Context group listed engines (Caveman, RTK, Headroom, …) as peer leaves
- Deep links to engine config pages and compression studio still required by operators

### What was wrong:
- Same content as leaf **and** tab **and** nested route (dual/triple nav)
- Strategies/engines presented as menus (violates epic invariant #2)

---

## Test Requirements

- MUST redirect nested analytics pages to `/dashboard/analytics?tab=<id>`
- MUST keep compression engine routes reachable (deep link / hub navigation) without sidebar engine leaves
- MUST keep engine + dual-nav IDs in `HIDEABLE_SIDEBAR_ITEM_IDS` for stored prefs
- MUST assert hub-only compression group item set: `context-settings`, `context-combos`, `compression-studio`
- MUST assert analytics default leaves: `analytics`, `cache`, `provider-stats` (no dual-nav IDs)
- MUST log archive provenance for removed IA surfaces (not silent delete)

---

## Exit Conditions (GDD/TDD)

- [x] Nested analytics pages use `redirect(...?tab=)` (utilization, search, evals, compression, combo-health, …)
- [x] Compression tab available on analytics hub where dual-nav previously pointed
- [x] `COMPRESSION_CONTEXT_GROUP` hub-only (no engine leaves)
- [x] Engine IDs remain hideable; routes/settings deep links kept
- [x] `tests/unit/ui/sidebar-engine-items.test.ts` passes (S2 + S3 assertions)
- [x] Archive snapshot path `.archive/sidebar/2026-07-10-ia-collapse/` documented
- [x] Epic 0005 §11a marks S2 + S3 done; leaf delta recorded (~−14)
- [x] Shipped with Wave 1 commit `d96e677` (2026-07-10)

---

## Details

### What

Subtasks:
- [x] **Read existing code**: `sidebarVisibility.ts`, analytics nested `page.tsx` files, compression hub/group defs
- [x] **Convert nested analytics pages to redirects**: preserve tab ids; comment dual-nav retired
- [x] **Trim analytics sidebar leaves**: leave hub + cache + provider-stats; retain hideable dual-nav ids
- [x] **Collapse compression group**: settings/combos/studio only; engines deep-linked via hub
- [x] **Archive provenance**: snapshot under `.archive/sidebar/2026-07-10-ia-collapse/`
- [x] **Tests**: `sidebar-engine-items.test.ts`
- [x] **Verification**: unit green; manual deep-link smoke for engine routes

### Where

| File | Purpose |
|------|---------|
| `src/shared/constants/sidebarVisibility.ts` | Modify — analytics leaves, compression group, hideable constants, snapshot comments |
| `src/app/(dashboard)/dashboard/analytics/*/page.tsx` | Modify — `redirect(?tab=)` |
| Compression hub / engine pages | Read/modify as needed — deep links preserved |
| `.archive/sidebar/2026-07-10-ia-collapse/SNAPSHOT.md` | Create — IA collapse snapshot |
| `tests/unit/ui/sidebar-engine-items.test.ts` | Create — S2/S3 regression guards |
| Epic 0005 | Read — success metrics |

### How

1. For each dual-nav analytics nested route, replace page body with Next `redirect` to hub tab.
2. Remove dual-nav IDs from default `SIDEBAR_SECTIONS` analytics children; keep in hideable lists + constants for tests.
3. Strip engine items from `COMPRESSION_CONTEXT_GROUP`; keep three hub items; engines remain as routes + hideable prefs.
4. Snapshot pre/post tree notes into `.archive/sidebar/…`.
5. Lock behavior with `sidebar-engine-items.test.ts`.

### Why

Dual-nav and engine-as-menu are the highest-impact IA anti-patterns confirmed live. Collapsing them early reduces leaf count and prevents S6 (seven pillars) from re-encoding a broken tree.

---

## ⛔ Anti-Hallucination Guardrails

> [!CAUTION]
> DO NOT delete engine routes or analytics tab content — re-home only.
> DO NOT remove hideable IDs that user prefs may still store.
> DO NOT silent-delete sidebar definitions — archive snapshot + provenance.

> [!IMPORTANT]
> Deep links for services/proxy/analytics/memory must remain valid (redirects OK).
> Compression engines stay **0** top-level leaves forever (epic success metric).

---

## 🛡️ Compliance Checklist

- [x] **Doc Accuracy**: Redirects and tests verified in tree
- [x] **Archive Protocol**: Snapshot under `.archive/sidebar/2026-07-10-ia-collapse/`
- [x] **i18n**: Existing keys retained; no mass rename (Task 0026)
- [x] **Capabilities preserved**: routes + tabs still reachable

---

## 📋 Completion Evidence

- **Arquivos criados/modificados**:
  - `src/shared/constants/sidebarVisibility.ts` — `COMPRESSION_ENGINE_SIDEBAR_IDS`, `ANALYTICS_DUAL_NAV_SIDEBAR_IDS`, hub-only groups
  - `src/app/(dashboard)/dashboard/analytics/utilization/page.tsx` → redirect `?tab=utilization`
  - `…/analytics/search/page.tsx` → `?tab=search`
  - `…/analytics/evals/page.tsx` → `?tab=evals`
  - `…/analytics/compression/page.tsx` → `?tab=compression`
  - `…/analytics/combo-health/page.tsx` → `?tab=combo-health`
  - Compression context group hub-only (settings/combos/studio)
  - `.archive/sidebar/2026-07-10-ia-collapse/SNAPSHOT.md` (local/gitignored)
  - `tests/unit/ui/sidebar-engine-items.test.ts`
- **Testes que verificam o trabalho**:
  - `node --import tsx/esm --test tests/unit/ui/sidebar-engine-items.test.ts` (Wave 1 PASS)
- **Leaf count**: ~67 default (was ~81) per epic §11a
- **Commit**: `d96e677`
- **Agente executor**: Wave 1 session (omniroute-fusion)
- **Data de conclusão**: 2026-07-10

---

## 🔍 Review Trail

- **Reviewer**: Task Architect (post-hoc Wave 1 capture)
- **Data da review**: 2026-07-10
- **Veredito**: PASS
- **Score (path to 100)**: 96
- **Notas**: Observe stream (S4) and registry cleanup (S5) remain open as Tasks 0023–0024.
