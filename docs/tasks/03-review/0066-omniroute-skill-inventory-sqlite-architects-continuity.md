# Task 0066: OmniRoute Skill Inventory Refresh + SQLite Exception + Architects Continuity Bootstrap

> **Status**: `[x]` Implementation complete — **promoted to `03-review/`** (docs-accuracy S=100, 2026-07-19)
> **Priority**: 🟡 P1
> **Type**: `governance`
> **Origin**: EPIC-14 — OmniRoute Child Harness Localization (T14-C + continuity + exception)  
> Evidence: `docs/reports/audits/2026-07-19-harness-architect-meta-governance-audit.md` (F7, F13, F15),  
> `docs/reports/audits/2026-07-19-wave2-mechanical-harness-evidence.md` (H-HARNESS-16/17, architects ABSENT),  
> `docs/reports/audits/2026-07-19-wave2-ts-expert-auth-web-mcp-evidence.md` (MCP live count notes),  
> `docs/reports/audits/2026-07-19-architect-orchestrator-wave-synthesis.md` §3 harness P1s,  
> `docs/tasks/00-planning/0009-builder-wave-2026-07-18-review-loop-learnings.md` (U1/U2 pointer-only institutionalization)
> **Blocks**: Stale skill inventory mis-teaching operators; agents treating intentional SQLite as policy violation; architects lane continuity gap
> **Depends on**: none hard; **soft** after **0064** if linking from `docs/tasks/AGENTS.md`
> **Parallelism**: `parallel-safe` vs **0062/0063**; vs **0065** if this task avoids editing the same DoD overlay file (prefer skill/sqlite/memories paths only)
> **Review routing**: independent; bundle with 0065 only if shared AGENTS pointer PR

---

## Objective

Refresh child harness **truth surfaces** that misstate OmniRoute inventory or conflict with intentional product storage:

1. **`omniroute` skill inventory** — update strategy/tool/scope counts (and strategy allowlists) to match live sources (`ROUTING_STRATEGY_VALUES` length **18**; MCP tool/scope counts from live code/docs discipline — Wave 2 noted docs **94/30** vs live probes **93/31**; **measure then write**, never invent).
2. **SQLite intentional exception note** — document that OmniRoute’s primary DB is **better-sqlite3** by product design (`src/lib/db/core.ts`, root `AGENTS.md`); parent `sqlite-abolition-policy.md` must not force agents to “migrate away” without an explicit product epic. Update child exception note and/or `sqlite-abolition-exceptions.json` justification as appropriate.
3. **Architects continuity bootstrap instructions** — create `.memories/_by_lane/architects/` scaffold (index + bootstrap instructions) so onboard step for architects lane is satisfiable; do **not** invent fake session history.
4. **Optional U1/U2 pointers** — add short pointers from harness docs to 0009 learnings for IA matrix / frontend-quality OmniRoute project-specifics **as links only** (no full U1–U7 feature implementation).

## Background Context

