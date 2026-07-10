# Review Report: Task 0031 — Frontend IA Docs Guardrail — 2026-07-10

## Review Lineage

- **Current task**: Task 0031 (`frontend-ia-docs-guardrail`); live path `docs/tasks/03-review/0031-frontend-ia-docs-guardrail.md`
- **Previous reports read**: none found (`docs/reports/reviews/*0031*` empty at review start)
- **Related reports considered**:
  - `docs/reports/builders/2026-07-10-wave2-closeout.md` — Wave 2 / S0–S10 closeout narrative context only
- **Review mode**: `initial`
- **Reviewer profile**: `reviewers` (lane: `gt-documentation-accuracy-reviewer`)
- **Parent agentID**: `reviewers`

## Score And Verdict

- **Score**: `93/100`
- **Verdict**: `HELD_IN_REVIEW_PATH_TO_100`
- **Lane recommendation**: `hold-in-review` (stay `03-review/`; **not** `04-completed/`)
- **Score routing applied**: S ≥ 90 → APPROVE with narrow doc path-to-100 patches applied by reviewer; do not promote to completed until parent final gate

## Delta Summary

### Resolved Since Previous Review
- N/A (initial review). Reviewer applied three accuracy patches during this wave (see Findings F1–F3).

### Persistent Findings
- none

### Regressions
- none

### New Findings
- `NEW` F1: Related-doc pointer treated stale `MONITORING_SECTIONS.md` as Observe hub SSoT (patched in this review).
- `NEW` F2: Epic 0005 child table claimed Task 0031 path under `02-doing/` (patched).
- `NEW` F3: `docs/dependency-tree.md` file index still said `01-open/0023…0031` as remaining work (patched).
- `NEW` F4: `docs/architecture/MONITORING_SECTIONS.md` remains globally stale (out of Task 0031 full rewrite scope; mitigated by UI.md labeling).

### Evidence Gaps / External Blockers
- none material. Archive under `.archive/` is gitignored by design; root `DESING.md` stub + tracked guide are the git-visible SSoTs.

## Findings

| ID | Class | Severity | Status | Summary | First seen | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| F1 | NEW | Medium | **Resolved this review** | UI.md pointed operators to `MONITORING_SECTIONS.md` for Observe hub filters; that doc still describes pre-S4 multi-leaf Monitoring | 2026-07-10 this report | Was `docs/guides/UI.md` §3/§6; live SSoT `src/shared/constants/observeHub.ts` |
| F2 | NEW | Low | **Resolved this review** | Epic child table false current path `02-doing/0031-…` | 2026-07-10 | `0005-…-epic.md` child row 0031 |
| F3 | NEW | Low | **Resolved this review** | dependency-tree file index claimed `01-open/0023…0031` remaining work while closeout marks 0031 ✅ | 2026-07-10 | `docs/dependency-tree.md` File index |
| F4 | NEW | Low | Open (out-of-scope / residual) | `MONITORING_SECTIONS.md` still lies about live sidebar (Home/Providers/… Monitoring groups) | 2026-07-10 | `docs/architecture/MONITORING_SECTIONS.md:15–67` vs live `SIDEBAR_SECTIONS` |
| F5 | — | Info | Accepted | Historical DESING body only under gitignored `.archive/` | 2026-07-10 | `.gitignore` → `.archive/`; root stub tracked |

### Contract / exit-condition audit

