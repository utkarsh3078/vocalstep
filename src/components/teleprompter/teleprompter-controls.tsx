import {
  Flag,
  Maximize,
  Minimize,
  Minus,
  Moon,
  Pause,
  Play,
  Plus,
  RotateCcw,
  SlidersHorizontal,
  Sun,
} from "lucide-react";
import type { MouseEvent, ReactNode } from "react";

import { practice } from "@/config/practice";
import { teleprompter } from "@/config/teleprompter";
import type { TeleprompterSettings } from "@/lib/teleprompter/storage";

export type PlaybackStatus = "ready" | "playing" | "paused" | "finished";

interface ControlsProps {
  status: PlaybackStatus;
  settings: TeleprompterSettings;
  canFinish: boolean;
  showDisplay: boolean;
  isFullscreen: boolean;
  fullscreenSupported: boolean;
  onTogglePlay: () => void;
  onRestart: () => void;
  onSpeed: (direction: 1 | -1) => void;
  onToggleDisplay: () => void;
  onFontSize: (direction: 1 | -1) => void;
  onLineHeight: (direction: 1 | -1) => void;
  /** The site's theme is dark (the teleprompter always uses the site's theme). */
  dark: boolean;
  /** Switches the site's theme, and with it the teleprompter's. */
  onToggleTheme: () => void;
  onToggleFullscreen: () => void;
  onFinish: () => void;
  /**
   * Called after a control is pressed with a mouse or finger, so keyboard
   * shortcuts keep working instead of re-pressing the last button.
   */
  onPointerPress: () => void;
}

/**
 * The teleprompter's controls: one floating bar, with display settings in a
 * panel above it. Buttons with an icon keep their name as text (hidden on
 * phones to save room), so screen readers and shortcuts' hints stay the same.
 */
