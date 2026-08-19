# STORY-34-S03: Frame & Problem Representation

> **Parent Epic**: `EPIC-34-omniroute-reasoning-policy-and-cognitive-state.md`
> **Status**: Planning — architectural specification (2026-08-19)
> **Origin**: `.agents/user/omniroute2-reasoning.md` — Frame schema, re-encode operator, constraint extraction, and external context-provider contract.

## Goal

Implement `Frame` schema, `re-encode` problem canonicalization operator, constraint extraction, and external context-provider contract for code graph engines (CodeSight, Gortex).

## Background & Rationale

*Representation Precedes Inference*: models perform dramatically better when raw user prompts are canonicalized into an explicit problem frame (goal, constraints, evidence, domain context) before inference begins. OmniRoute acts as the frame controller and context consumer.

## Executable Tasks

| Task ID | Title & Scope |
|---|---|
| **0221** | `0221-omniroute-frame-schema-and-reencode-canonicalization-operator.md` — Implement `Frame` schema, `re-encode` problem canonicalization operator, constraint extractor, and goal check. |
| **0222** | `0222-omniroute-external-context-provider-contract-codesight-gortex.md` — Build external context-provider contract to consume structured code graph representations (CodeSight `wiki index`/`blast_radius`, Gortex `context_closure`). |

## Acceptance Criteria

- [ ] `Frame` schema stores canonical goal, constraints, domain context, and evidence references.
- [ ] `re-encode` operator canonicalizes raw user input into an explicit problem frame before deliberation.
- [ ] Context Provider contract defines clean JSON/MCP interfaces to attach external AST/code graph packets (CodeSight/Gortex) without building AST parsers inside OmniRoute.

## Non-goals

- No built-in AST parser or code watcher inside OmniRoute (consume external providers).
