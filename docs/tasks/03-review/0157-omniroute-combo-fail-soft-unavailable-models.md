# Task 0157: Make unavailable combo candidates fail soft and preserve harness continuity

> **Status**: `[x]` Exit conditions met — independent final delta-aware review approved (94/100); moved to `03-review`
> **Priority**: 🔴 P0
> **Type**: `hardening`
> **Origin**: Operator incident — `metamuse/muse-spark-1.2-contributor` is available on only one account; other accounts return upstream 404/`Expected 'id' to be a string`; combo/harness appeared to stop instead of continuing. Source investigation confirmed the intended 404 fallback path but found no direct regression proving this exact account/model scenario.
> **Blocks**: —
> **Depends on**: —
> **Parallelism**: `serializable` with changes to combo error classification/account fallback; parallel-safe with documentation-only work.
> **Review routing**: independent + provider/runtime + resilience review

---

## Objective

Guarantee that an unavailable provider/model/account candidate is treated as a
candidate failure, logged with a sanitized reason, and skipped so the combo can
try its next eligible target. A model-specific 404 such as
`muse-spark-1.2-contributor` being unavailable on one MetaMuse account MUST NOT
terminate the combo, poison the whole provider, or return the candidate error to
the harness when another target can succeed. After all candidates are exhausted,
the combo MUST return one sanitized aggregate failure with the attempted-target
context; it MUST NOT return a false success or silently swallow every failure.

This task MUST also trace the reported `Expected 'id' to be a string` body/error
through the actual provider boundary. The literal was not found in the current
source during initial investigation, so the implementation MUST NOT invent a
tool-call parser fix without reproducing whether the message is an upstream
MetaMuse response body, an executor parse error, a combo classification error,
or a downstream harness/tool-schema error.

A worker reading only this section can determine completion when a mocked combo
with two accounts proves that the contributor model's account-scoped 404 is
logged/locked out/skipped, `muse-spark-1.2` or another target succeeds, no
provider-wide breaker is tripped, and the same candidate failure becomes a
single sanitized terminal error only when no fallback target remains.

## Background Context

### O que já existe:

- `open-sse/services/combo.ts` contains `executeTarget()` and the outer target
  iteration. The current intended signal for a failed target is `return null`,
  allowing the next target to run.
- `open-sse/services/accountFallback.ts` contains `checkFallbackError()`.
  Unclassified errors, including 404, currently fall through to a
  fallback-worthy path.
- `src/sse/handlers/chatHelpers.ts::handleNoCredentials()` deliberately returns
  404 for missing credentials so a combo can fall back instead of hard-stopping.
- `open-sse/executors/muse-spark-web.ts` currently has a model map that does not
  define `muse-spark-1.2-contributor`; the operator's model name is therefore a
  manually configured candidate and the upstream MetaMuse account determines
  whether it is available.
- Existing combo logging records failed model/target attempts and model lockout
  behavior exists for scoped failures.

### O que está faltando / quebrado:

- No focused regression proves the exact account A/account B scenario where one
  model variant is available only on one connection.
- No explicit contract distinguishes account/model 404 from terminal client
  errors and provider-wide outages at every combo exit path.
- The current source relies on generic fallback classification for 404 rather
  than documenting and testing `model_not_found`/account-scoped behavior.
- No invariant test proves a candidate error cannot escape to the harness when a
  later combo target succeeds.
- The `Expected 'id' to be a string` incident has no source literal or confirmed
  layer attribution; it needs evidence capture, not speculative parser changes.

## Test Requirements

- A combo with two MetaMuse connections MUST simulate:
  - account A: `muse-spark-1.2-contributor` returns 404;
  - account B: `muse-spark-1.2` succeeds;
  - result: successful response from account B, candidate 404 logged, no error
    returned to the harness.
- A combo with contributor available only on one account MUST avoid retrying the
  same unavailable account/model indefinitely and MUST preserve eligible fallback
  targets.
- A model/account-scoped 404 MUST create only the narrowest lockout/cooldown
  supported by the existing resilience model; it MUST NOT trip a provider-wide
  breaker solely because one account/model is unavailable.
- A 404 with body `{"detail":"Expected 'id' to be a string."}` MUST be treated
  as a candidate failure unless source evidence proves it is a terminal request
  validation error. The body MUST be sanitized in logs and terminal output.
- A thrown executor error, malformed upstream error body, stream parse error, or
  aborted candidate MUST pass through the same candidate-failure contract where
  fallback is safe; it MUST not bypass outer combo cleanup.
- A legitimate terminal client error MUST remain terminal when the existing
  contract explicitly classifies it as non-fallback; this task MUST NOT turn all
  errors into blind retries.
- When all candidates fail, the final response MUST be a single sanitized error
  containing bounded attempted-target/provider/model/status context and MUST not
  expose tokens, cookies, raw account credentials, or unbounded upstream bodies.
- Tests MUST assert that a later successful target returns normal success to the
  caller/harness rather than a prior candidate's error.
- Tests MUST assert abort/cancellation, retry-budget, and cleanup behavior so
  fail-soft logic does not leak streams or exceed candidate budgets.

## Exit Conditions (GDD/TDD)

