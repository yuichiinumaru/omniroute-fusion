# Nav-tree gap assessment — Observe / Analytics / Costs / Operations / Settings / Help

| Field | Value |
|-------|--------|
| Date | 2026-07-11 |
| Scope | L0 hubs **Observe, Analytics, Costs, Operations, Settings, Docs/Help** + demotions + post-3.8/fork surfaces that land in those clusters (ops/settings overlap for fusions noted only) |
| Map under test | [`docs/architecture/NAV-TREE-TARGET.md`](../../architecture/NAV-TREE-TARGET.md) (v3.8.42+, 2026-07-11) |
| Live chrome SSoT | `PRIMARY_SIDEBAR_ITEMS` in [`src/shared/constants/sidebarVisibility.ts`](../../../src/shared/constants/sidebarVisibility.ts) |
| IA rules | [`docs/guides/UI.md`](../../guides/UI.md) |
| Operator sketch (3.7) | `.agents/user/chatgpt/ccdesign.md` ~L465–601 |
| Mode | Read-only product/IA assessment — **no product code changes** |

---

## Executive summary

The **10-leaf flat rail is correctly frozen** and matches the target map’s L0 list. Observe and Analytics already have real hub shells (`PageTabBar` + query params). **Costs, Operations, Settings, and Help do not** — they are either single pages, orphan deep links, or multi-route families with no in-hub L1 chrome.

