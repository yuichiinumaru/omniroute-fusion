/**
 * Task 0028 — status vocabulary mapping (VR micro-adoption → Badge/health tones).
 */
import test from "node:test";
import assert from "node:assert/strict";
import {
  STATUS_VOCABULARY,
  resolveStatusVocabulary,
  statusToBadgeVariant,
  statusSurfaceClasses,
  statusGlowClass,
  STATUS_TONE_ACCENT_CLASS,
} from "../../src/shared/constants/statusVocabulary.ts";

test("STATUS_VOCABULARY covers core health + circuit states", () => {
  for (const id of [
    "healthy",
    "degraded",
    "offline",
    "unknown",
    "info",
    "warning",
    "error",
    "circuit_open",
    "circuit_half_open",
    "circuit_closed",
  ]) {
    assert.ok(STATUS_VOCABULARY[id], `missing vocab entry: ${id}`);
    assert.equal(STATUS_VOCABULARY[id].id, id);
  }
});

test("resolveStatusVocabulary maps aliases used by health surfaces", () => {
  assert.equal(resolveStatusVocabulary("ok").id, "healthy");
  assert.equal(resolveStatusVocabulary("down").id, "offline");
  assert.equal(resolveStatusVocabulary("OPEN").id, "circuit_open");
  assert.equal(resolveStatusVocabulary("HALF_OPEN").id, "circuit_half_open");
  assert.equal(resolveStatusVocabulary("CLOSED").id, "circuit_closed");
  assert.equal(resolveStatusVocabulary("locked").id, "warning");
  assert.equal(resolveStatusVocabulary("idle").id, "disabled");
  assert.equal(resolveStatusVocabulary(null).id, "unknown");
  assert.equal(resolveStatusVocabulary("totally-made-up").id, "unknown");
});

test("statusToBadgeVariant aligns with Badge variants", () => {
  assert.equal(statusToBadgeVariant("healthy"), "success");
  assert.equal(statusToBadgeVariant("degraded"), "warning");
  assert.equal(statusToBadgeVariant("offline"), "error");
  assert.equal(statusToBadgeVariant("down"), "error");
  assert.equal(statusToBadgeVariant("unknown"), "default");
  assert.equal(statusToBadgeVariant("info"), "info");
  assert.equal(statusToBadgeVariant("OPEN"), "error");
  assert.equal(statusToBadgeVariant("HALF_OPEN"), "warning");
  assert.equal(statusToBadgeVariant("CLOSED"), "success");
});

test("glow is reserved for degraded/error/circuit open-ish states", () => {
  assert.equal(statusGlowClass("healthy"), "");
  assert.equal(statusGlowClass("unknown"), "");
  assert.ok(statusGlowClass("degraded").includes("shadow-"));
  assert.ok(statusGlowClass("error").includes("shadow-"));
  assert.ok(statusGlowClass("OPEN").includes("shadow-"));
  assert.equal(statusGlowClass("degraded", false), "");
});

test("statusSurfaceClasses combine bg + border + text utilities", () => {
  const classes = statusSurfaceClasses("degraded");
  assert.match(classes, /bg-amber/);
  assert.match(classes, /border-amber/);
  assert.match(classes, /text-amber/);
});

test("STATUS_TONE_ACCENT_CLASS covers every StatusTone", () => {
  for (const tone of ["success", "warning", "danger", "neutral", "info"] as const) {
    assert.ok(STATUS_TONE_ACCENT_CLASS[tone], tone);
  }
});
