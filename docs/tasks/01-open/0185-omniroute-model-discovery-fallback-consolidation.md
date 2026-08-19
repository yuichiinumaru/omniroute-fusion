# Task 0185: Consolidate model-discovery fallback call-site blocks

> **Status**: `[ ]` Open
> **Priority**: P2
> **Type**: `housekeeping`
> **Origin**: Duplicate-block audit — `.agents/user/gitingest/omniroute2/sameblocs.csv` groups 0906, 1104, 1160, and 1239, verified against the live model-discovery route.
> **Blocks**: —
> **Depends on**: —
> **Parallelism**: `serializable` — owns the fallback call-site region of `src/app/api/providers/[id]/models/route.ts`; coordinate with any provider-discovery or route-decomposition work.
> **Review routing**: independent + provider/API compatibility review

---

## Objective

Reduce only the proven exact duplication in the per-connection provider model-discovery route by extracting a small local helper (or helpers) for repeated fallback/error response orchestration. Preserve every provider-specific discovery request, parser, auth rule, retry order, cache decision, warning string, status code, response source, and persistence side effect.

The task is complete only if the resulting change is behavior-preserving and the helper boundary is narrower than the provider-discovery branches. This is not permission to redesign model discovery or merge provider branches merely because they contain similar-looking code.

## Background Context

### What already exists:

- `src/app/api/providers/[id]/models/route.ts:891-896` defines `buildResponse`, including hidden-model filtering.
- `src/app/api/providers/[id]/models/route.ts:951-970` defines `buildCachedDiscoveryResponse` and `buildLocalCatalogResponse`.
- `src/app/api/providers/[id]/models/route.ts:972-995` already centralizes cache/local fallback selection and status-aware error fallback. `buildDiscoveryErrorFallbackResponse` deliberately returns `null` for statuses 400, 503, and 504, preserving hard-error handling for those cases.
- `src/app/api/providers/[id]/models/route.ts:997-1018` already centralizes the refresh/cache and `autoFetchModels` gates.
- `src/app/api/providers/[id]/models/route.ts:1020-1085` persists successful discovery and re-reads synced models when an empty discovery clears the current connection cache. That behavior is a separate contract and must remain untouched.
- The live route has provider-specific branches for Bedrock, OpenAI-compatible providers, DataRobot, Azure AI, Azure OpenAI, watsonx, OCI, SAP, web/OAuth providers, Vertex, Anthropic-compatible providers, and the config-driven fallback pipeline.
- `tests/unit/provider-models-route.test.ts` already exercises cache fallback, refresh behavior, auto-fetch disabled behavior, OpenAI-compatible fallback, and provider-specific discovery success paths without live credentials.

### What is duplicated / under investigation:

- `sameblocs.csv:10100-10104`, group `0906`, reports one exact block at five route locations in the gitingest snapshot: DataRobot, Azure AI, watsonx, OCI, and SAP. The live equivalents are the repeated missing-token fallback/error blocks around route lines `1307-1318`, `1397-1409`, `1553-1565`, `1614-1626`, and `1680-1692`.
- `sameblocs.csv:13378-13381`, group `1239`, reports the same non-OK response fallback/error block at four locations. The live equivalents are around `1438-1450`, `1590-1602`, `1656-1668`, and `1721-1733`.
- `sameblocs.csv:12675-12676`, group `1160`, is an overlapping/subset duplicate report for two of the non-OK blocks; it is not independent evidence for a second behavior.
- `sameblocs.csv:12106-12107`, group `1104`, reports an exact catch/non-OK block in the Anthropic-compatible and config-driven paths (live route around `2282-2297` and `2452-2467`). These contexts have different surrounding request/config pipelines and must not be merged without proving that response-body consumption and logging behavior remain equivalent.
- The CSV is generated from `src.md`, not the live TypeScript file. Its line numbers are evidence anchors for the snapshot only; the live route lines above must be re-read before implementation.

## Test Requirements

