# Task 0031: Frontend IA — Docs Guide + No-New-Leaf Guardrail (S10)

> **Status**: `[x]` Completed (return-review 100/100 — promoted 2026-07-18 after 22000 redeploy)
> **Priority**: 🟡 P1
> **Type**: `governance`
> **Origin**: Epic 0005 — Frontend IA Reform (slice **S10**)
> **Action type**: HARDEN
> **Blocks**: none (epic closeout hygiene)
> **Depends on**: Task 0025 preferred (document the **actual** 7-pillar tree); can draft earlier but **must finalize after** S6 lands
> **Parallel group**: C (after group B)

---

## Objective

Publish a short **UI / IA engineering guide** that permanently bans the feature→sidebar reflex:

1. Create `docs/guides/UI.md` (or `docs/architecture/UI_IA.md` if guides layout differs — **verify path with live `docs/guides/` listing**; prefer guides).
2. Rules (must appear verbatim or equivalent):
   - **No new default-visible sidebar leaf** without pillar mapping + note on Epic 0005 / successor.
   - Strategies / engines / presets are **not** menus.
   - Event tables are **one stream + filters**.
   - Presets are **role views**, not architecture.
   - Capabilities are re-homed; **archive-not-delete** via `.archive/` + provenance.
3. Point to shared primitives: EmptyState, SettingsToggleRow, StatCard, Toggle/Badge/Modal policy.
4. Archive or clearly supersede stale `DESING.md` if present (typo design doc) — do not leave two competing SSoTs; `design.md` remains design-token authority.
5. Cross-link from Epic 0005 and optionally `AGENTS.md` / `CLAUDE.md` “Common modification” one-liner if appropriate (minimal edit).

## Background Context

### What already exists:
- Epic 0005 full diagnosis + Wave 1 progress
- Guardrail comment in `sidebarVisibility.ts` (Task 0020)
- `.archive/README.md` archive policy
- `design.md` token/primitives plan
- Possibly stale `DESING.md` (typo) — verify with filesystem at execution time

### What is missing:
- Operator/agent-facing guide in `docs/` that CI/doc accuracy discipline can reference
- Explicit ban language for future Fusion / feature work
- Post-S6 tree description matching live pillars

---

## Test Requirements

- MUST create the guide with the five rules above
- MUST link to real paths only (Doc Accuracy: `grep` / list dirs — no fabricated components)
- MUST NOT invent APIs, routes, or env vars not in code
- MUST run `npm run check:fabricated-docs` or the project’s docs accuracy script if the new guide would be scanned — fix any fabricated refs
- MUST mark DESING.md archived/superseded if it exists
- Guide line count: prefer short (**~80–200 lines**), 100% accurate over encyclopedic

---

## Exit Conditions (GDD/TDD)

- [x] `docs/guides/UI.md` (or agreed path) exists with IA + primitives rules
- [x] Five epic invariants documented
- [x] Seven pillars listed matching Task 0025 outcome (or interim tree if S6 partial — must match live `SIDEBAR_SECTIONS`)
- [x] Archive policy linked to `.archive/README.md`
- [x] `design.md` referenced as token SSoT; `DESING.md` archived/superseded if present
- [x] Doc accuracy check run (script name + result in evidence)
- [x] Epic 0005 child/docs section points to the guide
- [x] Optional: one-line pointer from AGENTS.md Common scenarios (only if low-churn) — **skipped** (guide + epic + docs/README sufficient)
- [x] CHANGELOG.md entry (docs)
- [x] No fabricated route/component names

---

## Details

### What

Subtasks:
- [x] **Ler código existente**: Epic 0005, Task 0020 comment, post-S6 `SIDEBAR_SECTIONS`, `design.md`, list `docs/guides/`, check for `DESING.md`, Wave 1 component paths
- [x] **Draft UI.md** with rules, pillar table, primitive adoption table, archive policy, anti-patterns
- [x] **Supersede DESING.md** if found (move to `.archive/docs/` with provenance or add banner)
- [x] **Run fabricated-docs / docs-sync checks** applicable
- [x] **Link from Epic 0005**
- [x] **Verificação**: links resolve; script green for new guide

### Where

