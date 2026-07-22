# Review Report: Task 0108 — EPIC-22 T22-B Schema + Normalize + ResolvedFusionUnit Plumb (2026-07-22)

## Review Lineage

- **Current task**: Task 0108 (`omniroute-epic22-cognitive-schema-normalize-plumb`); live path at review start: `docs/tasks/02-doing/0108-omniroute-epic22-cognitive-schema-normalize-plumb.md`
- **Previous reports**: none found for 0108 (first formal review)
- **Related context**:
  - Task 0107 catalog SSoT (score 100) — `FUSION_COGNITIVE_LENS_IDS` / `FUSION_JUDGE_MODE_IDS`
  - Downstream: 0109 runtime inject (already green in-tree against this plumb), 0110 editor UI
  - EPIC-22 planning: cognitive diversity as config
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
| local_implementation | 100 | Zod fields + refine; normalize preserve; unit type + map; round-trip tests prove **keep** not only no-throw |
| runtime_enforcement | 100 by contract | Task forbids fan-out inject (0109). Write path is production: `createComboSchema`/`updateComboSchema` → `normalizeComboModels` → DB JSON blob; `resolveFusionUnits` is the runtime resolve surface |

### Reviewer path-to-100 fix applied this session

| Item | Action | Evidence |
|------|--------|----------|
| Type purity: `ResolvedFusionUnit.thinkingMode?: string` | Tightened to `FusionCognitiveLensId` (parity with `ComboModelStep`) | `open-sse/services/fusion.ts` |
| Unverified `as Body` on inject helper | Added `// SAFETY:` (Body ≡ `Record<string, unknown>`; inject returns same shape) | `applyFusionCognitiveLens` |

## Axiom Compliance (tsjs)

| Axiom | Status | Notes |
|-------|--------|-------|
| Type Purity | ✅ | No `any` on task surface; closed `z.enum(FUSION_*_IDS)`; unit `thinkingMode` is `FusionCognitiveLensId`; only justified `as Body` with SAFETY |
| Boundary Integrity | ✅ | Explicit model-step fields (no `.passthrough()` shortcut); `custom` requires non-empty trimmed `systemAddon`; max 4000; unknown lens/judge rejected; public `/v1/combos` projection still omits cognitive fields |
| Async Determinism | ✅ | Schema/normalize/resolve pure-sync; no new promises |
| Immutability | ✅ | Normalize/map build new objects; omit-fields path leaves pre-feature shape (`kind`+`model` only) |
| State Exclusivity | ✅ | `custom` without addon unrepresentable after Zod; invalid modes dropped at normalize (defense when bypassing write path) |

## Rubric snapshot

| Dimension | Score | Notes |
| --- | --- | --- |
| Schema contract (keep fields) | 100 | thinkingMode + systemAddon + judgeMode on parse output |
| custom + addon refine | 100 | missing / whitespace-only rejected |
| Max length | 100 | `FUSION_SYSTEM_ADDON_MAX_CHARS === 4000`; 4001 fails; exact 4000 ok |
| normalize + resolve plumb | 100 | deepEqual unit shapes including omit path |
| Round-trip | 100 | schema → normalize → resolveFusionUnits |
| Scope discipline | 100 | No UI (0110); inject fan-out ownership remains 0109 (helpers may exist; 0108 contract is plumb) |
| typecheck:core | 100 | exit 0 |
| lint (touched) | 100 | eslint exit 0 |
| Changelog ledger | 100 | `.changelog/20260722-010100-0108-…-builders.md` |

## Contract Compliance (Exit Conditions)

