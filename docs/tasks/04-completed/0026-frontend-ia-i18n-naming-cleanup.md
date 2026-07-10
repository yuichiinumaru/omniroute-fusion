# Task 0026: Frontend IA — i18n / Naming Cleanup (S7)

> **Status**: `[x]` Completed (implementation complete — awaiting parent review / move)
> **Priority**: 🟡 P1
> **Type**: `feature`
> **Origin**: Epic 0005 — Frontend IA Reform (slice **S7**)
> **Action type**: UX_VIS
> **Blocks**: none (soft improves Task 0025 UX if sequenced after pillar titles)
> **Depends on**: none hard (Wave 1 complete); **coordinate** with Task 0025 if both edit `sidebar.*` keys
> **Parallel group**: A (parallelizable with 0023/0024/0027–0029; merge carefully with 0025)

---

## Objective

Fix **naming debt** that confuses operators even after IA collapse:

| Ambiguity | Problem | Target direction |
|-----------|---------|------------------|
| Usage vs Analytics | Overlapping product language | Distinct labels: Analytics hub vs usage/billing surfaces |
| Storage vs general settings | “Storage” sounds like object store | Clarify system/data storage vs general settings |
| Skills triad | Skills / agent skills / plugins mixed | Disambiguate labels + subtitles |
| Proxy vs Proxy Logs vs Embedded Services | Network outbound vs log stream vs local services | Rename Proxy → Network / Outbound (or equivalent); logs live under Observe |
| Compression Context jargon | Engine names as product menu copy | Hub-oriented labels (engines not menus — already S3) |

Update `src/i18n/messages/en.json` (`sidebar.*` and related page titles) and keep other locales consistent with project i18n policy (en source of truth; sync or mark keys for `check:i18n` / coverage gates).

## Background Context

### What already exists:
- Sidebar labels in `src/i18n/messages/en.json` under `sidebar.*`
- Epic 0005 §3B item 7 naming debt table
- Wave 1 structure partially reduced (fewer leaves → fewer labels to fix)

### What is missing:
- Consistent operator vocabulary across sidebar + page H1s + breadcrumbs
- Explicit rename for Proxy cluster

### Out of scope:
- Full 42-locale human translation rewrite (follow repo i18n gates / key sync only)
- Seven-pillar structural rebuild (Task 0025)
- Changing route paths unless required for label-only consistency (prefer i18n-only)

---

## Test Requirements

- MUST change English source strings for the debt table rows (measurable: before/after key values in Completion Evidence)
- MUST NOT leave orphan keys that break `sidebarVisibility` `i18nKey` references
- MUST pass project i18n checks applicable to changed keys (`npm run` scripts used by CI for i18n — run the ones that apply; document in evidence)
- MUST add or extend a small unit/snapshot test if the repo already patterns sidebar label contracts; otherwise document manual matrix of label strings
- MUST NOT rename design-token CSS variables or provider IDs — labels only

---

## Exit Conditions (GDD/TDD)

- [x] Naming debt table rows addressed in `en.json` (and page titles if hardcoded English)
- [x] Proxy cluster labels disambiguated (Network/Outbound vs logs vs services)
- [x] Usage vs Analytics strings no longer interchangeable in sidebar subtitles
- [x] Skills triad labels disambiguated
- [x] No broken `i18nKey` references (typecheck / test / grep verification)
- [x] i18n gate script(s) run as applicable — result in Completion Evidence
- [x] CHANGELOG.md entry
- [x] If Task 0025 landed first: pillar titles remain consistent with new names

---

## Details

### What

Subtasks:
- [x] **Ler código existente**: `en.json` sidebar section, `sidebarVisibility.ts` i18nKey map, Proxy/Usage/Analytics/Skills page titles, epic naming table
- [x] **Build rename matrix**: key → old string → new string → rationale
- [x] **Apply en.json updates** (and hardcoded titles if any)
- [x] **Sync locale policy**: add keys to other locales as empty/en fallback per project norms; do not invent fake translations
- [x] **Grep** for old display strings in UI copy that bypass i18n
- [x] **Tests / gates**: run i18n-related checks
- [x] **Verificação**: contract tests cover operator-facing English labels

