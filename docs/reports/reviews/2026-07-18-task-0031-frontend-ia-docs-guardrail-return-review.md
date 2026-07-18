# Return Review: Task 0031 — Docs Guide + No-New-Leaf Guardrail — 2026-07-18

## Review Lineage

- **Current task**: Task 0031 (`frontend-ia-docs-guardrail`); live path `docs/tasks/03-review/`
- **Previous reports read (untrusted scores)**:
  - `docs/reports/reviews/2026-07-18-task-0031-frontend-ia-docs-guardrail-review.md` (claimed 100)
  - `docs/reports/reviews/2026-07-18-task-0031-frontend-ia-docs-guardrail-path-to-100.md` (claimed 96)
  - `docs/reports/reviews/2026-07-16-task-0031-frontend-ia-docs-guardrail-reaudit.md` (**84** — UI.md chrome table stale post-0059)
  - `docs/reports/reviews/2026-07-11-task-0031-frontend-ia-docs-guardrail-review.md` (96)
  - `docs/reports/reviews/2026-07-10-task-0031-frontend-ia-docs-guardrail-review.md` (93)
- **Related later work re-verified**: Task **0052/0053** brand; Task **0059** Operations hub
- **Review mode**: `independent-full-return-review` (Doc Accuracy Discipline — live tree only; prior scores **untrusted**)
- **Reviewer profile**: `reviewers` / Frontend Quality + docs accuracy (agentID `reviewers`)
- **Skills**: frontend-quality-harness (IA surfaces), documentation accuracy

## Score And Verdict

- **Score**: `100/100`
- **Level**: Perfect (docs/governance scope; 2026-07-16 SSoT drift closed under live dump)
- **Verdict**: `ACCEPTED_100`
- **Lane recommendation**: **hold** `docs/tasks/03-review/` (S ≥ 90; no path-to-100 patches required)
- **Patches this session**: **none**

### Rubric snapshot (live)

| Dimension | Score | Live evidence |
| --- | ---: | --- |
| Five invariants present | 100 | UI.md §1 complete |
| Conceptual 7 pillars vs code | 100 | Exact match `OPERATIONAL_PILLAR_SECTION_IDS` |
| **Live chrome table (§2.1) vs PRIMARY** | **100** | **9 leaves incl. `operations`; deep-link table for api-manager/cli-code** |
| observeHub SSoT | 100 | Correct; MONITORING_SECTIONS labeled historical |
| DESING / design dual SSoT | 100 | Stub + archive + design.md banner → UI.md IA |
| Primitives table paths | 100 | All named paths exist on disk |
| Brand / theme claims in UI.md | 100 | coreCyan dark-only; Settings **Interface** functional prefs only |
| Sibling NAV-TREE SSoT | 100 | §2 live 9; §10 conclusion flat-**9** |
| Code header mirror (F8) | 100 | `sidebarVisibility.ts` header: live **9** after 0059 |
| Doc accuracy on target files | 100 | **No** fabricated-docs hits on `UI.md` / `NAV-TREE-TARGET.md` |
| Links / archive / epic / CHANGELOG | 100 | Relative links resolve; Epic + Fixed entry present |
| Guide length | 100 | **170** lines (target ~80–200) |

## Adversarial proof of the 2026-07-16 R1 (stale chrome post-0059)

### Prior failure mode (reaudit 84)

UI.md §2.1 still listed **10** primary leaves with `api-manager` and `cli-code` as chrome peers. Live tree after Task **0059** is **9** leaves with `operations` hub absorbing those destinations.

### Live dump (this session)

```
PRIMARY_SIDEBAR_ITEMS (9):
  home /home
  providers /dashboard/providers
  combos /dashboard/combos
  activity /dashboard/activity
  analytics /dashboard/analytics
  costs /dashboard/costs
  operations /dashboard/operations
  settings-general /dashboard/settings/general
  docs /docs

OPERATIONAL_PILLAR_SECTION_IDS (7):
  core-pulse, registry, routing, governance,
  operations, observability, system

SIDEBAR_SECTIONS: main, devtools
```

### UI.md §2.1 row-by-row

| # | UI.md id | Live PRIMARY | Match |
|---|----------|--------------|-------|
| 1 | `home` | `home` | ✅ |
| 2 | `providers` | `providers` | ✅ |
| 3 | `combos` | `combos` | ✅ |
| 4 | `activity` | `activity` | ✅ |
| 5 | `analytics` | `analytics` | ✅ |
| 6 | `costs` | `costs` | ✅ |
| 7 | `operations` | `operations` | ✅ |
| 8 | `settings-general` | `settings-general` | ✅ |
| 9 | `docs` | `docs` | ✅ |
| count | **9** | **9** | ✅ |

