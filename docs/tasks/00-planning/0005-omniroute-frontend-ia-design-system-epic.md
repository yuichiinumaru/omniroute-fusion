# Epic 0005 — Frontend IA Reform + Design System Cohesion + Smart Componentization

> **Status**: **S0–S10 closeout complete (2026-07-10)** — Wave 1 + Wave 2 IA slices shipped; durable guide at [`docs/guides/UI.md`](../../guides/UI.md). Ongoing work is maintenance (no new default leaves without pillar mapping).  
> **Priority**: High (P0 product UX)  
> **Author**: Grok session (omniroute-fusion) · synthesizes live inventory (2026-07-10) + prior GPT-5.5 analysis in `.agents/user/why-khala-full.txt` L5571–5949  
> **Date**: 2026-07-10  
> **Project**: omniroute-fusion (`yuichiinumaru/omniroute-fusion`, private)  
> **Type**: UX / architecture / maintainability  
> **Action types**: `UX_VIS` (sidebar IA) + `EXTEND` (primitives/tokens) + `HARDEN` (naming dual-nav)  
> **Depends on**: none  
> **Related**:  
> - Epic 0003 / 0004 Fusion (new leaves must land under Routing pillar — **do not** keep growing peer sidebar items)  
> - `design.md` (token/primitives SSoT; `DESING.md` superseded stub)  
> - [`docs/guides/UI.md`](../../guides/UI.md) — **IA + no-new-leaf authority** (Task 0031 / S10)  
> - [`docs/dependency-tree.md`](../../dependency-tree.md) — serial vs parallel child tasks  
> - `visual-reference/` (local mock, gitignored — design input only)  
> - `.agents/user/why-khala-full.txt` L5054, L5571–5953 (CyberCore anti-pattern analysis)  
> - `.agents/user/why-khala-full2.txt` (CC identity; risk of repeating OmniRoute menu dump)

---

## 1. Goal (RF8 · Goals)

### Problem

The OmniRoute dashboard became a **feature/table/route taxonomy exposed ~1:1 in the sidebar**:

```
each new feature
  → becomes a route
  → becomes a sidebar leaf
  → becomes its own screen
  → gets label, icon, color, and preset membership
```

This was diagnosed earlier as **“dump do banco disfarçado de menu”** (`why-khala-full.txt` ~L5589).  
Live inventory (2026-07-10) confirms **~81 sidebar leaves**, **10 sections**, **8 subgroups**, plus dual navigation (same content as `?tab=` **and** nested routes).

Presets (`all` / `minimal` / `developer` / `admin`) and hideable items are a **symptom**, not a fix:

> **Rule:** if you need to hide ~60% of menus to make the product usable, the menu is wrong.  
> (`why-khala-full.txt` L5898–5900)

Secondary problems that multiply cost:

1. **Partial design system** — tokens + primitives exist; legacy inline styles + dead CSS vars coexist. **Not** Atomic Design.
2. **Mid-layer UI duplication** — CLI tool cards, ad-hoc toggles, local StatCards, dual EmptyStates, clone relay modals (~5.5–9.5k LOC recoverable).
3. **Identity drift risk** — wholesale port of `visual-reference` neon/Orbitron would fight `design.md` coral marketing identity.

### Value

1. **IA:** ~7–12 fixed operational pillars; capabilities live as tabs/drawers/filters, not peer leaves.  
2. **Maintainability:** shared mid-layer components cut clone surface and a11y drift.  
3. **Visual:** keep OmniRoute token SSoT; selectively import VR **state vocabulary, glow budget, metric/panel micro-patterns**.  
4. **Governance:** stop the feature→sidebar reflex (including Fusion and future work).

### Success metrics

