import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { displayStatus } = await import("./data");

describe("displayStatus", () => {
  const start = "2026-11-20T10:00:00Z";
  const at = (minutes: number) => Date.parse(start) + minutes * 60_000;

  it("shows ready and failed speeches as they are", () => {
    expect(displayStatus("ready", start, at(500))).toBe("ready");
    expect(displayStatus("failed", start, at(1))).toBe("failed");
  });

  it("shows a speech as being written for 15 minutes, then as failed", () => {
    expect(displayStatus("generating", start, at(14))).toBe("generating");
    expect(displayStatus("generating", start, at(15))).toBe("failed");
  });
});
