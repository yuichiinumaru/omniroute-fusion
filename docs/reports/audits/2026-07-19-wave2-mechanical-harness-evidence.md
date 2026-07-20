# Wave 2 Mechanical Harness Evidence

**Role**: gt-mechanical-investigator  
**Date**: 2026-07-19  
**Repo**: `/home/sephiroth/working/ganthritor/omniroute-2`  
**Mode**: Read-only existence / negative evidence (no architecture decisions)

---

## Mechanical Investigation Packet

### Scope

- **Question**: Confirm H-HARNESS-01/02/03/04/07/08/09/16/17 + `.memories/_by_lane/architects` on disk
- **Allowed paths**: `.agents/`, `docs/tasks/`, `docs/`, `.memories/`, `src/shared/constants/`, `open-sse/mcp-server/`, `package.json`, `AGENTS.md`, `CHANGELOG.md`, root listing
- **Forbidden**: mutations outside this report; parent-only judgment

### Files / Sections Read

| Path | Result |
|------|--------|
| `.agents/rules/definition-of-done.md` | Present; cargo/Surreal DoD |
| `.agents/workflows/gt-create-tasks.md` | Present; cargo exit defaults |
| `.agents/rules/sqlite-abolition-policy.md` | Present; SQLite prohibited |
| `.agents/rules/sqlite-abolition-exceptions.json` | Present; OmniRoute backup exceptions |
| `.agents/skills/omniroute/SKILL.md` | Present; gateway indexes stale counts |
| `.agents/skills/omniroute/generated-skills/omni-combos-routing/SUBSKILL.md` | Present; "14 strategies" |
| `.agents/skills/omniroute/generated-skills/omni-mcp/SUBSKILL.md` | Present; "37 tools…16…scopes" |
| `.agents/skills/omniroute/generated-skills/omni-auth/SUBSKILL.md` | Present; "14 strategies" |
| `.agents/skills/omniroute/generated-skills/cli-providers/SUBSKILL.md` | Present; strategy list incomplete |
| `src/shared/constants/routingStrategies.ts` | Present; `ROUTING_STRATEGY_VALUES` length **18** |
| `open-sse/mcp-server/server.ts` L114–122 | `TOTAL_MCP_TOOL_COUNT = getAllToolDefinitions().length` |
| `open-sse/mcp-server/toolSearch/catalog.ts` L68–98 | Deduped multi-module catalog |
| `src/lib/db/core.ts` | better-sqlite3 intentional runtime |
| `package.json` | dep `better-sqlite3` |
| `AGENTS.md` L23–28, L63 | Live counts + SQLite as stack DB |
| `CHANGELOG.md` | Product changelog at root (present) |
| `docs/tasks/` | Lanes 00–04 present; no AGENTS/template/tasklist at live paths |
| `docs/tasks/.archive/000-template-moved-to-parent.md` | Archived OmniRoute template (npm DoD) |
| `.memories/_by_lane/` | `builders/`, `reviewers/` only |
| `.changelog/` | **ABSENT** |
| `pm_lens/` | **ABSENT** |
| `docs/tasks/AGENTS.md` | **ABSENT** |
| `docs/tasks/000-template.md` | **ABSENT** |
| `docs/tasks/tasklist.md` | **ABSENT** |
| `docs/tasklist.md` | **ABSENT** |
| `docs/changelog` | **ABSENT** (symlink claimed by DoD) |
| `.memories/_by_lane/architects/` | **ABSENT** |

---

### Findings

