# Task 0158: Outbound Error Audit Report — Corrected Evidence Packet

> **Generated**: 2026-08-12
> **Status**: `[~]` In progress — evidence correction pass (path-to-100)
> **Review verdict**: REJECTED 87/100 — latest re-review 2026-08-12 (remain in 02-doing); pair-aware corrections 17/134/49 applied; no approval claimed
> **Lane**: `docs/tasks/02-doing/0158-omniroute-outbound-error-audit.md`
> **Agent**: builders / Integration Engineer
> **Scope**: read-only log analysis + source reconciliation; no runtime/config/credential mutation
> **Snapshot source**: `tmp/0158-call-logs-snapshot.json` — restricted raw evidence — contains PII/UUIDs; not sanitized; access-controlled; sanitized report is the deliverable; bearer token not persisted in snapshot

---

## 1. Bounded Query Packet — Corrected

> Status: unchanged. `since`/`until` are not exposed by the route, but `getCallLogs()` supports them internally. The five-minute bounded window claim from the earlier incorrect draft remains invalid. The observed snapshot span is retained as an observed span, not a query bound.

| Field | Value |
|-------|-------|
| **Endpoint** | `GET /api/usage/call-logs` |
| **Supported filters** | `status`, `model`, `provider`, `account`, `apiKey`, `combo`, `search`, `limit`, `offset` |
| **Unsupported filters** | `since`, `until` — **not forwarded by the route** (`src/app/api/usage/call-logs/route.ts:118-130`) |
| **Live auth probe** | Management auth succeeded on `http://127.0.0.1:22000` against the read-only call-log surface with a bearer token; the token was not persisted or printed. |
| **Rows retrieved** | **208** — 200 DB error rows + 8 in-memory rows (1 active status 0 + 7 completed status 200) |
| **DB-filtered vs in-memory** | 200 rows from persisted `call_logs` rows matching `status>=400` or `error_summary` not null; 8 rows appended from in-memory (1 active status 0 + 7 completed status 200) not present in DB |
| **Observation start/end** | `2026-08-12T20:00:37.583Z` → `2026-08-12T20:00:41.084Z` |
| **Snapshot artifact** | `tmp/0158-call-logs-snapshot.json` — restricted raw evidence (PII/UUIDs present); access-controlled; no bearer token persisted |
| **Management auth contract** | `requireManagementAuth(request)` accepts dashboard session, CLI token, scoped access token, or manage-scope API key; invalid/missing credentials return 401/403/503 (`src/lib/api/requireManagementAuth.ts`) |

### 1.1 Route contract verification

`route.ts` builds `filter` from `URLSearchParams` and only maps:

```ts
status / model / provider / account / apiKey / combo / search / limit / offset
```

`src/lib/usage/callLogs.ts:858-865` supports `since`/`until`, but the API route never forwards them. The earlier bounded-window claim is not reproducible through this endpoint; the actual sample spans ~3.5s.

### 1.2 Live auth result

```
GET /api/usage/call-logs?status=error&limit=200
→ HTTP 200
Body: array[208]
```

The operator-provided bearer token was used only against `http://127.0.0.1:22000` and was not persisted or printed beyond this redacted reference. The management-auth surface accepts multiple credential classes; this read-only probe used one accepted class and did not change credentials, combos, or runtime settings. The bounded snapshot was written to `tmp/0158-call-logs-snapshot.json`; the token was not persisted in the snapshot.

### 1.3 In-memory row behavior

`buildCallLogListRows()` appends active in-flight entries plus completed in-memory entries that are not already present in `call_logs` (`src/app/api/usage/call-logs/route.ts:40-104,106-111`). The completed in-memory entries observed in this sample are HTTP 200 and are explicitly excluded from error denominators.

---

## 2. Row Arithmetic — Corrected Baseline

