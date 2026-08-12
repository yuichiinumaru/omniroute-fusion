# Review Report: Task 0152 — OmniRoute provider catalog diff pipeline

## Review identity and lineage

- **Task**: `docs/tasks/02-doing/0152-omniroute-provider-catalog-diff-pipeline.md`
- **Mode**: `BUILDER_CONTEXT`
- **Parent agent ID**: `builders`
- **Reviewer**: independent reviewer, builder lane
- **Review date**: 2026-08-09
- **Prior Task 0152 reports**: none found under `docs/reports/review/`
- **Related local reference behavior**: `references` is a workspace symlink to `../legacy`; `references/diegosouzapw-omniroute` resolves to the checked-in static snapshot at `legacy/diegosouzapw-omniroute`. No network or provider calls were used.
- **Non-goal respected**: Task 0153 was not implemented or edited.

## Score and verdict

### **Score: 72/100 — REJECT / remain in `02-doing`**

The CLI is runnable, read-only in the exercised paths, has useful fail-closed guards, and passes the targeted tests/typecheck/task-owned lint. However, the central inventory contract is not semantically faithful to the canonical runtime registry and the successful absolute-root output contradicts the task's sanitization/provenance evidence. The recorded `242/173` fork and `300` reference counts therefore must not be treated as authoritative provider inventories. Because this is a P1 data-contract task that blocks Task 0153, the score is below the 90 promotion threshold.

### Dual score

| Dimension | Score | Reason |
|---|---:|---|
| `local_implementation` | 84 | Clear separation of extraction, normalization, diff, rendering, CLI parsing; strict parse/empty-root/flag guards; targeted tests and typecheck pass. |
| `runtime_enforcement` | 60 | The CLI succeeds while omitting helper-generated registry entries, omitting identifier/spread model lists, and admitting scan false positives. The emitted inventory is not a faithful runtime-registry snapshot. |
| **Overall** | **72** | Capped by the weaker contract/runtime dimension. |

## Scope audited

Read from the live filesystem:

- Task file, Completion Evidence, Changelog Draft, expert-polish section, and Review Trail.
- `bin/cli/provider-catalog.mjs`.
- `bin/cli/provider-catalog-diff.mjs`.
- `tests/unit/provider-catalog-diff.test.ts`.
- `package.json` scripts.
- `src/shared/constants/providers.ts` and split catalog sources.
- `open-sse/config/providerRegistry.ts`, `open-sse/config/providers/index.ts`, `open-sse/config/providers/shared.ts`, and representative registry modules (`openai`, `agy`).
- `scripts/check/check-provider-consistency.ts`.
- `src/app/api/providers/[id]/sync-models/route.ts` as the local model-delta reference.
- Existing callers: `bin/cli/commands/providers.mjs`, `bin/cli/commands/keys.mjs`, `bin/cli/commands/setup.mjs`, and `bin/cli/README.md`.
- The local static reference snapshot's catalog barrel, split catalog tree, runtime registry barrel, registry index, shared registry types, and representative registry entries.
- Existing review reports for lineage/style comparison.

## Findings and lineage

### F1 — NEW / BLOCKER: runtime extraction is incomplete and can emit false provider records

**Severity**: Critical for the inventory data contract. **Score impact**: -18.

**Evidence**:

- `bin/cli/provider-catalog.mjs:243-290` only accepts a top-level variable whose initializer is a direct object literal and whose object has a literal string `id`.
- The canonical runtime registry is composed in `open-sse/config/providers/index.ts` as the `REGISTRY` object, while many individual registry modules use helper calls such as `buildOpenAiCompatibleRegistryEntry({...})`, not direct object literals.
- The reference snapshot contains the same shape. The live reference inspection found **220** registry keys in the registry index but only **208** records from the recursive static scanner; **15** index entries were missed and **3** non-index IDs were falsely extracted from nested/model-support files.
- `bin/cli/provider-catalog.mjs:375-380` recursively scans every TypeScript file below `open-sse/config/providers/registry/`, which makes model/catalog support files eligible for provider extraction.
- The task Completion Evidence claims exact runtime fidelity (`REGISTRY real count 173 vs extractor registry 173 — 0 missing, 0 extra`, lines 265-267), but the reference-tree comparison demonstrates the implementation's general source adapter is not faithful to the canonical registry shape.

