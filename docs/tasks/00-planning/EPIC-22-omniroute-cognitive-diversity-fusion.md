# EPIC-22 — Cognitive diversity as config, not as tool

> **Status**: **Phase 1 children complete pending review trail** — 0107–0111 implementation landed (2026-07-22); epic DoD still needs child reviews + green verification trail. **EPIC-23 remains HELD.**  
> **Priority**: **P1** (fusion leverage; not a production-breaking P0)  
> **Type**: feature  
> **Project**: omniroute-2  
> **Author**: architect-orchestrator (2026-07-22)  
> **Tagline**: **Cognitive diversity as config, not as tool.**  
> **Depends on**: Fusion first-class shipped (Epic **0003** / **0004** / operator SSoT `docs/architecture/FUSION.md`)  
> **Does not depend on**: MCP think-hardest runtime, Surreal, BranchManager, provider `reasoning_effort`  
> **Operator SSoT (shipped docs)**: `docs/architecture/FUSION.md` → section **Cognitive diversity (EPIC-22)**  
> **Related**:  
> - Reference harvest: `references/002-khala/yuichiinumaru-think-hardest` (intent only)  
> - Phase 2 ideas (held): **EPIC-23** — do **not** promote  
> - Residual fusion runtime: **EPIC-11** (orthogonal unless collision on `fusion.ts`)  
> - Fail-first contract sketch: `docs/tasks/00-planning/EPIC-22-fail-first-test-contract.md`  
> **Children** (lanes move independently; do not treat epic as closed until reviews pass):  
> | ID | Slice | Path (as of 2026-07-22) |  
> |----|-------|------|  
> | **0107** | T22-A catalog + contracts | `docs/tasks/03-review/0107-omniroute-epic22-cognitive-lenses-catalog-contracts.md` |  
> | **0108** | T22-B schema + plumb | `docs/tasks/03-review/0108-omniroute-epic22-cognitive-schema-normalize-plumb.md` |  
> | **0109** | T22-C runtime inject | `docs/tasks/02-doing/0109-omniroute-epic22-cognitive-runtime-inject.md` |  
> | **0110** | T22-D fusion editor UI | `docs/tasks/02-doing/0110-omniroute-epic22-cognitive-fusion-editor-ui.md` |  
> | **0111** | T22-E docs + changelog | `docs/tasks/02-doing/0111-omniroute-epic22-cognitive-docs-presets-changelog.md` |  
> **Gate**: **0107 first**. **0108** before **0109**. **0110** may parallel **0109** after **0108** freezes field names. **0111** last.  
> **Evidence / harvest (this session)**:  
> - Pattern packet: schema strip + `comboStepToFusionUnit` drops unknown fields; inject hook = clone inside `handleFusionChatV2` panel `map` (~L866)  
> - Reuse: `injectCustomSystemPrompt` (`open-sse/services/systemPrompt.ts:148+`)  
> - Test copy style: `tests/unit/fusion-panel-tools-none.test.ts` (capture bodies per model)  
> - UI round-trip: `fusionEditorTypes.ts` `unitToPayload` / `normalizeFusionUnit`  
> - Catalog SSoT: `src/shared/constants/fusionCognitiveLenses.ts`

---

## 1. Goals

### Problem

Conditional fusion already **forces** multi-model review without model goodwill (triggers → fan-out → judge → acting). Today every panel receives the **same** `panelBody`. Diversity ≈ model/provider only. Similar models → correlated answers → judge does busywork.

MCP “thinking tools” (reference: mcp-think-hardest) fail for the operators who need them most:

1. Burn context with tool schemas  
2. Depend on model willingness to call tools  
3. Weak models never call tools — yet they are exactly who need structured cognitive frames  

### Value

Give the **operator** (who owns keys, budget, and risk) first-class knobs to configure **how each panel thinks**:

- Optional **cognitive lens** per panel (preset system text)  
- Optional **freeform `systemAddon`** (operator prose)  
- Optional **judge mode** preset (synthesis style)  
- Default **off** everywhere → zero behavior change for existing combos  

Philosophy: **facilitate resolution, do not attempt to solve every problem.** Not an autonomous cognition product. Config in OmniRoute, enforced by the proxy.

### Success metrics

| Metric | Target |
|--------|--------|
| Unset modes | Identical to pre-epic fusion (no extra system text) |
| Two panels, two modes | `handleSingleModel` captures **different** system content per model |
| Schema round-trip | `createComboSchema` → DB normalize → `resolveFusionUnits` keeps mode + addon |
| Editor save/load | Mode + addon survive PUT/GET; omit when empty |
| No MCP / no client tool schema | Zero new MCP tools for this feature |
| Opt-in only | No global default mode; no silent mutation of non-fusion routes |
| D9 preserved | Panels still `stream:false`, `tool_choice:"none"`, tools array kept |

### Stop criteria (Phase 1 out of scope)

- Porting mcp-think-hardest engines, BranchManager, Surreal, embeddings of thoughts  
- MCP tools for thinking modes  
- Auto-selecting modes from user intent (→ EPIC-23)  
- Quality-gate numeric scores / CPI loop detection (→ EPIC-23)  
- Provider-native **reasoning budget** / `thinking` tokens (different concept — do not overload names)  
- New DB table; stick to combo JSON steps  
- Multi-judge ensembles  
- Applying cognitive inject on non-fusion strategies (unless trivial pure helper reuse later)

---

## 2. Locked product decisions

| # | Decision |
|---|----------|
| **D1** | **Operator owns cognitive config.** Modes are combo editor fields, not model tools. |
| **D2** | **Opt-in, default none.** Missing `thinkingMode` / empty `systemAddon` ⇒ no inject (bit-identical panel body aside from existing D9 flags). |
| **D3** | **Cognitive lens ≠ provider thinking.** Do **not** name modes `low`/`medium`/`high`/`adaptive` (collides with reasoning_effort vocabulary). Use **lens ids** below. |
| **D4** | **Presets are short system appends** (stable English catalog in code). Operator may add `systemAddon` on top of a preset or alone. |
| **D5** | **`custom` lens** requires non-empty `systemAddon` at validate-time (Zod superRefine or runtime 400). |
| **D6** | **Model steps only** for `thinkingMode`/`systemAddon` in Phase 1. Combo-ref panels: hide UI fields; diversity comes from nested combo’s own leaf config or a future epic. |
| **D7** | **Judge mode** is combo `config` (next to `fusionTuning`), not a panel step. Default `synthesize` = current `buildJudgePrompt` behavior. |
| **D8** | Inject **only** on fusion panel fan-out (and single-panel early path when that unit has a mode). Do not inject on acting handoff user turn; judge uses `judgeMode` directive text, not panel lenses. |
| **D9** | Reuse **`injectCustomSystemPrompt`** for system merge across OpenAI/Claude shapes; keep D9 panel flags. |
| **D10** | Catalog lives in one SSoT module (e.g. `open-sse/services/fusionCognitiveLenses.ts` or `src/shared/constants/fusionCognitiveLenses.ts`) imported by runtime + (types only) editor. |

### Phase 1 lens catalog (closed enum)

| `thinkingMode` | Intent (operator-facing) | Inject spirit (not final copy — T22-A freezes strings in tests) |
|----------------|--------------------------|------------------------------------------------------------------|
| *(omit)* | No cognitive inject | — |
| `first-principles` | Decompose assumptions | Challenge framing; restate from fundamentals |
| `adversarial` | Devil’s advocate | Find failure modes, edge cases, weak claims |
| `security` | Threat-minded | Trust boundaries, abuse cases, secrets/auth risks |
| `systems` | 2nd/3rd order | Feedback loops, tradeoffs, unintended effects |
| `implementation` | Concrete builder | Steps, interfaces, what would land in a PR |
| `skeptical-evidence` | What is unproven | Separate fact / inference / missing evidence |
| `custom` | Operator prose only | Requires `systemAddon` |

