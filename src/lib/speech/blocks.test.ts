import { describe, expect, it } from "vitest";

import { parseSpeech } from "./blocks";

describe("parseSpeech", () => {
  it("parses headings and paragraphs in order", () => {
    const { blocks } = parseSpeech(
      ["## Opening", "", "Hello there friend.", "", "## Closing", "", "Thank you."].join("\n"),
    );

    expect(blocks).toEqual([
      { type: "heading", text: "Opening" },
      { type: "paragraph", words: ["Hello", "there", "friend."], startWordIndex: 0 },
      { type: "heading", text: "Closing" },
      { type: "paragraph", words: ["Thank", "you."], startWordIndex: 3 },
    ]);
  });

  it("counts spoken words only, not headings", () => {
    const { wordCount } = parseSpeech("## A Long Heading Here\n\nJust three words.");
    expect(wordCount).toBe(3);
  });

  it("gives each paragraph the index of its first word in the whole speech", () => {
    const { blocks, wordCount } = parseSpeech(
      "One two.\n\nThree four five.\n\n## Next\n\nSix.",
    );
    const starts = blocks.flatMap((block) =>
      block.type === "paragraph" ? [block.startWordIndex] : [],
    );

    expect(starts).toEqual([0, 2, 5]);
    expect(wordCount).toBe(6);
  });

  it("joins the lines of one paragraph", () => {
    const { blocks } = parseSpeech("First line\nsecond line\n\nNew paragraph");
    expect(blocks).toEqual([
      { type: "paragraph", words: ["First", "line", "second", "line"], startWordIndex: 0 },
      { type: "paragraph", words: ["New", "paragraph"], startWordIndex: 4 },
    ]);
  });

  it("starts a new block at a heading even without a blank line", () => {
    const { blocks } = parseSpeech("Some text\n## Heading\nMore text");
    expect(blocks.map((block) => block.type)).toEqual(["paragraph", "heading", "paragraph"]);
  });

  it("accepts any heading level and trailing hashes", () => {
    const { blocks } = parseSpeech("# Title\n\n### Sub ###\n\nText");
    expect(blocks.slice(0, 2)).toEqual([
      { type: "heading", text: "Title" },
      { type: "heading", text: "Sub" },
    ]);
  });

  it("does not treat a hash without a space as a heading", () => {
    const { blocks } = parseSpeech("#hashtag is a word");
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe("paragraph");
  });

  it("turns list items into separate paragraphs without their markers", () => {
    const { blocks } = parseSpeech("- first point\n- second point\n1. third point");
    expect(blocks).toEqual([
      { type: "paragraph", words: ["first", "point"], startWordIndex: 0 },
      { type: "paragraph", words: ["second", "point"], startWordIndex: 2 },
      { type: "paragraph", words: ["third", "point"], startWordIndex: 4 },
    ]);
  });

  it("drops bold, italic and code markers", () => {
    const { blocks } = parseSpeech("## **Bold Heading**\n\nThis is **very** *important* `code`.");
    expect(blocks).toEqual([
      { type: "heading", text: "Bold Heading" },
      {
        type: "paragraph",
        words: ["This", "is", "very", "important", "code."],
        startWordIndex: 0,
      },
    ]);
  });

  it("skips horizontal rules", () => {
    const { blocks } = parseSpeech("Before\n\n---\n\nAfter");
    expect(blocks).toHaveLength(2);
  });

  it("handles Windows line endings", () => {
    const { blocks, wordCount } = parseSpeech("## Heading\r\n\r\nOne two.\r\n\r\nThree.");
    expect(blocks).toHaveLength(3);
    expect(wordCount).toBe(3);
  });

  it("parses Devanagari text", () => {
    const { blocks, wordCount } = parseSpeech("## शुरुआत\n\nनमस्ते, आप कैसे हैं?");
    expect(blocks[0]).toEqual({ type: "heading", text: "शुरुआत" });
    expect(wordCount).toBe(4);
  });

  it("returns nothing for empty input", () => {
    expect(parseSpeech("")).toEqual({ blocks: [], wordCount: 0 });
    expect(parseSpeech("\n\n  \n")).toEqual({ blocks: [], wordCount: 0 });
  });
});
