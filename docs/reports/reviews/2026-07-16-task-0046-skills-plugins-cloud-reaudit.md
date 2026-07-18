# Review Report: Task 0046 — Skills/Plugins Sandbox + Cloud Sync Hygiene — Adversarial Re-audit 2026-07-16

## Review Lineage

- **Current task**: Task 0046 (`omniroute-skills-plugins-cloud-sync-hygiene`); live path `docs/tasks/03-review/0046-omniroute-skills-plugins-cloud-sync-hygiene.md`
- **Previous reports read**:
  - `docs/reports/reviews/2026-07-11-task-0046-skills-plugins-cloud-review.md` — score **92/100**, `PASS WITH NOTES` (N1 static plugin perms residual)
- **Related reports considered**:
  - Source: `docs/reports/06-lib-features-tooling.md` (F-06-001…004, F-06-W2-001…002; stretch F-06-006)
  - MCP plugin_install path jail remains Task **0044** (out of scope)
- **Review mode**: `re-review` (adversarial / independent security re-audit)
- **Reviewer profile**: `reviewers` (agentID=reviewers)
- **Parent agentID**: `reviewers`

## Score And Verdict

- **Score**: `90/100`
- **Verdict**: `HELD_IN_REVIEW_PATH_TO_100`
- **Lane recommendation**: `hold-in-review` (S ≥ 90 — remain in `docs/tasks/03-review/`; do **not** return to `02-doing/`; do **not** promote to `04-completed/`)

### Rubric snapshot

| Dimension | Score | Notes |
| --- | --- | --- |
| Six P1 letter exits | 96 | Env scrub (main path), static perms load, cloud fail-closed, checksum hard-fail, outbound scrub, principal idempotency — still closed |
| Env scrub completeness (adversarial) | 88 | `run()` docker CLI allowlist OK; builtins pass `{}`; **kill/killAll** docker spawns still inherit full `process.env` |
| Plugin permissions | 84 | Static-only (PERSISTENT N1); `fetch`/dynamic import still bypass; worker not production-wired |
| Cloud sync sign / hash / outbound | 94 | Fail-closed unset secret; HMAC verify before JSON parse; metadata-only default; no replay/nonce (N6) |
| Idempotency principal scope | 97 | `scopeIdempotencyKey`; `X-Request-Id` dropped; cross-tenant isolation intact |
| Path jail (stretch F-06-006) | 92 | `resolvePluginPath` rejects absolute/`..`; production load uses manager `assertEntryPointWithinDest` |
| Tests / evidence | 90 | Fresh core suite subset **33/33** pass (env scrub + plugin perms + cloud hygiene + checksum + idempotency) |

## Delta Summary

### Resolved Since Previous Review

- none — no product changes against N1–N5 since 2026-07-11.

### Persistent Findings

- `PERSISTENT` N1 (Medium): Production plugin permission enforcement is **static source scan** only; child `import(pluginPath)` has full Node after load; dynamic import / global `fetch` bypass `MODULE_PERMISSION_RULES`. Documented local-trust model.
- `PERSISTENT` N2 (Low): `binaryManager-checksum-0046` still largely source-scan / local hash mirror (behavioral `downloadRelease` refuse not end-to-end).
- `PERSISTENT` N4 (Info): `pluginWorker` not on production load path (manager → `loader.ts`).
- `PERSISTENT` N5 (Info): anonymous principal shared when `apiKeyId` absent.

### Regressions

- none of the six P1 exit wires (no reintroduction of `...process.env` on skill `run()`, no `checksums.size > 0` skip, no global bare Request-Id idempotency, no unsigned default apply).

### New Findings (adversarial)

- `NEW` N6 (Low–Medium): Cloud HMAC has **no timestamp/nonce/body binding beyond raw body** — a captured `X-Cloud-Sig` + body can be replayed later to re-apply older provider metadata (and credentials if `OMNIROUTE_CLOUD_SYNC_SECRETS=true`). Fail-closed signing still blocks *unsigned* MITM; does not stop *signed replay*.
- `NEW` N7 (Low): `SandboxRunner.kill` / `killAll` spawn `docker kill` **without** `env: buildDockerCliEnv(...)` → default full host `process.env` inheritance on short-lived kill processes (F-06-001 incomplete on cleanup path). Container path still scrubbed.
- `NEW` N8 (Info / accepted tradeoff): Docker CLI allowlist includes `DOCKER_HOST`, `HTTP(S)_PROXY` — intentional for docker operation; host compromise required to abuse.
- `NEW` N9 (Info): `buildContainerEnv` accepts arbitrary overlay keys; production builtins pass `{}` only — residual if future callers pass host secrets into overlay.
- `NOTE` N10: Manager `assertEntryPointWithinDest` + loader integrity check still gate install/load; path traversal on production entry remains defended.

