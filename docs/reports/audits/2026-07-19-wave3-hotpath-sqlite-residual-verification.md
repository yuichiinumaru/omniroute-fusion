# Wave 3 — Hot-path freeze + SQLite residual verification

> **Date**: 2026-07-19  
> **Role**: gt-omniroute-architect (hot-path + sqlite)  
> **Scope**: verify operator/runtime claims only — **no code fixes**, no deploy mutation, no `:21000` / `:22000` changes  
> **Repo**: `/home/sephiroth/working/ganthritor/omniroute-2`

---

## Executive summary

| Hypothesis | Verdict | Severity | Residual epic fit |
|------------|---------|----------|-------------------|
| **H1 — Freeze without fallback** | **PARTIAL** (hang class residual **CONFIRMED**; hard-error fallback **EXISTS**) | **P1 High** (operator-visible hangs) | **EPIC-16** — timeout/hang-class failover, not greenfield resilience rewrite |
| **H2 — SQLite write pressure** | **CONFIRMED** (architectural + coded constraints) | **P2 Medium** under parallel agents | **EPIC-17** — SQLite-native pressure mitigations, **not** PostgreSQL rewrite |

**Bottom line**

1. OmniRoute **does** rotate accounts / cool connections on many **HTTP failures** (429/401/5xx classification, Codex-specific 429 rotation, combo target walk).  
2. Operator-reported “freeze then must re-request/restart” is still **plausible and partially coded**: long default upstream budgets (**600s** fetch / idle) + **explicit non-fallback** on stream-readiness / self-inflicted timeouts for most providers (incl. Codex/OpenAI OAuth hang class).  
3. SQLite **single-writer** pressure is real; mitigations exist (WAL, `busy_timeout=2000`) but **no application-level SQLITE_BUSY retry**, and better-sqlite3 **blocks the event loop** while waiting.

---

## H1 — Freeze without fallback

### Claim (operator)

Some providers (e.g. Codex / OpenAI OAuth) appear to hang; OmniRoute does not retry / switch account; user must re-request or restart.

### Verdict: **PARTIAL**

| Sub-claim | Verdict | Notes |
|-----------|---------|-------|
| “Never retries / never switches account” | **FALSE** | Full credential loop + Codex 429 rotation + combo model walk |
| “Can hang a long time before any failure surface” | **CONFIRMED** | Defaults: fetch/idle **600s**, readiness **80s**, rate-limit queue **120s** |
| “On hang/timeout, often does not switch account” | **CONFIRMED residual** | By design for non-Antigravity stream readiness / self-inflicted 504 timeouts |
| “User must re-request” after hang-class failure | **PARTIAL** | True when single connection or hang class returns terminal error without rotation |

### Severity: **P1 High**

Affects interactive agent sessions (Codex CLI / long SSE). Hard-error path is healthier than hang path; hang path matches operator language of “freeze”.

---

### Evidence — what *does* fallback

#### 1. Single-model credential retry loop

`src/sse/handlers/chat.ts` implements nested loops:

- Outer: cooldown-aware re-attempt when **all** connections are cooling (`waitForCooldown`, defaults **enabled**, `maxRetries=3`, `maxRetryWaitSec=30`).  
- Inner: pick next credentials via `getProviderCredentialsWithQuotaPreflight` with `excludeConnectionIds`.  
- On many failures: `markAccountUnavailable(...)` → if `shouldFallback` → exclude connection and `continue`.

Hard failures (classified 429/5xx/auth with cooldown) **do** walk accounts when more than one active connection exists.

#### 2. Codex 429 account rotation (chatCore)

`open-sse/handlers/chatCore.ts` (codex branch):

- `maxAttempts = 3` for `provider === "codex"`.  
- On **HTTP 429 only**: mark Codex model **scope** rate-limited, clear session affinity, `getProviderCredentials("codex", … excludeConnectionIds)`, rotate credentials in place.  
- **Not** a general hang failover — only 429 responses with an alternate codex connection.

#### 3. Combo target-level fallback

`open-sse/services/combo.ts`: non-ok target responses continue to next target (including **502/504 stream-readiness** failures). Regression: `tests/unit/combo-stream-readiness-fallback.test.ts` (“combo falls back when first model returns HTTP 200 zombie SSE stream”).

#### 4. Antigravity special cases

`chat.ts` **does** call `markAccountUnavailable` + try next connection for Antigravity:

- stream readiness / early EOF class  
- pre-response gateway timeout (`ANTIGRAVITY_PRE_RESPONSE_TIMEOUT`)

