# Slice 05: lib data/auth/provider — Adversarial Review (Wave 1)

## Scope

Paths reviewed (data/auth/provider libs only):

- `src/lib/db/`
- `src/lib/oauth/`
- `src/lib/providers/`
- `src/lib/credentialHealth/`
- `src/lib/resilience/`
- `src/lib/quota/`
- `src/lib/usage/`
- `src/lib/auth/`
- `src/lib/accessTokens/`
- `src/lib/security/`
- `src/lib/config/`
- `src/lib/env/`
- `src/lib/freeProxyProviders/`
- `src/lib/headroom/`

## Exclusions honored

- **Task 0036** (`01-open`): deploy/verify dual-mode on `:21000` — not treated as code bugs; no invent runbook findings.
- **Dual-mode auth 0032–0035, 0037–0039** (`03-review`): `connectionUsesOAuthRefresh`, heal `no_refresh_token`, token-health matrix — not re-filed. Residual unrelated SQL/auth bugs outside those contracts are reported.
- **Task 0017** fusion docs — out of scope.

## Method

1. Dynamic SQL / injection surface in `src/lib/db/*` (prepare templates, `PRAGMA`, allowlists).
2. Encryption-at-rest coverage vs plaintext secret stores (connections, api_keys, secrets, proxies, webhooks, PSD cookies).
3. OAuth persistence / token field lockstep (`expiresAt` vs `tokenExpiresAt`).
4. Usage/quota accounting (rollup additive path, registered-key budgets, quota share consume).
5. Race / TOCTOU (registered-key issue + validate, quota mutex).
6. Credential logging / fail-open crypto paths.
7. Evidence is path:line only; no fabrication.

## Findings (severity-ordered)

### F-05-001 — JWT / API signing secrets stored plaintext in SQLite

- Severity: **P0**
- Category: security
- Evidence:
  - `src/lib/db/secrets.ts:7-27` — `persistSecret` / `getPersistedSecret` write/read JSON string values with **no** `encrypt()`/`decrypt()`.
  - `src/instrumentation-node.ts:44-63` — persists `jwtSecret` and `apiKeySecret` via `persistSecret` when env secrets are missing.
- Why it matters: Anyone with read access to `storage.sqlite` (backup copy, disk image, mis-shared `DATA_DIR`) obtains the signing material used for sessions / API key derivation. This is strictly worse than missing field encryption on provider tokens: it is the root secret for auth.
- Suggested fix direction: Always store secrets under `enc:v1:` via `encrypt()` when `STORAGE_ENCRYPTION_KEY` is set; refuse startup in production if neither env secret nor encrypted store is available; never write plaintext JWT/API secrets to `key_value`.

### F-05-002 — Inference API keys persisted in plaintext alongside hash

- Severity: **P1**
- Category: security
- Evidence:
  - `src/lib/db/apiKeys.ts:523-535` — `INSERT` stores `apiKey.key` raw **and** `hashKey(apiKey.key)`.
  - `src/lib/db/apiKeys.ts:555-558` — regenerate still writes plaintext `key` column.
  - `src/lib/db/apiKeys.ts:1075` — validation still matches `key` **or** `key_hash` (`stmt.validateKey.get(key, hashedKey)`).
  - Contrast: `src/lib/db/accessTokens.ts:6-8,103-107` correctly persists **hash only**.
  - Contrast: `src/lib/db/migrations/008_registered_keys.sql:13` documents hashed-only storage for registered keys.
- Why it matters: DB compromise yields every OmniRoute client API key in cleartext. `key_hash` provides no protection while the plaintext column remains authoritative. Access tokens already demonstrate the correct pattern in the same codebase.
- Suggested fix direction: Stop writing plaintext `api_keys.key`; validate only by hash; one-time migration: hash existing rows, null/drop plaintext column (or encrypt column if display-on-create-only is required).

### F-05-003 — Web-session / cookie credentials stored unencrypted in `provider_specific_data`

