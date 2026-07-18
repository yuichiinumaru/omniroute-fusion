# Review Report: Task 0032 — Connection Auth-Mode Helper — 2026-07-16 (reaudit)

## Review Lineage

- **Current task**: Task 0032 (`omniroute-connection-auth-mode-helper`); live path `docs/tasks/03-review/0032-omniroute-connection-auth-mode-helper.md`
- **Previous reports read**:
  - `docs/reports/reviews/2026-07-11-task-0032-connection-auth-mode-helper-review.md` — 96/100, PASS WITH NOTES
- **Related reports considered**:
  - `docs/reports/reviews/2026-07-11-task-0033-token-health-dual-mode-matrix-review.md` — consumers of SSoT gate
  - `docs/reports/reviews/2026-07-11-task-0034-heal-false-positive-no-refresh-token-review.md` — `isFalsePositiveNoRefreshToken`
  - `docs/reports/reviews/2026-07-11-task-0035-dual-mode-refresh-policy-audit-review.md` — long-lived Windsurf extension
- **Review mode**: `re-review` (adversarial independent re-audit)
- **Reviewer profile**: `reviewers` (agentID=reviewers)
- **Parent agentID**: `reviewers`

## Score And Verdict

- **Score**: `93/100`
- **Verdict**: `HELD_IN_REVIEW_PATH_TO_100`
- **Lane recommendation**: `hold-in-review` (S ≥ 90 — remain in `docs/tasks/03-review/`; do **not** return to `02-doing/`; do **not** promote to `04-completed/`)

### Rubric snapshot

| Dimension | Score | Notes |
| --- | --- | --- |
| Contract / exit conditions | 98 | Module path, exports, re-export, tests met |
| Dual-mode / #5326 correctness | 95 | apikey/aliases/cookie/none safe; oauth #5326 true; blank+apiKey safe |
| Classification completeness | 88 | blank/`unknown` only inspects `apiKey` — cookie PSD alone still OAuth-classified |
| SSoT / condensation | 98 | Single `connectionUsesOAuthRefresh` definition; health re-exports |
| Tests | 96 | Pure matrix 13/13 PASS fresh |
| Hygiene | 90 | Prior N1/N2 doc drift still present |

## Delta Summary

### Resolved Since Previous Review

- none required for 0032 core contract (still green)

### Persistent Findings

- `PERSISTENT` N1 (Low / hygiene): Details subtasks still `[ ]` vs Exit `[x]`
- `PERSISTENT` N2 (Info): Completion evidence test counts still stale relative to live suite size

### Regressions

- none

### New Findings

- `NEW` A1 (Low): `connectionUsesOAuthRefresh` for `unknown` blank authType treats **only** non-empty `apiKey` as static; cookie material / other static PSD without `apiKey` still returns **true** (OAuth). Adversarial probe: `{ authType: null, providerSpecificData: { cookie: "sess" } }` → `connectionUsesOAuthRefresh === true` and `shouldMarkNoRefreshExpired(..., true) === true`. Production sweep loads `authType: "oauth"` only, so this is **export/`checkConnection` residual**, not live 21000 sweep FP class — but the pure SSoT is incomplete vs its JSDoc claim that “cookies … must NEVER enter” the #5326 path (cookie **authType** is safe; blank+cookie PSD is not).

### Evidence Gaps / External Blockers

- `EVIDENCE_GAP`: Live 21000 deploy still Task 0036 — not 0032 scope
- `EXTERNAL_BLOCKER`: none

## Findings

| ID | Class | Severity | Status | Summary | First seen | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| A1 | NEW | Low | Open | blank authType + cookie PSD classified as OAuth-refreshable | 2026-07-16 reaudit | `connectionAuthMode.ts:82-86`; probe true |
| N1 | PERSISTENT | Low | Open | Details checklist hygiene | 2026-07-11 | task Details `[ ]` |
| N2 | PERSISTENT | Info | Open | Stale completion evidence counts | 2026-07-11 | task Completion Evidence |
| G1 | Guard | — | Pass | Single definition of `connectionUsesOAuthRefresh` | reaudit | `rg function connectionUsesOAuthRefresh` → only shared module |
| G2 | Guard | — | Pass | #5326 oauth still marks | reaudit | pure + #5326 suite PASS |
| G3 | Guard | — | Pass | apikey / api_key / api-key never OAuth | reaudit | pure matrix + probe |
| G4 | Guard | — | Pass | Re-export from tokenHealthCheck | reaudit | `tokenHealthCheck.ts:36-40` |

## Contract Compliance (Exit Conditions)

| Exit / MUST | Status | Live proof |
| --- | --- | --- |
| Shared module `src/shared/utils/connectionAuthMode.ts` | ✅ | Present |
| `normalizeAuthType` + `connectionUsesOAuthRefresh` | ✅ | L39, L74 |
| Optional `shouldMarkNoRefreshExpired` | ✅ | L138–153; health L371–374 |
| Health uses shared helper (no local branch) | ✅ | import + re-export only |
| Pure unit tests pass | ✅ | 13/13 fresh |
| #5326 regression green | ✅ | 7/7 in combined epic suite |
| Boolean matrix preserved | ✅ | see probes + tests |
| MUST NOT change true OAuth #5326 | ✅ | oauth no-RT + supportsRefresh → mark |

## Evidence Reviewed

- Source: `src/shared/utils/connectionAuthMode.ts`, `src/lib/tokenHealthCheck.ts` (#5326 branch)
- Tests: `tests/unit/connection-auth-mode.test.ts`, sibling #5326 suite
- Commands run:
  ```bash
  node --import tsx/esm --test tests/unit/connection-auth-mode.test.ts \
    tests/unit/token-health-no-refresh-token-expired-5326.test.ts \
    # … full epic suite 39/39 PASS
  node --import tsx/esm -e '/* adversarial pure-gate probes */'
  ```
- Commands not run: full `npm run typecheck:core` (not required to re-score pure helper; prior 0035 re-ran clean)

## Path To 100

1. **A1**: For `normalized === "unknown"`, also treat as non-OAuth when `hasStaticCredential(conn)` is true (cookie PSD / accessToken-only static shapes), **or** document that blank classification only keys off `apiKey` and add an explicit pure-test of blank+cookie → expected product choice.
2. **N1/N2**: Sync Details checkboxes + Completion Evidence test counts.
3. Optional: assert `normalizeAuthType("bearer")` / unknown-token modes in matrix if product stores them.

## Verdict Summary

**HELD IN REVIEW — 93/100.** SSoT extraction is structurally sound; apikey dual-mode and true OAuth #5326 are correctly separated. Adversarial residual: blank/`unknown` authType classification is apiKey-only. Stay `03-review/`.
