"use client";

import { X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
} from "react";

import { practice, type LanguageCode } from "@/config/practice";
import { teleprompter } from "@/config/teleprompter";
import { chooseResume, type OpenSession } from "@/lib/practice/resume";
import type { PracticeStats } from "@/lib/practice/streaks";
import type { PracticeTarget } from "@/lib/practice/target";
import { PracticeTracker, type PracticeSnapshot } from "@/lib/practice/tracker";
import type { SpeechBlock } from "@/lib/speech/blocks";
import { saveTeleprompterSettings } from "@/app/actions/preferences";
import { emphasis, highlightRange, wordOpacity } from "@/lib/teleprompter/highlight";
import {
  groupLines,
  groupRuns,
  offsetFor,
  positionAt,
  positionForWord,
  scrollSpeedAt,
  wordIndexAt,
  type TextLine,
  type TextRun,
} from "@/lib/teleprompter/position";
import { SettingsSync } from "@/lib/teleprompter/settings-sync";
import { chooseTheme, currentTheme, DEFAULT_THEME, watchCurrentTheme } from "@/lib/theme";
import {
  clearProgress,
  loadProgress,
  loadSettings,
  saveProgress,
  saveSettings,
  type TeleprompterSettings,
} from "@/lib/teleprompter/storage";
import {
  canFinish,
  formatClock,
  formatPercent,
  progressAt,
  remainingSeconds,
  stepFontSize,
  stepLineHeight,
  stepSpeed,
} from "@/lib/teleprompter/timing";

import { FinishedScreen } from "./finished-screen";
import { TeleprompterControls, type PlaybackStatus } from "./teleprompter-controls";
import { TeleprompterLoading } from "./teleprompter-loading";
import { TeleprompterText } from "./teleprompter-text";

export interface TeleprompterProps {
  /** Identifies the speech in browser storage, such as "sample:small-daily-habits". */
  speechId: string;
  title: string;
  blocks: SpeechBlock[];
  wordCount: number;
  language: LanguageCode;
  /** Where Exit and the Esc key go. */
  exitHref: string;
  /**
   * For signed-in users: what is being practised, and their unfinished session
   * on it (null for none, undefined if it could not be read). Practice time
   * and progress are then saved to their account. Guests leave this out.
   */
  tracking?: { target: PracticeTarget; session: OpenSession | null | undefined };
  /**
   * For signed-in users: the display settings saved to their profile
   * (undefined if they could not be read). Saved ones replace this browser's,
   * and every change is saved back. Guests leave this out.
   */
  profile?: { settings: Record<string, unknown> | undefined };
}

/** The totals on the end-of-session screen. */
export type FinishTotals =
  | { state: "guest" }
  | { state: "loading" }
  | { state: "ready"; stats: PracticeStats }
  | { state: "failed" };

/** Measurements of the rendered text, refreshed whenever its layout changes. */
interface Layout {
  lines: TextLine[];
  /** Paragraphs on screen; each scrolls at its own exact reading speed. */
  runs: TextRun[];
  lineHeight: number;
  /** Distance from the top of the scroll area to the reading line. */
  lineOffset: number;
  contentHeight: number;
  viewportHeight: number;
}

const subscribeToNothing = () => () => {};

/**
 * Full-screen teleprompter for one speech.
 *
 * The teleprompter depends on the browser (stored settings and progress, text
 * measurement), so the server renders a loading screen and the real screen
 * mounts once the page runs in the browser.
 */
