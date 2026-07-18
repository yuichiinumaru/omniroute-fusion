# Review Report: Task 0043 — Combo / Auto-Combo Resilience Wiring — 2026-07-18

## Review Lineage

- **Current task**: Task 0043 (`omniroute-combo-resilience-wiring`); live path was `docs/tasks/02-doing/0043-omniroute-combo-resilience-wiring.md`
- **Epic**: 0008 S4 — Adversarial Remediation (combo resilience + chat soft-failure F-04-001)
- **Previous reports read**:
  - `docs/reports/reviews/2026-07-11-task-0043-combo-resilience-review.md` — score **84/100**, verdict `NEEDS FIX` (blocking F1 key mismatch; F2/F3 MUST test gaps)
- **Related reports considered**: source findings F-03-001…004, F-03-W2-001/002, F-04-001; `docs/architecture/RESILIENCE_GUIDE.md`
- **Review mode**: `re-review` + **path-to-100 by reviewer** (parent score routing 90–99 → fix then promote)
- **Reviewer**: `gt-ts-code-reviewer` (formal parallel-review; parent agentID=`builders`)
- **Skills**: code-quality-harness + tsjs-harness (Tier 3 axioms)

## Score And Verdict

- **Pre-fix re-review score**: `94/100` (Elite) — prior blocking F1–F3 resolved by builder/ts-expert 2026-07-18; residual stuck HALF_OPEN on soft 429 after `tryReserveExecution`
- **Post path-to-100 score**: `100/100`
- **Verdict**: `ACCEPTED_100`
- **Lane recommendation**: `accept-to-03-review` (S=100 → move `docs/tasks/03-review/`)

### Rubric snapshot (post path-to-100)

| Dimension | Score | Notes |
| --- | --- | --- |
| Contract / exit conditions | 100 | Seven primary findings closed; fusion deferred listed; stretch residuals explicit |
| Correctness (breaker/RR/HALF_OPEN) | 100 | Soft-fail SSoT + HALF_OPEN any soft non-success re-opens; RR/runtime/auto-pool solid |
| Auto-combo empty-pool / incident | 100 | Fail-closed OPEN; live CB re-eval; incident mode; routerStrategy parity |
| Tests / evidence freshness | 100 | **22/22** unit + **56/56** vitest autoCombo + typecheck:core clean (this session) |
| Docs / CHANGELOG | 100 | RESILIENCE_GUIDE SSoT + HALF_OPEN 429 note; CHANGELOG Fixed entries |
| Scope discipline | 100 | No fusion scope creep; F-03-006/F4 product residuals non-blocking |
| Type safety (ts-rules) | 100 | New SSoT pure module; no unsafe `as`/`any` in task surface; named exports |

## Delta Summary

### Resolved Since Previous Review (2026-07-11)

| ID | Class | Summary | Proof |
| --- | --- | --- | --- |
| F1 | `RESOLVED` | Runtime-unit exhaustion key bare `connectionId` vs `provider:connectionId` | `runtimeUnits.ts` delegates to `getExhaustedTargetSkipReason`; integration test pre-skips second unit after 502 |
| F2 | `RESOLVED` | Soft-fail test only simulated `tryReserve` | Real `executeChatWithBreaker` soft 502 + classifier matrix + structural chat.ts wire |
| F3 | `RESOLVED` | No RR recordFailure / runtime-unit / pre-skip integration | RR failureCount increase; OPEN + model-lock pre-skip before `handleSingleModel` |
| N1 | `RESOLVED` (reviewer path-to-100) | HALF_OPEN + soft 429 left probe budget stuck (`halfOpenAllowed=0`) | Classifier: HALF_OPEN soft non-success → `failure` **before** status filter; unit test re-opens + lazy recovery |

### Persistent / Product Residuals (non-blocking)

