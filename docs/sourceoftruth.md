# Provider Source of Truth

> **Authority**: This document is the canonical reference for provider identity,
> prefix rules, and current model evidence. It is referenced from `AGENTS.md`
> (Doc Accuracy Discipline §7–8) and takes precedence over agent memory,
> training data, or historical task descriptions.

---

## Purpose

OmniRoute registers 236+ providers, many of which share upstream endpoints or
similar names but are **organizationally separate by design**. This document:

1. Defines the **one-prefix-per-provider** rule and its rationale.
2. Lists **canonical identity** for providers that share infrastructure.
3. Records the **current model evidence** with exact source, timestamp, and scope.
4. Specifies the **refresh procedure** for updating model claims.

---

## Rule 1 — One Prefix per Provider

A provider has exactly **one** OmniRoute prefix (derived from its `id` or `alias`
in the registry). A model request uses that prefix — never a compound of two
provider prefixes.

**Valid forms:**

| Request pattern            | Resolves to provider | Why valid                                  |
| -------------------------- | -------------------- | ------------------------------------------ |
| `opencode/big-pickle`      | `opencode`           | Uses the provider's `id`                   |
| `oc/big-pickle`            | `opencode`           | Uses the provider's `alias`                |
| `opencode-zen/big-pickle`  | `opencode-zen`       | Uses that provider's own `id` (and alias)  |

**Invalid forms:**

| Request pattern                  | Why invalid                                            |
| -------------------------------- | ------------------------------------------------------ |
| `opencode-zen/oc/big-pickle`    | Two prefixes — `opencode-zen` then `oc` (alias of `opencode`) |
| `oc/opencode-zen/big-pickle`    | Two prefixes — reversed but same error                 |

**Rationale**: The routing engine resolves `prefix/model` as a single split.
A double prefix produces an invalid model ID on the upstream call.

---

## Rule 2 — Similar Connection ≠ Same Provider

Providers that share an upstream endpoint, auth mechanism, or even the same
backend infrastructure are still **distinct registered providers** when they
have separate registry entries. Their model catalogs, auth modes, pool keys,
and free-tier rules may differ.

**Canonical example — OpenCode Free vs OpenCode Zen:**

| Field              | OpenCode Free (`opencode`)                                  | OpenCode Zen (`opencode-zen`)                                  |
| ------------------ | ------------------------------------------------------------ | -------------------------------------------------------------- |
| Provider ID        | `opencode`                                                   | `opencode-zen`                                                 |
| OmniRoute prefix   | `oc` (alias) or `opencode`                                   | `opencode-zen`                                                 |
| Connection method  | OpenAI-compatible HTTPS; keyless/public free tier            | OpenAI-compatible HTTPS; API-key provider                     |
| Source path        | `open-sse/config/providers/registry/opencode/index.ts`       | `open-sse/config/providers/registry/opencode/zen/index.ts`     |
| Refresh command    | `opencode models --refresh`                                  | `opencode models --refresh`                                   |
| Current model evidence | 2026-08-16 snapshot below: 7 IDs (`big-pickle`, `deepseek-v4-flash-free`, `hy3-free`, `laguna-s-2.1-free`, `mimo-v2.5-free`, `nemotron-3-ultra-free`, `nemotron-3.5-lightning-free`) | Same 2026-08-16 CLI snapshot controls the Zen free-model set; namespace remains `opencode-zen` |
| Auth type          | `apikey` registry type; public/no-auth free route            | `apikey` registry type                                        |
| Base URL           | `https://opencode.ai/zen/v1`                                 | `https://opencode.ai/zen/v1`                                   |
| Free catalog       | `freeType: "keyless"`, `poolKey: "opencode"`                 | `freeType: "recurring-uncapped"`, `poolKey: "opencode-zen-free"` |
| `passthroughModels`| `true`                                                       | `true`                                                         |
| Model resolution   | `open-sse/services/model.ts` (lines 34–38 — explicit guard)  | Same file, standard registry-derived loop                     |

The `model.ts` guard (lines 34–38) explicitly states:

> `opencode` is its own canonical provider (OpenCode Free, alias `oc`,
> public/no-auth). It must NOT be remapped to `opencode-zen`.

Do not merge these providers or cross-assign their prefixes.

---

## Current Free-Tier Model Snapshot

### Source

| Field     | Value                                                     |
| --------- | --------------------------------------------------------- |
| Command   | `opencode models --refresh`                               |
| Timestamp | `2026-08-16T15:55:53-03:00`                               |
| Scope     | OpenCode Free (`opencode`, prefix `oc`) free-tier models  |

### Models (7)

| Model ID                      | Display name                   |
| ----------------------------- | ------------------------------ |
| `big-pickle`                  | Big Pickle                     |
| `deepseek-v4-flash-free`      | DeepSeek V4 Flash Free         |
| `hy3-free`                    | HY3 Free                       |
| `laguna-s-2.1-free`           | Laguna S 2.1 Free              |
| `mimo-v2.5-free`              | MiMo V2.5 Free                 |
| `nemotron-3-ultra-free`       | Nemotron 3 Ultra Free          |
| `nemotron-3.5-lightning-free` | Nemotron 3.5 Lightning Free    |

### What this snapshot controls

Both OmniRoute providers (`opencode` and `opencode-zen`) draw from the same
upstream CLI refresh source. The `opencode` registry
(`open-sse/config/providers/registry/opencode/index.ts`) and the
`opencode-zen` free-tier entries in
`open-sse/config/freeModelCatalog.data.ts` must stay consistent with this
output.

### Notable absences

- `north-mini-code-free` — **absent** from the 2026-08-16 refresh output.
  Removed from both `open-sse/config/providers/registry/opencode/` and
  `open-sse/config/freeModelCatalog.data.ts`. Must not be reintroduced from agent
  memory or historical task descriptions without a fresh `opencode models --refresh`
  confirming its return.

---

## Refresh Procedure

1. Run `opencode models --refresh` and capture the full output with a
   timestamp.
2. Compare the output against the registry files:
   - `open-sse/config/providers/registry/opencode/index.ts` (models array)
   - `open-sse/config/providers/registry/opencode/zen/index.ts` (free-tier
     entries)
   - `open-sse/config/freeModelCatalog.data.ts` (both `opencode` and
     `opencode-zen` sections)
3. Add new models, remove delisted models, and update display names as needed.
4. Update the **Current Free-Tier Model Snapshot** section above with the new
   timestamp and model list.
5. **Never reintroduce a model ID that is absent from the refresh output.**
   A previously valid model may have been delisted upstream. Agent memory,
   training data, and historical task evidence are not valid sources for
   current model claims (AGENTS.md Doc Accuracy Discipline §6).

---

## Cross-References

| File                                                              | Role                                      |
| ----------------------------------------------------------------- | ----------------------------------------- |
| `open-sse/config/providers/registry/opencode/index.ts`            | OpenCode Free registry entry              |
| `open-sse/config/providers/registry/opencode/zen/index.ts`        | OpenCode Zen registry entry               |
| `open-sse/config/freeModelCatalog.data.ts`                        | Free model catalog (both providers)       |
| `open-sse/services/model.ts`                                      | Model resolution + provider guard         |
| `src/shared/constants/providers.ts`                                | Provider registration (Zod-validated)     |
