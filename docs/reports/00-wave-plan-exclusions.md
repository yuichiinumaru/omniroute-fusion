# Adversarial Codebase Review — Wave Plan & Exclusions

**Date**: 2026-07-11  
**Orchestrator**: reviewer-orchestrator (`agentID=reviewers`)  
**Mode**: full-codebase adversarial bug/quality hunt (not task-lane drain)

## Active tasks EXCLUDED from investigation

Reviewers MUST NOT re-investigate, re-file, or expand work already covered by these open/doing tasks. Mention only as "already tracked" if incidental.

| Lane | Task | Scope (do not dig for new work here) |
|------|------|--------------------------------------|
| `01-open` | **0036** Deploy/Verify 21000 Dual-Mode Auth | Live deploy proof for dual-mode auth / `no_refresh_token` apikey false-positives on :21000 |
| `02-doing` | **0017** Fusion Docs, i18n Keys, Operator Notes | `docs/architecture/FUSION.md`, fusion i18n keys in `en.json`, CHANGELOG fusion notes |

**Also out of primary re-audit** (already in `03-review` — do not open competing fix tasks for the same acceptance criteria; residual *unrelated* bugs in adjacent files are OK if clearly out of those task contracts):

- Fusion epic 0010–0016, 0018
- Dual-mode auth 0032–0035, 0037–0039
- Frontend IA 0023–0031

## Eight slices (balanced by domain + LOC)

| ID | Report | Paths | ~LOC |
|----|--------|-------|------|
| 01 | `docs/reports/01-open-sse-pipeline.md` | `open-sse/handlers/`, `open-sse/translator/`, `open-sse/transformer/`, `open-sse/utils/` | ~51k |
| 02 | `docs/reports/02-open-sse-executors-config.md` | `open-sse/executors/`, `open-sse/config/` | ~52k |
| 03 | `docs/reports/03-open-sse-services.md` | `open-sse/services/` | ~76k |
| 04 | `docs/reports/04-mcp-edge-runtime.md` | `open-sse/mcp-server/`, `src/sse/`, `src/domain/`, `src/server/`, `src/mitm/`, `electron/`, `src/instrumentation*.ts`, `src/server-init.ts` | ~35k |
| 05 | `docs/reports/05-lib-data-auth.md` | `src/lib/db/`, `src/lib/oauth/`, `src/lib/providers/`, `src/lib/credentialHealth/`, `src/lib/resilience/`, `src/lib/quota/`, `src/lib/usage/`, `src/lib/auth/`, `src/lib/accessTokens/`, `src/lib/security/`, `src/lib/config/`, `src/lib/env/`, `src/lib/freeProxyProviders/`, `src/lib/headroom/` | ~70k |
| 06 | `docs/reports/06-lib-features-tooling.md` | remaining `src/lib/**` not in 05; `bin/`; `scripts/` | ~100k |
| 07 | `docs/reports/07-app-api.md` | `src/app/api/`; non-dashboard app routes (`login`, `auth`, `authorize`, `callback`, `connect`, `landing`, `status`, …) | ~60k |
| 08 | `docs/reports/08-app-ui-shared.md` | `src/app/(dashboard)/`, `src/shared/`, `src/i18n/`, `src/hooks/`, `src/store/`, `src/components` if any | ~190k |

Note: slice 08 is larger (UI surface); reviewers sample deeply by area rather than exhaust every line.

## Waves

1. **Wave 1**: 8 independent adversarial reviewers → create report files.
2. **Wave 2**: 8 independent second-pass reviewers → read existing report, append only new findings block.
3. **Architect 1**: epic/story + remediation tasks from all reports.
4. **Architect 2**: review/upgrade epic + tasks.

## Report format (Wave 1)

```markdown
# Slice NN: <name> — Adversarial Review (Wave 1)

## Scope
## Exclusions honored
## Method
## Findings (severity-ordered)
### F-NN-001 — title
- Severity: P0|P1|P2|P3
- Category: bug|security|dead-code|wiring|perf|maintainability|test-gap|…
- Evidence: path:line
- Why it matters
- Suggested fix direction
## Dead code / orphans
## Wiring smells
## Improvement opportunities
## Summary counts
```

Wave 2 appends only:

```markdown
---
# Wave 2 — Second-pass adversarial delta
## Method
## New findings (not in Wave 1)
### F-NN-W2-001 — …
## Wave 1 items confirmed / strengthened (optional)
## Residual risk
```
