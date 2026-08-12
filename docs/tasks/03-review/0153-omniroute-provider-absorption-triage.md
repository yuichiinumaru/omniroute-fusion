# Task 0153: Build safe provider absorption triage reports

> **Status**: `[~]` In progress — builder wave assigned (`builders`)
> **Priority**: 🟡 P1
> **Type**: `feature`
> **Origin**: EPIC-28 + operator request for routine upstream-provider absorption analysis.
> **Blocks**: —
> **Depends on**: Task 0152 stable provider catalog/registry diff contract.
> **Parallelism**: `serializable` — consumes Task 0152 output; must not duplicate or fork its source normalization logic.
> **Review routing**: independent + provider/security/task-architecture review

---

## Objective

Create a read-only absorption-triage command that consumes the normalized
fork/reference diff from Task 0152 and classifies changes into actionable
categories: metadata-only, model-only, provider-addition candidate,
provider-removal candidate, executor/format change, authentication/OAuth change,
security-sensitive change, and unresolved/manual-review. The output MUST be
task-ready evidence, not an automatic code modification or an assertion that an
upstream provider is safe to absorb.

A worker reading only this section can determine completion when a routine run
produces stable JSON and Markdown showing what differs, why it matters, which
files/symbols require human inspection, and which candidates can be turned into
separate implementation tasks without silently changing the fork.

## Background Context

### O que já existe:

- Task 0152 will provide canonical provider/catalog/runtime diff output.
- `scripts/check/check-provider-consistency.ts` demonstrates diff + allowlist
  behavior within the fork.
- `src/lib/pricingSync.ts` and `src/lib/modelsDevSync.ts` demonstrate explicit
  upstream-to-local mapping and dry-run transformations.
- `src/lib/providerModels/managedModelImport.ts` distinguishes merge and sync
  semantics for model data.
- Existing task governance requires implementation tasks to carry evidence,
  dependencies, and explicit ownership rather than speculative provider ports.

### O que está faltando / quebrado:

- A raw provider diff does not indicate whether a change is safe metadata or a
  high-risk auth/executor behavior change.
- No routine report identifies upstream-only providers/models as candidates for
  task creation with a reason and evidence path.
- No report distinguishes static snapshot findings from verified live upstream
  facts.
- No guard prevents a future absorption helper from copying code or credentials
  as a side effect of comparison.

## Test Requirements

- An upstream-only provider with only catalog metadata MUST be classified as a
  candidate requiring manual review, never auto-applied.
- A provider with executor, target-format, OAuth, or credential changes MUST be
  classified as high-risk/manual-review even if its ID is common.
- Model-only additions/removals MUST be separated from provider identity changes.
- Alias changes MUST retain old/new IDs and the source path that produced them.
- Missing or stale reference provenance MUST lower confidence or mark the result
  unresolved rather than treating it as current upstream truth.
- The report MUST include an explicit suggested next action: ignore, inspect,
  create implementation task, create security/auth review, or update allowlist.
- Output MUST be deterministic and contain no raw secrets, auth tokens, cookies,
  or unbounded source dumps.
- Default operation MUST be read-only; `--apply`, file copy, registry mutation,
  task creation, and changelog mutation are forbidden in this task.

## Exit Conditions (GDD/TDD)

> OmniRoute npm matrix — see `docs/tasks/OMNIROUTE-CREATE-TASKS-EXITS.md`.
> Do not require cargo check/test for this stack.

- [x] A canonical absorption-triage CLI consumes Task 0152 JSON rather than
  scraping rendered Markdown or reparsing provider sources independently.
- [x] The classification schema documents risk, confidence, evidence paths,
  suggested action, and snapshot provenance for every difference (plus
  `evidenceFiles` for concrete source-file provenance).
- [x] JSON and Markdown reports are stable and suitable for attaching to a
  research/task handoff without exposing secrets or modifying repository source.
- [x] TDD tests cover metadata-only, model-only, provider-only, executor,
  format, OAuth, alias, stale-snapshot, unresolved, and malformed-diff cases;
  failing-then-passing output is captured.
- [x] `node --import tsx/esm --test tests/unit/provider-absorption-triage.test.ts` passes with 0 failures.
- [x] A smoke run using the real fork/reference diff produces a non-empty report
  and explicitly states that the reference is a static snapshot.
- [x] `npm run typecheck:core` passes without errors.
- [x] `npm run lint` passes without new errors (task-owned scoped lint: 0 errors/0
  warnings; full-lint baseline: 7 pre-existing errors in `visual-reference/...`,
  none in task-owned files — follows Task 0152's precedent: scoped lint is the
  gate, full-lint baseline is documented).
- [x] Hard Rule #18 is satisfied through captured TDD fail→pass evidence, or a
  documented read-only runtime proof where unit isolation is impossible.
- [ ] An append-only `.changelog/` entry is created through manage-changelog and
  `rebuild.sh build` is run; root `CHANGELOG.md` is not hand-edited. (Changelog
  Draft preserved as parent-owned; parent publishes on wave close.)
- [x] Completion Evidence is filled with real command output before review.

## Details

### What

Subtasks:

- [x] **Ler código existente**: read Task 0152's final output contract,
  `check-provider-consistency.ts`, pricing/models sync transforms,
  `managedModelImport.ts`, task-governance workflow, and provider security
  metadata before modifying anything.
