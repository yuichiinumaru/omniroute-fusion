# Slice 03: open-sse/services — Adversarial Review (Wave 1)

**Date**: 2026-07-11  
**Reviewer**: independent adversarial subagent (parent `agentID=reviewers`)  
**Scope path**: `open-sse/services/` (combo/, autoCombo/, compression/, fusion*, accountFallback, rate limits, cache, cooldowns, etc.)

## Scope

Reviewed resilience and routing critical paths in:

- `combo.ts` + `combo/*` (strategies, exhaustion, RR, runtime units, shadow)
- `accountFallback.ts`, `providerCooldownTracker.ts`
- `autoCombo/*` (scoring / router vs breaker state)
- `compression/*` (rule/regex load edges)
- `requestDedup.ts`, `rateLimitSemaphore.ts`, `tokenRefresh.ts` (local CB)
- `fusion.ts` only for residual runtime gaps not already owned by fusion tasks

## Exclusions honored

| Item | Treatment |
|------|-----------|
| Task **0017** (fusion docs/i18n) | Not reviewed as work |
| Task **0036** dual-mode deploy | Not investigated |
| Dual-mode auth matrix **0032–0035** | Not re-litigated |
| Fusion epic **0010–0016, 0018** | No competing fix tasks; residual fusion runtime note labeled **may overlap 03-review** |

## Method

1. Combo strategy dispatch: empty targets, OPEN/HALF_OPEN gates, RR vs priority parity  
2. Circuit breaker misuse: raw `.state` / `getStatus().state === "OPEN"` vs `canExecute()`  
3. accountFallback / connection cooldown / model lockout handoff with chat `isCombo`  
4. Compression rule/RTK regex surfaces (ReDoS / unbounded caches)  
5. Race / thundering-herd patterns (probe slots, backoff, dedupe)  
6. Dead / orphan wiring (duplicate symbols, private CB, stale AGENTS list)  
7. Evidence is path:line only; no fabricated call sites  

## Findings (severity-ordered)

### F-03-001 — Round-robin path never records provider circuit-breaker failures

- Severity: **P1**
- Category: bug / resilience
- Evidence:
  - Priority/speculative path records breaker failures: `open-sse/services/combo.ts:2491-2509` (`shouldRecordProviderBreakerFailure` + `recordProviderFailure`)
  - `recordProviderFailure` is only used at that site in `combo.ts` (grep: sole production call ~2508)
  - `handleRoundRobinCombo` failure path ends at semaphore cooldown + `recordProviderCooldown` only: `combo.ts:3353-3426` — no `recordProviderFailure`
  - Chat layer **suppresses** breaker trips when `isCombo` is true: `src/sse/handlers/chat.ts:1623-1628` (`!isCombo && … breaker._onFailure()`)
  - `breaker.execute(chatFn)` treats non-throwing HTTP 5xx/429 as **success** for the breaker (`src/sse/handlers/chatHelpers.ts:517-518`); HTTP failures do not call `_onFailure` via `execute`
- Why it matters: Under pure round-robin (and any traffic that only fails inside combo with `isCombo=true`), a hard-down provider never accumulates breaker failures. Priority combos open the shared breaker; RR combos keep re-probing forever (paying semaphore queue + latency) relying only on connection/model cooldowns.
- Suggested fix direction: Share a single post-target failure hook used by priority, RR, and runtime-unit paths that calls `shouldRecordProviderBreakerFailure` + `recordProviderFailure` (and model lockout where applicable). Add a regression test: N consecutive RR 502s on provider P open `getCircuitBreaker(P)`.

### F-03-002 — Combo-ref / `executeRuntimeUnitCombo` strips resilience wiring

- Severity: **P1**
- Category: bug / resilience / wiring
- Evidence:
  - When a simple strategy combo contains an executable combo-ref, dispatch uses `executeRuntimeUnitCombo`: `combo.ts:1000-1087`
  - Runtime unit loop (`combo/runtimeUnits.ts:191-245`) only: retry on 408/429/5xx, quality check, metrics — **no** circuit open skip, **no** `isModelLocked`, **no** `isProviderInCooldown`, **no** exhaustion sets, **no** `recordProviderFailure` / `recordModelLockoutFailure`, **no** provider cooldown record/success
