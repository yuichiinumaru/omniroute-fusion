# Enter MaaS — Relatório de Evidência

> **RD**: `RD-omniroute-enter-maas-evidence`  
> **Gate**: Task `0175` (Enter MaaS Provider Connector)  
> **Data/hora da coleta**: 2026-08-17 — 1ª coleta 02:38:28-03:00 (probes repetidos até 02:38:56) e 2ª coleta de verificação 03:08:25-03:00 / 06:08:25Z (esta sessão; probes públicos repetidos, sem chave)  
> **Resultado**: **NÃO APROVADO / INDISPONÍVEL** — a evidência pública e local disponível não confirma os valores necessários para implementar o conector.

## Resumo executivo

Não foi possível confirmar, com uma fonte oficial/publicada ou uma resposta HTTP autenticada sanitizada, a base URL da API Enter MaaS, o formato do contrato, streaming SSE, tool calling, catálogo de modelos, billing/créditos, free tier ou rate limits.

O site oficial de produto ficou atrás de uma verificação Cloudflare (`HTTP 403`, `cf-mitigated: challenge`). O domínio candidato `api.enter.converge.ai` não resolveu DNS no ambiente da coleta. A página oficial pública `https://converge.ai` confirma somente a existência/link do produto Enter Pro e não publica a API MaaS, endpoint, catálogo ou billing.

**Conclusão operacional:** o gate da Task 0175 permanece bloqueado. Não há valor exato seguro para `baseUrl`, `modelsUrl`, `models` ou `apiHint` específico de integração.

## Matriz de fatos

| Fato requerido pela RD | Evidência observada | Status | Consequência para 0175 |
|---|---|---|---|
| Base URL canônica | `https://enter.converge.ai` é o site oficial do produto, mas respondeu `403` com desafio Cloudflare. O valor candidato `https://api.enter.converge.ai/v1` aparece na Task 0175 como hipótese, não como confirmação; o host `api.enter.converge.ai` não resolveu DNS durante a coleta. | **INDISPONÍVEL** | Não fixar `baseUrl` nem `PROVIDER_ENDPOINTS.enter-maas`. |
| URL de listagem de modelos | Nenhuma página oficial acessível nem resposta de API confirmou `/v1/models`, `/models` ou outra rota de catálogo para Enter MaaS. | **INDISPONÍVEL** | Não fixar `modelsUrl`; não habilitar descoberta dinâmica apontando para rota não confirmada. |
| Formato OpenAI-compatible | A Task 0175 propõe `format: "openai"`, mas classifica isso como requisito de implementação dependente desta RD. Nenhuma documentação oficial acessível ou resposta real confirmou o formato. | **INDISPONÍVEL** | Não escolher `format: "openai"` com base apenas na task. |
| Formato Anthropic-compatible | Nenhuma evidência oficial/publicada acessível confirmou `/messages` ou compatibilidade Anthropic. | **INDISPONÍVEL** | Não anunciar nem implementar compatibilidade Anthropic. |
| Streaming SSE | Não houve acesso autenticado a uma requisição de chat e nenhuma documentação oficial acessível confirmou SSE. | **INDISPONÍVEL** | Não declarar suporte; a cobertura de teste prevista em 0175 continua sem evidência upstream. |
| Tool calling | Não houve acesso autenticado a uma requisição com ferramentas e nenhuma documentação oficial acessível confirmou tool calling. | **INDISPONÍVEL** | Não definir capability `toolCalling` nem afirmar suporte. |
| Shape de erro | Não foi obtida resposta de erro da API MaaS. O `403` observado é do Cloudflare no site, não um erro de contrato da API. | **INDISPONÍVEL** | Não inferir formato/status de erro do upstream. |
| Catálogo / IDs de modelos | Nenhuma resposta real de catálogo foi obtida. Os IDs `gpt-5.6-sol`, `gpt-5.6-terra` e `kimi-k3` aparecem em vários contextos de outros providers no repositório e na task original, mas isso não prova disponibilidade no Enter MaaS. | **INDISPONÍVEL** | Manter `models: []`; não copiar IDs nem capabilities. |
| Capabilities de modelos | Não foi observada resposta do Enter MaaS com contexto, max output, reasoning, vision ou tool calling. | **INDISPONÍVEL** | Não preencher `contextLength`, `maxOutputTokens`, `supportsReasoning`, `supportsVision` ou `toolCalling`. |
| Autenticação Bearer / criação de chave | A Task 0175 registra uma pesquisa do operador dizendo `Authorization: Bearer <...>` e `Settings → API Keys`, mas essa informação não foi confirmada por documentação oficial acessível, painel autenticado ou probe autenticado nesta execução. | **NÃO VERIFICADO** | Não tratar a anotação local como prova suficiente para aprovar o gate; não incluir chave/segredo. |
| Créditos compartilhados / billing | A Task 0175 e a RD explicitamente registram compartilhamento de créditos como não confirmado. Nenhuma página oficial acessível confirmou a relação entre MaaS, Enter Pro ou Enter Code. | **INDISPONÍVEL** | `apiHint` não pode prometer créditos compartilhados, saldo, cobrança ou equivalência de conta. |
| Free tier | Nenhuma fonte oficial acessível confirmou free tier para a API MaaS. | **INDISPONÍVEL** | Não adicionar entrada em catálogo free-tier. |
| Rate limits | Nenhuma fonte oficial acessível confirmou limites, quotas ou cooldowns. | **INDISPONÍVEL** | Não escolher limite, retry ou cooldown específico para Enter MaaS. |

