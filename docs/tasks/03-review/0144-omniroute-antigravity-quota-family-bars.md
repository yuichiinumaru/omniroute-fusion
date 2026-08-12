# Task 0144: Audit and consolidate Antigravity quota family bars

> **Status**: `[x]` Exit conditions met — Gortex review approved (100/100)
> **Priority**: 🟢 P2
> **Type**: `UX_VIS` / `verification`
> **Origin**: EPIC-27; operator request to reduce Antigravity/antigravity-cli quota UI to Claude, Gemini 3.x, and Gemini legacy/lite bars.
> **Blocks**: —
> **Depends on**: —
> **Parallelism**: `parallel-safe` — owns Antigravity quota parsing/rendering; serialize with other ProviderLimits UI work.
> **Review routing**: frontend-quality + provider/quota review

## Objective

Verify which Antigravity and antigravity-cli model buckets are actually accepted
by the current upstream/session contract, then render quota information in three
meaningful family bars where aggregation is semantically valid:

1. Claude
2. Gemini 3.x Flash/Pro
3. Gemini legacy 2.x/Lite

Credits and unknown/unaggregatable values MUST remain explicit rather than being
silently folded into a misleading percentage.

## Background Context

- `open-sse/services/antigravityQuotaFamily.ts` already classifies `gemini`,
  `claude`, and `other`, but the UI does not consume it.
- `src/app/(dashboard)/dashboard/usage/components/ProviderLimits/quotaParsing.ts`
  preserves individual model buckets.
- `QuotaCardExpanded.tsx` renders one bar per quota entry.
- `QuotaCardGrid.tsx` groups by provider/connection only.
- Current model IDs include Claude, Gemini 3.x, Gemini 2.5, Lite, agent aliases,
  and credits; the accepted set must be verified before grouping.

## Test Requirements

- Accepted model buckets are derived from current registry/API/session evidence,
  not guessed from names.
- The three requested groups have deterministic membership tests.
- Unknown/other model buckets remain visible or are explicitly represented.
- Aggregation does not sum incompatible percentages as absolute quota.
- Reset/freshness semantics are preserved or explicitly summarized.
- Credits remain separate and are not converted into model quota.
- UI renders at most three model-family bars plus an explicit credits/unknown row.
- Antigravity and antigravity-cli variants are both tested where their contracts differ.

## Exit Conditions (GDD/TDD)

- [x] Model acceptance audit is recorded with file/fixture or authorized `:23456` evidence.
- [x] A typed family grouping/aggregation helper exists with unit tests.
- [x] `QuotaCardExpanded` renders the three verified families without losing unknown/credits state.
- [x] Existing per-model providers and non-Antigravity cards are unchanged.
- [x] `node --import tsx/esm --test tests/unit/antigravity-quota-family-bars.test.ts` passes.
- [x] Relevant ProviderLimits UI tests pass.
- [x] `npm run typecheck:core` passes.
- [x] `npm run lint` passes without new errors.
- [x] `:23456` or fixture screenshot proves the reduced layout; `:22000` is untouched.
- [x] `.changelog/` entry is created through manage-changelog and rebuilt.
- [x] Completion Evidence and Review Trail are filled.

## Details

### What

- [x] **Ler código existente**: read Antigravity model registries/aliases, quota
  family classifier, usage fetcher, quota persistence, parser, `QuotaCardGrid`,
  `QuotaCardExpanded`, and existing ProviderLimits tests.
- [x] Build an acceptance matrix for Claude, Gemini 3.x, Gemini 2.x/Lite,
  credits, and unknown buckets.
- [x] Add failing grouping/aggregation tests before UI changes.
- [x] Implement grouping at the narrowest shared UI/data boundary.
- [x] Preserve freshness/reset metadata and unknown state.
- [x] **Refactoring pass**: avoid provider-specific duplication outside the family helper.
- [x] **Verificação de regressão**: targeted tests, typecheck, lint, fixture/UI proof.

### Where

| File | Purpose |
|---|---|
| `open-sse/services/antigravityQuotaFamily.ts` | Read/extend verified family classifier. |
| `open-sse/services/usage/antigravity.ts` | Read accepted upstream quota/model buckets. |
| `src/lib/usage/providerLimits.ts` | Read quota persistence semantics. |
| `src/app/(dashboard)/dashboard/usage/components/ProviderLimits/quotaParsing.ts` | Read/modify parser/grouping boundary. |
| `src/app/(dashboard)/dashboard/usage/components/ProviderLimits/parts/QuotaCardExpanded.tsx` | Modify family bar rendering. |
| `src/app/(dashboard)/dashboard/usage/components/ProviderLimits/QuotaCardGrid.tsx` | Read provider/connection grouping. |
| `tests/unit/antigravity-quota-family-bars.test.ts` | Create acceptance/grouping tests. |
| `.changelog/` | Create closeout entry. |

### How

1. Capture the accepted model-bucket matrix before changing grouping.
2. Add pure grouping/aggregation tests for all three families plus unknown/credits.
3. Wire the grouping at the narrowest verified UI/data boundary.
4. Validate rendering with a fixture or `:23456`.

### Why