- Why it matters: Nested combo-ref panels (and RR/weighted/priority with nested units) bypass the resilience layers the flat model path carefully built. Nested failures neither open the provider breaker nor pre-skip known-bad legs.
- Suggested fix direction: Reuse the shared exhaustion/breaker/lockout helpers from `executeTarget` / `applyComboTargetExhaustion` inside `executeRuntimeUnitCombo` (or run nested model legs through the same post-error path as flat combo).

### F-03-003 — HALF_OPEN probe budget ignored by combo pre-gates (`state === "OPEN"` only)

- Severity: **P1**
- Category: bug / resilience
- Evidence:
  - Shared breaker: `canExecute()` returns false when `HALF_OPEN && halfOpenAllowed <= 0` (`src/shared/utils/circuitBreaker.ts:277-282`); only `execute()` decrements `halfOpenAllowed` (`:253-254`)
  - Combo pre-skip only: `getStatus().state === "OPEN"`  
    - `combo.ts:1134-1135` (weighted eligibility)  
    - `combo.ts:1842-1847` (executeTarget)  
    - `combo/quotaStrategies.ts:433-436` (preScreen)  
    - sticky RR health: `combo.ts:2908-2909`
  - Auto scoring maps HALF_OPEN as eligible-with-penalty, never “cannot probe”: `combo.ts:520-522`, `autoCombo/routerStrategy.ts:58` (`!== "OPEN"`)
- Why it matters: After reset timeout, many concurrent combo requests (or multi-target same-provider hedges) all see `HALF_OPEN` and proceed; only the chat `execute()` path attempts to limit probes, and even that races (see F-03-008). Combo deliberately bypasses `canExecute()` for pre-skip, so half-open stampeding remains possible.
- Suggested fix direction: Pre-skip when `!getCircuitBreaker(p).canExecute()` (or reserve a probe token API). Align auto-combo filtering with the same predicate.

### F-03-004 — Round-robin main loop omits circuit-open + model-lock pre-skips before semaphore

- Severity: **P1**
- Category: bug / resilience / perf
- Evidence:
  - Priority `executeTarget` pre-skips OPEN breaker + model lock: `combo.ts:1842-1890`
  - RR sticky *clear* checks breaker + lock: `combo.ts:2906-2930`
  - RR **dispatch** loop checks only `isModelAvailable`, providerCooldownTracker, exhaustion — then **acquires semaphore**: `combo.ts:3008-3052` — no `getCircuitBreaker` / `isModelLocked`
- Why it matters: With OPEN breaker, RR still queues on the per-model semaphore, then fails at chat with `provider_circuit_open`, holding concurrency slots and adding latency before rotating. Sticky-aware health is not applied to non-sticky starts or later offsets.
- Suggested fix direction: Mirror the priority pre-checks (and ideally F-03-003’s `canExecute`) **before** `semaphore.acquire`.

### F-03-005 — Duplicate `isProviderInCooldown` symbols (circuit vs global cooldown)

- Severity: **P2**
- Category: wiring / maintainability
- Evidence:
  - Circuit-breaker wrapper: `accountFallback.ts:842-845` — `export function isProviderInCooldown(provider)` → `!breaker.canExecute()`
  - Cross-request failure tracker: `providerCooldownTracker.ts:108-136` — `export function isProviderInCooldown(provider, connectionId, settings)`
  - Combo correctly imports the tracker (`combo.ts:90-94`)
  - Other surfaces import the accountFallback name for breaker semantics (`webSessionPoolHealth.ts:15-41`, `open-sse/index.ts:53`)
- Why it matters: Same identifier, different arity and meaning. Easy to wire the wrong gate (or assume one map covers both layers). Operators reading logs “provider in cooldown” cannot tell which system fired without code context.
- Suggested fix direction: Rename to `isProviderCircuitOpen` / `isProviderFailureCooldownActive` (or similar) and fix all imports; keep thin deprecated aliases if needed.

### F-03-006 — Combo always calls `checkFallbackError` with `backoffLevel = 0`

- Severity: **P2**
- Category: bug / resilience
- Evidence:
  - Priority: `combo.ts:2411-2415` — third arg literal `0`
  - RR: `combo.ts:3309-3313` — same
  - Auth path correctly loads DB `backoffLevel` before `checkFallbackError`: `src/sse/services/auth.ts:1906-1960`
  - Combo uses returned `cooldownMs` for model lockout exact cooldown (`selectLockoutCooldownMs`) and semaphore RR cooldown (`combo.ts:3358-3360`)
