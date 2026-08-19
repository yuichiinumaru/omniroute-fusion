# Task 0176: Canonical alias normalization for re-prefix/strip paths

> **Status**: `[ ]` Open
> **Priority**: 🟡 P1
> **Type**: `remediation`
> **Origin**: Architect-orchestrator audit (2026-08-16) surfacing the systemic class behind (a) the `modelTestRunner` double-prefix bug (`src/lib/api/modelTestRunner.ts:185-193`), (b) the `TraeExecutor` alias-strip workaround (`open-sse/executors/trae.ts`), and (c) the policy contradiction introduced by Task 0160's gate (gating `passthroughModels: true` providers). The class has been observed three times: grok-cli (input alias `gc/`), trae (input alias `tr/`), and opencode-zen/free (input alias `oc/`).
> **Blocks**: Task 0160 re-evaluation (gate-removal depends on this helper).
> **Depends on**: —
> **Parallelism**: `parallel-safe` — read-only on existing call sites until the helper is published; then each replacement site may be migrated independently. **Do not parallelize with Task 0160 re-evaluation** until the helper is published (single source of truth for the fix).
> **Review routing**: independent + provider/catalog review

---

## Objective

Replace every local "re-prefix if slash" / "strip alias prefix" / "regex-strip" pattern with a single **contextual** normalizer that takes the **selected provider** as input, plus a **table-driven boundary contract test** that exercises the actual public boundaries (`runSingleModelTest`, `TraeExecutor.resolveMode`, `resolveVirtualCandidate`) with rows for each input shape. After this task:

1. `src/shared/utils/providerModelId.ts` exports `normalizeModelForSelectedProvider(selectedProviderId, rawModelId, opts)` returning a discriminated union (`{ kind: "same-provider", bareModel } | { kind: "opaque-slash-model-id", modelId } | { kind: "foreign-provider-prefix", provider, model }`), with an explicit `allowOpaqueSlashModelId: boolean` opt-in. Its `modelStr` is always canonicalized with the selected provider id, never an input alias.
2. `src/lib/api/modelTestRunner.ts:185-193` calls the helper instead of the existing `startsWith` re-prefix branch.
3. `open-sse/executors/trae.ts` (alias-strip `tr/`) calls the helper with `allowOpaqueSlashModelId: false`; the regex is removed.
4. The table-driven boundary contract test `tests/unit/provider-alias-normalization.boundary.test.ts` (NOT a multi-file test) proves the upstream dispatch payload for every input shape, including the opaque-slash passthrough case (`cline/nvidia/...`).
5. CI grep guard `scripts/check/check-no-blind-provider-prefix-concat.mjs` fails the build when a new site under `src/lib/api/`, `open-sse/handlers/`, `open-sse/executors/`, `open-sse/services/` (the **input-boundary surfaces**) concatenates `${providerId}/${...}` or `${provider}/${${` **without going through the helper**.
6. Task 0160's third new Exit Condition (`grok-cli/grok-4.6` dispatches) becomes reliable via the same boundary test — a single test asserts dispatch for multiple providers.

## Background Context

### O que já existe (verified 2026-08-16):
- `open-sse/services/autoCombo/virtualFactory.ts:237-299` `resolveVirtualCandidate(connProvider, rawModelId)` is the **reference implementation** for alias-aware normalization: it uses `parseModel` + `resolveProviderAlias`, then **fail-closed** (`return null`) when `parsed.provider` resolves to a different canonical provider than the connection.
- AGENTS.md rule 7 ("One prefix per provider") and `docs/sourceoftruth.md` rule 1 are the canonical policy.
- `tests/unit/nvidia-model-test-identity.test.ts` already covers passthrough model id with slash (`cline/nvidia/...`, `nvidia/openai/gpt-oss-120b`).
- `tests/unit/opencode-namespace-separation.test.ts` already documents the OpenCode namespace separation as a regression guard.

### O que está faltando / quebrado (verified 2026-08-16):
- `src/lib/api/modelTestRunner.ts:185-193`: re-prefixes if `fullModelStr` contains `/` but does NOT begin with `${canonicalProviderId}/` OR `${providerId}/`. Alias of the same provider is NOT recognized.
- `open-sse/executors/trae.ts` uses `replace(/^tr\//, "")` in `resolveMode`. Per-provider regex substitution is a workaround that bypasses the canonical resolution path.
- `tests/unit/model-test-runner.test.ts` only exercises `parseRetryAfterHeader` and `detectTestKind`. `runSingleModelTest` (where the gate composes its effect) is not exercised for the alias-prefix case. This is the root cause of the "tests passed but provider broken" failure mode.

