# Task 0046: Skills / Plugins Sandbox + Cloud Sync + Idempotency Hygiene

> **Status**: `[x]` Completed (final review 100/100 — promoted 2026-07-18)
> **Priority**: 🟠 P1
> **Type**: `remediation`
> **Origin**: Epic 0008 — Adversarial Remediation (S7)
> **Action type**: HARDEN
> **Blocks**: none
> **Depends on**: none
> **Architect-2**: Reviewed 2026-07-11 — P1 set complete; no ownership change; MCP plugin_install path jail stays in 0044

---

## Source reports (builder reference)

Primary:
- `docs/reports/06-lib-features-tooling.md` — F-06-001, F-06-002, F-06-003, F-06-004, F-06-W2-001, F-06-W2-002 (stretch: F-06-006, F-06-010, F-06-W2-004–006)

Also relevant:
- `docs/reports/00-wave-plan-exclusions.md` — exclusions context
- MCP `plugin_install` path jail is Task **0044** / `docs/reports/04-mcp-edge-runtime.md` (not this task)

---

## Objective

Close **untrusted code execution and credential exfiltration** paths in skills, plugins, cloud sync, and request idempotency:

1. **F-06-001**: Skill Docker sandbox must not inherit full host `process.env` (scrub secrets).
2. **F-06-002**: Production plugin loader must enforce manifest permissions.
3. **F-06-003**: Cloud sync must not accept unsigned responses when signing is expected / secret unset policy fixed.
4. **F-06-004**: CLIProxy install must not skip SHA-256 verification.
5. **F-06-W2-001**: Cloud sync outbound must not POST OAuth tokens / plaintext API keys to `CLOUD_URL`.
6. **F-06-W2-002**: Idempotency cache must be scoped by API key (principal); do not treat bare `X-Request-Id` as global idempotency key across tenants.

Stretch: pluginWorker path escape (F-06-006), signing helpers invoked (F-06-010), skill workspace mount (F-06-W2-004), ACP env inheritance (F-06-W2-006).

## Background Context

### Finding IDs

| ID | Severity | Title |
|----|----------|-------|
| **F-06-001** | P1 | Skill Docker sandbox inherits full host `process.env` |
| **F-06-002** | P1 | Production plugin loader ignores manifest permissions |
| **F-06-003** | P1 | Cloud sync accepts unsigned responses when secret unset |
| **F-06-004** | P1 | CLIProxy install can skip SHA-256 verification |
| **F-06-W2-001** | P1 | Cloud sync outbound posts OAuth tokens + plaintext keys |
| **F-06-W2-002** | P1 | Idempotency cache global; X-Request-Id as idempotency key |
| Stretch | | F-06-006, F-06-010, F-06-W2-004–006 |

See **Source reports** above for full relative paths.

### Out of scope

- MCP plugin_install path jail (Task **0044**)
- Middleware hooks `new Function` (Task **0040**)
- Dual-mode / fusion

---

## Test Requirements

- MUST: docker/sandbox env builder excludes JWT_SECRET, API_KEY_SECRET, STORAGE_ENCRYPTION_KEY, provider tokens (allowlist-only env)
- MUST: plugin without required permission denied at load/activate
- MUST: cloud sync response without valid signature rejected when secret configured; define fail-closed policy when secret **unset** (prefer reject sync apply)
- MUST: CLIProxy install fails if hash missing/mismatch (no skip path in production)
- MUST: outbound cloud payload redacts oauth tokens / api keys (snapshot test)
- MUST: two different API keys with same Request-Id do not share idempotent response
- Prefer unit tests with mocked docker/fetch

---

## Exit Conditions (GDD/TDD)

- [x] Primary six findings closed
- [x] Security-relevant defaults documented in CHANGELOG
- [x] Unit tests pass for env scrub, permissions, sync sign, hash, idempotency scope
- [x] `npm run typecheck:core` passes (no new errors in touched files; pre-existing combo/runtimeUnits only)
- [x] `npm run lint` — no new errors on touched files
- [x] CHANGELOG.md entry

---

## Details

### What

Subtasks:

- [x] **Ler código existente** e o report em `docs/reports/06-lib-features-tooling.md` listado em Source reports: skill sandbox/docker executor, plugin loader/manifest, cloud sync client (in/out), CLIProxy installer hash path, idempotency middleware/service, related tests/docs
- [x] Env allowlist for skill containers
- [x] Enforce permissions on production load path (not only labels)
- [x] Signature verification policy + outbound redaction
- [x] Force hash verify on install
- [x] Key idempotency by `hash(apiKeyId|requestId|bodyFingerprint)` or equivalent
- [x] Stretch pluginWorker path jail + name (F-06-006); signing invoke deferred (F-06-010 P2)
- [x] Tests + CHANGELOG

### Where

| Arquivo | Propósito |
|---------|-----------|
| `src/lib/skills/**` sandbox/executor | Modificar — env scrub |
| `src/lib/plugins/**` or plugin loader | Modificar — permissions |
| Cloud sync module (grep `CLOUD_URL` / cloud sync) | Modificar — sign + redact |
| CLIProxy / version installer hash | Modificar |
| Idempotency service/middleware | Modificar — principal scope |
| `tests/unit/` | Expandir |
| `CHANGELOG.md` | Entry |

### How

1. Grep `process.env` in skill docker spawn.
2. Grep `OMNIROUTE_CLOUD_SYNC` and payload builders.
3. Grep idempotency / `X-Request-Id`.
4. TDD each P1.

### Why

Skills/plugins run operator-adjacent code; cloud sync and idempotency without tenant isolation leak credentials and poison multi-client caches.

