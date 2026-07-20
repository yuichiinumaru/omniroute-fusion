# Review Report: Task 0085 — EPIC-19 Self-Evident URL Phase-0 (T19-H) — 2026-07-19

## Review Lineage

- **Current task**: Task 0085 (`omniroute-epic19-self-evident-url-phase0`); lane at review start: `docs/tasks/02-doing/`; after ACCEPT: `docs/tasks/03-review/`
- **Reviewer**: `gt-documentation-accuracy-reviewer` (parent agentID=`builders`)
- **Previous reports**: none found for 0085
- **Skills**: archival-knowledge-harness · code-quality-harness (documentation-audit) · content-quality validator
- **Scope**: docs-only Phase-0 plan + taxonomy freezes; **no** App Router moves; **no** git; **no** `:21000`
- **Review mode**: documentation accuracy vs live tree + inventories + task exit contract

## Score And Verdict

- **Pre-fix score**: `94/100` (one wrong matrix count + CQ structure nit)
- **Post path-to-100 score**: **`100/100`**
- **Verdict**: `ACCEPTED_100`
- **Lane**: **moved `02-doing/` → `03-review/`**

### Dual score

| Dimension | Score | Notes |
|-----------|------:|-------|
| `local_implementation` | 100 | Plan + NAV-TREE + UI.md taxonomy freezes; dual-write correctly deferred; no false “migration complete” claim |
| `runtime_enforcement` | N/A → 100 (contract) | Phase-0 is docs freeze only; live paths remain `/dashboard/*` + `/home` by design |

---

## Summary

Task 0085 freezes a **non-breaking** self-evident URL migration map (`/{sidebar-leaf}/{topbar-item}`), full redirect inventory (primary + EPIC-19 + high-traffic deep), quantified blast radius, explicit non-goals (no `/api`/`/v1`, no big-bang of 112 pages, no delete without redirect), and dual-write deferred to implement waves.

Deliverables exist, cross-link, and match live SSoT with one count error fixed in-review.

---

## Contract Compliance (exit conditions)

| Exit / Test Requirement | Status | Evidence |
|-------------------------|--------|----------|
| Phase plan written (P0→P4) | **PASS** | `docs/reports/builders/2026-07-19-epic19-self-evident-url-phase0-plan.md` §3 |
| Target path per primary leaf + topbar peer | **PASS** | Plan §2.1–2.2; NAV-TREE § Self-evident path taxonomy; UI.md §1.2 |
| Redirect matrix from→to (PRIMARY + EPIC-19 + high-traffic) | **PASS** | Plan §4.2 A–I (primary 8, EPIC-19 live/target, routing teachability, observe, providers peers, settings, dashboard peers, ops 21 rows, next.config re-chain) |
| Blast radius quantified | **PASS** | Plan §5 + task table; re-checked live |
| No delete without redirect | **PASS** | Non-goals + redirect policy §4.3 |
| Dual-write builders or document deferral | **PASS** | Documented only (§6); no `ROUTING_ROOT_TARGET` etc. in `src/` |
| Non-goals: API untouched | **PASS** | Plan §1; no target roots under `/api`/`/v1` |
| typecheck N/A if docs-only | **PASS** | Documented N/A; no production code in deliverable set |
| No claim path migration complete | **PASS** | Plan §9 + task “Explicitly not done” |

---

## Live re-check of factual claims (2026-07-19)

| Claim | Documented | Live evidence | Result |
|-------|------------|---------------|--------|
| `page.tsx` under `(dashboard)` | 112 (111 + 1 home) | `find … -name page.tsx` → 112 / 111 / 1 | **PASS** |
| Unique `/dashboard/*` depth-1 | 51 (+ bare root) | 51 dirs with pages; extra dir `components/` has no `page.tsx` | **PASS** |
| `href="/dashboard` in `src/` | 56 | `rg` → 56 | **PASS** |
| Broader href/template `/dashboard` | ~67 | 67 | **PASS** |
| E2E `gotoDashboardRoute` | 25 files · ~101 calls | 25 files · 101 lines | **PASS** |
| i18n locales | 42 | `ls src/i18n/messages/*.json` → 42 | **PASS** |
| Primary sidebar leaves | 7 | `PRIMARY_SIDEBAR_ITEMS` ids: home, providers, combos, activity, operations, settings-general, docs | **PASS** |
| Live hub hrefs | plan §2.1 | match `sidebarVisibility.ts` | **PASS** |
| next.config dashboard renames | 5 rules / 3 families | skills, cli-tools(+path), agents(+path) | **PASS** |
| `EPIC19_REDIRECT_MATRIX` count | was **16** (wrong) → fixed **20** | 20 `from:` entries in `epic19Rebalance.ts` | **FIXED → PASS** |
| `OBSERVE_REDIRECT_MATRIX` rows | 8 listed | 8 (`logs*`, `audit*`, `usage`) | **PASS** |
| Settings tabs | 10 (`general`…`sidebar`) | `SETTINGS_TABS` length 10 | **PASS** |
| Story tabs / host | `/home?tab=` via builder | `DASHBOARD_STORY_HUB_PATH="/home"`; 6 tabs | **PASS** |
| `/` → `/dashboard` → `/home` | plan §4.1 | `src/app/page.tsx` → `/dashboard`; `dashboard/page.tsx` → `/home` | **PASS** |
| auto-combo / compression / limits aliases | plan | redirect to combos filter / context/settings / quota | **PASS** |
| Target roots not live | target freeze | no `src/app/{providers,routing,observe}` app trees | **PASS** |
| Cited live deep routes exist | matrix | fusions, health, context/settings, provider-stats, media-providers, system/proxy, etc. | **PASS** |
| Observe `panel=` ≠ `source=` | non-goal | `epic19Rebalance.ts` law + builders | **PASS** |
| Dual-write code absent | deferred | no `*_ROOT_TARGET` symbols | **PASS** |
| Local doc links | plan + task | 0 broken relative links | **PASS** |
| Content-quality gate | plan/task/NAV/UI | all **CQ-PASS** after path-to-100 | **PASS** |

