# Task 0046: Skills / Plugins Sandbox + Cloud Sync + Idempotency Hygiene

> **Status**: `[ ]` Open
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

- [ ] Primary six findings closed
- [ ] Security-relevant defaults documented in CHANGELOG
- [ ] Unit tests pass for env scrub, permissions, sync sign, hash, idempotency scope
- [ ] `npm run typecheck:core` passes
- [ ] `npm run lint` — no new errors
- [ ] CHANGELOG.md entry

---

## Details

### What

Subtasks:

- [ ] **Ler código existente** e o report em `docs/reports/06-lib-features-tooling.md` listado em Source reports: skill sandbox/docker executor, plugin loader/manifest, cloud sync client (in/out), CLIProxy installer hash path, idempotency middleware/service, related tests/docs
- [ ] Env allowlist for skill containers
- [ ] Enforce permissions on production load path (not only labels)
- [ ] Signature verification policy + outbound redaction
- [ ] Force hash verify on install
- [ ] Key idempotency by `hash(apiKeyId|requestId|bodyFingerprint)` or equivalent
- [ ] Stretch pluginWorker + signing invoke
- [ ] Tests + CHANGELOG

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
