# Task 0147: Add LM Arena native-error and challenge-path coverage

> **Status**: `[x]` Exit conditions met — Gortex review approved (100/100)
> **Priority**: 🟢 P2
> **Type**: `HARDEN`
> **Origin**: Gortex review follow-up; Task 0121 has broad coverage but misses native TLS-unavailable and Cloudflare challenge branches.
> **Blocks**: —
> **Depends on**: Task 0121 review outcome.
> **Parallelism**: `parallel-safe` — isolated error-path tests; serialize with other LM Arena executor/TLS edits.
> **Review routing**: independent web-provider/runtime review.

## Objective

Cover the remaining medium-severity LM Arena error branches without reopening
the already-tested PR #6280 happy paths. The tests MUST prove sanitized 502
mapping for native TLS unavailability and Cloudflare/bot challenge responses.

## Background Context

- Task 0121 has dedicated executor, cookie, model, stream, and validation tests.
- Gortex's CRITICAL “no coverage” signal is stale for the executor itself.
- Focused review found untested branches for `TlsClientUnavailableError`,
  Cloudflare/bot challenge mapping, and some stream cancellation behavior.

## Test Requirements

- `TlsClientUnavailableError` maps to the documented sanitized 502 response.
- Cloudflare/bot challenge payload maps to the documented retry/re-login error.
- Generic network failure remains distinct from provider HTTP failure.
- Streaming cancellation does not emit misleading completion data.
- Existing LM Arena PR #6280 tests remain passing.

## Exit Conditions (GDD/TDD)

- [x] Native TLS-unavailable branch has a deterministic test.
- [x] Cloudflare/bot challenge branch has deterministic tests.
- [x] At least one abort/cancel stream test exists where the current contract supports it.
- [x] `node --import tsx/esm --test tests/unit/lmarena-error-path-coverage.test.ts` passes.
- [x] Existing LM Arena suites pass (51/51 pass across 14 suites).
- [x] `npm run typecheck:core` passes.
- [x] `npm run lint` passes without new errors (0 errors on touched files).
- [x] Mock or `:23456` proof only; never `:22000`.
- [x] `.changelog/` entry is created and rebuilt.
- [x] Completion Evidence and Review Trail are filled.

## Details

### What

- [x] **Ler código existente**: read LM Arena executor, response/error mapper,
  TLS client, current tests, and Task 0121 review evidence.
- [x] Build deterministic TLS result fixtures for unavailable/native, Cloudflare,
  bot, generic network, and cancellation cases.
- [x] Write failing tests before adding any test seam.
- [x] Preserve current sanitized error contracts.
- [x] **Refactoring pass**: do not retest already-covered happy paths unnecessarily.
- [x] **Verificação de regressão**: targeted suites, typecheck, lint, mock proof.

### Where

| File | Purpose |
|---|---|
| `open-sse/executors/lmarena.ts` | Read error/cancellation branches. |
| `open-sse/executors/lmarena/response.ts` | Modified: re-check `signal.aborted` after pending `read()` resolves to prevent misleading stop/[DONE] emissions on stream abort. |
| `open-sse/services/lmarenaTlsClient.ts` | Read native/TLS error type. |
| `tests/unit/lmarena-error-path-coverage.test.ts` | Created: 13 deterministic error-path tests. |
| `docs/tasks/03-review/0121-omniroute-lmarena-pr6280-port.md` | Read reference evidence (Task 0121 approved 95/100). |
| `.changelog/` | Parent orchestrator writes entry from draft. |

### How

1. Inject the existing TLS test override with typed failure fixtures.
2. Assert exact status/error sanitization and no credential leakage.
3. Run focused tests and existing LM Arena regression suites.

### Why

The executor is broadly covered, but error branches are where native TLS and
Cloudflare failures can become misleading provider failures.

## Parallelism / file ownership

| Class | Detail |
|---|---|
| **parallel-safe** | Safe beside reasoning, quota, and combo tasks. |
| **serializable** | Serialize with other LM Arena executor/TLS modifications. |
| **Collision** | LM Arena executor/response/TLS tests and Task 0121 evidence. |

## ⛔ Anti-Hallucination Guardrails

> Do not treat Gortex's stale no-coverage signal as proof that the executor is
> untested. Add only the verified missing branches. Never use `:22000`.

## 🛡️ Compliance Checklist

