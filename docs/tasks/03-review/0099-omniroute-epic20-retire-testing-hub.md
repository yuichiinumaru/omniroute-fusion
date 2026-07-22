# Task 0099: EPIC-20 T20-N — Retire/Redirect Testing Hub; Ops Cards → Topbar Deep Links

> **Status**: `[x]` Reviewed **100** — moved to `03-review`  

> **Priority**: 🔴 P0  
> **Type**: `feature` + `remediation`  
> **Action type**: UX_VIS + HARDEN  
> **Origin**: EPIC-20 §1 goals #2–#3, §2 Testing launchpad absorb, §5 testing→Labs, §7 T20-N — `docs/tasks/00-planning/EPIC-20-omniroute-operations-hub-reform.md`  
> **Blocks**: **0100** final gate (Testing absence + Ops deep links)  
> **Depends on**: **0096 Labs hard**, **0097 Media hard**; soft **0098** if Ops still lists Traffic (prefer Traffic card already removed in 0098); hard T20-A/B for topbar deep-link hrefs  
> **Parallelism**: `serializable` after 0096/0097; **not** parallel-safe with bulk palette/hub edits by others  
> **Review routing**: independent; **bundle with 0096** if same PR wave already fused Labs  

---

## Objective

**Retire the Testing hub as a product home** for labs. Operators reach lab/media surfaces via **Operations topbar deep links** (and Command Palette), not a second hub launchpad under Ops Integrations.

| Action | Target |
|--------|--------|
| `/dashboard/testing` | Redirect → `/operations/labs` (or Ops root if Labs missing — **default Labs**) |
| Testing hub client/cards | No longer the discovery SSoT; archive pattern per UI.md |
| Ops hub card grid | Either **replaced** by topbar-only navigation (preferred post T20-B shell) **or** cards deep-link to `/operations/{topbar-id}` peers (not legacy `/dashboard/*` islands) |
| Command Palette | Lab extras point at Ops Labs/Media/Integrations canonical paths; remove “Testing hub” as a destination or alias it to Labs |
| Plugins | Remain under Integrations (T20-I) — palette/href update only if still pointing at Testing story |

**Done when:**

1. `/dashboard/testing` redirects to Labs (assert matrix).  
2. No primary/product UX treats Testing as a living hub (0076 D1 Testing reverse chrome becomes N/A).  
3. Ops discovery uses **topbar peers** / deep links to `/operations/*` (Endpoints, CoreMCP, Agents, … Labs, Media).  
4. Palette playground/translator/search-tools/batch/media hrefs updated to Ops canonical paths.  
5. Labs still absent from primary sidebar (0060 anti-leaf).  
6. Discoverability tests rewritten for EPIC-20 (do not gut without replacement).

---

## Background Context

### O que já existe:

- Testing hub: `testingHub.ts`, `TestingHubClient.tsx`, `/dashboard/testing`.  
- Ops Integrations card `testing` → `/dashboard/testing` (`operationsHub.ts`).  
- CommandPalette `testingHubExtras` (testing + playground + translator + search-tools + batch + batch-files + media + plugins).  
- 0060 discoverability tests + 0076 D1 one-way launchpad docs.  
- Post **0096/0097**: Labs + Media exist under Ops topbar.  
- EPIC-20 success: Testing content reachable only via Ops Labs/Media (or redirects).

### O que está faltando / quebrado:

- Dual mental model: Operations **and** Testing hubs for the same labs.  
- Ops cards still deep-link to legacy `/dashboard/*` pages.  
- Palette still teaches Testing as a place.  
- After Labs fusion, Testing hub is pure debt.

### Explicitly out of scope:

- Implementing Labs/Media fusion (**0096/0097** must already exist).  
- Full anti-phantom matrix for all peers (**0100**).  
- New plugins marketplace features.  
- Reopening 0076 reverse chrome debate — replace with Ops topbar as L1.  
- Backend changes.

### Collision notes:

- **0100** owns global chrome mount ≤1 and full redirect matrix assertions — this task implements Testing retire + Ops deep-link inventory update.  
- If T20-C…J pages not all open yet, cards may deep-link only to **landed** peers + Labs/Media; document residual cards pointing at legacy until those slices land — **do not invent fake `/operations/*` pages**.

---

## Dependency & Parallel Safety

| Item | Value |
|------|--------|
| **Depends on** | **0096 hard**, **0097 hard**, T20-A/B builders |
| **Blocks** | **0100** |
| **File ownership** | `testingHub.ts` / testing route redirect; `operationsHub.ts` restructure to topbar deep links; `CommandPalette.tsx` testing extras; discoverability tests rename/extend |
| **Do not touch** | Labs/Media page internals (0096/0097); Observe Traffic internals (0098) except Ops traffic card if still present |
| **serializable** | After Labs+Media |

---

## Test Requirements

