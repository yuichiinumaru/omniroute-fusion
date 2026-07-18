/**
 * Task 0028 — status vocabulary mapping (VR micro-adoption → Badge/health tones).
 */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  STATUS_VOCABULARY,
  resolveStatusVocabulary,
  statusToBadgeVariant,
  statusSurfaceClasses,
  statusGlowClass,
  STATUS_TONE_ACCENT_CLASS,
} from "../../src/shared/constants/statusVocabulary.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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
  // Glow resolves via CSS utility class names; box-shadow lives in globals.css.
  assert.equal(statusGlowClass("degraded"), "status-glow-warning");
  assert.equal(statusGlowClass("error"), "status-glow-danger");
  assert.equal(statusGlowClass("OPEN"), "status-glow-danger");
  assert.equal(statusGlowClass("active"), "status-glow-info");
  assert.equal(statusGlowClass("degraded", false), "");
});

test("status-glow utilities are defined in globals.css with --status-glow-* tokens", () => {
  const css = fs.readFileSync(
    path.join(__dirname, "../../src/app/globals.css"),
    "utf8"
  );
  for (const name of ["success", "warning", "danger", "info"] as const) {
    assert.match(css, new RegExp(`--status-glow-${name}:`));
    assert.match(
      css,
      new RegExp(
        `\\.status-glow-${name}\\s*\\{[\\s\\S]*?box-shadow:\\s*0 0 8px var\\(--status-glow-${name}\\)`
      )
    );
  }
});

test("statusSurfaceClasses combine bg + border + text utilities", () => {
  const classes = statusSurfaceClasses("degraded");
  assert.match(classes, /bg-amber/);
  assert.match(classes, /border-amber/);
  assert.match(classes, /text-amber/);
});

test("warning-track statuses use amber chroma (not yellow)", () => {
  // Badge warning + ModelPill degraded/pending must share the amber track.
  for (const id of ["degraded", "warning", "pending", "circuit_half_open"] as const) {
    const surface = statusSurfaceClasses(id);
    assert.match(surface, /amber/, `${id} must use amber utilities`);
    assert.doesNotMatch(surface, /yellow/, `${id} must not use yellow utilities`);
  }
  assert.equal(STATUS_TONE_ACCENT_CLASS.warning, "bg-amber-500");
});

test("STATUS_TONE_ACCENT_CLASS covers every StatusTone", () => {
  for (const tone of ["success", "warning", "danger", "neutral", "info"] as const) {
    assert.ok(STATUS_TONE_ACCENT_CLASS[tone], tone);
  }
});

test("info / active surface classes use primary track (not legacy blue)", () => {
  for (const id of ["info", "active"] as const) {
    const surface = statusSurfaceClasses(id);
    assert.match(surface, /primary/, `${id} surface must use primary utilities`);
    assert.doesNotMatch(surface, /blue-/, `${id} surface must not use blue-* utilities`);
    assert.equal(resolveStatusVocabulary(id).badgeVariant, "info");
  }
  assert.equal(STATUS_TONE_ACCENT_CLASS.info, "bg-primary");
});
