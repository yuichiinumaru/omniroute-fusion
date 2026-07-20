# Wave 3 — Help / nomenclature residual verification

> **Agent**: gt-archivist (+ lightweight UI docs check)  
> **Date**: 2026-07-19  
> **Scope**: In-app Help wiki · noob-prose hubs · naming collisions · `/docs` leaf vs internal wiki  
> **Method**: `docs/guides/UI.md`, `NAV-TREE-TARGET.md`, hub SSoTs, sample hub clients, greps for help primitives  
> **Constraint**: Report only — no product code, no tasks, no `:21000` touch

---

## 1. Executive summary

| Residual | Verdict | Severity | One-line |
|----------|---------|----------|----------|
| **R-HELP-01** In-app Help wiki (`?` → modular article) | **ABSENT** (pattern Partial only) | P2 product UX | No article registry / drawer / slug help system; only tooltips + concept cards + Fumadocs |
| **R-HELP-02** Noob long prose dominating key hubs | **PARTIAL residual** | P2 UX | Concept walls still always-on (skills dual, translator, combos non-expert); hubs themselves mostly short |
| **R-NAME-01** Proxy vs endpoints | **CONFIRMED collision** | P2 nomenclature | ≥4 “proxy” senses + “Endpoints” page labeled as proxy surfaces |
| **R-NAME-02** MCP OmniRoute server vs “MCPs” | **SCOPED** | P3 | Single “MCP Server” control surface; plugins subtitle disambiguates; no dual “MCPs” leaf |
| **R-NAME-03** Dual skills (agent vs omni) | **CONFIRMED intentional dual** | P2 discoverability | Two routes + always-on comparison table; not accidental dual-nav |
| **R-DOCS-01** Docs leaf external vs internal wiki | **CONFIRMED design split** | P3 IA/docs | Sidebar leaf `#9` → same-origin `/docs` with `external: true` (new tab Fumadocs), not contextual wiki |

**Bottom line:** Wave 3 does **not** invent a greenfield help product that already exists. The NAV target “in-context `?` replacing noob walls” remains **Partial**. Residual work is **nomenclature + progressive disclosure + optional deep-link help**, not a second docs engine.

**Verdict:** **NEEDS DOC FIX** (NAV / UI.md Partial claims) + optional **EPIC-style product polish** (see §6 INCLUDE/DEFER/REJECT).

---

## 2. Authority checked

| Surface | Path | Role |
|---------|------|------|
| IA rules + primary chrome | `docs/guides/UI.md` §2.1 (9 leaves incl. `docs`) | No-new-leaf; Docs is primary leaf #9 |
| Target map Help L2 | `docs/architecture/NAV-TREE-TARGET.md` L0·9 · L2 “In-context `?` help…” | Status **Partial** |
| Live sidebar | `src/shared/constants/sidebarVisibility.ts` → `PRIMARY_SIDEBAR_ITEMS` | `docs` `href="/docs"` **`external: true`** |
| Operations hub SSoT | `src/shared/constants/operationsHub.ts` | Labels: Endpoints, MCP Server, Agent Skills, Omni Skills |
| Observe proxy source | `src/shared/constants/observeHub.ts` | `source=proxy` = outbound logs |
| Prior UX investigation | `docs/reports/2026-07-12-omniroute-ux-design-investigation.md` §VI | “tirar noob-friendly”; wiki modular = Partial |
| Wave 2 IA residual | `docs/reports/audits/2026-07-19-wave2-frontend-ia-residual-investigation.md` | Chrome gaps (EPIC-13); not help wiki |
| Wave 3 epic plan | `docs/reports/audits/2026-07-19-architect-orchestrator-wave-synthesis.md` | EPIC-10–14 only; no help/nomenclature epic yet |

---

## 3. R-HELP-01 — In-app Help wiki (`?` → article)

### Claim under test

Operators expect: click `?` on a hub control → modular in-app article (wiki-style), not a permanent prose wall.

### Evidence

| Check | Result |
|-------|--------|
| `HelpArticle` / `HelpDrawer` / `PageHelp` / `helpSlug` / `openArticle` components | **0 hits** under `src/` product UI |
| `FieldLabelWithHelp` | Exists — **string tooltip only** (`help` icon + `Tooltip`), combos form only |
| `InfoTooltip` | Exists — **string hover only** (`info` icon), not article |
| Skills / CLI / Translator “concept” surfaces | **On-page cards**, not modular docs |
| Fumadocs | Full app at `src/app/docs/**` + MDX under `docs/` | Encyclopedia, not contextual `?` |
| NAV-TREE L2 | Explicitly **Partial** for in-context `?` help |

