# Task 0169: BYO proxy validation and free-pool non-goal documentation

> **Status**: `[~]` In progress — builder wave assigned (`builders`)
> **Priority**: 🟡 P1
> **Type**: `security hardening`
> **Origin**: Proxy security planning — BYO proxies lack documented trust guarantees; free-pool posture is ambiguous; repo has 3 free-proxy providers but no explicit trust boundary docs.
> **Blocks**: —
> **Depends on**: Task 0168 (redaction gate establishes the trust context).
> **Parallelism**: `serializable` with proxy/free-proxy UI/API changes.
> **Review routing**: independent + security + supply-chain review

---

## Objective

1. **Non-goal doc**: Add `docs/security/PROXY_TRUST.md` stating no curated
   free-proxy list is shipped or enabled by default; free-pool providers are
   staging-only; BYO proxies are the supported path.
2. **BYO validation hardening**: reject private/loopback/link-local on promote;
   DNS rebinding check; connectivity probe before assign.
3. **Free-pool source hardening**: keep `freeProxyProviders` disabled until
   explicit Sync; extend private-range filter to `proxifly.ts` and `iplocate.ts`
   (currently only `oneproxy.ts` filters).
4. **Authz/SSRF**: re-verify all free-proxy + registry routes are `LOCAL_ONLY`.

## Exit Conditions (GDD/TDD)

- [x] `docs/security/PROXY_TRUST.md` exists and is linked from proxy UI + AGENTS.md.
- [x] BYO promote with `127.0.0.1/10.x/192.168.x/::1/fc00::/fe80::` rejected.
- [x] Free-pool sync remains staging-only; bulk promote requires connectivity test.
- [x] All free-proxy + registry routes verified local-only; regression test added.
- [x] `npm run typecheck:core` passes.
- [x] Changelog draft prepared.

## Details

### Where