| Metric | Target | Closeout evidence (child task) |
|--------|--------|--------------------------------|
| Default visible sidebar leaves (minimal/operator view) | **≤ 12** (stretch **≤ 8**) | **met (12)** — Task **0025** `countPresetVisibleLeaves("minimal")` |
| Top-level sections | **≤ 8** (prefer **7** operational pillars) | **met (7 pillars)** — Task **0025** `OPERATIONAL_PILLAR_SECTION_IDS` |
| Compression engines as top-level leaves | **0** (rows/cards/tabs inside one Compression surface) | **met** — Task **0022** (S3) |
| Log/audit surfaces as separate top-level leaves | **1** Observe/Execution Stream + filters (not 5+) | **met** — Task **0023** (S4) `/dashboard/activity?source=` |
| Analytics dual-nav | Nested routes **redirect** into single shell + tabs | **met** — Task **0022** (S2) |
| Shared Toggle adoption on settings/API manager | No new raw `role="switch"`; migrate worst offenders | **met (worst offenders)** — Tasks **0021** + **0027** |
| Recoverable LOC from top componentization wins | Documented before/after; aim **≥ 5k** net over epic lifetime | **partial / ongoing** — **0021**, **0029**, **0030** (primitives/CLI card/tab kit); full 5k net is lifetime stretch |
| VR adoption | No default Orbitron/scanlines/full Prism fork; tokens/status/metrics only | **met** — Task **0028** (S9) selective status/glow/cyan optional |
| Deep links | Preserve or 301/redirect: services `?tab=`, proxy `?tab=`, analytics `?tab=`, memory/playground/translator, settings nested + legacy `?tab=` | **met (IA hubs)** — **0022–0024** redirects + hideable retention |
| Regression | i18n keys updated; presets rebuilt; no capability deleted without mapped home | **presets** **0025**; **archive** **0020**; **naming** **0026** (coord); **docs** **0031** |
| No-new-leaf governance | Durable agent/human guide | **met** — Task **0031** → [`docs/guides/UI.md`](../../guides/UI.md) |

### Stop criteria (out of scope)

- Full CyberCore product build (separate identity; **reuse this epic as anti-pattern guard**).  
- Replacing Next/Tailwind with Flutter or a new SPA.  
- Gamification product redesign (hide / demote; do not invest).  
- Wholesale shadcn/Radix migration.  
- Atomic Design folder ceremony without token discipline.  
- Deleting runtime capabilities — only **re-home** IA.

---

## 2. Domain (RF8 · Domain)

### Bounded context

| Area | Owner modules | Notes |
|------|---------------|-------|
| Sidebar tree | `src/shared/constants/sidebarVisibility.ts` | `SIDEBAR_SECTIONS`, hideable IDs, presets |
| Sidebar render | `src/shared/components/Sidebar.tsx` | Group expand/collapse |
| Group visibility | `src/shared/constants/sidebarGroupVisibility.ts` | Hideable subgroups |
| Sidebar settings UI | `…/settings/components/SidebarTab.tsx` | Presets all/minimal/developer/admin |
| i18n labels | `src/i18n/messages/en.json` (`sidebar.*`) | Naming debt lives here |
| Design tokens | `src/app/globals.css` | Tailwind v4 `@theme inline` |
| Theme runtime | `src/store/themeStore.ts`, `ThemeProvider.tsx`, `AppearanceTab.tsx` | light/dark/system + primary swatch |
| Primitives | `src/shared/components/*` | Button, Card, Toggle, Badge, EmptyState, DataTable… |
| Feature pages | `src/app/(dashboard)/dashboard/**` | ~420–500 production TSX |
| Design plan | `design.md` | Phases 1–6; token SSoT (`DESING.md` → stub + archive) |
| UI / IA guide | `docs/guides/UI.md` | No-new-leaf + 7 pillars + primitives (S10) |
| Visual mock (local) | `visual-reference/` (gitignored) | Prism / Cybernetics Core mock |

### Current state (evidence — 2026-07-10 inventory)

| Metric | Count |
|--------|------:|
| Top-level sections | 10 |
| Subgroups | 8 |
| **Leaf sidebar items** | **~81** |
| Hideable item IDs | ~102 (incl. orphans `mitm-proxy`, `1proxy`, `logs-activity`) |
| Dashboard UI files | ~550–650 |
| Dashboard UI LOC (approx) | ~110–135k |
| Shared components | ~95–110 TSX |
| Boilerplate chrome share | ~25–35% |
| Near-duplicate domain clusters | ~12–18% LOC |

