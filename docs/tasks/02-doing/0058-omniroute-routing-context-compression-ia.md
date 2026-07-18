# Task 0058: Routing + Context Compression IA — Live Tab, Settings Hub, Conditional Modes

> **Status**: `[~]` Returned from review — S=88 NEEDS FIX (F1 same-page toggle recompose; F2 embedded chrome). Report: `docs/reports/reviews/2026-07-14-task-0058-routing-compression-ia-review.md`
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
- [~] 5. Compose enabled mode sections under settings. *(partial — review F1/F2)*
  - [x] 5a. Read enabled engines from the same config source as `CompressionPanel`. *(same API; not shared React state)*
  - [x] 5b. Render mode sections in stable order.
  - [x] 5c. Render nothing extra when no engines enabled. *(on load)*
  - [x] 5d. Handle loading/error states gracefully.
  - [ ] 5e. **Path-to-100 (F1):** recompose after in-page engine toggle (shared state or refresh bridge + test).
  - [ ] 5f. **Path-to-100 (F2):** `embedded` chrome variant; suppress caveman Advanced `CompressionSettingsTab` when embedded.
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
- [ ] `/dashboard/context/settings` renders only enabled mode sections below settings. *(on-load yes; same-page toggle recompose FAIL — review F1)*
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
  - New `EnabledEngineSections.tsx` fetches `/api/settings/compression`, filters `engines[id].enabled === true` against stable `ENGINE_IDS` order, embeds:
    - `CavemanContextPageClient` for caveman
    - `RtkContextPageClient` for rtk
    - `EngineConfigPage` for all other catalog engines
  - Loading / error / empty (no enabled engines) handled; standalone mode routes unchanged.
  - Note: `/dashboard/context/combos` is a named-combos manager (not an engine catalog id) and is intentionally not auto-embedded as an “engine section”.
- Typecheck result:
  - `npm run typecheck:core` → exit 0
- Route smoke output:
  - `node --import tsx/esm --test tests/unit/ui/routing-hub-discoverability-0025.test.ts` → 9/9 pass
  - `npx vitest run tests/unit/ui/enabled-engine-sections-0058.test.tsx tests/unit/ui/compression-settings-page.test.tsx` → 5/5 pass
- Changelog ref:
  - Deferred to subtask 8 after reviewer acceptance (do not write CHANGELOG.md in this worker pass).

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