**Impact**: `diff` can classify a provider as `reference_only`, `fork_only`, or `changed` because the extractor missed or invented a record, not because the source inventories differ. Task 0153 consuming this JSON would inherit a false provider delta.

**Required path to 100**:

1. Extract the canonical `REGISTRY` map (or a deliberately bounded, semantically equivalent index adapter) rather than treating every nested registry `.ts` file as a provider source.
2. Resolve the supported helper-call/object-spread forms used by the canonical registry, or explicitly fail closed with an `unsupported source shape` diagnostic instead of emitting a partial inventory.
3. Add a fixture/reference parity test that compares extracted IDs against the canonical registry key set for both fork and reference roots, and asserts zero false positives.
4. Record the actual parity counts from a fresh run in Completion Evidence.

### F2 — NEW / HIGH: model extraction silently drops identifier/spread-based model catalogs

**Severity**: High. **Score impact**: -5.

**Evidence**:

- `bin/cli/provider-catalog.mjs:184-240` supports only literal arrays and direct `buildModels(...)` calls.
- Canonical registry entries such as `agy` use `models: [...AGY_PUBLIC_MODELS]`; the extractor returns an empty model list for this expression. Similar spread/identifier forms exist across the registry.
- The task explicitly requires runtime model metadata and separate model-only changes, but the implementation silently treats unsupported model expressions as `[]` rather than reporting them.

**Impact**: model additions/removals/metadata changes can disappear from `modelDiff`; a model-only upstream change may be incorrectly placed in `common` or appear unchanged.

**Required path to 100**: support the approved static expression forms (including known imported constants/spreads) through a bounded AST resolver, or mark the source unsupported and fail closed. Add a test for a spread/identifier model source and a model-only diff.

### F3 — NEW / HIGH: absolute source roots leak into successful JSON/Markdown provenance

**Severity**: High for the requested path/redaction contract. **Score impact**: -5.

**Evidence**:

- `bin/cli/provider-catalog.mjs:431-446` resolves the root for reading but preserves the caller-supplied `rootDir` as `displayRoot`.
- `bin/cli/provider-catalog.mjs:472-481` emits that value verbatim as `metadata.sourceRoot` and in the caveat.
- `bin/cli/provider-catalog-diff.mjs:267-283` passes CLI roots directly into the inventory loader.
- A live absolute-root probe produced the supplied `/home/.../references/diegosouzapw-omniroute` path in `sourceRoot` and the snapshot caveat.
- Task Evidence at lines 304-305 claims all success/failure paths are root-relative and has zero `/home/sephiroth` matches, but that assertion only holds for the relative-root invocations it recorded. It is stale/incomplete for the supported absolute-path input shape.

**Impact**: automation or Markdown reports can expose developer filesystem layout. It also weakens provenance portability and contradicts the task's explicit sanitized-path expectation.

**Required path to 100**: emit a normalized repo-relative display root when the root is inside the working repository/reference layout, otherwise emit a safe basename or a redacted placeholder while retaining the absolute path only internally. Add an absolute-root success test for JSON and Markdown and update evidence.

### F4 — NEW / MEDIUM: ordering uses locale-dependent comparison rather than a locale-independent lexicographic comparator

**Severity**: Medium. **Score impact**: -3.

**Evidence**:

- `provider-catalog.mjs:368`, `:405`, `:456`, `:512`, and `:646` use `localeCompare` without an explicit locale/options.
- The task contract requires lexicographically stable output across automation environments. The current tests prove repeated runs in one process/environment only (`tests/unit/provider-catalog-diff.test.ts:296-306`); they do not prove byte-stable ordering across locale/ICU settings.

**Impact**: non-ASCII, case-variant, or punctuation-bearing IDs can sort differently across environments, changing JSON/diff order and downstream snapshots.

**Required path to 100**: use a documented locale-independent comparator (for example code-unit comparison) for IDs/model IDs and add a fixture containing mixed-case/non-ASCII/punctuation IDs.

### F5 — EVIDENCE_GAP / stale claim: Completion Evidence overstates source parity and redaction coverage

**Severity**: Medium. **Score impact**: -4.

The evidence is strong for the exercised relative-root fork/reference commands: 23 targeted tests pass, typecheck passes, task-owned lint passes, and temporary malformed/empty-root probes fail closed. But the following claims are not portable or complete:

- Lines 265-267 claim exact extractor fidelity without testing helper-generated entries/spread models or reference parity against `REGISTRY` keys.
- Lines 304-305 claim no absolute-path leakage across every success/failure path, contradicted by absolute-root success output.
- Lines 288-292 describe a reference mutation check focused on selected trees; the unit test's reference fingerprint covers `src/shared/constants` but not the full runtime registry tree. The claim “reference tree was never written” is stronger than the automated assertion.

**Required path to 100**: refresh Completion Evidence from the corrected adapter, separate relative-root and absolute-root redaction evidence, and broaden the read-only fingerprint to every source tree the CLI scans.

### RESOLVED / VERIFIED safeguards

- Empty source root fails closed in strict inventory mode (`provider-catalog.mjs:327-335`, test `170-194`).
- Malformed TypeScript parse diagnostics fail closed (`provider-catalog.mjs:126-133`, `248-250`, test `196-225`).
- Missing/flag-shaped CLI values are rejected (`provider-catalog-diff.mjs:175-187`, `203-217`, test `251-263`).
- Failure output keeps stdout empty (`provider-catalog-diff.mjs:296-304`, test `265-282`).
- `sourceKind` is allowlisted and schema version is emitted (`provider-catalog.mjs:408-414`, `421-424`, `472-481`).
- Legacy callers still import the extractor seam (`providers.mjs`, `keys.mjs`, `setup.mjs`); the non-strict fallback remains available for those call shapes.
- No selected output fields include OAuth secrets, headers, credential defaults, or API keys. The runtime extractor intentionally selects a narrow safe field set (`provider-catalog.mjs:263-284`).
- Unit tests, targeted lint, and core typecheck passed in live verification.
- No source mutation was observed in the exercised list/diff modes; no network/provider calls or `:22000` access were used.

## Contract and compatibility audit

| Area | Result | Evidence / concern |
|---|---|---|
| CLI modes and exit codes | Partial pass | `list`, `diff`, help, invalid flags, missing roots work; semantic source-shape failures are not complete because unsupported constructs are silently skipped. |
| AST/source parsing | Fail for full contract | Strict syntax gate works, but AST extraction is a partial evaluator with false positives and silent omissions. |
| Empty/malformed/missing roots | Pass for tested cases | Empty, malformed, missing, and file roots fail with non-zero diagnostics. Runtime-source absence is intentionally accepted as catalog-only, which should remain documented. |
| Deterministic schema/order | Partial pass | Stable object shape and explicit sorting exist; `localeCompare` is environment-sensitive. |
| Provenance/static snapshot caveat | Partial pass | Relative roots are clear and caveated; absolute roots leak raw filesystem paths. Snapshot is correctly not called live upstream. |
| Alias preservation | Pass with current narrow record | Alias is retained and not used as inventory key; parity still needs canonical registry extraction. |
| stdout/stderr | Pass | Success payload on stdout, diagnostics/usage on stderr, failure stdout empty. |
| Path/secrets redaction | Partial/fail | Secret-shaped selected fields are omitted, but absolute successful provenance is not redacted. |
| Read-only guarantee | Partial pass | Targeted fingerprint proof passes; broaden to all scanned source trees. |
| Legacy extractor exports | Pass | Existing `loadAvailableProviders()` consumers and no-arg/string call shapes remain compatible according to live evidence. |
| Package scripts | Pass | `provider:diff` and `check:provider-diff` are registered and exercised. |
| Tests/sabotage | Partial pass | 23/23 targeted tests and three sabotage scenarios pass; missing parity/absolute-root/order portability sabotage leaves material gaps. |
| Task 0153 boundary | Pass | No Task 0153 implementation or file changes were made. |

## Verification commands and exit codes

All commands below were run as read-only verification in the task repository or through a delegated read-only verifier. No git, network/provider calls, `:22000`, tasklist-sync, changelog tooling, or source mutation was used.

