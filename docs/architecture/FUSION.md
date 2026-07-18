---
title: "Fusion First-Class"
version: 3.8.x
lastUpdated: 2026-07-18
---

# Fusion First-Class

Multi-model **panel + judge** routing for OmniRoute combos, with an optional **acting** unit
(Epic 0004) as the final client-facing voice. A fusion combo fans the client prompt to every
panel unit in parallel, a judge unit synthesizes a review, and — when configured — the
**acting** unit receives that review and produces the answer the client sees. Without acting,
the judge (or single survivor) is the final voice (legacy Epic 0003).

This document is the canonical architecture reference for Epic 0003 (Fusion First-Class) and
the acting extension from Epic 0004. It supersedes the historical design sketch
[`FUSION-TRIGGERS-CONDITIONAL.md`](../../.archive/docs/architecture/FUSION-TRIGGERS-CONDITIONAL.md)
(archived, not deleted).

**Primary sources (verify with grep, do not invent names):**

| Area | Path |
|------|------|
| Runtime | `open-sse/services/fusion.ts` |
| Triggers | `open-sse/services/fusionTriggers.ts` |
| Dispatch | `open-sse/services/combo.ts` (`fusion` / `conditional-fusion` branches) |
| Schema | `src/shared/validation/schemas/combo.ts` |
| Step normalization | `src/lib/combos/steps.ts` |
| Nesting limits | `open-sse/services/combo/comboPredicates.ts` (`MAX_COMBO_DEPTH`) |
| UI list | `/dashboard/fusions` → `src/app/(dashboard)/dashboard/fusions/page.tsx` |
| UI editor | `/dashboard/fusions/new`, `/dashboard/fusions/[id]` |

---

## Overview

Fusion is a **combo strategy**, not a separate product table. Combos with
`strategy: "fusion"` or `strategy: "conditional-fusion"` are filtered client-side on the
Fusions dashboard and edited by a focused editor (not the full Combo Studio page).

Cost and latency are higher than a single model call (N panel completions + one judge).
Use unconditional fusion when every request needs multi-model review; use
**conditional-fusion** (or gated `fusion` + triggers) when only some turns justify the cost
(for example write/edit tool calls).

Judge behavior follows OpenRouter-style fusion: the judge **analyzes** panel answers
(consensus, contradictions, coverage, blind spots) then writes one grounded answer — it
does not naively merge strings. Implementation: `buildJudgePrompt()` in
`open-sse/services/fusion.ts`.

---

## Data contract

Fusion reuses the `combos` table and combo CRUD APIs (`GET/POST/PUT/DELETE /api/combos`).
No dedicated `fusions` table in Phase 1.

### Strategy values

| Strategy | When fusion runs |
|----------|------------------|
| `fusion` | Always, unless `config.triggers.mode` is set and not `"always"` (then gated like conditional-fusion) |
| `conditional-fusion` | Only when `shouldTriggerFusion(body, triggers)` returns true; otherwise acting-only or `fallbackStrategy` |

Registered in `ROUTING_STRATEGY_VALUES` (**18** strategies live, including both fusion family values)
(`src/shared/constants/routingStrategies.ts`).

### Units: panels, judge, acting

| Field | Location | Role |
|-------|----------|------|
| **Panels** | `models[]` | Parallel answers (N units) |
| **Judge** | top-level `judge` (preferred) or `config.judgeModel` (legacy string) | Synthesizes one answer from panel prose |
| **Acting** | top-level `acting` (Epic 0004) | Optional final executor / “voice” after judge; on trigger **miss**, when set, **acting-only** runs (no panel fan-out) |

### Panels (`models`)

Panel list is the combo’s `models` array. Each entry is a `comboModelEntry` union
(`src/shared/validation/schemas/combo.ts`):

- plain string model id (legacy)
- model step: `{ kind?: "model", model, providerId?, connectionId?, label?, ... }`
- combo-ref step: `{ kind: "combo-ref", comboName, label?, ... }`