Other providers do **not** get that path for the same stream class.

#### 5. Local concurrency pressure

`errorType === "account_semaphore_capacity"` → exclude connection and try another account (unless forced connection). Semaphore queue timeout default **30s** (`open-sse/services/accountSemaphore.ts`).

#### 6. Rate-limit queue drop is bounded

`rateLimitManager.withRateLimit`: Bottleneck `expiration: maxWaitMs`. Default `DEFAULT_REQUEST_QUEUE_MAX_WAIT_MS` from env `RATE_LIMIT_MAX_WAIT_MS` or **120000**. Expiry → `RATE_LIMIT_QUEUE_TIMEOUT` (rewritten so it is not misread as upstream 502). Combo can then fall through. Watchdog resets wedged Bottleneck limiters after **120s** no-dispatch.

---

### Evidence — freeze / no-switch residual paths

#### A. Long default timeout budgets (perceived freeze)

From `src/shared/utils/runtimeTimeouts.ts` + `open-sse/config/constants.ts`:

| Knob | Default | Role |
|------|---------|------|
| `FETCH_TIMEOUT_MS` / `REQUEST_TIMEOUT_MS` | **600_000** (10 min) | Wait for **headers only** (`fetchWithStartTimeout`) |
| `STREAM_IDLE_TIMEOUT_MS` | **600_000** (10 min) | Idle SSE after headers; also used for stall watchdogs |
| `STREAM_READINESS_TIMEOUT_MS` | **80_000** | First useful SSE event / zombie 200 detection |
| `FETCH_BODY_TIMEOUT_MS` | inherits fetch | Non-stream body stall after headers |
| SSE heartbeat | **15_000** | Keeps **downstream** client alive during slow thinking |

Semantics are intentional (`fetchStartTimeout.ts`): start timer does **not** abort a healthy long stream after headers. Side effect: a **header stall** can hold the client for up to **10 minutes** before 504 classification.

#### B. Stream readiness hang — **no account switch** (non-Antigravity)

Pipeline:

1. `chatCore` runs `ensureStreamReadiness` (`open-sse/utils/streamReadiness.ts`).  
2. On failure, chatCore returns `success: false` with `stream_timeout` / `STREAM_EARLY_EOF` and **explicitly does not** call account-failure hooks:

```text
// chatCore.ts ~3947–3949
// Do NOT call onStreamFailure — a stream stall is an upstream issue,
// not an account/quota failure. Marking the account unavailable here
// would lock out legitimate accounts when the upstream hangs.
```

3. `chat.ts` then:

- **STREAM_EARLY_EOF**: at most **one** same-connection retry (`shouldRetryStreamEarlyEof`); **no** `markAccountUnavailable`, **no** `excludeConnectionIds`.  
- **STREAM_READINESS_TIMEOUT / stream_timeout**: **return immediately** (no next account). Comment: retrying would only double latency.  
- Antigravity is the exception (marks unavailable + rotates).

