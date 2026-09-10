import { motion, useReducedMotion } from "motion/react";

const RINGS: { r: number; stroke: string; dash: string }[] = [
  { r: 230, stroke: "rgba(114,87,216,.10)", dash: "180 46 120 70" },
  { r: 310, stroke: "rgba(197,163,106,.095)", dash: "240 60 160 50" },
  { r: 390, stroke: "rgba(114,87,216,.10)", dash: "300 40 200 90" },
  { r: 480, stroke: "rgba(197,163,106,.095)", dash: "360 70 240 60" },
];

/** The homepage's one emotional mission statement — deliberately just
 * this, nothing else. Mission & Vision's fuller panels and the
 * Founder's Story now live on /about, not stacked underneath this.
 * Four broken (never perfectly-closed) orbital rings restore Solventia's
 * violet/champagne intelligence character behind the statement — the
 * statement itself never moves; only two thin highlight arcs travel,
 * slowly, in opposite directions. */
export function BrandMoment() {
  const reduceMotion = useReducedMotion();
  return (
    <section
      className="relative flex items-center justify-center overflow-hidden bg-sol-hp-ivory px-[18px] sm:px-6"
      style={{ minHeight: 560 }}
    >
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 h-[620px] w-[900px] -translate-x-1/2 -translate-y-1/2"
        style={{
          background:
            "radial-gradient(ellipse 620px 400px at 50% 50%, rgba(114,87,216,.075), transparent 70%)",
        }}
        aria-hidden="true"
      />

      <svg
        viewBox="0 0 1000 1000"
        className="pointer-events-none absolute left-1/2 top-1/2 h-[960px] w-[960px] -translate-x-1/2 -translate-y-1/2"
        aria-hidden="true"
      >
        {RINGS.map((ring, i) => (
          <circle
            key={i}
            cx={500}
            cy={500}
            r={ring.r}
            fill="none"
            stroke={ring.stroke}
            strokeWidth={1}
            strokeDasharray={ring.dash}
            transform={`rotate(${i * 23} 500 500)`}
          />
        ))}
        {!reduceMotion && (
          <>
            <motion.circle
              cx={500}
              cy={500}
              r={310}
              fill="none"
              stroke="rgba(114,87,216,.55)"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeDasharray="60 1888"
              animate={{ rotate: 360 }}
              style={{ transformOrigin: "500px 500px" }}
              transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
            />
            <motion.circle
              cx={500}
              cy={500}
              r={390}
              fill="none"
              stroke="rgba(197,163,106,.5)"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeDasharray="50 2400"
              animate={{ rotate: -360 }}
              style={{ transformOrigin: "500px 500px" }}
              transition={{ duration: 24, repeat: Infinity, ease: "linear" }}
            />
          </>
        )}
      </svg>

      <div className="relative mx-auto max-w-[980px] text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sol-champagne-deep">
          Why Solventia Exists
        </p>
        <p className="mx-auto mt-6 font-display text-[36px] font-medium leading-[1.2] text-sol-ink sm:text-[48px] lg:text-[56px] lg:leading-[1.15]">
          Millions have ideas.{" "}
          <span className="italic text-sol-champagne-deep">Few have the clarity</span> to turn them
          into something real.
        </p>
      </div>
    </section>
  );
}
