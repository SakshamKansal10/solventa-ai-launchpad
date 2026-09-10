import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import mark from "@/assets/solventia-mark.png";

/** A generic but high-potential demo profile — deliberately not the
 * founder's own data (this section renders identically for every
 * anonymous visitor) and deliberately not a real institution name by
 * default, per the spec's own warning against defaulting to one. */
const SIGNALS = [
  { label: "Education", value: "Computer Science Graduate" },
  { label: "Capital", value: "$20K" },
  { label: "Time", value: "15 hrs/week" },
  { label: "Strength", value: "Technical Builder" },
  { label: "Ambition", value: "Scalable Venture" },
];

const GENOME_NODES = ["Skill", "Capital", "Time", "Risk", "Ambition", "Access"];

const DIRECTIONS = [
  { title: "AI Workflow Infrastructure", fit: 92 },
  { title: "Developer Tooling SaaS", fit: 81 },
];

const FLOW = ["Select", "Prove", "Week 01"];

// Left-column row connector start points and the orbit center, expressed
// as percentages of the canvas box — lets one 0-100 viewBox (non-uniform
// scaled) describe every path regardless of the canvas's actual rendered
// width, which itself varies with viewport (min(1280px, 100vw - 80px)).
const ROW_Y = [16, 33, 50, 67, 84];
const ORBIT_CENTER = { x: 45, y: 50 };

function orbitPoint(index: number, total: number, radius: number) {
  const angle = (Math.PI * 2 * index) / total - Math.PI / 2;
  return {
    x: ORBIT_CENTER.x + radius * Math.cos(angle) * 0.62,
    y: ORBIT_CENTER.y + radius * Math.sin(angle),
  };
}

/** The homepage's signature product demonstration — replaces "See It In
 * Action", "What You Get", and "Featured Startup Ideas" with one
 * continuous visual: founder signals flow into a Founder Genome, which
 * produces three ranked directions, which flow into execution. The
 * point is showing the mechanism, not listing features. */
