# Review Report: Task 0033 — Token Health Dual-Mode Matrix — 2026-07-11

## Review Lineage

- **Current task**: Task 0033 (`omniroute-token-health-dual-mode-matrix`); live path `docs/tasks/03-review/0033-omniroute-token-health-dual-mode-matrix.md`
- **Previous reports read**: none for 0033
- **Related context**:
  - Epic 0006 dual-mode inventory (`docs/tasks/00-planning/0006-omniroute-dual-mode-auth-refresh-correctness-epic.md`)
  - Shared gate from Task 0032: `src/shared/utils/connectionAuthMode.ts`
  - Sibling suites: `#5326` health suite, `connection-auth-mode.test.ts`
- **Review mode**: `initial`
- **Reviewer profile**: `reviewers` (Code Quality Reviewer / independent task reviewer)
- **Parent agentID**: `reviewers`

## Score And Verdict

- **Score**: `94/100`
- **Verdict**: `PASS WITH NOTES` / `APROVADO` (path-to-100 documented)
- **Lane recommendation**: `hold-in-review` (S ≥ 90 — remain in `docs/tasks/03-review/`; do **not** return to `02-doing/`; do **not** promote to `04-completed/`)
- **Score routing applied**: S ≥ 90 → approve with path-to-100; stay in review

### Rubric snapshot

| Dimension | Score | Notes |
| --- | --- | --- |
| Contract / exit conditions | 97 | All MUST matrix cells + #5326 + filter + shared helper + CHANGELOG |
| Connection-level gate (not provider-id only) | 98 | `shouldMarkNoRefreshExpired` → `connectionUsesOAuthRefresh` + `supportsTokenRefresh` |
| Dual-mode matrix coverage | 95 | gemini/qoder/codebuddy-cn apikey + cookie + blank+apiKey + oauth positive |
| Regression sensitivity | 90 | Full `checkConnection` path; dual-mode cells could pin `supportsTokenRefresh===true` |
| Test isolation / safety | 96 | temp DATA_DIR, `resetDbInstance`, `test.after`, no network |
| Scope discipline | 98 | Tests + gate reuse; no heal (0034); Windsurf policy owned by 0035 |
| Evidence freshness | 96 | Fresh re-run this review: 27/27 pass; typecheck:core clean |

## Delta Summary

### Resolved Since Previous Review

- N/A (initial review)

### Persistent Findings

- none

### Regressions

- none

### New Findings

- `NEW` F1 (Low): Matrix negative cells do not assert `supportsTokenRefresh(provider) === true` for gemini/qoder/codebuddy-cn, so a future removal of those ids from the refresh set would still leave tests green (weaker dual-mode regression).
- `NEW` F2 (Info): Blank-authType fixture does not assert reloaded `authType` is blank/null after the force-update (only asserts apiKey remains).
- `NEW` F3 (Info): Cookie cell uses `chatgpt-web` (`supportsTokenRefresh` false). Gate is still exercised via `authType: "cookie"`; a refresh-capable provider + cookie would be a stronger counterfactual (product may never store that shape).
- `NEW` F4 (Info): Details subtask checkboxes in the task file remain unchecked while Exit Conditions are marked complete — docs hygiene only.

### Evidence Gaps / External Blockers

- `EVIDENCE_GAP`: Live deploy on `:21000` still lacks the connection gate (documented Epic/Task 0036). Not a Task 0033 code failure — unit matrix is the permanent regression guard for source.
- `EXTERNAL_BLOCKER`: none

## Findings

| ID | Class | Severity | Status | Summary | First seen | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| F1 | NEW | Low | Open (path-to-100) | Dual-mode matrix does not pin `supportsTokenRefresh(true)` | 2026-07-11 | `token-health-dual-mode-matrix.test.ts` gemini/qoder/codebuddy-cn cells |
| F2 | NEW | Info | Open (path-to-100) | Blank fixture weak authType assert | 2026-07-11 | same file L122–146 |
| F3 | NEW | Info | Accepted residual | Cookie on non-refresh provider | 2026-07-11 | chatgpt-web cookie cell |
| F4 | NEW | Info | Accepted residual | Details checklist hygiene | 2026-07-11 | task Details `[ ]` vs Exit `[x]` |
| G1 | — | Guard | Pass | Gate is connection-scoped, not provider-id only | this report | `tokenHealthCheck.ts:371–374` + `connectionAuthMode.ts:138–153` |
| G2 | — | Guard | Pass | Sweep SQL oauth filter still present | this report | `tokenHealthCheck.ts:312` + `providers.ts:158–164` + filter unit test |
| G3 | — | Guard | Pass | #5326 oauth no-RT still expires | this report | matrix + 5326 suite |

### Contract / exit-condition audit

