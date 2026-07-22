# Review Report: Task 0102 — EPIC-21 T21-B Dimension Dialect SSoT (2026-07-22)

## Review Lineage

- **Current task**: Task 0102 (`omniroute-epic21-dimension-dialect-ssot`); live path at review start: `docs/tasks/02-doing/0102-omniroute-epic21-dimension-dialect-ssot.md`
- **Previous reports**: none found for 0102 (first formal review)
- **Related context**:
  - EPIC-21 T21-B + investigation Phase B (`docs/reports/audits/2026-07-19-embeddings-mrl-dimensions-investigation.md`)
  - Hard dep **0101** Gemini OpenAI-shim D2 (`outputDimensionality` must not reach production Gemini baseUrl)
  - Soft coordination with **0103**/**0104** on `embeddings.ts` / registry types
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
| local_implementation | 100 | Pure SSoT module + handler wiring; typed dialects; immutable apply |
| runtime_enforcement | 100 | `handleEmbedding` is sole production body-build path; dialect last-writer; 20/20 green this session |

### Reviewer path-to-100 fix applied this session

| Item | Action | Evidence |
|------|--------|----------|
| Dialect last-writer vs `defaultParams` | Moved `applyEmbeddingDimensions` **after** model defaultParams merge; skip `DIMENSION_OWNED_FIELDS` keys in defaultParams | `open-sse/handlers/embeddings.ts` body-build block; 20/20 re-run green |

## Axiom Compliance (tsjs)

| Axiom | Status | Notes |
|-------|--------|-------|
| Type Purity | ✅ | No `any` / unverified `as T` in production dialect/handler paths; `clientDimensions: unknown`; named exports |
| Boundary Integrity | ✅ | Client OpenAI `dimensions` is the only client dim contract; dimension-owned keys blocked from KNOWN_FIELDS passthrough and re-applied only via dialect |
| Async Determinism | ✅ | Dialect is pure/sync; handler tests restore `globalThis.fetch` in `finally`; no floating promises in dialect |
| Immutability | ✅ | `applyEmbeddingDimensions` returns a new object; unit proves input `upstreamBody` not mutated; dialect constants `readonly` |
| State Exclusivity | ✅ | Mode union `openai-compat \| gemini-openai-shim \| gemini-native`; Gemini missing baseUrl → OpenAI-shim (never native) |

## Rubric snapshot

| Dimension | Score | Notes |
| --- | --- | --- |
| Dialect SSoT module | 100 | `open-sse/config/embeddingDimensionDialect.ts` — resolve + apply + URL detectors |
| Handler uses SSoT only | 100 | No residual ad-hoc dual inject; grep of `open-sse/handlers` shows sole apply call |
| Gemini D2 (OpenAI-shim) | 100 | `dimensions` only; strips `outputDimensionality`; production registry URL is shim |
| Default OpenAI-compat | 100 | Forwards `dimensions`; strips native field |
| Native Gemini gated | 100 | `isGeminiNativeBaseUrl` excludes shim; not enabled on production baseUrl |
| Tests (pure + handler) | 100 | dialect suite + 0101 gemini suite = **20/20** this session |
| typecheck:core | 100 | exit 0 this session |
| lint (touched files) | 100 | eslint `--max-warnings=0` on dialect + handler + both test files |
| CHANGELOG Unreleased | 100 | Task 0102 / T21-B bullet present under `[Unreleased]` |
| Scope discipline | 100 | No Voyage/Jina invention; no Sidebar; no 0103/0104 matryoshka/truncate |

## Contract Compliance (Exit Conditions)

| Exit / MUST | Status | Live proof |
| --- | --- | --- |
| Dialect SSoT module/fields exist and used by `handleEmbedding` | ✅ | `embeddingDimensionDialect.ts` + import/apply in `embeddings.ts` |
| No residual hard-coded dual inject for Gemini OpenAI-shim | ✅ | No assignment of `outputDimensionality` outside dialect native mode; shim dialect strips it |
| Unit tests dialect + gemini regression | ✅ | **20 pass / 0 fail** — `embeddings-dimension-dialect.test.ts` + `embeddings-gemini-dimensions.test.ts` |
| `npm run typecheck:core` | ✅ | exit 0 |
| lint no new errors | ✅ | eslint max-warnings=0 on touched paths exit 0 |
| CHANGELOG `[Unreleased]` | ✅ | EPIC-21 dimension dialect SSoT (Task 0102 / T21-B) entry present |
| Completion Evidence filled | ✅ | Task evidence complete (worker); lint filled by this review |

### Test matrix (this session)

```text
node --import tsx/esm --test \
  tests/unit/embeddings-gemini-dimensions.test.ts \
  tests/unit/embeddings-dimension-dialect.test.ts
→ 20 pass / 0 fail

npm run typecheck:core → exit 0
npx eslint open-sse/config/embeddingDimensionDialect.ts \
  open-sse/handlers/embeddings.ts \
  tests/unit/embeddings-dimension-dialect.test.ts \
  tests/unit/embeddings-gemini-dimensions.test.ts --max-warnings=0 → exit 0
```

## Findings

### Critical (Score < 50)

_None._

### Serious (Score 31–50)

_None._

### Debt (Score 51–70)

_None remaining after path-to-100 fix._

### Improvements (Score 80–99) — non-blocking residual notes

1. **Pre-existing error payload shape** (`open-sse/handlers/embeddings.ts` error branch returns provider `errorText` in the handler result object). Out of Task 0102 scope; not introduced by dialect work. Track under ERROR_SANITIZATION campaigns if not already covered at the route layer.
2. **Exotic provider dialects** (Voyage/Jina/Cohere param renames) intentionally deferred — task forbids inventing field names; default OpenAI-compat remains correct extension point.

## Adversarial Simulation

| Scenario | Result |
|----------|--------|
| Malicious client sends `outputDimensionality` alone (no `dimensions`) | Blocked by `KNOWN_FIELDS` + dialect omit → neither field on upstream |
| Client dual-sends `dimensions` + `outputDimensionality` on Gemini shim | Strip owned keys → re-apply only `dimensions` from client |
| Gemini `providerId` with missing baseUrl | Resolves to `gemini-openai-shim` (fail-safe vs 0101 bug class) |
| Gemini native-looking URL | Maps to `outputDimensionality` only; pure tests cover; production registry URL is shim |
| `defaultParams` hypothetically includes a dim key | Skipped by dimension-owned filter; dialect remains last-writer |
| Race / shared state | Pure functions; no module-level mutable dialect state |
| Closure leak | N/A — no request objects retained by dialect |

## Type Verification

| Invariant | Proof |
|-----------|-------|
| Client contract is always OpenAI `dimensions` | `ApplyEmbeddingDimensionsInput.clientDimensions` + handler passes `body.dimensions` only |
| One dialect → one upstream param (no dual-forward) | `applyEmbeddingDimensions` sets at most `dialect.dimensionParam` after omitting all owned keys |
| Production Gemini never uses native dialect | Registry `baseUrl` contains `/v1beta/openai/embeddings` → `isGeminiOpenAiShimBaseUrl`; native detector returns false when shim markers match |
| OpenAI-compat strips Gemini-native field | `OPENAI_COMPAT_DIALECT.stripFields` + owned-field omit |

## Path to 100

**Reached 100 this session** via:

1. ~~Move dialect after `defaultParams` and exclude dimension-owned keys from defaults~~ **DONE** (reviewer)

No further code changes required for Task 0102 acceptance.

## Diff Ownership

| Path | Ownership |
|------|-----------|
| `open-sse/config/embeddingDimensionDialect.ts` | Task 0102 (create) |
| `open-sse/handlers/embeddings.ts` (dialect wire + last-writer order) | Task 0102 |
| `tests/unit/embeddings-dimension-dialect.test.ts` | Task 0102 (create) |
| `tests/unit/embeddings-gemini-dimensions.test.ts` | 0101 ownership; regression consumer for 0102 |
| `CHANGELOG.md` Unreleased 0102 bullet | Task 0102 / parent closeout |

## Lane Action

- Move task `0102-omniroute-epic21-dimension-dialect-ssot.md` → `docs/tasks/03-review/`
- Parent: manage-changelog closeout already has Unreleased draft; no worker `.changelog/` publish by reviewer
- Soft: do not parallel-edit `embeddings.ts` body-build with 0103/0104 without re-review of dialect last-writer
