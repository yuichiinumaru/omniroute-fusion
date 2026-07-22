import { notFound } from "next/navigation";
import {
  isOperationsTopbarId,
  type OperationsTopbarId,
} from "@/shared/constants/epic20Operations";
import OperationsSegmentPlaceholder from "../OperationsSegmentPlaceholder";
import A2aAcpBridgePage from "../a2a-acp-bridge/A2aAcpBridgePage";
import CloudAgentsPageClient from "../cloud-agents/CloudAgentsPageClient";
import MediaPageClient from "../media/MediaPageClient";
import SkillsStackPageClient from "../skills/SkillsStackPageClient";
import IntegrationsPageClient from "../integrations/IntegrationsPageClient";

type PageProps = {
  params: Promise<{ segment: string }>;
};

/**
 * Operations peer routes: `/operations/{topbarId}`.
 * **endpoints** static route: `operations/endpoints/` (0088 fusion) — wins over this.
 * a2a-acp-bridge stack: Task 0092. Skills stack: Task 0093. Media (0097) has a
 * dedicated static route at `operations/media/` which takes precedence; this
 * branch keeps dynamic-segment mounts consistent if hit. Other peers placeholders.
 */
export default async function OperationsSegmentPage({ params }: PageProps) {
  const { segment } = await params;
  if (!isOperationsTopbarId(segment)) {
    notFound();
  }

  const id = segment as OperationsTopbarId;

  // Cloud Agents single-scroll: Tasks → Settings → Agents (0091 / T20-F).
  if (id === "cloud-agents") {
    return <CloudAgentsPageClient />;
  }

  // A2A/ACP Bridge: Agent Bridge → A2A → ACP collapsible stack (0092 / T20-G).
  if (id === "a2a-acp-bridge") {
    return <A2aAcpBridgePage />;
  }

  // Skills: Core Skills → Agent Skills collapsible stack (0093 / T20-H).
  if (id === "skills") {
    return <SkillsStackPageClient />;
  }

  // Integrations: Webhooks → Context Sources → Plugins (0094 / T20-I).
  if (id === "integrations") {
    return <IntegrationsPageClient />;
  }

  // Media generation lab — content only; Ops topbar is layout-owned (0097).
  if (id === "media") {
    return <MediaPageClient />;
  }

  return <OperationsSegmentPlaceholder id={id} />;
}
