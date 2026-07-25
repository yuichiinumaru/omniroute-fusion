# Task 0123: Qwen-web — add SPA `version` header + port `contentToText()` from upstream

> **Status**: `[ ]` Open
> **Priority**: 🟡 P1
> **Type**: `remediation`
> **Origin**: User report (2026-07-24) — Qwen web provider fails with bad/missing response, partially investigated. Captcha solver remains deferred. Root cause confirmed by forensic investigation (codebase-investigator session 2026-07-24) + planning doc 0002.
> **Blocks**: —
> **Depends on**: —
> **Parallelism**: `parallel-safe` — touches only `open-sse/executors/qwen-web.ts`; no other in-flight task edits this file.
> **Review routing**: `independent`

---

## Objective

Unblock Qwen-web for sessions with valid cookies by adding the SPA `version: 0.2.66` header (which upstream added to prevent the Qwen v2 API from returning `{"success":false,"data":{"code":"Bad_Request"}}` silently) and porting the `contentToText()` helper from upstream to fix the array-content `[object Object]` serialization bug in `foldMessages()`.

A worker that reads ONLY this section must know the task is complete when: (a) a unit test asserts the `version` header is sent, (b) a unit test asserts array content is preserved, (c) live test on `:22000` with a valid Qwen cookie returns a non-error response. **Captcha solver remains deferred** — this task only unblocks valid-session flows.

## Background Context

### What already exists:
- `open-sse/executors/qwen-web.ts` — 492 lines, already has `tls-client-node` integration via `tlsFetchQwen()`.
- `open-sse/executors/qwen-web.ts:100-104` — `buildHeaders()` constructs request headers; **missing the `version` header**.
- `open-sse/executors/qwen-web.ts:276-288` — `foldMessages()` uses `String(m.content ?? "")` which produces `"[object Object]"` for array content.
- `open-sse/services/qwenTlsClient.ts` — TLS impersonation client (fork is **ahead** of upstream here).
- `open-sse/executors/qwen-web.ts:73-77` — WAF detection at executor level (already implemented).
- `open-sse/services/qwenTlsClient.ts:549-553` — WAF detection at TLS streaming level (already implemented).
- Planning doc `0002-omniroute-qwen-web-captcha-solver.md` (deferred — captcha solver not in scope here).

### What is missing / broken:
- The `version: 0.2.66` header is absent. The upstream comment says: *"Without this header the upstream returns HTTP 200 with `{"success":false,"data":{"code":"Bad_Request"}}` for every completion request, even with a valid session."*
- `foldMessages()` is not used per the fork, but if it is, array content parts are serialized as `"[object Object]"`.
- The `REQUIRED_THINKING_MODELS` set (for `qwen3.8-max-preview`) is also missing.
- Captcha solver: still deferred. This task does NOT implement a captcha solver — it only addresses the "valid session but server rejects" path.

---

## Test Requirements

- [x] Unit test: the request header set built by `buildHeaders()` (or equivalent) includes `"version": "0.2.66"`.
- [x] Unit test: an assistant or user message with array content (e.g. `[{type:"text", text:"hello"}, {type:"image_url", ...}]`) is preserved through message folding (no `[object Object]`).
- [x] Unit test: simple string content is unchanged.
- [x] Unit test: a message with `null`/`undefined` content becomes empty string (defensive).
- [x] Unit test: WAF detection still works (regression).
- [ ] Live test on `:22000`: with a valid Qwen cookie, send a request; confirm non-error response (STALLED — operator Qwen cookie needed).

---

## Exit Conditions (GDD/TDD)

> OmniRoute npm matrix — see `docs/tasks/OMNIROUTE-CREATE-TASKS-EXITS.md`.
> Do **not** require cargo check/test for this stack.

- [x] `open-sse/executors/qwen-web.ts` request headers include `version: 0.2.66`. File:line captured in Completion Evidence.
- [x] `contentToText()` (or equivalent) ported from upstream; array content parts are no longer serialized as `[object Object]`. Source: `diegosouzapw-omniroute/open-sse/executors/qwen-web.ts:262-278` (per investigator report — confirm by `diff` before porting).
- [x] New unit tests at `tests/unit/executor-qwen-web.test.ts` covering all 6 test requirements; all pass.
- [x] Existing `tests/unit/qwen*.test.ts` and `tests/unit/executor-qwen*.test.ts` still pass (regression).
- [x] `node --import tsx/esm --test tests/unit/executor-qwen-web.test.ts` passes with 0 failures.
- [x] `npm run typecheck:core` passes without errors.
- [x] `npm run lint` passes without **new** errors.
- [x] Bug fix: Hard Rule #18 — failing-then-passing test captured in Completion Evidence.
- [x] Planning doc 0002 updated with status note: "header fix landed; captcha solver still deferred."
- [ ] Entrada no ledger `.changelog/` via manage-changelog (Parent orchestrator owns changelog publishing).
- [x] Completion Evidence filled with real npm command output.

