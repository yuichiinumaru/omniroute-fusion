# Task 0181: MITM Handlers — Extract Shared Forwarding/SSE Helper

> **Status**: `[ ]` Open
> **Priority**: 🟢 P2
> **Type**: `housekeeping`
> **Origin**: Code duplication analysis (`.agents/user/gitingest/omniroute2/detect-sameblocks.mjs`, `sameblocs.csv` groups 0827/0745/0595). Confirmed by source inspection 2026-08-18.
> **Blocks**: —
> **Depends on**: —
> **Parallelism**: `parallel-safe` — touches only `src/mitm/handlers/` and its tests. No overlap with open tasks 0036/0175–0179.
> **Review routing**: independent

---

## Objective

Eliminate the repeated, byte-identical `intercept()` body copy-pasted across 7 of the 9
concrete MITM handlers. The identical block (JSON.parse → model rewrite → fetchRouter →
upstream.ok check → error text read → pipeSSE with collected string → hookBufferUpdate with
timing/headers/size) is duplicated verbatim in codex, copilot, cursor, openCode, zed (all
routing to `/v1/chat/completions`) and with only the router path differing in claudeCode and
kiro (both routing to `/v1/messages`).

**Concrete result**: a single protected method on `MitmHandlerBase` (e.g.
`forwardAndPipeSSE()`) that encapsulates the shared intercept flow, so simple handlers
reduce to a one-liner override with just the router path and optional body transformer,
while non-trivial handlers (Antigravity with its Gemini→OpenAI conversion) keep full
control by overriding `intercept()` directly.

**Why now**: The current provider handlers copy-paste the same 30-line block. A bug in the
upstream-check, SSE piping, timing calculation, or hookBuffer call pattern would need
identical fixes in 7+ files. The base class already exists and already provides the
primitives — the only missing piece is the orchestration sequence.

---

## Background Context

### O que já existe:

- **`MitmHandlerBase`** (`src/mitm/handlers/base.ts`, 333 lines): abstract base class
  providing `fetchRouter()`, `pipeSSE()`, `hookBufferStart()`, `hookBufferUpdate()`,
  `hookBufferError()`, `writeError()`, `now()`, `extractSourceModel()`, and
  `shouldCaptureBody()`. Very well-designed — the primitives are all there.
- **9 concrete handlers** in `src/mitm/handlers/*.ts`: antigravity, claudeCode, codex,
  copilot, cursor, kiro, openCode, trae (stub), zed.
- **Shared test harness**: `tests/unit/_mitmHandlerHarness.ts` — mocks `globalThis.fetch`
  and provides `runHandler()` for all handler tests.
- **Per-handler test files** (9 files total, one per concrete handler): each has at least one happy-path assertion; `mitm-handler-base.test.ts` separately covers base helpers.

### O que está duplicado:

**Group A — identical body, route `/v1/chat/completions`** (5 files):
`codex.ts`, `copilot.ts`, `cursor.ts`, `openCode.ts`, `zed.ts`
Each is exactly 55 lines. The `intercept()` body (lines 17–54) is byte-identical across
all five files. Only the class name, `agentId`, and the JSDoc header differ.

**Group B — identical body, route `/v1/messages`** (2 files):
`claudeCode.ts` (56 lines), `kiro.ts` (58 lines, extra JSDoc).
Same `intercept()` body as Group A, only changing the string
`"/v1/chat/completions"` → `"/v1/messages"`.

**Group C — genuine divergence** (1 file):
`antigravity.ts` (192 lines). Has Gemini→OpenAI body conversion
(`convertGeminiToOpenAI`, `resolveGeminiSource`, streaming-intent detection from URL),
then the same fetch+pipe+hook tail. The tail is identical to Groups A/B.

**Group D — stub** (1 file):
`trae.ts` (25 lines). Throws "not yet implemented". Not in scope.

### Duplicated block (canonical form, ~30 lines):

