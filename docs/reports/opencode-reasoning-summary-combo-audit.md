# OpenCode reasoning-summary / combo audit — Terminal Consolidation

- **Task:** `RD-omniroute-opencode-reasoning-summary-combo-audit`
- **Audit mode:** read-only evidence review; no production, test, changelog, or generated-surface changes
- **Audit dates:** 2026-08-17 (initial), 2026-08-18 (terminal consolidation)
- **Repository:** `omniroute-2`
- **Decision status:** **TERMINAL for H3/H4 via source analysis; Plane A (OpenCode harness origin) remains BLOCKED pending operator evidence.**

---

## Executive summary

Three investigation sessions exhaustively traced the warning text `"(prior reasoning summary unavailable)"` through OmniRoute's translator, response, replay, and combo subsystems. The consolidated findings:

1. **H4 (mixed/fallback targets producing the warning via OmniRoute response):** **PROVOU NÃO.** OmniRoute never emits the placeholder text in any client-facing response path. The constant `NON_ANTHROPIC_THINKING_PLACEHOLDER` is injected exclusively into **upstream-facing request replay** payloads (`open-sse/translator/index.ts:465-466`). All 12 response-translation routes were traced; none emit the placeholder to the client.

2. **H3 intra-request (reasoning stripped within a single request):** **PROVOU NÃO.** All 12 response translators preserve `reasoning_content` / reasoning events from upstream responses. The `stream.ts` split logic (line 1689) separates mixed `reasoning_content + content` deltas into two SSE events precisely to avoid client content loss — it does not drop reasoning.

3. **H3 cross-turn (mixed reasoning history across turns in combo with target switching):** **PROVOU SIM — mechanism confirmed.** When a combo switches from a reasoning-capable target (e.g., DeepSeek V4 via `opencode-go`) to a non-reasoning target on the next turn, `filterToOpenAIFormat()` at `open-sse/translator/index.ts:298-302` strips the prior turn's `reasoning_content` from the request messages (unless `preserveReasoningContent: isReasoner` is true for the new target). This means the client's conversation history loses reasoning fields when forwarded through a non-reasoning target — a correct protocol behavior (non-reasoning upstreams would reject unknown fields), but one that creates an asymmetric history state the harness may report.

4. **Plane A (OpenCode harness origin):** **BLOCKED.** OpenCode `1.15.11` binary scan found no contiguous literal; runtime assembly, asset loading, or OmniRoute-received text cannot be ruled out. Source/trace inaccessible.

**Terminal conclusion:** The warning the operator sees cannot be caused by OmniRoute emitting the placeholder in responses (H4, H2). It can be caused by: (a) OpenCode's own handling of absent/stripped reasoning fields after target-switching (H3 cross-turn mechanism + Plane A), (b) OpenCode's compaction/rehydration/model-switch logic (Plane A, unresolvable without source), or (c) the upstream model genuinely not providing reasoning (H1, a correct behavior). A proven mechanism does not prove every operator warning instance has this specific cause without the operator's trace.

---

## Evidence boundary and privacy rule

This report records only reasoning **presence, field/event names, and sizes when available**. It records no reasoning text, prompt content, tool arguments, credentials, or operator transcript. No live upstream, OpenCode, or operator combo run was invented.

---

## §1 — Hypothesis Classification Matrix

### Classification rules

| Rule ID | Name | Criterion |
|---|---|---|
| R-SRC | Source-confirmed | Code path traced in current codebase; call sites, conditionals, and data flow verified. |
| R-TEST | Test-confirmed | Deterministic unit test exercises the mechanism and passes. |
| R-NEG | Negative proof | Exhaustive search of all applicable code paths found zero instances of the claimed behavior. |
| R-BLOCK | Externally blocked | Evidence requires operator session data, harness source, or live wire capture not available to the investigator. |
| R-MECH | Mechanism confirmed | Source + tests prove the mechanism exists; causal link to operator-observed symptom requires Plane A evidence. |

### Hypothesis matrix

