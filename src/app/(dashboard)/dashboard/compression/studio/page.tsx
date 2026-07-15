"use client";
import { useState } from "react";
import { PlayView } from "./PlayView";
import { CompareView } from "./CompareView";
import RoutingHubSubnav from "@/shared/components/RoutingHubSubnav";
export default function CompressionStudioPage() {
  const [tab, setTab] = useState<"play" | "compare">("play");
  const [text, setText] = useState("");
  return (
    <div className="flex h-[calc(100dvh-6rem)] min-h-[480px] flex-col gap-3 p-4">
      <RoutingHubSubnav active="compression-studio" />
      <div className="mb-0 flex gap-2">
        <button data-testid="tab-play" aria-pressed={tab === "play"} onClick={() => setTab("play")}>Play</button>
        <button data-testid="tab-compare" aria-pressed={tab === "compare"} onClick={() => setTab("compare")}>Compare</button>
      </div>
      <div className="min-h-0 flex-1">
        {tab === "play" ? <PlayView text={text} onText={setText} /> : <CompareView text={text} />}
      </div>
    </div>
  );
}
