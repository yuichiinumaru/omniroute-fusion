# Task 0049: Privileged API Handler Auth — Cloud Creds, Relay, Translator, Keys, Sessions

> **Status**: `[ ]` Open
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

- [ ] Primary four P1 findings closed with tests
- [ ] PUBLIC classification of `/api/cloud/` narrowed or credential route removed from public surface
- [ ] Stretch items deferred with residual list if not done
- [ ] `npm run typecheck:core` passes
- [ ] `npm run lint` — no new errors
- [ ] CHANGELOG.md security entry
- [ ] Update `publicApiRoutes` / AUTHZ docs if classification changes

---

## Details

### What

Subtasks:

- [ ] **Ler código existente** e o report em `docs/reports/07-app-api.md` listado em Source reports: `src/app/api/cloud/credentials/update/route.ts`, `publicApiRoutes.ts`, `src/app/api/relay/tokens/**`, `src/app/api/translator/send/route.ts`, `src/app/api/cli-tools/keys/route.ts`, `requireManagementAuth`, classify/policies, existing authz tests; skim 0041 hash-only design if parallel
- [ ] Fix cloud credentials scope + connection id binding
- [ ] Auth + strip tokenHash on relay routes
- [ ] Auth translator/send
- [ ] Redact/LOCAL_ONLY keys route (coordinate 0040 membership if LOCAL_ONLY)
- [ ] Stretch: sessions auth + high-value mutators if time
- [ ] Tests + docs + CHANGELOG

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

- [ ] **Doc Accuracy**
- [ ] **Zod Validation** preserved
- [ ] **Security**: authz + secret redaction
- [ ] **Error Sanitization** if editing catch blocks
- [ ] **Tests**
- [ ] **LOCAL_ONLY** only when spawn/disk secret dump requires (keys)

---

## 📋 Completion Evidence (preenchido pelo agente executor)

- **Arquivos criados/modificados**:
- **Finding IDs closed**:
- **Testes**:
- **typecheck / lint**:
- **CHANGELOG**:
- **Agente executor**:
- **Data de conclusão**:

---

## 🔍 Review Trail (preenchido pelo reviewer)

- **Reviewer**:
- **Veredito**:
- **Score**:
- **Notas**:
