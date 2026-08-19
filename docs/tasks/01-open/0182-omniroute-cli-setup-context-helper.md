# Task 0182: Extract the OmniRoute CLI setup-context resolver

> **Status**: `[ ]` Open
> **Priority**: 🟢 P2
> **Type**: `remediation`
> **Origin**: Duplicate-block investigation — user-supplied `.agents/user/gitingest/detect-sameblocks.mjs` / `sameblocs.csv` group 1098, corroborated by live source inspection
> **Blocks**: None identified
> **Depends on**: None identified
> **Parallelism**: `parallel-safe` — reserve all listed setup command and helper/test paths; do not co-edit them with another CLI setup refactor
> **Review routing**: independent; route to CLI/runtime reviewer

---

## Objective

Extract one narrowly scoped, unit-testable helper for the repeated OmniRoute setup-target resolution contract used by `setup-continue`, `setup-crush`, `setup-cursor`, `setup-kilo`, `setup-qwen`, and `setup-roo`. The helper MUST preserve the current precedence and normalization behavior while leaving every tool's model selection, endpoint-shape contract, config schema, secret-reference policy, filesystem writes, prompts, output wording, and UI/manual setup steps in the command that owns them.

The concrete result is a shared resolver (for example `resolveSetupTarget({ remote, context, port, apiKey })`) plus thin command adapters or compatibility wrappers so the six existing exported `resolve*Target` functions and their callers/tests do not break. The task is complete only when duplicate resolver logic is removed from the six commands, focused tests prove equivalent behavior, and no production endpoint is contacted by the test suite.

## Background Context

### O que já existe:

- `bin/cli/commands/setup-continue.mjs:20-45` defines `ensureV1` and `resolveContinueTarget`.
- `bin/cli/commands/setup-crush.mjs:19-44` defines the same `ensureV1` plus `resolveCrushTarget`.
- `bin/cli/commands/setup-cursor.mjs:14-39` defines the same `ensureV1` plus `resolveCursorTarget`.
- `bin/cli/commands/setup-kilo.mjs:19-44` defines the same `ensureV1` plus `resolveKiloTarget`.
- `bin/cli/commands/setup-qwen.mjs:17-42` defines the same `ensureV1` plus `resolveQwenTarget`.
- `bin/cli/commands/setup-roo.mjs:20-45` defines the same `ensureV1` plus `resolveRooTarget`.
- Each resolver imports `resolveActiveContext` from `bin/cli/contexts.mjs`; that module documents the canonical context shape and the `accessToken`-before-legacy-`apiKey` preference.
- Existing focused tests provide direct contracts: `tests/unit/cli/setup-continue.test.ts`, `setup-crush.test.ts`, `setup-cursor.test.ts`, `setup-kilo.test.ts`, `setup-qwen.test.ts`, and `setup-roo.test.ts`.
- The live commands intentionally diverge after resolution: Continue/Cursor use an API base with `/v1`; Crush/Kilo/Qwen/Roo also use `/v1` but emit different client-specific property names and schemas. Other setup commands (`setup-aider`, `setup-cline`, `setup-goose`) use root URLs without `/v1` and are out of scope.

### O que está faltando / quebrado:

- The same remote/context/local fallback and API-key lookup block is maintained six times, creating drift risk when context schema, environment precedence, URL normalization, or default-port policy changes.
- The detector artifacts named by the origin report were not available in the current indexed/worktree surface during investigation, so the exact CSV group row and detector implementation could not be independently re-read. The duplication claim is nevertheless directly verified by the six live source copies and their matching test seams; do not add detector artifacts to this task.
- No existing `docs/tasks/01-open` task or searched report covers this resolver extraction; the reserved filename was unused at task creation.

---

## Test Requirements

- The shared resolver MUST prefer explicit `remote` over context and local fallback, and MUST not call or mutate any production service.
- With no `remote`, the resolver MUST use `resolveActiveContext(context ?? process.env.OMNIROUTE_CONTEXT)?.baseUrl` when available; a missing/throwing context MUST fall back without throwing.
- With no remote/context URL, the resolver MUST preserve the current local fallback `http://localhost:${Number(port ?? process.env.PORT ?? 20128) || 20128}`.
- Explicit `apiKey` (including Commander-compatible `api-key`) MUST win over context credentials; context `accessToken` MUST win over legacy context `apiKey`; the environment fallback MUST remain `OMNIROUTE_API_KEY` and the empty-string fallback MUST remain safe.
- The shared URL result MUST preserve the current `/v1` normalization for the six in-scope commands, including a trailing slash and an already-present `/v1`.
- Existing `resolveContinueTarget`, `resolveCrushTarget`, `resolveCursorTarget`, `resolveKiloTarget`, `resolveQwenTarget`, and `resolveRooTarget` imports MUST retain their current return property names (`apiBase` or `baseUrl`) and observable values.
- Tests MUST prove that the helper never serializes, logs, or writes an API-key value; test fixtures may use non-secret sentinel strings only.
- Existing per-command builder/config tests MUST remain green, proving the extraction does not absorb tool-specific setup steps or alter client-specific behavior.

