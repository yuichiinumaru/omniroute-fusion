# Task 0077: Fusions List Acting Chip + NAV-TREE Labs / Home Label Drift

> **Status**: `[R]` In review (frontend-quality ACCEPT 100 → 03-review 2026-07-19)
> **Priority**: 🟢 P2
> **Type**: `remediation`
> **Action type**: UX_VIS + DOC
> **Origin**: EPIC-13 Frontend IA Residual Polish — H-FUSION-010 + doc residual X1/X2; Wave 2 residual report; fusion residual audit
> **Blocks**: none
> **Depends on**: none hard (Epic 0004 acting unit + fusions list shell 0015 completed)
> **Parallel class**: `parallel-safe` vs 0075 **if** this task only edits list `fusions/page.tsx` (not `FusionEditorClient`); `parallel-safe` vs 0076 **if** UI.md reverse-chrome section is left to 0076; **section-locked** vs 0078/0082 on NAV-TREE (see Doc section ownership)
> **Review routing**: independent (list discoverability + labs docs); bundle with 0075 only if same PR touches both list and editor
> **Sole owner**: H-FUSION-010 list acting chip + unit tests on `fusions/page.tsx` (**0071 is FUSION.md-only** — see collision note)

---

## Objective

Close two small residual polish items without growing the sidebar:

1. **H-FUSION-010 — Fusions list acting discoverability (SOLE OWNER):** list cards show strategy badge + panel count only. Acting unit exists in editor (`data-testid="fusion-acting"`) and runtime types (`ComboRecord.acting`) but list local `FusionCombo` type **omits** `acting`, so operators cannot see “has acting / acting label” without opening the editor. **0071 must not re-implement this chip.**

2. **Doc drift — NAV-TREE labs / Home label only:** `docs/architecture/NAV-TREE-TARGET.md` still claims **Debug-only** labs (translator, playground, search-tools) when live `DEVTOOLS_ITEMS = []` and Task 0060 absence tests pass. Also align Home vs live **Dashboard** labelFallback if still wrong in NAV-TREE.

**Done when:**

- List cards surface a compact acting chip/badge when `combo.acting` is present (and a stable empty/legacy state when absent — optional quiet omit is OK).
- Unit tests cover list type/path + chip presence logic (and/or static source asserts that list consumes `acting`).
- NAV-TREE **labs/DEVTOOLS wording + Home/Dashboard label** match code; **do not** rewrite full L0 primary leaf table if EPIC-19 tasks **0078/0082** are open (leave planned/live L0 to them).
- **Zero** new sidebar leaves (anti-new-leaf asserts — **not** absolute `length === 9` forever).

---

## Background Context

### O que já existe:

- Editor acting UI: `FusionUnitsSections.tsx` (`data-testid="fusion-acting"`), `fusionEditorTypes.ts` (`acting` on form/record).
- Runtime/tests: `fusion-acting` unit coverage (resolve/handoff) — correctness already closed; this is **list UX** only.
- List shell: `fusions/page.tsx` — local `FusionCombo` without `acting`; cards render name, description, strategy badge, `panelCount(models)`, Edit/Delete.
- Live chrome SSoT: `PRIMARY_SIDEBAR_ITEMS` — home labelFallback `"Dashboard"`, `i18nKey: "dashboard"`.
- `DEVTOOLS_ITEMS: readonly SidebarItemDefinition[] = []` in `sidebarVisibility.ts`.
- Labs discovery: Testing hub + CommandPalette (0060).
- EPIC-19 (**0078** planned L0, **0082** live L0 after leaf drop) owns primary chrome tables — **not this task**.

### O que está faltando / quebrado:

- H-FUSION-010: list omits acting display (Wave 2 §5).
- X1: NAV-TREE-TARGET §2 “Debug-only: translator, playground, search-tools” conflicts with empty DEVTOOLS + 0060.
- X2: NAV-TREE “Home” label vs live “Dashboard” (prefer aligning NAV-TREE **label** to code `labelFallback`).

