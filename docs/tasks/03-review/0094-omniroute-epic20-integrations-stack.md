# Task 0094: EPIC-20 T20-I — Integrations Stack (Webhooks → Context Sources → Plugins)

> **Status**: `[x]` Implemented — review accepted 100 (2026-07-20)
> **Priority**: 🔴 P0
> **Type**: `feature` + `remediation`
> **Action type**: UX_VIS + HARDEN
> **Origin**: EPIC-20 §2 locked topbar #7 `integrations`; §3 fusion; §5 path matrix (webhooks, plugins, endpoint?tab=context-sources); AGENTS.md Hard Rules #22–#23
> **Blocks**: soft-helps T20-N (Testing/Ops card retarget) and Endpoint T20-C (context-sources leave Endpoint strip)
> **Depends on**: **0086** hard; **0087** hard. **Do not start until 0086 completed**, or same wave with freeze (0086 first). Soft-coordinate with Endpoint fusion if it still owns context-sources tab until redirect.
> **Parallelism**: `parallel-safe` vs **0091–0093, 0095** if exclusive ownership; **serializable** after **0086/0087**; **careful serial** with Endpoint task on context-sources extract
> **Review routing**: independent Integrations PR; bundle with Endpoint task only if context-sources ownership collides

---

## Objective

Fuse **Webhooks → Context Sources → Plugins** into one Operations topbar peer **Integrations** as a vertical collapsible stack.

**Surfaces (locked):**

| Block (vertical order) | Legacy source |
|------------------------|---------------|
| 1. Webhooks | `/dashboard/webhooks` |
| 2. Context Sources | Endpoint tab `?tab=context-sources` (and `?tab=context`) inside `EndpointPageClient` |
| 3. Plugins | `/dashboard/plugins` (+ nested `plugins/[name]/config` may remain child routes under plugins or relative under integrations — prefer keep plugin deep routes working; document in Evidence) |

| Role | Path |
|------|------|
| Canonical | `/operations/integrations` (0086) |
| Legacy redirects | webhooks; plugins; endpoint context-sources tab → Integrations section |

**Done when:**

1. One Integrations peer: three collapsibles in order Webhooks → Context Sources → Plugins.
2. Context Sources UI **extracted or re-mounted** from Endpoint tab into this stack (Endpoint tab may redirect to Integrations — coordinate; do not leave dual L1 homes without redirect).
3. Explainers bottom collapsible default collapsed.
4. Only Ops hub peer `integrations` — no Webhooks/Plugins sub-topbar family.
5. Legacy paths redirect via 0086 (including endpoint context-sources query).
6. No new marketplace product features — re-home only.
7. Tests: order, redirects (incl. context-sources), anti-phantom, no-new-leaf.

**Out of this task:** Traffic Inspector (Observe), Memory, Skills, inventing plugin marketplace, full Endpoint fusion (Keys+Endpoint+Catalog — T20-C).

---

## Background Context

### O que já existe:

- Webhooks: `src/app/(dashboard)/dashboard/webhooks/` (`WebhooksPageClient`, wizard components, tests).
- Plugins: `src/app/(dashboard)/dashboard/plugins/page.tsx` + `plugins/[name]/config/`.
- Context Sources: tab inside `src/app/(dashboard)/dashboard/endpoint/EndpointPageClient.tsx` (`EndpointTab` includes `"context-sources"`; UI ~line 1325+).
- Hub: webhooks card on Ops; plugins historically under Testing hub (`testingHub.ts`) — EPIC-20 absorbs Testing into Ops Integrations/Labs.
- Collapsible primitive; webhook unit tests under `webhooks/__tests__/`.

### O que está faltando / quebrado:

- Integrations mental model split across Webhooks page, Endpoint third tab, Plugins/Testing.
- Context Sources buried under Endpoint strip (EPIC kills dual strip; context sources move here).
- No `/operations/integrations` peer.

### Explicitly out of scope:

- Webhook delivery backend / HMAC changes.
- Plugin install security model changes.
- Traffic Inspector.
- API Keys / API Catalog Endpoint fusion body (T20-C).

### Collision notes:

- **Endpoint T20-C**: owns Keys + Endpoint body + Catalog; **must not** keep context-sources as a permanent third tab without redirect once this task lands. Preferred: 0094 extracts mount; Endpoint tab value redirects to Integrations builder with section=context-sources if 0086 defines query. If T20-C not open yet, 0094 still implements redirect from `?tab=context-sources`.
- **T20-N Testing**: plugins card retarget after this page exists.
- **0095 Memory**: disjoint.

---