export function Teleprompter(props: TeleprompterProps) {
  const isBrowser = useSyncExternalStore(
    subscribeToNothing,
    () => true,
    () => false,
  );

  if (props.wordCount === 0) {
    return (
      <section>
        <p>This speech has no text to read yet.</p>
        <Link href={props.exitHref} className="mt-4 inline-block underline underline-offset-4">
          Go back
        </Link>
      </section>
    );
  }

  if (!isBrowser) return <TeleprompterLoading title={props.title} />;

  return <TeleprompterScreen {...props} />;
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

function TeleprompterScreen({
  speechId,
  title,
  blocks,
  wordCount,
  language,
  exitHref,
  tracking,
  profile,
}: TeleprompterProps) {
  const router = useRouter();

  // Always the site's theme; the theme button switches the whole site.
  const theme = useSyncExternalStore(watchCurrentTheme, currentTheme, () => DEFAULT_THEME);
  const [settings, setSettings] = useState(() =>
    loadSettings(practice.languages[language].wpm, profile?.settings),
  );
  const [settingsSync] = useState(() =>
    profile ? new SettingsSync(settings, saveTeleprompterSettings) : null,
  );
  const [initial] = useState(() => {
    const resume = chooseResume(
      loadProgress(speechId, wordCount),
      tracking ? tracking.session : undefined,
      wordCount,
    );
    return {
      position: resume ? positionForWord(resume.wordIndex, wordCount) : 0,
      activeSeconds: resume?.activeSeconds ?? 0,
      resumed: resume !== null,
      tracker: tracking ? new PracticeTracker(tracking.target, resume) : null,
    };
  });
  const tracker = initial.tracker;
  const [totals, setTotals] = useState<FinishTotals>({ state: tracker ? "loading" : "guest" });
  const [status, setStatus] = useState<PlaybackStatus>(initial.resumed ? "paused" : "ready");
  /** A copy of the live position and time, refreshed a few times a second for display. */
  const [display, setDisplay] = useState({
    position: initial.position,
    activeSeconds: initial.activeSeconds,
  });
  const [showDisplay, setShowDisplay] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fullscreenSupported] = useState(() => document.fullscreenEnabled === true);

  const rootRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const layoutRef = useRef<Layout | null>(null);

  // The live state the animation loop and event listeners work with.
  const statusRef = useRef(status);
  const settingsRef = useRef(settings);
  /** Fractional word position at the reading line. The only position ever stored. */
  const positionRef = useRef(initial.position);
  const activeSecondsRef = useRef(initial.activeSeconds);
  /** Exact scroll offset, kept fractional so slow speeds still move smoothly. */
  const exactTopRef = useRef(0);
  /** The scroll offset as the browser reported it after our last write. */
  const writtenTopRef = useRef(0);
  /** Auto-scroll waits until this time after the user scrolls by hand. */
  const manualUntilRef = useRef(0);
  const touchingRef = useRef(false);
  const dirtyRef = useRef(false);
  const lastDisplayRef = useRef(0);
  /** Every spoken word's element, in speech order. */
  const wordsRef = useRef<HTMLElement[]>([]);
  /** The words currently styled by the highlight, so they can be reset. */
  const paintedRef = useRef<[number, number] | null>(null);

  // ----- Helpers (called from event handlers and effects, never during render)

  function changeStatus(next: PlaybackStatus) {
    statusRef.current = next;
    setStatus(next);
  }

  function updateSettings(change: Partial<TeleprompterSettings>) {
    const next = { ...settingsRef.current, ...change };
    settingsRef.current = next;
    setSettings(next);
    saveSettings(next);
    settingsSync?.change(next);
  }

  function publishDisplay() {
    setDisplay({ position: positionRef.current, activeSeconds: activeSecondsRef.current });
  }

  function writeScroll(top: number) {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    exactTopRef.current = top;
    scroller.scrollTop = top;
    writtenTopRef.current = scroller.scrollTop;
  }

  /**
   * The word position at the reading line. Uses the exact, fractional scroll
   * value rather than the browser's rounded one, so the highlight glides
   * smoothly even when the text moves less than a pixel per frame.
   */
  function readPosition(): number {
    const layout = layoutRef.current;
    if (!layout) return positionRef.current;
    return positionAt(layout.lines, exactTopRef.current + layout.lineOffset, layout.lineHeight);
  }

  function resetWord(word: HTMLElement) {
    word.style.removeProperty("color");
    word.style.removeProperty("opacity");
    word.style.removeProperty("-webkit-text-stroke-width");
  }

  /**
   * Darkens and bolds the words around the reading point; all other text stays
   * light (set once in CSS). Only the few words near the point are touched, so
   * this is cheap enough to run every frame, even for very long speeches.
   *
   * A highlighted word gets full colour faded with opacity, not a see-through
   * colour, so its bold outline and its letters fade together without seams.
   */
  function paintHighlight() {
    const words = wordsRef.current;
    const { highlight } = teleprompter;
    const position = positionRef.current;
    const range = highlightRange(position, words.length, highlight);
    const previous = paintedRef.current;

    if (previous) {
      for (let index = previous[0]; index <= previous[1]; index += 1) {
        if (!range || index < range[0] || index > range[1]) resetWord(words[index]);
      }
    }
    if (range) {
      for (let index = range[0]; index <= range[1]; index += 1) {
        const word = words[index];
        const strength = emphasis(index, position, highlight);
        if (strength <= 0) {
          resetWord(word);
          continue;
        }
        word.style.color = "rgb(var(--tp-text))";
        word.style.opacity = wordOpacity(strength, highlight.dimOpacity).toFixed(3);
        word.style.setProperty(
          "-webkit-text-stroke-width",
          `${(highlight.boldStrokeEm * strength).toFixed(4)}em`,
        );
      }
    }
    paintedRef.current = range;
  }

  /** True when the text has been re-laid out since it was last measured. */
  function isLayoutStale(): boolean {
    const scroller = scrollerRef.current;
    const content = contentRef.current;
    const layout = layoutRef.current;
    if (!scroller || !content || !layout) return true;
    return (
      content.offsetHeight !== layout.contentHeight ||
      scroller.clientHeight !== layout.viewportHeight
    );
  }

  /**
   * Measures every word, then scrolls so the current word is back on the
   * reading line. Runs on first show, resize, rotation and display changes.
   */
  function relayout() {
    const scroller = scrollerRef.current;
    const content = contentRef.current;
    // A hidden teleprompter (after navigating away) has nothing to measure.
    if (!scroller || !content || scroller.clientHeight === 0) return;

    const lineHeight = Number(content.dataset.lineHeight) || 0;
    const words = Array.from(content.querySelectorAll<HTMLElement>("[data-word]"));
    if (words.length !== wordsRef.current.length || words[0] !== wordsRef.current[0]) {
      // New elements: clear the highlight left on the old ones.
      const previous = paintedRef.current;
      if (previous) {
        for (let index = previous[0]; index <= previous[1]; index += 1) {
          const old = wordsRef.current[index];
          if (old) resetWord(old);
        }
      }
      paintedRef.current = null;
      wordsRef.current = words;
    }
    const centers = words.map((word) => content.offsetTop + word.offsetTop + word.offsetHeight / 2);
    const lines = groupLines(centers, lineHeight / 4);
    const lineOffset = scroller.clientHeight * teleprompter.readingLine;

    layoutRef.current = {
      lines,
      runs: groupRuns(lines, lineHeight),
      lineHeight,
      lineOffset,
      contentHeight: content.offsetHeight,
      viewportHeight: scroller.clientHeight,
    };

    const maxTop = scroller.scrollHeight - scroller.clientHeight;
    writeScroll(clamp(offsetFor(lines, positionRef.current, lineHeight) - lineOffset, 0, maxTop));
    paintHighlight();
  }

  /** The position and time now, for saving to the server. */
  function snapshot(): PracticeSnapshot {
    return {
      activeSeconds: activeSecondsRef.current,
      wordIndex: wordIndexAt(positionRef.current, wordCount),
      progress: progressAt(positionRef.current, wordCount),
    };
  }

  /** Saves to this browser. Server saves happen less often, through the tracker. */
  function saveNow() {
    if (statusRef.current === "finished") return;
    dirtyRef.current = false;

    const activeSeconds = activeSecondsRef.current;
    if (positionRef.current <= 0 && activeSeconds < 1) {
      clearProgress(speechId);
      return;
    }
    const sessionId = tracker?.currentSessionId;
    saveProgress(speechId, {
      wordCount,
      wordIndex: wordIndexAt(positionRef.current, wordCount),
      activeSeconds: Math.round(activeSeconds * 10) / 10,
      savedAt: Date.now(),
      ...(sessionId ? { sessionId } : {}),
    });
  }

  function focusText() {
    scrollerRef.current?.focus({ preventScroll: true });
  }

  function exitOwnFullscreen() {
    if (document.fullscreenElement && document.fullscreenElement === rootRef.current) {
      document.exitFullscreen().catch(() => {});
    }
  }

  // ----- Actions

  function play() {
    if (statusRef.current !== "ready" && statusRef.current !== "paused") return;
    manualUntilRef.current = 0;
    changeStatus("playing");
    tracker?.begin(snapshot());
  }

  function pause() {
    if (statusRef.current !== "playing") return;
    changeStatus("paused");
    publishDisplay();
    saveNow();
    tracker?.save(snapshot(), { urgent: true });
  }

  function togglePlay() {
    if (statusRef.current === "playing") pause();
    else play();
  }

  function finish() {
    changeStatus("finished");
    publishDisplay();
    clearProgress(speechId);
    setShowDisplay(false);
    exitOwnFullscreen();
    if (tracker) {
      setTotals({ state: "loading" });
      void tracker
        .finish(snapshot())
        .then((stats) => setTotals(stats ? { state: "ready", stats } : { state: "failed" }));
    }
  }

  function restart() {
    // Time read so far still counts; the next Start opens a new session.
    tracker?.reset(snapshot());
    positionRef.current = 0;
    activeSecondsRef.current = 0;
    manualUntilRef.current = 0;
    dirtyRef.current = false;
    clearProgress(speechId);
    changeStatus("ready");
    publishDisplay();
    relayout();
  }

  function practiseAgain() {
    restart();
    focusText();
  }

  function changeSpeed(direction: 1 | -1) {
    updateSettings({ wpm: stepSpeed(settingsRef.current.wpm, direction) });
  }

  function toggleFullscreen() {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      rootRef.current?.requestFullscreen().catch(() => {});
    }
  }

  function exit() {
    router.push(exitHref);
  }

  // ----- Effects

  // Measure the text now and again whenever its size or the screen changes.
  const onResize = useEffectEvent(() => relayout());
  useLayoutEffect(() => {
    const scroller = scrollerRef.current;
    const content = contentRef.current;
    if (!scroller || !content) return;

    onResize();
    const observer = new ResizeObserver(() => onResize());
    observer.observe(scroller);
    observer.observe(content);
    // Web fonts can arrive after the first layout and change how lines wrap.
    let active = true;
    document.fonts.ready.then(() => {
      if (active) onResize();
    });

    return () => {
      active = false;
      observer.disconnect();
    };
  }, []);

  // Manual scrolling: wheel, touch, scrollbar and keys all end up here.
  const onScroll = useEffectEvent(() => {
    const scroller = scrollerRef.current;
    if (!scroller || !layoutRef.current) return;
    // Our own writes come back as scroll events; ignore them.
    if (Math.abs(scroller.scrollTop - writtenTopRef.current) <= 1) return;
    // The text was re-laid out and is about to be re-placed by relayout().
    if (isLayoutStale()) return;

    exactTopRef.current = scroller.scrollTop;
    writtenTopRef.current = scroller.scrollTop;
    manualUntilRef.current = performance.now() + teleprompter.manualScrollPauseMs;
    positionRef.current = readPosition();
    dirtyRef.current = true;
    paintHighlight();
    publishDisplay();
  });
  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    const handleScroll = () => onScroll();
    const handleTouchStart = () => {
      touchingRef.current = true;
    };
    const handleTouchEnd = () => {
      touchingRef.current = false;
      manualUntilRef.current = performance.now() + teleprompter.manualScrollPauseMs;
    };

    scroller.addEventListener("scroll", handleScroll, { passive: true });
    scroller.addEventListener("touchstart", handleTouchStart, { passive: true });
    scroller.addEventListener("touchend", handleTouchEnd, { passive: true });
    scroller.addEventListener("touchcancel", handleTouchEnd, { passive: true });
    return () => {
      scroller.removeEventListener("scroll", handleScroll);
      scroller.removeEventListener("touchstart", handleTouchStart);
      scroller.removeEventListener("touchend", handleTouchEnd);
      scroller.removeEventListener("touchcancel", handleTouchEnd);
    };
  }, []);

  // The auto-scroll loop. Returns false when the loop should stop.
  const onFrame = useEffectEvent((seconds: number, now: number): boolean => {
    const scroller = scrollerRef.current;
    if (!scroller) return true;
    if (isLayoutStale()) relayout();
    const layout = layoutRef.current;
    if (!layout) return true;

    // Catch a manual scroll that happened since the last frame.
    if (Math.abs(scroller.scrollTop - writtenTopRef.current) > 1) {
      exactTopRef.current = scroller.scrollTop;
      writtenTopRef.current = scroller.scrollTop;
      manualUntilRef.current = now + teleprompter.manualScrollPauseMs;
    }

    const maxTop = scroller.scrollHeight - scroller.clientHeight;
    if (!touchingRef.current && now >= manualUntilRef.current) {
      const speed = scrollSpeedAt(
        layout.runs,
        exactTopRef.current + layout.lineOffset,
        settingsRef.current.wpm,
        layout.lineHeight * teleprompter.gapLinesPerSecond,
      );
      writeScroll(Math.min(maxTop, exactTopRef.current + speed * seconds));
    }

    activeSecondsRef.current += seconds;
    positionRef.current = readPosition();
    dirtyRef.current = true;
    paintHighlight();

    if (positionRef.current >= wordCount || exactTopRef.current >= maxTop) {
      finish();
      return false;
    }

    if (now - lastDisplayRef.current >= teleprompter.displayIntervalMs) {
      lastDisplayRef.current = now;
      publishDisplay();
    }
    return true;
  });
  useEffect(() => {
    if (status !== "playing") return;

    let frame = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const seconds = clamp((now - last) / 1000, 0, teleprompter.maxFrameSeconds);
      last = now;
      if (onFrame(seconds, now)) frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);

    return () => cancelAnimationFrame(frame);
  }, [status]);

  // Save progress about once a second while it changes, and when the page is
  // hidden or closed. Leaving the tab also pauses, so no time is counted.
  const onSaveTick = useEffectEvent(() => {
    if (dirtyRef.current) saveNow();
  });
  const onServerSaveTick = useEffectEvent(() => {
    if (statusRef.current !== "finished") tracker?.save(snapshot());
  });
  const onPageHidden = useEffectEvent(() => {
    pause();
    saveNow();
    settingsSync?.flush();
    if (statusRef.current !== "finished") tracker?.save(snapshot(), { urgent: true });
  });
  const onPageClose = useEffectEvent(() => {
    onPageHidden();
    // The fetch above may not finish as the page unloads; a beacon does.
    if (statusRef.current !== "finished") tracker?.beacon(snapshot());
  });
  useEffect(() => {
    const interval = window.setInterval(() => onSaveTick(), teleprompter.saveIntervalMs);
    const serverInterval = window.setInterval(
      () => onServerSaveTick(),
      practice.tracking.syncIntervalSeconds * 1000,
    );
    const handlePageHide = () => onPageClose();
    const handleVisibility = () => {
      if (document.visibilityState === "hidden") onPageHidden();
    };

    window.addEventListener("pagehide", handlePageHide);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.clearInterval(interval);
      window.clearInterval(serverInterval);
      window.removeEventListener("pagehide", handlePageHide);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  // Next.js keeps a page mounted but hidden after navigating away from it.
  // When that happens, pause and save; a finished session starts fresh next time.
  const onHide = useEffectEvent(() => {
    settingsSync?.flush();
    if (statusRef.current === "finished") {
      restart();
    } else {
      pause();
      saveNow();
      tracker?.save(snapshot(), { urgent: true });
    }
    setShowDisplay(false);
    exitOwnFullscreen();
  });
  useLayoutEffect(() => () => onHide(), []);

  // Keyboard shortcuts.
  const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
    const target = event.target instanceof Element ? event.target : null;
    if (target?.closest("input, select, textarea, [contenteditable='true']")) return;

    const finished = statusRef.current === "finished";
    switch (event.key) {
      case " ":
        // A focused button or link handles Space itself.
        if (target?.closest("button, a")) return;
        event.preventDefault();
        if (!finished && !event.repeat) togglePlay();
        break;
      case "ArrowUp":
      case "ArrowDown":
        if (finished) return;
        event.preventDefault();
        changeSpeed(event.key === "ArrowUp" ? 1 : -1);
        break;
      case "Escape":
        event.preventDefault();
        if (showDisplay) setShowDisplay(false);
        else exit();
        break;
    }
  });
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => onKeyDown(event);
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Track full screen, which the browser can also leave on its own (Esc).
  useEffect(() => {
    const handleChange = () =>
      setIsFullscreen(
        document.fullscreenElement !== null && document.fullscreenElement === rootRef.current,
      );
    document.addEventListener("fullscreenchange", handleChange);
    return () => document.removeEventListener("fullscreenchange", handleChange);
  }, []);

  // Keep the screen awake while playing, where the browser supports it.
  useEffect(() => {
    if (status !== "playing" || !("wakeLock" in navigator)) return;

    let sentinel: WakeLockSentinel | null = null;
    let cancelled = false;
    const acquire = async () => {
      try {
        const lock = await navigator.wakeLock.request("screen");
        if (cancelled) await lock.release();
        else sentinel = lock;
      } catch {
        // Refused (low battery, unsupported, not visible). The teleprompter still works.
      }
    };
    // The browser drops the lock when the tab is hidden; take it again on return.
    const handleVisibility = () => {
      if (document.visibilityState === "visible" && (!sentinel || sentinel.released)) {
        void acquire();
      }
    };

    void acquire();
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", handleVisibility);
      sentinel?.release().catch(() => {});
    };
  }, [status]);

  // Put keyboard focus on the text so Space, the arrows and Page keys work at once.
  useEffect(() => {
    scrollerRef.current?.focus({ preventScroll: true });
  }, []);

  // ----- Render

  const dark = theme === "dark";
  const lineHeightPx = settings.fontSize * settings.lineHeight;
  const progress = progressAt(display.position, wordCount);
  const remaining = remainingSeconds(display.position, wordCount, settings.wpm);
  const pill = dark ? "bg-neutral-900" : "bg-canvas";
  const mutedText = dark ? "text-neutral-400" : "text-muted";

  return (
    <div
      ref={rootRef}
      // The site's theme, set here too so the teleprompter's colours follow it.
      data-theme={theme}
      // The contents fade in over the loading screen's matching background.
      className={`fixed inset-0 z-50 flex flex-col *:motion-safe:animate-tp-fade-in ${dark ? "bg-neutral-950 text-neutral-100" : "bg-white text-neutral-900"}`}
      style={
        {
          colorScheme: theme,
          // The text colour as RGB channels (neutral-100 / neutral-900), so the
          // speech can use it at any strength.
          "--tp-text": dark ? "245 245 245" : "23 23 23",
        } as CSSProperties
      }
    >
      <header className="px-3 pt-3 pb-2 text-sm sm:px-5">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-3 gap-y-2">
          {/* Its own line on phones, so the stats don't squeeze it to nothing. */}
          <h1 className="w-full min-w-0 truncate font-semibold sm:w-auto sm:flex-1">{title}</h1>
          <dl className="flex gap-1.5 tabular-nums">
            <div className={`flex gap-1.5 rounded-full px-3 py-1.5 ${pill}`}>
              <dt className={mutedText}>Elapsed</dt>
              <dd className="font-medium">{formatClock(display.activeSeconds)}</dd>
            </div>
            <div className={`flex gap-1.5 rounded-full px-3 py-1.5 ${pill}`}>
              <dt className={mutedText}>Left</dt>
              <dd className="font-medium">{formatClock(remaining)}</dd>
            </div>
            <div className={`flex rounded-full px-3 py-1.5 ${pill}`}>
              <dt className="sr-only">Progress</dt>
              <dd className="font-medium">{formatPercent(progress)}</dd>
            </div>
          </dl>
          <Link
            href={exitHref}
            title="Exit (Esc)"
            className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 font-medium transition-colors ${
              dark ? "border-neutral-700 hover:bg-neutral-800" : "border-line bg-surface hover:bg-well"
            }`}
          >
            <X aria-hidden="true" className="size-4" />
            Exit
          </Link>
        </div>
      </header>

      <div
        role="progressbar"
        aria-label="Progress through the speech"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.floor(progress * 100)}
        className={`mx-auto h-1 w-full max-w-5xl overflow-hidden rounded-full sm:w-[calc(100%-2.5rem)] ${dark ? "bg-neutral-800" : "bg-well"}`}
      >
        <div
          className={`h-full rounded-full ${dark ? "bg-mint-400" : "bg-mint-700"}`}
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      <div className="relative min-h-0 flex-1">
        <div
          ref={scrollerRef}
          tabIndex={0}
          aria-label="Speech text"
          // Focused on arrival so Space and the arrows work at once; a thin outline, not a heavy frame.
          className={`absolute inset-0 overflow-y-auto overscroll-contain focus-visible:outline-1 focus-visible:outline-offset-[-4px] ${dark ? "focus-visible:outline-neutral-600" : "focus-visible:outline-faint"}`}
        >
          <div
            ref={contentRef}
            data-line-height={lineHeightPx}
            className="relative mx-auto max-w-3xl px-4 pt-[40vh] pb-[70vh] sm:px-6"
            style={{
              fontSize: settings.fontSize,
              lineHeight: settings.lineHeight,
              // All words start light; paintHighlight() darkens the current ones.
              color: `rgb(var(--tp-text) / ${teleprompter.highlight.dimOpacity})`,
            }}
          >
            <TeleprompterText blocks={blocks} language={language} />
          </div>
        </div>

        {status === "ready" && (
          <p
            className={`pointer-events-none absolute inset-x-0 bottom-2 px-3 text-center text-sm ${mutedText}`}
          >
            Press Start or the Space bar when you are ready, and read the bold word as it moves along.
          </p>
        )}

        {status === "finished" && (
          <FinishedScreen
            title={title}
            activeSeconds={display.activeSeconds}
            totals={totals}
            dark={dark}
            onPractiseAgain={practiseAgain}
          />
        )}
      </div>

      {status !== "finished" && (
        <TeleprompterControls
          status={status}
          settings={settings}
          canFinish={canFinish(progress)}
          showDisplay={showDisplay}
          isFullscreen={isFullscreen}
          fullscreenSupported={fullscreenSupported}
          onTogglePlay={togglePlay}
          onRestart={restart}
          onSpeed={changeSpeed}
          onToggleDisplay={() => setShowDisplay((open) => !open)}
          onFontSize={(direction) =>
            updateSettings({ fontSize: stepFontSize(settingsRef.current.fontSize, direction) })
          }
          onLineHeight={(direction) =>
            updateSettings({
              lineHeight: stepLineHeight(settingsRef.current.lineHeight, direction),
            })
          }
          dark={dark}
          onToggleTheme={() => chooseTheme(currentTheme() === "dark" ? "light" : "dark")}
          onToggleFullscreen={toggleFullscreen}
          onFinish={finish}
          onPointerPress={focusText}
        />
      )}
    </div>
  );
}
