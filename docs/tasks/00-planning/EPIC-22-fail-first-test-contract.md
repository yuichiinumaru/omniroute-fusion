# EPIC-22 — Fail-first test contract (paste target)

> **Purpose**: Ready-to-land anti-bullshit tests for Phase 1.  
> **Target file when implementing T22-A/C**: `tests/unit/fusion-cognitive-diversity.test.ts`  
> **Style**: Node native `node:test` + `node:assert/strict` (copy `fusion-panel-tools-none.test.ts`).  
> **Do not** merge a permanently red suite to `main` alone — land with green pure-catalog first, or same PR as runtime inject.

---

## Commands

```bash
node --import tsx/esm --test tests/unit/fusion-cognitive-diversity.test.ts
node --import tsx/esm --test tests/unit/fusion-panel-tools-none.test.ts
node --import tsx/esm --test tests/unit/fusion-contracts.test.ts
node --import tsx/esm --test tests/unit/fusion-editor-types.test.ts
```

---

## Skeleton (implementers fill imports after modules exist)

```ts
/**
 * EPIC-22 — Cognitive diversity as config (anti-bullshit contracts).
 *
 * Fail-first: body diversity + schema plumb. Mock style from fusion-panel-tools-none.
 */
import test from "node:test";
import assert from "node:assert/strict";

// After T22-A:
// import {
//   FUSION_COGNITIVE_LENS_IDS,
//   resolvePanelLensText,
// } from "../../src/shared/constants/fusionCognitiveLenses.ts";

// After T22-B/C:
// import { createComboSchema } from "../../src/shared/validation/schemas/combo.ts";
// import { handleFusionChatV2, resolveFusionUnits } from "../../open-sse/services/fusion.ts";

type Body = Record<string, unknown>;

function okResponse(content: string): Response {
  return new Response(
    JSON.stringify({ choices: [{ message: { role: "assistant", content } }] }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
}

const fastTuning = {
  minPanel: 2,
  stragglerGraceMs: 50,
  panelHardTimeoutMs: 5000,
};

function extractSystemBlob(body: Body): string {
  const chunks: string[] = [];
  if (typeof body.system === "string") chunks.push(body.system);
  if (Array.isArray(body.messages)) {
    for (const m of body.messages as Array<{ role?: string; content?: unknown }>) {
      if (m.role !== "system" && m.role !== "developer") continue;
      if (typeof m.content === "string") chunks.push(m.content);
      else if (Array.isArray(m.content)) {
        for (const p of m.content as Array<{ text?: string }>) {
          if (p?.text) chunks.push(p.text);
        }
      }
    }
  }
  return chunks.join("\n");
}

// ─── T22-A pure catalog ────────────────────────────────────────────────────

test("catalog: every preset lens resolves to non-empty fingerprint text", async () => {
  // const { FUSION_COGNITIVE_LENS_IDS, resolvePanelLensText } = await import(...);
  // for (const id of FUSION_COGNITIVE_LENS_IDS) {
  //   if (id === "custom") continue;
  //   const text = resolvePanelLensText(id, undefined);
  //   assert.ok(text && text.length > 20, id);
  // }
  assert.fail("T22-A: wire catalog import");
});

test("catalog: custom without addon is empty; with addon returns addon", async () => {
  assert.fail("T22-A: wire catalog import");
});

// ─── T22-B schema ──────────────────────────────────────────────────────────

test("schema: accepts thinkingMode adversarial and keeps field", async () => {
  assert.fail("T22-B: createComboSchema model step with thinkingMode");
});

test("schema: rejects unknown thinkingMode", async () => {
  assert.fail("T22-B: turbo must fail");
});

test("schema: custom without systemAddon fails", async () => {
  assert.fail("T22-B: custom requires systemAddon");
});

// ─── T22-C runtime anti-bullshit ───────────────────────────────────────────

test("runtime: unset modes → no lens fingerprint in panel system", async () => {
  // handleFusionChatV2 with two plain model panels; capture bodies;
  // assert !extractSystemBlob(b).includes(KNOWN_FINGERPRINT)
  // assert stream false + tool_choice none (D9)
  assert.fail("T22-C: baseline");
});

test("runtime: different thinkingModes ⇒ different system blobs (anti-bullshit)", async () => {
  // panels:
  //   { kind:"model", model:"p/a", thinkingMode:"first-principles" }
  //   { kind:"model", model:"p/b", thinkingMode:"adversarial" }
  // judge: p/judge
  // capture panel bodies by model
  // assert extractSystemBlob(bodyA) !== extractSystemBlob(bodyB)
  // assert bodyA includes first-principles fingerprint
  // assert bodyB includes adversarial fingerprint
  assert.fail("T22-C: diversity inject");
});

test("runtime: mode + systemAddon composes both texts", async () => {
  assert.fail("T22-C: composition");
});

test("runtime: panel modes do not leak into judge body", async () => {
  assert.fail("T22-C: judge isolation");
});

test("runtime: judgeMode pick-best changes judge prompt vs synthesize", async () => {
  assert.fail("T22-C: judgeMode");
});

// ─── T22-D editor (pure) ───────────────────────────────────────────────────

test("editor: unitToPayload / formFromCombo round-trip thinkingMode + systemAddon", async () => {
  assert.fail("T22-D: fusionEditorTypes");
});
```

---

## Fingerprint convention

When writing lens strings in the catalog, include a stable token for tests, e.g.:

- `[omniroute-lens:first-principles]`  
- `[omniroute-lens:adversarial]`  
- …  

Hidden from UI copy; models can ignore tags; tests assert inclusion. Prefer short tokens at end of inject text.

---

## Mock fragment (diversity)

```ts
const panelBodies = new Map<string, Body>();
const handleSingleModel = async (body: Body, model: string) => {
  if (model !== "p/judge") panelBodies.set(model, body);
  if (model === "p/judge") return okResponse("FINAL");
  return okResponse(`ans-${model}`);
};

// await handleFusionChatV2({ body: {...}, panels: [...], judge: {...}, handleSingleModel, log, tuning: fastTuning });

const a = extractSystemBlob(panelBodies.get("p/a")!);
const b = extractSystemBlob(panelBodies.get("p/b")!);
assert.notEqual(a, b);
assert.match(a, /omniroute-lens:first-principles/);
assert.match(b, /omniroute-lens:adversarial/);
```

---

**Linked epic**: `EPIC-22-omniroute-cognitive-diversity-fusion.md` §6  
**Held phase 2**: `EPIC-23-omniroute-cognitive-diversity-phase2-held.md`
