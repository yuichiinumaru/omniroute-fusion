# Review Report: Task 0012 — Fusion Runtime Dispatch — 2026-07-10

## Review Lineage

- **Current task**: Task 0012 (`omniroute-fusion-runtime-dispatch`); live path `docs/tasks/03-review/0012-omniroute-fusion-runtime-dispatch.md`
- **Previous reports read**: none found (`docs/reports/reviews/*0012*` empty at review start)
- **Related reports considered**:
  - Task 0013 review (same wave) — production combo.ts branch wire depends on this V2 API
  - Task 0011 resolution layer (resolveFusionUnits) — consumed by 0012/0013
- **Review mode**: `initial`
- **Reviewer profile**: `reviewers` (lane: `gt-omniroute-architect` + tsjs)
- **Parent agentID**: `reviewers`

## Score And Verdict

- **Score**: `91/100`
- **Verdict**: `HELD_IN_REVIEW_PATH_TO_100`
- **Lane recommendation**: `hold-in-review` (stay `03-review/`; **not** `04-completed/`)
- **Score routing applied**: S ≥ 90 → APPROVE with path-to-100; do not promote to completed until residual debt closed or parent final gate accepts residual

## Delta Summary

### Resolved Since Previous Review
- N/A (initial review).

### Persistent Findings
- none

### Regressions
- none

### New Findings
- `NEW` F1: combo-ref nested `handleComboChat` omits parent `settings` / `isModelAvailable` / `signal` / `relayOptions` / `apiKeyAllowedConnections` (parity gap vs `runtimeUnits.executeComboRefUnit`).
- `NEW` F2: dedicated CHANGELOG entry for Task 0012 missing (0013/0018/epic narrative cover runtime partially).
- `NEW` F3 (improvement): single-survivor path re-dispatches the unit (extra upstream call) rather than replaying collected text — pre-existing fusion design, still wasteful for combo-ref panels.

### Evidence Gaps / External Blockers
- none. Production fan-out for model panels proven via integration matrix + unit matrix; combo-ref proven via unit + combo-strategy tests (mocked/nested priority leaf).

## Findings

| ID | Class | Severity | Status | Summary | First seen | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| F1 | NEW | Debt (High) | Open | Nested combo-ref dispatch does not forward full `HandleComboChatOptions` base fields | 2026-07-10 this report | `open-sse/services/fusion.ts:389-396` vs `runtimeUnits.ts:116-120` |
| F2 | NEW | Improvement | Open | No dedicated `CHANGELOG` Task 0012 bullet (exit checklist claimed one) | 2026-07-10 | `rg "Task 0012" CHANGELOG.md` → 0 hits |
| F3 | NEW | Improvement | Open (accepted residual) | Single-survivor re-dispatch double-invokes unit | 2026-07-10 | `fusion.ts:744-757`; test asserts `>= 2` calls |

### Contract / exit-condition audit

| Exit condition | Status | Proof |
| --- | --- | --- |
| `handleFusionChatV2` exported | ✅ | `fusion.ts:561` |
| Combo-ref panels via `handleComboChat` + nesting | ✅ | `dispatchFusionUnit` + tests |
| Combo-ref judge via `handleComboChat` | ✅ | V2 judge test |
| Panel body `stream:false` + `tool_choice:"none"` + tools kept | ✅ | unit + combo-fusion tests |
| 400 when combo-ref without `handleComboChat` | ✅ | panel + judge tests |
| Legacy `handleFusionChat` string path works | ✅ | delegates to V2 |
| Nesting depth/cycle → unit 503 / all-fail 503 | ✅ | cycle + depth tests |
| Degrade 0→503, 1→direct re-dispatch | ✅ | tests |
| Existing `combo-fusion-strategy` unmodified behavior | ✅ | 11/11 pass incl. regressions |
| New `fusion-combo-ref-dispatch` tests | ✅ | 15/15 pass |
| `typecheck:core` | ✅ | exit 0 |
| CHANGELOG at top | ⚠️ | no dedicated 0012 entry (F2) |

### Axiom Compliance (tsjs / omniroute)

| Axiom | Status | Notes |
| --- | --- | --- |
| Boundary integrity | ⚠️ | Nested combo loses optional policy/settings surface (F1); leaf `handleSingleModel` still closes over API-key context in production chat |
| Async determinism | ✅ | `withTimeout` + `collectPanel` quorum-grace; no unhandled rejection paths (catch → sentinel) |
| Error sanitization | ✅ | `errorResponse` / `sanitizeErrorMessage` only in fusion logs |
| No secrets | ✅ | no credential literals |
| Contract (D3/D9) | ✅ | reuses `handleComboChat` for failover; tools kept, `tool_choice:"none"` on panels; judge keeps client flags |

## Production / runtime wiring proof

**Task 0012 scope is the fusion service layer** (not combo.ts — Task 0013). Proof that V2 is the live dispatch core:

1. `handleFusionChat` (legacy) → maps strings → `handleFusionChatV2` (`fusion.ts:852-860`).
2. Task 0013 production path (verified same wave):  
   `src/sse/handlers/chat.ts` → `handleComboChat` → `dispatchFusionStrategy()` → `handleFusionChatV2` with `handleComboChat` self-ref.
3. Integration matrix (`tests/integration/combo-matrix/fusion.test.ts`) logs:

```
Combo "m-fusion" [fusion]
FUSION | panel=3 […] | judge=…
ROUTING Provider: openai/claude/gemini (parallel panel)
FUSION fan-out collected …
FUSION Judging 3 answers with …
```

That is full production entry through chat SSE stack into fusion fan-out + judge — model units. Combo-ref unit dispatch is unit-proven against `dispatchFusionUnit` + end-to-end via `combo-fusion-strategy` nested priority leaf.

### Call chain (combo-ref unit)

```
handleFusionChatV2
  → withTimeout(dispatchFusionUnit(panelBody, unit), panelHardTimeoutMs)
    → kind "model": handleSingleModel(body, model)
    → kind "combo-ref":
         buildFusionChildNesting (depth/cycle) | 503 Response
         handleComboChat({ body, combo, handleSingleModel, log, allCombos, nesting })
  → collectPanel → answers
  → 0 → 503 | 1 → re-dispatch unit with original body | N → judge dispatchFusionUnit(judgeBody)
```

## Evidence Reviewed

- Task: `docs/tasks/03-review/0012-omniroute-fusion-runtime-dispatch.md`
- Source: `open-sse/services/fusion.ts` (full)
- Compare: `open-sse/services/combo/runtimeUnits.ts` (`executeComboRefUnit`, `buildChildNestingContext`)
- Types: `open-sse/services/combo/types.ts` (`HandleComboChatOptions`, `ComboNestingContext`)
- Tests: `tests/unit/fusion-combo-ref-dispatch.test.ts`, `fusion-units-resolve.test.ts`, `combo-fusion-strategy.test.ts`, `tests/integration/combo-matrix/fusion.test.ts`
- Wiring peer: `open-sse/services/combo.ts` (imports + `dispatchFusionStrategy` — Task 0013 ownership)

### Commands run

```bash
node --import tsx/esm --test \
  tests/unit/fusion-combo-ref-dispatch.test.ts \
  tests/unit/combo-fusion-strategy.test.ts \
  tests/unit/fusion-units-resolve.test.ts \
  tests/integration/combo-matrix/fusion.test.ts
# → 42 pass / 0 fail

npm run typecheck:core
# → exit 0
```

### Commands not run and why

- Full `npm run lint` / `test:unit` — scoped review; targeted eslint not required after green typecheck + focused suites.
- Live VPS smoke — integration matrix already exercises local production chat path with scripted providers.

## Path To 100

1. **F1 (primary)** — extend `HandleFusionChatOptionsV2` with optional nested base fields (or a single `comboChatBase?: Partial<HandleComboChatOptions>`), pass them from `dispatchFusionStrategy` in combo.ts, and spread into nested `handleComboChat` exactly like `executeComboRefUnit` spreads `baseOptions`.
2. **F2** — add Unreleased CHANGELOG bullet for Task 0012 multi-unit runtime dispatch (or explicitly fold under 0013 with cross-ref if intentional).
3. **F3 (optional residual)** — for single-survivor model units only, reconstruct a Response from collected text when client `stream:false`; keep re-dispatch when `stream:true` or combo-ref (streaming/failover needs live call). Not required for 100 if documented as intentional.

### Suggested patch (F1) — conceptual

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

// combo.ts dispatchFusionStrategy
return handleFusionChatV2({
  …,
  comboChatBase: {
    settings,
    isModelAvailable,
    relayOptions,
    signal,
    apiKeyAllowedConnections,
  },
});
```

Add test: nested `handleComboChat` opts include `settings` and `apiKeyAllowedConnections` when provided.

## Regression Guards (must preserve on path-to-100)

- Panel body: `stream:false`, `tool_choice:"none"`, tools array intact.
- Judge body: does **not** force `tool_choice:"none"` / `stream:false` (no-acting path).
- 400 when combo-ref without `handleComboChat`.
- Cycle/depth guards do not call `handleComboChat`.
- Mixed model + combo-ref panels both feed judge.
- Legacy `handleFusionChat` string models still work.
- 0 answers → 503; single survivor skips judge.

## Task Ledger Patch Suggestion

```markdown
## Review Ledger
### Latest Review
- Date: 2026-07-10
- Score: 91/100
- Verdict: HELD_IN_REVIEW_PATH_TO_100
- Full report: docs/reports/reviews/2026-07-10-task-0012-omniroute-fusion-runtime-dispatch-review.md
- Lane: remains 03-review
```
