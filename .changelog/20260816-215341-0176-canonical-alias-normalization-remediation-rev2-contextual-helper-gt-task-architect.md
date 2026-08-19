---
date: 20260816-215341
timestamp: 20260816-215341
project: "omniroute-2"
agent: "gt-task-architect"
task: "0176"
description: "REVISION 2 — Task 0176 (architect-orchestrator self-review, 2026-08-16): the previous version of this task had THREE contradictions. (1) It promised a 'fail-closed' return of null but then specified that cross-namespace prefixes (grok-cli/opencode-zen/big-pickle) should preserve the slash for upstream classification — a null cannot do both. (2) The proposed canonicalizeModelForProvider was a global helper that had to guess whether 'nvidia/...' in a Cline request was an opaque upstream model id or a foreign prefix; that guess was inconsistent with tests/unit/nvidia-model-test-identity.test.ts which already exercises the opaque passthrough contract. (3) The CI grep guard was scoped too broadly (whole codebase) and would produce false positives on logs and payload canonicalization sites. This revision: (a) replaces the global helper with a CONTEXTUAL one — normalizeModelForSelectedProvider(selectedProviderId, rawModelId, opts) where opts.allowOpaqueSlashModelId is an explicit caller declaration; the return is a discriminated union (same-provider | opaque-slash-model-id | foreign-provider-prefix), never null; (b) replaces the per-provider test recipe with a SINGLE table-driven boundary contract test (tests/unit/provider-alias-normalization.boundary.test.ts) that exercises the public boundaries (runSingleModelTest, TraeExecutor.resolveMode) and asserts the UPSTREAM-OBSERVABLE dispatch payload (provider + model sent + whether fetch was called); the table includes the exact user-observed inputs (gc/grok-4.6 etc.); (c) scopes the CI grep guard to input-boundary surfaces only (src/lib/api/, open-sse/handlers/, open-sse/executors/, open-sse/services/); (d) adds Anti-TDD rules to prevent 'tests passed but provider broken' — no helper-only tests, no fetch-mock tests without payload assertions, no 'no throw' tests."
is_rebuild_safe: true
---

# Task 0176: canonical-alias-normalization-remediation-rev2-contextual-helper

## Summary

Task 0176 revision 2: contextual helper (discriminated union), table-driven boundary contract, scope-bound CI grep guard, anti-TDD rules.

## Changes

- Documented task completion details.

## Verification

- [x] docs/tasks/01-open/0176-omniroute-canonical-alias-normalization.md rewritten (218 lines) with contextual helper signature + boundary matrix (9 rows) + scoped CI grep + anti-TDD rules; policy 'passthrough pleno + denylist explícita' propagated.
