# Review Report: Task 0068 — Fusion tool-call Trigger Window (Sticky → Last Assistant) — 2026-07-19

## Review Lineage

- **Current task**: Task 0068 (`omniroute-fusion-tool-call-trigger-window`); live path at review start: `docs/tasks/02-doing/0068-omniroute-fusion-tool-call-trigger-window.md`
- **Previous reports read**:
  - Task file Review Trail (gt-ts-expert, 2026-07-19) — score 98, ACCEPT with empty-`tool_calls` residual fixed in-session; no standalone `docs/reports/` file for 0068
  - `docs/reports/reviews/2026-07-18-task-0014-omniroute-fusion-triggers-fallback-final-review.md` — 100/100 on parent pure-module extraction (related surface)
  - `docs/reports/audits/2026-07-19-wave2-ts-reviewer-fusion-runtime-investigation.md` — H-FUSION-008 sticky residual origin
- **Related reports considered**:
  - `docs/reports/audits/2026-07-19-task-batch-review-open-0062-0083.md` — 0068 ownership note
- **Review mode**: `initial` formal parallel-review (gt-ts-code-reviewer / builders)
- **Reviewer**: gt-ts-code-reviewer (parent agentID=`builders`)
- **Skills**: code-quality-harness + tsjs-harness (ts-rules / five axioms)

## Score And Verdict

- **Score**: `100/100`
- **Level**: Perfect (in-scope)
- **Verdict**: `ACCEPTED_100`
- **Lane recommendation**: `accept` → move to `docs/tasks/03-review/`

### Dual Score (production-facing composition)

| Dimension | Score | Notes |
|-----------|------:|-------|
| `local_implementation` | **100** | N=1 latest-assistant window encoded; sticky walk removed; matrix + empty-array guards green |
| `runtime_enforcement` | **100** | Single production gate: `combo.ts:992` → `shouldTriggerFusion` → `hasMatchingToolCall`; no second sticky matcher |
| **Overall** | **100** | Capped by weaker dimension |

## Delta Summary

### Resolved Since Previous Expert Trail (98)

- `RESOLVED`: Empty `tool_calls: []` on latest assistant does not sticky-walk older writes (`fusionTriggers.ts:84` + unit test).
- `RESOLVED`: Sticky goldens flipped; agent-loop matrix encodes cost-control contract.
- `RESOLVED`: Comments/module header document EPIC-11 last-assistant-only semantics.

### Persistent Findings

- none in-scope blocking

### Regressions

- none

### New Findings

- none blocking

### Evidence Gaps / External Blockers

- `EXTERNAL_BLOCKER` / deferred by design: `docs/architecture/FUSION.md` Trigger modes prose still ambiguous vs sticky wording — **Task 0071** owns operator docs (task anti-hallucination forbids 0068 editing FUSION.md).
- Intentional product note (not a defect): mid-tool-turn history `write → tool → user` (no plain assistant yet) still fires — latest assistant still carries matching `tool_calls`. Documented in matrix + prior trail.

## Axiom Compliance (tsjs-harness)

| Axiom | Status | Notes |
|-------|:------:|-------|
| 1 Type Purity | ✅ | No `any`. Runtime `as` narrows carry `// SAFETY:` after typeof/object checks |
| 2 Boundary Integrity | ✅ | Chat body treated as untyped JSON with defensive narrows; operator `toolPatterns` Zod-gated at write (`combo.ts` schema `z.array(z.string()...)`) |
| 3 Async Determinism | ✅ | Pure sync module; no promises |
| 4 Immutability | ✅ | Reads body/messages only; no mutation of request or combo config |
| 5 State Exclusivity | ✅ | Trigger modes fail-closed on unknown; empty patterns / empty tool_calls → false |

## Contract Compliance (Task 0068)

| Exit / Test requirement | Evidence |
|-------------------------|----------|
| Latest assistant only for `tool-call` | `hasMatchingToolCall` scans end→start, breaks on first assistant, requires its `tool_calls` |
| Sticky residual false | Tests: plain assistant after write; multi-turn matrix; empty `tool_calls: []` |
| Hit when latest has matching tools | `toolBody` + matrix write turn / re-arm |
| Non-matching latest tools → false | unit test |
| Bare `name` shape preserved | unit test |
| Empty patterns / empty messages → false | unit tests |
| `text-match` latest user only | regression test |
| `always` / unknown mode | unit tests |
| No schema/UI / no fusion.ts / no combo.ts edits | ownership respected; only pure module + tests |
| combo-fusion-strategy spot-check | 22 pass |
| typecheck / eslint on touched files | claimed in task evidence; eslint re-run exit 0 this review |

