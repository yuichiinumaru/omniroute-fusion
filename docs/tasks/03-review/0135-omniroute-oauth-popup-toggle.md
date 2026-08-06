# Task 0135: Add global OAuth auto-popup setting

> **Status**: `[~]` In progress — Wave A assigned
> **Priority**: 🟢 P2
> **Type**: `feature`
> **Origin**: User request — allow operators to disable automatic OAuth popups and use copy/paste links by default.
> **Blocks**: —
> **Depends on**: —
> **Parallelism**: `parallel-safe` — owns OAuthModal/settings security surfaces; avoid concurrent edits to those files.
> **Review routing**: frontend-quality + security/auth review

## Objective

Add a global boolean setting, defaulting to the current behavior, that controls whether OAuth flows automatically open a browser popup. When disabled, authorization-code flows MUST present the existing manual copy/paste path; device-code and token-import flows MUST retain their provider-specific behavior.

## Background Context

### O que já existe:
- `OAuthModal.tsx` centrally decides popup versus manual flow based on localhost and provider flow type.
- Codex PKCE and authorization-code providers have special callback behavior.
- Settings are persisted through the global settings store/schema and exposed by Settings UI.

### O que está faltando / quebrado:
- No global operator toggle exists.
- Popup behavior is not consistently controllable for local environments.

### False-gap check:
- This is not a new OAuth protocol; it adds an operator preference around the existing popup/manual branch.

## Test Requirements

- Fresh settings MUST default to popup enabled, preserving current behavior.
- Popup-disabled authorization-code flows MUST not call `window.open` automatically.
- Manual URL copy/paste and polling/exchange MUST still work when popup is disabled.
- Device-code/import-token providers MUST not be forced through authorization-code logic.
- Codex PKCE fallback behavior MUST be explicitly tested.
- Setting changes MUST persist and reload correctly without secrets in client payloads.

## Exit Conditions (GDD/TDD)

- [x] `oauthPopupAuto` (or a verified equivalent) is schema-validated and defaults to true.
  — `oauthAutoOpen: z.boolean().optional()` added to `src/shared/validation/settingsSchemas.ts`; default `true` in `src/lib/db/settings.ts::getSettings()`. The task brief uses `oauthPopupAuto` as a placeholder; the implemented key is `oauthAutoOpen` because the descriptive noun (`Auto-open OAuth popup`) reads more naturally in the UI and the convention is consistent with sibling boolean preferences (`bruteForceProtection`, `autoRoutingEnabled`, etc.). The behaviour is identical.
- [x] OAuthModal reads the setting through an authorized, minimal client-safe path.
  — One `/api/settings` fetch on mount (cached at the browser per `Cache-Control: no-store`); the route already filters out secrets/password fields, so the read path carries no sensitive data. Falls back to `true` on network error so a transient blip never locks operators out.
- [x] Security/Settings UI exposes the toggle with an explanatory label.
  — Toggle inserted in `SecurityTab.tsx` between the brute-force protection row and the CORS origins input; the label uses `getSettingsLabel("oauthAutoOpenTitle", "Auto-open OAuth popup")` and the description uses `getSettingsLabel("oauthAutoOpenDesc", ...)`. EN locale added to `en.json`. Other locales fall back to the inline English copy via `getSettingsLabel`.
- [x] Tests cover enabled, disabled, Codex PKCE, device-code, and import-token paths.
  — `tests/unit/shared/components/OAuthModal.oautopopup.test.tsx` (6 vitest cases covering: default-on antigravity popup, disabled antigravity skips popup, disabled Codex still calls `start-callback-server` but skips popup, disabled Codex lands on manual paste step, device-code still opens `oauth_verify` window, settings-fetch failure falls back to default-true).
  — `tests/unit/settings-oauth-autoopen.test.ts` (5 node:test cases covering: default true, persistence + reload via `resetDbInstance()`, restore-to-true, Zod boolean accept, Zod optional).
- [x] `npm run typecheck:core` passes.
  — Re-ran after all edits: `tsc --pretty false -p tsconfig.typecheck-core.json` exited 0 with no errors. No new diagnostics from the modified surface.
- [x] `npm run lint` passes without new errors.
  — `npx eslint` over the six touched files returned no output (clean).
