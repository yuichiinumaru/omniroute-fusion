# Task 0178: Structured fetch capture and test isolation hardening

> **Status**: `[x]` Completed — **APROVADO 100/100 by independent reviewer 2026-08-19 → `03-review`**
> **Priority**: 🟡 P1
> **Type**: `testing`
> **Origin**: Test Suite Mega-Audit — `docs/reports/audits/test-suite-mega-audit-IMPROVEMENTS.md:21-30,40-48` and `test-suite-mega-audit-TEMPLATES.md:5-17`
> **Blocks**: —
> **Depends on**: Task 0176 (reuse its public-boundary assertion contract; do not duplicate or rewrite its alias matrix)
> **Parallelism**: `serializable` — may be planned beside Task 0177, but shared test-helper ownership and any touched representative tests must not be co-edited by another test-infrastructure task.
> **Review routing**: independent + test-infrastructure review

## Hierarchy

- **Epic**: EPIC-25 — Provider Reliability and Test Integrity
- **Story**: TBD — orphan until a cohesive test-integrity story is formally created
- **Cohesion peers**: Task 0177; Task 0176; `RD-omniroute-test-suite-mega-audit`

---

## Objective

Introduce one canonical, exception-safe fetch-capture helper for representative
provider and integration tests, then migrate a small measured slice without making
unsupported claims about the entire test corpus. The helper must preserve observable
boundary assertions — URL, method, relevant headers, parsed request body, response,
and restoration of the original `globalThis.fetch` — while preventing a thrown test
from leaking a global mock into later tests.

This is a bounded hardening slice, not a mechanical rewrite of all 2,372 textual
`globalThis.fetch =` occurrences. The task must first discover whether an existing
canonical test-helper owner already exists and must not create a duplicate helper
bank.

## Background Context

### O que já existe:

- The mega-audit measured `globalThis.fetch =` in 2,372 occurrences across 303 files.
- It identified `new Response(JSON.stringify(...))`, DB reset, and temporary-directory
  setup as repeated patterns, but explicitly did not claim every occurrence is bad.
- `tests/unit/provider-alias-normalization.boundary.test.ts` is the current public
  boundary reference and must not be rewritten into a helper-only test.
- The design report proposes `withFetchCapture`, `jsonResponse`, `sseResponse`, and
  explicit restoration in `finally`; these are design specifications, not code.

### O que está faltando / quebrado:

- Representative tests assign `globalThis.fetch` directly and restore it locally,
  creating a process-global isolation risk when test concurrency is enabled.
- The repository has not yet selected a canonical owner for shared test helpers.
- No measured flake or race rate exists; this task must not claim that the marker
  count proves a runtime race.

---

## Test Requirements

- The helper MUST snapshot and restore `globalThis.fetch` in a `finally` path when
  the callback returns or throws.
- The helper MUST capture URL, method, relevant headers, and parsed request body
  without retaining credentials or full sensitive payloads in evidence.
- A helper test MUST prove restoration after a deliberately thrown callback.
- At least two representative tests MUST use the helper and continue asserting an
  observable postcondition/payload, not merely that a mock was called.
- The migration MUST preserve the existing provider/executor response and stream
  semantics for the selected representatives.
- The task MUST NOT change global worker/concurrency limits solely because textual
  markers exist; such a change requires separate measured evidence.

---

## Exit Conditions (GDD/TDD)

- [x] Existing test-helper owners, representative tests, and the public boundary
  contract from Task 0176 have been read before edits.
- [x] One canonical helper location is selected with a documented duplicate/false-gap
  check; no parallel helper bank is created.
- [x] A failing test proves the helper restores `globalThis.fetch` after an exception,
  then passes after implementation.
- [x] At least two representative tests migrate to the helper while retaining their
  upstream payload or response assertions.
- [~] Targeted native test commands for the helper and representatives pass —
  helper `tests/unit/fetch-capture-helper.test.ts` 6/6 ✅, `tests/unit/trae-executor.test.ts` 19/19 ✅,
  `tests/integration/chat-pipeline.test.ts` 27/28 ⚠️ with 1 **pre-existing** failure
  (`Codex CLI fingerprint` asserts literal `codex-cli/0.142.0` UA vs production `DEFAULT_CODEX_CLIENT_VERSION=0.144.1` in `open-sse/config/codexClient.ts:1`; test content untouched by this task).