| File | Purpose |
|------|---------|
| `docs/guides/UI.md` | Create — primary guide |
| `design.md` | Read — token SSoT |
| `DESING.md` | Archive/supersede if exists |
| `docs/tasks/00-planning/0005-…-epic.md` | Modify — link guide |
| `src/shared/constants/sidebarVisibility.ts` | Read — live pillars |
| `.archive/README.md` | Link |
| `AGENTS.md` / `CLAUDE.md` | Optional one-line |
| `CHANGELOG.md` | Docs entry |

### How

1. After S6, dump pillar ids/titles from code into the guide table.
2. Write short anti-pattern section quoting “hide 60% ⇒ menu wrong”.
3. List approved mid-layer primitives with import paths.
4. Run docs accuracy gates; fix any invented names.
5. Epic link + CHANGELOG.

### Why

Without S10, the next feature campaign relearns the dump. Governance comments in code help agents in-file; a `docs/guides` entry helps humans and PR review.

---

## ⛔ Anti-Hallucination Guardrails

> [!CAUTION]
> DO NOT document components/routes that `grep` cannot find.
> DO NOT write line counts or provider counts from memory.
> DO NOT finalize pillar table before Task 0025 if the tree will still change — draft OK, finalize after.

> [!IMPORTANT]
> Prefer short accurate docs (project Doc Accuracy Discipline).
> `design.md` remains design-token authority; this guide is **IA + adoption** authority.
> Archive-not-delete applies to docs moves too.

---

## 🛡️ Compliance Checklist

- [x] **Doc Accuracy** gate run
- [x] **Live tree** matches pillar docs
- [x] **Archive** for DESING if needed
- [x] **CHANGELOG**

---

## 📋 Completion Evidence (preenchido pelo agente executor)

### Wave 1 (2026-07-10)
- **Arquivos criados/modificados**:
  - `docs/guides/UI.md` — **created**
  - `docs/guides/meta.json` — index `UI`
  - `docs/README.md` — guides list entry
  - `design.md` — SSoT banner + link to UI.md
  - `DESING.md` — supersede stub only
  - `.archive/docs/2026-07-10-desing-typo/DESING.md` + `PROVENANCE.md` — historical copy
  - Epic 0005 + dependency-tree + CHANGELOG
- **DESING.md disposition**: supersede stub at root; full copy `.archive/docs/2026-07-10-desing-typo/DESING.md`
- **Agente executor**: Grok Build subagent (builders / Task 0031)
- **Data**: 2026-07-10

### Wave 2 SSoT reaudit fix (2026-07-18) — closes R1/R2/R3 + N1

- **Arquivos modificados**:
  - `docs/guides/UI.md` — §2.1 rewrite from live `PRIMARY_SIDEBAR_ITEMS` (**9** leaves: `operations` hub; deep-link table for `api-manager`/`cli-code`); brand/theme = coreCyan dark-only + Interface-only Appearance; anti-pattern rows updated; `lastUpdated: 2026-07-18`
  - `docs/architecture/NAV-TREE-TARGET.md` — §2 live chrome + L0 hierarchy renumber; Operations hub Live at `/dashboard/operations`; Settings Interface note; remove stale coral SSoT line
  - `CHANGELOG.md` — Fixed entry Task 0031 SSoT
- **Live dump proof** (`node --import tsx/esm`):
  - `PRIMARY_SIDEBAR_ITEMS` = `home,providers,combos,activity,analytics,costs,operations,settings-general,docs` (count **9**)
  - `OPERATIONAL_PILLAR_SECTION_IDS` = core-pulse, registry, routing, governance, operations, observability, system
- **Tests**: `tests/unit/ui/operations-hub-discoverability-0059.test.ts` → pass (ops hub / no primary api-manager)
- **Doc accuracy**: `npm run check:fabricated-docs` — **no hits** on `docs/guides/UI.md` or `NAV-TREE-TARGET.md`
- **DESING**: still supersede stub only (unchanged)
- **Agente executor**: builders / gt-ts-engineer
- **Data**: 2026-07-18
- **Lane**: promoted to `docs/tasks/03-review/` after independent re-review 100/100

---

## Changelog Draft

