# Review Report: Task 0104 — EPIC-21 T21-D Client MRL Truncate Fallback (2026-07-22)

## Review Lineage

- **Current task**: Task 0104 (`omniroute-epic21-client-mrl-truncate-fallback`); live path at review start: `docs/tasks/02-doing/0104-omniroute-epic21-client-mrl-truncate-fallback.md`
- **Previous reports**: none found for 0104 (first formal review)
- **Related context**:
  - EPIC-21 T21-D + investigation §3 (`docs/reports/audits/2026-07-19-embeddings-mrl-dimensions-investigation.md`)
  - Hard deps: **0101** (Gemini shim), **0103** (MRL registry + renorm D4 lock)
  - Soft dep: **0102** (dimension dialect SSoT — request half left intact)
  - Downstream: **0105** catalog exposure of MRL fields
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
| local_implementation | 100 | Pure helper + handler wire; typecheck + eslint green; 64/64 suite green this session |
| runtime_enforcement | 100 | Pre-upstream MRL dim 400 (skips fetch); post-upstream truncate+renorm on MRL; non-MRL mismatch 400; structured log `embed.mrl_client_truncate` |

### Reviewer path-to-100 fix applied this session

| Item | Action | Evidence |
|------|--------|----------|
| `applyClientMrl` trusted pre-gate only | Re-run `validateRequestedMrlDim` inside apply (fail-closed; no silent wrong cut) | `open-sse/utils/embeddingMrl.ts` |
| `as Record<string, unknown>` | Removed; `Reflect.get` + `Object.assign` for item fields | same file |
| Batch `fromDim` last-writer | Use `Math.max` of observed source dims | same file |
| Missing pure tests | Invalid MRL dim without pre-gate; base64 non-float skip | `tests/unit/embedding-mrl-truncate.test.ts` |

## Axiom Compliance (tsjs)

| Axiom | Status | Notes |
|-------|--------|-------|
| Type Purity | ✅ | No `any` / unverified `as T` on the production MRL surface after path-to-100; named exports; renorm default from 0103 `true as const` |
| Boundary Integrity | ✅ | Requested dim parsed to positive integer; MRL allowlist via registry `isAllowedEmbeddingDim`; 400 messages through `sanitizeErrorMessage`; non-float embeddings not rewritten |
| Async Determinism | ✅ | Pure helper is sync; handler awaits `fetch`/`json`; truncate log is sync; no floating promises introduced |
| Immutability | ✅ | Prefix truncate uses `slice` / new arrays; items shallow-cloned via `Object.assign`; original embedding arrays not mutated in place |
| State Exclusivity | ✅ | Discriminated `MrlDimValidation` / `MrlApplyResult` (`ok: true \| false`); MRL vs known-non-MRL vs unknown model branches exclusive |

## Rubric snapshot

| Dimension | Score | Notes |
| --- | --- | --- |
| Pure truncate + L2 renorm helper | 100 | `embeddingMrl.ts`: parse / validate / l2 / prefix / apply |
| Handler wire (pre + post) | 100 | `embeddings.ts` early 400 + post-success apply + usage untouched |
| Never silent truncate non-MRL | 100 | 400 on length mismatch for known non-MRL |
| Unsupported MRL dim → 400 | 100 | Pre-upstream + defense-in-depth in apply |
| Renorm default ON (D4) | 100 | `EMBEDDING_MRL_CLIENT_RENORM_DEFAULT`; pure path allows `renorm: false` for tests |
| Log/metric signal | 100 | `embed.mrl_client_truncate` (provider/model/from→to/count/renorm; no secrets) |
| Batch consistency | 100 | Multi-item truncate + renorm covered |
| Tests | 100 | **64 pass / 0 fail** (mrl-truncate + gemini + matryoshka + dialect + handler) |
| typecheck:core | 100 | exit 0 this session |
| lint (touched files) | 100 | eslint `--max-warnings=0` on helper + handler + test |
| CHANGELOG | 100 | builders 0104 entry + reviewers path-to-100 entry |
| Scope discipline | 100 | No catalog (0105); no dialect rewrite; no UI; no Sidebar; no :21000 |

## Contract Compliance (Exit Conditions)

| Exit / MUST | Status | Live proof |
| --- | --- | --- |
| Pure truncate+renorm helper unit-tested | ✅ | `open-sse/utils/embeddingMrl.ts` + suite |
| Wired into `handleEmbedding` post-upstream | ✅ | `embeddings.ts` success path |
| Unsupported dim → clear 400 via sanitize helpers | ✅ | pre-gate + `sanitizeErrorMessage` |
| TDD evidence in Completion Evidence | ✅ | task + this report |
| `embedding-mrl-truncate` + gemini dimensions green | ✅ | this session |
| `npm run typecheck:core` | ✅ | exit 0 |
| lint no new errors (touched surface) | ✅ | eslint max-warnings=0 |
| Hard Rule #18 (failing→passing tests) | ✅ | builder TDD + new regression cases |
| CHANGELOG / `.changelog/` entry | ✅ | 0104 + path-to-100 |
| Completion Evidence filled | ✅ | task evidence + review trail |

### Test matrix (this session)

```text
node --import tsx/esm --test \
  tests/unit/embedding-mrl-truncate.test.ts \
  tests/unit/embeddings-gemini-dimensions.test.ts \
  tests/unit/embeddings-matryoshka.test.ts \
  tests/unit/embeddings-dimension-dialect.test.ts \
  tests/unit/embeddings-handler.test.ts
→ 64 pass / 0 fail

npx eslint --max-warnings=0 \
  open-sse/utils/embeddingMrl.ts \
  open-sse/handlers/embeddings.ts \
  tests/unit/embedding-mrl-truncate.test.ts
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
- **[D1]** `applyClientMrlToEmbeddingData` could prefix-truncate to an unsupported MRL dim if a future caller skipped pre-upstream validation. **Fixed** via re-validation.
- **[D2]** Unjustified `as Record<string, unknown>` on embedding items. **Fixed** with `Reflect.get` / `Object.assign`.
- **[D3]** Batch `fromDim` was last-writer only. **Fixed** with `Math.max` of observed source dims.

### Improvements (optional, not scored against 100)
- **[I1]** MRL `N < d` pass-through (cannot pad) leaves client with shorter-than-requested vectors; task + tests intentionally accept this over inventing dimensions. Catalog (0105) can document the contract.
- **[I2]** Base64 / non-float embeddings are skipped (no decode+truncate); correct non-corrupt policy; operators should use `encoding_format: float` when pinning dims.
- **[I3]** Optional runtime metric counter beyond structured log — out of scope; log event name is the contract.

## Path to 100

| Priority | Change | Status |
|----------|--------|--------|
| P0 | Fail-closed re-validate MRL dim inside apply | **Done** (this session) |
| P0 | Remove production `as Record` on item view | **Done** (this session) |
| P1 | Pure tests: invalid dim + base64 skip | **Done** (this session) |
| — | Residual I1–I3 | Accept as documented product choices |

## Lane action

- Move task `docs/tasks/02-doing/0104-…` → `docs/tasks/03-review/0104-…` (S=100).
- Do **not** move to `04-completed/` (requires separate verify agent).
