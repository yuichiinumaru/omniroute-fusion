# EPIC-30: Outbound Error Triage and Self-Improving Analysis Workflow

> **Status**: Planning — evidence-backed decomposition (2026-08-10)
> **Priority**: 🟡 High
> **Origin**: Operator request to audit outbound errors and institutionalize a reusable triage workflow.

## Goal

Create an evidence-first process for reviewing OmniRoute outbound/call logs,
separating expected account/provider noise from actionable routing or protocol
defects, and improving the triage reference corpus over time.

The initial audit must ignore 403/429 as default action candidates when the
operator has already identified account eligibility/rate-limit causes, while
still counting and reporting them. It must prioritize 404 candidate routing,
400 provider-parameter mismatches, tool-call/schema failures, 5xx/timeouts, and
errors that fail to redirect to the next combo target.

## Evidence basis

- `GET /api/usage/call-logs` requires management auth and supports status,
  model, provider, account, combo, search, limit, and offset filters.
- `src/lib/usage/callLogs.ts::getCallLogs` classifies `status >= 400` or
  `error_summary IS NOT NULL` as error rows.
- `GET /api/usage/request-logs` exposes recent request logs but has less targeted
  filtering; call logs are the preferred first audit source.
- The current unauthenticated probe against `localhost:22000/api/usage/call-logs`
  returned HTTP 401, so no outbound log claim was made in this planning round.
- The `agy/gemini-3.6-flash-high` thinking-budget mismatch is a concrete 400
  capability/configuration pattern worth institutionalizing.
- The `metamuse/muse-spark-1.2-contributor` 404 and OpenCode-facing `id` incident
  show why provider error body, combo redirect behavior, and downstream tool
  schema must be recorded as separate layers.

## Stories / executable tasks

| Story | Task | Scope |
|---|---:|---|
| Initial outbound error audit | 0158 | Fetch/authenticated call-log evidence, ignore known 403/429 noise by policy, and produce actionable findings. |
| Self-improving outbound triage workflow | 0159 | Skill-local workflow + curated references for repeatable analysis and pattern proposals. |

## Ordering

1. Task 0158 establishes the first evidence packet and validates the log shape.
2. Task 0159 turns the validated analysis rules into a reusable skill workflow
   and reference corpus, with a human-reviewed self-improvement loop.

## Non-goals

- No automatic suppression/deletion of log rows.
- No automatic changes to provider credentials, model IDs, combos, thinking
  budgets, or resilience settings.
- No classification of 403/429 as “irrelevant forever”; the default policy
  ignores them for action unless systemic evidence changes that classification.
- No automatic mutation of the skill reference corpus from unreviewed logs.
