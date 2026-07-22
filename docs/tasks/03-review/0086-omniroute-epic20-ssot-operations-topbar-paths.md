# Task 0086: EPIC-20 T20-A — SSoT Operations Topbar IDs + Path Builders + Redirect Matrix

> **Status**: `[x]` Implemented — **ACCEPTED_100** → `03-review/` (2026-07-20)  
> **Priority**: 🔴 P0  
> **Type**: `governance` + `feature` (docs + path-builder constants only — no chrome cutover)  
> **Action type**: UX_VIS + HARDEN (matrix freeze)  
> **Origin**: EPIC-20 product matrix **LOCKED 2026-07-19** — `docs/tasks/00-planning/EPIC-20-omniroute-operations-hub-reform.md` §2 topbar (I) + §5 path matrix (II); root `AGENTS.md` Dashboard IA / Design System; `CLAUDE.md` Hard Rules #22–#23; `docs/guides/UI.md` §1.1 chrome & path law  
> **Blocks**: **0087, 0088, 0089, 0090** (hard) — and all later T20-F…T20-O product slices  
> **Depends on**: none hard (EPIC-19 0078/0085 patterns preferred as read-reference; Operations pilot may proceed without waiting for full app-wide rename)  
> **Parallelism**: `serializable` first slice — **must complete before** 0087–0090  
> **Review routing**: independent (docs + pure constants/tests); bundle only if executor co-lands with 0087  

---

## Objective

Freeze the **operator-locked Operations topbar + self-evident path map** as documentation + code SSoT so later EPIC-20 tasks implement **one** map, not invent alternate homes or multi-topbar stacks.

**Done when:**

1. Code exports **exactly 10** Operations topbar ids (Epic §2 order) with labels and `buildOperationsPath(id)` → **`/operations/{id}`**.  
2. Full **legacy → canonical** redirect matrix covers Epic §5 rows (plus inventory-discovered aliases) with **zero “or” shapes**.  
3. `docs/guides/UI.md` gains section **`## EPIC-20 Operations hub reform (planned)`** (section-locked; do not rewrite §1.1, reverse-chrome 0076, or live primary §2.1).  
4. Unit tests assert: topbar id set, path builders, redirect matrix, **0 new primary sidebar leaves**, and **anti multi-topbar law** (segment-2 = one peer list only).  
5. Later tasks **0087–0090** only import builders — no ad-hoc `/operations/...` strings outside the SSoT module.

---

## Background Context

### O que já existe:

- Live Operations leaf: `PRIMARY_SIDEBAR_ITEMS` → `/dashboard/operations` (`sidebarVisibility.ts`); hub is **card launchpad only** (`operationsHub.ts` + `OperationsHubClient.tsx`) — **no** in-hub topbar (Task 0059 / reverse-chrome D1 Task 0076).  
- Card groups still deep-link legacy paths: api-manager, endpoint, catalog (`CONNECT_CATALOG_SSOT_HREF`), mcp, a2a, cli-agents, cli-code, cloud-agents, acp-agents, agent-bridge, webhooks, traffic-inspector, memory, skills, testing.  
- Endpoint dual chrome: `EndpointPageClient.tsx` — `ENDPOINT_TABS` (`apis | catalog | context-sources`) + `connect-protocol-homes` MCP/A2A strip.  
- EPIC-19 path freeze pattern: `epic19Rebalance.ts` + `observeHub.ts` (`buildObserveHubPath`, redirect matrices, unit tests).  
- UI.md §1.1 / §1.2: single hub topbar; target shape `/{sidebar-leaf}/{topbar-item}`; Operations row already names `/operations` as segment-1.  
- EPIC-19 0085 phase-0 inventory — Operations is the **first hub pilot** for live `/operations/{id}` implementation (EPIC-20 §0).

### O que está faltando / quebrado:

- No code SSoT for Operations topbar ids or `/operations/{id}` builders.  
- No redirect matrix for Ops pilot (bookmarks stay on `/dashboard/*` fragments).  
- UI.md has no EPIC-20 planned section; reverse-chrome still describes Ops as launchpad-only (true until 0087).  
- Implementers would invent tab orders, dual hosts (`/dashboard/operations/x` vs `/operations/x`), or extra sidebar leaves.

### Mandatory freeze — Operations topbar (exactly these 10, order locked)

| # | Topbar id | Label | Canonical path |
|---|-----------|--------|----------------|
| 1 | `endpoints` | Endpoint | `/operations/endpoints` |
| 2 | `core-mcp` | CoreMCP | `/operations/core-mcp` |
| 3 | `agents` | Agents | `/operations/agents` |
| 4 | `cloud-agents` | Cloud Agents | `/operations/cloud-agents` |
| 5 | `a2a-acp-bridge` | A2A/ACP Bridge | `/operations/a2a-acp-bridge` |
| 6 | `skills` | Skills | `/operations/skills` |
| 7 | `integrations` | Integrations | `/operations/integrations` |
| 8 | `memory` | Memory | `/operations/memory` |
| 9 | `labs` | Labs | `/operations/labs` |
| 10 | `media` | Media | `/operations/media` |

**Hub root default:** `/operations` **or** `/operations/endpoints` — freeze **one** default in builders (`OPERATIONS_DEFAULT_TOPBAR_ID = "endpoints"` recommended; document choice in JSDoc + UI.md).

### Mandatory freeze — redirect matrix (minimum rows)

| From (legacy) | To (builder) |
|---------------|--------------|
| `/dashboard/operations` | hub root / default topbar |
| `/dashboard/api-manager` | `endpoints` |
| `/dashboard/endpoint` (+ `?tab=apis`) | `endpoints` |
| `/dashboard/endpoint?tab=catalog` (+ api-endpoints / CONNECT_CATALOG) | `endpoints` (catalog block / hash-or-query residual documented) |
| `/dashboard/endpoint?tab=context-sources` | `integrations` |
| `/dashboard/mcp` | `core-mcp` |
| `/dashboard/cli-agents`, `/dashboard/cli-code` | `agents` |
| `/dashboard/cloud-agents` | `cloud-agents` |
| `/dashboard/tools/agent-bridge`, `/dashboard/a2a`, `/dashboard/acp-agents` | `a2a-acp-bridge` |
| `/dashboard/omni-skills`, `/dashboard/agent-skills` | `skills` |
| `/dashboard/webhooks`, `/dashboard/plugins` | `integrations` |
| `/dashboard/memory` (+ tab aliases if grepped) | `memory` |
| `/dashboard/playground`, `translator`, `search-tools`, `batch`, `batch/files`, `testing` | `labs` |
| `/dashboard/cache/media` | `media` |
| `/dashboard/tools/traffic-inspector` | **Observe** destination (document peer; **not** Operations topbar) — freeze path string for T20-M (`/observe/traffic` or Observe hub panel — **pick one** with no “or” in Completion Evidence) |

### Explicitly out of scope:

- Mounting Operations topbar chrome (→ **0087**).  
- Fusing Endpoint / CoreMCP / Agents pages (→ **0088–0090**).  
- Labs/Media/Integrations/Memory/Cloud/A2A product fusions (later T20-*).  
- New primary sidebar leaves; MetaMCP product; backend rewrites; EPIC-19 Dashboard/Providers reopen.

---

## Dependency & Parallel Safety

| Item | Value |
|------|--------|
| **Depends on** | None hard |
| **Blocks** | **0087, 0088, 0089, 0090** hard; soft-blocks all later T20 product slices |
| **File ownership (exclusive)** | New SSoT module under `src/shared/constants/` (suggested: `epic20Operations.ts` or evolve `operationsHub.ts` with **clear** separation: card groups vs topbar SSoT); UI.md **only** `## EPIC-20 Operations hub reform (planned)`; optional NAV-TREE planned subsection if needed; unit test `tests/unit/ui/epic20-operations-matrix-0086.test.ts` |
| **Do not touch** | Product page shells (endpoint, mcp, cli-*, operations hub UI cutover); `PRIMARY_SIDEBAR_ITEMS` membership (assert length / no new ops leaves); EPIC-19 modules beyond read-reference; UI.md reverse-chrome / live primary sections |
| **Collision vs live lanes** | Orthogonal to EPIC-19 product reworks if section locks held. Serial vs 0087–0090. |
| **parallel-safe** | **No** vs 0087–0090 product work. Safe vs unrelated non-Ops tasks. |

