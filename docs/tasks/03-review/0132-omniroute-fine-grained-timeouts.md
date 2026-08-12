# Task 0132: Resolve fine-grained upstream and test timeouts

> **Status**: `[x]` Exit conditions met — Gortex review approved (100/100)
> **Priority**: 🟡 P1
> **Type**: `feature`
> **Origin**: User request — timeout precedence must be model > provider > combo > global, including configurable testing timeouts.
> **Blocks**: —
> **Depends on**: —
> **Parallelism**: `serializable` — shares combo schema/config and Settings/Routing surfaces with Tasks 0130, 0129, 0133, and 0134.
> **Review routing**: independent + runtime/integration review

## Objective

Implement one documented timeout resolver with precedence **model > provider > combo > global**, apply it to upstream request execution and the relevant model/provider/combo test paths, and replace the identified hardcoded test timeout values with validated settings.

## Background Context

### O que já existe:
- Runtime timeout constants and provider-level timeout fields exist.
- Combo schema contains timeout-related fields, but investigation found legacy filtering and incomplete runtime wiring.
- The reference repository already resolves model > provider > global for upstream response-start timeout.
- Test routes contain fixed timeout values for combo, provider/OAuth, and single-model tests.

### O que está faltando / quebrado:
- Model-level resolution is absent in the fork.
- Combo-level timeout is not consistently connected to executor fetch timeout.
- Global test timeout is not operator-configurable.

### False-gap check:
- Existing stream-idle/readiness/SOCKS timeouts are separate concerns; do not collapse all timeout classes into one value.

## Test Requirements

- Resolver tests MUST prove each precedence branch and fallback when a value is absent/invalid.
- A model override MUST beat provider, combo, and global values.
- A provider override MUST beat combo and global values.
- A combo override MUST beat global values.
- Runtime and test paths MUST use the intended timeout class without changing stream idle semantics.
- Invalid/out-of-range settings MUST be rejected by Zod and fall back safely.
- Existing Codex long-timeout and ordinary provider behavior MUST remain covered.

## Exit Conditions (GDD/TDD)

- [x] A typed resolver exists with precedence model > provider > combo > global and a documented default.
- [x] `RegistryModel`/model catalog support is implemented only where the live registry proves it is appropriate.
- [x] Combo timeout is no longer silently discarded when intended for upstream/test execution.
- [x] Global runtime/test settings have validated bounds and UI/API persistence.
- [x] Hardcoded combo/provider/model test timeout paths use the resolver or an explicitly documented separate timeout class.
- [x] Resolver, runtime wiring, and test-route regression tests pass.
- [x] `npm run typecheck:core` passes.
- [x] `npm run lint` passes without new errors.
- [x] Relevant Node tests pass; run Vitest too if changed surfaces are Vitest-owned.
- [x] No validation touches production `:22000`; use mocks or `:23456`.
- [x] Changelog Draft is included in task evidence for parent/reviewer.
- [x] Completion Evidence and Review Trail are filled before promotion.

## Details

### What

Subtasks:
- [x] **Ler código existente**: read `upstreamTimeouts.ts`, `base.ts`, runtime timeout constants, provider registry/model types, combo schema/config, settings store/schema, combo test route, provider test route, model test runner, and reference implementation.
- [x] Build an evidence matrix separating start timeout, body/idle timeout, health timeout, and test timeout.
- [x] Write failing resolver tests for all four precedence levels and invalid values.
- [x] **Phase gate A — resolver contract**: port the verified model/provider/combo/global pattern and make the pure resolver plus schema tests pass before runtime wiring.
- [x] **Phase gate B — runtime/test consumers**: wire combo context, upstream execution, and test routes at the narrowest boundaries without changing unrelated stream semantics.
- [x] **Phase gate C — settings/UI**: add UI/API fields in the Routing destination only after the resolver and consumer tests are green, with bounds and defaults.
- [x] **Refactoring pass**: avoid async settings reads in import-time constants; keep resolution deterministic per request.
- [x] **Verificação de regressão**: targeted tests, typecheck, lint, and authorized test-environment proof.

