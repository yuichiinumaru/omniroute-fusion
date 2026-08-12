# Task 0158: Audit outbound errors and redirect behavior

> **Status**: `[~]` In progress — investigator wave assigned (`builders`)
> **Priority**: 🟡 P1
> **Type**: `investigation`
> **Origin**: EPIC-30 + operator request to inspect outbound errors; examples include MetaMuse 404, AGY/Gemini thinking-budget 400, QwenStudio 403, and Kiro 429.
> **Blocks**: Task 0159 reference calibration.
> **Depends on**: Authenticated management access to the local call-log surface; no production mutation.
> **Parallelism**: `parallel-safe` — read-only log analysis; do not combine with config/credential mutations.
> **Review routing**: independent + provider/runtime + evidence review

---

## Objective

Perform the first evidence-backed audit of OmniRoute outbound errors using the
authenticated call-log/request-log surfaces. The audit MUST report which errors
were redirected to a later combo candidate, which terminated a request, and
which represent provider/account/configuration mismatches. It MUST treat known
operator-account 403/429 examples as counted-but-deprioritized noise by default:

- `qwenstudio/qwen3.8-max` 403: account/API-key eligibility review;
- `kiro/glm-5` 429: normal rate limiting.

The audit MUST prioritize non-403/429 patterns, especially 404 model availability,
400 parameter/capability mismatches such as `thinking_budget` on Gemini 3
families, tool-call/schema errors, 5xx/timeouts, and candidate errors that fail
to redirect.

A worker reading only this section can determine completion when the report
contains bounded sanitized evidence, per-pattern counts, redirect/termination
classification, exact provider/model/account scope, and task recommendations
without changing credentials, combos, or runtime settings.

## Background Context

### O que já existe:

- `GET /api/usage/call-logs` provides management-authenticated filtered call-log
  rows; `status=error` is the preferred first query.
- Query filters include `provider`, `model`, `account`, `combo`, `search`,
  `limit`, and `offset`.
- Call-log rows can include `status`, `error_summary`, requested/resolved model,
  provider/account, combo metadata, correlation IDs, and target-level details.
- `GET /api/usage/request-logs` provides a secondary recent-log surface.
- Combo implementation records candidate failures and attempts fallback, but the
  audit must verify behavior from logs instead of trusting code intent.

### O que está faltando / quebrado:

- No repeatable outbound error report excludes known account/rate-limit noise
  from the actionable queue while retaining its counts.
- No matrix distinguishes “redirected to next candidate” from “returned error to
  harness” for the same provider/model/status.
- No rule identifies model/parameter mismatch patterns such as Gemini 3
  `thinking_budget` versus `thinking_level`.
- No evidence packet currently links an outbound provider error to a combo
  target sequence and final request outcome.

## Test Requirements

- The audit MUST use authenticated management access and report HTTP 401/403
  access failure as blocked evidence, never as an empty/no-error result.
- 403/429 rows MUST remain visible in a separate deprioritized section with
  counts and representative sanitized examples.
- 404 rows MUST be grouped by provider/model/account and checked for redirect,
  lockout, retry, and final-response behavior.
- 400 rows MUST be pattern-matched for parameter/capability mismatch, including
  `thinking_budget`, `thinking_level`, `reasoning_effort`, tool schema, and
  request-format clues; classification MUST cite the raw sanitized error.
- Tool-call errors MUST distinguish provider response-body errors from downstream
  OpenCode/tool-schema validation errors; do not collapse them into one bucket.
- The report MUST identify at least one evidence chain from outbound target error
  to next-target success or terminal combo failure when matching rows exist.
- No API key, cookie, bearer token, auth JSON, raw prompt, or unbounded response
  body may appear in the report.
- No settings, combos, credentials, rate limits, breakers, or model catalogs may
  be mutated by the audit.

## Exit Conditions (GDD/TDD)

> Investigation task — use real authenticated read-only evidence; no cargo checks.

- [ ] A bounded query packet records the exact endpoint, filters, time window,
  auth classification, row count, pagination/limit, and timestamp.
- [ ] The report separates `deprioritized_account_noise` (known 403/429) from
  `actionable_provider_or_routing_error` without deleting either category.
- [ ] Provider/model/connection/account identity is normalized without exposing
  secrets or treating aliases as unrelated models.
- [ ] Each actionable pattern includes status, sanitized error, affected target,
  redirect/termination classification, confidence, and recommended next action.
- [ ] Gemini 3 thinking-budget errors are explicitly checked against the current
  translator/provider parameter contract; no correction is asserted without
  source evidence.
- [ ] MetaMuse contributor 404 is checked against Task 0157's fail-soft contract
  and marked implemented/partial/unknown from log evidence.
- [ ] `docs/reports/review/` receives a bounded audit report with a sanitized
  evidence appendix; no secrets or raw payload dumps.
- [ ] The report includes a list of candidate reference-pattern updates for Task
  0159, but does not mutate the skill reference corpus automatically.
- [ ] Any management-auth block is documented as `blocked`, not `PASS` or
  `zero errors`.
