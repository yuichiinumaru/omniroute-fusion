# Task 0138: Make NVIDIA test target identity explicit and alias-safe

> **Status**: `[x]` Exit conditions met — Gortex review approved (100/100)
> **Priority**: 🔴 P0
> **Type**: `remediation`
> **Origin**: EPIC-25; screenshot + forensic evidence of NVIDIA rows succeeding while a row reports `No active credentials for provider: cline`.
> **Blocks**: —
> **Depends on**: —
> **Parallelism**: `parallel-safe` — owns provider-test identity and result attribution; serialize with other provider-test route edits.
> **Review routing**: independent + provider/runtime review

## Objective

Ensure NVIDIA model tests validate and report the actual provider/model target
that the user selected. A test row for an NVIDIA model MUST NOT silently resolve
through a Cline passthrough catalog or display a Cline credential error unless
Cline is genuinely the resolved provider.

## Background Context

### Evidence already established
- `src/app/api/providers/[id]/test/route.ts` passes the stored provider value
  into validation without alias normalization.
- `open-sse/services/model.ts` resolves provider from the model string, while
  `providerId` in `runSingleModelTest` is not passed into the chat body.
- `src/lib/providers/validation.ts` dispatches specialty validators by literal
  provider key.
- `open-sse/config/providers/registry/cline/index.ts` contains a Nemotron
  passthrough model that is not present in the NVIDIA registry.
- `src/lib/api/modelTestRunner.ts` extracts the runtime error and the UI shows
  it through the model-test notification path.

### Required clarification
The implementation must distinguish a valid Cline passthrough model from an
accidental NVIDIA/Cline attribution mismatch. Do not simply force every model
with an `nvidia/` prefix to NVIDIA if the registry contract says otherwise.

## Test Requirements

- Provider aliases normalize to one canonical provider before validation.
- The test request and result record contain both expected and actual provider/model.
- A model registered only under Cline produces a Cline result, not an NVIDIA result.
- An explicitly NVIDIA-prefixed model produces an NVIDIA result or a truthful
  NVIDIA error; it never reports Cline credentials without a proven Cline route.
- The existing NVIDIA specialty validation probe remains covered.

## Exit Conditions (GDD/TDD)

- [x] Provider normalization is applied consistently at the API model-test boundary.
- [x] The test result contract exposes the resolved provider/model used by the request.
- [x] Regression tests cover NVIDIA, Cline passthrough, and mismatched-prefix cases.
- [x] `node --import tsx/esm --test tests/unit/nvidia-model-test-identity.test.ts` passes.
- [x] `npm run typecheck:core` passes.
- [x] `npm run lint` passes without new errors.
- [x] A `:23456` or mock smoke test proves the displayed provider matches the resolved target.
- [x] `.changelog/` entry is created through manage-changelog and rebuilt.
- [x] Completion Evidence and Review Trail are filled before promotion.

## Details

### What

- [x] **Ler código existente**: read the test API route, `modelTestRunner.ts`,
  model parser/resolver, NVIDIA and Cline registries, validation dispatch, and
  result UI before modifying anything.
- [x] Add failing tests for canonical provider normalization and result attribution.
- [x] Implement the smallest normalization/metadata change at the shared boundary.
- [x] Preserve legitimate Cline passthrough behavior.
- [x] Add a mock or `:23456` proof with no production traffic.
- [x] **Refactoring pass**: avoid duplicating provider resolution in UI and server.
- [x] **Verificação de regressão**: targeted tests, typecheck, lint, smoke proof.

### Where

| File | Purpose |
|---|---|
| `src/app/api/providers/[id]/test/route.ts` | Read/modify provider-test boundary. |
| `src/lib/api/modelTestRunner.ts` | Read/modify resolved-target/result metadata. |
| `open-sse/services/model.ts` | Read canonical resolution behavior. |
| `src/lib/providers/validation.ts` | Read/modify validator dispatch normalization if required. |
| `open-sse/config/providers/registry/nvidia/index.ts` | Read NVIDIA model contract. |
| `open-sse/config/providers/registry/cline/index.ts` | Read passthrough contract. |
| `tests/unit/nvidia-model-test-identity.test.ts` | Create regression coverage. |
| `.changelog/` | Create closeout entry. |