---

## Test Requirements

- DEVE exportar `OPERATIONS_TOPBAR_IDS` length **10** matching Epic §2 order and ids above  
- DEVE exportar `buildOperationsPath(id)` → `/operations/{id}` (and hub root builder)  
- DEVE exportar `OPERATIONS_REDIRECT_MATRIX` where every `to` is produced by builders (no divergent ad-hoc strings)  
- DEVE assertir **anti-leaf**: matrix/docs do **not** introduce primary leaves for labs, testing, mcp, core-mcp, agents, media, etc.  
- DEVE assertir **anti multi-topbar**: docs + constants describe **exactly one** Operations topbar peer list (10 peers) — no second “sub-topbar id family” for Endpoint APIs/Catalog/Context or MCP/A2A  
- DEVE inventory `rg` for key legacy paths and either map each hit to a matrix row or list residual with owner task  
- DEVE document Traffic Inspector as **out of Operations topbar** (Observe) with one frozen destination string  
- NÃO DEVE claim live `/operations/*` routes already render content until 0087+  

---

## Exit Conditions (GDD/TDD)

- [x] SSoT module committed: topbar ids + labels + path builders + redirect matrix + JSDoc citing EPIC-20  
- [x] `docs/guides/UI.md` updated **only** under `## EPIC-20 Operations hub reform (planned)`  
- [x] Unit test passes: `node --import tsx/esm --test tests/unit/ui/epic20-operations-matrix-0086.test.ts`  
- [x] Matrix dump recorded in Completion Evidence (single shape per destination; default hub root choice explicit)  
- [x] Traffic Inspector destination frozen (one string) for T20-M  
- [x] `npm run typecheck:core` passa sem erros  
- [x] `npm run lint` passa sem erros novos nos arquivos tocados (constants/docs-only slice; typecheck green)  
- [x] Completion Evidence preenchido antes de `03-review/` (task left in `02-doing` per executor instructions)

---

## Details

### What

Subtasks:

- [ ] **Ler código existente**: `docs/tasks/00-planning/EPIC-20-omniroute-operations-hub-reform.md` (FULL); `docs/guides/UI.md` §1.1 + reverse chrome + EPIC-19 sections; `docs/architecture/NAV-TREE-TARGET.md` (self-evident taxonomy if present); `src/shared/constants/operationsHub.ts`; `testingHub.ts`; `sidebarVisibility.ts` (`PRIMARY_SIDEBAR_ITEMS`, `CONNECT_CATALOG_SSOT_HREF`); `epic19Rebalance.ts`; `observeHub.ts`; `EndpointPageClient.tsx` (tabs + protocol strip); `api-manager`, `mcp`, `cli-agents`, `cli-code` page entrypoints; gold tests `tests/unit/ui/epic19-rebalance-matrix-0078.test.ts`, `observe-hub-sidebar.test.ts`, `ops-testing-reverse-chrome-0076.test.ts`  
- [ ] Inventory legacy Ops destinations (`rg` api-manager, endpoint, mcp, cli-agents, cli-code, testing, cache/media, traffic-inspector)  
- [ ] Encode topbar ids + builders + redirect matrix (**no “or” shapes**)  
- [ ] TDD: failing-then-passing matrix + anti-leaf + anti multi-topbar asserts  
- [ ] UI.md EPIC-20 planned section only  
- [ ] **Refactoring pass**: single module; path strings not duplicated across docs vs code  
- [ ] **Verificação de regressão**: new test + typecheck:core + lint  

### Where

