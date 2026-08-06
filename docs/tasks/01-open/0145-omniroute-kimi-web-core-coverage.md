# Task 0145: Add core response and streaming coverage for Kimi-web

> **Status**: `[ ]` Open
> **Priority**: 🟡 P1
> **Type**: `HARDEN`
> **Origin**: Gortex review + focused investigator review of Task 0122.
> **Blocks**: Final approval of Task 0122.
> **Depends on**: Task 0122 implementation in review.
> **Parallelism**: `serializable` — owns Kimi-web executor tests and must precede final Task 0122 approval.
> **Review routing**: independent reviewer; do not promote 0122 until evidence is accepted.

## Objective

Cover the Kimi-web executor's actual Connect-RPC request/response behavior,
rather than only helper functions, URL construction, and 401 paths. Tests MUST
exercise non-streaming decoding, streaming frame/delta conversion, upstream
non-OK responses, fetch failures, and `validateKimiWebProvider`.

## Background Context

- `open-sse/executors/kimi-web.ts` contains the core non-stream and stream paths.
- Existing decoder/model tests pass, but the executor's “valid token” test can
  pass after reaching fetch without asserting frame/body/response behavior.
- Focused Gortex follow-up found no direct tests for the validator and several
  executor error/stream branches.
- Do not redo already-covered framing/token/model tests unless needed as fixtures.

## Test Requirements

- Mocked Connect-RPC response proves non-stream content extraction.
- Mocked readable stream proves multiple frames become correct SSE deltas and `[DONE]`.
- Aborted stream does not emit a misleading final `[DONE]` after cancellation.
- HTTP non-OK response maps to the documented sanitized error.
- Fetch rejection maps to the documented 502 path.
- `validateKimiWebProvider` is tested for success and failure without live credentials.
- No live Codex/provider test is needed; if any shared harness requires one, use only `gpt-5.6-luna`.

## Exit Conditions (GDD/TDD)

- [ ] Existing Kimi helper/model tests remain passing.
- [ ] Non-streaming and streaming executor branches have mocked response tests.
- [ ] HTTP-error, fetch-error, abort, and validator branches have tests.
- [ ] `node --import tsx/esm --test tests/unit/kimi-web-core-coverage.test.ts` passes.
- [ ] `npm run typecheck:core` passes.
- [ ] `npm run lint` passes without new errors.
- [ ] No production `:22000` traffic is used.
- [ ] `.changelog/` entry is created and rebuilt.
- [ ] Completion Evidence and Review Trail are filled.

## Details

### What

- [ ] **Ler código existente**: read Kimi executor, decoder tests, model tests,
  validator, and Task 0122 review evidence.
- [ ] Build deterministic Connect-RPC frame fixtures.
- [ ] Write failing branch tests before implementation/test seams.
- [ ] Add only the minimal test seam needed to inject fetch/stream responses.
- [ ] **Refactoring pass**: avoid changing production behavior unless a test proves a defect.
- [ ] **Verificação de regressão**: Kimi suite, typecheck, lint.

### Where

| File | Purpose |
|---|---|
| `open-sse/executors/kimi-web.ts` | Read branch behavior; modify only if coverage exposes a defect. |
| `src/lib/providers/validation/webProvidersA.ts` | Read/test Kimi validator. |
| `tests/unit/kimi-web-core-coverage.test.ts` | Create core executor/validator tests. |
| Existing Kimi tests | Reuse fixtures and regression coverage. |
| `docs/tasks/03-review/0122-omniroute-kimi-web-port.md` | Add accepted review evidence reference. |
| `.changelog/` | Create closeout entry. |

### How

1. Mock fetch and readable streams; do not call `www.kimi.com`.
2. Assert request headers/body and decoded response content.
3. Cover failure/abort paths explicitly.
4. Run the exact targeted command and attach output to 0122's review evidence.

### Why

The Kimi port can appear healthy while only helper tests pass. Core stream and
response coverage is required before declaring the upstream port complete.

## Parallelism / file ownership

| Class | Detail |
|---|---|
| **parallel-safe** | Safe beside NVIDIA, reasoning, retry, and quota tasks. |
| **serializable** | Must precede final Task 0122 approval. |
| **Collision** | Kimi executor tests, validator tests, and Task 0122 review evidence. |

## ⛔ Anti-Hallucination Guardrails

> Passing URL/401 tests is not proof of Connect-RPC correctness. Do not claim
> live Kimi success without operator credentials. Never touch `:22000`.

## 🛡️ Compliance Checklist

- [ ] Tests use deterministic mocks.
- [ ] No credentials are committed/logged.
- [ ] Error messages remain sanitized.
- [ ] No raw SQL.
- [ ] No deletion.

## 📋 Completion Evidence

- **Files/tests/output**: [fill]
- **Coverage branches**: [fill]
- **Typecheck/lint/changelog**: [fill]
- **Executor/date**: [fill]

## 🔍 Review Trail

- **Reviewer/verdict/score**: [fill]
- **Notes**: [fill]