- DEVE redirecionar `/dashboard/testing` → Labs canonical path  
- DEVE atualizar Ops discovery: cards/links usam `/operations/{id}` (or frozen alias) for landed peers — **Labs** + **Media** required; other peers as available from T20-A inventory  
- DEVE remover ou esvaziar Testing hub as operator-facing home (client may redirect-only)  
- DEVE atualizar CommandPalette:  
  - playground/translator/search-tools/batch → Labs (or Labs deep-link builders)  
  - media → Media canonical  
  - `testing` item either removed or aliases Labs  
  - plugins → Integrations path when T20-I landed; else keep `/dashboard/plugins` with TODO only if unavoidable — prefer Integrations builder if exists  
- DEVE manter anti-new-leaf: no Testing primary leaf; labs still not in DEVTOOLS  
- DEVE estender/reescrever testes 0060/0076 para EPIC-20 contracts (Testing redirect + Ops deep links)  
- DEVE **não** deixar hrefs de palette apontando só para rotas mortas  
- NÃO DEVE deletar hideable preference ids without archive note  

---

## Exit Conditions (GDD/TDD)

> OmniRoute npm matrix — see `docs/tasks/OMNIROUTE-CREATE-TASKS-EXITS.md`.

- [x] `/dashboard/testing` redirects to Labs  
- [x] Ops hub/cards (or topbar-only shell) deep-link to Ops topbar paths for Labs + Media at minimum  
- [x] CommandPalette lab destinations updated to Ops canonical paths  
- [x] Testing no longer required as intermediate hop for Labs/Media  
- [x] Unit tests pass (new and/or updated):  
      `node --import tsx/esm --test tests/unit/ui/epic20-retire-testing-0099.test.ts`  
      (+ updated 0059/0060 discoverability suites)  
- [x] `npm run typecheck:core` passa sem erros  
- [x] `npm run lint` passa sem erros novos nos arquivos tocados  
- [x] `docs/guides/UI.md` reverse-chrome / Testing hub section updated: Testing absorbed into Ops Labs/Media (EPIC-20)  
- [x] Entrada no TOPO de `CHANGELOG.md` under `[Unreleased]`  
- [x] Completion Evidence lists residual legacy deep links still awaiting T20-C…J  
- [x] No :21000 mutations  

---

## Details

### What

Subtasks:

- [x] **Ler código existente**: EPIC-20 T20-N; 0096/0097 Completion Evidence paths; `testingHub.ts`; `TestingHubClient.tsx`; `operationsHub.ts`; `OperationsHubClient.tsx`; `CommandPalette.tsx` testing/ops extras; 0059/0060/0076 tests; UI.md reverse-chrome + Testing sections; T20-A topbar id list  
- [x] Redirect `/dashboard/testing` → Labs  
- [x] Rewrite Ops discovery inventory to topbar deep links (drop Testing card; drop Traffic if still present)  
- [x] Update CommandPalette extras  
- [x] Rewrite discoverability tests for EPIC-20  
- [x] UI.md policy update (Testing absorbed)  
- [x] **Refactoring pass**: single SSoT for Ops destination hrefs (prefer T20-A builders over string drift)  
- [x] **Verificação de regressão**  

### Where

| Arquivo | Propósito |
|---------|-----------|
| `src/shared/constants/testingHub.ts` | Redirect SSoT / retire comments |
| `src/app/(dashboard)/dashboard/testing/**` | Redirect-only page |
| `src/shared/constants/operationsHub.ts` | Topbar deep links; remove Testing card |
| `src/app/(dashboard)/dashboard/operations/**` | Hub client — cards → peers or topbar-only |
| `src/shared/components/CommandPalette.tsx` | Update testingHubExtras |
| T20-A path builders | Consumir |
| `docs/guides/UI.md` | Testing absorb + reverse-chrome note |
| `tests/unit/ui/testing-hub-discoverability-0060.test.ts` | Rewrite/redirect contracts |
| `tests/unit/ui/operations-hub-discoverability-0059.test.ts` | Ops deep links |
| `tests/unit/ui/epic20-retire-testing-0099.test.ts` | Criar |
| `CHANGELOG.md` | Unreleased |

### How

1. Confirm Labs + Media canonical hrefs from T20-A/0096/0097.  
2. Testing route → redirect.  
3. Ops inventory → topbar peers.  
4. Palette → Ops paths.  
5. Tests + UI.md.  

### Why

Keeping Testing as a hub after Labs/Media land reintroduces dual navigation and card-dump IA. EPIC-20 success metric requires Testing content **only** via Ops Labs/Media (or redirects).

---

## Parallelism / file ownership

| Class | Detail |
|-------|--------|
| **parallel-safe** | Limited — after 0096/0097 only |
| **serializable** | Before **0100**; after Labs/Media |
| **Collision** | `operationsHub.ts`, `CommandPalette.tsx`, testing hub tests |

---

## ⛔ Anti-Hallucination Guardrails

> [!CAUTION]
> DO NOT start without 0096+0097 destinations real in tree.  
> DO NOT invent `/operations/*` pages that T20-C…J have not delivered — residual legacy OK with Evidence list.  
> DO NOT re-add labs to sidebar.  
> DO NOT leave `/dashboard/testing` as a working launchpad.  
> PORT 21000 = production — do not touch.

