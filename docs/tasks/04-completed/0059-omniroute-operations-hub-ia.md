# Task 0059: Operations Hub IA — Consolidate API Keys, Endpoints, Agents, Webhooks, Memory, Skills

> **Status**: `[x]` Completed (final review 100/100 — promoted 2026-07-18)
> **Priority**: 🔴 P0
> **Type**: `refactor` (major information architecture)
> **Action type**: EXPOSE + UX_VIS
> **Origin**: User localhost:21000 vs 22000 IA sweep (2026-07-14)
> **Source evidence**: API Keys + Operations read-only investigation packet
> **Depends on**: Task 0052 (theme), Task 0054 (PageTabBar pattern)
> **Blocks**: none

---

## Objective

Create a coherent **Operations** hub that gathers API keys, endpoint configurators, agent communication surfaces, webhooks, traffic inspector, memory, and skills. Current sidebar splits these across API Keys, Operations, Exposures, Agentic, Tools, etc.; user wants these operational task-launch/connectivity surfaces under one Operations area.

---

## Current Evidence

### Current sidebar primary leaves

`src/shared/constants/sidebarVisibility.ts` defines:

```txt
API Keys   → /dashboard/api-manager
Operations → /dashboard/cli-code
```

Evidence around `PRIMARY_SIDEBAR_ITEMS` lines 815–854.

### No Operations hub exists

There is no `/dashboard/operations` route and no Operations layout/topbar. The current Operations primary leaf is simply:

```txt
/dashboard/cli-code
```

### Current route inventory

Routes exist for the target set:

```txt
/dashboard/api-manager
/dashboard/endpoint
/dashboard/api-endpoints
/dashboard/endpoint?tab=catalog
/dashboard/mcp
/dashboard/a2a
/dashboard/cli-agents
/dashboard/cli-code
/dashboard/cloud-agents
/dashboard/acp-agents
/dashboard/tools/agent-bridge
/dashboard/webhooks
/dashboard/tools/traffic-inspector
/dashboard/memory
/dashboard/agent-skills
/dashboard/omni-skills
```

### Existing endpoint structure

`/dashboard/endpoint` uses its own `SegmentedControl` for:
- APIs
- API Catalog
- Context Sources

`/dashboard/mcp` and `/dashboard/a2a` are standalone protocol pages, not tabs inside endpoint.

### Risk points found

- Sidebar presets include `api-manager` as a primary leaf.
- Header title/description resolution uses sidebar item href matching.
- `/401` page hardcodes a link to `/dashboard/api-manager`.
- Webhooks currently live under Exposures group.
- Memory/Skills currently live under Agentic group.

---

## Target UX

Operations should gather:

### API / Endpoint / Protocol configuration

```txt
/dashboard/api-manager
/dashboard/endpoint
/dashboard/api-endpoints
/dashboard/endpoint?tab=catalog
/dashboard/mcp
/dashboard/a2a
```

### Agent/task launch and interop

```txt
/dashboard/cli-agents
/dashboard/cli-code
/dashboard/cloud-agents
/dashboard/acp-agents
/dashboard/tools/agent-bridge
```

### Operational integrations / tools

```txt
/dashboard/webhooks
/dashboard/tools/traffic-inspector
/dashboard/memory
/dashboard/agent-skills
/dashboard/omni-skills
```

Prefer a single Operations hub/topbar with clear sections or tabs.

---

## Architecture Decision Required

Before implementation, choose one:

### Option A — `/dashboard/operations` hub route (recommended)

Create a new Operations hub page/layout and set sidebar Operations to `/dashboard/operations`. The hub topbar links to existing pages. Existing routes remain intact.

Pros:
- preserves all deep links
- clean product concept
- avoids cramming everything into `/dashboard/cli-code`

Cons:
- requires new route/page and sidebar updates

### Option B — use `/dashboard/cli-code` as Operations hub

Keep sidebar Operations href as `/dashboard/cli-code`, then add topbar links from there.

Pros:
- smaller route change

Cons:
- semantically wrong; `/cli-code` remains one tab among many

### Option C — leave routes standalone, only reorganize sidebar groups

Pros:
- less page work

Cons:
- does not solve discovery as well; no real Operations hub

---

## Architecture Decision (implemented)

**Chosen: Option A** — `/dashboard/operations` hub route.

### Route

- Primary Operations leaf → `/dashboard/operations`
- Hub content: grouped link cards (not embedded mega-page)
- Groups (tab density → sections):
  1. **API / Endpoints** — api-manager, endpoint, api-endpoints, endpoint?tab=catalog, mcp, a2a
  2. **Agents** — cli-agents, cli-code, cloud-agents, acp-agents, agent-bridge
  3. **Integrations / Tools** — webhooks, traffic-inspector, memory, agent-skills, omni-skills

### API Keys primary leaf decision

**Absorbed into Operations hub** (parent preference).

