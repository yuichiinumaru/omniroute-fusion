# Task 0096: EPIC-20 T20-K — Labs Fused Page (Playground + Translator + Search Tools + Batch/Files)

> **Status**: `[x]` Implemented — review accepted 100 (2026-07-20)

> **Priority**: 🔴 P0  
> **Type**: `feature` + `remediation`  
> **Action type**: UX_VIS + HARDEN  
> **Origin**: EPIC-20 §2 topbar #9 `labs`, §3 fusion pattern, §4 Labs rules — `docs/tasks/00-planning/EPIC-20-omniroute-operations-hub-reform.md`  
> **Blocks**: **0099** (Testing hub retire needs Labs destination), hard-helps **0100** (chrome/redirect matrix)  
> **Depends on**: **T20-A / T20-B** (Operations topbar SSoT + shell — reserved **0086/0087** when opened) **hard**; soft: EPIC-19 **0085** path phase-0 inventory for legacy→canonical rows  
> **Parallelism**: `serializable` vs other fusion pages that own the same Ops shell layout; **parallel-safe vs 0097** if Labs paths and Media paths do not co-edit the same files; **not** parallel-safe vs **0099** (0099 waits for this)  
> **Review routing**: independent Labs PR preferred; **bundle with 0099** if both land in one wave and touch `testingHub.ts` / palette together  

---

## Objective

Replace the fragmented Testing-era lab destinations with a **single Operations Labs page** under the Operations topbar peer `labs`:

| Vertical stack (top → bottom) | Source today | Fusion rule |
|-------------------------------|--------------|-------------|
| **Playground** | `/dashboard/playground` | Primary work surface; Chat/Compare/API/Build leave **page topbar** → **right sidebar or dropdown/buttons** |
| **Translator** | `/dashboard/translator` | Collapsible section; concept/explainer cards → **bottom, default collapsed** |
| **Search Tools** | `/dashboard/search-tools` | Fuse Search / Scrape / Compare **inside the section** (kill `SearchToolsTopBar` mode strip as L1) |
| **Batch (+ Files)** | `/dashboard/batch` + `/dashboard/batch/files` | One Batch section; files as **collapsible subsection** |

**Canonical path (target):** `/operations/labs` (alias allowed per T20-A freeze: `/dashboard/operations/labs` only if SSoT dual-write is explicit).

**Done when:**

1. One Labs route hosts the four blocks in vertical collapsible order.  
2. Playground modes are **not** a second hub topbar under Ops chrome.  
3. Search modes are in-page (segmented control / tabs / dropdown inside the Search block).  
4. Explainers (Translator “Your app speaks…”, Batch concept cards, Search concept) sit at **page bottom**, collapsible, **default collapsed**.  
5. Legacy lab URLs redirect into Labs (with optional hash/query for block deep-link if SSoT defines builders).  
6. **Media is NOT inside Labs** (→ **0097**).  
7. Anti-phantom: on `/operations/labs` mount count of Operations hub topbar ≤ 1; no stacked Ops + Testing + StudioTopBar-as-hub.  

