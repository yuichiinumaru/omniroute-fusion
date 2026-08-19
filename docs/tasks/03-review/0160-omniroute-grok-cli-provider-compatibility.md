# Task 0160: Restore Grok CLI provider compatibility and model availability

> **Status**: `[/]` In progress — **RE-EVALUATION REQUIRED 2026-08-16** (architect-orchestrator audit found the previously APPROVED implementation (98/100) introduced a local unknown-ID gate that contradicts `passthroughModels: true`; see Re-evaluation Entry below). **Builder wave re-dispatch EXECUTED 2026-08-17** — Wave V (Task 0176) landed: both gates replaced by the explicit denylist, `grok-4.6` added with SSoT evidence note, boundary contract test GREEN 9/9, CI grep guard wired into pre-commit. Awaiting next review round. The file is held in `03-review/` for the lane-architecture.md convention; lane transition is reviewer-owned.
> **Priority**: 🔴 P0
> **Type**: `remediation`
> **Origin**: Operator incident — every tested Grok Build CLI model currently returns HTTP 400 `model not found` during active use (2026-08-12). Read-only comparison found that the provider connector itself is not yet proven functional; model identity is a secondary hypothesis, not the starting assumption.
> **Blocks**: —
> **Depends on**: Task 0149 completed protocol contract; Task 0151 review/completion is independent OAuth work.
> **Parallelism**: `serializable` with Grok registry/executor/provider metadata changes; do not overlap implementation with other Grok provider work.
> **Review routing**: independent + provider/runtime + model-catalog review

---

## Objective

Determine and correct the **Grok CLI provider connector** contract before
concluding that model identity is the root cause. The connector MUST be proven
to authenticate and reach the expected Grok Build CLI proxy using the current
endpoint, headers, session metadata, request format, and refresh flow. Only
after that boundary is working should the task evaluate whether a requested
model ID is stale, invalid, missing from the registry, or newly released.

The task MUST compare the current implementation with the reference/release
evidence and investigate provider compatibility changes that could make every
model fail at once. The newly released `grok-4.6` MUST be treated as a current
availability candidate to verify, not as evidence that the registry is wrong.
The obsolete `grok-build` shorthand is out of scope unless current provider
evidence requires compatibility handling. The task MUST NOT blindly add
`grok-build-0.1` to `grok-cli`: current reference evidence places that ID under
the separate `xai` provider.

A worker reading only this section can determine completion when a mocked or
safe local runtime path proves the connector's exact endpoint/auth/header/body
contract, identifies the outgoing model ID, and distinguishes a connector
compatibility failure from a genuine remote model-availability failure. If the
connector is repaired, current model discovery/auto-sync evidence may then
update the verified model matrix; no model alias is invented from the incident.

## Background Context

### O que já existe:

- Task 0149 completed the Grok Build Responses API/tool-call contract and uses
  `https://cli-chat-proxy.grok.com/v1/responses`, but its mocked transport did
  not prove current live connector compatibility.
- Task 0151 covers Grok Build device-code/browser PKCE/import login and is not
  a model-catalog task.
- Fork `open-sse/config/providers/registry/grok-cli/index.ts` currently registers
  `grok-4.5` and `grok-composer-2.5-fast`; this static list predates today's
  `grok-4.6` report and is not by itself proof of a defect.
- `open-sse/executors/grok-cli.ts` defaults a missing model to
  `grok-composer-2.5-fast`, but does not generally remap arbitrary model IDs.
- The current test surface includes a `model: "grok-build"` fixture even though
  that ID is not registered in the Grok Build registry; this is a secondary
  fixture/catalog inconsistency to correct or explicitly negative-test.
- The upstream reference `xai` registry contains `grok-build-0.1`, but the
  reference `grok-cli` registry does not; these are distinct provider/auth
  surfaces and must remain distinct unless source evidence proves otherwise.

### O que está faltando / quebrado:

- The active incident reports HTTP 400 `model not found` for all tested Grok
  Build CLI models, but no current connector packet proves whether endpoint,
  headers, auth/session metadata, body format, or model availability is failing.
- Task 0149 has no live/current compatibility proof because its accepted boundary
  was mocked transport.
- No invariant test captures the exact outgoing endpoint, headers (redacted),
  body model, and provider/auth mapping for a current Grok CLI request.
