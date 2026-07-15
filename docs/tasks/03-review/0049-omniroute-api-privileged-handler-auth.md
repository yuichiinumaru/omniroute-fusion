# Task 0049: Privileged API Handler Auth — Cloud Creds, Relay, Translator, Keys, Sessions

> **Status**: `[x]` Complete — pending review
> **Priority**: 🟠 P1
> **Type**: `remediation`
> **Origin**: Epic 0008 — Adversarial Remediation (S10)
> **Action type**: HARDEN
> **Blocks**: none
> **Depends on**: Task **0040** preferred (classification matrix first); soft **0041** for key material (hash-only / reveal policy)
> **Architect-2**: Upgraded 2026-07-11 — primary P1s only; F-07-W2-006 sessions demoted to stretch (P2)

---

## Source reports (builder reference)

Primary:
- `docs/reports/07-app-api.md` — F-07-006, F-07-007, F-07-W2-004, F-07-W2-005 (stretch: F-07-W2-006, F-07-011–015, F-07-W2-007–010)

Also relevant:
- `docs/reports/00-wave-plan-exclusions.md` — exclusions context
- Route classification / LOCAL_ONLY matrix is Task **0040** (same `07` report for F-07-001/W2-001 RCE surfaces)
- Hash-only / no bulk key reveal product outcome coordinates with Task **0041** / `docs/reports/05-lib-data-auth.md`

---

## Objective

Close **handler-level authorization gaps** on high-value mutators and credential surfaces that remain exploitable when pipeline policy is misconfigured or `requireLogin=false`:

1. **F-07-006**: `/api/cloud/credentials/update` must not let any inference API key overwrite provider OAuth tokens — manage-scope / dedicated auth + connection binding.
2. **F-07-007**: `/api/relay/tokens` (+ `[id]`) must require management auth; never leak `tokenHash` in list/detail; mint gated.
3. **F-07-W2-004**: `/api/translator/send` requires handler auth (must not spend operator credentials anonymously).
4. **F-07-W2-005**: `/api/cli-tools/keys` must not return full raw API key material to remote clients — LOCAL_ONLY and/or redact + one-time reveal policy (align with 0041 hash-only).

Stretch: F-07-W2-006 sessions map (P2), F-07-011 A2A env-open, F-07-012 Trae authorize state, F-07-015 assess auth, F-07-W2-007 a2a tasks, F-07-W2-009 cli tokens mint ALWAYS_PROTECTED, F-07-W2-010 OAuth callback server.

## Background Context

### Finding IDs

| ID | Severity | Title |
|----|----------|-------|
| **F-07-006** | P1 | Public cloud credentials update overwrites OAuth tokens |
| **F-07-007** | P1 | Relay tokens no handler auth; mint + tokenHash leak |
| **F-07-W2-004** | P1 | translator/send no handler auth; spends provider creds |
| **F-07-W2-005** | P1 | cli-tools/keys returns full raw API keys remotely |
| Stretch | P2 | F-07-W2-006 sessions; F-07-011–015; F-07-W2-007–010 |

See **Source reports** above for full relative paths.

### Relationship to 0040 / 0041

- **0040** owns LOCAL_ONLY / ALWAYS_PROTECTED / SPAWN classification.
- This task owns **requireManagementAuth / scope checks / response redaction** even when classification is correct.
- If keys route should be LOCAL_ONLY, add membership in 0040 (coordinate) **and** redact here.
- **0041** hash-only may make bulk `rawKey` reveal impossible — prefer that product outcome; do not reintroduce plaintext bulk dump.

### Out of scope

- openapi/try and hooks RCE (0040)
- Dual-mode provider refresh (0006)
- Error sanitize helper default (0051) unless fixing a route you already touch

---

## Test Requirements

- MUST: cloud credentials update rejects unscoped API keys; requires manage/cloud principal
- MUST: relay tokens GET/POST without auth → 401 when requireLogin true **and** still protected when requireLogin false (ALWAYS_PROTECTED or in-handler always-auth)
- MUST: relay responses omit `tokenHash` (raw token only once on create if product requires)
- MUST: translator/send without management auth → 401
- MUST: cli-tools/keys does not return full key material over non-loopback (or never stores revealable full keys — align with 0041)
- Prefer route unit tests with mocked auth helpers

---

## Exit Conditions (GDD/TDD)

- [x] Primary four P1 findings closed with tests
- [x] PUBLIC classification of `/api/cloud/` narrowed or credential route removed from public surface
- [x] Stretch items deferred with residual list if not done
- [x] `npm run typecheck:core` passes
- [x] `npm run lint` — no new errors
- [x] CHANGELOG.md security entry
- [x] Update `publicApiRoutes` / AUTHZ docs if classification changes

---

## Details

### What

Subtasks:

- [x] **Ler código existente** e o report em `docs/reports/07-app-api.md` listado em Source reports: `src/app/api/cloud/credentials/update/route.ts`, `publicApiRoutes.ts`, `src/app/api/relay/tokens/**`, `src/app/api/translator/send/route.ts`, `src/app/api/cli-tools/keys/route.ts`, `requireManagementAuth`, classify/policies, existing authz tests; skim 0041 hash-only design if parallel
- [x] Fix cloud credentials scope + connection id binding
- [x] Auth + strip tokenHash on relay routes
- [x] Auth translator/send
- [x] Redact/LOCAL_ONLY keys route (coordinate 0040 membership if LOCAL_ONLY)
- [x] Stretch: sessions auth + high-value mutators if time
- [x] Tests + docs + CHANGELOG

