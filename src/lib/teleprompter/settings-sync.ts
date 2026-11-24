import type { SaveSettingsResult } from "@/app/actions/preferences";
import { teleprompter } from "@/config/teleprompter";

import { sameSettings, settingsToSave, type SavedSettings } from "./preferences";
import type { TeleprompterSettings } from "./storage";

type Save = (settings: SavedSettings) => Promise<SaveSettingsResult>;

/**
 * Saves a signed-in user's teleprompter settings to their profile (browser only).
 *
 * Changes come in bursts (holding ↑ to speed up, several text-size clicks), so
 * a save waits until the settings have been still for a moment, and only the
 * latest settings are sent. Saves run one at a time, in order. A failed save
 * is tried again with the next change or flush; the browser's own copy keeps
 * the settings meanwhile.
 */
export class SettingsSync {
  private last: SavedSettings;
  private pending: SavedSettings | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  /** The settings being saved right now, if any. */
  private sending: SavedSettings | null = null;
  /** A new change is waiting (not just a failed save to try again later). */
  private changed = false;
  private stopped = false;

  constructor(
    initial: TeleprompterSettings,
    private readonly save: Save,
    private readonly delayMs: number = teleprompter.profileSaveDelayMs,
  ) {
    this.last = settingsToSave(initial);
  }

  /** The settings changed: save them once they have been still for a moment. */
  change(settings: TeleprompterSettings): void {
    if (this.stopped) return;
    const next = settingsToSave(settings);
    // Compare with what the profile will hold once the save in progress lands.
    this.pending = sameSettings(next, this.sending ?? this.last) ? null : next;
    this.changed = this.pending !== null;
    this.clearTimer();
    if (this.pending) this.timer = setTimeout(() => this.flush(), this.delayMs);
  }

  /** Save any waiting change now (when the teleprompter is left). */
  flush(): void {
    this.clearTimer();
    if (this.stopped || this.sending || !this.pending) return;

    const sending = this.pending;
    this.pending = null;
    this.changed = false;
    this.sending = sending;
    this.save(sending)
      .then((result) => {
        if ("ok" in result) this.last = sending;
        // Signed out: nothing more will be accepted from this page.
        else if (result.error === "unauthorized") this.stopped = true;
        else this.pending ??= sending;
      })
      .catch(() => {
        this.pending ??= sending;
      })
      .finally(() => {
        this.sending = null;
        // A change that arrived while saving goes out next.
        if (this.changed && !this.stopped && this.timer === null) {
          this.timer = setTimeout(() => this.flush(), this.delayMs);
        }
      });
  }

  private clearTimer(): void {
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = null;
  }
}
