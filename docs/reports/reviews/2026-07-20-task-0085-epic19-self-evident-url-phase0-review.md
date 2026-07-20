# Review Report: Task 0085 — EPIC-19 Self-Evident URL Phase-0 (T19-H) — 2026-07-20

## Review Lineage

- **Current task**: Task 0085 (`omniroute-epic19-self-evident-url-phase0`); lane: `docs/tasks/03-review/`
- **Reviewer**: independent FULL re-reviewer (agentID=`reviewers`)
- **Prior score (untrusted)**: 100 (`2026-07-19-task-0085-self-evident-url-phase0-documentation-accuracy-review.md`, agentID=`builders`)
- **Skills**: documentation-accuracy · frontend-quality (light — chrome/topbar intent only)
- **Scope**: docs-only Phase-0 plan + taxonomy freezes; grep every path/claim vs live `epic19Rebalance.ts`, `sidebarVisibility.ts`, `DashboardTopbar.tsx`, `ProvidersTopBar.tsx`, `observeHub.ts`, hub subnavs
- **No git / no `:21000` / no App Router moves**

## Score And Verdict

| | |
|--|--:|
| **Pre-fix score** | `91/100` |
| **Post path-to-100 score** | **`100/100`** |
| **Verdict** | `ACCEPTED_100` |
| **Lane** | **Stay `03-review/`** (S≥90 docs fixes only; not demoted to `02-doing/`) |

### Dual score

| Dimension | Score | Notes |
|-----------|------:|-------|
| `local_implementation` | 100 | Phase-0 contract met: executable plan, redirect inventory, blast radius, non-goals, dual-write deferred; operator topbar peer freezes now explicit |
| `runtime_enforcement` | N/A → 100 (contract) | Docs freeze only; live paths remain `/dashboard/*` + `/home` by design |

---

## Summary

Task 0085 freezes a **non-breaking** migration map toward `/{sidebar-leaf}/{topbar-item}` without claiming cutover. Prior documentation-accuracy review correctly fixed `EPIC19_REDIRECT_MATRIX` 16→20 and structural CQ issues, but **under-specified operator hub topbar peer lists** that segment-2 must mirror (especially Dashboard **Home ≠ Overview** and full Providers peer order including Budget/Pricing/Quota Sharing).

This re-review grepped live SSoT, applied path-to-100 doc patches in-plan / NAV-TREE / UI.md / task ledger, and confirms:

1. **Dashboard story peers** match `DashboardTopbar` (11 peers; bare Home distinct from Overview).  
2. **Providers peers** include Budget · Pricing · Quota Sharing on **one** `ProvidersTopBar` strip.  
3. **Observe** keeps combo-health / route-trace on `?panel=` only — does **not** pollute `OBSERVE_SOURCES`.  
4. Plan **does not** claim multi-topbar stacks are OK — forbids second chrome / multi-topbar regression.

---

## Contract Compliance (exit conditions)

| Exit / Test Requirement | Status | Evidence |
|-------------------------|--------|----------|
| Phase plan P0→P4 | **PASS** | Plan §3 |
| Target path per primary leaf + topbar peer | **PASS** (after fix) | Plan §2.1–2.2 full peer tables; NAV-TREE § Self-evident; UI.md §1.2 |
| Redirect matrix PRIMARY + EPIC-19 + high-traffic | **PASS** | Plan §4.1–4.2 A–I |
| Blast radius quantified | **PASS** | Plan §5 (counts re-checked) |
| No delete without redirect | **PASS** | Non-goals + §4.3 |
| Dual-write or documented deferral | **PASS** | §6 documented only |
| Non-goals: API untouched; no multi-topbar; no Observe source pollution | **PASS** | Plan §1 |
| No claim path migration complete | **PASS** | Plan §9 + task “Explicitly not done” |
| typecheck N/A | **PASS** | Docs-only |

---

## Live re-check (2026-07-20)

### Counts

