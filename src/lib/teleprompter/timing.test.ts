import { describe, expect, it } from "vitest";

import { teleprompter } from "@/config/teleprompter";

import {
  canFinish,
  clampSpeed,
  formatClock,
  formatPercent,
  progressAt,
  remainingSeconds,
  stepFontSize,
  stepLineHeight,
  stepSpeed,
} from "./timing";

describe("remainingSeconds", () => {
  it("is the words left divided by the speed", () => {
    expect(remainingSeconds(0, 650, 130)).toBe(300);
    expect(remainingSeconds(390, 650, 130)).toBe(120);
  });

  it("follows the current speed, not the chosen duration", () => {
    expect(remainingSeconds(0, 650, 65)).toBe(600);
  });

  it("is 0 at or past the end, and with no speed", () => {
    expect(remainingSeconds(650, 650, 130)).toBe(0);
    expect(remainingSeconds(700, 650, 130)).toBe(0);
    expect(remainingSeconds(0, 650, 0)).toBe(0);
  });
});

describe("progressAt and canFinish", () => {
  it("is the fraction of words read, from 0 to 1", () => {
    expect(progressAt(0, 200)).toBe(0);
    expect(progressAt(50, 200)).toBe(0.25);
    expect(progressAt(250, 200)).toBe(1);
    expect(progressAt(-3, 200)).toBe(0);
    expect(progressAt(3, 0)).toBe(0);
  });

  it("allows Finish from 90%", () => {
    expect(canFinish(0.89)).toBe(false);
    expect(canFinish(0.9)).toBe(true);
    expect(canFinish(1)).toBe(true);
  });
});

describe("formatPercent", () => {
  it("rounds down and keeps 100% for the real end", () => {
    expect(formatPercent(0)).toBe("0%");
    expect(formatPercent(0.456)).toBe("45%");
    expect(formatPercent(0.999)).toBe("99%");
    expect(formatPercent(1)).toBe("100%");
  });
});

describe("formatClock", () => {
  it("shows minutes and seconds", () => {
    expect(formatClock(0)).toBe("0:00");
    expect(formatClock(7.9)).toBe("0:07");
    expect(formatClock(247)).toBe("4:07");
  });

  it("adds hours when needed", () => {
    expect(formatClock(3725)).toBe("1:02:05");
  });

  it("never shows a negative time", () => {
    expect(formatClock(-5)).toBe("0:00");
  });
});

describe("speed steps", () => {
  const { min, max, step } = teleprompter.speed;

  it("moves one step at a time", () => {
    expect(stepSpeed(130, 1)).toBe(130 + step);
    expect(stepSpeed(130, -1)).toBe(130 - step);
  });

  it("stays within the limits", () => {
    expect(stepSpeed(max, 1)).toBe(max);
    expect(stepSpeed(min, -1)).toBe(min);
    expect(clampSpeed(5000)).toBe(max);
    expect(clampSpeed(Number.NaN)).toBe(min);
  });

  it("snaps an odd speed onto a step", () => {
    expect(clampSpeed(133) % step).toBe(0);
  });
});

describe("display steps", () => {
  const { min, max, step } = teleprompter.fontSize;

  it("changes the text size within its limits", () => {
    expect(stepFontSize(32, 1)).toBe(32 + step);
    expect(stepFontSize(max, 1)).toBe(max);
    expect(stepFontSize(min, -1)).toBe(min);
  });

  it("walks the line spacing options", () => {
    const options = teleprompter.lineHeights;
    expect(stepLineHeight(options[0], 1)).toBe(options[1]);
    expect(stepLineHeight(options[0], -1)).toBe(options[0]);
    expect(stepLineHeight(options[options.length - 1], 1)).toBe(options[options.length - 1]);
  });
});