Documented design in `src/sse/handlers/chatHelpers.ts` (#3758): readiness timeout is treated as slow-but-alive upstream, not a bad key.

**Operator impact**: single-model Codex/OpenAI OAuth request that returns HTTP 200 then never emits a useful frame waits up to readiness budget (~80s, adaptive), then **fails without trying the next OAuth account**, even if another connection is healthy.

Combo path mitigates this **across models**, not necessarily across accounts of the same model unless the combo enumerates them or single-model rotation already ran.

#### C. Self-inflicted upstream timeout — **no cooldown, no account fallback**

`open-sse/handlers/chatCore/cooldownClassification.ts::isSelfInflictedUpstreamTimeout`:

- 504 + `errorType === "upstream_timeout"` + provider ≠ antigravity  
- Intent: do not cool a healthy account when **OmniRoute’s own** fetch-start / body deadline fired.

`chat.ts` uses this as `skipConnectionDisable` → synthesizes `{ shouldFallback: false, cooldownMs: 0 }` → **terminal** for that request (no next account).

So a Codex connection that is merely **slow past FETCH_TIMEOUT_MS** does not rotate to another codex account on that attempt.

#### D. Mid-stream idle after acceptance

Once readiness passes and SSE is piped to the client:

- Idle watchdog (`open-sse/utils/stream.ts`, `streamHandler.ts`) fires after `STREAM_IDLE_TIMEOUT_MS` (default **10 min**).  
- Failure is stream-end / 504-class client error — **cannot** transparently switch accounts mid-response without stream recovery.  
- Transparent stream recovery (`streamRecovery`) is **opt-in, default OFF** (`STREAM_RECOVERY_ENABLED` feature flag). Even when on, chatCore comments say recovery re-runs the **same** upstream/account.

#### E. Codex WebSocket transport residual

`open-sse/executors/codex.ts`:

- Default path is **HTTP** (WS not required for gateway use).  
- If `providerSpecificData.codexTransport === "websocket"` and `wreq-js` is present: `websocketFn(...)` is awaited **without** an explicit connect timeout (only client abort).  
- WS returns synthetic HTTP 200 SSE immediately; hang class then depends on readiness/idle, not fetch-start.

#### F. Single-connection deployments

If only one active Codex/OpenAI OAuth connection exists, **all** fallback machinery is a no-op after first failure. Operator still sees hang-until-timeout, then hard error — matches “must re-request”.

#### G. Forced / preselected connection

Pinned connection (combo step / forcedConnectionId) disables several rotation branches (semaphore capacity, some retries). Expected for operator pinning; can look like “no switch”.

---

### Wait / gate inventory (upper bounds on “stuck”)

| Gate | Default bound | Failure mode |
|------|---------------|--------------|
| Account semaphore queue | **30s** | `SEMAPHORE_TIMEOUT` / queue full → try other account if free |
| Rate-limit Bottleneck maxWait | **120s** | drop job → error / combo fallback |
| Bottleneck wedge watchdog | **120s** no dispatch | force-reset limiter |
| waitForCooldown (all cooling) | **30s × ≤3** | wait then re-pick; abort on client disconnect |
| comboCooldownWait (quota-share) | **5s / 2 attempts / 8s budget** | short wait then redispatch |
| Stream readiness | **80s** (adaptive) | terminal (single-model, non-AG) |
| Fetch headers | **600s** | 504 `upstream_timeout`, **no** account fallback |
| Stream idle | **600s** | stream failure, no account switch |
| Token refresh attempt | **30s** (refresh-with-retry helper) | prevents infinite OAuth hang in that helper |

There is **no unbounded wait** in these coded gates, but several **multi-minute** budgets feel like freezes, and hang-class failures often **do not** spend residual budget on another account.

---

### H1 conclusion for epic scoping

| Question | Answer |
|----------|--------|
| Is resilience “missing”? | **No** — three-layer resilience + credential loop + Codex 429 rotation exist. |
| Is operator claim fabricated? | **No** — hang class + long budgets + non-rotation on self-timeout/readiness reproduce the symptom. |
| Greenfield rewrite needed? | **No**. |
| Residual work? | **Yes** — targeted hang-class failover + tighter / staged budgets + multi-account Codex hang policy. |

---

## H2 — SQLite write pressure

### Claim (operator)

`SQLITE_BUSY`, single writer, perceived slowness under parallel agents.

### Verdict: **CONFIRMED**

Architectural single-writer + sync better-sqlite3 + hot-path writers + 2s busy wait that **parks the Node event loop**. Application-level busy **retry** is essentially **absent**. Severity is **P2** for typical single-operator use; rises under multi-agent parallel writes + second process on same DB (e.g. WinUI host note in core).

### Severity: **P2 Medium**

Not “DB is broken”; residual is **pressure under concurrency**, not a missing primary store. **Out of scope**: Cybernetics-style full PostgreSQL migration.

---

### Evidence

#### 1. WAL + capped busy_timeout (intentional)

`src/lib/db/core.ts` (~1083–1089):

```ts
db.pragma("journal_mode = WAL");
// better-sqlite3 is synchronous, so a contended write parks the Node event loop for up to
// busy_timeout ms (… /health stops responding). … cap the block at 2s instead of 5s …
db.pragma("busy_timeout = 2000");
db.pragma("synchronous = NORMAL");
```

Documented in `docs/ops/DATABASE_GUIDE.md` (WAL, concurrent reads, single-file deployment rationale).

#### 2. No app-level SQLITE_BUSY retry layer

Repo grep of production paths:

- `SQLITE_BUSY` appears as **classification / logging** (`src/shared/utils/apiAuth.ts` — avoid silent 401s on busy).  
- Unit tests assert load-error helpers **do not** treat `SQLITE_BUSY` as driver-unavailable.  
- **No** shared `retryOnBusy()` / write queue wrapping domain modules.

After 2s busy wait, writers throw; callers either fail that write, soft-swallow (some best-effort telemetry), or surface errors.

#### 3. Write-heavy / hot-adjacent paths

| Path | Role |
|------|------|
| `usage_history` inserts (`src/lib/usage/usageHistory.ts`) | Per-request usage rows; sync `db.prepare(...).run` |
| `call_logs` / `saveCallLog` (`src/lib/usage/callLogs.ts`) | Attempt logging; often fire-and-forget from chatCore |
| `markAccountUnavailable` / connection updates (`src/sse/services/auth.ts`) | Cooldown + mutex; DB write under parallel failures |
| Token refresh persist (`checkAndRefreshToken` + open-sse mutex) | Network + DB write atomic for rotating OAuth tokens (Codex-sensitive) |
| rateLimit learned limits persist | Debounced **60s** (good — not per-request) |
| Domain circuit breakers / settings / MCP audit | Additional writers under multi-agent use |

Comments in core explicitly name **usage_history / call_logs** as hot-path writers that are best-effort relative to liveness.

#### 4. Synchronous driver = event-loop freeze under contention

better-sqlite3 executes on the JS thread. Concurrent writes (or external process on same file) cause:

1. Thread blocks ≤ `busy_timeout` (2000 ms).  
2. Stacked blocks under load can make `/health` and other handlers appear stuck (documented in core comment).  
3. After timeout → `SQLITE_BUSY` / locked errors without automatic retry.

#### 5. Existing mild mitigations (already shipped)

- WAL concurrent readers  
- `busy_timeout = 2000` (shorter freeze than 5s)  
- Fire-and-forget on some request log appends (`.catch(() => {})`)  
- Debounced rate-limit persistence  
- Usage dedup / transactional rollups for cleanup  
- Optional DB optimization settings (`optimizationSettings.ts`, auto_vacuum, etc.)  
- Health check endpoint / VACUUM ops guidance in DATABASE_GUIDE  

These reduce but do **not** eliminate single-writer pressure under parallel agents.

#### 6. Policy conflict note (not a product defect)

Parent harness “sqlite-abolition” vs OmniRoute intentional SQLite was already flagged in wave-2 harness audits. Product direction remains SQLite-primary (`AGENTS.md`, DATABASE_GUIDE). Residual epic must **not** reopen full PG migration.

---

### H2 conclusion for epic scoping

| Question | Answer |
|----------|--------|
| Is single-writer real? | **Yes** |
| Are SQLITE_BUSY / stalls under parallel agents plausible? | **Yes** |
| Is full PG migration required? | **No** (explicitly out of residual scope) |
| Residual work? | **Yes** — write amortization, serialization off hot path, operator knobs, metrics |

---

## INCLUDE scopes for residual epics

### EPIC-16 — Hot-path hang / freeze without useful failover  
**Domain**: open-sse chatCore + `src/sse/handlers/chat.ts` + timeouts + multi-account OAuth (Codex focus)  
**Priority**: P1  
**Not in scope**: rewrite of circuit breaker / cooldown model; greenfield “new resilience platform”.

#### INCLUDE (precise)

1. **Hang-class multi-account policy (Codex / OAuth first)**  
   - Define when a pre-content stall may try **next connection** without permanent poison:  
     - `STREAM_READINESS_TIMEOUT` / `STREAM_EARLY_EOF` after N same-connection tries  
     - optional short `upstream_timeout` (self-inflicted) rotation when **≥2** active connections and budget remains  
   - Preserve Antigravity special policy; do not cool healthy single-connection accounts forever.  
   - Keep “do not mark unavailable on pure stall” as default **or** use **short soft exclude** (request-local only), not terminal `banned`.

2. **Staged / tighter failure budgets (operator-visible freeze)**  
   - Audit defaults: 600s fetch/idle vs interactive UX; propose **tiered** defaults or progressive failure (e.g. readiness fail-fast already 80s → **then** optional account hop before client timeout).  
   - Document recommended env matrix for agent-heavy deploys (`FETCH_TIMEOUT_MS`, `STREAM_IDLE_TIMEOUT_MS`, `STREAM_READINESS_TIMEOUT_MS`, `RATE_LIMIT_MAX_WAIT_MS`).  
   - No silent change of production defaults without migration note.

3. **Codex-specific hang gaps**  
   - WS connect path: add explicit connect timeout parity with HTTP `fetchWithStartTimeout`.  
   - Align 429 rotation success stories with hang-class policy (429 already rotates; hang does not).  
   - Ensure session affinity clear on hang-class rotate (parity with 429).

4. **Observability**  
   - Structured counters/logs: `waiting_account_slot`, `waiting_rate_limit`, `stream_readiness_fail`, `self_timeout_no_fallback`, `codex_account_rotation`, time-in-stage.  
   - Make “why no fallback” explicit in call logs (already partially present for rate-limit queue).

5. **Tests (TDD gate)**  
   - Unit: single-model multi-connection Codex hang → next connection (new policy).  
   - Unit: single-connection hang → no poison + bounded timeout.  
   - Regression: combo zombie stream fallback remains green.  
   - Regression: self-timeout must not long-cool single healthy account.

#### EXCLUDE

- Full combo strategy redesign  
- Fusion panel rewrite  
- Changing provider breaker status sets  
- Enabling stream recovery mid-stream by default without separate decision  

---

### EPIC-17 — SQLite write-pressure residual (stay on SQLite)  
**Domain**: `src/lib/db/*`, usage/call log writers, auth cooldown writes  
**Priority**: P2  
**Not in scope**: PostgreSQL / dual-write / Cybernetics DB rewrite; changing encryption scheme.

#### INCLUDE (precise)

1. **Busy / contention telemetry**  
   - Count/log SQLITE_BUSY / locked after busy_timeout; expose on `/api/db/health` or metrics.  
   - Correlate with concurrent request + background job counters.

2. **Hot-path write amortization**  
   - Ensure usage + call_log writes remain **off critical response path** (async queue with bounded backlog, drop-oldest under pressure, never block SSE first byte).  
   - Batch short inserts where safe (usage_history) without losing audit integrity for paid metering (document tradeoffs).  
   - Keep token-refresh + credential persistence **correct and mutexed** (Codex refresh_token rotation race is higher priority than throughput).

3. **Optional short app-level busy retry**  
   - Thin wrapper for **idempotent** best-effort writers only (telemetry, non-authoritative logs): e.g. 1–2 retries with jitter after SQLITE_BUSY.  
   - **Do not** blindly retry multi-statement transactions or credential updates without idempotency analysis.

4. **Operational knobs (still SQLite)**  
   - Document / optionally surface: `busy_timeout`, WAL checkpoint cadence, `journal_size_limit`, call-log detail off, retention.  
   - Guidance for multi-agent: single OmniRoute process, avoid second writer process on same `DATA_DIR`.

5. **Event-loop safety**  
   - Avoid raising `busy_timeout` as the “fix” for pressure (increases freeze). Prefer fewer synchronous writes and queueing.  
   - Revisit any hot path that does multi-row transactional work under request concurrency.

6. **Tests**  
   - Unit: busy helper retries only classified errors; non-busy errors propagate.  
   - Unit: response path does not await non-critical log flush (where currently claimed fire-and-forget).  
   - Optional stress doc: parallel agents + expected BUSY rate (manual, not CI-flaky).

#### EXCLUDE

- Migrating primary store to PostgreSQL / MySQL  
- SurrealDB / parent cargo DoD  
- Multi-primary distributed SQLite  
- Schema greenfield redesign  

---

## Cross-links (prior wave artifacts)

| Artifact | Relevance |
|----------|-----------|
| `docs/reports/audits/2026-07-19-architect-orchestrator-wave-synthesis.md` | Wave-3 epic slots EPIC-10–14; **EPIC-16/17 are residual additions** beyond that table |
| `docs/ops/DATABASE_GUIDE.md` | WAL / busy_timeout / ops tuning |
| `docs/architecture/RESILIENCE_GUIDE.md` (project doc) | 3-layer model (breaker / cooldown / model lockout) — H1 residual is **fourth failure mode: hang without classify** |
| Wave-2 harness audits | SQLite-abolition vs intentional SQLite policy conflict |

---

## Recommended epic ordering

1. **EPIC-16** first — directly matches operator “freeze / re-request” pain; code paths already identified.  
2. **EPIC-17** second — improves multi-agent feel and health liveness under write storms; orthogonal enough to parallelize after INCLUDE locked.

---

## Method / non-goals

- Static code verification only (handlers, services, constants, DB core, existing unit tests).  
- No live probe of `:21000` / `:22000`, no Docker, no code changes.  
- Live multi-account hang reproduction left to EPIC-16 implementation TDD or operator VPS proof if unit isolation insufficient.

---

## One-line verdicts (for orchestrator promotion)

- **H1 PARTIAL / residual CONFIRMED** → promote **EPIC-16** hang-class multi-account + budget/observability (P1).  
- **H2 CONFIRMED** → promote **EPIC-17** SQLite-native write pressure mitigations (P2); **reject** PG rewrite as residual vehicle.