Runtime type after resolution (`ResolvedFusionUnit` in `fusion.ts`):

```ts
type ResolvedFusionUnit =
  | { kind: "model"; model: string; label?: string }
  | { kind: "combo-ref"; comboName: string; label?: string };
```

### Trigger miss path (A6)

When the gate applies and `shouldTriggerFusion` is false:

1. If `acting` is configured → dispatch **acting only** (no panels, no judge).
2. Else apply `config.fallbackStrategy` via a **local** strategy override only
   (`resolveFusionFallbackStrategy` — never `fusion` / `conditional-fusion`).
3. **Do not** mutate `combo.strategy` on the shared combo object (cache-safe).

### Panel tools policy (D9)

Panel turns force `stream: false` and `tool_choice: "none"`. **Tools remain on the body**
for the judge turn / client continuity — they are **not** stripped from the request.
(`panelBody` is built once inside `handleFusionChatV2` before fan-out — not by
`resolveFusionUnits`, which only maps panels / judge / acting units.)

### Judge (top-level `judge`)

Judge is a **separate field** on create/update combo schemas (`createComboSchema.judge`,
`updateComboSchema.judge`), not a panel step with `role: "judge"`.

Resolution precedence (Decision D1), implemented in `resolveJudgeUnit` /
`resolveFusionUnits`:

1. `combo.judge` (top-level, model or combo-ref)
2. `combo.config.judgeModel` (legacy string)
3. First resolved panel unit

Editors mirror this as “judge → judgeModel → first panel”.

### `config.triggers`

Optional object on `comboRuntimeConfigSchema`:

| Field | Type | Notes |
|-------|------|--------|
| `mode` | `"always"` \| `"tool-call"` \| `"text-match"` | Schema default `"tool-call"` |
| `toolPatterns` | `string[]` | Glob-style tool names; default `["write*", "edit*", "create*"]` |
| `textPatterns` | `string[]` | Optional; case-insensitive **substring** match on latest user text |
| `requireApproval` | `boolean` | Schema default `false` (reserved; not a separate runtime product gate) |

### `config.fallbackStrategy`

Used when the trigger gate misses. Must **not** be `"fusion"` or `"conditional-fusion"`
(schema `superRefine` + runtime `resolveFusionFallbackStrategy`, default `"priority"`).

### `config.fusionTuning`

| Field | Default (`FUSION_DEFAULTS`) | Role |
|-------|------------------------------|------|
| `minPanel` | `2` | Successful panel answers before straggler grace |
| `stragglerGraceMs` | `8000` | Wait for remaining panels after quorum |
| `panelHardTimeoutMs` | `90000` | Absolute per-panel timeout |

### Example (conditional tool-call fusion)

```json
{
  "name": "fusion-write",
  "strategy": "conditional-fusion",
  "models": [
    "opencode-zen/mimo-v2.5-free",
    { "kind": "combo-ref", "comboName": "coding-priority" }
  ],
  "judge": { "kind": "model", "model": "deepseek-web/deepseek-v4-pro-think" },
  "config": {
    "triggers": {
      "mode": "tool-call",
      "toolPatterns": ["write*", "edit*", "create*", "delete*"],
      "requireApproval": false
    },
    "judgeModel": "deepseek-web/deepseek-v4-pro-think",
    "fusionTuning": {
      "minPanel": 2,
      "stragglerGraceMs": 15000,
      "panelHardTimeoutMs": 120000
    },
    "fallbackStrategy": "priority"
  }
}
```

---

## Runtime flow

