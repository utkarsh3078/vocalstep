import { describe, expect, it } from "vitest";

import { isOfferedLanguage, offeredLanguages, practice } from "./practice";

describe("offered languages", () => {
  it("offers English and, for now, not Hindi", () => {
    expect(offeredLanguages).toEqual(["en"]);
    expect(isOfferedLanguage("en")).toBe(true);
    expect(isOfferedLanguage("hi")).toBe(false);
    expect(isOfferedLanguage("xx")).toBe(false);
    expect(isOfferedLanguage(undefined)).toBe(false);
  });

  it("keeps Hindi configured, so speeches already written in it still display", () => {
    expect(practice.languages.hi.label).toBe("Hindi");
  });

  it("offers the default language", () => {
    expect(isOfferedLanguage(practice.defaultLanguage)).toBe(true);
  });
});
