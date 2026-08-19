# Task 0183: Extract OmniRoute CLI Settings Route Helpers Without Hiding Tool Persistence

> **Status**: `[ ]` Open
> **Priority**: 🟢 P2
> **Type**: `housekeeping`
> **Origin**: Duplicate-block investigation from `.agents/user/gitingest/omniroute2/detect-sameblocks.mjs` and `sameblocs.csv`; task-architect evidence review
> **Blocks**: none
> **Depends on**: Existing `src/app/api/cli-tools/_lib/jsoncConfig.ts`, `src/lib/api/requireCliToolsAuth.ts`, `src/shared/services/backupService.ts`, and existing route-specific integration tests
> **Parallelism**: `serializable` — one executor owns the helper design and all listed route migrations; do not co-edit the listed route files with another CLI-settings refactor
> **Review routing**: independent TypeScript/security review; bundle with any concurrent CLI-tools auth or error-sanitization change

---

## Objective

Extract only the genuinely shared HTTP-route plumbing from the CLI settings route family into a small, typed helper surface under `src/app/api/cli-tools/_lib/`, while preserving every route URL, exported Next.js method, authentication behavior, validation schema, status code, response shape, backup timing, file path, serialization format, and tool-specific persistence rule.

The completed change MUST reduce repeated auth/body/error/guard/timestamp scaffolding without replacing the individual persistence implementations with a generic adapter that can silently overwrite user configuration. The helper boundary MUST make per-tool differences explicit and testable.

The initial implementation wave SHOULD cover the standard settings routes represented by the duplicate groups: Claude, Cline, Codex, Droid, Kilo, OpenClaw, Qwen, DeepSeek TUI, Forge, jcode, Pi, and Smelt. `backups` and `codex-profiles` are duplicate-family evidence but remain separate route domains; they may consume only helpers whose contracts are proven applicable. Hermes Agent is a separate role-selection contract and is not an automatic migration target.

## Background Context

### O que já existe:

- The detector is `.agents/user/gitingest/omniroute2/detect-sameblocks.mjs`; it scans `src.md`, `open-sse.md`, `bin.md`, and `scripts.md`, requires blocks of at least 500 characters, and emits `sameblocs.csv`.
- The CSV header is `bloco,arquivo,path,linha inicial,linha final`. Representative groups confirm repeated exact blocks across the live `src/app/api/cli-tools/*/route.ts` family:
  - `sameblocs.csv:8653-8657`, group `0775`: DeepSeek TUI, Forge, jcode, Pi, Smelt.
  - `sameblocs.csv:9637-9641`, group `0856`: the same five routes.
  - `sameblocs.csv:10383-10388`, group `0933`: DeepSeek TUI, Forge, jcode, OpenClaw, Pi, Smelt.
  - `sameblocs.csv:12661-12665`, group `1155`: DeepSeek TUI, Forge, jcode, Pi, Smelt.
  - `sameblocs.csv:12797-12802`, group `1169`: Claude, Cline, Codex, Droid, OpenClaw, Qwen.
  - `sameblocs.csv:13625-13634`, group `1265`: backups, Claude, Cline, Codex profiles (twice), Codex, Droid, Kilo, OpenClaw, Qwen.
  - `sameblocs.csv:14043-14049`, group `1316`, and `sameblocs.csv:14199-14205`, group `1353`: seven-route settings families.
- The live route family is 3,880 lines across the twelve `*-settings/route.ts` files plus `backups/route.ts` and `codex-profiles/route.ts` (`wc -l`, 2026-08-18 investigation). There is only one existing CLI route helper module, `src/app/api/cli-tools/_lib/jsoncConfig.ts`.
- `src/app/api/cli-tools/_lib/jsoncConfig.ts:25-51` already centralizes JSONC-tolerant reads. `tests/unit/cli-tools-settings-jsonc.test.ts:1-127` protects that contract for five routes.
- `src/lib/api/requireCliToolsAuth.ts:1-5` is a thin canonical wrapper around `requireManagementAuth`; every sampled settings route imports it and calls it at the start of each exported handler.
- `src/shared/services/backupService.ts:51-81` owns single-file backups and `:87-94` owns ordered multi-file backups. Routes already call `createBackup` or `createMultiBackup`; a new competing backup abstraction is not justified.
- The Next.js convention is named exports from `route.ts`: settings routes expose `GET`, `POST`, and `DELETE`; `backups` exposes `GET`/`POST`/`DELETE`; `codex-profiles` exposes `GET`/`POST`/`PUT`/`DELETE`. These exports and paths are public compatibility surfaces.

