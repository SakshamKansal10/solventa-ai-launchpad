import { Volume2, VolumeX } from "lucide-react";
import { useSyncExternalStore } from "react";

import { soundController } from "./controller";

/**
 * The sound control in the cinematic navigation: discreet but clearly findable.
 * Off by default — "Enable cinematic sound"; once on — "Sound on", with a small
 * live level mark. A real toggle button (aria-pressed), reachable by keyboard.
 * Offered only while the WebGL experience is on the page; never required.
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
      aria-label="Cinematic sound"
      title={on ? "Sound on — select to mute" : "Enable cinematic sound"}
      onClick={() => soundController.toggle()}
      className={`inline-flex h-9 items-center gap-2 whitespace-nowrap rounded-full border px-3 font-mono text-[10.5px] uppercase tracking-[0.2em] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c4a67a] sm:h-10 ${
        on
          ? "border-[#c4a67a]/55 text-[#efe2c6] hover:border-[#c4a67a]"
          : "border-white/18 text-[#d8d1c4] hover:border-white/40 hover:text-white"
      }`}
    >
      {on ? (
        <Volume2 className="size-4" aria-hidden="true" />
      ) : (
        <VolumeX className="size-4" aria-hidden="true" />
      )}
      <span aria-hidden="true">
        {on ? (
          "Sound on"
        ) : (
          <>
            <span className="xl:hidden">Sound</span>
            <span className="max-xl:hidden">Enable cinematic sound</span>
          </>
        )}
      </span>
      {on && state.running && (
        <span aria-hidden="true" className="flex h-3 items-end gap-[2px]">
          {[0, 1, 2].map((k) => (
            <span
              key={k}
              className="w-[2px] animate-pulse rounded-full bg-[#e3c68e]"
              style={{ height: `${5 + k * 3}px`, animationDelay: `${k * 180}ms` }}
            />
          ))}
        </span>
      )}
    </button>
  );
}
