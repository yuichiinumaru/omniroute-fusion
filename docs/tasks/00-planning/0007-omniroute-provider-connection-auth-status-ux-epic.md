# Epic 0007 — Provider Connection Auth-Status UX (API Key vs OAuth)

> **Status**: Planning (promote child tasks next)  
> **Priority**: High (P1 product UX; unblocks operator trust after 0006 heal)  
> **Author**: Grok session (omniroute-fusion) · 2026-07-11  
> **Project**: omniroute-fusion  
> **Type**: UX / remediation  
> **Action types**: `UX_VIS` + `HARDEN` (status mapping)  
> **Depends on**: Epic **0006** S2 contracts preferred (status codes / error taxonomy stable); heal (0006 S3) can land first  
> **Related**:  
> - Epic **0006** dual-mode refresh correctness (backend) — **no runtime gates here**  
> - Epic **0005** / `docs/guides/UI.md` / `docs/architecture/NAV-TREE-TARGET.md` — stay under **Providers** hub; **no new sidebar leaves**  
> - Live false copy: “re-authenticate” / “No refresh token” on AI Studio + Qoder PAT cards

---

## 1. Goal (RF8 · Goals)

### Problem

Even when backend marks are wrong (0006), the **dashboard already speaks OAuth language** for connections that are static API keys:

- `lastError`: “No refresh token available — re-authenticate this account.”  
- Provider card `expiredBadge` for `expiryStatus === "expired"` without distinguishing **oauth token death** vs **false health-check expiry** vs **upstream 401 on key**.  
- Token health header badge is OAuth-oriented (`totalOAuth`) but operators still read connection-level errors on provider detail cards.

Operators on `:21000` see **13 Gemini AI Studio keys + 9 Qoder PATs** as “expired / re-authenticate” when the correct UX is:

| Auth mode | Healthy failure UX | Wrong UX (today) |
|-----------|--------------------|------------------|
| `apikey` | Invalid key / rate limit / test failed | “Refresh token… re-authenticate” |
| `oauth` | Re-auth / re-import / refresh failed | (correct) |
| `cookie` | Re-paste session cookie | OAuth refresh copy |

### Value

1. **Trust**: API-key rows never ask for refresh tokens in UI.  
2. **Actionability**: correct next step (rotate key vs OAuth re-login).  
3. **IA compliance**: all work stays inside Providers hub / connection cards — **0 new sidebar leaves** (Epic 0005 / UI.md).

### Success metrics

| Metric | Target |
|--------|--------|
| Apikey connection detail | Never shows “refresh token” / “re-authenticate OAuth” primary CTA for `no_refresh_token` or pure apikey expiry |
| Error taxonomy mapping | `errorCode`/`lastErrorType` → auth-mode-aware copy helper |
| ProviderCard / detail | Badge + tooltip distinguish credential modes |
| i18n | EN + existing locales keys for new strings (or reuse safe generic keys) |
| No new sidebar leaf | Assert against `PRIMARY_SIDEBAR_ITEMS` / UI.md |

### Stop criteria (out of scope)

- Backend heal / health-check logic → **0006**.  
- Full Providers page rewrite / hub shell IA beyond status copy.  
- Onboarding wizard redesign (unless a one-line auth-type label is needed).  
- KiroAuthModal refresh-token field (correct for Kiro/amazon-q OAuth import).

---

## 2. Domain (RF8 · Domain)

### Bounded context

| Area | Owner modules | Notes |
|------|---------------|-------|
| Provider list card | `src/app/(dashboard)/dashboard/providers/components/ProviderCard.tsx` | `expiredBadge` |
| Connection detail / limits | `src/app/(dashboard)/dashboard/usage/components/ProviderLimits/**` | re-auth string concat |
| Token health badge | `src/shared/components/TokenHealthBadge.tsx` | aggregate OAuth only — verify it never counts apikey |
| Status vocabulary | `src/shared/constants/statusVocabulary.ts` (Epic 0005 micro) | prefer reuse |
| i18n | `src/i18n/messages/*.json` | providers / stats namespaces |
| Error codes | produced by 0006 / health / test routes | `no_refresh_token`, `refresh_failed`, `reauth_required` |

