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

- [x] Bounded query packet corrected: endpoint `GET /api/usage/call-logs`, supported filters documented, `since`/`until` not exposed by route, live probe returned HTTP 200 with **208 rows** (200 DB error rows + 8 in-memory rows (1 active status 0 + 7 completed status 200)).
- [x] Row arithmetic reconciled: 200 error rows + 8 non-error in-memory rows = 208 total; status distribution exact; DB vs in-memory split explicit.
- [x] Redirect/termination dispositions built from correlation groups: terminal 17, redirected 134, unknown 49; totals reconcile to 200 error rows.
- [x] Provider/runtime interpretations corrected from live sample: Cerebras context-length 400 (55 rows); ZenMux/openai-compatible 404 model-not-found (54 rows); Kiro 402 limit-reached (1 row); Gemini translator uses `thinkingBudget` with no matching live 400; MetaMuse client-abort 499 observed; Cloudflare 502 not present in this snapshot.
- [x] Sanitization corrected in report: emails masked, correlation IDs shortened, bearer token redacted; final scan clean.
- [x] Report at `docs/reports/builders/0158-outbound-error-audit.md` rewritten as corrected evidence packet.
- [x] Task 0159 candidate patterns refreshed only from corrected evidence/source inspection; no prior unverified counts carried forward.
- [x] Auth access succeeded on `:22000`; exact access evidence recorded.
- [x] Changelog: NOT CREATED (task stays 02-doing per instructions).
- [x] Completion Evidence updated with exact access result, counts, dispositions, provider corrections, and redaction scan.

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

- **Access probe**: `GET /api/usage/call-logs?status=error&limit=200` → HTTP 200 with bearer token `<redacted>`; **208 rows returned** (200 DB error rows + 8 in-memory rows (1 active status 0 + 7 completed status 200)). Token used only against `http://127.0.0.1:22000` and not persisted or printed.
- **Supported query contract**: route forwards `status`, `model`, `provider`, `account`, `apiKey`, `combo`, `search`, `limit`, `offset`. `since`/`until` are **not supported** by the route (`src/app/api/usage/call-logs/route.ts:118-130`), although `getCallLogs()` accepts them (`src/lib/usage/callLogs.ts:858-865`).
- **Observation window**: `2026-08-12T20:00:37.583Z` → `2026-08-12T20:00:41.084Z`; bounded snapshot from `tmp/0158-call-logs-snapshot.json`; token not persisted in snapshot.
- **Rows analyzed**: **200 DB error rows**; 8 additional in-memory rows (1 active status 0 + 7 completed status 200) explicitly separated.
- **Status distribution**: 429:82, 400:55, 404:54, 499:8, 402:1. 404 breakdown: openai-compatible-responses provider model-not-found = 32 rows; zenmux provider model-not-found = 22 rows. 402: Kiro limit-reached = 1 row. No 502 rows in this snapshot.
- **Redirect/termination dispositions**: terminal 17, redirected 134, unknown 49; totals reconcile to 200 error rows. Full 25-group appendix present in report §11 with shortened keys, counts, target summaries, terminal markers, and final outcomes.
- **Snapshot hygiene**: `tmp/0158-call-logs-snapshot.json` is **restricted raw evidence** (contains PII/UUIDs — 5 email-shaped accounts + full UUIDs); access-controlled; NOT the sanitized deliverable. Report `docs/reports/builders/0158-outbound-error-audit.md` is sanitized (`corr-<sha256-prefix>` + masked providers); verifier `tmp/0158-verify.mjs` checks this boundary.
- **Provider corrections**: Cerebras `zai-glm-4.7` 400 = context-length limit (55 rows); openai-compatible-responses `zmx/deepseek-v4-flash-free` 404 = model-not-found (32 rows); zenmux `zm/deepseek-v4-flash-free` 404 = model-not-found (22 rows); Kiro `glm-5` 402 = limit-reached (1 row); Gemini translator and executor source both use `thinkingBudget` with no matching live 400; MetaMuse client-abort 499 observed; Cloudflare 502 not present in this snapshot.
- **Sanitization**: emails/account identifiers masked as `<account-redacted>` in report; correlation IDs represented as `corr-<sha256-prefix12>`; provider UUIDs reduced to base provider name (masked); bearer token not persisted. Secret scan clean.
- **Report path**: `docs/reports/builders/0158-outbound-error-audit.md`
- **Deterministic verifier**: `tmp/0158-verify.mjs` + `tmp/0158-verify-output.txt` — checks arithmetic, 25-group, pair-aware totals 17/134/49, no placeholders, redaction limits.
- **Changelog draft**: NOT CREATED — task remains in `02-doing` per instructions; no `.changelog/` mutation.
- **Agente executor**: builders / Integration Engineer
- **Data**: 2026-08-12

### Experimental reviewer-resume routing

