# Test Suite Mega-Audit — USELESS / coverage-fantasy candidates

**Verdict discipline:** this report lists only high-confidence findings as `USELESS`. Candidate inventories are explicitly not counted as findings. The RD defines A1-A8 at `docs/tasks/01-open/RD-omniroute-test-suite-mega-audit.md:47-57`; the anti-pattern framework says tests must verify real behavior rather than mock behavior (`.agents/skills/project-development/references/testing-anti-patterns.md:7-19`).

## Count

- **High-confidence USELESS findings:** 1.
- **Candidate no-throw assertions:** 188 textual occurrences in 108 files. These were not individually classified, so they are not added to the useless count.
- **Candidate mock-heavy files:** 225 files matched a conservative scan for `globalThis.fetch =`, `vi.stubGlobal('fetch'...)`, or `mockFetch` without an obvious `/route` or `executor` string. This is a review queue, not a useless count.

## U1 — model-test-runner helper-only coverage (A1, A6)

- **File/lines:** `tests/unit/model-test-runner.test.ts:1-3`, `:10-46`, `:48-88`.
- **Evidence:** the file imports only `parseRetryAfterHeader` and `detectTestKind` at line 3. Every declaration in the file targets one of those two helpers (retry parsing lines 10-46; test-kind detection lines 53-88). There is no call to `runSingleModelTest`.
- **Affected public boundary:** `runSingleModelTest` is exported and begins at `src/lib/api/modelTestRunner.ts:172-174`; it resolves the provider alias at `:177`, normalizes the selected-provider model at `:189-206`, resolves identity at `:224-226`, and builds the actual request body at `:238-249`.
- **Criteria:** **A1** (only an internal helper surface, not the affected public boundary) and **A6** (the test can stay green while the boundary normalization path is broken).
- **Why it passes but does not cover:** all assertions can pass while the boundary's provider/model normalization or dispatch behavior is wrong. This is not theoretical in the task context: the task explicitly identifies the missing `runSingleModelTest` alias-prefix case at `docs/tasks/01-open/0176-omniroute-canonical-alias-normalization.md:33-36`.
- **Impact:** high. A green helper file does not protect the operator-facing model-test request. It should be replaced or supplemented by a boundary test that asserts resolved provider/model and an observable upstream payload.
- **Not claimed:** this report does not claim that every helper test in the repository is useless, nor that this file's helper logic has no value. The classification is specifically about using it as evidence for the public boundary.

## Explicit non-findings / candidate queue

### No-throw assertions

A marker scan found 188 `doesNotThrow`/`doesNotReject`/`not.throws` occurrences in 108 files. Example locations include `tests/unit/agent-bridge-targets-serializable.test.ts:25` and `tests/unit/arena-elo-sync.test.ts:821-827`. The syntax alone cannot establish uselessness: some assertions wrap a meaningful operation and may be paired with state/payload checks elsewhere in the test. Per the RD A3 criterion, each file needs a payload/postcondition read before classification.

### Mock-heavy tests

The scan found 225 bounded candidate files. For example, `tests/integration/chat-pipeline.test.ts:531-559` replaces `globalThis.fetch`, but it also calls the production `handleChat` path at `:541` and checks the resulting response at `:552-559`; therefore it is not automatically useless. Conversely, `tests/unit/provider-alias-normalization.boundary.test.ts:50-85` uses a fetch capture but drives `runSingleModelTest` at `:164-181` and asserts resolved identity plus upstream payload. These examples are why mock presence alone is not a classification.

## Recommended audit rule for the next bounded pass

For every candidate, require all of the following before labeling it useless:

1. identify the changed/claimed boundary;
2. trace the imported symbol and invocation;
3. show whether the public boundary is called;
4. show at least one postcondition/payload assertion;
5. record the exact criterion A1-A8 and a counterfactual (what production bug could pass?).

That rule follows the existing boundary contract shape, where the test asserts public-boundary results and upstream-observable data (`tests/unit/provider-alias-normalization.boundary.test.ts:150-193`), not merely helper return values.

## Limits

This is a conservative classification slice. It is not an exhaustive per-file useless-test census and must not be summarized as “only one bad test exists.” The honest claim is “one finding verified in the inspected archetype; broad marker-based candidates remain for a later delegated pass.”