### Explicitly out of scope:

- Changing acting runtime resolution or API schemas (unless list needs a pure display helper already exported).
- Mounting RoutingHubSubnav on editor (→ **0075**).
- Ops/Testing reverse chrome decision (→ **0076**).
- Full NAV-TREE L0 primary leaf table rewrite / Analytics+Costs retire (→ **0078** planned, **0082** live).
- Freezing absolute `PRIMARY_SIDEBAR_ITEMS.length === 9` as permanent law (→ **0082** owns post-cutover length/id contract).
- New sidebar leaves, re-adding DEVTOOLS lab items, theme work.
- FUSION.md operator residual notes (→ **0071**).

---

## Doc section ownership (NAV-TREE / UI.md)

| Doc section | Owner |
|-------------|--------|
| NAV-TREE **DEVTOOLS/labs wording** + Home/Dashboard **label** residual | **0077** (this task) |
| NAV-TREE full L0 primary leaf table (live = 9 pre-cutover) | **Skip if 0078/0082 open** — leave to 0078 planned + 0082 live |
| NAV-TREE `## EPIC-19 target` / planned L0–L1 | **0078** |
| NAV-TREE live primary after leaf drop | **0082** |
| UI.md reverse chrome / Ops-Testing launchpad | **0076** |
| UI.md `## EPIC-19 IA rebalance (planned)` | **0078** |
| UI.md live primary table post-cutover | **0082** |

**Rule:** If EPIC-19 is open: **skip full L0 leaf-count table** in NAV-TREE; only patch labs/DEVTOOLS + Dashboard label lines.

---

## Dependency & Parallel Safety

| Item | Value |
|------|--------|
| **Depends on** | none |
| **Blocks** | none |
| **File ownership** | `fusions/page.tsx` list types + card UI; optional small pure helper in `fusionEditorTypes.ts` for acting label; **NAV-TREE labs/DEVTOOLS + label lines only**; tests under `tests/unit/` for list acting display |
| **Do not touch** | `FusionEditorClient.tsx` (0075); ops/testing destination pages (0076); full NAV-TREE L0 primary dump if 0078/0082 open; do not expand `DEVTOOLS_ITEMS`; do not pin absolute length 9 in tests forever |
| **Docs split** | 0077 owns NAV-TREE labs residual only; 0076 owns UI.md reverse-chrome; 0078 owns EPIC-19 planned; 0082 owns live chrome post-drop |
| **parallel-safe** | Yes with ownership above; shared chrome SSoT serial-sensitive (leaf count tests → 0082) |

---

## Test Requirements

### Product (acting chip) — sole owner

- DEVE estender o tipo de listagem para incluir `acting` (inline type **or** reuse `ComboRecord` / shared type from `fusionEditorTypes` — prefer shared to avoid dual type drift).
- DEVE renderizar chip/badge no card quando `acting` está configurado (model id / combo-ref name / short “Acting” label). Prefer `data-testid="fusion-list-acting"` (or equivalent stable test id) for assertions.
- DEVE **não** quebrar cards sem acting (omit chip or show quiet legacy — no layout crash).
- DEVE ter teste unitário:
  - static source: list page references `acting` in type and render path; **or**
  - pure helper tests for label formatting if extracted.
- NÃO DEVE inventar fake acting data in production code paths.

### Docs (NAV-TREE labs residual only)

- DEVE atualizar `docs/architecture/NAV-TREE-TARGET.md` **labs/DEVTOOLS wording**:
  - Remove or rewrite “Debug-only: translator, playground, search-tools” as sidebar items — labs are **hub/palette/direct URL only** post-0060; `DEVTOOLS_ITEMS = []`.
  - Home/Dashboard label matches `labelFallback: "Dashboard"` (or document i18nKey + fallback accurately).
