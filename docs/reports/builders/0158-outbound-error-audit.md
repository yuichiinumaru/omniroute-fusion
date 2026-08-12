# Investigation Packet: Task 0158 — OmniRoute outbound error audit

### Scope
- Files assigned / analyzed / missing
  - Analyzed: `src/app/api/usage/call-logs/route.ts`, `src/app/api/usage/call-logs/[id]/route.ts`, `src/app/api/usage/request-logs/route.ts`, `src/lib/usage/callLogs.ts`, `open-sse/services/combo.ts`, `open-sse/services/accountFallback.ts`, `open-sse/executors/antigravity.ts`, `open-sse/translator/request/openai-to-gemini.ts`, `docs/tasks/02-doing/0157-omniroute-combo-fail-soft-unavailable-models.md`, `docs/tasks/00-planning/EPIC-30-omniroute-outbound-error-triage.md`.
  - Missing/blocked: live authenticated `GET /api/usage/call-logs` evidence; management auth token is not present in this environment.

### Per-File Findings
| File | Role | Findings (line refs) | Inconsistencies | Impact |
| --- | --- | --- | --- | --- |
| `src/app/api/usage/call-logs/route.ts` | Preferred management-authenticated log surface | `requireManagementAuth` at `src/app/api/usage/call-logs/route.ts:115`; accepted filters at `src/app/api/usage/call-logs/route.ts:120-129` include `status`, `model`, `provider`, `account`, `apiKey`, `combo`, `search`, `limit`, `offset`; list assembly in `buildCallLogListRows()` at `src/app/api/usage/call-logs/route.ts:26-111`. | None observed for read-only contract. | Confirms exact bounded query shape for 0158 once auth is available. |
| `src/app/api/usage/call-logs/[id]/route.ts` | Bounded detail retrieval | Detail route requires same `requireManagementAuth` at `src/app/api/usage/call-logs/[id]/route.ts:7`; returns `404` if missing at `src/app/api/usage/call-logs/[id]/route.ts:13-15`. | None observed. | Safe follow-up for per-id correlation inspection after auth unlock. |
| `src/app/api/usage/request-logs/route.ts` | Secondary recent-log surface | Requires `requireManagementAuth` at `src/app/api/usage/request-logs/route.ts:6`; returns last 200 rows from `getRecentLogs(200)` at `src/app/api/usage/request-logs/route.ts:10`. | None observed. | Lower fidelity than `call-logs` for error classification because it lacks explicit `status=error` filtering in this route. |
| `src/lib/usage/callLogs.ts` | Row fields / status/error semantics / redaction | `CallLogSummaryRow` defines `error_summary`, `combo_name`, `combo_step_id`, `combo_execution_key`, `correlation_id`, `request_summary`, `has_request_body`, `has_response_body`, `has_pipeline_details` at `src/lib/usage/callLogs.ts:44-83`; `sanitizeErrorForLog()` at `src/lib/usage/callLogs.ts:142-153`; bounded summary truncation at `src/lib/usage/callLogs.ts:155-168`; `protectPayloadForLog()` / pipeline sanitization at `src/lib/usage/callLogs.ts:170-196`. `getCallLogs()` maps `status=error` to `(cl.status >= 400 OR cl.error_summary IS NOT NULL)` at `src/lib/usage/callLogs.ts:822-823`. | None observed; redaction path is explicit and bounded. | Supports the task’s redaction/normalization requirements without mutating logs. |
| `open-sse/services/combo.ts` | Combo target sequence / redirect evidence | `extractComboErrorText()` centralizes bounded error extraction at `open-sse/services/combo.ts:23-89`; `isContextOverflow400()` and `isParamValidation400()` at `open-sse/services/combo.ts:821-835`; `isModelAccess400()` at `open-sse/services/combo.ts:837-854`; target iteration/fallback orchestration in `handleComboChat()` at `open-sse/services/combo.ts:857+`. | None observed for source-only audit. | Needed to classify whether logged errors were followed by next-target success or terminal combo failure. |
| `open-sse/services/accountFallback.ts` | Fallback / lockout / cooldown evidence | `checkFallbackError()` classification logic at `open-sse/services/accountFallback.ts:1282-1606`; `classifyLockoutReason()` at `open-sse/services/accountFallback.ts:682-687`; quota/auth/account-deactivation/credits-exhausted branches at `open-sse/services/accountFallback.ts:124-168`, `1430-1502`, `1516-1525`. | None observed for source-only audit. | Explains why 403/429 may be deprioritized account noise versus actionable terminal failures. |
| `open-sse/executors/antigravity.ts` | AGY/Gemini thinking parameter mapping | `transformRequest()` at `open-sse/executors/antigravity.ts:645+`; `applyAntigravityGenerationDefaults()` at `open-sse/executors/antigravity.ts:529+`; current mapped field is `thinking_budget` at `open-sse/executors/antigravity.ts:839`. | No `thinking_level` mapping found in this executor. | Directly supports 0158 requirement to validate Gemini/AGY `thinking_budget` vs `thinking_level` claims against source. |
| `open-sse/translator/request/openai-to-gemini.ts` | Parameter translation contract | `reasoning_effort` → thinking budget mapping at `open-sse/translator/request/openai-to-gemini.ts:288-320`. | None observed. | Confirms translator path for reasoning-effort-based budget selection before executor dispatch. |
| `docs/tasks/02-doing/0157-omniroute-combo-fail-soft-unavailable-models.md` | Task 0157 contract / MetaMuse fail-soft behavior | Documents expected 404 fail-soft behavior, candidate failure logging, sanitized aggregate terminal error, and reviewed acceptance gap at `docs/tasks/02-doing/0157-omniroute-combo-fail-soft-unavailable-models.md:14-37`, `docs/tasks/02-doing/0157-omniroute-combo-fail-soft-unavailable-models.md:100-130`, `docs/tasks/02-doing/0157-omniroute-combo-fail-soft-unavailable-models.md:275-291`. | None observed for read-only evidence. | Provides the source-of-truth contract against which 0158 must judge MetaMuse 404 redirect/terminal behavior. |
| `docs/tasks/00-planning/EPIC-30-omniroute-outbound-error-triage.md` | Epic scope / example error set | Defines call-log endpoints and example operator signals at `docs/tasks/00-planning/EPIC-30-omniroute-outbound-error-triage.md:21-44`. | None observed. | Confirms intended audit boundaries and example patterns. |