| Exit / MUST | Status | Live proof |
| --- | --- | --- |
| qoder apikey + no RT stays active, not `no_refresh_token` | ✅ | matrix test L80–92; PASS |
| codebuddy-cn apikey dual-mode + no RT not force-expired | ✅ | matrix L94–107; FREE_APIKEY includes codebuddy-cn; PASS |
| cookie + blank/null authType+apiKey no OAuth expiry | ✅ | matrix L109–146; PASS |
| oauth + refresh-capable + no RT → expired + `no_refresh_token` (#5326) | ✅ | matrix L150–170 + 5326 suite; PASS |
| gemini apikey regression green | ✅ | matrix L66–78 + 5326 L119–138; PASS |
| authType SQL filter test green | ✅ | 5326 L186–222; PASS |
| Shared helper from 0032 (no re-duplicated authType lists in health) | ✅ | `tokenHealthCheck` imports/re-exports `connectionAuthMode` |
| Health branch gates with `connectionUsesOAuthRefresh` / `shouldMarkNoRefreshExpired` **and** `supportsTokenRefresh` | ✅ | `shouldMarkNoRefreshExpired(conn, supportsTokenRefresh(conn.provider))` at L371–374 |
| Dual-mode matrix suite file | ✅ | `tests/unit/token-health-dual-mode-matrix.test.ts` (7 tests) |
| Epic dual-mode apikey ids each have ≥1 negative test | ✅ | gemini, qoder, codebuddy-cn |
| Named unit suites pass | ✅ | Fresh: matrix + 5326 + connection-auth-mode = **27 pass / 0 fail** |
| `npm run typecheck:core` | ✅ | Fresh: exit 0 |
| lint no new errors on touched files | ✅ | eslint: 0 errors (pre-existing `any` warnings only in 5326 suite) |
| CHANGELOG at top (dual-mode matrix) | ✅ | Unreleased Fixed 0032–0034 block mentions 0033 matrix |
| No heal of production rows / no real network | ✅ | unit fixtures only |

## Production wiring proof

```
checkConnection(conn)
  → reload by id
  → if !refreshToken:
       refreshCapableNeedsReauth = shouldMarkNoRefreshExpired(
         conn,
         supportsTokenRefresh(conn.provider)   // necessary, not sufficient
       )
         → connectionUsesOAuthRefresh(conn)   // authType apikey|cookie|none|blank+apiKey → false
         → isLongLivedImportCredential(conn)  // windsurf/devin-cli import skip (0035)
         → no RT + testStatus active|empty
       → if true: write expired + no_refresh_token
       → return

sweep()
  → getProviderConnections({ authType: "oauth" })  // SQL defense-in-depth
  → checkConnection each
```

### Pure-gate probe (reviewer, this session)

| Shape | supportsRefresh | usesOAuthRefresh | shouldMark |
| --- | --- | --- | --- |
| gemini apikey | true | false | **false** |
| qoder apikey | true | false | **false** |
| codebuddy-cn apikey | true | false | **false** |
| cookie (chatgpt-web) | false | false | **false** |
| gemini blank+apiKey | true | false | **false** |
| antigravity oauth no RT | true | true | **true** |

Confirms: dual-mode static credentials stay off the #5326 path **even when** the provider id is refresh-capable.

## Evidence Reviewed

### Commands run (fresh this review)

```bash
node --import tsx/esm --test \
  tests/unit/token-health-dual-mode-matrix.test.ts \
  tests/unit/token-health-no-refresh-token-expired-5326.test.ts \
  tests/unit/connection-auth-mode.test.ts
# → 27 pass / 0 fail

npm run typecheck:core
# → exit 0

npx eslint tests/unit/token-health-dual-mode-matrix.test.ts \
  tests/unit/token-health-no-refresh-token-expired-5326.test.ts \
  tests/unit/connection-auth-mode.test.ts \
  src/lib/tokenHealthCheck.ts \
  src/shared/utils/connectionAuthMode.ts
# → 0 errors (8 pre-existing any warnings in 5326 suite only)
```

### Files inspected

- `src/lib/tokenHealthCheck.ts` (sweep L312; `checkConnection` no-RT branch L357–390; re-exports)
- `src/shared/utils/connectionAuthMode.ts` (full gate SSoT)
- `src/lib/db/providers.ts` (authType filter L158–164; create default oauth foot-gun comment)
- `open-sse/services/tokenRefresh.ts` `supportsTokenRefresh` set (includes gemini/qoder/codebuddy-cn)
- `src/shared/constants/providers.ts` `FREE_APIKEY_PROVIDER_IDS` (codebuddy-cn)
- `tests/unit/token-health-dual-mode-matrix.test.ts`
- `tests/unit/token-health-no-refresh-token-expired-5326.test.ts`
- `tests/unit/connection-auth-mode.test.ts`
- `CHANGELOG.md` Unreleased Fixed dual-mode block
- Task + Epic 0006 inventory tables

## Path to 100

1. **(F1, +3)** In dual-mode matrix negative cells for `gemini` / `qoder` / `codebuddy-cn`, assert `supportsTokenRefresh(provider) === true` (import from open-sse) so the test fails if the dual-mode id is dropped from the refresh set and the “stays active” result becomes a false green for the wrong reason.
2. **(F2, +1)** After blank-authType fixture update, assert reloaded `authType` is `null` or `""` (not silently still `apikey`).
3. **(F3 optional, +1)** Cookie counterfactual on a refresh-capable provider id *if* product allows that shape; else document product invariant and leave residual accepted.
4. **(F4, +1)** Tick Details subtasks / sync completion checklist with Exit Conditions.

No production code change required for Task 0033 contract — residual is test strength / docs hygiene only.

## Verdict Summary

```markdown
## Findings
- [LOW] `tests/unit/token-health-dual-mode-matrix.test.ts` - Dual-mode cells omit supportsTokenRefresh(true) pin.
  Evidence: negative tests only assert stays active / not no_refresh_token.
  Impact: weaker regression if dual-mode ids leave the refresh set.
  Fix: assert supportsTokenRefresh(provider) === true in those three cells.

- [LOW/INFO] blank + cookie fixtures - minor assertion/product-shape strength.
  Evidence: blank does not assert authType emptied; cookie uses non-refresh provider.
  Impact: low; gate still connection-scoped and covered by pure helper tests.
  Fix: see path-to-100 F2/F3.

## Open Questions
- none blocking

## Verdict
PASS WITH NOTES (score 94) — hold in 03-review; path-to-100 above; not moved to 02-doing or 04-completed
```