- Why it matters: Combo-side lockout/semaphore cooldowns recompute as if first failure even when the connection already has elevated `backoffLevel`. Escalation is partial (model failure map has its own counter; connection backoff may advance in auth, but combo’s local wait/lock exact ms stays level-0).
- Suggested fix direction: Pass connection `backoffLevel` (from selected connection / profile cache) into `checkFallbackError` in both dispatchers.

### F-03-007 — `requestDedup` hash omits seed / n / stop / reasoning / connection

- Severity: **P2**
- Category: bug / correctness
- Evidence: `open-sse/services/requestDedup.ts:40-54` — canonical fields: model, messages, temperature, tools, tool_choice, max_tokens, response_format, top_p, frequency_penalty, presence_penalty only  
  Wired from chatCore with model overridden to `provider/model` (`open-sse/handlers/chatCore.ts:2152-2154`) — still no `seed`, `n`, `stop`, `logit_bias`, `reasoning_effort`, etc.
- Why it matters: Concurrent non-streaming low-temperature requests that differ only by `seed`/`n`/`stop` join one upstream call and get a single shared body (incorrect completions / truncated choice sets).
- Suggested fix direction: Include all generation-affecting fields in the canonical hash (or document explicit allowlist and gate `shouldDeduplicate` when any non-hashed field is present).

### F-03-008 — HALF_OPEN probe slot race under concurrent `canExecute` + `execute`

- Severity: **P2**
- Category: bug / race
- Evidence: `circuitBreaker.ts:277-282` (`canExecute` read-only) vs `:245-254` (`execute` decrements after separate check). Concurrent awaits can both observe `halfOpenAllowed > 0` then both enter `execute`.
- Why it matters: With default `halfOpenRequests: 1`, multiple probes can hit a recovering provider under load, re-opening the breaker and extending cooldown cycles.
- Suggested fix direction: Atomic `tryAcquireProbe()` that decrements under the same sync section as the allow check; combo should use that API for pre-skip.

### F-03-009 — Compression rule/RTK regex surfaces: custom packs compile without ReDoS gating

- Severity: **P2**
- Category: security / perf
- Evidence:
  - Caveman rule packs: `new RegExp(rule.pattern, flags)` with syntax-only validation: `compression/ruleLoader.ts:92-107`, `:139-144`
  - RTK match patterns compiled and cached unbounded: `compression/engines/rtk/filterLoader.ts:16-27` (`regexCache` grows without max)
  - Global custom RTK path is treated as trusted: `filterLoader.ts:131-134` (`DATA_DIR/rtk/filters.json`, `trusted: true`)
  - Builtin RTK schema mentions nested-quantifier concerns (`filterSchema.ts` comments ~150+) but caveman loader has no equivalent safe-regex check
- Why it matters: Operator-supplied (or compromised DATA_DIR) patterns can hang the event loop on large prompts; RTK cache can grow without bound if many distinct patterns appear.
- Suggested fix direction: Run safe-regex / nested-quantifier rejection before compile; cap `regexCache` size with LRU eviction; treat global custom filters with same trust bar as project filters when desired.

### F-03-010 — `isInModelFamily` ignores dot→hyphen normalization used by fallback resolver

- Severity: **P2**
- Category: bug
- Evidence:
  - `getNextFamilyFallback` normalizes: `bareModel.replace(/\./g, "-")` then lookup (`modelFamilyFallback.ts:156-158`)
  - `isInModelFamily` only: `return bareModel in MODEL_FAMILIES` (`:185-188`) — no normalization
  - Notation tests exist for `getNextFamilyFallback` (`tests/unit/model-family-fallback-notation.test.ts`) but not for `isInModelFamily`
- Why it matters: Callers that gate T5 fallback on `isInModelFamily("…/claude-opus-4.8")` get false negatives while `getNextFamilyFallback` would succeed — skipped family fallback for Kiro-style IDs.
- Suggested fix direction: Share one `lookupFamilyKey(model)` helper between both functions; add unit coverage.

### F-03-011 — Shadow routing ignores breaker / model lockout / provider cooldown

