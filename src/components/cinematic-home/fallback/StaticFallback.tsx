import { PALETTE } from "../scene/palette";
import { SCENE_RANGES } from "../timeline/timeline";

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * The experience without WebGL or motion — for reduced-motion visitors, devices
 * without WebGL2 or with a software GPU, and any WebGL failure. A normal-height
 * page (the 10-screen scroll only exists to drive the camera) with a still
 * composition and the same eight scenes. PLACEHOLDER content, like the 3D.
 */
export function StaticFallback() {
  return (
    <section
      data-testid="cinematic-fallback"
      className="relative px-5 pb-24 pt-[124px] text-white sm:px-10"
      style={{ backgroundColor: PALETTE.midnight }}
    >
      <div className="mx-auto flex max-w-5xl flex-col items-center">
        <StaticCore />
        <p className="mt-8 font-mono text-[11px] uppercase tracking-[0.3em] text-white/60">
          Static preview
        </p>
      </div>
      <ol className="mx-auto mt-20 grid max-w-5xl gap-x-8 sm:grid-cols-2 lg:grid-cols-4">
        {SCENE_RANGES.map((scene) => (
          <li key={scene.id} className="border-t border-white/10 py-6">
            <span className="font-mono text-[11px] text-white/60">{pad(scene.index + 1)}</span>
            <p className="mt-2 font-display text-[1.6rem] text-white/90">{scene.label}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

/** A still, flat echo of the placeholder core: rings, a faceted centre, a few nodes. */
function StaticCore() {
  const nodes: [number, number, number][] = [
    [-92, -40, 3],
    [78, -66, 2.5],
    [104, 30, 3],
    [-60, 82, 2.5],
    [20, 100, 2],
    [-110, 18, 2],
  ];
  return (
    <svg viewBox="-130 -130 260 260" className="h-56 w-56" aria-hidden="true">
      <circle r="86" fill="none" stroke={PALETTE.violet} strokeOpacity="0.55" />
      <ellipse
        rx="108"
        ry="36"
        fill="none"
        stroke={PALETTE.champagne}
        strokeOpacity="0.45"
        transform="rotate(-18)"
      />
      <polygon points="0,-44 38,-22 38,22 0,44 -38,22 -38,-22" fill={PALETTE.champagne} />
      <polygon points="0,-44 38,-22 0,0 -38,-22" fill={PALETTE.pearl} fillOpacity="0.18" />
      {nodes.map(([x, y, r]) => (
        <circle key={`${x},${y}`} cx={x} cy={y} r={r} fill={PALETTE.pearl} fillOpacity="0.7" />
      ))}
    </svg>
  );
}
