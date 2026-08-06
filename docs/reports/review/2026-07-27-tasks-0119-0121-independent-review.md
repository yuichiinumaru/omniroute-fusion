# Independent Review Report: Tasks 0119 + 0121

> **Date**: 2026-07-27  
> **Reviewer lane**: `reviewers`  
> **Profile**: Implacable TypeScript Reviewer  
> **Scope**: `docs/tasks/02-doing/0119-omniroute-combo-empty-streaming-fallback.md`, `docs/tasks/02-doing/0121-omniroute-lmarena-pr6280-port.md`  
> **Review mode**: initial independent review (suspicious of prior reports)

---

## Review Lineage

- **Task 0119**: previously reviewed by `gt-ts-code-reviewer` in the task's own Review Trail (verdict REJEITADO, 65/100). A fresh independent review was requested.
- **Task 0121**: previously reviewed by `gt-ts-code-reviewer` in the task's own Review Trail (verdict REJEITADO, 89/100). A fresh independent review was requested.
- **Cross-task coupling**: none; tasks touch disjoint file sets.
- **Prior reports read**: the two Review Trail blocks embedded in the task files above.

---

## Per-Task Verdicts

| Task | Score | Verdict | Lane outcome |
|------|-------|---------|--------------|
| **0119** | **64/100** | **REJECTED_TO_DOING** | remains in `02-doing/`, add review ledger + footnote |
| **0121** | **88/100** | **REJECTED_TO_DOING** | remains in `02-doing/`, add review ledger + footnote |

Both tasks are functionally close, but neither satisfies the OmniRoute Definition of Done / task closeout gates. Scores are capped below 90 primarily by governance/evidence gaps (0119) and type-purity violations plus missing closeout artifacts (0121).

---

## Task 0119 — Fix NVIDIA NIM combo fallback when response has 0 output tokens

### What was verified (fresh evidence)

| Check | Command | Result |
|-------|---------|--------|
| New unit tests | `node --import tsx/esm --test tests/unit/validate-quality-empty-streaming.test.ts` | 6/6 pass |
| Regression unit tests | `node --import tsx/esm --test tests/unit/combo-quality-validator-reasoning.test.ts` | 12/12 pass |
| Typecheck | `npm run typecheck:core` | PASS (0 errors) |
| Lint on touched files | `npx eslint --max-warnings=0 open-sse/services/combo/validateQuality.ts tests/unit/validate-quality-empty-streaming.test.ts` | PASS (0 errors, 0 warnings) |

### Implementation assessment

The functional change in `open-sse/services/combo/validateQuality.ts:322-338` correctly detects a streaming response that ends without meaningful content and returns `{ valid: false, reason: "empty_streaming_content" }`. It accumulates `delta.content` across chunks and only rejects when the trimmed aggregate is empty, satisfying the requirement that a leading whitespace delta must not trigger a false positive.

The new tests cover:
- `[DONE]`-only stream → invalid
- role delta + `[DONE]` → invalid
- single whitespace-only delta → invalid
- whitespace delta followed by real content → valid
- `reasoning_content` without content → valid
- non-streaming empty content regression → invalid

### Findings

| ID | Class | Severity | Summary | Evidence |
|----|-------|----------|---------|----------|
| 0119-F1 | `EVIDENCE_GAP` | **Blocker** | "Completion Evidence" section is still unfilled (`[lista...]` placeholders). This violates the OmniRoute DoD overlay and the task's own Exit Conditions. | `docs/tasks/02-doing/0119-omniroute-combo-empty-streaming-fallback.md:140-151` |
| 0119-F2 | `PERSISTENT` | **Blocker** | `.changelog/0119-omniroute-combo-empty-streaming-fallback.md` does not exist; Exit Condition #9 not met. | filesystem check |
| 0119-F3 | `EXTERNAL_BLOCKER` / `EVIDENCE_GAP` | **Blocker** | Live combo test on `:23456` (test target per current AGENTS.md; `:22000` is production and must not be touched) is not captured. | task file notes live test requirement but provides no safe proof |
| 0119-F4 | `NEW` | Debt | `isKnownNonClaudeStreamPayload` is imported in `validateQuality.ts:11` but never used. | `grep` result + read |
| 0119-F5 | `NEW` | Debt | The TSDoc header at `validateQuality.ts:50-55` still claims streaming responses are "passed through", which is now false after adding the OpenAI-compatible empty-streaming check. | read |

### Path to 100 (0119)

1. Fill the "Completion Evidence" section with real command output, exact file:line ranges, test names, and the executor/date.
2. Create `.changelog/0119-omniroute-combo-empty-streaming-fallback.md` per `.changelog/000-template.md` and run the rebuild command.
3. Resolve the live-test requirement on `:23456` or obtain an explicit operator waiver; never test on `:22000`.
4. Update the `validateQuality.ts` TSDoc header to describe bounded SSE peek + empty-streaming detection.
5. Remove the unused `isKnownNonClaudeStreamPayload` import.
6. Mark completed subtasks and Exit Conditions checkboxes.

---

## Task 0121 — Port LM Arena executor modernization (PR #6280)

### What was verified (fresh evidence)