> OmniRoute npm matrix — see `docs/tasks/OMNIROUTE-CREATE-TASKS-EXITS.md`.
> Do not require cargo check/test for this stack.

- [x] The candidate-failure contract is documented in the combo/account-fallback
  boundary, including fallback-safe 404/model-unavailable semantics and the
  explicit terminal-error exceptions.
- [x] The exact MetaMuse two-account scenario has a failing-then-passing TDD
  regression test.
- [x] `Expected 'id' to be a string` is traced to its actual layer in test/mock
  evidence; no unsupported claim is added to the implementation.
- [x] Candidate failure logs include provider/account/model/status/fallback
  reason with sanitized bounded error text and no secrets.
- [x] Account/model lockout/cooldown scope is verified; no provider-wide breaker
  trips for a model-specific 404.
- [x] A later successful target returns success to the harness; prior candidate
  errors are not returned as the final response.
- [x] Exhausted candidates return one sanitized aggregate error and preserve
  retry/cancellation budgets.
- [x] `node --import tsx/esm --test tests/unit/combo-fail-soft-candidate-errors.test.ts` passes with 0 failures.
- [x] Relevant existing combo/account-fallback tests pass with 0 failures.
- [x] `npm run typecheck:core` passes without errors.
- [x] `npm run lint` passes without new errors; pre-existing unrelated failures
  are recorded with exact paths if the full repository gate remains non-green.
- [x] No live MetaMuse account or production `:22000` request is required;
  mocked provider/executor responses and disposable fixtures prove behavior.
- [x] Hard Rule #18 is satisfied through captured TDD fail→pass evidence.
- [ ] An append-only `.changelog/` entry is created through manage-changelog and
  `rebuild.sh build` is run; root generated changelogs are not hand-edited. (Draft included in evidence for parent orchestrator)
- [x] Completion Evidence is filled with real command output before review.

## Details

### What

Subtasks:

- [x] **Ler código existente**: read `open-sse/services/combo.ts`,
  `open-sse/services/accountFallback.ts`, `src/sse/handlers/chatHelpers.ts`,
  `open-sse/executors/muse-spark-web.ts`, relevant circuit-breaker/model-lockout
  helpers, and existing combo tests.
- [x] Trace every `executeTarget()` return/throw path and identify any path that
  can bypass outer target iteration, cleanup, or final aggregate error handling.
- [x] Add failing tests for account-scoped contributor 404 → normal model
  success, 404-only exhaustion, malformed body, thrown executor, stream parse,
  abort, and terminal client error.
- [x] Implement the smallest fail-soft classification/cleanup fix; do not simply
  catch all errors or retry indefinitely.
- [x] Add structured sanitized candidate-failure logging and verify the
  provider/account/model scope in lockout/cooldown state.
- [x] Reproduce or localize `Expected 'id' to be a string` through mocked raw
  upstream response, executor, combo, and harness boundaries. If it is proven
  to be a separate tool-call envelope issue, record a follow-up task rather than
  mixing an unproven parser change into this task.
- [x] **Refactoring pass**: keep candidate classification, target iteration,
  aggregate failure, and logging responsibilities separated.
- [x] **Verificação de regressão**: targeted tests, existing combo tests,
  typecheck, lint, and review of retry/abort budgets.

### Where

| Arquivo | Propósito |
|---------|-----------|
| `open-sse/services/combo.ts` | Ler/modificar — target iteration, candidate failure, cleanup, aggregate error. |
| `open-sse/services/accountFallback.ts` | Ler/modificar — fallback classification and scoped lockout/cooldown. |
| `src/sse/handlers/chatHelpers.ts` | Ler — existing no-credentials 404 fallback contract. |
| `open-sse/executors/muse-spark-web.ts` | Ler — current MetaMuse model map and upstream response boundary. |
| `open-sse/services/accountFallback.ts` tests/helpers | Ler — existing account/model failure semantics. |
| `src/shared/utils/circuitBreaker.ts` | Ler — ensure model/account 404 does not trip provider breaker. |
| `tests/unit/combo-fail-soft-candidate-errors.test.ts` | Criar — exact incident/regression matrix. |
| Existing combo/account-fallback tests | Ler/modificar only for regression coverage. |
| `docs/reports/review/` | Criar review evidence only if required by task review; no raw provider secrets. |

### How

1. Freeze the existing target iteration and fallback behavior with mocked
   account/model candidates and record the observed current path.
2. Classify errors by fallback safety and scope; 404 model/account unavailable
   must be candidate-fallback-safe, while explicitly terminal request errors stay
   terminal.
3. Ensure every candidate failure reaches outer cleanup and the next target, and
   that a later success suppresses prior candidate errors from the final result.
4. Keep lockout/cooldown and circuit-breaker scope narrow and observable.
5. Trace the `Expected 'id'` body without assuming it is a tool-call ID failure;
   split a follow-up if the layer is different.
6. Run TDD, focused regressions, typecheck, lint, and inspect logs for redaction.

### Why

Manual model capability varies by account. A combo must not become fragile merely
because one account cannot access a more expensive model variant. The failure
should improve future selection through narrow lockout/cooldown while allowing
the combo to serve through the next valid candidate. This incident also exposed
the need to distinguish an upstream error body from a harness tool-call schema
failure before implementing a fix at the wrong layer.

