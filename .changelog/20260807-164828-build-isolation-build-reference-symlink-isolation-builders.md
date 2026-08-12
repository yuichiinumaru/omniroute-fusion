---
date: 20260807-164828
timestamp: 20260807-164828
project: "omniroute-2"
agent: "builders"
task: "build-isolation"
description: "Move and restore the workspace references symlink around Next builds without dereferencing the legacy target."
is_rebuild_safe: true
---

# Task build-isolation: build-reference-symlink-isolation

## Summary

Adds symlink-safe transient isolation, orphan recovery, signal/compile-failure restoration, backup preservation, and regression tests for the EACCES glob failure.

## Changes

- Documented task completion details.

## Verification

- [x] node --import tsx/esm --test tests/unit/build-next-isolated.test.ts tests/unit/build/assemble-standalone.test.ts; npm run build (exit 0, references restored, peak RSS sampled ~20.1 GiB)
