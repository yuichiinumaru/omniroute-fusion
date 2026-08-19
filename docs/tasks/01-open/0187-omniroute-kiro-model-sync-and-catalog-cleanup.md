# Task 0187: Kiro model sync fingerprint headers and catalog cleanup

> **Status**: `[ ]` Open
> **Priority**: 🔴 P1
> **Type**: `remediation`
> **Origin**: Operator inquiry / model sync audit (2026-08-18): Kiro model discovery fails / returns fallback when triggering model sync, and Kiro requests fail with HTTP 400 when using fabricated model IDs. Analysis against reference codebase at `references/diegosouzapw-omniroute/` revealed missing AWS SDK / KiroIDE fingerprint headers in `open-sse/services/kiroModels.ts` and obsolete/fabricated model IDs in `open-sse/config/providers/registry/kiro/index.ts`.
> **Blocks**: —
> **Depends on**: —
> **Parallelism**: `serializable` with any Kiro registry/service changes.
> **Review routing**: independent + provider/runtime review

---

## Objective

Fix Kiro (`kiro` / Amazon Q / CodeWhisperer) live model discovery (`modelsync`) and clean up the static model catalog:

1. Update `open-sse/services/kiroModels.ts` to attach `buildKiroFingerprintHeaders(...)` containing AWS SDK JS, OS, KiroIDE version, `machineId` (SHA-256 seed), and UUID `amz-sdk-invocation-id` headers on `ListAvailableModels` HTTP requests so the Amazon Q API accepts live discovery requests instead of rejecting them or falling back.
2. Add dynamic `-thinking` variant expansion (`expandKiroModels` / `buildVariants`) using `supportsKiroAdaptiveThinking` and 5-minute TTL caching (`catalogCache`) in `open-sse/services/kiroModels.ts`.
3. Update Kiro region resolution to use `resolveKiroRuntimeRegion` in `open-sse/services/kiroModels.ts`.
4. Clean up `open-sse/config/providers/registry/kiro/index.ts`: remove fabricated/extinct model IDs (`auto-kiro`, `claude-fable-5`, `claude-opus-4.8`, `claude-opus-4.7`, `claude-opus-4.6`, `claude-sonnet-4.6`) that cause HTTP 400 `Invalid model` from Kiro, and add actual Kiro models (`claude-sonnet-5`, `claude-sonnet-4.5`, `gpt-5.6-sol`, `gpt-5.6-terra`, `gpt-5.6-luna`) as documented in reference code at `references/diegosouzapw-omniroute/open-sse/config/providers/registry/kiro/index.ts`.
5. Update `open-sse/config/freeModelCatalog.data.ts` to remove `auto-kiro` and align Kiro free tier entries.

## Background Context

### O que já existe:

- `open-sse/services/kiroModels.ts` handles Kiro live model discovery by calling Amazon Q's `ListAvailableModels` endpoint (`GET https://q.{region}.amazonaws.com/ListAvailableModels?origin=AI_EDITOR`).
- Currently, `kiroModels.ts` sends minimal headers: `headers: { Authorization: 'Bearer ...', Accept: 'application/json' }`.
- `open-sse/config/providers/registry/kiro/index.ts` lists 12 models including `auto-kiro`, `claude-fable-5`, `claude-opus-4.8`, `claude-opus-4.7`, `claude-opus-4.6`, and `claude-sonnet-4.6`.
- Reference repository code at `references/diegosouzapw-omniroute/open-sse/services/kiroModels.ts` and `references/diegosouzapw-omniroute/open-sse/config/providers/registry/kiro/index.ts` contains the validated fingerprint header generation and updated model list.

### O que está faltando / quebrado:

- Amazon Q's `ListAvailableModels` endpoint rejects or fails simple HTTP requests lacking AWS SDK and KiroIDE fingerprint headers (`User-Agent`, `x-amz-user-agent`, `x-amzn-kiro-agent-mode: vibe`, `amz-sdk-invocation-id`, `tokentype`).
- Sending `auto-kiro`, `claude-opus-4.x`, or `claude-fable-5` to Kiro's provider endpoint results in HTTP 400 `Invalid model. Please select a different model`.
- `claude-sonnet-4.6` is invalid on Kiro (Kiro's Sonnet is `claude-sonnet-4.5` and `claude-sonnet-5`).
- Kiro added GPT-5.6 series models (`gpt-5.6-sol`, `gpt-5.6-terra`, `gpt-5.6-luna`) which are missing from local registry.

---

## Test Requirements

- Unit test in `tests/unit/kiro-model-sync-fingerprint.test.ts` MUST verify:
  1. `buildKiroFingerprintHeaders` includes `User-Agent`, `x-amz-user-agent`, `x-amzn-kiro-agent-mode: vibe`, `amz-sdk-request`, and `amz-sdk-invocation-id`.
  2. `fetchKiroAvailableModels` passes fingerprint headers during `ListAvailableModels` fetch.
  3. `parseKiroModels` / `expandKiroModels` generates `-thinking` variants for supported models.
  4. TTL cache returns cached results on repeated calls within 5 minutes.
  5. `open-sse/config/providers/registry/kiro/index.ts` models array contains `claude-sonnet-5`, `claude-sonnet-4.5`, `gpt-5.6-sol`, `gpt-5.6-terra`, `gpt-5.6-luna` and contains NO `auto-kiro`, `claude-fable-5`, `claude-opus-4.8`, or `claude-sonnet-4.6`.
- `npm run typecheck:core` MUST pass without errors.
- `npm run lint` MUST pass without new errors.
- Existing Kiro tests MUST remain green.

---

## Exit Conditions (GDD/TDD)

- [ ] Read `open-sse/services/kiroModels.ts`, `open-sse/config/providers/registry/kiro/index.ts`, and reference code at `references/diegosouzapw-omniroute/open-sse/services/kiroModels.ts`.
- [ ] RED tests fail before implementation.
- [ ] `open-sse/services/kiroModels.ts` updated with fingerprint headers, thinking variants, and TTL cache.
- [ ] `open-sse/config/providers/registry/kiro/index.ts` updated with real Kiro model IDs.
- [ ] `open-sse/config/freeModelCatalog.data.ts` updated to reflect clean Kiro catalog.
- [ ] GREEN unit tests pass with 0 failures under `node --import tsx/esm --test`.
- [ ] `npm run typecheck:core` passes without errors.
- [ ] `npm run lint` passes without new errors.
- [ ] Hard Rule #18 satisfied by TDD fail→pass evidence.
- [ ] A real append-only `.changelog/` entry created via manage-changelog and validated.

---

## Details

### What

Subtasks:

- [ ] **Ler existentes**: read `open-sse/services/kiroModels.ts`, `open-sse/config/providers/registry/kiro/index.ts`, `open-sse/config/freeModelCatalog.data.ts`, and reference implementations in `references/diegosouzapw-omniroute/`.
- [ ] Add failing unit tests for Kiro fingerprint headers, model parsing, thinking variants, and clean catalog.
- [ ] Update `open-sse/services/kiroModels.ts` with `buildKiroFingerprintHeaders`, `expandKiroModels`, and `catalogCache`.
- [ ] Update `open-sse/config/providers/registry/kiro/index.ts` static model list.
- [ ] Update `open-sse/config/freeModelCatalog.data.ts`.
- [ ] **Verificação de regressão**: run focused Kiro unit tests, `npm run typecheck:core`, and `npm run lint`.

### Where

| Arquivo | Propósito |
|---------|-----------|
| `open-sse/services/kiroModels.ts` | Modify — add AWS SDK/KiroIDE fingerprint headers, thinking variants, TTL cache. |
| `open-sse/config/providers/registry/kiro/index.ts` | Modify — remove fabricated model IDs, add `claude-sonnet-5`, `gpt-5.6-*`. |
| `open-sse/config/freeModelCatalog.data.ts` | Modify — remove `auto-kiro` and align Kiro free tier entries. |
| `tests/unit/kiro-model-sync-fingerprint.test.ts` | Create — TDD tests for fingerprint headers and model parsing. |
| `references/diegosouzapw-omniroute/open-sse/services/kiroModels.ts` | Read-only — reference code. |
| `references/diegosouzapw-omniroute/open-sse/config/providers/registry/kiro/index.ts` | Read-only — reference code. |

### How

1. Reproduce missing header issue with RED unit test for `kiroModels.ts`.
2. Port `buildKiroFingerprintHeaders` and updated `kiroModels.ts` logic from reference codebase at `references/diegosouzapw-omniroute/open-sse/services/kiroModels.ts`.
3. Update static model catalog in `open-sse/config/providers/registry/kiro/index.ts`.
4. Run tests and typecheck.

### Why

Kiro's `ListAvailableModels` endpoint requires full AWS SDK / KiroIDE fingerprint headers to return per-account model listings. Using fabricated model IDs like `auto-kiro` or `claude-opus-4.8` causes upstream HTTP 400 errors. Bringing Kiro discovery headers and model lists in line with reference code fixes model sync and prevents invalid model dispatch.

---

## Parallelism / file ownership

| Class | Detail |
|-------|--------|
| **serializable** | Owns Kiro models discovery service and Kiro provider registry file. |
| **parallel-safe** | Unrelated provider discovery tasks. |
| **Collision** | `open-sse/services/kiroModels.ts`, `open-sse/config/providers/registry/kiro/index.ts`. |

---

## ⛔ Anti-Hallucination Guardrails

> [!CAUTION]
> Do NOT call `references/diegosouzapw-omniroute/` "upstream". It is the reference repository (`omniroute-fusion` is an independent repository).
> Do NOT invent model IDs not present in Kiro's official catalog.

> [!IMPORTANT]
> All credentials used in tests must be mocked. No live requests to `:22000` or `:23456`.

---

## 🛡️ Compliance Checklist (Leis Primárias do AGENTS.md)

- [ ] **Doc Accuracy**: all paths and symbols cited were verified against local and reference code.
- [ ] **TDD**: failing unit tests precede implementation.
- [ ] **Error Sanitization**: no raw credentials in error logs or test output.
- [ ] **Production Safety**: no live `:22000` requests.

---

## 📋 Completion Evidence (preenchido pelo agente executor)

- **Arquivos criados/modificados**: [lista com paths]
- **RED/GREEN test results**: [real output]
- **Resultado do lint**: [PASS/FAIL]
- **Resultado do typecheck:core**: [PASS/FAIL]
- **Changelog entry**: [path sob `.changelog/` + rebuild/validate]
- **Agente executor**: [nome/role]
- **Data de conclusão**: [YYYY-MM-DD]

---

## 🔍 Review Trail (preenchido pelo reviewer)

- **Reviewer**: [nome/role]
- **Data da review**: [YYYY-MM-DD]
- **Veredito**: [APROVADO / REJEITADO]
- **Score (path to 100)**: [0-100]
- **Notas**: [evidence-based, citar arquivos/linhas]