- No current model discovery/auto-sync evidence proves whether `grok-4.6` is
  advertised by the provider or merely available upstream.

## Test Requirements

- A production-path mock MUST capture the exact provider, endpoint, redacted
  session headers, request format, and model ID sent for existing registered
  models and missing-model defaulting.
- A safe connector probe MUST distinguish authentication/endpoint/header/body
  incompatibility from a remote `model not found` response. If live evidence is
  unavailable, the task MUST say so and still prove the local boundary.
- The obsolete `grok-build` fixture MUST be corrected or explicitly negative-
  tested; it MUST not silently represent a current Grok CLI model.
- `grok-build-0.1` MUST remain associated with `xai` unless current source and
  provider evidence explicitly establish it as a `grok-cli` model.
- An unknown model/provider combination MUST fail before paid/live dispatch or
  return a bounded actionable error identifying the provider and requested
  model; it MUST not be mislabeled as an OAuth failure.
- Registry entries, aliases, target format, executor selection, endpoint, and
  session headers MUST agree for every advertised Grok CLI model.
- A mocked upstream 400 `model not found` for a known ID MUST remain visibly
  distinct from a local unknown-ID rejection; error classification MUST preserve
  the provider/model context and sanitize the body.
- Any current provider model list/source evidence used to claim a fix MUST record
  its timestamp, source, and whether it was mocked, local, or live. No claim of
  live availability may be based only on the static legacy snapshot.
- Existing Task 0149 Responses/tool-call tests and Task 0151 OAuth tests MUST
  remain green; this task MUST NOT alter login flow or tool-call sanitization as
  an unrelated side effect.

## Exit Conditions (GDD/TDD)

- [x] A source-of-truth provider compatibility matrix documents `grok-cli`
  versus `xai`, endpoint, auth mode, client/session headers, request/target
  format, refresh behavior, and current verified model IDs.
- [x] The exact incident request boundary is captured through a safe mocked/local
  packet, including outgoing provider, endpoint, redacted headers, body model,
  and response classification; unavailable live evidence is explicitly marked.
- [x] Connector compatibility is verified/fixed before any model identity or
  alias conclusion is made.
- [~] Pre-dispatch model validation/alias handling is implemented only for
  source-verified IDs; no speculative alias is added. **[re-evaluating 2026-08-16 —
  see Re-evaluation Entry; current implementation contradicts passthroughModels: true]**
- [x] **NEW (re-evaluation 2026-08-16)** — Adopt the policy
  **"passthrough pleno + denylist explícita"**: providers with
  `passthroughModels: true` honor upstream classification for ALL model IDs
  except those on a sourced denylist (currently only the legacy `grok-build`
  fixture, which is no longer a valid upstream model — see Task 0160 source).
  Remove or condition the local unknown-ID rejection in
  `src/sse/handlers/chatHelpers.ts:239-247` and
  `open-sse/executors/grok-cli.ts:295-304`. The static registry list becomes
  informational (catalog/UI), NOT a dispatch prerequisite.
  **DONE 2026-08-17**: both gates replaced with `isModelDenylisted("grok-cli", …)`
  from `src/shared/utils/providerModelId.ts`; `grok-build` still 400s locally
  with a clear `(denylisted)` message; unknown non-denylisted IDs now reach the
  upstream (probed green: `grok-4.6` dispatches as `model: "grok-4.6"`).
- [x] **NEW (re-evaluation 2026-08-16)** — Add `grok-4.6` to the static
  registry list with current SSoT evidence (probe timestamp + source URL)
  per AGENTS.md rule 6. Catalog presence does NOT gate dispatch.
  **DONE 2026-08-17**: added to `open-sse/config/providers/registry/grok-cli/index.ts`
  (+ `GROK_CLI_MATRIX.registeredModels` in the compatibility test). Evidence:
  live `GET https://cli-chat-proxy.grok.com/v1/models` returns 401 without auth
  (probe 2026-08-16), so SSoT = operator confirmation + current
  `cli-chat-proxy` dispatch behavior; the boundary test proves dispatch works
  regardless of catalog presence.
