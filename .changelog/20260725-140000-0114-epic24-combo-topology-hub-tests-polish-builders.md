---
date: 20260725-140000
timestamp: 20260725-140000
project: omniroute-2
agent: gt-ts-engineer
task: "0114"
description: "EPIC-24 T24-C: Combo Topology hub discoverability tests, hub matrix verification, UI guide update, and polish"
is_rebuild_safe: true
---

# Task 0114: EPIC-24 T24-C — Hub discoverability tests + polish

## Summary

Completed the final task of EPIC-24 (Combo Topology). Extended existing discoverability tests, created a new dedicated Routing hub matrix test for Combo Topology, verified the anti-phantom chrome constraint (single `RoutingHubSubnav` topbar), and updated `docs/guides/UI.md` to include Topology in the Routing hub topbar peer list.

## Changes

- Updated `tests/unit/ui/routing-hub-discoverability-0025.test.ts` to assert Topology presence in `RoutingHubSubnav` and `CommandPalette`.
- Updated `tests/unit/ui/fusions-routing-hub-matrix-0075.test.ts` to include Topology in top-level hub mount assertions.
- Created `tests/unit/ui/combo-topology-routing-hub-matrix-0114.test.ts` for dedicated EPIC-24 hub matrix & anti-phantom chrome validation.
- Updated `docs/guides/UI.md` to list `Topology` in the Routing hub segment-2 peer list.

## Verification

- `node --import tsx/esm --test tests/unit/ui/combo-topology-routing-hub-matrix-0114.test.ts`
- `node --import tsx/esm --test tests/unit/ui/routing-hub-discoverability-0025.test.ts`
- `node --import tsx/esm --test tests/unit/ui/fusions-routing-hub-matrix-0075.test.ts`
- `node --import tsx/esm --test tests/unit/combo-topology-graph.test.ts`
- `node --import tsx/esm --test tests/unit/ui/combo-topology-ui-route-0113.test.ts`
- `npm run typecheck:core`
- `npx eslint --max-warnings=0` on modified/created files
