# OmniRoute Architect — Fusion Residual Audit (Wave 1)

> **Date**: 2026-07-19  
> **Agent**: gt-omniroute-architect  
> **Scope**: Docs/task alignment + shallow code surface (not full adversarial code review)  
> **Sources**: Epic 0003/0004, FUSION.md, web-provider plans 0001/0002, completed tasks 0010–0018, shallow reads of `fusion.ts` / `fusionTriggers.ts` / `combo.ts` fusion branch / combo schema / fusions UI  
> **Output purpose**: Hypotheses and planning contradictions for Wave 2 deep investigation

---

## 1. Domain context map (short)

```
Client → combo/<name> (strategy fusion | conditional-fusion)
  → open-sse/services/combo.ts
      ├─ gateApplies? (conditional-fusion OR fusion+non-always triggers)
      │    HIT  → resolveFusionUnits → handleFusionChatV2
      │              panels (parallel, stream:false, tool_choice:none, tools kept)
      │              → collectPanel (quorum-grace)
      │              → judge synthesis
      │              → optional finalizeWithActing (Epic 0004)
      │    MISS → dispatchActingOnly (if acting) OR local strategy=fallbackStrategy (D8)
      └─ non-fusion strategies continue with same combo.models
  → open-sse/services/fusionTriggers.ts (always | tool-call | text-match)
  → open-sse/services/fusion.ts (units, fan-out, handoff)
  → UI: /dashboard/fusions (+ editor with panels / judge / acting / triggers / tuning)
  → Persistence: combos table only (Phase 1; no fusions table)
```

| Concern | Owner (canonical) | Phase status (docs-level) |
|---------|-------------------|---------------------------|
| Fusion contracts (judge, triggers, D8) | schema + `fusion.ts` types | Epic 0003 S0–S8 → tasks **0010–0018** in `04-completed/` |
| Combo-ref panels/judge | `resolveFusionUnits` + `handleFusionChatV2` + combo wire | Completed per task headers |
| Triggers / fallback | `fusionTriggers.ts` + `combo.ts` gate | Completed per 0014 |
| Fusions UI shell/editor | `dashboard/fusions/**` | Completed per 0015–0016 |
| Docs/i18n | `FUSION.md` + en keys | Completed per 0017; **FUSION.md already documents acting** |
| Acting unit (final voice) | top-level `acting`, A1–A9 | **Runtime/schema/UI/tests present**; Epic **0004 status still “Active”** |
| Web providers for panel pool | plan 0001 + qwen captcha 0002 | Planning / deferred; **orthogonal to fusion core** |
| Resilience interaction | breaker / cooldown / model lockout | Documented generally; fusion-specific multi-upstream blast radius not task-closed |

---

## 2. Epic 0003 completion assessment (docs-level)

### Child work vs epic status

| Slice | Task | Folder status | Epic 0003 status field |
|-------|------|---------------|------------------------|
| S0 Contracts | 0010 | `04-completed/` 100/100 | Epic header still **“Active … child tasks in 01-open/0010–0018”** (stale) |
| S1 Resolve units | 0011 | completed | same |
| S2 Runtime dispatch | 0012 | completed | same |
| S3 Combo branch wire | 0013 | completed | same |
| S4 Triggers/fallback | 0014 | completed | same |
| S5 UI shell | 0015 | completed | same |
| S6 UI editor | 0016 | completed | same |
| S7 Docs/i18n | 0017 | completed | same |
| S8 Tests harden | 0018 | completed | same |

**Assessment:** At the **task-folder** level, Epic 0003 child work is **done**. There are **no** `0010–0018` tasks remaining under `docs/tasks/01-open/`. The epic file itself was **not reclassified** (status + path to open children + unchecked narrative “current state” sections that describe pre-epic string-only fusion).

### Epic success metrics still open (docs/product, not necessarily code)

| Metric (from Epic 0003 §1) | Docs-level residual |
|----------------------------|---------------------|
| Panel/judge combo-ref | Task evidence + code exports claim done; live failover smoke is operator/prod verification residual |
| Quota failover inside panel combo | Relies on child combo strategy — no dedicated residual task; needs Wave 2/live proof on :22000 if required by Hard Rule #18 style ops checks |
| Per-panel instructions via child combo config | Design “false gap” (do not rebuild) — product residual is **operator clarity**, not missing runtime field |
| Triggers skip cost | Covered by unit tests (0014/0018); combo-level miss-without-acting covered in `combo-fusion-strategy` |
| UI discoverability | Routes/list/editor exist under `dashboard/fusions/` |
| Backward compat string panels/`judgeModel` | Explicit in FUSION.md + resolve path |
| Scenario H (UI create) | Epic acceptance item **manual**; not proven by unit suite alone |
| CHANGELOG / architecture | 0017 completed; FUSION.md is canonical and already includes 0004 acting |

