# STORY-33-S04: Compression Trust & Audit Mode

> **Parent Epic**: `EPIC-33-omniroute-compression-principia-and-rebuild.md`
> **Status**: Planning — architectural specification (2026-08-19)
> **Origin**: `.agents/user/omniroute2-reasoning.md` — Off | Audit | Active execution modes, shadow compression, fidelity statistics, and profile promotion/quarantine.

## Goal

Implement `Off | Audit | Active` modes for prompt compression, enabling shadow execution (computing compression, measuring savings and fidelity, but sending uncompressed payload to provider) so operators can verify safety before turning compression live.

## Background & Rationale

Because prompt compression alters payload text, operators are often hesitant to enable lossy engines. Audit mode runs the compression pipeline in parallel, evaluates fidelity gates (code diffs, JSON keys, numbers, protected tokens), records statistics, and discards the compressed payload—providing concrete proof of safety.

## Executable Tasks

| Task ID | Title & Scope |
|---|---|
| **0213** | `0213-omniroute-compression-audit-and-shadow-execution-engine.md` — Implement `Off \| Audit \| Active` mode engine, executing shadow compression passes and logging fidelity metrics without mutating outgoing payloads in Audit mode. |
| **0214** | `0214-omniroute-compression-fidelity-analytics-and-profile-quarantine.md` — Build compression fidelity analytics, failure classification, and automated profile quarantine on fidelity gate violations. |

## Acceptance Criteria

- [ ] `Audit` mode supported alongside `Off` and `Active`.
- [ ] In `Audit` mode, compressed payload is evaluated against fidelity gates and logged, but original uncompressed payload is sent to provider.
- [ ] Fidelity analytics record pass/fail rate for numeric integrity, JSON keys, diff hunks, and protected tokens.
- [ ] Profiles exhibiting high fidelity failure rates marked for quarantine.

## Non-goals

- No latency degradation of live `Active` mode requests (shadow evaluation runs asynchronously or in background worker).
