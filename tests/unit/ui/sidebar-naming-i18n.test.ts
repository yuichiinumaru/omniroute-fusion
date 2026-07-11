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
  });

  it("skills triad labels remain disambiguated in en", () => {
    assert.equal(en.sidebar.agentSkills, "Agent Skills");
    assert.equal(en.sidebar.omniSkills, "Omni Skills");
    assert.equal(en.sidebar.plugins, "Plugins");
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

  it("PRIMARY_SIDEBAR_ITEMS stay at 10 hubs", () => {
    assert.equal(PRIMARY_SIDEBAR_ITEMS.length, 10);
  });
});
