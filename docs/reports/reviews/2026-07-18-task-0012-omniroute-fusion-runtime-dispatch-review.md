# Review Report: Task 0012 — Fusion Runtime Dispatch — 2026-07-18

## Review Lineage

- **Current task**: Task 0012 (`omniroute-fusion-runtime-dispatch`); live path at review start `docs/tasks/02-doing/0012-omniroute-fusion-runtime-dispatch.md`
- **Previous reports read**:
  - `docs/reports/reviews/2026-07-16-task-0012-omniroute-fusion-runtime-dispatch-reaudit.md` — 88/100 `REJECTED_TO_DOING` (F1 nested option parity open; F4 missing regression test)
  - `docs/reports/reviews/2026-07-10-task-0012-omniroute-fusion-runtime-dispatch-review.md` — 91/100 `HELD_IN_REVIEW_PATH_TO_100` (F1 High Debt; F3 optional residual if documented)
- **Related reports considered**:
  - Task 0013 production wire of `comboChatBase` into `handleFusionChatV2` (same surface; peer ownership of `combo.ts` threading)
  - `open-sse/services/combo/runtimeUnits.ts` `executeComboRefUnit` baseOptions spread as parity baseline
- **Review mode**: `re-review` / formal gate after expert path-to-100 (builders)
- **Reviewer profile**: `gt-ts-code-reviewer` (parent agentID=`builders`)
- **Harnesses**: `code-quality-harness` + `tsjs-harness` (Tier 3 axiom audit)

## Score And Verdict

- **Score**: `100/100`
- **Verdict**: `ACCEPTED_100`
- **Lane recommendation**: `hold-in-review` → move `02-doing/` → `03-review/` (formal accept; not `04-completed/` unless parent final-gate)
- **Delta vs prior reaudit**: 88 → 100 (+12). All open blockers from 2026-07-16 closed on live FS with production + test + docs proof.

## Delta Summary

### Resolved Since Previous Review

| ID | Class | Proof |
| --- | --- | --- |
| F1 | `RESOLVED` | `FusionComboChatBase` + `HandleFusionChatOptionsV2.comboChatBase`; `dispatchFusionUnit` spreads `...(comboChatBase ?? {})` **before** body/combo/nesting (`fusion.ts:264-271`, `300`, `427-436`). All **8** `dispatchFusionUnit` call sites pass `comboChatBase`. |
| F2 | `RESOLVED` | CHANGELOG Unreleased Fixed: dedicated **0012 runtime dispatch** bullet + expert residual close (`CHANGELOG.md:10-11`, `:20`). |
| F4 | `RESOLVED` | Unit tests: panel + judge nested option forwarding (`fusion-combo-ref-dispatch.test.ts:577-693`). |
| F5 | `RESOLVED` | Closed by F1 — `settings` threaded; nested `phaseComboSetup` no longer forced to null defaults solely due to fusion drop. |
| F6 | `RESOLVED` | Closed by F1 — `signal` threaded into nested `handleComboChat`. |

### Persistent Findings

- none open.

### Regressions

- none. Targeted fusion suites green (60 tests across four files: 17 dispatch + 16 strategy + 16 resolve + 11 editor-types).

### New Findings

- none blocking.
- `SUPERSEDED` / intentional: F3 single-survivor re-dispatch remains by design; documented in `finalizeWithActing` JSDoc (`fusion.ts:567-569`) and `docs/architecture/FUSION.md` (single-survivor + Nested combo base options). Prior 2026-07-10 path-to-100 explicitly: **not required for 100 if documented as intentional**.

### Evidence Gaps / External Blockers

- none.

## Findings

