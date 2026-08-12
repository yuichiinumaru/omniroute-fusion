# Task 0153 Review — OmniRoute Provider Absorption Triage

## Review lineage and scope

- **Task**: `docs/tasks/02-doing/0153-omniroute-provider-absorption-triage.md`
- **Review mode**: `BUILDER_CONTEXT`
- **Review date**: 2026-08-11
- **Review basis**: live task/evidence, live Task 0152 final JSON contract and final re-review, current implementation/tests/package scripts, and required code-quality/tsjs, verification-gate, sabotage-gate, and review-workflow rules.
- **Reviewer delegation**: none. No subagent, reviewer, network, `:22000`, git, tasklist-sync, changelog tooling, profile/reference writes, or Task 0159 work was used.
- **Prior Task 0152 constraint**: the command consumes `schemaVersion: 1` normalized JSON; it must not scrape Markdown or re-normalize provider source. Task 0152's current live reference totals are 242 fork / 299 reference / 5 fork-only / 62 reference-only / 172 common / 65 changed.

## Score and verdict

### **Score: 82/100 — REJECTED**

Per the operator rule, scores below 90 remain in `docs/tasks/02-doing/`. The implementation is substantially present and its targeted suite is green, but the live review found security and evidence-contract gaps that prevent acceptance or lane promotion.

### Score breakdown

| Axis | Score | Basis |
|---|---:|---|
| Task 0152 contract consumption and CLI wiring | 18/20 | `validateDiff()` requires schema version, provenance root, caveat, and four canonical buckets; package scripts are registered. The implementation consumes normalized JSON and does not parse provider sources. |
| Classification taxonomy and semantics | 18/25 | Metadata/model/provider add/remove/executor/format/alias/unresolved paths are covered; OAuth/auth changes reach `security-sensitive` and carry `auth-change`. However, the declared `auth-change` classification is unreachable, security rows do not carry a `security-sensitive` tag, and there is no explicit output classification for authentication versus generic security. |
| Provenance, evidence, and handoff usability | 13/20 | Every row has JSON evidence pointers, risk, confidence, action, tags, IDs, and snapshot/source-root provenance. The output drops Task 0152 `sourceFile` paths, so it does not identify the concrete files/symbols requiring inspection or preserve alias source paths as required. |
| Security, redaction, and fail-closed behavior | 13/20 | Forbidden mutation flags, malformed JSON, wrong schema, and token-shaped values are tested. A live adversarial probe showed the required `metadata.snapshotCaveat` can leak a Bearer token because redaction is applied to a clone after `validateDiff()` has copied the original caveat into the output path. |
| Determinism, tests, sabotage, and verification | 13/15 | 33/33 targeted tests, typecheck, owned lint, real smoke, and recorded sabotage evidence pass. This axis is capped below full credit because the tests do not cover required-field metadata redaction, source-file evidence preservation, explicit auth/security tags, or the stale Markdown interpolation defect. |
| **Overall** | **82/100** | Security leak + evidence loss + incomplete live-task exit state require remediation. |

## Findings

### F1 — Required metadata redaction leaks token-shaped snapshot caveat (HIGH, NEW)

`bin/cli/provider-absorption.mjs:453-466, 518-527` validates the input and stores `validated.snapshotCaveat` from the original object before cloning/redacting `diff`. The returned report then emits that original value at `metadata.snapshotCaveat`. A read-only probe supplied `metadata.snapshotCaveat = "snapshot Bearer super-secret-token-12345"`; `buildReport()` returned the literal token in `report.metadata.snapshotCaveat` while reporting redaction counters. This violates the task's no raw tokens/auth material requirement and means the redaction proof is incomplete for a required field.

**Required correction**: validate structural shape without retaining sensitive values, redact the cloned input before extracting all report metadata, and test secrets in required metadata fields (`snapshotCaveat`, `referenceRoot`, and any other emitted metadata) for both JSON and Markdown. The emitted caveat must remain useful but sanitized.

### F2 — Source-file evidence is discarded from every output row (HIGH, NEW)

