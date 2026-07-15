# Review Report: Task 0034 — Heal False-Positive Apikey `no_refresh_token` — 2026-07-11

## Review Lineage

- **Current task**: Task 0034 (`omniroute-heal-false-positive-no-refresh-token`); live path `docs/tasks/03-review/0034-omniroute-heal-false-positive-no-refresh-token.md`
- **Previous reports read**: none for 0034 (first independent review)
- **Related context**: Epic 0006 S3; depends on Task 0032 (`connectionAuthMode` / `isFalsePositiveNoRefreshToken`); blocks Task 0036 (live deploy/verify)
- **Review mode**: `initial-review`
- **Reviewer profile**: `reviewers` (Code Quality Reviewer / independent task reviewer)
- **Parent agentID**: `reviewers`

## Score And Verdict

- **Score**: `95/100`
- **Verdict**: `PASS WITH NOTES`
- **Lane recommendation**: `hold-in-review` (S ≥ 90 — remain in `docs/tasks/03-review/`; do **not** return to `02-doing/`; do **not** promote to `04-completed/`)

### Rubric snapshot

| Dimension | Score | Notes |
| --- | --- | --- |
| Contract / exit conditions | 97 | Domain heal + boot hook + tests + CHANGELOG + operator SQL; no bare ciphertext SQL |
| Safety (oauth / other codes) | 98 | OAuth #5326 kept; banned/refresh_failed untouched; credential-empty rows not healed |
| Shared helper SSoT (0032) | 98 | Uses `isFalsePositiveNoRefreshToken` (not ad-hoc string matrix) |
| Invocation path | 94 | Idempotent boot hook in `instrumentation-node.ts`; functional idempotency, no persistent marker |
| Tests | 95 | 6/6 integration heal suite; helper matrix in `connection-auth-mode.test.ts` |
| Security / encryption | 98 | Domain get/update + decrypt path; log count only (no secrets) |
| Scope discipline | 97 | Heal-only surface; no unrelated refactors |

## Findings

### Ordered by severity

