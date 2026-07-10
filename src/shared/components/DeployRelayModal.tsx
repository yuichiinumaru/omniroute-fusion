"use client";

import type { ReactNode } from "react";
import Modal from "./Modal";
import { cn } from "@/shared/utils/cn";

export interface DeployRelayModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  /** Callout banner (credentials warning, free-tier notes lead-in, etc.). */
  warning?: ReactNode;
  warningTone?: "yellow" | "orange";
  /** Inline deploy/validation error. */
  error?: string | null;
  /** Footer note above actions (free tier, etc.). */
  note?: ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "full";
  className?: string;
  bodyClassName?: string;
}

const WARNING_TONES = {
  yellow: "bg-yellow-500/10 border border-yellow-500/30 text-yellow-300",
  orange: "bg-orange-500/10 border border-orange-500/30 text-orange-300",
} as const;

/**
 * Shared chrome for one-click relay deployers (Vercel / Cloudflare / Deno).
 * Composes the existing `Modal` primitive — no second modal system.
 * Domain forms stay in `children`; header/footer/a11y/focus trap come from Modal.
 */
export default function DeployRelayModal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  warning,
  warningTone = "yellow",
  error,
  note,
  size = "md",
  className,
  bodyClassName,
}: DeployRelayModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      footer={footer}
      size={size}
      className={className}
      bodyClassName={bodyClassName ?? "p-6 space-y-4 max-h-[calc(80vh-140px)] overflow-y-auto"}
    >
      {warning ? (
        <div className={cn("rounded p-3 text-xs space-y-1", WARNING_TONES[warningTone])}>
          {warning}
        </div>
      ) : null}

      {children}

      {error ? (
        <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded p-2">
          {error}
        </div>
      ) : null}

      {note ? <div className="text-xs text-text-muted">{note}</div> : null}
    </Modal>
  );
}