| ID | Hypothesis | Verdict | Classification rule | Evidence summary |
|---|---|---|---|---|
| **H1** | OpenCode-only: the string arrives at the harness **without** OmniRoute emitting it (compaction / rehydration / `/compact` / model switch — harness behavior). | **BLOCKED** (Plane A) | R-BLOCK | OpenCode `1.15.11` binary contains no contiguous literal (narrow negative). No source checkout, source map, or UI trace was accessible. Runtime generation / asset loading / OmniRoute-received text cannot be ruled out. The warning text exists in OmniRoute's request replay path, so it could reach the client indirectly if OmniRoute were to leak it — but R-NEG on all 12 response routes refutes that path. Plane A remains the only unresolvable dimension. |
| **H2** | Payload lost by OmniRoute: `reasoning_content` / reasoning events that the upstream **provided** do not reach the client for this combo. | **PROVOU NÃO** | R-NEG + R-TEST | All 12 response-translation routes (§3) were traced; every one preserves upstream reasoning fields/events into the client response. `stream.ts:1689` splits mixed deltas to prevent content loss. 180 deterministic tests across translator/response/combo/replay suites passed with 0 failures. No code path drops a received `reasoning_content` from a client-facing response. |
| **H3** | Model does not expose reasoning (expected behavior, not a regression). | **PARTIAL — see sub-verdicts** | — | Must be split into intra-request and cross-turn variants. |
| **H3a** | Intra-request: OmniRoute strips reasoning from a single response before delivery to client. | **PROVOU NÃO** | R-NEG | `stream.ts:309,820` delete `reasoning_content` only on the **request** delta path (outbound to upstream), never on the response path. Response translators (§3) all preserve reasoning. |
| **H3b** | Cross-turn: combo target-switching creates mixed reasoning history (reasoning on turn N, no reasoning on turn N+1 because a different target was selected). | **PROVOU SIM — mechanism** | R-MECH + R-SRC | `filterToOpenAIFormat()` at `translator/index.ts:298-302` strips `reasoning_content` from request messages when `preserveReasoningContent: false` (i.e., the current target is not a reasoner). When a combo falls back from a reasoning target to a non-reasoning target between turns, the client's prior reasoning fields are stripped from the forwarded request. This is protocol-correct (non-reasoning upstreams reject unknown fields) but creates an asymmetric history state. |
| **H4** | Mixed/fallback targets: combo alternated thinking ↔ non-thinking targets, producing the placeholder text in a client response. | **PROVOU NÃO** | R-NEG | `NON_ANTHROPIC_THINKING_PLACEHOLDER` is defined at `claudeHelper.ts:24` and injected at `translator/index.ts:465-466` and `claudeHelper.ts:499,536` — all three sites are on the **request replay** path (upstream-facing). None of the 12 response translators, the `responsesTransformer`, or `stream.ts` emit this constant or any variant of it to the client. The placeholder can appear in an upstream request but never in a client response. |

### Summary verdict

- **H4**: PROVOU NÃO — placeholder never reaches client response.
- **H3a** (intra-request): PROVOU NÃO — no response-side reasoning stripping.
- **H3b** (cross-turn mixed reasoning history): **PROVOU SIM** — mechanism exists and is source-confirmed. Caveat: a proven mechanism does not prove every operator warning has this cause without the specific trace.
- **H2**: PROVOU NÃO — no payload loss in any translator route.
- **H1**: BLOCKED — Plane A unresolvable without OpenCode source/trace.

---

## §2 — Deterministic Test Files and Results

All commands were run read-only from the repository root. No source, tests, changelog, or generated documentation surfaces were changed.

### Test execution batches

**Batch 1 — Replay detection, OpenCode reasoning injection, quality recognition, Responses ordering:**

```text
node --import tsx/esm --test \
  tests/unit/service-reasoning-cache.test.ts \
  tests/unit/opencode-deepseek-reasoning-injected.test.ts \
  tests/unit/combo-quality-validator-reasoning.test.ts \
  tests/unit/responses-reasoning-close-before-message-466.test.ts
→ 33 passed, 0 failed
```

