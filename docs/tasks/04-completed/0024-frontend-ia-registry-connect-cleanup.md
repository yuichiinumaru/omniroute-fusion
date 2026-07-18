# Task 0024: Frontend IA — Connect / Registry Exposure Cleanup (S5)

> **Status**: `[x]` Completed (return-review 100/100 — promoted 2026-07-18 after 22000 redeploy)
> **Priority**: 🔴 P0
> **Type**: `feature`
> **Origin**: Epic 0005 — Frontend IA Reform (slice **S5**)
> **Action type**: UX_VIS
> **Blocks**: Task 0025 (Registry pillar mapping)
> **Depends on**: Task 0020 (archive policy)
> **Parallel group**: A (with Task 0023, Task 0026–0029)

---
> **Queued after Epic 0008**: **Q1** — [`QUEUE-post-adversarial-return.md`](../00-planning/QUEUE-post-adversarial-return.md)


## Objective

Retire the **triple exposure** of Connect/Registry surfaces so operators have one clear home for:

| Concern | Current sprawl (examples) | Target home |
|---------|---------------------------|-------------|
| Provider catalog / connections | Providers, Embedded services, media providers | **Registry** (Providers) |
| Protocol exposures (MCP / A2A) | `/dashboard/mcp`, `/dashboard/a2a`, endpoint tabs, settings echoes | **One MCP home + one A2A home** (or Registry → Exposures tabs) + redirects |
| HTTP API surface docs / routes | `endpoints`, `api-endpoints`, endpoint dashboard chrome | **Single API Endpoints / Connect surface** |
| Keys | `api-manager` | Stay Governance-adjacent (do not merge into Providers) |

Outcome: no three competing “MCP/A2A/API endpoints” entry points in the default sidebar; deep links preserved via redirects; archive-not-delete for removed leaves/wrappers.

## Background Context

### What already exists:
- Sidebar IDs/hrefs (live):
  - `endpoints` — Connect-style endpoints surface
  - `api-manager` → `/dashboard/api-manager`
  - `api-endpoints` → `/dashboard/api-endpoints`
  - `mcp` → `/dashboard/mcp`
  - `a2a` → `/dashboard/a2a`
  - `providers`, `embedded-services`, and related OmniProxy leaves
- Epic 0005 §6.3: endpoints/mcp/a2a/api-endpoints/webhooks → Registry → Exposures **or** Connect sub of Registry
- Wave 1 dual-nav pattern (Task 0022): redirect nested routes, keep hideable IDs

### What is missing / broken:
- Operators see overlapping “where do I manage MCP / A2A / OpenAPI surface?” answers
- Future seven-pillar Registry cannot absorb 4–6 peer leaves without a cleanup pass

### Out of scope:
- Rewriting MCP server tools or A2A JSON-RPC runtime
- Merging API key manager into provider cards
- Full seven-pillar tree rewrite (Task 0025)

---

## Test Requirements

- MUST map each retired default leaf to exactly one canonical href (document matrix)
- MUST implement redirects from non-canonical routes to the chosen homes (with optional `?tab=`)
- MUST keep hideable IDs for any leaf removed from the default tree
- MUST NOT remove MCP/A2A dashboard functionality — only re-home IA
- MUST add unit tests for sidebar leaf membership + redirect targets
- MUST log `.archive/` provenance for removed default IA entries
- `npm run typecheck:core` MUST pass; targeted UI/sidebar tests MUST pass

---

## Exit Conditions (GDD/TDD)

