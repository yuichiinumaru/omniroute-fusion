# EPIC-20 — Operations Hub Reform (Topbar + Fusion Pages + Self-Evident Paths)

> **Status**: **Active** — matrix LOCKED; **children in `01-open/` 0086–0100** (T20-A…O)  
> **Priority**: **P0 product UX** (last major UI wave after EPIC-19 chrome rework)  
> **Type**: UX_VIS / IA  
> **Project**: omniroute-2  
> **Author**: architect-orchestrator + operator  
> **Depends on**:  
> - `AGENTS.md` Dashboard IA / Design System law (single topbar, self-evident org)  
> - EPIC-19 **chrome rework** 0079/0080/0081 preferred **first** (patterns for 1 topbar + anti-phantom tests)  
> - Soft: EPIC-19 **0084** active-state, **0085** path phase-0 (Operations **pilots** `/operations/{topbar}`)  
> **Does NOT**: Cybernetics MetaMCP layers; new primary sidebar leaf; backend rewrite  
> **Evidence**: Operator proposal + live `operationsHub.ts`, `testingHub.ts`, screenshots Operations/Testing/CLI/ACP/Endpoints/Search Tools  
> **Tasks promoted**: 2026-07-19 — IDs **0086–0100**  

---

## 0. Why a **new** epic (not more EPIC-19)

| | EPIC-19 | EPIC-20 |
|--|---------|---------|
| **Hubs** | Dashboard, Providers, Observe (+ leaf drop) | **Operations** only (+ Traffic → Observe) |
| **Problem** | Costs/Analytics re-home + multi-topbar bug | Card dump launchpad + fragmented deep pages + Testing parked under Ops |
| **Success** | 7-leaf storytelling/config/ops health | Ops becomes navigable with **sidebar → one topbar → collapsibles** |
| **Risk if merged** | EPIC-19 never “closes”; success metrics explode | — |

**Recommendation (locked for planning):** **EPIC-20** owns Operations reform.  
EPIC-19 keeps finishing chrome unify (0079–0081) + active-state (0084) + URL phase-0 doc (0085).  
EPIC-20 **implements** self-evident paths **for Operations first** (`/operations/{segment}`) as the pilot, reusing 0085 inventory.

Cross-cut only: **Traffic Inspector → Observe topbar** (small task owned by EPIC-20 with Observe chrome coordination).

---

## 1. Goal

1. Kill Operations as a **only-cards launchpad** without in-hub topbar.  
2. Absorb **Testing** content into Operations (no separate mental “Testing hub” as the home for labs).  
3. **Fuse** small/rare/redundant pages into vertical collapsible stacks (a above b above c).  
4. Explanatory cards → **bottom**, **default collapsed**.  
5. Paths: **`/operations/{topbar-id}`** (with redirects from legacy `/dashboard/*`).  
6. Hierarchy: **sidebar (Operations) → single topbar → collapsibles**.

Philosophy: *Organização tem que ser auto-evidente, ou não é organização.*

---

## 2. Locked Operations topbar (I)

| # | Topbar id | Label | Fusion contents (vertical order = page order; each block collapsible) |
|---|-----------|--------|----------------------------------------------------------------------|
| 1 | `endpoints` | **Endpoint** | API Keys → Endpoint (APIs body only) → API Catalog. **Kill** current Endpoint dual strip (APIs/Catalog/Context + Protocols MCP/A2A sub-strip). MCP/A2A **leave** this page. |
| 2 | `core-mcp` | **CoreMCP** | MCP Server page only. **Rename** “MCP Server” → **CoreMCP** (OmniRoute control MCP; disambiguate from MetaMCP/future CC layers). |
| 3 | `agents` | **Agents** | CLI Agents + CLI Code **fused** (vertical collapsibles). Remove top explainer cards. Add **grid vs list** toggle. |
| 4 | `cloud-agents` | **Cloud Agents** | Single page: **Tasks → Settings → Agents** (no section titles / no tab chrome). Shrink agent cards that only deep-link to Providers. Future agents (Manus, Genspark, …) residual backlog note. |
| 5 | `a2a-acp-bridge` | **A2A/ACP Bridge** | Agent Bridge → A2A Server → ACP Agents (collapsible stack). |
| 6 | `skills` | **Skills** | Omni Skills (rename **Core Skills**) → Agent Skills (collapsible stack). |
| 7 | `integrations` | **Integrations** | Webhooks → Context Sources (from endpoint tab) → Plugins. |
| 8 | `memory` | **Memory** | Single page; **kill** apocryphal memories/engine/playground topbar; stack content. |
| 9 | `labs` | **Labs** | Playground → Translator → Search Tools → Batch(+Files) fused. See §3 Labs rules. |
| 10 | `media` | **Media** | Keep media generation surface; keep modality strip as **the** L1 for media (Image/Video/Music/TTS/Transcription) — still **one** topbar family under Media peer. |

### Out of Operations topbar

| Surface | Destination |
|---------|-------------|
| **Traffic Inspector** | **Observe** topbar peer (not Operations) |
| Testing hub launchpad | **Absorbed** into Ops Labs/Media/Integrations (plugins); `/dashboard/testing` redirects to Labs (or Ops root) |

### Primary sidebar

- Still **one** leaf: **Operations** (no 10 new leaves).  
- Active: all `/operations/*` light Operations.

---

## 3. Fusion pattern (definition of “fundir”)

For blocks a, b, c on one topbar page:

1. **One route** (new or reused).  
2. Content order **vertical**: a, then b, then c.  
3. Each major block is **collapsible** (default expanded for primary work surface; operator may set defaults per block in tasks).  
4. **Explainer cards** that open pages today → move to **page bottom**, collapsible, **default collapsed** (Translator “Your app speaks…” + “What OmniRoute does automatically” pattern — both end up collapsible at bottom; no permanent non-collapsible wall of prose at top).

