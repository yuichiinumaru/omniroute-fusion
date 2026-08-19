# Task 0184: Share the media-provider example-card request lifecycle

> **Status**: `[ ]` Open
> **Priority**: 🟢 P2
> **Type**: `housekeeping`
> **Origin**: Duplicate-block investigation from `.agents/user/gitingest/omniroute2/detect-sameblocks.mjs` and `sameblocs.csv` groups 0658 and 1266; source inspection confirmed repeated dashboard request-state code.
> **Blocks**: —
> **Depends on**: —
> **Parallelism**: `serializable` — own the listed media-provider example-card files and the proposed shared hook; do not co-edit them with another dashboard-media refactor.
> **Review routing**: independent + frontend-quality

---

## Objective

Extract the genuinely shared request lifecycle from the media-provider example cards into a small, typed, dashboard-local hook or equivalent shared primitive, while keeping each card's endpoint, payload builder, transport mode, response parser, result renderer, model fallback, and media-resource cleanup explicit at the call site.

The completed refactor MUST reduce the repeated lifecycle surface identified by the duplicate-block report without changing the user-visible behavior or API contract of the eight cards. It MUST NOT turn provider-specific request bodies or response shapes into an opaque configuration registry. The preferred result is a reusable `useExampleCardRun`-style hook for the JSON request family, with an explicit adapter boundary for multipart or binary/audio cards when their lifecycle is not semantically equivalent.

This is a maintainability task, not an endpoint or product-capability task. It must not add new media kinds, change routing, alter provider credentials, or repair endpoint behavior discovered during the extraction.

## Background Context

### O que já existe:

- `PlaygroundCard` already owns the common visual shell, Run button, loading presentation, cURL display/reveal, error display, latency display, and default JSON result rendering at `src/app/(dashboard)/dashboard/media-providers/components/PlaygroundCard.tsx:7-26,29-39,45-59,81-146`.
- `MediaProviderPageClient.renderPlayground` selects all eight cards by `MediaKind` at `src/app/(dashboard)/dashboard/media-providers/[kind]/[id]/MediaProviderPageClient.tsx:8-56`; each card receives only `providerId`.
- `useApiKey` supplies the active key and is intentionally non-critical on load at `src/app/(dashboard)/dashboard/providers/hooks/useApiKey.ts:24-63`.
- `useProviderModels` supplies provider models and falls back to an empty list while attempting an asynchronous catalog sync at `src/app/(dashboard)/dashboard/providers/hooks/useProviderModels.ts:19-27,32-114`.
- `buildCurl` is the existing cURL generator and shell-escaping helper at `src/app/(dashboard)/dashboard/providers/utils/buildCurl.ts:1-15,20-55`; it should be reused rather than copied.
- The live JSON API routes validate and handle distinct contracts: embeddings at `src/app/api/v1/embeddings/route.ts:76-128`, images at `src/app/api/v1/images/generations/route.ts:94-153`, videos at `src/app/api/v1/videos/generations/route.ts:42-103`, web fetch at `src/app/api/v1/web/fetch/route.ts:1-9,48-139`, and search at `src/app/api/v1/search/route.ts:102-140`.

### O que foi observado:

- `sameblocs.csv:7378-7382` reports exact repeated blocks in `EmbeddingExampleCard.tsx`, `ImageExampleCard.tsx`, `VideoExampleCard.tsx`, `WebFetchExampleCard.tsx`, and `WebSearchExampleCard.tsx` (group 0658).
- `sameblocs.csv:13635-13639` reports a second repeated family in `EmbeddingExampleCard.tsx`, `ImageExampleCard.tsx`, `MusicExampleCard.tsx`, `SttExampleCard.tsx`, and `VideoExampleCard.tsx` (group 1266).
- The duplicate detector is a structural exact-block detector configured with `matchLengthThreshold = 500` in `.agents/user/gitingest/omniroute2/detect-sameblocks.mjs:7`; the CSV is evidence of textual overlap, not proof that all cards have identical transport semantics.
- The same `extractError` implementation is present in all eight cards: Embedding `:16-23`, Image `:18-25`, Video `:16-23`, WebFetch `:26-33`, WebSearch `:15-22`, Music `:16-23`, Stt `:17-24`, and Tts `:18-25`.
- The JSON request lifecycle is materially repeated in Embedding `:52-80`, Image `:82-110`, Video `:75-103`, WebFetch `:59-87`, WebSearch `:88-116`, and Stt `:81-116`: set running, clear error/result, call `fetch`, parse JSON, measure `performance.now()`, extract `{ error: { message } }` or top-level `message`, map non-OK responses to `HTTP <status>`, store `{ data, latencyMs }`, catch an `Error`, and clear running in `finally`.
- The cURL construction is also repeated in Embedding `:41-50`, Image `:72-81`, Video `:65-74`, WebFetch `:46-55`, WebSearch `:75-84`, Music `:43-52`, and Tts `:52-61`, though STT intentionally uses a representative multipart body at `SttExampleCard.tsx:56-68`.
- Model-backed cards repeat the `models[0]?.id` default plus local model state and result state. Examples: Embedding `:30-39`, Image `:60-70`, Video `:54-62`, Music `:30-41`, Stt `:45-54`, and Tts `:32-50`.
- Music and TTS are not ordinary JSON cards. Music has JSON-or-blob handling, object-URL creation and revocation, and an audio renderer at `MusicExampleCard.tsx:54-116`; TTS has blob handling, byte-size state, download behavior, object URLs, and an audio renderer at `TtsExampleCard.tsx:63-124`.
- STT is multipart rather than JSON: it builds `FormData` and appends `model` plus `file` at `SttExampleCard.tsx:81-103`, then consumes JSON. It is a candidate for a hook adapter, but must not be forced through a JSON-only body serializer.
- Web Fetch contains a source comment documenting forward-compatibility assumptions at `WebFetchExampleCard.tsx:11-17`; the live route now exists at `src/app/api/v1/web/fetch/route.ts:1-9`, so the refactor must not alter that endpoint or silently rewrite its provider field.

### O que está faltando / quebrado:

- There is no shared hook for the repeated request lifecycle, error extraction, latency measurement, or JSON result state.
- The repeated blocks can drift: a future fix to status handling, error extraction, header construction, or cleanup would need to be applied in multiple cards.
- The duplicate report alone does not justify a shared base component: card-specific controls and result renderers are intentionally different. The shared boundary must therefore be behavior-level and callback-driven, not a generic card that hides payload construction.
- No dedicated unit test currently targets these ExampleCard modules; the existing test search found no `ExampleCard`, `useExampleCard`, or `example-card` references under `tests/`.

## Test Requirements

- Add focused deterministic tests for the extracted lifecycle or its pure testable helpers using mocked `fetch`; do not call a live provider, production port, or real credential.
- Prove a successful JSON run transitions from idle to running and then exposes the exact parsed response plus measured non-negative latency.
- Prove a non-OK JSON response uses nested `error.message`, then top-level `message`, then bounded `HTTP <status>` fallback in that precedence order.
- Prove a thrown non-`Error` value and a normal `Error` produce the existing sanitized user-facing fallback behavior and always clear `running`.
- Prove each migrated JSON card still sends `POST`, its exact endpoint, `Authorization`, `Content-Type: application/json`, `x-connection-id`, and the card's exact `buildBody()` output.
- Prove cURL snippets continue to use the existing `buildCurl` behavior, preserve card-specific bodies, and retain the placeholder key when no key is available; do not expose any real secret in fixtures or assertions.
- Prove the result renderer remains card-specific: image, video, search, and STT response shapes continue to render through their existing renderer functions, while Embedding/Web Fetch retain the default JSON renderer.
- Decide and document whether STT uses the shared hook through an explicit multipart request adapter. If adopted, test that no `Content-Type: application/json` header is added to `FormData`; if not adopted, document the semantic reason and leave its transport code unchanged except for any independently safe helper extraction.
- Prove Music and TTS audio behavior remains unchanged, including JSON-vs-blob handling, object URL revocation, audio download, byte-size display, and renderer behavior. Prefer leaving their specialized transport/resource lifecycle out of the first hook unless the adapter design is proven by tests.
- Prove `MediaProviderPageClient` still renders the same card for each `MediaKind` and no endpoint path or route file is modified.
- Run only the focused tests plus typecheck/lint required by the task; do not run broad E2E or full-suite commands as part of implementation.