- [x] Define the risk taxonomy and confidence rules with examples from current
  fork/reference differences.
- [x] Add failing fixture-driven tests that use canonical normalized diff shape,
  including auth/executor/security-sensitive changes.
- [x] Implement JSON classification first, then Markdown rendering as a view.
- [x] Emit task-ready candidate records with evidence paths and explicit manual
  review gates, but no task-file mutation.
- [x] Add CLI/package entrypoint and a documented routine invocation.
- [x] Run real fork/reference smoke and verify read-only behavior.
- [x] **Refactoring pass**: keep classification rules data-driven and avoid
  provider-name special cases unless an evidence-backed allowlist explains them.
- [x] **Verificação de regressão**: targeted tests, typecheck, lint, and smoke.

### Where

| Arquivo | Propósito |
|---------|-----------|
| `bin/cli/provider-catalog-diff.mjs` | Ler — consume Task 0152 JSON contract. |
| `bin/cli/provider-absorption.mjs` | Criar — classification/report CLI. |
| `scripts/check/check-provider-consistency.ts` | Ler — allowlist/stale-enforcement pattern. |
| `src/lib/pricingSync.ts` | Ler — explicit mapping/dry-run pattern. |
| `src/lib/modelsDevSync.ts` | Ler — upstream mapping and capability classification pattern. |
| `src/lib/providerModels/managedModelImport.ts` | Ler — merge/sync semantics. |
| `tests/unit/provider-absorption-triage.test.ts` | Criar — risk taxonomy and report contract tests. |
| `package.json` | Modificar — register routine absorption-report command. |
| `docs/tasks/000-template.md` | Ler — task-ready evidence expectations; do not modify. |
| `docs/tasks/AGENTS.md` | Ler — lane/task ownership; do not modify. |

### How

1. Treat Task 0152 JSON as the only source of provider facts for this command.
2. Apply explicit field-level rules: metadata, model, executor/format,
   authentication, security, alias, and provenance.
3. Assign confidence based on source completeness and snapshot freshness, not on
   the number of matching fields.
4. Generate a compact report with candidate IDs, evidence paths, risks, and next
   actions; do not copy source code or create tasks automatically.
5. Validate stable output, no-write behavior, and task-handoff usability.

### Why

Provider absorption is not a blind synchronization problem. A new provider may
require OAuth, a custom executor, public credential handling, model aliases, or
security review. The triage layer turns raw catalog differences into safe work
selection while preserving human ownership of implementation and task creation.

## Parallelism / file ownership

| Class | Detail |
|-------|--------|
| **parallel-safe** | Can run beside provider implementation tasks if it only reads their source. |
| **serializable** | Must follow Task 0152's schema review; do not introduce a second normalization contract. |
| **Collision** | `bin/cli/provider-catalog-diff.mjs`, `package.json`, and provider pipeline tests may be shared with 0152; coordinate edits. |

## ⛔ Anti-Hallucination Guardrails

> [!CAUTION]
> Never classify an upstream-only provider as safe to absorb solely because it
> appears in the reference catalog. Never auto-create tasks, copy code, mutate
> registries, fetch credentials, or write generated task/changelog surfaces.

> [!IMPORTANT]
> Read every file in the Where table before writing. Every report row must carry
> source provenance and evidence paths. Static reference data must be labeled as
> snapshot evidence; unresolved source shapes must remain unresolved.

## 🛡️ Compliance Checklist (Leis Primárias do AGENTS.md)

- [x] **Doc Accuracy**: report fields, commands, and suggested actions are backed by implementation/tests; every classification has a regression test.
- [x] **Zod Validation**: N/A for CLI-only input (no new API surface); all CLI options validated explicitly via `parseArgs` + `validateDiff`.
- [x] **Security**: zero provider secrets/auth material in report output or fixtures; explicit JWT/bearer/urlCredentials/apiKey/cookie redaction pass and per-row `[REDACTED]` with `withheldValueEmissions` counter.
- [x] **Error Sanitization**: malformed-source diagnostics are bounded and sanitized; the redaction test asserts no leakage of `sk-secret-token-abc123`, JWT prefix/signature, or `api.example.com`.
- [x] **No Raw SQL**: no database changes.
- [x] **Archive Protocol**: no deletion; legacy `tmp/opencode/*` copy replaced by workspace `tmp/agent-work/0153/real-0152-diff.json` for read-only smoke.

## 📋 Completion Evidence (preenchido pelo agente executor)

### TDD fail→pass evidence (Hard Rule #18)

- **RED phase (initial)**: 1 failing test (`ERR_MODULE_NOT_FOUND: bin/cli/provider-absorption.mjs`) — captured at the very first test run before any implementation existed.
- **GREEN phase (final)**: 43/43 targeted tests pass; exit code 0; zero failures, zero cancellations.

### Final verification (2026-08-11, post-reviewer-fix F1–F4)

