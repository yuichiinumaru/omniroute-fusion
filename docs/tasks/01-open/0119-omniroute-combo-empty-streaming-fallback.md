# Task 0119: Fix NVIDIA NIM combo fallback when response has 0 output tokens (200 OK with empty content)

> **Status**: `[ ]` Open
> **Priority**: 🔴 P0
> **Type**: `remediation`
> **Origin**: User report (2026-07-24) — NVIDIA NIM provider with `z-ai/glm-5.2` model returns a 200 OK with 0 output tokens ("Completed" status) and the combo queue stops instead of falling through. Root cause partially traced (codebase-investigator session 2026-07-24).
> **Blocks**: —
> **Depends on**: —
> **Parallelism**: `parallel-safe` — touches `open-sse/services/combo/validateQuality.ts` and possibly `open-sse/services/combo.ts`; no other in-flight task edits these files.
> **Review routing**: `independent`

---

## Objective

Stop a 200 OK with 0 output tokens (empty content) on a streaming response from silently terminating the combo chain. After the fix, a streaming response that completes without any content blocks must be classified as an invalid response by `validateResponseQuality` and trigger combo fallback to the next target.

A worker that reads ONLY this section must know the task is complete when: (a) a streaming 200 response with 0 tokens is detected as invalid, (b) the combo advances to the next target, and (c) unit tests cover both streaming and non-streaming empty-content paths.

## Background Context

### What already exists:
- `open-sse/services/combo/validateQuality.ts:57-377` — `validateResponseQuality()` checks JSON body has non-empty content, tool_calls, or reasoning_content. Non-streaming path correctly catches `fullContent.trim().length === 0`.
- `open-sse/services/combo/validateQuality.ts:72-262` — bounded streaming peek for Claude specifically (detects `message_start` → `message_stop` with zero `content_block_*` events). Claude-only — does not cover OpenAI-compatible streaming like NVIDIA.
- `open-sse/services/combo.ts:2122` — `validateResponseQuality` is called for successful (200) responses and returns `null` on `!quality.valid` to advance the target.
- `open-sse/handlers/chatCore.ts:3475-3535` — `isEmptyContentResponse()` for non-streaming JSON.
- The operator's log line: `Duration: 1.9s, Total Out: 0, Model: z-ai/glm-5.2, Provider: NVIDIA, API Key: o2 (dee2***6b81)` confirms a 200 OK with 0 output tokens.

### What is missing / broken:
- The streaming quality validation for OpenAI-compatible providers (NVIDIA, OpenAI, Groq, xAI, etc.) may not be detecting 0-token responses reliably. The Claude-specific bounded peek is the only streaming check.
- When the SSE stream completes (`data: [DONE]`) but no `delta.content` chunks were ever received, the response is treated as valid (just empty).
- Need to confirm by reading the full `validateQuality.ts` streaming path; the investigator's report flagged this as remaining investigation.

---

## Test Requirements

