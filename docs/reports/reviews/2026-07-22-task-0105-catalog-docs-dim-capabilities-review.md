# Review Report: Task 0105 — EPIC-21 T21-E Catalog / Docs Dim Capabilities (2026-07-22)

## Review Lineage

- **Current task**: Task 0105 (`omniroute-epic21-catalog-docs-dim-capabilities`); live path at review start: `docs/tasks/02-doing/0105-omniroute-epic21-catalog-docs-dim-capabilities.md`
- **Previous reports**: none found for 0105 (first formal review)
- **Related context**:
  - EPIC-21 T21-E + investigation (`docs/reports/audits/2026-07-19-embeddings-mrl-dimensions-investigation.md`)
  - Hard deps: **0103** (registry MRL fields), **0101** (Gemini shim correctness before advertising)
  - Preferred deps: **0104** (client truncate docs accuracy), **0102** (dialect SSoT docs)
  - Serial last task in EPIC-21 wave
- **Review mode**: `initial` (tsjs + code-quality) with **path-to-100 applied this session**
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
| local_implementation | 100 | Pure mapper + flat list + dual-surface wire; typecheck + eslint green; **10/10** suite green this session |
| runtime_enforcement | 100 | GET `/v1/embeddings` and catalog embedding push both spread `toEmbeddingModelPublicMrlFields`; custom models omit MRL (no false positives); docs D1–D5 paths grepped real |

### Reviewer path-to-100 fix applied this session

| Item | Action | Evidence |
|------|--------|----------|
| Surface field-drift risk | Composition tests mirroring route GET + catalog push | `tests/unit/embedding-dim-capabilities-catalog.test.ts` |
| Public allowlist mutability type | `matryoshkaDimensions?: readonly number[]` on public fields | `open-sse/config/embeddingRegistry.ts` |
| Test type purity | Drop bare `as EmbeddingModel`; use `MrlMapperInput` / optional chaining | same test file |
| Operator mode vs D4 ambiguity | Docs note: `matryoshkaMode: "provider"` does **not** disable D4 truncate+renorm | `docs/reference/API_REFERENCE.md` |

## Axiom Compliance (tsjs)

| Axiom | Status | Notes |
|-------|--------|-------|
| Type Purity | ✅ | No `any` / unverified `as T` on production MRL public mapper; `isMatryoshka?: true` literal; named exports; test fixtures use `Pick`/`MrlMapperInput` |
| Boundary Integrity | ✅ | Public JSON built from curated registry only; custom models never get MRL keys; mapper gate is strict `=== true` (no truthy coercion) |
| Async Determinism | ✅ | Mapper + list builders pure/sync; no promises introduced on discovery path |
| Immutability | ✅ | Allowlist copied via `[...model.matryoshkaDimensions]`; seed rows not shared; public type `readonly number[]` after path-to-100 |
| State Exclusivity | ✅ | Non-MRL → `{}` only; MRL → `isMatryoshka: true` + optional capability keys; no false-positive capability advertisement |

## Rubric snapshot

| Dimension | Score | Notes |
| --- | --- | --- |
| Public field names (camelCase, registry-aligned) | 100 | `isMatryoshka`, `matryoshkaMode`, `minDimensions`/`maxDimensions`, `matryoshkaDimensions` |
| GET `/v1/embeddings` list wire | 100 | Spreads mapper; does not leak `name`; custom omit MRL |
| Catalog embedding wire | 100 | Spreads mapper on active embedding rows |
| Non-MRL no false positives | 100 | ada-002 + explicit false + empty object covered |
| Docs D1–D5 accuracy | 100 | All claimed symbols/paths exist (`rg` this session) |
| Tests | 100 | **10 pass / 0 fail** (mapper + flat list + composition) |
| typecheck:core | 100 | exit 0 this session |
| lint (touched files) | 100 | eslint `--max-warnings=0` |
| CHANGELOG | 100 | builders 0105 + reviewers path-to-100 entries |
| Scope discipline | 100 | No new endpoints; no UI/Sidebar; no dialect rewrite; no :21000 |

## Contract Compliance (Exit Conditions)