| Hypothesis | Verdict | Evidence Path/Line | Confidence | Notes |
|------------|---------|-------------------|------------|-------|
| **H-HARNESS-01** DoD content is cargo/Surreal | **CONFIRMED** | `.agents/rules/definition-of-done.md` L12–16, L33–35, L42 | High | Cargo check/test + SurrealDB bind rule; no npm/typecheck DoD |
| **H-HARNESS-02** `docs/tasks/AGENTS.md` missing | **CONFIRMED** | read failed; not in `docs/tasks/` listing | High | create-tasks pre-req L14 requires it |
| **H-HARNESS-03** `docs/tasks/000-template.md` missing | **CONFIRMED** | live path absent; archive at `docs/tasks/.archive/000-template-moved-to-parent.md` | High | DoD §5 L42 + create-tasks L9/L15 require live path |
| **H-HARNESS-04** `gt-create-tasks.md` cargo defaults | **CONFIRMED** | `.agents/workflows/gt-create-tasks.md` L41 | High | Exit Conditions list includes `cargo check`, `cargo test` |
| **H-HARNESS-07** `docs/tasks/tasklist.md` missing | **CONFIRMED** | `docs/tasks/tasklist.md` and `docs/tasklist.md` both absent | High | create-tasks L29/L65 reference `docs/tasklist.md` |
| **H-HARNESS-08** `pm_lens` directory/scripts present | **FALSE** (absent) | no `pm_lens/` at repo root; only audit mentions | High | Hypothesis as “present?” → **NO** |
| **H-HARNESS-09** `.changelog/` present? product CHANGELOG only? | **CONFIRMED** (no `.changelog/`; product `CHANGELOG.md` only) | `.changelog/` absent; `CHANGELOG.md` root present; DoD L29–35 requires `.changelog/` | High | DoD/manage-changelog path non-functional here |
| **H-HARNESS-16** omniroute skill stale counts vs live constants | **CONFIRMED** | skill: 14 strategies / 37 tools / 16 scopes; live: **18** strategies; MCP count dynamic/deduped catalog (docs claim 94) | High | See quotes below |
| **H-HARNESS-17** sqlite-abolition vs intentional OmniRoute SQLite | **CONFIRMED** (policy conflict) | abolition L12/L24 vs `AGENTS.md` L63 + `src/lib/db/core.ts` + `package.json` better-sqlite3 | High | Policy still names OmniRoute “Primary migration target” while product is SQLite-first |
| **architects lane** `.memories/_by_lane/architects` | **ABSENT** | `.memories/_by_lane/` has only `builders/`, `reviewers/` | High | DoD L36 references `_by_lane/<lane>/` |

---

### Exact Quotes (mechanical)

#### H-HARNESS-01 — DoD cargo/Surreal

```12:16:.agents/rules/definition-of-done.md
- [ ] `cargo check` passa sem erros nem warnings novos
- [ ] `cargo test` (filtrado pelo padrão relevante) passa com 0 falhas
- [ ] Nenhum `todo!()`, `unimplemented!()`, ou `panic!("not implemented")` no código novo/modificado
- [ ] Nenhuma função/método com corpo vazio (`{}` ou `{ Default::default() }`) no código novo
- [ ] Nenhum `format!()` usado para interpolar variáveis de usuário em queries SurrealDB (usar `.bind()`)
```

```29:35:.agents/rules/definition-of-done.md
- [ ] Entrada de changelog publicada via manage-changelog engine no ledger **`.changelog/`** (não editar `CHANGELOG.md` nem o symlink `docs/changelog` à mão; `docs/changelog` → `../.changelog` é compat surface apenas)
...
  - Resultado do `cargo check` (PASS)
  - Resultado do `cargo test` (PASS + contagem)
  - Referência à entrada em `.changelog/` / rebuild do `CHANGELOG.md` gerado
```

```40:43:.agents/rules/definition-of-done.md
### 5. Task Spec Compliance
- [ ] A task tem ≥ 50 linhas
- [ ] A task segue o template `docs/tasks/000-template.md`
- [ ] A primeira subtask era "Ler código existente" (e foi feita)
```

#### H-HARNESS-02 / 03 / 07 — Missing task governance surfaces

| Path | On disk |
|------|---------|
| `docs/tasks/AGENTS.md` | **NO** |
| `docs/tasks/000-template.md` | **NO** |
| `docs/tasks/.archive/000-template-moved-to-parent.md` | **YES** (OmniRoute-localized archive) |
| `docs/tasks/tasklist.md` | **NO** |
| `docs/tasklist.md` | **NO** |

Archive template header (not live path):

```1:7:docs/tasks/.archive/000-template-moved-to-parent.md
# Task Template — OmniRoute
> **OBRIGATÓRIO**: Todo documento de task DEVE usar este template. ...
> **Mínimo**: 50 linhas. ...
```

Archive exit conditions use **npm**, not cargo (contrast with live DoD):

```62:64:docs/tasks/.archive/000-template-moved-to-parent.md
- [ ] `npm run typecheck:core` passa sem erros
- [ ] `npm run lint` passa sem erros novos
- [ ] `npm run test:all` passa com 0 falhas ...
```

#### H-HARNESS-04 — create-tasks cargo defaults

```14:16:.agents/workflows/gt-create-tasks.md
- The agent must have read `docs/tasks/AGENTS.md`.
- The agent must have the `000-template.md` as the target structure.
- **MUST** verify template exists BEFORE creating any task.
```

