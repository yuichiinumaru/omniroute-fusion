# Task 0025: Frontend IA — Seven-Pillar Sidebar Rebuild + Role Presets (S6)

> **Status**: `[ ]` Open
> **Priority**: 🔴 P0
> **Type**: `feature`
> **Origin**: Epic 0005 — Frontend IA Reform (slice **S6**)
> **Action type**: UX_VIS
> **Blocks**: Task 0031 (docs guardrail finalizes post-tree rules), optional Fusion leaf placement confirmation
> **Depends on**: Task 0023 (Observe stream), Task 0024 (Registry/Connect cleanup); Wave 1 Tasks 0020–0022 already complete
> **Parallel group**: B (serial after group A IA cleanups)

---

## Objective

Rebuild `SIDEBAR_SECTIONS` from the current **~10 sections / ~67 leaves** intermediate state into the **canonical 7 operational pillars**:

1. **Core Pulse** — Home / health snapshot / cost pulse  
2. **Registry** — Providers, models/media, exposures (post-S5)  
3. **Routing & Strategy** — Combos, Fusions, compression hub (engines still not leaves), simulation  
4. **Governance** — API keys, tokens, policies, security, budgets, quotas  
5. **Operations** — CLI/ACP/cloud agents, agent bridge, traffic inspector, batch  
6. **Observability** — Observe stream (S4) + analytics hub + cache/evals as tabs/children as needed  
7. **System** — Appearance, storage, network/proxy, advanced, flags  

Rebuild presets (`all` / `minimal` / `developer` / `admin`) as **role views** over the fixed short tree — **not** as a substitute for architecture.

