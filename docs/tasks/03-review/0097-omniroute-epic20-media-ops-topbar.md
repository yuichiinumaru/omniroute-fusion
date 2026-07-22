# Task 0097: EPIC-20 T20-L — Media under Operations Topbar (`/operations/media`)

> **Status**: `[x]` Implemented (leave in 02-doing for review)  
> **Priority**: 🔴 P0  
> **Type**: `feature` + `remediation`  
> **Action type**: UX_VIS + HARDEN  
> **Origin**: EPIC-20 §2 topbar #10 `media`, §4 Labs rules (“Media own topbar peer”), §5 path matrix — `docs/tasks/00-planning/EPIC-20-omniroute-operations-hub-reform.md`  
> **Blocks**: **0099** (Testing retire expects Media deep link), hard-helps **0100**  
> **Depends on**: **T20-A / T20-B** (0086/0087 when open) **hard**  
> **Parallelism**: `parallel-safe` vs **0096** Labs if file ownership held; `serializable` before **0099**/**0100**  
> **Review routing**: independent  

---

## Objective

Promote the media generation lab from the legacy cache path into **Operations topbar peer `media`**, preserving the **modality L1 strip** (Image / Video / Music / TTS / Transcription) as **the** Media page chrome content — still one topbar family under the Media peer (not a second Ops hub topbar, not nested under Labs).

| Item | Target |
|------|--------|
| Canonical path | `/operations/media` (alias only if T20-A freezes dual-write) |
| Legacy redirect | `/dashboard/cache/media` → Media canonical |
| Modality strip | Keep Image/Video/Music/Speech/Transcription as **Media topbar content** (L1 **inside** Media peer) |
| Labs relationship | Media is **peer #10**, never a Labs collapsible |

**Done when:**

1. Media is reachable as Ops topbar peer `media`.  
2. Modality switcher remains the primary in-page chrome for modalities (not demoted to buried tabs without L1 affordance).  
3. Legacy `/dashboard/cache/media` redirects cleanly.  
4. Ops hub topbar mount count ≤ 1 on Media route (modality strip ≠ second hub topbar component).  
5. Sidebar **Operations** will light on `/operations/media` (full matrix may land in **0100**, but path prefix must be Operations-owned).  
6. Generation registries/API wiring unchanged in behavior.

---

## Background Context

### O que já existe:

- Live page: `src/app/(dashboard)/dashboard/cache/media/page.tsx` + `MediaPageClient.tsx`.  
- Modalities: `image | video | music | speech | transcription` with in-page modality tabs (~L734+).  
- Registries: image/video/music/audio from `@omniroute/open-sse/config/*`.  
- Testing hub lists Media under batch-media group: `testingHub.ts` → `/dashboard/cache/media`.  
- Command palette media extra → same legacy href.  
- EPIC-20: Media is **not** inside Labs (item 10).

### O que está faltando / quebrado:

- Path is under **cache** mental model (`/dashboard/cache/media`) while product is a generation lab.  
- Not an Operations topbar peer.  
- Testing hub still owns discoverability.  
- No redirect SSoT row for media → `/operations/media`.

### Explicitly out of scope:

- Labs fusion (**0096**).  
- Plugins/batch business rewrites.  
- New media providers/models.  
- Full Testing hub retirement (**0099**).  
- Observe Traffic (**0098**).  
- Redesigning generation forms beyond chrome re-home.

### Collision notes:

- **0096** must not absorb Media.  
- **0099** updates Testing cards/palette after this lands.  
- Do not remove modality L1 — EPIC locks it as Media’s content topbar.

---

## Dependency & Parallel Safety

| Item | Value |
|------|--------|
| **Depends on** | T20-A/B hard |
| **Blocks** | 0099 Media deep-link readiness; 0100 Media chrome row |
| **File ownership** | Media route under Ops shell; redirect from `cache/media`; media-specific tests `tests/unit/ui/epic20-media-ops-0097.test.ts` |
| **Do not touch** | Labs page composition (**0096** exclusive); Observe (**0098**); full palette retire (**0099**) |
| **parallel-safe** | Yes vs 0096/0098 when disjoint |

---

## Test Requirements

- DEVE expor Media como peer Ops topbar `media` (href = T20-A builder)  
- DEVE manter modality L1 (Image/Video/Music/Speech/Transcription) como chrome **do conteúdo Media** — assert presence of modality controls after re-home  
- DEVE redirecionar `/dashboard/cache/media` → canonical Media path  
- DEVE assertir Operations hub topbar mount **≤ 1** on Media route (modality strip is **not** counted as a second **hub** `PageTabBar`/Ops topbar)  
- DEVE **não** listar Media como bloco collapsible de Labs  
- DEVE **não** adicionar primary sidebar leaf `media`  
- DEVE preservar generation endpoints wiring (`/api/v1/images|videos|music|audio/...`) — smoke or unit that modality configs still resolve registries  
- NÃO DEVE alterar authz de rotas API de mídia sem necessidade  

---

## Exit Conditions (GDD/TDD)

> OmniRoute npm matrix — see `docs/tasks/OMNIROUTE-CREATE-TASKS-EXITS.md`.

- [x] Canonical `/operations/media` (or frozen alias) renders Media generation UI under Ops shell  
- [x] Modality L1 strip present and functional (5 modalities)  
- [x] `/dashboard/cache/media` redirects to canonical Media  
- [x] Unit tests pass:  
      `node --import tsx/esm --test tests/unit/ui/epic20-media-ops-0097.test.ts`  
- [x] Chrome ≤1 Ops hub topbar on Media route  
- [x] No new primary leaf `media`  
- [x] `npm run typecheck:core` passa sem erros  
- [x] `npm run lint` passa sem erros novos nos arquivos tocados  
- [x] Entrada no TOPO de `CHANGELOG.md` under `[Unreleased]`  
- [x] Completion Evidence filled (files, redirects, modality assertion)  
- [x] Live checks only on :22000 if requested — never :21000  

---

## Details

### What

Subtasks:

- [x] **Ler código existente**: EPIC-20 §2/#10 + §5; T20-A/B builders; `cache/media/MediaPageClient.tsx` + `page.tsx`; `testingHub.ts` media row; CommandPalette media entry; Ops shell mount pattern; collapsible/topbar primitives  
- [x] Mount Media under Ops topbar peer using T20-A path  
- [x] Preserve modality L1 as Media content chrome (document data-testid or role if needed for tests)  
- [x] Redirect legacy `/dashboard/cache/media`  
- [x] Unit tests: redirect + peer id + modality presence + chrome ≤1 + no-new-leaf  
- [x] **Refactoring pass**: move/re-export client; avoid logic rewrite  
- [x] **Verificação de regressão**: Exit Conditions  

### Where

| Arquivo | Propósito |
|---------|-----------|
| EPIC-20 planning | Ler |
| T20-A path builders / topbar ids | Consumir `media` |
| T20-B Ops shell | Host topbar |
| `src/app/(dashboard)/…/operations/media/**` | Criar — Media under Ops |
| `src/app/(dashboard)/dashboard/cache/media/page.tsx` | Redirect wrapper |
| `src/app/(dashboard)/dashboard/cache/media/MediaPageClient.tsx` | Mover/re-export/composar |
| `src/shared/constants/testingHub.ts` | Ler (0099 updates cards) |
| `tests/unit/ui/epic20-media-ops-0097.test.ts` | Criar |
| `CHANGELOG.md` | Unreleased |

### How

1. Use T20-A `media` builder.  
2. Place `MediaPageClient` under Ops shell route.  
3. Keep modality strip as the Media L1 content chrome (single visual strip under Ops topbar).  
4. Redirect `cache/media`.  
5. Tests.  

### Why

Media is a first-class Ops surface, not a cache leftover or Labs afterthought. Self-evident path + one chrome family fixes the “hidden under Testing/cache” IA failure.

---

## Parallelism / file ownership

| Class | Detail |
|-------|--------|
| **parallel-safe** | 0096 Labs, 0098 Traffic→Observe |
| **serializable** | After T20-A/B; before 0099/0100 |
| **Collision** | Ops shell; CommandPalette media href (prefer 0099 for palette bulk) |

---

## ⛔ Anti-Hallucination Guardrails

> [!CAUTION]
> DO NOT fold Media into Labs.  
> DO NOT remove modality L1 strip.  
> DO NOT invent paths outside T20-A.  
> DO NOT add sidebar leaf `media`.  
> PORT 21000 = production — do not touch.

> [!IMPORTANT]
> Hard Rules #22–#23: one Ops hub topbar; modality strip is **content** of Media peer, not a second hub.  
> Archive-not-delete: redirect legacy route.

---

## 🛡️ Compliance Checklist (Leis Primárias do AGENTS.md)

- [x] **Doc Accuracy**: paths grepped  
- [x] **Zod Validation**: query params if added (none)  
- [x] **Security**: no secret/API key exposure in UI  
- [x] **Error Sanitization**: N/A unless error UI touched  
- [x] **No Raw SQL**: N/A  
- [x] **Archive Protocol**: redirect legacy media URL  

---

## 📋 Completion Evidence (preenchido pelo agente executor)

- **Arquivos criados/modificados**:  
  - `src/app/(dashboard)/operations/media/page.tsx` (canonical Media peer page)  
  - `src/app/(dashboard)/operations/media/MediaPageClient.tsx` (moved client + modality L1 testids)  
  - `src/app/(dashboard)/operations/[segment]/page.tsx` (media branch mounts client)  
  - `src/app/(dashboard)/dashboard/cache/media/page.tsx` (server redirect → `buildOperationsPath("media")`)  
  - `src/app/(dashboard)/dashboard/cache/media/MediaPageClient.tsx` (archive re-export)  
  - `src/shared/components/Header.tsx` (title matcher for `/operations/media`)  
  - `tests/unit/ui/epic20-media-ops-0097.test.ts`  
  - `CHANGELOG.md` `[Unreleased]`  
- **Testes**: `node --import tsx/esm --test tests/unit/ui/epic20-media-ops-0097.test.ts` (17/17 pass); regression: 0087 shell + 0060 testing hub + 0083 tools-ops verify (37/37)  
- **Resultado dos testes**: pass  
- **Lint / typecheck**: `npm run typecheck:core` clean; eslint on touched files clean  
- **Redirect row**: `/dashboard/cache/media` → `/operations/media` (`buildOperationsPath("media")`, matrix ownerTask 0097)  
- **Modality assertion**: `data-testid="media-modality-strip"` + 5 modalities (image/video/music/speech/transcription); endpoints `/api/v1/images|videos|music|audio/...` preserved  
- **Chrome**: Ops layout sole `<OperationsTopbar />`; Media page does not mount hub PageTabBar/Ops topbar  
- **Changelog**: Added under `[Unreleased]`  
- **Agente / data**: gt-ts-engineer / 2026-07-20  
- **Note**: left in `02-doing` per operator; Testing hub + CommandPalette media href bulk update deferred to **0099**

---

## 🔍 Review Trail (preenchido pelo reviewer)

- **Reviewer**: `gt-frontend-quality-reviewer` (parent `builders`)
- **Data da review**: 2026-07-20
- **Veredito**: `ACCEPTED_100` — move `02-doing` → `03-review`
- **Score (path to 100)**: **100/100**
- **Report**: `docs/reports/reviews/2026-07-20-task-0097-epic20-media-ops-review.md`
- **Bundle blast-radius**: `docs/reports/reviews/2026-07-20-tasks-0097-0098-epic20-bundle-blast-radius.md`
- **Notas**: Canonical `/operations/media` under layout-hosted Ops topbar; modality L1 is content chrome (not second hub strip); legacy cache redirect via builder; no Labs absorb; no primary leaf. Testing/palette href bulk deferred to **0099** (R1). Unit 17/17; typecheck:core + eslint clean.
