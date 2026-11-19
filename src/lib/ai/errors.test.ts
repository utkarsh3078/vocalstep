import { describe, expect, it } from "vitest";

import { isBlockingFinish, isRetryableRateLimit, retryDelaySeconds } from "./errors";

describe("isBlockingFinish", () => {
  it("treats safety and policy stops as blocked", () => {
    expect(isBlockingFinish("SAFETY")).toBe(true);
    expect(isBlockingFinish("PROHIBITED_CONTENT")).toBe(true);
  });

  it("does not treat a normal or length stop as blocked", () => {
    expect(isBlockingFinish("STOP")).toBe(false);
    expect(isBlockingFinish("MAX_TOKENS")).toBe(false);
    expect(isBlockingFinish(undefined)).toBe(false);
  });
});

describe("retryDelaySeconds", () => {
  const error = '{"error":{"code":429,"details":[{"@type":"type.googleapis.com/google.rpc.RetryInfo","retryDelay":"7s"}]}}';

  it("reads the delay Google asks for", () => {
    expect(retryDelaySeconds(error, 10)).toBe(7);
  });

  it("caps long delays and defaults to the cap", () => {
    expect(retryDelaySeconds(error.replace("7s", "42.5s"), 10)).toBe(10);
    expect(retryDelaySeconds("Resource exhausted", 10)).toBe(10);
  });

  it("waits at least a second", () => {
    expect(retryDelaySeconds(error.replace("7s", "0.2s"), 10)).toBe(1);
  });
});

describe("isRetryableRateLimit", () => {
  it("retries a per-minute limit but not a daily quota", () => {
    expect(isRetryableRateLimit("Quota exceeded for GenerateRequestsPerMinutePerProjectPerModel")).toBe(true);
    expect(isRetryableRateLimit("Quota exceeded for GenerateRequestsPerDayPerProjectPerModel-FreeTier")).toBe(false);
  });
});
