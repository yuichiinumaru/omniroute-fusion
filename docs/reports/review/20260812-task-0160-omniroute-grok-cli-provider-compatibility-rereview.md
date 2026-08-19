# Re-review Report: Task 0160 — Grok CLI provider compatibility

## Review identity and scope

- **Task**: `docs/tasks/02-doing/0160-omniroute-grok-cli-provider-compatibility.md`
- **Review date**: 2026-08-12
- **Mode**: independent re-review under the operator binary law.
- **Rule**: `90–100 = APPROVED`; `<90 = REJECTED`.
- **Previous report**: [`20260812-task-0160-omniroute-grok-cli-provider-compatibility-review.md`](./20260812-task-0160-omniroute-grok-cli-provider-compatibility-review.md), score 78/100, rejected.
- **Scope**: prior findings F1–F3, current resolver/executor implementation, provider registries, focused compatibility tests, typecheck, and scoped lint.
- **Exclusions honored**: no live provider/OAuth request, no production credentials, no `:22000`, no git, no sub-reviewers, and no broad repository-wide lint claim.

## Score and verdict

### **Score: 98/100 — APPROVED; promote to `docs/tasks/03-review/`**

The prior rejection findings are closed in the current source and tests. Explicit unknown `grok-cli/<model>` combinations are now rejected before dispatch in both the request resolver and executor, while a known registered model still reaches a mocked upstream 400 and retains a distinct remote classification. Executor-boundary response construction sanitizes token-shaped upstream details while preserving provider/model context. The source-backed provider separation and no-speculative-alias constraints remain intact.

Live availability remains unknown, explicitly and correctly; this is not represented as a live compatibility claim.

## Score breakdown

| Dimension | Points | Notes |
|---|---:|---|
| Provider separation and matrix accuracy | 20/20 | OAuth `grok-cli` remains separate from API-key `xai`; `grok-build-0.1` remains under `xai`; no speculative `grok-4.6`. |
| Known-model endpoint/auth/header/target contract | 19/20 | `/v1/responses`, session headers, registered model IDs, Responses defaults, and Composer fallback remain covered. One point reserved because live availability is intentionally unverified. |
| Defaults, invalid fixture, and alias discipline | 15/15 | Composer default is preserved; `grok-build` is an explicit negative case; no unsupported alias was added. |
| Local unknown-ID rejection vs remote rejection | 20/20 | Resolver and executor both reject `grok-build` locally with HTTP 400, provider/model context, `unknown_model`, and zero fetches; known `grok-4.5` reaches the mocked remote 400 once and is not classified as `unknown_model`. |
| Sanitized provider/model-aware errors | 14/15 | Remote 400 response is rebuilt through `sanitizeErrorMessageForResponse` and `createErrorResult`; the secret-shaped token is absent and provider/model context remains. Live upstream-body diversity is not claimed. |
| Verification status and regression evidence | 10/10 | Fresh 24/24 focused pair, core typecheck, and scoped ESLint pass. Prior full Grok/OAuth regression evidence remains recorded; no live request was made. |
| **Total** | **98/100** | **APPROVED** |

## Prior finding reconciliation

### F1 — RESOLVED: explicit unknown `grok-cli/<model>` is rejected before dispatch

Current `src/sse/handlers/chatHelpers.ts` checks `hasKnownProviderModel("grok-cli", modelInfo.model)` after model resolution and returns a bounded HTTP 400 error for an unregistered explicit provider/model pair. The message names both `grok-cli` and `grok-build` and does not label the failure as OAuth.

Current `open-sse/executors/grok-cli.ts` independently validates the requested model against the Grok CLI registry before calling `super.execute()`. It returns `createErrorResult(400, ..., "unknown_model", "invalid_request_error")` for an unregistered ID, so direct executor callers also cannot dispatch an unknown Grok CLI model.

`tests/unit/grok-cli-provider-compatibility.test.ts` now proves both layers. The resolver test replaces `fetch`, calls `resolveModelOrError("grok-cli/grok-build", ...)`, asserts the local 400 and provider/model context, and records zero fetches. The executor test performs the same no-fetch proof and asserts `unknown_model`. `tests/unit/grok-cli-strip-params.test.ts` carries the explicit negative fixture at the execute boundary as well.

