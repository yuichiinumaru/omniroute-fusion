# Planning: Builder Wave 2026-07-18 — Review-Loop Learnings & Skill Upgrades

> **Status**: Planning only — **historical wave stamp (2026-07-19 hygiene)**  
> **Origin**: Builder-orchestrator lane drain (2026-07-18)  
> **Scope**: Process + harness upgrades (not product features)  
>
> ### Post-wave lane stamp (do not use as live pickup inventory)
>
> | Lane | Snapshot 2026-07-18 (this note) | After bulk promote (hygiene 2026-07-19) |
> |------|----------------------------------|----------------------------------------|
> | `03-review/` | **17** tasks @ 100/100 | Emptied into `04-completed/`; **later re-filled** by residual promote (EPIC-10…19) — reconfirm with `ls` |
> | `02-doing/` | empty after promote | Transient claim lane for residual series — reconfirm with `ls` |
> | `01-open/` | **0036 only** | Ops residual **0036** expected; other IDs are not frozen here — reconfirm with `ls` |
>
> This file remains a **process learnings** plan, not an active queue. Active work → live `01-open/` / `02-doing/` / `03-review/` + `EPIC-10+` planning. Naming exception: historical `0009-*` (see QUEUE supersede).

---

## 1. Wave outcome (builder-internal) — frozen 2026-07-18

| Lane | Result (wave day) |
|------|--------|
| `02-doing/` | **empty** (17/17 promoted) |
| `03-review/` | **17** tasks at reviewer **100/100** (later emptied into `04-completed/`) |
| `01-open/` | **0036 only** that day — operator-gated deploy/verify on **:21000 production** (HOLD; AGENTS.md prod ban) |

Promoted that wave: **0012, 0017, 0024, 0025, 0028, 0031, 0041, 0043, 0045, 0048, 0054, 0055, 0056, 0057, 0058, 0060, 0061**.

Reports live under `docs/reports/reviews/2026-07-18-task-*`.

---

## 2. Recurring failure modes (why multi-round review)

### 2.1 Phantom completion / incomplete IA contracts
**Tasks**: 0054, 0055, 0057, 0060, 0061 (reopen addenda)

| Pattern | Symptom | Why engineers missed |
|---------|---------|----------------------|
| Hub topbar only on one route | Topbar exists on primary page, peers lose chrome | Exit conditions checked existence, not **mount matrix across peer routes** |
| Debug-only sidebar still shows labs | DEVTOOLS still rendered items | Spec said “discoverable”; reopen wanted **absent from all sidebar chrome** |
| Checkbox evidence without sabotage | Green tests that don’t encode the IA contract | Tests assert happy paths, not **anti-phantom** negatives |

**Upgrade idea**: `coding-execution-harness` / `frontend-quality-harness` checklist:
- For any “hub/topbar/nav” task: require **peer-route mount matrix** in exit conditions + unit test.
- For any “remove from sidebar” task: require **absence from all SIDEBAR_SECTIONS** test (incl. debug).

### 2.2 Stale docs / inventory drift after later tasks land
**Tasks**: 0017 (AGENTS strategy count), 0031 (UI.md 9-leaf after 0059), 0028 (glow tests vs CSS class SSoT)

| Pattern | Symptom |
|---------|---------|
| Docs lag live constants | AGENTS “17 strategies” while code has 18 |
| Tests lag implementation SSoT | Glow tests still expect inline `shadow-` after class-based glow |
| Dual catalog / dual brand after hub merge | Ops hub re-introduces retired hrefs |

**Upgrade idea**: `archival-knowledge-harness` + `documentation-accuracy` sub-skill:
- Mandatory live dump commands in exit conditions (`ROUTING_STRATEGY_VALUES.length`, `PRIMARY_SIDEBAR_ITEMS.map(id)`).
- Optional CI guard: UI.md §2.1 ids == PRIMARY_SIDEBAR_ITEMS (already suggested in 0031 residual).

