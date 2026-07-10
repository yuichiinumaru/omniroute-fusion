# Dependency tree — OmniRoute Fusion tasks

> **Purpose**: prevent *carro na frente do boi* — know what is **serial**, what is **parallel**, and what **blocks** what.  
> **Updated**: 2026-07-10 (S0–S10 closeout — IA guide at `docs/guides/UI.md`; Wave 2 report: `docs/reports/builders/2026-07-10-wave2-closeout.md`)  
> **Scope**: Epic 0005 (Frontend IA) + reference to completed Fusion wave (Epic 0003).  
> **Identity**: tasks use lane-neutral `Task NNNN`. Resolve live path under `docs/tasks/<lane>/`.

---

## Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Completed (`04-completed/`) |
| 🔓 | Open (`01-open/`) |
| → | Hard dependency (must finish before) |
| ∥ | Parallel-safe (no hard edge) |
| ⚠ | Soft dependency / merge coordination (can start, careful on shared files) |

---

## Epic 0003 — Fusion (reference, done)

Already shipped as Tasks **0010–0018** (all ✅). Numbering gap **0019** intentionally unused.

```
0010 contracts ✅
  → 0011 resolve units ✅
  → 0012 runtime dispatch ✅
  → 0013 combo branch ✅
  → 0014 triggers ✅
  → 0015 UI shell ✅ → 0016 UI editor ✅
  → 0017 docs/i18n ✅
  → 0018 tests ✅
```

**Constraint for Epic 0005:** Fusion UI leaf (`fusions`) must land under **Routing** pillar in Task **0025**, not as a permanent peer dump leaf.

---

## Epic 0005 — Frontend IA / design system / componentization

**Parent epic**: `docs/tasks/00-planning/0005-omniroute-frontend-ia-design-system-epic.md`

### Full DAG (hard edges only)

```
                    ┌──────────────────┐
                    │ 0020 S0 archive  │ ✅
                    │ + no-new-leaf    │
                    └────────┬─────────┘
           ┌─────────────────┼─────────────────┐
           ▼                 ▼                 ▼
   ┌───────────────┐  ┌─────────────┐  ┌────────────────┐
   │ 0021 S1 prim  │✅│ 0022 S2+S3  │✅│ (gov baseline) │
   │ Empty/Toggle  │  │ analytics + │  │ for IA tasks    │
   │ StatCard      │  │ compression │  └────────┬───────┘
   └───────┬───────┘  └──────┬──────┘           │
           │                 │                  │
           │                 │         ┌────────┴────────┐
           │                 │         ▼                 ▼
           │                 │  ┌────────────┐   ┌────────────┐
           │                 │  │ 0023 S4    │✅ │ 0024 S5    │✅
           │                 │  │ Observe    │   │ Registry/  │
           │                 │  │ stream     │   │ Connect    │
           │                 │  └──────┬─────┘   └──────┬─────┘
           │                 │         │                │
           │                 │         └───────┬────────┘
           │                 │                 ▼
           │                 │         ┌────────────┐
           │                 └────────►│ 0025 S6    │✅
           │                           │ 7 pillars  │
           │                           └──────┬─────┘
           │                                  ▼
           │                           ┌────────────┐
           │                           │ 0031 S10   │✅
           │                           │ UI docs    │
           │                           └────────────┘
           │
           ├──────────────► 0027 S1 migrate toggles ✅
           └─ ⚠ soft ─────► 0028 S9 theme micro    ✅

Parallel (shipped with Wave 2/closeout):
  0026 S7 i18n ✅          ⚠ residual naming OK
  0029 S8 CLI tool card ✅
  0030 mid-layer kit ✅
```

### ASCII attack waves

```
WAVE 1 (DONE) ─────────────────────────────────────────────
  0020 → 0021 → 0022
  Leaves ~81 → ~67; analytics dual-nav dead; compression hub

WAVE 2 (DONE) ─────────────────────────────────────────────
  0023 Observe stream     ∥  0024 Registry/Connect cleanup
  + Wave P: 0027 toggles · 0028 theme · 0029 CLI shell · 0030 kits

WAVE 3 (DONE) ─────────────────────────────────────────────
  0025 Seven-pillar sidebar + role presets (Fusions under Routing)

WAVE 4 (DONE) ─────────────────────────────────────────────
  0031 UI IA docs + no-new-leaf guide → docs/guides/UI.md

WAVE P (DONE with residual) ───────────────────────────────
  0026 i18n naming · 0027 · 0028 · 0029 · 0030
```

---

## Table — blockers & parallel groups

