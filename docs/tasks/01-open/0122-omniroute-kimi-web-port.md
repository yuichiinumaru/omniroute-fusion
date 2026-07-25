# Task 0122: Port Kimi-web executor from upstream (Connect-RPC, www.kimi.com, bearer token)

> **Status**: `[ ]` Open
> **Priority**: 🟡 P1
> **Type**: `remediation` (upstream port)
> **Origin**: User report (2026-07-24) — Kimi web provider broken even with valid cookie/token. Root cause confirmed by forensic investigation (codebase-investigator session 2026-07-24). Note: there are 4 Kimi providers — this task is **only** for `kimi-web`.
> **Blocks**: —
> **Depends on**: —
> **Parallelism**: `parallel-safe` — touches only `open-sse/executors/kimi-web.ts` and related registry/auth files; no other in-flight task edits these.
> **Review routing**: `independent` + require manual `diff` against upstream before approval

---

## Objective

Port the upstream Kimi-web executor so that the fork's `kimi-web` provider works against `www.kimi.com`'s current Connect-RPC API. After the port, a valid kimi access_token should produce a non-error response.

A worker that reads ONLY this section must know the task is complete when: (a) the executor targets `https://www.kimi.com/apiv2/kimi.gateway.chat.v1.ChatService/Chat` (not `kimi.moonshot.cn/api/chat`), (b) the executor sends `Content-Type: application/connect+json` and `connect-protocol-version: 1` headers, (c) the executor uses `extractKimiAccessToken()` to parse tokens, (d) the executor uses `frameConnectMessage()`/`decodeConnectFrame()` to handle Connect-RPC binary framing, (e) unit + live tests pass.

## Background Context

### What already exists (broken):
- `open-sse/executors/kimi-web.ts:13-36` — endpoint `https://kimi.moonshot.cn/api/chat` (DEAD DOMAIN), simple JSON body, plain fetch. **DEAD API.**
- `open-sse/config/providers/registry/kimi/web/index.ts:13-16` — stale model IDs `kimi-default`, `kimi-128k`.
- `src/shared/constants/providers/web-cookie.ts:237-249` — stale references to `kimi.moonshot.cn` for kimi-web.
- `open-sse/services/tokenExtractionConfig.ts:192-204` — stale token config (`kimi_token` cookie).
- `src/shared/providers/webSessionCredentials.ts:153-159` — kimi-web section using cookie-jar approach.
- `src/lib/providers/validation.ts` — no dedicated `validateKimiWebProvider`; falls through to generic `validateWebCookieProvider`.

### What is missing / broken (per upstream):
- Domain: `https://www.kimi.com` (the `kimi.moonshot.cn` domain now redirects to this for non-CN visitors).
- API path: `https://www.kimi.com/apiv2/kimi.gateway.chat.v1.ChatService/Chat` (Connect-RPC).
- Protocol: Connect-RPC binary framing, not REST/JSON.
- Auth: bearer token from `access_token` localStorage or `kimi-auth` cookie, NOT a session cookie jar.
- Model IDs: `k3`, `k2d6` (with `supportsReasoning: true`).
- `extractKimiAccessToken()` helper at `src/lib/providers/webCookieAuth.ts:110-125`.
- `validateKimiWebProvider` at `src/lib/providers/validation/webProvidersA.ts:21-80`.

### Upstream reference (in `/home/sephiroth/working/ganthritor/cybernetics-core/legacy/diegosouzapw-omniroute/`):
- `open-sse/executors/kimi-web.ts` (rewritten, ~586 lines)
- `open-sse/config/providers/registry/kimi/web/runtime.ts` (new — 76 lines)
- `open-sse/config/providers/registry/kimi/web/index.ts` (replaced — model IDs k3/k2d6)
- `src/lib/providers/webCookieAuth.ts` (added `extractKimiAccessToken`)
- `src/lib/providers/validation/webProvidersA.ts` (added `validateKimiWebProvider`)
- `src/lib/providers/validation.ts` (registered in `SPECIALTY_VALIDATORS`)
- Tests: `tests/unit/executor-kimi-web.test.ts`, `executor-kimi-web-decoder.test.ts`, `kimi-web-models-discovery.test.ts`

### Disambiguation reminder (per AGENTS.md provider disambiguation note):
There are **4 Kimi providers** in OmniRoute. This task is **only** for `kimi-web` (the web/cookie/token-based one). The other 3 are:
- `kimi` / `moonshot` — API Key pay-as-you-go
- `kimi-coding` — OAuth
- `kimi-coding-apikey` — API Key coding plan

**Do NOT touch the other 3.**

---

## Test Requirements