## Evidência pública coletada

### 1. Site oficial do produto

- URL: <https://enter.converge.ai/>  
  Probe `curl -sS -D - -o /dev/null --max-time 20 https://enter.converge.ai/` em 2026-08-17T02:38:28-03:00 retornou `HTTP/2 403`, `server: cloudflare`, `cf-mitigated: challenge` e uma página de verificação de segurança. Isso comprova apenas que o acesso automatizado foi bloqueado; não comprova endpoint, contrato ou catálogo.
- URL: <https://enter.converge.ai/robots.txt>  
  Retornou `200` e publica `Sitemap: https://enter.converge.ai/sitemap.xml`, além de regras para `/workspace` e `/app`. O arquivo não contém base URL de API, formato de contrato, modelos, billing ou limites.
- `https://enter.converge.ai/docs` também retornou `403` com o mesmo desafio Cloudflare. Não foi possível ler documentação oficial dessa rota.

### 2. Página pública relacionada da empresa

- URL: <https://converge.ai>  
  Retornou `200`. O HTML contém links públicos para `https://enter.converge.ai` e o texto “Enter Pro”, além de uma descrição geral do produto. A inspeção não encontrou “MaaS”, créditos ou um contrato de API publicamente descrito. Portanto, a página não é evidência dos valores exigidos pela RD.

### 3. Probe do host candidato

- URL tentada: `https://api.enter.converge.ai/v1/models`.
- Resultado: falha de resolução (`curl: (6) Could not resolve host: api.enter.converge.ai`; Python `socket.gaierror: [Errno -2] Name or service not known`).
- Interpretação: o probe **não** confirma que a URL está errada ou certa em todos os ambientes; confirma somente que não foi possível resolver esse host a partir deste ambiente. Não houve resposta `200`, `401`, `403` ou `404` da API e, portanto, não há resposta de catálogo a registrar.

### 4. Segunda coleta de verificação (2026-08-17T03:08-03:00 / 06:08Z) — esta sessão

Reprodução independente da 1ª coleta (sem chave, cookie ou segredo). Resultados:

- `date -u +'%Y-%m-%dT%H:%M:%SZ'` → `2026-08-17T06:08:25Z` (03:08:25-03:00).
- `https://enter.converge.ai/` → `HTTP/2 403`, `server: cloudflare`, `cf-mitigated: challenge` — mesma classe da 1ª coleta (desafio gerenciado Cloudflare; página HTML, sem conteúdo de produto).
- `https://enter.converge.ai/robots.txt` → `200`. Contém bloco "Cloudflare Managed content" com `Content-Signal`, `Disallow: /workspace` e `/app`, e `Sitemap: https://enter.converge.ai/sitemap.xml`. Nenhuma base URL, contrato, modelo ou billing de MaaS.
- `https://enter.converge.ai/sitemap.xml` → HTML de desafio "Just a moment…" (`<title>Just a moment...</title>`); o sitemap em si também está atrás do desafio.
- `https://enter.converge.ai/docs` → `HTTP/2 403`, `cf-mitigated: challenge`.
- `https://converge.ai` → `200`, 167 878 bytes. **Zero ocorrências de "MaaS"** e apenas 1 de "API". Links externos presentes: `enter.converge.ai` (6), `framia.converge.ai` (6), `work.converge.ai` (3), `x.com` (4), `linkedin.com` (4) — **nenhum href com `blog`, `docs` ou `api`**. A página confirma só a existência/link do produto Enter (marketing de CLI/workspace), sem contrato MaaS.
- `https://api.enter.converge.ai/v1/models` → `curl: (6) Could not resolve host: api.enter.converge.ai` — sem resposta HTTP; nenhum status (200/401/403/404) a registrar.
- DNS: Python `socket.gethostbyname_ex` → `api.enter.converge.ai` → `gaierror [Errno -2] Name or service not known`; controle `enter.converge.ai` → `['104.18.20.196', '104.18.21.196']` (anycast Cloudflare, consistente com `cf-mitigated`).
- Upstream `references/diegosouzapw-omniroute`: `grep -rniE 'enter[- ]maas|converge\.ai|enter\.converge'` → **zero arquivos** (a 1ª coleta usou o equivalente `git grep`; resultados idênticos).
- Repo local (`src/ open-sse/ bin/ electron/ docs/`): nenhuma referência a `enter-maas`/`enter.converge`/`converge.ai` fora dos arquivos desta RD/0175 e de menção textual em `docs/tasks/01-open/0176-omniroute-canonical-alias-normalization.md:155`.
- `docs/sourceoftruth.md` (SSoT de identidade de providers, AGENTS.md rules 6-8): **nenhuma** entrada `enter`/`maas`/`converge`.

**Resultado da verificação:** idêntico à 1ª coleta — todos os itens seguem INDISPONÍVEL (auth Bearer segue NÃO VERIFICADA). Nenhum valor de endpoint, contrato, catálogo ou billing pôde ser observado.

**Limitação declarada (ambas as coletas):** o bloqueio Cloudflare e a não-resolução DNS de `api.enter.converge.ai` são observações deste ambiente de coleta, não prova de inexistência do serviço em outros ambientes. O gate só destrava com: (a) docs oficiais acessíveis com endpoint/contrato, (b) acesso autenticado ao painel/docs oficiais, ou (c) probe autenticado do operador com chave removida e request/response sanitizados.

## Referências locais

Estas referências orientam a implementação do repositório, mas não substituem evidência do serviço Enter:

1. `docs/tasks/01-open/RD-omniroute-enter-maas-evidence.md:18-23,32-37,117-127` lista endpoint, contrato, catálogo, autenticação e billing como itens que precisam de confirmação e identifica `https://api.enter.converge.ai/v1` como hipótese.
2. `docs/tasks/01-open/0175-omniroute-enter-maas-provider-connector.md:20-28,49-52,74-81` mantém `baseUrl`/`modelsUrl` dependentes da RD, exige catálogo vazio sem observação e registra como não confirmados formato, streaming, tool calls, billing e free tier.
3. `open-sse/config/providers/shared.ts:103-151` define `RegistryEntry`: `models: RegistryModel[]` é **obrigatório**, enquanto `baseUrl?: string` e `modelsUrl?: string` são opcionais (também `passthroughModels?`, `defaultContextLength?`). Isso permite um seed vazio no código, mas não transforma uma URL desconhecida em valor válido.
4. `src/app/api/providers/[id]/models/route.ts:132-195` lista `NAMED_OPENAI_STYLE_PROVIDERS` — o provider só serve catálogo live se estiver nesse set (último template: `aihubmix`). `route.ts:1210-1239` gera os candidatos (`<base>/v1/models`, `<base>/models`, `<baseUrl>/models`) e faz fallback ao catálogo local. Essa lógica só deve ser ativada depois que uma URL real do Enter for confirmada.
5. Busca no upstream local `references/diegosouzapw-omniroute` (2ª coleta: `grep -rniE 'enter[- ]maas|converge\.ai|enter\.converge'`; 1ª coleta: `git grep` equivalente) encontrou **zero** arquivos. As ocorrências locais de `gpt-5.6-sol`, `gpt-5.6-terra` e `kimi-k3` pertencem a outros providers/funcionalidades e não são evidência do Enter MaaS.
6. Busca no repo local (2ª coleta): `grep -rniE 'enter[- ]maas|enter\.converge|converge\.ai' src/ open-sse/ bin/ electron/ docs/` retornou apenas os arquivos desta RD/0175 e uma menção textual em `docs/tasks/01-open/0176-omniroute-canonical-alias-normalization.md:155`. Nenhum código de produção referencia Enter/Converge.
7. Proveniência dos IDs candidatos (file:line, 2ª coleta): `gpt-5.6-sol` (e variantes `-ultra/-max/-xhigh/-high/-medium/-low`) e `gpt-5.6-terra` → `open-sse/config/providers/registry/codex/index.ts:34-72` e `open-sse/executors/codex.ts` (provider `codex`); `kimi-k3` → `open-sse/config/providers/registry/opencode/go/index.ts:32-33`, `open-sse/config/providers/registry/aihubmix/index.ts:15` e `open-sse/config/freeModelCatalog.data.ts:32`. Nenhum deles é evidência de disponibilidade no Enter MaaS.
8. `docs/sourceoftruth.md` (SSoT de identidade de providers e regra de catálogo, AGENTS.md rules 6-8): nenhuma entrada `enter`/`maas`/`converge` — a disciplina SSoT é atendida por ausência: nada sobre Enter está documentado como modelo corrente.

## Comandos e resultados reproduzíveis

Os comandos abaixo foram executados sem chave, cookie ou segredo:

```text
$ date -Iseconds
2026-08-17T02:38:28-03:00

$ curl -sS -D - -o /dev/null --max-time 20 https://enter.converge.ai/
HTTP/2 403
server: cloudflare
cf-mitigated: challenge

$ curl -sS --max-time 20 https://enter.converge.ai/robots.txt
... Sitemap: https://enter.converge.ai/sitemap.xml
... Disallow: /workspace
... Disallow: /app

$ curl -sS -D - -o /dev/null --max-time 20 https://api.enter.converge.ai/v1/models
curl: (6) Could not resolve host: api.enter.converge.ai

$ git -C references/diegosouzapw-omniroute grep -n -F -- 'enter.converge.ai' ...
(no matches)
$ git -C references/diegosouzapw-omniroute grep -n -F -- 'enter-maas' ...
(no matches)
$ git -C references/diegosouzapw-omniroute grep -n -F -- 'converge.ai' ...
(no matches)
```

**Segunda coleta (2026-08-17T03:08-03:00 / 06:08Z, esta sessão — transcript resumido; seção "Evidência pública coletada §4" tem o detalhe):**

