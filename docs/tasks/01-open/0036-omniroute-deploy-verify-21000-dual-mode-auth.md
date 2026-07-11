# Task 0036: Deploy/Verify 21000 Dual-Mode Auth Correctness

> **Status**: `[ ]` Open
> **Priority**: 🔴 P0
> **Type**: `verification`
> **Origin**: Epic 0006 — Dual-Mode Auth / API-Key Refresh Correctness (S5)
> **Action type**: HARDEN (ops proof)
> **Blocks**: none (closes Epic 0006 success metrics on live data)
> **Depends on**: Task 0033, Task 0034

---

## Objective

Prove on the operator environment that serves **:21000** (or document equivalent operator-owned verify if rebuild is external) that:

1. Deployed/runtime code includes the connection-level OAuth refresh guard (`connectionUsesOAuthRefresh` or shared equivalent) — not only `supportsTokenRefresh(provider)`
2. After heal (Task 0034) applied to that data directory: **0** rows with `auth_type = 'apikey' AND error_code = 'no_refresh_token'`
3. Health sweep no longer re-marks gemini/qoder apikey rows on next cycle

This is a **verification** task — may be operator-executed with agent-prepared runbook. Product code changes only if verify finds residual gaps (then open/fix under 0033/0034, do not expand scope here).

## Background Context

### Live pre-fix evidence (2026-07-11)

`data-21000/storage.sqlite`:

| auth_type | provider | `no_refresh_token` count |
|-----------|----------|--------------------------|
| apikey | gemini | **13** |
| apikey | qoder | **9** |
| oauth | windsurf | 2 |
| oauth | github | 1 |

Container `omniroute-21000` health chunk (pre-rebuild) lacked `connectionUsesOAuthRefresh` while workspace source already had it — classic **deploy lag**.

### What already exists

- Source guard + SQL oauth filter + unit matrix (Tasks 0032–0033)
- Heal path (Task 0034)
- Read-only diagnostic query from Epic 0006 §5

### What is missing

- Documented rebuild/redeploy steps for this fork’s 21000 instance
- Before/after SQLite counts captured as Completion Evidence
- Confirmation that oauth legitimate no_rt rows (github/windsurf) still visible if still valid

### Environment anchors (this workspace)

| Item | Value |
|------|--------|
| Container | `omniroute-21000` |
| Host port | `21000` |
| Data mount | host `data-21000/` → container `/data` (`storage.sqlite`) |
| Image lag signal | built health chunk missing `connectionUsesOAuthRefresh` while workspace source has it |

### Suggested verify commands (adapt to actual rebuild path)

```bash
# Before
sqlite3 data-21000/storage.sqlite \
  "SELECT auth_type, provider, COUNT(*) FROM provider_connections WHERE error_code='no_refresh_token' GROUP BY 1,2;"

# After rebuild+restart+heal
sqlite3 data-21000/storage.sqlite \
  "SELECT auth_type, provider, COUNT(*) FROM provider_connections WHERE error_code='no_refresh_token' GROUP BY 1,2;"
# expect: zero rows with auth_type='apikey'

# Bundle proof (container)
docker exec omniroute-21000 sh -c \
  'grep -l connectionUsesOAuthRefresh /app/.build/next/server/chunks/*.js 2>/dev/null | wc -l'
# expect: >0 after rebuild that includes Tasks 0032/0033
```

If live rebuild is operator-gated: copy `data-21000/storage.sqlite` to a temp dir, run heal unit/integration against that copy, record counts — still satisfies dry-run exit.

### Out of scope

- gemini-cli ya29 401 investigation
- Full UI redesign (0007)
- Changing production credentials

---

## Test Requirements

- MUST capture **before** counts with the SQL below (or equivalent read via DB module)
- MUST capture **after** counts post-deploy + heal
- MUST assert semantic target: `COUNT(*) WHERE auth_type='apikey' AND error_code='no_refresh_token'` = **0**
- MUST note remaining oauth no_rt rows (expected possible)
- MUST record image/build identifier (SHA, image tag, or `dist/BUILD_SHA` if used)
- If live deploy is blocked: MUST document blocked reason + dry-run of heal against a **copy** of `data-21000/storage.sqlite` with same SQL targets

---

## Exit Conditions (GDD/TDD)

- [ ] Runbook steps executed or explicitly blocked with operator note + dry-run on DB copy
- [ ] Before table recorded in Completion Evidence
- [ ] After table recorded; apikey `no_refresh_token` = 0 (or dry-run proves heal+code would achieve 0)
- [ ] Proof that runtime bundle includes connection guard (string search in built chunk **or** version/SHA match to commit containing Task 0032/0033)
- [ ] Unit regression still green on the same commit:
  - `node --import tsx/esm --test tests/unit/token-health-no-refresh-token-expired-5326.test.ts`
  - heal unit suite from Task 0034
- [ ] `npm run typecheck:core` passes on the verified commit (if local tree is that commit)
- [ ] `npm run lint` — no new errors if any verify scripts added
- [ ] CHANGELOG.md entry only if tooling/scripts added; else Completion Evidence is the artifact (note N/A changelog with reason)

---

## Details

### What

Subtasks:

- [ ] **Read existing code / ops context**: deploy path for 21000 (compose/systemd/docker as used in this environment), `DATA_DIR` for 21000, heal entrypoint from 0034, health check start site
- [ ] **Snapshot before**: run SQL read-only on live or copy
- [ ] **Rebuild/redeploy** (operator) image including 0032–0034
- [ ] **Apply heal** if not auto on boot
- [ ] **Snapshot after** + optional trigger health sweep once
- [ ] **Confirm** apikey rows not re-marked
- [ ] **Write Completion Evidence** with exact commands and outputs
- [ ] **If blocked**: dry-run heal + matrix tests as substitute evidence + open operator question

### Where

| Arquivo | Propósito |
|---------|-----------|
| `data-21000/storage.sqlite` (or host path) | Ler — evidence DB (do not commit DB) |
| Deploy/compose/systemd for 21000 | Ler — operator rebuild |
| Heal module / migration from Task 0034 | Executar |
| `src/lib/tokenHealthCheck.ts` | Ler — guard presence in source for SHA mapping |
| `docs/tasks/01-open/0036-…` Completion Evidence | Preencher |
| Optional `scripts/` verify helper | Criar only if reusable and tested |

### How

1. Before:
   ```bash
   sqlite3 <DATA_DIR>/storage.sqlite \
     "SELECT auth_type, provider, COUNT(*) FROM provider_connections WHERE error_code='no_refresh_token' GROUP BY 1,2;"
   ```
2. Deploy build that contains connection auth guard (match git SHA).
3. Run heal (migration on boot or explicit admin path from 0034).
4. After: same SQL; expect 0 apikey rows.
5. Optional: `rg -n "connectionUsesOAuthRefresh|connectionAuthMode" dist/` or equivalent on deployed artifact.

### Why

Epic 0006 success metrics are **live-data** metrics. Unit tests alone cannot clear 22 corrupted rows on 21000 or prove the container is not still running the old dual-mode-blind chunk.

---

## ⛔ Anti-Hallucination Guardrails

> [!CAUTION]
> DO NOT claim live verify without pasting command output (or dry-run substitute).
> DO NOT delete oauth no_rt rows “to clean the table”.
> DO NOT commit `storage.sqlite` or real credentials into git.

> [!IMPORTANT]
> Prefer operator-approved access to 21000. If unavailable, dry-run on a **copy** of the DB is acceptable with explicit label `DRY-RUN` in evidence.
> Hard Rule #18: verification must be real — unit tests already done in 0033/0034; this task is the live/VPS-style proof.

---

## 🛡️ Compliance Checklist (Leis Primárias do AGENTS.md)

- [ ] **Doc Accuracy**: Paths and ports verified in this environment
- [ ] **Zod Validation**: N/A
- [ ] **Security**: No secrets in evidence; redact tokens
- [ ] **Error Sanitization**: N/A
- [ ] **No Raw SQL**: Read-only diagnostics OK; mutations via heal module
- [ ] **Archive Protocol**: N/A

---

## 📋 Completion Evidence (preenchido pelo agente executor)

### DRY-RUN (2026-07-11) — heal on DB **copy** only; live container not rebuilt yet

- **Code on main**: tip includes 0032–0035, 0037–0039 (`9d6096e` at verify time)
- **Live before** (`data-21000/storage.sqlite` read-only):
  - apikey/gemini: **13**
  - apikey/qoder: **9**
  - oauth/windsurf: 2
  - oauth/github: 1
- **Dry-run heal**: `sqlite3.backup` → `/tmp/omniroute-heal-dry/storage.sqlite` then
  `DATA_DIR=/tmp/omniroute-heal-dry node --import tsx/esm -e '…healFalsePositiveNoRefreshConnections()…'`
- **After on copy**: apikey `no_refresh_token` = **0**; remaining only oauth windsurf(2)+github(1)
- **Regression suite (workspace)**: 62 unit tests PASS (auth-mode + matrix + heal + status copy/presentation)
- **Still open for full closeout**:
  - [ ] Rebuild/redeploy `omniroute-21000` image with main SHA containing `connectionUsesOAuthRefresh`
  - [ ] Run heal against live `/data` (boot hook on restart OR one-shot with DATA_DIR)
  - [ ] `docker exec omniroute-21000 … grep connectionUsesOAuthRefresh …` count **>0**
  - [ ] Live SQL: 0 apikey `no_refresh_token`

- **Arquivos criados/modificados**: none (verify-only dry-run)
- **Build/SHA verified**: source main `9d6096e+` — **container image not yet rebuilt**
- **Before counts**: see above
- **After counts**: dry-run copy only — live still dirty until rebuild
- **Testes de regressão**: 62/62 PASS on unit pack
- **Resultado do lint**: N/A this step
- **Resultado do typecheck/build**: unit pack only this step
- **Entrada no changelog**: [referência ou N/A]
- **Agente executor**: [nome/role]
- **Data de conclusão**: [YYYY-MM-DD]

---

## 🔍 Review Trail (preenchido pelo reviewer)

- **Reviewer**: [nome/role]
- **Data da review**: [YYYY-MM-DD]
- **Veredito**: [APROVADO / REJEITADO]
- **Score (path to 100)**: [0-100]
- **Notas**: [evidence-based]
- **Se REJEITADO**: mover para `02-doing/` com motivo no topo
