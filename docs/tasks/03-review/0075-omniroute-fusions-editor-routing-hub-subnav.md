# Task 0075: Fusions Editor RoutingHubSubnav + Peer Mount Matrix

> **Status**: `[R]` In review (frontend-quality ACCEPT 100 → 03-review 2026-07-19)

> **Priority**: 🟡 P1
> **Type**: `remediation`
> **Action type**: UX_VIS + HARDEN
> **Origin**: EPIC-13 Frontend IA Residual Polish — R-IA-01; Wave 2 residual report `docs/reports/audits/2026-07-19-wave2-frontend-ia-residual-investigation.md`; builder learnings 0009 U1
> **Blocks**: none
> **Depends on**: none (Epic 0005 + Tasks 0058/0015/0016 already completed)
> **Parallel class**: `parallel-safe` vs 0076; `parallel-safe` vs 0077 **if** file ownership below is respected; product routes orthogonal to EPIC-19 but **shared chrome SSoT serial-sensitive** (leaf-count tests must not pin length 9 forever — 0082 owns absolute length)
> **Review routing**: independent (Routing hub chrome only — bundle with 0077 only if both land on same PR and touch `fusions/page.tsx`)

---

## Objective

Restore continuous **Routing hub chrome** on fusion **editor** routes so operators are not orphaned after leaving the fusions list.

**Concrete gap (R-IA-01):** `RoutingHubSubnav` mounts only on `/dashboard/fusions` list (`fusions/page.tsx`). Routes `/dashboard/fusions/new` and `/dashboard/fusions/[id]` render `FusionEditorClient` with a Back link only — no hub strip. That is the 0009 §2.1 phantom class: “topbar exists on primary page, peers lose chrome.”

**Done when:**

1. Fusion create + edit shells show the same `RoutingHubSubnav` as the list (`active="fusions"`).
2. Unit tests encode a **peer-route mount matrix** (list + new + edit) — not a single “includes RoutingHubSubnav somewhere” happy path.
3. **Zero** new primary sidebar leaves — anti-new-leaf asserts only (no `fusions` / labs primary). Absolute `PRIMARY_SIDEBAR_ITEMS.length` is **not** frozen at 9 forever; post-0082 re-measure is owned by **0082**.

---

## Background Context

### O que já existe:

- `src/shared/components/RoutingHubSubnav.tsx` — SSoT strip: Combos / Fusions / Live / Compression Settings / Compression Studio; uses `HUB_SUBNAV_*` from `hubSubnavStyles.ts`.
- List mount: `src/app/(dashboard)/dashboard/fusions/page.tsx` → `<RoutingHubSubnav active="fusions" />`.
- Editor shell: `FusionEditorClient` shared by:
  - `fusions/new/page.tsx` → `<FusionEditorClient id="new" />`
  - `fusions/[id]/page.tsx` → `<FusionEditorClient id={id} />`
- Top-level routing matrix (incomplete vs editors): `tests/unit/ui/routing-hub-discoverability-0025.test.ts` asserts list + combos + live + studio only.
- Gold U1 pattern: `tests/unit/provider-connections-ui-regression.test.ts` peer matrix × `currentPath`.

### O que está faltando / quebrado:

- `rg RoutingHubSubnav` under `dashboard/fusions` hits **only** `page.tsx` (list).
- `FusionEditorClient` has Back → `/dashboard/fusions` but no hub strip (confirmed Wave 2 §3.3).
- No sabotage test that editor routes **must** keep the strip (0009 U1 residual).

### Explicitly out of scope (do not expand):

- `combos/[id]` control-center and `combos/playground` (R-IA-02, P3 — not this reserved ID).
- Standalone compression engine pages, new sidebar leaves, redesign of `RoutingHubSubnav` link set.
- Fusions list acting chip (→ **0077**).
- Ops/Testing reverse chrome (→ **0076**).

---

## Dependency & Parallel Safety