```
Client → /api/v1/chat/completions (model = combo/<name>)
  → handleChatCore → handleComboChat (open-sse/services/combo.ts)
    → strategy is fusion | conditional-fusion
      → optional trigger gate (fusionTriggers.ts)
      → HIT  → dispatchFusionStrategy()
                 resolveFusionUnits → { panels, judge, acting? }
                 handleFusionChatV2({ panels, judge, acting, handleComboChat, nesting, tuning, ... })
                   → parallel panel fan-out (panelBody)
                   → collectPanel (quorum-grace)
                   → judge synthesis (non-stream + tool_choice:"none" when acting set)
                   → finalizeWithActing (acting final voice, or judge/survivor as-is)
      → MISS → dispatchActingOnly() if acting set
             → else fallbackStrategy (non-fusion) via local strategy override
```

### Dispatch gate (`combo.ts`)

For `strategy === "fusion" || strategy === "conditional-fusion"`:

1. If strategy is unconditional fusion (`fusion` and no non-always triggers) →
   `dispatchFusionStrategy()` immediately.
2. Else if `shouldTriggerFusion(body, triggers)` → fusion path.
3. Else **trigger miss** (Epic **0004 / A6**):
   - If top-level `acting` unit is set → **`dispatchActingOnly()`** (no panel fan-out;
     acting is the final voice with the original client stream/tools).
   - Else → set strategy to `resolveFusionFallbackStrategy(config.fallbackStrategy)` and
     continue normal combo strategy dispatch.

`dispatchFusionStrategy` always calls `resolveFusionUnits` then `handleFusionChatV2` with
panels, judge, **optional acting**, recursive `handleComboChat`, `allCombos`, shared
`nestingContext`, and `comboChatBase` (parent settings / signal / ACL / availability /
relay — see Nested combo base options).

### Units resolved by `resolveFusionUnits`

| Field | Source | Notes |
|-------|--------|-------|
| `panels` | combo models list | model strings and/or combo-ref steps |
| `judge` | top-level `judge` → `config.judgeModel` → first panel (D1) | synthesizes panel answers |
| `acting` | top-level `acting` only (A4/A8) | optional final voice after judge review |

### `handleFusionChatV2` stages

1. Reject empty panels (`400`).
2. **Single panel**:
   - Without acting → dispatch that unit with the **original** client body (nothing to fuse).
   - With acting → collect the single panel non-stream (`stream:false`, `tool_choice:"none"`)
     as review context, then **`finalizeWithActing`** (acting is final voice).
3. Build `panelBody` once (see Panel body ownership).
4. Fan out each panel via `dispatchFusionUnit` + `withTimeout(panelHardTimeoutMs)`.
5. `collectPanel` for quorum-grace collection.
6. Degrade / synthesize:
   - 0 answers → `503` “All fusion panel models failed”
   - 1 answer → collect survivor prose; **`finalizeWithActing`** if acting set, else
     **re-dispatch** that unit with the original client body (intentional second upstream
     call so stream/tools match the client; collected text is not replayed as a synthetic
     Response — Task 0012 F3 residual, not a silent drop)
   - 2+ answers → append judge prompt via `appendUserTurn` + `buildJudgePrompt`, dispatch judge
7. **Judge path when acting is set**: judge runs **non-stream** with `tool_choice: "none"`
   so fusion can extract review text for the handoff (`fusion.ts` judge-for-acting branch).
   If the judge fails or returns empty text, fusion concatenates panel answers as the review
   payload for acting (degrade, not hard fail). Without acting, judge uses the original
   client stream/tools (legacy final voice).
8. **`finalizeWithActing`** (Epic 0004): when `acting` is set, hand the judge review
   (or surviving prose) to the acting unit as the **final** client-facing response
   (acting owns stream/tools). When acting is absent, return the judge/survivor response
   as-is (legacy).

### Unit dispatch

`dispatchFusionUnit`:

- `kind: "model"` → `handleSingleModel(body, model)`
- `kind: "combo-ref"` → `handleComboChat` with child nesting + `comboChatBase` spread
  (Decision D3 — reuse combo failover; fusion does not reimplement retry)

Legacy `handleFusionChat({ models, judgeModel })` maps strings to `ResolvedFusionUnit` and
delegates to `handleFusionChatV2`.

