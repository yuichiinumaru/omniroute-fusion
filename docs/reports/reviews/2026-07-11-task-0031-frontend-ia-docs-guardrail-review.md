# Review Report: Task 0031 — Frontend IA Docs Guardrail — 2026-07-11

## Review Lineage

- **Current task**: Task 0031 (`frontend-ia-docs-guardrail`); live path `docs/tasks/03-review/0031-frontend-ia-docs-guardrail.md`
- **Previous reports read**:
  - `docs/reports/reviews/2026-07-10-task-0031-frontend-ia-docs-guardrail-review.md` (93/100 · path-to-100 F1–F3)
- **Related reports considered**:
  - `docs/reports/reviews/2026-07-11-task-0025-frontend-ia-seven-pillar-sidebar-review.md` (flat chrome evolution)
  - `docs/architecture/NAV-TREE-TARGET.md` (living L0 map; cites UI.md)
- **Review mode**: `re-review` (independent; post path-to-100 + post flat-primary IA evolution)
- **Reviewer profile**: `reviewers` (general code / documentation accuracy)
- **Parent agentID**: `reviewers`

## Score And Verdict

- **Score**: `96/100`
- **Verdict**: `HELD_IN_REVIEW_PATH_TO_100` (path closed this re-review; hold only for **parent** promote)
- **Lane recommendation**: `hold-in-review` (stay `03-review/`; **not** `04-completed/` — reviewer cannot promote)
- **Score routing applied**: S ≥ 90 → APPROVE; narrow residual path-to-100 patches applied; do not auto-complete

## Delta Summary

### Resolved Since Previous Review
- F1 Observe SSoT → `observeHub.ts` (**still holds** in UI.md §3/§6).
- F2 Epic 0031 path `03-review/` (**still holds**).
- F3 dependency-tree file index no longer claims `01-open/0023…0031` (**still holds**).
- F4 `MONITORING_SECTIONS.md` unbannered historical risk → **resolved this re-review** (historical banner + README label).
- Post-0025 chrome drift: UI.md already documented **flat ≤10 primary hubs** (`PRIMARY_SIDEBAR_ITEMS`); this re-review restored an explicit **7 conceptual pillar id table** (exit “pillars listed”) without claiming they are accordion sections.

### Persistent Findings
- none blocking

### Regressions
- none against Task 0031 contract

### New Findings
- `NEW` F6 (Low, **resolved this review**): §2.2 only ellipsis-listed pillars (`core-pulse…system`) after flat-chrome rewrite — weakened exit “seven pillars listed”; patched with explicit 7-id table.
- `NEW` F7 (Low, **resolved this review**): `docs/README.md` still framed UI.md as “7 pillars” only and listed MONITORING as live nav — patched.
- `NOTE` F8 (Info, out of 0031 production scope): `sidebarVisibility.ts` file header still says “S6: SIDEBAR_SECTIONS is the 7 operational pillars” while live `SIDEBAR_SECTIONS` is `main`+`devtools` — belongs to Task 0025 / chrome successors, not this docs task.

### Evidence Gaps / External Blockers
- none. `.archive/` remains gitignored by policy; root `DESING.md` stub + tracked `docs/guides/UI.md` are the git-visible SSoTs.

## Findings

| ID | Class | Severity | Status | Summary | First seen | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| F1 | PREV | Medium | Resolved (holds) | Observe pointer must not treat MONITORING_SECTIONS as live hub | 2026-07-10 | UI.md → `observeHub.ts` |
| F2 | PREV | Low | Resolved (holds) | Epic child 0031 path | 2026-07-10 | `03-review/0031-…` |
| F3 | PREV | Low | Resolved (holds) | dependency-tree `01-open` claim | 2026-07-10 | file index lane-neutral |
| F4 | PREV | Low | **Resolved this review** | MONITORING_SECTIONS globally stale without banner | 2026-07-10 | banner + status: historical |
| F5 | PREV | Info | Accepted | Historical DESING body under gitignored `.archive/` | 2026-07-10 | policy OK |
| F6 | NEW | Low | **Resolved this review** | Pillar list thinned to ellipsis after flat rewrite | 2026-07-11 | UI.md §2.2 table |
| F7 | NEW | Low | **Resolved this review** | docs/README framing lag | 2026-07-11 | UI + MONITORING lines |
| F8 | NEW | Info | Open (out of scope) | Code header comment still describes 7 accordion pillars | 2026-07-11 | `sidebarVisibility.ts:15–16` |