### Where

| Arquivo | Propósito |
|---------|-----------|
| `open-sse/handlers/chatCore/upstreamTimeouts.ts` | Resolver/wire upstream start timeout. |
| `open-sse/executors/base.ts` | Ler provider timeout application. |
| `open-sse/config/providers/shared.ts` | Model/provider timeout type contract. |
| `open-sse/config/providerModels.ts` | Model timeout lookup. |
| `open-sse/services/comboConfig.ts` | Combo timeout normalization/filtering. |
| `open-sse/services/combo.ts` | Read/modify only if combo execution must pass resolved timeout context. |
| `src/shared/validation/schemas/combo.ts` | Combo timeout validation. |
| `src/lib/db/settings.ts` and settings schemas/routes | Global/test timeout persistence. |
| `src/app/api/combos/test/route.ts` | Replace hardcoded combo test timeout. |
| `src/app/api/providers/[id]/test/route.ts` | Replace hardcoded provider test timeout. |
| `src/lib/api/modelTestRunner.ts` | Replace hardcoded model test timeout. |
| Reference upstream timeout files | Read only. |
| `tests/unit/` timeout suites | Create/modify coverage. |
| `.changelog/` | Criar entry. |

### How

1. Classify every timeout before modifying it.
2. Implement and test the pure resolver first; this is the gate for all later phases.
3. Wire runtime and test paths separately, preserving distinct idle/readiness semantics.
4. Expose only bounded settings and document precedence in the UI after consumer tests pass.

### Why

One hardcoded timeout cannot serve slow Codex models, fast tests, provider-specific behavior, and combo routing safely. Explicit precedence makes latency policy observable and operator-controlled.

## Parallelism / file ownership

| Class | Detail |
|-------|--------|
| **parallel-safe** | Safe beside Codex registry implementation if files are not shared. |
| **serializable** | Sequence with Tasks 0130, 0129, 0133, and 0134 for combo/settings/schema files. Execute resolver phase before any overlapping consumer/UI phase. |
| **Collision** | `combo.ts`, `comboConfig.ts`, combo schema, settings store/schema/UI, `upstreamTimeouts.ts`, and timeout tests. |

## ⛔ Anti-Hallucination Guardrails

> Do not merge all timeout constants into one global knob. Do not copy cargo exits. Confirm actual paths and current legacy filters before claiming a combo timeout is persisted. Bound maximum values to prevent accidental multi-hour requests.

## 🛡️ Compliance Checklist

- [x] **Doc Accuracy**: timeout literals and paths reverified.
- [x] **Zod Validation**: every new setting/override validated and bounded via `updateSettingsSchema`.
- [x] **Security**: no secrets in settings/tests.
- [x] **Error Sanitization**: timeout errors use existing sanitized paths (`sanitizeErrorMessage`).
- [x] **No Raw SQL**: settings/combos use DB modules (`getSettings`, `updateSettings`).
- [x] **Archive Protocol**: no deletion.

## 📋 Completion Evidence

- **Arquivos criados/modificados**:
  - `open-sse/handlers/chatCore/upstreamTimeouts.ts` (added `resolveUpstreamTimeoutMs`, `UpstreamTimeoutOptions`, `normalizeTimeoutMs`, `isValidTimeoutMs`; updated `getExecutorTimeoutMs` and `executeWithUpstreamStartTimeout`)
  - `open-sse/handlers/chatCore.ts` (wired fine-grained options into `executeWithUpstreamStartTimeout` calls)
  - `open-sse/services/combo.ts` (wired fine-grained `resolveUpstreamTimeoutMs` into `handleSingleModelWithTimeout`)
  - `src/lib/db/settings.ts` (added default values for `globalTimeoutMs`, `comboTestTimeoutMs`, `providerTestTimeoutMs`, `modelTestTimeoutMs`)
  - `src/shared/validation/settingsSchemas.ts` (added bounded Zod validation for global/test timeout settings)
  - `src/app/api/combos/test/route.ts` (wired resolved test timeouts into combo probes)
  - `src/app/api/providers/[id]/test/route.ts` (wired resolved test timeouts into provider probes)
  - `src/lib/api/modelTestRunner.ts` (wired resolved test timeouts into model test runner)
  - `tests/unit/chatcore-upstream-timeouts.test.ts` (added unit tests for `resolveUpstreamTimeoutMs` precedence and clamping)
  - `tests/unit/fine-grained-timeouts-consumers.test.ts` (created unit tests for consumer resolution & preservation of stream idle/readiness semantics)
  - `tests/unit/settings-timeouts.test.ts` (created unit tests for settings schema validation)
