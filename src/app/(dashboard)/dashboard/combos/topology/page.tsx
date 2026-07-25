import type { Metadata } from "next";
import ComboTopologyClient from "./ComboTopologyClient";

export const metadata: Metadata = {
  title: "OmniRoute — Combo Topology",
  description: "Visual DAG and provider topology for combo routing",
};

export default function ComboTopologyPage() {
  return <ComboTopologyClient />;
}