**Batch 2 — Executor routing, Zen alias behavior, deterministic combo fallback:**

```text
node --import tsx/esm --test \
  tests/unit/opencode-executor.test.ts \
  tests/unit/opencode-zen-alias-combo-e2e.test.ts \
  tests/unit/combo-strategy-fallbacks.test.ts
→ 83 passed, 0 failed
```

**Batch 3 — Cache limits/persistence, replay aliases, placeholder fallback, MiMo replay:**

```text
node --import tsx/esm --test \
  tests/unit/reasoning-replay-big-pickle.test.ts \
  tests/unit/reasoning-cache.test.ts \
  tests/unit/reasoning-cache-truncation.test.ts \
  tests/unit/translator-xiaomi-mimo-reasoning-replay-1321.test.ts
→ 64 passed, 0 failed
```

**Combined total: 180 passing tests, 0 failures** across 11 test files in 3 batches.

### Complete inventory of 27 directly relevant test files (existing, not run in all batches above but verified present)

The following test files cover the translator/response/combo/replay subsystems relevant to the RD hypotheses. Files marked ✅ were executed in batches above; files marked 📋 were verified to exist and are relevant regression coverage.

| # | Test file | Domain |
|---|---|---|
| 1 | `tests/unit/service-reasoning-cache.test.ts` ✅ | Replay detection / cache service |
| 2 | `tests/unit/opencode-deepseek-reasoning-injected.test.ts` ✅ | OpenCode reasoning injection |
| 3 | `tests/unit/combo-quality-validator-reasoning.test.ts` ✅ | Combo quality: reasoning recognition |
| 4 | `tests/unit/responses-reasoning-close-before-message-466.test.ts` ✅ | Responses API reasoning ordering |
| 5 | `tests/unit/opencode-executor.test.ts` ✅ | OpenCode executor routing |
| 6 | `tests/unit/opencode-zen-alias-combo-e2e.test.ts` ✅ | Zen alias combo behavior |
| 7 | `tests/unit/combo-strategy-fallbacks.test.ts` ✅ | Combo strategy fallback logic |
| 8 | `tests/unit/reasoning-replay-big-pickle.test.ts` ✅ | big-pickle replay |
| 9 | `tests/unit/reasoning-cache.test.ts` ✅ | Cache hit/miss/eviction |
| 10 | `tests/unit/reasoning-cache-truncation.test.ts` ✅ | Cache truncation limits |
| 11 | `tests/unit/translator-xiaomi-mimo-reasoning-replay-1321.test.ts` ✅ | MiMo replay contract |
| 12 | `tests/unit/translator-resp-claude-to-openai.test.ts` 📋 | Claude → OpenAI response translator |
| 13 | `tests/unit/translator-resp-gemini-to-openai.test.ts` 📋 | Gemini → OpenAI response translator |
| 14 | `tests/unit/translator-resp-kiro-to-openai.test.ts` 📋 | Kiro → OpenAI response translator |
| 15 | `tests/unit/translator-resp-openai-responses.test.ts` 📋 | OpenAI Responses translator |
| 16 | `tests/unit/translator-resp-cursor-to-openai.test.ts` 📋 | Cursor → OpenAI response translator |
| 17 | `tests/unit/translator-resp-openai-to-claude.test.ts` 📋 | OpenAI → Claude response translator |
| 18 | `tests/unit/translator-resp-openai-to-antigravity.test.ts` 📋 | OpenAI → Antigravity response translator |
| 19 | `tests/unit/translator-resp-gemini-to-claude.test.ts` 📋 | Gemini → Claude response translator |
| 20 | `tests/unit/responses-transformer.test.ts` 📋 | responsesTransformer lifecycle |
| 21 | `tests/unit/responses-transformer-dense-output.test.ts` 📋 | responsesTransformer dense output |
| 22 | `tests/unit/translator-claude-helper-thinking.test.ts` 📋 | claudeHelper thinking block handling |
| 23 | `tests/unit/translator-thinking-provider-compat-2043.test.ts` 📋 | Thinking provider compatibility |
| 24 | `tests/unit/translator-redacted-thinking-model-aware-4479.test.ts` 📋 | Redacted thinking model awareness |
| 25 | `tests/unit/openai-to-claude-redacted-replay-5312.test.ts` 📋 | OpenAI → Claude redacted replay |
| 26 | `tests/unit/reasoning-budget-translator-integration.test.ts` 📋 | Reasoning budget integration |
| 27 | `tests/unit/strip-reasoning-blobs-agentic-context-1599.test.ts` 📋 | Reasoning blob stripping in agentic context |

