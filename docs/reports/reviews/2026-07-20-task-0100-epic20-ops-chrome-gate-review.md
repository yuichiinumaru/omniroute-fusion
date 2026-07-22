# Review Report: Task 0100 — EPIC-20 T20-O Ops Chrome / Redirect / Sidebar Gate — Frontend Quality (2026-07-20)

## Review Lineage

- **Current task**: Task 0100 (`omniroute-epic20-ops-chrome-tests-gate`); live path at review start: `docs/tasks/02-doing/0100-omniroute-epic20-ops-chrome-tests-gate.md`
- **Previous reports**: none found for 0100 (first formal review)
- **Related context**:
  - EPIC-20 §7 T20-O + §8 success metrics; Hard Rules #22–#23
  - Hard deps: **0086** SSoT, **0087** shell, **0096–0099** Labs/Media/Traffic/Testing rows
  - Peer fusion pages 0088–0097 (landed content under `/operations/*`)
  - Prior anti-phantom patterns: observe-hub-sidebar, sidebar-route-match, EPIC-19 chrome gates
- **Review mode**: `initial` (frontend-quality + tsjs + code-quality)
- **Reviewer**: `gt-frontend-quality-reviewer` (parent agentID=`builders`)
- **Skills**: `code-quality-harness` + `frontend-quality-harness` + `tsjs-harness`
- **Report date**: 2026-07-20
- **Constraints honored**: no git; no `:21000`

## Score And Verdict

- **Score**: `100/100`
- **Verdict**: `ACCEPTED_100` / `PASS_PERFECT`
- **Lane recommendation**: move to `docs/tasks/03-review/` (S=100)

### Dual Score (verification gate)

| Dimension | Score | Notes |
|-----------|-------|-------|
| local_implementation | 100 | Gate suite encodes A–E + §8 map; imports 0086 SSoT; Header residual fix wired |
| runtime_enforcement | 100 | Layout sole `OperationsTopbar` mount; redirect pages call builders; matcher lights Operations/Observe; 26/26 green this session |

## Axiom Compliance (tsjs)

| Axiom | Status | Notes |
|-------|--------|-------|
| Type Purity | ✅ | Gate imports typed `OperationsTopbarId` / matrix rows; pure helpers |
| Boundary Integrity | ✅ | Navigation/chrome SSoT only — no authz/API surface change |
| Async Determinism | ✅ | Static FS + pure resolver unit tests; no floating promises |
| Immutability | ✅ | Consumes frozen `OPERATIONS_*` constants; no forked magic path sets for matrix `to` |
| State Exclusivity | ✅ | Traffic is Observe-only; Testing is redirect-only; no dual-hub states |

## Frontend quality (task-owned)

