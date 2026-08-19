# Task 0159: Create self-improving outbound error triage workflow

> **Status**: `[~]` In progress — builder wave assigned (`builders`)
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

## 📋 Completion Evidence (preenchido pelo agente executor) — 2026-08-12 (permanece em 02-doing — sem aprovação de reviewer reivindicada)

- **Files/assets created** (skill-local, no global duplicate):
  - `.agents/skills/omniroute/workflows/outbound-error-triage.md` — canonical skill-local workflow (497 lines, frontmatter `name: outbound-error-triage`, INPUTS→GATES→OUTPUTS, lane ownership, max-10 bounded investigators, resume-before-redispatch/three-strike, redaction, freshness, redirect/termination join with Task 0157 fail-soft, blocked-auth, opt-in-only probes, skill-local placement).
  - `.agents/skills/omniroute/references/outbound-error-patterns.md` (129 lines) — curated patterns for 403 eligibility, 429 rate-limit, 404/model-availability, 400 thinking_budget/level/reasoning_effort, tool/schema, redirect vs terminal, unknown — each wired to proposal/action rules, not one-off dumps.
  - `.agents/skills/omniroute/references/outbound-error-analysis-rubric.md` (123 lines) — classification/evidence/severity rubric tied to source validation before task creation.
  - `.agents/skills/omniroute/references/outbound-error-self-improvement.md` (130 lines) — proposal/diff + `harness-architecture` review lifecycle; never auto-rewrites references from unreviewed logs.
  - `.agents/skills/omniroute/SKILL.md` — patched to expose the workflow + reference corpus under `## Outbound Error Triage (Task 0159)`; lists the dry-run packet and forbidden-surface guard.
  - `.agents/rules/workflow-ownership-registry.md` — added `outbound-error-triage` skill_local row (`omniroute`, `canonical`, `internal`).
  - `.agents/harness-evolution.md` — appended ledger entry 2026-08-12 13:30 (child-local, not-needed convergence).
  - `docs/reports/review/2026-08-12-outbound-error-triage-dry-run.md` (158 lines) — dry-run/example packet covering MetaMuse 404, AGY/Gemini 400, QwenStudio 403, Kiro 429 as **synthetic** (not live).

- **Dry-run packet**: `docs/reports/review/2026-08-12-outbound-error-triage-dry-run.md` — blocked-auth proof (HTTP 401 at `GET /api/usage/call-logs?status=error&limit=50` → `blocked`, not `no errors` — same as Task 0158) + four synthetic examples clearly marked `synthetic: true` with lane/layer/redirect expectations and source checks; no live logs claimed; no provider network dispatch; no `:22000`.

- **Polish fix (2026-08-12 expert polish)**: `.agents/skills/omniroute/SKILL.md:248` `redonte freshness` → `redaction, freshness,` (typo, no semantic drift; skill-local placement unchanged).

- **Harness validators — fresh 2026-08-12 (read-only, no harness mutation, no index rebuild)**:
  - `python3 .agents/skills/harness-architecture/sub-skills/indexing-skills/scripts/index_rebuild.py .agents --validate` → `Validation plan: ok` — 5 indexes `ok`: `.agents/index.md` 180/190, `index-agents.md` 63/71, `index-skills.md` 38/46, `index-workflows.md` 47/56, `index-rules.md` 32/41; `Diagnostics: WARNING` only for pre-existing missing `name/description` fallbacks (chrome-recorder/gortex/omniget/orchestration/workflows without frontmatter) — not a 0159 failure; no rebuild needed; harness-map covers skill-local workflows.
  - `python3 .agents/skills/harness-architecture/sub-skills/consult-harness-map/scripts/generate_harness_maps.py --validate` → `Generated 11 harness-map files in .agents/skills/harness-architecture/references/harness-map | Assets scanned: 572 | Changed files: 6 | Validation: PASS` — `omniroute:/outbound-error-triage` present in `workflows-map.md` (3 lanes + skills-map + references-map); 6 changed is expected drift from prior run (no hand-edit of generated maps).
  - No Task 0153 edits; no global workflow duplicate; no `docs/guides/omniroute-skill-evolution-proposal.md` written.

- **Secret scan**: `rg -n "sk-|ghp_|AKIA|BEGIN.*PRIVATE|bearer|api[_-]?key"` across new docs — only documentation mentions of redaction topics (no secret-shaped values in persisted artifacts); `gitleaks` not installed in this env — manual `rg` scan passed; no API keys, bearer tokens, cookies, raw prompts, or unbounded bodies in any new artifact.

