/**
 * providerModelId — contextual provider/model normalization (Task 0176).
 *
 * Replaces every local "re-prefix if slash" / "strip alias prefix" / "regex-strip"
 * pattern with a single contextual normalizer that takes the SELECTED provider
 * as input and returns a discriminated union — never null. The caller decides
 * what each `kind` means at its own boundary.
 *
 * Policy (AGENTS.md rule 7 + docs/sourceoftruth.md rule 1):
 *   - A model request is `prefix/model` — never `prefixA/prefixB/model`.
 *   - A provider has exactly one OmniRoute prefix (its registry id or alias).
 *   - Passthrough providers may expose model ids that contain `/` as an OPAQUE
 *     part of the model id (e.g. cline's `nvidia/nemotron-...`). Those must
 *     survive verbatim; they are NOT foreign-provider redirects.
 *
 * Reference implementation that this helper generalizes:
 *   open-sse/services/autoCombo/virtualFactory.ts::resolveVirtualCandidate
 *
 * The helper is pure and side-effect-free.
 */

import { parseModel, resolveProviderAlias } from "@omniroute/open-sse/services/model.ts";

export type NormalizedModel =
  | { kind: "same-provider"; bareModel: string; modelStr: string }
  | { kind: "opaque-slash-model-id"; modelId: string; modelStr: string }
  | { kind: "foreign-provider-prefix"; provider: string; model: string; modelStr: string };

export type NormalizeModelForSelectedProviderOptions = {
  /** Opt in to treating slash-bearing model ids as opaque passthrough ids. */
  allowOpaqueSlashModelId: boolean;
};

/**
 * Explicits denylist of model ids that must NOT reach upstream dispatch even
 * though the provider declares `passthroughModels: true`. Entries require
 * source evidence (see corresponding provider task/tests); absence here does
 * NOT gate dispatch — the static registry list is catalog/UI information only.
 */
export const PROVIDER_MODEL_DENYLIST: Readonly<Record<string, ReadonlySet<string>>> = {
  // grok-cli: the legacy `grok-build` shorthand predates the Grok Build CLI
  // catalog and is not a valid upstream model; kept local-rejected with
  // evidence in tests/unit/grok-cli-provider-compatibility.test.ts.
  "grok-cli": new Set(["grok-build"]),
};

/** Check whether a bare model id is on the sourced denylist for a provider. */
export function isModelDenylisted(
  selectedProviderId: string,
  bareModelId: string
): boolean {
  const canonical = resolveProviderAlias(selectedProviderId) || selectedProviderId;
  const set = PROVIDER_MODEL_DENYLIST[canonical];
  return set ? set.has(bareModelId) : false;
}

/**
 * Normalize a raw model id against the SELECTED provider.
 *
 * `selectedProviderId` is the provider the caller is about to dispatch to
 * (already-resolved canonical id or alias — both are accepted). `rawModelId`
 * is the client/input-boundary model string.
 *
 * Returns:
 *   - `same-provider`            — bare id, or id prefixed with this provider's
 *                                  own id or alias (prefix stripped to bareModel).
 *   - `opaque-slash-model-id`    — slash-bearing id that is NOT this provider's
 *                                  prefix (or has no recognized prefix); preserved
 *                                  verbatim. Only returned when the caller opts in
 *                                  (`allowOpaqueSlashModelId: true`); callers like
 *                                  runSingleModelTest rely on passthrough model ids.
 *   - `foreign-provider-prefix`  — id carrying a DIFFERENT provider's prefix;
 *                                  the caller decides (redirect, reject, or
 *                                  treat as opaque).
 *
 * `modelStr` is the canonical display/dispatch form: `${canonicalSelected}/${bareModel}` for
 * same-provider; `${canonicalSelected}/${modelId}` for the other kinds.
 */
export function normalizeModelForSelectedProvider(
  selectedProviderId: string,
  rawModelId: string,
  opts: { allowOpaqueSlashModelId: boolean }
): NormalizedModel {
  const trimmed = (rawModelId ?? "").trim();
  const canonicalSelected = resolveProviderAlias(selectedProviderId) || selectedProviderId;
  if (!trimmed) {
    return {
      kind: "same-provider",
      bareModel: trimmed,
      modelStr: canonicalSelected,
    };
  }
  const parsed = parseModel(trimmed);

  // Bare model id (no "/"): always this provider's model.
  if (!trimmed.includes("/")) {
    return {
      kind: "same-provider",
      bareModel: trimmed,
      modelStr: `${canonicalSelected}/${trimmed}`,
    };
  }

  const parsedProvider = parsed.provider;
  const parsedModel = parsed.model;

  // Slash-bearing id with NO recognized provider prefix → opaque model id.
  // The operator-facing surface (runSingleModelTest) opts in via
  // allowOpaqueSlashModelId so `openai/gpt-oss-120b` under nvidia survives.
  if (!parsedProvider || !parsedModel) {
    if (opts.allowOpaqueSlashModelId) {
      return {
        kind: "opaque-slash-model-id",
        modelId: trimmed,
        modelStr: `${canonicalSelected}/${trimmed}`,
      };
    }
    // Fallback: caller that disallows opaque ids sees a foreign prefix whose
    // provider is unknown; expose the raw segments so it can decide.
    const slash = trimmed.indexOf("/");
    const provider = trimmed.slice(0, slash);
    const model = trimmed.slice(slash + 1);
    return {
      kind: "foreign-provider-prefix",
      provider,
      model,
      modelStr: `${canonicalSelected}/${trimmed}`,
    };
  }

  const canonicalParsed = resolveProviderAlias(parsedProvider) || parsedProvider;
  if (canonicalParsed === canonicalSelected) {
    // Same provider, prefixed with its own id OR alias (e.g. "grok-cli/x" via
    // provider "grok-cli", or "gc/x" via alias "gc"). Strip to the bare model.
    return {
      kind: "same-provider",
      bareModel: parsedModel,
      modelStr: `${canonicalSelected}/${parsedModel}`,
    };
  }

  if (opts.allowOpaqueSlashModelId) {
    // Different provider prefix, but the caller accepts opaque slash model
    // ids (passthrough): preserve verbatim under the selected provider.
    return {
      kind: "opaque-slash-model-id",
      modelId: trimmed,
      modelStr: `${canonicalSelected}/${trimmed}`,
    };
  }

  return {
    kind: "foreign-provider-prefix",
    provider: parsedProvider,
    model: parsedModel,
    modelStr: `${canonicalSelected}/${trimmed}`,
  };
}

/**
 * Return true when a model has repeated the selected provider's own prefix,
 * such as `grok-cli/gc/grok-4.6`. Opaque slash-bearing IDs such as
 * `cline/nvidia/nemotron-...` remain valid because their inner prefix belongs
 * to a different provider namespace.
 */
export function isNestedProviderPrefix(
  selectedProviderId: string,
  rawModelId: string
): boolean {
  const canonicalSelected = resolveProviderAlias(selectedProviderId) || selectedProviderId;
  // Codex intentionally accepts repeated `codex/cx/...` input for backwards
  // compatibility; normalizeProviderScopedModelId owns that legacy collapse.
  if (canonicalSelected === "codex") return false;
  const normalized = normalizeModelForSelectedProvider(canonicalSelected, rawModelId, {
    allowOpaqueSlashModelId: true,
  });
  if (normalized.kind !== "same-provider" || !normalized.bareModel.includes("/")) {
    return false;
  }
  const nested = parseModel(normalized.bareModel);
  const nestedProvider = nested.provider
    ? resolveProviderAlias(nested.provider) || nested.provider
    : null;
  return nestedProvider === canonicalSelected;
}