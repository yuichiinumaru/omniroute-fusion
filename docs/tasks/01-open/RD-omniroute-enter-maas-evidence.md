# RD: Enter MaaS Evidence Acquisition — Endpoint, Contract, Catalog, Billing

> **Status**: `[ ]` Open
> **Priority**: 🟡 P1 (gate da Task 0175)
> **Type**: `research` (Research / Reference Discovery mode — `.agents/rules/task-numbering.md`)
> **Origin**: Revisão da Task 0175 (2026-08-16): fatos não verificados (base URL, IDs de modelos, capabilities, billing compartilhado) foram removidos do conector e movidos para esta coleta de evidência oficial.
> **Blocks**: `0175` (Enter MaaS Provider Connector — evidence gate)
> **Depends on**: —
> **Parallelism**: `parallel-safe` — read-only, sem tocar código de produção; pode rodar em paralelo com qualquer task.
> **Review routing**: independent + evidence/report review

---

## Objective

Produzir o **artefato de evidência oficial** `docs/reports/enter-maas-evidence.md` que destrava a Task 0175, estabelecendo — com fatos observados e não suposições — o contrato de integração do Enter MaaS:

1. **Endpoint oficial**: base URL canônica para chat completions e listagem de modelos (ex.: `https://api.enter.converge.ai/v1` é HIPÓTESE não publicada — precisa de confirmação).
2. **Formato de contrato**: OpenAI-compatible (`/chat/completions`, `/responses`) e/ou Anthropic-compatible (`/messages`); presença de streaming SSE; suporte a tool calling; shape de erro.
3. **Catálogo real**: IDs exatos de modelos observados em `/v1/models` (ou página oficial), com capacidade observada (contexto, reasoning, vision, max output) — apenas o que for verificado.
4. **Autenticação**: confirmação do header `Authorization: Bearer <key>` e de onde criar a chave (Settings → API Keys).
5. **Billing/limites**: se a chave MaaS compartilha o saldo de créditos da conta Enter Pro/Enter Code CLI; existência de free tier; rate limits.

## Background Context

### O que já existe:
- Task `0175-omniroute-enter-maas-provider-connector.md` (Open) — fica **em espera** até esta RD ser aprovada.
- Pesquisa do operador (2026-08-16, Perplexity): Enter MaaS usa API key Bearer; chave em Settings → API Keys; produto descrito como gateway unificado de modelos (20+); docs públicas NÃO publicam a base URL oficial nem IDs canônicos do catálogo.
- Referência local: `references/diegosouzapw-omniroute` (fork original) — verificar se há qualquer menção a `enter`/`converge` no upstream (grep antes de documentar).
- Padrão de evidência da casa: `tests/unit/*` + `docs/reports/review/*`; modelo-claim exige SSoT atualizada (AGENTS.md rule 6).

### O que está faltando / quebrado:
- Base URL não confirmada (não inventar).
- Formato exato (OpenAI vs Anthropic; streaming/tool calls) não confirmado.
- IDs de modelos e capabilities não observados.
- Existência/escopo de free tier e billing compartilhado não confirmados.
- Sem evidência → a Task 0175 NÃO pode implementar `models` nem fixar endpoint.

---

## Test Requirements (critérios de completude da evidência)

- [ ] O relatório DEVE citar, para CADA fato, a fonte observada (URL oficial da docs, resposta real de probe, referência local greppada) — sem fato sem fonte.
- [ ] A base URL DEVE estar confirmada por, ao menos, UMA das fontes: (a) guia oficial do dashboard do operador, (b) exemplo de request publicado por página oficial, (c) probe HTTP autenticado/`401`/`200` documentado com a resposta (sanitizada, sem chave).
- [ ] O formato DEVE classificar o contrato como OpenAI-compatible e/ou Anthropic-compatible, e registrar streaming SSE + tool calling como VERIFICADO / NÃO-VERIFICADO / NÃO-SUPORTADO com evidência.
- [ ] O catálogo DEVE listar IDs de modelos apenas quando observados (resposta `/v1/models` ou página oficial); cada entrada com capabilities marcadas como observadas (não inferidas).
- [ ] O billing DEVE responder explicitamente: chave compartilha saldo? free tier existe? rate limits? Com fonte.
- [ ] A task NÃO DEVE tocar código de produção; é read-only/report-only.
- [ ] NENHUM secret/chave deve aparecer no relatório (sanitizar sempre).

---

## Exit Conditions

