# Builder queue — after Epic 0008 adversarial (0040–0051)

> ## SUPERSEDED 2026-07-19 (EPIC-10 / Task 0062)
>
> **This QUEUE is no longer an active builder pickup list.**  
> Keep the historical tables below for archaeology only.
>
> | Historical item | Reality (2026-07-19) |
> |-----------------|----------------------|
> | Q1 **0024** / Q2 **0025** / Q3 **0017** | **Closed** — all in `docs/tasks/04-completed/` (not `02-doing/` / REJECT) |
> | Soft-queue dual-mode / fusion / tab kit in `03-review` | **Closed** — bulk promote wave emptied `03-review/` |
> | Epic **0008** adversarial **0040–0051** | **Closed** — all in `04-completed/` |
> | Q4 **0036** dual-mode deploy/verify **:21000** | **Still open** — `docs/tasks/01-open/0036-…` (operator HOLD; do not run from hygiene) |
>
> ### Active product / residual lanes (look here, not this QUEUE)
>
> **Do not trust task-ID lists frozen in this banner.** Reconfirm with `ls` before claiming lane truth:
>
> - **`docs/tasks/01-open/`** — live open executables (ops HOLD **0036** dual-mode `:21000` is expected here; other IDs come and go).  
> - **`docs/tasks/02-doing/`** — currently claimed implementation work.  
> - **`docs/tasks/03-review/`** — review-ready residual series (EPIC-10…19 hygiene / fusion / security / IA / rebalance as present).  
> - **`docs/tasks/04-completed/`** — drained packages (do not re-open Q1–Q3 / 0040–0051 from tables below).  
> - **Planning:** `EPIC-10` … `EPIC-14`, `EPIC-19` under `docs/tasks/00-planning/`.  
>
> **Do not claim the sole residual executable is 0036 forever.** 0036 is the dual-mode **ops** residual only; product residual work lives in the live lane dirs + planning epics, not this QUEUE.  
> **Do not** re-work completed 0024/0025/0017 from REJECT scores below.  
> Historical namespace exception for `000N-*.md` planning files: see **§ Naming exception** at bottom.

---

> **Created**: 2026-07-11  
> **Purpose (historical)**: Park **returned / incomplete prior-wave** work so it does not compete with adversarial P0/P1 closeout.  
> **Docker**: leave `:21000` / `:22000` policy to operator (canary vs promote separate from this queue).

---

## 0. Already done / not re-queued as “return” (historical snapshot 2026-07-11; **lanes stale**)

| Block | Tasks | Notes (2026-07-11) → **truth 2026-07-19** |
|-------|-------|-------------------------------------------|
| Epic **0008** adversarial | **0040–0051** | Then in `03-review/` → now **`04-completed/`** |
| Dual-mode **0006/0007** | **0032–0035, 0037–0039** | Then `03-review` → now **`04-completed/`**; ops **0036** still open |
| Fusion path-to-100 holds | **0010–0016, 0018** | Then `03-review` → now **`04-completed/`** |
| Frontend IA holds | **0023, 0026–0031** | Then promote-ready → now **`04-completed/`** |

---

## 1. Hard queue — **returned from review (historical; Q1–Q3 closed)**

| Order | Task | Lane then | Score / signal | Focus | **Status 2026-07-19** |
|------:|------|-----------|----------------|-------|------------------------|
| **Q1** | **0024** Frontend IA Registry/Connect | was `02-doing/` | **84 REJECT** (2026-07-11) | Path-to-100 | **`04-completed/`** |
| **Q2** | **0025** Frontend IA seven-pillar | was `02-doing/` | **81 REJECT** (2026-07-11) | Path-to-100 | **`04-completed/`** |
| **Q3** | **0017** Fusion docs / i18n | was `02-doing/` | **88** re-review | Docs/i18n | **`04-completed/`** |
| **Q4** | **0036** Deploy/verify dual-mode on **:21000** | `01-open/` | Operator HOLD | Promote dual-mode when A/B signs off | **Still `01-open/` HOLD** |

