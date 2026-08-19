# Task 0186: Grok CLI — default reasoning effort high for every model

> **Status**: `[ ]` Open
> **Priority**: 🔴 P1
> **Type**: `hardening`
> **Origin**: Operator request (2026-08-18): without an explicit reasoning effort, Grok 4.6 behaves "mongol demais" (sub-par quality); the existing Grok 4.5 default of `high` must be generalized so **every** grok-cli model without an explicit effort is sent with `reasoning: { effort: "high" }`.
> **Blocks**: —
> **Depends on**: Task 0160 (grok-cli provider compatibility) as the boundary-contract baseline; Task 0176 (alias normalization) as landed precedent for executor-boundary testing.
> **Parallelism**: `serializable` with any Grok registry/executor change; must not overlap the next 0160 review round on `open-sse/executors/grok-cli.ts`.
> **Review routing**: independent + provider/runtime + reasoning-contract review

---

## Objective

Generalize the existing Grok 4.5 default-effort behavior in
`normalizeGrokBuildReasoning` so that **every** grok-cli model with
`supportsReasoning: true` is dispatched with `reasoning: { effort: "high" }`
when the client did not set an explicit effort.

Current behavior (`open-sse/executors/grok-cli.ts:208-223`):

- `grok-4.5` without an explicit `effort` → `effort: "high"` is injected.
- `grok-4.6` without an explicit `effort` → **nothing** is injected and the
  entire `reasoning` field is removed, so the upstream's own (non-max) default
  applies.
- `grok-composer-2.5-fast` → effort always removed (`supportsReasoning: false`).

Target behavior:

- Every non-composer grok-cli model (today: `grok-4.5`, `grok-4.6`; future
  models inherited by rule) without an explicit `effort` receives
  `effort: "high"`.
- An explicit effort (`low | medium | high`) is preserved exactly.
- An explicit but unsupported effort (`max`, `xhigh`, anything outside the
  supported set) remains dropped (client chose a value the provider cannot
  honor; do NOT silently upgrade an explicit choice to high).
