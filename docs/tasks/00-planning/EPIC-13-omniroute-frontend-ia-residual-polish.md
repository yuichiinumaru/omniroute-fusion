# EPIC-13 — OmniRoute Frontend IA Residual Polish

> **Status**: **Active** — children in `01-open/` **0075–0077**  
> **Priority**: P2  
> **Type**: UX_VIS / HARDEN  
> **Project**: omniroute-2  
> **Date**: 2026-07-19  
> **Depends on**: Epic 0005 + 0052–0061 completed  
> **Evidence**: `docs/reports/audits/2026-07-19-wave2-frontend-ia-residual-investigation.md`  
> **Authority**: `docs/guides/UI.md` (no-new-leaf)  
> **Note**: Shared chrome SSoT (leaf count / UI.md / NAV-TREE) is serial-sensitive with EPIC-19 (0078–0082); product fusions/ops routes remain parallel-safe if ownership held.

---

## 1. Goal

Close **scoped** IA chrome residuals after seven-pillar / hub waves — peer-route mount matrix gaps — without adding sidebar leaves.

## 2. Problem (Wave 2 confirmed)

| ID | Finding |
|----|---------|
| R-IA-01 | `RoutingHubSubnav` on fusions **list** only — missing on `new` / `[id]` editor routes |
| R-IA-04/05 | Operations / Testing hubs Option A: no reverse strip after jump to peers |
| R-IA-03 | DashboardTopbar hub-only (may be by design 0056 F3 — confirm) |
| H-FUSION-010 | Fusions list cards omit acting unit (minor discoverability) |
| Doc | NAV-TREE debug labs claim vs `DEVTOOLS_ITEMS = []` |

## 3. Scope (in)

- Mount `RoutingHubSubnav` (or shared hub strip) on fusions editor routes  
- Ops/Testing reverse-chrome decision + implement or document intentional one-way  
- Peer-route mount matrix tests (anti-phantom; 0009 U1)  
- Optional acting chip on fusions list  
- Doc sync NAV-TREE / UI.md if needed

## 4. Scope (out)

- New primary sidebar leaves  
- Theme re-litigation (0052/0053 done)  
- Full redesign of hubs

## 5. Success metrics

- [ ] Fusions editor routes show same routing hub chrome as list  
- [ ] Explicit decision + tests for Ops/Testing reverse chrome  
- [ ] No new sidebar leaves  
- [ ] Mount-matrix unit tests for touched hubs

## 6. Suggested child task themes

| Theme | Focus | parallel-safe |
|-------|-------|---------------|
| T13-A | Fusions editor RoutingHubSubnav + tests | parallel vs T13-B |
| T13-B | Ops/Testing reverse chrome | parallel vs T13-A |
| T13-C | Fusions list acting chip + NAV-TREE doc drift | parallel-safe |

## 7. Source evidence

- Frontend Wave 2 report  
- `docs/guides/UI.md`  
- `docs/architecture/NAV-TREE-TARGET.md`  
- `src/app/(dashboard)/dashboard/fusions/**`
