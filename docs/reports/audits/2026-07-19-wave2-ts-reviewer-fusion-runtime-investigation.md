# Wave 2 TS Reviewer — Fusion Runtime Investigation

> **Date**: 2026-07-19  
> **Agent**: gt-ts-code-reviewer (Tier 3 adversarial)  
> **Parent**: architect-orchestrator Wave 2 — verify residual hypotheses (not a PR scorecard)  
> **Scope**: Fusion / conditional-fusion runtime, acting miss path, triggers, nesting, resilience interaction  
> **Method**: Read code graph + unit tests; adversarial simulation of miss / sticky trigger / single-survivor / parallel fan-out; no product edits

---

## 1. Method / files read

### Primary runtime

| File | Lines / areas |
|------|----------------|
| `open-sse/services/combo.ts` | Nesting build ~882–891; `fusionComboChatBase` ~899–907; `dispatchFusionStrategy` ~909–930; `dispatchActingOnly` ~932–961; gate `fusion`/`conditional-fusion` ~963–1008 |
| `open-sse/services/fusion.ts` | `withTimeout` / `collectPanel` ~174–238; `buildFusionChildNesting` / `dispatchFusionUnit` ~355–437; `resolveFusionUnits` ~522–547; `finalizeWithActing` ~570–603; `handleFusionChatV2` ~605–882 (single-panel, fan-out, single-survivor, judge+acting, legacy judge) |
| `open-sse/services/fusionTriggers.ts` | Full module — globs, `hasMatchingToolCall`, `hasMatchingText`, `shouldTriggerFusion`, D8 fallback, `fusionStrategyHasConditionalTriggers` |
| `open-sse/services/combo/comboPredicates.ts` | `MAX_COMBO_DEPTH` (3), `MAX_COMBO_DEPTH_HARD_CAP` (10), `clampComboDepth` |
| `open-sse/services/combo/comboStructure.ts` | `validateComboDAG` walks `models` + top-level `judge` / `acting` (~326–371) |

### UI / dual-form storage

| File | Relevance |
|------|-----------|
| `src/app/(dashboard)/dashboard/fusions/fusionEditorTypes.ts` | `formFromCombo`, `buildSavePayload` (mode → strategy rewrite; `requireApproval: false`) |
| `src/app/(dashboard)/dashboard/fusions/page.tsx` | List shell — strategy badge + panel count; **no** acting surface |
| `src/app/(dashboard)/dashboard/fusions/FusionUnitsSections.tsx` | Editor acting section |
| `src/app/(dashboard)/dashboard/fusions/FusionUnitRow.tsx` | Soft “fusion child” label on combo-ref options |
| `src/shared/validation/schemas/combo.ts` | `requireApproval` default; D8 (via contracts tests) |

### Tests grepped / sampled

| File | What it proves |
|------|----------------|
| `tests/unit/combo-fusion-strategy.test.ts` | Trigger hit/miss, D8 forbidden fallbacks, shared-object immutability, gated `strategy: fusion` — **zero `acting` / A6 cases** |
| `tests/unit/fusion-acting.test.ts` | Resolve acting; V2 handoff panels→judge→acting; 400 on combo-ref without `handleComboChat` — **no combo.ts gate** |
| `tests/unit/fusion-triggers.test.ts` | Modes, last-assistant tool_calls selection, D8, gated fusion triggers |
| `tests/unit/fusion-combo-ref-dispatch.test.ts` | Single-panel short-circuit; **single-survivor re-dispatch count ≥ 2**; nesting base options |
| `tests/unit/fusion-contracts.test.ts` | Schema triggers / fallbackStrategy / requireApproval default |
| `tests/unit/fusion-editor-types.test.ts` | Save maps tool-call → `conditional-fusion` + fallback |

### Docs (context only)

- `docs/reports/audits/2026-07-19-omniroute-architect-fusion-residual-audit.md` (hypotheses)  
- `docs/architecture/FUSION.md` (A6 / single-survivor F3 notes)

---

## 2. Per-hypothesis verdict table

