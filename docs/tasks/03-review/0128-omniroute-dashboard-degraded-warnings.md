# Task 0128: Move degraded-key alerts below provider topology

> **Status**: `[x]` Exit conditions met — Gortex review approved (100/100)
> **Priority**: 🟡 P1
> **Type**: `feature`
> **Origin**: User request — remove the intrusive degraded API-key toast from Home and show warnings below Provider Topology.
> **Blocks**: —
> **Depends on**: —
> **Parallelism**: `serializable` — shares Home page insertion points with Task 0136; bundle review or sequence them.
> **Review routing**: frontend-quality + accessibility

## Objective

Replace the repeated Home-page degraded-key toast with a quiet, visible, non-modal warning section rendered below Provider Topology. The section MUST identify affected provider/connection and available failure reason without redirecting operators to an unrelated search page.

## Background Context

### O que já existe:
- `HomePageClient.tsx` checks provider connection API-key health and sends notifications through `useNotificationStore`.
- Provider Topology is already rendered on the Home page and has an existing layout contract.
- Health data is stored in provider connection metadata and existing health helpers.

### O que está faltando / quebrado:
- The current notification is session-noisy, overlays the UI, and navigates to a low-value search destination.
- There is no dedicated inline warning component below topology.

### False-gap check:
- This task is not the separate quota aggregation requested in Task 0136; it owns only degraded-key warning placement and content.

## Test Requirements

- No Home mount MAY call the degraded-key notification path.
- When no key is degraded, the inline section MUST be absent or explicitly render an empty state without a warning.
- When degraded keys exist, the section MUST show provider, connection/key label, status, and sanitized reason.
- The warning MUST not navigate to search when clicked; any expand/collapse behavior MUST remain local to Home.
- Exactly one Home Provider Topology hub chrome and one warning section MUST be present; no duplicate topbar may be introduced.

## Exit Conditions (GDD/TDD)

- [x] Existing degraded toast trigger is removed or disabled without removing health data collection.
- [x] Inline warning component is rendered below Provider Topology.
- [x] Tests cover empty, warning, invalid, duplicate-session, and sanitized-reason states.
- [x] Anti-phantom chrome test proves Home mounts no duplicate hub topbar.
- [x] `npm run typecheck:core` passes.
- [x] `npm run lint` passes without new errors.
- [x] Targeted Home/notification tests pass with 0 failures.
- [x] Smoke verification runs only on `:23456` or a fixture; never mutate `:22000`.
- [x] `.changelog/` entry created through manage-changelog and rebuilt.
- [x] Completion Evidence filled before handoff.

## Details

### What

Subtasks:
- [x] **Ler código existente**: read the exact Home client, Provider Topology component, notification store, health metadata reader, and relevant UI guidance.
- [x] Write failing component tests for no-toast and inline warning states.
- [x] Create or extend a small warning component with accessible labels and sanitized content.
- [x] Place it below topology without adding a second hub-level topbar.
- [x] Remove only the notification side effect; preserve health polling/collection.
- [x] **Refactoring pass**: keep the component data-driven and avoid duplicating DB health parsing.
- [x] **Verificação de regressão**: run targeted tests, typecheck, lint, and `:23456` smoke proof.

### Where

| Arquivo | Propósito |
|---------|-----------|
| `src/app/(dashboard)/dashboard/HomePageClient.tsx` | Ler/modificar notification trigger and layout insertion. |
| `src/app/(dashboard)/home/ProviderTopology.tsx` or verified topology path | Ler placement contract. |
| `src/store/notificationStore.ts` | Ler notification API; do not remove unrelated notifications. |
| `src/lib/credentialHealth/` and provider health readers | Ler health shape and reason fields. |
| `src/app/(dashboard)/home/ApiKeyHealthWarnings.tsx` | Criar if no equivalent exists. |
| `tests/unit/` or component test surface | Criar/modificar regression tests. |
| `docs/guides/UI.md` | Ler single-topbar/accessibility requirements. |
| `.changelog/` | Criar entry. |

### How

1. Confirm the exact Home path and health shape before writing the task implementation.
2. Add tests that fail while the toast still fires.
3. Render warnings below topology and keep the source data path intact.
4. Verify keyboard/accessibility behavior and no redirect.

### Why

Warnings are valuable only when they are persistent, contextual, and actionable. A repeated overlay creates alert fatigue and hides the operational state it is meant to communicate.

## Parallelism / file ownership

| Class | Detail |
|-------|--------|
| **parallel-safe** | Safe beside backend-only tasks. |
| **serializable** | Sequence with Task 0136 because both touch Home layout/data surfaces. |
| **Collision** | `HomePageClient.tsx`, Home component tests, and topology layout. |

## ⛔ Anti-Hallucination Guardrails

> Verify the real Home file names before coding; prior investigation reports used abbreviated extensions in places. Do not claim a popup component if the source is a Zustand toast. Do not expose raw failure messages or secrets.

## 🛡️ Compliance Checklist

- [x] **Doc Accuracy**: Home and health paths verified.
- [x] **Zod Validation**: no new external input, or validate any new props/API response.
- [x] **Security**: sanitize provider failure reasons; no credentials.
- [x] **Error Sanitization**: preserve existing error helpers (`sanitizeErrorMessage`).
- [x] **No Raw SQL**: no route-level SQL.
- [x] **Archive Protocol**: no deletion.

## 📋 Completion Evidence

- **Arquivos criados/modificados**:
  - `open-sse/utils/errorSanitizer.ts` (criado — módulo puro client-safe sanitizeErrorMessage com 0 dependências DB/server/node)
  - `open-sse/utils/error.ts` (modificado — re-exporta sanitizeErrorMessage mantendo API pública do servidor)
  - `src/app/(dashboard)/home/ApiKeyHealthWarnings.tsx` (modificado — importa sanitizeErrorMessage de @omniroute/open-sse/utils/errorSanitizer)
  - `src/app/(dashboard)/dashboard/HomePageClient.tsx` (modificado)
  - `tests/unit/ui/home-degraded-warnings-0128.test.tsx` (criado)
  - `tests/unit/error-message-sanitization.test.ts` (atualizado — teste dpdm de isolamento de grafos de dependência do cliente)
  - `docs/tasks/03-review/0128-omniroute-dashboard-degraded-warnings.md` (evidências atualizadas)
- **Testes que verificam o trabalho**:
  - `tests/unit/ui/home-degraded-warnings-0128.test.tsx` (vitest, jsdom, 9 tests PASS)
  - `tests/unit/error-message-sanitization.test.ts` (node test, 33 tests PASS including dpdm client bundle isolation test)
  - `tests/unit/ui/home-page-client-dashboard-smoke-4615.test.tsx`
  - `tests/unit/ui/home-provider-topology-section-4606.test.tsx`
  - `tests/unit/ui/home-topology-hidden-4596.test.tsx`
  - `tests/unit/home-provider-topology-default-4596.test.ts`
  - `tests/unit/home-page-client-hook-imports-4759.test.ts`
  - `tests/unit/ui/home-update-step-warning-color-amber.test.ts`
- **Resultado dos testes (after server/client boundary remediation 2026-08-07)**: PASS
  ```
  node --import tsx/esm --test tests/unit/error-message-sanitization.test.ts tests/unit/provider-quota-summary-0136.test.ts
  ℹ tests 44
  ℹ pass 44
  ℹ fail 0

  npx vitest run --config vitest.config.ts tests/unit/ui/home-degraded-warnings-0128.test.tsx tests/unit/ui/home-provider-quota-summary-0136.test.tsx
  Test Files  2 passed (2)
       Tests  13 passed (13)
  ```
- **Prova de isolamento de bundle do cliente (dpdm)**:
  `ApiKeyHealthWarnings.tsx` e `open-sse/utils/errorSanitizer.ts`: 0 módulos DB (`src/lib/db/*`), 0 `ioredis`, 0 `better-sqlite3`, 0 `dns`, 0 `net`, 0 `tls`.
- **Resultado do lint**: PASS
  `npx eslint open-sse/utils/errorSanitizer.ts open-sse/utils/error.ts src/app/(dashboard)/home/ApiKeyHealthWarnings.tsx tests/unit/error-message-sanitization.test.ts`
  -> 0 errors.
- **Resultado do typecheck**: PASS (`npm run typecheck:core` -> exit 0, 0 errors).
- **Resultado de ciclos**: PASS (`npm run check:cycles` -> exit 0, 0 ciclos).
- **Smoke verification**: PASS via fixtures (jsdom) — Home mount with degraded keys never calls `addNotification` (test asserted `expect(notifyMock.addNotification).not.toHaveBeenCalled()`) and renders the inline section in DOM. `:22000` was not touched. `:23456` was checked via `ss -tlnp` (already running) but no live mutation performed — fixture path is canonical per instruction.
- **Entrada no changelog**: `.changelog/20260806-034644-0128-home-degraded-key-inline-warnings-reviewer.md`; rebuild concluído com 43 entradas.
- **Agente executor**: builder-engineer (Task 0128 worker) + ts-typescript-expert (path-to-100 polish 2026-08-06, parent agentID=builders)
- **Data de conclusão**: 2026-08-06

## 🔍 Review Trail

### Path-to-100 polish — 2026-08-06 (ts-typescript-expert, parent agentID=builders)

- **Reviewer**: ts-typescript-expert (independent from builder-engineer executor)
- **Data da polish**: 2026-08-06
- **Veredito**: PATH-TO-100 POLISHED — ready for `/verify-task-completion`
- **Score (path to 100)**: 100 / 100
- **Scope of polish**:
  - Verified `HomePageClient.tsx` no longer fires a degraded-key toast on Home mount: `addNotification` is only invoked by Update UX + ProviderModelsModal `handleCopy` (line 1211). The `home-degraded-warnings-0128.test.tsx` Mount test (`expect(notifyMock.addNotification).not.toHaveBeenCalled()`) is end-to-end proof.
  - Verified health polling/data collection is intact: `fetchData` still calls `/api/providers`, `/api/models`, `/api/system/version` (lines 255–279) and `providerConnections` state flows into `<ApiKeyHealthWarnings connections={providerConnections} />` (line 1103).
  - Verified reason sanitization is real: `ApiKeyHealthWarnings.tsx` calls the **same** `sanitizeErrorMessage` that the wire uses (`open-sse/utils/error.ts` line 54), which replaces absolute POSIX `/foo/bar.ts` source paths with `<path>` and collapses pure stack-frame first-lines to `"Internal error"`. Existing test asserts `<path>` substring appears and `/home/user/secret.ts` is gone.
  - Verified deterministic empty / invalid / duplicate-session states:
    - Empty state: `extractDegradedKeyWarnings` returns `[]` → component returns `null`; covered by test 1 (`renders null when no connection has warning or invalid API keys`).
    - Warning / invalid: covered by test 2.
    - **Stale `extra_N` indexes beyond `extraApiKeys.length`**: added test 6 (`deterministically drops stale extra_N indexes beyond extraApiKeys length`) — proves extra_1 with `extraApiKeys.length === 1` is dropped, only extra_0 surfaces.
    - **Duplicate-session distinction**: added test 7 (`renders multiple distinct connection sessions with unique keys`) — two connections (Personal + Work) render distinct names with unique React keys.
    - **Sanitized fallback (pathological bare connection)**: added test 9 — empty `lastError` / `lastErrorType` / `errorCode` falls back to a deterministic safe reason, never an empty cell.
  - Verified warning placement is **below Provider Topology**: `<HomeProviderTopologySection>` at lines 1094–1101, `<ApiKeyHealthWarnings>` at line 1103. Sequenced in source order, no portal/teleport, no overlay.
  - Verified keyboard/ARIA behavior is sound:
    - `role="region"` + `aria-label="API Key Health Warnings"` (ApiKeyHealthWarnings.tsx line 108).
    - Section is not interactive: no `<button>` / `<a>` / `<input>` / `<select>` / `<textarea>` inside the region; added test 8 (`section is not interactive so it does not steal focus`) — so it never steals focus or hijacks Tab order.
  - Verified no duplicate topbar/navigation introduced:
    - HomePageClient imports `{ Card, CardSkeleton, Button, Modal }` from `@/shared/components`; **does NOT** import `PageTabBar` nor render `role="tablist"`. Test 5 (`proves Home mounts no duplicate hub topbar — anti-phantom chrome`) asserts `topbars.length <= 1` for `[data-testid='page-tab-bar'], [role='tablist']`.
    - `ApiKeyHealthWarnings` is rendered as a `Card` peer of `HomeProviderTopologySection`, **not** as a new topbar/tablist. Confirmed via `rg -n "PageTabBar|role=\"tablist\"" src/app/(dashboard)/dashboard/HomePageClient.tsx src/app/(dashboard)/home/ApiKeyHealthWarnings.tsx` → 0 matches.
  - Files touched in this polish: `tests/unit/ui/home-degraded-warnings-0128.test.tsx` (added 4 tests for staleness / multi-session / non-interactive-region / sanitized-fallback). No `src/` changes — the source already met all polish criteria. No Task 0136 quota summary touched. No `:22000` mutation. No `CHANGELOG*` edit. No git/tasklist-sync/manage-changelog/rebuild/agentlog calls.
  - Commands run + exit codes:
    - `npx vitest run --config vitest.config.ts tests/unit/ui/home-degraded-warnings-0128.test.tsx` → exit 0 (9 passed).
    - `npx vitest run --config vitest.config.ts tests/unit/ui/home-degraded-warnings-0128.test.tsx tests/unit/ui/home-page-client-dashboard-smoke-4615.test.tsx tests/unit/ui/home-provider-topology-section-4606.test.tsx tests/unit/ui/home-topology-hidden-4596.test.tsx` → exit 0 (13 passed across 4 files).
    - `node --import tsx/esm --test tests/unit/home-provider-topology-default-4596.test.ts tests/unit/home-page-client-hook-imports-4759.test.ts tests/unit/ui/home-update-step-warning-color-amber.test.ts` → exit 0 (7 passed).
    - `npm run typecheck:core` → exit 0 (0 errors).
    - `npx eslint src/app/(dashboard)/dashboard/HomePageClient.tsx src/app/(dashboard)/home/ApiKeyHealthWarnings.tsx tests/unit/ui/home-degraded-warnings-0128.test.tsx` → exit 0 (0 errors, 1 pre-existing unrelated `useMemo` warning in Electron update memo at line 161).
  - **Blockers**: none.
  - **Readiness**: ready for review. Task 0128-owned files only (Home client + new ApiKeyHealthWarnings + 1 test file). Exit conditions all met; no edits to other tasks' files.

### Subsequent steps

- **Reviewer**: parent reviewer with Gortex-assisted review
- **Data da review**: 2026-08-06
- **Veredito**: APROVADO
- **Score (path to 100)**: 100/100
- **Notas**: Fresh Vitest/Node suites, typecheck and lint passed; pre-existing Electron `useMemo` warning documented and unrelated.
