/**
 * Flat primary nav naming — labels resolve in en.sidebar; debt renames preserved in en.json.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  PRIMARY_SIDEBAR_ITEMS,
  SIDEBAR_SECTIONS,
  getSectionItems,
} from "../../../src/shared/constants/sidebarVisibility";

const enPath = path.resolve(process.cwd(), "src/i18n/messages/en.json");
const en = JSON.parse(fs.readFileSync(enPath, "utf-8")) as {
  sidebar: Record<string, string>;
  header: Record<string, string>;
};

describe("flat primary sidebar naming", () => {
  it("Analytics is not labeled Usage", () => {
    assert.equal(en.sidebar.analytics, "Analytics");
    assert.equal(en.sidebar.usage, "Usage");
    assert.notEqual(en.sidebar.usage, en.sidebar.analytics);
    assert.notEqual(en.sidebar.usageSubtitle, en.sidebar.analyticsSubtitle);
    assert.match(en.sidebar.analyticsSubtitle, /charts|evals|utilization/i);
    assert.match(en.sidebar.usageSubtitle, /token|request/i);
  });

  it("Analytics is not a primary leaf; en labels stay distinct from Usage (EPIC-19 / 0082)", () => {
    const analytics = PRIMARY_SIDEBAR_ITEMS.find((i) => i.id === "analytics");
    assert.equal(analytics, undefined, "analytics must not be a primary leaf after 0082");
    // i18n vocabulary for palette/deep links still distinguishes Analytics vs Usage
    assert.equal(en.sidebar.analytics, "Analytics");
    assert.doesNotMatch(en.sidebar.analyticsSubtitle ?? "", /^Usage\b/i);
    assert.doesNotMatch(en.sidebar.analyticsDashboardSubtitle ?? "", /^Usage\b/i);
  });

  it("primary hubs use clear operator labels", () => {
    assert.equal(en.sidebar.routingNav, "Routing");
    assert.equal(en.sidebar.apiKeysNav, "API Keys");
    assert.equal(en.sidebar.observeNav, "Observe");
    assert.equal(en.sidebar.operationsNav, "Operations");
    assert.equal(en.sidebar.settingsNav, "Settings");
    assert.equal(en.sidebar.costsNav, "Costs");
  });

  it("Network / Outbound vs embedded language remains in en (deep pages)", () => {
    assert.equal(en.sidebar.proxy, "Network");
    assert.equal(en.sidebar.logsProxy, "Outbound Logs");
    assert.equal(en.sidebar.embeddedServices, "Embedded Services");
    assert.notEqual(en.sidebar.proxy, en.sidebar.logsProxy);
    assert.notEqual(en.sidebar.proxy, en.sidebar.embeddedServices);
    assert.notEqual(en.sidebar.logsProxy, en.sidebar.embeddedServices);
    // synonym surfaces stay aligned with Observe language
    const enFull = JSON.parse(fs.readFileSync(enPath, "utf-8")) as {
      logs?: { proxyLogs?: string };
    };
    assert.equal(enFull.logs?.proxyLogs, "Outbound Logs");
  });

  it("Data & Storage labels replace bare Storage for settings-general", () => {
    assert.equal(en.sidebar.settingsGeneral, "Data & Storage");
    const enFull = JSON.parse(fs.readFileSync(enPath, "utf-8")) as {
      settings?: { systemStorage?: string };
    };
    assert.equal(enFull.settings?.systemStorage, "Data & Storage");
  });

  it("skills triad labels remain disambiguated in en", () => {
    assert.equal(en.sidebar.agentSkills, "Agent Skills");
    // EPIC-20 0093: Omni Skills → Core Skills (inbound sandbox)
    assert.equal(en.sidebar.omniSkills, "Core Skills");
    assert.equal(en.sidebar.plugins, "Plugins");
    assert.match(en.sidebar.agentSkillsSubtitle, /outbound|external/i);
    assert.match(en.sidebar.omniSkillsSubtitle, /inbound|sandbox/i);
  });

  it("every default-tree i18nKey resolves in en.sidebar", () => {
    for (const section of SIDEBAR_SECTIONS) {
      assert.equal(
        typeof en.sidebar[section.titleKey],
        "string",
        `missing en.sidebar.${section.titleKey}`
      );
      for (const item of getSectionItems(section)) {
        assert.equal(
          typeof en.sidebar[item.i18nKey],
          "string",
          `missing en.sidebar.${item.i18nKey} (item ${item.id})`
        );
        if (item.subtitleKey) {
          assert.equal(
            typeof en.sidebar[item.subtitleKey],
            "string",
            `missing en.sidebar.${item.subtitleKey}`
          );
        }
      }
    }
  });

  it("PRIMARY_SIDEBAR_ITEMS stay at 7 hubs after EPIC-19 analytics/costs drop (0082)", () => {
    // Was 9 with analytics + costs peers; 0082 drops those (redirects + hideable retained).
    assert.equal(PRIMARY_SIDEBAR_ITEMS.length, 7);
    const ops = PRIMARY_SIDEBAR_ITEMS.find((i) => i.id === "operations");
    assert.ok(ops);
    assert.equal(ops.href, "/operations");
    assert.equal(
      PRIMARY_SIDEBAR_ITEMS.some((i) => i.id === "analytics" || i.id === "costs"),
      false
    );
  });
});