- [ ] Unit test: `extractKimiAccessToken("bearer abc123")` returns `"abc123"`.
- [ ] Unit test: `extractKimiAccessToken("access_token=abc123; kimi-auth=xyz")` returns `"abc123"`.
- [ ] Unit test: `extractKimiAccessToken("abc123")` (bare) returns `"abc123"`.
- [ ] Unit test: `extractKimiAccessToken("")` returns `null`.
- [ ] Unit test: `frameConnectMessage({id: "...", mode: "..."})` produces a valid Connect frame (5-byte envelope + JSON).
- [ ] Unit test: `decodeConnectFrame(buffer)` extracts the original payload.
- [ ] Unit test: `resolveKimiModelId("k3")` returns the upstream model config (with `supportsReasoning: true`).
- [ ] Unit test: `validateKimiWebProvider` probes `https://www.kimi.com/api/user` with bearer auth.
- [ ] Live test on `:22000`: with a valid Kimi access_token, send a chat request; confirm non-error response.

---

## Exit Conditions (GDD/TDD)

> OmniRoute npm matrix — see `docs/tasks/OMNIROUTE-CREATE-TASKS-EXITS.md`.
> Do **not** require cargo check/test for this stack.

- [ ] `open-sse/executors/kimi-web.ts` replaced with upstream version. File:line captured in Completion Evidence.
- [ ] `open-sse/config/providers/registry/kimi/web/runtime.ts` created.
- [ ] `open-sse/config/providers/registry/kimi/web/index.ts` updated with new model IDs (`k3`, `k2d6`).
- [ ] `src/lib/providers/webCookieAuth.ts` has `extractKimiAccessToken()` added.
- [ ] `src/lib/providers/validation/webProvidersA.ts` has `validateKimiWebProvider` added.
- [ ] `src/lib/providers/validation.ts` registers `kimi-web` in `SPECIALTY_VALIDATORS`.
- [ ] `src/shared/constants/providers/web-cookie.ts:237-249` updated: website → `https://www.kimi.com/code?aff=omniroute`, authHint → access_token.
- [ ] `open-sse/services/tokenExtractionConfig.ts:192-204` updated: login URL, token names.
- [ ] `src/shared/providers/webSessionCredentials.ts:153-159` updated: token-based (not cookie jar).
- [ ] New unit tests at `tests/unit/executor-kimi-web.test.ts`, `executor-kimi-web-decoder.test.ts`, `kimi-web-models-discovery.test.ts`. All pass.
- [ ] Existing `tests/unit/kimi*.test.ts` (if any) still pass (regression).
- [ ] `node --import tsx/esm --test tests/unit/kimi-web*.test.ts` passes with 0 failures.
- [ ] `npm run typecheck:core` passes without errors.
- [ ] `npm run lint` passes without **new** errors.
- [ ] Bug fix: Hard Rule #18 — failing-then-passing test captured in Completion Evidence.
- [ ] Planning doc 0001 — a new Fix 5 added: Kimi-web port. (See Where.)
- [ ] Entrada no ledger `.changelog/` via manage-changelog + `rebuild.sh build`.
- [ ] Completion Evidence filled with real npm command output and live kimi-web response.

---

## Details

### What

Subtasks:
- [ ] **Ler código existente**: `open-sse/executors/kimi-web.ts` (full), `open-sse/config/providers/registry/kimi/web/index.ts`, `src/shared/constants/providers/web-cookie.ts:230-260`, `open-sse/services/tokenExtractionConfig.ts:185-210`, `src/shared/providers/webSessionCredentials.ts:145-170`, `src/lib/providers/webCookieAuth.ts`, `src/lib/providers/validation/webProvidersA.ts`, `src/lib/providers/validation.ts`, `package.json` (verify `uuid` >= 11 for `uuidv7`).
- [ ] **Compare with upstream**: `diff` against `diegosouzapw-omniroute/open-sse/executors/kimi-web.ts` and the registry/runtime files. Identify every port. Confirm investigator's findings.
- [ ] **Port the executor** (straight port; do not invent logic).
- [ ] **Port `runtime.ts`** to the registry directory.
- [ ] **Update `index.ts`** with new model IDs.
- [ ] **Add `extractKimiAccessToken()`** to `webCookieAuth.ts`.
- [ ] **Add `validateKimiWebProvider`** to `webProvidersA.ts`.
- [ ] **Register** in `SPECIALTY_VALIDATORS`.
- [ ] **Update `web-cookie.ts`, `tokenExtractionConfig.ts`, `webSessionCredentials.ts`** with new URLs, token names, and auth model.
- [ ] **Add unit tests** for each ported module.
- [ ] **Run regression suites**.
- [ ] **Live test on `:22000`** with a valid Kimi access_token.
- [ ] **Refactoring pass**.
- [ ] **Update planning doc 0001** with new Fix 5 (Kimi-web port).

### Where

