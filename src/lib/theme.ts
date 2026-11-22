/**
 * The site's light and dark themes.
 *
 * The theme is a data-theme attribute on <html>. Before the first paint, the
 * inline script below sets it from the visitor's saved choice, or from their
 * device's setting when they have not chosen. The colours for each theme are
 * in src/app/globals.css.
 *
 * The choice lives only in this browser's localStorage: it is a display
 * preference, and reading a cookie on the server would make every page
 * dynamic.
 */

export const siteThemes = ["light", "dark"] as const;
export type SiteTheme = (typeof siteThemes)[number];

export const THEME_STORAGE_KEY = "vocalstep:theme";
const DARK_QUERY = "(prefers-color-scheme: dark)";

/** Accepts only a known theme; anything else (old values, edits in dev tools) is ignored. */
export function parseTheme(value: unknown): SiteTheme | null {
  return value === "light" || value === "dark" ? value : null;
}

/**
 * Runs in <head> before the page paints, so a dark page never flashes light.
 * Plain ES5 with no imports: it is sent as text. Keep it in step with
 * storedTheme() and systemTheme() below.
 */
export const themeScript = `(function(){var t;try{t=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)})}catch(e){}if(t!=="light"&&t!=="dark"){t=window.matchMedia&&window.matchMedia(${JSON.stringify(DARK_QUERY)}).matches?"dark":"light"}document.documentElement.setAttribute("data-theme",t)})()`;

/** The visitor's saved choice, or null when they have not chosen (or storage is blocked). */
export function storedTheme(): SiteTheme | null {
  try {
    return parseTheme(window.localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    return null;
  }
}

/** The device's setting. */
export function systemTheme(): SiteTheme {
  return window.matchMedia(DARK_QUERY).matches ? "dark" : "light";
}

/** The theme the page shows now. */
export function currentTheme(): SiteTheme {
  return parseTheme(document.documentElement.getAttribute("data-theme")) ?? "light";
}

export function applyTheme(theme: SiteTheme): void {
  document.documentElement.setAttribute("data-theme", theme);
}

/** Shows `theme` and remembers it as the visitor's choice. */
export function chooseTheme(theme: SiteTheme): void {
  applyTheme(theme);
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Storage blocked (private browsing): the theme still applies to this page.
  }
}

/** Calls `onChange` when the device's setting changes. Returns the unsubscribe. */
export function watchSystemTheme(onChange: () => void): () => void {
  const query = window.matchMedia(DARK_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/** Calls `onChange` when the page's theme changes. Returns the unsubscribe. */
export function watchCurrentTheme(onChange: () => void): () => void {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}