### O que está faltando / quebrado:

- Auth guard, invalid-JSON parsing, `ensureCliConfigWriteAllowed`, schema validation, key-id extraction/resolution, safe error response construction, backup calls, and last-configured bookkeeping are repeated in route bodies. For example, Claude `GET`/`POST`/`DELETE` begin at `src/app/api/cli-tools/claude-settings/route.ts:36`, `:80`, and `:199`; Cline at `:45`, `:102`, and `:204`; Codex at `:142`, `:185`, and `:333`.
- The same scaffold continues in Droid (`route.ts:43,92,209`), Kilo (`:38,114,229`), OpenClaw (`:35,81,185`), Qwen (`:71,115,288`), DeepSeek TUI (`:63,111,178`), Forge (`:64,112,179`), jcode (`:50,97,182`), Pi (`:50,97,182`), and Smelt (`:50,100,188`).
- Invalid JSON has at least two existing wire shapes: the detailed `{ error: { message: "Invalid request", details: [...] } }` used by Claude/Cline/Codex/Droid/OpenClaw/Qwen and the shorter `{ error: { message: "Invalid JSON body" } }` used by Forge/DeepSeek TUI/jcode/Pi/Smelt. A helper cannot silently normalize this without a compatibility decision and regression tests.
- Persistence is materially different: Claude merges `env` and normalizes its base URL (`claude-settings/route.ts:129-177`); Cline writes both `globalState.json` and `secrets.json` (`cline-settings/route.ts:136-195`); Codex parses TOML, migrates feature flags, writes TOML plus `auth.json`, and supports model mappings (`codex-settings/route.ts:28-139`, `:232-328`); Droid filters/builds multi-model custom entries (`droid-settings/route.ts:127-207`); Kilo writes auth and optionally VS Code settings (`kilo-settings/route.ts:146-218`); Qwen writes settings plus `.env` for three provider families (`qwen-settings/route.ts:151-285`).
- The simpler JSON/TOML routes are not interchangeable either: OpenClaw mutates nested agent/provider structures (`openclaw-settings/route.ts:117-174`), DeepSeek/Forge render full TOML, while jcode/Pi/Smelt merge JSON and mark managed fields (`jcode-settings/route.ts:97-179`, `pi-settings/route.ts:97-179`, `smelt-settings/route.ts:100-185`).
- Error sanitization is inconsistent. The existing reviewed security work explicitly listed CLI settings as a sample residual (`docs/tasks/03-review/0073-omniroute-residual-err-message-sanitize-sweep.md:76-99,153-179`), while the current routes mix `sanitizeErrorMessage`, typed API-key errors, and raw `error.message` responses. Any new error helper must be fail-safe and must not expose paths/stacks or change successful response contracts.

## Evidence-backed requirements and hypotheses

### Observed requirements

1. Every migrated handler MUST retain the first-line `requireCliToolsAuth` decision and return its `Response` unchanged when authentication fails.
2. Every mutating settings handler MUST retain `ensureCliConfigWriteAllowed()` before filesystem mutation and preserve 400/403/404/500 status semantics.
3. Validation MUST remain route-specific: `cliSettingsEnvSchema` for Claude, `cliModelConfigSchema` for the ordinary model routes, `cliMultiModelConfigSchema` for Droid, and the existing Codex-specific schema fields for Codex.
4. Existing key-id-before-Zod behavior is security-sensitive because Zod strips unknown fields; the helper may factor extraction, but it MUST not move extraction after validation or log secret values.
5. Backups MUST happen before the same mutations and for the same paths. Cline, Codex, Kilo, and Qwen multi-file behavior MUST not be collapsed into a single-path assumption.
6. GET response fields (`settings` vs `config`, `settingsPath` vs `configPath`, runtime metadata, `hasOmniRoute`) and route-specific messages MUST remain compatible with existing cards/tests.
7. No route may begin accepting a new HTTP method or body shape as a side effect of extraction.

### Inferred hypotheses — validate before implementation

- A `withCliToolsAuth(request, handler)` wrapper can remove repeated guard code if it preserves exact `Response | null` behavior and does not obscure Next.js named exports.
- A discriminated `parseJsonBody(request)` result can remove repeated `request.json()` catches, but it should support an explicit invalid-body response policy (`detailed` versus `simple`) rather than forcing one legacy shape.
- A `buildCliSettingsError(error, fallback, options)` helper can centralize sanitization while accepting the route's required status and response envelope. It must never return raw `Error.message` by default.
- A narrow `runCliSettingsMutation` helper may safely own guard → validation/key resolution → backup only if it takes explicit callbacks/paths and leaves all serialization and persistence callbacks in the route. A generic `applySettings(toolId, body)` abstraction is NOT supported by current evidence.
- `createBackup`/`createMultiBackup` are already the persistence-independent backup utilities. Adding a backup/restore helper in `_lib` is likely unnecessary; only a typed adapter for explicit path lists may be considered if it cannot alter ordering or missing-file behavior.

## Test Requirements

- Add focused unit tests for every new helper: auth success/failure passthrough, detailed and simple invalid-JSON envelopes, sanitized error output, write-guard rejection, and key-id extraction before schema validation.
- Add source-contract tests that enumerate every migrated route and assert its named exports, canonical auth helper usage, schema validator, and absence of duplicated unsafe raw error construction in the shared scaffold.
- Preserve and run the existing JSONC reader tests in `tests/unit/cli-tools-settings-jsonc.test.ts`.
- Extend or add targeted integration coverage for representative persistence classes: at minimum one plain JSON merge route (Smelt/Pi/jcode), one full TOML route (Forge/DeepSeek), one multi-file route (Cline/Qwen/Codex), and one structured route (Droid/OpenClaw/Kilo/Claude).
- Assert that existing route-specific response fields, normalized `/v1` behavior, Claude's no-forced-`/v1` behavior, Codex migrations, Droid multi-model filtering, Cline/Qwen multi-file writes, and backup ordering remain unchanged.
- Assert malformed JSON never returns an absolute path or stack frame and that API-key secret-unavailable errors retain their 400 behavior.
- Use only targeted Node tests such as `node --import tsx/esm --test tests/unit/<new-helper>.test.ts tests/unit/cli-tools-settings-jsonc.test.ts` and selected `tests/integration/cli-settings-*.test.ts`; do not run broad suites as part of this task's implementation.

## Exit Conditions (GDD/TDD)

- [ ] A typed `_lib` helper module is created only for proven shared HTTP plumbing; route-specific persistence remains in the owning route.
- [ ] All selected settings routes compile with unchanged public `GET`/`POST`/`DELETE` exports and no route path changes.
- [ ] Existing invalid-JSON response shapes are either preserved per route or an explicit compatibility migration is approved and covered by tests; no silent envelope change is allowed.
- [ ] Auth, write-guard, Zod validation, key-id resolution, backup ordering, file paths, serializers, and timestamp behavior are covered by targeted tests.
- [ ] No helper accepts arbitrary tool IDs or arbitrary filesystem paths without an explicit allowlisted/validated contract.
- [ ] `backups/route.ts` and `codex-profiles/route.ts` are either left unchanged with documented rationale or migrated only where their method/schema/path-traversal contracts remain exact.
- [ ] `node --import tsx/esm --test` targeted helper and representative route tests pass with real output recorded.
- [ ] `npm run typecheck:core` passes without new errors.
- [ ] `npm run lint` passes without new errors on touched files.
- [ ] Relevant security/source-guard tests pass, including `tests/unit/security/residual-sanitize-0073.test.ts` where its assertions cover touched routes.
- [ ] Executor records a `.changelog/<entry>.md` ledger entry through the supported changelog flow and rebuilds generated projections; no generated surface is hand-edited.

