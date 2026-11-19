import { describe, expect, it } from "vitest";

import { checkQuota } from "./quota";

const limits = { freeSpeeches: 2, attemptsPerDay: 6, globalSpeechesPerDay: 80 };
const fresh = { freeUsed: 0, attempts24h: 0, global24h: 0 };

describe("checkQuota", () => {
  it("allows a new user and counts free speeches left", () => {
    expect(checkQuota(fresh, limits)).toEqual({ ok: true, freeLeft: 2 });
    expect(checkQuota({ ...fresh, freeUsed: 1 }, limits)).toEqual({ ok: true, freeLeft: 1 });
  });

  it("stops at the free speech limit first", () => {
    expect(checkQuota({ freeUsed: 2, attempts24h: 9, global24h: 99 }, limits)).toEqual({
      ok: false,
      code: "free_used",
      freeLeft: 0,
    });
  });

  it("stops after too many attempts in a day, failed ones included", () => {
    expect(checkQuota({ ...fresh, freeUsed: 1, attempts24h: 6 }, limits)).toMatchObject({
      ok: false,
      code: "daily_limit",
    });
  });

  it("reports busy when the site-wide cap is reached", () => {
    expect(checkQuota({ ...fresh, global24h: 80 }, limits)).toMatchObject({ ok: false, code: "busy" });
  });
});
