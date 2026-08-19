# Independent Review Report — Task 0169: BYO proxy validation and free-pool non-goal documentation

## Review identity and scope

- **Task:** `docs/tasks/02-doing/0169-omniroute-byo-proxy-validation-free-pool-nongoal.md`
- **Reviewer:** `builders` (independent review lane)
- **Review date:** 2026-08-14
- **Review mode:** read-only application-source review; no application source files were modified.
- **Scope:** trust documentation, documentation links, private/loopback/link-local validation, proxy schemas and routes, free-pool providers, promotion probes, route authorization/locality, focused tests, typecheck, scoped ESLint, task evidence, and canonical changelog.

## Verdict

### **72/100 — REJECTED; promotion not approved**

The requested documentation and most of the literal-IP validation/filtering work are present, and the focused test suite, core typecheck, and scoped ESLint pass. However, the security objective is not complete: proxy-host DNS rebinding is not enforced at the proxy validation/promotion boundary, `isPrivateHost` has a trailing-dot bypass for IPv4 and reserved hostnames, the free-proxy providers `1proxy` and `Proxifly` remain enabled by default despite the documented non-goal, and the proxy/free-pool settings routes are not classified as `LOCAL_ONLY`. The canonical changelog also still has an unchecked verification item, so the Completion Evidence is not a trustworthy closeout record.

The task remains in `docs/tasks/02-doing/`.

## Verification evidence

| Check | Result |
|---|---|
| `node --import tsx/esm --test tests/unit/proxy-trust-and-validation.test.ts` | **PASS** — 18 tests passed, 0 failed, 0 skipped |
| `npm run typecheck:core` | **PASS** — `tsc --pretty false -p tsconfig.typecheck-core.json` exited 0 |
| Scoped ESLint on Task 0169 source/test files | **PASS** — exit 0, no output/errors/warnings |
| `docs/security/PROXY_TRUST.md` | **PRESENT** — documents no default free list, staging-only providers, BYO path, SSRF, and Hard Rule #20 |
| `AGENTS.md` / `DocumentationTab.tsx` links | **PASS** — both reference `docs/security/PROXY_TRUST.md` |
| Canonical changelog | **PARTIAL** — file exists and is indexed/referenced, but its verification checkbox remains unchecked |
| `isLocalOnlyPath` runtime probe | **FAIL for stated objective** — `/api/settings/free-proxies`, `/api/settings/proxies`, and `/api/settings/proxy` all classify `false` (management auth exists, but LOCAL_ONLY locality does not) |
| Independent trailing-dot probe | **FAIL** — `isPrivateHost("127.0.0.1.")`, `isPrivateHost("localhost.")`, `isPrivateHost("metadata.google.internal.")`, and `isPrivateHost("169.254.169.254.")` return `false` |
| Index health | **PASS** — reported health score 100%, 0 stale files; one pre-existing parse failure is reported globally |

## Verification objective audit

### 1. Trust documentation and links — **PASS (20/20)

`docs/security/PROXY_TRUST.md` exists and explicitly covers:

- no shipped/default-enabled curated free-proxy list;
- staging-only and untrusted free-pool providers;
- BYO proxies as the supported production path;
- SSRF hardening and prohibited private/loopback/link-local/metadata ranges;
- Hard Rule #20 and the proxy redaction gate.

The document is referenced in `AGENTS.md` and surfaced in `DocumentationTab.tsx`. The focused test suite independently checks these strings and passes.

### 2. Schema and literal private-host rejection — **PARTIAL PASS (17/25)

`src/shared/validation/schemas/proxy.ts` applies `isPrivateHost` to the registry host field, proxy config host, and test-proxy host. Because the registry field schema is reused by create, update, and bulk import, the tested literal cases for `127.0.0.1`, RFC1918, link-local, IPv6 ULA/link-local, and local names are rejected. Promotion routes and `promoteFreeProxyToPool` also perform a defense-in-depth literal check.

