# Review Report: Task 0103 — EPIC-21 T21-C Registry Matryoshka Metadata (2026-07-22)

## Review Lineage

- **Current task**: Task 0103 (`omniroute-epic21-registry-matryoshka-metadata`); live path at review start: `docs/tasks/02-doing/0103-omniroute-epic21-registry-matryoshka-metadata.md`
- **Previous reports**: none found for 0103 (first formal review)
- **Related context**:
  - EPIC-21 T21-C + investigation §2 (`docs/reports/audits/2026-07-19-embeddings-mrl-dimensions-investigation.md`)
  - Hard consumers: **0104** (client truncate allowlist) · **0105** (catalog field exposure)
  - Soft dep / coordination: **0102** dimension dialect SSoT (left intact — no dialect rewrite)
- **Review mode**: `initial` (tsjs + code-quality)
- **Reviewer**: `gt-ts-code-reviewer` (parent agentID=`builders`)
- **Skills**: `code-quality-harness` + `tsjs-harness` (`ts-rules`)
- **Report date**: 2026-07-22
- **Constraints honored**: no git; no `:21000`; no `Sidebar.tsx` touch

## Score And Verdict

- **Score**: `100/100`
- **Verdict**: `ACCEPTED_100` / `PASS_PERFECT`
- **Lane recommendation**: move to `docs/tasks/03-review/` (S=100)

### Dual Score (verification gate)

| Dimension | Score | Notes |
|-----------|-------|-------|
| local_implementation | 100 | Types + seed helpers + fail-closed `isAllowedEmbeddingDim`; 30/30 green this session |
| runtime_enforcement | N/A (library contract) | Task scope is registry metadata + helpers only; truncate (0104) and catalog (0105) consume later — no production handler wiring claimed |

### Reviewer path-to-100 fix applied this session

| Item | Action | Evidence |
|------|--------|----------|
| Open-ended min-only/max-only ranges | Fail-closed: incomplete continuous range requires native `dimensions` as missing bound; never `return true` unbounded | `isAllowedEmbeddingDim` in `embeddingRegistry.ts`; new unit cases |
| Shared Gemini allowlist array | `GEMINI_MRL` const → `geminiEmbeddingMrl()` factory (fresh array per row) | both gemini model rows; identity test |
| Non-null assertions after typeof | Local `const min/max/native` + boolean guards (no `!`) | `isAllowedEmbeddingDim` |
| Allowlist mutability surface | `matryoshkaDimensions?: readonly number[]` | `EmbeddingModel` interface |

## Axiom Compliance (tsjs)

| Axiom | Status | Notes |
|-------|--------|-------|
| Type Purity | ✅ | No `any` / unverified `as T` in MRL surface; only `true as const` on renorm lock; named exports |
| Boundary Integrity | ✅ | Registry is curated static data (not untrusted JSON merge); helpers fail-closed for non-MRL and incomplete metadata |
| Async Determinism | ✅ | Pure sync helpers; no promises / floating work |
| Immutability | ✅ | Seed factories return fresh allowlists; `readonly number[]` on type; no shared GEMINI const array |
| State Exclusivity | ✅ | `MatryoshkaMode` closed union; `isMatryoshka !== true` gates all dim authorization; optional MRL fields remain BC-additive per task contract (not a runtime unsafe state — helper rejects incomplete rows) |

## Rubric snapshot

| Dimension | Score | Notes |
| --- | --- | --- |
| `EmbeddingModel` MRL fields (camelCase) | 100 | `isMatryoshka`, `matryoshkaDimensions`, `minDimensions`/`maxDimensions`, `matryoshkaMode` |
| Seed set Gemini + OpenAI-3 + Qwen3 | 100 | Gemini 001/2; openai 3-small/large + OpenRouter/GitHub mirrors; Nebius/DeepInfra/Fireworks Qwen3 |
| Non-MRL negatives | 100 | ada-002, mistral-embed, bge, nv-embedqa, cohere samples not flagged |
| Helpers for 0104 | 100 | `getEmbeddingModel`, `getEmbeddingModelEntry`, `isMatryoshkaModel`, `isAllowedEmbeddingDim` |
| Renorm D4 lock | 100 | `EMBEDDING_MRL_CLIENT_RENORM_DEFAULT = true` |
| Fail-closed dim policy | 100 | allowlist **or** closed range **or** native identity; incomplete range rejects |
| Tests | 100 | **30 pass / 0 fail** (matryoshka + dialect + registry) this session |
| typecheck:core | 100 | exit 0 this session |
| lint (touched files) | 100 | eslint `--max-warnings=0` on registry + matryoshka test |
| CHANGELOG Unreleased | 100 | Added (0103) + Fixed (path-to-100) bullets present |
| Scope discipline | 100 | No truncate impl; no catalog full wire; dialect SSoT untouched; no Sidebar; no :21000 |

