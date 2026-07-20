# Task 0083: EPIC-19 T19-F — Tools → Operations Verify-Only (No New Primary Leaf)

> **Status**: `[x]` Implemented — independent re-review **100/100 ACCEPT** (lane `03-review`; agentID=`reviewers`)
> **Priority**: 🟡 P1
> **Type**: `verification`
> **Action type**: UX_VIS (verify) + docs honesty
> **Origin**: EPIC-19 §2.4 Tools → Operations interim; wave3 audit A1–A5 (labs not primary; Testing under Ops Integrations; no-new-leaf); `operationsHub.ts` + `testingHub.ts`
> **Blocks**: none
> **Depends on**: soft after **0082** (cleaner primary chrome to verify against); **soft-depends 0078** (re-run / land Tools interim docs after 0078 planned section green so prose does not race)
> **Parallel class**: `parallel-safe` (docs/verify; no product chrome redesign required) after 0078 docs section exists
> **Review routing**: independent; can ship as docs+test-only PR
> **Doc section lock**: own **only** UI.md / NAV-TREE paragraph `## Tools → Operations (interim)` (or equivalent Tools interim honesty). **No** leaf tables, **no** reverse-chrome, **no** EPIC-19 planned/live primary dumps.

---

## Objective

**Verify-only** that operator decision “Tools → Operations for now” holds in live code after EPIC-19 chrome moves:

1. Playground / Translator / Search Tools / Batch / Media lab remain discoverable via **Operations → Testing** (and palette), **not** as primary sidebar leaves.
2. **No orphan Tools leaf** appears in `PRIMARY_SIDEBAR_ITEMS` or `DEVTOOLS_ITEMS`.
3. **0 new primary leaves** for Translator/Playground/Search Tools as part of EPIC-19.
4. Docs (UI.md / NAV-TREE / Epic success metrics) state Tools interim home honestly.
5. If discoverability regressed during 0079–0082 (e.g. Testing card removed), **file a residual note** — do not invent a Labs primary leaf; optional minimal fix limited to restoring Ops→Testing link.

**Done when:** binary test suite asserts hub inventory + primary absence + docs cite; Completion Evidence records pass/fail table matching wave3 A1–A5 post-rebalance.

---

## Background Context

### O que já existe:

- Testing hub SSoT: `src/shared/constants/testingHub.ts` — hub `/dashboard/testing`; labs `isLab: true` for playground/translator/search-tools; intentionally not sidebar peers.
- Operations hub: `src/shared/constants/operationsHub.ts` — Integrations group includes `testing` → `/dashboard/testing`.
- Primary chrome: no playground/translator/search-tools/testing leaves (`sidebarVisibility.ts`; `DEVTOOLS_ITEMS = []`).
- Hideable ids: `testing`, `translator`, `playground`, `search-tools` retained for prefs.
- Discoverability tests: `tests/unit/ui/operations-hub-discoverability-0059.test.ts`, `tests/unit/ui/testing-hub-discoverability-0060.test.ts`.
- Wave3 audit CONFIRMED A1–A5; REJECT promote three labs as primary.

### O que está faltando / quebrado:

- Epic success metric “Tools labs still discoverable via Operations (not orphaned)” needs post-rebalance verification.
- Risk: sidebar/palette edits in 0082 accidentally orphan Testing or re-add lab leaves.
- NAV-TREE may still describe labs under “debug-only” without Operations path after Analytics/Costs cutover.

### Explicitly out of scope:

- Designing future first-class Labs leaf (out of Epic 19; only if operator later asks **and** leaf budget allows).
- Implementing Ops reverse chrome (0076 owns that decision).
- Moving labs under Providers/Observe/Dashboard.
- Product code beyond **minimal** restore of Operations→Testing card if a regression is proven by tests.

### Collision notes:

- **0076** Ops reverse chrome: compatible — Tools stay under Ops; do not re-open D1/D2 debate unless tests fail.
- **0075/0077/0071**: orthogonal fusion chrome.
- Soft after **0082** so primary dump is final.

---

## Dependency & Parallel Safety

| Item | Value |
|------|--------|
| **Depends on** | Soft: **0082** complete for final chrome; **soft-depends 0078** for Tools interim docs alignment; can run baseline verify earlier but re-check after 0078/0082 |
| **Blocks** | none |
| **File ownership** | Prefer: tests `tests/unit/ui/epic19-tools-ops-verify-0083.test.ts`; docs **only** Tools→Ops interim paragraph; **only if regression** `operationsHub.ts` Testing card restore |
| **Do not touch** | PRIMARY_SIDEBAR_ITEMS shape except read-only asserts; analytics/costs content; fusions; UI.md reverse-chrome (0076); EPIC-19 planned (0078); live primary tables (0082) |
| **parallel-safe** | **Yes** for verify/docs after 0078 section exists; serial only if fixing a proven hub regression |

---

## Test Requirements

- DEVE assertir `OPERATIONS_HUB_HREFS` (or group links) includes `/dashboard/testing`
- DEVE assertir `TESTING_HUB_HREFS` includes `/dashboard/playground`, `/dashboard/translator`, `/dashboard/search-tools`
- DEVE assertir `PRIMARY_SIDEBAR_ITEM_IDS` excludes `playground`, `translator`, `search-tools`, `testing`, and any new `tools`/`labs` id
- DEVE assertir `DEVTOOLS_ITEMS` still does not list the three labs as default chrome (empty or non-lab)
- DEVE assertir hideable ids still include testing + three labs (archive-not-delete prefs)
- DEVE document in UI.md (or verify existing prose) under **Tools→Ops interim only** that Tools interim home is Operations → Testing — **no** primary Tools leaf from EPIC-19
- NÃO DEVE rewrite leaf tables / planned / live primary chrome / reverse-chrome sections
- NÃO DEVE adicionar primary leaf even if operator discoverability pain remains (product decision = verify + optional copy, not leaf)

---

## Exit Conditions (GDD/TDD)

- [x] Verification unit test file green: `node --import tsx/esm --test tests/unit/ui/epic19-tools-ops-verify-0083.test.ts` (or extend 0059/0060 with EPIC-19 section — record path)
- [x] Existing 0059/0060 discoverability tests still pass
- [x] Docs honesty: UI.md and/or NAV-TREE **Tools→Ops interim paragraph only** post-EPIC-19 (no leaf tables)
- [x] If regression found: minimal restore **or** residual blocker filed in Completion Evidence (do not invent Labs leaf)
- [x] `npm run typecheck:core` passa sem erros
- [x] `npm run lint` passa sem erros novos nos arquivos tocados
- [x] Completion Evidence includes A1–A5 re-check table (PASS/FAIL)
- [x] Completion Evidence preenchido antes de `03-review/`

---

## Details

### What

Subtasks:

- [x] **Ler código existente**: Epic §2.4; wave3 §A; `operationsHub.ts`; `testingHub.ts`; `sidebarVisibility.ts` primary + hideable + DEVTOOLS; 0059/0060 tests; CommandPalette lab injection; UI.md tools-related sections; post-0082 PRIMARY dump if available
- [x] Write/extend verification tests (hub inventory + anti-leaf)
- [x] Run tests; if fail, diagnose 0082/prior regression
- [x] Docs touch for Tools interim honesty only
- [x] Optional minimal hub restore if Testing card missing
- [x] **Refactoring pass**: keep verify tests declarative (href lists from SSoT imports)
- [x] **Verificação de regressão**: 0083 + 0059 + 0060 + typecheck:core + lint

### Where

| Arquivo | Propósito |
|---------|-----------|
| `src/shared/constants/operationsHub.ts` | Ler (+ fix only if Testing link missing) |
| `src/shared/constants/testingHub.ts` | Ler — lab inventory |
| `src/shared/constants/sidebarVisibility.ts` | Ler — anti-leaf asserts |
| `tests/unit/ui/operations-hub-discoverability-0059.test.ts` | Ler / regressão |
| `tests/unit/ui/testing-hub-discoverability-0060.test.ts` | Ler / regressão |
| `tests/unit/ui/epic19-tools-ops-verify-0083.test.ts` | Criar (preferred) |
| `docs/guides/UI.md` | Verificar/atualizar **Tools→Ops interim paragraph only** |
| `docs/architecture/NAV-TREE-TARGET.md` | Verificar Tools/Ops note only (no L0 leaf rewrite) |
| `docs/tasks/00-planning/EPIC-19-…md` | Ler success metrics §7 |

### How

1. Import SSoT constants in a pure unit test.
2. Assert Operations includes Testing; Testing includes three labs; primary excludes them.
3. Align docs one paragraph with Epic §2.4.
4. If 0082 removed Testing from Ops hub by mistake, restore the card only.

### Why

EPIC-19 frees Analytics/Costs leaves but **must not** spend budget on Tools primary peers. Verify-only closes the success metric without scope creep.

---

## ⛔ Anti-Hallucination Guardrails

> [!CAUTION]
> DO NOT add a Tools/Labs/Testing primary sidebar leaf.  
> DO NOT re-list playground/translator/search-tools under DEVTOOLS as default chrome.  
> DO NOT “fix” discoverability by dual-nav (sidebar + hub) for labs.  
> DO NOT expand into 0076 reverse-chrome implementation unless already decided there.

> [!IMPORTANT]
> This is **verification** first. Product code only for proven regression restore.  
> Cite wave3 A1–A5 + Epic §2.4 in Completion Evidence.  
> Soft-after 0082 preferred for final primary dump; soft-depends 0078 for docs honesty.  
> Do not touch EPIC-19 planned/live primary tables or reverse-chrome.

---

## 🛡️ Compliance Checklist (Leis Primárias do AGENTS.md)

- [x] **Doc Accuracy**: Hub hrefs grepped/imported from SSoT
- [x] **Zod Validation**: N/A
- [x] **Security**: No secrets
- [x] **Error Sanitization**: N/A
- [x] **No Raw SQL**: N/A
- [x] **Archive Protocol**: No deletes

