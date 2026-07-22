# Task 0100: EPIC-20 T20-O — Tests Gate (Chrome ≤1, Redirect Matrix, Sidebar Operations Active)

> **Status**: `[x]` Reviewed **100** — moved to `03-review`  
> **Priority**: 🔴 P0  
> **Type**: `verification` + `testing`  
> **Action type**: HARDEN + UX_VIS  
> **Origin**: EPIC-20 §7 T20-O, §8 success metrics, Hard Rules #22–#23 — `docs/tasks/00-planning/EPIC-20-omniroute-operations-hub-reform.md`  
> **Blocks**: EPIC-20 wave close / operator sign-off  
> **Depends on**: **hard** landed peers required for matrix rows that exist — at minimum **0086/0087** (SSoT+shell), **0096 Labs**, **0097 Media**, **0098 Traffic→Observe**, **0099 Testing retire**; soft remaining T20-C…J peers when open (assert only landed IDs; do not fail entire gate on unopened slices if inventory marks them residual)  
> **Parallelism**: `serializable` **last** after peers exist; not parallel-safe with fusion page authors still editing chrome  
> **Review routing**: independent quality gate PR; may bundle final EPIC-20 PR if small  

---

## Objective

Close EPIC-20 with an **automated, binary test gate** that proves:

1. **Chrome mount ≤ 1** Operations hub topbar on every `/operations/*` route (anti-phantom; no stacked Endpoint sub-strips + Ops topbar + legacy launchpad).  
2. **Redirect matrix** from T20-A (and T20-M Traffic) is encoded and green for legacy → canonical rows that product locked.  
3. **Sidebar Operations active** on all `/operations/*` (and frozen aliases) — primary leaf Operations, no wrong leaf.  
4. **No new primary leaves** for Labs/Testing/MCP/Media/Traffic.  
5. Traffic lives under **Observe** chrome (not Ops topbar) with Observe active-state for its frozen path.  
6. Testing hub is redirect-only (0099 contract).

This task is **verification-first**: fix only glue/SSoT/tests needed to make the matrix true; do **not** reopen fusion UX design. If a peer page is missing, record residual and assert only landed peers — do not invent UI.

**Done when:** a dedicated test module (or small set) fails the PR if multi-topbar, missing redirects, wrong sidebar active, or new leaves regress.

---

## Background Context

### O que já existe:

- EPIC-20 locked topbar peers (10) + path matrix + Traffic out-of-Ops.  
- Prior patterns:  
  - `tests/unit/ui/observe-hub-sidebar.test.ts` (single Observe strip)  
  - `tests/unit/sidebar-route-match.test.ts` (0084 active matrix)  
  - 0059/0060 discoverability suites  
  - Providers/Dashboard anti-phantom tests from EPIC-19  
- T20-A should export redirect matrix + path builders (consume — do not fork).  
- After 0096–0099: Labs/Media/Traffic/Testing contracts exist.

### O que está faltando / quebrado:

- No single EPIC-20 gate suite tying chrome ≤1 + redirects + Operations active + no-new-leaf.  
- Risk of peer tasks claiming done without mount-count proof (EPIC-19 multi-topbar miss class).  

### Explicitly out of scope:

- Building missing fusion pages (C–L) from scratch.  
- Full app-wide path rename outside Ops pilot + Traffic.  
- Visual screenshot baselines (optional advisory only).  
- :21000 production validation (operator-only).

---

## Dependency & Parallel Safety

| Item | Value |
|------|--------|
| **Depends on** | **0086, 0087 hard**; **0096, 0097, 0098, 0099 hard** for their rows; soft other Ops peers when present |
| **Blocks** | EPIC-20 success checklist close |
| **File ownership** | Gate tests under `tests/unit/ui/epic20-ops-chrome-gate-0100.test.ts` (+ helpers); minimal matcher/SSoT fixes if gaps; UI.md success checklist checkboxes if needed |
| **Do not touch** | Fusion page business UIs (0091–0097 ownership) except chrome data-testid hooks required for mount counts |
| **serializable** | Last in EPIC-20 implementation wave |

---

## Test Requirements

### A. Chrome mount ≤ 1 (Ops)

- DEVE definir SSoT selector/data attribute for Operations hub topbar (from T20-B — e.g. `data-operations-hub-topbar` or component name)  
- DEVE para **cada** landed `/operations/*` peer route (at least: shell root, labs, media, + every other peer present in tree): assert hub topbar mount count **=== 1** (or ≤1 if root redirects)  
- DEVE assertir **ausência** de stacked forbidden chrome on Labs: no simultaneous Ops hub topbar + `SearchToolsTopBar` L1 + `StudioTopBar` as second hub strip  
- DEVE assertir Media: Ops hub topbar ≤1; modality strip allowed as **content** (not counted as hub topbar)  

### B. Redirect matrix