- Severity: **P1**
- Category: security
- Evidence:
  - `src/lib/db/encryption.ts:223-231` — `encryptConnectionFields` only covers `apiKey`, `accessToken`, `refreshToken`, `idToken`.
  - `src/lib/db/providers.ts:514-516` / `592-594` — `provider_specific_data` serialized as plain JSON.
  - `src/lib/db/webSessionDedup.ts:14-22,33-41` — credentials live under `cookie`, `token`, `sessionToken`, `sso`, `access_token`, etc. in PSD.
  - `src/lib/db/providers.ts:203-209` comment acknowledges “provider_specific_data is plaintext JSON”.
- Why it matters: Cookie/session auth (Grok, Qwen web, ChatGPT web, etc.) is full session material. Field encryption can be enabled for OAuth tokens while browser cookies remain readable at rest — false sense of security under `STORAGE_ENCRYPTION_KEY`.
- Suggested fix direction: Encrypt the entire `provider_specific_data` blob (or known credential keys inside it) on write; decrypt on read; migrate existing rows.

### F-05-004 — `validateRegisteredKey` budget check uses stale counters after window reset

- Severity: **P1**
- Category: bug
- Evidence:
  - `src/lib/db/registeredKeys.ts:383-400` — if `last_reset_day`/`last_reset_hour` differ, SQL resets `daily_used`/`hourly_used` to 0, then budget check uses the **pre-reset** `row.daily_used` / `row.hourly_used` from the SELECT.
  - `src/lib/db/registeredKeys.ts:408-416` — `incrementRegisteredKeyUsage` never resets windows; only validate does.
- Why it matters: After a day/hour boundary, a key that had exhausted its budget remains rejected until counters are re-read (or forever if callers only validate). False **deny** of otherwise valid registered keys; budgets do not self-heal on the first request of a new window.
- Suggested fix direction: After reset UPDATE, re-SELECT counters (or apply reset in-memory before compare); ideally one transaction that resets + checks + returns. Mirror reset logic into `incrementRegisteredKeyUsage`.

### F-05-005 — Usage history rollup is additive and not crash-safe (double-count)

- Severity: **P1**
- Category: bug
- Evidence:
  - `src/lib/usage/aggregateHistory.ts:154-172` — `ON CONFLICT … DO UPDATE SET total_requests = daily_usage_summary.total_requests + excluded.total_requests` (additive).
  - `src/lib/db/cleanup.ts:104-116` — rollup then `DELETE FROM usage_history WHERE timestamp < ?` as **separate** non-transactional steps; rollup errors abort delete, but success + crash before delete re-rolls same rows.
  - Contrast: `src/lib/usage/aggregateHistory.ts:52-56` (`rollupDailyUsage` from `quota_snapshots`) uses **replace** (`= excluded.*`), not add — two writers to the same summary table with incompatible semantics.
- Why it matters: Interrupted cleanup, manual re-run of rollup, or mixing `rollupDailyUsage` + `rollupUsageHistoryBeforeDate` permanently inflates analytics / cost dashboards; there is no idempotency key or “already rolled” marker on source rows.
- Suggested fix direction: Single transaction (rollup + delete); make usage_history rollup idempotent (replace from source for date range, or mark rows `rolled_up_at`); stop dual-sourcing `daily_usage_summary` from both quota_snapshots and usage_history without a clear authority.

### F-05-006 — OAuth re-auth update path does not lockstep `tokenExpiresAt` with `expiresAt`

