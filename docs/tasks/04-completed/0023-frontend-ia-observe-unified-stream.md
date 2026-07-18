# Task 0023: Frontend IA — Observe Unified Event Stream (S4)

> **Status**: `[x]` Completed (final review 100/100 — promoted 2026-07-18)
> **Priority**: 🔴 P0
> **Type**: `feature`
> **Origin**: Epic 0005 — Frontend IA Reform (slice **S4**)
> **Action type**: UX_VIS
> **Blocks**: Task 0025 (seven-pillar Observability pillar expects one stream home)
> **Depends on**: Task 0020 (archive policy), Task 0022 (Wave 1 dual-nav pattern — soft reference)
> **Parallel group**: A (with Task 0024, Task 0026–0029 after Wave 1)

---

## Objective

Unify **Activity + Logs + Proxy Logs + Console Logs + Audit + MCP Audit + A2A Audit** into a single **Observe / Execution Stream** hub with filters (source, time, severity, protocol), instead of 5–7 peer sidebar leaves of near-identical event tables.

**Invariant (epic §10):** tables of events are **one stream + filters**. Capabilities are **re-homed**, not deleted. Nested routes become redirects or hub deep-links. Removed default leaves keep hideable IDs + archive provenance.

## Background Context

### What already exists:
- Sidebar leaves (hideable): `activity`, `logs`, `logs-proxy`, `logs-console`, `logs-activity`, `audit`, `audit-mcp`, `audit-a2a` in `src/shared/constants/sidebarVisibility.ts`
- Groups: `LOGS_GROUP`, `AUDIT_GROUP` under Monitoring
- Domain UIs: `RequestLoggerV2`, `ProxyLogger`, `ConsoleLogViewer`, audit pages under `/dashboard/logs/*`, `/dashboard/activity`, `/dashboard/audit/*`
- Shared helpers: `src/shared/components/logTableStyles.ts`, FilterBar patterns
- Wave 1 precedent: analytics dual-nav kill via `redirect(?tab=)` + hideable retention (Task 0022)

### What is missing / broken:
- Multiple top-level log/audit menus for the same UX genre (event tables)
- Operators must learn N URLs for “what happened”
- S6 seven-pillar rebuild cannot claim Observability pillar while 7 leaves remain peers

### False gap (do NOT do):
- One god component that merges all domain data models — share chrome/filters/cells only

---

## Test Requirements

- MUST reduce default-visible observe-related leaves to **≤ 1 hub** (plus optional Analytics peers already reduced in S2) under the Monitoring/Observe area of the tree
- MUST preserve deep links: old `/dashboard/logs`, `/dashboard/logs/proxy`, `/dashboard/logs/console`, `/dashboard/activity`, `/dashboard/audit`, `/dashboard/audit/mcp`, `/dashboard/audit/a2a` either render as hub+filter or **redirect** with query params
- MUST keep removed leaf IDs in `HIDEABLE_SIDEBAR_ITEM_IDS` if prefs may store them
- MUST append provenance under `.archive/sidebar/` (or `.archive/pages/`) for any removed default tree entries / page wrappers
- MUST add unit tests asserting: hub leaf set, hideable retention, and redirect targets (mirror `sidebar-engine-items.test.ts` style)
- MUST NOT delete underlying log APIs or audit DB modules
- `npm run typecheck:core` MUST pass; targeted unit tests MUST pass with 0 failures

---

## Exit Conditions (GDD/TDD)

- [x] Single Observe hub route exists (recommended: extend `/dashboard/activity` or `/dashboard/logs` as shell with `?source=` / `?tab=` filters — pick one SSoT and document in Completion Evidence)
- [x] Default sidebar no longer lists Activity/Logs/Proxy/Console/Audit* as **separate default-visible peers** (hub only, or hub + documented interim exception ≤ 2)
- [x] Redirects or query deep-links cover all previous paths above
- [x] Hideable IDs retained for removed default leaves
- [x] Provenance log entry in `.archive/` for IA moves (archive-not-delete)
- [x] New/updated tests: e.g. `tests/unit/ui/observe-hub-sidebar.test.ts` (name flexible) covering leaf set + redirects
- [x] Existing critical log UI tests still pass (or updated for shell)
- [x] `npm run typecheck:core` passes
- [x] Targeted `node --import tsx/esm --test tests/unit/ui/<observe-tests>` passes
- [x] CHANGELOG.md entry under Unreleased (or draft if concurrent collision)
- [x] Epic 0005 §11a/child table updated to mark S4 progress when closing

