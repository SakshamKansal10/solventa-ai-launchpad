import { Volume2, VolumeX } from "lucide-react";
import { useSyncExternalStore } from "react";

import { soundController } from "./controller";

/**
 * The sound control in the cinematic navigation: discreet but clearly findable.
 * Off by default (muted speaker); once on, the speaker sounds, the edge turns champagne and a
 * small live level mark plays — all in one constant footprint, so the bar never shifts. A real
 * toggle button (aria-pressed), reachable by keyboard; icon-only on phones.
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
      className={`inline-flex h-9 items-center gap-2 whitespace-nowrap rounded-full border px-3 font-mono max-sm:w-9 max-sm:justify-center max-sm:px-0 text-[10.5px] uppercase tracking-[0.2em] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c4a67a] sm:h-10 ${
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
      <span aria-hidden="true" className="max-sm:hidden">
        Sound
      </span>
      {/* The level mark always holds its place; it only animates while sound is playing. */}
      <span aria-hidden="true" className="flex h-3 w-[10px] items-end gap-[2px] max-sm:hidden">
        {[0, 1, 2].map((k) => (
          <span
            key={k}
            className={`w-[2px] rounded-full ${on && state.running ? "animate-pulse bg-[#e3c68e]" : "opacity-0"}`}
            style={{
              height: `${on && state.running ? 5 + k * 3 : 3}px`,
              animationDelay: `${k * 180}ms`,
            }}
          />
        ))}
      </span>
    </button>
  );
}
