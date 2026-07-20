# Path-to-100 Review — Tasks 0064 + 0078

> **Reviewer**: gt-ts-expert (builders internal path-to-100)  
> **Date**: 2026-07-19  
> **Skills**: code-quality-harness · archival-knowledge-harness · tsjs-harness  
> **Constraints honored**: no task lane moves · no git · no :21000

## Bundle note

Independent scores. Diff ownership is disjoint (governance docs vs EPIC-19 constants). Cross-task blast radius: **none** for product runtime; both leave implementer work to 0065 / 0079–0082.

---

## Task 0064 — Restore task template + `docs/tasks/AGENTS.md`

### Score: **100** — Perfect (governance)

| Dimension | Score | Notes |
|-----------|------:|-------|
| local_implementation | 100 | Live paths on disk; npm exits; archive retained |
| runtime_enforcement | N/A | Docs-only |

### Exit re-verify

| Check | Result |
|-------|--------|
| `docs/tasks/000-template.md` | 187 lines, present |
| `docs/tasks/AGENTS.md` | 156 lines, present |
| npm exits / no cargo required | PASS (cargo advisory only) |
| Archive retained | PASS |
| CHANGELOG Unreleased | PASS |
| `npm run typecheck:core` | PASS |

### Findings

None material after path-to-100 compliance N/A checkmarks.

### Path to 100

Closed (N/A compliance items marked with rationale).

---

## Task 0078 — EPIC-19 SSoT map / rebalance matrix

### Score: **100** — Perfect (freeze-scope contract)

| Dimension | Score | Notes |
|-----------|------:|-------|
| local_implementation | 100 | Builders + matrix + tests + planned docs |
| runtime_enforcement | N/A | Explicit out of scope: redirects/leaf drop → 0079–0082 |

### Exit re-verify

| Check | Result |
|-------|--------|
| `src/shared/constants/epic19Rebalance.ts` | Present; no `any` / no source pollution |
| Unit tests | **18/18 PASS** |
| Observe hub regression | **28/28 PASS** |
| UI.md § EPIC-19 planned only | PASS |
| NAV-TREE § EPIC-19 target only | PASS |
| Pre-cutover primary still 9 | PASS (`analytics`+`costs` retained) |
| Planned primary length 7 | PASS |
| typecheck:core | PASS |
| eslint (touched TS) | PASS |
| CHANGELOG Unreleased | PASS (added this wave) |

### Axiom compliance (tsjs)

| Axiom | Status |
|-------|--------|
| Type Purity | ✅ |
| Boundary Integrity | ✅ typed unions / membership guards |
| Async Determinism | N/A |
| Immutability | ✅ readonly matrix |
| State Exclusivity | ✅ panel vs source; forbidden leaves |

### Findings closed this wave

| Severity | Item | Resolution |
|----------|------|------------|
| Debt | Missing CHANGELOG for product constants freeze | Added Unreleased Changed bullet |
| Improvement | Compliance checklist unchecked | Marked with rationale |
| Improvement | Test used `as never` for OBSERVE_SOURCES.includes | Widened to `readonly string[]` |
| Improvement | No unique-`from` matrix invariant | Added test |

### Residual (owned by later tasks — not score blockers)

- Soft links: HomePageClient, DashboardTopbar, ComboControlCenter, ApiManager → 0080/0081/0082  
- Product `redirect()` wiring → 0079–0081  
- Leaf drop → 0082  

### Path to 100

Closed for freeze scope.

---

## Commands run (fresh)

```bash
test -f docs/tasks/000-template.md && test -f docs/tasks/AGENTS.md
node --import tsx/esm --test tests/unit/ui/epic19-rebalance-matrix-0078.test.ts  # 18/18
node --import tsx/esm --test tests/unit/ui/observe-hub-sidebar.test.ts          # 28/28
npm run typecheck:core
npx eslint src/shared/constants/epic19Rebalance.ts tests/unit/ui/epic19-rebalance-matrix-0078.test.ts
```

## Lane disposition

Both tasks remain in `docs/tasks/02-doing/` per wave instructions (do not move).
