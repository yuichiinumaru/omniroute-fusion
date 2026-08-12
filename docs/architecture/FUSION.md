---
title: "Fusion First-Class"
version: 3.8.x
lastUpdated: 2026-07-22
---

# Fusion First-Class

Multi-model **panel + judge** routing for OmniRoute combos, with an optional **acting** unit
(Epic 0004) as the final client-facing voice. A fusion combo fans the client prompt to every
panel unit in parallel, a judge unit synthesizes a review, and — when configured — the
**acting** unit receives that review and produces the answer the client sees. Without acting,
the judge (or single survivor) is the final voice (legacy Epic 0003).

This document is the canonical architecture reference for Epic 0003 (Fusion First-Class),
the acting extension from Epic 0004, and **EPIC-22 cognitive diversity** (operator-configured
panel lenses + judge modes — config on the combo, **not** MCP tools). It supersedes the
historical design sketch
[`FUSION-TRIGGERS-CONDITIONAL.md`](../../.archive/docs/architecture/FUSION-TRIGGERS-CONDITIONAL.md)
(archived, not deleted).

**Primary sources (verify with grep, do not invent names):**

| Area | Path |
|------|------|
| Runtime | `open-sse/services/fusion.ts` (`applyFusionCognitiveLens`, `buildJudgePrompt`, `handleFusionChatV2`) |
| Cognitive lens catalog | `src/shared/constants/fusionCognitiveLenses.ts` |
| Triggers | `open-sse/services/fusionTriggers.ts` |
| Dispatch | `open-sse/services/combo.ts` (`fusion` / `conditional-fusion` branches; passes `config.judgeMode`) |
| Schema | `src/shared/validation/schemas/combo.ts` (`thinkingMode`, `systemAddon`, `judgeMode`) |
| Step normalization | `src/lib/combos/steps.ts` |
| System inject | `open-sse/services/systemPrompt.ts` (`injectCustomSystemPrompt`) |
| Nesting limits | `open-sse/services/combo/comboPredicates.ts` (`MAX_COMBO_DEPTH`) |
| UI list | `/dashboard/fusions` → `src/app/(dashboard)/dashboard/fusions/page.tsx` |
| UI editor | `/dashboard/fusions/new`, `/dashboard/fusions/[id]` (`FusionUnitRow`, `FusionTuningSection`) |
| Planning | `docs/tasks/00-planning/EPIC-22-omniroute-cognitive-diversity-fusion.md` |

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
- model step: `{ kind?: "model", model, providerId?, connectionId?, label?, thinkingMode?, systemAddon?, ... }`
- combo-ref step: `{ kind: "combo-ref", comboName, label?, ... }` — **no** `thinkingMode` / `systemAddon` in Phase 1

Runtime type after resolution (`ResolvedFusionUnit` in `fusion.ts`):

```ts
type ResolvedFusionUnit =
  | {
      kind: "model";
      model: string;
      label?: string;
      thinkingMode?: FusionCognitiveLensId;
      systemAddon?: string;
    }
  | { kind: "combo-ref"; comboName: string; label?: string };
```