| File | Purpose |
|------|---------|
| `docs/security/PROXY_TRUST.md` | Create — trust boundary docs. |
| `src/shared/network/isPrivateHost.ts` | Pure zero-dependency private/loopback/link-local/IMDS checker with trailing-dot normalization. |
| `src/shared/network/proxyHostGuard.ts` | Reusable DNS-rebinding and host validation guard for proxy hosts with resolver injection for tests. |
| `src/shared/network/outboundUrlGuard.ts` | Re-export `isPrivateHost`, `isCloudMetadataHost`, `assertValidProxyHost`, and `validateProxyHost`. |
| `src/server/authz/routeGuard.ts` | Add `/api/settings/proxies/`, `/api/settings/proxy/`, and `/api/settings/oneproxy/` to `LOCAL_ONLY_API_PREFIXES`. |
| `src/shared/validation/schemas/proxy.ts` | Harden BYO SSRF deny via `isPrivateHost`. |
| `src/lib/db/freeProxies.ts` | Harden `promoteFreeProxyToPool` with `assertValidProxyHost` DNS rebinding validation and resolver test seam. |
| `src/lib/db/proxies.ts` | Harden `createProxy`, `createProxyAndAssign`, `updateProxy`, `updateProxyAndAssign`, and `migrateLegacyProxyConfigToRegistry` with `assertValidProxyHost`. |
| `open-sse/utils/proxyDispatcher.ts` | Harden `createProxyDispatcher`, `normalizeProxyUrl`, and `proxyConfigToUrl` with `isPrivateHost` / `isCloudMetadataHost` guards. |
| `open-sse/utils/proxyFetch.ts` | Harden `runWithProxyContext()` and `patchedFetch()` with `assertValidProxyHost()` DNS rebinding validation before reachability check, dispatcher creation, or network I/O. |
| `open-sse/utils/proxyFallback.ts` | Harden `testSingleProxy()` with `assertValidProxyHost()` before constructing proxy dispatcher. |
| `open-sse/executors/mimocode.ts` | Harden `getProxyDispatcher()` and `fetchWithProxy()` with `assertValidProxyHost()` DNS rebinding validation before `createProxyDispatcher()`. |
| `src/lib/proxyEgress.ts` | Harden `defaultEgressProbe`, `diagnoseAllEgressIps`, and `validateProxyPool` with `assertValidProxyHost` DNS rebinding guards before network connect. |
| `src/lib/freeProxyProviders/proxifly.ts` | Make opt-in by default (`FREE_PROXY_PROXIFLY_ENABLED="true"`); private-range filter before staging. |
| `src/lib/freeProxyProviders/oneproxy.ts` | Make opt-in by default (`FREE_PROXY_1PROXY_ENABLED="true"`); private-range filter before staging. |
| `src/lib/freeProxyProviders/iplocate.ts` | Opt-in by default (`FREE_PROXY_IPLOCATE_ENABLED="true"`); private-range filter before staging. |
| `src/lib/freeProxyProviders/index.ts` | `getEnabledProviders()` returns empty array when no opt-in env flags are set. |
| `src/lib/api/proxyRegistryRouteHandlers.ts` | Enforce DNS rebinding check on proxy create and update. |
| `src/app/api/settings/proxies/bulk-import/route.ts` | Enforce DNS rebinding check on bulk import items. |
| `src/app/api/settings/proxy/test/route.ts` | Enforce DNS rebinding check on test requests before dispatcher/outbound connect. |
| `src/app/api/settings/free-proxies/[id]/add-to-pool/route.ts` | Enforce DNS rebinding check before connectivity probe and promotion. |
| `src/app/api/settings/free-proxies/bulk-add-to-pool/route.ts` | Enforce DNS rebinding check before quick test and promotion. |
| `src/app/api/settings/proxy/route.ts` | Enforce DNS rebinding check in PUT handler across configured proxy hosts. |
| `src/app/(dashboard)/dashboard/settings/components/proxy/DocumentationTab.tsx` | Link `docs/security/PROXY_TRUST.md` from Documentation tab. |
| `AGENTS.md` | Add reference link to `docs/security/PROXY_TRUST.md`. |
| `tests/unit/proxy-trust-and-validation.test.ts` | Comprehensive unit tests for SSRF validation, DNS rebinding, free-pool default-disabled posture, promotion guard, direct DB helpers, runtime dispatcher protection, and LOCAL_ONLY route matrix. |

### Path-to-100 Closure Matrix

