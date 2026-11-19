import { describe, expect, it } from "vitest";

import { createMockWriter } from "@/lib/ai/mock";
import type { SpeechWriter } from "@/lib/ai/types";

import { generateSpeech, type PipelineEvent } from "./generate";

/** The mock writer with no delay, counting every AI request made. */
function countingWriter() {
  const writer = createMockWriter({ delayMs: 0 });
  const calls = { outline: 0, section: 0, extend: 0 };
  const counted: SpeechWriter = {
    model: writer.model,
    outline: (request) => (calls.outline++, writer.outline(request)),
    section: (request) => (calls.section++, writer.section(request)),
    extend: (request) => (calls.extend++, writer.extend(request)),
  };
  return { writer: counted, calls, total: () => calls.outline + calls.section + calls.extend };
}

async function run(topic: string, minutes = 5, language: "en" | "hi" = "en") {
  const { writer, calls, total } = countingWriter();
  const events: PipelineEvent[] = [];
  for await (const event of generateSpeech(writer, { topic, language, difficulty: "beginner", minutes })) {
    events.push(event);
  }
  const last = events[events.length - 1];
  return { events, last, calls, requests: total() };
}

describe("generateSpeech", () => {
  it("writes a 5-minute speech in 3 requests, close to its word target", async () => {
    const { events, last, requests } = await run("How rain forms");

    expect(requests).toBe(3);
    expect(events[0]).toMatchObject({ type: "outline", title: "Practice speech: How rain forms" });
    expect(last.type).toBe("complete");
    if (last.type === "complete") {
      expect(last.wordCount).toBeGreaterThanOrEqual(585);
      expect(last.wordCount).toBeLessThanOrEqual(715);
      expect(last.content.match(/^## /gm)).toHaveLength(2);
      expect(last.usage.input).toBeGreaterThan(0);
      expect(last.usage.output).toBeGreaterThan(0);
    }
  });

  it("writes a 15-minute speech in 6 requests", async () => {
    const { last, requests } = await run("How rain forms", 15);
    expect(requests).toBe(6);
    expect(last.type === "complete" && last.wordCount).toBeGreaterThanOrEqual(1755);
  });

  it("streams text, then gives each section's final text", async () => {
    const { events } = await run("How rain forms");
    const firstDelta = events.findIndex((event) => event.type === "delta" && event.index === 0);
    const firstFinal = events.findIndex((event) => event.type === "section_text" && event.index === 0);
    expect(firstDelta).toBeGreaterThan(0);
    expect(firstFinal).toBeGreaterThan(firstDelta);
  });

  it("stops a refused topic after the outline, with the reason", async () => {
    const { events, requests } = await run("[refuse] Who should win the election");
    expect(requests).toBe(1);
    expect(events).toEqual([
      { type: "failed", code: "refused", reason: "politics", usage: expect.any(Object) },
    ]);
  });

  it.each([
    ["[block]", "blocked"],
    ["[busy]", "busy"],
    ["[invalid]", "failed"],
  ])("reports %s from the outline as %s", async (marker, code) => {
    const { last, requests } = await run(`${marker} How rain forms`);
    expect(requests).toBe(1);
    expect(last).toMatchObject({ type: "failed", code });
  });

  it("stops when a section fails part-way", async () => {
    const { events, last } = await run("[error] How rain forms");
    expect(events.some((event) => event.type === "section_text" && event.index === 0)).toBe(true);
    expect(last).toMatchObject({ type: "failed", code: "failed" });
  });

  it("extends one short section with a single extra request", async () => {
    const { last, calls } = await run("[short] How rain forms");
    expect(calls.extend).toBe(1);
    expect(last.type === "complete" && last.wordCount).toBeGreaterThanOrEqual(585);
  });

  it("rewrites a section that fails the checks, clearing what was shown", async () => {
    const { events, last, calls } = await run("[bad] How rain forms");
    expect(calls.section).toBe(3);
    expect(events).toContainEqual({ type: "section_text", index: 0, text: "" });
    expect(last.type).toBe("complete");
    if (last.type === "complete") expect(last.content).not.toMatch(/^- /m);
  });

  it("writes Hindi in Devanagari", async () => {
    const { last } = await run("नींद क्यों ज़रूरी है", 5, "hi");
    expect(last.type).toBe("complete");
    if (last.type === "complete") expect(last.content).toMatch(/\p{Script=Devanagari}/u);
  });
});
