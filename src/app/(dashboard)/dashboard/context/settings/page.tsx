"use client";

import { useCallback, useState } from "react";
import RoutingHubSubnav from "@/shared/components/RoutingHubSubnav";
import CompressionPanel, {
  type CompressionEngineToggle,
} from "./CompressionPanel";
import CompressionStylesTile from "../CompressionStylesTile";
import EnabledEngineSections from "./EnabledEngineSections";

export default function CompressionSettingsPage() {
  // Task 0058 F1: shared engines map so EnabledEngineSections recomposes when
  // CompressionPanel toggles engines on the same page (no full reload).
  // `null` = parent still loading; object = controlled SSOT from panel.
  const [engines, setEngines] = useState<Record<string, CompressionEngineToggle> | null>(
    null
  );
  const handleEnginesChange = useCallback((next: Record<string, CompressionEngineToggle>) => {
    setEngines(next);
  }, []);

  return (
    <div className="flex flex-col gap-4 p-4">
      <RoutingHubSubnav active="compression-settings" />
      <CompressionPanel onEnginesChange={handleEnginesChange} />
      {/* D0: read-only telemetry tile (output-token savings + applied styles) */}
      <CompressionStylesTile />
      {/* Task 0058: embed detail pages for engines that are currently enabled */}
      <EnabledEngineSections engines={engines} />
    </div>
  );
}