Philosophy: *Organização tem que ser auto-evidente, ou não é organização.* (root `AGENTS.md` Hard Rules **#22–#23**).

---

## Background Context

### O que já existe:

- Testing hub launchpad: `src/shared/constants/testingHub.ts` + `/dashboard/testing` (0060, 0076 D1 one-way).  
- Live lab routes (real pages, not stubs):
  - `src/app/(dashboard)/dashboard/playground/` — `PlaygroundStudio.tsx` + `StudioTopBar` modes `chat|compare|api|build` via `?tab=`  
  - `src/app/(dashboard)/dashboard/translator/` — `TranslatorPageClient` + `TranslatorConceptCard` (collapsible concept exists but law requires bottom-default-collapsed stack)  
  - `src/app/(dashboard)/dashboard/search-tools/` — `SearchToolsTopBar` modes `search|scrape|compare`  
  - `src/app/(dashboard)/dashboard/batch/` + `batch/files/` — list/wizard + files list; concept cards  
- Operations hub cards still point at Testing / deep peers: `operationsHub.ts` (`testing` → `/dashboard/testing`).  
- Shared primitives: `Collapsible` / `CollapsibleSection`, `PageTabBar` (hub-level only — do **not** use as second hub topbar for playground modes).  
- EPIC-20 path matrix: Labs legacy → playground, translator, search-tools, batch, batch/files, testing.  
- Collapsible density reference: Translator concept pattern (improve to match law).

### O que está faltando / quebrado:

- Labs are a **card dump** under Testing, not an Ops topbar peer with vertical fusion.  
- Playground + Search each mount **their own L1 mode topbars**, which stack badly under a future Ops topbar (EPIC-19 multi-topbar class of bug).  
- Batch and Batch Files are separate mental pages.  
- Explainers still compete for above-the-fold space.  
- No canonical `/operations/labs` (or frozen alias) with redirect matrix rows.

### Explicitly out of scope:

- **Media** generation UI (→ **0097**).  
- Plugins marketplace features (Integrations / T20-I).  
- Retiring Testing hub chrome + palette (→ **0099** — this task only needs Labs destination ready).  
- Full anti-phantom matrix for all 10 Ops peers (→ **0100**).  
- Traffic Inspector (→ **0098**, Observe).  
- Backend batch/playground API rewrites.  
- New primary sidebar leaves for playground/translator/search-tools.

### Collision notes:

- **T20-A/B** own Operations topbar ids, path builders, shell mount — Labs **consumes** builders; do not invent a third path scheme.  
- **0097** owns `/operations/media` and media redirects — do not re-home media under Labs.  
- **0099** will rewrite `testingHub` / Ops cards / palette after Labs+Media exist.  
- Prefer **compose** existing clients (`PlaygroundStudio`, translator client, search client, batch tabs) over copy-paste business logic.

---

## Dependency & Parallel Safety

| Item | Value |
|------|--------|
| **Depends on** | **0086 T20-A + 0087 T20-B hard** (or equivalent open IDs for Ops SSoT + shell). Soft: **0085** inventory rows for playground/translator/search/batch |
| **Blocks** | **0099 hard**; evidence for **0100** Labs chrome row |
| **File ownership (exclusive for this task)** | Labs route/page under operations shell; playground mode chrome relocation; search mode in-page fusion; batch+files collapsible composition; Labs-specific unit tests `tests/unit/ui/epic20-labs-fusion-0096.test.ts` (name flexible) |
| **Do not touch** | Media page ownership (**0097**); Observe / traffic (**0098**); Testing hub retire + full palette rewrite (**0099** — minimal dual-serve OK); `PRIMARY_SIDEBAR_ITEMS` membership; production port **21000** |
| **parallel-safe** | Yes vs **0097/0098** if paths disjoint |
| **serializable** | After T20-A/B; before **0099** and **0100** final gate |

---

## Test Requirements

> Language: measurable. PROIBIDO “must feel nicer”.

- DEVE existir rota canônica Labs (per T20-A builder) que renderiza **quatro** blocos na ordem: Playground → Translator → Search Tools → Batch(+Files)  
- DEVE usar collapsibles (`Collapsible` / `CollapsibleSection` or shared Ops fusion wrapper from T20-A/B) para cada bloco major  
- DEVE **não** montar `StudioTopBar` (or equivalent) as a **hub-level** second topbar under Operations chrome — modes via right sidebar **or** dropdown/buttons inside Playground block only  
- DEVE fundir Search/Scrape/Compare **dentro** do bloco Search (sem `data-testid="search-tools-topbar"` as L1 hub strip; in-block mode UI OK)  
- DEVE colocar explainers/concept cards no **fundo da página**, collapsible, **defaultCollapsed=true** (Translator concept, Search concept, Batch/Files concept)  
- DEVE redirecionar legados (assert redirect matrix rows — implement or consume T20-A SSoT):  
  - `/dashboard/playground` → Labs  
  - `/dashboard/translator` → Labs  
  - `/dashboard/search-tools` → Labs  
  - `/dashboard/batch` e `/dashboard/batch/files` → Labs (files subsection deep-link if builder supports)  
- DEVE preservar deep-link de playground `?tab=chat|compare|api|build` (map to mode control; do not silently drop)  
- DEVE assertir **no-new-leaf**: `playground`, `translator`, `search-tools` still **absent** from primary sidebar + DEVTOOLS (0060 contract)  
- DEVE assertir chrome: Operations hub topbar mount count **≤ 1** on Labs route (data attribute or component count — match T20-B pattern)  
- NÃO DEVE incluir Media modality strip dentro de Labs  
- NÃO DEVE reabrir dual Testing reverse chrome (0076 D1 stays unless product reopens)

---

## Exit Conditions (GDD/TDD)

> OmniRoute npm matrix — see `docs/tasks/OMNIROUTE-CREATE-TASKS-EXITS.md`.  
> Do **not** require cargo check/test for this stack.

- [x] Canonical Labs page exists and stacks Playground → Translator → Search → Batch(+Files) with collapsibles  
- [x] Playground modes relocated off hub-level topbar (right sidebar **or** in-block dropdown/buttons)  
- [x] Search modes fused in-page; no competing L1 mode topbar under Ops shell  
- [x] Explainers at bottom, default collapsed  
- [x] Legacy redirects for playground/translator/search-tools/batch(/files) land on Labs  
- [x] Playground `?tab=` deep-link still selects mode  
- [x] Unit tests pass:  
      `node --import tsx/esm --test tests/unit/ui/epic20-labs-fusion-0096.test.ts`  
      (plus related discoverability regressions if extended)  
- [x] `npm run typecheck:core` passa sem erros  
- [x] `npm run lint` passa sem erros novos nos arquivos tocados  
- [x] Entrada no TOPO de `CHANGELOG.md` under `[Unreleased]` describing Labs fusion under Operations  
- [x] Completion Evidence lists files, test output, chrome mount assertion, and disposition of legacy routes (redirect vs dual-serve)  
- [x] No product work on :21000; verify on :22000 only if operator requests live check  

---

## Details

### What

Subtasks:

- [ ] **Ler código existente** (obrigatório primeiro):  
  - `docs/tasks/00-planning/EPIC-20-omniroute-operations-hub-reform.md` §2–§5 Labs rows  
  - T20-A/B SSoT modules (path builders, topbar ids, shell) when present  
  - `src/shared/constants/testingHub.ts`, `operationsHub.ts`  
  - `playground/PlaygroundStudio.tsx`, `StudioTopBar.tsx`, tabs/*  
  - `translator/TranslatorPageClient.tsx`, `TranslatorConceptCard.tsx`  
  - `search-tools/SearchToolsClient.tsx`, `SearchToolsTopBar.tsx`, tabs/*  
  - `batch/page.tsx`, `batch/files/page.tsx`, concept cards  
  - `src/shared/components/Collapsible.tsx`, `CollapsibleSection.tsx`, `PageTabBar.tsx`  
  - `docs/guides/UI.md` hub chrome / no-new-leaf sections  
  - 0060/0076 discoverability tests (lab absence + one-way policy)  
- [ ] Confirm Labs builder path + redirect rows from T20-A (do not invent third scheme)  
- [ ] Create/compose Labs fused page under Operations shell; vertical collapsibles; defaults (Playground expanded; others per product default — document in Evidence)  
- [ ] Relocate playground Chat/Compare/API/Build controls to right sidebar or dropdown  
- [ ] Fuse search modes in-block; retire SearchToolsTopBar as L1  
- [ ] Merge batch + files into one section with files collapsible subsection  
- [ ] Move explainers to page bottom default-collapsed  
- [ ] Wire legacy redirects; preserve `?tab=` playground  
- [ ] TDD: fusion order, redirects, mode deep-link, chrome ≤1, no-new-leaf, media exclusion  
- [ ] **Refactoring pass**: compose existing clients; no 2× business-logic clones  
- [ ] **Verificação de regressão**: Exit Conditions commands  

### Where

| Arquivo | Propósito |
|---------|-----------|
| EPIC-20 planning doc | Ler — locked matrix |
| T20-A SSoT (operations path builders / topbar ids) | Ler/consumir — Labs id `labs` |
| T20-B Operations shell / topbar mount | Ler/consumir — single topbar host |
| `src/app/(dashboard)/…/operations/labs/**` (or frozen alias path) | Criar — fused Labs page |
| `src/app/(dashboard)/dashboard/playground/**` | Modificar — mode chrome off hub topbar; keep logic |
| `src/app/(dashboard)/dashboard/translator/**` | Modificar/compor — section + explainer bottom |
| `src/app/(dashboard)/dashboard/search-tools/**` | Modificar — in-page modes; strip L1 topbar |
| `src/app/(dashboard)/dashboard/batch/**` | Modificar/compor — batch+files section |
| Legacy `page.tsx` for playground/translator/search-tools/batch | Redirect wrappers or re-export into Labs |
| `src/shared/constants/testingHub.ts` | Ler only (retire in **0099**) unless dual-serve note |
| `src/shared/components/Collapsible*.tsx` | Reuse |
| `tests/unit/ui/epic20-labs-fusion-0096.test.ts` | Criar |
| `tests/unit/ui/testing-hub-discoverability-0060.test.ts` | Regressão / extend carefully |
| `CHANGELOG.md` | Entrada Unreleased |
| `docs/guides/UI.md` | Opcional breve Labs fusion note **only** if T20-A did not already document |

### How

1. Read T20-A path builder for `labs` and redirect matrix rows.  
2. Scaffold Labs page inside Operations shell (one topbar peer active: Labs).  
3. Import/compose four sections top→bottom with collapsibles.  
4. Playground: remove StudioTopBar from “hub strip” role; re-host modes in right sidebar or compact dropdown; keep metrics/export if product-critical.  
5. Search: replace L1 `SearchToolsTopBar` with in-section mode control.  
6. Batch: single section; files nested collapsible.  
7. Collect explainers into bottom stack `defaultOpen={false}`.  
8. Redirect legacy routes; unit-test matrix.  
9. Screenshot-level check only on :22000 if operator asks — **never :21000**.

### Why

Without Labs fusion, Operations remains a launchpad of Testing-era islands. Operators cannot see one self-evident Labs surface; multi-topbar ghosts return the moment Ops shell mounts over playground/search L1 strips. This is the **largest** EPIC-20 fusion and unblocks Testing retire (**0099**).

---

## Parallelism / file ownership

| Class | Detail |
|-------|--------|
| **parallel-safe** | **0097** Media (disjoint route), **0098** Observe traffic |
| **serializable** | After T20-A/B; before **0099** / **0100** final |
| **Collision** | Ops shell layout; CommandPalette lab hrefs (prefer leave palette to **0099**); `testingHub.ts` |

---

## ⛔ Anti-Hallucination Guardrails

> [!CAUTION]
> DO NOT invent path schemes outside T20-A SSoT.  
> DO NOT put Media inside Labs.  
> DO NOT add primary sidebar leaves for labs.  
> DO NOT mount dual Ops topbars + StudioTopBar + SearchToolsTopBar as hub chrome.  
> DO NOT delete playground/translator/search/batch business modules — re-home + redirect (archive-not-delete for prefs/hideable ids).  
> PORT 21000 = production — never mutate without explicit operator command.

> [!IMPORTANT]
> Hard Rules **#22–#23**: exactly one hub topbar family; self-evident `/operations/labs`.  
> First subtask is read-only inspection.  
> Prefer TDD redirect + chrome mount tests before claiming done.  
> 0076 D1 one-way launchpad is superseded **for Labs content** by Ops topbar navigation — do not re-add Testing reverse strip.

---

## 🛡️ Compliance Checklist (Leis Primárias do AGENTS.md)

- [ ] **Doc Accuracy**: Every path/API name grepped against `src/` before docs  
- [ ] **Zod Validation**: New query keys parse-don't-validate if added  
- [ ] **Security**: No secrets; no process-spawn route changes  
- [ ] **Error Sanitization**: N/A for pure chrome unless error UI touched  
- [ ] **No Raw SQL**: N/A  
- [ ] **Archive Protocol**: Redirect/re-home; no silent delete of live lab features  

---

## 📋 Completion Evidence (preenchido pelo agente executor)

- **Arquivos criados/modificados**:
  - **Created**: `src/app/(dashboard)/operations/labs/page.tsx`, `LabsPageClient.tsx`
  - **Created**: `src/app/(dashboard)/dashboard/batch/BatchPageClient.tsx`, `batch/files/BatchFilesPageClient.tsx` (extracted from pages)
  - **Created**: `tests/unit/ui/epic20-labs-fusion-0096.test.ts`
  - **Modified (compose/props)**: `PlaygroundStudio.tsx` (`modeChrome`), `StudioTopBar.tsx` (`variant`), `SearchToolsClient.tsx` (`modeChrome`/`showConceptCard`), `SearchToolsTopBar.tsx` (`variant` — inline omits L1 `search-tools-topbar` testid), `TranslatorPageClient.tsx` (`showConceptCard`)
  - **Redirect shells**: `dashboard/playground/page.tsx`, `translator/page.tsx`, `search-tools/page.tsx`, `batch/page.tsx`, `batch/files/page.tsx` → `buildOperationsPath("labs")` (+ `?tab=` / `?section=files`)
  - **CHANGELOG.md** Unreleased Added entry
- **Testes que verificam o trabalho**: `tests/unit/ui/epic20-labs-fusion-0096.test.ts` (16 tests: route, fusion order, collapsibles, explainers, media exclusion, mode chrome, redirects, anti-phantom, no-new-leaf)
- **Resultado dos testes**: **PASS** — 16/16 on `epic20-labs-fusion-0096.test.ts`; also 45/45 on 0060 + 0076 + 0083 + 0087 regression suite
- **Resultado do lint**: **PASS** (eslint on touched files, exit 0)
- **Resultado do typecheck/build**: **PASS** — `npm run typecheck:core` clean
- **Chrome mount assertion**: Ops `layout.tsx` mounts `<OperationsTopbar />` exactly once; Labs page/client do not import/mount OperationsTopbar, PageTabBar, or CostsSubnav; Playground/Search use `modeChrome="inline"` in-block toolbars
- **Redirect disposition**: all 0096 matrix rows implemented as server `redirect(buildOperationsPath("labs"))`; playground preserves `?tab=`; batch/files → `?section=files` (Batch+Files collapsibles open). No dual-serve of full lab pages at legacy paths.
- **Defaults documented**: Playground `defaultOpen={true}`; Translator / Search / Batch collapsed; Files nested under Batch; explainers bottom all `defaultOpen={false}`
- **Entrada no changelog**: `CHANGELOG.md` → `[Unreleased]` → Added → **EPIC-20 Labs fused page (Task 0096 / T20-K)**
- **Agente executor**: gt-ts-engineer (builders)
- **Data de conclusão**: 2026-07-20  


---

## 🔍 Review Trail (preenchido pelo reviewer)

- **Reviewer**: `gt-frontend-quality-reviewer` (parent `builders`)
- **Data da review**: 2026-07-20
- **Veredito**: `ACCEPTED_100` — move `02-doing` → `03-review`
- **Score (path to 100)**: **100/100**
- **Report**: `docs/reports/reviews/2026-07-20-task-0094-0095-0096-epic20-integrations-memory-labs-frontend-review.md`
- **Notas**: Labs fusion Playground → Translator → Search → Batch(+Files); inline mode chrome (not hub L1 strips); explainers bottom collapsed; five legacy redirects; media excluded; 16/16 unit. Residuals: Header catch-all; Testing palette/hub retire → 0099; 0100 chrome matrix.