| Exit condition | Status | Proof |
| --- | --- | --- |
| `docs/guides/UI.md` exists with IA + primitives | ✅ | 122 lines after patch; path verified |
| Five epic invariants documented | ✅ | UI.md §1 table matches Task 0020 header rules |
| Seven pillars match live `SIDEBAR_SECTIONS` / Task 0025 | ✅ | `OPERATIONAL_PILLAR_SECTION_IDS` = core-pulse, registry, routing, governance, operations, observability, system; titles match fallbacks; homes match live children/groups |
| Archive policy → `.archive/README.md` | ✅ | Linked; README documents `docs/YYYY-MM-DD-*` layout |
| `design.md` token SSoT; `DESING.md` superseded | ✅ | design.md banner; DESING.md stub; archive + PROVENANCE |
| Doc accuracy check run | ✅ | `npm run check:fabricated-docs` — **no `guides/UI` hits**; repo-wide fails pre-existing only |
| Epic 0005 points to guide | ✅ | Header Related + §11a S10 + durable guardrail + child table |
| CHANGELOG docs entry | ✅ | `[Unreleased]` Frontend IA docs guardrail |
| No fabricated route/component names in guide | ✅ | All primitive paths `ls`-verified; StatCard exported from `charts.tsx` |
| meta.json / docs README index | ✅ | `docs/guides/meta.json` pages includes `"UI"`; `docs/README.md` lists UI.md |
| Optional AGENTS.md one-liner | ✅ skipped (task-allowed) | Evidence notes skip |

### Pillar dump vs guide (live import)

```
core-pulse: home, health
registry: providers, embedded-services, media, group exposures
routing: combos, combos-live, fusions, group compression-context, settings-routing
governance: api-manager … free-provider-rankings (keys/tokens/security/quota/costs)
operations: groups tools, batch, agentic, gamification
observability: activity, analytics, cache, provider-stats, runtime
system: settings-* + proxy
non-pillars: devtools (debug), help
```

Guide §2 table matches this dump. Non-pillars correctly called out.

### Five invariants vs code mirror

`sidebarVisibility.ts` file header (Task 0020) encodes no-new-leaf, strategies-not-menus, archive-not-delete, ~60% hide rule-of-thumb. Guide §1 states all five required rules including event-stream + presets-as-role-views. **Match.**

### DESING / design SSoT

- Root `DESING.md`: supersede stub only (707 bytes) → `design.md` + `docs/guides/UI.md`
- Archive: `.archive/docs/2026-07-10-desing-typo/{DESING.md,PROVENANCE.md}` + PROVENANCE-INDEX row
- `design.md` line 3 banner claims token SSoT + IA guide pointer — correct dual-authority split

### Epic closeout claims vs reality

- Builder claim “S0–S10 closeout” is **narrative for Epic 0005**, not automatic `04-completed/` promotion of every child. Task 0031 correctly remains in review until this gate.
- Child path for 0031 was stale (`02-doing`); **patched** to `03-review`.
- Do not invent further closeout: Wave 2 siblings may still sit in review lanes; epic table still uses some soft “lane for 0026” wording — acceptable lane-neutral residual.

## Evidence Reviewed

- Task file: `docs/tasks/03-review/0031-frontend-ia-docs-guardrail.md`
- Primary guide: `docs/guides/UI.md`
- Live tree: `src/shared/constants/sidebarVisibility.ts` (`OPERATIONAL_PILLAR_SECTION_IDS`, `SIDEBAR_SECTIONS`, presets, header guardrail)
- Observe SSoT: `src/shared/constants/observeHub.ts`
- Index wiring: `docs/guides/meta.json`, `docs/README.md`
- SSoT split: `design.md`, `DESING.md`, `.archive/docs/2026-07-10-desing-typo/*`, `.archive/README.md`, `.archive/PROVENANCE-INDEX.md`
- Epic / DAG: `docs/tasks/00-planning/0005-omniroute-frontend-ia-design-system-epic.md`, `docs/dependency-tree.md`
- CHANGELOG: Unreleased docs entry for Task 0031
- Stale related: `docs/architecture/MONITORING_SECTIONS.md` (historical)
- Primitives: EmptyState, SettingsToggleRow, Toggle, Badge, Modal, StatCard (`analytics/charts.tsx`), PageTabBar, DeployRelayModal, ConfigurableToolCard, Button, Checkbox, Textarea, `statusVocabulary.ts`, `themeStore.ts`, `globals.css`
- Runtime wiring proof: **N/A** — documentation/governance task; no production runtime surface changed by primary deliverable

### Commands run

