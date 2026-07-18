# Return Review: Task 0012 — Fusion Runtime Dispatch — 2026-07-18

## Review Lineage

- **Current task**: Task 0012 (`omniroute-fusion-runtime-dispatch`); live path
  `docs/tasks/03-review/0012-omniroute-fusion-runtime-dispatch.md`
- **Previous reports read** (scores treated as **UNTRUSTED** until re-verified):
  - `2026-07-18-task-0012-omniroute-fusion-runtime-dispatch-review.md` — claimed 100/100
  - `2026-07-16-task-0012-omniroute-fusion-runtime-dispatch-reaudit.md` — 88/100 REJECTED
    (F1 nested option parity open; F4 missing regression unit)
  - `2026-07-10-task-0012-omniroute-fusion-runtime-dispatch-review.md` — 91/100 HELD
- **Related**: Task 0013 wire of `comboChatBase` into production `combo.ts` (peer surface)
- **Review mode**: independent **full re-review** / adversarial return (parent `reviewers`)
- **Reviewer profile**: `OmniRoute Architect` re-reviewer (parent agentID=`reviewers`)
- **Harnesses**: omniroute domain + tsjs/code-quality (live source + tests only)

## Score And Verdict

- **Score**: `100/100`
- **Verdict**: `ACCEPTED_100`
- **Lane recommendation**: `hold-in-review` — leave in `docs/tasks/03-review/`
  (do **not** move to `04-completed/` from this return wave)
- **Delta vs 2026-07-16 reaudit (88)**: **+12** — F1/F2/F4/F5/F6 closed on live FS with
  production + tests + CHANGELOG proof. F3 SUPERSEDED (documented intentional re-dispatch).
- **Delta vs claimed 2026-07-18 100**: **0** — prior 100 claim **confirmed** by independent
  re-verify; not phantom.

## Adversarial Focus (protocol: comboChatBase / nested handleComboChat option parity)

### F1 — Nested option parity vs `executeComboRefUnit` (was High / REJECT root)

**Live proof (PASS):**

1. `FusionComboChatBase = Pick<HandleComboChatOptions, "settings" | "isModelAvailable" | "relayOptions" | "signal" | "apiKeyAllowedConnections">` (`fusion.ts:264-271`).
2. `HandleFusionChatOptionsV2.comboChatBase?: FusionComboChatBase | null` (`fusion.ts:300`).
3. `dispatchFusionUnit` combo-ref branch spreads base **first**, then body/combo/nesting win:

```ts
return handleComboChat({
  ...(comboChatBase ?? {}),
  body,
  combo: childCombo,
  handleSingleModel,
  log,
  allCombos,
  nesting: childNesting,
});
```

(`fusion.ts:427-436`) — mirrors `runtimeUnits.executeComboRefUnit` `...args.baseOptions` (`runtimeUnits.ts:187-192`).

4. **All 8** `dispatchFusionUnit({...})` call sites pass `comboChatBase` (lines 593, 641, 653, 677, 726, 799, 828, 872 — script-verified).
5. Production thread in `combo.ts`:

```ts
const fusionComboChatBase = {
  settings,
  isModelAvailable,
  relayOptions,
  signal,
  apiKeyAllowedConnections,
};
// → handleFusionChatV2({ …, comboChatBase: fusionComboChatBase })  // full fusion + acting-only
```

(`combo.ts:901-925`, `:957`).

### F4 — Regression units (was Medium)

**Live proof (PASS):**

- `tests/unit/fusion-combo-ref-dispatch.test.ts`
  - `V2: comboChatBase settings/signal/acl forward into nested handleComboChat` (panel combo-ref)
  - `V2: comboChatBase also forwards into combo-ref judge handleComboChat`
- Asserts: `settings`, `signal`, `isModelAvailable`, `apiKeyAllowedConnections`, `relayOptions`,
  nesting depth++, body/combo win after spread; judge body does **not** force `tool_choice:"none"`.

### F2 / F3 / F5 / F6

| ID | Status | Proof |
| --- | --- | --- |
| F2 CHANGELOG Task 0012 | `RESOLVED` | `CHANGELOG.md` Unreleased Fixed names **0012 runtime dispatch** + comboChatBase |
| F3 single-survivor re-dispatch | `SUPERSEDED` intentional | `finalizeWithActing` JSDoc (`fusion.ts:567-569`) + FUSION.md stages; test expects re-dispatch |
| F5 settings impact | `RESOLVED` | closed by F1 |
| F6 signal abort | `RESOLVED` | closed by F1 |

## Contract / exit-condition audit (live)

