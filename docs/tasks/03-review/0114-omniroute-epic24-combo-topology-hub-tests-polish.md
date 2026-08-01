# Task 0114: EPIC-24 T24-C — Hub discoverability tests + polish

> **Status**: `[~]` In Progress  
> **Priority**: 🟢 P2  
> **Type**: `testing` + `feature` polish  
> **Origin**: EPIC-24 · anti-phantom chrome + docs  
> **Depends on**: **0113** (route + subnav id exist)  
> **Parallelism**: after 0113  
> **Review routing**: frontend-quality  

---

## Objective

Lock Routing hub discoverability for Topology (single topbar, peer matrix, no dual chrome), minor UX polish (empty copy, a11y labels), and point docs/ideas at shipped surface. No new product scope (no accounts/live).

---

## Background Context

### Precedents:
- `tests/unit/*routing-hub*`, `fusions-routing-hub-matrix*`, epic19/20 chrome gates  
- EPIC-24 D1/D10  

---

## Test Requirements

- [x] Topology appears in RoutingHubSubnav LINKS with expected href  
- [x] Mounting topology page yields **one** `[data-routing-hub-subnav]`  
- [x] Active id is topology when on that route  
- [x] Command palette includes topology entry (if pattern tested elsewhere)  
- [x] Graph builder still green from 0112  

---

## Exit Conditions

- [x] Hub/chrome unit tests PASS  
- [x] `ideas.md` §2 links EPIC-24 / tasks  
- [x] Optional one-liner in `docs/guides/UI.md` peer list if docs-sync expects it  
- [x] Changelog ledger  
- [x] Epic-24 DoD checklist updated when this ships  

---

## Details

### What

Subtasks:
- [x] **Ler** existing hub matrix tests; 0113 route  
- [x] Extend or add `tests/unit/ui/*combo-topology*` / routing hub matrix  
- [x] a11y: dropdown `aria-label`, nav already labeled  
- [x] Polish empty states if gaps  
- [x] Update `ideas.md`  
- [x] **Regressão**  

### Where

| Arquivo | Propósito |
|---------|-----------|
| `tests/unit/ui/*` hub matrix | **Modificar/Criar** |
| `docs/tasks/00-planning/ideas.md` | **Modificar** |
| `docs/guides/UI.md` | **Modificar** if needed |
| `docs/tasks/00-planning/EPIC-24-*.md` | **Modificar** status when done |

### How

Copy epic20/19 chrome test style: render shell, query subnav links, assert count ≤ 1 hub strip.

### Why

Prevents multi-topbar regression and documents discoverability.

---

## ⛔ Anti-Hallucination Guardrails

> [!CAUTION]
> DO NOT expand MVP to live WS or account nodes.  
> PORT 21000 = production.

---

## 🛡️ Compliance Checklist

- [x] **Doc Accuracy**: grepped paths  
- [x] **Archive Protocol**: N/A  

---

## 📋 Completion Evidence

- **Arquivos**:
  - `tests/unit/ui/routing-hub-discoverability-0025.test.ts` (modified)
  - `tests/unit/ui/fusions-routing-hub-matrix-0075.test.ts` (modified)
  - `tests/unit/ui/combo-topology-routing-hub-matrix-0114.test.ts` (created)
  - `docs/guides/UI.md` (modified)
  - `.changelog/20260725-140000-0114-epic24-combo-topology-hub-tests-polish-builders.md` (created)
  - `docs/tasks/00-planning/EPIC-24-omniroute-combo-topology.md` (modified)
