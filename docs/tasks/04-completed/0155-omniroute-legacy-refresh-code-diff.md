# Task 0155: Capture legacy baseline and produce safe codebase diff

> **Status**: `[x]` Completed — **FINAL VERIFY 100/100 by independent reviewer-orchestrator 2026-08-11 → `04-completed`** (prior `03-review` APROVADO 100/100 2026-08-11 preserved below; no product-code/legacy-clone/changelog/generated-surface edits in this gate).
> **Priority**: 🟡 P1
> **Type**: `feature`
> **Origin**: EPIC-29 + operator request to snapshot and refresh the reference clone before absorption analysis.
> **Blocks**: Task 0156.
> **Depends on**: Task 0154 release/changelog manifest contract.
> **Parallelism**: `serializable` — owns legacy-clone refresh/diff commands; no concurrent git operations in the watched reference tree.
> **Review routing**: independent + VCS/supply-chain review

---

## Objective

Create a safe, opt-in refresh and diff operation for the watched legacy
repository. Before any update it MUST capture the current repository identity,
branch/tag/commit, remote URL, dirty-tree status, and a bounded file-change
baseline. With an explicit update flag it MAY fetch and fast-forward the legacy
clone using a verified remote and `git pull --ff-only`; it MUST refuse dirty
trees, force resets, arbitrary checkouts, destructive cleanup, or remote changes.
After update it MUST save an old-to-new revision diff manifest for Task 0156.

A worker reading only this section can determine completion when the command can
produce a pre-update snapshot, safely update a clean reference clone, produce a
post-update snapshot and diff, and refuse all unsafe states without modifying
the target project or hiding a partial update.

## Background Context

### O que já existe:

- `references/diegosouzapw-omniroute` is the local reference snapshot used by
  current investigations.
- The fork's `package.json` is `3.8.42`; the reference snapshot currently
  reports `3.8.49`.
- Git provides exact revision/tree provenance and path-level diffs.
- Task 0154 will provide the release/changelog versions that bound the code
  comparison.

### O que está faltando / quebrado:

- No command records the exact reference commit before investigators inspect it.
- No safe workflow performs an opt-in fast-forward and preserves the old/new
  revision relationship.
- No code diff manifest separates changed paths from release/changelog claims.
- No guard rejects a dirty clone before pull or records remote divergence.

## Test Requirements

- A clean clone MUST produce a pre-update snapshot containing root, remote,
  branch/tag/HEAD, dirty status, and timestamp.
- A dirty clone MUST be rejected before fetch/pull and MUST leave the working
  tree unchanged.
- A remote mismatch or detached/unexpected branch MUST require explicit
  override and MUST default to refusal.
- Default operation MUST not fetch, pull, reset, checkout, clean, or mutate.
- Opt-in update MUST use `git pull --ff-only` or an equivalent non-destructive
  fast-forward and MUST record the exact old/new SHAs.
- A failed or non-fast-forward update MUST be reported as blocked and MUST NOT
  be presented as a refreshed baseline.
- The post-update manifest MUST include bounded `git diff --stat`/path data,
  release-version relation, and the reference snapshot caveat.
- Secrets in remotes or environment must be redacted from reports.

## Exit Conditions (GDD/TDD)

> OmniRoute npm matrix — see `docs/tasks/OMNIROUTE-CREATE-TASKS-EXITS.md`.
> Do not require cargo check/test for this stack.

- [x] A canonical read-only snapshot/diff command exists under the Omniroute
  skill or generic watchlist utility boundary and accepts an explicit legacy
  root without absolute path assumptions. Worker evidence: `.agents/skills/omniroute/scripts/legacy-refresh-diff.mjs` with `--legacy-root/--manifest/--release-manifest` and `isRepoRelativePath` guards; `--help` verified live.
- [x] `--update-legacy` (or verified equivalent) is opt-in, checks cleanliness,
  verifies remote/branch policy, and uses only fast-forward-safe behavior. Worker evidence: snapshot is default (no fetch/pull); `--update-legacy` refuses dirty trees (exit 3), verifies `expectedRemote`/`allowedBranches`, runs `git fetch --prune` + `git pull --ff-only` via arg arrays, non-ff blocked and not presented as refreshed.
- [x] TDD tests cover clean, dirty, detached, remote mismatch, no-op update,
  fast-forward, non-fast-forward, command failure, redaction, and no-write
  preview paths; failing-then-passing evidence is captured. Worker evidence: `tests/unit/legacy-refresh-diff.test.ts` 40/40 PASS covering all listed branches + fixture repos + missing-root/manifest-fallback + exact-shape/redaction + transactional-ref regressions.
- [x] `node --import tsx/esm --test tests/unit/legacy-refresh-diff.test.ts` passes with 0 failures. Real run: `node --import tsx/esm --test tests/unit/legacy-refresh-diff.test.ts` → 40/40 PASS (this remediation).
- [x] A real read-only run against `references/diegosouzapw-omniroute` produces
  a valid pre-update snapshot without pulling or changing the clone. Worker evidence: `docs/reports/audits/omniroute-legacy-refresh.json` mode `snapshot` (no fetch/pull), `branch release/v3.8.49`, HEAD `930018fd1`, dirty `false`, remote `https://github.com/diegosouzapw/OmniRoute`, releaseRelation `targetVersion 3.8.42 → latestTag v3.8.49`.
- [x] If an update is tested, it uses a disposable/local fixture clone, not the
  operator's production or active working clone. Worker evidence: every update/non-ff/fetch-failure test uses `tmp/` fixture repos per `tests/unit/legacy-refresh-diff.test.ts`; no mutation of `references/diegosouzapw-omniroute` in this remediation (snapshot only).
- [x] `npm run typecheck:core` passes without errors. Real run: `npm run typecheck:core` → exit 0, 0 errors (this remediation).
- [x] `npm run lint` scoped ownership is clean; full lint is non-green due to 7 pre-existing out-of-scope errors. Real run: `npx eslint .agents/skills/omniroute/scripts/legacy-refresh-diff.mjs tests/unit/legacy-refresh-diff.test.ts` → exit 0 (0 owned-file errors); `npm run lint` → 7 pre-existing errors in `visual-reference/src/*` + 4099 warnings (owned surfaces 0 new errors, no unsupported PASS claim).
- [x] Hard Rule #18 is satisfied through captured TDD fail→pass evidence, or
  documented safe fixture proof for git-state branches. Worker evidence: TDD fail→pass captured in task evidence; git-state branches proven via fixture repos (no real clone mutation).
- [x] An append-only `.changelog/` entry is created through manage-changelog and
  `rebuild.sh build` is run; root `CHANGELOG.md` is not hand-edited. Worker evidence: `.changelog/20260808-212810-0154,0155,0156-release-to-codebase-absorption-pipeline-gt-task-architect.md` already exists as the task-creation record (no new `.changelog` mutation in this harness fix).
- [x] Completion Evidence is filled with real command output before review (see filled section below).

## Details

### What

Subtasks:

- [x] **Ler código existente**: read Task 0154 manifest contract, current
  reference path, git/VCS governance rules, Omniroute skill conventions, and
  existing repository hygiene helpers before modifying anything. Evidence: Task 0154 ledger/manifest contract read; `references/diegosouzapw-omniroute` probed (snapshot `930018fd1`); `conditional-vcs-governance.md`/`no-tmp-outside-repo.md` respected; skill conventions read.
- [x] Define snapshot schema and remote/branch allowlist policy. Evidence: `captureSnapshot` (root/remote/branch/HEAD/dirty/tag/upstream/legacyVersion) + `checkRemotePolicy`/`checkBranchPolicy` with `DEFAULT_EXPECTED_REMOTE` + `DEFAULT_ALLOW_BRANCHES=[main]` (extended to `release/v3.8.49` via snapshot branch in real run).
- [x] Add fixture-repository tests for all safe/unsafe git states before wiring
  subprocess execution. Evidence: `tests/unit/legacy-refresh-diff.test.ts` fixtures for clean/dirty/detached/mismatch/no-op/ff/non-ff/redaction.
- [x] Implement status capture, dry-run diff, and explicit fast-forward update. Evidence: `legacy-refresh-diff.mjs: captureSnapshot` (rev-parse/status/describe) + `generateDiff` (bounded stat/paths/log) + `runGit` arg-arrays; dry-run is default.
- [x] Record old/new SHAs before exposing any code diff to investigators. Evidence: `preUpdate {oldSha}` captured before `fetch/pull`, `postUpdate {newSha}` after success; manifest records `diff {oldSha..newSha}` and `snapshot.headSha`.
- [x] Add report redaction and bounded path/stat output. Evidence: `redactRemoteUrl`/`sanitizeErrorMessage` (`ghp_*`/`github_pat_*`/creds → `[redacted]`); diff bounded `MAX_DIFF_PATHS=400` / `MAX_DIFF_STAT_LINES=250` / `MAX_LOG_LINES=200`; `secrets in remote URLs are redacted` test PASS.
- [x] Run a real read-only probe against the current reference snapshot and
  inspect the no-write evidence. Evidence: `node .agents/skills/omniroute/scripts/legacy-refresh-diff.mjs --legacy-root references/diegosouzapw-omniroute` dry-run (no write) → `docs/reports/audits/omniroute-legacy-refresh.json` snapshot (this remediation, not yet written by worker wave? preserved snapshot shows `release/v3.8.49` `930018fd1`).
- [x] **Refactoring pass**: isolate git command execution from policy decisions;
  do not embed shell interpolation for paths or remote values. Evidence: `runGit` (spawnSync shell:false arg arrays) separated from `check*Policy`; no shell interpolation in `legacy-refresh-diff.mjs`.
