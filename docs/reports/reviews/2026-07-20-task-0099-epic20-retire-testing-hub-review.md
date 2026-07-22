# Review Report: Task 0099 — EPIC-20 T20-N Retire Testing Hub — Frontend Quality (2026-07-20)

## Review Lineage

- **Current task**: Task 0099 (`omniroute-epic20-retire-testing-hub`); live path at review start: `docs/tasks/02-doing/0099-omniroute-epic20-retire-testing-hub.md`
- **Previous reports**: none found for 0099 (first formal review)
- **Related context**:
  - EPIC-20 §1–§2 / §5 / T20-N — Testing absorbed into Ops Labs/Media
  - Hard deps: **0096 Labs**, **0097 Media** (landed); T20-A/B path builders + shell
  - Soft: **0098** Traffic out of Ops (Traffic card already gone)
  - Blocks: **0100** final chrome / redirect gate
  - Supersedes 0076 D1 “return via Testing hub” for labs discovery
- **Review mode**: `initial` (frontend-quality + tsjs + code-quality)
- **Reviewer**: `gt-frontend-quality-reviewer` (parent agentID=`builders`)
- **Skills**: `code-quality-harness` + `frontend-quality-harness` + `tsjs-harness`
- **Report date**: 2026-07-20
- **Constraints honored**: no git; no `:21000`

## Score And Verdict

- **Score**: `100/100`
- **Verdict**: `ACCEPTED_100` / `PASS_PERFECT`
- **Lane recommendation**: move to `docs/tasks/03-review/` (S=100)

### Dual Score (UI chrome retire + Ops discovery)

| Dimension | Score | Notes |
|-----------|-------|-------|
| local_implementation | 100 | Redirect SSoT, Ops cards via builders, palette Labs/Media/Integrations, absorb archive, unit matrix |
| runtime_enforcement | 100 | Server `redirect(TESTING_HUB_CANONICAL_PATH)` on `/dashboard/testing`; Labs/Media pages exist; Ops shell single topbar |

## Axiom Compliance (tsjs)

| Axiom | Status | Notes |
|-------|--------|-------|
| Type Purity | ✅ | Const hub inventories; `buildOperationsPath` typed peers |
| Boundary Integrity | ✅ | Navigation/href only — no authz/API surface change |
| Async Determinism | ✅ | Server redirect page (no client fetch race); palette pure data |
| Immutability | ✅ | `as const` hub groups; frozen matrix row ownerTask `0099` |
| State Exclusivity | ✅ | Testing is redirect/archive alias, not parallel living hub |

## Frontend quality (task-owned)