---

## Issues (pre path-to-100)

### Critical

- none

### Debt / accuracy (fixed in-review)

| ID | Class | Severity | File/section | Current (wrong) | Fix applied |
|----|-------|----------|--------------|-----------------|-------------|
| F-DOC-1 | `NEW` → `RESOLVED` | **Critical for implementers** (wrong inventory count) | Plan §4.1 header | `EPIC19_REDIRECT_MATRIX` (**16** entries) | **20** entries (matches `epic19Rebalance.ts` L195–327) |
| F-DOC-2 | `NEW` → `RESOLVED` | Minor drift | Plan §5 blast radius | `buildDashboardStoryPath` ~43; `redirect()` ~30 | ~**45** story lines; ~**40** `redirect(` in `src/app/**/page.tsx` |
| F-DOC-3 | `NEW` → `RESOLVED` | Tooling / structure | Task `## Completion Evidence` | Only `###` children → CQ-EVIDENCE-PLACEHOLDER false fail | Prose evidence paragraph under `##` before `### Deliverables` |

### Improvements (accepted residual — not blockers)

| ID | Severity | Notes |
|----|----------|-------|
| I-1 | Info | Plan §4.1 EPIC-19 table **summarizes** analytics nested/query variants into fewer rows than 20 — correct if header says 20; implementers must use code matrix as SSoT |
| I-2 | Info | Section title shorthand in task (`§ Self-evident path taxonomy (T19-H)`) vs full heading (`… (T19-H / Task 0085)`) — anchors still resolve via UI.md full link |
| I-3 | Info | Operator product picks (§7) still open — correctly gated before mass rename; not a Phase-0 defect |

---

## Alignment: public docs vs behavior

| Surface | Accurate? | Notes |
|---------|-----------|-------|
| Target taxonomy roots | Yes | Documented as **target**, not live |
| Live EPIC-19 destinations | Yes | Budget/pricing/quota nested under providers; observe panels; story on `/home?tab=` |
| Redirect policy | Yes | 308 / App Router `redirect()`; double-hop OK; soak before delete |
| Non-goals | Yes | API, big-bang, `:21000`, multi-topbar, Observe source pollution |
| Examples | Yes | Marked illustrative / frozen targets; not claimed live |

---

## Priorities

- **Critical (fixed)**: matrix entry count 16→20  
- **Minor (fixed)**: blast-radius approximate call counts; Completion Evidence CQ structure  
- **None remaining** for Phase-0 accept  

---

## Path to 100 (executed)

1. ✅ Correct `EPIC19_REDIRECT_MATRIX` to **20** in phase-0 plan + changelog line  
2. ✅ Refresh story-builder / `redirect()` counts in blast-radius table  
3. ✅ Add non-empty `## Completion Evidence` body so `validate_content_quality.py` passes  
4. ✅ Re-run content-quality on plan, task, NAV-TREE, UI.md → all pass  
5. ✅ Move task to `docs/tasks/03-review/` + Review Ledger  

---

## Findings classification (lineage)

| ID | Class | Status |
|----|-------|--------|
| F-DOC-1 | NEW → RESOLVED | Closed in-review |
| F-DOC-2 | NEW → RESOLVED | Closed in-review |
| F-DOC-3 | NEW → RESOLVED | Closed in-review |
| I-1..I-3 | residual info | Open (non-blocking) |

---

## Lane action

- **Score 100** after path-to-100 fixes owned by this reviewer.  
- Task moved: `docs/tasks/02-doing/0085-…` → `docs/tasks/03-review/0085-…`.  
- Implement waves (T19-H1…) remain future work; operator checkpoint still required before mass rename PRs.