### O que já existe:
- Skill pack: `.agents/skills/omniroute/SKILL.md` + generated subskills (`omni-combos-routing`, `omni-mcp`, `omni-auth`, `cli-providers`, …).
- Live strategies: `src/shared/constants/routingStrategies.ts` — **18** values including `fusion`, `conditional-fusion`, etc.
- MCP: `open-sse/mcp-server/server.ts` (`TOTAL_MCP_TOOL_COUNT`), scopes constants — **measure live**.
- SQLite stack: `package.json` `better-sqlite3`; `src/lib/db/*` domain modules; abolition policy + exceptions JSON under `.agents/rules/`.
- Continuity: `.memories/_by_lane/builders/`, `reviewers/` present; **architects/** ABSENT (mechanical).

### O que está faltando / quebrado:
| ID | Finding |
|----|---------|
| H-HARNESS-16 | Skill claims **14** strategies / **37** tools / **16** scopes — stale |
| H-HARNESS-17 | sqlite-abolition conflicts with intentional OmniRoute SQLite |
| architects lane | `.memories/_by_lane/architects` missing |
| cli-providers allowlist | Omits fusion-family / newer strategies in at least one troubleshooting list |

---

## Test Requirements

- DEVE atualizar skill text so strategy count equals `ROUTING_STRATEGY_VALUES.length` (verify with node or count array).
- DEVE atualizar MCP tool/scope claims only after grepping live sources; if docs vs code disagree, prefer **code measurement** and note residual doc drift (do not “fix” all product docs unless scoped).
- DEVE existir nota explícita de exceção SQLite legível por agents (rule overlay, exceptions JSON comment/entry, or child AGENTS pointer).
- DEVE existir `.memories/_by_lane/architects/` com bootstrap/index instructions (empty sessions OK).
- DEVE NÃO disable parent skills; only localize OmniRoute skill content + exception notes.
- DEVE NÃO implement product routing/MCP features.

---

## Exit Conditions (GDD/TDD)

- [x] `omni-combos-routing` / gateway skill no longer claim **14** strategies when live is **18**
- [x] Strategy lists that enumerate names include fusion-family strategies present in `ROUTING_STRATEGY_VALUES` (or point to the constant file as SSoT)
- [x] MCP tool/scope stale **37/16** claims refreshed to measured live values (or “see `TOTAL_MCP_TOOL_COUNT` / scope enum”)
- [x] SQLite intentional-exception note exists and is discoverable (path recorded in Evidence)
- [x] `.memories/_by_lane/architects/` exists with bootstrap instructions file
- [x] Optional: one-line U1/U2 pointer to `0009` learnings from an OmniRoute harness note (not full feature work)
- [x] `node -e` or equivalent count of `ROUTING_STRATEGY_VALUES` recorded as **18** in Completion Evidence
- [x] No cargo exits introduced
- [x] `npm run typecheck:core` passes (skill/md-only expected)
- [x] `CHANGELOG.md` TOP — governance: skill inventory + SQLite exception + architects lane bootstrap
- [x] Completion Evidence filled

---

## Details

### What

Subtasks:
- [x] **Ler existentes**: EPIC-14; harness F7/F13/F15; mechanical H-HARNESS-16/17; `routingStrategies.ts`; MCP server/scopes; full `omniroute/SKILL.md` + affected SUBSKILL.md files; `sqlite-abolition-policy.md` + `sqlite-abolition-exceptions.json`; `.memories/_by_lane/` layout; 0009 U1/U2 text
- [x] **Measure live counts**: strategies length; MCP tools (`TOTAL_MCP_TOOL_COUNT` or `getAllToolDefinitions().length`); scopes count — record commands/output in Evidence
- [x] **Patch omniroute skill**: gateway descriptions + subskills (`omni-combos-routing`, `omni-mcp`, `omni-auth`, `cli-providers` allowlist) to match measurement; prefer “see constant” over hardcoding if counts churn
- [x] **SQLite exception**: write child-facing note that better-sqlite3 is **canonical product storage** for OmniRoute; update exceptions JSON justification if that is the approved mechanism; do not plan silent PostgreSQL migration
- [x] **Architects continuity bootstrap**: create directory + `README` or `index` with how to append session closeouts (mirror builders/reviewers structure lightly)
- [x] **U1/U2 pointer only**: link 0009 checklist items to future frontend-quality/coding-execution project-specifics without implementing IA product work
- [x] **Refactoring pass**: avoid rewriting entire skill pack; inventory drift only
- [x] **Verificação**: `rg "14 strategies"` / `37 tools` in omniroute skill should be clean or justified

### Where

| Arquivo | Propósito |
|---------|-----------|
| `.agents/skills/omniroute/SKILL.md` | Modificar — gateway inventory strings |
| `.agents/skills/omniroute/generated-skills/omni-combos-routing/SUBSKILL.md` | Modificar — 14→18 / strategy truth |
| `.agents/skills/omniroute/generated-skills/omni-mcp/SUBSKILL.md` | Modificar — tool/scope truth |
| `.agents/skills/omniroute/generated-skills/omni-auth/SUBSKILL.md` | Modificar — strategy count refs |
| `.agents/skills/omniroute/generated-skills/cli-providers/SUBSKILL.md` | Modificar — strategy allowlist troubleshooting |
| `src/shared/constants/routingStrategies.ts` | Ler — SSoT strategies |
| `open-sse/mcp-server/server.ts` | Ler — tool count |
| `open-sse/mcp-server/` scopes/constants (as grepped) | Ler — scope count |
| `.agents/rules/sqlite-abolition-policy.md` | Ler — conflict context |
| `.agents/rules/sqlite-abolition-exceptions.json` | Modificar se mecanismo de exceção for este arquivo |
| `docs/tasks/AGENTS.md` or root `AGENTS.md` pointer | Modificar se necessário (soft after 0064) — SQLite exception discoverability |
| `.memories/_by_lane/architects/` | **Criar** — bootstrap |
| `docs/tasks/00-planning/0009-builder-wave-2026-07-18-review-loop-learnings.md` | Ler — U1/U2 |
| `docs/tasks/00-planning/EPIC-14-omniroute-child-harness-localization.md` | Ler — T14-C |
| `CHANGELOG.md` | Modificar — governance entry |

### How

1. Measure first (`rg` / `node --import tsx` count) — never paste AGENTS.md marketing counts without re-check (Wave 2 already saw 93 vs 94 drift).
2. Patch skill strings to measured values; for MCP prefer dynamic reference language if counts are catalog-derived.
3. Write SQLite exception as operator-visible governance: “OmniRoute is SQLite-first; abolition policy applies to other Ganthritor products / non-excepted paths.”
4. Bootstrap architects lane with instructions only (no fake continuity narratives).
5. Optional one-liner pointers for U1/U2 into a harness project-specifics stub path if file already exists; else note “follow-up” without scope creep.

### Why

Stale skill inventory is the same failure class as 0009 docs drift — agents teach wrong strategy sets and omit fusion. SQLite abolition without exception causes wrong migration epics. Missing architects continuity breaks onboard and Wave architect handoff.

---

## Parallelism / file ownership

| Class | Detail |
|-------|--------|
| **parallel-safe** | Yes vs 0062/0063; vs 0064/0065 if limited to skills + memories + sqlite exception files |
| **serializable** | Same-file skill SUBSKILL editors |
| **Collision note** | Do not fight 0065 over DoD overlay ownership — leave DoD to 0065 |

---

## ⛔ Anti-Hallucination Guardrails

> [!CAUTION]
> DO NOT invent strategy names not in `ROUTING_STRATEGY_VALUES`.
> DO NOT claim MCP tool count without measuring live catalog/server export.
> DO NOT invent historical architect sessions in continuity files.
> DO NOT abolish SQLite or start a PostgreSQL migration epic in this task.

> [!IMPORTANT]
> First subtask: read and measure. Doc Accuracy discipline applies to skill text the same as `docs/**`.
> Parent owns tasklist/agent-wiki generation — out of scope here.

---

## 🛡️ Compliance Checklist (Leis Primárias do AGENTS.md)

- [x] **Doc Accuracy**: Inventory claims grepped/measured
- [x] **Zod Validation**: N/A
- [x] **Security**: No secrets in continuity notes
- [x] **Error Sanitization**: N/A
- [x] **No Raw SQL**: N/A
- [x] **Archive Protocol**: No skill pack deletion

---

## 📋 Completion Evidence (preenchido pelo agente executor)

- **Arquivos criados/modificados**:
  - `.agents/skills/omniroute/SKILL.md` — gateway inventory 14→18 / 37→live TOTAL_MCP_TOOL_COUNT
  - `.agents/skills/omniroute/generated-skills/omni-combos-routing/SUBSKILL.md` — 18 strategies + fusion-family
  - `.agents/skills/omniroute/generated-skills/omni-mcp/SUBSKILL.md` — measure-first tool/scope truth
  - `.agents/skills/omniroute/generated-skills/omni-auth/SUBSKILL.md` — strategy + MCP count refs
  - `.agents/skills/omniroute/generated-skills/cli-providers/SUBSKILL.md` — strategy allowlist + fusion-family
  - `.agents/skills/omniroute/sub-skills/_omniroute-origin-README.md` — inventory strings
  - `.agents/skills/omniroute/dashboard-routes.md` — MCP section live-count discipline
  - `.agents/rules/sqlite-omniroute-product-exception.md` — **created** intentional product exception note
  - `.agents/rules/sqlite-abolition-policy.md` — OmniRoute product-exception cross-ref
  - `.agents/rules/sqlite-abolition-exceptions.json` — core.ts + package.json product justifications + metadata
  - `docs/tasks/AGENTS.md` — discoverable pointer to exception note
  - `.memories/_by_lane/architects/README.md` — **created** bootstrap instructions (dir already had continuity)
  - `.agents/skills/coding-execution-harness/project-specifics/index.md` — **created** U1 pointer
  - `.agents/skills/frontend-quality-harness/project-specifics/index.md` — U2 pointer
  - `CHANGELOG.md` — Unreleased TOP governance entry
- **Testes que verificam o trabalho**: count commands + `rg` before/after
- **Resultado dos testes**:
  ```
  # strategies
  ROUTING_STRATEGY_VALUES.length = 18
  priority,weighted,round-robin,context-relay,fill-first,p2c,random,least-used,
  cost-optimized,reset-aware,reset-window,headroom,strict-random,auto,lkgp,
  context-optimized,fusion,conditional-fusion

  # MCP (code measurement preferred over docs 94/30)
  getAllToolDefinitions().length = 93
  unique scopes from tool definitions = 31

  # stale skill claims
  rg "14 strateg|37 tool|16 scope" .agents/skills/omniroute/ → CLEAN
  ```
  Residual product-doc drift (out of skill scope): `AGENTS.md` / `docs/frameworks/MCP-SERVER.md` still market 94 tools / 30 scopes — noted in skill text; not bulk-fixed.
- **Resultado do lint**: N/A (markdown/governance only; no TS production logic)
- **Resultado do typecheck/build**: `npm run typecheck:core` → **PASS** (exit 0)
- **Entrada no changelog**: `CHANGELOG.md` `[Unreleased]` → **Changed** bullet Task 0066
- **Agente executor**: gt-ts-engineer / harness hygiene (parent agentID=`builders`)
- **Data de conclusão**: 2026-07-19
- **Lane note**: Left in `02-doing/` per parent instruction (do not move task).

---

## 🔍 Review Trail (preenchido pelo reviewer)

### Previous Reports
- `docs/reports/reviews/2026-07-19-task-0066.md` (builders docs-accuracy ACCEPT 100)

### Latest (independent FULL re-review, parent `reviewers`)
- **Reviewer**: independent FULL re-reviewer (parent agentID=`reviewers`)
- **Data da review**: 2026-07-19
- **Veredito**: **ACCEPTED_100**
- **Score (path to 100)**: **100**
- **Full report**: `docs/reports/reviews/2026-07-19-task-0066-skill-sqlite-architects-rereview.md`
- **Lane outcome**: remains in `03-review/` (parent promotes)
- **Notas**: Remeasured strategies **18**; MCP tools **93** / scopes **31**; skill 14/37/16 CLEAN; fusion-family on combos + cli-providers; SQLite product exception + JSON INTENTIONAL PRODUCT STORAGE for core.ts/package.json; architects README; U1/U2 pointers only. Product-doc 94/30 residual out of skill scope.
- **Se REJEITADO**: mover para `02-doing/` com motivo documentado no topo.

---

## Review Ledger

> [!IMPORTANT]
> Before path-to-100 work, read the latest full report and all reports listed under Previous Reports.

### Latest Review

- **Date**: 2026-07-19
- **Reviewer profile**: `reviewers`
- **Score**: `100/100`
- **Verdict**: `ACCEPTED_100`
- **Full report**: `docs/reports/reviews/2026-07-19-task-0066-skill-sqlite-architects-rereview.md`
- **Lane outcome**: remains in review
- **Task reference**: Task 0066 (`omniroute-skill-inventory-sqlite-architects-continuity`)

#### Current Open Blockers

- None in 0066 ownership.

#### Path-to-100 Summary

- Closed — inventory measured, not invented; regression guard: re-measure before changing skill counts; do not abolish SQLite without product epic; architects bootstrap stays instruction-only (no fake history).