| Category | Count | Source |
|----------|-------|--------|
| **DB error rows** | **200** | Persisted `call_logs` rows matching `status>=400` or `error_summary` not null |
| **In-memory rows** | **8** | `buildCallLogListRows()` appended 1 active status-0 row plus 7 completed status-200 rows not present in DB; all 8 are excluded from the error denominator |
| **Total returned rows** | **208** | Concatenated active/completed + DB rows |
| **Error-classified rows** | **200** | Rows with provider/body error evidence |
| **200-class rows in same response** | **8** | Ephemeral in-memory entries; explicitly excluded from error counts |

### 2.1 Status distribution (200 error rows)

| Status | Count | Notes |
|--------|-------|-------|
| 429 | 82 | Deprioritized rate-limit noise |
| 400 | 55 | Provider/routing errors; context-length limit below |
| 404 | 54 | Model-not-found; split below |
| 499 | 8 | Terminal combo exhaustion + client aborts |
| 402 | 1 | Kiro limit-reached |
| 502 | 0 | Not present in this snapshot |

### 2.2 Mutually exclusive 404 breakdown (54 rows total)

| Subset | Count | Evidence summary | Relationship |
|--------|-------|------------------|--------------|
| openai-compatible-responses provider `zmx/deepseek-v4-flash-free` | 32 | `[404]: Requested model is not valid` | Authoritative 404 subset |
| zenmux provider `zm/deepseek-v4-flash-free` | 22 | `[404]: Requested model is not valid` | Separate from the openai-compatible subset |
| **Total 404** | **54** | | Matches status total |

**Classifier statement**: the fifty-four 404 rows are split into two mutually exclusive provider/model subsets that sum to exactly 54. No other 404 patterns were observed in the 200-row error denominator.

### 2.3 Kiro 402 limit row (1 row)

| Provider | Model | Account | Error |
|----------|-------|---------|-------|
| kiro | glm-5 | masked | `[402]: You have reached the limit.` |

This row is classified as account/plan limit noise and is retained in the denominator, not dropped.

### 2.4 502 status

No rows with HTTP 502 were present in this snapshot. The prior 502-specific candidate pattern table is superseded by this observation and is not carried forward as an active count.

### 2.5 Prior arithmetic findings resolved

- The prior 210/219 mismatch is explained: the returned 208 rows include 8 non-error in-memory rows; the correct error denominator is **200**, not 219.
- DB rows and in-memory rows are now explicitly separated.
- 200/0 rows in the same response are classified as non-error ephemeral entries.
- The 404 candidate table now sums to exactly 54, with explicit subset relationships stated.

---

## 3. Redirect / Termination Evidence — Row-Level Disposition

### 3.1 Denominator

- **Error-row denominator**: 200 DB error rows
- **Correlation groups**: 25 distinct `correlationId` values among error rows
- **Rows with terminal marker**: 7 rows contain explicit terminal text: `"[499] Combo "researcher" failed — all targets exhausted"`, `"Client disconnected: request_signal_aborted"`, or `"Request aborted"`

### 3.2 Disposition methodology

A disposition is assigned per correlation group by target/step identity:

- `terminal` — at least one row contains `"all targets exhausted"` or equivalent terminal marker, or the request ended with a terminal client/server abort without later distinct pair evidence
- `redirected` — the correlation contains at least two distinct ordered `(comboExecutionKey, comboStepId)` pairs, with a later distinct pair having a different target/status/provider/model outcome than the earlier pair
- `unknown` — single-step group, or same-target retries with no later distinct `comboExecutionKey`/`comboStepId`, or rows with no combo metadata and no terminal marker

**Anti-misclassification rule**: a later row with the same `comboExecutionKey`/`comboStepId` and a different status is a retry or upstream state change on the same target, not a redirect to a different candidate. Redirects require a distinct later target/step identity.

### 3.3 Disposition counts

