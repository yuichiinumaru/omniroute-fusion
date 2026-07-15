# Review Report: Task 0046 — Skills/Plugins Sandbox + Cloud Sync Hygiene — 2026-07-11

## Review Lineage

- **Current task**: Task 0046 (`omniroute-skills-plugins-cloud-sync-hygiene`); live path `docs/tasks/03-review/0046-omniroute-skills-plugins-cloud-sync-hygiene.md`
- **Source reports**: `docs/reports/06-lib-features-tooling.md` (F-06-001/002/003/004, F-06-W2-001/002; stretch F-06-006)
- **Previous reports read**: none under `docs/reports/reviews/` for 0046
- **Related**: Task 0044 owns MCP `plugin_install` path jail (out of scope); F-06-010 signing helpers deferred
- **Review mode**: `initial`
- **Reviewer profile**: `reviewers` (Code Quality Reviewer / independent task reviewer)
- **Parent agentID**: `reviewers`

## Score And Verdict

- **Score**: `92/100`
- **Verdict**: `PASS WITH NOTES`
- **Lane recommendation**: `hold-in-review` (S ≥ 90 — remain in `docs/tasks/03-review/`; do **not** return to `02-doing/`; do **not** promote to `04-completed/`)

### Rubric snapshot

| Dimension | Score | Notes |
| --- | --- | --- |
| Contract / six P1 exits | 96 | All primary findings closed in production paths; CHANGELOG + ENVIRONMENT defaults present |
| F-06-001 sandbox env scrub | 98 | Allowlist docker CLI env + container `-e`; builtins pass `{}` overlay |
| F-06-002 plugin permissions | 86 | Production load calls `assertPluginPermissions`; static regex only — residual dynamic/`fetch` bypass |
| F-06-003 / W2-001 cloud sync | 97 | Fail-closed HMAC; INSECURE opt-in; outbound metadata-only unless SECRETS=true |
| F-06-004 checksum | 95 | Hard-fail missing/mismatch SHA-256; no `checksums.size > 0` skip |
| F-06-W2-002 idempotency | 97 | Principal-scoped `sha256(apiKeyId\|key)`; X-Request-Id dropped; chatCore wires `apiKeyId` |
| Tests / evidence | 88 | Fresh 65 pass / 0 fail on suite below; F-06-004 suite is largely source-scan; evidence claimed 72 |
| Scope / docs hygiene | 95 | Stretch F-06-006 path jail done; F-06-010 correctly deferred |

## Delta Summary

### Resolved Since Previous Review

- N/A — initial independent review.

### Persistent Findings

- none

### Regressions

- none on Task 0046 surfaces (relative to adversarial report baseline)

### New Findings

- `NEW` N1 (Medium / residual, accepted for this task): Production plugin permission enforcement is **static source scan**, not a capability sandbox. Child process still has full Node privileges after load; dynamic `import(x)`, variable `require`, and global `fetch` can bypass `MODULE_PERMISSION_RULES`. Code comments document residual trust model (LOCAL_ONLY + operator trust). Meets letter of exit (“denied at load”) for common static imports; does not fully close the original dual-isolation narrative (worker unused).
- `NEW` N2 (Low / test quality): `tests/unit/binaryManager-checksum-0046.test.ts` proves contract mainly via source scan + local hash mirror; does not call `downloadRelease` end-to-end with mocked `getChecksums` empty map (production code path is correct).
- `NEW` N3 (Info / evidence drift): Completion Evidence claims “72 pass”; this review’s combined suite is **65 pass / 0 fail**.
- `NOTE` N4 (Info / accepted residual): `pluginWorker` remains off the production load path (manager → `loader.ts` child import). Stretch F-06-006 path jail + `name` param fixed for latent worker only.
- `NOTE` N5 (Info): Idempotency principal falls back to `"anonymous"` when `apiKeyId` absent — correct isolation vs keyed tenants; unauthenticated clients still share one scope (acceptable when `REQUIRE_API_KEY` off).

### Evidence Gaps / External Blockers

- `EVIDENCE_GAP`: Full `npm run typecheck:core` not re-run this session (eslint on touched production files exit 0).
- `EXTERNAL_BLOCKER`: none

## Findings

| ID | Class | Severity | Status | Summary | First seen | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| N1 | NEW | Medium residual | Open (path-to-100 / follow-up) | Plugin perms static-only on live child load | this report | `loader.ts:74-148`, `PLUGIN_HOST_SCRIPT` unrestricted `import(pluginPath)` |
| N2 | NEW | Low | Open (path-to-100) | Weak behavioral test for checksum refuse | this report | `binaryManager-checksum-0046.test.ts` vs `binaryManager.ts:99-113` |
| N3 | NEW | Info | Open (hygiene) | Stale test count in task evidence | this report | Task claims 72; live 65 |
| N4 | NOTE | Info | Accepted residual | Worker not production-wired | this report | manager → loader; pluginWorker stretch only |
| N5 | NOTE | Info | Accepted residual | anonymous principal shared | this report | `idempotencyLayer.ts:50-55` |
| G1 | — | Guard | Pass | No `...process.env` in skills sandbox | this report | `rg` zero hits under `src/lib/skills` |
| G2 | — | Guard | Pass | No `checksums.size > 0` skip | this report | absent from `src/` |
| G3 | — | Guard | Pass | chatCore passes `apiKeyId` into cache | this report | `chatCore.ts:533-541` |
| G4 | — | Guard | Pass | Outbound scrub default | this report | `bundle.ts:99-108`, `cloudSync.ts:136-137` |