---

## Details

### What

Subtasks:
- [x] **Ler código existente**: Read `sidebarVisibility.ts` (LOGS_GROUP, AUDIT_GROUP, MONITORING_ITEMS), activity/logs/audit `page.tsx` files, `RequestLoggerV2`, `ProxyLogger`, `ConsoleLogViewer`, any existing filter query parsing, Task 0022 redirects as pattern
- [x] **Design hub IA**: Choose shell path + filter param schema (`source=proxy|console|request|audit|mcp|a2a`, time range, search). Document mapping old path → hub URL
- [x] **Implement hub shell**: Tab bar or segmented filter; compose existing viewers (do not rewrite data layers)
- [x] **Add redirects**: nested log/audit pages → hub+params; keep server components where possible
- [x] **Sidebar trim**: collapse LOGS_GROUP + AUDIT_GROUP + activity into Observability hub leaf(s); retain hideables
- [x] **Archive provenance**: move obsolete wrappers if any; append PROVENANCE-INDEX
- [x] **Tests**: sidebar leaf assertions + redirect source tests
- [x] **Refactoring pass**: Prefer composition over god-logger
- [x] **Verificação**: typecheck + targeted tests + manual deep-link smoke list in Completion Evidence

### Where

| File | Purpose |
|------|---------|
| `src/shared/constants/sidebarVisibility.ts` | Modify — collapse observe leaves; hideable retention |
| `src/app/(dashboard)/dashboard/activity/**` | Read/Modify — likely hub shell |
| `src/app/(dashboard)/dashboard/logs/**` | Modify — redirects or embed |
| `src/app/(dashboard)/dashboard/audit/**` | Modify — redirects or embed |
| `src/shared/components/RequestLoggerV2.tsx` | Read/compose |
| `src/shared/components/ProxyLogger.tsx` | Read/compose |
| `src/shared/components/ConsoleLogViewer.tsx` | Read/compose |
| `src/shared/components/logTableStyles.ts` | Read — shared chrome |
| `src/shared/components/FilterBar.tsx` | Read/Extend if needed |
| `tests/unit/ui/sidebar-engine-items.test.ts` | Read — pattern for new observe test |
| `tests/unit/ui/observe-hub-*.test.ts` | Create — new guards |
| `.archive/sidebar/` or `.archive/pages/` | Create — provenance for removed IA |
| `CHANGELOG.md` | Modify — entry |
| Epic 0005 | Read — S4 success metrics |

### How

1. Inventory every observe leaf href + page entry and write a redirect matrix.
2. Build or extend one hub that mounts existing viewers behind filters (share FilterBar, not data models).
3. Replace dual entry points with `redirect()` or client router replace preserving query.
4. Collapse sidebar groups to one Observability stream leaf (Analytics remaining leaves stay until S6 if needed).
5. Archive snapshot of previous group definitions; keep hideable IDs.
6. Lock with unit tests.

### Why

Epic success metric: log/audit surfaces as separate top-level leaves → **1 Observe stream**. Without S4, the Monitoring dump remains the clearest “menu = tables” failure and blocks a clean Observability pillar in Task 0025.

---

## ⛔ Anti-Hallucination Guardrails

> [!CAUTION]
> DO NOT delete audit/log APIs, DB modules, or MCP audit persistence.
> DO NOT invent a single god component that merges incompatible row schemas.
> DO NOT silent-delete sidebar definitions — **archive + provenance** (Task 0020 policy).
> DO NOT break deep links — redirects required.

> [!IMPORTANT]
> Read EVERY file in the Where table before writing.
> Follow Task 0022 pattern: hideable IDs retained; default tree trimmed; tests assert both.
> Domain data models stay separate; only IA chrome unifies.

---

## 🛡️ Compliance Checklist

