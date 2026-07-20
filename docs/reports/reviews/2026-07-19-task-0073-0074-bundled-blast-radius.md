# Cross-Task Blast Radius: 0073 + 0074 — 2026-07-19

Bundled security review (gt-security-reviewer / builders). Per-task scores are independent; this section covers shared risk only.

## Cross-Task Blast Radius

| Item | Detail |
|------|--------|
| **Shared files** | None. 0073 owns `src/app/api/**` error leaves + `tests/unit/security/residual-sanitize-0073.test.ts`. 0074 owns `docs/security/SECRETS_AT_REST.md` (+ DATABASE_GUIDE cross-link); **no** secrets.ts code under D1. |
| **Shared interfaces** | None. Both reuse existing helpers (`sanitizeErrorMessage` / 0041 encryption) without changing their contracts. |
| **Generated surfaces** | Both add Unreleased `CHANGELOG.md` bullets (Security vs Changed) — no conflict. |
| **Regression risk if only one accepted** | Accepting 0073 alone: Hard Rule #12 residuals close; dual-read disposition still needed for Epic-12 T12-C. Accepting 0074 alone: disposition SSOT lands; management error leaks remain until 0073. |
| **Serial vs parallel residual** | Parallel-safe as designed. 0072 owns enable/login/disable sanitize + RouteGuard; 0073 skipped those catches intentionally. |
| **Diff ownership map** | `err.message` wire leaves → **0073**. Secrets dual-read narrative / F-SEC-W2-005 accept → **0074**. Tailscale LOCAL_ONLY → **0072** (already 03-review). |

## Independent scores

| Task | Score | Verdict | Lane |
|------|------:|---------|------|
| 0073 | 100 | ACCEPT | `03-review` |
| 0074 | 100 | ACCEPT | `03-review` |

## Reports

- `docs/reports/reviews/2026-07-19-task-0073-residual-err-message-sanitize-sweep-security-review.md`
- `docs/reports/reviews/2026-07-19-task-0074-secrets-dual-read-residual-disposition-security-review.md`
