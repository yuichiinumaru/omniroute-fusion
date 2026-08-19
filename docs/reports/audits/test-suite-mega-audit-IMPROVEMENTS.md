# Test Suite Mega-Audit — IMPROVEMENTS

Priorities below are opportunities, not implementation work. They are grounded in the RD criteria (`docs/tasks/01-open/RD-omniroute-test-suite-mega-audit.md:64-69`) and the bounded evidence collected in this session.

## P0 — boundary and discovery correctness

### I1. Add public-boundary coverage for model-test dispatch

- **Evidence:** `tests/unit/model-test-runner.test.ts:3` imports only helper functions; its declarations cover those helpers at `:10-88`. The production boundary `runSingleModelTest` begins at `src/lib/api/modelTestRunner.ts:172-177`, normalizes at `:189-224`, and builds request bodies at `:238-249`.
- **Failure mode:** helper suite can pass while alias/prefix dispatch is wrong.
- **Target:** one table-driven boundary file asserting provider, model, fetch count, and upstream body; the existing design is already exemplified at `tests/unit/provider-alias-normalization.boundary.test.ts:107-193`.

### I2. Repair or explicitly quarantine four orphaned tests

- **Evidence:** `npm run check:test-discovery` exited 1 and reported `tests/unit/shared/components/OAuthModal.cancellation.test.tsx`, `OAuthModal.oautopopup.test.tsx`, `OAuthModal.state.test.tsx`, and `ProxyRedactionModal.test.tsx` as not collected by any runner.
- **Target:** update runner inclusion or move files in a future code/test task; this report does not modify them.
- **Limit:** the command reports four files; it is not a complete test-execution proof.

## P1 — isolation and concurrency

### I3. Make global fetch replacement structured and exception-safe

- **Evidence:** 2,372 textual `globalThis.fetch =` occurrences across 303 files; examples `tests/integration/chat-pipeline.test.ts:531-539`, `tests/unit/trae-executor.test.ts:42-75`, and `tests/unit/provider-alias-normalization.boundary.test.ts:50-85`.
- **Risk:** both Vitest configs permit 20 workers/concurrent tests (`vitest.config.ts:7-12`; `vitest.mcp.config.ts:7-12`), and native unit scripts use concurrency 20 (`package.json:98-104`). This is a concurrency risk signal, not a measured failure.
- **Target:** scoped `withFetchCapture` helper plus serial execution for tests that mutate process-global state.

### I4. Standardize data-dir and DB reset lifecycle

- **Evidence:** 894 `resetDbInstance()` occurrences in 518 files and 789 `mkdtemp` occurrences in 664 files. Representative lifecycle code appears at `tests/integration/agent-bridge-bypass-flow.test.ts:15-37` and `tests/integration/api-keys.test.ts:8-30`.
- **Target:** a helper with explicit setup/seed/cleanup phases and no hidden global state.

### I5. Replace timing sleeps with deterministic synchronization

- **Evidence:** 439 `setTimeout(` occurrences in 258 files and 41 `sleep`/`delay`/`wait` token occurrences in 12 files. Examples include `tests/e2e/system-failover.test.ts:66`, `:176`, `:195`, and integration timing at `tests/integration/batch-e2e-rate-limit.test.ts:33`, `:185`, `:203`.
- **Target:** event/latch/poll-until-condition helpers with bounded timeout and diagnostic output.
- **Limit:** textual timing markers do not prove flakiness.

## P1 — mock and fixture quality

### I6. Introduce complete typed response fixtures

- **Evidence:** 558 `new Response(JSON.stringify(...))` occurrences in 187 files; examples `tests/integration/combo-failover-e2e.test.ts:69-76`, `tests/integration/chat-pipeline.test.ts:1241`, and `tests/unit/provider-alias-normalization.boundary.test.ts:64-77`.
- **Rule:** preserve fields that downstream code consumes; incomplete mocks are explicitly warned against by `.agents/skills/project-development/references/testing-anti-patterns.md:177-225`.

### I7. Reduce `as any` in boundary assertions

- **Evidence:** 2,985 `as any` occurrences across 350 test files. This is a typing-debt inventory, not a defect count.
- **Target:** typed response envelopes and narrow test-only fixtures; prioritize route/provider/SSE boundary tests where `any` can hide shape drift.

## P2 — suite organization and governance

### I8. Reconcile runner ownership and command surfaces

- **Evidence:** the package exposes native unit, integration, E2E, Vitest, and all-suite commands (`package.json:98-108`, `:182-202`); Vitest includes selected `src`, `open-sse`, and test paths (`vitest.config.ts:13-28`; `vitest.mcp.config.ts:12-23`). `npm run check:test-runner-api` exited 0, while discovery exited 1.
- **Target:** one machine-readable inventory mapping each test path to exactly one intended runner, with an explicit exception list for dual-owned files.
- **Additional evidence:** the package unit glob matches 2,401 of 2,403 `tests/unit/**/*.test.ts` files; the two unmatched paths are `tests/unit/autoCombo/suffixComposition-4517.test.ts` and `tests/unit/autoCombo/tieredRotation.test.ts`.

## Suggested sequencing

1. Fix collection/orphan inventory (I2, I8).
2. Add boundary tests for production-facing regressions (I1).
3. Introduce safe fixture/isolation helpers and migrate representative files (I3, I4, I6).
4. Replace timing sleeps in the most failure-sensitive integration/e2e paths (I5).
5. Ratchet typing and naming after the above evidence is stable (I7).

## Non-claims

No full-suite duration, coverage percentage, pass rate, mutation score, or flake rate was measured here. Those require running the corresponding commands and preserving fresh output; this report intentionally does not fabricate them.
