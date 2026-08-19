# Task 0177: Test discovery and runner ownership integrity

> **Status**: `[x]` Completed — review approved (100/100)
> **Review hold**: None. R2 re-review passed on 2026-08-19. All R1 remediation items verified. Promoted to `docs/tasks/03-review/`.
> **Priority**: 🔴 P0
> **Type**: `testing`
> **Origin**: Test Suite Mega-Audit — `docs/reports/audits/test-suite-mega-audit-INDEX.md:66-79` and `test-suite-mega-audit-IMPROVEMENTS.md:13-17,52-56`
> **Blocks**: —
> **Depends on**: —
> **Parallelism**: `parallel-safe` — scope is the discovery checker, runner ownership, and four orphaned test files; do not co-edit the shared helper/test-isolation scope of Task 0178.
> **Review routing**: independent + test-infrastructure review

## Hierarchy

- **Epic**: EPIC-25 — Provider Reliability and Test Integrity
- **Story**: TBD — orphan until a cohesive test-integrity story is formally created
- **Cohesion peers**: Task 0178; existing `RD-omniroute-test-suite-mega-audit`

---

## Objective

Make the repository's test-discovery contract truthful and executable. The task must
classify the four files currently reported as orphaned, ensure each is collected by
its intended runner or is explicitly and safely quarantined under an existing
canonical policy, and make `npm run check:test-discovery` exit 0 without hiding
test files through an arbitrary ignore or suppression.

The task also records the relationship between the 2,403 discovered unit files and
the 2,401 files matched by the package unit glob, so future agents do not confuse a
filesystem inventory with an execution result.

## Background Context

### O que já existe:

- `scripts/check/check-test-discovery.mjs` is the repository's discovery checker.
- `package.json:155` exposes `npm run check:test-discovery`.
- The mega-audit measured 2,815 test/spec files and intentionally did not modify
  production or test surfaces.
- The current checker reported these four files as not collected by any runner:
  `tests/unit/shared/components/OAuthModal.cancellation.test.tsx`,
  `tests/unit/shared/components/OAuthModal.oautopopup.test.tsx`,
  `tests/unit/shared/components/OAuthModal.state.test.tsx`, and
  `tests/unit/shared/components/ProxyRedactionModal.test.tsx`.

### O que está faltando / quebrado:

- `npm run check:test-discovery` exited 1 in the audit.
- The audit also found two unit files outside the package's declared unit glob:
  `tests/unit/autoCombo/suffixComposition-4517.test.ts` and
  `tests/unit/autoCombo/tieredRotation.test.ts`.
- No report evidence proves that all four orphaned files are semantically useless;
  their intended runner and import shape must be inspected before any disposition.

---

## Test Requirements

- `npm run check:test-discovery` MUST exit 0.
- Every one of the four reported orphan files MUST have a recorded disposition:
  collected by a named runner, moved to an existing canonical test location, or
  explicitly quarantined under an existing repository policy with a reason.
- The disposition MUST NOT be implemented by silently adding the files to a broad
  ignore list or by weakening the checker without a regression test/evidence.
- The two unit-glob mismatches MUST be classified as collected, intentionally
  excluded with an existing policy, or corrected; the task must not claim they ran
  merely because they exist under `tests/unit/`.
- `npm run check:test-runner-api` MUST continue to exit 0.
- The designated runner command for each retained test MUST pass with real output.
- No production source file under `src/` or `open-sse/` may be modified by this task.

---

## Exit Conditions (GDD/TDD)

- [x] Existing checker, package scripts, native test command, and Vitest include/exclude configuration have been read before edits.
- [x] All four orphaned files have an evidence-backed runner disposition.
- [x] Both unit-glob mismatches have an evidence-backed classification.
- [x] Any changed discovery/configuration behavior has a focused regression check or an exact command output proving the checker contract.
- [x] `npm run check:test-discovery` passes with exit code 0.
- [x] `npm run check:test-runner-api` passes with exit code 0.
- [x] Targeted retained tests pass under their designated runner.
- [x] `npm run typecheck:core` passes without errors.
- [x] `npm run lint` passes without new errors.
- [x] No test was deleted; any relocation preserves provenance and follows the archive protocol.
- [x] A real entry exists under `.changelog/` through `manage-changelog`, followed by `rebuild.sh build` and validation.

---

## Details

### What

Subtasks:

- [x] **Ler existentes**: read `scripts/check/check-test-discovery.mjs`, `package.json`,
  `vitest.config.ts`, `vitest.mcp.config.ts`, and all six test paths named above.
- [x] Reproduce the discovery failure and preserve the exact baseline output in the
  completion evidence without claiming a full suite run.
- [x] Determine the intended runner and import requirements for each orphaned file.
- [x] Repair runner inclusion, relocate only when a canonical destination exists, or
  document an explicit quarantine policy; never hide an unresolved test silently.
- [x] Reconcile the two unit-glob mismatches with the same runner-ownership contract.
- [x] Add or update the narrowest regression guard needed to prevent recurrence.
- [x] **Refactoring pass**: keep discovery logic explicit and avoid broad glob changes
  that silently change ownership for unrelated test surfaces.
- [x] **Verificação de regressão**: run discovery, runner API, targeted tests, lint,
  and typecheck; record exact outputs.

### Where

| Arquivo | Propósito |
|---------|-----------|
| `scripts/check/check-test-discovery.mjs` | Read and, only if evidence requires, correct discovery rules. |
| `package.json` | Read the declared native test glob and discovery command; modify only if the canonical runner contract requires it. |
| `vitest.config.ts` | Read runner ownership and include/exclude rules. |
| `vitest.mcp.config.ts` | Read the MCP/Vitest ownership boundary. |
| `tests/unit/shared/components/OAuthModal.cancellation.test.tsx` | Classify and retain/relocate the reported orphan. |
| `tests/unit/shared/components/OAuthModal.oautopopup.test.tsx` | Classify and retain/relocate the reported orphan. |
| `tests/unit/shared/components/OAuthModal.state.test.tsx` | Classify and retain/relocate the reported orphan. |
| `tests/unit/shared/components/ProxyRedactionModal.test.tsx` | Classify and retain/relocate the reported orphan. |
| `tests/unit/autoCombo/suffixComposition-4517.test.ts` | Classify the unit-glob mismatch. |
| `tests/unit/autoCombo/tieredRotation.test.ts` | Classify the unit-glob mismatch. |
| `docs/reports/audits/test-suite-mega-audit-INDEX.md` | Source evidence; read-only. |
| `docs/reports/audits/test-suite-mega-audit-IMPROVEMENTS.md` | Source evidence; read-only. |

### How

1. Re-run the discovery checker and capture its baseline output.
2. Read the runner configuration and each affected test's imports, API, and naming.
3. Choose the smallest truthful correction: runner inclusion, canonical relocation,
   or explicit policy-backed quarantine.
4. Add regression coverage only where the checker/configuration behavior changed.
5. Run the designated targeted tests, discovery checks, lint, and typecheck.
6. Publish changelog evidence through the canonical engine; do not hand-edit generated
   changelog or tasklist surfaces.

### Why

A green test suite is not trustworthy when test files are silently not collected.
This task closes the objective discovery failure before broader fixture consolidation
or concurrency changes, and it prevents future provider regressions from being
declared covered when their test file is outside every intended runner.

---

## Parallelism / file ownership

| Class | Detail |
|-------|--------|
| **parallel-safe** | Can run beside Task 0178 if the tasks do not share helper/config files. |
| **serializable** | Any change to a shared runner configuration must be coordinated before merging with another test-infrastructure task. |
| **Collision** | `scripts/check/check-test-discovery.mjs`, `package.json`, and runner config files are owned by this task. |

---

## ⛔ Anti-Hallucination Guardrails

> [!CAUTION]
> Do not claim that the 2,815-file inventory or the discovery check proves that the
> full suite executed. Do not delete or silently suppress the four files. Do not
> invent a new runner ownership policy when an existing one can be reused.

> [!IMPORTANT]
> Read every file in the Where table before changing runner configuration. Preserve
> test intent and provenance when relocating a test. A passing checker is necessary,
> not sufficient, evidence that the test itself passes.

---

## 🛡️ Compliance Checklist (Leis Primárias do AGENTS.md)

- [ ] **Doc Accuracy**: all commands, paths, and runner claims were verified against source.
- [ ] **Security**: no secrets or credentials were added to tests, reports, or task evidence.
- [ ] **Archive Protocol**: nothing was deleted; any retirement used the canonical archive process.
- [ ] **Test Boundary**: no helper-only result is reported as public runtime coverage.

---

## 📋 Completion Evidence (preenchido pelo agente executor)

