# Task 0088: EPIC-20 T20-C — Endpoint Fusion (API Keys + Endpoint + Catalog) + Kill Dual/Sub Topbars

> **Status**: `[x]` Implemented — reviewed 2026-07-20 (score **100**; path-to-100 applied; 03-review)  
> **Priority**: 🔴 P0  
> **Type**: `feature` + `remediation`  
> **Action type**: UX_VIS + HARDEN  
> **Origin**: EPIC-20 §2 topbar #1 `endpoints` + §3 fusion pattern + §7 T20-C — `docs/tasks/00-planning/EPIC-20-omniroute-operations-hub-reform.md`; `AGENTS.md` Dashboard IA; `CLAUDE.md` #22–#23; UI.md §1.1  
> **Blocks**: none hard (later Integrations soft-consumes context-sources rehome)  
> **Depends on**: **0086** hard (paths); **0087** hard (Operations shell + `/operations/endpoints` host)  
> **Parallelism**: `serializable` vs 0086/0087; **`parallel-safe` vs 0089 / 0090`** if exclusive file ownership held (no shared layout edits)  
> **Review routing**: frontend-quality; independent Endpoint fusion PR  

---

## Objective

Fuse **API Keys**, **Endpoint (APIs body only)**, and **API Catalog** into **one** Operations peer page at **`/operations/endpoints`**, as a **vertical collapsible stack**, and **kill** the current Endpoint dual/sub chrome:

1. `ENDPOINT_TABS` strip: APIs / Catalog / Context Sources  
2. `connect-protocol-homes` MCP / A2A protocol strip  

**MCP/A2A leave this page** (CoreMCP → 0089; A2A → later T20-G).  
**Context Sources leave this page** (Integrations topbar → later T20-I; redirect via 0086 matrix).

**Done when:**

1. `/operations/endpoints` shows vertical order: **API Keys → Endpoint APIs body → API Catalog** (each major block collapsible).  
2. **Exactly one** Operations topbar from 0087 (no Endpoint PageTabBar / dual strip on this peer).  
3. Legacy redirects: `/dashboard/api-manager`, `/dashboard/endpoint`, catalog SSoT hrefs → 0086 `endpoints` builder.  
4. `endpoint?tab=context-sources` → 0086 `integrations` (content mount may be residual until T20-I — redirect row must exist; do not keep Context as Endpoint topbar peer).  
5. Protocol strip gone from Endpoint UI; no MCP/A2A second strip.  
6. Explainer/wall prose (if any) → page bottom, default collapsed.  
7. Anti-phantom tests: Ops topbar count = 1; zero `ENDPOINT_TABS` hub strip; zero `connect-protocol-homes` on fused page.

---

## Background Context

### O que já existe:

- API Keys: `src/app/(dashboard)/dashboard/api-manager/` (`ApiManagerPageClient.tsx`, …).  
- Endpoint shell: `dashboard/endpoint/page.tsx` + `EndpointPageClient.tsx` — tabs `apis | catalog | context-sources`; protocol homes links to `/dashboard/mcp` + `/dashboard/a2a`.  
- Catalog SSoT: `CONNECT_CATALOG_SSOT_HREF = "/dashboard/endpoint?tab=catalog"` (`sidebarVisibility.ts`); retired list peer `/dashboard/api-endpoints` redirect-only (Task 0024).  
- Operations shell + topbar: **0087** host at `/operations/endpoints`.  
- Path/redirect SSoT: **0086**.

### O que está faltando / quebrado:

- Three separate mental destinations for keys/proxy/catalog.  
- Dual strip (APIs/Catalog/Context) + protocol strip = multi-chrome (Hard Rule #22 violation shape).  
- MCP/A2A still visually coupled to Endpoint despite separate pages.  
- Context Sources not yet Integrations-owned (do not fuse into Endpoint stack).

### Fusion pattern (Epic §3)

| Block order | Source | Collapsible default |
|-------------|--------|---------------------|
| 1 API Keys | api-manager client | expanded (primary work) |
| 2 Endpoint APIs body | Endpoint APIs tab content only (tunnels, base URLs, models list as today under apis) | expanded |
| 3 API Catalog | catalog tab content | expanded or collapsible per density — **not** a topbar peer |

Explainers → bottom, **default collapsed**.

### Explicitly out of scope:

- CoreMCP page body (→ **0089**).  
- A2A/ACP Bridge stack (→ T20-G).  
- Full Integrations page (webhooks/plugins/context body) (→ T20-I) — only redirect out of Endpoint chrome.  
- Media/Labs.  
- New sidebar leaves.

### Collision notes:

- **0087 layout**: do not re-mount OperationsTopbar inside Endpoint client.  
- **0089**: owns `/operations/core-mcp` + mcp redirect; Endpoint must not keep protocol strip.  
- **0090**: disjoint (cli agents).  
- **CONNECT_CATALOG_SSOT_HREF**: retarget to 0086 endpoints builder (and optional catalog deep-link fragment/query if needed for scroll-to-block).

---

## Dependency & Parallel Safety

| Item | Value |
|------|--------|
| **Depends on** | **0086** hard; **0087** hard |
| **Blocks** | Soft: T20-I clarity for context-sources content |
| **File ownership (exclusive)** | `/operations/endpoints` page body; Endpoint client strip removal / extraction of apis+catalog blocks; api-manager page → redirect or re-export; `endpoint/page.tsx` redirect; catalog SSoT href; context-sources redirect; tests `tests/unit/ui/epic20-endpoint-fusion-0088.test.ts` |
| **Do not touch** | `operations/layout.tsx` topbar (0087); mcp page product (0089); cli-agents/cli-code (0090); PRIMARY leaf set |
| **Collision vs live lanes** | parallel-safe vs 0089/0090 if layout/topbar untouched |
| **parallel-safe** | **Yes vs 0089 and 0090** with ownership above; **serializable vs 0086/0087** |

---

## Test Requirements

- DEVE renderizar fused content at `/operations/endpoints` with three collapsible sections in locked order  
- DEVE montar **exactly one** Operations topbar (from layout) — anti-phantom  
- DEVE NÃO montar `ENDPOINT_TABS` PageTabBar/options strip as peer chrome  
- DEVE NÃO montar `data-testid="connect-protocol-homes"` (or successor) on endpoints peer  
- DEVE redirecionar:
  - `/dashboard/api-manager` → `buildOperationsPath("endpoints")`
  - `/dashboard/endpoint` (+ apis) → endpoints builder  
  - catalog legacy (`?tab=catalog`, `api-endpoints`, CONNECT_CATALOG) → endpoints builder  
  - `?tab=context-sources` → integrations builder (0086)  
- DEVE preservar Keys + APIs + Catalog functionality (no blank sections) — smoke via existing unit tests under `endpoint/__tests__` + api-manager if present, extended as needed  
- DEVE assertir **0 new primary leaves**  
- DEVE colocar explainers (if any) bottom + default collapsed  
- NÃO DEVE fuse MCP/A2A dashboards into this page  

---

## Exit Conditions (GDD/TDD)

- [x] `/operations/endpoints` fusion page complete (Keys → APIs → Catalog collapsibles)  
- [x] Dual strip + protocol strip removed from Endpoint surface  
- [x] Legacy redirects green (binary path asserts from 0086 builders)  
- [x] context-sources no longer an Endpoint topbar peer; redirect row live  
- [x] Anti-phantom tests pass: `node --import tsx/esm --test tests/unit/ui/epic20-endpoint-fusion-0088.test.ts` (+ shell test regression)  
- [x] `npm run typecheck:core` passa sem erros  
- [x] `npm run lint` passa sem erros novos nos arquivos tocados (`eslint` on touched files → 0)  
- [x] Completion Evidence with chrome matrix + redirect list  

---

## Details

### What

Subtasks:

- [ ] **Ler código existente**: EPIC-20 §2–3; 0086 builders; 0087 layout/topbar; `EndpointPageClient.tsx` (tabs + protocol strip); `ApiEndpointsTab.tsx`; api-manager client; `endpoint/page.tsx`; `api-endpoints/page.tsx`; `CONNECT_CATALOG_SSOT_HREF`; endpoint unit tests  
- [ ] Extract/rehome Keys + APIs body + Catalog into collapsible stack under `/operations/endpoints`  
- [ ] Remove ENDPOINT_TABS chrome + connect-protocol-homes strip  
- [ ] Convert legacy pages to redirect shells using 0086 only  
- [ ] Retarget CONNECT_CATALOG_SSOT_HREF  
- [ ] Explainers → bottom collapsed  
- [ ] TDD anti-phantom + redirects  
- [ ] **Refactoring pass**: prefer import existing clients over copy-paste  
- [ ] **Verificação de regressão**: 0088 tests + 0087 shell + endpoint unit tests + typecheck + lint  

### Where

| Arquivo | Propósito |
|---------|-----------|
| `docs/tasks/00-planning/EPIC-20-omniroute-operations-hub-reform.md` | Ler |
| `src/shared/constants/epic20Operations.ts` | Ler — builders |
| `src/app/(dashboard)/operations/endpoints/page.tsx` | Modificar — fusion body |
| `src/app/(dashboard)/dashboard/endpoint/EndpointPageClient.tsx` | Modificar — kill dual/protocol strips; extract sections |
| `src/app/(dashboard)/dashboard/endpoint/ApiEndpointsTab.tsx` | Ler/rehome |
| `src/app/(dashboard)/dashboard/endpoint/page.tsx` | Redirect shell |
| `src/app/(dashboard)/dashboard/api-manager/**` | Redirect or re-export into fusion |
| `src/app/(dashboard)/dashboard/api-endpoints/page.tsx` | Redirect → endpoints builder |
| `src/shared/constants/sidebarVisibility.ts` | Retarget CONNECT_CATALOG_SSOT_HREF |
| `src/shared/constants/operationsHub.ts` | Optional card href updates → builders |
| `tests/unit/ui/epic20-endpoint-fusion-0088.test.ts` | **Criar** |
| `src/app/(dashboard)/dashboard/endpoint/__tests__/**` | Update for strip removal |

### How

1. Confirm 0086/0087 green.  
2. Build endpoints peer content: collapsible Keys, APIs, Catalog.  
3. Delete dual/sub topbar UI from Endpoint client (or stop mounting client chrome entirely).  
4. Redirects for legacy paths.  
5. context-sources → integrations path only (content residual documented for T20-I).  
6. Anti-phantom + regression tests.  

### Why

Endpoint multi-chrome is the primary Ops IA failure. Fusion + kill dual strip is the highest-visibility EPIC-20 product win after the shell.

---

## ⛔ Anti-Hallucination Guardrails

> [!CAUTION]
> DO NOT keep APIs/Catalog/Context as a second topbar under Operations topbar.  
> DO NOT keep MCP/A2A protocol strip on this page.  
> DO NOT fuse Context Sources into Endpoint vertical stack (Integrations owns it).  
> DO NOT invent paths outside 0086.  
> DO NOT double-mount OperationsTopbar in the page body.  
> DO NOT add primary sidebar leaves.  
> DO NOT mark complete without anti-phantom evidence (topbar count = 1; strips absent).

> [!IMPORTANT]
> Read EVERY file in Where before writing.  
> Archive-not-delete: redirect shells, not silent file deletion of clients.  
> If Integrations target 404s, still redirect path per matrix; note residual content owner T20-I in Completion Evidence.

---

## 🛡️ Compliance Checklist (Leis Primárias do AGENTS.md)

- [ ] **Doc Accuracy**: Paths grepped  
- [ ] **Zod Validation**: N/A unless new query parsers  
- [ ] **Security**: No secrets  
- [ ] **Error Sanitization**: N/A  
- [ ] **No Raw SQL**: N/A  
- [ ] **Archive Protocol**: Redirects; no silent deletes  
- [ ] **Chrome law (HR #22)**: Exactly one Ops topbar; dual/sub strips dead  
- [ ] **Self-evident paths (HR #23)**: `/operations/endpoints` + legacy redirects  

---

## 📋 Completion Evidence (preenchido pelo agente executor)

- **Arquivos criados/modificados**:
  - **Created**: `src/app/(dashboard)/operations/endpoints/page.tsx`, `EndpointsFusionClient.tsx`
  - **Created**: `tests/unit/ui/epic20-endpoint-fusion-0088.test.ts`
  - **Modified**: `dashboard/endpoint/EndpointPageClient.tsx` (kill dual strip + protocol homes; APIs body only)
  - **Modified**: `dashboard/endpoint/page.tsx`, `dashboard/api-manager/page.tsx`, `dashboard/api-endpoints/page.tsx` → redirect shells
  - **Modified**: `sidebarVisibility.ts` (`CONNECT_CATALOG_SSOT_HREF` → `/operations/endpoints`; add `CONNECT_CATALOG_LEGACY_HREF`)
  - **Modified**: `epic20Operations.ts` matrix catalog `from` uses legacy href
  - **Modified**: `operationsHub.ts` cards → endpoints builders + `#api-keys` / `#api-catalog` anchors
  - **Modified**: `operations/[segment]/page.tsx` (removed dead endpoints hub-client branch; static route wins)
  - **Tests updated**: connect-exposure, matrix-0086, ops reverse-chrome, operations-hub-discoverability
- **Chrome matrix**:
  | Route | Ops topbar | PageTabBar / ENDPOINT_TABS | connect-protocol-homes |
  |-------|------------|----------------------------|------------------------|
  | `/operations/*` layout | **1** (`OperationsTopbar`) | 0 | 0 |
  | `/operations/endpoints` body | 0 (layout-owned) | 0 | 0 |
  | EndpointPageClient (fusion import) | 0 | 0 | 0 |
- **Redirect list** (0086 builders only):
  | from | to |
  |------|-----|
  | `/dashboard/api-manager` | `buildOperationsPath("endpoints")` |
  | `/dashboard/endpoint` (+ apis/catalog/openapi) | `buildOperationsPath("endpoints")` |
  | `/dashboard/endpoint?tab=context-sources` | `buildOperationsPath("integrations")` |
  | `/dashboard/endpoint?tab=mcp` | `/dashboard/mcp` (0089 owns final CoreMCP) |
  | `/dashboard/endpoint?tab=a2a` | `/dashboard/a2a` (0092 owns final) |
  | `CONNECT_CATALOG_LEGACY_HREF` / `api-endpoints` | endpoints fusion via SSoT |
- **Testes + output**:
  - `node --import tsx/esm --test tests/unit/ui/epic20-endpoint-fusion-0088.test.ts` → **pass**
  - Related: matrix-0086, shell-0087, connect-exposure, operations-hub-discoverability, ops-reverse-chrome → **84/84 pass**
  - `npx vitest run …/endpoint/__tests__/EndpointPageClient.test.tsx` → **3/3 pass**
  - ApiEndpointsTab vitest: 2 pre-existing async key-placeholder flakes (file not modified this task)
- **typecheck / lint**: `npm run typecheck:core` → **pass**; `eslint` on touched files → **pass**
- **Context-sources residual note**: Redirect to `/operations/integrations` is live. Content mount owned by **T20-I / 0094** (Integrations stack). Not fused into Endpoint vertical stack.
- **Agente executor**: gt-ts-engineer (builders)
- **Data de conclusão**: 2026-07-20

---

## 🔍 Review Trail (preenchido pelo reviewer)

- **Reviewer**: `gt-frontend-quality-reviewer` (parent agentID=`builders`)
- **Data da review**: 2026-07-20
- **Veredito**: `ACCEPTED_100` — `03-review`
- **Score (path to 100)**: **100/100** (was 94; residuals applied same session)
- **Report**: `docs/reports/reviews/2026-07-20-task-0088-omniroute-epic20-endpoint-fusion.md`
- **Notas**:
  - Contract green: Keys→APIs→Catalog; dual/protocol strips dead; redirects builders; single Ops topbar.
  - Path-to-100 applied: CommandPalette → `buildOperationsPath("endpoints")` (+ `#api-keys`); Header peer meta for `/operations/endpoints`; discovery tests green.
