# Task 0036: Deploy/Verify 22000 Dual-Mode Auth Correctness

> **Status**: `[ ]` Open — **HOLD / operator-only for live :22000**
> **Priority**: 🔴 P0 (product correctness residual — **not** free builder pickup)
> **Type**: `verification`
> **Origin**: Epic 0006 — Dual-Mode Auth / API-Key Refresh Correctness (S5)
> **Action type**: HARDEN (ops proof)
> **Blocks**: none (closes Epic 0006 success metrics on live data)
> **Depends on**: Task 0033, Task 0034
> **Parallelism**: `operator-hold` — never parallel with any live :22000 operation
> **Review routing**: independent operator/infrastructure review

---

> [!CAUTION]
> ## HOLD — PORT 22000 = PRODUÇÃO — NÃO MEXER
>
> Root `AGENTS.md`: **localhost:22000 is production**. Agents must **NOT**:
> - `docker rm` / recreate / restart the production container without **explicit operator command**
> - rebuild/redeploy the live :22000 image without operator approval
> - mutate the live production SQLite database without operator approval
>
> **Default agent path = DRY-RUN**: copy the operator-resolved production DB → heal/matrix against the copy + source/bundle greps only.  
> Live rebuild/restart/heal-on-prod = **operator-only**. Use **:23456** for test/canary traffic.  
> Desrespeitar essa regra = production session kill + permanent model ban risk.

---
> **Queued after Epic 0008**: **Q4** — [`QUEUE-post-adversarial-return.md`](../00-planning/QUEUE-post-adversarial-return.md)  
> Note: QUEUE is historical for Q1–Q3; this task is residual dual-mode **ops HOLD**, not the sole open product lane (see `01-open/` EPIC-10…19 children).


## Objective

Prove on the operator environment that serves **:22000** (or document equivalent operator-owned verify if rebuild is external) that:

1. Deployed/runtime code includes the connection-level OAuth refresh guard (`connectionUsesOAuthRefresh` or shared equivalent) — not only `supportsTokenRefresh(provider)`
2. After heal (Task 0034) applied to that data directory: **0** rows with `auth_type = 'apikey' AND error_code = 'no_refresh_token'`
3. Health sweep no longer re-marks gemini/qoder apikey rows on next cycle

This is a **verification** task — **operator-executed** for live :22000; agents prepare runbook + **DRY-RUN** evidence by default. Product code changes only if verify finds residual gaps (then open/fix under 0033/0034, do not expand scope here).

## Background Context

### Historical pre-fix evidence (2026-07-11; former 21000 mapping)

The following evidence refers to the former `21000` production mapping and must not be treated as the current production database path:

`data-21000/storage.sqlite`:

| auth_type | provider | `no_refresh_token` count |
|-----------|----------|--------------------------|
| apikey | gemini | **13** |
| apikey | qoder | **9** |
| oauth | windsurf | 2 |
| oauth | github | 1 |

Container `omniroute-21000` health chunk (pre-rebuild) lacked `connectionUsesOAuthRefresh` while workspace source already had it — classic **deploy lag**. This is historical evidence only.

### What already exists

- Source guard + SQL oauth filter + unit matrix (Tasks 0032–0033)
- Heal path (Task 0034)
- Read-only diagnostic query from Epic 0006 §5

### What is missing

- Documented rebuild/redeploy steps for the current 22000 instance
- Before/after SQLite counts captured as Completion Evidence
- Confirmation that oauth legitimate no_rt rows (github/windsurf) still visible if still valid

### Environment anchors (operator must resolve current values)

| Item | Value |
|------|--------|
| Container | Operator-resolved production container serving `:22000` |
| Host port | `22000` |
| Data mount | Operator-resolved production `DATA_DIR` → container `/data` (`storage.sqlite`) |
| Image lag signal | built health chunk missing `connectionUsesOAuthRefresh` while workspace source has it |

### Suggested verify commands (adapt to actual rebuild path)

```bash
# Before — operator substitutes the current production DATA_DIR; do not guess a path
sqlite3 <PRODUCTION_DATA_DIR>/storage.sqlite \
  "SELECT auth_type, provider, COUNT(*) FROM provider_connections WHERE error_code='no_refresh_token' GROUP BY 1,2;"

# After operator-approved rebuild+restart+heal
sqlite3 <PRODUCTION_DATA_DIR>/storage.sqlite \
  "SELECT auth_type, provider, COUNT(*) FROM provider_connections WHERE error_code='no_refresh_token' GROUP BY 1,2;"
# expect: zero rows with auth_type='apikey'

# Bundle proof (container)
docker exec <PRODUCTION_CONTAINER> sh -c \
  'grep -l connectionUsesOAuthRefresh /app/.build/next/server/chunks/*.js 2>/dev/null | wc -l'
# expect: >0 after rebuild that includes Tasks 0032/0033
```

If live rebuild is operator-gated: copy the operator-resolved production `storage.sqlite` to a temp dir, run heal unit/integration against that copy, record counts — still satisfies dry-run exit.

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
- If live deploy is blocked: MUST document blocked reason + dry-run of heal against a **copy** of the operator-resolved production `storage.sqlite` with same SQL targets

---

## Exit Conditions (GDD/TDD)