- [ ] Unit test: a streaming response that produces only `[DONE]` (no content deltas) is classified as `valid: false` with reason `"empty_streaming_content"`.
- [ ] Unit test: a streaming response that produces a single whitespace-only delta (e.g. `delta.content: " "`) is also classified as invalid (whitespace-only counts as empty for the operator's use case).
- [ ] Unit test: a streaming response that produces reasoning_content but no final content is classified as `valid: true` when reasoning is the expected output (e.g., DeepSeek, Kimi K2).
- [ ] Unit test: non-streaming empty content (already covered) still works (regression).
- [ ] Live test on `:22000`: configure a combo with a known-bad NVIDIA NIM target that returns 0 tokens, plus a working OpenAI target; confirm OpenAI serves.

---

## Exit Conditions (GDD/TDD)

> OmniRoute npm matrix — see `docs/tasks/OMNIROUTE-CREATE-TASKS-EXITS.md`.
> Do **not** require cargo check/test for this stack.

- [ ] `validateResponseQuality()` (or its streaming branch) detects a 0-token SSE response and returns `{ valid: false, reason: "empty_streaming_content" }`. File:line of the change captured in Completion Evidence.
- [ ] The streaming detection does NOT break providers that legitimately emit whitespace-only deltas as the start of a larger response (use full-content accumulation, not just `length > 0`).
- [ ] New unit tests at `tests/unit/validate-quality-empty-streaming.test.ts` covering all 5 test requirements; all pass.
- [ ] Existing `tests/unit/validate-quality*.test.ts` and `tests/unit/combo-quality*.test.ts` still pass (regression).
- [ ] `node --import tsx/esm --test tests/unit/validate-quality-empty-streaming.test.ts` passes with 0 failures.
- [ ] `npm run typecheck:core` passes without errors.
- [ ] `npm run lint` passes without **new** errors.
- [ ] Bug fix: Hard Rule #18 — failing-then-passing test captured in Completion Evidence.
- [ ] Entrada no ledger `.changelog/` via manage-changelog + `rebuild.sh build`.
- [ ] Completion Evidence filled with real npm command output and the live combo response.

---

## Details

### What

Subtasks:
- [ ] **Ler código existente**: `open-sse/services/combo/validateQuality.ts` (full — both streaming and non-streaming paths), `open-sse/services/combo.ts:2100-2200` (caller), `open-sse/handlers/chatCore.ts:3470-3540` (`isEmptyContentResponse`), and the existing `tests/unit/validate-quality*.test.ts` if present.
- [ ] **Confirm root cause** by reading the full streaming branch of `validateQuality.ts` (investigation was cut short by max-steps; this subtask finalizes the diagnosis).
- [ ] **Decide detection approach**: (A) count of content blocks during SSE stream (≥ 1 = valid), OR (B) accumulated non-whitespace content length (> 0 = valid), OR (C) presence of `finish_reason: stop` with no preceding content. Document the choice with rationale.
- [ ] **Add failing test** for a streaming response with 0 content. Run it; confirm it fails.
- [ ] **Implement the fix** in `validateQuality.ts`. Be careful: providers may emit a single whitespace delta before actual content, so do not reject on the first chunk — accumulate.
- [ ] **Run tests**; confirm all pass.
- [ ] **Live test on `:22000`**: build, restart test container, configure combo, run, capture response.
- [ ] **Refactoring pass**: ensure the new check composes well with the existing Claude-specific bounded peek.
- [ ] **Verificação de regressão**: full `validate-quality*` and `combo-quality*` test suites.

### Where

| File | Purpose |
|------|---------|
| `open-sse/services/combo/validateQuality.ts` | Modify — add streaming empty-content detection. |
| `tests/unit/validate-quality-empty-streaming.test.ts` | Create — TDD tests. |
| `.changelog/0119-omniroute-combo-empty-streaming-fallback.md` | Create — manage-changelog entry. |

### How

1. Read every file in the Where table.
2. Read the full streaming branch of `validateQuality.ts`; identify exactly where content is accumulated and where the final "valid/invalid" decision is made.
3. Document the chosen detection approach (A/B/C) in the task with rationale.
4. Write the failing test FIRST. Run; capture output.
5. Implement. Re-run; confirm pass.
6. Run regression suites.
7. `npm run typecheck:core`, `npm run lint`.
8. Live test on `:22000`. Build, restart ONLY test container.
9. Create `.changelog/` entry + `rebuild.sh build`.

### Why

An empty 200 response is functionally a failure from the user's perspective: the combo spent quota and returned nothing. The current behavior silently ends the chain, which is a Hard Rule violation against the documented "combo fallback" contract. Fixing this restores the expected behavior the operator observed before the NVIDIA-specific bug appeared.

---

## Parallelism / file ownership

| Class | Detail |
|-------|--------|
| **parallel-safe** | May run with 0117, 0118, 0120, 0123. No file overlap. |
| **serializable** | — |
| **Collision** | `open-sse/services/combo/validateQuality.ts` and `combo.ts` are shared; coordinate with any in-flight combo edits (none in this wave). |

---

## ⛔ Anti-Hallucination Guardrails

> **MANDATORY for P0/P1 tasks.**

> [!CAUTION]
> DO NOT mark complete without: (a) the failing-then-passing unit test capture, (b) the live combo response showing the next target attempted.
> PORT 21000 = production — never docker-rm / restart / mutate.
> Do NOT over-correct: a single whitespace delta at the start of a real response is normal — accumulate, do not reject on first chunk.

> [!IMPORTANT]
> Read the full streaming branch of `validateQuality.ts` before deciding the approach. The investigator's report was cut short; the implementer must finish reading the file.

---

## 🛡️ Compliance Checklist (Leis Primárias do AGENTS.md)

- [ ] **Doc Accuracy**: any new reason string is documented in `validateQuality.ts` header.
- [ ] **Zod Validation**: no schema changes.
- [ ] **Security**: no secrets involved.
- [ ] **Error Sanitization**: error responses continue to use `buildErrorBody()`.
- [ ] **No Raw SQL**: no DB changes.
- [ ] **Archive Protocol**: no deletions.

---

## 📋 Completion Evidence (preenchido pelo agente executor)

- **Arquivos criados/modificados**: [lista com paths + line ranges]
- **Testes que verificam o trabalho**: [5 test names + file path]
- **Resultado dos testes (fail→pass)**: [paste do `node --import tsx/esm --test …`]
- **Resultado das regression suites**: [validate-quality + combo-quality — PASS count]
- **Resultado do lint**: PASS/FAIL
- **Resultado do typecheck/build**: PASS/FAIL
- **Live combo no :22000**: [paste do curl + response]
- **Entrada no changelog**: [path under `.changelog/` + rebuild output]
- **Agente executor**: [nome/role]
- **Data de conclusão**: [YYYY-MM-DD]

---

## 🔍 Review Trail (preenchido pelo reviewer)

- **Reviewer**: [nome/role — DEVE ser diferente do executor]
- **Data da review**: [YYYY-MM-DD]
- **Veredito**: APROVADO / REJEITADO
- **Score (path to 100)**: [0-100]
- **Notas**: [evidence-based, citar arquivos/linhas + confirmar regressão]
- **Se REJEITADO**: mover para `02-doing/` com motivo documentado no topo.
