---
date: 20260816-173216
timestamp: 20260816-173216
project: "omniroute-2"
agent: "gt-task-architect"
task: "0175"
description: "REVISED Task 0175 (Enter MaaS) per session review: (1) base URL https://api.enter.converge.ai/v1 demoted from fact to hypothesis; (2) new evidence gate RD-omniroute-enter-maas-evidence must approve endpoint/contract/catalog/billing before implementation; (3) provider id renamed enter -> enter-maas to avoid future collision with a possible enter-code OAuth connector; (4) seed catalog now empty (models: []) with live /v1/models as SSoT; (5) apiHint no longer claims shared credits; (6) changelog exit condition now requires real entry via manage-changelog + rebuild.sh build && validate; (7) providers-constants-split count must be recalculated at implementation time; (8) new tests required for Bearer header, SSE streaming, tool calls, and sanitized 401."
is_rebuild_safe: true
---

# Task 0175: enter-maas-provider-connector-task-revised-evidence-gated

## Summary

Task 0175 revised: evidence-gated by new RD task; empty seed catalog; no unverified facts; provider id enter-maas.

## Changes

- Documented task completion details.

## Verification

- [x] docs/tasks/01-open/0175 rewritten (224 lines); RD-omniroute-enter-maas-evidence created (162 lines); dependency-tree Wave U + EPIC-25 updated.