| File | Purpose |
|------|---------|
| `open-sse/executors/kimi-web.ts` | Replace (port from upstream). |
| `open-sse/config/providers/registry/kimi/web/runtime.ts` | Create (port). |
| `open-sse/config/providers/registry/kimi/web/index.ts` | Modify (model IDs). |
| `src/lib/providers/webCookieAuth.ts` | Modify (add `extractKimiAccessToken`). |
| `src/lib/providers/validation/webProvidersA.ts` | Modify (add `validateKimiWebProvider`). |
| `src/lib/providers/validation.ts` | Modify (register in SPECIALTY_VALIDATORS). |
| `src/shared/constants/providers/web-cookie.ts` | Modify (website + authHint). |
| `open-sse/services/tokenExtractionConfig.ts` | Modify (login URL, token names). |
| `src/shared/providers/webSessionCredentials.ts` | Modify (token-based). |
| `tests/unit/executor-kimi-web.test.ts` | Create. |
| `tests/unit/executor-kimi-web-decoder.test.ts` | Create. |
| `tests/unit/kimi-web-models-discovery.test.ts` | Create. |
| `docs/tasks/00-planning/0001-omniroute-web-providers-fix-plan.md` | Modify (add Fix 5: Kimi-web port). |
| `.changelog/0122-omniroute-kimi-web-port.md` | Create. |

### How

1. Read every file in the Where table.
2. `diff` against upstream to enumerate every port. Document in Completion Evidence.
3. Verify `package.json` has `uuid` >= 11 (required for `uuidv7`).
4. Port each file. **Do not invent logic** — straight port.
5. Write unit tests.
6. Run regression suites.
7. `npm run typecheck:core`, `npm run lint`.
8. Build, restart test container on `:22000`.
9. Live test with a valid Kimi access_token (operator provides).
10. Update planning doc 0001 with Fix 5.
11. Create `.changelog/` entry + `rebuild.sh build`.

### Why

`kimi-web` is one of the 4 Kimi providers; the current executor targets dead domains and a dead API. Porting the upstream rewrite is the only viable fix (per investigator's report), and the upstream has the code working with the current www.kimi.com Connect-RPC API.

---

## Parallelism / file ownership

| Class | Detail |
|-------|--------|
| **parallel-safe** | May run with 0117, 0118, 0119, 0120, 0121, 0123, 0124, 0125. No file overlap. |
| **serializable** | — |
| **Collision** | — |

---

## ⛔ Anti-Hallucination Guardrails

> **MANDATORY for P0/P1 tasks.**

> [!CAUTION]
> DO NOT mark complete without: (a) the failing-then-passing unit test capture, (b) the live kimi-web response showing non-error, (c) explicit `diff` evidence showing the port matches upstream.
> PORT 21000 = production — never docker-rm / restart / mutate.
> There are 4 Kimi providers — this task is **only** for `kimi-web`. Do not touch `kimi`, `kimi-coding`, or `kimi-coding-apikey`.
> `uuid` >= 11 is required for `uuidv7`. If the fork's `package.json` is older, STOP and notify — bumping `uuid` is a separate task.

> [!IMPORTANT]
> Read every file in the "Where" table before writing.

---

## 🛡️ Compliance Checklist (Leis Primárias do AGENTS.md)

- [ ] **Doc Accuracy**: planning doc 0001 update references correct task ID and provider ID.
- [ ] **Zod Validation**: no schema changes.
- [ ] **Security**: tokens are encrypted at rest; no plaintext logged.
- [ ] **Error Sanitization**: error responses use `buildErrorBody()`.
- [ ] **No Raw SQL**: no DB changes.
- [ ] **Archive Protocol**: no deletions.

---

## 📋 Completion Evidence (preenchido pelo agente executor)

- **Arquivos criados/modificados**: [lista com paths + line numbers]
- **Testes que verificam o trabalho**: [test names + file paths]
- **Diff contra upstream**: [output do `diff -r` resumido]
- **Resultado dos testes (fail→pass)**: [paste do `node --import tsx/esm --test …`]
- **Resultado das regression suites**: [PASS count]
- **Resultado do lint**: PASS/FAIL
- **Resultado do typecheck/build**: PASS/FAIL
- **Live test no :22000**: [paste do curl + kimi-web response]
- **Entrada no changelog**: [path under `.changelog/` + rebuild output]
- **Agente executor**: [nome/role]
- **Data de conclusão**: [YYYY-MM-DD]

---

## 🔍 Review Trail (preenchido pelo reviewer)

- **Reviewer**: [nome/role — DEVE ser diferente do executor]
- **Data da review**: [YYYY-MM-DD]
- **Veredito**: APROVADO / REJEITADO
- **Score (path to 100)**: [0-100]
- **Notas**: [evidence-based, MUST verify diff is a faithful port, MUST verify other 3 Kimi providers are untouched]
- **Se REJEITADO**: mover para `02-doing/` com motivo documentado no topo.