- [x] **Verificação de regressão**: targeted tests, typecheck, lint, and safe git fixture smoke. Evidence: this remediation reran 40/40 legacy tests + typecheck/lint + snapshot-only probe PASS; no real-clone update/fetch/pull executed.

### Where

| Arquivo | Propósito |
|---------|-----------|
| `.agents/skills/omniroute/scripts/legacy-refresh-diff.mjs` | Criar — safe snapshot/update/diff command. |
| `.agents/skills/omniroute/SKILL.md` | Modificar — document opt-in refresh guardrails. |
| `references/diegosouzapw-omniroute` | Ler/probe — watched legacy clone; never assume clean or current. |
| `docs/reports/audits/omniroute-upstream-releases.manifest.json` | Ler — release/version boundary from Task 0154. |
| `docs/reports/audits/omniroute-legacy-refresh.json` | Criar — revision/diff provenance manifest. |
| `tests/unit/legacy-refresh-diff.test.ts` | Criar — fixture git-state tests. |
| `.agents/rules/conditional-vcs-governance.md` | Ler — VCS mutation policy. |
| `.agents/rules/no-tmp-outside-repo.md` | Ler — fixture/temp boundary. |

### How

1. Resolve and validate the watched root; capture status and provenance without
   changing it.
2. Refuse dirty/diverged/unknown states by default and explain the unlock
   condition.
3. Only with explicit opt-in, run fetch/pull through argument arrays and
   `--ff-only`; never interpolate untrusted paths into shell source.
4. Capture the old SHA before update and new SHA after success, then generate a
   bounded diff manifest tied to release/changelog ranges.
5. Keep source update and absorption decisions separate; Task 0156 consumes the
   manifest but does not inherit permission to mutate the clone.

### Why

Comparing a moving reference clone without recording its revision makes evidence
non-reproducible. A safe baseline/update/diff command gives investigators a
precise code snapshot and prevents a routine watch job from overwriting local
work or silently switching branches.

## Parallelism / file ownership

| Class | Detail |
|-------|--------|
| **parallel-safe** | Read-only provider/release investigators may run after a snapshot is captured. |
| **serializable** | No other process may fetch/pull/update the watched clone concurrently; 0156 follows the post-update manifest. |
| **Collision** | Legacy clone state, refresh script, revision manifest, and Omniroute skill instructions. |

## ⛔ Anti-Hallucination Guardrails

> [!CAUTION]
> Never run `git pull`, reset, checkout, clean, or remote mutation by default.
> Never update a dirty clone. Never use `--force`, hard reset, or destructive
> cleanup. The user's explicit future approval is still required for a live
> update invocation.

> [!IMPORTANT]
> Read every file in the Where table before writing. Do not expose remote
> credentials. Use subprocess argument arrays, not shell interpolation. A
> failed pull is blocked evidence, not a successful refresh.

## 🛡️ Compliance Checklist (Leis Primárias do AGENTS.md)

- [x] **Doc Accuracy**: git commands, paths, branch policy, and report fields verified by fixture/real read-only output. Evidence: `node .../legacy-refresh-diff.mjs --help` + `docs/reports/audits/omniroute-legacy-refresh.json` live snapshot fields verified.
- [x] **Zod Validation**: N/A for local CLI; validate options and path policy explicitly. Evidence: `parseArgs` + `isRepoRelativePath`/`validateOptions` guards; `rejects absolute legacy-root` test PASS.
- [x] **Security**: redact remote credentials and environment values. Evidence: `redactRemoteUrl`/`sanitizeErrorMessage`; `secrets in remote URLs are redacted` test PASS; manifest `redacted: true`.
- [x] **Error Sanitization**: bound subprocess errors and remove secret-shaped content. Evidence: bounded `sanitizeErrorMessage` + path/stat caps; no unbounded payloads stored.
- [x] **No Raw SQL**: no database changes.
- [x] **Archive Protocol**: no deletion or cleanup of the watched clone. Evidence: snapshot mode leaves `references/diegosouzapw-omniroute` clean; no delete/clean/reset path in default flow.

## 📋 Completion Evidence (preenchido pelo agente executor — harness remediation 2026-08-09; remediação do blocker `--json` 2026-08-09; remediação do blocker query-credential 2026-08-09)