| Disposition | Rows | Meaning |
|-------------|------|---------|
| `terminal` | 17 | Final outcome is terminal combo exhaustion or terminal client abort |
| `redirected` | 134 | Same correlation contains later distinct `(comboExecutionKey, comboStepId)` pair with different target/status/provider/model outcome |
| `unknown` | 49 | Single-step or same-target retries; no distinct later `comboExecutionKey`/`comboStepId`, no combo metadata, or no terminal marker |

Total: 17 + 134 + 49 = **200 error rows**

### 3.4 Representative chains

**Terminal**:
- `corr-dab697f9857d` → openai-compatible-responses provider, 11 steps, all `404` "Requested model is not valid", terminal because terminal marker text `Request aborted` is present in the group
- `corr-40f2afb00f91` → researcher/MiniMaxAI/MiniMax-M2.7, 2 steps, terminal `Request aborted` and `[499] Combo "researcher" failed — all targets exhausted`
- `corr-54da9886d5b8` → artanis/muse-spark-1.2, 1 step, terminal `Client disconnected: request_signal_aborted`

**Redirected**:
- `corr-77d61fb88841` → ollama-cloud/minimax-m3, 14 steps, 7 distinct `(comboExecutionKey, comboStepId)` pairs, final `429` weekly usage limit
- `corr-42dc93f46611` → cerebras/zai-glm-4.7, 11 steps, 9 distinct `(comboExecutionKey, comboStepId)` pairs, final context-length `400`
- `corr-c9910e7da507` → ollama-cloud/minimax-m3, 5 steps, 3 distinct `(comboExecutionKey, comboStepId)` pairs, final `429` weekly usage limit

**Unknown**:
- `corr-a2b2219a94bf` → openai-compatible-responses provider, 11 steps, `404` model-not-found, 0 distinct pairs, no terminal marker
- `corr-6b944f700bc0` → zenmux provider, 11 steps, `404` model-not-found, 0 distinct pairs, no terminal marker
- `corr-a81decf3c624` → codex/gpt-5.6-luna-xhigh, 1 step, `terminated`, 1 distinct `(comboExecutionKey, comboStepId)` pair (no transition), no terminal marker

---

## 4. Provider / Runtime Interpretation — Corrected

### 4.1 Cerebras `zai-glm-4.7` 400 context-length limit (55 rows)

| Pattern | Count | Error excerpt |
|---------|-------|---------------|
| Prompt/completion too long | 55 | `[400]: Please reduce the length of the messages or completion. Current length is ... while limit is 8192` |

**Classification**: provider-side context-length limit. Not a thinking-budget or schema mismatch.

### 4.2 openai-compatible-responses / zenmux model-not-found 404 (54 rows)

| Provider | Model | Count | Error |
|----------|-------|-------|-------|
| openai-compatible-responses-<masked> | zmx/deepseek/deepseek-v4-flash-free | 32 | `[404]: Requested model is not valid` |
| zenmux | zm/deepseek/deepseek-v4-flash-free | 22 | `[404]: Requested model is not valid` |

**Corrected classification**: model-not-found catalog mismatch. The earlier report did not observe this 404 surge; live data shows two provider/model subsets, both with identical `Requested model is not valid` errors.

### 4.3 Kiro 402 limit-reached (1 row)

| Provider | Model | Count | Error |
|----------|-------|-------|-------|
| kiro | glm-5 | 1 | `[402]: You have reached the limit.` |

**Classification**: account/plan limit noise. Retained in the denominator but not actionable as a routing defect.

### 4.4 Gemini 3 `thinking_budget` / `thinkingLevel`

Source review of `open-sse/translator/request/openai-to-gemini.ts:287-337`:

- OpenAI `reasoning_effort` → Gemini `thinkingConfig.thinkingBudget`
- Claude `thinking.type: "enabled"` + `budget_tokens` → `thinkingBudget`
- Default modern Gemini models get `thinkingBudget` + `includeThoughts: true`
- **No `thinkingLevel` field is used**

Executor/source inspection added:

