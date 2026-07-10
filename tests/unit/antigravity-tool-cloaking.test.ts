import test from "node:test";
import assert from "node:assert/strict";

import {
  AG_DECOY_TOOLS,
  cloakAntigravityToolPayload,
  stripEnumDescriptions,
} from "../../open-sse/config/toolCloaking.ts";

test("cloakAntigravityToolPayload passes tool names through unchanged, preserves native tools and injects decoys", () => {
  const payload = {
    request: {
      tools: [
        {
          functionDeclarations: [
            {
              name: "workspace_read",
              description: "Read a file",
              parameters: { type: "OBJECT", properties: {} },
            },
            {
              name: "run_command",
              description: "Native tool should stay visible",
              parameters: { type: "OBJECT", properties: {} },
            },
          ],
        },
      ],
      contents: [
        {
          role: "model",
          parts: [{ functionCall: { name: "workspace_read", args: { path: "/tmp/a" } } }],
        },
        {
          role: "user",
          parts: [{ functionResponse: { name: "workspace_read", response: { ok: true } } }],
        },
      ],
    },
  };

  const result = cloakAntigravityToolPayload(payload);
  const declarations = (result.body.request.tools?.[0] as any)?.functionDeclarations || [];
  const names = declarations.map((tool: { name: string }) => tool.name);

  assert.ok(names.includes("workspace_read"));
  assert.ok(names.includes("run_command"));
  assert.ok(names.includes("browser_subagent"));
  assert.ok(names.includes("mcp_sequential_thinking_sequentialthinking"));
  for (const name of names) {
    assert.match(name, /^[a-zA-Z0-9_]+$/);
  }
  assert.equal(
    result.body.request.contents[0].parts[0].functionCall.name,
    "workspace_read"
  );
  assert.equal(
    result.body.request.contents[1].parts[0].functionResponse.name,
    "workspace_read"
  );
  assert.equal(result.toolNameMap, null);
  assert.equal(
    declarations.filter((tool: { name: string }) => tool.name === "browser_subagent").length,
    1
  );
  assert.ok(AG_DECOY_TOOLS.length > 20);
});

test("cloakAntigravityToolPayload preserves pre-existing toolNameMap without adding cloaking entries", () => {
  const payload = {
    _toolNameMap: new Map([["workspace_read", "mcp__filesystem__workspace_read"]]),
    request: {
      tools: [
        {
          functionDeclarations: [
            {
              name: "workspace_read",
              description: "Read a file",
              parameters: { type: "OBJECT", properties: {} },
            },
          ],
        },
      ],
      contents: [],
    },
  };

  const result = cloakAntigravityToolPayload(payload);

  assert.equal(
    result.toolNameMap?.get("workspace_read"),
    "mcp__filesystem__workspace_read"
  );
});

test("stripEnumDescriptions removes enumDescriptions at every nesting level", () => {
  const schema = {
    type: "OBJECT",
    enumDescriptions: ["should be removed at root"],
    properties: {
      mode: {
        type: "STRING",
        enum: ["a", "b"],
        enumDescriptions: ["desc a", "desc b"],
      },
      nested: {
        type: "OBJECT",
        properties: {
          choice: {
            type: "STRING",
            enumDescriptions: ["deep desc"],
          },
        },
      },
      list: {
        type: "ARRAY",
        items: {
          type: "STRING",
          enumDescriptions: ["item desc"],
        },
      },
    },
  };

  const stripped = stripEnumDescriptions(schema) as any;

  assert.equal("enumDescriptions" in stripped, false);
  assert.equal("enumDescriptions" in stripped.properties.mode, false);
  assert.equal("enumDescriptions" in stripped.properties.nested.properties.choice, false);
  assert.equal("enumDescriptions" in stripped.properties.list.items, false);
  // Non-target fields are preserved.
  assert.deepEqual(stripped.properties.mode.enum, ["a", "b"]);
  // Input is not mutated.
  assert.ok(Array.isArray((schema.properties.mode as any).enumDescriptions));
});

test("cloakAntigravityToolPayload strips enumDescriptions from declaration parameters", () => {
  const payload = {
    request: {
      tools: [
        {
          functionDeclarations: [
            {
              name: "workspace_read",
              description: "Read a file",
              parameters: {
                type: "OBJECT",
                enumDescriptions: ["root-level"],
                properties: {
                  mode: {
                    type: "STRING",
                    enum: ["read", "write"],
                    enumDescriptions: ["read mode", "write mode"],
                  },
                },
              },
            },
            {
              name: "run_command",
              description: "Native tool keeps visible name but loses enumDescriptions",
              parameters: {
                type: "OBJECT",
                properties: {
                  shell: {
                    type: "STRING",
                    enumDescriptions: ["bash", "zsh"],
                  },
                },
              },
            },
          ],
        },
      ],
      contents: [],
    },
  };

  const result = cloakAntigravityToolPayload(payload);
  const declarations = (result.body.request.tools?.[0] as any)?.functionDeclarations || [];

  const tool = declarations.find(
    (d: { name: string }) => d.name === "workspace_read"
  );
  assert.ok(tool, "workspace_read tool present");
  assert.equal("enumDescriptions" in tool.parameters, false);
  assert.equal("enumDescriptions" in tool.parameters.properties.mode, false);
  assert.deepEqual(tool.parameters.properties.mode.enum, ["read", "write"]);

  const native = declarations.find((d: { name: string }) => d.name === "run_command");
  assert.ok(native, "native tool preserved");
  assert.equal("enumDescriptions" in native.parameters.properties.shell, false);
});
