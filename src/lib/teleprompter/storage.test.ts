import { describe, expect, it } from "vitest";

import { teleprompter } from "@/config/teleprompter";

import { defaultSettings, parseProgress, parseSettings } from "./storage";

describe("parseSettings", () => {
  it("uses the defaults when nothing is stored", () => {
    expect(parseSettings(null, 130)).toEqual(defaultSettings(130));
    expect(parseSettings("junk", 130)).toEqual(defaultSettings(130));
  });

  it("keeps valid stored values", () => {
    const stored = { theme: "light", fontSize: 48, lineHeight: 1.7, wpm: 150 };
    expect(parseSettings(stored, 130)).toEqual(stored);
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
});