- Severity: **P3**
- Category: resilience / waste
- Evidence: `combo/shadowRouting.ts:133-150` — only `isModelAvailable`; then `handleSingleModel` with no circuit/cooldown gates
- Why it matters: Shadow samples can stampede OPEN/HALF_OPEN providers and count toward account cooldowns if the leaf path marks failures (depending on trafficType). Extra load on unhealthy upstreams without product value.
- Suggested fix direction: Skip shadow targets when `!canExecute()` or `isModelLocked` / provider cooldown.

### F-03-012 — Fusion nested combo-ref omits parent options (may overlap 03-review)

- Severity: **P2** (debt; already filed on fusion runtime review)
- Category: wiring
- Evidence: `fusion.ts:389-396` passes only `body, combo, handleSingleModel, log, allCombos, nesting` — not `settings`, `isModelAvailable`, `signal`, `relayOptions`, `apiKeyAllowedConnections`  
  Contrast runtime units: `combo/runtimeUnits.ts:116-120` spreads `baseOptions`
- Why it matters: Nested fusion combo-ref loses API-key allowlists, abort propagation, and availability prechecks. **May overlap 03-review** task 0012 F1 — do not open a competing epic; ensure one fix lands for both call sites.
- Suggested fix direction: Thread full `HandleComboChatOptions` base fields into `dispatchFusionUnit` like `executeComboRefUnit`.

### F-03-013 — Private token-refresh circuit breaker parallel to shared provider breaker

- Severity: **P3**
- Category: wiring / maintainability
- Evidence: `tokenRefresh.ts:2050-2134` — module-local `_circuitBreaker` with 5 failures / 30 min cooldown, independent of `src/shared/utils/circuitBreaker.ts`
- Why it matters: Dashboard/shared breaker state can show CLOSED while OAuth refresh is blocked for 30 minutes (or vice versa). Operators debug the wrong system.
- Suggested fix direction: Document the dual model clearly, or record refresh failures as a dedicated failure kind on the shared breaker with a separate name key (`refresh:${provider}`).

### F-03-014 — AGENTS.md strategy inventory stale vs live combo strategies

- Severity: **P3**
- Category: dead-code-docs / maintainability
- Evidence:
  - `open-sse/services/AGENTS.md:11-12` claims “13 total” strategies and omits fusion / headroom / quota-share / reset-window / etc.
  - Live header `combo.ts:3-5` lists fusion, headroom-class strategies; dispatch branches include `quota-share`, `headroom`, `context-*`, fusion (`combo.ts:950+`, `:1671+`, `:1682+`)
- Why it matters: Agent/human guidance under-describes production routing surface; increases wrong-strategy “fixes”.
- Suggested fix direction: Regenerate strategy list from `ROUTING_STRATEGY_VALUES` / combo dispatch set.

## Dead code / orphans

| Item | Notes |
|------|--------|
| `accountFallback.isProviderInCooldown` name | Not dead, but **shadows** tracker export — high confusion risk (F-03-005) |
| `tokenRefresh` private CB | Live but **orphaned from shared resilience model** (F-03-013) |
| RR imports `recordProviderFailure` / `recordModelLockoutFailure` | Used only on priority path; RR never calls `recordProviderFailure` (F-03-001); lockouts partially covered by auth `lockModel` when `isCombo` + non-persisted 429 |
| AGENTS.md “13 strategies” | Stale inventory (F-03-014) |

No confirmed unused export with zero importers was pursued as a blocking finding.

## Wiring smells

1. **Three resilience clocks for “provider unhealthy”**: shared circuit breaker, `providerCooldownTracker`, connection `rateLimitedUntil` — combo mixes all three with different APIs and names (F-03-005).  
2. **`isCombo` disables chat-side breaker trips** and expects combo to record failures — but only one of two major combo loops does (F-03-001).  
3. **Dual dispatch implementations** (flat `executeTarget` vs `executeRuntimeUnitCombo` vs RR) drift on every resilience feature (F-03-002, F-03-004).  
4. Fusion nested path vs runtimeUnits nested path option parity gap (F-03-012, may overlap 03-review).  

## Improvement opportunities

1. Extract `preSkipTarget(target, sets, settings)` + `recordTargetFailure(...)` used by priority, RR, runtime units, and shadow.  
2. Prefer `canExecute()` / probe acquire over `state === "OPEN"` everywhere (combo + autoCombo).  
3. Cap in-memory maps (`regexCache`, sticky maps already partially capped).  
4. Expand `requestDedup` field allowlist or fail closed on unknown generation fields.  
5. Align `isInModelFamily` with notation normalization + tests.