### Where

| Arquivo | Propósito |
|---------|-----------|
| `src/app/api/cloud/credentials/update/route.ts` | Modificar |
| `src/shared/constants/publicApiRoutes.ts` | Modificar se needed |
| `src/app/api/relay/tokens/**` | Modificar |
| `src/app/api/translator/send/route.ts` | Modificar |
| `src/app/api/cli-tools/keys/route.ts` | Modificar |
| `src/app/api/sessions/**` | Stretch |
| `src/lib/api/requireManagementAuth.ts` | Ler |
| `tests/unit/` authz/api | Expandir |
| `docs/architecture/AUTHZ_GUIDE.md` | Update if public surface changes |
| `CHANGELOG.md` | Entry |

### How

1. Pattern match routes that already use both pipeline + `requireManagementAuth`.
2. Apply same dual gate to listed routes.
3. For cloud public prefix: split path so credential mutation is MANAGEMENT not PUBLIC.

### Why

Classification alone is insufficient when PUBLIC prefixes or missing in-handler auth allow anonymous credential mint/overwrite on common `requireLogin=false` installs.

---

## ⛔ Anti-Hallucination Guardrails

> [!CAUTION]
> DO NOT leave cloud credential update on fully PUBLIC `/api/cloud/` without scope checks.
> DO NOT return `tokenHash` or full API keys in list endpoints.
> DO NOT compete with dual-mode 0032–0039.
> DO NOT reintroduce bulk plaintext key dump after 0041 hash-only lands.

> [!IMPORTANT]
> First subtask: read existing code. Prefer 0040 merge order; align key reveal with 0041.

---

## 🛡️ Compliance Checklist (Leis Primárias do AGENTS.md)

- [x] **Doc Accuracy**
- [x] **Zod Validation** preserved
- [x] **Security**: authz + secret redaction
- [x] **Error Sanitization** if editing catch blocks
- [x] **Tests**
- [x] **LOCAL_ONLY** only when spawn/disk secret dump requires (keys)

---

## 📋 Completion Evidence (preenchido pelo agente executor)

- **Arquivos criados/modificados**:
  - `src/lib/api/requireManagementAuth.ts` — `{ always?: boolean }` option
  - `src/app/api/cloud/**` — re-tracked after `.gitignore` `/cloud/` root-only; credentials manage auth + connectionId
  - `src/shared/constants/publicApiRoutes.ts` — narrow public cloud prefixes; segment-safe match
  - `src/server/authz/{routeGuard,classify}.ts` — ALWAYS_PROTECTED + LOCAL_ONLY keys; classify via isPublicApiRoute
  - `src/app/api/relay/tokens/**` — always management auth; strip tokenHash
  - `src/app/api/translator/send/route.ts` — always management auth
  - `src/app/api/cli-tools/keys/route.ts` — no bulk rawKey; always auth
  - `src/app/api/sessions/route.ts` — stretch management auth (F-07-W2-006)
  - `src/lib/db/relayProxies.ts` — ESM createHash (require fix for create)
  - `src/app/api/keys/route.ts` — mask from keyPrefix under hash-only
  - `src/shared/validation/schemas/cloud.ts` — optional connectionId
  - Tests: `tests/unit/privileged-handler-auth-0049.test.ts` + updated keys/classify/routeGuard/public-api-routes
  - Docs: AUTHZ_GUIDE, ROUTE_GUARD_TIERS, CHANGELOG
- **Finding IDs closed**: F-07-006, F-07-007, F-07-W2-004, F-07-W2-005 (stretch: F-07-W2-006 sessions auth)
- **Residual deferred**: F-07-011–015, F-07-W2-007–010 (as planned stretch outside primary four)
- **Testes**: `node --import tsx/esm --test tests/unit/privileged-handler-auth-0049.test.ts tests/unit/cli-tools-keys-route.test.ts tests/unit/public-api-routes.test.ts tests/unit/authz/routeGuard.test.ts tests/unit/authz/classify.test.ts` — 103 pass
- **typecheck / lint**: `npm run typecheck:core` clean; eslint on touched sources clean
- **CHANGELOG**: Unreleased Security entry for Task 0049
- **Agente executor**: builder (Task 0049)
- **Data de conclusão**: 2026-07-11

---

## 🔍 Review Trail (preenchido pelo reviewer)

- **Reviewer**: reviewers (Code Quality Reviewer / independent)
- **Veredito**: PASS WITH NOTES — hold in `03-review/` (S ≥ 90; not `02-doing/`; not `04-completed/`)
- **Score**: 94/100
- **Notas**: Primary four P1s closed (cloud credentials dual-gate + connectionId binding; relay always-auth + tokenHash strip; translator/send always-auth; cli-tools/keys LOCAL_ONLY + no bulk rawKey). Fresh: 104/104 unit suite, typecheck:core clean, eslint clean. Residual path-to-100: multi-conn route test; explicit requireLogin=false matrix; sessions stretch lacks `always:true` (accepted). Report: `docs/reports/reviews/2026-07-11-task-0049-api-privileged-handler-auth-review.md`