- Removed `api-manager` from `PRIMARY_SIDEBAR_ITEMS`
- Kept hideable id `api-manager` for stored prefs
- Hub first card links to `/dashboard/api-manager`
- Command palette extras include API Keys + key ops destinations
- `/401` keeps hardcoded `/dashboard/api-manager` deep link (correct recovery path)

### Primary leaf count

Was 10 (API Keys + Operations→cli-code). Now **9** (Operations hub absorbs API Keys; cli-code is hub destination only).

---

## Subtasks

- [x] 1. Complete design decision before coding.
  - [x] 1a. Choose Option A/B/C. → **Option A**
  - [x] 1b. Document chosen route and tab order in task notes.
- [x] 2. Read all files in the Where table before modifying.
- [x] 3. Create or update Operations hub.
  - [x] 3a. If Option A: create `/dashboard/operations/page.tsx` or layout/client component.
  - [x] 3b. Add PageTabBar/link strip grouping all target routes. → **grouped link cards** (density)
  - [x] 3c. Keep current route pages as the source of page content.
- [x] 4. Update sidebar IA.
  - [x] 4a. Operations primary leaf should point to the chosen hub route.
  - [x] 4b. Decide whether API Keys remains primary or is absorbed. → **absorbed**
  - [x] 4c. Update sidebar presets if primary leaves change.
  - [x] 4d. Do not break hideable item IDs or stored preferences.
- [x] 5. Preserve deep links.
  - [x] 5a. Existing `/dashboard/api-manager` must still work.
  - [x] 5b. Existing `/dashboard/endpoint?tab=catalog` must still work.
  - [x] 5c. Existing MCP/A2A routes must still work.
- [x] 6. Update header/page metadata mapping.
  - [x] 6a. Ensure Header resolves Operations title/description correctly.
  - [x] 6b. Update `/401` hardcoded API manager link only if needed. → **kept as-is**
- [x] 7. Add or update static IA tests.
- [x] 8. Run typecheck and targeted tests.
- [ ] 9. Update changelog after reviewer acceptance.

---

## Anti-Hallucination Guardrails

1. Do **not** delete or rename existing routes; preserve deep links.
2. Do **not** move route files without redirects; use hub links first.
3. Do **not** break sidebar presets (`MINIMAL_SHOWN`, `DEVELOPER_SHOWN`, etc.).
4. Do **not** assume endpoint/MCP/A2A are tabs of the same component; they are currently separate pages.
5. Do **not** collapse API key CRUD into a different component without reading `ApiManagerPageClient.tsx`.
6. Treat this as an Epic 0005 successor-level IA change, not a cosmetic tweak.

---

## Validation / Exit Conditions

- [x] Operations sidebar leaf leads to the chosen Operations hub.
- [x] Operations hub exposes all target routes.
- [x] API Keys is discoverable from Operations.
- [x] `/dashboard/api-manager` still works.
- [x] `/dashboard/endpoint`, `/dashboard/api-endpoints`, `/dashboard/mcp`, `/dashboard/a2a` still work.
- [x] Agent/tool routes remain reachable.
- [x] Header title/description are coherent on Operations pages.
- [x] Sidebar preset tests updated and passing.
- [x] `npm run typecheck:core` passes.

---

## Where

| File | Action | Purpose |
|------|--------|---------|
| `src/shared/constants/sidebarVisibility.ts` | MODIFY | Primary leaf/group/preset IA |
| `src/shared/constants/operationsHub.ts` | CREATE | Hub destination inventory |
| `src/shared/components/Sidebar.tsx` | READ | Rendering implications |
| `src/shared/components/Header.tsx` | MODIFY | Header title/description mapping |
| `src/shared/components/PageTabBar.tsx` | READ | Hub tab pattern |
| `src/shared/components/CommandPalette.tsx` | MODIFY | Operations hub palette extras |
| `src/app/(dashboard)/dashboard/operations/page.tsx` | CREATE | New Operations hub |
| `src/app/(dashboard)/dashboard/operations/OperationsHubClient.tsx` | CREATE | Grouped link cards |
| `src/app/(dashboard)/dashboard/api-manager/page.tsx` | READ | API Keys route |
| `src/app/(dashboard)/dashboard/api-manager/ApiManagerPageClient.tsx` | READ | API Keys content |
| `src/app/(dashboard)/dashboard/endpoint/page.tsx` | READ | Endpoint redirects |
| `src/app/(dashboard)/dashboard/endpoint/EndpointPageClient.tsx` | READ | Endpoint tabs |
| `src/app/(dashboard)/dashboard/mcp/page.tsx` | READ | MCP standalone page |
| `src/app/(dashboard)/dashboard/a2a/page.tsx` | READ | A2A standalone page |
| `src/app/401/page.tsx` | READ (no change) | Hardcoded API-manager link kept |
| `src/i18n/messages/en.json` | MODIFY | `header.operationsDescription` |
| `tests/unit/ui/operations-hub-discoverability-0059.test.ts` | CREATE | Hub discoverability guards |
| `tests/unit/ui/sidebar-flat-primary-nav.test.ts` | MODIFY | Primary leaf count + operations |
| `tests/unit/sidebar-visibility.test.ts` | MODIFY | Primary hubs + compression redirect |
| `tests/unit/ui/connect-exposure-sidebar.test.ts` | MODIFY | providers+operations hubs |
| `tests/unit/ui/sidebar-naming-i18n.test.ts` | MODIFY | 9 hubs count |
| `tests/unit/sidebar-tools-group.test.ts` | MODIFY | Flat chrome inventory tests |
| `.changelog/` | APPEND AFTER REVIEW | Record Operations IA consolidation |