| ID | Verdict | Sev | Evidence | Impact |
|----|---------|-----|----------|--------|
| **H-FUSION-003** | **CONFIRMED** | **P1** | `tests/unit/combo-fusion-strategy.test.ts`: full-file grep for `acting` / `dispatchActingOnly` / A6 → **0 hits**. Miss path tests only cover **no-acting → fallback** (~312–341, ~344–374). Gate implementation exists at `combo.ts:994–996` + `dispatchActingOnly` `939–960`. Unit coverage for acting is **only** `tests/unit/fusion-acting.test.ts` (direct `handleFusionChatV2`, not the combo gate). | Regression in miss→acting can ship green under current combo suite. Highest test residual for Epic 0004 closeout. |
| **H-FUSION-004** | **CONFIRMED** (comment bug + intentional V2 shortcut; runtime mostly sound) | **P2** | **Comment contradiction**: block header `combo.ts:932–937` claims “one-panel handleFusionChatV2 shortcut is **NOT** used” / “direct nested dispatch”; body `944–960` **does** call `handleFusionChatV2({ panels: [acting], judge: acting /* no acting */ })`. **Actual path**: V2 single-panel branch `fusion.ts:638–650` → `dispatchFusionUnit` with **original client `body`** (stream/tools preserved). Nesting = shared `nestingContext` (`combo.ts:885–891`); `comboChatBase` (settings/signal/ACL) forwarded (`901–907`, `957`). **Not** a second fusion fan-out: `panel.length === 1` short-circuits before judge/quorum. | Behavior matches A6 intent (one dispatch, client body). Risk is **maintainability**: comment lies; future change to single-panel or judge-required logic could invoke `judge: acting` unexpectedly. Prefer thin `dispatchFusionUnit` wrapper or fix comments + add combo-level tests. |
| **H-FUSION-005** | **CONFIRMED** | **P2** | Documented intentional F3: `fusion.ts:566–568`, single-survivor `finalWithoutActing` re-`dispatchFusionUnit` with client body `798–808`. Test asserts double call: `fusion-combo-ref-dispatch.test.ts:479–501` (`seen.filter(m === "p/ok").length >= 2`). With **acting** set: survivor text handed off once; **no** third panel re-dispatch (`794–815` + `finalizeWithActing`). | 2× cost/latency/tokens on single-survivor without acting. Second call can fail (429/5xx) after first success → client error **despite** usable collected prose (no synthesize-from-text path). Cooldown/breaker: second failure can cool an account that just succeeded. |
| **H-FUSION-006** | **CONFIRMED** | **P2** (product) | Miss without acting: local `strategy = resolveFusionFallbackStrategy(...)` then fall-through (`combo.ts:998–1008`) with **same** `combo.models` / targets. Explicitly tested as “priority fallback should hit a panel model” (`combo-fusion-strategy.test.ts:330–335`). No separate cheap-fallback model field. D8 only forbids fusion-family fallback strategies. | Operators expecting “miss → cheap dedicated model” get “miss → same panel list under priority/weighted/…”. Surprising cost if panels are expensive combo-refs. Document/UI must stay explicit (FUSION.md A6 already describes this; list/editor can reinforce). |
| **H-FUSION-007** | **CONFIRMED** (bounded, still multiplicative) | **P2** | Depth: `MAX_COMBO_DEPTH = 3`, hard cap 10 (`comboPredicates.ts:100–117`). Runtime: `buildFusionChildNesting` (`fusion.ts:355–369`) 503 on depth/cycle. Create-time: `validateComboDAG` walks models + `judge` + `acting` (`comboStructure.ts:326–371`). UI soft warning only (`FusionUnitRow.tsx:230–238` fusion child label). **Width × depth**: each fusion level fans panels **in parallel**; combo-ref panel that is itself fusion multiplies upstream calls (e.g. 3×3×3 leaf pressure within depth). | Not unbounded explosion (depth/cycle guards work). Still a **cost/DoS footgun** if operators nest fusion→fusion; soft UI guidance only. |
| **H-FUSION-008** | **CONFIRMED** (stronger than “after write”) | **P2** | `hasMatchingToolCall` (`fusionTriggers.ts:56–84`): walks **backwards** to the **most recent assistant message that has `tool_calls`**, then glob-matches names. Tests codify “last tool_calls-bearing assistant wins” (`fusion-triggers.test.ts:83–99`). **Does not** mean “client is about to write”. **Sticky residual**: if a later assistant replies **without** `tool_calls`, the prior matching write remains the last tool_calls message → **subsequent user turns still trigger fusion** until a newer tool_calls message appears. Default patterns `write*`/`edit*`/`create*` (`DEFAULT_FUSION_TOOL_PATTERNS`). text-match is latest-user substring only (not sticky across roles). | Semantic surprise for agent loops: (1) fusion tends to fire on the turn **after** a write-shaped tool proposal is already in history, not “before write”; (2) fusion cost can stick on ordinary follow-up chat after a write tool turn. Operator mental model vs implementation mismatch. |
| **H-FUSION-009** | **CONFIRMED** | **P3** | Schema default `requireApproval: false` (contracts test). UI always writes `requireApproval: false` (`fusionEditorTypes.ts:320`). `shouldTriggerFusion` never reads it. Cloud-agents page has unrelated `requireApproval` UI. | Dead config / reserved field. Noise in saved JSON; false sense of a product gate. |
| **H-FUSION-010** | **CONFIRMED** | **P3** | List `page.tsx`: `FusionCombo` type has name/strategy/models only; badges = strategy + `panelCount`. Editor has `fusion-acting` (`FusionUnitsSections.tsx`). | Ops discoverability only; no runtime defect. |
| **H-FUSION-014** | **CONFIRMED** | **P2** | Fan-out: N parallel `dispatchFusionUnit` with shared providers (`fusion.ts:724–738`). **No abort on fusion timeout**: `withTimeout` (`174–190`) resolves timeout sentinel; **loser promise keeps running** (“ignored”). `collectPanel` finishes on quorum-grace/hard timer without cancelling stragglers (`201–237`). Late failures still flow through normal single-model / account cooldown / breaker paths. **All panels failed → 503**, even if `acting` is set (`785–787`) — acting is **not** a total-failure degrade path (only trigger-miss A6 and successful-review handoff). | N-wide blast radius: simultaneous 429/5xx → multi-connection cooldown / provider breaker pressure; orphaned upstream work after grace/timeout still burns quota and can poison accounts after fusion already moved on. No “panels dead → acting only” product option. |
| **H-FUSION-015** | **CONFIRMED** | **P3** | Judge-for-acting branch (`fusion.ts:821–854`): empty/non-ok judge → concatenate panel texts as review, **warn log only**, then `finalizeWithActing`. Client sees acting success (200) with no judge-failure status surface. | Opaque degrade: operators need logs (`Judge … produced no text`) / metrics; clients cannot distinguish “judge failed, panels concatenated” from healthy fusion. Quality risk if acting trusts weak review. |
| **H-FUSION-016** | **PARTIAL** (dual form real; load/save mostly consistent) | **P3** | **Runtime** accepts both: `strategy === "fusion"` + non-always triggers gated via `fusionStrategyHasConditionalTriggers` (`combo.ts:971–978`, `fusionTriggers.ts:194–199`). **UI save** normalizes non-always → `strategy: "conditional-fusion"` (`buildSavePayload` `290–291`, `314–333`). **Load** prefers `triggers.mode`; if missing and strategy is `conditional-fusion`, defaults `tool-call` (`formFromCombo` `206–212`). Manual/API combos can remain `fusion` + `triggers.mode: tool-call` until re-save → list badge says “Fusion” while behavior is conditional. Round-trip via editor collapses dual form. | Low functional risk (runtime unifies). Label/export/list inconsistency until re-save; dual mental model for operators/API authors. |