- **Targeted tests**: `node --import tsx/esm --test tests/unit/provider-absorption-triage.test.ts` — **43/43 passed**, exit 0.
- **Typecheck**: `npm run typecheck:core` — exit 0, 0 errors.
- **Task-owned lint**: `npx eslint --no-ignore bin/cli/provider-absorption.mjs tests/unit/provider-absorption-triage.test.ts` — exit 0, 0 errors/0 warnings.
- **Full lint baseline**: `npm run lint` reports 7 pre-existing errors in `visual-reference/...` files (PrismTree.tsx, execution-stream.tsx, usage-analytics.tsx); **zero task-owned files** appear in that list. Follows Task 0152's precedent: scoped lint is the gate, full-lint baseline is documented.
- **Real fork/reference smoke**:
  - 0152 diff generation: `node bin/cli/provider-catalog-diff.mjs diff --reference-root references/diegosouzapw-omniroute --format json > tmp/agent-work/0153/real-0152-diff.json` — exit 0, forkTotal 242, referenceTotal 299, forkOnly 5, referenceOnly 62, common 172, changed 65.
  - 0153 absorption: `node bin/cli/provider-absorption.mjs --diff-json tmp/agent-work/0153/real-0152-diff.json` — exit 0, schemaVersion 1, totalDifferences 132, byClassification `{ metadata-only: 8, model-only: 34, provider-addition-candidate: 62, provider-removal-candidate: 5, executor-format-change: 3, auth-change: 0, security-sensitive: 16, alias-change: 1, stale-snapshot: 0, unresolved-manual-review: 3 }`, byRisk `{ low: 42, medium: 15, high: 75 }`, snapshotCaveat includes "static snapshot, not live upstream". `auth-change: 0` is correct and intended — auth deltas classify as `security-sensitive` and carry `auth-change` as a **tag**, not a standalone classification.
  - 0153 absorption (Markdown): `node bin/cli/provider-absorption.mjs --diff-json tmp/agent-work/0153/real-0152-diff.json --format markdown` — exit 0; 132 rows each render an `Evidence Files` section (F2); no literal `${}` placeholder in the stale-provenance line (F4).
  - Real bucket parity vs 0152: `fork_only=5 → provider-removal-candidate=5`, `reference_only=62 → provider-addition-candidate=62`, `changed=65 → 8+34+3+16+1+3=65`. Every one of the 132 rows carries a non-empty `evidenceFiles` array of repo-relative source paths (F2).
- **No-write proof**: `fingerprintTree` covered 9 source/test/docs roots (`src/shared/constants`, `src/app/api/providers`, `open-sse/config`, `open-sse/config/providers`, `references/diegosouzapw-omniroute/src/shared/constants`, `references/diegosouzapw-omniroute/open-sse/config`, `tests/unit`, `bin/cli`, `docs/tasks`) across `list` + `diff --max-age-days 3650` + `json` + `markdown` invocations; before/after fingerprint byte-identical (283844 bytes).
- **Sabotage proof (11-scenario matrix incl. F1–F4 + F6 regressions, read-only restore verified)**:
  | # | Deliberate break | Test(s) that failed | Restored |
  |---|------------------|---------------------|----------|
  | 1 | classification defaulted to "ignore" for security-sensitive rows | `OAuth authType change classifies security-sensitive with high risk` + 2 others | ✅ 42/43 |
  | 2 | redaction regex disabled (allows JWT-shaped values through) | `token-shaped and cookie-shaped values are redacted from json and markdown output` | ✅ 42/43 |
  | 3 | baseUrl routed to executor-format-change (security classification lost) | `baseUrl host change classifies security-sensitive without echoing the URL` + 1 other | ✅ 42/43 |
  | 4 | `--apply` flag accepted (read-only guarantee broken) | `write/apply/mutate flags are forbidden and rejected as read-only violations` | ✅ 42/43 |
  | 5 | schemaVersion mismatch silently consumed | `unsupported schemaVersion fails closed instead of being consumed silently` | ✅ 42/43 |
  | 6 | metadata-only row left `tags` empty (documented-schema-contract gap) | `metadata-only rows carry a non-empty tags array (contract gap regression)` | ✅ 42/43 |
  | 7 | F1: metadata redaction ordered AFTER validateDiff extraction (snapshotCaveat leak) | `F1: Bearer token in required metadata.snapshotCaveat is redacted from JSON and Markdown output` | ✅ 42/43 |
  | 8 | F2: sourceFile evidence dropped from output rows | `F2: changed row preserves redacted catalog/registry sourceFile evidence` + `F2: alias change preserves old/new ids AND the source evidence path` | ✅ 42/43 |
  | 9 | F3: security-sensitive tag omitted / auth-change tag wrongly on baseUrl-only rows | `F3: every security-sensitive row carries an explicit security-sensitive tag` | ✅ 42/43 |
  | 10 | F4: stale bucket rows left as provider candidates (inconsistent) + literal `${}` in Markdown | `F4: stale unresolved provenance renders no literal ${} placeholder in Markdown` + `F4: stale bucket rows reclassify to stale-snapshot (consistent with changed rows)` | ✅ 42/43 |
  | 11 | F6: path normalization disabled (absolute host paths emitted verbatim) | `F6: absolute forkRoot/referenceRoot normalize to safe [external] form in JSON and Markdown` + `F6: absolute source-file paths relativize under known roots or map to [external]` + `F6: Unix /tmp Windows drive-letter and backslash absolute paths never leak (sabotage)` | ✅ 42/43 |

### Changelog Draft (submitted; parent publishes on wave close)

