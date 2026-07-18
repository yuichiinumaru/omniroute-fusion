# Review Report: Task 0049 — Privileged API Handler Auth — 2026-07-16 (adversarial re-audit)

## Review Lineage

- **Current task**: Task 0049 (`omniroute-api-privileged-handler-auth`); live path `docs/tasks/03-review/0049-omniroute-api-privileged-handler-auth.md`
- **Previous reports read**:
  - `docs/reports/reviews/2026-07-11-task-0049-api-privileged-handler-auth-review.md` — 94/100 PASS WITH NOTES
- **Related reports considered**:
  - `docs/reports/07-app-api.md` (F-07-006 / F-07-007 / F-07-W2-004 / F-07-W2-005; stretch F-07-W2-006)
- **Review mode**: `re-review` (adversarial; agentID=`reviewers`)
- **Reviewer profile**: `reviewers` (security + code-quality + tsjs harness; independent re-auditor)

## Score And Verdict

- **Score**: `92/100`
- **Verdict**: `HELD_IN_REVIEW_PATH_TO_100`
- **Lane recommendation**: `hold-in-review` (S ≥ 90 — remain in `docs/tasks/03-review/`; do **not** return to `02-doing/`)

### Rubric snapshot

| Dimension | Score | Notes |
| --- | --- | --- |
| Primary four P1 dual-gate | 97 | still solid: handler `{ always: true }` + ALWAYS_PROTECTED + public-cloud narrow |
| Secret redaction | 98 | tokenHash stripped; keys no bulk rawKey + LOCAL_ONLY |
| Connection binding | 94 | multi-conn refuse still code-only (N1 PERSISTENT) |
| Adjacent dual-auth residual | 88 | NEW: `/api/translator/history` has zero handler auth; open-install returns 200 |
| Stretch sessions claim | 86 | N3 PERSISTENT + live probe: without `always` open-install bypasses; comment is false |
| Fresh tests | 96 | 104/104 pass (same suite) |

## Delta Summary

### Resolved Since Previous Review

- `RESOLVED` (reconfirmed): F-07-006 cloud credentials — not PUBLIC; `requireManagementAuth({ always: true })`; connectionId multi-conn refuse.
- `RESOLVED` (reconfirmed): F-07-007 relay tokens — always auth on GET/POST/`[id]`; `toPublicRelayToken` omits `tokenHash`.
- `RESOLVED` (reconfirmed): F-07-W2-004 translator/**send** — always management auth.
- `RESOLVED` (reconfirmed): F-07-W2-005 cli-tools/keys — LOCAL_ONLY + always auth + no bulk rawKey.
- `RESOLVED` (reconfirmed): pipeline `ALWAYS_PROTECTED_API_PATHS` includes all four primary surfaces; management policy skips `requireLogin=false` bypass for them.

### Persistent Findings

- `PERSISTENT` N1 (Low): multi-connection `connectionId` refuse path untested at route level.
- `PERSISTENT` N2 (Low): no explicit unit matrix mocking `requireLogin=false` for privileged handlers (handler `{ always: true }` still 401 unauth — live re-probe).
- `PERSISTENT` N3 (Low → elevated Info/Low): `/api/sessions` lacks `{ always: true }` / ALWAYS_PROTECTED; **route comment falsely claims** auth-disabled installs cannot see the session map.

### Regressions

- none on primary four claimed contracts (tests green; code still dual-gated).

### New Findings

- `NEW` R1 (Medium residual / dual-auth): `GET /api/translator/history` has **no** `requireManagementAuth` (or any auth). Live probe: unauthenticated request → **200** with `{ success, events, total }`. Events carry routing recon (`provider`, `model`, `connectionId`, `comboName`, `endpoint`) from `logTranslationEvent` (chat + translator/send). Not in primary four; same open-install class as original findings. Pipeline only protects when `requireLogin=true` (MANAGEMENT class).
- `NEW` R2 (Info / evidence): live probe of `requireManagementAuth` without `{ always: true }` on open-install-shaped path returns `null` (bypass) — hard counterexample to the sessions route comment.

### Evidence Gaps / External Blockers

- `EVIDENCE_GAP`: full Next.js authz pipeline end-to-end with `requireLogin=false` not re-run; handler + routeGuard membership + managementPolicy source review is the dual-gate proof used.
- `EXTERNAL_BLOCKER`: none

## Findings

| ID | Class | Severity | Status | Summary | First seen | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| N1 | PERSISTENT | Low | Open | No route test multi-conn connectionId binding | 2026-07-11 | `credentials/update/route.ts:67-75`; tests schema/unauth only |
| N2 | PERSISTENT | Low | Open | No explicit requireLogin=false handler matrix | 2026-07-11 | tests omit settings mock; always:true unauth 401 reconfirmed live |
| N3 | PERSISTENT | Low | Open | sessions not always-auth; comment claims open-install protection | 2026-07-11 | `sessions/route.ts:12-17`; probe: no-always → null under auth-disabled |
| R1 | NEW | Medium residual | Open | translator/history unauthenticated handler | this re-audit | `translator/history/route.ts:10-44`; live unauth GET → 200 |
| R2 | NEW | Info | Open | sessions comment is false (see N3) | this re-audit | probe + comment lines 12-13 |
| G1–G5 | — | Guard | Pass | Primary four still hold | prior + this | code + 104/104 tests |

## Contract Compliance (adversarial)

| MUST / exit | Status | Live proof |
| --- | --- | --- |
| Cloud update rejects unscoped API keys | ✅ | 0049 test + `requireManagementAuth` manage-scope 403 |
| Cloud not PUBLIC | ✅ | `publicApiRoutes` segment-safe; classify tests |
| Relay unauth → 401 always | ✅ | always:true + ALWAYS_PROTECTED + tests |
| Relay omit tokenHash | ✅ | `toPublicRelayToken`; list/create/detail tests |
| translator/send unauth → 401 | ✅ | always:true + test |
| cli-tools/keys no bulk rawKey + LOCAL_ONLY | ✅ | handler + routeGuard membership + test |
| Counterexample: dual-auth still open on adjacent surfaces | ⚠️ residual | R1 history; N3 sessions open-install |

## Fresh Verification

```text
node --import tsx/esm --test \
  tests/unit/privileged-handler-auth-0049.test.ts \
  tests/unit/cli-tools-keys-route.test.ts \
  tests/unit/public-api-routes.test.ts \
  tests/unit/authz/routeGuard.test.ts \
  tests/unit/authz/classify.test.ts
→ tests 104 · pass 104 · fail 0

Live probe (this session):
  requireManagementAuth(..., { always: true }) unauth → 401
  requireManagementAuth(...) default unauth → null (open-install bypass)
  GET translator/history unauth → 200 { success, events, total }
```

## Path To 100

1. **R1**: Add `requireManagementAuth(request, { always: true })` to `/api/translator/history` (+ ALWAYS_PROTECTED if product wants open-install deny); unit test unauth → 401.
2. **N3**: Either add `{ always: true }` + ALWAYS_PROTECTED for sessions, or fix the comment to state open-install still exposes the map when login is disabled.
3. **N1**: Route tests for multi-conn without connectionId → 400; wrong id → 404; valid id → success.
4. **N2**: Explicit `requireLogin=false` matrix on primary four handlers.

## Task Ledger Patch Suggestion

See task file Review Ledger update (this re-audit).

## Lane Action

- **Moved**: no — stays `docs/tasks/03-review/0049-omniroute-api-privileged-handler-auth.md`
- **Patched**: no production code (review-only)
- **Score**: 92 (prior 94; −2 for R1 residual dual-auth on translator/history)
