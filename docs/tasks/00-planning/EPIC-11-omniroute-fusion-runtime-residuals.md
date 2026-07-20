# EPIC-11 — OmniRoute Fusion Runtime Residuals

> **Status**: Planning (promote children next)  
> **Priority**: P1  
> **Type**: feature residual / HARDEN / tests  
> **Action types**: `HARDEN` + `EXTEND` (tests) + `UX_VIS` (minor list parity)  
> **Project**: omniroute-2  
> **Date**: 2026-07-19  
> **Depends on**: Epic 0003/0004 implementation (completed in tree)  
> **Evidence**: `docs/reports/audits/2026-07-19-wave2-ts-reviewer-fusion-runtime-investigation.md`  
> **Related**: FUSION.md, `open-sse/services/fusion.ts`, `combo.ts`, `fusionTriggers.ts`

---

## 1. Goal

Close **confirmed** Fusion behavioral residuals after first-class Fusion + Acting shipped, without re-building Epic 0003.

## 2. Problem (Wave 2 confirmed)

| ID | Severity | Finding |
|----|----------|---------|
| H-FUSION-003 | P1 | No combo-level tests for A6 (trigger miss → acting-only) |
| H-FUSION-004 | P2 | `dispatchActingOnly` comment vs synthetic V2 single-panel path |
| H-FUSION-005 | P2 | Single-survivor re-dispatch doubles upstream; 2nd call can fail after success |
| H-FUSION-006 | P2 | Fallback without acting reuses **panel** models under `fallbackStrategy` |
| H-FUSION-008 | P2 | `tool-call` trigger is **sticky** for rest of conversation history |
| H-FUSION-014 | P2 | Parallel panels: timeout does not abort stragglers → breaker blast radius |
| H-FUSION-007 | P2 | Nesting width multiplies cost (depth capped) — document + optional guards |
| H-FUSION-009/010/015/016 | P3 | dead `requireApproval`; list UI no acting; judge empty opacity; list badge drift |

## 3. Locked product decisions needed (grill before implement)

| Decision | Options | Default recommendation |
|----------|---------|------------------------|
| Tool-call window | last-message only vs sticky history | **last assistant message only** (or last N turns) for conditional cost control |
| Fallback model set | reuse panels vs dedicated cheap models field | Document current + optional future field; do not break D8 |
| Single-survivor | re-dispatch vs return collected text | Prefer **return collected text** when already have body |

## 4. Scope (in)

- Runtime fixes in `fusion.ts` / `combo.ts` / `fusionTriggers.ts` as justified by tests  
- Combo-level + unit regression tests (TDD preferred)  
- FUSION.md operator notes for sticky tool-call / fallback semantics  
- Minor fusions list acting affordance (optional P3 slice)

## 5. Scope (out)

- New fusions table / multi-turn deferred fusion  
- Web provider captcha solver (0002)  
- Live :21000 work  
- Full rewrite of fusion UI editor

## 6. Success metrics

- [ ] Combo-level A6 test: miss + acting → only acting; miss + no acting → fallback path  
- [ ] Documented + tested tool-call window semantics  
- [ ] Single-survivor does not fail client after successful text collection  
- [ ] Straggler abort or documented breaker risk with mitigation  
- [ ] Epic 0004 acceptance can be honestly closed after this epic

## 7. Suggested child task themes

| Theme | Focus | parallel-safe |
|-------|-------|---------------|
| T11-A | A6 combo tests + dispatchActingOnly honesty | serial with T11-B |
| T11-B | tool-call window semantics + tests | serial with T11-A (fusionTriggers) |
| T11-C | single-survivor / finalize path cost fix | serial (fusion.ts) |
| T11-D | panel timeout abort / resilience note + tests | serial after T11-C or bundled |
| T11-E | docs FUSION.md + list acting chip (P3) | parallel-safe after runtime |

## 8. Source evidence

- Wave 2 fusion investigation report  
- `docs/architecture/FUSION.md`  
- `tests/unit/fusion-acting.test.ts`, `tests/unit/combo-fusion-strategy*.ts` (if present)
