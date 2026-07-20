# Task 0082: EPIC-19 T19-E — Sidebar Drop Analytics + Costs Leaves; Palette/i18n; Leaf-Count Tests; Provenance

> **Status**: `[x]` Implemented — independent re-review **100/100 ACCEPT** (lane `03-review`; agentID=`reviewers`)
> **Priority**: 🔴 P0
> **Type**: `feature` + `remediation` + `verification`
> **Action type**: UX_VIS + HARDEN
> **Origin**: EPIC-19 §2.3 / §3 target chrome; UI.md invariant 5 archive-not-delete; Task **0078** target primary list; depends on content homes from **0079–0081**
> **Blocks**: soft — **0083** verify pass is cleaner after this
> **Depends on**: **0078 + 0079 + 0080 + 0081** hard (SSoT freeze + redirects + content homes must work before leaf drop)
> **Parallel class**: `serializable` after B–D; exclusive owner of `PRIMARY_SIDEBAR_ITEMS` cutover + **live** primary chrome docs
> **Review routing**: independent final chrome PR; bundle with 0081 only if release train needs simultaneous cutover
> **Doc section lock**: sole owner of UI.md `## Primary chrome (live)` and NAV-TREE **live** L0 primary list post-cutover (flip planned→live). Do not edit reverse-chrome (0076), EPIC-19 planned (0078), labs residual (0077), or Tools interim (0083).

---

## Objective

Remove **Analytics** and **Costs** as **default-visible primary sidebar leaves**. Keep routes as redirects (already from 0079–0081), keep hideable ids for stored prefs, update command palette + i18n labels, encode leaf-count/id tests, and write `.archive/sidebar/` provenance.

**Done when:**

1. `PRIMARY_SIDEBAR_ITEMS` has **no** default-visible `analytics` or `costs` peers.
2. Post-cutover primary set matches Epic target ids: **`home, providers, combos, activity, operations, settings-general, docs`** (length **7**). **Re-measure** live array and update UI.md live table + tests — do not invent an 8th leaf.
3. Command palette does not promote Analytics/Costs as primary destinations for retired leaves (may keep deep links to Dashboard/Providers/Observe destinations).
4. Hideable ids for analytics/costs family **retained**.
5. Provenance under `.archive/sidebar/` documents the cutover.
6. Unit tests: PRIMARY_SIDEBAR length/ids; full redirect matrix still green; no dual primary for same surface.
7. **0** new primary leaves for Translator/Playground/Search Tools.

---

## Background Context

### O que já existe:

- `PRIMARY_SIDEBAR_ITEMS` length **9** including analytics + costs (`sidebarVisibility.ts`).
- Tests asserting length 9 and presence of analytics/costs: e.g. `tests/unit/sidebar-visibility.test.ts`, `tests/unit/ui/sidebar-flat-primary-nav.test.ts`, `tests/unit/sidebar-costs-section.test.ts`, `tests/unit/ui/sidebar-engine-items.test.ts`.
- Hideable ids already list analytics/costs and sub-ids.
- Archive precedent: `.archive/sidebar/2026-07-10-seven-pillars/`, `2026-07-10-flat-primary-nav/`, observe-stream snapshot comments in sidebarVisibility.
- CommandPalette injects extras (Testing hub + labs) — inspect for analytics/costs entries.
- i18n keys: `analytics`, `costsNav`, dashboard labels in `src/i18n/messages/`.

### O que está faltando / quebrado:

- Leaves still present → dual mental model after content moved.
- Tests freeze length 9 with analytics/costs — will fail until updated intentionally.
- No provenance snapshot for EPIC-19 cutover.

### Prerequisites (gate):

- [ ] 0079: Providers config redirects green  
- [ ] 0080: Observe operational redirects + `id=` green  
- [ ] 0081: Dashboard storytelling + costs overview redirects green  

If any gate fails, **do not** drop leaves (bookmarks would 404 or orphan).

### Explicitly out of scope:

- Implementing content moves (already 0079–0081).
- Tools→Ops product redesign (0083 verify-only).
- HOLD-URL prefix strip.
- Favorites epic (EPIC-15).
- Re-doing 0075–0077 chrome.

