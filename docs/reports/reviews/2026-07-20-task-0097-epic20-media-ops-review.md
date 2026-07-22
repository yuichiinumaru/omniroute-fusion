# Review Report: Task 0097 — EPIC-20 T20-L Media under Operations Topbar — Frontend Quality (2026-07-20)

## Review Lineage

- **Current task**: Task 0097 (`omniroute-epic20-media-ops-topbar`); live path at review start: `docs/tasks/02-doing/0097-omniroute-epic20-media-ops-topbar.md`
- **Previous reports**: none found for 0097 (first formal review)
- **Related context**:
  - Task 0086 SSoT: `media` peer + redirect matrix row ownerTask 0097
  - Task 0087 shell: layout-hosted `OperationsTopbar` (chrome host)
  - Parallel Labs **0096** (must not absorb Media)
  - Deferred discoverability bulk (**0099** Testing hub + CommandPalette media href)
- **Review mode**: `initial` (frontend-quality + tsjs + code-quality)
- **Reviewer**: `gt-frontend-quality-reviewer` (parent agentID=`builders`)
- **Skills**: `code-quality-harness` + `frontend-quality-harness` + `tsjs-harness`
- **Report date**: 2026-07-20
- **Constraints honored**: no git; no `:21000`

## Score And Verdict

- **Score**: `100/100`
- **Verdict**: `ACCEPTED_100` / `PASS_PERFECT`
- **Lane recommendation**: move to `docs/tasks/03-review/` (S=100)

### Dual Score (UI chrome re-home)

| Dimension | Score | Notes |
|-----------|-------|-------|
| local_implementation | 100 | Canonical Media page + client move, modality L1 testids, unit matrix 17/17 |
| runtime_enforcement | 100 | App Router `/operations/media` under Ops layout; legacy redirect via builder; sidebar prefix lights Operations |

## Axiom Compliance (tsjs)

| Axiom | Status | Notes |
|-------|--------|-------|
| Type Purity | ✅ | Re-home only; no new `any`; registries/endpoints unchanged |
| Boundary Integrity | ✅ | No API/authz surface change; generation endpoints preserved |
| Async Determinism | ✅ | Server page + redirect only; client logic pre-existing |
| Immutability | ✅ | Path builders from 0086 freeze |
| State Exclusivity | ✅ | Single modality `activeTab`; Media peer id `media` exclusive of Labs |

## Frontend quality (task-owned)