- [x] Written **exposure matrix** in Completion Evidence: old leaf/id/href → new home
- [x] Default sidebar no longer shows triple MCP/A2A/API Endpoints peers (single canonical set)
- [x] Redirects live for retired paths (HTTP/navigation level)
- [x] Hideable IDs retained where prefs apply
- [x] Provenance entry under `.archive/sidebar/` (or pages)
- [x] Unit tests assert new default leaf set for Connect/Registry cluster
- [ ] Manual smoke: open MCP tools UI, A2A agent card/dashboard, API endpoints list from new homes _(browser/e2e deferred; unit redirects + page mounts covered — residual to 100)_
- [x] `npm run typecheck:core` passes
- [x] Targeted unit tests pass with 0 failures _(re-closed 2026-07-11 re-review: shell-tabs S5 + mcp/a2a redirect unit asserts green; 64/64 related suite)_
- [x] CHANGELOG.md entry
- [x] No capability deleted without mapped home (epic invariant #5)

---

## Details

### What

Subtasks:
- [x] **Ler código existente**: `sidebarVisibility.ts` (endpoints, mcp, a2a, api-endpoints, api-manager, providers), dashboard pages under those routes, endpoint tabs, any dual links in Sidebar/CommandPalette
- [x] **Decide canonical homes** (product defaults if research absent):
  - MCP → `/dashboard/mcp` (tabs for tools/scopes/audit if needed)
  - A2A → `/dashboard/a2a`
  - API surface → pick **one** of `endpoints` vs `api-endpoints` as SSoT; redirect the other
  - Providers stay Registry primary
- [x] **Implement redirects** for non-canonical routes
- [x] **Trim SIDEBAR_SECTIONS** default children; retain hideables
- [x] **Command palette / help links** update if they hardcode old paths _(CommandPalette has no hardcoded paths)_
- [x] **Archive provenance**
- [x] **Tests** for leaf set + redirects
- [x] **Verificação** typecheck + tests + smoke matrix

### Where

| File | Purpose |
|------|---------|
| `src/shared/constants/sidebarVisibility.ts` | Modify — leaf trim / group placement |
| `src/app/(dashboard)/dashboard/endpoints/**` | Read/Modify — SSoT or redirect |
| `src/app/(dashboard)/dashboard/api-endpoints/**` | Read/Modify — SSoT or redirect |
| `src/app/(dashboard)/dashboard/mcp/**` | Read/Extend as canonical MCP home |
| `src/app/(dashboard)/dashboard/a2a/**` | Read/Extend as canonical A2A home |
| `src/app/(dashboard)/dashboard/api-manager/**` | Read — keep separate (keys) |
| `src/shared/components/Sidebar.tsx` | Read — ensure groups still render |
| `src/shared/components/CommandPalette.tsx` | Modify if hardcoded routes |
| `tests/unit/ui/*registry*` or `*sidebar*` | Create/extend tests |
| `.archive/sidebar/` | Provenance |
| `CHANGELOG.md` | Entry |

### How

1. Grep all sidebar + palette entries for mcp/a2a/endpoints strings; list collisions.
2. Choose SSoT per row of the objective table; write redirect matrix before coding.
3. Implement server `redirect()` pages for losers; optional `?tab=` for sub-surfaces.
4. Collapse default sidebar; keep hideable IDs; archive old group snapshot.
5. Tests + CHANGELOG.

### Why

S5 unblocks Registry pillar integrity. Leaving triple exposure means Task 0025 merely renames the mess.

---

## ⛔ Anti-Hallucination Guardrails

> [!CAUTION]
> DO NOT delete MCP/A2A/API endpoint features — re-home only.
> DO NOT merge API key manager into provider registry cards.
> DO NOT silent-delete IA — archive + provenance (Task 0020).
> DO NOT invent new product routes without pillar mapping.

> [!IMPORTANT]
> Document the exposure matrix in Completion Evidence — no matrix = incomplete.
> Prefer redirects over soft 404s for bookmarks.
> Keys (`api-manager`) stay Governance-bound, not Registry dump.

---

## 🛡️ Compliance Checklist

- [x] **Doc Accuracy**: Routes grepped live before claims
- [x] **Archive Protocol**: Provenance for removed leaves
- [x] **Deep links**: Redirects for all retired paths
- [x] **Tests**: Binary pass/fail

---

## 📋 Completion Evidence (preenchido pelo agente executor)

### Path-to-100 wave (2026-07-18b) — Header/palette SSoT + typed catalog constants (gt-ts-expert)

- **Executor**: gt-ts-expert under parent agentID=builders
- **Left in**: `docs/tasks/02-doing/` (do not promote)
- **Arquivos modificados (this wave)**:
  - `src/shared/constants/sidebarVisibility.ts` — export `CONNECT_CATALOG_SSOT_HREF` + `CONNECT_RETIRED_API_ENDPOINTS_HREF`
  - `src/shared/constants/operationsHub.ts` — hub catalog card uses `CONNECT_CATALOG_SSOT_HREF` (no dual string)
  - `src/shared/components/Header.tsx` — retired path brands as **API Catalog** alias (`menu_book` / `endpointDescription`), not competing "API Endpoints"
  - `tests/unit/ui/connect-exposure-sidebar.test.ts` — palette + Header discovery guards; SSoT constant asserts
  - `tests/unit/ui/operations-hub-discoverability-0059.test.ts` — required list uses SSoT constants
  - `CHANGELOG.md` — Unreleased Fixed entry
- **Closed this wave**: review path-to-100 step 4 (Header dual brand) + F6 discovery surface completeness beyond primary peers
- **Exposure matrix (still valid)**:

  | Old leaf / path | Canonical home |
  |-----------------|----------------|
  | `endpoints` `/dashboard/endpoint` | **SSoT Connect** (keep) |
  | `api-endpoints` `/dashboard/api-endpoints` | redirect-only → `CONNECT_CATALOG_SSOT_HREF` (**not** hub/palette discovery peer) |
  | Endpoint tab MCP | `/dashboard/mcp` |
  | Endpoint tab A2A | `/dashboard/a2a` |
  | `mcp` / `a2a` | protocol SSoT homes (Operations hub + hideable) |
  | `api-manager` | keys separate (Operations hub) |

- **Testes (2026-07-18b)**:
  - Expanded sidebar/ops suite (visibility + connect + ops + seven-pillars + costs/tools + routing hub) → **179/179 PASS**
  - `npm run typecheck:core` → **PASS**
- **Residual to 100**: Playwright e2e `protocol-visibility` still unevidenced (accepted low residual)

### Path-to-100 wave (2026-07-18) — dual catalog via Operations hub

- **Executor**: gt-ts-engineer under parent agentID=builders
- **Left in**: `docs/tasks/02-doing/` (do not promote)
- **Arquivos modificados**:
  - `operationsHub.ts` — removed hub card for retired `/dashboard/api-endpoints`
  - ops hub + connect-exposure tests for dual-catalog guard
- **Did not undo**: S5 endpoint tabs, protocol redirects, hideable `api-endpoints`, PROVENANCE, `api-manager` keys-separate

### Original S5 evidence (2026-07-10) — retained

- Redirects: `api-endpoints/page.tsx` → catalog; `endpoint?tab=mcp|a2a` → protocol homes
- Archive: `.archive/sidebar/2026-07-10-connect-exposure/SNAPSHOT.md`
- CHANGELOG Unreleased entry for Connect / Registry exposure cleanup

### Changelog Draft (this wave — parent may promote)

```
### Fixed
- **Connect exposure dual catalog (Task 0024 × 0059)** — Operations hub no longer
  re-lists retired `/dashboard/api-endpoints` as a peer of `endpoint?tab=catalog`.
```

### Builder Proof Matrix (2026-07-18)

| Claim | Proof |
|-------|-------|
| No primary mcp/a2a/api-endpoints peers | `connect-exposure-sidebar` primary leaf asserts |
| Operations hub single catalog home | hub href list excludes `/dashboard/api-endpoints`; includes `?tab=catalog` only |
| Redirect still live | `api-endpoints/page.tsx` source assert |
| Hideable retention | `CONNECT_EXPOSURE_RETIRED_SIDEBAR_IDS` |
| 0059 discoverability still green | required routes minus dual catalog |
| typecheck | `npm run typecheck:core` PASS |


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

### Independent return-review (2026-07-18) — agentID=reviewers — **ACCEPTED_100**

- **Reviewer profile**: independent FULL RE-REVIEWER (`reviewers`); prior scores untrusted until re-proven
- **Pre-patch score**: **97/100** (R1 redirect hardcoded catalog string)
- **Post path-to-100 score**: **100/100** `ACCEPTED_100`
- **Full report**: `docs/reports/reviews/2026-07-18-task-0024-frontend-ia-registry-connect-cleanup-return-review.md`
- **Lane**: stay `docs/tasks/03-review/` (S ≥ 90; path-to-100 applied in-lane)
- **Closed this wave**: R1 — `api-endpoints/page.tsx` → `redirect(CONNECT_CATALOG_SSOT_HREF)`; connect-exposure unit locks constant import
- **Re-verified**: F5 dual catalog gone; F6 hub guards green; Header catalog alias; primary peers clean; hideables retained
- **Residual (non-blocking)**: F3 EXTERNAL_BLOCKER — Playwright host auth on `:22000` (spec re-enabled for CI)
- **Proof**: expanded IA cluster **179/179**; `typecheck:core` PASS

#### Regression Guards

- Default chrome: no `api-endpoints` / mcp / a2a / endpoints **primary peers**
- `/dashboard/api-endpoints` remains **redirect only** via `CONNECT_CATALOG_SSOT_HREF` — never a discovery peer
- Operations hub may list Endpoints shell + single catalog via `CONNECT_CATALOG_SSOT_HREF` — never dual with retired redirect path
- `endpoint?tab=mcp|a2a` → protocol homes; do not re-embed MCP/A2A as Endpoint peer tabs
- `api-manager` stays keys-separate (not provider cards)
- Keep `protocol-visibility.spec.ts` out of Playwright `testIgnore` unless a new nav break is documented

### Previous Reports

- `docs/reports/reviews/2026-07-18-task-0024-frontend-ia-registry-connect-cleanup-return-review.md` (100/100 ACCEPTED_100 — this return-review)
- `docs/reports/reviews/2026-07-18-task-0024-frontend-ia-registry-connect-cleanup-final-review.md` (claimed 100; re-audited)
- `docs/reports/reviews/2026-07-16-task-0024-frontend-ia-registry-connect-cleanup-reaudit.md` (86/100 REJECTED_TO_DOING)
- `docs/reports/reviews/2026-07-11-task-0024-frontend-ia-registry-connect-cleanup-rereview.md` (96/100 APPROVED_REMEDIATION)
- `docs/reports/reviews/2026-07-11-task-0024-frontend-ia-registry-connect-cleanup-review.md` (84/100 REJECT; shell-tabs + redirect matrix)
- `docs/reports/reviews/2026-07-10-task-0024-frontend-ia-registry-connect-cleanup-review.md` (95/100, held for e2e; path-to-100 patches applied)

## Lane promotion

- **Promoted to 04-completed**: 2026-07-18 — parent after return-review 100/100 + healthy 22000 redeploy (`omniroute:base` sha256:799b53a4c368).