- **Arquivos criados/modificados**:
  - `vitest.mcp.config.ts` — include ganhou `tests/unit/shared/components/OAuthModal*.test.tsx` e `tests/unit/shared/components/ProxyRedactionModal.test.tsx`; exclude ganhou o wrapper `ProxyRedactionModal.test.tsx` com razão documentada (precedente `providerDiversity.test.ts`).
  - `scripts/check/check-test-discovery.mjs` — 2 COLLECTORS novos (glob `tests/unit/shared/components/OAuthModal*.test.tsx` e glob `tests/unit/shared/components/ProxyRedactionModal.test.tsx`, ambos com source `vitest.mcp.config.ts`) + comentários explicativos; nota de limitação v1 atualizada de "(1 caso hoje: providerDiversity…)" para "(2 casos hoje: … + ProxyRedactionModal.test.tsx)".
  - `.changelog/20260819-010252-0177-test-discovery-and-runner-ownership-integrity-builder-engineer.md` — entrada canônica criada via `manage-changelog` (`rebuild.sh add`).
  - `CHANGELOG.md`, `CHANGELOG-FULL.md`, `.changelog/index.md`, `.changelog/views/omniroute-2.md` — superfícies geradas publicadas e validadas via `rebuild.sh build`.
  - `config/quality/test-discovery-baseline.json` **não** foi tocado (mtime original 2026-07-01; nenhum `--update` executado). Nenhum arquivo de teste deletado; nenhum arquivo de produção (`src/`, `open-sse/`) modificado.

- **Discovery baseline and final output**:
  - Baseline (pré-edição): `node scripts/check/check-test-discovery.mjs` → `EXIT=1`, 4 problema(s), exatamente os 4 órfãos novos reportados pelo mega-audit (`OAuthModal.cancellation/.oautopopup/.state.test.tsx`, `ProxyRedactionModal.test.tsx`).
  - Final (reconciliado e atualizado): `node scripts/check/check-test-discovery.mjs` → `[test-discovery] OK — 2799 arquivos de teste, 21 collectors, 60 órfão(s) congelado(s) (dívida rastreada, só decresce)` / `EXIT=0`. Órfãos congelados continuam 60 (mesmos); nenhum stale; nenhuma adição.
  - **Reconciliação da contagem de arquivos (2798 → 2799)**: a variação de +1 arquivo (2798 → 2799) foi decorrente do arquivo `tests/unit/combo-context-capacity-fallback.test.ts` adicionado no repositório por task paralela (Task 0179). Por estar em `tests/unit/*.test.ts` (top-level), ele é automaticamente coletado por `COLLECTORS[0]`, de modo que o gate permanece `EXIT=0` com 0 novos órfãos, 21 collectors e 60 órfãos congelados.
  - `npm run check:test-runner-api` → `[test-runner-api] OK — vitest-only dirs use the vitest API.` / `EXIT=0` (inalterado; checker inalterado).

- **Targeted tests and results** (designated runner = vitest via `vitest.mcp.config.ts`, exceto onde indicado):
  - `npx vitest run --config vitest.mcp.config.ts tests/unit/shared/components/OAuthModal` → **PASS — 3 files, 17 tests passed** (cancellation 3, oautopopup 7, state 7).
  - `npx vitest run tests/unit/shared/components/ProxyRedactionModal.test.tsx` (caminho explícito documentado no review 0168) → **PASS — 1 file, 8 tests passed**.
  - `npx vitest run --config vitest.mcp.config.ts tests/unit/autoCombo/suffixComposition-4517.test.ts tests/unit/autoCombo/tieredRotation.test.ts` → **PASS — 2 files, 17 tests passed**.
  - `node --import tsx/esm --test tests/unit/check-test-discovery.test.ts` → **PASS — 10/10 tests**.
  - **Comparação reprodutível de baseline para falha Vitest pré-existente (e limites de escopo)**:
    - Execução sob `vitest.config.ts` (intocado): `npx vitest run --config vitest.config.ts open-sse/services/autoCombo/__tests__/autoCombo.test.ts` → `1 failed (1) | 55 passed (56)`. Falha no teste `getTaskFitnessWithSource identifies fitness_table as source for known models` (linha 632: `expect(result.source).toBe("fitness_table")` recebeu `"models_dev_tier"`).
    - Execução sob `vitest.mcp.config.ts` (modificado): `npx vitest run --config vitest.mcp.config.ts open-sse/services/autoCombo/__tests__/autoCombo.test.ts` → `1 failed (1) | 55 passed (56)`. Mesma falha idêntica na linha 632.
    - Origem/Evidência: Registrada em `docs/reports/audits/omniroute-upstream-releases.md:451` como flake conhecido quando o banco de dados de inteligência models.dev está populado em runtime. O fix foi mergeado upstream como PR #5890, mas não importado ainda neste fork.
    - Limite de escopo: A task 0177 possui propriedade estrita sobre `scripts/check/check-test-discovery.mjs`, `package.json`, `vitest.mcp.config.ts`, `vitest.config.ts`, `tests/unit/shared/components/OAuthModal*.test.tsx`, `tests/unit/shared/components/ProxyRedactionModal.test.tsx`, `tests/unit/autoCombo/suffixComposition-4517.test.ts` e `tests/unit/autoCombo/tieredRotation.test.ts`. O arquivo `open-sse/services/autoCombo/__tests__/autoCombo.test.ts` está fora do escopo da Task 0177. 100% dos testes dentro do escopo da Task 0177 passam com sucesso (34/34 tests nas suites de componentes OAuthModal + autoCombo, mais 8/8 no wrapper e 10/10 na suite do checker).