**Conclusion:** Promote Epic 0003 to **Completed / superseded by runtime** once status hygiene is applied; remaining open items are **verification/ops** and **planning-file staleness**, not missing 0010–0018 children.

---

## 3. Epic 0004 Acting completion assessment (docs-level)

### Epic header vs codebase surface

| Acceptance checkbox (Epic 0004) | Surface evidence (shallow) | Docs status |
|---------------------------------|----------------------------|-------------|
| Schema top-level `acting` | `createComboSchema` / `updateComboSchema` in `src/shared/validation/schemas/combo.ts` (~268–270, ~326–327) | Checkbox still `[ ]` |
| `resolveFusionUnits` returns acting | `resolveFusionUnits` → `{ panels, judge, acting }` in `fusion.ts` | same |
| `handleFusionChatV2` handoff | `finalizeWithActing` + judge non-stream branch when acting set | same |
| `combo.ts` miss + acting → acting only | `dispatchActingOnly` ~939–960, gate ~994–996 | same |
| UI Acting section | `FusionUnitsSections.tsx` (`fusion-acting`), `buildSavePayload` acting fields | same |
| Unit tests | `tests/unit/fusion-acting.test.ts` | same |
| FUSION.md updated | Acting in overview, flow, operator guide, troubleshooting | same |
| Backward compat no acting | Explicit A5 path in V2 (legacy judge final) | same |

**Assessment:** Implementation appears **substantially complete** at docs + shallow-export level. Epic 0004 is **mis-statused** as “Active (implementation in progress)” and has **no formal child task series** in `01-open/` / `04-completed/` (work was absorbed into runtime + UI + docs, likely alongside 0017 return-review polish).

### Residual gaps for Acting (product/architecture, not “missing feature skeleton”)

1. **No combo-branch integration tests for A6** — `tests/unit/combo-fusion-strategy.test.ts` has trigger miss / D8 / shared-object safety, but **no `acting` / `dispatchActingOnly` cases** (grep empty). Unit coverage lives mainly in `fusion-acting.test.ts` (resolve + V2 handoff), not the `combo.ts` gate.
2. **`dispatchActingOnly` implementation vs comment** — comment claims a “direct nested dispatch” / “V2 shortcut is NOT used”, then **calls `handleFusionChatV2({ panels: [acting], judge: acting })`** without `acting` field so single-panel short-circuit returns the unit response. Behavior may be correct; **comment/mental model is contradictory** (Wave 2: confirm abort, nesting, tools/stream parity with a true `dispatchFusionUnit` only path).
3. **List UI parity** — fusions list `page.tsx` does not surface acting (editor does). Minor UX residual.
4. **Non-goals still correctly open** — multi-turn deferred fusion, tool-result handoff mode, streaming panel tokens, auto-select acting from OpenCode roles.

**Conclusion:** Treat Epic 0004 as **implementation-complete pending formal closeout + combo-level A6 tests + status fix**, not as a greenfield epic needing full re-decomposition — unless Wave 2 finds broken handoff/miss paths.

---

## 4. Web providers plan 0001 vs completed 0045

| Item | Plan 0001 claim | Residual after shallow check | Relation to 0045 |
|------|-----------------|------------------------------|------------------|
| LMArena registry | Missing registry → validate unsupported | `open-sse/config/providers/registry/lmarena/` + REGISTRY import **exists** | Orthogonal (0045 = SSRF/sanitize/timeouts) |
| chatgpt-web stream:false / silent ~0 tokens | Force stream true + status logging | Executor still has `buildNonStreamingResponse` + stream notes (~3075); **functional residual unverified** | 0045 touched **error sanitize** on chatgpt-web, not the fusion non-stream product fix |
| claude-web context loss | Replace `transformToClaude` with translator | `claude-web.ts` **imports/uses `openaiToClaudeRequest`** | Orthogonal |
| qwen-web TLS / WAF | Create TLS client + WAF detection | `qwenTlsClient.ts` + `tlsFetchQwen` + WAF HTML detection **exist**; full captcha solve still **0002 deferred** | Orthogonal |
| Plan status | Still **“Planning”** with unchecked acceptance boxes | **Stale plan**: several Fix 1–4 items appear partially/fully landed without plan rollup | 0045 does **not** supersede 0001 functional goals |