## Contract Compliance (Exit Conditions)

| Exit / MUST | Status | Live proof |
| --- | --- | --- |
| `EmbeddingModel` type extended; registry compiles | ✅ | `open-sse/config/embeddingRegistry.ts` + typecheck:core exit 0 |
| Seed rows Gemini + Qwen3 + OpenAI-3 with MRL metadata | ✅ | seeds + unit assertions |
| Unit tests registry metadata shape/seed | ✅ | `tests/unit/embeddings-matryoshka.test.ts` green |
| Existing embedding registry tests green | ✅ | `embedding-rerank-provider-registry.test.ts` + dialect suite green |
| Renorm policy for 0104 recorded (default **on**) | ✅ | `EMBEDDING_MRL_CLIENT_RENORM_DEFAULT = true` |
| `npm run typecheck:core` | ✅ | exit 0 |
| lint no new errors (touched surface) | ✅ | eslint max-warnings=0 exit 0 (review session) |
| CHANGELOG `[Unreleased]` | ✅ | Task 0103 Added + path-to-100 Fixed |
| Completion Evidence filled | ✅ | Task evidence complete (worker); lint filled by this review |

### Test matrix (this session)

```text
node --import tsx/esm --test \
  tests/unit/embeddings-matryoshka.test.ts \
  tests/unit/embeddings-dimension-dialect.test.ts \
  tests/unit/embedding-rerank-provider-registry.test.ts
→ 30 pass / 0 fail

npx eslint --max-warnings=0 \
  open-sse/config/embeddingRegistry.ts \
  tests/unit/embeddings-matryoshka.test.ts
→ exit 0

npm run typecheck:core
→ exit 0
```

## Findings (pre-fix → resolved)

### Critical
- None

### Serious
- None

### Debt (resolved this session)
- **[D1]** `isAllowedEmbeddingDim` previously allowed open-ended min-only ranges (`return true` when only `minDimensions` set and no native upper). Fail-closed for 0104 consumers. **Fixed**.
- **[D2]** Shared `GEMINI_MRL` const shared one `matryoshkaDimensions` array across two model rows. **Fixed** via factory.
- **[D3]** Non-null assertions (`minDimensions!` / `maxDimensions!`) after typeof. **Fixed** with local narrowed consts.

### Improvements (optional, not scored against 100)
- **[I1]** A full discriminated union (`isMatryoshka: true` requires mode + bounds) would encode invariants at the type level; task intentionally kept fields optional for backward compatibility. Acceptable residual design trade-off.
- **[I2]** `getAllEmbeddingModels()` still omits MRL fields — deferred to **0105** by contract.

## Path to 100

| Priority | Change | Status |
|----------|--------|--------|
| P0 | Fail-closed incomplete continuous ranges in `isAllowedEmbeddingDim` | **Done** (this session) |
| P0 | Per-row Gemini allowlist factory | **Done** (this session) |
| P1 | Unit coverage for incomplete metadata + array identity | **Done** (this session) |
| — | Further type-level discriminated MRL union | Optional / out of BC scope |

## Lane Action

- Task moved: `docs/tasks/02-doing/` → `docs/tasks/03-review/`
- Status note: Implemented + formal review ACCEPTED_100; awaiting final `/verify-task-completion` if pipeline requires it before `04-completed/`.

## Files Touched This Review

| File | Action |
|------|--------|
| `open-sse/config/embeddingRegistry.ts` | path-to-100 hardening |
| `tests/unit/embeddings-matryoshka.test.ts` | additional fail-closed + identity tests |
| `CHANGELOG.md` | Unreleased Fixed bullet |
| `.changelog/20260722-000100-0103-epic21-matryoshka-path-to-100-reviewers.md` | rebuild-safe entry |
| `docs/reports/reviews/2026-07-22-task-0103-registry-matryoshka-metadata-review.md` | this report |
| `docs/tasks/03-review/0103-omniroute-epic21-registry-matryoshka-metadata.md` | lane move + review trail |