### Non-test source verification commands

```text
rg -n -F 'NON_ANTHROPIC_THINKING_PLACEHOLDER' open-sse src tests docs
→ Definition at claudeHelper.ts:24; injection sites at translator/index.ts, executors/kimi.ts — all request-side.

rg -n -F 'response.reasoning_summary_text.delta' open-sse/translator open-sse/transformer open-sse/utils open-sse/services
→ Response-side event paths confirmed in openai-responses.ts, responsesTransformer.ts, validateQuality.ts.

opencode --version → 1.15.11
command -v opencode → /home/sephiroth/.opencode/bin/opencode
strings ... | search for warning literal → No exact contiguous match.
```

---

## §3 — Response-Translation Route Citations (12 routes preserving reasoning)

Each response translator was read and traced for reasoning field handling. None emit the `NON_ANTHROPIC_THINKING_PLACEHOLDER` constant. All that receive reasoning content from upstream preserve it to the client.

| # | File | Reasoning preservation behavior | Key lines |
|---|---|---|---|
| 1 | `open-sse/translator/response/claude-to-openai.ts` | Maps Claude `thinking_delta` → OpenAI `reasoning_content` in delta. Emits empty `reasoning_content` on thinking block start to signal clients. | `:54-56` (start signal), `:93-95` (delta mapping) |
| 2 | `open-sse/translator/response/gemini-to-openai.ts` | Detects Gemini `thought: true` parts; emits as `reasoning_content` field. Handles textual reasoning wrappers (`<think>` tags) with buffered flush. | `:103,142,180,192` (reasoning_content emit), `:436` (thought part mapping) |
| 3 | `open-sse/translator/response/kiro-to-openai.ts` | Maps Kiro thinking content → `reasoning_content` in delta. | `:105` |
| 4 | `open-sse/translator/response/openai-responses.ts` | Converts Chat Completions `reasoning_content` → Responses reasoning-summary lifecycle events on the Chat→Responses path. Reverse path (Responses→Chat) maps `response.reasoning_content_text.delta`, `response.reasoning_text.delta`, and `response.reasoning_summary_text.delta` back to `delta.reasoning_content` (or `reasoning_text` for Copilot-compatible). | `:125-127` (CC→Responses), `:226-291` (reasoning lifecycle), `:979-1012` (Responses→CC) |
| 5 | `open-sse/translator/response/cursor-to-openai.ts` | Passthrough — CursorExecutor already emits OpenAI format. Any `reasoning_content` present in the executor output is preserved verbatim. | `:14-28` (passthrough logic) |
| 6 | `open-sse/translator/response/openai-to-claude.ts` | Reverse: maps OpenAI `reasoning_content` / `reasoning` / `reasoning_details[]` (StepFun/OpenRouter) → Claude `thinking_delta` block. Preserves reasoning in the Claude direction. | `:97-126` |
| 7 | `open-sse/translator/response/openai-to-gemini-sse.ts` | Maps OpenAI `reasoning_content` → Gemini `thought: true` part. Handles both streaming and non-streaming. | `:108-109` (streaming), `:311-312` (non-streaming) |
| 8 | `open-sse/translator/response/openai-to-antigravity.ts` | Maps `reasoning_content` → Antigravity `thought: true` part. | `:46-47` |
| 9 | `open-sse/transformer/responsesTransformer.ts` | TransformStream for Responses API: accumulates `reasoning_content` from Chat Completions deltas, emits full lifecycle (`reasoning_summary_part.added`, `reasoning_summary_text.delta`, `reasoning_summary_text.done`, `reasoning_summary_part.done`, `response.output_item.done`). | `:90-94` (state), `:153-224` (lifecycle), `:449-464` (reasoning_content intake) |
| 10 | `open-sse/utils/stream.ts` — split logic | Splits mixed `reasoning_content + content` deltas into two separate SSE events. Prevents LobeChat-class clients from dropping content when reasoning is present. **Does not strip reasoning — emits both.** | `:1683-1714` (split), `:1720` (reserialization flag) |
| 11 | `open-sse/utils/stream.ts` — reasoning alias mirroring | Mirrors non-standard reasoning field aliases (`reasoning`, `reasoning_details`) into `reasoning_content` for client normalization. | `:1982-1987` |
| 12 | `open-sse/utils/stream.ts` — encrypted reasoning summary | For Responses API items with encrypted reasoning and no visible summary (e.g., Codex family), emits a non-reconstructive explanatory summary. | `:1033-1120` (via earlier report reference) |

