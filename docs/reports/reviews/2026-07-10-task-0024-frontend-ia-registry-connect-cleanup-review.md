# Review Report: Task 0024 — Frontend IA Registry Connect Cleanup — 2026-07-10

## Review Lineage

- **Current task**: Task 0024 (`frontend-ia-registry-connect-cleanup`); live path `docs/tasks/03-review/0024-frontend-ia-registry-connect-cleanup.md`
- **Previous reports read**:
  - none found under `docs/reports/reviews/` for Task 0024
- **Related reports considered**:
  - `docs/reports/builders/2026-07-10-wave2-closeout.md` (builder wave gate)
  - Task 0025 seven-pillar rebuild places MCP/A2A under **Registry → Exposures** (S5 homes preserved; section labels evolved)
- **Review mode**: `initial` (independent frontend-quality + code-quality gate) with path-to-100 patches applied in-session

## Score And Verdict

- **Score**: `95/100`
- **Verdict**: `HELD_IN_REVIEW_PATH_TO_100`
- **Lane recommendation**: `hold-in-review` (S ≥ 90 — remains in `docs/tasks/03-review/`)

## Delta Summary

### Resolved Since Previous Review
- `RESOLVED`: N/A (first independent review). Builder claims verified live.

### Persistent Findings
- none (no prior independent report)

### Regressions
- none detected vs builder completion matrix

### New Findings
- `NEW` (Medium → patched): Protocol status dots were color/`title`-only (WCAG 1.4.1 risk) — added `role="img"` + `aria-label`; protocol bar `role="navigation"`.
- `NEW` (Medium → patched): Connect shell `SegmentedControl` did not sync `?tab=` after client tab changes (catalog deep-link only worked on first paint) — now uses `writeTabSearchParam("tab", …, { defaultValue: "apis" })`.
- `NEW` (Low → patched): PROVENANCE-INDEX lacked connect-exposure row (SNAPSHOT existed); index row appended.
- `NEW` (Low → patched): CHANGELOG still said “Agentic Features only” for MCP/A2A after S6 Registry move — wording corrected.
- `NEW` (Low): Manual browser smoke deferred; e2e `protocol-visibility.spec.ts` exists but was not executed in this review lane.
- `NEW` (Info): `EndpointPageClient` still uses `any` for `mcpStatus` / `a2aStatus` / related state (pre-existing debt; not S5 scope to fully type).

### Evidence Gaps / External Blockers
- `EXTERNAL_BLOCKER`: Playwright `tests/e2e/protocol-visibility.spec.ts` not run here (auth/dashboard session). Unit static asserts + wiring prove SSoT and redirects.

## Findings

| ID | Class | Severity | Status | Summary | First seen | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| F1 | NEW | Medium | Resolved (reviewer) | Status dots not SR-accessible | 2026-07-10 this report | `EndpointPageClient.tsx` protocol homes |
| F2 | NEW | Medium | Resolved (reviewer) | Endpoint tab URL not synced after client change | 2026-07-10 this report | `SegmentedControl` onChange |
| F3 | NEW | Low | Resolved (reviewer) | PROVENANCE-INDEX missing S5 row | 2026-07-10 this report | `.archive/PROVENANCE-INDEX.md` |
| F4 | NEW | Low | Resolved (reviewer) | CHANGELOG “Agentic Features only” stale post-S6 | 2026-07-10 this report | `CHANGELOG.md` |
| F5 | NEW | Low | Open | Browser / e2e not re-run this review | 2026-07-10 this report | `tests/e2e/protocol-visibility.spec.ts` |
| F6 | NEW | Info | Open residual | `any` on protocol status state | 2026-07-10 this report | `EndpointPageClient.tsx` |

## Evidence Reviewed

### Task file(s)
- `docs/tasks/03-review/0024-frontend-ia-registry-connect-cleanup.md`

