# Task 0020: Frontend IA — Archive Policy + No-New-Leaf Guardrail (S0)

> **Status**: `[x]` Completed
> **Priority**: 🔴 P0
> **Type**: `governance`
> **Origin**: Epic 0005 — Frontend IA Reform + Design System Cohesion (slice **S0**)
> **Action type**: HARDEN
> **Blocks**: Task 0021, Task 0022, Task 0023, Task 0024, Task 0025 (governance baseline)
> **Depends on**: none
> **Parent review**: Wave 1 shipped 2026-07-10 — commit `d96e677` (+ epic §11a)

---

## Objective

Establish the **non-negotiable IA governance baseline** for OmniRoute-fusion:

1. **No new default-visible sidebar leaf** without mapping to one of the 7 pillars and noting Epic 0005 (or a successor task).
2. **Archive-not-delete** for removed UI/IA surfaces: move to `.archive/` with provenance — never silent `rm`.
3. Document the policy in code (header comment on `sidebarVisibility.ts`) and in `.archive/README.md` + `PROVENANCE-INDEX.md`.

No product feature work in this task — governance + archive scaffolding only.

## Background Context

### What already exists:
- Live sidebar taxonomy in `src/shared/constants/sidebarVisibility.ts` (`SIDEBAR_SECTIONS`, hideable IDs, presets)
- Epic 0005 diagnosis: ~81 leaves, feature→route→sidebar 1:1 dump
- Local `.archive/` directory (gitignored) intended as tomb for removed surfaces

### What was missing (pre-Wave 1):
- No hard-coded guardrail comment for agents/humans editing the sidebar
- No written archive policy or provenance index
- Risk of silent leaf deletion and new peer leaves from Fusion/future work

---

## Test Requirements

- MUST document archive rules: move → provenance log → keep route or redirect
- MUST ban new default-visible leaves without pillar mapping
- MUST retain hideable IDs when removing default tree entries (prefs may still reference them)
- MUST NOT ship secrets into `.archive/`
- Regression: existing hideable/preset tests still pass after comment-only / policy-only changes

---

## Exit Conditions (GDD/TDD)

- [x] Header guardrail comment present on `src/shared/constants/sidebarVisibility.ts` (7 pillars + archive-not-delete)
- [x] `.archive/README.md` documents move/provenance rules and layout
- [x] `.archive/PROVENANCE-INDEX.md` exists as append-only index
- [x] `.archive/sidebar/2026-07-10-ia-collapse/` snapshot folder available for Wave 1 IA moves
- [x] No silent product-surface deletes in this task scope
- [x] Epic 0005 §11a marks S0 done
- [x] Shipped with Wave 1 commit `d96e677` (2026-07-10)

---

## Details

### What

Subtasks:
- [x] **Read existing code**: `sidebarVisibility.ts`, epic 0005, design.md stance, any prior archive drafts
- [x] **Write sidebar guardrail comment**: pillars, strategy≠menu, archive-not-delete, hide-60% rule
- [x] **Create `.archive/README.md` + PROVENANCE-INDEX**: rules, layout, no-secrets clause
- [x] **Seed IA-collapse snapshot path**: `.archive/sidebar/2026-07-10-ia-collapse/`
- [x] **Verification**: comment present; archive docs readable; no production runtime change required beyond comments

### Where

| File | Purpose |
|------|---------|
| `src/shared/constants/sidebarVisibility.ts` | Modify — header guardrail (S0) |
| `.archive/README.md` | Create — archive policy |
| `.archive/PROVENANCE-INDEX.md` | Create — append-only move log |
| `.archive/sidebar/2026-07-10-ia-collapse/` | Create — Wave 1 IA snapshot home |
| `docs/tasks/00-planning/0005-omniroute-frontend-ia-design-system-epic.md` | Read — S0 outcomes |

### How

1. Add a multi-line file header on `sidebarVisibility.ts` stating the 7 pillars, no-new-leaf rule, and archive-on-remove rule.
2. Author `.archive/README.md` with move/provenance/layout/secret rules.
3. Create empty/seed `PROVENANCE-INDEX.md` for later appends by S2–S6 tasks.
4. Create dated sidebar snapshot directory for Wave 1 collapse evidence.

### Why

Without S0, every subsequent IA collapse risks silent deletion and every new feature risks becoming leaf #82. This task is the **governance lock** for the entire Frontend IA epic.

---

## ⛔ Anti-Hallucination Guardrails

> [!CAUTION]
> DO NOT delete runtime capabilities — only re-home or archive wrappers/snapshots.
> DO NOT commit secrets or operator data into `.archive/`.
> DO NOT treat `.archive/` as shippable product content (gitignored local tomb).

> [!IMPORTANT]
> Keep hideable IDs when removing default tree leaves so stored user prefs do not orphan.
> Any later leaf removal MUST append provenance under `.archive/` (see Task 0022+).

---

## 🛡️ Compliance Checklist

- [x] **Doc Accuracy**: Paths verified against live tree (2026-07-10)
- [x] **Security**: No secrets archived
- [x] **Archive Protocol**: Policy established (this task IS the protocol)
- [x] **No capability deletion**: N/A for pure governance

---

## 📋 Completion Evidence

- **Arquivos criados/modificados**:
  - `src/shared/constants/sidebarVisibility.ts` — Epic 0005 guardrail header (lines ~1–14)
  - `.archive/README.md` — archive-not-delete policy
  - `.archive/PROVENANCE-INDEX.md` — index
  - `.archive/sidebar/2026-07-10-ia-collapse/SNAPSHOT.md` — IA collapse snapshot (local/gitignored)
- **Testes que verificam o trabalho**: policy/docs (no dedicated unit test required for comment-only S0); downstream `tests/unit/ui/sidebar-engine-items.test.ts` assumes hideable retention
- **Resultado dos testes**: N/A unit (governance); Wave 1 suite green with related IA tests
- **Resultado do lint / typecheck**: No functional TS change required beyond existing file comments
- **Entrada no changelog**: Covered under Wave 1 Frontend IA notes (parent epic closeout)
- **Agente executor**: Wave 1 session (omniroute-fusion) — 2026-07-10
- **Data de conclusão**: 2026-07-10
- **Commit**: `d96e677` (Wave 1 bundle)
- **Note**: `.archive/` is gitignored; evidence is local + epic §11a pointer

---

## 🔍 Review Trail

- **Reviewer**: Task Architect (post-hoc Wave 1 capture)
- **Data da review**: 2026-07-10
- **Veredito**: PASS — S0 evidence matches epic §11a
- **Score (path to 100)**: 95
- **Notas**: Captured as Completed task for lineage; work already shipped in Wave 1.
