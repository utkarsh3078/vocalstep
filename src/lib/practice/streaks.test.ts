import { describe, expect, it } from "vitest";

import {
  addDays,
  computeStreaks,
  formatDays,
  formatMinutes,
  localDate,
  summarisePractice,
  type PracticeDay,
} from "./streaks";

const day = (date: string, minutes: number, sessions = 0): PracticeDay => ({
  date,
  seconds: minutes * 60,
  sessions,
});

describe("addDays", () => {
  it("moves across month and year ends", () => {
    expect(addDays("2026-11-30", 1)).toBe("2026-12-01");
    expect(addDays("2027-01-01", -1)).toBe("2026-12-31");
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
  });
});

describe("localDate", () => {
  // 20:00 UTC on 20 November is already 21 November in India.
  const at = new Date("2026-11-20T20:00:00Z");

  it("uses the user's time zone", () => {
    expect(localDate("Asia/Kolkata", at)).toBe("2026-11-21");
    expect(localDate("America/New_York", at)).toBe("2026-11-20");
  });

  it("falls back to India for an unknown zone", () => {
    expect(localDate("Mars/Olympus", at)).toBe("2026-11-21");
  });
});

describe("computeStreaks", () => {
  const today = "2026-11-20";

  it("is zero with no practice", () => {
    expect(computeStreaks([], today)).toEqual({ current: 0, best: 0 });
  });

  it("counts consecutive days ending today", () => {
    const days = [day("2026-11-18", 5), day("2026-11-19", 3), day("2026-11-20", 2)];
    expect(computeStreaks(days, today)).toEqual({ current: 3, best: 3 });
  });

  it("keeps the streak alive until today is over", () => {
    const days = [day("2026-11-18", 5), day("2026-11-19", 3)];
    expect(computeStreaks(days, today)).toEqual({ current: 2, best: 2 });
  });

  it("ends the streak after a missed day", () => {
    const days = [day("2026-11-17", 5), day("2026-11-18", 5)];
    expect(computeStreaks(days, today)).toEqual({ current: 0, best: 2 });
  });

  it("needs at least two minutes for a day to count", () => {
    const days = [day("2026-11-18", 5), day("2026-11-19", 1.9), day("2026-11-20", 4)];
    expect(computeStreaks(days, today)).toEqual({ current: 1, best: 1 });
  });

  it("finds the best run anywhere, in any order", () => {
    const days = [
      day("2026-11-20", 2),
      day("2026-10-03", 2),
      day("2026-10-01", 2),
      day("2026-10-02", 2),
      day("2026-10-04", 2),
    ];
    expect(computeStreaks(days, today)).toEqual({ current: 1, best: 4 });
  });

  it("runs across a month end", () => {
    const days = [day("2026-10-31", 3), day("2026-11-01", 3)];
    expect(computeStreaks(days, "2026-11-02")).toEqual({ current: 2, best: 2 });
  });
});

describe("summarisePractice", () => {
  it("adds up totals and picks out today", () => {
    const days = [day("2026-11-19", 10, 1), day("2026-11-20", 4, 2)];
    expect(summarisePractice(days, "2026-11-20")).toEqual({
      todaySeconds: 240,
      currentStreak: 2,
      bestStreak: 2,
      totalSeconds: 840,
      completedSessions: 3,
    });
  });

  it("shows nothing for today before practising", () => {
    expect(summarisePractice([day("2026-11-19", 10)], "2026-11-20").todaySeconds).toBe(0);
  });
});

describe("formatting", () => {
  it("formats minutes and hours", () => {
    expect(formatMinutes(0)).toBe("0 min");
    expect(formatMinutes(119)).toBe("1 min");
    expect(formatMinutes(3600)).toBe("1 h");
    expect(formatMinutes(7500)).toBe("2 h 5 min");
  });

  it("formats days", () => {
    expect(formatDays(1)).toBe("1 day");
    expect(formatDays(0)).toBe("0 days");
    expect(formatDays(12)).toBe("12 days");
  });
});