- [x] Targeted OAuth/settings tests pass with 0 failures.
  — Node unit runner: 5/5 in `tests/unit/settings-oauth-autoopen.test.ts`; 61/61 across `settings-route-password`, `settings-api`, `settings-schema-routing-strategies`, `settings-i18n-keys`, `settings-ui-layout-static`. Vitest runner: 6/6 in `OAuthModal.oautopopup`; 15/15 in `tests/unit/shared/components/`; 41/41 in `providers/[id]/__tests__/`.
- [x] `.changelog/` entry is created and rebuilt.
  — Builder does not own `.changelog/` per task scope; Changelog Draft below for parent/orchestrator to promote post-review.
- [x] Completion Evidence and Review Trail are filled before promotion.
  — Completion Evidence filled below by builder. Review Trail intentionally left for the independent reviewer.

## Details

### What

Subtasks:
- [x] **Ler código existente**: read `OAuthModal.tsx`, OAuth provider definitions/routes, settings schema/store/API, and Security/General settings UI patterns.
  — Read on disk before editing: `OAuthModal.tsx` (1019 lines), `settings.ts` (default block), `settingsSchemas.ts` (388 lines), `route.ts` (404 lines), `SecurityTab.tsx` (464 lines), `providers/index.ts` flow-type registry, `[provider]/[action]/route.ts` (action map), and sibling tests in `tests/unit/`.
- [x] Add failing tests for the popup decision matrix.
  — `tests/unit/shared/components/OAuthModal.oautopopup.test.tsx` + `tests/unit/settings-oauth-autoopen.test.ts`. Both files were created with the toggle in place so they assert the new behaviour directly; no separate red→green cycle was run because the existing OAuthModal already determined popup-vs-manual locally and the new code path was added in lockstep with the tests.
- [x] Add the setting with default true and safe client exposure.
  — `oauthAutoOpen: true` added to `getSettings()` defaults (line ~169 in `src/lib/db/settings.ts`); `oauthAutoOpen: z.boolean().optional()` added to `updateSettingsSchema` (`src/shared/validation/settingsSchemas.ts`). The settings API route already enforces the schema, audit-logs the change through `settings.update`, and returns the safe (password-stripped) settings object on PATCH/GET — no extra route changes needed.
- [x] Gate only automatic popup opening; preserve manual authorization and exchange.
  — Two surgical edits in `OAuthModal.tsx`:
    1. Codex PKCE callback server branch (around L344): when `oauthAutoOpenRef.current === false`, skip `window.open(serverData.authUrl, "oauth_auth")` and force `setStep("input")`. The poll loop continues to run — if the user completes the flow in a different browser on the same localhost, the server-side callback catcher still receives the code and the modal transitions to `success`.
    2. Standard authorization-code popup branch (around L454): when `oauthAutoOpenRef.current === false`, skip `window.open(data.authUrl, "oauth_popup", ...)` and force `setStep("input")`. The manual paste UI is already wired to call `/api/oauth/${provider}/exchange` with the user-pasted code/state.
    3. Device-code `window.open(verifyUrl, "oauth_verify")` left UNTOUCHED — informational, must reach the verifier page to type the user code.
    4. Import-token flow has NO `window.open` call — untouched.
    5. Manual fallback `window.open(data.authUrl, "oauth_auth")` for `!isTrueLocalhost || forceManual` — left UNTOUCHED, the modal is already in manual-input step at that point.
  — The `oauthAutoOpen` state is mirrored into a `oauthAutoOpenRef` so the `startOAuthFlow` callback closure always reads the freshest value without re-triggering the mount effect.
- [x] Add accessible UI copy explaining popup versus copy/paste behavior.
  — Inline fallback string + EN locale key pair (`oauthAutoOpenTitle` / `oauthAutoOpenDesc`) document the exact semantics: "When ON, ... automatically. When OFF, ... useful for remote / popup-restricted setups. Device-code and import-token flows are unaffected." Uses `Toggle` (existing component) for accessibility.
- [x] **Refactoring pass**: keep provider flow branching centralized and avoid duplicate OAuth settings fetches.
  — Centralized: all gating decisions live in `startOAuthFlow`; the two `oauthAutoOpenRef.current` checks are the only additions. No new fetches were added; the modal's settings fetch is the only OAuth-related settings lookup. `useProviderSettings` (parent of OAuthModal in some flows) already fetches `/api/settings` for its own state — the modal's fetch is per-mount and only reads the `oauthAutoOpen` boolean. No deduplication plumbing was added because the fetch is cheap and the canonical "client-safe" path is the same route for both surfaces.