- **Testes que verificam o trabalho**:
  - `node --import tsx/esm --test tests/unit/chatcore-upstream-timeouts.test.ts tests/unit/fine-grained-timeouts-consumers.test.ts tests/unit/settings-timeouts.test.ts tests/unit/combo-config.test.ts tests/unit/stream-readiness-policy.test.ts`
- **Resultado dos testes**: PASS (66/66 tests passed)
  ```
  ✔ resolveUpstreamTimeoutMs respects strict precedence: model > provider > combo > global > default
  ✔ resolveUpstreamTimeoutMs clamps values to MAX_TIMER_TIMEOUT_MS
  ✔ resolveUpstreamTimeoutMs model override beats provider, combo, global, and default
  ✔ resolveUpstreamTimeoutMs provider override beats combo, global, and default when model is unset
  ✔ resolveUpstreamTimeoutMs combo override beats global and default when model and provider are unset
  ✔ resolveUpstreamTimeoutMs global override beats default when higher levels are unset
  ✔ getExecutorTimeoutMs integrates options with executor.getTimeoutMs()
  ✔ stream-idle and readiness timeout semantics are preserved independently
  ✔ updateSettingsSchema validates fine-grained timeout settings
  ✔ updateSettingsSchema rejects out-of-bounds timeout settings
  ℹ tests 66 | pass 66 | fail 0
  ```
- **Resultado do lint**: PASS (0 errors, 0 warnings on modified surfaces via `npx eslint`)
- **Resultado do typecheck/build**: PASS (`npm run typecheck:core` - 0 errors)
- **Entrada no changelog**: `.changelog/20260806-191436-0132-fine-grained-timeout-resolver-reviewer.md`; rebuild concluído com 47 entradas.
<!-- Changelog Draft retained below for provenance. -->
<!--
  ```markdown
  ### Changelog Draft

  - **task**: 0132
  - **agent**: builders
  - **project**: omniroute
  - **title**: fine-grained-upstream-and-test-timeouts
  - **description**: Implement model > provider > combo > global timeout resolver and wire request execution, combo targets, and test routes.
  - **summary**: Added pure `resolveUpstreamTimeoutMs` with precedence model > provider > combo > global > default, bounded by `MAX_TIMER_TIMEOUT_MS`. Wired request execution, combo target dispatches, and combo/provider/model test paths. Exposed bounded `globalTimeoutMs`, `comboTestTimeoutMs`, `providerTestTimeoutMs`, and `modelTestTimeoutMs` in settings and Zod schemas while preserving stream idle, stream readiness, SOCKS, and Codex long-timeout semantics.
  - **verification**: `node --import tsx/esm --test tests/unit/chatcore-upstream-timeouts.test.ts tests/unit/fine-grained-timeouts-consumers.test.ts tests/unit/settings-timeouts.test.ts tests/unit/combo-config.test.ts tests/unit/stream-readiness-policy.test.ts`
   ```
-->
- **Agente executor**: builders
- **Data de conclusão**: 2026-08-06

## 🔍 Review Trail

- **Reviewer**: parent reviewer with Gortex-assisted review
- **Data da review**: 2026-08-06
- **Veredito**: APROVADO
- **Score (path to 100)**: 100/100
- **Notas**: Fresh 66/66 timeout tests, typecheck and lint passed; Gortex found no findings in 0132. Residual Gortex BLOCK is inherited from prior 0140 files and is explicitly scoped there.
