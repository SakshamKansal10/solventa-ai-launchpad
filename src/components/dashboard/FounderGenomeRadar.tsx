import type { FounderGenome, FounderPersona } from "@/lib/profile/founder-genome";

const SIZE = 220;
const CENTER = SIZE / 2;
const MAX_RADIUS = SIZE / 2 - 34;
const RING_COUNT = 4;

function pointOnAxis(index: number, total: number, ratio: number) {
  // Start at the top (-90deg) and go clockwise, standard radar-chart layout.
  const angle = (Math.PI * 2 * index) / total - Math.PI / 2;
  return {
    x: CENTER + MAX_RADIUS * ratio * Math.cos(angle),
    y: CENTER + MAX_RADIUS * ratio * Math.sin(angle),
  };
}

/** Six-axis radar/orbit visualization of the Founder Genome — every
 * vertex is a real 0-100 score from computeFounderGenome (see
 * founder-genome.ts), never a decorative shape. Replaces a plain list of
 * six dot-scale rows with one visual a founder reads in 2-3 seconds. */
export function FounderGenomeRadar({ genome }: { genome: FounderGenome }) {
  const dims = genome.dimensions;
  const n = dims.length;

  const dataPoints = dims.map((d, i) => pointOnAxis(i, n, d.score / 100));
  const dataPath = dataPoints.map((p) => `${p.x},${p.y}`).join(" ");

  return (
    <div className="relative" style={{ width: SIZE, height: SIZE }}>
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        {/* Concentric reference rings */}
        {Array.from({ length: RING_COUNT }).map((_, ringIndex) => {
          const ratio = (ringIndex + 1) / RING_COUNT;
          const ringPoints = Array.from({ length: n }, (_, i) => pointOnAxis(i, n, ratio))
            .map((p) => `${p.x},${p.y}`)
            .join(" ");
          return (
            <polygon
              key={ringIndex}
              points={ringPoints}
              fill="none"
              stroke="var(--sol-border)"
              strokeWidth={1}
            />
          );
        })}

        {/* Spokes */}
        {dims.map((_, i) => {
          const outer = pointOnAxis(i, n, 1);
          return (
            <line
              key={i}
              x1={CENTER}
              y1={CENTER}
              x2={outer.x}
              y2={outer.y}
              stroke="var(--sol-border)"
              strokeWidth={1}
            />
          );
        })}

        {/* Real data shape */}
        <polygon
          points={dataPath}
          fill="var(--sol-violet)"
          fillOpacity={0.14}
          stroke="var(--sol-violet)"
          strokeWidth={1.75}
          strokeLinejoin="round"
          className="transition-all duration-700 ease-out"
        />
        {dataPoints.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={3.5} fill="var(--sol-champagne)" />
        ))}
      </svg>

      {/* Axis labels — positioned outside the outer ring */}
      {dims.map((d, i) => {
        const labelPoint = pointOnAxis(i, n, 1.22);
        return (
          <span
            key={d.key}
            className="absolute -translate-x-1/2 -translate-y-1/2 text-center text-[0.62rem] font-semibold uppercase leading-tight tracking-[0.04em] text-sol-secondary"
            style={{ left: labelPoint.x, top: labelPoint.y, width: 74 }}
          >
            {d.label}
          </span>
        );
      })}
    </div>
  );
}

/** Genome radar + persona, side by side — the Command Center's compact
 * intelligence card (replaces the six-row dot list on the dashboard
 * specifically; the onboarding "forming" view keeps its own progressive
 * dot-scale, which already handles the "unformed until answered" state
 * this radar doesn't need to represent). */
export function FounderGenomeCardV2({
  genome,
  persona,
}: {
  genome: FounderGenome;
  persona?: FounderPersona;
}) {
  return (
    <div className="rounded-[24px] border border-sol-border bg-sol-surface p-8">
      <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-sol-champagne-deep">
        Founder Genome
      </p>
      <div className="mt-5 flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:justify-between">
        <FounderGenomeRadar genome={genome} />
        {persona && (
          <div className="flex flex-col items-center gap-3 sm:items-end">
            <p className="text-center font-display text-[22px] font-semibold leading-tight text-sol-ink sm:text-right">
              {persona.name.toUpperCase()}
            </p>
            <div className="flex flex-wrap justify-center gap-1.5 sm:justify-end">
              {persona.attributes.slice(0, 3).map((attr) => (
                <span
                  key={attr}
                  className="rounded-full border border-sol-border bg-sol-ivory px-2.5 py-1 text-[11px] font-medium text-sol-secondary"
                >
                  {attr}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
