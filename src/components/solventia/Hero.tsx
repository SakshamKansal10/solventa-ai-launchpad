import { useNavigate } from "@tanstack/react-router";
import { motion, useReducedMotion } from "motion/react";
import { ArrowRight } from "lucide-react";
import heroHorizon from "@/assets/hero-horizon.png";
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

/** The hero — Solventia's strongest existing visual asset (the horizon
 * photo) preserved exactly, recomposed per the homepage reconstruction
 * spec: calmer left side for text, three minimal intelligence signals
 * instead of four generic floating cards, no people-bubble social proof,
 * no Discover/Validate/Plan/Launch strip underneath (How It Works now
 * owns that story, once, not twice). Violet ambience + an orbital path
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
        <img
          src={heroHorizon}
          alt=""
          fetchPriority="high"
          className="hero-photo-drift absolute inset-0 h-full w-full object-cover object-[68%_58%] sm:object-[64%_44%] lg:object-[76%_46%]"
        />
        {/* Calmer left side for text — the exact spec gradient, warm
            sol-page tones rather than a gray scrim. */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(90deg, rgba(248,245,239,0.98) 0%, rgba(248,245,239,0.93) 30%, rgba(248,245,239,0.54) 55%, rgba(248,245,239,0.05) 78%)",
          }}
        />

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