**0002** remains correctly **deferred** (paid/complex captcha). No conflict with fusion epics; fusion can use other panel providers.

**Conflict verdict:** **No architectural conflict** between 0001 and 0045. 0045 is security hardening; 0001 is panel-pool reliability for web executors. Residual is **plan hygiene** (mark which fixes landed) + Wave 2 verification that fusion `stream:false` panels still hit remaining web-provider edge cases.

---

## 5. Finding table

| Sev | Area | Claim | Surface evidence | Hypothesis ID |
|-----|------|-------|------------------|---------------|
| P1 | Planning hygiene | Epic 0003 still Active + points at `01-open/0010–0018` though children are completed | Epic header vs `docs/tasks/04-completed/0010`…`0018` | H-FUSION-001 |
| P1 | Planning hygiene | Epic 0004 still Active / unchecked acceptance despite schema+runtime+UI+tests+docs | Epic 0004 vs `combo.ts` acting, `fusion.ts` finalize, UI, `fusion-acting.test.ts`, FUSION.md | H-FUSION-002 |
| P1 | Acting tests | Combo gate A6 (miss → acting-only) lacks combo-level tests | `combo-fusion-strategy.test.ts` no `acting`; gate at `combo.ts:994-996` | H-FUSION-003 |
| P2 | Acting dispatch | `dispatchActingOnly` uses synthetic single-panel V2; comments contradict implementation | `combo.ts:932-960` | H-FUSION-004 |
| P2 | Cost/latency | Single-survivor re-dispatch doubles upstream call (documented residual F3) | `fusion.ts` finalizeWithoutActing re-dispatch; FUSION.md single-answer notes | H-FUSION-005 |
| P2 | Fallback D8 product | Trigger miss without acting reuses **same `models` (panels)** under fallback strategy — may surprise operators expecting a dedicated cheap model | `combo.ts:998-1008` then normal strategy dispatch on same combo | H-FUSION-006 |
| P2 | Nesting / cost | Fusion→fusion or deep combo-ref panels explode N×M latency/cost; depth default 3 / hard 10 | FUSION.md nesting; `MAX_COMBO_DEPTH` in fusion imports | H-FUSION-007 |
| P2 | Triggers semantics | `tool-call` matches **assistant** `tool_calls` history, not “client is about to call write” — may under/over-fire vs operator mental model | `fusionTriggers.ts` `hasMatchingToolCall` walks messages for `tool_calls` | H-FUSION-008 |
| P3 | Reserved feature | `requireApproval` schema/default false; no product gate | FUSION.md + fusionTriggers type + editor always `requireApproval: false` on save | H-FUSION-009 |
| P3 | UI parity | List page does not show acting unit; editor does | `fusions/page.tsx` vs `FusionUnitsSections.tsx` | H-FUSION-010 |
| P2 | Doc/task contradiction | FUSION.md treats acting as first-class; Epic 0003 stop criteria exclude acting; Epic 0004 not closed | FUSION.md L9–13 vs Epic 0003 §12 non-goals vs Epic 0004 | H-FUSION-011 |
| P2 | Web plan staleness | 0001 still Planning; code suggests partial land (lmarena, claude translator, qwen TLS) | 0001 checkboxes vs registry/executors | H-FUSION-012 |
| P3 | 0001↔0045 | Operators may think 0045 fixed web fusion panels; it did not replace 0001 functional work | 0045 objective vs 0001 problem statement | H-FUSION-013 |
| P2 | Resilience blast radius | Parallel panels can trip provider breakers / cooldowns N-wide on shared provider family | RESILIENCE_GUIDE + fusion fan-out; no fusion-specific breaker isolation task | H-FUSION-014 |
| P3 | Judge degrade | Judge empty → concatenate panels for acting; client never sees judge failure status | `fusion.ts` ~847–853 | H-FUSION-015 |
| P3 | Strategy dual form | `fusion`+non-always triggers ≡ conditional gate; UI maps mode→strategy — dual storage forms need consistent load/save | FUSION.md D7; `fusionEditorTypes` buildSavePayload | H-FUSION-016 |

---

## 6. Numbered investigative hypotheses (Wave 2)