```markdown
### Changelog Draft
- **task**: 0153
- **agent**: builder-engineer
- **project**: omniroute
- **title**: provider-absorption-triage
- **description**: Add deterministic read-only absorption-triage CLI that consumes Task 0152 normalized diff JSON
- **summary**: Adds `bin/cli/provider-absorption.mjs` that consumes the Task 0152 fork/reference diff contract (schemaVersion 1) and produces a deterministic, redacted JSON or Markdown report classifying each fork/reference difference into metadata-only, model-only, provider-addition-candidate, provider-removal-candidate, executor-format-change, security-sensitive (authType/baseUrl), alias-change, stale-snapshot, or unresolved-manual-review. Every row carries `risk`, `confidence`, `evidencePaths`, `tags`, `oldIds`/`newIds`, `suggestedAction`, `manualReviewRequired`, and `provenance.sourceRoots`/`snapshot`. The CLI fails closed on missing/malformed/wrong-schema diffs, rejects forbidden write flags (`--apply`, `--write`, `--mutate`, `--create-task`, `--create-tasklist`, `--create-changelog`, `--commit`, `--push`) with a read-only diagnostic, never mutates provider sources, tasks, or changelog files, redacts JWT/bearer/urlCredentials/apiKey/cookie-shaped values with a `withheldValueEmissions` counter, lowers confidence and reclassifies rows when the snapshot is stale (default `maxAgeDays=90`), and registers `provider:absorption` + `check:provider-absorption` package scripts. Expert-polish fix: `classifyChangedRow` now guarantees `tags.length > 0` for every row (including metadata-only and presence-only rows without model changes) by pushing the content classification as a tag when no other tag was emitted — computed before the stale-snapshot override so the tag always reflects content category, never freshness. This closes a documented-schema-contract gap where metadata-only rows previously emitted `tags: []`. Reviewer-fix wave (F1–F4): (F1) metadata provenance (`snapshotCaveat`, `referenceRoot`) is now inline-scrubbed BEFORE `validateDiff` extracts it, so token-shaped/Bearer/cookie/path values never leak into JSON or Markdown — redaction runs on the clone prior to extraction; (F2) every output row now carries an `evidenceFiles` array of redacted repo-relative source-file paths (from `fork.catalog`/`registry.sourceFile` and `reference.catalog`/`registry.sourceFile` for changed rows, `catalog`/`registry.sourceFile` for bucket rows), preserving alias old/new IDs with their source paths — rendered under an `Evidence Files` Markdown section; (F3) auth/OAuth/security taxonomy is now explicit and stable — every security-sensitive row carries a `security-sensitive` tag, auth rows additionally carry `auth-change`, baseUrl rows carry `baseUrl-change` (so `auth-change` is no longer wrongly applied to baseUrl-only rows); (F4) stale-provenance policy is now consistent and deterministic — a stale snapshot reclassifies EVERY row (changed and presence-only buckets) to `stale-snapshot` with manual review, and the unresolved-stale Markdown line now correctly interpolates `${meta.stale.maxAgeDays}` (was a literal double-quote string). F6 path-normalization fix: `metadata.forkRoot`/`metadata.referenceRoot` and every `differences[].evidenceFiles` entry (plus Markdown equivalents) are now run through `normalizePathForDisplay`, which keeps relative paths verbatim, relativizes absolute paths under a known root to repo-relative, and collapses any absolute path outside every known root to a deterministic `[external]/<basename>` token — so no Unix (`/home/`, `/tmp/`, `/etc/`), Windows drive-letter, or backslash host path leaks into JSON or Markdown. Tests cover all 10 classifications plus 7 F1–F4 and 3 F6 regression/sabotage tests, malformed/stale cases, deterministic sorting, redaction, metadata-only tags, stdin (`--diff-json -`), absolute-path normalization, and a real fork/reference smoke against `tmp/agent-work/0153/real-0152-diff.json` (fork 242, ref 299, 132 differences classified, every row carries `evidenceFiles`, 0 rows failing the documented contract, no host-path leak).
- **verification**: `node --import tsx/esm --test tests/unit/provider-absorption-triage.test.ts` (43/43 pass), `node bin/cli/provider-absorption.mjs --diff-json tmp/agent-work/0153/real-0152-diff.json` (exit 0, schemaVersion 1, 132 differences, snapshot caveat emitted, all rows tags.length>0, all rows carry evidenceFiles), `node bin/cli/provider-absorption.mjs --diff-json tmp/agent-work/0153/real-0152-diff.json --format markdown` (exit 0, no literal `${}` placeholder, no host-path leak), `npm run typecheck:core` (exit 0), `npx eslint --no-ignore bin/cli/provider-absorption.mjs tests/unit/provider-absorption-triage.test.ts` (exit 0, 0 errors/0 warnings); 11-scenario sabotage table (incl. F1–F4 + F6 regressions) recorded; read-only proven by 9-root fingerprint across json/markdown/max-age invocations.
```

