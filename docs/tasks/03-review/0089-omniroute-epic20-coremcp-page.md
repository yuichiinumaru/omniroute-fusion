# Task 0089: EPIC-20 T20-D — CoreMCP Rename + Page at `/operations/core-mcp`

> **Status**: `[x]` Implemented — reviewed 2026-07-20 (score **100**; path-to-100 applied; 03-review)  
> **Priority**: 🔴 P0  
> **Type**: `feature` + `remediation`  
> **Action type**: UX_VIS + HARDEN  
> **Origin**: EPIC-20 §2 topbar #2 `core-mcp` (**CoreMCP**) + §5 path matrix + §7 T20-D + success metric “CoreMCP naming” — `docs/tasks/00-planning/EPIC-20-omniroute-operations-hub-reform.md`; `AGENTS.md` Dashboard IA; `CLAUDE.md` #22–#23; UI.md §1.1  
> **Blocks**: none hard  
> **Depends on**: **0086** hard; **0087** hard (shell + `/operations/core-mcp` host); soft: **0088** (Endpoint must drop protocol strip — ideally 0088 first or same train, but CoreMCP page can land if Endpoint strip already not required)  
> **Parallelism**: **`parallel-safe` vs 0088 and 0090`** with exclusive file ownership; serializable vs 0086/0087  
> **Review routing**: frontend-quality; independent CoreMCP PR  

---

## Objective

Promote OmniRoute’s **control-plane MCP Server** UI to Operations peer **CoreMCP** at **`/operations/core-mcp`**, with rename that disambiguates from MetaMCP / future Cybernetics layers, and redirect **`/dashboard/mcp`**.

**Done when:**

1. Canonical page at `/operations/core-mcp` renders existing MCP dashboard functionality (enable/toggle, transports, tool UI via `McpDashboardPage` / current `mcp/page.tsx` body).  
2. UI chrome labels use **CoreMCP** (page title, Operations topbar peer from 0086, hub cards if still linked).  
3. **Exactly one** Operations topbar (0087 layout) — no second MCP-only topbar, no Endpoint protocol strip dependency.  
4. `/dashboard/mcp` redirects to 0086 `buildOperationsPath("core-mcp")`.  
5. Explainers (intro steps wall, if present) → bottom or collapsible, **default collapsed** where they are prose cards (keep operational controls usable at top).  
6. Anti-phantom + redirect tests green; **0 new primary leaves**.

---

## Background Context

### O que já existe:

- Live page: `src/app/(dashboard)/dashboard/mcp/page.tsx` — enable toggle, transport picker, embeds `endpoint/components/MCPDashboard`.  
- Separate A2A page: `dashboard/a2a/page.tsx` (not this task).  
- Endpoint protocol strip still deep-links MCP (killed in **0088**).  
- Ops hub card still labels “MCP Server” → `/dashboard/mcp` (`operationsHub.ts`).  
- i18n namespace `mcpDashboard` likely still says “MCP” — rename user-visible **CoreMCP** for Ops chrome + page H1; full i18n sweep can be minimal keys touched this task.  
- Shell: **0087** stub peer `core-mcp`.

### O que está faltando / quebrado:

- Name collides with future MetaMCP / CC layers (operator rename lock).  
- Not under `/operations/{id}` pilot path.  
- Still discoverable mainly via card launchpad / old sidebar hideables, not Ops topbar peer.

### Naming rules

| Surface | Text |
|---------|------|
| Topbar peer label | **CoreMCP** (0086) |
| Page title / H1 | CoreMCP (or i18n key defaulting to CoreMCP) |
| Technical strings (stdio flag, `/api/mcp/*` URLs) | **keep** `mcp` — do not rename API routes |
| Docs touch | Only if required for in-app copy consistency; no fabricated MetaMCP product |

### Explicitly out of scope:

- MetaMCP multi-layer product.  
- A2A/ACP Bridge fusion (T20-G).  
- Endpoint Keys/Catalog fusion body (0088) except not reintroducing protocol strip.  
- Agents fusion (0090).  
- Changing MCP server tool count, scopes, or backend.

### Collision notes:

- **0088**: must not leave protocol strip that re-creates dual chrome on endpoints; CoreMCP page must not mount Endpoint tab chrome.  
- **0087 layout**: content-only page under shell.  
- **operationsHub.ts / CommandPalette**: retarget hrefs to builder when grepped.

---

## Dependency & Parallel Safety

| Item | Value |
|------|--------|
| **Depends on** | **0086** hard; **0087** hard; soft **0088** for clean Endpoint strip removal |
| **Blocks** | none hard |
| **File ownership (exclusive)** | `/operations/core-mcp` page body; `dashboard/mcp/page.tsx` redirect shell; MCP page client extraction if needed; i18n keys for visible CoreMCP rename; ops hub / palette MCP hrefs; tests `tests/unit/ui/epic20-coremcp-0089.test.ts` |
| **Do not touch** | Endpoint fusion body (0088); cli-agents/cli-code (0090); MCP backend/server modules; A2A page product (except outbound links if grepped) |
| **Collision vs live lanes** | parallel-safe vs 0088/0090 if exclusive paths held |
| **parallel-safe** | **Yes vs 0088 and 0090** with ownership; **serializable vs 0086/0087** |

---

## Test Requirements

- DEVE servir MCP functionality em `/operations/core-mcp`  
- DEVE redirecionar `/dashboard/mcp` → `buildOperationsPath("core-mcp")`  
- DEVE expor label **CoreMCP** no topbar peer list (0086/0087 SSoT) e page title source  
- DEVE montar **exactly one** Operations topbar on core-mcp route  
- DEVE NÃO montar Endpoint `ENDPOINT_TABS` or a second MCP-only hub strip  
- DEVE manter API paths `/api/mcp/*` unchanged (assert no accidental rename of route strings)  
- DEVE assertir **0 new primary leaves**  
- DEVE colapsar prose explainers by default when present as cards  
- NÃO DEVE implement MetaMCP  

---

## Exit Conditions (GDD/TDD)

- [ ] `/operations/core-mcp` live with full MCP dashboard behavior  
- [ ] `/dashboard/mcp` redirect via 0086 builder  
- [ ] CoreMCP naming visible on peer + page chrome  
- [ ] Anti-phantom + redirect tests: `node --import tsx/esm --test tests/unit/ui/epic20-coremcp-0089.test.ts`  
- [ ] Hub/palette links retargeted where grepped  
- [ ] `npm run typecheck:core` passa sem erros  
- [ ] `npm run lint` passa sem erros novos nos arquivos tocados  
- [ ] Completion Evidence with before/after label notes  

---

## Details

### What

Subtasks:

- [ ] **Ler código existente**: EPIC-20 §2 CoreMCP row; 0086 builders; 0087 layout/stub; `dashboard/mcp/page.tsx`; `endpoint/components/MCPDashboard.tsx`; `operationsHub.ts` mcp link; Header/CommandPalette mcp entries; i18n `mcpDashboard` keys; any tests referencing `/dashboard/mcp`  
- [ ] Wire `/operations/core-mcp` to existing MCP client (import/rehome; no backend change)  
- [ ] Redirect legacy `/dashboard/mcp`  
- [ ] Rename user-visible strings to CoreMCP (minimal i18n)  
- [ ] Explainers → bottom collapsed  
- [ ] Update hub/palette hrefs to builder  
- [ ] TDD redirects + chrome + naming asserts  
- [ ] **Refactoring pass**: thin page wrapper; reuse MCPDashboard  
- [ ] **Verificação de regressão**: 0089 tests + shell regression + typecheck + lint  

### Where

| Arquivo | Propósito |
|---------|-----------|
| `docs/tasks/00-planning/EPIC-20-omniroute-operations-hub-reform.md` | Ler |
| `src/shared/constants/epic20Operations.ts` | Ler |
| `src/app/(dashboard)/operations/core-mcp/page.tsx` | Modificar — real content |
| `src/app/(dashboard)/dashboard/mcp/page.tsx` | Redirect shell |
| `src/app/(dashboard)/dashboard/endpoint/components/MCPDashboard.tsx` | Ler / import |
| `src/shared/constants/operationsHub.ts` | Retarget mcp card → builder + CoreMCP label |
| `src/shared/components/CommandPalette.tsx` | Retarget if grepped |
| `src/shared/components/Header.tsx` | Retarget ops deep meta if grepped |
| `src/i18n/messages/*.json` (minimal keys) | CoreMCP display strings |
| `tests/unit/ui/epic20-coremcp-0089.test.ts` | **Criar** |

### How

1. Confirm 0086/0087 green; prefer 0088 strip kill already merged or verify endpoints no longer requires mcp strip for discoverability.  
2. Move/render MCP page body under operations peer.  
3. Redirect + rename labels.  
4. Collapse prose blocks.  
5. Tests for path, label, single topbar.  

### Why

CoreMCP naming + path pilot makes Operations self-evident and prepares room for future MetaMCP without overloading “MCP Server” on the Endpoint page.

---

## ⛔ Anti-Hallucination Guardrails

> [!CAUTION]
> DO NOT rename `/api/mcp` HTTP routes or MCP protocol tool IDs.  
> DO NOT invent MetaMCP UI layers.  
> DO NOT add a primary sidebar leaf for CoreMCP.  
> DO NOT double-mount Operations topbar.  
> DO NOT leave `/dashboard/mcp` without redirect.  
> DO NOT mark complete without anti-phantom + redirect test output.

> [!IMPORTANT]
> Read EVERY file in Where before writing.  
> Technical `mcp` identifiers stay; user-facing **CoreMCP** only where operators navigate.  
> Cite EPIC-20 rename rationale in PR/Completion Evidence.

---

## 🛡️ Compliance Checklist (Leis Primárias do AGENTS.md)

- [ ] **Doc Accuracy**: Paths grepped; no fabricated MetaMCP APIs  
- [ ] **Zod Validation**: N/A  
- [ ] **Security**: No secrets; MCP still local-only as existing authz  
- [ ] **Error Sanitization**: N/A for pure rehome  
- [ ] **No Raw SQL**: N/A  
- [ ] **Archive Protocol**: Redirect shell; keep MCPDashboard  
- [ ] **Chrome law (HR #22)**: Exactly one Ops topbar  
- [ ] **Self-evident paths (HR #23)**: `/operations/core-mcp`  

---

## 📋 Completion Evidence (preenchido pelo agente executor)

- **Arquivos criados/modificados**:
  - `src/app/(dashboard)/operations/core-mcp/page.tsx` — content-only peer page
  - `src/app/(dashboard)/operations/core-mcp/CoreMcpPageClient.tsx` — MCP enable/transport/dashboard body; CoreMCP H1; explainers collapsible default-collapsed at bottom
  - `src/app/(dashboard)/dashboard/mcp/page.tsx` — redirect shell via `buildOperationsPath("core-mcp")`
  - `src/shared/constants/operationsHub.ts` — MCP card → CoreMCP + builder href
  - `src/shared/components/CommandPalette.tsx` — MCP entry → CoreMCP path/label
  - `src/shared/components/Header.tsx` — deep meta for `/operations/core-mcp` + legacy `/dashboard/mcp` → CoreMCP
  - `src/i18n/messages/en.json` — `sidebar.mcp` / `header.mcp` / `mcpDashboard.pageTitle|howToTitle|howToSubtitle` + disabled copy
  - `tests/unit/ui/epic20-coremcp-0089.test.ts` — **created**
  - `tests/unit/mcp-scope-parity-0047.test.ts` — hub path → CoreMCP client
  - `tests/unit/ui/operations-hub-discoverability-0059.test.ts` — hub/palette assertions for CoreMCP
  - `tests/unit/ui/ops-testing-reverse-chrome-0076.test.ts` — `/operations/*` href→page map
- **Redirect proof**:
  - Legacy page: `redirect(buildOperationsPath("core-mcp"))` → `/operations/core-mcp`
  - Matrix row owner `0089` from `OPERATIONS_REDIRECT_MATRIX` (`/dashboard/mcp` → builder)
- **Label rename list** (user-facing → **CoreMCP**; technical `mcp` kept):
  - Topbar peer SSoT: `OPERATIONS_TOPBAR_LABELS["core-mcp"]` = `CoreMCP` (0086 freeze)
  - Ops hub card label: `MCP Server` → `CoreMCP`
  - CommandPalette fallback: `MCP Server` → `CoreMCP`
  - Header titleFallback: `MCP Server` → `CoreMCP`
  - en.json `sidebar.mcp` / `header.mcp` / `mcpDashboard.pageTitle` → CoreMCP
  - Service toggle label uses `OPERATIONS_TOPBAR_LABELS["core-mcp"]`
  - API paths unchanged: `/api/mcp/*`, `mcpEnabled`, `mcpTransport`, `omniroute --mcp`
- **Testes + output**:
  ```
  node --import tsx/esm --test \
    tests/unit/ui/epic20-coremcp-0089.test.ts \
    tests/unit/mcp-scope-parity-0047.test.ts \
    tests/unit/ui/operations-hub-discoverability-0059.test.ts \
    tests/unit/ui/ops-testing-reverse-chrome-0076.test.ts
  # tests 41 · pass 41 · fail 0
  ```
- **typecheck / lint**:
  - `npm run typecheck:core` — pass
  - `npx eslint` on touched src/test files — pass (0 errors)
- **Agente executor**: gt-ts-engineer (builders)
- **Data de conclusão**: 2026-07-20
- **Notes**: Left in `02-doing` per task instruction (no move to 03-review). Single Ops topbar remains layout-owned (0087); page is content-only. No MetaMCP. No new primary leaves.

---

## 🔍 Review Trail (preenchido pelo reviewer)

- **Reviewer**: `gt-frontend-quality-reviewer` (parent agentID=`builders`)
- **Data da review**: 2026-07-20
- **Veredito**: `ACCEPTED_100` — `03-review`
- **Score (path to 100)**: **100/100** (was 95; residuals applied same session)
- **Report**: `docs/reports/reviews/2026-07-20-task-0089-omniroute-epic20-coremcp-page.md`
- **Notas**:
  - Contract green: CoreMCP peer, builder redirect, single topbar, no MetaMCP, `/api/mcp/*` unchanged.
  - Path-to-100 applied: ServiceToggle `role="switch"` + `aria-checked` + `aria-label`; transport `type`/`aria-pressed`; `mcpCardTitle` → CoreMCP; ARIA test green.
