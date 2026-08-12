# Changelog: omniroute-2

> **Note**: Auto-generated view for project `omniroute-2` from `.changelog/` entries.
> **Do NOT edit manually** - use the changelog skill/subcommands.
> **Last rebuilt**: 2026-08-10 22:12:55 UTC

---

# Task 0158,0159: outbound-error-triage-workflow

## Summary

Prepared evidence-first outbound log triage and a curated self-improvement loop.

## Changes

- Documented task completion details.

## Verification

- [x] The call-log endpoint and filters were verified in source; unauthenticated local probe returned HTTP 401, so no outbound-error findings were claimed.
- [x] Task 0158 records the Gemini 3 thinking_budget mismatch and MetaMuse 404 as hypotheses requiring source/log correlation.
- [x] Task 0159 requires no auto-reference mutation, max ten investigators, no general subagents, and resume/three-strike handling.

---

# Task 0157: combo-fail-soft-unavailable-models

## Summary

Created incident-driven combo resilience task with explicit distinction between upstream 404 body and harness tool-call schema failures.

## Changes

- Documented task completion details.

## Verification

- [x] Source investigation inspected combo.executeTarget, accountFallback.checkFallbackError, handleNoCredentials, and muse-spark-web; no Expected id literal exists in the codebase.
- [x] Task requires mocked account A contributor 404 → account B normal model success, scoped lockout without provider breaker, aggregate error only after exhaustion, and sanitized logging.

---

# Task 0154,0155,0156: release-to-codebase-absorption-pipeline

## Summary

Prepared a reusable, provenance-aware release-to-codebase absorption pipeline without activating unreviewed harness mutations.

## Changes

- Documented task completion details.

## Verification

- [x] Releases page lists v3.8.42 through v3.8.49; GitHub API and raw CHANGELOG.md are readable sources.
- [x] Fork package.json is 3.8.42 and reference package.json is 3.8.49.
- [x] Tasks require dry-run defaults, explicit git pull --ff-only opt-in, dirty-tree refusal, max ten focused investigators, and no automatic code/task mutation.

---

# Task codex-live-smoke-auth: validate-codex-luna-after-prefix-fix

## Summary

The request reached the real Codex executor with canonical routing cx/gpt-5.6-luna → codex/gpt-5.6-luna and no requestOptions ReferenceError. The provider rejected all three eligible accounts with 401 because their refresh tokens are expired/invalid; 13 additional accounts were already filtered at 100% session usage. No successful completion/output tokens were produced.

## Changes

- Documented task completion details.

## Verification

- [x] OMNIROUTE_BUILD_CPUS=8 OMNIROUTE_BUILD_MEMORY_MB=16384 npm run build (exit 0, cpus=8, 617/617); production :22000 health ok; one direct production POST /v1/responses smoke via src/app/api/v1/responses/route.ts with model cx/gpt-5.6-luna and minimal arithmetic prompt; route log canonicalized to codex/gpt-5.6-luna; upstream result HTTP 401 token_expired

---

# Task codex-runtime-prefix-fix: fix-codex-runtime-timeout-and-prefix-normalization

## Summary

Replaced two undefined requestOptions references in chatCore timeout wiring with the consolidated settings object. Added Codex-scoped provider-model normalization so cx/model, codex/model, and codex/cx/model converge to provider codex plus the bare model while non-Codex slash IDs remain untouched. Added production-path and source regressions. Build concurrency now auto-scales per build up to 80% logical CPU, bounded by memory and nofile.

## Changes

- Documented task completion details.

## Verification

- [x] node --import tsx/esm --test tests/unit/fine-grained-timeouts-consumers.test.ts tests/unit/model-resolver.test.ts tests/unit/chat-helpers.test.ts tests/unit/codex-gpt56-compat.test.ts (75/75); node --import tsx/esm --test tests/unit/build-next-isolated.test.ts (20/20); npm run typecheck:core (0); npx eslint touched files (0 errors); npm run build (617/617, exit 0); production :22000 restart + /api/health/ping status ok

---

# Task build-emfile: stabilize-next-build-file-descriptors

## Summary

Adds experimental.cpus default 4 with OMNIROUTE_BUILD_CPUS override, validates invalid values, warns on low nofile limits, preserves reference symlink isolation, and proves a green build under nofile=4096.

## Changes

- Documented task completion details.

## Verification

- [x] node --import tsx/esm --test tests/unit/build-next-isolated.test.ts; npm run typecheck:core; OMNIROUTE_BUILD_CPUS=4 OMNIROUTE_BUILD_MEMORY_MB=16384 npm run build (exit 0, 617/617 pages, peak RSS ~16.5 GiB); production :22000 health ok after controlled restart

---

# Task 0152,0153: provider-catalog-absorption-pipeline

## Summary

Prepared routine provider catalog comparison and safe absorption triage.

## Changes

- Documented task completion details.

## Verification

- [x] Existing catalog extractor, runtime registry, provider consistency, model sync, pricing sync, and managed import patterns were inspected before task creation.
- [x] The static references/diegosouzapw-omniroute snapshot is explicitly treated as provenance-limited, not live upstream.
- [x] Tasks 0152 and 0153 use the OmniRoute template, npm exits, explicit ownership, and a 0152-to-0153 dependency.

---

# Task 0148,0149,0151: cursor-grok-provider-compatibility-tasks

## Summary

Created evidence-backed Cursor/Grok provider compatibility tasks; deferred Windsurf pending an upstream solution.

## Changes

- Documented task completion details.

## Verification

- [x] Tasks 0148, 0149, and 0151 use the OmniRoute template and are over 50 lines with npm-based exit conditions.
- [x] Task 0149 precedes 0151 because it owns the shared Grok Build protocol/config contract.
- [x] Task 0148 coordinates with Task 0120 to avoid Cursor protobuf/executor file collisions.

---

# Task build-isolation: build-reference-symlink-isolation

## Summary

Adds symlink-safe transient isolation, orphan recovery, signal/compile-failure restoration, backup preservation, and regression tests for the EACCES glob failure.

## Changes

