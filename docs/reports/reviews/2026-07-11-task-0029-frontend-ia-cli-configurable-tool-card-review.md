# Review Report: Task 0029 — Frontend IA CLI ConfigurableToolCard — 2026-07-11

## Review Lineage

- **Current task**: Task 0029 (`frontend-ia-cli-configurable-tool-card`); live path `docs/tasks/03-review/0029-frontend-ia-cli-configurable-tool-card.md`
- **Previous reports read**:
  - `docs/reports/reviews/2026-07-10-task-0029-frontend-ia-cli-configurable-tool-card-review.md` (score 93, path-to-100 F1–F4 open)
- **Related reports considered**:
  - `docs/reports/builders/2026-07-10-wave2-closeout.md` — builder wave gate (aggregated green)
- **Review mode**: `re-review` (+ narrow residual path-to-100 patches during review)
- **Reviewer profile**: `reviewers` (Code Quality Reviewer / independent task reviewer)
- **Parent agentID**: `reviewers`

## Score And Verdict

- **Score**: `98/100` (was 93; F1–F4 closed this session)
- **Verdict**: `PASS WITH NOTES`
- **Lane recommendation**: `hold-in-review` (S ≥ 90 — remain in `docs/tasks/03-review/`; do **not** return to `02-doing/`; do **not** promote to `04-completed/`)

### Rubric snapshot

| Dimension | Score | Notes |
| --- | --- | --- |
| Contract / exit conditions | 100 | Shell + 2 pilots + residuals + shell tests + inventory/LOC |
| Composition API quality | 99 | Compound slots; SAFETY on cast; Field `htmlFor`; callbacks stay tool-owned |
| Pilot adoption | 98 | Kilo + Cline production cards on shell; Actions/Runtime/Backups wired |
| Tests | 99 | 15 shell + 4 Kilo + 3 Cline = 22; apply-disabled pilot guard added |
| Scope discipline | 100 | No OAuth/protocol changes; residuals not mass-migrated |
| Type purity | 98 | Cast annotated; ManualConfig dead `Record` spread removed |
| Residual honesty | 97 | Manual modal still empty configs (pre-existing API mismatch, not shell) |

### Axiom Compliance

| Axiom | Status | Notes |
|-------|--------|-------|
| Type Purity | ✅ | Compound cast has `// SAFETY:`; pilots no longer cast ManualConfig props |
| Boundary Integrity | ✅ | Shell presentational; fetch/JSON stays in pilots |
| Async Determinism | ✅ | Pilots wrap apply/reset/restore with `void`; shell actions sync |
| Immutability | ✅ | Path/backup `ReadonlyArray`; message readonly fields |
| State Exclusivity | ✅ | Message `success \| error`; expanded chrome gated on `isExpanded` |
| Contract / adoption | ✅ | ≥2 pilots; residual list; single detail-shell system |
| Frontend a11y | ✅ | Header Enter/Space; Field optional `htmlFor` wired on pilots |
| Verification | ✅ | Fresh vitest 22/22 + typecheck:core PASS |

## Delta Summary

### Resolved Since Previous Review

- `RESOLVED` F1: `// SAFETY:` on compound component cast (`ConfigurableToolCard.tsx:509`)
- `RESOLVED` F2: `.Field` accepts optional `htmlFor`; pilots associate model/api-key controls
- `RESOLVED` F3: dropped `as Record<string, unknown>` ManualConfig spreads; pass typed `configs={[]}`
- `RESOLVED` F4: Kilo pilot asserts apply disabled without model + no POST while disabled

### Persistent Findings

- none blocking

### Regressions

- none on Task 0029 surfaces

### New Findings