### F2 — RESOLVED: remote 400 details are sanitized at the executor boundary

`GrokCliExecutor.execute()` reads the non-OK upstream body, extracts the bounded message, passes it through `sanitizeErrorMessageForResponse`, adds `grok-cli/<requestedModel>` context, and rebuilds the response with `createErrorResult`. The resulting response preserves the upstream status and remote error classification while not returning the original body verbatim.

The test `client-facing remote 400 sanitizes token-shaped details at the executor boundary` uses the required `sk-must_not_leak_12345` token in the mocked upstream message and access token. It asserts HTTP 400, absence of that token from the client-facing response, retained `grok-cli` and `grok-4.5` context, and retained `model not found` semantics. The prior permissive assertion that accepted leakage is gone.

### F3 — RESOLVED: local-vs-remote distinction is paired at the required boundary

The current compatibility file contains adjacent local and remote proofs: unknown `grok-cli/grok-build` is rejected before fetch, while known `grok-4.5` invokes the mocked fetch exactly once and returns a 400 that is explicitly not `unknown_model`. The tests therefore distinguish local catalog rejection from remote model-availability rejection rather than merely testing transform forwarding.

## Source and catalog invariants rechecked

- `grok-cli` remains OAuth, alias `gc`, specialized `grok-cli` executor, endpoint `https://cli-chat-proxy.grok.com/v1/responses`, and registered models `grok-4.5` and `grok-composer-2.5-fast`.
- `xai` remains API-key based with the generic executor and `grok-build-0.1`; no cross-provider migration occurred.
- `grok-4.6` is absent; no unsupported alias was invented from the incident report.
- Composer remains the missing-model default for Grok CLI transforms.
- No OAuth/login, Responses/tool-call, or unrelated provider behavior was changed by the remediation evidence reviewed here.

## Fresh verification

### Focused pair — PASS

Command:

```bash
DATA_DIR=$(mktemp -d) DISABLE_SQLITE_AUTO_BACKUP=true node --import tsx/esm --test \
  tests/unit/grok-cli-provider-compatibility.test.ts \
  tests/unit/grok-cli-strip-params.test.ts
```

Result: **24 passed, 0 failed, 0 skipped**.

The process emitted non-fatal SQLite migration diagnostics during isolated startup (`database is locked` / an already-present migration constraint), but the tests used an isolated temporary data directory and all 24 assertions passed. No provider request was made.

### Core typecheck — PASS

```bash
npm run typecheck:core
```

Result: **exit 0**, no type errors.

### Scoped lint — PASS

```bash
npx eslint \
  tests/unit/grok-cli-provider-compatibility.test.ts \
  tests/unit/grok-cli-strip-params.test.ts \
  open-sse/config/providers/registry/grok-cli/index.ts \
  open-sse/config/providers/registry/xai/index.ts \
  open-sse/executors/grok-cli.ts \
  open-sse/config/grokBuild.ts \
  src/sse/handlers/chatHelpers.ts \
  open-sse/services/model.ts \
  src/sse/services/model.ts
```

Result: **exit 0**, no lint output/errors.

## Residual risk and boundaries

- Live provider/model availability remains **unknown**. This re-review makes no claim that `grok-4.5`, Composer, or any newly reported model is currently accepted by the live proxy.
- The incident's live root cause is therefore not concluded; this task closes the local-vs-remote classification and secret-safety contract using source evidence and mocks.
- Repository-wide lint was not rerun and is not claimed green; scoped lint is the applicable verification for this task.
- Startup migration diagnostics were observed during the isolated test process but did not affect the focused assertions or trigger a task-owned failure.

## Reviewer conclusion

Task 0160 is **APPROVED at 98/100** under the operator binary law. Findings F1, F2, and F3 from the 78/100 review are resolved with production-path local rejection, paired remote-400 classification, and token-negative executor-boundary sanitization. The task is eligible to move from `docs/tasks/02-doing/` to `docs/tasks/03-review/`.
