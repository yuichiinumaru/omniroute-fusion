# STORY-35-S04: Verification & Reality Anchors

> **Parent Epic**: `EPIC-35-omniroute-deliberation-control-and-verification.md`
> **Status**: Planning — architectural specification (2026-08-19)
> **Origin**: `.agents/user/omniroute2-reasoning.md` — generic verifier contract (compiler, test, tool, calculator, schema) and claim-discriminating verification.

## Goal

Implement generic Verifier contract (compiler, test, tool, calculator, schema), claim-discriminating verification, and pre-completion audit (*Reality Outranks Internal Coherence*).

## Background & Rationale

Internal model reflection or consensus cannot certify itself. An external reality anchor (compiler, unit test, calculator, schema linter, primary source) must have final veto authority over internal reasoning claims.

## Executable Tasks

| Task ID | Title & Scope |
|---|---|
| **0233** | `0233-omniroute-generic-verifier-contract-and-reality-anchors.md` — Implement generic Verifier contract supporting compiler, unit test, calculator, schema linter, and external oracle verifiers. |
| **0234** | `0234-omniroute-claim-discriminating-verification-and-completion-audit.md` — Implement claim-discriminating verification engine and mandatory pre-completion self-audit against original goal constraints. |

## Acceptance Criteria

- [ ] Generic Verifier interface supports compiler, test runner, calculator, and schema verifiers.
- [ ] Reality anchor veto: failing verifier execution strictly overrides internal model self-confidence.
- [ ] Pre-completion audit compares final state line-by-line against original problem frame constraints.

## Non-goals

- No self-certification without external or oracle verification.
