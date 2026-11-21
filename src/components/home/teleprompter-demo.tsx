"use client";

import { BookOpen, Maximize2, Minus, Pause, Play, Plus } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";

import { teleprompter } from "@/config/teleprompter";
import type { SpeechBlock } from "@/lib/speech/blocks";
import { demoDelay, excerptWordCount, paragraphEnds } from "@/lib/teleprompter/demo";
import { emphasis, wordOpacity } from "@/lib/teleprompter/highlight";
import { progressAt, stepSpeed } from "@/lib/teleprompter/timing";

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

const { highlight } = teleprompter;
/** The real teleprompter's light-theme text colour (its --tp-text), as RGB. */
const TEXT_RGB = "23 23 23";

/**
 * The real teleprompter's highlight, for a demo that moves word by word: the
 * word being read turns fully dark and bold, the words around it fade in and
 * out, and the rest stays light. The same helpers and settings as the
 * teleprompter itself (src/lib/teleprompter/highlight.ts), so the two match.
 * Bold is an outline around the letters, so lines never re-wrap.
 */
function wordStyle(position: number, current: number): CSSProperties {
  const strength = emphasis(position, current + 0.5, highlight);
  return {
    // Every word has the full colour and its own opacity, so fading in and
    // out is one smooth change.
    opacity: wordOpacity(strength, highlight.dimOpacity),
    WebkitTextStrokeWidth: strength > 0 ? `${(highlight.boldStrokeEm * strength).toFixed(4)}em` : 0,
    // The demo steps a word at a time; a short fade makes it glide like the original.
    transition: "opacity 200ms ease-out, -webkit-text-stroke-width 200ms ease-out",
  };
}

