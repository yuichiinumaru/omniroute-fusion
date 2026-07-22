# Ideas (parking lot)

> **Status**: zero priority unless operator promotes  
> **Updated**: 2026-07-22  
> Scratch pad for future product/ops ideas. Not epics until pulled into an EPIC-NN file.

---

## 1. Dependency health day (Dependabot-inspired)

**Context:** After merging EPIC-20/21/22 to `main`, open Dependabot PRs were triaged by PR message only (no deep review). Milestone was green; deps are backlog.

### Keep open for a later “deps day” (look when ready)

| PR | Theme | Why keep |
|----|--------|----------|
| **#13** | Production npm group (~23 pkgs) | Next patch, axios/ws/undici/js-yaml, proxy-middleware, monaco, recharts, fumadocs, bedrock SDK… real runtime surface |
| **#12** | Development npm group (~16 pkgs) | jest-dom major 6→7, cyclonedx major, c8/types — test/tooling breakage risk |
| **#1** | Docker `node` 24 → **26** trixie-slim | Major runtime image; needs smoke on 22000 / image build |
| **#11** | Electron 42 → **43** | Major desktop stack; only if Electron packaging still matters |

### Closed as not worth holding open (2026-07-22)

Cheap GHA bumps — Dependabot will recreate anytime:

- #2 CodeQL analyze 4.36→4.37  
- #3 actions/cache 6.0→6.1  
- #4 upload-artifact 4→7 (major action — recreate carefully if wanted)  
- #6 actions/checkout 6→7 (major — recreate carefully if wanted)  
- #7 CodeQL init 4.36→4.37  

### Future deps day checklist (when prioritized)

1. Rebase/recreate Dependabot or one manual branch off `main`  
2. Prod group first (#13) → `npm i` → `typecheck:core` → `test:unit` smoke + critical vitest  
3. Dev group (#12) → unit/vitest  
4. Node 26 image alone with docker build + start on **22000** only  
5. Electron alone if desktop is in use  
6. Never mix Node major + Electron major + full npm groups in one PR  

**Priority:** P3 / operator-scheduled. Not a product epic.

---

## 2. Combo Topology (inspired by Provider Topology on `/home`)

> **Promoted 2026-07-22 → [EPIC-24](./EPIC-24-omniroute-combo-topology.md)**  
> Children: **0112** graph builder · **0113** UI route + dropdown · **0114** hub tests  
> Operator lock: Routing hub topbar peer; dropdown under topbar (`All` + per-combo); expand combo-ref → model → **provider** (account optional later).  

---

## 3. Misc parking (one-liners)

- EPIC-23 cognitive diversity phase 2 (held) — see `EPIC-23-omniroute-cognitive-diversity-phase2-held.md`  
- Rename misleading historical branch names on future work (avoid `epic21-…` carrying epic20/22)  
- Worktree canonical path remains `.worktrees/<slug>/` (Hard Rule #19 / AGENTS.md)  

---

**Author note:** Ideas here do not authorize implementation. Create/promote a real task under `01-open/` when ready.