| Command | Exit | Result |
|---|---:|---|
| `node --import tsx/esm --test tests/unit/provider-catalog-diff.test.ts` | 0 | 23 passed, 0 failed, 0 skipped. |
| `npm run typecheck:core` | 0 | No diagnostics. |
| `npx eslint --no-ignore bin/cli/provider-catalog.mjs bin/cli/provider-catalog-diff.mjs tests/unit/provider-catalog-diff.test.ts` | 0 | 0 errors/warnings. |
| `node bin/cli/provider-catalog-diff.mjs list` | 0 | Valid JSON; schema 1; fork catalog 242, registry 173, combined 242. |
| `node bin/cli/provider-catalog-diff.mjs diff --reference-root references/diegosouzapw-omniroute` | 0 | Valid JSON; fork 242, reference 300; buckets 5/63/176/61. |
| Temporary malformed-source probe | 0 probe result | Failed closed with sanitized relative source path; temporary directory removed. |
| Temporary empty-root probe | 0 probe result | Failed closed; non-strict fallback cross-check returned six fallback entries; temporary directory removed. |
| Full `npm run lint` | 1 (recorded worker evidence) | Seven errors reported outside Task 0152-owned Where files; task-owned no-new-error lint remains green. |

The successful exit code of the CLI smoke commands is not acceptance evidence for semantic parity; it is part of the finding because the command currently succeeds on a partial static reconstruction.

## Proof matrix

| Proof obligation | Status | Proof / remaining gap |
|---|---|---|
| Canonical fork catalog source | ✅ | Uses real `src/shared/constants/providers.ts` plus split catalog directory. |
| Canonical reference source | ✅ | Snapshot exists via `references -> ../legacy`; no live-upstream claim made. |
| Runtime registry completeness | ❌ | 220 canonical reference keys vs 208 scanned records; helper-generated entries missed and scan false positives observed. |
| Model metadata completeness | ❌ | Identifier/spread model arrays are silently returned as empty. |
| Strict malformed/empty/missing behavior | ✅ | Targeted tests and temporary probes pass. |
| Stable schema/version | ✅ | `schemaVersion: 1` and stable top-level contract present. |
| Stable cross-environment ordering | ⚠️ | Repeated same-environment determinism only; locale-independent ordering unproved. |
| Alias preservation | ✅ | Alias retained on records and tested. |
| Source provenance/static caveat | ⚠️ | Caveat is correct, but absolute roots are emitted verbatim. |
| stdout/stderr contract | ✅ | Failure stdout empty; diagnostics on stderr. |
| Secret redaction | ✅/⚠️ | Selected credential fields omitted; absolute paths still leak. |
| Read-only operation | ✅/⚠️ | Exercised modes did not mutate; full scanned-tree fingerprint is incomplete. |
| Legacy API/package compatibility | ✅ | Existing callers and scripts load/run under recorded evidence. |
| TDD/sabotage evidence | ⚠️ | Strong boundary sabotage; no semantic-parity or absolute-root sabotage. |
| Changelog lane | DEFERRED | Task correctly leaves append-only changelog publication to parent worker mode; no changelog tool was run. |

## Path to 100, in priority order

1. Replace recursive heuristic runtime discovery with a canonical `REGISTRY`-anchored AST adapter that handles the registry's actual helper/object-spread forms and cannot admit unrelated model/support objects.
2. Add bounded static resolution for model identifier/spread forms, or fail closed on unsupported shapes; never turn unknown expressions into an empty model list without an explicit provenance/unsupported marker.
3. Normalize/redact absolute roots in successful metadata and Markdown, then add absolute-root JSON/Markdown tests.
4. Replace default-locale `localeCompare` ordering with a locale-independent comparator and add cross-shape ordering fixtures.
5. Add fork/reference parity tests against canonical registry keys and model fixtures; refresh all counts and Completion Evidence from live outputs.
6. Expand read-only fingerprints to every catalog/runtime tree actually scanned, including the reference registry tree.
7. Update the task's Review Ledger with the corrected evidence, then request a fresh independent review. Until then, leave the task in `docs/tasks/02-doing/`.

## Move result and residual risks

- **Move result**: **Not moved**. The task remains at `docs/tasks/02-doing/0152-omniroute-provider-catalog-diff-pipeline.md` because score is 72 (<90).
- **Minimal fixes applied by reviewer**: none; BUILDER_CONTEXT policy permits reviewer-owned fixes only when the initial score is at least 90. No source implementation was changed.
- **Residual risks**: Task 0153 must not consume the current counts/diffs as authoritative. A partial extractor can generate false provider/model deltas, and absolute-root reports can disclose local filesystem layout. The static reference remains a snapshot and provides no live-provider freshness signal.

## Review Ledger entry

The task's compact Review Trail was updated with this report link, score, findings, and explicit path-to-100. The original Completion Evidence and Changelog Draft remain lineage inputs, not acceptance overrides.