- [x] `npm run typecheck:core` passes without errors.
- [~] `npm run lint` — **0 new errors** in all changed files (targeted run); repo-wide `eslint .` still exits 1 on 9 **pre-existing** errors in untouched files (`visual-reference/**`, `tmp/h1-investigation/**`, `EnabledEngineSections.tsx`).
- [x] No claim is made that all repository fetch mocks, DB resets, or temp directories
  were migrated.
- [~] Changelog entry **deferred per operator instruction** for this run (“add only a
  Changelog Draft in Completion Evidence”; no manage-changelog / rebuild.sh executed —
  see draft below).

---

## Details

### What

Subtasks:

- [x] **Ler existentes**: read the audit reports, existing test-helper modules,
  `tests/integration/chat-pipeline.test.ts`, `tests/unit/trae-executor.test.ts`,
  and `tests/unit/provider-alias-normalization.boundary.test.ts`.
- [x] Inventory candidate helper owners and record why the selected location is
  canonical rather than creating a second helper bank.
- [x] Write the RED test for exception-safe fetch restoration.
- [x] Implement the smallest typed helper that records only the boundary evidence
  needed by the representative tests.
- [x] Migrate two representatives, preserving payload/response assertions and test
  cleanup semantics.
- [x] Add or preserve a deterministic response/SSE fixture only where the migrated
  tests require it; do not expand this into a fixture rewrite.
- [x] **Refactoring pass**: remove only setup duplication proven by the migrated slice;
  keep semantically different mocks local.
- [x] **Verificação de regressão**: run targeted tests, lint, and typecheck; record
  exact output and residual un-migrated scope.

### Where

| Arquivo | Propósito |
|---------|-----------|
| `docs/reports/audits/test-suite-mega-audit-IMPROVEMENTS.md` | Read I3/I4/I6 evidence; read-only. |
| `docs/reports/audits/test-suite-mega-audit-TEMPLATES.md` | Read shared-helper design; read-only. |
| `tests/unit/provider-alias-normalization.boundary.test.ts` | Read-only boundary contract reference; do not duplicate its matrix. |
| `tests/integration/chat-pipeline.test.ts` | Representative fetch-capture migration candidate. |
| `tests/unit/trae-executor.test.ts` | Representative executor/stream migration candidate. |
| `tests/_helpers/` or the existing canonical test-helper owner | Create or modify only after the owner search proves the destination. |
| `package.json` | Read targeted test commands; modify only if helper ownership requires an existing test export. |

### How

1. Reproduce the selected representatives' current behavior and identify the exact
   observable assertions that must survive.
2. Locate the existing helper convention and choose one owner, preserving current
   module boundaries.
3. Add the failing restoration test before implementing the helper.
4. Implement capture/restoration with `try/finally`, typed request parsing, and
   sanitized evidence handling.
5. Migrate two representatives and run only their targeted tests first.
6. Run typecheck/lint and document what remains intentionally unmigrated.

### Why

Process-global fetch replacement is a credible isolation risk in a repository that
allows concurrent tests, but the audit did not prove a race. A small, observable,
exception-safe helper reduces future provider-test leakage without turning textual
marker counts into an unjustified mass refactor.

---

## Parallelism / file ownership

| Class | Detail |
|-------|--------|
| **parallel-safe** | Planning may run beside Task 0177 if no runner configuration is touched. |
| **serializable** | Implementation must serialize with any other task selecting or modifying the shared test-helper owner. |
| **Collision** | The chosen helper owner and the two representative test files are owned by this task; `tests/unit/provider-alias-normalization.boundary.test.ts` is read-only. |

---

## ⛔ Anti-Hallucination Guardrails

> [!CAUTION]
> Do not mechanically replace all fetch assignments. Do not claim the marker count
> proves flakiness, a race, or a coverage percentage. Do not capture or print API
> keys, cookies, authorization headers, or full sensitive request bodies.

