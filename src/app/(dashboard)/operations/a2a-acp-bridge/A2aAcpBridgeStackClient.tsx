"use client";

import Collapsible from "@/shared/components/Collapsible";
import AgentBridgePageClient, {
  type AgentBridgePageData,
} from "@/app/(dashboard)/dashboard/tools/agent-bridge/AgentBridgePageClient";
import A2APageClient, {
  A2AConceptIntro,
} from "@/app/(dashboard)/dashboard/a2a/A2APageClient";
import AcpAgentsPageClient, {
  AcpAgentsConceptCards,
} from "@/app/(dashboard)/dashboard/acp-agents/AcpAgentsPageClient";
import type { MitmTargetView } from "@/mitm/types";

/**
 * EPIC-20 T20-G / Task 0092 — A2A/ACP Bridge collapsible stack.
 *
 * Vertical order (locked): Agent Bridge → A2A Server → ACP Agents.
 * defaultOpen: all three work sections open (first-ship discoverability);
 * concept/explainer block at bottom is collapsed by default.
 *
 * No second topbar — Ops shell (layout) owns the single hub topbar peer.
 */
export type A2aAcpBridgeStackClientProps = {
  bridgeInitialData: AgentBridgePageData;
  bridgeTargets: MitmTargetView[];
  hasProviders: boolean;
};

/** defaultOpen policy — recorded in task Completion Evidence. */
export const A2A_ACP_BRIDGE_DEFAULT_OPEN = {
  "agent-bridge": true,
  "a2a-server": true,
  "acp-agents": true,
  explainers: false,
} as const;

export default function A2aAcpBridgeStackClient({
  bridgeInitialData,
  bridgeTargets,
  hasProviders,
}: A2aAcpBridgeStackClientProps) {
  return (
    <div
      className="flex flex-col gap-4"
      data-operations-page="a2a-acp-bridge"
      data-testid="a2a-acp-bridge-stack"
    >
      <header className="space-y-1">
        <h1 className="text-lg font-semibold text-text-main">A2A/ACP Bridge</h1>
        <p className="text-sm text-text-muted max-w-3xl">
          Agent interop stack: MITM Agent Bridge, A2A JSON-RPC server, and ACP agent registry.
        </p>
      </header>

      <div className="flex flex-col gap-3" data-testid="a2a-acp-bridge-sections">
        <div id="agent-bridge" data-section="agent-bridge">
          <Collapsible
            title="Agent Bridge"
            subtitle="MITM proxy consolidating IDE agent traffic"
            icon="device_hub"
            defaultOpen={A2A_ACP_BRIDGE_DEFAULT_OPEN["agent-bridge"]}
          >
            <AgentBridgePageClient
              initialData={bridgeInitialData}
              targets={bridgeTargets}
              hasProviders={hasProviders}
            />
          </Collapsible>
        </div>

        <div id="a2a-server" data-section="a2a-server">
          <Collapsible
            title="A2A Server"
            subtitle="JSON-RPC 2.0 agent protocol and task manager"
            icon="hub"
            defaultOpen={A2A_ACP_BRIDGE_DEFAULT_OPEN["a2a-server"]}
          >
            <A2APageClient embedded />
          </Collapsible>
        </div>

        <div id="acp-agents" data-section="acp-agents">
          <Collapsible
            title="ACP Agents"
            subtitle="Agent Communication Protocol registry"
            icon="smart_toy"
            defaultOpen={A2A_ACP_BRIDGE_DEFAULT_OPEN["acp-agents"]}
          >
            <AcpAgentsPageClient embedded />
          </Collapsible>
        </div>
      </div>

      <div data-section="explainers" data-testid="a2a-acp-bridge-explainers">
        <Collapsible
          title="About A2A / ACP / Bridge"
          subtitle="Concepts and how-to (collapsed by default)"
          icon="info"
          defaultOpen={A2A_ACP_BRIDGE_DEFAULT_OPEN.explainers}
        >
          <div className="flex flex-col gap-6">
            <section className="space-y-2">
              <h3 className="text-sm font-semibold text-text-main">A2A Server</h3>
              <A2AConceptIntro />
            </section>
            <section className="space-y-2">
              <h3 className="text-sm font-semibold text-text-main">ACP Agents</h3>
              <AcpAgentsConceptCards />
            </section>
          </div>
        </Collapsible>
      </div>
    </div>
  );
}