```29:29:.agents/workflows/gt-create-tasks.md
Analyze the `docs/tasklist.md` and the existing `docs/tasks/01-open/` ...
```

```41:41:.agents/workflows/gt-create-tasks.md
    - Exit Conditions (Binary, including `cargo check`, `cargo test`, `CHANGELOG.md`)
```

```64:65:.agents/workflows/gt-create-tasks.md
- Move the original draft to `.archive/planning/` (if it was a specific draft file).
- Update the `docs/tasklist.md` (only if explicitly instructed, otherwise the task stands alone in `01-open/`).
```

#### H-HARNESS-08 — pm_lens

- **NO** directory `pm_lens/` at repo root.
- Mentions only in prior audit docs under `docs/reports/audits/` (not a runnable tree).

#### H-HARNESS-09 — changelog surfaces

| Path | On disk |
|------|---------|
| `.changelog/` | **NO** |
| `docs/changelog` (symlink claimed by DoD) | **NO** |
| `CHANGELOG.md` (product) | **YES** |

#### H-HARNESS-16 — skill stale counts vs live

**Skill claims (stale):**

```41:41:.agents/skills/omniroute/SKILL.md
  - omni-combos-routing: "Create and manage routing combos with 14 strategies ..."
```

```47:47:.agents/skills/omniroute/SKILL.md
  - omni-mcp: "'Connect to the OmniRoute MCP server (37 tools, 3 transports: ... 16 permission scopes."
```

```2:3:.agents/skills/omniroute/generated-skills/omni-combos-routing/SUBSKILL.md
name: omni-combos-routing
description: Create and manage routing combos with 14 strategies ...
```

```2:3:.agents/skills/omniroute/generated-skills/omni-mcp/SUBSKILL.md
name: omni-mcp
description: "Connect to the OmniRoute MCP server (37 tools, 3 transports: SSE/stdio/HTTP). ... across 16 permission scopes."
```

```111:111:.agents/skills/omniroute/generated-skills/omni-auth/SUBSKILL.md
- **Auto-fallback** combos (14 strategies): never stop coding even if a provider rate-limits
```

cli-providers strategy allowlist omits `fusion`, `conditional-fusion`, `reset-window`, `headroom` (14 names listed):

```331:331:.agents/skills/omniroute/generated-skills/cli-providers/SUBSKILL.md
- `combo create` fails with `strategy unknown` → use one of: `priority`, `weighted`, `round-robin`, `fill-first`, `least-used`, `cost-optimized`, `auto`, `random`, `strict-random`, `p2c`, `reset-aware`, `lkgp`, `context-optimized`, `context-relay`
```

**Live strategy source (`ROUTING_STRATEGY_VALUES` length = 18):**

```1:20:src/shared/constants/routingStrategies.ts
export const ROUTING_STRATEGY_VALUES = [
  "priority",
  "weighted",
  "round-robin",
  "context-relay",
  "fill-first",
  "p2c",
  "random",
  "least-used",
  "cost-optimized",
  "reset-aware",
  "reset-window",
  "headroom",
  "strict-random",
  "auto",
  "lkgp",
  "context-optimized",
  "fusion",
  "conditional-fusion",
] as const;
```

**Live MCP count export:**

```114:122:open-sse/mcp-server/server.ts
/**
 * Live MCP tool inventory count used by heartbeat / diagnostics.
 *
 * Must equal unique registered tools (`MCP_TOOL_COUNT` / `getAllToolDefinitions`).
 ...
 */
export const TOTAL_MCP_TOOL_COUNT = getAllToolDefinitions().length;
```

**Product docs claim (not skill; for delta):**

```23:28:AGENTS.md
with **MCP Server** (94 tools), ...
> **Live counts (v3.8.40)**: providers 236 · MCP tools 94 · MCP scopes 30 · ... routing strategies 18 ...
```

| Metric | omniroute skill | Live source |
|--------|-----------------|-------------|
| Routing strategies | **14** | **18** (`ROUTING_STRATEGY_VALUES`) |
| MCP tools | **37** | `TOTAL_MCP_TOOL_COUNT` = deduped `getAllToolDefinitions().length`; product docs **94** |
| MCP scopes | **16** | product docs **30** (not re-counted in this pass) |

#### H-HARNESS-17 — SQLite abolition vs intentional SQLite

**Policy (prohibits runtime SQLite; OmniRoute is migration target):**

```12:12:.agents/rules/sqlite-abolition-policy.md
**Runtime SQLite usage is prohibited across all Ganthritor-family projects.**
```