**Canonical example (user-cited):**

- `/dashboard/providers/services?tab=cliproxy`  
- `/dashboard/providers/services?tab=9router`  

**Compression Context alone:** Settings, Engine Combos, Caveman, RTK, Headroom, Session Dedup, CCR, LLMLingua, Lite, Aggressive, Ultra, Compression Studio — strategies/presets of **one** capability, not 12 menus.

**Log/evidence sprawl:** Activity, Logs, Proxy Logs, Console Logs, Audit, MCP Audit, A2A Audit — tables that should be **one stream + filters**.

### False gaps (do NOT rebuild)

| Temptation | Reality |
|------------|---------|
| New design system from VR Prism* | Evolve `globals.css` + existing primitives |
| One mega ProviderCard | Domain lifecycles differ (OAuth/API-key/web/local) |
| Unify all loggers into one god component | Share cells/filters; keep domain data models |
| Atomic Design rename of folders first | Token discipline + fewer leaves first |
| Role presets as IA architecture | Role views **after** base tree is short |

### Evidence precedence

1. Live code (`sidebarVisibility.ts`, routes under `dashboard/**`) over screenshots.  
2. This epic’s inventory tables over memory.  
3. `design.md` over `DESING.md`.  
4. Khala analysis for **intent taxonomy**; this epic for **OmniRoute-fusion reform + metrics**.

---

## 3. Diagnosis synthesis

### A. Prior analysis (`why-khala-full.txt` L5571–5949) — still correct

| Claim | Status |
|-------|--------|
| Feature→route→sidebar 1:1 dump | **Confirmed** live |
| Presets prove taxonomy failure | **Confirmed** |
| Compression engines ≠ menus | **Confirmed** |
| 5 log menus = event tables | **Confirmed** (even more with audit split) |
| OmniProxy mixes ≥5 domains | **Confirmed** |
| Save: debug visibility, grouping intent, role views (not hide-as-architecture) | **Adopt** |
| 7 pillars: Core Pulse · Registry · Routing & Strategy · Governance · Operations · Observability · System | **Primary target IA** |
| Rule: hide 60% ⇒ menu wrong | **Governing rule** |

That analysis was written primarily as a **CyberCore anti-pattern** (do not inherit). This epic applies it to **reform OmniRoute-fusion itself** and to **guard Fusion / future leaves**.

### B. What this inventory **adds** (beyond Khala text)

1. **Hard counts** — ~81 leaves, 10 sections, dual-nav map, component density per area.  
2. **Dual navigation bug** — Analytics (and others) expose the **same** surface as sidebar leaf **and** in-page `?tab=` **and** nested routes — reorg must **kill dual nav**, not only rename groups.  
3. **Parallel maintainability track** — IA reform alone does not pay the clone tax; componentization quickwins are **independent** and should land **before / during** IA so reorg touches fewer patterns.  
4. **Design system reality** — partial cohesion; not Atomic; evolve `design.md`, ban dead vars (`--text-primary`), enforce Toggle/Badge/Modal.  
5. **visual-reference reuse matrix** — keep state/glow/density docs; adapt metric tiles & panel accent; **ignore** fantasy IA, Orbitron chrome, scanlines default, Prism component fork.  
6. **Deep-link & orphan inventory** — `relay`, `media-providers`, legacy MITM/1proxy redirects, settings nested paths — migration must preserve bookmarks.  
7. **Naming debt table** — Usage vs Analytics, Storage vs settings-general, Skills triad, Proxy vs Proxy Logs vs Embedded Services.  
8. **Quickwin ordering by impact/effort** — concrete implementation sequence (see §5).  
9. **Fusion epic constraint** — new Fusions surface must **map into Routing**, not become leaf #82 forever.  
10. **Two product lanes** — (a) reform OmniRoute-fusion now; (b) CyberCore/CC must treat this epic as **forbidden pattern** (also noted in `why-khala-full2` risk of “caralhada de menu”).