### Contract / exit-condition audit

| Exit condition | Status | Proof |
| --- | --- | --- |
| `docs/guides/UI.md` exists with IA + primitives | ✅ | 153 lines; path verified |
| Five epic invariants documented | ✅ | §1 table: no-new-leaf, strategies≠menus, one event stream, presets=role views, archive-not-delete + 60% rule |
| Seven pillars listed matching live map | ✅ | §2.2 explicit `OPERATIONAL_PILLAR_SECTION_IDS` (7); live **chrome** is §2.1 `PRIMARY_SIDEBAR_ITEMS` (10) matching dump — supersedes obsolete “SIDEBAR_SECTIONS = 7 sections” reading |
| Archive policy → `.archive/README.md` | ✅ | Linked in guide header + §5 |
| `design.md` token SSoT; `DESING.md` superseded | ✅ | design.md banner; DESING stub; archive + PROVENANCE |
| Doc accuracy check run | ✅ | `npm run check:fabricated-docs` — **zero hits under `docs/guides/UI.md`**; repo-wide fails pre-existing only |
| Epic 0005 points to guide | ✅ | Header Related + success metrics + §11a S10 + durable guardrail + child row |
| CHANGELOG docs entry | ✅ | `[Unreleased]` Frontend IA docs guardrail (Task 0031) |
| No fabricated route/component names | ✅ | All primitive paths `ls`-verified; StatCard exported from `charts.tsx` |
| meta.json / docs README index | ✅ | `"UI"` in meta pages; README updated this re-review |
| Optional AGENTS.md one-liner | ✅ skipped (task-allowed) | Evidence notes skip |

### Live chrome vs guide (re-import 2026-07-11)

```
OPERATIONAL_PILLAR_SECTION_IDS:
  core-pulse, registry, routing, governance, operations, observability, system

SIDEBAR_SECTIONS: main, devtools

PRIMARY_SIDEBAR_ITEMS (10):
  home, providers, combos, api-manager, activity,
  analytics, costs, cli-code, settings-general, docs
```

Guide §2.1 table **matches** primary dump. Guide §2.2 table **matches** pillar export. Non-primary debug tools correctly omitted from default chrome table.

### Five invariants vs code mirror

`sidebarVisibility.ts` header (Task 0020) still encodes no-new-leaf, strategies-not-menus, archive-not-delete, ~60% hide rule. Guide §1 states all five required rules including event-stream + presets-as-role-views. **Match.** (Header’s “SIDEBAR_SECTIONS is the 7 pillars” sentence is stale chrome description — F8 — not an invariant failure.)

### DESING / design dual SSoT

- Root `DESING.md`: supersede stub only → `design.md` + `docs/guides/UI.md`
- Archive: `.archive/docs/2026-07-10-desing-typo/{DESING.md,PROVENANCE.md}`
- `git check-ignore`: archive path ignored by policy; tracked stubs/guides present

### Fabricated-docs / links

- `npm run check:fabricated-docs --strict`: exit 1 on **123 pre-existing** claims elsewhere; **no `UI.md` / `guides/UI` hits**
- All markdown links from UI.md resolve (0 missing)
- Primitive paths re-verified present

## Evidence Reviewed

- Task: `docs/tasks/03-review/0031-frontend-ia-docs-guardrail.md` (+ prior ledger)
- Prior report: `docs/reports/reviews/2026-07-10-task-0031-frontend-ia-docs-guardrail-review.md`
- Guide: `docs/guides/UI.md` (post flat-primary + this re-review pillar table)
- Live tree: `src/shared/constants/sidebarVisibility.ts` (`PRIMARY_SIDEBAR_ITEMS`, `OPERATIONAL_PILLAR_SECTION_IDS`, `SIDEBAR_SECTIONS`, presets, header)
- Observe: `src/shared/constants/observeHub.ts`
- Indexes: `docs/guides/meta.json`, `docs/README.md`
- SSoT split: `design.md`, `DESING.md`, `.archive/docs/2026-07-10-desing-typo/*`
- Epic / DAG: `docs/tasks/00-planning/0005-…-epic.md`, `docs/dependency-tree.md`
- CHANGELOG Unreleased Task 0031 entry
- Related: `docs/architecture/NAV-TREE-TARGET.md`, `docs/architecture/MONITORING_SECTIONS.md` (now bannered historical)
- Primitives: EmptyState, SettingsToggleRow, Toggle, Badge, Modal, StatCard, PageTabBar, DeployRelayModal, ConfigurableToolCard, Button, Checkbox, Textarea, statusVocabulary, themeStore, globals.css
- Runtime wiring: **N/A** — docs/governance task

