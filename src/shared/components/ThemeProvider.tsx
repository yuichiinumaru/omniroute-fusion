"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";
import useThemeStore from "@/store/themeStore";

/**
 * ThemeProvider — dark-only, coreCyan-accent wrapper (Task 0053 / 0055).
 *
 * The app is locked to dark mode. On mount this provider:
 * 1. Ensures `class="dark"` on <html> (required by @custom-variant dark in globals.css)
 * 2. Applies the coreCyan accent to CSS variables
 *
 * All light/dark toggling and color-preset customization has been removed.
 * The SSR-safe `className="dark"` on <html> in layout.tsx covers first paint;
 * initTheme() re-asserts the class client-side as a belt-and-suspenders.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const { initTheme } = useThemeStore();

  useEffect(() => {
    initTheme();
  }, [initTheme]);

  return <>{children}</>;
}
