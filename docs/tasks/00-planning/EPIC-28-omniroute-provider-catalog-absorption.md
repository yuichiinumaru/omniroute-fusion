# EPIC-28: Provider Catalog Comparison and Absorption Pipeline

> **Status**: Planning — evidence-backed decomposition (2026-08-08)
> **Priority**: 🟡 High
> **Origin**: Operator request for routine fork/upstream provider comparison and safe absorption triage.

## Goal

Create a repeatable, machine-readable pipeline that lists the providers and
runtime provider/model registry in the current OmniRoute fork and in the
`references/diegosouzapw-omniroute` snapshot, compares both sources, and emits a
review-ready absorption report. The pipeline must make differences visible
without silently copying upstream code or changing provider behavior.

## Evidence basis

- `src/shared/constants/providers.ts` is the fork's UI/catalog source.
- `open-sse/config/providerRegistry.ts` and `open-sse/config/providers/` are the
  fork's runtime routing/executor/model sources.
- `bin/cli/provider-catalog.mjs` already extracts provider metadata from the
  catalog source.
- `scripts/check/check-provider-consistency.ts` already demonstrates a local
  diff + allowlist + stale-enforcement pattern.
- `src/app/api/providers/[id]/sync-models/route.ts` already computes
  added/removed/updated model deltas.
- `references/diegosouzapw-omniroute` is a static snapshot/symlink, not a live
  upstream mirror; the first pipeline version must accept an explicit source
  root and must not imply freshness beyond the inspected snapshot.

## Stories / executable tasks

| Story | Task | Scope |
|---|---:|---|
| Canonical provider inventory and fork/reference diff | 0152 | List both catalogs/registries and emit deterministic JSON/Markdown diffs. |
| Safe absorption triage report | 0153 | Consume the diff and classify candidates for manual task creation without auto-applying changes. |

## Ordering

1. Task 0152 establishes the stable source adapters, normalized identity fields,
   output schema, and diff semantics.
2. Task 0153 consumes only the versioned 0152 output contract and adds
   provider/model/auth/executor risk classification.
3. Neither task writes production provider registries automatically. A reviewed
   candidate becomes a separate implementation task or explicit operator action.

## Non-goals

- No automatic provider registration, code copying, OAuth credential import, or
  registry mutation.
- No network fetch from GitHub or a live upstream repository in the first slice.
- No replacement of runtime model synchronization (`sync-models`) or pricing
  synchronization; this epic compares source code catalogs and registries.
- No claim that the static reference snapshot equals current upstream state.
