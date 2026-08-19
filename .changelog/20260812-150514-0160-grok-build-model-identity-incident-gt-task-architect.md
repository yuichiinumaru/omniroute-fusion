---
date: 20260812-150514
timestamp: 20260812-150514
project: "omniroute-2"
agent: "gt-task-architect"
task: "0160"
description: "Classified the operator's new incident—all Grok Build models returning HTTP 400 model not found—against completed Task 0149 and OAuth Task 0151. Read-only comparison found both tasks do not cover model registration/alias/provider separation: grok-cli registers grok-4.5 and grok-composer-2.5-fast, while grok-build-0.1 belongs to the separate xai registry; a grok-build test fixture is unregistered. Created Task 0160 to reconcile model identity and availability without speculative aliases or reopening protocol/login scope."
is_rebuild_safe: true
---

# Task 0160: grok-build-model-identity-incident

## Summary

Created a separate P0 model-identity task for Grok Build 400 model-not-found failures.

## Changes

- Documented task completion details.

## Verification

- [x] Fork and reference grok-cli registries contain grok-4.5 and grok-composer-2.5-fast; neither contains grok-build.
- [x] Reference xai registry contains grok-build-0.1, establishing a provider/auth distinction that must not be collapsed.
- [x] Task 0149 covers Responses/tool-call protocol and Task 0151 covers OAuth/login; neither covers model registration or alias resolution.
