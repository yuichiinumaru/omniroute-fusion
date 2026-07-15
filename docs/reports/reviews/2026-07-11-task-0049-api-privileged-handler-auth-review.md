# Review Report: Task 0049 — Privileged API Handler Auth — 2026-07-11

## Review Lineage

- **Current task**: Task 0049 (`omniroute-api-privileged-handler-auth`); live path `docs/tasks/03-review/0049-omniroute-api-privileged-handler-auth.md`
- **Previous reports read**: none under `docs/reports/reviews/` for 0049
- **Related reports considered**: `docs/reports/07-app-api.md` (F-07-006 / F-07-007 / F-07-W2-004 / F-07-W2-005; stretch F-07-W2-006); sibling epic review format `2026-07-11-task-0032-connection-auth-mode-helper-review.md`
- **Review mode**: `initial`
- **Reviewer profile**: `reviewers` (Code Quality Reviewer / independent task reviewer)
- **Parent agentID**: `reviewers`

## Score And Verdict

- **Score**: `94/100`
- **Verdict**: `PASS WITH NOTES` / `HELD_IN_REVIEW_PATH_TO_100`
- **Lane recommendation**: `hold-in-review` (S ≥ 90 — remain in `docs/tasks/03-review/`; do **not** return to `02-doing/`; do **not** promote to `04-completed/`)

### Rubric snapshot

| Dimension | Score | Notes |
| --- | --- | --- |
| Contract / exit conditions | 98 | Primary four P1s + public cloud narrow + docs/CHANGELOG + typecheck/lint |
| Dual-gate auth (`always` + ALWAYS_PROTECTED) | 97 | Handler `{ always: true }` + pipeline skip of `requireLogin=false` |
| Secret redaction (tokenHash / rawKey) | 98 | Relay public shape; keys hash-only inventory; LOCAL_ONLY keys |
| Connection binding (F-07-006) | 94 | Code refuses multi-conn without `connectionId`; schema tested; route behavior untested |
| Tests | 92 | Fresh 104/104 on claimed suite; gaps: multi-conn route test; explicit open-install matrix |
| Stretch / residual discipline | 95 | Sessions auth without `always`; deferred F-07-011–015 / W2-007–010 listed |
| Hygiene / evidence | 90 | Evidence said 103 tests; live combined run 104 |

## Delta Summary

### Resolved Since Previous Review

- N/A — initial independent review.

### Persistent Findings

- none

### Regressions

- none on Task 0049 surfaces (fresh unit + typecheck:core + eslint on touched sources)

### New Findings

- `NEW` N1 (Low / test gap): multi-connection `connectionId` refuse path is implemented but not covered by a route unit test (schema-only).
- `NEW` N2 (Low / test gap): open-install (`requireLogin=false`) dual-gate not explicitly asserted; unauth 401 with `{ always: true }` still proves handler always-auth.
- `NEW` N3 (Info / stretch residual): `/api/sessions` uses `requireManagementAuth` **without** `{ always: true }` — still open when login disabled; acceptable per demoted F-07-W2-006 stretch.
- `NOTE` N4 (Info / hygiene): completion evidence “103 pass” vs live **104** on the same command set.
- `NOTE` N5 (Info / dead branch): `cli-tools/keys` fallback to `key.key` is inert after `stripStoredApiKeyMaterial` (hash-only) nulls `key`; mask path uses `keyPrefix`.

### Evidence Gaps / External Blockers

- `EVIDENCE_GAP`: none for primary four P1 contracts (fresh suite + typecheck:core + eslint).
- `EXTERNAL_BLOCKER`: none.
- Residual deferred (as planned): F-07-011–015, F-07-W2-007–010.

## Findings

| ID | Class | Severity | Status | Summary | First seen | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| N1 | NEW | Low | Open (path-to-100) | No route test for multi-conn `connectionId` binding | this report | `credentials/update/route.ts:67-75`; tests only schema + unauth/unscoped |
| N2 | NEW | Low | Open (path-to-100) | No explicit `requireLogin=false` handler matrix | this report | `requireManagementAuth` always branch; tests omit settings mock |
| N3 | NEW | Info | Accepted residual | sessions not ALWAYS_PROTECTED / not `always: true` | this report | `sessions/route.ts:16-17`; task demoted F-07-W2-006 to stretch |
| N4 | NEW | Info | Open (path-to-100) | Stale test count in completion evidence | this report | evidence 103; live 104 |
| N5 | NEW | Info | Accepted residual | dead `key.key` fallback in keys route | this report | `cli-tools/keys/route.ts:27-32` + `stripStoredApiKeyMaterial` |
| G1 | — | Guard | Pass | Cloud credentials not PUBLIC | this report | `publicApiRoutes` + classify MANAGEMENT |
| G2 | — | Guard | Pass | Unscoped inference key cannot overwrite OAuth | this report | 403 manage-scope test |
| G3 | — | Guard | Pass | Relay never leaks `tokenHash` | this report | list/create/detail redaction test |
| G4 | — | Guard | Pass | translator/send always auth | this report | unauth → 401 |
| G5 | — | Guard | Pass | cli-tools/keys no bulk rawKey + LOCAL_ONLY | this report | handler + routeGuard membership |

