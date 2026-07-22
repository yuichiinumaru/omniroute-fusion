---
date: 20260722-040445
timestamp: 20260722-040445
project: "omniroute-2"
agent: "builders"
task: "0109"
description: "EPIC-22 T22-C: per-panel cognitive lens inject + judgeMode in handleFusionChatV2 (anti-bullshit)."
is_rebuild_safe: true
---

# Task 0109: EPIC-22 T22-C cognitive runtime inject + judgeMode

## Summary

Wire operator `thinkingMode` / `systemAddon` into fusion panel fan-out bodies via `applyFusionCognitiveLens` + `injectCustomSystemPrompt`, and optional `judgeMode` into the judge user-turn directive. Panel lenses stay isolated from judge; D9 panel invariants preserved.

## Changes

- **MOD** `open-sse/services/fusion.ts` — `applyFusionCognitiveLens`; per-unit inject on multi-panel fan-out + single-panel early path; `buildJudgePrompt(answers, judgeMode?)` uses `resolveJudgeModeDirective`; `HandleFusionChatOptionsV2.judgeMode`
- **MOD** `open-sse/services/combo.ts` — pass `config.judgeMode` into `handleFusionChatV2`
- **MOD** `tests/unit/fusion-cognitive-diversity.test.ts` — unskipped 0109 runtime anti-bullshit body-capture suite (diversity, composition, custom, judge isolation, judgeMode, single-panel, combo-ref D9)

## Verification

- [x] `node --import tsx/esm --test tests/unit/fusion-cognitive-diversity.test.ts tests/unit/fusion-panel-tools-none.test.ts tests/unit/fusion-acting.test.ts tests/unit/fusion-timeout-abort.test.ts` — 49 pass, 1 skip (0110), 0 fail
- [x] `node --import tsx/esm --test tests/unit/fusion-combo-ref-dispatch.test.ts` — 19 pass
- [x] `npm run typecheck:core` — clean
- [x] `npx eslint --max-warnings=0` on touched files — clean