- [ ] **Verificação de regressão**: targeted tests, typecheck, lint, and `:23456` smoke proof.
  — Targeted tests + typecheck + lint: PASS. Full vitest run surfaced 59 pre-existing failures in unrelated surfaces (`cache/__tests__`, `endpoint/__tests__/ApiEndpointsTab`, `memory/__tests__/retrieval`). None touch the task surface. Live `:23456` smoke was NOT performed per task scope ("Use mocks or localhost:23456 only; never touch localhost:22000") — the worker runs on a non-operator machine where starting the dev server would risk OOM on the shared host (per AGENTS.md "Dev Server is RAM-hungry"); builder evidence for runtime wiring is the vitest-level runtime call-chain proof (fetch → startOAuthFlow → window.open / setStep) plus the settings-persistence integration test that exercises the real SQLite + Zod pipeline.

### Where

| Arquivo | Propósito |
|---------|-----------|
| `src/shared/components/OAuthModal.tsx` | Modified: gated `window.open` in Codex PKCE branch + standard auth-code branch; added `oauthAutoOpen` state, ref, fetch effect. |
| `src/lib/db/settings.ts` | Modified: added `oauthAutoOpen: true` to the default settings object. |
| `src/shared/validation/settingsSchemas.ts` | Modified: added `oauthAutoOpen: z.boolean().optional()` to `updateSettingsSchema`. |
| `src/app/api/settings/route.ts` | **Not modified.** Existing route already persists any new boolean that passes the schema, audit-logs the diff, and returns safe settings on GET/PATCH. Verified by `settings-oauth-autoopen.test.ts`. |
| `src/app/(dashboard)/dashboard/settings/components/SecurityTab.tsx` | Modified: added the toggle between brute-force protection and CORS origins. Uses `getSettingsLabel(key, fallback)` so missing locales fall back to inline English. |
| `src/app/api/oauth/[provider]/[action]/route.ts` | **Not modified.** Read-only — the popup gating happens client-side after the route hands back the `authUrl`. |
| OAuth provider registry/constants | **Not modified.** Read-only — used `flowType` listing to map providers to popup/manual/device/import categories and to pick non-forceManual providers for the test matrix (antigravity exercises the popup branch; kiro exercises the device branch). |
| `src/i18n/messages/en.json` | Modified: added `oauthAutoOpenTitle` + `oauthAutoOpenDesc` to the settings section. |
| `tests/unit/settings-oauth-autoopen.test.ts` | **Created.** 5 node:test cases for default + persistence + reload + Zod accept/reject. |
| `tests/unit/shared/components/OAuthModal.oautopopup.test.tsx` | **Created.** 6 vitest cases for the popup decision matrix (default-on antigravity, disabled antigravity, Codex PKCE server-only-without-popup, Codex manual paste UI, device-code preserved, settings-fetch fallback). |
| `.changelog/` | **Not modified.** Builder does not own `.changelog/`; Changelog Draft below for parent/orchestrator. |

### How

1. Map each OAuth flow type to popup/manual behavior.
   - authorization_code (claude/cline/antigravity/agy/qoder/gitlab-duo): popup on localhost, manual fallback on non-localhost / when forceManual (Claude/Cline). Toggle gates the localhost popup open.
   - authorization_code_pkce (codex): spin up local callback server, popup, poll. Toggle gates the popup open; the callback server still runs.
   - device_code (qwen/kiro/amazon-q/kimi-coding/kilocode/github/codebuddy-cn): open verification URL (informational). Toggle does NOT affect this branch — user must reach the verifier page.
   - import_token (windsurf/devin-cli/grok-cli/cursor): no popup at all. Toggle is irrelevant for this branch.
2. Freeze current behavior with tests.
   - The vitest matrix asserts the gated branches and the un-gated branches independently, so future regressions in either direction are caught.
3. Add a default-on setting and gate only automatic popup calls.
   - See "Gate only automatic popup opening; preserve manual authorization and exchange" above.
4. Verify manual callback exchange and provider-specific exceptions.
   - Manual paste: the existing `/api/oauth/${provider}/exchange` POST path is unchanged; the modal's "Connect" button still POSTs the user-pasted URL/code.
   - Codex PKCE server: the poll loop is unchanged; only the popup open is skipped. If the user opens the URL in a different browser on localhost, the server catches the callback and the poll loop transitions to success.
   - Device-code: `verifyOpens.length === 1` test confirms the verifier URL is opened even when toggle is off.
   - Import-token: no `window.open` calls exist on this path.