> [!IMPORTANT]
> Hard Rules #22–#23: Ops topbar is the L1 for labs/media.  
> Update UI.md so future agents do not re-implement Testing hub.  
> 0076 D1 “return via Testing hub” is obsolete for labs — document Ops topbar return path.

---

## 🛡️ Compliance Checklist (Leis Primárias do AGENTS.md)

- [x] **Doc Accuracy**: all hrefs grepped  
- [x] **Zod Validation**: N/A unless query  
- [x] **Security**: palette only links  
- [x] **Error Sanitization**: N/A  
- [x] **No Raw SQL**: N/A  
- [x] **Archive Protocol**: redirect Testing; archive hub copy in docs if needed  

---

## 📋 Completion Evidence (preenchido pelo agente executor)

- **Arquivos**:  
  - `src/shared/constants/testingHub.ts` — retired SSoT; `TESTING_HUB_CANONICAL_PATH` → Labs; absorb map + `TESTING_HUB_LEGACY_HREFS`  
  - `src/app/(dashboard)/dashboard/testing/page.tsx` — server redirect → Labs  
  - `src/app/(dashboard)/dashboard/testing/TestingHubClient.tsx` — `@deprecated` archive stub  
  - `src/shared/constants/operationsHub.ts` — all cards via `buildOperationsPath`; Labs+Media cards; no Testing/Traffic  
  - `src/app/(dashboard)/operations/OperationsHubClient.tsx` — copy: topbar peers / Testing retired  
  - `src/shared/components/CommandPalette.tsx` — `testingHubExtras` → Labs/Media/Integrations builders  
  - `src/shared/components/Header.tsx` — Labs title for testing/labs paths  
  - `docs/guides/UI.md` — reverse-chrome + Tools→Operations EPIC-20 absorb  
  - `CHANGELOG.md` `[Unreleased]`  
  - Tests: `epic20-retire-testing-0099.test.ts` (new); 0059/0060/0076/0083/0086/sidebar-tools-group updated  
- **Residual legacy Ops links awaiting T20-C…J**: **None** — T20-C…J peers already landed; Ops hub cards all use `/operations/*` builders. Nested live deep routes (out of hub cards): `/dashboard/plugins/[name]/config` (0094 archive). CommandPalette `operationsHubExtras` still has residual legacy `href`s for api-manager/endpoints/a2a/webhooks (redirect shells; not this task’s testing extras — optional follow-up in 0100).  
- **Palette href table** (`testingHubExtras`):  
  | id | href |  
  |----|------|  
  | testing (alias) | `buildOperationsPath("labs")` → `/operations/labs` |  
  | playground | `/operations/labs` |  
  | translator | `/operations/labs` |  
  | search-tools | `/operations/labs` |  
  | batch | `/operations/labs` |  
  | batch-files | `/operations/labs` |  
  | media | `buildOperationsPath("media")` → `/operations/media` |  
  | plugins | `buildOperationsPath("integrations")` → `/operations/integrations` |  
- **Testes + output**:  
  ```
  node --import tsx/esm --test \
    tests/unit/ui/epic20-retire-testing-0099.test.ts \
    tests/unit/ui/testing-hub-discoverability-0060.test.ts \
    tests/unit/ui/operations-hub-discoverability-0059.test.ts \
    tests/unit/ui/ops-testing-reverse-chrome-0076.test.ts \
    tests/unit/ui/epic19-tools-ops-verify-0083.test.ts \
    tests/unit/ui/epic20-operations-matrix-0086.test.ts \
    tests/unit/sidebar-tools-group.test.ts
  # 85/85 pass
  # Related EPIC-20 regression (0090/91/92/93/95/98 + coremcp): 95/95 pass
  npm run typecheck:core  # clean
  eslint on touched production files  # clean
  ```  
- **UI.md section updated**: § Hub reverse chrome (Testing retired; Ops topbar L1); § Tools → Operations (EPIC-20 absorb)  
- **Changelog**: `[Unreleased]` Added — EPIC-20 retire Testing hub (Task 0099 / T20-N)  
- **Agente / data**: gt-ts-engineer / 2026-07-20  
- **Lane**: `docs/tasks/03-review/` after frontend-quality review **100** (2026-07-20)

---

## 🔍 Review Ledger

| Field | Value |
|-------|--------|
| **Reviewer** | `gt-frontend-quality-reviewer` (parent `builders`) |
| **Veredito** | `ACCEPTED_100` |
| **Score** | `100/100` |
| **Report** | [`docs/reports/reviews/2026-07-20-task-0099-epic20-retire-testing-hub-review.md`](../../reports/reviews/2026-07-20-task-0099-epic20-retire-testing-hub-review.md) |
| **Previous Reports** | none (first formal review) |
| **Lane** | → `03-review` |
| **Notas** | Testing redirect + Ops Labs/Media deep links + palette builders solid. Review polish: UI.md EPIC-19 “Operations → Testing” rows → Labs/Media; stale “Testing hub” discovery comments. Residuals for 0100: `operationsHubExtras` legacy hrefs; UI.md EPIC-20 “planned” banner. |