---

## 📋 Completion Evidence (preenchido pelo agente executor)

- **Arquivos criados/modificados**:
  - **CREATE** `tests/unit/ui/epic19-tools-ops-verify-0083.test.ts` — wave3 A1–A5 + hub/palette/docs contracts (SSoT imports)
  - **UPDATE** `docs/guides/UI.md` — add owned section `## Tools → Operations (interim)` only (no leaf tables / reverse-chrome / planned dumps)
  - **UPDATE** `docs/architecture/NAV-TREE-TARGET.md` — Labs/tools discovery note: **Operations → Testing** path (not debug-only orphan wording)
  - **No product code** — `operationsHub.ts` / `testingHub.ts` / `sidebarVisibility.ts` already correct post-0082
- **A1–A5 re-check table** (wave3 §A, post-0082 rebalance):

  | # | Claim | Live evidence | Verdict |
  |---|-------|---------------|---------|
  | A1 | Translator / Playground / Search Tools **not** on primary sidebar | `PRIMARY_SIDEBAR_ITEM_IDS` length 7; ids exclude lab set; `EPIC19_FORBIDDEN_PRIMARY_LEAF_IDS` | **PASS** |
  | A2 | Labs live on Testing hub + palette (+ direct URL); not as Ops chrome peers | `TESTING_HUB_HREFS` includes 3 lab hrefs; interactive `isLab: true`; CommandPalette hrefs | **PASS** |
  | A3 | Testing hub reached via Operations → Integrations | `OPERATIONS_HUB_HREFS` includes `/dashboard/testing`; integrations group link `id: "testing"` | **PASS** |
  | A4 | Testing hub is **not** a primary sidebar leaf | `PRIMARY` excludes `testing`; hideable retains `testing` | **PASS** |
  | A5 | Promoting labs to new primary leaf violates no-new-leaf | Docs § Tools→Ops interim + tests forbid `tools`/`labs`/3 labs/`testing` primary; DEVTOOLS empty | **PASS** |

- **Testes que verificam o trabalho**:
  - `tests/unit/ui/epic19-tools-ops-verify-0083.test.ts` (preferred path)
  - Regression: `tests/unit/ui/operations-hub-discoverability-0059.test.ts`
  - Regression: `tests/unit/ui/testing-hub-discoverability-0060.test.ts`
- **Resultado dos testes**:
  ```text
  node --import tsx/esm --test \
    tests/unit/ui/epic19-tools-ops-verify-0083.test.ts \
    tests/unit/ui/operations-hub-discoverability-0059.test.ts \
    tests/unit/ui/testing-hub-discoverability-0060.test.ts
  # tests 35 · pass 35 · fail 0
  ```
- **Resultado do lint**: `npx eslint tests/unit/ui/epic19-tools-ops-verify-0083.test.ts` — exit 0 (no new errors)
- **Resultado do typecheck/build**: `npm run typecheck:core` — exit 0
- **Regressions found / fixes**: **None.** Operations→Testing card present; DEVTOOLS still `[]`; no primary Tools/Labs leaf after 0082. Residual (product, not defect): Testing remains one hop under Ops Integrations (wave3 A3 INCLUDE discoverability polish — out of 0083; do **not** invent Labs primary leaf).
- **Agente executor**: gt-ts-engineer (frontend IA verify)
- **Data de conclusão**: 2026-07-19

---

## 🔍 Review Trail (preenchido pelo reviewer)

- **Reviewer**: independent `reviewers` (Frontend Quality Reviewer) — builder claims untrusted
- **Data da review**: 2026-07-19 (independent FULL re-review)
- **Veredito**: `ACCEPT`
- **Score (path to 100)**: **100/100** (no independent product patches required)
- **Notas**:
  - Live A1–A5 re-check PASS; PRIMARY 7; Ops→Testing; Testing hub 3 labs `isLab`; DEVTOOLS empty; hideable + `testingHubExtras`.
  - UI.md Tools→Ops interim + NAV-TREE Operations → Testing honesty PASS.
  - 0059+0060+0083 green within epic19 cluster 126/126.
  - Residual (not defect): Testing one hop under Ops Integrations — do **not** invent Labs primary leaf.
  - Full report: `docs/reports/reviews/2026-07-19-task-0083-epic19-tools-ops-verify-independent-rereview.md`
- **Se REJEITADO**: n/a

## Review Ledger

### Latest Review
- **Date**: 2026-07-19
- **Reviewer profile**: `reviewers` (independent adversarial)
- **Score**: `100/100`
- **Verdict**: `ACCEPT`
- **Blockers**: none
- **Full report**: `docs/reports/reviews/2026-07-19-task-0083-epic19-tools-ops-verify-independent-rereview.md`
- **Lane outcome**: stay `03-review/`

### Previous Reports
- `docs/reports/reviews/2026-07-19-task-0083-omniroute-epic19-tools-ops-verify-frontend-quality-review.md` (builders 96→100)