- **Testes**:
  - `node --import tsx/esm --test tests/unit/ui/combo-topology-routing-hub-matrix-0114.test.ts` (5 PASS)
  - `node --import tsx/esm --test tests/unit/ui/routing-hub-discoverability-0025.test.ts` (14 PASS)
  - `node --import tsx/esm --test tests/unit/ui/fusions-routing-hub-matrix-0075.test.ts` (5 PASS)
  - `node --import tsx/esm --test tests/unit/combo-topology-graph.test.ts` (12 PASS)
  - `node --import tsx/esm --test tests/unit/ui/combo-topology-ui-route-0113.test.ts` (13 PASS)
  - `npm run typecheck:core` (PASS)
  - `npx eslint --max-warnings=0 tests/unit/ui/combo-topology-routing-hub-matrix-0114.test.ts tests/unit/ui/routing-hub-discoverability-0025.test.ts tests/unit/ui/fusions-routing-hub-matrix-0075.test.ts` (PASS, 0 errors, 0 warnings)
- **Changelog**: `.changelog/20260725-140000-0114-epic24-combo-topology-hub-tests-polish-builders.md`
- **Agente**: gt-ts-engineer
- **Data**: 2026-07-25  

---

## 🔍 Review Trail

- **Reviewer**: `gt-ts-code-reviewer` (independent · Mode=BUILDER_CONTEXT per `review-lane-promotion.md` §2)  
- **Data**: 2026-07-25  
- **Veredito**: **APROVADO — Score S = 100/100** (after path-to-100 patches applied by reviewer per the lane-promotion rule)

### Audit scope (zero-tolerance, anti-phantom)

Read in full: task file, three test files (`combo-topology-routing-hub-matrix-0114.test.ts`, `routing-hub-discoverability-0025.test.ts`, `fusions-routing-hub-matrix-0075.test.ts`), `.changelog/20260725-140000-0114-…md`, `docs/guides/UI.md` (417 lines), `src/app/(dashboard)/dashboard/combos/topology/ComboTopologyClient.tsx` (488 lines, to verify the 0114 Suspense-mutual-exclusivity test), `docs/tasks/00-planning/EPIC-24-…md` (DoD rows), `docs/tasks/00-planning/ideas.md` (§2 EPIC-24 row). Loaded `ts-rules` skill (5 axioms). Verified all peer files exist via `existsSync` (the same probe the tests use). Checked the `RoutingHubSubnav.tsx` topology tokens (`id: "topology"`, `href: "/dashboard/combos/topology"`) the tests assert against.

### Axiom compliance (tier-3 deep reasoning on the 0114-owned test file)

| Axiom | Verdict | Evidence |
|-------|---------|----------|
| 1. Zero `any` | PASS | `grep` for `:\s*any(\b\|\[)\|<any>\|as any\|any\[\]` on all three test files → `NO_ANY_FOUND`. |
| 2. No unsafe `as T` / non-null `!` | PASS (after patch) | The lone `as unknown as <element>` in test #5 is a sound double-cast (string → unknown → tuple-element) anchored by a runtime `.includes()` scan — `// SAFETY:` comment added explaining why the cast does not bypass a runtime guard. Pre-existing `devtoolsBlock!` in 0075:152 had a checked-invariant `assert.ok` above but no `// SAFETY:` — **comment added by reviewer** (carry-forward polish, not 0114's defect to fix in logic). |
| 3. Async safety | N/A | Pure static-source assertion tests; zero Promises / event-loop suspension points. |
| 4. Prototype pollution | PASS | No `Object.assign`/`merge` on untrusted data; the only `Record<string, unknown>` reading is via `read()` of local files (trusted). No SSRF / no eval / no `new Function`. |
| 5. Error handling | PASS | `existsSync` + `readFileSync` + `assert.ok`/`equal` surface failures with descriptive messages; no silent `catch`. |

### Hotspot & contract checks (independently re-derived — not relayed from Completion Evidence)

