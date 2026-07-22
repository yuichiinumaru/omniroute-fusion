---
date: 20260722-010701
timestamp: 20260722-010701
project: "omniroute-2"
agent: "builders"
task: "0110"
description: "EPIC-22 T22-D: Fusion editor UI for thinkingMode/systemAddon/judgeMode with save/load round-trip."
is_rebuild_safe: true
---

# Task 0110: EPIC-22 T22-D cognitive fusion editor UI

## Summary

Operators can set per-panel cognitive lens + systemAddon and combo-level judgeMode in the Fusion editor. Pure helpers round-trip through `unitToPayload` / `formFromCombo` / `createComboSchema`. No new topbar or sidebar leaf.

## Changes

- **MOD** `src/app/(dashboard)/dashboard/fusions/fusionEditorTypes.ts` — `FusionModelUnit.thinkingMode` / `systemAddon`; form `judgeMode`; normalize/payload/buildSave/formFromCombo
- **MOD** `src/app/(dashboard)/dashboard/fusions/FusionUnitRow.tsx` — lens select + systemAddon textarea when `showCognitiveFields` (panels only); combo-ref clears cognitive
- **MOD** `src/app/(dashboard)/dashboard/fusions/FusionUnitsSections.tsx` — `showCognitiveFields` on panel rows
- **MOD** `src/app/(dashboard)/dashboard/fusions/FusionTuningSection.tsx` — judge mode select
- **MOD** `src/app/(dashboard)/dashboard/fusions/FusionEditorClient.tsx` — preserve cognitive on model re-pick; custom-requires-addon client validation
- **MOD** `src/i18n/messages/en.json` — `fusionCognitive*` / `fusionJudgeMode*` keys
- **MOD** `tests/unit/fusion-editor-types.test.ts` — 0110 pure contracts
- **MOD** `tests/unit/fusion-cognitive-diversity.test.ts` — unskipped 0110 editor round-trip

## Verification

- [x] `node --import tsx/esm --test tests/unit/fusion-cognitive-diversity.test.ts tests/unit/fusion-editor-types.test.ts` — 47 pass, 0 fail, 0 skip
- [x] `npm run typecheck:core` — clean
- [x] `npx eslint` on touched fusion UI files — clean