---

## Exit Conditions (GDD/TDD)

- [ ] A shared resolver module exists under `bin/cli/` with documented input precedence, output contract, URL normalization, and error-tolerant context lookup.
- [ ] All six in-scope command resolvers delegate to the shared helper; duplicated resolver bodies and local `ensureV1` copies are removed or reduced to explicit compatibility adapters.
- [ ] Focused resolver tests cover remote, context, local port/env fallback, `/v1` normalization, explicit-key precedence, context-token precedence, legacy-key fallback, and context errors.
- [ ] Existing setup tests pass: `node --import tsx/esm --test tests/unit/cli/setup-continue.test.ts tests/unit/cli/setup-crush.test.ts tests/unit/cli/setup-cursor.test.ts tests/unit/cli/setup-kilo.test.ts tests/unit/cli/setup-qwen.test.ts tests/unit/cli/setup-roo.test.ts`.
- [ ] No test or implementation step contacts a live OmniRoute instance, mutates port `21000`, or writes a credential-bearing fixture.
- [ ] `npm run typecheck:core` passes without new errors.
- [ ] `npm run lint` passes without new errors.
- [ ] Relevant unit tests pass with real command output recorded in Completion Evidence.
- [ ] An append-only `.changelog/` entry is created through the repository changelog workflow and `rebuild.sh build` is run; generated tasklist/changelog/EPIC/dependency-tree surfaces are not hand-edited.

---

## Details

### What

Subtasks:

- [ ] **Ler código existente**: Read `bin/cli/contexts.mjs`, all six in-scope setup commands, their six focused tests, and neighboring `setup-aider.mjs`, `setup-cline.mjs`, `setup-goose.mjs` before modifying anything.
- [ ] Define the shared resolver contract and compatibility mapping without changing the root-vs-`/v1` behavior of out-of-scope commands.
- [ ] Implement the helper and migrate the six command-local resolvers while preserving their exported names and return shapes.
- [ ] Add deterministic unit tests for precedence, fallback, normalization, and context-error behavior; use sentinel values only.
- [ ] **Refactoring pass**: Confirm the helper owns only target resolution; keep model fetching, model categorisation, prompting, config merging, file writes, secret references, placeholders, and manual instructions in each command.
- [ ] **Verificação de regressão**: Run the focused Node test command, `npm run typecheck:core`, and `npm run lint`; record actual results.

### Where

| Arquivo | Propósito |
|---------|-----------|
| `bin/cli/contexts.mjs` | Read-only context contract and credential precedence source |
| `bin/cli/setup-context.mjs` (new, proposed) | Shared target resolution helper; choose a name that does not collide with existing CLI modules |
| `bin/cli/commands/setup-continue.mjs` | Delegate `resolveContinueTarget`; preserve `apiBase` and Continue-specific behavior |
| `bin/cli/commands/setup-crush.mjs` | Delegate `resolveCrushTarget`; preserve `baseUrl` and Crush provider schema |
| `bin/cli/commands/setup-cursor.mjs` | Delegate `resolveCursorTarget`; preserve manual Cursor-only setup |
| `bin/cli/commands/setup-kilo.mjs` | Delegate `resolveKiloTarget`; preserve CLI auth and VS Code settings writes |
| `bin/cli/commands/setup-qwen.mjs` | Delegate `resolveQwenTarget`; preserve Qwen provider settings and prompt behavior |
| `bin/cli/commands/setup-roo.mjs` | Delegate `resolveRooTarget`; preserve Roo import and auto-import behavior |
| `tests/unit/cli/setup-context.test.ts` (new, proposed) | Shared resolver contract tests; no network or filesystem writes |
| `tests/unit/cli/setup-continue.test.ts` | Compatibility and Continue-specific regression coverage |
| `tests/unit/cli/setup-crush.test.ts` | Compatibility and Crush-specific regression coverage |
| `tests/unit/cli/setup-cursor.test.ts` | Compatibility and Cursor-specific regression coverage |
| `tests/unit/cli/setup-kilo.test.ts` | Compatibility and Kilo-specific regression coverage |
| `tests/unit/cli/setup-qwen.test.ts` | Compatibility and Qwen-specific regression coverage |
| `tests/unit/cli/setup-roo.test.ts` | Compatibility and Roo-specific regression coverage |
| `.changelog/<entry>.md` | Required append-only task ledger entry, created through the supported workflow |

