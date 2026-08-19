---
date: 20260816-214707
timestamp: 20260816-214707
project: "omniroute-2"
agent: "gt-task-architect"
task: "0176"
description: "Created Task 0176 (remediation, P1): operationalize AGENTS.md rule 7 (one prefix per provider) and docs/sourceoftruth.md rule 1 by publishing a single canonicalizeModelForProvider(providerId, modelId) helper that uses parseModel + resolveProviderAlias with cross-namespace prefix fail-closed semantics. Migrates two known broken call sites: src/lib/api/modelTestRunner.ts:185-193 (the same blind-re-prefix pattern that produces grok-cli/gc/grok-4.6 from gc/grok-4.6) and open-sse/executors/trae.ts (replace(/^tr//,'') workaround that should also use the canonical path). Adds a CI grep guard (scripts/check/check-no-blind-provider-prefix-concat.mjs) against blind ${providerId}/${...} concatenation outside the helper. Regression suite tests/unit/provider-alias-normalization.test.ts covers: (a) grok-cli/gc/grok-4.6 -> resolvedModel grok-4.6 (no double prefix), (b) grok-cli/grok-cli/grok-4.5 -> grok-4.5 (id-prefixed canonical), (c) cross-namespace prefix (grok-cli/opencode-zen/big-pickle) preserves the slash for upstream classification, (d) trae/tr/minimax-m3 -> minimax-m3, (e) trae/minimax-m3 -> unchanged, (f) trae/trae/minimax-m3 -> minimax-m3. The pattern has been observed three times: grok-cli (gc/), trae (tr/), opencode-zen/free (oc/, corrected in resolveVirtualCandidate). Without this helper, any future provider whose alias differs from its id will re-introduce the bug. The task is SERIALIZED with the Task 0160 reopen (the gate-removal depends on the helper). Tasks 0173/0174/0175 (recent provider connectors) inherit the safety by default once 0176 publishes the helper."
is_rebuild_safe: true
---

# Task 0176: canonical-alias-normalization-remediation

## Summary

Created Task 0176 (remediation, P1) to publish canonicalizeModelForProvider helper, migrate modelTestRunner + Trae regex, and add CI grep guard.

## Changes

- Documented task completion details.

## Verification

- [x] docs/tasks/01-open/0176-omniroute-canonical-alias-normalization.md created (199 lines); references docs/tasks/01-open/0160 as Depends on; serialized with 0160 per Wave V (dependency-tree.md).