- `open-sse/services/cloudCodeThinking.ts:1-71` handles Cloud Code reasoning-specific stripping; no `thinkingLevel` mapping is present.
- `open-sse/executors/antigravity.ts:520-570` and `700-779` show bounded output/thinking-budget handling and model-specific unsupported-reasoning stripping; no path writes `thinkingLevel`.
- `open-sse/executors/antigravityUpstreamError.ts` was inspected for upstream 400 classification; no Gemini thinking-parameter 400 path was identified.

**Corrected claim**: translator and executor source both use `thinkingBudget`; **no matching 400 error observed in this sample**. The earlier report's omission of executor-side inspection is now closed.

### 4.5 MetaMuse / Task 0157 fail-soft

Live rows observed:

- `muse-spark-1.2` status 499: `Client disconnected: request_signal_aborted` (2 rows)
- Terminal `Request aborted` for MetaMuse/openai-compatible model-not-found groups

**Corrected claim**:
- Provider 404 for MetaMuse contributor model: **not observed** in this sample; the observed 404s are deepseek-v4-flash-free model-not-found on other providers.
- Client abort handling: observed twice in this sample
- Task 0157 404 behavior: **unexercised/unknown** from this audit

### 4.6 Cloudflare 502

No rows with HTTP 502 were present in this snapshot. The prior Cloudflare/Trae 502 breakdown is superseded by this observation.

---

## 5. Sanitization Audit — Corrected

### 5.1 Prior sanitization failures addressed

| Issue | Action in corrected report |
|-------|---------------------------|
| Full account email persisted | masked as `<account-redacted>` in report summaries; raw values remain in source/snapshot only |
| Full correlation IDs persisted | shortened to first 8 chars + `...` |
| Management bearer token reference | redacted as `<redacted>`; not repeated |
| Provider IDs with embedded UUIDs | shortened to first 8 chars + `...` |

### 5.2 Redaction rules applied

- Emails / account identifiers → `<account-redacted>` in report text
- Bearer / API keys → `<redacted>`
- Correlation IDs → `corr-<sha256-prefix12>` (deterministic, bounded, non-sensitive, collision-resistant within snapshot)
- Provider IDs containing UUIDs → masked/base provider name only (UUID suffix removed) 
- Prompts / response bodies → not present in corrected packet
- Unbounded log bodies → bounded by API `limit=200`

### 5.3 Secret scan result

| Pattern | Found in corrected report |
|---------|--------------------------|
| email-shaped value | 5 observed in raw snapshot only; masked in report |
| bearer token | none |
| API key literal | none |
| raw prompt | none |
| unbounded response body | none |
| full UUID correlation ID | none |
| raw account display values | present in snapshot only; replaced with `<account-redacted>` in report |

Scan method: deterministic regex scans over `tmp/0158-call-logs-snapshot.json` and `docs/reports/builders/0158-outbound-error-audit.md`.

---

## 6. Task 0159 Candidate Patterns — Refresh from Corrected Evidence

Only patterns supported by live sample or source inspection:

| Category | Pattern | Status | Evidence Basis |
|----------|---------|--------|----------------|
| Deprioritized noise | Rate limit 429 | 429 | 82 rows; upstream rate limiting |
| Provider request limit | Cerebras context-length 400 | 400 | 55 rows; completion length exceeds 8192 |
| Catalog mismatch | openai-compatible-responses 404 model-not-found | 404 | 32 rows; `zmx/deepseek-v4-flash-free` invalid |
| Catalog mismatch | zenmux 404 model-not-found | 404 | 22 rows; `zm/deepseek-v4-flash-free` invalid |
| Account limit | Kiro 402 limit-reached | 402 | 1 row; account/plan limit |
| Comportamento de combo | Terminal exhaustion 499 | 499 | 17 rows; explicit terminal marker |
| Comportamento de combo | Redirected multi-target | mixed | 134 rows; same correlation with later-step signature change |
| Unknown / unjoinable | Unknown/no terminal | mixed | 49 rows; no distinct later target/step identity and no terminal marker |
| Translator source | Gemini `thinkingBudget` used | N/A | Source confirmed; no live 400 observed |
| Cloudflare 502 | Not observed in this snapshot | N/A | 0 rows in current evidence |

