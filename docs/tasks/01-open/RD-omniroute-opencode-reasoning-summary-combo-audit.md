# RD: OpenCode "(prior reasoning summary unavailable)" — Combo Reasoning Delivery Audit

> **Status**: `[ ]` Open
> **Priority**: 🟢 P2 (evidência/report-only; nenhum código de produção)
> **Type**: `research` (Research / Reference Discovery mode — `.agents/rules/task-numbering.md`)
> **Origin**: Reporte do operador (2026-08-16): o aviso "(prior reasoning summary unavailable)" aparece no harness **OpenCode** dependendo do combo. Pré-análise do architect (2026-08-16) identificou o espaço de hipóteses — esta RD reproduz e classifica com evidência antes de qualquer mudança.
> **Blocks**: — (as recomendações podem gerar tasks de implementação futuras)
> **Depends on**: —
> **Parallelism**: `parallel-safe` — read-only em código; reprodução controlada no harness pelo operador.
> **Review routing**: independent + evidence/report review

---

## Objective

Estabelecer, com **reprodução e evidência** (não leituras de código isoladas), em quais combos o OpenCode exibe "(prior reasoning summary unavailable)" e **classificar a causa** em um dos quatro outcomes — para que qualquer melhoria subsequente seja dirigida, e não especulativa:

1. **OpenCode-only**: a string chega ao harness **sem ter sido emitida pelo translator OmniRoute** (compactação/rehydration/`/compact`/troca de modelo — comportamento próprio da UI). **EXIGE PROVA**: como `NON_ANTHROPIC_THINKING_PLACEHOLDER` é produzido por nós (`claudeHelper.ts:24`), este outcome exige comprovar que o texto visto na UI não veio de um payload do OmniRoute.
2. **Payload perdido pelo OmniRoute**: `reasoning_content`/`reasoning`/eventos de reasoning que o upstream **forneceu** não chegaram ao cliente nesse combo (bug real a corrigir).
3. **Modelo não expõe reasoning**: o target final é um modelo sem reasoning observável — o aviso é **esperado/correto**, não é regressão.
4. **Mistura/fallback de targets**: combo alternou thinking ↔ não-thinking (ou caiu em fallback), produzindo histórico com reasoning em uns turns e sem em outros.

Entregável principal: **`docs/reports/opencode-reasoning-summary-combo-audit.md`** com a matriz de reprodução, classificação por caso e uma **ordem segura de melhorias** (ver seção "Ordem segura").

## Background Context

### O que já existe (verificado nesta sessão):
- A string "(prior reasoning summary unavailable)" **EXISTE no codebase OmniRoute** como constante `NON_ANTHROPIC_THINKING_PLACEHOLDER` (`open-sse/translator/helpers/claudeHelper.ts:24`) — placeholder de fallback para: (a) upstream não-Anthropic Claude-shape (kimi-coding, glmt, zai…), (b) cliente que enviou só `redacted_thinking` no replay, (c) miss no reasoningCache. Injeta em 5 sites: `translator/index.ts:431,466`, `claudeHelper.ts:499,536`, `executors/kimi.ts:68`. **Correção da premissa original desta RD** (2026-08-16): verificações iniciais com grep truncado levaram à conclusão incorreta de "grep zero" — a evidência direta refuta isso, e o plano A vive de um caminho mais rico do que o previsto.
- Mecanismos de reasoning do OmniRoute (predominantemente **request-side → upstream**):
  - `open-sse/services/reasoningCache.ts` — `requiresReasoningReplay()` (lista fixa de providers/models), cache híbrido memória+SQLite, TTL 2h.
  - `open-sse/translator/index.ts:272-292` — `filterToOpenAIFormat(..., { preserveReasoningContent: isReasoner })`; para não-reasoners o `reasoning_content` do request do cliente é stripped.
  - `open-sse/utils/reasoningContentInjector.ts` — placeholder `" "` para modelos thinking em requests ao upstream.
  - `open-sse/utils/stream.ts:1055` — summary **sintético** para reasoning encrypted/redacted (família Codex): "…cannot recover the private reasoning text."
  - `open-sse/transformer/responsesTransformer.ts` — emite `response.reasoning_summary_text.delta` no caminho Responses API.
- Três planos distintos a manter separados:
  - **Plano A — Harness (OpenCode)**: onde a string é produzida, em qual versão e evento.
  - **Plano B — Resposta OmniRoute → cliente**: quais campos/eventos (`reasoning_content`, `reasoning`, Responses events, ausente) chegam por combo.
  - **Plano C — Replay OmniRoute → upstream**: re-injeção/placeholder no request ao upstream.

### O que está faltando / em aberto:
- Fonte exata da string na versão do OpenCode em uso (arquivo+linha ou localização indisponível documentada com `opencode --version`).
- Gatilho comprovado: compactação automática, `/compact`, rehydration, tool-loop, retry, troca de modelo?
- Se o OpenCode consome o aviso a partir de eventos Responses API, campos chat-completions, ou da **ausência** de reasoning.
- Se alternância de combo realmente produz histórico misto (vs apenas correlação casual).
- Se lacunas na lista de replay causam **ausência de payload para o cliente** (mecanismo C ≠ exibição B — medir B diretamente).

