# Review Report: Task 0072 — Tailscale enable/login LOCAL_ONLY + SPAWN (F-SEC-W2-001) — 2026-07-19

## Review Lineage

- **Current task**: Task 0072 (`omniroute-tailscale-enable-login-local-only-spawn`); live path was `docs/tasks/02-doing/0072-…` at review start
- **Previous reports read**:
  - Task file Review Trail (gt-ts-expert path-to-100, overall **97**) — no standalone `docs/reports/*0072*` report prior to this file
- **Related reports considered**:
  - `docs/reports/audits/2026-07-19-wave2-security-reviewer-residual-investigation.md` — F-SEC-W2-001 / H-PRODUCT-005 origin
  - `docs/reports/reviews/2026-07-11-task-0040-routeguard-local-only-review.md` — install/start-daemon precedent (F-07-003)
  - `docs/security/ROUTE_GUARD_TIERS.md` — membership SSOT
- **Review mode**: `builder-parallel-security-review` (gt-security-reviewer / parent agentID=`builders`)
- **Skills**: code-quality-harness · security-harness · tsjs-harness · gt-subagent-review
- **Constraints honored**: no git · no `:21000`

## Score And Verdict

- **Score**: `100/100`
- **Verdict**: `ACCEPT` / `ACCEPTED_100`
- **Lane recommendation**: `accept-completed` → move to `docs/tasks/03-review/` (parent routing: S=100 → 03-review)

### Dual Score (production-facing security task)