## Exit Conditions (GDD/TDD)

- [ ] All current ExampleCard and `PlaygroundCard` sources, provider hooks, `buildCurl`, the five JSON API routes, and the caller switch are read before modification.
- [ ] A typed shared hook or equivalent helper owns only the proven common request lifecycle; the extraction boundary and any adapter contracts are documented in source comments or the task implementation notes.
- [ ] Embedding, Image, Video, Web Fetch, and Web Search preserve their exact endpoint, headers, payload builder, error behavior, latency behavior, and result renderer after migration.
- [ ] STT is either migrated through a tested multipart adapter or explicitly excluded with a source-backed rationale; Music/TTS binary and object-URL lifecycles are not flattened into an unsafe JSON abstraction.
- [ ] No card-specific `buildBody`, result parser/renderer, model fallback, file validation, audio cleanup, or endpoint selection is hidden inside a generic base component.
- [ ] Focused unit/UI tests pass with deterministic mocked responses and cover success, nested/top-level errors, HTTP fallback, thrown errors, latency, and cleanup.
- [ ] Existing `buildCurl` tests and relevant UI tests remain green; add a focused test only where current coverage has no suitable owner.
- [ ] `npm run typecheck:core` passes without errors.
- [ ] `npm run lint` passes without new errors; any pre-existing unrelated findings are recorded with exact paths.
- [ ] No live request is made to production `:21000` or stable runtime `:22000`; no provider credential or secret is added to source, tests, task text, or logs.
- [ ] No generated tasklist, changelog, EPIC, dependency-tree, or report surface is modified by this task.
- [ ] Completion Evidence contains exact changed paths and real focused test/typecheck/lint output before review.
- [ ] If the implementation changes product code, an append-only `.changelog/` entry is created through the repository changelog workflow and generated changelog validation passes; root `CHANGELOG.md` is not hand-edited.

## Details

### What

Subtasks:

- [ ] **Ler código existente**: read all eight ExampleCard files, `PlaygroundCard`, `MediaProviderPageClient`, `useApiKey`, `useProviderModels`, `buildCurl`, the five JSON route contracts, and relevant existing test conventions before editing.
- [ ] Build a small duplication matrix from the source: shared lifecycle, JSON-only behavior, multipart behavior, binary/audio behavior, payload builders, and result renderers.
- [ ] Design the smallest typed hook/adapter API. It must accept card-owned endpoint and request construction, and must return explicit `running`, `result`, `error`, `latencyMs`/result state, and a run callback without owning card fields.
- [ ] Extract and migrate the common JSON lifecycle for Embedding, Image, Video, Web Fetch, and Web Search.
- [ ] Evaluate STT against the adapter contract; migrate only if multipart headers/body and JSON response/error behavior remain explicit and tested.
- [ ] Keep Music and TTS specialized unless a tested transport/resource adapter gives an equivalent or smaller implementation without changing object-URL ownership.
- [ ] Preserve all existing result renderers and card-specific controls; do not replace them with a renderer registry or a single generic media-card component.
- [ ] Add focused deterministic tests before or alongside the extraction, with mocked `fetch`, `performance`, and browser URL APIs only where needed.
- [ ] **Refactoring pass**: compare the post-change duplication surface with groups 0658/1266 and remove accidental abstraction, unused exports, or duplicated lifecycle code introduced by the refactor.
- [ ] **Verificação de regressão**: run focused tests, `npm run typecheck:core`, and `npm run lint`; inspect the diff and confirm governance/generated surfaces are untouched.

### Where

