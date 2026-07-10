/**
 * Epic 0005 S6 / Task 0025 — seven operational pillars + role presets.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  OPERATIONAL_PILLAR_SECTION_IDS,
  SIDEBAR_SECTIONS,
  SIDEBAR_PRESETS,
  COMPRESSION_ENGINE_SIDEBAR_IDS,
  COMPRESSION_CONTEXT_GROUP,
  ANALYTICS_DUAL_NAV_SIDEBAR_IDS,
  HIDEABLE_SIDEBAR_ITEM_IDS,
  getSectionItems,
  countPresetVisibleLeaves,
  type SidebarSectionId,
} from "../../../src/shared/constants/sidebarVisibility";
import { OBSERVE_STREAM_SIDEBAR_IDS } from "../../../src/shared/constants/observeHub";

describe("SIDEBAR_SECTIONS — seven operational pillars", () => {
  it("exports exactly 7 operational pillar section ids", () => {
    assert.equal(OPERATIONAL_PILLAR_SECTION_IDS.length, 7);
    assert.deepEqual([...OPERATIONAL_PILLAR_SECTION_IDS], [
      "core-pulse",
      "registry",
      "routing",
      "governance",
      "operations",
      "observability",
      "system",
    ]);
  });

  it("includes each pillar in SIDEBAR_SECTIONS in order", () => {
    const ids = SIDEBAR_SECTIONS.map((s) => s.id);
    for (const pillar of OPERATIONAL_PILLAR_SECTION_IDS) {
      assert.ok(ids.includes(pillar), `missing pillar ${pillar}`);
    }
    const pillarPositions = OPERATIONAL_PILLAR_SECTION_IDS.map((id) => ids.indexOf(id));
    for (let i = 1; i < pillarPositions.length; i += 1) {
      assert.ok(
        pillarPositions[i]! > pillarPositions[i - 1]!,
        "pillars must appear in canonical order"
      );
    }
  });

  it("product sections ≤ 8 (7 pillars + help; devtools is debug-only)", () => {
    const product = SIDEBAR_SECTIONS.filter((s) => s.visibility !== "debug");
    assert.ok(product.length <= 8, `product sections=${product.length}`);
    assert.ok(
      product.every((s) =>
        ([...OPERATIONAL_PILLAR_SECTION_IDS, "help"] as SidebarSectionId[]).includes(s.id)
      ),
      "non-debug sections must be pillars or help"
    );
  });

  it("devtools remains debug visibility", () => {
    const dev = SIDEBAR_SECTIONS.find((s) => s.id === "devtools");
    assert.ok(dev);
    assert.equal(dev.visibility, "debug");
  });
});

describe("fusions under Routing & Strategy", () => {
  const routing = SIDEBAR_SECTIONS.find((s) => s.id === "routing");
  assert.ok(routing, "routing pillar missing");

  it("places fusions in routing section", () => {
    const ids = getSectionItems(routing).map((i) => i.id);
    assert.ok(ids.includes("fusions"), "fusions must be under routing");
    assert.ok(ids.includes("combos"), "combos under routing");
    assert.ok(ids.includes("combos-live"), "combos-live under routing");
  });

  it("fusions is not a free-floating peer section", () => {
    assert.equal(
      SIDEBAR_SECTIONS.filter((s) => s.id === ("fusions" as SidebarSectionId)).length,
      0
    );
  });

  it("fusions appears only once in default tree", () => {
    const all = SIDEBAR_SECTIONS.flatMap((s) => getSectionItems(s).map((i) => i.id));
    assert.equal(all.filter((id) => id === "fusions").length, 1);
  });
});

describe("compression engines = 0 sidebar leaves", () => {
  const defaultLeafIds = SIDEBAR_SECTIONS.flatMap((s) => getSectionItems(s).map((i) => i.id));

  for (const id of COMPRESSION_ENGINE_SIDEBAR_IDS) {
    it(`does not list engine leaf "${id}"`, () => {
      assert.ok(!defaultLeafIds.includes(id));
    });
    it(`still hideable for prefs: "${id}"`, () => {
      assert.ok((HIDEABLE_SIDEBAR_ITEM_IDS as readonly string[]).includes(id));
    });
  }

  it("compression hub is settings + combos + studio only", () => {
    assert.deepEqual(
      COMPRESSION_CONTEXT_GROUP.items.map((i) => i.id),
      ["context-settings", "context-combos", "compression-studio"]
    );
  });

  it("routing hosts compression hub group", () => {
    const routing = SIDEBAR_SECTIONS.find((s) => s.id === "routing");
    assert.ok(routing);
    const groups = routing.children.filter(
      (c): c is { type: "group"; id: string } => "type" in c && c.type === "group"
    );
    assert.ok(groups.some((g) => g.id === "compression-context"));
  });
});

describe("observe hub not re-expanded", () => {
  const observability = SIDEBAR_SECTIONS.find((s) => s.id === "observability");
  assert.ok(observability, "observability pillar missing");
  const leafIds = getSectionItems(observability).map((i) => i.id);

  it("includes activity hub leaf", () => {
    assert.ok(leafIds.includes("activity"));
  });

  for (const id of OBSERVE_STREAM_SIDEBAR_IDS) {
    it(`does not list collapsed stream leaf "${id}"`, () => {
      assert.ok(!leafIds.includes(id as (typeof leafIds)[number]));
    });
  }

  it("does not reintroduce logs/audit groups", () => {
    const groupIds = observability.children
      .filter((c): c is { type: "group"; id: string } => "type" in c && c.type === "group")
      .map((g) => g.id);
    assert.ok(!groupIds.includes("logs"));
    assert.ok(!groupIds.includes("audit"));
  });

  it("analytics dual-nav leaves stay collapsed", () => {
    for (const id of ANALYTICS_DUAL_NAV_SIDEBAR_IDS) {
      assert.ok(!leafIds.includes(id as (typeof leafIds)[number]));
    }
  });
});

describe("role presets", () => {
  it("minimal visible leaves ≤ 12", () => {
    const n = countPresetVisibleLeaves("minimal");
    assert.ok(n <= 12, `minimal visible leaves=${n} (max 12)`);
    assert.ok(n >= 1, "minimal must show something");
  });

  it("minimal shown set is exactly 12 or fewer hideable ids that exist in tree", () => {
    const minimal = SIDEBAR_PRESETS.find((p) => p.id === "minimal");
    assert.ok(minimal);
    const hidden = new Set(minimal.hiddenItems);
    const defaultLeaves = new Set(
      SIDEBAR_SECTIONS.flatMap((s) => getSectionItems(s).map((i) => i.id))
    );
    const visible = [...defaultLeaves].filter((id) => !hidden.has(id));
    assert.ok(visible.length <= 12, `visible=${visible.length}: ${visible.join(",")}`);
  });

  it("all presets exist and all is empty hidden", () => {
    const ids = SIDEBAR_PRESETS.map((p) => p.id);
    assert.deepEqual(ids, ["all", "minimal", "developer", "admin"]);
    assert.deepEqual(SIDEBAR_PRESETS.find((p) => p.id === "all")?.hiddenItems, []);
  });
});

describe("pillar placement smoke", () => {
  function sectionLeafIds(id: SidebarSectionId): string[] {
    const section = SIDEBAR_SECTIONS.find((s) => s.id === id);
    assert.ok(section, id);
    return getSectionItems(section).map((i) => i.id);
  }

  it("core-pulse has home + health", () => {
    assert.deepEqual(sectionLeafIds("core-pulse"), ["home", "health"]);
  });

  it("registry has providers + exposures (endpoints/mcp/a2a)", () => {
    const ids = sectionLeafIds("registry");
    for (const id of ["providers", "embedded-services", "endpoints", "mcp", "a2a", "webhooks"]) {
      assert.ok(ids.includes(id), id);
    }
    assert.ok(!ids.includes("api-endpoints"), "api-endpoints must stay retired as leaf");
  });

  it("governance has keys + costs + quota", () => {
    const ids = sectionLeafIds("governance");
    for (const id of ["api-manager", "quota", "costs", "settings-security"]) {
      assert.ok(ids.includes(id), id);
    }
  });

  it("operations has tools + batch", () => {
    const ids = sectionLeafIds("operations");
    for (const id of ["cli-code", "batch", "memory", "plugins"]) {
      assert.ok(ids.includes(id), id);
    }
  });

  it("system has settings + proxy (not security/routing keys)", () => {
    const ids = sectionLeafIds("system");
    assert.ok(ids.includes("settings-general"));
    assert.ok(ids.includes("proxy"));
    assert.ok(!ids.includes("settings-security"));
    assert.ok(!ids.includes("settings-routing"));
    assert.ok(!ids.includes("api-manager"));
  });
});
