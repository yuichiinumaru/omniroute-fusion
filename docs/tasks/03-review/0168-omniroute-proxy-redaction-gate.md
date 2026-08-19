# Task 0168: Require PII redaction before proxy enable with high-friction confirm

> **Status**: `[~]` In progress — builder wave assigned (`builders`)
> **Priority**: 🟡 P1
> **Type**: `security UX`
> **Origin**: Proxy security planning — proxy enable is decoupled from PII redaction; user can route LLM traffic through untrusted exit with redaction OFF and no warning.
> **Blocks**: —
> **Depends on**: —
> **Parallelism**: `serializable` with proxy/feature-flag/guardrail UI changes.
> **Review routing**: independent + security + frontend-quality review

---

## Objective

Gate proxy enable behind effective PII redaction status. If redaction is ON,
allow normally. If OFF, show a blocking warning with primary CTA "Enable PII
Redaction & Continue" and secondary path requiring high-friction explicit
confirmation (typed phrase + checkbox). Enforce at both UI and API layers.

This task does NOT flip the PII default to ON (Hard Rule #20 preserved). It only
gates proxy enable behind redaction awareness.

## Background Context

- `PII_REDACTION_ENABLED` and `PII_RESPONSE_SANITIZATION` default `"false"`.
- Proxy config supports global/provider/account/combo/key levels.
- No cross-flag dependency exists between proxy and PII redaction.
- `disabledGuardrails` can suppress `pii-masker` per-request.
- Fork has env-vs-DB drift in `piiMasker`: reads `process.env` directly instead
  of `isFeatureFlagEnabled()` (upstream fixed this).

## Exit Conditions (GDD/TDD)

- [x] With redaction OFF, proxy enable shows blocking modal with two paths.
- [x] Secondary path demands typed phrase + checkbox.
- [x] API rejects proxy enable without redaction or valid bypass token (409).
- [x] `disabledGuardrails` containing `pii-masker` does NOT bypass gate.
- [x] `isRequestPiiMaskingEnabled` reads effective flag, not raw `process.env`.
- [x] Hard Rule #20 preserved: fresh install still OFF.
- [x] Audit log entry for every bypass.
- [x] Tests cover both UI and API enforcement paths.
- [x] `npm run typecheck:core` passes.
- [x] Changelog draft prepared.

## Details

### Where

| File | Purpose |
|------|---------|
| `src/lib/guardrails/piiMasker.ts` | Fix env-vs-DB drift via `isFeatureFlagEnabled("PII_REDACTION_ENABLED")`. |
| `src/lib/proxyRedactionGate.ts` | New module: effective redaction check, bypass token creation/verification, gate assertions. |
| `src/shared/validation/schemas/proxy.ts` | Extend proxy update, assignment, and registry schemas with `bypassToken` and add `createProxyBypassTokenSchema`. |
| `src/shared/validation/settingsSchemas.ts` | Extend `updateSettingsSchema` with `bypassToken`. |
| `src/shared/validation/schemas/provider.ts` | Extend `updateProviderConnectionSchema` with `bypassToken`. |
| `src/lib/db/settings.ts` | Proxy enable enforcement on `setProxyForLevel`, `setProxyConfig`, `updateSettings`. |
| `src/app/api/settings/proxy/route.ts` | Proxy route 409 enforcement on enable without redaction/bypass. |
| `src/app/api/settings/proxy/bypass-token/route.ts` | New endpoint `POST /api/settings/proxy/bypass-token` for high-friction bypass tokens. |
| `src/app/api/settings/proxy/redaction-status/route.ts` | New endpoint `GET /api/settings/proxy/redaction-status` for runtime redaction status. |
| `src/lib/api/proxyRegistryRouteHandlers.ts` | Gate proxy creation/update with assignment. |
| `src/app/api/settings/proxies/assignments/route.ts` | Gate proxy assignment updates. |
| `src/app/api/settings/proxies/bulk-assign/route.ts` | Gate bulk proxy assignment updates. |
| `src/app/api/v1/management/proxies/assignments/route.ts` | Gate management proxy assignment updates with redaction check and bypass token verification. |
| `src/app/api/v1/management/proxies/bulk-assign/route.ts` | Gate management bulk proxy assignment updates with redaction check and bypass token verification. |
| `src/app/api/settings/route.ts` | Gate `proxyEnabled: true` and `perKeyProxyEnabled: true` settings updates. |
| `src/app/api/providers/[id]/route.ts` | Gate per-provider `proxyEnabled: true` and `perKeyProxyEnabled: true`. |
| `src/app/(dashboard)/dashboard/settings/components/ProxyRedactionModal.tsx` | New UI blocking warning modal with primary CTA & high-friction confirmation bypass. |
| `src/app/(dashboard)/dashboard/settings/components/ProxyTab.tsx` | Export and render `ProxyRedactionModal`. |
| `src/app/(dashboard)/dashboard/settings/components/proxy/GlobalConfigTab.tsx` | Integrate `ProxyRedactionModal` for global proxy & per-key proxy toggle. |
| `src/shared/components/ProxyConfigModal.tsx` | Integrate `ProxyRedactionModal` for proxy configuration saves. |
| `src/app/(dashboard)/dashboard/settings/components/ProxyRegistryManager.tsx` | Integrate `ProxyRedactionModal` for bulk assignments. |
| `tests/unit/proxy-redaction-gate.test.ts` | Comprehensive unit & API tests (24 test cases). |
| `tests/unit/pii-opt-in-default.test.ts` | Preserved and verified Hard Rule #20. |

## ⛔ Anti-Hallucination Guardrails

> [!CAUTION]
> Do NOT flip PII defaults to ON. Do NOT weaken the existing per-request
> `disabledGuardrails` surface — ensure it cannot bypass the proxy gate.

## 📝 Changelog Draft

### Security & Privacy
- **Proxy Redaction Gate (Task 0168)**: Gated proxy enablement behind effective PII redaction status at both API and UI layers.
  - When PII redaction is disabled, proxy enable requests are rejected with `409 Conflict` (`PII_REDACTION_REQUIRED`) unless an authorized, time-bound bypass token is provided.
  - Added high-friction confirmation modal in the dashboard UI offering a primary "Enable PII Redaction & Continue" path and an explicit bypass path requiring typed confirmation phrase (`"I understand the risks of unredacted proxy routing"`) and risk checkbox.
  - Created `POST /api/settings/proxy/bypass-token` and `GET /api/settings/proxy/redaction-status` endpoints.
  - Fixed env-vs-DB drift in `src/lib/guardrails/piiMasker.ts` to resolve `PII_REDACTION_ENABLED` via `isFeatureFlagEnabled()`.
  - Added audit log recording for every bypass token generation and consumption event (`proxy.bypass_token_created`, `proxy.unredacted_bypass`).
  - Preserved Hard Rule #20 (PII redaction default remains opt-in `false`).

## 📋 Completion Evidence (preenchido pelo agente executor)

- **Files**:
  - `src/lib/compliance/index.ts`
  - `src/lib/guardrails/piiMasker.ts`
  - `src/lib/proxyRedactionGate.ts`
  - `src/shared/validation/schemas/proxy.ts`
  - `src/shared/validation/settingsSchemas.ts`
  - `src/shared/validation/schemas/provider.ts`
  - `src/lib/db/settings.ts`
  - `src/app/api/settings/proxy/route.ts`
  - `src/app/api/settings/proxy/bypass-token/route.ts`
  - `src/app/api/settings/proxy/redaction-status/route.ts`
  - `src/lib/api/proxyRegistryRouteHandlers.ts`
  - `src/app/api/settings/proxies/assignments/route.ts`
  - `src/app/api/settings/proxies/bulk-assign/route.ts`
  - `src/app/api/v1/management/proxies/assignments/route.ts`
  - `src/app/api/v1/management/proxies/bulk-assign/route.ts`
  - `src/app/api/settings/route.ts`
  - `src/app/api/providers/[id]/route.ts`
  - `src/app/(dashboard)/dashboard/settings/components/ProxyRedactionModal.tsx`
  - `src/app/(dashboard)/dashboard/settings/components/ProxyTab.tsx`
  - `src/app/(dashboard)/dashboard/settings/components/proxy/GlobalConfigTab.tsx`
  - `src/shared/components/ProxyConfigModal.tsx`
  - `src/app/(dashboard)/dashboard/settings/components/ProxyRegistryManager.tsx`
  - `src/app/(dashboard)/dashboard/settings/components/__tests__/ProxyRedactionModal.test.tsx`
  - `tests/unit/shared/components/ProxyRedactionModal.test.tsx`
  - `tests/unit/proxy-redaction-gate.test.ts`
  - `vitest.config.ts`
- **Tests**:
  - `node --import tsx/esm --test tests/unit/proxy-redaction-gate.test.ts tests/unit/pii-opt-in-default.test.ts`:
    - 63/63 tests passed (58 proxy-redaction-gate + 5 pii-opt-in-default), 0 fail.
  - `npx vitest run src/app/(dashboard)/dashboard/settings/components/__tests__/ProxyRedactionModal.test.tsx`:
    - 8/8 tests passed (mounted React DOM component tests), 0 fail.
  - `npx vitest run tests/unit/shared/components/ProxyRedactionModal.test.tsx`:
    - 8/8 tests passed (wrapper test path), 0 fail.
  - `npm run typecheck:core`: 0 errors.
  - Scoped ESLint: 0 errors, 0 warnings across all touched files.
- **Hard Rule #20 proof**:
  - `tests/unit/pii-opt-in-default.test.ts` executed and passed 5/5 assertions verifying `PII_REDACTION_ENABLED` and `PII_RESPONSE_SANITIZATION` default definitions remain `"false"` and runtime resolution is OFF by default.
- **Changelog**: Canonical entry `.changelog/20260814-142036-0168-require-pii-redaction-before-proxy-enable-builders.md` updated with verification evidence; `CHANGELOG.md` indexed.
- **Agent/date**: `builders` / 2026-08-14

## 🔁 Review/Fix Ledger

- **Execution Engineer session/task ID**: `ses_ffed9a806ffetGN1sodUHwLLYe`
- **Execution Reviewer session/task ID**: `ses_ffeb4df3dffe1tB9n9mUiVa94h`
- **Initial report / score**: `docs/reports/review/20260814-task-0168-final-review.md` — `75/100`, `REJECTED` (Re-review: `87/100`, `REJECTED`, Delta re-review: `91/100`, `REJECTED`, Final delta re-review: `94/100`, `REJECTED`)
- **Fix routing**: Precision fixer pass completed (builders lane).

### Path-to-100 Closure Matrix

| Priority | Finding / Gap | Resolution & Evidence | Status |
|---|---|---|---|
| **P0** | Ungated `/api/v1/management/proxies/assignments` route on `proxyId` non-null | Gated in `src/app/api/v1/management/proxies/assignments/route.ts:75-78` via `assertProxyRedactionOrBypass({ bypassToken })`. Returns 409 when PII is OFF without valid bypass token; accepts & consumes valid token; allows unassign (`proxyId: null`). 5 route unit tests added in `tests/unit/proxy-redaction-gate.test.ts`. | **CLOSED** |
| **P0** | Ungated `/api/v1/management/proxies/bulk-assign` route on `proxyId` non-null | Gated in `src/app/api/v1/management/proxies/bulk-assign/route.ts:34-37` via `assertProxyRedactionOrBypass({ bypassToken })`. Returns 409 when PII is OFF without valid bypass token; accepts & consumes valid token; allows unassign (`proxyId: null`). 4 route unit tests added in `tests/unit/proxy-redaction-gate.test.ts`. | **CLOSED** |
| **P1** | Add UI/component tests for `ProxyRedactionModal` | Added mounted React DOM component tests in `src/app/(dashboard)/dashboard/settings/components/__tests__/ProxyRedactionModal.test.tsx` (8/8 pass) using Vitest + jsdom + React `createRoot`/`act`. Tests mounting, security warnings, Hard Rule #20 badge, primary CTA feature flag enable path (`PUT /api/settings/feature-flags`) + error handling, secondary bypass checkbox + phrase interaction matrix + API execution (`POST /api/settings/proxy/bypass-token`) + error handling, and cancel state reset. | **CLOSED** |
| **P1** | Make audit persistence fail closed for an unredacted bypass in production | Implemented `recordMandatoryAuditLog` in `src/lib/compliance/index.ts` and `src/lib/proxyRedactionGate.ts` which inserts directly into SQLite `audit_log` with schema check, throwing if DB is unavailable, schema check fails, or 0 rows are modified. Set `recordMandatoryAuditLog` as default `auditLogger` for `createProxyBypassToken` and `verifyProxyBypassToken`. In `createProxyBypassToken`, `logger({...})` is called strictly before `bypassTokens.set(token, record)`. If the audit logger throws, the token is never stored in memory and cannot be verified or consumed. Added unit tests in `tests/unit/proxy-redaction-gate.test.ts` (Section 8) verifying fail-closed error throwing on token verification, `assertProxyRedactionOrBypass`, and token creation. | **CLOSED** |
| **P1** | Constrain and document `skipRedactionGate` escape hatch | Documented `UpdateSettingsOptions` interface in `src/lib/db/settings.ts` with `@internal` JSDoc; sanitized `updates` payload in `updateSettings` to strip any injected `skipRedactionGate` property from data objects; added DB-level unit tests in `tests/unit/proxy-redaction-gate.test.ts` (Section 14) verifying direct 409 rejection and preventing data-payload bypass. | **CLOSED** |
| **P1** | Scoped ESLint warning in `ProxyConfigModal.tsx:283` (`react-hooks/exhaustive-deps`) | Wrapped `resetFields` in `useCallback` with `[proxyTypes]` dependency, positioned before `useEffect`, and added `[isOpen, level, levelId, resetFields, t]` to `useEffect` dependency array. Scoped ESLint is clean with 0 errors and 0 warnings. | **CLOSED** |
| **P2** | Exact confirmation phrase validation and whitespace contract | Added strict phrase validation tests in `tests/unit/proxy-redaction-gate.test.ts` (Section 13) covering empty phrase, partial phrase, case mismatch, extra punctuation, and checkbox requirement. Documented whitespace contract where surrounding whitespace is trimmed safely while the phrase body requires exact match. | **CLOSED** |
| **P2** | Canonical changelog verification checkbox unchecked | Checked verification checkbox in `.changelog/20260814-142036-0168-require-pii-redaction-before-proxy-enable-builders.md` and recorded actual test/typecheck/lint commands and output. | **CLOSED** |
| **Hard Rule #20** | PII redaction must remain opt-in `false` by default | Verified `tests/unit/pii-opt-in-default.test.ts` passes 5/5 assertions. | **CLOSED** |

## 🔍 Review Trail (preenchido pelo reviewer)

- **Reviewer**: `builders` (independent review lane)
- **Verdict**: **APPROVED** — latest delta re-review score **100/100**. Production mandatory audit persistence now fails closed, and token creation commits to memory only after audit success. Mounted modal coverage remains green.
- **Report**: [`docs/reports/review/20260814-task-0168-final-review.md`](../../reports/review/20260814-task-0168-final-review.md)
- **Promotion**: Authorized; task moved to `docs/tasks/03-review/0168-omniroute-proxy-redaction-gate.md`.
- **Fresh latest evidence**: Node tests passed 63/63; both mounted Vitest paths passed 16/16; `npm run typecheck:core` exited 0; scoped ESLint emitted 0 errors and 0 warnings; LSP diagnostics for the audit/proxy gate files reported 0; index health is 100.0% with 0 stale files and 0 parse failures; canonical changelog verification is checked.
- **Resolved final delta**: `recordMandatoryAuditLog` is the production default and throws on unavailable DB/schema/write failure; `createProxyBypassToken` audits before storing; tests cover SQLite persistence, default logger wiring, failure rejection, and no-token-commit behavior.
- **Prior findings**: management routes, mounted UI behavior, payload-injection defense, phrase contract, hooks, Hard Rule #20, and changelog evidence remain closed.

