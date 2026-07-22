# Review Report: Task 0109 — EPIC-22 T22-C Runtime per-panel cognitive inject + judgeMode (2026-07-22)

## Review Lineage

- **Current task**: Task 0109 (`omniroute-epic22-cognitive-runtime-inject`); live path at review start: `docs/tasks/02-doing/0109-omniroute-epic22-cognitive-runtime-inject.md`
- **Previous reports**: none found for 0109 (first formal review)
- **Related context**:
  - Task 0107 catalog SSoT (score 100) — fingerprints + `resolvePanelLensText` / `resolveJudgeModeDirective`
  - Task 0108 schema/normalize/plumb (score 100) — `ResolvedFusionUnit` model-arm fields
  - Downstream: 0110 editor UI (editor tests green in-tree; not scored here), 0111 recipe truth
  - EPIC-22 D8–D9 anti-bullshit core
- **Review mode**: `initial` (tsjs + code-quality)
- **Reviewer**: `gt-ts-code-reviewer` (parent agentID=`builders`)
- **Skills**: `code-quality-harness` + `tsjs-harness` (`ts-rules`)
- **Report date**: 2026-07-22
- **Constraints honored**: no git; no `:21000`; no `Sidebar.tsx` touch

## Score And Verdict

- **Score**: `100/100`
- **Verdict**: `ACCEPTED_100` / `PASS_PERFECT`
- **Lane recommendation**: move to `docs/tasks/03-review/` (S=100)

### Dual Score (verification gate)

| Dimension | Score | Notes |
|-----------|-------|-------|
| local_implementation | 100 | Pure `applyFusionCognitiveLens` + `buildJudgePrompt(..., judgeMode?)`; per-unit fan-out; single-panel early path; combo.ts `judgeMode` wire |
| runtime_enforcement | 100 | Body-capture suite proves diversity, composition, custom, judge isolation, judgeMode, single-panel inject, combo-ref D9; production path is `combo.ts` → `handleFusionChatV2` |

## Axiom Compliance (tsjs)

| Axiom | Status | Notes |
|-------|--------|-------|
| Type Purity | ✅ | No new `any` on task surface; `thinkingMode?: FusionCognitiveLensId` on model arm; only task `as Body` has `// SAFETY:` (Body ≡ `Record<string, unknown>`; inject returns same shape) |
| Boundary Integrity | ✅ | Combo-ref units identity-skip inject; unknown/empty compose → no inject; judge never receives panel lenses; `judgeMode` free string at runtime boundary degrades via catalog resolve |
| Async Determinism | ✅ | Inject pure-sync before fan-out awaits; no new floating promises; panel AbortController graph unchanged |
| Immutability | ✅ | `panelBodyBase` built once; inject path shallow-clones via `injectCustomSystemPrompt`; empty compose returns body without mutating base |
| State Exclusivity | ✅ | Panel lens only on model panel dispatch; judge directive only via `resolveJudgeModeDirective`; acting handoff uses `buildActingHandoffPrompt` only (no panel lens) |

## Rubric snapshot

| Dimension | Score | Notes |
| --- | --- | --- |
| Anti-bullshit diversity | 100 | Distinct system blobs for first-principles vs adversarial; fingerprints exclusive |
| Composition (mode + addon) | 100 | Security fingerprint + addon marker both present |
| Custom mode | 100 | Addon only; no `[omniroute-lens:` required |
| Judge isolation | 100 | Panel fingerprints absent from judge system + last user turn |
| judgeMode directive | 100 | pick-best ≠ synthesize; fingerprints match pure `buildJudgePrompt` |
| Single-panel early path | 100 | Inject applies; client stream/tools preserved (not D9 rewrite) |
| D9 under inject | 100 | stream:false, tool_choice:none, tools kept on multi-panel |
| Combo-ref no-mode | 100 | No throw; D9 body; no lens fingerprint |
| combo.ts wire | 100 | `config.judgeMode` string → `HandleFusionChatOptionsV2.judgeMode` |
| Scope discipline | 100 | No global default-on inject; no non-fusion strategies; no acting lens inject; no MCP |
| typecheck:core | 100 | exit 0 |
| lint (touched) | 100 | eslint `--max-warnings=0` exit 0 |
| Changelog ledger | 100 | `.changelog/20260722-040445-0109-epic22-cognitive-runtime-inject-builders.md` |

## Contract Compliance (Exit Conditions)

