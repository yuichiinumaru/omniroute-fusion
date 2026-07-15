"use client";

import { create } from "zustand";

/**
 * Theme store — dark-only with fixed coreCyan accent (Task 0053).
 *
 * All theme/color/branding customization has been removed from the UI.
 * The store retains the dark-only defaults and a single `initTheme()`
 * helper that applies coreCyan to CSS variables at startup. The legacy
 * toggle / color-picker / persist methods were removed in Task 0053.
 */
interface ThemeState {
  theme: string;
  colorTheme: string;
  customColor: string;
  initTheme: () => void;
}

const useThemeStore = create<ThemeState>()(() => ({
  // Dark-only — always coreCyan. These defaults are the only truth.
  theme: "dark",
  colorTheme: "coreCyan",
  customColor: "#00FFCC",

  initTheme: () => {
    // Apply coreCyan primary to CSS variables. globals.css already sets the
    // defaults; this ensures any stale persisted values are overridden.
    // Also ensure the Tailwind dark-mode class is present: @custom-variant dark
    // is scoped to `.dark` (see globals.css), and the app is dark-only.
    if (typeof window === "undefined") return;
    const root = document.documentElement;
    root.classList.add("dark");
    root.style.setProperty("--color-primary", "#00FFCC");
    root.style.setProperty("--color-primary-hover", "#00cca3");
  },
}));

export default useThemeStore;