---

## Trigger modes

Implemented in `open-sse/services/fusionTriggers.ts`.

| Mode | Fires when | Matcher |
|------|------------|---------|
| `always` | Always | — |
| `tool-call` | Last assistant message with `tool_calls` has a name matching a pattern | `hasMatchingToolCall` + `matchGlob` (`*` / `?`) |
| `text-match` | Latest user message text contains any pattern | `hasMatchingText` — **case-insensitive substring**, not glob |

Defaults and fail-closed behavior (`shouldTriggerFusion`):

- Missing mode on a gated path defaults to `"tool-call"`.
- Empty `toolPatterns` → `DEFAULT_FUSION_TOOL_PATTERNS` (`write*`, `edit*`, `create*`).
- Empty/missing `textPatterns` → never matches.
- Unknown mode → do not fire fusion.

Helpers: `matchGlob`, `hasMatchingToolCall`, `hasMatchingText`, `extractLatestUserText`,
`fusionStrategyHasConditionalTriggers`, `resolveFusionFallbackStrategy`.

---

## Nesting (combo-ref panels / judge)

Combo-ref units nest through `handleComboChat` with `ComboNestingContext`:

- Default max depth: `MAX_COMBO_DEPTH` (`3` in `comboPredicates.ts`), overridable via
  `config.maxComboDepth` (clamped to hard cap `10`).
- Cycle detection: `visitedComboNames` — circular refs return `503`
  (`Circular combo reference detected: <name>`).
- Depth overflow returns `503` (`Max combo nesting depth (N) exceeded`).

### Nested combo base options (`comboChatBase`)

Production `combo.ts` builds a `fusionComboChatBase` and passes it as
`HandleFusionChatOptionsV2.comboChatBase` into every `handleFusionChatV2` call
(full fusion + acting-only). `dispatchFusionUnit` spreads that base **first** into
nested `handleComboChat` so child combo-ref panels / judge / acting inherit the same
policy surface as `executeComboRefUnit`’s `baseOptions`:

| Field | Why it must thread |
|-------|--------------------|
| `settings` | Resilience / timeout cascade (`phaseComboSetup` must not fall back to null defaults) |
| `isModelAvailable` | Availability probe parity with parent combo |
| `relayOptions` | Session / context-relay continuity |
| `signal` | Client abort propagates into nested combo work |
| `apiKeyAllowedConnections` | API-key ACL for strategies that filter connections |

`body`, `combo`, `nesting`, `handleSingleModel`, `log`, and `allCombos` are always set
after the spread so they win over any accidental base field. Type:
`FusionComboChatBase` in `open-sse/services/fusion.ts` (Pick of those five fields from
`HandleComboChatOptions`).

Fusion owns **panel** hard timeouts at the fusion layer; child combos must not stack an
extra fusion-level timeout.

---

## Panel body ownership (Decision D9)

Fusion constructs **one** panel body before fan-out:

```ts
const { tool_choice: _tc, ...rest } = body;
const panelBody = { ...rest, stream: false, tool_choice: "none" };
// tools array is KEPT from the original body
```

| Concern | Panel path | Judge / single-survivor (no acting) | Judge when **acting** set | Acting final voice |
|---------|------------|-------------------------------------|---------------------------|--------------------|
| `stream` | forced `false` | original client value | forced `false` (extract review text) | original client value |
| `tool_choice` | forced `"none"` | original client value | forced `"none"` | original client value |
| `tools` | **kept** | original | kept (choice none) | original |
| Who transforms | fusion only | fusion does not re-strip for child combo-refs | same | same |

Child combo-ref panels receive `panelBody` as-is and **must not** re-strip tools.
Keeping tools while forcing `tool_choice: "none"` lets panel models understand historical
`tool_calls` without emitting new tool calls. Without acting, the judge uses the original
client stream/tools as the final voice; with acting, the judge is internal (non-stream) and
**acting** owns the client-facing stream/tools.

