# RD: OmniRoute Test Suite Mega-Audit — quality, duplication, templates

> **Status**: `[ ]` Open
> **Priority**: 🟡 P1 (base para wave de endurecimento da suite de testes)
> **Type**: `research` (Research / Reference Discovery mode — `.agents/rules/task-numbering.md`)
> **Origin**: Operador (2026-08-16) — casos recentes ("tests passed but provider broken": Task 0160 grok-cli, `model-test-runner.test.ts` que só testa helpers internos) provam que a suite de testes não cobre o que *deveria*. O operador pede uma **mega-auditoria em várias frentes** executada por orquestrador delegando a vários research subagents (sequência/paralelo), produzindo **relatórios** para nortear planejamento — NÃO implementação.
> **Blocks**: — (produz relatórios; futuras tasks de implementação/templates dependem dos achados)
> **Depends on**: `docs/tasks/01-open/0176-omniroute-canonical-alias-normalization.md` (contexto: anti-TDD rules + boundary contract test que já foi especificado lá — a auditoria deve validar que essa especificação é generalizável)
> **Parallelism**: `orchestrator-delegated` — este RD NÃO roda como um único subagent; o **research-orchestrator** (ou architect-orchestrator como pai) DEVE decompor em frentes paralelas/sequenciais com reuso de contexto entre subagents (ver Details → Orchestration).
> **Review routing**: independent + evidence/report review

---

## Objective

Produzir uma **família de relatórios de auditoria** sobre a suite de testes existente do OmniRoute (`tests/unit/`, `tests/integration/`, `tests/e2e/`, vitest suites, `open-sse/` test surfaces), usando os critérios da sub-skill **`eval` (EDD)** e do reference **`testing-anti-patterns.md`** como framework de classificação. A auditoria DEVE:

1. **Listar testes inúteis** — classificados segundo os critérios operacionais desta RD (derivados de `testing-anti-patterns.md` + lição da Task 0160):
   - testes que exercitam apenas helpers internos sem tocar o boundary público afetado;
   - testes que testam mocks em vez de comportamento real;
   - testes "no-throw" sem asserção de payload pós-processamento;
   - testes que passam por não exercitar a branch que os causou;
   - testes cujo nome não corresponde a contrato observável.
2. **Listar testes redundantes ou duplicados** — mesma lógica espalhada em N arquivos que poderia unificar em handlers inteligentes comuns (ex.: builder de requisição OpenAI, builder de resposta SSE, tabela de contratos por boundary).
3. **Listar oportunidades de melhoria** de modo geral (cobertura por boundary, flakiness, mocks parciais, testes lentos, naming, fixtures).
4. **Sugerir template de teste de provider** (mínimo padrão que qualquer novo provider deve ter — alinhado ao boundary contract test de `Task 0176`).
5. **Sugerir outros templates de teste** (por boundary: executor, translator, route, combo, DB module, SSE stream), servindo como "medida mínima" para endurecimento futuro.
6. **Templates já devem levar em conta eventual unificação** — ou seja, os templates devem ser desenhados para *compartilhar* handlers/helpers comuns, não para proliferar N cópias.

**NÃO é escopo**: implementar qualquer modificação, reescrever testes, criar os templates (apenas especificá-los), mudar AGENTS.md, mudar a suite.

## Background Context

### Por que AGORA (evidência da sessão 2026-08-16)
- `tests/unit/model-test-runner.test.ts` exercita apenas `parseRetryAfterHeader` e `detectTestKind` — `runSingleModelTest` (onde o double-prefix compõe seu efeito) não é exercitado para o caso alias-prefix. Suite verde, prod quebrado (Task 0160).
- `tests/unit/nvidia-model-test-identity.test.ts` cobre passthrough com slash (`cline/nvidia/...`) mas não o alias da própria casa (`gc/grok-4.6`).
- O padrão "24 pass, 0 fail" da Task 0160 passou porque nunca testou o caso que o gate escondia — a lição deve virar critério de classificação auditável.
- O operador nota que "a regra nova já deveria estar implementada pq a própria skill RF8 trata disso" — a auditoria DEVE verificar se os testes existentes *seguem* RF8-stage-07/tdd/eval disciplines e quantificar o desvio.

