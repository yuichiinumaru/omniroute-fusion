# Architect-Orchestrator Wave Synthesis — OmniRoute-2 / Fusion

> **Date**: 2026-07-19  
> **Role**: architect-orchestrator (`architects`)  
> **Project**: omniroute-2 / omniroute-fusion  
> **Waves**: (1) task/docs audit architects → (2) adversarial code investigators → (3) epics + task promotion

---

## 1. Onboarding snapshot

| Item | State |
|------|--------|
| Lane inventory | `01-open`=1 (0036 HOLD), `02-doing`=0, `03-review`=0, `04-completed`=50 |
| Fusion core | Epic 0003 children 0010–0018 completed; Acting (0004) implemented without formal child series |
| Dual-mode / auth UX | Code complete (0032–0035, 0037–0039); live :21000 proof still **0036** |
| Adversarial 0008 | 0040–0051 completed; residual greps remain |
| Frontend IA | 0005 + successor 0052–0061 largely closed; scoped residual chrome |
| Harness | Child product docs strong; parent DoD/template/tasklist/changelog localization gaps **CONFIRMED** |

---

## 2. Wave 1 reports (task/docs)

| Agent | Report |
|-------|--------|
| gt-archivist | `docs/reports/audits/2026-07-19-archivist-task-planning-coherence.md` |
| gt-task-architect | `docs/reports/audits/2026-07-19-task-architect-lane-structural-audit.md` |
| gt-omniroute-architect | `docs/reports/audits/2026-07-19-omniroute-architect-fusion-residual-audit.md` |
| gt-harness-architect | `docs/reports/audits/2026-07-19-harness-architect-meta-governance-audit.md` |
| gt-architect | `docs/reports/audits/2026-07-19-architect-product-epics-status-audit.md` |

### Wave 1 consensus (docs-level)

1. **QUEUE + epic headers are stale** — risk of rework of completed tasks.
2. **Epic 0004 Acting is code-done, status-open** — false-gap risk if re-decomposed greenfield.
3. **Only executable open product task is 0036** (operator :21000).
4. **Planning naming** violates `EPIC-`/`PLAN-` prefixes.
5. **Harness localization** incomplete (cargo DoD, missing template/AGENTS/tasklist).

---

## 3. Wave 2 reports (code investigation)

| Agent | Report |
|-------|--------|
| gt-ts-code-reviewer | `docs/reports/audits/2026-07-19-wave2-ts-reviewer-fusion-runtime-investigation.md` |
| gt-security-reviewer | `docs/reports/audits/2026-07-19-wave2-security-reviewer-residual-investigation.md` |
| gt-frontend-quality-reviewer | `docs/reports/audits/2026-07-19-wave2-frontend-ia-residual-investigation.md` |
| gt-mechanical-investigator | `docs/reports/audits/2026-07-19-wave2-mechanical-harness-evidence.md` |
| gt-ts-expert | `docs/reports/audits/2026-07-19-wave2-ts-expert-auth-web-mcp-evidence.md` |

### Confirmed product/code issues (actionable)

| Priority | Finding | Evidence owner |
|----------|---------|----------------|
| **P1** | Tailscale enable/login **spawn** but **not** LOCAL_ONLY / SPAWN_CAPABLE (Hard Rule #15 residual) | security Wave 2 |
| **P1** | Fusion A6 miss→acting-only **missing combo-level tests** | ts-reviewer Wave 2 |
| **P2** | Conditional fusion `tool-call` is **sticky** across later turns | ts-reviewer |
| **P2** | Single-survivor **double upstream**; 2nd call can fail after text collected | ts-reviewer |
| **P2** | Parallel panel `withTimeout` does not abort stragglers (breaker blast radius) | ts-reviewer |
| **P2** | Residual unsanitized `err.message` / route error paths after 0051 | security |
| **P2** | Routing hub strip missing on fusions **editor** routes; Ops/Testing one-way hubs | frontend |
| **P2** | MCP live tool count **93** / scopes **31** vs docs **94** / **30** | ts-expert |
| **P3** | Fusions list omits acting unit; `requireApproval` dead config | fusion |
| **Ops** | Dual-mode **code CONFIRMED complete**; :21000 still needs Task **0036** | ts-expert + open task |

### Confirmed harness/governance issues

| Priority | Finding |
|----------|---------|
| **P0** | DoD cargo/Surreal vs OmniRoute npm matrix |
| **P0** | Missing `docs/tasks/AGENTS.md`, `docs/tasks/000-template.md`, `tasklist.md` |
| **P0** | create-tasks workflow still ships cargo exit defaults |
| **P1** | No `.changelog/` ledger (product uses root `CHANGELOG.md` only) |
| **P1** | No `architects` continuity under `.memories/_by_lane/` |
| **P1** | `omniroute` skill stale strategy/tool counts |
| **P1** | SQLite-abolition parent policy conflicts with intentional OmniRoute SQLite |
| **P2** | Planning `000N-` naming; QUEUE historical |

### Explicitly NOT open as greenfield product work

- Dual-mode helpers + heal + status copy — **shipped** (only deploy proof open).
- Epic 0007 / 0008 child series — **completed**; close headers.
- Epic 0003 children — **completed**; close epic + fix Acting 0004 status.
- Plan 0001 items mostly **partially landed** (lmarena, claude translator, qwen TLS/WAF); needs truth-up not full replan.

---

## 4. Epic plan (Wave 3 + operator IA priority 2026-07-19)

| Epic | Title | Domain |
|------|-------|--------|
| **EPIC-10** | Planning hygiene & epic closeout | docs/tasks governance |
| **EPIC-11** | Fusion runtime residuals | open-sse fusion/combo |
| **EPIC-12** | Security residual harden | authz/sanitize/spawn |
| **EPIC-13** | Frontend IA residual polish | dashboard chrome |
| **EPIC-14** | Child harness localization | `.agents` + tasks template/DoD |
| **EPIC-19** | **Dashboard/Observe/Providers IA rebalance (P0 UX)** | Costs config→Providers; Combo-Health+Route-Trace→Observe; rest Analytics→Dashboard; kill Analytics/Costs leaves; Tools→Ops |

**Operator-locked matrix (2026-07-19):** see `docs/tasks/00-planning/EPIC-19-omniroute-dashboard-observe-providers-ia-rebalance.md`.

**Keep open**: Task **0036** (operator HOLD on :21000).  
**Defer**: Qwen captcha solver (0002); model favorites (after EPIC-19).  
**Hold**: Full URL strip rewrite until EPIC-19 stable.

---

## 5. Subagent note

`codebase-investigator` spawn failed twice (tool registry quirk listing it as available then rejecting). Wave 2 used `gt-ts-expert` + `gt-mechanical-investigator` instead. Consider harness fix: alias/`subagent_type` parity for `codebase-investigator`.

---

## 6. Next free task ID

**0062** (gap 0019 intentional; 0036 open).
