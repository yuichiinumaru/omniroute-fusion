"use client";

import type { ReactNode, HTMLAttributes, KeyboardEvent, MouseEvent } from "react";
import { Card, Button } from "@/shared/components";
import { cn } from "@/shared/utils/cn";

/**
 * Shared chrome shell for CLI / agent tool configuration cards.
 *
 * Composition-first API (avoid a 40-prop god object):
 *
 * ```tsx
 * <ConfigurableToolCard
 *   name={tool.name}
 *   description={t("toolDescriptions.kilo")}
 *   icon={<Image ... />}
 *   statusBadge={<CliStatusBadge ... />}
 *   isExpanded={isExpanded}
 *   onToggle={onToggle}
 * >
 *   {checking && <ConfigurableToolCard.Checking label={t("checkingCli", { tool })} />}
 *   {status && !checking && (
 *     <ConfigurableToolCard.Body>
 *       <ConfigurableToolCard.RuntimeStatus ready={cliReady} title={...} paths={[...]} />
 *       {cliReady && (
 *         <>
 *           <ConfigurableToolCard.ConfiguredBanner>...</ConfigurableToolCard.ConfiguredBanner>
 *           {toolSpecificFormFields}
 *           <ConfigurableToolCard.Actions
 *             applyLabel={...}
 *             onApply={handleApply}
 *             applyDisabled={!model}
 *             applying={applying}
 *             onReset={handleReset}
 *             resetting={restoring}
 *             showReset={configured}
 *           />
 *           <ConfigurableToolCard.Message message={message} />
 *           <ConfigurableToolCard.Backups ... />
 *         </>
 *       )}
 *     </ConfigurableToolCard.Body>
 *   )}
 * </ConfigurableToolCard>
 * ```
 *
 * Provider-specific apply/reset/status strategies stay in the card as callbacks.
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export type ConfigurableToolCardMessage = {
  readonly type: "success" | "error";
  readonly text: string;
};

export type ConfigurableToolCardPath = {
  readonly label: string;
  readonly value: string;
};

export type ConfigurableToolCardBackup = {
  readonly id: string;
  readonly originalFile: string;
  readonly createdAt: string;
};

export interface ConfigurableToolCardProps {
  /** Tool display name (header). */
  name: string;
  /** Short description under the name. */
  description?: ReactNode;
  /** Icon / image node (32×32 recommended). */
  icon?: ReactNode;
  /** Status badge slot (e.g. CliStatusBadge). */
  statusBadge?: ReactNode;
  /** Whether the expanded panel is open. */
  isExpanded?: boolean;
  /** Header click / expand toggle. */
  onToggle?: () => void;
  /** Expanded content (checking state, body, risk notice, etc.). */
  children?: ReactNode;
  /** Optional risk notice rendered above expanded children. */
  riskNotice?: ReactNode;
  /** Extra class on the Card root. */
  className?: string;
  /** Root test id. */
  "data-testid"?: string;
}

// ── Root shell ────────────────────────────────────────────────────────────────

function ConfigurableToolCardRoot({
  name,
  description,
  icon,
  statusBadge,
  isExpanded = false,
  onToggle,
  children,
  riskNotice,
  className,
  "data-testid": testId = "configurable-tool-card",
}: ConfigurableToolCardProps) {
  const handleHeaderClick = () => {
    onToggle?.();
  };

  const handleHeaderKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onToggle?.();
    }
  };

  return (
    <Card padding="sm" className={cn("overflow-hidden", className)} data-testid={testId}>
      <div
        className="flex items-center justify-between hover:cursor-pointer"
        onClick={handleHeaderClick}
        onKeyDown={handleHeaderKeyDown}
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
        data-testid={`${testId}-header`}
      >
        <div className="flex items-center gap-3 min-w-0">
          {icon != null && (
            <div
              className="size-8 rounded-lg flex items-center justify-center shrink-0"
              data-testid={`${testId}-icon`}
            >
              {icon}
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-medium text-sm">{name}</h3>
              {statusBadge}
            </div>
            {description != null && description !== "" && (
              <p className="text-xs text-text-muted truncate">{description}</p>
            )}
          </div>
        </div>
        <span
          className={cn(
            "material-symbols-outlined text-text-muted text-[20px] transition-transform shrink-0",
            isExpanded && "rotate-180"
          )}
          aria-hidden="true"
        >
          expand_more
        </span>
      </div>

      {isExpanded && (
        <div className="mt-6 pt-6 border-t border-border" data-testid={`${testId}-expanded`}>
          {riskNotice}
          {children}
        </div>
      )}
    </Card>
  );
}

// ── Checking ──────────────────────────────────────────────────────────────────

export interface ConfigurableToolCardCheckingProps {
  label: ReactNode;
  className?: string;
}

function Checking({ label, className }: ConfigurableToolCardCheckingProps) {
  return (
    <div
      className={cn("flex items-center gap-2 text-text-muted text-sm", className)}
      data-testid="configurable-tool-card-checking"
      role="status"
    >
      <span className="material-symbols-outlined animate-spin text-base" aria-hidden="true">
        progress_activity
      </span>
      <span>{label}</span>
    </div>
  );
}

// ── Body ──────────────────────────────────────────────────────────────────────

export interface ConfigurableToolCardBodyProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
}