- **Expert/fixer task ID**: `ses_008882d6fffe0FDvJhNRFqm0lQ`
- **Reviewer task ID**: `ses_008d8ad5cffenVZ0FjYI0T9Fb5`
- **Routing rule**: after the fixer implements corrections, the existing reviewer receives an explicit re-review instruction; do not send a bare `continue` after a final review report.
- **Context guard**: reviewer operates under the configured 500k-token context limit.

### Experimental reviewer-resume routing — complete appendix fix

- **Expert/fixer task ID**: `ses_0087cf00bffeRRIBhoLTpr0qJL`
- **Reviewer task ID**: `ses_008d8ad5cffenVZ0FjYI0T9Fb5`
- **Routing rule**: after the fixer implements corrections, the existing reviewer receives an explicit re-review instruction; no bare `continue`, nested reviewer, or reviewer-of-reviewer.

> [!IMPORTANT]
> Before path-to-100 work, read the latest full report and all reports listed
> under Previous Reports. Persistent findings and regression guards are part of
> the acceptance contract; do not fix the latest finding by undoing a previously
> accepted repair.

### Latest Review

- **Date**: 2026-08-12
- **Reviewer profile**: independent final delta-aware filesystem/source reconciliation
- **Score**: **90/100**
- **Verdict**: **APPROVED** under the operator rule (`90–100 = APPROVED`; `<90 = REJECTED`)
- **Full report**: `docs/reports/review/2026-08-12-task-0158-omniroute-outbound-error-audit-review.md`
- **Lane outcome**: **promote to `docs/tasks/03-review/`**
- **Task reference**: Task 0158 (`0158-omniroute-outbound-error-audit`)

#### Current Open Blockers

- None. The prior stale §2 table wording was corrected to state **8 in-memory rows = 1 active status 0 + 7 completed status 200**, and the deterministic verifier passes.

#### Resolved Since Prior Reviews

- Pair-aware disposition mismatch: resolved; verifier and direct snapshot recomputation agree on terminal 17, redirected 134, unknown 49.
- `dfbde76f` and `795221b7`: resolved as unknown because each has one repeated ordered `(comboExecutionKey, comboStepId)` pair and no terminal marker.
- Literal `...` appendix identities: resolved; all 25 rows use unique `corr-<sha256-prefix12>` identifiers and contain no literal placeholder in the corr rows.
- Missing Closure Matrix/verifier: resolved; task-local Closure Matrix, `tmp/0158-verify.mjs`, and persisted `tmp/0158-verify-output.txt` are present; verifier output is `ALL CHECKS PASSED`.
- Raw snapshot hygiene: resolved; snapshot is explicitly restricted/raw and distinct from the sanitized report/task deliverables.
- Unsupported `since`/`until` claim and five-minute window: resolved; timestamps are documented only as an observed snapshot span.
- Status and 404 arithmetic: resolved; 208 total = 200 DB errors + 8 in-memory, status total = 200, and 404 = 32 + 22 = 54.
- Cloudflare, Gemini, MetaMuse, Cerebras, and Kiro semantics: preserved and independently confirmed.

#### Path-to-100 Summary

- Final verifier rerun passed after the wording correction.
- No further path-to-100 review is required after this approval.
- Promote only the task file from `docs/tasks/02-doing/` to `docs/tasks/03-review/`; do not mutate runtime/config/credential/changelog/`04-completed` surfaces.


### Task 0158 Closure Matrix (task-local) — 2026-08-12

> Deterministic closure for pair-aware disposition fix, no-placeholder appendix, and evidence hygiene.
> Final re-review approved at 90/100; task promoted to `03-review` after verifier rerun.