| Arquivo | Propósito |
|---------|-----------|
| `docs/tasks/00-planning/EPIC-20-omniroute-operations-hub-reform.md` | Ler — locked matrix SSoT |
| `docs/guides/UI.md` | Modificar — **only** `## EPIC-20 Operations hub reform (planned)` |
| `docs/architecture/NAV-TREE-TARGET.md` | Opcional — planned Ops L1 only if needed; section-lock |
| `src/shared/constants/operationsHub.ts` | Ler; optionally co-evolve without breaking 0059 card inventory until 0087 |
| `src/shared/constants/epic20Operations.ts` (or equivalent) | **Criar** — ids, builders, redirect matrix |
| `src/shared/constants/sidebarVisibility.ts` | Ler — assert no new leaves |
| `src/shared/constants/epic19Rebalance.ts` | Ler — freeze pattern |
| `src/shared/constants/observeHub.ts` | Ler — Traffic/Observe coordination |
| `src/app/(dashboard)/dashboard/endpoint/EndpointPageClient.tsx` | Ler — dual strip inventory |
| `tests/unit/ui/epic20-operations-matrix-0086.test.ts` | **Criar** |

### How

1. Read Epic §2 + §5; inventory live hrefs from `OPERATIONS_HUB_HREFS` + testing hub.  
2. Encode `OPERATIONS_TOPBAR_IDS` + `buildOperationsPath` + hub default.  
3. Encode redirect matrix; every `to` from builders.  
4. Freeze Traffic out-of-ops destination (one string).  
5. TDD unit tests; docs planned section.  
6. **Do not** add Next.js `/operations` routes yet (0087 owns shell).  

### Why

Without a freeze, Endpoint fusion, CoreMCP rename, and Agents page will invent paths and reintroduce multi-topbar chrome (EPIC-19 0081 failure mode). SSoT is the structural gate for Hard Rule #22–#23.

---

## ⛔ Anti-Hallucination Guardrails

> [!CAUTION]
> DO NOT invent topbar ids outside the Epic §2 table of **10**.  
> DO NOT add primary sidebar leaves for Labs, Testing, MCP, CoreMCP, Agents, Media.  
> DO NOT mount product chrome or create live fusion pages in this task.  
> DO NOT put Traffic Inspector on Operations topbar.  
> DO NOT leave “or” destination shapes in frozen constants / Completion Evidence.  
> DO NOT overwrite UI.md reverse-chrome (0076), live primary (§2.1 / 0082), or EPIC-19 planned sections (0078).  
> DO NOT mark complete without running the new matrix unit test and recording output.

> [!IMPORTANT]
> Read EVERY file in Where before writing.  
> Cite EPIC-20 path in JSDoc.  
> If a legacy path is grepped but not in Epic §5, add residual owner note — do not silently drop bookmarks.  
> Pattern after 0078: constants + tests first; product cutover later.

---

## 🛡️ Compliance Checklist (Leis Primárias do AGENTS.md)

