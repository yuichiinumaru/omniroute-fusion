"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/shared/utils/cn";
import { getActiveSidebarHref } from "@/shared/utils/sidebarRouteMatch";
import { APP_CONFIG } from "@/shared/constants/appConfig";
import { Hexagon } from "lucide-react";
import Button from "./Button";
import { ConfirmModal } from "./Modal";
import CloudSyncStatus from "./CloudSyncStatus";
import { useTranslations } from "next-intl";
import {
  HIDDEN_SIDEBAR_GROUP_LABELS_SETTING_KEY,
  normalizeHiddenSidebarGroupLabels,
} from "@/shared/constants/sidebarGroupVisibility";
import {
  HIDDEN_SIDEBAR_ITEMS_SETTING_KEY,
  SIDEBAR_SETTINGS_UPDATED_EVENT,
  SIDEBAR_SECTION_ORDER_KEY,
  SIDEBAR_ITEM_ORDER_KEY,
  SIDEBAR_SECTIONS,
  normalizeHiddenSidebarItems,
  applySectionOrder,
  applyItemOrder,
  type SidebarSectionId,
  type SidebarItemDefinition,
  type SidebarItemGroup,
  type SidebarItemOrder,
} from "@/shared/constants/sidebarVisibility";

const isE2EMode = process.env.NEXT_PUBLIC_OMNIROUTE_E2E_MODE === "1";
// Flat primary nav — no accordion sections (see PRIMARY_SIDEBAR_ITEMS).

type SidebarProps = {
  onClose?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  isMacElectron?: boolean;
};

type HoveredItem = { id: string; label: string; x: number; y: number } | null;

