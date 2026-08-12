---
date: 20260810-184225
timestamp: 20260810-184225
project: "omniroute-2"
agent: "gt-task-architect"
task: "0157"
description: "Recorded the MetaMuse incident where muse-spark-1.2-contributor is available on only one account and other accounts return a 404 body containing Expected id to be a string. Source investigation found the current combo path intends to treat 404s as fallback-worthy, but lacks an exact two-account regression proving the candidate error cannot escape to a successful harness call. Created Task 0157 to harden and prove account/model-scoped fail-soft behavior and trace the error layer before changing parser logic."
is_rebuild_safe: true
---

# Task 0157: combo-fail-soft-unavailable-models

## Summary

Created incident-driven combo resilience task with explicit distinction between upstream 404 body and harness tool-call schema failures.

## Changes

- Documented task completion details.

## Verification

- [x] Source investigation inspected combo.executeTarget, accountFallback.checkFallbackError, handleNoCredentials, and muse-spark-web; no Expected id literal exists in the codebase.
- [x] Task requires mocked account A contributor 404 → account B normal model success, scoped lockout without provider breaker, aggregate error only after exhaustion, and sanitized logging.
