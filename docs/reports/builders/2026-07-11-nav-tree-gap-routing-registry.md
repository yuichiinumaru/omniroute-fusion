# Nav-tree gap assessment — Routing · Registry · Fusions (post-3.8)

| Field | Value |
|-------|--------|
| Date | 2026-07-11 |
| Scope | Routing + Registry + Fusions + post-3.8 compression/routing surfaces |
| Mode | Read-only IA assessment (no product code changes) |
| Target map | [`docs/architecture/NAV-TREE-TARGET.md`](../../architecture/NAV-TREE-TARGET.md) §§3–6 |
| Live chrome SSoT | `src/shared/constants/sidebarVisibility.ts` → `PRIMARY_SIDEBAR_ITEMS` |
| UI rules | [`docs/guides/UI.md`](../../guides/UI.md) |
| Fusion contract | [`docs/architecture/FUSION.md`](../../architecture/FUSION.md) |
| Intent only (not code truth) | `.agents/user/chatgpt/ccdesign.md` ~L465–601 |

---

## Executive summary

The **flat 10-hub L0 rail is correct and live**. Routing is labeled correctly (`combos` → “Routing”), and Fusions are correctly **not** a permanent L0 peer. The main failure is **hub shell readiness**: Providers and Routing still ship as leaf pages with no shared `PageTabBar` L1, so high-value surfaces (Fusions, Combo Studio, Combo Playground, compression hub, exposures) are **deep-link only** and invisible from the hub entry.

`PageTabBar` is wired only on:

- `/dashboard/analytics` (`src/app/(dashboard)/dashboard/analytics/page.tsx`)
- `/dashboard/activity` (`src/app/(dashboard)/dashboard/activity/ObserveHubClient.tsx`)

Routing / Providers / Operations / Settings / Home still lack hub shells (called out in NAV-TREE §5 “Still missing” and §8 checklist item 1).

**Fork-first Fusion** UI + runtime exist and map under Routing L1 on paper; discovery and cross-links do not yet enforce that map.

---

## Evidence base (paths)

| Source | Role |
|--------|------|
| `docs/architecture/NAV-TREE-TARGET.md` | Versioned L0/L1/L2 target |
| `src/shared/constants/sidebarVisibility.ts` | `PRIMARY_SIDEBAR_ITEMS`, hideables, conceptual `ROUTING_ITEMS` / `REGISTRY_ITEMS` |
| `src/app/(dashboard)/dashboard/**/page.tsx` | Live routes (~100+; map intentionally not a full dump) |
| `src/app/(dashboard)/dashboard/fusions/**` | Fusion list + editor |
| `src/app/(dashboard)/dashboard/combos/**` | Combos list/builder, live studio, playground |
| `src/app/(dashboard)/dashboard/context/**` | Compression hub + engines |
| `src/app/(dashboard)/dashboard/compression/**` | Studio + live cockpit |
| `open-sse/services/fusion.ts`, `combo.ts` | Runtime strategies `fusion` / `conditional-fusion` |

### Live L0 (implemented)

From `PRIMARY_SIDEBAR_ITEMS` (order = product priority):

1. Home → `/home`
2. Providers → `/dashboard/providers`
3. **Routing** (`id: combos`) → `/dashboard/combos` — subtitle “Combos · fusions · compression”
4. API Keys → `/dashboard/api-manager`
5. Observe → `/dashboard/activity`
6. Analytics → `/dashboard/analytics`
7. Costs → `/dashboard/costs`
8. Operations → `/dashboard/cli-code`
9. Settings → `/dashboard/settings/general`
10. Docs → `/docs`

Hideable ids still include `fusions`, `combos-live`, all `context-*` engines, `compression-studio`, exposures (`mcp`, `a2a`, `webhooks`, `endpoints`), etc. — deep-link inventory, **not** default rail leaves.

---

## A. Surfaces in codebase NOT clearly assigned in NAV-TREE §§3–6

Severity:

- **must map** — operator will hit or fork depends on it; map incomplete or contradictory
- **nice-to-have** — real surface; assign L1/L2/redirect when hubbing
- **demote** — keep route/hideable; out of discovery chrome

### A1. Routing / Fusions / Compression cluster

