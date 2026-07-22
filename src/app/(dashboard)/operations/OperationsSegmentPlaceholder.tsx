import {
  OPERATIONS_TOPBAR_LABELS,
  type OperationsTopbarId,
} from "@/shared/constants/epic20Operations";

/** Owning implementer slice per peer (EPIC-20 child tasks). */
const PEER_OWNER: Readonly<Record<OperationsTopbarId, string>> = {
  endpoints: "0088",
  "core-mcp": "0089",
  agents: "0090",
  "cloud-agents": "0091",
  "a2a-acp-bridge": "0092",
  skills: "0093",
  integrations: "0094",
  memory: "0095",
  labs: "0096/0099",
  media: "0097",
};

/**
 * Placeholder body for Operations peers until fusion slices land.
 * Shell chrome (topbar) is layout-owned — this is content only.
 */
export default function OperationsSegmentPlaceholder({
  id,
}: {
  id: OperationsTopbarId;
}) {
  const label = OPERATIONS_TOPBAR_LABELS[id];
  const owner = PEER_OWNER[id];

  return (
    <div
      className="rounded-xl border border-border bg-surface p-6"
      data-operations-placeholder={id}
      data-testid={`operations-placeholder-${id}`}
    >
      <h2 className="text-base font-semibold text-text-main">{label}</h2>
      <p className="mt-2 text-sm text-text-muted max-w-2xl">
        Peer mount point under the Operations shell. Content fusion is owned by task{" "}
        <span className="font-mono text-text-main">{owner}</span> — this surface is a stub so
        chrome and routing can land first (Task 0087).
      </p>
    </div>
  );
}