Optional: `systemAddon` max length **4000** chars (trim); empty string treated as omit.

### Phase 1 judge modes

| `judgeMode` | Behavior |
|-------------|----------|
| `synthesize` (default) | Current consensus / contradictions / unique / blind-spots directive |
| `dialectical` | Force explicit tension between conflicting sources before synthesis |
| `security-review` | Prioritize risk, exploitability, safer recommendation |
| `pick-best` | Select one source’s answer (cite Source N) rather than merge prose |

---

## 3. Domain / architecture

### Bounded context

| Area | Module | Role |
|------|--------|------|
| Lens catalog | NEW shared constants / pure resolvers | id → system text; id → judge directive variant |
| Schema | `src/shared/validation/schemas/combo.ts` | `thinkingMode`, `systemAddon` on **model step**; `judgeMode` on config |
| Step normalize | `src/lib/combos/steps.ts` | Must keep new fields (today strips unknowns) |
| Fusion resolve | `open-sse/services/fusion.ts` | `ResolvedFusionUnit` + `comboStepToFusionUnit` + fan-out clone |
| System inject | `open-sse/services/systemPrompt.ts` | `injectCustomSystemPrompt` |
| Combo entry | `open-sse/services/combo.ts` | Pass judgeMode / units if needed |
| Persistence | `src/lib/db/combos.ts` | JSON blob; no migration if normalize keeps fields |
| UI | `dashboard/fusions/*` | Per-row select + textarea for addon |
| Docs | `docs/architecture/FUSION.md` | Operator SSoT |

### Runtime hook (mandatory design)

Today:

```ts
const panelBody = { ...rest, stream: false, tool_choice: "none" };
// every unit gets panelBody
```

Target:

```ts
const panelBodyBase = { ...rest, stream: false, tool_choice: "none" };
const calls = panel.map((unit) => {
  const unitBody = applyFusionCognitiveLens(panelBodyBase, unit); // identity if unset
  return withTimeout(dispatchFusionUnit({ body: unitBody, unit, ... }), ...);
});
```

- Never mutate shared `panelBodyBase`  
- Single-panel early exit must call the same helper  
- Judge: `buildJudgePrompt(..., judgeMode)` or select among pure builders  

### Plumbing chain (all required or field dies)

```
Zod comboModelStepInputSchema
  → normalizeComboStep (steps.ts)
  → resolveFusionUnits / comboStepToFusionUnit
  → ResolvedFusionUnit.{thinkingMode?, systemAddon?}
  → applyFusionCognitiveLens(body, unit)
  → handleSingleModel / handleComboChat
```

UI chain:

```
FusionUnitRow select/textarea
  → fusionEditorTypes unitToPayload (force structured model object)
  → create/update combo API
  → same normalize path
```

---

## 4. Child task slices

### T22-A · **0107** — Fail-first contracts + pure lens catalog

**Priority**: P0 for the epic (gate)  
**Type**: testing + feature (pure module only)

- [ ] Read `fusion-panel-tools-none`, `fusion-contracts`, `fusion-editor-types`, `systemPrompt.ts`  
- [ ] Add `fusionCognitiveLenses` SSoT: enum list, `resolvePanelLensText(mode, addon)`, `resolveJudgeDirectiveMode(mode)` pure functions  
- [ ] Land **fail-first** unit tests (Node native) — see §6; body-inject tests may fail until T22-C (allowed **only** if task is serial and not merged green alone — prefer landing red tests in same PR as green runtime, or use staged PR: A pure green + contract file that skips runtime until C **unskips**; **preferred**: one vertical PR A+B+C for runtime contracts green)  
- [ ] Freeze lens **string fingerprints** (substring asserts) so copy cannot silently empty  