> [!IMPORTANT]
> Every migrated test must retain an observable payload, response, or stream
> postcondition. A helper that only asserts `fetch` was called is insufficient.
> Read Task 0176's boundary test before editing nearby provider-test conventions.

---

## 🛡️ Compliance Checklist (Leis Primárias do AGENTS.md)

- [x] **Doc Accuracy**: every helper path and test command was verified against the repository.
- [x] **Security**: no secret/credential is stored in fixtures, captures, reports, or evidence;
  the helper's `toSanitizedEvidence()` redacts authorization/cookie/api-key headers and
  sensitive body keys; tests keep fake keys only (`sk-*`, `JWT.test.token`).
- [x] **Error Sanitization**: captured upstream errors remain sanitized in test output
  (`trae` upstream-error test keeps its `!json.error.message.includes("at /")` assertion; the
  helper never prints raw errors).
- [x] **Archive Protocol**: nothing was deleted; only the dead test-local `FetchCall` type
  (unused after migration) was removed.
- [x] **Test Boundary**: representative tests assert observable production behavior
  (upstream URL/auth header/request payload/response content and stream deltas + `[DONE]`).

---

## 📋 Completion Evidence (preenchido pelo agente executor)

- **Arquivos criados/modificados**:
  - `tests/helpers/fetchCapture.ts` (created — canonical exception-safe fetch-capture helper)
  - `tests/unit/fetch-capture-helper.test.ts` (created — helper contract tests incl. throw-restoration)
  - `tests/unit/trae-executor.test.ts` (modified — stream test migrated to `withFetchCapture`)
  - `tests/integration/chat-pipeline.test.ts` (modified — OpenAI passthrough test migrated;
    dead `FetchCall` type removed)
  - `docs/tasks/01-open/0178-…md` (this file — subtasks/exit conditions/evidence)
- **Canonical helper owner decision**: `tests/helpers/fetchCapture.ts`.
  Duplicate/false-gap evidence: `tests/helpers/` already exists as the shared helper bank
  (`fakeUpstreamStream.ts`, `faultyUpstream.ts`, `goldenSnapshot.ts`, `managementSession.ts`,
  `propertyConfig.ts`, `translationFixtures.ts`); `tests/_setup/isolateDataDir.ts` is
  process-level setup only; grep across `tests/` found NO existing `withFetchCapture`/
  `fetchCapture` shared module (only per-file local `captureFetch`/`installMockFetch`
  copies). `tests/_helpers/` was NOT created (would be a duplicate bank — Path Economy);
  TEMPLATES audit (`test-suite-mega-audit-TEMPLATES.md:7`) explicitly allows an existing
  owner chosen by implementation.
- **RED/GREEN restoration test**: RED = `ERR_MODULE_NOT_FOUND` for `tests/helpers/fetchCapture.ts`
  (`node --import tsx/esm --test tests/unit/fetch-capture-helper.test.ts` → `fail 1`); after
  implementation → `pass 6 / fail 0`; the throw-restoration test
  (`RESTORES globalThis.fetch after a deliberately thrown callback`) passes and asserts
  `globalThis.fetch === original` post-throw.
- **Representative tests and results**:
  - `node --import tsx/esm --test tests/unit/fetch-capture-helper.test.ts tests/unit/trae-executor.test.ts` → **28/28 PASS** (9 helper + 19 trae) — incl. migrated Trae SSE test
    (`stream: emits OpenAI chunks…`) that keeps delta/finish/`[DONE]` + upstream boundary assertions.
  - Same two under real `test:unit` loader shape (`--import tsx --import ./open-sse/utils/setupPolyfill.ts
    --import ./tests/_setup/isolateDataDir.ts`) → **28/28 PASS**.
  - `node --import tsx/esm --test tests/integration/chat-pipeline.test.ts` → **27/28 PASS**;
    migrated passthrough test ✅. The single failure is **pre-existing and untouched**:
    `chat pipeline applies Codex CLI fingerprint…` asserts `User-Agent codex-cli/0.142.0`
    (literal at `chat-pipeline.test.ts:696`, original content) vs production
    `DEFAULT_CODEX_CLIENT_VERSION = "0.144.1"` (`open-sse/config/codexClient.ts:1`).
    Out of Task 0178 scope — version drift, not fetch-capture.
