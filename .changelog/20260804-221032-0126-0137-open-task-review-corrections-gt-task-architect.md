---
date: 20260804-221032
timestamp: 20260804-221032
project: "omniroute-2"
agent: "gt-task-architect"
task: "0126-0137"
description: "Corrected the open-task wave after governance review: updated Task 0036 for the current 22000 production and 23456 test mapping, fixed Codex reference/test paths, clarified timeout phases and shared-file serialization, and refreshed docs/dependency-tree.md with the current DAG and dispatch waves."
is_rebuild_safe: true
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
