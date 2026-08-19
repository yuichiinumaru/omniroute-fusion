---
date: 20260814-115219
timestamp: 20260814-115219
project: "omniroute-2"
agent: "builders"
task: "0164"
description: "Reconcile OpenCode Free registry and catalog with verified opencode models --refresh output, removing historical/unverified IDs and preserving separate opencode-zen registry"
is_rebuild_safe: true
---

# Task 0164: refresh-opencode-free-model-catalog-from-live-cli

## Summary

Parent OpenCode Free catalog now contains the seven current provider IDs returned by live refresh (big-pickle, deepseek-v4-flash-free, hy3-free, laguna-s-2.1-free, mimo-v2.5-free, nemotron-3-ultra-free, nemotron-3.5-lightning-free). Focused contract test covers exact current set, registry/catalog parity, six historical stale negatives, and opencode-zen isolation. Minimal shared-registry alias repair restores the already-referenced ANTIGRAVITY_RUNTIME_BASE_URLS export.

## Changes

- Documented task completion details.

## Verification

- [ ] Relevant tests/build/lint commands executed and captured in task evidence.
