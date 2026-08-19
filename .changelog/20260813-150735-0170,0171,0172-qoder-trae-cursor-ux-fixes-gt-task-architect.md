---
date: 20260813-150735
timestamp: 20260813-150735
project: "omniroute-2"
agent: "gt-task-architect"
task: "0170,0171,0172"
description: "Created Tasks 0170, 0171, and 0172 to handle UX and connector consistency for minor providers post-investigation. Task 0170 proposes moving Qoder OAuth settings from rigid `.env` variables to a UI database feature flag. Task 0171 strips double prefixing (`tr/`) in Trae to avoid 502/4001 empty config errors and restores dynamic credential resolution to comply with Hard Rule #11. Task 0172 implements a Docker-only experimental automatic CLI login for Cursor using `cursor-agent login` and parsing `auth.json` dynamically upon explicit user instruction, mirroring Grok CLI automated auth capturing capabilities without leaking tokens."
is_rebuild_safe: true
---

# Task 0170,0171,0172: qoder-trae-cursor-ux-fixes

## Summary

Created execution tasks for Qoder OAuth DB Flag, Trae connector prefixing, and Cursor CLI automated auth capture.

## Changes

- Documented task completion details.

## Verification

- [x] Tasks strictly documented per template expectations and dependencies sequenced appropriately.
