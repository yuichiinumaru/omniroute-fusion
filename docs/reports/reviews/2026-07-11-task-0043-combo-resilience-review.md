# Review Report: Task 0043 — Combo / Auto-Combo Resilience Wiring — 2026-07-11

## Review Lineage

- **Current task**: Task 0043 (`omniroute-combo-resilience-wiring`); live path was `docs/tasks/03-review/0043-omniroute-combo-resilience-wiring.md` (moved to `02-doing/` this review)
- **Epic**: 0008 S4 — Adversarial Remediation (combo resilience + chat soft-failure F-04-001)
- **Previous reports read**: task Completion Evidence; source findings F-03-001…004, F-03-W2-001/002, F-04-001; `docs/architecture/RESILIENCE_GUIDE.md`
- **Review mode**: `independent-first-review`
- **Reviewer profile**: `reviewers` (Code Quality Reviewer)
- **Parent agentID**: `reviewers`

## Score And Verdict

- **Score**: `84/100`
- **Verdict**: `NEEDS FIX`
- **Lane recommendation**: `return-to-doing` (S < 90 — move to `docs/tasks/02-doing/`; do **not** promote to `04-completed/`)

### Rubric snapshot

| Dimension | Score | Notes |
| --- | --- | --- |
| Contract / exit conditions | 86 | Seven primary findings largely implemented; F-03-002 incomplete due to key bug |
| Correctness (breaker/RR/HALF_OPEN) | 80 | Soft-fail + RR + auto-pool solid; runtime-unit connection pre-skip broken |
| Auto-combo empty-pool / incident | 94 | Fail-closed + live CB re-eval + incident mode wired and tested |
| Tests / evidence freshness | 72 | 13/13 + vitest 56 pass fresh; MUST gaps (phantom chatFn test, no F-03-002, no RR spy) |
| Docs / CHANGELOG | 95 | RESILIENCE_GUIDE + CHANGELOG Unreleased Fixed accurate |
| Scope discipline | 96 | Fusion deferred; stretch partially done; no overclaim on F-03-006 |

## Findings

### F1 — [HIGH] Runtime-unit exhausted-connection pre-skip uses wrong set key (F-03-002 incomplete)

- **Path**: `open-sse/services/combo/runtimeUnits.ts:123`
- **Evidence**: New helper checks bare connection id:
  ```ts
  if (unit.connectionId && exhaustedConnections.has(unit.connectionId)) {
  ```
  Writers use provider-scoped keys:
  - `targetExhaustion.ts:129` → `sets.exhaustedConnections.add(\`${provider}:${connId}\`)`
  - Priority/RR skip predicate `comboPredicates.ts:83` → `exhaustedConnections.has(\`${provider}:${connectionId}\`)`
- **Impact**: After a connection-level 5xx on nested model unit A, later model units sharing the same connection are **not** pre-skipped in `executeRuntimeUnitCombo`. Same-request cascade wastes retries and breaks “parity with priority path” claimed for F-03-002. Provider-level and circuit/model-lock pre-skips still work.
- **Fix**: Use the shared key format (or call `getExhaustedTargetSkipReason`):
  ```ts
  if (
    provider &&
    unit.connectionId &&
    exhaustedConnections.has(`${provider}:${unit.connectionId}`)
  ) {
  ```
  Add a unit test that marks `exhaustedConnections` with `provider:conn`, runs skip helper / runtime path, asserts skip.

### F2 — [MEDIUM] MUST test for soft-failure via chatFn is simulated, not exercised

- **Path**: `tests/unit/combo-resilience-wiring-0043.test.ts:92-114`
- **Evidence**: Test title claims `executeChatWithBreaker does not close HALF_OPEN on soft 502`, but body only mirrors `tryReserve` + manual classification. It never imports or calls `executeChatWithBreaker` / `handleSingleModelChat`.
- **Impact**: A regression that re-wraps soft results in `breaker.execute()` (or drops HALF_OPEN `_onFailure` in `chat.ts`) can pass this suite. Task MUST: soft-failure `{ success:false, status:502 }` from chatFn must not close HALF_OPEN.
- **Fix**: Drive the real chat helper (or a thin export of the post-result branch) with a stub chatFn returning soft 502 under HALF_OPEN; assert breaker state OPEN and that `_onSuccess` was not applied.

### F3 — [MEDIUM] MUST coverage gaps for RR recordFailure spy and runtime-unit wiring

- **Path**: `tests/unit/combo-resilience-wiring-0043.test.ts` (entire file); no hits for `executeRuntimeUnitCombo` / `getRuntimeModelSkipReason` under `tests/`
- **Evidence**: Task MUST requires:
  - RR failure path calls `recordFailure` / equivalent (**spy**)
  - RR skips OPEN/model-lock **before** semaphore acquire
  - runtime-unit / combo-ref passes same resilience hooks
  Suite only unit-tests predicates + `recordProviderFailure` + auto `selectProvider`. Code has RR call sites (`combo.ts:3028-3042`, `:3429-3446`) and runtime post-failure recording, but no spy/integration proof. F1 shows why that matters.
