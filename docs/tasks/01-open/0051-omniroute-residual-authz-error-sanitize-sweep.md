# Task 0051: Residual Authz + Error Sanitization Sweep (P2 High-Value)

> **Status**: `[ ]` Open
> **Priority**: 🟡 P2
> **Type**: `remediation`
> **Origin**: Epic 0008 — Adversarial Remediation (S12)
> **Action type**: HARDEN
> **Blocks**: none
> **Depends on**: Task **0040** (authz matrix), Task **0042** (pipeline sanitize patterns preferred)
> **Architect-2**: Upgraded 2026-07-11 — evidence on raw `createErrorResponseFromUnknown`; coordinate F-04-W2-004 if 0044 stretch incomplete

---

## Source reports (builder reference)

Primary (multi-slice residual sweep):
- `docs/reports/07-app-api.md` — F-07-014, F-07-009, F-07-010 (stretch high-ROI F-07-011–015, F-07-W2-*)
- `docs/reports/04-mcp-edge-runtime.md` — F-04-W2-004 (MCP tool error sanitize; if not closed as 0044 stretch)
- `docs/reports/06-lib-features-tooling.md` — F-06-008 (A2A raw `err.message`)

Also relevant:
- `docs/reports/00-wave-plan-exclusions.md` — exclusions context; do not re-open fusion/dual-mode/IA
- `docs/reports/01-open-sse-pipeline.md` — pipeline sanitize patterns preferred from Task **0042**
- Stretch residuals may touch `docs/reports/03-open-sse-services.md`, `docs/reports/05-lib-data-auth.md`, `docs/reports/08-app-ui-shared.md` if left open by sibling tasks

Hard Rule: **#12**.

---

## Objective

Close residual **cross-cutting P2** items that remain after P0/P1 clusters, focusing on reusable fixes:

1. **F-07-014**: Widespread raw `err.message` in API routes — fix `createErrorResponseFromUnknown` to sanitize by default; convert high-traffic catch sites.
2. **F-07-009**: Split public monitoring health into minimal public vs authenticated full snapshot.
3. **F-07-010**: Classify `/api/health/ping` as public readonly liveness (docs/code alignment).
4. **F-04-W2-004**: MCP tool error paths sanitize upstream bodies / `err.message` (if not already closed as 0044 stretch).
5. **F-06-008**: A2A surfaces sanitize `err.message` in client/task artifacts.

Stretch inventory (pick highest ROI after core): F-07-011 A2A fail-closed without env key; F-07-012 Trae state; F-07-013 Content-Disposition; F-07-W2-008 ngrok; F-03-007 requestDedup fields; F-08 href schemes if 0047 left residual; F-05-007 encrypt fail-closed if 0041 left residual.

## Background Context

### Finding IDs (core)

| ID | Severity | Title |
|----|----------|-------|
| **F-07-014** | P2 | Widespread raw `err.message` in API error JSON |
| **F-07-009** | P2 | Public monitoring/health rich internal state |
| **F-07-010** | P2 | `/api/health/ping` MANAGEMENT but documented public |
| **F-04-W2-004** | P2 | MCP tool errors raw message / upstream body |
| **F-06-008** | P2 | A2A raw `err.message` to clients/artifacts |

See **Source reports** above for full relative paths (multi-slice).

### Evidence anchors (verified 2026-07-11)

- `src/lib/api/errorResponse.ts:37-53` — `createErrorResponseFromUnknown` passes `anyError.message` without `sanitizeErrorMessage`
- Prefer reuse of `open-sse/utils/error.ts` sanitizers (same helpers as pipeline 0042)

### Out of scope

- Re-doing P0/P1 owned by 0040–0050
- Fusion residuals deferred to 03-review
- Full lint ban on `error.message` repo-wide in one PR if too large — land helper + highest-risk routes, list residual greps

---

## Test Requirements

