# EPIC-10 — OmniRoute Planning Hygiene & Epic Closeout

> **Status**: Planning (promote children next)  
> **Priority**: P0 (governance — prevents rework thrash)  
> **Type**: docs / governance / HARDEN  
> **Project**: omniroute-2  
> **Date**: 2026-07-19  
> **Author**: architect-orchestrator  
> **Evidence**: Wave 1–2 audits under `docs/reports/audits/2026-07-19-*`

---

## 1. Goal

Make planning surfaces tell the truth about the finished 2026-07 builder/reviewer drain so future agents do **not** re-open completed Fusion, dual-mode, adversarial, or IA work.

## 2. Problem

| Surface | Stale claim | Reality (2026-07-19) |
|---------|-------------|----------------------|
| Epic 0003 | Active; children in `01-open/0010–0018` | All in `04-completed/` |
| Epic 0004 | Active; implementation in progress | Acting in runtime/schema/UI/tests/FUSION.md |
| Epic 0005 | Closeout complete (mostly OK) | Successor **0052–0061** not rolled into epic note |
| Epic 0006 | Planning / promote children | **0032–0035** done; only **0036** open |
| Epic 0007 | Planning | **0037–0039** completed |
| Epic 0008 | Planning; children in `01-open/0040–0051` | All completed |
| QUEUE-post-adversarial-return | Q1–Q3 REJECT in `02-doing` | Those tasks completed; only Q4/0036 remains |
| Naming | `000N-*.md` | Violates `EPIC-`/`PLAN-`/`HOLD-` rule |

## 3. Scope (in)

1. Update status headers of epics **0003–0008** (and notes on 0001/0002/0009) without rewriting history sections wholesale.
2. Supersede or rewrite **QUEUE** to a historical + single remaining item (0036).
3. Optional: rename planning files to `EPIC-`/`PLAN-`/`HOLD-` prefixes **or** add a banner + index mapping if rename is too disruptive (prefer rename with archive-safe copies if collision).
4. Fold **0052–0061** successor IA note into Epic 0005 closeout.
5. Document Epic 0004 closeout evidence links (tests/files) — no new product feature.

## 4. Scope (out)

- Product code changes  
- Task 0036 execution on :21000  
- Creating new fusion features (see EPIC-11)  
- Restoring template/DoD (see EPIC-14)

## 5. Success metrics

- [ ] No epic claims children in wrong lane  
- [ ] QUEUE cannot be mistaken for an active builder pickup list (except 0036 HOLD)  
- [ ] Epic 0004 either Closed with evidence or HOLD with explicit residual only for A6 tests (EPIC-11)  
- [ ] Planning naming compliant **or** explicit exception documented with index

## 6. Dependencies

- Wave audits (read-only): archivist + product epics status reports  
- Orthogonal to EPIC-11/12/13 implementation waves

## 7. Suggested child task themes (for task-architect)

| Theme | Action |
|-------|--------|
| T10-A | Close/update epics 0003, 0007, 0008 headers + 0006 residual note |
| T10-B | Close/update epic 0004 with evidence map OR mark “closed pending EPIC-11 A6 tests” |
| T10-C | Supersede QUEUE + 0005 successor rollup + 0001 plan truth-up banner |
| T10-D | Planning naming pass (EPIC-/PLAN-/HOLD-) |

## 8. Source evidence

- `docs/reports/audits/2026-07-19-archivist-task-planning-coherence.md`  
- `docs/reports/audits/2026-07-19-architect-product-epics-status-audit.md`  
- `docs/reports/audits/2026-07-19-task-architect-lane-structural-audit.md`  
- `docs/tasks/00-planning/0009-builder-wave-2026-07-18-review-loop-learnings.md`