- **Runner dispositions** (4 órfãos reportados + 2 mismatches do glob unit):
  - `tests/unit/shared/components/OAuthModal.cancellation.test.tsx` → **collected — vitest (`test:vitest` via include `tests/unit/shared/components/OAuthModal*.test.tsx`)**. Suite React/jsdom sobre `src/shared/components/OAuthModal.tsx` (regressão F1 Task 0151). Roda e passa (3/3).
  - `tests/unit/shared/components/OAuthModal.oautopopup.test.tsx` → **collected — vitest (mesmo include)** (decision matrix Task 0135). Roda e passa (7/7).
  - `tests/unit/shared/components/OAuthModal.state.test.tsx` → **collected — vitest (mesmo include)** (PKCE state F2 Task 0151). Roda e passa (7/7).
  - `tests/unit/shared/components/ProxyRedactionModal.test.tsx` → **wrapper documentado** (precedente `providerDiversity.test.ts`): re-export puro por path da suite canônica `src/app/(dashboard)/dashboard/settings/components/__tests__/ProxyRedactionModal.test.tsx`, que JÁ É coletada pelo glob `src/app/(dashboard)/**/__tests__/**/*.test.tsx` do mesmo runner. Incluído no collector (matching de dono no checker) e **excluído da execução em massa** no `vitest.mcp.config.ts` para evitar double-run (2 arquivos / 16 tests seria duplicado). Mantido como entry point de execução explícita (`npx vitest run <path>`, caminho usado no review 0168) — 8/8 pass.
  - `tests/unit/autoCombo/suffixComposition-4517.test.ts` → **collected — vitest** (`tests/unit/autoCombo/**/*.test.ts` no `vitest.mcp.config.ts` → `test:vitest`); **intencionalmente fora** do glob unit do node runner (política existente dos braces, que excluem autoCombo por serem suites vitest — comentário no próprio checker 6A.1c). API vitest confirmada (enforced por `check-test-runner-api`). Roda e passa.
  - `tests/unit/autoCombo/tieredRotation.test.ts` → idem: **collected — vitest**, fora do glob unit por política existente. Roda e passa.
  - **Relação inventário × execução (registrada, números medidos em 2026-08-18)**: 2.404 arquivos `tests/unit/**/*.test.ts` no filesystem vs 2.402 casados pelo glob unit do package (`tests/unit/*.test.ts` + braces); os 2 não casados são exatamente o par autoCombo acima (proprietários vitest). O número de arquivos sob `tests/unit/` NÃO é igual ao número de testes executados pelo `test:unit` — autoCombo e todos os `.test.tsx`/`.spec.ts` do diretório são executados por outros runners (vitest / test:vitest:ui).

- **Resultado do lint**: `npm run lint` → `EXIT=1` com **9 erros pré-existentes, todos em arquivos intocados pelo 0177** (`src/app/(dashboard)/dashboard/context/settings/EnabledEngineSections.tsx:79`; `visual-reference/src/App.tsx:192`, `visual-reference/src/components/organisms/PrismTree.tsx:70`, `visual-reference/src/views/execution-stream.tsx:254/273/295`, `visual-reference/src/views/usage-analytics.tsx:23`; 2 em scratch `tmp/h1-investigation/`). **0 erros novos**. Arquivos alterados por esta task lint-limpos: `npx eslint vitest.mcp.config.ts scripts/check/check-test-discovery.mjs` → `EXIT=0`.