| Re-Review Requirement | Implementation / Fix | Verification Proof |
|-----------------------|----------------------|-------------------|
| **P0: DNS-rebinding guard across proxy lifecycle** | Created `src/shared/network/proxyHostGuard.ts` (`assertValidProxyHost`, `validateProxyHost`, `setGlobalProxyLookupForTests`). Wired into proxy registration (`handleProxyCreate`), update (`handleProxyUpdate`), bulk import (`bulk-import`), proxy testing (`proxy/test`), single promotion (`free-proxies/[id]/add-to-pool`), bulk promotion (`bulk-add-to-pool`), and proxy configuration (`PUT /api/settings/proxy`). Rejects private/link-local/metadata IP answers, empty results, DNS failures, and mixed public/private (multi-A) answers. | Unit tests cover literal bypass, public resolution, private resolution, mixed answers, lookup failures, and empty answers. Route integration tests verify 400 rejection and zero dispatcher/tester calls for rebinding hosts. |
| **P0: Direct DB helper proxy host validation** | In `src/lib/db/freeProxies.ts`, `promoteFreeProxyToPool()` now invokes `await assertValidProxyHost(registryPayload.host, options)` with test resolver seam. In `src/lib/db/proxies.ts`, `createProxy()`, `createProxyAndAssign()`, `updateProxy()`, `updateProxyAndAssign()`, and `migrateLegacyProxyConfigToRegistry()` now strictly enforce `assertValidProxyHost()`, rejecting literal private IPs and DNS rebinding hosts at the persistence boundary. | Tests in `proxy-trust-and-validation.test.ts` verify `promoteFreeProxyToPool` returns `null` and writes zero rows on DNS rebinding, and `createProxy`/`createProxyAndAssign`/`updateProxy` throw on private/rebinding hosts with zero DB rows written. |
| **P0: Runtime dispatcher & stored-proxy protection** | In `open-sse/utils/proxyFetch.ts`, `runWithProxyContext()` and `patchedFetch()` now validate `assertValidProxyHost(host)` when `effectiveProxyConfig` has a host and `ALLOW_LOCAL_PROXIES !== "true"`, rejecting DNS rebinding and private addresses before any TCP reachability checks (`isProxyReachable`), dispatcher construction, cache lookup, or network I/O. In `open-sse/utils/proxyFallback.ts`, `testSingleProxy()` enforces `assertValidProxyHost()`. In `open-sse/utils/proxyDispatcher.ts`, `createProxyDispatcher()`, `normalizeProxyUrl()`, and `proxyConfigToUrl()` now validate `!isPrivateHost(host) && !isCloudMetadataHost(host)`. In `src/lib/proxyEgress.ts`, `defaultEgressProbe()`, `diagnoseAllEgressIps()`, and `validateProxyPool()` validate `assertValidProxyHost()` before constructing dispatchers or issuing network I/O, safely flagging stored rebinding records as `error` without outbound network connection. | Tests in `proxy-trust-and-validation.test.ts` verify `runWithProxyContext` rejects DNS rebinding hosts with zero TCP checks (`tcpCalls=0`) and zero dispatcher fetch calls (`dispatcherFetchCalls=0`); string proxy URLs are also rejected before reachability; public hostnames resolving to public IP succeed (`tcpCalls=1`, `dispatcherFetchCalls=1`); `createProxyDispatcher` and `proxyConfigToUrl` throw on private hosts; `validateProxyPool` marks pre-existing rebinding proxy rows as `status='error'` with zero network probes; and `diagnoseAllEgressIps` captures rebinding error without socket connect. Full suite `tests/unit/proxy-*.test.ts` passes 271/271 tests. |
| **P0: Free-pool scrapers disabled by default** | Updated `ProxiflyProvider.isEnabled()` and `OneproxyProvider.isEnabled()` to return `true` only when their respective env var equals `"true"` (`FREE_PROXY_PROXIFLY_ENABLED="true"`, `FREE_PROXY_1PROXY_ENABLED="true"`). `IplocateProvider` remains opt-in. | `tests/unit/proxy-trust-and-validation.test.ts` asserts `getEnabledProviders()` returns `[]` when no env vars are set, and each provider returns disabled error on `sync()`. |
| **P1: Central LOCAL_ONLY route locality** | Added `/api/settings/proxies/`, `/api/settings/proxy/`, and `/api/settings/oneproxy/` to `LOCAL_ONLY_API_PREFIXES` in `src/server/authz/routeGuard.ts`. | Route locality matrix in `proxy-trust-and-validation.test.ts` verifies `isLocalOnlyPath` returns `true` for 25 proxy/free-proxy/oneproxy routes across all HTTP methods (GET, POST, PUT, PATCH, DELETE). |
| **P1: Direct per-account MimocodeExecutor dispatcher validation** | In `open-sse/executors/mimocode.ts`, `getProxyDispatcher()` and `fetchWithProxy()` now asynchronously validate `await assertValidProxyHost(u.hostname)` before calling `createProxyDispatcher()` when `ALLOW_LOCAL_PROXIES !== "true"`. Rejects private/loopback/metadata IP answers and DNS rebinding before constructing a dispatcher or issuing network calls (`bootstrapJwt` or `fetchWithProxy`). | Tests in `proxy-trust-and-validation.test.ts` verify `MimocodeExecutor.getProxyDispatcher()` and request execution reject DNS rebinding hosts with 0 dispatchers created and 0 network calls made; valid public hostnames resolving to public IP succeed. |
| **P1: Extended regression test suite** | Suite expanded from 18 to 35 to 46 to 49 to 51 tests covering all SSRF, DNS rebinding, direct DB helpers, runtime dispatcher & request context, scraper posture, promotion, direct executor dispatcher, and authz locality dimensions. | `node --import tsx/esm --test tests/unit/proxy-trust-and-validation.test.ts` passes 51/51 tests; `tests/unit/proxy-*.test.ts` passes 273/273 tests; `tests/unit/mimocode-executor.test.ts` passes 40/40 tests. |

