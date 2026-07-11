# Builder queue — after Epic 0008 adversarial (0040–0051)

> **Created**: 2026-07-11  
> **Purpose**: Park **returned / incomplete prior-wave** work so it does not compete with adversarial P0/P1 closeout.  
> **Docker**: leave `:21000` / `:22000` policy to operator (canary vs promote separate from this queue).

---

## 0. Already done / not re-queued as “return”

| Block | Tasks | Notes |
|-------|-------|-------|
| Epic **0008** adversarial | **0040–0051** | All in `03-review/` after builder wave — **independent review** next, not this queue |
| Dual-mode **0006/0007** | **0032–0035, 0037–0039** | Review **PASS WITH NOTES** (S 93–96) — path-to-100 polish only; stay `03-review` until promote |
| Fusion path-to-100 holds | **0010–0016, 0018** | S≥90 hold in `03-review` (not rejects) |
| Frontend IA holds | **0023, 0026–0031** | Mostly S≥90 hold / promote-ready; not “returned” |

---

## 1. Hard queue — **returned from review (builder must rework)**

Execute **after** adversarial 0040–0051 are stable (review wave can run in parallel on 0040+; **do not** starve these).

| Order | Task | Lane now | Score / signal | Focus |
|------:|------|----------|----------------|-------|
| **Q1** | **0024** ✅ reworked → `03-review` Frontend IA Registry/Connect cleanup (S5) | `02-doing/` | **84 REJECT** (2026-07-11) | Path-to-100 residuals from re-review; unblocks clean 0025 pillar story |
| **Q2** | **0025** Frontend IA seven-pillar / flat primary sidebar (S6) | `02-doing/` | **81 REJECT** (2026-07-11) | Prior path-to-100 items not closed; coordinate with live `PRIMARY_SIDEBAR_ITEMS` (~10 flat) |
| **Q3** | **0017** Fusion docs / i18n / operator notes | `02-doing/` | **88** re-review return (F3/F6 open) | Docs/i18n only — after 0024/0025 or parallel if no file collision |
| **Q4** | **0036** Deploy/verify dual-mode on **:21000** | `01-open/` | Canary **:22000** already OK | Promote `omniroute:base` to 21000 when operator A/B signs off; heal + bundle proof |

**Suggested seriality**

```
Q1 0024  →  Q2 0025  →  (optional path-to-100 promote IA 0023/26–31)
Q3 0017  // parallel with Q1/Q2 if docs-only (avoid fusion UI files)
Q4 0036  // operator-gated; independent of IA returns
```

---

## 2. Soft queue — path-to-100 polish (stay in `03-review`, optional builder pass)

Only if operator wants S→100 before `04-completed/`:

| Group | Tasks | Typical residual |
|-------|-------|------------------|
| Dual-mode polish | 0032–0035, 0037–0039 | Matrix pin `supportsTokenRefresh`, blank authType assert, CTA/tone polish |
| Tab kit | **0030** | F1–F4 polish @ 91 |
| Fusion polish | 0014, 0016, 0018 | Size split / notes already mostly applied |

Do **not** open competing tasks for these.

---

## 3. Explicit non-goals for this queue

- Re-opening dual-mode false-positive research (healed on :22000; 0036 is deploy only).  
- Re-litigating adversarial findings already mapped to 0040–0051.  
- Docker rebuild without operator request.

---

## 4. Handoff checklist for next builder session

1. Read this file + latest reject reports:
   - `docs/reports/reviews/2026-07-11-task-0024-frontend-ia-registry-connect-cleanup-review.md`
   - `docs/reports/reviews/2026-07-11-task-0025-frontend-ia-seven-pillar-sidebar-review.md`
   - `docs/reports/reviews/2026-07-10-task-0017-omniroute-fusion-docs-i18n-rereview.md` (if present)
2. Work **Q1 → Q2** first (IA returned).  
3. Then **Q3** fusion docs.  
4. **Q4** only when operator says promote 21000.  
5. Keep unrelated dirty frontend-IA tree files out of security commits.


---

## Progress (2026-07-11)

| Item | Status |
|------|--------|
| Q1 0024 | **Done** → `03-review/` (commit path-to-100 shell tests) |
| Q2 0025 | **Done** → `03-review/` (Routing hub subnav + flat tests) |
| Q3 0017 | **Done** → `03-review/` (18 strategies + acting/A6 docs) |
| Q4 0036 | **Pending** — promote dual-mode to :21000 when operator A/B signs off |