- **Arquivos criados/modificados**:
  - `bin/cli/provider-absorption.mjs` (criado — read-only absorption-triage CLI; classification engine, Markdown renderer, fail-closed flag parser, redaction pass, stdin/--diff-json pipe support)
  - `tests/unit/provider-absorption-triage.test.ts` (criado — 43 unit tests covering all 10 classifications, malformed/stale/shape/schemaVersion cases, stdin, forbidden flags, read-only scratch-tree fingerprint, deterministic byte-stable sorting, real fork/reference smoke, redaction counter, full documented schema contract, and F6 absolute-path normalization: Unix /tmp / Windows drive-letter / backslash host paths normalized to repo-relative or `[external]/...` in JSON and Markdown)
  - `package.json` (modificado — registered `provider:absorption` and `check:provider-absorption`)
  - `tmp/agent-work/0153/real-0152-diff.json` (criado — staged real 0152 diff for smoke; not tracked)
  - `tmp/agent-work/0153/real-absorption.json` (criado — absorption output of the smoke; not tracked)
  - `tmp/agent-work/0153/real-absorption.md` (criado — Markdown output of the smoke; not tracked)
  - `tmp/agent-work/0153/sabotage.mjs` (criado — sabotage harness used during verifier pass; not tracked)
  - `docs/tasks/02-doing/0153-omniroute-provider-absorption-triage.md` (modificado — Completion Evidence + Compliance Checklist + Changelog Draft sections filled)

- **Testes que verificam o trabalho**:
  - `tests/unit/provider-absorption-triage.test.ts`

- **Resultado dos testes (final, post-reviewer-fix)**:
  ```
  ✔ metadata-only rows carry a non-empty tags array (contract gap regression) (0.19149ms)
  ✔ metadata-only changes classify as metadata-only with low risk and ignore action (2.366368ms)
  ✔ model-only additions/removals are separated from provider identity changes (0.798429ms)
  ✔ a combined model + executor change classifies executor-format-change and keeps the model-only tag (0.29798ms)
  ✔ an upstream-only provider with only catalog metadata is a manual-review candidate, never auto-applied (0.341779ms)
  ✔ fork-only rows classify as provider-removal-candidate with manual review (0.20493ms)
  ✔ executor change is high risk and requires manual review (0.22564ms)
  ✔ target format change is high risk and requires manual review (0.21146ms)
  ✔ OAuth authType change classifies security-sensitive with high risk (0.22158ms)
  ✔ plain authType change (apikey to optional) classifies security-sensitive with high risk (0.24571ms)
  ✔ baseUrl host change classifies security-sensitive without echoing the URL (0.53497ms)
  ✔ security-sensitive beats executor-format-change when both apply (5.941628ms)
  ✔ alias change retains old/new ids and the source evidence path (0.28908ms)
  ✔ registry presence-only diff is unresolved with low confidence (0.21003ms)
  ✔ unknown diff field is unresolved and never silently ignored (0.20033ms)
  ✔ stale snapshot (old generatedAt) classifies rows stale-snapshot and lowers confidence (0.27842ms)
  ✔ missing generatedAt marks provenance unresolved and lowers confidence (0.180449ms)
  ✔ fresh snapshot keeps content classification and full confidence (0.15708ms)
  ✔ missing diff file fails closed with empty stdout and diagnostic on stderr (0.37772ms)
  ✔ malformed diff JSON fails closed without echoing content (0.44632ms)
  ✔ wrong diff shape fails closed with a sanitized diagnostic (0.24181ms)
  ✔ unsupported schemaVersion fails closed instead of being consumed silently (0.276509ms)
  ✔ empty diff (no differences) produces a valid zero-difference report (0.16512ms)
  ✔ --diff-json requires a value and never swallows the next flag (0.13812ms)
  ✔ write/apply/mutate flags are forbidden and rejected as read-only violations (0.18697ms)
  ✔ stdin input is supported via --diff-json - (0.55477ms)
  ✔ CLI never writes files: scratch tree fingerprint unchanged across json and markdown runs (0.98989ms)
  ✔ output is deterministic and sorted apart from generatedAt (1.699319ms)
  ✔ token-shaped and cookie-shaped values are redacted from json and markdown output (0.726159ms)
  ✔ every difference row carries the full documented schema contract (0.40241ms)
  ✔ markdown report includes snapshot caveat, summary table, and per-row detail (0.371959ms)
  ✔ schema version constant matches the consumed 0152 contract (0.09441ms)
  ✔ real fork/reference smoke: snapshot caveat, non-empty report, classification histogram sums to differences (19.587656ms)
  ✔ F1: Bearer token in required metadata.snapshotCaveat is redacted from JSON and Markdown output (0.309271ms)
  ✔ F1: urlCredentials-shaped referenceRoot is sanitized before emission (0.1674ms)
  ✔ F2: changed row preserves redacted catalog/registry sourceFile evidence (0.299701ms)
  ✔ F2: alias change preserves old/new ids AND the source evidence path (0.203531ms)
  ✔ F3: every security-sensitive row carries an explicit security-sensitive tag (0.293002ms)
  ✔ F4: stale unresolved provenance renders no literal ${} placeholder in Markdown (0.195901ms)
  ✔ F4: stale bucket rows reclassify to stale-snapshot (consistent with changed rows) (0.472012ms)
  ✔ F6: absolute forkRoot/referenceRoot normalize to safe [external] form in JSON and Markdown (0.280427ms)
  ✔ F6: absolute source-file paths relativize under known roots or map to [external] (0.280386ms)
  ✔ F6: Unix /tmp Windows drive-letter and backslash absolute paths never leak (sabotage) (0.41877ms)
  ℹ tests 43
  ℹ suites 0
  ℹ pass 43
  ℹ fail 0
  ℹ cancelled 0
  ℹ skipped 0
  ℹ todo 0
  ℹ duration_ms 258.198167
  ```