| ID | Class | Summary | Handling |
| --- | --- | --- | --- |
| F4 | `SUPERSEDED` | Multi-account later success can heal OPEN in same request | Product-desirable account-local recovery; not soft-fail-as-success |
| Stretch F-03-006 | `EXTERNAL_BLOCKER` / deferred | `backoffLevel=0` residual | Explicitly out of primary exit conditions |
| Fusion F-03-012 / W2-006 | `EXTERNAL_BLOCKER` | Nested fusion options / panel cancel | Tracked elsewhere; must not compete |

### Regressions

- None.

### New Findings (post path-to-100)

- None open.

## Findings

| ID | Class | Severity | Status | Summary | First seen | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| F1 | RESOLVED | High | Closed | Exhaustion key format in runtime units | 2026-07-11 | `open-sse/services/combo/runtimeUnits.ts:120-128`; test L673–752 |
| F2 | RESOLVED | Medium | Closed | Soft-fail MUST via real helper | 2026-07-11 | `tests/unit/combo-resilience-wiring-0043.test.ts` executeChatWithBreaker + classifier |
| F3 | RESOLVED | Medium | Closed | RR spy + pre-skip + runtime-unit | 2026-07-11 | RR failureCount + OPEN/model-lock tests |
| N1 | RESOLVED | Medium | Closed | Stuck HALF_OPEN after soft 429 probe | 2026-07-18 re-review | `softChatBreakerOutcome.ts` HALF_OPEN-before-status; test soft 429 re-open |
| F4 | SUPERSEDED | Low | Closed (product) | Multi-account heal after probe fail | 2026-07-11 | Intentional |

## Axiom Compliance (tsjs-harness)

| Axiom | Status | Notes |
| --- | --- | --- |
| Type Safety | ✅ | Pure classifier; `ExhaustionSkipTarget` Pick; no new `as T` without safety |
| Async / Event Loop | ✅ | Gate-only `tryReserveExecution`; post-result accounting; no soft wrap in `execute()` |
| Error Handling | ✅ | Soft vs throw paths split; combo `recordProviderFailure` allows HALF_OPEN |
| Security / Pollution | ✅ | N/A primary; no eval; sets for exhaustion keys |
| Module / Exports | ✅ | Named SSoT module; no default export; side-effect free classifier |

## Contract Compliance (Exit Conditions)

| Exit | Status | Live proof |
| --- | --- | --- |
| F-04-001 soft-fail not probe success | ✅ | `chatHelpers.ts` tryReserve only; `chat.ts` classifier; soft 502 + soft 429 tests |
| Combo records provider failures | ✅ | Priority + RR + runtime `recordProviderFailure`; RR failureCount test |
| RR pre-skip OPEN/model-lock before semaphore | ✅ | `combo.ts:3040-3056` before acquire; integration tests |
| HALF_OPEN budget via canExecute | ✅ | `isProviderCircuitBlocking` + preScreen + tests |
| Auto empty-pool no OPEN re-admit | ✅ | `engine.ts:246-269` + routerStrategy + tests |
| Re-eval live breaker / incident | ✅ | `updateIncidentMode` + live map; tests |
| F-03-002 runtime-unit resilience | ✅ | Shared skip + exhaustion key + post-failure record |
| Deferred fusion listed | ✅ | Task Completion Evidence |
| Unit/vitest pass | ✅ fresh | 22/22 node; 56/56 vitest autoCombo |
| typecheck:core | ✅ fresh | clean |
| CHANGELOG + RESILIENCE_GUIDE | ✅ | Updated this session |

## Implementation map (verified)

| Finding | Implementation | Test |
| --- | --- | --- |
| F-04-001 | `tryReserveExecution` + `classifySoftChatBreakerOutcome` + chat post-result | Soft 502 helper, matrix, soft 429 stuck-probe, structural chat.ts |
| F-03-001 | RR `recordProviderFailure` after retries | failureCount increase |
| F-03-002 | `getExhaustedTargetSkipReason` in runtimeUnits | same-connection 502 pre-skip |
| F-03-003 | `isProviderCircuitBlocking` / canExecute | OPEN + HALF_OPEN budget |
| F-03-004 | RR circuit + model lock before semaphore | OPEN + model-lock integration |
| F-03-W2-001 | empty-pool non-OPEN only | selectProvider throws / HALF_OPEN soft admit |
| F-03-W2-002 | live CB re-eval + incident | incident + OPEN exclusion |
| Stretch W2-003 | RR credential gate before semaphore | code path present |
| Stretch F-03-008 | tryReserve + HALF_OPEN soft fail re-open | reserve + 429 re-open tests |

