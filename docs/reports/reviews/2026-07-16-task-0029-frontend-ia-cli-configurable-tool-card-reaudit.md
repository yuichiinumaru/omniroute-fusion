# Re-Audit Report: Task 0029 — CLI ConfigurableToolCard — 2026-07-16

## Review Lineage

- **Current task**: Task 0029 (`frontend-ia-cli-configurable-tool-card`); live path `docs/tasks/03-review/0029-frontend-ia-cli-configurable-tool-card.md`
- **Previous reports read**:
  - `docs/reports/reviews/2026-07-11-task-0029-frontend-ia-cli-configurable-tool-card-review.md` (score **98**)
  - `docs/reports/reviews/2026-07-10-task-0029-frontend-ia-cli-configurable-tool-card-review.md` (score **93**)
- **Related later work**: Operations hub (0059) re-homes CLI discovery — pilots still under `cli-code/components/`
- **Review mode**: `adversarial-reaudit`
- **Reviewer profile**: `reviewers` (Frontend Quality)
- **Parent agentID**: `reviewers`

## Score And Verdict

- **Score**: `97/100` (was 98; −1 residual CHANGELOG draft / no further residual migrations)
- **Verdict**: `PASS WITH NOTES`
- **Lane recommendation**: `hold-in-review` (S ≥ 90 — stay `docs/tasks/03-review/`)

### Rubric snapshot

| Dimension | Score | Notes |
| --- | --- | --- |
| Shell exists + exported | 100 | `ConfigurableToolCard.tsx` + barrel types |
| Pilot adoption still real | 100 | Kilo + Cline both compose shell extensively |
| Residual list honesty | 98 | 10 residual cards still `uses=0` for shell |
| Tests | 99 | Shell + pilot suites green this session |
| Path-to-100 prior F1–F4 | 98 | SAFETY cast, Field `htmlFor`, etc. still hold |
| Epic LOC amortization | 90 | Pilots leaner; residual ocean untouched (by design) |

## Delta Summary

### Resolved / still holds

- Shell composition API (root + Checking/Body/RuntimeStatus/ConfiguredBanner/Field/Actions/Message/Backups)
- Pilots **not abandoned**:
  - `KiloToolCard.tsx` — **21** `ConfigurableToolCard` references, **413 LOC**
  - `ClineToolCard.tsx` — **21** references, **416 LOC**
- Shell **521 LOC**; export from `src/shared/components/cli/index.ts`
- Prior path-to-100: Field `htmlFor`, SAFETY cast pattern still present

### Not abandoned / not over-claimed

| Residual card | LOC | Uses shell? |
| --- | --- | --- |
| ClaudeToolCard | 607 | 0 |
| AntigravityToolCard | 490 | 0 |
| CodexToolCard | 897 | 0 |
| CopilotToolCard | 444 | 0 |
| DroidToolCard | 609 | 0 |
| HermesAgentToolCard | 528 | 0 |
| OpenClawToolCard | 575 | 0 |
| CliproxyapiToolCard | 261 | 0 |
| DefaultToolCard | 746 | 0 |
| CustomCliCard | 373 | 0 |

Exit required ≥2 pilots + residual list — **met**. No claim of full CLI migration.

### New findings

- `NEW` N1 (Info): Pilot LOC dropped further vs original evidence (447/448 → 413/416) without losing shell usage — healthy consolidation, not abandonment.
- `NOTE` N2 (Info): CHANGELOG draft still parent-owned (allowed residual from original task).

### Regressions

- none

## Tests this session

| Suite | Result |
| --- | --- |
| `ConfigurableToolCard.test.tsx` | **15 PASS** |
| `KiloToolCard-shell.test.tsx` | **4 PASS** |
| `ClineToolCard-shell.test.tsx` | **3 PASS** |
| **Total** | **22/22 PASS** |

## Findings

| ID | Class | Severity | Status | Summary |
| --- | --- | --- | --- | --- |
| N1 | NEW | Info | Accepted | Pilot LOC leaner; shell still wired |
| N2 | NOTE | Info | Accepted | CHANGELOG draft unpublished |
| G1 | Guard | Pass | Pass | ≥2 pilots on shell |
| G2 | Guard | Pass | Pass | Residual list matches live `uses=0` |
| G3 | Guard | Pass | Pass | Shell unit tests green |

## Path-to-100 (optional only)

1. Publish CHANGELOG draft when parent policy allows
2. Follow-up EXTEND task for next residual pair (e.g. Copilot + OpenClaw) — **out of 0029 exit**

## Lane outcome

**Stay `docs/tasks/03-review/`** (S = 97 ≥ 90). Pilots are real; shell is not dead code.