| Dimension | Status | Notes |
|-----------|--------|-------|
| Visual hierarchy | ✅ | Ops hub copy points at topbar peers; Labs/Media cards under Integrations group |
| Responsive layout | ✅ | Existing Ops card grid (`sm:2` / `xl:3`) unchanged pattern |
| Keyboard / focus | ✅ | Hub cards are `Link` + `focus-ring` |
| Semantics / a11y | ✅ | Grouped `<section aria-labelledby>`; decorative icons `aria-hidden` |
| Motion discipline | ✅ | Color/opacity transitions only — no decorative motion |
| Performance | ✅ | Redirect shell returns null client stub; no launchpad mount |
| Single-topbar law (HR #22) | ✅ | No Testing reverse strip; Ops chrome remains layout-owned `OperationsTopbar` only |
| Self-evident paths (HR #23) | ✅ | Discovery → `/operations/labs` · `/operations/media` · `/operations/integrations` |

## Rubric snapshot

| Dimension | Score | Notes |
| --- | --- | --- |
| `/dashboard/testing` → Labs redirect | 100 | matrix ownerTask 0099 + page `redirect(TESTING_HUB_CANONICAL_PATH)` |
| Testing not living hub | 100 | client `@deprecated` null stub; no `data-testid="testing-hub"` |
| Ops Labs + Media deep links | 100 | integrations cards via `buildOperationsPath` |
| No Testing / Traffic Ops cards | 100 | inventory + 0098 residual held |
| Ops cards `/operations/*` only | 100 | all `OPERATIONS_HUB_HREFS` peers (catalog = endpoints fusion) |
| CommandPalette testing extras | 100 | labs/media/integrations builders; no legacy lab href literals |
| Anti-new-leaf / DEVTOOLS empty | 100 | testing/labs/media not primary; hideable `testing` retained |
| Discoverability suites rewritten | 100 | 0059/0060/0076/0083 + new 0099 suite |
| UI.md absorb policy | 100 | reverse-chrome + Tools→Ops + EPIC-19 intent row polish |
| CHANGELOG Unreleased | 100 | T20-N entry present |
| Tests / typecheck / lint | 100 | 85/85 related; typecheck 0; eslint 0 |
| Scope discipline | 100 | Labs/Media internals untouched; no invented peers |

## Contract Compliance (Exit Conditions)

| Exit / MUST | Status | Live proof |
| --- | --- | --- |
| `/dashboard/testing` → Labs | ✅ | page + `TESTING_HUB_CANONICAL_PATH` + matrix row |
| Ops deep-link Labs + Media | ✅ | `operationsHub.ts` integrations cards |
| CommandPalette Ops paths | ✅ | `testingHubExtras` builders |
| Testing not intermediate hop | ✅ | no Ops Testing card; no palette `/dashboard/testing` |
| Unit tests | ✅ | `epic20-retire-testing-0099.test.ts` + 0059/0060/0076/0083/0086/sidebar |
| typecheck:core | ✅ | exit 0 this session |
| lint on touched | ✅ | eslint exit 0 this session |
| UI.md reverse-chrome / Tools→Ops | ✅ | Testing retired; Ops topbar L1 |
| CHANGELOG Unreleased | ✅ | Task 0099 / T20-N |
| Residual legacy list in Evidence | ✅ | testing extras clean; `operationsHubExtras` residual noted for 0100 |
| No :21000 | ✅ | |

### Chrome matrix (verified)

| Route family | OperationsTopbar | Testing launchpad chrome |
|--------------|------------------|--------------------------|
| `/operations` hub + peers | 1 (layout) | 0 |
| `/operations/labs` · `/operations/media` | 1 (layout) | 0 |
| `/dashboard/testing` | 0 (redirect shell) | 0 (client null stub) |
| Ops hub cards | n/a content | Testing card **absent** |

### Anti-hallucination guardrails

| Guard | Status |
| --- | --- |
| Do not start without Labs/Media real | ✅ pages under `operations/labs` + `operations/media` |
| Do not invent `/operations/*` peers | ✅ only frozen topbar ids |
| Do not re-add labs to sidebar | ✅ primary + DEVTOOLS empty |
| Do not leave Testing as working launchpad | ✅ redirect-only |
| PORT 21000 untouched | ✅ |

## Evidence Commands (this session)

```bash
node --import tsx/esm --test \
  tests/unit/ui/epic20-retire-testing-0099.test.ts \
  tests/unit/ui/testing-hub-discoverability-0060.test.ts \
  tests/unit/ui/operations-hub-discoverability-0059.test.ts \
  tests/unit/ui/ops-testing-reverse-chrome-0076.test.ts \
  tests/unit/ui/epic19-tools-ops-verify-0083.test.ts \
  tests/unit/ui/epic20-operations-matrix-0086.test.ts \
  tests/unit/sidebar-tools-group.test.ts
# → 85 pass / 0 fail

npm run typecheck:core
# → exit 0

npx eslint \
  "src/shared/constants/testingHub.ts" \
  "src/shared/constants/operationsHub.ts" \
  "src/app/(dashboard)/dashboard/testing/page.tsx" \
  "src/app/(dashboard)/dashboard/testing/TestingHubClient.tsx" \
  "src/app/(dashboard)/operations/OperationsHubClient.tsx" \
  "src/shared/components/CommandPalette.tsx" \
  "src/shared/components/Header.tsx" \
  "tests/unit/ui/epic20-retire-testing-0099.test.ts" \
  "tests/unit/ui/testing-hub-discoverability-0060.test.ts" \
  "tests/unit/ui/operations-hub-discoverability-0059.test.ts" \
  "tests/unit/ui/ops-testing-reverse-chrome-0076.test.ts"
# → exit 0
```

## Findings

### Blocking

- none

### Debt / Improvement (not scored — residuals)

| ID | Severity | Classification | Notes |
|----|----------|----------------|-------|
| R1 | INFO | EXTERNAL_BLOCKER / 0100 | `CommandPalette` `operationsHubExtras` still uses residual legacy hrefs for api-manager / endpoints / a2a / webhooks (redirect shells). Explicitly **out of** 0099 testing-extras scope; optional 0100 cleanup. |
| R2 | INFO | SUPERSEDED at review | EPIC-19 UI.md intent rows still said “Operations → Testing”; **fixed at review** to Labs/Media + retire note. Also polished stale “discover via Testing hub” comments in `sidebarVisibility.ts` / `epic19Rebalance.ts`. |
| R3 | INFO | EXTERNAL_BLOCKER / docs hygiene | UI.md § EPIC-20 banner still reads “planned / destination freeze only” from 0086 era while peers are live — not 0099-owned; prefer 0100 or a docs hygiene task to flip status language. |
| R4 | INFO | archive co-location | `TestingHubClient.tsx` remains as null stub (archive-not-delete). Acceptable; optional later delete after hideable-pref audit. |

### Regressions

- none in 0099-owned Testing-retire / Ops deep-link contract

## Diff Ownership

| Surface | Owner |
|---------|-------|
| `testingHub.ts` redirect SSoT + absorb map | **0099** |
| `/dashboard/testing` page redirect | **0099** |
| `TestingHubClient` archive stub | **0099** |
| Ops hub Labs/Media cards; drop Testing | **0099** (Traffic drop was **0098**) |
| `CommandPalette` `testingHubExtras` | **0099** |
| Header Labs title for testing/labs paths | **0099** |
| UI.md reverse-chrome + Tools→Ops + EPIC-19 row polish | **0099** (+ review polish) |
| 0059/0060/0076/0083 rewrites + `epic20-retire-testing-0099` | **0099** |
| Labs/Media page bodies | **0096** / **0097** (read-only) |
| Ops topbar shell / path builders | **0087** / **0086** |
| Global chrome mount ≤1 matrix | **0100** |

## Architecture Notes (durable)

1. **Testing is archive/redirect only** — never reintroduce as product hub, reverse strip, or Ops Integrations card.
2. **Ops topbar is L1** for labs/media; hub cards deep-link the same `buildOperationsPath` peers (content under default peer, not second L1).
3. **Hideable id `testing` retained** (archive-not-delete prefs); palette id `testing` **aliases Labs**.
4. **Absorb map** in `TESTING_HUB_GROUPS` points at canonical Ops paths; **legacy hrefs** stay in `TESTING_HUB_LEGACY_HREFS` + `OPERATIONS_REDIRECT_MATRIX` for matrix coverage.

## Verdict Detail

Task 0099 retires Testing as a product home: server redirect to Labs, Ops discovery via topbar peer deep links (Labs + Media required), CommandPalette lab destinations on Ops builders, anti-leaf preserved, discoverability tests rewritten, UI.md policy updated. Score **100**. Move to `03-review`.

## Path to 100

- Already 100 after review-time doc comment polish (R2).
- Optional non-blocking: 0100 palette `operationsHubExtras` residual (R1); EPIC-20 UI.md status banner (R3).
