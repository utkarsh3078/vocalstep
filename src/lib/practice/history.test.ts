import { describe, expect, it } from "vitest";

import {
  formatPracticeTime,
  latestPerTarget,
  pageCount,
  pageRange,
  parsePage,
  practiceStatusLabel,
  sessionStatusLabel,
  summariseSpeechPractice,
  type SessionRow,
} from "./history";

const session = (overrides: Partial<SessionRow>): SessionRow => ({
  id: "s1",
  status: "abandoned",
  speechVersion: 1,
  activeSeconds: 0,
  wordIndex: 0,
  progress: 0,
  lastActiveAt: "2026-11-20T10:00:00Z",
  ...overrides,
});

describe("summariseSpeechPractice", () => {
  it("describes a speech never practised", () => {
    const summary = summariseSpeechPractice([], 1);
    expect(summary).toEqual({
      activeSeconds: 0,
      timesCompleted: 0,
      lastPractisedAt: null,
      open: null,
      openProgress: null,
    });
    expect(practiceStatusLabel(summary)).toBe("Not practised yet");
  });

  it("adds up time and completions over every session", () => {
    const summary = summariseSpeechPractice(
      [
        session({ id: "a", status: "completed", activeSeconds: 300, lastActiveAt: "2026-11-18T10:00:00Z" }),
        session({ id: "b", status: "completed", activeSeconds: 280, lastActiveAt: "2026-11-20T09:00:00Z" }),
        session({ id: "c", status: "abandoned", activeSeconds: 40, lastActiveAt: "2026-11-19T10:00:00Z" }),
      ],
      1,
    );
    expect(summary.activeSeconds).toBe(620);
    expect(summary.timesCompleted).toBe(2);
    expect(summary.lastPractisedAt).toBe("2026-11-20T09:00:00Z");
    expect(summary.open).toBeNull();
    expect(practiceStatusLabel(summary)).toBe("Completed 2 times");
  });

  it("offers the unfinished session on the current version for resuming", () => {
    const summary = summariseSpeechPractice(
      [
        session({ id: "done", status: "completed", activeSeconds: 300 }),
        session({
          id: "open",
          status: "in_progress",
          activeSeconds: 90,
          wordIndex: 200,
          progress: 0.42,
          lastActiveAt: "2026-11-21T08:00:00Z",
        }),
      ],
      1,
    );
    expect(summary.open).toEqual({
      id: "open",
      wordIndex: 200,
      activeSeconds: 90,
      lastActiveAt: "2026-11-21T08:00:00Z",
    });
    expect(practiceStatusLabel(summary)).toBe("In progress (42%)");
  });

  it("does not resume a session on an older version of an edited speech", () => {
    const summary = summariseSpeechPractice(
      [session({ status: "in_progress", speechVersion: 1, activeSeconds: 60 })],
      2,
    );
    expect(summary.open).toBeNull();
    expect(summary.activeSeconds).toBe(60);
    expect(practiceStatusLabel(summary)).toBe("Started, not finished");
  });

  it("does not count a session started but never practised as practice", () => {
    const summary = summariseSpeechPractice([session({ status: "abandoned", activeSeconds: 0 })], 1);
    expect(summary.lastPractisedAt).toBeNull();
    expect(practiceStatusLabel(summary)).toBe("Not practised yet");
  });

  it("says once for a single completion", () => {
    const summary = summariseSpeechPractice([session({ status: "completed", activeSeconds: 200 })], 1);
    expect(practiceStatusLabel(summary)).toBe("Completed once");
  });
});

describe("sessionStatusLabel", () => {
  it("describes one session", () => {
    expect(sessionStatusLabel("completed", 1, false)).toBe("Completed");
    expect(sessionStatusLabel("in_progress", 0.425, true)).toBe("In progress (42%)");
    expect(sessionStatusLabel("abandoned", 0.3, false)).toBe("Stopped at 30%");
  });

  it("treats an open session that can no longer be resumed as stopped", () => {
    expect(sessionStatusLabel("in_progress", 0.5, false)).toBe("Stopped at 50%");
  });
});

describe("latestPerTarget", () => {
  const rows = [
    { id: 1, targetKey: "speech:a" },
    { id: 2, targetKey: "sample:x" },
    { id: 3, targetKey: "speech:a" },
    { id: 4, targetKey: "speech:b" },
    { id: 5, targetKey: "speech:c" },
  ];

  it("keeps only the newest row for each speech or sample", () => {
    expect(latestPerTarget(rows, 10).map((row) => row.id)).toEqual([1, 2, 4, 5]);
  });

  it("stops at the limit", () => {
    expect(latestPerTarget(rows, 2).map((row) => row.id)).toEqual([1, 2]);
  });

  it("handles an empty list", () => {
    expect(latestPerTarget([], 5)).toEqual([]);
  });
});

describe("formatPracticeTime", () => {
  it("formats list practice times", () => {
    expect(formatPracticeTime(0)).toBe("None");
    expect(formatPracticeTime(45)).toBe("Under 1 min");
    expect(formatPracticeTime(60)).toBe("1 min");
    expect(formatPracticeTime(125 * 60)).toBe("2 h 5 min");
  });
});

describe("pagination", () => {
  it("reads a page number from the URL", () => {
    expect(parsePage(undefined)).toBe(1);
    expect(parsePage("1")).toBe(1);
    expect(parsePage("3")).toBe(3);
    expect(parsePage("10000")).toBe(10000);
  });

  it("treats anything else as page 1", () => {
    for (const value of ["", "0", "-2", "2.5", "abc", "1e3", " 2", "10001", "999999999"]) {
      expect(parsePage(value)).toBe(1);
    }
  });

  it("works out each page's rows", () => {
    expect(pageRange(1, 10)).toEqual({ from: 0, to: 9 });
    expect(pageRange(3, 10)).toEqual({ from: 20, to: 29 });
  });

  it("counts pages, with at least one", () => {
    expect(pageCount(0, 10)).toBe(1);
    expect(pageCount(10, 10)).toBe(1);
    expect(pageCount(11, 10)).toBe(2);
  });
});
