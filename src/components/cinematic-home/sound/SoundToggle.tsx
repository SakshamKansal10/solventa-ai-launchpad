import { Volume2, VolumeX } from "lucide-react";
import { useSyncExternalStore } from "react";

import { soundController } from "./controller";

/**
 * The sound toggle in the bar. Sound is OFF until the visitor presses it: no audio context
 * exists before that click, so nothing about sound can slow the intro. The choice is remembered
 * for the visit. Offered with the WebGL experience only (the still version is silent). A real
 * toggle button (aria-pressed) for pointer, keyboard and screen readers alike.
 */
export function SoundToggle() {
  const state = useSyncExternalStore(
    soundController.subscribe,
    soundController.snapshot,
    soundController.serverSnapshot,
  );
  if (!state.available) return null;
  const on = state.enabled;
  return (
    <button
      type="button"
      data-testid="sound-toggle"
      data-audio={state.running ? "running" : "idle"}
      aria-pressed={on}
      aria-label={on ? "Mute sound" : "Turn sound on"}
      title={on ? "Mute sound" : "Turn sound on"}
      onClick={() => soundController.toggle()}
      className="inline-flex size-9 items-center justify-center rounded-full transition-opacity hover:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
      style={{ color: "var(--quiet)" }}
    >
      {on ? (
        <Volume2 className="size-[18px]" aria-hidden="true" />
      ) : (
        <VolumeX className="size-[18px]" aria-hidden="true" />
      )}
    </button>
  );
}
