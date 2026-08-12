# Final Delta Re-Review: Task 0153 — OmniRoute Provider Absorption Triage

## Review lineage and scope

- **Task**: `docs/tasks/02-doing/0153-omniroute-provider-absorption-triage.md`
- **Prior report**: `docs/reports/review/20260811-task-0153-omniroute-provider-absorption-triage-review.md`
- **Prior score**: 82/100 — not reused as the current score.
- **Review type**: delta-aware filesystem re-review after the builder-expert remediation pass.
- **Review date**: 2026-08-11
- **Mode**: `BUILDER_CONTEXT`
- **Delegation**: none. No subagent, sub-reviewer, fixer, `continue`, git, network, `:22000`, Task 0159 work, tasklist-sync, changelog tooling, or profile/reference writes were used.
- **Source contract**: Task 0152 normalized JSON `schemaVersion: 1` only; current real smoke input reports 242 fork / 299 reference / 5 fork-only / 62 reference-only / 172 common / 65 changed.

## Final score and verdict

### **Score: 86/100 — REJECTED**

The expert corrections for the original F1–F5 findings are present and materially verified. However, a new adversarial probe found that the claimed repo-relative evidence guarantee is not implemented: absolute local source-file paths and absolute source roots are emitted unchanged into JSON and Markdown. This is a provenance/privacy boundary failure in the task's required handoff output, so the operator threshold is not met. The task remains in `02-doing`.

## Delta closure matrix

| Prior finding | Delta status | Current evidence | Residual |
|---|---|---|---|
| F1 required metadata redaction leak | **RESOLVED** | `buildReport()` validates, clones/scrubs metadata, then revalidates the sanitized clone (`bin/cli/provider-absorption.mjs:522-560`); 40-test F1 Bearer and URL-credentials tests pass; independent probe found no token leak in `snapshotCaveat` or `referenceRoot`. | Absolute paths remain a separate NEW finding below. |
| F2 source-file evidence loss | **RESOLVED / PARTIAL SECURITY HARDENING** | `evidenceFiles` now appears on all live rows; 132 Markdown evidence sections and 127 unique source paths observed; alias/source-file regression tests pass. | The evidence is not actually repo-relative or path-normalized when input contains absolute paths. See NEW F6. |
| F3 auth/security taxonomy | **RESOLVED** | Security rows carry `security-sensitive`; auth rows additionally carry `auth-change`; baseUrl-only rows carry `baseUrl-change`; F3 tests pass; live histogram intentionally reports `auth-change: 0` as a classification. |
| F4 stale policy/interpolation | **RESOLVED** | Changed and presence-only rows reclassify to `stale-snapshot`; stale Markdown contains the numeric cap and no literal `${meta.stale.maxAgeDays}`; F4 tests pass. |
| F5 task evidence reconciliation | **RESOLVED for satisfied exits** | Exit Conditions and Details subtasks are checked; changelog remains unchecked with explicit parent-owned draft exception; current evidence reports 40/40. | A stale “32 unit tests” file-inventory sentence and a typo in the fixer verification command remain documentation drift, noted as a minor evidence-quality issue. |

## Score breakdown

| Axis | Score | Basis |
|---|---:|---|
| Task 0152 contract consumption and CLI wiring | 18/20 | Still consumes normalized JSON, validates schema/buckets, and package scripts remain registered. |
| Classification taxonomy and semantics | 23/25 | Metadata/model/provider add/remove/executor/format/alias/unresolved, auth/OAuth, security tags, and stale policy are now explicit and tested. |
| Provenance, evidence, and task handoff | 16/20 | Concrete `evidenceFiles` are present for every live row and aliases retain IDs/source paths, but absolute paths are emitted unchanged and therefore violate the claimed repo-relative boundary. |
| Security, redaction, and fail-closed behavior | 16/20 | Required metadata token redaction is fixed; malformed/schema/forbidden inputs remain fail-closed. Absolute path leakage is a privacy/security defect in emitted provenance. |
| Determinism, tests, sabotage, and verification | 13/15 | 40/40 targeted tests, registered package check, typecheck, owned lint, real JSON/Markdown smoke, and ten-scenario recorded sabotage matrix pass. Coverage does not include absolute source-file/root path normalization or a sabotage test for it. |
| **Overall** | **86/100** | One NEW high-value output-boundary defect and minor evidence drift prevent approval. |

## NEW finding

### F6 — Absolute source roots and evidence files leak into report output (HIGH, NEW)

The expert closure claims that `evidenceFiles` are “redacted repo-relative source paths” (`docs/tasks/02-doing/0153-omniroute-provider-absorption-triage.md:203, 338`), but the implementation only applies token-pattern redaction in `collectSourceFiles()` (`bin/cli/provider-absorption.mjs:226-251`). It does not normalize or reject absolute paths.

A fresh read-only probe constructed a valid Task 0152-shaped diff with:

- `metadata.forkRoot = "/home/sephiroth/work/omniroute"`
- `metadata.referenceRoot = "/tmp/reference"`
- fork source files `/home/sephiroth/src/providers.ts` and `/tmp/registry.ts`

The resulting report emitted those absolute values in `metadata.forkRoot`, `metadata.referenceRoot`, `differences[0].evidenceFiles`, and Markdown. The probe observed:

```json
{
  "absoluteMetadata": [
    "/home/sephiroth/work/omniroute",
    "/tmp/reference"
  ],
  "absoluteEvidence": [
    "/home/sephiroth/src/providers.ts",
    "/tmp/registry.ts"
  ],
  "markdownLeaks": true
}
```

This is a direct mismatch with the task's handoff requirement to show inspectable source paths without leaking machine-local filesystem details, and with the expert's own closure claim that evidence paths are repo-relative. It also reopens the path-redaction class previously handled by Task 0152's `displayRoot` behavior.

