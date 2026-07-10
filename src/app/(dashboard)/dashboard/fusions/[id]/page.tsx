"use client";

import { use } from "react";
import FusionEditorClient from "../FusionEditorClient";

export default function FusionEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <FusionEditorClient id={id} />;
}