- **Review Remediation (Path to 100)**:
  1. Sanitized URL query parameters in `toSanitizedEvidence()` (e.g. `key`, `token`, `secret`, `api_key`, `auth`, etc. are replaced with `<redacted>`) while preserving the raw URL in `capture.calls[0].url` for boundary test assertions. Added focused unit test.
  2. Merged `Request.headers` in `headersOf()` when `input` is a `Request` object, with `init.headers` overriding matching duplicate keys. Added focused unit test.
  3. Ensured type-safe body assertions across helper and test files via `bodyAs<T>()` helper method and async Request body parsing when `input` is a `Request` object. Added focused unit tests.
- **Resultado do lint**: targeted `npx eslint` on the 4 changed files → **0 errors**
  (19 pre-existing `no-explicit-any` warnings in `chat-pipeline.test.ts`, count unchanged
  from the original 19). Repo-wide `npm run lint` exits 1 with **9 pre-existing errors in
  untouched files** (`visual-reference/src/App.tsx`, `visual-reference/src/components/
  organisms/PrismTree.tsx`, `visual-reference/src/views/{execution-stream,usage-analytics}.tsx`,
  `tmp/h1-investigation/enter-cli-pkg/…/thread.js`, `src/app/(dashboard)/dashboard/context/
  settings/EnabledEngineSections.tsx`). **No new lint errors introduced.**
- **Resultado do typecheck/build**: `npm run typecheck:core` → **PASS (exit 0)**.
- **Residual scope**: **0 of the corpus claims migrated.** Repo-wide live count of
  `globalThis.fetch =` markers: 2,401 occurrences in 313 files (larger than the audit's
  2,372/303 count — grep posture differs; both are marker counts, NOT race/flake/coverage
  proofs). In the two representative files, 25 remaining assignments
  (`chat-pipeline.test.ts`) and 6 (`trae-executor.test.ts`) are intentionally unmigrated.
  No DB-reset, temp-dir, or Response-fixture rewrite was attempted.
- **Entrada no changelog**: ⛔ **deferred per operator instruction** — this run's header orders
  "add only a Changelog Draft in Completion Evidence" and forbids touching generated changelog
  surfaces. `manage-changelog`/`rebuild.sh build` were NOT executed. Draft below.
- **Agente executor**: builder-engineer (omniroute/builder-engineer)
- **Data de conclusão**: 2026-08-18

---

### 🗒️ Changelog Draft (não aplicado — aguardando operador/orquestrador)

> Draft for the canonical `.changelog/` append-only entry via `manage-changelog`, followed by
> `rebuild.sh build`. Not applied in this run by explicit instruction.

```md
<!-- .changelog/0178-omniroute-structured-fetch-capture-test-isolation.md -->
# Task 0178 — structured fetch capture and test isolation hardening

- **Type**: testing
- **Epic**: EPIC-25 — Provider Reliability and Test Integrity
- **Scope**: one canonical exception-safe fetch-capture helper + a measured 2-test migration.

## Changed
- Added `tests/helpers/fetchCapture.ts`: `withFetchCapture(dispatcher, run)` snapshots and
  restores `globalThis.fetch` in a `finally` path (restores even when the callback or the
  dispatcher throws); captures URL, method, order-preserving headers, and parsed request
  body per call; exposes `toSanitizedEvidence()` that redacts credentials
  (authorization/cookie/api-key headers and sensitive body keys) and truncates large values.
  Location chosen as the existing `tests/helpers/` bank; no second helper bank created.
- Added `tests/unit/fetch-capture-helper.test.ts` (collected by the native `test:unit`
  glob) proving: boundary capture, callback-result passthrough, **fetch restoration after a
  deliberately thrown callback and after a throwing dispatcher**, sanitized-evidence
  redaction, and multi-call ordering.
- Migrated `tests/integration/chat-pipeline.test.ts` ("OpenAI passthrough with valid API key
  auth") to `withFetchCapture`, preserving URL/auth-header/request-body/response assertions;
  removed the now-unused test-local `FetchCall` type.
- Migrated `tests/unit/trae-executor.test.ts` ("stream: emits OpenAI chunks…") to
  `withFetchCapture`, preserving stream delta / finish_reason / `[DONE]` assertions plus new
  upstream-boundary checks (session-create + events fetches observed).

## Not changed (bounded scope)
- The other ~2,399 fetch-assignment sites remain unmigrated; no race/flake/coverage claim is
  made from marker counts.
- `tests/unit/provider-alias-normalization.boundary.test.ts` untouched (Task 0176 contract).
- No runner config, worker/concurrency limit, vitest config, or discovery script touched
  (Task 0177 boundary).

## Verification
- Helper + trae unit files: 25/25 pass (also under the real `test:unit` loader shape).
- chat-pipeline integration: 27/28; 1 pre-existing failure in an untouched test
  (Codex CLI `User-Agent` literal `0.142.0` vs production `0.144.1`) — unrelated drift.
- `npm run typecheck:core`: pass. Targeted lint on changed files: 0 errors.
```

