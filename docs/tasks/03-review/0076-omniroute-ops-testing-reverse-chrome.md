# Task 0076: Operations/Testing Reverse Chrome — Decision + Implement or Document One-Way

> **Status**: `[R]` In review (frontend-quality ACCEPT 100 → 03-review 2026-07-19)

> **Priority**: 🟡 P1
> **Type**: `remediation`
> **Action type**: UX_VIS + HARDEN
> **Origin**: EPIC-13 Frontend IA Residual Polish — R-IA-04 / R-IA-05; Wave 2 residual report; Tasks 0059/0060 Option A; builder learnings 0009 U1
> **Blocks**: none
> **Depends on**: none hard (0059 Operations hub + 0060 Testing hub completed)
> **Parallel class**: `parallel-safe` vs 0075; `serializable` vs 0077 **only if** both edit `docs/guides/UI.md` (0076 owns **only** reverse-chrome / hub launchpad section of UI.md — 0077 must not rewrite that section); product routes orthogonal to EPIC-19 but **shared chrome SSoT serial-sensitive**
> **Review routing**: independent (Ops/Testing chrome + IA docs)
> **Doc section lock**: UI.md `## Hub reverse chrome` / Ops-Testing launchpad policy **only**. Do **not** touch EPIC-19 planned (`## EPIC-19 IA rebalance (planned)` → 0078), live primary tables (`## Primary chrome (live)` → 0082), or Tools→Ops interim paragraph (→ 0083).

---

## Objective

Close the **one-way hub** residual for Operations and Testing: after jumping from the hub card grid to a destination peer (e.g. `/dashboard/api-manager`, `/dashboard/playground`), the operator has **no reverse strip / “Back to hub” chrome**.

This is **not** dual-nav (no competing shells). It **is** the 0009 U1 class when product intent is unclear: Option A “hub is launchpad only” vs “hub remains L1 forever via reverse chrome.”

**Done when one binary product decision is recorded and encoded in tests:**

| Decision | Product outcome | Test contract |
|----------|-----------------|---------------|
| **D1 — Intentional one-way (keep Option A)** | Document in `docs/guides/UI.md` that Ops/Testing are **hub-only launchpads**; destinations rely on sidebar primary leaf (Operations) / Operations→Testing cross-link / command palette / browser back | Tests assert **absence** of a multi-peer Ops/Testing subnav component **and** document string/SSoT comment; still assert hub inventory + deep pages exist; optional assert CommandPalette includes hub destinations |
| **D2 — Reverse chrome (minimal)** | Add a shared reverse affordance on **all** hub destination pages: compact “← Operations” / “← Testing” link bar **or** thin hub strip reusing `HUB_SUBNAV_*` | Tests encode **peer-route mount matrix**: every `OPERATIONS_HUB_HREFS` / `TESTING_HUB_HREFS` page mounts reverse chrome pointing at `/dashboard/operations` or `/dashboard/testing` |

Either outcome is valid. **Leaving the ambiguity is not.** Prefer D1 if reverse chrome would bloat ~15+ peer pages without clear operator demand; prefer D2 if product wants hub-as-L1 forever after sidebar lab purge.

**Hard constraint:** **0 new sidebar leaves**. Labs stay out of `DEVTOOLS_ITEMS` / primary chrome (0060 contract).

---

## Background Context

### O que já existe:

- Operations hub: `src/shared/constants/operationsHub.ts` + `OperationsHubClient.tsx` + `/dashboard/operations`.
- Testing hub: `src/shared/constants/testingHub.ts` + `TestingHubClient.tsx` + `/dashboard/testing` (no primary leaf; linked from Operations).
- Discoverability tests: `tests/unit/ui/operations-hub-discoverability-0059.test.ts`, `tests/unit/ui/testing-hub-discoverability-0060.test.ts` — hub href inventory + deep pages exist + lab **absence** from sidebar; **no** reverse-chrome contract.
- Visual SSOT for strips: `hubSubnavStyles.ts` + peers (Routing, Observe, Costs, Providers).
- Precedent for intentional hub-only: DashboardTopbar on `/home` only (Task 0056 F3).

### O que está faltando / quebrado:

- R-IA-04: Operations destinations (api-manager, mcp, cli-code, webhooks, …) have no reverse hub chrome.
- R-IA-05: Testing destinations (playground, translator, batch, plugins, …) same after 0060 removed labs from all sidebar chrome — reverse discovery is hub/palette/URL only.
- Process gap X6: tests encode “deep page exists” more than “chrome continuous.”

### Explicitly out of scope:

- New primary sidebar leaves for labs or Operations children.
- Re-adding translator/playground/search-tools to `DEVTOOLS_ITEMS` (0060 ban).
- Full multi-tab Operations/Testing `PageTabBar` redesign (unless D2 chooses a **minimal** reverse strip — not a second primary IA tree).
- Fusions Routing strip (→ **0075**), list acting chip / NAV-TREE labs doc (→ **0077**).
- R-IA-03 DashboardTopbar (accepted residual unless product reopens).

---

## Dependency & Parallel Safety

| Item | Value |
|------|--------|
| **Depends on** | 0059, 0060 completed |
| **Blocks** | none |
| **File ownership** | Ops/Testing hub constants (comments only if D1); destination pages under operations/testing peer routes if D2; `docs/guides/UI.md` reverse-chrome decision section; tests `operations-hub-discoverability-0059` / `testing-hub-discoverability-0060` or new `ops-testing-reverse-chrome-0076.test.ts` |
| **Do not touch** | `fusions/**` product UI (0075/0077); `RoutingHubSubnav.tsx` link set; `PRIMARY_SIDEBAR_ITEMS` membership (read-only asserts OK) |
| **UI.md ownership** | **0076 owns only** reverse-chrome / hub-only launchpad policy section. Do **not** edit EPIC-19 planned/live primary tables or Tools→Ops verify paragraphs. 0077 may fix NAV-TREE labs only (not UI.md reverse section). |
| **parallel-safe** | Yes vs 0075; careful vs 0077/0078/0082/0083 on docs section locks |

---

## Test Requirements

### Common (both decisions)

- DEVE assertir **anti-new-leaf** (relative — **not** absolute forever-9): `PRIMARY_SIDEBAR_ITEM_IDS` does **not** include `fusions`, `playground`, `translator`, `search-tools`; do **not** pin `PRIMARY_SIDEBAR_ITEMS.length === 9` forever (post-0082 length re-measured by **0082**).
- DEVE manter labs (`playground`, `translator`, `search-tools`) **ausentes** de todo sidebar chrome, incluindo debug (`DEVTOOLS_ITEMS` empty / absence suite 0060 still green).
- DEVE manter hub inventories: all `OPERATIONS_HUB_HREFS` and `TESTING_HUB_HREFS` still listed on hub clients.
- DEVE documentar a decisão **D1 ou D2** em `docs/guides/UI.md` **only under reverse-chrome / hub launchpad section** com data e task id `0076`.

### If D1 (intentional one-way)

- DEVE existir asserção de teste que **nenhum** shared component named like `OperationsHubSubnav` / `TestingHubSubnav` is required on peer pages (or that peers do not mount reverse strip) — encoding intentional absence (anti-phantom for accidental half-implementations).
- DEVE existir parágrafo em UI.md: “Operations/Testing are launchpad hubs; reverse chrome is intentionally omitted; return via primary Operations leaf / Operations→Testing card / CommandPalette / browser history.”
- NÃO DEVE claim em docs que peers “have reverse nav” when they do not.

### If D2 (reverse chrome)

- DEVE montar reverse affordance em **cada** href de `OPERATIONS_HUB_HREFS` (exceto o próprio `/dashboard/operations` se listed) e **cada** `TESTING_HUB_HREFS` peer.
- DEVE usar classes `HUB_SUBNAV_*` **ou** um único shared component (e.g. `HubBackStrip`) — no white-on-primary active pills.
- DEVE existir mount-matrix unit test (Providers 0057 style) looping hub hrefs → page source includes reverse link to hub root.
- DEVE manter Testing **not** as primary sidebar leaf.

---

## Exit Conditions (GDD/TDD)

- [x] Written decision **D1 or D2** recorded in Completion Evidence **and** `docs/guides/UI.md` (IA policy, not just a PR comment)
- [x] If D1: documentation + intentional-absence / hub-only tests green; no half-mounted reverse chrome on a random subset of peers
- [x] If D2: reverse chrome on **all** Operations and Testing hub destinations from SSoT href lists + mount-matrix tests green *(N/A — D1 chosen)*
- [x] Anti-new-leaf: no fusions/playground/translator/search-tools primary; labs still absent from sidebar (0060 suite); **no** forever-`length===9` pin
- [x] Existing 0059 + 0060 discoverability tests still pass (extend, do not gut)
- [x] `node --import tsx/esm --test tests/unit/ui/operations-hub-discoverability-0059.test.ts tests/unit/ui/testing-hub-discoverability-0060.test.ts` (+ any new 0076 file) passa com 0 falhas
- [x] `npm run typecheck:core` passa sem erros
- [x] `npm run lint` passa sem erros novos nos arquivos tocados
- [x] Entrada no `CHANGELOG.md` no TOPO descrevendo a decisão (one-way documented **or** reverse chrome added)
- [x] Completion Evidence preenchido antes de `03-review/`

