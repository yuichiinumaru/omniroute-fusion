/**
 * Task 0028 — optional coreCyan primary preset must not replace coral brand SSoT.
 */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const themeStorePath = path.join(__dirname, "../../src/store/themeStore.ts");
const appearancePath = path.join(
  __dirname,
  "../../src/app/(dashboard)/dashboard/settings/components/AppearanceTab.tsx"
);
const globalsPath = path.join(__dirname, "../../src/app/globals.css");

test("COLOR_THEMES keeps coral as brand default and adds coreCyan #00FFCC", async () => {
  const mod = await import("../../src/store/themeStore.ts");
  assert.equal(mod.COLOR_THEMES.coral, "#e54d5e");
  assert.equal(mod.DEFAULT_COLOR_THEME, "coral");
  assert.equal(mod.COLOR_THEMES.coreCyan, "#00ffcc");
  // Existing cyan preset remains (not overwritten by VR core cyan).
  assert.equal(mod.COLOR_THEMES.cyan, "#06b6d4");
  // Default store colorTheme is coral (read source — persist may rehydrate in browser).
  const src = fs.readFileSync(themeStorePath, "utf8");
  assert.match(src, /colorTheme:\s*"coral"/);
});

test("AppearanceTab exposes coreCyan as optional preset swatch", () => {
  const src = fs.readFileSync(appearancePath, "utf8");
  assert.match(src, /id:\s*"coreCyan"/);
  assert.match(src, /COLOR_THEMES\.coreCyan/);
  // Must not change the default primary away from coral brand.
  assert.doesNotMatch(src, /defaultColorTheme:\s*"coreCyan"/);
});

test("globals.css defines light + dark info and status-glow tokens", () => {
  const css = fs.readFileSync(globalsPath, "utf8");
  // light (:root)
  assert.match(css, /--color-info:\s*#3b82f6/);
  assert.match(css, /--status-glow-success:/);
  assert.match(css, /--status-glow-warning:/);
  assert.match(css, /--status-glow-danger:/);
  assert.match(css, /--status-glow-info:/);
  // dark overrides
  assert.match(css, /\.dark\s*\{[\s\S]*--color-info:\s*#60a5fa/);
  assert.match(css, /\.dark\s*\{[\s\S]*--status-glow-success:/);
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