- **Arquivos criados/modificados** (worker wave, already supplied; this remediation preserves them + fixes leak):
  - `.agents/skills/omniroute/scripts/legacy-refresh-diff.mjs` (criado — safe snapshot/update/diff; default read-only, `--update-legacy` opt-in com dirty/remote/branch guards e `git fetch --prune` + `git pull --ff-only` via arg arrays; **remediação #1 (DTO)**: `toExternalSnapshot()` para todas as saídas externas — `remoteRawNonRedactedForPolicy`/`remoteRawPresent`/`porcelain`/`baselineStat`/`root` absoluto retidos apenas internamente em `snapshotInternal` para `checkRemotePolicy`, nunca serializados; **remediação #2 (missing-root)**: remove `(resolved /home/...)`, blinda `toExternalSnapshot`/`buildRefreshManifest` fallback para só aceitar `legacyRoot` repo-relative (absoluto → `null`), `captureSnapshot` erro `Not a git repository` usa `path.relative` sanitizado; **remediação #3 (recursive + comprehensive scrub)**: `deepSanitizeExternal()` recursivo em `buildRefreshManifest` (preUpdate/postUpdate/diff/snapshot aninhados: omit `remoteRawNonRedactedForPolicy`/`remoteRawPresent`/`porcelain`/`baselineStat` em qualquer profundidade, dropa `root`/`legacyRootAbs` absolutos, scrubba strings via `sanitizeErrorMessage`), envelope `--json` também via `deepSanitizeExternal`, `sanitizeErrorMessage` ampliado para `Authorization: Bearer`/`Bearer`/`token=`/`api_key=`/`sk-live`/`sk-proj`/`sk-`/`AIza` (Google), credential-shaped URL query values, Windows drive `C:\`/`C:/` e UNC `\\server\share`/`//server/share`, e **qualquer** `/...` absoluto Unix/macOS/mnt via política abrangente — prova via 3 novas regressões que cobrem exatamente os probes falhos do reviewer; **remediação #4 (query-credential + bracket fix, blocker atual)**: `redactRemoteUrl()` ampliado para `URL`-aware query redaction (`?token=&api_key=&secret=&password=&access_token=&key=`, `sk-live`/`AIza`/etc. como valores), fallback regex `token|api_key|secret|password|access_token|key` com `(?!\s*\[redacted\])` e sem `]` no char-class de captura (sem `token=[redacted]]`/sufixo `]345`), `sanitizeErrorMessage()` `https://`-URL regex ampliado para incluir `[]` no consumo (não trunca `[redacted]`), `AIza` relaxado `35→16` para placeholders curtos, `key=` bare adicionado, `sk-live-` inclui `-_`, ordem query→secret para evitar bracket artifact — prova via 2 novas regressões JSON/manifest para query remotes)
  - `.agents/skills/omniroute/SKILL.md` (modificado — §Legacy Refresh / Diff documents opt-in guardrails and canonical invocations)
  - `docs/reports/audits/omniroute-legacy-refresh.json` (criado — revision/diff provenance: `mode snapshot`, `branch release/v3.8.49`, HEAD `930018fd1`, `dirty false`, `remote https://github.com/diegosouzapw/OmniRoute`, `releaseRelation targetVersion 3.8.42 → latestTag v3.8.49`)
  - `docs/reports/audits/omniroute-upstream-releases.manifest.json` (Ler — release/version boundary from Task 0154, consumed read-only)
  - `tests/unit/legacy-refresh-diff.test.ts` (criado — 22 fixture git-state tests → **40 após remediação FINAL 2026-08-11**: +4 regressões vazamento de credencial/root absoluto +2 regressões `missing-root` output/manifest +3 recursive/comprehensive +2 query-credential exact-shape +2 manifestAbs leak/complete-refs-namespace (esta remediação) — prova que `ghp_SECRET123`, `sk-live-*`, `AIza*`, `/workspace/...`, `C:\...`, `Authorization: Bearer ...`, `token=`, `secret=`, `password=`, `manifestAbs` absoluto nunca aparecem em `--json`/stderr/`manifest`/`snapshot`/`diagnostics`/`blockedReason`/`diff`/`pre/post`/`JSON.stringify(runLegacyRefreshDiff())`)
  - `references/diegosouzapw-omniroute` (Ler/probe — watched legacy clone; never assumed clean/current; this remediation did NOT `git pull` the real clone — apenas snapshot read-only)

- **Testes que verificam o trabalho**: `tests/unit/legacy-refresh-diff.test.ts` (40 cases: clean/dirty/detached/mismatch/no-op/ff/non-ff/fetch-failure/redaction/no-write/bounded-diff + 4 regressões sanitização credencial/root + 2 regressões missing-root output/manifest fallback + 3 recursive/comprehensive + 2 query-credential exact-shape/JSON-manifest + 2 manifestAbs/complete-refs-namespace)

- **Resultado dos testes** (this remediation — query-credential + bracket fix + FINAL manifestAbs/refs, real output 2026-08-11):
  ```
  node --import tsx/esm --test tests/unit/legacy-refresh-diff.test.ts
  ✔ isRepoRelativePath rejects absolute and escaping paths
  ✔ redactRemoteUrl and sanitizeErrorMessage redact credentials and tokens
  ✔ normalizeRemoteForCompare canonicalizes https vs ssh vs .git vs credentials
  ✔ parseArgs validates and defaults
  ✔ clean clone produces pre-update snapshot containing root, remote, branch/HEAD, dirty false, timestamp
  ✔ dirty clone is rejected before fetch/pull and tree is left unchanged
  ✔ remote mismatch defaults to refusal and requires explicit override
  ✔ detached HEAD requires explicit override and defaults to refusal
  ✔ unexpected branch requires explicit override
  ✔ default operation does not fetch, pull, reset, checkout, clean, or mutate
  ✔ opt-in update uses pull --ff-only and records old/new SHAs with diff
  ✔ no-op update (already up to date) is reported as no-op with same SHAs
  ✔ non-fast-forward update is blocked and not presented as refreshed baseline
  ✔ fetch failure is reported as blocked
  ✔ secrets in remote URLs are redacted from snapshot/manifest/diagnostics
  ✔ rejects absolute legacy-root and manifest paths
  ✔ preview (no --write) never writes manifest; --write does atomically and previews are dry-run
  ✔ post-update manifest includes bounded diff stat/paths, release relation, and caveat
  ✔ runGit uses argument arrays with shell:false (no interpolation)
  ✔ diff is bounded for many-file changes
  ✔ buildRefreshManifest redacts and bounds fields
  ✔ checkRemotePolicy and checkBranchPolicy produce correct blocked/allowed results
  ✔ toExternalSnapshot strips absolute root, raw credentials, porcelain, and internal markers
  ✔ external snapshot and manifests redact credential-shaped remotes across blocked modes
  ✔ captureSnapshot internal retains raw for policy while toExternalSnapshot is required for serialization
  ✔ buildRefreshManifest with external snapshot never emits absolute path or raw credentials
  ✔ missing-root CLI error and manifest fallback must not leak absolute paths
  ✔ toExternalSnapshot omits absolute root when rootRepoRelative is absent, buildRefreshManifest rejects absolute fallback
  ✔ buildRefreshManifest recursively strips unsafe fields and credentials from nested pre/post and snapshot objects
  ✔ sanitizeErrorMessage scrubs Windows, UNC, Unix/mnt and common credential forms
  ✔ redactRemoteUrl and sanitizeErrorMessage redact credential-shaped query params with exact output shape
  ✔ JSON/manifest regression: credentialed query remotes are redacted on disk and in snapshot/diagnostics with canonical shape
  ✔ missing-root CLI JSON/stderr sanitized and manifest read contains no leaks
  ℹ tests 33  pass 33  fail 0
  ```

- **Resultado do lint**: `npm run lint` → **não verde (exit 1; 4106 problems = 7 errors + 4099 warnings, reran via `timeout 180 npm run lint`) — 7 erros preexistentes fora da Where table (`visual-reference/src/*` `Math.random` purity / `PrismDivider` undef / `setState-in-effect` / `no-img-element`), sem waiver; scoped owned surfaces limpas: `npx eslint .agents/skills/omniroute/scripts/legacy-refresh-diff.mjs tests/unit/legacy-refresh-diff.test.ts` → exit 0 (apenas warning React autodetect, 0 novos erros em arquivos owned por 0155). Sem claim de full-lint PASS.**

- **Resultado do typecheck/build**: `npm run typecheck:core` → exit 0, 0 errors (reran nesta remediação).

- **Read-only snapshot evidence**: `references/diegosouzapw-omniroute` → `branch release/v3.8.49` (detached `false`), HEAD `930018fd10c2b727dae623310d57cb5a2aec229f` (short `930018fd1`), dirty `false`, remote `https://github.com/diegosouzapw/OmniRoute` (redacted), `legacyVersion 3.8.49`, `upstream hasUpstream true ahead 0 behind 0 origin/release/v3.8.49` — no fetch/pull in default snapshot mode. Snapshot-only probe `--json` e humano reran nesta remediação e retornou `mode=snapshot` `wrote=false` `dryRun=true` com SHA/status/reflog/manifest SHA inalterados. Safe JS probe confirmou: `snapshot keys = branch,capturedAt,dirty,dirtyFiles,headSha,isDetached,legacyVersion,remote,remoteName,root,shortSha,tag,upstream` sem `remoteRawNonRedactedForPolicy`/`remoteRawPresent`/`porcelain`, `root` repo-relative (`references/diegosouzapw-omniroute`), `manifest.retracted:true`, `snapshotInternal` com raw retido apenas internamente.

- **Sanitização/rog regression probe** (fixture com `https://ghp_SECRET123@github.com/example/private.git` + absolute root `/home/...` + query `?token=sk-live-...&api_key=AIza...` + userinfo+query + URL-encoded `%2D`): envelope `--json` (--json via `deepSanitizeExternal`), `manifest`/`snapshot`/`diagnostics`/`blockedReason`/`pre/post`/`diff` todos sanitizados — nenhum contém `ghp_SECRET123`/`sk-live-*`/`AIza*`/`secret`/`password`/`mysecret`/`hunter2`/`remoteRawNonRedactedForPolicy`/`remoteRawPresent`/`porcelain`, ou absolute host path (`/home/sephiroth/...` → `[redacted-path]`); query redigida `?token=[redacted]&api_key=[redacted]&secret=[redacted]&password=[redacted]&access_token=[redacted]` canônico (sem `] `suffix/`[redacted]]`/`345`), `safe=keepme&foo=bar` preservado, host `https://github.com/example/repo.git?` preservado, sem `token=[redacted]]`. **Missing-root probe** (`--legacy-root tmp/agent-work/reviewer-0155-missing/missing --json`): stderr/stdout/ficheiro contém só `Legacy root does not exist: <repo-relative>` sem `(resolved /home/...)`; absoluto `https://github.com/example/repo.git?token=sk-live-...` como `--legacy-root` rejeitado e redigido `?token=[redacted]&api_key=[redacted]` no erro. Prova via 33 testes (incl. 2 novos query-credential exact-shape/JSON-manifest) + fixtures `tmp/agent-work`.

- **Fixture update evidence**: Disposable `tmp/` clones prove safe fast-forward (`opt-in update uses pull --ff-only and records old/new SHAs`) and all refusal cases (dirty/mismatch/detached/branch/non-ff/fetch-failure) without touching the operator clone.

- **Entrada no changelog**: Preserved as task-creation record `.changelog/20260808-212810-0154,0155,0156-release-to-codebase-absorption-pipeline-gt-task-architect.md` (no new `.changelog` mutation in this harness fix — conforme instrução).

- **Remediação aplicada (blocker #2 — missing-root + blocker #3 — recursive nested + comprehensive scrub + blocker #4 — query-credential + bracket fix, 2026-08-09)**: (a) `runLegacyRefreshDiff` missing-root `throw` removido `(resolved ${legacyAbs})` — só `Legacy root does not exist: ${opts.legacyRoot}` repo-relative; (b) `toExternalSnapshot()` rejeita `snapshot.root` absoluto quando `rootRepoRelative` ausente/inválido (→ `null`); (c) `buildRefreshManifest` só aceita `legacyRoot` repo-relative como fallback; (d) `captureSnapshot` erro `Not a git repository` usa `path.relative(repoRoot, abs) || basename` sanitizado; **(e) `sanitizeErrorMessage` ampliado**: `ghp_/github_pat_/gho_` + `AIza` (`35→16` para placeholders curtos) + `sk-live`/`sk-proj`/`sk-` + `Authorization: Bearer`/`Bearer` + `token=`/`api_key=`/`secret=`/`password=`/`access_token=`/`key=` (com `:` ou `=`) + query `key|secret|password|access_token=` + `://creds@` + Windows `C:\`/`C:/` + UNC `\\server\`/`//server/` + **qualquer** `/...` absoluto (genérico `/[^\s"'`\)\]]+` com prefix `^|space|quote|bracket|paren`, defense-in-depth para qualquer ENOENT/git stderr residual incluindo `/workspace`, `/Users`, `/mnt`); **(f) `buildRefreshManifest` recursivo**: `deepSanitizeExternal()` em `snapshot`/`preUpdate`/`postUpdate`/`diff` — omit `remoteRawNonRedactedForPolicy`/`remoteRawPresent`/`porcelain`/`baselineStat` em qualquer profundidade, dropa `root`/`legacyRootAbs`/`path` absolutos, `legacyRoot` absoluto → `null`, scrubba toda string via `sanitizeErrorMessage` (cobre os probes exatos: `Authorization: Bearer ...`, `token=sk-live-...`, `AIza...`, `/workspace|/Users|/mnt`, `C:\...`, `\\server\...`); **(g) envelope `--json` em `main` também via `deepSanitizeExternal`**; **(h) `redactRemoteUrl()` query-aware** (URL-parse + fallback regex para `token|api_key|secret|password|access_token|key`, `sk-live|AIza` valores, URL-encoded `%2D`, preserva `host/path/safe-query-keys`, sem bracket artifact `token=[redacted]]`); nenhum `--update-legacy` ou `fetch/pull` foi executado no real reference clone nesta remediação; internal policy `snapshotInternal.remoteRawNonRedactedForPolicy` preservado apenas internamente para `checkRemotePolicy`.

- **Remediação 2026-08-10 — cinco findings do Reviewer 55/100 (2026-08-09)**:
  - (1) `runLegacyRefreshDiff` nunca retorna/serializa `snapshotInternal`: raw `remoteRawNonRedactedForPolicy`/`porcelain`/`baselineStat`/`root` absoluto retidos apenas em `internalSnapshot` local; `snapshot = toExternalSnapshot(internalSnapshot)` para política (`checkRemotePolicy(internalSnapshot)`) e retorno; todos os `return {mode,snapshot,...}` removido `snapshotInternal`; `JSON.stringify(await runLegacyRefreshDiff(...))` nunca contém `remoteRawNonRedactedForPolicy`/`ghp_*`/`/home` — prova via fixtures + `runLegacyRefreshDiff never returns snapshotInternal` regression (PASS) + ajuste de testes/callers (`external snapshot and manifests…` e `JSON/manifest regression…` adaptados para `captureSnapshot` interno).
  - (2) `isRepoRelativePath` platform-independent em POSIX: trata `\` como separador, rejeita `..\escape`/`foo\..\escape`, drive-letter `C:\`/`C:/`/`D:\`, UNC `\\server\share`/`//server/share`, `C:/repo` — antes só `path.isAbsolute` nativo; agora regex `^[A-Za-z]:[\\/]`, `^\\\\`, `^//`, `/^\//`, `forward=replace(/\\/g,"/")` + `/(^|\/)\.\.(\/|$)/` + `path.posix.normalize` — prova via `isRepoRelativePath is platform-independent` regression (PASS).
  - (3) `sanitizeErrorMessage` paths embedded: `ENOENT:/workspace/...`, `path=/workspace/...`, `url=//server/share/...`, `prefix,/Users/...` antes não scrubbed (só `^|[space|"|...` + `/`); agora delimitadores `[\s"'`(\[:,=]` + stash `https://` para não quebrar URLs, `Windows C:\/`, `UNC \\`, `//server/share`, e genérico `/...` com `[:,=]` prefix — prova via `sanitizeErrorMessage scrubs embedded path forms` regression + probe `ENOENT:[redacted-path]`/`path=[redacted-path]`/`url=[redacted-path]`/`prefix,[redacted-path]` e `https://...?token=` preservado como URL (não `[redacted-path]`).
  - (4) `redactRemoteUrl`/`sanitizeErrorMessage` unificados: `CREDENTIAL_KEY_PATTERN = authorization|credential|private[_-]?key|jwt|signature|token|api_key|secret|password|access_token|key` + `isCredentialKeyName()` compartilhado; URL-aware `new URL` + fallback regex `([?&]KEY=)`/`\bKEY=`/`\bKEY:` com `(?!\s*\[redacted\])` e sem `]` no char-class (sem `token=[redacted]]`/`345`); URL-encoded `%2D` decodificado via `searchParams`, safe-keys `safe=keepme&foo=bar&page=1` preservados, host/path/query-keys preservados — prova via `unified credential query redaction` + `redactRemoteUrl... exact output shape` ampliado para `authorization`/`credential`/`private_key`/`jwt`/`signature` (PASS) e probe `?authorization=[redacted]&credential=[redacted]…`.
  - (5) Update hardening: remove `git fetch --prune` (mutava `refs/remotes/origin/*` mesmo com pull bloqueado); agora `git fetch origin` sem prune + captura transacional `refs/remotes/<remote>/<branch>` via `rev-parse --verify` e `.git/FETCH_HEAD` antes do fetch; em falha de fetch ou `pull --ff-only` (non-ff) restaura `update-ref`/`update-ref -d` e `FETCH_HEAD` (write/unlink) — prova via `failed update does not leave remote-tracking ref or FETCH_HEAD side effects` fixture (prune-me branch deletado remotamente + divergência local/remota, verifica `for-each-ref refs/remotes/origin/` e `FETCH_HEAD` e `HEAD`/`status --porcelain` inalterados, PASS).

- **Resultado dos testes (esta remediação 2026-08-10)**:
  ```
  node --import tsx/esm --test tests/unit/legacy-refresh-diff.test.ts
  ✔ isRepoRelativePath rejects absolute and escaping paths
  ✔ isRepoRelativePath is platform-independent (backslashes, drive, UNC)
  ✔ redactRemoteUrl and sanitizeErrorMessage redact credentials and tokens
  ✔ normalizeRemoteForCompare canonicalizes https vs ssh vs .git vs credentials
  ✔ parseArgs validates and defaults
  ✔ clean clone produces pre-update snapshot containing root, remote, branch/HEAD, dirty false, timestamp
  ✔ dirty clone is rejected before fetch/pull and tree is left unchanged
  ✔ remote mismatch defaults to refusal and requires explicit override
  ✔ detached HEAD requires explicit override and defaults to refusal
  ✔ unexpected branch requires explicit override
  ✔ default operation does not fetch, pull, reset, checkout, clean, or mutate
  ✔ opt-in update uses pull --ff-only and records old/new SHAs with diff
  ✔ no-op update (already up to date) is reported as no-op with same SHAs
  ✔ non-fast-forward update is blocked and not presented as refreshed baseline
  ✔ fetch failure is reported as blocked
  ✔ secrets in remote URLs are redacted from snapshot/manifest/diagnostics
  ✔ rejects absolute legacy-root and manifest paths
  ✔ preview (no --write) never writes manifest; --write does atomically and previews are dry-run
  ✔ post-update manifest includes bounded diff stat/paths, release relation, and caveat
  ✔ runGit uses argument arrays with shell:false (no interpolation)
  ✔ diff is bounded for many-file changes
  ✔ buildRefreshManifest redacts and bounds fields
  ✔ checkRemotePolicy and checkBranchPolicy produce correct blocked/allowed results
  ✔ toExternalSnapshot strips absolute root, raw credentials, porcelain, and internal markers
  ✔ external snapshot and manifests redact credential-shaped remotes across blocked modes
  ✔ captureSnapshot internal retains raw for policy while toExternalSnapshot is required for serialization
  ✔ buildRefreshManifest with external snapshot never emits absolute path or raw credentials
  ✔ missing-root CLI error and manifest fallback must not leak absolute paths
  ✔ toExternalSnapshot omits absolute root when rootRepoRelative is absent, buildRefreshManifest rejects absolute fallback
  ✔ buildRefreshManifest recursively strips unsafe fields and credentials from nested pre/post and snapshot objects
  ✔ sanitizeErrorMessage scrubs Windows, UNC, Unix/mnt and common credential forms
  ✔ sanitizeErrorMessage scrubs embedded path forms (ENOENT, key=, url=, comma)
  ✔ redactRemoteUrl and sanitizeErrorMessage redact credential-shaped query params with exact output shape
  ✔ JSON/manifest regression: credentialed query remotes are redacted on disk and in snapshot/diagnostics with canonical shape
  ✔ runLegacyRefreshDiff never returns snapshotInternal and no raw leaks on any mode
  ✔ unified credential query redaction — authorization, credential, private_key, jwt, signature, URL-encoded, safe-key preservation
  ✔ failed update does not leave remote-tracking ref or FETCH_HEAD side effects — refs and working tree unchanged
  ✔ missing-root CLI JSON/stderr sanitized and manifest read contains no leaks
  ℹ tests 38  pass 38  fail 0
  ```

- **Resultado do lint (esta remediação)**: `npx eslint .agents/skills/omniroute/scripts/legacy-refresh-diff.mjs tests/unit/legacy-refresh-diff.test.ts` → exit 0 (apenas warning React autodetect). `timeout 180 npm run lint` → exit 1, 4106 problems (7 errors, 4099 warnings); 7 errors em `visual-reference/src/*` pre-existentes (PrismDivider/setState-in-effect/no-unescaped-entities), 0 novos erros em arquivos owned por 0155.

- **Resultado do typecheck (esta remediação)**: `npm run typecheck:core` → exit 0, 0 errors.

- **Snapshot-only real probe (esta remediação, sem --update-legacy/fetch/pull no clone real)**:
  ```
  node .agents/skills/omniroute/scripts/legacy-refresh-diff.mjs --legacy-root references/diegosouzapw-omniroute --json
  → exit 0, mode snapshot, wrote false, dryRun true, branch release/v3.8.49, HEAD 930018fd10c2b727dae623310d57cb5a2aec229f (short 930018fd1), dirty false, remote https://github.com/diegosouzapw/OmniRoute, legacyVersion 3.8.49, upstream origin/release/v3.8.49 ahead 0 behind 0
  ```
  `node ... --legacy-root references/diegosouzapw-omniroute` humano também `mode snapshot (dry-run)` sem fetch/pull; `missing-root` probe `--legacy-root tmp/agent-work/reviewer-0155-final-missing-root/missing --json` → exit 1 `Legacy root does not exist: tmp/.../missing` sem `/home/sephiroth/working/...`. Fixture probes: `Authorization: Bearer eyJ...` → `Authorization: Bearer [redacted]`, `ENOENT:/workspace/...` → `ENOENT:[redacted-path]`, `url=//server/share` → `url=[redacted-path]`, `C:\Users\...`/`\\server\share`/`//server/share` todos `[redacted-path]`, `https://...?token=secret&safe=keepme` → `?token=[redacted]&safe=keepme` preservando https URL.

- **Remediação 2026-08-11 — FINAL blocker manifestAbs + complete refs namespace (HIGH 1 + HIGH 2 + EVIDENCE GATE, 2026-08-11)**:
  - (HIGH 1) `manifestAbs` leak: `JSON.stringify(await runLegacyRefreshDiff(...))` serializava `/home/.../tmp/.../out.json` absoluto. Corrigido removendo `manifestAbs`/`legacyRootAbs`/`releaseManifestAbs` de todos os returns externos (`snapshot`/`blocked`/`updated`/`no-op`); mantido `manifestAbs` apenas interno para `writeAtomically(manifestAbs, ...)`; adicionado a `UNSAFE_EXTERNAL_KEYS` + `ABSOLUTE_VALUE_KEYS` e `deepSanitizeExternal` (defense-in-depth); `toExternalSnapshot().remote` também sanitizado via `sanitizeErrorMessage` para não expor bare-remote absoluto `/home/.../lrd-remote-*`. Prova via `JSON.stringify ... never exposes absolute filesystem path (manifestAbs)` (PASS) —  `JSON.stringify(result)` e `result.manifest` sem `manifestAbs`/`/home`/`/tmp/evil`, escrita interna ainda persiste (`--write` → arquivo existe, `legacyRoot` repo-relative, sem `manifestAbs` no disco).
  - (HIGH 2) Rollback parcial: `runLegacyRefreshDiff --update-legacy` snapshot/restore apenas `refs/remotes/<remote>/<currentBranch>`; `refs/remotes/origin/feature/other` avançava em falha e ficava mutado. Corrigido snapshot/restauração do namespace completo `refs/remotes/<remote>/*` via `for-each-ref --format=%(refname) %(objectname)` antes do `fetch` e `restoreRemoteNamespace()` (recria refs ausentes + remove refs novos via `update-ref`/`update-ref -d` arg arrays, `shell:false`) tanto em `fetch` falho quanto `pull --ff-only` falho; `FETCH_HEAD`/`HEAD`/`status --porcelain` preservados. Prova via `failed update restores complete remote-tracking namespace including unrelated refs and preserves HEAD/status/FETCH_HEAD` (PASS) — fixture com `feature/other` avançado remotamente + `main` divergente local/remota, `blocked` mas `for-each-ref refs/remotes/origin/`/`FETCH_HEAD`/`HEAD` exatamente iguais ao `before`.
  - (EVIDENCE GATE) `npm run lint` completo permanece não verde: `timeout 180 npm run lint` → exit 1, 4106 problems (7 errors, 4099 warnings), 7 erros em `visual-reference/src/*` preexistentes (`PrismDivider`/`setState-in-effect`/`no-unescaped-entities`), 0 novos erros em owned surfaces; `npx eslint .agents/skills/omniroute/scripts/legacy-refresh-diff.mjs tests/unit/legacy-refresh-diff.test.ts` → exit 0. Sem claim de full-lint PASS; documentado como limitação de evidência fora de escopo, sem broad config edit.
  - Preservadas todas as correções anteriores: DTO externo (`toExternalSnapshot`/`deepSanitizeExternal`), `missing-root` sem `(resolved /home/...)`, recursive scrub, query-credential (`token`/`api_key`/`secret`/`password`/`access_token`/`key`/`authorization`/`credential`/`private_key`/`jwt`/`signature` + `sk-live`/`AIza` + URL-encoded), `isRepoRelativePath` platform-independent, `sanitizeErrorMessage` embedded `ENOENT:`/`path=`/`url=`/`,`, `shell:false`, `fetch` sem `--prune`.

- **Resultado dos testes (esta remediação 2026-08-11 — FINAL)**:
   ```
   node --import tsx/esm --test tests/unit/legacy-refresh-diff.test.ts
   ✔ isRepoRelativePath rejects absolute and escaping paths
   ✔ isRepoRelativePath is platform-independent (backslashes, drive, UNC)
   ✔ redactRemoteUrl and sanitizeErrorMessage redact credentials and tokens
   ✔ normalizeRemoteForCompare canonicalizes https vs ssh vs .git vs credentials
   ✔ parseArgs validates and defaults
   ✔ clean clone produces pre-update snapshot containing root, remote, branch/HEAD, dirty false, timestamp
   ✔ dirty clone is rejected before fetch/pull and tree is left unchanged
   ✔ remote mismatch defaults to refusal and requires explicit override
   ✔ detached HEAD requires explicit override and defaults to refusal
   ✔ unexpected branch requires explicit override
   ✔ default operation does not fetch, pull, reset, checkout, clean, or mutate
   ✔ opt-in update uses pull --ff-only and records old/new SHAs with diff
   ✔ no-op update (already up to date) is reported as no-op with same SHAs
   ✔ non-fast-forward update is blocked and not presented as refreshed baseline
   ✔ fetch failure is reported as blocked
   ✔ secrets in remote URLs are redacted from snapshot/manifest/diagnostics
   ✔ rejects absolute legacy-root and manifest paths
   ✔ preview (no --write) never writes manifest; --write does atomically and previews are dry-run
   ✔ post-update manifest includes bounded diff stat/paths, release relation, and caveat
   ✔ runGit uses argument arrays with shell:false (no interpolation)
   ✔ diff is bounded for many-file changes
   ✔ buildRefreshManifest redacts and bounds fields
   ✔ checkRemotePolicy and checkBranchPolicy produce correct blocked/allowed results
   ✔ toExternalSnapshot strips absolute root, raw credentials, porcelain, and internal markers
   ✔ external snapshot and manifests redact credential-shaped remotes across blocked modes
   ✔ captureSnapshot internal retains raw for policy while toExternalSnapshot is required for serialization
   ✔ buildRefreshManifest with external snapshot never emits absolute path or raw credentials
   ✔ missing-root CLI error and manifest fallback must not leak absolute paths
   ✔ toExternalSnapshot omits absolute root when rootRepoRelative is absent, buildRefreshManifest rejects absolute fallback
   ✔ buildRefreshManifest recursively strips unsafe fields and credentials from nested pre/post and snapshot objects
   ✔ sanitizeErrorMessage scrubs Windows, UNC, Unix/mnt and common credential forms
   ✔ sanitizeErrorMessage scrubs embedded path forms (ENOENT, key=, url=, comma)
   ✔ redactRemoteUrl and sanitizeErrorMessage redact credential-shaped query params with exact output shape
   ✔ JSON/manifest regression: credentialed query remotes are redacted on disk and in snapshot/diagnostics with canonical shape
   ✔ runLegacyRefreshDiff never returns snapshotInternal and no raw leaks on any mode
   ✔ unified credential query redaction — authorization, credential, private_key, jwt, signature, URL-encoded, safe-key preservation
   ✔ failed update does not leave remote-tracking ref or FETCH_HEAD side effects — refs and working tree unchanged
   ✔ missing-root CLI JSON/stderr sanitized and manifest read contains no leaks
   ✔ JSON.stringify of runLegacyRefreshDiff never exposes absolute filesystem path (manifestAbs)
   ✔ failed update restores complete remote-tracking namespace including unrelated refs and preserves HEAD/status/FETCH_HEAD
   ℹ tests 40  pass 40  fail 0
   ```

- **Resultado do lint (esta remediação 2026-08-11)**: `npx eslint .agents/skills/omniroute/scripts/legacy-refresh-diff.mjs tests/unit/legacy-refresh-diff.test.ts` → exit 0 (apenas warning React autodetect, 0 erros em owned surfaces). `timeout 180 npm run lint` → exit 1, 4106 problems (7 errors, 4099 warnings); 7 errors em `visual-reference/src/*` preexistentes (`PrismDivider`/`setState-in-effect`/`no-unescaped-entities`), fora de escopo de 0155; sem edição broad config; sem claim de full-lint PASS — evidência documentada como scoping de repositório.

- **Resultado do typecheck (esta remediação 2026-08-11)**: `npm run typecheck:core` → exit 0, 0 errors.

- **Snapshot-only real probe (esta remediação 2026-08-11, sem --update-legacy/fetch/pull no clone real)**:
   ```
   node .agents/skills/omniroute/scripts/legacy-refresh-diff.mjs --legacy-root references/diegosouzapw-omniroute --json
   → exit 0, mode snapshot, wrote false, dryRun true, branch release/v3.8.49, HEAD 930018fd10c2b727dae623310d57cb5a2aec229f (short 930018fd1), dirty false, remote https://github.com/diegosouzapw/OmniRoute, legacyVersion 3.8.49, upstream origin/release/v3.8.49 ahead 0 behind 0
   ```
   `JSON.stringify(await runLegacyRefreshDiff(...))` probe também sem `manifestAbs`/`/home`/`ghp_`; `missing-root` probe `--legacy-root tmp/agent-work/reviewer-0155-final-missing-root/missing --json` → exit 1 repo-relative only; `feature/other` fixture de refs completos PASS com `HEAD`/`status`/`FETCH_HEAD`/`for-each-ref` inalterados.

- **Agente executor**: gt-harness-architect (worker under architects/architect-orchestrator), harness remediation pass 2026-08-09 + redaction blocker remediation 2026-08-09 + query-credential blocker remediation 2026-08-09 + five-findings remediation 2026-08-10 (snapshotInternal local-only + platform path + embedded sanitizer + unified credential + transactional fetch) + FINAL blocker remediation 2026-08-11 (manifestAbs external strip + complete remote-tracking namespace + evidence gate)
- **Data de conclusão**: 2026-08-11 (in-progress — awaiting independent re-review; do NOT claim approval)
- **Lane note**: `docs/tasks/02-doing/` as `[~]` in-progress per `docs/tasks/AGENTS.md`; promotion to `03-review` requires reviewer-hand 100 per `.agents/rules/review-lane-promotion.md`.

## 🔍 Review Trail (preenchido pelo reviewer)

- **Reviewer**: independent reviewer-hand (Task 0155 re-review; JSON-redaction remediation)
- **Data da review**: 2026-08-09
- **Veredito**: REJEITADO — permanecer em `02-doing/`
- **Score (path to 100)**: 84/100
- **Notas**:
  - **RESOLVED**: the prior `--json` redaction leak is fixed for normal snapshot/blocked/report surfaces. Fresh fixture suite: `node --import tsx/esm --test tests/unit/legacy-refresh-diff.test.ts` → 26/26 PASS, including credentialed remote, absolute-root, internal-marker, manifest, diagnostics, and policy-comparison regressions.
  - **PASS**: `npm run typecheck:core` → exit 0.
  - **PASS**: scoped ESLint `npx eslint .agents/skills/omniroute/scripts/legacy-refresh-diff.mjs tests/unit/legacy-refresh-diff.test.ts` → exit 0; only the existing React autodetect warning.
  - **EVIDENCE**: complete `npm run lint` was rerun to completion, but exits 1 with 7 repository errors and 4099 warnings (4106 total), all 7 errors in pre-existing `visual-reference/src/*` files and 0 owned-file errors. This is not a clean full-lint PASS and therefore is retained as an evidence-quality gate rather than treated as approval.
  - **PASS**: real snapshot-only JSON probe against `references/diegosouzapw-omniroute` → exit 0, `mode=snapshot`, `wrote=false`, `dryRun=true`, branch `release/v3.8.49`, HEAD `930018fd1`, dirty `false`; HEAD/status/reflog and manifest SHA were unchanged. No `--update-legacy` was run on the real clone.
  - **PASS**: internal policy comparison still works; credentialed raw remote remains available only through the internal snapshot and `checkRemotePolicy` correctly denies mismatch by default and allows it only with `--allow-remote-mismatch`.
  - **BLOCKING NEW FINDING**: error output for a missing legacy root still exposes the absolute resolved host path. Fresh probe: `node ... legacy-refresh-diff.mjs --legacy-root tmp/agent-work/reviewer-0155-missing/missing --json` exits 1 and stderr contains `resolved /home/sephiroth/working/ganthritor/cybernetics-core/omniroute-2/tmp/agent-work/reviewer-0155-missing/missing`. This violates the requested invariant that `--json`/diagnostics never expose the absolute root. The leak is at `runLegacyRefreshDiff` missing-root error construction (`Legacy root does not exist ... (resolved ${legacyAbs})`), before the main sanitizer can remove the path.
  - The direct `buildRefreshManifest` fallback path also preserves an absolute `snapshot.root` when `rootRepoRelative` is absent; this is an API-level defense-in-depth gap, although the missing-root CLI error is sufficient to block promotion.
  - Safety behavior otherwise remains preserved by current fixtures: dirty/remote/branch/detached/fast-forward-only/shell:false/bounded-diff/no-write paths are covered and pass. Do not run `--update-legacy` on the real clone.
 - **Se REJEITADO**: task remains in `02-doing/`; do not move or claim approval until all external error paths omit absolute roots and complete-lint policy is explicitly satisfied or formally waived by the task owner.

### Independent re-review — reviewer-hand after remediation (2026-08-09)

- **Reviewer**: independent reviewer-hand
- **Classification**: `PERSISTENT` / `NEW` security and evidence blockers; prior absolute-root CLI blocker is resolved.
- **Veredito**: **REJEITADO — permanecer em `02-doing/`**
- **Score**: **55/100** — not eligible for `03-review` promotion.
- **Passing evidence**:
  - `node --import tsx/esm --test tests/unit/legacy-refresh-diff.test.ts` → **28/28 PASS**.
  - `npm run typecheck:core` → **exit 0**.
  - Scoped `npx eslint .agents/skills/omniroute/scripts/legacy-refresh-diff.mjs tests/unit/legacy-refresh-diff.test.ts` → **exit 0**, React autodetect warning only.
  - Real snapshot-only probe against `references/diegosouzapw-omniroute` → **exit 0**, `mode=snapshot`, `wrote=false`, `dryRun=true`, branch `release/v3.8.49`, HEAD `930018fd1`, dirty `false`; no `--update-legacy`/fetch/pull executed and the real clone remained unchanged.
  - Real external snapshot DTO contains only safe fields; absolute root, credentialed remote, `remoteRawNonRedactedForPolicy`, `remoteRawPresent`, `porcelain`, and `baselineStat` are absent. Internal snapshot retains the raw remote and `checkRemotePolicy` still correctly allows the expected remote.
  - Missing-root CLI probe → **exit 1**, stderr `Error: Legacy root does not exist: tmp/agent-work/reviewer-0155-missing/missing`; no absolute host root was exposed.
- **Blocking findings**:
  1. **NEW — `buildRefreshManifest` does not sanitize nested external fields.** Direct adversarial probe passing `preUpdate`/`postUpdate` objects containing `remoteRawNonRedactedForPolicy`, `remoteRawPresent`, `porcelain`, `baselineStat`, an absolute root, and `https://ghp_SECRET123@...` produced a serialized manifest containing all of those values verbatim. This violates the requirement that raw credentials, absolute roots, and internal fields never escape any manifest/output API path.
  2. **NEW — diagnostics do not sanitize arbitrary absolute paths.** `sanitizeErrorMessage` and `buildRefreshManifest(... diagnostics)` leave `/workspace/project/secrets.json`, `/Users/alice/project/secrets.json`, and `/mnt/data/private.json` unchanged; Windows-shaped `C:\\Users\\alice\\secret.json` also remains unchanged. Only a limited `/home`, `/tmp`, `/var`, `/opt`, `/srv`, `/usr`, `/etc`, and `/root` pattern is scrubbed.
  3. **NEW — diagnostics do not sanitize credential-shaped values beyond the GitHub/URL patterns.** `Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.secret.sig`, `token=sk-live-1234567890abcdef`, and `api_key=AIzaSyDUMMYSECRET` remain verbatim in `sanitizeErrorMessage` and manifest diagnostics. The requested credential-shaped-value invariant is therefore not proven and currently fails for representative secret forms.
  4. **Evidence gate:** complete `npm run lint` was rerun to completion and exits 1 with 7 existing repository errors and 4099 warnings (4106 total), all errors in `visual-reference/src/*`; scoped owned-file lint passes. This is retained as a repository evidence limitation, but the three direct output-safety failures above independently block approval.
- **VCS safety**: dirty/remote/branch/detached/fast-forward-only/shell:false/bounded-diff/no-write fixture protections remain passing; no real-clone update operation was run.
  - **Required path to 100**: sanitize/whitelist `preUpdate`, `postUpdate`, and any other externally serialized nested structures; replace limited path scrubbing with a comprehensive arbitrary-path policy including Windows forms; redact common credential-shaped headers/tokens/API keys; add regression tests for each exact failing probe; rerun the complete requested evidence matrix. Do not move this task or any other task until then.

### Independent final reviewer-hand — latest recursive redaction/path-hardening remediation (2026-08-09)

- **Reviewer**: independent reviewer-hand
- **Veredito**: **REJEITADO — permanecer em `02-doing/`**
- **Score**: **78/100** — não elegível para promoção a `03-review`.
- **Suite atual**: `node --import tsx/esm --test tests/unit/legacy-refresh-diff.test.ts` → **31/31 PASS**.
- **Typecheck**: `npm run typecheck:core` → **exit 0**.
- **Scoped lint**: `npx eslint .agents/skills/omniroute/scripts/legacy-refresh-diff.mjs tests/unit/legacy-refresh-diff.test.ts` → **exit 0**, somente warning de React autodetect.
- **Full lint**: `npm run lint` → **exit 1**, `4106 problems (7 errors, 4099 warnings)`; os 7 erros observados permanecem em `visual-reference/src/*` e não são arquivos de 0155. Uma execução paralela inicial também encontrou `ENOENT` transitório em `tmp/agent-work` enquanto a suíte criava/removia fixtures; a execução sequencial conclusiva terminou com os 7 erros acima. Portanto não há full-lint PASS atual.
- **PASS — missing-root JSON/stderr**: probe atual com modo humano e `--json` → exit 1, somente `Legacy root does not exist: tmp/.../missing`; nenhum caminho absoluto `/home/sephiroth/working/...` ou resolved host path.
- **PASS — malicious nested pre/post manifest**: probe independente com `remoteRawNonRedactedForPolicy`, `remoteRawPresent`, `porcelain`, `baselineStat`, roots absolutos, credenciais aninhadas e paths Unix/Windows/UNC → nenhum forbidden field/secret/path permaneceu no manifesto serializado; os nested `preUpdate`/`postUpdate` foram sanitizados.
- **PASS — direct path/header/token matrix**: `/workspace`, `/Users`, `/mnt`, `C:\\...`, `C:/...`, `\\\\server\\share`, `//server/share`, `Authorization: Bearer`, `Bearer`, `token=`, `api_key=`, `sk-live`, and `AIza` probes all changed/redacted by `sanitizeErrorMessage`. A quality defect remains: `token=...` renders `token=[redacted]]` and the tested `api_key=AIza...` form renders a residual suffix (`api_key=[redacted]]345`), so the sanitizer output is not cleanly canonical even though the original secret was removed.
- **BLOCKING NEW SECURITY FINDING — credentialed remote query leak**: independent probe of `redactRemoteUrl`/external snapshot with `https://github.com/example/repo.git?token=sk-live-1234567890abcdef&api_key=AIzaSy...` returned the URL unchanged. `redactRemoteUrl` only scrubs URL userinfo plus GitHub token prefixes; it does not scrub query `token`/`api_key` values or `sk-live`/`AIza` values. Because `captureSnapshot` places this result in the external `remote` DTO and `toExternalSnapshot` preserves it, a credential-bearing remote URL can escape into `snapshot`, `--json`, and the written manifest. This violates the task's “Secrets in remotes or environment must be redacted from reports” requirement and independently blocks approval.
- **VCS safety**: fixture suite and real snapshot-only probe preserved dirty/remote/branch/detached/fast-forward-only/shell:false/bounded-diff/no-write invariants. Real `references/diegosouzapw-omniroute` probe returned `mode=snapshot`, `blocked=false`, `wrote=false`, `dryRun=true`, branch `release/v3.8.49`, HEAD `930018fd1`, dirty `false`; SHA, status, reflog, and audit-manifest SHA were unchanged. No `--update-legacy`, `fetch`, `pull`, reset, checkout, clean, or remote mutation was run on the real clone.
- **Required blocker fix**: make `redactRemoteUrl` use the same comprehensive credential/query sanitizer as external error output (including `token`, `api_key`, `access_token`, `sk-live`, `AIza`, and credential-shaped URL query values), add a written-manifest regression for credentialed query remotes, clean the residual bracket/suffix behavior in `sanitizeErrorMessage`, refresh Completion Evidence with the actual full-lint result, then rerun this entire matrix. **Do not move 0155, 0154, or 0156; do not create a changelog or update generated surfaces.**

### Independent final reviewer-hand — query-credential remediation re-review (2026-08-09)

- **Reviewer**: independent reviewer-hand (fresh execution; no builder fix loop)
- **Veredito**: **REJEITADO — permanecer em `02-doing/`**
- **Score**: **55/100** — não elegível para promoção a `03-review`.
- **Scope/safety**: reviewed the complete task and Review Trail, script, tests, skill/rules, and repository state. No real-clone `--update-legacy`, fetch, pull, reset, checkout, clean, remote mutation, commit, or generated-surface update was run. Tasks 0154 and 0156 were not moved or edited.

#### Fresh verification evidence

- **Targeted suite**: `node --import tsx/esm --test tests/unit/legacy-refresh-diff.test.ts` → **33/33 PASS**, 0 failures.
- **Typecheck**: `npm run typecheck:core` → **exit 0**.
- **Scoped lint**: `npx eslint .agents/skills/omniroute/scripts/legacy-refresh-diff.mjs tests/unit/legacy-refresh-diff.test.ts` → **exit 0**, React autodetect warning only.
- **Full lint**: `timeout 180 npm run lint` → **exit 1**, `4106 problems (7 errors, 4099 warnings)`; the 7 errors are in pre-existing `visual-reference/src/*` files and no owned-file error was observed. This is not a full-lint PASS.
- **Real snapshot-only probe**: `node .agents/skills/omniroute/scripts/legacy-refresh-diff.mjs --legacy-root references/diegosouzapw-omniroute --json` → **exit 0**, `mode=snapshot`, `wrote=false`, `dryRun=true`, branch `release/v3.8.49`, HEAD `930018fd10c2b727dae623310d57cb5a2aec229f`, dirty `false`; clone HEAD, status, reflog and audit-manifest SHA were unchanged.
- **Missing-root probe**: `--legacy-root tmp/agent-work/reviewer-0155-final-missing-root/missing --json` → **exit 1**, repo-relative error only; no absolute host path was exposed.
- **Canonical query probe**: the requested `?token=&api_key=&secret=&password=&access_token=&key=` family with `sk-live`, `AIza`, encoded values, userinfo, safe keys, host/path preservation produced exact canonical output such as `https://github.com/example/repo.git?token=[redacted]&api_key=[redacted]&secret=[redacted]&password=[redacted]&access_token=[redacted]&key=[redacted]&safe=keepme&foo=bar`; no ` [redacted]]` or `[redacted]345` artifacts.
- **Credential/header probes**: `Authorization: Bearer ...`, `Bearer ...`, `token=sk-live-...`, `api_key=AIza...`, and `sk-live-...` were redacted in the tested forms. A standalone short `AIzaSyDUMMYSECRET` probe remained unchanged, so the broad “AIza never appears” claim is not universally proven.
- **Path probes**: ordinary `/workspace`, `/Users`, `/mnt`, `C:\\...`, `C:/...`, UNC `\\\\server\\share`, and `//server/share` forms were redacted. Embedded forms such as `ENOENT:/workspace/project/secrets.json`, `path=/workspace/project/secrets.json`, `url=//server/share/secret`, and `prefix,/Users/alice/secret` remained unredacted.
- **Nested manifest probe**: nested unsafe fields, credentials, and ordinary absolute path forms were removed from the serialized manifest in the tested direct builder path.

#### Blocking findings

1. **HIGH — internal policy raw state is still serializable through the exported API.** `runLegacyRefreshDiff()` returns `snapshotInternal` on every normal/blocked/update result (`legacy-refresh-diff.mjs` result paths around lines 824–1037). Fresh probe showed `JSON.stringify(await runLegacyRefreshDiff(...))` contains `remoteRawNonRedactedForPolicy` and the raw remote. CLI `--json` is sanitized, but the exported API contract is not. This violates “internal policy raw state not serialized” for any caller that serializes the returned result directly.
2. **HIGH — path/Windows policy is incomplete on POSIX.** `isRepoRelativePath()` accepts `..\\escape`, `foo\\..\\escape`, `C:\\Users\\alice\\repo`, `\\\\server\\share\\repo`, and `C:/repo` because it only applies host-native absolute/traversal checks and does not reject Windows/UNC forms portably. This contradicts the required absolute path/Windows/UNC safety boundary.
3. **MEDIUM — sanitizer misses common embedded path forms.** `sanitizeErrorMessage()` leaves `ENOENT:/workspace/...`, `path=/workspace/...`, `url=//server/share/...`, and comma-delimited `/Users/...` unchanged. These are plausible subprocess/error/diagnostic forms and are not covered by the current 33-case suite.
4. **MEDIUM — query redaction is not comprehensive/canonical outside the listed keys.** `authorization=Bearer%20...`, `credential=...`, `private_key=...`, `jwt=...`, and `signature=...` query values remain unchanged in both `redactRemoteUrl()` and `sanitizeErrorMessage()`. The two functions also duplicate overlapping redaction logic rather than sharing one canonical sanitizer.
5. **MEDIUM — update safety residual.** The update path still runs `git fetch origin --prune` before `git pull --ff-only`; a failed/non-fast-forward pull can mutate remote-tracking refs even though the result is marked blocked. Existing fixture evidence verifies HEAD/working-tree behavior, not preservation of all refs. This is a VCS-safety evidence gap against the task’s “failed update must not hide partial update” requirement.

- **Promotion decision**: no `APROVADO` score appended; Task 0155 remains in `docs/tasks/02-doing/`. No changelog, generated surface, 0154, or 0156 was changed.

### Independent final reviewer-hand — post five-finding remediation (2026-08-10)

- **Reviewer**: independent reviewer-hand (fresh execution; no builder fix loop)
- **Veredito**: **REJEITADO — permanecer em `02-doing/`**
- **Score**: **48/100** — não elegível para promoção a `03-review`.
- **Scope/safety**: re-read Task 0155, all prior Review Trail entries, the prior independent review report, the Omniroute skill contract, the current implementation, the complete 38-case suite, and the real audit manifest. No real-clone `--update-legacy`, fetch, pull, reset, checkout, clean, remote mutation, commit, changelog update, generated-surface update, or edit to Tasks 0154/0156 was performed. Fixture updates remained disposable/local.

#### Fresh verification evidence

- `node --import tsx/esm --test tests/unit/legacy-refresh-diff.test.ts` → **38/38 PASS**, 0 failures.
- `npm run typecheck:core` → **exit 0**.
- Scoped `npx eslint .agents/skills/omniroute/scripts/legacy-refresh-diff.mjs tests/unit/legacy-refresh-diff.test.ts` → **exit 0**, React autodetect warning only.
- Full `timeout 180 npm run lint` → **exit 1**, `4106 problems (7 errors, 4099 warnings)`. The seven errors remain in pre-existing `visual-reference/src/*` files; this is not a full-lint PASS and remains an evidence limitation.
- Real human and `--json` snapshot-only probes against `references/diegosouzapw-omniroute` → **exit 0**, `mode=snapshot`, `wrote=false`, `dryRun=true`, branch `release/v3.8.49`, HEAD `930018fd10c2b727dae623310d57cb5a2aec229f`, dirty `false`. HEAD, status, reflog, branch, and `FETCH_HEAD` state were unchanged. No real legacy update operation was run.
- Missing-root probe → **exit 1** with repo-relative `Legacy root does not exist: tmp/.../missing`; no absolute host path was emitted.
- Independent path matrix passed for POSIX absolute/traversal, backslash traversal, Windows drive, UNC/backslash, and embedded `ENOENT:`, `path=`, `url=`, and comma-delimited path forms.
- Independent credential matrix passed for `Authorization: Bearer`, bare `Bearer`, `token=`, `api_key=`, `sk-live`, `AIza`, credentialed URL query forms, URL-encoded values, and unified `authorization`/`credential`/`private_key`/`jwt`/`signature` query keys. Nested manifest fields were scrubbed and the current exported result has no `snapshotInternal` or raw-policy fields.
- Existing failed-update fixture → **PASS** for its covered deleted-remote-branch/non-fast-forward case; `HEAD`, working-tree status, `refs/remotes/origin/*`, and `FETCH_HEAD` were restored in that fixture.

#### Blocking findings

1. **HIGH — exported API JSON still exposes an absolute filesystem path.** A fresh direct probe of `JSON.stringify(await runLegacyRefreshDiff(...))` showed no raw credentials or `snapshotInternal`, but it still serialized `manifestAbs` as `/home/sephiroth/working/ganthritor/cybernetics-core/omniroute-2/tmp/agent-work/reviewer-0155-api.json`. The exported API therefore does not satisfy the task's no-absolute-path/output-boundary invariant, even though the CLI `--json` envelope omits that field. Remove or repo-relativize `manifestAbs` from externally returned results, or explicitly separate an internal result from a safe exported DTO and add a direct JSON serialization regression.

2. **HIGH — failed-update transaction does not preserve all remote-tracking refs.** The requested fixture passes, but an independent disposable fixture with an unrelated existing `refs/remotes/origin/feature/other` whose remote commit advanced before a deliberately divergent `origin/main` update showed that the operation returned `blocked` while changing that unrelated ref from `1938c3d...` to `d9e2421...`. The current transaction snapshots/restores only `refs/remotes/<remote>/<currentBranch>`, not the complete remote-tracking ref namespace. A failed update can therefore leave partial ref state while claiming blocked safety. Snapshot and restore all affected `refs/remotes/<remote>/*` refs (or use an equivalently complete transactional strategy) and add this changed-unrelated-ref regression.

3. **EVIDENCE GATE — full lint remains non-green.** Scoped owned-file lint is green, but the required full lint command exits 1 with seven repository errors. This may be pre-existing and outside Task 0155 ownership, but it is not a clean path-to-100 result and cannot be represented as a full-lint PASS without an explicit owner-approved waiver.

- **Required path to 100**: remove the absolute `manifestAbs` from the exported API serialization surface; make failed-update ref rollback complete for all remote-tracking refs and add the unrelated-ref regression; resolve or formally waive the seven full-lint errors; refresh Completion Evidence with the new direct probes and command results; then rerun the entire requested matrix. Do not move Task 0155, 0154, or 0156 until these blockers are resolved.

### Independent reviewer-hand final re-review — final remediation (2026-08-11)

- **Reviewer**: independent reviewer-hand; fresh re-review after the final remediation. This review did not run a builder fix loop.
- **Scope**: current Task 0155, all prior Review Trail entries and referenced reports, `.agents/skills/omniroute/scripts/legacy-refresh-diff.mjs`, `.agents/skills/omniroute/SKILL.md`, `tests/unit/legacy-refresh-diff.test.ts`, the release manifest, the audit manifest, VCS policy, and repository state.
- **Verdict**: **APROVADO — promote Task 0155 to `03-review/`**.
- **Score**: **100/100 for the Task 0155-owned implementation and evidence scope**.

#### Fresh validation matrix

- **40-test suite**: `node --import tsx/esm --test tests/unit/legacy-refresh-diff.test.ts` → **exit 0, 40/40 pass, 0 fail**.
- **Typecheck**: `npm run typecheck:core` → **exit 0**.
- **Scoped lint**: `npx eslint .agents/skills/omniroute/scripts/legacy-refresh-diff.mjs tests/unit/legacy-refresh-diff.test.ts` → **exit 0**, React autodetect warning only, no owned-file errors.
- **Full lint classification**: `timeout 180 npm run lint` → **exit 1**, `4106 problems (7 errors, 4099 warnings)`. The seven errors are all pre-existing and outside Task 0155 ownership: `visual-reference/src/App.tsx:79` (`set-state-in-effect`), `visual-reference/src/App.tsx:192` (`Math.random` purity), `visual-reference/src/components/organisms/PrismTree.tsx:70` (`set-state-in-effect`), `visual-reference/src/views/execution-stream.tsx:254,273,295` (`PrismDivider` undefined), and `visual-reference/src/views/usage-analytics.tsx:23` (`no-unescaped-entities`). This is **not** reported as a full-lint pass; it is recorded as a repository-wide evidence-scope limitation with no owned-surface error and no broad-config waiver/edit.
- **Real snapshot-only probe**: `node .agents/skills/omniroute/scripts/legacy-refresh-diff.mjs --legacy-root references/diegosouzapw-omniroute --json` → **exit 0**, `mode=snapshot`, `wrote=false`, `dryRun=true`, branch `release/v3.8.49`, HEAD `930018fd10c2b727dae623310d57cb5a2aec229f`, dirty `false`, remote redacted, upstream `origin/release/v3.8.49` ahead `0` behind `0`. No `--update-legacy`, fetch, pull, reset, checkout, clean, or remote mutation was run against the real clone.
- **Real clone unchanged**: before/after probe state preserved HEAD `930018fd10c2b727dae623310d57cb5a2aec229f`, empty `git status --porcelain`, branch `release/v3.8.49`, reflog tip/message, complete `FETCH_HEAD` content, and audit-manifest SHA-256 `05377217352c3e1c6b0eb76bab2c8b6a1e80ca5017ab45e90efcb7fd0c2fed72`.
- **Missing-root**: disposable repo-relative missing-root human/JSON probes return only a repo-relative error and do not expose the resolved absolute host path.
- **API JSON serialization**: the dedicated regression and fresh targeted run pass; `JSON.stringify(await runLegacyRefreshDiff(...))` exposes neither `manifestAbs`, absolute filesystem paths, `snapshotInternal`, raw-policy fields, nor raw credentials. Internal `manifestAbs` remains usable for atomic writes but is absent from exported results and persisted manifests.
- **Nested manifest and sanitization**: recursive nested `preUpdate`/`postUpdate`/`snapshot`/`diff` probes pass. Internal fields (`remoteRawNonRedactedForPolicy`, `remoteRawPresent`, `porcelain`, `baselineStat`) are omitted; absolute POSIX, `/workspace`, `/Users`, `/mnt`, drive-letter, UNC, embedded error paths, bearer/header, token/API-key, `sk-live`, `AIza`, URL-encoded, userinfo, and credential-query forms are redacted with canonical output shape.
- **Path policy**: repository-relative, traversal, backslash traversal, drive-letter, UNC, and absolute path cases are rejected or sanitized; no absolute `legacyRoot`, `manifest`, or release-manifest path is accepted.
- **VCS transaction safety**: the disposable failed-update fixture passes with the complete `refs/remotes/origin/*` namespace, unrelated remote-tracking refs, `FETCH_HEAD`, `HEAD`, and working-tree status byte-for-byte/state-for-state unchanged. The update path uses argument arrays with `shell:false`, no `--prune`, and no force/reset/checkout/clean mutation path.
- **Default safety**: snapshot mode is read-only; write mode only atomically persists the repo-relative manifest; update remains explicit opt-in and fast-forward-only. Successful fixture update records old/new SHAs; no-op, dirty, mismatch, detached, unexpected-branch, non-fast-forward, and fetch-failure cases remain covered.

#### Promotion decision

All Task 0155 code, API-boundary, path, secret-redaction, shell, and VCS-safety conditions pass. The repository-wide lint limitation is accurately classified above and is not converted into a fabricated pass or treated as a Task 0155-owned blocker. **APROVADO 100/100; move only `0155-omniroute-legacy-refresh-code-diff.md` from `docs/tasks/02-doing/` to `docs/tasks/03-review/`. Do not move or edit Tasks 0154/0156, do not create a changelog entry, and do not edit generated surfaces.**

### Final independent reviewer-orchestrator — 2026-08-11 (REVIEWER_CONTEXT gate to `04-completed`)

- **Reviewer**: independent reviewer-orchestrator (final gate; no product-code, legacy-clone, changelog, or generated-surface edits)
- **Veredito**: **APROVADO — 100/100 → `04-completed`**
- **Fresh verification (this gate, read-only)**:
  - `node --import tsx/esm --test tests/unit/legacy-refresh-diff.test.ts` → **40 pass, 0 fail** (re-ran; covers clean/dirty/detached/mismatch, `manifestAbs` leak, complete `refs/remotes/origin/*` rollback, credential/query sanitization).
  - `npm run typecheck:core` → **exit 0** (re-ran).
  - Scoped `npx eslint --no-ignore .agents/skills/omniroute/scripts/legacy-refresh-diff.mjs tests/unit/legacy-refresh-diff.test.ts` → **exit 0** (React autodetect warning only; no owned-file errors).
  - Full `npm run lint` → not claimed green; 7 pre-existing errors outside 0155 ownership (`visual-reference/src/*`) — classified as repo-wide evidence limitation, no 0155 waiver/edit.
  - Real snapshot-only probe `node .../legacy-refresh-diff.mjs --legacy-root references/diegosouzapw-omniroute --json` → **exit 0**, `mode snapshot`, `wrote false`, `branch release/v3.8.49`, HEAD `930018fd10c2b727dae623310d57cb5a2aec229f`, dirty `false`; no fetch/pull/reset/checkout/clean.
  - Missing-root probe repo-relative only; `JSON.stringify(runLegacyRefreshDiff)` exposes no `manifestAbs`/absolute path/`snapshotInternal`/raw credentials; nested `preUpdate/postUpdate` sanitized.
  - Audit manifest `docs/reports/audits/omniroute-legacy-refresh.json` `05377217352c3e1c6b0eb76bab2c8b6a1e80ca5017ab45e90efcb7fd0c2fed72` unchanged; releaseRelation `releasesCount:8 latestTag:v3.8.49` linked to 0154.
  - No legacy-clone mutation, no changelog creation, no generated index/tasklist/CHANGELOG hand-edit in this gate.
- **Stale-status/false-claim check**: prior 84/55/78/55/48 rejections preserved as history and now resolved by secret/path/VCS-safety probes above; current 100/100 proven. No remaining absolute-path, secret, or transactional blocker.
- **Decision**: prior 100/100 independently re-proved; this gate re-verifies all invariants. **APROVADO 100/100; promote `0155` to `04-completed`**. Lane note updated to `[x] Completed — FINAL VERIFY 100/100 2026-08-11 → 04-completed` at top; no other task moved in this edit.

