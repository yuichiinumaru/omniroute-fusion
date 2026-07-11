# Task 0047: Dashboard Error Object UX + MCP Tool/Scope SSoT

> **Status**: `[x]` Ready for review
> **Priority**: 🟠 P1
> **Type**: `remediation`
> **Origin**: Epic 0008 — Adversarial Remediation (S8)
> **Action type**: FIX + EXTEND
> **Blocks**: none
> **Depends on**: soft — Task 0044 if server scope constants move (prefer shared export)
> **Architect-2**: Upgraded 2026-07-11 — use existing `extractApiErrorMessage` / `apiErrorMessage.ts`; concrete hub paths

---

## Source reports (builder reference)

Primary:
- `docs/reports/08-app-ui-shared.md` — F-08-001, F-08-002, F-08-003 (stretch: F-08-004–008, F-08-W2-001–005)

Also relevant:
- `docs/reports/00-wave-plan-exclusions.md` — exclusions context (frontend IA **0023–0031** already tracked)
- Live MCP constants may be produced by Task **0044** / `docs/reports/04-mcp-edge-runtime.md` (soft dependency for SSoT exports)

---

## Objective

Fix operator-facing **incorrectness and drift** in the dashboard/shared layer:

1. **F-08-001**: Structured API errors must not render as `[object Object]` — funnel dashboard `!res.ok` paths through existing extractors (`extractApiErrorMessage` / `getErrorMessage` / `readFetchErrorMessage`), not a second invent helper.
2. **F-08-002**: MCP hub intro must not hardcode obsolete tool/scope counts — read from live constants.
3. **F-08-003**: Shared `MCP_SCOPE_LIST` / `MCP_TOOL_SCOPES` must match live MCP server tool registration (SSoT or generated check).

Stretch: OAuth `noopener` (F-08-004, F-08-W2-003), OAuth state (F-08-005), untrusted href schemes (F-08-008, F-08-W2-001, F-08-W2-005), live WS race (F-08-W2-002).

## Background Context

### Finding IDs

| ID | Severity | Title |
|----|----------|-------|
| **F-08-001** | P1 | Structured API errors render as `[object Object]` |
| **F-08-002** | P1 | MCP hub intro hardcodes obsolete tool/scope counts |
| **F-08-003** | P1 | Shared MCP_SCOPE_LIST / MCP_TOOL_SCOPES drift from live tools |
| Stretch | P2 | F-08-004–008, F-08-W2-001–005 |

See **Source reports** above for full relative paths.

### Evidence anchors (verified 2026-07-11)

- **Already-correct helpers**: `src/shared/http/apiErrorMessage.ts`, `src/shared/utils/api.ts` (`getErrorMessage` / `extractApiErrorMessage`) — underused
- Broken patterns: `new Error(data.error)` when `data.error` is object — e.g. webhooks, audit tabs, ProviderQuotaWidget, ApiEndpointsTab (see report list)
- `src/app/(dashboard)/dashboard/mcp/page.tsx:319` — `t("mcpIntro", { tools: 37, scopes: 13, transports: 3 })`
- `src/shared/constants/mcpScopes.ts` — incomplete vs live tools (memory/skills/plugins/notion/obsidian/gamification scopes missing)
- Live inventory: `open-sse/mcp-server/server.ts` `TOTAL_MCP_TOOL_COUNT`

### Exclusions

- Frontend IA sidebar/theme/field-kit tasks **0023–0031** — do not reopen IA contracts
- Fusion UI **0015–0016** — out of scope

### Out of scope

- Full i18n sweep (P3 hardcoded English unless adjacent to touched strings)
- Backend MCP security (0044) beyond consuming stable exports

---

## Test Requirements

- MUST: unit test for error extractor: object `{ error: { message: "x" } }` → `"x"`; string passthrough; fallback safe string (not `[object Object]`)
- MUST: MCP hub count source equals `TOTAL_MCP_TOOL_COUNT` / live scope length (or test that UI imports the same module as server)
- MUST: scope list parity check script or unit test fails if server tools reference unknown scopes / missing scopes (extend beyond pool-only `mcp-pool-tools-3368.test.ts`)
- Prefer pure unit tests; component tests optional if vitest UI not required

---

## Exit Conditions (GDD/TDD)

- [x] F-08-001 fixed via existing helpers + high-traffic call sites from report rewired
- [x] F-08-002 hub uses live counts (no hardcode 37/13)
- [x] F-08-003 shared maps aligned with server (or single export)
- [x] Unit tests pass
- [x] `npm run typecheck:core` passes
- [x] `npm run lint` — no new errors
- [x] CHANGELOG.md entry (dashboard/mcp)

---

## Details

### What

Subtasks:

- [x] **Ler código existente** e o report em `docs/reports/08-app-ui-shared.md` listado em Source reports: `src/shared/http/apiErrorMessage.ts`, `src/shared/utils/api.ts`, report-listed call sites, `src/app/(dashboard)/dashboard/mcp/page.tsx`, `src/shared/constants/mcpScopes.ts`, `open-sse/mcp-server/server.ts` (`TOTAL_MCP_TOOL_COUNT`, scopes)
- [x] Prefer extending/wiring `extractApiErrorMessage` / `getErrorMessage` — do not invent parallel `formatApiError` unless helpers are inadequate
- [x] Replace worst `[object Object]` call sites (at least those listed in report)
- [x] SSoT counts + scopes for hub
- [x] Parity test server scopes vs shared list (all tool modules)
- [ ] Stretch href allowlist helper if quick (deferred)
- [x] CHANGELOG

### Where

| Arquivo | Propósito |
|---------|-----------|
| `src/shared/http/apiErrorMessage.ts` | Ler/estender se needed |
| `src/shared/utils/api.ts` | Ler/estender — handleResponse safety |
| Dashboard call sites from report (webhooks, audit, quota widget, …) | Modificar |
| `src/app/(dashboard)/dashboard/mcp/page.tsx` | Modificar — live counts |
| `src/shared/constants/mcpScopes.ts` | Modificar + align |
| `open-sse/mcp-server/server.ts` | Ler (+ export if needed) |
| `tests/unit/` | Expandir (incl. scope parity) |
| `CHANGELOG.md` | Entry |

### How

1. Grep `new Error(data.error` and `String(error)` toast paths.
2. Grep hardcoded MCP tool counts (37/94/scopes).
3. Diff shared scopes vs server tool `scopes` fields across **all** tool modules.

### Why

Operators cannot debug failed management actions when errors stringify to `[object Object]`, and obsolete MCP counts cause wrong capability assumptions / scope UI drift.

---

## ⛔ Anti-Hallucination Guardrails

> [!CAUTION]
> DO NOT invent tool counts — import live constants or compute from registry.
> DO NOT expand frontend IA navigation work.
> DO NOT invent a second error formatter if `extractApiErrorMessage` already exists — wire it.
> DO NOT claim all dashboard errors fixed without grepping remaining raw toasts (document residual if any).

> [!IMPORTANT]
> First subtask: read existing code. Prefer one helper over N one-offs.

---

## 🛡️ Compliance Checklist (Leis Primárias do AGENTS.md)

- [x] **Doc Accuracy**: counts from source
- [x] **i18n**: new user-visible strings via next-intl if added
- [ ] **Security**: href stretch uses scheme allowlist
- [x] **Tests**
- [x] **No fabricated APIs**

---

## 📋 Completion Evidence (preenchido pelo agente executor)

- **Arquivos criados/modificados**:
  - `src/shared/utils/api.ts` — handleResponse via parseResponseBody + getErrorMessage
  - `src/shared/constants/mcpScopes.ts` — full live MCP_SCOPE_LIST (31) + MCP_TOOL_SCOPES (93) + counts
  - `src/app/(dashboard)/dashboard/mcp/page.tsx` — live MCP_TOOL/SCOPE/TRANSPORT counts
  - `open-sse/mcp-server/server.ts` — export TOTAL_MCP_TOOL_COUNT
  - Dashboard call sites: webhooks/*, audit/*, ProviderQuotaWidget, ApiEndpointsTab, usePreviewCompression
  - Tests: `tests/unit/api-handle-response-0047.test.ts`, `tests/unit/mcp-scope-parity-0047.test.ts`
  - `CHANGELOG.md`
- **Finding IDs closed**: F-08-001, F-08-002, F-08-003 (stretch F-08-004–008 deferred)
- **Residual raw `data.error` toasts** (not report primary list): settings tabs (Pricing/Mitm/AccessTokens/Resilience), providers page/import hooks, OAuth modals/services, runtime ModelCooldownsCard, translator, agent-bridge — same extractor pattern when touched later
- **Testes**: `node --import tsx/esm --test tests/unit/api-handle-response-0047.test.ts tests/unit/mcp-scope-parity-0047.test.ts tests/unit/api-error-message-5340.test.ts tests/unit/mcp-pool-tools-3368.test.ts` — pass
- **typecheck / lint**: `npm run typecheck:core` clean; eslint on touched files — 0 new errors (3 pre-existing any warnings in server.ts)
- **CHANGELOG**: Unreleased Fixed entry Task 0047
- **Agente executor**: builder (Grok Build)
- **Data de conclusão**: 2026-07-11


---

## 🔍 Review Trail (preenchido pelo reviewer)

- **Reviewer**:
- **Veredito**:
- **Score**:
- **Notas**:
