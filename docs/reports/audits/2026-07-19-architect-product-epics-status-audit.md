# Architect Audit — Residual Non-Fusion Product Epics Status

| Field | Value |
|-------|--------|
| **Date** | 2026-07-19 |
| **Agent** | gt-architect (Wave 1 product-epics audit) |
| **Scope** | Epics **0005–0008**, open **0036**, QUEUE, completed children, IA successor wave **0052–0061** |
| **Out of scope** | Fusion product implementation deep-dive (0003/0004 noted only for status lag); task creation |
| **Method** | Read planning headers + child lists; lane inventory (`00`–`04`); skim completed task Status/Origin; UI.md authority; adversarial report inventory `docs/reports/00`–`08`; code existence greps for dual-mode helpers |
| **Output type** | Status / gap audit — **no task promotion** |

---

## 1. Executive summary

| Epic | Planning header status | Child reality (lanes) | Verdict |
|------|------------------------|------------------------|---------|
| **0005** Frontend IA | **S0–S10 closeout complete** (correct enough) | **0020–0031** all `04-completed/` | **Code epic closed**; successor wave **0052–0061** completed **outside** epic child table |
| **0006** Dual-mode auth | **Planning (promote child tasks next)** — **STALE** | **0032–0035** `04-completed/` 100/100; **0036** still `01-open/` | **Code slices closed; live deploy metric open** |
| **0007** Provider auth status UX | **Planning (promote child tasks next)** — **STALE** | **0037–0039** all `04-completed/` 100/100 | **Code epic done** — header not closed |
| **0008** Adversarial remediation | **Planning (children already in 01-open/)** — **STALE** | **0040–0051** all `04-completed/` 100/100 | **P0/P1 child package done** — epic not closed; stretch backlog may remain |

**Single active product open task (non-fusion):**  
`docs/tasks/01-open/0036-omniroute-deploy-verify-21000-dual-mode-auth.md` — operator-gated **:21000** deploy + heal proof for Epic **0006** success metrics.

**QUEUE file is dangerous if re-read as work order:** Q1–Q3 already completed and promoted to `04-completed/`; only Q4/0036 remains. Section 0 still places adversarial + dual-mode children in `03-review/`.

**Lanes now:** `01-open` = 1 (0036); `02-doing` = empty; `03-review` = empty; bulk product work in `04-completed/`.

---

## 2. Lane truth (2026-07-19 snapshot)

| Lane | Non-fusion product-relevant contents |
|------|--------------------------------------|
| `00-planning/` | Epics **0005–0008** + QUEUE + process note **0009** + web/captcha plans **0001–0002** + fusion epics **0003–0004** |
| `01-open/` | **0036** only |
| `02-doing/` | empty |
| `03-review/` | empty |
| `04-completed/` | **0020–0031** (IA), **0032–0035** (0006), **0037–0039** (0007), **0040–0051** (0008), **0052–0061** (IA/theme successor), plus fusion **0010–0018** |

Builder closeout corroboration: `docs/reports/builders/2026-07-18-wave-closeout.md` — 01-open = 0036 HOLD; 02-doing drained; review wave 100/100.

---

## 3. Finding table

| ID | Severity | Area | Finding | Evidence | Recommended next action (no tasks created) |
|----|----------|------|---------|----------|--------------------------------------------|
| **F-P1** | **P0 ops** | 0006 / 0036 | Epic **0006 live success metrics unproven**: apikey `no_refresh_token` = 0 on :21000; bundle includes `connectionUsesOAuthRefresh` | Epic metrics table; task 0036 exit conditions all `[ ]`; QUEUE Q4 pending | Operator A/B promote + run 0036 runbook (or dry-run heal on DB **copy** if live blocked) |
| **F-P2** | High | Governance | Epics **0006, 0007, 0008** still header-status **Planning** while children are completed (except 0036) | Planning headers vs `04-completed/` Status lines | Close/annotate epic headers: 0007 **Done**; 0008 **Done (code)**; 0006 **Code done / ops open (0036)** |
| **F-P3** | High | QUEUE | **`QUEUE-post-adversarial-return.md` stale** — risks double work on 0024/0025/0017 and mis-lanes for 0040–0051 / 0032–0039 | QUEUE §0–§1 vs empty `02-doing`/`03-review` + completed files | Rewrite QUEUE to “0036 only” or mark **SUPERSEDED 2026-07-19** |
| **F-P4** | Med | 0007 | Code UX complete; **live operator trust on :21000** still couples to 0036 heal + deploy lag | 0037–0039 completed; epic still Planning | After 0036, optional smoke: Providers cards no OAuth copy for gemini/qoder apikey |
| **F-P5** | Med | 0005 | Original S0–S10 closed; **successor IA wave 0052–0061** has no epic closeout / child-table fold-in | Origins = “user IA sweep / visual-reference”; UI.md v3.8.42 9 leaves after 0059 | Treat 0052–0061 as **0005-successor cluster**; update 0005 §11 or add successor note |
| **F-P6** | Med | 0008 | All primary children done; **adversarial source reports still describe findings as open**; stretch inventory not reconciled | Reports `01`–`08` still severity tables; 0051 documents residuals in evidence | Post-close **finding disposition matrix** (FIXED / STRETCH / DEFERRED) or mark reports historical |
| **F-P7** | Low–Med | Orphans planning | **0001** Planning, no children, no HOLD reason; **0002** deferred (OK); **0009** process-only (OK) | `00-planning/0001`, `0002`, `0009` headers | 0001: HOLD/link to fusion or promote later; leave 0002 deferred |
| **F-P8** | Low | Epic doc drift | 0005 child table still says **0031** may sit in `03-review`; 0008 still says children in `01-open/` | Epic §8/§11 path strings | Path fix when headers updated |
| **F-P9** | Low (note) | Fusion (boundary) | **0003/0004** still **Active** while **0010–0018** are `04-completed/` | Fusion epic headers | Non-fusion audit only: same “header lag” class as 0006–0008 |
| **F-P10** | Info | Code vs ops | Dual-mode **source** is present: shared helper, heal boot hook, status copy module | `connectionAuthMode.ts`, `healFalsePositiveNoRefresh.ts`, `instrumentation-node.ts`, `connectionStatusCopy.ts` | Confirms 0036 is **deploy/data proof**, not missing feature code |

---

## 4. Per-epic deep status

### 4.1 Epic 0005 — Frontend IA + design system

| Item | State |
|------|--------|
| Header | **S0–S10 closeout complete (2026-07-10)** — not falsely Active |
| Children 0020–0031 | All under `docs/tasks/04-completed/` with `[x]` Completed / 100/100 (or return-review 100) |
| Success metrics (original) | Documented as **met** for leaves ≤12, 7 pillars, compression 0 leaves, Observe hub, analytics dual-nav, Toggle worst offenders, VR selective, deep links, no-new-leaf guide |
| Partial metric | Recoverable LOC ≥5k still **partial/lifetime stretch** (acceptable residual) |
| Authority | `docs/guides/UI.md` — 5 invariants; **flat primary sidebar = 9 leaves** post Task **0059** (ops hub absorbed api-manager / cli-code) |
| Successor work | **0052–0061** completed: theme dark-only, strip appearance, settings hub, visual fine-tune, dashboard/providers/routing/ops/testing hubs, observe/settings gaps — **not listed** in epic child table |

**Verdict:** Original epic is **done**. Residual risk is **governance/doc lag** (successor wave unowned at epic level) and any live **:21000 vs :22000 IA deploy lag** (product may still show pre-hub chrome on 21000 until rebuild — out of 0005 task files; related to ops promote pattern like 0036).

**Do not re-open** S0–S10 tasks from QUEUE (0024/0025 already path-to-100 completed).

---

### 4.2 Epic 0006 — Dual-mode auth / refresh correctness