### Where

| File | Purpose |
|------|---------|
| `src/i18n/messages/en.json` | Modify — primary copy |
| `src/i18n/messages/*.json` | Modify — key sync per policy |
| `src/shared/constants/sidebarVisibility.ts` | Read — keys must still resolve |
| Dashboard page titles under proxy/usage/analytics/skills | Modify if hardcoded |
| `tests/unit/ui/timing-i18n.test.ts` or related | Read — pattern |
| `CHANGELOG.md` | Entry |

### How

1. Export current `sidebar.*` keys for debt clusters.
2. Propose operator-facing names (short noun + subtitle explaining scope).
3. Patch en.json; keep keys stable when possible (change values, not keys) to reduce locale churn; only rename keys if unavoidable.
4. Run i18n coverage/sync scripts.
5. Document matrix in Completion Evidence.

### Why

Structural IA fails in product perception if labels still say three different “proxy” things. S7 is small effort / medium impact and can ship independently of the full pillar rebuild.

---

## ⛔ Anti-Hallucination Guardrails

> [!CAUTION]
> DO NOT change route paths casually for rename vanity — prefer i18n string changes.
> DO NOT mass-machine-translate 42 locales with invented copy.
> DO NOT collide with Task 0025 pillar key edits without coordination.

> [!IMPORTANT]
> Prefer stable i18n **keys**, new **values**.
> Document before/after strings in Completion Evidence.
> Proxy Logs belong conceptually under Observe (Task 0023) — labels must not re-imply a separate product pillar.

---

## 🛡️ Compliance Checklist

- [x] **Doc Accuracy**: Keys grepped against code
- [x] **i18n**: en source updated; gates run
- [x] **No capability deletion**
- [x] **CHANGELOG**

---

## 📋 Completion Evidence (preenchido pelo agente executor)

- **Arquivos criados/modificados**:
  - `src/i18n/messages/en.json` — English operator labels (sidebar/header/settings/skills)
  - `src/i18n/messages/*.json` (41 locales) — `fill-missing-from-en` key presence for `sidebar.analyticsSubtitle` (+ any prior gaps)
  - `src/shared/constants/sidebarVisibility.ts` — analytics hub `i18nKey`/`subtitleKey`; labelFallback/subtitleFallback for debt leaves
  - `src/app/(dashboard)/dashboard/activity/ObserveHubClient.tsx` — Outbound Logs fallback
  - `tests/unit/ui/sidebar-naming-i18n.test.ts` — **new** contract suite
  - `tests/unit/settings-ui-layout-static.test.ts` — Storage → Data & Storage assert
  - `CHANGELOG.md` — Unreleased Changed entry

