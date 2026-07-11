/**
 * F-06-002: Production plugin loader enforces manifest permissions.
 */
import { describe, it, afterEach } from "node:test";
import assert from "node:assert/strict";
import { assertPluginPermissions } from "../../src/lib/plugins/loader.ts";

describe("plugin permission enforcement (F-06-002)", () => {
  const originalExec = process.env.OMNIROUTE_PLUGINS_ALLOW_EXEC;

  afterEach(() => {
    if (originalExec === undefined) delete process.env.OMNIROUTE_PLUGINS_ALLOW_EXEC;
    else process.env.OMNIROUTE_PLUGINS_ALLOW_EXEC = originalExec;
  });

  it("allows source that only uses pure JS with empty permissions", () => {
    assert.doesNotThrow(() =>
      assertPluginPermissions(
        `export async function onRequest(ctx) { return { ok: true }; }`,
        [],
        "pure-plugin"
      )
    );
  });

  it("denies child_process without exec permission", () => {
    assert.throws(
      () =>
        assertPluginPermissions(
          `import { exec } from "child_process";\nexport const onRequest = () => exec("id");`,
          [],
          "shell-plugin"
        ),
      /exec/
    );
  });

  it("denies exec permission when OMNIROUTE_PLUGINS_ALLOW_EXEC is not set", () => {
    delete process.env.OMNIROUTE_PLUGINS_ALLOW_EXEC;
    assert.throws(
      () =>
        assertPluginPermissions(
          `import { exec } from "child_process";`,
          ["exec"],
          "exec-plugin"
        ),
      /OMNIROUTE_PLUGINS_ALLOW_EXEC=1/
    );
  });

  it("allows child_process when exec is declared and env opt-in is set", () => {
    process.env.OMNIROUTE_PLUGINS_ALLOW_EXEC = "1";
    assert.doesNotThrow(() =>
      assertPluginPermissions(
        `const cp = require("child_process");`,
        ["exec"],
        "exec-plugin"
      )
    );
  });

  it("denies fs without file-read/file-write", () => {
    assert.throws(
      () =>
        assertPluginPermissions(
          `import { readFile } from "fs/promises";`,
          [],
          "fs-plugin"
        ),
      /file-read/
    );
  });

  it("allows fs with file-read permission", () => {
    assert.doesNotThrow(() =>
      assertPluginPermissions(
        `import { readFile } from "node:fs/promises";`,
        ["file-read"],
        "fs-plugin"
      )
    );
  });

  it("denies network modules without network permission", () => {
    assert.throws(
      () =>
        assertPluginPermissions(
          `import http from "http";`,
          ["file-read"],
          "net-plugin"
        ),
      /network/
    );
  });

  it("allows network modules with network permission", () => {
    assert.doesNotThrow(() =>
      assertPluginPermissions(`import https from "https";`, ["network"], "net-plugin")
    );
  });
});