### Commands run

```bash
node --import tsx/esm -e 'import { PRIMARY_SIDEBAR_ITEMS, OPERATIONAL_PILLAR_SECTION_IDS, SIDEBAR_SECTIONS } from "./src/shared/constants/sidebarVisibility.ts"; …'
ls src/shared/components/{EmptyState,SettingsToggleRow,Toggle,Badge,Modal,PageTabBar,DeployRelayModal}.tsx …
npm run check:fabricated-docs   # no UI.md hits; repo-wide pre-existing fail
python3 path-check on UI.md markdown links → 0 missing
git check-ignore / git ls-files for DESING disposition
```

### Commands not run and why

- Full unit test suite — docs-only task; no production runtime change required by 0031 deliverable.
- Full `check:doc-links` repo report — UI.md links re-verified manually; prior builder residual only SUBAGENT-REVIEW-PIPELINE.

## Path To 100

1. **Done this re-review**: Explicit 7 pillar id table in UI.md §2.2; MONITORING_SECTIONS historical banner; docs/README framing for UI + MONITORING.
2. **Optional residual (not blocking)**: Rewrite `sidebarVisibility.ts` header S6 sentence (Task 0025 / chrome owners) so code comment matches flat `SIDEBAR_SECTIONS`.
3. **Parent final gate**: Promote `03-review/` → `04-completed/` only under human/parent wave policy — **not** by this reviewer.

## Patches Applied (reviewer, 2026-07-11)

| File | Change |
| --- | --- |
| `docs/guides/UI.md` | §2.2 explicit 7 pillar ids + verify verify `rg`; MONITORING related-doc wording |
| `docs/architecture/MONITORING_SECTIONS.md` | `status: historical` + do-not-use banner → live chrome / observeHub / UI.md |
| `docs/README.md` | UI.md blurb = flat hubs + conceptual pillars; MONITORING labeled historical |

## Task Ledger Patch Suggestion

```markdown
### Latest Review
- **Date**: 2026-07-11
- **Reviewer profile**: `reviewers`
- **Score**: `96/100`
- **Verdict**: `HELD_IN_REVIEW_PATH_TO_100`
- **Full report**: `docs/reports/reviews/2026-07-11-task-0031-frontend-ia-docs-guardrail-review.md`
- **Lane outcome**: remains in `03-review/` (path closed; parent promote only)
- **Task reference**: Task 0031 (`frontend-ia-docs-guardrail`)

#### Current Open Blockers
- none

#### Path-to-100 Summary
- F1–F3 hold from 2026-07-10
- F4/F6/F7 closed this re-review
- Optional F8: sidebarVisibility header comment (out of 0031 scope)
- Parent promote → `04-completed/` after final acceptance

### Previous Reports
- `docs/reports/reviews/2026-07-10-task-0031-frontend-ia-docs-guardrail-review.md` (93/100)
```

## Scoring Notes

| Dimension | Assessment | Contribution |
| --- | --- | --- |
| Primary guide vs live chrome | Flat 10 hubs accurate | + |
| Conceptual 7 pillars | Explicit table after patch | + |
| Five invariants + anti-patterns | Present; Observe SSoT correct | + |
| Primitive paths | All real | + |
| Index / CHANGELOG / design dual-SSoT | Complete | + |
| Fabrication in new guide | None | + |
| Prior F1–F3 | Hold | + |
| Residual MONITORING / README / pillar list | Closed this re-review | + |
| Out-of-scope code header drift (F8) | −1 residual info | − |
| Task evidence still claims “121 lines” / older tree narrative | Historical evidence freeze; guide current | note only |

**96/100 — Elite / hold for parent promotion only.**
