/**
 * Task 0055 — dark-only readability guards (inputs + primary contrast).
 */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "../..");

function readSrc(rel: string): string {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

test("shared Input/Textarea default to dark surfaces (no solid bg-white base)", () => {
  const input = readSrc("src/shared/components/Input.tsx");
  const textarea = readSrc("src/shared/components/Textarea.tsx");
  assert.match(input, /bg-white\/5/);
  assert.match(textarea, /bg-white\/5/);
  // Base class must not be bare solid bg-white (toggle knobs elsewhere may keep it).
  assert.doesNotMatch(input, /["'`]bg-white\s/);
  assert.doesNotMatch(textarea, /["'`]bg-white\s/);
});

test("shared Button primary/accent use on-primary text (not white-on-cyan)", () => {
  const button = readSrc("src/shared/components/Button.tsx");
  assert.match(button, /text-primary-foreground/);
  assert.match(button, /text-accent-foreground/);
  // Primary/accent solid fills must not pair with text-white under cyan brand.
  assert.doesNotMatch(
    button,
    /primary:\s*["'`][^"'`]*text-white/
  );
  assert.doesNotMatch(
    button,
    /accent:\s*["'`][^"'`]*text-white/
  );
});

test("layout + themeStore force .dark on html for Tailwind dark: variants", () => {
  const layout = readSrc("src/app/layout.tsx");
  const themeStore = readSrc("src/store/themeStore.ts");
  assert.match(layout, /className=["']dark["']/);
  assert.match(themeStore, /classList\.add\(\s*["']dark["']\s*\)/);
});

test("FeatureFlagCard badges use tinted dark surfaces + light text", () => {
  const card = readSrc(
    "src/app/(dashboard)/dashboard/settings/components/FeatureFlagCard.tsx"
  );
  assert.match(card, /bg-red-500\/15/);
  assert.match(card, /text-red-300/);
  // No pastel solid white/light badge shells for category chips.
  assert.doesNotMatch(card, /bg-red-100/);
  assert.doesNotMatch(card, /bg-emerald-300/);
  assert.doesNotMatch(card, /bg-slate-300/);
  // Toggle knob may keep solid bg-white (indicator only — not a text contrast issue).
  assert.match(card, /rounded-full bg-white shadow/);
});

test("SetupWizard primary CTAs avoid white-on-cyan; Done uses dark emerald", () => {
  const wizard = readSrc(
    "src/app/(dashboard)/dashboard/tools/agent-bridge/components/SetupWizard.tsx"
  );
  assert.doesNotMatch(wizard, /bg-primary\s+text-white/);
  assert.match(wizard, /text-primary-foreground/);
  assert.match(wizard, /bg-emerald-700/);
  // Active step indicator uses Routing-style tint, not solid primary+white.
  assert.match(wizard, /border-primary\/20 bg-primary\/10 text-primary/);
});

test("no light emerald/teal/green-4xx + text-white button fills in src/", () => {
  // Bounded scan of high-traffic dashboard + shared UI (not every test fixture).
  const dirs = [
    "src/shared/components",
    "src/app/(dashboard)/dashboard/providers",
    "src/app/(dashboard)/dashboard/tools/agent-bridge",
    "src/app/(dashboard)/dashboard/settings/components",
  ];
  const bad = /bg-(?:emerald|teal|green)-[34]\d{2}[^"'`\n]*text-white|text-white[^"'`\n]*bg-(?:emerald|teal|green)-[34]\d{2}/;
  for (const dir of dirs) {
    const abs = path.join(root, dir);
    if (!fs.existsSync(abs)) continue;
    const walk = (d: string): void => {
      for (const ent of fs.readdirSync(d, { withFileTypes: true })) {
        const p = path.join(d, ent.name);
        if (ent.isDirectory()) {
          walk(p);
          continue;
        }
        if (!/\.(tsx|ts|jsx|js)$/.test(ent.name)) continue;
        const src = fs.readFileSync(p, "utf8");
        assert.doesNotMatch(
          src,
          bad,
          `light green/teal + text-white in ${path.relative(root, p)}`
        );
      }
    };
    walk(abs);
  }
});

test("globals + themeStore pin on-primary obsidian tokens (never white-on-cyan)", () => {
  const css = readSrc("src/app/globals.css");
  const themeStore = readSrc("src/store/themeStore.ts");
  assert.match(css, /--color-primary-foreground:\s*#030506/);
  assert.match(css, /--color-accent-foreground:\s*#030506/);
  assert.match(css, /--color-primary-foreground:\s*var\(--color-primary-foreground\)/);
  // Runtime re-assert so stale inline styles cannot leave white-on-cyan.
  assert.match(themeStore, /setProperty\(\s*["']--color-primary-foreground["']\s*,\s*["']#030506["']/);
  assert.match(themeStore, /setProperty\(\s*["']--color-accent-foreground["']\s*,\s*["']#030506["']/);
});

test("ModelRoutingSection mapping cards use dark-only surfaces (no light-first bg-white/70)", () => {
  const src = readSrc("src/shared/components/ModelRoutingSection.tsx");
  // Path-to-100 I2: enabled/disabled cards must not flash solid light panels if `.dark` is absent.
  assert.doesNotMatch(src, /bg-white\/70/);
  assert.doesNotMatch(src, /bg-white dark:/);
  assert.match(src, /bg-white\/\[0\.02\]/);
  assert.match(src, /text-amber-300/);
});

test("no bg-primary + text-white class co-location in production src/", () => {
  // Path-to-100 guard: solid cyan fills must use text-primary-foreground (obsidian).
  // Scans class-string co-location on the same line / same quoted segment.
  const dirs = ["src/app", "src/shared"];
  const bad = /bg-primary(?:\/[0-9]+)?[^"'`\n]*\btext-white\b|\btext-white\b[^"'`\n]*bg-primary(?:\/[0-9]+)?/;
  // Allow intentional non-fill uses? None — even focus:bg-primary focus:text-white is a fail.
  const walk = (d: string): void => {
    if (!fs.existsSync(d)) return;
    for (const ent of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, ent.name);
      if (ent.isDirectory()) {
        walk(p);
        continue;
      }
      if (!/\.(tsx|ts)$/.test(ent.name)) continue;
      const src = fs.readFileSync(p, "utf8");
      assert.doesNotMatch(
        src,
        bad,
        `bg-primary + text-white in ${path.relative(root, p)} — use text-primary-foreground`
      );
    }
  };
  for (const dir of dirs) walk(path.join(root, dir));
});