---

## UI surface

| Route | Role |
|-------|------|
| `/dashboard/fusions` | List combos where strategy ∈ `{fusion, conditional-fusion}`; create/delete via combo API |
| `/dashboard/fusions/new` | Create editor |
| `/dashboard/fusions/[id]` | Edit editor |

Implementation notes:

- Dedicated Fusions sidebar item (`sidebar.fusions` / `sidebar.fusionsSubtitle`) — Decision D5.
- Focused editor only (`FusionEditorClient`, `FusionUnitRow`); does **not** embed ComboEditor
  (Decision D6). May reuse pickers such as `ModelSelectModal`.
- Save mapping (`buildSavePayload` in `fusionEditorTypes.ts`):
  - triggers.mode `always` → `strategy: "fusion"`
  - `tool-call` / `text-match` → `strategy: "conditional-fusion"` + `config.fallbackStrategy`
  - top-level `judge`; legacy `config.judgeModel` mirrored for string judges

---

## Backward compatibility

| Legacy shape | Runtime behavior |
|--------------|------------------|
| String-only `models` | Normalized to `kind: "model"` units |
| `config.judgeModel` only | Used when top-level `judge` absent |
| `handleFusionChat` string API | Maps to V2 units, same fan-out/judge path |
| Pre-trigger fusion combos | Unconditional when strategy is `fusion` without non-always triggers |
| Stored zero-latency flags without gate | Existing combo config transform (unrelated to fusion) still applies |

---

## Locked design decisions (D1–D10)

| # | Decision | Choice |
|---|----------|--------|
| D1 | Judge placement | Separate `judge` / legacy `judgeModel` — not `role: "judge"` on a step |
| D2 | Panel identity | Reuse `comboModelEntry` (string \| model \| combo-ref) |
| D3 | Nesting | Call `handleComboChat` / shared nesting context; do not reimplement failover inside fusion |
| D4 | Persistence Phase 1 | Reuse `combos` table + strategy filter — no new `fusions` table |
| D5 | UI surface | Dedicated `/dashboard/fusions` |
| D6 | Component reuse | Import pickers/cards only — do not embed full ComboEditor |
| D7 | Triggers | First-class `config.triggers`; strategy may be `conditional-fusion` or gated `fusion` |
| D8 | Fallback strategies | Any non-fusion strategy only |
| D9 | Panel tools policy | Keep `tools`, set `tool_choice: "none"` |
| D10 | Scope vs upstream | Implement on current tree; keep diffs merge-friendly |

---

## Operator guide

### Create a fusion

1. Open **Dashboard → Fusions** (`/dashboard/fusions`).
2. Create fusion → set a unique combo name.
3. Optionally set an **Acting** unit (Epic 0004) — primary executor / final voice. On trigger
   **miss** it answers alone; on fusion hit it receives the judge review and produces the
   client-facing answer. Leave empty for legacy panels→judge final voice.
4. Add **≥2 panels** (models and/or combo refs). One panel has nothing to fuse; with acting set
   the panel answer still hands off to acting.
5. Optionally set a **Judge** (model or combo). Empty judge uses first panel.
6. Choose **Triggers**:
   - **Always** — every request pays panel+judge cost (`strategy: fusion`).
   - **Tool call** — only when an assistant tool name matches globs (default write/edit/create).
   - **Text match** — only when the latest user message contains any keyword/phrase.
7. For non-always modes, pick a **fallback strategy** (priority, auto, round-robin, … — never fusion).
   Fallback runs only when triggers miss **and** no acting unit is set.
8. Optionally open **Tuning** (min panel quorum, straggler grace, hard timeout).
9. Save. Clients call `model: "combo/<name>"` on `/api/v1/chat/completions`.

### Choosing panel combos

- Prefer diverse, capable panels; judge should be strong at comparison/synthesis.
- Combo-ref panels reuse that combo’s failover — good for “provider family with accounts”.
- Nesting fusion→fusion is allowed but depth-guarded; prefer non-fusion children.
- Acting is often a strong builder/executor combo-ref; keep it distinct from consultor panels.

