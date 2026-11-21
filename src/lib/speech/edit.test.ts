import { describe, expect, it } from "vitest";

import { practice } from "@/config/practice";

import { checkEdit, editProblemMessage, normaliseContent, normaliseTitle } from "./edit";

const words = (count: number) => Array.from({ length: count }, (_, i) => `word${i}`).join(" ");

describe("normaliseContent", () => {
  it("uses Unix line ends and trims trailing spaces", () => {
    expect(normaliseContent("## Intro\r\nHello there.  \r\n\r\nNext line.\t")).toBe(
      "## Intro\nHello there.\n\nNext line.",
    );
  });

  it("keeps at most one blank line in a row", () => {
    expect(normaliseContent("One.\n\n\n\nTwo.")).toBe("One.\n\nTwo.");
  });

  it("removes control characters but keeps tabs inside lines and Devanagari joiners", () => {
    expect(normaliseContent("a\u0000b\u0007c\td")).toBe("abc\td");
    expect(normaliseContent("क्‍ष")).toBe("क्‍ष");
  });
});

describe("normaliseTitle", () => {
  it("puts the title on one line with single spaces", () => {
    expect(normaliseTitle("  My \n  new\ttitle ")).toBe("My new title");
  });
});

describe("checkEdit", () => {
  it("accepts a speech and counts only spoken words", () => {
    const result = checkEdit("My title", `## Heading words here\n\n${words(25)}`);
    expect(result).toEqual({
      ok: true,
      edit: { title: "My title", content: `## Heading words here\n\n${words(25)}`, wordCount: 25 },
    });
  });

  it("treats an empty title as none, so the topic is shown", () => {
    const result = checkEdit("   ", words(30));
    expect(result.ok && result.edit.title).toBeNull();
  });

  it("refuses a speech with too few spoken words, headings not counted", () => {
    expect(checkEdit("", `## ${words(40)}\n\n${words(practice.edit.minWords - 1)}`)).toEqual({
      ok: false,
      problem: "too_short",
    });
    expect(checkEdit("", "")).toEqual({ ok: false, problem: "too_short" });
  });

  it("refuses a speech that is too long", () => {
    const long = "word ".repeat(practice.edit.maxCharacters / 5 + 10);
    expect(checkEdit("", long)).toEqual({ ok: false, problem: "too_long" });
  });

  it("refuses a title that is too long", () => {
    expect(checkEdit("t".repeat(practice.edit.maxTitleLength + 1), words(30))).toEqual({
      ok: false,
      problem: "title_too_long",
    });
  });

  it("has a message for every problem", () => {
    for (const problem of ["too_short", "too_long", "title_too_long"] as const) {
      expect(editProblemMessage(problem).length).toBeGreaterThan(10);
    }
  });
});