export function TeleprompterControls(props: ControlsProps) {
  const { status, settings, canFinish, showDisplay, dark } = props;
  const { fontSize, lineHeights, speed } = teleprompter;

  const tone = {
    bar: dark ? "border-neutral-800 bg-neutral-900/95 shadow-black/40" : "border-line bg-surface",
    button: dark ? "text-neutral-100 hover:bg-neutral-800" : "text-ink hover:bg-well",
    primary: dark ? "bg-white text-neutral-950 hover:bg-neutral-200" : "bg-ink text-on-ink hover:bg-ink-soft",
    muted: dark ? "text-neutral-400" : "text-muted",
    divider: dark ? "bg-neutral-800" : "bg-line",
    focus: dark ? "focus-visible:outline-white" : "focus-visible:outline-ink",
  };

  const button = (
    label: ReactNode,
    onPress: () => void,
    options: {
      name?: string;
      disabled?: boolean;
      primary?: boolean;
      pressed?: boolean;
      title?: string;
      round?: boolean;
    } = {},
  ) => (
    <button
      type="button"
      aria-label={options.name}
      aria-pressed={options.pressed}
      title={options.title ?? options.name}
      disabled={options.disabled}
      onClick={(event: MouseEvent) => {
        onPress();
        // detail is 0 for keyboard presses and at least 1 for mouse or touch.
        if (event.detail > 0) props.onPointerPress();
      }}
      className={[
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-full text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-35",
        tone.focus,
        options.round ? "min-w-11" : "px-4",
        options.primary ? `${tone.primary} px-6` : tone.button,
        options.pressed ? (dark ? "bg-neutral-800" : "bg-well") : "",
      ].join(" ")}
    >
      {label}
    </button>
  );

  /** An icon with its name as text; the text hides on phones but stays for screen readers. */
  const labelled = (icon: ReactNode, text: string) => (
    <>
      {icon}
      <span className="max-sm:sr-only">{text}</span>
    </>
  );

  const playLabel = status === "playing" ? "Pause" : status === "paused" ? "Resume" : "Start";
  const iconClass = "size-4 shrink-0";

  return (
    <div className="px-3 pt-2 pb-3 sm:pb-5">
      {showDisplay && (
        <div
          id="teleprompter-display-settings"
          role="group"
          aria-label="Display settings"
          className={`mx-auto mb-2 flex max-w-3xl flex-wrap items-center justify-center gap-x-6 gap-y-2 rounded-3xl border px-4 py-3 text-sm shadow-lg ${tone.bar}`}
        >
          <div className="flex items-center gap-1">
            <span className={`mr-1 ${tone.muted}`}>Text size</span>
            {button(<Minus aria-hidden="true" className={iconClass} />, () => props.onFontSize(-1), {
              name: "Smaller text",
              disabled: settings.fontSize <= fontSize.min,
              round: true,
            })}
            <span className="w-12 text-center tabular-nums">{settings.fontSize}px</span>
            {button(<Plus aria-hidden="true" className={iconClass} />, () => props.onFontSize(1), {
              name: "Larger text",
              disabled: settings.fontSize >= fontSize.max,
              round: true,
            })}
          </div>
          <div className="flex items-center gap-1">
            <span className={`mr-1 ${tone.muted}`}>Line spacing</span>
            {button(<Minus aria-hidden="true" className={iconClass} />, () => props.onLineHeight(-1), {
              name: "Less line spacing",
              disabled: settings.lineHeight <= lineHeights[0],
              round: true,
            })}
            <span className="w-8 text-center tabular-nums">{settings.lineHeight}</span>
            {button(<Plus aria-hidden="true" className={iconClass} />, () => props.onLineHeight(1), {
              name: "More line spacing",
              disabled: settings.lineHeight >= lineHeights[lineHeights.length - 1],
              round: true,
            })}
          </div>
          {button(
            <>
              {dark ? (
                <Sun aria-hidden="true" className={iconClass} />
              ) : (
                <Moon aria-hidden="true" className={iconClass} />
              )}
              {dark ? "Light mode" : "Dark mode"}
            </>,
            props.onToggleTheme,
          )}
        </div>
      )}

      <div
        className={`mx-auto flex w-fit max-w-full flex-wrap items-center justify-center gap-1 rounded-[2rem] border p-1.5 shadow-lg ${tone.bar}`}
      >
        {button(labelled(<RotateCcw aria-hidden="true" className={iconClass} />, "Restart"), props.onRestart)}

        <span aria-hidden="true" className={`mx-1 hidden h-6 w-px sm:block ${tone.divider}`} />

        <div className="flex items-center" role="group" aria-label="Reading speed">
          {button(<Minus aria-hidden="true" className={iconClass} />, () => props.onSpeed(-1), {
            name: "Slower (Down arrow)",
            disabled: settings.wpm <= speed.min,
            round: true,
          })}
          <span className="w-[4.5rem] text-center text-sm font-medium tabular-nums" aria-live="polite">
            {settings.wpm} wpm
          </span>
          {button(<Plus aria-hidden="true" className={iconClass} />, () => props.onSpeed(1), {
            name: "Faster (Up arrow)",
            disabled: settings.wpm >= speed.max,
            round: true,
          })}
        </div>

        {button(
          <>
            {status === "playing" ? (
              <Pause aria-hidden="true" className={iconClass} fill="currentColor" />
            ) : (
              <Play aria-hidden="true" className={iconClass} fill="currentColor" />
            )}
            {playLabel}
          </>,
          props.onTogglePlay,
          { primary: true, title: `${playLabel} (Space)` },
        )}

        {button(labelled(<SlidersHorizontal aria-hidden="true" className={iconClass} />, "Display"), props.onToggleDisplay, {
          pressed: showDisplay,
        })}
        {props.fullscreenSupported &&
          button(
            labelled(
              props.isFullscreen ? (
                <Minimize aria-hidden="true" className={iconClass} />
              ) : (
                <Maximize aria-hidden="true" className={iconClass} />
              ),
              props.isFullscreen ? "Exit full screen" : "Full screen",
            ),
            props.onToggleFullscreen,
          )}
        {button(labelled(<Flag aria-hidden="true" className={iconClass} />, "Finish"), props.onFinish, {
          disabled: !canFinish,
          title: canFinish
            ? "Finish this session"
            : `Available from ${Math.round(practice.completionThreshold * 100)}%`,
        })}
      </div>
    </div>
  );
}
