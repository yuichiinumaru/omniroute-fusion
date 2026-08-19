# OmniRoute Test Suite Mega-Audit — Index

**Audit mode:** bounded, report-only filesystem research  
**Repository:** `/home/sephiroth/working/ganthritor/cybernetics-core/omniroute-2`  
**Date:** 2026-08-17  
**Scope rule:** no writes under `src/`, `open-sse/`, or `tests/`; no changelog rebuild or generated-surface update.

## Executive result

This is an evidence-bounded audit, not a claim that every test was semantically reviewed. The filesystem inventory found **2,815 unique test/spec files** across the selected surfaces and **26,775 declaration lines** under the counting rule documented below (17,185 `test(...)`-family lines, 6,748 `it(...)`-family lines, and 1,794 `describe(...)` lines; setup hooks are reported separately). The primary unit corpus is **2,403 `tests/unit/**/*.test.ts` files**, while the package's declared unit glob matches **2,401**, leaving two files outside that npm glob.

The audit has **one high-confidence USELESS finding** (the task's own A1 archetype), **four measured duplication-pattern clusters** (not a claim that every occurrence is semantically redundant), and **eight improvement priorities**. Candidate counts are kept separate from verified findings so they are not inflated into unsupported conclusions.

| Report | Result | Evidence |
|---|---:|---|
| [USELESS](./test-suite-mega-audit-USELESS.md) | 1 high-confidence finding; 188 no-throw assertion occurrences remain candidates | `tests/unit/model-test-runner.test.ts:3-88`; marker scan below |
| [REDUNDANT](./test-suite-mega-audit-REDUNDANT.md) | 4 measured repeated-shape clusters | marker scan below; examples cited in report |
| [IMPROVEMENTS](./test-suite-mega-audit-IMPROVEMENTS.md) | 8 prioritized opportunities | runner config and discovery evidence |
| [TEMPLATES](./test-suite-mega-audit-TEMPLATES.md) | design-only provider + 6 boundary templates | RD requirements `docs/tasks/01-open/RD-omniroute-test-suite-mega-audit.md:71-75` |
| [ORCHESTRATION LOG](./test-suite-mega-audit-ORCHESTRATION-LOG.md) | phases, reused context, commands, blockers | this session's bounded evidence |

## Counting method and exact inventory

The corpus command selected files under `tests/` and `open-sse/` whose names match `.test.*`/`.spec.*`, plus `src/**/__tests__` test/spec files. It excluded `.git`, `node_modules`, `coverage`, `.next`, and `dist`. Declarations were counted only when the first non-whitespace token on a line was `test`, `it`, or `describe`, with common modifiers (`.skip`, `.only`, `.concurrent`, `.todo`, `.each`) accepted. This avoids counting prose or arbitrary calls, but it is not a test-runner execution count.

```text
unique files: 2,815
`test` declaration lines: 17,185
`it` declaration lines: 6,748
`describe` declaration lines: 1,794
setup-hook lines (`before*` + `after*`): 1,068
```

Surface breakdown:

| Surface | Files | `test` | `it` | `describe` | setup hooks |
|---|---:|---:|---:|---:|---:|
| `tests/unit` | 2,618 | 16,298 | 6,086 | 1,569 | 920 |
| `tests/integration` | 95 | 653 | 187 | 56 | 138 |
| `tests/e2e` | 38 | 180 | 2 | 8 | 10 |
| `tests/golden-set` | 4 | 0 | 16 | 4 | 0 |
| `tests/live` | 1 | 3 | 0 | 0 | 0 |
| `tests/other` | 2 | 0 | 7 | 1 | 0 |
| `open-sse` | 27 | 0 | 278 | 86 | 0 |
| `src/**/__tests__` | 30 | 51 | 172 | 70 | 0 |

The package script uses Node native tests with `--test-concurrency=20` and an explicit brace glob (`package.json:98-104`). It separately exposes integration, E2E, Vitest, and all-suite commands (`package.json:182-202`). The Vitest configurations use thread pools and `maxWorkers: 20`, `maxConcurrency: 20` (`vitest.config.ts:7-28`; `vitest.mcp.config.ts:7-23`).

## Measured markers (not semantic finding counts)

A repository-wide bounded marker scan over the selected test surfaces returned:

| Marker | Occurrences | Files | Interpretation |
|---|---:|---:|---|
| `globalThis.fetch =` | 2,372 | 303 | repeated network-double setup; inspect before consolidation |
| `new Response(JSON.stringify` | 558 | 187 | repeated response fixture shape |
| `resetDbInstance()` | 894 | 518 | repeated DB reset setup |
| `mkdtemp` | 789 | 664 | repeated temporary-data setup |
| `doesNotThrow`/`doesNotReject`/`not.throws` | 188 | 108 | candidate no-throw assertions; not all useless |
| `as any` | 2,985 | 350 | typing-debt signal, not automatically a defect |
| `setTimeout(` | 439 | 258 | timing/flakiness review signal |
| `sleep`/`delay`/`wait` token | 41 | 12 | bounded timing review signal |

Examples and commands are reproduced in [REDUNDANT](./test-suite-mega-audit-REDUNDANT.md) and [IMPROVEMENTS](./test-suite-mega-audit-IMPROVEMENTS.md).

## Discovery / execution evidence

- `npm run check:test-discovery` exited **1** and reported four new orphaned files: `tests/unit/shared/components/OAuthModal.cancellation.test.tsx`, `OAuthModal.oautopopup.test.tsx`, `OAuthModal.state.test.tsx`, and `ProxyRedactionModal.test.tsx`. The check's own output says no runner collects them.
- `npm run check:test-masking` exited **0**, but explicitly skipped because there was no base ref; it is not evidence that masking is absent.
- `npm run check:test-runner-api` exited **0** (`vitest-only dirs use the vitest API`).
- Full unit/integration/e2e/Vitest execution was intentionally not claimed in this bounded report. See blockers in the orchestration log.

## High-priority synthesis

1. **P0 boundary gap:** `tests/unit/model-test-runner.test.ts:3` imports only `parseRetryAfterHeader` and `detectTestKind`; its tests end at line 88. The production `runSingleModelTest` boundary begins at `src/lib/api/modelTestRunner.ts:172` and performs normalization at `:177-224`. The test therefore does not prove the operator-facing dispatch path described by the RD.
2. **P0 discovery:** four `tests/unit/shared/components/*.test.tsx` files are reported as orphaned by the repository's discovery checker.
3. **P1 consolidation:** fetch, response, DB-reset, and temp-directory setup are repeated at the measured scales above; templates should centralize setup without asserting mock behavior.
4. **P1 concurrency review:** both Vitest configs permit 20 workers/concurrent tests, while many tests mutate `globalThis.fetch` and reset shared DB state; this is a risk signal, not proof of a race.
5. **P2 standardization:** use one table-driven boundary contract per provider/boundary family, modeled on the existing alias boundary test's upstream-observable assertions (`tests/unit/provider-alias-normalization.boundary.test.ts:107-193`, `:195-216`, `:224-289`).

## Explicit limitations

- No semantic review of all 2,815 files was attempted; the useless list is intentionally conservative.
- Marker counts count textual occurrences, not unique logical fixtures or executed tests.
- Filename clusters are inventories, not coverage percentages.
- No live provider calls, mutation run, coverage run, or full `test:all` result is claimed.
- No production/test/changelog file was modified by this audit.
