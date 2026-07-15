# Review Report: Task 0047 — UI Error Object + MCP SSoT — 2026-07-11

## Review Lineage

- **Current task**: Task 0047 (`omniroute-ui-error-object-mcp-ssot`); live path `docs/tasks/03-review/0047-omniroute-ui-error-object-mcp-ssot.md`
- **Previous reports read**: none under `docs/reports/reviews/` for 0047
- **Related reports considered**:
  - Primary finding source: `docs/reports/08-app-ui-shared.md` (F-08-001 / F-08-002 / F-08-003; stretch F-08-004–008, F-08-W2-*)
  - Soft dep: MCP edge runtime / Task 0044 scope exports (`docs/reports/04-mcp-edge-runtime.md`) — not required for this review
- **Review mode**: `initial`
- **Reviewer profile**: `reviewers` (Code Quality Reviewer / independent task reviewer)
- **Parent agentID**: `reviewers`
- **Commit under review**: `09529ca` — `fix(dashboard): structured API errors + MCP hub/scope SSoT (0047)`

## Score And Verdict

- **Score**: `93/100`
- **Verdict**: `PASS WITH NOTES` / `HELD_IN_REVIEW_PATH_TO_100`
- **Lane recommendation**: `hold-in-review` (S ≥ 90 — remain in `docs/tasks/03-review/`; do **not** return to `02-doing/`; do **not** promote to `04-completed/`)

### Rubric snapshot

| Dimension | Score | Notes |
| --- | --- | --- |
| Contract / exit conditions | 96 | F-08-001–003, tests, CHANGELOG, residuals documented; stretch deferred as allowed |
| F-08-001 error extractors | 94 | `handleResponse` + all report-listed call sites rewired via existing helpers |
| F-08-002 hub counts | 97 | Hub imports `MCP_TOOL_COUNT` / `MCP_SCOPE_COUNT` / `MCP_TRANSPORT_COUNT`; no 37/13 hardcode |
| F-08-003 scope SSoT | 91 | Full maps + strong parity gate; dual-maintained (not generated); heartbeat total still soft |
| Tests / verification | 94 | 34/34 fresh pass across 0047 + #5340 + pool; parity is real against live modules |
| Scope discipline | 95 | No frontend IA reopen; stretch security items deferred; residuals listed |
| Hygiene / evidence | 88 | `typecheck:core` not re-run this session; `handleResponse` tested via reimplementation twin |

## Delta Summary

### Resolved Since Previous Review

- N/A — initial independent review.

### Persistent Findings

- none (first review)

### Regressions

- none observed on Task 0047 surfaces

### New Findings

- `NEW` N1 (Low): `TOTAL_MCP_TOOL_COUNT` still double-counts `agentSkillTools` already present in `MCP_TOOLS` → **95** vs unique catalog / hub **93**
- `NEW` N2 (Info / accepted): Dual-maintained `MCP_TOOL_SCOPES` (shared constants + inline tool scopes), not a generated single export — mitigated by `mcp-scope-parity-0047`
- `NEW` N3 (Info / accepted): Residual `new Error(data.error…)` / object-error paths remain outside the report primary list (settings tabs, providers, OAuth services, runtime cooldowns, translator, agent-bridge) — documented by executor
- `NOTE` N4: Stretch F-08-004–008 / F-08-W2-* deferred — matches task subtask checkbox

### Evidence Gaps / External Blockers

- `EVIDENCE_GAP`: Full `npm run typecheck:core` not re-run this session. Touched surfaces are pure TS constant/import rewires; eslint on key files exit 0. Not treated as contract failure.
- `EXTERNAL_BLOCKER`: none

## Findings

### Blocking

- none

### Non-blocking (path-to-100)

| ID | Severity | Summary | Evidence | Fix |
| --- | --- | --- | --- | --- |
| N1 | Low | Heartbeat `TOTAL_MCP_TOOL_COUNT` overcounts unique tools by 2 (agentSkill triple overlap) | `open-sse/mcp-server/server.ts:119-128` arithmetic; live probe: TOTAL=95, `MCP_TOOL_COUNT`/catalog=93; agent names fully overlap `MCP_TOOLS` | Dedup like `getAllToolDefinitions()` or set `TOTAL_MCP_TOOL_COUNT = MCP_TOOL_COUNT` / unique catalog size; tighten parity test from ±5 to exact equality |
| N2 | Info | Maps dual-maintained rather than generated SSoT | `src/shared/constants/mcpScopes.ts` vs tool modules; task allows “or generated check” | Optional: generate map from registries; keep parity test as gate |
| N3 | Info | Residual dashboard object-error toasts | Task Completion Evidence residual list; `rg 'new Error(data.error'` still hits settings/providers/OAuth | Follow-up sweep when those files are touched; optional lint ban |
| N4 | Info | Stretch security/UX deferred | Task Details: “Stretch href allowlist… (deferred)” | Separate task(s) for F-08-004–008 / W2 |

### Guards (pass)

| ID | Guard | Status | Evidence |
| --- | --- | --- | --- |
| G1 | Report F-08-001 call sites no longer pass raw object errors | Pass | webhooks (client/wizard/deliveries/step3), audit (MCP+compliance), ProviderQuotaWidget, ApiEndpointsTab, usePreviewCompression all use `extractApiErrorMessage` |
| G2 | Hub intro not hardcoding 37/13 | Pass | `mcp/page.tsx:324-327` uses shared counts; parity test asserts no `tools:\s*37` / `scopes:\s*13` |
| G3 | Shared scope list covers memory/skills/plugins/KB/gamification | Pass | `MCP_SCOPE_LIST` 31 entries; live unique scopes 31; zero only-in-list / only-in-live |
| G4 | Full module parity (not pool-only) | Pass | `mcp-scope-parity-0047` imports base+memory+skill+agentSkill+pool+gamification+plugin+notion+obsidian+compression |
| G5 | Catalog size equals hub tool count | Pass | `getAllToolDefinitions().length === MCP_TOOL_COUNT === 93`; no map orphans / missing map entries |
| G6 | Existing extractors preferred (no parallel invent helper) | Pass | Sites import `@/shared/http/apiErrorMessage`; `handleResponse` uses `getErrorMessage` + `parseResponseBody` |
| G7 | Unit tests for object/string/fallback extractors | Pass | `api-handle-response-0047` + `api-error-message-5340` cover message extraction, string passthrough, non-`[object Object]` fallback |