- **Anti-phantom chrome (Hard Rule #22)**: `ComboTopologyClient.tsx` renders `<RoutingHubSubnav active="topology" />` exactly twice in the source — once in the main `ComboTopologyClientInner` (line 398) and once in the `<Suspense fallback>` (line 478). These are **structurally mutually exclusive** (React's Suspense renders fallback XOR inner, never both). Test #2 `subnavMatches.length === 2` with the comment "One in Suspense fallback + one in main container (mutually exclusive render branches)" is the **correct** static-source matrix test — not a phantom-chrome regression. The 0113 sibling test (`combo-topology-ui-route-0113.test.ts`) reinforces this with three explicit anti-phantom assertions (16/16 PASS this session). ✅
- **Single topbar peer matrix (Routing hub)**: Test #1 iterates 6 peer routes (`combos`, `live`, `topology`, `fusions`, `compression-settings`, `compression-studio`) and asserts each mounts `<RoutingHubSubnav>` with the exact `active="<id>"`. Direct file-presence + content verification via `existsSync` + `readFileSync`. ✅
- **Discoverability (topbar + palette)**: Test #3 verifies `RoutingHubSubnav.tsx` contains the topology `id`/`href`/`label`/`icon` (`account_tree`) tokens; Test #4 verifies `CommandPalette.tsx` carries `href: "/dashboard/combos/topology"` + `id: "combos-topology"`. Re-grepped the live `RoutingHubSubnav.tsx` directly — both tokens present (1 occurrence each). ✅
- **No-new-leaf (Hard Rule sidebar discipline)**: Test #5 asserts `PRIMARY_SIDEBAR_ITEM_IDS.includes("topology") === false`. Topology is correctly an in-page Routing hub peer, NOT a primary sidebar leaf. ✅
- **0112 graph builder regression**: `tests/unit/combo-topology-graph.test.ts` → **12/12 PASS** (~100ms). TR #4 "Graph builder still green from 0112" satisfied. ✅
- **0113 sibling regression**: `tests/unit/ui/combo-topology-ui-route-0113.test.ts` → **16/16 PASS** (~151ms). Note: task Completion Evidence claimed "13 PASS" for this file — actual is 16. Stale evidence field only; not a code defect. ✅
- **Dependency state**: 0113 task file remains in `02-doing/` (not yet reviewed). The EPIC-24 DoD master gate at `EPIC-24-…md:106` (`- [ ] 0112–0114 done + reviewed`) is **correctly left open** — 0113's independent review is still outstanding. The other EPIC-24 DoD rows (`Hub matrix green`, `Changelog ledger entry`, `ideas.md §2 points to this epic`, `Topology usable for a nested combo-ref chain`) are all `[x]`. Task 0114 exit-condition `[x] Epic-24 DoD checklist updated when this ships` is **accurate** — the checklist WAS updated (rows flipped to `[x]`); it was not closed, and the wording ("updated", not "closed" or "all rows checked") matches the actual ship state. Not a phantom completion.

### Validation gates re-run this session (observed, not inferred)

| Gate | Command | Result |
|------|---------|--------|
| 0114 unit | `node --import tsx/esm --test tests/unit/ui/combo-topology-routing-hub-matrix-0114.test.ts` | **5/5 PASS** (~136ms, exit 0) — post-SAFETY-patch |
| 0025 unit | `node --import tsx/esm --test tests/unit/ui/routing-hub-discoverability-0025.test.ts` | **14/14 PASS** (~94ms, exit 0) |
| 0075 unit | `node --import tsx/esm --test tests/unit/ui/fusions-routing-hub-matrix-0075.test.ts` | **5/5 PASS** (~140ms, exit 0) — post-SAFETY-patch |
| 0113 sibling regression | `node --import tsx/esm --test tests/unit/ui/combo-topology-ui-route-0113.test.ts` | **16/16 PASS** (~151ms, exit 0) |
| 0112 graph regression | `node --import tsx/esm --test tests/unit/combo-topology-graph.test.ts` | **12/12 PASS** (~100ms, exit 0) |
| Typecheck (core) | `npm run typecheck:core` | **clean** (no diagnostics, exit 0) — pre and post patch |
| Lint (3 test files) | `npx eslint --max-warnings=0 …0114… …0025… …0075…` | **clean** (exit 0, 0 errors, 0 warnings) |
| Lint (2 patched files post-SAFETY) | `npx eslint --max-warnings=0 …0114… …0075…` | **clean** (`EXIT=0`) |

### Path-to-100 patches applied by reviewer (per `review-lane-promotion.md` §2)

1. **`tests/unit/ui/combo-topology-routing-hub-matrix-0114.test.ts`** (the 0114-owned file) — added a `// SAFETY:` block to the `as unknown as <element>` cast in test #5 (`anti-new-leaf: topology is NOT added as a primary sidebar leaf`). The cast was already sound (double-cast through `unknown` + runtime `.includes()` scan), but ts-rules axiom 1 requires the *documentation* of sound casts. The added comment explains: (a) why the cast exists (the readonly tuple element type excludes "topology", so `.includes("topology")` doesn't typecheck), (b) why `as unknown as <element>` is sound (the run-time `.includes()` walks the actual tuple values; the value under test is the literal "topology" already in scope), and (c) that the assertion verifies the EXACT opposite of what a naive reader might fear (it asserts NOT a member, not that it is). **No logic change.**
2. **`tests/unit/ui/fusions-routing-hub-matrix-0075.test.ts`** (a 0114-modified sibling) — added a `// SAFETY:` block above `devtoolsBlock![1]` (line 152). The non-null assertion was already ts-rules-legal ("non-null assertion immediately preceded by a checked invariant" — `assert.ok(devtoolsBlock, …)` on the prior line); the rule additionally requires a `// SAFETY:` comment proving the value cannot be null, which was missing. This is a polish-comment patch on a pre-existing line that 0114 has a `Where`-table claim on (it's listed in 0114 Completion Evidence as "modified"). **No logic change.**

### Residual observations (non-blocking, carry-forward)

- **0113 sibling review is outstanding.** The EPIC-24 master gate (`0112–0114 done + reviewed`) correctly stays `- [ ]` until 0113 also clears an independent review. I did not flip that checkbox — doing so would itself be a phantom completion.
- **Pre-existing carry-forward**: `tests/unit/ui/routing-hub-discoverability-0025.test.ts:11` imports `countPresetVisibleLeaves` from `sidebarVisibility`. Test passed (14/14), so the symbol resolves. No action.
- **Task evidence freshness nudge**: The Completion Evidence field claims 0113 test count = 13 PASS; actual = 16 PASS. Cosmetic only; the engineer likely ran an earlier state of the 0113 test file. Not blocking.

### Anti-phantom-completion check

- All gate outputs above were read directly from the Node test runner stdout (`pass N, fail 0`) and from the eslint subshell `EXIT=0` echo — none relayed from the engineer's Completion Evidence.
- File-presence checks used the same `existsSync` path the tests themselves use, re-verified via `ls -la` on the nine peer/component files.
- The Suspense-mutual-exclusivity test #2 was *re-derived* by reading `ComboTopologyClient.tsx` directly (lines 398 main mount, 478 fallback mount) — confirmed structurally mutually exclusive, not a co-mount.
- The EPIC-24 DoD master gate was NOT flipped to `[x]` by me — the wording "updated when this ships" was confirmed accurate (rows 107-110 were updated) without over-claiming the master close row that legitimately waits on 0113.

### Path-tiers

- 71-85 (Good, missing exhaustive match / exhaustive match checks) → 86-99 (Elite): was at 96 pre-patch (two missing `// SAFETY:` comments). Post-patch: 100/100.
- All 5 original Test Requirements (lines 29-34) + 5 hub-matrix-0114 dedicated assertions + cross-task regressions (0025, 0075, 0113, 0112) verified green by direct observation.

### Promotion action

Per `review-lane-promotion.md` §2 ("If S>=90: apply path-to-100 yourself, re-check to 100, then mv the task from 02-doing to 03-review"): file moved from `docs/tasks/02-doing/0114-omniroute-epic24-combo-topology-hub-tests-polish.md` to `docs/tasks/03-review/0114-omniroute-epic24-combo-topology-hub-tests-polish.md`. Wave-level `04-completed/` promotion + EPIC-24 master checkbox close remain deferred until 0113 also clears independent review.
