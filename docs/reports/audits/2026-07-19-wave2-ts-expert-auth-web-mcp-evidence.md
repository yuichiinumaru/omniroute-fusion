# Wave 2 TS Expert — Dual-mode auth, web providers, MCP counts, combo resilience

| Field | Value |
| --- | --- |
| **Date** | 2026-07-19 |
| **Role** | `gt-ts-expert` |
| **Scope** | Evidence-only investigation (no product fixes, no git, no docker, no :21000) |
| **Method** | Source greps + file:line reads; live numeric SSoT from typed constants |

---

## Verdict table

| # | Question | Verdict | One-line basis |
| --- | --- | --- | --- |
| 1 | `connectionUsesOAuthRefresh` gates token health / refresh so apikey is not OAuth-refresh failure? | **CONFIRMED** | Shared helper + health/refresh/token-health/test routes all gate on it |
| 2 | Heal path for false-positive `no_refresh_token` boot/instrumentation wired? | **CONFIRMED** | `healFalsePositiveNoRefreshConnections` on Node startup |
| 3 | `connectionStatusCopy` / i18n distinguishes apikey vs oauth CTAs? | **CONFIRMED** | Pure formatter + dual en catalogs + ProviderCard/ListRow/ConnectionRow wiring |
| 4 | LMArena registry entry present? | **CONFIRMED** | `registry/lmarena` + `REGISTRY.lmarena` + executor + validator |
| 5 | chatgpt-web non-stream / fusion panel suitability residual? | **PARTIAL** | Stream force + empty guard landed; fusion still `stream:false`; plan still “Planning” |
| 6 | claude-web uses `openaiToClaudeRequest` translator? | **CONFIRMED** | Import + call inside `transformToClaude` |
| 7 | qwen-web TLS + WAF detection (not captcha solver)? | **CONFIRMED** | `tlsFetchQwen` + `isWafResponse` / `isWafChallenge`; zero captcha solver refs |
| 8 | `classifySoftChatBreakerOutcome` + `getExhaustedTargetSkipReason` present and used? | **CONFIRMED** | Pure modules + `chat.ts` / `combo.ts` / `runtimeUnits.ts` |
| 9 | `TOTAL_MCP_TOOL_COUNT` actual / docs claim 94? | **PARTIAL** | Live SSoT **93** tools / **31** scopes; product docs still claim **94** / **30** |

---

## 1. Dual-mode — `connectionUsesOAuthRefresh` gate

### Existence & policy

SSoT: [`src/shared/utils/connectionAuthMode.ts`](../../../src/shared/utils/connectionAuthMode.ts)

```93:108:src/shared/utils/connectionAuthMode.ts
export function connectionUsesOAuthRefresh(conn: ConnectionAuthShape): boolean {
  if (!isPlainConnectionRecord(conn)) return false;
  const normalized = normalizeAuthType(conn.authType);

  if (normalized === "apikey" || normalized === "cookie" || normalized === "none") {
    return false;
  }

  // Missing/legacy authType: non-OAuth when any static credential is present.
  if (normalized === "unknown") {
    if (hasStaticCredential(conn)) return false;
    return true;
  }

  return normalized === "oauth";
}
```

`shouldMarkNoRefreshExpired` requires **both** provider-level refresh support **and** connection OAuth mode, excluding long-lived Windsurf/Devin imports:

```157:172:src/shared/utils/connectionAuthMode.ts
export function shouldMarkNoRefreshExpired(
  conn: ConnectionAuthShape,
  supportsRefresh: boolean
): boolean {
  if (!isPlainConnectionRecord(conn)) return false;
  if (!supportsRefresh) return false;
  if (!connectionUsesOAuthRefresh(conn)) return false;
  if (isLongLivedImportCredential(conn)) return false;
  // ...
}
```

### Health sweep

[`src/lib/tokenHealthCheck.ts`](../../../src/lib/tokenHealthCheck.ts) re-exports the helper and marks `no_refresh_token` **only** via `shouldMarkNoRefreshExpired`:

```28:40:src/lib/tokenHealthCheck.ts
import {
  connectionUsesOAuthRefresh,
  isLongLivedImportCredential,
  shouldMarkNoRefreshExpired,
} from "@/shared/utils/connectionAuthMode";

export {
  connectionUsesOAuthRefresh,
  isLongLivedImportCredential,
  shouldMarkNoRefreshExpired,
};
```

```369:385:src/lib/tokenHealthCheck.ts
    // shouldMarkNoRefreshExpired also requires connectionUsesOAuthRefresh + not long-lived import.
    const refreshCapableNeedsReauth = shouldMarkNoRefreshExpired(
      conn,
      supportsTokenRefresh(conn.provider)
    );
    if (refreshCapableNeedsReauth) {
      // ... errorCode / lastErrorType: "no_refresh_token"
    }
```

### Manual refresh + token-health API + test route

| Call site | Evidence |
| --- | --- |
| Manual refresh | `src/app/api/providers/[id]/refresh/route.ts:39` — `if (!connectionUsesOAuthRefresh(connection))` → 400 |
| Token health badge | `src/app/api/token-health/route.ts:20-21` — filter active + RT + `connectionUsesOAuthRefresh` |
| Provider test | `src/app/api/providers/[id]/test/route.ts` — multiple gates at ~305, ~484, ~814 |
| Provider-level refresh set | `open-sse/services/tokenRefresh.ts:1657-1661` documents dual-mode **must** use connection helpers |

**Verdict #1: CONFIRMED.** Apikey / cookie / none / blank+static never enter the #5326 `no_refresh_token` expire path through this gate.

---

## 2. Heal path — false-positive `no_refresh_token`

### Domain heal

[`src/lib/db/healFalsePositiveNoRefresh.ts`](../../../src/lib/db/healFalsePositiveNoRefresh.ts) eligibility via `isFalsePositiveNoRefreshToken` (non-OAuth or long-lived import + static credential; excludes `banned` / `credits_exhausted`):

```55:77:src/lib/db/healFalsePositiveNoRefresh.ts
export async function healFalsePositiveNoRefreshConnections(): Promise<HealFalsePositiveNoRefreshResult> {
  const connections = await getProviderConnections({});
  // ...
  if (!isFalsePositiveNoRefreshToken(conn)) continue;
  await updateProviderConnection(id, {
    testStatus: "active",
    lastError: null,
    // ... clear errorCode / lastErrorType
  });
}
```

### Boot wiring

[`src/instrumentation-node.ts`](../../../src/instrumentation-node.ts) (Node runtime entry for Next standalone):

```105:122:src/instrumentation-node.ts
  // Epic 0006: restore false-positive no_refresh_token rows from dual-mode health
  try {
    const { healFalsePositiveNoRefreshConnections } = await import(
      "@/lib/db/healFalsePositiveNoRefresh"
    );
    const { healed } = await healFalsePositiveNoRefreshConnections();
    if (healed > 0) {
      console.log(
        `[STARTUP] Healed ${healed} false-positive no_refresh_token connection(s) (static + long-lived import)`
      );
    }
  } catch (err: unknown) {
    // non-fatal
  }
```

Regression coverage: `tests/unit/heal-no-refresh-token.test.ts`, `tests/unit/connection-auth-mode.test.ts`.

**Verdict #2: CONFIRMED.** Heal is product-wired at boot, not docs-only.

---

## 3. Status copy + i18n (apikey vs oauth CTAs)

### Pure formatter

[`src/shared/utils/connectionStatusCopy.ts`](../../../src/shared/utils/connectionStatusCopy.ts):

| Auth mode | `no_refresh_token` scenario | Primary CTA (EN default) |
| --- | --- | --- |
| `apikey` / `none` | `apikey_no_refresh_token` | **Retest connection** (not re-auth) |
| `oauth` | `oauth_no_refresh_token` | **Re-authenticate** |
| `cookie` | `cookie_update` | **Update cookie** |
| blank / `unknown` | treated as apikey-neutral retest for `no_refresh_token` | **Retest connection** |

