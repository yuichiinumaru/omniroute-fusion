# Task 0058: Routing + Context Compression IA — Live Tab, Settings Hub, Conditional Modes

> **Status**: `[x]` Completed (return-review 100/100 — promoted 2026-07-18 after 22000 redeploy)
> **Priority**: 🔴 P0
> **Type**: `refactor` (information architecture + feature composition)
> **Action type**: UX_VIS + EXPOSE
> **Origin**: User localhost:21000 vs 22000 IA sweep (2026-07-14)
> **Source evidence**: Routing/Context read-only investigation packet
> **Depends on**: Task 0052 (theme), existing RoutingHubSubnav work
> **Blocks**: none

---

## Objective

Make Routing/Compression IA coherent: add **Live** to the Routing topbar, make Compression point to `/dashboard/context/settings`, expose Compression Studio as a distinct Routing topbar item, and render enabled compression mode pages inline below Context Settings.

---

## Current Evidence

### Routing topbar exists

Routing pages use `RoutingHubSubnav`:

```txt
src/shared/components/RoutingHubSubnav.tsx
src/app/(dashboard)/dashboard/combos/page.tsx
src/app/(dashboard)/dashboard/fusions/page.tsx
```

Combos and Fusions are already good according to user review.

### `/dashboard/combos/live` is functional

`src/app/(dashboard)/dashboard/combos/live/page.tsx` exists and renders a live combo routing visualization with WebSocket/live status hooks. It should be exposed as a topbar item named **Live**.

### Current Compression routes

Routes/directories exist:

```txt
/dashboard/context/settings
/dashboard/context/aggressive
/dashboard/context/caveman
/dashboard/context/ccr
/dashboard/context/combos
/dashboard/context/headroom
/dashboard/context/lite
/dashboard/context/llmlingua
/dashboard/context/rtk
/dashboard/context/session-dedup
/dashboard/context/ultra
/dashboard/compression/studio
```

`/dashboard/context` already redirects to `/dashboard/context/settings` by default.

`/dashboard/compression` currently redirects to `/dashboard/context/caveman`, which is not the desired hub behavior.

### Compression settings already know enabled modes

`CompressionPanel` fetches compression settings from `/api/settings/compression` and stores config with:

```ts
engines: Record<string, { enabled: boolean; level?: unknown }>
```

Mode pages are currently standalone route pages, not embeddable components under settings.

---

## Target UX

### Routing topbar should include

1. Combos
2. Fusions
3. Live
4. Compression Settings
5. Compression Studio

Exact naming can be adjusted, but the important behavior is:
- Compression main entry → `/dashboard/context/settings`
- Studio remains available as explicit separate item
- Live combo page is no longer orphaned

### Context Settings dynamic composition

`/dashboard/context/settings` should render:

1. General compression settings / master toggle / engine toggles
2. Then, below the settings panel, the content for enabled engines only:

```txt
/dashboard/context/aggressive
/dashboard/context/caveman
/dashboard/context/ccr
/dashboard/context/combos
/dashboard/context/headroom
/dashboard/context/lite
/dashboard/context/llmlingua
/dashboard/context/rtk
/dashboard/context/session-dedup
/dashboard/context/ultra
```

Examples:
- No engines enabled → only settings content.
- Only caveman enabled → settings + caveman content.
- Lite + RTK enabled → settings + lite + rtk content.

---

## Subtasks

- [x] 1. Complete investigation before editing.
  - [x] 1a. Read `RoutingHubSubnav.tsx`.
  - [x] 1b. Read `combos/live/page.tsx`.
  - [x] 1c. Read `compression/studio/page.tsx`.
  - [x] 1d. Read `/api/settings/compression/route.ts`.
  - [x] 1e. Read engine catalog / config source.
  - [x] 1f. Read all compression mode pages before composing them.
- [x] 2. Update Routing topbar.
  - [x] 2a. Add Live item → `/dashboard/combos/live`.
  - [x] 2b. Change Compression item target to `/dashboard/context/settings`.
  - [x] 2c. Add Compression Studio item → `/dashboard/compression/studio`.
  - [x] 2d. Ensure active state works for all routes.
- [x] 3. Update compression redirects.
  - [x] 3a. `/dashboard/compression` should redirect to `/dashboard/context/settings`.
  - [x] 3b. Preserve `/dashboard/compression/studio`.
- [x] 4. Make compression mode content embeddable.
  - [x] 4a. Extract each mode page's main component into an importable component if needed.
  - [x] 4b. Keep standalone route pages working.
  - [x] 4c. Avoid duplicating data fetch logic unnecessarily.