| Slice | Task | Lane | Status |
|-------|------|------|--------|
| S1 helper | 0032 | `04-completed` | 100/100 |
| S2 matrix | 0033 | `04-completed` | 100/100 |
| S3 heal | 0034 | `04-completed` | 100/100 |
| S4 policy | 0035 | `04-completed` | 100/100 |
| S5 deploy verify | **0036** | **`01-open`** | **Open / operator HOLD** |

**Success metrics matrix**

| Metric | Proven in repo? | Live :21000? |
|--------|-----------------|--------------|
| Gemini/Qoder apikey never `no_refresh_token` from health sweep | **Yes** (unit matrix + helper gates) | **Unproven** (0036) |
| Dual-mode matrix coverage | **Yes** (0033) | N/A |
| Shared helper ≥2 call sites | **Yes** (`connectionAuthMode` + health/API/token-health) | N/A |
| Live 0 apikey `no_refresh_token` after heal | Heal **code** + boot heal import exist | **Unproven** without 0036 SQL before/after |
| Deploy image includes connection guard | Workspace source yes | **Unproven** (historic deploy lag signal) |

**Header:** still “Planning (promote child tasks next)” — **false** (children long promoted).

**Code evidence (existence only, not re-audit):**

- `src/shared/utils/connectionAuthMode.ts` — `connectionUsesOAuthRefresh`, normalize, false-positive gates  
- `src/lib/db/healFalsePositiveNoRefresh.ts` + boot call in `src/instrumentation-node.ts`  
- `src/lib/tokenHealthCheck.ts` imports shared helper  

**Verdict:** Epic is **code-complete / ops-incomplete**. Closing 0006 requires **0036** only (or documented dry-run + operator sign-off per task).

---

### 4.3 Epic 0007 — Provider connection auth-status UX

| Slice | Task | Lane | Status |
|-------|------|------|--------|
| S1+S5 helper + matrix | 0037 | `04-completed` | 100/100 |
| S2 ProviderCard wire | 0038 | `04-completed` | 100/100 |
| S3+S4 Limits + i18n | 0039 | `04-completed` | 100/100 |

**Success metrics (code-level)**

| Metric | Likely state |
|--------|----------------|
| Apikey never OAuth “refresh token / re-authenticate” primary copy | **Met in code** via `formatConnectionStatusMessage` + presentation wrappers |
| Error taxonomy → auth-mode-aware helper | **Met** (`connectionStatusCopy.ts` + 0032 `normalizeAuthType`) |
| ProviderCard / Limits wired | **Met** (0038/0039) |
| i18n | **Met** (0039) |
| No new sidebar leaf | **Met** (UI.md / Providers hub only) |

**Header:** still “Planning (promote child tasks next)” — **false**.

**Coupling:** Operators on a **stale 21000 DB** may still *see* old `lastError` strings until heal + redeploy (0006/0036). UI correctly maps legacy false-positive codes, but full trust requires data clean.

**Verdict:** **Fully done at task level** — mark epic **Closed** (optional live smoke after 0036).

---

### 4.4 Epic 0008 — Adversarial remediation

| Story | Tasks | Lane |
|-------|-------|------|
| S1–S12 | **0040–0051** | All `04-completed/` 100/100 |

**P0 inventory (epic §9)** — ownership vs completion:

| ID | Task | Child lane |
|----|------|------------|
| F-07-001 openapi/try | 0040 | completed |
| F-07-W2-001 hooks RCE | 0040 | completed |
| F-05-001 secrets plaintext | 0041 | completed |
| F-01-001 quota-share envelope | 0042 | completed |

**Header:** “Planning (children already in `01-open/` as 0040–0051)” — **doubly stale** (not planning-promote; not in 01-open).

**Caveats (do not treat as re-open without evidence):**

1. Source reports under `docs/reports/01`–`08` remain **finding narratives**, not auto-updated FIXED ledgers.  
2. Task **0051** intentionally closed **core** residual IDs and may leave **honest grep residuals** / stretch backlog.  
3. Deferred fusion residuals (F-03-012, F-03-W2-006) and dual-mode adjacent F-05-006 were never this epic’s acceptance — still “deferred”, not “failed 0008”.  
4. Static/unit proof was the gate; no claim of live tunnel RCE pentest.

