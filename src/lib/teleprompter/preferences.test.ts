import { describe, expect, it } from "vitest";

import { teleprompter } from "@/config/teleprompter";

import {
  profileUpdate,
  savedSettingsSchema,
  sameSettings,
  settingsFromProfile,
  settingsToSave,
} from "./preferences";
import { defaultSettings, overlaySettings } from "./storage";

const empty = { pref_wpm: null, pref_font_size: null, pref_line_height: null };

describe("settingsFromProfile", () => {
  it("leaves out columns never saved", () => {
    expect(settingsFromProfile(empty)).toEqual({});
  });

  it("reads saved columns", () => {
    expect(settingsFromProfile({ pref_wpm: 150, pref_font_size: 40, pref_line_height: 1.7 })).toEqual({
      wpm: 150,
      fontSize: 40,
      lineHeight: 1.7,
    });
  });

  it("reads a line height sent as a string", () => {
    const row = { ...empty, pref_line_height: "1.70" as unknown as number };
    expect(settingsFromProfile(row)).toEqual({ lineHeight: 1.7 });
  });
});

describe("overlaySettings with profile settings", () => {
  const browser = { ...defaultSettings(130), fontSize: 48, wpm: 170 };

  it("lets the profile's saved settings replace the browser's", () => {
    const saved = settingsFromProfile({ ...empty, pref_wpm: 150 });
    expect(overlaySettings(browser, saved)).toEqual({ ...browser, wpm: 150 });
  });

  it("keeps the browser's settings where the profile has none", () => {
    expect(overlaySettings(browser, settingsFromProfile(empty))).toEqual(browser);
  });

  it("keeps the browser's value for a saved value outside the teleprompter's limits", () => {
    // The database allows 12–120 px; the teleprompter allows 20–72.
    const saved = settingsFromProfile({ ...empty, pref_font_size: 100, pref_line_height: 2.5 });
    expect(overlaySettings(browser, saved)).toEqual(browser);
  });

  it("ignores a theme: the teleprompter uses the site's", () => {
    expect(overlaySettings(browser, { theme: "dark", themeChosen: true })).toEqual(browser);
  });
});

describe("settingsToSave", () => {
  it("saves speed, text size and line spacing", () => {
    expect(settingsToSave(defaultSettings(130))).toEqual({ wpm: 130, fontSize: 32, lineHeight: 1.5 });
  });
});

describe("savedSettingsSchema", () => {
  const valid = { wpm: 150, fontSize: 40, lineHeight: 1.7 };

  it("accepts settings the controls can produce", () => {
    expect(savedSettingsSchema.safeParse(valid).success).toBe(true);
    for (const lineHeight of teleprompter.lineHeights) {
      expect(savedSettingsSchema.safeParse({ ...valid, lineHeight }).success).toBe(true);
    }
  });

  it("refuses values outside the teleprompter's limits", () => {
    for (const bad of [
      { ...valid, wpm: teleprompter.speed.max + 1 },
      { ...valid, wpm: 150.5 },
      { ...valid, fontSize: teleprompter.fontSize.min - 1 },
      { ...valid, lineHeight: 1.62 },
      { ...valid, theme: "dark" },
      { ...valid, fontSize: "40" },
      { ...valid, userId: "someone-else" },
      null,
    ]) {
      expect(savedSettingsSchema.safeParse(bad).success).toBe(false);
    }
  });
});

describe("profileUpdate", () => {
  it("names only the teleprompter's preference columns", () => {
    expect(profileUpdate({ wpm: 150, fontSize: 40, lineHeight: 1.7 })).toEqual({
      pref_wpm: 150,
      pref_font_size: 40,
      pref_line_height: 1.7,
    });
  });
});

describe("sameSettings", () => {
  it("compares every field", () => {
    const a = { wpm: 150, fontSize: 40, lineHeight: 1.7 };
    expect(sameSettings(a, { ...a })).toBe(true);
    expect(sameSettings(a, { ...a, lineHeight: 2 })).toBe(false);
    expect(sameSettings(a, { ...a, wpm: 160 })).toBe(false);
  });
});