| Arquivo | Propósito |
|---------|-----------|
| `src/app/(dashboard)/dashboard/media-providers/components/EmbeddingExampleCard.tsx` | Read/modify: JSON card and canonical model/payload example. |
| `src/app/(dashboard)/dashboard/media-providers/components/ImageExampleCard.tsx` | Read/modify: image payload plus image-specific renderer. |
| `src/app/(dashboard)/dashboard/media-providers/components/VideoExampleCard.tsx` | Read/modify: video payload plus video-specific renderer. |
| `src/app/(dashboard)/dashboard/media-providers/components/WebFetchExampleCard.tsx` | Read/modify: URL/format/depth payload and endpoint-specific provider field. |
| `src/app/(dashboard)/dashboard/media-providers/components/WebSearchExampleCard.tsx` | Read/modify: search payload and results renderer. |
| `src/app/(dashboard)/dashboard/media-providers/components/SttExampleCard.tsx` | Read/modify: multipart candidate and text renderer; change only if adapter-safe. |
| `src/app/(dashboard)/dashboard/media-providers/components/MusicExampleCard.tsx` | Read-only or narrowly modify: JSON/blob audio lifecycle; preserve object URLs. |
| `src/app/(dashboard)/dashboard/media-providers/components/TtsExampleCard.tsx` | Read-only or narrowly modify: blob/download/audio lifecycle; preserve cleanup. |
| `src/app/(dashboard)/dashboard/media-providers/components/PlaygroundCard.tsx` | Read-only unless the hook contract exposes a narrowly justified prop improvement; preserve shell behavior. |
| `src/app/(dashboard)/dashboard/media-providers/[kind]/[id]/MediaProviderPageClient.tsx` | Read-only caller switch; verify all eight card mappings remain unchanged. |
| `src/app/(dashboard)/dashboard/providers/hooks/useApiKey.ts` | Read-only dependency contract for active key behavior. |
| `src/app/(dashboard)/dashboard/providers/hooks/useProviderModels.ts` | Read-only dependency contract for model loading/fallback behavior. |
| `src/app/(dashboard)/dashboard/providers/utils/buildCurl.ts` | Read-only existing cURL helper; reuse, do not duplicate. |
| `src/app/api/v1/embeddings/route.ts` | Read-only endpoint/body contract evidence. |
| `src/app/api/v1/images/generations/route.ts` | Read-only endpoint/body contract evidence. |
| `src/app/api/v1/videos/generations/route.ts` | Read-only endpoint/body contract evidence. |
| `src/app/api/v1/web/fetch/route.ts` | Read-only endpoint/provider/response contract evidence. |
| `src/app/api/v1/search/route.ts` | Read-only endpoint/search-body contract evidence. |
| `src/app/(dashboard)/dashboard/media-providers/components/useExampleCardRun.ts` | Proposed create path for the dashboard-local hook; use a different path only if repository conventions prove a better owner. |
| `tests/unit/ui/media-provider-example-card-hook.test.ts` | Proposed create path for focused mocked lifecycle/adapter tests; reuse an existing suitable owner if found during implementation. |
| `.agents/user/gitingest/omniroute2/detect-sameblocks.mjs` | Read-only detector methodology/evidence. |
| `.agents/user/gitingest/omniroute2/sameblocs.csv` | Read-only duplicate groups 0658/1266. |
| `docs/guides/UI.md` | Read-only design-system guidance, especially shared primitives at `:212-246`. |

### How

1. Re-read the listed sources and capture the exact behavior matrix before editing. Treat the duplicate CSV as a lead, not as permission to merge semantically different transports.
2. Define a typed hook boundary around request execution and state transitions. The card supplies endpoint, headers/body or a request factory, and optional response parsing; the hook must not know image, video, search, web-fetch, embedding, or audio payload fields.
3. Keep the existing `buildCurl` call at the card boundary or pass an explicit cURL request description. The hook must not infer a body from React state or fabricate a universal body shape.
4. Migrate the five JSON cards first. Preserve each `buildBody` function, model fallback, `x-connection-id`, endpoint, and renderer in its original card.
5. If STT is migrated, use an explicit multipart request factory that owns `FormData`; do not set a JSON content type for multipart requests. If the hook becomes less clear, leave STT specialized and record why.
6. Do not make Music/TTS depend on a JSON result state if doing so would obscure blob parsing, object URL ownership, revocation, download behavior, or response content-type branching.
7. Add deterministic tests for state/error/latency transitions and each transport adapter. Keep endpoint route behavior out of the test scope; route tests belong to their existing owners.
8. Compare the resulting source against the pre-change matrix and duplicate groups. Prefer a small hook over a base component when only execution state is shared; retain `PlaygroundCard` as the visual base.
9. Run the focused test command, typecheck, and lint only. Review changed paths and verify no generated governance surface was touched.