- DEVE **NÃO** reescrever a full L0 primary leaf-count table if 0078/0082 are open (leave planned/live tables to those tasks). If EPIC-19 not yet open and you must touch live chrome prose: state “live chrome matches code at ship time; post-0082 expect no analytics/costs peers” — **do not** freeze “live chrome = 9 leaves forever.”
- DEVE existir asserção de teste (preferred) **or** docs-sync green:
  - Prefer a small unit test that `DEVTOOLS_ITEMS` length is 0 (already may exist in 0060 — keep green) and that NAV-TREE no longer contains the stale “Debug-only: translator, playground” claim as sidebar chrome.

### Anti-new-leaf (NOT absolute length === 9)

- DEVE assertir **no** primary ids for labs: `fusions`, `playground`, `translator`, `search-tools` are **not** in `PRIMARY_SIDEBAR_ITEM_IDS`.
- DEVE assertir `DEVTOOLS_ITEMS` remains empty (or non-lab).
- **NÃO DEVE** pin `PRIMARY_SIDEBAR_ITEMS.length === 9` as a permanent contract — post-0082 length is re-measured (target ~7 product + docs). Absolute length/id membership after EPIC-19 cutover is owned by **0082**. Optional soft bound: length ∈ {pre-cutover snapshot, post-0082 measured} without hardcoding forever-9.

---

## Exit Conditions (GDD/TDD)

- [x] Fusions list type includes `acting` from API payload path (no silent drop)
- [x] List card shows acting chip/badge when acting present; safe when absent
- [x] Unit test(s) for list acting display path (source matrix and/or helper) — **this task owns them**
- [x] `NAV-TREE-TARGET.md` labs/DEVTOOLS + Dashboard label fixed; full L0 table skipped if 0078/0082 open
- [x] Doc/sabotage test or existing 0060 absence suite still proves labs not in sidebar
- [x] Anti-new-leaf: no `fusions`/`playground`/`translator`/`search-tools` primary; `DEVTOOLS_ITEMS` empty — **no** forever-`length===9` pin
- [x] `node --import tsx/esm --test` on new/updated unit file(s) + relevant 0060/0025 suites passa com 0 falhas
- [x] `npm run typecheck:core` passa sem erros
- [x] `npm run lint` passa sem erros novos nos arquivos tocados
- [x] Entrada no `CHANGELOG.md` no TOPO (list acting chip + NAV-TREE labs sync)
- [x] Completion Evidence preenchido antes de `03-review/`

---

## Details

### What

Subtasks:

- [ ] **Ler código existente** (obrigatório primeiro):
  - `src/app/(dashboard)/dashboard/fusions/page.tsx`
  - `src/app/(dashboard)/dashboard/fusions/fusionEditorTypes.ts` (`ComboRecord.acting`, `normalizeFusionUnit`, `filterFusionCombos`)
  - `src/app/(dashboard)/dashboard/fusions/FusionUnitsSections.tsx` (acting card patterns — visual cue only)
  - `src/shared/constants/sidebarVisibility.ts` (`PRIMARY_SIDEBAR_ITEMS`, `DEVTOOLS_ITEMS`)
  - `docs/architecture/NAV-TREE-TARGET.md` labs/label lines only
  - `docs/guides/UI.md` §2.1 (read-only align — do not edit reverse-chrome or EPIC-19 sections)
  - Wave 2 §5 H-FUSION-010 + §4.4 / X1/X2
  - `tests/unit/ui/testing-hub-discoverability-0060.test.ts` (absence patterns)
  - Status of 0078/0082 before any NAV-TREE L0 edit
