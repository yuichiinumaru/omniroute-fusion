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

**Inspiration:** Home dashboard Provider Topology — React Flow graph of providers + live activity  
(`ProviderTopology.tsx`, `HomeProviderTopologySection`, shared `flow/*` canvas).

**Product itch:** Provider topology shows *accounts/providers*. Operators care as much (or more) about **combos** — how traffic fans across models, fusion panels, fallbacks, cognitive lenses, acting/judge.

### Sketch (not committed design)

| Mode | UX |
|------|-----|
| **Catalog** | Graph or list of combos as nodes (strategy badge: fusion / conditional-fusion / priority / auto…) |
| **Single-combo focus** | Pick one combo → expand internal topology: steps / panel units / judge / acting / combo-refs as nested nodes; edges = order, weight, or fusion fan-out |
| **Live overlay** (stretch) | Active requests tint edges/nodes like provider topology (`activeRequests`) but keyed by combo name / step |

### Reuse (do not rebuild from zero)

- `src/shared/components/flow/FlowCanvas.tsx`, `edgeStyles.ts`, `StatusDot.tsx` (already extracted from ProviderTopology for Combo/Routing Studio + Compression Studio)  
- Combo data: `src/lib/db/combos.ts` + resolve units (`fusion.ts` / combo steps)  
- Optional home setting parallel to `showProviderTopologyOnHome` → e.g. `showComboTopologyOnHome` or a Routing hub page  

### Why more useful than provider-only

- Combos are the *policy*; providers are the *pool*  
- Fusion + cognitive lenses (EPIC-22) need a visual “what does this combo actually do?”  
- Conditional-fusion triggers are hard to explain as text; a diagram helps  

### Out of scope until epic

- Real-time multi-combo heatmap (nice-to-have after single-combo view)  
- Editing graph = mutating combo (view-first; edit stays in Fusion/Combo editors)  

**Priority:** P2 product idea — promote to EPIC when operator wants. Depends on stable combo schema (post EPIC-22 lenses OK).

### Entry points (candidates)

- Routing hub / Combos / Fusions area (self-evident IA)  
- Or home section next to provider topology (toggle)  
- Deep link: `/routing/combos?topology=<name>` or `/dashboard/fusions` peer tab  

---

## 3. Misc parking (one-liners)

- EPIC-23 cognitive diversity phase 2 (held) — see `EPIC-23-omniroute-cognitive-diversity-phase2-held.md`  
- Rename misleading historical branch names on future work (avoid `epic21-…` carrying epic20/22)  
- Worktree canonical path remains `.worktrees/<slug>/` (Hard Rule #19 / AGENTS.md)  

---

**Author note:** Ideas here do not authorize implementation. Create/promote a real task under `01-open/` when ready.