| Exit / MUST | Status | Live proof |
| --- | --- | --- |
| Baseline no modes → no lens fingerprint; D9 holds | ✅ | `runtime: unset modes…` |
| Diversity: different modes ⇒ different system blobs | ✅ | anti-bullshit test |
| Composition mode + systemAddon | ✅ | security + EXTRA_ADDON_MARKER |
| Custom + addon | ✅ | addon only |
| Judge isolation | ✅ | panel fingerprints absent |
| judgeMode changes judge prompt | ✅ | pick-best vs synthesize |
| Single-panel inject | ✅ | implementation fingerprint |
| Combo-ref no mode D9 | ✅ | stream/tool_choice/tools |
| Regression: panel-tools-none, acting, timeout-abort | ✅ | this session (see matrix) |
| Combo-ref-dispatch suite | ✅ | 19 pass |
| typecheck:core / lint | ✅ | exit 0 |
| Changelog | ✅ | present |
| No MCP / no default-on global inject | ✅ | fusion-only apply path |

### Test matrix (this session)

```text
node --import tsx/esm --test \
  tests/unit/fusion-cognitive-diversity.test.ts \
  tests/unit/fusion-panel-tools-none.test.ts \
  tests/unit/fusion-acting.test.ts \
  tests/unit/fusion-timeout-abort.test.ts
→ 50 pass / 0 fail / 0 skip
  (0110 editor section now green in-tree; not ownership of 0109)

node --import tsx/esm --test tests/unit/fusion-combo-ref-dispatch.test.ts
→ 19 pass / 0 fail

npm run typecheck:core → exit 0
npx eslint --max-warnings=0 \
  open-sse/services/fusion.ts \
  open-sse/services/combo.ts \
  tests/unit/fusion-cognitive-diversity.test.ts → exit 0
```

### Adversarial checks (this session)

| Case | Result |
|------|--------|
| Shared `panelBodyBase` mutation under inject | Inject clones messages; base unmutated; diversity captures differ |
| Panel lens leak into judge system/user | Absent (isolation test) |
| Acting handoff inject | `finalizeWithActing` uses original `body` + handoff user turn only — no `applyFusionCognitiveLens` |
| Empty compose / combo-ref | Identity body; D9 preserved |
| Unknown judgeMode at runtime | Catalog resolve → synthesize directive (write path Zod closed set on 0108) |
| Single-panel + stream:true + tools | Lens inject + client stream/tools kept |
| Malicious concurrent body mutation | Pre-existing shared tools/messages refs for no-lens panels (same as pre-EPIC-22 single body); inject path does not worsen |

### Production call graph (enforcement)

```
handleComboChat (strategy fusion | conditional-fusion trigger)
  → dispatchFusionStrategy()
    → resolveFusionUnits (0108 plumb: thinkingMode/systemAddon)
    → judgeMode = string config.judgeMode | undefined
    → handleFusionChatV2({ …, judgeMode })
      → panelBodyBase = {…, stream:false, tool_choice:"none"}  // D9
      → per unit: unitBody = applyFusionCognitiveLens(panelBodyBase, unit)
        → resolvePanelLensText → injectCustomSystemPrompt | identity
      → collectPanel → answers
      → buildJudgePrompt(answers, judgeMode)  // no panel lens
      → judge / acting finalize
```

## Findings

### Critical (Score < 50)

_None._

### Serious (Score 31–50)

_None._

### Debt (Score 51–70)

_None scoring for 0109._

### Improvements (non-scoring observations)

1. **Gemini-native body gap (deferred by task)**: `injectCustomSystemPrompt` handles OpenAI/Claude `messages[]` and Claude `system`, not Gemini `system_instruction` / contents-only. Task How says modify `systemPrompt.ts` only if a Gemini gap is proven by test — not proven in 0109. Judge `appendUserTurn` already handles `contents`. Track for a format-completeness follow-up if Gemini clients hit fusion with native format.
2. **No combo.ts-level body-capture for judgeMode**: Production wire is a one-line string pass; V2 capture tests fully cover directive behavior. Optional future: one combo-strategy integration assert that `config.judgeMode` reaches the judge user turn.
3. **No-lens panels share `panelBodyBase` by reference**: Intentional identity for empty compose; pre-dates EPIC-22. Inject path clones when applying. Acceptable.

## Path to 100

_None — score 100._ No path-to-100 edits required this session.

## Regression guards (for re-review)

If a future change regresses 0109, these must stay green:

1. Diversity body-capture: different `thinkingMode` ⇒ different system blobs with exclusive fingerprints.
2. Judge isolation: no `[omniroute-lens:` in judge body.
3. D9 under inject: `stream:false`, `tool_choice:"none"`, tools array preserved.
4. Single-panel early path still injects when mode set.
5. `buildJudgePrompt` / runtime judgeMode fingerprints differ across pick-best vs synthesize.
6. Acting path must not call `applyFusionCognitiveLens` on handoff body.