- [ ] **HOLD respected**: no live :22000 docker recreate/restart without explicit operator command recorded in Completion Evidence
- [ ] Runbook steps executed by operator **or** agent **DRY-RUN** on DB copy + source greps (default agent path)
- [ ] Before table recorded in Completion Evidence
- [ ] After table recorded; apikey `no_refresh_token` = 0 (or dry-run proves heal+code would achieve 0)
- [ ] Proof that runtime bundle includes connection guard (string search in built chunk **or** approved build identifier) — on **deployed** artifact only with operator; agents may grep workspace source + optional :23456
- [ ] Unit regression still green on the same commit:
  - `node --import tsx/esm --test tests/unit/token-health-no-refresh-token-expired-5326.test.ts`
  - heal unit suite from Task 0034
- [ ] `npm run typecheck:core` passes on the verified commit (if local tree is that commit)
- [ ] `npm run lint` — no new errors if any verify scripts added
- [ ] `.changelog/` verification entry is created through the changelog engine and generated summaries are rebuilt.

---

## Details

### What

Subtasks:

- [ ] **Read existing code / ops context**: deploy path for the :22000 service (compose/systemd/docker as used in this environment), operator-resolved `DATA_DIR`, heal entrypoint from 0034, health check start site
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
| Operator-resolved production `DATA_DIR` / `storage.sqlite` | Ler — evidence DB (do not commit DB) |
| Deploy/compose/systemd for the :22000 service | Ler — operator rebuild |
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
2. Operator deploys the build that contains the connection auth guard (match the approved build identifier).
3. Run heal (migration on boot or explicit admin path from 0034).
4. After: same SQL; expect 0 apikey rows.
5. Optional: `rg -n "connectionUsesOAuthRefresh|connectionAuthMode" dist/` or equivalent on deployed artifact.

### Why

Epic 0006 success metrics are **live-data** metrics. Unit tests alone cannot clear the historical corrupted rows or prove the current :22000 container is not still running the old dual-mode-blind chunk.

---

## Parallelism / file ownership

| Class | Detail |
|-------|--------|
| **operator-hold** | Only the operator may perform live :22000 rebuild/restart/heal operations. Agents use dry-run evidence or :23456 only. |
| **serializable** | Must not run concurrently with any production deployment, database heal, or other task using the production `DATA_DIR`. |
| **Collision** | Production container, production `storage.sqlite`, deploy artifacts, and operator runbook evidence. |

---

## ⛔ Anti-Hallucination Guardrails

> [!CAUTION]
> DO NOT claim live verify without pasting command output (or dry-run substitute).
> DO NOT delete oauth no_rt rows “to clean the table”.
> DO NOT commit `storage.sqlite` or real credentials into git.

> [!IMPORTANT]
> Prefer operator-approved access to 22000. If unavailable, dry-run on a **copy** of the operator-resolved production DB is acceptable with explicit label `DRY-RUN` in evidence. Use :23456 only for non-production smoke tests.
> Hard Rule #18: verification must be real — unit tests already done in 0033/0034; this task is the live/VPS-style proof.

---

## 🛡️ Compliance Checklist

- [ ] **Doc Accuracy**: Paths and ports verified in this environment
- [ ] **Zod Validation**: N/A
- [ ] **Security**: No secrets in evidence; redact tokens
- [ ] **Error Sanitization**: N/A
- [ ] **No Raw SQL**: Read-only diagnostics OK; mutations via heal module
- [ ] **Archive Protocol**: N/A

---

## 📋 Completion Evidence

### Historical CANARY (2026-07-11) — former **:22000 test mapping**; not current production evidence

| Port | Role | Image / container |
|------|------|-------------------|
| **22000** | Former canary (new dual-mode build) | `omniroute:base` @ `dbbf8ef` (`c981a7e22406`), container `omniroute` |
| **21000** | Former baseline (old) | `cf7e77db8238`, container `omniroute-21000` — **not recreated** |

**Before (22000 / data-test):** apikey gemini **9** + qoder **9** (+ oauth windsurf 2, github 1)  
**After boot heal:** apikey `no_refresh_token` = **0**; oauth windsurf(2)+github(1) retained  
**Log:** `[STARTUP] Healed 18 false-positive no_refresh_token connection(s) (static credentials)`  
**Bundle:** `connectionUsesOAuthRefresh` chunks on 22000 = **1**; on 21000 = **0**  
**HTTP:** both 307 (up)  
**21000 baseline still dirty:** apikey remaining **22** (gemini 13 + qoder 9)

**Historical status:** the old canary/baseline comparison is not a current deployment instruction. A new operator-owned :22000 verification must record current identifiers.

### Earlier DRY-RUN
DB copy heal proved 0 apikey before live canary (see session notes).
- **Entrada no changelog**: [referência ou N/A]
- **Agente executor**: [nome/role]
- **Data de conclusão**: [YYYY-MM-DD]

---

## 🔍 Review Trail

- **Reviewer**: [nome/role]
- **Data da review**: [YYYY-MM-DD]
- **Veredito**: [APROVADO / REJEITADO]
- **Score (path to 100)**: [0-100]
- **Notas**: [evidence-based]
- **Se REJEITADO**: mover para `02-doing/` com motivo no topo
