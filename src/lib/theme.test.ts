import { afterEach, describe, expect, it, vi } from "vitest";

import {
  chooseTheme,
  parseTheme,
  rememberTheme,
  THEME_STORAGE_KEY,
  themeScript,
  watchThemeChoice,
} from "@/lib/theme";

/** Runs the inline theme script against a fake browser and returns the theme it set. */
function runScript({ stored, systemDark, storageThrows = false }: {
  stored: string | null;
  systemDark: boolean;
  storageThrows?: boolean;
}): string | undefined {
  const attributes: Record<string, string> = {};
  const localStorage = {
    getItem(key: string) {
      if (storageThrows) throw new Error("blocked");
      return key === THEME_STORAGE_KEY ? stored : null;
    },
  };
  const document = {
    documentElement: {
      setAttribute(name: string, value: string) {
        attributes[name] = value;
      },
    },
  };
  const window = { matchMedia: () => ({ matches: systemDark }) };
  new Function("localStorage", "document", "window", themeScript)(localStorage, document, window);
  return attributes["data-theme"];
}

describe("parseTheme", () => {
  it("accepts the two themes", () => {
    expect(parseTheme("light")).toBe("light");
    expect(parseTheme("dark")).toBe("dark");
  });

  it("rejects anything else", () => {
    for (const value of [null, undefined, "", "Dark", "system", 1, {}]) {
      expect(parseTheme(value)).toBeNull();
    }
  });
});

describe("themeScript", () => {
  it("uses the saved choice, whatever the device setting", () => {
    expect(runScript({ stored: "light", systemDark: true })).toBe("light");
    expect(runScript({ stored: "dark", systemDark: false })).toBe("dark");
  });

  it("opens light when nothing is saved, even on a dark device", () => {
    expect(runScript({ stored: null, systemDark: true })).toBe("light");
    expect(runScript({ stored: null, systemDark: false })).toBe("light");
  });

  it("ignores a bad saved value", () => {
    expect(runScript({ stored: "purple", systemDark: true })).toBe("light");
  });

  it("still sets a theme when storage is blocked", () => {
    expect(runScript({ stored: "dark", systemDark: true, storageThrows: true })).toBe("light");
  });
});

describe("choosing a theme", () => {
  /** A fake browser: <html>, localStorage and window events. */
  function fakeBrowser() {
    const attributes: Record<string, string> = {};
    const storage = new Map<string, string>();
    vi.stubGlobal("document", {
      documentElement: {
        setAttribute: (name: string, value: string) => (attributes[name] = value),
        getAttribute: (name: string) => attributes[name] ?? null,
      },
    });
    const events = new EventTarget();
    vi.stubGlobal("window", {
      localStorage: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => storage.set(key, value),
      },
      addEventListener: events.addEventListener.bind(events),
      removeEventListener: events.removeEventListener.bind(events),
      dispatchEvent: events.dispatchEvent.bind(events),
    });
    return { attributes, storage };
  }

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows and keeps the visitor's choice, and announces it", () => {
    const { attributes, storage } = fakeBrowser();
    const choices: string[] = [];
    const stop = watchThemeChoice((theme) => choices.push(theme));

    chooseTheme("dark");
    expect(attributes["data-theme"]).toBe("dark");
    expect(storage.get(THEME_STORAGE_KEY)).toBe("dark");
    expect(choices).toEqual(["dark"]);

    stop();
    chooseTheme("light");
    expect(choices).toEqual(["dark"]);
  });

  it("applies a theme saved to the account without announcing it as a new choice", () => {
    const { attributes, storage } = fakeBrowser();
    const choices: string[] = [];
    const stop = watchThemeChoice((theme) => choices.push(theme));

    rememberTheme("dark");
    expect(attributes["data-theme"]).toBe("dark");
    expect(storage.get(THEME_STORAGE_KEY)).toBe("dark");
    expect(choices).toEqual([]);
    stop();
  });
});