- `NOTE` N1 (Info / accepted residual): pilot `ManualConfigModal` still opens with `configs={[]}` because `ManualConfigModal` only supports copyable `configs` (`filename`/`content`), while Kilo/Cline historically passed non-existent `onApply`/`currentConfig` props (pre-existing API mismatch from initial import). Runtime was already a no-op empty modal; this review made the dead wiring honest rather than inventing file-format snippets. Follow-up: implement real `getManualConfigs()` per residual cards (Claude/Codex/OpenClaw pattern) or remove the edit affordance.
- `NOTE` N2 (Info): CHANGELOG remains parent-owned draft in task file (not written to `CHANGELOG.md`)

### Evidence Gaps / External Blockers

- none for exit bar
- `EXTERNAL_BLOCKER`: none

## Findings

| ID | Class | Severity | Status | Summary | First seen | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| F1 | RESOLVED | Low | Closed (this review) | Compound cast lacked SAFETY | 2026-07-10 | `ConfigurableToolCard.tsx:509` SAFETY comment |
| F2 | RESOLVED | Low | Closed (this review) | Field label not associable | 2026-07-10 | `htmlFor` prop + pilots `kilo-model-input` / `cline-model-input` |
| F3 | RESOLVED | Low | Closed (this review) | Untyped ManualConfig prop spread | 2026-07-10 | `configs={[]}` only; dead `handleManualConfig` removed |
| F4 | RESOLVED | Info | Closed (this review) | Thin pilot apply-disabled coverage | 2026-07-10 | `KiloToolCard-shell.test.tsx` apply-disabled + no POST |
| N1 | NEW | Info | Accepted residual | Empty ManualConfig content for pilots | this report | `ManualConfigModal.tsx:9` vs pilots `configs={[]}` |
| N2 | NEW | Info | Parent-owned | CHANGELOG draft only | 2026-07-10 | task Changelog Draft section |
| G1 | — | Guard | Pass | ≥2 pilots on shell only | this report | Kilo + Cline import `@/shared/components/cli` |
| G2 | — | Guard | Pass | Residual inventory still accurate | this report | 10 residual cards still on local Card chrome |
| G3 | — | Guard | Pass | No second detail-card system | this report | `CliToolCard` = list; `ConfigurableToolCard` = detail shell |

## Contract Compliance (Exit Conditions)

| Exit / MUST | Status | Live proof |
| --- | --- | --- |
| Inventory + residual list | ✅ | Task table; 10 residuals still unmigrated on FS |
| `ConfigurableToolCard` exported | ✅ | `src/shared/components/cli/index.ts:10-24` |
| ≥2 pilots migrated | ✅ | `KiloToolCard.tsx`, `ClineToolCard.tsx` compound slots |
| Shell unit tests (sections/actions/disabled) | ✅ | `ConfigurableToolCard.test.tsx` 15 tests |
| Pilot tests green | ✅ | Kilo 4 + Cline 3 |
| No protocol regressions | ✅ | No OAuth/executor changes in scope |
| LOC evidence recorded | ✅ | Shell ~517; pilots ~410/415 class; modest pilot delta documented |
| typecheck:core | ✅ | PASS this review |
| Targeted unit tests | ✅ | 22/22 PASS |
| CHANGELOG | ⚠️ | Draft in task; parent publishes |

**Pilot choice (Kilo + Cline)** remains sound: shared VS Code extension config family without OAuth protocol risk.

**No second card system**: list chrome (`CliToolCard`) vs detail config shell is intentional.

## Production Wiring Proof

```
src/shared/components/cli/ConfigurableToolCard.tsx
  → exported from cli/index.ts
  → KiloToolCard (dashboard/cli-code) production pilot
  → ClineToolCard (dashboard/cli-code) production pilot

Slots in use on both pilots:
  Root header (icon/name/badge/description/expand)
  .Checking | .Body | .RuntimeStatus | .ConfiguredBanner
  .Field (model + api key, with htmlFor)
  .Actions (applyDisabled={!selectedModel})
  .Message | .Backups
```

### Residual cards (not migrated — correct for this task)

