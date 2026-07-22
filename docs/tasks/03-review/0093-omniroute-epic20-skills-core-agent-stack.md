# Task 0093: EPIC-20 T20-H — Skills Stack (Core Skills → Agent Skills) + Rename

> **Status**: `[x]` Review ready (S=100)
> **Priority**: 🔴 P0
> **Type**: `feature` + `remediation`
> **Action type**: UX_VIS + HARDEN
> **Origin**: EPIC-20 §2 locked topbar #6 `skills`; Omni Skills rename → **Core Skills**; §3 fusion; §5 path matrix; AGENTS.md Hard Rules #22–#23
> **Blocks**: soft-helps T20-O chrome matrix
> **Depends on**: **0086** hard (SSoT); **0087** hard (Ops shell). **Do not start until 0086 completed**, or same wave with freeze (0086 first).
> **Parallelism**: `parallel-safe` vs **0091–0092, 0094–0095**; **serializable** after **0086/0087**
> **Review routing**: independent Skills stack PR

---

## Objective

Fuse **Omni Skills** (rename UI to **Core Skills**) and **Agent Skills** into **one** Operations topbar peer **Skills** as a vertical collapsible stack.

**Surfaces (locked):**

| Block (vertical order) | Legacy | UI label |
|------------------------|--------|----------|
| 1. Omni / inbound sandbox skills | `/dashboard/omni-skills` | **Core Skills** (rename from “Omni Skills”) |
| 2. Agent / outbound SKILL.md | `/dashboard/agent-skills` | **Agent Skills** (keep product name) |

| Role | Path |
|------|------|
| Canonical | `/operations/skills` (0086) |
| Legacy redirects | `/dashboard/omni-skills`, `/dashboard/agent-skills` → canonical |

**Done when:**

1. One Skills peer page: **Core Skills** collapsible → **Agent Skills** collapsible.
2. User-visible strings **Omni Skills** → **Core Skills** on this surface (hub label, page titles, i18n keys used by the page — not necessarily every historical doc string outside Ops, but Ops UI + 0086 topbar label must say Core Skills for the first block).
3. Explainers / concept chrome → bottom, collapsible, default collapsed.
4. No dual page topbars; only Ops hub peer `skills`.
5. Legacy two URLs redirect via 0086.
6. Clients re-homed (`OmniSkillsPageClient`, `AgentSkillsPageClient`) — not deleted.
7. Tests: order, rename string presence, redirects, anti-phantom, no-new-leaf.

**Out of this task:** A2A stack, Integrations plugins marketplace features, Memory, inventing new skill runtime.

---

## Background Context

### O que já existe:

- Omni Skills: `src/app/(dashboard)/dashboard/omni-skills/` (`OmniSkillsPageClient.tsx`, components).
- Agent Skills: `src/app/(dashboard)/dashboard/agent-skills/` (`AgentSkillsPageClient.tsx`, SkillCard, McpA2aLinksBar, etc.).
- Hub cards: `operationsHub.ts` — `omni-skills` label “Omni Skills”, `agent-skills` label “Agent Skills”.
- Product docs: `docs/frameworks/SKILLS.md` (update only if UI.md/EPIC requires ops naming sync — prefer minimal i18n + hub label; full docs pass may be residual).
- Collapsible primitive available.

### O que está faltando / quebrado:

- Two separate destinations for “skills” mental model.
- “Omni Skills” naming collides with product branding vs **Core Skills** disambiguation (EPIC-20: inbound sandbox = Core Skills).
- No `/operations/skills` peer.

### Explicitly out of scope:

- Skill sandbox executor backend changes.
- MCP tool skill modules rename.
- Agent Skills export format changes.
- Testing hub plugins (Integrations **0094**).

### Collision notes:

- **0094 Integrations**: Plugins stay out of Skills.
- **AgentSkills `McpA2aLinksBar`**: may deep-link MCP/A2A — do not invent multi-topbar; links may retarget 0086 paths if already frozen, else leave and note residual.

---

## Dependency & Parallel Safety

