"use client";

import { useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import PageTabBar, { type PageTabBarOption } from "@/shared/components/PageTabBar";

const SETTINGS_TABS: PageTabBarOption[] = [
  { value: "general", label: "Data & Storage", icon: "tune" },
  // Task 0061 Option B: route stays /settings/appearance; tab label is Interface
  // (theme/branding UI was removed in Task 0053 — remaining prefs are functional).
  { value: "appearance", label: "Interface", icon: "display_settings" },
  { value: "ai", label: "AI", icon: "auto_awesome" },
  { value: "routing", label: "Routing", icon: "route" },
  { value: "resilience", label: "Resilience", icon: "health_and_safety" },
  { value: "security", label: "Security", icon: "shield" },
  { value: "access-tokens", label: "Access Tokens", icon: "key" },
  { value: "feature-flags", label: "Feature Flags", icon: "flag" },
  { value: "advanced", label: "Advanced", icon: "engineering" },
  { value: "sidebar", label: "Sidebar", icon: "view_sidebar" },
];

function pathToTabValue(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean);
  const last = segments[segments.length - 1] ?? "general";
  return SETTINGS_TABS.some((t) => t.value === last) ? last : "general";
}

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const activeTab = pathToTabValue(pathname);

  const handleTabChange = useCallback(
    (value: string) => {
      router.push(`/dashboard/settings/${value}`);
    },
    [router]
  );

  return (
    <div className="space-y-6">
      <PageTabBar
        variant="subnav"
        options={SETTINGS_TABS}
        value={activeTab}
        onChange={handleTabChange}
        syncSearchParam={false}
        aria-label="Settings tabs"
      />
      {children}
    </div>
  );
}