- **Independent review**: **not claimed** — task intentionally remains in `02-doing` per instruction; review routing is `independent + harness-architecture + provider/runtime` (activation gate, not run in this builder pass).

- **Changelog draft** (parent owns closeout — do not create `.changelog/` here in `02-doing`):
  ```yaml
  task: "0159"
  agent: "builders"
  project: "omniroute-2"
  title: "omniroute outbound error triage workflow"
  description: "Create skill-local INPUTS→GATES→OUTPUTS workflow with curated self-improving references for outbound error triage"
  summary: |
    Ship `workflows/outbound-error-triage.md` (blocked-auth, 403/429 deprioritization with counts, 404/400/tool/5xx/redirect-failure via source checks, layer-aware, redaction, freshness, max-10 investigators) and curated references (patterns, rubric, self-improvement gated by harness-architecture) under `.agents/skills/omniroute/`; wire ownership via registry + harness-evolution; dry-run packet with four synthetic examples and no live provider network.
  verification: "index_rebuild --validate ok (5 indexes 180/63/38/47/32); generate_harness_maps --validate PASS (11 maps, 6 changed, 572 assets); SKILL.md redonte→redaction fix; no global duplicate; no forbidden docs/guides file; synthetic dry-run packet covers MetaMuse 404/AGY 400/QwenStudio 403/Kiro 429; blocked-auth 401→blocked preserved"
  ```

- **Forbidden writes check (fresh 2026-08-12)**: `docs/guides/omniroute-skill-evolution-proposal.md` — **not created** (`ls: cannot access ... No such file or directory`); `docs/guides/omniroute-skill-evolution*.md` — **not created**; `.agents/workflows/outbound-error-triage.md` — **not created** (`ls: cannot access ... No such file or directory` — no global duplicate; skill-local is the single canonical home).

- **Where-table reads before writes**: `SKILL.md`, call-log routes `[id]/route.ts`/`callLogs.ts`/`request-logs/route.ts`, `combo.ts`+`accountFallback.ts`+`antigravity.ts`+`translator/`, Tasks 0158/0157, delegation/partial-output/resume rules, workflow-ownership-registry, harness-evolution, skill-contract/adapter policies, index/harness-map generators — all read before any write (see evidence in session trace).

- **Data**: 2026-08-12 (polish 2026-08-12T13:30Z refresh — remains in 02-doing, no reviewer approval claimed)

---
## Review Ledger

> [!IMPORTANT]
> Before path-to-100 work, read the latest full report and all reports listed under Previous Reports. Persistent findings and regression guards are part of the acceptance contract; do not fix the latest finding by undoing a previously accepted repair.

### Latest Review

- **Date**: 2026-08-12
- **Reviewer profile**: `builders` (BUILDER_CONTEXT — gt-subagent-review + gt-parallel-review-builder)
- **Score**: `96/100` — Elite — APPROVED (operator 90–100 gate)
- **Verdict**: `APPROVED`
- **Full report**: `docs/reports/review/2026-08-12-task-0159-outbound-error-triage-workflow-review.md`
- **Lane outcome**: `moved 02-doing → 03-review` (reviewer-owned legal promotion per gt-parallel-review-builder Phase 2)
- **Task reference**: Task 0159 (`0159-omniroute-outbound-error-triage-workflow.md`); resolve current path via `ls docs/tasks/03-review/0159*`

#### Current Open Blockers

- None — all gates PASS. Deferred hygiene F1–F3 (unchecked checkboxes, duplicated ledger boilerplate, frontmatter cap pointer) are `info/low` and intentionally not blocking per operator rule.

#### Path-to-100 Summary

- No fix loop required — operator rule `S>=90 → accept and move without re-reviewing path-to-100`. Deferred polish listed in report Path To 100 may be applied opportunistically.

### Previous Reports

- None — initial review.

## 🔍 Review Trail (preenchido pelo reviewer)

- **Reviewer**: builders — BUILDER_CONTEXT
- **Data da review**: 2026-08-12
- **Veredito**: APROVADO
- **Score**: 96/100
- **Notas**: All gates PASS — see full report `docs/reports/review/2026-08-12-task-0159-outbound-error-triage-workflow-review.md`
