import { Volume2, VolumeX } from "lucide-react";
import { useSyncExternalStore } from "react";

import { soundController } from "./controller";

/**
 * The discreet sound control in the cinematic navigation. Off by default;
 * a real toggle button (aria-pressed), reachable by keyboard. Offered only
 * while the WebGL experience is on the page.
 */
export function SoundToggle() {
  const state = useSyncExternalStore(
    soundController.subscribe,
    soundController.snapshot,
    soundController.serverSnapshot,
  );
  if (!state.available) return null;
  return (
    <button
      type="button"
      data-testid="sound-toggle"
      data-audio={state.running ? "running" : "idle"}
      aria-pressed={state.enabled}
      aria-label="Sound"
      title={state.enabled ? "Sound on" : "Sound off"}
      onClick={() => soundController.toggle()}
      className="inline-flex h-10 items-center gap-2 rounded-full px-2.5 font-mono text-[10.5px] uppercase tracking-[0.22em] text-[#d8d1c4] transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c4a67a] sm:h-11"
    >
      {state.enabled ? (
        <Volume2 className="size-4" aria-hidden="true" />
      ) : (
        <VolumeX className="size-4" aria-hidden="true" />
      )}
      <span aria-hidden="true" className="max-md:hidden">
        {state.enabled ? "Sound on" : "Sound off"}
      </span>
    </button>
  );
}
