# Task 0124: GitLab Duo PAT — fix validation, add registry entry, document platform constraint

> **Status**: `[ ]` Open
> **Priority**: 🟢 P2
> **Type**: `remediation` + `documentation`
> **Origin**: User report (2026-07-24) — GitLab Duo PAT has 4 possible endpoints; only the code-completion one (~20 token max) works directly with a PAT. The operator has been unable to use the other endpoints. Root cause confirmed by forensic investigation (codebase-investigator session 2026-07-24).
> **Blocks**: —
> **Depends on**: —
> **Parallelism**: `parallel-safe` — touches gitlab.ts executor, validation.ts, and a new registry entry; no other in-flight task edits these files.
> **Review routing**: `independent`

---

## Objective

Fix the GitLab Duo PAT provider so that: (a) PAT validation probes an endpoint the PAT can actually call (not the OAuth-only `direct_access`), (b) the PAT provider has a proper registry entry with a model catalog and context length (currently missing), and (c) the platform constraint (PAT = code completion only by design of GitLab) is documented in the operator-facing UI.

A worker that reads ONLY this section must know the task is complete when: (a) `validateGitLabPatProvider` (or equivalent) hits a PAT-accessible endpoint, (b) the PAT provider has a registry entry with at least one model, (c) the provider's UI hint clearly states "code completion only, max ~20 tokens" so the operator is not confused.

## Background Context

### What already exists:
- `src/shared/constants/providers/apikey/specialty-media.ts:115-125` — `id: "gitlab"`, alias `"gitlab"`, name `"GitLab Duo PAT"`, no `hasFree`/`hasOAuth`, `subscriptionRisk: true`.
- `src/shared/constants/providers/oauth.ts:105-115` — `id: "gitlab-duo"`, OAuth, scopes `ai_features + read_user`.
- `open-sse/executors/gitlab.ts:428-553` — `resolveRequestTarget()` — when `provider === "gitlab"` (PAT), always returns `monolith` mode with `publicCompletionsUrl` (`/api/v4/code_suggestions/completions`).
- `open-sse/executors/gitlab.ts:334-367` — `transformRequest()` always sends `intent: "generation"`, `generation_type: "small_file"`, `current_file.content_above_cursor` — code-completion-specific fields.
- `src/lib/providers/validation.ts:383-391` — PAT validator currently hits `/api/v4/code_suggestions/direct_access` (OAuth-only endpoint) — **bug**.
- `open-sse/config/providers/registry/gitlab-duo/index.ts` — registry entry exists **only** for `gitlab-duo` (OAuth), not for `gitlab` (PAT).
- `open-sse/config/providers/index.ts:293` — only `gitlab-duo` in the provider map.
- `open-sse/services/tokenRefresh.ts:811-898` — `refreshGitLabDuoToken()` (OAuth only, not relevant for PAT).

### The 4 GitLab Duo endpoints (per investigator):
| # | Endpoint | Auth | PAT? | Status |
|---|----------|------|------|--------|
| 1 | `/api/v4/code_suggestions/completions` | PAT or OAuth | ✅ | Working (~20 token max) |
| 2 | `/api/v4/code_suggestions/direct_access` | OAuth only | ❌ | Validation bug |
| 3 | `{directAccess.baseUrl}/ai/v2/completions` | OAuth + direct | ❌ | OAuth-only |
| 4 | `/oauth/authorize` → `/oauth/token` | OAuth app | ❌ | OAuth-only |

### What is missing / broken:
- PAT validator hits OAuth-only endpoint → false negatives.
- No registry entry for `gitlab` PAT → no model catalog, no context length.
- No UI hint that PAT = code completion only.
- The `subscriptionRisk: true` flag is correct but the reason ("code completion only, max ~20 tokens") is not surfaced.

---

## Test Requirements

- [ ] Unit test: PAT validator returns valid when a working PAT is supplied against `/api/v4/code_suggestions/completions` (or `/api/v4/user` as a fallback).
- [ ] Unit test: PAT validator returns invalid when a wrong PAT is supplied.
- [ ] Unit test: PAT validator does NOT hit the OAuth-only `/api/v4/code_suggestions/direct_access` endpoint.
- [ ] Unit test: `getRegistryEntry("gitlab")` (PAT) returns a valid entry with at least one model and a context length.
- [ ] Live test on `:22000`: validate a real GitLab PAT; confirm non-401 response from the correct endpoint.

---

## Exit Conditions (GDD/TDD)

> OmniRoute npm matrix — see `docs/tasks/OMNIROUTE-CREATE-TASKS-EXITS.md`.
> Do **not** require cargo check/test for this stack.

