import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  executeSandboxedHook,
  compileHookSandbox,
  migrateLegacyHookCode,
} from "../../src/lib/middleware/hookSandbox.ts";
import {
  createHookContext,
  registerHook,
  runHooks,
  clearAllHooks,
  loadHooksFromConfig,
  updateHook,
} from "../../src/lib/middleware/registry.ts";
import { HookPriority } from "../../src/lib/middleware/types.ts";

describe("Hook Sandbox Confinement & Execution", () => {
  const sampleContext = createHookContext({
    body: { model: "gpt-4", temperature: 0.7 },
    headers: { "x-user-id": "user-123", "content-type": "application/json" },
    model: "gpt-4",
    combo: "primary-combo",
  });

  describe("Standard Hook Execution", () => {
    it("executes simple return object hook", async () => {
      const code = `return { model: "claude-3-5-sonnet" };`;
      const fn = compileHookSandbox(code, "test-simple-return");
      const result = await fn(sampleContext);
      assert.equal(result.model, "claude-3-5-sonnet");
    });

    it("executes conditional logic based on context.model", async () => {
      const code = `
        if (context.model === "gpt-4") {
          return { model: "claude-3-5-sonnet", body: { temperature: 0.2 } };
        }
        return {};
      `;
      const fn = compileHookSandbox(code, "test-conditional");
      const result = await fn(sampleContext);
      assert.equal(result.model, "claude-3-5-sonnet");
      assert.deepEqual(result.body, { temperature: 0.2 });
    });

    it("handles headers mutation and response short-circuit", async () => {
      const code = `
        if (context.headers["x-user-id"] === "user-123") {
          return {
            response: { status: 403, body: { error: "User blocked" } }
          };
        }
      `;
      const fn = compileHookSandbox(code, "test-short-circuit");
      const result = await fn(sampleContext);
      assert.deepEqual(result.response, { status: 403, body: { error: "User blocked" } });
    });

    it("supports logging calls via context.log", async () => {
      let logged = false;
      const customCtx = createHookContext({
        body: {},
        headers: {},
        model: "gpt-4",
        log: {
          info: (tag: string, msg: string) => {
            if (tag === "TEST" && msg === "Hello from hook") logged = true;
          },
        },
      });
      const code = `
        context.log.info("TEST", "Hello from hook");
        return { model: "gpt-4o" };
      `;
      const fn = compileHookSandbox(code, "test-logging");
      const result = await fn(customCtx);
      assert.equal(result.model, "gpt-4o");
      assert.equal(logged, true);
    });

    it("executes JSON DSL rule hook", async () => {
      const code = JSON.stringify({
        match: { model: "gpt-4" },
        action: { model: "gpt-4o", headers: { "x-routed-by": "json-dsl" } },
      });
      const fn = compileHookSandbox(code, "test-json-dsl");
      const result = await fn(sampleContext);
      assert.equal(result.model, "gpt-4o");
      assert.deepEqual(result.headers, { "x-routed-by": "json-dsl" });
    });
  });

  describe("Security Confinement (Exploit Negative Tests)", () => {
    it("blocks access to process.env (returns error / undefined)", async () => {
      const code = `return { body: { secret: process.env.SECRET || "leak" } };`;
      assert.throws(() => compileHookSandbox(code, "malicious-process"), (err: Error) => {
        return err.message.includes("process") || err.message.includes("not defined");
      });
    });

    it("blocks access to require (returns error)", async () => {
      const code = `const fs = require("fs"); return { body: { data: fs.readFileSync("/etc/passwd") } };`;
      assert.throws(() => compileHookSandbox(code, "malicious-require"), (err: Error) => {
        return err.message.includes("require") || err.message.includes("not defined");
      });
    });

    it("blocks access to globalThis", async () => {
      const code = `return { body: { g: globalThis } };`;
      assert.throws(() => compileHookSandbox(code, "malicious-globalthis"), (err: Error) => {
        return err.message.includes("globalThis") || err.message.includes("not defined");
      });
    });

    it("blocks constructor prototype escape (.constructor access)", async () => {
      const code = `
        const c = context.constructor;
        return { body: { c: c } };
      `;
      assert.throws(() => compileHookSandbox(code, "malicious-constructor"), (err: Error) => {
        return err.message.includes("constructor") || err.message.includes("forbidden");
      });
    });

    it("blocks __proto__ access", async () => {
      const code = `
        const p = context.__proto__;
        return { body: { p: p } };
      `;
      assert.throws(() => compileHookSandbox(code, "malicious-proto"), (err: Error) => {
        return err.message.includes("__proto__") || err.message.includes("forbidden");
      });
    });

    it("prevents infinite loops via step limit", async () => {
      const code = `
        let i = 0;
        while (i < 1000000) {
          i = i + 1;
        }
        return { model: "done" };
      `;
      const fn = compileHookSandbox(code, "malicious-infinite-loop");
      await assert.rejects(async () => {
        await fn(sampleContext);
      }, (err: Error) => {
        return err.message.includes("limit exceeded") || err.message.includes("loop");
      });
    });
  });

  describe("Performance & Compatibility", () => {
    it("executes simple transform within baseline performance (< 1ms)", async () => {
      const code = `if (context.model === "gpt-4") { return { model: "gpt-4o" }; } return {};`;
      const fn = compileHookSandbox(code, "perf-test");

      const start = performance.now();
      const iterations = 1000;
      for (let i = 0; i < iterations; i++) {
        await fn(sampleContext);
      }
      const totalMs = performance.now() - start;
      const perOpMs = totalMs / iterations;

      assert.ok(perOpMs < 0.1, `Execution per op was ${perOpMs}ms, expected < 0.1ms`);
    });

    it("migrateLegacyHookCode validates and converts legacy JS code", () => {
      const legacyJs = `if (context.model === 'gpt-4') { return { model: 'claude-3-5-sonnet' }; }`;
      const res = migrateLegacyHookCode(legacyJs);
      assert.equal(res.valid, true);

      const invalidJs = `process.exit(1);`;
      const resInvalid = migrateLegacyHookCode(invalidJs);
      assert.equal(resInvalid.valid, false);
      assert.ok(resInvalid.error?.includes("process"));
    });
  });

  describe("Registry Integration & Static Sanity", () => {
    it("runs hooks through registry with sandboxed compilation", async () => {
      clearAllHooks();
      registerHook({
        name: "reg-hook-1",
        description: "Registry test hook",
        priority: HookPriority.NORMAL,
        scope: { type: "global" },
        enabled: true,
        code: `if (context.model === "gpt-4") { return { model: "claude-3-5-sonnet" }; }`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        runCount: 0,
      });

      const ctx = createHookContext({
        body: {},
        headers: {},
        model: "gpt-4",
      });

      const res = await runHooks(ctx);
      assert.equal(res.context.model, "claude-3-5-sonnet");
    });

    it("loads and updates hooks in registry using sandbox", async () => {
      clearAllHooks();
      loadHooksFromConfig([
        {
          name: "load-hook",
          description: "Loaded hook",
          priority: HookPriority.HIGH,
          scope: { type: "global" },
          enabled: true,
          code: `return { headers: { "x-loaded": "true" } };`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          runCount: 0,
        },
      ]);

      const ctx = createHookContext({
        body: {},
        headers: {},
        model: "gpt-4",
      });

      let res = await runHooks(ctx);
      assert.equal(res.context.headers["x-loaded"], "true");

      updateHook("load-hook", { code: `return { headers: { "x-updated": "true" } };` });
      res = await runHooks(ctx);
      assert.equal(res.context.headers["x-updated"], "true");
    });

    it("verifies static absence of new Function, eval, and Function constructor in src/lib/middleware/", () => {
      const dirPath = path.resolve(process.cwd(), "src/lib/middleware");
      const files = fs.readdirSync(dirPath);

      for (const file of files) {
        if (!file.endsWith(".ts") && !file.endsWith(".js")) continue;
        const content = fs.readFileSync(path.join(dirPath, file), "utf-8");
        const lines = content.split("\n");

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          // Skip comments
          const trimmed = line.trim();
          if (trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("/*")) continue;

          assert.equal(
            /new Function\(|eval\(|Function\(/.test(line),
            false,
            `Found unsafe function evaluation in ${file}:${i + 1}: ${line}`
          );
        }
      }
    });
  });
});
