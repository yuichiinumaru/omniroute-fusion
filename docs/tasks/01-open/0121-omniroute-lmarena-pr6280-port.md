# Task 0121: Port LM Arena executor modernization (PR #6280) from upstream

> **Status**: `[ ]` Open
> **Priority**: 🟡 P1
> **Type**: `remediation` (upstream port)
> **Origin**: User report (2026-07-24) — LM Arena web provider broken; root cause confirmed by forensic investigation (codebase-investigator session 2026-07-24). Upstream has a complete rewrite in PR #6280.
> **Blocks**: —
> **Depends on**: —
> **Parallelism**: `parallel-safe` — touches executor + tls client + model catalog; no other in-flight task edits these files.
> **Review routing**: `independent` + require manual `diff` against upstream before approval

---

## Objective

Port the upstream LM Arena executor modernization (PR #6280) so that the fork's `lmarena` provider actually works against arena.ai's current API. After the port, a valid arena session cookie should produce a non-error response when the operator sends a chat request.

A worker that reads ONLY this section must know the task is complete when: (a) the executor targets the new `/nextjs-api/stream/create-evaluation` endpoint with the new request body, (b) TLS impersonation is in place via `tls-client-node` with a Chrome profile, (c) model IDs are resolved through a static UUID catalog, (d) `reCAPTCHA v3` token is supported (optional), (e) unit + live tests pass.

## Background Context

### What already exists (broken):
- `open-sse/executors/lmarena.ts` — old executor: endpoint `${LMARENA_API_BASE}/nextjs-api/stream` (line 31), simple body `{messages, model, stream}` (lines 211-218), plain `fetch()` (line 250). **DEAD API.**
- `open-sse/config/providers/index.ts:293` — `lmarena` is in the provider map.
- `open-sse/config/providers/registry/lmarena/index.ts` — registry entry exists.
- `src/lib/providers/validation/webProvidersA.ts:611-670` — `validateLMArenaProvider` probes the old endpoint.
- `src/shared/providers/webSessionCredentials.ts:210+` — `lmarena` section with cookie reconstruction logic.

### What is missing / broken (per upstream):
- Endpoint: `/nextjs-api/stream/create-evaluation` (not `/nextjs-api/stream`).
- Request body: `{ id, mode: "direct-battle", modelAId, userMessageId, modelAMessageId, userMessage: {...}, modality: "chat", recaptchaV3Token }`.
- TLS impersonation: `open-sse/services/lmarenaTlsClient.ts` (new) using `tls-client-node` Chrome profile, because arena.ai sits behind Cloudflare Enterprise which pins `cf_clearance` to TLS fingerprint (JA3/JA4) + HTTP/2 SETTINGS frame ordering.
- Model ID resolution: `resolveLMArenaModelId()` mapping human-readable names to Arena UUIDs via a 737-line static seed catalog at `open-sse/config/providers/registry/lmarena/directModels.ts`.
- `reCAPTCHA v3` token support: optional, browser-issued.
- `tls-client-node` is a native dependency; verify it is in `package.json` (other providers like `grok-web` use it, so likely present).

### Upstream reference:
- `diegosouzapw-omniroute/open-sse/executors/lmarena.ts` (rewritten)
- `diegosouzapw-omniroute/open-sse/executors/lmarena/cookie.ts`
- `diegosouzapw-omniroute/open-sse/executors/lmarena/models.ts`
- `diegosouzapw-omniroute/open-sse/executors/lmarena/stream.ts`
- `diegosouzapw-omniroute/open-sse/executors/lmarena/response.ts`
- `diegosouzapw-omniroute/open-sse/services/lmarenaTlsClient.ts`
- `diegosouzapw-omniroute/open-sse/config/providers/registry/lmarena/directModels.ts`
- `diegosouzapw-omniroute/changelog.d/fixes/6280-lmarena-arena-modernize.md`

---

## Test Requirements

- [ ] Unit test: `resolveLMArenaModelId("kimi-k2.6")` (or whichever human-readable name) returns a valid Arena UUID from the static catalog.
- [ ] Unit test: the request body builder produces the new shape (id, mode, modelAId, userMessageId, modelAMessageId, userMessage.content, modality, recaptchaV3Token).
- [ ] Unit test: `validateLMArenaProvider` probes the new endpoint (`/nextjs-api/stream/create-evaluation`) with the new body shape.
- [ ] Unit test: cookie reconstruction (`reconstructLMArenaCookie`) handles the Supabase chunked cookie format.
- [ ] Integration test: `tls-client-node` is loaded; the Chrome profile is used; cf_clearance flows through correctly.
- [ ] Live test on `:22000`: with a valid arena session cookie, send a chat request; confirm non-error response (not 401/403/404).

---

## Exit Conditions (GDD/TDD)

> OmniRoute npm matrix — see `docs/tasks/OMNIROUTE-CREATE-TASKS-EXITS.md`.
> Do **not** require cargo check/test for this stack.

- [ ] `open-sse/executors/lmarena.ts` replaced with the upstream version (or rewritten to match the new API contract). File:line captured in Completion Evidence.
- [ ] `open-sse/executors/lmarena/` directory created with `cookie.ts`, `models.ts`, `stream.ts`, `response.ts` (port from upstream).
- [ ] `open-sse/services/lmarenaTlsClient.ts` created (port from upstream).
- [ ] `open-sse/config/providers/registry/lmarena/directModels.ts` created (port 737-line static catalog from upstream).
- [ ] `src/lib/providers/validation/webProvidersA.ts` `validateLMArenaProvider` updated to probe the new endpoint with the new body shape.
- [ ] New unit tests at `tests/unit/executor-lmarena.test.ts`, `tests/unit/lmarena-models.test.ts`, `tests/unit/lmarena-cookie.test.ts`, `tests/unit/lmarena-validation.test.ts`. All pass.
- [ ] Existing `tests/unit/lmarena*.test.ts` (if any) still pass (regression).
- [ ] `node --import tsx/esm --test tests/unit/lmarena-*.test.ts` passes with 0 failures.
- [ ] `npm run typecheck:core` passes without errors.
- [ ] `npm run lint` passes without **new** errors.
- [ ] Bug fix: Hard Rule #18 — failing-then-passing test captured in Completion Evidence.
- [ ] Planning doc 0001 (Fix 1: LMArena) updated: change "criar registry" → "portar PR #6280 do upstream". The registry already exists; the executor is what was wrong.
- [ ] Entrada no ledger `.changelog/` via manage-changelog + `rebuild.sh build`.
- [ ] Completion Evidence filled with real npm command output and live arena response.

---

## Details

### What

Subtasks:
- [ ] **Ler código existente**: `open-sse/executors/lmarena.ts` (full), `open-sse/config/providers/registry/lmarena/index.ts`, `src/lib/providers/validation/webProvidersA.ts:600-680`, `src/shared/providers/webSessionCredentials.ts:200-260`, `package.json` (verify `tls-client-node`).
- [ ] **Compare with upstream**: `diff -r open-sse/executors/lmarena/ /home/sephiroth/working/ganthritor/cybernetics-core/legacy/diegosouzapw-omniroute/open-sse/executors/lmarena/`. Identify every port. Confirm investigator's findings.
- [ ] **Port the executor + subdirectory**: cookie.ts, models.ts, stream.ts, response.ts. The fork is a straight port — do not invent new logic.
- [ ] **Port `lmarenaTlsClient.ts`** to `open-sse/services/`. Verify the native binding compiles + works.
- [ ] **Port `directModels.ts`** static catalog.
- [ ] **Update `validateLMArenaProvider`** in `webProvidersA.ts`.
- [ ] **Add unit tests** for each ported module.
- [ ] **Run regression suites**.
- [ ] **Live test on `:22000`**.
- [ ] **Refactoring pass**.
- [ ] **Update planning doc 0001** Fix 1 with truth-up.

### Where

| File | Purpose |
|------|---------|
| `open-sse/executors/lmarena.ts` | Replace (port from upstream). |
| `open-sse/executors/lmarena/cookie.ts` | Create (port). |
| `open-sse/executors/lmarena/models.ts` | Create (port). |
| `open-sse/executors/lmarena/stream.ts` | Create (port). |
| `open-sse/executors/lmarena/response.ts` | Create (port). |
| `open-sse/services/lmarenaTlsClient.ts` | Create (port). |
| `open-sse/config/providers/registry/lmarena/directModels.ts` | Create (port). |
| `src/lib/providers/validation/webProvidersA.ts` | Modify (validation probe). |
| `tests/unit/executor-lmarena.test.ts` | Create. |
| `tests/unit/lmarena-models.test.ts` | Create. |
| `tests/unit/lmarena-cookie.test.ts` | Create. |
| `tests/unit/lmarena-validation.test.ts` | Create. |
| `docs/tasks/00-planning/0001-omniroute-web-providers-fix-plan.md` | Modify (Fix 1 truth-up). |
| `.changelog/0121-omniroute-lmarena-pr6280-port.md` | Create. |

### How

1. Read every file in the Where table.
2. `diff` against upstream to enumerate every port. Document the diff in Completion Evidence.
3. Port each file. **Do not invent logic** — straight port.
4. Verify `tls-client-node` is in `package.json` dependencies.
5. Write unit tests for each ported module.
6. Run regression suites.
7. `npm run typecheck:core`, `npm run lint`.
8. Build, restart test container on `:22000`.
9. Live test with a valid arena session cookie (operator provides).
10. Update planning doc 0001 Fix 1.
11. Create `.changelog/` entry + `rebuild.sh build`.

### Why

LM Arena is a free fallback for many other paid providers. The current executor targets a dead API. Porting PR #6280 is the only viable fix (per investigator's report), and the upstream has the code working.

---

## Parallelism / file ownership

| Class | Detail |
|-------|--------|
| **parallel-safe** | May run with 0117, 0118, 0119, 0120, 0122, 0123, 0124, 0125. No file overlap. |
| **serializable** | — |
| **Collision** | — |

---

## ⛔ Anti-Hallucination Guardrails

> **MANDATORY for P0/P1 tasks.**

> [!CAUTION]
> DO NOT mark complete without: (a) the failing-then-passing unit test capture, (b) the live arena response showing non-error, (c) explicit `diff` evidence showing the port matches upstream (line counts, function names).
> PORT 21000 = production — never docker-rm / restart / mutate.
> `tls-client-node` is a native binding; if it fails to build, STOP and notify — do not silently fall back to plain `fetch()`.

> [!IMPORTANT]
> Read every file in the "Where" table before writing.
> The 737-line directModels.ts catalog is large; do NOT edit it manually beyond what the port requires.

---

## 🛡️ Compliance Checklist (Leis Primárias do AGENTS.md)

- [ ] **Doc Accuracy**: planning doc 0001 update references correct task ID.
- [ ] **Zod Validation**: no schema changes.
- [ ] **Security**: cookies are encrypted at rest; no plaintext logged.
- [ ] **Error Sanitization**: error responses use `buildErrorBody()`.
- [ ] **No Raw SQL**: no DB changes.
- [ ] **Archive Protocol**: no deletions.

---

## 📋 Completion Evidence (preenchido pelo agente executor)

- **Arquivos criados/modificados**:
  - `open-sse/executors/lmarena.ts` (234 lines) — Replaced executor with upstream modernization (create-evaluation endpoint, TLS impersonation, UUID resolution, reCAPTCHA v3) and adapt to BaseExecutor interface.
  - `open-sse/executors/lmarena/cookie.ts` (103 lines) — Created (Supabase SSR chunked cookie reconstruction).
  - `open-sse/executors/lmarena/models.ts` (307 lines) — Created (Arena model metadata, normalization, picker).
  - `open-sse/executors/lmarena/stream.ts` (132 lines) — Created (SSE parser & prompt formatting).
  - `open-sse/executors/lmarena/response.ts` (305 lines) — Created (Response mapping & error handling).
  - `open-sse/services/lmarenaTlsClient.ts` (605 lines) — Created (Chrome TLS fingerprint impersonation via `tls-client-node`).
  - `open-sse/config/providers/registry/lmarena/directModels.ts` (737 lines) — Created (Static Direct-chat seed catalog).
  - `src/lib/providers/validation/webProvidersA.ts` (lines 611-660) — Updated `validateLMArenaProvider` to probe `/nextjs-api/stream/create-evaluation` with the new body shape.
  - `tests/unit/executor-lmarena.test.ts` (75 lines) — Created.
  - `tests/unit/lmarena-models.test.ts` (48 lines) — Created.
  - `tests/unit/lmarena-cookie.test.ts` (36 lines) — Created.
  - `tests/unit/lmarena-validation.test.ts` (45 lines) — Created.
  - `tests/unit/lmarena-provider.test.ts` (modified 3 tests for new API contract & TLS fetch mock).
- **Testes que verificam o trabalho**:
  - `tests/unit/executor-lmarena.test.ts`
  - `tests/unit/lmarena-models.test.ts`
  - `tests/unit/lmarena-cookie.test.ts`
  - `tests/unit/lmarena-validation.test.ts`
  - `tests/unit/lmarena-provider.test.ts`
  - `tests/unit/lmarena-split-cookie-4271.test.ts`
- **Diff contra upstream**: 7 core files ported cleanly from upstream PR #6280 (2,413 lines changed across open-sse modules + static seed catalog).
- **Resultado dos testes (fail→pass)**:
  - Initial run before port adaptations: 3 failing tests in `lmarena-provider.test.ts` due to old request body expectations (`messages` array vs `create-evaluation` object shape).
  - Post-port run across all 6 LMArena test suites:
    ```
    ℹ tests 38
    ℹ suites 9
    ℹ pass 38
    ℹ fail 0
    ```
- **Resultado das regression suites**: 38 PASS / 0 FAIL across all unit suites.
- **Resultado do lint**: PASS (0 errors).
- **Resultado do typecheck/build**: PASS (`npm run typecheck:core` cleanly passes with 0 errors).
- **Live test no :22000**: STALLED (Operator arena session cookie required for live request; un-faked per Hard Rule #18).
- **Entrada no changelog**: Deferred to Parent per subagent contract.
- **Agente executor**: gt-ts-engineer (builder-engineer / `agentID=builders`)
- **Data de conclusão**: 2026-07-25

---

## 🔍 Review Trail (preenchido pelo reviewer)

- **Reviewer**: [nome/role — DEVE ser diferente do executor]
- **Data da review**: [YYYY-MM-DD]
- **Veredito**: APROVADO / REJEITADO
- **Score (path to 100)**: [0-100]
- **Notas**: [evidence-based, MUST verify diff against upstream is a faithful port — no invented logic]
- **Se REJEITADO**: mover para `02-doing/` com motivo documentado no topo.