- **Resultado do lint (final, post-reviewer-fix)**:
  - `npx eslint --no-ignore bin/cli/provider-absorption.mjs tests/unit/provider-absorption-triage.test.ts` — exit 0, **0 errors / 0 warnings** on task-owned files.
  - `npm run lint` — exit non-zero, 7 pre-existing errors in `visual-reference/...` (PrismTree.tsx, execution-stream.tsx, usage-analytics.tsx); **no task-owned file** appears in the error list (matches the Task 0152 baseline precedent: scoped lint is the gate).

- **Resultado do typecheck (final)**:
  - `npm run typecheck:core` — exit 0, 0 errors.

- **Smoke report**:
  - Real 0152 diff (`tmp/agent-work/0153/real-0152-diff.json`): forkTotal 242, referenceTotal 299, forkOnly 5, referenceOnly 62, common 172, changed 65, snapshotCaveat `"The reference directory (references/diegosouzapw-omniroute) is a static snapshot, not live upstream."`
  - 0153 absorption over the same diff (`tmp/agent-work/0153/real-absorption.json`): schemaVersion 1, totalDifferences 132, byClassification `{ metadata-only: 8, model-only: 34, provider-addition-candidate: 62, provider-removal-candidate: 5, executor-format-change: 3, auth-change: 0, security-sensitive: 16, alias-change: 1, stale-snapshot: 0, unresolved-manual-review: 3 }`, byRisk `{ low: 42, medium: 15, high: 75 }`, snapshot caveat emitted, all rows carry provenance.sourceRoots, all rows carry a non-empty `evidenceFiles` array (F2), zero `auto-apply` suggested actions. `auth-change: 0` is intended — auth deltas classify as `security-sensitive` and carry `auth-change` as a tag.
  - Real bucket parity: `fork_only=5 → provider-removal-candidate=5`, `reference_only=62 → provider-addition-candidate=62`, `changed=65 → metadata(8)+model(34)+executor(3)+security(16)+alias(1)+unresolved(3)=65`.

- **No-write proof**:
  - 9-root fingerprint before/after `node bin/cli/provider-absorption.mjs --diff-json tmp/agent-work/0153/real-0152-diff.json` (json + markdown + `--max-age-days 3650`): byte-identical, 283844 bytes; no source tree file created or mutated. Forbidden write flags (`--apply`, `--write`, `--mutate`, `--create-task`, `--create-tasklist`, `--create-changelog`, `--commit`, `--push`) each rejected with `read-only` diagnostic, stdout empty, exit 1.

- **Entrada no changelog**: Changelog Draft submitted in the section above; per Task 0152 precedent and orchestrator instructions, **the parent publishes the entry on wave close** — `manage-changelog` / `rebuild.sh build` were not invoked by the worker.

- **Agente executor**: builder-engineer (worker under `builders` orchestrator)
- **Data de conclusão**: 2026-08-11

## 🔍 Review Trail (BUILDER_CONTEXT — 2026-08-11)

- **Reviewer**: primary reviewer (no subagent delegation)
- **Data da review**: 2026-08-11
- **Veredito**: **REJEITADO**
- **Score (operator gate)**: **82/100** — scores `<90` remain in `02-doing/`.
- **Report**: [`docs/reports/review/20260811-task-0153-omniroute-provider-absorption-triage-review.md`](../../reports/review/20260811-task-0153-omniroute-provider-absorption-triage-review.md)
- **Lineage**: `NEW` F1 required metadata redaction leak; `NEW` F2 source-file evidence loss; `NEW` F3 incomplete auth/security taxonomy; `NEW` F4 stale Markdown interpolation/policy inconsistency; `EVIDENCE_GAP` F5 unchecked live Exit Conditions/subtasks. No prior Task 0153 review report exists.
- **Live proof**: targeted tests **33/33 pass**; `npm run typecheck:core` exit 0; owned ESLint exit 0; real 0152→0153 smoke emits 132 rows with static-snapshot caveat; read-only probe found a Bearer token leaked through `metadata.snapshotCaveat`; `npm run lint` exceeded the 120-second review timeout and is not claimed as passed.
- **Top blockers**: sanitize all emitted metadata before report construction; preserve Task 0152 `sourceFile` evidence per row/alias; make auth/OAuth and security-sensitive tags/classification explicit; fix stale Markdown interpolation and stale-bucket policy; reconcile unchecked task evidence after remediation.
- **Path to 100**: see the report's ordered six-step path-to-100. Re-run targeted tests, typecheck, owned lint, real JSON/Markdown smoke, metadata/source-evidence redaction probes, and bounded repository lint after fixes, then request a fresh independent review.
- **Move result**: **not moved**; remains `docs/tasks/02-doing/0153-omniroute-provider-absorption-triage.md`. No fixer, sub-reviewer, Task 0159 work, git, network, `:22000`, tasklist-sync, changelog tooling, profile/reference writes, or `04-completed` operation was performed.

### Fixer pass (builder-expert, `builders` orchestrator — 2026-08-11)

> **NOT an independent review.** This entry documents remediation work only; it does not
> constitute reviewer approval or a fresh score. The task remains in `02-doing/` pending an
> independent review per the operator's score gate.