**Verdict:** **Child package complete**. Epic should move to **Closed (remediation wave)** with optional **post-mortem disposition** of report IDs. Do not re-promote 0040–0051 from QUEUE.

---

## 5. QUEUE vs completed reality

File: `docs/tasks/00-planning/QUEUE-post-adversarial-return.md`

| QUEUE claim | Reality 2026-07-19 | Risk |
|-------------|--------------------|------|
| 0040–0051 in `03-review/` | All `04-completed/` | Re-review / re-implement waste |
| 0032–0039 stay `03-review` for polish | All dual-mode + UX children completed | Soft-queue “path-to-100” obsolete |
| Q1 0024 / Q2 0025 returned rejects | Both completed + promoted | **Double work** if builders re-enter |
| Q3 0017 fusion docs | `04-completed/` (fusion boundary) | Stale hard-queue item |
| Q4 0036 pending | **Still true** — only live item | Keep |
| Progress table Q1–Q3 Done, Q4 Pending | Q1–Q3 yes; Q4 yes | Partial truth — §0/§1 still wrong |

**Stale queue risk of double work: HIGH** if any session treats the hard queue as authoritative without re-listing lanes.

---

## 6. Orphans

### 6.1 Completed work without epic closeout

| Cluster | Tasks | Parent epic? | Closeout gap |
|---------|-------|--------------|--------------|
| Dual-mode code | 0032–0035 | 0006 | Epic header not updated; **0036** still open |
| Auth status UX | 0037–0039 | 0007 | Epic header still Planning |
| Adversarial | 0040–0051 | 0008 | Epic header still Planning / wrong lane path |
| IA successor | **0052–0061** | Informal “0005 successor” only | No planning epic / no fold into 0005 §11 |
| Fusion | 0010–0018 | 0003 | Epic still Active (out of scope detail) |

### 6.2 Planning without children / HOLD

| Artifact | Status | Children | HOLD reason? |
|----------|--------|----------|--------------|
| **0001** web providers for fusion | Planning | none | **No explicit HOLD** — orphan planning risk |
| **0002** qwen-web captcha | Planning (deferred) | none | **Yes** — not worth implementing now |
| **0005** | Closeout complete | 0020–0031 done | Maintenance only |
| **0006** | Planning (stale) | 0032–0036 | Partial |
| **0007** | Planning (stale) | 0037–0039 done | Should close |
| **0008** | Planning (stale) | 0040–0051 done | Should close |
| **0009** review-loop learnings | Planning only | process | Intentional process backlog |
| **QUEUE** | Progress partial | n/a | Superseded almost entirely |

---

## 7. Cross-epic file ownership (residual / future collision map)

Surfaces that **were** multi-owner during waves; residual tasks must not re-collide:

| Surface | Historical owners | Residual collision risk |
|---------|-------------------|-------------------------|
| `sidebarVisibility.ts` / Sidebar | 0024, 0025, 0054, 0056, 0059, 0060, 0061 | **High** for any new IA leaf — obey UI.md; serialize |
| Settings hub / Appearance | 0053, 0054, 0061, theme 0052/0055 | Med — dark-only + tabnav already landed |
| `connectionAuthMode` / token health / heal | 0032–0036 | **0036 ops only**; avoid parallel heal rewrites |
| `connectionStatusCopy` / ProviderCard / Limits | 0037–0039 | Low unless new status codes |
| `routeGuard.ts` / SPAWN / LOCAL_ONLY | 0040, 0049, 0051 | Med for new spawn routes |
| Secrets / apiKeys / encryption | 0041, 0049 | Med — key reveal policy |
| `chatCore` / error sanitize / stream | 0042, 0051 | Med — Hard Rule #12 regressions |
| combo / circuit breaker / autoCombo | 0043 (+ fusion runtime) | Med — fusion residual vs resilience |
| MCP server scopes / tools | 0044, 0047 | Med — counts SSoT |
| Executor path/SSRF + search SSRF | 0045, 0048 | Low if no new path helpers |
| CHANGELOG / `.changelog/` | all waves | Always parent-owned publish |

