import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { motion, useReducedMotion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { scrollToSection } from "@/hooks/use-active-section";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import type { MessageKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import heroImage from "@/assets/hero-founder-workspace.png";
import { HeroIntelligenceNetwork } from "./HeroIntelligenceNetwork";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0 },
};

/** The three headline lines, revealed one after another from behind a mask.
 * "Your Dream." stays warm white, "Our Intelligence." takes a restrained violet
 * (a lightened tint of the brand violet so it reads on the dark photograph) and
 * "Real Impact." takes champagne. */
const HEADLINE_LINES: {
  key: MessageKey;
  className?: string;
  style?: React.CSSProperties;
}[] = [
  { key: "hero.headline1", className: "text-white" },
  { key: "hero.headline2", style: { color: "oklch(0.74 0.12 287.3)" } },
  { key: "hero.headline3", className: "text-sol-champagne" },
];

/** Three product-demo signal cards over the photograph — illustrative, not a
 * claim about the visitor (see spec item 148). Real product concepts
 * (Founder Fit / Proof Signal / this week), each a plain word, never a
 * fabricated number. Max 3 visible at once; the middle one hides on mobile
 * so only 2 compete with the headline there.
 *
 * All three are positioned in the clear sky/skyline band (top ~10-34%) —
 * the photo's own laptop occupies roughly the bottom 60% of the right
 * half, and an earlier pass placed cards there, producing a confusing
 * overlap with the laptop's own baked-in fake screen UI. Never place a
 * card below ~top-35% on the right side of this specific image. */
const SIGNAL_CARDS: {
  labelKey: MessageKey;
  valueKey: MessageKey;
  className: string;
  width: number;
  duration: number;
  delay: number;
  dot: "champagne" | "violet" | "gradient";
  hideOnMobile?: boolean;
}[] = [
  {
    labelKey: "hero.card.fit",
    valueKey: "hero.card.fitValue",
    className: "right-[3%] top-[11%]",
    width: 200,
    duration: 10,
    delay: 0,
    dot: "champagne",
  },
  {
    labelKey: "hero.card.proof",
    valueKey: "hero.card.proofValue",
    className: "right-[30%] top-[11%]",
    width: 208,
    duration: 12,
    delay: 1.4,
    dot: "violet",
    hideOnMobile: true,
  },
  {
    labelKey: "hero.card.week",
    valueKey: "hero.card.weekValue",
    className: "right-[3%] top-[26%]",
    width: 180,
    duration: 8.5,
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

/** Glass per the spec's exact recipe: translucent white (not warm cream —
 * the card now floats over the photograph itself, not a flat pearl
 * background), 14–20px blur, thin border, 14–18px radius. */
function SignalCard({
  card,
  parallax,
}: {
  card: (typeof SIGNAL_CARDS)[number];
  parallax: { x: number; y: number };
}) {
  const reduceMotion = useReducedMotion();
  const { t } = useLocale();
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.9, delay: 0.9 + card.delay * 0.15, ease: [0.22, 1, 0.36, 1] }}
      className={`group absolute ${card.className} ${card.hideOnMobile ? "hidden sm:block" : ""}`}
      style={{
        width: card.width,
        transform: `translate3d(${parallax.x * 2}px, ${parallax.y * 2}px, 0)`,
      }}
    >
      <motion.div
        animate={
          reduceMotion ? undefined : { y: [-4, 4, -4], x: [-2, 2, -2], rotate: [-0.5, 0.5, -0.5] }
        }
        whileHover={{ y: -2 }}
        transition={{
          y: { duration: card.duration, repeat: Infinity, ease: "easeInOut" },
          x: { duration: card.duration * 1.15, repeat: Infinity, ease: "easeInOut" },
          rotate: { duration: card.duration * 1.3, repeat: Infinity, ease: "easeInOut" },
        }}
        className="flex h-[66px] w-full items-center gap-2.5 rounded-[16px] border border-white/20 bg-white/[0.12] px-4 shadow-[0_12px_34px_rgba(8,10,20,0.28)] backdrop-blur-[16px] transition-colors duration-[180ms] group-hover:border-white/35"
      >
        <StatusDot tone={card.dot} />
        <div className="min-w-0">
          <p className="text-[13.5px] font-semibold leading-tight text-white/75">
            {t(card.labelKey)}
          </p>
          <p className="mt-1 text-[16.5px] font-bold leading-none text-white">{t(card.valueKey)}</p>
        </div>
      </motion.div>
    </motion.div>
  );
}

