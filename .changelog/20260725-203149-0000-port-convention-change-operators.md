---
date: 20260725-203149
timestamp: 20260725-203149
project: omniroute
agent: operators
task: "0000"
description: "Port convention change: 21000 removed, 22000=prod, 23456=test"
is_rebuild_safe: true
---

# Task 0000: Port Convention Change (21000 removed / 22000=prod / 23456=test)

## Summary

Operator-mandated change in OmniRoute dev/runtime port convention. `21000` was
released for other projects; `22000` is now the production server (operator
session passes through it — never touch) and `23456` is the new test/dev target
for agent deploy and smoke tests.

## Changes

- `AGENTS.md` (workspace root) — banner, Dev Port Convention table, build
  revalidation guidance, environment quick reference, and Hard Rules updated
  to the new mapping. Added a "Nota de transição (2026-07-25)" so historical
  task/doc references to `21000`/`22000` can be interpreted correctly.
- Historical `21000` references in `docs/tasks/` and `docs/` are NOT being
  rewritten in this entry. Per the transition note, agents must read them as:
  `21000` = (removed, ignore), `22000` = PRODUCTION (never touch),
  `23456` = TEST (deploy/smoke target).

## Verification

- [x] `rg -n "21000|22000|23456" AGENTS.md` — all occurrences consistent with
      the new convention; `21000` only appears in the historical transition
      note, not as an active rule.
- [x] Banner at top of `AGENTS.md` reflects `22000` = PRODUÇÃO.
- [x] Hard Rules restated: `:22000` = production, `:23456` = test.

## Author

Operator (explicit authorization on 2026-07-25). Recorded by builder-orchestrator parent.
