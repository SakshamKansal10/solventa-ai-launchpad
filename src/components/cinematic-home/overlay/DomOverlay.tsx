import { useExperienceStore, useExperienceValue } from "../scroll/experience-store";
import { SCENE_RANGES } from "../timeline/timeline";

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * The DOM layer above the canvas — where real copy, CTAs and product UI will
 * live in later phases. Phase 1 shows only development markers: the current
 * scene and a scroll cue. Re-renders on scene change only (8 times a visit).
 */
export function DomOverlay() {
  const store = useExperienceStore();
  const sceneIndex = useExperienceValue(store, (s) => s.sceneIndex);
  const atStart = useExperienceValue(store, (s) => s.atStart);
  const scene = SCENE_RANGES[sceneIndex];

  return (
    <div
      aria-hidden="true"
      data-testid="cinematic-overlay"
      data-scene={scene.id}
      className="pointer-events-none absolute inset-0"
    >
      <div className="absolute bottom-7 left-5 sm:bottom-9 sm:left-10">
        <p
          key={scene.id}
          className="sol-reveal font-mono text-[11px] uppercase tracking-[0.3em] text-white/70"
        >
          {pad(scene.index + 1)} / {pad(SCENE_RANGES.length)} — {scene.label}
        </p>
      </div>
      <p
        className={`absolute bottom-7 left-1/2 -translate-x-1/2 font-mono text-[11px] uppercase tracking-[0.3em] text-white/60 transition-opacity duration-700 sm:bottom-9 ${
          atStart ? "opacity-100" : "opacity-0"
        }`}
      >
        Scroll
      </p>
    </div>
  );
}
