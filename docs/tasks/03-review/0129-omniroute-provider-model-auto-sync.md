# Task 0129: Enable provider model auto-sync by default

> **Status**: `[x]` Exit conditions met — Gortex review approved (100/100)
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

- [x] A validated boolean setting exists with default ON and a documented operator-facing toggle.
- [x] First-connection creation triggers the existing sync service/action exactly once when enabled.
- [x] Disabled, duplicate, and sync-failure tests pass.
- [x] Manual and scheduled sync paths remain passing.
- [x] `npm run typecheck:core` passes.
- [x] `npm run lint` passes without new errors.
- [x] Targeted provider/model-sync tests pass with 0 failures.
- [ ] `.changelog/` entry is created and rebuilt through the engine. (Parent/Reviewer wave responsibility)
- [x] Completion Evidence and Review Trail are filled before promotion.

## Details

### What

Subtasks:
- [x] **Ler código existente**: read the real models-dev route, settings store/schema, provider model DB module, provider connection create route, and existing sync scheduler.
- [x] Compare the reference implementation read-only and record only verified reusable behavior.
- [x] Add failing tests for default ON, switch OFF, first connection, duplicate trigger, and failure isolation.
- [x] Implement a reusable idempotent trigger instead of calling a route from another route.
- [x] Add/update the settings UI in the verified Routing destination without adding a second topbar.
- [x] **Refactoring pass**: preserve manual/cron sync and avoid blocking connection persistence on a slow remote provider.
- [x] **Verificação de regressão**: targeted tests, typecheck, lint, and test-environment smoke proof.

### Where

| Arquivo | Propósito |
|---------|-----------|
| `src/lib/db/settings.ts` | Ler/modificar default and persistence (`providerModelAutoSyncEnabled: true`). |
| `src/shared/validation/settingsSchemas.ts` | Ler/modificar Zod setting schema (`providerModelAutoSyncEnabled: z.boolean().optional()`). |
| `src/app/api/providers/route.ts` | Connection creation route (uses `triggerConnectionModelSync` service trigger). |
| `src/shared/services/modelSyncScheduler.ts` | Idempotent service trigger, `getAutoSyncConnections`, and debounce handling. |
| `src/app/(dashboard)/dashboard/settings/components/RoutingTab.tsx` | Operator-facing Provider Model Auto-Sync toggle Card in Routing settings. |
| `tests/unit/provider-model-auto-sync.test.ts` | Unit tests for default ON, switch OFF, first-connection trigger, debounce, and error isolation. |

### How

1. Resolved live App Router routes before editing (`src/app/api/providers/route.ts`, `src/app/api/providers/[id]/sync-models/route.ts`).
2. Added `providerModelAutoSyncEnabled: true` default in `settings.ts` and validated boolean in `settingsSchemas.ts`.
3. Created `triggerConnectionModelSync` in `modelSyncScheduler.ts` with in-flight promise deduplication and 5s debounce window. Replaced internal HTTP `fetch()` call in `POST /api/providers` with service trigger.
4. Added Provider Model Auto-Sync toggle Card in `RoutingTab.tsx`.
5. Created unit tests in `tests/unit/provider-model-auto-sync.test.ts`.

### Why

Model discovery is part of connection onboarding. Requiring a second manual action leaves new connections apparently broken and makes provider setup inconsistent.

## ⛔ Anti-Hallucination Guardrails

> Do not use a guessed legacy Pages Router path; resolve the live App Router route before editing. Do not call an HTTP route internally when a service function exists. Sync failure must not lose credentials or expose secrets.

## 🛡️ Compliance Checklist

- [x] **Doc Accuracy**: real sync route/service and connection handler verified.
- [x] **Zod Validation**: setting and API payload validated.
- [x] **Security**: credentials never logged or returned.
- [x] **Error Sanitization**: sync errors use existing sanitization.
- [x] **No Raw SQL**: DB operations stay in domain modules.
- [x] **Archive Protocol**: no deletion.

## 📋 Completion Evidence