---

## Details

### What

Subtasks:

- [ ] **Ler código existente** (obrigatório primeiro):
  - `src/shared/constants/operationsHub.ts`
  - `src/shared/constants/testingHub.ts`
  - `src/app/(dashboard)/dashboard/operations/OperationsHubClient.tsx`
  - `src/app/(dashboard)/dashboard/testing/TestingHubClient.tsx`
  - `tests/unit/ui/operations-hub-discoverability-0059.test.ts`
  - `tests/unit/ui/testing-hub-discoverability-0060.test.ts`
  - Sample destination pages: `api-manager`, `mcp`, `playground`, `translator` page.tsx headers
  - `docs/guides/UI.md` §1–3
  - Wave 2 report §3.2, R-IA-04/05, X6
  - Task 0056 F3 hub-only topbar precedent (optional read of return-review)
- [ ] **Product decision D1 vs D2** — pick one; write rationale in Completion Evidence (operator default lean: **D1** unless product asks for reverse strip).
- [ ] Implement D1 docs+tests **or** D2 shared reverse chrome + matrix tests.
- [ ] Guard no-new-leaf + lab absence.
- [ ] **Refactoring pass**: if D2, one shared component — not N copy-pasted banners with divergent classes.
- [ ] **Verificação de regressão**: Exit Conditions commands.

### Where

| Arquivo | Propósito |
|---------|-----------|
| `src/shared/constants/operationsHub.ts` | Ler; comment decision pointer if helpful |
| `src/shared/constants/testingHub.ts` | Ler; comment decision pointer if helpful |
| `src/app/(dashboard)/dashboard/operations/**` | Hub only unless D2 needs shared import site |
| `src/app/(dashboard)/dashboard/testing/**` | Hub only unless D2 |
| Destination pages listed in `OPERATIONS_HUB_HREFS` / `TESTING_HUB_HREFS` | Modificar **only if D2** |
| `src/shared/components/HubBackStrip.tsx` (name flexible) | Criar **only if D2** |
| `src/shared/constants/hubSubnavStyles.ts` | Ler — reuse if D2 |
| `docs/guides/UI.md` | Modificar — **reverse-chrome / hub launchpad section only**; do not touch EPIC-19 planned/live or Tools interim sections |
| `tests/unit/ui/operations-hub-discoverability-0059.test.ts` | Extend |
| `tests/unit/ui/testing-hub-discoverability-0060.test.ts` | Extend |
| `tests/unit/ui/ops-testing-reverse-chrome-0076.test.ts` | Criar opcional |
| `src/shared/constants/sidebarVisibility.ts` | Ler — leaf budget / DEVTOOLS empty asserts |
| `CHANGELOG.md` | Entrada Unreleased |
| Wave 2 residual report + EPIC-13 | Evidence |

### How

1. Read SSoT hub constants and existing discoverability tests.
2. Choose D1 or D2 (document why).
3. **D1 path:**
   - Add UI.md subsection under anti-patterns or hub policy: Operations/Testing launchpad one-way intentional.
   - Extend tests: encode intentional absence of reverse subnav requirement; keep inventory tests.
4. **D2 path:**
   - Create one `HubBackStrip({ hubHref, hubLabel })` using `HUB_SUBNAV_*` shell optional.
   - Mount on every destination page (or thin layout wrappers only if they already exist — do not invent multi-route layouts that pull unrelated trees).
   - Matrix test loops `OPERATIONS_HUB_HREFS` / `TESTING_HUB_HREFS`.
5. Run tests + typecheck + lint.
6. CHANGELOG + Completion Evidence with decision letter.

### Why

After 0060, labs are invisible in the sidebar. Without either reverse chrome or an **explicit** launchpad policy, operators who deep-link or follow a hub card feel stranded — and future agents re-open 0059/0060 as “incomplete” phantom failures. A documented D1 or tested D2 stops the reopen loop.

---

## ⛔ Anti-Hallucination Guardrails

> [!CAUTION]
> DO NOT claim reverse chrome is “done” by mounting it on one peer only (half-matrix = reject).
> DO NOT re-add playground/translator/search-tools to sidebar or DEVTOOLS.
> DO NOT add Operations children as primary leaves.
> DO NOT reopen DashboardTopbar peer matrix (R-IA-03) under this task.
> DO NOT pin `PRIMARY_SIDEBAR_ITEMS.length === 9` as permanent law (0082 owns post-cutover length).
> DO NOT edit UI.md EPIC-19 planned/live primary tables or Tools→Ops interim paragraphs (0078/0082/0083).
> DO NOT touch :21000 production.

> [!IMPORTANT]
> Decision must be **binary** and encoded in UI.md + tests.
> If D2, matrix coverage = full SSoT href lists, not a sample of 2 pages.
> Prefer D1 when uncertain — documenting intentional one-way is a valid completion.

---

## 🛡️ Compliance Checklist (Leis Primárias do AGENTS.md)

- [ ] **Doc Accuracy**: UI.md claims match live chrome (grep + tests)
- [ ] **Zod Validation**: N/A unless new inputs
- [ ] **Security**: No secrets
- [ ] **Error Sanitization**: N/A
- [ ] **No Raw SQL**: N/A
- [ ] **Archive Protocol**: No capability deletion
- [ ] **No-new-leaf**: anti-leaf asserts; absolute length owned by 0082

---

## 📋 Completion Evidence (preenchido pelo agente executor)

- **Arquivos criados/modificados**:
  - `docs/guides/UI.md` — new § **Hub reverse chrome** (D1 policy only; EPIC-19 / live primary tables untouched)
  - `src/shared/constants/operationsHub.ts` — D1 reverse-chrome decision pointer comment
  - `src/shared/constants/testingHub.ts` — D1 reverse-chrome decision pointer comment
  - `tests/unit/ui/ops-testing-reverse-chrome-0076.test.ts` — intentional absence matrix + anti-new-leaf + inventory/palette guards
  - `CHANGELOG.md` — Unreleased bullet (Task 0076)
- **Decision**: **D1 — intentional one-way launchpads**
  - **Rationale**: Full D2 reverse chrome would touch ~15+ Operations + Testing destination pages without clear operator demand; would recreate dual-nav pressure after 0060 removed labs from sidebar. Option A (hub = launchpad) from 0059/0060 remains product law. Return via primary Operations leaf, Operations→Testing card, CommandPalette, or browser history. Binary decision encoded in UI.md + absence tests so agents stop reopening 0059/0060 as “incomplete reverse chrome.”
- **Testes que verificam o trabalho**:
  - `tests/unit/ui/ops-testing-reverse-chrome-0076.test.ts`
  - `tests/unit/ui/operations-hub-discoverability-0059.test.ts` / `testing-hub-discoverability-0060.test.ts` (no regression)
- **Resultado dos testes**:
  - `node --import tsx/esm --test tests/unit/ui/ops-testing-reverse-chrome-0076.test.ts tests/unit/ui/operations-hub-discoverability-0059.test.ts tests/unit/ui/testing-hub-discoverability-0060.test.ts` → **pass**
- **Resultado do lint**: `npx eslint` on touched files → **0 errors**
- **Resultado do typecheck/build**: `npm run typecheck:core` → **pass**
- **Entrada no changelog**: Unreleased → Changed → **Operations/Testing reverse chrome D1 (Task 0076 / R-IA-04/05)**
- **Agente executor**: gt-ts-engineer (builders)
- **Data de conclusão**: 2026-07-19

---

## 🔍 Review Trail (preenchido pelo reviewer)

- **Reviewer**: independent Frontend Quality (`reviewers`) — full re-review
- **Data da review**: 2026-07-19
- **Veredito**: APROVADO
- **Score (path to 100)**: 100/100
- **Notas**: D1 reconfirmed (UI.md + SSoT + full exact peer matrix 15 Ops / 7 Testing). Live absence of reverse chrome on api-manager/playground. Stay 03-review.
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
- **Full report**: `docs/reports/reviews/2026-07-19-task-0076-ops-testing-reverse-chrome-independent-rereview.md`
- **Lane outcome**: stay `docs/tasks/03-review/` (ACCEPT 100/100)
- **Task reference**: Task 0076 (`omniroute-ops-testing-reverse-chrome`); live path `docs/tasks/03-review/0076-omniroute-ops-testing-reverse-chrome.md`

#### Current Open Blockers

- none

#### Path-to-100 Summary

- Exact peer coverage asserts (no soft ≥N floor; missing page.tsx fails).

### Previous Reports

- `docs/reports/reviews/2026-07-19-task-0076-ops-testing-reverse-chrome-frontend-quality-review.md` (builders parallel-review, 100/100)