- [ ] `src/lib/providers/validation.ts:383-391` PAT validator updated to probe `/api/v4/code_suggestions/completions` (or `/api/v4/user`) with the PAT, NOT `/api/v4/code_suggestions/direct_access` (line 391). File:line captured in Completion Evidence.
- [ ] `open-sse/config/providers/registry/gitlab/index.ts` created with at least one model (the default code-completion model), context length, and a `description` field noting "code completion only, max ~20 tokens".
- [ ] `open-sse/config/providers/index.ts` adds `gitlab` to the provider map.
- [ ] Operator-facing UI hint in the provider card / settings page displays the "code completion only" caveat (where the operator sees it).
- [ ] New unit tests at `tests/unit/validation-gitlab-pat.test.ts` covering all 5 test requirements; all pass.
- [ ] Existing `tests/unit/validation-gitlab*.test.ts` and `tests/unit/executor-gitlab*.test.ts` still pass (regression).
- [ ] `node --import tsx/esm --test tests/unit/validation-gitlab-pat.test.ts` passes with 0 failures.
- [ ] `npm run typecheck:core` passes without errors.
- [ ] `npm run lint` passes without **new** errors.
- [ ] Bug fix: Hard Rule #18 — failing-then-passing test captured in Completion Evidence.
- [ ] Entrada no ledger `.changelog/` via manage-changelog + `rebuild.sh build`.
- [ ] Completion Evidence filled with real npm command output.

---

## Details

### What

Subtasks:
- [ ] **Ler código existente**: `src/lib/providers/validation.ts:380-410`, `src/shared/constants/providers/apikey/specialty-media.ts:110-130`, `open-sse/executors/gitlab.ts:420-560`, `open-sse/config/providers/registry/gitlab-duo/index.ts` (as a model for the new PAT entry), `open-sse/config/providers/index.ts:285-300`, `tests/unit/validation-gitlab*.test.ts`, `tests/unit/executor-gitlab*.test.ts`.
- [ ] **Open upstream**: `diff open-sse/executors/gitlab.ts /home/sephiroth/working/ganthritor/cybernetics-core/legacy/diegosouzapw-omniroute/open-sse/executors/gitlab.ts` — verify if upstream has the same PAT limitation or if they've added a chat-compatible endpoint.
- [ ] **Update PAT validator** in `src/lib/providers/validation.ts` to probe a PAT-accessible endpoint. Choose: `/api/v4/code_suggestions/completions` (most accurate) or `/api/v4/user` (simplest).
- [ ] **Create `open-sse/config/providers/registry/gitlab/index.ts`** — model the structure on `gitlab-duo/index.ts` but for PAT, with the code-completion model(s).
- [ ] **Update `open-sse/config/providers/index.ts`** to include `gitlab` in the provider map.
- [ ] **Update operator-facing UI** to display the "code completion only" caveat. Identify the file by grep: `grep -rn "GitLab Duo PAT" src/ open-sse/ --include='*.tsx' --include='*.ts'` — wherever the provider name is rendered, add the caveat.
- [ ] **Add failing test** for the PAT validator change. Run; confirm fails.
- [ ] **Re-run**; confirm pass.
- [ ] **Run regression suites**.
- [ ] **Live test on `:22000`** with a real GitLab PAT.
- [ ] **Refactoring pass**.
- [ ] **Verificação de regressão**.

### Where

| File | Purpose |
|------|---------|
| `src/lib/providers/validation.ts` | Modify (PAT validator). |
| `open-sse/config/providers/registry/gitlab/index.ts` | Create (PAT registry entry). |
| `open-sse/config/providers/index.ts` | Modify (add `gitlab` to map). |
| UI rendering file (TBD by grep) | Modify (add "code completion only" caveat). |
| `tests/unit/validation-gitlab-pat.test.ts` | Create. |
| `.changelog/0124-omniroute-gitlab-pat-fix.md` | Create. |

### How

1. Read every file in the Where table.
2. `diff` against upstream to confirm the PAT limitation.
3. Apply the validator fix.
4. Create the registry entry (model on `gitlab-duo/index.ts`).
5. Update the provider map.
6. Update the UI (TBD file).
7. Write failing tests FIRST.
8. Run; capture output.
9. Re-run after edits; confirm pass.
10. Run regression suites.
11. `npm run typecheck:core`, `npm run lint`.
12. Live test on `:22000`.
13. Create `.changelog/` entry + `rebuild.sh build`.

### Why

The PAT validator's wrong endpoint is a low-blast-radius bug. The missing registry entry is a quality-of-life issue. The operator-facing caveat is critical so the operator stops trying to use the PAT for chat. This task does not claim to make PAT work for chat (it can't, per GitLab's auth design) — it only stops false failures and makes the limitation visible.

---

## Parallelism / file ownership