- **[LOW]** `src/shared/utils/connectionAuthMode.ts:181-185` — JSDoc on `isFalsePositiveNoRefreshToken` contradicts implementation.
  Evidence: comment claims long-lived Windsurf rows are “intentionally excluded from the apikey heal path”, but lines 189–197 **return true** for `isLongLivedImportCredential` + static credential + `no_refresh_token`. Unit test asserts heal for windsurf long-lived.
  Impact: operator/docs confusion only; product behavior (heal product false-positives, keep github-style #5326) is correct and tested.
  Fix: rewrite the Note block to state long-lived imports **are** eligible for heal; legitimate non-import oauth remains excluded.

- **[LOW]** `tests/unit/heal-no-refresh-token.test.ts` — integration suite omits cookie / blank-authType+apiKey / `api_key` alias heal fixtures.
  Evidence: task objective lists `authType∈{apikey,api_key,cookie,none}` and blank+apiKey; suite covers gemini/qoder apikey + oauth keep + unrelated codes + idempotent + mixed. Eligibility for cookie/blank/`api_key` is covered only at pure-helper level in `connection-auth-mode.test.ts`.
  Impact: low — heal function is a thin loop over the shared predicate; residual gap is regression surface if predicate wiring changes.
  Fix: add 1–2 DB-level cases (cookie + no_rt; blank authType + apiKey + no_rt).

- **[INFO]** Boot hook has no persistent “already healed” marker — full connection scan every startup.
  Evidence: `src/instrumentation-node.ts:105-121` always imports and runs `healFalsePositiveNoRefreshConnections()`. Idempotency is functional (second run `healed === 0`, no writes once codes cleared), same pattern as `clearStaleCrashCooldowns`.
  Impact: negligible write spam; extra read cost scales with connection count. Acceptable for contract.
  Fix (optional path-to-100 polish): DB/settings flag after first successful pass, or prefilter SQL candidates by `error_code`/`last_error_type` before full decrypt map (still via domain module).

### No blocking findings

- No CRITICAL / HIGH / MEDIUM defects found against Task 0034 exit conditions.
- OAuth legitimate `no_refresh_token` not wiped (github + antigravity fixtures).
- Unrelated codes (`banned`, `refresh_failed`) not cleared.
- No raw SQL on encrypted `api_key`.

## Contract Compliance (Exit Conditions)

| Exit / MUST | Status | Live proof |
| --- | --- | --- |
| TS domain function `healFalsePositiveNoRefreshConnections` | ✅ | `src/lib/db/healFalsePositiveNoRefresh.ts:39-67` |
| Uses getProviderConnections + updateProviderConnection | ✅ | imports + loop; decrypt via `getProviderConnections` |
| Shared auth-mode helper (0032) | ✅ | `isFalsePositiveNoRefreshToken` from `connectionAuthMode` |
| Invocation: migration **or** idempotent boot hook | ✅ | boot hook `instrumentation-node.ts:105-121` |
| Heal gemini apikey false-positive → active + null errors | ✅ | test + raw SQL NULL verify this review |
| Heal qoder apikey false-positive | ✅ | test |
| MUST NOT heal oauth no_refresh_token (#5326) | ✅ | github + antigravity mixed fixtures |
| MUST NOT clear unrelated error codes | ✅ | banned / refresh_failed fixture |
| Idempotent second run | ✅ | `healed === 0` |
| Operator verification SQL documented | ✅ | task Completion Evidence + test header comment |
| CHANGELOG entry | ✅ | Unreleased Fixed block 0032–0034 |
| Unit tests pass | ✅ | 6/6 heal suite (fresh this review) |
| typecheck:core / lint on touched files | ⚠️ not re-run full suite | heal modules type-clean on spot check; full core not claimed this review |
| Live 21000 heal counts | ⏸ Task 0036 | not in 0034 scope |

## Production Wiring Proof

```
isFalsePositiveNoRefreshToken (connectionAuthMode SSoT)
  → healFalsePositiveNoRefreshConnections (domain)
       getProviderConnections({})  // decrypted credentials
       updateProviderConnection(id, { testStatus: active, clear error fields })
  → instrumentation-node registerNodeInstrumentation (startup, non-fatal try/catch)
       log: [STARTUP] Healed N false-positive no_refresh_token connection(s)
```

### Eligibility matrix (code + tests)

| Connection | `no_refresh_token` | Healed? |
| --- | --- | --- |
| gemini/qoder `authType=apikey` + apiKey | yes | **yes** |
| oauth github/antigravity missing RT | yes | **no** |
| apikey + `banned` / `refresh_failed` | no | **no** |
| apikey + no_rt but no credential material | yes | **no** (`hasStaticCredential`) |
| windsurf long-lived import + accessToken | yes | **yes** (product FP; optional beyond apikey-only metric) |

## Evidence Reviewed

### Commands run (fresh this review)

```bash
node --import tsx/esm --test tests/unit/heal-no-refresh-token.test.ts
# → 6/6 pass

node --import tsx/esm --test tests/unit/connection-auth-mode.test.ts
# → 13/13 pass (includes isFalsePositiveNoRefreshToken matrix)

# Ad-hoc: after heal, SQLite columns are SQL NULL
# test_status=active; last_error/last_error_at/last_error_type/last_error_source/error_code = null
```

### Files inspected

- `src/lib/db/healFalsePositiveNoRefresh.ts`
- `src/shared/utils/connectionAuthMode.ts` (`isFalsePositiveNoRefreshToken`, `hasStaticCredential`, oauth gates)
- `src/instrumentation-node.ts` (startup hook)
- `src/lib/db/providers.ts` (`getProviderConnections` decrypt, `updateProviderConnection` null clear)
- `tests/unit/heal-no-refresh-token.test.ts`
- `tests/unit/connection-auth-mode.test.ts` (relevant cases)
- `CHANGELOG.md` (0032–0034 entry)
- Task file Completion Evidence

## Path to 100

1. **Align JSDoc** on `isFalsePositiveNoRefreshToken` with long-lived heal branch (closes LOW comment drift) — ~+2.
2. **Add 1–2 integration fixtures** for cookie and blank-authType+apiKey heal (closes LOW test gap) — ~+2.
3. **Optional**: candidate prefilter or one-shot marker so boot does not full-scan forever — residual polish only; not required for S≥90.

## Open Questions

- None blocking approval. Live residual oauth windsurf(2)/github(1) counts after deploy belong to Task 0036.

## Verdict Summary

```
Score: 95/100
Verdict: PASS WITH NOTES
Moved: no (stay docs/tasks/03-review/)
Patched: no
Report: docs/reports/reviews/2026-07-11-task-0034-heal-false-positive-no-refresh-token-review.md
```
