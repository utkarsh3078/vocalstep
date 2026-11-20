import type { SavedProgress } from "@/lib/teleprompter/storage";

/** A signed-in user's unfinished session, as saved on the server. */
export interface OpenSession {
  id: string;
  wordIndex: number;
  activeSeconds: number;
  /** ISO time of the last save. */
  lastActiveAt: string;
}

/** Where the teleprompter starts, and which session it continues. */
export interface ResumePoint {
  wordIndex: number;
  activeSeconds: number;
  /**
   * Practice time already counted (on the server, or deliberately not
   * counted). Only time beyond this is sent as new practice.
   */
  countedSeconds: number;
  /** The server session to continue, or null to start a new one when practice begins. */
  sessionId: string | null;
}

/**
 * Chooses where to resume from this browser's saved progress and the server's
 * open session.
 *
 * `server` is undefined when there is no server record to consult (a guest,
 * or the lookup failed), and null when the user has no open session.
 *
 * - Same session in both: whichever was saved last. This browser saves every
 *   second and the server every few seconds, so on the same device the browser
 *   copy usually wins; on another device, the server's.
 * - Only a server session: continue it, on any device.
 * - Only browser progress from before tracking (no session id): keep the place,
 *   start a new session, and do not count the old time again.
 * - Browser progress for a session the server has closed (finished or
 *   restarted elsewhere): start from the beginning.
 */
export function chooseResume(
  local: SavedProgress | null,
  server: OpenSession | null | undefined,
  wordCount: number,
): ResumePoint | null {
  // A position past the end cannot belong to this text; treat it as no session.
  const usableServer = server && server.wordIndex >= wordCount ? null : server;

  if (usableServer === undefined) {
    return local
      ? { wordIndex: local.wordIndex, activeSeconds: local.activeSeconds, countedSeconds: local.activeSeconds, sessionId: null }
      : null;
  }

  if (usableServer) {
    const sameSession = local?.sessionId === usableServer.id;
    const localIsNewer =
      sameSession && (local.savedAt ?? 0) > Date.parse(usableServer.lastActiveAt);
    if (local && localIsNewer) {
      return {
        wordIndex: local.wordIndex,
        activeSeconds: local.activeSeconds,
        countedSeconds: Math.min(usableServer.activeSeconds, local.activeSeconds),
        sessionId: usableServer.id,
      };
    }
    return {
      wordIndex: usableServer.wordIndex,
      activeSeconds: usableServer.activeSeconds,
      countedSeconds: usableServer.activeSeconds,
      sessionId: usableServer.id,
    };
  }

  if (local && !local.sessionId) {
    return {
      wordIndex: local.wordIndex,
      activeSeconds: local.activeSeconds,
      countedSeconds: local.activeSeconds,
      sessionId: null,
    };
  }
  return null;
}

/** Whole seconds of new practice to send in one save, at most `max`. */
export function secondsToSend(activeSeconds: number, countedSeconds: number, max: number): number {
  return Math.min(max, Math.max(0, Math.floor(activeSeconds - countedSeconds)));
}