function subscribeToMotion(onChange: () => void) {
  const query = window.matchMedia(REDUCED_MOTION);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/**
 * The live teleprompter on the home page: the opening of a sample speech,
 * read word by word on a loop, with working pause and speed buttons.
 *
 * It plays only while on screen, and starts paused for people who ask for
 * reduced motion. Every timer stops in an effect cleanup, so leaving the page
 * (which hides it with <Activity>) stops it too.
 */
export function TeleprompterDemo({
  title,
  blocks,
  defaultWpm,
  practiceHref,
}: {
  title: string;
  blocks: SpeechBlock[];
  defaultWpm: number;
  practiceHref: string;
}) {
  // On the server, and for reduced motion, the demo starts paused.
  const motionAllowed = useSyncExternalStore(
    subscribeToMotion,
    () => !window.matchMedia(REDUCED_MOTION).matches,
    () => false,
  );
  /** The visitor's own play/pause choice, once they make one. */
  const [choice, setChoice] = useState<boolean | null>(null);
  const [onScreen, setOnScreen] = useState(false);
  const [index, setIndex] = useState(0);
  const [wpm, setWpm] = useState(defaultWpm);

  const rootRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);

  const wordCount = excerptWordCount(blocks);
  const playing = choice ?? motionAllowed;
  const running = playing && onScreen && wordCount > 0;

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const observer = new IntersectionObserver(([entry]) => setOnScreen(entry.isIntersecting), {
      threshold: 0.25,
    });
    observer.observe(root);
    return () => observer.disconnect();
  }, []);

  // Moves to the next word after that word's time, and back to the start at the end.
  useEffect(() => {
    if (!running) return;
    const timer = window.setTimeout(
      () => setIndex((current) => (current >= wordCount - 1 ? 0 : current + 1)),
      demoDelay(index, wpm, wordCount, paragraphEnds(blocks)),
    );
    return () => window.clearTimeout(timer);
  }, [running, index, wpm, wordCount, blocks]);

  // Keeps the current word near the reading line, a third of the way down.
  const scrollToWord = useCallback(() => {
    const viewport = viewportRef.current;
    const text = textRef.current;
    const word = text?.querySelector<HTMLElement>(`[data-word="${index}"]`);
    if (!viewport || !text || !word) return;
    const offset = Math.max(0, word.offsetTop - viewport.clientHeight * teleprompter.readingLine);
    text.style.transform = `translateY(${-offset}px)`;
  }, [index]);

  useEffect(() => {
    scrollToWord();
    window.addEventListener("resize", scrollToWord);
    return () => window.removeEventListener("resize", scrollToWord);
  }, [scrollToWord]);

  const iconButton =
    "flex size-10 items-center justify-center rounded-full border border-line transition-colors hover:bg-well disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <div ref={rootRef} className="rounded-card bg-surface p-5 sm:p-7">
      <div className="flex items-center gap-3">
        <span aria-hidden="true" className="flex size-10 items-center justify-center rounded-full bg-well">
          <BookOpen className="size-4" strokeWidth={1.75} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold tracking-tight">{title}</p>
          <p className="text-sm text-muted">Teleprompter demo</p>
        </div>
        <span className="rounded-full bg-mint-50 px-2.5 py-1 text-sm font-medium text-mint-700 tabular-nums">
          {wpm} wpm
        </span>
      </div>

      <p className="sr-only">
        A demo of the teleprompter reading the opening of “{title}”, highlighting one word at a time.
      </p>
      {/* The words change several times a second, so screen readers skip them. */}
      <div ref={viewportRef} aria-hidden="true" className="relative mt-6 h-52 overflow-hidden sm:h-56">
        <div
          ref={textRef}
          className="relative transition-transform duration-500 ease-out motion-reduce:transition-none"
          // Light text, darkened around the current word by wordStyle(), as in the real teleprompter.
          style={{ color: `rgb(${TEXT_RGB})` }}
        >
          {blocks.map((block, blockIndex) =>
            block.type === "heading" ? (
              <p
                key={blockIndex}
                className="mt-6 mb-3 text-xs font-semibold tracking-wider text-faint uppercase first:mt-0"
              >
                {block.text}
              </p>
            ) : (
              <p key={blockIndex} className="mb-4 text-xl leading-relaxed sm:text-[1.35rem]">
                {block.words.map((word, wordIndex) => {
                  const position = block.startWordIndex + wordIndex;
                  return (
                    <span key={wordIndex}>
                      <span data-word={position} style={wordStyle(position, index)}>
                        {word}
                      </span>{" "}
                    </span>
                  );
                })}
              </p>
            ),
          )}
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-surface to-transparent" />
      </div>

      <div aria-hidden="true" className="mt-4 h-1.5 overflow-hidden rounded-full bg-well">
        <div
          className="h-full rounded-full bg-mint-400 transition-[width] duration-300 ease-out motion-reduce:transition-none"
          style={{ width: `${progressAt(index + 1, wordCount) * 100}%` }}
        />
      </div>

      <div className="mt-5 flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => setWpm((current) => stepSpeed(current, -1))}
          disabled={wpm <= teleprompter.speed.min}
          aria-label="Slower"
          className={iconButton}
        >
          <Minus aria-hidden="true" className="size-4" />
        </button>
        <button
          type="button"
          onClick={() => setChoice(!playing)}
          aria-label={playing ? "Pause the demo" : "Play the demo"}
          className="flex size-14 items-center justify-center rounded-full bg-ink text-white transition-colors hover:bg-ink-soft"
        >
          {playing ? (
            <Pause aria-hidden="true" className="size-5" fill="currentColor" />
          ) : (
            <Play aria-hidden="true" className="ml-0.5 size-5" fill="currentColor" />
          )}
        </button>
        <button
          type="button"
          onClick={() => setWpm((current) => stepSpeed(current, 1))}
          disabled={wpm >= teleprompter.speed.max}
          aria-label="Faster"
          className={iconButton}
        >
          <Plus aria-hidden="true" className="size-4" />
        </button>
      </div>

      {/* Right-aligned, clear of the streak card that overlaps the bottom left. */}
      <p className="mt-5 text-right">
        <Link
          href={practiceHref}
          className="inline-flex items-center gap-1.5 text-sm text-muted underline-offset-4 hover:text-ink hover:underline"
        >
          <Maximize2 aria-hidden="true" className="size-3.5" />
          Open the full teleprompter
        </Link>
      </p>
    </div>
  );
}