| Route / cluster | Evidence | In map today? | Severity |
|-----------------|----------|---------------|----------|
| `/dashboard/fusions`, `/new`, `/[id]` | `fusions/page.tsx`, `FusionEditorClient.tsx` | Yes — Routing L1 “Fusions” (§3 L0·3, §4) | Assigned on paper; **discovery gap** (no hub tab) |
| `/dashboard/combos`, `/[id]` | `combos/page.tsx` | Yes — Combos L1 | Live hub entry; no L1 shell |
| `/dashboard/combos/live` | `combos/live/page.tsx` + `ComboLiveStudio` | Yes — Combo Studio / Live L1 | Deep only; not linked from combos list |
| `/dashboard/combos/playground` | `combos/playground/*` + `POST /api/playground/simulate-route` | Yes — Combo playground L1 | Deep only; **orphaned from hub** |
| `/dashboard/auto-combo` | redirect → `?filter=intelligent` | Redirects (§6) | OK |
| Intelligent / auto-combo filters | `AutoComboCatalog`, `IntelligentComboPanel`, `?filter=intelligent` | L2 “Auto-combo” under Combos | Live L2; fine |
| `/dashboard/settings/routing` | Combo defaults, aliases, fallback chains, degradation | Routing L1 “Global routing settings” | Dual gravity: also Settings residual — **must clarify** in hub tabs |
| `/dashboard/settings/resilience` | Circuit/cooldown/lockout UI | Settings L1 only | **must map** as routing-adjacent L2 or Settings L1 with Routing deep-link |
| `/dashboard/context/settings` | Compression hub SSoT | Routing L1 Compression hub | Deep; no Routing tab |
| `/dashboard/context/combos` | Compression combos | Routing L1 | Deep |
| `/dashboard/context/{caveman,rtk,headroom,session-dedup,ccr,llmlingua,lite,aggressive,ultra}` | Engine pages | L2 engines (never L0) | Correct tier; discovery only via settings panel |
| `/dashboard/context` bare | redirect matrix in `context/page.tsx` | Implicit | OK |
| `/dashboard/compression` | redirect → caveman | Redirects | OK (legacy) |
| `/dashboard/compression/studio` | Studio cockpit | Routing L1 | Deep |
| **`/dashboard/compression/live`** | `compression/live/page.tsx` reuses `CompressionCockpit` | **Not named** (only studio) | **must map** (L1 alias or L2 under studio) |
| **`/dashboard/relay`** | `relay/RelayProxyClient.tsx` + `/api/relay/tokens` | **Absent** from §§3–6 | **must map** (edge expose / tokens ↔ combo) |
| Route Trace | Analytics `?tab=route-trace` | Analytics L1 | Assigned; routing **investigate** path, not configure |
| Combo Control Center quick links | `ComboControlCenterClient.tsx` → `/dashboard/playground` (debug chat), **not** combos playground | N/A | **must fix** when hubbing (wrong adjacent surface) |

### A2. Registry / Providers cluster

| Route / cluster | Evidence | In map today? | Severity |
|-----------------|----------|---------------|----------|
| `/dashboard/providers`, `/new`, `/[id]/**` | Manage + detail | Providers L1 Manage | Live; no hub tabs |
| `/dashboard/providers/services` | cliproxy / 9router tabs | Providers L1 Embedded services | Deep; has own sub-tabs, not Providers `PageTabBar` |
| **`/dashboard/media-providers/*`** | kinds: embedding, image, tts, … | Providers L1 “Media providers” | Deep |
| **`/dashboard/cache/media`** | `cache/media/MediaPageClient` (generation modalities) | Sidebar conceptual `REGISTRY_ITEMS.media` → **this path**; map names **media-providers** | **must map** dual surface / merge intent |
| `/dashboard/endpoint` | Connect SSoT; mcp/a2a tabs redirect | Providers L1 Exposures | Live deep |
| `/dashboard/api-endpoints` | redirect → endpoint?tab=catalog | Redirects | OK |
| `/dashboard/mcp`, `/dashboard/a2a` | Single protocol homes | Providers L1 | Deep |
| `/dashboard/webhooks` | Webhooks | Providers L1 | Deep |
| Provider detail playground panels | reuses media-providers cards | L2 under Manage | nice-to-have note |
| `/dashboard/onboarding` | First-run from login/home | **Not in §§3–6** | **nice-to-have** (entry flow, not hub) |

### A3. Routing-adjacent observe / analytics (post-3.8)