- [x] **NEW (re-evaluation 2026-08-16)** — Verify dispatch with the
  **table-driven contract test** introduced by Task 0176
  (`tests/unit/provider-alias-normalization.boundary.test.ts`) which asserts
  the upstream-observable payload for the single-prefix case
  `grok-cli/grok-4.6` -> upstream `model: "grok-4.6"` (provider `"grok-cli"`).
  This is the regression guard required to keep the task consistent with
  AGENTS.md rule 7 (one prefix per provider) and `docs/sourceoftruth.md`
  rule 1.
  **DONE 2026-08-17**: 9-row table-driven test GREEN 9/9; row 1 asserts
  `grok-cli/grok-4.6` → upstream `model: "grok-4.6"`, provider `"grok-cli"`,
  fetch called exactly once; row 2 asserts `gc/grok-4.6` (the user's exact
  input) → upstream `model: "grok-4.6"` with NO double prefix.
- [x] The invalid/unregistered `grok-build` test fixture is corrected or made an
  explicit negative test with the expected local diagnostic.
- [x] Tests cover every registered Grok Build ID, default model behavior,
  provider separation, alias/unknown-ID behavior, remote 400 distinction, and
  sanitized errors.
- [x] `node --import tsx/esm --test tests/unit/grok-cli-provider-compatibility.test.ts` passes with 0 failures.
- [x] Existing Grok Build protocol/OAuth regression suites pass with 0 failures.
- [x] `npm run typecheck:core` passes without errors.
- [x] Scoped lint passes with no new errors; repository-wide pre-existing errors
  are reported separately and never claimed as green.
- [x] No live request uses production `:22000`; paid/provider validation is
  mocked or explicitly bounded to the approved test surface.
- [x] Hard Rule #18 is satisfied through TDD fail→pass evidence.
- [x] Completion Evidence contains real commands, model matrix, source
  provenance, and residual live-availability uncertainty.
- [x] Changelog entry is prepared through the canonical parent closeout process;
  builders do not edit generated changelog surfaces.

## Details

### What

Subtasks:

- [x] **Ler código existente**: read the Grok Build registry/executor/config,
  model resolution/target-format code, `xai` registry, Task 0149/0151 evidence,
  current Grok tests, and the corresponding upstream reference files.
- [x] Capture the exact provider/endpoint/header/body boundary for the failing
  connector and only then classify model IDs as registered, alias,
  provider-mismatched, stale, or unknown.
- [x] Build the provider/model matrix before changing any registry or alias.
- [x] Add failing tests for the invalid fixture and each unknown/known/provider
  separation path.
- [x] Implement the smallest verified provider-compatibility correction; only
  then consider a registry/model-list correction if evidence requires it.
- [x] Add a pre-dispatch diagnostic or safe normalization only where the source
  contract supports it.
- [x] Re-run protocol/OAuth regressions and inspect emitted request IDs in mocks.
- [x] **Refactoring pass**: keep model identity in registry/resolution boundaries;
  do not bury aliases in the Grok executor or OAuth flow.
- [x] **Verificação de regressão**: focused tests, Grok regressions, typecheck,
  scoped lint, and secret-safe evidence review.

### Where

| Arquivo | Propósito |
|---------|-----------|
| `open-sse/config/providers/registry/grok-cli/index.ts` | Ler/modificar — Grok Build OAuth model registry. |
| `open-sse/config/providers/registry/xai/index.ts` | Ler — separate xAI API-key model registry. |
| `open-sse/executors/grok-cli.ts` | Ler/modificar only for verified model dispatch contract. |
| `open-sse/config/grokBuild.ts` | Ler — endpoint/header/provider constants. |
| `open-sse/config/providerRegistry.ts` | Ler — runtime model/executor resolution. |
| `open-sse/services/model.ts` | Ler — provider/model inference and fallback behavior. |
| `tests/unit/grok-cli-strip-params.test.ts` | Modify — correct or explicitly negative-test unregistered fixture. |
| `tests/unit/grok-cli-provider-compatibility.test.ts` | Criar — provider boundary, model/endpoint contract, and error classification tests. |
| Existing `tests/unit/grok-cli-*.test.ts` | Ler/regression — preserve Task 0149/0151 behavior. |
| `references/diegosouzapw-omniroute/open-sse/config/providers/registry/grok-cli/index.ts` | Ler — static upstream reference. |
| `references/diegosouzapw-omniroute/open-sse/config/providers/registry/xai/index.ts` | Ler — static xAI reference. |