- Severity: **P2**
- Category: bug
- Evidence:
  - `src/lib/oauth/connectionPersistence.ts:43-55` — **create** path sets `tokenExpiresAt: expiresAt` (comment #5326 documents badge prefers `tokenExpiresAt`).
  - `src/lib/oauth/connectionPersistence.ts:97-103` — **email-match update** sets `expiresAt` only; no `tokenExpiresAt`.
  - `src/lib/db/providers.ts:619-639` — update merges patch over existing row, so stale `token_expires_at` is preserved when not in patch.
- Why it matters: Re-authorizing an existing OAuth connection refreshes `expires_at` but can leave a past `token_expires_at`. UI/token-health that prefers `tokenExpiresAt` continues to show expired / trigger unnecessary refresh pressure until some other path rewrites both fields.
- Suggested fix direction: In `persistOAuthConnection` update branch, set `tokenExpiresAt: expiresAt` (same as create). Not the dual-mode `no_refresh_token` class — residual OAuth persistence bug.

### F-05-007 — Field encryption fails open to plaintext on encrypt errors

- Severity: **P2**
- Category: security
- Evidence:
  - `src/lib/db/encryption.ts:109-139` — missing `STORAGE_ENCRYPTION_KEY` → warn + return plaintext; encrypt exception → log + return plaintext.
  - `src/lib/db/encryption.ts:150-161` — decrypt of `enc:v1:` without key returns `null` (asymmetric: write still possible as plaintext).
- Why it matters: Operators who believe encryption is on (or who have a bad key derivation) silently accumulate plaintext secrets. Mixed ciphertext/plaintext rows complicate recovery and defeat “encryption at rest” claims.
- Suggested fix direction: In production / when a key is configured, encrypt failure should throw (fail closed); optional explicit `OMNIROUTE_ALLOW_PLAINTEXT_SECRETS=1` for dev only.

### F-05-008 — Proxy registry passwords stored plaintext (only relay notes partially encrypted)

- Severity: **P2**
- Category: security
- Evidence:
  - `src/lib/db/proxies.ts:255-279` / `303-321` — INSERT/UPDATE write `password` with no `encrypt()`.
  - `src/lib/db/proxies.ts:134-148` — `extractRelayAuth` can decrypt `relayAuthEnc` in notes, but registry `password` column is never encrypted.
  - `src/lib/db/proxies.ts:423` — list redacts password as `***` in API mapping only; DB still holds cleartext.
- Why it matters: Upstream proxy credentials (often shared infra passwords) are full access to egress; same at-rest risk as API keys.
- Suggested fix direction: Encrypt `proxy_registry.password` (and username if sensitive) with the field encryption helpers; decrypt on resolution paths only.

### F-05-009 — Webhook HMAC secrets stored plaintext

- Severity: **P2**
- Category: security
- Evidence:
  - `src/lib/db/webhooks.ts:78-91` — generates `whsec_…` and INSERTs into `webhooks.secret` without encryption.
  - `src/lib/db/webhooks.ts:124-126` — updates write secret plaintext.
- Why it matters: DB leak allows forging webhook signatures to subscriber endpoints (or replaying with valid HMAC).
- Suggested fix direction: Encrypt secret at rest; decrypt only in dispatcher; rotate API to never return full secret after create.

### F-05-010 — Embedded-service `api_key` / `management_key` plaintext in `version_manager`

- Severity: **P2**
- Category: security
- Evidence:
  - `src/lib/db/versionManager.ts:112-119` — maps `api_key` / `management_key` as plain strings.
  - `src/lib/db/versionManager.ts:201-231` — upsert writes those columns without encryption helpers.
- Why it matters: Embedded services (spawnable processes) store management credentials in SQLite; same class as F-05-001/002 for local service takeover.
- Suggested fix direction: Encrypt service credential columns; never log them; align with field-encryption module.

### F-05-011 — Registered-key issue path: quota check not atomic with insert

- Severity: **P2**
- Category: bug
- Evidence:
  - `src/lib/db/registeredKeys.ts:128-221` — `checkQuota` separate from issue.
  - `src/lib/db/registeredKeys.ts:228-307` — `issueRegisteredKey` does **not** call `checkQuota`; increments counters without transaction wrapping check+insert.
  - `src/app/api/v1/registered-keys/route.ts:73-87` — route sequences check then issue (TOCTOU under concurrency).
- Why it matters: Concurrent issue requests can exceed `max_active_keys` / daily/hourly issue limits; enforcement is best-effort only.
- Suggested fix direction: Single DB transaction: check limits → insert → increment counters; unique constraints / conditional updates where possible. Optionally enforce inside `issueRegisteredKey` so non-route callers cannot bypass.

### F-05-012 — `batches.updateBatch` builds SET clause from arbitrary object keys (no allowlist)

- Severity: **P3**
- Category: security / maintainability
- Evidence:
  - `src/lib/db/batches.ts:136-156` — `Object.keys(objToSnake(updates))` interpolated into `UPDATE batches SET ${k} = ?`.
  - Contrast: `src/lib/db/skills.ts:47-48` and `src/lib/db/versionManager.ts:368-376` use explicit allowlists.
- Why it matters: Today callers appear limited (`cancel` route), but any future untrusted merge into `updateBatch` becomes SQL identifier injection. Defense-in-depth gap vs project norms.
- Suggested fix direction: Whitelist column names (same pattern as skills / `updateServiceField`).

### F-05-013 — Credential paste blob is integrity-unsigned Base64 JSON

- Severity: **P3**
- Category: security
- Evidence:
  - `src/lib/oauth/credentialBlob.ts:23-61,69-100` — `omniroute-cred-v1.` + base64url(JSON); validates shape only, no MAC/signature.
- Why it matters: Intended for human paste from local helper to remote dashboard; a MITM or malicious paste can inject tokens for another provider string if operator is tricked. Acceptable UX trade-off but residual risk for remote installs.
- Suggested fix direction: Optional HMAC with operator-known paste passphrase, or short-lived server challenge bound to session.

## Dead code / orphans

- `src/lib/db/providers.ts:741-743` — `cleanupProviderConnections()` always returns `0` (stub).
- Dual migration/repair paths for encryption: `autoMigrateLegacyEncryptedConnections` in both `providers.ts:761-814` and `core.ts:829-875` (duplicated logic; risk of drift — maintainability, not a functional bug by itself).
- `rollupDailyUsage` / `rollupHourlyQuota` sourced from `quota_snapshots` appear secondary to the usage_history cleanup path; easy for operators to confuse which is authoritative (see F-05-005).

## Wiring smells

- Several quota modules import domain functions via `@/lib/localDb` barrel (`sqliteQuotaStore.ts:18`, `redisQuotaStore.ts:19-22`, `credentialHealth/scheduler.ts:20`) while project hard rules prefer direct `src/lib/db/*` imports. Not a runtime bug; cycle/bundle risk.
- `src/lib/security/localEndpoints.ts:17-23` documents that the secondary guard is **inert** in Next.js without `__omniRequestHeaders` — authoritative control is `routeGuard` (correct if that stays true; easy to misuse if callers assume this helper alone is enough).
- Dynamic SQL fragments (`usageAnalytics` `apiKeyWhere`, `buildUnifiedSource`) rely on routes to only inject parameterized placeholders — currently true in `src/app/api/usage/analytics/route.ts`, but the DB helper accepts raw SQL strings.

## Improvement opportunities

1. Unify at-rest secret policy: one inventory of columns that must be encrypted (connections, PSD, api_keys, secrets, webhooks, proxies, version_manager, command_code_auth already encrypts — good).
2. Prefer hash-only secrets for OmniRoute-issued credentials (access tokens pattern).
3. Registered-key budget paths: transaction + re-read after reset + tests for day boundary.
4. Usage aggregation: single writer, replace-or-idempotent rollup, transactional cleanup.
5. OAuth persistence: always write `expiresAt`/`tokenExpiresAt` together on every success path (create, re-auth, refresh — refresh path in `usage/providerLimits.ts:354-360` already does this).

## Summary counts

| Severity | Count |
|----------|------:|
| P0       |     1 |
| P1       |     4 |
| P2       |     6 |
| P3       |     2 |
| **Total findings** | **13** |

| Residual (not filed as bugs) | Notes |
|------------------------------|--------|
| Dual-mode auth heal / matrix | Already tracked 0032–0039 / 0036 |
| Provider circuit / lockout in open-sse | Out of slice 05 |
| Fusion docs | Task 0017 |

**Report path:** `docs/reports/05-lib-data-auth.md`  
**Verdict for orchestrator:** NEEDS FIX candidates = P0 + P1 (F-05-001 … F-05-005); P2/P3 backlog.

---

# Slice 05 — Wave 2 Adversarial Second Pass

## Method (W2)

Independent re-audit of the same slice paths after Wave 1. Skipped dual-mode 0032–0039 and 0036 deploy/verify. Did not re-file F-05-001…013; only **new** residual issues.

## Findings (Wave 2 only)

### F-05-W2-001 — PSD response sanitizer omits web-session credential keys

- Severity: **P1**
- Category: security
- Evidence:
  - `src/lib/providers/requestDefaults.ts:215-232` — `sanitizeProviderSpecificDataForResponse` deletes a fixed set (`consoleApiKey`, `secretAccessKey`, `sessionToken`, `authCookie`, ollama/opencode usage cookies, etc.) but **not** the keys used for web-session auth.
  - `src/lib/db/webSessionDedup.ts:14-22` — preferred credential keys are `cookie`, `token`, `sessionToken`, `session-token`, `sso`, `access_token`, `accessToken` (and any first non-empty string fallback).
  - Call sites treat the helper as sufficient: `src/app/api/providers/route.ts:50-58` (list), `src/app/api/providers/[id]/route.ts:302-305` (update), `src/app/api/providers/bulk-web-session/route.ts:86-92` (bulk create returns “safe” connection).
  - Unit test only covers the already-stripped keys: `tests/unit/request-defaults-store-session.test.ts:117-130`.
- Why it matters: Management `GET /api/providers` and bulk web-session responses can return full browser cookie jars / session tokens for Grok/Qwen/ChatGPT-web style connections. Anyone with a manage-scoped session (or XSS into the dashboard origin) exfiltrates live upstream sessions. Distinct from F-05-003 (at-rest PSD plaintext): this is **API response** leakage of secrets that the sanitizer claims to hide.
- Suggested fix direction: Align redact list with `PREFERRED_CREDENTIAL_KEYS` (+ `copilotToken`, `sso-rw`, `cf_clearance`, etc.); prefer allowlist of safe PSD metadata over denylist; add regression tests that assert `cookie`/`sso`/`token` never appear in sanitized output.

### F-05-W2-002 — Env master API key compared with non-constant-time equality

- Severity: **P2**
- Category: security
- Evidence:
  - `src/lib/db/apiKeys.ts:221-223` — `isConfiguredEnvApiKey` uses `key === envKey`.
  - Same file grants env key full `manage` scope on metadata path: `src/lib/db/apiKeys.ts:1138-1184`.
  - Contrast: `src/lib/security/localEndpoints.ts:50,75-81` and `src/lib/oauth/connectionPersistence.ts:22-27` already use constant-time compares for similar secrets.
- Why it matters: `OMNIROUTE_API_KEY` / `ROUTER_API_KEY` is a deployment-root secret. String `===` comparison can leak length/prefix via timing oracles on the validation hot path (`validateApiKey` short-circuits true at line 1033). High-entropy keys reduce practical exploitability, but the codebase already standardized timing-safe compares elsewhere.
- Suggested fix direction: Use `crypto.timingSafeEqual` on equal-length buffers (or hash both then compare digests) for env-key equality.

### F-05-W2-003 — `persistSecret` is write-once (`INSERT OR IGNORE`); cannot rotate/replace

- Severity: **P2**
- Category: bug / security
- Evidence:
  - `src/lib/db/secrets.ts:19-24` — `INSERT OR IGNORE INTO key_value …` only.
  - `src/instrumentation-node.ts:43-67` — on missing env, loads persisted JWT/API signing secrets or generates once and persists.
- Why it matters: First successful write freezes the secret in SQLite forever under that key. Operators cannot rotate JWT/API signing material via re-persist without raw DB surgery; a race that writes a weak/empty value first (or a partial bootstrap) permanently wins. Compounds F-05-001 (plaintext store) with non-rotatability.
- Suggested fix direction: `INSERT OR REPLACE` (or update-if-changed with versioning); document explicit rotate API; encrypt at rest (F-05-001).

### F-05-W2-004 — Relay token budget fields stored but not enforced; rate check non-atomic

- Severity: **P2**
- Category: bug
- Evidence:
  - `src/lib/db/relayProxies.ts:116,128-131,210-212` — persists `max_cost_per_day` and `max_tokens_per_request`.
  - `src/lib/db/relayProxies.ts:238-282` — `checkRateLimit` only compares minute/day **request counts**; never sums `cost` vs `max_cost_per_day`; never inspects token fields.
  - `src/lib/db/relayProxies.ts:285-313` — `recordRelayUsage` increments counters in a separate call after the check (TOCTOU under concurrency).
  - Enforcement call site sequences check then later record: `src/app/api/v1/relay/chat/completions/route.ts:215-223` (and success path records usage after upstream work).
  - Grep: no consumer of `maxTokensPerRequest` / `max_cost_per_day` outside CRUD routes under `src/app/api/relay/tokens/`.
- Why it matters: Operators configure cost/token caps in the relay token UI/API expecting hard limits; spend can exceed `max_cost_per_day` indefinitely. Concurrent bursts can exceed RPM/RPD. Economic abuse of shared relay tokens.
- Suggested fix direction: Atomic check-and-reserve (transaction: read limits + counters → conditional increment); enforce daily cost sum and optional max tokens on request body; reject when `max_cost_per_day > 0` and projected cost ≥ cap.

### F-05-W2-005 — Headroom health probe fetches operator-set URL with no SSRF guard

- Severity: **P2**
- Category: security
- Evidence:
  - `src/lib/headroom/detect.ts:145-155` — `probeProxyRunning(url)` does `fetch(\`${base}/health\`)` with only a timeout.
  - `src/lib/headroom/detect.ts:162-166` — `getHeadroomStatus(url)` always probes the supplied URL.
  - `src/app/api/headroom/status/route.ts:11-16` — URL comes from `settings.headroomUrl` or `HEADROOM_URL` env (not a fixed allowlist).
  - Contrast: free-proxy ingestion filters private **proxy** IPs via `isPrivateHost` (`src/lib/freeProxyProviders/oneproxy.ts:85`) but never guards this probe URL.
- Why it matters: Any principal who can write settings (or set env) can point `headroomUrl` at internal metadata/link-local targets (e.g. `http://169.254.169.254/…`). The server initiates the HTTP probe. Low complexity SSRF from management plane into data plane network view.
- Suggested fix direction: Reuse `outboundUrlGuard` / block private+link-local+metadata hosts unless explicitly loopback for local headroom; document that only loopback or pre-approved sidecar hosts are valid.

### F-05-W2-006 — `createBatch` interpolates arbitrary object keys into SQL (same class as F-05-012)

- Severity: **P3**
- Category: security / maintainability
- Evidence:
  - `src/lib/db/batches.ts:114-124` — `INSERT INTO batches (${keys.join(", ")})` from `Object.keys(objToSnake(record))`.
  - Wave 1 F-05-012 covered only `updateBatch` (`:136-156`); create path is the same un-allowlisted identifier construction.
  - Caller: `src/app/api/v1/batches/route.ts:41` builds batch from request-derived fields.
- Why it matters: Defense-in-depth gap; future untrusted field merge becomes SQL identifier injection. Project norm is explicit column allowlists (`skills.ts`, `versionManager.ts` service field whitelist).
- Suggested fix direction: Fixed column list for INSERT (mirror update allowlist).

### F-05-W2-007 — Free-proxy sync base URLs from env are fetched without destination policy

- Severity: **P3**
- Category: security
- Evidence:
  - `src/lib/freeProxyProviders/oneproxy.ts:38-41,71-72` — `FREE_PROXY_1PROXY_API_URL` concatenated and `fetch`ed.
  - `src/lib/freeProxyProviders/iplocate.ts:41-50` — `FREE_PROXY_IPLOCATE_BASE_URL` + path `fetch`ed.
  - Only returned proxy **IPs** are filtered with `isPrivateHost`; the sync endpoint host itself is unrestricted.
- Why it matters: Mis-set env (or compromised env injection) turns the free-proxy scheduler into an SSRF client against internal hosts. Operator-controlled, so lower severity than request-parameter SSRF, but same class of bug as W2-005 without an allowlist.
- Suggested fix direction: HTTPS + hostname allowlist (or pin defaults); reject private/link-local resolve targets before fetch.

## Wave 2 summary counts (new only)

| Severity | Count |
|----------|------:|
| P0       |     0 |
| P1       |     1 |
| P2       |     4 |
| P3       |     2 |
| **Total new** | **7** |

## Combined W1 + W2

| Severity | Count |
|----------|------:|
| P0       |     1 |
| P1       |     5 |
| P2       |    10 |
| P3       |     4 |
| **Total** | **20** |

| Residual (not re-filed) | Notes |
|-------------------------|--------|
| Dual-mode auth 0032–0039 / 0036 | Honored exclusion |
| F-05-001…013 | Wave 1 only |
| Quota share B16 fail-open | Documented product decision |

**Wave 2 verdict:** NEEDS FIX (new P1 F-05-W2-001 + P2 backlog).
)