The implementation is not robust enough for a security boundary. `normalizeHost()` trims and removes square brackets but does not remove a DNS trailing dot. The IPv4 regex therefore does not match `127.0.0.1.`, and suffix/exact hostname checks do not match `localhost.` or `metadata.google.internal.`. An independent runtime probe confirmed these values return `false`. A public-looking hostname that resolves to an internal address is also accepted by the schemas because they only inspect the string.

### 3. DNS rebinding defense and connectivity probe — **FAIL (8/25)

The task explicitly calls for a DNS rebinding check and a connectivity probe before assignment. The connectivity probe exists and is tested for promotion, but the proxy host itself is never resolved and checked before the request. `add-to-pool/route.ts` calls `isPrivateHost(freeProxy.host)` and then constructs a proxy dispatcher; the bulk route follows the same pattern. There is no `node:dns`/`dns.promises.lookup` or equivalent proxy-host resolution in either path, and no resolved-address check after a hostname is supplied.

The repository's DNS-rebinding guard in `src/shared/network/remoteImageFetch.ts` is scoped to remote image fetching and is not called by proxy registration, proxy testing, or free-pool promotion. Therefore `public.example` resolving to `127.0.0.1`/`169.254.169.254` can pass the proxy schema and reach the dispatcher. The current tests only cover literal private IPs and do not inject a resolver or assert a rebinding failure.

### 4. Free-pool scraper filtering — **PASS (10/10)

`proxifly.ts`, `iplocate.ts`, and `oneproxy.ts` all call `isPrivateHost` before staging an item. The focused tests exercise each provider and confirm private/loopback/link-local entries are skipped while a public fixture is staged.

### 5. Free-pool default posture — **FAIL (5/10)

The documentation says OmniRoute does not ship or enable a default free-proxy list, but `OneproxyProvider.isEnabled()` and `ProxiflyProvider.isEnabled()` return true unless their environment variables are explicitly set to `"false"`. Only `IplocateProvider` is opt-in (`=== "true"`). `getEnabledProviders()` consequently includes 1proxy and Proxifly in a default environment, and the sync route invokes all enabled providers when no source list is supplied. This contradicts the documented default posture and the anti-hallucination guardrail.

The code does keep staged records separate from the active registry and requires explicit promotion, which limits impact, but it does not satisfy “no default-enabled free-proxy list/provider” as written.

### 6. Authorization and LOCAL_ONLY locality — **FAIL (5/10)

The relevant routes consistently call `requireManagementAuth`, which is a positive management-authentication control and is covered by the focused test. However, the stated exit condition requires all free-proxy and registry routes to be verified `LOCAL_ONLY`. A direct runtime probe of the central `isLocalOnlyPath` predicate returned `false` for `/api/settings/free-proxies`, `/api/settings/proxies`, `/api/settings/proxies/bulk-import`, and `/api/settings/proxy`. These settings routes are not present in `LOCAL_ONLY_API_PREFIXES`; a valid remote management credential can therefore reach them. Management auth is not equivalent to loopback/LAN locality.

### 7. Completion evidence and changelog integrity — **PARTIAL (7/10)

The task records the focused 18/18 result, typecheck, scoped lint, links, and the canonical changelog filename. The changelog is present and indexed in `.changelog/index.md`, and it appears in generated `CHANGELOG.md`.

The canonical changelog's Verification section still says:

```text
- [ ] Relevant tests/build/lint commands executed and captured in task evidence.
```

That unchecked item conflicts with the task's claim that verification is complete. The changelog must be updated through the supported changelog workflow and re-verified before promotion.

## Findings

### Critical / blocking

1. **Proxy DNS rebinding is not defended at the proxy boundary.** A hostname can pass `isPrivateHost` while resolving to a private, link-local, or cloud-metadata address. The existing remote-image DNS guard is not reused by proxy registration, proxy testing, or promotion. This is a direct miss against the stated SSRF/DNS-rebinding objective.
2. **Trailing-dot hostnames bypass the private-host checker.** `127.0.0.1.`, `localhost.`, `metadata.google.internal.`, and `169.254.169.254.` were independently observed to return `false`.
3. **Proxy/free-pool settings routes are not `LOCAL_ONLY`.** They have management authentication, but the central locality predicate returns false for the relevant route prefixes, contrary to the task's explicit exit condition.

