# Review Report: Task 0013 — Fusion Combo Branch Wire — 2026-07-10

## Review Lineage

- **Current task**: Task 0013 (`omniroute-fusion-combo-branch-wire`); live path `docs/tasks/03-review/0013-omniroute-fusion-combo-branch-wire.md`
- **Previous reports read**: none found for 0013; read Task 0012 review (same wave) as dependency surface
- **Related reports considered**:
  - `docs/reports/reviews/2026-07-10-task-0012-omniroute-fusion-runtime-dispatch-review.md` — V2 API + nested option plumbing debt
- **Review mode**: `initial`
- **Reviewer profile**: `reviewers` (lane: `gt-omniroute-architect` + tsjs)
- **Parent agentID**: `reviewers`

## Score And Verdict

- **Score**: `93/100`
- **Verdict**: `HELD_IN_REVIEW_PATH_TO_100`
- **Lane recommendation**: `hold-in-review` (stay `03-review/`; **not** `04-completed/`)
- **Score routing applied**: S ≥ 90 → APPROVE with path-to-100; production entry **proven live** (not dead code)

## Delta Summary

### Resolved Since Previous Review
- N/A (initial review).

### Persistent Findings
- none

### Regressions
- none

### New Findings
- `NEW` F1: inherits Task 0012 nested-options gap — `dispatchFusionStrategy` cannot forward `settings`/`signal`/… until V2 accepts them (shared fix with 0012).
- `NEW` F2 (improvement): no unit assertion that `handleFusionChatV2` is invoked with `handleComboChat ===` recursive export identity (behavior covered indirectly).

### Evidence Gaps / External Blockers
- none material. Production path proven via integration matrix through real chat handler.

## Findings

| ID | Class | Severity | Status | Summary | First seen | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| F1 | NEW | Debt | Open (shared w/ 0012) | Nested combo-ref under fusion lacks parent combo base options | 2026-07-10 | `combo.ts:900-912` + `fusion.ts:389-396` |
| F2 | NEW | Improvement | Open | Could assert V2 call-shape (panels/judge kinds + handleComboChat present) at combo layer | 2026-07-10 | `combo-fusion-strategy.test.ts` proves behavior, not mock of V2 |

### Contract / exit-condition audit

| Exit condition | Status | Proof |
| --- | --- | --- |
| `fusion` branch → `resolveFusionUnits` + `handleFusionChatV2` | ✅ | `dispatchFusionStrategy` `combo.ts:893-912`; gate `953-962` |
| `conditional-fusion` → same after trigger match | ✅ | `953-971`; tests match/miss |
| Passes `handleComboChat`, `allCombos`, `nesting` | ✅ | lines 906-908 |
| Passes typed `panels`/`judge` (not string flatten) | ✅ | `resolveFusionUnits`; combo-ref test |
| String-flatten removed from both branches | ✅ | `rg` no `handleFusionChat(` in combo.ts |
| conditional-fusion trigger + fallback preserved | ✅ | tests; `shouldTriggerFusion` / `resolveFusionFallbackStrategy` |
| String-only fusion still works | ✅ | panel fan-out tests |
| `combo-fusion-strategy` tests | ✅ | 11/11 |
| `combo-matrix/fusion` integration | ✅ | 2/2 — real chat path |
| typecheck | ✅ | exit 0 |
| CHANGELOG | ✅ | Unreleased Task 0013 bullet |

## Production entry proof (MANDATORY)

### Chain (code)

```
Client POST /v1/chat/completions
  → src/sse/handlers/chat.ts (~650)
       handleComboChat({ body, combo, handleSingleModel→handleSingleModelChat, settings, allCombos, … })
  → open-sse/services/combo.ts::handleComboChat (export L738)
       nestingContext built (L879-885)
       if strategy ∈ {fusion, conditional-fusion} (L953)
         [optional trigger gate L957-984]
         return dispatchFusionStrategy() (L893)
           resolveFusionUnits(combo, allCombos)
           handleFusionChatV2({
             panels, judge, acting,
             handleSingleModel: handleSingleModelWithTimeout,
             handleComboChat,          // SAME recursive export
             allCombos,
             nesting: nestingContext,
             …
           })
  → open-sse/services/fusion.ts::handleFusionChatV2
       dispatchFusionUnit → handleSingleModel | handleComboChat(child)
  → handleSingleModelChat → handleChatCore → getExecutor → upstream
```

