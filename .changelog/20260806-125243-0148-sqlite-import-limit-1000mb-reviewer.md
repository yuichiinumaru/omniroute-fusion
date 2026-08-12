---
date: 20260806-125243
timestamp: 20260806-125243
project: "omniroute-2"
agent: "reviewer"
task: "0148"
description: "Raise the canonical SQLite backup/import maximum from 100 MB to 1000 MB (1 GB) across the import route and body-size guard."
is_rebuild_safe: true
---

# Task 0148: sqlite-import-limit-1000mb

## Summary

Defaults and clamps OMNIROUTE_DB_IMPORT_MAX_MB at 1000 MB, preserves lower operator overrides, keeps audio/file upload limits separate, updates regression tests, and documents synchronization in AGENTS.md.

## Changes

- Documented task completion details.

## Verification

- [x] node --import tsx/esm --test tests/unit/body-size-guard.test.ts tests/unit/db-import-max-size-4719.test.ts