/** Desktop-only pointer parallax — background shifts ~3-4px, cards ~6-10px
 * (handled by the ×2 multiplier in SignalCard), network ~2-4px. Off on
 * touch devices and under reduced-motion. */
function useHeroParallax() {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const reduceMotion = useReducedMotion();
  const ref = useRef({
    enabled: typeof window !== "undefined" && window.matchMedia("(pointer: fine)").matches,
  });

  useEffect(() => {
    if (reduceMotion || !ref.current.enabled) return;
    function onMove(e: MouseEvent) {
      const x = (e.clientX / window.innerWidth - 0.5) * 2;
      const y = (e.clientY / window.innerHeight - 0.5) * 2;
      setPos({ x, y });
    }
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, [reduceMotion]);

  return pos;
}

export function Hero() {
  const navigate = useNavigate();
  const { t, locale } = useLocale();
  const isHindi = locale === "hi";
  const pointer = useHeroParallax();
  const reduceMotion = useReducedMotion();

  return (
    <section
      className="relative h-[100svh] min-h-[640px] w-full overflow-hidden bg-[#0A0D17]"
      style={{ maxHeight: 960 }}
    >
      {/* The approved photograph — the entire first visual environment, not
          a right-side image beside a text card. */}
      <motion.img
        src={heroImage}
        alt=""
        aria-hidden="true"
        initial={{ scale: 1.025, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        className="absolute inset-0 h-full w-full object-cover"
        style={{
          transform: reduceMotion
            ? undefined
            : `translate3d(${pointer.x * -3.5}px, ${pointer.y * -3.5}px, 0) scale(1.03)`,
        }}
      />

      {/* Cinematic left-to-right readability gradient — not a full-photo
          darken, and not an opaque text card. */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(100deg, rgba(10,13,23,.88) 0%, rgba(10,13,23,.62) 32%, rgba(10,13,23,.22) 58%, transparent 78%)",
        }}
        aria-hidden="true"
      />
      {/* Lower-depth gradient so the floating cards and bottom content stay
          readable against sky/city highlights. */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: "linear-gradient(to top, rgba(8,10,20,.55) 0%, transparent 38%)",
        }}
        aria-hidden="true"
      />
      {/* Extremely restrained violet ambience right at the gradient's own
          transition region — never consciously obvious. */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 560px 460px at 42% 38%, rgba(114,87,216,0.12), transparent 70%)",
        }}
        aria-hidden="true"
      />

      <HeroIntelligenceNetwork />

      <div className="pointer-events-none absolute inset-0 z-10 hidden sm:block">
        {SIGNAL_CARDS.map((card) => (
          <SignalCard key={card.labelKey} card={card} parallax={pointer} />
        ))}
      </div>

      <div className="relative z-20 mx-auto flex h-full max-w-[1920px] flex-col justify-center px-6 pb-10 pt-[76px] lg:px-10">
        <motion.div initial="hidden" animate="show" className="max-w-[640px]">
          <motion.p
            variants={fadeUp}
            transition={{ duration: 0.45, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="text-[13.5px] font-bold uppercase tracking-[0.14em] text-sol-champagne"
          >
            {t("hero.eyebrow")}
          </motion.p>

          <h1
            className={cn(
              "mt-[26px] max-w-[600px] text-[46px] font-semibold tracking-[-0.025em] text-white sm:text-[58px] lg:text-[74px]",
              isHindi ? "leading-[1.28] lg:leading-[1.2]" : "leading-[1.02] lg:leading-[0.98]",
            )}
          >
            {HEADLINE_LINES.map((line, i) => (
              <span key={line.key} className="-my-[0.12em] block overflow-hidden py-[0.12em]">
                <motion.span
                  className={cn("block", line.className)}
                  style={line.style}
                  initial={{ y: reduceMotion ? 0 : "115%", opacity: reduceMotion ? 1 : 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.6, delay: 0.18 + i * 0.1, ease: [0.22, 1, 0.36, 1] }}
                >
                  {t(line.key)}
                </motion.span>
              </span>
            ))}
          </h1>

          <motion.p
            variants={fadeUp}
            transition={{ duration: 0.5, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="mt-[24px] max-w-[440px] text-[18px] leading-[28px] text-white/85"
          >
            {t("hero.subhead")}
          </motion.p>

          <motion.div
            variants={fadeUp}
            transition={{ duration: 0.5, delay: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="mt-[30px] flex flex-wrap items-center gap-4"
          >
            {/* The one action that matters: an ivory-champagne surface with depth,
                a light sweep on hover and an arrow that nudges every few seconds. */}
            <button
              type="button"
              onClick={() => navigate({ to: "/consultation" })}
              className="group relative inline-flex h-[60px] items-center gap-3 overflow-hidden rounded-2xl px-[34px] text-[16.5px] font-bold text-sol-navy shadow-[0_16px_40px_rgba(0,0,0,.38),inset_0_1px_0_rgba(255,255,255,.9)] ring-1 ring-white/50 transition-[transform,box-shadow] duration-150 ease-[cubic-bezier(.22,1,.36,1)] hover:-translate-y-0.5 hover:shadow-[0_20px_52px_rgba(220,192,139,.42),inset_0_1px_0_rgba(255,255,255,.9)] active:translate-y-0 active:scale-[0.985] active:duration-100"
              style={{
                background: "linear-gradient(135deg, #FFFDFB 0%, #F2ECE2 55%, #DCC08B 100%)",
              }}
            >
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-0 -left-2/3 w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-white/70 to-transparent transition-[left] duration-700 ease-[cubic-bezier(.22,1,.36,1)] group-hover:left-[130%]"
              />
              <span className="relative">{t("hero.cta.primary")}</span>
              <span className="sol-nudge relative flex" aria-hidden="true">
                <ArrowRight className="size-[19px] text-sol-violet-deep transition-transform duration-150 group-hover:translate-x-[5px]" />
              </span>
            </button>

            <button
              type="button"
              onClick={() => scrollToSection("how-it-works")}
              className="inline-flex h-[60px] items-center gap-2 rounded-2xl border border-white/20 bg-transparent px-[24px] text-[14.5px] font-semibold text-white/80 transition-colors duration-150 hover:border-white/45 hover:text-white"
            >
              {t("hero.cta.secondary")}
            </button>
          </motion.div>

          <motion.div
            variants={fadeUp}
            transition={{ duration: 0.5, delay: 0.75, ease: [0.22, 1, 0.36, 1] }}
            className="mt-6 flex flex-wrap gap-3 sm:hidden"
          >
            {SIGNAL_CARDS.filter((c) => !c.hideOnMobile).map((card) => (
              <div
                key={card.labelKey}
                className="flex h-[62px] min-w-[10rem] items-center gap-2 rounded-[16px] border border-white/20 bg-white/[0.12] px-3.5 shadow-[0_12px_34px_rgba(8,10,20,0.28)] backdrop-blur-[16px]"
              >
                <StatusDot tone={card.dot} />
                <div className="min-w-0">
                  <p className="text-[13.5px] font-semibold leading-tight text-white/75">
                    {t(card.labelKey)}
                  </p>
                  <p className="mt-1 text-[15.5px] font-bold leading-none text-white">
                    {t(card.valueKey)}
                  </p>
                </div>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </div>

      {/* Exit: fade subtly toward the page background rather than an
          abrupt photograph-to-flat-pearl cut. */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-28"
        style={{ background: "linear-gradient(to bottom, transparent, var(--sol-hp-pearl))" }}
        aria-hidden="true"
      />
    </section>
  );
}
