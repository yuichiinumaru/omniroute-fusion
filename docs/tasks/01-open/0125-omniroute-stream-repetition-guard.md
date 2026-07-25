# Task 0125: Stream repetition guard — abort requests when model loops (Dahl kimi-k2.6 case)

> **Status**: `[ ]` Open
> **Priority**: 🟢 P2
> **Type**: `feature` (new)
> **Origin**: User request (2026-07-24) — Dahl provider (custom provider in SQLite) with kimi-k2.6 model enters a loop, repeating output until the request crashes. Operator wants a per-request, content-level guard that aborts on ≥2x repetition and triggers combo fallback. Root cause and architecture proposed by forensic investigation (codebase-investigator session 2026-07-24).
> **Blocks**: —
> **Depends on**: —
> **Parallelism**: `parallel-safe` — creates a new module + minimal wiring; touches `open-sse/utils/stream.ts` (or `streamHandler.ts`) and `open-sse/services/combo.ts` to recognize the new abort reason. No other in-flight task edits these files.
> **Review routing**: `independent`

---

## Objective

Add a streaming-level repetition guard that aborts an in-flight request when the model emits the same content block ≥2 times consecutively, causing the combo loop to fall through to the next target. After the feature ships, a model in a content-loop (like Dahl's kimi-k2.6 case) is detected and killed within a bounded number of repeated chunks instead of running until the request crashes.

A worker that reads ONLY this section must know the task is complete when: (a) a new module `open-sse/services/streamRepetitionGuard.ts` exists, (b) it hooks into the SSE stream processing loop, (c) on detected repetition it aborts the upstream fetch and surfaces an error to the combo loop, (d) the combo loop recognizes the abort reason and advances to the next target, (e) unit tests cover detection, non-repetition, and combo-fallback cases, (f) live test on `:22000` confirms a known-bad model is killed and the next target serves.

## Background Context

### What already exists:
- `open-sse/services/combo.ts:2600-2658` — combo target iteration: `Model ${modelStr} failed, trying next` at line 2625; `return null` at line 2658 to advance to next target.
- `open-sse/services/accountFallback.ts` — circuit breaker (provider-level), model lockout (provider+connection+model), connection cooldown. **None** watch for content-level repetition.
- `open-sse/handlers/chatCore.ts:3475-3535` — `isEmptyContentResponse()` (non-streaming only).
- `open-sse/services/combo/validateQuality.ts:72-262` — bounded SSE peek for Claude specifically (zero content blocks). **Not** a general repetition check.
- `open-sse/utils/stream.ts:81-2717` — main streaming loop, processes every `data:` chunk. This is where a repetition guard would hook.
- `open-sse/utils/streamHandler.ts` — stream controller with abort signal management.
- `open-sse/utils/streamPayloadCollector.ts` — accumulates structured events during streaming.
- `open-sse/shared/utils/circuitBreaker.ts` — circuit breaker for provider-level failures.

### What is missing:
- A per-request, content-level streaming guard that watches for repeated chunks.
- The combo loop does not currently have a "repetition_detected" abort reason.

### The user's specific use case:
- "Dahl" provider (likely a custom `openai-compatible-*` provider in SQLite) using the kimi-k2.6 model enters a content loop.
- The model emits the same content block repeatedly until the request crashes (memory/CPU).
- Desired behavior: detect the loop after 2 repetitions, abort the request, fall through to the next combo target.

---

## Test Requirements

- [ ] Unit test: the guard's detection function returns `repetition_detected` when 3 identical chunks (≥50 chars) arrive consecutively.
- [ ] Unit test: the guard's detection function returns `ok` when chunks are different (regression).
- [ ] Unit test: the guard's detection function returns `ok` when chunks are short whitespace-only (e.g. `" "`, `"\n"`) — these should be ignored.
- [ ] Unit test: the guard's detection function returns `ok` for tool-call argument streams (which grow incrementally and look like repetition at the prefix level but aren't).
- [ ] Unit test: when the guard triggers, the upstream `AbortController` is called with a `repetition_detected` reason.
- [ ] Unit test: the combo loop's error handler recognizes `repetition_detected` and advances to the next target (does not return a 4xx/5xx to the client).
- [ ] Live test on `:22000`: configure a combo with a known-bad model (or mock) and a working model; confirm the bad model is killed, the working one serves.