### Troubleshooting

| Symptom | Likely cause | What to check |
|---------|--------------|---------------|
| No multi-model latency / single-model behavior | Trigger miss → **acting-only** or fallback | `config.triggers`, tool history, text patterns; logs: acting-only (`dispatchActingOnly`) vs fallback strategy under the conditional-fusion path |
| Always one model even when triggers match | Acting empty + only one panel | Add ≥2 panels; optional acting does not replace panel fan-out on hit |
| `503 All fusion panel models failed` | 0 panel answers | Panel credentials, circuit breakers, `panelHardTimeoutMs`, provider health |
| Only one model answers / “no fusion” log | Only one panel succeeded | Quorum path → survivor; with acting, handoff via `finalizeWithActing` |
| Judge never streams to client | Acting is set | Expected: judge is non-stream for handoff; acting owns client stream |
| Acting answer lacks judge synthesis | Judge empty/failed on hit | Runtime concatenates panel texts as review then still calls acting; check judge credentials/logs |
| `503 Circular combo reference` | Combo-ref cycle | Visited chain in nesting; rename or break cycle |
| `503 Max combo nesting depth` | Too deep combo-ref tree | Flatten refs or raise `maxComboDepth` carefully (hard cap 10) |
| Short panel refusals / empty content | Tools stripped incorrectly | Ensure panel path keeps tools + `tool_choice: "none"` (D9) |
| Validation error on save for fallback | D8 guard | `fallbackStrategy` cannot be fusion / conditional-fusion |
| Editor cannot clear judge on create | Create schema | Create omits null judge; update sends `judge: null` |

### Log tags

Logger category strings used by `combo.ts` / `fusion.ts` (not environment variables):

- Fusion path — unconditional or gated fusion dispatch and panel progress
- Conditional-fusion path — trigger match / miss and fallback strategy override

---

## Related docs

- [Architecture](./ARCHITECTURE.md) — combo strategies overview
- [Resilience Guide](./RESILIENCE_GUIDE.md) — circuit breaker interaction with combo targets
- [Auto-Combo](../routing/AUTO-COMBO.md) — scoring strategies often used as fusion fallback
- Archived sketch: [`.archive/docs/architecture/FUSION-TRIGGERS-CONDITIONAL.md`](../../.archive/docs/architecture/FUSION-TRIGGERS-CONDITIONAL.md)

---

## i18n notes (operators / translators)

English baseline lives under `src/i18n/messages/en.json`:

- Sidebar: `sidebar.fusions`, `sidebar.fusionsSubtitle`
- Strategy labels: `combos.fusion`, `combos.fusionDesc`, `combos.conditionalFusion`,
  `combos.conditionalFusionDesc`
- Acting unit (Epic 0004): `combos.fusionActingSection`, `combos.fusionActingHelp`,
  `combos.fusionActingUnit`, `combos.fusionActingEmptyHint`
- Editor: `combos.fusionPanels*`, `combos.fusionJudge*`, `combos.fusionTrigger*`,
  `combos.fusionToolPatterns*`, `combos.fusionTextPatterns*`,
  `combos.fusionFallbackStrategy*`, `combos.fusionTuning*`, unit-row keys
  (`combos.fusionUnitModel`, `combos.fusionUnitComboRef`, `combos.fusionPickModel`,
  `combos.fusionSelectComboRef`, `combos.fusionUnitNotSet`, `combos.fusionComboRefHint`,
  `combos.fusionModelPlaceholder`, `combos.fusionClearUnit`, `combos.fusionComboRefTitle`,
  `combos.fusionFusionDepthGuarded`, plus shared `combos.moveUp` / `moveDown` / `removeModel`)

Other locales (42 message files) still need translation of these keys; only `en.json` is
required for the baseline gate of this feature.