## Details

### What

Subtasks:

- [ ] **Ler código existente**: read every route in the Where table, `jsoncConfig.ts`, `requireCliToolsAuth.ts`, `backupService.ts`, validation schemas/helpers, API-key resolver, route security tests, and the representative integration tests before modifying code.
- [ ] Build a route contract matrix covering methods, schema, auth, invalid-JSON envelope, runtime status, settings/config response keys, files, formats, normalization, backup paths, and reset behavior.
- [ ] Write failing focused tests for the proposed helper contracts and for at least one route from each persistence class.
- [ ] Implement the smallest shared helper set; keep filesystem serialization and tool-specific mutations in route modules.
- [ ] Migrate routes incrementally and compare response/file behavior before and after each persistence class.
- [ ] **Refactoring pass**: remove only proven duplication; reject abstractions that hide per-tool persistence or make route contracts less obvious.
- [ ] **Verificação de regressão**: run targeted tests, typecheck, and lint; do not run broad suites.

### Where

| Arquivo | Propósito |
|---------|-----------|
| `.agents/user/gitingest/omniroute2/detect-sameblocks.mjs` | Ler — detector algorithm and thresholds; investigation evidence only |
| `.agents/user/gitingest/omniroute2/sameblocs.csv` | Ler — duplicate group/line evidence; do not regenerate in this task |
| `src/app/api/cli-tools/_lib/jsoncConfig.ts` | Ler/reuse — existing JSONC read contract; do not duplicate it |
| `src/lib/api/requireCliToolsAuth.ts` | Ler/reuse — canonical CLI management auth |
| `src/shared/services/backupService.ts` | Ler/reuse — `createBackup` / `createMultiBackup`; no competing backup store |
| `src/shared/validation/schemas.ts` | Ler — route schemas and compatibility constraints |
| `src/shared/validation/helpers.ts` | Ler/reuse — validation result contract |
| `src/shared/services/apiKeyResolver.ts` | Ler/reuse — hash-only/key-id behavior |
| `src/app/api/cli-tools/{claude,cline,codex,droid,kilo,openclaw,qwen,deepseek-tui,forge,jcode,pi,smelt}-settings/route.ts` | Ler/modify — standard settings routes; retain route-specific persistence |
| `src/app/api/cli-tools/backups/route.ts` | Ler — separate backup route; modify only with proven contract preservation |
| `src/app/api/cli-tools/codex-profiles/route.ts` | Ler — separate profile/path-boundary route; preserve safeProfilePath |
| `tests/unit/cli-tools-settings-jsonc.test.ts` | Ler/run — existing shared JSONC contract |
| `tests/unit/security/residual-sanitize-0073.test.ts` | Ler/run — prior residual sanitization contract |
| `tests/integration/cli-settings-{smelt,pi,jcode,forge,deepseek-tui}.test.ts` | Ler/run — existing representative route integration coverage |
| `tests/integration/security-hardening.test.ts` | Ler/run — route validation/auth source guards |
| `tests/unit/<new-cli-settings-helper>.test.ts` | Create — focused helper contract tests |

### How

1. Record the route matrix from live source, not from gitingest line numbers alone; gitingest line numbers are provenance evidence and may drift.
2. Define helpers around stable boundaries: auth passthrough, JSON parsing, sanitized error construction, and optional mutation preflight. Keep callback signatures explicit and typed.
3. Preserve legacy response envelopes with an explicit policy parameter where routes currently differ.
4. Migrate one route class at a time, beginning with the simple JSON merge family, then TOML, then multi-file/structured routes. Do not migrate Codex or Qwen by textual substitution.
5. For each route, verify before/after responses and temporary HOME/DATA_DIR filesystem fixtures, including absent files, malformed files, existing unrelated settings, and reset behavior.
6. Review the diff for accidental changes to paths, HTTP methods, auth ordering, secret handling, backup timing, and generated task/changelog surfaces.