### Cross-File Synthesis
- Coherence: The log API, DB layer, combo target loop, account-fallback classifier, and AGY executor all form a coherent evidence chain for an outbound-error audit once management auth is available.
- Dominant impl: `getCallLogs()` is the single bounded read path; `status=error` is normalized to `status >= 400 OR error_summary IS NOT NULL` and includes `correlation_id`/combo metadata needed for redirect joins.
- Contradictions: None found in read-only source.
- Missing: live authenticated log rows; without them, 0158 cannot produce the required bounded query packet with real row counts/time window/pagination.

### Negative Evidence
- No management auth token is configured in this environment; the local `:23456` unauthenticated probe returned exact HTTP `401 Unauthorized` with body `{"error":{"code":"AUTH_001","message":"Authentication required","correlation_id":"ed02cd00-6e42-4ceb-93b0-8907f8610f6a"}}`.
- No secrets/tokens/cookies were read or printed.
- No production mutation occurred.
- No `:22000` access was attempted.
- No git/changelog/task mutation occurred.

### Parent Decision Points
- Confirmed: read-only source evidence is sufficient to bound the audit schema, redaction path, error-classification rules, and translator/executor parameter contract.
- Needs judgment: whether to treat the auth block as `blocked` completion evidence pending operator-provided management credentials/token.
- Blocked: live bounded query of `GET /api/usage/call-logs?status=error&limit=...` and optional `request-logs` is blocked by missing authenticated access.