```typescript
const startedAt = this.now();
const intercepted = await this.hookBufferStart(req, body, mappedModel);
try {
  const payload = JSON.parse(body.toString());
  payload.model = mappedModel;
  const upstreamStart = this.now();
  const upstream = await this.fetchRouter(payload, ROUTER_PATH, req.headers);
  if (!upstream.ok) {
    const errText = await upstream.text().catch(() => "");
    throw new Error(`OmniRoute ${upstream.status}: ${errText}`);
  }
  let collected = "";
  await this.pipeSSE(upstream, res, (chunk) => {
    collected += chunk.toString();
  });
  const total = this.now() - startedAt;
  this.hookBufferUpdate(intercepted, {
    status: upstream.status,
    responseHeaders: Object.fromEntries(upstream.headers.entries()),
    responseBody: collected,
    responseSize: Buffer.byteLength(collected),
    proxyLatencyMs: upstreamStart - startedAt,
    upstreamLatencyMs: total - (upstreamStart - startedAt),
  });
} catch (err) {
  await this.hookBufferError(intercepted, err);
  await this.writeError(res, err);
}
```

The only variations are:
1. `ROUTER_PATH`: `"/v1/chat/completions"` or `"/v1/messages"`.
2. Antigravity pre-transforms `payload` and derives `stream` from the URL before the
   shared tail.

---

## Test Requirements

- DEVE: All 9 existing per-handler test files pass unchanged after the refactor (green-to-green).
- DEVE: The `mitm-handler-base.test.ts` file continues to pass (base class helpers).
- DEVE: A new test MUST assert that the default `forwardAndPipeSSE()` path on `MitmHandlerBase`
  (via a test subclass) performs: (a) JSON parse + model rewrite, (b) calls `fetchRouter`
  with the provided path, (c) checks `upstream.ok`, (d) calls `pipeSSE`, (e) calls
  `hookBufferUpdate` with correct timing fields.
- DEVE: A new test MUST verify that an upstream non-OK response (e.g. 502) is read via
  `.text()`, thrown as an Error, caught, and written via `writeError`.
- DEVE: Antigravity handler continues to use its own full `intercept()` override (its tests
  must still pass, including Gemini→OpenAI conversion and cloudcode-pa envelope unwrap).
- DEVE: `npm run typecheck:core` passes.
- DEVE: `npm run lint` produces no new errors.

---

## Exit Conditions (GDD/TDD)

- [ ] New protected method `forwardAndPipeSSE()` (or similar) added to `MitmHandlerBase`
      in `src/mitm/handlers/base.ts`, encapsulating the shared intercept flow.
- [ ] 5 Group-A handlers (codex, copilot, cursor, openCode, zed) reduced to delegate to
      the shared method with path `"/v1/chat/completions"`.
