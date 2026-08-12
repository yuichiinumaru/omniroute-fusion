"use client";

import { useTranslations } from "next-intl";
import RoutingTab from "../components/RoutingTab";
import ModelRoutingSection from "@/shared/components/ModelRoutingSection";
import ComboDefaultsTab from "../components/ComboDefaultsTab";
import FallbackChainsEditor from "../components/FallbackChainsEditor";
import ModelAliasesUnified from "../components/ModelAliasesUnified";
import BackgroundDegradationTab from "../components/BackgroundDegradationTab";
import ThinkingBudgetTab from "../components/ThinkingBudgetTab";
import VisionBridgeSettingsTab from "../components/VisionBridgeSettingsTab";
import SystemPromptTab from "../components/SystemPromptTab";
import ResponsesStatePolicyTab from "../components/ResponsesStatePolicyTab";
import UsageTokenBufferTab from "../components/UsageTokenBufferTab";
import CodexFastTierTab from "../components/CodexFastTierTab";
import ClaudeFastModeTab from "../components/ClaudeFastModeTab";
import MemorySkillsTab from "../components/MemorySkillsTab";
import ModelsDevSyncTab from "../components/ModelsDevSyncTab";
import ResilienceTab from "../components/ResilienceTab";

export default function SettingsRoutingPage() {
  const t = useTranslations("settings");
  return (
    <div className="space-y-6">
      <p className="text-sm text-text-muted">{t("routingSettingsIntro")}</p>
      <ComboDefaultsTab />
      <ModelAliasesUnified />
      <FallbackChainsEditor />
      <ModelRoutingSection />
      <RoutingTab />
      <BackgroundDegradationTab />
      <ThinkingBudgetTab />
      <VisionBridgeSettingsTab />
      <SystemPromptTab />
      <ResponsesStatePolicyTab />
      <UsageTokenBufferTab />
      <CodexFastTierTab />
      <ClaudeFastModeTab />
      <MemorySkillsTab />
      <ModelsDevSyncTab />
      <ResilienceTab />
    </div>
  );
}
