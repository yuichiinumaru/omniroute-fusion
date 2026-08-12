---
date: 20260808-163943
timestamp: 20260808-163943
project: "omniroute-2"
agent: "builders"
task: "build-emfile"
description: "Prevent Next static generation from exhausting the 4096 file-descriptor limit during production builds."
is_rebuild_safe: true
---

# Task build-emfile: stabilize-next-build-file-descriptors

## Summary

Adds experimental.cpus default 4 with OMNIROUTE_BUILD_CPUS override, validates invalid values, warns on low nofile limits, preserves reference symlink isolation, and proves a green build under nofile=4096.

## Changes

- Documented task completion details.

## Verification

- [x] node --import tsx/esm --test tests/unit/build-next-isolated.test.ts; npm run typecheck:core; OMNIROUTE_BUILD_CPUS=4 OMNIROUTE_BUILD_MEMORY_MB=16384 npm run build (exit 0, 617/617 pages, peak RSS ~16.5 GiB); production :22000 health ok after controlled restart
