# Task 0024: Frontend IA — Connect / Registry Exposure Cleanup (S5)

> **Status**: `[ ]` Open
> **Priority**: 🔴 P0
> **Type**: `feature`
> **Origin**: Epic 0005 — Frontend IA Reform (slice **S5**)
> **Action type**: UX_VIS
> **Blocks**: Task 0025 (Registry pillar mapping)
> **Depends on**: Task 0020 (archive policy)
> **Parallel group**: A (with Task 0023, Task 0026–0029)

---

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

- [ ] Written **exposure matrix** in Completion Evidence: old leaf/id/href → new home
- [ ] Default sidebar no longer shows triple MCP/A2A/API Endpoints peers (single canonical set)
- [ ] Redirects live for retired paths (HTTP/navigation level)
- [ ] Hideable IDs retained where prefs apply
- [ ] Provenance entry under `.archive/sidebar/` (or pages)
- [ ] Unit tests assert new default leaf set for Connect/Registry cluster
- [ ] Manual smoke: open MCP tools UI, A2A agent card/dashboard, API endpoints list from new homes
- [ ] `npm run typecheck:core` passes
- [ ] Targeted unit tests pass with 0 failures
- [ ] CHANGELOG.md entry
- [ ] No capability deleted without mapped home (epic invariant #5)

---

## Details

### What

Subtasks:
- [ ] **Ler código existente**: `sidebarVisibility.ts` (endpoints, mcp, a2a, api-endpoints, api-manager, providers), dashboard pages under those routes, endpoint tabs, any dual links in Sidebar/CommandPalette
- [ ] **Decide canonical homes** (product defaults if research absent):
  - MCP → `/dashboard/mcp` (tabs for tools/scopes/audit if needed)
  - A2A → `/dashboard/a2a`
  - API surface → pick **one** of `endpoints` vs `api-endpoints` as SSoT; redirect the other
  - Providers stay Registry primary
- [ ] **Implement redirects** for non-canonical routes
- [ ] **Trim SIDEBAR_SECTIONS** default children; retain hideables
- [ ] **Command palette / help links** update if they hardcode old paths
- [ ] **Archive provenance**
- [ ] **Tests** for leaf set + redirects
- [ ] **Verificação** typecheck + tests + smoke matrix

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

- [ ] **Doc Accuracy**: Routes grepped live before claims
- [ ] **Archive Protocol**: Provenance for removed leaves
- [ ] **Deep links**: Redirects for all retired paths
- [ ] **Tests**: Binary pass/fail

---

## 📋 Completion Evidence (preenchido pelo agente executor)

- **Arquivos criados/modificados**: [lista]
- **Exposure matrix**: [old → new]
- **Testes**: [nomes + resultado]
- **typecheck**: [PASS/FAIL]
- **Archive path**: [`.archive/...`]
- **CHANGELOG**: [ref]
- **Agente executor**: [nome]
- **Data de conclusão**: [YYYY-MM-DD]