### Sub-skill carregada (2026-08-16) — framework de classificação
- **`sub-skills/eval` (EDD)** [carregada integralmente]: 3 dimensões — Correctness Eval ("does it work as specified?"), Usefulness Eval ("is it solving the real problem?"), Governance Eval ("does it fit the architecture? no duplication"). Quality Score = correctness×0.4 + usefulness×0.3 + governance×0.3 (treshholds FAIL/REVISE/PASS/PROMOTE). pass@k. Regression evals.
- **`references/testing-anti-patterns.md`** [lido integralmente]: 5 anti-patterns (testing mock behavior, test-only methods in prod, mocking without understanding, incomplete mocks, integration as afterthought) + red flags (assertion `*-mock`, methods only used in tests, mock setup >50%, test fails when mock removed...).
- **`sub-skills/tdd`** e **`radial-forge/stages/07-test.md`** [lidos]: disciplina-alvo (RED→GREEN→REFACTOR, boundary-first, anti-patterns de teste, coverage por CASE). Servem para dimensionar o "template mínimo".

## Test Requirements (critérios de classificação)

### A. Classificação "teste inútil"
Um teste é candidato a **INÚTIL/USELESS** se satisfizer UM OU MAIS:

- [ ] Exercita só helper interno sem chamar o boundary público que a mudança afetou (o `model-test-runner.test.ts` é o arquétipo: só helpers, nunca `runSingleModelTest`).
- [ ] Assere sobre mock (`*-mock` test ids, métodos só usados em test) — anti-pattern 1/2.
- [ ] Mock sem entender dependência — o teste depender de side-effect que o mock removeu (anti-pattern 3).
- [ ] Mock parcial que esconde campos que downstream usa (anti-pattern 4).
- [ ] Assere "não lança" sem verificar o payload pós-processamento resultante.
- [ ] Passa por não exercitar a branch que causou o bug observado (coverage fantasma).
- [ ] Nome não mapeia para contrato observável do usuário/upstream (nome genérico, sem input real).
- [ ] Testa comportamento do framework/runner, não do produto.

### B. Classificação "redundante/duplicado"
- [ ] Mesma lógica de setup/assert espalhada em >= 3 arquivos (ex.: builders de request OpenAI, builders de response SSE, tabelas de contrato).
- [ ] Dois+ testes que exercitam a mesma branch/contrato com nomes diferentes.
- [ ] Fixtures duplicadas (mesma shape em vários arquivos) sem helper comum.

### C. Classificação "melhoria geral"
- [ ] Gap de cobertura em boundary público (route, executor, translator, combo, SSE).
- [ ] Flakiness potencial (timers, ordem de execução, dependência entre testes, rede real).
- [ ] Slow tests (>50ms unit / >5s integration), mocks sobre-complexos.
- [ ] Naming inconsistente, testes agrupados por arquivo-sujeito em vez de contrato.
- [ ] Mocks parciais / use de `any` em asserts.

### D. Templates (especificação apenas)
- [ ] **Provider template**: o que TODO provider novo DEVE ter (registro válido, executor default, headers/auth, um dispatche real mockado com payload upstream observável, fallback de models, sanitização de erro). Deve ser 1 arquivo table-driven (espelhar o boundary contract test da Task 0176), NÃO N arquivos.
- [ ] **Boundary templates**: executor / translator / route / combo / db-module / SSE-stream — cada um com lista mínima de rows de contrato. Devem compartilhar helpers comuns (setup + assert banks) em vez de duplicar.
- [ ] Cada template DEVE listar: onde vive, quais helpers comuns usa, quais anti-patterns impede, como se encaixa no RF8 stage-07/tdd.

---

## Exit Conditions

- [ ] `docs/reports/audits/test-suite-mega-audit-INDEX.md` criado — índice com links para cada relatório de frente, resumo de achados principais, contagens (useless/redundant/duplicated/improvements).
- [ ] `docs/reports/audits/test-suite-mega-audit-USELESS.md` — lista de testes inúteis com: arquivo:linha, critério disparado (A1..A8), e impacto (por que passa mas não cobre).
- [ ] `docs/reports/audits/test-suite-mega-audit-REDUNDANT.md` — clusters de duplicação com contagem de ocorrências e sugestão de helper comum.
- [ ] `docs/reports/audits/test-suite-mega-audit-IMPROVEMENTS.md` — oportunidades ordenadas por impacto (boundary gaps, flakiness, performance, naming).
- [ ] `docs/reports/audits/test-suite-mega-audit-TEMPLATES.md` — especificação dos templates (provider + boundaries) com helpers comuns e anti-patterns impedidos.
- [ ] `docs/reports/audits/test-suite-mega-audit-ORCHESTRATION-LOG.md` — registro do orquestrador: como as frentes foram decompostas, quais subagents usados, contexto compartilhado entre fases (o pedido opera: "não serve um só, o contexto deve ser reaproveitado").
- [ ] Contagens reais (nº testes totais, nº inúteis, nº redundantes) calculadas com evidência (`wc -l`, `rg`, listagem de arquivos) — nunca inventadas.
- [ ] Cada claim do relatório tem fonte (arquivo:linha ou comando executado).
- [ ] Nenhum código de produção alterado; nenhum teste alterado; mudanças docs/reports apenas.
- [ ] Changelog: entrada real via `.changelog/` + `rebuild.sh build && rebuild.sh validate`.
- [ ] `docs/dependency-tree.md` e `docs/tasks/00-planning/EPIC-25` referenciam este RD (ou registram a intenção de endurecimento).