- [ ] **Doc Accuracy**: Paths/ids grepped against live code before documenting  
- [ ] **Zod Validation**: N/A or typed string unions / guards only  
- [ ] **Security**: No secrets  
- [ ] **Error Sanitization**: N/A  
- [ ] **No Raw SQL**: N/A  
- [ ] **Archive Protocol**: Docs/constants only; no silent deletes of product routes  
- [ ] **Chrome law (HR #22)**: Exactly one Operations topbar peer list frozen; no dual Endpoint sub-topbar ids  
- [ ] **Self-evident paths (HR #23)**: Canonical `/operations/{id}` only  

---

## 📋 Completion Evidence (preenchido pelo agente executor)

- **Arquivos criados/modificados**:
  - **Created** `src/shared/constants/epic20Operations.ts` — 10 topbar ids + labels + builders + `OPERATIONS_REDIRECT_MATRIX` + Traffic Observe freeze
  - **Created** `tests/unit/ui/epic20-operations-matrix-0086.test.ts` — 25 asserts (ids, builders, matrix, anti-leaf, anti multi-topbar, UI.md section)
  - **Modified** `docs/guides/UI.md` — only `## EPIC-20 Operations hub reform (planned)` + Related docs row
  - **Modified** `CHANGELOG.md` Unreleased Added bullet
- **Testes que verificam o trabalho**: `tests/unit/ui/epic20-operations-matrix-0086.test.ts`
- **Resultado dos testes**:
  ```
  node --import tsx/esm --test tests/unit/ui/epic20-operations-matrix-0086.test.ts
  # 25 pass / 0 fail
  ```
- **Resultado do lint**: not run full-repo (constants/docs only); no product chrome touched
- **Resultado do typecheck/build**: `npm run typecheck:core` — pass (exit 0)
- **Matrix dump (10 ids + from→to rows)**:
  - Ids (order): `endpoints`, `core-mcp`, `agents`, `cloud-agents`, `a2a-acp-bridge`, `skills`, `integrations`, `memory`, `labs`, `media`
  - Paths: `/operations/{id}` via `buildOperationsPath`
  - Hub root: `/operations` via `buildOperationsHubPath`
  - Redirect rows (unique `from`):  
    `/dashboard/operations` → `/operations`  
    `/dashboard/api-manager` | `/dashboard/endpoint` | `?tab=apis` | `CONNECT_CATALOG_SSOT_HREF` | `api-endpoints` → `/operations/endpoints`  
    `/dashboard/endpoint?tab=context-sources` → `/operations/integrations`  
    `/dashboard/mcp` → `/operations/core-mcp`  
    `/dashboard/cli-agents` | `cli-code` → `/operations/agents`  
    `/dashboard/cloud-agents` → `/operations/cloud-agents`  
    agent-bridge | a2a | acp-agents → `/operations/a2a-acp-bridge`  
    omni-skills | agent-skills → `/operations/skills`  
    webhooks | plugins → `/operations/integrations`  
    memory (+ tab aliases) → `/operations/memory`  
    playground | translator | search-tools | batch | batch/files | testing → `/operations/labs`  
    `/dashboard/cache/media` → `/operations/media`  
    `/dashboard/tools/traffic-inspector` → `/dashboard/activity?panel=traffic` (Observe)
- **Hub default choice**: **`/operations`** hub root; shell default topbar id **`endpoints`** (`OPERATIONS_DEFAULT_TOPBAR_ID`) — not `/operations/endpoints` as hub URL
- **Traffic frozen destination**: **`/dashboard/activity?panel=traffic`** (`EPIC20_TRAFFIC_INSPECTOR_PATH` / `buildObserveTrafficInspectorPath()`) — T20-M / 0098 owns mount; **not** Operations topbar
- **Agente executor**: gt-ts-engineer (builders)
- **Data de conclusão**: 2026-07-20

---

## 🔍 Review Trail (preenchido pelo reviewer)

- **Reviewer**: gt-frontend-quality-reviewer (+ docs); parent=`builders`
- **Data da review**: 2026-07-20
- **Veredito**: **ACCEPTED_100** — moved `02-doing` → `03-review`
- **Score (path to 100)**: **100/100** (no path-to-100 edits required)
- **Report**: `docs/reports/reviews/2026-07-20-task-0086-epic20-ssot-review.md`
- **Notas**:
  - Freeze contract complete: 10 topbar ids (Epic §2 order), `buildOperationsPath` → `/operations/{id}`, hub root `/operations` + shell default `endpoints`, 30-row matrix all `to` from builders, Traffic frozen to `/dashboard/activity?panel=traffic` (Observe, not Ops topbar).
  - Anti-leaf (primary still length 7 / single `operations`) + anti multi-topbar (no Endpoint/MCP sub-topbar peers) asserted in unit tests **25/25**.
  - UI.md only planned EPIC-20 section (+ Related-docs index); reverse-chrome / §2.1 / EPIC-19 untouched.
  - `typecheck:core` green; no live `/operations/*` product routes.
  - Non-blocking info: optional future matrix row for `/dashboard/cli-tools` (already next.config → `cli-code` → agents).