**Success metrics (epic §1):** default visible leaves **≤ 12** (stretch ≤ 8) on minimal/operator view; top-level sections **≤ 8** (prefer 7); Fusion under Routing (not leaf #82 forever).

## Background Context

### What already exists:
- `SIDEBAR_SECTIONS`, hideable IDs, presets in `src/shared/constants/sidebarVisibility.ts`
- Group visibility: `src/shared/constants/sidebarGroupVisibility.ts`
- Sidebar UI: `src/shared/components/Sidebar.tsx`
- Settings UI for presets: `…/settings/components/SidebarTab.tsx`
- Wave 1 already removed analytics dual-nav leaves + compression engines (Tasks 0022)
- Epic mapping tables §3C and §6.3

### What is missing:
- Full pillar rename/reparent of remaining sections
- Preset rebuild after tree shrink (current presets still encode hide-as-architecture mindset)
- Explicit Fusion → Routing placement
- Demote leaderboard / free ranking / pure debug to non-default

### Depends on why 0023/0024 first:
- Observability pillar needs one stream home (0023)
- Registry pillar needs single exposure homes (0024)
- Partial rebuild without those will re-encode dual homes

---

## Test Requirements

- MUST export exactly **7** primary operational sections (plus optional debug-only / footer Help not counting as product pillars)
- MUST place `fusions` under Routing & Strategy (or alias), not a free-floating peer of Providers forever
- MUST keep compression engines at **0** default leaves
- MUST keep observe multi-table leaves collapsed per Task 0023 outcome
- MUST rebuild `minimal` preset to ≤ 12 visible leaves (assert in test)
- MUST preserve deep links via existing redirects or new ones for moved items
- MUST archive previous `SIDEBAR_SECTIONS` snapshot under `.archive/sidebar/`
- MUST update/extend unit tests (`sidebar-engine-items` + new seven-pillar tests)
- `npm run typecheck:core` + targeted tests MUST pass

---

## Exit Conditions (GDD/TDD)

- [ ] `SIDEBAR_SECTIONS` maps to 7 pillars (ids/titles documented)
- [ ] Default-visible leaf count on `minimal` preset ≤ 12 (test-enforced)
- [ ] Top-level product sections ≤ 8
- [ ] Fusions under Routing; compression engines still non-leaves
- [ ] Presets `all|minimal|developer|admin` rebuilt as role views over the new tree
- [ ] Hideable IDs retained for removed/moved prefs keys
- [ ] Archive snapshot + PROVENANCE entry for pre-S6 tree
- [ ] Unit tests for pillar ids, leaf caps, fusion placement, engine/observe invariants
- [ ] Sidebar settings UI still works (no broken preset application)
- [ ] `npm run typecheck:core` passes
- [ ] Targeted unit tests pass with 0 failures
- [ ] CHANGELOG.md entry
- [ ] Epic 0005 success metrics table updated when closing

---

## Details

### What

Subtasks:
- [ ] **Ler código existente**: full walk of `SIDEBAR_SECTIONS`, presets, `Sidebar.tsx`, `sidebarGroupVisibility.ts`, SidebarTab, command palette entries, Tasks 0022–0024 outcomes
- [ ] **Produce leaf→pillar spreadsheet** (Completion Evidence draft before code): every current id → pillar or demote
- [ ] **Rewrite SIDEBAR_SECTIONS** to 7 pillars; keep type safety of definitions
- [ ] **Rebuild preset allowlists** as role views
- [ ] **i18n keys**: add `sidebar.*` titles for pillars if missing (coordinate labels with Task 0026 if parallel collision — prefer pillar keys here, naming debt there)
- [ ] **Archive** pre-rebuild snapshot under `.archive/sidebar/YYYY-MM-DD-seven-pillars/`
- [ ] **Tests**: seven pillars, minimal ≤12, fusions placement, engines=0, observe hub invariant
- [ ] **Manual smoke**: each pillar expands; bookmarks redirect; presets apply
- [ ] **Verificação**: typecheck + tests

### Where

| File | Purpose |
|------|---------|
| `src/shared/constants/sidebarVisibility.ts` | Modify — main rebuild |
| `src/shared/constants/sidebarGroupVisibility.ts` | Modify — groups under pillars |
| `src/shared/components/Sidebar.tsx` | Read/Modify if section chrome needs pillar metadata |
| `src/app/(dashboard)/dashboard/settings/**/SidebarTab.tsx` | Modify — preset copy if needed |
| `src/i18n/messages/en.json` (+ other locales as policy requires) | Modify — pillar labels |
| `src/shared/components/CommandPalette.tsx` | Modify — paths/labels if hardcoded |
| `tests/unit/ui/sidebar-engine-items.test.ts` | Extend or keep + new file |
| `tests/unit/ui/sidebar-seven-pillars.test.ts` | Create |
| `.archive/sidebar/` | Snapshot pre-S6 tree |
| `CHANGELOG.md` | Entry |
| Epic 0005 | Update metrics on close |

### How

1. Freeze inventory with a script/grep dump of all leaf ids → table.
2. Apply epic §6.3 mapping; demote gamification/debug.
3. Rewrite sections array; do not break TypeScript definition types.
4. Rebuild presets from operator personas (minimal = daily pulse+routing+keys+observe).
5. Snapshot + tests + CHANGELOG.
6. Coordinate with 0026 for label strings to avoid double-editing `en.json` conflicts — if 0026 parallel, land pillar keys first, naming synonyms second.

### Why

This is the epic’s primary IA outcome. Everything else is either preparation (Wave 1, S4, S5) or polish (i18n, theme, docs). Without S6, presets remain a crutch and Fusion/future features re-grow the dump.

---

## ⛔ Anti-Hallucination Guardrails

> [!CAUTION]
> DO NOT start S6 before Observe (0023) and Registry (0024) homes are known — partial pillar rebuild re-encodes dual homes.
> DO NOT delete capabilities — re-home only.
> DO NOT use presets to hide 60% of a still-huge tree and call it done.
> DO NOT reintroduce compression engines or analytics dual-nav leaves.

> [!IMPORTANT]
> Archive snapshot of pre-S6 `SIDEBAR_SECTIONS` is mandatory.
> Fusion must land under Routing & Strategy.
> Test-enforce minimal ≤ 12 leaves.

---

## 🛡️ Compliance Checklist

- [ ] **Archive Protocol**: Pre-S6 snapshot + provenance
- [ ] **Deep links**: preserved/redirected
- [ ] **i18n**: pillar keys present in en (and sync policy for other locales)
- [ ] **Tests**: binary leaf/preset assertions
- [ ] **Fusion constraint**: under Routing

---

## 📋 Completion Evidence (preenchido pelo agente executor)

- **Arquivos criados/modificados**: [lista]
- **Leaf→pillar map**: [table or file path]
- **minimal visible leaf count**: [N]
- **Testes**: [nomes + resultado]
- **Archive path**: [`.archive/sidebar/...`]
- **typecheck**: [PASS/FAIL]
- **CHANGELOG**: [ref]
- **Agente executor**: [nome]
- **Data de conclusão**: [YYYY-MM-DD]