### Why

The dashboard currently has eight independently maintained copies of error extraction and cURL/request lifecycle code. Groups 0658 and 1266 provide direct evidence of repeated blocks, and the source confirms that six cards share the same JSON lifecycle. Centralizing that lifecycle lowers drift and makes future error/latency behavior changes consistent.

A generic visual base component would be a poor first extraction because `PlaygroundCard` already supplies the visual base and the cards intentionally differ in controls and result shapes. A hook is safer only when its input contract leaves payload construction, transport selection, response parsing, renderers, model defaults, and media-resource ownership with each card. The task therefore treats semantic preservation—not maximum line deletion—as the success criterion.

## Parallelism / file ownership

| Class | Detail |
|-------|---------|
| **serializable** | Owns `useExampleCardRun` (or selected equivalent), five JSON card migrations, any STT adapter decision, and focused tests. |
| **parallel-safe** | Unrelated provider pages, API routes, shared visual primitives, and non-media dashboard work may proceed independently. |
| **Collision** | All eight `*ExampleCard.tsx` files, `PlaygroundCard.tsx` if touched, the new hook/test paths, and the media-provider caller switch. Do not run another UI deduplication wave over these files concurrently. |
| **No ownership transfer** | API route contracts, `useApiKey`, `useProviderModels`, `buildCurl`, UI guide, generated tasklist/changelog/EPIC/dependency-tree surfaces remain read-only for this task. |

## ⛔ Anti-Hallucination Guardrails

> [!CAUTION]
> Do not claim that the duplicate detector proves endpoint equivalence. Verify every payload, header, response shape, and cleanup path against the live source. Do not change `/api/v1/**` routes, provider registries, authentication, model catalogs, or endpoint availability while extracting the hook.
>
> Do not send live requests. Never place an API key, provider credential, cookie, authorization value, or raw upstream response in source, tests, task evidence, or logs.

> [!IMPORTANT]
> Read every file in the `Where` table before modifying any product code. Keep `buildBody` and result rendering card-owned. Treat multipart STT and binary Music/TTS as separate transport/resource semantics, not as JSON variants by assertion.
>
> `PlaygroundCard` is the existing visual base. Do not create a second generic card shell merely because the hook is extracted.

## 🛡️ Compliance Checklist (Leis Primárias do AGENTS.md)

- [ ] **Doc Accuracy**: all paths, symbols, endpoints, and line references in this task were verified against the repository during investigation.
- [ ] **Zod Validation**: no new API input is introduced; existing route validation remains unchanged.
- [ ] **Security**: no secret or credential is committed; cURL fixtures use placeholders only.
- [ ] **Error Sanitization**: client-side error display preserves bounded extracted messages and does not add raw upstream-body logging.
- [ ] **No Raw SQL**: N/A — no database work.
- [ ] **Archive Protocol**: no files are deleted; no generated surface is rewritten.

## 📋 Completion Evidence (preenchido pelo agente executor)

- **Arquivos criados/modificados**: [exact list with paths]
- **Focused tests**: [exact command, PASS/FAIL, count, and sanitized output]
- **Typecheck**: [exact `npm run typecheck:core` result]
- **Lint**: [exact `npm run lint` result and any unrelated baseline findings]
- **Transport decisions**: [STT adapter result; Music/TTS scope and evidence]
- **Behavior preservation**: [payload/header/renderer/error/latency evidence]
- **Generated surfaces**: [confirm tasklist/changelog/EPIC/dependency-tree handling; changelog path if product code changed]
- **Agent executor**: [name/role]
- **Date of completion**: [YYYY-MM-DD]

## 🔍 Review Trail (preenchido pelo reviewer)

- **Reviewer**: [name/role]
- **Date of review**: [YYYY-MM-DD]
- **Verdict**: [APPROVED / REJECTED]
- **Score (path to 100)**: [0-100]
- **Notes**: [evidence-based, cite changed paths and tests]
- **If REJECTED**: move to `02-doing/` with the reason documented at the top.
