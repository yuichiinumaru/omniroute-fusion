# Review Report: Task 0101 — EPIC-21 T21-A Gemini OpenAI-shim dimensions — 2026-07-22 (path-to-100 re-review)

## Review Lineage

- **Current task**: Task 0101 (`omniroute-epic21-gemini-openai-shim-dimensions`); live path at review start: `docs/tasks/02-doing/0101-omniroute-epic21-gemini-openai-shim-dimensions.md`
- **Previous reports read**:
  - `docs/reports/reviews/2026-07-22-task-0101-gemini-openai-shim-dimensions-independent-rereview.md` — **88/100** CONDITIONAL (path-to-100)
- **Related reports considered**:
  - EPIC-21 investigation: `docs/reports/audits/2026-07-19-embeddings-mrl-dimensions-investigation.md` (D1–D3 product locks)
- **Review mode**: `path-to-100` re-review (formal; parent `agentID=builders`, dual-hat ts-code-reviewer)
- **Reviewer**: independent re-reviewer (ts-code-reviewer protocol / tsjs axioms)

## Score And Verdict

- **Score**: `100/100`
- **Verdict**: `ACCEPTED_100`
- **Lane recommendation**: `hold-in-review` → **move `02-doing` → `03-review`** (reviewer gate complete; final `04-completed` remains a different agent / `/verify-task-completion` if required by kanban)

## Delta Summary

### Resolved Since Previous Review

| ID | Class | Prior finding | Proof this session |
|----|-------|---------------|--------------------|
| F1 | `RESOLVED` | Missing product CHANGELOG Fixed for 0101 | `.changelog/20260721-230352-0101-epic-21-t21-a-gemini-openai-shim-dimensions-p0-builders.md` present; projected into root `CHANGELOG.md` (~L86 Fixed P0); `.changelog/index.md` lists entry |
| F2 | `RESOLVED` | Prior Review Trail overclaim (false 100) | Trail rewritten: prior 100 marked **INVALIDATED / OVERCLAIM**; independent 88 is authoritative reject; path-to-100 does not self-score 100 |
| F3 | `RESOLVED` | Exit/subtask boxes open while claiming APROVADO | All product exits `[x]`; path-to-100 subtask `[x]`; status honest (`[~]` awaiting this re-review) |
| F4 | `RESOLVED` | Stale dual-forward comment in `combo.ts` ~L279–281 | Live `src/shared/validation/schemas/combo.ts:279-284` documents D2 dimensions-only; no dual-forward claim |
| F5 | `RESOLVED` | Optional seed-model harden | Test `handleEmbedding forwards registry seed gemini/gemini-embedding-2 dimensions WITHOUT outputDimensionality` present; registry has `gemini-embedding-2` |

### Persistent Findings

- none

### Regressions

- none

### New Findings

- none material

### Evidence Gaps / External Blockers