- Existing cache, auto-fetch-disabled, empty-discovery, and local-catalog behavior MUST remain unchanged.
- The five group-0906 provider branches MUST preserve token precedence (`accessToken || apiKey`), the same 400 response when no token exists and no fallback is available, and the same cache/local warning text when fallback is available.
- The four group-1239 branches MUST preserve the same response status, `source`, warning text, and fallback ordering for non-OK upstream responses.
- `buildDiscoveryErrorFallbackResponse` MUST retain its current status classification; the refactor MUST NOT make URL/configuration errors fallback-safe or make redirect/transport failures terminal accidentally.
- The helper MUST NOT consume a response body earlier than the existing branch does, alter upstream fetch count/order, alter retry/pagination behavior, or change whether `buildApiDiscoveryResponse` persists discovered models.
- Anthropic-compatible and config-driven group-1104 code MUST either remain inline or have a separately justified helper contract that preserves error-body handling and logging. A duplicate-block match alone is insufficient evidence to merge it.
- Add or extend focused tests in `tests/unit/provider-models-route.test.ts` (or a narrowly justified adjacent unit file) covering at least one representative branch from each extracted seam and negative coverage for a branch intentionally left distinct.
- Tests MUST use mocked fetches and synthetic credentials only; no real provider, secret, production port, or external network is permitted.

---

## Exit Conditions (GDD/TDD)

- [ ] Existing route, helper definitions, provider registry/config, and relevant tests are read before modification.
- [ ] A short pre-edit behavior matrix records each candidate block, its provider branches, response/status/warning contract, and the reason it is safe or unsafe to extract.
- [ ] Only exact, behavior-equivalent fallback/error orchestration is extracted; provider-specific URL construction, headers, parsing, retries, and branch selection remain in place.
- [ ] Group 0906 and group 1239 behavior is covered by focused tests; group 1104 and the overlapping group 1160 disposition is documented explicitly.
- [ ] `node --import tsx/esm --test tests/unit/provider-models-route.test.ts` passes with 0 failures.
- [ ] `npm run typecheck:core` passes without errors.
- [ ] `npm run lint` passes without new errors on touched files.
- [ ] No production ports, secrets, generated tasklist/changelog/EPIC/dependency-tree surfaces, or unrelated provider behavior are modified.
- [ ] Completion Evidence and Review Trail are filled before promotion to `03-review/`.

## Details

### What

Subtasks:

- [ ] **Ler código existente**: read the complete live route sections around lines 891-1085, every candidate provider branch, `tests/unit/provider-models-route.test.ts`, and the provider discovery/config helpers before editing.
- [ ] Build the pre-edit matrix from the live source and `sameblocs.csv`; distinguish exact duplication from merely similar fallback behavior.
- [ ] Add or adjust focused regression tests before the refactor where practical, including no-token, non-OK, transport-error, cache, and auto-fetch-disabled cases.
- [ ] Extract the smallest local helper boundary justified by the matrix; keep provider-specific discovery branches and warning/status policy explicit at call sites.
- [ ] **Refactoring pass**: reject any abstraction that hides provider-specific auth, retry, status, body-consumption, persistence, or cache semantics.
- [ ] **Verificação de regressão**: run the focused unit test, typecheck, and scoped lint; do not run broad suites.

### Where

| File | Purpose |
|---|---|
| `src/app/api/providers/[id]/models/route.ts` | Read and modify only the proven duplicate fallback/error call sites and local helper area. |
| `tests/unit/provider-models-route.test.ts` | Read and extend focused route regression coverage. |
| `src/app/api/providers/[id]/models/discoveryConfig.ts` | Read to preserve config-driven URL/auth/response contracts; do not modify unless evidence requires it. |
| `src/lib/providerModels/modelDiscovery.ts` | Read to preserve cache persistence and auto-fetch semantics; do not modify. |
| `open-sse/config/providerRegistry.ts` | Read provider registry/model URL assumptions; do not modify for this task. |
| `.agents/user/gitingest/omniroute2/sameblocs.csv` | Read-only duplicate-audit evidence; do not regenerate or edit. |
| `docs/tasks/000-template.md` and `docs/tasks/AGENTS.md` | Task/process authority already used to create this task. |

### How

