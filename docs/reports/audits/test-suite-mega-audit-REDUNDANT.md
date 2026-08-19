# Test Suite Mega-Audit — REDUNDANT / repeated logic clusters

**Classification rule:** these are measured repeated textual shapes and consolidation opportunities, not proof that every occurrence is semantically redundant. The RD asks for repeated setup/assert/fixture logic with cited occurrences (`docs/tasks/01-open/RD-omniroute-test-suite-mega-audit.md:59-63`).

## Count

- **Measured repeated-shape clusters:** 4.
- **Occurrences in those clusters:** 4,613 textual occurrences total (2,372 + 558 + 894 + 789).
- **Semantically verified duplicate tests:** not computed; no unsupported number is claimed.

## R1 — global fetch replacement / restoration

- **Measured:** 2,372 `globalThis.fetch =` occurrences across 303 files.
- **Representative citations:** `tests/integration/chat-pipeline.test.ts:531-539` installs a fetch implementation and `:520-523` resets shared state; `tests/unit/provider-alias-normalization.boundary.test.ts:50-85` installs a capture and restores it; `tests/unit/trae-executor.test.ts:42-75` contains another URL-dispatching fetch installer.
- **Suggested common helper:** `withFetchCapture(dispatcher, callback)` that snapshots/restores `globalThis.fetch` in `finally`, records URL/method/body, and exposes an explicit response factory. It must not assert on the mock itself; the caller must assert product output.
- **Why this is an opportunity, not a proof:** the same textual assignment may represent intentionally different isolation boundaries.

## R2 — JSON `Response` fixture builders

- **Measured:** 558 `new Response(JSON.stringify(...))` occurrences across 187 files.
- **Representative citations:** `tests/integration/combo-failover-e2e.test.ts:69-76` constructs upstream error responses; `tests/integration/chat-pipeline.test.ts:1241` constructs an error response; `tests/unit/provider-alias-normalization.boundary.test.ts:64-77` constructs a successful completion response.
- **Suggested common helper:** a typed `jsonResponse(body, status, headers)` plus named contract fixtures (`openaiChatSuccess`, `openaiError`, `sseResponse`). The helper should standardize headers/status only; fixture bodies remain explicit per boundary.
- **Guard:** do not hide fields consumed by downstream code. The anti-pattern reference requires complete real-shape mocks (`.agents/skills/project-development/references/testing-anti-patterns.md:177-225`).

## R3 — DB instance reset

- **Measured:** 894 `resetDbInstance()` occurrences across 518 files.
- **Representative citations:** `tests/integration/agent-bridge-bypass-flow.test.ts:25-37` resets the DB and temp directory in a helper/beforeEach; `tests/integration/api-keys.test.ts:23-30` resets DB and API-key state; `tests/unit/provider-alias-normalization.boundary.test.ts:33-37` resets storage.
- **Suggested common helper:** `withIsolatedDataDir(prefix, callback)` owning `DATA_DIR`, DB reset, directory recreation, and cleanup. For tests that need seed state, expose a `seed` callback rather than silently changing the reset order.
- **Risk:** Vitest and native Node runners both permit parallelism (`vitest.config.ts:7-12`; `vitest.mcp.config.ts:7-12`; `package.json:98-104`). A helper should make isolation explicit, but this count alone does not prove a race.

## R4 — temporary-directory setup

- **Measured:** 789 `mkdtemp` occurrences across 664 files.
- **Representative citations:** `tests/integration/agent-bridge-bypass-flow.test.ts:15-18`; `tests/integration/agent-bridge-cert-flow.test.ts:16-22`; `tests/integration/api-keys.test.ts:8-19`.
- **Suggested common helper:** `withTempDataDir(prefix, callback)` that creates a unique directory, sets only the intended environment variables, and removes the directory in `finally`/after hook. Keep tests that deliberately inspect persistence explicit.

## What is not counted as duplication

- Similar assertions with different contracts.
- Different providers sharing only an HTTP envelope.
- Multiple tests that intentionally verify distinct failure modes.
- Repeated `as any` (2,985 occurrences in 350 files) — this is a typing signal, not duplicate logic.

## Consolidation order

1. Build typed response and fetch-capture helpers first (R1/R2).
2. Add data-dir/DB isolation helper with an opt-in seed callback (R3/R4).
3. Migrate one representative integration file at a time and compare behavior; do not mass-rewrite based solely on textual counts.
4. Preserve table-driven boundary rows rather than collapsing provider-specific assertions into a generic “mock called” check. The existing alias boundary test demonstrates the desired shape at `tests/unit/provider-alias-normalization.boundary.test.ts:107-193` and `:224-289`.

## Limits

No AST clone detector or execution-level duplicate-branch analysis was run. The four clusters are reportable because their occurrence counts were directly measured, but a future implementation wave must prove helper equivalence with focused tests before consolidation.
