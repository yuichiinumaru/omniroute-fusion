/**
 * Task 0099 / EPIC-20 T20-N — Retire Testing hub; Ops cards → topbar deep links.
 * `/dashboard/testing` → Labs; palette Labs/Media/Integrations; no Testing product home.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import {
  PRIMARY_SIDEBAR_ITEM_IDS,
  PRIMARY_SIDEBAR_ITEMS,
  HIDEABLE_SIDEBAR_ITEM_IDS,
  SIDEBAR_SECTIONS,
  getSectionItems,
} from "../../../src/shared/constants/sidebarVisibility";
import {
  OPERATIONS_HUB_GROUPS,
  OPERATIONS_HUB_HREFS,
} from "../../../src/shared/constants/operationsHub";
import {
  TESTING_HUB_CANONICAL_PATH,
  TESTING_HUB_GROUPS,
  TESTING_HUB_HREFS,
  TESTING_HUB_LEGACY_HREFS,
} from "../../../src/shared/constants/testingHub";
import {
  OPERATIONS_REDIRECT_MATRIX,
  OPERATIONS_TOPBAR_IDS,
  buildOperationsPath,
  EPIC20_FORBIDDEN_PRIMARY_LEAF_IDS,
} from "../../../src/shared/constants/epic20Operations";

const ROOT = join(import.meta.dirname, "../../..");

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8");
}

function exists(rel: string): boolean {
  return existsSync(join(ROOT, rel));
}

const LABS = buildOperationsPath("labs");
const MEDIA = buildOperationsPath("media");
const INTEGRATIONS = buildOperationsPath("integrations");

describe("0099 — Testing hub redirect → Labs", () => {
  it("matrix row /dashboard/testing → labs (not media)", () => {
    const row = OPERATIONS_REDIRECT_MATRIX.find((e) => e.from === "/dashboard/testing");
    assert.ok(row, "matrix must include /dashboard/testing");
    assert.equal(row!.to, LABS);
    assert.equal(row!.ownerTask, "0099");
    assert.equal(row!.to, TESTING_HUB_CANONICAL_PATH);
    assert.notEqual(row!.to, MEDIA);
  });

  it("testing page is server redirect shell to TESTING_HUB_CANONICAL_PATH", () => {
    const page = read("src/app/(dashboard)/dashboard/testing/page.tsx");
    assert.equal(page.includes('"use client"'), false, "must be server component");
    assert.ok(page.includes("redirect("));
    assert.ok(
      page.includes("TESTING_HUB_CANONICAL_PATH") || page.includes('buildOperationsPath("labs")'),
      "redirect must use Labs SSoT"
    );
    assert.equal(
      page.includes("TestingHubClient"),
      false,
      "redirect shell must not mount TestingHubClient launchpad"
    );
  });

  it("TestingHubClient is deprecated archive stub (not product launchpad)", () => {
    const client = read("src/app/(dashboard)/dashboard/testing/TestingHubClient.tsx");
    assert.ok(/@deprecated|RETIRED|retired/i.test(client));
    assert.equal(
      client.includes("data-testid=\"testing-hub\""),
      false,
      "must not re-render living testing-hub grid"
    );
  });
});

describe("0099 — Ops hub deep links Labs + Media; no Testing card", () => {
  it("OPERATIONS_HUB includes Labs + Media topbar paths", () => {
    assert.ok(
      OPERATIONS_HUB_HREFS.includes(LABS) || OPERATIONS_HUB_HREFS.includes("/operations/labs"),
      "Ops hub must deep-link Labs"
    );
    assert.ok(
      OPERATIONS_HUB_HREFS.includes(MEDIA) || OPERATIONS_HUB_HREFS.includes("/operations/media"),
      "Ops hub must deep-link Media"
    );

    const integrations = OPERATIONS_HUB_GROUPS.find((g) => g.id === "integrations");
    assert.ok(integrations);
    const labs = integrations!.links.find((l) => l.id === "labs");
    const media = integrations!.links.find((l) => l.id === "media");
    assert.ok(labs, "integrations must include labs card");
    assert.ok(media, "integrations must include media card");
    assert.equal(labs!.href, LABS);
    assert.equal(media!.href, MEDIA);
  });

  it("OPERATIONS_HUB has no Testing card / /dashboard/testing href", () => {
    assert.equal(
      OPERATIONS_HUB_HREFS.includes("/dashboard/testing"),
      false,
      "Ops hub must not deep-link retired Testing hub"
    );
    for (const group of OPERATIONS_HUB_GROUPS) {
      assert.equal(
        group.links.some((l) => l.id === "testing"),
        false,
        `${group.id} must not include testing card`
      );
    }
  });

  it("Ops hub cards use /operations/* builders — no residual Testing-era islands", () => {
    const legacyIslands = [
      "/dashboard/testing",
      "/dashboard/playground",
      "/dashboard/cache/media",
      "/dashboard/tools/traffic-inspector",
    ];
    for (const href of OPERATIONS_HUB_HREFS) {
      const pathOnly = href.split("?")[0].split("#")[0];
      for (const bad of legacyIslands) {
        assert.equal(
          pathOnly === bad || pathOnly.startsWith(`${bad}/`),
          false,
          `Ops card must not deep-link legacy island ${bad} (got ${href})`
        );
      }
      // Prefer Ops topbar paths (or Observe-free /operations)
      assert.ok(
        pathOnly.startsWith("/operations"),
        `Ops card href should be Ops peer path, got ${href}`
      );
    }
  });

  it("Traffic Inspector still absent from Ops discovery", () => {
    assert.equal(
      OPERATIONS_HUB_HREFS.includes("/dashboard/tools/traffic-inspector"),
      false
    );
    assert.equal(
      OPERATIONS_HUB_HREFS.some((h) => h.includes("panel=traffic")),
      false
    );
  });
});

describe("0099 — CommandPalette → Ops canonical paths", () => {
  it("palette lab destinations use buildOperationsPath (labs/media/integrations)", () => {
    const src = read("src/shared/components/CommandPalette.tsx");
    assert.ok(src.includes("testingHubExtras"));
    assert.ok(src.includes('buildOperationsPath("labs")'));
    assert.ok(src.includes('buildOperationsPath("media")'));
    assert.ok(src.includes('buildOperationsPath("integrations")'));

    // Must not teach Testing as a living destination path
    assert.equal(
      src.includes('href: "/dashboard/testing"'),
      false,
      "palette must not link /dashboard/testing as product home"
    );
    assert.equal(src.includes('href: "/dashboard/playground"'), false);
    assert.equal(src.includes('href: "/dashboard/translator"'), false);
    assert.equal(src.includes('href: "/dashboard/search-tools"'), false);
    assert.equal(src.includes('href: "/dashboard/batch"'), false);
    assert.equal(src.includes('href: "/dashboard/cache/media"'), false);
    assert.equal(src.includes('href: "/dashboard/plugins"'), false);
  });
});

describe("0099 — absorb inventory + anti-leaf", () => {
  it("TESTING_HUB absorb map points at Ops Labs/Media/Integrations", () => {
    assert.equal(TESTING_HUB_CANONICAL_PATH, LABS);
    assert.ok(TESTING_HUB_HREFS.includes(LABS));
    assert.ok(TESTING_HUB_HREFS.includes(MEDIA));
    assert.ok(TESTING_HUB_HREFS.includes(INTEGRATIONS));

    const interactive = TESTING_HUB_GROUPS.find((g) => g.id === "interactive");
    assert.ok(interactive);
    for (const id of ["playground", "translator", "search-tools"] as const) {
      const link = interactive!.links.find((l) => l.id === id);
      assert.ok(link);
      assert.equal(link!.href, LABS);
      assert.equal(link!.isLab, true);
    }
    const media = TESTING_HUB_GROUPS.flatMap((g) => g.links).find((l) => l.id === "media");
    assert.ok(media);
    assert.equal(media!.href, MEDIA);
    const plugins = TESTING_HUB_GROUPS.flatMap((g) => g.links).find((l) => l.id === "plugins");
    assert.ok(plugins);
    assert.equal(plugins!.href, INTEGRATIONS);
  });

  it("legacy testing hrefs still listed for redirect-matrix archive", () => {
    assert.ok(TESTING_HUB_LEGACY_HREFS.includes("/dashboard/testing"));
    assert.ok(TESTING_HUB_LEGACY_HREFS.includes("/dashboard/playground"));
    assert.ok(TESTING_HUB_LEGACY_HREFS.includes("/dashboard/cache/media"));
    for (const from of TESTING_HUB_LEGACY_HREFS) {
      assert.ok(
        OPERATIONS_REDIRECT_MATRIX.some((r) => r.from === from),
        `matrix missing legacy from=${from}`
      );
    }
  });

  it("labs/media/testing are not primary leaves; DEVTOOLS stays empty", () => {
    assert.equal(PRIMARY_SIDEBAR_ITEMS.length, 7);
    for (const id of ["testing", "labs", "media", "playground", "translator", "search-tools"] as const) {
      assert.equal(
        PRIMARY_SIDEBAR_ITEM_IDS.includes(id as never),
        false,
        `${id} must not be primary leaf`
      );
    }
    for (const id of EPIC20_FORBIDDEN_PRIMARY_LEAF_IDS) {
      if (id === "endpoints" || id === "agents") continue; // not leaf ids on primary
      assert.equal(
        PRIMARY_SIDEBAR_ITEM_IDS.includes(id as never),
        false,
        `EPIC20 forbidden primary leak: ${id}`
      );
    }
    assert.ok((HIDEABLE_SIDEBAR_ITEM_IDS as readonly string[]).includes("testing"));

    const sidebar = read("src/shared/constants/sidebarVisibility.ts");
    const devtoolsBlock = sidebar.match(
      /const DEVTOOLS_ITEMS: readonly SidebarItemDefinition\[\] = \[([\s\S]*?)\];/
    );
    assert.ok(devtoolsBlock);
    assert.equal(devtoolsBlock![1].trim(), "", "DEVTOOLS_ITEMS must stay empty");

    const devtools = SIDEBAR_SECTIONS.find((s) => s.id === "devtools");
    assert.ok(devtools);
    assert.equal(getSectionItems(devtools!).length, 0);
  });

  it("Labs + Media are Ops topbar peers (not invented pages)", () => {
    assert.ok(OPERATIONS_TOPBAR_IDS.includes("labs"));
    assert.ok(OPERATIONS_TOPBAR_IDS.includes("media"));
    assert.equal(exists("src/app/(dashboard)/operations/labs/page.tsx"), true);
    assert.equal(exists("src/app/(dashboard)/operations/media/page.tsx"), true);
  });
});

describe("0099 — UI.md policy", () => {
  it("documents Testing absorb into Ops Labs/Media", () => {
    const ui = read("docs/guides/UI.md");
    assert.ok(/0099|EPIC-20/i.test(ui));
    assert.ok(
      /retired|absorb/i.test(ui) && /labs/i.test(ui),
      "UI.md must state Testing retired / absorbed into Labs"
    );
    assert.ok(
      /\/operations\/labs|buildOperationsPath\("labs"\)|Operations topbar.*Labs/i.test(ui),
      "UI.md must point discovery at Ops Labs"
    );
    // Must not keep Operations → Testing as living product home without retire note
    assert.ok(
      /Testing hub \(retired\)|Testing.*retired|no longer a living hub/i.test(ui),
      "UI.md must mark Testing as retired"
    );
  });
});