| Claim | Documented (post-fix) | Live | Result |
|-------|------------------------|------|--------|
| `page.tsx` under `(dashboard)` | 112 (111+1) | 112 | **PASS** |
| Unique `/dashboard/*` depth-1 with pages | 51 | 51 | **PASS** |
| `href="/dashboard` in `src/` | 56 | 56 | **PASS** |
| `buildDashboardStoryPath` lines | ~45 | 45 | **PASS** |
| `redirect(` in `src/app/**/page.tsx` | **~35** (was ~40) | 35 | **FIXED → PASS** |
| E2E `gotoDashboardRoute` | 25 files · ~101 calls | 25 e2e files / 101 lines | **PASS** |
| i18n locales | 42 | 42 | **PASS** |
| Primary leaves | 7 | `home providers combos activity operations settings-general docs` | **PASS** |
| Live hub hrefs | plan §2.1 | match `PRIMARY_SIDEBAR_ITEMS` | **PASS** |
| next.config dashboard renames | 5 rules / 3 families | skills + cli-tools×2 + agents×2 | **PASS** |
| `EPIC19_REDIRECT_MATRIX` | 20 | 20 `from:` rows | **PASS** |
| `OBSERVE_REDIRECT_MATRIX` | 8 | 8 | **PASS** |
| Settings tabs | 10 | `SETTINGS_TABS` length 10 | **PASS** |
| Story host / tabs | `/home` + 6 tabs | `DASHBOARD_STORY_HUB_PATH` + `DASHBOARD_STORY_TABS` | **PASS** |

### Operator topbar intent (protocol focus)

| Intent | Live SSoT | Plan pre-fix | Post-fix |
|--------|-----------|----------------|-----------|
| **Dashboard story peers list** | `DashboardTopbar` `DASHBOARD_LINKS`: Home · Overview · Evals · Search · Utilization · Compression · Costs · Cache · Tokens · Leaderboard · Profile; Home=`/home` no tab **≠** Overview=`?tab=overview` | Incomplete: collapsed story tabs; **omitted bare Home peer** | **Full 11-row freeze** + Home≠Overview law |
| **Providers peers + Budget/Pricing/Quota Sharing** | `PROVIDERS_TOPBAR_PATHS` + TOPBAR_LINKS order ends with Budget · Pricing · Quota Sharing; single `data-testid="providers-topbar"` | Present as nest targets but unordered; media listed like a peer | **Operator order freeze**; media **deep-only** |
| **Observe panels ≠ log source enum** | `OBSERVE_SOURCES` (7) vs `OBSERVE_OPERATIONAL_PANELS` (`combo-health`\|`route-trace`); `ObserveHubSubnav` uses builders for panels | Already non-goal + matrix | **Restated against live subnav** + health page |
| **No multi-topbar OK claim** | Providers/Dashboard comments: exactly one strip | Non-goal “No second chrome”; P0 gate | **Reinforced** in blast radius + UI.md agent rule #7 |

### Grep anchors (implementer SSoT)

| File | Role |
|------|------|
| `src/shared/constants/epic19Rebalance.ts` | EPIC-19 builders + 20-row matrix + story tabs + observe panels |
| `src/shared/constants/sidebarVisibility.ts` | `PRIMARY_SIDEBAR_ITEMS` (7) |
| `src/shared/constants/observeHub.ts` | hub path + `OBSERVE_SOURCES` + stream redirect matrix |
| `src/app/(dashboard)/home/DashboardTopbar.tsx` | Dashboard peer order |
| `src/app/(dashboard)/dashboard/providers/components/ProvidersTopBar.tsx` | Providers peer order |
| `src/shared/components/RoutingHubSubnav.tsx` | Routing peer ids/hrefs |
| `src/shared/components/ObserveHubSubnav.tsx` | Observe peers incl. panel + health |

---

## Issues

### Critical

- none remaining after path-to-100

### Debt / accuracy (fixed in-review)

