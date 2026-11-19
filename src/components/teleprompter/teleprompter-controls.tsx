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
  onToggleTheme: () => void;
  onToggleFullscreen: () => void;
  onFinish: () => void;
  /**
   * Called after a control is pressed with a mouse or finger, so keyboard
   * shortcuts keep working instead of re-pressing the last button.
   */
  onPointerPress: () => void;
}

export function TeleprompterControls(props: ControlsProps) {
  const { status, settings, canFinish, showDisplay } = props;
  const dark = settings.theme === "dark";
  const { fontSize, lineHeights, speed } = teleprompter;

  const button = (
    label: ReactNode,
    onPress: () => void,
    options: { name?: string; disabled?: boolean; primary?: boolean; pressed?: boolean; title?: string } = {},
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
        "min-h-11 min-w-11 rounded-md border px-3 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40",
        options.primary
          ? dark
            ? "border-white bg-white text-neutral-950 hover:bg-neutral-200"
            : "border-neutral-900 bg-neutral-900 text-white hover:bg-neutral-700"
          : dark
            ? "border-neutral-600 hover:bg-neutral-800"
            : "border-neutral-300 hover:bg-neutral-100",
      ].join(" ")}
    >
      {label}
    </button>
  );

  const playLabel =
    status === "playing" ? "Pause" : status === "paused" ? "Resume" : "Start";

  return (
    <div
      className={`border-t px-3 py-2 ${dark ? "border-neutral-800 bg-neutral-900" : "border-neutral-200 bg-neutral-50"}`}
    >
      {showDisplay && (
        <div
          id="teleprompter-display-settings"
          role="group"
          aria-label="Display settings"
          className="mx-auto mb-2 flex max-w-3xl flex-wrap items-center gap-x-6 gap-y-2 text-sm"
        >
          <div className="flex items-center gap-2">
            <span>Text size</span>
            {button("−", () => props.onFontSize(-1), {
              name: "Smaller text",
              disabled: settings.fontSize <= fontSize.min,
            })}
            <span className="w-12 text-center tabular-nums">{settings.fontSize}px</span>
            {button("+", () => props.onFontSize(1), {
              name: "Larger text",
              disabled: settings.fontSize >= fontSize.max,
            })}
          </div>
          <div className="flex items-center gap-2">
            <span>Line spacing</span>
            {button("−", () => props.onLineHeight(-1), {
              name: "Less line spacing",
              disabled: settings.lineHeight <= lineHeights[0],
            })}
            <span className="w-8 text-center tabular-nums">{settings.lineHeight}</span>
            {button("+", () => props.onLineHeight(1), {
              name: "More line spacing",
              disabled: settings.lineHeight >= lineHeights[lineHeights.length - 1],
            })}
          </div>
          {button(dark ? "Light mode" : "Dark mode", props.onToggleTheme)}
        </div>
      )}

      <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-2">
        {button(playLabel, props.onTogglePlay, { primary: true, title: `${playLabel} (Space)` })}
        {button("Restart", props.onRestart)}

        <div className="flex items-center gap-1" role="group" aria-label="Reading speed">
          {button("−", () => props.onSpeed(-1), {
            name: "Slower (Down arrow)",
            disabled: settings.wpm <= speed.min,
          })}
          <span className="w-20 text-center text-sm tabular-nums" aria-live="polite">
            {settings.wpm} wpm
          </span>
          {button("+", () => props.onSpeed(1), {
            name: "Faster (Up arrow)",
            disabled: settings.wpm >= speed.max,
          })}
        </div>

        {button("Display", props.onToggleDisplay, { pressed: showDisplay })}
        {props.fullscreenSupported &&
          button(props.isFullscreen ? "Exit full screen" : "Full screen", props.onToggleFullscreen)}
        {button("Finish", props.onFinish, {
          disabled: !canFinish,
          title: canFinish
            ? "Finish this session"
            : `Available from ${Math.round(practice.completionThreshold * 100)}%`,
        })}
      </div>
    </div>
  );
}