Largest practical risk after the flat-rail cut: **discovery**. `CommandPalette` only indexes `SIDEBAR_SECTIONS` (primary 10 + debug tools). Nearly every L1 deep surface in §3 of the map (memory, batch, cache, settings/* , proxy, fusions, etc.) is **reachable by URL/redirect only**, not by default chrome or palette. That is the main gap between “map complete on paper” and “operators can find the product.”

Post-3.8 / fork surfaces that **ccdesign never listed** (fusions, embedded services, compression studio, session-dedup, free-provider-rankings, quota-share, agent-bridge, traffic-inspector, diversity score) are mostly assigned under Routing/Providers or mentioned as demote — but several still lack explicit L1/L2 rows or §6 inventory rows.

---

## Evidence baseline (live)

### L0 chrome (implemented)

From `PRIMARY_SIDEBAR_ITEMS` (`sidebarVisibility.ts` ~L889–971):

| # | id | Label | Route |
|---|-----|--------|--------|
| 1 | `home` | Home | `/home` |
| 2 | `providers` | Providers | `/dashboard/providers` |
| 3 | `combos` | Routing | `/dashboard/combos` |
| 4 | `api-manager` | API Keys | `/dashboard/api-manager` |
| 5 | `activity` | Observe | `/dashboard/activity` |
| 6 | `analytics` | Analytics | `/dashboard/analytics` |
| 7 | `costs` | Costs | `/dashboard/costs` |
| 8 | `cli-code` | Operations | `/dashboard/cli-code` |
| 9 | `settings-general` | Settings | `/dashboard/settings/general` |
| 10 | `docs` | Docs | `/docs` (external) |

Debug-only section `devtools`: translator, playground, search-tools.

### Observe hub (strong)

- SSoT: `src/shared/constants/observeHub.ts` — sources: `activity | request | proxy | console | audit | mcp | a2a`.
- UI: `src/app/(dashboard)/dashboard/activity/ObserveHubClient.tsx` — `PageTabBar` + `?source=`.
- Redirect matrix live for logs*/audit*/usage → hub.

### Analytics hub (strong)

- `src/app/(dashboard)/dashboard/analytics/page.tsx` — tabs: overview, evals, search, utilization, combo-health, compression, route-trace (`?tab=`).
- Nested dual-nav routes redirect to hub (Epic 0005 S2).

### Costs / Operations / Settings (weak hubs)

| Hub | Entry page | In-page L1 shell? |
|-----|------------|-------------------|
| Costs | `costs/page.tsx` → `CostOverviewTab` only | **No** `PageTabBar`; pricing/budget/quota are sibling routes |
| Operations | `cli-code/page.tsx` → CLI tools only | **No** ops hub; map admits “Partial hub” |
| Settings | `settings/general` = storage only | **No** settings shell; each subpage is a separate route; `settings/page.tsx` only redirects legacy `?tab=` |
| Docs/Help | external `/docs` | Changelog deep; Issues external; no help hub |

Conceptual pillar item arrays (`OPERATIONS_ITEMS`, `SYSTEM_ITEMS`, etc.) still exist in `sidebarVisibility.ts` but are **not** mounted in `SIDEBAR_SECTIONS` (flat main list only). Command palette therefore cannot see them.

---

## A. Surfaces not clearly assigned in NAV-TREE-TARGET

“Not clearly assigned” = missing L0/L1/L2 row **or** only a vague §6 cluster note / demote one-liner without a home.

| Surface | Live path | Map status today |
|---------|-----------|------------------|
| **Cache (full product page)** | `/dashboard/cache` (prompt / semantic / reasoning views) | Home L1 “summary” only; hideable `cache` under Observability items — **no Analytics L1** |
| **Media playground (cache/media)** | `/dashboard/cache/media` | hideable `media` → this path; map L1 “Media providers” points at `/dashboard/media-providers/*` only — **collision + gap** |
| **Compression live cockpit** | `/dashboard/compression/live` | Studio is L1 under Routing; **live not listed** |
| **Relay proxies** | `/dashboard/relay` | **Absent** from §3 and §6 |
| **Onboarding wizard** | `/dashboard/onboarding` (gate from `/home` when `!setupComplete`) | **Absent** |
| **Free provider rankings** | `/dashboard/free-provider-rankings` | Costs demote policy only; **no L1/L2 home** |
| **1proxy free-pool** | `/dashboard/system/1proxy` → `proxy?tab=free-pool` | Covered only as generic “Network / Proxy” |
| **MITM proxy route** | `/dashboard/system/mitm-proxy` → **Agent Bridge** after banner | Map still implies Network under Settings; **re-home not documented** (live re-home is Ops → Agent Bridge) |
| **Settings pricing route** | `/dashboard/settings/pricing` → costs/pricing | Redirect exists; **not called out** in Settings table |
| **Access-tokens dual membership** | Settings route, map L0·4 API Keys L1 | Assigned, but Settings residual table **omits** it (intentional re-home — needs consistency note) |
| **Diversity score** | `analytics/components/DiversityScoreCard.tsx` on overview | **Not listed** (L2 card) |
| **Compression request log panel** | `logs/CompressionLogTab.tsx` | **Orphan component** (no imports elsewhere); not an Observe source |
| **Auto-routing analytics tab** | `analytics/AutoRoutingAnalyticsTab.tsx` | **Orphan component** (not wired into analytics `page.tsx`) |
| **Gamification admin** | `/dashboard/gamification/admin` | §6 demote list only; no “operator admin under Settings?” decision |
| **Api key usage limits card** | on Costs overview + api-manager | Economics vs credentials dual surface — **not resolved in map** |
| **Issues (GitHub)** | hideable `issues` external URL | Help L1 in map; **not in PRIMARY** (ok) but Docs L0 is external-only — **no in-app Help hub** |
| **Session-dedup (and other engines)** | `/dashboard/context/session-dedup` etc. | Named in Routing L2 engines list — **ok** for this assessment; ensure §6 explicitly lists `session-dedup` (see §F) |
| **Quota vs limits** | `limits` → `quota` | Redirect ok; ccdesign “limits & quotas” naming not reconciled with Costs L1 “Quota” |
| **Traffic inspector vs Route Trace vs Observe request logs** | three investigate surfaces | Map places inspector under Ops, route-trace under Analytics, request under Observe — **intent split not written** |
| **Memory / skills settings** | `settings/ai` embeds MemorySkillsTab, VisionBridge, etc. | Map says “re-home over time” — **no target L1 owner** |
| **Cliproxy settings** | Settings Advanced + Providers services | Dual home undocumented |
| **Fusion ops/settings overlap** | Fusions under Routing; no Settings entry | **Correct default**; note only: resilience/fallback for fusion should not create a second Settings leaf |

---

## B. Suggested L0 / L1 / L2 placement

Legend: **L0** sidebar · **L1** hub tab · **L2** collapsible / card / drawer.

### Observe (`activity`)

| Item | Placement | Note |
|------|-----------|------|
| Activity feed | L1 `source=activity` | Live |
| Request logs | L1 `source=request` | Live |
| Outbound / proxy logs | L1 `source=proxy` | Live |
| Console | L1 `source=console` | Live — keep as Investigate, not DevTools |
| Audit / compliance | L1 `source=audit` | Live |
| MCP audit | L1 `source=mcp` | Live |
| A2A audit | L1 `source=a2a` | Live |
| Entity dossier / request detail | L2 drawer | Map “Partial”; reuse traffic-inspector patterns carefully (see naming) |
| Compression event log (if revived) | L2 filter under `request` or L1 `source=compression` | Prefer **filter**, not 8th peer source, unless volume justifies |
| Traffic inspector | **Not** Observe L1 by default | Keep Ops L1; deep-link *into* Observe with `?source=request&id=` |

### Analytics

| Item | Placement | Note |
|------|-----------|------|
| Overview (+ DiversityScore) | L1 overview + L2 card | Document Diversity as L2 |
| Evals / Search / Utilization / Combo Health / Compression / Route Trace | L1 `?tab=` | Live |
| Provider stats | L1 deep or tab | Map already L1 deep |
| Runtime (cooldowns, live state) | L1 deep under Analytics **or** Home health L2 | Prefer Analytics L1 “Runtime” when hub shell grows |
| Cache **metrics** | L1 “Cache” under Analytics | Full `/dashboard/cache` is more Analytics than Home |
| Cache **summary KPI** | Home L1 pulse only | Avoid dual full UIs |
| Auto-routing analytics (orphan) | L1 under Analytics or fold into overview | Wire or archive |
| Health matrix | Prefer **Home** L1 (map) with link out; dense tables L2 | Avoid third peer “Health” leaf |

### Costs

| Item | Placement | Note |
|------|-----------|------|
| Overview / explorer | L1 default on `/dashboard/costs` | Add `PageTabBar` |
| Pricing | L1 | Live deep `/costs/pricing` |
| Budget | L1 | Live deep `/costs/budget` |
| Free tiers | L1 | Live |
| Quota | L1 | Live `/quota` |
| Quota share | L1 | Live `/costs/quota-share` |
| Free provider rankings | L2 under Free tiers **or** demote-hide | Map policy: demote — make explicit L2 |
| API key usage limits | L2 on Costs **and** deep link from API Keys | Single editor; two entry points ok if one SSoT |

### Operations (entry today: `cli-code`)

Target: true ops hub shell (map §5 / §8) on `/dashboard/cli-code` or `/dashboard/operations`.

| Item | Placement | Note |
|------|-----------|------|
| CLI tools / Clients | L1 default | Live page content |
| CLI agents | L1 | Deep today |
| ACP agents | L1 | Deep |
| Cloud agents | L1 | Deep |
| Agent bridge (incl. MITM re-home) | L1 | Document mitm-proxy redirect here |
| Traffic inspector | L1 | Deep |
| Batch + files | L1 (+ L2 files) | Deep |
| Memory | L1 | Deep |
| Omni Skills | L1 | Deep |
| Agent Skills | L1 | Deep |
| Plugins | L1 | Deep |
| Relay proxies | L1 “Relay” or L2 under Agent Bridge / Network | **Assign** — currently orphan |
| Gamification leaderboard/profile/tokens | Demote — optional L2 under Ops “Community” or remove from discoverable nav | Policy already |
| Gamification admin | Settings L2 “Advanced / Admin” or demote-only | Not L0 |

### Settings (residual system)

| Item | Placement | Note |
|------|-----------|------|
| General / Data & storage | L1 default | Live |
| Appearance | L1 | Live |
| AI (until re-homed) | L1 residual | Split over time → Memory/Skills/Routing |
| Resilience | L1 | Live — circuit breaker / lockout policy |
| Advanced (debug mode, payload rules, request limits, cliproxy) | L1 | Cliproxy → link to Providers → Embedded services |
| Feature flags | L1 (future Governance) | Live |
| Sidebar prefs | L1 | Live |
| Network / Proxy (+ free-pool tabs) | L1 | Live `system/proxy` with internal L2 tabs |
| Access tokens | **API Keys L1** (not Settings L1 long-term) | Map already |
| Security / control | **API Keys L1** (map) *or* Settings L1 short-term | Pick one primary |
| Routing settings | **Routing L1** (map) | Keep deep route; avoid Settings peer |
| Pricing settings route | Redirect only → Costs | Already |

### Docs / Help

| Item | Placement | Note |
|------|-----------|------|
| Docs | L0 external | Live |
| Changelog | L1 deep `/dashboard/changelog` | Live |
| Issues | L1 external GitHub | hideable exists |
| In-context `?` help | L2 pattern | Map Partial |
| Onboarding | **Out-of-rail first-run** (not L0); Help L1 “Get started” optional after complete | Assign as setup flow |

### Debug-only (keep)

| Item | Placement |
|------|-----------|
| Playground | Debug section |
| Translator | Debug |
| Search tools | Debug |
| Compression live cockpit | Prefer Routing L2 “Studio live” **or** debug if experimental |

---

## C. Conflicts / naming collisions

| Collision | Why it hurts | Recommendation |
|-----------|--------------|----------------|
| **Clients** (ccdesign) vs **Operations** (live L0) vs **API Keys** | Operators expect “Clients” = CLI tools *or* credentials | Keep L0 **Operations** for runtime clients/agents; keep **API Keys** for credentials into OmniRoute. Optional subtitle: “CLI · agents · inspector”. Do **not** rename API Keys to Clients. |
| **API Keys** vs **Access tokens** vs **Security** | Three authz surfaces | API Keys hub L1 tabs: Keys · Access tokens · Security/control. Settings drops long-term peers. |
| **Observe Console** vs **Operations CLI** | Both “terminal-ish” | Labels: Observe “Console logs” vs Ops “CLI tools”. |
| **Media** (`cache/media`) vs **Media providers** | Registry vs playground | Providers L1 = media-providers registry; Ops or Debug L1/L2 = media playground; fix hideable `media` href narrative in map. |
| **Network / Proxy** vs **1proxy** vs **Relay** vs **Agent Bridge / MITM** | Four “proxy” words | Settings L1 **Outbound network**; Ops L1 **Agent Bridge** (MITM/client intercept); Ops L1 or L2 **Relay** (serverless egress helpers). Never three L0s. |
| **Route Trace** (Analytics) vs **Traffic Inspector** (Ops) vs **Request logs** (Observe) | Triple investigate | Intent: Observe = historical stream; Analytics route-trace = explainability; Inspector = live capture/debug tool. Document in map §5. |
| **Health** (Home) vs **Combo Health** (Analytics) vs **Runtime** | Overlapping “is it up?” | Home = fleet pulse; Analytics combo-health = routing quality; Runtime = lockouts/cooldowns. |
| **Quota** (Costs) vs **Governance quota** (old pillar arrays) | Historic dual | Single home: Costs L1. |
| **Omni Skills** vs **Agent Skills** vs **Plugins** vs MCP tools | Four “extension” models | Ops L1 three cards with distinct subtitles (already in hideable fallbacks). MCP server stays Providers → Exposures. |
| **Docs** external vs in-app Changelog | Help split | Either in-app Help hub with tabs Docs/Changelog/Issues, or keep Docs external and surface Changelog from Home/Help only. |
| **Fusions** vs **Combos** vs **Routing** | Product naming | L0 stays Routing; L1 Combos + Fusions (fork-first). No leaf #11. |
| **Settings of X** still living under Settings | ccdesign anti-pattern | Routing settings, memory, compression, cliproxy should deep-link from hub X with Settings residual only. |

---

## D. Debug-only vs promote

### Stay debug-only (or non-L0)

| Surface | Rationale |
|---------|-----------|
| Playground | Synthetic traffic; power-user |
| Translator | Format lab |
| Search tools | Scrape/fetch lab |
| Compression live cockpit | High-density engineering view; Studio is enough for most |
| Orphan AutoRoutingAnalyticsTab / CompressionLogTab until wired | Do not promote dead code |
| Feature-flag grid | Settings L1 is enough; not primary rail |
| Gamification* | Demote; community chrome |

### Promote (to hub L1 / discoverable, not new L0)

| Surface | Promote to |
|---------|------------|
| Cache full page | Analytics L1 |
| Operations siblings (agents, bridge, inspector, batch, memory, skills, plugins) | Operations hub L1 tabs |
| Costs siblings (pricing, budget, free-tiers, quota, quota-share) | Costs hub L1 tabs |
| Settings family | Settings hub L1 tabs |
| Free provider rankings | Costs L2 under free-tiers (or hideable-only) |
| Relay | Operations L1/L2 |
| MITM | Already redirected → Agent Bridge; map must say so |
| Changelog | Docs/Help L1 (discoverable from Docs hub if Docs becomes shell) |
| Onboarding | First-run flow; post-complete link under Help |

### Explicitly do **not** promote to L0

- Fusions, compression engines, free-provider-rankings, leaderboard, profile, tokens, individual log types, evals nested routes, proxy free-pool, media playground.

---

## E. Top 10 recommendations (impact × effort)

Rough scale: impact H/M/L · effort S/M/L (S ≤ ~1–2 PR days for shell/wiring; M multi-page; L redesign).

| # | Recommendation | Impact | Effort | Why |
|---|----------------|--------|--------|-----|
| 1 | **Build Operations hub shell** (`PageTabBar` on `cli-code` or `/dashboard/operations`) with L1: CLI · Agents · ACP · Cloud · Bridge · Inspector · Batch · Memory · Skills · Plugins | H | M | Map’s largest “Partial”; currently CLI-only entry mislabeled Operations |
| 2 | **Build Costs hub shell** with L1: Overview · Pricing · Budget · Free tiers · Quota · Quota share (+ L2 rankings) | H | S–M | Routes exist; missing chrome is the whole problem |
| 3 | **Build Settings hub shell** with L1 tabs for existing settings/* + Network; re-home Access tokens/Security copy to API Keys over time | H | M | Residual dump is still many deep pages with zero discovery |
| 4 | **Expand Command Palette inventory** beyond flat `SIDEBAR_SECTIONS` — index hideable deep links / map L1 destinations (or a dedicated palette registry) | H | M | Flat rail made palette **lose** memory, cache, fusions, settings, etc. |
| 5 | **Assign orphans in map + chrome**: relay, onboarding, free-provider-rankings, cache/media, compression/live, mitm→bridge | M–H | S | Docs truth + redirects; little UI |
| 6 | **Cache → Analytics L1** (Home keeps KPI pulse only) | M | S | Matches operator “investigate efficiency” intent |
| 7 | **Document investigate triad** (Observe stream vs Route Trace vs Traffic Inspector) in NAV-TREE-TARGET §5 | M | S | Prevents wrong consolidations / duplicate leaves |
| 8 | **API Keys hub L1** for Access tokens + Security (deep links already) | M | S–M | Clears “Clients vs Keys” confusion from ccdesign |
| 9 | **Help hub mini-shell**: Docs entry + Changelog + Issues (+ optional Get started) without growing L0 | M | S | L0 Docs is external-only today |
| 10 | **Wire or archive** `AutoRoutingAnalyticsTab` + `CompressionLogTab`; freeze dual-nav redirects matrix in map appendix | M | S | Dead UI is IA noise; redirects already good |

Honorable mentions (lower priority for *this* cluster): Home cockpit merge of health/costs pulse; DiversityScore L2 naming; fusion remains Routing-only (peer agent owns routing deep dive).

---

## F. Exists in repo but missing from map §6 inventory

§6 is a **cluster summary**, not a full route dump — still, these live surfaces have **no clear row** (or only an incomplete cluster mention) and should be added in the next map revision:

| Path / id | Suggested §6 cluster / home |
|-----------|------------------------------|
| `/dashboard/cache` | Analytics (full) + Home pulse |
| `/dashboard/cache/media` | Ops/Debug media playground **or** Providers note “not media-providers” |
| `/dashboard/media-providers/**` | Providers (already) — ensure distinct from cache/media |
| `/dashboard/compression/live` | Routing L2 under studio |
| `/dashboard/compression/studio` | Routing (already in §3; ensure §6 compression/* covers studio+live) |
| `/dashboard/context/session-dedup` | Routing engines L2 (name explicitly; §3 list has it, §6 says `context/*` only) |
| `/dashboard/relay` | Operations or Settings/Network — **pick one** |
| `/dashboard/onboarding` | Setup / Help (first-run) |
| `/dashboard/free-provider-rankings` | Costs demote L2 |
| `/dashboard/system/1proxy` | Settings Network (redirect) |
| `/dashboard/system/mitm-proxy` | **Redirect → Operations Agent Bridge** (update map; do not list as Settings Network peer) |
| `/dashboard/settings/pricing` | Redirect → Costs pricing |
| `/dashboard/gamification/admin` | Demote / admin residual |
| `/dashboard/leaderboard`, `/profile`, `/tokens` | Demote (mentioned; keep) |
| `DiversityScoreCard` | Analytics overview L2 |
| `AutoRoutingAnalyticsTab` | Analytics or archive |
| `CompressionLogTab` | Observe filter or archive |
| Providers embedded services (`providers/services`, cliproxy/9router) | Providers L1 (in §3; §6 “services” ok — keep) |
| Fusions | Routing (in §3/§4; §6 already) |
| Quota share | Costs (in §3; §6 ok) |
| Agent bridge + traffic inspector | Ops (in §3; §6 ok) |

### Redirects that are fine but should stay in a frozen matrix appendix

| From | To |
|------|-----|
| `/dashboard` | `/home` |
| `/dashboard/usage` | Observe `request` |
| `/dashboard/logs*`, `/dashboard/audit*` | Observe sources |
| `/dashboard/limits` | `/dashboard/quota` |
| `/dashboard/auto-combo` | combos intelligent filter |
| `/dashboard/api-endpoints` | endpoint catalog |
| `/dashboard/analytics/{tab}` nested | `analytics?tab=` |
| `/dashboard/settings/pricing` | costs/pricing |
| `/dashboard/system/1proxy` | proxy free-pool |
| `/dashboard/system/mitm-proxy` | tools/agent-bridge |
| `/dashboard/compression` root | context/caveman (legacy) |

---

## Cluster deep-dives

### Observe

**Strengths:** Best-aligned hub in the product. `observeHub.ts` + redirects + `ObserveHubClient` match map invariants (one stream + filters).

**Gaps:**

1. No written contract for how **Traffic Inspector** and **Route Trace** hand off into `?source=request&id=`.
2. Compression logs panel is dead code — either integrate as filter or archive under `.archive/`.
3. Console source is easy to confuse with Ops CLI; copy should stay “Console logs”.

### Analytics

**Strengths:** Real L1 tabs; dual-nav collapse done.

**Gaps:**

1. Cache, provider-stats, runtime remain **off-hub** deep pages without Analytics `PageTabBar` entries.
2. Diversity score and (orphaned) auto-routing analytics not in map.
3. Map lists “Route Trace” correctly (`route-trace`); keep alias `route-explain` as redirect only (already).

### Costs

**Strengths:** Correct L0; rich overview explorer; pricing/budget/quota-share routes exist.

**Gaps:**

1. No hub tabs — operator lands on overview and must know sibling URLs.
2. Free-provider-rankings demoted but still a first-class page with hideable id — easy to re-grow as leaf.
3. Economics widgets on overview vs API Keys usage limits — dual entry needs SSoT note.

### Operations

**Strengths:** Hideable inventory + conceptual groups already model the full ops surface (tools, batch, agentic, gamification).

**Gaps:**

1. **L0 label lies:** href is CLI tools only.
2. MITM live behavior re-homes to Agent Bridge; map still smells like Settings/Network.
3. Relay unassigned.
4. Gamification still in code groups — ensure presets/docs never resurrect as default peers.
5. Memory/skills **config** still in Settings AI — ccdesign wanted config next to the hub.

### Settings

**Strengths:** Clear residual destination; security/tokens partially re-homed in map toward API Keys; routing settings toward Routing.

**Gaps:**

1. No settings chrome — ten-ish sibling pages.
2. AI page is a grab-bag (thinking budget, vision bridge, system prompt, memory/skills, models.dev sync, fast tiers).
3. Advanced holds Cliproxy — overlaps Embedded Services.
4. Network proxy has internal tabs (good L2) but discovery depends on knowing `/dashboard/system/proxy`.

### Help / Docs

**Strengths:** Changelog page exists; Issues URL in hideables.

**Gaps:**

1. L0 Docs is `external: true` to `/docs` — Changelog/Issues not reachable from that leaf.
2. Onboarding is critical path for `/home` but absent from map.
3. ccdesign “`?` replaces noob walls” still Partial.

### Demotions

| Target | Status | Action |
|--------|--------|--------|
| Gamification peers | Policy yes; pages live | Keep routes; no L0; optional archive later |
| Free provider rankings as product peer | Policy yes | L2 under free-tiers or hide by default |
| Noob quickstart walls | Policy yes | Docs/help `?` |
| Log leaf forest | **Done** (Observe) | Guard against new `source=` without map update |
| Engine-per-leaf compression | **Done** (engines off rail) | Guard |

---

## Post-3.8 / fork features ccdesign never listed

| Feature | Live | Map assignment | Ops/Settings note |
|---------|------|----------------|-------------------|
| **Fusions** | `/dashboard/fusions` | Routing L1 (fork-first §4) | Do not Settings-ize; resilience stays global under Settings/Routing hubs |
| **Embedded services** (cliproxy / 9router) | `providers/services` | Providers L1 | Cliproxy **settings** still under Settings Advanced — re-home link |
| **Compression studio** | `compression/studio` | Routing L1 | Live cockpit sibling unassigned |
| **Session-dedup + engine family** | `context/*` | Routing L2 engines | Never L0 |
| **Free provider rankings** | page live | Demote only | Needs L2 home |
| **Quota share** | costs/quota-share | Costs L1 | Good |
| **Agent bridge** | tools/agent-bridge | Ops L1 | Absorbs MITM |
| **Traffic inspector** | tools/traffic-inspector | Ops L1 | Investigate triad |
| **Diversity score** | analytics overview card | Missing | L2 |
| **Observe hub** | activity | Live | Post-ccdesign Epic 0005 win |
| **Flat 10-rail** | PRIMARY_SIDEBAR_ITEMS | Live | Supersedes ccdesign accordion-ish sketch |

---

## Implementation checklist (for map owners / next wave)

1. Amend `NAV-TREE-TARGET.md` §3 Costs/Ops/Settings/Help + §6 with rows from **§F**.
2. Wire hub shells (Ops, Costs, Settings) with existing `PageTabBar` (Task 0030 primitive).
3. Palette registry for deep L1 destinations (do not re-expand default sidebar).
4. Update mitm-proxy / 1proxy / settings-pricing / onboarding in redirect matrix appendix.
5. Decide media: registry vs playground paths and fix hideable `media` story.
6. Archive or wire orphan analytics/log tabs.
7. Re-run this assessment after hub shells land (map §8 item 4).

---

## Sources (absolute paths)

- `/home/sephiroth/working/ganthritor/omniroute-2/docs/architecture/NAV-TREE-TARGET.md`
- `/home/sephiroth/working/ganthritor/omniroute-2/docs/guides/UI.md`
- `/home/sephiroth/working/ganthritor/omniroute-2/src/shared/constants/sidebarVisibility.ts`
- `/home/sephiroth/working/ganthritor/omniroute-2/src/shared/constants/observeHub.ts`
- `/home/sephiroth/working/ganthritor/omniroute-2/src/app/(dashboard)/dashboard/**/page.tsx` (inventory via tree)
- `/home/sephiroth/working/ganthritor/omniroute-2/src/app/(dashboard)/dashboard/activity/ObserveHubClient.tsx`
- `/home/sephiroth/working/ganthritor/omniroute-2/src/app/(dashboard)/dashboard/analytics/page.tsx`
- `/home/sephiroth/working/ganthritor/omniroute-2/src/app/(dashboard)/dashboard/costs/page.tsx`
- `/home/sephiroth/working/ganthritor/omniroute-2/src/app/(dashboard)/dashboard/cli-code/page.tsx`
- `/home/sephiroth/working/ganthritor/omniroute-2/src/app/(dashboard)/dashboard/settings/**`
- `/home/sephiroth/working/ganthritor/omniroute-2/src/shared/components/CommandPalette.tsx`
- `/home/sephiroth/working/ganthritor/omniroute-2/.agents/user/chatgpt/ccdesign.md` (~L465–601)

---

## Change log

| Date | Note |
|------|------|
| 2026-07-11 | Initial ops/observe/settings-focused gap report against NAV-TREE-TARGET v3.8.42+ |