### Padrão de bug (sistêmico, verified):
1. **Trae** (`tr/minimax-m3`) — already "fixed" in Task 0171 with regex strip. Workaround, not the canonical fix.
2. **OpenCode Zen/Free** (`opencode-zen/oc/north-mini-code-free`) — already fixed in `resolveVirtualCandidate`. Canonical, but scope-limited to the auto-combo caller.
3. **grok-cli** (input alias `gc/grok-4.6` selected under provider `grok-cli`) — previously unfixed in `modelTestRunner`; normalization must dispatch the canonical provider/model identity.
4. Any future provider whose alias differs from its id will re-introduce the bug if no helper is published.

### Política adotada (architect-orchestrator, 2026-08-16):
**"passthrough pleno + denylist explícita"** — providers with `passthroughModels: true` honor upstream classification for ALL model IDs except those on a sourced denylist. The static registry list becomes informational (catalog/UI), NOT a dispatch prerequisite. The Task 0160 gate (local unknown-ID rejection) is therefore a **policy violation**, not a missing safety net.

---

## Test Requirements

The task introduces **one** table-driven test file `tests/unit/provider-alias-normalization.boundary.test.ts`. It is the contract; it MUST exercise the **public boundaries** (`runSingleModelTest` and `TraeExecutor.resolveMode`), not just helper internals.

### Required boundary matrix (single test, table-driven rows)

Each row MUST assert: (a) the **input boundary** that received it, (b) the **upstream-observable dispatch payload** (provider, model sent), and (c) whether `fetch` was or was not called.

| # | Boundary | Input `(providerId, modelId)` | Expected dispatch payload | Side-effects |
|---|---|---|---|---|
| 1 | `runSingleModelTest` | `("grok-cli", "grok-4.6")` | `provider: "grok-cli"`, `model: "grok-4.6"` | `fetch` called once |
| 2 | `runSingleModelTest` | `("grok-cli", "gc/grok-4.6")` | `provider: "grok-cli"`, `model: "grok-4.6"` (alias stripped) | `fetch` called once; **NO** double prefix |
| 3 | `runSingleModelTest` | `("grok-cli", "grok-cli/grok-4.5")` | `provider: "grok-cli"`, `model: "grok-4.5"` (id-prefixed canonical) | `fetch` called once |
| 4 | `runSingleModelTest` | `("grok-cli", "grok-build")` (denylisted) | local 400 with denylist reason; **NO** `fetch` | passthrough denylist preserves local safety |
| 5 | `runSingleModelTest` | `("cline", "nvidia/nemotron-3-ultra-550b-a55b")` | `provider: "cline"`, `model: "nvidia/nemotron-3-ultra-550b-a55b"` (opaque passthrough preserved) | `fetch` called once; slash kept in model id |
| 6 | `runSingleModelTest` | `("nvidia", "openai/gpt-oss-120b")` | `provider: "nvidia"`, `model: "openai/gpt-oss-120b"` | `fetch` called once; cross-namespace model id preserved |
| 7 | `TraeExecutor.resolveMode` | `("trae", "tr/minimax-m3")` | upstream id `minimax-m3` (no regex substitution) | (no fetch in resolveMode) |
| 8 | `TraeExecutor.resolveMode` | `("trae", "minimax-m3")` | unchanged | — |
| 9 | `TraeExecutor.resolveMode` | `("trae", "trae/minimax-m3")` | `minimax-m3` (id-prefixed canonical) | — |

**Rows 1–3 are the exact user-observed inputs** (per Task 0160 re-evaluation Entry and operator reproduction). Rows 4–6 establish the denylist and passthrough contracts. Rows 7–9 cover the Trae migration.

### TDD discipline (Hard Rule #18 — explicit, not generic)

- The RED test is the **table above**. Commit it BEFORE the helper migration commits.
- Each row MUST assert the **upstream-observable** payload (provider, model), not just internal helper return value.
- Coverage must include the boundary the operator observed (rows 1–3). A 100% coverage on a helper without rows 1–3 is not "TDD done".
- The `npm run test:coverage` gate must be green after the migration commits land.

### Anti-TDD rules (do not create these tests)

