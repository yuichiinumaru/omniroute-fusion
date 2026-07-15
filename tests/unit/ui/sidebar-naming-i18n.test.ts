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

  it("primary Analytics hub does not re-blend Usage vocabulary in subtitle fallback", () => {
    const analytics = PRIMARY_SIDEBAR_ITEMS.find((i) => i.id === "analytics");
    assert.ok(analytics);
    assert.equal(analytics.i18nKey, "analytics");
    assert.equal(analytics.labelFallback, "Analytics");
    assert.ok(analytics.subtitleFallback);
    assert.doesNotMatch(
      analytics.subtitleFallback,
      /^Usage\b/i,
      "primary analytics subtitleFallback must not lead with Usage (token-volume language)"
    );
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
    assert.equal(en.sidebar.omniSkills, "Omni Skills");
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

  it("PRIMARY_SIDEBAR_ITEMS stay at 9 hubs after Operations absorb (Task 0059)", () => {
    // Was 10 with separate API Keys + Operations(cli-code); now Operations hub absorbs API Keys.
    assert.equal(PRIMARY_SIDEBAR_ITEMS.length, 9);
    const ops = PRIMARY_SIDEBAR_ITEMS.find((i) => i.id === "operations");
    assert.ok(ops);
    assert.equal(ops.href, "/dashboard/operations");
  });
});
