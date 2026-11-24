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

const empty = { pref_wpm: null, pref_font_size: null, pref_line_height: null, pref_theme: null };

describe("settingsFromProfile", () => {
  it("leaves out columns never saved", () => {
    expect(settingsFromProfile(empty)).toEqual({});
  });

  it("reads saved columns, and a saved theme as a choice", () => {
    expect(
      settingsFromProfile({ pref_wpm: 150, pref_font_size: 40, pref_line_height: 1.7, pref_theme: "dark" }),
    ).toEqual({ wpm: 150, fontSize: 40, lineHeight: 1.7, theme: "dark", themeChosen: true });
  });

  it("reads a line height sent as a string", () => {
    const row = { ...empty, pref_line_height: "1.70" as unknown as number };
    expect(settingsFromProfile(row)).toEqual({ lineHeight: 1.7 });
  });
});

describe("overlaySettings with profile settings", () => {
  const browser = { ...defaultSettings(130), fontSize: 48, wpm: 170 };

  it("lets the profile's saved settings replace the browser's", () => {
    const saved = settingsFromProfile({ ...empty, pref_wpm: 150, pref_theme: "dark" });
    expect(overlaySettings(browser, saved)).toEqual({
      ...browser,
      wpm: 150,
      theme: "dark",
      themeChosen: true,
    });
  });

  it("keeps the browser's settings where the profile has none", () => {
    expect(overlaySettings(browser, settingsFromProfile(empty))).toEqual(browser);
  });

  it("keeps the browser's value for a saved value outside the teleprompter's limits", () => {
    // The database allows 12–120 px; the teleprompter allows 20–72.
    const saved = settingsFromProfile({ ...empty, pref_font_size: 100, pref_line_height: 2.5 });
    expect(overlaySettings(browser, saved)).toEqual(browser);
  });

  it("keeps a chosen browser theme when the profile has none", () => {
    const chosen = { ...browser, theme: "dark" as const, themeChosen: true };
    expect(overlaySettings(chosen, settingsFromProfile({ ...empty, pref_wpm: 150 }))).toEqual({
      ...chosen,
      wpm: 150,
    });
  });
});

describe("settingsToSave", () => {
  it("saves the theme only once it has been chosen", () => {
    const settings = { ...defaultSettings(130), theme: "dark" as const };
    expect(settingsToSave(settings)).toEqual({ wpm: 130, fontSize: 32, lineHeight: 1.5 });
    expect(settingsToSave({ ...settings, themeChosen: true })).toEqual({
      wpm: 130,
      fontSize: 32,
      lineHeight: 1.5,
      theme: "dark",
    });
  });
});

describe("savedSettingsSchema", () => {
  const valid = { wpm: 150, fontSize: 40, lineHeight: 1.7, theme: "light" };

  it("accepts settings the controls can produce", () => {
    expect(savedSettingsSchema.safeParse(valid).success).toBe(true);
    expect(savedSettingsSchema.safeParse({ ...valid, theme: undefined }).success).toBe(true);
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
      { ...valid, theme: "purple" },
      { ...valid, fontSize: "40" },
      { ...valid, userId: "someone-else" },
      null,
    ]) {
      expect(savedSettingsSchema.safeParse(bad).success).toBe(false);
    }
  });
});

describe("profileUpdate", () => {
  it("names only the preference columns, and the theme only when given", () => {
    expect(profileUpdate({ wpm: 150, fontSize: 40, lineHeight: 1.7 })).toEqual({
      pref_wpm: 150,
      pref_font_size: 40,
      pref_line_height: 1.7,
    });
    expect(profileUpdate({ wpm: 150, fontSize: 40, lineHeight: 1.7, theme: "dark" })).toEqual({
      pref_wpm: 150,
      pref_font_size: 40,
      pref_line_height: 1.7,
      pref_theme: "dark",
    });
  });
});

describe("sameSettings", () => {
  it("compares every field", () => {
    const a = { wpm: 150, fontSize: 40, lineHeight: 1.7 };
    expect(sameSettings(a, { ...a })).toBe(true);
    expect(sameSettings(a, { ...a, theme: "dark" })).toBe(false);
    expect(sameSettings(a, { ...a, wpm: 160 })).toBe(false);
  });
});