## Summary counts

| Severity | Count |
|----------|------:|
| P0 | 0 |
| P1 | 4 |
| P2 | 7 |
| P3 | 3 |
| **Total findings** | **14** |

| Category | Count |
|----------|------:|
| bug / resilience | 8 |
| wiring | 3 |
| security/perf (regex) | 1 |
| correctness (dedup) | 1 |
| docs/maintainability | 1 |

**Highest-priority remediation cluster**: unify post-failure + pre-skip resilience across **priority**, **round-robin**, and **runtime-unit** combo paths (F-03-001 … F-03-004), then fix HALF_OPEN semantics (F-03-003 / F-03-008).

**Residual risk / not fully audited**: every provider-specific quota fetcher; full RTK filter JSON corpus; all compression engines beyond rule/RTK loaders; browser/TLS clients; MCP tool wiring outside this slice.

**Report path**: `docs/reports/03-open-sse-services.md`

---

# Wave 2 — Second-pass adversarial review

**Date**: 2026-07-11  
**Reviewer**: independent adversarial subagent (Wave 2; parent `agentID=reviewers`)  
**Scope**: NEW findings in `open-sse/services/` missed by Wave 1  
**Exclusions honored**: 0017 docs, 0036 dual-mode, dual-mode auth matrix already tracked; fusion residuals labeled **may overlap 03-review**

## Wave 2 findings (severity-ordered)

### F-03-W2-001 — Auto-combo empty-pool fallback re-admits all OPEN/excluded providers

- Severity: **P1**
- Category: bug / resilience
- Evidence:
  - Self-healing filter removes OPEN / score-excluded candidates: `open-sse/services/autoCombo/engine.ts:227-238`
  - When every candidate is filtered out: `pool.push(...candidates)` and `excluded.length = 0` — **unconditional re-admission of the full raw set**: `engine.ts:240-244`
  - Live call site: `combo.ts` imports `selectProvider` from `autoCombo/engine.ts` (`combo.ts` + `engine.ts:186`)
- Why it matters: Under widespread outage (all candidates OPEN or self-healed out), auto strategy deliberately routes back into known-bad providers instead of failing closed or selecting least-bad with explicit probe budget. Undermines breaker + self-healing for the `auto` path.
- Suggested fix direction: Prefer soft re-admission of HALF_OPEN only (one probe), or return a structured “no healthy candidates” signal so combo can fall through / 503; never clear exclusions and re-push OPEN providers without a probe token.

### F-03-W2-002 — Auto-combo re-evaluate hardcodes breaker state `"CLOSED"`; incident mode never updated in prod

- Severity: **P1**
- Category: bug / resilience / dead wiring
- Evidence:
  - First filter uses real `c.circuitBreakerState`: `autoCombo/engine.ts:232`
  - Score re-filter always passes literal `"CLOSED"`: `engine.ts:250-251` (`healer.evaluate(s.provider, s.score, "CLOSED")`)
  - `updateIncidentMode` is only exercised in unit tests (`autoCombo/__tests__/autoCombo.test.ts:180+`); **zero production callers** (grep under `open-sse/services` — only `selfHealing.ts` definition + test)
  - `isInIncidentMode()` is still read to zero exploration: `engine.ts:262-263` — always false in production
- Why it matters: (1) Any candidate that reaches the second filter is treated as healthy for CB purposes — half-open/open semantics cannot influence score-based re-admission. (2) Documented “incident mode (>50% OPEN → exploitation only)” never activates, so exploration continues under mass outage (amplifies W2-001).
- Suggested fix direction: Pass the candidate’s real breaker state (join scored row back to pool candidate); call `updateIncidentMode(candidates.map(c => c.circuitBreakerState))` once per selection; cover with a unit test that OPEN pool + empty healthy set does not explore.

### F-03-W2-003 — Round-robin combo omits credential gate present on priority path

- Severity: **P2**
- Category: bug / resilience / wiring parity
- Evidence:
  - Priority `executeTarget` runs `checkCredentialGate` before dispatch: `combo.ts:1910-1918`
  - RR dispatch loop pre-checks availability, providerCooldownTracker, exhaustion, then **semaphore.acquire** — no `checkCredentialGate`: `combo.ts:3008-3052`
  - Runtime-unit path also has no credential gate (related to F-03-002 resilience strip)
