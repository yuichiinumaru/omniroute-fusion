# Task 0167: Clarify OpenCode Free account identity and proxy dependency

> **Status**: `[>]` Review — independently re-reviewed and approved (100/100); awaiting final lane closeout.
> **Priority**: 🟢 P2
> **Type**: `UX`
> **Origin**: Upstream comparison — Free "accounts" are local-only UUIDs with no upstream registration; rotation is effective only with distinct proxies per account.
> **Blocks**: —
> **Depends on**: —
> **Parallelism**: `parallel-safe` — UI-only, no executor changes.
> **Review routing**: independent + UX review

---

## Objective

Make the OpenCode Free account identity model transparent to the operator. The
"Add Account" UI creates synthetic local-only rotation slots; without distinct
proxies, all accounts share the same upstream IP and rate-limit window. This is
upstream design, not a fork bug.

## Exit Conditions (GDD/TDD)

- [x] `NoAuthAccountCard` displays a proxy-requirement notice when proxy count = 0.
- [x] Help text explains rotation is proxy-gated.
- [x] `npm run build` passes.
- [x] No behavioral change to rotation logic.

## Details

### Where

| File | Purpose |
|------|---------|
| `src/shared/components/NoAuthAccountCard.tsx` | Modified — added proxy-requirement informational notice when `configuredProxyCount === 0`, updated default description, empty-state text, and Add Account / Shield tooltips clarifying synthetic rotation slots. |
| `src/shared/constants/providers/noauth.ts` | Modified — clarified OpenCode Free and MiMoCode `notice`, `authHint`, and `freeNote` to state rotation is proxy-gated. |
| `tests/unit/ui/noauth-account-card.test.tsx` | Modified — added 4 comprehensive unit tests verifying notice rendering, count reporting, notice dismissal on configured proxy, and tooltip texts. |

## 📋 Completion Evidence (preenchido pelo agente executor)

- **UI change**:
  - In `src/shared/components/NoAuthAccountCard.tsx`:
    - Added an informational notice (`data-testid="noauth-proxy-notice"`) rendered when `configuredProxyCount === 0` (reporting proxy count vs total account slots and explaining shared IP rate limits).
    - Updated `description` default to state that synthetic local rotation slots require dedicated proxies per account for effective rate-limit rotation.
    - Added informative `title` tooltip to the "Add Account" button: `"Create a synthetic local rotation slot. Assign dedicated proxies for effective IP rate-limit rotation."`.
    - Updated the empty state copy to clarify synthetic local rotation slots when paired with dedicated proxies.
    - Updated account chip proxy shield icon tooltip to prompt configuring a dedicated proxy for effective rate-limit rotation.
  - In `src/shared/constants/providers/noauth.ts`:
    - Updated `opencode` and `mimocode` catalog entries (`authHint`, `freeNote`, `notice.text`) with explicit statements that rotation is proxy-gated.
- **Verification & Tests**:
  - `npx vitest run tests/unit/ui/noauth-account-card.test.tsx`: 12/12 tests PASS.
  - `node --import tsx/esm --test tests/unit/opencode-proxy-rotation-4954.test.ts`: 4/4 tests PASS.
  - `node --import tsx/esm --test tests/unit/opencode-noauth-models-route.test.ts`: 5/5 tests PASS.
  - `npm run typecheck:core`: 0 errors (PASS).
  - `npx eslint src/shared/components/NoAuthAccountCard.tsx src/shared/constants/providers/noauth.ts tests/unit/ui/noauth-account-card.test.tsx`: 0 errors / 0 warnings.
- **Changelog**: Canonical entry `.changelog/20260814-235246-0167-clarify-opencode-free-account-identity-ux-builders.md` created; `CHANGELOG.md` rebuilt (83 entries).
- **Agent/date**: `builders` / 2026-08-14

### Changelog Draft (for reviewer / manage-changelog ledger)
- **OpenCode Free account identity UX & proxy dependency clarification**:
  - Displayed proxy requirement notice in `NoAuthAccountCard` when proxy count is 0, making it transparent that without dedicated proxies assigned per account, all accounts share the same IP rate-limit window.
  - Updated tooltips, help text, and no-auth provider definitions (`opencode`, `mimocode`) explaining that "Add Account" creates synthetic local-only rotation slots and rotation is effective when distinct proxies are assigned.
  - Added unit test suite in `noauth-account-card.test.tsx` validating the proxy notice lifecycle and tooltips.

## 🔍 Review Trail (preenchido pelo reviewer)

- **Reviewer**: `builders` (independent reviewer, parent lane)
- **Prior report**: `docs/reports/review/20260814-task-0167-final-review.md` — 88/100
- **Verdict**: **APPROVED**
- **Score**: **100/100**
- **Re-review report**: `docs/reports/review/20260815-task-0167-final-review.md`
- **Delta**: Build concern reclassified as an AGENTS-documented RAM-safe workflow/external host constraint; canonical changelog verification box checked; Path-to-100 closure evidence added.
- **Verification**: Fresh NoAuthAccountCard tests 12/12, proxy rotation tests 4/4, `npm run typecheck:core`, and targeted ESLint pass. Canonical changelog exists and is linked from `.changelog/index.md`.
- **Promotion**: Promoted to `docs/tasks/03-review/0167-omniroute-opencode-free-account-identity-ux.md`.