| Exit / MUST | Status | Live proof |
| --- | --- | --- |
| Optional `thinkingMode` / `systemAddon` on model step schema | ✅ | `comboModelStepInputSchema` |
| `custom` requires non-empty `systemAddon` | ✅ | superRefine + tests |
| `judgeMode` optional config sibling (not inside strict fusionTuning) | ✅ | `comboRuntimeConfigSchema` + tests |
| `normalizeComboStep` preserves mode+addon | ✅ | unit test + API create path uses `normalizeComboModels` |
| `ResolvedFusionUnit` model arm + `comboStepToFusionUnit` | ✅ | fusion.ts |
| Parse **keeps** fields (not only no-throw) | ✅ | assert.equal / deepEqual on parsed + resolved |
| Omit ⇒ pre-feature shape | ✅ | `"thinkingMode" in step0 === false`; panels deepEqual `{kind,model}` |
| `fusion-cognitive-diversity` + `fusion-contracts` + `combo-config` | ✅ | this session (see matrix) |
| typecheck:core / lint | ✅ | exit 0 |
| Changelog | ✅ | present |
| No DB migration | ✅ | JSON combo blob only |
| No panel inject claim as 0108 | ✅ | 0108 scope is plumb; 0109 owns fan-out |

### Test matrix (this session)

```text
node --import tsx/esm --test \
  tests/unit/fusion-cognitive-diversity.test.ts \
  tests/unit/fusion-contracts.test.ts \
  tests/unit/combo-config.test.ts
→ 89 pass / 1 skip (0110 editor) / 0 fail
  (0108 section all green; concurrent 0109 runtime tests also green against plumb)

npm run typecheck:core → exit 0
npx eslint open-sse/services/fusion.ts --max-warnings=0 → exit 0
```

### Adversarial checks (this session)

| Case | Result |
|------|--------|
| Exact 4000-char addon | accepted |
| All 7 lens ids | accepted (`custom` + addon) |
| All 4 judge modes | accepted |
| Addon alone (no mode) | kept through schema |
| Zod → normalize → resolve (API-like) | panels retain mode+addon; config.judgeMode kept |
| Invalid mode at normalize (bypass Zod) | mode dropped; addon kept |
| `thinkingMode: null` / numeric addon | rejected |
| Judge step with cognitive fields | plumbed onto judge unit via same map |

### Production write path (graph)

```
POST/PUT /api/combos
  → createComboSchema | updateComboSchema (Zod keep + refine)
  → normalizeComboModels / normalizeComboStep (preserve known lens + string addon)
  → createCombo / updateCombo → SQLite data JSON
  → getCombos re-normalizeComboRecord (still preserves)
  → resolveFusionUnits → comboStepToFusionUnit (model arm fields)
```

Public projection (`projectComboStep`) continues to emit only `kind` / `model` / `providerId` — operator-private default honored.

## Findings

### Critical (Score < 50)

_None._

### Serious (Score 31–50)

_None._

### Debt (Score 51–70)

_None remaining after path-to-100._

### Improvements (resolved this session)

1. **RESOLVED** — `ResolvedFusionUnit.thinkingMode` was free `string`; now `FusionCognitiveLensId`.
2. **RESOLVED** — `as Body` on inject helper documented with `// SAFETY:`.

### Observations (non-scoring)

- `applyFusionCognitiveLens` / `buildJudgePrompt(…, judgeMode)` exist in `fusion.ts` and 0109 body-capture tests are already green in this workspace. That is **0109** ownership, not a 0108 exit gap; 0108 is correctly scored on schema→normalize→unit plumb.
- Normalize does not re-enforce max-4000 or custom+addon (write path is Zod). Invalid DB hand-edits degrade safely via `resolvePanelLensText` empty compose.
- `z.enum` rejects whitespace-padded lens ids at write time; catalog resolve trims — UI should send closed ids (editor task 0110).

## Path to 100

_Completed in this review session:_

1. ~~Type `ResolvedFusionUnit.thinkingMode` as `FusionCognitiveLensId`~~ **done**
2. ~~SAFETY on `as Body`~~ **done**

No further 0108 work required.

## Review Ledger (compact — for task file)

| Field | Value |
|-------|-------|
| Score | 100 |
| Verdict | ACCEPTED_100 → `03-review/` |
| Report | `docs/reports/reviews/2026-07-22-task-0108-epic22-cognitive-schema-normalize-plumb-review.md` |
| Reviewer fix | `FusionCognitiveLensId` on unit + SAFETY on `as Body` |
| Residual risk | None for 0108; 0110 still owns editor round-trip |
