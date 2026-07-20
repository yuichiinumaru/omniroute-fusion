# EPIC-14 — OmniRoute Child Harness Localization

> **Status**: Planning (promote children next)  
> **Priority**: P0 (governance quality for all future waves)  
> **Type**: harness / meta-governance  
> **Project**: omniroute-2  
> **Date**: 2026-07-19  
> **Evidence**:  
> - `docs/reports/audits/2026-07-19-harness-architect-meta-governance-audit.md`  
> - `docs/reports/audits/2026-07-19-wave2-mechanical-harness-evidence.md`  
> - `docs/tasks/00-planning/0009-builder-wave-2026-07-18-review-loop-learnings.md`

---

## 1. Goal

Localize Ganthritor harness defaults so OmniRoute (Node/Next/npm/SQLite) agents are not forced through Khala/Rust/cargo DoD and missing task infrastructure.

## 2. Problem (Wave 2 CONFIRMED)

| ID | Finding |
|----|---------|
| H-HARNESS-01 | DoD requires cargo check/test + Surreal `.bind()` |
| H-HARNESS-02 | `docs/tasks/AGENTS.md` **missing** (onboard hard-requires) |
| H-HARNESS-03 | `docs/tasks/000-template.md` **missing** (archive has npm template) |
| H-HARNESS-04 | `gt-create-tasks` exit defaults include cargo |
| H-HARNESS-07 | `tasklist.md` missing |
| H-HARNESS-08 | `pm_lens` tree absent |
| H-HARNESS-09 | No `.changelog/` — product uses root `CHANGELOG.md` |
| H-HARNESS-16 | omniroute skill: 14 strategies / 37 tools vs live 18 strategies / ~93 tools |
| H-HARNESS-17 | SQLite abolition policy conflicts with intentional better-sqlite3 |
| — | No `.memories/_by_lane/architects` continuity |

## 3. Scope (in)

1. Child-local **DoD overlay** or stack-parameterized DoD pointer for OmniRoute (npm matrix: lint, typecheck:core, test:unit, test:vitest as applicable)  
2. Restore `docs/tasks/000-template.md` from archive (npm-oriented)  
3. Create lean `docs/tasks/AGENTS.md` for OmniRoute task discipline  
4. Document create-tasks exit-condition recipe for this repo (or local workflow overlay)  
5. `tasklist-sync` once template exists  
6. Refresh `omniroute` skill live counts  
7. SQLite exception note (child AGENTS or rule overlay) — OmniRoute SQLite is canonical product storage  
8. Bootstrap architects continuity via agentlog  
9. Institutionalize 0009 U1/U2 checklist items into frontend-quality or coding-execution project-specifics (pointers only)

## 4. Scope (out)

- Full parent harness rewrite  
- Implementing all 0009 U1–U7 as code features (product work lives in EPIC-11/13)  
- Forcing `.changelog/` migration without operator decision (may document dual-mode: product CHANGELOG vs Ganthritor ledger)

## 5. Success metrics

- [ ] Onboard Step 1.2 satisfiable (`docs/tasks/AGENTS.md` exists)  
- [ ] DoD checklist usable for OmniRoute without cargo lies  
- [ ] Live task template path exists  
- [ ] OmniRoute skill strategy count matches `ROUTING_STRATEGY_VALUES` length  
- [ ] Architects lane continuity file exists after first session closeout  
- [ ] Explicit SQLite exception documented

## 6. Suggested child task themes

| Theme | Focus | Owner profile |
|-------|-------|---------------|
| T14-A | tasks AGENTS.md + 000-template restore | gt-task-architect / gt-archivist |
| T14-B | DoD overlay + create-tasks OmniRoute exit recipe | gt-harness-architect |
| T14-C | omniroute skill inventory refresh + SQLite exception note | gt-harness-architect |
| T14-D | tasklist-sync + optional changelog policy note | project-management parent |
| T14-E | 0009 U1/U2 checklist institutionalization | gt-harness-architect |

## 7. Suggested new specialist (optional)

If spawn registry continues to reject `codebase-investigator` despite listing it, add an explicit **gt-codebase-investigator** alias verification task under harness (see synthesis §5).

## 8. Non-goals

Do not disable parent skills; localize overlays only.