### Collision notes:

- Exclusive owner of `PRIMARY_SIDEBAR_ITEMS` membership change + **live** L0 docs flip.
- **Must rewrite** any residual tests from **0075–0077** (and earlier) that still pin `PRIMARY_SIDEBAR_ITEMS.length === 9` or require analytics/costs primary presence — list via:
  ```bash
  rg -n "PRIMARY_SIDEBAR_ITEMS\\.length|length === 9|includes\\([\\\"']analytics|includes\\([\\\"']costs" tests/
  ```
- **0076** owns reverse-chrome UI.md only; **0078** owns planned EPIC-19 sections; this task owns **live** tables only.

---

## Dependency & Parallel Safety

| Item | Value |
|------|--------|
| **Depends on** | **0078, 0079, 0080, 0081** hard (explicit) |
| **Blocks** | Soft **0083** |
| **File ownership (exclusive)** | `sidebarVisibility.ts` primary list + presets that reference analytics/costs as primary; sidebar unit tests **including rewrite of residual 0075–0077 length-9 pins**; `.archive/sidebar/` EPIC-19 provenance; palette entries for retired leaves; UI.md `## Primary chrome (live)`; NAV-TREE live L0 primary list |
| **Do not touch** | Providers/Observe/Dashboard page implementations except link fixes forced by leaf drop; fusion/ops residual product UI; UI.md reverse-chrome / planned EPIC-19 / Tools interim sections |
| **Collision vs live lanes** | High blast radius on tests — own the test updates in this task |
| **parallel-safe** | **No** — serial after A–D |

---

## Test Requirements

- DEVE assertir `PRIMARY_SIDEBAR_ITEM_IDS` **não** inclui `"analytics"` nem `"costs"` como default primary
- DEVE assertir measured length **7** and exact id set: `home, providers, combos, activity, operations, settings-general, docs` (single SSoT test)
- DEVE **rewrite any residual tests from 0075–0077** (and legacy suites) that still pin `length === 9` or require analytics/costs as primary — Exit fails if any green suite still asserts forever-9 after cutover
- DEVE assertir hideable ids still include `analytics`, `costs`, and costs/analytics sub-ids used by prefs
- DEVE assertir full EPIC-19 redirect matrix (import 0078 + any implementation modules) still maps all Epic §4 rows
- DEVE assertir **no** playground/translator/search-tools primary leaves; Testing not primary
- DEVE atualizar/remover asserts that required analytics/costs primary presence (`sidebar-costs-section`, `sidebar-engine-items`, etc.)
- DEVE garantir CommandPalette does not reintroduce dual primary for Analytics/Costs (assert absence or rewrite to Dashboard/Providers/Observe targets)
- NÃO DEVE hard-delete routes or hideable ids

---

## Exit Conditions (GDD/TDD)

- [x] `PRIMARY_SIDEBAR_ITEMS` cutover complete; live dump recorded in Completion Evidence (target 7 ids)
- [x] All broken length/id unit tests updated and green — **including rewrite of residual 0075–0077 tests that still pin length 9**
- [x] `rg` for `length === 9` / analytics+costs primary presence in tests shows **zero** remaining forever-9 pins (or justified allowlist note)
- [x] Redirect matrix regression suite green (0078/0079/0080/0081 tests)
- [x] `.archive/sidebar/` provenance written (date + from→to leaf list + Epic reference)
- [x] `docs/guides/UI.md` `## Primary chrome (live)` + NAV-TREE live L0 match code (planned→live flip; do not edit other sections)
- [x] i18n: no broken keys for remaining chrome; retired labels acceptable if unused
- [x] `node --import tsx/esm --test` on sidebar + epic19 matrix test files passa com 0 falhas (list files in Evidence)
- [x] `npm run typecheck:core` passa sem erros
- [x] `npm run lint` passa sem erros novos nos arquivos tocados
- [x] Completion Evidence preenchido antes de `03-review/`

---

## Details

### What

Subtasks:

- [ ] **Ler código existente**: 0078–0081 completion notes; `sidebarVisibility.ts` full; all tests matching analytics/costs primary; CommandPalette; UI.md live table; archive README
- [ ] Verify redirect gates green (run matrix tests) — requires 0078–0081
- [ ] Remove analytics + costs from `PRIMARY_SIDEBAR_ITEMS`; update presets (`ADMIN`/`DEVELOPER` etc.) that expand primary ids
- [ ] Update subtitle copy on remaining leaves if needed (Observe: logs+health+combo+route; Providers: +budget/pricing/quota)
- [ ] Palette + any topbar residual links
- [ ] i18n pass for labels that still say dual Analytics leaf
- [ ] Rewrite unit tests for new leaf contract **including residual 0075–0077 length-9 pins**
- [ ] Write `.archive/sidebar/YYYY-MM-DD-epic19-analytics-costs-cutover/` provenance
- [ ] Sync UI.md **live** + NAV-TREE **live** sections only (planned→live flip)
- [ ] **Refactoring pass**: single source for expected primary id list in tests if duplicated
- [ ] **Verificação de regressão**: full targeted suite + typecheck:core + lint

### Where

| Arquivo | Propósito |
|---------|-----------|
| `src/shared/constants/sidebarVisibility.ts` | Modificar — drop primary analytics/costs; keep hideable |
| `src/shared/components/CommandPalette.tsx` (verify path) | Modificar se necessário |
| `docs/guides/UI.md` | `## Primary chrome (live)` only — post-cutover |
| `docs/architecture/NAV-TREE-TARGET.md` | Live L0 primary list only (planned→live flip) |
| `.archive/sidebar/*-epic19-*/` | Criar provenance |
| `tests/unit/sidebar-visibility.test.ts` | Atualizar |
| `tests/unit/ui/sidebar-flat-primary-nav.test.ts` | Atualizar |
| `tests/unit/sidebar-costs-*.test.ts` | Atualizar |
| `tests/unit/ui/sidebar-engine-items.test.ts` | Atualizar |
| `tests/unit/ui/epic19-*-00{78,79,80,81}*.test.ts` | Regressão |
| `src/i18n/messages/*.json` | Ajustes pontuais se keys quebrarem chrome |

### How

1. Gate on 0079–0081 tests.
2. Snapshot current PRIMARY list into archive provenance.
3. Edit PRIMARY_SIDEBAR_ITEMS; update presets.
4. Fix tests systematically via rg hit list.
5. Palette/i18n/docs.
6. Run typecheck + lint + targeted tests.

### Why

Content without chrome cutover leaves dual mental models. Archive-not-delete protects prefs and history.

---

## ⛔ Anti-Hallucination Guardrails

> [!CAUTION]
> DO NOT drop leaves before 0079–0081 redirects work.  
> DO NOT remove hideable analytics/costs ids.  
> DO NOT delete analytics/costs route modules (redirect shells stay).  
> DO NOT add Tools/Playground/Translator primary leaves to “fill” budget.  
> DO NOT claim length without measuring live array after edit.

> [!IMPORTANT]
> Update every test that freezes length 9 + analytics/costs presence — **including residual 0075–0077 tests**.  
> Provenance is mandatory (UI.md invariant 5).  
> Sole owner of **live** primary chrome docs post-cutover.  
> Product routes orthogonal to fusion chips 0071/0077; leaf-count SSoT is this task.

---

## 🛡️ Compliance Checklist (Leis Primárias do AGENTS.md)

- [x] **Doc Accuracy**: Live dump matches docs tables (review path-to-100 flipped planned status banners)
- [x] **Zod Validation**: N/A
- [x] **Security**: No secrets
- [x] **Error Sanitization**: N/A
- [x] **No Raw SQL**: N/A
- [x] **Archive Protocol**: Provenance under `.archive/sidebar/`

---

## 📋 Completion Evidence (preenchido pelo agente executor)