function Body({ children, className, ...props }: ConfigurableToolCardBodyProps) {
  return (
    <div
      className={cn("flex flex-col gap-4", className)}
      data-testid="configurable-tool-card-body"
      {...props}
    >
      {children}
    </div>
  );
}

// ── Runtime status ────────────────────────────────────────────────────────────

export interface ConfigurableToolCardRuntimeStatusProps {
  ready: boolean;
  /** Primary status title (ready / not runnable / not detected). */
  title: ReactNode;
  /** Optional path rows (binary, auth, config, …). */
  paths?: ReadonlyArray<ConfigurableToolCardPath>;
  className?: string;
}

function RuntimeStatus({ ready, title, paths, className }: ConfigurableToolCardRuntimeStatusProps) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 p-3 rounded-lg border bg-bg-secondary/50 border-border",
        className
      )}
      data-testid="configurable-tool-card-runtime"
      data-ready={ready ? "true" : "false"}
    >
      <span
        className={cn(
          "material-symbols-outlined text-lg",
          ready ? "text-green-500" : "text-yellow-500"
        )}
        aria-hidden="true"
      >
        {ready ? "check_circle" : "warning"}
      </span>
      <div className="flex flex-col gap-1 min-w-0">
        <p className="text-sm font-medium">{title}</p>
        {paths?.map((path) =>
          path.value ? (
            <p key={`${path.label}:${path.value}`} className="text-xs text-text-muted">
              {path.label}:{" "}
              <code className="px-1 py-0.5 rounded bg-black/5 dark:bg-white/10 break-all">
                {path.value}
              </code>
            </p>
          ) : null
        )}
      </div>
    </div>
  );
}

// ── Configured banner ─────────────────────────────────────────────────────────

export interface ConfigurableToolCardConfiguredBannerProps {
  children: ReactNode;
  className?: string;
}

function ConfiguredBanner({ children, className }: ConfigurableToolCardConfiguredBannerProps) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 p-3 bg-green-500/10 border border-green-500/30 rounded-lg",
        className
      )}
      data-testid="configurable-tool-card-configured"
    >
      <span className="material-symbols-outlined text-green-500 text-lg" aria-hidden="true">
        check_circle
      </span>
      <div className="flex flex-col gap-1 min-w-0">{children}</div>
    </div>
  );
}

// ── Message ───────────────────────────────────────────────────────────────────

export interface ConfigurableToolCardMessageProps {
  message: ConfigurableToolCardMessage | null | undefined;
  className?: string;
}

function Message({ message, className }: ConfigurableToolCardMessageProps) {
  if (!message) return null;
  const isSuccess = message.type === "success";
  return (
    <div
      className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-lg text-sm",
        isSuccess ? "bg-green-500/10 text-green-600" : "bg-red-500/10 text-red-600",
        className
      )}
      data-testid="configurable-tool-card-message"
      data-type={message.type}
      role="status"
    >
      <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
        {isSuccess ? "check_circle" : "error"}
      </span>
      <span>{message.text}</span>
    </div>
  );
}

// ── Actions (apply / reset plugins) ───────────────────────────────────────────

export interface ConfigurableToolCardActionsProps {
  applyLabel: ReactNode;
  onApply: () => void;
  applyDisabled?: boolean;
  applying?: boolean;
  /** When true, render the reset button. */
  showReset?: boolean;
  resetLabel?: ReactNode;
  onReset?: () => void;
  resetting?: boolean;
  resetDisabled?: boolean;
  className?: string;
  /** Extra action nodes after apply/reset. */
  children?: ReactNode;
}

function Actions({
  applyLabel,
  onApply,
  applyDisabled = false,
  applying = false,
  showReset = false,
  resetLabel,
  onReset,
  resetting = false,
  resetDisabled = false,
  className,
  children,
}: ConfigurableToolCardActionsProps) {
  return (
    <div
      className={cn("flex items-center gap-2 pt-2 flex-wrap", className)}
      data-testid="configurable-tool-card-actions"
    >
      <Button
        variant="primary"
        size="sm"
        onClick={onApply}
        disabled={applyDisabled}
        loading={applying}
        data-testid="configurable-tool-card-apply"
      >
        <span className="material-symbols-outlined text-[14px] mr-1" aria-hidden="true">
          save
        </span>
        {applyLabel}
      </Button>
      {showReset && onReset && (
        <Button
          variant="outline"
          size="sm"
          onClick={onReset}
          loading={resetting}
          disabled={resetDisabled}
          data-testid="configurable-tool-card-reset"
        >
          <span className="material-symbols-outlined text-[14px] mr-1" aria-hidden="true">
            restart_alt
          </span>
          {resetLabel}
        </Button>
      )}
      {children}
    </div>
  );
}

