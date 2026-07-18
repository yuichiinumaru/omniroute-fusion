# Review Report: Task 0034 — Heal False-Positive `no_refresh_token` — 2026-07-18 (final re-review)

## Review Lineage

- **Current task**: Task 0034 (`omniroute-heal-false-positive-no-refresh-token`); `docs/tasks/03-review/0034-omniroute-heal-false-positive-no-refresh-token.md`
- **Previous reports** (scores UNTRUSTED):
  - `2026-07-11-task-0034-heal-false-positive-no-refresh-token-review.md` — claimed 95/100
  - `2026-07-16-task-0034-heal-false-positive-no-refresh-token-reaudit.md` — claimed 91/100
- **Depends on**: 0032 SSoT (`isFalsePositiveNoRefreshToken`); preferred 0033 contracts
- **Review mode**: independent full re-review + path-to-100 applied
- **Reviewer profile**: `reviewers` (agentID=reviewers)

## Score And Verdict

### Score: 100 — Perfect

### Verdict: `PASS_PATH_TO_100_CLOSED`

### Lane recommendation: `hold-in-review` (remain `03-review/`)

## Axiom Compliance

| Axiom | Status | Notes |
|-------|--------|-------|
| Type Purity | ✅ pass | `toAuthShape` + `// SAFETY:`; `ConnectionAuthShape` includes optional `id` |
| Boundary Integrity | ✅ pass | Domain get/update only — no raw SQL on encrypted `api_key` |
| Async Determinism | ✅ pass | Sequential await updates; boot hook try/catch non-fatal; idempotent second run |
| Immutability | ✅ pass | Heal writes explicit null/active fields; no silent partial merge of secrets |
| State Exclusivity | ✅ pass | Terminal banned/credits_exhausted never healed; oauth #5326 kept; only `no_refresh_token` FP |

## Rubric Snapshot

| Dimension | Score | Notes |
| --- | --- | --- |
| Parent pin delivery shape | 100 | TS domain function + idempotent boot hook |
| Safety matrix | 100 | gemini/qoder/cookie/blank heal; oauth keep; unrelated codes; banned hybrid |
| SSoT eligibility | 100 | `isFalsePositiveNoRefreshToken` only |
| Idempotency | 100 | second run heals 0 |
| Hygiene | 100 | JSDoc/boot comments match long-lived heal; checkboxes synced |

## Live Evidence

```bash
node --import tsx/esm --test tests/unit/heal-no-refresh-token.test.ts
# 9/9 PASS + full epic 47/47 this session
```

| Case | Live |
|------|------|
| gemini apikey FP → active + clear errors | ✅ |
| qoder apikey FP | ✅ |
| oauth #5326 kept | ✅ |
| banned / refresh_failed unrelated codes | ✅ |
| idempotent second run | ✅ |
| mixed apikey heal + oauth keep | ✅ |
| cookie authType FP | ✅ |
| blank authType + apiKey FP | ✅ |
| banned + no_refresh_token hybrid | ✅ not healed |

Boot path: `src/instrumentation-node.ts` L105–122 — dynamic import, count-only log, non-fatal catch with `err instanceof Error`.

## Findings (post path-to-100)

| ID | Class | Severity | Status | Summary |
| --- | --- | --- | --- | --- |
| L1/A2 | prior | Low | **Closed** | JSDoc/boot long-lived heal wording |
| A1 | prior | Medium→closed | **Closed** | exclude banned/credits_exhausted |
| L2 | prior | Low | **Closed** | cookie/blank integration fixtures |
| T1 | NEW | Improvement | **Closed** | remove double `as` cast; `toAuthShape` + SAFETY |

## Path to 100 (applied this session)

1. ✅ `healFalsePositiveNoRefresh.ts` — `toAuthShape` bridge with SAFETY; drop `as Array<Record>` / `Parameters<>` casts
2. ✅ Optional `id` on `ConnectionAuthShape` for typed id extract
3. ✅ Compliance checkboxes `[x]`
4. ✅ Suite green after change

## Contract Compliance

| Exit / MUST | Status |
| --- | --- |
| TS domain heal function | ✅ `healFalsePositiveNoRefreshConnections` |
| Invocation path (boot hook) | ✅ instrumentation-node |
| Unit heal/non-heal matrix | ✅ 9 tests |
| Shared helper eligibility | ✅ |
| Operator verification SQL documented | ✅ task Completion Evidence |
| No raw SQL on ciphertext | ✅ |
| Never heal legitimate oauth #5326 | ✅ |

## External

- Live 21000 operator verify remains **Task 0036** (out of scope). Not a score deduction for 0034 delivery.

## Verdict Summary

**PASS — 100/100.** Safe, idempotent, domain-module heal with exclusive FP selection. Stay `03-review/`.
