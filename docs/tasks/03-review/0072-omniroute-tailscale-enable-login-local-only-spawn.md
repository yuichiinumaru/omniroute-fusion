# Task 0072: Tailscale enable/login LOCAL_ONLY + SPAWN_CAPABLE Classification (F-SEC-W2-001)

> **Status**: `[R]` In review (security reviewer ACCEPT 100 → 03-review 2026-07-19)  
> **Priority**: 🔴 P0 (Epic P1 residual; process-spawn via stolen manage JWT through tunnel)  
> **Type**: `remediation`  
> **Action type**: HARDEN  
> **Origin**: EPIC-12 — OmniRoute Security Residual Harden · Wave 2 security residual investigation  
> **Finding ID**: **F-SEC-W2-001** / **H-PRODUCT-005**  
> **Blocks**: none (closes Epic-12 success metric for Tailscale classification)  
> **Depends on**: none (Epic 0008 children 0040–0051 already completed — do **not** re-open them)  
> **Parallelism**: `serializable` (owns `routeGuard.ts` + `spawnCapablePrefixes.ts` + authz unit matrix)  
> **Review routing**: **bundled** with any other open PR that touches RouteGuard membership tables  

---

## Source reports (builder reference)

Primary:
- [`docs/reports/audits/2026-07-19-wave2-security-reviewer-residual-investigation.md`](../../reports/audits/2026-07-19-wave2-security-reviewer-residual-investigation.md) — F-SEC-W2-001, H-PRODUCT-005, Hard Rules #15/#17 sampling  
- [`docs/tasks/00-planning/EPIC-12-omniroute-security-residual-harden.md`](../00-planning/EPIC-12-omniroute-security-residual-harden.md) — T12-A  

Also relevant:
- [`docs/security/ROUTE_GUARD_TIERS.md`](../../security/ROUTE_GUARD_TIERS.md) — membership tables (install/start-daemon present; enable/login missing)  
- Hard Rules **#15**, **#17** in `CLAUDE.md` / `AGENTS.md`  
- Closed precedent: Task **0040** (F-07-003 covered install/start-daemon only)

---

## Objective

Close the **confirmed P1 residual** that Tailscale **enable** and **login** routes **spawn child processes** (`tailscale up` / funnel) but are classified as **non-LOCAL_ONLY** and **non-SPAWN_CAPABLE**, while unit tests **assert the wrong policy**.

Concrete outcomes:

1. `/api/tunnels/tailscale/enable` and `/api/tunnels/tailscale/login` are in **`LOCAL_ONLY_API_PREFIXES`** and **`SPAWN_CAPABLE_PREFIXES`**.
2. Unit matrix asserts both paths **are** local-only and spawn-capable; remove the false “non-spawn” comment/assert for enable.
3. Status-only path `/api/tunnels/tailscale` (and non-spawn siblings like check/disable if still non-spawn) remain remote-reachable **unless** code proves they spawn.
4. `docs/security/ROUTE_GUARD_TIERS.md` membership table updated to match code.
5. Optional stretch (same PR OK): sanitize raw `error.message` catches on enable/login routes via `createErrorResponseFromUnknown` / `buildErrorBody` (also listed under Task 0073 — do once, claim in one task’s evidence).

