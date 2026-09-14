import { useNavigate } from "@tanstack/react-router";
import { motion, useReducedMotion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { scrollToSection } from "@/hooks/use-active-section";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0 },
};

/** Fixed, hand-placed positions — never Math.random(), which would
 * desync between server and client render and break hydration. */
const PARTICLES = [
  { top: "10%", left: "56%", size: 3, delay: 0 },
  { top: "20%", left: "74%", size: 2, delay: 1.2 },
  { top: "33%", left: "48%", size: 2.5, delay: 2.4 },
  { top: "46%", left: "82%", size: 3, delay: 0.6 },
  { top: "58%", left: "60%", size: 2, delay: 1.8 },
  { top: "68%", left: "44%", size: 2.5, delay: 3 },
];

/** The three minimal Solventia intelligence indicators — real product
 * concepts (fit score, evidence, execution), never the generic "Market
 * Opportunity / AI Validation / Roadmap Generated" placeholders this
 * replaces. Card C is hidden on mobile per spec (only two shown there). */
const SIGNAL_CARDS: {
  label: string;
  value: string;
  className: string;
  width: number;
  duration: number;
  delay: number;
  dot: "champagne" | "violet" | "gradient";
  hideOnMobile?: boolean;
}[] = [
  {
    label: "Founder Fit",
    value: "92",
    className: "right-[2.5%] top-[28%]",
    width: 156,
    duration: 9,
    delay: 0,
    dot: "champagne",
  },
  {
    label: "Proof Signal",
    value: "Strong",
    className: "right-[12%] top-[52%]",
    width: 160,
    duration: 11,
    delay: 1.4,
    dot: "violet",
    hideOnMobile: true,
  },
  {
    label: "Week 01",
    value: "Ready",
    className: "right-[3.5%] top-[73%]",
    width: 150,
    duration: 8,
    delay: 0.8,
    dot: "gradient",
  },
];

function StatusDot({ tone }: { tone: "champagne" | "violet" | "gradient" }) {
  return (
    <span
      className="size-2 shrink-0 rounded-full"
      style={{
        background:
          tone === "champagne"
            ? "var(--sol-champagne)"
            : tone === "violet"
              ? "var(--sol-violet)"
              : "linear-gradient(135deg, var(--sol-champagne), var(--sol-violet))",
      }}
      aria-hidden="true"
    />
  );
}

function SignalCard({ card }: { card: (typeof SIGNAL_CARDS)[number] }) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.9, delay: 0.6 + card.delay * 0.15, ease: [0.22, 1, 0.36, 1] }}
      className={`group absolute ${card.className} ${card.hideOnMobile ? "hidden sm:block" : ""}`}
      style={{ width: card.width }}
    >
      <motion.div
        animate={reduceMotion ? undefined : { y: [-3, 3, -3] }}
        whileHover={{ y: -2 }}
        transition={{
          y: { duration: card.duration, repeat: Infinity, ease: "easeInOut" },
        }}
        className="flex h-[62px] w-full items-center gap-2.5 rounded-[17px] border border-[rgba(214,203,190,0.78)] bg-[rgba(255,253,250,0.91)] px-4 shadow-[0_12px_34px_rgba(23,32,61,0.075)] backdrop-blur-[14px] transition-colors duration-[180ms] group-hover:border-[rgba(114,87,216,0.28)]"
      >
        <StatusDot tone={card.dot} />
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-sol-secondary">
            {card.label}
          </p>
          <p className="mt-0.5 text-[16px] font-bold leading-none text-sol-ink">{card.value}</p>
        </div>
      </motion.div>
    </motion.div>
  );
}

/** Atmospheric orbital structure behind the hero copy — never a graph,
 * never labeled, never surrounding the headline like a target. Two
 * incomplete (dashed) elliptical curves suggesting Solventia's
 * intelligence path, with one slow highlight segment traveling around
 * the outer curve. Everything else stays static. */