```205:216:src/shared/utils/connectionStatusCopy.ts
  if (auth === "apikey" || auth === "none") {
    if (signal === "no_refresh_token") {
      return pack(CONNECTION_STATUS_COPY_IDS.apikeyNoRefreshToken, {
        badge: "Retest",
        // ...
        cta: "Retest connection",
```

```245:253:src/shared/utils/connectionStatusCopy.ts
  if (auth === "oauth") {
    if (signal === "no_refresh_token") {
      return pack(CONNECTION_STATUS_COPY_IDS.oauthNoRefreshToken, {
        badge: "Re-auth",
        cta: "Re-authenticate",
```

### Presentation + UI

- [`src/shared/utils/connectionStatusPresentation.ts`](../../../src/shared/utils/connectionStatusPresentation.ts) wraps formatter for ProviderCard / ConnectionRow error rewrite.
- UI: `ProviderCard.tsx` / `ProviderListRow.tsx` use `resolveProviderCardAuthStatusCopy` + `translateConnectionStatusCopy` under `useTranslations("providers")`.
- Connection detail: `ConnectionRow.tsx` → `resolveConnectionErrorDisplay`.

### i18n catalogs

EN keys under **both** `providers.connectionStatus.*` and `usage.connectionStatus.*` (`src/i18n/messages/en.json` ~4915 and ~7031), including:

- `apikey_no_refresh_token.cta` → “Retest connection”
- `oauth_no_refresh_token.cta` → “Re-authenticate”
- `cookie_update.cta` → “Update cookie”

Tests: `connection-status-copy.test.ts`, `connection-status-presentation-0038.test.ts`, `connection-status-copy-limits.test.ts` (asserts dual namespaces + no OAuth CTA on apikey invalid key).

**Residual (non-blocking):** generic `expired` i18n entry CTA is “Retest connection” while oauth-branch code defaults use “Re-authenticate” for the same `id` — catalog wins when next-intl hits. Scenario **distinction for `no_refresh_token` remains correct**.

**Verdict #3: CONFIRMED.**

---

## 4. LMArena registry (plan 0001 Fix 1)

| Layer | Path | Evidence |
| --- | --- | --- |
| Registry entry | `open-sse/config/providers/registry/lmarena/index.ts:3-13` | `id: "lmarena"`, `executor: "lmarena"`, `baseUrl: "https://arena.ai"` |
| REGISTRY | `open-sse/config/providers/index.ts:173,347` | `lmarena: lmarenaProvider` |
| Product constant | `src/shared/constants/providers/web-cookie.ts:173+` | WEB_COOKIE provider + free note |
| Executor map | `open-sse/executors/index.ts:147-148` | `lmarena` + alias `lma` |
| Validator | `src/lib/providers/validation/webProvidersA.ts:611+` | `validateLMArenaProvider` + split-cookie reconstruct |
| Web session | `src/shared/providers/webSessionCredentials.ts:210+` | cookie requirement for lmarena |

**Residual (hygiene):** plan text asked `authType: "cookie"`; registry uses `authType: "apikey"` + `authHeader: "cookie"` (common web-cookie registry pattern). Functional Fix 1 criteria (registry non-null, cookie field, validator) are met.

**Verdict #4: CONFIRMED.**

---

## 5. chatgpt-web non-stream / fusion panel residual (plan 0001 Fix 2)

### Landed mitigations

Fusion panels always call with `stream: false`:

```720:722:open-sse/services/fusion.ts
  const panelBody: Body = { ...rest, stream: false, tool_choice: "none" };
```

chatgpt-web **forces TLS client streaming** regardless of client flag (buffers locally for non-stream callers):