| Check | Command | Result |
|-------|---------|--------|
| LMArena unit tests | `node --import tsx/esm --test tests/unit/lmarena-*.test.ts tests/unit/executor-lmarena.test.ts` | 38/38 pass, 9 suites |
| Typecheck | `npm run typecheck:core` | PASS (0 errors) |
| Lint on touched files | `npx eslint --max-warnings=0 <all 0121 files>` | Warnings only in `tests/unit/lmarena-validation.test.ts` for explicit `any` (3 warnings); no errors in production files |
| Full repo lint | `npm run lint` | Fails on pre-existing `visual-reference/` errors unrelated to this task |
| Executor wiring | content search | `LMArenaExecutor` imported and registered in `open-sse/executors/index.ts:52,147,215` |
| Registry wiring | content search | `lmarenaProvider` registered in `open-sse/config/providers/index.ts:174,349` |

### Implementation assessment

All required files are present and the new API contract is in place:

- `open-sse/executors/lmarena.ts` — replaced executor, uses `/nextjs-api/stream/create-evaluation`, `direct-battle` mode, `uuidv7` ids, `recaptchaV3Token`, TLS fetch via `lmarenaTlsClient.ts`.
- `open-sse/executors/lmarena/{cookie,models,stream,response}.ts` — helpers for cookie reconstruction, UUID resolution, SSE parsing, and response mapping.
- `open-sse/services/lmarenaTlsClient.ts` — Chrome-impersonating TLS client with streaming temp-file tail, abort-signal handling, Cloudflare-challenge detection, and proxy support.
- `open-sse/config/providers/registry/lmarena/directModels.ts` — 737-line static catalog plus `resolveLmarenaArenaId()`.
- `src/lib/providers/validation/webProvidersA.ts:611-678` — updated validation probe to the new endpoint/body.

The unit tests prove model UUID resolution, cookie reconstruction, request body shape, validation probe shape, and executor happy/error paths.

### Findings

| ID | Class | Severity | Summary | Evidence |
|----|-------|----------|---------|----------|
| 0121-F1 | `PERSISTENT` | **Blocker** | Multiple `as T` type assertions without `// SAFETY:` comments across the new production surface. This violates ts-rules Axiom 1 (Type Purity) and prevents a score ≥ 90 under zero-tolerance review. | `lmarena.ts:58,63,106,108,128,137`; `lmarena/cookie.ts:87,96`; `lmarena/stream.ts:21,71,94,103`; `lmarena/models.ts:248`; `lmarenaTlsClient.ts:130,153` |
| 0121-F2 | `EVIDENCE_GAP` | **Blocker** | `.changelog/0121-omniroute-lmarena-pr6280-port.md` is missing; executor deferred it to parent. Exit Condition #16 requires the ledger entry. | filesystem check |
| 0121-F3 | `EVIDENCE_GAP` | **Blocker** | "diff against upstream" evidence was not produced and the upstream path `/home/sephiroth/working/ganthritor/cybernetics-core/legacy/diegosouzapw-omniroute/` does not exist in this workspace, so port fidelity cannot be independently verified. | task requirement + filesystem check |
| 0121-F4 | `PERSISTENT` | Debt | Planning doc `0001-omniroute-web-providers-fix-plan.md` Fix 1 section still describes creating a registry entry that already exists; inconsistent with the banner truth-up already noting the executor is the real problem. | `docs/tasks/00-planning/0001-omniroute-web-providers-fix-plan.md:31-62` vs banner at `:18-20` |
| 0121-F5 | `NEW` | Debt | `tests/unit/lmarena-validation.test.ts` introduces new explicit `any` warnings while other LMArena test files use `/* eslint-disable @typescript-eslint/no-explicit-any */`. The warning is not an error but is avoidable new debt. | lint output |

### Path to 100 (0121)

1. Add `// SAFETY:` justifications to every `as T` in the touched production files, or refactor to use `isRecord`/type guards (preferred). Examples of safe refactor patterns already exist in the same files (e.g., `isRecord` guards).
2. Create `.changelog/0121-omniroute-lmarena-pr6280-port.md` per `.changelog/000-template.md` and run the rebuild command.
3. Provide the upstream diff evidence requested by the task (path to upstream source or a captured diff). If that source is unavailable, document the blocker and the alternative verification performed.
4. Update `docs/tasks/00-planning/0001-omniroute-web-providers-fix-plan.md` Fix 1 to remove the stale "criar registry" instructions and align with the banner truth-up.
5. Clean up `tests/unit/lmarena-validation.test.ts` explicit `any` usage to avoid introducing new warnings.
6. Mark completed subtasks and Exit Conditions checkboxes and re-run the full test/typecheck matrix.

---

## Cross-task findings

None. The two tasks touch disjoint files (`combo/validateQuality.ts` vs `executors/lmarena*` + `services/lmarenaTlsClient.ts` + `directModels.ts` + `webProvidersA.ts`).

---

## Reviewer recommendations

- Both tasks should remain in `docs/tasks/02-doing/`.
- Do **not** move either to `03-review/` until the blockers above are resolved.
- Do **not** run live tests on `localhost:22000` (production); use `localhost:23456` for any required live validation.
- Do **not** edit code as part of this review unless the user explicitly asks for a path-to-100 fix pass.