```24:28:src/app/(dashboard)/dashboard/combos/FieldLabelWithHelp.tsx
      {showHelp && (
        <Tooltip position="bottom" content={help}>
          <span className="material-symbols-outlined text-[12px] text-text-muted cursor-help">
            help
```

### Verdict

**ABSENT as a product pattern.** Partial mitigations exist (tooltips, concept cards, Fumadocs). Do not document an “in-app Help wiki” as shipped.

---

## 4. R-HELP-02 — Noob-friendly long prose on key hubs

### Sample matrix

| Hub / surface | Prose posture | Residual? |
|---------------|---------------|-----------|
| **Operations** `/dashboard/operations` | One short intro paragraph + card one-liners | Low — acceptable hub copy |
| **Agent Skills** | Full `SkillsConceptCard` comparison table **always visible** (5 rows) | **Yes** — nomenclature wall |
| **Omni Skills** | Same card, opposite variant | **Yes** |
| **Translator** | Friendly headline + collapsible “How it works” | Medium — progressive disclosure OK |
| **CLI / ACP** | `CliConceptCard` short phrase + cross-chips | Low–medium |
| **Combos builder** | Non-expert: strategy descriptions + many `FieldLabelWithHelp`; **expert mode hides help** | Medium — intentional dual-mode, not hub-level wall |
| **Fusions list** | One empty-state description line | Low |
| **Docs home** `/docs` | “For Non-Tech Users” section framing | Marketing-oriented (docs product, not dashboard hub) |

Agent skills i18n still ships multi-sentence outbound/inbound explanations in `conceptCard.*.description` (card currently emphasizes title + full comparison table; wall remains).

### Verdict

**PARTIAL residual CONFIRMED.** Primary hubs (Operations, Routing strip, Observe) are not encyclopedias. **Dual-skills concept wall** and **combos non-expert** still dominate specialist surfaces. Matches NAV demote policy “noob How it works → compact + docs” as **Policy / incomplete**.

---

## 5. Naming collisions

### 5.1 R-NAME-01 — Proxy vs endpoints

| Sense | Live location | Operator meaning |
|-------|---------------|------------------|
| **AI endpoints** (client base URLs, catalog, tunnels, context sources) | `/dashboard/endpoint` · Ops card “Endpoints” · desc “**Proxy** endpoints and context sources” | What apps point at |
| **Outbound network proxy** | `/dashboard/system/proxy` (`ProxyTab`) | Upstream HTTP(S) egress |
| **Observe proxy stream** | `/dashboard/activity?source=proxy` | Outbound traffic logs |
| **MITM / 1Proxy** | `/dashboard/system/mitm-proxy`, `…/1proxy` | Interception / public gateway |
| **Embedded CLIProxyAPI** | Providers services | Local process, not “the endpoint page” |

Group title **“API / Endpoints”** also mixes API Keys, Endpoints, Catalog, MCP Server, A2A Server — high cognitive load.

**Verdict: CONFIRMED.** Collision is real; not fixed by Task 0024 Connect SSoT (that fixed dual **catalog** home only).

### 5.2 R-NAME-02 — MCP OmniRoute server vs “MCPs”

| Surface | Label | Notes |
|---------|-------|-------|
| Ops hub | **“MCP Server”** → `/dashboard/mcp` | OmniRoute’s control-plane MCP tools/transports |
| Sidebar / i18n | `mcpSubtitle`: tools, scopes, server controls | Singular server |
| Plugins | `pluginsSubtitle`: “Installable dashboard plugins **(not MCP tools)**” | Explicit disambiguation |
| Agent skills | MCP URL / A2A link cards | Protocol discovery, not multi-MCP client manager |

**Verdict: SCOPED.** No second primary “MCPs” marketplace leaf. Residual is **language** (docs, skills, plugins adjacency), not dual chrome. Separately, Wave 2 still has **count drift** (live ~93 tools / 31 scopes vs docs 94/30) — docs hygiene, not this residual class.

### 5.3 R-NAME-03 — Agent Skills vs Omni Skills

| | Agent Skills | Omni Skills |
|--|--------------|-------------|
| Route | `/dashboard/agent-skills` | `/dashboard/omni-skills` |
| Direction | Outbound SKILL.md for external agents | Inbound sandbox tools for models |
| Ops labels | “Outbound SKILL.md for external agents” | “Inbound sandbox tools for model requests” |
| UI mitigation | Shared `SkillsConceptCard` cross-link + comparison | Same |