| ID | Class | Severity | Status | Summary | Evidence |
| --- | --- | --- | --- | --- | --- |
| F1 | RESOLVED | was High Debt | Closed | Nested handleComboChat option parity | `fusion.ts:427-436` + `combo.ts:901-925` |
| F2 | RESOLVED | was Improvement | Closed | CHANGELOG Task 0012 | `CHANGELOG.md:10-11,20` |
| F3 | SUPERSEDED | Improvement residual | Documented intentional | Single-survivor re-dispatch | `fusion.ts:567-569`, FUSION.md, test asserts `>= 2` calls |
| F4 | RESOLVED | was Medium Debt | Closed | comboChatBase regression units | `fusion-combo-ref-dispatch.test.ts:577-693` |
| F5/F6 | RESOLVED | was Medium | Closed | settings/signal impact of F1 | same as F1 |

## Contract / exit-condition audit

| Exit condition | Status | Proof |
| --- | --- | --- |
| `handleFusionChatV2` exported | ✅ | `fusion.ts:605` |
| Combo-ref panels via `handleComboChat` + nesting | ✅ | `dispatchFusionUnit` + unit tests |
| Combo-ref judge via `handleComboChat` | ✅ | judge unit + comboChatBase judge unit |
| Panel body `stream:false` + `tool_choice:"none"` + tools kept | ✅ | `fusion.ts:720-722` + panel-body unit |
| Judge body keeps client stream/tools (no acting) | ✅ | judge comboChatBase unit asserts `tool_choice !== "none"` |
| 400 when combo-ref without `handleComboChat` | ✅ | panel + judge units |
| Nesting depth/cycle → 503 paths | ✅ | cycle + max-depth units |
| Degrade 0→503, 1→re-dispatch | ✅ | units |
| Legacy `handleFusionChat` string path | ✅ | maps → V2; legacy unit |
| Nested **option parity** with execute-mode combo-ref | ✅ | F1 closed; mirrors `executeComboRefUnit` baseOptions |
| `combo-fusion-strategy` regression | ✅ | 16/16 pass incl. combo-ref panel not dropped |
| New `fusion-combo-ref-dispatch` tests | ✅ | 17/17 pass |
| `typecheck:core` | ✅ | exit 0 |
| CHANGELOG at top / Task 0012 named | ✅ | Unreleased Fixed |

### Anti-hallucination guardrails (task CAUTION)

| Guardrail | Status |
| --- | --- |
| DO NOT strip tools from panel body | ✅ tools kept; `tool_choice: "none"` only |
| DO NOT reimplement failover inside fusion | ✅ combo-ref → `handleComboChat` (D3) |
| DO NOT modify combo.ts dispatch branches (Task 0013) | ✅ 0012 owns fusion.ts; combo.ts threading is 0013 peer (verified present, not re-authored here) |
| DO NOT stack second fusion-level timeout on child | ✅ fusion owns `withTimeout` at panel call site only |

## Production / runtime wiring proof

```
src/sse/handlers/chat.ts
  → handleComboChat (open-sse/services/combo.ts)
    → nestingContext + fusionComboChatBase { settings, isModelAvailable, relayOptions, signal, apiKeyAllowedConnections }
    → dispatchFusionStrategy() | dispatchActingOnly()
      → handleFusionChatV2({ …, nesting, comboChatBase, handleComboChat })
        → withTimeout(dispatchFusionUnit(panelBody | judgeBody | actingBody, unit), panelHardTimeoutMs)
          → kind "model": handleSingleModel(body, model)
          → kind "combo-ref":
               buildFusionChildNesting | 503 Response
               handleComboChat({ ...comboChatBase, body, combo, handleSingleModel, log, allCombos, nesting })
```

Live FS confirmation:

1. `combo.ts:901-907` builds `fusionComboChatBase`; `:925` / `:957` pass into full fusion + acting-only.
2. Legacy `handleFusionChat` → V2 without combo-ref params (`fusion.ts:888-915`) — correct string-only surface.
3. Integration path for model panels remains via combo strategy tests + prior matrix; combo-ref fan-out proven by `combo-fusion-strategy` nested priority leaf + V2 unit matrix.

## Axiom Compliance (tsjs)