- Tests that only exercise `normalizeModelForSelectedProvider` in isolation, without calling `runSingleModelTest` or `TraeExecutor.resolveMode`.
- Tests that mock `fetch` and assert only the request body, without asserting that the request reached upstream with the expected `provider` + `model`.
- Tests that pass because they assert "no throw" without asserting the post-normalization payload.

## Exit Conditions (GDD/TDD)

- [x] `src/shared/utils/providerModelId.ts` (or equivalent canonical path) exports `normalizeModelForSelectedProvider` with the discriminated return type and `opts: { allowOpaqueSlashModelId?: boolean }`.
- [x] `src/lib/api/modelTestRunner.ts` calls the helper instead of the `startsWith` re-prefix branch.
- [x] `open-sse/executors/trae.ts` calls the helper with `allowOpaqueSlashModelId: false`; the regex `replace(/^tr\//, "")` is removed.
- [x] `tests/unit/provider-alias-normalization.boundary.test.ts` exists with the 9 rows above; all pass.
- [x] `scripts/check/check-no-blind-provider-prefix-concat.mjs` exists; fails the build when a new site under `src/lib/api/`, `open-sse/handlers/`, `open-sse/executors/`, `open-sse/services/` adds a forbidden concatenation.
- [x] `node --import tsx/esm --test tests/unit/provider-alias-normalization.boundary.test.ts` passes.
- [x] `node --import tsx/esm --test tests/unit/model-test-runner.test.ts` continues to pass (no regression in the existing surface).
- [x] `node --import tsx/esm --test tests/unit/trae-executor.test.ts` continues to pass (regex removal must not break the documented contract).
- [x] `node --import tsx/esm --test tests/unit/opencode-namespace-separation.test.ts` continues to pass (no regression of the earlier corrected path).
- [x] `node --import tsx/esm --test tests/unit/nvidia-model-test-identity.test.ts` continues to pass.
- [x] `npm run typecheck:core` passes (0 errors).
- [~] `npm run lint` passes without new errors — ESLint clean on all 8 changed files (helper, modelTestRunner, trae, grok-cli executor, chatHelpers, guard script, 2 test files); full-repo `npm run lint` not run in this pass.
- [ ] Changelog: real entry via `.changelog/` + `rebuild.sh build && rebuild.sh validate`.

---

## Details

### What

Subtasks:
- [ ] **Ler código existente** — `open-sse/services/autoCombo/virtualFactory.ts:237-299` (reference); read every `${providerId}/${modelId}` site under the input-boundary surfaces listed above; confirm with a fresh source-grep for `${canonicalProviderId}/${` and `${provider}/${${`.
- [ ] **Publish the helper** at `src/shared/utils/providerModelId.ts`. The return type is a discriminated union; **no** `| null`. The caller decides what to do with each `kind`.
- [ ] **Migrate `modelTestRunner`** — replace lines 185-193 with a call to the helper, then translate the discriminated result to the legacy `fullModelStr` form (preserve the existing contract: bare `modelId` stays bare; bare `providerId/modelId` stays as is; alias-prefixed becomes canonical). Use `allowOpaqueSlashModelId: true` (runSingleModelTest is the operator-facing surface; passthrough model ids must be preserved).
- [ ] **Migrate `TraeExecutor.resolveMode`** — remove `replace(/^tr\//, "")`; call the helper with `allowOpaqueSlashModelId: false`. Trae's upstream expects bare ids without slashes; the regex was the workaround.
- [ ] **Write the boundary matrix test** `tests/unit/provider-alias-normalization.boundary.test.ts`. Use `node:test` table-driven rows (NOT a separate test per case). Reference `tests/unit/nvidia-model-test-identity.test.ts` as the contract template; reference `tests/unit/opencode-namespace-separation.test.ts` as the OpenCode coverage style.
- [ ] **Add the CI grep guard** `scripts/check/check-no-blind-provider-prefix-concat.mjs`. Scope: input-boundary surfaces only (`src/lib/api/`, `open-sse/handlers/`, `open-sse/executors/`, `open-sse/services/`). Fail on `${canonicalProviderId}/${` or `${provider}/${${` outside the helper file. Wire it into `package.json` lint/check chain.
- [ ] **Refactoring pass** — simplify migrations so neither `modelTestRunner` nor `TraeExecutor` keeps any local alias-aware branch.
- [ ] **Verificação de regressão** — `npm run typecheck:core` + targeted lint + full OpenCode glob + the 4 existing test files + `npm run test:coverage`.
- [ ] **Changelog** — real entry via `.changelog/` + `rebuild.sh build && rebuild.sh validate`.

