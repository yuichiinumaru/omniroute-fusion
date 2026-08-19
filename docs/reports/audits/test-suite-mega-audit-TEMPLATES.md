# Test Suite Mega-Audit — TEMPLATES (design only)

These are specifications, not executable test files. They are designed to satisfy the RD requirement for one shared/table-driven contract per boundary family (`docs/tasks/01-open/RD-omniroute-test-suite-mega-audit.md:71-75`) and the anti-TDD rule that boundary tests must assert observable behavior (`docs/tasks/01-open/0176-omniroute-canonical-alias-normalization.md:49-82`).

## Shared helper bank (one library, not N copies)

**Suggested location:** future `tests/_helpers/` or an existing test-helper owner chosen by implementation work.

1. `withFetchCapture(dispatcher, callback)` — snapshot and restore `globalThis.fetch` in `finally`; record URL, method, headers, parsed body; never assert mock existence.
2. `jsonResponse(body, status, headers)` — typed response factory with explicit status/content type.
3. `sseResponse(frames)` — deterministic event/data stream; expose event count and `[DONE]` observation.
4. `withTempDataDir(prefix, callback)` — unique directory, explicit env setup, cleanup in `finally`.
5. `withIsolatedDb(prefix, seed, callback)` — DB reset plus seed callback; no hidden ordering.
6. `assertErrorEnvelope(response, expectedStatus, forbiddenLeakPatterns)` — assert observable status/body and stack-redaction properties.
7. `tableCases(name, rows, runner)` — report row labels and preserve input/expected output in failure messages.

The need is grounded in measured repetition: 2,372 fetch assignments, 558 JSON `Response` constructions, 894 DB resets, and 789 temp-directory calls. These are measured opportunities, not proof that every call should be replaced; see [REDUNDANT](./test-suite-mega-audit-REDUNDANT.md).

## Provider contract template (one table-driven file per provider family)

**Purpose:** prevent “tests pass but provider boundary is broken.”  
**Suggested file:** `tests/unit/provider-boundary-contract.test.ts` (future design; not created here).

Each row contains:

- provider id and accepted aliases;
- bare model, provider-id-prefixed model, alias-prefixed model, and opaque slash model where supported;
- expected canonical provider/model;
- expected upstream dispatch payload;
- expected fetch count (including denylist/no-fetch rows);
- auth/header expectations;
- successful response normalization;
- upstream error sanitization;
- model-list fallback behavior.

**Minimum rows:** bare; same-provider alias; canonical provider prefix; foreign/opaque slash policy; denylisted model; auth failure; upstream 4xx/5xx; stream and non-stream.  
**Reference evidence:** existing public-boundary matrix captures rows and expected identities at `tests/unit/provider-alias-normalization.boundary.test.ts:107-148`, executes `runSingleModelTest` at `:150-193`, tests denylist/no-fetch at `:195-216`, and drives Trae's upstream session body at `:224-289`.

**Anti-patterns prevented:** A1/A6 helper-only coverage, A3 no-throw-only assertions, partial response mocks, and per-provider alias-strip copies.

## Executor template

**Boundary:** executor input → upstream request → normalized OpenAI response/SSE.  
**Rows:** auth headers; model normalization; request body; non-stream success; stream deltas + finish + DONE; upstream error; timeout/cancellation; malformed upstream frame.  
**Reference:** `tests/unit/trae-executor.test.ts:99-139` checks headers and non-stream payload; `:245-271` checks stream markers; `:273-292` checks sanitized upstream errors.  
**Shared helpers:** `withFetchCapture`, `jsonResponse`, `sseResponse`, error envelope.

## Translator template

**Boundary:** canonical request shape → provider-specific request → response translation.  
**Rows:** required fields; optional tools/vision/reasoning; provider-specific omissions; error translation; streaming event mapping.  
**Shared helpers:** typed request builders, complete response fixtures, SSE parser.  
**Anti-patterns prevented:** asserting only internal intermediate objects and incomplete provider mocks.

## Route template

**Boundary:** HTTP `Request` → auth/validation → production route handler → response.  
**Rows:** authenticated success; unauthenticated/unauthorized; invalid body; not-found; provider/service failure; response shape and redaction.  
**Reference:** `tests/integration/agent-bridge-bypass-flow.test.ts:42-70` invokes route exports with real `Request` objects and checks status/body; `tests/integration/api-keys.test.ts:41-57` constructs request headers/body and imports production routes at `:17-19`.  
**Shared helpers:** management session request, typed JSON response, error envelope.

## Combo/failover template

**Boundary:** combo selection → account/provider attempts → fallback/exhaustion response.  
**Rows:** primary success; primary error then secondary success; all exhausted; cooldown skip; cancellation; request/usage receipt.  
**Shared helpers:** upstream dispatcher with per-target call log, deterministic clock, response fixtures.  
**Guard:** assert selected target and final product output, not only mock call order.

## DB-module template

**Boundary:** public DB module function → SQLite state → returned domain object.  
**Rows:** create/read/update/delete; empty state; uniqueness/conflict; reset/isolation; migration/legacy shape; cleanup.  
**Reference:** the current reset lifecycle is visible at `tests/integration/agent-bridge-bypass-flow.test.ts:25-37` and `tests/integration/api-keys.test.ts:23-30`.  
**Shared helpers:** `withIsolatedDb`, temp directory, typed seed builders.

## SSE-stream template

**Boundary:** upstream frames → parser/stream controller → client-visible events.  
**Rows:** role; incremental text; usage; finish; `[DONE]`; malformed frame; upstream error; cancellation/reader cleanup.  
**Reference:** `tests/unit/trae-executor.test.ts:245-271` checks observable stream chunks; `open-sse` suites are included by the Vitest config at `vitest.config.ts:24-25` and `vitest.mcp.config.ts:13-16`.  
**Shared helpers:** deterministic `sseResponse`, event counter, cancellation latch.

## RF8/TDD/EDD placement

- **RED:** write one failing row at the public boundary first; the existing task requires boundary rows, not helper-only tests (`docs/tasks/01-open/0176-omniroute-canonical-alias-normalization.md:71-82`).
- **GREEN:** minimum implementation passes the row.
- **REFACTOR:** move only proven repeated setup into shared helpers while keeping observable assertions.
- **EDD:** record correctness (does boundary work), usefulness (does it protect operator/user contract), and governance (does it avoid duplicate fixtures and runner ambiguity), matching `.agents/skills/project-development/sub-skills/eval/SUBSKILL.md:214-239`.

## Template limits

No files were generated from these specifications. No template claims a coverage percentage or runner pass rate. The future implementation wave must choose canonical helper paths, add sabotage/failure proof, and run the relevant native/Vitest commands.
