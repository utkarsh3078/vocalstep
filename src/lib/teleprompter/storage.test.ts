import { describe, expect, it } from "vitest";

import { teleprompter } from "@/config/teleprompter";

import { defaultSettings, parseProgress, parseSettings } from "./storage";

describe("parseSettings", () => {
  it("uses the defaults when nothing is stored", () => {
    expect(parseSettings(null, 130)).toEqual(defaultSettings(130));
    expect(parseSettings("junk", 130)).toEqual(defaultSettings(130));
  });

  it("keeps valid stored values", () => {
    const stored = { theme: "dark", themeChosen: true, fontSize: 48, lineHeight: 1.7, wpm: 150 };
    expect(parseSettings(stored, 130)).toEqual(stored);
  });

  it("starts light, to match the site", () => {
    expect(defaultSettings(130).theme).toBe("light");
  });

  it("ignores a theme saved without being chosen (the old dark default)", () => {
    const parsed = parseSettings({ theme: "dark", fontSize: 48, lineHeight: 1.7, wpm: 150 }, 130);
    expect(parsed).toEqual({ ...defaultSettings(130), fontSize: 48, lineHeight: 1.7, wpm: 150 });
  });

  it("replaces only the invalid fields", () => {
    const parsed = parseSettings(
      { theme: "purple", fontSize: 9000, lineHeight: 1.62, wpm: 150 },
      130,
    );

    expect(parsed).toEqual({ ...defaultSettings(130), wpm: 150 });
  });

  it("keeps a stored speed within the limits", () => {
    expect(parseSettings({ wpm: 5000 }, 130).wpm).toBe(teleprompter.speed.max);
  });
});

describe("parseProgress", () => {
  const saved = { wordCount: 650, wordIndex: 120, activeSeconds: 61.5 };

  it("returns valid saved progress", () => {
    expect(parseProgress(saved, 650)).toEqual(saved);
  });

  it("ignores progress saved for a different version of the text", () => {
    expect(parseProgress(saved, 651)).toBeNull();
  });

  it("rejects malformed values", () => {
    expect(parseProgress(null, 650)).toBeNull();
    expect(parseProgress([], 650)).toBeNull();
    expect(parseProgress({ ...saved, wordIndex: -1 }, 650)).toBeNull();
    expect(parseProgress({ ...saved, wordIndex: 650 }, 650)).toBeNull();
    expect(parseProgress({ ...saved, wordIndex: 1.5 }, 650)).toBeNull();
    expect(parseProgress({ ...saved, activeSeconds: "60" }, 650)).toBeNull();
    expect(parseProgress({ ...saved, activeSeconds: -1 }, 650)).toBeNull();
  });

  it("keeps the save time and session id when they are valid", () => {
    const sessionId = "0b8d6f2e-4a51-4c7e-9a0d-3f1e2b7c9d10";
    expect(parseProgress({ ...saved, savedAt: 1_800_000_000_000, sessionId }, 650)).toEqual({
      ...saved,
      savedAt: 1_800_000_000_000,
      sessionId,
    });
  });

  it("drops an invalid save time or session id but keeps the position", () => {
    expect(parseProgress({ ...saved, savedAt: "yesterday", sessionId: "../../x" }, 650)).toEqual(saved);
  });
});
