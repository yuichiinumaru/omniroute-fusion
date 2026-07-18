# Review Report: Task 0024 — Frontend IA Registry Connect Cleanup — Re-audit 2026-07-16

## Review Lineage

- **Current task**: Task 0024 (`frontend-ia-registry-connect-cleanup`); live path at reaudit start: `docs/tasks/03-review/0024-frontend-ia-registry-connect-cleanup.md`
- **Previous reports read**:
  - `docs/reports/reviews/2026-07-11-task-0024-frontend-ia-registry-connect-cleanup-rereview.md` (96/100 APPROVED_REMEDIATION)
  - `docs/reports/reviews/2026-07-11-task-0024-frontend-ia-registry-connect-cleanup-review.md` (84/100 REJECT)
  - `docs/reports/reviews/2026-07-10-task-0024-frontend-ia-registry-connect-cleanup-review.md` (95/100)
- **Related reports considered**:
  - `docs/reports/reviews/2026-07-14-task-0059-operations-hub-ia-review.md` — Operations hub **locks in** dual catalog hrefs
  - Flat primary nav / providers hub evolution (post-S5)
- **Review mode**: `re-review` (adversarial re-audit after IA waves 0056/0059+)
- **Reviewer profile**: `reviewers` (agentID=reviewers)
- **Skills applied**: code-quality-harness, review-report-lineage, tsjs-harness, frontend-quality-harness

## Score And Verdict

- **Score**: `86/100`
- **Verdict**: `REJECTED_TO_DOING`
- **Lane recommendation**: `return-to-doing` (S < 90)

## Delta Summary

### Resolved Since Previous Review

- none new (prior F1 shell-tabs + F2 `?tab=mcp|a2a` unit matrix still green)

### Persistent Findings

- `PERSISTENT` (Low): Playwright `protocol-visibility.spec.ts` / browser smoke still without attached evidence
- `PERSISTENT` (Info): conceptual `EXPOSURES_GROUP` / `REGISTRY_ITEMS` unused by live `SIDEBAR_SECTIONS`

### Regressions

- `REGRESSION` (Medium): **dual catalog homes reintroduced** in the operator-facing Operations hub (Task 0059). Hub cards list both `/dashboard/api-endpoints` **and** `/dashboard/endpoint?tab=catalog` (plus Endpoints → `/dashboard/endpoint`). S5 retired `api-endpoints` as a competing surface; 0059 rediscovers it as a first-class hub card and **unit-tests require both hrefs**.

### New Findings

- `NEW` (Medium / test honesty): `connect-exposure-sidebar.test.ts` only asserts “no mcp/a2a/api-endpoints as **primary peers**”. After 0059, primary discovery is `/dashboard/operations` — dual catalog is invisible to 0024 guards (phantom green).
- `NEW` (Low): `operations-hub-discoverability-0059.test.ts` **required** list hard-codes both catalog URLs, preventing cleanup without updating 0059 tests intentionally.
- `NOTE` (Info): Command palette ops extras correctly omit a separate `api-endpoints` item (only `endpoints` + mcp + a2a) — palette is cleaner than the hub cards.

### Evidence Gaps / External Blockers

- `EXTERNAL_BLOCKER` (accepted residual): e2e browser smoke still not executed

## Findings

| ID | Class | Severity | Status | Summary | First seen | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| F1 | RESOLVED | High | Still resolved | Shell tabs S5 contract | 2026-07-11 | `EndpointTab = apis\|catalog\|context-sources`; shell-tabs suite green |
| F2 | RESOLVED | Medium | Still resolved | `?tab=mcp\|a2a` redirects unit-asserted | 2026-07-11 | `endpoint/page.tsx` + connect-exposure tests |
| F3 | PERSISTENT | Low | Accepted residual | Browser/e2e not evidenced | 2026-07-10 | `tests/e2e/protocol-visibility.spec.ts` |
| F4 | PERSISTENT | Info | Accepted residual | Dead EXPOSURES_GROUP wiring | 2026-07-11 | not in `SIDEBAR_SECTIONS` |
| F5 | REGRESSION | Medium | **Open** | Dual catalog exposure via Operations hub cards | 2026-07-16 this reaudit | `operationsHub.ts` links `api-endpoints` + `api-catalog`; 0059 test requires both |
| F6 | NEW | Medium | **Open** | 0024 tests do not guard hub dual homes | 2026-07-16 | `connect-exposure-sidebar.test.ts` primary-only policy |

## Contract Compliance (live)

| Exit / MUST | Status | Live proof |
| --- | --- | --- |
| Exposure matrix documented | ✅ | Task Completion Evidence + archive SNAPSHOT |
| No triple MCP/A2A/API Endpoints **primary sidebar peers** | ✅ (letter) | `PRIMARY` has neither mcp/a2a/endpoints/api-endpoints |
| Single clear operator home per concern | ❌ (spirit) | Operations hub lists Endpoints + API Endpoints + API Catalog |
| Redirects for retired paths | ✅ | `api-endpoints/page.tsx` → `endpoint?tab=catalog`; tab=mcp/a2a → protocol homes |
| Hideable IDs retained | ✅ | `CONNECT_EXPOSURE_RETIRED_SIDEBAR_IDS`, mcp, a2a, endpoints, api-manager |
| Keys separate (`api-manager`) | ✅ | Not merged into providers; absorbed under Operations hub (0059) |
| No capability deleted | ✅ | MCP/A2A pages still mount dashboards |
| Unit tests leaf + redirects | ⚠️ | Redirects/primary green; dual-hub unguarded (F6) |
| Manual/e2e smoke | ⚠️ residual | Still open |