---

## Exit Conditions (GDD/TDD)

> OmniRoute npm matrix — see `docs/tasks/OMNIROUTE-CREATE-TASKS-EXITS.md`.
> Do **not** require cargo check/test for this stack.

- [ ] `open-sse/services/streamRepetitionGuard.ts` created. Public API: `createRepetitionGuard({ minChunkLength, historySize })` returns `{ check(chunk: string): "ok" | "repetition_detected", reset() }`. File:line captured in Completion Evidence.
- [ ] `open-sse/utils/stream.ts` (or `streamHandler.ts`) wires the guard into the SSE chunk processing loop. The guard's `check()` is called on every `delta.content` chunk.
- [ ] `open-sse/utils/streamHandler.ts` recognizes `repetition_detected` as a known abort reason and surfaces it as a 502-equivalent error to the combo loop.
- [ ] `open-sse/services/combo.ts` recognizes `repetition_detected` in its error classification and advances to the next target (does NOT mark the provider as exhausted — the provider is fine, the specific model was looping).
- [ ] New unit tests at `tests/unit/stream-repetition-guard.test.ts` (guard unit tests) and `tests/unit/combo-repetition-fallback.test.ts` (combo integration tests). All pass.
- [ ] Existing `tests/unit/stream*.test.ts`, `tests/unit/combo*.test.ts` still pass (regression).
- [ ] `node --import tsx/esm --test tests/unit/stream-repetition-guard.test.ts tests/unit/combo-repetition-fallback.test.ts` passes with 0 failures.
- [ ] `npm run typecheck:core` passes without errors.
- [ ] `npm run lint` passes without **new** errors.
- [ ] Feature toggle: the guard is opt-in via a combo-level setting (default off to avoid false positives on legitimate models that repeat phrases). Document the toggle in the task.
- [ ] Entrada no ledger `.changelog/` via manage-changelog + `rebuild.sh build`.
- [ ] Completion Evidence filled with real npm command output.

---

## Details

### What

Subtasks:
- [ ] **Ler código existente**: `open-sse/utils/stream.ts` (key sections around SSE chunk processing), `open-sse/utils/streamHandler.ts` (abort signal handling), `open-sse/services/combo.ts:2590-2680` (target iteration), `open-sse/services/combo/validateQuality.ts` (for the quality-validation hook), `open-sse/utils/streamPayloadCollector.ts` (for the structured-event path).
- [ ] **Design the guard**:
  - Sliding window of last 2-3 content deltas.
  - Compare on each new chunk.
  - Ignore chunks < 50 chars (to avoid whitespace-only false positives).
  - Compare as **accumulated** content (not per-chunk) to handle incremental deltas.
  - Decision: detect when **3 consecutive identical chunks** (each ≥ 50 chars) arrive. The third identical chunk triggers the abort. This is intentionally more conservative than the user's "≥2x" requirement to avoid false positives on legitimate models that occasionally repeat short phrases.
  - Document the algorithm in the module header.
- [ ] **Implement `open-sse/services/streamRepetitionGuard.ts`** with the API specified in Exit Conditions.
- [ ] **Wire into the stream pipeline** at the right point. The hook is the SSE chunk processor. The abort uses the existing `AbortController` on the upstream fetch.
- [ ] **Surface `repetition_detected` as a known abort reason** in `streamHandler.ts`.
- [ ] **Update combo error classification** in `combo.ts` to recognize `repetition_detected` and advance to the next target WITHOUT marking the provider as exhausted.
- [ ] **Add the feature toggle**: a combo-level setting `enableRepetitionGuard` (default off). Read from the combo config.
- [ ] **Add unit tests** for the guard and the combo integration.
- [ ] **Run regression suites**.
- [ ] **Live test on `:22000`**: build, restart test container. Configure a combo with the toggle on, point one target at a model that loops (or mock), point another at a working model. Confirm the working one serves.
- [ ] **Refactoring pass**.
- [ ] **Verificação de regressão**.

### Where

