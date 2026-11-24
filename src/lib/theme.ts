/**
 * The site's light and dark themes. The teleprompter uses the same theme.
 *
 * The theme is a data-theme attribute on <html>. Before the first paint, the
 * inline script below sets it from the visitor's saved choice, or light when
 * they have not chosen. The colours for each theme are in src/app/globals.css.
 *
 * The choice is kept in this browser's localStorage, so the page paints in the
 * right theme straight away (reading a cookie on the server would make every
 * page dynamic). For a signed-in user it is also saved to their profile, and
 * the profile's choice is applied when they sign in (see AccountTheme).
 */

export const siteThemes = ["light", "dark"] as const;
export type SiteTheme = (typeof siteThemes)[number];

export const THEME_STORAGE_KEY = "vocalstep:theme";
export const DEFAULT_THEME: SiteTheme = "light";
/** Sent on window when the visitor picks a theme, so a signed-in user's choice can be saved. */
const THEME_CHOICE_EVENT = "vocalstep:themechoice";

/** Accepts only a known theme; anything else (old values, edits in dev tools) is ignored. */
export function parseTheme(value: unknown): SiteTheme | null {
  return value === "light" || value === "dark" ? value : null;
}

/**
 * Runs in <head> before the page paints, so a dark page never flashes light.
 * Plain ES5 with no imports: it is sent as text. Keep it in step with
 * storedTheme() below.
 */
export const themeScript = `(function(){var t;try{t=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)})}catch(e){}if(t!=="light"&&t!=="dark"){t=${JSON.stringify(DEFAULT_THEME)}}document.documentElement.setAttribute("data-theme",t)})()`;

/** The visitor's saved choice, or null when they have not chosen (or storage is blocked). */
export function storedTheme(): SiteTheme | null {
  try {
    return parseTheme(window.localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    return null;
  }
}

/** The theme the page shows now. */
export function currentTheme(): SiteTheme {
  return parseTheme(document.documentElement.getAttribute("data-theme")) ?? DEFAULT_THEME;
}

export function applyTheme(theme: SiteTheme): void {
  document.documentElement.setAttribute("data-theme", theme);
}

/** Shows `theme` and keeps it in this browser, without announcing it as a new choice. */
export function rememberTheme(theme: SiteTheme): void {
  applyTheme(theme);
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Storage blocked (private browsing): the theme still applies to this page.
  }
}

/** The visitor picked `theme` (the header's or the teleprompter's theme button). */
export function chooseTheme(theme: SiteTheme): void {
  rememberTheme(theme);
  window.dispatchEvent(new CustomEvent<SiteTheme>(THEME_CHOICE_EVENT, { detail: theme }));
}

/** Calls `onChoice` each time the visitor picks a theme. Returns the unsubscribe. */
export function watchThemeChoice(onChoice: (theme: SiteTheme) => void): () => void {
  const handle = (event: Event) => {
    const theme = parseTheme((event as CustomEvent<unknown>).detail);
    if (theme) onChoice(theme);
  };
  window.addEventListener(THEME_CHOICE_EVENT, handle);
  return () => window.removeEventListener(THEME_CHOICE_EVENT, handle);
}

/** Calls `onChange` when the page's theme changes. Returns the unsubscribe. */
export function watchCurrentTheme(onChange: () => void): () => void {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}
