# Task 0120: Add `composer-v2.5` to CURSOR_MODEL_ALIASES normalization map

> **Status**: `[ ]` Open
> **Priority**: 🔴 P0
> **Type**: `remediation`
> **Origin**: User report (2026-07-24) — Cursor provider model `composer-v2.5` (with the literal "v") does not work through OpenCode harness via OmniRoute. Root cause confirmed by forensic investigation (codebase-investigator session 2026-07-24).
> **Blocks**: —
> **Depends on**: —
> **Parallelism**: `parallel-safe` — touches only `open-sse/utils/cursorAgentProtobuf.ts`; no other in-flight task edits this file.
> **Review routing**: `independent`

---

## Objective

Normalize the model ID `composer-v2.5` to `composer-2.5` so that Cursor's protobuf server receives a recognized model name. After the fix, sending `composer-v2.5` (with the "v") from any client (OpenCode or otherwise) should produce the same behavior as `composer-2.5`.

A worker that reads ONLY this section must know the task is complete when: (a) a unit test asserts that `normalizeCursorModelId("composer-v2.5")` returns `"composer-2.5"`, (b) the change is one line in the alias map, and (c) live test confirms the model works.

## Background Context

### What already exists:
- `open-sse/utils/cursorAgentProtobuf.ts:388-396` — `CURSOR_MODEL_ALIASES` table maps variants to canonical `composer-2.5` / `composer-2.5-fast`.
- Current aliases include: `""` → `composer-2.5`, `"composer-2-5"` → `composer-2.5`, `"composer-2.5-sdk"` → `composer-2.5`, `"composer-latest"` → `composer-2.5`. Fast variants similarly.
- `open-sse/utils/cursorAgentProtobuf.ts` — `normalizeCursorModelId()` returns the input unchanged if no alias matches.
- `open-sse/executors/cursor.ts:327-332` — `isComposerModel()` checks if the model ID starts with "composer" (case-insensitive), so `composer-v2.5` IS recognized as a composer model and the tool call parser is activated.
- The remaining gap: the ID `composer-v2.5` (hyphenated "v") is not normalized before being sent to Cursor's protobuf server.

### What is missing / broken:
- The `CURSOR_MODEL_ALIASES` table lacks the `composer-v2.5` → `composer-2.5` entry.
- `composer-v2.5` is sent unchanged to Cursor's server which may reject it as an unknown model ID.
- Likely also missing: `composer-v2.5-fast` and `composer-v2-latest` (apply same hyphen-v normalization for consistency).

---

## Test Requirements