### H-FUSION-001 — Epic 0003 status drift
**Ask:** Confirm all 0010–0018 Completion Evidence still matches HEAD (no post-promote regression). Then reclassify epic to Completed (or “Completed; residual verification only”).  
**Where:** `docs/tasks/00-planning/0003-…`, `04-completed/0010`–`0018`, runtime paths listed in FUSION.md.

### H-FUSION-002 — Epic 0004 closeout readiness
**Ask:** Walk A1–A9 against production code paths; flip acceptance checkboxes only after combo-level A6 test (H-FUSION-003). Decide whether to invent retrospective child tasks or close epic with evidence links to existing commits/tests.  
**Where:** Epic 0004; `fusion.ts` resolve/finalize; `combo.ts` gate; UI save payload; schema.

### H-FUSION-003 — Missing combo-level acting-only tests
**Ask:** Add (or verify intentional omission of) tests: conditional-fusion miss + acting → one dispatch to acting model/combo-ref, **no** panel fan-out, **no** judge, `combo.strategy` immutable; miss + no acting → fallback.  
**Where:** `tests/unit/combo-fusion-strategy.test.ts` vs `combo.ts:939-1008`; `tests/unit/fusion-acting.test.ts` for unit-level only.

### H-FUSION-004 — Acting-only dispatch correctness
**Ask:** Does `handleFusionChatV2({ panels:[acting], judge:acting })` preserve client `stream`/`tools`/`tool_choice`, nesting depth/cycle, `comboChatBase`, and abort signal identically to a direct `dispatchFusionUnit`? Any double-timeout or wrong judge path if panel count logic changes?  
**Where:** `combo.ts:939-960`; `fusion.ts` single-panel branch ~636–650; compare to `finalizeWithActing` path.

### H-FUSION-005 — Single-survivor double upstream
**Ask:** Is the intentional second call still acceptable for cost/latency? Does it re-apply cooldowns/breakers incorrectly when first collect succeeded? With acting set, is collect+handoff single-pass correct (no third call)?  
**Where:** `fusion.ts` ~789–815, 566–568 comments; accountFallback / breaker on chat soft failures.

### H-FUSION-006 — Fallback strategy target set
**Ask:** Document/validate operator expectation: fallback runs **panel models** with e.g. priority, not a separate model field. Edge cases: all panels are combo-refs + `nestedComboMode`; fallback `auto` / `fusion`-forbidden only.  
**Where:** `combo.ts` after strategy override; schema D8 superRefine; `resolveFusionFallbackStrategy`.

### H-FUSION-007 — Nested depth and fusion-in-fusion
**Ask:** Measure effective depth when panel is combo-ref to another fusion; ensure cycle 503 messages; UI “non-fusion children recommended” is only soft guidance.  
**Where:** `comboPredicates.ts` `MAX_COMBO_DEPTH`; `buildFusionChildNesting` / `dispatchFusionUnit`; DAG walk notes from 0010 F2.

### H-FUSION-008 — tool-call trigger semantics vs agent loops
**Ask:** In real agent multi-turn traffic, does matching last assistant `tool_calls` fire fusion **after** tool use (review next turn) rather than **before** write? Is that the intended product? Text-match substring false positives?  
**Where:** `fusionTriggers.ts` `hasMatchingToolCall` / `hasMatchingText` / defaults; editor default patterns.

### H-FUSION-009 — requireApproval dead config
**Ask:** Confirm no runtime gate; UI always writes false; decide remove, hide, or implement later epic.  
**Where:** schema triggers; `fusionEditorTypes` save; FUSION.md reserved note.

### H-FUSION-010 — List UI acting parity
**Ask:** Whether list cards should badge “Acting configured” / panel counts / trigger mode for ops discoverability.  
**Where:** `dashboard/fusions/page.tsx`.

### H-FUSION-011 — Canonical doc vs epic texts
**Ask:** Align Epic 0003 “current state” narrative (string-only fusion) and Epic 0004 status with FUSION.md; archive superseded “problem” sections or mark historical.  
**Where:** FUSION.md; 0003; 0004.

### H-FUSION-012 — Web providers plan rollup
**Ask:** Diff 0001 Fix 1–4 against current executors/registry; mark landed vs residual (esp. chatgpt-web silent 0-token, qwen captcha beyond detection).  
**Where:** `0001-…md`; `lmarena` registry; `claude-web.ts`; `chatgpt-web.ts`; `qwen-web.ts` + `qwenTlsClient.ts`.

