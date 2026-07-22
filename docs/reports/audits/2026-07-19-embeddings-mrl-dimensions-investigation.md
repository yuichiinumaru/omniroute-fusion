# Embeddings MRL / Variable Dimensions — Investigation

> **Date**: 2026-07-19  
> **Agent**: architect-orchestrator  
> **Scope**: `open-sse/handlers/embeddings.ts`, `open-sse/config/embeddingRegistry.ts`, unit tests  
> **Operator error**: Gemini + `dimensions: 768` → 400 `Unknown name "outputDimensionality"`

---

## 1. Root cause (CONFIRMED — primarily Gemini, caused by OmniRoute)

### What the client does

OpenAI-compatible request:

```json
{ "model": "gemini/gemini-embedding-2", "input": "...", "dimensions": 768 }
```

### What OmniRoute sends upstream today

```147:159:open-sse/handlers/embeddings.ts
  // Gemini embedding models ...
  // Mirror the request value into the Gemini-native `outputDimensionality` field
  if (provider === "gemini" && upstreamBody.outputDimensionality === undefined) {
    const outputDimensionality = Number(body.dimensions);
    if (Number.isFinite(outputDimensionality) && outputDimensionality > 0) {
      upstreamBody.outputDimensionality = outputDimensionality;
    }
  }
```

Also always copies OpenAI field:

```138:138:open-sse/handlers/embeddings.ts
  if (body.dimensions !== undefined) upstreamBody.dimensions = body.dimensions;
```

Gemini registry target:

```203:211:open-sse/config/embeddingRegistry.ts
  gemini: {
    id: "gemini",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai/embeddings",
    ...
    models: [
      { id: "gemini-embedding-2", name: "Gemini Embedding 2", dimensions: 768 },
```

### Why Google rejects it

| API | Dimension field |
|-----|-----------------|
| **Native** Gemini `embedContent` / generative language | `outputDimensionality` |
| **OpenAI-compat** shim `/v1beta/openai/embeddings` | OpenAI-style body only — **`dimensions`**; **no** `outputDimensionality` field |

OmniRoute posts to the **OpenAI-compat** URL but injects the **native** field → protobuf/JSON schema error:

`Unknown name "outputDimensionality": Cannot find field.`

This matches the unit test contract in `tests/unit/embeddings-gemini-dimensions.test.ts`, which **requires** dual-forwarding — so the tests encode the **wrong** behavior relative to the live OpenAI shim.