### Evidence Gaps / External Blockers

- `EVIDENCE_GAP`: Full typecheck/lint not re-run; full 65-test prior matrix not fully re-executed (core 0046 suites green).
- `EXTERNAL_BLOCKER`: none.

## Findings

| ID | Class | Severity | Status | Summary | First seen | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| N1 | PERSISTENT | Medium | Open | Plugin perms static-only | 2026-07-11 | `loader.ts:74-148`, `PLUGIN_HOST_SCRIPT` unrestricted import |
| N2 | PERSISTENT | Low | Open | Weak checksum behavioral test | 2026-07-11 | `binaryManager-checksum-0046.test.ts` |
| N4 | PERSISTENT | Info | Accepted residual | Worker not production-wired | 2026-07-11 | manager → loader |
| N5 | PERSISTENT | Info | Accepted residual | anonymous principal scope | 2026-07-11 | `idempotencyLayer.ts:50-55` |
| N6 | NEW | Low–Medium | Open | Signed cloud response replay | this reaudit | `verifyCloudSignature` no nonce/time |
| N7 | NEW | Low | Open | docker kill inherits full env | this reaudit | `sandbox.ts:233-235`, `:244` |
| N8–N9 | NEW | Info | Accepted / residual | DOCKER_/proxy allowlist; overlay keys | this reaudit | `sandbox.ts` |
| G1 | Guard | — | Pass | No `...process.env` in skill `run()` | reverify | `sandbox.ts:176-178` + suite |
| G2 | Guard | — | Pass | Checksum hard-fail | reverify | `binaryManager.ts:99-113` |
| G3 | Guard | — | Pass | Principal-scoped idempotency | reverify | suite + `scopeIdempotencyKey` |
| G4 | Guard | — | Pass | Outbound scrub default | reverify | `bundle.ts` sanitize + secrets gate |

## Contract Compliance (Exit Conditions)

| Exit / MUST | Status | Live proof |
| --- | --- | --- |
| F-06-001 env allowlist | ✅* | `buildDockerCliEnv` / `buildContainerEnv`; builtins `{}`; *kill path residual N7 |
| F-06-002 permission deny at load | ✅* | `assertPluginPermissions` on load; *static only N1 |
| F-06-003 unsigned / unset fail-closed | ✅ | `verifyCloudSignature` + `syncToCloud` preflight; `INSECURE=1` opt-in |
| F-06-004 CLIProxy hash required | ✅ | hard-fail missing/mismatch + unlink |
| F-06-W2-001 outbound no tokens by default | ✅ | metadata-only unless `OMNIROUTE_CLOUD_SYNC_SECRETS=true` |
| F-06-W2-002 principal scope; not X-Request-Id | ✅ | `getIdempotencyKey` ignores Request-Id |
| Unit tests | ✅ | 33 pass this session (core 0046 files listed below) |
| Stretch F-06-006 path jail | ✅ | `pluginWorker.resolvePluginPath` |
| CHANGELOG / ENVIRONMENT | ✅ | prior evidence (defaults fail-closed) |

### Fresh verification commands

```bash
node --import tsx/esm --test \
  tests/unit/skills-sandbox-env-scrub-0046.test.ts \
  tests/unit/plugins-permission-enforce-0046.test.ts \
  tests/unit/cloud-sync-hygiene-0046.test.ts \
  tests/unit/binaryManager-checksum-0046.test.ts \
  tests/unit/idempotency.test.ts
# → 33 pass / 0 fail (this session subset)
```

## Path To 100

1. Close N7: pass `env: buildDockerCliEnv()` (or `stdio: "ignore"` + empty env) on `docker kill` spawns in `kill`/`killAll`.
2. Document N1 as **advisory integrity scan** (not capability sandbox) in operator docs, **or** wire worker/capability boundary for production load; extend static rules for `\bfetch\s*\(` and dynamic `import(`.
3. Optional N6: bind HMAC to `machineId|timestamp|nonce` with skew window; reject stale replays.
4. Optional N2: behavioral `downloadRelease` mock asserting throw + unlink.

## Verdict Rationale

All six primary findings remain closed on production hot paths with green targeted tests. Adversarial add-ons (signed replay, kill-path env inherit, static plugin model) are real residuals but do **not** reopen letter exits enough to force `02-doing/`. Score trims 92→**90** for incomplete scrub on kill path + replay residual.

**Lane**: stay in `docs/tasks/03-review/` (S ≥ 90).
