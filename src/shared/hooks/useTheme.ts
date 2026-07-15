"use client";

import { useEffect } from "react";
import useThemeStore from "@/store/themeStore";

/**
 * useTheme hook — dark-only shim (Task 0053).
 *
 * The app is locked to dark mode with the coreCyan accent. This hook is kept
 * so existing call sites (`DefaultToolCard`) compile, but it now always
 * reports dark mode. The legacy system-theme subscription and set/toggle
 * actions were removed when the theme store was stripped to dark-only.
 *
 * @returns {{ theme: "dark", isDark: true }} Always dark — UI controls removed.
 */
export function useTheme() {
  const { initTheme } = useThemeStore();

  // Apply the coreCyan CSS vars once on mount (no-op on the server).
  useEffect(() => {
    initTheme();
  }, [initTheme]);

  return {
    theme: "dark" as const,
    isDark: true,
  };
}
