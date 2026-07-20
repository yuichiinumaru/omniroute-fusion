# Independent Re-Review: Task 0078 — EPIC-19 SSoT rebalance matrix — 2026-07-19

## Review Lineage

- **Current task**: Task 0078 (`omniroute-epic19-ssot-map-rebalance-matrix`); lane `docs/tasks/03-review/`
- **Reviewer**: independent FULL RE-REVIEWER (`reviewers` agentID) — **builders claims untrusted**
- **Previous reports read**:
  - `docs/reports/reviews/2026-07-19-task-0078-epic19-ssot-rebalance-matrix-frontend-quality-review.md` (builders 100)
  - `docs/reports/reviews/2026-07-19-task-0064-0078-path-to-100-gt-ts-expert.md`
  - Task-embedded Review Trail + Review Ledger
- **Related law**: EPIC-19 planning matrix; wave3 audit B5/A5
- **Skills**: frontend-quality-harness · tsjs-harness · code-quality (constants/docs freeze lens)
- **Review mode**: independent adversarial re-review (source + unit + live 22000 IA probe)

## Score And Verdict

- **Score**: `100/100`
- **Verdict**: `ACCEPTED_100`
- **Lane**: **stay `03-review/`** (do not bounce to `02-doing`)

### Dual score

| Dimension | Score | Notes |
|-----------|------:|-------|
| `local_implementation` | 100 | Builders + 20-row matrix + anti-leaf + planned/live docs; single shape per family |
| `runtime_enforcement` | N/A → 100 (contract) | Freeze defers page `redirect()` to 0079–0081; consumers import builders. Live `:22000` is a **stale pre-EPIC-19 Docker image** (not a 0078 code defect) |

## Live adversarial IA proof (sidebar/hubs)

Probed authenticated `http://127.0.0.1:22000` only (never `:21000` prod).

| Probe | Result | Interpretation |
|-------|--------|----------------|
| `PRIMARY_SIDEBAR_ITEM_IDS` (source) | length **7**, no analytics/costs | **Source SSoT post-0082 matches freeze target** |
| Live `/home` HTML sidebar/topbar | still exposes `/dashboard/analytics` + `/dashboard/costs` peers | **Deploy lag**: container `omniroute:base` on 22000 predates EPIC-19 source (build tree `.build/next` ~ Jul 15) |
| Live legacy redirects | 200 with old CostsSubnav chrome (no Location hop) | Same stale image — not matrix SSoT failure |

**Conclusion for 0078:** freeze correctness is proven in **source + unit tests**. Runtime chrome on 22000 requires operator/rebuild deploy of EPIC-19 wave (0079–0082), not another freeze change.

## Delta Summary

### Resolved this re-review (path-to-100)

| ID | Summary | Fix |
|----|---------|-----|
| F-DOC-1 | UI.md still said freeze “does not wire page `redirect()` yet” after 0079–0081 landed | Updated to: product redirects landed in 0079–0081; section remains destination SSoT |
| F-DOC-2 | Related-docs table still labeled matrix “planned freeze” | → “destination freeze SSoT” |

### Persistent / residual (not 0078 blockers)

- Soft inbound / deploy of product redirects → **0079–0082** + rebuild **22000**
- Live dual-nav on 22000 until image refresh

### Regressions

- none in freeze module/tests

## Findings

| ID | Class | Severity | Status | Summary |
| --- | --- | --- | --- | --- |
| F-DOC-1 | STALE_DOC | Improvement | **Closed** this review | UI.md residual “does not wire redirect yet” |
| F-DOC-2 | STALE_DOC | Improvement | **Closed** this review | “planned freeze” table wording |
| F-ENV-1 | ENV | Info | Open (ops) | `:22000` Docker image pre-EPIC-19 — rebuild out of 0078 scope |

## Contract Compliance (exit conditions)

| Exit | Status | Evidence |
|------|--------|----------|
| UI.md EPIC-19 section | PASS | `## EPIC-19 IA rebalance (intent + freeze)`; status live-as-of-0082; builders table; path-to-100 doc nits closed |
| NAV-TREE `## EPIC-19 target` | PASS | L0 length 7; L1 by hub; builders named |
| Code SSoT no “or” shapes | PASS | Providers nested; Observe `?panel=`; Dashboard `/home?tab=` |
| Observe `panel=` ≠ log `source` | PASS | tests + `OBSERVE_SOURCES` dump |
| Matrix unit tests | PASS | **18/18** `epic19-rebalance-matrix-0078.test.ts` |
| Observe hub regression | PASS | **28/28** (within 72-test bundle) |
| Anti-leaf labs | PASS | forbidden ids asserted live + target |
| Inventory / owner tasks | PASS | Completion Evidence + matrix `ownerTask` 0079/0080/0081 |

## Frontend quality (IA freeze lens)

| Check | Result |
|-------|--------|
| Navigation hierarchy | **Strong** — Configure / Debug / Story / Labs intent model frozen once |
| Dual-host risk | **Mitigated** — one builder product per family; matrix `to` must match builders |
| Discoverability contracts | panel vs source separation documented and tested |
| Docs honesty | path-to-100 removed “redirects not wired” lie after product land |

## TS/JS axiom compliance

| Axiom | Status |
|-------|--------|
| Type Purity | ✅ typed unions + guards |
| Boundary Integrity | ✅ parse-don't-validate membership sets |
| Async Determinism | N/A pure |
| Immutability | ✅ `readonly` matrix |
| State Exclusivity | ✅ panel vs source; forbidden leaves |

## Commands run (fresh)

```bash
node --import tsx/esm --test \
  tests/unit/ui/epic19-rebalance-matrix-0078.test.ts \
  tests/unit/ui/observe-hub-sidebar.test.ts
# → pass (18 + observe suite in 72-test bundle)

node --import tsx/esm -e '…PRIMARY_SIDEBAR + matrixLen…'
# matrixLen 20; primary length 7

# Live 22000 auth probe (test port only) — image stale; see table above
```

## Path-to-100 applied

- `docs/guides/UI.md` — redirect-wiring status + related-docs freeze label

## Lane outcome

- **Stay `03-review/`** at **100/100**
- No bounce to `02-doing`
