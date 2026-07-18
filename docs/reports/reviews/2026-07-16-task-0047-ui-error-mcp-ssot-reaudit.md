# Review Report: Task 0047 — UI Error Object + MCP SSoT — Adversarial Re-audit 2026-07-16

## Review Lineage

- **Current task**: Task 0047 (`omniroute-ui-error-object-mcp-ssot`); live path `docs/tasks/03-review/0047-omniroute-ui-error-object-mcp-ssot.md`
- **Previous reports read**:
  - `docs/reports/reviews/2026-07-11-task-0047-ui-error-mcp-ssot-review.md` — score **93/100**, `PASS WITH NOTES` (N1 TOTAL overcount; residual toasts)
- **Related reports considered**:
  - Source: `docs/reports/08-app-ui-shared.md` (F-08-001…003; stretch deferred)
  - Soft dep Task 0044 MCP edge (scopes) — not required for this reaudit
- **Review mode**: `re-review` (adversarial / independent security & correctness re-audit)
- **Reviewer profile**: `reviewers` (agentID=reviewers)
- **Parent agentID**: `reviewers`

## Score And Verdict

- **Score**: `91/100`
- **Verdict**: `HELD_IN_REVIEW_PATH_TO_100`
- **Lane recommendation**: `hold-in-review` (S ≥ 90 — remain in `docs/tasks/03-review/`; do **not** return to `02-doing/`; do **not** promote to `04-completed/`)

### Rubric snapshot

| Dimension | Score | Notes |
| --- | --- | --- |
| F-08-001 extractors + report call sites | 94 | `handleResponse` + report-listed sites still use extractors; edge probes never yield `[object Object]` for structured envelopes |
| F-08-002 hub counts | 97 | Hub still imports `MCP_TOOL_COUNT` / `MCP_SCOPE_COUNT` / `MCP_TRANSPORT_COUNT` (93/31/3) — no 37/13 hardcode |
| F-08-003 scope/tool SSoT parity | 91 | Live: map keys 93, scopes 31, catalog matches; `TOTAL_MCP_TOOL_COUNT` still **95** (PERSISTENT N1) |
| Extractor edge completeness | 88 | `extractApiErrorMessage` ignores top-level `message` / `detail` (unlike `getErrorMessage`); messageless object → fallback only (OK, not stringify) |
| Residual raw `data.error` sites | 86 | Many non-report paths still `new Error(data.error)` (OAuth modals, providers, settings Mitm, combos, translator) |
| Tests / evidence | 93 | Fresh 0047 suite subset **19/19** pass (handle-response + scope-parity + api-error-message) |
| Stretch href/OAuth | — | Still deferred (N4) |

## Delta Summary

### Resolved Since Previous Review

- none — no product remediation of N1–N4 since 2026-07-11.

### Persistent Findings

- `PERSISTENT` N1 (Low): `TOTAL_MCP_TOOL_COUNT` still double-counts agentSkill tools already in `MCP_TOOLS` → **95** vs unique/hub **93**. Hub correctly uses `MCP_TOOL_COUNT`.
- `PERSISTENT` N2 (Info): Dual-maintained `MCP_TOOL_SCOPES` (constants + inline tool scopes) — mitigated by parity test, not generated SSoT.
- `PERSISTENT` N3 (Info): Residual dashboard/OAuth `new Error(data.error)` paths outside report primary list remain.
- `PERSISTENT` N4 (Info): Stretch F-08-004–008 / W2 deferred.

### Regressions

- none on F-08-001–003 wires (hub counts, parity suite, report call sites).

### New Findings (adversarial)

- `NEW` N5 (Low): Dual helpers diverge — `extractApiErrorMessage` does **not** read top-level `message`/`detail` or `JSON.stringify` messageless `error` objects; `getErrorMessage` does. Sites that only use extract + empty nested message fall back even when `body.message` is actionable. Not `[object Object]`, but operator UX incompleteness.
- `NEW` N6 (Info): `extractApiErrorMessage(body, fallback)` returns `fallback` as-is; TypeScript types `fallback: string`, but JS misuse with non-string fallback could reintroduce object rendering (no runtime typeof guard).
- `NEW` N7 (Info / confirmed residual list expansion): Live `rg 'new Error(data.error'` still hits among others:
  - `KiroAuthModal.tsx`, `CursorAuthModal.tsx`, `OAuthModal.tsx`, `KiroSocialOAuthModal.tsx`
  - `providers/page.tsx`, `useProviderConnections.ts`, `useModelImportHandlers.ts`
  - `settings/components/MitmProxyTab.tsx`
  - `combos/page.tsx` (partially guarded with `?.message`)
  - `translator/.../CompressionPreviewAccordion.tsx`
  Matches task residual documentation; still path-to-100 if claiming “dashboard-wide” fix.
- `NOTE` N8: Extractor edge matrix (this session): string/`{message}`/empty/null/non-string message/array error → safe fallback; **never** `[object Object]` for those cases.

### Evidence Gaps / External Blockers