Deep-link table correctly demotes `api-manager` / `cli-code` (not primary).  
`NAV-TREE-TARGET.md` §2 matches the same 9-leaf table; §10 says flat-**9**.

### Brand / theme (prior R2)

- UI.md §4: dark-only **coreCyan** (`#00FFCC`, bg `#030506` / panels `#080c0e`)
- Anti-pattern rows ban multi-accent / light theme / Appearance brand swatches
- Live: `themeStore` `colorTheme: "coreCyan"`; `settingsHub` Appearance route label **Interface**

### Supporting suite

```
node --import tsx/esm --test \
  tests/unit/ui/operations-hub-discoverability-0059.test.ts
→ 12/12 PASS
```

### Doc accuracy gate

- `npm run check:fabricated-docs --strict` fails **repo-wide** (unrelated historical reports/tasks — 465 claims).  
- **Filter**: **zero hits** mentioning `docs/guides/UI.md` or `NAV-TREE-TARGET.md`.  
- All UI.md relative markdown links resolve on disk.

## Exit conditions re-check

| Exit | Status |
| --- | --- |
| `docs/guides/UI.md` exists with IA + primitives rules | ✅ 170 lines |
| Five epic invariants | ✅ §1 |
| Seven pillars match live export | ✅ §2.2 = OPERATIONAL_PILLAR_SECTION_IDS |
| Live chrome matches PRIMARY | ✅ §2.1 = 9 + operations |
| Archive policy + DESING | ✅ stub + `.archive/docs/2026-07-10-desing-typo/` |
| design.md token SSoT; UI.md IA SSoT | ✅ dual authority documented |
| Doc accuracy for **this guide** | ✅ no fabricated hits on target files |
| Epic 0005 points to guide | ✅ |
| CHANGELOG docs entry | ✅ Fixed SSoT + historical Added |
| No fabricated route/component names in guide | ✅ primitives exist |

## Findings

| ID | Class | Severity | Status | Summary | Evidence |
| --- | --- | --- | --- | --- | --- |
| R1 | REGRESSION | High | **RESOLVED** | §2.1 primary chrome = live PRIMARY (9 + operations) | UI.md:52–69 vs live dump |
| R2 | REGRESSION | Medium | **RESOLVED** | Brand = coreCyan dark-only; Interface prefs | UI.md:139; themeStore; settingsHub |
| R3 | REGRESSION | Low | **RESOLVED** | Anti-pattern no coral product brand | UI.md:114–115 |
| N1 | NEW | Info | **RESOLVED** | NAV-TREE live chrome + §10 flat-9 | NAV-TREE-TARGET.md |
| F8 | PERSISTENT | Info | **RESOLVED** | Code header live 9 | sidebarVisibility.ts:1–7 |
| — | — | — | **None open** | — | — |

### Non-blocking notes (not deductions)

1. **`design.md` body** still carries multi-phase plan language and historical coral hex tables. Dual SSoT is intentional: banner points IA/brand operators to `docs/guides/UI.md` + live `globals.css`. Not a Task 0031 exit defect.
2. **Repo-wide** `check:fabricated-docs` red from unrelated docs/reports noise — out of 0031 scope; target files clean.
3. Optional CI micro-gate (assert UI.md ids == PRIMARY) remains a process improvement, not an exit condition.
4. `docs/README.md` still says “flat ≤10 hubs” (budget language) while live is 9 — accurate as budget, not a stale 10-leaf table.

## Regression Guards (must not regress)

1. Default chrome ids in UI.md **must match** live `PRIMARY_SIDEBAR_ITEMS` (currently 9: home…operations…docs)
2. Conceptual pillar ids must stay aligned with `OPERATIONAL_PILLAR_SECTION_IDS`
3. Do not re-cite `MONITORING_SECTIONS.md` as live Observe hub authority (`observeHub.ts`)
4. Keep `design.md` (tokens plan) vs `docs/guides/UI.md` (IA) dual SSoT; keep `DESING.md` as stub only
5. Brand claims must match live themeStore/globals (coreCyan dark-only post-0052/53)
6. NAV-TREE must not reintroduce “flat-10” as **live** chrome count
7. Settings product label for appearance route is **Interface** (functional prefs only)

## Lane outcome

**Hold in `docs/tasks/03-review/`** · Score **100** · Verdict **ACCEPTED_100** · Patches **0**.

---

**Reviewer**: Frontend Quality + docs accuracy · parent agentID `reviewers` · 2026-07-18  
**Report path**: `docs/reports/reviews/2026-07-18-task-0031-frontend-ia-docs-guardrail-return-review.md`