---

## Details

### What

Subtasks (para o orquestrador — a decomposição exata é do executor, mas a seguinte estrutura é obrigatória):

- [ ] **Fase 0 — Inventário** (orquestrador ou 1 subagent): catalogar TODAS as surfaces de teste — `tests/unit/*.test.ts` (contagem + nomes), `tests/integration/`, `tests/e2e/`, vitest configs (`npm run test:vitest`), `open-sse/**/*.test.*`. Output: inventário base compartilhado (este é o bloco de contexto que as fases seguintes REUSAM).
- [ ] **Fase 1 — Classificação USELESS** (1-3 subagents paralelos, cada um com slice do inventário): aplicar critérios A1-A8. Output: `USELESS.md`.
- [ ] **Fase 2 — Redundância/duplicação** (1 subagent): clusters por lógica comum, contagens por padrão (setup, assert, fixtures, builders). Output: `REDUNDANT.md`.
- [ ] **Fase 3 — Melhorias** (1 subagent, REUSA saídas das Fases 1–2): gaps de boundary, flakiness, naming, performance, mocks. Output: `IMPROVEMENTS.md`.
- [ ] **Fase 4 — Templates** (1 subagent, REUSA 1–3): especificação provider template + boundary templates + helpers comuns + unificação. Output: `TEMPLATES.md`.
- [ ] **Fase 5 — Síntese** (orquestrador): INDEX + contagens finais + recomendação de priorização para wave de endurecimento.
- [ ] **Fase 6 — Registro**: ORCHESTRATION-LOG.md (decomposição feita, subagents usados, contexto reusado, blocos compartilhados).

### Orquestração (crítico)

- NÃO rodar como um único subagent gigante: o contexto das mesmas files precisa ser **reaproveitado** entre fases. O orquestrador DEVE:
  - Fase 0 produzir um **bloco de contexto compartilhado** (inventário por file: caminho, runner, type, contagem de tests, dependencies) e passá-lo adiante.
  - Fases 1–2 em paralelo (slices disjuntos do inventário); Fases 3–4 consomem as saídas; Fase 5 centraliza.
  - Subagents retornam **pacotes**, não escrevem relatórios finais (o orquestrador consolida em `docs/reports/audits/`).
- Máximo 4 subagents concorrentes (`research` profile), escopos estreitos para respeitar o context window (200k).

### Where

| Arquivo | Propósito |
|---------|-----------|
| `docs/reports/audits/test-suite-mega-audit-*.md` (6) | Criar — relatórios (INDEX, USELESS, REDUNDANT, IMPROVEMENTS, TEMPLATES, ORCHESTRATION-LOG) |
| `tests/unit/*.test.ts` (≈ centenas) | **Ler** — corpus primário; NUNCA editar |
| `tests/integration/`, `tests/e2e/`, vitest | Ler — surfaces adicionais |
| `open-sse/**/*.test.*` | Ler — testes no workspace-sse |
| `.agents/skills/project-development/sub-skills/eval/SUBSKILL.md` | Ler — framework de classificação (já carregado) |
| `.agents/skills/project-development/references/testing-anti-patterns.md` | Ler — critério de inutilidade (já carregado) |
| `docs/tasks/01-open/0176-omniroute-canonical-alias-normalization.md` | Ler — boundary contract test (espelho p/ template) |
| `docs/dependency-tree.md`, `docs/tasks/00-planning/EPIC-25-*.md` | Modificar — registrar este RD |

### How

1. **Fase 0**: `ls tests/unit/*.test.ts | wc -l`, `rg -n "^(test|it|describe)\(" tests/unit/ | wc -l`, nome dos arquivos por categoria (provider, route, db, sse, combo, security...). Salvar inventário.
2. **Fase 1**: para cada arquivo, aplicar critérios A1-A8 citando `arquivo:linha`. Marcar também como "cover-only-helper" (arquétipo: `model-test-runner.test.ts`).
3. **Fase 2**: rodar `rg` de padrões recorrentes (ex.: `new Response(`, `choices: [`, `resetDbInstance()`, builders de auth) e contar ocorrências; cluster por lógica comum.
4. **Fase 3**: cruzar inventário com boundaries públicos (routes sob `src/app/api/`, executors, translators, combo, sse) para achar gaps; medir `timeout_ms` potenciais; reviewers de flakiness.
5. **Fase 4**: especificar templates como **design docs** (não código): estrutura de 1 arquivo table-driven por boundary, helpers comuns listados, anti-patterns impedidos, encaixe RF8/TDD.
6. **Fase 5**: consolidar com contagens e prioridades (P0 = gaps que reproduzem "tests pass but broken", P1 = duplicação, P2 = templates).