### Minor skim (H-009 / H-010)

Covered in table above: both **CONFIRMED**, P3 only.

---

## 3. Adversarial simulation notes (Tier 3)

### 3.1 Trigger miss + acting (A6)

1. Gate applies (`conditional-fusion` or gated fusion).  
2. `shouldTriggerFusion` false → `dispatchActingOnly`.  
3. Resolves `acting`; if null → fallback strategy.  
4. Synthetic V2 single panel → one `dispatchFusionUnit` with client body.  

**Invariant**: no panel fan-out, no judge, `combo.strategy` immutable — **implemented**, **untested at combo wire**.

### 3.2 Malicious / surprising body shapes

| Input | Outcome |
|-------|---------|
| Assistant history with old `write_file` + later plain assistant text + new user chat | **tool-call still matches** (sticky last tool_calls) |
| `tool_calls` with bare `name` (non-function shape) | Matched via `call.name` (`fusionTriggers.ts:74–79`) |
| Empty `textPatterns` in text-match | Never matches (fail closed for expensive path) |
| Unknown `triggers.mode` | `shouldTriggerFusion` false (`168–169`) |
| Forbidden `fallbackStrategy: "fusion"` | Collapses to `"priority"` at runtime (D8) |

### 3.3 Race / event-loop

- Parallel panels: intentional.  
- **Orphaned work after `collectPanel` finish** is the dominant race: late panel failures still mutate resilience state after the fusion decision advanced.  
- Single-survivor re-dispatch: TOCTOU between collect success and second call (quota/breaker).

