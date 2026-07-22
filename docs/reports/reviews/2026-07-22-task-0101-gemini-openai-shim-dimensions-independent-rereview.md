# Independent re-review — Task 0101 (EPIC-21 T21-A Gemini OpenAI-shim dimensions)

| Field | Value |
|-------|--------|
| **Date** | 2026-07-22 |
| **Reviewer** | independent (orchestrator + gt-ts-code-reviewer) |
| **Task** | `docs/tasks/03-review/0101-omniroute-epic21-gemini-openai-shim-dimensions.md` |
| **Prior trail** | Untrusted `APROVADO` 100 (no standalone report) — **rejected as overclaim** |
| **Score** | **88 / 100** |
| **Verdict** | **CONDITIONAL** — product P0 fixed; DoD/evidence not closed |
| **Lane action** | **`02-doing`** for path-to-100 (score &lt; 90) |

## Summary

Production Gemini OpenAI-compat embeddings path no longer dual-forwards `outputDimensionality`. Layered dialect SSoT (0102) preserves D2 for the registry baseUrl. Unit suite inverted correctly; **5/5 green** re-run this session. Prior 100 overclaimed CHANGELOG Fixed + full exits.

## Exit conditions

| Exit | Result |
|------|--------|
| No `outputDimensionality` inject on Gemini OpenAI-shim | **PASS** |
| Forward OpenAI `dimensions` only | **PASS** |
| Tests inverted (single + batch + omit + non-Gemini + invalid) | **PASS** (5/5) |
| TDD / Hard Rule #18 evidence | **PARTIAL** (GREEN re-verified; RED not re-proven) |
| CHANGELOG Fixed for 0101 | **FAIL** |
| Form checkboxes / honest Review Trail | **FAIL** (stale APROVADO 100) |

## Findings

### Serious (blocks pure APROVADO)

1. **Missing product CHANGELOG for 0101** — Completion Evidence claims Unreleased Fixed; tree has only task-promotion “no product code” narrative and EPIC-21 entries for 0103–0105. Add `.changelog/*-0101-*` Fixed entry + rebuild.

2. **Prior Review Trail overclaim** — 100 with CHANGELOG-at-top is false under re-audit.

### Debt

3. Exit/subtask boxes still open while status said APROVADO.  
4. Stale dual-forward comment in `src/shared/validation/schemas/combo.ts` (~L279–281).  
5. Test model id `gemini/text-embedding-004` not registry-seeded production string (optional harden with `gemini-embedding-2`).

### Cleared

- No residual dual-inject assignment; dialect strips `outputDimensionality` for shim mode.  
- `KNOWN_FIELDS` + `DIMENSION_OWNED_FIELDS` prevent passthrough re-inject.  
- Registry gemini baseUrl remains OpenAI-shim.

## Commands (this session)

```text
node --import tsx/esm --test tests/unit/embeddings-gemini-dimensions.test.ts
→ 5/5 pass
```

Static: `open-sse/handlers/embeddings.ts`, `open-sse/config/embeddingDimensionDialect.ts`, task file, CHANGELOG / `.changelog/index.md`.

## Path-to-100

1. Add Fixed changelog entry for 0101 (or explicit “superseded by 0102” ledger row that still records the P0 fix).  
2. Fix `combo.ts` dual-forward comment → D2.  
3. Mark exits `[x]` only after re-run commands; rewrite Review Trail honestly.  
4. Optional: seed-model test case `gemini/gemini-embedding-2` + `dimensions: 768`.  
5. Re-run: gemini suite + dialect suite + typecheck:core + eslint on touched files.

## Score breakdown (indicative)

| Area | ~pts |
|------|------|
| Correctness / runtime D2 | 40 |
| Tests | 25 |
| Evidence / CHANGELOG / form | 12 (of 25) |
| Docs accuracy residuals | 11 (of 10) → capped |
| **Total** | **88** |