**Not claimed as proven from live data**: exact redirect success rate per combo, long-tail provider behavior outside this sample.

---

## 7. Access Evidence Record

| Check | Result |
|-------|--------|
| Endpoint | `http://127.0.0.1:22000/api/usage/call-logs` |
| Query | `status=error&limit=200` |
| Auth header | `Authorization: Bearer <redacted>` |
| HTTP status | 200 |
| Response body | `array[208]` |
| Rows retrieved | 208 |
| Token persisted | No |
| Token printed | No |
| Snapshot artifact | `tmp/0158-call-logs-snapshot.json` — no bearer token persisted |

---

## 8. Corrected Conclusions

1. The claimed five-minute bounded query is **not reproducible** through the documented API route; `since`/`until` are not exposed.
2. Live evidence retrieval succeeded on `:22000`; the corrected evidence packet is based on **208 returned rows**, of which **200 are DB error rows** and **8 are in-memory completed rows**.
3. Row arithmetic is reconciled: error denominator = 200; dispositions = terminal 17 + redirected 134 + unknown 49.
4. Cerebras 400s are **context-length-limit** errors, not thinking-parameter mismatches.
5. openai-compatible-responses and zenmux 404s are **model-not-found catalog mismatches**.
6. Kiro 402 is an **account limit-reached** row, not a routing defect.
7. Gemini translator uses `thinkingBudget`; no thinking-parameter 400 observed.
8. MetaMuse 404 behavior is **unexercised/unknown**; only client-abort 499 rows observed.
9. Cloudflare 502 was **not present** in this snapshot.
10. Sanitization masks emails/account identifiers, full correlation IDs, provider UUIDs, and bearer tokens.
11. Full 25-correlation bounded disposition appendix is present in §11 with deterministic row counts.

---

## 9. Required Path-to-100 Actions

1. Document observation window as the unbounded live sample span and remove unsupported `since`/`until` claims. ← **done**
2. Reconcile DB vs in-memory rows explicitly. ← **done**
3. Reconcile the 404 pattern table into mutually exclusive subsets summing to exactly 54. ← **done**
4. Recompute dispositions using distinct ordered `(comboExecutionKey, comboStepId)` pair transitions; classify same-pair retries as `unknown`. ← **done**
5. Produce the complete correlation-group bounded disposition appendix with sanitized keys, counts, target/step evidence, and final outcome. ← **done**
6. Add executor-side Gemini source citations or record that inspection found no contrary issue. ← **done**
7. Add deterministic count, appendix, and redaction checks. ← **done**
8. Obtain fresh independent review before lane promotion.

---

## 10. Deterministic Checks

The following checks were applied to the corrected packet. They are not runtime tests; they are evidence-integrity assertions against the written report.

### 10.1 Count reconciliation

```
DB error rows + in-memory completed rows = total rows
200 + 8 = 208
```

```
Status distribution total
82 + 55 + 54 + 8 + 1 + 0 = 200
```

```
404 mutually exclusive subsets
openai-compatible-responses 32 + zenmux 22 = 54
```

```
Disposition totals
17 + 134 + 49 = 200
```

All four assertions reconcile exactly to the 200-row DB error denominator.

### 10.2 Disposition scan

- Correlation group count: **25**
- Rows with `comboExecutionKey` or `comboStepId`: reviewed for distinct-step transitions
- Same-pair retries without later distinct pair: classified `unknown`
- Groups with terminal marker: classified `terminal`
- Groups with later distinct `(comboExecutionKey, comboStepId)` pair: classified `redirected`
- Full 25-group appendix present in §11 with no placeholder rows
- No raw account emails, bearer tokens, API keys, prompts, response bodies, or full UUID correlation IDs are present in §11.