- Documented task completion details.

## Verification

- [x] node --import tsx/esm --test tests/unit/build-next-isolated.test.ts tests/unit/build/assemble-standalone.test.ts; npm run build (exit 0, references restored, peak RSS sampled ~20.1 GiB)

---

# Task 0136: home-quota-client-server-boundary

## Summary

Splits pure client aggregation from server-only DB access, adds dpdm import-graph proofs, and fixes the Next client bundle failure caused by ioredis dns/net/tls imports.

## Changes

- Documented task completion details.

## Verification

- [x] node --import tsx/esm --test tests/unit/error-message-sanitization.test.ts tests/unit/provider-quota-summary-0136.test.ts; npx vitest run --config vitest.config.ts tests/unit/ui/home-degraded-warnings-0128.test.tsx tests/unit/ui/home-provider-quota-summary-0136.test.tsx; npm run typecheck:core

---

# Task 0145: kimi-web-core-coverage

## Summary

Covers non-stream and multi-frame stream decoding, abort/DONE behavior, HTTP/fetch errors, validator branches, request envelopes, and sanitized errors without live credentials.

## Changes

- Documented task completion details.

## Verification

- [x] node --import tsx/esm --test tests/unit/kimi-web-core-coverage.test.ts tests/unit/*kimi*.test.ts

---

# Task 0139: nvidia-runtime-failure-contract

## Summary

Separates synthetic 524, post-tool empty stream, valid tool-only completion, and upstream 5xx semantics without duplicating generic quality detection or weakening outage protection.

## Changes

- Documented task completion details.

## Verification

- [x] node --import tsx/esm --test tests/unit/nvidia-runtime-failure-contract.test.ts tests/unit/validate-quality-empty-streaming.test.ts tests/unit/nvidia-model-test-identity.test.ts tests/unit/combo-empty-content-failover-5085.test.ts

---

# Task 0133: Add AND/OR conditional fusion rules

## Summary

Implemented explicit `AND`/`OR` conditional fusion rules combining tool and text predicates with short-circuiting logic and backward-compatible defaults. Added bounded Zod validation for rule trees (depth <= 5) and extended the Fusion editor UI with accessible rule management controls without introducing new topbars or chrome.

## Changes

- **MOD** `src/shared/validation/schemas/combo.ts` — Added `fusionRuleSchema`, `getFusionRuleDepth` validation, and updated `triggers` schema to accept `mode: "rules"`, `operator: "AND" | "OR"`, and bounded `rules` array.
- **MOD** `open-sse/services/fusionTriggers.ts` — Added `evaluateRule`, rule types (`FusionRule`, `FusionLeafRule`, `FusionGroupRule`), and updated `shouldTriggerFusion` with short-circuiting `AND`/`OR` rules evaluation and fail-closed defaults for empty/invalid rules.
- **MOD** `open-sse/services/combo.ts` — Reassigned `let result` for repetition retry assignments fixing compilation errors.
- **MOD** `src/app/(dashboard)/dashboard/fusions/fusionEditorTypes.ts` — Extended `TriggerMode`, `FusionTriggersForm`, `emptyFusionForm`, `formFromCombo`, and `buildSavePayload` to serialize/deserialize rules mode with AND/OR operator.
- **MOD** `src/app/(dashboard)/dashboard/fusions/FusionTriggersSection.tsx` — Added rules mode button, operator selector (AND/OR), interactive rules list with kind select, pattern input, remove button, and add rule control.
- **MOD** `src/i18n/messages/en.json` — Added i18n keys for rules mode and rule editor controls.
- **MOD** `docs/architecture/FUSION.md` — Documented `rules` trigger mode and AND/OR conditional rules in schema and trigger modes sections.
- **MOD** `tests/unit/fusion-triggers.test.ts` — Added unit tests for AND, OR, short-circuiting, empty/invalid rules, and nested rule groups (39/39 pass).
- **MOD** `tests/unit/fusion-editor-types.test.ts` — Added unit tests for rules mode payload build, round-trip, and Zod depth validation (19/19 pass).

## Verification

- [x] `node --import tsx/esm --test tests/unit/fusion-triggers.test.ts tests/unit/fusion-editor-types.test.ts` — 58 pass
- [x] `node --import tsx/esm --test tests/unit/fusion-contracts.test.ts tests/unit/fusion-cognitive-diversity.test.ts tests/unit/fusion-combo-ref-dispatch.test.ts tests/unit/fusion-timeout-abort.test.ts tests/unit/fusion-acting.test.ts tests/unit/fusion-units-resolve.test.ts tests/unit/fusion-panel-tools-none.test.ts` — 102 pass
- [x] `node --import tsx/esm --test tests/unit/ui/fusions-routing-hub-matrix-0075.test.ts tests/unit/ui/fusions-list-acting-0077.test.ts` — 15 pass
- [x] `npm run typecheck:core` — 0 errors
- [x] `npx eslint` on touched files — 0 errors, 0 warnings

---

# Task 0131: repetition-sanity-retry

## Summary

Preserves opt-in guard semantics, retries within budget with a system sanity instruction, isolates repetition from breaker exhaustion, and falls through deterministically.

## Changes

- Documented task completion details.

## Verification

- [x] node --import tsx/esm --test tests/unit/stream-repetition-guard.test.ts tests/unit/combo-repetition-fallback.test.ts tests/unit/combo-repetition-sanity-retry.test.ts

---

# Task 0141: reasoning-budget-control-surfaces

## Summary

Consumes the 0140 resolver contract, preserves passthrough defaults, displays precedence/capabilities, validates unsupported controls, and adds UI/source-contract coverage.

## Changes

- Documented task completion details.

## Verification

- [x] node --import tsx/esm --test tests/unit/reasoning-budget-control-surfaces.test.ts tests/unit/ui/thinking-budget-tab-0141.test.ts tests/unit/reasoning-budget-resolution.test.ts tests/unit/reasoning-budget-translator-integration.test.ts tests/unit/thinking-budget.test.ts tests/unit/thinking-budget-groq-3258.test.ts tests/unit/service-thinking-budget.test.ts tests/unit/base-thinking-budget-config-5312.test.ts

---

# Task 0134: consolidate-settings-routing-ai-resilience

## Summary

Removes obsolete peer tabs, composes each section once, updates sidebar/header active state, and adds anti-phantom chrome/redirect coverage.

## Changes

- Documented task completion details.

## Verification

- [x] node --import tsx/esm --test tests/unit/ui/settings-routing-consolidation-0134.test.ts tests/unit/ui/settings-hub-tabnav-0054.test.ts tests/unit/settings-ui-layout-static.test.ts tests/integration/integration-wiring.test.ts tests/unit/dashboard-shell-tabs.test.ts tests/unit/sidebar-route-match.test.ts

---

# Task 0130: combo-system-prompt-modes

## Summary

Adds strict mode schema/type/API round-trip, deterministic middleware message transformation, accessible combo UI control, and production normalization coverage.

## Changes

- Documented task completion details.

## Verification

- [x] node --import tsx/esm --test tests/unit/combo-system-prompt-modes.test.ts

---

# Task 0132: fine-grained-timeout-resolver

## Summary

Adds strict timeout precedence, wires runtime and test consumers, validates settings bounds, and preserves stream readiness, idle, SOCKS, and Codex timeout classes.

## Changes

- Documented task completion details.

## Verification

- [x] node --import tsx/esm --test tests/unit/chatcore-upstream-timeouts.test.ts tests/unit/fine-grained-timeouts-consumers.test.ts tests/unit/settings-timeouts.test.ts tests/unit/combo-config.test.ts tests/unit/stream-readiness-policy.test.ts

---

# Task 0136: home-provider-quota-summary

## Summary

Aggregates active accounts by canonical provider, preserves unknown/stale quota semantics, uses bounded domain reads, and renders a single-chrome Home widget.

## Changes

- Documented task completion details.

## Verification

- [x] node --import tsx/esm --test tests/unit/provider-quota-summary-0136.test.ts && npx vitest run --config vitest.config.ts tests/unit/ui/home-provider-quota-summary-0136.test.tsx tests/unit/ui/home-degraded-warnings-0128.test.tsx tests/unit/ui/home-page-client-dashboard-smoke-4615.test.tsx tests/unit/ui/home-provider-topology-section-4606.test.tsx tests/unit/ui/home-topology-hidden-4596.test.tsx

---

# Task 0129: provider-model-auto-sync-default-on

## Summary

Preserves manual/periodic sync, debounces duplicate triggers, isolates sync failures from connection persistence, and adds Routing settings coverage.

## Changes

- Documented task completion details.

## Verification

- [x] node --import tsx/esm --test tests/unit/provider-model-auto-sync.test.ts

---

# Task 0148: sqlite-import-limit-1000mb

## Summary

Defaults and clamps OMNIROUTE_DB_IMPORT_MAX_MB at 1000 MB, preserves lower operator overrides, keeps audio/file upload limits separate, updates regression tests, and documents synchronization in AGENTS.md.

## Changes

- Documented task completion details.

## Verification

- [x] node --import tsx/esm --test tests/unit/body-size-guard.test.ts tests/unit/db-import-max-size-4719.test.ts

---

# Task 0143: account-aware-breaker-fallback

## Summary

Adds scope-aware account eligibility, preserves fail-closed provider outages and narrow model lockouts, and updates async regression callers.

## Changes

- Documented task completion details.

## Verification

- [x] node --import tsx/esm --test tests/integration/account-aware-breaker.test.ts tests/unit/combo-resilience-wiring-0043.test.ts tests/unit/combo-402-fallback.test.ts tests/unit/combo-repetition-fallback.test.ts

---

# Task 0140: reasoning-budget-resolution

## Summary

Adds typed precedence resolution, effort/token capability gates, bounded budgets, suffix handling, and production-path translator coverage.

## Changes

- Documented task completion details.

## Verification

- [x] node --import tsx/esm --test tests/unit/reasoning-budget-resolution.test.ts tests/unit/reasoning-budget-translator-integration.test.ts tests/unit/thinking-budget.test.ts tests/unit/thinking-budget-groq-3258.test.ts tests/unit/service-thinking-budget.test.ts tests/unit/base-thinking-budget-config-5312.test.ts tests/unit/kimi-k2.7-code-registration.test.ts

---

# Task 0128: home-degraded-key-inline-warnings

## Summary

Preserves health polling, sanitizes reasons, prevents search redirects and duplicate chrome, and adds deterministic Home warning coverage.

## Changes

- Documented task completion details.

## Verification

- [x] npx vitest run --config vitest.config.ts tests/unit/ui/home-degraded-warnings-0128.test.tsx tests/unit/ui/home-page-client-dashboard-smoke-4615.test.tsx tests/unit/ui/home-provider-topology-section-4606.test.tsx tests/unit/ui/home-topology-hidden-4596.test.tsx

---

# Task 0147: lmarena-error-path-coverage

## Summary

Adds deterministic error-path tests and prevents false completion events after an aborted pending stream read.

## Changes

- Documented task completion details.

## Verification

- [x] node --import tsx/esm --test tests/unit/lmarena-error-path-coverage.test.ts tests/unit/lmarena-*.test.ts tests/unit/executor-lmarena.test.ts

---

# Task 0146: qwen-tls-client-coverage

## Summary

Covers WAF, timeout/cache seams, SSE phases, and corrects test isolation evidence for transitive runtime side effects.

## Changes

- Documented task completion details.

## Verification

- [x] node --import tsx/esm --test tests/unit/qwen-tls-client-coverage.test.ts tests/unit/executor-qwen-web.test.ts

---

# Task 0144: antigravity-quota-family-bars

## Summary

Adds typed family grouping, minimum-remaining aggregation, reset/stale metadata preservation, and antigravity/agy regression coverage.

## Changes

- Documented task completion details.

## Verification

- [x] node --import tsx/esm --test tests/unit/antigravity-quota-family-bars.test.ts tests/unit/provider-limits-ui.test.ts tests/unit/antigravity-usage-service.test.ts tests/unit/antigravity-usage-fetcher.test.ts tests/unit/usage-antigravity-family-split.test.ts

---

# Task 0142: combo-retry-control-labels

## Summary

Updates labels and help text with inclusive retry, scope, reset, transient-only, and default semantics, backed by regression and sabotage tests.

## Changes

- Documented task completion details.

## Verification

- [x] node --import tsx/esm --test tests/unit/combo-retry-control-labels.test.ts tests/unit/combo-config.test.ts tests/unit/combo-control-center.test.ts tests/unit/combo-cooldown-retry.test.ts tests/unit/chat-cooldown-aware-retry.test.ts tests/unit/combo-quota-share-cooldown-wait.test.ts tests/unit/combo-builder-draft.test.ts tests/unit/db-combos-crud.test.ts tests/unit/json-migration-combos.test.ts

---

# Task 0138: nvidia-test-target-identity

## Summary

Canonicalizes provider aliases, preserves legitimate Cline passthrough routes, returns expected and resolved provider/model metadata, and adds regression coverage.

## Changes

- Documented task completion details.

## Verification

- [x] node --import tsx/esm --test tests/unit/nvidia-model-test-identity.test.ts tests/unit/model-test-runner.test.ts tests/unit/model-alias-provider-resolution.test.ts tests/unit/model-cross-proxy-compat.test.ts tests/unit/cline-catalog-models-3321.test.ts

---

# Task 0145-0147: gortex-review-follow-up-coverage

## Summary

Gortex blast-radius review converted into evidence-backed follow-up tasks.

## Changes

- Documented task completion details.

## Verification

- [x] Codex review evidence is restricted to gpt-5.6-luna for runtime proof.
- [x] Qwen and LM Arena executor coverage was confirmed; follow-ups target downstream/error-path gaps.
- [x] Kimi core response/stream/validator coverage remains a final-approval blocker for Task 0122.

---

# Task 0138-0144: provider-reasoning-quota-task-wave

## Summary

New provider reliability, reasoning control, and quota clarity task wave.

## Changes

- Documented task completion details.

## Verification

- [x] All tasks 0138-0144 use the OmniRoute npm exit matrix and template sections.
- [x] docs/dependency-tree.md records dependencies and collision waves.
- [x] No production container or :22000 state was mutated.

---

# Task 0127: Insert duplicated combo below source

## Summary

Duplicating a combo now renders the copy immediately below the source combo in the current sort order, instead of receiving the next global `sort_Order` and appearing at the end of the list.

### What changed

- **UI** (`.../dashboard/combos/page.tsx` `handleDuplicate`): compute the source-relative float ordering before POST. When a source combo has a neighbor below it, the duplicate gets the midpoint between source and next. When the source is last, the duplicate gets `source + 1`.
- **Schema** (`src/shared/validation/schemas/combo.ts`): `createComboSchema` already accepted an explicit `sortOrder` field (verified no change needed — pre-existing support).
- **DB** (`src/lib/db/combos.ts`): `createCombo` already respects an explicit `sortOrder` in the payload (verified no change needed — pre-existing support).
- **Regression tests** (`tests/unit/combo-duplicate-order.test.ts`): 6 tests covering explicit sort-order DB persistence, route-level preservation, end-to-end source-relative placement, config fidelity, reorder normalization, and failure/no-partial-record behavior.

### What did NOT change

- No new copy route — the existing POST `/api/combos` path was used.
- No new DB fields or migrations — `sort_order` column already existed from migration `020_combo_sort_order.sql`.
- No production `:22000` access — tests run against in-memory SQLite fixtures.

## Verification

- `npm run typecheck:core`: PASS (no Emit errors)
- `tests/unit/combo-duplicate-order.test.ts`: PASS 6/6
- `tests/unit/db-combos-crud.test.ts`: PASS 6/6 (no regressions)
- `npm run lint`: PASS (0 errors, 0 warnings on changed files)
- UI smoke proof: fixture-only (`:23456`)

**Author**: gt-ts-code-reviewer (path-to-100 — missing changelog entry added by reviewer)

---

# Task 0126-0137: open-task-review-corrections

## Summary

Task governance corrections and active dependency tree refresh.

## Changes

- Documented task completion details.

## Verification

- [x] Task 0036 no longer instructs agents to treat 21000 as production or 22000 as a test canary.
- [x] Task 0126 uses an exact codex-gpt56-compat test path and ../legacy reference path.
- [x] docs/dependency-tree.md includes current tasks 0126-0137 and collision edges.

---

# Task 0126: task-wave-created

## Summary

The wave contains 12 template-compliant tasks with explicit dependencies, file ownership, false-gap notes, npm exits, and review routing. No product implementation is claimed by this entry.

## Changes

- Documented task completion details.

## Verification

- [x] 12 new task files verified in docs/tasks/01-open; each is 122+ lines and has the required template sections
- [x] IDs 0126-0137 are unique and tasklist.md was not modified

---

# Task 0114: EPIC-24 T24-C — Hub discoverability tests + polish

## Summary

Completed the final task of EPIC-24 (Combo Topology). Extended existing discoverability tests, created a new dedicated Routing hub matrix test for Combo Topology, verified the anti-phantom chrome constraint (single `RoutingHubSubnav` topbar), and updated `docs/guides/UI.md` to include Topology in the Routing hub topbar peer list.

## Changes

- Updated `tests/unit/ui/routing-hub-discoverability-0025.test.ts` to assert Topology presence in `RoutingHubSubnav` and `CommandPalette`.
- Updated `tests/unit/ui/fusions-routing-hub-matrix-0075.test.ts` to include Topology in top-level hub mount assertions.
- Created `tests/unit/ui/combo-topology-routing-hub-matrix-0114.test.ts` for dedicated EPIC-24 hub matrix & anti-phantom chrome validation.
- Updated `docs/guides/UI.md` to list `Topology` in the Routing hub segment-2 peer list.

## Verification

- `node --import tsx/esm --test tests/unit/ui/combo-topology-routing-hub-matrix-0114.test.ts`
- `node --import tsx/esm --test tests/unit/ui/routing-hub-discoverability-0025.test.ts`
- `node --import tsx/esm --test tests/unit/ui/fusions-routing-hub-matrix-0075.test.ts`
- `node --import tsx/esm --test tests/unit/combo-topology-graph.test.ts`
- `node --import tsx/esm --test tests/unit/ui/combo-topology-ui-route-0113.test.ts`
- `npm run typecheck:core`
- `npx eslint --max-warnings=0` on modified/created files

---

# Docs: single agent constitution surface (`AGENTS.md`)

## Summary

Root already had both `AGENTS.md` (architecture + fork laws) and `CLAUDE.md` (Hard Rules,
worktrees, testing protocol, resilience, quality gates). Operator asked to consolidate:
keep `AGENTS.md`, archive the full Claude file, stub redirect for tools that only load
`CLAUDE.md`.

## Changes

- Expanded root `AGENTS.md` with CLAUDE-only material:
  - Common modification scenarios (API/DB/MCP/A2A/cloud/embedded)
  - Resilience runtime state (breaker / cooldown / lockout)
  - Testing protocol + Hard Rule #18
  - Planning `_tasks/` override
  - Git workflow + worktree isolation (`.worktrees/<slug>/`)
  - Environment, quality gates, Hard Rules 1–23, PII learnings
- Moved full prior `CLAUDE.md` → `.archive/docs/CLAUDE.md-merged-into-AGENTS-20260722.md`
- Root `CLAUDE.md` is now a short pointer to `AGENTS.md`
- `docs/tasks/AGENTS.md` pointer updated

## Verification

- `test -f AGENTS.md && test -f CLAUDE.md && test -f .archive/docs/CLAUDE.md-merged-into-AGENTS-20260722.md`
- `rg -n 'Hard Rules|Worktree isolation|Resilience Runtime' AGENTS.md` hits present

---

# Chore: worktree canonical path → `.worktrees/<slug>/`

## Summary

Operator-requested clarification and path change for Hard Rule #19 worktree location.
Isolation rule stays; only the on-disk root changes.

## Changes

- `CLAUDE.md`: Worktree isolation + Hard Rule #19 now mandate **`.worktrees/<slug>/`**
- Explains *why*: (1) shared-checkout clobber incidents 2026-06-05/13, (2) build-scope OOM
  2026-06-25 if worktrees escape `tsconfig`/`dockerignore` excludes
- Notes `.worktrees` was already excluded in `tsconfig.json` / `.gitignore` / `.dockerignore`
- Legacy `.claude/worktrees/` tolerated for existing sessions; no new worktrees there
- `docs/tasks/AGENTS.md`: pointer updated

## Verification

- `rg -n '\\.worktrees|"\\.claude"' tsconfig.json .gitignore .dockerignore` — `.worktrees` present in excludes
- No code/runtime change

---

# Tasks 0107–0111: EPIC-22 Cognitive diversity as config (promote)

## Summary

Promoted Phase 1 epic **Cognitive diversity as config, not as tool** from planning into executable open tasks. Phase 2 remains held as EPIC-23 until Phase 1 renders in production use. No runtime code in this change — task governance only.

## Changes

- Added `docs/tasks/01-open/0107-omniroute-epic22-cognitive-lenses-catalog-contracts.md`
- Added `docs/tasks/01-open/0108-omniroute-epic22-cognitive-schema-normalize-plumb.md`
- Added `docs/tasks/01-open/0109-omniroute-epic22-cognitive-runtime-inject.md`
- Added `docs/tasks/01-open/0110-omniroute-epic22-cognitive-fusion-editor-ui.md`
- Added `docs/tasks/01-open/0111-omniroute-epic22-cognitive-docs-presets-changelog.md`
- Updated `docs/tasks/00-planning/EPIC-22-omniroute-cognitive-diversity-fusion.md` status → Children open
- Planning siblings (already present): EPIC-22 fail-first contract, EPIC-23 held

## Verification

- All five task files ≥50 lines (template-compliant)
- Gate documented: 0107 → 0108 → 0109; 0110 parallel after 0108; 0111 last
- EPIC-23 remains held in `00-planning/`

---

# Task 0109: EPIC-22 T22-C cognitive runtime inject + judgeMode

## Summary

Wire operator `thinkingMode` / `systemAddon` into fusion panel fan-out bodies via `applyFusionCognitiveLens` + `injectCustomSystemPrompt`, and optional `judgeMode` into the judge user-turn directive. Panel lenses stay isolated from judge; D9 panel invariants preserved.

## Changes

- **MOD** `open-sse/services/fusion.ts` — `applyFusionCognitiveLens`; per-unit inject on multi-panel fan-out + single-panel early path; `buildJudgePrompt(answers, judgeMode?)` uses `resolveJudgeModeDirective`; `HandleFusionChatOptionsV2.judgeMode`
- **MOD** `open-sse/services/combo.ts` — pass `config.judgeMode` into `handleFusionChatV2`
- **MOD** `tests/unit/fusion-cognitive-diversity.test.ts` — unskipped 0109 runtime anti-bullshit body-capture suite (diversity, composition, custom, judge isolation, judgeMode, single-panel, combo-ref D9)

## Verification

- [x] `node --import tsx/esm --test tests/unit/fusion-cognitive-diversity.test.ts tests/unit/fusion-panel-tools-none.test.ts tests/unit/fusion-acting.test.ts tests/unit/fusion-timeout-abort.test.ts` — 49 pass, 1 skip (0110), 0 fail
- [x] `node --import tsx/esm --test tests/unit/fusion-combo-ref-dispatch.test.ts` — 19 pass
- [x] `npm run typecheck:core` — clean
- [x] `npx eslint --max-warnings=0` on touched files — clean

---

# Task 0105: EPIC-21 T21-E catalog/docs dim capabilities (review path-to-100)

## Summary

Reviewer hardening for surface composition coverage, public MRL type immutability, and operator docs clarity on mode vs D4 truncate.

## Changes

- `open-sse/config/embeddingRegistry.ts`: `EmbeddingModelPublicMrlFields.matryoshkaDimensions` typed `readonly number[]`
- `tests/unit/embedding-dim-capabilities-catalog.test.ts`: list/catalog composition guards; no bare `as EmbeddingModel` fixtures; allowlist identity copy assert
- `docs/reference/API_REFERENCE.md`: `matryoshkaMode: "provider"` does not disable D4 client truncate+renorm

## Verification

- [x] `node --import tsx/esm --test tests/unit/embedding-dim-capabilities-catalog.test.ts` (10 pass)
- [x] `npx eslint --max-warnings=0 open-sse/config/embeddingRegistry.ts tests/unit/embedding-dim-capabilities-catalog.test.ts`
- [x] `npm run typecheck:core`

---

# Task 0104: EPIC-21 client MRL truncate fallback (review path-to-100)

## Summary

Reviewer hardening for fail-closed pure-helper semantics and type purity.

## Changes

- `open-sse/utils/embeddingMrl.ts`: `applyClientMrlToEmbeddingData` re-runs `validateRequestedMrlDim` (defense-in-depth); `Reflect.get`/`Object.assign` instead of `as Record`; batch `fromDim` uses max observed source dim
- `tests/unit/embedding-mrl-truncate.test.ts`: invalid MRL dim without pre-gate + base64 non-float skip cases

## Verification

- [x] `node --import tsx/esm --test tests/unit/embedding-mrl-truncate.test.ts tests/unit/embeddings-gemini-dimensions.test.ts tests/unit/embeddings-matryoshka.test.ts tests/unit/embeddings-dimension-dialect.test.ts tests/unit/embeddings-handler.test.ts` (64 pass)
- [x] `npx eslint --max-warnings=0 open-sse/utils/embeddingMrl.ts open-sse/handlers/embeddings.ts tests/unit/embedding-mrl-truncate.test.ts`
- [x] `npm run typecheck:core`

---

# Task 0111: EPIC-22 T22-E cognitive docs + recipes + changelog closeout

## Summary

Document operator-facing cognitive diversity for fusion: lenses are **combo config** (panel
`thinkingMode` / `systemAddon`, config `judgeMode`), not MCP tools; field tables, fingerprints,
Write-safe / Design-deep / Cheap-diversity recipes, and anti-confusion vs provider thinking.
EPIC-22 status note updated to Phase 1 children complete pending review trail; EPIC-23 remains held.
No hand-edit of generated root `CHANGELOG.md`.

## Changes

- **MOD** `docs/architecture/FUSION.md` — primary sources, ResolvedFusionUnit cognitive fields,
  `config.judgeMode` + panel field tables, full **Cognitive diversity (EPIC-22)** section
  (config-not-MCP, anti-confusion, fingerprints, resolve/inject, recipes, smoke matrix),
  operator guide + troubleshooting + i18n keys
- **MOD** `docs/routing/AUTO-COMBO.md` — one-line FUSION pointer + config table rows for
  `judgeMode` / `thinkingMode` / `systemAddon`
- **MOD** `docs/tasks/00-planning/EPIC-22-omniroute-cognitive-diversity-fusion.md` — status note
  (Phase 1 children complete pending review; EPIC-23 held; SSoT pointer)
- **ADD** this ledger entry under `.changelog/`

## Verification

- [x] Grep field names exist in `src/` / `open-sse/`: `thinkingMode`, `systemAddon`, `judgeMode`,
  `FUSION_COGNITIVE_LENS_IDS`, `FUSION_JUDGE_MODE_IDS`, `FUSION_SYSTEM_ADDON_MAX_CHARS`,
  `applyFusionCognitiveLens`, `resolvePanelLensText`, `resolveJudgeModeDirective`,
  fingerprints `[omniroute-lens:…]` / `[omniroute-judge:…]`
- [x] Lens ids: `first-principles`, `adversarial`, `security`, `systems`, `implementation`,
  `skeptical-evidence`, `custom`
- [x] Judge modes: `synthesize`, `dialectical`, `security-review`, `pick-best`
- [x] Strategies in recipes: `fusion` | `conditional-fusion` only
- [x] No MCP thinking tools claimed as shipped
- [x] EPIC-23 not promoted
- [x] `npm run check:fabricated-docs` — repo-wide pre-existing drift (838); **no** `FUSION.md` hits for this change; manual greps are the accuracy gate

---

# Task 0110 review path-to-100

## Summary

Formal frontend-quality review scored 100 after in-session fixes. Task promoted to `03-review/`.

## Changes (reviewer)

- **MOD** `FusionUnitRow.tsx` — htmlFor/id, aria-describedby, aria-invalid, maxLength on systemAddon
- **MOD** `FusionTuningSection.tsx` — judge mode label association
- **MOD** `FusionEditorClient.tsx` — systemAddon length save guard
- **MOD** `fusionCognitiveLenses.ts` — SSoT `FUSION_SYSTEM_ADDON_MAX_CHARS = 4000`
- **MOD** `combo.ts` — re-export max constant from catalog
- **MOD** `en.json` — `fusionCognitiveSystemAddonTooLong`
- **ADD** `docs/reports/reviews/2026-07-22-task-0110-epic22-cognitive-fusion-editor-ui-review.md`

## Verification

- [x] 47 pure tests pass
- [x] typecheck:core + eslint clean
- [x] Task moved to `docs/tasks/03-review/`

---

# Task 0110: EPIC-22 T22-D cognitive fusion editor UI

## Summary

Operators can set per-panel cognitive lens + systemAddon and combo-level judgeMode in the Fusion editor. Pure helpers round-trip through `unitToPayload` / `formFromCombo` / `createComboSchema`. No new topbar or sidebar leaf.

## Changes

- **MOD** `src/app/(dashboard)/dashboard/fusions/fusionEditorTypes.ts` — `FusionModelUnit.thinkingMode` / `systemAddon`; form `judgeMode`; normalize/payload/buildSave/formFromCombo
- **MOD** `src/app/(dashboard)/dashboard/fusions/FusionUnitRow.tsx` — lens select + systemAddon textarea when `showCognitiveFields` (panels only); combo-ref clears cognitive
- **MOD** `src/app/(dashboard)/dashboard/fusions/FusionUnitsSections.tsx` — `showCognitiveFields` on panel rows
- **MOD** `src/app/(dashboard)/dashboard/fusions/FusionTuningSection.tsx` — judge mode select
- **MOD** `src/app/(dashboard)/dashboard/fusions/FusionEditorClient.tsx` — preserve cognitive on model re-pick; custom-requires-addon client validation
- **MOD** `src/i18n/messages/en.json` — `fusionCognitive*` / `fusionJudgeMode*` keys
- **MOD** `tests/unit/fusion-editor-types.test.ts` — 0110 pure contracts
- **MOD** `tests/unit/fusion-cognitive-diversity.test.ts` — unskipped 0110 editor round-trip

## Verification

- [x] `node --import tsx/esm --test tests/unit/fusion-cognitive-diversity.test.ts tests/unit/fusion-editor-types.test.ts` — 47 pass, 0 fail, 0 skip
- [x] `npm run typecheck:core` — clean
- [x] `npx eslint` on touched fusion UI files — clean

---

# Task 0108: EPIC-22 T22-B cognitive schema + normalize + ResolvedFusionUnit plumb

## Summary

Make fusion cognitive diversity fields survive Zod parse → `normalizeComboStep` → `resolveFusionUnits` / `comboStepToFusionUnit`. No panel body inject (0109) and no editor UI (0110).

## Changes

- **MOD** `src/shared/validation/schemas/combo.ts` — optional `thinkingMode` (`FUSION_COGNITIVE_LENS_IDS`), `systemAddon` (max 4000), superRefine `custom` requires non-empty addon; optional `config.judgeMode` (`FUSION_JUDGE_MODE_IDS`) sibling of `fusionTuning`
- **MOD** `src/lib/combos/steps.ts` — `ComboModelStep` + `normalizeComboStep` preserve mode/addon
- **MOD** `open-sse/services/fusion.ts` — model arm of `ResolvedFusionUnit` + `comboStepToFusionUnit` plumb fields
- **MOD** `tests/unit/fusion-cognitive-diversity.test.ts` — unskipped 0108 schema/normalize/resolve contracts + round-trip
- **MOD** `tests/unit/combo-config.test.ts` — judgeMode accept/reject
- **MOD** `tests/unit/fusion-contracts.test.ts` — optional cognitive fields on unit type smoke

## Verification

- [x] `node --import tsx/esm --test tests/unit/fusion-cognitive-diversity.test.ts tests/unit/fusion-contracts.test.ts tests/unit/combo-config.test.ts` — 81 pass, 6 skip (0109/0110), 0 fail
- [x] `npm run typecheck:core` — clean
- [x] `npx eslint` on touched files — clean

---

# Task 0107: EPIC-22 T22-A cognitive lens catalog SSoT + fail-first contracts

## Summary

EPIC-22 gate: pure cognitive lens catalog with `[omniroute-lens:<id>]` fingerprints and `resolvePanelLensText` composition; `fusion-cognitive-diversity.test.ts` catalog section green; runtime/schema/editor contracts `test.skip` until 0108–0110. No runtime wire into `fusion.ts` (0109).

## Changes

- **NEW** `src/shared/constants/fusionCognitiveLenses.ts` — closed `FUSION_COGNITIVE_LENS_IDS` (7 ids, no low/medium/high), preset inject text + fingerprints, `resolvePanelLensText`, `isFusionCognitiveLensId`, judge mode ids + `resolveJudgeModeDirective` pure stubs for 0109
- **NEW** `tests/unit/fusion-cognitive-diversity.test.ts` — pure catalog contracts green; schema/runtime/editor skeletons skipped with EPIC-22/0108|0109|0110 tags

## Verification

- [x] `node --import tsx/esm --test tests/unit/fusion-cognitive-diversity.test.ts` — 8 pass, 9 skip, 0 fail
- [x] `npm run typecheck:core` — clean
- [x] `npx eslint` on touched files — clean

---

# Task 0103: epic21-registry-matryoshka-metadata (review path-to-100)

## Summary

Reviewer hardening for MRL helper fail-closed semantics and seed immutability.

## Changes

- `open-sse/config/embeddingRegistry.ts`: `geminiEmbeddingMrl()` factory; `isAllowedEmbeddingDim` incomplete-range fail-closed; `readonly number[]` allowlist
- `tests/unit/embeddings-matryoshka.test.ts`: incomplete metadata + array identity tests
- Root `CHANGELOG.md` Unreleased Fixed bullet

## Verification

- [x] `node --import tsx/esm --test tests/unit/embeddings-matryoshka.test.ts`
- [x] `npx eslint --max-warnings=0 open-sse/config/embeddingRegistry.ts tests/unit/embeddings-matryoshka.test.ts`

---

# Task 0106: 0106 path-to-100: ledger policy flip + honest residuals

## Summary

Independent review path-to-100 for Task 0106: policy docs require manage-changelog writes; PROVENANCE residual for parent-linked memories; profiles N/A by design.

## Changes

- Documented task completion details.

## Verification

- [x] docs/tasks/AGENTS.md + DoD overlay + template + create-tasks exits flipped to ledger mode
- [x] tmp/0106-symlinks.txt prove .memories and docs/changelog symlinks
- [x] repair --dry-run files needing repair: 0; validate issues=0 entries>=10; rebuild green
- [x] .archive/memories/omniroute-2-local-20260721/PROVENANCE.md honest residual

---

# Task 0101: EPIC-21 T21-A Gemini OpenAI-shim dimensions (P0)

## Summary

**Fixed (P0):** Gemini embeddings via Google’s OpenAI-compat shim (`/v1beta/openai/embeddings`) returned `400 Unknown name "outputDimensionality": Cannot find field.` because OmniRoute dual-forwarded the native Gemini field alongside OpenAI `dimensions`. OpenAI-shim path now forwards **`dimensions` only** (product lock D2); unit tests inverted from dual-forward to dimensions-only; combo schema comment no longer claims Gemini translation to `outputDimensionality`.

## Changes

### Fixed
- `open-sse/handlers/embeddings.ts` — removed Gemini dual inject of `outputDimensionality` on the production OpenAI-compat baseUrl; dimension fields applied via dialect SSoT (`applyEmbeddingDimensions`) with D2 preserved
- `tests/unit/embeddings-gemini-dimensions.test.ts` — inverted dual-forward assertions; assert `dimensions` present and `outputDimensionality` absent (single, batch, omit, non-Gemini, invalid dim); optional registry-seed case `gemini/gemini-embedding-2` + `dimensions: 768`
- `src/shared/validation/schemas/combo.ts` — embedding combo `dimensions` comment corrected to D2 (OpenAI-shim uses `dimensions` only; no dual-forward)

## Verification

- [x] `node --import tsx/esm --test tests/unit/embeddings-gemini-dimensions.test.ts tests/unit/embeddings-dimension-dialect.test.ts`
- [x] `npm run typecheck:core`
- [x] combo.ts comment: OpenAI-shim uses dimensions only (D2)

---

# Task 0105: EPIC-21 T21-E catalog/docs dim capabilities

## Summary

Expose registry MRL fields on GET /v1/embeddings list and /v1/models catalog embedding entries; document D1–D5 with grepped real paths.

## Changes

- `open-sse/config/embeddingRegistry.ts`: `toEmbeddingModelPublicMrlFields`, `EmbeddingModelPublicMrlFields`, `FlatEmbeddingModelListEntry`; `getAllEmbeddingModels` now spreads MRL capability fields
- `src/app/api/v1/embeddings/route.ts` GET: list entries include MRL fields for built-in models
- `src/app/api/v1/models/catalog.ts`: embedding catalog entries include MRL fields
- `open-sse/index.ts`: re-export `toEmbeddingModelPublicMrlFields`
- `tests/unit/embedding-dim-capabilities-catalog.test.ts` (new): mapper + flat-list coverage (MRL + non-MRL + allowlist copy)
- `docs/reference/API_REFERENCE.md`: Embeddings **Dimensions / Matryoshka (MRL)** section (D1–D5 with grepped paths)
- `docs/tasks/00-planning/EPIC-21-omniroute-embeddings-mrl-dimensions.md`: §5 catalog/docs success metrics checked

## Verification

- [x] node --import tsx/esm --test tests/unit/embedding-dim-capabilities-catalog.test.ts (8 pass)
- [x] node --import tsx/esm --test tests/unit/embedding-dim-capabilities-catalog.test.ts tests/unit/embedding-mrl-truncate.test.ts tests/unit/embeddings-matryoshka.test.ts tests/unit/embeddings-dimension-dialect.test.ts tests/unit/embeddings-gemini-dimensions.test.ts (63 pass)
- [x] npm run typecheck:core
- [x] npx eslint --max-warnings=0 open-sse/config/embeddingRegistry.ts open-sse/index.ts src/app/api/v1/embeddings/route.ts src/app/api/v1/models/catalog.ts tests/unit/embedding-dim-capabilities-catalog.test.ts

---

# Task 0104: EPIC-21 client MRL truncate fallback (T21-D)

## Summary

When a client requests `dimensions: d` and an MRL-capable model returns a longer float vector (`N ≥ d`), OmniRoute prefix-truncates to `d` and applies L2 renorm by default (`EMBEDDING_MRL_CLIENT_RENORM_DEFAULT`). Non-MRL models are never silently truncated.

## Changes

- `open-sse/utils/embeddingMrl.ts` (new): pure helpers — `parseRequestedEmbeddingDim`, `validateRequestedMrlDim`, `l2Normalize`, `prefixTruncateAndMaybeRenorm`, `applyClientMrlToEmbeddingData`; event name `embed.mrl_client_truncate`
- `open-sse/handlers/embeddings.ts`: pre-upstream MRL allowlist/range validation → 400; post-upstream client truncate+renorm; structured log; usage fields unchanged
- `tests/unit/embedding-mrl-truncate.test.ts` (new): pure + handler integration (full-dim mock → shortened unit vector; non-MRL 400; batch; invalid dim skips upstream)

## Verification

- [x] `node --import tsx/esm --test tests/unit/embedding-mrl-truncate.test.ts tests/unit/embeddings-gemini-dimensions.test.ts tests/unit/embeddings-matryoshka.test.ts tests/unit/embeddings-dimension-dialect.test.ts tests/unit/embeddings-handler.test.ts` (62 pass)
- [x] `npm run typecheck:core`

---

# Task 0103: epic21-registry-matryoshka-metadata

## Summary

Extend embedding registry types and curated model rows with Matryoshka/MRL metadata for Gemini, OpenAI text-embedding-3-*, and Qwen3-Embedding family. Lock L2 renorm default on for 0104.

## Changes

- `open-sse/config/embeddingRegistry.ts`: `MatryoshkaMode`, MRL fields on `EmbeddingModel`, seed helpers, `EMBEDDING_MRL_CLIENT_RENORM_DEFAULT`, `getEmbeddingModel` / `isMatryoshkaModel` / `isAllowedEmbeddingDim`
- `tests/unit/embeddings-matryoshka.test.ts`: seed shape + negative (ada-002 / non-MRL) + renorm lock
- Root `CHANGELOG.md` Unreleased entry

## Verification

- [x] `node --import tsx/esm --test tests/unit/embeddings-matryoshka.test.ts tests/unit/embeddings-dimension-dialect.test.ts`
- [x] `npm run typecheck:core`

---

# Task 0106: changelog-migrate-and-memories-parent-link

## Summary

migrate root CHANGELOG to .changelog; parent-linked .memories (archived local shell).

## Changes

- Documented task completion details.

## Verification

- [x] validate entries=2; .memories -> ../.memories/omniroute-2
- [x] docs/changelog is symlink to ../.changelog (or migrate-created ledger)
- [x] validate/build green after migration wave 20260721

---