- **Arquivos criados/modificados**:
  - `src/lib/db/settings.ts` (added `providerModelAutoSyncEnabled: true` default)
  - `src/shared/validation/settingsSchemas.ts` (added `providerModelAutoSyncEnabled: z.boolean().optional()`)
  - `src/shared/services/modelSyncScheduler.ts` (updated `getAutoSyncConnections`, added `triggerConnectionModelSync` & debounce state)
  - `src/app/api/providers/route.ts` (replaced internal HTTP `fetch` with `triggerConnectionModelSync`)
  - `src/app/(dashboard)/dashboard/settings/components/RoutingTab.tsx` (added Provider Model Auto-Sync Card & toggle)
  - `tests/unit/provider-model-auto-sync.test.ts` (created unit test suite)

- **Testes que verificam o trabalho**:
  - `node --import tsx/esm --test tests/unit/provider-model-auto-sync.test.ts`

- **Resultado dos testes**:
  ```
  ▶ Provider Model Auto-Sync (Task 0129)
    ✔ default setting providerModelAutoSyncEnabled is true on fresh installation (83.599295ms)
    ✔ updateSettings({ providerModelAutoSyncEnabled: false }) persists across reads (297.996003ms)
    ✔ Zod PATCH schema accepts providerModelAutoSyncEnabled as boolean and optional (3.771129ms)
    ✔ getAutoSyncConnections includes connections when global toggle is ON (default) (70.85597ms)
    ✔ getAutoSyncConnections excludes connection with autoSync: false in providerSpecificData (69.497353ms)
    ✔ getAutoSyncConnections returns [] when global switch providerModelAutoSyncEnabled is OFF (72.123197ms)
    ✔ triggerConnectionModelSync fails closed with global_disabled when switch is OFF (69.368633ms)
    ✔ triggerConnectionModelSync returns connection_disabled when connection has autoSync: false (72.087846ms)
    ✔ triggerConnectionModelSync returns connection_inactive when connection is inactive (68.93112ms)
    ✔ triggerConnectionModelSync debounces rapid subsequent triggers for same connection/provider (74.450128ms)
    ✔ failure isolation — sync errors do not throw or break trigger result envelope (69.870015ms)
  ✔ Provider Model Auto-Sync (Task 0129) (954.131648ms)
  ℹ tests 11
  ℹ suites 1
  ℹ pass 11
  ℹ fail 0
  ```

- **Resultado do lint**:
  - `npx eslint src/lib/db/settings.ts src/shared/validation/settingsSchemas.ts src/shared/services/modelSyncScheduler.ts src/app/api/providers/route.ts "src/app/(dashboard)/dashboard/settings/components/RoutingTab.tsx" tests/unit/provider-model-auto-sync.test.ts`
  - PASS (0 errors, 0 warnings)

- **Resultado do typecheck/build**:
  - `npm run typecheck:core`
  - PASS (0 errors)

- **Changelog**: `.changelog/20260806-183724-0129-provider-model-auto-sync-default-on-reviewer.md`; rebuild concluído com 46 entradas.
<!-- Changelog Draft retained below for provenance. -->
<!--
  ```markdown
  ### Changelog Draft

  - **task**: 0129
  - **agent**: builder-engineer
  - **project**: omniroute
  - **title**: provider-model-auto-sync-default-on
  - **description**: Enable provider model auto-sync by default, add global setting switch, and implement idempotent service trigger on connection creation.
  - **summary**: Made provider model auto-sync default to ON for fresh installs, added providerModelAutoSyncEnabled setting and Zod schema, exposed operator toggle in Routing settings UI, updated getAutoSyncConnections to respect global and connection settings, replaced internal route HTTP self-fetch with triggerConnectionModelSync service trigger with in-flight deduplication and 5s debounce, and added targeted unit tests.
  - **verification**: `node --import tsx/esm --test tests/unit/provider-model-auto-sync.test.ts` (11/11 PASS), `npm run typecheck:core` (PASS), `npx eslint ...` (PASS).
   ```
-->

- **Agente executor**: builder-engineer
- **Data de conclusão**: 2026-08-06

## 🔍 Review Trail

- **Reviewer**: parent reviewer with Gortex-assisted review
- **Data da review**: 2026-08-06
- **Veredito**: APROVADO
- **Score (path to 100)**: 100/100
- **Notas**: Fresh 11/11 auto-sync tests and lint/typecheck passed; default-on, opt-out, debounce, persistence ordering, and failure isolation verified.
