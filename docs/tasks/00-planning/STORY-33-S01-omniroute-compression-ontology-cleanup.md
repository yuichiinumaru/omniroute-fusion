# STORY-33-S01: Compression Ontology Cleanup & SSoT

> **Parent Epic**: `EPIC-33-omniroute-compression-principia-and-rebuild.md`
> **Status**: Planning — architectural specification (2026-08-19)
> **Origin**: `.agents/user/omniroute2-reasoning.md` — resolving engine taxonomy drift across UI/types/runtime/DB/API and formalizing operator risk classification.

## Goal

Establish a single Source of Truth (SSoT) for the compression engine catalog across UI, TypeScript types, runtime registry, DB profiles, and API schemas, and classify compression operators by risk regime (`Preserving`, `Selective`, `Evictive`).

## Background & Rationale

Source code inspection reveals taxonomy drift across `ENGINE_CATALOG` (10 engines), `CompressionEngineId` TS type (9 engines), runtime registry (`relevance` + `ionizer`), DB profiles (9 engines), and API stacked schemas (5 engines). This story unifies the catalog SSoT and clearly separates `Operators` (transformations) from `Guards` (validation/safety checks).

## Executable Tasks

| Task ID | Title & Scope |
|---|---|
| **0207** | `0207-omniroute-compression-engine-catalog-ssot-unification.md` — Unify compression engine catalog SSoT across UI catalog, TS type union, runtime registry, DB profile tables, and Zod API schemas. |
| **0208** | `0208-omniroute-compression-operator-risk-classification-and-guard-decoupling.md` — Classify compression operators by risk regime (`Preserving`, `Selective`, `Evictive`) and decouple `Guards` (fidelity, risk, inflation) from `Operators`. |

## Acceptance Criteria

- [ ] Single SSoT enum and catalog definition for compression engines.
- [ ] Zod API schemas, DB column validators, and UI catalogs synchronized without type omissions.
- [ ] Compression operators classified by risk: `Preserving` (Lite, RTK, Dedup), `Selective` (Relevance, Caveman, LLMLingua, Ultra), `Evictive` (Emergency History Purge).
- [ ] Safety Guards (Fidelity Gate, Risk Gate, Anti-Inflation Guard, Cache Prefix Protection) formally separated from Operators.

## Non-goals

- No deletion of working compression engines.
- No changes to output transformation styles.