### C. Pillar mapping: Khala 7 vs product-facing 12

Use **7 pillars as canonical IA**. Optional “product names” can alias for OmniRoute operators:

| # | Pillar (canonical) | OmniRoute-facing alias (optional) | Absorbs (examples) |
|---|--------------------|-----------------------------------|--------------------|
| 1 | **Core Pulse** | Home / Overview | Home, health snapshot, incidents, cost pulse |
| 2 | **Registry** | Providers & Capabilities | Providers, models, MCP/tools/plugins catalog, exposures, media modalities |
| 3 | **Routing & Strategy** | Routing | Combos, Combo Studio, Fusions, global routing, compression **as strategy**, simulation |
| 4 | **Governance** | Access & Budgets | API keys, access tokens, policies, security, budgets, quotas, quota share, free tiers |
| 5 | **Operations** | Agents & Runtime Ops | CLI/ACP/cloud agents, agent bridge, traffic inspector, batch, workloads |
| 6 | **Observability** | Observe & Analytics | Activity, all logs, audits, usage, evals, cache, provider stats, runtime detail |
| 7 | **System** | Settings | Appearance, storage, network/proxy, advanced, feature flags, resilience chrome |

**Demote / kill as top-level:** Gamification leaderboard; free-provider-ranking-as-product; Sidebar settings as “system pillar”; Dev Tools (debug-only); Memory as peer of everything (sub of Operations or Registry capability — product decision).

**Compression placement (decision needed):**

- Khala: under Routing & Strategy as Operational Efficiency, **or**  
- Live inventário earlier: top-level Compression for operator discoverability.  

**Epic default:** Compression = **tab/sub-nav under Routing & Strategy** (engines as rows/cards). If operator research shows compression is daily primary work, promote to 8th pillar **only** with engines still **not** leaves.

---

## 4. Feature slices (RF8 · Features)

Vertical slices; each becomes one or more atomic tasks later.

| Slice | Name | Outcome | Action | Effort |
|-------|------|---------|--------|--------|
| **S0** | Inventory freeze | This epic + counts locked; no new sidebar leaves without pillar mapping | HARDEN | S |
| **S1** | Primitive discipline | Toggle/Badge/EmptyState/Modal policy + migrate worst offenders (ApiManager switches, StatCards, EmptyState) | EXTEND | S–M |
| **S2** | Kill analytics dual-nav | Single Analytics shell; nested routes redirect | UX_VIS | S–M |
| **S3** | Compression collapse | One surface; engines as tabs/rows; studio linked | UX_VIS | M |
| **S4** | Observe stream | Logs + audit + activity as one hub + filters | UX_VIS | M |
| **S5** | Connect/Registry split | Endpoints/MCP/A2A/API keys vs Providers registry; retire triple MCP/A2A exposure | UX_VIS | M |
| **S6** | Sidebar rebuild | `SIDEBAR_SECTIONS` → 7 pillars; rebuild presets as **role views** | UX_VIS | M–L |
| **S7** | Naming / i18n cleanup | Fix Usage/Analytics, Storage, Skills, Proxy labels | UX_VIS | S |
| **S8** | CLI ConfigurableToolCard | Extract shell after 2 pilot tools | EXTEND | L |
| **S9** | Theme micro-adoption | Status vocabulary, metric tiles, accent bar, optional cyan preset; no VR full port | UX_VIS | S–M |
| **S10** | Docs & guardrail | `docs/guides/UI.md` or short IA rule: **no new leaf without pillar**; archive `DESING.md` | HARDEN | S |

---

## 5. Quickwins ranked (impact / effort)

### A) Componentization (maintenance)

| Rank | Win | E | I |
|------|-----|---|---|
| 1 | `SettingsToggleRow` + migrate ApiManager/memory/flags | S | High |
| 2 | Unified `MetricStatCard` (kill MCP/A2A/analytics locals) | S | High |
| 3 | Tailwind `EmptyState` + Badge discipline | S | Med |
| 4 | `DeployRelayModal` shell | S | Med |
| 5 | `PageTabBar` (+ URL sync) | M | Med |
| 6 | CLI `ConfigurableToolCard` (after pilots) | L | High |