## Contract Compliance (Exit Conditions)

| Exit / MUST | Status | Live proof |
| --- | --- | --- |
| F-08-001 via existing helpers + report high-traffic sites | ✅ | `api.ts:98-111`; rewired call sites in commit `09529ca` |
| F-08-002 hub uses live counts (no 37/13) | ✅ | `mcp/page.tsx` imports `MCP_*_COUNT`; intro interpolates constants |
| F-08-003 shared maps aligned with server (or SSoT/export) | ✅ | Expanded `mcpScopes.ts`; parity suite green; catalog↔map exact |
| Unit tests pass | ✅ | Fresh: 34 pass / 0 fail (`api-handle-response-0047`, `mcp-scope-parity-0047`, `api-error-message-5340`, `mcp-pool-tools-3368`) |
| `typecheck:core` | ⚠️ claimed by executor | Not re-run this session (`EVIDENCE_GAP`); no type-shape risk found on review |
| lint — no new errors | ✅ | eslint on key touched files exit 0 |
| CHANGELOG.md entry | ✅ | Unreleased Fixed — Task 0047 / F-08-001–003 |
| MUST extractor: object `{ error: { message } }` → message | ✅ | Tests + `extractApiErrorMessage` / `getErrorMessage` |
| MUST extractor: string passthrough | ✅ | Tests |
| MUST extractor: safe fallback (not `[object Object]`) | ✅ | Tests; `getErrorMessage` uses `JSON.stringify` for messageless objects |
| MUST hub count source equals live / same module | ✅ | Hub + catalog both 93 via shared `MCP_TOOL_COUNT` / live registry aggregation |
| MUST scope parity fails on unknown/missing scopes | ✅ | `mcp-scope-parity-0047` covers all tool modules |
| Stretch OAuth/href (optional) | ➖ deferred | Explicit residual; not blocking |

## Implementation Notes (verified)

### F-08-001 / F-08-010

- `handleResponse` no longer does `new Error(data.error)` on structured envelopes; uses `parseResponseBody` + `getErrorMessage` (`src/shared/utils/api.ts:98-111`).
- Report-listed dashboard clients all funnel through `extractApiErrorMessage`.
- Test reimplements `handleResponse` contract rather than importing the private function — acceptable twin; source matches the twin body.

### F-08-002

- Hub: `tools: MCP_TOOL_COUNT` (93), `scopes: MCP_SCOPE_COUNT` (31), `transports: MCP_TRANSPORT_COUNT` (3).
- Correct product choice: hub uses unique catalog SSoT, not the legacy additive `TOTAL_MCP_TOOL_COUNT`.

### F-08-003

- `MCP_SCOPE_LIST` expanded to 31 live scopes including memory/skills/plugins/notion/obsidian/gamification/catalog/tools.
- `MCP_TOOL_SCOPES` maps 93 tools; inline scopes match map when present; no orphans.
- `TOTAL_MCP_TOOL_COUNT` is exported (exit claim) but remains a slightly inflated heartbeat metric (N1).

## Fresh Verification Commands

```bash
node --import tsx/esm --test \
  tests/unit/api-handle-response-0047.test.ts \
  tests/unit/mcp-scope-parity-0047.test.ts \
  tests/unit/api-error-message-5340.test.ts \
  tests/unit/mcp-pool-tools-3368.test.ts
# → 34 pass / 0 fail

npx eslint --max-warnings=999 \
  src/shared/utils/api.ts \
  src/shared/constants/mcpScopes.ts \
  src/shared/http/apiErrorMessage.ts \
  'src/app/(dashboard)/dashboard/mcp/page.tsx' \
  'src/app/(dashboard)/dashboard/webhooks/WebhooksPageClient.tsx' \
  src/hooks/usePreviewCompression.ts
# → exit 0
```

Live inventory probe (this session):

| Metric | Value |
| --- | --- |
| `MCP_TOOL_COUNT` / catalog | 93 |
| `MCP_SCOPE_COUNT` | 31 |
| `TOTAL_MCP_TOOL_COUNT` | 95 (overcount; N1) |
| Catalog scope mismatches vs map | 0 |
| Scopes only-in-list / only-in-live | 0 / 0 |

## Verdict

```markdown
## Findings
- [LOW] `open-sse/mcp-server/server.ts:119` — TOTAL_MCP_TOOL_COUNT double-counts agentSkill tools (95 vs unique 93).
  Evidence: agent skill names fully overlap MCP_TOOLS; hub correctly uses MCP_TOOL_COUNT=93.
  Impact: heartbeat/diagnostics inventory slightly wrong; hub onboarding copy is correct.
  Fix: dedup or bind to unique catalog / MCP_TOOL_COUNT; assert exact equality in parity test.
- [INFO] Dual-maintained MCP_TOOL_SCOPES + residual non-report `data.error` paths — accepted residuals.

## Open Questions
- none blocking

## Verdict
PASS WITH NOTES
```

**Score: 93/100** — stay in `docs/tasks/03-review/`.