## Agent Session Ledger

- **Implementation worker**: `ses_fe85fd71bffeVo93o8fBrviID6` — fetch capture helper and test isolation.
- **Reviewer session**: `ses_fe83a3d16ffeiojP8guG6O6zST` — independent review (REJEITADO 78/100).

---

## 🔍 Review Trail (preenchido pelo reviewer)

### Review R1 (2026-08-19)
- **Reviewer**: independent test-infrastructure / TypeScript reviewer
- **Veredito**: **REJEITADO (78/100)** — URL query credential leak in `toSanitizedEvidence()`, missing `Request.headers` extraction in `headersOf()`, and loose `unknown` body casts in test assertions.

### Review R2 — Re-Review (2026-08-19)
- **Reviewer**: independent test-infrastructure / TypeScript reviewer
- **Data da review**: 2026-08-19
- **Veredito**: **APROVADO** — all 3 R1 findings resolved by builder with clean implementations and dedicated unit tests.
- **Score (path to 100)**: **100/100**
- **R1 Remediation Verification**:
  1. **URL Query Credential Redaction**: `sanitizeUrl()` added to `tests/helpers/fetchCapture.ts:191-205` using `SENSITIVE_URL_PARAMS` set (`key`, `api_key`, `token`, `secret`, `access_token`, `authorization`, `auth`, `code`, etc.) to redact query params in `toSanitizedEvidence()`. Raw `call.url` remains preserved in `capture.calls[0].url` for boundary assertions. Dedicated unit test added in `tests/unit/fetch-capture-helper.test.ts:137-158` and passes.
  2. **`Request.headers` Merging**: `headersOf(input, init)` updated in `tests/helpers/fetchCapture.ts:135-151` to extract base headers when `input` is a `Request` object and merge `init.headers` over `baseHeaders` case-insensitively. Dedicated unit test added in `tests/unit/fetch-capture-helper.test.ts:160-187` and passes.
  3. **Type-Safe Body Access**: `bodyAs<T>()` helper method added to `CapturedFetchCall` (`tests/helpers/fetchCapture.ts:30,266-268`), async `Request` body parsing implemented in `parseBody()`, and type-safe `bodyAs<T>()` assertions used in `chat-pipeline.test.ts:548` and `fetch-capture-helper.test.ts`. Dedicated unit tests added in `tests/unit/fetch-capture-helper.test.ts:189-209` and pass.
- **Evidence Reviewed**:
  - `node --import tsx/esm --test tests/unit/fetch-capture-helper.test.ts tests/unit/trae-executor.test.ts` → **28/28 PASS** (9 helper + 19 trae).
  - Production `test:unit` loader shape → **28/28 PASS**.
  - `node --import tsx/esm --test --test-name-pattern "chat pipeline handles OpenAI passthrough with valid API key auth" tests/integration/chat-pipeline.test.ts` → **1/1 PASS**.
  - `npm run typecheck:core` → **PASS (exit 0)**.
  - ESLint on changed files → **0 errors**.
- **Final Decision**: All R1 findings resolved, test boundaries verified, process-global fetch restoration in `finally` verified under throws/errors. **APROVADO 100/100 → promote `0178` to `03-review`**.
