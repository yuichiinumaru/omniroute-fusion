# Return Review: Task 0054 — Settings Hub PageTabBar (2026-07-18)

## Review Lineage

- **Task**: `docs/tasks/03-review/0054-omniroute-settings-hub-tabnav.md`
- **Prior formal report (UNTRUSTED baseline)**: `docs/reports/reviews/2026-07-18-task-0054-settings-hub-tabnav-final-review.md` (claimed 100)
- **Mode**: independent full re-review (frontend-quality + tsjs + adversarial sabotage)
- **Reviewer**: agentID=`reviewers` (Frontend Quality Reviewer)
- **Constraints**: no touch of production `:21000`; no git mutations beyond report/ledger docs

## Score And Verdict

| Field | Value |
| --- | --- |
| **Score** | **100/100** |
| **Verdict** | `ACCEPTED_100` / stay `03-review` |
| **Path-to-100** | None required (contracts already closed; sabotage-proven) |
| **Lane** | `03-review` (no demotion) |

### Rubric

| Dimension | Score | Evidence |
| --- | ---: | --- |
| Orphan reachability (10 tabs) | 100 | `SETTINGS_TABS` length 10; every value has `settings/{value}/page.tsx`; Pricing excluded |
| Visual unity vs Routing | 100 | `hubSubnavStyles` active/shell/item-base shared by PageTabBar `subnav`, RoutingHubSubnav, ObserveHubSubnav |
| Layout wiring | 100 | `settings/layout.tsx` → `variant="subnav"`, `syncSearchParam={false}`, `isSettingsTabValue` + `buildSettingsPath` |
| Legacy `?tab=` | 100 | hub `page.tsx` Map includes `access-tokens` / `accessTokens` / `appearance` |
| A11y | 100 | `role="tablist"`, `aria-selected`, roving tabindex, arrows, focus-visible ring on item-base |
| Type purity | 100 | `as const` → `SettingsTabValue`; parse gate at navigation boundary |
| Tests / sabotage | 100 | unit green; path mapping sabotage fails then restores |
| Scope | 100 | Dashboard/Analytics/Operations content not rewritten for this loop |

## Live / Adversarial Proof

### Static + unit (authoritative for current workspace source)

```text
node --import tsx/esm --test \
  tests/unit/ui/settings-hub-tabnav-0054.test.ts
→ 8/8 pass

npx vitest run tests/unit/ui/page-tab-bar.test.tsx
→ 8/8 pass

npm run typecheck:core → exit 0
```

### Sabotage (this session)

| Break | Expected | Result |
| --- | --- | --- |
| `pathToTabValue` always returns `"general"` | test `pathToTabValue maps every settings path…` fails | **SABOTAGE_OK** then restored; 8/8 pass after restore |

### Runtime `:22000` (EXTERNAL residual — not a product defect)

| Check | Result |
| --- | --- |
| Port | `omniroute` container image `omniroute:base` (created 2026-07-11); **source only mounts `data-test`**, not app code |
| Authenticated `/dashboard/settings/*` | **307 → /login** without session; login **429** (brute-force lockout from prior attempts) |
| Public `/login` paint | Chromium headless: `<html … class="dark">`, dark shell + cyan brand CTA (see assets) |
| Freshness | Workspace SSoT files mtime **2026-07-18**; container image **does not ship Jul-18 source** — live paint **cannot** validate current tabnav wiring |

**Conclusion:** product contracts are proven by layout import graph + pure path SSoT + unit/DOM tests + sabotage. Live authenticated settings tabbar is an **operator residual** (redeploy test image + auth) — same class as prior EXTERNAL notes.

## Contract Compliance

| Exit | Status |
| --- | --- |
| PageTabBar on settings sub-pages via layout | ✅ |
| 10 tabs incl. Interface (`appearance`) | ✅ |
| Active `border-primary/20 bg-primary/10 text-primary` | ✅ `HUB_SUBNAV_ACTIVE_CLASS` |
| Shell rounded-xl low-contrast | ✅ `HUB_SUBNAV_SHELL_CLASS` |
| No selected `bg-surface` on Settings subnav | ✅ subnav branch only |
| Direct routes, `syncSearchParam={false}` | ✅ |
| Legacy `?tab=access-tokens` | ✅ |
| typecheck + unit/DOM | ✅ |

## Findings

### Critical / Serious / Medium

- none

### Accepted residuals (non-scoring)

1. **EXTERNAL** — authenticated live UI on `:22000` blocked (rate limit + stale image without source mount).
2. **Nit** — Settings tab labels hard-coded English in `SETTINGS_TABS` (not i18n); sidebar leaf may still say “Appearance” while tab says “Interface”.
3. **Nit** — PageTabBar `onChange: (value: string)` remains generic; layout parse gate is intentional.

### Path-to-100

- Not applied — no open product findings at S&lt;100.

## Lane Outcome

- **Stay** `docs/tasks/03-review/0054-omniroute-settings-hub-tabnav.md`
- Do **not** demote to `02-doing`
- Changelog remains draft until human acceptance (task-owned)