| File | Purpose |
|------|---------|
| `open-sse/services/streamRepetitionGuard.ts` | Create (new module). |
| `open-sse/utils/stream.ts` | Modify (wire guard). |
| `open-sse/utils/streamHandler.ts` | Modify (recognize abort reason). |
| `open-sse/services/combo.ts` | Modify (error classification + combo config toggle). |
| `tests/unit/stream-repetition-guard.test.ts` | Create. |
| `tests/unit/combo-repetition-fallback.test.ts` | Create. |
| `.changelog/0125-omniroute-stream-repetition-guard.md` | Create. |

### How

1. Read every file in the Where table.
2. Design the algorithm; document it in the task and the module header.
3. Implement the guard module.
4. Wire it in. Be careful: the guard must not break existing streaming behavior. The hook is read-only until it triggers, then it aborts.
5. Update combo error classification.
6. Add the toggle.
7. Write unit tests FIRST. Run; capture output.
8. Re-run after edits; confirm pass.
9. Run regression suites.
10. `npm run typecheck:core`, `npm run lint`.
11. Build, restart test container.
12. Live test on `:22000`.
13. Create `.changelog/` entry + `rebuild.sh build`.

### Why

A model in a content loop is functionally a failure from the user's perspective: it returns garbage and burns quota. Today the loop runs until crash. With this guard, the loop is detected and killed, and the combo advances to a healthy model. The opt-in toggle is critical because legitimate models sometimes repeat short phrases — the default-off policy is the safe one.

---

## Parallelism / file ownership

| Class | Detail |
|-------|--------|
| **parallel-safe** | May run with 0117, 0118, 0119, 0120, 0121, 0122, 0123, 0124. No file overlap. |
| **serializable** | — |
| **Collision** | `open-sse/utils/stream.ts` is a hot file; coordinate with any in-flight stream edits (none in this wave). |

---

## ⛔ Anti-Hallucination Guardrails

> **MANDATORY for P0/P1 tasks.**

> [!CAUTION]
> DO NOT mark complete without: (a) the failing-then-passing unit test capture for both files, (b) the live combo response showing the next target served.
> PORT 21000 = production — never docker-rm / restart / mutate.
> The guard MUST be opt-in (default off). Do not enable it globally — this is a feature, not a fix.
> Be careful with tool-call argument streams: they look like prefix repetition but are legitimate. Document the algorithm clearly and cover this case in tests.
> This task is a **new feature**, not a fix to existing code. Do not refactor the existing streaming pipeline beyond what is needed for the guard hook.

> [!IMPORTANT]
> Read every file in the "Where" table before writing.
> The Dahl case is a custom SQLite provider — the user CANNOT investigate it from code; the test for this task should be a synthetic loop in a working model (e.g., a mock that returns the same content 3x).

---

## 🛡️ Compliance Checklist (Leis Primárias do AGENTS.md)

- [ ] **Doc Accuracy**: the module header documents the algorithm, the toggle, and the rationale.
- [ ] **Zod Validation**: combo config toggle is Zod-validated.
- [ ] **Security**: no secrets involved.
- [ ] **Error Sanitization**: error responses continue to use `buildErrorBody()`.
- [ ] **No Raw SQL**: no DB changes.
- [ ] **Archive Protocol**: no deletions.

---

## 📋 Completion Evidence (preenchido pelo agente executor)

- **Arquivos criados/modificados**: [lista com paths + line numbers]
- **Testes que verificam o trabalho**: [7 test names + 2 file paths]
- **Resultado dos testes (fail→pass)**: [paste do `node --import tsx/esm --test …`]
- **Resultado das regression suites**: [stream + combo — PASS count]
- **Resultado do lint**: PASS/FAIL
- **Resultado do typecheck/build**: PASS/FAIL
- **Live test no :22000**: [paste do curl + response showing the next target served]
- **Entrada no changelog**: [path under `.changelog/` + rebuild output]
- **Agente executor**: [nome/role]
- **Data de conclusão**: [YYYY-MM-DD]

---

## 🔍 Review Trail (preenchido pelo reviewer)

- **Reviewer**: [nome/role — DEVE ser diferente do executor]
- **Data da review**: [YYYY-MM-DD]
- **Veredito**: APROVADO / REJEITADO
- **Score (path to 100)**: [0-100]
- **Notas**: [evidence-based, MUST verify: (a) toggle is opt-in default-off, (b) tool-call streams are not false-positive, (c) combo advances without provider-exhausted side effect]
- **Se REJEITADO**: mover para `02-doing/` com motivo documentado no topo.
