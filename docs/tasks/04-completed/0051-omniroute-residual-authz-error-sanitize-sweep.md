# Task 0051: Residual Authz + Error Sanitization Sweep (P2 High-Value)

> **Status**: `[x]` Completed (final review 100/100 — promoted 2026-07-18)
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

- [x] Shared API error helper sanitizes by default
- [x] Health public split or field gate landed
- [x] ping public classification fixed
- [x] MCP + A2A sanitize paths fixed
- [x] Targeted tests pass
- [x] `npm run typecheck:core` passes
- [x] `npm run lint` — no new errors
- [x] CHANGELOG.md entry
- [x] Completion Evidence lists residual finding IDs still open (honest backlog)

---

## Details

### What

Subtasks:

- [x] **Ler código existente** e o(s) report(s)
- [x] Fix helper default sanitize
- [x] Health payload split / auth gate detailed fields
- [x] Add ping to PUBLIC_READONLY prefixes
- [x] MCP + A2A sanitize
- [x] Stretch F-07-011 A2A fail-closed
- [x] Grep residual count into evidence
- [x] CHANGELOG

### Where

| Arquivo | Propósito |
|---------|-----------|
| `src/lib/api/errorResponse.ts` | Modificar — sanitize default |
| `open-sse/utils/error.ts` | Expand stack-frame first-line collapse |
| `src/app/api/monitoring/health/route.ts` | Public vs full snapshot |
| `src/shared/constants/publicApiRoutes.ts` | ping PUBLIC_READONLY |
| `open-sse/mcp-server/errorSanitize.ts` | Novo helper MCP |
| A2A route/task/streaming | Fail-closed + sanitize |
| `tests/unit/residual-authz-sanitize-0051.test.ts` | Novo |
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

- [x] **Doc Accuracy**
- [x] **Security**: #12 + authz public surface
- [x] **Error Sanitization**: core goal
- [x] **Tests**
- [x] **Public route docs** synced (classification via publicApiRoutes + classify tests)

---

## 📋 Completion Evidence (preenchido pelo agente executor)

- **Arquivos criados/modificados**:
  - `src/lib/api/errorResponse.ts` — sanitize message + details by default
  - `open-sse/utils/error.ts` — stack-frame first-line collapse + `at /path` redaction
  - `src/lib/monitoring/observability.ts` — `buildPublicHealthPayload`
  - `src/app/api/monitoring/health/route.ts` — public allowlist vs `verifyAuth` full dump
  - `src/shared/constants/publicApiRoutes.ts` — `/api/health/ping` PUBLIC_READONLY
  - `src/app/a2a/route.ts` — fail-closed auth + sanitize JSON-RPC errors
  - `src/lib/a2a/taskExecution.ts`, `src/lib/a2a/streaming.ts` — sanitize artifacts/SSE
  - `open-sse/mcp-server/errorSanitize.ts` (new)
  - `open-sse/mcp-server/server.ts` — `withScopeEnforcement` + `omniRouteFetch` sanitize
  - `open-sse/mcp-server/tools/advancedTools.ts`, `pluginTools.ts` — fetch/handler sanitize
  - Tests: `residual-authz-sanitize-0051`, `public-api-routes`, `classify`, `a2a-enabled-route`, `display-and-error-utils`
  - `CHANGELOG.md` Unreleased Security entry
- **Finding IDs closed**: F-07-014 (helper default), F-07-009, F-07-010, F-04-W2-004, F-06-008, stretch F-07-011
- **Residual grep count / backlog** (honest, post-sweep):
  - `src/app/api/**` raw `error.message` / `err.message` references: **~287** (many logs/comments; not all client-facing)
  - Direct client-facing residual patterns `message|error|details: error.message` in `src/app/api`: **13** sites (e.g. webhooks test, codex/agy/claude auth import/export, vacuum details, images generations, sync-models) — backlog for follow-up route-by-route conversion (helper now covers all `createErrorResponseFromUnknown` call sites: **59**)
  - MCP internal `Error: ${msg}` catch sites: **~41** — all tool registrations go through `withScopeEnforcement` which sanitizes `isError` content + thrown errors; residual string construction is defense-in-depth only
  - Stretch still open (not this PR): F-07-012 Trae state, F-07-013 Content-Disposition, F-07-W2-008 ngrok, F-03-007 requestDedup fields