```bash
# Live pillar dump
node --import tsx/esm -e 'import { SIDEBAR_SECTIONS, OPERATIONAL_PILLAR_SECTION_IDS } from "./src/shared/constants/sidebarVisibility.ts"; …'

# Path existence for all UI.md component/doc refs
ls src/shared/components/{EmptyState,SettingsToggleRow,Toggle,Badge,Modal,PageTabBar,DeployRelayModal}.tsx \
   src/shared/components/analytics/charts.tsx \
   src/shared/components/cli/ConfigurableToolCard.tsx …

# Fabricated-docs (repo-wide strict)
npm run check:fabricated-docs
# Result: fail on pre-existing unrelated claims; **zero findings under docs/guides/UI.md**

# Link resolution for UI.md markdown targets
python3 path-check against docs/guides/* relative links → all OK

# DESING disposition + gitignore
git check-ignore -v .archive/docs/2026-07-10-desing-typo/DESING.md  # ignored by policy
git ls-files DESING.md design.md docs/guides/UI.md docs/guides/meta.json
```

### Commands not run and why

- Full `check:doc-links` full report not re-emitted end-to-end after patch (builder already showed only pre-existing SUBAGENT-REVIEW-PIPELINE breaks; UI.md links re-verified manually).
- No unit tests — docs-only task; no production code under test obligation beyond “no fabricated names”.

## Path To 100

1. **Done this review**: Retarget Observe hub to `observeHub.ts`; label `MONITORING_SECTIONS.md` historical; fix Epic 0031 lane path; fix dependency-tree file index.
2. **Optional residual (not blocking ≥90)**: Open a follow-up docs chore to rewrite or banner-stamp `docs/architecture/MONITORING_SECTIONS.md` so it cannot contradict seven-pillar IA when discovered out-of-band.
3. **Parent final gate**: After this report is accepted, promote Task 0031 `03-review/` → `04-completed/` only when parent wave policy allows; do not auto-complete on score alone.

## Patches Applied (reviewer, 2026-07-10)

| File | Change |
| --- | --- |
| `docs/guides/UI.md` | Observe anti-pattern + §6 related docs → `observeHub.ts`; MONITORING_SECTIONS marked historical |
| `docs/tasks/00-planning/0005-omniroute-frontend-ia-design-system-epic.md` | Child 0031 path → `03-review/` |
| `docs/dependency-tree.md` | File index no longer claims `01-open/0023…0031` remaining work |

## Task Ledger Patch Suggestion

```markdown
## Review Ledger

### Latest Review
- **Date**: 2026-07-10
- **Reviewer profile**: `reviewers`
- **Score**: `93/100`
- **Verdict**: `HELD_IN_REVIEW_PATH_TO_100`
- **Full report**: `docs/reports/reviews/2026-07-10-task-0031-frontend-ia-docs-guardrail-review.md`
- **Lane outcome**: remains in review
- **Task reference**: Task 0031 (`frontend-ia-docs-guardrail`)

#### Current Open Blockers
- none blocking (F4 residual MONITORING_SECTIONS rewrite is optional follow-up)

#### Path-to-100 Summary
- F1–F3 patched in-review
- Optional: rewrite/banner MONITORING_SECTIONS.md
- Parent promote to 04-completed after final acceptance

### Previous Reports
- none (initial)
```

## Scoring Notes

| Dimension | Assessment | Contribution |
| --- | --- | --- |
| Primary guide vs live pillars | Accurate | + |
| Five invariants + anti-patterns | Present, mirrors code guardrail | + |
| Primitive paths | All real | + |
| Index / CHANGELOG / design dual-SSoT | Complete | + |
| Fabrication in new guide | None | + |
| Related-doc accuracy (pre-patch) | Misleading Observe pointer | − (fixed) |
| Secondary epic/DAG path claims | Stale lanes | − (fixed) |
| Residual global stale MONITORING doc | Out of full scope | −1 residual |

**93/100 — Elite / hold for parent promotion.**
