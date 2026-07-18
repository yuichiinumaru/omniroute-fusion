# Builder Wave Plan — 2026-07-18

**AgentID**: `builders` (builder-orchestrator)
**Harness maps consulted**: `.agents/skills/harness-architecture/references/harness-map/lanes/builders.md`
**Indexes**: `.agents/index-agents.md`, `.agents/index-skills.md`
**Project**: OmniRoute (TypeScript/Next.js + open-sse)

## Agent Onboarding Complete

- **Session**: 2026-07-18
- **Agent**: builder-orchestrator (`builders`)
- **Ready**: ✅
- **Key observations**:
  - 17 tasks in `02-doing/` (mostly re-review / path-to-100 / phantom-completion returns)
  - 1 task in `01-open/` (**0036**) operator-gated on **:21000** production — **HOLD** (AGENTS.md production ban + queue Q4)
  - Live language is TypeScript/JS; primary builders/reviewers: `gt-ts-engineer` / `gt-ts-expert` / `gt-ts-code-reviewer` + `gt-frontend-quality-reviewer` / `gt-security-reviewer` as secondary
  - Core skills: `coding-execution-harness`, `tsjs-harness`, `code-quality-harness`, `frontend-quality-harness`, `security-harness`, `project-management`

## Lane Snapshot

| Lane | Count | Notes |
|------|------:|-------|
| 01-open | 1 | 0036 HOLD (operator / prod :21000) |
| 02-doing | 17 | Fix/rework returns |
| 03-review | 0 (empty at plan time) | Independent review later |

## Collision Matrix (high-risk shared surfaces)

| Surface | Tasks | Resolution |
|---------|-------|------------|
| `sidebarVisibility.ts` / Sidebar | 0024, 0025, 0054, 0056, 0060, 0061 | Wave 2 serialized clusters |
| `settings/layout.tsx` | 0054, 0061 | Same agent (E7) |
| `fusion.ts` / combo runtime | 0012, 0043, (0017 docs only) | Same agent E3 for 0012+0043; 0017 docs-only |
| path helpers SSRF | 0045, 0048 | Same agent E2 |
| themeStore / visual tokens | 0028, 0055 | Same agent E6 |
| CHANGELOG / `.changelog/` | all | Parent-owned publish; workers draft task-local only |

## Wave 1 — Engineers (parallel, max 2 tasks/agent)

| Agent | Profile | Tasks | Focus |
|-------|---------|-------|-------|
| E1 | gt-ts-engineer | 0041 | Secrets at rest (P0 security) |
| E2 | gt-ts-engineer | 0045, 0048 | Executor + search SSRF/path |
| E3 | gt-ts-engineer | 0012, 0043 | Fusion dispatch residuals + combo resilience |
| E4 | gt-ts-engineer | 0017, 0031 | Fusion docs/i18n + IA docs guardrail |
| E5 | gt-ts-engineer | 0028, 0055 | Theme micro + dark readability |
| E6 | gt-ts-engineer | 0057, 0058 | Providers IA topbar + routing/compression IA |

## Wave 2 — Engineers (sidebar/IA shell, after Wave 1 or parallel if no FS conflict)

| Agent | Profile | Tasks | Focus |
|-------|---------|-------|-------|
| E7 | gt-ts-engineer | 0024, 0025 | Registry/connect + seven-pillar (0024 first) |
| E8 | gt-ts-engineer | 0054, 0061 | Settings hub + Observe/Health gaps |
| E9 | gt-ts-engineer | 0056, 0060 | Dashboard IA + Testing hub |

## Held

| Task | Reason |
|------|--------|
| 0036 | Operator-gated deploy to **:21000 production**. AGENTS.md forbids touching prod. Needs explicit operator promote A/B. |

## Protocol After Engineers

1. Expert internal review (`gt-ts-expert` / domain) with path-to-100 on all 02-doing (≤10 parallel)
2. `gt-parallel-review-builder` with real reviewers (`gt-ts-code-reviewer`, `gt-frontend-quality-reviewer`, `gt-security-reviewer`, `gt-documentation-accuracy-reviewer`)
3. Score gate: S≥90 → reviewer path-to-100 + move 03-review; S<90 → stay 02-doing + fixer
4. Loop until every task has reviewer-owned **100/100**

## Worker Rules (all dispatches)

- Compact subagent-onboard; parent agentID=`builders`
- Skills: coding-execution-harness + tsjs-harness (+ security/frontend as domain)
- **Do NOT move tasks** out of 02-doing
- **Do NOT** touch port 21000 / docker prod
- **Do NOT** git commit/push unless parent asks
- Max evidence in task Completion Evidence + Review Ledger updates
- Return compact packet: files read/changed, commands, residual risks