| Item | Value |
|------|--------|
| **Depends on** | None hard; soft: 0058 Routing hub shape |
| **Blocks** | None |
| **File ownership (exclusive)** | `FusionEditorClient.tsx`; optional `fusions/layout.tsx` if chosen; `fusions/new/page.tsx` / `fusions/[id]/page.tsx` only if mount not in shared client; `tests/unit/ui/routing-hub-discoverability-0025.test.ts` **or** new `tests/unit/ui/fusions-routing-hub-matrix-0075.test.ts` |
| **Do not touch** | `fusions/page.tsx` list cards (0077); `operationsHub.ts` / `testingHub.ts` / ops peer pages (0076); `PRIMARY_SIDEBAR_ITEMS` shape except read-only assertions |
| **Collision vs live lanes** | `01-open/0036` is ops deploy on :21000 — no file overlap. `02-doing/` empty at promote time. |
| **parallel-safe** | Yes vs 0076 always; yes vs 0077 if list page and editor client stay separate |

---

## Test Requirements

> Each item is a measurable assertion. Prefer static source-read matrix tests (same style as 0025 / 0057).

- DEVE existir mount de `RoutingHubSubnav` com `active="fusions"` no shell de editor (shared client **ou** layout wrapping both `new` + `[id]`).
- DEVE existir teste de **mount matrix** cobrindo no mínimo:
  | Route / surface | Expectation |
  |-----------------|-------------|
  | `fusions/page.tsx` | mounts `RoutingHubSubnav` + `active="fusions"` |
  | `fusions/new` path (page and/or `FusionEditorClient`) | mounts same strip + `active="fusions"` |
  | `fusions/[id]` path (page and/or `FusionEditorClient`) | mounts same strip + `active="fusions"` |
- DEVE manter os mounts top-level já cobertos (combos, live, compression settings, studio) — não regredir 0025/0058.
- DEVE assertir **anti-new-leaf / anti-phantom negativo** (relative — **not** absolute forever-9):
  - `PRIMARY_SIDEBAR_ITEM_IDS` **não** inclui `"fusions"`, `"playground"`, `"translator"`, `"search-tools"`.
  - `DEVTOOLS_ITEMS` remains empty / non-lab.
  - Do **not** freeze analytics/costs presence or `PRIMARY_SIDEBAR_ITEMS.length === 9` as permanent law — post-EPIC-19 length is re-measured by **0082**.
- DEVE usar classes via `HUB_SUBNAV_*` (import existente em `RoutingHubSubnav`) — não inventar shell branco/`bg-primary text-white` no editor.
- NÃO DEVE adicionar leaf `fusions` / `testing` / extra routing ids em `PRIMARY_SIDEBAR_ITEMS` ou `DEVTOOLS_ITEMS`.

---

## Exit Conditions (GDD/TDD)

- [x] `FusionEditorClient` (recommended) **or** shared `fusions/layout.tsx` mounts `<RoutingHubSubnav active="fusions" />` so **both** `/dashboard/fusions/new` and `/dashboard/fusions/[id]` show the strip without duplicating divergent markup
- [x] Loading and error branches of the editor still leave operators able to reach Routing hub destinations (strip present on load-error UI **or** documented explicit exception with Back + list still working — prefer strip always when shell renders)
- [x] Mount-matrix unit test(s) pass — peer routes × mount × `active="fusions"` (0009 U1)
- [x] Anti-new-leaf assertion: no `fusions`/`playground`/`translator`/`search-tools` primary ids; **no** forever-`length===9` pin (0082 owns absolute length/id after cutover)
- [x] Existing routing hub discoverability tests still pass (0025/0058 suite)
- [x] `node --import tsx/esm --test tests/unit/ui/routing-hub-discoverability-0025.test.ts` (and any new 0075 matrix file) passa com 0 falhas
- [x] `npm run typecheck:core` passa sem erros
- [x] `npm run lint` passa sem erros novos nos arquivos tocados
- [x] Entrada no `CHANGELOG.md` no TOPO (Under Development / Unreleased) descrevendo fusions editor hub strip continuity
- [x] Completion Evidence preenchido antes de `03-review/`

---

## Details

### What

Subtasks:

- [ ] **Ler código existente** (obrigatório primeiro):
  - `src/shared/components/RoutingHubSubnav.tsx`
  - `src/shared/constants/hubSubnavStyles.ts`
  - `src/app/(dashboard)/dashboard/fusions/page.tsx`
  - `src/app/(dashboard)/dashboard/fusions/FusionEditorClient.tsx`
  - `src/app/(dashboard)/dashboard/fusions/new/page.tsx`
  - `src/app/(dashboard)/dashboard/fusions/[id]/page.tsx`
  - `tests/unit/ui/routing-hub-discoverability-0025.test.ts`
  - `tests/unit/provider-connections-ui-regression.test.ts` (matrix template only)
  - `docs/guides/UI.md` §1 no-new-leaf
  - Wave 2 report §3.3 / R-IA-01
