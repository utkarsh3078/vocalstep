import { describe, expect, it } from "vitest";

import { parseTheme, THEME_STORAGE_KEY, themeScript } from "@/lib/theme";

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
  it("uses the saved choice over the device setting", () => {
    expect(runScript({ stored: "light", systemDark: true })).toBe("light");
    expect(runScript({ stored: "dark", systemDark: false })).toBe("dark");
  });

  it("follows the device when nothing is saved", () => {
    expect(runScript({ stored: null, systemDark: true })).toBe("dark");
    expect(runScript({ stored: null, systemDark: false })).toBe("light");
  });

  it("ignores a bad saved value", () => {
    expect(runScript({ stored: "purple", systemDark: true })).toBe("dark");
  });

  it("still sets a theme when storage is blocked", () => {
    expect(runScript({ stored: "light", systemDark: true, storageThrows: true })).toBe("dark");
  });
});