**Only intentional residual product task with file scope today:** 0036 (runbook/evidence; code only if verify finds gaps → reopen 0033/0034, not expand 0036).

---

## 8. Adversarial reports inventory (existence)

All present under `docs/reports/`:

| Report | Exists | First-lines role |
|--------|--------|------------------|
| `00-wave-plan-exclusions.md` | yes | Wave plan + exclusions (0036, 0017, 03-review fusion/dual-mode/IA) — **lane assumptions outdated** |
| `01-open-sse-pipeline.md` | yes | Pipeline P0/P1 findings |
| `02-open-sse-executors-config.md` | yes | Executor SSRF/path |
| `03-open-sse-services.md` | yes | Combo/resilience |
| `04-mcp-edge-runtime.md` | yes | MCP/edge/spawn |
| `05-lib-data-auth.md` | yes | Secrets/auth data |
| `06-lib-features-tooling.md` | yes | Skills/plugins/cloud |
| `07-app-api.md` | yes | App API RCE/authz |
| `08-app-ui-shared.md` | yes | UI error + MCP SSoT |

`00` first 30 lines confirm exclusions honored at hunt time; they do **not** reflect 2026-07-18 promotions. Treat as **historical input**, not lane truth.

---

## 9. Hypotheses for Wave 2 (H-PRODUCT-*)

These are **investigation hypotheses**, not confirmed bugs. Prefer evidence over re-opening whole epics.

| ID | Hypothesis | Why plausible | Suggested probe (Wave 2) |
|----|------------|---------------|---------------------------|
| **H-PRODUCT-001** | **:21000 production still runs pre-dual-mode health chunk** and/or retains apikey `no_refresh_token` rows | Epic 0006 original deploy-lag evidence; 0036 never closed; AGENTS.md prod hold | 0036 SQL + `grep` in container chunks; do **not** mutate 21000 without operator |
| **H-PRODUCT-002** | Boot heal on new code **would clear false-positives**, but **never ran** against 21000 data volume | Heal exists in `instrumentation-node` + 0034; live data dir separate | Dry-run heal on **copy** of `data-21000/storage.sqlite` |
| **H-PRODUCT-003** | **0007 UX correct in tree** but operators still distrust Providers because **stale lastError** strings persist until heal | UX maps codes; DB still shows OAuth sentence | After heal counts, sample gemini apikey card copy on 22000 first |
| **H-PRODUCT-004** | **Adversarial stretch / residual greps** (raw `err.message`, public health richness, href schemes) remain outside 0051 acceptance | 0051 “highest-risk routes + residual count”; reports not dispositioned | Grep residual Hard Rule #12 surfaces; sample public health JSON authz |
| **H-PRODUCT-005** | **RouteGuard matrix incomplete for newer routes** added after 0040 inventory | Fast product surface growth; 0040 tests freeze inventory | Diff `LOCAL_ONLY`/`SPAWN_CAPABLE` vs new `/api/**` spawners |
| **H-PRODUCT-006** | **Secrets migration dual-read** leaves plaintext leftovers on old DBs until rewrite path | 0041 dual-read transition pattern | Inspect secrets table shape on long-lived data dirs (read-only) |
| **H-PRODUCT-007** | **IA deploy lag :21000 vs :22000** — operators still see pre-hub sidebar on prod while docs say 9-leaf | Same pattern as dual-mode deploy lag; UI.md documents 0059 | Compare live PRIMARY sidebar dump on 22000 vs 21000 (read-only) |
| **H-PRODUCT-008** | **Successor IA (0052–0061)** introduced subtle dual-nav / topbar peer-route gaps still | Builder learnings 0009: phantom hub/topbar on peers | Peer-route mount matrix smoke on settings/ops/testing hubs |
| **H-PRODUCT-009** | **Combo soft-failure / HALF_OPEN** regressions re-introduced by later fusion or routing edits | 0043 + fusion runtime shared files | Targeted resilience unit suite + autoCombo vitest |
| **H-PRODUCT-010** | **MCP tool/scope count drift** between server constants and dashboard after tool adds | 0047 SSoT fragile if new tools land without hub update | Compare `TOTAL_MCP_TOOL_COUNT` vs dashboard display |
| **H-PRODUCT-011** | **QUEUE + epic Planning headers** will cause a future agent to **re-promote or rework completed security/IA** | Stale §0/§1 language explicit | Governance fix: supersede QUEUE; close 0007/0008 headers first (docs-only) |
| **H-PRODUCT-012** | **0001 web-providers plan** still needed for fusion panel pool quality, but has no task spine | Planning orphan; fusion Active | Architect decision: absorb into fusion residual wave or HOLD with reason |
| **H-PRODUCT-013** | **F-05-006 OAuth `tokenExpiresAt` lockstep** still open (deferred from 0008) | Explicit deferred adjacent to 0006/0007 | Confirm still deferred after dual-mode code; ticket only if live pain |
| **H-PRODUCT-014** | Error sanitize **fail-open** reappears via new API routes not using shared helper | 0051 helper-first strategy | Sample recent routes for raw `err.message` in Response bodies |