```text
$ date -u +'%Y-%m-%dT%H:%M:%SZ'
2026-08-17T06:08:25Z

$ curl -sS -D - -o /dev/null --max-time 20 https://enter.converge.ai/
HTTP/2 403
server: cloudflare
cf-mitigated: challenge

$ curl -sS --max-time 20 https://enter.converge.ai/sitemap.xml
<title>Just a moment...</title>        # desafio Cloudflare, não XML

$ curl -sS --max-time 20 https://converge.ai | grep -oic 'maas'
0

$ curl -sS -D - -o /dev/null --max-time 20 "https://api.enter.converge.ai/v1/models"
curl: (6) Could not resolve host: api.enter.converge.ai

$ python3 -c "import socket; print(socket.gethostbyname_ex('api.enter.converge.ai'))"
gaierror [Errno -2] Name or service not known

$ grep -rniE 'enter[- ]maas|converge\.ai|enter\.converge' references/diegosouzapw-omniroute -l
(no matches)
```

## Recomendação exata para Task 0175

| Campo | Valor seguro agora | Decisão |
|---|---|---|
| `baseUrl` | `INDISPONÍVEL` | Não implementar/fixar. |
| `modelsUrl` | `INDISPONÍVEL` | Não implementar/fixar. |
| `models` | `[]` | Se houver scaffolding posterior autorizado, manter seed vazio; não adicionar IDs ou capabilities. Isso não libera o conector sem endpoint/contrato. |
| `apiHint` | `INDISPONÍVEL` para billing e capacidades | Não afirmar créditos compartilhados, free tier, limites ou caminho de chave sem fonte oficial. |
| `format` | `INDISPONÍVEL` | Não assumir OpenAI ou Anthropic. |
| `streaming` | `INDISPONÍVEL` | Não afirmar SSE. |
| `toolCalling` | `INDISPONÍVEL` | Não anunciar capability. |
| autenticação | `NÃO VERIFICADA` | A anotação local de Bearer não é prova suficiente para aprovação; não usar segredo real nesta coleta. |

### Consequência de gate

Task 0175 **não deve**:

- criar ou registrar o provider `enter-maas` em produção;
- fixar `https://api.enter.converge.ai/v1` ou qualquer outra URL;
- adicionar `enter-maas` a `NAMED_OPENAI_STYLE_PROVIDERS`;
- publicar IDs/capabilities de modelos;
- declarar OpenAI, Anthropic, SSE, tool calling, créditos compartilhados, free tier ou rate limits;
- escolher retry/cooldown com base em valores não observados.

Para destravar a task, é necessária uma nova coleta com pelo menos uma destas evidências: (a) documentação oficial acessível com endpoint e contrato; (b) acesso autenticado ao painel/documentação oficial; ou (c) probe autenticado executado pelo operador, com chave removida e request/response sanitizados. A próxima coleta deve registrar data/hora, URL efetiva, status, headers não sensíveis e body sanitizado — nunca a chave.

## Escopo e integridade

- Arquivo atualizado nesta execução: `docs/reports/enter-maas-evidence.md` (duas coletas documentadas: 02:38-03:08 e verificação 03:08, ambas 2026-08-17, fuso -03:00).
- Nenhum código de produção foi alterado; nenhuma chave ou segredo aparece no relatório; nenhum modelo/endpoint/capability foi afirmado sem observação.
- `docs/dependency-tree.md` (linhas 59, 133, 160) e `docs/tasks/00-planning/EPIC-25-omniroute-provider-reliability-and-test-integrity.md` (linhas 55, 92-93) já registram a RD como gate da 0175 — verificados por leitura nesta execução; não modificados.
- **Nenhum changelog foi criado/modificado**: a instrução do operador para esta execução é report-only (sem tocar superfícies de changelog geradas). A entrada de changelog canônica (`.changelog/` + `rebuild.sh build && rebuild.sh validate`) permanece pendente, sob autoridade do orquestrador.
- Matriz de fatos e "Recomendação exata para Task 0175" permanecem inalteradas: `baseUrl`/`modelsUrl`/`models`/`format`/`streaming`/`toolCalling`/billing/free tier/rate limits = INDISPONÍVEL; autenticação Bearer = NÃO VERIFICADA.