- [ ] Extend list type + render acting chip (minimal Badge/span; reuse status vocabulary only if already natural).
- [ ] Optional pure helper `formatFusionActingLabel(acting): string | null` in `fusionEditorTypes.ts` for testability.
- [ ] Fix NAV-TREE labs + Dashboard label only; lastUpdated date if needed.
- [ ] Tests: list acting + anti-new-leaf (not absolute 9) + optional doc string guards.
- [ ] **Refactoring pass**: no giant card redesign; chip only.
- [ ] **Verificação de regressão**: Exit Conditions commands.

### Where

| Arquivo | Propósito |
|---------|-----------|
| `src/app/(dashboard)/dashboard/fusions/page.tsx` | **Modificar** — type + chip UI (sole product owner) |
| `src/app/(dashboard)/dashboard/fusions/fusionEditorTypes.ts` | Ler / opcional helper export |
| `src/app/(dashboard)/dashboard/fusions/FusionUnitsSections.tsx` | Ler — acting copy patterns only |
| `src/shared/components/Badge.tsx` | Ler — reuse if fits |
| `src/shared/constants/sidebarVisibility.ts` | Ler — anti-new-leaf + DEVTOOLS asserts |
| `docs/architecture/NAV-TREE-TARGET.md` | Modificar — **labs/DEVTOOLS + label only**; skip full L0 if EPIC-19 open |
| `docs/guides/UI.md` | Ler only — do not touch reverse-chrome (0076) or EPIC-19 (0078/0082) |
| `tests/unit/ui/fusions-list-acting-0077.test.ts` | Criar — list acting + anti-new-leaf (no forever-9) |
| `tests/unit/ui/testing-hub-discoverability-0060.test.ts` | Ler — keep green |
| `CHANGELOG.md` | Entrada Unreleased |
| Wave 2 report + EPIC-13 + fusion residual audit | Evidence |

### How

1. Read list page + types; confirm `acting` omitted from local type.
2. Prefer typing list items as `Pick<ComboRecord, …>` or extend `FusionCombo` with `acting?: unknown` / normalized unit.
3. Add compact chip next to strategy badge or under panel count:
   - model unit → short model string
   - combo-ref → combo name
   - missing → no chip
4. Write unit test file with source asserts (`page.tsx` includes `acting` and `fusion-list-acting` or helper tests) + anti-new-leaf (no fusions/playground/translator/search-tools primary).
5. Edit NAV-TREE labs/label residual only; if EPIC-19 open, **skip** full primary leaf table.
6. Run tests + typecheck + lint.
7. CHANGELOG + Completion Evidence.

### Why

Acting is a first-class fusion unit (Epic 0004). Hiding it on the list forces every “who has final voice?” check into the editor. Doc drift about debug labs causes the next agent to reintroduce DEVTOOLS items as a “fix.” Batch review F-1/C-02: sole chip owner + section-locked NAV-TREE prevents thrash with 0071/0078/0082.

---

## ⛔ Anti-Hallucination Guardrails

> [!CAUTION]
> DO NOT re-populate `DEVTOOLS_ITEMS` with playground/translator/search-tools.
> DO NOT add a Fusions primary sidebar leaf.
> DO NOT claim acting works at runtime from list-only UI work — runtime is already covered elsewhere; this is discoverability.
> DO NOT edit `FusionEditorClient` under this task (0075 ownership).
> DO NOT pin `PRIMARY_SIDEBAR_ITEMS.length === 9` as permanent law (0082 owns post-cutover length).
> DO NOT rewrite full NAV-TREE L0 primary table while 0078/0082 are open.
> DO NOT touch :21000 production.

> [!IMPORTANT]
> Verify every NAV-TREE claim with live `sidebarVisibility.ts` dumps/greps before writing.
> List chip must tolerate missing/null acting without errors.
> Prefer shared types over a second divergent `FusionCombo` shape.
> 0071 is docs-only for FUSION.md — do not dual-edit chip with 0071.

---

## 🛡️ Compliance Checklist (Leis Primárias do AGENTS.md)

