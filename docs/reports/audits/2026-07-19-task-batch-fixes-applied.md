# Task Batch Fixes Applied — 01-open 0036 + 0062–0083 (docs only)

| Field | Value |
|-------|--------|
| **Date** | 2026-07-19 |
| **Role** | gt-task-architect |
| **Mode** | Task markdown only — **no** product code, **no** CHANGELOG, **no** lane moves |
| **Authority** | `docs/reports/audits/2026-07-19-task-batch-review-open-0062-0083.md` §7; `docs/reports/audits/2026-07-19-task-batch-adversarial-second-pass.md` C-01…C-05, M-01…M-08 |

---

## Files touched (one-line each)

| File | Change |
|------|--------|
| `docs/tasks/01-open/0071-omniroute-fusion-docs-acting-list-chip.md` | FUSION.md-only default; Test A always / B if 0077 missed chip; soft-depends 0077; `page.tsx` verify-only |
| `docs/tasks/01-open/0077-omniroute-fusions-list-acting-chip-nav-docs.md` | Sole chip owner; NAV-TREE labs/label only; skip L0 if EPIC-19 open; anti-new-leaf (no forever-9) |
| `docs/tasks/01-open/0075-omniroute-fusions-editor-routing-hub-subnav.md` | Replace `length===9` with anti-new-leaf; 0082 owns absolute length |
| `docs/tasks/01-open/0076-omniroute-ops-testing-reverse-chrome.md` | Anti-new-leaf; UI.md reverse-chrome section lock only |
| `docs/tasks/01-open/0078-omniroute-epic19-ssot-map-rebalance-matrix.md` | Mandatory freeze table (nested Providers, `panel=`, `/home?tab=`); section locks; inventory rg; strike “no overlap 0077” |
| `docs/tasks/01-open/0079-omniroute-epic19-providers-absorb-budget-pricing-quota.md` | CostsSubnav config hrefs only; Overview→0081; `usage/page.tsx` budget retarget |
| `docs/tasks/01-open/0080-omniroute-epic19-observe-absorb-combo-health-route-trace.md` | **Hard-blocks 0081**; `panel=` not source enum; handoff evidence line |
| `docs/tasks/01-open/0081-omniroute-epic19-dashboard-absorb-analytics-costs-overview.md` | **Depends 0078+0080 hard**; Overview exclusive; `/home?tab=`; deep-link rg |
| `docs/tasks/01-open/0082-omniroute-epic19-sidebar-drop-analytics-costs-leaves.md` | Depends **0078+0079+0080+0081**; rewrite residual length-9 tests; live chrome owner; target length 7 |
| `docs/tasks/01-open/0083-omniroute-epic19-tools-ops-verify-only.md` | Soft-depends 0078; Tools→Ops interim paragraph only |
| `docs/tasks/01-open/0036-omniroute-deploy-verify-21000-dual-mode-auth.md` | HOLD / operator-only :21000 banner; dry-run default; operator-hold class |
| `docs/tasks/01-open/0062-omniroute-planning-hygiene-epic-headers-queue.md` | Strike “0036 only”; QUEUE supersede + active open pointer; `ls 01-open` evidence |
| `docs/tasks/00-planning/EPIC-19-omniroute-dashboard-observe-providers-ia-rebalance.md` | §3 target ids length **7**; §8 product orthogonal / SSoT serial-sensitive + doc ownership table |
| `docs/tasks/00-planning/EPIC-13-omniroute-frontend-ia-residual-polish.md` | Status Active — children 0075–0077 in 01-open |

---

## Patch coverage map

| ID | Status |
|----|--------|
| F-1 / M-03 | Applied (0071/0077) |
| F-2 / C-01 | Applied (0075–0077, 0082) |
| F-3 / C-02 / C-03 | Applied (0076–0078, 0082–0083, EPIC-19 §8) |
| F-4 / M-07 | Applied (0080 hard-blocks 0081; 0081 hard-depends 0080) |
| F-5 | Applied (0036 HOLD banner) |
| F-11 | Applied (0082 depends 0078 explicitly) |
| F-14 / C-04 / M-08 | Applied (0062) |
| F-15 / C-05 | Applied (0078 freeze table) |
| M-01 | Applied (0078 inventory + 0079 usage) |
| M-02 | Applied (0079/0081 CostsSubnav split) |
| M-04 / M-06 | Applied (EPIC-19 §3/§8) |
| M-05 | Applied (0078/0080 `panel=` vs `source`) |
| EPIC-13 header | Applied (Active) |
| F-7 (0067 fusion.ts) | **Not required** in operator “Required edits” list (minor); left unchanged |

---

## Not done (by design)

- No product code under `src/`, `open-sse/`, `electron/`, `bin/`
- No CHANGELOG
- No moves into `02-doing/` / `04-completed/`
- QUEUE body file itself not rewritten (0062 executor owns that on land)
- EPIC-10/11/12/14 headers not bulk-edited (optional light: only EPIC-13 + EPIC-19)

---

## Suggested execute order (unchanged intent, hardened gates)

```
0062 ‖ 0063 ‖ 0064 → 0065 ‖ 0066
0072 ‖ 0073 ‖ 0074
0067 ‖ 0068; 0069 → 0070; 0071 (docs; chip via 0077)
0075 ‖ 0076; 0077 (chip + labs residual)
0078 → (0079 ‖ 0080) → 0081 → 0082 → 0083
0036 operator HOLD (:21000)
```