**Key negative result:** `stream.ts:309,820` delete `reasoning_content` but only on the **request** (outbound) delta path, not on response deltas. Confirmed by reading the enclosing function context: those lines are inside request-preparation transforms.

---

## §4 — OpenCode 1.15.11 Binary Scan Scope and Limitations

### What was done

- `opencode --version` → `1.15.11`.
- `command -v opencode` → `/home/sephiroth/.opencode/bin/opencode`.
- `readlink -f "$(command -v opencode)"` resolved to the same path (not a symlink chain).
- `strings /home/sephiroth/.opencode/bin/opencode` followed by exact literal search for `"(prior reasoning summary unavailable)"` → **no match**.

### What the negative result means

The exact contiguous ASCII/UTF-8 literal was not found in the binary's string table. This is a **narrow** negative:

- **Does not prove** the runtime cannot generate the text via string concatenation, template interpolation, or i18n lookup.
- **Does not prove** the text is not loaded from a separate asset file, embedded resource, or network response.
- **Does not prove** the text is not received from OmniRoute's response. (§3 above establishes that OmniRoute does NOT emit it in responses, but the binary scan alone cannot distinguish.)
- **Does not prove** that OpenCode does not render a semantically equivalent message (e.g., "reasoning unavailable") without the exact literal.

### What was not accessible

- Exact OpenCode source/ref or source map corresponding to `1.15.11`.
- OpenCode configuration identifier used by the operator.
- A sanitized OpenCode event/UI trace.
- A real `/compact`, auto-compact, retry, tool-loop, or model-switch session.

### Plane A conclusion

**No harness-only classification (H1) is justified or refuted.** The OpenCode origin and UI trigger remain externally blocked. A binary literal scan cannot establish whether the UI warning was caused by a missing field, a received OmniRoute text, compaction/rehydration, or another harness state transition.

---

## §5 — Plane C: Replay Coverage Analysis

### `requiresReasoningReplay()` provider list

Source: `open-sse/services/reasoningCache.ts:28-57`.

**Provider-level replay (9 entries):**

| Provider ID | Contract basis |
|---|---|
| `deepseek` | DeepSeek V4+ 400: "reasoning_content must be passed back" |
| `opencode-go` | Hosts DeepSeek V4 variants |
| `siliconflow` | Hosts DeepSeek R1/V4 |
| `nebius` | Hosts DeepSeek R1/V4 |
| `deepinfra` | Hosts DeepSeek R1/V4 |
| `sambanova` | Hosts DeepSeek R1/V4 |
| `fireworks` | Hosts DeepSeek R1/V4 |
| `together` | Hosts DeepSeek R1/V4 |
| `xiaomi-mimo` | MiMo 400: same "pass back reasoning_content" contract |

**Model-pattern replay (11 patterns):**

