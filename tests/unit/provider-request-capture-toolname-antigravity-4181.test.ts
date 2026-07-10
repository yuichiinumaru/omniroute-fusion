/**
 * #4181 (follow-up to #4091) — Antigravity tool-name capture in the request
 * inspection pipeline. Cloaking is disabled (all tool names pass through
 * unchanged), so the Antigravity executor never attaches a `_toolNameMap`.
 * These tests verify that non-cloaked Antigravity traffic stays clean — no
 * spurious map, no round-trip artifacts.
 */
import test from "node:test";
import assert from "node:assert/strict";

import {
  createPreparedRequestLogger,
} from "../../open-sse/utils/providerRequestLogging.ts";
import {
  cloakAntigravityToolPayload,
} from "../../open-sse/config/toolCloaking.ts";

function makeCapture() {
  const logged: unknown[] = [];
  const reqLogger = {
    logTargetRequest: (_url: unknown, _headers: Record<string, string>, body: unknown) => {
      logged.push(body);
    },
  };
  const scope = {
    id: null,
    model: "gemini-2.5-pro",
    provider: "antigravity",
    connectionId: null,
  };
  return { capture: createPreparedRequestLogger(reqLogger, scope), logged };
}

const CUSTOM_TOOL = "workspace_read";
const NATIVE_TOOL = "run_command";

function makePlainBody(): Record<string, unknown> {
  const body: Record<string, unknown> = {
    model: "gemini-2.5-pro",
    request: {
      tools: [
        {
          functionDeclarations: [
            { name: CUSTOM_TOOL, description: "Read a file", parameters: { type: "OBJECT", properties: {} } },
            { name: NATIVE_TOOL, description: "Run a shell command", parameters: { type: "OBJECT", properties: {} } },
          ],
        },
      ],
      contents: [],
    },
  };

  const cloaked = cloakAntigravityToolPayload(body);
  // Cloaking is disabled — tool names pass through unchanged, no map produced.
  assert.equal(cloaked.toolNameMap, null, "no reverse map with cloaking disabled");

  const declarations = (
    (cloaked.body.request as Record<string, unknown>).tools as Array<{
      functionDeclarations: Array<{ name: string }>;
    }>
  )[0].functionDeclarations.map((d) => d.name);
  assert.ok(declarations.includes(CUSTOM_TOOL), "custom tool declaration preserved verbatim");
  assert.ok(declarations.includes(NATIVE_TOOL), "native tool declaration preserved verbatim");

  return cloaked.body as Record<string, unknown>;
}

test("#4181 body() passes non-cloaked Antigravity traffic through the capture round-trip with no map", () => {
  const { capture } = makeCapture();
  const body = makePlainBody();

  const bodyString = JSON.stringify(body);
  const captured = JSON.parse(bodyString);
  capture.capture({
    url: "https://server.codeium.com/exa.language_server_pb.LanguageServerService/GenerateAntigravity",
    headers: {},
    body: captured,
    bodyString,
  });

  const finalBody = capture.body(body) as Record<string, unknown>;
  assert.equal(finalBody._toolNameMap, undefined, "no _toolNameMap when cloaking is disabled");
});

test("#4181 body() leaves non-cloaked Antigravity traffic untouched (no spurious map)", () => {
  const { capture } = makeCapture();
  // Only native tools → cloak produces no map, executor attaches nothing.
  const plainBody: Record<string, unknown> = {
    model: "gemini-2.5-pro",
    request: {
      tools: [
        {
          functionDeclarations: [
            { name: NATIVE_TOOL, description: "Run a shell command", parameters: { type: "OBJECT", properties: {} } },
          ],
        },
      ],
      contents: [],
    },
  };
  const cloaked = cloakAntigravityToolPayload(plainBody);
  assert.equal(cloaked.toolNameMap, null, "all-native payload yields no reverse map");

  const bodyString = JSON.stringify(cloaked.body);
  capture.capture({
    url: "https://server.codeium.com/...",
    headers: {},
    body: JSON.parse(bodyString),
    bodyString,
  });
  const finalBody = capture.body(cloaked.body) as Record<string, unknown>;
  assert.equal(finalBody._toolNameMap, undefined);
});