| Item | Value |
|------|--------|
| **Depends on** | **0086** hard · **0087** hard |
| **File ownership (exclusive)** | Skills fusion page; redirect shells `omni-skills`, `agent-skills`; i18n strings for Core Skills rename on this surface; tests `tests/unit/ui/epic20-skills-stack-0093.test.ts` |
| **Do not touch** | webhooks, plugins, memory, cloud-agents, a2a fusion trees |
| **parallel-safe** | Yes vs 0091–0092, 0094–0095 |
| **serializable** | After 0086/0087 |

---

## Test Requirements

- DEVE montar stack Core Skills → Agent Skills com collapsibles e `data-section` markers
- DEVE exibir label **Core Skills** (not “Omni Skills”) on the fused page primary section title / Ops-facing chrome
- DEVE redirecionar `/dashboard/omni-skills` e `/dashboard/agent-skills` → 0086 `skills` builder
- DEVE preservar functional client mounts (no empty sections)
- DEVE explainers bottom default collapsed
- DEVE ≤1 Ops hub topbar; no-new-leaf (`skills` not a primary sidebar leaf)
- NÃO DEVE adicionar third skills product page without epic approval
- NÃO DEVE inventar topbar id outside 0086 (`skills` only)

---

## Exit Conditions (GDD/TDD)

> npm matrix only — no cargo.

- [x] Skills peer page stack Core Skills → Agent Skills collapsibles
- [x] Rename Omni Skills → Core Skills visible on Ops Skills surface
- [x] Legacy omni-skills + agent-skills redirect to canonical
- [x] Explainers bottom collapsed by default
- [x] Anti-phantom ≤1 Ops topbar
- [x] Unit tests pass:
      `node --import tsx/esm --test tests/unit/ui/epic20-skills-stack-0093.test.ts`
- [x] `npm run typecheck:core` passa sem erros
- [x] `npm run lint` passa sem erros novos nos arquivos tocados
- [x] Entrada no TOPO de `CHANGELOG.md` under `[Unreleased]`
- [x] Completion Evidence filled

---

## Details

### What

Subtasks:

- [x] **Ler código existente**: EPIC-20; 0086/0087; omni-skills + agent-skills trees; operationsHub skill rows; i18n namespaces for skills; Collapsible; UI.md
- [x] Confirm 0086 `skills` builder + two redirect rows
- [x] Compose fused page with two Collapsibles; rename visible Omni → Core
- [x] Redirect shells on legacy pages
- [x] Bottom explainers collapsed
- [x] TDD rename + order + redirects + anti-phantom
- [x] **Refactoring pass**: composition only
- [x] **Verificação de regressão**: tests + typecheck:core + lint

### Where

| Arquivo | Propósito |
|---------|-----------|
| EPIC-20 | Ler |
| 0086 SSoT / 0087 shell | Ler |
| `src/app/(dashboard)/dashboard/omni-skills/**` | Ler + redirect shell; keep client |
| `src/app/(dashboard)/dashboard/agent-skills/**` | Ler + redirect shell; keep client |
| Canonical `operations/.../skills` | Criar |
| i18n messages touching Omni Skills labels (locale files as grepped) | Modificar — Core Skills rename on surface |
| `src/shared/constants/operationsHub.ts` | Only if 0086 deferred hub retarget to this task |
| `tests/unit/ui/epic20-skills-stack-0093.test.ts` | Criar |
| Root `CHANGELOG.md` | Unreleased |

### How

1. Gate on 0086.
2. Import both page clients into stacked Collapsibles.
3. Section titles: Core Skills, Agent Skills.
4. Update i18n display strings used by Ops Skills chrome (en at minimum; follow project i18n policy for other locales if required by existing gates).
5. Redirect legacy routes.
6. Tests.

### Why

Inbound sandbox skills vs outbound agent skills are related but were split into two launchpad cards. One Skills peer + Core Skills naming matches EPIC-20 disambiguation (Core vs future Meta/CC layers).

---

## Parallelism / file ownership