## ⛔ Anti-Hallucination Guardrails

> [!CAUTION]
> Do NOT ship a default-enabled free-proxy list. Do NOT auto-promote staging
> proxies to routing. Keep BYO as the documented supported path.

## 📋 Completion Evidence (preenchido pelo agente executor)

- **Non-goal doc**:
  - Created `docs/security/PROXY_TRUST.md` documenting non-goals (no default free-proxy list, free-pool scrapers are untrusted and staging-only), BYO proxy supported path, SSRF defense-in-depth, Hard Rule #20 PII redaction gate integration, and authz boundaries.
  - Linked from `AGENTS.md` line 719 and `src/app/(dashboard)/dashboard/settings/components/proxy/DocumentationTab.tsx`.

- **SSRF & DNS Rebinding Verification**:
  - `node --import tsx/esm --test tests/unit/proxy-trust-and-validation.test.ts`
  ```
  ✔ isPrivateHost correctly classifies private/loopback/link-local/metadata hosts (5.778989ms)
  ✔ isCloudMetadataHost identifies IMDS endpoints (0.351511ms)
  ✔ createProxyRegistrySchema rejects private, loopback, and link-local hosts (3.19098ms)
  ✔ createProxyRegistrySchema accepts valid public hosts and IPs (0.670162ms)
  ✔ updateProxyRegistrySchema rejects private host on update (1.114074ms)
  ✔ bulkImportProxiesSchema rejects items containing private hosts (1.060854ms)
  ✔ proxyConfigSchema rejects private hosts in global / provider configs (0.619852ms)
  ✔ updateProxyConfigSchema rejects private host payloads (0.726102ms)
  ✔ testProxySchema rejects private host test requests (0.843502ms)
  ✔ Free-pool providers are disabled by default when no env vars are set (0.365791ms)
  ✔ Free-pool providers enable cleanly with explicit opt-in env vars (0.218071ms)
  ✔ Free-pool provider sync returns 0 and error message when disabled (0.636732ms)
  ✔ ProxiflyProvider filters out private and loopback IPs during sync (71.134003ms)
  ✔ IplocateProvider filters out private and loopback IPs during sync (70.691751ms)
  ✔ OneproxyProvider filters out private and loopback IPs during sync (69.539277ms)
  ✔ assertValidProxyHost: IP literals bypass DNS lookup (7.002524ms)
  ✔ assertValidProxyHost: rejects literal private IPs immediately without DNS lookup (0.996993ms)
  ✔ assertValidProxyHost: resolves public hostname to public IP successfully (0.281901ms)
  ✔ assertValidProxyHost: rejects hostname resolving to private/loopback/metadata IP (DNS rebinding) (1.018684ms)
  ✔ assertValidProxyHost: rejects mixed public and private DNS answers (multi-A defense) (0.256521ms)
  ✔ assertValidProxyHost: rejects hostname when DNS lookup fails or returns empty (0.357581ms)
  ✔ validateProxyHost: returns safe result object for valid and invalid hosts (0.391831ms)
  ✔ promoteFreeProxyToPool rejects private host promotion (63.914407ms)
  ✔ POST /api/settings/free-proxies/[id]/add-to-pool returns 400 for private host (71.891825ms)
  ✔ POST /api/settings/free-proxies/[id]/add-to-pool returns 400 for DNS rebinding host without connectivity probe (68.166332ms)
  ✔ POST /api/settings/free-proxies/bulk-add-to-pool marks private and rebinding hosts as failed (68.090102ms)
  ✔ POST /api/settings/proxies rejects host resolving to private IP via DNS rebinding (68.194453ms)
  ✔ PATCH /api/settings/proxies rejects host resolving to private IP (68.554693ms)
  ✔ POST /api/settings/proxies/bulk-import marks DNS rebinding items as failed (68.132323ms)
  ✔ POST /api/settings/proxy/test rejects DNS rebinding host without connecting (68.503563ms)
  ✔ PUT /api/settings/proxy rejects config with DNS rebinding host (66.549957ms)
  ✔ All proxy registry, free-proxy, and proxy config routes are classified LOCAL_ONLY (4.509295ms)
  ✔ Proxy registry and free-proxy routes require management auth (122.724218ms)
  ✔ docs/security/PROXY_TRUST.md exists and documents core non-goals (2.133057ms)
  ✔ AGENTS.md and DocumentationTab reference PROXY_TRUST.md (0.390412ms)
  ✔ promoteFreeProxyToPool rejects DNS rebinding host with injected resolver and leaves registry clean (74.480574ms)
  ✔ promoteFreeProxyToPool accepts valid public host with injected resolver (67.841631ms)
  ✔ createProxy rejects literal private IP addresses directly at DB boundary (64.827431ms)
  ✔ createProxy rejects DNS rebinding host and writes zero rows (65.354473ms)
  ✔ createProxyAndAssign rejects private and DNS rebinding hosts (65.319483ms)
  ✔ updateProxy and updateProxyAndAssign reject updating to private or rebinding host (64.890701ms)
  ✔ migrateLegacyProxyConfigToRegistry skips private and rebinding legacy records while migrating valid ones (66.130655ms)
  ✔ createProxyDispatcher throws for private, loopback, link-local, and metadata URLs (4.480465ms)
  ✔ proxyConfigToUrl throws for proxy config objects with private host (0.363871ms)
  ✔ validateProxyPool marks pre-existing rebinding proxy as error and refuses egress probe (63.802418ms)
  ✔ diagnoseAllEgressIps reports error for connection with rebinding proxy without network probe (4.302265ms)
  ✔ runWithProxyContext rejects DNS rebinding host before TCP reachability or dispatcher fetch (0.522282ms)
  ✔ runWithProxyContext rejects string proxy URL with DNS rebinding host before TCP reachability or dispatcher fetch (0.298371ms)
  ✔ runWithProxyContext accepts valid public hostname proxy when DNS resolves to public IP (2.361988ms)
  ✔ MimocodeExecutor getProxyDispatcher rejects per-account proxy with DNS rebinding host before dispatcher construction or network I/O (2.394908ms)
  ✔ MimocodeExecutor getProxyDispatcher accepts valid public hostname proxy when DNS resolves to public IP (1.238144ms)
  ℹ tests 51
  ℹ suites 0
  ℹ pass 51
  ℹ fail 0
  ```