Reference existing collapsible density: Translator page (improve to match law).

---

## 4. Labs rules (topbar item 9)

| Source | Treatment |
|--------|-----------|
| Playground | Chat / Compare / API / Build leave **page topbar**; move to **right sidebar** or dropdown/buttons |
| Translator | Collapsible stack section; explainers → bottom collapsed |
| Search Tools | Fuse Search / Scrape / Compare modes **inside page** (no mode topbar) |
| Batch + Batch Files | One Batch section (files as collapsible subsection) |
| Media | Own topbar peer **Media** (not inside Labs) — operator list item 10 |

---

## 5. Path matrix (II) — Operations pilot

| Topbar | Canonical path (target) | Legacy (redirect) |
|--------|-------------------------|-------------------|
| (hub root) | `/operations` or `/operations/endpoints` default | `/dashboard/operations` |
| Endpoint | `/operations/endpoints` | api-manager, endpoint, endpoint?tab=catalog |
| CoreMCP | `/operations/core-mcp` | `/dashboard/mcp` |
| Agents | `/operations/agents` | cli-agents, cli-code |
| Cloud Agents | `/operations/cloud-agents` | `/dashboard/cloud-agents` |
| A2A/ACP Bridge | `/operations/a2a-acp-bridge` | agent-bridge, a2a, acp-agents |
| Skills | `/operations/skills` | omni-skills, agent-skills |
| Integrations | `/operations/integrations` | webhooks, plugins, endpoint?tab=context-sources |
| Memory | `/operations/memory` | `/dashboard/memory` (+ tabs) |
| Labs | `/operations/labs` | playground, translator, search-tools, batch, batch/files, testing |
| Media | `/operations/media` | `/dashboard/cache/media` |
| Traffic (Observe) | `/observe/traffic` or `/dashboard/activity?…` peer — **freeze in T20** | tools/traffic-inspector |

**Note:** Until global strip of `/dashboard`, dual-write may keep `/dashboard/operations/{id}` as alias; **operator preferred** host shape is `/operations/{id}` (sidebar-name/topbar-name). Align with EPIC-19 0085 phase plan.

---

## 6. Explicit non-goals

- New primary sidebar leaves for Labs/Testing/MCP  
- MetaMCP multi-layer product  
- Full app-wide path rename outside Operations pilot (except Traffic→Observe)  
- Inventing new plugins marketplace features  
- Re-opening Dashboard/Providers chrome (EPIC-19)  

---

## 7. Child tasks (promoted `01-open/`)

| Task | Slice | Theme |
|------|-------|-------|
| **0086** | T20-A | SSoT topbar ids + `/operations/{id}` builders + redirect matrix + UI.md |
| **0087** | T20-B | Operations shell: single topbar on all `/operations/*` |
| **0088** | T20-C | Endpoint fusion (Keys + Endpoint + Catalog); kill dual strips |
| **0089** | T20-D | CoreMCP page + rename |
| **0090** | T20-E | Agents fusion (CLI Agents + CLI Code) + grid/list |
| **0091** | T20-F | Cloud Agents single-scroll |
| **0092** | T20-G | A2A/ACP Bridge stack |
| **0093** | T20-H | Skills (Core Skills → Agent Skills) |
| **0094** | T20-I | Integrations (webhooks, context sources, plugins) |
| **0095** | T20-J | Memory single page |
| **0096** | T20-K | Labs fused (playground/translator/search/batch) |
| **0097** | T20-L | Media under Ops topbar |
| **0098** | T20-M | Traffic Inspector → Observe |
| **0099** | T20-N | Retire Testing hub; palette/Ops cards |
| **0100** | T20-O | Chrome/redirect/sidebar active test gate |

**Order:** `0086 → 0087 → (0088…0097 parallel by ownership) → 0096+0097 before 0099 → 0098 anytime late → 0100 last`.  
Prefer EPIC-19 **0079/0081** chrome patterns green first.

---

## 8. Success metrics

> Gate coverage: Task **0100** / `tests/unit/ui/epic20-ops-chrome-gate-0100.test.ts` (§8 map suite). Peer collapsibles/explainers asserted in 0088–0097 peer suites.

- [x] Operations has **exactly one** internal topbar with the 10 peers above — **0100 A**  
- [x] No stacked “Endpoint sub-topbars” (APIs/Catalog + MCP/A2A strip) — **0100 A** + **0088**  
- [x] Testing content reachable only via Ops Labs/Media (or redirects) — **0100 B/D** + **0099**  
- [x] Fused pages use vertical collapsibles; explainers default collapsed at bottom — **0088–0097** peer suites  
- [x] Canonical paths `/operations/{id}` (or frozen alias) + legacy redirects — **0100 B** + **0086**  
- [x] Traffic Inspector on **Observe**, not Ops — **0100 B/C/E** + **0098**  
- [x] CoreMCP naming in UI + docs — **0100 §8** + **0089** (`OPERATIONS_TOPBAR_LABELS["core-mcp"]`)  
- [x] Anti-phantom chrome tests (Hard Rule #22) — **0100 A**  

---

## 9. Relation to EPIC-19

| EPIC-19 | EPIC-20 |
|---------|---------|
| Finish 0079/0081 single topbar patterns | Reuse pattern on Ops |
| 0085 path phase-0 | Ops is **first hub** to implement `/operations/...` |
| Observe health active (0080/0084) | Traffic peer + any Observe topbar extension |

Do **not** reopen Costs/Analytics matrix here.
