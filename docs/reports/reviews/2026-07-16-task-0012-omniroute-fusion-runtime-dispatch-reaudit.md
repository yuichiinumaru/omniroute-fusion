# Review Report: Task 0012 — Fusion Runtime Dispatch — 2026-07-16 (REAUDIT)

## Review Lineage

- **Current task**: Task 0012 (`omniroute-fusion-runtime-dispatch`); live path at reaudit start `docs/tasks/03-review/0012-omniroute-fusion-runtime-dispatch.md` (lane outcome: **return to doing**)
- **Previous reports read**:
  - `docs/reports/reviews/2026-07-10-task-0012-omniroute-fusion-runtime-dispatch-review.md` — score 91/100, HELD_IN_REVIEW_PATH_TO_100; F1 nested options High Debt
- **Related reports considered**:
  - Task 0013 prior review (production wire depends on V2 API completeness)
  - `runtimeUnits.executeComboRefUnit` parity baseline
- **Review mode**: `re-review` (adversarial; nested option claim re-verified on live code)
- **Reviewer profile**: `reviewers` (parent agentID=reviewers)

## Score And Verdict

- **Score**: `88/100`
- **Verdict**: `REJECTED_TO_DOING`
- **Lane recommendation**: `return-to-doing` (move `03-review/` → `02-doing/`)
- **Delta vs prior**: 91 → 88 (−3). Prior High Debt F1 **still unfixed** after re-verification; nested combo-ref is the *core* of this task and remains second-class vs `executeComboRefUnit` baseOptions spread. No path-to-100 work landed.

## Delta Summary

### Resolved Since Previous Review

- none. `comboChatBase` / nested option forwarding **not implemented**.

### Persistent Findings

- `PERSISTENT` F1 (Debt / High): `dispatchFusionUnit` nested `handleComboChat` only passes `{ body, combo, handleSingleModel, log, allCombos, nesting }` — omits `settings`, `isModelAvailable`, `signal`, `relayOptions`, `apiKeyAllowedConnections` that `runtimeUnits.executeComboRefUnit` spreads via `baseOptions` (`runtimeUnits.ts:186-190` vs `fusion.ts:389-396`).
- `PERSISTENT` F2 (Improvement): No dedicated CHANGELOG Task 0012 bullet (`rg "Task 0012" CHANGELOG.md` still empty / not dedicated).
- `PERSISTENT` F3 (Improvement / residual): Single-survivor path re-dispatches unit (double upstream) rather than replaying collected text (`fusion.ts:744-757`).

### Regressions

- none vs prior green suites (all still pass).

### New Findings

- `NEW` F4 (Debt / Medium): **No regression test** asserts nested `handleComboChat` receives parent policy/options fields. Gap is unguarded — will not fail CI if left open.
- `NEW` F5 (Debt / Medium, impact detail of F1): Missing `settings` forces nested `phaseComboSetup` onto `resolveResilienceSettings(null)` defaults (`comboSetup.ts:87-89`) — operator resilience / timeout cascade drift for combo-ref panels under fusion.
- `NEW` F6 (Debt / Medium, impact detail of F1): Missing `signal` means client abort on the outer request does not thread into nested combo-ref panels (resource waste / orphan work).
- `NEW` (Note): Leaf `handleSingleModel` still closes over chat-layer `apiKeyInfo` when production path uses `handleSingleModelWithTimeout` → so hard API-key model policy is not fully bypassed; F1 is **policy/resilience/abort/ordering parity**, not a full auth bypass. Still production-incorrect for nested combo-ref strategies that use `apiKeyAllowedConnections` (reset-aware / headroom / etc.).

### Evidence Gaps / External Blockers

- none — F1 is proven by direct source read, not missing evidence.

## Findings

| ID | Class | Severity | Status | Summary | First seen | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| F1 | PERSISTENT | High | Open | Nested handleComboChat drops base options | 2026-07-10 | `fusion.ts:389-396` vs `runtimeUnits.ts:186-190` |
| F2 | PERSISTENT | Improvement | Open | CHANGELOG Task 0012 missing | 2026-07-10 | CHANGELOG rg |
| F3 | PERSISTENT | Improvement | Open | Single-survivor re-dispatch | 2026-07-10 | `fusion.ts:744-757` |
| F4 | NEW | Medium | Open | No test for nested option forwarding | this reaudit | `fusion-combo-ref-dispatch.test.ts` asserts nesting only |
| F5 | NEW | Medium | Open | Nested settings → resilience defaults | this reaudit | `comboSetup.ts:87-89` |
| F6 | NEW | Medium | Open | Nested signal not threaded | this reaudit | fusion dispatch opts |

## Contract / exit-condition audit

| Exit condition | Status | Proof |
| --- | --- | --- |
| `handleFusionChatV2` exported | ✅ | `fusion.ts:561` |
| Combo-ref panels/judge via handleComboChat + nesting | ✅ | `dispatchFusionUnit` + unit tests |
| Panel body stream:false + tool_choice:none + tools kept | ✅ | tests |
| 400 when combo-ref without handleComboChat | ✅ | tests |
| Legacy handleFusionChat string path | ✅ | delegates to V2 |
| Nesting depth/cycle | ✅ | buildFusionChildNesting + tests |
| Degrade 0→503, 1→re-dispatch | ✅ | tests |
| Nested **option parity** with execute-mode combo-ref | ❌ | F1 — not an explicit exit checkbox, but required for production D3 reuse of handleComboChat |
| CHANGELOG at top | ⚠️ | F2 |
| typecheck / targeted tests | ✅ | exit 0; fusion-combo-ref-dispatch green |