### B) IA reorg

| Rank | Win | E | I |
|------|-----|---|---|
| 1 | Kill Analytics dual-nav | S–M | High |
| 2 | Compression collapse | M | High |
| 3 | MCP/A2A single home + redirects | S | Med |
| 4 | Rename Proxy → Network / Outbound | S | Med |
| 5 | Full 7-pillar `SIDEBAR_SECTIONS` + role presets | M–L | High |

### C) Visual (VR selective)

| Rank | Win | E | I |
|------|-----|---|---|
| 1 | Status vocabulary → Badge / health | S | High ops |
| 2 | Metric tile + card accent bar | S | Med look |
| 3 | Glow budget only on health/breakers | S | Med |
| 4 | Optional primary preset `#00FFCC` | S | Low–Med |

### Recommended attack order

```
S0 guardrail
 → S1 primitives (cheap, reduces reorg cost)
 → S2 analytics dual-nav
 → S9 theme micro (optional parallel)
 → S3 compression collapse
 → S4 observe stream
 → S5 registry/connect
 → S6 full sidebar rebuild + S7 i18n
 → S8 CLI base
 → S10 docs
```

---

## 6. Proposed trees

### 6.1 Canonical target (7 pillars) — preferred

```
Core Pulse
Registry
Routing & Strategy      # combos, fusions, compression engines as inner
Governance              # keys, tokens, security, budgets, quotas
Operations              # agents, bridge, inspector, batch
Observability           # stream + analytics + evals + cache
System                  # appearance, network, storage, advanced, flags
(+ Dev Tools: debug-only, not main IA)
(+ Help: docs/changelog/issues — can hang under System or footer)
```

### 6.2 Interim OmniRoute product tree (~10–12) — if phased

Home · Connect · Providers · Routing · Compression* · Agents & Tools · Observe · Analytics · Costs · Batch & Media · Settings · Help  

\*Compression interim top-level only if needed for discoverability; **engines still not leaves**.

### 6.3 Old → new mapping (summary)

| Old clusters | New home |
|--------------|----------|
| home, health snapshot | Core Pulse |
| providers, embedded services, models/media providers | Registry |
| endpoints, mcp/a2a pages, api-endpoints, webhooks | Registry → Exposures **or** Connect sub of Registry |
| combos, combos-live, fusions, settings-routing, auto-combo | Routing & Strategy |
| all context-*, compression studio, analytics-compression | Routing → Operational Efficiency |
| cli/acp/cloud agents, agent-bridge, traffic-inspector | Operations |
| memory, skills*, plugins | Operations or Registry (product pick) |
| activity, logs*, audit*, runtime detail, provider-stats | Observability |
| analytics*, cache | Observability (tabs) |
| costs*, free-tiers, rankings, quota, quota-share | Governance (economics) |
| api-manager, access-tokens, security, resilience | Governance |
| proxy, relay, appearance, storage, flags, advanced | System |
| translator, playground, search-tools | Dev-only |
| leaderboard | kill / demote |
| batch, files, media | Operations or Registry modality |

Full line-by-line leaf table: session inventory 2026-07-10 (sidebarVisibility walk). Re-run `rg` on `SIDEBAR_SECTIONS` when slicing S6.

---

## 7. visual-reference adoption (keep / adapt / ignore)

| Asset | Verdict |
|-------|---------|
| Glow budget / motion docs | **Keep** (rules) |
| `STATE_VOCABULARY` | **Adapt** → Badge/health mapping |
| Metric tiles, panel accent bar | **Adapt** on existing Card |
| Color hex cyan/obsidian as SSoT | **No** — optional accent only |
| Orbitron/Rajdhani app chrome | **Ignore** |
| Scanlines / neon logo block | **Ignore** default |
| Prism component tree | **Ignore** (no dual system) |
| Fantasy navigation / views | **Ignore** |
| Density / a11y contracts (docs 014 etc.) | **Keep** process |