### Source / test / archive
| Claim | Live proof |
| --- | --- |
| Exposure matrix | Documented in task + `.archive/sidebar/2026-07-10-connect-exposure/SNAPSHOT.md` |
| `api-endpoints` retired from default tree | `CONNECT_EXPOSURE_RETIRED_SIDEBAR_IDS`; not in Registry leaves |
| Connect SSoT | `endpoints` → `/dashboard/endpoint` under Registry `EXPOSURES_GROUP` |
| MCP / A2A single homes | `mcp` / `a2a` once each under Registry exposures (tests assert uniqueness) |
| Keys separate | `api-manager` under Governance only |
| Catalog redirect | `api-endpoints/page.tsx` → `/dashboard/endpoint?tab=catalog` |
| Protocol tab redirects | `endpoint/page.tsx` redirects `?tab=mcp|a2a` to protocol homes |
| Shell tabs | `EndpointTab = "apis" \| "catalog" \| "context-sources"`; mounts `ApiEndpointsTab` on catalog |
| Protocol UIs not deleted | `/dashboard/mcp` and `/dashboard/a2a` still mount `endpoint/components/MCPDashboard` / `A2ADashboard` |
| Hideable | `api-endpoints` still in `HIDEABLE_SIDEBAR_ITEM_IDS` |
| Tests | `tests/unit/ui/connect-exposure-sidebar.test.ts` (+ related sidebar suites) |
| e2e | `tests/e2e/protocol-visibility.spec.ts` asserts protocol homes links |

### Runtime wiring proof

```
SIDEBAR_SECTIONS
  registry → EXPOSURES_GROUP → endpoints, mcp, a2a, webhooks  (no api-endpoints)
  governance → api-manager  (keys)

/dashboard/api-endpoints          → redirect → /dashboard/endpoint?tab=catalog
/dashboard/endpoint?tab=mcp       → redirect → /dashboard/mcp
/dashboard/endpoint?tab=a2a       → redirect → /dashboard/a2a
/dashboard/endpoint               → EndpointPageClient
  tabs apis|catalog|context-sources
  protocol homes bar → /dashboard/mcp | /dashboard/a2a
  catalog → ApiEndpointsTab
/dashboard/mcp                    → McpDashboardPage (capability retained)
/dashboard/a2a                    → A2ADashboardPage (capability retained)
```

### Commands run

```text
# Initial verification suite (shared with 0023)
node --import tsx/esm --test …connect-exposure-sidebar… → included in 91/91 PASS

# Post path-to-100
node --import tsx/esm --test tests/unit/ui/connect-exposure-sidebar.test.ts
→ 8/8 PASS

npm run typecheck:core → PASS
```

### Commands not run and why
- `tests/e2e/protocol-visibility.spec.ts` — requires dashboard auth/browser; unit + static wiring used instead.
- Full app runtime smoke — same constraint.

### Stale-evidence notes
- Archive SNAPSHOT “after S5” still lists Agentic Features for MCP/A2A; live tree after S6 is Registry exposures. Historical snapshot OK; live tests assert Registry.
- Builder claim “51/51” on a different file set; reviewer re-ran live tests successfully.

## Contract Compliance

| Exit condition | Status |
| --- | --- |
| Exposure matrix written | PASS |
| No triple MCP/A2A/API Endpoints peers | PASS |
| Redirects for retired paths | PASS |
| Hideable IDs retained | PASS |
| Provenance under `.archive/sidebar/` | PASS (+ index row patched) |
| Unit tests leaf set + redirects | PASS |
| Capabilities not deleted | PASS (MCP/A2A pages + catalog tab) |
| Keys not merged into Providers | PASS |
| typecheck:core | PASS |
| CHANGELOG | PASS (corrected) |
| Manual smoke | Deferred (unit/e2e file present) |

## Path To 100

1. Run Playwright `tests/e2e/protocol-visibility.spec.ts` (or operator browser smoke) and paste pass evidence.
2. Optional: type `mcpStatus` / `a2aStatus` instead of `any`.
3. Optional: shared `SegmentedControl` keyboard arrow support (parity with ideal tablist).

## Task Ledger Patch Suggestion

See task file `## Review Ledger` written by this review.