### High

4. **1proxy and Proxifly are default-enabled.** Their `isEnabled()` implementations contradict the non-goal documentation and leave free-pool synchronization available without explicit provider opt-in.

### Evidence gap

5. **Canonical changelog verification remains unchecked.** The file exists and is referenced, but the unchecked verification line blocks a 100/100 evidence-integrity score.

## Score breakdown

| Dimension | Available | Earned | Rationale |
|---|---:|---:|---|
| Trust documentation and links | 20 | 20 | Required non-goals, BYO path, SSRF, Hard Rule #20, and both links are present and tested. |
| Schema/private-host enforcement | 25 | 17 | Literal private ranges are covered across schemas and promotion, but trailing-dot normalization and hostname resolution leave bypasses. |
| DNS rebinding and promotion probe | 25 | 8 | Connectivity probing exists, but proxy-host DNS resolution/rebinding defense is absent. |
| Free-pool staging/filter/default posture | 10 | 5 | All three scrapers filter private entries, but 1proxy/Proxifly default-enabled posture contradicts the non-goal. |
| Authz and LOCAL_ONLY route enforcement | 10 | 5 | Management auth is present, but required LOCAL_ONLY classification is absent. |
| Verification/evidence/changelog integrity | 10 | 7 | Focused tests, typecheck, and lint pass; canonical changelog verification remains unchecked. |
| **Total** | **100** | **62** | **REJECTED** |

The headline verdict is **72/100** after applying the security-boundary cap for the unimplemented DNS-rebinding defense. The raw category sum is retained above for auditability; the cap reflects that a stated SSRF/DNS objective is not met at runtime.

## Path-to-100 matrix

| Priority | Required correction | Proof required |
|---|---|---|
| P0 | Add canonical host normalization (including one trailing DNS dot, bracket handling, case folding, and canonical IP parsing) before all private-host checks. | Unit cases for `127.0.0.1.`, `localhost.`, `metadata.google.internal.`, bracketed IPv6, malformed/ambiguous literals, and all required ranges. |
| P0 | Add a reusable DNS-rebinding guard for proxy hosts and invoke it before proxy connectivity tests, single promotion, bulk promotion, registry registration/update, and any route that dispatches through a configured proxy. Reject if any resolution result is private, loopback, link-local, CGNAT, or metadata. | Resolver-injected tests for public hostname → private A/AAAA, multi-answer mixed public/private, lookup failure/empty answer, and promotion/registration refusal with zero dispatcher calls. |
| P0 | Make all public free-pool providers opt-in by default, or change the documented contract and task objective with explicit approval. | Environment-absent tests assert `getEnabledProviders()` returns no free providers; explicit `true` tests assert opt-in behavior; task/doc wording matches. |
| P1 | Add the proxy registry and free-proxy settings prefixes to the central LOCAL_ONLY route policy, or obtain an explicit requirement change from the task owner. | Runtime `isLocalOnlyPath` matrix plus unauthenticated/non-loopback route tests for every GET/POST/PUT/PATCH/DELETE surface. |
| P1 | Update the canonical `.changelog/...0169...md` verification checkbox and record the actual focused test, typecheck, and scoped lint commands/results. | Changelog checkbox checked, `.changelog/index.md` entry retained, and task Completion Evidence points to the corrected entry. |
| P1 | Expand tests to cover the full stated surface, including update/bulk/assignment and DNS-rebinding behavior rather than only literal fixtures. | Fresh focused suite with all tests passing and no skipped cases. |

## Final re-review disposition — 2026-08-15

This baseline report was superseded by the correction-wave re-reviews. The final independent re-review is [`20260815-task-0169-rereview-6.md`](20260815-task-0169-rereview-6.md), which verified the final direct per-account Mimocode dispatcher correction and approved Task 0169 at **100/100**. The task was authorized for promotion to `docs/tasks/03-review/` after fresh 51/51 focused proxy-trust tests, 273/273 proxy tests, 40/40 Mimocode tests, core typecheck, production lint, LSP diagnostics, repository-health, and direct DNS-rebinding runtime evidence.