| Exit / MUST | Status | Live proof |
| --- | --- | --- |
| List and/or catalog JSON includes MRL capability fields | ✅ | Both: `route.ts` GET + `catalog.ts` embedding loop |
| Unit test for exposure mapper | ✅ | `tests/unit/embedding-dim-capabilities-catalog.test.ts` |
| MRL seed response includes capability fields | ✅ | openai-3-small + gemini suite assertions |
| Non-MRL: fields absent / no false positives | ✅ | ada-002 + explicit false |
| Docs D1–D5 with grepped real paths | ✅ | `docs/reference/API_REFERENCE.md` + `rg` proof |
| No fabricated endpoints/env vars | ✅ | Extends existing list/catalog only |
| `npm run typecheck:core` | ✅ | exit 0 |
| lint no new errors (touched surface) | ✅ | eslint max-warnings=0 |
| CHANGELOG / `.changelog/` entry | ✅ | 0105 builders + path-to-100 reviewers |
| Completion Evidence filled | ✅ | task evidence + this report |
| EPIC-21 §5 catalog/docs metrics | ✅ | checked in epic planning doc |

### Doc accuracy proof (this session)

| Claimed path / symbol | Found |
| --- | --- |
| `toEmbeddingModelPublicMrlFields` / `EMBEDDING_MRL_CLIENT_RENORM_DEFAULT` | `open-sse/config/embeddingRegistry.ts` |
| `gemini-openai-shim` / `applyEmbeddingDimensions` | `open-sse/config/embeddingDimensionDialect.ts` |
| `validateRequestedMrlDim` / `embed.mrl_client_truncate` | `open-sse/utils/embeddingMrl.ts` |
| Handler applies dialect + MRL | `open-sse/handlers/embeddings.ts` |
| List + catalog surfaces | `src/app/api/v1/embeddings/route.ts`, `src/app/api/v1/models/catalog.ts` |
| `v1EmbeddingsSchema` | `src/shared/validation/schemas/apiV1.ts` |
| Investigation report | `docs/reports/audits/2026-07-19-embeddings-mrl-dimensions-investigation.md` |

### Test matrix (this session)

```text
node --import tsx/esm --test tests/unit/embedding-dim-capabilities-catalog.test.ts
→ 10 pass / 0 fail

npx eslint --max-warnings=0 \
  open-sse/config/embeddingRegistry.ts \
  tests/unit/embedding-dim-capabilities-catalog.test.ts
→ exit 0

npm run typecheck:core
→ exit 0
```

### Adversarial registry scan (this session)

```text
total 48 embedding rows; MRL 13; non-MRL 35; capability leaks on non-MRL = 0
all MRL seeds currently matryoshkaMode=provider
live public shapes match API_REFERENCE example for text-embedding-3-small
```

## Findings (pre-fix → resolved)

### Critical
- None

### Serious
- None

### Debt (resolved this session)
- **[D1]** Mapper/flat-list tests alone could miss route/catalog composition drift. **Fixed** with `composeEmbeddingsListEntry` / `composeCatalogEmbeddingEntry` guards.
- **[D2]** Public allowlist typed as mutable `number[]` while registry uses `readonly`. **Fixed** on `EmbeddingModelPublicMrlFields`.
- **[D3]** Operator could read `matryoshkaMode: "provider"` as “no client truncate”. **Fixed** with explicit D4 note in API_REFERENCE.

### Improvements (optional, not scored against 100)
- **[I1]** OpenAPI (`docs/openapi.yaml`) still describes create-embeddings `dimensions` only — not list discovery MRL fields. Task allowed API_REFERENCE as primary surface; optional mechanical OpenAPI extension later.
- **[I2]** GET embeddings route still has pre-existing empty `catch {}` and `as Record<string, any>` on custom models — outside 0105 ownership; do not expand scope.
- **[I3]** Double-application of `toEmbeddingModelPublicMrlFields` on already-flat rows is intentional defense; could document “idempotent” in TSDoc if desired.

## Path to 100

**Applied this session** (see path-to-100 table). Residual score after fixes: **100**.

## Lane Action

- Task file moved: `docs/tasks/02-doing/` → `docs/tasks/03-review/0105-omniroute-epic21-catalog-docs-dim-capabilities.md`
- Report: `docs/reports/reviews/2026-07-22-task-0105-catalog-docs-dim-capabilities-review.md`
- Changelog: `.changelog/20260722-014427-0105-epic21-catalog-docs-path-to-100-reviewers.md`
