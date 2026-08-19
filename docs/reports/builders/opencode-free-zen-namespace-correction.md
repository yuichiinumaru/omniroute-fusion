# Corrective Report: OpenCode Free vs OpenCode Zen namespace separation and Virtual Auto-Combo runtime boundary

## Problem summary
- Production logs showed `Model: oc/north-mini-code-free` and `Requested Model: opencode-zen/oc/north-mini-code-free`.
- Root cause:
  1. `open-sse/services/model.ts` contained `ALIAS_TO_PROVIDER_ID["opencode"] = "opencode-zen"` which overwrote the derived mapping and poisoned alias resolution.
  2. `open-sse/config/freeModelCatalog.data.ts` contained `modelId: "opencode/..."` prefixed entries in Zen rows.
  3. `open-sse/services/autoCombo/virtualFactory.ts` blindly concatenated `${conn.provider}/${modelId}` without parsing or canonicalizing the model identifier. When a connection had provider `opencode-zen` and defaultModel `oc/north-mini-code-free`, this generated the cross-namespace double-prefix string `opencode-zen/oc/north-mini-code-free`.

## Final state & safe behavior

- `open-sse/services/model.ts`:
  - Removed `ALIAS_TO_PROVIDER_ID["opencode"] = "opencode-zen"` overrides.
  - `opencode` is now preserved as its own canonical provider ID (alias `oc`, public/no-auth Free tier).
  - Explicit `opencode-zen/<model>` continues to resolve to provider `opencode-zen`.

- `open-sse/config/freeModelCatalog.data.ts`:
  - Keyless OpenCode Free rows (292-298) remain `provider: "opencode"` with bare model IDs.
  - Recurring Zen rows (303-307) remain `provider: "opencode-zen"` with bare model IDs: `big-pickle`, `deepseek-v4-flash-free`, `mimo-v2.5-free`, `north-mini-code-free`, and `nemotron-3-ultra-free`. No embedded `opencode/` or `oc/` prefix.

- `open-sse/services/autoCombo/virtualFactory.ts`:
  - Implemented `resolveVirtualCandidate(connProvider, rawModelId)` to enforce a canonical provider/model boundary.
  - Uses `parseModel(rawModelId)` and `resolveProviderAlias`.
  - **Mismatched connection policy (fail-closed)**: If a connection's configured `defaultModel` has an explicit provider prefix that differs from the connection's canonical provider (e.g. an `opencode-zen` connection configured with `oc/north-mini-code-free`), the candidate is skipped (`null`) with a warning log. This ensures no cross-namespace or double-prefixed candidate like `opencode-zen/oc/north-mini-code-free` is ever emitted.
  - Matching prefixes (e.g. `opencode-zen/gpt-5-nano` on a Zen connection) are cleanly stripped to bare model IDs with `modelStr: "opencode-zen/gpt-5-nano"`.
  - OpenCode Free connections with `oc/` alias normalize to `opencode` with bare model ID.

- Freebuff context worker and its metadata were not touched.

## Verification

- `node --import tsx/esm --test tests/unit/opencode-namespace-separation.test.ts` — exit 0 (18 passed, 0 failed)
- `node --import tsx/esm --test tests/unit/virtual-auto-combo.test.ts` — exit 0 (12 passed, 0 failed)
- `node --import tsx/esm --test tests/unit/opencode-*.test.ts` — exit 0 (191 passed, 0 failed)
- `npm run typecheck:core` — exit 0
- `npm run check:cycles` — exit 0 (no cycles)
- `npx eslint open-sse/services/autoCombo/virtualFactory.ts tests/unit/virtual-auto-combo.test.ts open-sse/config/freeModelCatalog.data.ts open-sse/services/model.ts tests/unit/opencode-namespace-separation.test.ts` — exit 0
