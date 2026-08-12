import { STAGE_THEMES, STAGE_COUNT } from "@/lib/onboarding-themes";

/** Renders all seven stage atmospheres stacked in the same spot and
 * crossfades between them via opacity — only the active section's layer
 * is visible at any time, and the transition itself is what makes moving
 * between chapters feel deliberate rather than an instant color swap.
 *
 * The crossfade opacity lives on an outer wrapper, separate from the
 * `stage-atmosphere-layer` class's own breathing-opacity animation on
 * the inner element — animated CSS properties beat inline styles on the
 * same node, so putting both on one element would let the breathing
 * keyframes fight the crossfade and leave every stage visible at once. */
export function StageAtmosphere({ activeSection }: { activeSection: number }) {
  return (
    <>
      {Array.from({ length: STAGE_COUNT }, (_, i) => i + 1).map((section) => {
        const theme = STAGE_THEMES[section];
        const active = section === activeSection;
        return (
          <div
            key={section}
            aria-hidden="true"
            className="absolute inset-0 transition-opacity duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
            style={{ opacity: active ? 1 : 0 }}
          >
            <div className="stage-atmosphere-layer" style={{ background: theme.atmosphere }} />
            <div
              className="stage-atmosphere-layer"
              style={{ background: theme.atmosphereEcho, animationDelay: "2.4s" }}
            />
          </div>
        );
      })}
    </>
  );
}