```3072:3078:open-sse/executors/chatgpt-web.ts
        // Always stream from the TLS client — the `stream` flag only controls
        // local buffering ... ChatGPT always returns SSE regardless of what the
        // caller requested. Using stream:false buffers the entire response and
        // can timeout on long generations; stream:true tails a temp file ...
        stream: true,
```

Empty-answer guard (anti “~0 tokens” silent success):

```2155:2168:open-sse/executors/chatgpt-web.ts
  if (!fullAnswer.trim()) {
    log?.warn?.("CGPT-WEB", "buildNonStreamingResponse: empty answer after all processing");
    return new Response(
      JSON.stringify({
        error: {
          message: "ChatGPT returned an empty response",
          // ...
          code: "EMPTY_RESPONSE",
        },
      }),
      { status: 502, ... }
```

4xx/5xx path logs rate-limit headers + body slice (~3095–3113).

### Residual

| Gap | Notes |
| --- | --- |
| Plan still **Status: Planning** | `docs/tasks/00-planning/0001-omniroute-web-providers-fix-plan.md` not closed |
| Fusion suitability | Client/panel `stream:false` still hits `buildNonStreamingResponse` — improved, but **live fusion panel smoke not in this audit** |
| Operational 429-by-IP | Plan explicitly separates rate-limit ops from code fix |
| Security vs product | Prior architect note: 0045 sanitize ≠ 0001 fusion reliability |

**Verdict #5: PARTIAL** — code mitigations present; fusion-panel product residual + plan hygiene remain.

---

## 6. claude-web + `openaiToClaudeRequest`

```30:30:open-sse/executors/claude-web.ts
import { openaiToClaudeRequest } from "../translator/request/openai-to-claude.ts";
```

```277:281:open-sse/executors/claude-web.ts
  const bodyForTranslator = { ...body, _disableToolPrefix: true };

  const translated = openaiToClaudeRequest(model, bodyForTranslator, isStream);
```

Wrapper `transformToClaude` still exists as a thin adapter (web-specific field strip / system flatten) and is invoked from `execute()` (~1131). Plan Fix 3 “replace `transformToClaude` body with translator” is **satisfied in substance** (translator is the transform engine).

**Verdict #6: CONFIRMED.**

---

## 7. qwen-web TLS + WAF detection (not captcha solver)

### TLS impersonation

- Client: `open-sse/services/qwenTlsClient.ts` — Chrome profile via `tls-client-node`, JA3/WAF rationale in header comment.
- Executor: `open-sse/executors/qwen-web.ts:33,133,192` — `tlsFetchQwen` for chats/new + completions (not native `fetch`).

### WAF detection (operator-facing message, no solver)

```72:82:open-sse/executors/qwen-web.ts
function isWafResponse(status: number, contentType: string, bodyText: string): boolean {
  if (contentType.includes("text/html")) return true;
  if (status === 504) return true;
  return /aliyun_waf|baxia|<html/i.test(bodyText);
}

const WAF_ERROR_MESSAGE =
  "Qwen session expired or blocked by Alibaba's WAF. Re-login at https://chat.qwen.ai and " +
  "paste a fresh full Cookie header ...";
```

```549:553:open-sse/services/qwenTlsClient.ts
function isWafChallenge(text: string | null | undefined): boolean {
  if (!text) return false;
  return /aliyun_waf|baxia|attention required/i.test(text);
}
```

Grep of `qwen-web.ts` + `qwenTlsClient.ts` for `captcha|2captcha|solver|turnstile|hcaptcha`: **0 hits**.

**Verdict #7: CONFIRMED** (detection + re-login CTA only; intentional non-solver).

---

## 8. Combo resilience helpers

### `classifySoftChatBreakerOutcome`

- Definition: `src/shared/utils/softChatBreakerOutcome.ts:47-58`
- Rules: forceLiveComboTest→none; success→success; HALF_OPEN soft-fail→failure; provider statuses `{408,500,502,503,504}`; account-retry→none; combo terminal→none (combo records elsewhere)
- Call sites: `src/sse/handlers/chat.ts` success ~1295, account-retry fail ~1624, terminal soft ~1653
- Tests: `tests/unit/combo-resilience-wiring-0043.test.ts`