## Contract Compliance (Exit Conditions)

| Exit / MUST | Status | Live proof |
| --- | --- | --- |
| F-06-001 env allowlist (no host secrets) | ✅ | `sandbox.ts` `buildDockerCliEnv` / `buildContainerEnv`; spawn uses both; builtins `env={}` |
| F-06-002 permission deny without declaration | ✅* | `assertPluginPermissions` at load (`loader.ts:182-183`); *static only (N1) |
| F-06-003 unsigned rejected; unset fail-closed | ✅ | `verifyCloudSignature` false without secret; `INSECURE=1` opt-in; preflight in `syncToCloud` |
| F-06-004 CLIProxy hash required | ✅ | `binaryManager.ts:99-113` throws unavailable/mismatch; unlinks archive |
| F-06-W2-001 outbound no tokens/keys by default | ✅ | `sanitizeProviderConnectionForSync` / `sanitizeApiKeyForSync`; gated by `OMNIROUTE_CLOUD_SYNC_SECRETS` |
| F-06-W2-002 principal scope; not bare X-Request-Id | ✅ | `getIdempotencyKey` ignores X-Request-Id; `scopeIdempotencyKey`; cross-tenant tests green |
| Unit tests pass (env, perms, sync, hash, idemp) | ✅ | Fresh run: 65 pass / 0 fail (suite list below) |
| CHANGELOG security defaults | ✅ | Unreleased Security block Task 0046 |
| ENVIRONMENT docs | ✅ | `OMNIROUTE_CLOUD_SYNC_SECRET` / `_SECRETS` / `_INSECURE` |
| typecheck / lint touched | ✅* | eslint exit 0 on touched files; full typecheck not re-run |
| Stretch F-06-006 path jail | ✅ | `resolvePluginPath` absolute/`..` reject; `name` into `createSandbox` |

### Fresh test evidence (this review)

```text
node --import tsx/esm --test \
  tests/unit/skills-sandbox-env-scrub-0046.test.ts \
  tests/unit/plugins-permission-enforce-0046.test.ts \
  tests/unit/cloud-sync-hygiene-0046.test.ts \
  tests/unit/binaryManager-checksum-0046.test.ts \
  tests/unit/idempotency.test.ts \
  tests/unit/chatcore-extracted-modules-3821.test.ts \
  tests/unit/plugin-sandbox-permissions.test.ts \
  tests/unit/security/cloud-sync-hmac.test.ts \
  tests/unit/sync-bundle.test.ts \
  tests/unit/cloud-sync.test.ts
→ 65 pass / 0 fail
```

## Per-finding code map

| ID | Implementation | Tests |
|----|----------------|-------|
| F-06-001 | `src/lib/skills/sandbox.ts` | `skills-sandbox-env-scrub-0046` |
| F-06-002 | `src/lib/plugins/loader.ts` `assertPluginPermissions` | `plugins-permission-enforce-0046` |
| F-06-003 | `src/lib/cloudSync.ts` `verifyCloudSignature` + preflight | `cloud-sync-hygiene-0046`, `cloud-sync-hmac`, `cloud-sync` |
| F-06-004 | `src/lib/versionManager/binaryManager.ts` | `binaryManager-checksum-0046` (weak behavioral) |
| F-06-W2-001 | `src/lib/sync/bundle.ts` + `cloudSync.syncToCloud` | hygiene + cloud-sync outbound scrub |
| F-06-W2-002 | `idempotencyLayer.ts` + `chatCore/idempotency.ts` + chatCore wire | `idempotency`, `chatcore-extracted-modules-3821` |
| F-06-006 | `pluginWorker.ts` path jail + name | `plugin-sandbox-permissions` |

## Severity-ordered findings (reviewer format)

### Findings
- [MEDIUM] `src/lib/plugins/loader.ts:74-148` — Static permission scan is not a runtime sandbox.
  Evidence: `PLUGIN_HOST_SCRIPT` does unrestricted `import(pluginPath)`; rules only match literal `require`/`import` of known modules; global `fetch` and dynamic module id not covered. Residual risk documented in file header comments.
  Impact: Malicious/obfuscated plugin can still use network/fs/exec after load despite empty `requires.permissions`. Mitigated by LOCAL_ONLY routes + operator install trust, not by capability isolation.
  Fix (path-to-100 / follow-up): Wire `pluginWorker` (or equivalent) for production load, or explicitly document permissions as advisory + integrity-only in operator docs; extend rules for `\bfetch\s*\(` and block dynamic import if staying static.

- [LOW] `tests/unit/binaryManager-checksum-0046.test.ts` — Incomplete behavioral proof of install refuse path.
  Evidence: Test asserts source strings and empty `getChecksums` map via 404; does not invoke `downloadRelease` to assert throw + unlink.
  Impact: Future refactor could reintroduce skip path if source scan patterns change without a true fail-closed integration assertion.
  Fix: Mock/inject release + checksum deps and assert `downloadRelease` rejects with `SHA256 checksum unavailable`.

### Open Questions
- none blocking approval

## Verdict

**PASS WITH NOTES** — Score **92**. Primary six findings are closed with fresh green tests, CHANGELOG, and ENVIRONMENT fail-closed defaults. Residual medium is the known static-only plugin permission model (N1), which should not bounce the task to `02-doing` under the task’s stated exits, but remains the main path-to-100 item if a true capability boundary is required later.

**Lane**: stay in `docs/tasks/03-review/` (S ≥ 90). No move to `02-doing/`. No move to `04-completed/` (human-only).
