import A2aAcpBridgeStackClient from "./A2aAcpBridgeStackClient";
import { loadAgentBridgeData } from "./loadAgentBridgeData";

/**
 * EPIC-20 T20-G / Task 0092 — server entry for `/operations/a2a-acp-bridge`.
 * Loads Agent Bridge SSR state; A2A + ACP sections hydrate client-side.
 * Shell chrome (Operations topbar) is layout-owned — content only here.
 */
export default async function A2aAcpBridgePage() {
  const { initialData, targets, hasProviders } = await loadAgentBridgeData();

  return (
    <A2aAcpBridgeStackClient
      bridgeInitialData={initialData}
      bridgeTargets={targets}
      hasProviders={hasProviders}
    />
  );
}