## Dependency & Parallel Safety

| Item | Value |
|------|--------|
| **Depends on** | **0086** hard · **0087** hard; soft Endpoint T20-C for clean tab removal |
| **File ownership (exclusive)** | Integrations fusion page; webhooks/plugins redirect shells; Context Sources extract module (new file under integrations or shared); endpoint tab branch **only** for context-sources redirect (minimal edit); tests `tests/unit/ui/epic20-integrations-0094.test.ts` |
| **Do not touch** | Endpoint APIs/catalog bodies beyond context-sources handoff; memory; skills; a2a |
| **Collision** | `EndpointPageClient.tsx` — **minimal** context-sources redirect/extract only; coordinate with T20-C |
| **parallel-safe** | Yes vs 0091–0093, 0095 if Endpoint edit is section-scoped |

---

## Test Requirements

- DEVE montar Webhooks → Context Sources → Plugins collapsibles com markers de ordem
- DEVE redirecionar `/dashboard/webhooks` e `/dashboard/plugins` → 0086 integrations builder
- DEVE redirecionar `/dashboard/endpoint?tab=context-sources` (e alias `context`) → Integrations context-sources section (0086 shape)
- DEVE preservar webhooks wizard + plugins list/marketplace UI functional mounts
- DEVE explainers bottom default collapsed
- DEVE ≤1 Ops topbar; no-new-leaf
- DEVE manter `plugins/[name]/config` reachable (redirect parent OK if child still works)
- NÃO DEVE inventar new plugin marketplace features
- NÃO DEVE leave context-sources only on Endpoint without redirect after this task

---

## Exit Conditions (GDD/TDD)

> npm matrix only — no cargo.

- [x] Integrations peer stack Webhooks → Context Sources → Plugins
- [x] Legacy webhooks + plugins + endpoint context-sources redirect to canonical
- [x] Explainers bottom collapsed by default
- [x] Anti-phantom ≤1 Ops topbar
- [x] Unit tests pass:
      `node --import tsx/esm --test tests/unit/ui/epic20-integrations-0094.test.ts`
- [x] Existing webhooks tests still pass if path-stable:
      `node --import tsx/esm --test` on webhooks unit/test paths grepped (or re-home import)
- [x] `npm run typecheck:core` passa sem erros
- [x] `npm run lint` passa sem erros novos nos arquivos tocados
- [x] Entrada no TOPO de `CHANGELOG.md` under `[Unreleased]`
- [x] Completion Evidence records Endpoint context-sources handoff disposition

---

## Details

### What

Subtasks:

- [x] **Ler código existente**: EPIC-20; 0086/0087; webhooks tree; plugins page + nested config; EndpointPageClient context-sources tab block; testingHub plugins entry; Collapsible
- [x] Confirm 0086 integrations builders + redirect rows (including endpoint tab)
- [x] Extract Context Sources UI into mountable section component if still inlined
- [x] Compose Integrations page three Collapsibles
- [x] Redirect shells for webhooks/plugins; endpoint tab → integrations
- [x] Bottom explainers
- [x] TDD matrix + anti-phantom
- [x] **Refactoring pass**: extract once; no duplicate Context Sources trees
- [x] **Verificação de regressão**: new + webhooks tests + typecheck:core + lint

### Where

| Arquivo | Propósito |
|---------|-----------|
| EPIC-20 | Ler |
| 0086 / 0087 | Ler |
| `src/app/(dashboard)/dashboard/webhooks/**` | Ler + redirect shell |
| `src/app/(dashboard)/dashboard/plugins/**` | Ler + redirect shell; keep nested config |
| `src/app/(dashboard)/dashboard/endpoint/EndpointPageClient.tsx` | Modificar — context-sources handoff/redirect only |
| Canonical `operations/.../integrations` | Criar |
| Context Sources section module (path TBD under endpoint/components or integrations) | Extrair/criar |
| `tests/unit/ui/epic20-integrations-0094.test.ts` | Criar |
| Root `CHANGELOG.md` | Unreleased |

### How

1. Gate on 0086 integrations id + redirects.
2. Extract Context Sources render block from Endpoint if needed.
3. Stack three sections; import WebhooksPageClient + Plugins client + Context Sources section.
4. Endpoint: when tab is context-sources → redirect to integrations builder (do not leave dual full UI without epic dual-serve exception).
5. Tests encode all three legacy paths.

### Why

Integrations is how OmniRoute connects outward (events, context backends, plugins). Splitting them across Endpoint + Testing + Webhooks is not self-evident.

---

## Parallelism / file ownership

