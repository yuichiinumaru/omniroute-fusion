# Epic 0003 — Fusion First-Class (Panels + Judge as Combos)

> **Status**: Active (Epic) — child tasks in `docs/tasks/01-open/0010`–`0018`
> **Priority**: High (P0)
> **Author**: GT-OmniRoute-Architect
> **Date**: 2026-07-09
> **Project**: omniroute
> **Type**: feature / architecture
> **Action types**: `EXTEND` (runtime) + `NEW` (UI surface) + `UX_VIS` (sidebar/page)
> **Depends on**: none (does NOT depend on v3.8.46 merge; design is compatible with both current HEAD and origin/main)
> **Supersedes / absorbs**: the ad-hoc `conditional-fusion` strategy sketch from the current working tree
> **Related planning**:
> - `docs/architecture/FUSION-TRIGGERS-CONDITIONAL.md` (keep as design history; triggers become a Fusion field)
> - `docs/tasks/00-planning/0001-omniroute-web-providers-fix-plan.md` (orthogonal; web providers feed the panel pool)
> - `docs/tasks/00-planning/0002-omniroute-qwen-web-captcha-solver.md` (orthogonal; deferred)

---

## 1. Goal (RF8 · Goals)

### Problem

The current Fusion strategy (`strategy: "fusion"` in `open-sse/services/fusion.ts`) is unusable in practice for two reasons:

1. **No combo nesting for panels/judge.** `handleFusionChat` only accepts plain model strings and calls `handleSingleModel(body, modelStr)`. When a panel model exhausts quota / cools down / fails, the operator must edit the fusion combo by hand. That defeats OmniRoute's purpose (automatic failover).
2. **No per-panel control surface.** There is no first-class way to give panel A a different system instruction / model pool / fallback strategy than panel B, nor a first-class UI for the judge. `cfg.judgeModel` is a free-text string buried in combo config; triggers for conditional dispatch live only as a local sketch.

### Value

Make Fusion a **first-class product surface** where:

- Each **panel** is a model **or a combo-ref** (inherits that combo's strategy, quota failover, system prompt, connections).
- The **judge** is a model **or a combo-ref** (same inheritance).
- **Triggers** decide when fusion fires (tool-call / text-match / always); otherwise fall back to a cheaper strategy.
- A dedicated **Fusions** menu (below Combos) exposes this without overloading the Combo editor.

### Success metrics

| Metric | Target |
|--------|--------|
| Panel unit can be `combo-ref` | Runtime resolves nested combo and returns `Response` |
| Judge unit can be `combo-ref` | Same |
| Quota failover on a panel | Killing panel model A's credentials routes to sibling models inside panel combo A without operator edit |
| Per-panel instructions | Editing system prompt / config of panel-combo A changes only that panel's answers |
| Triggers | Request without matching tool/text patterns does **not** pay fusion cost; uses `fallbackStrategy` |
| UI discoverability | Sidebar has `Fusions` under `Combos`; create/edit works without opening Combo editor |
| Backward compat | Existing `strategy: "fusion"` + `cfg.judgeModel: string` combos keep working unchanged |
| Regression | Existing fusion unit tests still pass; new tests cover combo-ref panels/judge + triggers |

### Stop criteria (out of scope for this epic)

- Captcha solvers for qwen-web (Task 0002).
- Merging upstream v3.8.46 (orthogonal; design is merge-safe).
- New DB table `fusions` (Phase 2 only — Phase 1 reuses `combos` with `strategy ∈ {fusion, conditional-fusion}`).
- Changing the judge synthesis prompt semantics (`buildJudgePrompt`) beyond what is needed for unit labels.
- Multi-judge ensembles, weighted judges, or streaming panel fan-out.

---

## 2. Domain (RF8 · Domain)

### Bounded context

| Area | Owner modules | Notes |
|------|---------------|-------|
| Fusion runtime | `open-sse/services/fusion.ts` | Fan-out + quorum-grace + judge synthesis |
| Combo dispatch | `open-sse/services/combo.ts` | Strategy branch that calls `handleFusionChat` |
| Nested combo-ref | `open-sse/services/combo/runtimeUnits.ts` | Already returns `Promise<Response>` for combo-ref units |
| Combo schema | `src/shared/validation/schemas/combo.ts` | Zod for `judgeModel`, `fusionTuning`, triggers |
| Strategy registry | `src/shared/constants/routingStrategies.ts` | `ROUTING_STRATEGY_VALUES` + UI labels |
| Combo step model | `src/lib/combos/steps.ts` | `ComboModelStep` / `ComboRefStep` |
| Persistence | `src/lib/db/combos.ts` | JSON `data` blob — no schema migration for Phase 1 |
| Sidebar | `src/shared/constants/sidebarVisibility.ts` | Add `fusions` item |
| UI | `src/app/(dashboard)/dashboard/fusions/**` | NEW dedicated pages |
| UI reuse | `src/app/(dashboard)/dashboard/combos/**` | Pickers / cards only — not full ComboEditor |

### Current state (evidence)

- `handleFusionChat` signature today (working tree):
  ```ts
  handleFusionChat({ body, models: string[], handleSingleModel, log, comboName?, judgeModel?: string, tuning? }): Promise<Response>
  ```
  Panels are **strings only**. Judge is **string only**. `tool_choice: "none"` + `stream: false` on panel body is already correct.
- Combo dispatch (`combo.ts` fusion branch) still flattens steps to `obj.model` strings and **drops `combo-ref` silently**.
- Nested combo-ref infrastructure already exists and returns `Response`:
  - `resolveComboRuntimeUnits`
  - `executeComboRefUnit` (depth + cycle guards)
  - `nestedComboMode: "execute"`
- Schema already has:
  - `comboModelEntry = string | model-step | combo-ref-step`
  - `judgeModel: z.string().optional()`
  - `fusionTuning: { minPanel, stragglerGraceMs, panelHardTimeoutMs }`
  - Working-tree sketch: `triggers` + `fallbackStrategy` for `conditional-fusion`
- UI: Combos live at `/dashboard/combos` (`page.tsx` ~4589 lines). No Fusions surface.

### False gaps (do NOT rebuild)

| Tempting rebuild | Reality |
|------------------|---------|
| New nested-combo executor | Reuse `runtimeUnits.ts` / `handleComboChat` |
| New system-prompt injection for panels | Put instructions on the **child combo** (existing config / endpoint system prompt / per-combo settings) |
| New failover engine inside fusion | Child combo strategy already does failover |
| New persistence table in Phase 1 | Filter `combos` where `strategy ∈ {fusion, conditional-fusion}` |
| Full ComboEditor reuse | Overloads sticky RR / shadow / eval UI — build a focused Fusion editor that imports pickers only |

### Evidence precedence

1. Runtime code (`fusion.ts`, `combo.ts`, `runtimeUnits.ts`) over docs.
2. Zod schemas over UI assumptions.
3. Existing combo-ref step shape over inventing a parallel type.

---

## 3. Feature slices (RF8 · Features)

Vertical slices, ordered by dependency. Each maps to one or more atomic tasks.

| Slice | Name | Outcome | Action |
|-------|------|---------|--------|
| **S0** | Contracts | Zod + types + strategy registry for judge unit + triggers + fallback | EXTEND |
| **S1** | Runtime units | `ResolvedFusionUnit` + resolve panels/judge from combo data (model \| combo-ref) | EXTEND |
| **S2** | Runtime dispatch | `handleFusionChat` fans out via `handleSingleModel` **or** `handleComboChat`; judge same | EXTEND |
| **S3** | Combo branch wire | `combo.ts` fusion + conditional-fusion branches pass units + `allCombos` + nesting, not string lists | EXTEND |
| **S4** | Triggers | Conditional dispatch: match tool/text patterns → fusion; else `fallbackStrategy` | EXTEND |
| **S5** | UI shell | Sidebar item + `/dashboard/fusions` list (filter fusion strategies) + create/delete | NEW / UX_VIS |
| **S6** | UI editor | Editor with Panels / Judge / Triggers / Tuning sections; model + combo-ref pickers | NEW / UX_VIS |
| **S7** | Docs + i18n + migration notes | Architecture doc, i18n keys, changelog, operator guide | EXPOSE |
| **S8** | Hardening | Unit tests, integration smoke, regression on plain-string fusion | HARDEN |

### Slice dependency graph

```
S0 ─┬─► S1 ─► S2 ─► S3 ─┬─► S8
    │                   │
    └─► S4 ─────────────┘
    │
    └─► S5 ─► S6 ─► S7
```

- Runtime path: S0 → S1 → S2 → S3 → S4 → S8
- UI path: S0 → S5 → S6 → S7 (can parallelize with S1–S4 after S0)
- S8 depends on S2+S3+S4

---

## 4. Representation (RF8 · RDD)

### Operator experience (target)

1. Sidebar → **Fusions** (directly under Combos).
2. Click **New Fusion** → name it.
3. **Panels** section: `+` adds a panel row. Each row is either:
   - a model (provider/model/connection picker), or
   - a combo-ref (dropdown of existing non-fusion combos recommended; fusion→fusion nesting allowed only within depth guards).
4. **Judge** section: single unit, same picker shapes.
5. **Triggers** section:
   - Mode: `always` | `tool-call` | `text-match`
   - Tool patterns (glob list) when `tool-call`
   - Text patterns when `text-match`
   - Fallback strategy (any non-fusion strategy) when trigger misses
6. **Tuning**: minPanel, stragglerGraceMs, panelHardTimeoutMs (advanced accordion).
7. Save → appears in Fusions list and as a selectable model target (`combo:Name` / existing combo routing path).

### Mental model (one sentence)

> A Fusion is a parallel panel of Combos (or models) whose answers a Judge Combo synthesizes — with optional triggers so you only pay the cost when it matters.

---

## 5. Specs (RF8 · SDD)

### 5.1 Data contract (Phase 1 — stored in `combos.data`)

```ts
// Conceptual TypeScript — authoritative form is Zod in schemas/combo.ts

type FusionUnit =
  | string // legacy model string
  | { kind?: "model"; model: string; provider?: string; providerId?: string; connectionId?: string | null; label?: string; weight?: number; tags?: string[] }
  | { kind: "combo-ref"; comboName: string; label?: string; weight?: number };

type FusionJudge =
  | string // legacy cfg.judgeModel
  | FusionUnit;

type FusionTriggers = {
  mode: "always" | "tool-call" | "text-match";
  toolPatterns?: string[]; // glob, default ["write*","edit*","create*"] when mode=tool-call
  textPatterns?: string[]; // substring or glob against latest user text when mode=text-match
  requireApproval?: boolean; // reserved; default false; no runtime gate in Phase 1 beyond logging
};

// combo.data shape when strategy is fusion | conditional-fusion
{
  strategy: "fusion" | "conditional-fusion",
  models: FusionUnit[],          // panels (order preserved; parallelism ignores order)
  // Judge resolution order:
  // 1) data.judge if set
  // 2) config.judgeModel if string
  // 3) first successful panel unit / first panel model string
  judge?: FusionJudge,
  config?: {
    judgeModel?: string,         // legacy
    fusionTuning?: {
      minPanel?: number,         // default 2
      stragglerGraceMs?: number, // default 8000
      panelHardTimeoutMs?: number // default 90000
    },
    triggers?: FusionTriggers,   // required semantics for conditional-fusion; optional for fusion (= always)
    fallbackStrategy?: string,   // used when triggers miss; default "priority"
    // ...passthrough other combo config
  }
}
```

### 5.2 Zod deltas (S0)

| Field | Change |
|-------|--------|
| `ROUTING_STRATEGY_VALUES` | Ensure `"fusion"` present; add `"conditional-fusion"` if missing |
| `comboRuntimeConfigSchema` | Extend `judgeModel` acceptance **or** add top-level `judge` on combo record schema |
| New `fusionUnitSchema` | union of model step / combo-ref step / string |
| New `fusionJudgeSchema` | same as unit |
| New / harden `triggers` | mode enum + patterns + requireApproval |
| `fallbackStrategy` | string max 50, not equal to `fusion` / `conditional-fusion` (reject self-recursion) |

**Decision locked:** judge is a **separate field** (`data.judge` / `config.judgeModel`), **not** `role: "judge"` on a step.

### 5.3 Runtime contract

```ts
type ResolvedFusionUnit =
  | { kind: "model"; model: string; label?: string }
  | { kind: "combo-ref"; comboName: string; label?: string };

type HandleFusionChatOptionsV2 = {
  body: Record<string, unknown>;
  panels: ResolvedFusionUnit[];
  judge: ResolvedFusionUnit;
  handleSingleModel: HandleSingleModel; // (body, modelStr, target?) => Promise<Response>
  handleComboChat?: (opts: HandleComboChatOptions) => Promise<Response>; // required if any unit is combo-ref
  allCombos?: ComboCollectionLike;
  nesting?: ComboNestingContext | null;
  log: ComboLogger;
  comboName?: string;
  tuning?: FusionTuning;
};
```

**Invariants:**

1. Panel body: `stream: false`, `tool_choice: "none"`, tools **kept** in body (current working-tree fix).
2. Judge body: original client body + appended judge user turn (`appendUserTurn` + `buildJudgePrompt`).
3. Combo-ref units must call `handleComboChat` with incremented nesting + cycle detection (reuse `runtimeUnits` helpers or equivalent).
4. Missing `handleComboChat` when a combo-ref is present → `400` with clear error (do not silent-drop).
5. Depth / cycle errors surface as `503` with existing nested-combo messages.
6. 0 panel answers → `503`; 1 panel answer → return that unit's response path (re-dispatch or passthrough policy documented in task S2).
7. Triggers miss → do **not** call fusion; re-enter combo dispatch with `fallbackStrategy` (no infinite loop: fallback cannot be fusion/conditional-fusion).

### 5.4 API / routing surface

No new public HTTP routes required for Phase 1. Fusions are combos:

- CRUD: existing combo APIs (`src/lib/db/combos.ts` + dashboard combo routes).
- Optional convenience: `GET /api/combos?strategy=fusion,conditional-fusion` filter — only if list page needs it; otherwise client-side filter is enough.

### 5.5 UI routes

| Route | Purpose |
|-------|---------|
| `/dashboard/fusions` | List fusions |
| `/dashboard/fusions/[id]` | Editor |
| `/dashboard/fusions/new` | Create (or modal on list) |

Sidebar: `id: "fusions"`, `href: "/dashboard/fusions"`, placed immediately after `combos` / `combos-live`.

---

## 6. Behaviour (RF8 · BDD)

### Scenario A — Plain model panel (backward compat)

```
Given a combo strategy=fusion with models=["a","b","c"] and config.judgeModel="a"
When a chat request targets that combo
Then panels a,b,c are called in parallel via handleSingleModel
And judge a synthesizes the final answer
And behavior matches pre-epic fusion for the happy path
```

### Scenario B — Combo-ref panel with quota failover

```
Given panel P1 = combo-ref "gpt-pool" (models M1,M2 priority)
And M1 credentials are exhausted / circuit open
When fusion runs
Then P1's handleComboChat fails over to M2 inside gpt-pool
And fusion still receives a panel answer from P1 if M2 succeeds
And the operator does not edit the fusion
```

### Scenario C — Per-panel instructions

```
Given panel combo A has system prompt "Focus on security"
And panel combo B has system prompt "Focus on performance"
When fusion runs on an architecture question
Then source texts reflect the different focuses
And the judge synthesizes without naming sources
```

### Scenario D — Conditional trigger hit

```
Given strategy=conditional-fusion
And triggers.mode=tool-call with toolPatterns=["write*","edit*"]
And the request includes a tool call named "write_file"
When dispatch runs
Then fusion fan-out executes
```

### Scenario E — Conditional trigger miss

```
Given same fusion as D
And the request has no matching tool calls
When dispatch runs
Then fusion is skipped
And fallbackStrategy (e.g. priority) handles the request
And no panel fan-out is logged
```

### Scenario F — Judge as combo-ref

```
Given judge = combo-ref "synthesis-judge"
When panels return ≥2 answers
Then judge path calls handleComboChat for synthesis-judge with judgeBody
And the client receives that combo's response
```

### Scenario G — Cycle / depth

```
Given fusion F refs combo C which refs fusion F
When dispatch runs
Then runtime returns 503 circular reference (existing guard)
And does not stack overflow
```

### Scenario H — UI create

```
Given operator opens /dashboard/fusions
When they create a fusion with 2 combo-ref panels + 1 model judge + tool-call trigger
Then the record is saved as a combo with strategy fusion|conditional-fusion
And it appears in the Fusions list
And it is usable as a routing target
```

---

## 7. Test (RF8 · TDD)

### Unit (required)

| Suite | Asserts |
|-------|---------|
| `tests/unit/fusion-units-resolve.test.ts` | Resolves string / model-step / combo-ref; legacy judgeModel; default judge |
| `tests/unit/fusion-combo-ref-dispatch.test.ts` | Mock handleSingleModel + handleComboChat; verifies which is called per unit |
| `tests/unit/fusion-triggers.test.ts` | tool glob match / miss / text match / always; fallback rejection of fusion strategies |
| `tests/unit/fusion-panel-tools-none.test.ts` | Panel body keeps tools, sets tool_choice none, stream false |
| Existing fusion extract/judge prompt tests | Still pass |

### Integration / smoke

| Check | Command / action |
|-------|------------------|
| Typecheck | `npm run typecheck:core` |
| Targeted unit | `node --import tsx/esm --test tests/unit/fusion-*.test.ts` |
| Manual smoke on :21000 | Create fusion with 2 openrouter free models + judge; chat; verify multi-source synthesis |
| Failover smoke | Disable first model of panel combo; verify second model used |

### Proof artifacts for closeout

- Test command output (pass counts)
- Screenshot or API transcript of Fusions page create/edit (optional but preferred)
- Log snippet showing `FUSION fan-out` with combo-ref labels

---

## 8. Eval (RF8 · Eval)

| Dimension | Pass rule |
|-----------|-----------|
| Correctness | Scenarios A–G pass in tests; H verified manually or e2e |
| Usefulness | Operator can build a fusion that survives single-model quota loss without editing fusion |
| Governance | No secrets logged; errors via `errorResponse` / `sanitizeErrorMessage`; Zod on write path |
| Lifecycle | Legacy string judge/panels still work; conditional-fusion sketch either promoted or replaced cleanly |
| Merge-safety | Changes localized to fusion/combo schema/UI; no dependency on unmerged v3.8.46 APIs beyond patterns already present on HEAD |

### Decision path

- If nested `handleComboChat` from fusion creates double-timeout / double-tool-strip issues → document and fix in S2 with adapter that only strips tools once at fusion boundary.
- If UI reuse of combo pickers is blocked by tight coupling → copy minimal picker components rather than import whole page.
- If Phase 1 filtering of combos is too weak for UX → Phase 2 table `fusions` (new epic, not this one).

---

## 9. Locked design decisions

| # | Decision | Choice | Rejected alternative |
|---|----------|--------|----------------------|
| D1 | Judge placement | Separate field `judge` / legacy `judgeModel` | `role: "judge"` on step |
| D2 | Panel identity | Reuse `comboModelEntry` (model \| combo-ref \| string) | New panel type system |
| D3 | Nesting mechanism | Call `handleComboChat` / runtimeUnits | Reimplement failover inside fusion |
| D4 | Persistence Phase 1 | Reuse `combos` table + strategy filter | New `fusions` table now |
| D5 | UI surface | Dedicated `/dashboard/fusions` page | Mode inside ComboEditor |
| D6 | Component reuse | Import pickers/cards only | Embed full ComboEditor |
| D7 | Triggers | First-class fusion config; strategy may be `conditional-fusion` or `fusion`+triggers.mode | Separate product |
| D8 | Fallback strategies | Any non-fusion strategy | Allow nested fusion fallback |
| D9 | Panel tools policy | Keep tools, `tool_choice: "none"` | Strip tools (causes short refusals) |
| D10 | Scope vs upstream merge | Implement on current tree; keep diffs merge-friendly | Block on v3.8.46 |

---

## 10. Implementation map (for task architect)

### Files to read first (every runtime task)

- `open-sse/services/fusion.ts`
- `open-sse/services/combo.ts` (fusion + conditional-fusion branches)
- `open-sse/services/combo/runtimeUnits.ts`
- `open-sse/services/combo/types.ts`
- `src/shared/validation/schemas/combo.ts`
- `src/shared/constants/routingStrategies.ts`
- `src/lib/combos/steps.ts`
- `src/lib/db/combos.ts`

### Files to read first (every UI task)

- `src/shared/constants/sidebarVisibility.ts`
- `src/app/(dashboard)/dashboard/combos/page.tsx` (structure only — do not clone wholesale)
- `src/app/(dashboard)/dashboard/combos/ComboControlCenterClient.tsx`
- `src/shared/components/ModelSelectModal.tsx` (or current model picker)
- Combo-ref selection UI if present in combo builder steps

### Suggested atomic task breakdown (architect may refine numbering)

| ID (suggested) | Slice | Title | Parallel? |
|----------------|-------|-------|-----------|
| 0010 | S0 | Fusion contracts: Zod + strategy registry + types | Blocker for others |
| 0011 | S1 | Resolve FusionUnit from combo data | After 0010 |
| 0012 | S2 | handleFusionChat multi-unit dispatch | After 0011 |
| 0013 | S3 | Wire combo.ts fusion branches to V2 options | After 0012 |
| 0014 | S4 | Triggers + fallbackStrategy runtime | After 0010 (can parallel 0011–13 if careful; prefer after 0013) |
| 0015 | S5 | Fusions sidebar + list page | After 0010 |
| 0016 | S6 | Fusions editor (panels/judge/triggers/tuning) | After 0015 |
| 0017 | S7 | Docs, i18n keys, operator notes, changelog | After 0016 + runtime green |
| 0018 | S8 | Test suite + regression hardening | After 0013+0014 |

Numbering note: local OmniRoute namespace; last digit `0` = blocker. Architect must check collisions with existing `0001`/`0002` planning docs and any open tasks.

---

## 11. Risks

| Risk | Mitigation |
|------|------------|
| Double application of panel body transforms when nested combo also mutates body | Fusion owns panelBody; child combo receives already-transformed body; document ownership |
| Latency explosion (N combos × M models) | Tuning hard timeout; document operator guidance: panels should be small combos |
| Circular fusion↔combo graphs | Existing nesting visited set; tests for cycle |
| UI scope creep into full combo editor | Explicit non-goals in S5/S6 tasks |
| Conditional-fusion name vs fusion+triggers.mode | Prefer: `conditional-fusion` when triggers.mode ≠ always; keep alias acceptance |
| Working tree already dirty with other fixes | Tasks must only touch fusion-related files listed; no drive-by web-provider edits |

---

## 12. Non-goals (explicit)

- Paying captcha solvers
- Upstream merge / backup branch operations
- Redesigning judge prompt philosophy
- Streaming panel tokens to the client mid-fusion
- Auto-building panels from free-model rankings (future)
- Multi-judge voting

---

## 13. Acceptance for the epic as a whole

Epic is done when:

1. All promoted child tasks are in `04-completed/` with Completion Evidence.
2. Scenarios A–G automated; H manually verified on dev server.
3. An operator can create a Fusion whose panels are combos, lose one underlying model, and still get a fused answer without editing the Fusion.
4. Triggers skip fusion cost on non-matching requests.
5. Sidebar Fusions page is the primary configuration surface.
6. Legacy string-only fusion combos still work.
7. CHANGELOG entry exists for the feature.

---

## 14. Handoff to Task Architect

**Input artifact for decomposition:** this file.

**Required outputs:**

1. Atomic tasks in `docs/tasks/01-open/` following `docs/tasks/.archive/000-template-moved-to-parent.md` (or restored `000-template.md` if present).
2. Each task ≥50 lines, with:
   - Objective, Background, Test Requirements, Exit Conditions
   - Subtasks starting with **Read existing code**
   - Where table
   - How / Why
   - Anti-hallucination guardrails
   - Empty Completion Evidence section
3. Dependencies expressed as `Task NNNN` (lane-neutral).
4. Action type tags: NEW / EXTEND / EXPOSE / HARDEN / UX_VIS.
5. Exact verification commands per exit condition.
6. Do **not** implement code. Do **not** edit `tasklist.md` unless asked.
7. Do **not** expand scope into web-provider fixes or upstream merge.

**After architect returns:** parent (OmniRoute Architect) reviews tasks for fidelity to D1–D10 and slice graph, then launches builders only for tasks that are 100% ready.