### Why

O projeto teve CNT casos de "suite verde, prod quebrado" (0160, e o padrão opencode-zen/oc descrito na sessão). A suite de testes prolifera testes que exercitam helpers e mocks sem tocar o boundary que o bug habita. Uma auditoria multi-frente produz a evidência para **planejar** (não executar) uma suite standardizada: templates de provider e boundaries + handlers comuns de teste + critérios de inutilidade auditáveis. O framework de classificação já existe na harness skill (`eval`/EDD + `testing-anti-patterns.md`) — esta RD operacionaliza essas regras sobre o corpus real.

---

## Parallelism / file ownership

| Class | Detail |
|-------|--------|
| **orchestrator-delegated** | Decomposição obrigatória em fases com reuso de contexto; Fases 1-2 paralelas, 3-4 sequenciais sobre saídas, 5-6 centralização. |
| **file ownership** | Relatórios em `docs/reports/audits/` — exclusivos desta RD; nenhuma outra task pode escrever nesse prefixo até esta RD concluir. |
| **no-code** | PROIBIDO modificar `tests/`, `src/`, `open-sse/` — auditoria é read-only + docs. |

---

## ⛔ Anti-Hallucination Guardrails

> [!CAUTION]
> - NÃO inventar contagens. Cada número vem de comando executado (`ls | wc -l`, `rg | wc -l`) citado no relatório.
> - NÃO classificar um teste como inútil sem citar `arquivo:linha` + critério A1-A8.
> - NÃO sugerir unificação de dois testes sem mostrar a lógica comum (citação de ambas as file:line).
> - NÃO escrever template de teste como código executável — apenas especificação de design. Implementação é wave futura.
> - NÃO reabrir tasks passadas; auditoria é report-only. Achados sobre uma task específica virão como referência em IMPROVEMENTS.md para wave futura.

> [!IMPORTANT]
> - O orquestrador DEVE registrar no ORCHESTRATION-LOG.md quais subagents usou e como o contexto foi reaproveitado entre fases — isso é requisito do operador ("não serve um só").
> - Os critérios A1-A8 e B/C são a base de classificação; divergências justificadas são permitidas se citadas.
> - Templates DEVM levaR em conta unificação ANTES de propor N templates por provider — o design compartilhado vem primeiro.

---

## 🛡️ Compliance Checklist (Leis Primárias do AGENTS.md)

- [ ] **Doc Accuracy**: toda claim com fonte (arquivo:linha ou comando); zero contagens inventadas.
- [ ] **Zod Validation**: N/A (report-only).
- [ ] **Security**: nenhum secret; nenhum conteúdo de reasoning; nenhuma chamada real a upstream.
- [ ] **Error Sanitization**: N/A.
- [ ] **No Raw SQL**: N/A.
- [ ] **Archive Protocol**: N/A (cria docs novos; não deleta).
- [ ] **Skill-first**: sub-skills carregadas (`eval`, `testing-anti-patterns`, `tdd`, `radial-forge` stage 07) são o framework de classificação; citar no relatório quando usadas.

---

## 📋 Completion Evidence (preenchido pelo orquestrador)

- **Arquivos criados**: [6 relatórios em docs/reports/audits/]
- **Comandos executados**: [ls | wc -l, rg | wc -l, com outputs reais]
- **Subagents usados**: [perfis + fases + ids de sessão]
- **Contexto reusado**: [como o inventário da Fase 0 fluiu para 1-4]
- **Resultado da validação**: [changelog rebuild + validate]
- **Agente executor**: [nome/role — orquestrador]
- **Data de conclusão**: [YYYY-MM-DD]

---

## 🔍 Review Trail (preenchido pelo reviewer)

- **Reviewer**: [nome/role]
- **Data da review**: [YYYY-MM-DD]
- **Veredito**: [APROVADO / REJEITADO]
- **Score (path to 100)**: [0-100]
- **Notas**: [contagens reais? arquivo:linha em toda claim? ORCHESTRATION-LOG preenchido? templates como design, não código?]
- **Se REJEITADO**: mover para `02-doing/` com motivo documentado no topo.
