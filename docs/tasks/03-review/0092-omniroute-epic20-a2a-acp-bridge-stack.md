# Task 0092: EPIC-20 T20-G — A2A/ACP Bridge Collapsible Stack

> **Status**: `[x]` Review ready (S=100)
> **Priority**: 🔴 P0
> **Type**: `feature` + `remediation`
> **Action type**: UX_VIS + HARDEN
> **Origin**: EPIC-20 §2 locked topbar #5 `a2a-acp-bridge`; §3 fusion pattern; §5 path matrix; AGENTS.md Hard Rules #22–#23
> **Blocks**: soft-helps T20-O chrome matrix
> **Depends on**: **0086** hard (SSoT path builders + redirect matrix); **0087** hard (Ops single topbar shell). **Do not start until 0086 is completed**, or same wave with freeze (0086 builders first).
> **Parallelism**: `parallel-safe` vs **0091, 0093–0095** with exclusive ownership; **serializable** after **0086/0087**
> **Review routing**: independent A2A/ACP stack PR; bundle only if shell still open

---

## Objective

Fuse **Agent Bridge → A2A Server → ACP Agents** into **one** Operations topbar peer **A2A/ACP Bridge** as a **vertical collapsible stack** (order fixed).

**Surfaces (locked):**

| Block (vertical order) | Legacy source |
|------------------------|---------------|
| 1. Agent Bridge | `/dashboard/tools/agent-bridge` |
| 2. A2A Server | `/dashboard/a2a` |
| 3. ACP Agents | `/dashboard/acp-agents` |

| Role | Path |
|------|------|
| Canonical | `/operations/a2a-acp-bridge` (0086 freeze) |
| Legacy redirects | agent-bridge, a2a, acp-agents → canonical (optionally with hash/query section anchors if 0086 defines them) |

**Done when:**

1. One route hosts three collapsible sections in order **Agent Bridge → A2A Server → ACP Agents**.
2. Primary work surface default: Agent Bridge **expanded** (or all three expanded if operator-preferable — **document choice in Completion Evidence**; epic default = primary expanded, others collapsible).
3. Explainer / concept cards from the three pages move to **page bottom**, collapsible, **default collapsed**.
4. **No** second topbar for Bridge/A2A/ACP inside the page; only Ops hub peer `a2a-acp-bridge`.
5. Legacy three URLs redirect via 0086.
6. Business logic modules re-homed/imported — **not** deleted.
7. Tests: stack order, collapsibles present, redirects, anti-phantom ≤1 Ops topbar, no-new-leaf.

**Out of this task:** Cloud Agents (**0091**), Skills, Integrations, Memory, Endpoint dual-strip kill (T20-C), MCP/CoreMCP rename (T20-D).

---

## Background Context

### O que já existe:

- Agent Bridge: `src/app/(dashboard)/dashboard/tools/agent-bridge/` (`page.tsx` server, `AgentBridgePageClient.tsx`, hooks, components).
- A2A Server: `src/app/(dashboard)/dashboard/a2a/page.tsx` + `endpoint/components/A2ADashboard`.
- ACP Agents: `src/app/(dashboard)/dashboard/acp-agents/page.tsx` (registry UI + concept cards).
- Hub links (separate cards today): `operationsHub.ts` entries `a2a`, `acp-agents`, `agent-bridge`.
- Collapsible primitive: `src/shared/components/Collapsible.tsx`.
- Docs: `docs/frameworks/A2A-SERVER.md`, agent protocols guide (read-only unless UI string rename required).

### O que está faltando / quebrado:

- Three separate mental destinations for one protocol family.
- Ops hub still lists them as discrete launchpad cards (0087/T20-N may retarget cards; this task owns **page fusion** + redirects).
- No single `/operations/a2a-acp-bridge` peer.
- Risk of multi-chrome if each legacy page keeps its own pseudo-nav.

### Explicitly out of scope:

- MetaMCP product layers.
- Changing A2A JSON-RPC / ACP backend protocols.
- Traffic Inspector (Observe, T20-M).
- Endpoint tab strip removal for MCP/A2A (T20-C owns Endpoint dual strip; A2A **leaves** Endpoint page per EPIC-20 — ensure this stack is the home, not Endpoint sub-strip).

### Collision notes:

- **T20-C / Endpoint**: A2A must **not** remain a dual home under Endpoint protocols strip. If Endpoint still embeds A2A chrome, coordinate: this task owns A2A **Ops home**; Endpoint task must stop dual-mounting protocol strip (may already be planned in 0088/T20-C — do not re-implement Endpoint fusion here; assert redirect or de-dupe if grepped).
- **0091/0093–0095**: disjoint.

