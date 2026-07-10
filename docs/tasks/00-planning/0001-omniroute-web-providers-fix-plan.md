# Fix Definitivo — Web Providers para Fusion Mode

> **Status**: Planning
> **Priority**: High
> **Author**: GT-Architect
> **Date**: 2026-07-06
> **Context**: Fusion mode (conditional-fusion) precisa de providers web non-stream. 4 providers estão com problemas conhecidos.

---

## Problema Geral

O fusion mode chama modelos em paralelo via painel com `stream: false`. Providers web (chatgpt-web, claude-web, qwen-web, lmarena) são candidatos ideais por serem non-stream nativos, mas todos estão quebrados de alguma forma.

---

## Fix 1: LMArena — "validation not supported" (Baixa Complexidade)

### Root Cause

O executor `LMArenaExecutor` existe e está registrado em `open-sse/executors/index.ts`, mas o provider **não tem registry entry** em `open-sse/config/providers/index.ts`. Quando a UI tenta validar:

```
validateProviderApiKey("lmarena", cookie)
  → SPECIALTY_VALIDATORS["lmarena"] → não existe
  → WEB_COOKIE_PROVIDERS["lmarena"] → existe
    → getRegistryEntry("lmarena") → null
    → { unsupported: true }
  → HTTP 400 "Provider validation not supported"
```

### Arquivos a Modificar

| Ação | Arquivo | Descrição |
|------|---------|-----------|
| CRIAR | `open-sse/config/providers/registry/lmarena/index.ts` | Registry entry: `id: "lmarena"`, `authType: "cookie"`, `executor: "lmarena"`, baseUrl `https://arena.ai`, models iniciais |
| MODIFICAR | `open-sse/config/providers/index.ts` | Importar `lmarenaProvider` + adicionar ao objeto `REGISTRY` |
| MODIFICAR (opcional) | `src/lib/providers/validation/webProvidersA.ts` | Função `validateLMArenaProvider()` que envia cookie real e valida contra endpoint conhecido |

### Critérios de Aceite

- [ ] `getRegistryEntry("lmarena")` retorna entry válida
- [ ] UI mostra campo de cookie para LMArena
- [ ] `POST /api/providers/validate` não retorna mais `unsupported`
- [ ] `npm run typecheck:core` passa sem erros

### Referência

Seguir padrão de: `open-sse/config/providers/registry/chatgpt/index.ts`

---

## Fix 2: chatgpt-web — ~0 tokens / rate limit silencioso (Baixa Complexidade)

### Root Cause

O executor `ChatGptWebExecutor` trata `stream:false` corretamente no formato de resposta (`buildNonStreamingResponse()`), mas:

1. Passa `stream: false` ao `tlsFetchChatGpt()`, causando buffering silencioso que pode causar timeout em respostas longas
2. Não loga o status HTTP real do upstream — quando retorna 429/401/403, o erro se perde e chega ao caller como ~0 tokens

### Fluxo Atual (problemático)

```
stream=false → tlsFetchChatGpt(stream: false)
  → TLS client bufferiza resposta inteira
  → buildNonStreamingResponse() consome SSE
  → SE 429: errorBody é parseado como "sucesso" com corpo vazio
  → Retorna JSON com ~0 tokens
```

### Arquivos a Modificar

| Ação | Arquivo | Descrição |
|------|---------|-----------|
| MODIFICAR | `open-sse/executors/chatgpt-web.ts` ~linha 3050 | Forçar `stream: true` no `tlsFetchChatGpt()` — buffering local é mais seguro |
| MODIFICAR | `open-sse/executors/chatgpt-web.ts` ~linha 2072 (`buildNonStreamingResponse()`) | Logar `response.status` antes de consumir SSE. Se 4xx/5xx, logar corpo parcial e erro claro |
| MODIFICAR | `open-sse/executors/chatgpt-web.ts` ~linha 3067-3084 | Tratar 429/401/403 distintamente — nunca silenciar |

### Critérios de Aceite

- [ ] Request com `stream:false` retorna JSON válido (não ~0 tokens)
- [ ] Logs estruturados aparecem quando upstream retorna 4xx/5xx
- [ ] `stream:true` continua funcionando como antes
- [ ] Não há timeout em respostas longas

---

## Fix 3: claude-web — "eu não sei onde estou me ajuda" (Média Complexidade, ALTA Prioridade)

### Root Cause

`transformToClaude()` (claude-web.ts, linhas 322-365) **joga fora todo o contexto**:

```typescript
function transformToClaude(body, model) {
  let prompt = "";
  for (const msg of messages) {
    if (msg.role === "user") {
      prompt = String(msg.content || ""); // SOBRESCREVE a cada user message!
    }
  }
  return { prompt, model, ... }; // ← string plana, sem contexto
}
```

Resultado: modelo recebe só a última mensagem do usuário, sem system, sem histórico, sem tool_calls. Explica o "não sei onde estou".

Além disso, o executor **ignora o parâmetro `stream`** (prefixo `_stream`) — sempre retorna SSE.

### Fluxo Atual vs Corrigido

**Atual (quebrado):**
```
Body OpenAI → transformToClaude() → prompt plana → Claude web API
  → SSE → buildClaudeStreamingResponse() → SEMPRE SSE
```

**Corrigido:**
```
Body OpenAI → openaiToClaudeRequest() → Messages API format → Claude web API
  → SSE → se !stream: acumular → JSON | se stream: SSE
```