| Class | Detail |
|-------|--------|
| **parallel-safe** | 0091, 0092, 0094, 0095 |
| **serializable** | After 0086 + 0087 |
| **Collision** | i18n keys if another task renames “Omni” globally — this task owns skills UI rename only |

---

## ⛔ Anti-Hallucination Guardrails

> [!CAUTION]
> DO NOT rename Agent Skills to Core Skills.  
> DO NOT delete skill client trees.  
> DO NOT start without 0086.  
> DO NOT add primary sidebar leaf for skills.  
> PORT 21000 = production.

> [!IMPORTANT]
> Hard Rule #22 single Ops topbar peer `skills`.  
> Doc accuracy: only claim renames grepped in code you change.

---

## 🛡️ Compliance Checklist (Leis Primárias do AGENTS.md)

- [x] **Doc Accuracy**: Labels/paths grepped
- [x] **Zod Validation**: N/A pure chrome
- [x] **Security**: Skills sandbox boundaries unchanged
- [x] **Error Sanitization**: N/A unless new errors
- [x] **No Raw SQL**: N/A
- [x] **Archive Protocol**: Redirect + re-home

---

## 📋 Completion Evidence (preenchido pelo agente executor)

- **Arquivos**:
  - `src/app/(dashboard)/operations/skills/SkillsStackPageClient.tsx` (new) — Core → Agent → explainers stack
  - `src/app/(dashboard)/operations/skills/page.tsx` (new) — static peer route
  - `src/app/(dashboard)/operations/[segment]/page.tsx` — skills branch (fallback)
  - `src/app/(dashboard)/dashboard/omni-skills/page.tsx` — redirect shell via `buildOperationsPath("skills")`
  - `src/app/(dashboard)/dashboard/agent-skills/page.tsx` — redirect shell
  - `OmniSkillsPageClient` / `AgentSkillsPageClient` — `hideConceptCard` prop; clients kept
  - `src/shared/components/SkillsConceptCard.tsx` — cross-links → `/operations/skills#…`
  - `src/shared/constants/operationsHub.ts` — Core Skills label + fused hrefs
  - `src/i18n/messages/en.json` — Omni → Core Skills surface strings
  - `next.config.mjs` — `/dashboard/skills` → `/operations/skills`
  - `src/shared/components/Header.tsx` — Core Skills titleFallback
- **Testes**:
  - `tests/unit/ui/epic20-skills-stack-0093.test.ts` — 14/14 pass
  - `tests/unit/omni-skills-page.test.tsx` — redirect shell contract updated
  - `tests/unit/ui/sidebar-naming-i18n.test.ts` — Core Skills
  - `tests/unit/SkillsConceptCard.test.tsx` (vitest) — 9/9 pass
- **Outputs**:
  - `node --import tsx/esm --test tests/unit/ui/epic20-skills-stack-0093.test.ts` → 14 pass
  - `npm run typecheck:core` → exit 0
  - eslint on touched files → 0 new errors (3 pre-existing warnings in AgentSkillsPageClient search)
- **Changelog**: `CHANGELOG.md` `[Unreleased]` Added — EPIC-20 Skills stack Core → Agent (0093)
- **Agente**: builders (gt-ts-engineer)
- **Data**: 2026-07-20
- **Note**: Task left in `02-doing` per operator instruction (do not move).

---

## 🔍 Review Trail (preenchido pelo reviewer)

- **Reviewer**: `gt-frontend-quality-reviewer` (parent `builders`)
- **Data da review**: 2026-07-20
- **Veredito**: `ACCEPTED_100` — move `02-doing` → `03-review`
- **Score (path to 100)**: **100/100**
- **Report**: `docs/reports/reviews/2026-07-20-task-0093-epic20-skills-stack-review.md`
- **Notas**: Core Skills→Agent Skills stack; Omni→Core rename; redirects. Path-to-100: Header Skills before catch-all; page h1; unit 16/16.
- **Skills**: code-quality-harness + frontend-quality-harness + tsjs-harness
- **Constraints**: no git; no :21000
