# Gortex Architectural Analysis — OmniRoute (2026-07-24)

> **Engine**: Gortex v0.58.0+806478f5 (MCP + CLI)
> **Repo path**: `/home/sephiroth/working/ganthritor/cybernetics-core/omniroute-2`
> **Indexed**: 3.795 files → 120.672 nodes → 357.559 edges
> **Agent**: builder-orchestrator (`builders` lane)

---

## 1. Environment note

The `.agents` symlink was broken (`../.agents` pointed to a non-existent path after the repository was moved into `ganthritor/cybernetics-core/`). It was repaired to `../../.agents`, the daemon was restarted, and the repository was re-tracked under the current path.

---

## 2. Executive summary

| Metric | Result |
|--------|--------|
| Overall health score | 78.44 / 100 (median 81.63) |
| Grade-A symbols | 8.222 |
| Grade-F symbols | 1.058 (~6.3 %) |
| Dependency cycles | **None detected** |
| Top hotspots | `handleChatCore`, `ComboFormModal`, `APIPageClient`, `createSSEStream`, `handleComboChat` |
| Critical security findings | CWE-95 (`new Function`), CWE-327 (MD5/SHA1) |

The codebase is broadly healthy but has **severe complexity concentration** in the chat/combo pipeline and a small number of security residuals.

---

## 3. Architectural hotspots (health_score + hotspots + bottlenecks)

### 3.1 Top complexity monsters

| Symbol | File | Cognitive | Cyclomatic | Fan-out |
|--------|------|-----------|------------|---------|
| `handleChatCore` | `open-sse/handlers/chatCore.ts:344` | 682 | 268 | 715 |
| `GET` (models) | `src/app/api/providers/[id]/models/route.ts:785` | 551 | 245 | — |
| `getUnifiedModelsResponse` | `src/app/api/v1/models/catalog.ts:358` | 461 | 188 | — |
| `handleComboChat` | `open-sse/services/combo.ts:744` | 443 | 121 | — |
| `openaiToGeminiBase` | `open-sse/translator/request/openai-to-gemini.ts:242` | 399 | 76 | — |
| `BaseExecutor.execute` | `open-sse/executors/base.ts:738` | 251 | 75 | — |
| `handleSingleModelChat` | `src/sse/handlers/chat.ts:839` | 247 | 75 | — |

**Interpretation**: `handleChatCore` is the gravitational center of the system — every chat/embedding/image/audio request flows through it. Its score (817) indicates a very high regression risk. `handleComboChat` (score 504) is the second-largest risk area and is directly relevant to combo topology work, because its nested-combo/depth/cycle logic is what 0112 must mirror.

### 3.2 Grade distribution

```
A: 8.222   B: 3.620   C: 2.454   D: 1.478   F: 1.058
```

~16 % of symbols are below a C grade. This is not catastrophic, but the low-grade mass is concentrated in old UI pages and the streaming pipeline.

### 3.3 Dependency graph health

- **No cycles** detected by `gortex analyze cycles`.
- Edge extraction for TypeScript call/import edges appears incomplete: `gortex query deps/calls` returned empty `edges` arrays even for high-fan-out symbols. Therefore, **blast-radius estimates derived from Gortex call-graph edges should be treated as low-confidence** until the indexer config or resolution tier is improved.

---

## 4. Security findings (SAST)

| Severity | CWE | Detector | File | Line | Evidence |
|----------|-----|----------|------|------|----------|
| 🔴 error | CWE-95 | `js-eval-use` | `src/lib/middleware/registry.ts` | 58 | `new Function("context", \`return (async () => { ${code} })();\`)` |
| 🔴 error | CWE-327 | `js-crypto-weak-hash` | `open-sse/services/qoderCli.ts` | 385 | `crypto.createHash("md5")` |
| 🔴 error | CWE-327 | `js-crypto-weak-hash` | `src/mitm/cert/install.ts` | 109 | `crypto.createHash("sha1")` |
| 🟡 warning | CWE-614 | `js-cookie-no-secure-or-httponly` | `open-sse/services/browserPool.ts` | 278 | parsed cookie object with `httpOnly: false` |
| 🟢 info | CWE-79 | `js-location-href-assignment` | 4 UI files | various | `window.location.href = ...` |
| 🟢 info | CWE-338 | `js-math-random-for-token` | 62 call sites | various | `Math.random()` for jitter/ids |

### 4.1 CWE-95 — `new Function` in middleware hook registry