- [x] 5. Compose enabled mode sections under settings.
  - [x] 5a. Read enabled engines from the same config source as `CompressionPanel`. *(shared via page-level engines bridge — F1)*
  - [x] 5b. Render mode sections in stable order.
  - [x] 5c. Render nothing extra when no engines enabled.
  - [x] 5d. Handle loading/error states gracefully.
  - [x] 5e. **Path-to-100 (F1):** recompose after in-page engine toggle (shared state or refresh bridge + test).
  - [x] 5f. **Path-to-100 (F2):** `embedded` chrome variant; suppress caveman Advanced `CompressionSettingsTab` when embedded.
- [x] 6. Add tests or static contract checks for RoutingHubSubnav items and redirect behavior.
- [x] 7. Run typecheck and targeted tests.
- [ ] 8. Update changelog after reviewer acceptance.

---

## Anti-Hallucination Guardrails

1. Do **not** remove existing standalone mode routes; users may have deep links.
2. Do **not** duplicate heavy mode components if extraction is cleaner.
3. Do **not** alter compression algorithm behavior; this is IA/composition only.
4. Do **not** assume all engines use identical config fields; read engine catalog and mode page code.
5. Do **not** hide Compression Studio; user explicitly wants it as a distinct topbar item.
6. Do **not** break Combos/Fusions existing pages, which user approved.

---

## Validation / Exit Conditions

- [x] Routing topbar includes Combos, Fusions, Live, Compression Settings, Compression Studio.
- [x] `/dashboard/combos/live` is reachable from Routing topbar.
- [x] `/dashboard/compression` redirects to `/dashboard/context/settings`.
- [x] `/dashboard/compression/studio` remains reachable.
- [x] `/dashboard/context/settings` renders only enabled mode sections below settings. *(on-load + same-page toggle via F1 bridge)*
- [x] Standalone mode routes still work.
- [x] `npm run typecheck:core` passes.
- [x] Targeted route smoke checks pass.

---

## Where

| File | Action | Purpose |
|------|--------|---------|
| `src/shared/components/RoutingHubSubnav.tsx` | MODIFY | Add Live + Studio; retarget Compression |
| `src/app/(dashboard)/dashboard/combos/live/page.tsx` | MODIFY | Mount RoutingHubSubnav active=live |
| `src/app/(dashboard)/dashboard/compression/page.tsx` | MODIFY | Redirect to context settings |
| `src/app/(dashboard)/dashboard/compression/studio/page.tsx` | MODIFY | Mount RoutingHubSubnav active=compression-studio |
| `src/app/(dashboard)/dashboard/context/settings/page.tsx` | MODIFY | Compose enabled modes under settings |
| `src/app/(dashboard)/dashboard/context/settings/EnabledEngineSections.tsx` | CREATE | Conditional enabled-engine composition |
| `src/app/(dashboard)/dashboard/context/*/page.tsx` | READ | Mode content already embeddable via clients / EngineConfigPage |
| `src/app/api/settings/compression/route.ts` | READ | Config shape |
| `open-sse/services/compression/engineCatalog.ts` | READ | Engine IDs/order/metadata |
| `tests/unit/ui/routing-hub-discoverability-0025.test.ts` | MODIFY | Contract checks for 0058 topbar + redirect |
| `tests/unit/ui/enabled-engine-sections-0058.test.tsx` | CREATE | Enabled-engine composition unit tests |
| `.changelog/` | APPEND AFTER REVIEW | Record Routing/Context IA changes |

## Completion Evidence

- Routing topbar diff:
  - `RoutingHubSubnav` now links: Combos → `/dashboard/combos`, Fusions → `/dashboard/fusions`, Live → `/dashboard/combos/live`, Compression Settings → `/dashboard/context/settings`, Compression Studio → `/dashboard/compression/studio`.
  - Active ids: `combos | fusions | live | compression-settings | compression-studio`.
  - Live + Studio pages mount the subnav with matching active state; settings page mounts `active="compression-settings"`.
- Compression redirect diff:
  - `src/app/(dashboard)/dashboard/compression/page.tsx` redirects to `/dashboard/context/settings` (was `/dashboard/context/caveman`).
  - `/dashboard/compression/studio` preserved and mounts hub subnav.
- Enabled-mode composition evidence:
  - `EnabledEngineSections.tsx` filters `engines[id].enabled === true` against stable `ENGINE_IDS` order, embeds:
    - `CavemanContextPageClient embedded` for caveman
    - `RtkContextPageClient embedded` for rtk
    - `EngineConfigPage engineId embedded` for all other catalog engines
  - Loading / error / empty (no enabled engines) handled; standalone mode routes unchanged.
  - Note: `/dashboard/context/combos` is a named-combos manager (not an engine catalog id) and is intentionally not auto-embedded as an “engine section”.

### Path-to-100 (2026-07-18) — F1 + F2 (+ type SSOT + N1)

#### F1 — Same-page toggle recompose
- `settings/page.tsx` owns `engines` state; passes `onEnginesChange={handleEnginesChange}` to `CompressionPanel` and `engines={engines}` to `EnabledEngineSections`.
- `CompressionPanel` calls `onEnginesChange` on successful load and whenever `save({ engines })` updates the map (toggle path).
- **R1 (final review):** on save failure, restore previous config + `onEnginesChange(previous.engines)` so sections never stay on a failed optimistic map.
- `EnabledEngineSections` controlled mode: `engines !== undefined` skips self-fetch; `null` → loading; object → recompose.
- Uncontrolled fallback (no prop) keeps self-fetch for unit isolation.
- **Type SSOT:** exported `CompressionEngineToggle` from `CompressionPanel`; settings page + sections import it (no triple-local `EngineToggle` drift). Boundary fetch still accepts `Partial<>` rows; filter remains `enabled === true`.

#### F2 — Embedded chrome
- `EngineConfigPage({ embedded })`: hides `h1` + `panel-pointer-notice`; reduced padding (`p-4`).
- **R2 (final review):** embedded demotes Configuration/Preview/analytics titles to presentational `<p>` (no inverted h2 under section h3).
- `CavemanContextPageClient({ embedded })`: hides page header/SegmentedControl; `viewMode === "advanced" && !embedded && <CompressionSettingsTab />`; section titles demoted when embedded.
- `RtkContextPageClient({ embedded })`: hides `h1`/description; Simple/Advanced control right-aligned (no empty spacer); section titles demoted when embedded.

#### N1 — Command palette (optional path-to-100)
- `CommandPalette` routingHubExtras now includes Live (`/dashboard/combos/live`), Compression Settings (`/dashboard/context/settings`), Fusions, Compression Studio.

#### R3 — Hub focus-visible
- `HUB_SUBNAV_ITEM_BASE_CLASS` includes `focus-visible:ring-2` for keyboard a11y on all hub subnavs.

- Typecheck result:
  - `npm run typecheck:core` → exit 0 (2026-07-18 final review)
- Route / unit smoke output (2026-07-18 final path-to-100):
  - `node --import tsx/esm --test tests/unit/ui/routing-hub-discoverability-0025.test.ts` → 13/13 pass
  - `npx vitest run tests/unit/ui/enabled-engine-sections-0058.test.tsx tests/unit/ui/engineConfigPage.test.tsx tests/unit/ui/caveman-embedded-0058.test.tsx tests/unit/ui/compression-settings-page.test.tsx tests/unit/ui/compressionPanel.test.tsx` → 26/26 pass
- Changelog ref:
  - Deferred to subtask 8 after reviewer acceptance (do not write CHANGELOG.md in this worker pass).

## Review Ledger

| Date | Reviewer | Score | Verdict | Findings closed | Residual |
|------|----------|-------|---------|-----------------|----------|
| 2026-07-16 | reviewers | 88 | NEEDS FIX | — | F1 same-page recompose; F2 embedded chrome; N1 palette (optional) |
| 2026-07-18 | gt-ts-engineer (builders) | — | path-to-100 applied | F1, F2 | N1 optional palette Live; re-review needed |
| 2026-07-18 | gt-ts-expert (builders) | **97** | path-to-100 closed | F1 type SSOT, N1 palette Live+Settings | N2 accepted (context/combos not engine); changelog deferred |
| 2026-07-18 | gt-frontend-quality-reviewer | **100** | ACCEPT | R1 save rollback; R2 heading demotion; R3 focus ring | Changelog only; multi-engine fetch accepted |
| 2026-07-18 | gt-frontend-quality-reviewer (reviewers return) | **100** | ACCEPTED_100 | Live :22000 hub/redirect/enabled-sections confirmed; prior F1/F2 stand | Changelog |

**Previous Reports:**
- `docs/reports/reviews/2026-07-14-task-0058-routing-compression-ia-review.md` (S=88)
- `docs/reports/reviews/2026-07-18-task-0058-routing-compression-ia-final-review.md` (S=100)
- `docs/reports/reviews/2026-07-18-task-0058-routing-compression-ia-return-review.md` (S=100 return)

**Lane:** stay `docs/tasks/03-review/` (return-review 100).

## Changelog Draft (for reviewer / post-acceptance)

```markdown
## [2026-07-14] - Routing + Context Compression IA (Task 0058)
### Changed
- Routing hub topbar now includes Combos, Fusions, Live, Compression Settings, and Compression Studio.
- `/dashboard/compression` redirects to `/dashboard/context/settings` instead of caveman.
- `/dashboard/context/settings` composes enabled engine detail sections below the panel (catalog order).
### Added
- `EnabledEngineSections` composition layer under context settings.
- Live + Studio reverse hub nav via `RoutingHubSubnav`.
**Author**: builders (Task 0058)
```

## Lane promotion

- **Promoted to 04-completed**: 2026-07-18 — parent after return-review 100/100 + healthy 22000 redeploy (`omniroute:base` sha256:799b53a4c368).