### 10.3 Redaction scan

| Pattern | Found in corrected report |
|---------|--------------------------|
| email-shaped value | none in report; 5 masked in snapshot processing |
| bearer token / API key literal | none |
| full UUID correlation ID | none |
| raw prompt / request body | none |
| raw response body | none |
| unbounded log excerpt | none |
| raw account display value | none in report; snapshot values replaced with `<account-redacted>` |

Scan method: deterministic regex patterns over `docs/reports/builders/0158-outbound-error-audit.md` plus manual review of §11 appendix rows.

### 10.4 Provider/runtime classification scan

- Cerebras 400: classified as context-length limit; source confirmed no thinking-budget mapping
- openai-compatible-responses 404: classified as model-not-found; provider shortened to `openai-compatible-responses-<masked>`
- zenmux 404: classified as model-not-found; provider `zenmux`
- Kiro 402: classified as account limit-reached; retained in denominator
- Cloudflare 502: 0 rows; superseded by current snapshot
- Gemini: translator and executor source reviewed; no `thinkingLevel` mapping; no matching live 400
- MetaMuse 404: explicitly unexercised/unknown
- Client-abort 499: 7 rows observed as terminal markers across 5 groups

---

## 11. Correlation Group Disposition Appendix

> Complete sanitized disposition covering all **25 correlation groups** in the 200-row DB-error denominator.
> No full UUIDs, emails, tokens, prompts, raw bodies, or credentials are included.
> Correlation keys are `corr-<sha256-prefix12>` derived deterministically from the full correlationId (bounded, non-sensitive, collision-resistant within this 25-group snapshot).
> Provider IDs containing UUIDs are reduced to the base provider name (UUID suffix removed) .
> Target identity evidence uses ordered `(comboExecutionKey, comboStepId)` pair; a distinct later pair is required for `redirected`.

### 11.1 Appendix format

| Group | Rows | Distinct targets/steps | Disposition | Terminal marker | Final outcome summary |
|-------|------|------------------------|-------------|-----------------|-----------------------|

Legend:
- **Distinct targets/steps** — count of distinct ordered `(comboExecutionKey, comboStepId)` pairs observed for the group; `0` means no combo metadata was present, `1` means a single pair (no transition).
- **Terminal marker** — `yes` if any row contains `"all targets exhausted"`, `Client disconnected: request_signal_aborted`, `Request aborted`, or equivalent terminal text; otherwise `no`.
- **Final outcome summary** — sanitized one-line summary of the last observed attempt/outcome.

### 11.2 Appendix table