**Suggested seriality (historical only)**

```
Q1 0024  →  Q2 0025  →  (optional path-to-100 promote IA)
Q3 0017  // parallel if docs-only
Q4 0036  // operator-gated; independent
```

---

## 2. Soft queue — path-to-100 polish (historical; all drained)

Only if operator wanted S→100 before `04-completed/` (wave finished):

| Group | Tasks | Typical residual |
|-------|-------|------------------|
| Dual-mode polish | 0032–0035, 0037–0039 | Matrix pin, CTA polish → **completed** |
| Tab kit | **0030** | polish → **completed** |
| Fusion polish | 0014, 0016, 0018 | notes → **completed** |

Do **not** open competing tasks for these.

---

## 3. Explicit non-goals for this queue

- Re-opening dual-mode false-positive research (healed on :22000; 0036 is deploy only).  
- Re-litigating adversarial findings already mapped to 0040–0051.  
- Docker rebuild without operator request.  
- Treating this file as the active residual list for EPIC-10…19 (use `01-open/` / `02-doing/` / planning epics).

---

## 4. Handoff checklist (historical)

1. Read this file + latest reject reports (paths under `docs/reports/reviews/` for 0024/0025/0017).  
2. Work **Q1 → Q2** first — **done**.  
3. Then **Q3** fusion docs — **done**.  
4. **Q4** only when operator says promote 21000 — **still pending**.  
5. Keep unrelated dirty frontend-IA tree files out of security commits.

---

## Progress (2026-07-11, updated 2026-07-19)

| Item | Status |
|------|--------|
| Q1 0024 | **Done** → `04-completed/` |
| Q2 0025 | **Done** → `04-completed/` |
| Q3 0017 | **Done** → `04-completed/` |
| Q4 0036 | **Pending** — promote dual-mode to :21000 when operator A/B signs off |

---

## Naming exception (historical `000N-*.md` planning namespace)

> Per `.agents/rules/planning-artifact-naming.md`, new `00-planning/` artifacts should use `EPIC-` / `PLAN-` / `HOLD-` / … prefixes.  
> Files `0001`–`0009` and this `QUEUE-*` predate that rule and are **intentionally retained** under the historical numeric namespace to avoid mass link breakage this hygiene slice.

| Historical file | Intended modern form (not renamed this slice) | Role |
|-----------------|-----------------------------------------------|------|
| `0001-omniroute-web-providers-fix-plan.md` | `PLAN-omniroute-web-providers-fix.md` | Web providers plan (partial land) |
| `0002-omniroute-qwen-web-captcha-solver.md` | `HOLD-` or `PLAN-` | Deferred captcha |
| `0003-omniroute-fusion-first-class-epic.md` | `EPIC-03-…` (or absorb into FUSION docs) | Closed fusion first-class |
| `0004-omniroute-fusion-acting-unit-epic.md` | `EPIC-04-…` | Acting closeout → Task 0063 |
| `0005-omniroute-frontend-ia-design-system-epic.md` | `EPIC-05-…` | Closed IA + successor 0052–0061 |
| `0006-omniroute-dual-mode-auth-refresh-correctness-epic.md` | `EPIC-06-…` | Code complete; ops **0036** |
| `0007-omniroute-provider-connection-auth-status-ux-epic.md` | `EPIC-07-…` | Closed |
| `0008-omniroute-adversarial-remediation-epic.md` | `EPIC-08-…` | Closed remediation wave |
| `0009-builder-wave-2026-07-18-review-loop-learnings.md` | `PLAN-omniroute-builder-wave-learnings.md` | Historical wave notes |
| `QUEUE-post-adversarial-return.md` | `PLAN-` or archive pointer | **This file — SUPERSEDED** |
| `EPIC-10` … `EPIC-19` | Already compliant | Active planning epics |

New planning artifacts **must** use the compliant prefixes. Do not invent executable `Task NNNN` identity inside `00-planning/`.
