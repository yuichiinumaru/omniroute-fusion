# Review Report: Task 0013 — Fusion Combo Branch Wire — 2026-07-16 (REAUDIT)

## Review Lineage

- **Current task**: Task 0013 (`omniroute-fusion-combo-branch-wire`); live path `docs/tasks/03-review/0013-omniroute-fusion-combo-branch-wire.md`
- **Previous reports read**:
  - `docs/reports/reviews/2026-07-10-task-0013-omniroute-fusion-combo-branch-wire-review.md` — score 93/100, HELD_IN_REVIEW_PATH_TO_100
  - `docs/reports/reviews/2026-07-10-task-0012-omniroute-fusion-runtime-dispatch-review.md` — shared nested-options debt
  - `docs/reports/reviews/2026-07-16-task-0012-omniroute-fusion-runtime-dispatch-reaudit.md` — F1 REJECT on 0012 (same wave)
- **Related reports considered**: Task 0010/0011 reaudits (contracts + resolve feed this wire)
- **Review mode**: `re-review` (adversarial production-entry proof)
- **Reviewer profile**: `reviewers` (parent agentID=reviewers)

## Score And Verdict

- **Score**: `90/100`
- **Verdict**: `HELD_IN_REVIEW_PATH_TO_100`
- **Lane recommendation**: `hold-in-review` (remain `03-review/`; **not** completed)
- **Delta vs prior**: 93 → 90 (−3). Production wire for listed exit conditions still **proven**; shared nested base-option gap reclassified as hard dependency on Task 0012 F1 (0012 reaudit REJECTED). 0013 cannot fully close path-to-100 until V2 accepts `comboChatBase` (or equivalent) and this branch threads it.

## Delta Summary

### Resolved Since Previous Review

- none (no code change required for listed exits; exits still hold)

### Persistent Findings

- `PERSISTENT` F1 (Debt / High, shared w/ 0012): `dispatchFusionStrategy` does not pass settings / isModelAvailable / signal / relayOptions / apiKeyAllowedConnections into V2 — and V2 has no field to receive them yet (`combo.ts:907-918`, `fusion.ts:263-283`, `fusion.ts:389-396`).
- `PERSISTENT` F2 (Improvement): No unit spy asserting V2 call-shape (typed panels + `handleComboChat` identity) at combo layer (behavior covered indirectly via combo-ref leaf execution).

### Regressions

- none. String-flatten path still gone; `handleFusionChat(` not used from combo.ts.

### New Findings

- `NEW` F3 (Note / dependency): Task 0012 reaudit scored **88 REJECT** for F1. 0013 path-to-100 is **blocked on 0012 API** before combo-side threading can land cleanly.
- `NEW` F4 (Note): conditional-fusion / gated-fusion trigger path + acting-only miss path still live and covered by unit tests (mode always / text-match / tool-call / strategy mutation safety / D8 fallback collapse).

### Evidence Gaps / External Blockers

- none for Task 0013 listed exit conditions. Shared F1 is proven open, not an evidence gap.

## Findings

| ID | Class | Severity | Status | Summary | First seen | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| F1 | PERSISTENT | High | Open (blocked on 0012 API) | Cannot forward parent combo base options | 2026-07-10 | `combo.ts:907-918` + fusion V2 |
| F2 | PERSISTENT | Improvement | Open | Optional spy for V2 call-shape | 2026-07-10 | combo-fusion-strategy tests |
| F3 | NEW | Note | Open | Path-to-100 depends on 0012 F1 fix | this reaudit | 0012 reaudit 88 |
| F4 | NEW | Note | OK | Trigger/fallback/acting-miss paths hold | this reaudit | unit tests green |

## Contract / exit-condition audit

| Exit condition | Status | Proof |
| --- | --- | --- |
| fusion branch → resolveFusionUnits + handleFusionChatV2 | ✅ | `dispatchFusionStrategy` `combo.ts:899-918`; gate `959-970` |
| conditional-fusion → same after trigger match | ✅ | `973-979` + tests |
| Passes handleComboChat, allCombos, nesting | ✅ | lines 912-914 |
| Passes typed panels/judge (not string flatten) | ✅ | resolveFusionUnits; combo-ref test |
| String-flatten removed | ✅ | no `handleFusionChat(` in combo.ts |
| conditional-fusion trigger + fallback preserved | ✅ | shouldTriggerFusion / resolveFusionFallbackStrategy + tests |
| String-only fusion still works | ✅ | panel fan-out tests |
| combo-fusion-strategy + integration matrix | ✅ | green this reaudit |
| CHANGELOG Task 0013 | ✅ | Unreleased entry present (prior + rg) |
| Nested base option thread | ❌ residual F1 | blocked on V2 |

