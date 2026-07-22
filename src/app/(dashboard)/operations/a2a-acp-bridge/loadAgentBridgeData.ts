import { getProviderConnections } from "@/lib/db/providers";
import { ALL_TARGETS } from "@/mitm/targets/index";
import type { AgentBridgePageData } from "@/app/(dashboard)/dashboard/tools/agent-bridge/AgentBridgePageClient";
import { normalizeAgentBridgeState } from "@/app/(dashboard)/dashboard/tools/agent-bridge/normalizeState";
import type { MitmTargetView } from "@/mitm/types";

export type AgentBridgeLoadResult = {
  initialData: AgentBridgePageData;
  targets: MitmTargetView[];
  hasProviders: boolean;
};

const DEFAULT_BRIDGE_DATA: AgentBridgePageData = {
  serverState: {
    running: false,
    port: 443,
    certTrusted: false,
    upstreamCa: null,
    lastStartedAt: null,
    activeConns: 0,
    interceptedCount: 0,
    dnsConfigured: false,
    orphanedStateDetected: false,
  },
  agentStates: [],
  bypassPatterns: [],
  mappings: {},
};

/**
 * Shared SSR load for Agent Bridge section (Task 0092 stack + legacy module reuse).
 * Mirrors former `dashboard/tools/agent-bridge/page.tsx` data path.
 */
export async function loadAgentBridgeData(): Promise<AgentBridgeLoadResult> {
  let hasProviders = false;
  try {
    const connections = await getProviderConnections();
    hasProviders = Array.isArray(connections) && connections.length > 0;
  } catch {
    hasProviders = false;
  }

  let initialData: AgentBridgePageData = DEFAULT_BRIDGE_DATA;

  try {
    const base =
      process.env.OMNIROUTE_BASE_URL ??
      `http://127.0.0.1:${process.env.PORT ?? 20128}`;
    const res = await fetch(`${base}/api/tools/agent-bridge/state`, {
      cache: "no-store",
      headers: { "x-internal-fetch": "1" },
    });
    if (res.ok) {
      // #3318: normalize — the /state route returns `{ server, agents }`, not the
      // page's `{ serverState, ... }` shape.
      initialData = normalizeAgentBridgeState(await res.json());
    }
  } catch {
    // Backend not yet available — use defaults; client will poll
  }

  const targets = ALL_TARGETS.map(({ handler: _handler, ...rest }) => rest);

  return { initialData, targets, hasProviders };
}