| ID | Severity | File/section | Current (wrong / incomplete) | Fix applied |
|----|----------|--------------|------------------------------|-------------|
| F-OP-1 | **Medium** (implementer path segment-2) | Plan §2.1–2.2 Dashboard; NAV-TREE segment-2 | Story peers collapsed; bare **Dashboard/Home** missing as distinct from Overview | Full operator peer table; Home ≠ Overview |
| F-OP-2 | **Medium** | Plan §2.2 Providers | Peer order not frozen; media implied topbar peer | `ProvidersTopBar` order; Budget/Pricing/Quota Sharing explicit; media deep-only |
| F-OP-3 | Minor | Plan §2.2 Observe | Correct law but light on live subnav mapping | Full ObserveHubSubnav freeze + source/panel/health law |
| F-DOC-4 | Minor | Plan §5 | `redirect()` ~40 | **~35** live |
| F-DOC-5 | Minor | Plan header | Task path still `02-doing/` | → `03-review/` |
| F-OP-4 | Minor (docs consistency) | UI.md §1.2 | Roots only; no segment-2 peer freeze | Column + agent rule #7 multi-topbar / source pollution |

### Residual (accepted — not blockers)

| ID | Severity | Notes |
|----|----------|-------|
| I-1 | Info | Plan §4.1 EPIC-19 table still **summarizes** some analytics variants; code matrix (20) remains SSoT |
| I-2 | Info | Operator product picks (§7: story host, `/routing` default, panel vs path, ops nest) still open — correctly gated |
| I-3 | Info | e2e helper + rare unit import can make whole-repo `gotoDashboardRoute` file count 26; claim correctly scopes **25 e2e files** |

### Prior 2026-07-19 findings

| ID | Status |
|----|--------|
| F-DOC-1 matrix 16→20 | Still closed / live 20 |
| F-DOC-2 blast counts | Partially superseded by F-DOC-4 (`redirect` 40→35) |
| F-DOC-3 CQ evidence structure | Still closed |

---

## Alignment: multi-topbar / chrome law

| Claim | Accurate? |
|-------|-----------|
| Path work must not invent dual topbars | **Yes** — Plan §1 non-goal |
| P0 requires exactly one strip per hub family | **Yes** — Plan §3 checklist |
| UI.md single-topbar + ask before multi-topbar | **Yes** — §1.1 + new §1.2 rule 7 |
| No claim that multi-topbar stack is OK | **Yes** — nowhere asserted |

---

## Path to 100 (executed 2026-07-20)

1. ✅ Expand plan Dashboard L1 map to full `DashboardTopbar` peer list (Home ≠ Overview).  
2. ✅ Freeze Providers operator peer order from `ProvidersTopBar` / `PROVIDERS_TOPBAR_PATHS`; demote media to deep nest.  
3. ✅ Restate Observe `source` / `panel` / `health` against `observeHub.ts` + `ObserveHubSubnav`.  
4. ✅ Correct `redirect()` blast count ~35; reinforce single-strip in §5.  
5. ✅ Sync NAV-TREE-TARGET segment-2 + UI.md §1.2 + task Review Ledger / Completion Evidence.  
6. ✅ Write this report; **lane stays `03-review/`**.

---

## Patches (files touched this re-review)

| File | Change |
|------|--------|
| `docs/reports/builders/2026-07-19-epic19-self-evident-url-phase0-plan.md` | Operator peer freezes §2.1–2.2; blast §5; header path; changelog |
| `docs/architecture/NAV-TREE-TARGET.md` | Segment-2 operator peer freeze + changelog |
| `docs/guides/UI.md` | §1.2 segment-2 column + agent rule #7 |
| `docs/tasks/03-review/0085-omniroute-epic19-self-evident-url-phase0.md` | Evidence note + Review Ledger |
| `docs/reports/reviews/2026-07-20-task-0085-epic19-self-evident-url-phase0-review.md` | This report |

---

## Lane action

- **Score 100** after in-lane docs path-to-100.  
- **Do not** move to `02-doing/` (pre-fix was 91 ≥ 90 threshold for docs-only remediation in `03-review/`).  
- Implement waves T19-H1… remain future; operator checkpoint (§7) still required before mass rename PRs.
