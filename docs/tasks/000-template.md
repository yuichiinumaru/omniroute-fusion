# Task Template — OmniRoute

> **OBRIGATÓRIO**: Todo documento de task DEVE usar este template. Tasks que não seguem este formato serão REJEITADAS.
> **Mínimo**: 50 linhas. Tasks com menos de 50 linhas indicam falta de detalhamento e serão rejeitadas.
> **Numbering**: Child project usa namespace local começando em `0001` (ver `.agents/rules/task-numbering.md`).
> **Formato**: `NNNN-omniroute-<descricao>.md` onde último dígito `0`=blocker, `1-9`=paralelizável.
> **AD-/RD- tasks**: Usam prefixo `AD-omniroute-<slug>.md` ou `RD-omniroute-<slug>.md` per `task-numbering.md`.
> **Provenance**: Restored from `docs/tasks/.archive/000-template-moved-to-parent.md` (EPIC-14 / Task 0064). Archive retained; this is the live path.
> **Stack**: OmniRoute is Node/Next/npm/SQLite — Exit Conditions use the **npm matrix** below. Do **not** paste cargo / Surreal DoD as required exits for product TypeScript work.
> **Lane constitution**: `docs/tasks/AGENTS.md` · product Hard Rules: root `AGENTS.md` / `CLAUDE.md`.

---

# Task NNNN: [Nome Descritivo da Task]

> **Status**: `[ ]` Open | `[~]` / `[/]` In Progress | `[x]` Completed
> **Priority**: 🔴 P0 | 🟡 P1 | 🟢 P2 | ⚪ P3
> **Type**: `feature` | `remediation` | `verification` | `testing` | `governance` | `housekeeping` | `benchmarking`
> **Origin**: [De onde surgiu — ex: "Audit finding", "User request", "Architecture decision", "Review report docs/reports/review/"]
> **Blocks**: [Lista de tasks que esta bloqueia, se houver]
> **Depends on**: [Lista de tasks das quais esta depende, se houver]
> **Parallelism**: `parallel-safe` | `serializable` | `operator-hold` — [paths / tasks that may or must not run concurrently]
> **Review routing**: [independent | bundle with NNNN | frontend-quality | security | …]

---

## Objective

> ⚠️ **NÃO PODE ser vago.** Descreva o problema CONCRETO que esta task resolve, e o resultado CONCRETO esperado.
> Critério: se um agente ler SOMENTE esta seção, saberia dizer se a task foi cumprida?

[Descreva o objetivo. Específico. Inclua contexto sobre POR QUE isso é necessário AGORA.]

## Background Context

> ⚠️ **OBRIGATÓRIO para tasks de remediação/verificação.** Para features novas, pode ser breve.

### O que já existe:
- [Liste código, arquivos, funcionalidades já implementadas]

### O que está faltando / quebrado:
- [Liste gaps, bugs, componentes ausentes — com referência a arquivos e linhas quando possível]

---

## Test Requirements

> ⚠️ **Cada item é uma asserção que DEVE ser verdadeira para a task ser considerada completa.**
> Linguagem imperativa e mensurável. PROIBIDO: "deve funcionar bem", "deve ser rápido".
> OBRIGATÓRIO: "DEVE completar em < 10ms", "DEVE retornar `None` para input inválido".

- [Requisito de teste 1 — mensurável e verificável]
- [Requisito de teste 2]
- [Requisito de teste N]

---

## Exit Conditions (GDD/TDD)

> ⚠️ **Cada checkbox é uma condição BINÁRIA: satisfeita ou não. Sem meio-termo.**
> A task SÓ pode ser movida para `04-completed/` quando TODAS estiverem `[x]`.
> Promoção para `03-review/` exige: todas subtasks `[x]` + Completion Evidence preenchida + agente DIFERENTE revisa.
>
> **OmniRoute npm matrix (required for product/code tasks; adapt for pure docs/governance):**
> - Prefer targeted unit: `node --import tsx/esm --test tests/unit/<file>.test.ts`
> - If MCP / autoCombo / cache surfaces change: also `npm run test:vitest` (non-overlapping suite)
> - Do **not** list `cargo check` / `cargo test` as OmniRoute required exits (parent Khala DoD is not this stack).
> - Bug fixes: Hard Rule #18 — failing-then-passing test **or** documented VPS live proof.

- [ ] [Condição de saída 1 — artefato tangível]
- [ ] [Condição de saída 2 — teste que passa]
- [ ] [Condição de saída N]
- [ ] `npm run typecheck:core` passa sem erros
- [ ] `npm run lint` passa sem erros novos
- [ ] Relevant tests pass (`node --import tsx/esm --test …` and/or `npm run test:vitest` when those surfaces change; full `npm run test:all` only when scope warrants)
- [ ] Entrada no `CHANGELOG.md` adicionada (no TOPO do arquivo) — product surface is root `CHANGELOG.md` (not `.changelog/` unless operator adopts ledger)