### `getExhaustedTargetSkipReason`

- Definition: `open-sse/services/combo/comboPredicates.ts:81-98`  
  - keys: `provider:connectionId` (#1731v2) and provider set (#1731)
- Call sites:
  - `open-sse/services/combo.ts:1906` (priority path)
  - `open-sse/services/combo.ts:3081` (round-robin path)
  - `open-sse/services/combo/runtimeUnits.ts:122`
- Tests: `tests/unit/combo/combo-exhausted-skip.test.ts`, wiring suite above

**Verdict #8: CONFIRMED.**

---

## 9. MCP tool count

### How computed

```114:122:open-sse/mcp-server/server.ts
/**
 * Live MCP tool inventory count used by heartbeat / diagnostics.
 * Must equal unique registered tools (`MCP_TOOL_COUNT` / `getAllToolDefinitions`).
 * ... Compute from the deduplicating catalog instead
 */
export const TOTAL_MCP_TOOL_COUNT = getAllToolDefinitions().length;
```

Catalog: `open-sse/mcp-server/toolSearch/catalog.ts:68-98` aggregates  
`MCP_TOOLS` + memory + skill + agentSkill + pool + gamification + plugin + notion + obsidian + compressionTools, **dedupe by name**.

Parallel SSoT for hub/docs parity:

```172:173:src/shared/constants/mcpScopes.ts
/** Unique registered MCP tools with declared scopes (hub + docs counts). */
export const MCP_TOOL_COUNT = Object.keys(MCP_TOOL_SCOPES).length;
```

Parity test: `tests/unit/mcp-scope-parity-0047.test.ts` asserts  
`TOTAL_MCP_TOOL_COUNT === MCP_TOOL_COUNT` and catalog length equality.

### Live enumeration (static, no runtime import)

`MCP_TOOL_SCOPES` keys (`mcpScopes.ts:56-168`):

| Family | Count |
| --- | ---: |
| Core / routing / cache / compression / proxies / search | 32 |
| Memory | 3 |
| Skills | 4 |
| Agent skills | 3 |
| Pool / browser | 6 |
| Gamification | 8 |
| Plugins | 8 |
| Notion | 6 |
| Obsidian | 22 |
| Other (`omniroute_ccr_retrieve`) | 1 |
| **Total** | **93** |

`MCP_SCOPE_LIST` length (`mcpScopes.ts:14-46`): **31** scopes  
(`MCP_SCOPE_COUNT = MCP_SCOPE_LIST.length`).

### Docs / skill claim

| Source | Claim |
| --- | --- |
| `AGENTS.md`, `CLAUDE.md`, `docs/frameworks/MCP-SERVER.md`, quality gates | **94 tools**, **30 scopes** |
| AGENTS arithmetic | “34 base + memory3 + skill4 + agentSkill3 + pool6 + gamification8 + plugin8 + notion6 + obsidian22 = 94” (omits `ccr_retrieve` / double-counts base) |
| Live SSoT | **93 tools**, **31 scopes** |

**Verdict #9: PARTIAL** — computation path is correct and test-guarded; **product docs are off-by-one (tools) and off-by-one (scopes)** vs `MCP_TOOL_COUNT` / `MCP_SCOPE_COUNT`.

---

## Residual gaps for remediation epics

Prioritized for product/docs epics (this report does not open tasks):

| ID | Severity | Area | Gap | Suggested epic direction |
| --- | --- | --- | --- | --- |
| R-AUTH-01 | P3 | Dual-mode UX | `expired` i18n CTA may override oauth-specific EN defaults | Align `*.connectionStatus.expired` CTA with oauth vs apikey scenario ids, or split ids |
| R-WEB-01 | P2 | Plan 0001 | Plan file still **Planning** while Fixes 1/3/4 largely landed | Close/retarget 0001 acceptance checkboxes against this evidence |
| R-WEB-02 | P2 | Fusion + chatgpt-web | Fusion `stream:false` panels still depend on non-stream buffer path; no live smoke in this pass | Fusion residual wave: panel smoke on chatgpt-web / qwen-web / claude-web / lmarena with `stream:false` |
| R-WEB-03 | P3 | LMArena registry | `authType: "apikey"` vs plan “cookie” | Docs-only or align registry if validators key off authType |
| R-WEB-04 | P3 | qwen-web | WAF detection only; no captcha/baxia auto-solve (by design) | Ops runbook: re-login cookie jar; optional future TLS profile refresh only |
| R-MCP-01 | P2 | Docs counts | Docs **94/30** vs live **93/31** | Run `check:docs-counts` / update AGENTS + MCP-SERVER + CLAUDE from `MCP_TOOL_COUNT` / `MCP_SCOPE_COUNT` |
| R-MCP-02 | P3 | Inventory arithmetic | AGENTS “34 base …” narrative stale | Rewrite breakdown from `MCP_TOOL_SCOPES` groups or generate from catalog |

**Not residuals (closed by evidence):** dual-mode health false-positive class, heal-on-boot, soft breaker SSoT, exhaustion skip SSoT, claude-web translator wire, qwen TLS wire, lmarena registry presence.

---

## Structural integrity notes (TS expert lens)

1. **Auth-mode classification is connection-scoped** — `supportsTokenRefresh(provider)` is correctly documented as necessary-but-not-sufficient; connection shape is plain-object gated (arrays rejected). Sound dual-mode boundary.
2. **Heal eligibility is pure + side-effect-free classification** — `isFalsePositiveNoRefreshToken` never heals true OAuth #5326 rows; terminal statuses excluded. Good “parse, don’t validate” style for the heal predicate.
3. **Status copy is pure** — English defaults + key bundles; UI translation is a pure adapter (`translateConnectionStatusCopy`). No `as any` in the dual-mode auth helper body reviewed.
4. **Resilience helpers are pure** — soft breaker + exhaustion skip have no DB side effects; chat/combo only apply `_onSuccess`/`_onFailure` after classification — correct separation for half-open probe geometry.
5. **MCP count is dynamic** — prefer constants derived from maps (`Object.keys`, catalog length) over hard-coded 94 in narrative docs; current drift is documentation, not runtime double-count (fixed by Task 0047 dedupe path).

---

## Evidence index (quick links)

| Topic | Primary files |
| --- | --- |
| Dual-mode helpers | `src/shared/utils/connectionAuthMode.ts` |
| Health | `src/lib/tokenHealthCheck.ts` |
| Heal | `src/lib/db/healFalsePositiveNoRefresh.ts`, `src/instrumentation-node.ts` |
| Copy / i18n | `src/shared/utils/connectionStatusCopy.ts`, `connectionStatusPresentation.ts`, `en.json` |
| LMArena | `open-sse/config/providers/registry/lmarena/index.ts`, `executors/lmarena.ts` |
| chatgpt-web | `open-sse/executors/chatgpt-web.ts` |
| claude-web | `open-sse/executors/claude-web.ts` |
| qwen-web | `open-sse/executors/qwen-web.ts`, `open-sse/services/qwenTlsClient.ts` |
| Soft breaker | `src/shared/utils/softChatBreakerOutcome.ts`, `src/sse/handlers/chat.ts` |
| Exhaustion | `open-sse/services/combo/comboPredicates.ts`, `combo.ts`, `runtimeUnits.ts` |
| MCP count | `open-sse/mcp-server/server.ts`, `toolSearch/catalog.ts`, `src/shared/constants/mcpScopes.ts` |
| Plan 0001 | `docs/tasks/00-planning/0001-omniroute-web-providers-fix-plan.md` |
