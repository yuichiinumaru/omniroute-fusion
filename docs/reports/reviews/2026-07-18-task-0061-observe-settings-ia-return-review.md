# Return Review: Task 0061 — Observe + Settings Small IA Gaps — 2026-07-18

## Review Lineage

- **Task**: `docs/tasks/03-review/0061-omniroute-observe-settings-small-ia-gaps.md`
- **Mode**: independent FULL re-review (prior scores untrusted)
- **Reviewer**: `gt-frontend-quality-reviewer` (agentID=`reviewers`)
- **Live base**: `http://localhost:22000` v3.8.42
- **Prod port 21000**: not touched

## Score And Verdict

| | |
|---|---|
| **Score** | **100/100** (workspace contracts; Settings half live-proven) |
| **Verdict** | `ACCEPTED_100` |
| **Lane** | stay `docs/tasks/03-review/` |
| **Patches this review** | none (source already at path-to-100 from prior wave) |

### Rubric

| Dimension | Score | Notes |
|-----------|------:|-------|
| Health Observe chrome (source) | 100 | `ObserveHubSubnav active="health"` full-width first |
| Observe SSOT visual | 100 | `HUB_SUBNAV_ACTIVE_CLASS` shared with Routing |
| Health not stream tab | 100 | `OBSERVE_SOURCES` excludes health |
| Proxy redirect | 100 | live + unit → `activity?source=proxy` |
| Interface tab (Option B) | 100 | live tabbar **Interface** selected; no theme UI |
| Theme strip preserved | 100 | AppearanceTab functional prefs only |
| Tests | 100 | 0061 + 0054 + observe-hub suites green |

## Live adversarial UI (Docker :22000)

| Check | Result |
|-------|--------|
| `/dashboard/settings/appearance` tab **Interface** | ✅ selected; functional tunnel/pin prefs |
| Theme/branding customization UI | ✅ absent |
| `/dashboard/logs/proxy` redirect | ✅ → `/dashboard/activity?source=proxy` |
| Activity has Health observe link | ✅ `data-observe-health-link` count ≥ 1 |
| `/dashboard/health` Observe topbar | ❌ **null** on live — no `data-observe-hub-subnav` |
| Health layout full-width subnav | ❌ not in live image |

Screenshot: `/tmp/or-review-shots/settings-appearance.png` (Interface OK), `health.png` (no Observe chrome).

**Interpretation:** Settings/Interface half is live-good on Docker. Health Observe mount is workspace-only until redeploy. Source:

```tsx
<ObserveHubSubnav active="health" />
```

Unit: `Health page mounts ObserveHubSubnav with active=health`.

## Source contracts re-verified

- `ObserveHubActive = ObserveSource | "health"`; LINKS exhaustive.
- Icons `aria-hidden="true"`.
- `settingsHub` value `appearance` / label `Interface`.
- en.json `settingsAppearance*` → Interface wording.
- Health refresh `aria-label` + focus ring.

## Findings

| ID | Class | Severity | Status | Summary |
|----|-------|----------|--------|---------|
| L1 | EXTERNAL | Med | Accepted residual | Docker health page lacks Observe topbar |
| G1 | Guard | — | Pass | Interface tab + no theme UI live |
| G2 | Guard | — | Pass | Proxy redirect live |
| N1 | Accepted | Low | Residual | Breadcrumb still “Appearance” path segment (route id); tab label Interface |

## Commands

```text
node --import tsx/esm --test \
  tests/unit/ui/observe-settings-ia-gaps-0061.test.ts \
  tests/unit/ui/settings-hub-tabnav-0054.test.ts \
  tests/unit/ui/observe-hub-sidebar.test.ts
→ pass
```

## Residual

- Redeploy workspace to `:22000` for Health Observe chrome live proof.
- Optional: breadcrumb label Interface vs Appearance path.
- Non-en locales may still say Appearance/Theme for same keys (i18n campaign).