function HeroOrbitGraphic() {
  const reduceMotion = useReducedMotion();
  return (
    <svg
      className="pointer-events-none absolute -left-[130px] top-[90px] hidden lg:block"
      width={760}
      height={590}
      viewBox="0 0 760 590"
      fill="none"
      aria-hidden="true"
    >
      <ellipse
        cx={430}
        cy={300}
        rx={330}
        ry={230}
        stroke="rgba(114,87,216,.13)"
        strokeWidth={1}
        strokeDasharray="220 90"
        transform="rotate(-8 430 300)"
      />
      <ellipse
        cx={400}
        cy={260}
        rx={230}
        ry={160}
        stroke="rgba(197,163,106,.11)"
        strokeWidth={1}
        strokeDasharray="160 70"
        transform="rotate(6 400 260)"
      />
      {!reduceMotion && (
        <motion.ellipse
          cx={430}
          cy={300}
          rx={330}
          ry={230}
          stroke="rgba(114,87,216,.55)"
          strokeWidth={1.5}
          strokeDasharray="40 2560"
          strokeLinecap="round"
          transform="rotate(-8 430 300)"
          animate={{ strokeDashoffset: [0, -2600], opacity: [0, 0.55, 0] }}
          transition={{ duration: 16, repeat: Infinity, ease: "linear" }}
        />
      )}
    </svg>
  );
}

/** Fixed, hand-placed node positions (never Math.random — see PARTICLES
 * above for why) for the hero's intelligence-field visual: a founder's
 * scattered signals (skills, capital, time, goals) resolving into a
 * connected plan. Concentrated in the right ~40% of the viewport, where
 * the old photo was actually visible past the text-side scrim. */
const FIELD_NODES = [
  { x: 66, y: 14, r: 3, tone: "champagne" as const },
  { x: 74, y: 9, r: 2, tone: "violet" as const },
  { x: 82, y: 18, r: 2.5, tone: "champagne" as const },
  { x: 61, y: 27, r: 2, tone: "violet" as const },
  { x: 90, y: 12, r: 6, tone: "hub" as const },
  { x: 70, y: 34, r: 2.5, tone: "champagne" as const },
  { x: 86, y: 30, r: 3, tone: "violet" as const },
  { x: 78, y: 44, r: 7, tone: "hub" as const },
  { x: 94, y: 40, r: 2, tone: "champagne" as const },
  { x: 63, y: 48, r: 2.5, tone: "violet" as const },
  { x: 68, y: 60, r: 2, tone: "champagne" as const },
  { x: 84, y: 58, r: 3, tone: "violet" as const },
  { x: 91, y: 66, r: 5, tone: "hub" as const },
  { x: 74, y: 70, r: 2.5, tone: "champagne" as const },
  { x: 60, y: 76, r: 2, tone: "violet" as const },
  { x: 80, y: 82, r: 3, tone: "champagne" as const },
  { x: 92, y: 86, r: 2, tone: "violet" as const },
  { x: 68, y: 90, r: 2.5, tone: "champagne" as const },
];

// Hand-picked pairs among FIELD_NODES above — a connected topology, not
// every node linked to every other, so it reads as a real network rather
// than a scatter plot.
const FIELD_LINKS: [number, number][] = [
  [0, 1],
  [1, 2],
  [0, 3],
  [1, 4],
  [2, 4],
  [4, 6],
  [3, 5],
  [5, 7],
  [6, 7],
  [7, 8],
  [7, 9],
  [9, 10],
  [7, 11],
  [11, 12],
  [8, 12],
  [10, 13],
  [11, 13],
  [13, 14],
  [13, 15],
  [12, 16],
  [15, 16],
  [14, 17],
  [15, 17],
];

const FIELD_TONE_COLOR: Record<"champagne" | "violet" | "hub", string> = {
  champagne: "var(--sol-champagne)",
  violet: "var(--sol-violet)",
  hub: "var(--sol-violet)",
};

/** Replaces the old stock horizon photo — an abstract, on-brand
 * "signals resolving into a plan" network instead of a generic
 * landscape/skyline image unrelated to what Solventia actually does.
 * Built entirely from SVG/CSS (no external asset), in the same
 * violet/champagne language as the orbit graphic and signal cards, so
 * it reads as one system rather than a decorative photo behind them. */
