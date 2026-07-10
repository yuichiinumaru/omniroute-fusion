# OmniRoute — UI / Information Architecture Guide

> **Authority**: IA + mid-layer adoption rules for the dashboard.  
> **Token / visual SSoT**: root [`design.md`](../../design.md) + `src/app/globals.css` (not this file).  
> **Live tree SSoT**: `src/shared/constants/sidebarVisibility.ts` (`SIDEBAR_SECTIONS`, `OPERATIONAL_PILLAR_SECTION_IDS`).  
> **Epic**: [0005 — Frontend IA Reform](../tasks/00-planning/0005-omniroute-frontend-ia-design-system-epic.md) · [dependency tree](../dependency-tree.md)  
> **Archive policy**: [`.archive/README.md`](../../.archive/README.md)

This guide permanently bans the **feature → route → sidebar leaf** reflex. Prefer short accuracy over encyclopedic coverage.

---

## 1. Five invariants (must not regress)

| # | Rule | Meaning |
|---|------|---------|
| 1 | **No new default-visible sidebar leaf** without pillar mapping + a note on Epic 0005 (or a successor task) | New capability → map to a pillar first; add as tab/drawer/filter/row when possible |
| 2 | **Strategies / engines / presets are not menus** | Routing strategies, compression engines, sidebar presets ≠ peer leaves |
| 3 | **Event tables are one stream + filters** | Logs / audit / activity → Observability hub (`activity`) + `?source=` (or equivalent), not five peer leaves |
| 4 | **Presets are role views, not architecture** | `all` / `minimal` / `developer` / `admin` hide items for personas; they do not redefine the product tree |
| 5 | **Archive-not-delete** | Re-home capabilities; keep routes or redirects; keep hideable ids if prefs may store them; log under `.archive/` with provenance |

> **Rule of thumb:** if you need to hide ~60% of menus to make the product usable, the menu is wrong.

Code mirror of these rules: file header on `src/shared/constants/sidebarVisibility.ts` (Task 0020 / S0).

---

## 2. Seven operational pillars (post-S6 / Task 0025)

Canonical section ids: `OPERATIONAL_PILLAR_SECTION_IDS`. Non-pillars: `devtools` (debug visibility) and `help`.

| Pillar id | Title (fallback) | Default homes (hubs / groups) |
|-----------|------------------|-------------------------------|
| `core-pulse` | Core Pulse | `home`, `health` |
| `registry` | Registry | `providers`, `embedded-services`, `media`, group `exposures` (`endpoints`, `mcp`, `a2a`, `webhooks`) |
| `routing` | Routing & Strategy | `combos`, `combos-live`, `fusions`, group `compression-context` (settings / combos / studio — **not** engines as leaves), `settings-routing` |
| `governance` | Governance | API keys & tokens, security, quota, costs / free-tiers / rankings |
| `operations` | Operations | groups `tools`, `batch`, `agentic`, `gamification` |
| `observability` | Observability | **`activity`** (observe stream), `analytics`, `cache`, `provider-stats`, `runtime` |
| `system` | System | settings surfaces + `proxy` |

**Do not invent an 8th operational pillar** without an epic-level decision. Compression stays under Routing as a hub (engines are rows/cards/tabs, never default leaves).

Verify before documenting or adding leaves:

```bash
# pillar ids
rg -n "OPERATIONAL_PILLAR_SECTION_IDS|SIDEBAR_SECTIONS" src/shared/constants/sidebarVisibility.ts
```

Pre-S6 snapshot: `.archive/sidebar/2026-07-10-seven-pillars/`.

---

## 3. Anti-patterns (ban list)

| Anti-pattern | Do instead |
|--------------|------------|
| New feature dumps a permanent peer leaf | Map to pillar; extend hub with tab / drawer / filter / row |
| One compression engine per sidebar item | Hub under Routing (`compression-context`); engines on page |
| Separate Activity / Logs / Proxy logs / Console / Audit leaves as defaults | One Observe hub: `/dashboard/activity` + filters (see `docs/architecture/MONITORING_SECTIONS.md`) |
| Analytics dual-nav (sidebar leaf **and** nested route for same shell) | Single hub + `?tab=`; nested routes redirect |
| Triple exposure of MCP/A2A/API catalog as peer Connect leaves | Registry exposures + SSoT routes; retire duplicates (keep hideable ids) |
| Treat sidebar preset as a new product architecture | Rebuild `SIDEBAR_PRESETS` only as role views after IA is fixed |
| Silent `rm` of a surface | Move to `.archive/…` + `PROVENANCE.md` / index row |
| Full port of `visual-reference/` neon / Orbitron / Prism shell | Tokens + selective status/metric micro-patterns only (`design.md` coral identity) |
| Competing design docs (`DESING.md` typo vs `design.md`) | **`design.md` only** for tokens; IA rules live here |