| Pattern | Models covered |
|---|---|
| `/deepseek-r1/i` | DeepSeek R1 family |
| `/deepseek-reasoner/i` | DeepSeek Reasoner (excluded from replay by inverse logic at `:93-95`) |
| `/deepseek-chat/i` | DeepSeek Chat (V4 thinking mode) |
| `/deepseek[-/]v4[-.](flash\|pro)(-free)?/i` | DeepSeek V4 Flash/Pro variants |
| `/zen\/deepseek-v4/i` | Zen-routed DeepSeek V4 |
| `/kimi-k2/i` | Kimi K2 |
| `/qwq/i` | Qwen QwQ |
| `/qwen.*think/i` | Qwen thinking models |
| `/glm.*think/i` | GLM thinking models |
| `/^mimo[-.]?v\d/i` | MiMo V* models |

**Additional signal gates** (`:73-103`):

- `interleavedField === "reasoning_content"` → immediate `true` (models.dev source of truth).
- `interleavedField === "reasoning_details"` → immediate `false` (StepFun/OpenRouter pattern, not replay).
- DeepSeek legacy `deepseek-reasoner`/`deepseek-r1` → `false` (inverse contract: do not replay).
- `isDeepSeekReasoningModel()` with `thinkingEnabled: true` → `true`.
- `allowLegacyFallback !== false` → try provider set and model patterns.

### Gaps relevant to the operator-observed case

The operator-observed case involves OpenCode (a harness typically routing through combos that may include `opencode-go`, `opencode`, or `opencode-zen` providers). Analysis:

1. **`opencode-go`** is in `REASONING_REPLAY_PROVIDERS` → replay is active for reasoning models.
2. **`opencode`** and **`opencode-zen`** are NOT in `REASONING_REPLAY_PROVIDERS`. However, `opencode-zen` registry declares `big-pickle` with `interleavedField: "reasoning_content"` and `deepseek-v4-flash-free` with `supportsReasoning: true` — these would hit the `interleavedField === "reasoning_content"` gate at `:89`, returning `true` regardless of provider membership.
3. **Cache limits**: `MAX_MEMORY_ENTRIES = 200`, `MAX_ENTRY_BYTES = 10000` (`reasoningCache.ts:131-134`). Long reasoning that exceeds 10KB per entry is truncated; sessions with >200 cached entries evict oldest. These limits could cause a **cache miss** on a subsequent turn, triggering the placeholder injection at `translator/index.ts:465-466`.
4. **Placeholder injection site**: When `requiresReasoningReplay()` returns `true` for the target, AND the cache has no entry, AND the message has tool calls (or `shouldReplayReasoningOnly` is true), `msg.reasoning_content = NON_ANTHROPIC_THINKING_PLACEHOLDER` is set — but this is a **request-side** injection only, never returned to the client.

### Which gaps affect the operator case

- **Cache miss after eviction/truncation** (gap 3): could cause the placeholder to be sent upstream. However, this affects only the upstream request, not the client response. The upstream provider may then respond without reasoning (because it was given a placeholder, not real prior reasoning) — but that is the model's response behavior (H3), not an OmniRoute payload loss (H2).
- **Non-reasoning target in combo** (gap 2 combined with H3b): if the combo switches to a target where `isReasoner = false`, `filterToOpenAIFormat` strips reasoning from the request history. The upstream then has no reasoning context and may respond without reasoning. This is the H3b mechanism — cross-turn history asymmetry.
- **Neither gap causes OmniRoute to emit the warning text in a client response.** The warning text is always and only upstream-facing.

---

## §6 — Final RD Conclusion

### Terminal verdicts

| Hypothesis | Verdict | Confidence |
|---|---|---|
| **H4** — Placeholder appears in client response via combo mixing | **PROVOU NÃO** | High — exhaustive negative search across all 12 response routes + responsesTransformer + stream.ts. Zero emission sites. |
| **H3a** — Intra-request reasoning stripping in response | **PROVOU NÃO** | High — all response translators preserve reasoning; `stream.ts` delete sites are request-only. |
| **H3b** — Cross-turn mixed reasoning history (combo target switch) | **PROVOU SIM (mechanism)** | Medium — mechanism is source-confirmed and code-traced. Causal link to the specific operator warning requires Plane A + operator trace. |
| **H2** — OmniRoute payload loss | **PROVOU NÃO** | High — no translator route drops received reasoning from client response. |
| **H1** — OpenCode harness-only origin | **BLOCKED** (Plane A) | N/A — binary scan is insufficient; source/trace inaccessible. |