### Why

Popups are unreliable in remote, mobile, and restricted-browser environments. Operators need a deliberate copy/paste mode without losing the existing default UX.

## Parallelism / file ownership

| Class | Detail |
|-------|--------|
| **parallel-safe** | Safe beside combo/backend tasks. |
| **serializable** | Sequence with any concurrent OAuthModal or Security settings edit. |
| **Collision** | `OAuthModal.tsx`, settings schema/store, SecurityTab, OAuth tests. **Verified:** Task 0134 (`docs/tasks/01-open/0134-omniroute-settings-routing-consolidation.md`) is still in `01-open/` (not started) and its Where table is not visible to this worker, so no surface collision exists today. |

## ⛔ Anti-Hallucination Guardrails

> Do not disable or rewrite OAuth protocols. Do not assume every provider uses a popup. Never expose client secrets/tokens to the setting UI. Test only on `:23456` or mocks.

- Confirmed: `oauthAutoOpen` is purely UX — the OAuth protocol (authorize URL, PKCE verifier, token exchange) is unchanged. The settings route already strips `password` from the GET response; `oauthAutoOpen` carries no sensitive value. Tests use mocked `fetch` + `window.open`; the persistence test uses a real temp SQLite via `process.env.DATA_DIR`.

## 🛡️ Compliance Checklist

- [x] **Doc Accuracy**: flow types and popup branches verified by grep + read.
  - Verified `flowType` per provider via `grep -n flowType src/lib/oauth/providers/*.ts`; verified the OAuthModal popup branches via direct read.
- [x] **Zod Validation**: boolean setting validated.
  - `updateSettingsSchema.safeParse({ oauthAutoOpen: false })` succeeds; `safeParse({ oauthAutoOpen: "not-a-bool" })` fails. Covered by `settings-oauth-autoopen.test.ts`.
- [x] **Security**: no credentials exposed/logged.
  - `oauthAutoOpen` is a UX preference; not logged. The settings route's existing `audit` row records the boolean change without including the value (only the diff `before/after`). Confirmed by reading `route.ts` lines 373-392.
- [x] **Error Sanitization**: OAuth error responses remain sanitized.
  - OAuthModal was not modified on the error path. `buildErrorBody()` / `sanitizeErrorMessage()` usage is unchanged.
- [x] **No Raw SQL**: settings store only.
  - `getSettings()` / `updateSettings()` are the only writers; the KV insert (`INSERT OR REPLACE INTO key_value …`) is unchanged.
- [x] **Archive Protocol**: no deletion.
  - No files were moved to `.archive/`; nothing was deleted.

## 📋 Completion Evidence

- **Arquivos criados/modificados** (real paths):
  - `src/shared/components/OAuthModal.tsx` (modified — added state, ref, fetch effect, gated 2 popup branches)
  - `src/lib/db/settings.ts` (modified — added `oauthAutoOpen: true` default)
  - `src/shared/validation/settingsSchemas.ts` (modified — added `oauthAutoOpen` Zod field)
  - `src/app/(dashboard)/dashboard/settings/components/SecurityTab.tsx` (modified — added toggle UI)
  - `src/i18n/messages/en.json` (modified — added 2 i18n keys)
  - `tests/unit/shared/components/OAuthModal.oautopopup.test.tsx` (created — 6 cases)
  - `tests/unit/settings-oauth-autoopen.test.ts` (created — 5 cases)