| Route / cluster | In map? | Severity |
|-----------------|---------|----------|
| Analytics combo-health / compression / route-trace | Yes under Analytics L1 | Assigned |
| `/dashboard/provider-stats`, `/dashboard/runtime` | Analytics L1 deep | Assigned |
| `/dashboard/health` | Home L1 (target) / deep | Partial |
| `/dashboard/cache` (prompt/semantic/reasoning) | Home L1 summary deep | Assigned as pulse; full page still orphan of hub chrome |
| Fusion-specific analytics filters | **None** in analytics tabs | **nice-to-have** (L2 filter on combo-health / route-trace) |

### A4. Network / system (touches registry traffic)

| Route / cluster | In map? | Severity |
|-----------------|---------|----------|
| `/dashboard/system/proxy` | Settings L1 Network | Assigned |
| `/dashboard/system/1proxy` | redirect → proxy?tab=free-pool | Redirect OK; name 1proxy only in hideables |
| `/dashboard/system/mitm-proxy` | client redirect → agent-bridge | **demote** as dead leaf; map as redirect only |
| Relay deploy modal | `DeployRelayModal` shared component | nice-to-have under Operations or Providers expose |

### A5. Explicit demotions (already policy-aligned)

| Cluster | Map § | Severity |
|---------|-------|----------|
| `leaderboard`, `profile`, `tokens`, `gamification/admin` | Demote | demote |
| Free provider rankings | Costs demote / L2 | demote |
| Debug: playground, translator, search-tools | Debug-only | demote from L0 (already) |
| Compression engines as peer leaves | Never L0 | demote from rail (done) |

---

## B. Suggested L0 / L1 / L2 placement (gaps)

### Routing hub (`L0 · combos` → `/dashboard/combos`)

| Gap surface | Level | Placement |
|-------------|-------|-----------|
| Combos list + builder | L1 default | `Combos` → stay on `/dashboard/combos` |
| Fusions list/editor | L1 | `Fusions` → navigate `/dashboard/fusions` (or embed list under same shell) |
| Combo Studio (live) | L1 | `Studio` → `/dashboard/combos/live` |
| Combo playground (simulate-route) | L1 | `Simulate` / `Playground` → `/dashboard/combos/playground` |
| Compression hub | L1 | `Compression` → `/dashboard/context/settings` |
| Compression combos | L2 under Compression | `/dashboard/context/combos` |
| Compression studio | L2 under Compression | `/dashboard/compression/studio` |
| Compression live | L2 under Compression (or alias of studio) | `/dashboard/compression/live` |
| Engine pages | L2 cards/links from Compression settings | `/dashboard/context/*` |
| Global routing settings | L1 | `Policies` / `Defaults` → `/dashboard/settings/routing` |
| Resilience (breakers / cooldown / lockout) | L2 under Policies **or** Settings L1 with Routing deep-link | `/dashboard/settings/resilience` |
| Auto-combo / intelligent | L2 filter/panel on Combos | `?filter=intelligent` (already) |
| **Relay tokens** | L1 **or** L2 under Policies/Expose | `/dashboard/relay` → prefer **Routing L2 “Edge / Relay”** or **Providers L1 Exposures** (see §C adjacent) |

**Recommendation for relay:** tokens bind to combos/models → **Routing L2** first; deploy chrome can also surface from Providers/Operations via `DeployRelayModal`.

### Providers hub (`L0 · providers`)

| Gap surface | Level | Placement |
|-------------|-------|-----------|
| Manage list + detail | L1 default | `/dashboard/providers` |
| Embedded services | L1 | `/dashboard/providers/services` |
| Media (unified) | L1 | **Pick one canonical:** `/dashboard/media-providers` (kind catalog) **with** generation tools either nested or redirect from `/dashboard/cache/media` |
| Exposures / Connect | L1 | `/dashboard/endpoint` |
| MCP control plane | L1 | `/dashboard/mcp` |
| A2A | L1 | `/dashboard/a2a` |
| Webhooks | L1 | `/dashboard/webhooks` |
| Per-provider OAuth/API/web flags | L2 | on Manage cards |
| Onboarding | Special entry | keep out of hub tabs; docs/Home CTA only |

### Cross-hub (routing investigate)