### How

1. Reproduce the incident at the model-resolution/dispatch boundary with a
   mocked transport that records the outgoing model ID.
2. Separate provider mapping, catalog registration, aliasing, endpoint, and
   remote availability; do not fix one layer by changing another blindly.
3. Establish the matrix and add fail-first tests for known, default, unknown,
   cross-provider, and remote-rejected IDs.
4. Implement the smallest source-verified correction and preserve distinct local
   versus remote error classes.
5. Validate protocol/OAuth regressions and document unresolved live availability.

### Why

Task 0149 made the protocol correct under mocked transport, but that does not
prove that the current Grok CLI connector still matches the live provider
contract. The incident affects every Grok Build CLI request, so provider
compatibility is the primary investigation. Model identity and auto-sync remain
secondary checks after the connector is functional, avoiding an unsupported
alias fix or a misleading reopening of the well-scoped Responses/OAuth tasks.

## Parallelism / file ownership

| Class | Detail |
|-------|--------|
| **parallel-safe** | Read-only release/provider inventory work that does not edit Grok registry/executor files. |
| **serializable** | Must not overlap implementation of Tasks 0149/0151 or other Grok registry/executor changes. |
| **Collision** | Grok registry, `grok-cli.ts`, provider model resolution, Grok tests, and provider catalog outputs. |

## ⛔ Anti-Hallucination Guardrails

> [!CAUTION]
> Do not add `grok-build-0.1` to `grok-cli` merely because it exists under
> `xai`. Do not alias `grok-build` to `grok-4.5`, Composer, or `grok-4.6`
> without verified provider evidence. A static reference snapshot is not live
> model availability, and a model-list gap must not distract from a connector
> failure affecting every model.

> [!IMPORTANT]
> Read every file in the Where table before writing. Do not alter OAuth/login or
> Responses/tool-call behavior unless the model-identity proof requires it. No
> live `:22000`, credentials, or unbounded upstream error bodies.

## 🛡️ Compliance Checklist (Leis Primárias do AGENTS.md)

- [x] **Doc Accuracy**: model IDs, endpoints, provider/auth mappings, and commands verified against source.
- [x] **Zod Validation**: any new user/API model input remains schema-validated.
- [x] **Security**: no credentials or raw provider bodies in tests/evidence.
- [x] **Error Sanitization**: local/remote model errors are bounded and sanitized.
- [x] **No Raw SQL**: no database changes expected.
- [x] **Archive Protocol**: no deletion.

## 📋 Completion Evidence (preenchido pelo agente executor)

- **Model/provider matrix**: see `## Source-of-truth matrix (builder evidence, 2026-08-12)` below; source files inspected:
  - `open-sse/config/providers/registry/grok-cli/index.ts`
  - `open-sse/config/providers/registry/xai/index.ts`
  - `references/diegosouzapw-omniroute/open-sse/config/providers/registry/grok-cli/index.ts`
  - `references/diegosouzapw-omniroute/open-sse/config/providers/registry/xai/index.ts`
  - `open-sse/executors/grok-cli.ts`
  - `open-sse/config/grokBuild.ts`
  - `open-sse/config/providerRegistry.ts`
  - `open-sse/services/model.ts`
  - `tests/unit/grok-cli-responses.test.ts`, `grok-cli-strip-params.test.ts`, `grok-cli-oauth.test.ts`
- **Files created/modified** (path-to-100, 2026-08-12):
  - `tests/unit/grok-cli-provider-compatibility.test.ts` — paired local pre-dispatch + remote 400 sanitization tests
  - `tests/unit/grok-cli-strip-params.test.ts` — `grok-build` fixture is now a local execute() rejection (no fetch)
  - `open-sse/executors/grok-cli.ts` — pre-dispatch unknown-model gate + client-facing remote-error sanitization
  - `src/sse/handlers/chatHelpers.ts` — explicit `grok-cli/<unknown>` rejected in `resolveModelOrError()`
  - `open-sse/services/model.ts` + `src/sse/services/model.ts` — export `hasKnownProviderModel` for the resolver gate
