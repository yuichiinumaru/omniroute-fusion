# Independent Re-Review: Task 0082 — EPIC-19 sidebar drop Analytics + Costs — 2026-07-19

## Review Lineage

- **Task**: `docs/tasks/03-review/0082-omniroute-epic19-sidebar-drop-analytics-costs-leaves.md`
- **Mode**: Independent FULL re-review (agentID=`reviewers`) — builder `ACCEPTED_100` **untrusted**
- **Prior report**: `2026-07-19-task-0082-epic19-sidebar-drop-analytics-costs-frontend-quality-review.md` (builders 95→100)
- **Harness**: frontend-quality (IA chrome) + code-quality + docs honesty

## Score And Verdict

| Dimension | Pre path-to-100 | Post path-to-100 |
|-----------|----------------:|-----------------:|
| `local_implementation` | 100 | **100** |
| `docs_honesty` (full NAV-TREE) | 88 | **100** |
| `tests_and_provenance` | 97 | **100** |

- **Initial independent score**: **92/100** — product chrome correct, but NAV-TREE §3 still listed Analytics/Costs as **L0 Live hub** (dual mental model vs §2 seven-leaf live chrome)
- **After path-to-100 (this review)**: **100/100**
- **Verdict**: `ACCEPT`
- **Lane**: stay `03-review/`

## Live PRIMARY Dump (re-measured)

```
home /home
providers /dashboard/providers
combos /dashboard/combos
activity /dashboard/activity
operations /dashboard/operations
settings-general /dashboard/settings/general
docs /docs
len 7
analytics primary: false
costs primary: false
```

Matches `EPIC19_TARGET_PRIMARY_SIDEBAR_IDS`. Hideable ids retain `analytics`, `costs`, dual-nav analytics ids, costs deep-link ids. `DEVTOOLS_ITEMS = []`.

## Contract Re-Verification

| Exit | Result | Evidence |
|------|--------|----------|
| No analytics/costs primary peers | **PASS** | `PRIMARY_SIDEBAR_ITEMS` |
| Length 7 exact id set | **PASS** | `home…docs` |
| Palette no dual hub homes | **PASS** | `epic19HubExtras` → builders only |
| Hideable archive-not-delete | **PASS** | hideable list + admin hiddenItems |
| Provenance | **PASS** | `.archive/sidebar/2026-07-19-epic19-analytics-costs-cutover/` + index |
| Redirect matrix green | **PASS** | 0078–0081 suites |
| 0 tools/labs primary | **PASS** | forbidden id asserts |
| Live UI.md §2 match | **PASS** | 7-leaf table |
| NAV-TREE live + target honesty | **PASS** after path-to-100 | §3 Analytics/Costs demoted; L0 renumbered 5–7 Ops/Settings/Docs |
| Residual length-9 pins | **PASS** | no forever-9 unit asserts |

## Findings

| ID | Class | Severity | Status | Summary |
|----|-------|----------|--------|---------|
| IR1 | DOCS | High (honesty) | **Closed** | NAV-TREE §3 still claimed Analytics/Costs L0 Live hub — rewritten as absorbed; L0 renumber Ops=5 Settings=6 Docs=7; Dashboard L1 story tabs live |
| IR2 | COMMENT | Low | **Closed** | `ANALYTICS_DUAL_NAV` comment still pointed nested routes only at analytics `?tab=` — updated to EPIC-19 matrix homes |
| IR3 | PROVENANCE | Low | **Closed** | PROVENANCE task path still `02-doing` — flipped to `03-review` |
| IR4 | TEST | Medium | **Closed** | Added unit guards so NAV-TREE cannot re-promote Analytics/Costs as L0 Live hub |

## Path-to-100 Patches (this review)

1. `docs/architecture/NAV-TREE-TARGET.md` — demote Analytics/Costs L0; renumber Ops/Settings/Docs; Dashboard L1 storytelling honesty
2. `src/shared/constants/sidebarVisibility.ts` — dual-nav comment EPIC-19 destinations
3. `.archive/sidebar/2026-07-19-epic19-analytics-costs-cutover/PROVENANCE.md` — task lane path
4. `tests/unit/ui/epic19-sidebar-cutover-0082.test.ts` — NAV-TREE / UI.md anti dual-L0 asserts

## Evidence Commands

```bash
node --import tsx/esm --test tests/unit/ui/epic19-sidebar-cutover-0082.test.ts
# + epic19 cluster 126/126 with siblings
```

## Lane

**Stay** `docs/tasks/03-review/` — independent path-to-100 closed doc dual-model residual.
