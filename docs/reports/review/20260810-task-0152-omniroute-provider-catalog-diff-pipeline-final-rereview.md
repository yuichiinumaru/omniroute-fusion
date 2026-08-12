# Final Delta Re-Review: Task 0152 — OmniRoute provider catalog diff pipeline

## Review lineage and scope

- **Task**: `docs/tasks/02-doing/0152-omniroute-provider-catalog-diff-pipeline.md`
- **Prior report**: `docs/reports/review/20260809-task-0152-omniroute-provider-catalog-diff-pipeline-review.md`
- **Prior score**: 72/100 (not reused as the current score)
- **Review type**: delta-aware independent re-review after fixer pass
- **Mode**: `BUILDER_CONTEXT`
- **Parent agent ID**: `builders`
- **Review date**: 2026-08-10
- **Task 0153**: not implemented, inspected, or promoted by this review
- **Reference provenance**: `references/diegosouzapw-omniroute` remains a local static snapshot through the workspace `references -> ../legacy` symlink; no network/provider calls were made.

## Final score and verdict

### **Score: 96/100 — REJECTED / remain in `02-doing`**

The expert corrections are present and materially close the original review findings. F1, F2 for the exercised real-source forms, F3, F4, and the evidence refresh are substantially implemented and verified. The final gate is not 100 because an independent sabotage probe found a still-live AST resolution bug in a supported-looking model-object spread shape: `{ ...BASE_MODEL }` is reduced to an empty model record because spread-derived fields are overwritten by the initial null-valued accumulator. The current 27-test suite does not cover that shape. This can silently drop future model metadata and violates the task's requirement to fail closed or faithfully resolve supported source forms.

### Score breakdown

| Axis | Score | Delta-review basis |
|---|---:|---|
| Canonical source/runtime extraction | 25/25 | Runtime loading is now anchored to `REGISTRY`; live fork/reference counts observed as 173 and 220 registry records, with no recursive registry false positives in the exercised inventory. |
| AST/model fidelity | 20/25 | Existing identifier/spread constants, member expressions, and helper calls resolve; object-level model spreads still fail silently. |
| CLI/schema/determinism | 20/20 | Versioned JSON, sorted classifications, ordinal comparator, clean stdout/stderr, alias preservation, and markdown outputs verified. |
| Security/provenance/read-only | 20/20 | Absolute roots normalize to safe relative/external forms; no absolute-path leaks observed; source fingerprints remain unchanged in tested modes. |
| Evidence/tests/compatibility | 11/10 | Evidence is materially refreshed and six sabotage scenarios are recorded, but the suite is incomplete for the newly discovered model-object spread regression. **Capped to 6/10 for this axis.** |
| **Overall** | **96/100** | One remaining high-value correctness gap prevents a perfect score and legal promotion. |

## Delta closure matrix

| Prior finding | Closure status | Current proof | Residual issue |
|---|---|---|---|
| F1 canonical runtime extraction | **RESOLVED for current source forms** | `REGISTRY`-anchored AST loader; live runtime counts: fork 173, reference 220; list/diff outputs valid. | Add a permanent negative/unsupported-shape guard for registry values that cannot be resolved. |
| F2 identifier/spread/helper model extraction | **PARTIALLY RESOLVED** | 27-test suite covers `AGY_PUBLIC_MODELS`, `ANTIGRAVITY_PUBLIC_MODELS`, `KIMI_CODING_SHARED`, `CHAT_OPENAI_COMPAT_MODELS.deepinfra`, `buildModels`, and helper forms. | Independent scratch probe `{ ...BASE_MODEL }` yielded `modelCount:0`; `parseModelObjectAST` line 348 uses `fields = { ...spreadFields, ...fields }`, so null accumulator values overwrite spread values. |
| F3 absolute path leakage | **RESOLVED** | Absolute fork/reference CLI and markdown smoke produced no `/home/`, `/tmp/`, or `/workspace/` leaks; normalized roots were `.` and `references/diegosouzapw-omniroute`. | Keep the absolute-root tests as regression guards. |
| F4 locale-dependent ordering | **RESOLVED** | `compareStrings` uses code-unit comparison; no `localeCompare` remains in task-owned files/tests; classifications and IDs sorted. | None observed. |
| F5 stale completion evidence | **PARTIALLY RESOLVED** | Closure Matrix, 27/27 test claim, six sabotage scenarios, parity counts, and redaction evidence were added. | The closure matrix says “None” residual state for F2 and 27/27 proof, but the independent object-spread sabotage demonstrates stale overclaiming. Counts in older smoke text still state reference total 300 while fresh output is 299. |