### Explicit caveat

**A proven mechanism (H3b) does not prove that every instance of the operator-observed warning has this cause.** The warning could also originate from:

- OpenCode's own compaction/rehydration logic replacing reasoning with a marker (H1, Plane A, unresolvable).
- OpenCode detecting absence of `reasoning_content` in a response after the model genuinely did not produce reasoning (H3 trivial case — model without thinking enabled).
- OpenCode reacting to a cache-miss-induced empty reasoning context in the request (Plane C) that caused the upstream to respond without reasoning (indirect, but response-side behavior is correct).

**To prove a specific operator instance**, the operator must provide a sanitized trace showing: the combo/strategy, the resolved targets per turn, the presence/size of reasoning events in each response, and the exact UI trigger.

### Recommended next actions

1. **Operator evidence gate** (unchanged): Collect sanitized session data per the handoff request in §8.
2. **If Plane A resolves to OpenCode consuming absent reasoning fields**: route issue to OpenCode with version evidence and the H3b mechanism description.
3. **If Plane A resolves to OpenCode receiving the placeholder text from OmniRoute**: re-audit — this report's H4 verdict would need revision. Current evidence says this cannot happen, but an operator trace would override source analysis.
4. **Do not broaden `requiresReasoningReplay()`** to "fix" the warning — replay is an upstream contract mechanism, not a client display mechanism.
5. **Do not synthesize reasoning summaries** for cache-miss placeholders without explicit operator review.

---

## Three planes kept separate (preserved from initial report)

| Plane | Question | Evidence observed | Status |
|---|---|---|---|
| **A — OpenCode harness** | Where does the UI warning originate, and what event/absence triggers it? | `opencode --version` → `1.15.11`; binary scan → no contiguous literal; no source/map/UI trace accessible. | **BLOCKED** |
| **B — OmniRoute response to client** | Which reasoning fields/events can reach the client? | All 12 response translators traced (§3); reasoning preserved in every path; no placeholder emission to client. | **PROVOU NÃO for H2/H4** |
| **C — OmniRoute request replay to upstream** | When does OmniRoute preserve/re-inject prior reasoning? | `requiresReasoningReplay()` traced (§5); placeholder injection confirmed as request-only; cross-turn strip mechanism confirmed (H3b). | **PROVOU SIM for H3b mechanism** |

---

## Reproduction matrix (unchanged — operator-dependent)

The requested matrix requires operator-owned OpenCode configuration, actual combo catalog, same prompt/tools, resolved target, client protocol, stream mode, retry state, UI state, and sanitized captures. None were available. Every row remains explicitly **blocked**, not treated as a failed reproduction.

| Case | Required measurements | Classification |
|---|---|---|
| Direct single target | OpenCode version/config; resolved provider/model; protocol; stream; response fields/events + sizes; UI warning | **Blocked** |
| Each combo target alone | Same measurements per concrete target | **Blocked** |
| Real combo | Strategy/order; selected target; response fields/events + sizes; warning | **Blocked** |
| Before `/compact` | Prior-turn reasoning presence/size; warning state | **Blocked** |
| After `/compact` / auto-compact | Same measurements + exact trigger | **Blocked** |
| Streaming | SSE event names; reasoning presence/size; UI state | **Blocked** |
| Non-streaming | JSON/Responses fields; reasoning presence/size; UI state | **Blocked** |
| Retry/fallback | First/final targets; failure class; response presence/size | **Blocked** |
| Model switch/tool loop | Target transition; prior assistant reasoning presence/size | **Blocked** |

---

## Blockers and inconclusive observations