- [ ] **Escolher mount strategy** (documentar na Completion Evidence):
  - **Preferred:** import `RoutingHubSubnav` once in `FusionEditorClient` below title row (or above units) so `new` + `[id]` inherit.
  - **Alt:** `fusions/layout.tsx` client wrapper mounting strip for all fusions/* including list (then list page must not double-mount — remove from list **or** keep single layout only).
  - Do **not** only mount on one of `new`/`[id]` pages.
- [ ] Implement mount with `active="fusions"`; preserve Back button; keep `data-testid="fusion-editor"`.
- [ ] Add/extend unit tests: full fusions peer matrix + no-new-leaf.
- [ ] **Refactoring pass**: no layout duplication; no copy-pasted class strings; reuse component.
- [ ] **Verificação de regressão**: commands in Exit Conditions.

### Where

| Arquivo | Propósito |
|---------|-----------|
| `src/shared/components/RoutingHubSubnav.tsx` | Ler — API `active="fusions"` |
| `src/shared/constants/hubSubnavStyles.ts` | Ler — SSOT classes (não duplicar) |
| `src/app/(dashboard)/dashboard/fusions/FusionEditorClient.tsx` | Modificar — mount strip (preferred) |
| `src/app/(dashboard)/dashboard/fusions/new/page.tsx` | Ler / touch only if layout strategy needs it |
| `src/app/(dashboard)/dashboard/fusions/[id]/page.tsx` | Ler / touch only if layout strategy needs it |
| `src/app/(dashboard)/dashboard/fusions/page.tsx` | Ler — reference mount; **avoid list-card edits** (0077). Only touch if removing double-mount after layout |
| `src/app/(dashboard)/dashboard/fusions/layout.tsx` | Criar opcional — shared mount alternative |
| `tests/unit/ui/routing-hub-discoverability-0025.test.ts` | Modificar — extend matrix **or** leave + add sibling file |
| `tests/unit/ui/fusions-routing-hub-matrix-0075.test.ts` | Criar opcional — dedicated U1 matrix |
| `src/shared/constants/sidebarVisibility.ts` | Ler only — assert leaf budget |
| `CHANGELOG.md` | Entrada Unreleased |
| `docs/reports/audits/2026-07-19-wave2-frontend-ia-residual-investigation.md` | Evidence only |
| `docs/tasks/00-planning/EPIC-13-omniroute-frontend-ia-residual-polish.md` | Epic parent |

### How

1. Read every file in **Where** marked Ler before writing.
2. Grep confirm gap: `rg RoutingHubSubnav src/app/\(dashboard\)/dashboard/fusions`.
3. Mount `<RoutingHubSubnav active="fusions" />` in shared editor shell (or layout).
4. Write matrix tests modeled on Providers 0057 peer loop:
   ```ts
   const peers = [
     { rel: "…/fusions/page.tsx", must: ['RoutingHubSubnav', 'active="fusions"'] },
     // editor: either client source or both page sources must prove mount
   ];
   ```
5. Assert anti-new-leaf (no fusions/playground/translator/search-tools primary) — do **not** pin absolute length 9.
6. Run targeted unit tests + typecheck + lint.
7. CHANGELOG + Completion Evidence.

### Why

Operators deep-link into fusion editors daily. Losing Routing strip forces Back-only navigation and breaks discoverability of Live / Compression Studio mid-edit — the exact phantom failure mode that forced 0054/0057/0061 reopen loops. Closing R-IA-01 with a matrix test prevents the next “list-only” regression.

---

## ⛔ Anti-Hallucination Guardrails

> [!CAUTION]
> DO NOT mark complete because list page already has the strip. Editor routes are the residual.
> DO NOT add a primary sidebar leaf for Fusions / Testing / Compression engines.
> DO NOT expand scope to `combos/[id]` or playground under this task ID.
> DO NOT touch production port **:21000** (AGENTS.md ban). Dev/prod proof, if any, is :22000 or unit-only.

> [!IMPORTANT]
> Read EVERY production file in **Where** before writing.
> Exit matrix tests must fail if `FusionEditorClient` loses the import again (sabotage-lite).
> Prefer one shared mount over three divergent page copies.

---

## 🛡️ Compliance Checklist (Leis Primárias do AGENTS.md)

- [ ] **Doc Accuracy**: No invented routes/APIs; grepped before documenting
- [ ] **Zod Validation**: N/A unless new form inputs (none expected)
- [ ] **Security**: No secrets; no eval
- [ ] **Error Sanitization**: N/A for pure chrome mount
- [ ] **No Raw SQL**: N/A
- [ ] **Archive Protocol**: No deletes of routes/capabilities
- [ ] **No-new-leaf**: no labs/fusions primary; absolute length owned by 0082

---

## 📋 Completion Evidence (preenchido pelo agente executor)

- **Arquivos criados/modificados**:
  - `src/app/(dashboard)/dashboard/fusions/FusionEditorClient.tsx` — mount `RoutingHubSubnav active="fusions"` on loading / load-error / main shells
  - `tests/unit/ui/fusions-routing-hub-matrix-0075.test.ts` — peer mount matrix + anti-new-leaf + 0025/0058 top-level regression
  - `CHANGELOG.md` — Unreleased bullet (Task 0075)
- **Testes que verificam o trabalho**:
  - `tests/unit/ui/fusions-routing-hub-matrix-0075.test.ts`
  - `tests/unit/ui/routing-hub-discoverability-0025.test.ts` (no regression)
- **Resultado dos testes**:
  - `node --import tsx/esm --test tests/unit/ui/fusions-routing-hub-matrix-0075.test.ts tests/unit/ui/routing-hub-discoverability-0025.test.ts` → **pass** (matrix + 0025 suite green)
- **Resultado do lint**: `npx eslint` on touched files → **0 errors**
- **Resultado do typecheck/build**: `npm run typecheck:core` → **pass**
- **Entrada no changelog**: Unreleased → Changed → **Fusions editor Routing hub continuity (Task 0075 / R-IA-01)**
- **Mount strategy chosen** (client vs layout): **`FusionEditorClient` shared client** (preferred). `new/page.tsx` + `[id]/page.tsx` already render only `<FusionEditorClient />`; list page keeps its own mount. No `fusions/layout.tsx` (avoids double-mount on list).
- **Agente executor**: gt-ts-engineer (builders)
- **Data de conclusão**: 2026-07-19

---

## 🔍 Review Trail (preenchido pelo reviewer)

- **Reviewer**: independent Frontend Quality (`reviewers`) — full re-review
- **Data da review**: 2026-07-19
- **Veredito**: APROVADO
- **Score (path to 100)**: 100/100
- **Notas**: Source contract solid; inherit-only sabotage on new/[id] pages. Live `:22000` still pre-0075 bundle (deploy lag, not code). 0025 role-preset fail is EPIC-19 ownership. Stay 03-review.
- **Se REJEITADO**: mover para `02-doing/` com motivo no topo.

---

## Review Ledger

> [!IMPORTANT]
> Before path-to-100 work, read the latest full report and all reports listed
> under Previous Reports.

### Latest Review

- **Date**: 2026-07-19
- **Reviewer profile**: independent Frontend Quality (`reviewers`)
- **Score**: `100/100`
- **Verdict**: `ACCEPTED_100`
- **Full report**: `docs/reports/reviews/2026-07-19-task-0075-fusions-editor-routing-hub-subnav-independent-rereview.md`
- **Lane outcome**: stay `docs/tasks/03-review/` (ACCEPT 100/100)
- **Task reference**: Task 0075 (`omniroute-fusions-editor-routing-hub-subnav`); live path `docs/tasks/03-review/0075-omniroute-fusions-editor-routing-hub-subnav.md`

#### Current Open Blockers

- none (product). External: redeploy `:22000` to pick up residual polish; fix 0025 role-preset under EPIC-19/0082.

#### Path-to-100 Summary

- Inherit-only sabotage: `new/page` + `[id]/page` must not mount `RoutingHubSubnav` (client-only).

### Previous Reports

- `docs/reports/reviews/2026-07-19-task-0075-fusions-editor-routing-hub-subnav-frontend-quality-review.md` (builders parallel-review, 100/100)