---

## Details

### What

> ⚠️ **Subtasks são OBRIGATÓRIAS.** Sem subtasks = task rejeitada.
> Cada subtask atômica: um agente completa independentemente.
> A PRIMEIRA subtask de toda task DEVE ser "Ler o código existente antes de modificar" (or "Ler existentes" for docs/governance).

Subtasks:
- [ ] **Ler código existente**: [Lista de arquivos que DEVEM ser lidos antes de qualquer modificação]
- [ ] [Subtask 2: ação específica com resultado verificável]
- [ ] [Subtask 3]
- [ ] **Refactoring pass**: Review implementation for simplicity. 200 lines que poderiam ser 50 = rewrite.
- [ ] **Verificação de regressão**: rodar testes relevantes + lint

### Where

> ⚠️ **OBRIGATÓRIO**: tabela. Liste TODOS os arquivos a ler/modificar/criar.
> Inclua arquivos vizinhos que fornecem contexto.

| Arquivo | Propósito |
|---------|-----------|
| `src/path/to/file.ts` | [Ler / Modificar / Criar — e por quê] |
| `tests/unit/test_xxx.test.ts` | [Ler / Modificar / Criar — e por quê] |

### How

> Abordagem passo a passo. Documente trade-offs.

1. [Passo 1]
2. [Passo 2]
3. [Passo N]

### Why

> Por que esta task é necessária? Qual o impacto de NÃO fazê-la?
> Conecte ao objetivo de negócio ou integridade do sistema.

[Rationale]

---

## Parallelism / file ownership

> Optional but recommended for multi-agent waves. State collision paths explicitly.

| Class | Detail |
|-------|--------|
| **parallel-safe** | [tasks / paths that may run concurrently] |
| **serializable** | [must complete before / after NNNN] |
| **Collision** | [files that must not be co-edited in parallel] |

---

## ⛔ Anti-Hallucination Guardrails

> **OBRIGATÓRIO para tasks P0 e P1.** Recomendado para todas.

> [!CAUTION]
> [Alerta sobre o que o agente NÃO PODE fazer — ex: "DO NOT mark complete sem rodar testes"]
> [Risco de segurança específico se aplicável]
> PORT 21000 = production — never docker-rm / mutate without explicit operator command (root `AGENTS.md`).

> [!IMPORTANT]
> [Instrução crítica — ex: "Read EVERY file in 'Where' before writing"]
> [Zero Trust: validar inputs externos como maliciosos]

---

## 🛡️ Compliance Checklist (Leis Primárias do AGENTS.md)

> Marcar antes de mover para review. Violação = reject. N/A allowed with reason for pure docs.

- [ ] **Doc Accuracy**: Toda referência a API/endpoint/path/CLI/env var foi validada com `grep -rn` antes de documentar
- [ ] **Zod Validation**: Todos os novos inputs validados com Zod schemas
- [ ] **Security**: Nenhum secret/credential commitado; `resolvePublicCred()` para OAuth identifiers
- [ ] **Error Sanitization**: `buildErrorBody()` ou `sanitizeErrorMessage()` em error responses
- [ ] **No Raw SQL**: DB ops via `src/lib/db/` modules, nunca SQL direto em rotas
- [ ] **Archive Protocol**: Nada deletado, só movido para `.archive/`

---

## 📋 Completion Evidence (preenchido pelo agente executor)

> **OBRIGATÓRIO ao fechar.** Preencher ANTES de mover para `03-review/`.
> Sem evidência = task NÃO pode ser movida. PHANTOM COMPLETION = critical failure.

- **Arquivos criados/modificados**: [lista com paths]
- **Testes que verificam o trabalho**: [nomes dos testes + arquivo]
- **Resultado dos testes**: [PASS/FAIL + contagem — output real, não claim]
- **Resultado do lint**: [PASS/FAIL]
- **Resultado do typecheck/build**: [PASS/FAIL]
- **Entrada no changelog**: [referência ao arquivo — root `CHANGELOG.md`]
- **Agente executor**: [nome/role]
- **Data de conclusão**: [YYYY-MM-DD]

---

## 🔍 Review Trail (preenchido pelo reviewer)

> Agente DIFERENTE do executor revisa antes de mover para `04-completed/`.

- **Reviewer**: [nome/role]
- **Data da review**: [YYYY-MM-DD]
- **Veredito**: [APROVADO / REJEITADO]
- **Score (path to 100)**: [0-100]
- **Notas**: [evidence-based, citar arquivos/linhas]
- **Se REJEITADO**: mover para `02-doing/` com motivo documentado no topo.
