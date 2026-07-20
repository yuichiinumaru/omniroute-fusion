# Epic 0004 — Fusion Acting Unit (Executor + Panelset)

> **Status**: **Closed (implementation complete 2026-07-19)** — residual fusion runtime polish → **EPIC-11** (not greenfield re-decomposition)  
> **Priority**: High (P0) — historical  
> **Author**: GT-OmniRoute-Architect  
> **Date**: 2026-07-09 · **Closeout evidence**: 2026-07-19 (EPIC-10 T10-B / Task **0063**)  
> **Project**: omniroute  
> **Depends on**: Epic 0003 (Fusion First-Class) — completed tasks 0010–0018  
> **Type**: feature / EXTEND + UX_VIS  
>
> **Do not re-decompose Acting as a greenfield epic.** Wave 1–2 audits rejected the false-gap: runtime/schema/UI/docs/tests already ship acting. Task **0062** does **not** own this file (only 0003/0005–0008 + QUEUE).  
> **EPIC-11** owns remaining fusion residuals (tool-call window, single-survivor, panel timeout, list chip, etc.). Combo-level A6 miss→acting-only tests are **present** in tree (see evidence map) — do not re-open 0004 solely for “missing A6”.

---

## Goal

Add an optional **Acting** unit (model or combo-ref) to Fusion so that:

1. **Normal path (trigger miss / no fusion needed):** only the Acting unit handles the request.
2. **Fusion path (trigger hit or always):** panels fan out → judge synthesizes a review → review is handed to Acting → **Acting is the final voice**.

This lets operators reuse the same panelset (`fusion-p1…p5` + `fusion-judge`) across roles while `builder` / `reviewer` / `architect` remain the acting combos.

## Locked decisions

| # | Decision | Choice |
|---|----------|--------|
| A1 | Final voice | **Acting** (not judge) when acting is set |
| A2 | Timing | Same request, synchronous handoff |
| A3 | Handoff | `append-user-turn` with review prompt (default; only mode in v1) |
| A4 | Shape | Same as judge: top-level `acting?: comboModelEntry` (model \| combo-ref \| string) |
| A5 | Backward compat | No `acting` → Epic 0003 behavior (judge final) |
| A6 | Trigger miss + acting | Dispatch **acting only** (do not require fallbackStrategy) |
| A7 | Trigger miss + no acting | Existing `fallbackStrategy` path |
| A8 | Acting ≠ panel role | Separate field, never `role: "acting"` on steps |
| A9 | Cycle/depth | Reuse existing combo-ref nesting guards |

## Runtime flow

```
Request → fusion combo
  ├─ trigger miss + acting set     → dispatch(acting, original body) → Response
  ├─ trigger miss + no acting      → fallbackStrategy (existing)
  └─ trigger hit / always
        → panels (parallel, tool_choice:none, stream:false)
        → judge synthesizes review (internal)
        → if acting set:
              append review turn → dispatch(acting, enriched body) → Response
           else:
              return judge response (legacy)
```

## Data contract

```ts
{
  strategy: "fusion" | "conditional-fusion",
  models: FusionUnit[],          // panels
  judge?: FusionUnit,            // existing
  acting?: FusionUnit,           // NEW — model | combo-ref | string
  config: {
    triggers?: {...},
    fallbackStrategy?: string,   // used only when acting absent on miss
    fusionTuning?: {...},
    // reserved for later: actingHandoff?: "append-user-turn"
  }
}
```

## Non-goals (v1)

- Multi-turn deferred fusion
- tool-result handoff mode
- Streaming panel tokens
- Auto-select acting from OpenCode role names

---

## Evidence map (verified 2026-07-19 — Task 0063)

> Live `rg` against the workspace. Paths are relative to repo root. **No product code was changed by this closeout.**