---

## Test Requirements

- [ ] A localização da string DEVE citar a **versão exata do OpenCode** e arquivo/linha (ou documentar explicitamente a inacessibilidade + string de versão via `opencode --version`). **Nota corrigida**: a string também ocorre no OmniRoute (`claudeHelper.ts:24`); a RD deve distinguir as duas ocorrências — a origem da string vista na UI do OpenCode NÃO pode ser assumida como harness-only.
- [ ] A matriz de reprodução DEVE usar o **mesmo prompt e as mesmas tools**, comparando: (a) target único direto; (b) cada target do combo isoladamente; (c) combo real; (d) antes/depois de `/compact` ou auto-compact; (e) streaming vs não-streaming; (f) retry.
- [ ] Para cada execução, a matriz DEVE registrar: versão/config OpenCode; trigger; combo + estratégia; **target efetivamente resolvido** (provider/model final); formato cliente (Chat Completions vs Responses); stream sim/não; **presença e tamanho** dos eventos/campos de reasoning (NUNCA conteúdo); resultado na UI (aviso sim/não); contexto do turno anterior (tool call? compactação? fallback?).
- [ ] Cada reprodução DEVE ser classificada em um dos quatro outcomes — casos sem classificação possível DEVE ser listado explicitamente como tal.
- [ ] Nenhum texto de reasoning deve ser gravado em logs/relatório (presença/tamanho apenas).
- [ ] Nenhum código de produção deve ser alterado; RD é read-only/report-only.
- [ ] Entrada real no changelog via `manage-changelog` + `rebuild.sh build && rebuild.sh validate`.

---

## Exit Conditions

- [ ] Localização da string no OpenCode (versão + ref) — ou inacessibilidade documentada com versão.
- [ ] `docs/reports/opencode-reasoning-summary-combo-audit.md` criado com matriz de reprodução e classificação por caso.
- [ ] Regras de classificação nomeadas; casos inconclusivos listados explicitamente.
- [ ] **Ordem segura de melhorias** emitida (ver seção "Ordem segura") com base nos achados.
- [ ] Recomendação final: corrigir OmniRoute (componha B ou C), ou abrir issue no OpenCode (se payload correto e aviso persiste), ou documentar como esperado (outcome 3).
- [ ] `docs/dependency-tree.md` e `docs/tasks/00-planning/EPIC-25` referenciam a RD.
- [ ] Changelog: entrada real via `.changelog/` + `rebuild.sh build && rebuild.sh validate`.

---

## Details

### What

Subtasks:
- [ ] **Ler código existente**: `open-sse/executors/opencode.ts`, `open-sse/translator/response/openai-responses.ts`, `open-sse/translator/response/claude-to-openai.ts`, `open-sse/translator/response/gemini-to-openai.ts`, `open-sse/utils/stream.ts`, `open-sse/transformer/responsesTransformer.ts`, `open-sse/services/reasoningCache.ts`, `open-sse/translator/index.ts`, `open-sse/handlers/chatCore.ts`, `docs/routing/REASONING_REPLAY.md`.
- [ ] **Localizar a string no harness**: `opencode --version`; buscar a string na instalação do OpenCode acessível ao ambiente; se inacessível, documentar versão + como o operador obtém a ref (changelog/issue/repo upstream).
- [ ] **Catalogar combos do operador**: coletar a lista de combos + estratégias em uso (operador fornece; sem inventar).
- [ ] **Executar matriz de reprodução**: mesmo prompt/tools; variações (a)–(f) da seção Test Requirements; registrar a tabela por execução.
- [ ] **Classificar cada caso**: outcome 1–4 com a regra usada.
- [ ] **Escrever o relatório**: `docs/reports/opencode-reasoning-summary-combo-audit.md`.
- [ ] **Emitir ordem segura de melhorias** com base nos achados.
- [ ] **Refactoring pass**: relatório conciso; nenhuma especulação não marcada como hipótese.
- [ ] **Verificação**: cada claim tem fonte? nenhum texto de reasoning gravado? recomendações prontas?

### Where

| Arquivo | Propósito |
|---------|-----------|
| `docs/reports/opencode-reasoning-summary-combo-audit.md` | Criar — relatório principal (matriz + classificação + recomendações). |
| `open-sse/executors/opencode.ts` | Ler — como o executor OpenCode trata/marca reasoning. |
| `open-sse/translator/response/*.ts` | Ler — emissão de `reasoning_content`/`reasoning` por formato. |
| `open-sse/utils/stream.ts` | Ler — paths de passthrough, delete de `reasoning_content`, summary sintético. |
| `open-sse/transformer/responsesTransformer.ts` | Ler — eventos `response.reasoning_summary_*`. |
| `open-sse/services/reasoningCache.ts` | Ler — lista de replay (mecanismo C). |
| `open-sse/translator/index.ts` | Ler — `preserveReasoningContent: isReasoner`. |
| `open-sse/handlers/chatCore.ts` | Ler — capture do cache reasoning (planos B/C). |
| `docs/routing/REASONING_REPLAY.md` | Ler — contrato documentado do replay. |
| `docs/dependency-tree.md` | Modificar — registrar RD (standalone, parallel-safe). |
| `docs/tasks/00-planning/EPIC-25-omniroute-provider-reliability-and-test-integrity.md` | Modificar — registrar RD no epic. |

