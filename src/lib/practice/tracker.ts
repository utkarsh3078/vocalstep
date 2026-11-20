import { startPracticeSession } from "@/app/actions/practice";
import { practice } from "@/config/practice";

import { secondsToSend, type ResumePoint } from "./resume";
import type { PracticeStats } from "./streaks";
import type { PracticeTarget, ProgressResponse } from "./target";

/** Where the teleprompter is now. */
export interface PracticeSnapshot {
  /** All active practice time in this session so far. */
  activeSeconds: number;
  wordIndex: number;
  /** From 0 to 1. */
  progress: number;
}

const PROGRESS_URL = "/api/practice/progress";

/**
 * Saves a signed-in user's practice to the server (browser only).
 *
 * The teleprompter calls it on Start, every few seconds while practising, on
 * pause, on finishing and when the page closes. Saves run one at a time, in
 * order. Only new whole seconds of practice are sent each time; the rest
 * waits for the next save. If a save fails, its time is sent again next time.
 *
 * Nothing here ever blocks the teleprompter: the server is best effort, and
 * the browser keeps its own copy of the position regardless.
 */
export class PracticeTracker {
  private sessionId: string | null;
  /** Practice time already sent (or deliberately not counted). */
  private counted: number;
  private lastWordIndex = -1;
  /** True once practice has begun, so a session should exist. */
  private wanted: boolean;
  /** Set when the server will not take more saves for this run (signed out, or the session was closed elsewhere). */
  private stopped = false;
  private queue: Promise<unknown> = Promise.resolve();
  private queued = 0;

  constructor(
    private readonly target: PracticeTarget,
    resume: Pick<ResumePoint, "sessionId" | "countedSeconds"> | null,
  ) {
    this.sessionId = resume?.sessionId ?? null;
    this.counted = resume?.countedSeconds ?? 0;
    this.wanted = this.sessionId !== null;
  }

  /** The session this run belongs to, once there is one. */
  get currentSessionId(): string | null {
    return this.sessionId;
  }

  /** Practice has started: open a session if there is none, and save. */
  begin(snapshot: PracticeSnapshot): void {
    this.wanted = true;
    void this.enqueue(() => this.send(snapshot, false));
  }

  /**
   * Saves if anything changed. A routine save is skipped while another is
   * still waiting; `urgent` saves (pause, leaving the page) always queue.
   */
  save(snapshot: PracticeSnapshot, { urgent = false } = {}): void {
    if (!urgent && this.queued > 0) return;
    void this.enqueue(() => this.send(snapshot, false));
  }

  /** Marks the session complete and returns the user's updated totals, or null. */
  finish(snapshot: PracticeSnapshot): Promise<PracticeStats | null> {
    this.wanted = true;
    return this.enqueue(async () => {
      const response = await this.send(snapshot, true);
      this.sessionId = null;
      this.wanted = false;
      this.counted = snapshot.activeSeconds;
      return response?.stats ?? null;
    });
  }

  /**
   * Starts over (Restart, Practise again): saves what is pending to the
   * current session, then forgets it. The next begin() opens a new one.
   */
  reset(before: PracticeSnapshot): void {
    void this.enqueue(async () => {
      await this.send(before, false);
      this.sessionId = null;
      this.wanted = false;
      this.counted = 0;
      this.lastWordIndex = -1;
      this.stopped = false;
    });
  }

  /** A last save as the page closes. The browser sends it even after the page is gone. */
  beacon(snapshot: PracticeSnapshot): void {
    if (this.stopped || !this.sessionId) return;
    const body = this.body(snapshot, false);
    if (!body) return;
    // A string is sent as text/plain, which every browser accepts for beacons.
    if (navigator.sendBeacon?.(PROGRESS_URL, JSON.stringify(body))) {
      this.counted += body.deltaSeconds;
      this.lastWordIndex = body.wordIndex;
    }
  }

  // ----- Internals

  private enqueue<T>(task: () => Promise<T>): Promise<T> {
    this.queued += 1;
    const run = this.queue.then(task).finally(() => {
      this.queued -= 1;
    });
    this.queue = run.catch(() => {});
    return run;
  }

  /** What to send now, or null when nothing changed. */
  private body(snapshot: PracticeSnapshot, complete: boolean) {
    if (!this.sessionId) return null;
    const deltaSeconds = secondsToSend(
      snapshot.activeSeconds,
      this.counted,
      practice.tracking.maxSecondsPerSave,
    );
    if (!complete && deltaSeconds === 0 && snapshot.wordIndex === this.lastWordIndex) return null;
    return {
      sessionId: this.sessionId,
      deltaSeconds,
      wordIndex: snapshot.wordIndex,
      progress: Math.min(1, Math.max(0, snapshot.progress)),
      ...(complete ? { complete: true } : {}),
    };
  }

  private async ensureSession(): Promise<boolean> {
    if (this.sessionId) return true;
    if (!this.wanted) return false;
    try {
      let timezone: string | null = null;
      try {
        timezone = Intl.DateTimeFormat().resolvedOptions().timeZone ?? null;
      } catch {
        // Unknown: the profile keeps its current zone.
      }
      const result = await startPracticeSession(this.target, timezone);
      if ("sessionId" in result) {
        this.sessionId = result.sessionId;
        return true;
      }
      if (result.error === "unauthorized") this.stopped = true;
    } catch {
      // Offline or the server failed; try again at the next save.
    }
    return false;
  }

  private async send(snapshot: PracticeSnapshot, complete: boolean): Promise<ProgressResponse | null> {
    if (this.stopped || !(await this.ensureSession())) return null;
    const body = this.body(snapshot, complete);
    if (!body) return null;

    // Counted before the reply, so a beacon sent meanwhile does not send the same time twice.
    const previousWordIndex = this.lastWordIndex;
    this.counted += body.deltaSeconds;
    this.lastWordIndex = body.wordIndex;
    try {
      const response = await fetch(PROGRESS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        // Lets a save started while the page closes finish anyway.
        keepalive: true,
      });
      if (response.status === 401 || response.status === 404) {
        this.stopped = true;
        return null;
      }
      if (!response.ok) throw new Error(`Save failed with ${response.status}`);

      const result = (await response.json()) as ProgressResponse;
      // The session was finished or restarted elsewhere: stop saving to it.
      if (!result.recorded) this.stopped = true;
      return result;
    } catch {
      this.counted -= body.deltaSeconds;
      this.lastWordIndex = previousWordIndex;
      return null;
    }
  }
}
