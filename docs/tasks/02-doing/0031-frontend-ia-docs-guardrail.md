# Task 0031: Frontend IA — Docs Guide + No-New-Leaf Guardrail (S10)

> **Status**: `[~]` Return to doing (adversarial reaudit 2026-07-16 — S=84; UI.md chrome/brand SSoT drift after 0059/0052)
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

- **Arquivos criados/modificados**:
  - `docs/guides/UI.md` — **created** (121 lines)
  - `docs/guides/meta.json` — index `UI`
  - `docs/README.md` — guides list entry
  - `design.md` — SSoT banner + link to UI.md
  - `DESING.md` — supersede stub only
  - `.archive/docs/2026-07-10-desing-typo/DESING.md` + `PROVENANCE.md` — historical copy
  - `.archive/PROVENANCE-INDEX.md` + `.archive/README.md` — docs archive layout
  - `docs/tasks/00-planning/0005-omniroute-frontend-ia-design-system-epic.md` — S0–S10 closeout, success metrics → child tasks, guide link
  - `docs/dependency-tree.md` — mark 0020–0031 ✅
  - `CHANGELOG.md` — Unreleased docs entry
  - this task file — evidence
- **Guide path**: `docs/guides/UI.md`
- **Doc accuracy command + result**:
  - `npm run check:fabricated-docs` (`--strict`) — **UI.md: 0 findings** (no `guides/UI` hits in report). Repo-wide still fails on **pre-existing** false positives (`AUDIT_GROUP`/`UX_VIS` as env-like tokens in other task/epic docs; unrelated missing file refs). Not introduced by S10.
  - `npm run check:doc-links` — 3 pre-existing breaks in `docs/architecture/SUBAGENT-REVIEW-PIPELINE.md` only; **no UI.md breaks**.
- **DESING.md disposition**: supersede stub at root; full copy `.archive/docs/2026-07-10-desing-typo/DESING.md`
- **CHANGELOG**: `[Unreleased]` → Frontend IA docs guardrail (Task 0031)
- **Builder Proof Matrix**:

  | Claim | Proof |
  |-------|--------|
  | 7 pillars match live tree | `OPERATIONAL_PILLAR_SECTION_IDS` = core-pulse, registry, routing, governance, operations, observability, system (dumped via tsx import of `sidebarVisibility.ts`) |
  | Five invariants present | `docs/guides/UI.md` §1 table |
  | No new leaf / archive / events / presets rules | §1 + §3 anti-patterns |
  | Primitives are real paths | `ls` verified EmptyState, SettingsToggleRow, Toggle, Badge, Modal, charts StatCard, PageTabBar, DeployRelayModal, ConfigurableToolCard |
  | design.md SSoT | banner on `design.md`; DESING stub points there |
  | Epic points to guide | Epic header Related + §11a S10 + §11 child table |
  | SIDEBAR_SECTIONS not rewritten | **not modified** this task |

- **Agente executor**: Grok Build subagent (builders / Task 0031)
- **Data de conclusão**: 2026-07-10

---

## Changelog Draft

```md
### Added
- **Frontend IA docs guardrail (Epic 0005 S10 / Task 0031)** — durable dashboard IA guide so features do not dump peer sidebar leaves.
  - New guide: `docs/guides/UI.md` (7 pillars from live `SIDEBAR_SECTIONS`, five invariants, shared primitives, anti-patterns)
  - `design.md` remains design-token SSoT; typo `DESING.md` → supersede stub + `.archive/docs/2026-07-10-desing-typo/`
  - Epic 0005 success metrics + child table closed out to S0–S10; index via `docs/guides/meta.json` + `docs/README.md`
  **Author**: builder (Task 0031)
```


## Parent gate 2026-07-10
Epic 0005 drain complete. Promoted after builder proof.

---

## Review Ledger

> [!IMPORTANT]
> Before path-to-100 work, read the latest full report and all reports listed
> under Previous Reports. Persistent findings and regression guards are part of
> the acceptance contract; do not fix the latest finding by undoing a previously
> accepted repair.

### Latest Review

- **Date**: 2026-07-16
- **Reviewer profile**: `reviewers` (adversarial reaudit)
- **Score**: `84/100` (was 96)
- **Verdict**: `RETURN_TO_DOING` / `SSoT_DRIFT`
- **Full report**: `docs/reports/reviews/2026-07-16-task-0031-frontend-ia-docs-guardrail-reaudit.md`
- **Lane outcome**: **returned to `02-doing/`** (S < 90)
- **Task reference**: Task 0031 (`frontend-ia-docs-guardrail`)

#### Current Open Blockers

- `REGRESSION` High: UI.md §2.1 primary chrome table stale after Task 0059 (`api-manager`/`cli-code` vs live `operations`; 10 vs 9 leaves)
- `REGRESSION` Medium: UI.md brand paragraph still claims coral + Appearance presets (false after 0052/0053 coreCyan dark-only)
- Five invariants + 7 conceptual pillars + observeHub SSoT still hold

#### Path-to-100 Summary

- Rewrite §2.1 from live `PRIMARY_SIDEBAR_ITEMS` dump (include operations hub; deep-link note for api-manager/cli-code)
- Fix brand / theme claims for coreCyan dark-only
- Optionally sync `NAV-TREE-TARGET.md` §2 live chrome in same PR
- Re-verify with tsx import of sidebarVisibility

#### Regression Guards

- Default chrome ids in UI.md **must match** live `PRIMARY_SIDEBAR_ITEMS` (currently 9: home…operations…docs)
- Conceptual pillar ids must stay aligned with `OPERATIONAL_PILLAR_SECTION_IDS`
- Do not re-cite `MONITORING_SECTIONS.md` as live Observe hub authority (`observeHub.ts`)
- Keep `design.md` (tokens) vs `docs/guides/UI.md` (IA) dual SSoT; keep `DESING.md` as stub only
- Brand claims must match live themeStore/globals (coreCyan dark-only post-0052/53)

### Previous Reports

- `docs/reports/reviews/2026-07-11-task-0031-frontend-ia-docs-guardrail-review.md` (96/100)
- `docs/reports/reviews/2026-07-10-task-0031-frontend-ia-docs-guardrail-review.md` (93/100 · initial; F1–F3 patched)