- **Context**: Task **0040** (completed P0) already neutralized the **remote** attack surface for `/api/middleware/hooks` by restricting it to `ALWAYS_PROTECTED` + `LOCAL_ONLY` and disabling remote compile paths.
- **Current state**: `compileHookCode` in `src/lib/middleware/registry.ts:58` still uses `new Function`. This is an intentional residual for local-only hook compilation.
- **Risk class**: Controlled residual, not an open RCE. However, it still violates AGENTS.md **Hard Rule #3** (no `eval()` / `new Function()` / implied eval). A future sandbox/DSL rewrite would eliminate the residual.
- **Recommendation**: Keep as tracked debt; do not reopen as a new P0 because the exploitable surface is closed. A P2/P3 task for a safe hook DSL/sandbox is appropriate.

### 4.2 CWE-327 — Weak hashes (MD5 / SHA1)

- **`open-sse/services/qoderCli.ts:385`** uses `crypto.createHash("md5")`.
- **`src/mitm/cert/install.ts:109`** uses `crypto.createHash("sha1")` for certificate fingerprint.
- **Status**: No dedicated remediation task was found in the task catalog. This is a genuine gap.
- **Recommendation**: Create a security-harden task to audit each usage and migrate to SHA-256 unless a protocol strictly requires MD5/SHA1.

### 4.3 CWE-614 — Cookie `httpOnly: false`

- Detector fired on `open-sse/services/browserPool.ts:278`. The object appears to be a **parsed cookie representation** (`parseCookieString`), not necessarily a `Set-Cookie` response. Manual verification is required to determine if this is a true positive.

### 4.4 CWE-79 — `window.location.href` assignments

- Found in hard-coded UI redirects. Most appear safe, but one (`MediaProviderPageClient.tsx:157`) interpolates `providerId` into the path.
- If `providerId` is attacker-controlled, it could become an open-redirect vector. The existing `omniRouteFetch` / `apiFetch` host-pinning (Task **0044**) mitigates fetch-based open redirects, but client-side `location.href` redirects are a separate class.

---

## 5. Dead code / test-coupling debt

`gortex analyze dead_code` surfaced many `__reset*ForTesting` / `__set*OverrideForTesting` helpers in production modules (`open-sse/executors/*`, `open-sse/services/*`). These are not dead per se, but they are **test-only exports embedded in production code**, creating coupling that complicates refactors of high-impact modules.

---

## 6. Implications for active tasks

### 6.1 Task 0111 (EPIC-22 docs closeout)

- Gortex validated that documented symbols (`thinkingMode`, `systemAddon`, `judgeMode`, `FUSION_COGNITIVE_LENS_IDS`, etc.) exist in source.
- `validateComboDAG` is located at `open-sse/services/combo/comboStructure.ts:335` (re-exported from `combo.ts`).
- No architecture risk.

### 6.2 Task 0112 (EPIC-24 combo topology graph builder)

- The intended pure builder should **not** import `open-sse/services/combo.ts` because that pulls in `handleComboChat` (score 504). Prefer importing only the small `combo/comboStructure.ts` helpers (`validateComboDAG`, `clampComboDepth`) if needed.
- `ProviderTopology.tsx` exists at `src/app/(dashboard)/home/ProviderTopology.tsx` and can be used as visual inspiration for node density, but its circular-ring layout is not appropriate for a DAG. 0113 should implement a layered layout instead.
- No critical architectural conflict.

### 6.3 Task 0113 / 0114 (EPIC-24 UI + tests)

- `RoutingHubSubnav.tsx` is small (77 lines) and safe to extend.
- `CommandPalette.tsx` is large (25 KB); adding one entry is safe, but avoid refactoring unrelated code paths.

---

## 7. Recommendations

1. **Create remediation task for CWE-327 (MD5/SHA1)** — genuine gap, no existing task.
2. **Create a tracking/debt task for hook DSL/sandbox** to eventually eliminate `new Function` residual (P2/P3; do not reopen as P0 because Task 0040 closed the exploitable surface).
3. **Verify manually** `browserPool.ts:278` and `MediaProviderPageClient.tsx:157` for true positives before opening tasks.
4. **Do not refactor `handleChatCore` or `handleComboChat`** as part of EPIC-24; keep topology builder isolated.
5. **Improve Gortex TypeScript edge extraction** by reviewing `.gortex.yaml` index config / resolution tier; without call edges, blast-radius analysis has low confidence.

---

*Report generated by builder-orchestrator via Gortex CLI/MCP — 2026-07-24.*
