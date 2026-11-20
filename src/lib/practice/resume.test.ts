import { describe, expect, it } from "vitest";

import { chooseResume, secondsToSend, type OpenSession } from "./resume";

const SESSION = "0b8d6f2e-4a51-4c7e-9a0d-3f1e2b7c9d10";
const OTHER = "9f0c1a2b-3c4d-4e5f-8a9b-0c1d2e3f4a5b";
const server: OpenSession = {
  id: SESSION,
  wordIndex: 300,
  activeSeconds: 120,
  lastActiveAt: "2026-11-20T10:00:00Z",
};
const at = (iso: string) => Date.parse(iso);

describe("chooseResume", () => {
  it("starts fresh with nothing saved", () => {
    expect(chooseResume(null, undefined, 650)).toBeNull();
    expect(chooseResume(null, null, 650)).toBeNull();
  });

  it("uses browser progress for guests", () => {
    const local = { wordCount: 650, wordIndex: 40, activeSeconds: 20 };
    expect(chooseResume(local, undefined, 650)).toEqual({
      wordIndex: 40,
      activeSeconds: 20,
      countedSeconds: 20,
      sessionId: null,
    });
  });

  it("continues the server session on a new device", () => {
    expect(chooseResume(null, server, 650)).toEqual({
      wordIndex: 300,
      activeSeconds: 120,
      countedSeconds: 120,
      sessionId: SESSION,
    });
  });

  it("prefers this browser's newer copy of the same session, and sends its extra time", () => {
    const local = {
      wordCount: 650,
      wordIndex: 330,
      activeSeconds: 131.4,
      savedAt: at("2026-11-20T10:00:11Z"),
      sessionId: SESSION,
    };
    expect(chooseResume(local, server, 650)).toEqual({
      wordIndex: 330,
      activeSeconds: 131.4,
      countedSeconds: 120,
      sessionId: SESSION,
    });
  });

  it("prefers the server when it was saved later, from another device", () => {
    const local = {
      wordCount: 650,
      wordIndex: 100,
      activeSeconds: 50,
      savedAt: at("2026-11-20T09:00:00Z"),
      sessionId: SESSION,
    };
    expect(chooseResume(local, server, 650)?.wordIndex).toBe(300);
  });

  it("prefers the server's open session over progress from an older one", () => {
    const local = {
      wordCount: 650,
      wordIndex: 100,
      activeSeconds: 50,
      savedAt: at("2026-11-20T11:00:00Z"),
      sessionId: OTHER,
    };
    expect(chooseResume(local, server, 650)?.sessionId).toBe(SESSION);
    expect(chooseResume(local, server, 650)?.wordIndex).toBe(300);
  });

  it("keeps the place from before tracking, without counting that time again", () => {
    const local = { wordCount: 650, wordIndex: 80, activeSeconds: 45 };
    expect(chooseResume(local, null, 650)).toEqual({
      wordIndex: 80,
      activeSeconds: 45,
      countedSeconds: 45,
      sessionId: null,
    });
  });

  it("starts fresh when the session was finished or restarted elsewhere", () => {
    const local = { wordCount: 650, wordIndex: 80, activeSeconds: 45, sessionId: SESSION };
    expect(chooseResume(local, null, 650)).toBeNull();
  });

  it("ignores a server position past the end of the text", () => {
    expect(chooseResume(null, { ...server, wordIndex: 650 }, 650)).toBeNull();
  });
});

describe("secondsToSend", () => {
  it("sends whole seconds and keeps the rest for later", () => {
    expect(secondsToSend(15.7, 0, 60)).toBe(15);
    expect(secondsToSend(15.7, 15, 60)).toBe(0);
  });

  it("never sends more than the limit, or less than nothing", () => {
    expect(secondsToSend(500, 0, 60)).toBe(60);
    expect(secondsToSend(10, 30, 60)).toBe(0);
  });
});
