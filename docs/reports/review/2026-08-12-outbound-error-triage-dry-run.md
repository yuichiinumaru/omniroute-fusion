# Outbound Error Triage — Dry-Run / Example Packet (Task 0159)

> **Status**: `dry-run — no mutation`
> **Source snapshot**: `recorded_at: 2026-08-12T13:30:00Z`
> **Lane**: `builders`
> **Auth surface**: `GET /api/usage/call-logs?status=error&limit=50` (management-auth gated)
> **Live evidence**: **none claimed** — this packet is synthetic examples + blocked-auth proof only

## Blocked-Auth Proof (Same as Task 0158 — Must Fail as `blocked`)

```yaml
access_probe:
  endpoint: /api/usage/call-logs
  filters: { status: error, limit: 50 }
  http_status: 401
  auth_classification: blocked: 401
  timestamp: "2026-08-12T13:30:00Z"
  row_count: unknown
  verdict: blocked — management auth unavailable (HTTP 401 at /api/usage/call-logs?status=error&limit=50)
  downstream: do not claim "no errors" or "0 rows"; provide management auth (Bearer/session) and rerun Phase 0
```

This matches `docs/tasks/02-doing/0158-omniroute-outbound-error-audit.md`: HTTP 401 from the log endpoint is blocked access, not evidence of zero errors. The synthetic examples below are **not live rows** — they illustrate the expected lane/layer/redirect classification that a live run would produce after auth succeeds.

## Synthetic Examples (Clearly Marked — Not Live Evidence)

Each row is tagged `synthetic: true` and `freshness: synthetic — source re-checked at 2026-08-12`.

| # | Synthetic row (sanitized, bounded) | Status | Provider / model family | Expected lane | Expected layer | Expected redirect/termination | Override | Source check (file:line / rg) |
|---|---|---|---|---|---|---|---|

## Example A — MetaMuse 404 (Task 0157 Contributor, Account-Scoped)

```yaml
synthetic: true
status: 404
provider: metamuse
model: muse-spark-1.2-contributor  # account-scoped — available on only one connection
sanitized_error: '{"detail":"Expected ''id'' to be a string."}'  # upstream MetaMuse body, not a harness tool-call ID bug
detail_state: provider-body detail string
layer: provider-body  # detail string before any executor parse — rg "Expected 'id' to be a string" in open-sse/ src/ electron/ bin/ yields 0 hits (guardrail)
redirect: redirected_to_next_candidate  # when Task 0157 fail-soft holds: correlation_id joins to next target muse-spark-1.2 → 200; otherwise terminal
lane: actionable_provider_or_routing_error
severity: high if terminal when fallback was eligible; medium if correctly redirected
confidence: high
source_check: open-sse/services/accountFallback.ts:685 (classifyLockoutReason 404→model_not_found) + open-sse/services/combo.ts:2722 terminal guard + Task 0157 fail-soft contract
freshness: "synthetic as 2026-08-12 — re-verify rg -n \"Expected 'id' to be a string\" open-sse/ src/ electron/ bin/"
recommended_action: verify fail-soft redirect via correlation_id/combo_execution_key join; if terminal instead, file combo redirect regression task
```

## Example B — AGY / Gemini Thinking-Budget 400

```yaml
synthetic: true
status: 400
provider: antigravity
model: gemini-3-flash  # Gemini 3 family — native knob is thinking_level / thinkingConfig, not thinking_budget
sanitized_error: 'thinking_budget not supported — Unknown name "thinking_budget" (oneOf at ''/'' not met)'
layer: executor/parser  # bodies like AGY's Cloud Code envelope rejection: translator/executor emitted thinking_budget to a surface expecting thinking_level/reasoning_effort
redirect: terminal when generic 400 non-fallback (combo shouldFallback:false) else redirected if model-access scoped
lane: actionable_provider_or_routing_error
severity: medium
confidence: high if source confirms mismatch
source_check: |
  rg -n "thinking_budget|thinking_level|reasoning_effort|thinkingConfig|thinking_config" open-sse/executors/antigravity.ts open-sse/services/cloudCodeThinking.ts open-sse/executors/base.ts open-sse/translator/
  # AGY envelope destructures thinking_budget out at open-sse/executors/antigravity.ts:835-839; cloudCodeThinking strips thinkingConfig at 21-22
freshness: "synthetic as 2026-08-12"
recommended_action: check whether request passed thinking_budget to an AGY/Gemini 3 target that expects thinking_level/thinkingConfig; propose translator/executor mapping fix only with file:line
```

## Example C — QwenStudio 403 (Expected Eligibility, Deprioritized by Default)