### Not dead code

| Probe | Result |
| --- | --- |
| combo imports `handleFusionChatV2` + `resolveFusionUnits` | ✅ `combo.ts:135-137` |
| No remaining legacy `handleFusionChat(` call in combo.ts | ✅ |
| Integration log shows FUSION tags under real combo name | ✅ matrix test |
| Unit: combo-ref panel leaf runs via nested priority combo | ✅ `combo-fusion-strategy` "combo-ref panel is not dropped" |
| Unit: conditional-fusion match → judge; miss → no judge | ✅ |

### Integration evidence (fresh this review)

```
✔ fusion: fans out to the whole panel then routes a judge synthesis turn
  logs: Combo "m-fusion" [fusion] → FUSION panel=3 → ROUTING×3 → fan-out collected → Judging 3 answers
✔ fusion: returns 503 when the whole panel fails
  logs: All panel models failed → 503
```

## Evidence Reviewed

- Task: `docs/tasks/03-review/0013-omniroute-fusion-combo-branch-wire.md`
- Source: `open-sse/services/combo.ts` L738–987 (handleComboChat, nesting, fusion gate, dispatchFusionStrategy)
- Source: `open-sse/services/fusion.ts` V2 API
- Entry: `src/sse/handlers/chat.ts` L639–719
- Triggers: `open-sse/services/fusionTriggers.ts` (not modified by 0013; used by gate)
- Tests: `tests/unit/combo-fusion-strategy.test.ts`, `tests/integration/combo-matrix/fusion.test.ts`, plus 0012 suites for regression
- CHANGELOG: Task 0013 Unreleased entry present

### Commands run

```bash
node --import tsx/esm --test \
  tests/unit/fusion-combo-ref-dispatch.test.ts \
  tests/unit/combo-fusion-strategy.test.ts \
  tests/unit/fusion-units-resolve.test.ts \
  tests/integration/combo-matrix/fusion.test.ts
# → 42 pass / 0 fail (incl. 2 integration)

npm run typecheck:core
# → exit 0
```

### Commands not run and why

- Full repo lint/unit — out of scoped fusion gate; typecheck + targeted suites sufficient for this wiring task.

## Path To 100

1. **F1 (shared with 0012)** — once V2 accepts `comboChatBase` (or equivalent), thread `settings`, `isModelAvailable`, `relayOptions`, `signal`, `apiKeyAllowedConnections` from `handleComboChat` scope into `dispatchFusionStrategy` → `handleFusionChatV2`.
2. **F2 (optional)** — spy/mock-level test that fusion strategy path invokes V2 with non-empty `panels` containing `kind:"combo-ref"` and a function `handleComboChat` (guards against future string-flatten regression).

### Suggested patch (F1, combo.ts side)

```ts
const dispatchFusionStrategy = (): Promise<Response> => {
  const { panels, judge, acting } = resolveFusionUnits(combo, allCombos);
  // …
  return handleFusionChatV2({
    body,
    panels,
    judge,
    acting,
    handleSingleModel: handleSingleModelWithTimeout,
    handleComboChat,
    allCombos,
    nesting: nestingContext,
    log,
    comboName: combo.name,
    tuning,
    comboChatBase: {
      settings,
      isModelAvailable,
      relayOptions,
      signal,
      apiKeyAllowedConnections,
    },
  });
};
```

Requires matching fusion.ts API change (Task 0012 path-to-100).

## Regression Guards

- Unconditional `strategy:"fusion"` still returns immediately via `dispatchFusionStrategy` when triggers do not gate.
- Gated fusion / conditional-fusion miss: acting-only (if set) OR fallback strategy override — never silent drop.
- Combo-ref panel must execute nested leaf (not silent-drop).
- Integration matrix: full panel fan-out + judge; all-fail → 503.
- Do not reintroduce string flattening of `combo.models` for fusion branches.

## Task Ledger Patch Suggestion

```markdown
## Review Ledger
### Latest Review
- Date: 2026-07-10
- Score: 93/100
- Verdict: HELD_IN_REVIEW_PATH_TO_100
- Full report: docs/reports/reviews/2026-07-10-task-0013-omniroute-fusion-combo-branch-wire-review.md
- Lane: remains 03-review
- Production entry: PROVEN (chat → handleComboChat → dispatchFusionStrategy → handleFusionChatV2)
```