### 3.4 Closure / memory

- `collectPanel` retains Response objects in sparse array until finish; panel JSON cloned for text extract. Acceptable for N small panels; combo-ref nested fusion multiplies retained work while stragglers run.

### 3.5 Type / assertion hygiene (brief)

- Multiple `as Record` / `as FusionTriggersConfig` at combo config boundary with `// SAFETY:` comments — consistent with Zod-at-write + loose runtime bag.  
- `strategy = fallback as typeof strategy` (`combo.ts:1008`) — local only; D8-guarded.  
- Not a blocking type-safety crisis for this residual set.

---

## 4. Additional issues found (beyond parent list)

| Sev | Issue | Evidence | Why it matters |
|-----|--------|----------|----------------|
| **P2** | **Sticky tool-call trigger** across post-tool chat turns | `fusionTriggers.ts:62–82`; after write tool_calls, any later turn without a newer tool_calls message re-fires fusion | Stronger than H-008’s original “after write once”; can make conditional-fusion **de facto always-on** for multi-turn sessions that keep history |
| **P2** | **`withTimeout` / quorum-grace never aborts panel upstream** | `fusion.ts:174–190`, `201–237` | Silent cost after drop; late 5xx/429 still cools accounts → amplifies H-014 |
| **P2** | **Total panel failure ignores acting** | `fusion.ts:785–787` vs A6 miss-only acting | With acting configured, operators may expect a final voice even when panel pool is dead; today hard 503 |
| **P2** | **Single-survivor second call can fail after successful collect** | `798–808`; no “return collected text as JSON/SSE” fallback | Client-visible error when text already in hand; F3 residual is worse than pure 2× cost |
| **P3** | **`dispatchActingOnly` JSDoc actively wrong** | `combo.ts:932–937` vs `948–960` | Increases probability of “fix” that breaks A6 |
| **P3** | **Depth guards do not limit fusion panel width** | Fan-out = `panel.length`; only nesting depth capped | N=10 same-provider panels still concurrent under depth 0 |
| **P3** | **validateComboDAG does not walk `config.judgeModel` as combo-ref** | Only `combo.judge` / `combo.acting` extras (`comboStructure.ts:361`) | Low risk: `judgeModel` is legacy **string** model id; combo-ref judges should be top-level `judge` |

---

## 5. Residual risks

1. **Epic 0004 closeout blocked on proof, not skeleton** — runtime A6 exists; combo-level regression suite does not.  
2. **Conditional-fusion cost control is weaker than operators assume** if tool-call mode is sticky in long agent histories.  
3. **Resilience amplification** under multi-panel shared provider is structural (no isolation / no abort-on-drop / no acting-on-total-fail).  
4. **Nested fusion** remains an operator footgun (soft UI only).  
5. **Observability gaps**: judge-empty degrade and orphaned panel failures are log-centric; client and metrics surfaces are thin.  
6. **Dual strategy form** is runtime-safe but confuses list badges / exports until UI re-save.

---

## 6. Recommended remediation themes (not tasks)