| Acceptance (AC) | Status | Verified surface | `rg` / path evidence (reconfirmed 2026-07-19) |
|-----------------|--------|------------------|-----------------------------------------------|
| Schema accepts top-level `acting` | **Done** | `src/shared/validation/schemas/combo.ts` | `acting: comboModelEntry.optional()` ~L270 create; ~L327 update (nullable clear) |
| `resolveFusionUnits` returns optional acting | **Done** | `open-sse/services/fusion.ts` | `export function resolveFusionUnits` ~L620; returns `{ panels, judge, acting }` |
| `handleFusionChatV2` handoff when acting set | **Done** | `open-sse/services/fusion.ts` | `async function finalizeWithActing` ~L670; call sites after judge / single-survivor |
| combo.ts: miss + acting → acting only | **Done** | `open-sse/services/combo.ts` | `const dispatchActingOnly` ~L949; trigger-miss gate invokes acting-only |
| UI section Acting in fusion editor | **Done** | `src/app/(dashboard)/dashboard/fusions/` | `FusionUnitsSections.tsx` Acting section; `FusionEditorClient.tsx` `scope: "acting"`; `FusionUnitRow.tsx` |
| Unit tests resolve + V2 handoff | **Done** | `tests/unit/fusion-acting.test.ts` | `describe("resolveFusionUnits — acting")`; `describe("handleFusionChatV2 — acting handoff")` |
| Unit tests miss path at **combo gate** (A6) | **Done** (present) | `tests/unit/combo-fusion-strategy.test.ts` | Block `// Epic 0004 / A6` ~L675+; miss+model, miss+combo-ref, stream/tools, immutability, miss+no acting fallback, hit still fuses |
| Docs FUSION.md updated | **Done** | `docs/architecture/FUSION.md` | Acting overview, units table, trigger miss acting-only, diagram with `acting?` |
| Backward compat: no acting = old behavior | **Done** | fusion-acting test + runtime | `legacy path (no acting): judge is final voice` in `fusion-acting.test.ts`; `finalizeWithActing` early return when `!args.acting` |

### Residual (not 0004 greenfield)

| Residual | Owner | Notes |
|----------|-------|-------|
| Other fusion runtime residuals (sticky tool-call, single-survivor double dispatch, panel timeout abort, list acting chip, dispatchActingOnly comment honesty, …) | **`docs/tasks/00-planning/EPIC-11-omniroute-fusion-runtime-residuals.md`** | Do **not** re-open Epic 0004 for these. Wave 2 H-FUSION-003 claimed “no combo A6 tests”; tree now has them — EPIC-11 may still track honesty/docs/list polish via child tasks (e.g. **0067+**). |
| Formal child task series 0019-style under 0004 | **None** | Work was absorbed with 0003 series + acting polish; closeout does not invent phantom children. |

---

## Acceptance

Checked from evidence map (implementation complete). A6 **combo-level** coverage is grepped true — not false-closed.

- [x] Schema accepts top-level `acting` — `combo.ts` L270 / L327
- [x] resolveFusionUnits returns optional acting — `fusion.ts` `resolveFusionUnits`
- [x] handleFusionChatV2 handoff when acting set — `finalizeWithActing`
- [x] combo.ts: miss + acting → acting only — `dispatchActingOnly`
- [x] UI section Acting in fusion editor — `FusionUnitsSections.tsx` / editor save
- [x] Unit tests for resolve + dispatch + miss path — `fusion-acting.test.ts` + `combo-fusion-strategy.test.ts` A6 block
- [x] Docs FUSION.md updated — acting sections
- [x] Backward compat: no acting = old behavior — A5 test + runtime

---

## Closeout notes

1. Agents **must not** spawn a new Acting epic because the header said Active or ACs were unchecked — that was planning drift (Archivist F-05 / fusion residual audit).  
2. Implementation complete **does not** claim Wave 2 bugs (sticky tool-call, double upstream survivor, panel timeout) are fixed — those are **EPIC-11**.  
3. Hygiene for epics **0003 / 0005–0008 / QUEUE** is Task **0062** (separate file ownership).