**Exit**: pure catalog tests green; anti-bullshit file present; documented command list.

### T22-B · **0108** — Schema + normalize + resolve plumb

- [ ] Extend `comboModelStepInputSchema` with optional `thinkingMode` enum + `systemAddon`  
- [ ] `custom` without addon → Zod fail  
- [ ] Unknown mode → Zod fail  
- [ ] `judgeMode` optional on `comboRuntimeConfigSchema` (or nested under fusionTuning — **prefer sibling of fusionTuning** for readability)  
- [ ] `normalizeComboStep` + types keep fields  
- [ ] `comboStepToFusionUnit` + `ResolvedFusionUnit` keep fields  
- [ ] Round-trip tests: schema → resolveFusionUnits  

### T22-C · **0109** — Runtime inject

- [ ] `applyFusionCognitiveLens` in fusion path (panel map + single-panel path)  
- [ ] Compose: preset text + optional addon (separator `\n\n`)  
- [ ] `injectCustomSystemPrompt` only when composed text non-empty  
- [ ] Judge mode variants in `buildJudgePrompt` (or siblings)  
- [ ] Panel modes do **not** alter judge body; judgeMode does **not** alter panel bodies  
- [ ] D9 invariants still pass existing `fusion-panel-tools-none`  
- [ ] **Anti-bullshit body tests green** (different system content per mode)

### T22-D · **0110** — Fusion editor UI

