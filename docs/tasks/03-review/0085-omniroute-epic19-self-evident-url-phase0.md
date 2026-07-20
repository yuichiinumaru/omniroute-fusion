# Task 0085: EPIC-19 T19-H — Self-Evident URL Migration Phase-0 (Plan + Compat Design)

> **Status**: `[x]` Phase-0 plan complete (docs only) — **lane `03-review/`** after documentation-accuracy 100  

> **Priority**: 🟡 P1 (after chrome rework 0079/0081; inventory already done)  
> **Type**: `planning` + `remediation` (docs + optional dual-write builders only — **no** big-bang rename required in v1)  
> **Action type**: UX_VIS + HARDEN  
> **Origin**: Operator preference `/{sidebar}/{topbar}`; L725 path concern; inventories  
>   - `docs/reports/audits/2026-07-19-url-ia-self-evident-path-inventory.md`  
>   - `docs/reports/audits/2026-07-19-url-ia-mechanical-route-counts.md`  
> **Blocks**: none hard  
> **Depends on**: soft — **0079/0081 chrome rework** preferred first so topbar ids stabilize before path segment 2  
> **Parallel class**: `serializable` with chrome rework if changing builders; else docs-first parallel-safe  

---

## Objective

Produce an **executable, non-breaking** plan (and minimal dual-write hooks if justified) so UI URLs can evolve toward:

```text
/{sidebar-leaf}/{topbar-item}
```

Examples (illustrative): `/providers/budget`, `/routing/fusions`, `/observe/activity`, `/dashboard` or `/home` for storytelling.

**Not** required in this task: complete cutover of all 112 pages. Required: freeze the target map, list every compatibility redirect, and identify blast radius so a later implement wave cannot guess.

---

## Background

### Exists

- ~112 `page.tsx` under `(dashboard)` (111 under `dashboard/`, 1 `home/`).  
- ~56 hard `href="/dashboard` in `src/`.  
- EPIC-19 builders in `epic19Rebalance.ts` (story + providers policy + observe panel).  
- next.config has only a few UI renames (skills/cli-tools/agents) — not analytics/costs.  
- Dual hosts: `/home` vs `/dashboard/*` peers.

### Operator philosophy

Paths should be auto-evident (same law as chrome). Upstream dumped everything under dashboard.

---

## Test Requirements

- DEVE existir documento de fase em `docs/` or task Completion Evidence with: target path per primary leaf + topbar peer  
- DEVE listar redirect matrix **from → to** for at least all PRIMARY + EPIC-19 destinations + top 20 high-traffic deep routes  
- DEVE quantificar blast radius: palette, e2e, i18n, Header matchers (counts from inventory)  
- DEVE **não** delete routes without redirect  
- Se dual-write builders: unit tests that both old and new builders resolve  

---

## Exit Conditions

- [x] Phase plan written (P0 chrome done gate → P1 dual-write builders → P2 nest fusions/health under hub prefixes → P3 strip `/dashboard` if desired)  
- [x] Full redirect inventory for EPIC-19 surfaces + primary leaves  
- [x] Explicit **non-goals** (API routes untouched)  
- [x] Optional: stub dual-write in SSoT builders **or** document “builders only change in implement wave”  
- [x] Completion Evidence links inventories + plan path  
- [x] `npm run typecheck:core` if code touched; else N/A documented  

---

## Details

### What
Subtasks:

- [x] **Ler** both inventory audits + `epic19Rebalance.ts` + `sidebarVisibility.ts` + `next.config.mjs` redirects  
- [x] Draft target taxonomy table (sidebar id → path root → topbar segment)  
- [x] Expand redirect matrix beyond EPIC-19 (fusions, compression, health, settings tabs)  
- [x] Risk list: e2e `gotoDashboardRoute`, CommandPalette, 42-locale path strings  
- [x] Operator review checkpoint before any mass rename PR  
- [x] Completion Evidence  

### Where

| Path | Action |
|------|--------|
| Inventories (read-only) | Ler |
| `docs/architecture/NAV-TREE-TARGET.md` or `docs/guides/UI.md` path section | Atualizar com target taxonomy |
| `epic19Rebalance.ts` | Opcional dual-write later |
| Tests | Só se code dual-write |

### How

1. Prefer **nest under hub** first (biggest active-state win) over pure aesthetic rename.  
2. Always redirect old → new.  
3. Do not touch `:21000`.  

### Why

Operator wants paths that teach the product. Chrome unify first; this task prevents a second multi-wave mistake on URLs.

---

## Anti-Hallucination

- Do not big-bang rename all 112 pages in this task.  
- Do not change API `/v1` or `/api` routes.  
- Do not claim path migration complete without redirect tests.  

---

## Completion Evidence

Phase-0 is **docs-only**. Evidence below links the executable plan, inventories, and taxonomy freezes in `NAV-TREE-TARGET.md` / `UI.md`. Counts re-checked against live tree on 2026-07-19 (`page.tsx` 112, `href="/dashboard` 56, e2e `gotoDashboardRoute` 25 files / ~101 calls, i18n 42, primary leaves 7, next.config dashboard redirects 5, `EPIC19_REDIRECT_MATRIX` **20** rows). Operator topbar peer freezes (Dashboard Home≠Overview; Providers Budget/Pricing/Quota Sharing order; Observe `panel`≠`source`) re-verified and expanded in plan §2.2 + NAV-TREE segment-2 on **2026-07-20** independent re-review.