- [x] **Doc Accuracy**: Every route path grepped before documenting
- [x] **Archive Protocol**: Provenance logged for IA moves
- [x] **i18n**: Hub labels use existing or new `sidebar.*` / observe keys
- [x] **Security**: No raw error stacks in new UI surfaces
- [x] **Tests**: Binary exit conditions satisfied

---

## 📋 Completion Evidence (preenchido pelo agente executor)

- **Arquivos criados/modificados**:
  - `src/shared/constants/observeHub.ts` (NEW — SSoT path helpers + redirect matrix)
  - `src/app/(dashboard)/dashboard/activity/ObserveHubClient.tsx` (NEW — hub shell)
  - `src/app/(dashboard)/dashboard/activity/page.tsx` (hub mounts ObserveHubClient)
  - `src/app/(dashboard)/dashboard/logs/RequestLogsPanel.tsx` (NEW — extracted request log chrome)
  - `src/app/(dashboard)/dashboard/logs/page.tsx` (+ proxy/console/activity) → redirects
  - `src/app/(dashboard)/dashboard/audit/page.tsx` (+ mcp/a2a) → redirects
  - `src/app/(dashboard)/dashboard/usage/page.tsx` → request stream
  - `src/shared/constants/sidebarVisibility.ts` — MONITORING collapse (LOGS/AUDIT groups out of tree); presets show `activity` hub
  - `.archive/sidebar/2026-07-10-observe-stream/SNAPSHOT.md` + PROVENANCE-INDEX append
  - `tests/unit/ui/observe-hub-sidebar.test.ts` (NEW)
  - `tests/unit/sidebar-monitoring-reorg.test.ts`, `activity-page-redirect.test.ts`, `v388-phase1-screen-fixes.test.ts` (updated)
- **Testes que verificam o trabalho**:
  - `tests/unit/ui/observe-hub-sidebar.test.ts`
  - `tests/unit/sidebar-monitoring-reorg.test.ts`
  - `tests/unit/ui/activity-page-redirect.test.ts`
  - `tests/unit/v388-phase1-screen-fixes.test.ts`
  - `tests/unit/ui/sidebar-engine-items.test.ts` (no reg)
- **Redirect matrix**:
  | old path | hub |
  |----------|-----|
  | `/dashboard/logs` | `/dashboard/activity?source=request` (+ preserves `id`/`request`/`connection`) |
  | `/dashboard/logs/proxy` | `/dashboard/activity?source=proxy` |
  | `/dashboard/logs/console` | `/dashboard/activity?source=console` |
  | `/dashboard/logs/activity` | `/dashboard/activity` (permanentRedirect) |
  | `/dashboard/audit` | `/dashboard/activity?source=audit` |
  | `/dashboard/audit/mcp` | `/dashboard/activity?source=mcp` |
  | `/dashboard/audit/a2a` | `/dashboard/activity?source=a2a` |
  | `/dashboard/usage` | `/dashboard/activity?source=request` |
- **SSoT hub**: `/dashboard/activity?source=activity|request|proxy|console|audit|mcp|a2a` (default source omitted → activity)
- **Resultado do typecheck**: PASS (`npm run typecheck:core`)
- **Resultado dos testes**: PASS — 78/78 on targeted suite (observe + monitoring + activity redirect + v388 + sidebar-engine)
- **Archive provenance path**: `.archive/sidebar/2026-07-10-observe-stream/SNAPSHOT.md` (+ PROVENANCE-INDEX row)
- **Entrada no CHANGELOG**: Draft below (parent applies under Unreleased — collision-safe)
- **Agente executor**: builder worker under parent agentID=builders (Task 0023)
- **Data de conclusão**: 2026-07-10

### Changelog Draft (for parent)

```md
### Changed
- **Observe hub (Epic 0005 S4)**: Collapse Activity + Logs + Proxy/Console logs + Audit/MCP/A2A into single Monitoring leaf at `/dashboard/activity` with `?source=` filters. Legacy paths redirect; hideable sidebar IDs retained.
```

### Manual deep-link smoke list
1. `/dashboard/activity` → hub tabs, Activity feed
2. `/dashboard/activity?source=request` → Request logs panel
3. `/dashboard/logs` → redirect to request source
4. `/dashboard/logs?id=…` → request source + id
5. `/dashboard/logs/proxy` → proxy source
6. `/dashboard/logs/console` → console source
7. `/dashboard/audit` / `mcp` / `a2a` → matching audit sources
8. Sidebar Monitoring: only Activity hub + System (Health/Runtime)


