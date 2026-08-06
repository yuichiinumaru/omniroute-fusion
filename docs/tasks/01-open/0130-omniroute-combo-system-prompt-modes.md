# Task 0130: Add prefix and suffix modes to combo system prompts

> **Status**: `[ ]` Open
> **Priority**: 🟡 P1
> **Type**: `feature`
> **Origin**: User request — combo `system_message` currently replaces the request system prompt; operator wants override, prefix, and suffix modes.
> **Blocks**: —
> **Depends on**: —
> **Parallelism**: `serializable` — shares combo schema/UI surfaces with Tasks 0132 and 0133; bundle review or sequence.
> **Review routing**: independent + frontend-quality

## Objective

Extend combo-level system prompt configuration with explicit `override`, `prefix`, and `suffix` modes. Preserve existing behavior by defaulting old and new combos to `override`, while allowing a combo-specific reinforcement prompt to be added before or after the request’s original system messages.

## Background Context

### O que já existe:
- Combo schema exposes optional `system_message`.
- `comboAgentMiddleware.ts` applies it by removing existing system messages and inserting the combo message.
- Global settings already support prefix/suffix system prompts through `systemPrompt.ts`; that global feature must not be conflated with combo-specific behavior.
- Combo UI has a textarea labeled as a system-message override.

### O que está faltando / quebrado:
- No combo-level mode field exists.
- The upstream reference has global prefix/suffix but no verified combo-level implementation.

### False-gap check:
- This extends the existing combo system-message behavior; it does not duplicate the global system-prompt settings or payload rules.

## Test Requirements

- A legacy combo with only `system_message` MUST behave exactly as override.
- `prefix` MUST preserve original system messages and place combo text before them.
- `suffix` MUST preserve original system messages and place combo text after them.
- Empty/whitespace combo text MUST not create an empty system message.
- Global prefix/suffix ordering MUST be covered and documented, with no accidental removal of user messages.
- API/schema round-trip MUST preserve the mode.

## Exit Conditions (GDD/TDD)

- [ ] Zod schema and runtime type expose a backward-compatible `system_message_mode` enum.
- [ ] Middleware implements all three modes with deterministic ordering.
- [ ] Combo UI exposes the mode without adding a second topbar or changing unrelated fusion controls.
- [ ] API persistence/round-trip tests pass.
- [ ] Targeted middleware/schema/UI tests pass.
- [ ] `npm run typecheck:core` passes.
- [ ] `npm run lint` passes without new errors.
- [ ] `.changelog/` entry is created and rebuilt.
- [ ] Completion Evidence and Review Trail are filled before promotion.

## Details

### What

Subtasks:
- [ ] **Ler código existente**: read combo schema, `ComboLike`, `comboAgentMiddleware.ts`, `comboSetup.ts`, combo API route, combo form state/save mapping, global `systemPrompt.ts`, and existing middleware tests.
- [ ] Add failing tests for override/prefix/suffix and legacy default behavior.
- [ ] Add the mode field to schema/types/API round-trip with default override.
- [ ] Implement one pure message transformation function and use it at the existing injection point.
- [ ] Add the UI select/segmented control next to the existing textarea with accessible labels.
- [ ] **Refactoring pass**: do not duplicate global prompt injection or payload-rules logic.
- [ ] **Verificação de regressão**: targeted tests, typecheck, lint, and test-environment UI smoke proof.

### Where

| Arquivo | Propósito |
|---------|-----------|
| `src/shared/validation/schemas/combo.ts` | Ler/modificar combo mode schema. |
| `open-sse/services/combo/types.ts` | Ler/modificar runtime type. |
| `open-sse/services/comboAgentMiddleware.ts` | Implement mode-aware message merge. |
| `open-sse/services/combo/comboSetup.ts` | Pass mode at existing middleware boundary. |
| `src/app/api/combos/[id]/route.ts` | Verify persistence/round-trip. |
| `src/app/(dashboard)/dashboard/combos/page.tsx` | Modify combo UI and save mapping. |
| Existing middleware/schema tests | Create/modify regression coverage. |
| `.changelog/` | Criar entry. |

### How

1. Freeze the current override behavior in a regression test.
2. Add optional mode with default override.
3. Implement prefix/suffix as pure, tested message-list transformations.
4. Wire UI and persistence, then validate global/combo ordering.

### Why

Operators need targeted reinforcement for selected combos without destroying the client’s original system instructions or affecting every provider globally.

## Parallelism / file ownership

| Class | Detail |
|-------|--------|
| **parallel-safe** | Safe beside provider-only tasks. |
| **serializable** | Sequence with Tasks 0132 and 0133 because they modify combo schema/form surfaces. |
| **Collision** | `combo.ts` schema, combo page, combo middleware tests. |

## ⛔ Anti-Hallucination Guardrails

> Do not implement prefix/suffix through payload rules. Do not change global prompt semantics. Default MUST remain override. Read actual message ordering and tests before editing.

## 🛡️ Compliance Checklist

- [ ] **Doc Accuracy**: field names and injection point verified.
- [ ] **Zod Validation**: mode is strict enum with safe default.
- [ ] **Security**: user prompt content is not logged.
- [ ] **Error Sanitization**: existing API error path preserved.
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