## Runtime wiring proof

```
Client chat / combo target
  → handleSingleModelChat (src/sse/handlers/chat.ts)
    → executeChatWithBreaker (chatHelpers.ts)
         tryReserveExecution()  // NO breaker.execute wrap of soft result
         chatFn / handleChatCore → { success:false, status } non-throwing
    → classifySoftChatBreakerOutcome → _onSuccess | _onFailure
  → combo paths (priority / RR / runtimeUnits)
    → isProviderCircuitBlocking / getExhaustedTargetSkipReason pre-skip
    → shouldRecordProviderBreakerFailure → recordProviderFailure
  → autoCombo selectProvider
    → updateIncidentMode + empty-pool CLOSED/HALF_OPEN only (never OPEN re-admit)
```

## Evidence Reviewed

- Task: `docs/tasks/02-doing/0043-omniroute-combo-resilience-wiring.md`
- Prior report: `docs/reports/reviews/2026-07-11-task-0043-combo-resilience-review.md`
- Source: `softChatBreakerOutcome.ts`, `circuitBreaker.ts` (`tryReserveExecution`), `chatHelpers.ts`, `chat.ts`, `comboPredicates.ts`, `runtimeUnits.ts`, `combo.ts` (RR/priority), `accountFallback.ts` (`recordProviderFailure`), `autoCombo/engine.ts`, `autoCombo/routerStrategy.ts`
- Tests: `tests/unit/combo-resilience-wiring-0043.test.ts`, vitest autoCombo suite
- Docs: `RESILIENCE_GUIDE.md`, `CHANGELOG.md`

## Commands Run

```bash
node --import tsx/esm --test tests/unit/combo-resilience-wiring-0043.test.ts
# → 22 pass / 0 fail (post path-to-100)

npm run test:vitest -- open-sse/services/autoCombo/__tests__/autoCombo.test.ts
# → 56 pass (this session, pre path-to-100 residual check; autoCombo untouched)

npm run typecheck:core
# → clean (this session)

# Exhaustion key audit
rg -n "exhaustedConnections\.(add|has)" open-sse/services/combo/
# → only provider:connectionId format in production readers/writers
```

## Path To 100 (executed by reviewer)

1. **Done**: Reorder `classifySoftChatBreakerOutcome` so HALF_OPEN soft non-success → `failure` before provider-status filter (`src/shared/utils/softChatBreakerOutcome.ts`).
2. **Done**: Add regression test for soft 429 after `tryReserveExecution` re-opens (not stuck HALF_OPEN).
3. **Done**: Update RESILIENCE_GUIDE + CHANGELOG semantics note.
4. **Done**: Re-run unit suite (22/22).

## Path To 100 (remaining)

- None for Task 0043 primary contract.

## Task Ledger Patch Suggestion

```markdown
### gt-ts-code-reviewer re-review (2026-07-18)
- **Veredito**: ACCEPTED_100
- **Score**: 100/100
- **Report**: docs/reports/reviews/2026-07-18-task-0043-combo-resilience-rereview.md
- **Previous**: docs/reports/reviews/2026-07-11-task-0043-combo-resilience-review.md (84)
- **Path-to-100 by reviewer**: HALF_OPEN soft non-provider re-open (stuck probe budget)
- **Lane**: move to 03-review/
```

## Verdict summary

Builder/ts-expert closed all 2026-07-11 blockers (F1–F3) with solid production wiring and 21 tests. Independent re-review found one remaining correctness edge (HALF_OPEN + soft 429 burned probe without re-open). Reviewer path-to-100 fixed the SSoT classifier ordering, added a regression test, and refreshed docs. **Score 100** — promote to `03-review/`.
