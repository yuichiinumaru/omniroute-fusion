---
date: 20260722-010100
timestamp: 20260722-010100
project: "omniroute-2"
agent: "builders"
task: "0108"
description: "EPIC-22 T22-B: Zod thinkingMode/systemAddon/judgeMode + normalize + ResolvedFusionUnit plumb (no fan-out inject)."
is_rebuild_safe: true
---

# Task 0108: EPIC-22 T22-B cognitive schema + normalize + ResolvedFusionUnit plumb

## Summary

Make fusion cognitive diversity fields survive Zod parse → `normalizeComboStep` → `resolveFusionUnits` / `comboStepToFusionUnit`. No panel body inject (0109) and no editor UI (0110).

## Changes

- **MOD** `src/shared/validation/schemas/combo.ts` — optional `thinkingMode` (`FUSION_COGNITIVE_LENS_IDS`), `systemAddon` (max 4000), superRefine `custom` requires non-empty addon; optional `config.judgeMode` (`FUSION_JUDGE_MODE_IDS`) sibling of `fusionTuning`
- **MOD** `src/lib/combos/steps.ts` — `ComboModelStep` + `normalizeComboStep` preserve mode/addon
- **MOD** `open-sse/services/fusion.ts` — model arm of `ResolvedFusionUnit` + `comboStepToFusionUnit` plumb fields
- **MOD** `tests/unit/fusion-cognitive-diversity.test.ts` — unskipped 0108 schema/normalize/resolve contracts + round-trip
- **MOD** `tests/unit/combo-config.test.ts` — judgeMode accept/reject
- **MOD** `tests/unit/fusion-contracts.test.ts` — optional cognitive fields on unit type smoke

## Verification

- [x] `node --import tsx/esm --test tests/unit/fusion-cognitive-diversity.test.ts tests/unit/fusion-contracts.test.ts tests/unit/combo-config.test.ts` — 81 pass, 6 skip (0109/0110), 0 fail
- [x] `npm run typecheck:core` — clean
- [x] `npx eslint` on touched files — clean