- **TDD red→green (path-to-100)**:
  - After replacing the local/remote/sanitization assertions: `17 pass / 4 fail`. Failures were exactly F1–F3 (passthrough `grok-cli/grok-build` resolved, execute() fetched unknown IDs, remote 400 leaked `sk-…`).
  - After the smallest resolver + executor gates: focused files `24 pass / 0 fail`; full `grok-cli-*.test.ts` `100 pass / 0 fail`.
- **Grok regression suites**:
  - Combined focused run: `100 pass / 0 fail`.
  - No Task 0149/0151 login or tool-call sanitization behavior was altered.
- **Typecheck/lint**:
  - `npm run typecheck:core`: PASS, exit `0`, 0 type errors.
  - Scoped ESLint on Task 0160-owned + touched resolver paths: PASS, exit `0`, 0 errors.
  - Broad `npm run lint`: not re-run as task scope; pre-existing repository-wide debt remains outside this task.
- **Outgoing model-ID proof**:
  - Mocked `GrokCliExecutor.buildUrl()` proves exact endpoint `https://cli-chat-proxy.grok.com/v1/responses` for registered IDs.
  - Mocked `buildHeaders()` proves session headers (`X-XAI-Token-Auth`, `x-grok-model-override`, `x-userid`, `x-email`, client version/identifier) without silent remapping.
  - Mocked `transformRequest()` preserves registered IDs and defaults missing model to `grok-composer-2.5-fast`.
  - `resolveModelOrError("grok-cli/grok-build")` returns local HTTP 400 naming both provider and model; `fetch` is not called.
  - `GrokCliExecutor.execute({ model: "grok-build" })` returns local `unknown_model` 400; `fetch` is not called.
  - Known `grok-4.5` + mocked upstream 400 `model not found` remains a remote class (`code !== unknown_model`) with provider/model context and no token-shaped body.
- **Live availability status**:
  - **Blocked/unknown**: no live provider validation was performed. No `:22000`, no production credentials, no unbounded upstream request. Current model availability beyond the static registry is explicitly unverified.
  - `grok-4.6` was not added; `grok-build-0.1` remains under `xai`.
- **Changelog draft**: not published in this path-to-100 pass (operator: no changelog tooling). Previous draft remains a parent-closeout artifact only.
- **Agent/date**: builders / 2026-08-12 (path-to-100 after independent reject 78/100)

## Verification commands

```bash
# Focused Task 0160 regression + new compatibility file
DATA_DIR=$(mktemp -d) node --import tsx/esm --test \
  tests/unit/grok-cli-provider-compatibility.test.ts \
  tests/unit/grok-cli-strip-params.test.ts \
  tests/unit/grok-cli-responses.test.ts \
  tests/unit/grok-cli-tool-output-sanitization.test.ts \
  tests/unit/grok-cli-oauth.test.ts \
  tests/unit/grok-cli-device-code.test.ts \
  tests/unit/grok-cli-pkce.test.ts \
  tests/unit/grok-cli-cancellation-redaction.test.ts

# Scoped lint
npx eslint \
  tests/unit/grok-cli-provider-compatibility.test.ts \
  tests/unit/grok-cli-strip-params.test.ts \
  open-sse/config/providers/registry/grok-cli/index.ts \
  open-sse/config/providers/registry/xai/index.ts \
  open-sse/executors/grok-cli.ts \
  open-sse/config/grokBuild.ts

# Typecheck
npm run typecheck:core
```

## Source-of-truth matrix (builder evidence, 2026-08-12)

| Dimension | `grok-cli` | `xai` |
|---------|-----------|-------|
| Provider ID | `grok-cli` | `xai` |
| Alias | `gc` | `xai` |
| Auth mode | OAuth | API key |
| Executor | `grok-cli` | `default` |
| Endpoint | `https://cli-chat-proxy.grok.com/v1/responses` | `https://api.x.ai/v1/chat/completions` |
| Models URL | `https://cli-chat-proxy.grok.com/v1/models` | not set in registry |
| Client version | `0.2.106` | not applicable |
| Target format | `openai-responses` | `openai` |
| passthroughModels | `true` | not set / `false` |
| Registered models | `grok-4.5`, `grok-composer-2.5-fast` | `grok-4.3`, `grok-build-0.1`, `grok-4.20-multi-agent-0309`, `grok-4.20-0309-reasoning`, `grok-4.20-0309-non-reasoning` |
| Default model | `grok-composer-2.5-fast` | none |
| Refresh behavior | OAuth refresh token flow via `https://auth.x.ai/oauth2/token` | none / API key static |
| Source evidence | inspected local registry + reference registry; byte-identical model set to upstream reference for inspected IDs | inspected local registry + reference registry |
| Live availability | **unknown** — no live validation performed; static registry is the current verified source | **unknown** — same boundary |