**Ported note** (comment: decolua/9router#1366) assumed the shim needed native field; live Google OpenAI embeddings endpoint disproves that for current API.

### Is it “all providers”?

| Provider class | Typical dim field | OmniRoute today | Risk |
|----------------|-------------------|-----------------|------|
| OpenAI / most OpenAI-compat (OpenRouter, Nebius, Together, …) | `dimensions` | Forwarded as-is | **OK** if upstream supports MRL |
| Gemini via **OpenAI shim** | `dimensions` only | **Also injects `outputDimensionality`** | **BROKEN** (operator report) |
| Gemini via **native** API | `outputDimensionality` | Not used (baseUrl is openai path) | N/A today |
| Voyage / Cohere / Jina | provider-specific | Extra keys may pass through `KNOWN_FIELDS` loop | Needs per-provider map |
| Local HF / TEI | often `dimensions` or truncate client-side | Passthrough | Mixed |

**Conclusion for (1):** Problem is **not** “Google alone mysteriously broken” — it is **OmniRoute’s Gemini-specific dual-field injection** against the wrong API surface. Other OpenAI-compat MRL providers that only understand `dimensions` are fine **if** they implement server-side MRL; they are **not** getting the Gemini bug unless they also get a similar wrong native field.

---

## 2. Registry gaps (MRL metadata)

`EmbeddingModel` only has:

```ts
dimensions?: number;  // single default, not a set
```

No:

- `matryoshka_dimensions?: number[]`
- `is_matryoshka?: boolean`
- `dimension_mode?: "openai" | "gemini_native" | "client_truncate" | ...`

Gemini models are registered as `dimensions: 768` while Google docs default **3072** with flexible **128–3072** — registry default is a **preference**, not full MRL capability.

Qwen3-Embedding etc. listed as single max dim (e.g. 4096) without allowed set.

---

## 3. Native OmniRoute MRL fallback (requirement 2)

**Definition (operator):** when the **upstream cannot** shrink dimensions (or fails), and the model is known MRL-capable, OmniRoute may **truncate** (and optionally L2-normalize) the returned vector to the requested length — OpenAI’s documented MRL pattern for embedding-3 and many HF models with `is_matryoshka`.

**Not in scope:** mixing embedding families, vec2vec, cross-encoder re-rank.

### Conditions for client-side truncate to be valid

1. Model (or family) is marked **MRL-safe** (registry / HF flags / documented allowlist).  
2. Requested dim `d` is in `matryoshka_dimensions` **or** `min_dim ≤ d ≤ max_dim` and `d ≤ native_dim`.  
3. Upstream returned full (or longer) vector of length `N ≥ d`.  
4. Truncate to first `d` components; optional **renormalize** (product policy — OpenAI recommends normalize after shorten for some models).  
5. Response `usage` unchanged; document that `data[].embedding.length === d`.

### When **not** to truncate

- Non-MRL models (truncation destroys geometry).  
- Requested dim **greater** than native.  
- Provider already returned correct length.  
- Conflicting multi-model combo without shared dim (existing family guard).

---

## 4. Recommended architecture (fix + features)

### Phase A — Fix Gemini provider-side path (P0 bug)

1. For `provider === "gemini"` **and** OpenAI-compat base URL:  
   - Forward **`dimensions` only**.  
   - **Never** inject `outputDimensionality` into that body.  
2. Invert / rewrite `embeddings-gemini-dimensions.test.ts` to match live API.  
3. Optional Phase A2: dual mode — if `baseUrl` is native embedContent, map `dimensions` → `outputDimensionality` and strip OpenAI-only fields.

### Phase B — Provider dimension dialect registry

Per provider (or model):

| Field | Meaning |
|-------|---------|
| `dimensionParam` | `"dimensions"` \| `"outputDimensionality"` \| `"output_dimension"` \| `null` |
| `matryoshka` | `{ mode: "provider" \| "client_truncate" \| "none", allowed?: number[], min?, max?, default? }` |

Translate client OpenAI `dimensions` → correct upstream field; strip unknown fields for strict APIs.

### Phase C — Native MRL fallback

After successful upstream embed:

- If `requestedDim` set and `vector.length !== requestedDim` and model MRL-capable → truncate (+ normalize policy).  
- Log metric `embed.mrl_client_truncate`.  
- Fail closed with clear 400 if requested dim unsupported.

### Phase D — Catalog / UI (optional)

Surface `matryoshka_dimensions` / recommended dims in model list for operators.

---

## 5. Out of scope (confirmed)

- Multi-model hybrid indices  
- vec2vec / space alignment  
- Client-side re-ranking infra  

---

## 6. Verification commands (after fix)

```bash
# Unit
node --import tsx/esm --test tests/unit/embeddings-gemini-dimensions.test.ts
node --import tsx/esm --test tests/unit/embeddings-handler.test.ts

# Live (operator :22000 only)
curl -s localhost:22000/v1/embeddings \
  -H "Authorization: Bearer $KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"gemini/gemini-embedding-2","input":"ping","dimensions":768}' \
  | jq '.data[0].embedding | length'
# expect 768, not 400
```

---

## 7. Epic recommendation

**EPIC-21 — Embeddings dimension dialect + MRL** (backend; independent of UI epics 19/20).  
P0: Gemini OpenAI-shim fix.  
P1: dialect map + client truncate fallback + registry metadata.