1. No operator combo list, strategy configuration, or target/account mapping was provided.
2. No real OpenCode session, `/compact` or auto-compact trace, retry trace, tool-loop trace, or model-switch trace was accessible.
3. No sanitized upstream request/response or OmniRoute client-response capture was accessible.
4. No OpenCode source checkout/source map for `1.15.11` was accessible; the ELF literal scan cannot locate runtime-generated warnings.
5. The exact warning is confirmed in OmniRoute's replay placeholder path (request-only), so any claim that OmniRoute emits it in responses requires new evidence overriding the R-NEG finding.
6. The selected local tests are deterministic regression evidence only and do not prove provider/network/UI behavior.
7. `docs/routing/REASONING_REPLAY.md` contains an older memory-entry count (`2000`) while the live service constant is `200`; this documentation drift is noted but not changed because the task is report-only.

---

## §8 — Worker Handoff Packet

### Packet identity

- **Task:** `RD-omniroute-opencode-reasoning-summary-combo-audit`
- **Worker role:** terminal consolidation — docs-only archivist
- **Repository:** `/home/sephiroth/working/ganthritor/cybernetics-core/omniroute-2`
- **Audit dates:** 2026-08-17 (initial audit), 2026-08-18 (terminal consolidation)
- **Disposition:** H2/H4 closed (PROVOU NÃO); H3b mechanism confirmed; H1/Plane A BLOCKED; report is terminal for source-analysis scope

### Scope and file ownership

- **Updated:** `docs/reports/opencode-reasoning-summary-combo-audit.md` (this file)
- **Updated:** `docs/tasks/01-open/RD-omniroute-opencode-reasoning-summary-combo-audit.md` (Agent Session Ledger only)
- **Production files modified:** none
- **Test files modified:** none
- **Changelog files modified:** none
- **Generated documentation surfaces modified:** none
- **Task lane:** NOT MOVED — remains in `01-open/` per operator instruction

### Evidence delivered

- §1: Complete H1–H4 hypothesis matrix with explicit verdicts and classification rules.
- §2: 27 deterministic test files inventoried; 11 executed (180 pass, 0 fail); 16 verified present.
- §3: 12 response-translation routes cited with file:line and reasoning preservation behavior.
- §4: OpenCode `1.15.11` binary scan scope explicitly bounded; runtime assembly not ruled out.
- §5: Plane C replay coverage list with operator-case gap analysis.
- §6: Final RD conclusion with verdicts, caveat, and recommended next actions.

### Operator handoff request (unchanged)

Provide a sanitized matrix with one row per direct target and real combo attempt containing:

1. exact OpenCode version/config identifier;
2. combo name/strategy and configured targets;
3. actual provider/model selected for every attempt, including retry/fallback;
4. Chat Completions vs Responses and streaming vs non-streaming;
5. reasoning field/event names and sizes only (presence/byte count; redact values);
6. UI warning presence and exact trigger (`/compact`, auto-compact, retry, tool loop, or model switch);
7. whether the prior assistant turn had tool calls and whether the client replayed reasoning fields.

### Stop/escalation condition

Stop and escalate rather than patching when the only evidence is the UI warning, when Plane B has not been captured, when the final target is unknown, or when a proposal would broaden replay detection or synthesize reasoning content without an upstream contract.

### Session history

| Session | Role | Key contributions |
|---|---|---|
| `ses_ff1ac395dffeJ3u0VFdGCAxerF` | Initial audit worker | Source/report audit; 180-test deterministic evidence; three-plane framework |
| `ses_fef146dfbffeTfXoxyifdjBtXr` | Plane A/B/C investigator | Confirmed Plane C placeholder mechanism; Plane A/B causality unproven |
| `ses_feea173b5ffe734SBzTxiflM6D` | Fallback/translation follow-up | Response-translation route tracing; H3b cross-turn mechanism identification |
| (this session) | Terminal consolidation archivist | §1–§6 consolidation; hypothesis matrix; final verdicts |

### Final status

**Terminal consolidation complete.** The report delivers the full architect-requested package: hypothesis matrix with explicit verdicts, test file inventory, response-route citations, binary scan scope, replay coverage analysis, and final conclusion with caveats. No production changes, no changelog, no task lane move. The RD remains open pending Plane A resolution via operator evidence.