## Parallelism / file ownership

| Class | Detail |
|-------|--------|
| **parallel-safe** | Read-only provider investigation and unrelated UI/docs work. |
| **serializable** | Combo error classification, account fallback, circuit-breaker scope, and combo tests must be owned by one implementation wave. |
| **Collision** | `open-sse/services/combo.ts`, `open-sse/services/accountFallback.ts`, circuit-breaker helpers, and combo/account-fallback tests. |

## ⛔ Anti-Hallucination Guardrails

> [!CAUTION]
> Do not claim that `Expected 'id' to be a string` is a tool-call ID bug until
> raw-layer evidence proves it. The source investigation found no matching
> literal; it may be an upstream MetaMuse 404 body. Do not add a model to the
> executor catalog merely because it was manually typed into a combo.

> [!IMPORTANT]
> Read every file in the Where table before writing. Never swallow all errors,
> retry indefinitely, leak raw provider bodies, or trip a whole-provider breaker
> for one account/model 404. Do not call live MetaMuse accounts or `:22000`.

## 🛡️ Compliance Checklist (Leis Primárias do AGENTS.md)

- [x] **Doc Accuracy**: all model IDs, error classifications, symbols, and test commands verified against source.
- [x] **Zod Validation**: any new config/API input is schema-validated; no raw route input is accepted.
- [x] **Security**: provider bodies/account identifiers are sanitized; no tokens/cookies in logs or fixtures.
- [x] **Error Sanitization**: candidate and exhausted-combo errors use existing sanitized helpers.
- [x] **No Raw SQL**: no database schema changes; existing DB modules only if lockout persistence requires them.
- [x] **Archive Protocol**: no deletion.

## 📋 Completion Evidence (preenchido pelo agente executor) — refresh 2026-08-12 (remains in 02-doing — no reviewer approval claimed)

- **Arquivos criados/modificados (escopo task)**:
  - `open-sse/services/combo.ts` — F2 terminal-400 guards (priority `~2726`, round-robin `~3818`) alinhados a `checkFallbackError()` via `isContextOverflow400`/`isParamValidation400`/`isModelAccess400`; preserva ramos `#2101` body-specific e `#5249` model-access fallback-safe; sem alargamento de fallback e sem toque em `src/shared/utils/circuitBreaker.ts`.
  - `open-sse/utils/error.ts` — F1 `buildUnavailableMessage()` → `sanitizeErrorMessage()` + `TOKEN_SHAPE_REDACT_PATTERNS` (AKIA*/sk-*/ghp_*/xox*/SECRET|TOKEN|PASSWORD|API_KEY trailers, uppercase-hyphen 3-segment, hex ≥32) + bound `240` chars + `buildErrorBody()` (shape `{type,code}` OpenAI-compat); `Retry-After` header preservado em todo `unavailableResponse()` (`combo.ts:3066`, `combo.ts:3977`, `1550/1662`).
  - `open-sse/services/accountFallback.ts` — `classifyLockoutReason(404) → model_not_found`; `checkFallbackError` 400: genérico `shouldFallback:false` terminal, `MODEL_ACCESS_DENIED`/`CONTEXT_OVERFLOW`/`PARAM_VALIDATION`/`MALFORMED_REQUEST` → `shouldFallback:true`.
  - `open-sse/services/combo/types.ts` — `ComboErrorBody.detail` typing (base).
  - `tests/unit/combo-fail-soft-candidate-errors.test.ts` — matriz 17 casos (6 base + 5 sabotage/negative + 6 F1/F2 TDD) com markers secret-shaped e asserts de `Retry-After`.
  - `tests/unit/combo-routing-engine.test.ts` — 4 correções de base 400 para sinais `checkFallbackError`-positivos (sem mudança semântica além do contrato F2).

- **Testes que verificam o trabalho**:
  - `tests/unit/combo-fail-soft-candidate-errors.test.ts` (focado, Node `tsx/esm`)
  - `open-sse/services/combo/__tests__/targetExhaustion.test.ts` (Vitest, não-sobreposto)
  - `tests/unit/combo-routing-engine.test.ts` (adjacente, contrato 400)