| Surface | Level | Hub |
|---------|-------|-----|
| Route Trace / explainability | L1 | Analytics (already) — link from Routing Simulate results |
| Combo Health | L1 | Analytics — add “Open in Analytics” from Combos/Fusions |
| Observe request stream | L1 sources | Observe — link from Combo Control Center (fix broken `/dashboard/logs` if still used) |

### Settings residual

Keep Appearance / Feature flags / Sidebar prefs / Advanced. Prefer **not** keeping Routing + Resilience only under Settings once Routing hub has Policies tab — Settings can redirect or show a short “moved to Routing” card (ccdesign “settings of X lives under X”).

---

## C. Fusions specifically

### C1. Is Fusion correctly only under Routing L1?

**Yes — map and chrome intent are correct.**

| Check | Result |
|-------|--------|
| Permanent L0 peer for Fusions? | **No** — not in `PRIMARY_SIDEBAR_ITEMS` |
| Documented home | NAV-TREE §4: Routing → L1 “Fusions”; primary id remains `combos` |
| Runtime domain | `strategy: fusion \| conditional-fusion` in combo pipeline (`docs/architecture/FUSION.md`, `open-sse/services/combo.ts`) |
| Hideable id `fusions` | Present for prefs/deep links only (`sidebarVisibility.ts`) |
| Data model | Reuses `combos` table / `/api/combos` — not a separate product table |

**Do not** reintroduce a permanent sidebar leaf for Fusions (map + UI.md invariant 1).

### C2. What is live in Fusion UI (L2 completeness)

From `FusionEditorClient.tsx` / `fusionEditorTypes.ts`:

| Concern | UI status |
|---------|-----------|
| Panels (models + combo-ref) | Live |
| Judge (top-level) | Live |
| **Acting** unit (Epic 0004) | Live (`data-testid="fusion-acting"`) |
| Triggers (always / tool-call / text-match) | Live |
| Fallback strategy | Live (non-fusion strategies) |
| Fusion tuning (minPanel, straggler, hard timeout) | Live |

Map §3 L2 “Fusion panels / judge / acting / triggers / tuning” matches the editor.

### C3. Missing fusion-adjacent surfaces

| Adjacent | Exists? | Gap |
|----------|---------|-----|
| Acting unit UI | Yes in editor | None for CRUD; no dedicated “acting explain” on Observe |
| Combo playground (simulate) | Yes at `/dashboard/combos/playground` | Not hub-linked; unclear if simulate API special-cases fusion fan-out vs linear strategies |
| Auto-combo | Yes as Combos L2 + redirect | Fine; not fusion-specific |
| Route Trace | Analytics only | No one-click “explain last fusion run” from editor |
| Fusion list from Combos | **No** cross-link / tab | **Primary discovery failure** |
| Fusion health / cost rollup | No dedicated tab | nice-to-have under Analytics combo-health filter |
| Fusion simulate dry-run (panel fan-out cost estimate) | Not a dedicated UX | nice-to-have under Playground when strategy is fusion |

### C4. Discovery reality vs map

Operator path today:

1. L0 Routing → **only** combos list/builder UI  
2. Must **know URL** `/dashboard/fusions` or use command palette / hideable historical prefs  
3. Editor links back to fusions list only — not to Routing hub tabs  

**Conclusion:** Placement policy is right; **implementation of L1 tab + deep-link matrix is the gap**, not the L0 assignment.

---

## D. Hub shell readiness

### D1. `PageTabBar` adoption

| Hub | Shell today | Ship first? |
|-----|-------------|-------------|
| Analytics | Live `PageTabBar` + nested redirects | Reference implementation |
| Observe | Live `PageTabBar` + `?source=` | Reference |
| **Providers** | Flat list page; no hub tabs | **Yes — wave 1** |
| **Routing** | Combos page only | **Yes — wave 1 (fork-first)** |
| Operations | CLI entry only | Wave 2 |
| Settings | Per-route pages | Wave 2 (residual) |
| Home | Partial cockpit | Wave 2–3 |

### D2. Providers — first L1 tabs to ship

Order optimized for frequency + map fidelity:

| # | Tab label | Target | Notes |
|---|-----------|--------|-------|
| 1 | **Manage** | `/dashboard/providers` | Default; compact cards (policy already) |
| 2 | **Services** | `/dashboard/providers/services` | Embedded processes |
| 3 | **Media** | `/dashboard/media-providers` (canonical) | Redirect or embed `/dashboard/cache/media` |
| 4 | **Exposures** | `/dashboard/endpoint` | Catalog + OpenAI-compatible surface |
| 5 | **MCP** | `/dashboard/mcp` | OmniRoute control MCP |
| 6 | **A2A** | `/dashboard/a2a` | Protocol home |
| 7 | **Webhooks** | `/dashboard/webhooks` | Keep separate from catalog |

Implementation pattern: either (a) client shell on `/dashboard/providers` that `router.push`s destinations while keeping tab chrome, or (b) layout route group with shared tab bar — prefer same pattern as Analytics (URL owns state).

**Missing redirects / dual paths**

| From | To | Why |
|------|-----|-----|
| `/dashboard/cache/media` | Media tab canonical (or reverse) | Dual media IA |
| `/dashboard/api-endpoints` | already → endpoint catalog | Keep |
| endpoint `?tab=mcp|a2a` | already → protocol homes | Keep |
| Conceptual sidebar media href | Align to media-providers | `REGISTRY_ITEMS` still points at cache/media |

### D3. Routing — first L1 tabs to ship

| # | Tab label | Target | Notes |
|---|-----------|--------|-------|
| 1 | **Combos** | `/dashboard/combos` | Default hub |
| 2 | **Fusions** ✨ | `/dashboard/fusions` | Fork-first; do not drop |
| 3 | **Studio** | `/dashboard/combos/live` | Live cascade / breaker overlay |
| 4 | **Simulate** | `/dashboard/combos/playground` | `simulate-route` |
| 5 | **Compression** | `/dashboard/context/settings` | Engines as L2 inside page |
| 6 | **Policies** | `/dashboard/settings/routing` | Defaults, aliases, fallbacks |

Optional later L1 (or L2 under Policies): **Resilience**, **Relay**.

**Missing redirects / link fixes**

| Action | Detail |
|--------|--------|
| Keep | `/dashboard/auto-combo` → `combos?filter=intelligent` |
| Keep | `/dashboard/compression` → context engine (or prefer settings hub) |
| Add | Soft redirect note: Settings → Routing points to Routing Policies tab when shell exists |
| Fix | `ComboControlCenterClient` “Playground” → `/dashboard/combos/playground` (not debug `/dashboard/playground`) |
| Fix | Call Logs link → Observe hub (`buildObserveHubPath("request")`) not bare `/dashboard/logs` |
| Add | From fusions list: “Back to Routing” using hub shell, not only internal list |
| Consider | `/dashboard/combos?tab=fusions` alias redirecting to `/dashboard/fusions` for palette consistency |

### D4. What not to ship first

- One L1 tab per compression engine (banned by UI.md / map)
- Fusion as L0 leaf
- Gamification under any hub L1
- Full CyberCore 5-pillar rename in the same PR as tab shells

---

## E. Top 10 recommendations (impact / effort)

Ordered by **impact first**, then effort (H/M/L).

| # | Recommendation | Impact | Effort | Why |
|---|----------------|--------|--------|-----|
| 1 | **Ship Routing `PageTabBar` shell** (Combos · Fusions · Studio · Simulate · Compression · Policies) | Critical | M | Unlocks fork-first Fusion discovery; single biggest IA defect vs map |
| 2 | **Ship Providers `PageTabBar` shell** (Manage · Services · Media · Exposures · MCP · A2A · Webhooks) | High | M | Registry “Connect cleanup” incomplete without in-page tabs |
| 3 | **Resolve dual Media IA** (`media-providers` vs `cache/media`) + one canonical L1 | High | M | Map and live sidebar inventory disagree; confuses modality onboarding |
| 4 | **Map + place `/dashboard/relay`** under Routing L2 or Providers Exposures; update NAV-TREE §6 | High | L–M | Live product surface totally absent from target map |
| 5 | **Assign `/dashboard/compression/live`** as L2 under Compression studio (or redirect to studio mode) | Med | L | Post-3.8 surface; avoid second orphan |
| 6 | **Fix Combo Control Center adjacent links** (playground + logs) | Med | L | Prevents routing operators into debug playground / legacy logs |
| 7 | **Cross-link Fusions ↔ Combos ↔ Analytics** (combo-health, route-trace) | Med | L | Investigate path for fusion runs without new L0 |
| 8 | **Policies tab ownership**: Routing owns global routing settings; Settings shows residual link | Med | M | Implements “settings of X under X” without deleting routes |
| 9 | **Document resilience under Routing-adjacent L2** in NAV-TREE; deep-link from Policies | Med | L | Three resilience layers are operational routing, not cosmetics |
| 10 | **Freeze deep-link matrix + command palette** entries to L0+L1 after shells land; refresh this assessment | High (compound) | M | NAV-TREE §8 items 3–4; prevents leaf re-growth |