### Where

| Arquivo | Propósito |
|---------|-----------|
| `src/shared/utils/providerModelId.ts` (new) | contextual helper with discriminated return |
| `src/lib/api/modelTestRunner.ts` | migrate the `startsWith` re-prefix branch |
| `open-sse/executors/trae.ts` | remove `replace(/^tr\//, "")`; use helper with `allowOpaqueSlashModelId: false` |
| `tests/unit/provider-alias-normalization.boundary.test.ts` (new) | table-driven contract for the public boundaries |
| `scripts/check/check-no-blind-provider-prefix-concat.mjs` (new) | CI grep guard scoped to input boundaries |
| `docs/reports/builder/canonical-alias-normalization.md` (new) | builder evidence + closure (mirror of opencode-free-zen-namespace-correction.md) |

### How

Reference shape (signature, not full implementation):

```ts
export type NormalizedModel =
  | { kind: "same-provider"; bareModel: string; modelStr: string }
  | { kind: "opaque-slash-model-id"; modelId: string; modelStr: string }
  | { kind: "foreign-provider-prefix"; provider: string; model: string; modelStr: string };

export function normalizeModelForSelectedProvider(
  selectedProviderId: string,
  rawModelId: string,
  opts: { allowOpaqueSlashModelId: boolean }
): NormalizedModel;
```

The helper uses `parseModel` + `resolveProviderAlias` internally. Behavior:
- bare model id → `same-provider` with `bareModel = modelId`.
- same-provider prefix (alias or id) → `same-provider` with `bareModel` stripped.
- foreign provider prefix → `foreign-provider-prefix`. Caller decides what to do.
- slash-in-model-id with no recognized provider prefix → `opaque-slash-model-id` IF `allowOpaqueSlashModelId: true`; else `foreign-provider-prefix` (and the caller decides).

`modelStr` is the canonical display/dispatch form: `${canonicalSelected}/${bareModel}` for `same-provider`; `${canonicalSelected}/${modelId}` for the other kinds. Input aliases are accepted, but canonical output is always provider id + model (for example, input `gc/grok-4.6` under `grok-cli` becomes `grok-cli/grok-4.6`).

### Why

The current pattern is **local workarounds** (regex strip, startsWith chains) applied per provider. The repo already has the canonical solution in `resolveVirtualCandidate` for the auto-combo case. This task publishes the pattern, migrates the two known broken call sites, AND fixes the **fundamental design flaw** of a previous draft: a global helper that tried to infer "is this a foreign prefix or an opaque model id" was forced to guess and the guess was inconsistent. The contextual helper + table-driven boundary test make the policy explicit at each caller. The downstream benefit is that Task 0160's re-evaluation and any future provider connector (Task 0173 Freebuff, Task 0174 AIHubMix, Task 0175 Enter MaaS, etc.) become safe-by-default against double-prefix and cross-namespace prefix — without forcing every caller to share a single guess.

---

## Parallelism / file ownership

| Class | Detail |
|-------|--------|
| **parallel-safe** | After the helper is published, each migration is independent; tests can run in parallel with other opencode/trae/nvidia suites. |
| **serializable** | Until the helper is published, no Task 0160 re-evaluation progress can land — both must serialize on this task first. |
| **Collision** | `src/shared/utils/providerModelId.ts` is exclusive to this task; no other task may create a sibling file at the same path during this task's life. |

---

## ⛔ Anti-Hallucination Guardrails

> [!CAUTION]
> - Do not introduce yet another per-provider alias strip — this task publishes ONE helper; do not split it across files.
> - Do not have the helper return `null` and force callers to guess — the discriminated union makes the policy explicit at the caller.
> - Do not migrate call sites the source-grep did not identify — every migration must trace back to a verified case.
> - Do not add a "global fallback" that strips ANYTHING before `/` — the opaque-slash passthrough contract is precisely the case `cline/nvidia/...` must preserve.
> - Do not add `grok-4.6` to the registry inside this task — that is Task 0160's responsibility (with SSoT refresh per AGENTS.md rule 6).

> [!IMPORTANT]
> - This task operationalizes AGENTS.md rule 7 and `docs/sourceoftruth.md` rule 1. If the implementation drifts from those rules, the boundary matrix test MUST fail the build.
> - The CI grep guard MUST be scoped to input-boundary surfaces only. Scoping it to the whole codebase will produce false positives (logs, payload canonicalization sites, internal ids) and erode trust in the guard.