// ── Backups ───────────────────────────────────────────────────────────────────

export interface ConfigurableToolCardBackupsProps {
  backups: ReadonlyArray<ConfigurableToolCardBackup>;
  open: boolean;
  onToggle: () => void;
  onRestore: (backupId: string) => void;
  restoringId?: string | null;
  backupsLabel: ReactNode;
  restoreLabel: ReactNode;
  emptyLabel: ReactNode;
  className?: string;
}

function Backups({
  backups,
  open,
  onToggle,
  onRestore,
  restoringId = null,
  backupsLabel,
  restoreLabel,
  emptyLabel,
  className,
}: ConfigurableToolCardBackupsProps) {
  const handleToggleClick = (event: MouseEvent<HTMLButtonElement>) => {
    // Prevent bubbling into any outer click handlers if nested oddly.
    event.stopPropagation();
    onToggle();
  };

  return (
    <div
      className={cn("border-t border-border pt-3 mt-1", className)}
      data-testid="configurable-tool-card-backups"
    >
      <button
        type="button"
        onClick={handleToggleClick}
        className="flex items-center gap-2 text-sm text-text-muted hover:text-text transition-colors"
        aria-expanded={open}
        data-testid="configurable-tool-card-backups-toggle"
      >
        <span
          className={cn(
            "material-symbols-outlined text-[16px] transition-transform",
            open && "rotate-90"
          )}
          aria-hidden="true"
        >
          chevron_right
        </span>
        <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
          backup
        </span>
        {backupsLabel} {backups.length > 0 && `(${backups.length})`}
      </button>
      {open && backups.length > 0 && (
        <div className="mt-2 flex flex-col gap-1.5 pl-6">
          {backups.map((backup) => (
            <div
              key={backup.id}
              className="flex items-center justify-between gap-2 p-2 rounded bg-bg-secondary/50 text-xs"
              data-testid="configurable-tool-card-backup-row"
            >
              <div className="flex flex-col min-w-0">
                <span className="font-medium truncate">{backup.originalFile}</span>
                <span className="text-text-muted">
                  {new Date(backup.createdAt).toLocaleString()}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRestore(backup.id)}
                loading={restoringId === backup.id}
                data-testid="configurable-tool-card-restore"
              >
                {restoreLabel}
              </Button>
            </div>
          ))}
        </div>
      )}
      {open && backups.length === 0 && (
        <p
          className="mt-2 pl-6 text-xs text-text-muted"
          data-testid="configurable-tool-card-backups-empty"
        >
          {emptyLabel}
        </p>
      )}
    </div>
  );
}

// ── Field helpers (optional chrome for form rows) ─────────────────────────────

export interface ConfigurableToolCardFieldProps {
  label: ReactNode;
  children: ReactNode;
  className?: string;
}

function Field({ label, children, className }: ConfigurableToolCardFieldProps) {
  return (
    <div
      className={cn("flex flex-col gap-2", className)}
      data-testid="configurable-tool-card-field"
    >
      <label className="text-sm text-text-muted">{label}</label>
      {children}
    </div>
  );
}

// ── Compound export ───────────────────────────────────────────────────────────

type ConfigurableToolCardComponent = typeof ConfigurableToolCardRoot & {
  Checking: typeof Checking;
  Body: typeof Body;
  RuntimeStatus: typeof RuntimeStatus;
  ConfiguredBanner: typeof ConfiguredBanner;
  Message: typeof Message;
  Actions: typeof Actions;
  Backups: typeof Backups;
  Field: typeof Field;
};

const ConfigurableToolCard = ConfigurableToolCardRoot as ConfigurableToolCardComponent;
ConfigurableToolCard.Checking = Checking;
ConfigurableToolCard.Body = Body;
ConfigurableToolCard.RuntimeStatus = RuntimeStatus;
ConfigurableToolCard.ConfiguredBanner = ConfiguredBanner;
ConfigurableToolCard.Message = Message;
ConfigurableToolCard.Actions = Actions;
ConfigurableToolCard.Backups = Backups;
ConfigurableToolCard.Field = Field;

export { ConfigurableToolCard };
export default ConfigurableToolCard;
