# Task 0098: EPIC-20 T20-M — Traffic Inspector → Observe Topbar Peer (NOT Operations)

> **Status**: `[x]` Implemented (leave in 02-doing for review)  
> **Priority**: 🔴 P0  
> **Type**: `feature` + `remediation`  
> **Action type**: UX_VIS + HARDEN  
> **Origin**: EPIC-20 §0 cross-cut, §2 “Out of Operations topbar”, §5 Traffic row — `docs/tasks/00-planning/EPIC-20-omniroute-operations-hub-reform.md`  
> **Blocks**: **0100** (Observe chrome + redirect row for traffic); soft-helps Ops Integrations cleanup in **0099**  
> **Depends on**: soft **0084** (Observe/Routing sidebar active-state SSoT — in `03-review/`; extend aliases if Traffic path does not light Observe); soft EPIC-19 Observe chrome patterns (**0080** / `ObserveHubSubnav`); T20-A only if shared redirect registry lives there — **do not block** on Ops Labs  
> **Parallelism**: `parallel-safe` vs **0096/0097** (different hub); **serializable** vs any concurrent Observe topbar rewrite; coordinate single-topbar law on Observe  
> **Review routing**: independent Observe IA PR; **bundle with 0084 follow-ups** if active-state matcher co-edited  

---

## Objective

Move **Traffic Inspector** out of the Operations mental model into **Observe** as a **topbar peer**, with redirects from the legacy tools path. Operations must **stop** presenting Traffic as an Ops Integrations destination (card removal may share **0099**, but this task owns Observe landing + redirect + chrome).

| Surface | Today | Target |
|---------|-------|--------|
| Traffic Inspector UI | `/dashboard/tools/traffic-inspector` | Observe peer — freeze path in this task (`/observe/traffic` **or** `/dashboard/activity` peer pattern **or** `/dashboard/tools/traffic-inspector` under Observe chrome — **must freeze one** in SSoT + tests) |
| Ops hub card | `operationsHub.ts` `traffic-inspector` | Remove from Ops discovery (here or **0099** — record disposition) |
| Sidebar active | may not light Observe | All Traffic destinations light **Observe** (`activity` leaf) — soft-depends **0084** matcher patterns |
| Observe chrome | `ObserveHubSubnav` sources + panels + health | **+ Traffic** peer; **still exactly one** Observe hub topbar strip |

**Done when:**