## Access Classification
- Classification: **BLOCKED — management auth unavailable in this environment.**
- Evidence: unauthenticated local probe to `http://127.0.0.1:23456/api/usage/call-logs?status=error&limit=5` returned HTTP `401 Unauthorized`; no bearer/cookie/API key was supplied, and no usable `OMNIROUTE_MANAGE_TOKEN` / `OMNIROUTE_ACCESS_TOKEN` environment variable is present.
- This is not zero-error evidence; it is an access failure that must be recorded as blocked.

## Exact Probe Command And Exit Code
- Command:
  - `curl -sS -i -X GET 'http://127.0.0.1:23456/api/usage/call-logs?status=error&limit=5' -H 'Accept: application/json' | sed -E 's/([Aa]uthorization:)[^\n]*/\1 <redacted>/g; s/([Bb]earer)[ \t]+[^\n]*/\1 <redacted>/g; s/([Cc]ookie:)[^\n]*/\1 <redacted>/g; s/(secret|token|cookie|authorization|bearer)[^\n]*/\1 <redacted>/ig' | head -n 80`
- Observed status line: `HTTP/1.1 401 Unauthorized`
- Observed body: `{"error":{"code":"AUTH_001","message":"Authentication required","correlation_id":"ed02cd00-6e42-4ceb-93b0-8907f8610f6a"}}`
- Exit code: `0` from the shell pipeline; HTTP-level result is 401.

## Redaction Proof
- Probe output redaction rules applied:
  - `Authorization:` values → `<redacted>`
  - `Bearer` tokens → `<redacted>`
  - `Cookie:` values → `<redacted>`
  - case-insensitive literal occurrences of `secret`, `token`, `cookie`, `authorization`, `bearer` → `<redacted>`
- No raw prompts, auth JSON, cookies, bearer tokens, API keys, or unbounded provider response bodies appear in this report.

## Bounded Query Contract From Source
- Endpoint: `GET /api/usage/call-logs`
- Auth: `requireManagementAuth(request)` at `src/app/api/usage/call-logs/route.ts:115`
- Bounded filters: `status`, `model`, `provider`, `account`, `apiKey`, `combo`, `search`, `limit`, `offset` at `src/app/api/usage/call-logs/route.ts:120-129`
- Bounded status=error semantics: `(cl.status >= 400 OR cl.error_summary IS NOT NULL)` at `src/lib/usage/callLogs.ts:822-823`
- Bounded default limit: `200`; explicit `limit` accepted at `src/lib/usage/callLogs.ts:884-888`
- Bounded pagination: `OFFSET @__offset` at `src/lib/usage/callLogs.ts:886-888`
- Safe row surface: normalized summary fields only; detail bodies are artifact-backed and not auto-expanded in list responses at `src/lib/usage/callLogs.ts:44-83`, `src/lib/usage/callLogs.ts:552-596`
- Sanitization path: `sanitizeErrorForLog()` → `toStoredErrorSummary()` with 4000-char truncation at `src/lib/usage/callLogs.ts:142-168`
- Correlation/target evidence present in row surface: `combo_name`, `combo_step_id`, `combo_execution_key`, `correlation_id`, `provider`, `model`, `requested_model`, `account` at `src/lib/usage/callLogs.ts:68-83`

## Actionable Error-Classification Candidates For Task 0159
- 404 pattern:
  - Source candidate: `isModelAccess400()` at `open-sse/services/combo.ts:837-854`; `MODEL_ACCESS_DENIED_CODES` / `MODEL_ACCESS_DENIED_TYPES` at `open-sse/services/accountFallback.ts:195-206`
  - Log signal: `status=404`, `error_summary` containing model-not-found text; join via `combo_execution_key` / `correlation_id`
  - Candidate rule: if same `correlation_id` shows `404` then later `200` from another target, classify as `redirected`; if terminal and no later success, classify as `terminal_model_not_found`