- DEVE importar/espelhar T20-A `OPERATIONS_REDIRECT_MATRIX` (name flexible) rows for landed peers  
- DEVE incluir no mínimo:  
  - playground, translator, search-tools, batch, batch/files → Labs  
  - cache/media → Media  
  - testing → Labs  
  - tools/traffic-inspector → Observe Traffic frozen path (**0098**)  
- DEVE falhar se row points to 404 path string that builders do not produce  

### C. Sidebar Operations active

- DEVE assertir `resolveSidebarHubAlias` / `getActiveSidebarHref` lights Operations primary href for all `/operations/*`  
- DEVE assertir **não** lights Providers/Home/Observe on `/operations/labs` etc.  
- DEVE assertir Traffic frozen path lights **Observe** (activity), **not** Operations  

### D. No new leaves + Testing retire

- DEVE assertir `PRIMARY_SIDEBAR_ITEM_IDS` does **not** include: `playground`, `translator`, `search-tools`, `testing`, `media`, `traffic-inspector`, `labs` as new primaries  
- DEVE assertir Testing hub is redirect-only (0099)  

### E. Process

- DEVE documentar residual peers not yet landed (skip or `todo` with explicit list — never silent pass on missing required 0096–0099 rows)  

---

## Exit Conditions (GDD/TDD)

> OmniRoute npm matrix — see `docs/tasks/OMNIROUTE-CREATE-TASKS-EXITS.md`.

- [x] Gate test file(s) exist and encode chrome ≤1 + redirects + Operations active + no-new-leaf + Traffic→Observe  
- [x] Required rows for **0096–0099** green (not residual)  
- [x] Residual T20-C…J peers listed in Completion Evidence if not in tree  
- [x] Unit tests pass:  
      `node --import tsx/esm --test tests/unit/ui/epic20-ops-chrome-gate-0100.test.ts`  
      (+ sidebar-route-match / observe chrome regressions as needed)  
- [x] `npm run typecheck:core` passa sem erros  
- [x] `npm run lint` passa sem erros novos nos arquivos tocados (eslint on Header + gate file: clean exit)  
- [x] EPIC-20 §8 success metrics checkboxes updated in planning doc **or** Evidence maps each metric to a test name  
- [x] Entrada no TOPO de `CHANGELOG.md` under `[Unreleased]` (gate / EPIC-20 closeout note)  
- [x] Completion Evidence includes full command output  
- [x] No cargo exits; no :21000 work  

---

## Details

### What

Subtasks:

- [ ] **Ler código existente**: EPIC-20 §5–§8; T20-A redirect matrix + builders; T20-B topbar mount attribute; 0096–0099 Evidence; `sidebarRouteMatch.ts`; Observe subnav; PRIMARY_SIDEBAR_ITEMS; existing anti-phantom tests (EPIC-19); discoverability 0059/0060/0099  
- [ ] Inventory landed `/operations/*` routes via filesystem + builders  
- [ ] Implement gate tests (TDD — write failing matrix first if chrome still multi)  
- [ ] Minimal product fixes only if gate proves glue missing (matcher alias for `/operations`, data-testid on shell)  
- [ ] Map EPIC-20 §8 metrics → test names in Evidence  
- [ ] **Refactoring pass**: one gate module; share matrices from SSoT — no duplicated magic strings  
- [ ] **Verificação de regressão**: gate + related unit tests + typecheck + lint  

### Where

| Arquivo | Propósito |
|---------|-----------|
| EPIC-20 planning | Ler; optional §8 checkboxes |
| T20-A SSoT redirect matrix / builders | Consumir |
| T20-B Ops topbar component | data-testid if missing |
| `src/shared/utils/sidebarRouteMatch.ts` | Fix `/operations` active if gap |
| `src/shared/constants/sidebarVisibility.ts` | Read-only asserts |
| `src/shared/components/ObserveHubSubnav.tsx` | Traffic peer regression |
| `tests/unit/ui/epic20-ops-chrome-gate-0100.test.ts` | **Criar** — main gate |
| `tests/unit/sidebar-route-match.test.ts` | Extend Operations prefixes |
| `tests/unit/ui/epic20-*-0096..0099*.test.ts` | Regressão import/share |
| `CHANGELOG.md` | Unreleased |

### How

1. Collect SSoT matrices from 0086 + peer tasks.  
2. Write gate tests that import builders (single source of truth).  
3. Run; fix only gaps.  
4. Evidence table: metric → test.  

### Why

Without a final gate, EPIC-20 can ship “pages moved” while multi-topbar and wrong sidebar active recreate the EPIC-19 failure mode. Binary tests make organization **auto-evident** and regression-proof.

---

## Parallelism / file ownership

| Class | Detail |
|-------|--------|
| **parallel-safe** | No — last gate |
| **serializable** | After 0086/0087 + 0096–0099 (+ peers preferred) |
| **Collision** | sidebar matcher, Ops shell testids, redirect SSoT |

---

## ⛔ Anti-Hallucination Guardrails