| Exit condition | Status | Evidence |
| --- | --- | --- |
| `handleFusionChatV2` exported | ✅ | `fusion.ts:605` |
| Combo-ref panels → `handleComboChat` + nesting | ✅ | `dispatchFusionUnit` + unit tests |
| Combo-ref judge → `handleComboChat` | ✅ | judge + comboChatBase judge unit |
| Panel body `stream:false` + `tool_choice:"none"` + tools kept | ✅ | `fusion.ts:720-722` + panel-body unit |
| Judge body keeps client stream/tools (no acting) | ✅ | judge unit asserts `tool_choice !== "none"` |
| 400 when combo-ref without `handleComboChat` | ✅ | panel + judge 400 units |
| Nesting depth/cycle → 503 | ✅ | cycle + max-depth units |
| Degrade 0→503, 1→re-dispatch | ✅ | units + F3 docs |
| Legacy `handleFusionChat` string path | ✅ | maps → V2 (`fusion.ts:888-915`) |
| Nested option parity with execute-mode combo-ref | ✅ | F1 closed |
| Targeted tests green | ✅ | **60/60** (dispatch 17 + strategy + resolve + editor-types) |
| `typecheck:core` | ✅ | exit 0 |
| CHANGELOG Task 0012 | ✅ | Unreleased Fixed |

### Anti-hallucination guardrails

| Guardrail | Status |
| --- | --- |
| DO NOT strip tools from panel body | ✅ tools kept; `tool_choice:"none"` only |
| DO NOT reimplement failover inside fusion | ✅ combo-ref → `handleComboChat` (D3) |
| DO NOT modify combo.ts strategy branches (Task 0013) | ✅ 0012 owns fusion.ts; combo.ts thread peer-owned, verified present |
| DO NOT stack second fusion timeout on child | ✅ fusion `withTimeout` at panel call site only |

## Commands run

```bash
node --import tsx/esm --test \
  tests/unit/fusion-combo-ref-dispatch.test.ts \
  tests/unit/combo-fusion-strategy.test.ts \
  tests/unit/fusion-units-resolve.test.ts \
  tests/unit/fusion-editor-types.test.ts
# → 60 pass / 0 fail

npm run typecheck:core
# → exit 0

# structural: all 8 dispatchFusionUnit call sites include comboChatBase → YES
# FusionComboChatBase five-field Pick matches executeComboRefUnit base policy surface
```

## Findings

| ID | Class | Severity | Status | Summary |
| --- | --- | --- | --- | --- |
| F1 | RESOLVED | was High | Closed | Nested `comboChatBase` parity |
| F2 | RESOLVED | was Improvement | Closed | CHANGELOG Task 0012 |
| F3 | SUPERSEDED | Improvement residual | Documented intentional | Single-survivor re-dispatch |
| F4 | RESOLVED | was Medium | Closed | Panel + judge comboChatBase units |
| F5/F6 | RESOLVED | was Medium | Closed | settings/signal via F1 |

### New findings this return

- **none blocking**.
- Optional polish (out of score, not residual):
  1. `satisfies FusionComboChatBase` on `combo.ts` `fusionComboChatBase` (type lock; 0013 surface).
  2. Dedicated acting-unit comboChatBase spy (code path already shares `dispatchFusionUnit`).
  3. Future: reconstruct non-stream Response from collected survivor text (keep re-dispatch for stream/combo-ref).

## Path To 100

**None remaining.** Residual from 88-reject closed; score **100**.

## Regression Guards (must preserve)

- Panel body: `stream:false`, `tool_choice:"none"`, tools array intact.
- Judge body (no acting): does **not** force `tool_choice:"none"` / `stream:false`.
- 400 when combo-ref without `handleComboChat`.
- Nesting depth/cycle → 503 for the unit / all-fail 503.
- Nested `handleComboChat` receives all five `FusionComboChatBase` fields when set; body/combo/nesting win after spread.
- All `dispatchFusionUnit` call sites continue to pass `comboChatBase`.
- Legacy string `handleFusionChat` still fans out models + judge.
- Mixed model + combo-ref panels coexist and both feed the judge.

## Task Ledger Patch

```markdown
### Latest Review
- Date: 2026-07-18
- Reviewer: independent full re-reviewer (parent reviewers)
- Score: 100/100
- Verdict: ACCEPTED_100
- Full report: docs/reports/reviews/2026-07-18-task-0012-omniroute-fusion-runtime-dispatch-return-review.md
- Lane: remain docs/tasks/03-review/
- Open blockers: none
```

---

*Independent full re-review — Task 0012 · 2026-07-18 · parent agentID=`reviewers`*