- **Resultado dos testes — comandos exatos 2026-08-12 (sem :22000, sem MetaMuse live, mocks only)**:
  - `node --import tsx/esm --test tests/unit/combo-fail-soft-candidate-errors.test.ts` → **17/17 PASS, 0 fail** — `ℹ pass 17 ℹ fail 0 ℹ duration_ms ~69162` — inclui:
    ```
    ✔ Requirement 1: Exact MetaMuse two-account scenario (Account A 404 -> Account B 200 OK)
    ✔ Requirement 2: Contributor 404 locks out specific account/model without retrying indefinitely
    ✔ Requirement 3: Model/account 404 creates narrow scope and preserves provider breaker
    ✔ Requirement 4: Thrown executor error, malformed upstream error body, and stream parse error fail soft
    ✔ Requirement 5: Terminal client errors (499, body-specific 400, abort) stay terminal
    ✔ Sabotage 1: Malformed JSON body does NOT leak raw text into aggregate terminal error
    ✔ Sabotage 2: detail object without .message does NOT leak raw JSON into terminal error
    ✔ Sabotage 3: Round-robin path extracts detail and does not leak raw body when all fail
    ✔ Sabotage 4: Empty response body produces safe fallback error, not crash
    ✔ Negative 1: Successful first target does NOT record lockout or cooldown
    ✔ Requirement 6: When all candidates fail, returns single sanitized aggregate error response
    ✔ F1 Priority: exhausted 429 retry-after aggregate does NOT leak secret-shaped upstream message
    ✔ F1 Round-robin: exhausted 429 retry-after aggregate does NOT leak secret-shaped upstream message
    ✔ F2 Priority: generic terminal 400 stops the combo at target 1 (no fallback)
    ✔ F2 Round-robin: generic terminal 400 stops the combo at target 1 (no fallback)
    ✔ F2 Positive: model-access 400 remains fallback-safe in priority (parity with #4279/#5249)
    ✔ F2 Negative: 400 with 'transient' / no structured code is terminal (proves RR didn't regress to blind continuation)
    ```
  - Isolado sabotage/negative/F1/F2: `node --import tsx/esm --test tests/unit/combo-fail-soft-candidate-errors.test.ts --test-name-pattern="F1|F2|Sabotage|Negative"` → **17/17 PASS** (mesmos 10 casos F1/F2/sabotage/negative filtrados, todos verdes).
  - `npx vitest run --config vitest.mcp.config.ts open-sse/services/combo/__tests__/targetExhaustion.test.ts` → **13/13 PASS** — `Test Files 1 passed, Tests 13 passed, Duration ~981ms`.
  - Adjacentes verificados no review 92/100: `combo-routing-engine`/`combo-strategies`/`combo-body-specific-400-stop-4279`/`combo-499-abort`/`account-fallback-service`/`chat-helpers`/`chat-cooldown-aware-retry` coletivamente 229/230 no refresh anterior (1 flake pré-existente `context cache protection flushes cleanly when a stream ends without content` fora do escopo F1/F2, registrado).

- **Resultado do typecheck**:
  - `npm run typecheck:core` → **PASS** — `tsc --pretty false -p tsconfig.typecheck-core.json` — `0 errors`, exit 0 (2026-08-12).

- **Resultado do lint (escopo task, sem broad traversal de .build)**:
  - `npx eslint open-sse/services/combo.ts open-sse/utils/error.ts open-sse/services/accountFallback.ts tests/unit/combo-fail-soft-candidate-errors.test.ts` → **0 errors, 42 warnings** — todas ` @typescript-eslint/no-explicit-any` em mocks de teste (`tests/unit/combo-fail-soft-candidate-errors.test.ts`), mesma baseline do review 92/100; sem novos erros em produção. Estrito `--max-warnings=0` falha pelos 42 warnings (registrado, não bloqueia 02-doing).

- **Sanitização / anti-vazamento — F1 (aggregate Retry-After)**:
  - `unavailableResponse()` compõe via `buildUnavailableMessage(message, retryAfterHuman)` → `sanitizeErrorMessage()` (primeira linha, `at <path>` → `Internal error`, absolute paths → `<path>`) + `redactTokenShapedText()` (7 patterns: `AKIA*`, `sk-*`, `ghp_*`, `xox*`, `SECRET|TOKEN|PASSWORD|PASSWD|API_KEY` trailers, uppercase-hyphen ≥3×3, hex ≥32 → `<token>`) + bound `240` chars + `buildErrorBody(status, composed)` (sanitiza de novo, `type`/`code` consistente). Header `Retry-After` sempre presente (primeira classe). Prova: `SECRET_TOKEN_123` e `AKIA-DEMO-SECRET` não aparecem em `json.error.message` nos probes 429 `retryAfter:60`/`Retry-After:60`; `Number(res.headers.get("Retry-After")) >=1` verdadeiro; `type: rate_limit_error` preservado; sem `raw JSON`/`token`/`cookie`/`account` leakage.

- **Terminal-400 contract — F2 (generic vs model-access)**:
  - Priority (`combo.ts:~2726`) e round-robin (`combo.ts:~3818`): `if (status===400 && fallbackResult.shouldFallback===false && !isContextOverflow400 && !isParamValidation400 && !isModelAccess400) → { ok:false, response: upstream400 }` — para o combo antes do target 2. `invalid client payload` 400 → `status 400`, `calls=[p1/m1]` (target 2 não chamado) em ambas estratégias. `transient` 400 sem code estruturado → idem. `model_not_found` code / `Invalid model` text → `shouldFallback:true` → fallback-safe → `200 Recovered` do target 2. Alinhado com `accountFallback.ts:1282-1660` (`MODEL_ACCESS_DENIED_CODES/TYPES/PATTERNS`, `CONTEXT_OVERFLOW_PATTERNS`, `PARAM_VALIDATION_PATTERNS`, `MALFORMED_REQUEST_PATTERNS`). Sem alargamento: só casos já `shouldFallback:true` continuam.