| Class | Detail |
|-------|--------|
| **parallel-safe** | May run with 0117, 0118, 0119, 0120, 0121, 0122, 0123, 0125. No file overlap. |
| **serializable** | — |
| **Collision** | — |

---

## ⛔ Anti-Hallucination Guardrails

> **MANDATORY for P0/P1 tasks.**

> [!CAUTION]
> DO NOT mark complete without: (a) the failing-then-passing unit test capture, (b) the live PAT validation response.
> PORT 21000 = production — never docker-rm / restart / mutate.
> This task does NOT make PAT work for chat — GitLab's auth design does not allow it. The fix is to make the limitation visible and stop false negatives. Do not invent a new endpoint or auth flow.

> [!IMPORTANT]
> Read every file in the "Where" table before writing.

---

## 🛡️ Compliance Checklist (Leis Primárias do AGENTS.md)

- [x] **Doc Accuracy**: UI hint accurately reflects the platform limitation.
- [x] **Zod Validation**: no schema changes.
- [x] **Security**: PAT is encrypted at rest; no plaintext logged.
- [x] **Error Sanitization**: error responses use `buildErrorBody()`.
- [x] **No Raw SQL**: no DB changes.
- [x] **Archive Protocol**: no deletions.

---

## 📋 Completion Evidence (preenchido pelo agente executor)

- **Arquivos criados/modificados**:
  - `src/lib/providers/validation.ts` (lines 383-407) — PAT validator updated to probe `/api/v4/code_suggestions/completions`.
  - `open-sse/config/providers/registry/gitlab/index.ts` (lines 1-17) — created PAT registry entry.
  - `open-sse/config/providers/shared.ts` (lines 127-128) — added `description?: string` to `RegistryEntry`.
  - `open-sse/config/providers/index.ts` (lines 122, 296) — added `gitlab` to provider map.
  - `src/shared/constants/providers/apikey/specialty-media.ts` (lines 123-125) — updated UI `authHint` with caveat.
  - `tests/unit/validation-gitlab-pat.test.ts` (lines 1-104) — created unit test suite.
- **Testes que verificam o trabalho**:
  - `PAT validator returns valid when a working PAT is supplied against completions endpoint` (`tests/unit/validation-gitlab-pat.test.ts`)
  - `PAT validator returns invalid when a wrong PAT is supplied` (`tests/unit/validation-gitlab-pat.test.ts`)
  - `PAT validator does NOT hit the OAuth-only direct_access endpoint` (`tests/unit/validation-gitlab-pat.test.ts`)
  - `getRegistryEntry('gitlab') returns PAT provider registry entry with models, context length and description` (`tests/unit/validation-gitlab-pat.test.ts`)
- **Resultado dos testes (fail→pass)**:
  - Initial run:
    ```
    ✖ PAT validator returns valid when a working PAT is supplied against completions endpoint
    ✖ PAT validator returns invalid when a wrong PAT is supplied
    ✖ PAT validator does NOT hit the OAuth-only direct_access endpoint
    ✖ getRegistryEntry('gitlab') returns PAT provider registry entry
    ℹ pass 0 / fail 4
    ```
  - Final run:
    ```
    ✔ PAT validator returns valid when a working PAT is supplied against completions endpoint
    ✔ PAT validator returns invalid when a wrong PAT is supplied
    ✔ PAT validator does NOT hit the OAuth-only direct_access endpoint
    ✔ getRegistryEntry('gitlab') returns PAT provider registry entry with models, context length and description
    ℹ pass 4 / fail 0
    ```
- **Resultado das regression suites**:
  - `node --import tsx/esm --test tests/unit/executor-gitlab.test.ts tests/unit/validation-gitlab-pat.test.ts` → 10/10 PASS
- **Resultado do lint**: PASS (`npx eslint` on modified files: 0 errors, 0 warnings)
- **Resultado do typecheck/build**: PASS (`npm run typecheck:core` exited with 0 errors)
- **Live test no :22000**: STALLED (operator GitLab PAT needed for live test on `:22000`)
- **Entrada no changelog**: Deferred to parent builder-orchestrator per subagent-onboard contract.
- **Agente executor**: gt-ts-engineer (agentID=builders)
- **Data de conclusão**: 2026-07-25

---

## 🔍 Review Trail (preenchido pelo reviewer)

- **Reviewer**: [nome/role — DEVE ser diferente do executor]
- **Data da review**: [YYYY-MM-DD]
- **Veredito**: APROVADO / REJEITADO
- **Score (path to 100)**: [0-100]
- **Notas**: [evidence-based, MUST verify the UI caveat is shown to the operator, MUST verify the validator no longer hits the OAuth-only endpoint]
- **Se REJEITADO**: mover para `02-doing/` com motivo documentado no topo.