| Axiom | Status | Notes |
| --- | --- | --- |
| Type Purity | ✅ | `FusionComboChatBase = Pick<HandleComboChatOptions, …>` — structural, no `any` at V2 boundary; pre-existing response JSON `as` casts in `extractPanelText` unchanged and out of task scope |
| Boundary Integrity | ✅ | Nested combo inherits parent policy/ACL/abort (F1 closed) |
| Async Determinism | ✅ | `withTimeout` + `collectPanel` quorum-grace; rejections → sentinel, not floating unhandled |
| Immutability | ✅ | Panel body constructed once via spread; messages cloned in `appendUserTurn` |
| State Exclusivity | ✅ | `ResolvedFusionUnit` discriminated union (`kind: "model" \| "combo-ref"`) drives dispatch |

## Evidence Reviewed

- Task ledger + Completion Evidence (2026-07-18 expert re-verify claims)
- Source: `open-sse/services/fusion.ts` (dispatch path + V2 + legacy), `open-sse/services/combo.ts:882-961`, `open-sse/services/combo/runtimeUnits.ts:172-192`, `open-sse/services/combo/types.ts` (`HandleComboChatOptions`)
- Docs: `docs/architecture/FUSION.md` Nested combo base options + panel body ownership
- Tests: `tests/unit/fusion-combo-ref-dispatch.test.ts`, `combo-fusion-strategy.test.ts`, `fusion-units-resolve.test.ts`, `fusion-editor-types.test.ts`
- CHANGELOG Unreleased Fixed

### Commands run

```bash
node --import tsx/esm --test \
  tests/unit/fusion-combo-ref-dispatch.test.ts \
  tests/unit/combo-fusion-strategy.test.ts \
  tests/unit/fusion-units-resolve.test.ts
# → 49 pass / 0 fail

node --import tsx/esm --test tests/unit/fusion-editor-types.test.ts
# → 11 pass / 0 fail
# combined fusion-related wave: 60/60

npm run typecheck:core
# → exit 0

# structural: all 8 dispatchFusionUnit call sites include comboChatBase
# rg comboChatBase open-sse/services/fusion.ts open-sse/services/combo.ts → live hits
```

### Commands not run and why

- Full `npm run lint` / full `test:unit` — scoped re-review; typecheck + targeted fusion suites sufficient given prior green wave and no new lint surfaces.
- Live VPS / :21000 — forbidden; production wiring proven from source + unit/strategy tests.

## Path To 100

**None remaining.** Score is 100.

Optional future polish (out of score / not blockers):

1. Reconstruct Response from collected panel text on single-survivor when `stream:false` (F3 perf; keep re-dispatch for `stream:true` / combo-ref failover).
2. `satisfies FusionComboChatBase` on `combo.ts` `fusionComboChatBase` object (type lock; Task 0013 surface).

## Regression Guards (must preserve)

- Panel body: `stream:false`, `tool_choice:"none"`, tools array intact.
- Judge body (no acting): does **not** force `tool_choice:"none"` / `stream:false`.
- 400 when combo-ref without `handleComboChat`.
- Nesting depth/cycle → 503 for the unit / all-fail 503.
- Nested `handleComboChat` receives `settings` + `signal` + `apiKeyAllowedConnections` + `relayOptions` + `isModelAvailable` when `comboChatBase` set; body/combo/nesting win after spread.
- Legacy string `handleFusionChat` still fans out models + judge.
- Mixed model + combo-ref panels coexist and both feed the judge.

## Task Ledger Patch Suggestion

```markdown
### Latest Review
- **Date**: 2026-07-18
- **Reviewer profile**: `gt-ts-code-reviewer` (builders)
- **Score**: `100/100`
- **Verdict**: `ACCEPTED_100`
- **Full report**: `docs/reports/reviews/2026-07-18-task-0012-omniroute-fusion-runtime-dispatch-review.md`
- **Lane outcome**: move `02-doing/` → `03-review/`
```

---

*Formal re-review — gt-ts-code-reviewer · Task 0012 · 2026-07-18*