---

## 8. Design system stance

| Question | Answer |
|----------|--------|
| Cohesive design system? | **Partial** — tokens + primitives + `design.md` |
| Atomic Design? | **No** (informal composition only) |
| Redesign foundations? | **No** — finish token migration + adoption |
| Libraries | Custom + Tailwind v4; not shadcn |

---

## 9. Componentization savings (approx)

| Package | Net LOC |
|---------|---------|
| Toggle/Badge/Empty/StatCard | 1.0–1.8k |
| Relay modal shell | 0.2–0.35k |
| Tab bar + audit shell | 0.4–0.7k |
| Settings field kit | 0.5–1.0k |
| CLI ConfigurableToolCard | 3.5–5.5k |
| **Total top wins** | **~5.5–9.5k** |

---

## 10. Risks & invariants

| Risk | Mitigation |
|------|------------|
| Operators lose muscle memory | Redirects + command palette entries + changelog |
| i18n/RTL breakage on polish | No Orbitron; keep Material Symbols; test long locales |
| Light mode break from VR colors | Any new token must define `:root` + `.dark` |
| Scope explosion | S0 ban on new leaves; slices independent |
| Fusion epic adds leaf #82 | Map Fusions under Routing in S6 |
| CC product re-learns dump | Cite this epic + Khala rule in CC planning |

### Invariants

1. **No new default-visible sidebar leaf** without pillar mapping + epic note.  
2. **Strategies/engines/presets are not menus.**  
3. **Tables of events are one stream + filters.**  
4. **Presets are role views after IA fix, not architecture.**  
5. **Capabilities are not deleted — only re-homed.**

---

## 11a. Slice progress (S0–S10 closeout, 2026-07-10)

| Slice | Status | Evidence |
|-------|--------|----------|
| S0 Archive policy + no-new-leaf guardrail | **done** | Task **0020** — `.archive/README.md`, `PROVENANCE-INDEX.md`, header on `sidebarVisibility.ts` |
| S1 EmptyState / SettingsToggleRow / StatCard | **done** | Task **0021** — shared primitives under `src/shared/components/` |
| S1 remainder Toggle migration | **done** | Task **0027** — ApiManager + usage-limit surfaces |
| S2 Analytics dual-nav kill | **done** | Task **0022** — nested → `redirect(?tab=)` |
| S3 Compression hub | **done** | Task **0022** — engines **0** default leaves |
| S4 Observe unified stream | **done** | Task **0023** — `/dashboard/activity` + filters |
| S5 Connect / Registry cleanup | **done** | Task **0024** — exposures SSoT + redirects |
| S6 Seven-pillar sidebar + role presets | **done** | Task **0025** — 7 pillars; `minimal` ≤ 12 leaves |
| S7 i18n / naming cleanup | **done / residual** | Task **0026** — naming debt; coord with live `sidebar.*` keys (see task file lane) |
| S8 CLI ConfigurableToolCard | **done** | Task **0029** — `src/shared/components/cli/ConfigurableToolCard.tsx` |
| S9 Theme micro VR adoption | **done** | Task **0028** — status vocabulary, StatCard accent, optional cyan |
| S10 Docs & guardrail | **done** | Task **0031** — [`docs/guides/UI.md`](../../guides/UI.md); `DESING.md` superseded |
| quickwins PageTabBar / field kit / DeployRelayModal | **done** | Task **0030** |
| Archive-not-delete policy | **done** | Moves → `.archive/` with provenance (S0 + ongoing) |

**Sidebar (post-S6):** 7 operational pillars in `SIDEBAR_SECTIONS` (+ `help`, debug `devtools`). Wave 1 alone cut ~14 dual-nav/engine leaves from ~81; S4–S6 further collapsed observe/connect defaults into hubs.

## 11. Child tasks (Task NNNN tree)

> Promoted 2026-07-10 by GT-TASK-ARCHITECT. Numbering: Fusion **0010–0018**; Frontend IA **0020–0031**.  
> **Closeout:** child table below reflects completed work under `docs/tasks/04-completed/` (S10 evidence may still sit in `02-doing` until parent promote).