function HeroIntelligenceField() {
  const reduceMotion = useReducedMotion();
  return (
    <div className="absolute inset-0" aria-hidden="true">
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 900px 700px at 82% 45%, rgba(114,87,216,.10), transparent 60%), radial-gradient(ellipse 700px 600px at 95% 15%, rgba(197,163,106,.09), transparent 62%), linear-gradient(100deg, #F8F5EF 0%, #F8F5EF 42%, #F5F0E6 62%, #F1EBE0 100%)",
        }}
      />
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        fill="none"
      >
        {FIELD_LINKS.map(([a, b], i) => {
          const from = FIELD_NODES[a];
          const to = FIELD_NODES[b];
          const touchesHub = from.tone === "hub" || to.tone === "hub";
          return (
            <line
              key={i}
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              stroke={touchesHub ? "rgba(114,87,216,.42)" : "rgba(114,87,216,.24)"}
              strokeWidth={touchesHub ? 0.22 : 0.16}
            />
          );
        })}
        {FIELD_NODES.map((n, i) => (
          <circle
            key={i}
            cx={n.x}
            cy={n.y}
            r={n.tone === "hub" ? n.r * 0.22 : n.r * 0.24}
            fill={FIELD_TONE_COLOR[n.tone]}
            opacity={n.tone === "hub" ? 0.7 : 0.55}
          />
        ))}
        {!reduceMotion &&
          FIELD_NODES.filter((n) => n.tone === "hub").map((n, i) => (
            <motion.circle
              key={`pulse-${i}`}
              cx={n.x}
              cy={n.y}
              fill="none"
              stroke="var(--sol-violet)"
              strokeWidth={0.1}
              initial={{ r: n.r * 0.16, opacity: 0.4 }}
              animate={{ r: [n.r * 0.16, n.r * 0.5], opacity: [0.4, 0] }}
              transition={{ duration: 3.6, repeat: Infinity, delay: i * 1.1, ease: "easeOut" }}
            />
          ))}
      </svg>
      {/* Calmer left side for text — the exact spec gradient, warm
          sol-page tones rather than a gray scrim. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(90deg, rgba(248,245,239,0.98) 0%, rgba(248,245,239,0.93) 30%, rgba(248,245,239,0.54) 55%, rgba(248,245,239,0.05) 78%)",
        }}
      />
    </div>
  );
}

/** Very subtle vertical connector suggesting the three intelligence
 * signals are one system, not three unrelated floating widgets — never
 * literally edge-to-edge. */
function HeroCardConnector() {
  return (
    <svg
      className="pointer-events-none absolute right-[9%] top-[30%] hidden h-[46%] w-[80px] xl:block"
      viewBox="0 0 80 320"
      fill="none"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="hero-card-connector" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--sol-champagne)" />
          <stop offset="100%" stopColor="var(--sol-violet)" />
        </linearGradient>
      </defs>
      <path
        d="M 20,0 C 60,60 0,140 40,180 C 70,210 20,270 30,320"
        stroke="url(#hero-card-connector)"
        strokeWidth={1}
        opacity={0.22}
      />
    </svg>
  );
}

/** The hero — an on-brand, code-rendered intelligence field (signals
 * resolving into a plan) instead of the old generic stock landscape
 * photo, recomposed per the homepage reconstruction spec: calmer left
 * side for text, three minimal intelligence signals instead of four
 * generic floating cards, no people-bubble social proof, no
 * Discover/Validate/Plan/Launch strip underneath (How It Works now owns
 * that story, once, not twice). Violet ambience + an orbital path
 * graphic fill what would otherwise be an empty upper-left/upper-middle
 * region, without adding another card or paragraph. */
