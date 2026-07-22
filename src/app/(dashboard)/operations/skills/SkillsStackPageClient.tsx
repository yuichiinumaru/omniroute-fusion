"use client";

import Collapsible from "@/shared/components/Collapsible";
import { SkillsConceptCard } from "@/shared/components/SkillsConceptCard";
import { OmniSkillsPageClient } from "@/app/(dashboard)/dashboard/omni-skills/OmniSkillsPageClient";
import { AgentSkillsPageClient } from "@/app/(dashboard)/dashboard/agent-skills/AgentSkillsPageClient";

/**
 * EPIC-20 T20-H / Task 0093 — Skills peer: Core Skills → Agent Skills stack.
 * Content only — Operations topbar is layout-owned (0087). Do not re-mount chrome.
 */
export default function SkillsStackPageClient() {
  return (
    <div
      className="flex flex-col gap-4"
      data-testid="operations-skills-stack"
      data-operations-skills-stack=""
    >
      <header className="space-y-1">
        <h1 className="text-lg font-semibold text-text-main">Skills</h1>
        <p className="text-sm text-text-muted max-w-3xl">
          Core Skills (inbound sandbox) and Agent Skills (outbound SKILL.md) in one Operations peer.
        </p>
      </header>

      <section id="core-skills" data-section="core-skills" data-testid="skills-section-core">
        <Collapsible
          title="Core Skills"
          subtitle="Inbound sandbox tools for model requests"
          icon="auto_fix_high"
          defaultOpen={true}
        >
          <OmniSkillsPageClient hideConceptCard />
        </Collapsible>
      </section>

      <section id="agent-skills" data-section="agent-skills" data-testid="skills-section-agent">
        <Collapsible
          title="Agent Skills"
          subtitle="Outbound SKILL.md for external agents"
          icon="share"
          defaultOpen={true}
        >
          <AgentSkillsPageClient hideConceptCard />
        </Collapsible>
      </section>

      <section
        id="skills-explainers"
        data-section="skills-explainers"
        data-testid="skills-explainers"
      >
        <Collapsible
          title="About Core Skills & Agent Skills"
          subtitle="How inbound sandbox tools differ from outbound SKILL.md"
          icon="info"
          defaultOpen={false}
        >
          <div className="flex flex-col gap-4">
            <SkillsConceptCard variant="omni" />
            <SkillsConceptCard variant="agent" />
          </div>
        </Collapsible>
      </section>
    </div>
  );
}