---

## Parent builder wave gate (2026-07-10)

- Aggregated unit/vitest green in Wave 2 closeout
- Promoted to `04-completed` for epic drain; independent reviewer may re-open if regressions found
- Closeout: `docs/reports/builders/2026-07-10-wave2-closeout.md`

---

## Review Ledger

> [!IMPORTANT]
> Before path-to-100 work, read the latest full report and all reports listed
> under Previous Reports. Persistent findings and regression guards are part of
> the acceptance contract; do not fix the latest finding by undoing a previously
> accepted repair.

### Latest Review

- **Date**: 2026-07-18
- **Reviewer profile**: `reviewers` (independent final re-review + path-to-100, agentID=reviewers)
- **Score**: `100/100`
- **Verdict**: `ACCEPTED_100`
- **Full report**: `docs/reports/reviews/2026-07-18-task-0023-frontend-ia-observe-unified-stream-final-review.md`
- **Lane outcome**: remains in `03-review/` (accepted; parent promotes)
- **Task reference**: Task 0023 (`frontend-ia-observe-unified-stream`)

#### Current Open Blockers

- none in-scope
- `EXTERNAL_BLOCKER` (accepted residual): authenticated browser deep-link smoke not re-run this lane

#### Path-to-100 Summary

- **Complete**: F3 usage?tab=limits → quota; F4 unit guards; F5 dead `OBSERVE_TABS` removed 2026-07-18
- S4 hub + 8-matrix redirects + single primary `activity` leaf re-verified green

#### Regression Guards

- Default chrome must keep single `activity` Observe stream hub (no logs/audit peer leaves in primary/default tree)
- All paths in `OBSERVE_REDIRECT_MATRIX` must remain server redirects to hub + source (unit-guarded)
- `OBSERVE_STREAM_SIDEBAR_IDS` must stay hideable; do not delete log/audit APIs or domain viewers
- Hub must compose domain viewers behind `?source=` — no god-logger merge
- Do not re-break `/dashboard/logs/proxy` redirects when editing Observe subnav (0061)
- `usage/page.tsx` must keep tab-aware branches (`limits`→quota, `budget`→costs/budget) before Observe request redirect
- Do not reintroduce dead hub tab arrays after `ObserveHubSubnav` owns chrome

### Previous Reports

- `docs/reports/reviews/2026-07-16-task-0023-frontend-ia-observe-unified-stream-reaudit.md` (92/100)
- `docs/reports/reviews/2026-07-11-task-0023-frontend-ia-observe-unified-stream-review.md` (99/100; matrix test hardening)
- `docs/reports/reviews/2026-07-10-task-0023-frontend-ia-observe-unified-stream-review.md` (96; HELD path-to-100)

---

## Path-to-100 applied 2026-07-16 (fixer wave)

**Executor**: Frontend Quality Reviewer fixer (parent agentID=reviewers)

### Fixes
- **F3**: `ProviderQuotaWidget` “View details” now links to `/dashboard/quota` (Provider Limits home), not `/dashboard/usage?tab=limits`.
- **F3 hardening**: `usage/page.tsx` branches known legacy tabs before Observe request redirect:
  - `?tab=limits` → `/dashboard/quota`
  - `?tab=budget` → `/dashboard/costs/budget`
  - default → `buildObserveHubPath("request")`
- **F4**: Unit guards in `observe-hub-sidebar.test.ts` for widget href + tab-aware usage redirect.
- **F5 (2026-07-18 final)**: removed dead `OBSERVE_TABS` + unused `sidebarText` from `ObserveHubClient.tsx` (ObserveHubSubnav owns chrome).

### Tests
- `node --import tsx/esm --test tests/unit/ui/observe-hub-sidebar.test.ts` → **pass** (legacy deep-link suite green; matrix unchanged)
- Final re-review batch 2026-07-18: observe + related suites **70/70 PASS**

## Lane promotion

- **Promoted to 04-completed**: 2026-07-18 — parent reviewer-orchestrator after independent final review **100/100**.