**Verdict: CONFIRMED intentional dual.** Not a dual-nav bug. Residual = **two similar names** + **always-on comparison wall** instead of short badges + `?` → docs.

---

## 6. R-DOCS-01 — Docs leaf `/docs` external vs internal wiki

```417:423:src/shared/constants/sidebarVisibility.ts
    id: "docs",
    href: "/docs",
    i18nKey: "docs",
    labelFallback: "Docs",
    subtitleFallback: "Guides · changelog",
    icon: "menu_book",
    external: true,
```

| Fact | Evidence |
|------|----------|
| Primary leaf #9 | UI.md §2.1 + `PRIMARY_SIDEBAR_ITEMS` |
| Same-origin Fumadocs | `src/app/docs/page.tsx`, `[...slug]/page.tsx`, `docs/**/*.md` |
| `external: true` behavior | `Sidebar.tsx` → `<a target="_blank" rel="noopener noreferrer">` |
| Not GitHub wiki | No external wiki URL on this leaf |
| Not contextual in-page wiki | Opens docs shell in **new tab**; no hub-local article strip |

July-12 investigation already graded “Wiki-style modularized docs” as **partially aligned** (Fumadocs modular sections ≠ dashboard `?` wiki).

### Verdict

**Docs leaf = Fumadocs encyclopedia (new tab). Internal wiki pattern for hubs = still missing.** Document this split in UI.md so agents stop planning a second engine “as if shipped.”

---

## 7. Relationship to EPIC-13 / Wave 2 IA

| EPIC-13 residual | Overlap with this audit |
|------------------|-------------------------|
| Routing strip on fusion editor | Chrome continuity — **out of help/nomenclature scope** |
| Ops/Testing reverse chrome | Discoverability — **adjacent**, not prose/wiki |
| Fusions list acting chip | Product discoverability — **adjacent** |

**Do not fold help/nomenclature into EPIC-13** without scope bloat. EPIC-13 remains peer-route chrome; help/nomenclature is a separate polish epic if promoted.

---

## 8. INCLUDE / DEFER / REJECT (EPIC-18-style work)

Suggested framing if Wave 3 promotes a help/nomenclature epic (numbering free after EPIC-14; “EPIC-18-style” = **Help · nomenclature · progressive disclosure**, not chrome matrix):

### INCLUDE (worth a scoped epic / child tasks)

| ID | Recommendation | Why | Parallel-safe vs EPIC-13? |
|----|----------------|-----|---------------------------|
| **I-1** | Document glossary in `docs/guides/UI.md` (or short `docs/guides/NOMENCLATURE.md`): Endpoints vs Network Proxy vs Observe proxy vs MITM/1Proxy; MCP Server (OmniRoute) vs plugins; Agent Skills vs Omni Skills | Cheap truth layer; prevents re-fabrication | Yes |
| **I-2** | Ops hub copy pass: rewrite “Proxy endpoints…” → “Client API base URLs & context sources”; keep “Network / Proxy” for `/dashboard/system/proxy` | High confusion, low code risk | Yes |
| **I-3** | Progressive disclosure for `SkillsConceptCard`: collapsed-by-default or dismissible “once understood”; leave one-line badge (Outbound / Inbound) always visible | Directly attacks R-HELP-02 + R-NAME-03 wall | Yes |
| **I-4** | Optional shared `PageHelp` primitive: `?` opens **Fumadocs deep-link** (`/docs/...#…`) in drawer or new tab — **no second CMS** | Closes NAV Partial without inventing wiki storage | Mostly yes (UI primitive) |
| **I-5** | Explicit product decision + UI.md note: docs leaf `external: true` (new tab) is intentional **or** flip to in-app `Link` | Removes IA ambiguity | Yes |
| **I-6** | Expand expert-mode / compact help pattern from combos to other builder walls (where already dual-mode) | Reuse existing pattern | Case-by-case |

### DEFER

| ID | Recommendation | Why defer |
|----|----------------|-----------|
| **D-1** | Full modular in-app article registry (markdown snippets in SQLite, versioned help IDs) | Overlaps Fumadocs; high cost; NAV Partial can close via I-4 |
| **D-2** | Merge agent-skills + omni-skills into one dual-tab page | Product identity change; needs operator decision beyond polish |
| **D-3** | Global rename of all “proxy” strings/APIs | Blast radius (i18n 42 locales, APIs, logs, agent skills catalog) |
| **D-4** | External MCP client multi-server manager UI | Not a residual of shipped dual leaf; feature request |

### REJECT

