# Dependency tree — OmniRoute Fusion tasks

> **Purpose**: prevent *carro na frente do boi* — know what is **serial**, what is **parallel**, and what **blocks** what.  
> **Updated**: 2026-08-08 (current provider, routing, UI, reliability, and catalog-absorption waves appended; historical DAG retained below)  
> **Scope**: Current open/review dependency wave + Epic 0005 (Frontend IA) + reference to completed Fusion wave (Epic 0003).  
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

## Current OmniRoute task wave — 2026-08-04

This section is the active dispatch map for tasks currently in `01-open/` and
the immediately relevant reviewed predecessor in `03-review/`. The older Epic
0005 DAG below is retained as historical IA evidence and is not the current
provider/routing wave.

### Current hard and soft edges

```
0117–0124 (03-review reliability/provider fixes)
0125 (03-review stream repetition guard)
  └──→ 0131 (bounded repetition sanity retry)

0138 (NVIDIA test identity) ∥ 0139 (NVIDIA runtime contract)
0139 ⚠── 0119 (generic empty-stream fallback review)
0145 (Kimi core coverage) ──→ final approval of 0122
0146 (Qwen TLS-client coverage) ⚠── 0123 follow-up
0147 (LM Arena error-path coverage) ⚠── 0121 follow-up
0120 (Cursor Composer alias) ⚠── 0148 (Cursor native tool bridge)
0149 (Grok Build Responses/tool-call contract) ──→ 0151 (Grok Build login UX)
0152 (provider catalog/diff contract) ──→ 0153 (absorption triage report)
0154 (release/changelog ledger) ──→ 0155 (legacy refresh/code diff) ──→ 0156 (generic absorption workflow)
0157 (combo fail-soft unavailable models) ──→ combo/account-fallback regression review
0158 (outbound error audit) ──→ 0159 (self-improving outbound triage workflow)
0140 (reasoning resolution contract)
  └──→ 0141 (reasoning UI/API controls)
0142 (retry control labels) ⚠── 0127/0130 (combo UI/schema)
0143 (account-aware breaker fallback) ∥ provider/UI tasks
0144 (Antigravity quota family bars) ∥ backend/reasoning tasks

0128 (Home degraded warnings) ⚠── 0136 (Home quota summary)

0129 (model auto-sync) ⚠── 0132 (timeout resolver/runtime/test consumers)
0129 (model auto-sync) ⚠── 0134 (Settings/Routing consolidation)
0132 (timeout resolver/runtime/test consumers) ⚠── 0130 (combo prompt modes)
0132 (timeout resolver/runtime/test consumers) ⚠── 0133 (conditional fusion rules)
0130 (combo prompt modes) ⚠── 0133 (conditional fusion rules)

0126 (Codex gpt-5.6) ∥ 0127 (combo copy order) ∥ 0135 (OAuth popup)
0137 (Peak Hours placeholder) ∥ provider/backend tasks
0036 (22000 verification) operator-hold; never parallel with production access
```

### Active task table