| Finding / Requirement | Status | Evidence pointer |
|---|---|---|
| F1 — 502 / denominator arithmetic (208=200+8; status 82+55+54+8+1+0=200; 404 32+22=54) | FIXED | Snapshot `tmp/0158-call-logs-snapshot.json`; verifier `tmp/0158-verify.mjs` checks status sum, 404 subsets, 208 split; report §1–§2, §10 |
| F1b — unsupported `since`/`until` claim + 5-min window | FIXED | Report §1 + §4.4/§4.6: route contract `since/until` not forwarded; timestamp interval observed span only |
| F2 — disposition pair-aware (ordered `(comboExecutionKey, comboStepId)`; 138/45 → 17/134/49; `dfbde76f` & `795221b7` over-counted as 2 distinct) | FIXED | Snapshot pair-aware recomputation: `dfbde76f` dc=1→unknown (1 row); `795221b7` dc=1→unknown (3 rows, same repeated pair); totals 17/134/49; appendix `corr-<sha256-prefix12>` corrected (two Kiro rows now `| 1 | unknown |`); terminal rule preserved; checked by `tmp/0158-verify.mjs` (pair-aware assert + per-group dc/disp validation) |
| F3 — 25-row appendix literal `...` placeholders | FIXED | Report §11 now uses `corr-<sha256-prefix12>` (SHA-256 of full correlationId, first 12 hex, deterministic, bounded, non-sensitive, collision-resistant within 25-group snapshot); 25 `corr-` rows, no `...` placeholder in `corr-` rows; verifier asserts no `...` in appendix corr rows; not full UUIDs (12 hex vs 32+ dashes) |
| F3b — stale header `86/100` | FIXED | Historical prior-review entry retained for audit trail; current final review is 90/100 APPROVED in the Review Ledger and final report |
| Evidence closure — no Closure Matrix / no executable verifier | FIXED | This matrix (task-local) + `tmp/0158-verify.mjs` (deterministic Node verifier) + `tmp/0158-verify-output.txt` (`ALL CHECKS PASSED`); covers arithmetic, 25-group coverage, pair-aware 17/134/49, no-placeholder, redaction, restricted-snapshot boundary; runnable via `node tmp/0158-verify.mjs` |
| Snapshot hygiene — raw snapshot treated as sanitized | FIXED | Report marks `tmp/0158-call-logs-snapshot.json` as **restricted raw evidence** (contains PII/UUIDs — 5 email-shaped accounts + full UUIDs; access-controlled; NOT sanitized); task hygiene note mirrors this; raw rows never copied into report; verifier checks boundary and asserts report/task have no full UUID/email |
| In-memory wording "8 completed" | FIXED | Report + task now state `8 in-memory rows (1 active status 0 + 7 completed status 200)` everywhere; report §1 table + §2 + §8; task Completion Evidence + 8-row split table; verifier asserts 1+7 split |
| Provider/runtime semantics (Cerebras 400 context-limit 55, 404 split 32+22, Gemini thinkingBudget, MetaMuse 499 client-abort, Cloudflare 502=0, Kiro 402 limit) | PRESERVED (FIXED earlier) | Report §4 + §10.4; preserved through this pass; no regression |
| Terminal rule (17 rows with `all targets exhausted` / client abort) | PRESERVED | Pair-aware terminal requires terminal marker; 17 rows verified; verifier asserts terminal=17 |
| 208=200+8 split + 404/400/Gemini/MetaMuse + read-only + no Task 0159 mutation + no runtime/config/token mutation | PRESERVED per instructions | Snapshot-driven arithmetic; report §8-§12; task ledger preserved; verifier cross-checks; no `src/`/`open-sse/` change; no token reuse; no lane move |

**Verifier command**: `node tmp/0158-verify.mjs` — reproduces all arithmetic + pair-aware disposition totals + 25-group + no-placeholder + redaction + snapshot-boundary assertions without a live query.

- **Residual risks**:
  - Group `corr-a81decf3c624` (`df5034a6`) — 1 row `terminated` with single pair, no terminal marker → `unknown` by rule. If the provider's `terminated` should be terminal, update the terminal-marker set and re-run verifier; risk is low/single-row semantic, not count logic.
  - Live window beyond `2026-08-12T20:00:37.583Z–20:00:41.084Z` may contain groups outside this bounded snapshot; the 25-group appendix is complete for this snapshot, not an exhaustive production claim.
  - Final re-review is approved at 90/100; no further path-to-100 review is required.

### Previous Reports

- `2026-08-12` — `N/A` — `docs/reports/builders/0158-outbound-error-audit.md`
  - **Carried forward**: target-pair disposition proof, no-placeholder appendix identity, Closure Matrix/test artifact, and raw-snapshot handling.
  - **Resolved since**: unsupported API bounds, denominator/status/404 arithmetic, provider corrections, MetaMuse claim, 502 contradiction, and report/task scan cleanliness.
  - **Regression guard**: preserve the 208 total / 200 DB errors / 8 in-memory-row split and the 90-point promotion gate.
- `2026-08-12` — `86/100 REJECTED` — `docs/reports/review/2026-08-12-task-0158-omniroute-outbound-error-audit-review.md`
  - **Carried forward**: F2 target-specific redirect semantics and F3 bounded appendix evidence, now refined by direct snapshot recomputation.
  - **Resolved since**: prior 502 contradiction and missing appendix rows.
  - **Regression guard**: do not restore unsupported `since`/`until` claims, unredacted report identities, or unobserved MetaMuse/Gemini behavior.
- `2026-08-12` — `87/100 REJECTED` — `docs/reports/review/2026-08-12-task-0158-omniroute-outbound-error-audit-review.md`
  - **Carried forward**: F2 pair-aware disposition mismatch, F3 placeholder identities, evidence-closure gap, and raw-snapshot handling.
  - **Resolved since**: none; this is the current final delta-aware decision.
  - **Regression guard**: preserve the direct snapshot arithmetic and terminal-marker rule.

