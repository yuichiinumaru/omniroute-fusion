# Epic 0004 — Fusion Acting Unit (Executor + Panelset)

> **Status**: Active (implementation in progress)
> **Priority**: High (P0)
> **Author**: GT-OmniRoute-Architect
> **Date**: 2026-07-09
> **Project**: omniroute
> **Depends on**: Epic 0003 (Fusion First-Class) — completed tasks 0010–0018
> **Type**: feature / EXTEND + UX_VIS

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

## Acceptance

- [ ] Schema accepts top-level `acting`
- [ ] resolveFusionUnits returns optional acting
- [ ] handleFusionChatV2 handoff when acting set
- [ ] combo.ts: miss + acting → acting only
- [ ] UI section Acting in fusion editor
- [ ] Unit tests for resolve + dispatch + miss path
- [ ] Docs FUSION.md updated
- [ ] Backward compat: no acting = old behavior