export default function Sidebar({
  onClose,
  collapsed = false,
  onToggleCollapse,
  isMacElectron = false,
}: SidebarProps) {
  const pathname = usePathname();
  const t = useTranslations("sidebar");
  const tc = useTranslations("common");
  const sidebarRef = useRef<HTMLElement>(null);
  const [showShutdownModal, setShowShutdownModal] = useState(false);
  const [showRestartModal, setShowRestartModal] = useState(false);
  const [isShuttingDown, setIsShuttingDown] = useState(false);
  const [isRestarting, setIsRestarting] = useState(false);
  const [isDisconnected, setIsDisconnected] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [hiddenSidebarItems, setHiddenSidebarItems] = useState<string[]>([]);
  const [hiddenSidebarGroupLabels, setHiddenSidebarGroupLabels] = useState<string[]>([]);
  const [sidebarSectionOrder, setSidebarSectionOrder] = useState<SidebarSectionId[]>([]);
  const [sidebarItemOrder, setSidebarItemOrder] = useState<SidebarItemOrder>({});
  const [customAppName, setCustomAppName] = useState<string | null>(null);
  const [customLogo, setCustomLogo] = useState<string | null>(null);
  const [hoveredItem, setHoveredItem] = useState<HoveredItem>(null);

  useEffect(() => {
    const applySettings = (data) => {
      setShowDebug(data?.debugMode === true);
      setHiddenSidebarItems(normalizeHiddenSidebarItems(data?.[HIDDEN_SIDEBAR_ITEMS_SETTING_KEY]));
      setHiddenSidebarGroupLabels(
        normalizeHiddenSidebarGroupLabels(data?.[HIDDEN_SIDEBAR_GROUP_LABELS_SETTING_KEY])
      );
      setCustomAppName(data?.instanceName || null);
      setCustomLogo(data?.customLogoBase64 || data?.customLogoUrl || null);
    };

    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        applySettings(data);
        if (Array.isArray(data?.[SIDEBAR_SECTION_ORDER_KEY])) {
          setSidebarSectionOrder(data[SIDEBAR_SECTION_ORDER_KEY] as SidebarSectionId[]);
        }
        if (data?.[SIDEBAR_ITEM_ORDER_KEY] && typeof data[SIDEBAR_ITEM_ORDER_KEY] === "object") {
          setSidebarItemOrder(data[SIDEBAR_ITEM_ORDER_KEY] as SidebarItemOrder);
        }
      })
      .catch(() => {});

    const handleSettingsUpdated = (event: Event) => {
      const detail = (event as CustomEvent<Record<string, unknown>>).detail || {};
      if ("debugMode" in detail) setShowDebug(detail.debugMode === true);
      if (HIDDEN_SIDEBAR_ITEMS_SETTING_KEY in detail) {
        setHiddenSidebarItems(
          normalizeHiddenSidebarItems(detail[HIDDEN_SIDEBAR_ITEMS_SETTING_KEY])
        );
      }
      if (HIDDEN_SIDEBAR_GROUP_LABELS_SETTING_KEY in detail) {
        setHiddenSidebarGroupLabels(
          normalizeHiddenSidebarGroupLabels(detail[HIDDEN_SIDEBAR_GROUP_LABELS_SETTING_KEY])
        );
      }
      if (SIDEBAR_SECTION_ORDER_KEY in detail && Array.isArray(detail[SIDEBAR_SECTION_ORDER_KEY])) {
        setSidebarSectionOrder(detail[SIDEBAR_SECTION_ORDER_KEY] as SidebarSectionId[]);
      }
      if (
        SIDEBAR_ITEM_ORDER_KEY in detail &&
        detail[SIDEBAR_ITEM_ORDER_KEY] &&
        typeof detail[SIDEBAR_ITEM_ORDER_KEY] === "object"
      ) {
        setSidebarItemOrder(detail[SIDEBAR_ITEM_ORDER_KEY] as SidebarItemOrder);
      }
      if ("instanceName" in detail) setCustomAppName((detail.instanceName as string) || null);
      if ("customLogoBase64" in detail) {
        setCustomLogo((detail.customLogoBase64 as string) || null);
      } else if ("customLogoUrl" in detail) {
        setCustomLogo((detail.customLogoUrl as string) || null);
      }
    };

    window.addEventListener(SIDEBAR_SETTINGS_UPDATED_EVENT, handleSettingsUpdated as EventListener);
    return () =>
      window.removeEventListener(
        SIDEBAR_SETTINGS_UPDATED_EVENT,
        handleSettingsUpdated as EventListener
      );
  }, []);

  const getSidebarLabel = (key: string, fallback: string) =>
    typeof t.has === "function" && t.has(key) ? t(key) : fallback;

  const resolveItem = (item: SidebarItemDefinition, hidden: Set<string>) => {
    if (hidden.has(item.id)) return null;
    const subtitle = item.subtitleKey
      ? getSidebarLabel(item.subtitleKey, item.subtitleFallback ?? "")
      : item.subtitleFallback;
    return {
      ...item,
      label: getSidebarLabel(item.i18nKey, item.labelFallback ?? item.id),
      subtitle: subtitle || undefined,
    };
  };

  const hiddenSidebarSet = new Set(hiddenSidebarItems);
  const hiddenSidebarGroupLabelsSet = new Set(hiddenSidebarGroupLabels);

  const orderedSections = applySectionOrder(
    SIDEBAR_SECTIONS.filter((section) => section.visibility !== "debug" || showDebug),
    sidebarSectionOrder
  );

  const visibleSections = orderedSections
    .map((section) => {
      const orderedChildren = applyItemOrder(
        section.children,
        sidebarItemOrder[section.id as SidebarSectionId] ?? []
      );

      const children = orderedChildren
        .map((child) => {
          if ("type" in child && child.type === "group") {
            const items = child.items
              .map((item) => resolveItem(item, hiddenSidebarSet))
              .filter(Boolean) as (SidebarItemDefinition & { label: string })[];
            if (items.length === 0) return null;
            // Smart-grouping: single visible item → inline flat (no group header)
            if (items.length === 1) return items[0];
            return {
              ...child,
              title: getSidebarLabel(child.titleKey, child.titleFallback),
              separatorHidden: hiddenSidebarGroupLabelsSet.has(child.id),
              items,
            } as SidebarItemGroup & {
              title: string;
              separatorHidden: boolean;
              items: (SidebarItemDefinition & { label: string })[];
            };
          }
          return resolveItem(child as SidebarItemDefinition, hiddenSidebarSet);
        })
        .filter(Boolean);

      return {
        ...section,
        title: getSidebarLabel(section.titleKey, section.titleFallback),
        children,
      };
    })
    .filter((section) => {
      const allItems = section.children.flatMap((child: any) =>
        child.type === "group" ? child.items : [child]
      );
      return allItems.length > 0;
    });

  const allVisibleItems = visibleSections.flatMap((section) =>
    section.children.flatMap((child: any) => (child.type === "group" ? child.items : [child]))
  );

  const activeHref = getActiveSidebarHref(pathname, allVisibleItems);

  const handleShutdown = async () => {
    setIsShuttingDown(true);
    try {
      await fetch("/api/shutdown", { method: "POST" });
    } catch (e) {
      // Expected to fail as server shuts down
    }
    setIsShuttingDown(false);
    setShowShutdownModal(false);
    setIsDisconnected(true);
  };

  const handleRestart = async () => {
    setIsRestarting(true);
    try {
      await fetch("/api/restart", { method: "POST" });
    } catch (e) {
      // Expected to fail as server restarts
    }
    setIsRestarting(false);
    setShowRestartModal(false);
    setIsDisconnected(true);
    setTimeout(() => globalThis.location.reload(), 3000);
  };

  const handleMouseEnter = useCallback(
    (e: React.MouseEvent<HTMLElement>, id: string, label: string) => {
      if (!collapsed) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const sidebarRect = sidebarRef.current?.getBoundingClientRect();
      setHoveredItem({
        id,
        label,
        x: (sidebarRect?.right ?? 64) + 8,
        y: rect.top + rect.height / 2,
      });
    },
    [collapsed]
  );

  const handleMouseLeave = useCallback(() => setHoveredItem(null), []);

  const renderNavLink = (item) => {
    const active = !item.external && activeHref === item.href;
    const className = cn(
      "flex items-center gap-3 rounded-lg transition-all group",
      collapsed ? "justify-center px-2 py-2.5" : "px-3 py-1.5",
      active
        ? "bg-primary/10 text-primary"
        : "text-text-muted hover:bg-surface/50 hover:text-text-main"
    );
    const iconClassName = cn(
      "material-symbols-outlined text-[18px] shrink-0",
      active ? "fill-1 text-primary" : "text-text-muted group-hover:text-text-main transition-colors"
    );
    const content = (
      <>
        <span className={iconClassName} aria-hidden="true">
          {item.icon}
        </span>
        {!collapsed && (
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-medium">{item.label}</span>
            {item.subtitle && (
              <span className="truncate text-[10px] text-text-muted/60">{item.subtitle}</span>
            )}
          </div>
        )}
      </>
    );
    const sharedProps = {
      onMouseEnter: (e: React.MouseEvent<HTMLElement>) => handleMouseEnter(e, item.id, item.label),
      onMouseLeave: handleMouseLeave,
    };

    if (item.external) {
      return (
        <a
          key={item.href}
          href={item.href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={onClose}
          className={className}
          aria-current={active ? "page" : undefined}
          {...sharedProps}
        >
          {content}
        </a>
      );
    }

    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={onClose}
        className={className}
        aria-current={active ? "page" : undefined}
        {...sharedProps}
      >
        {content}
      </Link>
    );
  };

  return (
    <>
      <aside
        ref={sidebarRef}
        className={cn(
          "flex h-full min-h-0 flex-col border-r border-black/5 bg-sidebar transition-all duration-300 ease-in-out dark:border-white/5",
          collapsed ? "w-16" : "w-[220px]"
        )}
        style={{ paddingTop: isMacElectron ? "var(--desktop-safe-top)" : undefined }}
      >
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-3 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:m-2"
        >
          {t("skipToContent")}
        </a>

        {(onToggleCollapse || !isMacElectron) && (
          <div
            className={cn(
              "flex items-center gap-2 pb-2",
              isMacElectron ? "pt-3" : "pt-5",
              collapsed ? "px-3 justify-center" : "px-4"
            )}
          >
            {/* Decorative window dots only — never wrap the collapse control in aria-hidden */}
            {!isMacElectron && (
              <div className="flex items-center gap-2" aria-hidden="true">
                <div className="w-3 h-3 rounded-full bg-[#FF5F56]" />
                <div className="w-3 h-3 rounded-full bg-[#FFBD2E]" />
                <div className="w-3 h-3 rounded-full bg-[#27C93F]" />
              </div>
            )}
            {!collapsed && <div className="flex-1" />}
            {onToggleCollapse && (
              <button
                type="button"
                onClick={onToggleCollapse}
                title={collapsed ? t("expandSidebar") : t("collapseSidebar")}
                aria-expanded={!collapsed}
                aria-label={collapsed ? t("expandSidebar") : t("collapseSidebar")}
                className={cn(
                  "rounded-md p-1 text-text-muted/50 transition-colors hover:bg-black/5 hover:text-text-muted dark:hover:bg-white/5",
                  collapsed && !isMacElectron && "mt-2",
                  isMacElectron && "ms-auto"
                )}
              >
                <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
                  {collapsed ? "chevron_right" : "chevron_left"}
                </span>
              </button>
            )}
          </div>
        )}

        {/* Brand: PM Lens pattern — Hexagon + title (Rajdhani). Default title "Cybernetics Core". */}
        <div className={cn("border-b border-border/60", collapsed ? "px-2 py-3" : "px-4 py-5")}>
          <Link
            href="/home"
            className={cn(
              "flex w-full min-w-0",
              collapsed ? "items-center justify-center" : "flex-col items-center justify-center gap-2 text-center"
            )}
            aria-label={customAppName || "Cybernetics Core"}
          >
            {customLogo ? (
              <div className="flex size-8 shrink-0 items-center justify-center rounded bg-linear-to-br from-[#00FFCC] to-[#00cca3]">
                <img
                  src={customLogo}
                  alt={customAppName || "Cybernetics Core"}
                  className="size-5 object-contain"
                />
              </div>
            ) : (
              <Hexagon
                className="shrink-0 text-primary drop-shadow-[0_0_8px_#00FFCC]"
                size={collapsed ? 28 : 32}
                strokeWidth={1.5}
                aria-hidden="true"
              />
            )}
            {!collapsed && (
              <div className="flex min-w-0 flex-col items-center">
                <h1 className="truncate text-[14px] font-bold tracking-[0.18em] text-text-main">
                  {customAppName || "Cybernetics Core"}
                </h1>
                <span className="text-[10px] tracking-[0.2em] text-text-muted">
                  v{APP_CONFIG.version}
                </span>
              </div>
            )}
          </Link>
        </div>

        <nav
          aria-label="Main navigation"
          className={cn(
            "min-h-0 flex-1 overflow-y-auto py-1 custom-scrollbar space-y-0.5",
            collapsed ? "px-2" : "px-3"
          )}
        >
          {/* Flat primary list — no collapsible section headers */}
          {allVisibleItems.map(renderNavLink)}
        </nav>

        {!isE2EMode && <CloudSyncStatus collapsed={collapsed} />}

        <div
          className={cn(
            "shrink-0 border-t border-black/5 dark:border-white/5",
            collapsed ? "p-2 flex flex-col gap-1" : "p-2 flex gap-2"
          )}
          style={{
            paddingBottom: isMacElectron ? "calc(0.5rem + var(--desktop-safe-bottom))" : undefined,
          }}
        >
          <button
            type="button"
            onClick={() => setShowRestartModal(true)}
            title={t("restart")}
            aria-label={t("restart")}
            className={cn(
              "flex items-center justify-center gap-2 rounded-lg font-medium transition-all",
              "text-amber-500 hover:bg-amber-500/10 border border-amber-500/20 hover:border-amber-500/40",
              collapsed ? "p-2" : "flex-1 min-w-0 px-2 py-1.5 text-xs"
            )}
          >
            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
              restart_alt
            </span>
            {!collapsed && <span className="truncate">{t("restart")}</span>}
          </button>
          <button
            type="button"
            onClick={() => setShowShutdownModal(true)}
            title={t("shutdown")}
            aria-label={t("shutdown")}
            className={cn(
              "flex items-center justify-center gap-2 rounded-lg font-medium transition-all",
              "text-red-500 hover:bg-red-500/10 border border-red-500/20 hover:border-red-500/40",
              collapsed ? "p-2" : "flex-1 min-w-0 px-2 py-1.5 text-xs"
            )}
          >
            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
              power_settings_new
            </span>
            {!collapsed && <span className="truncate">{t("shutdown")}</span>}
          </button>
        </div>
      </aside>

      {/* Styled tooltip for collapsed (mini) sidebar */}
      {collapsed && hoveredItem && (
        <div
          className="fixed z-[200] pointer-events-none flex items-center"
          style={{ left: hoveredItem.x, top: hoveredItem.y, transform: "translateY(-50%)" }}
        >
          <div className="w-0 h-0 border-t-[5px] border-b-[5px] border-r-[6px] border-t-transparent border-b-transparent border-r-sidebar dark:border-r-sidebar" />
          <div className="px-2.5 py-1.5 bg-sidebar text-text-main text-xs font-medium rounded-md shadow-lg border border-black/10 dark:border-white/10 whitespace-nowrap">
            {hoveredItem.label}
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={showShutdownModal}
        onClose={() => setShowShutdownModal(false)}
        onConfirm={handleShutdown}
        title={t("shutdown")}
        message={t("shutdownConfirm")}
        confirmText={t("shutdown")}
        cancelText={tc("cancel")}
        variant="danger"
        loading={isShuttingDown}
      />

      <ConfirmModal
        isOpen={showRestartModal}
        onClose={() => setShowRestartModal(false)}
        onConfirm={handleRestart}
        title={t("restart")}
        message={t("restartConfirm")}
        confirmText={t("restart")}
        cancelText={tc("cancel")}
        variant="warning"
        loading={isRestarting}
      />

      {isDisconnected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="text-center p-8">
            <div className="flex items-center justify-center size-16 rounded-full bg-red-500/20 text-red-500 mx-auto mb-4">
              <span className="material-symbols-outlined text-[32px]">power_off</span>
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">{t("serverDisconnected")}</h2>
            <p className="text-text-muted mb-6">{t("serverDisconnectedMsg")}</p>
            <Button variant="secondary" onClick={() => globalThis.location.reload()}>
              {t("reloadPage")}
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
