import { Volume2, VolumeX } from "lucide-react";
import { useSyncExternalStore } from "react";

import { soundController } from "./controller";

/**
 * The sound control — not a feature in the bar, just a way out. Sound is part of the experience
 * and starts, quietly, with the visitor's first interaction (passive listeners: it never holds up
 * the scroll or the click that starts it). There is no visible icon: the control exists only once
 * sound has actually played (or when the visitor has muted it, so it can be turned back on), and
 * even then it takes no room and shows itself only to keyboard focus — a real toggle button
 * (aria-pressed) for keyboard and screen-reader users, invisible and inert to the pointer.
 * Positioned against the bar's action cluster (absolute, to its left).
 */
export function SoundToggle() {
  const state = useSyncExternalStore(
    soundController.subscribe,
    soundController.snapshot,
    soundController.serverSnapshot,
  );
  if (!state.available || (!state.active && state.enabled)) return null;
  const on = state.enabled;
  return (
    <button
      type="button"
      data-testid="sound-toggle"
      data-audio={state.running ? "running" : "idle"}
      aria-pressed={on}
      aria-label={on ? "Mute sound" : "Turn sound back on"}
      title={on ? "Mute sound" : "Turn sound back on"}
      onClick={() => soundController.toggle()}
      className="pointer-events-none absolute right-full top-1/2 mr-2 inline-flex size-9 -translate-y-1/2 items-center justify-center rounded-full opacity-0 focus-visible:pointer-events-auto focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
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