### Arquivos a Modificar

| Ação | Arquivo | Descrição |
|------|---------|-----------|
| MODIFICAR | `open-sse/executors/claude-web.ts` ~linhas 322-365 | Substituir `transformToClaude()` por import do `openaiToClaudeRequest()` de `open-sse/translator/request/openai-to-claude.ts` |
| MODIFICAR | `open-sse/executors/claude-web.ts` ~linha 667 (`execute()`) | Remover prefixo `_stream`. Adicionar ramo: se `!stream` → acumular SSE → retornar JSON |
| MODIFICAR | `open-sse/executors/claude-web.ts` | Mapear output do tradutor para payload web (system obrigatório, sem campo model na URL) |

### Componentes do Tradutor Oficial (já existente)

O `openaiToClaudeRequest()` em `open-sse/translator/request/openai-to-claude.ts` (822 linhas) já faz:
- Converte `system`/`developer` → sistema Claude
- Converte `tool_calls` → `tool_use` blocks
- Converte `tool` role → `tool_result` blocks
- Preserva `reasoning_content` → `thinking` blocks
- Gerencia `cache_control`
- Normaliza IDs de ferramentas

### Critérios de Aceite

- [ ] Request com histórico de tools → Claude responde coerentemente
- [ ] `stream:false` retorna JSON, não SSE
- [ ] `stream:true` continua funcionando como antes
- [ ] `npm run typecheck:core` passa

---

## Fix 4: qwen-web — WAF bloqueia requests (Alta Complexidade)

### Root Cause

O baxia WAF da Alibaba detecta `fetch()` nativo do Node.js via:
- TLS fingerprint (JA3/JA4) diferente do Chrome
- HTTP/2 SETTINGS frame diferente
- Falta de `bx-umidtoken` real

Comparação com outros providers:

| Provider | TLS Client | Arquivo |
|----------|-----------|---------|
| chatgpt-web | ✅ `chatgptTlsClient.ts` | TLS impersonation |
| claude-web | ✅ `claudeTlsClient.ts` | TLS impersonation |
| grok-web | ✅ `grokTlsClient.ts` | TLS impersonation |
| perplexity-web | ✅ `perplexityTlsClient.ts` | TLS impersonation |
| **qwen-web** | ❌ `fetch()` nativo | **Detectável pelo WAF** |

### O que Colar no Auth

O Cookie HEADER COMPLETO de `chat.qwen.ai`, não só o JWT:
```
cna=...; token=eyJ...; ssxmod_itna=...; ssxmod_itna2=...; _bl_uid=...
```

### Arquivos a Modificar

| Ação | Arquivo | Descrição |
|------|---------|-----------|
| CRIAR | `open-sse/services/qwenTlsClient.ts` | TLS client seguindo padrão `grokTlsClient.ts`: singleton, `tls-client-node`, profile `chrome_149`, exit hooks |
| MODIFICAR | `open-sse/executors/qwen-web.ts` | Substituir `fetch()` por `tlsFetchQwen()` nas 2 chamadas (chats/new + chat/completions) |
| MODIFICAR | `src/lib/providers/validation/webProvidersA.ts` | `validateQwenWebProvider()` → usar `tlsFetchQwen()` |

### Referência Principal

Copiar padrão de: `open-sse/services/grokTlsClient.ts` (~250 linhas)

### Critérios de Aceite

- [ ] Validador aceita cookie completo e retorna `valid`
- [ ] Request real passa pelo WAF com cookie completo
- [ ] Se WAF bloquear mesmo com TLS: documentar como limitação upstream
- [ ] Fallback claro se `tls-client-node` não estiver disponível

### Documentação

- Atualizar README do provider com formato exato do cookie
- Incluir nota sobre limitações do WAF

---

## Estratégia de Execução Paralela

### Wave 1 (4 subagents simultâneos)

| Subagent | Fix | Escopo | Dependências |
|----------|-----|--------|--------------|
| A | LMArena | Criar registry + import | Nenhuma |
| B | chatgpt-web | Stream fix + logging | Nenhuma |
| C | claude-web | Translator + stream | Nenhuma |
| D | qwen-web | TLS client | Nenhuma |

### Wave 2 (após Wave 1)

| Subagent | Escopo | Dependências |
|----------|--------|--------------|
| E | Typecheck consolidado + testes | Todos os fixes |
| F | Smoke test E2E na 21000 | Todos os fixes |

### Wave 3 (consolidação)

- CHANGELOG entry
- Merge / commit
- Docker rebuild final

---

## Riscos

| Fix | Risco | Mitigação |
|-----|-------|-----------|
| LMArena | Endpoint de validação pode não existir | Testar com 1 cookie real |
| chatgpt-web | Rate limit é por IP, não código | Separar fix de limitação operacional |
| claude-web | API web pode ter schema ≠ Messages API | Smoke test com cred real obrigatório |
| qwen-web | `tls-client-node` binary não disponível | Fallback claro se ausente |
| Todos | Server morre durante execução | Usar Docker em vez de `node` direto |

---

## Referências

- Template: `docs/tasks/000-template.md`
- Tradutor Claude: `open-sse/translator/request/openai-to-claude.ts` (822 linhas)
- TLS client Grok (referência): `open-sse/services/grokTlsClient.ts` (~250 linhas)
- Registry pattern: `open-sse/config/providers/registry/chatgpt/index.ts`
- Validation pipeline: `src/lib/providers/validation.ts`