- [ ] `docs/reports/enter-maas-evidence.md` criado seguindo o template de evidência (fato → fonte → status).
- [ ] Base URL confirmada com fonte(s) citada(s).
- [ ] Contrato classificado (OpenAI/Anthropic, streaming, tool calls) com evidência.
- [ ] Catálogo verificado (ou explicitamente marcado como indisponível/`[]` com a fonte do probe).
- [ ] Billing respondido (créditos compartilhados? free tier? rate limits?).
- [ ] Recomendação final para a Task 0175: valores exatos de `baseUrl`, `modelsUrl`, `models` e `apiHint`.
- [ ] `docs/dependency-tree.md` e `docs/tasks/00-planning/EPIC-25` mapeiam a RD como gate da 0175.
- [ ] Changelog: entrada real via `.changelog/` + `rebuild.sh build && rebuild.sh validate`.

---

## Details

### What

Subtasks:
- [ ] **Ler código existente**: `docs/tasks/01-open/0175-omniroute-enter-maas-provider-connector.md`, `docs/tasks/03-review/0174-omniroute-aihubmix-provider-connector.md` (template aprovado), `open-sse/config/providers/shared.ts` (RegistryEntry), `src/app/api/providers/[id]/models/route.ts` (discovery), e `references/diegosouzapw-omniroute` (grep `enter`/`converge`/`maas`).
- [ ] **Coletar fontes oficiais**: páginas oficiais do Enter (enter.converge.ai), blog API guides (gpt-5-6-sol-api-enter-maas, kimi-k3-api-guide), painel do operador (Settings → API Keys).
- [ ] **Verificar/carregar a base URL**: confirmar via fontes oficiais ou probe HTTP documentado; registrar o valor exato OU marcar indisponível.
- [ ] **Verificar contrato**: streaming SSE, tool calling, formato, via docs ou probe com body mínimo.
- [ ] **Coletar catálogo**: `/v1/models` (ou página oficial) — listar IDs observados; senão, declarar `models: []`.
- [ ] **Coletar billing**: compartilhamento de saldo, free tier, rate limits — com fonte.
- [ ] **Escrever o relatório**: `docs/reports/enter-maas-evidence.md` (fato → fonte → status → recomendação).
- [ ] **Refactoring pass**: relatório conciso; nada de speculação não marcada como hipótese.
- [ ] **Verificação**: leitura final — cada claim tem fonte? nenhum secret? recomendações prontas para a 0175?

### Where

| Arquivo | Propósito |
|---------|-----------|
| `docs/reports/enter-maas-evidence.md` | Criar — RELATÓRIO de evidência (principal output). |
| `docs/tasks/01-open/0175-omniroute-enter-maas-provider-connector.md` | Ler — destino das recomendações. |
| `docs/tasks/03-review/0174-omniroute-aihubmix-provider-connector.md` | Ler — template aprovado de conector. |
| `open-sse/config/providers/shared.ts` | Ler — shape do `RegistryEntry` (baseUrl/modelsUrl/models opcionais). |
| `src/app/api/providers/[id]/models/route.ts` | Ler — mecanismo de discovery live. |
| `references/diegosouzapw-omniroute` | Ler — grep por `enter`/`converge`/`maas` no upstream (evidência negativa ou positiva). |
| `docs/dependency-tree.md` | Modificar — mapear RD como gate da 0175. |
| `docs/tasks/00-planning/EPIC-25-omniroute-provider-reliability-and-test-integrity.md` | Modificar — registrar RD no epic. |

### How

1. Reunir as fontes coletadas pelo operador + grep no upstream.
2. Para cada bloco (endpoint/contrato/catálogo/billing): anotar fato → fonte → status (VERIFICADO / HIPÓTESE / INDISPONÍVEL).
3. NUNCA preencher lacuna com suposição: lacuna vira "INDISPONÍVEL" + efeito na 0175 (ex.: sem catálogo confirmado → `models: []`).
4. Fechar com a seção "Recomendação para Task 0175" — valores exatos a usar.

### Why

Sem esta evidência, a 0175 fixaria uma base URL hipotética, propagaria IDs de modelos e capabilities inventadas, e prometeria billing não verificado — exatamente o padrão de fabricação que a AGENTS.md rule 6 e o anti-hallucination guardrail proíbem. A RD separa "descobrir" de "implementar": evidência real antes de código.

---

## Parallelism / file ownership

