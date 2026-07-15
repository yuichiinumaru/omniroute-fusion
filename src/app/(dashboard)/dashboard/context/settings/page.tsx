"use client";

import RoutingHubSubnav from "@/shared/components/RoutingHubSubnav";
import CompressionPanel from "./CompressionPanel";
import CompressionStylesTile from "../CompressionStylesTile";
import EnabledEngineSections from "./EnabledEngineSections";

export default function CompressionSettingsPage() {
  return (
    <div className="flex flex-col gap-4 p-4">
      <RoutingHubSubnav active="compression-settings" />
      <CompressionPanel />
      {/* D0: read-only telemetry tile (output-token savings + applied styles) */}
      <CompressionStylesTile />
      {/* Task 0058: embed detail pages for engines that are currently enabled */}
      <EnabledEngineSections />
    </div>
  );
}