## Production Wiring Proof (2026-07-16)

```
PRIMARY_SIDEBAR_ITEMS (9)
  home, providers, combos, activity, analytics, costs,
  operations → /dashboard/operations, settings-general, docs
  — no mcp / a2a / endpoints / api-endpoints peers  ✅ S5 letter

/dashboard/api-endpoints          → redirect → /dashboard/endpoint?tab=catalog  ✅
/dashboard/endpoint?tab=mcp       → redirect → /dashboard/mcp  ✅
/dashboard/endpoint?tab=a2a       → redirect → /dashboard/a2a  ✅
/dashboard/endpoint               → EndpointPageClient (apis|catalog|context-sources)
/dashboard/mcp | /dashboard/a2a   → capability retained  ✅

REGRESSION — Operations hub (Task 0059) API/Endpoints group:
  API Keys          → /dashboard/api-manager
  Endpoints         → /dashboard/endpoint
  API Endpoints     → /dashboard/api-endpoints     ← retired surface re-linked
  API Catalog       → /dashboard/endpoint?tab=catalog  ← same destination as above
  MCP Server        → /dashboard/mcp
  A2A Server        → /dashboard/a2a

0059 test REQUIRED hrefs include BOTH catalog URLs → dual home is locked green.
```

## Phantom-Test Proof

| Guard | What it catches | What it misses |
| --- | --- | --- |
| `connect-exposure-sidebar` primary peer asserts | Re-adding mcp/a2a/api-endpoints to `PRIMARY_SIDEBAR_ITEMS` | Hub cards, palette, Header dual titles |
| `connect-exposure` redirect source reads | Removing server redirects | Dual discoverability of same catalog |
| `operations-hub-discoverability-0059` | Missing any of 16 hrefs | **Fails if dual catalog is cleaned** |

Adversarial conclusion: green unit suites do **not** encode S5 “one catalog home” after 0059.

## Evidence Reviewed

- Task 0024 Completion Evidence + Review Ledger
- `src/shared/constants/operationsHub.ts` (full groups)
- `src/shared/constants/sidebarVisibility.ts` (PRIMARY, CONNECT_EXPOSURE_*, hideables)
- `api-endpoints/page.tsx`, `endpoint/page.tsx`, `EndpointPageClient.tsx` (tabs)
- `CommandPalette.tsx` operations extras
- `Header.tsx` deep meta still maps `/dashboard/api-endpoints` title
- `.archive/sidebar/2026-07-10-connect-exposure/` + PROVENANCE-INDEX
- Tests: `connect-exposure-sidebar.test.ts`, `operations-hub-discoverability-0059.test.ts`, `dashboard-shell-tabs.test.ts`

## Commands Run

```text
node --import tsx/esm --test \
  tests/unit/ui/connect-exposure-sidebar.test.ts \
  tests/unit/ui/operations-hub-discoverability-0059.test.ts \
  …
→ 51/51 PASS (includes dual-catalog requirement)

Programmatic (tsx):
  dual catalog? true
  catalogish ops hrefs =
    /dashboard/endpoint
    /dashboard/api-endpoints
    /dashboard/endpoint?tab=catalog
  mcp+a2a both in ops true
  retired hideable true
  PRIMARY count 9
```

## Commands Not Run And Why

- Playwright e2e — auth/session external; unit + static wiring suffice to prove dual-home regression
- Full typecheck / test:all — not required to score dual-home IA regression

## Path To 100

1. **Remove** Operations hub card for legacy `/dashboard/api-endpoints` (keep only `endpoint` and/or `endpoint?tab=catalog` as the single catalog card).
2. Update `tests/unit/ui/operations-hub-discoverability-0059.test.ts` required list accordingly (drop legacy href or replace with assert that hub does **not** include `/dashboard/api-endpoints`).
3. Strengthen `connect-exposure-sidebar.test.ts` (or shared IA guard) to assert Operations hub has **at most one** catalog destination (canonical `?tab=catalog` or Endpoints shell — pick one product rule).
4. Optionally drop Header match for `/dashboard/api-endpoints` once no UI links remain (redirect page still ok).
5. Residual: e2e `protocol-visibility` or operator smoke of MCP/A2A/catalog from Operations hub.

**Do not** undo prior accepted repairs: S5 endpoint tabs, protocol home redirects, hideable `api-endpoints`, status-dot a11y, PROVENANCE-INDEX, CHANGELOG.

## Regression Guards

- Default chrome: no `api-endpoints` / mcp / a2a / endpoints **primary peers**
- `/dashboard/api-endpoints` remains a **redirect only**, not a discovery peer
- Operations (and any future hub) must not re-list retired exposure IDs as equal peers of the SSoT catalog
- `endpoint?tab=mcp|a2a` → protocol homes; do not re-embed MCP/A2A as Endpoint peer tabs
- `api-manager` stays keys-separate (not provider cards)
- `dashboard-shell-tabs` must not reintroduce pre-S5 MCP/A2A tab asserts

## Scoring Notes

- Start 100
- −8 F5 dual catalog REGRESSION in Operations hub (Debt, operator-facing)
- −4 F6 phantom/primary-only tests (Debt)
- −2 F3 persistent e2e residual
- **= 86** → return to `02-doing`
