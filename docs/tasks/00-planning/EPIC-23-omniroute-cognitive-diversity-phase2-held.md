# EPIC-23 — Cognitive diversity Phase 2 (HELD)

> **Status**: **HELD** — do **not** promote children until **EPIC-22** has shipped and been used in real fusion combos  
> **Priority**: P3 (parking lot / idea vault)  
> **Type**: feature (deferred)  
> **Project**: omniroute-2  
> **Author**: architect-orchestrator (2026-07-22)  
> **Depends on**: **EPIC-22** Phase 1 (cognitive lenses as config) proven useful  
> **Blocks**: nothing while held  
> **Why held**: Phase 2 ideas are easy to over-build. Operator must first decide which Phase 1 recipes actually get used.  

---

## 1. Intent

EPIC-22 delivers **operator-configured cognitive diversity** on fusion panels/judge without MCP.

Phase 2 is **only** for enhancements that still respect:

> **Cognitive diversity as config, not as tool.**  
> Operator owns keys, budget, and policy. We facilitate; we do not invent a second brain.

Anything that reintroduces “model must call a tool to think” is **rejected** by default.

---

## 2. Candidate ideas (not commitments)

### 2.1 Config power-ups (likely, if P1 loved)

| Idea | Sketch | Depends |
|------|--------|---------|
| **Per-panel systemAddon-only without mode** | Already allowed if P1 ships addon standalone; polish UX | EPIC-22 |
| **Lens packs / user-defined named presets** | Operator saves “my-security-v2” text as reusable id | catalog storage (DB or config JSON) |
| **Judge mode + custom judge directive** | Freeform judge systemAddon | EPIC-22 judgeMode |
| **Apply lenses to non-fusion combo steps** | Optional; careful scope | separate decision |
| **Template gallery in UI** | One-click Write-safe / Design-deep / Cheap-diversity | EPIC-22 recipes |
| **Cognitive fields on combo-ref** | Inherit or override nested — complex | nesting design |

### 2.2 Quality / control (maybe)

| Idea | Sketch | Risk |
|------|--------|------|
| **Soft quality hints to judge** | Append panel self-scores if models emit them | Noisy, gameable |
| **CPI-style loop/tunnel flags** | Heuristics on multi-turn history before fusion | Needs session state; false positives |
| **Cascade invalidate** | Stale panel answers when user edits prior turn | Hard with stateless proxy |
| **Min agreement gate** | If panels disagree hard, force extra panel or block acting | Latency/cost; product policy |

### 2.3 Automation (suspicious — hold hardest)

| Idea | Why careful |
|------|-------------|
| **Auto-pick lens from intent classifier** | Reintroduces “smart default” that may fight operator; only as **suggestion** in UI, never silent |
| **Auto-pick N modes for diversity** | Same |
| **MCP tools exposing lenses** | Explicitly against epic thesis |
| **Branch-thinking graph across turns** | Different product (memory/reasoning store), not fusion config |

### 2.4 Observability

| Idea | Sketch |
|------|--------|
| **Log which lens each panel used** | Structured log field + optional dashboard chip |
| **Fusion metrics: mode histogram** | Cost vs mode correlation for operators |
| **Dogfood feedback** | Only if operator opt-in |

### 2.5 Explicitly rejected (unless product flips thesis)

- Port mcp-think-hardest MCP surface  
- Fuzzy/coherence engines as substitute for LLM panels  
- Surreal-backed thought graphs for fusion  
- Default-on global cognitive mode  
- Client header that injects arbitrary systemAddon without authz (management-only config only)

---

## 3. Entry criteria (when to un-hold)

All of the following:

1. EPIC-22 children done + reviewed  
2. At least one real operator workflow uses ≥2 different lenses on a conditional-fusion combo  
3. Retrospective note (even short) in `docs/reports/` or agent-wiki: what worked / what was unused  
4. Operator prioritizes a **subset** of §2 (not “all of it”)  

---

## 4. If un-held — sketch slices (IDs TBD)

| Slice | Theme |
|-------|-------|
| T23-A | User-defined lens presets (CRUD) |
| T23-B | Template gallery UI |
| T23-C | Observability: lens in logs/metrics |
| T23-D | (optional) UI-only mode suggestions — never silent apply |
| T23-E | (optional) quality/CPI — only with sharp contracts |

Do **not** pre-allocate numeric task IDs until un-hold.

---

## 5. Relationship map

```
mcp-think-hardest (reference)
        │ intent only
        ▼
EPIC-22 Phase 1 ──► lenses + judgeMode + editor  [ACTIVE PLANNING]
        │
        │ learn from production use
        ▼
EPIC-23 Phase 2 ──► presets / templates / obs / optional quality  [HELD]
```

---

## 6. Notes for future architects

- Prefer **config surface area** over **algorithm surface area**.  
- Prefer **tests that capture request bodies** over narrative “quality improved”.  
- Prefer **operator templates** over **auto agents**.  
- Re-read EPIC-22 D1–D10 before adding fields — do not fork a second vocabulary for “thinking”.  

---

**Author**: architect-orchestrator  
**Date**: 2026-07-22  
**Status command**: leave in `00-planning/`; do not move to `01-open/` while held.