- [ ] An append-only `.changelog/` entry is created through manage-changelog and
  `rebuild.sh build` is run after the evidence packet is accepted.
- [ ] Completion Evidence is filled with real query output and evidence links.

## Details

### What

Subtasks:

- [ ] **Ler código existente**: read call-log routes/query filters, detail-log
  route, combo target logging, `getCallLogs`, redaction helpers, and Task 0157.
- [ ] Authenticate/read `GET /api/usage/call-logs?status=error&limit=...` and
  optionally `request-logs`; record access result before interpreting rows.
- [ ] Build a normalized row set grouped by status/provider/model/account/combo
  and time, preserving correlation/target IDs where safe.
- [ ] Classify 403/429 as deprioritized account noise unless systemic patterns
  appear across accounts/providers.
- [ ] Analyze 404 redirect behavior and 400 parameter mismatch behavior with
  source checks for the affected provider/model families.
- [ ] Produce a sanitized report and candidate pattern list for 0159.
- [ ] **Verificação de regressão**: verify no settings/DB/provider mutations and
  scan report output for secret-shaped values.

### Where

| Arquivo | Propósito |
|---------|-----------|
| `src/app/api/usage/call-logs/route.ts` | Ler — preferred outbound log endpoint/filter contract. |
| `src/app/api/usage/call-logs/[id]/route.ts` | Ler — bounded detail retrieval. |
| `src/app/api/usage/request-logs/route.ts` | Ler — secondary recent-log surface. |
| `src/lib/usage/callLogs.ts` | Ler — row fields/status/error semantics. |
| `open-sse/services/combo.ts` | Ler — target sequence/redirect evidence. |
| `open-sse/services/accountFallback.ts` | Ler — fallback/lockout evidence. |
| `open-sse/executors/antigravity.ts` | Ler — current Gemini/AGY thinking parameter mapping. |
| `open-sse/translator/` | Ler — parameter translation contract. |
| `docs/reports/review/2026-*-outbound-error-audit.md` | Criar — sanitized audit report; exact filename assigned at execution. |
| Task 0157 | Ler — MetaMuse candidate fail-soft contract. |

### How

1. Query and preserve access evidence before reading rows.
2. Normalize and redact rows, then split known account noise from actionable
   errors.
3. Join target-level/correlation evidence to final request outcome where logs
   support the join; label unknown when they do not.
4. Validate mismatch hypotheses against current source, not provider prose alone.
5. Produce findings, confidence, recommended task/action, and reference-pattern
   candidates without mutating runtime state.

### Why

Outbound logs contain a mixture of expected account/rate-limit failures and
valuable signals about routing, parameter compatibility, and tool protocols.
Treating every 403/429 as a product bug wastes investigation capacity; ignoring
all errors hides 404/400 defects. This audit establishes a practical evidence
baseline for the reusable workflow.

## Parallelism / file ownership

| Class | Detail |
|-------|--------|
| **parallel-safe** | Read-only analysis partitions by provider/status after a shared bounded query snapshot. |
| **serializable** | Authentication/access probe and raw snapshot precede parallel interpretation. |
| **Collision** | Audit report and any shared evidence appendix; no product/config mutation allowed. |

## ⛔ Anti-Hallucination Guardrails

> [!CAUTION]
> HTTP 401 from the log endpoint is blocked access, not evidence of zero errors.
> 403/429 are deprioritized by policy, not erased. Never claim Gemini 3 accepts
> `thinking_level` or rejects `thinking_budget` without checking the current
> translator/executor source and logs.

> [!IMPORTANT]
> Read every file in the Where table before writing. Do not include raw prompt,
> auth, cookies, bearer tokens, API keys, or unbounded provider response bodies.
> Do not change combos or credentials while auditing.

## 🛡️ Compliance Checklist (Leis Primárias do AGENTS.md)

- [ ] **Doc Accuracy**: endpoint/filter/error-pattern claims verified against code and actual query output.
- [ ] **Zod Validation**: N/A for read-only query; any helper input is bounded/validated.
- [ ] **Security**: report is sanitized and secret-scanned.
- [ ] **Error Sanitization**: raw log bodies are bounded/redacted before persistence.
- [ ] **No Raw SQL**: use API surfaces, not direct DB queries.
- [ ] **Archive Protocol**: no deletion or purge.

## 📋 Completion Evidence (preenchido pelo agente executor)

- **Access probe**: [endpoint/filter/status/timestamp]
- **Rows analyzed**: [count/window]
- **Report path**: [path]
- **Actionable findings**: [count + categories]
- **403/429 deprioritized section**: [count]
- **Redirect/termination evidence**: [links/IDs]
- **Secret scan**: [command/result]
- **Changelog draft**: [task/agent/project/title/description/summary/verification]
- **Agente executor**: [nome/role]
- **Data**: [YYYY-MM-DD]

## 🔍 Review Trail (preenchido pelo reviewer)

- **Reviewer**: [nome/role]
- **Data da review**: [YYYY-MM-DD]
- **Veredito**: [APROVADO / REJEITADO]
- **Score**: [0-100]
- **Notas**: [evidence-based]