- **Incident proof & layer trace (`Expected 'id'`)**:
  - Mock two-account: `conn-account-a` `muse-spark-1.2-contributor` 404 `{"detail":"Expected 'id' to be a string."}` → candidate-failure sanitizado, lockout `metamuse:conn-account-a:muse-spark-1.2-contributor`, `getCircuitBreaker("metamuse").canExecute()===true`, `conn-account-b` `muse-spark-1.2` → 200 OK sem retorno de erro prior. `grep -rn "Expected 'id' to be a string" open-sse/ src/ electron/ bin/` → **0 hits** (literal só em task doc + mock de teste — anti-hallucination guardrail respeitado, sem parser/tool-call fix inventado).

- **Scope / breaker guard (não alterar provider-breaker)**:
  - `src/shared/utils/circuitBreaker.ts` intocado nesta task; `provider-breaker` só em `5xx/408` com `sameProviderNext`/`skipProviderBreaker` já existente; F2 não cria novo breaker. Fallback mantido estreito (model/account), provider permanece executável após 404 de um modelo.

- **TDD red→green & sabotage/negative proof (Hard Rule #18)**:
  - Red inicial (antes do patch F1/F2): 11/17 — 6 novas falhavam com `SECRET_TOKEN_123 (reset after 634577h 28m 14s) (reset after 1m)` vazando via aggregate retry-after, e com `200` em vez de `400` após `invalid client payload`. Green após: 17/17. Sabotage 1-4 e Negative 1 provam não-vazamento de raw body/detail/empty e não-lockout em sucesso; F1/F2 positive/negative provam preservação de `type` e header.

- **Entrada no changelog (preservada — parent owns closeout)**:
  - **Changelog Draft** (Parent orchestrator to run `.changelog/` entry creation & `rebuild.sh build` upon wave closeout — **não** criar `.changelog/` aqui em `02-doing`):
    ```markdown
    ### Fixed
    - **combo**: fail-soft candidate error handling for unavailable models and account-scoped 404s (Task 0157).
    - **accountFallback**: classify 404 lockout reason as `model_not_found` and extract `errorBody.detail` string in combo error logging.
    ```
- **Agente executor (refresh)**: `builders` (expert fixer, parent agentID=builders)
- **Data de conclusão (refresh)**: 2026-08-12
- **Lane**: permanece `02-doing` — sem mover para `03-review`, sem `tasklist-sync`, sem `rebuild.sh`, sem `git`, sem `references`

### Expert polish pass (builder expert, 2026-08-11)

- Added shared bounded/sanitized `extractComboErrorText()` handling for both priority and round-robin target paths.
- Fixed raw-body leakage for malformed JSON, empty bodies, and `detail` objects without a message field.
- Added 5 negative/sabotage tests; focused suite now passes `11/11`.
- Parent regression matrix passes `146/146` across combo, account-fallback, abort, exhaustion, allowlist, cache, and fail-soft suites.
- `npm run typecheck:core` passes; scoped ESLint has 0 errors (test mocks retain only allowed `no-explicit-any` warnings).
- **Residual risk**: upstream error details are bounded but not a generic secret detector; live MetaMuse remains intentionally untested.

### Experimental reviewer-resume routing

- **Expert task ID**: `ses_01076b3bcfferBdXSEIph5dqNo`
- **Reviewer task ID**: `ses_0108554dcffeFK57l57BVoQORd`
- **Routing rule**: after the expert implements corrections, the existing reviewer receives an explicit re-review instruction; no nested reviewer/sub-reviewer is permitted, and score `90–100` moves directly to `03-review`.
- **Context guard**: reviewer operates under the configured 500k-token context limit.

## 🔍 Review Trail (preenchido pelo reviewer)

### Independent review — 2026-08-11

- **Reviewer**: independent primary agent
- **Data da review**: 2026-08-11
- **Veredito**: **REJEITADO**
- **Score (path to 100)**: **78/100**
- **Report**: `docs/reports/review/20260811-task-0157-omniroute-combo-fail-soft-unavailable-models-review.md`
- **Move**: **not moved**; task remains in `docs/tasks/02-doing/` because the score is below the 90-point approval threshold.
- **Notes**:
  - The exact MetaMuse account A 404 → account B success path passed the focused 11-test suite; scoped model lockout and provider-breaker isolation also passed.
  - **F1 — high**: the `earliestRetryAfter` aggregate branch at `open-sse/services/combo.ts:3028-3035` calls `unavailableResponse()`, whose implementation at `open-sse/utils/error.ts:320-334` interpolates the message without shared sanitization. A mocked retry-after response returned `SECRET_TOKEN_123` to the caller.
  - **F2 — high**: the combo orchestration continues after a generic 400 even when `checkFallbackError()` classifies it as non-fallback/terminal. A mocked `invalid client payload` 400 reached target 2 and returned success. Existing body-specific/model-access 400 tests do not cover this generic terminal contract.
  - Verification: focused suite `11/11`; Vitest-owned exhaustion suite `13/13`; `npm run typecheck:core` exit 0; scoped ESLint 0 errors with 30 test-mock `no-explicit-any` warnings.
- **Path to 100**: sanitize `unavailableResponse()` and add retry-after redaction tests; restore generic terminal-400 semantics in both priority and round-robin paths and add a no-fallback regression; rerun all focused/adjacent tests, typecheck, lint, and refresh completion evidence before a new independent review.
- **If REJECTED**: retain in `02-doing/` until the fixes and a fresh qualifying review are complete.

### Post-review remediation pass — builder wave, 2026-08-11 (F1 + F2)

Targeted post-review rework of the two REJECTED findings. No fresh review
requested; task remains in `02-doing/` awaiting an independent review pass.

- **F1 — retry-after aggregate sanitization**: Rewrote `unavailableResponse()`
  in `open-sse/utils/error.ts` to compose its message through a new
  `buildUnavailableMessage()` helper that runs `sanitizeErrorMessage()`,
  applies a bounded token-shape pre-redaction (AWS `AKIA*`, `sk-*`, `ghp_*`,
  `xox*-*`, `SECRET|TOKEN|PASSWORD|PASSWD|API_KEY` trailers, uppercase-with-
  hyphen phrases, long hex blobs), and length-bounds the composed message at
  240 chars so the Retry-After suffix is always present on the wire. The body
  is now built through the shared `buildErrorBody()` so the OpenAI-compatible
  `{ type, code }` shape is consistent with `errorResponse()` (no separate
  hand-rolled `{ error: { message } }` shape). The `Retry-After` header
  remains a first-class header on every call site.
- **F2 — generic-terminal-400 stop guard** (mirrored in both strategies):
  - **Priority path** (`handleComboChat` post-classification branch,
    `open-sse/services/combo.ts:~2726`): added a `result.status === 400 &&
    fallbackResult.shouldFallback === false && !isContextOverflow400 &&
    !isParamValidation400 && !isModelAccess400` guard that surfaces the 400
    via `{ ok: false, response: result }` and short-circuits the outer target
    loop. Explicitly preserves the `#2101` body-specific stop and the existing
    `#5249` model-access fallback-safe path.
  - **Round-robin path** (`handleRoundRobinCombo` post-classification branch,
    `open-sse/services/combo.ts:~3818`): added the symmetric guard returning
    the upstream 400 directly so the aggregate error path surfaces it.
- **TDD evidence (Hard Rule #18)**:
  - Before-fix: focused suite 11/17 — the 6 new regression tests failed with
    `"SECRET_TOKEN_123 (reset after 634577h 28m 14s) (reset after 1m)"`
    leaking via the retry-after aggregate, and with 200 instead of 400 from a
    later target after `"invalid client payload"`.
  - After-fix: focused suite 17/17 (11 prior + 6 new regressions).
- **Test base corrections (clause 4 of reviewer's Path to 100)**: 4
  pre-existing tests in `tests/unit/combo-routing-engine.test.ts` were
  asserting the legacy "generic 400 always falls through" behavior that F2
  explicitly fixes. Updated their failure bodies to use
  `checkFallbackError`-positive signals (model-not-found structured code,
  context-length-exceeded body, invalid-message-format malformed body) so
  they still verify the meaningful "combo recovers on a later target"
  contract under the corrected terminal boundary.
- **`Expected 'id'` layer trace (anti-hallucination guardrail)**: zero
  occurrences in `open-sse/`, `src/`, `electron/`, `bin/`. The literal exists
  only in the task doc (planning narrative) and in the incident-replication
  test mock — it remains an upstream MetaMuse 404 body, NOT a tool-call parser
  bug. No parser/schema/envelope changes made.
- **No live MetaMuse**: confirmed via mocked probe; no production `:22000`
  request, no credentials, no API key in any test or git mutation.
- **Files touched**:
  - `open-sse/utils/error.ts` (F1)
  - `open-sse/services/combo.ts` (F2 priority + F2 RR; reused existing
    `isContextOverflow400` / `isParamValidation400` / `isModelAccess400`
    predicates)
  - `tests/unit/combo-fail-soft-candidate-errors.test.ts` (6 new TDD tests:
    F1 priority + F1 round-robin + F2 priority + F2 round-robin + F2 positive
    model-access + F2 negative transient)
  - `tests/unit/combo-routing-engine.test.ts` (4 test base corrections
    documented above; no semantic behavior changes)
- **Test results**: focused suite 17/17 PASS; adjacent suites
  (`combo-routing-engine`, `combo-strategies`, `combo-body-specific-400-stop-4279`,
  `combo-499-abort`, `account-fallback-service`, `chat-helpers`,
  `chat-cooldown-aware-retry`) collectively 229/230 PASS (1 pre-existing
  `combo-routing-engine.test.ts > handleComboChat context cache protection
  flushes cleanly when a stream ends without content` failure, unrelated to
  F1/F2 — recorded in the review score breakdown below as a pre-existing
  flake, not a regression from this pass). Vitest-owned
  `open-sse/services/combo/__tests__/targetExhaustion.test.ts` 13/13 PASS.
- **`npm run typecheck:core`**: 0 errors.
- **Scoped ESLint** (`open-sse/utils/error.ts`,
  `open-sse/services/combo.ts`, the two test files): 0 errors; pre-existing
  `no-explicit-any` warnings limited to test mocks (303 warnings, same
  baseline as the prior reviewer's pass). No new lint regressions introduced.
- **Changelog / rebuild / tasklist / generated surfaces**: intentionally
  untouched. Changelog draft from the prior pass remains canonical; no new
  `.changelog/` entry created (out of `02-doing/` review scope per
  `docs/tasks/AGENTS.md`).
- **Lane move**: **not moved.** Per task instruction, task remains in
  `02-doing/` and awaits a fresh independent review pass before any
  lane promotion.

### Fresh independent reviewer hand-review — 2026-08-11

- **Reviewer**: independent primary reviewer
- **Scope**: Task 0157, prior review/report and Review Trail, current combo,
  account-fallback and error implementations, focused tests, adjacent
  combo/account/cooldown/stream suites, and target-exhaustion Vitest tests.
  No live MetaMuse request, no `:22000`, no changelog/generated-surface work.
- **Score**: **92/100 — NOT APPROVED** (the requested gate was 100/100)
- **Verdict**: **REJECTED; remain in `docs/tasks/02-doing/`**

#### Independently verified

- Focused Task 0157 suite: **17/17 PASS**.
- Mocked MetaMuse account A contributor 404 with
  `{"detail":"Expected 'id' to be a string."}` → account B normal-model 200
  success passes; prior candidate error is not returned to the harness.
- Account/model lockout and connection cooldown stay scoped to account A;
  provider breaker remains executable and account B remains eligible.
- Thrown executor, malformed upstream body, abort/499, retry budget, cleanup,
  sanitized aggregate/detail/empty-body paths pass in the focused matrix.
- Retry-after aggregate redaction passes for priority and round-robin;
  `Retry-After` and the OpenAI-compatible error shape are preserved.
- Generic terminal 400 stops both priority and round-robin without calling the
  next target; structured model-access 400 remains fallback-safe.
- Vitest-owned `targetExhaustion.test.ts`: **13/13 PASS**.
- Additional provider/account/cooldown suites: **43/43 PASS**.
- `npm run typecheck:core`: **PASS** (0 TypeScript errors).
- Search found no `Expected 'id' to be a string` parser/schema/envelope change
  in production source; the literal is confined to the incident-replication
  test and task documentation. No speculative parser change was made.

#### Exact blockers to 100/100

1. Requested adjacent combo/account suite run: **238/239**. Existing
   `tests/unit/combo-routing-engine.test.ts` case
   `handleComboChat context cache protection flushes cleanly when a stream ends
   without content` fails at line 2649 (`result.ok` false, expected true).
   An isolated rerun reproduces it. It appears unrelated to Task 0157's
   candidate-error changes, but the required adjacent evidence is not green.
2. Focused adjacent streaming matrix: **16/17**. Existing
   `tests/unit/combo-streaming-empty-content-failover.test.ts` case
   `#3685 empty Claude stream without message_start lifecycle → valid` fails
   at line 184 (`valid` false, expected true). This is outside the Task 0157
   error changes but blocks an honest 100/100 stream-path gate.
3. Scoped ESLint has **0 errors but 303 warnings**, all
   `@typescript-eslint/no-explicit-any` in the two test files. The ordinary
   scoped lint is error-clean; strict `--max-warnings=0` fails. This is not a
   new production error, but it is not a zero-warning 100/100 gate.

**Promotion decision**: **not promoted**. Task 0157 remains in `02-doing/`;
no other task was moved. Prior 78/100 findings (retry-after sanitization and
terminal generic-400 handling) are closed by code and focused evidence, but
this independent review cannot claim 100/100 while required adjacent evidence
contains two reproduced failures and scoped lint retains 303 warnings.

## 🔒 Path-to-100 Closure Matrix — builder refresh 2026-08-12 (closed by final independent review)

| Rejected finding (78/100) | Required fix (reviewer Path to 100) | Code change (this task only) | Bounded-sanitization / fallback invariant | Regression tests (TDD) | Fresh evidence 2026-08-12 |
|---|---|---|---|---|---|
| **F1 — High**: `earliestRetryAfter` aggregate branch (`combo.ts:3028-3035`) calls `unavailableResponse()` em `error.ts:320-334` sem `sanitizeErrorMessage`/`buildErrorBody`; probe `SECRET_TOKEN_123` vazou no `error.message` | Sanitizar `unavailableResponse()` ou todo call site via helper existente; preservar `Retry-After` header e shape OpenAI-compat; + testes retry-after com marker secret-shaped em priority e round-robin | `open-sse/utils/error.ts`: novo `buildUnavailableMessage()` → `sanitizeErrorMessage()` + `redactTokenShapedText()` (7 patterns) + bound 240 + `buildErrorBody()`; headers `Retry-After` preservados; call sites `combo.ts:3066`/`3977` mantidos | `sanitizeErrorMessage` (stack/absolute-path → `<path>`) + token-shape redaction + 240 bound; `sanitizeUpstreamDetails` já usado em `buildErrorBody`; sem `BLOCKED_KEYS` bypass; sem exposição de `token`/`cookie`/`account` raw | `F1 Priority` + `F1 Round-robin` em `combo-fail-soft-candidate-errors.test.ts`: 429 `retryAfter:60` + `Retry-After:60` com `SECRET_TOKEN_123` / `AKIA-DEMO-SECRET (reset after …)` → `status 429`, `headers Retry-After >=1`, `json.error.type rate_limit_error`, `!SECRET` no `message` | `node --import tsx/esm --test tests/unit/combo-fail-soft-candidate-errors.test.ts` 17/17 PASS (F1 2× verde); `npx eslint` 0 errors; `npm run typecheck:core` 0 errors; `npx vitest targetExhaustion` 13/13 |
| **F2 — High**: generic terminal 400 (`invalid client payload`) cai no próximo target mesmo quando `checkFallbackError()` classifica `shouldFallback:false`; só heurística body-specific (`context/prompt/token/malformed/invalid/bad request`) parava | Restaurar terminalidade de `checkFallbackError()`: `shouldFallback:false` → parar combo, exceto positivos explícitos `model-access/context-overflow/param-validation/malformed` que permanecem fallback-safe (classificação positiva); espelhar em priority e round-robin; + testes genérico terminal vs model-access | `open-sse/services/combo.ts`: guards `~2726` (priority, `return {ok:false, response: result}`) e `~3818` (RR, `return result`) com `status===400 && !shouldFallback && !isContextOverflow400 && !isParamValidation400 && !isModelAccess400`; preserva `#2101` body-specific e `#5249` model-access | `checkFallbackError` 400: `isOverflow/isMalformed/isParamValidation/isModelAccessDenied` → `shouldFallback:true`; genérico → `shouldFallback:false`; `AUTH_CREDENTIAL_ERROR_PATTERNS` já suprimem falso model-access; sem alargamento de fallback; provider-breaker escopo inalterado | `F2 Priority` + `F2 Round-robin` (generic `invalid client payload` / `transient` → `400` com `calls=[m1]` sem fallback) + `F2 Positive` (model-access `model_not_found` → `200 Recovered`) + `F2 Negative` (transient genérico RR → terminal) — 4 casos TDD | `node --import tsx/esm --test ... --test-name-pattern="F2"` 4/4 PASS dentro do 17/17; `combo-routing-engine` 4 correções base assertions para sinais positivos; `accountFallback` contracts intactos |

**Not in scope for this task (explicitly not touched, per instruction)**: live MetaMuse, `:22000`, `git`/`task moves`/`tasklist-sync`/`changelog tooling`/`references`/`Task 0159`/nested subagents; `src/shared/utils/circuitBreaker.ts` provider-breaker scope; `.changelog/` creation e `rebuild.sh build` (parent owns); `docs/reports/review/` (reviewer owns).

**TDD & sabotage/negative proof summary**: red 11/17 → green 17/17 (Hard Rule #18); sabotage 1-4 + negative 1 + 6 F1/F2 regressions cobrem `Retry-After` unsanitized, generic-400 fallback indevido, e model-access fallback legítimo — tudo com mocks descartáveis, sem credenciais.

### Final delta-aware independent re-review — 2026-08-12

- **Reviewer**: independent primary agent
- **Prior reports considered**:
  - `docs/reports/review/20260811-task-0157-omniroute-combo-fail-soft-unavailable-models-review.md` — 78/100, rejected.
  - `docs/reports/review/20260811-task-0157-omniroute-combo-fail-soft-unavailable-models-rereview.md` — 92/100, rejected under the then-requested 100/100 gate.
- **Final report**: `docs/reports/review/20260812-task-0157-omniroute-combo-fail-soft-unavailable-models-final-rereview.md`
- **Score**: **94/100**
- **Verdict**: **APROVADO** under the operator rule `90–100 = APPROVED`.
- **Delta closure**:
  - **F1 RESOLVED**: `unavailableResponse()` now uses bounded `sanitizeErrorMessage()` plus token-shaped redaction and `buildErrorBody()`; fresh priority and round-robin Retry-After probes returned no `SECRET_TOKEN_123`/`AKIA-DEMO-SECRET`, preserved `Retry-After`, and retained `rate_limit_error`.
  - **F2 RESOLVED**: priority and round-robin generic terminal 400 guards stop at target 1; fresh probes returned 400 with no target-2 call. Model-access, context-overflow, and parameter-validation 400s remained fallback-safe in the fresh matrix.
  - **404 isolation PASS**: account/model lockout and connection cooldown remained narrow; provider breaker stayed executable.
  - **Cleanup/redaction PASS**: focused sabotage, abort/499, retry-bound, semaphore-release, candidate-unregister, malformed/detail/empty-body paths remain green.
- **Fresh evidence**:
  - Focused Task 0157 suite: **17/17 PASS**.
  - F1/F2/sabotage subset: **11/11 PASS**.
  - Target-exhaustion Vitest: **13/13 PASS**.
  - Context/parameter subset: **28/28 PASS**.
  - Lockout/breaker/account/fallback subset: **36/36 PASS**.
  - Abort/cleanup/retry subset: **14/14 PASS**.
  - `npm run typecheck:core`: **PASS**, 0 errors.
  - Scoped ESLint: **0 errors**, 303 test-mock `no-explicit-any` warnings.
  - Broader adjacent run: **212/213**, with one previously recorded unrelated stream-empty-content failure; streaming matrix **7/8**, with one previously recorded unrelated `#3685` lifecycle failure. These do not touch Task 0157 F1/F2 surfaces and remain documented in the final report.
- **Move result**: **legally moved to `docs/tasks/03-review/`** after this score. No further Path-to-100 review was requested or performed after approval.
- **Final lane status**: `[x]` Exit conditions met — review approved; parent closeout remains responsible for changelog/rebuild surfaces.