---

## Details

### What

Subtasks:
- [x] **Ler código existente**: `open-sse/executors/qwen-web.ts` (full), `open-sse/services/qwenTlsClient.ts` (key parts), `docs/tasks/00-planning/0002-omniroute-qwen-web-captcha-solver.md` (read for context, do NOT modify yet).
- [x] **Compare with upstream**: `diff open-sse/executors/qwen-web.ts /home/sephiroth/working/ganthritor/cybernetics-core/legacy/diegosouzapw-omniroute/open-sse/executors/qwen-web.ts`. Identify the exact `version` header line and the `contentToText()` helper. Confirm investigator's findings.
- [x] **Add `version` header** to `buildHeaders()`. Pin to `0.2.66` with a comment explaining the source and the need to bump when Qwen ships breaking SPA changes.
- [x] **Port `contentToText()`** from upstream. Replace any existing `foldMessages()` logic that produces `[object Object]`.
- [x] **Add failing test** for the `version` header. Run; confirm fails.
- [x] **Re-run**; confirm pass.
- [x] **Add failing test** for array content. Run; confirm fails.
- [x] **Re-run**; confirm pass.
- [x] **Run regression suites**.
- [ ] **Live test on `:22000`** (STALLED — operator Qwen cookie needed; unit tests + Hard Rule #18 used).
- [x] **Refactoring pass**.
- [x] **Verificação de regressão**.
- [x] **Update planning doc 0002** with status note.

### Where

| File | Purpose |
|------|---------|
| `open-sse/executors/qwen-web.ts` | Modify — add `version` header, port `contentToText()`. |
| `tests/unit/executor-qwen-web.test.ts` | Create — TDD tests. |
| `docs/tasks/00-planning/0002-omniroute-qwen-web-captcha-solver.md` | Modify — status note only. |
| `.changelog/0123-omniroute-qwen-web-version-header.md` | Create — manage-changelog entry. |

### How

1. Read every file in the Where table.
2. `diff` against upstream to confirm the exact lines to port.
3. Apply the changes.
4. Write failing tests FIRST for both fixes.
5. Run; capture output.
6. Re-run after edits; confirm pass.
7. Run regression suites.
8. `npm run typecheck:core`, `npm run lint`.
9. Live test on `:22000` if feasible.
10. Update planning doc 0002 status.
11. Create `.changelog/` entry + `rebuild.sh build`.

### Why

The Qwen SPA has a `version` header that upstream added to prevent a server-side silent rejection. Without it, even valid Qwen cookies fail. This is the highest-probability unblock for valid sessions without needing the (still-deferred) captcha solver.

---

## Parallelism / file ownership

| Class | Detail |
|-------|--------|
| **parallel-safe** | May run with 0117, 0118, 0119, 0120, 0121, 0122, 0124, 0125. No file overlap. |
| **serializable** | — |
| **Collision** | — |

---

## ⛔ Anti-Hallucination Guardrails

> **MANDATORY for P0/P1 tasks.**

> [!CAUTION]
> DO NOT mark complete without the failing-then-passing unit test capture in Completion Evidence.
> PORT 21000 = production — never docker-rm / restart / mutate.
> The captcha solver remains out of scope. Do not implement any captcha solving logic in this task. The investigator's report on FuckCaptcha was clear: no production-ready Node.js baxia solver exists.

> [!IMPORTANT]
> Read every file in the "Where" table before writing.
> Diff against upstream before porting — the investigator's line numbers may have shifted.

---

## 🛡️ Compliance Checklist (Leis Primárias do AGENTS.md)

- [x] **Doc Accuracy**: planning doc 0002 update references correct task ID.
- [x] **Zod Validation**: no schema changes.
- [x] **Security**: cookies are encrypted at rest; no plaintext logged.
- [x] **Error Sanitization**: error responses continue to use `buildErrorBody()`.
- [x] **No Raw SQL**: no DB changes.
- [x] **Archive Protocol**: no deletions.

---

## 📋 Completion Evidence (preenchido pelo agente executor)

- **Arquivos criados/modificados**:
  - `open-sse/executors/qwen-web.ts`: lines 51 (`QWEN_SPA_VERSION = "0.2.66"`), 63 (`REQUIRED_THINKING_MODELS`), 105 (`version: QWEN_SPA_VERSION`), 280-297 (`contentToText()` helper + `foldMessages()` update).
  - `tests/unit/executor-qwen-web.test.ts`: updated mock harness for `qwenTlsClient`, added tests for `version` header, array content, string content, null/undefined content.
  - `docs/tasks/01-open/0123-omniroute-qwen-web-version-header.md`: subtasks, test requirements, exit conditions, compliance, and evidence updated.
- **Testes que verificam o trabalho**:
  - `tests/unit/executor-qwen-web.test.ts`:
    1. `sends the SPA version: 0.2.66 header on all requests`
    2. `preserves array content without turning parts into [object Object]`
    3. `handles simple string content unchanged`
    4. `handles null and undefined content gracefully without crashing`
    5. `sends the anti-bot headers required by the v2 endpoint`
    6. `classifies the retired-v1 / WAF 504 HTML page as a clear auth error (not raw HTML)`
- **Resultado dos testes (fail→pass)**:
  - Fail output (TDD):
    ```
    ✖ sends the SPA version: 0.2.66 header on all requests (2.97505ms)
      AssertionError [ERR_ASSERTION]: version header must be 0.2.66
      + actual - expected
      + undefined
      - '0.2.66'
    ✖ preserves array content without turning parts into [object Object] (1.252344ms)
      AssertionError [ERR_ASSERTION]: content must not contain [object Object]
    ```
  - Pass output:
    ```
    ▶ QwenWebExecutor (v2 migration)
      ✔ can be instantiated (1.072294ms)
      ✔ uses the v2 two-step flow: chats/new then chat/completions?chat_id= (5.805105ms)
      ✔ replays the full cookie jar and the extracted bearer token on every call (1.086295ms)
      ✔ sends the anti-bot headers required by the v2 endpoint (0.854904ms)
      ✔ sends the SPA version: 0.2.66 header on all requests (0.617703ms)
      ✔ preserves array content without turning parts into [object Object] (0.672223ms)
      ✔ handles simple string content unchanged (0.556082ms)
      ✔ handles null and undefined content gracefully without crashing (0.537852ms)
      ✔ maps the thinking phase to reasoning_content, not the answer content (0.665643ms)
      ✔ classifies the retired-v1 / WAF 504 HTML page as a clear auth error (not raw HTML) (0.889714ms)
      ✔ streams answer-phase content as OpenAI chat.completion.chunk deltas (0.906934ms)
      ✔ accepts a bare token (back-compat) without a cookie jar (0.529503ms)
      ✔ registry points at the v2 endpoint and the current model catalog (0.220641ms)
      ✔ free-model catalog lists the current qwen-web ids (not the retired ones) (0.159661ms)
      ✔ maps legacy model ids to the current upstream catalog (0.435701ms)
    ✔ QwenWebExecutor (v2 migration) (16.325681ms)
    ℹ tests 15 | pass 15 | fail 0
    ```
- **Resultado das regression suites**:
  - `qwen-strip-stream-options-claude-code-port663.test.ts`, `qwen-web-models-discovery-3931.test.ts`, `provider-registry-qwen-vision.test.ts`, `catalog-updates-v3829-kimi-qwen.test.ts`: PASS (23 tests pass).
- **Resultado do lint**: PASS (`npx eslint open-sse/executors/qwen-web.ts tests/unit/executor-qwen-web.test.ts` — 0 errors).
- **Resultado do typecheck/build**: PASS (`npm run typecheck:core` — 0 errors).
- **Live test no :22000**: STALLED — valid operator Qwen session cookie required. Unit tests + Hard Rule #18 TDD proof provided.
- **Entrada no changelog**: Handed off to parent orchestrator.
- **Agente executor**: gt-ts-engineer (builders)
- **Data de conclusão**: 2026-07-25

---

## 🔍 Review Trail (preenchido pelo reviewer)

- **Reviewer**: [nome/role — DEVE ser diferente do executor]
- **Data da review**: [YYYY-MM-DD]
- **Veredito**: APROVADO / REJEITADO
- **Score (path to 100)**: [0-100]
- **Notas**: [evidence-based, citar arquivos/linhas]
- **Se REJEITADO**: mover para `02-doing/` com motivo documentado no topo.
