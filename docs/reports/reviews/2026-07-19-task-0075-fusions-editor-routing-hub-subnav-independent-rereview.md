# Independent Re-Review: Task 0075 — Fusions Editor RoutingHubSubnav + Peer Mount Matrix — 2026-07-19

## Review Lineage

- **Current task**: Task 0075 (`omniroute-fusions-editor-routing-hub-subnav`); live path: `docs/tasks/03-review/0075-omniroute-fusions-editor-routing-hub-subnav.md`
- **Previous reports read**:
  - `docs/reports/reviews/2026-07-19-task-0075-fusions-editor-routing-hub-subnav-frontend-quality-review.md` (builders path-to-100 ACCEPT 100)
- **Review mode**: **independent full re-review** (agentID=`reviewers`) — builder claims treated as **untrusted**
- **Reviewer**: independent Frontend Quality Reviewer (`reviewers`)

## Score And Verdict

- **Score**: `100/100`
- **Verdict**: `ACCEPTED_100`
- **Lane recommendation**: `stay-03-review` (ready for parent promote to `04-completed/` when wave policy allows)

### Dual score

| Dimension | Score | Notes |
|-----------|------:|-------|
| `local_implementation` | 100 | Shared `const routingHub = <RoutingHubSubnav active="fusions" />` on loading / load-error / main |
| `runtime_enforcement` | 100 | Source matrix + sabotage; live `:22000` container is **pre-task stale** (Jul-18 build) — not a code defect |

## Adversarial verification (builder claims untrusted)

| Claim | Independent evidence | Result |
|-------|----------------------|--------|
| Editor mounts strip for new + [id] | `FusionEditorClient.tsx:387` + `{routingHub}` ×3; `new/page.tsx` / `[id]/page.tsx` only render client | **PASS** |
| Peer mount matrix | `fusions-routing-hub-matrix-0075.test.ts` **5/5** after path-to-100 (incl. no page-level double-mount) | **PASS** |
| Loading + error keep hub | `{routingHub}` in both branches | **PASS** |
| Anti-new-leaf / no forever-9 | primary id asserts; no `length===9` pin | **PASS** |
| HUB_SUBNAV_* SSoT | `RoutingHubSubnav.tsx` imports shell tokens; editor has no white-on-primary invent | **PASS** |
| 0025 suite still green | **1 fail** in `role presets: minimal < developer` (`minimal 7` vs `developer 6`) — **EPIC-19/0082 preset math**, not 0075 ownership (0075 did not edit presets) | **NOTE** (out of lane) |
| Live UI on :22000 | Authenticated chunk dump: `FusionEditorClient` **loading/main omit strip** — container serves pre-0075 bundle | **STALE DEPLOY** (source OK) |

## Delta Summary

### Resolved Since Previous Review

- Path-to-100 (this re-review): sabotage assert that `new/page.tsx` and `[id]/page.tsx` **must not** import/mount `RoutingHubSubnav` themselves (inherit-only contract).

### Persistent / External

- `:22000` Docker standalone (started Jul-18) does not include residual polish until rebuild/redeploy — **operator deploy lag**, not task code failure. Port **:21000** not touched (AGENTS ban).

## Findings

| ID | Class | Severity | Status | Summary | Evidence |
| --- | --- | --- | --- | --- | --- |
| F1 | RESOLVED | Improvement | Closed | Page-level double-mount sabotage was soft | matrix test now forbids RoutingHubSubnav on new/[id] pages |
| E1 | EXTERNAL | Info | Open | Live :22000 stale vs workspace source | authenticated JS chunk lacks `routingHub` |
| E2 | EXTERNAL | Info | Open | 0025 role-preset order broken by EPIC-19 leaf drop | `minimal 7 !< developer 6` → 0082/preset owners |

## Contract Compliance

| Exit | Status | Evidence |
|------|--------|----------|
| Shared client mounts strip for new + [id] | PASS | `FusionEditorClient` only |
| Loading + error hub reachable | PASS | 3× `{routingHub}` |
| Peer mount matrix | PASS | 0075 test file |
| Anti-new-leaf | PASS | no fusions/labs primary |
| CHANGELOG | PASS | Unreleased Task 0075 bullet |
| No list-card scope creep (0077) | PASS | list page not dual-owned for strip strategy |

## Frontend quality

| Check | Result |
|-------|--------|
| Visual hierarchy | PASS — strip under title row on main; continuous Routing peers |
| A11y | PASS — `nav[aria-label]`, `aria-current`, focus-visible via SSoT |
| No dual-nav / double strip | PASS — no fusions/layout.tsx; list keeps own mount |
| Performance | PASS — static import of existing client subnav |

## Runtime wiring proof (source)

```
/dashboard/fusions/new → FusionEditorClient id="new"
/dashboard/fusions/[id] → FusionEditorClient id={id}
  → routingHub = <RoutingHubSubnav active="fusions" />
  → loading | loadError | main all render {routingHub}
/dashboard/fusions → independent <RoutingHubSubnav active="fusions" />
```

## Commands run (this re-review)

```bash
node --import tsx/esm --test \
  tests/unit/ui/fusions-routing-hub-matrix-0075.test.ts \
  tests/unit/ui/ops-testing-reverse-chrome-0076.test.ts \
  tests/unit/ui/fusions-list-acting-0077.test.ts
# → 23/23 pass (wave suite after path-to-100)
```

Live: `POST /api/auth/login` on `:22000` → GET fusions/new HTML → static chunks show **pre-0075** editor (no routingHub).

## Path To 100

- Applied: inherit-only sabotage on editor pages.
- No further open product items for 0075.

## Task Ledger Patch Suggestion

```markdown
### Latest Review
- **Date**: 2026-07-19
- **Reviewer profile**: independent `reviewers` (Frontend Quality)
- **Score**: `100/100`
- **Verdict**: `ACCEPTED_100`
- **Full report**: `docs/reports/reviews/2026-07-19-task-0075-fusions-editor-routing-hub-subnav-independent-rereview.md`
- **Lane outcome**: stay `03-review`
```
