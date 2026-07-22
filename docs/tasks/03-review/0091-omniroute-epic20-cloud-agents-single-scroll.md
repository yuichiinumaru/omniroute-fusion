# Task 0091: EPIC-20 T20-F — Cloud Agents Single-Scroll (Tasks → Settings → Agents)

> **Status**: `[x]` Review ready (S=100)
> **Priority**: 🔴 P0
> **Type**: `feature` + `remediation`
> **Action type**: UX_VIS + HARDEN
> **Origin**: EPIC-20 §2 locked topbar #4 `cloud-agents`; §3 fusion pattern; §5 path matrix; operator law AGENTS.md Hard Rules #22–#23
> **Blocks**: soft-helps **T20-O** (009x chrome matrix) once segment exists
> **Depends on**: **0086** hard (Operations SSoT: topbar ids + path builders + redirect matrix); **0087** hard (Operations shell: single topbar mount on `/operations/*`). **Do not start product work until 0086 is completed**, or execute in the **same wave under freeze** that ships 0086 builders first and freezes ids before UI edits.
> **Parallelism**: `parallel-safe` vs **0092–0095** when exclusive file ownership held; **serializable** after **0086/0087**
> **Review routing**: independent Ops Cloud Agents PR preferred; bundle with 0087 only if shell PR still open

---

## Objective

Reform **Cloud Agents** into a **single-scroll Operations peer page** with vertical order **Tasks → Settings → Agents**, **no in-page tab chrome**, and **shrunk** agent cards that today only deep-link to Providers.

**Surfaces (locked — EPIC-20 §2 / §5):**

| Role | Path |
|------|------|
| Canonical | `/operations/cloud-agents` (or 0086 dual-write alias under `/dashboard/operations/cloud-agents` if freeze chooses alias) |
| Legacy redirect | `/dashboard/cloud-agents` → canonical Cloud Agents builder from **0086** |

**Done when:**

1. Visiting the Cloud Agents Ops topbar peer shows **one** continuous page: **Tasks** block, then **Settings** block, then **Agents** block (order fixed).
2. **No** Tasks / Agents / Settings **tab strip** (`activeTab` chrome) remains on the page.
3. Top-of-page explainer / “about” card moves to **page bottom**, **collapsible**, **default collapsed**.
4. Agent cards that only deep-link to Providers are **visually shrunk** (compact row/chip density — not full marketing cards).
5. Legacy `/dashboard/cloud-agents` **redirects** via 0086 builder.
6. **Exactly one** hub-level Operations topbar is mounted; Cloud Agents is **one peer only** — no second page topbar for tasks/settings/agents.
7. Unit tests: scroll order / no tab chrome / redirect row / anti-phantom topbar ≤1 / no-new-leaf.

**Out of this task:** A2A/ACP stack (**0092**), Skills (**0093**), Integrations (**0094**), Memory (**0095**), Labs/Media, inventing Manus/Genspark agents (backlog note only).

---

## Background Context

### O que já existe:

- Live page: `src/app/(dashboard)/dashboard/cloud-agents/page.tsx` — client monolith with `TabId = "tasks" | "agents" | "settings"`, border-b tab bar, conditional panels.
- Order today (tabs): Tasks | Agents | Settings — **wrong** vs EPIC order Tasks → Settings → Agents.
- Explainer: purple “about” `Card` at **top**.
- Agents panel: large centered cards + Configure → `window.location.href = "/dashboard/providers?section=cloudagent"`.
- Hub card: `operationsHub.ts` → `id: "cloud-agents"`, `href: "/dashboard/cloud-agents"`.
- Shared primitives: `src/shared/components/Collapsible.tsx`, `CollapsibleSection.tsx`.
- APIs unchanged: `/api/v1/agents/tasks`, health, credentials — **no backend rewrite**.

### O que está faltando / quebrado:

- Tab chrome fragments one agent surface into three mental pages.
- Epic order requires Settings **above** Agents (config before catalog of provider-link cards).
- Marketing-size agent cards dominate viewport for a deep-link-only action.
- No `/operations/cloud-agents` canonical path; still launchpad-only discovery (0059/0076 D1).
- EPIC-20 shell/topbar SSoT (**0086/0087**) not yet consumed by this page.

### Explicitly out of scope:

- New primary sidebar leaves.
- Cloud agent runtime/API feature work.
- Adding future agents (Manus, Genspark) — optional one-line residual note in Completion Evidence only.
- Changing Providers cloud-agent section implementation (link target may stay; card chrome shrinks here).

### Collision notes:

- **0086/0087**: exclusive owners of topbar id list + shell mount; this task **consumes** builders only.
- **0092–0095**: disjoint page trees if ownership held.
- **0076**: do not re-litigate Ops reverse-chrome D1.

---

## Dependency & Parallel Safety