### How

1. Read the listed source and tests, then capture the current resolver return shapes as compatibility contracts.
2. Implement one pure-ish resolver around `resolveActiveContext`: explicit remote, then named/active context, then local port fallback; separately resolve explicit key, context `accessToken`, context legacy `apiKey`, and environment key.
3. Return canonical values sufficient for adapters, preferably a normalized root and `/v1` URL plus the resolved key, while ensuring the helper does not choose a client schema or write secrets.
4. Keep six thin exported adapters if their existing property names differ; Continue may map the canonical `/v1` value to `apiBase`, while the other five map it to `baseUrl`.
5. Add tests for each precedence branch, malformed/missing context, trailing slash, existing `/v1`, `PORT`, explicit `port`, and empty-key fallback. Do not invoke `fetch`, write files, use real API keys, or use production ports.
6. Run only the focused setup tests first, then the required typecheck and lint. Do not run broad suites unless a reviewer later expands scope.

### Why

Six commands currently carry equivalent infrastructure resolution logic while their meaningful differences begin after that boundary. Centralizing only the common contract reduces future drift and makes context/credential precedence changes reviewable in one place, without pretending that Continue, Crush, Cursor, Kilo, Qwen, and Roo have interchangeable setup semantics. Not extracting model/config/UI behavior avoids a larger, riskier abstraction and preserves each tool's documented compatibility behavior.

---

## Parallelism / file ownership

| Class | Detail |
|-------|--------|
| **parallel-safe** | Documentation-only work and unrelated CLI commands may proceed in parallel. Test-only review may proceed after the helper contract is agreed. |
| **serializable** | The helper contract must be agreed before migrating the six command adapters; focused tests must pass before any optional cleanup. |
| **Collision** | `bin/cli/setup-context.mjs`, all six `bin/cli/commands/setup-*.mjs` listed above, and all six setup tests plus the new shared test must not be edited by parallel agents. Do not modify `bin/cli/contexts.mjs` unless the existing contract is demonstrably insufficient. |

---

## ⛔ Anti-Hallucination Guardrails

> [!CAUTION]
> Do not claim to have independently read `.agents/user/gitingest/sameblocs.csv` or `detect-sameblocks.mjs` unless those artifacts are present and readable in the active worktree. Do not invent detector line numbers or duplicate counts. Do not use or write real API keys, secrets, credential-bearing fixtures, or production port `21000`. Do not run implementation or broad test suites as part of task creation.

> [!IMPORTANT]
> Read every file in the `Where` table before changing product code. Preserve the existing context schema and all six exported resolver APIs. Treat each client-specific base URL convention and secret-reference behavior as an externally observable compatibility constraint.

---

## 🛡️ Compliance Checklist (Leis Primárias do AGENTS.md)

- [ ] **Doc Accuracy**: All paths, exported symbols, endpoint conventions, and environment names are verified against live source before implementation.
- [ ] **Zod Validation**: N/A for this internal resolver unless new untrusted CLI validation is introduced; explain any deviation in review.
- [ ] **Security**: No secret or credential is committed; resolver tests use sentinel values only and helper output is never written to task files.
- [ ] **Error Sanitization**: Preserve current context-error swallowing and do not expose key values in errors or logs.
- [ ] **No Raw SQL**: N/A; this task has no database changes.
- [ ] **Archive Protocol**: No files are deleted; duplicated code is replaced in-place by delegation, not archived task assets.

---

## 📋 Completion Evidence (preenchido pelo agente executor)

- **Arquivos criados/modificados**: [executor fills with exact paths]
- **Testes que verificam o trabalho**: [executor fills with test names and paths]
- **Resultado dos testes**: [executor fills with real PASS/FAIL output and counts]
- **Resultado do lint**: [executor fills with real PASS/FAIL output]
- **Resultado do typecheck/build**: [executor fills with real PASS/FAIL output]
- **Entrada no changelog**: [executor fills with `.changelog/<entry>.md` path and rebuild output]
- **Agente executor**: [executor fills]
- **Data de conclusão**: [executor fills `YYYY-MM-DD`]

---

## 🔍 Review Trail (preenchido pelo reviewer)

- **Reviewer**: [reviewer fills]
- **Data da review**: [reviewer fills `YYYY-MM-DD`]
- **Veredito**: [APROVADO / REJEITADO]
- **Score (path to 100)**: [reviewer fills]
- **Notas**: [reviewer fills with evidence-based findings and exact paths/lines]
- **Se REJEITADO**: move to `02-doing/` with the reason documented at the top.
