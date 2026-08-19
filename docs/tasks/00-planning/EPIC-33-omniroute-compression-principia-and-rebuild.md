# EPIC-33: OmniRoute Compression Principia & Rebuild

> **Status**: Planning — evidence-backed architectural specification (2026-08-19)
> **Priority**: 🔴 Critical
> **Origin**: `.agents/user/omniroute2-reasoning.md` — resolving engine taxonomy drift, unifying the dual compression pipelines into a single planner, applying 4-scope policies, and introducing trust/audit mode.

## Goal

Clean up the prompt compression ontology, unify OmniRoute's two competing compression pipelines (`Modular Compression Pipeline` and `compressContext()` overflow recovery) into a single `CompressionPlanner`, apply the 4-scope policy framework (Global, Provider, Model, Combo), and introduce a trust/audit mode for safe deployment.

The rebuild formalizes 6 canonical primitives (`Policy`, `Profile`, `Operator`, `Guard`, `Receipt`, `Overflow Recovery`), classifies operators by risk regime (Preserving vs Selective vs Evictive), and ensures Master Kill Switch supremacy.

## Evidence basis

- `.agents/user/omniroute2-reasoning.md`: reveals that `chatCore.ts` runs the Modular Compression Pipeline first (lines 500-556) and then independently runs `compressContext()` (lines 230-305) if context >70%, leading to dual uncoordinated context mutations.
- `open-sse/services/compression/`: source code inspection proves taxonomy drift across UI Catalog (10 engines), TS types (9 engines), Runtime Registry (`relevance` + `ionizer`), DB profiles (9 engines), and API stacked schemas (5 engines).
- `src/lib/db/compression.ts` & `src/lib/db/compressionCombos.ts`: current DB schemas store `compression_combos` (named profiles) and assignments (`compression_combo_assignments`).
- `open-sse/services/compression/guards/`: existing `guardPipelineInflation()`, fidelity gates, and risk gates provide solid safety foundations once unified.

## Stories & Executable Tasks

| Story | Task | Scope |
|---|---:|---|
| **STORY-33-S01: Compression ontology cleanup & SSoT** | 0207 | `0207-omniroute-compression-engine-catalog-ssot-unification.md` — Unify compression engine catalog SSoT across UI catalog, TS type union, runtime registry, DB profiles, and API schemas. |
| | 0208 | `0208-omniroute-compression-operator-risk-classification-and-guard-decoupling.md` — Classify compression operators by risk regime (`Preserving`, `Selective`, `Evictive`) and decouple `Guards` from `Operators`. |
| **STORY-33-S02: Unified Compression Planner** | 0209 | `0209-omniroute-unified-compression-planner-pipeline.md` — Implement single `CompressionPlanner` pipeline and anti-inflation checks. |
| | 0210 | `0210-omniroute-emergency-context-fit-overflow-recovery-stage.md` — Transform `compressContext()` into explicit `Emergency Context Fit / Overflow Recovery`. |
| **STORY-33-S03: Compression Profiles & 4-scope assignments** | 0211 | `0211-omniroute-compression-profile-schema-and-4scope-resolution.md` — Rename Compression Combos to Profiles and implement 4-scope inheritance. |
| | 0212 | `0212-omniroute-compression-master-kill-switch-and-legacy-adapters.md` — Enforce Master Kill Switch supremacy and build legacy migration shims. |
| **STORY-33-S04: Compression trust & audit mode** | 0213 | `0213-omniroute-compression-audit-and-shadow-execution-engine.md` — Implement `Off \| Audit \| Active` modes and shadow compression execution. |
| | 0214 | `0214-omniroute-compression-fidelity-analytics-and-profile-quarantine.md` — Implement fidelity/savings analytics and candidate profile promotion/quarantine. |
| **STORY-33-S05: Compression UI reform** | 0215 | `0215-omniroute-compression-global-settings-and-profile-manager-ui.md` — Update Global settings and Profile manager UI. |
| | 0216 | `0216-omniroute-scoped-compression-ui-and-audit-analytics-views.md` — Build Model-level compression selector and Audit mode analytics views. |

## Ordering

1. **Story C1** (Tasks 0207, 0208) establishes the SSoT engine catalog and risk classification.
2. **Story C2** (Tasks 0209, 0210) unifies the dual pipelines into `CompressionPlanner` + `Emergency Context Fit`.
3. **Story C3** (Tasks 0211, 0212) applies the 4-scope policy substrate (EPIC-31) to compression profiles and assignments.
4. **Story C4** (Tasks 0213, 0214) implements Audit/Shadow mode and fidelity analytics.
5. **Story C5** (Tasks 0215, 0216) updates the dashboard UI across global, provider, model, and combo views.

## Non-goals

- No deletion of raw context history without explicit policy authorization and audit receipt.
- No bypass of the Master Kill Switch under any circumstances.
- No un-audited lossy compression on production code diffs or structural JSON data.