```md
### Fixed
- **Frontend IA docs guardrail SSoT (Task 0031)** — UI.md §2.1 = live 9-leaf PRIMARY (operations hub); coreCyan dark-only brand; NAV-TREE-TARGET §2 synced.
```

## Parent gate 2026-07-10
Epic 0005 drain complete. Promoted after builder proof. **Reopened 2026-07-16 adversarial reaudit (S=84); residual fix 2026-07-18; independent re-review 100/100 → `03-review`.**

---

## Review Ledger

> [!IMPORTANT]
> Before path-to-100 work, read the latest full report and all reports listed
> under Previous Reports. Persistent findings and regression guards are part of
> the acceptance contract; do not fix the latest finding by undoing a previously
> accepted repair.

### Latest Review (independent FULL return-review · agentID `reviewers`)

- **Date**: 2026-07-18
- **Reviewer profile**: `reviewers` (Frontend Quality + docs accuracy)
- **Score**: `100/100`
- **Verdict**: `ACCEPTED_100`
- **Full report**: `docs/reports/reviews/2026-07-18-task-0031-frontend-ia-docs-guardrail-return-review.md`
- **Lane outcome**: **hold** `docs/tasks/03-review/` (patches **0**)
- **Task reference**: Task 0031 (`frontend-ia-docs-guardrail`)
- **Proof**: live `PRIMARY_SIDEBAR_ITEMS` dump = UI.md §2.1 (9 + `operations`); ops-hub 12 tests green; no fabricated-docs hits on UI.md/NAV-TREE

#### Current Open Blockers

- _(none)_

#### Path-to-100 Summary

- N/A — score 100; no patches this session

#### Resolved this return-review (re-verified live; prior scores untrusted)

- `RESOLVED` **R1 High** (reaudit 84): UI.md §2.1 = live 9 leaves with `operations`; api-manager/cli-code deep-link only
- `RESOLVED` **R2 Medium**: brand = coreCyan dark-only; Interface functional prefs only
- `RESOLVED` **R3 Low**: anti-pattern no longer implies coral product brand
- `RESOLVED` **N1 Info**: NAV-TREE-TARGET.md §2 + §10 conclusion flat-**9** (no live flat-10)
- `RESOLVED` **F8**: `sidebarVisibility.ts` header states live **9** after 0059

#### What still holds (do not regress)

- Five invariants + 7 conceptual pillars + observeHub SSoT
- DESING supersede stub + design.md token SSoT
- Primitives path table

#### Regression Guards

- Default chrome ids in UI.md **must match** live `PRIMARY_SIDEBAR_ITEMS` (currently 9: home…operations…docs)
- Conceptual pillar ids must stay aligned with `OPERATIONAL_PILLAR_SECTION_IDS`
- Do not re-cite `MONITORING_SECTIONS.md` as live Observe hub authority (`observeHub.ts`)
- Keep `design.md` (tokens) vs `docs/guides/UI.md` (IA) dual SSoT; keep `DESING.md` as stub only
- Brand claims must match live themeStore/globals (coreCyan dark-only post-0052/53)
- NAV-TREE must not reintroduce “flat-10” as **live** chrome count
- Settings product label for appearance route is **Interface** (functional prefs only)

### Previous Reports

- `docs/reports/reviews/2026-07-18-task-0031-frontend-ia-docs-guardrail-return-review.md` (**100/100** ACCEPTED · this session)
- `docs/reports/reviews/2026-07-18-task-0031-frontend-ia-docs-guardrail-review.md` (claimed 100; untrusted until this return-review)
- `docs/reports/reviews/2026-07-18-task-0031-frontend-ia-docs-guardrail-path-to-100.md` (96/100 path-to-100)
- `docs/reports/reviews/2026-07-16-task-0031-frontend-ia-docs-guardrail-reaudit.md` (84/100 · SSoT drift)
- `docs/reports/reviews/2026-07-11-task-0031-frontend-ia-docs-guardrail-review.md` (96/100)
- `docs/reports/reviews/2026-07-10-task-0031-frontend-ia-docs-guardrail-review.md` (93/100 · initial; F1–F3 patched)

## Lane promotion

- **Promoted to 04-completed**: 2026-07-18 — parent after return-review 100/100 + healthy 22000 redeploy (`omniroute:base` sha256:799b53a4c368).
