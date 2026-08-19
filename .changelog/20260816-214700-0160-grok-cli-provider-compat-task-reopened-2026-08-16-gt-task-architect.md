---
date: 20260816-214700
timestamp: 20260816-214700
project: "omniroute-2"
agent: "gt-task-architect"
task: "0160"
description: "REOPENED Task 0160 (architect-orchestrator audit 2026-08-16): the gate introduced by this task (local unknown-ID rejection in src/sse/handlers/chatHelpers.ts:239-247 and open-sse/executors/grok-cli.ts:295-304) contradicts passthroughModels: true declared in the same registry entry. The handoff packet already acknowledges the conflict ('explicit unknown IDs are now gated before dispatch') — that decision elevates a sanitization need into a global dispatch prerequisite, exactly what passthroughModels: true forbids. Operator evidence: grok-cli/grok-4.6 (single prefix) returns Unknown model 'grok-4.6'. Status reverted to [ ] Open; appended Re-open Ledger citing task-remediation-triage.md matrix row 1 (defect local to the task's own scope). Three new Exit Conditions added: condition the gate to non-passthrough providers only; add grok-4.6 to registry after fresh SSoT refresh (AGENTS.md rule 6); regression-guard grok-cli/grok-4.6 dispatches correctly. File moved docs/tasks/03-review/ -> docs/tasks/01-open/ (per lane-architecture.md 'Failed final review currently follows root task law: 03-review -> 01-open'). The reopen is SERIALIZED with Task 0176 (canonical alias normalization helper) — the gate removal is only safe after the helper that makes dispatch-by-alias canonical."
is_rebuild_safe: true
---

# Task 0160: grok-cli-provider-compat-task-reopened-2026-08-16

## Summary

Task 0160 reopened: gate contradicts passthroughModels: true; awaits 0176 helper before re-builder wave.

## Changes

- Documented task completion details.

## Verification

- [x] docs/tasks/01-open/0160-omniroute-grok-cli-provider-compatibility.md reopened with Status [ ] and 3 new Exit Conditions; Re-open Ledger appended; file moved from 03-review to 01-open.