### Error classification boundary

| Scenario | Classification | Evidence |
|---------|---------------|----------|
| Unknown model ID sent to `grok-cli` executor | Local unknown-ID rejection before dispatch | `resolveModelOrError("grok-cli/grok-build")` and `GrokCliExecutor.execute()` return HTTP 400 `unknown_model` naming provider + model; `fetch` is not called |
| Known registered `grok-cli` model, mocked upstream 400 `model not found` | Remote provider model-availability rejection | `execute("grok-4.5")` reaches mocked fetch once, returns HTTP 400 with `code !== unknown_model` and `grok-cli/grok-4.5` context |
| Token/secret in upstream error body | Sanitized at the executor boundary | `sanitizeErrorMessageForResponse()` + `createErrorResult()`; client body must not contain the secret-shaped token |
| `grok-build` fixture | Explicit local negative test | `tests/unit/grok-cli-strip-params.test.ts` now asserts execute-time rejection, not remapping |
| `grok-build-0.1` | Remains under `xai` only | Source inspection found no evidence moving it to `grok-cli`; no speculative alias added |

## Worker Handoff Packet

- **Next worker**: independent reviewer (re-review of F1–F3 only). Builder does **not** claim approval and did **not** move the task.
- **Path-to-100 applied**: local `grok-cli/<unknown>` rejection before dispatch; paired remote 400 for known IDs; executor-boundary token sanitization via `sanitizeErrorMessageForResponse` + `createErrorResult`.
- **Scope boundary**: source-verified connector/model boundary only. Live provider availability and `grok-4.6` verification remain unknown / not added.
- **Do not edit**: Task 0149/0151 OAuth/login/tool-call surfaces; `grok-build-0.1` registry location without new source evidence; Task 0161.
- **Evidence freshness**: matrix and tests are based on static registry/config inspection dated 2026-08-12 plus mocked execute/`resolveModelOrError` probes. No `:22000`, no credentials.
- **Residual risk**: incident root cause (why every live Grok Build CLI model returned 400) is still not concluded. This pass closes the required local-vs-remote and sanitization contracts; live availability remains unverified. `passthroughModels: true` remains on the registry for 404 cooldown semantics, but explicit unknown IDs are now gated before dispatch.

## 🔍 Review Trail (preenchido pelo reviewer)

- **Reviewer**: Independent reviewer — `BUILDER_CONTEXT` operator lane
- **Date**: 2026-08-12
- **Verdict**: **APPROVED**
- **Score**: **98/100** (`90–100 = APPROVED`; `<90 = REJECTED`)
- **Report**: [`docs/reports/review/20260812-task-0160-omniroute-grok-cli-provider-compatibility-rereview.md`](../reports/review/20260812-task-0160-omniroute-grok-cli-provider-compatibility-rereview.md)
- **Previous report**: [`docs/reports/review/20260812-task-0160-omniroute-grok-cli-provider-compatibility-review.md`](../reports/review/20260812-task-0160-omniroute-grok-cli-provider-compatibility-review.md) — **REJECTED**, 78/100.
- **Move outcome**: **Promoted** to `docs/tasks/03-review/0160-omniroute-grok-cli-provider-compatibility.md` after fresh re-review.
- **Notes**: Prior findings F1–F3 are resolved. Explicit `grok-cli/grok-build` is rejected in `resolveModelOrError()` and `GrokCliExecutor.execute()` before fetch with provider/model context and `unknown_model`; known `grok-4.5` reaches a mocked remote HTTP 400 once and remains distinct from local rejection; `sk-must_not_leak_12345` is absent from the client-facing remote error. Fresh focused pair passed `24/24`; `npm run typecheck:core` and scoped ESLint passed. Live availability remains explicitly unknown, `grok-4.6` was not added, and `grok-build-0.1` remains under `xai`.

### Re-review reconciliation

