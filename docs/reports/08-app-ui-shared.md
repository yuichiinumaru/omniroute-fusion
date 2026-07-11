# Slice 08: App UI / Shared — Adversarial Review (Wave 1)

**Date**: 2026-07-11  
**Reviewer**: adversarial-slice-08 (`agentID=reviewers`)  
**Workspace**: `/home/sephiroth/working/ganthritor/omniroute-2`

## Scope

Sampled deeply (not line-exhaustive) across:

- `src/app/(dashboard)/` — home, providers, settings, combos, usage/costs, endpoint/MCP, tools, playground, webhooks, audit, memory, search-tools, cli-*, fusions (runtime only; not fusion i18n task)
- `src/shared/` — components, constants, utils, hooks, validation, http
- `src/hooks/` — live dashboard / compression / breaker health
- `src/store/` — theme / notifications
- `src/i18n/` — config adapter only (no fusion-key audit)

**No** root `src/components/` tree exists.

## Exclusions honored

- Task **0017** fusion docs/i18n keys — not re-filed missing fusion strings
- Frontend IA **0023–0031** acceptance criteria — not re-litigated
- Dual-mode provider auth status UI **0037–0039** — not re-litigated (adjacent presentation helpers read only for context)
- Dual-mode deploy **0036**, fusion epic **0010–0018** contracts — out of primary dig

## Method

Adversarial pattern hunt with path:line evidence:

1. XSS sinks (`dangerouslySetInnerHTML`, markdown hrefs, logo URL/base64)
2. Open redirects / unsafe `window.open` / `href` from untrusted data
3. API client error handling (`[object Object]`, non-JSON bodies, dual helpers)
4. Race on unmount / orphan intervals / WS lifecycle
5. Nav/copy drift vs live product counts and shared constants
6. a11y / i18n blanks on sampled high-traffic surfaces

## Findings (severity-ordered)

### F-08-001 — Structured API errors render as `[object Object]` across many dashboard clients

- Severity: **P1**
- Category: bug / wiring
- Evidence:
  - `src/shared/utils/api.ts:98-105` — `handleResponse` does `new Error(data.error || …)` when `data.error` is often `{ code, message }`
  - `src/hooks/usePreviewCompression.ts:10-11` — `throw new Error(data.error ?? "Preview failed")`
  - `src/app/(dashboard)/dashboard/webhooks/components/AddWebhookWizard.tsx:100,108,135`
  - `src/app/(dashboard)/dashboard/webhooks/WebhooksPageClient.tsx:35,70,92`
  - `src/app/(dashboard)/dashboard/webhooks/components/steps/Step3EventsAndTest.tsx:48`
  - `src/app/(dashboard)/dashboard/audit/McpAuditTab.tsx:74`
  - `src/app/(dashboard)/dashboard/audit/ComplianceTab.tsx:99`
  - `src/app/(dashboard)/home/ProviderQuotaWidget.tsx:149`
  - `src/app/(dashboard)/dashboard/endpoint/ApiEndpointsTab.tsx:294`
  - Contrast: fixed path exists at `src/shared/http/apiErrorMessage.ts:11-18` and `src/shared/utils/api.ts:75-96` (`getErrorMessage` / `extractApiErrorMessage`) — used in API Manager, largely **not** elsewhere