- **Testes**:
  - `node --import tsx/esm --test tests/unit/residual-authz-sanitize-0051.test.ts tests/unit/public-api-routes.test.ts tests/unit/a2a-enabled-route.test.ts tests/unit/display-and-error-utils.test.ts tests/unit/authz/classify.test.ts tests/unit/health-ping-route.test.ts tests/unit/error-message-sanitization.test.ts tests/unit/observability-payloads.test.ts tests/unit/api-auth.test.ts` — **pass**
- **typecheck / lint**: `npm run typecheck:core` clean; eslint on touched files — 0 new errors (pre-existing `any` warnings in mcp server/pluginTools)
- **CHANGELOG**: Unreleased Security — Task 0051
- **Agente executor**: builder (Task 0051)
- **Data de conclusão**: 2026-07-11

---

## 🔍 Review Trail (preenchido pelo reviewer)

- **Reviewer**: reviewers (Code Quality Reviewer / independent) — 2026-07-11
- **Veredito**: PASS WITH NOTES (hold-in-review; S≥90)
- **Score**: 92/100
- **Notas**:
  - Core exits closed: helper sanitize (F-07-014), public health allowlist (F-07-009), ping PUBLIC_READONLY (F-07-010), MCP wrapper sanitize (F-04-W2-004), A2A fail-closed + sanitize (F-07-011 / F-06-008).
  - Fresh tests: 156 pass / 0 fail on claimed suites.
  - N1 (Medium residual): full health dump via any valid client API key because route is PUBLIC → non-management `verifyAuth` path; unauth still correct. Path-to-100: require manage-scope or dashboard session for full snapshot.
  - N2/N3 accepted residual: 13 raw route sites + sanitizer false-positive on `at /v1/...`.
  - Report: `docs/reports/reviews/2026-07-11-task-0051-residual-authz-sanitize-review.md`
  - Lane: stay `03-review/` (not moved to `02-doing/` or `04-completed/`).

---

## Review Ledger

> [!IMPORTANT]
> Before path-to-100 work, read the latest full report and all reports listed
> under Previous Reports. Persistent findings and regression guards are part of
> the acceptance contract; do not fix the latest finding by undoing a previously
> accepted repair.

### Latest Review

- **Date**: 2026-07-18
- **Reviewer profile**: `reviewers` (independent full re-review + path-to-100)
- **Score**: `100/100`
- **Verdict**: `PASS_PERFECT`
- **Full report**: `docs/reports/reviews/2026-07-18-task-0051-residual-authz-sanitize-final-review.md`
- **Lane outcome**: remains in `03-review/` (final review complete)
- **Task reference**: Task 0051 (`omniroute-residual-authz-error-sanitize-sweep`)

#### Current Open Blockers

- _(none blocking)_ — N2/N3/R1 remain documented accepted residual backlog only

#### Path-to-100 Summary

- ✅ Gate full health on session or management-scoped key
- ✅ DELETE circuit-breaker reset also management-only (fixed unimported `isAuthenticated`)
- ✅ SAFETY on errorResponse unknown cast
- Accepted residual: 13 raw sites + sanitizer `/v1` FP + broader inventory

#### Path-to-100 Fix (2026-07-18 final)

- **N1**: `isManagementCredentialAuthenticated` for GET full snapshot (prior)
- **DELETE**: same management gate (this session — was bare unimported `isAuthenticated`)
- **Tests**: residual-authz-sanitize-0051 + related green; typecheck:core exit 0
- **Lane**: stay `03-review/`

### Previous Reports

- `2026-07-16` — `90/100` — `docs/reports/reviews/2026-07-16-task-0051-residual-authz-sanitize-reaudit.md` (UNTRUSTED prior; superseded)
  - **Carried forward then**: N1 → resolved; N2/N3 accepted residual
  - **Regression guard**: unauth health allowlist; helper sanitize; ping public; A2A fail-closed; MCP wrapper; non-manage key public shape
- `2026-07-11` — `92/100` — `docs/reports/reviews/2026-07-11-task-0051-residual-authz-sanitize-review.md`
  - **Carried forward**: N1 full health via any client key; N2 13 sites; N3 `/v1` false positive
  - **Resolved since**: N1 management gate

## Lane promotion

- **Promoted to 04-completed**: 2026-07-18 — parent reviewer-orchestrator after independent final review **100/100**.
