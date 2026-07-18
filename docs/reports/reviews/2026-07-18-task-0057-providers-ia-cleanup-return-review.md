# Return Review: Task 0057 — Providers IA Cleanup — 2026-07-18

## Review Lineage

- **Task**: `docs/tasks/03-review/0057-omniroute-providers-ia-cleanup.md`
- **Mode**: independent FULL re-review (prior scores untrusted)
- **Reviewer**: `gt-frontend-quality-reviewer` (agentID=`reviewers`)
- **Skills**: frontend-quality + tsjs static contracts
- **Live base**: `http://localhost:22000` (Docker `omniroute:base` **v3.8.42**, ~30h image — **not** a hot rebuild of this workspace tree)
- **Prod port 21000**: not touched

## Score And Verdict

| | |
|---|---|
| **Score** | **100/100** (workspace contracts + path-to-100 a11y) |
| **Verdict** | `ACCEPTED_100` |
| **Lane** | stay `docs/tasks/03-review/` |
| **Patches this review** | `ProvidersTopBar` decorative icons `aria-hidden`; regression assert |

### Rubric

| Dimension | Score | Evidence |
|-----------|------:|----------|
| Exit conditions (IA) | 100 | Marketing/Free section removed; Grid/List; Configured filter; A-Z + Accounts; topbar peers in source |
| Multi-route topbar | 100 | 7 mounts + exact `currentPath` unit contract |
| Visual SSOT | 100 | `HUB_SUBNAV_*` from `hubSubnavStyles.ts`; no `bg-primary text-white` |
| List a11y | 100 | Toggle sibling of Link; accounts `aria-label`; chips `aria-pressed` |
| Tests | 100 | provider-connections-ui-regression + storage/utils suites green |
| Live Docker parity | n/a | **Deploy lag** — see EXTERNAL |

## Live adversarial UI (Docker :22000)

| Check | Result |
|-------|--------|
| `/dashboard/providers` topbar present | ✅ 7 links (Providers…Runtime) |
| Marketing onboarding | ✅ absent |
| Free Tier section | ✅ absent |
| Grid / List controls | ✅ present |
| Sort A-Z / Accounts | ✅ present |
| Configured filter | ✅ present |
| Active style = Routing SSOT | ❌ **live** uses `bg-primary text-white` (pre-SSOT image) |
| `aria-current` on active | ❌ null on live (old component) |
| Peer pages mount topbar | ❌ quota/runtime/services/stats → `topbar=0` on live |
| List rows `provider-list-row` | ❌ 0 rows on live (old list / no testid) |

**Interpretation:** Live image is **stale vs workspace**. Workspace source mounts peers, uses `HUB_SUBNAV_ACTIVE_CLASS`, and implements `ProviderListRow`. Unit tests fail if those regress. Operator must **rebuild/redeploy workspace to :22000** for runtime parity; not a source reject.

## Workspace source verification

| Contract | Status |
|----------|--------|
| `ProvidersTopBar` on providers, provider-stats, services, quota, rankings, free-tiers, runtime | ✅ |
| `PROVIDERS_TOPBAR_PATHS` branded union | ✅ |
| Display mode grid/list only | ✅ |
| List Toggle outside Link | ✅ |
| Sort helpers + tests | ✅ |

### Path-to-100 this session

1. `ProvidersTopBar` Material icons → `aria-hidden="true"` (parity Observe/Routing).
2. Regression test asserts decorative `aria-hidden` on topbar icons.

## Findings

| ID | Class | Severity | Status | Summary |
|----|-------|----------|--------|---------|
| L1 | EXTERNAL | Med | Accepted residual | Docker :22000 pre-SSOT topbar / missing peer mounts |
| F1 | RESOLVED | Low a11y | Closed here | Topbar icons lacked `aria-hidden` |
| G1–G7 | Guard | — | Pass | Exit conditions in source + units |

## Commands

```text
node --import tsx/esm --test tests/unit/provider-connections-ui-regression.test.ts
→ pass (includes new aria-hidden assert)
```

## Residual

- Changelog after human accept (subtask 10).
- Redeploy workspace build to `:22000` for live multi-route + List row proof.