- **Trigger**: reviewer report `docs/reports/review/20260811-task-0153-omniroute-provider-absorption-triage-review.md` (82/100 — REJECTED) findings F1–F5.
- **F1 (metadata redaction leak)**: added `redactMetadataStrings()` that inline-scrubs every metadata string field BEFORE `validateDiff` extracts provenance; `buildReport` now validates the original shape, then clones+scrubs, then re-validates the sanitized clone so `snapshotCaveat`/`referenceRoot` are redacted. Added regression + sabotage tests for Bearer-in-caveat and urlCredentials-in-referenceRoot.
- **F2 (source-file evidence loss)**: added `collectSourceFiles()` walking `fork`/`reference` `catalog.sourceFile` + `registry.sourceFile` (changed rows) and `catalog`/`registry.sourceFile` (bucket rows); emitted as `evidenceFiles` per row (JSON) plus an `Evidence Files` Markdown section; alias rows retain old/new IDs with their source paths. Added regression tests (changed row, alias row).
- **F3 (auth/security taxonomy)**: every `security-sensitive` row now carries an explicit `security-sensitive` tag; auth rows additionally carry `auth-change`; baseUrl rows carry `baseUrl-change` (no longer wrongly tagged `auth-change`). Added regression test asserting tag sets for OAuth authType, plain authType, and baseUrl-only cases.
- **F4 (stale policy + interpolation)**: stale policy is now uniform and deterministic — a stale snapshot reclassifies EVERY row (changed + presence-only buckets) to `stale-snapshot` with manual review; fixed the unresolved-stale Markdown line (`${meta.stale.maxAgeDays}`) from a literal double-quote string to a template literal. Added regression + sabotage tests (placeholder absence, bucket reclassification).
- **F5 (evidence reconciliation)**: refreshed all subtask and genuinely-satisfied exit-condition checkboxes against fresh live commands (43/43 tests, typecheck exit 0, owned lint exit 0, full-lint baseline 7 pre-existing `visual-reference` errors); left the changelog exit-condition unchecked (parent-owned Changelog Draft preserved); updated Completion Evidence, sabotage matrix (11 scenarios), smoke report, and Changelog Draft summary to reflect the fixes.
- **Verification**: `node --import tsx/esm --test tests/unit/provider-absorption-triage.test.ts` → **43/43 pass**; `npm run typecheck:core` → exit 0; owned ESLint → exit 0, 0 errors/0 warnings; real smoke → 132 differences, `auth-change: 0` (intended), all rows carry `evidenceFiles`, Markdown renders `Evidence Files` with no literal `${}` placeholder, and no absolute host path (`/home/`, `/tmp/`, drive-letter, backslash) leaks into JSON or Markdown. Sabotage matrix expanded to 11 scenarios covering F1–F4 + F6 path normalization.
- **Constraints honored**: no Task 0159 work, no git/network/`:22000`/tasklist-sync/changelog-rebuild/profile writes; task left in `02-doing/`; no reviewer-approval claim; no nested subagents.
- **Residual risks**: full-repository lint baseline (7 pre-existing `visual-reference` errors) is documented, not fixed — out of scope per Task 0152 precedent. Independent re-review required for score/promotion.

### Fixer pass — F6 path normalization (builder-expert, `builders` orchestrator — 2026-08-11)

> **NOT an independent review.** This entry documents F6 remediation work only; it does not
> constitute reviewer approval or a fresh score. The task remains in `02-doing/` pending an
> independent review per the operator's score gate.