- **Rename matrix** (stable keys; values only unless noted):

  | Key / wiring | Old | New | Rationale |
  |--------------|-----|-----|-----------|
  | analytics item `i18nKey` | `usage` | `analytics` | Hub is Analytics charts/evals, not “Usage” |
  | analytics item `subtitleKey` | `usageSubtitle` | `analyticsSubtitle` (new) | Distinct from token-volume language |
  | `sidebar.analytics` | Analytics | Analytics | Primary hub label |
  | `sidebar.analyticsSubtitle` | *(missing)* | Charts, trends, evals, and utilization | Hub scope |
  | `sidebar.usage` | Usage | Usage | Kept for residual usage vocabulary |
  | `sidebar.usageSubtitle` | Traffic and usage stats | Token volume and request counts | Not interchangeable with Analytics |
  | `sidebar.settingsGeneral` | Storage | Data & Storage | Not object-store / S3 vibe |
  | `sidebar.settingsGeneralSubtitle` | Database and backups | Database, backups, and retention | Align with page |
  | `settings.systemStorage` | Storage | Data & Storage | Page H1 parity |
  | `sidebar.agentSkills` | AgentSkills | Agent Skills | Readable triad member |
  | `sidebar.agentSkillsSubtitle` | A2A skill registry | Outbound SKILL.md for external agents | Outbound docs, not Omni sandbox |
  | `sidebar.omniSkills` | OmniSkills | Omni Skills | Readable triad member |
  | `sidebar.omniSkillsSubtitle` | Sandbox skill registry | Inbound sandbox tools for model requests | Inbound execution |
  | `sidebar.pluginsSubtitle` | Plugin marketplace & installs | Installable dashboard plugins (not MCP tools) | ≠ MCP tools |
  | `sidebar.mcpSubtitle` | MCP server controls | MCP tools, scopes, and server controls | MCP tools language |
  | `sidebar.proxy` | Proxy | Network | Outbound network config |
  | `sidebar.proxySubtitle` | HTTP proxy settings | Outbound proxy for provider traffic | Scope |
  | `sidebar.logsProxy` | Proxy Logs | Outbound Logs | Observe stream, not System Network |
  | `sidebar.logsProxySubtitle` | Proxy traffic logs | Outbound network traffic stream | |
  | `sidebar.embeddedServicesSubtitle` | Manage local proxy services | Local process services (not outbound proxy) | ≠ Network |
  | `sidebar.proxyGroup` | Proxy | Network | Group title parity |
  | `sidebar.activitySubtitle` | Friendly feed of recent events | Unified stream: activity, logs, and audit | Observe hub |
  | `header.usage` | Usage & Analytics | Usage | Split blended product name |
  | `header.analyticsDescription` | Charts, trends, and evaluation insights | Charts, trends, evals, and utilization insights | Match hub |
  | `header.proxyDescription` | Configure upstream proxy… | Configure outbound network proxy… | |
  | `header.logsProxyDescription` | Upstream proxy request logs… | Outbound network request logs… | |
  | `header.settingsGeneralDescription` | Storage, database… | Local data store, database… | |
  | `header.agentSkillsDescription` / `omniSkillsDescription` | mixed | Outbound / Inbound wording | Triad |
  | `skills.title` | Skills | Omni Skills | Page title parity |
  | ObserveHub fallback `logsProxy` | Proxy Logs | Outbound Logs | Hardcoded fallback |
  | Pillar titles (`*Section`) | (0025) | Unchanged Core Pulse…System | Consistency with titleFallback |

- **i18n gate results**:
  - `node scripts/i18n/fill-missing-from-en.mjs` — exit 0; touched 41 locale files (key presence; no invented translations)
  - `analyticsSubtitle` present in **42/42** locale files
  - `npm run i18n:check` — exit 0 (note: `.i18n-state.json not found — bootstrap advisory`)
  - `npm run i18n:check-ui-coverage` — reports pre-existing 13 locales under 80% translation coverage (not introduced by this task; key presence for new key OK)
  - `tests/unit/settings-i18n-keys.test.ts` — pass (all locales still have `sidebar.proxy` key; every sidebar item key exists in en)

- **Testes**:
  - `node --import tsx/esm --test tests/unit/ui/sidebar-naming-i18n.test.ts tests/unit/settings-ui-layout-static.test.ts tests/unit/ui/sidebar-seven-pillars.test.ts tests/unit/settings-i18n-keys.test.ts` → **69 pass / 0 fail**
  - `node --import tsx/esm --test tests/unit/ui/observe-hub-sidebar.test.ts` → **31 pass / 0 fail**

- **CHANGELOG**: `[Unreleased] → Changed` — Frontend IA naming / i18n cleanup (Epic 0005 S7 / Task 0026)

- **Builder Proof Matrix**:

  | Debt row | Proof |
  |----------|-------|
  | Usage vs Analytics | `sidebarVisibility` analytics leaf → `i18nKey: analytics`; test asserts `usage ≠ analytics` + distinct subtitles |
  | Storage vs settings-general | en `settingsGeneral` / `settings.systemStorage` = Data & Storage; static test updated |
  | Skills triad | Agent Skills / Omni Skills / Plugins + MCP tools subtitle; contract test |
  | Proxy cluster | Network vs Outbound Logs vs Embedded Services; three labels distinct in test |
  | Pillar titles | Match titleFallback for 7 pillars; test in suite |

- **Agente executor**: builder worker (parent agentID=builders), Task 0026
- **Data de conclusão**: 2026-07-10


## Parent gate 2026-07-10
Epic 0005 drain complete. Promoted after builder proof.