| Class | Detail |
|-------|--------|
| **parallel-safe** | 0091–0093, 0095 (with Endpoint section lock) |
| **serializable** | After 0086 + 0087; soft-serial with Endpoint T20-C on `EndpointPageClient` |
| **Collision** | `EndpointPageClient.tsx` context-sources only |

---

## ⛔ Anti-Hallucination Guardrails

> [!CAUTION]
> DO NOT rewrite webhook signing or plugin install security.  
> DO NOT absorb Traffic Inspector here.  
> DO NOT start without 0086.  
> DO NOT add primary leaves for webhooks/plugins.  
> PORT 21000 = production.

> [!IMPORTANT]
> Record Endpoint handoff in Completion Evidence.  
> Hard Rule #22: single Integrations peer under Ops topbar.

---

## 🛡️ Compliance Checklist (Leis Primárias do AGENTS.md)

- [ ] **Doc Accuracy**: Redirects match 0086
- [ ] **Zod Validation**: N/A pure chrome
- [ ] **Security**: Plugins may spawn — preserve local-only route guard classifications; do not expose new remote install vectors
- [ ] **Error Sanitization**: Preserve
- [ ] **No Raw SQL**: N/A
- [ ] **Archive Protocol**: Extract + redirect

---

## 📋 Completion Evidence (preenchido pelo agente executor)

- **Arquivos**:
  - `src/app/(dashboard)/operations/integrations/page.tsx` — canonical peer route
  - `src/app/(dashboard)/operations/integrations/IntegrationsPageClient.tsx` — stack Webhooks → Context Sources → Plugins + explainers
  - `src/app/(dashboard)/operations/integrations/ContextSourcesSection.tsx` — extract Notion + Obsidian
  - `src/app/(dashboard)/dashboard/plugins/PluginsPageClient.tsx` — re-home of plugins UI
  - `src/app/(dashboard)/dashboard/plugins/page.tsx` — redirect shell → `buildOperationsPath("integrations")`
  - `src/app/(dashboard)/dashboard/webhooks/page.tsx` — redirect shell → integrations
  - `src/app/(dashboard)/operations/[segment]/page.tsx` — dynamic fallback mounts Integrations
  - `src/app/(dashboard)/dashboard/endpoint/page.tsx` — already redirects `tab=context-sources|context` → integrations (0088/0094)
  - Endpoint dual UI: `NotionSourceCard` / context-sources tab body removed from `EndpointPageClient` (handoff; 0088 owns residual APIs-only body)
  - Tests: `tests/unit/ui/epic20-integrations-0094.test.ts`; adjusted `sidebar-visibility.test.ts`, `dashboard-shell-tabs.test.ts`
- **Endpoint handoff disposition**: Context Sources **extracted** to Integrations; legacy `?tab=context-sources` / `context` **server-redirect** to `/operations/integrations`; no dual full Context Sources UI on Endpoint. Residual Endpoint dual-strip cleanup remains 0088 ownership; 0094 does not re-mount Notion under Endpoint.
- **Testes**:
  - `node --import tsx/esm --test tests/unit/ui/epic20-integrations-0094.test.ts` — **21/21 pass**
  - Related: `sidebar-visibility.test.ts`, `dashboard-shell-tabs.test.ts`, hub discoverability 0059/0060 — pass
  - `npm run typecheck:core` — pass
  - ESLint on touched files — 0 errors (1 pre-existing any warn in sidebar-visibility)
- **Outputs**: Webhooks wizard vitest suite is Vitest-only (not Node native); path-stable client kept under `webhooks/WebhooksPageClient.tsx`
- **Changelog**: root `CHANGELOG.md` `[Unreleased]` → Added EPIC-20 Integrations stack (0094)
- **Agente**: gt-ts-engineer (builders)
- **Data**: 2026-07-20
- **Status**: leave in `02-doing` per operator (not moved)

---

## 🔍 Review Trail (preenchido pelo reviewer)

- **Reviewer**: `gt-frontend-quality-reviewer` (parent `builders`)
- **Data da review**: 2026-07-20
- **Veredito**: `ACCEPTED_100` — move `02-doing` → `03-review`
- **Score (path to 100)**: **100/100**
- **Report**: `docs/reports/reviews/2026-07-20-task-0094-0095-0096-epic20-integrations-memory-labs-frontend-review.md`
- **Notas**: Stack Webhooks → Context Sources → Plugins under layout-owned Ops topbar; Context Sources extracted; endpoint/webhooks/plugins redirects via 0086; plugins config deep route live; 21/21 unit. Non-blocking residual: Header peer title catch-all (0100 polish).