| Class | Detail |
|-------|--------|
| **parallel-safe** | Read-only em código; pode rodar em paralelo com qualquer task. |
| **serializable** | DEVE completar antes de `0175` (gate). |
| **Collision** | `docs/reports/enter-maas-evidence.md` — exclusivo desta RD. |

---

## ⛔ Anti-Hallucination Guardrails

> [!CAUTION]
> - NUNCA fixar `https://api.enter.converge.ai/v1` sem fonte de confirmação — é hipótese.
> - NUNCA listar IDs de modelos sem observação (probe/docs oficial).
> - NENHUM secret/chave no relatório — sanitizar respostas de probe.
> - Não tocar código de produção; esta RD é evidence/report-only.

> [!IMPORTANT]
> - Cada claim do relatório DEVE ter fonte citada. Sem fonte = marcar HIPÓTESE ou INDISPONÍVEL.
> - A 0175 DEPENDE deste artefato — o relatório é o entregável principal.

---

## 🛡️ Compliance Checklist (Leis Primárias do AGENTS.md)

- [ ] **Doc Accuracy**: cada fato com fonte greppada/observada; zero nomes sem evidência.
- [ ] **Zod Validation**: N/A (nenhum input novo).
- [ ] **Security**: nenhum secret no relatório; sem chamadas reais em testes.
- [ ] **Error Sanitization**: N/A (report-only).
- [ ] **No Raw SQL**: N/A.
- [ ] **Archive Protocol**: N/A.

---

## 📋 Completion Evidence (preenchido pelo agente executor)

- **Arquivos criados/modificados**: `docs/reports/enter-maas-evidence.md` (atualizado — 2ª coleta de verificação adicionada na seção "Evidência pública coletada §4"; matriz de fatos, comandos reproduzíveis, referências locais e recomendação para a 0175 atualizados/verificados)
- **Testes que verificam o trabalho**: probes públicos sem chave (curl raiz/robots/sitemap/docs/converge.ai/host candidato; `getent` + Python `socket` para DNS) e greps (upstream `references/diegosouzapw-omniroute`, repo local `src/ open-sse/ bin/ electron/ docs/`, proveniência de `gpt-5.6-sol`/`gpt-5.6-terra`/`kimi-k3`, SSoT `docs/sourceoftruth.md`) — transcript completo no relatório
- **Resultado dos testes**: PASS (coleta) — veredito de evidência: **NÃO APROVADO / INDISPONÍVEL**; gate da 0175 permanece bloqueado; nenhum valor de `baseUrl`/`modelsUrl`/`models`/`format`/billing confirmado
- **Resultado do lint**: N/A (docs)
- **Resultado do typecheck/build**: N/A (docs)
- **Entrada no changelog**: NÃO criada nesta execução — instrução do operador é report-only (sem tocar superfícies de changelog geradas). Entrada canônica (`.changelog/` + `rebuild.sh build && rebuild.sh validate`) permanece pendente sob autoridade do orquestrador
- **Agente executor**: researcher (omniroute/researcher)
- **Data de conclusão**: 2026-08-17

## Agent Session Ledger

- **Initial evidence worker**: `ses_ff1c86219ffexHpCxjm1nL0d6r` — first Enter MaaS evidence collection.
- **Evidence follow-up worker**: `ses_ff1ac397fffecyjtV8bi1dIZ82` — second collection and report verification.
- **Official-docs investigator (H1)**: `ses_fef146e52ffeqAQUJCtd6QnJ17` — proved `https://api.enter.pro/code/api/v1/models` and identified the CLI contract.
- **Installed CLI artifact investigator (H2)**: `ses_fef146e32ffe6KRsDLjjt59d9r` — inspected `@enter-pro/enter-code@1.0.17`; no live inference call was made.
- **Authenticated probe investigator (H3)**: `ses_fef146e1affeI1n55b6N78FJKR` — prepared the minimal probe; valid-key inference result remains to be observed.
- **Follow-up status**: RD remains open pending reconciliation of the new official endpoint evidence and one real authenticated model-validation response.

---

## 🔍 Review Trail (preenchido pelo reviewer)

- **Reviewer**: [nome/role]
- **Data da review**: [YYYY-MM-DD]
- **Veredito**: [APROVADO / REJEITADO]
- **Score (path to 100)**: [0-100]
- **Notas**: [evidence-based — cada claim do relatório tem fonte? sem secret? recomendação pronta?]
- **Se REJEITADO**: mover para `02-doing/` com motivo documentado no topo.