---

## ⛔ Anti-Hallucination Guardrails

> [!CAUTION]
> DO NOT ship “sync works without secret” as default in production.
> DO NOT include OAuth refresh tokens in cloud payloads.
> DO NOT use global Map keyed only by Request-Id.

> [!IMPORTANT]
> First subtask: read existing code. Hard Rule #18.

---

## 🛡️ Compliance Checklist (Leis Primárias do AGENTS.md)

- [ ] **Doc Accuracy**
- [ ] **Zod Validation** for sync payloads
- [ ] **Security**: env + permissions + secrets
- [ ] **Error Sanitization** on A2A stretch if touched
- [ ] **Shell**: no new interpolations (Hard Rule #13)
- [ ] **Tests**

---

## 📋 Completion Evidence (preenchido pelo agente executor)

- **Arquivos criados/modificados**:
  - `src/lib/skills/sandbox.ts` — `buildDockerCliEnv` / `buildContainerEnv`; no `...process.env`
  - `src/lib/plugins/loader.ts` — `assertPluginPermissions` on production load
  - `src/lib/plugins/pluginWorker.ts` — path jail + `name` param (F-06-006 stretch)
  - `src/lib/cloudSync.ts` — fail-closed signature; outbound HMAC; secrets gate for upload
  - `src/lib/sync/bundle.ts` — default metadata-only sanitize; `includeSecrets` opt-in
  - `src/lib/versionManager/binaryManager.ts` — hard-fail missing/mismatch SHA-256
  - `src/lib/idempotencyLayer.ts` + `open-sse/handlers/chatCore/idempotency.ts` + chatCore wire — principal-scoped keys; drop X-Request-Id as idempotency key
  - Tests: `skills-sandbox-env-scrub-0046`, `plugins-permission-enforce-0046`, `cloud-sync-hygiene-0046`, `binaryManager-checksum-0046`, updated `idempotency`, `cloud-sync`, `cloud-sync-hmac`, `sync-bundle`, `chatcore-extracted-modules-3821`, `plugin-sandbox-permissions`
  - `CHANGELOG.md`, `docs/reference/ENVIRONMENT.md`
- **Finding IDs closed**: F-06-001, F-06-002, F-06-003, F-06-004, F-06-W2-001, F-06-W2-002 (+ stretch F-06-006)
- **Testes**: `node --import tsx/esm --test` on the suite above — 72 pass / 0 fail
- **typecheck / lint**: no errors in touched files; eslint clean on touched paths
- **CHANGELOG**: Unreleased Security entry for Task 0046
- **Agente executor**: builder (Task 0046)
- **Data de conclusão**: 2026-07-11

---

## 🔍 Review Trail (preenchido pelo reviewer)

- **Reviewer**: reviewers (independent FULL re-review / adversarial security) — 2026-07-18
- **Veredito**: `PASS_PATH_TO_100`
- **Score**: 100/100
- **Notas**: Six P1s reconfirmed; N7 kill env scrub closed; 34/34 live suite. N1 static plugin scan + N6 replay accepted product residuals. Lane: remain `03-review/`. Report: `docs/reports/reviews/2026-07-18-task-0046-skills-plugins-cloud-final-review.md`.

---

## Review Ledger

> [!IMPORTANT]
> Before path-to-100 work, read the latest full report and all reports listed
> under Previous Reports. Persistent findings and regression guards are part of
> the acceptance contract; do not fix the latest finding by undoing a previously
> accepted repair.

### Latest Review

- **Date**: 2026-07-18
- **Reviewer profile**: `reviewers` (independent FULL re-review / adversarial security)
- **Score**: `100/100`
- **Verdict**: `PASS_PATH_TO_100`
- **Full report**: `docs/reports/reviews/2026-07-18-task-0046-skills-plugins-cloud-final-review.md`
- **Lane outcome**: remains in `docs/tasks/03-review/`
- **Task reference**: Task 0046 (`omniroute-skills-plugins-cloud-sync-hygiene`)

#### Current Open Blockers

- none (blocking)
- accepted residuals: N1 static plugin perms; N6 signed replay optional; N2 checksum test depth

#### Path-to-100 Closure (verified live)

| ID | Status |
|----|--------|
| N7 docker kill env scrub | ✅ closed |
| N1 capability sandbox | ➖ accepted residual |
| N6 replay nonce | ➖ optional residual |

#### Regression Guards

- No `...process.env` on skill `run()` docker CLI / container `-e`
- Checksum hard-fail (no size>0 skip)
- Principal-scoped idempotency; no bare X-Request-Id key
- Cloud fail-closed without secret (unless INSECURE=1); outbound metadata-only default
- docker kill / killAll scrub via `buildDockerCliEnv` (N7)

- **Live tests**: 34/34 targeted suite
- **Patches this session**: none
- **Lane**: remains `03-review/`

### Previous Reports

- `2026-07-16` — `90/100` — `docs/reports/reviews/2026-07-16-task-0046-skills-plugins-cloud-reaudit.md`
  - **Carried forward then**: N1 static perms; N6 replay; N7 kill env; N2 checksum depth
  - **Resolved since**: N7 (fixer 2026-07-18); reconfirmed this final review
  - **Regression guard**: six P1 letter exits
- `2026-07-11` — `92/100` — `docs/reports/reviews/2026-07-11-task-0046-skills-plugins-cloud-review.md`
  - **Carried forward**: N1 static plugin perms, N2 weak checksum test
  - **Regression guard**: six P1 letter exits

## Lane promotion

- **Promoted to 04-completed**: 2026-07-18 — parent reviewer-orchestrator after independent final review **100/100**.