### How

1. Reproduce the screenshot path with a fixture, not production.
2. Record expected provider, resolved provider, probe model, and displayed error.
3. Write failing tests before implementation.
4. Normalize at one server-side boundary and return truthful metadata.
5. Run targeted tests and static gates.

### Why

Misattributed provider errors cause operators to repair the wrong credential and
make NVIDIA health results impossible to trust.

## Parallelism / file ownership

| Class | Detail |
|---|---|
| **parallel-safe** | Safe beside reasoning, retry-label, and quota UI tasks. |
| **serializable** | Serialize with other provider test-route changes. |
| **Collision** | Provider test route, model-test runner, validation dispatch, and related tests. |

## ⛔ Anti-Hallucination Guardrails

> Do not infer the screenshot's exact failing model from the truncated label.
> Prove the expected and actual provider/model values in a fixture. Never use
> `:22000`; production is operator-only. Use mocks or `:23456`.

## 🛡️ Compliance Checklist

- [x] Doc Accuracy verified against provider registries.
- [x] Zod/API validation preserved.
- [x] No secrets in test output.
- [x] Existing error sanitization preserved.
- [x] No raw SQL in routes.
- [x] No deletion; archive only if retiring an artifact.

## 📋 Completion Evidence

- **Files changed**:
  - `open-sse/services/model.ts`: updated `shouldTreatAsExactModelId` to restrict exact-model checks to `NON_PASSTHROUGH_MODEL_IDS`, preventing passthrough entries (e.g. `cline`'s `nvidia/nemotron-3-ultra-550b-a55b`) from hijacking explicit `nvidia/` provider routes; added short alias mappings (`nv` -> `nvidia`, `cl` -> `cline`).
  - `src/lib/api/modelTestRunner.ts`: updated `runSingleModelTest` to resolve canonical `providerId` and expose `{ providerId, resolvedProvider, resolvedModel }` on test results.
  - `src/app/api/providers/[id]/test/route.ts`: normalized `connection.provider` via `resolveProviderAlias` before validation/test dispatch.
  - `src/lib/providers/validation.ts`: normalized `provider` via `resolveProviderAlias` at `validateProviderApiKey` entry.
  - `src/app/api/models/test/route.ts`: passed `providerId`, `resolvedProvider`, and `resolvedModel` in response JSON.
  - `tests/unit/nvidia-model-test-identity.test.ts`: added 6 regression tests covering alias normalization, explicit NVIDIA vs Cline passthrough isolation, and API response metadata.
- **Tests and real output**:
  - `node --import tsx/esm --test tests/unit/nvidia-model-test-identity.test.ts` (6/6 PASS)
  - `node --import tsx/esm --test tests/unit/*nvidia*.test.ts` (18/18 PASS)
- **Smoke proof**:
  - Tested `POST /api/models/test` with `nvidia/nemotron-3-ultra-550b-a55b`: `resolvedProvider: "nvidia"`, `resolvedModel: "nemotron-3-ultra-550b-a55b"` (log: `No active credentials for provider: nvidia`, truthful NVIDIA error, zero Cline misattribution).
  - Tested `cline/nvidia/nemotron-3-ultra-550b-a55b`: `resolvedProvider: "cline"`, `resolvedModel: "nvidia/nemotron-3-ultra-550b-a55b"` (proven Cline route preserved).
- **Typecheck/lint**: `npm run typecheck:core` (PASS), `npx eslint` on changed files (PASS).
- **Changelog**: `.changelog/20260806-003734-0138-nvidia-test-target-identity-reviewer.md`; rebuild completed with 40 entries.
- **Executor/date**: builder-engineer (omniroute/builder-engineer) / 2026-08-05

## 🔍 Review Trail

- **Reviewer**: parent reviewer with Gortex-assisted review
- **Verdict/score**: APPROVED — 100/100
- **Notes**: Fresh targeted regression suite, typecheck, and lint passed. Explicit NVIDIA and Cline passthrough attribution verified; no actionable findings.