- `EVIDENCE_GAP` (non-blocking): live curl on **:22000** not re-run this session (unit+dialect SSoT prove body contract; :21000 forbidden). Operator optional smoke remains out of band.
- Historical TDD RED phase not re-executed this session — accepted as first-pass Completion Evidence; green re-verified (Hard Rule #18 satisfied by inverted suite + dialect guards).

## Findings

| ID | Class | Severity | Status | Summary | First seen | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| F1 | RESOLVED | Serious | Closed | Product Fixed changelog | 88-report | `.changelog/*-0101-*` + `CHANGELOG.md:86` |
| F2 | RESOLVED | Serious | Closed | Honest Review Trail | 88-report | Task § Review Trail |
| F3 | RESOLVED | Debt | Closed | Form exits honest | 88-report | Task Exit Conditions |
| F4 | RESOLVED | Debt | Closed | combo.ts D2 comment | 88-report | `combo.ts:279-284` |
| F5 | RESOLVED | Improvement | Closed | Registry seed test | 88-report | `embeddings-gemini-dimensions.test.ts:179-205` |

## Axiom Compliance (tsjs / Tier-3)

| Axiom | Status | Notes |
|-------|--------|-------|
| Type safety | ✅ | Dialect applies via typed `applyEmbeddingDimensions`; no new `as T` / `any` on path |
| Async / floating promises | ✅ | Handler + tests await; mock `fetch` restored in `finally` |
| Error handling | ✅ | MRL validation uses `sanitizeErrorMessage`; no raw stack leak |
| Security / prototype | ✅ | No untrusted merge; known-field allowlist + `DIMENSION_OWNED_FIELDS` |
| Module / SSoT | ✅ | Production Gemini path: OpenAI-shim dialect strips `outputDimensionality`; no ad-hoc dual inject left in handler |
| Tests | ✅ | 6 gemini suite + 15 dialect suite = **21/21** this session |

## Runtime correctness (adversarial)

1. **Malicious dual-field body**: client sends `outputDimensionality` on Gemini OpenAI-shim → dialect **strips** it (`applyEmbeddingDimensions` + `KNOWN_FIELDS` exclusion). Covered by dialect suite.
2. **No dimensions**: Gemini omit → no native field inject. Covered.
3. **Non-Gemini leak**: OpenAI path never gets `outputDimensionality`. Covered.
4. **Invalid dims**: `0` / non-finite do not map to native field. Covered.
5. **Registry seed**: `gemini/gemini-embedding-2` + `dimensions: 768` → dimensions only. Covered.
6. **Race / closure**: unit mock capture is request-local; no shared mutable upstream body across requests in tests; dialect `omitKeys` does not mutate input body (dialect suite proves immutability).

## Evidence Reviewed

- Task: `docs/tasks/02-doing/0101-omniroute-epic21-gemini-openai-shim-dimensions.md`
- Source: `open-sse/handlers/embeddings.ts` (~L140–192), `open-sse/config/embeddingDimensionDialect.ts`, `src/shared/validation/schemas/combo.ts:279-285`, `open-sse/config/embeddingRegistry.ts` (`gemini-embedding-2`)
- Tests: `tests/unit/embeddings-gemini-dimensions.test.ts`, `tests/unit/embeddings-dimension-dialect.test.ts`
- Changelog: `.changelog/20260721-230352-0101-…-builders.md`, root `CHANGELOG.md`

### Commands run (this session)

```text
node --import tsx/esm --test \
  tests/unit/embeddings-gemini-dimensions.test.ts \
  tests/unit/embeddings-dimension-dialect.test.ts
→ 21/21 pass

npm run typecheck:core
→ exit 0 (clean)

npx eslint --max-warnings=0 \
  src/shared/validation/schemas/combo.ts \
  tests/unit/embeddings-gemini-dimensions.test.ts
→ exit 0

rg: no `outputDimensionality =` assignment in handler/dialect; strip-only path
```

### Commands not run and why

- Live `:22000` curl — optional operator smoke; unit contract is authoritative for this task.
- Full `npm run lint` monorepo — scoped eslint on touched files per path-to-100 evidence (no new debt observed).

## Score breakdown

| Area | Pts | Notes |
|------|-----|-------|
| Correctness / runtime D2 | 40/40 | No dual inject; dialect SSoT preserves D2 |
| Tests + Hard Rule #18 | 25/25 | Inverted suite + seed model + dialect |
| Evidence / CHANGELOG / form | 25/25 | Fixed entry + honest trail + exits |
| Docs accuracy residuals | 10/10 | combo + handler comments match D2 |
| **Total** | **100** | |

## Path To 100

**Empty** — all prior path-to-100 items closed with live proof.

## Lane action

1. Move task → `docs/tasks/03-review/0101-omniroute-epic21-gemini-openai-shim-dimensions.md`
2. Compact Review Ledger on task points at this report
3. Do **not** move to `04-completed/` from this review (kanban: different agent / verify workflow)

## Regression guards (for future reviews)

1. Suite must keep asserting `"outputDimensionality" in body === false` for Gemini OpenAI-shim with `dimensions` set (single, batch, seed model).
2. Dialect suite must keep strip of client-sent `outputDimensionality` on shim mode.
3. Product Fixed entry for 0101 must remain in ledger (do not “supersede” without recording the P0 fix).
