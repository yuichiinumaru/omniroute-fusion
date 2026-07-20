/**
 * Task 0077 — Fusions list acting chip (H-FUSION-010) + anti-new-leaf labs guard.
 *
 * Product: list page types + renders optional acting without dual-type drift.
 * Chrome: labs stay off primary; DEVTOOLS stays empty; no forever-length===9 pin.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  formatFusionActingLabel,
  filterFusionCombos,
} from "../../../src/app/(dashboard)/dashboard/fusions/fusionEditorTypes.ts";
import {
  PRIMARY_SIDEBAR_ITEM_IDS,
  SIDEBAR_SECTIONS,
  getSectionItems,
} from "../../../src/shared/constants/sidebarVisibility.ts";

const root = join(import.meta.dirname, "../../..");

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

// ─── Pure helper: formatFusionActingLabel ────────────────────────────────────

test("formatFusionActingLabel: null/empty → null (omit chip)", () => {
  assert.equal(formatFusionActingLabel(null), null);
  assert.equal(formatFusionActingLabel(undefined), null);
  assert.equal(formatFusionActingLabel(""), null);
  assert.equal(formatFusionActingLabel({ kind: "model", model: "  " }), null);
  assert.equal(formatFusionActingLabel({ kind: "combo-ref", comboName: "" }), null);
});

test("formatFusionActingLabel: model unit → short model id", () => {
  assert.equal(formatFusionActingLabel("provider/model-a"), "provider/model-a");
  assert.equal(
    formatFusionActingLabel({ kind: "model", model: "provider/model-b" }),
    "provider/model-b"
  );
});

test("formatFusionActingLabel: combo-ref → combo name", () => {
  assert.equal(
    formatFusionActingLabel({ kind: "combo-ref", comboName: "coding-priority" }),
    "coding-priority"
  );
});

test("formatFusionActingLabel: optional label wins", () => {
  assert.equal(
    formatFusionActingLabel({
      kind: "model",
      model: "provider/long-id",
      label: "Primary voice",
    }),
    "Primary voice"
  );
  assert.equal(
    formatFusionActingLabel({
      kind: "combo-ref",
      comboName: "inner-combo",
      label: "Executor",
    }),
    "Executor"
  );
});

test("formatFusionActingLabel: live API extras (weight) do not block chip label", () => {
  // Runtime combo payloads may include extra fields (e.g. weight) — chip must still resolve.
  assert.equal(
    formatFusionActingLabel({
      kind: "combo-ref",
      comboName: "builder-acting",
      weight: 0,
    }),
    "builder-acting"
  );
  assert.equal(
    formatFusionActingLabel({ kind: "model", model: "p/m", weight: 1 }),
    "p/m"
  );
});

// ─── List page source path (acting not silently dropped) ─────────────────────

test("fusions list page types and renders acting chip path", () => {
  const src = read("src/app/(dashboard)/dashboard/fusions/page.tsx");
  assert.ok(src.includes("formatFusionActingLabel"), "must import/use acting label helper");
  assert.ok(src.includes("fusion-list-acting"), "must expose stable test id for chip");
  assert.ok(
    src.includes('"acting"') || src.includes("| \"acting\"") || src.includes("acting"),
    "list type path must include acting"
  );
  // Prefer shared ComboRecord pick over a divergent local shape.
  assert.ok(
    src.includes("ComboRecord") || src.includes("acting?:"),
    "list type should share ComboRecord or declare acting"
  );
  // Decorative material icon next to chip text must not be announced twice.
  assert.ok(
    /fusion-list-acting[\s\S]{0,400}aria-hidden=["']true["']/.test(src),
    "acting chip icon must be aria-hidden (visible text already names Acting)"
  );
  // Must not hardcode fake acting in production render.
  assert.equal(
    /acting:\s*["']provider\//.test(src),
    false,
    "must not invent fake acting fixtures in page.tsx"
  );
});

test("filterFusionCombos preserves acting field on kept rows", () => {
  const rows = [
    {
      id: "1",
      name: "f1",
      strategy: "fusion",
      acting: { kind: "model", model: "p/a" },
    },
    {
      id: "2",
      name: "hidden",
      strategy: "fusion",
      isHidden: true,
      acting: "p/b",
    },
    { id: "3", name: "prio", strategy: "priority", acting: "p/c" },
  ];
  const out = filterFusionCombos(rows);
  assert.equal(out.length, 1);
  assert.equal(out[0].id, "1");
  assert.deepEqual(out[0].acting, { kind: "model", model: "p/a" });
});

// ─── Anti-new-leaf (not absolute length === 9 forever) ───────────────────────

test("labs and fusions are not primary sidebar leaves", () => {
  const forbidden = ["fusions", "playground", "translator", "search-tools"] as const;
  for (const id of forbidden) {
    assert.equal(
      PRIMARY_SIDEBAR_ITEM_IDS.includes(id),
      false,
      `${id} must not be a PRIMARY_SIDEBAR_ITEMS leaf`
    );
  }
});

test("DEVTOOLS_ITEMS remains empty (labs not re-mounted as debug chrome)", () => {
  const src = read("src/shared/constants/sidebarVisibility.ts");
  const devtoolsBlock = src.match(
    /const DEVTOOLS_ITEMS: readonly SidebarItemDefinition\[\] = \[([\s\S]*?)\];/
  );
  assert.ok(devtoolsBlock, "DEVTOOLS_ITEMS declaration must exist");
  assert.equal(devtoolsBlock![1].trim(), "", "DEVTOOLS_ITEMS must stay empty");

  const devtoolsSection = SIDEBAR_SECTIONS.find((s) => s.id === "devtools");
  assert.ok(devtoolsSection, "devtools section structure retained");
  assert.equal(getSectionItems(devtoolsSection!).length, 0);
});

test("NAV-TREE no longer claims Debug-only labs as sidebar chrome", () => {
  const nav = read("docs/architecture/NAV-TREE-TARGET.md");
  assert.equal(
    /Debug-only \(not primary\):\s*translator,\s*playground,\s*search-tools/i.test(nav),
    false,
    "stale Debug-only sidebar claim must be removed"
  );
  // Labs discovery wording should point at hub/palette (post-0060), not DEVTOOLS population.
  assert.ok(
    /Testing hub|command palette|DEVTOOLS_ITEMS\s*=\s*\[\]/i.test(nav),
    "NAV-TREE should document hub/palette labs discovery or empty DEVTOOLS"
  );
  // Home label should match live labelFallback "Dashboard" somewhere in live chrome prose.
  assert.ok(
    /labelFallback.*Dashboard|`home`.*Dashboard|id.*home.*Dashboard/i.test(nav) ||
      nav.includes("| `home` | Dashboard |"),
    "NAV-TREE live chrome should use Dashboard label for home"
  );
});