- **Resultado do typecheck/build**: `npm run typecheck:core` → **EXIT=0** (sem output além do banner npm). Prettier: `npx prettier --check vitest.mcp.config.ts scripts/check/check-test-discovery.mjs` → OK.

- **Entrada no changelog**:
  - Entrada real canônica criada: `.changelog/20260819-010252-0177-test-discovery-and-runner-ownership-integrity-builder-engineer.md` via `manage-changelog` (`rebuild.sh add`).
  - Publicação e validação executada via `rebuild.sh build` (atualizados `CHANGELOG.md`, `CHANGELOG-FULL.md`, `.changelog/index.md` e `.changelog/views/omniroute-2.md`).
  - `npm run check:docs-sync` verificado.

- **Agente executor**: builder-engineer (`omniroute/builder-engineer`), lane builders.
- **Data de conclusão**: 2026-08-19

## Agent Session Ledger

- **Implementation worker**: `ses_fe85fe16effedT5ldfOjtxvzQy` — test discovery collectors and baseline orphan resolution.
- **Reviewer session**: `ses_fe83a3daeffe60MKOTZ76aMBYd` — independent review (REJEITADO 82/100).

---

## 🔍 Review Trail (preenchido pelo reviewer)

### R1 Review (2026-08-18)
- **Reviewer**: Independent test-infrastructure reviewer (separate from `builder-engineer` executor)
- **Data da review**: 2026-08-18
- **Veredito**: **REJEITADO**
- **Score**: **82/100**
- **Blockers identified**:
  1. Changelog Exit Condition unmet (only draft provided, no `.changelog/` entry created, `rebuild.sh build` not run).
  2. Completion evidence count stale (2798 vs actual 2799).
  3. Pre-existing Vitest failure baseline not explicitly documented with boundary proof.
  4. Worktree dirty across unrelated files (task-owned diff verified clean of production changes).

---

### R2 Re-Review (2026-08-19)
- **Reviewer**: Independent test-infrastructure reviewer (separate from `builder-engineer` executor)
- **Data da review**: 2026-08-19
- **Veredito**: **APROVADO**
- **Score**: **100/100**
- **Verification of R1 Remediation Items**:
  1. **Canonical Changelog Entry & Rebuild**: Verified entry `.changelog/20260819-010252-0177-test-discovery-and-runner-ownership-integrity-builder-engineer.md` exists on disk. `rebuild.sh build` output confirmed present in `CHANGELOG.md`, `CHANGELOG-FULL.md`, `.changelog/index.md`, and `.changelog/views/omniroute-2.md`.
  2. **Count Reconciliation**: Evidence updated in task document to 2799 test files. Reconciled +1 delta (`tests/unit/combo-context-capacity-fallback.test.ts` from Task 0179) which lands under top-level `tests/unit/*.test.ts` and is collected automatically by `COLLECTORS[0]`.
  3. **Vitest Failure Baseline**: Reproducible baseline comparison documented. `autoCombo.test.ts:632` fails identically under untouched baseline `vitest.config.ts` and modified `vitest.mcp.config.ts` (`1 failed (1) | 55 passed (56)`). Confirmed pre-existing upstream flake PR #5890 when models.dev DB is populated. `open-sse/services/autoCombo/__tests__/autoCombo.test.ts` is outside Task 0177 scope. 100% of task-owned tests pass (34/34 component+combo tests, 8/8 wrapper tests, 10/10 checker tests).
  4. **Production Source Isolation**: `git diff --name-only` for task-owned files (`scripts/check/check-test-discovery.mjs`, `vitest.mcp.config.ts`) verifies zero changes to `src/` or `open-sse/`.
  5. **Core Verification Commands**:
     - `npm run check:test-discovery` → **EXIT 0** (`2799 test files, 21 collectors, 60 frozen orphans`).
     - `npm run check:test-runner-api` → **EXIT 0**.
     - `npm run typecheck:core` → **EXIT 0**.
     - Targeted Vitest + Node runner tests → **PASS (42/42 tests)**.
- **Final Verdict**: All R1 remediation items satisfied. Exit conditions and test requirements completely fulfilled. Score upgraded to **100/100 APROVADO**. Ready for promotion to `03-review/`.
