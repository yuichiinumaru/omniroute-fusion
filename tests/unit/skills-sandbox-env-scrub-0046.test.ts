/**
 * F-06-001: Skill Docker sandbox must not inherit full host process.env.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildDockerCliEnv,
  buildContainerEnv,
} from "../../src/lib/skills/sandbox.ts";

describe("skill sandbox env scrub (F-06-001)", () => {
  it("buildDockerCliEnv allowlists PATH/HOME and excludes secrets", () => {
    const env = buildDockerCliEnv({
      PATH: "/usr/bin",
      HOME: "/home/op",
      LANG: "en_US.UTF-8",
      JWT_SECRET: "super-secret-jwt",
      API_KEY_SECRET: "super-secret-api",
      STORAGE_ENCRYPTION_KEY: "enc-key-material",
      OPENAI_API_KEY: "sk-live-xxx",
      OMNIROUTE_CLOUD_SYNC_SECRET: "cloud-hmac",
      RANDOM_PROVIDER_TOKEN: "tok",
    });

    assert.equal(env.PATH, "/usr/bin");
    assert.equal(env.HOME, "/home/op");
    assert.equal(env.LANG, "en_US.UTF-8");
    assert.equal(env.JWT_SECRET, undefined);
    assert.equal(env.API_KEY_SECRET, undefined);
    assert.equal(env.STORAGE_ENCRYPTION_KEY, undefined);
    assert.equal(env.OPENAI_API_KEY, undefined);
    assert.equal(env.OMNIROUTE_CLOUD_SYNC_SECRET, undefined);
    assert.equal(env.RANDOM_PROVIDER_TOKEN, undefined);
  });

  it("buildDockerCliEnv supplies a default PATH when host PATH is missing", () => {
    const env = buildDockerCliEnv({ JWT_SECRET: "nope" });
    assert.ok(env.PATH && env.PATH.includes("/usr/bin"));
    assert.equal(env.JWT_SECRET, undefined);
  });

  it("buildContainerEnv never pulls host secrets and applies overlay", () => {
    process.env.JWT_SECRET = "must-not-leak";
    const env = buildContainerEnv({ SKILL_FLAG: "1" });
    assert.equal(env.HOME, "/workspace");
    assert.equal(env.SKILL_FLAG, "1");
    assert.equal(env.JWT_SECRET, undefined);
    assert.ok(env.PATH);
  });

  it("sandbox spawn path source does not spread process.env", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve } = await import("node:path");
    const source = readFileSync(resolve("src/lib/skills/sandbox.ts"), "utf8");
    assert.ok(
      !source.includes("...process.env"),
      "sandbox must not spread process.env into docker spawn"
    );
    assert.ok(source.includes("buildDockerCliEnv"), "must use buildDockerCliEnv for docker CLI");
    assert.ok(source.includes("buildContainerEnv"), "must use buildContainerEnv for -e flags");
  });
});
