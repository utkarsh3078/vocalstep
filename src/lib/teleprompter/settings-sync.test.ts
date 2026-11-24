import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { SaveSettingsResult } from "@/app/actions/preferences";

import type { SavedSettings } from "./preferences";
import { SettingsSync } from "./settings-sync";
import { defaultSettings } from "./storage";

const DELAY = 1000;
const start = defaultSettings(130);

/** A save whose replies the test hands out one at a time. */
function controlledSave() {
  const calls: SavedSettings[] = [];
  const replies: ((result: SaveSettingsResult) => void)[] = [];
  const save = vi.fn((settings: SavedSettings) => {
    calls.push(settings);
    return new Promise<SaveSettingsResult>((resolve) => replies.push(resolve));
  });
  const reply = async (result: SaveSettingsResult = { ok: true }) => {
    replies.shift()?.(result);
    await vi.advanceTimersByTimeAsync(0);
  };
  return { save, calls, reply };
}

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe("SettingsSync", () => {
  it("saves once the settings have been still for a moment, with only the latest", async () => {
    const { save, calls } = controlledSave();
    const sync = new SettingsSync(start, save, DELAY);

    sync.change({ ...start, wpm: 140 });
    await vi.advanceTimersByTimeAsync(DELAY / 2);
    sync.change({ ...start, wpm: 150 });
    await vi.advanceTimersByTimeAsync(DELAY / 2);
    expect(save).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(DELAY / 2);
    expect(calls).toEqual([{ wpm: 150, fontSize: 32, lineHeight: 1.5 }]);
  });

  it("sends nothing when the settings end up as they were", async () => {
    const { save } = controlledSave();
    const sync = new SettingsSync(start, save, DELAY);

    sync.change({ ...start, wpm: 140 });
    sync.change({ ...start });
    await vi.advanceTimersByTimeAsync(DELAY * 2);
    sync.flush();
    expect(save).not.toHaveBeenCalled();
  });

  it("saves a waiting change at once on flush", () => {
    const { calls, save } = controlledSave();
    const sync = new SettingsSync(start, save, DELAY);

    sync.change({ ...start, fontSize: 40 });
    sync.flush();
    expect(calls).toEqual([{ wpm: 130, fontSize: 40, lineHeight: 1.5 }]);
  });

  it("runs one save at a time and sends a change made meanwhile afterwards", async () => {
    const { calls, save, reply } = controlledSave();
    const sync = new SettingsSync(start, save, DELAY);

    sync.change({ ...start, wpm: 140 });
    sync.flush();
    sync.change({ ...start, wpm: 160 });
    await vi.advanceTimersByTimeAsync(DELAY * 2);
    expect(calls).toHaveLength(1);

    await reply();
    await vi.advanceTimersByTimeAsync(DELAY);
    expect(calls.map(({ wpm }) => wpm)).toEqual([140, 160]);
  });

  it("sends a change back to the old value made while a save is on its way", async () => {
    const { calls, save, reply } = controlledSave();
    const sync = new SettingsSync(start, save, DELAY);

    sync.change({ ...start, wpm: 140 });
    sync.flush();
    // Back to 130 while 140 is being saved: the profile would otherwise keep 140.
    sync.change({ ...start });
    await reply();
    await vi.advanceTimersByTimeAsync(DELAY);
    expect(calls.map(({ wpm }) => wpm)).toEqual([140, 130]);
  });

  it("tries a failed save again with the next flush, not on its own", async () => {
    const { calls, save, reply } = controlledSave();
    const sync = new SettingsSync(start, save, DELAY);

    sync.change({ ...start, wpm: 140 });
    sync.flush();
    await reply({ error: "failed" });
    await vi.advanceTimersByTimeAsync(DELAY * 5);
    expect(calls).toHaveLength(1);

    sync.flush();
    expect(calls.map(({ wpm }) => wpm)).toEqual([140, 140]);
  });

  it("tries again after a network error", async () => {
    const save = vi
      .fn<(settings: SavedSettings) => Promise<SaveSettingsResult>>()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValue({ ok: true });
    const sync = new SettingsSync(start, save, DELAY);

    sync.change({ ...start, wpm: 140 });
    sync.flush();
    await vi.advanceTimersByTimeAsync(0);
    sync.flush();
    await vi.advanceTimersByTimeAsync(0);
    expect(save).toHaveBeenCalledTimes(2);
    sync.flush();
    expect(save).toHaveBeenCalledTimes(2);
  });

  it("stops once signed out", async () => {
    const { calls, save, reply } = controlledSave();
    const sync = new SettingsSync(start, save, DELAY);

    sync.change({ ...start, wpm: 140 });
    sync.flush();
    await reply({ error: "unauthorized" });
    sync.change({ ...start, wpm: 150 });
    sync.flush();
    await vi.advanceTimersByTimeAsync(DELAY * 2);
    expect(calls).toHaveLength(1);
  });
});