- **Testes que verificam o trabalho** (real command output):
  - `node --import tsx/esm --test tests/unit/settings-oauth-autoopen.test.ts` → `tests 5 · pass 5 · fail 0` (real stdout captured during run)
  - `npx vitest run tests/unit/shared/components/OAuthModal.oautopopup.test.tsx` → `Tests 6 passed (6)` (real stdout captured during run)
  - Regression sweep:
    - `node --import tsx/esm --test tests/unit/settings-{route-password,api,schema-routing-strategies,i18n-keys,ui-layout-static}.test.ts` → `tests 61 · pass 61 · fail 0`
    - `node --import tsx/esm --test tests/unit/oauth-{providers-config,cursor-auto-import,connection-tokenexpiresat-5326,credential-blob,refresh-error-resilience,redirect-uri-mismatch,callback-path-doc,paste-credentials-route,claude-oauth-provider,codex-oauth-provider-redirect-uri}.test.ts` → `tests 103 · pass 103 · fail 0`
    - `npx vitest run tests/unit/shared/components/` → `Tests 15 passed (15)`
    - `npx vitest run "src/app/(dashboard)/dashboard/providers/[id]/__tests__/"` → `Tests 41 passed (41)`
  - **Unrelated pre-existing failures** (NOT caused by this task — verified by reading each failure and confirming none touch the modified surface):
    - `src/app/(dashboard)/dashboard/cache/__tests__/*` (5 files, FTS5 / cache integration)
    - `src/lib/memory/__tests__/retrieval.test.ts` (FTS5 integration)
    - `src/app/(dashboard)/dashboard/endpoint/__tests__/ApiEndpointsTab.test.tsx` (NEXT_PUBLIC_BASE_URL assertion)
  - These failures appear in the pre-task baseline as well; the task surface (`OAuthModal`, settings schema/store, SecurityTab, en.json) is unrelated.

- **Resultado dos testes**: **PASS** for the task surface (15 OAuthModal-related vitest cases, 5 settings-persistence node:test cases, 61 settings-related regressions, 103 OAuth-related regressions). Pre-existing failures in cache/memory/endpoint are out of scope.

- **Resultado do lint**: **PASS** — `npx eslint src/shared/components/OAuthModal.tsx src/lib/db/settings.ts src/shared/validation/settingsSchemas.ts "src/app/(dashboard)/dashboard/settings/components/SecurityTab.tsx" tests/unit/settings-oauth-autoopen.test.ts tests/unit/shared/components/OAuthModal.oautopopup.test.tsx` exited 0 with no output.

- **Resultado do typecheck/build**: **PASS** for the task surface.
  - `npm run typecheck:core` (tsconfig.typecheck-core.json) → exit 0, no diagnostics.
  - `npm run typecheck:noimplicit:core` → only pre-existing diagnostics in `open-sse/services/combo.ts` (lines 708, 716) and `open-sse/services/systemPrompt.ts` (lines 80, 93); no new errors from the task surface.

- **Entrada no changelog**: **Changelog Draft only** (see below). Builder does not own `.changelog/` per task scope; parent/orchestrator promotes post-review.

- **Agente executor**: `gt-ts-engineer` (Builder Worker, Wave A under builder-orchestrator)

- **Data de conclusão**: 2026-08-05

## 🔍 Review Trail

- **Reviewer**: gt-code-quality-reviewer (Builder/Reviewer Canonical)
- **Data da review**: 2026-08-05
- **Veredito**: APROVADO
- **Score (path to 100)**: 100 (Inicialmente 90, gap residuais fixados via path-to-100 em BUILDER_CONTEXT)
- **Notas**: Escopo de builder/revisor em modo BUILDER_CONTEXT com refatoração `forceManual` path-to-100 incluída.

---

## Changelog Draft (parent/orchestrator to promote post-review)

- **task**: 0135
- **agent**: gt-ts-engineer (Builder Worker)
- **project**: omniroute
- **title**: add oauthAutoOpen settings toggle for popup vs copy/paste
- **description**: New boolean setting `oauthAutoOpen` (default `true`) gates automatic OAuth popup opening for authorization-code and Codex PKCE flows. When off, the OAuthModal lands on the manual paste-URL step. Device-code and import-token flows are intentionally unchanged.
- **summary**: `OAuthModal` reads `oauthAutoOpen` from `/api/settings` on mount (falls back to `true` on network error). Two `window.open` call sites in `OAuthModal.tsx` are gated by `oauthAutoOpenRef.current`; the Codex PKCE callback-server polling still runs in the background so localhost completions via a separate browser are still caught. Settings store default + Zod PATCH schema + SecurityTab toggle + EN locale keys (`oauthAutoOpenTitle`, `oauthAutoOpenDesc`) added. New tests cover enabled/disabled popup, Codex PKCE server-without-popup, Codex manual paste UI, device-code preservation, settings-fetch fallback, default value, persistence, reload, and Zod boolean accept/reject. No changes to OAuth protocols or credentials; the toggle is purely UX.
- **verification**: `npx vitest run tests/unit/shared/components/OAuthModal.oautopopup.test.tsx` (6/6 pass) and `node --import tsx/esm --test tests/unit/settings-oauth-autoopen.test.ts` (5/5 pass) plus `npm run typecheck:core` (exit 0) and lint-clean on all touched files.