### How

1. **Plano A (harness) primeiro**: localizar a string na versão exata do OpenCode → determina o gatilho na UI. Se inacessível, registrar a versão e marcar como "a confirmar pelo operador".
2. **Plano B (resposta → cliente)**: para cada combinação da matriz, capturar presença/tamanho dos eventos/campos de reasoning na resposta ao cliente — é o que o harness realmente recebe.
3. **Plano C (replay → upstream)**: somente onde B mostrar ausência, investigar se C (strip/preservação/placeholder) é o mecanismo causal — a partir daí decidir correção dirigida.
4. **Classificar e priorizar**: ordenar por maior certeza → recomendar o menor conjunto de mudanças.

### Why

O aviso depende do combo e pode ter causas em **três planos diferentes**. Mudar mão no replay (C) ou sintetizar summaries sem reprodução pode: não resolver a UI (se for A), mascarar bug real de passagem (se for B), ou inventar texto de reasoning (comprometimento/contexto). A RD separa "diagnosticar" de "mudar" — evidência dirigida antes de qualquer alteração.

---

## Parallelism / file ownership

| Class | Detail |
|-------|--------|
| **parallel-safe** | Read-only em código de produção; reprodução no harness é do operador. |
| **serializable** | Nenhuma task de implementação de reasoning deve rodar ANTES desta RD concluir (evita mudanças especulativas). |
| **Collision** | `docs/reports/opencode-reasoning-summary-combo-audit.md` — exclusivo desta RD. |

---

## ⛔ Anti-Hallucination Guardrails

> [!CAUTION]
> - NÃO afirmar causa sem reprodução: nenhum modelo/combo específico "causa" o aviso até a matriz provar (correlação ≠ causalidade).
> - NÃO gravar **conteúdo** de reasoning em logs/relatório — presença e tamanho apenas.
> - NÃO ampliar `requiresReasoningReplay()` apenas para "melhorar o aviso" — isso só muda com um **400 upstream real** que exija replay.
> - NÃO sintetizar summaries de reasoning para placeholders/conteúdo cifrado sem esta RD concluir que a UI exige texto e que não há alternativa fiel.

> [!IMPORTANT]
> - Manter os três planos (A/B/C) separados; o mecanismo de replay (C) NÃO prova o que o OpenCode exibiu (B).
> - Se os payloads estiverem corretos (B íntegro) e o aviso persistir → correção é upstream/OpenCode, não workaround nosso.
> - Zero Trust: o harness/combo do operador é ambiente externo; logs sanitizados para séries (nunca segredos).

---

## 🛡️ Compliance Checklist (Leis Primárias do AGENTS.md)

- [ ] **Doc Accuracy**: toda claim com fonte/reprodução; string do harness localizada ou inacessibilidade documentada.
- [ ] **Zod Validation**: N/A (nenhum input novo; report-only).
- [ ] **Security**: nenhum texto de reasoning/secrets no relatório; sem chamadas reais em testes.
- [ ] **Error Sanitization**: N/A (report-only).
- [ ] **No Raw SQL**: N/A.
- [ ] **Archive Protocol**: N/A.

---

## 📋 Completion Evidence (preenchido pelo agente executor)

- **Arquivos criados/modificados**: [paths]
- **Testes que verificam o trabalho**: [evidência documentada — versão OpenCode, reproduções, classificação]
- **Resultado dos testes**: [PASS/FAIL]
- **Resultado do lint**: N/A (docs)
- **Resultado do typecheck/build**: N/A (docs)
- **Entrada no changelog**: `.changelog/<entry>.md` via manage-changelog + `rebuild.sh build && rebuild.sh validate`
- **Agente executor**: [nome/role]
- **Data de conclusão**: [YYYY-MM-DD]

## Agent Session Ledger

- **Initial audit worker**: `ses_ff1ac395dffeJ3u0VFdGCAxerF` — source/report audit and deterministic test evidence.
- **Follow-up Plane A/B/C investigator**: `ses_fef146dfbffeTfXoxyifdjBtXr` — confirmed Plane C placeholder mechanism; Plane A/B causality remains unproven.
- **Fallback/translation follow-up**: dispatch was attempted with invalid agent type `gt-codebase-investigator`; no session was created. A corrected valid-agent continuation is required.
- **Follow-up status**: RD remains open until a valid continuation produces explicit YES/NO outcomes or documents the operator-evidence blocker under the revised criteria.

---

## 🔍 Review Trail (preenchido pelo reviewer)

- **Reviewer**: [nome/role]
- **Data da review**: [YYYY-MM-DD]
- **Veredito**: [APROVADO / REJEITADO]
- **Score (path to 100)**: [0-100]
- **Notas**: [evidence-based — string localizada? matriz completa? classificação honesta? nenhum texto de reasoning vazado?]
- **Se REJEITADO**: mover para `02-doing/` com motivo documentado no topo.