| Task | Lane | Title | Hard dependency | Coordination / collision | Dispatch note |
|------|------|-------|-----------------|--------------------------|---------------|
| 0036 | 🔓 | 22000 dual-mode auth verification | 0033, 0034 | **operator-hold**; production `:22000` | Dry-run by default; `:23456` is test |
| 0117–0124 | review | Provider/reliability fixes | — | Resolve review outcomes before dependent work | Historical current wave; do not duplicate |
| 0125 | review | Stream repetition guard | — | Owns repetition failure contract | Predecessor for 0131 |
| 0126 | 🔓 | Codex gpt-5.6 compatibility | — | Codex files only | Parallel-safe |
| 0127 | 🔓 | Combo copy order | — | Combo list page/order tests | Parallel-safe |
| 0128 | 🔓 | Home degraded warnings | — | Home client/topology/tests | Serialize with 0136 |
| 0129 | 🔓 | Provider model auto-sync | — | Settings, provider add route, sync service | Coordinate with 0132/0134 |
| 0130 | 🔓 | Combo system prompt modes | — | Combo schema/page/middleware | Serialize with 0132/0133 |
| 0131 | 🔓 | Repetition sanity retry | 0125 | Stream/combo failure path | Start after 0125 review/acceptance |
| 0132 | 🔓 | Fine-grained timeouts | — | Combo/settings/runtime/test surfaces | Resolver phase gates consumer/UI phases |
| 0133 | 🔓 | Conditional fusion AND/OR rules | 0014, 0018, 0110 | Fusion schema/evaluator/editor | Serialize with 0130/0132 |
| 0134 | 🔓 | Settings/Routing consolidation | 0054, 0075, 0110 | Settings hub/layout/i18n/chrome | Coordinate with 0129/0132/0135 |
| 0135 | 🔓 | OAuth popup toggle | — | OAuth modal/security settings | Serialize with shared Security settings edits |
| 0136 | 🔓 | Home provider quota summary | — | Home client/quota/topology/tests | Serialize with 0128 |
| 0137 | 🔓 | Provider Peak Hours placeholder | — | Provider detail header/routes/tests | Parallel-safe after route verification |
| 0138 | 🔓 | NVIDIA test target identity | — | Provider test route/model-test result attribution | Parallel-safe; serialize with provider-test edits |
| 0139 | 🔓 | NVIDIA runtime failure contract | 0119 review/verification | Combo/stream failure paths | Serialize with 0119 |
| 0140 | 🔓 | Reasoning resolution contract | — | Thinking budget, translator, combo policy contract | Blocks 0141 |
| 0141 | 🔓 | Reasoning UI/API controls | 0140 | Settings/Routing/combo UI and persistence | Serialize with 0129/0130/0132/0134 |
| 0142 | 🔓 | Combo retry control labels | — | Combo page/i18n/help | Serialize with 0127/0130 |
| 0143 | 🔓 | Account-aware provider breaker | — | Breaker/chat/account eligibility | Serialize with resilience edits and 0139 |
| 0144 | 🔓 | Antigravity quota family bars | — | ProviderLimits quota parser/cards | Serialize with ProviderLimits edits |
| 0145 | 🔓 | Kimi-web core response/stream coverage | 0122 implementation | Kimi executor/validator tests | Blocks final 0122 approval |
| 0146 | 🔓 | Qwen TLS-client coverage | 0123 implementation | Qwen TLS/parser tests | Follow-up, not 0123 reopen |
| 0147 | 🔓 | LM Arena error-path coverage | 0121 implementation | LM Arena executor/response/TLS tests | Follow-up, not 0121 reopen |
| 0148 | 🔓 | Cursor native tool bridge and CLI compatibility | 0120 coordination | Cursor executor/protobuf/bridge tests | Upstream functional gap; serialize Cursor surfaces |
| 0149 | 🔓 | Grok Build Responses and tool-call compatibility | — | Grok executor/config/registry/tests | Establishes shared Grok Build contract |
| 0151 | 🔓 | Grok Build device-code and browser login | 0149 | Grok OAuth/provider/modal/tests | Import-token remains fallback |
| 0152 | 🔓 | Provider catalog and fork/reference diff pipeline | — | Provider CLI/extractor/package scripts/tests | Establishes normalized JSON contract |
| 0153 | 🔓 | Safe provider absorption triage reports | 0152 | Absorption CLI/classifier/report tests | No auto-apply/task mutation |
| 0154 | 🔓 | Canonical upstream release/changelog ledger | — | Omniroute skill fetcher + report ledger/tests | Baseline `3.8.42` onward; idempotent |
| 0155 | 🔓 | Safe legacy baseline refresh and code diff | 0154 | Legacy clone + revision manifest/tests | Explicit opt-in `git pull --ff-only` only |
| 0156 | 🔓 | Generic release-to-codebase absorption workflow | 0154, 0155 | `.agents/workflows/` + watchlist/handoff contract | Max 10 focused investigators; no auto-task mutation |
| 0157 | 🔓 | Combo fail-soft unavailable models | — | `combo.ts`, `accountFallback.ts`, Muse Spark regression tests | Incident-driven; distinguish upstream 404 body from harness tool-call schema |
| 0158 | 🔓 | Outbound error and redirect audit | Authenticated management log access | Call-log evidence/report | 403/429 counted but deprioritized; 400/404/tool errors prioritized |
| 0159 | 🔓 | Self-improving outbound error triage workflow | 0158, 0157 | OmniRoute skill workflow/references | Human-reviewed reference updates only |

### Recommended dispatch waves

1. **Wave A — isolated**: 0126, 0127, 0135, 0137, 0138, 0142, 0144, 0146, 0147, 0149.
2. **Wave B — Home**: choose 0128 → 0136, or bundle them under one owner/review.
3. **Wave C — combo contract**: 0130, 0132, 0133; run resolver/schema work before overlapping UI/runtime work.
4. **Wave D — reasoning contract**: 0140, then 0141 after the runtime contract is accepted.
5. **Wave E — settings/model sync**: 0129 and 0134/0141, serialized on shared settings/Routing files.
6. **Wave F — provider resilience**: 0139 after 0119 review, then 0143 with resilience review.
7. **Wave G — Kimi review hardening**: 0145 before final approval of 0122.
8. **Wave H — repetition**: 0131 only after Task 0125 review acceptance or explicit contract verification.
9. **Wave I — Cursor/Grok provider compatibility**: 0148 after 0120 coordination; 0151 after 0149 shared contract.
10. **Wave J — provider catalog absorption**: 0152 first; 0153 only after its JSON contract is reviewed.
11. **Wave K — release/codebase absorption**: 0154 → 0155 → 0156; workflow activation requires harness/task-governance review.
12. **Wave L — combo resilience**: 0157 requires provider/runtime and resilience review; no live MetaMuse account needed.
13. **Wave M — outbound error analysis**: 0158 first with management-authenticated read-only logs; 0159 after the evidence rubric is calibrated.
14. **Operator lane**: 0036 only with explicit production approval; never dispatch as ordinary builder work.

### Maintenance rule for the active wave

When an active task gains or loses a dependency, update both its task header and
this section. Do not promote or move lanes from the dependency tree; lane moves
remain owned by the appropriate builder/reviewer workflow.

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
| `docs/tasks/03-review/` / `04-completed/` for `0023…0031-*.md` | Wave 2 IA children (resolve live lane by search; do not assume `01-open/`) |
| `docs/dependency-tree.md` | This file — dispatch order |
| `.archive/` (local, gitignored) | Tomb + provenance for dead IA surfaces |

---

## Maintenance

When a task moves lane or gains/loses a hard dependency:

1. Update the task header `Depends on` / `Blocks`.
2. Update this file’s DAG + table in the **same PR**.
3. Do not invent parallel work that touches the same exclusive owner file as an in-flight serial task without a merge plan.

**Rule of thumb:** if the task rewrites `SIDEBAR_SECTIONS` or the Observe hub shell, it is serial with 0025 / 0023 respectively — everything else is usually ∥.