export function FounderSignal() {
  const reduceMotion = useReducedMotion();
  const [entered, setEntered] = useState(false);

  return (
    <section
      id="founder-signal"
      className="scroll-mt-[84px] bg-sol-hp-pearl px-[18px] py-[96px] sm:px-6 lg:px-9 lg:py-[120px]"
    >
      <div className="mx-auto max-w-[1180px] text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sol-champagne-deep">
          The Solventia Difference
        </p>
        <h2 className="mx-auto mt-5 max-w-[720px] font-display text-[32px] font-semibold leading-[1.15] text-sol-ink sm:text-[40px] sm:leading-[46px]">
          Your profile should{" "}
          <span className="italic text-sol-champagne-deep">change the opportunity.</span>
        </h2>
        <p className="mx-auto mt-5 max-w-[580px] text-[17px] leading-[27px] text-sol-secondary">
          Watch how Solventia turns founder context into business direction.
        </p>
      </div>

      <motion.div
        onViewportEnter={() => setEntered(true)}
        viewport={{ once: true, margin: "-120px" }}
        className="relative mx-auto mt-16 overflow-hidden rounded-[32px] border border-sol-border"
        style={{
          width: "min(1280px, calc(100vw - 80px))",
          minHeight: 620,
          background:
            "radial-gradient(circle at 49% 50%, rgba(114,87,216,.10), rgba(114,87,216,.035) 30%, transparent 52%), linear-gradient(135deg, #FFFDFB 0%, #F8F2E9 100%)",
        }}
      >
        {/* Connector lines — left signals into the Founder Genome center.
         * Each signal appears, then its own curve draws immediately after
         * (120ms stagger, ~850ms total) — not one slow simultaneous wash. */}
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="pointer-events-none absolute inset-0 h-full w-full"
          aria-hidden="true"
        >
          {ROW_Y.map((y, i) => (
            <motion.path
              key={i}
              d={`M 25,${y} Q ${(25 + ORBIT_CENTER.x) / 2},${y} ${ORBIT_CENTER.x - 8},${ORBIT_CENTER.y}`}
              fill="none"
              stroke="rgba(197,163,106,0.46)"
              strokeWidth={0.3}
              strokeDasharray="1.4 1.2"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={entered ? { pathLength: 1, opacity: 1 } : {}}
              transition={{
                duration: reduceMotion ? 0 : 0.35,
                delay: reduceMotion ? 0 : i * 0.12,
                ease: "easeInOut",
              }}
            />
          ))}
        </svg>

        <div className="relative flex flex-col gap-10 px-6 py-10 sm:px-10 sm:py-12 lg:h-[620px] lg:flex-row lg:items-center lg:gap-0 lg:py-0">
          {/* LEFT — Founder Signals (27%) */}
          <div className="lg:w-[27%] lg:pr-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-sol-muted">
              Founder Signals
            </p>
            <div className="mt-4 flex flex-col">
              {SIGNALS.map((row, i) => (
                <motion.div
                  key={row.label}
                  initial={{ opacity: 0, x: -10 }}
                  animate={entered ? { opacity: 1, x: 0 } : {}}
                  transition={{
                    duration: reduceMotion ? 0 : 0.45,
                    delay: reduceMotion ? 0 : i * 0.12,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className="flex min-h-[58px] flex-col justify-center border-b border-sol-border/70 last:border-b-0"
                >
                  <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-sol-muted">
                    {row.label}
                  </p>
                  <p className="mt-0.5 text-[17px] font-medium text-sol-ink">{row.value}</p>
                </motion.div>
              ))}
            </div>
          </div>

          {/* CENTER — Founder Genome (36%) */}
          <div className="flex items-center justify-center lg:w-[36%]">
            <motion.div
              initial={{ opacity: 0, scale: 0.88 }}
              animate={entered ? { opacity: 1, scale: 1 } : {}}
              transition={{
                duration: reduceMotion ? 0 : 0.7,
                delay: reduceMotion ? 0 : 1,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="relative flex items-center justify-center"
              style={{ width: 294, height: 294 }}
            >
              <svg width={294} height={294} viewBox="0 0 294 294" className="absolute inset-0">
                {[1, 0.68].map((ratio, ringIndex) => (
                  <circle
                    key={ringIndex}
                    cx={147}
                    cy={147}
                    r={113 * ratio}
                    fill="none"
                    stroke="rgba(114,87,216,.3)"
                    strokeWidth={1}
                  />
                ))}
                {GENOME_NODES.map((_, i) => {
                  const outer = orbitPoint(i, GENOME_NODES.length, 100);
                  return (
                    <line
                      key={i}
                      x1={147}
                      y1={147}
                      x2={(outer.x / 100) * 294}
                      y2={(outer.y / 100) * 294}
                      stroke="rgba(114,87,216,.3)"
                      strokeWidth={1}
                    />
                  );
                })}
                {/* Two active arcs — violet primary, champagne secondary —
                 * counter-rotating slowly so the genome reads as a live
                 * intelligence instrument, not a static badge. */}
                <motion.circle
                  cx={147}
                  cy={147}
                  r={113}
                  fill="none"
                  stroke="var(--sol-violet)"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeDasharray="20 92"
                  animate={reduceMotion ? undefined : { rotate: 360 }}
                  style={{ transformOrigin: "147px 147px" }}
                  transition={{ duration: 46, repeat: Infinity, ease: "linear" }}
                />
                <motion.circle
                  cx={147}
                  cy={147}
                  r={90}
                  fill="none"
                  stroke="var(--sol-champagne)"
                  strokeWidth={1.75}
                  strokeLinecap="round"
                  strokeDasharray="16 60"
                  animate={reduceMotion ? undefined : { rotate: -360 }}
                  style={{ transformOrigin: "147px 147px" }}
                  transition={{ duration: 58, repeat: Infinity, ease: "linear" }}
                />
                {GENOME_NODES.map((label, i) => {
                  const p = orbitPoint(i, GENOME_NODES.length, 100);
                  return (
                    <g key={label}>
                      <circle
                        cx={(p.x / 100) * 294}
                        cy={(p.y / 100) * 294}
                        r={6}
                        fill={i % 2 === 0 ? "var(--sol-violet)" : "var(--sol-champagne)"}
                      />
                    </g>
                  );
                })}
              </svg>
              {GENOME_NODES.map((label, i) => {
                const p = orbitPoint(i, GENOME_NODES.length, 130);
                return (
                  <span
                    key={label}
                    className="absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap text-[11px] font-semibold uppercase tracking-[0.05em] text-[#5E5B67]"
                    style={{ left: `${p.x}%`, top: `${p.y}%` }}
                  >
                    {label}
                  </span>
                );
              })}
              <div className="relative flex flex-col items-center gap-2 text-center">
                <img src={mark} alt="" width={298} height={436} className="h-[26px] w-auto" />
                <p className="font-display text-[18px] font-semibold leading-tight text-sol-ink">
                  Technical Builder
                </p>
                <p className="text-[11px] font-semibold uppercase tracking-[0.11em] text-sol-muted">
                  Founder Genome
                </p>
              </div>
            </motion.div>
          </div>

          {/* RIGHT — 3 Directions (37%) */}
          <div className="lg:w-[37%] lg:pl-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-sol-muted">
              3 Directions
            </p>
            <motion.div
              initial={{ opacity: 0, x: 12 }}
              animate={entered ? { opacity: 1, x: 0 } : {}}
              transition={{
                duration: reduceMotion ? 0 : 0.5,
                delay: reduceMotion ? 0 : 1.15,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="relative mt-4 overflow-hidden rounded-[22px] p-6 text-white"
              style={{
                height: 140,
                background:
                  "radial-gradient(circle at 90% 10%, rgba(114,87,216,.22), transparent 48%), linear-gradient(135deg, #17203D, #232D50)",
              }}
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-sol-champagne">
                01 · Strongest Match
              </p>
              <div className="mt-2 flex items-center justify-between gap-3">
                <p className="max-w-[65%] font-display text-[20px] font-semibold leading-[1.15]">
                  {DIRECTIONS[0]?.title}
                </p>
                <div className="relative flex size-16 shrink-0 items-center justify-center">
                  <svg width={64} height={64} viewBox="0 0 64 64" className="-rotate-90">
                    <circle
                      cx={32}
                      cy={32}
                      r={25}
                      fill="none"
                      stroke="rgba(255,255,255,.16)"
                      strokeWidth={6}
                    />
                    <circle
                      cx={32}
                      cy={32}
                      r={25}
                      fill="none"
                      stroke="var(--sol-champagne)"
                      strokeWidth={6}
                      strokeLinecap="round"
                      strokeDasharray={2 * Math.PI * 25}
                      strokeDashoffset={2 * Math.PI * 25 * (1 - 0.92)}
                    />
                  </svg>
                  <span className="absolute text-[20px] font-bold">92</span>
                </div>
              </div>
              <p className="absolute bottom-6 left-6 text-[12px] text-white/60">
                $20K Capital · 15 hrs/wk · Moderate Difficulty
              </p>
            </motion.div>

            <div className="mt-3 flex flex-col gap-3">
              {DIRECTIONS.slice(1).map((d, i) => (
                <motion.div
                  key={d.title}
                  initial={{ opacity: 0, x: 12 }}
                  animate={entered ? { opacity: 1, x: 0 } : {}}
                  transition={{
                    duration: reduceMotion ? 0 : 0.5,
                    delay: reduceMotion ? 0 : 1.25 + i * 0.1,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className="flex h-[92px] items-center justify-between rounded-[18px] border border-sol-border bg-sol-surface px-5"
                >
                  <span className="text-[17px] font-medium text-sol-ink">{d.title}</span>
                  <span className="text-[15px] font-semibold text-sol-champagne-deep">
                    {d.fit}/100
                  </span>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer flow — Select -> Prove -> Week 01 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={entered ? { opacity: 1 } : {}}
          transition={{ duration: reduceMotion ? 0 : 0.6, delay: reduceMotion ? 0 : 1.6 }}
          className="relative border-t border-sol-border px-6 py-5 sm:px-10"
        >
          <div className="mx-auto flex max-w-[420px] items-center justify-between">
            {FLOW.map((step, i) => (
              <div key={step} className="flex items-center gap-3">
                <div className="flex flex-col items-center gap-1.5">
                  <span
                    className="size-3 rounded-full"
                    style={{
                      background: i % 2 === 0 ? "var(--sol-champagne)" : "var(--sol-violet)",
                    }}
                  />
                  <span className="text-[13px] font-medium text-sol-secondary">{step}</span>
                </div>
                {i < FLOW.length - 1 && <span className="h-px w-10 bg-sol-border sm:w-16" />}
              </div>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}
