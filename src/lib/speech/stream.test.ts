import { describe, expect, it } from "vitest";

import { applyEvent, decodeEvents, encodeEvent, toMarkdown, type StreamedSpeech } from "./stream";

describe("encodeEvent and decodeEvents", () => {
  it("round-trips events split across chunks", () => {
    const text =
      encodeEvent({ type: "section", index: 0, heading: "Opening" }) +
      encodeEvent({ type: "delta", index: 0, text: "Hello\nthere" });
    const first = decodeEvents(text.slice(0, 30));
    const second = decodeEvents(first.rest + text.slice(30));

    expect([...first.events, ...second.events]).toEqual([
      { type: "section", index: 0, heading: "Opening" },
      { type: "delta", index: 0, text: "Hello\nthere" },
    ]);
    expect(second.rest).toBe("");
  });

  it("skips unreadable lines", () => {
    expect(decodeEvents('not json\n{"type":"done","speechId":"x","wordCount":3}\n').events).toEqual([
      { type: "done", speechId: "x", wordCount: 3 },
    ]);
  });
});

describe("applyEvent", () => {
  it("builds the speech, letting final text replace streamed text", () => {
    let speech: StreamedSpeech = { sections: [] };
    speech = applyEvent(speech, { type: "meta", speechId: "id", title: "Rain", outline: [] });
    speech = applyEvent(speech, { type: "section", index: 0, heading: "Opening" });
    speech = applyEvent(speech, { type: "delta", index: 0, text: "**Hel" });
    speech = applyEvent(speech, { type: "delta", index: 0, text: "lo**" });
    expect(speech.sections[0].text).toBe("**Hello**");

    speech = applyEvent(speech, { type: "section_text", index: 0, text: "Hello" });
    expect(speech).toEqual({ speechId: "id", title: "Rain", sections: [{ heading: "Opening", text: "Hello" }] });
    expect(toMarkdown(speech)).toBe("## Opening\n\nHello");
  });

  it("ignores text for a section that has not started", () => {
    const speech = { sections: [] };
    expect(applyEvent(speech, { type: "delta", index: 2, text: "x" })).toBe(speech);
  });
});