**Required correction**:

1. Normalize `forkRoot` and `referenceRoot` to safe display roots before report emission, using the Task 0152 convention (`.` / repo-relative / `[external]/…`) rather than retaining absolute host paths.
2. Normalize each `sourceFile` relative to its corresponding source root when possible; reject or map external absolute paths to a deterministic `[external]/…` representation without exposing the host prefix.
3. Add JSON and Markdown regression tests for absolute fork/reference roots and absolute fork/reference `sourceFile` values.
4. Add a sabotage test that disables path normalization and fails on `/home/`, `/tmp/`, drive-letter paths, or backslash absolute paths.
5. Refresh the Closure Matrix and Completion Evidence with the fresh path-redaction output before requesting another review.

## Additional evidence-quality note

The live task is materially reconciled, but `docs/tasks/02-doing/0153-omniroute-provider-absorption-triage.md:234` still says the created test file contains “32 unit tests” while the current suite has 40 tests. The fixer verification note at `:342` also spells the test path as `tests/unit-provider-absorption-triage.test.ts`, whereas the actual path and successful command are `tests/unit/provider-absorption-triage.test.ts`. These do not independently block the implementation, but they should be corrected before a final perfect score.

## Proof matrix

| Obligation | Status | Current proof |
|---|---|---|
| Consumes normalized Task 0152 JSON only | PASS | `validateDiff()` + four canonical classification buckets; no source parsing in 0153. |
| Metadata/model/provider add/remove classification | PASS | 40/40 targeted tests; real histogram `8/34/62/5`. |
| Executor/format high-risk/manual review | PASS | Targeted tests; live histogram 3. |
| Auth/OAuth and security-sensitive taxonomy | PASS | F3 regression tests; auth rows use `security-sensitive` classification plus `auth-change` tag. |
| Alias IDs and concrete source evidence | PASS/PARTIAL | IDs, `evidenceFiles`, and alias tests pass; absolute path normalization remains missing. |
| Stale/unresolved provenance | PASS | Uniform stale reclassification and corrected Markdown interpolation. |
| Risk/confidence/evidence/action on every row | PASS | Live 132-row contract probe found no missing required row fields and every row had non-empty evidence files. |
| Deterministic JSON/Markdown | PASS/PARTIAL | Live JSON/Markdown outputs are stable in the normal relative-root smoke; absolute-root output leaks host paths. |
| Secret/token/cookie redaction | PASS for token patterns | Bearer-in-caveat and URL-credentials tests/probes pass; path privacy is separately failing. |
| Malformed/forbidden flags | PASS | 40-test suite and registered `check:provider-absorption` pass. |
| Read-only behavior | PASS (scoped) | Existing 9-root fingerprint proof and current CLI smoke do not mutate source trees. |
| TDD/sabotage proof | PASS/PARTIAL | 40/40 and ten recorded scenarios; no absolute-path sabotage scenario. |
| Real fork/reference smoke | PASS | 132 rows, static snapshot caveat, all rows have evidence files, Markdown has 132 evidence sections, no auto-apply action. |
| Typecheck | PASS | `npm run typecheck:core`, exit 0. |
| Task-owned lint | PASS | ESLint owned files, 0 errors/warnings. |
| Full lint baseline | PASS as documented baseline | `npm run lint` exits non-zero with 7 pre-existing errors and 4141 warnings, all outside task-owned files; no task-owned error observed. |
| Lane/evidence readiness | PARTIAL | Subtasks and satisfied exits are checked; changelog exception is documented; minor stale test-count/path wording remains. |

## Verification commands and results

| Command/probe | Result |
|---|---|
| `node --import tsx/esm --test tests/unit/provider-absorption-triage.test.ts` | PASS — 40/40, 0 failures. |
| `npm run check:provider-absorption` | PASS — 40/40, 0 failures. |
| `npm run typecheck:core` | PASS — exit 0. |
| `npx eslint --no-ignore bin/cli/provider-absorption.mjs tests/unit/provider-absorption-triage.test.ts` | PASS — 0 errors/warnings. |
| Real JSON smoke | PASS — 132 differences; all rows carry non-empty `evidenceFiles`; histogram preserved. |
| Real Markdown smoke | PASS — 132 `Evidence Files` sections, static snapshot caveat, no literal stale placeholder, no auto-apply action. |
| Required metadata Bearer/URL-credential probes | PASS — no token leakage after F1 fix. |
| Stale unresolved/bucket probes | PASS — stale reclassification and interpolated cap verified. |
| Absolute-root/source-file probe | **FAIL** — host-local paths emitted in JSON and Markdown. |
| `npm run lint` | Exit non-zero baseline: 7 errors / 4141 warnings outside task-owned files; no task-owned error. |

## Path to 100

1. Implement deterministic safe path normalization for metadata roots and every `evidenceFiles` entry; preserve relative repository paths while mapping external absolute paths to a non-host-specific form.
2. Add fixture, JSON, Markdown, and sabotage tests for absolute Unix paths, `/tmp` paths, Windows drive-letter paths, and backslash paths in both metadata and source-file evidence.
3. Re-run all 40 targeted tests, the registered package check, core typecheck, owned lint, real JSON/Markdown smoke, read-only fingerprint, and path-leak probes.
4. Correct stale task evidence wording (“32 unit tests” → 40 and the malformed test path) and refresh the Closure Matrix with the path-normalization proof.
5. Request a fresh independent delta-aware review. Until then, keep the task in `02-doing`.

## Move result

- **Move performed**: **No**.
- **Current path**: `docs/tasks/02-doing/0153-omniroute-provider-absorption-triage.md`.
- **Reason**: 86/100 is below the operator's 90-point approval threshold; the new absolute-path leakage is unresolved.