- [ ] `FusionModelUnit.thinkingMode?` / `systemAddon?`  
- [ ] `normalizeFusionUnit` / `unitToPayload` / `buildSavePayload` / `formFromCombo`  
- [ ] `FusionUnitRow`: native `<select>` for lenses + textarea for addon when mode set or always available optional  
- [ ] Hide cognitive fields for `combo-ref`  
- [ ] Preserve mode/addon when re-picking model (`applyPickedModel`)  
- [ ] i18n `combos.fusionCognitive*` with English `tx` fallbacks  
- [ ] **No new topbar / hub chrome** (editor form only — Hard Rules #22–23)  
- [ ] Editor pure tests extended  

### T22-E · **0111** — Docs + optional presets + ledger

- [ ] Update `docs/architecture/FUSION.md` (fields, examples, D1–D10 summary)  
- [ ] Optional: 2–3 **template** combos documented or “Duplicate from template” in UI (if cheap; else docs-only recipes)  
- [ ] `.changelog/` entry via project process  
- [ ] Smoke matrix note for operators  

---

## 5. Where (files)

| Action | Path |
|--------|------|
| NEW catalog | `src/shared/constants/fusionCognitiveLenses.ts` **or** `open-sse/services/fusionCognitiveLenses.ts` (pick one; prefer `src/shared/constants` if UI imports without open-sse) |
| Schema | `src/shared/validation/schemas/combo.ts` |
| Steps | `src/lib/combos/steps.ts` |
| Runtime | `open-sse/services/fusion.ts` |
| Inject helper | `open-sse/services/systemPrompt.ts` (reuse; extend only if Gemini `system_instruction` gap proven) |
| Combo wire | `open-sse/services/combo.ts` (if judgeMode pass-through needed) |
| UI types | `src/app/(dashboard)/dashboard/fusions/fusionEditorTypes.ts` |
| UI row | `.../FusionUnitRow.tsx`, `FusionEditorClient.tsx` |
| i18n | `src/i18n/messages/en.json` (+ other locales only if policy requires parity in-epic) |
| Docs | `docs/architecture/FUSION.md` |
| Tests | `tests/unit/fusion-cognitive-diversity*.test.ts`, extend `fusion-contracts`, `fusion-editor-types`, `fusion-panel-tools-none` |

---

## 6. Anti-bullshit test contracts (TDD)

**Runner**: Node native only (house style for fusion).

```bash
node --import tsx/esm --test tests/unit/fusion-cognitive-diversity.test.ts
node --import tsx/esm --test tests/unit/fusion-panel-tools-none.test.ts
node --import tsx/esm --test tests/unit/fusion-contracts.test.ts
node --import tsx/esm --test tests/unit/fusion-editor-types.test.ts
```

**Mock style to copy**: `tests/unit/fusion-panel-tools-none.test.ts` — accumulate `panelBodies` / `singleCalls` from `handleSingleModel(body, model)`.

### Required assertions (fail-first → green by end of T22-C / T22-D)

1. **Catalog purity**: every non-custom lens id resolves to non-empty string; `custom` alone empty without addon; `custom`+addon returns addon.  
2. **Schema accept**: model step with `thinkingMode: "adversarial"` parses; value present on `result.data.models[0]`.  
3. **Schema reject**: `thinkingMode: "turbo"` fails; `thinkingMode: "custom"` without `systemAddon` fails.  
4. **Normalize plumb**: `normalizeComboStep` + `resolveFusionUnits` preserve mode+addon.  
5. **Baseline identity**: two panels, no modes → system content equal (or both lack inject marker); still D9 flags.  
6. **Diversity inject (core anti-bullshit)**: panel A `first-principles`, panel B `adversarial` → captured bodies’ system text differ; each contains that lens’s fingerprint substring.  
7. **Addon composition**: mode + `systemAddon` ⇒ system contains **both** fingerprints.  
8. **Judge isolation**: panel modes do not appear in judge body; `judgeMode: "pick-best"` changes judge prompt vs default.  
9. **Editor round-trip**: `formFromCombo(buildSavePayload(form))` keeps mode+addon; bare string model when no metadata still allowed.  
10. **Combo-ref**: unit with only combo-ref has no thinking fields in payload; runtime does not throw.

### Suggested test file

`tests/unit/fusion-cognitive-diversity.test.ts` — pure + schema + runtime sections (or split schema/editor/runtime if file grows).

---

## 7. Operator recipes (product intent)

| Recipe | Trigger | Panels |
|--------|---------|--------|
| Write-safe | tool-call write/edit | implementation + adversarial + security → judge synthesize → acting |
| Design deep | text-match architect/design | first-principles + systems + implementation |
| Cheap diversity | conditional, small models | **same** cheap model × 3 **different** lenses |

Budget/keys: operator picks models; modes only change system framing.

---

## 8. Risks & non-goals

| Risk | Mitigation |
|------|------------|
| Name collision with provider “thinking” | D3 naming; docs call them **cognitive lenses** |
| Zod strip kills feature | Explicit schema + normalize tests |
| Shared panelBody mutation | Clone per unit; test diversity |
| Prompt injection via systemAddon | Operator-trusted config (same trust as combo edit); max length; no client header override in P1 |
| i18n catalog vs English inject | Inject text **English technical** (model-facing); UI labels i18n |
| Scope creep to MCP | Explicit stop criteria |

---

## 9. Promotion checklist (architect → `01-open/`)

- [ ] Operator confirms D1–D10 + lens list (edit list before promote if needed)  
- [ ] Confirm task IDs free (next after **0106** → **0107+**)  
- [ ] Expand each T22-* into full template (`docs/tasks/000-template.md`, ≥50 lines, subtasks, exits)  
- [ ] Worktree isolation when implementing (Hard Rule #19)  
- [ ] EPIC-23 remains **held** until Phase 1 renders in real use  

---

## 10. Definition of done (epic)

- [ ] All children completed + reviewed  
- [ ] Anti-bullshit suite green  
- [ ] Existing fusion suite green  
- [ ] FUSION.md updated  
- [ ] Changelog ledger entry  
- [ ] No new MCP tools  
- [ ] Default-off verified by test  

---

**Author**: architect-orchestrator  
**Date**: 2026-07-22  
**Inspiration**: operator synthesis after mcp-think-hardest review — *facilitate, don’t paternalize*.