```23:24:.agents/rules/sqlite-abolition-policy.md
Projects covered:
- **OmniRoute** — Primary migration target (tasks 0636-0642)
```

**Product intentional SQLite:**

```63:63:AGENTS.md
- **Database**: better-sqlite3 (SQLite) — `DATA_DIR` configurable, default `~/.omniroute/`
```

```286:286:package.json
    "better-sqlite3": "^12.10.0",
```

```930:936:src/lib/db/core.ts
export function getDbInstance(): SqliteDatabase {
...
      console.log("[DB] Build phase detected — using in-memory SQLite (read-only)");
```

**Exceptions file** still treats OmniRoute `.sqlite` backups as migration residue under abolition scanner (`sqlite-abolition-exceptions.json` L24–75), not as approved permanent runtime stack.

#### Architects lane

| Path | On disk |
|------|---------|
| `.memories/_by_lane/builders/` | YES |
| `.memories/_by_lane/reviewers/` | YES |
| `.memories/_by_lane/architects/` | **NO** |

---

### Negative Evidence

- No `docs/tasks/AGENTS.md` under any `docs/tasks/**` path (grep refs exist only in audits/workflows).
- No live `docs/tasks/000-template.md`; only `.archive/000-template-moved-to-parent.md`.
- No `docs/tasks/tasklist.md` or `docs/tasklist.md`.
- No `.changelog/` directory; no `docs/changelog` symlink.
- No `pm_lens/` package/scripts/index at workspace root.
- No `.memories/_by_lane/architects/`.
- DoD has **zero** `npm run` / typecheck references (grep cargo/Surreal only).
- Skill strategy inventory does **not** include `fusion` or `conditional-fusion` despite live array entries.

---

### Extra Missing Governance Files Discovered

| Path | Expected by | Status |
|------|-------------|--------|
| `docs/tasks/AGENTS.md` | onboard / create-tasks | Missing |
| `docs/tasks/000-template.md` | DoD §5 / create-tasks | Missing (archive only) |
| `docs/tasklist.md` | create-tasks L29/L65 | Missing |
| `docs/tasks/tasklist.md` | epic/audit refs | Missing |
| `.changelog/` | DoD L29 | Missing |
| `docs/changelog` → `../.changelog` | DoD L29 | Missing |
| `pm_lens/` | PM skill / prior harness audit | Missing |
| `.memories/_by_lane/architects/` | DoD lane closeout pattern | Missing |
| `.archive/planning/` | create-tasks L64 promote path | Not verified as required empty; create-tasks assumes it for draft moves |

---

### Parent Decision Points

| Item | Status |
|------|--------|
| All listed H-HARNESS existence checks | **Confirmed on disk** (01–04,07,09,16,17 = CONFIRMED gaps/cargo-cult; 08 = tools absent) |
| Whether to localize DoD/create-tasks to npm or keep Khala cargo | **Needs judgment** (parent) |
| Whether OmniRoute SQLite is permanent exception to abolition | **Needs judgment** (policy vs product stack conflict) |
| Whether to restore live template from archive | **Needs judgment** (file exists only under `.archive/`) |
| Live numeric probe of `TOTAL_MCP_TOOL_COUNT` via node import | **Not executed** (mechanical file-read only; export is dynamic) |
| Blocked | None for mechanical confirmation |

---

### Summary Table (yes/no + path)

| ID | Question | Yes/No | Path |
|----|----------|--------|------|
| H-01 | DoD is cargo/Surreal? | **YES** | `.agents/rules/definition-of-done.md` |
| H-02 | `docs/tasks/AGENTS.md` missing? | **YES** | — |
| H-03 | `000-template.md` missing? | **YES** (archive: `docs/tasks/.archive/000-template-moved-to-parent.md`) | |
| H-04 | create-tasks cargo defaults? | **YES** | `.agents/workflows/gt-create-tasks.md` L41 |
| H-07 | `tasklist.md` missing? | **YES** | both `docs/tasks/tasklist.md` and `docs/tasklist.md` |
| H-08 | `pm_lens` present? | **NO** | — |
| H-09 | `.changelog/` present? | **NO**; product only `CHANGELOG.md` | root |
| H-16 | skill stale vs 18 strategies / MCP catalog? | **YES** | skill 14/37/16 vs live 18 + dynamic TOTAL |
| H-17 | abolition vs intentional SQLite? | **YES** (conflict) | policy vs `src/lib/db` + better-sqlite3 |
| architects lane | exists? | **NO** | `.memories/_by_lane/` has builders/reviewers only |