- [ ] Unit test: `normalizeCursorModelId("composer-v2.5")` returns `"composer-2.5"`.
- [ ] Unit test: `normalizeCursorModelId("composer-v2.5-fast")` returns `"composer-2.5-fast"`.
- [ ] Unit test: `normalizeCursorModelId("composer-v2-latest")` returns `"composer-2.5"`.
- [ ] Unit test: existing aliases (empty string, `composer-2-5`, `composer-2.5-sdk`, `composer-latest`) still resolve correctly (regression).
- [ ] Unit test: unknown IDs (e.g. `gpt-4`, `claude-sonnet-4`) pass through unchanged (regression).
- [ ] Live test on `:22000`: configure Cursor provider, send a request with `composer-v2.5` model, confirm non-error response (use a test account; do not use the operator's main credentials).

---

## Exit Conditions (GDD/TDD)

> OmniRoute npm matrix — see `docs/tasks/OMNIROUTE-CREATE-TASKS-EXITS.md`.
> Do **not** require cargo check/test for this stack.

- [ ] `CURSOR_MODEL_ALIASES` table in `open-sse/utils/cursorAgentProtobuf.ts:388-396` updated with at least `"composer-v2.5": "composer-2.5"`. (Optionally extend to `composer-v2.5-fast` and `composer-v2-latest`.) File:line captured in Completion Evidence.
- [ ] New unit tests at `tests/unit/cursor-model-aliases.test.ts` covering all 6 test requirements; all pass.
- [ ] Existing `tests/unit/cursor*.test.ts` and `tests/unit/executor-cursor*.test.ts` still pass (regression).
- [ ] `node --import tsx/esm --test tests/unit/cursor-model-aliases.test.ts` passes with 0 failures.
- [ ] `npm run typecheck:core` passes without errors.
- [ ] `npm run lint` passes without **new** errors.
- [ ] Bug fix: Hard Rule #18 — failing-then-passing test captured in Completion Evidence.
- [ ] Entrada no ledger `.changelog/` via manage-changelog + `rebuild.sh build`.
- [ ] Completion Evidence filled with real npm command output.

---

## Details

### What

Subtasks:
- [ ] **Ler código existente**: `open-sse/utils/cursorAgentProtobuf.ts:380-410` (alias table + `normalizeCursorModelId`), `open-sse/executors/cursor.ts:325-340` (`isComposerModel`), existing `tests/unit/cursor-*.test.ts` if present.
- [ ] **Confirm the diagnosis** by reading the alias table and confirming the missing entries. (Investigator's report was confident; this is verification.)
- [ ] **Add the alias entries** to `CURSOR_MODEL_ALIASES`. At minimum: `"composer-v2.5": "composer-2.5"`. Consider also `"composer-v2.5-fast": "composer-2.5-fast"` and `"composer-v2-latest": "composer-2.5"` for symmetry.
- [ ] **Add failing test** for `composer-v2.5`. Run; confirm it fails.
- [ ] **Re-run**; confirm pass.
- [ ] **Run regression suites**.
- [ ] **Live test on `:22000`** if a test Cursor account is available; otherwise rely on the unit test.
- [ ] **Refactoring pass**.
- [ ] **Verificação de regressão**.

### Where

| File | Purpose |
|------|---------|
| `open-sse/utils/cursorAgentProtobuf.ts` | Modify — add alias entries. |
| `tests/unit/cursor-model-aliases.test.ts` | Create — TDD tests. |
| `.changelog/0120-omniroute-cursor-composer-v2-alias.md` | Create — manage-changelog entry. |

### How

1. Read every file in the Where table.
2. Read the alias table at lines 388-396 and confirm what is and isn't there.
3. Add the entries (one or more).
4. Write failing test FIRST. Run; capture output.
5. Re-run after edit; confirm pass.
6. `npm run typecheck:core`, `npm run lint`.
7. Live test on `:22000` if feasible.
8. Create `.changelog/` entry + `rebuild.sh build`.

### Why

This is a one-line fix that unblocks the `composer-v2.5` model for every client. The investigation confirmed that the alias map is the only place where the normalization happens, and adding the entry is a non-invasive change with high probability of working. The unit test guards against regression when upstream adds more aliases.

---

## Parallelism / file ownership

| Class | Detail |
|-------|--------|
| **parallel-safe** | May run with 0117, 0118, 0119, 0121, 0122, 0123, 0124, 0125. No file overlap. |
| **serializable** | — |
| **Collision** | — |

---

## ⛔ Anti-Hallucination Guardrails

> **MANDATORY for P0/P1 tasks.**

> [!CAUTION]
> DO NOT mark complete without the failing-then-passing unit test capture in Completion Evidence.
> PORT 21000 = production — never docker-rm / restart / mutate.

> [!IMPORTANT]
> Read every file in the "Where" table before writing.

---

## 🛡️ Compliance Checklist (Leis Primárias do AGENTS.md)

- [ ] **Doc Accuracy**: alias table is internal; no docs to update.
- [ ] **Zod Validation**: no schema changes.
- [ ] **Security**: no secrets involved.
- [ ] **Error Sanitization**: no error responses.
- [ ] **No Raw SQL**: no DB changes.
- [ ] **Archive Protocol**: no deletions.

---

## 📋 Completion Evidence (preenchido pelo agente executor)

- **Arquivos criados/modificados**:
  - `open-sse/utils/cursorAgentProtobuf.ts`: lines 389-398 (added `"composer-v2.5": "composer-2.5"`, `"composer-v2-latest": "composer-2.5"`, `"composer-v2.5-fast": "composer-2.5-fast"`)
  - `tests/unit/cursor-model-aliases.test.ts`: created (24 lines)
- **Testes que verificam o trabalho**:
  - `normalizeCursorModelId maps composer-v2.5 variants to canonical model IDs` (`tests/unit/cursor-model-aliases.test.ts`)
  - `normalizeCursorModelId preserves existing composer model aliases` (`tests/unit/cursor-model-aliases.test.ts`)
  - `normalizeCursorModelId passes through unknown IDs unchanged` (`tests/unit/cursor-model-aliases.test.ts`)
  - `normalizeCursorModelId canonicalizes composer spelling variants` (`tests/unit/cursor-agent-protobuf.test.ts`)
  - `resolveRequestedModel maps cursor-agent's client-side aliases` (`tests/unit/cursor-agent-protobuf.test.ts`)
  - `resolveRequestedModel normalizes variants then applies auto/-fast rules` (`tests/unit/cursor-agent-protobuf.test.ts`)
- **Resultado dos testes (fail→pass)**:
  - Command: `node --import tsx/esm --test tests/unit/cursor-model-aliases.test.ts`
  - FAIL (pre-fix):
    ```text
    ✖ normalizeCursorModelId maps composer-v2.5 variants to canonical model IDs (2.508751ms)
      AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
      + actual - expected
      + 'composer-v2.5'
      - 'composer-2.5'
    ```
  - PASS (post-fix):
    ```text
    ✔ normalizeCursorModelId maps composer-v2.5 variants to canonical model IDs (0.868534ms)
    ✔ normalizeCursorModelId preserves existing composer model aliases (0.122711ms)
    ✔ normalizeCursorModelId passes through unknown IDs unchanged (0.09558ms)
    ℹ tests 3 | pass 3 | fail 0
    ```
- **Resultado das regression suites**:
  - Command: `node --import tsx/esm --test tests/unit/cursor*.test.ts tests/unit/executor-cursor*.test.ts`
  - PASS count: 169 tests passed, 0 failed.
- **Resultado do lint**:
  - Command: `npx eslint open-sse/utils/cursorAgentProtobuf.ts tests/unit/cursor-model-aliases.test.ts`
  - Result: PASS (0 errors)
- **Resultado do typecheck/build**:
  - Command: `npm run typecheck:core`
  - Result: PASS (0 errors)
- **Live test no :22000**: STALLED (No Cursor test account available; verified via TDD unit tests per Hard Rule #18)
- **Entrada no changelog**: Deferred to builder-orchestrator parent per compact subagent-onboard contract.
- **Agente executor**: `gt-ts-engineer`
- **Data de conclusão**: 2026-07-25

---

## 🔍 Review Trail (preenchido pelo reviewer)

- **Reviewer**: [nome/role — DEVE ser diferente do executor]
- **Data da review**: [YYYY-MM-DD]
- **Veredito**: APROVADO / REJEITADO
- **Score (path to 100)**: [0-100]
- **Notas**: [evidence-based, citar arquivos/linhas]
- **Se REJEITADO**: mover para `02-doing/` com motivo documentado no topo.
