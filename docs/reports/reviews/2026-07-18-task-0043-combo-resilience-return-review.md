# Review Report: Task 0043 — Combo Resilience Wiring — Independent Security Return-Review 2026-07-18

## Review Lineage

- **Current task**: Task 0043 (`omniroute-combo-resilience-wiring`); live path `docs/tasks/03-review/0043-omniroute-combo-resilience-wiring.md`
- **Previous reports read** (UNTRUSTED prior scores — re-proved live):
  - `docs/reports/reviews/2026-07-18-task-0043-combo-resilience-rereview.md` (claimed 100)
  - `docs/reports/reviews/2026-07-11-task-0043-combo-resilience-review.md` (84, NEEDS FIX)
- **Source findings**: F-04-001, F-03-001…004, F-03-W2-001/002; stretch F-03-W2-003 / F-03-006 / F-03-008
- **Review mode**: independent FULL security return-review (reliability/abuse of resilience as security boundary)
- **Reviewer profile**: `gt-security-reviewer` (agentID=`reviewers`)
- **Harnesses**: security-harness (secure-architecture), code-quality-harness, tsjs

## Score And Verdict

- **Score**: `100/100`
- **Verdict**: `ACCEPTED_100`
- **Lane recommendation**: `hold-in-review` — remain `docs/tasks/03-review/`
- **Patches this session**: none

### Rubric snapshot

| Dimension | Score | Notes |
| --- | --- | --- |
| F-04-001 soft-fail not probe success | 100 | `tryReserveExecution` gate-only; SSoT classifier; soft 502/429 matrix live |
| F-03-001 RR recordFailure | 100 | unit: failureCount increases after 502 |
| F-03-002 runtime-unit resilience | 100 | exhaustion key `provider:connectionId`; pre-skip after 502 |
| F-03-003 HALF_OPEN budget | 100 | `isProviderCircuitBlocking` / canExecute; no raw `state==="OPEN"` combo gates |
| F-03-004 RR pre-skips | 100 | OPEN + model-lock before handleSingleModel |
| Auto empty-pool / re-eval | 100 | fail-closed OPEN; live CB re-eval; incident mode |
| Tests | 100 | **22/22** unit + **56/56** vitest autoCombo (fresh this session) |

## Adversarial Live Proof (this session)

```text
node --import tsx/esm --test tests/unit/combo-resilience-wiring-0043.test.ts
→ 22 pass / 0 fail

npm run test:vitest -- open-sse/services/autoCombo/__tests__/autoCombo.test.ts
→ 56 pass / 0 fail

# Classifier matrix (direct)
HALF_OPEN + soft 502/429/401 → failure (re-open; no stuck halfOpenAllowed=0)
CLOSED + soft 502 non-combo → failure
CLOSED + soft 429 → none (account layer owns 429)
HALF_OPEN + success → success
combo terminal 502 → none (combo records via recordProviderFailure)

# Exhaustion key
bare conn-1 → null skip (does NOT match)
openai:conn-1 → skip (correct writer format)
```

### Grep smell check

- Combo services use `isProviderCircuitBlocking` / `canExecute` rather than raw `state === "OPEN"` for pre-gates
- Only residual raw OPEN check: `accountFallback.recordProviderFailure` early-return when already OPEN (correct)

## Findings

| ID | Severity | Status | Summary |
| --- | --- | --- | --- |
| — | — | none blocking | Seven primary findings closed under live proof |
| F4 multi-account heal | Info | product residual OK | Later success on another account may close breaker — intentional account-local recovery |
| F-03-006 backoffLevel=0 | Info | stretch residual | Explicitly out of primary exit |
| Fusion F-03-012 / W2-006 | Info | deferred elsewhere | Must not compete |

## Threat note

Mis-wired resilience is a **availability / cost-amplification** risk: a dying provider that is treated as healthy receives traffic and burns keys. Soft-fail-as-success actively **heals** broken providers in HALF_OPEN. Live proof confirms the gate-only reserve + post-result classifier closes that class.

## Guards (must stay green)

- G1: chatHelpers never wraps soft chatFn in `breaker.execute()`
- G2: HALF_OPEN any soft non-success → `failure` before status filter
- G3: exhaustion keys always `provider:connectionId`
- G4: RR pre-skip OPEN/model-lock before semaphore
- G5: auto-combo empty-pool never re-admits OPEN
- G6: re-eval never hardcodes CLOSED

## Lane Outcome

- **S = 100** → stay `03-review/`
- **Path-to-100**: N/A

## Review Ledger Entry

- **Date**: 2026-07-18
- **Reviewer**: `gt-security-reviewer` (agentID=`reviewers`)
- **Score**: `100/100`
- **Verdict**: `ACCEPTED_100`
- **Full report**: this file
- **Previous**: `2026-07-18-task-0043-combo-resilience-rereview.md`, `2026-07-11-task-0043-combo-resilience-review.md`