### Deliverables (2026-07-19)

| Artifact | Path | Role |
|----------|------|------|
| **Phase-0 plan** | [`docs/reports/builders/2026-07-19-epic19-self-evident-url-phase0-plan.md`](../../reports/builders/2026-07-19-epic19-self-evident-url-phase0-plan.md) | Executable freeze: taxonomy, P0–P4 phases, full redirect inventory, blast radius, non-goals, dual-write deferred, operator checkpoint |
| Inventory (path IA) | [`docs/reports/audits/2026-07-19-url-ia-self-evident-path-inventory.md`](../../reports/audits/2026-07-19-url-ia-self-evident-path-inventory.md) | Read-only input |
| Inventory (counts) | [`docs/reports/audits/2026-07-19-url-ia-mechanical-route-counts.md`](../../reports/audits/2026-07-19-url-ia-mechanical-route-counts.md) | Read-only input (112 pages, 56 hrefs, …) |
| NAV-TREE taxonomy | [`docs/architecture/NAV-TREE-TARGET.md`](../../architecture/NAV-TREE-TARGET.md) § **Self-evident path taxonomy (T19-H)** | Target roots + nest wins + phases |
| UI.md agent rules | [`docs/guides/UI.md`](../../guides/UI.md) § **1.2 Self-evident path taxonomy** | Enforcement pointer for agents |

### Target roots (summary)

| Label | Live hub | Target root |
|-------|----------|-------------|
| Dashboard | `/home` | `/home` *or* `/dashboard` (operator pick) |
| Providers | `/dashboard/providers` | `/providers` |
| Routing | `/dashboard/combos` | `/routing` |
| Observe | `/dashboard/activity` | `/observe` |
| Operations | `/dashboard/operations` | `/operations` |
| Settings | `/dashboard/settings/general` | `/settings` |
| Docs | `/docs` | `/docs` |

### Dual-write

**Documented only** — builders change in implement wave (plan §3 P1 / §6). No code stub in Phase-0.

### Non-goals verified in plan

- No `/api` / `/v1` rename  
- No big-bang of 112 pages  
- No route delete without redirect  
- No `:21000`  

### Blast radius (re-checked)

| Metric | Value |
|--------|------:|
| `page.tsx` under `(dashboard)` | 112 |
| `href="/dashboard` in `src/` | 56 |
| E2E files with `gotoDashboardRoute` | 25 (~101 call sites) |
| i18n locales | 42 |
| next.config dashboard redirect rules | 5 |
| Primary leaves | 7 |

### typecheck

**N/A** — docs-only change set (`docs/**` only; no production code).

### Explicitly not done (by design)

- App Router filesystem moves  
- Builder dual-write code / unit tests for dual emission  
- Mass permanent redirects for target roots  
- Claim that URLs are already self-evident  

### Suggested next tasks

- Operator checkpoint (story host + `/routing` default + Observe panel path vs query)  
- P0 chrome/active-map gate (0084) before P1 dual-write  
- Implement series T19-H1…H6 per plan §8  

---

## Changelog draft

`docs(ui): EPIC-19 self-evident URL phase-0 plan (T19-H)`

---

## Review Ledger

| Date | Reviewer | Score | Verdict | Report |
|------|----------|------:|---------|--------|
| 2026-07-20 | independent FULL re-reviewer (agentID=`reviewers`) | **100** | `ACCEPTED_100` (stay `03-review/`) | [`docs/reports/reviews/2026-07-20-task-0085-epic19-self-evident-url-phase0-review.md`](../../reports/reviews/2026-07-20-task-0085-epic19-self-evident-url-phase0-review.md) |
| 2026-07-19 | gt-documentation-accuracy-reviewer (agentID=`builders`) | **100** | `ACCEPTED_100` → `03-review/` | [`docs/reports/reviews/2026-07-19-task-0085-self-evident-url-phase0-documentation-accuracy-review.md`](../../reports/reviews/2026-07-19-task-0085-self-evident-url-phase0-documentation-accuracy-review.md) |

### Previous Reports

- [`2026-07-19-task-0085-self-evident-url-phase0-documentation-accuracy-review.md`](../../reports/reviews/2026-07-19-task-0085-self-evident-url-phase0-documentation-accuracy-review.md) (prior 100 — untrusted for this re-review)

### Path-to-100 applied in-review (2026-07-20 independent; score was 91 → 100)

1. Plan §2.1–2.2 + NAV-TREE: freeze **full operator Dashboard peers** (bare Home ≠ Overview; full 11-item order).  
2. Plan §2.2 Providers: freeze **ProvidersTopBar order** including Budget · Pricing · Quota Sharing; mark media as deep-only.  
3. Plan §2.2 Observe: restate `source` / `panel` / `health` separation against live hubs.  
4. Blast radius: `redirect()` **~35** (was ~40); multi-topbar non-goal reinforced.  
5. Plan task path header: `02-doing` → `03-review`.  

### Path-to-100 applied earlier (2026-07-19; score was 94 → 100)

1. Plan §4.1: `EPIC19_REDIRECT_MATRIX` **16 → 20** entries (matches live `epic19Rebalance.ts`).  
2. Blast-radius refresh: `buildDashboardStoryPath` ~45; in-app `redirect()` (later re-corrected to ~35).  
3. Task `## Completion Evidence`: prose evidence line so CQ-EVIDENCE validator sees non-empty `##` body before `###` subsections.  
