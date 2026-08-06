# Task 0132: Resolve fine-grained upstream and test timeouts

> **Status**: `[ ]` Open
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

- [ ] A typed resolver exists with precedence model > provider > combo > global and a documented default.
- [ ] `RegistryModel`/model catalog support is implemented only where the live registry proves it is appropriate.
- [ ] Combo timeout is no longer silently discarded when intended for upstream/test execution.
- [ ] Global runtime/test settings have validated bounds and UI/API persistence.
- [ ] Hardcoded combo/provider/model test timeout paths use the resolver or an explicitly documented separate timeout class.
- [ ] Resolver, runtime wiring, and test-route regression tests pass.
- [ ] `npm run typecheck:core` passes.
- [ ] `npm run lint` passes without new errors.
- [ ] Relevant Node tests pass; run Vitest too if changed surfaces are Vitest-owned.
- [ ] No validation touches production `:22000`; use mocks or `:23456`.
- [ ] `.changelog/` entry is created and rebuilt.
- [ ] Completion Evidence and Review Trail are filled before promotion.

## Details

### What

Subtasks:
- [ ] **Ler código existente**: read `upstreamTimeouts.ts`, `base.ts`, runtime timeout constants, provider registry/model types, combo schema/config, settings store/schema, combo test route, provider test route, model test runner, and reference implementation.
- [ ] Build an evidence matrix separating start timeout, body/idle timeout, health timeout, and test timeout.
- [ ] Write failing resolver tests for all four precedence levels and invalid values.
- [ ] **Phase gate A — resolver contract**: port the verified model/provider/combo/global pattern and make the pure resolver plus schema tests pass before runtime wiring.
- [ ] **Phase gate B — runtime/test consumers**: wire combo context, upstream execution, and test routes at the narrowest boundaries without changing unrelated stream semantics.
- [ ] **Phase gate C — settings/UI**: add UI/API fields in the Routing destination only after the resolver and consumer tests are green, with bounds and defaults.
- [ ] **Refactoring pass**: avoid async settings reads in import-time constants; keep resolution deterministic per request.
- [ ] **Verificação de regressão**: targeted tests, typecheck, lint, and authorized test-environment proof.

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

- [ ] **Doc Accuracy**: timeout literals and paths reverified.
- [ ] **Zod Validation**: every new setting/override validated and bounded.
- [ ] **Security**: no secrets in settings/tests.
- [ ] **Error Sanitization**: timeout errors use existing sanitized paths.
- [ ] **No Raw SQL**: settings/combos use DB modules.
- [ ] **Archive Protocol**: no deletion.

## 📋 Completion Evidence

- **Arquivos criados/modificados**: [preencher]
- **Testes que verificam o trabalho**: [preencher]
- **Resultado dos testes**: [PASS/FAIL + output real]
- **Resultado do lint**: [PASS/FAIL]
- **Resultado do typecheck/build**: [PASS/FAIL]
- **Entrada no changelog**: [preencher]
- **Agente executor**: [preencher]
- **Data de conclusão**: [YYYY-MM-DD]

## 🔍 Review Trail

- **Reviewer**: [preencher]
- **Data da review**: [YYYY-MM-DD]
- **Veredito**: [APROVADO / REJEITADO]
- **Score (path to 100)**: [0-100]
- **Notas**: [preencher]