## Findings

### Critical (Score < 50)

- none

### Serious (31–50)

- none

### Debt (51–70)

- none in-scope

### Improvements (80–99) — non-blocking / out of scope

1. **Pre-existing**: `matchGlob` throws if a non-string sneaks into `patterns` (`pattern.replace is not a function`). Not introduced by 0068; write path Zod-validates `toolPatterns` as non-empty strings. Optional harden: `typeof pattern === "string"` guard inside `matchGlob` / `hasMatchingToolCall` — **not required for 0068 closeout**.
2. **Docs**: FUSION.md operator table still sticky-ambiguous — **0071**.

## Runtime Wiring Proof

```
conditional-fusion | gated fusion
  → open-sse/services/combo.ts (~979–992)
    → shouldTriggerFusion(body, triggers)
      → hasMatchingToolCall(body, patterns)   [tool-call mode]
```

- Production call site: `open-sse/services/combo.ts:992`
- Import: `combo.ts:140` from `./fusionTriggers.ts`
- No other `open-sse/services/` consumer of sticky tool-call walk
- Regression: restoring sticky walk fails `does NOT sticky-match older write tool after plain assistant turn` + multi-turn matrix

## Adversarial Simulation (this review)

| Input | Result | Assessment |
|-------|--------|------------|
| write → tool → plain assistant → user | false | cost control OK |
| write on latest assistant | true | hit OK |
| empty `tool_calls: []` after older write | false | no sticky walk |
| non-array messages / null body.messages | false | fail-closed |
| `function` as string (no bare name) | false | fail-closed |
| bare `name` with `function: null` | true | Wave 2 bare-name preserved |
| system after assistant tools | true | latest *assistant* still write turn — correct |
| non-string pattern | throw | pre-existing; Zod-gated at config write |

## Commands Run (fresh this review)

```text
$ node --import tsx/esm --test tests/unit/fusion-triggers.test.ts
ℹ tests 33
ℹ pass 33
ℹ fail 0

$ node --import tsx/esm --test tests/unit/combo-fusion-strategy.test.ts
ℹ tests 22
ℹ pass 22
ℹ fail 0

$ npx eslint open-sse/services/fusionTriggers.ts tests/unit/fusion-triggers.test.ts
exit 0
```

(Adversarial node one-liners for sticky/empty/hit invariants — all PASS.)

## Scoring Rationale

Start 100. Product invariant (H-FUSION-008 / EPIC-11 last-assistant-only) is implemented, commented, unit-proven, and wired through the only production gate. Empty-array residual closed. No axiom violations in scope. Deferred FUSION.md is another task’s ownership. Pre-existing non-string pattern throw is Zod-bounded and out of 0068 diff ownership → **no deduction**.

## Path to 100

**None remaining in-scope.** Optional follow-ups (do not block closeout):

1. Task 0071 — update FUSION.md Trigger modes wording to “latest assistant message only (not sticky history)”.
2. Optional: defensive `typeof pattern === "string"` in `matchGlob` (pre-existing hardening, any follow-up).

## Regression Guards (must not regress)

1. Do **not** restore “walk until tool_calls-bearing assistant” sticky loop.
2. Keep empty `tool_calls: []` as non-match (no history walk).
3. Keep bare `name` fallback after `function.name`.
4. Keep `text-match` on latest user only; `always` unconditional; unknown mode fail-closed.
5. Keep pure module dependency-light (no translator imports).

## Changelog Draft Validation

Worker draft claims match live files:

- `open-sse/services/fusionTriggers.ts` — last-assistant window
- `tests/unit/fusion-triggers.test.ts` — sticky flip + matrix
- No phantom combo/fusion/docs edits

## Task Ledger Patch Suggestion

```markdown
## 🔍 Review Ledger

- **Latest**: 2026-07-19 — gt-ts-code-reviewer — **100/100** — ACCEPTED_100
- **Full report**: `docs/reports/reviews/2026-07-19-task-0068-omniroute-fusion-tool-call-trigger-window-review.md`
- **Previous Reports**:
  - Task-file trail only (gt-ts-expert 98/100, empty-tool_calls residual closed) — no prior standalone report
- **Regression guards**: no sticky history walk; empty tool_calls stays false; bare name; text-match latest-user
- **Deferred**: FUSION.md prose → Task 0071
```
