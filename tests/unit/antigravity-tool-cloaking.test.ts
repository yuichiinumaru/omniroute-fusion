import test from "node:test";
import assert from "node:assert/strict";

import {
  cloakAntigravityToolPayload,
  stripEnumDescriptions,
} from "../../open-sse/config/toolCloaking.ts";

test("cloakAntigravityToolPayload preserves client-declared tools without injecting synthetic decoys", () => {
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
  const names: string[] = declarations.map((tool: { name: string }) => tool.name);

  // Client-declared tools must be preserved with original names
  assert.ok(names.includes("workspace_read"), "workspace_read must be preserved");
  assert.ok(names.includes("run_command"), "run_command must be preserved");

  // No synthetic decoy tools must be injected — only the two client-declared tools
  assert.equal(declarations.length, 2, "only client-declared tools, no decoys");
  assert.ok(
    !names.includes("browser_subagent"),
    "browser_subagent decoy must NOT be injected"
  );
  assert.ok(
    !names.includes("mcp_sequential_thinking_sequentialthinking"),
    "mcp_sequential_thinking decoy must NOT be injected"
  );

  for (const name of names) {
    assert.match(name, /^[a-zA-Z0-9_]+$/);
  }

  // Tool calls and responses in contents must be preserved verbatim
  assert.equal(
    result.body.request.contents[0].parts[0].functionCall.name,
    "workspace_read"
  );
  assert.equal(
    result.body.request.contents[1].parts[0].functionResponse.name,
    "workspace_read"
  );
  assert.equal(result.toolNameMap, null);
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

test("cloakAntigravityToolPayload preserves OpenCode/native tool call arguments and names (fork contract)", () => {
  // This test proves the fork's deliberate tool-call preservation for OpenCode compatibility:
  // functionCall names and arguments in contents must pass through verbatim.
  const payload = {
    request: {
      tools: [
        {
          functionDeclarations: [
            {
              name: "mcp__filesystem__read_file",
              description: "Read file contents",
              parameters: {
                type: "OBJECT",
                properties: { path: { type: "STRING" } },
                required: ["path"],
              },
            },
          ],
        },
      ],
      contents: [
        {
          role: "model",
          parts: [
            {
              functionCall: {
                name: "mcp__filesystem__read_file",
                args: { path: "/home/user/app/src/index.ts" },
              },
            },
          ],
        },
        {
          role: "user",
          parts: [
            {
              functionResponse: {
                name: "mcp__filesystem__read_file",
                response: { content: "export const main = () => {};" },
              },
            },
          ],
        },
      ],
    },
  };

  const result = cloakAntigravityToolPayload(payload);
  const declarations = (result.body.request.tools?.[0] as any)?.functionDeclarations || [];
  const names: string[] = declarations.map((d: { name: string }) => d.name);

  // Only the client-declared tool must be present — no decoys
  assert.deepEqual(names, ["mcp__filesystem__read_file"]);

  // functionCall name and args must be preserved verbatim
  const fcPart = result.body.request.contents[0].parts[0];
  assert.equal(fcPart.functionCall.name, "mcp__filesystem__read_file");
  assert.deepEqual(fcPart.functionCall.args, { path: "/home/user/app/src/index.ts" });

  // functionResponse name and response must be preserved verbatim
  const frPart = result.body.request.contents[1].parts[0];
  assert.equal(frPart.functionResponse.name, "mcp__filesystem__read_file");
  assert.deepEqual(frPart.functionResponse.response, {
    content: "export const main = () => {};",
  });

  assert.equal(result.toolNameMap, null);
});