- **Typecheck & Regression Test Suite**:
  - `npm run typecheck:core` -> zero errors (exit 0)
  - `node --import tsx/esm --test tests/unit/proxy-trust-and-validation.test.ts tests/unit/proxy-*.test.ts` -> 273/273 tests pass
  - `node --import tsx/esm --test tests/unit/mimocode-executor.test.ts` -> 40/40 tests pass
  - Scoped ESLint on all task files -> zero errors (exit 0)

- **Changelog**: Canonical entry `.changelog/20260814-235246-0169-byo-proxy-validation-and-free-pool-nongoal-docs-builders.md` created; `CHANGELOG.md` rebuilt.
- **Agent/date**: `builders` / 2026-08-15

## 🔍 Review Trail (preenchido pelo reviewer)

- **Reviewer**: `builders` (independent review lane)
- **Prior review**: `REJECTED` — `72/100` — [`docs/reports/review/20260814-task-0169-final-review.md`](../../reports/review/20260814-task-0169-final-review.md)
- **Re-reviewer**: `builders` (independent review lane)
- **Re-review verdict**: `REJECTED`
- **Re-review score**: `70/100`
- **Re-review report**: [`docs/reports/review/20260814-task-0169-rereview.md`](../../reports/review/20260814-task-0169-rereview.md)
- **Delta re-review**: `REJECTED` — `84/100` — [`docs/reports/review/20260815-task-0169-rereview-2.md`](../../reports/review/20260815-task-0169-rereview-2.md)
- **Delta re-review date**: `2026-08-15`
- **Resolved since prior re-review**: direct promotion-helper DNS guard with resolver seam; registry create/update/assignment and legacy migration persistence guards; stored-proxy egress diagnostics and pool-validation guards; focused suite expanded to 46 tests and proxy-wide suite passes 268/268; typecheck, lint, and dispatcher LSP diagnostics are clear.
- **Latest delta re-review**: `REJECTED` — `94/100` — [`docs/reports/review/20260815-task-0169-rereview-3.md`](../../reports/review/20260815-task-0169-rereview-3.md)
- **Latest delta re-review date**: `2026-08-15`
- **Persistent blocker**: ordinary stored-proxy request dispatch remains synchronously guarded only. `resolveProxyForConnection()` → `runWithProxyContext()` → `proxyConfigToUrl()` / `createProxyDispatcher()` does not perform asynchronous DNS-rebinding validation, so a stored public-looking hostname resolving to a private address can pass the dispatcher boundary. Dedicated egress diagnostics and pool-validation paths are guarded, but they do not prove the normal request path.
- **Correction-wave re-review**: `REJECTED` — `94/100` — [`docs/reports/review/20260815-task-0169-rereview-4.md`](../../reports/review/20260815-task-0169-rereview-4.md)
- **Correction-wave re-review date**: `2026-08-15`
- **Correction-wave runtime proof**: direct `runWithProxyContext()` → `proxyFetch()` probe with an injected `127.0.0.1` DNS answer accepted the stored hostname; observed `lookupCalls=0`, `tcpCalls=1`, and `dispatcherFetchCalls=1`. The ordinary request path remains unguarded before reachability and dispatch.
- **Latest correction re-review**: `REJECTED` — `97/100` — [`docs/reports/review/20260815-task-0169-rereview-5.md`](../../reports/review/20260815-task-0169-rereview-5.md)
- **Latest correction re-review date**: `2026-08-15`
- **Resolved in latest correction**: `runWithProxyContext()` and `patchedFetch()` now asynchronously validate proxy hosts before reachability, callback, dispatcher construction, and fetch; `proxyFallback.testSingleProxy()` also validates candidates. Fresh direct request-path probe rejected rebinding with `lookupCalls=1`, `tcpCalls=0`, and `dispatcherFetchCalls=0`. Focused suite is 49/49 and proxy-wide suite is 271/271.
- **Persistent P1 blocker**: `MimocodeExecutor.getProxyDispatcher()` still constructs a dispatcher directly from credential-provided per-account proxy URLs. A rebinding hostname resolving to `127.0.0.1` created a dispatcher with `lookupCalls=0`; this direct executor boundary is not covered by the new request-context guard.
- **Final correction re-review**: `APPROVED` — `100/100` — [`docs/reports/review/20260815-task-0169-rereview-6.md`](../../reports/review/20260815-task-0169-rereview-6.md)
- **Final correction re-review date**: `2026-08-15`
- **Resolved final P1**: `MimocodeExecutor.getProxyDispatcher()` is asynchronous and awaits `assertValidProxyHost()` before `createProxyDispatcher()`. `fetchWithProxy()` and `getJwtForAccount()` await the async dispatcher path. Direct DNS-rebinding probe rejected a credential-provided hostname resolving to `127.0.0.1` with `lookupCalls=1`, no dispatcher construction, and zero network calls.
- **Final verification**: focused trust suite `51/51`; proxy-wide suite `273/273`; Mimocode suite `40/40`; `npm run typecheck:core` passed; production proxy implementation lint passed; LSP diagnostics are zero; repository index health is 100.0% with zero stale files and parse failures.
- **Promotion**: approved; task moved to `docs/tasks/03-review/`.