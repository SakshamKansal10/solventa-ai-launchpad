import { useNavigate } from "@tanstack/react-router";
import { motion, useReducedMotion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { scrollToSection } from "@/hooks/use-active-section";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import heroPhoto from "@/assets/image.png";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0 },
};

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

/** The hero background — a photographic backdrop with an ivory fade over
 * the left side so the headline/copy column stays legible, plus the
 * violet/champagne ambience layered on top. */
function HeroBackground() {
  return (
    <div className="absolute inset-0" aria-hidden="true">
      <img
        src={heroPhoto}
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(100deg, #F8F5EF 0%, rgba(248,245,239,0.94) 32%, rgba(247,243,236,0.55) 52%, rgba(244,238,226,0.12) 72%, transparent 88%)",
        }}
      />
    </div>
  );
}

/** The hero — photographic background (see HeroBackground above),
 * recomposed per the homepage reconstruction spec: calmer left side for
 * text, three minimal intelligence signals instead of four generic
 * floating cards, no people-bubble social proof, no Discover/Validate/
 * Plan/Launch strip underneath (How It Works now owns that story, once,
 * not twice). */
export function Hero() {
  const navigate = useNavigate();
  const { t, locale } = useLocale();
  // Devanagari's taller vertical metrics (shirorekha + matras) clip
  // against the tight Latin-display leading below — give Hindi more
  // breathing room instead of reusing the same value for both scripts.
  const isHindi = locale === "hi";

  return (
    <section
      className="relative mt-[68px] h-[calc(100vh-68px)] w-full overflow-hidden md:mt-[84px] md:h-[calc(100vh-84px)]"
      style={{ minHeight: 640, maxHeight: 860 }}
    >
      <HeroBackground />

      {/* Restored Solventia violet ambience — light, not paint. Sits above
          the background and below the copy/cards. */}
      <div
        className="pointer-events-none absolute inset-0 z-[5]"
        style={{
          background:
            "radial-gradient(ellipse 520px 420px at 15% 22%, rgba(114,87,216,0.13), rgba(114,87,216,0.055) 42%, transparent 72%), radial-gradient(ellipse 420px 320px at 62% 10%, rgba(197,163,106,0.07), transparent 72%)",
        }}
        aria-hidden="true"
      />

      {/* Floating intelligence signals — desktop only. On mobile the text
          column fills nearly the full width, so absolute-positioned cards
          would sit on top of the headline/buttons; those render in normal
          document flow below the CTAs instead (see mobile block below). */}
      <div className="pointer-events-none absolute inset-0 z-10 hidden sm:block">
        {SIGNAL_CARDS.map((card) => (
          <SignalCard key={card.label} card={card} />
        ))}
      </div>

      {/* Vertically centered, not pinned by a large fixed top offset —
          the previous ~170-190px top padding left excess dead space above
          the headline on common desktop viewports. */}
      <div className="relative z-20 mx-auto flex h-full max-w-[1920px] flex-col justify-center overflow-y-auto px-6 py-8 lg:overflow-visible lg:px-10">
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
            {t("hero.eyebrow")}
          </motion.p>

          <motion.h1
            variants={fadeUp}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              "mt-[28px] max-w-[670px] text-[46px] font-semibold tracking-[-0.025em] text-sol-ink sm:text-[56px] lg:text-[72px]",
              isHindi ? "leading-[1.3] lg:leading-[1.22]" : "leading-[1.04] lg:leading-[0.98]",
            )}
          >
            {t("hero.headline1")}
            <br />
            {t("hero.headline2")}
            <br />
            <span className="text-shimmer-gold text-[1.02em] font-bold italic">
              {t("hero.headline3")}
            </span>
          </motion.h1>

          <motion.p
            variants={fadeUp}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="mt-[28px] max-w-[520px] text-[17px] leading-[28px] text-sol-secondary"
          >
            {t("hero.subhead")}
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
              {t("hero.cta.primary")}
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
              {t("hero.cta.secondary")}
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