---

## 4. Shared primitives (prefer these)

Import from `src/shared/components/` (verified paths). Prefer these over hand-rolled clones.

| Primitive | Path | Use when |
|-----------|------|----------|
| `EmptyState` | `src/shared/components/EmptyState.tsx` | Empty lists / no-data screens |
| `SettingsToggleRow` | `src/shared/components/SettingsToggleRow.tsx` | Settings / permission rows with label + description + switch |
| `Toggle` | `src/shared/components/Toggle.tsx` | Standalone switch control (no raw `role="switch"` pills) |
| `Badge` | `src/shared/components/Badge.tsx` | Status chips; optional status vocabulary / glow (Task 0028) |
| `Modal` | `src/shared/components/Modal.tsx` | Dialogs; do not fork one-off modal shells |
| `StatCard` | `src/shared/components/analytics/charts.tsx` | KPI / metric tiles (shared; optional accent bar) |
| `PageTabBar` | `src/shared/components/PageTabBar.tsx` | In-page tab bars with URL sync patterns |
| `DeployRelayModal` | `src/shared/components/DeployRelayModal.tsx` | Relay deploy modal shell |
| `ConfigurableToolCard` | `src/shared/components/cli/ConfigurableToolCard.tsx` | CLI tool card shell (Operations → Tools) |
| `Button` / `Checkbox` / `Textarea` | `src/shared/components/*.tsx` | Form primitives already on the token path |

**Status vocabulary:** `src/shared/constants/statusVocabulary.ts` — map domain status → Badge/health tone; do not invent ad-hoc color maps per page.

**Theme / tokens:** `src/app/globals.css` + `src/store/themeStore.ts`. Brand primary remains coral unless the operator picks an Appearance preset.

---

## 5. Checklist: before adding UI surface

1. **Capability type?** Strategy / engine / preset / event row / true operator home.  
2. **If not a true home** → tab, filter, drawer, card row, or settings deep link — **no leaf**.  
3. **If true home** → which of the **7 pillars**? Document in PR + Epic 0005 / successor note.  
4. **Hideable id** — add to `HIDEABLE_SIDEBAR_ITEM_IDS` only when prefs may need it; do not grow default `SIDEBAR_SECTIONS` casually.  
5. **Deep links** — preserve or redirect old paths (pattern from Tasks 0022–0024).  
6. **Primitives** — reuse EmptyState / SettingsToggleRow / StatCard / Toggle / Badge / Modal before cloning.  
7. **Archive** — removals go to `.archive/` with provenance (`.archive/README.md`).  
8. **i18n** — `src/i18n/messages/en.json` `sidebar.*` keys must resolve for any `i18nKey`.  
9. **Tests** — sidebar inventory / hub tests under `tests/unit/ui/` when the default tree changes.  
10. **Do not rewrite** entire `SIDEBAR_SECTIONS` in drive-by PRs — sole structural owner was Task 0025 (S6); successors need explicit IA tasks.

---

## 6. Related docs

| Doc | Role |
|-----|------|
| [`design.md`](../../design.md) | Design tokens, grid, phases 1–6 — **visual SSoT** |
| [Epic 0005](../tasks/00-planning/0005-omniroute-frontend-ia-design-system-epic.md) | Diagnosis, slices S0–S10, success metrics |
| [`docs/dependency-tree.md`](../dependency-tree.md) | Serial vs parallel Frontend IA tasks |
| [`docs/architecture/MONITORING_SECTIONS.md`](../architecture/MONITORING_SECTIONS.md) | Observe hub sections / filters |
| [`.archive/README.md`](../../.archive/README.md) | Archive-not-delete policy |
| `src/shared/constants/sidebarVisibility.ts` | Live pillars, hideables, role presets |

Stale typo doc **`DESING.md`** is superseded: root file is a pointer stub; full historical copy under `.archive/docs/2026-07-10-desing-typo/`.