### Stretch (not top 10 but tracked)

- Fusion-aware simulate (panel cost/latency N+1) in Combo Playground  
- Fusion filter on Analytics Combo Health  
- Home cockpit tabs (health / costs pulse) — map L0·1 partial  
- Operations hub shell (wave 2)

---

## F. Map completeness scorecard (this focus)

| Area | Map text | Live chrome | Hub L1 shell | Discovery |
|------|----------|-------------|--------------|-----------|
| L0 Routing label | ✅ | ✅ | ❌ | Partial (combos only) |
| Fusions under Routing | ✅ | hideable only | ❌ | Poor |
| Combo studio / playground | ✅ deep | hideable / none | ❌ | Poor |
| Compression engines as L2 | ✅ | off rail ✅ | ❌ hub tab | OK if settings known |
| Providers registry | ✅ | L0 only | ❌ | Manage only |
| Exposures MCP/A2A/Webhooks | ✅ | deep | ❌ | Medium (known URLs) |
| Relay | ❌ | route only | ❌ | Orphan |
| Media dual path | Partial | conflicting | ❌ | Confusing |
| Auto-combo redirect | ✅ | ✅ | N/A | OK |
| Analytics route-trace | ✅ | ✅ shell | ✅ | Good |

---

## G. Suggested NAV-TREE-TARGET.md deltas (doc-only follow-up)

Do **not** treat this report as applying those edits; recommended text updates for the map owner:

1. §3 L0·3 — add L2/L1 row for **Compression live** (`/dashboard/compression/live`).  
2. §3 L0·3 or §6 — add **Relay** (`/dashboard/relay`) under Routing L2 or Providers Exposures.  
3. §3 L0·2 — explicit **canonical Media** path + redirect partner.  
4. §3 L0·3 — note **Resilience** deep-link from Policies.  
5. §6 Redirects — note mitm → agent-bridge; 1proxy → system/proxy.  
6. §8 checklist — mark “wire PageTabBar on Routing + Providers” as next wave blockers for Fusion discovery.

---

## H. Method notes / non-goals

- Did not re-count every `page.tsx` as a menu item (map invariant: operator IA, not route dump).  
- Did not treat ccdesign.md as authority where it conflicts with flat 10-hub + Fusion-under-Routing (e.g. old “LLM providers includes combos” sketch).  
- Did not edit product code; report only under `docs/reports/builders/`.  
- Re-run after Routing/Providers hub shells land (NAV-TREE §8.4).

---

## Related files (absolute)

- `/home/sephiroth/working/ganthritor/omniroute-2/docs/architecture/NAV-TREE-TARGET.md`
- `/home/sephiroth/working/ganthritor/omniroute-2/docs/guides/UI.md`
- `/home/sephiroth/working/ganthritor/omniroute-2/docs/architecture/FUSION.md`
- `/home/sephiroth/working/ganthritor/omniroute-2/src/shared/constants/sidebarVisibility.ts`
- `/home/sephiroth/working/ganthritor/omniroute-2/src/shared/components/PageTabBar.tsx`
- `/home/sephiroth/working/ganthritor/omniroute-2/src/app/(dashboard)/dashboard/fusions/`
- `/home/sephiroth/working/ganthritor/omniroute-2/src/app/(dashboard)/dashboard/combos/`
- `/home/sephiroth/working/ganthritor/omniroute-2/src/app/(dashboard)/dashboard/context/`
- `/home/sephiroth/working/ganthritor/omniroute-2/src/app/(dashboard)/dashboard/relay/`
- `/home/sephiroth/working/ganthritor/omniroute-2/src/app/(dashboard)/dashboard/media-providers/`
- `/home/sephiroth/working/ganthritor/omniroute-2/src/app/(dashboard)/dashboard/cache/media/`
