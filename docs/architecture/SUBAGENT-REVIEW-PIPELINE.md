---
title: "Subagent Review Pipeline — Revisão Adversarial Pós-Task"
---

# Subagent Review Pipeline — Revisão Adversarial Pós-Task

> **Status**: Proposta de design
> **Data**: 2026-07-05
> **Autores**: Análise baseada em discussão com ChatGPT sobre extensibilidade do OpenCode
> **Contexto**: Inserir um pipeline de revisão adversarial entre o término de uma
> subagent task e o retorno do resultado ao agente principal.

## Problema

Subagents cometem erros silenciosos: phantom completions, caminhos não verificados,
efeitos colaterais não documentados, testes esquecidos. O agente principal recebe
o resultado e segue em frente, propagando esses erros.

Hoje o fluxo é:

```
Agente Principal
    │
    ├── TaskTool.invoke(subagent prompt)
    │       │
    │       ├── SessionPrompt.prompt()
    │       │       │
    │       │       ├── subagent executa (lê, escreve, shell, etc)
    │       │       │
    │       │       └── AssistantMessage final
    │       │
    │       └── TaskTool recebe Session.WithParts
    │
    └── TaskTool retorna ToolResult → agente principal
```

**Non‑goals desta proposta:**

- Não é um sistema de aprovação para writes individuais (ver
  [`FUSION-TRIGGERS-CONDITIONAL.md`](FUSION-TRIGGERS-CONDITIONAL.md) para isso)
- Não é um CI/CD pipeline
- Não substitui code review humano

<!-- -->

## Solução Proposta

Inserir um **pipeline de pós-processamento** entre o `SessionPrompt.prompt()` e
o retorno do `ToolResult`:

```
Agente Principal
    │
    ├── TaskTool.invoke(subagent prompt)
    │       │
    │       ├── SessionPrompt.prompt()
    │       │       │
    │       │       ├── subagent executa
    │       │       │
    │       │       └── AssistantMessage final
    │       │
    │       ├── 🆕 PostTask Pipeline
    │       │       │
    │       │       ├── 1. Adversarial Review (OmniRoute fusion)
    │       │       │       ├── Recebe sessionID
    │       │       │       ├── Reconstroi sessão inteira (messages, tool_calls, resultados)
    │       │       │       ├── Painel fusion: 3-5 modelos analisam
    │       │       │       └── Judge produz Review JSON
    │       │       │
    │       │       ├── 2. Safety Review (opcional)
    │       │       ├── 3. Cost Analysis (opcional)
    │       │       └── 4. Evidence Checker (opcional)
    │       │
    │       ├── ✅ Aprovado → ToolResult retorna ao main
    │       │
    │       └── ❌ Reprovado → Reabre sessão filha com críticas
    │               │
    │               └── subagent refina → novo review → loop até approved
    │
    └── TaskTool retorna ToolResult final
```

<!-- -->

## Arquitetura

### 1. Ponto de Inserção

Mudança mínima no OpenCode (`TaskTool`), ~15-30 linhas:

```ts
// HOJE:
const result = await SessionPrompt.prompt(session, prompt);
return result;

// DEPOIS:
const result = await SessionPrompt.prompt(session, prompt);
const reviewed = await Pipeline.run("post-task", {
  sessionID: session.id,
  result,
  metadata: {
    parentSessionID: context.sessionID,
    toolID: "task",
  },
});
return reviewed ?? result;
```

### 2. Formato do Review (JSON)

O reviewer **não escreve código** — produz um relatório estruturado:

```json
{
  "approved": false,
  "confidence": 0.72,
  "critical": [
    {
      "type": "phantom_completion",
      "description": "O código criado em src/server.ts linha 45-52 não existe — o modelo alucinou a implementação de rateLimit().",
      "evidence": "grep por 'rateLimit' no working directory retornou vazio"
    }
  ],
  "issues": [
    {
      "type": "missing_error_handling",
      "severity": "medium",
      "description": "fetch() em src/api/client.ts:12 não tem try/catch",
      "suggestion": "Envolver em try/catch com fallback"
    }
  ],
  "missing": [
    "Testes para a nova rota POST /api/users",
    "Validação de input com Zod"
  ],
  "incorrect": [
    "src/config.ts:8 — a porta default é 3000, não 8080"
  ],
  "alternatives": [
    "Usar Drizzle ORM em vez de SQL raw para a migration 001_users"
  ],
  "blindspots": [
    "Nenhum modelo considerou o impacto em rate limiting da nova rota"
  ]
}
```

### 3. Integração com OmniRoute Fusion

O OmniRoute entra como **runtime de revisão**:

```
Pipeline.postTask
    │
    ├── serializa sessão (sessionID → messages + tool_calls + results)
    │
    ├── POST /api/v1/chat/completions
    │   model: "combo/fusion-subagent-review"
    │   body: sessão completa + prompt de revisão adversarial
    │
    └── resposta: Review JSON
```

O combo `fusion-subagent-review` teria:

```json
{
  "name": "fusion-subagent-review",
  "strategy": "fusion",
  "models": [
    "deepseek-web/deepseek-v4-pro-think",
    "opencode-zen/nemotron-3-ultra-free",
    "cerebras/zai-glm-4.7"
  ],
  "config": {
    "judgeModel": "deepseek-web/deepseek-v4-pro-think",
    "fusionTuning": {
      "minPanel": 2,
      "stragglerGraceMs": 20000,
      "panelHardTimeoutMs": 180000
    },
    "responseFormat": { "type": "json_object" }
  }
}
```

### 4. Ciclo de Refino (Loop)

Quando o review `approved = false`:

1. Pipeline serializa as críticas como mensagem do sistema
2. Reabre a mesma sessão filha (mesmo `sessionID` / `task_id`)
3. Injeta: `"O revisor adversarial apontou: [critical issues]. Revise sua resposta."`
4. Subagent responde novamente
5. Pipeline roda review de novo
6. Loop até `approved = true` ou `maxIterations`

```
Subagent → Review → ❌ → crítica → Subagent → Review → ✅ → Main
```

<!-- -->

## Opções de Implementação

### Opção 1: Hook Assíncrono (mínimo, observacional)

```ts
ToolTool.after("complete", async (result) => {
  await fetch("http://localhost:21000/api/review", {
    method: "POST",
    body: JSON.stringify({ sessionID: result.sessionID }),
  });
  // Não modifica o resultado
});
```

**Prós**: Zero risco, não bloqueia o fluxo
**Contras**: Não impede retorno de resposta ruim, não permite loop de refino

### Opção 2: Interceptador no TaskTool (recomendado)

```ts
const result = await prompt(session, prompt);
const reviewed = await plugin.emit("task.completed", {
  sessionID: session.id,
  toolID: "task",
  result,
});
return reviewed?.output ?? result;
```

**Prós**: Plugin pode modificar/substituir o resultado, ~15-30 linhas de mudança
**Contras**: Requer fork/PR do OpenCode

### Opção 3: Middleware no Runner (visão de longo prazo)

```go
Runner.Use(AdversarialReviewMiddleware)
```

**Prós**: Totalmente desacoplado, qualquer plugin funciona
**Contras**: Mudança arquitetural maior, requer refatoração do runtime

<!-- -->

## Evento `tool.completed` (Generalização)

Em vez de um hook específico pra Task, criar um hook genérico:

```ts
interface ToolCompletedEvent {
  toolID: string;        // "task" | "read" | "write" | "edit" | "shell" | "grep" | ...
  args: Record<string, unknown>;
  output: unknown;
  sessionID: string;
  parentSessionID?: string;
  messageID: string;
  metadata: Record<string, unknown>;
}
```

Qualquer plugin pode escutar:

```ts
plugin.on("tool.completed", async (event) => {
  if (event.toolID === "task" && event.parentSessionID) {
    const review = await runReview(event.sessionID);
    return { ...event.output, _review: review };
  }
});
```

Isso desacopla completamente o review do TaskTool — vira um padrão geral do runtime.

<!-- -->

## Próximos Passos

1. **(Agora)** Implementar o fusion condicional (ver
   [`FUSION-TRIGGERS-CONDITIONAL.md`](FUSION-TRIGGERS-CONDITIONAL.md)) —
   já dá pra usar pro write review
2. **(Em paralelo)** Prototipar o hook `task.completed` no OpenCode
   (fork local, ~30 linhas)
3. **(Testar)** Rodar o pipeline com o combo fusion-subagent-review
4. **(Generalizar)** Se funcionar, propor upstream como `tool.completed`
5. **(Evoluir)** Transformar em WriteCouncil: toda tool call crítica passa
   por revisão antes de executar

<!-- -->

## Referências

- [OpenCode Plugins](https://opencode.ai/docs/pt-br/plugins/)
- [OpenCode Tools](https://opencode.ai/docs/tools/)
- [OpenCode Permissions](https://opencode.ai/docs/permissions/)
- [FUSION-TRIGGERS-CONDITIONAL.md](FUSION-TRIGGERS-CONDITIONAL.md)
- [Cybernetics Core — WriteCouncil (arquitetura)](./cluster-decisions.md)