| Dimension | Status | Notes |
|-----------|--------|-------|
| Visual hierarchy | ✅ | Ops hub topbar (layout) → modality L1 strip (content) → form |
| Responsive layout | ✅ | `flex-wrap` modality strip; form grids `sm:grid-cols-2` |
| Keyboard / focus | ✅ | Native `<button role="tab">` focusable; strip has `role="tablist"` + `aria-label` + `aria-selected` |
| Semantics / a11y | ✅ | Modality strip ARIA tabs shape; not demoted to buried non-L1 chrome |
| Motion discipline | ✅ | `transition-all` only; no decorative motion |
| Performance | ✅ | No extra hub chrome mounts; client island is Media body only |
| Single-topbar law (HR #22) | ✅ | Ops layout sole `OperationsTopbar`; Media page/client zero hub remounts |
| Self-evident paths (HR #23) | ✅ | `/operations/media` peer path |

## Rubric snapshot

| Dimension | Score | Notes |
| --- | --- | --- |
| Contract / exit conditions | 100 | All Done-when + exits for Media re-home met |
| Canonical `/operations/media` | 100 | static peer page + segment fallback |
| Modality L1 strip (5) | 100 | image/video/music/speech/transcription + testids |
| Legacy redirect | 100 | `/dashboard/cache/media` → `buildOperationsPath("media")` |
| Chrome ≤1 Ops hub topbar | 100 | layout=1; media page/client/segment=0 |
| Not Labs / no new leaf | 100 | no collapsible Labs claim; primary leaves stay 7 |
| Endpoints / registries | 100 | `/api/v1/images|videos|music|audio/...` + registries intact |
| Tests / typecheck / lint | 100 | 17/17; typecheck:core 0; eslint touched 0 |
| Scope discipline | 100 | Testing/palette deferred to 0099 as documented |

## Contract Compliance (Exit Conditions)

| Exit / MUST | Status | Live proof |
| --- | --- | --- |
| Canonical `/operations/media` under Ops shell | ✅ | `operations/media/page.tsx` + `MediaPageClient.tsx` |
| Modality L1 strip present (5 modalities) | ✅ | `data-testid="media-modality-strip"` + 5 `media-modality-*` |
| `/dashboard/cache/media` redirects | ✅ | server `redirect(buildOperationsPath("media"))` + matrix ownerTask 0097 |
| Ops hub topbar mount ≤ 1 | ✅ | layout only; greps clean on media tree |
| Sidebar Operations lights | ✅ | `getActiveSidebarHref("/operations/media")` → `/operations` |
| No primary leaf `media` | ✅ | `PRIMARY_SIDEBAR_ITEMS.length === 7` |
| Generation wiring unchanged | ✅ | MODALITY_CONFIG endpoints + registry imports |
| Unit tests | ✅ | `epic20-media-ops-0097.test.ts` 17/17 |
| typecheck:core | ✅ | exit 0 this session |
| lint on touched | ✅ | eslint exit 0 |
| CHANGELOG Unreleased | ✅ | Task 0097 / T20-L entry |

### Chrome matrix (verified)

| Route family | OperationsTopbar | PageTabBar / CostsSubnav / ObserveHubSubnav |
|--------------|------------------|-----------------------------------------------|
| Ops layout host | 1 | 0 |
| `/operations/media` page | 0 | 0 |
| `MediaPageClient` | 0 (modality strip = content) | 0 |
| `[segment]` media branch | 0 | 0 |
| legacy `cache/media` | 0 (redirect shell) | 0 |

### Anti-hallucination guardrails

| Guard | Status |
| --- | --- |
| Do not fold Media into Labs | ✅ |
| Do not remove modality L1 | ✅ preserved + testids |
| Do not invent paths outside T20-A | ✅ `buildOperationsPath("media")` |
| Do not add sidebar leaf `media` | ✅ |
| PORT 21000 untouched | ✅ |

## Evidence Commands (this session)

```bash
node --import tsx/esm --test tests/unit/ui/epic20-media-ops-0097.test.ts
# → 17/17 pass

npm run typecheck:core
# → exit 0

npx eslint \
  "src/app/(dashboard)/operations/media/**/*.{ts,tsx}" \
  "src/app/(dashboard)/dashboard/cache/media/**/*.{ts,tsx}" \
  "src/app/(dashboard)/operations/[segment]/page.tsx" \
  "src/shared/components/Header.tsx" \
  "tests/unit/ui/epic20-media-ops-0097.test.ts"
# → exit 0

# Anti-phantom media tree
rg -n "OperationsTopbar|PageTabBar|CostsSubnav|ObserveHubSubnav|DashboardTopbar" \
  "src/app/(dashboard)/operations/media" --glob '*.tsx'
# → no matches
```

## Findings

### Blocking

- none

### Debt / Improvement (not scored — residuals)

| ID | Severity | Notes |
|----|----------|-------|
| R1 | INFO | Testing hub + CommandPalette still list `/dashboard/cache/media` — **owned by 0099** (task note + Evidence). Redirect keeps bookmarks working. |
| R2 | INFO | Modality tabs are click + ARIA roles; full WAI-ARIA tabs keyboard model (arrow keys / `tabIndex` roving) is pre-existing product debt, not re-home scope. |
| R3 | INFO | Modality buttons lack shared `focus-ring` class (form selects use `focus:ring-2`); pre-existing generation UI polish, optional follow-up. |

### Regressions

- none in 0097-owned Media chrome contract

## Diff Ownership

| Surface | Owner |
|---------|-------|
| `operations/media/**` | **0097** |
| `dashboard/cache/media` redirect + archive re-export | **0097** |
| Ops layout / topbar mount host | 0087 (not re-owned) |
| `OPERATIONS_REDIRECT_MATRIX` media row | 0086 freeze; **0097** implements redirect |
| Labs composition | **0096** exclusive |
| Testing hub / palette media href | **0099** |

## Architecture Notes (durable)

1. **Media is Ops peer #10**, never Labs collapsible — path + topbar id encode that.
2. **Modality strip is content chrome** under the Media peer (Hard Rule #22: not a second hub topbar).
3. **Archive-not-delete**: legacy client re-exports canonical module; page is redirect-only.
4. **Static route + segment fallback** both mount the same client without double-topbar risk (layout host).

## Verdict Detail

Task 0097 fully delivers Media under Operations: canonical path, modality L1 content chrome, legacy redirect via 0086 builder, anti-phantom Ops chrome, no new leaf, registries/endpoints preserved. Score **100**. Move to `03-review`.

## Path to 100

- Already 100 — no builder rework required for Media acceptance.
- Optional non-blocking: 0099 updates Testing/palette hrefs (R1); modality keyboard polish (R2/R3) outside this task.