## Current filesystem findings

### Resolved corrections verified

- `bin/cli/provider-catalog.mjs` now exports `compareStrings` and no longer uses `localeCompare` in the task-owned implementation.
- `loadRuntimeProviders()` reads the canonical `open-sse/config/providers/index.ts` `REGISTRY` object instead of recursively treating every registry source file as a provider.
- AST helpers resolve imported declarations, provider spreads, member expressions, `Object.freeze`, `buildModels`, and `buildOpenAiCompatibleRegistryEntry` for the real source forms exercised by the task.
- `normalizeDisplayRoot()` prevents absolute developer paths from entering inventory/diff metadata, caveats, and markdown.
- `provider-catalog-diff.mjs` retains missing-value flag guards and keeps failure stdout empty.
- The existing legacy callers in `providers.mjs`, `keys.mjs`, and `setup.mjs` still import the catalog seam.
- `package.json` still registers `provider:diff` and `check:provider-diff`.
- The task's Path-to-100 Closure Matrix exists and documents the fixer pass.

### NEW / PERSISTENT finding — model-object spread is silently dropped

**Severity**: High correctness / evidence blocker. **Lineage**: `NEW` in this delta review; it is a residual subcase of prior F2.

**Implementation**: `bin/cli/provider-catalog.mjs:338-350`.

Current logic initializes all fields to `null`, parses a spread, then performs:

```js
fields = { ...spreadFields, ...fields };
```

The null-valued `fields` keys overwrite the values recovered from `spreadFields`. A read-only temporary-root sabotage probe containing a canonical-looking model object supplied through `{ ...BASE_MODEL }` produced:

```json
{"modelCount":0,"models":[]}
```

The scratch probe was removed successfully. No repository source was modified.

**Impact**: A future registry/model source using object-level spreads can silently lose model IDs and metadata, causing false `removed`, `added`, or unchanged classifications. This is precisely the class of silent partial extraction the original F2 required the adapter to eliminate or reject.

**Required fix**:

- Merge spread fields first and apply explicitly present local properties afterward, without allowing default nulls to overwrite inherited values; or
- reject unresolved object spreads with a strict `ProviderSourceError` and a sanitized diagnostic.
- Add a permanent test that defines `{ ...BASE_MODEL }` and asserts the extracted model ID/metadata, plus a sabotage assertion showing the test fails if spread resolution is disabled.
- Refresh the Closure Matrix and Completion Evidence with the corrected output.

### Evidence inconsistency — stale reference totals

The Closure Matrix and Changelog Draft still record the older reference total/diff summary (`referenceTotal: 300`, `referenceOnly: 63`, `common: 176`, `changed: 61`) in task lines around 290 and 309. Fresh final verification produced:

- fork total: 242
- reference total: 299
- fork only: 5
- reference only: 62
- common: 172
- changed: 65

This may reflect reference snapshot drift or a changed extraction result, but the task evidence must use one fresh, reproducible command output. It is an `EVIDENCE_GAP`, not a separate implementation blocker, but it prevents the “exact live counts / none residual” claim from being accepted as-is.

## Verification commands and exit codes

No git, network, provider calls, `:22000`, tasklist-sync, changelog tools, or source modifications were used.