| Dimension | Status | Notes |
|-----------|--------|-------|
| Visual hierarchy | ✅ | Single Ops L1 strip; peer labels from `OPERATIONS_TOPBAR_LABELS` |
| Responsive layout | ✅ | Existing `HUB_SUBNAV_*` + horizontal scroll shell unchanged |
| Keyboard / focus | ✅ | Topbar peers remain `Link` + `focus-ring` (0087 ownership; gate does not regress) |
| Semantics / a11y | ✅ | `nav aria-label="Operations navigation"`; `aria-current` on active peer |
| Motion discipline | ✅ | No new decorative motion |
| Performance | ✅ | Gate is unit/static; no extra client chrome mounts |
| Single-topbar law (HR #22) | ✅ | Layout-only `OperationsTopbar`; full-tree scan forbids re-mount / PageTabBar / CostsSubnav |
| Self-evident paths (HR #23) | ✅ | `/operations/{id}` builders + Header peer titles not shadowed by catch-all |

## Rubric snapshot

| Dimension | Score | Notes |
| --- | --- | --- |
| Chrome mount ≤1 Ops hub topbar | 100 | layout sole mount + tree scan + Labs/Media anti-stack |
| 10 peers landed | 100 | `LANDED_PEER_FILES` + filesystem; all 10 topbar ids |
| Redirect matrix SSoT | 100 | every `to` via builders; 0096–0099 required rows + pages |
| Sidebar Operations active | 100 | hub + 10 peers → `/operations`; wrong leaves excluded |
| Traffic → Observe active | 100 | frozen path + alias; not Operations topbar peer |
| Testing gone (redirect-only) | 100 | server redirect; no client launchpad |
| No new primary leaves | 100 | forbidden list + `EPIC20_FORBIDDEN_PRIMARY_LEAF_IDS` |
| Header peer titles | 100 | `resolveDeepHeaderTitleFallback` all 10; no `startsWith("/operations/")` catch-all |
| EPIC-20 §8 metrics | 100 | planning checkboxes + gate §8 suite map |
| CHANGELOG Unreleased | 100 | Task 0100 / T20-O entry present |
| Tests / typecheck / lint | 100 | 26/26 gate; related peers green; typecheck 0; eslint 0 |
| Scope discipline | 100 | verification-first; minimal Header glue only |

## Contract Compliance (Exit Conditions)

| Exit / MUST | Status | Live proof |
| --- | --- | --- |
| Gate encodes chrome ≤1 + redirects + Ops active + no-new-leaf + Traffic→Observe | ✅ | suites A–E in `epic20-ops-chrome-gate-0100.test.ts` |
| 0096–0099 rows green (not residual) | ✅ | B matrix + redirect pages; D Testing; E Observe Traffic |
| Residuals listed | ✅ | Evidence: none required; soft nested plugins config + palette leftovers |
| Unit tests pass (26) | ✅ | **26 pass / 0 fail** this session |
| typecheck:core | ✅ | exit 0 this session |
| lint on gate + Header | ✅ | eslint `--max-warnings=0` exit 0 |
| §8 metrics mapped / checked | ✅ | EPIC-20 planning checkboxes + §8 suite |
| CHANGELOG Unreleased | ✅ | Task 0100 / T20-O |
| Completion Evidence filled | ✅ | task body |
| No cargo exits; no :21000 | ✅ | |

### Task checklist (A–E)

| Requirement | Status | Notes |
|-------------|--------|-------|
| A Chrome mount ≤1 + SSoT test hooks | ✅ | `data-operations-topbar` / `data-testid="operations-topbar"` |
| A Labs no L1 SearchTools/Studio stack | ✅ | Labs client scan |
| A Media modality strip not hub topbar | ✅ | no Ops topbar markers in Media client |
| B Matrix `to` via builders | ✅ | allowed set = hub + 10 peers + traffic Observe path |
| B Labs/Media/Traffic/Testing rows | ✅ | ownerTask 0096–0099 |
| B Redirect pages use builders | ✅ | playground…testing + traffic-inspector |
| C Operations active on `/operations/*` | ✅ | getActiveSidebarHref |
| C Traffic lights Observe | ✅ | activity + alias |
| D No forbidden primary leaves | ✅ | extended + EPIC20 forbidden set |
| D Testing redirect-only | ✅ | no `use client` / TestingHubClient on page |
| E Header all 10 peer titles | ✅ | pure exported resolver |
| E No code-level `/operations/` catch-all shadow | ✅ | hub root exact match only |

### Chrome matrix (verified)

| Route family | Ops hub topbar mounts | Notes |
|--------------|----------------------|-------|
| `operations/layout.tsx` | **1** | sole `<OperationsTopbar />` |
| peer content under `operations/**` | **0** re-mounts | full tree scan excl. layout/topbar |
| Labs content | **0** L1 SearchTools/Studio | inline mode chrome allowed |
| Media content | **0** hub topbar markers | modality strip = content |
| Observe hub | **0** Ops topbar | Observe subnav count **1** |
| `/dashboard/testing` | **0** | redirect-only |

### Anti-hallucination guardrails

| Guard | Status |
| --- | --- |
| Do not mark complete if 0096–0099 residual-skipped | ✅ rows + pages asserted |
| Do not invent redirect targets outside builders | ✅ B allowedTo set |
| Do not count Media modality as Ops hub topbar | ✅ A Media test |
| Do not add primary leaves to pass tests | ✅ D asserts absence |
| PORT 21000 untouched | ✅ |

## Evidence Commands (this session)

```bash
node --import tsx/esm --test tests/unit/ui/epic20-ops-chrome-gate-0100.test.ts
# ℹ tests 26 | pass 26 | fail 0

node --import tsx/esm --test \
  tests/unit/ui/epic20-ops-chrome-gate-0100.test.ts \
  tests/unit/ui/epic20-retire-testing-0099.test.ts \
  tests/unit/ui/epic20-traffic-observe-0098.test.ts \
  tests/unit/ui/epic20-media-ops-0097.test.ts \
  tests/unit/ui/epic20-operations-matrix-0086.test.ts
# ℹ tests 93 | pass 93 | fail 0

node --import tsx/esm --test tests/unit/sidebar-route-match.test.ts
# ℹ tests 11 | pass 11 | fail 0

npm run typecheck:core
# → exit 0

npx eslint --max-warnings=0 \
  tests/unit/ui/epic20-ops-chrome-gate-0100.test.ts \
  src/shared/components/Header.tsx \
  "src/app/(dashboard)/operations/layout.tsx" \
  "src/app/(dashboard)/operations/OperationsTopbar.tsx"
# → exit 0
```

### Live Header resolver spot-check (this session)

```
hub /operations → Operations
all 10 peers → OPERATIONS_TOPBAR_LABELS[id]
/dashboard/testing → Labs
/operations/not-a-peer → null (no catch-all shadow; falls to sidebar prefix)
```

## Findings

### Blocking

- none

### Debt / Improvement (not scored — residuals / hygiene)

| ID | Severity | Classification | Notes |
|----|----------|----------------|-------|
| R1 | INFO | SUPERSEDED / residual shell | `operations/[segment]/page.tsx` still falls through to `OperationsSegmentPlaceholder` for non-special-cased ids; **all 10 peers have dedicated static content** (a2a-acp-bridge via dynamic mount of real stack page). Dead residual path — do not reintroduce placeholder product UI. |
| R2 | INFO | EXTERNAL_BLOCKER / optional hygiene | `CommandPalette` `operationsHubExtras` still includes some legacy hrefs (e.g. `/dashboard/a2a`) that hit redirect shells. Explicit soft residual from 0099; not required by 0100 matrix. |
| R3 | INFO | Improvement (non-blocking) | Gate uses a local `PRIMARY_ITEMS` fixture for `getActiveSidebarHref` rather than importing production `PRIMARY_SIDEBAR_ITEMS` — currently **byte-aligned** with live primaries; prefer import if fixture drift becomes a risk. |
| R4 | INFO | docs hygiene | EPIC-20 UI.md banner language may still say “planned” from 0086 era (carry from 0099 R3). Out of binary gate scope. |

### Regressions

- none in 0100-owned chrome/redirect/sidebar/Header contracts

## Diff Ownership

| Surface | Owner |
|---------|-------|
| `tests/unit/ui/epic20-ops-chrome-gate-0100.test.ts` | **0100** |
| `Header.tsx` peer deep meta + `resolveDeepHeaderTitleFallback` | **0100** (residual fix; peers retargeted) |
| EPIC-20 §8 checkboxes / §8 map suite | **0100** |
| CHANGELOG Unreleased gate note | **0100** |
| `epic20Operations.ts` matrix / builders | **0086** (consumed) |
| Ops layout + `OperationsTopbar` | **0087** (consumed; mount ≤1 proven) |
| Labs / Media / Traffic / Testing product | **0096–0099** (rows asserted) |
| Fusion peer page bodies | **0088–0095** (landed file existence only) |

## Architecture Notes (durable)

1. **Binary anti-phantom gate is mandatory for hub reforms** — destination moves without mount-count + sidebar active + Header title order recreate EPIC-19 multi-topbar class failures.
2. **Header deep meta must list every Ops peer before hub-root** — never `p.startsWith("/operations/")` as a catch-all (shadows peer titles). Prefer exported pure resolver for unit proof.
3. **Redirect matrix `to` must only be builder output** — gate fails ad-hoc destination strings.
4. **Traffic is Observe chrome**, not an Operations topbar peer; Testing is **redirect-only** to Labs.
5. **Media modality strip is content**, not a second hub topbar — do not count it in Ops mount ≤1.

## Sabotage / regression sensitivity (reviewer note)

Without deliberately breaking production (read-only review), the suite structure would fail if:

- A second `<OperationsTopbar` appeared under any peer file
- A 0096–0099 matrix `to` diverged from builders
- Testing page reintroduced a client hub
- Header reintroduced `/operations/` catch-all
- Operations stopped lighting for `/operations/labs` etc.

This meets verification-gate intent for a P0 chrome closeout.

## Verdict Detail

Task 0100 delivers the final EPIC-20 binary gate: **26/26** tests prove chrome ≤1, redirect matrix wiring for Labs/Media/Traffic/Testing, Operations sidebar active, no new leaves, Traffic on Observe, Testing retired, and Header peer titles without catch-all shadow. Product glue limited to Header residual fix. Score **100**. Move to `03-review`.

## Path to 100

- Already **100**. No path-to-100 work required.
- Optional non-blocking hygiene: R2 palette legacy hrefs; R3 import production sidebar primaries into gate fixture; R4 UI.md EPIC-20 status banner.