### 2.3 Security path helpers dual-SSoT / false negatives
**Tasks**: 0045, 0048

| Pattern | Symptom |
|---------|---------|
| Dual validators | `open-sse` vs `src/shared` path helpers diverge |
| Over-strict segments | HF `org/model` rejected as “path injection” |
| Under-strict redirects | Qwen redirects not re-validated per hop (closed late) |

**Upgrade idea**: `security-harness` path/SSRF sub-skill:
- One production SSoT path helper rule + re-export-only satellites.
- Matrix tests: multi-segment allowlist **and** single-segment-only surfaces (ElevenLabs).

### 2.4 Resilience key identity mismatches
**Tasks**: 0043

| Pattern | Symptom |
|---------|---------|
| Cooldown map key shape | Writers use `provider:connectionId`; skip reads bare `connectionId` |

**Upgrade idea**: `tsjs-harness` / omniroute resilience notes:
- Any map keyed by connection **must** document canonical key builder and reuse it (no string ad-hoc).

### 2.5 Secrets fail-open / rehydrate by id
**Tasks**: 0041

| Pattern | Symptom |
|---------|---------|
| Hash-only store still rehydrates via id in playground/CLI | Silent wrong key or phantom “works” |
| `encrypt()` returns plaintext on failure | Fail-open under configured key |

**Upgrade idea**: `security-harness` secrets checklist:
- Hash-only ⇒ **metadata-by-id only**; resolve-by-id **fail-loud** 400.
- Field encrypt with key set ⇒ **throw**, never passthrough.

### 2.6 Reviewer stops at 90–99 without self-path-to-100
**Tasks**: 0055 first formal pass (97, left in doing)

| Pattern | Symptom |
|---------|---------|
| Reviewer scores ≥90 but leaves residual polish and does not promote | Parent must resume with explicit order |

**Upgrade idea**: harden `gt-subagent-review.md` + reviewer agent prompts:
- Explicit machine rule: **if 90≤S<100, MUST patch before return**; promotion is reviewer-owned.
- Default residual classification: optional browser smoke = EXTERNAL non-blocking unless task exit requires it.

---

## 3. What worked (keep)

1. **Collision-aware waves** (sidebar cluster separate from security/backend).
2. **Max 2 tasks / engineer** with exclusive file ownership.
3. **Expert internal pass** before formal reviewers reduced residual volume.
4. **Specialized reviewers** (security vs frontend vs docs vs ts-code) not generalists.
5. **Numeric score gate only** — no “looks good / many cycles” promotions.

---

## 4. Proposed skill / workflow upgrades (architect later)

| ID | Surface | Proposal |
|----|---------|----------|
| U1 | `coding-execution-harness` | Add **IA contract matrix** template: peer routes × mount × active style SSoT |
| U2 | `frontend-quality-harness` | Pre-review checklist: nested interactive controls, hub subnav SSOT (`HUB_SUBNAV_*`), absence tests for removed nav |
| U3 | `security-harness` | Path-segment SSoT + multi vs single segment matrix; redirect re-validation recipe |
| U4 | `gt-subagent-review.md` | Hard gate: 90–99 cannot return without path-to-100 patch + re-score |
| U5 | `archival-knowledge-harness` | Live-count dump required for any inventory claim (strategies, sidebar leaves, MCP counts) |
| U6 | `project-management` builder orchestration | Default hold list for operator-gated prod ports (:21000) as first-class blocker type |
| U7 | Test policy | Prefer sabotage-lite negatives (assert absence of dual href, white-on-primary, dead pillar arrays) |

---

## 5. External blocker for next session

**Task 0036** (`01-open/`): Deploy/verify dual-mode auth on **:21000**.  
Requires explicit operator A/B promote of canary → prod. Builders must not touch production container/port.

---

## 6. Handoff

Architect-orchestrator can convert U1–U7 into atomic tasks under `01-open/` if desired.  
Builder lane is drained except operator-gated 0036.