---

## 10. Priority recommendations (architect — no new tasks)

1. **Execute or dry-run 0036** when operator authorizes :21000 (or copy-based evidence). This is the only non-fusion **open** product gate.  
2. **Supersede/rewrite QUEUE** so only 0036 remains actionable.  
3. **Update epic headers** (docs-only):  
   - 0007 → **Closed**  
   - 0008 → **Closed (wave complete)** + optional residual disposition note  
   - 0006 → **Code closed; ops open (0036)**  
   - 0005 → note **0052–0061 successor closed 2026-07-18**  
4. **Do not** re-open 0024/0025/0032–0035/0037–0039/0040–0051 without a **new finding ID** and failing test.  
5. Wave 2 security/authz/IA probes should start from **H-PRODUCT-004…010** with greps/tests — not from re-reading unfixed adversarial prose as open P0s.

---

## 11. Evidence index (paths read)

| Path | Role |
|------|------|
| `docs/tasks/00-planning/0005-…-epic.md` | IA epic status + metrics + children |
| `docs/tasks/00-planning/0006-…-epic.md` | Dual-mode epic + metrics + 0032–0036 |
| `docs/tasks/00-planning/0007-…-epic.md` | Auth status UX + 0037–0039 |
| `docs/tasks/00-planning/0008-…-epic.md` | Adversarial + 0040–0051 + P0 map |
| `docs/tasks/00-planning/QUEUE-post-adversarial-return.md` | Stale builder queue |
| `docs/tasks/01-open/0036-…-dual-mode-auth.md` | Only open product verify task |
| `docs/tasks/04-completed/0020–0031, 0032–0035, 0037–0039, 0040–0051, 0052–0061` | Lane + Status headers / origins |
| `docs/guides/UI.md` (first 80 lines) | IA authority, 9 primary leaves |
| `docs/reports/00`–`08` | Adversarial source inventory |
| `docs/reports/builders/2026-07-18-wave-closeout.md` | Lane drain + 0036 HOLD |
| `docs/reports/builders/2026-07-18-wave1-builder-plan.md` | Collision matrix / hold reason |
| `docs/tasks/00-planning/0009-…-learnings.md` | Process residuals / phantom IA patterns |
| Source greps | `connectionAuthMode`, heal boot, status copy |

---

## 12. One-line bottom line

**Non-fusion product epics are code-closed (0005 original + 0007 + 0008 children; 0006 S1–S4) except live dual-mode deploy verification (0036); planning headers and QUEUE are the main residual governance hazards, not missing child tasks.**