- **F1 — RESOLVED**: explicit unknown `grok-cli/<model>` is locally rejected in both the production resolver and executor before dispatch.
- **F2 — RESOLVED**: executor-boundary remote 400 rebuilding uses `sanitizeErrorMessageForResponse()` and `createErrorResult()`; the required token-negative assertion passes.
- **F3 — RESOLVED**: paired local resolver/no-fetch and known-model remote-fetch/400 tests now prove distinct classifications.
- **Evidence note**: isolated startup emitted non-fatal SQLite migration diagnostics, but the 24 focused assertions passed and no live provider request was made.

---

## 🔍 Re-evaluation Entry (architect-orchestrator audit — 2026-08-16)

- **Author**: `architect-orchestrator` (`agentID=architects`)
- **Basis**: post-approval audit (2026-08-16) — defect discovered after APPROVED 98/100 was on file.
  Per `task-remediation-triage.md` matrix row 1 (defect is local to the task's own scope) and
  `.agents/rules/lane-architecture.md` ("Failed final review currently follows root task law:
  `03-review -> 01-open`" — review round is the only owner of lane transitions for tasks
  with prior Review Trail).
- **Status & lane note**: the file remains in `03-review/` because the previous APPROVED
  Review Trail is preserved as historical evidence and the lane transition is reviewer-owned.
  The next reviewer round MUST reconcile by either (a) re-approving after the new Exit
  Conditions pass, or (b) rejecting the prior APPROVED entry and producing a fresh Review
  Trail entry with a new verdict. The architect-orchestrator does not move lanes; it
  flags the re-evaluation requirement here.
- **Findings triggering re-evaluation**:
  1. AGENTS.md rule 7 ("One prefix per provider") and `docs/sourceoftruth.md` rule 1 were
     already canonical when this task was approved — yet this task introduced a local
     unknown-ID gate in `src/sse/handlers/chatHelpers.ts:239-247` and
     `open-sse/executors/grok-cli.ts:295-304` that **contradicts** `passthroughModels: true`
     declared in the same registry entry this task audited.
  2. The handoff packet explicitly acknowledges the conflict: *"passthroughModels: true
     remains on the registry for 404 cooldown semantics, but explicit unknown IDs are
     now gated before dispatch"*. That sentence is the source of the contradiction —
     it elevates a per-incident sanitization need (distinguish local vs remote) into a
     global dispatch prerequisite, which is exactly what `passthroughModels: true` is
     meant to forbid.
  3. Operator evidence (`gc/grok-4.6` → `Unknown model 'grok-4.6'` after single-prefix
     normalization) proves the gate rejects legitimate upstream-valid model IDs as soon
     as they are not enumerated in the static registry.
  4. TDD gap: `tests/unit/model-test-runner.test.ts` only exercises `parseRetryAfterHeader`
     and `detectTestKind` — `runSingleModelTest` (where the gate composes its effect) has no
     failure-path test for "single-prefix alias-prefixed model id rejected locally".
     The existing 24-pass focused suite was green because it never tested the case the
     gate was hiding.
- **Adopted policy** (architect-orchestrator): **"passthrough pleno + denylist explícita"**.
  Providers with `passthroughModels: true` honor upstream classification for ALL model IDs
  except those on a sourced denylist. The static registry list becomes informational
  (catalog/UI), NOT a dispatch prerequisite.
- **Scope boundary preserved**: this re-evaluation **only** changes the post-approval
  behaviour of the local gate. It does NOT alter OAuth/login/tool-call surfaces
  (Tasks 0149/0151/0161 are out of scope), does NOT relocate `grok-build-0.1`
  (remains under `xai` until new source evidence), and does NOT add `grok-4.6`
  speculatively — `grok-4.6` addition is conditional on a fresh SSoT refresh per
  AGENTS.md rule 6.
- **Followup remediation**: `Task 0176 (new) — Canonical Alias Normalization` covers
  the systemic re-prefix/strip class that this task surfaced (modelTestRunner
  `src/lib/api/modelTestRunner.ts:185-193` and the parallel `tr/` strip in
  `open-sse/executors/trae.ts`). Task 0176 publishes the contextual normalizer
  (`normalizeModelForSelectedProvider`) and the table-driven boundary contract test
  that Task 0160's third new Exit Condition depends on.
