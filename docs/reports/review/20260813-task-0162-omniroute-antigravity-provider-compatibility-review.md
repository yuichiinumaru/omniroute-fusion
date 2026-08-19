# Independent Review Report: Task 0162 — Antigravity provider compatibility

## Review identity and scope

- **Task**: `docs/tasks/02-doing/0162-omniroute-antigravity-provider-compatibility.md`
- **Review date**: 2026-08-13
- **Mode**: independent filesystem/source review under the operator binary law.
- **Rule**: `90–100 = APPROVED`; `<90 = REJECTED`.
- **Scope**: task Completion Evidence, current Antigravity executor/registry/model aliases/upstream URL and client-profile services, the in-workspace upstream reference under `references/diegosouzapw-omniroute/`, focused Antigravity tests, core typecheck, and scoped lint.
- **Exclusions honored**: no live Antigravity account/request, no production port, no credentials, no git, no sub-reviewers, and no changelog tooling.
- **Authority**: current source, current focused output, and the checked-in upstream reference outrank builder prose when they conflict.

## Independent review outcome (2026-08-13; corrected in-session)

- **Verdict**: **REJECTED**
- **Score**: **86/100** (`90–100 = APPROVED`; `<90 = REJECTED`)
- **Report**: [`docs/reports/review/20260813-task-0162-omniroute-antigravity-provider-compatibility-review.md`](../reports/review/20260813-task-0162-omniroute-antigravity-provider-compatibility-review.md)
- **Move outcome**: **Not promoted**; task remains in `docs/tasks/02-doing/`.
- **Correction**: The prior model-catalog provenance/parity finding is **WITHDRAWN / INVALID**. Model IDs are secondary and operator-manageable, so catalog completeness, provenance, and specific IDs do not reduce this score or block promotion.
- **Summary**: Focused Antigravity tests are fresh and green (**117 pass / 0 fail / 0 cancelled**) and `npm run typecheck:core` exits 0. Promotion remains rejected only for the retained connector/runtime findings: synthetic decoy tool declarations on the request path, runtime/usage wiring to the combined URL set including sandbox, and the IDE/CLI version/profile split where required by the checked-in reference contract.
- **Residual constraints**: no live account/request, credentials, production port, git, sub-reviewers, or changelog tooling used.

## Score and verdict

### **Score: 86/100 — REJECTED; retain in `docs/tasks/02-doing/`**

The implementation has strong local coverage for safety defaults, bootstrap/discovery behavior, client-profile headers, and request transformation. The model catalog is intentionally treated as secondary and operator-manageable; catalog completeness, provenance, and specific model IDs are not used as a promotion criterion in this corrected review. The remaining score deductions are limited to connector/runtime compatibility: synthetic tool decoys remain on the request path, runtime/usage wiring uses the combined URL set rather than the reference runtime-only set, and the IDE/CLI version/profile split is not implemented or separately tested against the checked-in reference contract.

## Delta-aware correction note (2026-08-13)

- **WITHDRAWN / INVALID finding**: the prior D4 model-catalog provenance/parity item is withdrawn. It was an invalid review criterion and must not reduce the score or block promotion. Operators may add or update model IDs manually; this report makes no catalog-completeness, 2.0.1/2.0.4 parity, stale-ID, or mapping claim.
- **Score correction**: prior `82/100` → corrected `86/100`; the four points previously withheld for catalog completeness are restored.
- **Valid findings retained**: synthetic decoy tool injection, runtime/usage URL-set separation, and IDE/CLI version/profile compatibility where required by the checked-in upstream reference. Tests/evidence for those connector contracts remain the path to approval.
- **Lane outcome**: still rejected under the binary `90–100 = APPROVED` rule and remains in `docs/tasks/02-doing/`; no move to `04-completed/` was made.

## Score breakdown

| Dimension | Points | Notes |
|---|---:|---|
| Tool-call preservation and schema safety | 18/20 | Client tool names are preserved and schema fields are sanitized; however the executor still injects more than 20 decoy declarations through `cloakAntigravityToolPayload`, unlike the checked-in upstream sanitizer. The task explicitly identifies decoys as a compatibility risk, so this is only partial credit. |
| Optional/operator-managed model IDs (non-gating) | 20/20 | No completeness, provenance, specific-ID, parity, stale-ID, or mapping requirement is applied. Model IDs are secondary and may be added or updated manually; this row carries no catalog-based deduction or blocker. |
| Runtime User-Agent/client-profile compatibility | 17/20 | IDE/harness headers, pinned platform tests, identity-header cleanup, and runtime application at `executeOnce` are present. The checked-in upstream has distinct `antigravity/ide/` and `antigravity/cli/` profiles; the fork normalizes CLI/SDK to a generic `harness` profile and still uses an Electron-style `Antigravity/VERSION (...) Chrome/... Electron/...` UA for the default IDE path. |
| Safety settings and request transformation | 15/15 | `HARM_CATEGORY_CIVIC_INTEGRITY` is present in the fork default and safety tests prove default/caller-supplied behavior. Claude schema filtering and tool-config behavior are covered. |
| Base URL separation and runtime wiring | 6/15 | Discovery and bootstrap have dedicated sets, but registry and executor runtime use `ANTIGRAVITY_BASE_URLS`, which includes the sandbox URL. Upstream reference registry/runtime uses `ANTIGRAVITY_RUNTIME_BASE_URLS`; no focused test proves runtime excludes sandbox or that each URL index maps to the intended runtime set. |
| Version/profile split and verification evidence | 10/15 | The fork resolver is cached, timeout-bounded, and tested against official/GitHub-shaped payloads. The checked-in reference additionally separates IDE and CLI feeds, fallbacks, caches, and headers; that compatibility contract is not implemented or separately tested. |
| **Total** | **86/100** | **REJECTED** |