- Why it matters: Known-bad credentials (cached unhealthy) still acquire RR concurrency slots and hit upstream/auth paths under RR, adding latency and holding semaphore capacity. Priority path already fail-fasts this class of target.
- Suggested fix direction: Share pre-dispatch gates (credential + breaker/lock from F-03-004) in one helper used by priority, RR, and ideally runtime units.

### F-03-W2-004 — Session stickiness key is first-user-message only (no tenant/session isolation)

- Severity: **P2**
- Category: bug / multi-tenant correctness
- Evidence:
  - Key derivation hashes only first user message text (16 hex chars): `combo/sessionStickiness.ts:122-144`
  - Map is global process-wide: `sessionStickiness.ts:114` (`stickyMap`)
  - Binding stores only `connectionId`: `sessionStickiness.ts:169-181`
  - Applied on priority and RR: `combo.ts:1696+`, `combo.ts:2966+`
  - No API-key id, user id, or conversation/session id in the hash (tests only cover content stability: `tests/unit/combo-session-stickiness.test.ts`)
- Why it matters: Distinct clients sharing common openers (`"Hi"`, `"Hello"`, boilerplate system+first turns) collide on the same sticky connection. Cross-tenant load skew and forced affinity onto a connection another tenant saturated; if connectionId is still in the ordered pool, stickiness promotes it even when strategy ordering would diversify. Not a plaintext secret leak (connection must still be in the request’s target list), but breaks the intended “this conversation’s cache” semantics under multi-key deployments.
- Suggested fix direction: Namespace hash with stable tenant/session material available to combo (API key id / client key hash / explicit session header) + first message; document collision risk if none available.

### F-03-W2-005 — `requestDedup` timeout only unmaps; does not abort or reject hung leader

- Severity: **P2**
- Category: bug / reliability
- Evidence:
  - Timer deletes map entry after `timeoutMs` but never `reject`s `sharedPromise` or aborts `fn`: `requestDedup.ts:102-104`
  - Waiters joined via `await existing` (`:83-86`) hang until the original `fn` settles
  - After unmap, a new concurrent caller can start a **second** upstream for the same hash while the first still runs (`:89-100` path)
  - Default `timeoutMs: 60_000` (`:21-24`)
- Why it matters: Slow/hung non-streaming completions break dedup guarantees (double spend + dual upstream) while early joiners still block indefinitely on the original promise. Field-coverage gap is already F-03-007; this is a separate liveness bug.
- Suggested fix direction: On timeout, reject the shared promise (and ideally abort via `AbortSignal` if chat can thread one); do not allow a second leader until the first is terminal, or mark leaders with generation tokens.

### F-03-W2-006 — Fusion panel timeout/straggler drop never cancels upstream work (may overlap 03-review)

- Severity: **P2**
- Category: cost / resilience
- Evidence:
  - Explicit comment: “the loser keeps running but is ignored”: `fusion.ts:174-190` (`withTimeout`)
  - `collectPanel` `finish()` resolves early on quorum+grace or hard timeout without aborting outstanding promises: `fusion.ts:201-237`
  - Panel dispatch has no `signal` / `AbortController`: `fusion.ts:352-365`, fan-out `fusion.ts:675-688`
  - Nested combo-ref option strip remains F-03-012 (**may overlap 03-review**)
- Why it matters: After quorum, dropped/timed-out panel legs continue consuming provider quota, concurrency slots, and tokens until natural completion — multiplies cost on large panels. Client disconnect also cannot cancel panel fan-out through fusion (no signal thread).
- Suggested fix direction: Per-panel `AbortController`; abort losers when `collectPanel` finishes or client aborts; thread `signal` through `dispatchFusionUnit` / `handleSingleModel`. Coordinate with fusion runtime tasks (**may overlap 03-review**).

### F-03-W2-007 — Emergency fallback keyword matching is over-broad (false budget redirects)