### UX rules (invariants)

1. **Copy is auth-mode aware** — never use OAuth re-auth primary message when `authType ∈ {apikey, api_key, cookie, none}`.  
2. **False `no_refresh_token` on apikey** (legacy rows until 0006 heal): UI treats as **health-check glitch / ignore refresh** — show “credential OK pending heal” or map to neutral “needs re-test”, not OAuth.  
3. **No new leaf** — edit existing Providers surfaces only.  
4. **Prefer shared formatter** — one `formatConnectionStatusMessage(conn)` used by card + detail (condensation with 0006 helper if useful).

### Current-state evidence

- Live DB: all gemini/qoder apikey rows show `last_error` with re-authenticate refresh copy.  
- `ProviderCard.tsx` ~L344–346: generic expired badge.  
- `ProviderLimits` ~L418: `` `${errorMsg} — re-authenticate this account.` ``  
- TokenHealthBadge: filters oauth + requires refreshToken (OK aggregate); connection list is the main pain.

---

## 3. Stories / slices (for task-architect)

| Story | Intent |
|-------|--------|
| **S1 Status copy helper** | Pure function: `(authType, testStatus, errorCode, lastError) → { badge, title, detail, cta }` with unit tests |
| **S2 Wire ProviderCard + connection detail** | Consume helper; remove hard-coded OAuth re-auth for apikey |
| **S3 Limits / quota widgets** | Same helper for re-auth suffix |
| **S4 i18n + visual polish** | Keys + statusVocabulary alignment; no rainbow; a11y labels |
| **S5 Regression snapshot** | Unit tests for matrix (gemini apikey no_refresh, oauth no_refresh, apikey 401, oauth refresh_failed) |

Dependency: S1 → S2/S3 parallel → S4 → S5.

---

## 4. Validation

```bash
# unit tests for copy helper
node --import tsx/esm --test tests/unit/connection-status-copy*.test.ts
# no new primary sidebar ids
node -e "const m=require('./src/shared/constants/sidebarVisibility.ts')" # or existing UI.md guard tests
npm run typecheck:core
```

Manual (optional): open Providers on 21000 after 0006 heal — gemini keys show active/testable, not “re-auth”.

---

## 5. Risks

| Risk | Mitigation |
|------|------------|
| Hiding real OAuth re-auth | Helper must still surface re-auth for `authType=oauth` |
| Diverging copy from backend heal | Coordinate errorCode allowlist with 0006 |
| i18n gaps | EN first + fallback; follow existing providers namespace |

---

## 6. Promotion note for gt-task-architect

Promote atomic tasks to `docs/tasks/01-open/` after **0006** numbering (continue **0032+** sequence; do not collide).  
Prefix slug: `omniroute-provider-auth-status-ux-*`.  
Enforce UI.md: **no new default-visible sidebar leaf**.  
Template: `docs/tasks/.archive/000-template-moved-to-parent.md`.

---

## 7. Child tasks (promoted 2026-07-11)

| Task | File | Slice |
|------|------|-------|
| 0037 | `docs/tasks/01-open/0037-omniroute-provider-auth-status-copy-helper.md` | S1+S5 helper + matrix |
| 0038 | `docs/tasks/01-open/0038-omniroute-provider-auth-status-wire-card.md` | S2 ProviderCard wire |
| 0039 | `docs/tasks/01-open/0039-omniroute-provider-auth-status-limits-i18n.md` | S3+S4 Limits + i18n |

**Parent review upgrades:** pin copy helper to `src/shared/utils/connectionStatusCopy.ts`; no optional 0040 (polish folded into 0039).
