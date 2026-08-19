# Task 0165: Sync OpenCode executor with upstream improvements

> **Status**: `[~]` In review — independent review complete (`builders`)
> **Priority**: 🟡 P1
> **Type**: `feature`
> **Origin**: Upstream comparison — 4 fork gaps: missing `client_metadata` strip (#1442), stale `parseEffortLevel()` (#8353), missing CLI header synthesis (#5997), stale Go registry effort-tier aliases.
> **Blocks**: Task 0166 (Zen diagnosis needs CLI headers).
> **Depends on**: —
> **Parallelism**: `serializable` with OpenCode executor; parallel-safe with Task 0164.
> **Review routing**: independent + provider/runtime review

---

## Objective

Port 4 upstream improvements preserving the fork's ALS concurrency fix:

1. **Strip `client_metadata`** — prevents 400 on Codex/Claude-CLI passthrough.
2. **Expand `parseEffortLevel()`** — 10 model families vs fork's 1.
3. **Port CLI header synthesis** (`opencodeHeaders.ts`) with env opt-in.
4. **Update Go registry** with ~30 effort-tier aliases.

Do NOT regress from ALS to upstream's race-prone instance field.

## Exit Conditions (GDD/TDD)

- [x] `parseEffortLevel()` covers 10 upstream families with tests.
- [x] `client_metadata` deleted before dispatch with test.
- [x] `opencodeHeaders.ts` exists and imported by executor.
- [x] ALS `requestFormat` preserved (regression test).
- [x] Go registry updated with effort-tier aliases.
- [x] `node --import tsx/esm --test tests/unit/opencode-*.test.ts` passes.
- [x] `npm run typecheck:core` passes.
- [x] Changelog draft prepared.

## Details

### Where

| File | Purpose |
|------|---------|
| `open-sse/executors/opencode.ts` | Modify — merge upstream preserving ALS. |
| `open-sse/utils/opencodeHeaders.ts` | Create — CLI header synthesis. |
| `open-sse/config/providers/registry/opencode/go/index.ts` | Modify — effort-tier aliases. |
| `references/diegosouzapw-omniroute/open-sse/executors/opencode.ts` | Read. |
| `references/diegosouzapw-omniroute/open-sse/utils/opencodeHeaders.ts` | Read. |

## ⛔ Anti-Hallucination Guardrails

> [!CAUTION]
> Do NOT regress ALS fix. Verify effort-tier families against upstream source.

## 📋 Completion Evidence (preenchido pelo agente executor)

- **Files**:
  - `open-sse/utils/opencodeHeaders.ts` (created)
  - `open-sse/executors/opencode.ts` (modified)
  - `open-sse/executors/default.ts` (modified)
  - `open-sse/config/providers/registry/opencode/go/index.ts` (modified)
  - `tests/unit/opencode-strip-client-metadata-1442.test.ts` (created)
  - `tests/unit/opencode-cli-headers-synthesis-5997.test.ts` (created)
  - `tests/unit/opencode-go-effort-aliases-8353.test.ts` (created)
  - `tests/unit/refactor-opencodeHeaders.test.ts` (created)
  - `tests/unit/opencode-als-concurrency.test.ts` (created)
- **Tests**:
  - `node --import tsx/esm --test tests/unit/opencode-*.test.ts tests/unit/refactor-opencodeHeaders.test.ts` — 191 tests passed (0 failed).
  - `npm run typecheck:core` — passed with 0 errors.
  - `npx eslint open-sse/utils/opencodeHeaders.ts open-sse/executors/opencode.ts open-sse/executors/default.ts open-sse/config/providers/registry/opencode/go/index.ts tests/unit/opencode-strip-client-metadata-1442.test.ts tests/unit/opencode-cli-headers-synthesis-5997.test.ts tests/unit/opencode-go-effort-aliases-8353.test.ts tests/unit/refactor-opencodeHeaders.test.ts tests/unit/opencode-als-concurrency.test.ts` — 0 errors, 0 warnings.
- **ALS proof**: `tests/unit/opencode-als-concurrency.test.ts` (`OpencodeExecutor — AsyncLocalStorage Concurrency Isolation (ALS)`) verifies concurrent requests of different formats on the same executor instance without format cross-contamination.
- **Changelog**: Canonical entry `.changelog/20260814-142036-0165-sync-opencode-executor-upstream-improvements-builders.md` created; `CHANGELOG.md` rebuilt (78 entries).
- **Agent/date**: `builders` / 2026-08-14

## 🔁 Review/Fix Ledger

- **Execution Engineer session/task ID**: `ses_ffed9abfbffeUBdu1DHaLuQ0TY`
- **Execution Reviewer session/task ID**: `ses_ffeb4e1bbffe5vGtYZoHPBV38V`
- **Initial report / score**: `docs/reports/review/20260814-task-0165-final-review.md` — `100/100`, `APPROVED`
- **Promotion**: Promoted to `03-review/` by independent reviewer `ses_ffeb4e1bbffe5vGtYZoHPBV38V`.

### Changelog Draft

```markdown
### Added
- `open-sse/utils/opencodeHeaders.ts`: Created shared OpenCode CLI header forwarding and synthesis helper with opt-in `OPENCODE_SYNTHESIZE_CLI_HEADERS` support for datacenter/VPS environments (#5997).
- `tests/unit/opencode-als-concurrency.test.ts`: Added concurrency regression tests verifying AsyncLocalStorage isolation for `requestFormat`.
- `tests/unit/opencode-strip-client-metadata-1442.test.ts`: Added test for stripping `client_metadata` on OpenCode executor path (#1442).
- `tests/unit/opencode-cli-headers-synthesis-5997.test.ts`: Added test for CLI header synthesis (#5997).
- `tests/unit/opencode-go-effort-aliases-8353.test.ts`: Added test for 10-family effort aliases on `opencode-go` (#8353).
- `tests/unit/refactor-opencodeHeaders.test.ts`: Added unit tests for header forwarding.

### Changed
- `open-sse/executors/opencode.ts`: Stripped `client_metadata` before upstream dispatch, expanded `parseEffortLevel()` to 10 model families, and integrated CLI header synthesis while preserving AsyncLocalStorage per-request format isolation.
- `open-sse/executors/default.ts`: Refactored client header forwarding to use shared `forwardOpencodeClientHeaders`.
- `open-sse/config/providers/registry/opencode/go/index.ts`: Updated model registry with ~30 effort-tier aliases (DeepSeek V4 Flash/Pro, GLM-5.2, MiMo-V2.5, Grok 4.5, Hunyuan3, Kimi K3, Qwen 3.6/3.7).
```

## 🔍 Review Trail (preenchido pelo reviewer)

- **Reviewer**: `BUILDER_CONTEXT` / `builders` (independent reviewer, parent lane)
- **Verdict**: **APPROVED**
- **Score**: **100/100**
- **Report**: `docs/reports/review/20260814-task-0165-final-review.md`
- **Evidence**: Fresh required OpenCode unit glob passed (191/191), `npm run typecheck:core` passed, and scoped ESLint passed with 0 errors and 0 warnings. The six verification objectives, canonical changelog existence/indexing, and ALS concurrency isolation were independently verified.
- **Promotion**: Moved to `docs/tasks/03-review/0165-omniroute-opencode-executor-upstream-sync.md`.