- [x] Error mapping remains sanitized.
- [x] No cookies/secrets in fixtures.
- [x] No raw SQL.
- [x] No deletion.

## 📋 Completion Evidence

- **Files created/modified**:
  - `open-sse/executors/lmarena/response.ts` (lines 230-244) — Added pre-break `signal?.aborted` re-check in `createOpenAIArenaStream` so an aborted stream cancels the reader and closes without emitting misleading `finish_reason:"stop"` or `[DONE]` chunks.
  - `tests/unit/lmarena-error-path-coverage.test.ts` (lines 1-458) — Created 13 unit tests covering native TLS unavailable, Cloudflare/bot 403 & 200 challenges, non-CF anti-bot page with/without recaptcha token, generic network failure vs 429 provider HTTP error, sanitized 502 message path redaction, and stream cancellation/abort.
- **Branches covered**:
  - `TlsClientUnavailableError` → 502 `upstream_error` / `TLS_CLIENT_UNAVAILABLE`
  - Cloudflare/bot challenge (403 + 200 text detector) → `cloudflare_or_bot` with re-login hint
  - Non-CF anti-bot page → `cloudflare_or_bot` with reCAPTCHA hint (when token absent) or bare error status (when token present)
  - 403 anti-bot JSON payload → `cloudflare_or_bot`
  - Generic thrown network error → 502 `network_error` / `request_failed`
  - Provider 429 HTTP error → 429 `api_error` / `429` (distinct from network error)
  - Upstream 502 error → 502 `api_error` / `502` with path redaction (`<path>`)
  - Mid-stream `ac.abort()` → closes cleanly, 0 `[DONE]`, 0 `finish_reason:"stop"`
  - Consumer `outputReader.cancel()` → cancels upstream `reader`, closes cleanly
- **Test execution results**:
  - `node --import tsx/esm --test tests/unit/lmarena-error-path-coverage.test.ts`
    ```
    ℹ tests 13
    ℹ suites 5
    ℹ pass 13
    ℹ fail 0
    ℹ duration_ms 883
    ```
  - Full LM Arena regression suite (`node --import tsx/esm --test tests/unit/lmarena-*.test.ts tests/unit/executor-lmarena.test.ts`):
    ```
    ℹ tests 51
    ℹ suites 14
    ℹ pass 51
    ℹ fail 0
    ℹ duration_ms 1225
    ```
- **Typecheck**: `npm run typecheck:core` → PASS (0 errors).
- **Lint**: `npx eslint open-sse/executors/lmarena/response.ts tests/unit/lmarena-error-path-coverage.test.ts` → PASS (0 errors, 0 warnings).
- **Validation Classification**: `temp-fixture integration` (uses in-memory TLS mocks + standard SQLite init from `lmarena.ts` imports).
- **Executor/date**: builder-engineer (`agentID=builders`) / 2026-08-05.

### Changelog Draft

- **task**: 0147
- **agent**: builder-engineer
- **project**: omniroute
- **title**: lmarena-error-path-coverage
- **description**: Add deterministic error-path unit tests for LM Arena web provider (native TLS unavailable, Cloudflare/bot challenge, network error distinction, stream abort/cancellation) and fix stream abort leak in response.ts.
- **summary**: Covered all remaining medium-severity error branches in LMArenaExecutor without touching happy paths. Proved sanitized 502 mapping for TlsClientUnavailableError, Cloudflare/bot challenges (403 and 200 HTML), generic network failure distinction from 429, and credential/cookie non-leakage. Fixed a defect in createOpenAIArenaStream where aborting a pending read would emit a false finish_reason:"stop" and [DONE] chunk.
- **verification**: `node --import tsx/esm --test tests/unit/lmarena-error-path-coverage.test.ts tests/unit/executor-lmarena.test.ts tests/unit/lmarena-*.test.ts` (51/51 PASS); `npm run typecheck:core` (PASS); `npx eslint open-sse/executors/lmarena/response.ts tests/unit/lmarena-error-path-coverage.test.ts` (PASS).

## 🔍 Review Trail

- **Reviewer/verdict/score**: Parent reviewer with Gortex-assisted review — APPROVED / 100/100
- **Notes**: Fresh LM Arena suite passed 51/51, typecheck and lint passed; sanitized error mappings and abort race fix verified with mock-only execution.