### Why

The repeated blocks increase the cost of security and compatibility maintenance: a sanitization or invalid-body fix can drift across a dozen privileged routes, while a broad extraction could silently break tool-specific config formats. A narrow shared boundary reduces that drift without turning independent CLI persistence contracts into an unsafe generic writer. The work is P2 because the routes are functional and existing route-specific tests exist, but the duplication is confirmed and creates recurring maintenance/security risk.

---

## Parallelism / file ownership

| Class | Detail |
|-------|--------|
| **parallel-safe** | Documentation-only audits, unrelated provider work, and tests that do not edit the listed helper/routes may proceed concurrently. |
| **serializable** | This task must serialize with any change to `src/app/api/cli-tools/*-settings/route.ts`, `src/app/api/cli-tools/_lib/*`, route auth/error policy, or CLI settings integration tests. |
| **Collision** | The executor owns all listed settings routes, the new `_lib` helper files, and their targeted tests. Do not co-edit `requireCliToolsAuth.ts`, `backupService.ts`, validation schemas, or generated task/changelog indexes without explicit scope expansion. |

## ⛔ Anti-Hallucination Guardrails

> [!CAUTION]
> Do not claim the gitingest CSV is live source; use it only to locate duplicate families, then validate every contract against current `src/` files. Do not expose or print API keys, environment secrets, config contents containing secrets, or production ports. Do not run implementation or broad test suites under this architecture task.
>
> Do not replace all routes with a dynamic catch-all route, do not change HTTP methods, and do not use a generic tool-id-to-path map unless it is allowlisted and independently validated. Never move key-id extraction after Zod validation. Never remove `safeProfilePath` or weaken backup ordering.
>
> PORT 21000 is production — never restart, mutate, or remove its containers.

> [!IMPORTANT]
> Read every file in the Where table before implementation. Treat route response envelopes and temporary-home filesystem behavior as compatibility contracts. A helper is justified only when its contract is narrower than the behavior it replaces. Preserve `readJsoncConfig` as the single JSONC reader and `backupService` as the backup owner.

## 🛡️ Compliance Checklist (Leis Primárias do AGENTS.md)

- [ ] **Doc Accuracy**: all route paths, methods, schemas, helper names, and line anchors revalidated against live source before implementation.
- [ ] **Zod Validation**: all new or changed external bodies continue through existing Zod schemas/helpers.
- [ ] **Security**: no secrets committed or logged; key-id and API-key resolver semantics preserved.
- [ ] **Error Sanitization**: new shared error construction sanitizes client-facing errors and preserves safe legacy envelopes.
- [ ] **No Raw SQL**: no database code is introduced by this task.
- [ ] **Archive Protocol**: no files are deleted; superseded helpers/routes are moved only if an explicit archive decision exists.

## 📋 Completion Evidence (preenchido pelo agente executor)

- **Arquivos criados/modificados**: [lista real de paths; include helper/tests; no generated surfaces]
- **Testes que verificam o trabalho**: [exact test names + paths]
- **Resultado dos testes**: [real PASS/FAIL output and counts]
- **Resultado do lint**: [real PASS/FAIL output]
- **Resultado do typecheck/build**: [real PASS/FAIL output]
- **Entrada no changelog**: [`.changelog/<entry>.md` + rebuild output; do not hand-edit generated roots]
- **Agente executor**: [name/role]
- **Data de conclusão**: [YYYY-MM-DD]

## 🔍 Review Trail (preenchido pelo reviewer)

- **Reviewer**: [name/role]
- **Data da review**: [YYYY-MM-DD]
- **Veredito**: [APROVADO / REJEITADO]
- **Score (path to 100)**: [0-100]
- **Notas**: [evidence-based notes citing files/lines]
- **Se REJEITADO**: move to `02-doing/` with reason documented at top.
