# Independent Security Re-Review: Task 0072 — Tailscale enable/login LOCAL_ONLY + SPAWN (F-SEC-W2-001)

## Review Lineage

- **Current task**: `docs/tasks/03-review/0072-omniroute-tailscale-enable-login-local-only-spawn.md`
- **Reviewer**: Independent FULL SECURITY RE-REVIEWER (agentID=`reviewers`)
- **Builder claims**: **UNTRUSTED** — re-proved from live source + tests
- **Previous reports read**:
  - `docs/reports/reviews/2026-07-19-task-0072-tailscale-enable-login-local-only-spawn-security-review.md` (builders parallel ACCEPT 100)
  - Task Completion Evidence + Review Trail
  - `docs/security/ROUTE_GUARD_TIERS.md`
- **Skills**: security-harness · code-quality-harness · tsjs-harness
- **Constraints**: no git · no `:21000` · no docker mutation

## Score And Verdict

| Field | Value |
|-------|-------|
| **Score** | **100/100** |
| **Verdict** | **ACCEPT** / `ACCEPTED_100` |
| **Lane** | **stay `03-review`** (S≥90; no patches required) |
| **Patches applied this re-review** | **none** |

### Dual Score

| Dimension | Score | Notes |
|-----------|------:|-------|
| `local_implementation` | 100 | Inventories + unit matrix + client-safe SPAWN length 21 |
| `runtime_enforcement` | 100 | `managementPolicy` LOCAL_ONLY 403 + SPAWN non-bypass + F-04-005 always-auth |

Overall capped by weaker dimension → **100**.

## Threat Model Re-Check

| Element | Assessment |
|---------|------------|
| **Asset** | Host process control (`tailscale up`, funnel, `pkill`/`net stop`) |
| **Threat** | Stolen manage JWT / dashboard session via public tunnel → remote spawn |
| **Attack path** | `POST /api/tunnels/tailscale/{enable,login,disable}` with tunnel Host + valid manage auth |
| **Control** | Tier-1 LOCAL_ONLY before handler; SPAWN never manage-scope-bypassable; F-04-005 always-auth under open-install |
| **Status** | **CLOSED** for enable/login/**disable** |

### Spawn proof (live anchors)

| Surface | Chain | Evidence |
|---------|-------|----------|
| login | `startTailscaleLogin` → `spawn(binary, tailscale up…)` | `src/lib/tailscaleTunnel.ts:642` |
| enable | `enableTailscaleTunnel` → login + `startTailscaleFunnel` spawn | L857–892, funnel spawn ~L726; daemon start ~L535+ |
| disable | `disableTailscaleTunnel` → `stopTailscaleFunnel` (`execFile` funnel reset) + `stopTailscaleDaemon` (`pkill` / `net stop`) | L787–855, L931–943 |

## Live Verification (this re-review)

### Inventory parity

| Path | LOCAL_ONLY | SPAWN | Bypass manage-scope |
|------|:----------:|:-----:|:-------------------:|
| `/api/tunnels/tailscale/enable` | true | true | false |
| `/api/tunnels/tailscale/login` | true | true | false |
| `/api/tunnels/tailscale/disable` | true | true | false |
| `/api/tunnels/tailscale/install` | true | true | false |
| `/api/tunnels/tailscale/start-daemon` | true | true | false |
| `/api/tunnels/tailscale` (status root) | **false** | false | false |
| `/api/tunnels/tailscale/check` | **false** | false | false |

Code anchors:

- `src/server/authz/routeGuard.ts` L50–52
- `src/shared/constants/spawnCapablePrefixes.ts` L44–46 (SPAWN length **21**)
- `docs/security/ROUTE_GUARD_TIERS.md` rows enable/login/disable Bypass=No

### Prefix hygiene note (non-blocking)

`isLocalOnlyPath` uses `path.startsWith(prefix)` without segment boundary; SPAWN uses `pathMatchesGuardPrefix` (segment-safe). Live probe:

- `/api/tunnels/tailscale/enabled` → local **true**, spawn **false** (over-match LOCAL_ONLY)
- Over-match is **fail-closed** (extra deny remote), not a Hard Rule #15 bypass. No score deduction.

### Runtime policy

- `management.ts` L148–199: non-loopback + non-private-LAN + LOCAL_ONLY → 403 unless bypass (spawn never bypassable via L255)
- F-04-005 L224–235: `isSpawnCapablePath` blocks anonymous when `requireLogin=false`
- Unit: `routeGuard.test.ts` rejects enable/login/disable from `evil.tunnel.io` with 403
- Unit: `management-policy.test.ts` F-04-005 includes enable/login/disable

### Hard Rule #12 stretch

enable / login / disable routes → `createErrorResponseFromUnknown` (sanitizes via `errorResponse.ts` → `sanitizeErrorMessage`).

### Commands run

```bash
node --import tsx/esm --test \
  tests/unit/authz/routeGuard.test.ts \
  tests/unit/authz/spawn-capable-prefixes-client-safe.test.ts \
  tests/unit/authz/management-policy.test.ts
# → 65 pass, 0 fail

node --import tsx/esm -e '…isLocalOnlyPath / isSpawnCapablePath / bypass probe…'
# SPAWN len 21; mutators {local:true,spawn:true,bypass:false}; status/check remote
```

## Findings

| ID | Severity | Status | Summary |
|----|----------|--------|---------|
| — | — | — | No open findings in task scope |

### Explicit non-issues

- Status/check remain remote + may `execFile` read-only probes — **intentional** product scope (not process-control class of #15 for mutators).
- install/start-daemon inventory unchanged (F-07-003 no regression).
- Private LAN / CGNAT may reach LOCAL_ONLY **with auth** — pre-existing owner-authorized widen; not introduced by 0072.

## Contract Compliance

| Exit MUST | Status |
|-----------|--------|
| enable/login LOCAL_ONLY + SPAWN | ✅ (+ disable residual correct) |
| Unit asserts inverted / true | ✅ |
| Status root non-local-only | ✅ |
| install + start-daemon no regression | ✅ |
| client-safe SPAWN list | ✅ length 21 |
| ROUTE_GUARD_TIERS | ✅ |
| Focused tests green | ✅ 65/65 |
| F-04-005 always-auth | ✅ |
| CHANGELOG Security | ✅ |

## Path To 100

**Already closed.** No in-scope patches this re-review.

Out-of-scope (do not reopen 0072): further read-only status/check LOCAL_ONLY product decision.

## Return Table Row

| task | score | verdict | patches | report | lane |
|------|------:|---------|---------|--------|------|
| 0072 | 100 | ACCEPT | none | this file | stay 03-review |