> [!CAUTION]
> DO NOT mark complete if 0096–0099 required rows are residual “skipped”.  
> DO NOT invent redirect targets not produced by T20-A builders.  
> DO NOT count Media modality strip as Ops hub topbar.  
> DO NOT add primary leaves to make tests pass.  
> PORT 21000 = production — do not touch.

> [!IMPORTANT]
> Hard Rules #22–#23 are the acceptance law for this gate.  
> Prefer import of production SSoT over re-typed path strings.  
> First subtask: read existing matrices and prior anti-phantom tests.

---

## 🛡️ Compliance Checklist (Leis Primárias do AGENTS.md)

- [ ] **Doc Accuracy**: matrix paths grepped / imported from SSoT  
- [ ] **Zod Validation**: N/A  
- [ ] **Security**: N/A  
- [ ] **Error Sanitization**: N/A  
- [ ] **No Raw SQL**: N/A  
- [ ] **Archive Protocol**: redirects only  

---

## 📋 Completion Evidence (preenchido pelo agente executor)

- **Gate file(s)**:
  - `tests/unit/ui/epic20-ops-chrome-gate-0100.test.ts` (main gate — 26 tests)
  - Header residual fix: `src/shared/components/Header.tsx` — all 10 peers + `resolveDeepHeaderTitleFallback`; deep meta before sidebar prefix; hub catch-all root-only
  - Peer Header asserts retargeted (0088/0089/0091/0092/0093/0097) for SSoT matchers
  - EPIC-20 §8 checkboxes updated in planning doc

- **§8 metric → test map**:
  | Metric | Test suite |
  |--------|------------|
  | Exactly one Ops topbar + 10 peers | `0100 A` layout sole mount + topbar ids |
  | No stacked Endpoint sub-topbars | `0100 A` no PageTabBar/CostsSubnav under operations/ |
  | Testing via Ops Labs/Media or redirects | `0100 B` 0099 row + `0100 D` Testing redirect-only |
  | Canonical `/operations/{id}` + redirects | `0100 B` matrix builders + redirect pages |
  | Traffic on Observe not Ops | `0100 B` 0098 + `0100 C` Observe active + `0100 E` |
  | CoreMCP naming | `0100 §8` + `OPERATIONS_TOPBAR_LABELS["core-mcp"]` |
  | Anti-phantom Hard Rule #22 | `0100 A` full tree mount scan |
  | Header peer titles (residual fix) | `0100 E` resolveDeepHeaderTitleFallback |

- **Landed peers asserted**: all 10 — endpoints, core-mcp, agents, cloud-agents, a2a-acp-bridge, skills, integrations, memory, labs, media (plus 0098 Traffic→Observe, 0099 Testing retire)

- **Residuals**: **None** for required 0096–0099 rows or topbar peers. Soft residual (out of gate product scope): nested `plugins/[name]/config` deep route archive; CommandPalette some legacy hrefs still redirect shells (0099 note).

- **Command output**:
  ```
  node --import tsx/esm --test tests/unit/ui/epic20-ops-chrome-gate-0100.test.ts
  ℹ tests 26 | pass 26 | fail 0

  node --import tsx/esm --test tests/unit/ui/epic20-*.test.ts
  ℹ tests 244 | pass 244 | fail 0

  npm run typecheck:core
  > tsc --pretty false -p tsconfig.typecheck-core.json  (exit 0)
  ```

- **Changelog**: `[Unreleased] Added` — EPIC-20 Ops chrome/redirect/sidebar gate (Task 0100 / T20-O)

- **Agente / data**: builders (gt-ts-engineer) / 2026-07-20
- **Lane**: `docs/tasks/03-review/` after frontend-quality review **100** (2026-07-20)

- **Exit conditions**:
  - [x] Gate test file encodes chrome ≤1 + redirects + Operations active + no-new-leaf + Traffic→Observe
  - [x] Required rows 0096–0099 green
  - [x] Residuals listed (none required)
  - [x] Unit tests pass
  - [x] typecheck:core clean
  - [x] EPIC-20 §8 metrics mapped / checked
  - [x] CHANGELOG Unreleased entry
  - [x] Completion Evidence filled
  - [x] Reviewed 100 → `03-review` (no git / no :21000)

---

## 🔍 Review Ledger

| Field | Value |
|-------|--------|
| **Reviewer** | `gt-frontend-quality-reviewer` (parent `builders`) |
| **Veredito** | `ACCEPTED_100` |
| **Score** | `100/100` |
| **Report** | [`docs/reports/reviews/2026-07-20-task-0100-epic20-ops-chrome-gate-review.md`](../../reports/reviews/2026-07-20-task-0100-epic20-ops-chrome-gate-review.md) |
| **Previous Reports** | none (first formal review) |
| **Lane** | → `03-review` |
| **Notas** | Gate 26/26: chrome ≤1, 0096–0099 redirects, Ops sidebar active, Testing redirect-only, Traffic→Observe, Header 10 peer titles (no `/operations/` catch-all). Soft residuals: palette legacy extras, `[segment]` placeholder fallthrough, fixture PRIMARY_ITEMS drift hygiene. |