---

## Dependency & Parallel Safety

| Item | Value |
|------|--------|
| **Depends on** | **0086** hard · **0087** hard |
| **Blocks** | none hard |
| **File ownership (exclusive)** | Fusion page for `a2a-acp-bridge`; redirect shells for `tools/agent-bridge`, `a2a`, `acp-agents`; tests `tests/unit/ui/epic20-a2a-acp-bridge-0092.test.ts` |
| **Do not touch** | cloud-agents, omni-skills, agent-skills, webhooks, plugins, memory page chrome |
| **parallel-safe** | **Yes vs 0091, 0093–0095** |
| **serializable** | After 0086/0087 |

---

## Test Requirements

- DEVE existir um peer route canônico 0086 `a2a-acp-bridge` com três seções collapsible na ordem Agent Bridge → A2A → ACP
- DEVE redirecionar:
  - `/dashboard/tools/agent-bridge` → canonical
  - `/dashboard/a2a` → canonical
  - `/dashboard/acp-agents` → canonical
- DEVE reutilizar clients existentes (import/re-export) — não blank pages
- DEVE colocar concept/explainer cards no **bottom** collapsible default collapsed
- DEVE assertir ≤1 Ops hub topbar no peer
- DEVE assertir no-new-leaf (no primary `a2a` / `acp-agents` / `agent-bridge` leaves)
- DEVE marcar seções com `data-section` (or equivalent) `agent-bridge` | `a2a-server` | `acp-agents` para testes de ordem
- NÃO DEVE reintroduzir Endpoint dual strip APIs/Catalog/Protocols for A2A as L1 chrome
- NÃO DEVE inventar topbar ids fora de 0086

---

## Exit Conditions (GDD/TDD)

> OmniRoute npm matrix — `docs/tasks/OMNIROUTE-CREATE-TASKS-EXITS.md`. No cargo exits.

- [x] Stack page renders Agent Bridge → A2A Server → ACP Agents collapsibles
- [x] Three legacy routes redirect to 0086 canonical builder
- [x] Explainers bottom collapsed by default
- [x] Anti-phantom: ≤1 Ops topbar on peer route
- [x] Unit tests pass:
      `node --import tsx/esm --test tests/unit/ui/epic20-a2a-acp-bridge-0092.test.ts`
- [x] `npm run typecheck:core` passa sem erros
- [x] `npm run lint` passa sem erros novos nos arquivos tocados
- [x] Entrada no TOPO de `CHANGELOG.md` under `[Unreleased]`
- [x] Completion Evidence filled (include defaultOpen policy per section)

---

## Details

### What

Subtasks:

- [x] **Ler código existente**: EPIC-20; 0086/0087; agent-bridge tree; a2a page + A2ADashboard; acp-agents page; operationsHub rows; Collapsible; any Endpoint A2A dual-mount references
- [x] Confirm 0086 builders + three redirect rows
- [x] Create fused page composing three section clients inside Collapsibles
- [x] Convert legacy pages to redirect shells (archive-not-delete implementation modules)
- [x] Move explainers to bottom collapsed stack
- [x] TDD order + redirects + anti-phantom + no-new-leaf
- [x] **Refactoring pass**: thin composition shell; no copy-paste of large clients
- [x] **Verificação de regressão**: tests + typecheck:core + lint

### Where

| Arquivo | Propósito |
|---------|-----------|
| EPIC-20 planning doc | Ler |
| 0086 SSoT + 0087 shell | Ler |
| `src/app/(dashboard)/dashboard/tools/agent-bridge/**` | Ler + redirect shell at page.tsx |
| `src/app/(dashboard)/dashboard/a2a/**` | Ler + redirect shell |
| `src/app/(dashboard)/dashboard/acp-agents/**` | Ler + redirect shell |
| `src/app/(dashboard)/dashboard/endpoint/components/A2ADashboard*` | Ler — mount source for A2A section |
| Canonical `operations/.../a2a-acp-bridge` route (0087 pattern) | Criar |
| `src/shared/components/Collapsible.tsx` | Ler |
| `tests/unit/ui/epic20-a2a-acp-bridge-0092.test.ts` | Criar |
| Root `CHANGELOG.md` | Unreleased note |

### How

1. Gate on 0086 `a2a-acp-bridge` id + redirect matrix.
2. Build composition page: three Collapsibles; import existing clients.
3. DefaultOpen: document (recommend Bridge `true`, A2A/ACP `true` for first ship if density allows; or Bridge only — pick one, test it).
4. Legacy `page.tsx` → `redirect(builder())`.
5. Bottom explainer collapsible aggregates concept cards.
6. Ensure Ops shell wraps page once.