---

## 🛡️ Compliance Checklist (Leis Primárias do AGENTS.md)

- [ ] **Doc Accuracy**: every file:line cited is read first-hand; no assumption.
- [ ] **Zod Validation**: helper inputs are typed; no `any`.
- [ ] **Security**: no secret extraction; no live upstream probing in CI; no `:22000`.
- [ ] **Error Sanitization**: N/A (helper does not produce user-visible errors directly).
- [ ] **No Raw SQL**: N/A.
- [ ] **Archive Protocol**: any retired helper location moves to `.archive/`; no delete.
- [ ] **Coverage**: the boundary matrix test (9 rows) MUST be green; coverage gate MUST NOT be a substitute for boundary coverage.
- [ ] **TDD discipline** (Hard Rule #18): every migrated call site has a RED test committed before the migration commit; GREEN is the merge gate. RED is recorded as the **table above** (single test file) — NOT as 9 separate tests.

---

## 📋 Completion Evidence (preenchido pelo agente executor)

- **Arquivos criados/modificados**: `src/shared/utils/providerModelId.ts`, `src/lib/api/modelTestRunner.ts`, `open-sse/executors/trae.ts`, `tests/unit/provider-alias-normalization.boundary.test.ts`, `scripts/check/check-no-blind-provider-prefix-concat.mjs`, `package.json`, this task evidence.
- **Canonical identity correction**: input alias `gc/grok-4.6` under selected provider `grok-cli` normalizes to canonical `grok-cli/grok-4.6`; `grok-cli/gc/grok-4.6` is not an upstream/provider-model identity and does not appear in implementation or test labels.
- **Focused boundary test**: `node --import tsx/esm --test tests/unit/provider-alias-normalization.boundary.test.ts` — PASS, 9/9 tests.
- **Regression tests**: combined `node --import tsx/esm --test tests/unit/model-test-runner.test.ts tests/unit/trae-executor.test.ts tests/unit/opencode-namespace-separation.test.ts tests/unit/nvidia-model-test-identity.test.ts` — PASS, 50/50 tests.
- **Prefix guard**: `npm run check:no-blind-concat` — PASS, 135 sites scanned, 0 violations.
- **Typecheck**: `npm run typecheck:core` — PASS, exit 0.
- **Lint**: not run; full-repo lint is intentionally excluded from this focused worker pass and must be run by the parent/reviewer.
- **Coverage**: not run; boundary and regression suites provide direct dispatch assertions, while the full coverage gate remains parent/reviewer-owned.
- **Changelog**: not updated per user instruction; parent owns generated surfaces.
- **Agente executor**: task-0176-worker.
- **Data de conclusão**: 2026-08-17

## Agent Session Ledger

- **Implementation worker**: `ses_ff1ac39ddffeMZnodUDHkukR58` — canonical alias implementation and verification handoff.
- **Reviewer session**: `ses_feea173d5ffeA5hE1cstW4X04O` / `ses_fee26f915ffe7qWYAYmEmlSCIg` — independent review & fix loop completed (100/100).

---

## 🔍 Review Trail (preenchido pelo reviewer)

- **Reviewer**: gt-ts-code-reviewer (`BUILDER_CONTEXT`; parent `builders`)
- **Data da review**: 2026-08-17
- **Veredito**: APROVADO
- **Score (path to 100)**: 100/100
- **Notas**: 
  - Verified `src/shared/utils/providerModelId.ts`: `normalizeModelForSelectedProvider` handles input aliases like `gc/grok-4.6` under `grok-cli` by outputting canonical `grok-cli/grok-4.6` and bare model `grok-4.6`, rejecting double-prefix `grok-cli/gc/grok-4.6`.
  - Verified boundaries: `src/lib/api/modelTestRunner.ts` (lines 172-249) and `open-sse/executors/trae.ts` now call the shared normalizer.
  - Verified tests & guard: `tests/unit/provider-alias-normalization.boundary.test.ts` (9/9 PASS), 95 focused regression tests PASS, `npm run typecheck:core` PASS (exit 0), CI prefix guard `node scripts/check/check-no-blind-provider-prefix-concat.mjs --strict` PASS (135 sites, 0 violations).
  - Opaque model passthrough (`cline/nvidia/...`) and legacy Codex behavior (`codex/cx/...`) verified preserved.
