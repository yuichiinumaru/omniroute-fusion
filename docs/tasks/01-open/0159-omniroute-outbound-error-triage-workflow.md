# Task 0159: Create self-improving outbound error triage workflow

> **Status**: `[ ]` Open
> **Priority**: 🟡 P1
> **Type**: `governance`
> **Origin**: EPIC-30 + operator request for an OmniRoute-skill workflow with curated, self-improving error-analysis references.
> **Blocks**: —
> **Depends on**: Task 0158 initial outbound audit; Task 0157 for combo fail-soft semantics.
> **Parallelism**: `serializable` — harness asset activation requires independent harness-architecture review.
> **Review routing**: independent + harness-architecture + provider/runtime review

---

## Objective

Create a skill-local workflow under `.agents/skills/omniroute/workflows/` for
routine analysis of OmniRoute outbound errors. The workflow MUST use the
authenticated call-log surface, classify expected account noise versus
actionable provider/routing/protocol defects, compare error behavior against
source contracts, and emit a sanitized evidence report plus reviewed pattern
proposals.

The workflow MUST include a human-reviewed self-improvement loop backed by
canonical documents under `.agents/skills/omniroute/references/`. It may propose
new patterns, ignore rules, provider quirks, or source checks, but MUST NOT
automatically rewrite the reference corpus from unreviewed logs. The first
reference patterns MUST cover:

- expected 403 eligibility failures;
- expected 429 rate limits;
- candidate-scoped 404/model availability;
- 400 parameter/capability mismatches;
- tool-call/schema envelope failures;
- redirect versus terminal failure evidence;
- unsupported/unknown classifications.

## Background Context

### O que já existe:

- OmniRoute skill-local workflows/references are the canonical reusable harness
  home; do not place this in generated repo skills or a second global workflow.
- `GET /api/usage/call-logs` exposes filtered call-log rows behind management
  authentication.
- Task 0158 defines the first concrete outbound audit and source-evidence shape.
- Harness rules already require bounded parallel investigators, resume-before-
  redispatch, no `general`, independent review, and no automatic task mutation.
- The release/codebase absorption workflow established patterns for provenance,
  evidence freshness, partial output, and human task creation.

### O que está faltando / quebrado:

- No repeatable workflow tells an investigator which outbound errors matter and
  which should be deprioritized.
- No canonical reference docs capture the evolving classification rubric.
- No self-improvement proposal format separates a useful recurring pattern from
  a one-off account outage or hallucinated provider behavior.
- No gate requires source validation before turning a log pattern into a task or
  rule update.

## Test Requirements

- The workflow MUST fail as blocked when management auth/log access is unavailable
  and MUST not report “no errors.”
- It MUST default to a read-only audit and require explicit opt-in for any live
  runtime/provider probe.
- It MUST preserve 403/429 counts while routing known account/rate-limit patterns
  to a deprioritized lane.
- It MUST route 404, 400 mismatch, tool-schema, 5xx, timeout, and redirect-failure
  patterns through source-evidence checks.
- It MUST distinguish provider response body, executor/parser, combo fallback,
  and downstream harness/tool-schema layers.
- It MUST output a structured report with classification, confidence, freshness,
  evidence paths, recommended action, and unresolved questions.
- Self-improvement MUST produce a proposal/diff, never mutate references without
  independent harness-architecture review.
- The workflow MUST support bounded provider/status partitions and no more than
  ten investigators when parallelism is needed.
- Every investigator failure/empty output follows resume-before-redispatch and
  three-strike escalation; `general` is forbidden.
- No secrets, raw prompts, cookies, API keys, or unbounded provider bodies may
  enter reports or reference proposals.

## Exit Conditions (GDD/TDD)

- [ ] `.agents/skills/omniroute/workflows/outbound-error-triage.md` exists as the
  canonical skill-local workflow with phases, inputs, gates, outputs, and lane
  ownership.
- [ ] Canonical references exist under `.agents/skills/omniroute/references/`:
  - `outbound-error-patterns.md`;
  - `outbound-error-analysis-rubric.md`;
  - `outbound-error-self-improvement.md`.
- [ ] References document the default 403/429 deprioritization policy and its
  override conditions for systemic patterns.
- [ ] The workflow defines the 0158 query shape, redaction, evidence freshness,
  redirect/termination join, and blocked-auth semantics.
- [ ] The workflow defines candidate pattern proposal format and a review gate
  before reference mutation.
- [ ] Skill index/ownership/evolution surfaces are updated through owning
  harness mechanisms; no duplicate global workflow is created.
- [ ] A dry-run/example packet covers MetaMuse 404, AGY/Gemini thinking-budget
  400, QwenStudio 403, and Kiro 429 without claiming live log evidence.
- [ ] Harness structure/index/map validators pass.
- [ ] An independent harness-architecture/provider-runtime review approves the
  workflow before activation.
- [ ] Completion Evidence is filled with real dry-run/validation output.

## Details

### What

Subtasks:

- [ ] **Ler existentes**: read OmniRoute skill root, skill-local references and
  workflows, Task 0158, Task 0157, call-log route/query code, delegation and
  partial-output rules, and workflow ownership registry.
- [ ] Define the classification rubric and evidence matrix in references.
- [ ] Define the phased workflow: access probe → bounded query → normalization/
  redaction → default-noise split → source matching → redirect analysis →
  report → self-improvement proposal → independent review.
- [ ] Add examples based on the operator's four patterns, clearly marked as
  examples/expected classification rather than live evidence.
- [ ] Add a dry-run command/packet and validate no runtime mutations occur.
- [ ] Update canonical skill index/ownership/evolution via owner scripts.
- [ ] **Refactoring pass**: keep provider-specific quirks in references, not
  hardcoded branching in the generic workflow.
- [ ] **Verificação de regressão**: harness validators, link/path scan, dry-run,
  secret scan, and independent review.

### Where

| Arquivo | Propósito |
|---------|-----------|
| `.agents/skills/omniroute/SKILL.md` | Ler/modificar — expose the workflow and reference corpus. |
| `.agents/skills/omniroute/workflows/outbound-error-triage.md` | Criar — canonical skill-local workflow. |
| `.agents/skills/omniroute/references/outbound-error-patterns.md` | Criar — curated pattern catalog. |
| `.agents/skills/omniroute/references/outbound-error-analysis-rubric.md` | Criar — classification/evidence rubric. |
| `.agents/skills/omniroute/references/outbound-error-self-improvement.md` | Criar — proposal/review lifecycle. |
| `src/app/api/usage/call-logs/route.ts` | Ler — endpoint/filter contract. |
| `src/lib/usage/callLogs.ts` | Ler — fields/status/error semantics. |
| `open-sse/services/combo.ts` | Ler — redirect/termination evidence. |
| `.agents/rules/workflow-ownership-registry.md` | Ler/modificar through owner — canonical workflow registration. |
| `.agents/harness-evolution.md` | Atualizar through governance process — classify reusable harness change. |
| Harness indexes/maps | Regenerar through owning scripts; never hand-edit. |

### How

1. Start with management-auth/access evidence and bounded time/filter window.
2. Apply the curated rubric: count known noise, prioritize actionable patterns,
   and preserve unknowns rather than forcing a diagnosis.
3. Join target/correlation/fallback evidence where available and label missing
   links explicitly.
4. Validate mismatch claims against current source and target/provider contracts.
5. Emit a report and a self-improvement proposal; a harness reviewer decides
   whether the reference catalog should change.
6. Keep references append-only or versioned by review; do not let raw logs
   silently rewrite institutional guidance.

### Why

Routine error logs are a high-signal source for provider drift, configuration
 mismatches, and fallback failures, but they are noisy and account-dependent. A
 curated workflow prevents wasted attention on known 403/429 issues while
 continuously improving the team's ability to detect meaningful 400/404/tool
 protocol regressions.

## Parallelism / file ownership

| Class | Detail |
|-------|--------|
| **parallel-safe** | Read-only investigators may split by provider/status after the raw query snapshot is fixed. |
| **serializable** | Reference proposals, skill updates, ownership registration, and activation require independent review. |
| **Collision** | OmniRoute skill root, workflow/reference docs, registry/evolution/index projections. |

## ⛔ Anti-Hallucination Guardrails

> [!CAUTION]
> Examples in the reference corpus are not live evidence. Never turn a provider
> error message into a task without source/log correlation. Never make 403/429
> disappear; only deprioritize them under the documented policy.

> [!IMPORTANT]
> Read every file in the Where table before writing. No auto-reference mutation,
> no raw log dumps, no secrets, no `general`, max ten investigators, and all
> failed/empty subagents follow the resume/three-strike protocol.

## 🛡️ Compliance Checklist (Leis Primárias do AGENTS.md)

- [ ] **Doc Accuracy**: workflow/API/filter/provider examples verified against code or labeled as examples.
- [ ] **Zod Validation**: any executable input/config is bounded and validated.
- [ ] **Security**: logs/references redacted and secret-scanned.
- [ ] **Error Sanitization**: reports preserve bounded useful errors without raw bodies.
- [ ] **No Raw SQL**: use API log surfaces, not direct DB access.
- [ ] **Archive Protocol**: preserve reference history; no destructive rewrite.

## 📋 Completion Evidence (preenchido pelo agente executor)

- **Files/assets created**: [paths]
- **Dry-run packet**: [path/output]
- **Harness validators**: [commands/results]
- **Secret scan**: [command/result]
- **Independent review**: [reviewer/verdict/score]
- **Changelog draft**: [task/agent/project/title/description/summary/verification]
- **Data**: [YYYY-MM-DD]

## 🔍 Review Trail (preenchido pelo reviewer)

- **Reviewer**: [nome/role]
- **Data da review**: [YYYY-MM-DD]
- **Veredito**: [APROVADO / REJEITADO]
- **Score**: [0-100]
- **Notas**: [evidence-based]