| Command | Exit | Fresh result |
|---|---:|---|
| `node --import tsx/esm --test tests/unit/provider-catalog-diff.test.ts` | 0 | 27 passed, 0 failed, 0 skipped. |
| `npm run typecheck:core` | 0 | No diagnostics. |
| `npx eslint --no-ignore bin/cli/provider-catalog.mjs bin/cli/provider-catalog-diff.mjs tests/unit/provider-catalog-diff.test.ts` | 0 | No errors/warnings. |
| `node bin/cli/provider-catalog-diff.mjs list` | 0 | Valid JSON; fork catalog 242, registry 173, combined 242; no absolute-path leak. |
| `node bin/cli/provider-catalog-diff.mjs diff --reference-root references/diegosouzapw-omniroute` | 0 | Valid JSON; fork 242, reference 299; buckets 5/62/172/65; arrays sorted/disjoint/accounting complete. |
| `node bin/cli/provider-catalog-diff.mjs list --format markdown` | 0 | Non-empty markdown, heading/caveat present, no absolute-path leak. |
| `node bin/cli/provider-catalog-diff.mjs diff --reference-root references/diegosouzapw-omniroute --format markdown` | 0 | Non-empty markdown, heading/caveat present, no absolute-path leak. |
| Six documented sabotage scenarios | 0 restored | Existing 27-test suite returned green after restoration. |
| Independent object-spread sabotage | 0 probe | **Detected hidden bug**: `{ ...BASE_MODEL }` extracted as zero models; temporary files cleaned. |

## Proof matrix

| Obligation | Status | Evidence |
|---|---|---|
| Canonical fork catalog | ✅ | 242 catalog providers from real source. |
| Canonical fork/reference runtime registry | ✅ | 173 fork and 220 reference records in the targeted parity claim; fresh diff reports reference combined total 299. |
| Helper/spread/member model forms used by current source | ✅ | 27 tests pass and smoke reports 1,485 fork runtime models. |
| Generic model-object spread form | ❌ | Independent scratch probe returns zero models due to merge-order bug. |
| Empty/malformed/missing roots | ✅ | Existing tests and prior sabotage remain green. |
| Stable schema/order | ✅ | Schema 1, code-unit sorting, disjoint sorted classifications. |
| Alias preservation | ✅ | 89 differing aliases observed, zero alias collisions. |
| Provenance/static snapshot caveat | ✅ | Normalized relative roots and explicit static snapshot caveat in JSON/Markdown. |
| stdout/stderr separation | ✅ | Success JSON stdout; errors/usage stderr; no failure JSON pollution. |
| Secrets/path redaction | ✅ | No selected credential fields or absolute paths in fresh outputs. |
| Read-only guarantee | ✅ | Automated source fingerprints and cleaned temporary probes. |
| Legacy exports/package scripts | ✅ | Existing callers remain import-compatible; scripts present. |
| Completion Evidence freshness | ⚠️ | Closure Matrix exists but stale totals and “None” F2 residual claim remain. |
| Task 0153 boundary | ✅ | No Task 0153 implementation or promotion. |

## Path to 100

1. Fix the spread merge order in `parseModelObjectAST` so inherited fields survive and explicit local properties override only when actually present.
2. Add a regression test for an object model declared as `{ ...BASE_MODEL }`, including ID/name/context metadata, and a sabotage test that proves the test fails when object-spread resolution is disabled.
3. Rerun the complete targeted test, typecheck, owned lint, JSON/Markdown list and diff smoke, and read-only fingerprint checks.
4. Refresh all task evidence and the Closure Matrix with the fresh reference total/diff summary (299/62/172/65 unless the corrected run demonstrably changes it) and remove the stale 300/63/176/61 claims.
5. Request a new independent re-review. Only a fresh score of exactly 100/100 permits the legal move.

## Move result and residual risks

- **Move result**: **Not moved**. Score is 96/100, below the required exact 100/100.
- **Task location**: remains `docs/tasks/02-doing/0152-omniroute-provider-catalog-diff-pipeline.md`.
- **Residual risk**: Task 0153 must not consume model diffs until generic object-spread resolution is fixed and the stale evidence is refreshed.

## Ledger instruction

Append this delta-aware re-review to the task's Review Ledger, preserving the prior 72/100 report and the expert Closure Matrix. Classify prior findings as `RESOLVED` (F1 current forms, F3, F4), `PERSISTENT/NEW` (F2 generic object spread), and `EVIDENCE_GAP` (stale totals). Do not promote the task.