## Required divergence reconciliation

### D1 — PERSISTENT BLOCKER: tool cloaking still injects decoys

`open-sse/config/toolCloaking.ts` defines `AG_DECOY_TOOLS` with more than 20 declarations and appends them whenever custom declarations are present (`toolCloaking.ts:28-45`, `160-171`). `AntigravityExecutor.executeOnce()` invokes this helper on every transformed request (`antigravity.ts:1281-1285`). The focused test explicitly asserts decoy injection and `AG_DECOY_TOOLS.length > 20` (`tests/unit/antigravity-tool-cloaking.test.ts:10-67`).

The checked-in upstream reference instead exposes `sanitizeAntigravityToolPayload`, which preserves only client-declared tools and strips `enumDescriptions`; its test explicitly asserts that only declared tools remain and that no server-side tool opt-in is created (`references/diegosouzapw-omniroute/open-sse/config/toolCloaking.ts:32-85`, reference test lines 23-79). This conflicts directly with the task objective/test requirement that decoys be removed when API validation makes them unsafe. The fork's deliberate native tool-call preservation is compatible with the upstream sanitizer; the decoy declarations are not proven compatible.

**Impact**: an upstream schema/allowlist validation change can reject otherwise valid requests before model execution. The passing test currently protects the risky behavior instead of the required compatibility behavior.

### D2 — PERSISTENT BLOCKER: runtime URL set is broader than upstream runtime

Current `open-sse/config/antigravityUpstream.ts` defines:

- `ANTIGRAVITY_RUNTIME_BASE_URLS`: daily + production (lines 7-10)
- `ANTIGRAVITY_DISCOVERY_BASE_URLS`: runtime plus sandbox (lines 12-15)
- `ANTIGRAVITY_BOOTSTRAP_BASE_URLS`: production only (lines 17-19)
- `ANTIGRAVITY_BASE_URLS`: daily + production + sandbox (lines 1-5)

But `open-sse/config/providers/registry/antigravity/index.ts:4,15` and `open-sse/config/providers/shared.ts:9,718` wire the registry to `ANTIGRAVITY_BASE_URLS`, and `AntigravityExecutor.buildUrl()` takes its fallback list from `this.getBaseUrls()` (`antigravity.ts:624-633`). The usage probe also iterates `ANTIGRAVITY_BASE_URLS` (`open-sse/services/usage/antigravity.ts:469`).

The reference registry imports and uses `ANTIGRAVITY_RUNTIME_BASE_URLS`, while its usage service does the same (`references/diegosouzapw-omniroute/open-sse/config/providers/registry/antigravity/index.ts:1-16`, reference usage lines 15-16/474). The current focused discovery test only checks that bootstrap URLs are HTTPS and end in `:loadCodeAssist`; it does not assert runtime URL isolation or URL-index routing. The import fix recorded in Completion Evidence therefore corrected a symbol error but did not complete the required runtime/discovery/bootstrap separation.

**Impact**: runtime fallback can send content requests or quota probes to the sandbox discovery endpoint, changing availability and potentially producing misleading connector failures.

### D3 — PERSISTENT BLOCKER: version resolution lacks IDE/CLI split

Current `open-sse/services/antigravityVersion.ts` has one release feed, one GitHub release URL, one fallback (`4.2.0`), and one cache (`versionCache`) for all profiles (`lines 1-19`, `115-163`). `antigravityClientProfile.ts` maps persisted `cli`/`sdk` values to a generic `harness` profile and uses the same cached version for harness and IDE (`lines 31-42`, `68-79`, `128-146`).

