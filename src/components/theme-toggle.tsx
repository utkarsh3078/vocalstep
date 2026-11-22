"use client";

import { Moon, Sun } from "lucide-react";
import { useLayoutEffect, useSyncExternalStore } from "react";

import {
  applyTheme,
  chooseTheme,
  currentTheme,
  storedTheme,
  systemTheme,
  watchCurrentTheme,
  watchSystemTheme,
} from "@/lib/theme";

/**
 * The header's light / dark switch. Until the visitor uses it, the site
 * follows their device's setting, including when that changes; after, their
 * choice is kept in this browser.
 */
export function ThemeToggle() {
  // Null on the server and during hydration, as the theme is only known in the browser.
  const theme = useSyncExternalStore(watchCurrentTheme, currentTheme, () => null);

  useLayoutEffect(() => {
    // The inline script in <head> sets the theme before the first paint. In
    // development, React's Strict Mode resets <html> on its second mount, so
    // apply it again (a no-op in production).
    applyTheme(storedTheme() ?? systemTheme());

    // Follow the device until the visitor makes a choice.
    return watchSystemTheme(() => {
      if (storedTheme() === null) applyTheme(systemTheme());
    });
  }, []);

  const label =
    theme === null ? "Switch theme" : theme === "dark" ? "Switch to light theme" : "Switch to dark theme";

  return (
    <button
      type="button"
      onClick={() => chooseTheme(currentTheme() === "dark" ? "light" : "dark")}
      aria-label={label}
      title={label}
      className="flex size-9 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface hover:text-ink"
    >
      {/* The icon follows the theme through CSS, so it is right from the first paint. */}
      <Moon aria-hidden="true" className="size-4 dark:hidden" strokeWidth={1.75} />
      <Sun aria-hidden="true" className="hidden size-4 dark:block" strokeWidth={1.75} />
    </button>
  );
}
