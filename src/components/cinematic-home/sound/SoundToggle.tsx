import { Volume2, VolumeX } from "lucide-react";
import { useSyncExternalStore } from "react";

import { soundController } from "./controller";

/**
 * The sound control — not a feature in the bar, just a way out. Sound is part of the experience
 * and starts with the visitor's first interaction; this quiet, icon-only control appears only
 * once sound has actually played (or when the visitor has muted it, so it can always be turned
 * back on), so arriving visitors never meet a utility competing with the film. A real toggle
 * button (aria-pressed), reachable by keyboard, constant footprint.
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