- [ ] **Doc Accuracy**: NAV-TREE claims grepped against code; section locks respected
- [ ] **Zod Validation**: N/A for display-only (no new API inputs)
- [ ] **Security**: No secrets
- [ ] **Error Sanitization**: N/A
- [ ] **No Raw SQL**: N/A
- [ ] **Archive Protocol**: No capability deletion
- [ ] **No-new-leaf**: anti-leaf asserts; empty DEVTOOLS; absolute length owned by 0082

---

## 📋 Completion Evidence (preenchido pelo agente executor)

- **Arquivos criados/modificados**:
  - `src/app/(dashboard)/dashboard/fusions/page.tsx` — `FusionCombo` = `Pick<ComboRecord, …|acting>`; `formatFusionActingLabel` chip `data-testid="fusion-list-acting"`
  - `src/app/(dashboard)/dashboard/fusions/fusionEditorTypes.ts` — export `formatFusionActingLabel`
  - `tests/unit/ui/fusions-list-acting-0077.test.ts` — helper + list source + anti-new-leaf + NAV-TREE guard
  - `docs/architecture/NAV-TREE-TARGET.md` — labs/DEVTOOLS wording + Dashboard label (labs residual only)
  - `CHANGELOG.md` — Unreleased Added/Changed entries
- **Testes que verificam o trabalho**:
  - `node --import tsx/esm --test tests/unit/ui/fusions-list-acting-0077.test.ts` → **9/9 pass**
  - `node --import tsx/esm --test tests/unit/ui/testing-hub-discoverability-0060.test.ts` → **14/14 pass**
- **Resultado dos testes**: 0 falhas
- **Resultado do lint**: `npx eslint` on touched TS files → exit 0
- **Resultado do typecheck/build**: `npm run typecheck:core` → exit 0
- **Entrada no changelog**: Unreleased — Added list acting chip; Changed NAV-TREE labs residual
- **NAV-TREE L0 table skipped?** yes (0078 in 02-doing, 0082 in 01-open) — only labs/DEVTOOLS + Dashboard label patched
- **Agente executor**: gt-ts-engineer (frontend + docs)
- **Data de conclusão**: 2026-07-19

---

## 🔍 Review Trail (preenchido pelo reviewer)

- **Reviewer**: independent Frontend Quality (`reviewers`) — full re-review
- **Data da review**: 2026-07-19
- **Veredito**: APROVADO
- **Score (path to 100)**: 100/100
- **Notas**: Chip + helper + NAV-TREE labs residual reconfirmed. Live API returns acting; `:22000` list chunk still pre-chip (deploy lag). Path-to-100: groups icon aria-hidden + weight-bearing API helper case. Stay 03-review.
- **Se REJEITADO**: mover para `02-doing/` com motivo no topo.

---

## Review Ledger

> [!IMPORTANT]
> Before path-to-100 work, read the latest full report and all reports listed
> under Previous Reports.

### Latest Review

- **Date**: 2026-07-19
- **Reviewer profile**: independent Frontend Quality (`reviewers`)
- **Score**: `100/100`
- **Verdict**: `ACCEPTED_100`
- **Full report**: `docs/reports/reviews/2026-07-19-task-0077-fusions-list-acting-chip-nav-docs-independent-rereview.md`
- **Lane outcome**: stay `docs/tasks/03-review/` (ACCEPT 100/100)
- **Task reference**: Task 0077 (`omniroute-fusions-list-acting-chip-nav-docs`); live path `docs/tasks/03-review/0077-omniroute-fusions-list-acting-chip-nav-docs.md`

#### Current Open Blockers

- none (product). External: redeploy `:22000` to surface list chip.

#### Path-to-100 Summary

- Meta-row groups icon `aria-hidden`; helper test for live API `{kind,comboName,weight}` shape.

### Previous Reports

- `docs/reports/reviews/2026-07-19-task-0077-fusions-list-acting-chip-nav-docs-frontend-quality-review.md` (builders parallel-review, 100/100)