| Item | Value |
|------|--------|
| **Depends on** | **0086** hard · **0087** hard (or same-wave freeze: 0086 first) |
| **Blocks** | none hard |
| **File ownership (exclusive)** | `dashboard/cloud-agents/**`; new `/operations/cloud-agents` route if 0087 pattern uses nested app routes owned by this segment; tests `tests/unit/ui/epic20-cloud-agents-0091.test.ts` |
| **Do not touch** | a2a, acp-agents, agent-bridge, skills, webhooks, plugins, memory, endpoint dual-strip, Labs |
| **Collision vs live lanes** | Safe vs 0092–0095 with ownership; **not** safe to invent path builders without 0086 |
| **parallel-safe** | **Yes vs 0092–0095** if exclusive files; **serializable after 0086/0087** |

---

## Test Requirements

- DEVE renderizar ordem vertical **Tasks → Settings → Agents** no DOM (source-order or `data-section` markers: `tasks`, `settings`, `agents`)
- DEVE **não** montar tab strip Tasks/Agents/Settings (`data-testid` tab buttons / border-b tab map ausente)
- DEVE mover about/explainer para **bottom** em `Collapsible` (ou equivalente) com **defaultOpen=false**
- DEVE shrink agent cards: compact layout (assert class/density contract or max visual height heuristic in unit source test — no full-page hero cards for provider-link-only agents)
- DEVE redirecionar `/dashboard/cloud-agents` → 0086 Cloud Agents builder path
- DEVE montar **≤1** Operations hub topbar no peer route (anti-phantom matrix Hard Rule #22)
- DEVE assertir **no-new-leaf**: `PRIMARY_SIDEBAR_ITEMS` does not gain `cloud-agents` peer leaf
- DEVE manter functional create/list/cancel task flows (existing client logic re-homed, not deleted)
- NÃO DEVE adicionar second PageTabBar for cloud segments
- NÃO DEVE inventar topbar ids outside 0086 SSoT

---

## Exit Conditions (GDD/TDD)

> OmniRoute npm matrix — see `docs/tasks/OMNIROUTE-CREATE-TASKS-EXITS.md`.  
> Do **not** require cargo check/test for this stack.

- [x] Canonical Cloud Agents page is single-scroll Tasks → Settings → Agents with no tab chrome
- [x] Explainer at bottom, collapsed by default
- [x] Agent provider-link cards visually shrunk
- [x] Legacy `/dashboard/cloud-agents` redirects via 0086 builder
- [x] Anti-phantom: ≤1 Ops hub topbar on Cloud Agents peer route
- [x] Unit tests pass:
      `node --import tsx/esm --test tests/unit/ui/epic20-cloud-agents-0091.test.ts`
- [x] `npm run typecheck:core` passa sem erros
- [x] `npm run lint` passa sem erros novos nos arquivos tocados
- [x] Entrada no TOPO de `CHANGELOG.md` under `[Unreleased]`
- [x] Completion Evidence filled with real npm command output (no cargo lines)

---

## Details

### What

Subtasks:

- [x] **Ler código existente**: EPIC-20 FULL; 0086 SSoT module + redirect matrix; 0087 shell mount; `cloud-agents/page.tsx` (full); `operationsHub.ts` cloud-agents row; `Collapsible.tsx`; Providers `?section=cloudagent` target (read-only); related i18n `cloudAgents`; UI.md single-topbar law
- [x] Confirm 0086 builders for `cloud-agents` + legacy redirect row (stop if missing)
- [x] Implement single-scroll layout: extract tab panels into stacked sections in **Tasks → Settings → Agents** order
- [x] Remove tab bar / `activeTab` gate for primary chrome; optional in-page anchors only if they are not a second topbar
- [x] Move about Card → bottom collapsible default collapsed
- [x] Shrink Agents cards (compact list/row; Configure remains deep-link)
- [x] Wire canonical route + legacy redirect shells per 0086/0087 pattern
- [x] TDD: order markers, no tab chrome, redirect, anti-phantom, no-new-leaf
- [x] **Refactoring pass**: avoid duplicating task API helpers; prefer section components over 3× copy
- [x] **Verificação de regressão**: new tests + typecheck:core + lint

### Where

| Arquivo | Propósito |
|---------|-----------|
| `docs/tasks/00-planning/EPIC-20-omniroute-operations-hub-reform.md` | Ler — locked matrix |
| 0086 SSoT module (path frozen by 0086) | Ler — builders / redirects |
| 0087 Operations shell components | Ler — topbar mount only |
| `src/app/(dashboard)/dashboard/cloud-agents/page.tsx` | Modificar — single-scroll reform |
| `src/app/(dashboard)/operations/cloud-agents/**` or 0087-defined route | Criar/modificar — canonical peer page if app-router path lives outside `dashboard/` |
| `src/shared/constants/operationsHub.ts` | Ler — update only if 0086/0087 assign hub href retarget to this task |
| `src/shared/components/Collapsible.tsx` | Ler — explainer wrap |
| `tests/unit/ui/epic20-cloud-agents-0091.test.ts` | Criar |
| Root `CHANGELOG.md` | Entrada Unreleased |

### How

1. Gate on 0086 path builders for `cloud-agents`.
2. Split current tab panels into three stacked sections; reorder Settings before Agents.
3. Delete tab strip UI; ensure state that depended on tab mount (e.g. agent health fetch) runs on scroll-page mount or Agents section visibility without tabs.
4. Wrap about card in bottom collapsible `defaultOpen={false}`.
5. Replace agent card grid heroes with compact rows; keep Configure → Providers cloudagent section.
6. Redirect legacy route; mount under Ops shell so only one topbar.
7. Tests encode binary chrome contracts.

### Why

Cloud Agents is one product surface. Tabs + giant provider-link cards make Ops feel like three apps. Single-scroll matches EPIC-20 fusion law and Hard Rule #22 (one hub topbar family).

---

## Parallelism / file ownership

| Class | Detail |
|-------|--------|
| **parallel-safe** | 0092, 0093, 0094, 0095 (disjoint trees) |
| **serializable** | After 0086 + 0087 (or same-wave freeze with 0086 first) |
| **Collision** | `operationsHub.ts` / shell only if 0086 did not freeze hrefs — prefer 0086 owns constants |

---

## ⛔ Anti-Hallucination Guardrails

> [!CAUTION]
> DO NOT invent `/operations/...` ids outside **0086**.  
> DO NOT keep Tasks/Agents/Settings as a second topbar or PageTabBar.  
> DO NOT start until **0086** completed or same-wave freeze ships builders first.  
> DO NOT rewrite agent APIs or add Manus/Genspark product.  
> DO NOT add primary sidebar leaves.  
> PORT 21000 = production — never mutate without explicit operator command.

> [!IMPORTANT]
> Read EVERY file in Where before writing.  
> Anti-phantom matrix: mount count of hub Operations topbar **≤ 1** on this route.  
> Archive-not-delete: re-home logic; do not wipe task CRUD.

---

## 🛡️ Compliance Checklist (Leis Primárias do AGENTS.md)

- [ ] **Doc Accuracy**: Paths/builders match 0086 + EPIC-20 (grep before document)
- [ ] **Zod Validation**: N/A unless new query params added (prefer none)
- [ ] **Security**: No secrets; keep existing API auth posture
- [ ] **Error Sanitization**: N/A for pure chrome if no new error bodies
- [ ] **No Raw SQL**: N/A
- [ ] **Archive Protocol**: Re-home + redirect; no hard-delete of page modules without archive

---

## 📋 Completion Evidence (preenchido pelo agente executor)

- **Arquivos criados/modificados**:
  - `src/app/(dashboard)/operations/cloud-agents/CloudAgentsPageClient.tsx` (create — single-scroll Tasks→Settings→Agents)
  - `src/app/(dashboard)/operations/cloud-agents/page.tsx` (create — canonical peer)
  - `src/app/(dashboard)/dashboard/cloud-agents/page.tsx` (rewrite — redirect via `buildOperationsPath("cloud-agents")`)
  - `src/app/(dashboard)/operations/[segment]/page.tsx` (wire `cloud-agents` branch)
  - `tests/unit/ui/epic20-cloud-agents-0091.test.ts` (create)
  - `CHANGELOG.md` (`[Unreleased]` Added)
- **Testes que verificam o trabalho**: `epic20-cloud-agents-0091.test.ts`
- **Resultado dos testes**:
  ```
  node --import tsx/esm --test tests/unit/ui/epic20-cloud-agents-0091.test.ts
  ℹ tests 13
  ℹ suites 5
  ℹ pass 13
  ℹ fail 0
  ```
- **Resultado do lint**: PASS (eslint on touched files — exit 0, no findings)
- **Resultado do typecheck/build**: PASS (`npm run typecheck:core` — exit 0)
- **Entrada no changelog**: root `CHANGELOG.md` → `[Unreleased]` → Added → EPIC-20 Cloud Agents single-scroll (Task 0091 / T20-F)
- **Agente executor**: gt-ts-engineer (builders)
- **Data de conclusão**: 2026-07-20
- **Residuals**: Future agents (Manus/Genspark) not added. Hub card retargeted to `buildOperationsPath("cloud-agents")` during formal review path-to-100 (Header peer title also fixed).

---

## 🔍 Review Trail (preenchido pelo reviewer)

- **Reviewer**: `gt-frontend-quality-reviewer` (parent `builders`)
- **Data da review**: 2026-07-20
- **Veredito**: `ACCEPTED_100` — move `02-doing` → `03-review`
- **Score (path to 100)**: **100/100**
- **Report**: `docs/reports/reviews/2026-07-20-task-0091-epic20-cloud-agents-review.md`
- **Notas**: Single-scroll Tasks→Settings→Agents; compact agents; anti-phantom ≤1. Path-to-100: Header peer title before catch-all; hub buildOperationsPath; unit 15/15.
- **Skills**: code-quality-harness + frontend-quality-harness + tsjs-harness
- **Constraints**: no git; no :21000
