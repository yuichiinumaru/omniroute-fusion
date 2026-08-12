# EPIC-29: Release-to-Codebase Absorption Pipeline

> **Status**: Planning — evidence-backed decomposition (2026-08-08)
> **Priority**: 🟡 High
> **Origin**: Operator request + validation of upstream Releases and CHANGELOG sources.

## Goal

Build a routine, provenance-aware pipeline that starts from upstream releases
and changelog entries, snapshots them canonically, compares the target project's
codebase against the upstream legacy clone, and turns verified differences into
parallel, bounded investigation packets and implementation tasks.

The first target is OmniRoute 2, currently version `3.8.42`, against the
`diegosouzapw/OmniRoute` line. The workflow must remain reusable for other
watchlisted target repositories such as `cybernetics-core-backend`.

## Evidence basis

- The fork package is currently `3.8.42`.
- The reference snapshot package is `3.8.49`.
- GitHub Releases exposes a structured release list and release bodies from
  `v3.8.42` onward.
- The upstream `CHANGELOG.md` contains detailed item-level entries and is more
  useful for code matching than release summaries alone.
- Release `v3.8.49` explicitly reports 1,383 cycle entries and includes items
  directly related to already identified gaps: Grok Build, browser login,
  reasoning defaults, per-model timeout, compression, provider additions, and
  tool-call behavior.
- The local `references/diegosouzapw-omniroute` tree is a static snapshot; a
  future refresh must capture the old revision before any fast-forward update.

## Stories / executable tasks

| Story | Task | Scope |
|---|---:|---|
| Release/changelog ledger | 0154 | Fetch, normalize, deduplicate, and persist upstream release evidence. |
| Legacy clone baseline and diff | 0155 | Capture old revision, optionally fast-forward the reference clone, and report code diff provenance. |
| Generic watchlist absorption workflow | 0156 | Use release/changelog/code evidence to dispatch parallel investigations and create verified tasks. |

## Ordering

1. Task 0154 establishes the canonical release/changelog ledger and version
   range semantics.
2. Task 0155 establishes the code snapshot baseline and safe update/diff
   contract; it depends on 0154's version/provenance model.
3. Task 0156 consumes both evidence streams and owns orchestration, bounded
   investigator partitioning, reconciliation, and task-ready output.

## Non-goals

- No automatic code copying or upstream merge into a target project.
- No force-pull, reset, checkout, destructive cleanup, or dirty-tree overwrite.
- No automatic task-lane movement or automatic completion claims.
- No assumption that changelog prose equals implemented code; every item needs
  codebase evidence and an explicit classification.