Cognitive fields are optional and **default-off**: omit them and panel bodies stay bit-identical
to pre-EPIC-22 fusion (aside from existing D9 flags). See [Cognitive diversity (EPIC-22)](#cognitive-diversity-epic-22).

### Trigger miss path (A6)

When the gate applies and `shouldTriggerFusion` is false:

1. If `acting` is configured → dispatch **acting only** (no panels, no judge).
2. Else apply `config.fallbackStrategy` via a **local** strategy override only
   (`resolveFusionFallbackStrategy` — never `fusion` / `conditional-fusion`).
   The fallback **reuses the same panel `models` list** under that non-fusion strategy
   (e.g. priority / auto). There is **no** dedicated cheap-fallback model field
   (H-FUSION-006) — operators who want a cheaper miss path should put those models in
   `models` and pick a strategy that prefers them, or rely on acting-only when acting is set.
3. **Do not** mutate `combo.strategy` on the shared combo object (cache-safe).

Fall-through lives in `open-sse/services/combo.ts` (conditional-fusion / gated fusion block):
after `dispatchActingOnly()` returns null, `strategy` is reassigned to the resolved fallback
and normal combo execution continues with the existing models.

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
| `mode` | `"always"` \| `"tool-call"` \| `"text-match"` \| `"rules"` | Schema default `"tool-call"` |
| `toolPatterns` | `string[]` | Glob-style tool names; default `["write*", "edit*", "create*"]` |
| `textPatterns` | `string[]` | Optional; case-insensitive **substring** match on latest user text |
| `operator` | `"AND"` \| `"OR"` | Operator for combining predicates in `rules` mode (default `"AND"`) |
| `rules` | `FusionRule[]` | Array of tool/text predicates or nested rule groups (max 20 rules, max tree depth 5) |
| `requireApproval` | `boolean` | Schema default `false` (reserved; not a separate runtime product gate) |

### `config.fallbackStrategy`

Used when the trigger gate misses **and** no acting unit is set. Must **not** be
`"fusion"` or `"conditional-fusion"` (schema `superRefine` + runtime
`resolveFusionFallbackStrategy`, default `"priority"`).

**Operator note (H-FUSION-006):** fallback does not introduce a second model set. It
re-runs the combo’s existing **`models` (panel units)** under the chosen non-fusion
strategy. Acting-only (when `acting` is set) is the dedicated miss path that skips panels.

### `config.fusionTuning`

| Field | Default (`FUSION_DEFAULTS`) | Role |
|-------|------------------------------|------|
| `minPanel` | `2` | Successful panel answers before straggler grace |
| `stragglerGraceMs` | `8000` | Wait for remaining panels after quorum |
| `panelHardTimeoutMs` | `90000` | Absolute per-panel timeout |

### `config.judgeMode` (EPIC-22)

Optional **sibling** of `fusionTuning` (not nested inside it). Closed enum from
`FUSION_JUDGE_MODE_IDS` in `src/shared/constants/fusionCognitiveLenses.ts`. Controls the
judge synthesis **directive** only (`buildJudgePrompt(answers, judgeMode)` →
`resolveJudgeModeDirective`). When omitted or unknown at pure resolve time, runtime uses
**`synthesize`** (same spirit as pre-EPIC-22 judge text, plus a stable fingerprint for tests).

| `judgeMode` | Role |
|-------------|------|
| *(omit)* | Runtime default → `synthesize` directive |
| `synthesize` | Merge consensus / contradictions / unique insights / blind spots |
| `dialectical` | Force explicit tension between conflicting sources before synthesis |
| `security-review` | Prioritize risk, exploitability, safer recommendations |
| `pick-best` | Select one source (cite Source N) rather than merge prose |

### Panel `thinkingMode` / `systemAddon` (EPIC-22)

Optional fields on **model steps only** (`comboModelStepInputSchema`). Schema:
`thinkingMode: z.enum(FUSION_COGNITIVE_LENS_IDS).optional()`,
`systemAddon: z.string().max(FUSION_SYSTEM_ADDON_MAX_CHARS /* 4000 */).optional()`.
`thinkingMode: "custom"` requires a non-empty trimmed `systemAddon` (Zod `superRefine`).

Full operator guide: [Cognitive diversity (EPIC-22)](#cognitive-diversity-epic-22).

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
3. Build `panelBodyBase` once (see Panel body ownership). **EPIC-22:** each unit gets
   `applyFusionCognitiveLens(panelBodyBase, unit)` — identity when no lens/addon;
   otherwise a cloned body with system inject (never mutate the shared base).
4. Fan out each panel via `dispatchFusionUnit` + `withTimeout(panelHardTimeoutMs, onTimeout → abort)`.
5. `collectPanel` for quorum-grace collection; after extract, **abort dropped/timed-out
   stragglers** (Task 0070 / H-FUSION-014). Abort is **best-effort**: fusion always
   aborts per-panel `AbortController`s (and links parent `comboChatBase.signal`), but
   production `src/sse/handlers/chat.ts` does **not** yet forward `modelAbortSignal`
   into mid-flight upstream fetch — cooperative handlers / combo hedge see the abort;
   full fetch cancel is residual until the leaf honors the signal.
6. Degrade / synthesize:
   - 0 answers → `503` “All fusion panel models failed”
   - 1 answer → collect survivor prose; **`finalizeWithActing`** if acting set, else
     **`responseFromCollectedPanelText`** (Task 0069 / H-FUSION-005): synthesize an
     OpenAI-compatible completion (JSON or SSE via `synthesizeOpenAiSseFromJson`) from
     already-collected panel text — **no second upstream re-dispatch** (avoids
     fail-after-success / 2× cost)
   - 2+ answers → append judge prompt via `appendUserTurn` + `buildJudgePrompt(answers, judgeMode)`,
     dispatch judge
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

- `kind: "model"` → `handleSingleModel(body, model, { modelAbortSignal })` when a
  per-panel signal is set (Task 0070)
- `kind: "combo-ref"` → `handleComboChat` with child nesting + `comboChatBase` spread
  (panel signal overrides base `signal`; Decision D3 — reuse combo failover; fusion
  does not reimplement retry)

Legacy `handleFusionChat({ models, judgeModel })` maps strings to `ResolvedFusionUnit` and
delegates to `handleFusionChatV2`.

---

## Trigger modes

Implemented in `open-sse/services/fusionTriggers.ts`.

| Mode | Fires when | Matcher |
|------|------------|---------|
| `always` | Always | — |
| `tool-call` | **Latest** assistant message has matching `tool_calls` (N=1 window — not sticky history) | `hasMatchingToolCall` + `matchGlob` (`*` / `?`) |
| `text-match` | Latest user message text contains any pattern | `hasMatchingText` — **case-insensitive substring**, not glob |
| `rules` | Predicates in `rules` combined by `operator` (`AND`/`OR`) evaluate to true | `evaluateRule` (short-circuiting AND/OR over tool/text predicates; empty rules fail closed) |

Defaults and fail-closed behavior (`shouldTriggerFusion`):

- Missing mode on a gated path defaults to `"tool-call"`.
- Empty `toolPatterns` → `DEFAULT_FUSION_TOOL_PATTERNS` (`write*`, `edit*`, `create*`).
- Empty/missing `textPatterns` → never matches.
- Rules mode with empty `rules` array → fails closed (`false`).
- Unknown mode → do not fire fusion.

### Tool-call window (post-0068 / H-FUSION-008)

`hasMatchingToolCall` scans messages **from the end** and stops at the **first**
`role === "assistant"`. Only that message’s `tool_calls` are matched. If the latest
assistant has no `tool_calls` (or none match the globs), the gate returns **false** —
it does **not** walk older assistants for a sticky “tool was called earlier in the
session” match.

**Operator impact:** multi-turn agent loops after a write/edit tool turn will **not**
keep paying fusion cost on subsequent turns unless the **latest** assistant again
emits a matching tool call. Prefer `always` when every turn should fuse; use
`tool-call` when fusion should fire only on the tool-bearing assistant turn.

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
| `/dashboard/fusions` | List combos where strategy ∈ `{fusion, conditional-fusion}`; create/delete via combo API; **acting chip** when configured (H-FUSION-010 / Task 0077) |
| `/dashboard/fusions/new` | Create editor |
| `/dashboard/fusions/[id]` | Edit editor |

Implementation notes:

- Fusions live under the **Routing** hub (`PRIMARY` leaf `combos`) + `RoutingHubSubnav` —
  not a permanent primary sidebar peer (NAV-TREE / D5 product surface still at
  `/dashboard/fusions`).
- List (`fusions/page.tsx`): strategy badge + panel count + optional
  `data-testid="fusion-list-acting"` chip via `formatFusionActingLabel` /
  `ComboRecord.acting` (omit chip when acting absent/invalid). Editor remains the full
  acting editor (`FusionUnitsSections` `data-testid="fusion-acting"`).
- Focused editor only (`FusionEditorClient`, `FusionUnitRow`); does **not** embed ComboEditor
  (Decision D6). May reuse pickers such as `ModelSelectModal`.
- Save mapping (`buildSavePayload` in `fusionEditorTypes.ts`):
  - triggers.mode `always` → `strategy: "fusion"`
  - `tool-call` / `text-match` → `strategy: "conditional-fusion"` + `config.fallbackStrategy`
  - top-level `judge`; legacy `config.judgeModel` mirrored for string judges
  - top-level `acting` when set (Epic 0004)
  - per-panel model steps: optional `thinkingMode` / `systemAddon` (omit when empty)
  - `config.judgeMode` when set (omit when empty / default UI selection)

---

## Cognitive diversity (EPIC-22)

> **Tagline:** Cognitive diversity as **config**, not as a tool.

EPIC-22 lets the **operator** (who owns keys, budget, and risk) configure **how each
fusion panel frames the problem** and **how the judge synthesizes** — without MCP
“thinking tools,” without client tool schemas, and without depending on the model
choosing to call a tool.

Phase 2 ideas (auto lens selection, quality metrics, UI template gallery) stay in
**EPIC-23 (held)** — do not document them as shipped.

### Config, not MCP

| What | Where | Not this |
|------|-------|----------|
| Panel cognitive lens | Model step fields `thinkingMode` + optional `systemAddon` | MCP tools / agent “think hardest” tool loops |
| Judge synthesis style | Combo `config.judgeMode` (sibling of `fusionTuning`) | Provider `reasoning_effort` / thinking budget tokens |
| Enforcement | Proxy inject on fusion fan-out (`applyFusionCognitiveLens`) | Model goodwill to call tools |
| Default | **Off** — omit fields ⇒ no extra system text | Silent global mutation of non-fusion routes |

**No MCP tools** were added for lenses. Diversity is combo JSON + editor knobs only.

### Anti-confusion: cognitive lens ≠ provider thinking

| Concept | What it is | Where configured |
|---------|------------|------------------|
| **Cognitive lens** (`thinkingMode`) | Short **system framing** appended for a fusion **panel** turn (first-principles, adversarial, security, …) | Fusion editor / combo model step |
| **`systemAddon`** | Optional operator prose merged with the lens (or alone when mode omit) | Same model step; max **4000** chars (`FUSION_SYSTEM_ADDON_MAX_CHARS`) |
| **`judgeMode`** | Judge **user-turn directive** style when synthesizing panel answers | `config.judgeMode` |
| Provider **reasoning / thinking budget** | Upstream knobs such as `reasoning_effort` (`low` / `medium` / `high` / `adaptive`) or provider-native thinking tokens | Provider/model request params — **orthogonal** |

Lens ids intentionally **avoid** `low` / `medium` / `high` / `adaptive` so they never collide
with reasoning-effort vocabulary (EPIC-22 **D3**).

### Field reference (grep-verified)

| Field | Location | Type / ids | Default | Runtime effect |
|-------|----------|------------|---------|----------------|
| `thinkingMode` | `models[]` model step | `FUSION_COGNITIVE_LENS_IDS` | omit | `resolvePanelLensText` → inject via `injectCustomSystemPrompt` when non-empty |
| `systemAddon` | `models[]` model step | `string` max 4000 | omit / empty | Alone when mode empty; with preset → `preset + "\n\n" + addon`; required for `custom` |
| `judgeMode` | `config.judgeMode` | `FUSION_JUDGE_MODE_IDS` | omit → runtime `synthesize` | `buildJudgePrompt` / `resolveJudgeModeDirective` only — **never** panel inject |

**Closed lens ids** (`FUSION_COGNITIVE_LENS_IDS`):

| `thinkingMode` | Intent |
|----------------|--------|
| *(omit)* | No cognitive inject |
| `first-principles` | Strip inherited framing; rebuild from fundamentals |
| `adversarial` | Devil’s advocate — failure modes, weak claims |
| `security` | Threat-minded — trust boundaries, abuse cases |
| `systems` | Second-/third-order effects, tradeoffs |
| `implementation` | Concrete builder — steps, interfaces, PR-shaped detail |
| `skeptical-evidence` | Separate fact / inference / missing evidence |
| `custom` | Operator prose only — **requires** non-empty `systemAddon` |

**Closed judge mode ids** (`FUSION_JUDGE_MODE_IDS`): `synthesize` · `dialectical` ·
`security-review` · `pick-best`. Default constant: `FUSION_JUDGE_MODE_DEFAULT = "synthesize"`.

**Phase 1 scope rules (D6–D8):**

- Cognitive fields apply to **`kind: "model"`** (or legacy string normalized to model) only.
- **`combo-ref` panels**: no `thinkingMode` / `systemAddon` in schema/UI; nested diversity
  comes from the child’s own leaf model steps (if that child is itself fusion).
- Inject runs on fusion **panel** fan-out and the **single-panel** early path when the unit
  has a lens. **Not** on acting handoff. **Not** on non-fusion strategies.
- Panel lenses **do not** appear on the judge body; `judgeMode` **does not** alter panel bodies.
- D9 still holds: panels keep `stream: false`, `tool_choice: "none"`, tools array kept.

### Fingerprints (test / observability contract)

Preset inject strings and judge directives embed stable tokens so anti-bullshit tests can
assert presence without locking full prose. Defined in
`src/shared/constants/fusionCognitiveLenses.ts`:

| Helper | Token shape | Example |
|--------|-------------|---------|
| `fusionLensFingerprint(id)` | `[omniroute-lens:<id>]` | `[omniroute-lens:adversarial]` |
| `fusionJudgeFingerprint(id)` | `[omniroute-judge:<id>]` | `[omniroute-judge:pick-best]` |

Changing fingerprint format requires updating
`tests/unit/fusion-cognitive-diversity.test.ts` in the same change.

### Resolve / inject contract

`resolvePanelLensText(mode, systemAddon)` (catalog module):

| Input | Result |
|-------|--------|
| empty/omit mode, empty addon | `""` (identity — no inject) |
| empty/omit mode, non-empty addon | trimmed addon only |
| unknown non-empty mode | `""` (ignore addon; Zod already rejects unknowns at write) |
| `custom` without addon | `""` |
| `custom` + addon | trimmed addon |
| preset | catalog English text (includes lens fingerprint) |
| preset + addon | `preset + "\n\n" + addon` |

Runtime (`applyFusionCognitiveLens` in `fusion.ts`): if composed text is empty, return the
shared body reference unchanged; otherwise **clone** via `injectCustomSystemPrompt` so
concurrent panels never mutate a shared `panelBodyBase`.

Plumbing chain:

```
Zod comboModelStepInputSchema
  → normalizeComboStep (steps.ts)
  → resolveFusionUnits / comboStepToFusionUnit
  → ResolvedFusionUnit.{thinkingMode?, systemAddon?}
  → applyFusionCognitiveLens(body, unit)
  → handleSingleModel (model) | handleComboChat (combo-ref, no lens fields)
```

`config.judgeMode` is read in `combo.ts` and passed as `HandleFusionChatOptionsV2.judgeMode`
into `handleFusionChatV2` → `buildJudgePrompt(answers, judgeMode)`.

### Operator recipes (docs-only; no UI gallery yet)

These are **copy-paste sketches**. Swap model ids for connections you own. Gallery /
one-click templates are **EPIC-23 (held)**.

#### Write-safe

Conditional fusion on write/edit tools: builder + critic + security lenses, synthesize judge,
optional acting as final voice.

```json
{
  "name": "fusion-write-safe",
  "strategy": "conditional-fusion",
  "models": [
    {
      "kind": "model",
      "model": "opencode-zen/mimo-v2.5-free",
      "thinkingMode": "implementation"
    },
    {
      "kind": "model",
      "model": "deepseek-web/deepseek-v4-pro-think",
      "thinkingMode": "adversarial"
    },
    {
      "kind": "model",
      "model": "glm/glm-5.1",
      "thinkingMode": "security"
    }
  ],
  "judge": { "kind": "model", "model": "deepseek-web/deepseek-v4-pro-think" },
  "acting": { "kind": "model", "model": "opencode-zen/mimo-v2.5-free" },
  "config": {
    "triggers": {
      "mode": "tool-call",
      "toolPatterns": ["write*", "edit*", "create*", "delete*"],
      "requireApproval": false
    },
    "judgeMode": "synthesize",
    "fusionTuning": {
      "minPanel": 2,
      "stragglerGraceMs": 15000,
      "panelHardTimeoutMs": 120000
    },
    "fallbackStrategy": "priority"
  }
}
```

#### Design-deep

Text-match on architecture language; first-principles + systems + implementation; dialectical
judge to force tension before merge.

```json
{
  "name": "fusion-design-deep",
  "strategy": "conditional-fusion",
  "models": [
    {
      "kind": "model",
      "model": "cc/claude-opus-4-7",
      "thinkingMode": "first-principles"
    },
    {
      "kind": "model",
      "model": "cx/gpt-5.5",
      "thinkingMode": "systems"
    },
    {
      "kind": "model",
      "model": "glm/glm-5.1",
      "thinkingMode": "implementation",
      "systemAddon": "Prefer interfaces and module seams over slide-ware."
    }
  ],
  "judge": { "kind": "model", "model": "cc/claude-opus-4-7" },
  "config": {
    "triggers": {
      "mode": "text-match",
      "textPatterns": ["architect", "design", "tradeoff", "ADR"]
    },
    "judgeMode": "dialectical",
    "fallbackStrategy": "priority"
  }
}
```

#### Cheap-diversity

Same cheap model three times with **different** lenses — diversity comes from framing, not
provider spend. Useful when budget is tight but correlated answers are the problem.

```json
{
  "name": "fusion-cheap-diversity",
  "strategy": "fusion",
  "models": [
    {
      "kind": "model",
      "model": "opencode-zen/mimo-v2.5-free",
      "thinkingMode": "first-principles"
    },
    {
      "kind": "model",
      "model": "opencode-zen/mimo-v2.5-free",
      "thinkingMode": "adversarial"
    },
    {
      "kind": "model",
      "model": "opencode-zen/mimo-v2.5-free",
      "thinkingMode": "skeptical-evidence"
    }
  ],
  "judge": { "kind": "model", "model": "opencode-zen/mimo-v2.5-free" },
  "config": {
    "judgeMode": "synthesize",
    "fusionTuning": {
      "minPanel": 2,
      "stragglerGraceMs": 8000,
      "panelHardTimeoutMs": 90000
    }
  }
}
```

### Smoke matrix (operators)

| Check | Expected |
|-------|----------|
| Combo with no `thinkingMode` / no `systemAddon` / no `judgeMode` | Same behavior as pre-EPIC-22 fusion |
| Two panels, two different modes | Distinct system framing per model (fingerprints differ) |
| `thinkingMode: "custom"` without addon | Save validation error |
| `judgeMode: "pick-best"` | Judge prompt steers to select one Source N |
| Combo-ref panel | No cognitive fields on that step; no runtime throw |
| Non-fusion strategy | Cognitive fields ignored (not injected on non-fusion paths) |

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
   Fallback runs only when triggers miss **and** no acting unit is set. It uses the **same
   panel models** under that strategy — there is no separate fallback model picker.
8. Optionally open **Tuning** (min panel quorum, straggler grace, hard timeout). Hard timeout
   **signals abort** on the panel request (0070); stragglers after quorum are also aborted
   after extract (best-effort — see stage 5 residual if leaf fetch ignores the signal).
9. Optionally set **cognitive diversity** (EPIC-22) on each **model** panel: Cognitive lens
   (`thinkingMode`) and optional system addon; under Tuning, optional **Judge mode**
   (`config.judgeMode`). Leave empty for default-off (no extra system text; judge synthesizes).
10. Save. Clients call `model: "combo/<name>"` on `/api/v1/chat/completions`.

### Choosing panel combos

- Prefer diverse, capable panels; judge should be strong at comparison/synthesis.
- Combo-ref panels reuse that combo’s failover — good for “provider family with accounts”.
- Nesting fusion→fusion is allowed but depth-guarded; prefer non-fusion children.
- Acting is often a strong builder/executor combo-ref; keep it distinct from consultor panels.
- On the list page, combos with acting show an **Acting · …** chip (`fusion-list-acting`);
  open the editor for full acting configuration.
- Same model + different `thinkingMode` values is a valid cheap diversity pattern (see recipes).
- Cognitive lenses are **not** provider thinking budgets — do not expect `reasoning_effort`
  behavior from `thinkingMode`.

### Troubleshooting

| Symptom | Likely cause | What to check |
|---------|--------------|---------------|
| No multi-model latency / single-model behavior | Trigger miss → **acting-only** or fallback | `config.triggers`, **latest** assistant tool_calls (not sticky history), text patterns; logs: acting-only (`dispatchActingOnly`) vs fallback strategy under the conditional-fusion path |
| Fusion stopped after first tool turn in a multi-turn loop | `tool-call` N=1 window (0068) | Latest assistant lacks matching `tool_calls`; switch to `always` or ensure tool-bearing assistant is latest |
| Fallback still hits expensive panel models | H-006: fallback reuses `models` | Change panel list / strategy order, or set **acting** for miss path |
| Always one model even when triggers match | Acting empty + only one panel | Add ≥2 panels; optional acting does not replace panel fan-out on hit |
| `503 All fusion panel models failed` | 0 panel answers | Panel credentials, circuit breakers, `panelHardTimeoutMs`, provider health |
| Only one model answers / “no fusion” log | Only one panel succeeded | Quorum path → **collected-text** survivor (0069, no re-dispatch); with acting, handoff via `finalizeWithActing` |
| Late breaker trips after panel timeout | Straggler abort best-effort only | 0070 abort graph fires `AbortSignal`; if leaf ignores `modelAbortSignal` (chat residual), mid-flight fetch may still complete — not full breaker isolation |
| Judge never streams to client | Acting is set | Expected: judge is non-stream for handoff; acting owns client stream |
| Acting answer lacks judge synthesis | Judge empty/failed on hit | Runtime concatenates panel texts as review then still calls acting; check judge credentials/logs |
| List shows no Acting chip | Acting unset / invalid unit | Editor Acting section; API payload top-level `acting`; chip omits when `formatFusionActingLabel` returns null |
| `503 Circular combo reference` | Combo-ref cycle | Visited chain in nesting; rename or break cycle |
| `503 Max combo nesting depth` | Too deep combo-ref tree | Flatten refs or raise `maxComboDepth` carefully (hard cap 10) |
| Short panel refusals / empty content | Tools stripped incorrectly | Ensure panel path keeps tools + `tool_choice: "none"` (D9) |
| Validation error on save for fallback | D8 guard | `fallbackStrategy` cannot be fusion / conditional-fusion |
| Editor cannot clear judge on create | Create schema | Create omits null judge; update sends `judge: null` |
| Validation: custom lens needs addon | D5 / Zod | `thinkingMode: "custom"` requires non-empty `systemAddon` (max 4000) |
| Panel answers look identical despite modes | Mode not on model step / combo-ref only | Cognitive fields are model-step only; check saved JSON has `thinkingMode` per panel |
| Expected “more tokens / deeper think” from lens | Confused with provider thinking | Lenses inject system framing only — set provider reasoning params separately if needed |
| Judge ignores panel lens text | By design (D8) | Panel fingerprints must not appear on judge body; use `judgeMode` for judge style |

### Log tags

Logger category strings used by `combo.ts` / `fusion.ts` (not environment variables):

- Fusion path — unconditional or gated fusion dispatch and panel progress
- Conditional-fusion path — trigger match / miss and fallback strategy override

---

## Related docs

- [Architecture](./ARCHITECTURE.md) — combo strategies overview
- [Resilience Guide](./RESILIENCE_GUIDE.md) — circuit breaker interaction with combo targets
- [Auto-Combo](../routing/AUTO-COMBO.md) — scoring strategies often used as fusion fallback
- EPIC-22 planning: [`docs/tasks/00-planning/EPIC-22-omniroute-cognitive-diversity-fusion.md`](../tasks/00-planning/EPIC-22-omniroute-cognitive-diversity-fusion.md)
- EPIC-23 (held Phase 2): [`docs/tasks/00-planning/EPIC-23-omniroute-cognitive-diversity-phase2-held.md`](../tasks/00-planning/EPIC-23-omniroute-cognitive-diversity-phase2-held.md)
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
- Cognitive diversity (EPIC-22): `combos.fusionCognitiveLens`, `combos.fusionCognitiveLensHelp`,
  `combos.fusionCognitiveLensNone`, `combos.fusionCognitiveLens_*` (per lens id),
  `combos.fusionCognitiveSystemAddon*`, `combos.fusionCognitiveCustomRequiresAddon`,
  `combos.fusionJudgeMode`, `combos.fusionJudgeModeHelp`, `combos.fusionJudgeModeDefault`,
  `combos.fusionJudgeMode_*` (per judge mode id)

Other locales (42 message files) still need translation of these keys; only `en.json` is
required for the baseline gate of this feature. Model-facing inject strings remain English
technical prose in `fusionCognitiveLenses.ts` (not i18n).