| ID | Recommendation | Why reject |
|----|----------------|------------|
| **X-1** | Parallel “Help wiki” engine competing with Fumadocs | Violates “prefer short accuracy”; dual doc SSOT |
| **X-2** | New primary sidebar leaf “Help” | Violates UI.md invariant #1 (no new default leaf) |
| **X-3** | Claim Help wiki already shipped in docs/marketing | Fabrication vs R-HELP-01 |
| **X-4** | Fold all of this into EPIC-13 without rename | Mixes chrome matrix with copy/glossary; review noise |

---

## 9. Findings (path:line style)

## Findings

- `docs/architecture/NAV-TREE-TARGET.md:194` — L2 “In-context `?` help replacing noob walls” still **Partial**; no implementation of article-backed help.
- `src/shared/constants/sidebarVisibility.ts:417-423` — Docs leaf is primary chrome to `/docs` with **`external: true`** (new tab), not an in-dashboard wiki.
- `src/shared/components/Sidebar.tsx:280-294` — External items open `target="_blank"`; docs leaves the dashboard shell.
- `src/app/(dashboard)/dashboard/combos/FieldLabelWithHelp.tsx:24-28` — `?`/`help` is tooltip string only, not modular docs.
- `src/shared/components/SkillsConceptCard.tsx:26-79` — Always-on 5-row dual-skills wall on agent/omni pages (`AgentSkillsPageClient.tsx` / `OmniSkillsPageClient.tsx` mount).
- `src/shared/constants/operationsHub.ts:46-49` — “Endpoints” described as “**Proxy** endpoints…” colliding with network proxy.
- `src/shared/constants/operationsHub.ts:61-66` + `148-159` — MCP singular “MCP Server”; dual skills correctly split but both labeled “Skills*”.
- `src/app/(dashboard)/dashboard/system/proxy/page.tsx:1-6` — Network proxy is a **separate** surface from `/dashboard/endpoint`.
- `docs/guides/UI.md` — Documents Docs leaf + anti-patterns; **does not** document glossary or “no Help wiki yet” guardrail.
- `docs/reports/audits/2026-07-19-architect-orchestrator-wave-synthesis.md:90-99` — EPIC-10–14 plan has **no** help/nomenclature epic; promote only if operator wants I-* work.

## Knowledge Hygiene

- Add glossary pointer under UI.md § Related docs **or** short nomenclature note if I-1 is accepted.
- Keep NAV-TREE L2 status **Partial** until I-3/I-4 land; do not mark Complete from tooltips alone.
- Do not archive Fumadocs paths; they remain SSoT long-form docs.
- Cross-link this report from EPIC-13 only as **out-of-scope adjacency**, not child acceptance criteria.
- Count drift (MCP 93/31 vs docs 94/30) remains Wave 2 docs hygiene — track under docs-sync, not this epic.

## Verdict

**NEEDS DOC FIX** (document Partial help pattern + nomenclature glossary; do not claim in-app Help wiki shipped)

Optional product follow-up (operator-gated): **INCLUDE I-1…I-6** as a new help/nomenclature epic; **DEFER D-1…D-4**; **REJECT X-1…X-4**.

---

## 10. Source inventory (this pass)

| File | Used for |
|------|----------|
| `docs/guides/UI.md` | 9-leaf IA, Docs leaf, anti-patterns |
| `docs/architecture/NAV-TREE-TARGET.md` | Help L2 Partial; demote noob walls |
| `src/shared/constants/sidebarVisibility.ts` | `docs` external |
| `src/shared/constants/operationsHub.ts` | Ops labels / collisions |
| `src/shared/constants/observeHub.ts` | proxy source sense |
| `src/shared/components/Sidebar.tsx` | external → new tab |
| `src/shared/components/SkillsConceptCard.tsx` | dual skills wall |
| `src/shared/components/InfoTooltip.tsx` | non-wiki help |
| `src/app/(dashboard)/dashboard/combos/FieldLabelWithHelp.tsx` | `?` tooltip |
| `src/app/(dashboard)/dashboard/operations/OperationsHubClient.tsx` | hub prose sample |
| `src/app/(dashboard)/dashboard/translator/components/TranslatorConceptCard.tsx` | collapsible how-it-works |
| `src/app/docs/page.tsx` | Fumadocs home framing |
| `src/app/(dashboard)/dashboard/system/proxy/page.tsx` | network proxy surface |
| `src/i18n/messages/en.json` (`agentSkills.conceptCard`, sidebar subtitles) | copy evidence |
| Prior audits (Wave 2 IA, orchestrator synthesis, 2026-07-12 UX) | continuity |

---

*End of residual verification — report only.*
