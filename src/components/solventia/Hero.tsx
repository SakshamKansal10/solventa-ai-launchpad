import type { ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { motion } from "motion/react";
import {
  ArrowRight,
  BadgeCheck,
  ChevronRight,
  Compass,
  Heart,
  Lightbulb,
  Map,
  Play,
  Rocket,
  ShieldCheck,
  Sparkle,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import heroPortal from "@/assets/hero-portal.png";
import avatars from "@/assets/avatars.jpg";
import { scrollToSection } from "@/hooks/use-active-section";
import { PremiumButton } from "./PremiumButton";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0 },
};

function Avatar({ index, alt }: { index: number; alt: string }) {
  return (
    <span className="relative -ml-4 size-14 overflow-hidden rounded-full border-[3px] border-background bg-secondary first:ml-0">
      <img
        src={avatars}
        alt={alt}
        width={1536}
        height={512}
        loading="lazy"
        className="absolute left-0 top-0 h-full max-w-none"
        style={{ width: "300%", transform: `translateX(-${index * 33.333}%)` }}
      />
    </span>
  );
}

/** Fixed, hand-placed positions — never Math.random(), which would
 * desync between server and client render and break hydration. */
const PARTICLES = [
  { top: "10%", left: "56%", size: 3, delay: 0 },
  { top: "20%", left: "74%", size: 2, delay: 1.2 },
  { top: "33%", left: "48%", size: 2.5, delay: 2.4 },
  { top: "46%", left: "82%", size: 3, delay: 0.6 },
  { top: "58%", left: "60%", size: 2, delay: 1.8 },
  { top: "68%", left: "44%", size: 2.5, delay: 3 },
  { top: "16%", left: "90%", size: 2, delay: 2.1 },
  { top: "52%", left: "93%", size: 3, delay: 0.9 },
];

function GlassCard({
  className,
  duration = 7,
  delay = 0,
  children,
}: {
  className: string;
  duration?: number;
  delay?: number;
  children: ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.9, delay: 0.6 + delay * 0.15, ease: [0.22, 1, 0.36, 1] }}
      className={`absolute ${className}`}
    >
      <div
        className="float-card rounded-2xl border border-white/60 bg-white/90 px-5 py-4 shadow-[0_20px_50px_-20px_rgba(20,20,50,0.45)] backdrop-blur-xl"
        style={{ animationDuration: `${duration}s`, animationDelay: `${delay}s` }}
      >
        {children}
      </div>
    </motion.div>
  );
}

