---
date: 20260722-121500
timestamp: 20260722-121500
project: omniroute-2
agent: architect-orchestrator
task: "0000"
description: "Canonical git worktree path is .worktrees/<slug>/ (not .claude/worktrees)"
is_rebuild_safe: true
---

# Chore: worktree canonical path → `.worktrees/<slug>/`

## Summary

Operator-requested clarification and path change for Hard Rule #19 worktree location.
Isolation rule stays; only the on-disk root changes.

## Changes

- `CLAUDE.md`: Worktree isolation + Hard Rule #19 now mandate **`.worktrees/<slug>/`**
- Explains *why*: (1) shared-checkout clobber incidents 2026-06-05/13, (2) build-scope OOM
  2026-06-25 if worktrees escape `tsconfig`/`dockerignore` excludes
- Notes `.worktrees` was already excluded in `tsconfig.json` / `.gitignore` / `.dockerignore`
- Legacy `.claude/worktrees/` tolerated for existing sessions; no new worktrees there
- `docs/tasks/AGENTS.md`: pointer updated

## Verification

- `rg -n '\\.worktrees|"\\.claude"' tsconfig.json .gitignore .dockerignore` — `.worktrees` present in excludes
- No code/runtime change
