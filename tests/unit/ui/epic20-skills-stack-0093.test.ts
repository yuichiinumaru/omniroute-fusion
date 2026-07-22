/**
 * Task 0093 / EPIC-20 T20-H — Skills stack: Core Skills → Agent Skills under `/operations/skills`.
 * Redirects, rename, explainers bottom collapsed, anti-phantom ≤1 Ops topbar, no-new-leaf.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import {
  PRIMARY_SIDEBAR_ITEM_IDS,
  PRIMARY_SIDEBAR_ITEMS,
} from "../../../src/shared/constants/sidebarVisibility";
import {
  OPERATIONS_REDIRECT_MATRIX,
  OPERATIONS_TOPBAR_IDS,
  OPERATIONS_TOPBAR_LABELS,
  buildOperationsPath,
} from "../../../src/shared/constants/epic20Operations";
import { OPERATIONS_HUB_GROUPS } from "../../../src/shared/constants/operationsHub";

const ROOT = join(import.meta.dirname, "../../..");

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8");
}

const STACK = "src/app/(dashboard)/operations/skills/SkillsStackPageClient.tsx";
const SEGMENT = "src/app/(dashboard)/operations/[segment]/page.tsx";
const LAYOUT = "src/app/(dashboard)/operations/layout.tsx";
const OMNI_PAGE = "src/app/(dashboard)/dashboard/omni-skills/page.tsx";
const AGENT_PAGE = "src/app/(dashboard)/dashboard/agent-skills/page.tsx";
const OMNI_CLIENT = "src/app/(dashboard)/dashboard/omni-skills/OmniSkillsPageClient.tsx";
const AGENT_CLIENT = "src/app/(dashboard)/dashboard/agent-skills/AgentSkillsPageClient.tsx";
const CONCEPT = "src/shared/components/SkillsConceptCard.tsx";
const EN = "src/i18n/messages/en.json";

describe("EPIC-20 Skills stack files (0093)", () => {
  it("creates Skills stack client and keeps legacy client trees", () => {
    for (const rel of [STACK, SEGMENT, OMNI_PAGE, AGENT_PAGE, OMNI_CLIENT, AGENT_CLIENT]) {
      assert.equal(existsSync(join(ROOT, rel)), true, `missing ${rel}`);
    }
  });

  it("segment page mounts SkillsStackPageClient for skills peer only", () => {
    const src = read(SEGMENT);
    assert.ok(src.includes("SkillsStackPageClient"));
    assert.ok(src.includes('id === "skills"') || src.includes("id === 'skills'"));
    // Must not invent extra topbar ids
    assert.ok(OPERATIONS_TOPBAR_IDS.includes("skills"));
    assert.equal(OPERATIONS_TOPBAR_LABELS.skills, "Skills");
  });
});

describe("Skills stack order: Core Skills → Agent Skills → explainers", () => {
  it("source order is core-skills then agent-skills then skills-explainers", () => {
    const src = read(STACK);
    const core = src.indexOf('data-section="core-skills"');
    const agent = src.indexOf('data-section="agent-skills"');
    const explainers = src.indexOf('data-section="skills-explainers"');
    assert.ok(core >= 0, "core-skills section marker");
    assert.ok(agent >= 0, "agent-skills section marker");
    assert.ok(explainers >= 0, "skills-explainers section marker");
    assert.ok(core < agent, "Core Skills before Agent Skills");
    assert.ok(agent < explainers, "Agent Skills before explainers");
  });

  it("section titles use Core Skills (not Omni Skills) and Agent Skills", () => {
    const src = read(STACK);
    assert.ok(src.includes('title="Core Skills"') || src.includes("title=\"Core Skills\""));
    assert.ok(src.includes('title="Agent Skills"'));
    assert.equal(src.includes('title="Omni Skills"'), false, "must not show Omni Skills title");
    assert.equal(src.includes("Omni Skills"), false, "no Omni Skills string on fused page");
  });

  it("re-homes both page clients with hideConceptCard (not empty sections)", () => {
    const src = read(STACK);
    assert.ok(src.includes("OmniSkillsPageClient"));
    assert.ok(src.includes("AgentSkillsPageClient"));
    assert.ok(src.includes("hideConceptCard"));
    // Clients still export and accept the prop
    assert.ok(read(OMNI_CLIENT).includes("hideConceptCard"));
    assert.ok(read(AGENT_CLIENT).includes("hideConceptCard"));
    assert.ok(read(OMNI_CLIENT).includes('data-testid="omni-skills-page-client"'));
    assert.ok(read(AGENT_CLIENT).includes('data-testid="agent-skills-page-client"'));
  });

  it("explainers at bottom default collapsed (defaultOpen={false})", () => {
    const src = read(STACK);
    // Explainers Collapsible is the one after agent section; require defaultOpen false near it
    const explainerBlock = src.slice(src.indexOf('data-section="skills-explainers"'));
    assert.ok(
      explainerBlock.includes("defaultOpen={false}") ||
        explainerBlock.includes("defaultOpen={ false }"),
      "explainers must default collapsed"
    );
    assert.ok(explainerBlock.includes("SkillsConceptCard"));
  });
});

describe("Core Skills rename on Ops surface (en i18n + hub)", () => {
  it("en.json surface strings say Core Skills not Omni Skills for skills title/sidebar", () => {
    const en = JSON.parse(read(EN)) as {
      sidebar: { omniSkills: string };
      skills: { title: string };
      agentSkills: {
        conceptCard: {
          omni: { title: string };
          comparison: { colOmni: string };
        };
      };
    };
    assert.equal(en.sidebar.omniSkills, "Core Skills");
    assert.equal(en.skills.title, "Core Skills");
    assert.equal(en.agentSkills.conceptCard.omni.title, "Core Skills — Inbound");
    assert.equal(en.agentSkills.conceptCard.comparison.colOmni, "Core Skills");
  });

  it("operations hub omni-skills card label is Core Skills and href targets skills peer", () => {
    const integrations = OPERATIONS_HUB_GROUPS.find((g) => g.id === "integrations");
    assert.ok(integrations);
    const omni = integrations.links.find((l) => l.id === "omni-skills");
    const agent = integrations.links.find((l) => l.id === "agent-skills");
    assert.ok(omni);
    assert.ok(agent);
    assert.equal(omni.label, "Core Skills");
    assert.ok(omni.href.startsWith(buildOperationsPath("skills")));
    assert.ok(agent.href.startsWith(buildOperationsPath("skills")));
  });
});

describe("Legacy redirects via 0086 builders", () => {
  it("matrix rows: omni-skills + agent-skills → buildOperationsPath(skills)", () => {
    const skillsTo = buildOperationsPath("skills");
    assert.equal(skillsTo, "/operations/skills");

    const omni = OPERATIONS_REDIRECT_MATRIX.find((r) => r.from === "/dashboard/omni-skills");
    const agent = OPERATIONS_REDIRECT_MATRIX.find((r) => r.from === "/dashboard/agent-skills");
    assert.ok(omni);
    assert.ok(agent);
    assert.equal(omni.to, skillsTo);
    assert.equal(agent.to, skillsTo);
    assert.equal(omni.ownerTask, "0093");
    assert.equal(agent.ownerTask, "0093");
  });

  it("legacy page shells redirect with buildOperationsPath (not render clients)", () => {
    for (const rel of [OMNI_PAGE, AGENT_PAGE]) {
      const src = read(rel);
      assert.ok(src.includes("redirect("), `${rel} must redirect`);
      assert.ok(src.includes("buildOperationsPath"), `${rel} must use 0086 builder`);
      assert.ok(src.includes('"skills"') || src.includes("'skills'"), `${rel} targets skills`);
      assert.equal(
        src.includes("OmniSkillsPageClient") || src.includes("AgentSkillsPageClient"),
        false,
        `${rel} must not still render page clients`
      );
    }
  });

  it("SkillsConceptCard cross-links target fused skills peer (not orphan legacy destinations only)", () => {
    const src = read(CONCEPT);
    assert.ok(src.includes("buildOperationsPath"));
    assert.ok(src.includes("skills") || src.includes('"skills"'));
    // Prefer hash anchors to stack sections
    assert.ok(src.includes("#core-skills") || src.includes("#agent-skills"));
  });
});

describe("Anti-phantom chrome + no-new-leaf", () => {
  it("skills stack never re-mounts OperationsTopbar / PageTabBar / CostsSubnav", () => {
    for (const rel of [STACK, SEGMENT, OMNI_CLIENT, AGENT_CLIENT]) {
      const src = read(rel);
      assert.equal(
        (src.match(/<OperationsTopbar\b/g) ?? []).length,
        0,
        `${rel} must not re-mount OperationsTopbar`
      );
      assert.equal(
        /import\s+PageTabBar\b/.test(src) || /<PageTabBar\b/.test(src),
        false,
        `${rel} must not stack PageTabBar`
      );
      assert.equal(
        /import\s+CostsSubnav\b/.test(src) || /<CostsSubnav\b/.test(src),
        false,
        `${rel} must not stack CostsSubnav`
      );
    }
    // Layout remains sole Ops topbar host
    assert.equal((read(LAYOUT).match(/<OperationsTopbar\b/g) ?? []).length, 1);
  });

  it("skills is not a primary sidebar leaf", () => {
    assert.equal(PRIMARY_SIDEBAR_ITEM_IDS.includes("skills"), false);
    assert.equal(PRIMARY_SIDEBAR_ITEM_IDS.includes("omni-skills"), false);
    assert.equal(PRIMARY_SIDEBAR_ITEM_IDS.includes("agent-skills"), false);
    assert.equal(PRIMARY_SIDEBAR_ITEMS.length, 7);
    assert.equal(PRIMARY_SIDEBAR_ITEM_IDS.includes("operations"), true);
  });

  it("does not invent topbar id outside 0086 (skills only)", () => {
    const stack = read(STACK);
    // No fabricated peer ids as topbar links
    assert.equal(stack.includes("data-operations-topbar"), false);
    assert.ok(OPERATIONS_TOPBAR_IDS.includes("skills"));
    assert.equal(OPERATIONS_TOPBAR_IDS.filter((id) => id.includes("skill")).length, 1);
  });
});

describe("0093 — Header + page hierarchy (path-to-100)", () => {
  const HEADER = "src/shared/components/Header.tsx";

  it("Header deep meta matches /operations/skills before catch-all as Skills", () => {
    const src = read(HEADER);
    assert.ok(
      src.includes('matchOpsPeerPath("skills")') ||
        src.includes("/operations/skills") ||
        src.includes('"skills"')
    );
    assert.equal(
      /match:\s*\([^)]*\)\s*=>[\s\S]{0,200}?p\.startsWith\(\s*["']\/operations\/["']\s*\)/.test(
        src
      ),
      false,
      "skills must not be shadowed by /operations/* catch-all"
    );
    assert.ok(
      src.includes('titleFallback: "Skills"') ||
        src.includes("OPERATIONS_TOPBAR_LABELS.skills") ||
        src.includes('OPERATIONS_TOPBAR_LABELS["skills"]')
    );
    assert.ok(src.includes('titleKey: "skills"'));
  });

  it("stack page exposes h1 Skills for document hierarchy", () => {
    const src = read(STACK);
    assert.ok(/<h1[\s>]/.test(src), "page must have h1");
    assert.ok(src.includes(">Skills</h1>") || src.includes("Skills</h1>"));
  });
});