export function Hero() {
  const navigate = useNavigate();

  return (
    <section className="relative min-h-screen w-full overflow-hidden">
      {/* Full-bleed cinematic background photo */}
      <div className="absolute inset-0" aria-hidden="true">
        <img
          src={heroPortal}
          alt=""
          fetchPriority="high"
          className="hero-photo-drift absolute inset-0 h-full w-full object-cover object-[52%_center] sm:object-[70%_center]"
        />
        {/* Legibility scrim: solid near the text column, fading away over the archway/sunrise.
            Kept lean — the photo's own left side is already pale, so a lighter touch here
            reads as clarity instead of haze. */}
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/48 to-transparent md:from-background md:via-background/36 md:to-transparent/0" />
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-background/10 md:from-background/40" />
        {/* Full-width top scrim so nav text stays legible no matter what's behind it */}
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-background/55 to-transparent" />

        {/* Soft light rays fanning from the archway */}
        <div
          className="ray-pulse absolute left-[64%] top-[10%] h-[70%] w-24 -rotate-6 bg-gradient-to-b from-[oklch(0.97_0.03_95/0.35)] to-transparent blur-2xl"
          style={{ animationDelay: "0s" }}
        />
        <div
          className="ray-pulse absolute left-[74%] top-[6%] h-[65%] w-16 rotate-3 bg-gradient-to-b from-[oklch(0.97_0.03_95/0.3)] to-transparent blur-2xl"
          style={{ animationDelay: "2s" }}
        />

        {/* Ambient particles */}
        {PARTICLES.map((p, i) => (
          <span
            key={i}
            className="particle-drift absolute rounded-full bg-accent"
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

      <div className="ambient-purple z-10" aria-hidden="true" />

      {/* Floating AI cards — desktop only, over the photo's quieter right side */}
      <div className="pointer-events-none absolute inset-0 z-10 hidden xl:block">
        <GlassCard className="right-[7%] top-[20%]" duration={7} delay={0}>
          <div className="flex items-center gap-3">
            <svg viewBox="0 0 36 36" className="size-11 shrink-0 -rotate-90 text-accent">
              <circle
                cx="18"
                cy="18"
                r="15.5"
                fill="none"
                stroke="currentColor"
                strokeOpacity="0.2"
                strokeWidth="3"
              />
              <circle
                cx="18"
                cy="18"
                r="15.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray="97.4"
                strokeDashoffset={97.4 * (1 - 0.92)}
              />
            </svg>
            <div>
              <p className="text-lg font-bold leading-none text-primary">92%</p>
              <p className="mt-1 text-[0.68rem] font-medium leading-tight text-muted-foreground">
                Business Fit Score
              </p>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="right-[1%] top-[42%]" duration={8} delay={1.4}>
          <div className="flex items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent/20 text-accent">
              <TrendingUp className="size-4" aria-hidden="true" />
            </span>
            <div>
              <p className="text-[0.68rem] font-medium leading-tight text-muted-foreground">
                Market Opportunity
              </p>
              <p className="mt-0.5 text-sm font-bold leading-none text-primary">High Potential</p>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="right-[10%] top-[63%]" duration={6.5} delay={0.7}>
          <div className="flex items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent/20 text-accent">
              <BadgeCheck className="size-4" aria-hidden="true" />
            </span>
            <div>
              <p className="text-[0.68rem] font-medium leading-tight text-muted-foreground">
                AI Validation
              </p>
              <p className="mt-0.5 text-sm font-bold leading-none text-primary">Completed</p>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="right-[3%] top-[74%]" duration={7.5} delay={2.1}>
          <div className="flex items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent/20 text-accent">
              <Map className="size-4" aria-hidden="true" />
            </span>
            <p className="text-sm font-bold leading-none text-primary">Roadmap Generated</p>
          </div>
        </GlassCard>
      </div>

      <div className="relative z-20 mx-auto flex min-h-screen max-w-[1920px] flex-col justify-center px-6 pb-20 pt-36 lg:pt-32">
        <motion.div
          initial="hidden"
          animate="show"
          transition={{ staggerChildren: 0.12, delayChildren: 0.05 }}
          className="max-w-[640px]"
        >
          <motion.p
            variants={fadeUp}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="eyebrow flex items-center gap-2 text-accent"
          >
            <Sparkles className="size-3.5" aria-hidden="true" />
            AI-Powered Entrepreneur Companion
          </motion.p>

          <motion.h1
            variants={fadeUp}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="mt-7 text-[clamp(3rem,7vw,6rem)] font-semibold leading-[1.0] tracking-[-0.02em] text-primary"
          >
            Your Dream.
            <br />
            Our Intelligence.
            <br />
            <span className="relative mt-3 inline-block">
              <span className="font-script text-shimmer-gold text-[1.12em] font-bold italic">
                Real Impact.
              </span>
              <motion.svg
                viewBox="0 0 320 16"
                className="absolute -bottom-1 left-0 h-3 w-full text-accent"
                fill="none"
                aria-hidden="true"
                initial={{ opacity: 1 }}
                animate={{ opacity: [1, 0.7, 1] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 2.1 }}
              >
                <motion.path
                  d="M4 11C70 3 200 2 316 8"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 2, delay: 0.8, ease: "easeInOut" }}
                />
              </motion.svg>
              <motion.span
                aria-hidden="true"
                className="absolute -right-3 -top-2 text-accent"
                initial={{ opacity: 0, scale: 0.4, rotate: -8 }}
                animate={{ opacity: [0, 1, 0], scale: [0.4, 1, 0.4], rotate: [-8, 4, -8] }}
                transition={{
                  duration: 1.8,
                  repeat: Infinity,
                  repeatDelay: 3.2,
                  ease: "easeInOut",
                  delay: 3.2,
                }}
              >
                <Sparkle className="size-4 fill-accent" aria-hidden="true" />
              </motion.span>
            </span>
          </motion.h1>

          <motion.p
            variants={fadeUp}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="mt-8 max-w-[42ch] text-[1.05rem] leading-[1.9] text-muted-foreground"
          >
            Solventia helps young dreamers discover real opportunities, validate them with data, and
            build step-by-step roadmaps to create meaningful impact.
          </motion.p>

          <motion.div
            variants={fadeUp}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="mt-10 flex flex-wrap items-center gap-4"
          >
            <PremiumButton
              type="button"
              tone="solid"
              shape="rounded"
              size="lg"
              onClick={() => navigate({ to: "/consultation" })}
            >
              <Lightbulb className="size-5 text-accent" aria-hidden="true" />
              Find Your Business Idea
              <ArrowRight className="size-4 text-accent transition-transform duration-300 group-hover:translate-x-1.5" />
            </PremiumButton>

            <PremiumButton
              tone="outline"
              shape="rounded"
              size="lg"
              href="#how-it-works"
              onClick={(event) => {
                event.preventDefault();
                scrollToSection("how-it-works");
              }}
            >
              See How It Works
              <span className="flex size-7 items-center justify-center rounded-full bg-primary/80">
                <Play className="size-3 fill-current text-primary-foreground" aria-hidden="true" />
              </span>
            </PremiumButton>
          </motion.div>

          <motion.div
            variants={fadeUp}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="mt-12 inline-flex items-center gap-4 rounded-full border border-border/50 bg-card/50 py-2.5 pl-2.5 pr-6 backdrop-blur-sm"
          >
            <div className="flex shrink-0">
              <Avatar index={0} alt="Solventia community member" />
              <Avatar index={1} alt="Solventia community member" />
              <Avatar index={2} alt="Solventia community member" />
            </div>
            <p className="max-w-[28ch] text-[0.88rem] leading-[1.5] text-muted-foreground">
              Trusted by 10,000+ young dreamers, mentors &amp; NGOs across India{" "}
              <Heart
                className="inline size-4 -translate-y-px fill-accent text-accent"
                aria-hidden="true"
              />
            </p>
          </motion.div>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "200px" }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-20 w-full border-t border-border/60 bg-background px-6 py-10 lg:px-10"
      >
        <ol className="mx-auto grid max-w-[1320px] gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {QUICK_STRIP.map((item, i) => (
            <li key={item.label} className="relative flex items-start gap-4">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent">
                <item.icon className="size-5 stroke-[1.6]" aria-hidden="true" />
              </span>
              <div>
                <p className="font-sans text-[0.92rem] font-bold text-primary">{item.label}</p>
                <p className="mt-1 text-[0.82rem] leading-[1.6] text-muted-foreground">
                  {item.body}
                </p>
              </div>
              {i < QUICK_STRIP.length - 1 && (
                <ChevronRight
                  aria-hidden="true"
                  className="absolute -right-5 top-3 hidden size-4 text-accent/50 lg:block"
                />
              )}
            </li>
          ))}
        </ol>
      </motion.div>
    </section>
  );
}

const QUICK_STRIP = [
  { icon: Compass, label: "Discover", body: "AI finds opportunities tailored to you" },
  { icon: ShieldCheck, label: "Validate", body: "Back ideas with real-world data" },
  { icon: Map, label: "Plan", body: "Get a step-by-step business roadmap" },
  { icon: Rocket, label: "Launch", body: "Move forward with confidence" },
];