Task 0153 requires evidence paths and the files/symbols requiring human inspection; alias changes must retain old/new IDs and the source path. Task 0152 input rows carry `catalog.sourceFile` and `registry.sourceFile` (for example `tmp/agent-work/0153/real-0152-diff.json:34-72` and the live `agy` row). `buildReport()` only emits JSON-pointer paths such as `$.classifications.changed[?].registryDiff.authType` and `provenance.sourceRoots`; it does not carry source-file evidence into `differences[*]`. `formatTriageMarkdown()` consequently cannot show the concrete source files. The alias test only checks a JSON-pointer path, not the required source path.

**Required correction**: retain redacted, repo-relative source-file evidence per row (for example `evidenceFiles` or a documented extension of `evidencePaths`) for catalog and registry sides, preserving old/new IDs and their source paths for alias changes. Add fixture and real-smoke assertions for source-file presence and Markdown rendering.

### F3 — Authentication/security taxonomy is only partially explicit (MEDIUM, NEW)

The implementation declares `auth-change` as a classification (`CLASSIFICATIONS:28`) but `classifyChangedRow()` routes every `authType` delta to `security-sensitive` (`298-305`), leaving `byClassification.auth-change` permanently zero in the live smoke. OAuth is correctly high-risk and carries an `auth-change` tag, but security rows do not carry a `security-sensitive` tag, and plain `baseUrl` changes have only `baseUrl-change`. This makes downstream consumers depend on an implicit classification/tag convention rather than a complete taxonomy, contrary to the requested explicit auth/OAuth and security-sensitive tags.

**Required correction**: document and enforce the chosen taxonomy. At minimum, every auth/OAuth row must carry `auth-change` and `security-sensitive` tags, every security-sensitive row must carry `security-sensitive`, and tests must assert OAuth, non-OAuth authType, baseUrl, and combined auth+executor cases. If `auth-change` is intended as a classification rather than a tag, make it reachable under an explicit precedence rule and update the contract accordingly.

### F4 — Stale provenance does not reclassify all rows, and Markdown has an unresolved interpolation defect (MEDIUM, NEW)

`classifyChangedRow()` applies `stale-snapshot` after content classification (`349-369`), but `classifyBucketRow()` only lowers confidence for `reference_only`/`fork_only` rows and leaves them as provider candidates. Lowering confidence is allowed by the task, but the taxonomy is inconsistent and the stale/unresolved contract is not documented per bucket. More concretely, `formatTriageMarkdown()` line 580 contains a non-template string (`"... source is ${meta.stale.maxAgeDays}-day cap."`), so missing/unparseable `generatedAt` renders the literal placeholder. This is a deterministic report correctness defect.

**Required correction**: choose and document one stale policy for every bucket (reclassify or explicitly lower confidence), fix the interpolation, and add Markdown assertions for missing and invalid `generatedAt`.

### F5 — Live task is not marked complete for review (MEDIUM, EVIDENCE_GAP)

The task's Exit Conditions remain unchecked at `docs/tasks/02-doing/0153-omniroute-provider-absorption-triage.md:76-94`, and all Details subtasks remain unchecked at `:100-117`, despite the evidence block claiming completion. `docs/tasks/AGENTS.md` requires all subtasks and Exit Conditions to be `[x]` before `03-review/`. This is a legal lane/evidence inconsistency, not a reason to fabricate checkboxes during review.

**Required correction**: after the implementation and evidence are corrected, reconcile every completed subtask and Exit Condition against fresh command output; leave changelog items in the parent-owned draft state as directed by the operator, but make that exception explicit in the ledger/evidence.

## Proof matrix

