# EPIC-12 — OmniRoute Security Residual Harden

> **Status**: Planning (promote children next)  
> **Priority**: P1 (P0 for Tailscale spawn classification)  
> **Type**: security / HARDEN  
> **Project**: omniroute-2  
> **Date**: 2026-07-19  
> **Depends on**: Epic 0008 children 0040–0051 completed (do not re-open closed scopes wholesale)  
> **Evidence**: `docs/reports/audits/2026-07-19-wave2-security-reviewer-residual-investigation.md`

---

## 1. Goal

Close **confirmed** security residuals that survived Epic 0008 path-to-100 without re-litigating already-fixed 0051 helper paths.

## 2. Problem (Wave 2 confirmed)

| ID | Sev | Finding |
|----|-----|---------|
| F-SEC-W2-001 / H-PRODUCT-005 | **P1** | Tailscale enable/login use `spawn` but are **not** in LOCAL_ONLY / SPAWN_CAPABLE; tests assert non-local under wrong comment |
| H-PRODUCT-004 / 014 | P2 | Residual raw `err.message` / unsanitized Response bodies outside shared helpers |
| H-PRODUCT-006 | P2 | Secrets dual-read transition residual (by design — document or force rewrite path) |
| Additional | P2–P3 | See security Wave 2 report F-SEC-W2-002…007 |

## 3. Scope (in)

1. Classify Tailscale spawn routes correctly (Hard Rules #15/#17 family) + fix unit assertions  
2. Targeted sanitize sweep for confirmed call sites (not entire codebase re-audit)  
3. Regression tests locking LOCAL_ONLY/SPAWN_CAPABLE for tunnel enable/login  
4. Optional: secrets dual-read residual disposition (doc vs migration task)

## 4. Scope (out)

- Re-opening full 0040–0051 acceptance  
- Docker / :21000 mutation  
- SSRF executor work already closed in 0045

## 5. Success metrics

- [ ] `isLocalOnlyPath` true for Tailscale enable/login (or equivalent always-auth spawn tier per routeGuard design)  
- [ ] Unit test matrix updated; previous false assertion removed  
- [ ] Each confirmed raw `err.message` Response path either sanitized or allowlisted with justification  
- [ ] No regression on 0051 helper defaults

## 6. Suggested child task themes

| Theme | Focus | parallel-safe |
|-------|-------|---------------|
| T12-A | Tailscale routeGuard + tests (P1) | serial (routeGuard) |
| T12-B | Targeted error sanitize residual sweep + tests | parallel-safe vs T12-A if different files |
| T12-C | Secrets dual-read disposition (doc or migrate) | parallel-safe |

## 7. Source evidence

- Security Wave 2 report  
- `src/server/authz/routeGuard.ts`  
- `src/lib/**/tailscaleTunnel*` / tunnels API routes  
- `docs/security/ROUTE_GUARD_TIERS.md`, `ERROR_SANITIZATION.md`