Ordered by leverage for correctness / cost / closeout — themes only:

### T1 — Combo-level A6 contract tests (closes H-003; hardens H-004)

- Extend `combo-fusion-strategy` (or sibling):  
  - miss + acting model → **exactly one** leaf call to acting; **zero** panel/judge; `combo.strategy` unchanged.  
  - miss + acting combo-ref → nested `handleComboChat` once with client stream/tools.  
  - miss + no acting → fallback strategy on panel models (existing).  
  - hit + acting → panels + judge + acting (wire-level, not only pure V2).

### T2 — Make acting-only dispatch honest

- Either: call `dispatchFusionUnit` directly from `dispatchActingOnly` (true “direct nested dispatch”), **or** keep V2 shortcut but **rewrite comments** to match.  
- Prefer direct unit dispatch to remove `judge: acting` landmine.

### T3 — Tool-call trigger semantics product decision

Pick and encode one of:

- **Sticky (current)** — document aggressively in FUSION.md + editor help.  
- **Windowed** — only last message / only last assistant turn / only if latest assistant has tool_calls.  
- **Pending-tool-use** — match only when the newest assistant message still has unmatched tool_calls (no following tool results for those ids).

Add unit matrix for multi-turn histories (write → tool result → plain assistant → user follow-up).

### T4 — Single-survivor / timeout economics

- Prefer synthesize final Response from already-collected text when client `stream:false` (or always for non-stream), keeping re-dispatch only when client needs stream/tools the first call stripped.  
- On `panelHardTimeoutMs` / straggler drop: **abort** panel `AbortController`s (thread signals into `dispatchFusionUnit` / `handleSingleModelWithTimeout`) so losers stop billing and stop tripping breakers late.

### T5 — Failure policy with acting

- Product option or default: when `acting` set and `answers.length === 0`, degrade to acting-only with empty/synthetic review rather than hard 503.  
- Surface judge-degrade via response header or structured log metric (not only `log.warn`).

### T6 — Operator clarity (H-006 / H-010 / H-016)

- List badges: acting present, trigger mode, gated-vs-unconditional.  
- Editor copy: fallback **reuses panel models**.  
- Optional normalize-on-read: persist `conditional-fusion` when loading gated fusion.

### T7 — Nesting / width

- Soft → harder guardrails: warn or reject fusion-strategy children at save; optional max concurrent panel budget separate from depth.  
- Keep DAG walk for judge/acting (already good).

### T8 — requireApproval

- Remove from schema/UI save, or implement a real gate, or mark `@deprecated` reserved in schema docs only — avoid silent always-false field.

---

## 7. Verdict summary for parent orchestrator

| Bucket | IDs |
|--------|-----|
| **Must treat as real residual** | H-003, H-004 (docs/impl honesty), H-005, H-006, H-007, H-008 (+ sticky extension), H-014, H-015 |
| **Hygiene / UX** | H-009, H-010, H-016 (PARTIAL) |
| **No false clear** | None of the primary runtime hypotheses were FALSE |

**Bottom line:** Fusion V2 + acting **are implemented and partially tested**, but the highest-risk gaps are **(1)** missing combo-gate A6 tests, **(2)** tool-call trigger stickiness / agent-loop semantics, **(3)** parallel panel blast radius without abort-on-drop, and **(4)** intentional single-survivor double dispatch with failure modes worse than pure cost. Prefer concrete contract tests and abort/degrade policy work over epic re-scoping.

---

## 8. Score note (ts-rules rubric, residual surface only)

Not a full-repo score. **Fusion residual surface** estimated **~62 / 100 (Debt → Serious edge)**:

- Structural paths exist and many unit islands are solid (triggers pure module, D8, shared-object safety, V2 handoff tests).  
- Deductions: untested combo A6 wire, sticky trigger semantics, non-aborting timeouts, double upstream + opaque judge degrade, contradictory comments on critical path.

**Path toward ~85+ on this surface:** T1 + T2 + T3 product decision encoded in tests + T4 abort/synthesize. T5–T8 polish and ops clarity.

---

*End of Wave 2 investigation. No product code or tasks created.*