The checked-in upstream reference has separate IDE and CLI feeds, fallbacks `2.1.1` and `1.1.5`, independent caches, and profile-specific resolution (`references/diegosouzapw-omniroute/open-sse/services/antigravityVersion.ts:1-19,138-179`; `references/.../antigravityClientProfile.ts:46-50`). The reference headers emit distinct `antigravity/ide/<version>` and `antigravity/cli/<version> ...` identities (`references/.../antigravityHeaders.ts:27-43`). Current tests cover the generic resolver and a harness UA, but do not prove separate IDE versus CLI release-source/version behavior.

**Impact**: the provider can advertise one client identity while sending a version from the wrong product channel. This violates explicit exit condition 6 and the task's stated upstream-compatible version resolution goal.

### D4 — WITHDRAWN / INVALID: model catalog provenance/parity

This prior review item is withdrawn at the user's explicit direction. Model IDs are secondary and operator-manageable; catalog completeness, Antigravity version parity, stale-ID claims, and specific mappings are not connector/runtime compatibility criteria here. No catalog deduction remains in the corrected score, and this report makes no claim about which optional models should be present.

## What passed

- `AntigravityExecutor.buildUrl(model, stream, urlIndex)` is isolated to a three-argument signature and the executor dispatches with that signature (`antigravity.ts:624`, `1262-1264`).
- Runtime applies `applyAntigravityClientProfileHeaders()` immediately before fetch (`antigravity.ts:1300-1346`), so the helper is production-wired rather than test-only.
- `DEFAULT_SAFETY_SETTINGS` includes `HARM_CATEGORY_CIVIC_INTEGRITY`, and focused safety tests prove both default and caller-supplied settings.
- Model IDs are operator-managed and are not scored or independently inventoried by this review.
- Bootstrap uses the dedicated bootstrap set and discovery uses discovery URLs; memoization and non-fatal failures are tested.
- No live account, credential, or forbidden service port was used.

## Fresh verification

### Focused Antigravity family — PASS

```text
node --import tsx/esm --test tests/unit/antigravity-*.test.ts
```

Result: **117 passed, 0 failed, 0 cancelled** (exit 0; 8 suites; 16.5s). The process emitted non-fatal local SQLite/credential fallback diagnostics and an expected abort log from the nonblocking OAuth test; no assertion failed. No live Antigravity request was made.

### Core typecheck — PASS

```text
npm run typecheck:core
```

Result: **exit 0**, no type errors.

### Scoped lint — PASS WITH WARNINGS

```text
npx eslint open-sse/config/antigravityModelAliases.ts open-sse/config/antigravityUpstream.ts open-sse/config/providers/registry/antigravity/index.ts open-sse/executors/antigravity.ts open-sse/services/antigravityVersion.ts open-sse/services/antigravityHeaders.ts open-sse/services/antigravityClientProfile.ts open-sse/config/toolCloaking.ts open-sse/translator/helpers/geminiHelper.ts tests/unit/antigravity-model-aliases.test.ts tests/unit/antigravity-discovery-bootstrap.test.ts tests/unit/executor-antigravity.test.ts tests/unit/antigravity-safetysettings-5003.test.ts tests/unit/antigravity-tool-cloaking.test.ts tests/unit/antigravity-version.test.ts tests/unit/antigravity-client-profile.test.ts
```

Result: **exit 0, 0 errors, 7 warnings**. All warnings are existing test-fixture `no-explicit-any` warnings in the two tool/model test files; no production lint errors were reported.

## Local versus runtime score

- **Local implementation**: 88/100 — substantial source and focused-test coverage exists.
- **Runtime enforcement**: 80/100 — the executor is wired, but it enforces the combined URL set, decoy tool injection, and shared version identity rather than the checked-in upstream runtime contracts.
- **Overall**: **86/100**, with no model-catalog deduction.

## Exact path to 100

1. Replace runtime/usage registry wiring to use `ANTIGRAVITY_RUNTIME_BASE_URLS`; retain sandbox only for discovery, and add a test that runtime URL indices never include sandbox while discovery does.
2. Confirm whether the checked-in reference's distinct IDE and CLI version sources, fallbacks, caches, profile resolution, and headers are part of this connector's compatibility contract. If confirmed, implement and test the separate profile paths; if not confirmed, remove this item from the compatibility gate rather than infer it.
3. Replace decoy-injecting `cloakAntigravityToolPayload` on the Antigravity request path with upstream-equivalent schema sanitization that preserves declared tool names and function calls without synthetic declarations. Keep the existing native/OpenCode tool-call preservation tests, updated to assert no decoys.
4. Re-run focused connector tests, `npm run typecheck:core`, scoped lint, and refresh Completion Evidence. Do not add catalog-completeness requirements, invent model mappings, claim live availability, or run a live account request.

## Reviewer conclusion

Task 0162 is **REJECTED at 86/100** under the operator binary law. It must remain in `docs/tasks/02-doing/` until the valid runtime/tool/profile findings are closed with corresponding production-path tests and a fresh independent review. The withdrawn catalog finding is not part of the rejection or score. No task move or Review Trail approval was made.
