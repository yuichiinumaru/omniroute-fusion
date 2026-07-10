/**
 * Epic 0005 S7 / Task 0026 — operator-facing naming contracts for sidebar i18n.
 * Labels only (stable keys); structure frozen by Task 0025.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  SIDEBAR_SECTIONS,
  getSectionItems,
  type SidebarItemDefinition,
} from "../../../src/shared/constants/sidebarVisibility";

const enPath = path.resolve(process.cwd(), "src/i18n/messages/en.json");
const en = JSON.parse(fs.readFileSync(enPath, "utf-8")) as {
  sidebar: Record<string, string>;
  header: Record<string, string>;
};

function findItem(id: string): SidebarItemDefinition {
  for (const section of SIDEBAR_SECTIONS) {
    const hit = getSectionItems(section).find((item) => item.id === id);
    if (hit) return hit;
  }
  throw new Error(`sidebar item not found: ${id}`);
}

describe("sidebar naming debt (Task 0026)", () => {
  it("Analytics hub uses analytics label — not Usage", () => {
    const item = findItem("analytics");
    assert.equal(item.i18nKey, "analytics");
    assert.equal(item.subtitleKey, "analyticsSubtitle");
    assert.equal(en.sidebar.analytics, "Analytics");
    assert.equal(en.sidebar.analyticsSubtitle, "Charts, trends, evals, and utilization");
    // Usage remains a distinct token for volume/spend language
    assert.equal(en.sidebar.usage, "Usage");
    assert.notEqual(en.sidebar.usage, en.sidebar.analytics);
    assert.match(en.sidebar.usageSubtitle, /token|request|volume/i);
  });

  it("settings-general is Data & Storage (not bare Storage / general)", () => {
    const item = findItem("settings-general");
    assert.equal(item.i18nKey, "settingsGeneral");
    assert.equal(en.sidebar.settingsGeneral, "Data & Storage");
    assert.match(en.sidebar.settingsGeneralSubtitle, /database|backup|retention/i);
  });

  it("skills triad labels are disambiguated", () => {
    const agent = findItem("agent-skills");
    const omni = findItem("skills");
    const plugins = findItem("plugins");
    assert.equal(en.sidebar[agent.i18nKey], "Agent Skills");
    assert.equal(en.sidebar[omni.i18nKey], "Omni Skills");
    assert.equal(en.sidebar[plugins.i18nKey], "Plugins");
    assert.match(en.sidebar.agentSkillsSubtitle, /outbound|external/i);
    assert.match(en.sidebar.omniSkillsSubtitle, /inbound|sandbox/i);
    assert.match(en.sidebar.pluginsSubtitle, /plugin/i);
    assert.match(en.sidebar.mcpSubtitle, /mcp tools/i);
  });

  it("Network / Outbound vs logs vs embedded services", () => {
    const proxy = findItem("proxy");
    const embedded = findItem("embedded-services");
    assert.equal(proxy.i18nKey, "proxy");
    assert.equal(en.sidebar.proxy, "Network");
    assert.match(en.sidebar.proxySubtitle, /outbound/i);
    assert.equal(en.sidebar.logsProxy, "Outbound Logs");
    assert.match(en.sidebar.logsProxySubtitle, /outbound|traffic/i);
    assert.equal(en.sidebar[embedded.i18nKey], "Embedded Services");
    assert.match(en.sidebar.embeddedServicesSubtitle, /local process|not outbound/i);
    // Three surfaces must not share the same primary label
    assert.notEqual(en.sidebar.proxy, en.sidebar.logsProxy);
    assert.notEqual(en.sidebar.proxy, en.sidebar.embeddedServices);
    // Residual logs-namespace synonym (page titles / legacy panels) stays aligned
    const fullEn = JSON.parse(fs.readFileSync(enPath, "utf-8")) as {
      logs?: { proxyLogs?: string };
    };
    assert.equal(fullEn.logs?.proxyLogs, "Outbound Logs");
  });

  it("pillar titles remain consistent (Task 0025 + 0026)", () => {
    const expected: Record<string, string> = {
      corePulseSection: "Core Pulse",
      registrySection: "Registry",
      routingStrategySection: "Routing & Strategy",
      governanceSection: "Governance",
      operationsSection: "Operations",
      observabilitySection: "Observability",
      systemSection: "System",
    };
    for (const [key, label] of Object.entries(expected)) {
      assert.equal(en.sidebar[key], label, `sidebar.${key}`);
    }
    for (const section of SIDEBAR_SECTIONS) {
      if (section.visibility === "debug") continue;
      if (section.id === "help") continue;
      assert.equal(
        typeof en.sidebar[section.titleKey],
        "string",
        `missing en.sidebar.${section.titleKey}`
      );
      if (section.titleFallback) {
        assert.equal(
          en.sidebar[section.titleKey],
          section.titleFallback,
          `${section.id} titleKey/fallback drift`
        );
      }
    }
  });

  it("every default-tree i18nKey resolves in en.sidebar", () => {
    for (const section of SIDEBAR_SECTIONS) {
      assert.equal(typeof en.sidebar[section.titleKey], "string", section.titleKey);
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
            `missing en.sidebar.${item.subtitleKey} (item ${item.id})`
          );
        }
      }
    }
  });

  it("header descriptions for debt surfaces stay distinct", () => {
    assert.match(en.header.analyticsDescription, /chart|eval|utilization/i);
    assert.match(en.header.proxyDescription, /outbound/i);
    assert.match(en.header.settingsGeneralDescription, /data|database|backup/i);
    assert.match(en.header.agentSkillsDescription, /outbound|external/i);
    assert.match(en.header.omniSkillsDescription, /inbound|sandbox/i);
    assert.match(en.header.logsProxyDescription, /outbound/i);
  });
});
