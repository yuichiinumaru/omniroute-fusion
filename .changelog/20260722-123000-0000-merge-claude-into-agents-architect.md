---
date: 20260722-123000
timestamp: 20260722-123000
project: omniroute-2
agent: architect-orchestrator
task: "0000"
description: "Merge CLAUDE.md agent rules into AGENTS.md; archive historical CLAUDE"
is_rebuild_safe: true
---

# Docs: single agent constitution surface (`AGENTS.md`)

## Summary

Root already had both `AGENTS.md` (architecture + fork laws) and `CLAUDE.md` (Hard Rules,
worktrees, testing protocol, resilience, quality gates). Operator asked to consolidate:
keep `AGENTS.md`, archive the full Claude file, stub redirect for tools that only load
`CLAUDE.md`.

## Changes

- Expanded root `AGENTS.md` with CLAUDE-only material:
  - Common modification scenarios (API/DB/MCP/A2A/cloud/embedded)
  - Resilience runtime state (breaker / cooldown / lockout)
  - Testing protocol + Hard Rule #18
  - Planning `_tasks/` override
  - Git workflow + worktree isolation (`.worktrees/<slug>/`)
  - Environment, quality gates, Hard Rules 1–23, PII learnings
- Moved full prior `CLAUDE.md` → `.archive/docs/CLAUDE.md-merged-into-AGENTS-20260722.md`
- Root `CLAUDE.md` is now a short pointer to `AGENTS.md`
- `docs/tasks/AGENTS.md` pointer updated

## Verification

- `test -f AGENTS.md && test -f CLAUDE.md && test -f .archive/docs/CLAUDE.md-merged-into-AGENTS-20260722.md`
- `rg -n 'Hard Rules|Worktree isolation|Resilience Runtime' AGENTS.md` hits present
