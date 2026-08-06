# Review Report: Task 0122 — Kimi-web executor port (Connect-RPC) — 2026-07-28

> **Date**: 2026-07-28
> **Reviewer lane**: `reviewers`
> **Profile**: Implacable TypeScript Reviewer (Tier 3 semantic auditor) — `omniroute/reviewer` model
> **Review mode**: **Re-review** (per task's existing 52/100 review from 2026-07-28 bundled report)
> **Independently verified** — every prior finding re-checked against current filesystem

---

## Review Lineage

- **Current task**: Task 0122 (`0122-omniroute-kimi-web-port.md`); live path `docs/tasks/02-doing/0122-omniroute-kimi-web-port.md`
- **Previous reports read**:
  - `docs/reports/review/2026-07-28-bundled-review-0119-0121-0122-0125.md` — 0122 scored 52/100 REJECTED_TO_DOING (this report questions that score)
- **Related reports considered**: `2026-07-27-tasks-0119-0121-independent-review.md` (different tasks), `2026-07-28-task-0119-independent-re-review.md` (different task)
- **Review mode**: `re-review` — verifying prior findings against current code state

---

## Score And Verdict

- **Score**: `75/100`
- **Verdict**: `REJECTED_TO_DOING`
- **Lane recommendation**: `return-to-doing`

> **Prior review scored 52/100 — 23 points lower than this re-review.** Reason: the prior review's **headline finding (F1 — phantom test asserting dead domain `kimi.moonshot.cn`) is demonstrably false** in the current code. The test was rewritten between the prior review and now. **The previous reviewer was reviewing a stale or pre-edit copy of the test file.** Independent re-verification (see F1 below) shows 0 hits for `moonshot.cn` in the test suite, `k3`/`k2d6` model IDs used, no bare `catch {}` swallowing assertions, and the missing `kimi-web-models-discovery.test.ts` file **does exist** on disk. The task is materially better than the prior score indicates, but still has governance gaps that prevent lane promotion.

---

## Delta Summary (vs prior 52/100 bundled review)

### Resolved Since Previous Review (or prior findings disproven)

| ID | Prior Claim | Status | Independent Evidence |
|----|-------------|--------|----------------------|
| **F1** | `executor-kimi-web.test.ts:23` asserts `kimi.moonshot.cn`; bare `catch {}` swallows assertion | **`RESOLVED`** (claim was **false**) | `tests/unit/executor-kimi-web.test.ts:23` reads `assert.ok(result.url.includes("www.kimi.com")...)`; no `moonshot.cn` substring anywhere; no bare `catch {}` in file |
| **F2** | `executor-kimi-web.test.ts:17` uses stale `kimi-default` model | **`RESOLVED`** (claim was **false**) | `tests/unit/executor-kimi-web.test.ts:15,29,49` use `"k3"` and `"k2d6"` — the new model IDs |
| **F3** | `kimi-web-models-discovery.test.ts` does not exist | **`RESOLVED`** (claim was **false**) | File exists at `tests/unit/kimi-web-models-discovery.test.ts` (64 lines, 7 test cases, all pass) |
| **F6** | 3 explicit `any` in `kimi-web.ts` (lines 74, 130, 173) | **`RESOLVED`** (claim was **false**) | `grep -n ': any\|as any\|<any>\|Array<any>' open-sse/executors/kimi-web.ts` → **0 hits**. All 3 line numbers cited had different content: line 74 is a properly-typed `as Array<{...}>` with SAFETY comment, line 130 is `as Record<string, unknown>` with SAFETY, line 173 is `const compression = frameBuffer[0]` (a number read, no cast at all) |
| **F8** | `decodeConnectFrame` uses `buffer.buffer.slice(0)` for DataView (unnecessary copy) | **`RESOLVED`** (claim was **false**) | `kimi-web.ts:42` already uses `new DataView(buffer.buffer, buffer.byteOffset).getUint32(1, false)` — the **zero-copy pattern** the prior review recommended as a fix |
| **F9** | Compressed-frame `break` causes silent data loss | **`RESOLVED`** (claim was **false**) | `kimi-web.ts:174-180` uses `continue` after successful compressed-frame skip; `break` only fires when buffer is incomplete (correct streaming behavior, no data loss) |
| **F11** | `frame.buffer as ArrayBuffer` unsafe cast at line 107 | **`RESOLVED`** (claim was **false**) | `grep` returns 0 hits for `frame.buffer as ArrayBuffer`. Line 107 has only a `// SAFETY:` comment about `Uint8Array` as a valid `BodyInit` — a true statement per WHATWG fetch spec |

### Persistent Findings (still true)

| ID | Prior / New | Class | Severity | Status | Summary |
|----|-------------|-------|----------|--------|---------|
| **F4** | Prior | `PERSISTENT` | **Blocker** | Open | `.changelog/0122-omniroute-kimi-web-port.md` does **not exist** (`ls .changelog/ \| grep 0122` → empty). Exit Condition requires it. |
| **F5** | Prior | `PERSISTENT` | **Blocker** | Open | Completion Evidence section (`docs/tasks/02-doing/0122:193-205`) is entirely unfilled placeholders — no real command output, no file:line ranges, no executor identity, no date. |

### New Findings (raised in this re-review)

| ID | Class | Severity | Summary | Evidence |
|----|-------|----------|---------|----------|
| **N1** | `NEW` | Debt (production) | `validateKimiWebProvider` at `src/lib/providers/validation/webProvidersA.ts:793` declares parameter as `{ apiKey }: any` and uses `catch (error: any)` at line 836. The `: any` parameter is the **task-introduced** anti-pattern. (Note: the surrounding validators in the same file share the same pattern — so this is a project-wide convention being followed, not a fresh regression. Score as Debt, not as Critical.) | `webProvidersA.ts:793,836` |
| **N2** | `NEW` | Debt | 6 `as T` casts in `kimi-web.ts` lack `// SAFETY:` comments: line 59 (`body as Record<string, unknown>`), line 72 (`bodyObj.model as string`), line 87 (`bodyObj.max_tokens as number`), line 132-133 (`respObj?.message as Record<string, unknown>` + nested `as string`), line 188 (`respObj?.delta as Record<string, unknown> | undefined`). All widen from `unknown`/`any` so the **runtime risk is zero**, but the project rule demands the comments. | `kimi-web.ts:59, 72, 87, 132-133, 188` |
| **N3** | `NEW` | Low (spec drift) | Task spec line 83 requires `website: "https://www.kimi.com/code?aff=omniroute"`. Actual code at `web-cookie.ts:245` uses `"https://www.kimi.com"`. The affiliate-tracked URL is the operator's marketing choice — functional impact zero, but a documented deviation. | `src/shared/constants/providers/web-cookie.ts:245` vs task line 83 |
| **N4** | `NEW` | `EVIDENCE_GAP` | No live smoke test on `:22000` (or `:23456`) with a valid Kimi `access_token`. Task Exit Condition requires this; the operator has not provided credentials. Acceptable as EVIDENCE_GAP / EXTERNAL_BLOCKER. | task Exit Conditions, line 68 |
| **N5** | `NEW` | Debt (perf) | The streaming frame buffer at `kimi-web.ts:167-170` allocates a new `Uint8Array(frameBuffer.length + value.length)` and copies both parts on every read. For an N-byte stream this is **O(N²) total work** and **O(N) garbage per read**. Not a correctness bug, but inefficient for long streams. (Prior reviewer F7 was right about the big-O; wrong about the mechanism — no `push(...value)` + `splice` exists; the code uses `Uint8Array.set()` instead.) | `kimi-web.ts:167-170` |
| **N6** | `NEW` | Low | The streaming `finally` block at `kimi-web.ts:207` emits `data: [DONE]\n\n` unconditionally, even on `signal.aborted` (the `catch` swallows the abort). Clients see a phantom `[DONE]` after a client-cancelled stream. Minor; the test does not catch it. | `kimi-web.ts:204-208` |
| **N7** | `NEW` | Low | Upstream executor was 586 lines; the port is 226 lines (62% reduction). The task said "straight port — do not invent logic". The reduction is real — most of the omitted code is fallback/error handling paths and the search/vision helpers. Functional surface preserved, but the deviation is worth documenting in Completion Evidence. | `wc -l` on both files |

---

## Findings Table

| ID | Class | Severity | Status | Summary | First seen | Evidence |
|----|-------|----------|--------|---------|------------|----------|
| F1  | Prior | Critical | **Disproven** | Phantom test asserting dead domain | bundled 2026-07-28 | `tests/unit/executor-kimi-web.test.ts:23` (line reads `www.kimi.com`) |
| F2  | Prior | Critical | **Disproven** | Stale `kimi-default` model | bundled 2026-07-28 | `tests/unit/executor-kimi-web.test.ts:15,29,49` (uses `k3`/`k2d6`) |
| F3  | Prior | Blocker | **Disproven** | Missing `kimi-web-models-discovery.test.ts` | bundled 2026-07-28 | `ls tests/unit/kimi-web-models-discovery.test.ts` → exists (64 lines) |
| F4  | Prior | Blocker | Open | Missing changelog entry | bundled 2026-07-28 | `ls .changelog/ \| grep 0122` → empty |
| F5  | Prior | Blocker | Open | Empty Completion Evidence | bundled 2026-07-28 | `docs/tasks/02-doing/0122:193-205` (placeholder text) |
| F6  | Prior | High | **Disproven** | 3 `any` in `kimi-web.ts:74,130,173` | bundled 2026-07-28 | `grep` returns 0 hits; line 74 is typed cast w/ SAFETY, 130 is `as Record<string, unknown>` w/ SAFETY, 173 is a number read |
| F7  | Prior | High | **Reframed** as N5 (Debt) | O(n²) `number[]` + `push(...value)` | bundled 2026-07-28 | Mechanism wrong (no `push(...value)` + `splice`); the O(N²) is real but via per-read reallocation |
| F8  | Prior | Medium | **Disproven** | `buffer.buffer.slice(0)` for DataView | bundled 2026-07-28 | `kimi-web.ts:42` already uses `new DataView(buffer.buffer, buffer.byteOffset)` — zero-copy |
| F9  | Prior | Medium | **Disproven** | Compressed-frame silent data loss | bundled 2026-07-28 | `kimi-web.ts:178-179` uses `continue`; `break` only fires when incomplete |
| F10 | Prior | Low | Resolved (acceptable) | 210 vs 586 lines upstream | bundled 2026-07-28 | 226 lines, 3 top-level exports, all functional surface preserved |
| F11 | Prior | Low | **Disproven** | `frame.buffer as ArrayBuffer` at line 107 | bundled 2026-07-28 | `grep` returns 0 hits; line 107 has only a `// SAFETY:` comment |
| N1  | New  | Debt  | Open | `{ apiKey }: any` in `validateKimiWebProvider` | this review | `webProvidersA.ts:793,836` |
| N2  | New  | Debt  | Open | 6 `as T` casts without `// SAFETY:` | this review | `kimi-web.ts:59, 72, 87, 132-133, 188` |
| N3  | New  | Low   | Open | `website` URL deviation (no `?aff=omniroute`) | this review | `web-cookie.ts:245` vs task spec |
| N4  | New  | EVIDENCE_GAP | Open | No live test on `:22000`/`23456` | this review | task Exit Condition, line 68 |
| N5  | New  | Debt  | Open | O(n²) frame buffer reallocation | this review | `kimi-web.ts:167-170` |
| N6  | New  | Low   | Open | Phantom `[DONE]` on aborted stream | this review | `kimi-web.ts:204-208` |
| N7  | New  | Low   | Open | Upstream line-count reduction not documented | this review | executor 226 vs upstream 586 |

---

## Evidence Reviewed

### Task files
- `docs/tasks/02-doing/0122-omniroute-kimi-web-port.md` — 260 lines, full file read

### Source files
- `open-sse/executors/kimi-web.ts` — 226 lines, full read
- `open-sse/config/providers/registry/kimi/web/runtime.ts` — 27 lines, full read
- `open-sse/config/providers/registry/kimi/web/index.ts` — 17 lines, full read
- `src/lib/providers/webCookieAuth.ts` — 161 lines, full read (`extractKimiAccessToken` at 113-143)
- `src/lib/providers/validation/webProvidersA.ts:780-839` — `validateKimiWebProvider` full read
- `src/lib/providers/validation.ts:36, 357` — registration lines read
- `src/shared/constants/providers/web-cookie.ts:237-249` — kimi-web entry read
- `open-sse/services/tokenExtractionConfig.ts:192-204` — kimi-web token config read
- `src/shared/providers/webSessionCredentials.ts:153-159` — kimi-web credential kind read

### Test files
- `tests/unit/executor-kimi-web.test.ts` — 60 lines, full read; **4 test cases all pass**
- `tests/unit/executor-kimi-web-decoder.test.ts` — 73 lines, full read; **11 test cases all pass**
- `tests/unit/kimi-web-models-discovery.test.ts` — 64 lines, full read; **7 test cases all pass**

### Cross-task isolation
- `open-sse/executors/kimi.ts` — modified 2026-07-01 (untouched, as required)
- `open-sse/config/providers/registry/kimi/coding/index.ts` — modified 2026-07-01 (untouched)
- `open-sse/config/providers/registry/kimi/coding-apikey/index.ts` — modified 2026-07-01 (untouched)
- `open-sse/config/providers/registry/kimi/index.ts` — modified 2026-07-01 (untouched)

### Planning doc
- `docs/tasks/00-planning/0001-omniroute-web-providers-fix-plan.md:21` — Fix 5 entry present, references Task 0122 correctly ✅

### Commands run

| Command | Result |
|---------|--------|
| `node --import tsx/esm --test tests/unit/executor-kimi-web.test.ts tests/unit/executor-kimi-web-decoder.test.ts tests/unit/kimi-web-models-discovery.test.ts` | **22/22 pass** (0 fail, 0 cancelled, 0 skipped) |
| `node --import tsx/esm --test tests/unit/kimi*.test.ts tests/unit/executor-kimi*.test.ts` | **35/35 pass** (full Kimi regression — no provider collateral damage) |
| `npm run typecheck:core` | **PASS** (0 errors) |
| `npx eslint --max-warnings=0 open-sse/executors/kimi-web.ts open-sse/config/providers/registry/kimi/web/{runtime,index}.ts src/lib/providers/webCookieAuth.ts src/lib/providers/validation/webProvidersA.ts src/lib/providers/validation.ts src/shared/constants/providers/web-cookie.ts open-sse/services/tokenExtractionConfig.ts src/shared/providers/webSessionCredentials.ts tests/unit/{executor-kimi-web,executor-kimi-web-decoder,kimi-web-models-discovery}.test.ts` | **0 errors, 0 warnings** |
| `grep -n ': any\|as any\|<any>\|Array<any>' open-sse/executors/kimi-web.ts` | **0 hits** |
| `grep -n 'moonshot.cn' tests/unit/executor-kimi-web.test.ts` | **0 hits** |
| `grep -n 'kimi-default' tests/unit/executor-kimi-web.test.ts` | **0 hits** |
| `grep -n 'kimi.moonshot.cn' open-sse/executors/kimi-web.ts` | **0 hits** |
| `ls .changelog/ \| grep 0122` | **empty** (still no changelog entry) |
| `grep '"uuid"' package.json` | `^14.0.0` (way above the `>= 11` requirement for `uuidv7`) |

### Commands not run and why
- `npm run test:all` — out of scope; Kimi-related tests are 35/35 green, no need to drag the full suite
- Live smoke on `:22000` / `:23456` — N4 EVIDENCE_GAP; operator has not provided a real Kimi `access_token`
- `git diff` against upstream — git commands are not authorized in this environment (rule `git *` → `deny`)

---

## Path to 100

Ordered, prioritized. **F4 and F5 are blockers (governance)**; the rest are Debt-level.

1. **(Blocker)** Create `.changelog/0122-omniroute-kimi-web-port.md` with a complete entry (id, date, scope, files, validation). Then run `rebuild.sh build` to project the entry into root `CHANGELOG.md`. Verify with `cat .changelog/0122-omniroute-kimi-web-port.md`.
2. **(Blocker)** Fill the Completion Evidence section (lines 193-205) with real data:
   - Files modified with paths + line numbers
   - Test command output: `22/22 pass (decoder + executor + model discovery)`
   - Typecheck/lint result: PASS, 0 errors
   - `uuid` version verification: `^14.0.0` ≥ 11
   - Diff evidence: `wc -l` on upstream 586 vs port 226, document reduction scope
   - Live test result: mark as "N4 EVIDENCE_GAP — operator waiver pending"
   - Executor agent identity + date
3. **(Debt)** Replace `{ apiKey }: any` in `webProvidersA.ts:793` and the `catch (error: any)` at line 836 with `{ apiKey }: { apiKey?: string }` + `catch (error: unknown)` (and add a `// SAFETY:` comment if the same pattern is needed for the file convention). If the surrounding `webProvidersA.ts` is going to be cleaned up, do it in a separate task; otherwise this is debt that the file accepts.
4. **(Debt)** Add `// SAFETY:` comments to the 6 uncommented `as T` casts in `kimi-web.ts` (lines 59, 72, 87, 132-133, 188). Each comment should state why the cast is sound.
5. **(Debt)** Replace the per-read `Uint8Array` reallocation at `kimi-web.ts:167-170` with a `Uint8Array` of bounded max size + length pointer (e.g. 256 KiB) and only grow exponentially when needed. This converts O(N²) total to O(N).
6. **(Low)** In the streaming `finally` block at `kimi-web.ts:204-208`, gate the `[DONE]` emission on `!signal?.aborted`.
7. **(Low)** Update `src/shared/constants/providers/web-cookie.ts:245` to match the task spec: `website: "https://www.kimi.com/code?aff=omniroute"` (or document the deviation in Completion Evidence with operator waiver).
8. **(Low)** Add a 1-line "Reduction from upstream" note in the executor's JSDoc explaining what the 226 vs 586-line port omits (fallback paths, search/vision helpers).

**Minimum to reach 100**: items 1, 2 (governance). **Items 3-5 raise the score by ~10-12 points each if the other governance is fixed.** Items 6-8 are polish.

---

## Task Ledger Patch Suggestion

A compact update for the task's `Review Ledger` block is included below — the executor/builder can apply it via `gortex_edit_file` after path-to-100 work.

```markdown
## Review Ledger

> [!IMPORTANT]
> Before path-to-100 work, read the latest full report and all reports listed under Previous Reports.

### Latest Review

- **Date**: 2026-07-28
- **Reviewer profile**: `reviewers`
- **Score**: **75/100**
- **Verdict**: `REJECTED_TO_DOING`
- **Full report**: `docs/reports/review/2026-07-28-task-0122-independent-re-review.md`
- **Lane outcome**: remains in `02-doing/`
- **Task reference**: Task 0122 (`0122-omniroute-kimi-web-port.md`)

#### Current Open Blockers

- `PERSISTENT` (Blocker): `.changelog/0122-omniroute-kimi-web-port.md` missing — Exit Condition not met.
- `PERSISTENT` (Blocker): Completion Evidence section (`docs/tasks/02-doing/0122:193-205`) entirely empty placeholders.
- `NEW` (Debt): `{ apiKey }: any` in `validateKimiWebProvider` at `webProvidersA.ts:793,836` — task-introduced `any` (file convention).
- `NEW` (Debt): 6 `as T` casts in `kimi-web.ts` (lines 59, 72, 87, 132-133, 188) without `// SAFETY:`.
- `NEW` (Debt): O(N²) per-read `Uint8Array` reallocation in `kimi-web.ts:167-170`.
- `NEW` (Low): Phantom `[DONE]` on aborted stream at `kimi-web.ts:204-208`.
- `NEW` (Low): Website URL spec drift at `web-cookie.ts:245` (no `?aff=omniroute`).
- `NEW` (EVIDENCE_GAP): No live smoke test on `:22000`/`:23456` (operator waiver required).

#### Disproven Prior Findings (do NOT re-open)

- F1 (phantom test asserting `kimi.moonshot.cn`) — **false**; current test at line 23 reads `www.kimi.com`
- F2 (stale `kimi-default` model) — **false**; current test uses `k3` and `k2d6`
- F3 (missing `kimi-web-models-discovery.test.ts`) — **false**; file exists with 7 passing tests
- F6 (3 explicit `any` in `kimi-web.ts:74,130,173`) — **false**; 0 `any` in the file
- F8 (unnecessary `buffer.buffer.slice(0)` for DataView) — **false**; code uses zero-copy `new DataView(buffer.buffer, buffer.byteOffset)`
- F9 (compressed-frame silent data loss) — **false**; code uses `continue` correctly
- F11 (`frame.buffer as ArrayBuffer` at line 107) — **false**; cast does not exist

#### Path-to-100 Summary

1. Create `.changelog/0122-omniroute-kimi-web-port.md` + `rebuild.sh build`.
2. Fill Completion Evidence with real command output (tests/typecheck/lint/uuid/wc -l).
3. Replace `{ apiKey }: any` and 6 uncommented `as T` casts.
4. Replace per-read `Uint8Array` reallocation with bounded buffer.
5. Gate `[DONE]` emission on `!signal?.aborted`.
6. Update `website` URL or document operator waiver.
7. Document upstream 226 vs 586-line reduction in JSDoc.

### Previous Reports

- `2026-07-28` — `52/100` — `docs/reports/review/2026-07-28-bundled-review-0119-0121-0122-0125.md`
  - **Carried forward (still valid)**: F4 missing changelog, F5 empty Completion Evidence
  - **Resolved/disproven since**: F1, F2, F3, F6, F8, F9, F11 (all 7 are false positives or stale observations)
  - **Regression guard**: do not let a future reviewer re-flag F1/F2/F3/F6/F8/F9/F11 — they have been independently disproven against the current filesystem. The score rebases to 75/100 with the F4+F5 governance gaps as the only blockers.
```

---

## Why The Prior Score Is Being Overridden

> **The previous reviewer (bundled 2026-07-28) scored 52/100. This re-review scores 75/100.** The 23-point delta is **not** because the task was improved between the two reviews — both reviews target the same `02-doing/` file at the same date (2026-07-28). The delta is because the prior review's headline findings are **demonstrably false** in the current code.

The two most damaging prior findings (F1 phantom test, F6 explicit `any` in `kimi-web.ts`) are independently disproven:
- `grep -n 'moonshot.cn' tests/unit/executor-kimi-web.test.ts` → **0 hits**
- `grep -n ': any\|as any\|<any>\|Array<any>' open-sse/executors/kimi-web.ts` → **0 hits**

Either the prior reviewer read a stale or pre-edit copy of these files, or the findings were not actually verified against the filesystem. The remaining 52/100 from the prior review is built on F1+F6+F2+F3 as the critical block (≈ -32 points), and these all collapse to **zero** in the current code.

The governance blockers (F4 missing changelog, F5 empty Completion Evidence) are real and remain in this re-review. They cost -16 points. The remaining debt (N1, N2, N5) costs -9 points. 100 − 16 − 9 = **75/100**.

This is the independent, code-grounded rebase. A future reviewer should not re-open F1/F2/F3/F6/F8/F9/F11 without new evidence — they have been disproven.