- **Arquivos criados/modificados**:
  - `src/shared/constants/sidebarVisibility.ts` — drop analytics/costs primary; 7 leaves; presets; subtitles
  - `src/shared/constants/epic19Rebalance.ts` — comments: target chrome is live after 0082
  - `src/shared/components/CommandPalette.tsx` — `epic19HubExtras` deep-links to Dashboard/Providers/Observe builders
  - `src/i18n/messages/en.json` — palette/storytelling subtitle keys for retired surfaces
  - `docs/guides/UI.md` — §2 Primary chrome (live) flipped to 7 leaves
  - `docs/architecture/NAV-TREE-TARGET.md` — §2 Live chrome L0 flipped to 7 leaves
  - `.archive/sidebar/2026-07-19-epic19-analytics-costs-cutover/{PROVENANCE,SNAPSHOT}.md`
  - `.archive/PROVENANCE-INDEX.md` — index row
  - Tests: `tests/unit/ui/epic19-sidebar-cutover-0082.test.ts` (+ rewrites of residual length-9 / primary-presence suites)
- **PRIMARY_SIDEBAR_ITEMS dump** (id + href per line):
  ```
  home /home
  providers /dashboard/providers
  combos /dashboard/combos
  activity /dashboard/activity
  operations /dashboard/operations
  settings-general /dashboard/settings/general
  docs /docs
  len 7
  ```
- **Testes que verificam o trabalho**:
  - `tests/unit/ui/epic19-sidebar-cutover-0082.test.ts` (SSoT leaf contract)
  - `tests/unit/ui/epic19-rebalance-matrix-0078.test.ts` … `0081` (redirect matrix regression)
  - Residual rewrites: `sidebar-visibility`, `sidebar-flat-primary-nav`, `sidebar-costs-section`, `sidebar-engine-items`, `sidebar-quota-share-placement`, `sidebar-back-compat`, `testing-hub-discoverability-0060`, `observe-settings-ia-gaps-0061`, `sidebar-naming-i18n`, `dashboard-ia-consolidation-0056`, plus 0075–0077 anti-leaf suites
- **Resultado dos testes**: **255/255 pass** on targeted suite (`node --import tsx/esm --test` list above); 0 forever-9 pins remaining in unit tests
- **Resultado do lint**: `eslint` clean on touched production files (`sidebarVisibility.ts`, `epic19Rebalance.ts`, `CommandPalette.tsx`)
- **Resultado do typecheck/build**: `npm run typecheck:core` — clean
- **Provenance path**: `.archive/sidebar/2026-07-19-epic19-analytics-costs-cutover/`
- **Agente executor**: gt-ts-engineer (frontend IA) / builders
- **Data de conclusão**: 2026-07-19

---

## 🔍 Review Trail (preenchido pelo reviewer)

- **Reviewer**: independent `reviewers` (Frontend Quality Reviewer) — builder claims untrusted
- **Data da review**: 2026-07-19 (independent FULL re-review)
- **Veredito**: `ACCEPT`
- **Score (path to 100)**: initial **92** → path-to-100 **100/100**
- **Notas**:
  - Live PRIMARY dump re-measured: 7 ids; hideable + palette builders + provenance **PASS**
  - Independent blocker: NAV-TREE §3 still listed Analytics/Costs as **L0 Live hub** (dual mental model vs §2) — **closed** this review (demote + renumber L0 5–7; Dashboard L1 story tabs)
  - Comment dual-nav destinations + PROVENANCE path + unit anti-L0 guards
  - epic19 cluster **126/126** post path-to-100
- **Se REJEITADO**: N/A
- **Full report**: `docs/reports/reviews/2026-07-19-task-0082-epic19-sidebar-cutover-independent-rereview.md`

## Review Ledger

### Latest Review
- **Date**: 2026-07-19
- **Reviewer profile**: `reviewers` (independent adversarial)
- **Score**: `100/100` (initial 92 → path-to-100)
- **Verdict**: `ACCEPT`
- **Blockers**: none (IR1 NAV-TREE dual L0 closed this review)
- **Full report**: `docs/reports/reviews/2026-07-19-task-0082-epic19-sidebar-cutover-independent-rereview.md`
- **Lane outcome**: stay `03-review/`

### Previous Reports
- `docs/reports/reviews/2026-07-19-task-0082-epic19-sidebar-drop-analytics-costs-frontend-quality-review.md` (builders 95→100)