## Production entry proof (MANDATORY — re-verified)

### Chain (code)

```
Client POST /v1/chat/completions
  → src/sse/handlers/chat.ts (~650)
       handleComboChat({ body, combo, handleSingleModel→handleSingleModelChat,
                         settings, allCombos, apiKeyAllowedConnections, signal, … })
  → open-sse/services/combo.ts::handleComboChat (~744)
       nestingContext (885-891)
       if strategy ∈ {fusion, conditional-fusion} (959)
         [optional trigger gate]
         return dispatchFusionStrategy() (899)
           resolveFusionUnits(combo, allCombos)
           handleFusionChatV2({
             panels, judge, acting,
             handleSingleModel: handleSingleModelWithTimeout,
             handleComboChat,          // SAME recursive export
             allCombos,
             nesting: nestingContext,
             …
             // MISSING: settings / signal / isModelAvailable / …
           })
  → open-sse/services/fusion.ts::handleFusionChatV2
       dispatchFusionUnit → handleSingleModel | handleComboChat(child)  // child opts incomplete
```

### Not dead code

| Probe | Result |
| --- | --- |
| combo imports resolveFusionUnits + handleFusionChatV2 | ✅ |
| No legacy handleFusionChat( in combo.ts | ✅ |
| Unit: combo-ref panel leaf runs via nested priority combo | ✅ |
| Unit: conditional-fusion match/miss/fallback/D8 | ✅ |
| Integration matrix FUSION logs | ✅ (prior + suite still green) |

## Axiom Compliance

| Axiom | Status | Notes |
| --- | --- | --- |
| Production wiring | ✅ for listed exits | entry proven |
| Nested policy continuity | ⚠️ | F1 — parent has settings/signal/apiKeyAllowed but drops them at fusion handoff |
| Trigger fail-closed | ✅ | unknown mode no-fire; D8 runtime fallback collapse |
| Shared-object safety | ✅ | trigger miss does not mutate combo.strategy |

## Evidence Reviewed

- Task + prior 0013 + prior/reaudit 0012
- Source: `open-sse/services/combo.ts` handleComboChat fusion gate + dispatchFusionStrategy + dispatchActingOnly
- Entry: `src/sse/handlers/chat.ts` options into handleComboChat
- Tests: combo-fusion-strategy, fusion-combo-ref-dispatch, fusion-units-resolve, integration combo-matrix/fusion
- Commands:
  ```bash
  node --import tsx/esm --test \
    tests/unit/fusion-combo-ref-dispatch.test.ts \
    tests/unit/combo-fusion-strategy.test.ts \
    tests/unit/fusion-units-resolve.test.ts \
    tests/integration/combo-matrix/fusion.test.ts
  # green (combined fusion wave 102 pass incl. combo-config)

  npm run typecheck:core  # exit 0
  ```

## Path To 100

1. **Blocked on Task 0012 F1**: V2 must accept `comboChatBase` (or equivalent).
2. **Then F1 combo-side**: in `dispatchFusionStrategy` (and ideally `dispatchActingOnly` for parity), pass:
   ```ts
   comboChatBase: {
     settings,
     isModelAvailable,
     relayOptions,
     signal,
     apiKeyAllowedConnections,
   }
   ```
3. **F2 optional**: spy that fusion strategy invokes V2 with combo-ref panel kinds + function handleComboChat.
4. Keep regression guards: no string flatten; conditional-fusion miss safety; integration fan-out + 503 all-fail.

## Regression Guards

- Unconditional strategy fusion still immediate dispatchFusionStrategy when gate does not apply.
- Gated fusion / conditional-fusion miss: acting-only OR fallback — never silent drop.
- Combo-ref panel must execute nested leaf (not silent-drop).
- Integration: full panel fan-out + judge; all-fail → 503.
- Do not reintroduce string flattening of combo.models for fusion branches.

## Task Ledger Patch Suggestion

```markdown
### Latest Review
- Date: 2026-07-16
- Score: 90/100
- Verdict: HELD_IN_REVIEW_PATH_TO_100
- Full report: docs/reports/reviews/2026-07-16-task-0013-omniroute-fusion-combo-branch-wire-reaudit.md
- Lane outcome: remains in review
- Production entry: PROVEN; nested base options BLOCKED on Task 0012
```