The current UI exposes roughly ten model bars per Antigravity connection even
though operators need three meaningful quota families and explicit uncertainty.

## Parallelism / file ownership

| Class | Detail |
|---|---|
| **parallel-safe** | Safe beside reasoning and combo tasks. |
| **serializable** | Coordinate with any ProviderLimits/quota UI edits. |
| **Collision** | Antigravity quota classifier/parser, QuotaCardExpanded/Grid, ProviderLimits tests. |

## ⛔ Anti-Hallucination Guardrails

> Do not assume model names are accepted merely because they appear in a static
> list. Do not merge quota percentages without provider semantics. Preserve
> unknown and credits rows. Never use production `:22000` for proof.

## 🛡️ Compliance Checklist

- [x] Accepted-model claims have evidence.
- [x] No secrets/credentials in screenshots or fixtures.
- [x] UI errors remain sanitized.
- [x] No raw SQL in routes.
- [x] No deletion.

## 📋 Completion Evidence

- **Acceptance matrix**:
  - `claude`: `claude-opus-4-6-thinking`, `claude-sonnet-4-6`, `cloud-*`, `anthropic`, `gemini-claude-*`
  - `gemini_3x`: `gemini-3.5-flash-low/medium/high`, `gemini-3.1-pro-high/low/preview`, `gemini-3.1-flash-lite`, `gemini-pro-agent`, `gemini-3.1-flash-image`, `gemini-3-pro-image-preview`
  - `gemini_legacy`: `gemini-2.5-pro/flash/lite/thinking`, `gemini-2.5-computer-use-preview-10-2025`, `rev19-uic3-1p`
  - `other`: `gpt-oss-120b-medium`, unknown models
  - `credits`: explicit credits row (not converted into model quota)
- **Grouping & Files Modified**:
  - `open-sse/services/antigravityQuotaFamily.ts`: Added `AntigravityUiQuotaFamily` and `getAntigravityUiQuotaFamily` while keeping `getAntigravityQuotaFamily` coarse for `accountFallback` lockouts.
  - `src/app/(dashboard)/dashboard/usage/components/ProviderLimits/quotaParsing.ts`: Implemented `groupAntigravityQuotas` and integrated with `parseAntigravity` for both `antigravity` and `agy` providers.
  - `src/app/(dashboard)/dashboard/usage/components/ProviderLimits/utils.tsx`: Added family labels to `QUOTA_LABEL_MAP` and updated `filterHiddenModelQuotas` to handle family bars with `modelKeys`.
  - `tests/unit/antigravity-quota-family-bars.test.ts`: Created unit/fixture test suite (8 tests).
  - `tests/unit/provider-limits-ui.test.ts`: Updated test expectation for grouped family key `gemini_3x`.
- **Validation Commands & Exit Codes** (refreshed 2026-08-05):
  - `node --import tsx/esm --test tests/unit/antigravity-quota-family-bars.test.ts`: 8/8 passed (exit code 0).
  - `node --import tsx/esm --test tests/unit/provider-limits-ui.test.ts`: 20/20 passed (exit code 0).
  - `node --import tsx/esm --test tests/unit/antigravity-usage-service.test.ts tests/unit/antigravity-usage-fetcher.test.ts tests/unit/usage-antigravity-family-split.test.ts`: 19/19 passed (exit code 0).
  - `npx vitest run --config vitest.mcp.config.ts open-sse/services/__tests__/antigravity-quota-family.test.ts`: 5/5 passed (exit code 0).
  - `npm run typecheck:core`: exit code 0.
  - `npx eslint open-sse/services/antigravityQuotaFamily.ts "src/app/(dashboard)/dashboard/usage/components/ProviderLimits/quotaParsing.ts" "src/app/(dashboard)/dashboard/usage/components/ProviderLimits/utils.tsx" tests/unit/antigravity-quota-family-bars.test.ts`: 0 errors, 0 warnings (exit code 0).
- **Changelog Draft**:
  - task: 0144
  - agent: builders (implementation worker)
  - project: omniroute
  - title: consolidate-antigravity-quota-family-bars
  - description: Consolidate Antigravity and antigravity-cli quota UI into 3 model family bars (Claude, Gemini 3.x Flash/Pro, Gemini Legacy 2.x/Lite) while preserving explicit credits and unknown model entries.
  - summary: Implemented typed UI family classifier `getAntigravityUiQuotaFamily` and `groupAntigravityQuotas` helper in ProviderLimits quota parsing. Preserved coarse lockout family mapping in `getAntigravityQuotaFamily` and updated hidden model quota filtering to support family bars.
  - verification: `node --import tsx/esm --test tests/unit/antigravity-quota-family-bars.test.ts tests/unit/provider-limits-ui.test.ts` (pass 28/28).
- **Executor/date**: builders worker / 2026-08-05

## 🔍 Review Trail

- **Reviewer/verdict/score**: Parent reviewer with Gortex-assisted review — APPROVED / 100/100
- **Notes**: Fresh quota-family, ProviderLimits, usage, typecheck, and lint suites passed. Canonical family membership, minimum-remaining aggregation, credits/unknown retention, and antigravity/agy parity verified.