A leaked dashboard JWT **via tunnel** must **not** be able to trigger `tailscale` child processes on enable/login (Hard Rule #15 class — same as install/start-daemon closed in 0040).

## Background Context

### What already exists (0040 still true)

| Control | Evidence |
|---------|----------|
| install LOCAL_ONLY + SPAWN | `routeGuard.ts` ~L48–49; `spawnCapablePrefixes.ts` ~L42–43 |
| start-daemon LOCAL_ONLY + SPAWN | same |
| Unit lock for install/daemon | `tests/unit/authz/routeGuard.test.ts` F-07-003 |
| F-04-005 always-auth for SPAWN when `requireLogin=false` | `src/server/authz/policies/management.ts` |

### What is broken / incomplete

| Fact | Evidence |
|------|----------|
| enable/login **do spawn** | `src/lib/tailscaleTunnel.ts`: `startTailscaleLogin` → `spawn(...)` ~L642; `startTailscaleFunnel` → `spawn(...)` ~L726; `enableTailscaleTunnel` calls login + funnel |
| Routes only management-auth | `src/app/api/tunnels/tailscale/enable/route.ts`, `login/route.ts` — `requireTailscaleAuth` only; **no** loopback gate from LOCAL_ONLY |
| Missing from both inventories | Neither path in `LOCAL_ONLY_API_PREFIXES` nor `SPAWN_CAPABLE_PREFIXES` |
| **Wrong unit assertion** | `tests/unit/authz/routeGuard.test.ts` L52–57 asserts `isLocalOnlyPath("/api/tunnels/tailscale/enable") === false` with comment “Non-spawn tailscale status/enable” |

### Out of scope

- Re-opening Task 0040 acceptance or rewriting full tunnel matrix  
- Skills docker sandbox watch item (F-SEC residual note only — not this task)  
- Full Hard Rule #12 sanitize sweep (Task **0073**)  
- Secrets dual-read (Task **0074**)  
- Live `:21000` / docker mutation  

### Threat model (residual)

- **Asset**: host process spawn (`tailscale` binary)  
- **Threat**: stolen manage session via tunnel → remote spawn  
- **Fix class**: loopback LOCAL_ONLY + SPAWN_CAPABLE (deny manage-scope bypass + always-auth spawn)

---

## Test Requirements

> TDD: **update/add failing assertions first**, then fix constants so tests pass.

- [x] **DEVE** `isLocalOnlyPath("/api/tunnels/tailscale/enable") === true`
- [x] **DEVE** `isLocalOnlyPath("/api/tunnels/tailscale/login") === true` (and trailing-slash / subpath consistency if helper uses prefix match)
- [x] **DEVE** `isSpawnCapablePath("/api/tunnels/tailscale/enable") === true`
- [x] **DEVE** `isSpawnCapablePath("/api/tunnels/tailscale/login") === true`
- [x] **DEVE** keep `isLocalOnlyPath("/api/tunnels/tailscale") === false` for pure status GET root (unless product decides otherwise — default: keep status remote)
- [x] **DEVE** keep install + start-daemon true (no regression of F-07-003)
- [x] **DEVE** update `spawn-capable-prefixes-client-safe.test.ts` expected list if it enumerates SPAWN prefixes
- [x] **DEVE NOT** re-assert enable as non-local-only

---

## Exit Conditions (GDD/TDD)

- [x] Both prefixes added to `LOCAL_ONLY_API_PREFIXES` and `SPAWN_CAPABLE_PREFIXES` (or equivalent design documented if using SPAWN_CAPABLE_PATTERNS — prefer explicit prefixes matching install/daemon style)
- [x] `tests/unit/authz/routeGuard.test.ts` false enable assertion removed/inverted; login covered
- [x] Client-safe SPAWN list test updated if needed
- [x] `docs/security/ROUTE_GUARD_TIERS.md` table rows for enable + login
- [x] `node --import tsx/esm --test tests/unit/authz/routeGuard.test.ts tests/unit/authz/spawn-capable-prefixes-client-safe.test.ts` pass
- [x] Related authz suite still green if touched: `management-policy.test.ts`, `route-guard-version-get-exemption.test.ts` (run if import graph changes) — N/A (import graph unchanged; routeGuard suite covers management policy LOCAL_ONLY cases)
- [x] `npm run typecheck:core` passes (or only pre-existing unrelated errors documented)
- [x] `npm run lint` — no new errors on touched files (prettier clean)
- [x] Completion Evidence cites F-SEC-W2-001 closed with file:line anchors
- [x] CHANGELOG Unreleased Security entry (executor responsibility when implementing — not written by task architect)

---

## Details

### What

Subtasks:

- [x] **Ler código existente** (mandatory first): files in **Where** below + Wave 2 report § H-PRODUCT-005 + ROUTE_GUARD_TIERS tailscale rows
- [x] **TDD red**: flip/add assertions so enable/login are expected LOCAL_ONLY + SPAWN; confirm fail against current code
- [x] **Classify**: add `/api/tunnels/tailscale/enable` and `/api/tunnels/tailscale/login` to both prefix arrays (same style as install/start-daemon comments referencing F-SEC-W2-001)
- [x] **Docs**: update ROUTE_GUARD_TIERS membership table
- [x] **Optional stretch**: replace enable/login catch `error.message` with `createErrorResponseFromUnknown` / `buildErrorBody` (Hard Rule #12); if done, note in evidence so 0073 skips those two files
- [x] **Verify** prefix matching: `path.startsWith` must not accidentally mark unrelated paths; confirm check/disable behavior unchanged
- [x] **Refactoring pass**: no drive-by refactors outside inventory
- [x] **Verificação de regressão**: unit commands in Exit Conditions

### Where

| Arquivo | Propósito |
|---------|-----------|
| `src/server/authz/routeGuard.ts` | Modificar — `LOCAL_ONLY_API_PREFIXES` add enable + login |
| `src/shared/constants/spawnCapablePrefixes.ts` | Modificar — `SPAWN_CAPABLE_PREFIXES` parity |
| `src/server/authz/policies/management.ts` | Ler — confirm F-04-005 already covers new SPAWN paths (no change if generic) |
| `src/lib/tailscaleTunnel.ts` | Ler — prove spawn on login (~642) and funnel/enable (~726, enable flow ~874–892) |
| `src/app/api/tunnels/tailscale/enable/route.ts` | Ler (+ optional sanitize catch) |
| `src/app/api/tunnels/tailscale/login/route.ts` | Ler (+ optional sanitize catch) |
| `src/app/api/tunnels/tailscale/routeUtils.ts` | Ler — `requireTailscaleAuth` scope |
| `tests/unit/authz/routeGuard.test.ts` | Modificar — invert false enable assert; add login + spawn asserts |
| `tests/unit/authz/spawn-capable-prefixes-client-safe.test.ts` | Modificar se lista explícita de prefixes |
| `docs/security/ROUTE_GUARD_TIERS.md` | Modificar — membership rows |
| `docs/reports/audits/2026-07-19-wave2-security-reviewer-residual-investigation.md` | Ler — acceptance evidence only |
| `CHANGELOG.md` | Entry on implement (executor) |

### How

1. Read enable/login routes + `enableTailscaleTunnel` / `startTailscaleLogin` call chain; confirm both spawn.
2. Write failing tests for LOCAL_ONLY + SPAWN on both paths; keep status root false.
3. Add the two prefixes to both constants (comments: `// funnel/login spawn (F-SEC-W2-001)`).
4. Update ROUTE_GUARD_TIERS table next to install/start-daemon rows.
5. Run focused unit tests; fix any client-safe snapshot of the SPAWN list.
6. Optional: sanitize the two route catches in the same PR.
7. Fill Completion Evidence with before/after assert quotes.

### Why

0040 closed install/daemon but mis-labeled enable as non-spawn. Runtime still spawns on enable/login. That is a **Hard Rule #15** residual: tunnel + stolen manage auth → process control. Without this fix, Epic 0008’s spawn inventory is incomplete for the Tailscale surface family.

### Dependency & collision notes

| Item | Value |
|------|--------|
| Depends on | none |
| Blocks | Epic-12 Tailscale success metric; soft: cleaner 0073 if stretch sanitize done here |
| File ownership | `routeGuard.ts`, `spawnCapablePrefixes.ts`, `routeGuard.test.ts`, ROUTE_GUARD_TIERS |
| Live lane collision | Serialize vs any concurrent authz matrix work |
| parallel-safe | **No** — `serializable` |

---

## ⛔ Anti-Hallucination Guardrails

> [!CAUTION]
> DO NOT re-open or rewrite Task 0040 scope. New finding ID is **F-SEC-W2-001** only.  
> DO NOT mark complete while tests still assert `isLocalOnlyPath(.../enable) === false`.  
> DO NOT classify the entire `/api/tunnels/tailscale` tree LOCAL_ONLY without checking status/check GET UX — only proven spawn mutators.  
> DO NOT touch production `:21000` or docker.

> [!IMPORTANT]
> Read **every** file in Where before editing. Prefer the same prefix style as install/start-daemon.  
> Zero Trust: treat enable/login as spawn-capable even if the UI labels them “config toggles”.

---

## 🛡️ Compliance Checklist

- [x] **Doc Accuracy**: ROUTE_GUARD_TIERS rows match grepped constants  
- [x] **Security**: Hard Rule #15 loopback for spawn; SPAWN non-bypassable  
- [x] **Error Sanitization**: if catches touched, use shared helpers (Hard Rule #12)  
- [x] **No Raw SQL** / secrets / eval  
- [x] **Archive Protocol**: n/a  

---

## 📋 Completion Evidence (preenchido pelo agente executor)

- **Arquivos criados/modificados**:
  - `src/server/authz/routeGuard.ts` — `LOCAL_ONLY_API_PREFIXES` += `/api/tunnels/tailscale/enable`, `/login`, `/disable` (comments F-SEC-W2-001)
  - `src/shared/constants/spawnCapablePrefixes.ts` — `SPAWN_CAPABLE_PREFIXES` parity (length 21)
  - `tests/unit/authz/routeGuard.test.ts` — inverted false enable assert; F-SEC-W2-001 LOCAL_ONLY + SPAWN tests; runtime non-loopback 403; status/check stay non-local-only
  - `tests/unit/authz/spawn-capable-prefixes-client-safe.test.ts` — expected list + length 21
  - `tests/unit/authz/management-policy.test.ts` — F-04-005 always-auth covers enable/login/disable
  - `docs/security/ROUTE_GUARD_TIERS.md` — membership rows enable + login + disable
  - `src/app/api/tunnels/tailscale/enable/route.ts` — catch → `createErrorResponseFromUnknown` (Hard Rule #12 stretch)
  - `src/app/api/tunnels/tailscale/login/route.ts` — same sanitize stretch
  - `src/app/api/tunnels/tailscale/disable/route.ts` — same sanitize (path-to-100 residual)
  - `CHANGELOG.md` — Unreleased Security entry
- **Testes**:
  - Before (broken policy): `isLocalOnlyPath("/api/tunnels/tailscale/enable") === false` with comment “Non-spawn tailscale status/enable”
  - After: enable/login/disable `isLocalOnlyPath` + `isSpawnCapablePath` === true; install/start-daemon still true; `/api/tunnels/tailscale` status root false; check false; bypass false; non-loopback 403
- **Resultado dos testes** (path-to-100 residual wave):
  ```
  node --import tsx/esm --test tests/unit/authz/routeGuard.test.ts tests/unit/authz/spawn-capable-prefixes-client-safe.test.ts
  → pass (routeGuard includes runtime non-loopback reject for enable/login/disable)
  node --import tsx/esm --test tests/unit/authz/management-policy.test.ts
  → 21 pass, 0 fail (F-04-005 includes tailscale mutators)
  ```
- **typecheck / lint**: eslint clean on touched sources
- **F-SEC-W2-001**: **CLOSED** — enable/login/disable spawn surfaces loopback-gated + non-bypassable SPAWN + always-auth (F-04-005). Status/check remain remote-reachable.
- **Spawn proof anchors**: `startTailscaleLogin` spawn ~`src/lib/tailscaleTunnel.ts:642`; `startTailscaleFunnel` spawn ~L726; `enableTailscaleTunnel` calls login + funnel ~L874–892; `disableTailscaleTunnel` → `stopTailscaleFunnel`/`stopTailscaleDaemon` (execFile funnel reset, pkill/net stop) ~L787–855
- **Hard Rule #12 stretch**: enable/login/disable catches claimable so Task 0073 can skip those three files
- **CHANGELOG**: Unreleased Security — enable/login/disable LOCAL_ONLY + SPAWN_CAPABLE
- **Agente executor**: gt-ts-engineer (builders) + gt-ts-expert path-to-100 residual
- **Data**: 2026-07-19
- **Status**: moved to `03-review` after security review ACCEPT 100 (2026-07-19)

---

## 🔍 Review Ledger

- **Latest report**: [`docs/reports/reviews/2026-07-19-task-0072-tailscale-enable-login-local-only-spawn-independent-rereview.md`](../../reports/reviews/2026-07-19-task-0072-tailscale-enable-login-local-only-spawn-independent-rereview.md)
- **Reviewer**: Independent FULL SECURITY RE-REVIEWER (agentID=`reviewers`)  
- **Data**: 2026-07-19  
- **Veredito**: **ACCEPT** / `ACCEPTED_100`  
- **Score**: **100/100** (`local_implementation` 100 · `runtime_enforcement` 100)  
- **Patches this re-review**: **none** (path-to-100 already closed)  
- **Disable residual**: **RESOLVED** (LOCAL_ONLY + SPAWN + tests + docs + F-04-005 + Hard Rule #12)  
- **Lane**: **stay `03-review`** (S=100; builder claims re-proved untrusted)  
- **Previous reports**:
  - [`…-security-review.md`](../../reports/reviews/2026-07-19-task-0072-tailscale-enable-login-local-only-spawn-security-review.md) — gt-security-reviewer (builders) ACCEPT 100  
  - gt-ts-expert path-to-100 trail in-task (overall 97) — superseded  
- **Out-of-scope (do not reopen 0072)**: status/check read-only probes remain intentionally remote; install/start-daemon sanitize owned by 0073  


## 🔍 Review Trail (historical)

- **Reviewer**: gt-ts-expert (builders path-to-100)  
- **Data**: 2026-07-19  
- **Veredito**: ACCEPT with residual fix applied in-session (disable spawn inventory)  
- **Score (path to 100)**: Overall **97** (superseded by formal security review 100)  
- **Notas**: disable reclassified LOCAL_ONLY + SPAWN; dual-score non-loopback 403; enable/login inventory already correct.  

