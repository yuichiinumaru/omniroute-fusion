# Task 0129: Enable provider model auto-sync by default

> **Status**: `[ ]` Open
> **Priority**: 🟡 P1
> **Type**: `feature`
> **Origin**: User request — model auto-sync is OFF and does not run after the first connection is added; reference analysis found an upstream pattern.
> **Blocks**: —
> **Depends on**: —
> **Parallelism**: `parallel-safe` — owns model-sync setting and provider-connection trigger; coordinate only with concurrent provider-route edits.
> **Review routing**: independent + integration review

## Objective

Make provider model synchronization default to ON for providers with at least one connection, expose a global switch to disable it, and trigger an initial sync after the first successful connection is created when the switch is enabled.

## Background Context

### O que já existe:
- The fork has a models-dev settings route and a manual/periodic model synchronization path.
- Provider connections are created/updated through provider API routes.
- The reference repository contains an `autoSyncProviderModels`-style setting and an add-connection trigger; it is evidence only.

### O que está faltando / quebrado:
- Current setting is effectively false/off by default.
- Adding the first connection does not reliably trigger model discovery.
- The reports identified stale path claims; the builder MUST verify the actual App Router path before editing.

### False-gap check:
- Existing models-dev manual sync remains useful; this task extends trigger/default behavior and does not replace manual sync or static catalogs.

## Test Requirements

- Default settings MUST resolve auto-sync to enabled for a fresh installation.
- Turning the global switch OFF MUST prevent the add-connection trigger.
- Adding the first connection with the switch ON MUST schedule exactly one provider sync.
- Adding additional connections MUST not create unbounded duplicate syncs; debounce/idempotency behavior MUST be tested.
- Sync failure MUST not roll back a successfully persisted connection and MUST be observable through existing error/log paths.

## Exit Conditions (GDD/TDD)

- [ ] A validated boolean setting exists with default ON and a documented operator-facing toggle.
- [ ] First-connection creation triggers the existing sync service/action exactly once when enabled.
- [ ] Disabled, duplicate, and sync-failure tests pass.
- [ ] Manual and scheduled sync paths remain passing.
- [ ] `npm run typecheck:core` passes.
- [ ] `npm run lint` passes without new errors.
- [ ] Targeted provider/model-sync tests pass with 0 failures.
- [ ] `.changelog/` entry is created and rebuilt through the engine.
- [ ] Completion Evidence and Review Trail are filled before promotion.

## Details

### What

Subtasks:
- [ ] **Ler código existente**: read the real models-dev route, settings store/schema, provider model DB module, provider connection create route, and existing sync scheduler.
- [ ] Compare the reference implementation read-only and record only verified reusable behavior.
- [ ] Add failing tests for default ON, switch OFF, first connection, duplicate trigger, and failure isolation.
- [ ] Implement a reusable idempotent trigger instead of calling a route from another route.
- [ ] Add/update the settings UI in the verified Routing destination without adding a second topbar.
- [ ] **Refactoring pass**: preserve manual/cron sync and avoid blocking connection persistence on a slow remote provider.
- [ ] **Verificação de regressão**: targeted tests, typecheck, lint, and test-environment smoke proof.

### Where

| Arquivo | Propósito |
|---------|-----------|
| `src/lib/db/settings.ts` | Ler/modificar default and persistence. |
| `src/shared/validation/settingsSchemas.ts` | Ler/modificar Zod setting schema. |
| Verified `src/app/api/settings/models-dev/route.ts` or equivalent | Ler existing sync API. |
| Verified provider connection route under `src/app/api/providers/` | Modificar first-connection trigger. |
| Existing model sync service/scheduler | Reuse or extract idempotent trigger. |
| `src/lib/db/models.ts` or verified model storage module | Ler persistence contract. |
| Settings UI component | Modificar toggle in Routing. |
| `tests/unit/` model-sync tests | Criar/modificar coverage. |
| `../legacy/diegosouzapw-omniroute/` relevant files | Ler only; operator-authorized external reference, never modify. |
| `.changelog/` | Criar entry. |

### How

1. Resolve stale route claims with live lookup before changing paths.
2. Make the setting schema/default testable independently.
3. Trigger asynchronously/idempotently after successful persistence.
4. Validate that manual and periodic sync remain unchanged.

### Why

Model discovery is part of connection onboarding. Requiring a second manual action leaves new connections apparently broken and makes provider setup inconsistent.

## Parallelism / file ownership

| Class | Detail |
|-------|--------|
| **parallel-safe** | Safe beside Codex, combo copy, and fusion runtime tasks. |
| **serializable** | Coordinate with any provider connection API refactor and sequence shared settings/Routing UI edits with Tasks 0132 and 0134. |
| **Collision** | Settings store/schema, provider add route, model-sync service, Routing settings UI, and any timeout/settings resolver files owned by 0132 or 0134. |

## ⛔ Anti-Hallucination Guardrails

> Do not use a guessed legacy Pages Router path; resolve the live App Router route before editing. Do not call an HTTP route internally when a service function exists. Sync failure must not lose credentials or expose secrets.

## 🛡️ Compliance Checklist

- [ ] **Doc Accuracy**: real sync route/service and connection handler verified.
- [ ] **Zod Validation**: setting and API payload validated.
- [ ] **Security**: credentials never logged or returned.
- [ ] **Error Sanitization**: sync errors use existing sanitization.
- [ ] **No Raw SQL**: DB operations stay in domain modules.
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