- `EVIDENCE_GAP`: Full typecheck/lint not re-run; full prior 34-test matrix not all re-executed (`mcp-pool-tools-3368` skipped this session).
- `EXTERNAL_BLOCKER`: none.

## Findings

| ID | Class | Severity | Status | Summary | First seen | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| N1 | PERSISTENT | Low | Open | TOTAL_MCP_TOOL_COUNT 95 vs unique 93 | 2026-07-11 | `server.ts:119-128`; live probe TOTAL=95, MCP_TOOL_COUNT=93 |
| N2 | PERSISTENT | Info | Accepted residual | Dual-maintained maps | 2026-07-11 | `mcpScopes.ts` + tool modules |
| N3 | PERSISTENT | Info | Open residual | Non-report object-error throws | 2026-07-11 + reverify | rg hits listed in N7 |
| N4 | PERSISTENT | Info | Deferred | Stretch OAuth/href | 2026-07-11 | task checkbox |
| N5 | NEW | Low | Open | extract vs getErrorMessage coverage gap | this reaudit | `apiErrorMessage.ts` vs `api.ts:75-96` |
| N6 | NEW | Info | Open | no runtime typeof on fallback | this reaudit | `extractApiErrorMessage` |
| G1–G7 | Guard | — | Pass | Report sites + hub + full parity | reverify | see below |

### Guards (still pass)

| ID | Guard | Status | Fresh proof |
| --- | --- | --- | --- |
| G1 | Report F-08-001 call sites use extractors | Pass | webhooks / audit / ProviderQuotaWidget / ApiEndpointsTab / usePreviewCompression |
| G2 | Hub no 37/13 hardcode | Pass | `mcp/page.tsx:324-327` live counts |
| G3 | Scope list covers memory/skills/plugins/KB/gamification | Pass | 31 scopes; parity suite |
| G4 | Full module parity | Pass | `mcp-scope-parity-0047` green |
| G5 | Catalog size = hub tool count | Pass | 93 = 93 |
| G6 | Existing extractors preferred | Pass | no parallel invent helper |
| G7 | Object/string/fallback unit tests | Pass | handle-response + error-message suites |

## Contract Compliance (Exit Conditions)

| Exit / MUST | Status | Live proof |
| --- | --- | --- |
| F-08-001 via existing helpers + report sites | ✅ | `api.ts:98-111`; report sites still wired |
| F-08-002 hub live counts | ✅ | MCP_TOOL/SCOPE/TRANSPORT_COUNT imports |
| F-08-003 maps aligned / parity gate | ✅ | suite green; live 93 tools / 31 scopes / 0 orphans |
| Unit tests | ✅ | 19 pass this session (0047 core trio) |
| MUST extractor object → message | ✅ | edge probe + tests |
| MUST string passthrough | ✅ | |
| MUST safe fallback not `[object Object]` | ✅ | |
| Stretch | ➖ deferred | |

### Live inventory (this session)

| Metric | Value |
| --- | --- |
| `MCP_TOOL_COUNT` / map keys / catalog | 93 |
| `MCP_SCOPE_COUNT` / list length | 31 |
| `MCP_TRANSPORT_COUNT` | 3 |
| `TOTAL_MCP_TOOL_COUNT` | 95 (overcount; N1) |

### Fresh verification commands

```bash
node --import tsx/esm --test \
  tests/unit/api-handle-response-0047.test.ts \
  tests/unit/mcp-scope-parity-0047.test.ts \
  tests/unit/api-error-message-5340.test.ts
# → 19 pass / 0 fail

# Live constants probe
node --import tsx/esm -e 'import { MCP_TOOL_COUNT, MCP_SCOPE_COUNT, MCP_TOOL_SCOPES } from "./src/shared/constants/mcpScopes.ts";
import { TOTAL_MCP_TOOL_COUNT } from "./open-sse/mcp-server/server.ts";
console.log({ MCP_TOOL_COUNT, MCP_SCOPE_COUNT, map: Object.keys(MCP_TOOL_SCOPES).length, TOTAL_MCP_TOOL_COUNT });'
# → { MCP_TOOL_COUNT: 93, MCP_SCOPE_COUNT: 31, map: 93, TOTAL_MCP_TOOL_COUNT: 95 }
```

## Path To 100

1. Set `TOTAL_MCP_TOOL_COUNT` to unique catalog / `MCP_TOOL_COUNT` (or dedup agentSkill in arithmetic); assert exact equality in parity test (close N1).
2. Optionally unify extractors: re-export one helper that covers top-level `message`/`detail` + nested envelope (close N5); runtime `typeof fallback === "string"`.
3. Residual sweep of high-traffic OAuth/providers/settings `new Error(data.error)` when those files are next touched (N3/N7).
4. Stretch security (href allowlist) remains separate.

## Verdict Rationale

F-08-001–003 contracts remain satisfied with green parity and hub SSoT. Adversarial edges show no regression to `[object Object]` on the primary helper, dual-helper coverage gaps and residual raw toasts are accepted path-to-100 residuals, and TOTAL overcount is still Low. Score **91** (trim from 93 for residual confirmation + N5).

**Lane**: stay in `docs/tasks/03-review/` (S ≥ 90).