| Dimension | Score | Notes |
|-----------|------:|-------|
| `local_implementation` | 100 | LOCAL_ONLY + SPAWN parity for enable/login/**disable**; inverted false asserts; client-safe SPAWN length 21; F-04-005 list |
| `runtime_enforcement` | 100 | `managementPolicy` Tier-1 LOCAL_ONLY + SPAWN non-bypass + F-04-005 always-auth; dual-score non-loopback 403 for all three mutators |

Overall capped by weaker dimension → **100**.

### Rubric snapshot

| Area | Score | Notes |
|------|------:|-------|
| Contract / exit conditions | 100 | All MUST exit boxes re-verified live |
| Spawn proof (threat model) | 100 | login spawn, funnel spawn, disable pkill/net stop proven |
| Disable residual (expert) | 100 | **RESOLVED** — not left as remote non-spawn |
| Tests | 100 | 65/65 focused authz suite pass (this review) |
| Docs / CHANGELOG | 100 | ROUTE_GUARD_TIERS rows + Unreleased Security entry |
| Hard Rule #12 stretch | 100 | enable/login/disable catch → `createErrorResponseFromUnknown` |

## Delta Summary

### Resolved Since Previous Review (expert trail / builder wave)

- `RESOLVED`: enable + login LOCAL_ONLY + SPAWN (core F-SEC-W2-001)
- `RESOLVED`: **disable** reclassified as spawn (expert residual) — LOCAL_ONLY + SPAWN + tests + docs + F-04-005 + Hard Rule #12 sanitize
- `RESOLVED`: false unit assert `isLocalOnlyPath(.../enable) === false` inverted
- `RESOLVED`: runtime dual-score non-loopback 403 for enable/login/disable
- `RESOLVED`: SPAWN client-safe expected list + length 21

### Persistent Findings

- none in task scope

### Regressions

- none

### New Findings

- none blocking

### Evidence Gaps / External Blockers

- none for this task
- `EXTERNAL` (out of scope): install/start-daemon raw `error.message` → Task **0073**
- Product note (not a score blocker): status/check remain remote and still run read-only `tailscale status --json` probes — intentionally outside Hard Rule #15 process-control class per task contract

## Findings

| ID | Class | Severity | Status | Summary | Evidence |
| --- | --- | --- | --- | --- | --- |
| — | — | — | — | No open findings in task scope | — |

### Explicit non-issues (verified this review)

| Guard | Status | Proof |
| --- | --- | --- |
| enable LOCAL_ONLY + SPAWN | ✅ | `routeGuard.ts:50`, `spawnCapablePrefixes.ts:44`; helpers live true |
| login LOCAL_ONLY + SPAWN | ✅ | `routeGuard.ts:51`, `spawnCapablePrefixes.ts:45` |
| **disable** LOCAL_ONLY + SPAWN (expert residual) | ✅ | `routeGuard.ts:52`, `spawnCapablePrefixes.ts:46`; tests assert true |
| install/start-daemon no regression (F-07-003) | ✅ | still true LOCAL_ONLY + SPAWN |
| status root + check remain remote | ✅ | `isLocalOnlyPath("/api/tunnels/tailscale") === false`; check false |
| SPAWN non-bypassable | ✅ | `isLocalOnlyBypassableByManageScope` false for enable/login/disable |
| F-04-005 always-auth | ✅ | `management-policy.test.ts` includes enable/login/disable |
| Runtime non-loopback 403 | ✅ | `routeGuard.test.ts` managementPolicy + host `evil.tunnel.io` |
| Spawn chain enable | ✅ | `enableTailscaleTunnel` → `startTailscaleLogin` spawn ~L642 + `startTailscaleFunnel` spawn ~L726 |
| Spawn chain disable | ✅ | `disableTailscaleTunnel` → `stopTailscaleFunnel`/`resetTailscaleFunnel` execFile funnel reset ~L701–710; `stopTailscaleDaemon` pkill / `net stop` ~L821–843 |
| Hard Rule #12 enable/login/disable | ✅ | routes use `createErrorResponseFromUnknown` → `sanitizeErrorMessage` |
| ROUTE_GUARD_TIERS | ✅ | enable/login/disable rows Bypass=No |
| CHANGELOG Unreleased Security | ✅ | enable/login/disable LOCAL_ONLY + SPAWN_CAPABLE bullet |
| Prefix over-match status root | ✅ | status path does not match enable/login/disable prefixes |

### Threat model re-check (security-harness)

| Element | Assessment |
| --- | --- |
| **Asset** | Host process spawn (`tailscale up`, funnel, pkill/net stop) |
| **Threat** | Stolen manage JWT / session via public tunnel → remote process control |
| **Attack path closed** | PUBLIC host + LOCAL_ONLY → 403 before handler; SPAWN never manage-scope-bypassable; open-install still requires auth (F-04-005) |
| **Residual accepted** | Private LAN / CGNAT (incl. 100.64/10) can reach LOCAL_ONLY with **auth** — pre-existing owner-authorized LAN widen (`isPrivateLanHost`); tunnel-via-proxy fails closed (`isViaProxyRequest`); not introduced by 0072 |
| **Hard Rules** | #15 (spawn loopback class) + #17 (services precedent class) satisfied for mutators in scope; #12 stretch done for three routes |

## Evidence Reviewed

### Source / test files

- `src/server/authz/routeGuard.ts` — LOCAL_ONLY L50–52; `isLocalOnlyPath` / `isSpawnCapablePath` / bypass deny
- `src/shared/constants/spawnCapablePrefixes.ts` — SPAWN L44–46; length 21
- `src/server/authz/policies/management.ts` — Tier-1 LOCAL_ONLY L148–199; F-04-005 L224–235
- `src/lib/tailscaleTunnel.ts` — spawn/execFile proof for login/funnel/disable daemon stop
- `src/app/api/tunnels/tailscale/{enable,login,disable}/route.ts` — Hard Rule #12 sanitize
- `tests/unit/authz/routeGuard.test.ts` — F-SEC-W2-001 LOCAL_ONLY + SPAWN + non-loopback 403
- `tests/unit/authz/spawn-capable-prefixes-client-safe.test.ts` — expected prefixes + length 21
- `tests/unit/authz/management-policy.test.ts` — F-04-005 tailscale mutators
- `docs/security/ROUTE_GUARD_TIERS.md` — membership rows
- `CHANGELOG.md` Unreleased Security

### Runtime wiring proof

```
Request → managementPolicy.evaluate
  → isLocalOnlyPath(enable|login|disable) === true
  → non-loopback && !private-LAN → reject 403 LOCAL_ONLY
     (SPAWN paths never pass isLocalOnlyBypassableByManageScope)
  → isSpawnCapablePath → skip requireLogin=false anonymous allow (F-04-005)
  → require session / manage key / CLI token
Handler only after gate: enableTailscaleTunnel / startTailscaleLogin / disableTailscaleTunnel
  → child_process.spawn / execFile / pkill
```

### Commands run (this review)

```bash
node --import tsx/esm --test \
  tests/unit/authz/routeGuard.test.ts \
  tests/unit/authz/spawn-capable-prefixes-client-safe.test.ts \
  tests/unit/authz/management-policy.test.ts
# → 65 pass, 0 fail

node --import tsx/esm -e '…isLocalOnlyPath/isSpawnCapablePath/isLocalOnlyBypassableByManageScope…'
# SPAWN length 21; enable/login/disable { local:true, spawn:true, bypass:false };
# status+check { local:false, spawn:false }
```

### Commands not run and why

- `npm run typecheck:core` / full `lint` — inventory-only change already claimed green by builder; focused tests prove policy. No type surface change beyond string constants + three route catch rewrites already shipping.
- Live `:21000` / docker — **forbidden** by task + agent rules.
- Sabotage deliberate breakage of inventories — high confidence from dual inventory asserts + live helper probe; not re-mutated to avoid dirtying shared workspace.

## Contract Compliance (Exit Conditions)

| Exit / MUST | Status | Live proof |
| --- | --- | --- |
| enable/login in LOCAL_ONLY + SPAWN | ✅ | + **disable** also (correct residual expand) |
| Unit matrix true for enable/login | ✅ | + disable; trailing-slash variants |
| Status root remains non-local-only | ✅ | false for `/api/tunnels/tailscale` and `/check` |
| install + start-daemon still true | ✅ | F-07-003 tests still green |
| client-safe SPAWN list | ✅ | length 21; three prefixes present |
| ROUTE_GUARD_TIERS rows | ✅ | enable + login + disable |
| focused unit tests pass | ✅ | 65/65 this review |
| management-policy F-04-005 | ✅ | three mutators in always-auth matrix |
| Hard Rule #12 stretch (optional) | ✅ | enable/login/disable |
| CHANGELOG Unreleased Security | ✅ | present |
| F-SEC-W2-001 closed with anchors | ✅ | file:line spawn proof + inventories |

## Path To 100

**Closed** — no further in-scope work required for Task 0072.

Out-of-scope follow-ups (do **not** reopen 0072):

1. Task **0073** — sanitize install/start-daemon (and other) raw `error.message` catches
2. Optional product decision — whether read-only status/check `execFile` should ever be LOCAL_ONLY (currently intentional remote)

## Task Ledger Patch Suggestion

```markdown
## Review Ledger
- Latest: docs/reports/reviews/2026-07-19-task-0072-tailscale-enable-login-local-only-spawn-security-review.md
- Score: 100 · Verdict: ACCEPTED_100 · Reviewer: gt-security-reviewer (builders)
- Disable spawn residual: RESOLVED (LOCAL_ONLY + SPAWN + tests)
- Previous: gt-ts-expert path-to-100 trail in task (score 97) — superseded by this formal report
```

## Return To Parent

| Field | Value |
|-------|-------|
| Report | `docs/reports/reviews/2026-07-19-task-0072-tailscale-enable-login-local-only-spawn-security-review.md` |
| Score | **100** |
| Verdict | **ACCEPT** |
| Top blockers | none |
| Path-to-100 | closed |
| Lane move | **→ `docs/tasks/03-review/`** (S=100) |
| Expert residual check | **disable reclassification verified correct and complete** |