| Group | Rows | Distinct targets/steps | Disposition | Terminal marker | Final outcome summary |
|-------|------|------------------------|-------------|-----------------|-----------------------|
| `corr-77d61fb88841` | 14 | 7 | redirected | no | `[429]` weekly usage limit on ollama-cloud/minimax-m3 |
| `corr-ad4f3eb52eb1` | 14 | 7 | redirected | no | `[429]` weekly usage limit on ollama-cloud/minimax-m3 |
| `corr-3d04dbf55351` | 14 | 7 | redirected | no | `[429]` weekly usage limit on ollama-cloud/minimax-m3 |
| `corr-acee55542d8d` | 14 | 7 | redirected | no | `[429]` weekly usage limit on ollama-cloud/minimax-m3 |
| `corr-9bb099af0582` | 14 | 7 | redirected | no | `[429]` weekly usage limit on ollama-cloud/minimax-m3 |
| `corr-42dc93f46611` | 11 | 9 | redirected | no | `[400]` context-length limit on cerebras/zai-glm-4.7 |
| `corr-f941e0398e24` | 9 | 9 | redirected | no | `[400]` context-length limit on cerebras/zai-glm-4.7 |
| `corr-e1ebf300c350` | 9 | 9 | redirected | no | `[400]` context-length limit on cerebras/zai-glm-4.7 |
| `corr-e5be4b9c5160` | 9 | 9 | redirected | no | `[400]` context-length limit on cerebras/zai-glm-4.7 |
| `corr-7faf41d986fe` | 8 | 7 | redirected | no | `[400]` context-length limit on cerebras/zai-glm-4.7 |
| `corr-69af8ee77494` | 7 | 7 | redirected | no | `[400]` context-length limit on cerebras/zai-glm-4.7 |
| `corr-32e70e64b715` | 6 | 6 | redirected | no | `[400]` context-length limit on cerebras/zai-glm-4.7 |
| `corr-c9910e7da507` | 5 | 3 | redirected | no | `[429]` weekly usage limit on ollama-cloud/minimax-m3 |
| `corr-95a3710bb9c9` | 3 | 1 | unknown | no | `[429]` rate limit on kiro/glm-5 |
| `corr-b81bde9f6c1d` | 1 | 1 | unknown | no | `[402]` limit-reached on kiro/glm-5 |
| `corr-dab697f9857d` | 11 | 0 | terminal | yes | `[404]` model-not-found terminal group with `Request aborted` marker |
| `corr-40f2afb00f91` | 2 | 1 | terminal | yes | `Request aborted` + `[499]` all-targets-exhausted terminal |
| `corr-47617a508e42` | 2 | 1 | terminal | yes | `Request aborted` + `[499]` all-targets-exhausted terminal |
| `corr-54da9886d5b8` | 1 | 1 | terminal | yes | `Client disconnected: request_signal_aborted` terminal |
| `corr-afb09798c8f3` | 1 | 1 | terminal | yes | `Client disconnected: request_signal_aborted` terminal |
| `corr-a2b2219a94bf` | 11 | 0 | unknown | no | `[404]` model-not-found; no distinct later target/step |
| `corr-9e0da1ba0370` | 11 | 0 | unknown | no | `[404]` model-not-found; no distinct later target/step |
| `corr-6b944f700bc0` | 11 | 0 | unknown | no | `[404]` model-not-found; no distinct later target/step |
| `corr-45c791e9acb1` | 11 | 0 | unknown | no | `[404]` model-not-found; no distinct later target/step |
| `corr-a81decf3c624` | 1 | 1 | unknown | no | `terminated`; no terminal marker or distinct redirect |

**Appendix total**: 200 rows across 25 correlation groups.
**Dispositions**: terminal=17, redirected=134, unknown=49.

### 11.3 Appendix integrity checks

- Row count across all three disposition tables equals **200**.
- All 25 correlation groups are accounted for in §11.2.
- No table cell contains an email-shaped string, bearer-shaped string, API-key-shaped string, raw prompt, full UUID, or unbounded error body.
- Terminal marker claims are bounded to keywords observed in `error`/`error_summary`: `all targets exhausted`, `Client disconnected: request_signal_aborted`, `Request aborted`.

---

## 12. Anti-Hallucination Compliance

- [x] Live query attempted; HTTP 200 recorded with exact row counts
- [x] Unsupported query bounds (`since`/`until`) removed from claims
- [x] DB rows separated from in-memory rows
- [x] Redirect/termination analysis tied to correlation groups, terminal markers, and distinct `comboExecutionKey`/`comboStepId` transitions
- [x] Provider classifications corrected from live sample
- [x] Sanitization gaps from prior report closed
- [x] Task 0159 refresh limited to corrected evidence, not prior unverified counts
- [x] No secrets, raw prompts, or bearer tokens in report
- [x] Executor-side Gemini source inspection documented and yielded no contrary finding
- [x] Deterministic count/appendix/redaction checks added
- [x] Complete 25-correlation appendix included with deterministic row counts

---

## 13. Worker Handoff Notes

This packet was finalized from `tmp/0158-call-logs-snapshot.json`. No further snapshot capture is required unless the observation window needs refreshing. Task 0158 remains in `02-doing/` pending independent review. No reviewer approval is claimed by this correction pass.