- `grok-composer-2.5-fast` remains effort-free.
- A request with no `reasoning` object at all matches the semantics of "no
  explicit effort" and receives `reasoning: { effort: "high" }` for
  non-composer models (mirroring what today's 4.5 branch already does).

## Background Context

### O que já existe:

- `GROK_BUILD_SUPPORTED_REASONING_EFFORTS = new Set(["low", "medium", "high"])`
  (`grok-cli.ts:29`) — the executor's accepted effort values.
- `GROK_BUILD_DEFAULT_REASONING_EFFORT = "high"` (`open-sse/config/grokBuild.ts:13`).
- `normalizeGrokBuildReasoning(value, model)` (`grok-cli.ts:208-223`):
  - captures `hasExplicitEffort` BEFORE any deletion (order-safe);
  - deletes unsupported efforts;
  - removes effort for `grok-composer-2.5-fast`;
  - injects the default only for `grok-4.5 && !hasExplicitEffort`;
  - returns `null` when the resulting object is empty (caller then deletes
    `transformed.reasoning` at `grok-cli.ts:442-447`).
- The Grok registry marks `grok-4.5` and `grok-4.6` with
  `supportsReasoning: true` and Composer with `supportsReasoning: false`
  (`open-sse/config/providers/registry/grok-cli/index.ts:14-46`).
- Task 0160 landed the executor-boundary contract tests
  (`tests/unit/grok-cli-provider-compatibility.test.ts`) and Task 0176 landed
  `tests/unit/provider-alias-normalization.boundary.test.ts` (9 rows) — the
  precedent for asserting the upstream-observable payload.

### O que está faltando / quebrado:

- `grok-4.6` and any future non-composer model do not inherit the `high`
  default that 4.5 already has, causing the operator-observed "dumb" behavior
  when no effort is supplied.
- No regression test asserts the default-effort injection for `grok-4.6`
  (or for a generic future model) at the executor boundary.
- No regression test asserts that an explicit-but-unsupported effort (`max` /
  `xhigh`) is dropped WITHOUT being upgraded to `high`.

## Test Requirements

- In the executor's mocked dispatch boundary (`handleSingleModel`-style or the
  compatibility test's fetch capture), assert the **upstream-observable body**:
  - `grok-4.6`, no `reasoning` in request → upstream body contains
    `reasoning: { effort: "high" }` and the model id is `grok-4.6`.
  - `grok-4.5`, no `reasoning` → unchanged regression: effort `high` still
    injected.
  - `grok-4.6` with `reasoning: { effort: "low" | "medium" | "high" }` →
    preserved exactly (no rewrite).
  - `grok-4.6` with `reasoning: { effort: "max" }` and `"xhigh"` →
    effort removed, entire `reasoning` dropped, `high` NOT substituted.
  - `grok-composer-2.5-fast` with no effort → no `reasoning` at all.
  - A request with `reasoning_effort: "high"` (snake, Chat shape) remains
    stripped by `GROK_BUILD_UNSUPPORTED_PARAMS` exactly as today — the default
    injection does not resurrect it (documented behavior, not a regression).
- Existing Task 0160 compatibility tests, Task 0149 Responses/tool-call tests,
  and the 0176 boundary matrix MUST remain green.
- No live request to `:22000`; deterministic mocks only.

## Exit Conditions (GDD/TDD)

- [ ] Read `normalizeGrokBuildReasoning`, the grok-cli registry, and the
  existing grok-cli/grok-build test files before edits.
- [ ] Write RED tests for each row in Test Requirements above (grok-4.6 default,
  4.5 regression, explicit preservation, explicit-unsupported drop, composer
  exclusion) before implementing.
- [ ] Implement the smallest change: extend the default-injection guard from
  `model === "grok-4.5"` to every non-composer model when `!hasExplicitEffort`,
  keeping the unsupported-effort deletion and the composer branch intact.
- [ ] GREEN tests pass with 0 failures under the native runner.
- [ ] Task 0160/0149/0176-related regression tests pass with 0 failures.
- [ ] `npm run typecheck:core` passes without errors.
- [ ] `npm run lint` passes without new errors.
- [ ] Hard Rule #18 satisfied by fail→pass TDD evidence.
- [ ] A real `.changelog/` entry is created via manage-changelog and the
  generated changelog validates.
- [ ] Completion Evidence records exact commands, counts, changed paths, and any
  residual risk (e.g. whether upstream `cli-chat-proxy` accepts `high` for
  every model — mocked evidence only).

## Details

### What

Subtasks:

- [ ] **Ler existentes**: read `open-sse/executors/grok-cli.ts`,
  `open-sse/config/grokBuild.ts`,
  `open-sse/config/providers/registry/grok-cli/index.ts`,
  `tests/unit/grok-cli-provider-compatibility.test.ts`,
  `tests/unit/grok-cli-strip-params.test.ts`, and the 0176 boundary test.
- [ ] Reproduce current 4.6 behavior at the executor boundary with a RED test.
- [ ] Implement the generalized default in `normalizeGrokBuildReasoning`.
- [ ] Add/extend the table-driven executor-boundary assertions.
- [ ] **Refactoring pass**: keep the supported-effort set and the composer
  exclusion explicit; do not move the decision into the registry unless the
  registry already owns `supportsReasoning` semantics (it does today).
- [ ] **Verificação de regressão**: focused tests, grok regressions, typecheck,
  scoped lint.

### Where

| Arquivo | Propósito |
|---------|-----------|
| `open-sse/executors/grok-cli.ts` | Modify `normalizeGrokBuildReasoning` default-effort guard (lines 208-223). |
| `open-sse/config/grokBuild.ts` | Read-only — `GROK_BUILD_DEFAULT_REASONING_EFFORT` already `"high"`. |
| `open-sse/config/providers/registry/grok-cli/index.ts` | Read-only — `supportsReasoning` flags per model. |
| `tests/unit/grok-cli-provider-compatibility.test.ts` | Extend with default-effort rows (owned by Task 0160 scope; coordinate). |
| `tests/unit/grok-cli-strip-params.test.ts` | Read/regression — snake `reasoning_effort` stripping must not change. |
| `tests/unit/grok-cli-reasoning-effort-default.test.ts` | Create focused TDD matrix if an existing grok-cli test file is not the canonical owner. |
| `tests/unit/provider-alias-normalization.boundary.test.ts` | Read-only — 0176 contract precedent. |

### How

1. Confirm the current 4.6 no-effort dispatch drops `reasoning`
   (`normalizeGrokBuildReasoning` → null → `delete transformed.reasoning`).
2. Write the RED executor-boundary rows (assert upstream body from the fetch
   capture).
3. Change the guard: `else if (!hasExplicitEffort)` after the composer branch
   (the 4.5-only condition is removed; everything else stays identical).
4. Run focused tests, then the grok-cli/grok-build regression set.

### Why

The 4.5 default exists because the operator's workload depends on the highest
reasoning tier; the same operator expectation applies to 4.6 and to any future
non-composer grok-cli model. Generalizing the guard is a 1-line behavioral
extension with a table-driven boundary contract — small, testable, and aligned
with the executor's existing "supported set + default constant" design. It does
not touch model identity, passthrough, aliases, or OAuth.

## Parallelism / file ownership

| Class | Detail |
|-------|--------|
| **serializable** | Owns `normalizeGrokBuildReasoning` and grok-cli test rows; must not overlap the next 0160 review round or any other `grok-cli.ts` editor. |
| **parallel-safe** | Unrelated provider, UI, and test-governance work only. |
| **Collision** | `open-sse/executors/grok-cli.ts`, `tests/unit/grok-cli-*.test.ts`, `tests/unit/provider-alias-normalization.boundary.test.ts` (read-only). |

## ⛔ Anti-Hallucination Guardrails

> [!CAUTION]
> Do NOT upgrade an explicit-but-unsupported effort (`max`/`xhigh`) to `high`.
> Do NOT add a `grok-4.6-high` model alias — effort is a body field, not a
> model id. Do NOT claim live upstream acceptance without a probe; mocked
> boundary evidence is the task's proof.

> [!IMPORTANT]
> `hasExplicitEffort` must keep being captured BEFORE the unsupported-value
> deletion, or an explicit invalid value would be silently upgraded. Keep the
> composer exclusion intact and preserve the snake `reasoning_effort` stripping.

## 🛡️ Compliance Checklist (Leis Primárias do AGENTS.md)

- [x] **Doc Accuracy**: every symbol/line/command cited was verified against source.
- [x] **TDD**: failing default-effort rows precede the implementation change.
- [x] **Error Sanitization**: no raw upstream body is emitted; mock-only evidence.
- [x] **Test Boundary**: assertions observe the upstream-usable request body, not a helper.
- [x] **Production Safety**: no `:22000` request; deterministic mocks only.
- [x] **Archive Protocol**: no deletion; existing tests preserved.

## 📋 Completion Evidence (preenchido pelo agente executor)

- **Arquivos criados/modificados**:
  - `open-sse/executors/grok-cli.ts` (generalized default reasoning guard in `normalizeGrokBuildReasoning`)
  - `tests/unit/grok-cli-reasoning-effort-default.test.ts` (created TDD matrix)
  - `.changelog/20260819-044200-0186-grok-cli-reasoning-high-default-builder-engineer.md`
- **RED/GREEN default-effort rows**: RED 4 pass / 2 fail → GREEN 6 pass / 0 fail (`node --import tsx/esm --test tests/unit/grok-cli-reasoning-effort-default.test.ts`)
- **4.5 regression + explicit-preservation + explicit-unsupported-drop rows**: 40/40 PASS across `grok-cli-reasoning-effort-default`, `grok-cli-provider-compatibility`, `grok-cli-strip-params`, `provider-alias-normalization.boundary`
- **Resultado do lint**: PASS (0 errors via eslint)
- **Resultado do typecheck:core**: PASS (`npm run typecheck:core` 0 errors)
- **Changelog entry**: `.changelog/20260819-044200-0186-grok-cli-reasoning-high-default-builder-engineer.md` + `rebuild.sh build`
- **Agente executor**: `gt-ts-engineer`
- **Data de conclusão**: 2026-08-19

## 🔍 Review Trail (preenchido pelo reviewer)

- **Reviewer**: [nome/role]
- **Data da review**: [YYYY-MM-DD]
- **Veredito**: [APROVADO / REJEITADO]
- **Score (path to 100)**: [0-100]
- **Notas**: [evidence-based, citar arquivos/linhas]
- **Se REJEITADO**: mover para `02-doing/` com motivo documentado no topo.