| Task | Status | Title (short) | Depends on (hard) | Blocks | Parallel group | Notes |
|------|--------|---------------|-------------------|--------|----------------|-------|
| **0020** | ✅ | Archive + no-new-leaf (S0) | — | 0021–0025 baseline | W1 | Policy: move to `.archive/` + provenance |
| **0021** | ✅ | Shared primitives (S1) | 0020 | 0027, soft 0028 | W1 | EmptyState, SettingsToggleRow, StatCard |
| **0022** | ✅ | Analytics + compression hub (S2+S3) | 0020, soft 0021 | 0025 | W1 | Pattern for dual-nav kill |
| **0023** | ✅ | Observe unified stream (S4) | 0020 (soft 0022) | **0025** | **A** | Logs/audit → hub + filters |
| **0024** | ✅ | Registry/Connect cleanup (S5) | 0020 | **0025** | **A** | MCP/A2A/API endpoints triple exposure |
| **0025** | ✅ | Seven-pillar sidebar (S6) | **0023 + 0024** | **0031** | **B** | Fusions under Routing; role presets |
| **0026** | ✅ | i18n naming (S7) | — | — | **A** | Residual naming OK; live `sidebar.*` |
| **0027** | ✅ | Toggle migration (S1+) | **0021** | — | **A** | ApiManager + settings switches |
| **0028** | ✅ | Theme micro VR (S9) | soft 0021 | — | **A** | No Prism/Orbitron full port |
| **0029** | ✅ | CLI ConfigurableToolCard (S8) | — | — | **A** (late OK) | 2 pilots; `ConfigurableToolCard` |
| **0030** | ✅ | PageTabBar + field kit + relay | soft 0021/22/23 | — | **A/C** | Mid-layer shells |
| **0031** | ✅ | UI docs guardrail (S10) | **0025** | — | **C** | `docs/guides/UI.md`; `DESING.md` stub |

### Parallel groups (summary)

| Group | Tasks | Rule |
|-------|-------|------|
| **W1** | 0020–0022 | Done — do not re-implement |
| **A** | 0023, 0024, 0026, 0027, 0028, 0029, 0030 | Safe to run **in parallel** (different owners/files preferred) |
| **B** | 0025 | **Only after** 0023 **and** 0024 complete |
| **C** | 0031 | **After** 0025 (or finalize after 0025) |

---

## What you MUST NOT parallelize

| Anti-pattern | Why |
|--------------|-----|
| Start **0025** before **0023** | Pillar Observability needs a single stream home |
| Start **0025** before **0024** | Pillar Registry needs one exposure home for MCP/A2A/endpoints |
| Finalize **0031** before **0025** | Docs would freeze a tree that still changes |
| Two agents editing `sidebarVisibility.ts` hard without split | Prefer 0025 sole owner of `SIDEBAR_SECTIONS` during S6; 0023/0024 prepare redirects + page hubs first |
| Two agents rewriting same CLI tool card | 0029 is one owner; pilots sequential inside task |
| Silent delete of menus/pages | Always **0020** policy: `.archive/` + provenance |

---

## Suggested multi-agent dispatch (next session)

```
Lane A1: Task 0023  Observe stream
Lane A2: Task 0024  Registry/Connect
Lane A3: Task 0027  Toggle migration        (independent of A1/A2)
Lane A4: Task 0028  Theme micro             (independent)
Lane A5: Task 0029  CLI tool card           (long; own worktree)
Lane A6: Task 0026  i18n                    (avoid sidebar.* keys that 0025 will own;
                                             or wait until after 0025 for sidebar labels)

Barrier: A1 + A2 green
Lane B:  Task 0025  Seven pillars
Lane C:  Task 0031  Docs
Optional: Task 0030 when hubs need tab shell
```

---

## File index

| Path | Role |
|------|------|
| `docs/tasks/00-planning/0005-…-epic.md` | Epic parent |
| `docs/tasks/04-completed/0020…0022-*.md` | Wave 1 evidence |
| `docs/tasks/01-open/0023…0031-*.md` | Remaining work |
| `docs/dependency-tree.md` | This file — dispatch order |
| `.archive/` (local, gitignored) | Tomb + provenance for dead IA surfaces |

---

## Maintenance

When a task moves lane or gains/loses a hard dependency:

1. Update the task header `Depends on` / `Blocks`.
2. Update this file’s DAG + table in the **same PR**.
3. Do not invent parallel work that touches the same exclusive owner file as an in-flight serial task without a merge plan.

**Rule of thumb:** if the task rewrites `SIDEBAR_SECTIONS` or the Observe hub shell, it is serial with 0025 / 0023 respectively — everything else is usually ∥.