```yaml
synthetic: true
status: 403
provider: qwenstudio
model: qwen3.8-max
sanitized_error: 'eligibility check failed — model not enabled for this account'
layer: provider-body
redirect: terminal for that target (combo should redirect when another candidate exists)
lane: deprioritized_account_noise  # counted, not erased
counts: { total_403_qwenstudio_max: 1 (synthetic) }
severity: low
override: escalate to actionable only if systemic across ≥2 accounts/providers for same model family without account-scoped explanation
source_check: rg -n "MODEL_ACCESS_DENIED_CODES|MODEL_ACCESS_DENIED_PATTERNS|ACCOUNT_DEACTIVATED_SIGNALS" open-sse/services/accountFallback.ts
freshness: "synthetic as 2026-08-12"
recommended_action: keep deprioritized with count + bounded example; open systemic eligibility task only on ≥2-account signal
```

## Example D — Kiro 429 (Normal Rate Limit, Deprioritized by Default)

```yaml
synthetic: true
status: 429
provider: kiro
model: glm-5
sanitized_error: 'rate limit exceeded — too many requests (Retry-After: 60s)'
layer: provider-body + accountFallback cooldown/breaker
redirect: terminal for that target; combo fallback applies when another account/model is eligible; respect Retry-After
lane: deprioritized_account_noise  # counted, not erased
counts: { total_429_kiro_glm5: 1 (synthetic) }
severity: low
override: escalate to actionable when 429 is provider-wide without per-account cooldown, Retry-After missing on sustained 429s, or provider breaker trips on a model-scoped 429
source_check: rg -n "429|classify429|getModelLockoutInfo|recordModelLockoutFailure|PROVIDER_FAILURE_ERROR_CODES|CONNECTION_FAILURE_DEDUP_MS" open-sse/services/accountFallback.ts src/shared/utils/circuitBreaker.ts
freshness: "synthetic as 2026-08-12"
recommended_action: keep deprioritized with count; escalate on provider-wide / missing Retry-After / breaker mis-scope
```

## What This Packet Proves

- **Blocked without auth**: the workflow fails as `blocked`, not `PASS` or `zero errors`.
- **Read-only by default**: no call to `GET /api/usage/call-logs/[id]` detail fetch, no `--probe-live`, no network; source files are the evidence.
- **403/429 counted but deprioritized**: synthetic counts preserved while actionable queue is separate.
- **Source checks cited**: every actionable synthetic maps to a file:line or rg without asserting a fix.
- **Layer distinction**: provider-body vs executor/parser vs combo vs harness/tool-schema kept distinct; no raw body collapsed into one bucket.
- **No live logs claimed**: every synthetic row is labeled `synthetic: true`.

## Candidate Reference Improvement Proposals (Scaffold — Separate from Live Report)

One proposal scaffold, not an inline reference mutation:

```yaml
proposal_id: outbound-pattern-2026-08-12-001
pattern_anchor: outbound-error-patterns.md#400-thinking-mismatch
proposes: provider-quirk
risk: low
confidence: medium
synthetic: true
evidence:
  - call-log: synthetic — status=400 provider=antigravity model=gemini-3-flash thinking_budget not supported
  - source: open-sse/executors/antigravity.ts:835 + open-sse/services/cloudCodeThinking.ts:21
diff: |
  --- a/.agents/skills/omniroute/references/outbound-error-patterns.md
  +++ b/.agents/skills/omniroute/references/outbound-error-patterns.md
  @@
  +### 400 — thinking_budget on Gemini 3 families (proposal scaffold)
  +Trigger: AGY returns 400 mentioning thinking_budget; confirm Gemini 3 expects thinking_level.
  +Source check: rg -n "thinking_budget|thinking_level" open-sse/executors/antigravity.ts open-sse/translator/
validation: ['rg -n "thinking_budget|thinking_level" open-sse/executors/ open-sse/translator/']
```

Gated by `harness-architecture` review; never auto-mutates references.

## Redaction

No API key, bearer token, cookie, raw prompt, or unbounded body appears. Snippets are bounded (≤200/4000) and passed through `sanitizePII`/`protectPayloadForLog` semantics. Scanned via `gitleaks` (see task Completion Evidence).

## Freshness

```yaml
freshness:
  recorded_at: "2026-08-12T13:30:00Z"
  source_scope: [src/app/api/usage/call-logs/route.ts, src/lib/usage/callLogs.ts, open-sse/services/combo.ts, open-sse/services/accountFallback.ts, open-sse/executors/antigravity.ts, open-sse/translator/**]
  freshness_rule: "no file in source_scope mtime > recorded_at; otherwise stale — re-validate"
```

Date is packet time; live runs must re-stamp.