1. Traffic Inspector is a first-class **Observe** topbar peer (not Ops topbar).  
2. Legacy `/dashboard/tools/traffic-inspector` redirects or re-homes under Observe chrome without dual competing topbars.  
3. Observe hub topbar mount count ≤ 1 on Traffic route (Hard Rule #22).  
4. Primary sidebar **Observe** is active for Traffic paths (extend `sidebarRouteMatch` / aliases if needed — soft **0084**).  
5. No new primary sidebar leaf for traffic.  
6. API/WS paths under `/api/tools/traffic-inspector/**` remain local-only guarded (Hard Rules #15/#17) — **no** authz regression.

---

## Background Context

### O que já existe:

- Full Traffic Inspector app: `src/app/(dashboard)/dashboard/tools/traffic-inspector/` (`TrafficInspectorPageClient`, stream hooks, capture toolbar).  
- Ops hub link: `operationsHub.ts` Integrations → `href: "/dashboard/tools/traffic-inspector"`.  
- Observe chrome: `observeHub.ts`, `ObserveHubSubnav.tsx` (activity sources + combo-health + route-trace + health), `epic19Rebalance.ts` panels.  
- Sidebar active SSoT: `src/shared/utils/sidebarRouteMatch.ts` (0084) — currently aliases fusions/compression/context/health; **not** traffic-inspector.  
- Route guard: `/api/tools/traffic-inspector/` local-only / spawn-capable prefixes.  
- EPIC-20: Traffic is **out of Operations topbar**; freeze path in T20-M.

### O que está faltando / quebrado:

- Traffic lives under **Tools** + Ops Integrations card — not Observe storytelling.  
- Observe subnav has no Traffic peer.  
- Active-state likely leaves wrong leaf (or none) on traffic path.  
- Path freeze undecided in code (`/observe/traffic` vs activity peer vs chrome wrap of tools path).

### Explicitly out of scope:

- Ops Labs/Media fusion (**0096/0097**).  
- Rewriting Traffic capture/MITM business logic.  
- MetaMCP layers.  
- Full app-wide `/observe/*` rename beyond this peer (unless freezing `/observe/traffic` as pilot — document choice).  
- Removing Testing hub (**0099**).

### Collision notes:

- **0084** soft: if still open/in review, extend `SIDEBAR_ACTIVE_HUB_ALIASES` carefully; do not regress fusions/health.  
- Observe subnav is crowded — Traffic peer must not spawn a **second** strip under `ObserveHubSubnav`.  
- Ops card removal: either this task or **0099**; Evidence must state which. Prefer remove Ops traffic card here to prevent dual discovery.

---

## Dependency & Parallel Safety

| Item | Value |
|------|--------|
| **Depends on** | Soft **0084**; soft 0080 Observe patterns; **not** hard-blocked by Labs/Media |
| **Blocks** | **0100** traffic/observe matrix rows |
| **File ownership** | Observe subnav + traffic re-home/redirect; `sidebarRouteMatch` traffic→activity alias; tests `tests/unit/ui/epic20-traffic-observe-0098.test.ts`; optional Ops hub card drop for traffic |
| **Do not touch** | Labs (**0096**), Media (**0097**), Testing retire bulk (**0099**), provider/analytics chrome |
| **parallel-safe** | Yes vs 0096/0097 |
| **serializable** | With concurrent Observe subnav editors |

---

## Test Requirements

- DEVE frear **um** canonical Traffic path in SSoT constant/builder and use it in Observe topbar link  
- DEVE montar Traffic sob **Observe** chrome (peer in `ObserveHubSubnav` or successor single strip)  
- DEVE redirecionar `/dashboard/tools/traffic-inspector` (+ trailing paths if any) → canonical Observe Traffic destination  
- DEVE assertir Observe hub topbar/subnav mount **≤ 1** on Traffic route (anti-phantom; no Ops topbar + Observe strip stack)  
- DEVE assertir sidebar active leaf = Observe (`activity` href) for Traffic paths via matcher (extend 0084 table)  
- DEVE assertir **no** Ops topbar peer id `traffic` (Traffic not in Operations 10 peers)  
- DEVE remover ou redirecionar Ops hub card `traffic-inspector` (binary: gone from `OPERATIONS_HUB_HREFS` **or** marked retired with test)  
- DEVE **não** adicionar primary leaf `traffic-inspector`  
- DEVE manter `/api/tools/traffic-inspector/` classification local-only / spawn-capable (unit or existing guard tests still green)  
- NÃO DEVE polluir `OBSERVE_SOURCES` log enum with traffic unless product freezes traffic as `source=` — prefer peer link like health (separate page) or explicit panel scheme; **document choice**  

---

## Exit Conditions (GDD/TDD)

> OmniRoute npm matrix — see `docs/tasks/OMNIROUTE-CREATE-TASKS-EXITS.md`.

- [x] Canonical Traffic path frozen in code + Observe topbar peer live  
- [x] Legacy tools/traffic-inspector redirects to Observe Traffic  
- [x] Sidebar Observe active on Traffic paths (0084-style alias or nest)  
- [x] Ops hub no longer presents Traffic as Integrations destination (or disposition documented + test)  
- [x] Chrome mount ≤1 Observe strip on Traffic route  
- [x] Unit tests pass:  
      `node --import tsx/esm --test tests/unit/ui/epic20-traffic-observe-0098.test.ts`  
      (+ sidebar-route-match tests if extended)  
- [x] Existing observe hub / route-guard traffic API tests still pass where applicable  
- [x] `npm run typecheck:core` passa sem erros  
- [x] `npm run lint` passa sem erros novos nos arquivos tocados (verified at review 2026-07-20: eslint on touched = 0)  
- [x] Entrada no TOPO de `CHANGELOG.md` under `[Unreleased]`  
- [x] Completion Evidence records **frozen path choice** + Ops card disposition  
- [x] No :21000 mutations  

---

## Details

### What

Subtasks:

- [x] **Ler código existente**: EPIC-20 Traffic rows; `tools/traffic-inspector/**`; `operationsHub.ts` traffic link; `ObserveHubSubnav.tsx`; `observeHub.ts`; `epic19Rebalance.ts`; `sidebarRouteMatch.ts` + `tests/unit/sidebar-route-match.test.ts`; routeGuard/spawnCapable traffic prefixes; observe hub tests  
- [x] **Freeze path** (write in SSoT): **B-style activity peer** — `/dashboard/activity?panel=traffic` (`EPIC20_TRAFFIC_INSPECTOR_PATH`); documented in Evidence  
- [x] Add Observe topbar peer link + active id type exhaustiveness  
- [x] Re-home or wrap Traffic page under Observe chrome; redirect legacy  
- [x] Extend sidebar active matcher → Observe  
- [x] Drop Ops hub traffic card (preferred here)  
- [x] TDD matrix  
- [x] **Refactoring pass**: one subnav strip; no dual Observe chrome  
- [x] **Verificação de regressão**  

### Where

| Arquivo | Propósito |
|---------|-----------|
| EPIC-20 planning | Ler |
| `src/shared/components/ObserveHubSubnav.tsx` | Modificar — Traffic peer |
| `src/shared/constants/observeHub.ts` / `epic19Rebalance.ts` | Modificar se builders/types need Traffic |
| `src/app/(dashboard)/dashboard/tools/traffic-inspector/**` | Redirect or chrome wrap |
| New Observe Traffic route if frozen | Criar |
| `src/shared/constants/operationsHub.ts` | Remover traffic card (or leave to 0099 with note) |
| `src/shared/utils/sidebarRouteMatch.ts` | Alias Traffic → activity |
| `tests/unit/sidebar-route-match.test.ts` | Extend |
| `tests/unit/ui/epic20-traffic-observe-0098.test.ts` | Criar |
| `tests/unit/ui/observe-hub-sidebar.test.ts` | Regressão chrome ≤1 |
| `src/server/authz/routeGuard.ts` / spawn prefixes | Ler only — no weaken |
| `CHANGELOG.md` | Unreleased |

### How

1. Freeze path in constants + tests first (TDD).  
2. Add Observe peer; ensure single strip.  
3. Redirect legacy tools URL.  
4. Sidebar active alias.  
5. Remove Ops Integrations traffic card.  
6. Guard tests still green for API local-only.  

### Why

Traffic is investigate/debug — Observe pillar — not Operations connectivity/labs. Leaving it under Ops violates the locked EPIC-20 matrix and confuses operators next to Webhooks/Memory.

---

## Parallelism / file ownership

| Class | Detail |
|-------|--------|
| **parallel-safe** | 0096 Labs, 0097 Media |
| **serializable** | Concurrent Observe subnav edits; soft after 0084 patterns land |
| **Collision** | `ObserveHubSubnav.tsx`, `sidebarRouteMatch.ts`, `operationsHub.ts` traffic row |

---

## ⛔ Anti-Hallucination Guardrails

> [!CAUTION]
> DO NOT put Traffic on Operations topbar.  
> DO NOT add a second Observe topbar/subnav strip.  
> DO NOT weaken local-only API guards for traffic-inspector.  
> DO NOT invent log `source=` pollution without freeze.  
> PORT 21000 = production — do not touch.

> [!IMPORTANT]
> Soft-depend **0084**: extend matcher, do not rewrite Routing aliases.  
> Hard Rules #22–#23: single Observe chrome; self-evident Traffic destination.  
> Record frozen path in Completion Evidence — reviewers reject if path still “TBD”.

---

## 🛡️ Compliance Checklist (Leis Primárias do AGENTS.md)

- [x] **Doc Accuracy**: frozen path grepped  
- [x] **Zod Validation**: if new query keys (none — reuses `panel=`)  
- [x] **Security**: local-only / spawn-capable unchanged  
- [x] **Error Sanitization**: N/A unless error UI  
- [x] **No Raw SQL**: N/A  
- [x] **Archive Protocol**: redirect legacy tools path  

---

## 📋 Completion Evidence (preenchido pelo agente executor)

- **Frozen Traffic path**: `/dashboard/activity?panel=traffic` (`EPIC20_TRAFFIC_INSPECTOR_PATH` / `buildObserveTrafficInspectorPath()`; also `buildObserveTrafficPanelPath()` / `ObserveOperationalPanel = "traffic"`)
- **Arquivos**:
  - `src/shared/constants/epic19Rebalance.ts` — `traffic` operational panel + builder
  - `src/shared/constants/epic20Operations.ts` — freeze comment (path already frozen in 0086)
  - `src/shared/components/ObserveHubSubnav.tsx` — Traffic peer link
  - `src/app/(dashboard)/dashboard/activity/ObserveHubClient.tsx` — mounts `TrafficInspectorPageClient` on `panel=traffic`
  - `src/app/(dashboard)/dashboard/tools/traffic-inspector/page.tsx` — redirect shell
  - `src/shared/constants/operationsHub.ts` — removed traffic-inspector Integrations card
  - `src/shared/utils/sidebarRouteMatch.ts` — legacy tools path → Observe alias
  - `tests/unit/ui/epic20-traffic-observe-0098.test.ts` — TDD matrix
  - `tests/unit/sidebar-route-match.test.ts` — Observe active for traffic path
  - `tests/unit/ui/operations-hub-discoverability-0059.test.ts` — no Ops traffic card
  - `CHANGELOG.md` — Unreleased
- **Ops card disposition**: **removed here** from `OPERATIONS_HUB_GROUPS` Integrations (not deferred to 0099)
- **Sidebar active proof**: `SIDEBAR_ACTIVE_HUB_ALIASES` pathPrefix `/dashboard/tools/traffic-inspector` → `activity` / `/dashboard/activity`; canonical `/dashboard/activity` lights via primary prefix; unit tests green
- **Testes + output**:
  - `node --import tsx/esm --test tests/unit/ui/epic20-traffic-observe-0098.test.ts tests/unit/sidebar-route-match.test.ts tests/unit/ui/operations-hub-discoverability-0059.test.ts tests/unit/ui/epic20-operations-matrix-0086.test.ts tests/unit/ui/observe-hub-sidebar.test.ts` → **89 pass / 0 fail**
  - `npm run typecheck:core` → clean
- **Changelog**: Unreleased Added — Task 0098 / T20-M
- **Agente / data**: gt-ts-engineer / 2026-07-20
- **Left in**: `docs/tasks/02-doing/` (per task instruction — do not move)

---

## 🔍 Review Trail (preenchido pelo reviewer)

- **Reviewer**: `gt-frontend-quality-reviewer` (parent `builders`)
- **Data da review**: 2026-07-20
- **Veredito**: `ACCEPTED_100` — move `02-doing` → `03-review`
- **Score (path to 100)**: **100/100**
- **Report**: `docs/reports/reviews/2026-07-20-task-0098-epic20-traffic-observe-review.md`
- **Bundle blast-radius**: `docs/reports/reviews/2026-07-20-tasks-0097-0098-epic20-bundle-blast-radius.md`
- **Notas**: Frozen path `/dashboard/activity?panel=traffic` (not Ops topbar); single Observe strip; legacy tools redirect; Ops Integrations card removed here; sidebar Observe active; API guards unchanged. Hygiene: exit lint + subtask/compliance boxes closed at review after re-verify. Unit/related 89/89; typecheck:core + eslint clean.