## Contract Compliance (Exit Conditions)

| Exit / MUST | Status | Live proof |
| --- | --- | --- |
| F-07-006 cloud credentials manage auth + binding | ✅ | `requireManagementAuth({ always: true })`; optional `connectionId`; multi-conn 400 without id |
| Cloud credential route not PUBLIC | ✅ | `isPublicApiRoute` false; `classifyRoute` MANAGEMENT; public prefixes only `auth\|model\|models` (segment-safe) |
| F-07-007 relay tokens always management auth | ✅ | GET/POST/`[id]` all `always: true`; ALWAYS_PROTECTED |
| Relay omits `tokenHash`; raw once on create | ✅ | `toPublicRelayToken`; create returns `rawToken` only |
| F-07-W2-004 translator/send management auth | ✅ | POST `always: true`; ALWAYS_PROTECTED |
| F-07-W2-005 keys no full remote dump | ✅ | LOCAL_ONLY + ALWAYS_PROTECTED + no `rawKey`; mask from prefix |
| Primary four P1s with tests | ✅ | `privileged-handler-auth-0049` + related suites |
| Stretch deferred residual list | ✅ | sessions partial; F-07-011–015 / W2-007–010 listed |
| `npm run typecheck:core` | ✅ | exit 0 (fresh this review) |
| lint — no new errors | ✅ | eslint on touched sources exit 0 |
| CHANGELOG security entry | ✅ | Unreleased Security — Task 0049 |
| publicApiRoutes / AUTHZ docs | ✅ | AUTHZ_GUIDE + ROUTE_GUARD_TIERS updated |

### Test Requirements (MUST)

| MUST | Status | Live proof |
| --- | --- | --- |
| cloud update rejects unscoped API keys | ✅ | 403 + `/manage/i` message |
| relay GET/POST unauth → 401 (always) | ✅ | both 401 |
| relay omit `tokenHash` | ✅ | list/create/detail |
| translator/send unauth → 401 | ✅ | 401 |
| cli-tools/keys no full key material bulk | ✅ | no `rawKey`; mask ≠ create secret |

## Code Review Notes (security surfaces)

### Dual gate (pipeline + handler)

- Pipeline: `managementPolicy` skips anonymous `requireLogin=false` when `isAlwaysProtectedPath` (`management.ts:229-235`).
- Handler: primary four use `requireManagementAuth(request, { always: true })`.
- Membership: `/api/relay/tokens`, `/api/translator/send`, `/api/cloud/credentials`, `/api/cli-tools/keys` in `ALWAYS_PROTECTED_API_PATHS`; keys also in `LOCAL_ONLY_API_PREFIXES`.

### F-07-006 connection binding

- Active connections filtered; explicit `connectionId` preferred; 0 → 404; \>1 without id → 400; single connection allowed without id.
- Prevents first-match overwrite across multi-account providers.

### Redaction

- Relay: `toPublicRelayToken` drops `tokenHash`; create returns `id/name/rawToken/tokenPrefix` only.
- Keys: `getApiKeys` → `stripStoredApiKeyMaterial` nulls stored `key`; response maps mask from `keyPrefix`.

## Fresh Verification

```text
node --import tsx/esm --test \
  tests/unit/privileged-handler-auth-0049.test.ts \
  tests/unit/cli-tools-keys-route.test.ts \
  tests/unit/public-api-routes.test.ts \
  tests/unit/authz/routeGuard.test.ts \
  tests/unit/authz/classify.test.ts
→ tests 104 · pass 104 · fail 0

npm run typecheck:core → exit 0
eslint (touched 0049 sources + privileged test) → exit 0
```

## Path-to-100 (optional polish; not blocking)

1. Add route unit tests: multi-active connections without `connectionId` → 400; with wrong id → 404; with valid id → success (mocked DB).
2. Explicit open-install test: mock `requireLogin=false` and assert privileged handlers still 401 without principal.
3. Align completion evidence test count (104).
4. (Optional stretch hardening) sessions + `{ always: true }` / ALWAYS_PROTECTED if product wants open-install session-map denial.

## Verdict Summary

Primary four P1 findings are closed with dual-gate auth, classification narrowing, redaction, docs, CHANGELOG, and green tests. Residual notes are test depth and intentional stretch scope — not functional reopeners.

**Score: 94 · Verdict: PASS WITH NOTES · Lane: stay `03-review/`**