- **Trigger**: re-review report `docs/reports/review/20260811-task-0153-omniroute-provider-absorption-triage-final-rereview.md` (86/100 — REJECTED) finding `NEW` F6 absolute source-root/source-file path leakage, plus the minor stale "32 unit tests" count and malformed test-path wording.
- **F6 (absolute-path leakage)**: added `isAbsolutePath`, `normalizePathForDisplay`, and `basenameOf` helpers. `normalizePathForDisplay` returns relative paths verbatim, relativizes an absolute path under a known root to repo-relative (preserving useful provenance), and collapses any absolute path outside every known root to a deterministic `[external]/<basename>` token — covering Unix (`/home/`, `/tmp/`, `/etc/`), Windows drive-letter (`C:\` / `C:/`), and backslash (`\\server\...` / `\Windows`) shapes. `buildReport` now computes normalized `displayForkRoot`/`displayReferenceRoot` and emits them in `metadata.forkRoot`, `metadata.referenceRoot`, and every row's `provenance.sourceRoots`; `collectSourceFiles` threads the raw roots through so every `evidenceFiles` entry is normalized. Markdown output derives from the same normalized data, so it is covered automatically.
- **F6 regression + sabotage tests**: added 3 tests — (1) absolute `forkRoot`/`referenceRoot` normalize to `[external]/...` in JSON and Markdown; (2) absolute source-file paths relativize under a known root or map to `[external]/...` (incl. a Windows drive-letter case); (3) sabotage test asserting Unix `/home/`/`/tmp/`/`/etc/`, Windows drive-letter, and backslash/UNC shapes never leak into either output. TDD red→green confirmed (3 fail before, 0 after); sabotage matrix row 11 added.
- **Doc evidence refresh**: corrected the stale "32 unit tests" file-inventory sentence to 43, fixed the malformed `tests/unit-provider-absorption-triage.test.ts` path typo in the F5 Verification note, and updated all executor-owned test counts (40/40 → 43/43), sabotage-matrix heading (10 → 11 scenarios), "Restored" column (39/40 → 42/43), and changelog draft to reflect F6. Reviewer's historical re-review record (lines 350+) left intact as an artifact.
- **Verification**: `node --import tsx/esm --test tests/unit/provider-absorption-triage.test.ts` → **43/43 pass**; `npm run typecheck:core` → exit 0; owned ESLint → exit 0, 0 errors/0 warnings; real JSON smoke (132 differences, `auth-change:0` intended, all rows carry `evidenceFiles`) and real Markdown smoke (132 `Evidence Files` sections, no literal `${}`) both leak-check clean for `/home/`, `/tmp/`, backslash, and drive-letter; `normalizePathForDisplay` unit-checked against all four absolute shapes.
- **Constraints honored**: no Task 0159 work, no git/network/`:22000`/tasklist-sync/changelog-rebuild/profile writes; task left in `02-doing/`; no reviewer-approval claim; no nested subagents; preserves Task 0152 JSON consumption, read-only behavior, redaction, taxonomy, stale policy, and no auto-apply/task creation.

### Delta-aware final re-review (2026-08-11)

- **Reviewer**: primary reviewer (no subagent delegation)
- **Prior report**: `docs/reports/review/20260811-task-0153-omniroute-provider-absorption-triage-review.md` — 82/100, rejected.
- **Current report**: [`docs/reports/review/20260811-task-0153-omniroute-provider-absorption-triage-final-rereview.md`](../../reports/review/20260811-task-0153-omniroute-provider-absorption-triage-final-rereview.md)
- **Delta classification**: `RESOLVED` F1 metadata token leak; `RESOLVED/PARTIAL` F2 evidenceFiles; `RESOLVED` F3 auth/security taxonomy; `RESOLVED` F4 stale policy/interpolation; `RESOLVED` F5 satisfied-exit reconciliation; `NEW` F6 absolute source-root/source-file path leakage; minor `EVIDENCE_GAP` stale test-count/path wording.
- **Score**: **86/100**
- **Veredito**: **REJEITADO** — operator threshold is 90; remain in `02-doing/`.
- **Live proof**: 40/40 targeted tests and registered package check pass; typecheck and task-owned lint pass; real smoke emits 132 rows with evidence files and static-snapshot caveat; required metadata token probes pass; fresh absolute-root/source-file probe shows `/home/...` and `/tmp/...` values in JSON and Markdown.
- **Path to 100**: normalize roots and source-file evidence to deterministic non-host-specific paths; add Unix/Windows absolute-path JSON/Markdown/sabotage tests; rerun the full evidence matrix; correct the stale “32 unit tests” and malformed test-path wording; obtain a fresh independent re-review.
- **Move result**: **not moved**; current path remains `docs/tasks/02-doing/0153-omniroute-provider-absorption-triage.md`.

### Final approval re-review (2026-08-11)

- **Reviewer**: primary reviewer (no subagent delegation)
- **Prior reports**: `docs/reports/review/20260811-task-0153-omniroute-provider-absorption-triage-review.md` — 82/100 rejected; `docs/reports/review/20260811-task-0153-omniroute-provider-absorption-triage-final-rereview.md` — 86/100 rejected for F6.
- **Current report**: [`docs/reports/review/20260811-task-0153-omniroute-provider-absorption-triage-approval-rereview.md`](../../reports/review/20260811-task-0153-omniroute-provider-absorption-triage-approval-rereview.md)
- **Delta classification**: `RESOLVED` F1 metadata token leak; `RESOLVED` F2 evidence preservation; `RESOLVED` F3 auth/security taxonomy; `RESOLVED` F4 stale policy/interpolation; `RESOLVED` F5 evidence reconciliation; `RESOLVED` F6 absolute root/source-file path leakage; `RESOLVED` prior test-count/path wording drift.
- **Live proof**: targeted suite **43/43 pass**; registered `check:provider-absorption` **43/43 pass**; `npm run typecheck:core` exit 0; task-owned ESLint exit 0 with 0 errors/warnings; real smoke emits 132 rows, 132 Markdown evidence sections, static-snapshot caveat, all rows with evidence files, and no Unix `/home`/`/tmp`, Windows drive-letter, or backslash/UNC path leakage; determinism and read-only tests pass.
- **Score**: **96/100**.
- **Veredito**: **APROVADO** — score meets the operator's 90-point promotion threshold.
- **Move result**: authorized and performed after this ledger update: `docs/tasks/02-doing/0153-omniroute-provider-absorption-triage.md` → `docs/tasks/03-review/0153-omniroute-provider-absorption-triage.md`. Parent-owned changelog publication remains outstanding and is not a blocker for review-lane promotion.

### Experimental reviewer-resume routing

- **Expert task ID**: `ses_00e6c6930ffepVArkxhRcYrW2f`
- **Reviewer task ID**: `ses_00e842d8bffeCyGi5es50uQhhw`
- **Routing rule**: after the expert implements corrections, the existing reviewer receives an explicit re-review instruction; do not send a bare `continue` after a final review report.
- **Context guard**: reviewer re-review is requested under the configured 500k-token context limit.

### Experimental reviewer-resume routing — F6 fix loop

- **Expert task ID**: `ses_00e210d1affe9orlh9KkwgnFht`
- **Reviewer task ID**: `ses_00e842d8bffeCyGi5es50uQhhw`
- **Routing rule**: expert fixed the F6 path-leakage blocker; the existing reviewer receives the explicit re-review instruction and no nested reviewer is allowed.
