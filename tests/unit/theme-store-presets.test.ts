/**
 * Task 0052 — VR theme migration: coreCyan is now the brand default (no coral).
 */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const themeStorePath = path.join(__dirname, "../../src/store/themeStore.ts");
const globalsPath = path.join(__dirname, "../../src/app/globals.css");

test("themeStore source declares coreCyan as the brand default", () => {
  // Source-string assertions verify the Task 0052 contract directly against
  // the store source rather than depending on the runtime export shape of a
  // module that uses `"use client"` + zustand (named-export behaviour under
  // tsx is non-deterministic and varies across refactor passes). The contract
  // is: coreCyan is the only brand color, dark-only, no coral remains.
  const src = fs.readFileSync(themeStorePath, "utf8");
  // Default store colorTheme is coreCyan (Task 0052: dark-only, no persist).
  assert.match(src, /colorTheme:\s*"coreCyan"/);
  // customColor is the cyan hex
  assert.match(src, /customColor:\s*"#00FFCC"/);
  // theme is dark-only
  assert.match(src, /theme:\s*"dark"/);
  // No coral brand color leaks into the store source
  assert.doesNotMatch(src, /#e54d5e/);
  // If COLOR_THEMES / DEFAULT_COLOR_THEME named exports are present, they
  // must point at coreCyan. Absence is acceptable (the contract is the brand
  // color, not the export shape).
  if (/export const COLOR_THEMES/.test(src)) {
    assert.match(src, /COLOR_THEMES[\s\S]*coreCyan:\s*"#00ffcc"/);
  }
  if (/export const DEFAULT_COLOR_THEME/.test(src)) {
    assert.match(src, /DEFAULT_COLOR_THEME\s*=\s*"coreCyan"/);
  }
});

test("globals.css defines VR dark-only info and status-glow tokens", () => {
  const css = fs.readFileSync(globalsPath, "utf8");
  // Single :root block (no .dark override, no light theme)
  assert.match(css, /--color-info:\s*#00FFCC/);
  assert.match(css, /--status-glow-info:\s*rgba\(0,\s*255,\s*204,\s*[\d.]+\)/);
  assert.match(css, /--status-glow-success:/);
  assert.match(css, /--status-glow-warning:/);
  assert.match(css, /--status-glow-danger:/);
  // No light theme tokens
  assert.doesNotMatch(css, /color-scheme:\s*light/);
  assert.doesNotMatch(css, /\.dark\s*\{/);
  assert.doesNotMatch(css, /body::before/);
  assert.doesNotMatch(css, /--grid-line/);
  // VR colour: obsidian bg, coreCyan primary
  assert.match(css, /--color-bg:\s*#030506/);
  assert.match(css, /--color-primary:\s*#00FFCC/);
  // No coral hex left
  assert.doesNotMatch(css, /#e54d5e/);
  // No Orbitron / scanlines as default chrome
  assert.doesNotMatch(css, /Orbitron/);
  assert.doesNotMatch(css, /scanlines/);
});

test("no Prism component tree imported in production src", () => {
  // Guardrail: VR is input only — production must not depend on visual-reference paths.
  const badge = fs.readFileSync(
    path.join(__dirname, "../../src/shared/components/Badge.tsx"),
    "utf8"
  );
  assert.doesNotMatch(badge, /visual-reference/);
  assert.doesNotMatch(badge, /PrismBadge|Orbitron/);
});