- Why it matters: operators see silent/opaque failures instead of actionable messages (same class as #5340 `INVALID_ORIGIN`). Structured envelopes are the server default (`apiResponse.ts` / authz pipeline).
- Suggested fix direction: ban `new Error(data.error)` for object errors; funnel all dashboard `!res.ok` paths through `extractApiErrorMessage` / `getErrorMessage` / `readFetchErrorMessage`. Add a lint rule or shared `assertOk(res)` helper.

### F-08-002 — MCP hub intro hardcodes obsolete tool/scope counts

- Severity: **P1**
- Category: bug / wiring
- Evidence:
  - `src/app/(dashboard)/dashboard/mcp/page.tsx:319` — `t("mcpIntro", { tools: 37, scopes: 13, transports: 3 })`
  - Live inventory: `open-sse/mcp-server/server.ts:103-112` builds `TOTAL_MCP_TOOL_COUNT` from base + memory + skill + agentSkill + pool + gamification + plugin + notion + obsidian modules (product docs claim ~94 tools / ~30 scopes)
  - Shared catalog still only lists **16** scopes / base tools: `src/shared/constants/mcpScopes.ts:11-28`
- Why it matters: first-screen MCP onboarding lies about surface area; operators under-scope keys and mis-plan capability.
- Suggested fix direction: derive counts from a single exported constant (server or shared registry) at build/runtime; never hardcode.

### F-08-003 — Shared `MCP_SCOPE_LIST` / `MCP_TOOL_SCOPES` drift from live MCP tools

- Severity: **P1**
- Category: wiring / maintainability
- Evidence:
  - Canonical list ends at pool/browser tools: `src/shared/constants/mcpScopes.ts:11-78`
  - Live tools declare scopes **not** in the list, e.g.:
    - `open-sse/mcp-server/tools/memoryTools.ts:38,77,103` → `read:memory` / `write:memory`
    - `open-sse/mcp-server/tools/skillTools.ts:28,59,75,98` → `read:skills` / `write:skills` / `execute:skills`
    - `open-sse/mcp-server/tools/pluginTools.ts:39,67` → `read:plugins` / `write:plugins`
    - `open-sse/mcp-server/tools/notionTools.ts:15,95` → `read:notion` / `write:notion`
    - `open-sse/mcp-server/tools/obsidianTools.ts:44,174` → `read:obsidian` / `write:obsidian`
    - `open-sse/mcp-server/tools/gamificationTools.ts:13` → `read:gamification`
  - Runtime enforcement uses **inline** tool scopes (`open-sse/mcp-server/scopeEnforcement.ts:111-112`), so server may still work, but shared SSoT used by tests/export (`tests/unit/mcp-pool-tools-3368.test.ts`) is incomplete
- Why it matters: any UI/docs/key-builder that trusts `MCP_SCOPE_LIST` cannot grant least-privilege for memory/skills/plugins/KB tools; scope enforcement docs and tests give false confidence.
- Suggested fix direction: generate `MCP_SCOPE_LIST` + `MCP_TOOL_SCOPES` from the same registries the server loads; extend unit gate to all tool modules, not only pool tools.

### F-08-004 — OAuth popups opened without `noopener` / `noreferrer`

- Severity: **P2**
- Category: security
- Evidence:
  - `src/shared/components/OAuthModal.tsx:304` — `window.open(verifyUrl, "oauth_verify")`
  - `src/shared/components/OAuthModal.tsx:344` — `window.open(serverData.authUrl, "oauth_auth")`
  - `src/shared/components/OAuthModal.tsx:450` — `window.open(data.authUrl, "oauth_auth")`
  - `src/shared/components/OAuthModal.tsx:454` — `window.open(data.authUrl, "oauth_popup", "width=600,height=700")` (features only; no noopener)
  - `src/app/(dashboard)/dashboard/endpoint/EndpointPageClient.tsx:848,876` — Tailscale auth/funnel popups same pattern
  - Safer pattern exists nearby: `useCommandCodeAuth.ts:167` uses `"noopener,noreferrer"`
- Why it matters: reverse tabnabbing — if the opened document is hostile (compromised IdP page, malicious `verification_uri`, or unexpected redirect), it retains `window.opener` to the dashboard session tab.
- Suggested fix direction: always pass `"noopener,noreferrer"` (and null `opener` when holding a ref for close). Prefer named features string including noopener.

### F-08-005 — OAuth callback state check skips when `state` is omitted

- Severity: **P2**
- Category: security
- Evidence:
  - `src/shared/components/OAuthModal.tsx:509-525`:
    ```ts
    if (authData?.state && state && state !== authData.state) { /* reject */ }
    // …
    if (code) { await exchangeTokens(code, state); }
    ```
  - Mismatch only runs when **both** expected and provided state are truthy. Payload with `code` and **no** `state` proceeds.
  - `exchangeTokens` also treats empty state as optional: `OAuthModal.tsx:117-128` (`normalizedState` omitted from body when empty)
  - Same-origin `postMessage` / `BroadcastChannel` / `localStorage` all feed `handleCallback` (`OAuthModal.tsx:529-597`)
- Why it matters: weakens CSRF binding of the OAuth code handoff; any same-origin script or localStorage injection can force exchange attempts without replaying the correct state. Server-side state check may still reject, but client should fail closed.
- Suggested fix direction: if `authData.state` is set, require exact match (`if (!state || state !== authData.state) reject`). Always send state on exchange when issued.

### F-08-006 — Feature-flag restart pollers never tear down and have no deadline

- Severity: **P2**
- Category: bug / perf
- Evidence:
  - `src/app/(dashboard)/dashboard/settings/components/FeatureFlagsGrid.tsx:202-232`
  - On successful `/api/restart`, starts `setInterval` every 500ms (`waitDown`) then nested `setInterval` every 1s (`waitUp`) until ping succeeds
  - No `clearInterval` on unmount, navigation away, failed restart that leaves process up forever, or max wait
  - Nested `waitUp` is only created after first “down” observation; if process never dies, `waitDown` spins indefinitely
- Why it matters: orphaned intervals hit `/api/health/ping` forever after a stuck restart; wasted CPU and noise after leaving the settings page.
- Suggested fix direction: store interval IDs in refs; clear on unmount; cap total wait (e.g. 2 min) and surface timeout error.

### F-08-007 — Client fetches set state after unmount (CLI batch status, playground ApiTab)

- Severity: **P2**
- Category: bug
- Evidence:
  - `src/shared/hooks/cli/useToolBatchStatuses.ts:18-51` — `fetchStatuses` always `setLoading`/`setStatuses`/`setError` with no `cancelled`/`AbortController`; used by `CliCodePageClient` / `CliAgentsPageClient`
  - `src/app/(dashboard)/dashboard/playground/components/tabs/ApiTab.tsx:251-292` — mount effect `fetch("/v1/models")` and `fetch("/api/providers/client")` with no abort/cancel
  - Contrast good pattern: `src/hooks/useProviderBreakerHealth.ts:34-86`, `CommandPalette.tsx:64-76`, `useMemorySettings.ts:23-47`
- Why it matters: React “state update on unmounted component” warnings, stale overwrites if user navigates fast between CLI pages, harder concurrent-mode correctness.
- Suggested fix direction: AbortController + ignore flag on every dashboard poll/load effect; centralize in a tiny `useAbortableFetch`.

### F-08-008 — Search/web result URLs bound to `href` without scheme allowlist

- Severity: **P2**
- Category: security
- Evidence:
  - `src/app/(dashboard)/dashboard/search-tools/components/ResultsPanel.tsx:186-193` — `href={r.url}` + `target="_blank"` (rel is OK)
  - Same pattern: `ScrapeResult.tsx:106`, `CompareTab.tsx:362`
  - Home news link similarly trusts server payload: `HomePageClient.tsx:1059-1068` (`versionInfo.news.link`)
- Why it matters: if an upstream search provider (or compromised news feed) returns `javascript:…` / `data:text/html…`, the operator click becomes XSS/open-redirect. `rel=noopener` does not neutralize `javascript:` hrefs.
- Suggested fix direction: allow only `http:`/`https:` (and maybe relative paths); else render as plain text.

### F-08-009 — Live dashboard WebSocket puts API key in query string

- Severity: **P3**
- Category: security
- Evidence:
  - `src/hooks/useLiveDashboard.ts:111-113` — `` `${wsUrl}?token=${encodeURIComponent(apiKey)}` ``
- Why it matters: tokens in URLs land in proxy logs, browser history, crash dumps, and `Referer` on some misconfigured stacks. Prefer first-message auth or `Sec-WebSocket-Protocol` subprotocol token.
- Suggested fix direction: authenticate after `open` with a subscribe frame carrying the token; strip query auth.

### F-08-010 — `shared/utils/api.handleResponse` ignores safer body parsers next to it

- Severity: **P3**
- Category: maintainability / bug
- Evidence:
  - `parseResponseBody` + `getErrorMessage` documented for #1318 non-JSON 500s: `src/shared/utils/api.ts:52-96`
  - `handleResponse` still does `await response.json()` then object-as-message: `src/shared/utils/api.ts:98-108`
  - Default export `{ get, post, put, del }` still goes through broken path (even if few call sites today)
- Why it matters: latent footgun; any new consumer of default `api` reintroduces JSON-parse throws and `[object Object]`.
- Suggested fix direction: implement `handleResponse` via `parseResponseBody` + `getErrorMessage`; deprecate dual paths.

### F-08-011 — Hardcoded English on global chrome (Cloud sync + Feature flags)

- Severity: **P3**
- Category: i18n / a11y-copy
- Evidence:
  - `src/shared/components/CloudSyncStatus.tsx:16-21` — labels `"Cloud"`, `"Syncing..."`, `"Cloud Off"`, `"Cloud Error"`, `"Disabled"` not via `next-intl`
  - `src/app/(dashboard)/dashboard/settings/components/FeatureFlagsGrid.tsx:150,181,207,264-274` — English error strings and page title `"Feature Flags"` / summary copy
- Why it matters: 42-locale product still shows English chips/errors on always-visible sidebar and settings; breaks IA i18n consistency (not the fusion-key task).
- Suggested fix direction: move strings under `sidebar` / `settings` / `featureFlags` namespaces.

### F-08-012 — Compression preview error path collapses combined lane failures silently

- Severity: **P3**
- Category: bug / UX
- Evidence:
  - `src/hooks/usePreviewCompression.ts:33-35` — combined pipeline failures `catch { combined = null }` with no error surfaced
  - Per-lane errors stringified poorly when `data.error` is object (see F-08-001)
- Why it matters: studio shows empty combined result with no reason; hard to distinguish “no engines” vs “500 from preview API”.
- Suggested fix direction: attach `combinedError` to `PreviewBatch`; use `getErrorMessage`.

## Dead code / orphans

- Default `api` client (`src/shared/utils/api.ts` default export) appears barely used vs raw `fetch`; still exports a broken `handleResponse` (F-08-010).
- `MCP_TOOL_SCOPES` omits most module tools; tests only assert pool subset — incomplete SSoT rather than pure dead code.
- No exhaustive dead-component pass (slice too large); sampled command palette / sidebar definitions appear wired to real routes via redirects.

## Wiring smells

| Smell | Evidence |
|-------|----------|
| Three parallel error helpers | `getErrorMessage`, `extractApiErrorMessage`, `readFetchErrorMessage` + ad-hoc `data.error` |
| CSRF helper barely adopted | `withDashboardCsrfHeader` used only combos + a few provider handlers; most settings POSTs rely on Origin check alone (`pipeline.ts:327-338`) — OK if Origin always present, fragile for non-browser clients |
| MCP counts/scopes triple source | page hardcode + `mcpScopes.ts` + live tool modules |
| Live WS default port 20129 | `useLiveDashboard.ts:20-33` — correct for split WS server; easy misconfig behind reverse proxy without upgrade |

## Improvement opportunities

1. Introduce `dashboardFetch(input, init)` that always: credentials same-origin, CSRF on unsafe methods, `parseResponseBody`, typed error throw.
2. Scheme-allowlist helper for any operator-facing external `href`/`window.open`.
3. Expand MCP registry export for UI intro counts + scope pickers.
4. Standardize abortable effect pattern already used in breaker health / command palette.
5. Optional: SVG logo uploads — currently accepted (`AppearanceTab.tsx:595`); fine as `<img>`, document that SVG is not inlined.

## Residual risk / unrun checks

- Not run: full i18n key parity across 42 locales, Playwright e2e, bundle size, visual a11y axe suite
- Not deep-reviewed: every providers/[id] modal (~66 files), traffic-inspector 31 components, compression studio 16 files — sampled patterns only
- XSS via `dangerouslySetInnerHTML`: none under dashboard/shared (only app layout theme script + docs slug — outside primary UI slice)
- Dual-mode auth presentation (0037–0039) and fusion i18n (0017) deliberately not expanded

## Summary counts

| Severity | Count |
|----------|------:|
| P0 | 0 |
| P1 | 3 |
| P2 | 5 |
| P3 | 4 |
| **Total findings** | **12** |

| Category | Count |
|----------|------:|
| bug | 5 |
| security | 4 |
| wiring | 2 |
| maintainability | 1 |
| i18n | 1 (overlap with P3) |

**Verdict for slice 08 (Wave 1):** **NEEDS FIX** on P1 cluster (error-object UX, MCP count/scope SSoT). No confirmed RCE/stored XSS in sampled UI; highest security items are OAuth popup/state hardening and untrusted `href` schemes.

---

# Wave 2 — Adversarial second pass (slice 08)

**Date**: 2026-07-11  
**Reviewer**: adversarial-slice-08-w2 (`agentID=reviewers`)  
**Workspace**: `/home/sephiroth/working/ganthritor/omniroute-2`

## Scope (Wave 2 deltas)

Sampled surfaces **not** deeply emphasized in Wave 1:

- Playground markdown renderer + search-tools scrape preview reuse
- Live dashboard WS reconnect lifecycle (`src/hooks/useLiveDashboard.ts`)
- Traffic inspector session recorder / stream hooks
- Trae OAuth modal (distinct from generic `OAuthModal`)
- Cloud agents result links
- API Manager / OpenAPI try-it key reveal caches
- Bootstrap banner, scrape result chrome, login abort lifecycle
- Memory health poll (light), plugins page (light), agent-bridge (light)

**Exclusions honored (unchanged):** Task 0017 fusion i18n; frontend IA 0023–0031; dual-mode UI 0037–0039.

## Findings (Wave 2 only — severity-ordered)

### F-08-W2-001 — Playground/scrape markdown links pass unvalidated `href` (incl. `javascript:`)

- Severity: **P2**
- Category: security
- Evidence:
  - `src/app/(dashboard)/dashboard/playground/components/MarkdownMessage.tsx:84-94` — custom `a` renderer sets `href={href}` + `target="_blank"` with only `rel="noopener noreferrer"`
  - Used for assistant/user content in `ChatTab.tsx` (import `MarkdownMessage`)
  - Reused for **untrusted scraped page body** in `src/app/(dashboard)/dashboard/search-tools/components/ScrapeResult.tsx:10-15,146` (`lazy(() => import(...MarkdownMessage))`)
  - Comment at `MarkdownMessage.tsx:17-19` claims “no XSS possible via markdown content” because raw HTML is off — **false for link schemes**: `javascript:` / `data:` hrefs still fire on click
- Why it matters: model or scrape content can inject clickable `javascript:` URLs; operator click runs script in the dashboard origin. Same scheme class as F-08-008 but a **different** sink Wave 1 did not file.
- Suggested fix direction: shared `safeExternalHref(href)` allowing only `http:`/`https:` (optionally relative `#`/`/`); else render `<span>` or strip protocol.

### F-08-W2-002 — `useLiveDashboard` reconnect races: `onclose` does not pin socket identity

- Severity: **P2**
- Category: bug
- Evidence:
  - `src/hooks/useLiveDashboard.ts:173-191` — `ws.onclose` only guards `mountedRef`; if true, nulls `wsRef`, then schedules reconnect via bumping `connection.reconnectAttempt`
  - `src/hooks/useLiveDashboard.ts:209-237` — `connect` depends on `connection.reconnectAttempt`; effect cleanup sets `mountedRef.current = false`, closes `wsRef`, then remount sets `mountedRef = true` and opens a **new** socket
  - Browser `WebSocket.close()` delivers `onclose` asynchronously. Sequence: cleanup close → new effect open → **old** `onclose` runs with `mountedRef === true` → schedules another reconnect → tears down the healthy socket (reconnect storm / flapping “connected” UI)
  - Contrast safer pattern: `useTrafficStream.ts:110-121` + `connectRef` reconnect without recreating the effect for every attempt; still should compare `ws === wsRef.current` (not done either, but reconnect is ref-driven not effect-driven)
- Why it matters: live request/combo dashboards (`useLiveRequests` / `useLiveComboStatus`) can thrash reconnects under tab focus changes, HMR, or prop churn (`apiKey`/`channels`); operators see false disconnects and missed events.
- Suggested fix direction: capture `const socket = ws` and ignore `onclose` unless `wsRef.current === socket`; reconnect via ref + timeout without putting `reconnectAttempt` in the connect `useCallback` deps; never treat intentional cleanup close as auto-reconnect.

### F-08-W2-003 — Trae OAuth popup missing `noopener` and poll interval never torn down

- Severity: **P2**
- Category: security / bug
- Evidence:
  - `src/shared/components/TraeAuthModal.tsx:156` — `window.open(authUrl, "trae-oauth", "width=520,height=720")` (no `noopener,noreferrer`)
  - `src/shared/components/TraeAuthModal.tsx:164-172` — `setInterval` every 700ms watches `w.closed`; only `clearInterval` when closed; **no** cleanup on successful postMessage auth, modal unmount, or re-click authorize
  - Wave 1 F-08-004 covered `OAuthModal` + Tailscale; **Trae path was not listed**
- Why it matters: reverse tabnabbing if authorize URL/redirect is hostile; orphaned intervals keep calling into React state setters after leave/close-success path.
- Suggested fix direction: features `"noopener,noreferrer,width=…"`; store interval id in ref; clear on success, error, unmount, and before starting another authorize.

### F-08-W2-004 — Traffic-inspector session recorder abandons server session on unmount

- Severity: **P2**
- Category: bug
- Evidence:
  - `src/app/(dashboard)/dashboard/tools/traffic-inspector/hooks/useSessionRecorder.ts:108-158` — `start()` POSTs a session, opens capture WS, starts elapsed interval
  - `stop()` (161-186) flushes, closes WS, **PATCH** `action: "stop"`
  - Unmount effect (199-208) only clears local timers/WS — **does not** call PATCH stop or flush remaining snapshots
- Why it matters: SPA navigate away mid-record leaves open sessions / partial captures server-side; re-entry shows stale “recording” history without clean stop; disk/memory growth on inspector backend until manual delete.
- Suggested fix direction: unmount cleanup should best-effort `flushSnapshots` + PATCH stop (or `sendBeacon` stop) using `recordingSessionRef`.

### F-08-W2-005 — Cloud agent PR URL bound to `href` without scheme allowlist

- Severity: **P2**
- Category: security
- Evidence:
  - `src/app/(dashboard)/dashboard/cloud-agents/page.tsx:693-703` — `href={(selectedTask.result as …).prUrl as string}` + `target="_blank"` + `rel="noopener noreferrer"`
  - `prUrl` comes from task result payload (upstream cloud-agent / stored task), not a static constant
- Why it matters: same click-XSS/open-redirect class as F-08-008 (search/news) on a surface Wave 1 did not sample; `noopener` does not block `javascript:` navigation.
- Suggested fix direction: allowlist `http:`/`https:` before rendering the anchor; else plain text.

### F-08-W2-006 — Revealed API keys cached in client state for the whole page lifetime

- Severity: **P3**
- Category: security
- Evidence:
  - `src/app/(dashboard)/dashboard/api-manager/ApiManagerPageClient.tsx:234` — `revealedKeys: Map<string,string>`
  - `ApiManagerPageClient.tsx:640-654,671-684` — `/api/keys/{id}/reveal` result stored; hide toggle only flips visibility set, **explicitly keeps** cache (`663-665` comment)
  - `src/app/(dashboard)/dashboard/endpoint/ApiEndpointsTab.tsx:238-257` — same pattern: `setRevealedApiKeys` cache for try-it Bearer
- Why it matters: after operator “hides” a key, full secret remains in React heap until hard navigation/reload; XSS or extension dump of component state gets every revealed key for the session. Acceptable short-lived cache; indefinite retention is unnecessary risk.
- Suggested fix direction: clear map entry on hide; optional idle TTL; never log reveal bodies (copy path already OK).

### F-08-W2-007 — Bootstrap zero-config banner is hardcoded English despite `next-intl`

- Severity: **P3**
- Category: i18n
- Evidence:
  - `src/app/(dashboard)/dashboard/BootstrapBanner.tsx:11` — `useTranslations("common")` only used for dismiss `aria-label` (`:51`)
  - `BootstrapBanner.tsx:29-45` — title/body/JWT_SECRET copy are literal English strings, not `t(...)`
- Why it matters: high-visibility first-run security chrome ignores the 42-locale pipeline; Wave 1 i18n notes covered CloudSync/FeatureFlags only.
- Suggested fix direction: move strings under `common.bootstrapBanner*` with placeholders for `dataDir`.

### F-08-W2-008 — Search-tools scrape result chrome hardcodes Portuguese UI strings

- Severity: **P3**
- Category: i18n
- Evidence:
  - `src/app/(dashboard)/dashboard/search-tools/components/ScrapeResult.tsx:51-63` — `"Latência:"`, `"Tamanho:"`, `"Links:"`
  - `ScrapeResult.tsx:123-130` — `"Conteúdo truncado a 256 KB…"`, `"Ver raw completo"`
  - Surrounding dashboard uses `next-intl` elsewhere; this panel never calls `useTranslations`
- Why it matters: non-pt operators see mixed-locale chrome on an English (or other) UI; not fusion-key work (0017).
- Suggested fix direction: `searchTools` namespace keys; keep byte math as params.

### F-08-W2-009 — Login auth preflight never aborts on unmount

- Severity: **P3**
- Category: bug
- Evidence:
  - `src/app/login/page.tsx:21-56` — `checkAuth` creates `AbortController` + 5s timeout but effect cleanup is **missing**; `controller` is local to the async function and never aborted when leaving `/login`
  - On success paths (`router.push`) multiple `setState` calls can still run after unmount
- Why it matters: same class as F-08-007 (state after unmount) on the auth entry surface; timeout may fire after navigate.
- Suggested fix direction: declare controller in effect scope; `return () => { clearTimeout; controller.abort(); }`.

## Wave 2 method notes

- Did **not** re-file additional `new Error(data.error)` call sites (F-08-001 cluster already established).
- Did **not** re-file generic OAuthModal state/noopener issues already in F-08-004/005.
- `dangerouslySetInnerHTML` still absent under dashboard/shared production UI.
- Traffic-inspector WS path is same-origin (`useTrafficStream.ts:63-65`) — no token-in-query issue like F-08-009.

## Wave 2 summary counts (new only)

| Severity | Count |
|----------|------:|
| P0 | 0 |
| P1 | 0 |
| P2 | 5 |
| P3 | 4 |
| **Wave 2 total** | **9** |

| Category | Count |
|----------|------:|
| security | 4 |
| bug | 3 |
| i18n | 2 |

## Combined slice 08 (Wave 1 + Wave 2)

| Severity | W1 | W2 | Combined |
|----------|---:|---:|---------:|
| P0 | 0 | 0 | 0 |
| P1 | 3 | 0 | 3 |
| P2 | 5 | 5 | 10 |
| P3 | 4 | 4 | 8 |
| **Total** | **12** | **9** | **21** |

**Verdict for slice 08 after Wave 2:** still **NEEDS FIX**. Wave 2 adds no new P1 but strengthens the untrusted-href theme (markdown + cloud PR URLs), live-WS reconnect correctness, Trae OAuth popup hygiene, and traffic-inspector session lifecycle.