### Why

Bridge + A2A + ACP are one interop story. Three cards and three URLs violate self-evident org. Collapsible stack keeps depth without multi-topbar.

---

## Parallelism / file ownership

| Class | Detail |
|-------|--------|
| **parallel-safe** | 0091, 0093, 0094, 0095 |
| **serializable** | After 0086 + 0087 |
| **Collision** | Endpoint A2A strip (T20-C) — read/assert only; do not own Endpoint fusion |

---

## ⛔ Anti-Hallucination Guardrails

> [!CAUTION]
> DO NOT invent protocol features.  
> DO NOT keep three standalone L1 destinations without redirects.  
> DO NOT stack a second in-page topbar for Bridge/A2A/ACP.  
> DO NOT start without 0086 builders (or freeze).  
> PORT 21000 = production — do not touch.

> [!IMPORTANT]
> Hard Rule #22: exactly one hub topbar peer family.  
> Re-home imports; archive-not-delete large client trees.

---

## 🛡️ Compliance Checklist (Leis Primárias do AGENTS.md)

- [x] **Doc Accuracy**: Redirect targets match 0086 (grep)
- [x] **Zod Validation**: N/A pure chrome unless new query keys
- [x] **Security**: Agent Bridge may touch MITM — do not weaken local-only / spawn guards
- [x] **Error Sanitization**: Preserve existing sanitized error paths
- [x] **No Raw SQL**: N/A
- [x] **Archive Protocol**: Redirect shells; keep implementation modules

---

## 📋 Completion Evidence (preenchido pelo agente executor)

- **Arquivos criados/modificados**:
  - **Created**: `src/app/(dashboard)/operations/a2a-acp-bridge/A2aAcpBridgePage.tsx`, `A2aAcpBridgeStackClient.tsx`, `loadAgentBridgeData.ts`
  - **Created**: `src/app/(dashboard)/dashboard/a2a/A2APageClient.tsx` (from former page body; `embedded` + `A2AConceptIntro`)
  - **Created**: `src/app/(dashboard)/dashboard/acp-agents/AcpAgentsPageClient.tsx` (from former page body; `embedded` + `AcpAgentsConceptCards`)
  - **Created**: `tests/unit/ui/epic20-a2a-acp-bridge-0092.test.ts`
  - **Modified**: `src/app/(dashboard)/operations/[segment]/page.tsx` (mount `a2a-acp-bridge`)
  - **Redirect shells**: `dashboard/tools/agent-bridge/page.tsx`, `dashboard/a2a/page.tsx`, `dashboard/acp-agents/page.tsx` → `buildOperationsPath("a2a-acp-bridge")`
  - **Kept (archive-not-delete)**: `AgentBridgePageClient.tsx` + components/hooks; `A2ADashboard`; ACP registry client
  - **CHANGELOG.md** `[Unreleased]` entry
- **Testes**: `node --import tsx/esm --test tests/unit/ui/epic20-a2a-acp-bridge-0092.test.ts` → **14/14 pass**
- **Resultado dos testes / lint / typecheck**: tests PASS · `npm run typecheck:core` PASS · eslint on touched files PASS
- **defaultOpen policy recorded**: **yes**
  - `agent-bridge`: **true** (primary work surface)
  - `a2a-server`: **true** (first-ship discoverability)
  - `acp-agents`: **true** (first-ship discoverability)
  - `explainers` (bottom concept block): **false**
  - Constant: `A2A_ACP_BRIDGE_DEFAULT_OPEN` in `A2aAcpBridgeStackClient.tsx`
- **Entrada no changelog**: root `CHANGELOG.md` under `[Unreleased]` → Added
- **Agente executor**: gt-ts-engineer (builders) · **Data**: 2026-07-20
- **Task location**: left in `docs/tasks/02-doing/` per operator instruction

---

## 🔍 Review Trail (preenchido pelo reviewer)

- **Reviewer**: `gt-frontend-quality-reviewer` (parent `builders`)
- **Data da review**: 2026-07-20
- **Veredito**: `ACCEPTED_100` — move `02-doing` → `03-review`
- **Score (path to 100)**: **100/100**
- **Report**: `docs/reports/reviews/2026-07-20-task-0092-epic20-a2a-acp-bridge-review.md`
- **Notas**: Collapsible stack Bridge→A2A→ACP; defaultOpen policy true/true/true/false; three redirects. Path-to-100: Header A2A/ACP Bridge; section ids + hub hashes; unit 17/17.
- **Skills**: code-quality-harness + frontend-quality-harness + tsjs-harness
- **Constraints**: no git; no :21000
