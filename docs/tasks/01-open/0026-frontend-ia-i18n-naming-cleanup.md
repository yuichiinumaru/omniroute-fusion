# Task 0026: Frontend IA — i18n / Naming Cleanup (S7)

> **Status**: `[ ]` Open
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

- [ ] Naming debt table rows addressed in `en.json` (and page titles if hardcoded English)
- [ ] Proxy cluster labels disambiguated (Network/Outbound vs logs vs services)
- [ ] Usage vs Analytics strings no longer interchangeable in sidebar subtitles
- [ ] Skills triad labels disambiguated
- [ ] No broken `i18nKey` references (typecheck / test / grep verification)
- [ ] i18n gate script(s) run as applicable — result in Completion Evidence
- [ ] CHANGELOG.md entry
- [ ] If Task 0025 landed first: pillar titles remain consistent with new names

---

## Details

### What

Subtasks:
- [ ] **Ler código existente**: `en.json` sidebar section, `sidebarVisibility.ts` i18nKey map, Proxy/Usage/Analytics/Skills page titles, epic naming table
- [ ] **Build rename matrix**: key → old string → new string → rationale
- [ ] **Apply en.json updates** (and hardcoded titles if any)
- [ ] **Sync locale policy**: add keys to other locales as empty/en fallback per project norms; do not invent fake translations
- [ ] **Grep** for old display strings in UI copy that bypass i18n
- [ ] **Tests / gates**: run i18n-related checks
- [ ] **Verificação**: visual smoke on sidebar labels in en locale

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

- [ ] **Doc Accuracy**: Keys grepped against code
- [ ] **i18n**: en source updated; gates run
- [ ] **No capability deletion**
- [ ] **CHANGELOG**

---

## 📋 Completion Evidence (preenchido pelo agente executor)

- **Arquivos criados/modificados**: [lista]
- **Rename matrix**: [key | old | new]
- **i18n gate results**: [commands + exit codes]
- **Testes**: [if any]
- **CHANGELOG**: [ref]
- **Agente executor**: [nome]
- **Data de conclusão**: [YYYY-MM-DD]