| Card | LOC (live) | Migrated? |
|------|------------|-----------|
| ClaudeToolCard | 607 | residual |
| AntigravityToolCard | 490 | residual |
| CodexToolCard | 897 | residual |
| CopilotToolCard | 444 | residual |
| DroidToolCard | 609 | residual |
| HermesAgentToolCard | 528 | residual |
| OpenClawToolCard | 575 | residual |
| CliproxyapiToolCard | 261 | residual |
| DefaultToolCard | 746 | residual |
| CustomCliCard | 373 | residual |

## Evidence Reviewed

### Commands run (fresh this review)

```bash
npx vitest run --config vitest.config.ts \
  tests/unit/ui/ConfigurableToolCard.test.tsx \
  tests/unit/ui/KiloToolCard-shell.test.tsx \
  tests/unit/ui/ClineToolCard-shell.test.tsx
# → 3 files, 22 tests passed

npm run typecheck:core
# → PASS (tsc -p tsconfig.typecheck-core.json)

wc -l src/shared/components/cli/ConfigurableToolCard.tsx \
  src/app/(dashboard)/dashboard/cli-code/components/{Kilo,Cline}ToolCard.tsx
# shell ~517; pilots post-patch smaller than pre-evidence 447/448

rg -n "ConfigurableToolCard" src/app/(dashboard)/dashboard/cli-code/components/
# only Kilo + Cline adopt shell
```

- Commands not run: full monorepo e2e / visual browser (out of scope for shell unit contract)

### Narrow patches applied this review

| File | Change |
| --- | --- |
| `src/shared/components/cli/ConfigurableToolCard.tsx` | SAFETY cast; Field `htmlFor` |
| `src/app/(dashboard)/dashboard/cli-code/components/KiloToolCard.tsx` | htmlFor wiring; drop dead ManualConfig cast/handler; `configs={[]}` |
| `src/app/(dashboard)/dashboard/cli-code/components/ClineToolCard.tsx` | same as Kilo |
| `tests/unit/ui/ConfigurableToolCard.test.tsx` | assert Field `htmlFor` |
| `tests/unit/ui/KiloToolCard-shell.test.tsx` | apply-disabled without model + no POST |

## Path To 100 (residual polish only)

1. **N1** — Add real `getManualConfigs()` for Kilo/Cline (mirror Codex/OpenClaw) **or** remove empty edit-modal affordance.
2. **N2** — Parent publishes CHANGELOG draft under Unreleased Features.
3. Optional: migrate next residual pair (`CopilotToolCard` + `OpenClawToolCard`) in a **new** task once shell API is frozen.

No blocking path-to-100 items remain for the S8 exit contract.

## Task Ledger Patch Suggestion

```markdown
## Review Ledger

### Latest Review
- **Date**: 2026-07-11
- **Reviewer profile**: `reviewers`
- **Score**: `98/100`
- **Verdict**: `PASS WITH NOTES`
- **Full report**: `docs/reports/reviews/2026-07-11-task-0029-frontend-ia-cli-configurable-tool-card-review.md`
- **Lane outcome**: remains in `03-review` (S≥90; not completed)
- **Task reference**: Task 0029 (`frontend-ia-cli-configurable-tool-card`)

#### Current Open Blockers
- none

#### Path-to-100 Summary
- closed F1–F4 this review
- residual notes: empty ManualConfig configs (N1); CHANGELOG parent (N2)

### Previous Reports
- `docs/reports/reviews/2026-07-10-task-0029-frontend-ia-cli-configurable-tool-card-review.md` (93)
```

## Score rationale

Exit contract fully met with composition-first shell, two real production pilots, residual honesty, and green verification. Prior path-to-100 (SAFETY, Field a11y, ManualConfig cast, pilot apply-disabled) closed in this re-review. Deducted 2 points for empty ManualConfig content residual (pre-existing pilot UX hole made explicit) and parent-owned CHANGELOG draft.