- MUST: `createErrorResponseFromUnknown` (or equivalent) never returns stack path in `error.message` for `new Error("at /tmp/x\\n    at foo")`
- MUST: unauthenticated GET monitoring health does not include full breaker/session dump (or fields gated)
- MUST: GET `/api/health/ping` succeeds without auth when requireLogin true
- MUST: MCP tool failure response sanitized (unit/vitest)
- MUST: A2A error artifact/message sanitized
- Document residual `err.message` grep count after sweep if incomplete

---

## Exit Conditions (GDD/TDD)

- [ ] Shared API error helper sanitizes by default
- [ ] Health public split or field gate landed
- [ ] ping public classification fixed
- [ ] MCP + A2A sanitize paths fixed
- [ ] Targeted tests pass
- [ ] `npm run typecheck:core` passes
- [ ] `npm run lint` — no new errors
- [ ] CHANGELOG.md entry
- [ ] Completion Evidence lists residual finding IDs still open (honest backlog)

---

## Details

### What

Subtasks:

- [ ] **Ler código existente** e o(s) report(s) em `docs/reports/07-app-api.md`, `docs/reports/04-mcp-edge-runtime.md`, `docs/reports/06-lib-features-tooling.md` (+ `docs/reports/00-wave-plan-exclusions.md`) listados em Source reports: `src/lib/api/errorResponse.ts` (`createErrorResponseFromUnknown`), `open-sse/utils/error.ts` sanitizers, `src/app/api/monitoring/health/route.ts`, `src/app/api/health/ping/route.ts`, `publicApiRoutes.ts`, MCP tool error wrappers, A2A route/task manager error paths, sample routes from F-07-014 list
- [ ] Fix helper default sanitize
- [ ] Health payload split / auth gate detailed fields
- [ ] Add ping to PUBLIC_READONLY prefixes
- [ ] MCP + A2A sanitize
- [ ] Sweep highest-risk API catches listed in report
- [ ] Grep residual count into evidence
- [ ] CHANGELOG

### Where

| Arquivo | Propósito |
|---------|-----------|
| `src/lib/api/errorResponse.ts` | Modificar — sanitize default |
| `open-sse/utils/error.ts` | Ler — reuse |
| `src/app/api/monitoring/health/route.ts` | Modificar |
| `src/app/api/health/ping/route.ts` | Ler |
| `src/shared/constants/publicApiRoutes.ts` | Modificar — ping |
| MCP error path modules | Modificar |
| A2A error surfaces | Modificar |
| High-risk API routes from report sample | Modificar |
| `tests/unit/` | Expandir |
| `CHANGELOG.md` | Entry |

### How

1. Make one helper safe; migrate call sites gradually.
2. Prefer allowlist for public health fields (`status`, `version`, `uptime`) vs full recon dump.
3. Align ping with FeatureFlagsGrid / restart poll expectations.

### Why

Even after P0 gates, residual raw errors and public recon endpoints keep Hard Rule #12 and operator privacy incomplete. A shared helper prevents reintroduction.

---

## ⛔ Anti-Hallucination Guardrails

> [!CAUTION]
> DO NOT remove public liveness entirely without replacing ping/health for k8s/UI.
> DO NOT claim zero `err.message` in repo without grep evidence.
> DO NOT re-open fusion or dual-mode tasks.

> [!IMPORTANT]
> First subtask: read existing code. Prefer completeness of helper over 100 route edits in one sitting — document residuals.

---

## 🛡️ Compliance Checklist (Leis Primárias do AGENTS.md)

- [ ] **Doc Accuracy**
- [ ] **Security**: #12 + authz public surface
- [ ] **Error Sanitization**: core goal
- [ ] **Tests**
- [ ] **Public route docs** synced

---

## 📋 Completion Evidence (preenchido pelo agente executor)

- **Arquivos criados/modificados**:
- **Finding IDs closed**:
- **Residual grep count / backlog**:
- **Testes**:
- **typecheck / lint**:
- **CHANGELOG**:
- **Agente executor**:
- **Data de conclusão**:

---

## 🔍 Review Trail (preenchido pelo reviewer)

- **Reviewer**:
- **Veredito**:
- **Score**:
- **Notas**:
