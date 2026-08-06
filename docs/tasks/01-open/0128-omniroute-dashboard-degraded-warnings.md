# Task 0128: Move degraded-key alerts below provider topology

> **Status**: `[ ]` Open
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

- [ ] Existing degraded toast trigger is removed or disabled without removing health data collection.
- [ ] Inline warning component is rendered below Provider Topology.
- [ ] Tests cover empty, warning, invalid, duplicate-session, and sanitized-reason states.
- [ ] Anti-phantom chrome test proves Home mounts no duplicate hub topbar.
- [ ] `npm run typecheck:core` passes.
- [ ] `npm run lint` passes without new errors.
- [ ] Targeted Home/notification tests pass with 0 failures.
- [ ] Smoke verification runs only on `:23456` or a fixture; never mutate `:22000`.
- [ ] `.changelog/` entry is created and rebuilt.
- [ ] Completion Evidence and Review Trail are filled before promotion.

## Details

### What

Subtasks:
- [ ] **Ler código existente**: read the exact Home client, Provider Topology component, notification store, health metadata reader, and relevant UI guidance.
- [ ] Write failing component tests for no-toast and inline warning states.
- [ ] Create or extend a small warning component with accessible labels and sanitized content.
- [ ] Place it below topology without adding a second hub-level topbar.
- [ ] Remove only the notification side effect; preserve health polling/collection.
- [ ] **Refactoring pass**: keep the component data-driven and avoid duplicating DB health parsing.
- [ ] **Verificação de regressão**: run targeted tests, typecheck, lint, and `:23456` smoke proof.

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

- [ ] **Doc Accuracy**: Home and health paths verified.
- [ ] **Zod Validation**: no new external input, or validate any new props/API response.
- [ ] **Security**: sanitize provider failure reasons; no credentials.
- [ ] **Error Sanitization**: preserve existing error helpers.
- [ ] **No Raw SQL**: no route-level SQL.
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