- **Impact**: Incomplete TDD gate for the epic’s highest-risk paths; false confidence on F-03-001/002/004.
- **Fix**: Minimal harness: mock `handleSingleModel` + OPEN breaker / locked model / 502 response; assert skip order vs semaphore + `recordProviderFailure` invocation; separate runtime-unit case for F1.

### F4 — [LOW] Residual: multi-account HALF_OPEN soft-fail can still heal on later account success

- **Path**: `src/sse/handlers/chat.ts:1609-1618` then success path `:1289-1292`
- **Evidence**: On `shouldFallback` + HALF_OPEN + provider-level status, `_onFailure()` → OPEN. Loop continues other connections; a later `result.success` calls `_onSuccess()`, which closes OPEN via `success-recovery` (`circuitBreaker.ts:327-331`).
- **Impact**: Probe soft-fail does not leave the provider OPEN if another account succeeds in the same request. Often desirable (account-local 502), but means “failed probe” is not sticky across accounts. Not a soft-fail-as-success bug (probe is not counted success; a later real success recovers).
- **Fix**: Optional product clarification only; no change required for F-04-001 unless operators want probe-fail sticky for the full request.

## Open Questions

- None blocking. Deferred fusion F-03-012 / F-03-W2-006 correctly left out. Stretch F-03-006 (`backoffLevel=0`) residual accepted.

## Contract Compliance (Exit Conditions)

| Exit | Status | Live proof |
| --- | --- | --- |
| F-04-001 soft-fail not probe success | ⚠️ partial | Code: `chatHelpers.ts:480-504` gate-only + `chat.ts` post-result. Tests simulate, do not call chat path (F2) |
| Combo records provider failures | ✅ / ⚠️ | Priority + RR + runtime record sites present; RR spy missing (F3); runtime pre-skip key bug (F1) |
| RR pre-skip OPEN/model-lock before semaphore | ✅ code | `combo.ts:3028-3042` before `semaphore.acquire` at `:3096` |
| HALF_OPEN budget via canExecute | ✅ | `isProviderCircuitBlocking` + RR/priority/preScreen/sticky; unit tests pass |
| Auto empty-pool no OPEN re-admit | ✅ | `engine.ts:246-269` + tests throw `/no healthy candidates/i` |
| Re-eval live breaker / incident | ✅ | `updateIncidentMode` + evaluate with live state; tests pass |
| Deferred fusion listed | ✅ | Task Completion Evidence + CHANGELOG |
| Unit/vitest patterns pass | ✅ fresh | 13/13 node test; autoCombo vitest 56/56 |
| typecheck:core | ✅ fresh | `npm run typecheck:core` clean |
| lint no new errors | ⬜ not re-run full lint | Touched files are TS logic; no obvious lint risk |
| CHANGELOG + RESILIENCE_GUIDE | ✅ | Unreleased Fixed entry; guide soft-fail + combo gates |

## Implementation map (verified)

| Finding | Implementation | Test |
| --- | --- | --- |
| F-04-001 | `tryReserveExecution` + chat post-result HALF_OPEN `_onFailure` | Unit CB + simulated path only |
| F-03-001 | RR `recordProviderFailure` after retries | Predicate + recordProviderFailure HALF_OPEN |
| F-03-002 | runtimeUnits pre/post resilience | **Broken connection key; no test** |
| F-03-003 | `isProviderCircuitBlocking` / `canExecute` | Unit OPEN + HALF_OPEN budget |
| F-03-004 | RR circuit + model lock before semaphore | Model lockout unit only |
| F-03-W2-001 | empty-pool non-OPEN soft re-admit / fail closed | 3 selectProvider tests |
| F-03-W2-002 | live CB re-eval + `updateIncidentMode` | Incident + OPEN exclusion tests |
| Stretch W2-003 | RR credential gate before semaphore | Untested (stretch) |
| Stretch F-03-008 | `tryReserveExecution` atomic reserve | Partial via reserve unit test |

## Fresh Verification Commands

```bash
node --import tsx/esm --test tests/unit/combo-resilience-wiring-0043.test.ts
# → 13 pass / 0 fail (this session)

npm run test:vitest -- open-sse/services/autoCombo/__tests__/autoCombo.test.ts
# → 56 pass (this session)

npm run typecheck:core
# → clean (this session)

# Connection key mismatch (this session)
rg -n "exhaustedConnections\.(add|has)" open-sse/services/combo/
```

## Path-to-100 (builder)

1. **Must**: Fix F1 key format (prefer reuse `getExhaustedTargetSkipReason`).
2. **Must**: Add F-03-002 regression test (exhausted connection skip).
3. **Must**: Replace simulated F-04-001 chat test with real helper/chatFn soft-502 path (F2).
4. **Should**: RR spy + pre-semaphore skip integration (F3).
5. Re-run unit + vitest + typecheck; update Completion Evidence; resubmit `03-review`.

## Verdict summary

Primary resilience wiring for soft-fail, RR, HALF_OPEN gates, and auto-combo empty-pool/incident is largely correct and documented. **Blocking**: F-03-002 runtime-unit connection exhaustion pre-skip is ineffective due to key mismatch, and MUST tests do not prove chatFn or runtime-unit contracts. Score **84** → return to **02-doing**.