| Obligation | Status | Live evidence / gap |
|---|---|---|
| Consumes normalized Task 0152 JSON only | PASS | `validateDiff()` and `buildReport()` consume the four Task 0152 buckets; no source scraping in `provider-absorption.mjs`. |
| Metadata-only classification | PASS | Targeted test passes; live histogram has 8. |
| Model-only classification separate from provider identity | PASS | Targeted test passes; live histogram has 34. |
| Provider addition/removal candidates require manual review | PASS | Targeted tests pass; live histogram 62/5; no auto-apply action. |
| Executor and target-format high-risk | PASS | Targeted tests pass; live histogram 3. |
| OAuth/auth changes high-risk | PARTIAL | OAuth test passes and emits `auth-change`; explicit security-sensitive tag/taxonomy is missing. |
| Security-sensitive changes | PARTIAL | `authType`/`baseUrl` route high-risk, but required-field redaction leak and incomplete security tags remain. |
| Alias old/new IDs and source path | PARTIAL | IDs and JSON-pointer evidence pass; concrete `sourceFile` path is discarded. |
| Stale/unresolved provenance | PARTIAL | Confidence lowers and stale changed rows reclassify; bucket policy is inconsistent and Markdown has a literal interpolation. |
| Risk/confidence/evidence/action on every row | PASS/PARTIAL | Live probe: 132 rows, 0 missing core fields; evidence is only abstract JSON pointers, not concrete source files. |
| Deterministic JSON/Markdown | PARTIAL | Targeted normalization test and smoke pass apart from generated timestamp; stale Markdown branch defect remains. |
| Secret/token/cookie redaction | FAIL | Targeted fixture passes for nested diff values, but required `metadata.snapshotCaveat` Bearer probe leaks the token. |
| Malformed/forbidden flags fail closed | PASS | 33/33 suite covers malformed, wrong-shape, wrong-version, missing-value, and forbidden flags. |
| Read-only behavior | PASS (scoped) | Recorded 9-root fingerprint and forbidden-flag proof; no source mutation observed in this review. |
| TDD fail→pass / sabotage proof | PARTIAL | RED/GREEN and six-scenario evidence are recorded; no sabotage scenario covers required metadata redaction, source evidence, or stale Markdown. |
| Real fork/reference smoke | PASS | 132 differences; histogram `8/34/62/5/3/16/1/3`; static snapshot caveat present; 0 rows missing core contract fields. |
| Current scripts | PASS | `provider:absorption` and `check:provider-absorption` are registered in `package.json:210-211`. |
| Repository-wide lint | EXTERNAL/UNVERIFIED | `npm run lint` exceeded the 120-second review timeout; owned-file ESLint passed. Do not claim repository-wide lint pass from the timeout. |

## Verification commands

| Command | Result |
|---|---|
| `node --import tsx/esm --test tests/unit/provider-absorption-triage.test.ts` | PASS, 33/33, 0 failures. |
| `npm run typecheck:core` | PASS, exit 0. |
| `npx eslint --no-ignore bin/cli/provider-absorption.mjs tests/unit/provider-absorption-triage.test.ts` | PASS, 0 errors/warnings. |
| `node bin/cli/provider-absorption.mjs --diff-json tmp/agent-work/0153/real-0152-diff.json` | PASS, 132 differences; static snapshot caveat. |
| Same CLI with `--format markdown` | PASS, non-empty output. |
| Read-only adversarial probe for required metadata Bearer value | FAIL: token present in returned `metadata.snapshotCaveat`. |
| `npm run lint` | Timed out at 120 seconds; no pass claim. |

## Path to 100

1. Fix redaction ordering so every emitted metadata value, especially `snapshotCaveat`, is sanitized before report construction; add required-field JSON/Markdown regression tests and a sabotage test.
2. Preserve redacted Task 0152 `sourceFile` values as concrete per-row evidence, including both sides for alias IDs; test fixture and real smoke output.
3. Make auth/OAuth and security-sensitive taxonomy explicit and stable: add required `security-sensitive` tags to security rows, document whether `auth-change` is a tag or classification, and cover all precedence combinations.
4. Fix stale-provenance Markdown interpolation and define/test the stale policy for presence-only bucket rows.
5. Reconcile task subtasks/Exit Conditions and Completion Evidence with fresh live output; correct the evidence count wording (`32` vs `33` appears in lines 224/219) and retain the parent-owned changelog exception.
6. Re-run targeted tests, `typecheck:core`, owned lint, real JSON/Markdown smoke, metadata/source-evidence redaction probes, and a bounded repository lint command; update the Review Ledger. Only then request the next independent review.

## Lane result

- **Move**: not performed.
- **Current lane**: `docs/tasks/02-doing/0153-omniroute-provider-absorption-triage.md`.
- **Reason**: score 82 is below the operator's 90 promotion threshold; no path-to-100 fixer or reviewer was launched, per instruction.