### All child tasks (S0–S10)

| Task | Slice | Title | Status | Path |
|------|-------|-------|--------|------|
| **0020** | S0 | Archive policy + no-new-leaf guardrail | `[x]` | `docs/tasks/04-completed/0020-frontend-ia-archive-guardrail.md` |
| **0021** | S1 | Shared UI primitives (EmptyState, SettingsToggleRow, StatCard) | `[x]` | `docs/tasks/04-completed/0021-frontend-ia-shared-ui-primitives.md` |
| **0022** | S2+S3 | Analytics dual-nav kill + compression hub | `[x]` | `docs/tasks/04-completed/0022-frontend-ia-analytics-compression-hub.md` |
| **0023** | S4 | Observe unified event stream | `[x]` | `docs/tasks/04-completed/0023-frontend-ia-observe-unified-stream.md` |
| **0024** | S5 | Connect / Registry exposure cleanup | `[x]` | `docs/tasks/04-completed/0024-frontend-ia-registry-connect-cleanup.md` |
| **0025** | S6 | Seven-pillar sidebar + role presets | `[x]` | `docs/tasks/04-completed/0025-frontend-ia-seven-pillar-sidebar.md` |
| **0026** | S7 | i18n / naming cleanup | `[x]` / residual | `docs/tasks/` lane for `0026-frontend-ia-i18n-naming-cleanup.md` |
| **0027** | S1 rem. | SettingsToggleRow / Toggle migration | `[x]` | `docs/tasks/04-completed/0027-frontend-ia-settings-toggle-migration.md` |
| **0028** | S9 | Theme micro VR adoption | `[x]` | `docs/tasks/04-completed/0028-frontend-ia-theme-micro-adoption.md` |
| **0029** | S8 | CLI ConfigurableToolCard | `[x]` | `docs/tasks/04-completed/0029-frontend-ia-cli-configurable-tool-card.md` |
| **0030** | quickwins | PageTabBar + field kit + DeployRelayModal | `[x]` | `docs/tasks/04-completed/0030-frontend-ia-page-tabbar-field-kit.md` |
| **0031** | S10 | UI IA docs + no-new-leaf guide | `[x]` evidence | `docs/tasks/02-doing/0031-frontend-ia-docs-guardrail.md` → promote to `04-completed/` |

### Dependency graph (shipped)

```
0020 (S0) ─┬─► 0021 (S1) ─► 0027 (toggle migrate) ✅
           │            └─► 0028 (theme micro) ✅
           ├─► 0022 (S2+S3) ✅
           ├─► 0023 (S4) ✅ ──┐
           └─► 0024 (S5) ✅ ──┴─► 0025 (S6) ✅ ─► 0031 (S10) ✅

Parallel (group A): 0026 i18n · 0029 CLI · 0030 kits  (all landed)
```

### Durable guardrail (post-epic)

New features **must** follow [`docs/guides/UI.md`](../../guides/UI.md): map to one of the 7 pillars, prefer tabs/filters over leaves, archive-not-delete, reuse shared primitives, keep `design.md` as token SSoT.

---

## 12. Session provenance

| Source | What |
|--------|------|
| Grok session 2026-07-10 | Live inventory, design system audit, duplication metrics, VR comparison, private repo push |
| `why-khala-full.txt` L5054 | Risk: return to OmniRoute menu pile |
| `why-khala-full.txt` L5571–5953 | GPT-5.5 diagnosis + 7 pillars |
| Repo | `https://github.com/yuichiinumaru/omniroute-fusion` (private) |
| Sessions archived | `.archive/session0bc2.md`, `.archive/session-ses_0d23.md` |

---

## 13. One-line summary

**Stop mapping features 1:1 to sidebar leaves; fix IA to ~7 operational pillars with tabs/drawers, finish the existing design-token primitives, componentize mid-layer clones, and steal only state/density ideas from visual-reference — not its neon fantasy shell.**