### H-FUSION-013 — Do not conflate 0045 with 0001
**Ask:** Wave 2 web reviewers should treat 0045 as security baseline only; fusion panel quality bugs still track 0001/0002.  
**Where:** `0045-…md` vs `0001-…md`.

### H-FUSION-014 — Parallel panel resilience interaction
**Ask:** N panels same provider → simultaneous 429/5xx → connection cooldown + possible provider breaker; does fusion 503 “all panels failed” dominate useful fallback to acting? Should acting-only on partial panel failure be a product option (today only on trigger miss)?  
**Where:** fan-out in `handleFusionChatV2`; RESILIENCE_GUIDE; combo pre-gates.

### H-FUSION-015 — Judge failure opacity with acting
**Ask:** Acting always responds even if judge 5xx; is observability (logs/metrics) enough for operators?  
**Where:** `fusion.ts` judge-for-acting branch; log tags in FUSION.md.

### H-FUSION-016 — strategy vs triggers.mode dual form
**Ask:** Load path for legacy `strategy: fusion` + stored `triggers.mode: tool-call` vs UI rewrite to `conditional-fusion`; any combo list filter or export mismatch.  
**Where:** `fusionStrategyHasConditionalTriggers`; `buildSavePayload`; list filter strategy ∈ {fusion, conditional-fusion}.

### H-FUSION-017 — Phase 2 fusions table still deferred
**Ask:** Confirm no product pressure for dedicated table; client-side filter sufficient at scale.  
**Where:** Epic 0003 D4 / stop criteria; FUSION.md Phase 1.

### H-FUSION-018 — Epic success metric live smoke
**Ask:** If operator acceptance still required: create fusion with 2 combo-ref panels + judge (+ optional acting) on **:22000 only** (never :21000 prod); kill one credential; verify failover + trigger miss paths.  
**Where:** Epic 0003 §13 acceptance items 2–4; Hard Rule ports in AGENTS.md.

---

## 7. Explicit non-findings (what looks healthy)

- **Core 0003 architecture is real, not paper-only:** `resolveFusionUnits`, `handleFusionChatV2`, `fusionTriggers.ts`, combo gate, dedicated UI routes, schema D1/D8/D9 — all present and mutually consistent with FUSION.md at a shallow level.
- **Panel tools policy (D9)** is documented and implemented as keep tools + `tool_choice: "none"` + `stream: false`; ownership table in FUSION.md matches code comments.
- **D8 fallback self-recursion** has schema superRefine **and** runtime `resolveFusionFallbackStrategy` defense-in-depth; unit tests for forbidden fallback exist in combo-fusion-strategy / fusion-triggers.
- **Shared combo object safety on miss** (do not mutate `combo.strategy`) is implemented and tested.
- **Backward compat:** string panels, legacy `handleFusionChat`, `config.judgeModel` still in contract.
- **Acting A5 legacy path:** no acting → judge (or survivor) remains final voice; FUSION.md and V2 branches align.
- **Nesting reuse (D3):** combo-ref goes through `handleComboChat` + `comboChatBase` threading (settings, ACL, signal, availability, relay) — addresses known path-to-100 residual from 0012/0013.
- **Test inventory for 0003** exists as multiple `tests/unit/fusion-*.test.ts` files plus combo-fusion-strategy and integration matrix references in task closeouts.
- **0002 captcha** correctly deferred; no evidence it is blocking fusion first-class closeout.
- **0045** successfully closes a different problem class (SSRF/path/timeout/sanitize); no sign it undoes fusion contracts.

---

## 8. Recommended Wave 2 focus (ordered)

1. **H-FUSION-003 / 004** — Acting miss path end-to-end in `combo.ts` (highest behavioral residual).  
2. **H-FUSION-005 / 014** — Cost, double-call, and resilience under parallel panel failure.  
3. **H-FUSION-008 / 006** — Trigger and fallback operator semantics (product truth vs docs).  
4. **H-FUSION-012** — Web provider plan truth-up (panel pool quality).  
5. **H-FUSION-001 / 002 / 011** — Planning status hygiene (cheap, prevents rework thrash).  
6. **H-FUSION-018** — Live smoke on **:22000** only if product closeout requires it.

---

## 9. Out of scope for this Wave 1 audit

- Full adversarial line-by-line review of `fusion.ts` / `combo.ts` / executors.  
- Creating tasks or implementing fixes.  
- Live traffic on production port **21000**.  
- Upstream merge / release freeze coordination.

---

*End of report.*