### Nested combo-ref option forwarding (adversarial focus — FAIL)

Live `dispatchFusionUnit` combo-ref branch (`fusion.ts:389-396`):

```ts
return handleComboChat({
  body,
  combo: childCombo,
  handleSingleModel,
  log,
  allCombos,
  nesting: childNesting,
});
```

Compare `executeComboRefUnit` (`runtimeUnits.ts:186-190`):

```ts
return args.runCombo({
  ...args.baseOptions,  // settings, isModelAvailable, signal, relayOptions, apiKeyAllowedConnections, …
  body: args.body,
  combo: childCombo,
  nesting: childNesting,
});
```

`HandleFusionChatOptionsV2` has **no** `comboChatBase` / base-option fields (`fusion.ts:263-283`). `rg comboChatBase open-sse/ tests/` → **0 hits**.

## Production / runtime wiring proof

V2 is live (not dead code):

1. Legacy `handleFusionChat` → V2 (`fusion.ts:852-860`).
2. Production: `chat.ts` → `handleComboChat` → `dispatchFusionStrategy` → `handleFusionChatV2`.
3. Integration matrix exercises model-unit fusion path.
4. Unit + combo-fusion-strategy prove combo-ref dispatch **calls** handleComboChat — but **without** full option set (F1).

## Axiom Compliance (tsjs / omniroute)

| Axiom | Status | Notes |
| --- | --- | --- |
| Boundary integrity | ❌ | Nested combo loses optional policy/settings/abort surface (F1/F5/F6) |
| Async determinism | ✅ | withTimeout + collectPanel |
| Error sanitization | ✅ | errorResponse / sanitizeErrorMessage |
| Contract D3/D9 | ⚠️ | D3 structural reuse yes; D3 *semantic* parity with execute-mode nesting incomplete; D9 panel body OK |

## Evidence Reviewed

- Task + prior 0012 report
- Source: full `open-sse/services/fusion.ts` dispatch path; `runtimeUnits.ts` executeComboRefUnit; `combo/types.ts` HandleComboChatOptions; `comboSetup.ts` settings defaults
- Tests: `tests/unit/fusion-combo-ref-dispatch.test.ts` (15 assertions class), `combo-fusion-strategy`, integration fusion matrix
- Commands:
  ```bash
  node --import tsx/esm --test \
    tests/unit/fusion-combo-ref-dispatch.test.ts \
    tests/unit/combo-fusion-strategy.test.ts \
    tests/unit/fusion-units-resolve.test.ts \
    tests/integration/combo-matrix/fusion.test.ts
  # green within 102-pass combined fusion wave

  npm run typecheck:core  # exit 0
  rg -n "comboChatBase" open-sse/ tests/  # 0 hits
  ```

## Path To 100 (required before re-review ≥90)

1. **F1 primary** — add `comboChatBase?: Pick<HandleComboChatOptions, "settings" | "isModelAvailable" | "relayOptions" | "signal" | "apiKeyAllowedConnections">` (or equivalent) on `HandleFusionChatOptionsV2`; spread into every nested `handleComboChat` in `dispatchFusionUnit` / acting finalize path.
2. **F4** — unit test: nested handleComboChat opts include settings + apiKeyAllowedConnections + signal when provided on V2 options.
3. **Task 0013 companion** — `dispatchFusionStrategy` must thread those fields from `handleComboChat` scope (shared fix).
4. **F2** — CHANGELOG Unreleased bullet for Task 0012.
5. **F3** optional residual — document intentional re-dispatch or optimize later.

### Suggested patch (conceptual)

```ts
// HandleFusionChatOptionsV2
comboChatBase?: Pick<
  HandleComboChatOptions,
  "settings" | "isModelAvailable" | "relayOptions" | "signal" | "apiKeyAllowedConnections"
>;

// dispatchFusionUnit combo-ref branch
return handleComboChat({
  ...args.comboChatBase,
  body,
  combo: childCombo,
  handleSingleModel,
  log,
  allCombos,
  nesting: childNesting,
});
```

## Regression Guards (must preserve while fixing F1)

- Panel body: stream:false, tool_choice:none, tools intact.
- Judge body (no-acting): does not force tool_choice/stream.
- 400 when combo-ref without handleComboChat.
- Cycle/depth guards do not call handleComboChat.
- Mixed model + combo-ref panels both feed judge.
- Legacy string handleFusionChat still works.
- 0 answers → 503; single survivor skips multi-panel judge.

## Task Ledger Patch Suggestion

```markdown
### Latest Review
- Date: 2026-07-16
- Score: 88/100
- Verdict: REJECTED_TO_DOING
- Full report: docs/reports/reviews/2026-07-16-task-0012-omniroute-fusion-runtime-dispatch-reaudit.md
- Lane outcome: returned to doing
```