- [ ] 2 Group-B handlers (claudeCode, kiro) reduced to delegate with path `"/v1/messages"`.
- [ ] Antigravity handler preserved with its own `intercept()` override (may optionally
      call `forwardAndPipeSSE` for the tail after conversion, builder's discretion).
- [ ] Trae stub unchanged.
- [ ] All 10 existing MITM handler/base test files pass (9 concrete handler tests plus `mitm-handler-base.test.ts`; green-to-green).
- [ ] ≥2 new unit tests added for the shared method's happy path and error path.
- [ ] `npm run typecheck:core` passes without errors.
- [ ] `npm run lint` passes without new errors.
- [ ] Relevant tests pass (`node --import tsx/esm --test tests/unit/mitm-handler-*.test.ts`)
- [ ] Entrada no ledger `.changelog/` via manage-changelog + `rebuild.sh build`

---

## Details

### What

Subtasks:
- [ ] **Ler código existente**: Read `src/mitm/handlers/base.ts`, all 9 handler files
      (`antigravity.ts`, `claudeCode.ts`, `codex.ts`, `copilot.ts`, `cursor.ts`, `kiro.ts`,
      `openCode.ts`, `trae.ts`, `zed.ts`), `src/mitm/types.ts`,
      `tests/unit/_mitmHandlerHarness.ts`, and all 10 MITM handler/base tests (9 concrete handler tests plus `mitm-handler-base.test.ts`).
- [ ] **Design the shared method signature**: Add a protected method to `MitmHandlerBase`
      (in `base.ts`). Recommended signature:
      ```typescript
      protected async forwardAndPipeSSE(
        req: IncomingMessage,
        res: ServerResponse,
        body: Buffer,
        mappedModel: string,
        routerPath: string,
        opts?: { transformPayload?: (payload: unknown, req: IncomingMessage) => unknown },
      ): Promise<void>
      ```
      The method encapsulates: timing start → hookBufferStart → JSON parse → model rewrite
      → optional transformPayload hook → fetchRouter → upstream.ok check → pipeSSE with
      collected → hookBufferUpdate with timing → catch → hookBufferError + writeError.
- [ ] **Refactor Group A handlers** (codex, copilot, cursor, openCode, zed): Replace the
      `intercept()` body with a single call:
      ```typescript
      async intercept(req, res, body, mappedModel) {
        return this.forwardAndPipeSSE(req, res, body, mappedModel, "/v1/chat/completions");
      }
      ```
- [ ] **Refactor Group B handlers** (claudeCode, kiro): Same, with path `"/v1/messages"`.
- [ ] **Antigravity handler**: Either (a) keep the full `intercept()` override and call
      `forwardAndPipeSSE` only for the tail (passing the transformed payload via
      `transformPayload`), or (b) keep it standalone if the conversion logic makes the
      shared method awkward. Builder's design call — preserve all existing tests.
- [ ] **Add unit tests** for `forwardAndPipeSSE()` on the base class (via a test subclass
      in `mitm-handler-base.test.ts`).
- [ ] **Refactoring pass**: Verify simplified handlers are ≤10 lines each. Confirm no
      behavioral drift — same router path, same error handling, same hook calls.
- [ ] **Verificação de regressão**: Run all 10 MITM handler/base tests + lint + typecheck.

### Where

| Arquivo | Propósito |
|---------|-----------|
| `src/mitm/handlers/base.ts` | Modificar — add `forwardAndPipeSSE()` protected method |
| `src/mitm/handlers/codex.ts` | Modificar — simplify `intercept()` |
| `src/mitm/handlers/copilot.ts` | Modificar — simplify `intercept()` |
| `src/mitm/handlers/cursor.ts` | Modificar — simplify `intercept()` |
| `src/mitm/handlers/openCode.ts` | Modificar — simplify `intercept()` |
| `src/mitm/handlers/zed.ts` | Modificar — simplify `intercept()` |
| `src/mitm/handlers/claudeCode.ts` | Modificar — simplify `intercept()` |
| `src/mitm/handlers/kiro.ts` | Modificar — simplify `intercept()` |
| `src/mitm/handlers/antigravity.ts` | Ler or Modificar — builder decision for tail reuse |
| `src/mitm/handlers/trae.ts` | Ler — verify stub is unaffected |
| `src/mitm/types.ts` | Ler — `AgentId` type, `MitmHandlerBase` interface forward-ref |
| `tests/unit/_mitmHandlerHarness.ts` | Ler — shared test mock for `runHandler()` |
| `tests/unit/mitm-handler-base.test.ts` | Modificar — add `forwardAndPipeSSE()` tests |
| `tests/unit/mitm-handler-codex.test.ts` | Ler — must still pass |
| `tests/unit/mitm-handler-copilot.test.ts` | Ler — must still pass |
| `tests/unit/mitm-handler-cursor.test.ts` | Ler — must still pass |
| `tests/unit/mitm-handler-openCode.test.ts` | Ler — must still pass |
| `tests/unit/mitm-handler-zed.test.ts` | Ler — must still pass |
| `tests/unit/mitm-handler-claudeCode.test.ts` | Ler — must still pass |
| `tests/unit/mitm-handler-kiro.test.ts` | Ler — must still pass |
| `tests/unit/mitm-handler-antigravity.test.ts` | Ler — must still pass |
| `tests/unit/mitm-handler-trae.test.ts` | Ler — must still pass |

### How

1. Add `forwardAndPipeSSE()` to `MitmHandlerBase` in `base.ts`. The method contains the
   exact same 30-line block that currently lives in each handler, parameterized by
   `routerPath` and an optional `transformPayload` hook.
2. For Group A/B handlers: replace the `intercept()` body with a single delegation call.
   The class, `agentId`, doc comment, and imports remain per-handler (the per-handler
   file is still the registration unit via `MitmTarget.handler` dynamic import).
3. For Antigravity: the builder may either use `transformPayload` to inject the
   Gemini→OpenAI conversion before the shared flow, or keep the full override and call
   `forwardAndPipeSSE` only for the tail (after payload is already converted). Either
   approach is acceptable as long as all antigravity tests pass.
4. Write ≥2 new unit tests for the shared method (happy path and error path).
5. Run all 10 handler test files, lint, and typecheck as regression gate.

### Why

- **7×30 = ~210 lines of identical code** eliminated. Each new provider handler will no
  longer copy-paste the forwarding block — just provide `agentId` and `routerPath`.
- A bug in upstream-error handling, timing calculation, or hook invocation would currently
  need 7 identical patches. The shared method makes it a single fix point.
- The base class already provides all primitives (`fetchRouter`, `pipeSSE`, `hookBuffer*`,
  `writeError`, `now`). The only missing piece is the orchestration — there's zero
  architectural risk.
- Non-trivial handlers (Antigravity/future Trae) keep full `intercept()` control.

---

## Parallelism / file ownership

| Class | Detail |
|-------|--------|
| **parallel-safe** | No open/doing task touches `src/mitm/handlers/` or its tests. Safe to run in any wave. |
| **serializable** | — |
| **Collision** | `src/mitm/handlers/base.ts` — single writer. Unlikely to collide but flag if another MITM task opens. |

---

## ⛔ Anti-Hallucination Guardrails

> [!CAUTION]
> DO NOT add new provider-specific protocol logic inside the shared method. The shared
> method handles only the standard `JSON.parse → model rewrite → fetchRouter → pipeSSE →
> hookBuffer` flow. Provider-specific body transformation (e.g. Gemini→OpenAI) stays in
> the concrete handler's `intercept()` override or in the `transformPayload` callback.
> PORT 22000 = production — never docker-rm / mutate without explicit operator command.

> [!IMPORTANT]
> Read EVERY handler file and its test before modifying. Run all 10 handler tests after
> refactoring — not just the ones you changed. The test harness (`_mitmHandlerHarness.ts`)
> mocks `globalThis.fetch` globally; do not leave leaked mocks across test files.

---

## 🛡️ Compliance Checklist (Leis Primárias do AGENTS.md)

- [ ] **Doc Accuracy**: No new doc references added (internal refactor only)
- [ ] **Zod Validation**: No new inputs — handler interface unchanged
- [ ] **Security**: No secrets committed; error sanitization path preserved (writeError → safeErrorMessage)
- [ ] **Error Sanitization**: `writeError()` in base class unchanged — Hard Rule #12 compliance preserved
- [ ] **No Raw SQL**: N/A — no DB ops in MITM handlers
- [ ] **Archive Protocol**: No files deleted — handler files are simplified, not removed

---

## 📋 Completion Evidence (preenchido pelo agente executor)

- **Arquivos criados/modificados**: [lista com paths]
- **Testes que verificam o trabalho**: [nomes dos testes + arquivo]
- **Resultado dos testes**: [PASS/FAIL + contagem — output real, não claim]
- **Resultado do lint**: [PASS/FAIL]
- **Resultado do typecheck/build**: [PASS/FAIL]
- **Entrada no changelog**: [path under `.changelog/<entry>.md` + rebuild; never claim hand-edit of root `CHANGELOG.md`]
- **Agente executor**: [nome/role]
- **Data de conclusão**: [YYYY-MM-DD]

---

## 🔍 Review Trail (preenchido pelo reviewer)

> Agente DIFERENTE do executor revisa antes de mover para `04-completed/`.

- **Reviewer**: [nome/role]
- **Data da review**: [YYYY-MM-DD]
- **Veredito**: [APROVADO / REJEITADO]
- **Score (path to 100)**: [0-100]
- **Notas**: [evidence-based, citar arquivos/linhas]
- **Se REJEITADO**: mover para `02-doing/` com motivo documentado no topo.