export function Hero() {
  const navigate = useNavigate();

  return (
    <section
      className="relative mt-[68px] h-[calc(100vh-68px)] w-full overflow-hidden md:mt-[84px] md:h-[calc(100vh-84px)]"
      style={{ minHeight: 720, maxHeight: 860 }}
    >
      <div className="absolute inset-0" aria-hidden="true">
        <HeroIntelligenceField />

        {PARTICLES.map((p, i) => (
          <span
            key={i}
            className="particle-drift absolute rounded-full bg-sol-champagne"
            style={{
              top: p.top,
              left: p.left,
              width: p.size,
              height: p.size,
              animationDelay: `${p.delay}s`,
            }}
          />
        ))}
      </div>

      {/* Restored Solventia violet ambience — light, not paint. Sits above
          the image/scrim and below the copy/cards. */}
      <div
        className="pointer-events-none absolute inset-0 z-[5]"
        style={{
          background:
            "radial-gradient(ellipse 520px 420px at 15% 22%, rgba(114,87,216,0.13), rgba(114,87,216,0.055) 42%, transparent 72%), radial-gradient(ellipse 420px 320px at 62% 10%, rgba(197,163,106,0.07), transparent 72%)",
        }}
        aria-hidden="true"
      />

      <HeroOrbitGraphic />
      <HeroCardConnector />

      {/* Floating intelligence signals — desktop only. On mobile the text
          column fills nearly the full width, so absolute-positioned cards
          would sit on top of the headline/buttons; those render in normal
          document flow below the CTAs instead (see mobile block below). */}
      <div className="pointer-events-none absolute inset-0 z-10 hidden sm:block">
        {SIGNAL_CARDS.map((card) => (
          <SignalCard key={card.label} card={card} />
        ))}
      </div>

      <div
        className="relative z-20 mx-auto flex h-full max-w-[1920px] flex-col overflow-y-auto px-6 pb-8 lg:overflow-visible lg:px-10"
        style={{ paddingTop: "clamp(150px, 19vh, 190px)" }}
      >
        <motion.div
          initial="hidden"
          animate="show"
          transition={{ staggerChildren: 0.12, delayChildren: 0.05 }}
          className="max-w-[760px]"
        >
          <motion.p
            variants={fadeUp}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="text-[12px] font-semibold uppercase tracking-[0.15em] text-sol-champagne-deep"
          >
            AI-Powered Founder Operating System
          </motion.p>

          <motion.h1
            variants={fadeUp}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="mt-[28px] max-w-[670px] text-[46px] font-semibold leading-[1.04] tracking-[-0.025em] text-sol-ink sm:text-[56px] lg:text-[72px] lg:leading-[0.98]"
          >
            Your Direction.
            <br />
            Our Intelligence.
            <br />
            <span className="text-shimmer-gold text-[1.02em] font-bold italic">
              Real Execution.
            </span>
          </motion.h1>

          <motion.p
            variants={fadeUp}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="mt-[28px] max-w-[520px] text-[17px] leading-[28px] text-sol-secondary"
          >
            Solventia turns your skills, resources and ambition into business directions you can
            actually test, build and grow.
          </motion.p>

          <motion.div
            variants={fadeUp}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="mt-[30px] flex flex-wrap items-center gap-3.5"
          >
            <button
              type="button"
              onClick={() => navigate({ to: "/consultation" })}
              className="group inline-flex h-[54px] items-center gap-2.5 rounded-2xl bg-sol-navy px-[26px] text-[15px] font-semibold text-white transition-all duration-[180ms] hover:-translate-y-px hover:shadow-[0_10px_30px_rgba(23,32,61,.13)]"
            >
              Find My Business Idea
              <ArrowRight
                className="size-4 text-sol-champagne transition-transform duration-300 group-hover:translate-x-1"
                aria-hidden="true"
              />
            </button>

            <button
              type="button"
              onClick={() => scrollToSection("how-it-works")}
              className="inline-flex h-[54px] items-center gap-2 rounded-2xl border border-sol-border bg-[rgba(255,253,249,0.6)] px-[26px] text-[15px] font-semibold text-sol-ink transition-colors hover:border-sol-champagne/50"
            >
              See How It Works
            </button>
          </motion.div>

          <motion.div
            variants={fadeUp}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="mt-6 flex flex-wrap gap-3 sm:hidden"
          >
            {SIGNAL_CARDS.filter((c) => !c.hideOnMobile).map((card) => (
              <div
                key={card.label}
                className="flex h-[58px] w-[136px] items-center gap-2 rounded-[17px] border border-[rgba(214,203,190,0.78)] bg-[rgba(255,253,250,0.94)] px-3.5 shadow-[0_12px_34px_rgba(23,32,61,0.075)]"
              >
                <StatusDot tone={card.dot} />
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-sol-secondary">
                    {card.label}
                  </p>
                  <p className="mt-0.5 text-[15px] font-bold leading-none text-sol-ink">
                    {card.value}
                  </p>
                </div>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