- 400 parameter mismatch pattern:
  - Source candidate: `isContextOverflow400()` / `isParamValidation400()` at `open-sse/services/combo.ts:821-835`; `PARAM_VALIDATION_PATTERNS` at `open-sse/services/accountFallback.ts:277-283`
  - Gemini/AGY thinking-budget contract: executor currently emits `thinking_budget` at `open-sse/executors/antigravity.ts:839`; translator maps `reasoning_effort` → budget at `open-sse/translator/request/openai-to-gemini.ts:288-320`
  - Candidate rule: if `error_summary` contains `thinking_budget` / `thinking_level` / `reasoning_effort` and provider is Gemini-family or AGY, mark as `parameter_mismatch_investigate` rather than generic bad-request
- 403/429 account noise:
  - Source candidate: `checkFallbackError()` quota/account/routing-restriction branches at `open-sse/services/accountFallback.ts:1430-1525`
  - Candidate rule: known operator examples `qwenstudio/qwen3.8-max 403` and `kiro/glm-5 429` should be counted in `deprioritized_account_noise` unless the same pattern repeats across unrelated accounts/providers
- 5xx/timeout pattern:
  - Source candidate: retryable status set at `open-sse/services/accountFallback.ts:1330-1337`; timeout synthetic `524` at `open-sse/services/combo.ts:927-933`
  - Candidate rule: `status in {408,500,502,503,504,524}` with no later target success → `terminal_provider_or_timeout`; with later success → `redirected_after_transient`
- Tool-call/schema pattern:
  - Source candidate: `MALFORMED_REQUEST_PATTERNS` at `open-sse/services/accountFallback.ts:249-260`
  - Candidate rule: distinguish provider-body tool-format errors from downstream harness/tool-schema validation errors by presence/absence of `has_pipeline_details` and bounded `error_summary` content shape
- Redirect/termination evidence join:
  - Source candidate: `combo_name`, `combo_step_id`, `combo_execution_key`, `correlation_id` at `src/lib/usage/callLogs.ts:68-83`
  - Candidate rule: group bounded rows by `combo_execution_key` / `correlation_id`; sequence by `timestamp`; if a later row for the same key has `status < 400`, label earlier error rows as `redirected` until proven otherwise

## Task 0157 / MetaMuse 404 Contract Check
- Task 0157 contract: account/model-scoped 404 must be treated as candidate failure, logged sanitized, and skipped so next eligible target can succeed; terminal aggregate error only after exhaustion at `docs/tasks/02-doing/0157-omniroute-combo-fail-soft-unavailable-models.md:14-37`
- Current source evidence:
  - `extractComboErrorText()` safely extracts bounded `detail` strings without leaking raw bodies at `open-sse/services/combo.ts:23-89`
  - `classifyLockoutReason()` maps `404` → `model_not_found` at `open-sse/services/accountFallback.ts:682-687`
- From log surface alone, without live auth, MetaMuse fail-soft status is **unknown** from rows; implementation-side contract is **partial/implemented in source**, but live redirect/terminal evidence cannot be verified from `call-logs` in this session.

## Blocker / Next Unlock Instruction
- Blocker: missing management-authenticated access to the local call-log surface.
- Unlock: provide a management-authenticated request for `GET /api/usage/call-logs?status=error&limit=<bounded>&offset=<bounded>&since=<ISO>&until=<ISO>` using one of:
  - dashboard management session cookie,
  - scoped API key with `manage` scope,
  - valid `oma_` access token evaluated by `evaluateAccessTokenAuth()` at `src/lib/api/requireManagementAuth.ts:57`
- After auth is available, re-run the bounded query with exact filters/time window/pagination and append a row-level evidence appendix to this report without mutating settings, combos, credentials, rate limits, breakers, catalogs, tasks, or changelog.

## Compliance Notes
- Doc accuracy: endpoint names, filter fields, status semantics, line refs, and executor field names are verified against current source.
- Security: no secrets, tokens, cookies, raw prompts, auth JSON, or unbounded provider response bodies are included.
- Error sanitization: raw upstream bodies are not included; bounded redaction is demonstrated in the probe output handling.
- No raw SQL from investigation: log reads use the API surface contract defined in `src/app/api/usage/call-logs/route.ts`.
- No production mutation: investigation is read-only; no settings, combos, credentials, rate limits, breakers, catalogs, tasks, or changelog entries were changed.
