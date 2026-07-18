# Review Report: Task 0032 — Connection Auth-Mode Helper — 2026-07-18 (final re-review)

## Review Lineage

- **Current task**: Task 0032 (`omniroute-connection-auth-mode-helper`); live path `docs/tasks/03-review/0032-omniroute-connection-auth-mode-helper.md`
- **Previous reports read** (scores UNTRUSTED; used only for lineage):
  - `docs/reports/reviews/2026-07-11-task-0032-connection-auth-mode-helper-review.md` — claimed 96/100
  - `docs/reports/reviews/2026-07-16-task-0032-connection-auth-mode-helper-reaudit.md` — claimed 93/100
- **Review mode**: independent full re-review + path-to-100 applied in-session
- **Reviewer profile**: `reviewers` (agentID=reviewers) — Implacable TypeScript Reviewer (Tier 3)

## Score And Verdict

### Score: 100 — Perfect

### Verdict: `PASS_PATH_TO_100_CLOSED`

### Lane recommendation: `hold-in-review` (S ≥ 90 — remain in `docs/tasks/03-review/`; not returned to `02-doing/`; not promoted to `04-completed/` by this reviewer)

## Axiom Compliance

| Axiom | Status | Notes |
|-------|--------|-------|
| Type Purity | ✅ pass | Named exports; `NormalizedAuthType` union; no `any`; PSD casts gated + `// SAFETY:` |
| Boundary Integrity | ✅ pass | `normalizeAuthType(unknown)`; plain-object gate rejects arrays (`typeof [] === "object"` foot-gun closed) |
| Async Determinism | ✅ pass | Pure sync helpers only |
| Immutability | ✅ pass | No mutation of input connections |
| State Exclusivity | ✅ pass | Canonical auth modes; dual-mode static vs OAuth #5326 mutually exclusive via gates |

## Rubric Snapshot

| Dimension | Score | Notes |
| --- | --- | --- |
| Contract / exit conditions | 100 | Module path, exports, re-export, tests, CHANGELOG |
| Dual-mode / #5326 correctness | 100 | apikey/aliases/cookie/none/blank+static safe; oauth no-RT marks; Windsurf long-lived skip |
| Classification completeness | 100 | blank/`unknown` uses full `hasStaticCredential`; arrays rejected |
| SSoT / condensation | 100 | Single definition of `connectionUsesOAuthRefresh` in shared module |
| Tests | 100 | Pure matrix + #5326 regression live green |
| Hygiene | 100 | Details/compliance checkboxes synced; completion evidence counts current |

## Live Evidence

```bash
node --import tsx/esm --test \
  tests/unit/connection-auth-mode.test.ts \
  tests/unit/token-health-no-refresh-token-expired-5326.test.ts \
  tests/unit/token-health-dual-mode-matrix.test.ts \
  tests/unit/heal-no-refresh-token.test.ts \
  tests/unit/dual-mode-refresh-policy-audit-0035.test.ts
# → 47/47 PASS (2026-07-18 this session)
```

Adversarial pure probes (this session):

| Probe | Result |
|-------|--------|
| apikey / api_key / api-key | `connectionUsesOAuthRefresh=false`, `shouldMarkNoRefreshExpired=false` |
| blank + apiKey / cookie PSD / accessToken | non-OAuth |
| oauth + no RT + supportsRefresh | mark expired = true |
| windsurf import / imported | long-lived; mark = false |
| windsurf firebase | mark = true (not long-lived) |
| `[]` array shell | **false** after path-to-100 (was true pre-fix) |
| `#5326` health re-export | present |

## Findings (post path-to-100)

| ID | Class | Severity | Status | Summary |
| --- | --- | --- | --- | --- |
| A1 | prior | Low | **Closed** | blank+static via `hasStaticCredential` |
| A2 | NEW (this session) | Improvement | **Closed** | arrays classified as OAuth → plain-object gate |
| N1/N2 | prior | Hygiene | **Closed** | Details + evidence synced |

## Path to 100 (applied this session)

1. ✅ `isPlainConnectionRecord` — reject `Array.isArray` on all public gates
2. ✅ `asPsdRecord` with `// SAFETY:` after non-array object proof
3. ✅ Pure test: arrays never OAuth / never mark / never heal
4. ✅ Details + compliance checkboxes `[x]`
5. ✅ CHANGELOG Unreleased Security entry for final polish

## Contract Compliance (Exit Conditions)

| Exit / MUST | Status | Live proof |
| --- | --- | --- |
| Shared module `src/shared/utils/connectionAuthMode.ts` | ✅ | Present |
| `normalizeAuthType` + `connectionUsesOAuthRefresh` | ✅ | L39+, L76+ |
| `shouldMarkNoRefreshExpired` | ✅ | L140+ |
| Health uses shared helper + re-export | ✅ | `tokenHealthCheck.ts` L28–40 |
| Pure unit tests pass | ✅ | connection-auth-mode green |
| #5326 regression green | ✅ | 5326 suite green |
| Boolean matrix preserved | ✅ | probes + tests |
| MUST NOT change true OAuth #5326 | ✅ | oauth no-RT still marks |

## Verdict Summary

**PASS — 100/100.** SSoT is structurally proven: dual-mode static credentials cannot enter #5326 expiry; true OAuth without RT still expires; array shells no longer false-positive OAuth. Stay `03-review/`.
