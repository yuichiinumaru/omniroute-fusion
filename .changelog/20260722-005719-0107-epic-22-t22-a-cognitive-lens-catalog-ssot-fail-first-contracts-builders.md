---
date: 20260722-005719
timestamp: 20260722-005719
project: "omniroute-2"
agent: "builders"
task: "0107"
description: "Add fusionCognitiveLenses.ts closed catalog + resolve helpers; pure green tests; skeleton skips for 0108-0110."
is_rebuild_safe: true
---

# Task 0107: EPIC-22 T22-A cognitive lens catalog SSoT + fail-first contracts

## Summary

EPIC-22 gate: pure cognitive lens catalog with `[omniroute-lens:<id>]` fingerprints and `resolvePanelLensText` composition; `fusion-cognitive-diversity.test.ts` catalog section green; runtime/schema/editor contracts `test.skip` until 0108–0110. No runtime wire into `fusion.ts` (0109).

## Changes

- **NEW** `src/shared/constants/fusionCognitiveLenses.ts` — closed `FUSION_COGNITIVE_LENS_IDS` (7 ids, no low/medium/high), preset inject text + fingerprints, `resolvePanelLensText`, `isFusionCognitiveLensId`, judge mode ids + `resolveJudgeModeDirective` pure stubs for 0109
- **NEW** `tests/unit/fusion-cognitive-diversity.test.ts` — pure catalog contracts green; schema/runtime/editor skeletons skipped with EPIC-22/0108|0109|0110 tags

## Verification

- [x] `node --import tsx/esm --test tests/unit/fusion-cognitive-diversity.test.ts` — 8 pass, 9 skip, 0 fail
- [x] `npm run typecheck:core` — clean
- [x] `npx eslint` on touched files — clean