1. Re-read the current route, not only the gitingest snapshot, and capture the exact current line ranges and response contracts.
2. Classify group 0906 (missing-token fallback), group 1239/group 1160 (non-OK fallback), and group 1104 (catch/body/logging plus non-OK handling) independently.
3. Use a narrow helper accepting explicit fallback warnings and terminal response data only if that preserves the existing `Response | null` control flow. Do not introduce a generic provider fetch abstraction.
4. Keep `maybeReturnCachedDiscovery`, `maybeReturnAutoFetchDisabled`, `buildDiscoveryFallbackResponse`, `buildDiscoveryErrorFallbackResponse`, `buildCachedDiscoveryResponse`, `buildLocalCatalogResponse`, and `buildApiDiscoveryResponse` as distinct contracts unless a test-backed proof shows a strictly smaller safe change.
5. Run only the focused route test, typecheck, and scoped lint required by the exit conditions.

### Why

The route is a 2,505-line provider-discovery boundary with repeated exact fallback idioms. A narrow extraction can reduce future drift in warning/status handling, but an over-broad abstraction could silently change provider onboarding behavior, cache authority, redirect handling, or authentication failures. The value is maintainability and contract consistency, not a user-visible feature.

---

## Parallelism / file ownership

| Class | Detail |
|---|---|
| **parallel-safe** | Documentation-only or unrelated test work that does not touch the route fallback region or its focused tests. |
| **serializable** | Provider-discovery route edits, route decomposition, discoveryConfig changes, and provider-model fallback fixes. |
| **Collision** | `src/app/api/providers/[id]/models/route.ts`, `tests/unit/provider-models-route.test.ts`, and any shared model-discovery helper introduced by this task. |
| **Owner** | The executor of Task 0185 owns the fallback helper region and its focused regression tests until independent review. |

## Non-goals and compatibility constraints

- Do not merge DataRobot, Azure AI, watsonx, OCI, SAP, Anthropic-compatible, config-driven, or other provider branches into one discovery branch.
- Do not change provider endpoint URLs, headers, token precedence, auth failures, retry/pagination loops, status classification, response warning strings, or model normalization.
- Do not change cache TTL/storage, synced-model authority, empty-discovery clearing, `excludeHidden` filtering, or auto-fetch defaults.
- Do not extract a cross-file framework or create a new public API for route-local behavior.
- Do not use real credentials, live upstream requests, production ports, or broad test suites.
- Do not touch generated tasklist/changelog/EPIC/dependency-tree surfaces as part of implementation.

## ⛔ Anti-Hallucination Guardrails

> [!CAUTION]
> The CSV groups are static-analysis evidence, not proof that every similar branch has the same contract. Do not claim semantic equivalence from matching text alone. Do not mark complete without real focused test output.
>
> Never log or commit credentials, upstream response bodies containing secrets, or copied gitingest data beyond the required evidence references. Do not mutate `:21000` or any production service.

> [!IMPORTANT]
> Read every file in the Where table before editing. If the behavior matrix cannot prove a helper boundary without changing a branch's status, warning, body handling, or persistence semantics, leave that branch inline and record the NO-GO disposition in Completion Evidence.

## Compliance Checklist

- [ ] **Doc Accuracy**: all cited live paths, symbols, and line ranges revalidated before implementation.
- [ ] **Security**: no secret or credential is added to source, tests, logs, or task evidence.
- [ ] **Error Sanitization**: existing `safeOutboundFetch`/sanitization/error-status behavior is preserved.
- [ ] **No Raw SQL**: no database changes are part of this task.
- [ ] **Archive Protocol**: no files are deleted; no generated surfaces are hand-edited.

## Completion Evidence

- **Files created/modified**: [executor fills with real paths]
- **Tests that verify the work**: [executor fills with command and test names]
- **Test result**: [executor fills with real PASS/FAIL output]
- **Lint result**: [executor fills with real PASS/FAIL output]
- **Typecheck result**: [executor fills with real PASS/FAIL output]
- **Changelog**: [executor/reviewer records repository-required ledger handling, if applicable]
- **Executor**: [name/role]
- **Completion date**: [YYYY-MM-DD]

## Review Trail

- **Reviewer**: [independent reviewer]
- **Review date**: [YYYY-MM-DD]
- **Verdict**: [APPROVED / REJECTED]
- **Score (path to 100)**: [0-100]
- **Notes**: [evidence-based notes with paths/lines]
- **If rejected**: move to `02-doing/` with the reason recorded at the top.