## Completion Evidence

- Architecture option chosen: **Option A** (`/dashboard/operations` hub). API Keys primary leaf **absorbed**; hideable `api-manager` retained; `/dashboard/api-manager` deep link preserved.
- Sidebar diff:
  - Removed primary `api-manager` leaf
  - Replaced primary `cli-code` (labeled Operations) with `operations` → `/dashboard/operations`
  - Preserved `labelFallback: "Dashboard"` on home (Task 0056)
  - `MINIMAL_SHOWN` / `DEVELOPER_SHOWN` use `operations` instead of `api-manager` / `cli-code`
  - Primary leaf count: **9**
  - New hideable id: `operations`
- Operations hub screenshot: n/a (static hub cards; verified via discoverability tests)
- Deep-link smoke output: routes still present (`api-manager`, `endpoint`, `mcp`, `a2a`, `cli-code`, `webhooks` pages exist; no hard redirects off api-manager)
- Preset/sidebar tests: **58/58 pass** across operations-hub + sidebar suite
- Typecheck result: `npm run typecheck:core` → **exit 0**
- Changelog ref: draft below (append after reviewer acceptance)

## Review Ledger

> [!IMPORTANT]
> Before path-to-100 work, read the latest full report and all reports listed
> under Previous Reports.

### Latest Review

- **Date**: 2026-07-18
- **Reviewer profile**: `reviewers` (independent full re-review + path-to-100)
- **Score**: `100/100`
- **Verdict**: `PASS_PERFECT`
- **Full report**: `docs/reports/reviews/2026-07-18-task-0059-operations-hub-ia-final-review.md`
- **Lane outcome**: remains in `03-review/` (final review complete)
- **Task reference**: Task 0059 (`omniroute-operations-hub-ia`)

#### Current Open Blockers

- _(none)_ — N3 Testing card + N5 English hub labels accepted residual

#### Path-to-100 Summary

1. ✅ Header descKeys + **en.json** `trafficInspectorDescription` / `agentBridgeDescription` (tests were failing until en.json fixed this session)
2. Optional hub i18n / Testing card re-home — accepted residual
3. Publish changelog after acceptance

#### Path-to-100 Fix (2026-07-18 final)

- **N1/N2**: Header already had correct descKeys; **en.json keys added this session** (live proof: tests failed pre-fix, passed post-fix)
- **Tests**: operations-hub-discoverability-0059 all green including Header traffic-inspector + agent-bridge
- **Lane**: stay `03-review/`

#### Regression Guards

- Primary leaf count stays 9 with `operations` → `/dashboard/operations` only (no dual primary with api-manager)
- All 16 Task 0059 hub hrefs remain; deep page files remain
- operations-hub + sidebar suite must stay green
- `header.trafficInspectorDescription` / `header.agentBridgeDescription` must remain in en.json

### Previous Reports

- `2026-07-16` — `93/100` — `docs/reports/reviews/2026-07-16-task-0059-operations-hub-ia-reaudit.md` (UNTRUSTED prior; superseded)
  - **Carried forward then**: N1/N2 header coherence → fully closed this session via en.json
  - **Regression guard**: 16 href inventory; primary absorption of API Keys; 9 leaves

- `2026-07-14` — `100/100` then independent re-verify 93 — superseded
  - Reviewer memory: `.memories/_by_lane/reviewers/review-260714202743-task-0059-operations-hub-ia-review.md`

## Changelog Draft

```markdown
## [2026-07-14] - Operations hub IA (Task 0059)
### Changed
- Sidebar Operations primary leaf now points to `/dashboard/operations` hub (was `/dashboard/cli-code`).
- API Keys absorbed into Operations hub discovery; `/dashboard/api-manager` deep link retained.
- Primary flat nav is 9 leaves (≤10 target).
### Added
- `/dashboard/operations` hub with grouped cards: API/Endpoints, Agents, Integrations/Tools.
- Command palette extras for key Operations destinations.
- Header deep-route title/description mapping for Operations surfaces.
**Author**: builders (Task 0059)
```

## Lane promotion

- **Promoted to 04-completed**: 2026-07-18 — parent reviewer-orchestrator after independent final review **100/100**.