- Severity: **P2**
- Category: bug / correctness
- Evidence:
  - Keywords include bare `"billing"`, `"quota exceeded"`, `"quota_exceeded"`: `emergencyFallback.ts:43-59`
  - Match is substring on full lowercased error body: `emergencyFallback.ts:144-155`
  - Wired from chat on non-combo failures: `src/sse/handlers/chat.ts:1457-1498` (`shouldUseFallback`)
  - Default **enabled** via feature flag / env (`emergencyFallback.ts:37-38`, `:95-116`)
- Why it matters: Ordinary per-model/provider **rate-limit** or account messages that mention “quota”/“billing” (without true wallet exhaustion) can redirect to free `nvidia`/`openai/gpt-oss-120b`, changing model behavior and potentially masking the real 429/402 path. False positives also skip intentional paid-tier failures.
- Suggested fix direction: Require 402 **or** conjunction of stronger phrases (e.g. “insufficient funds” + status class); exclude pure `rate_limit` classifications; add negative tests for “rate limit quota” / “see billing portal” style bodies.

### F-03-W2-008 — Provider breaker treats 429 as provider-level failure code (policy conflict with resilience guide)

- Severity: **P3**
- Category: resilience / policy
- Evidence:
  - `PROVIDER_FAILURE_ERROR_CODES` includes `429`: `accountFallback.ts:95`
  - `shouldRecordProviderBreakerFailure` uses `isProviderFailureCode(status)`: `combo/comboPredicates.ts:134-145`
  - Project guidance (`CLAUDE.md` resilience section) states most `429`s belong to connection cooldown / model lockout, not whole-provider breaker
  - Comment in `accountFallback.ts:91-94` cites Issues #1846 / #3200 as intentional inclusion
- Why it matters: Sustained per-model 429s on the last same-provider combo leg can OPEN the **whole-provider** breaker, blocking other healthy models/connections for that provider. Interacts badly with F-03-001 (RR never records) vs priority (does) — behavior differs by strategy. Not clearly a regression vs #3200 intent, but a residual footgun Wave 1 did not surface.
- Suggested fix direction: Count 429 toward breaker only when classified as provider-wide quota exhausted (not per-model / transient rate_limit); align docs and `isProviderFailureCode` with that split.

### F-03-W2-009 — Self-healing HALF_OPEN probes unbounded; score gate uses fixed 0.5 on first pass

- Severity: **P3**
- Category: bug / resilience
- Evidence:
  - While excluded, every `evaluate(..., "HALF_OPEN")` returns `isProbe: true` and increments `probeCount` with **no concurrent cap**: `selfHealing.ts:66-72`
  - `recordProbeResult` only re-admits after `probeCount >= 3` successes (`:109-119`) but nothing limits concurrent probes in flight
  - First pool filter always scores `0.5` (never real score): `engine.ts:232` — score-based exclusion only possible on second pass
- Why it matters: Under load, many auto-combo selections can stampede HALF_OPEN providers (stacks with F-03-003/F-03-008 half-open races). Fixed 0.5 first-pass score means first-pass never score-excludes, only CB OPEN path matters before scoring.
- Suggested fix direction: Single in-flight probe flag per provider; pass real prior score or defer exclusion to post-score only with real CB state (ties to W2-002).

## Wave 2 dead / residual notes

| Item | Notes |
|------|--------|
| `SelfHealingManager.updateIncidentMode` | Implemented + tested; **never called** from production select path (W2-002) |
| Fusion panel losers | Intentionally non-canceling today (`fusion.ts:174`) — cost residual; **may overlap 03-review** |
| RR vs priority gate drift | Credential gate joins breaker/lock pre-skip drift (W2-003 + F-03-004) |
| Emergency fallback default-on | Keyword FP risk (W2-007) |

## Wave 2 summary counts (this pass only)

| Severity | Count |
|----------|------:|
| P0 | 0 |
| P1 | 2 |
| P2 | 5 |
| P3 | 2 |
| **Total new findings** | **9** |

| Category | Count |
|----------|------:|
| bug / resilience | 5 |
| multi-tenant / correctness | 1 |
| reliability (dedup liveness) | 1 |
| cost (fusion cancel) | 1 |
| policy residual | 1 |

**Combined Wave 1 + Wave 2**: P0=0, P1=6, P2=12, P3=5, **total 23**.

**Highest-priority W2 cluster**: auto-combo self-healing/empty-pool (W2-001/002), then RR credential-gate parity (W2-003) and fusion cancel/options residuals (W2-006 + F-03-012, **may overlap 03-review**).
