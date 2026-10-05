import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Check, MessageSquareQuote, TriangleAlert } from "lucide-react";

import { scrollToSection } from "@/hooks/use-active-section";
import type { MessageKey } from "@/lib/i18n";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

type NodeId = "problem" | "customer" | "payment" | "channel" | "delivery";
type State = "untested" | "testing" | "supported" | "contradicted";
type Pt = { x: number; y: number };

const NODES: NodeId[] = ["problem", "customer", "payment", "channel", "delivery"];
const STATES: State[] = ["untested", "testing", "supported", "contradicted"];
const INITIAL: Record<NodeId, State> = {
  problem: "testing",
  customer: "untested",
  payment: "untested",
  channel: "untested",
  delivery: "untested",
};
const LOOP_MS = 12400;

const RING: Record<State, string> = {
  untested: "border-white/25 bg-white/[0.06] text-white/70",
  testing: "border-sol-violet bg-sol-violet/25 text-white",
  supported: "border-sol-champagne bg-sol-champagne/20 text-sol-champagne",
  contradicted: "border-[#E09A7C] bg-sol-warning/25 text-[#F0B29A]",
};
const DOT: Record<State, string> = {
  untested: "bg-white/45",
  testing: "bg-[#A895F2]",
  supported: "bg-sol-champagne",
  contradicted: "bg-[#E09A7C]",
};

/** Five assumptions change state as evidence arrives — including evidence that
 * disagrees. Loops quietly; reduced-motion visitors see the finished state. */
export function ProofDemo() {
  const { t, locale } = useLocale();
  const reduceMotion = useReducedMotion();
  const [entered, setEntered] = useState(false);
  const [cycle, setCycle] = useState(0);
  const [states, setStates] = useState<Record<NodeId, State>>(INITIAL);
  const [ev1, setEv1] = useState(false);
  const [ev2, setEv2] = useState(false);
  const [fading, setFading] = useState(false);
  const [trip, setTrip] = useState<{ from: Pt; to: Pt; id: string } | null>(null);

  const stageRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<Partial<Record<NodeId, HTMLElement | null>>>({});
  const ev1Ref = useRef<HTMLLIElement>(null);
  const ev2Ref = useRef<HTMLLIElement>(null);

  useEffect(() => {
    if (!entered) return;
    if (reduceMotion) {
      setStates({ ...INITIAL, problem: "supported", payment: "contradicted" });
      setEv1(true);
      setEv2(true);
      return;
    }
    const timers: number[] = [];
    const at = (ms: number, fn: () => void) => timers.push(window.setTimeout(fn, ms));
    const fly = (from: HTMLElement | null, node: NodeId, id: string) => {
      const stage = stageRef.current?.getBoundingClientRect();
      const target = nodeRefs.current[node];
      if (!stage || !from || !target) return;
      const a = from.getBoundingClientRect();
      const b = target.getBoundingClientRect();
      setTrip({
        id,
        from: { x: a.left - stage.left + 24, y: a.top - stage.top + a.height / 2 },
        to: { x: b.left - stage.left + b.width / 2, y: b.top - stage.top + b.height / 2 },
      });
    };
    at(1200, () => setEv1(true));
    at(2300, () => fly(ev1Ref.current, "problem", `a-${cycle}`));
    at(3300, () => setStates((s) => ({ ...s, problem: "supported" })));
    at(4800, () => setStates((s) => ({ ...s, payment: "testing" })));
    at(5600, () => setEv2(true));
    at(6700, () => fly(ev2Ref.current, "payment", `b-${cycle}`));
    at(7700, () => setStates((s) => ({ ...s, payment: "contradicted" })));
    at(LOOP_MS - 500, () => setFading(true));
    at(LOOP_MS, () => {
      setFading(false);
      setStates(INITIAL);
      setEv1(false);
      setEv2(false);
      setTrip(null);
      setCycle((n) => n + 1);
    });
    return () => timers.forEach((id) => window.clearTimeout(id));
  }, [entered, reduceMotion, cycle]);

  const stateWord = (s: State) => t(`story.proof.state.${s}` as MessageKey);

  return (
    <section
      id="proof-demo"
      className="relative scroll-mt-[76px] overflow-hidden bg-workspace px-[18px] py-[72px] sm:px-6 lg:px-9 lg:py-[104px]"
    >
      {/* Light falls on the map from above — depth without a gradient wash. */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 720px 420px at 30% 0%, rgba(114,87,216,0.20), transparent 70%), radial-gradient(ellipse 520px 360px at 90% 100%, rgba(195,160,100,0.12), transparent 70%)",
        }}
        aria-hidden="true"
      />
      <div className="relative mx-auto max-w-[1180px]">
        <p className="text-[14px] font-semibold uppercase tracking-[0.14em] text-sol-champagne">
          {t("story.proof.eyebrow")}
        </p>
        <h2
          className={cn(
            "mt-4 max-w-[20ch] font-display text-[34px] font-semibold text-white sm:text-[40px] lg:text-[52px]",
            locale === "hi" ? "leading-[1.35]" : "leading-[1.08]",
          )}
        >
          {t("story.proof.headline")}
        </h2>

        <motion.div
          onViewportEnter={() => setEntered(true)}
          viewport={{ once: true, margin: "-100px" }}
          ref={stageRef}
          animate={{ opacity: fading ? 0.35 : 1 }}
          transition={{ duration: 0.45 }}
          className="relative mt-12 rounded-[32px] border border-white/10 bg-white/[0.04] p-5 shadow-[0_40px_80px_rgba(0,0,0,0.35)] backdrop-blur-sm sm:p-8"
          data-testid="proof-demo"
        >
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex min-h-8 items-center rounded-full border border-white/20 bg-white/10 px-4 text-[14px] font-bold tracking-[0.1em] text-white">
              {t("adaptiveRoadmap.demoLabel")}
            </span>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-8">
            {/* The assumption map */}
            <div>
              <div className="relative">
                <span
                  aria-hidden="true"
                  className="absolute left-[10%] right-[10%] top-[31px] hidden h-0.5 rounded-full bg-white/15 sm:block"
                />
                <ul
                  className="relative grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-5"
                  aria-label={t("story.proof.mapAria")}
                >
                  {NODES.map((id) => {
                    const state = states[id];
                    return (
                      <li
                        key={id}
                        className="flex flex-col items-center gap-2 text-center"
                        data-testid={`proof-node-${id}`}
                        data-state={state}
                      >
                        <span
                          ref={(el) => {
                            nodeRefs.current[id] = el;
                          }}
                          className="relative flex size-[62px] items-center justify-center"
                        >
                          {state === "testing" && !reduceMotion && (
                            <motion.span
                              aria-hidden="true"
                              className="absolute inset-0 rounded-full border-2 border-sol-violet/60"
                              animate={{ scale: [1, 1.4], opacity: [0.7, 0] }}
                              transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }}
                            />
                          )}
                          <motion.span
                            key={state}
                            initial={reduceMotion ? false : { scale: 0.82 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", stiffness: 380, damping: 20 }}
                            className={cn(
                              "relative flex size-full items-center justify-center rounded-full border-2 transition-colors duration-300",
                              RING[state],
                            )}
                          >
                            {state === "supported" ? (
                              <Check className="size-6" strokeWidth={2.6} aria-hidden="true" />
                            ) : state === "contradicted" ? (
                              <TriangleAlert className="size-6" aria-hidden="true" />
                            ) : (
                              <span className={cn("size-2.5 rounded-full", DOT[state])} />
                            )}
                          </motion.span>
                        </span>
                        <span className="text-[16px] font-semibold text-white">
                          {t(`story.proof.node.${id}` as MessageKey)}
                        </span>
                        <span
                          className={cn(
                            "text-[14px] font-semibold",
                            state === "contradicted" ? "text-[#F0B29A]" : "text-white/70",
                          )}
                        >
                          {stateWord(state)}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>

              <ul className="mt-7 flex flex-wrap gap-x-5 gap-y-2 border-t border-white/10 pt-5">
                {STATES.map((s) => (
                  <li key={s} className="flex items-center gap-2 text-[14px] text-white/70">
                    <span className={cn("size-2.5 rounded-full", DOT[s])} aria-hidden="true" />
                    {stateWord(s)}
                  </li>
                ))}
              </ul>
            </div>

            {/* The evidence stream */}
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
              <p className="text-[14px] font-bold uppercase tracking-[0.1em] text-sol-champagne">
                {t("story.proof.stream")}
              </p>
              <ul className="mt-4 flex min-h-[210px] flex-col gap-3" data-testid="proof-stream">
                <AnimatePresence initial={false}>
                  {!ev1 && !ev2 && (
                    <motion.li
                      key="wait"
                      exit={{ opacity: 0 }}
                      className="text-[15px] text-white/60"
                    >
                      {t("story.proof.waiting")}
                    </motion.li>
                  )}
                  {ev1 && (
                    <motion.li
                      key="ev1"
                      ref={ev1Ref}
                      initial={{ opacity: 0, x: 24 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: reduceMotion ? 0 : 0.4, ease: [0.22, 1, 0.36, 1] }}
                      className="rounded-2xl border border-sol-champagne/50 bg-white/[0.07] p-4"
                    >
                      <p className="flex items-start gap-2 text-[16px] font-medium leading-snug text-white">
                        <MessageSquareQuote
                          className="mt-0.5 size-4 shrink-0 text-sol-champagne"
                          aria-hidden="true"
                        />
                        {t("story.proof.ev1.quote")}
                      </p>
                      <p className="mt-2 text-[14px] font-semibold text-white/65">
                        {t("story.proof.ev1.meta")}
                      </p>
                    </motion.li>
                  )}
                  {ev2 && (
                    <motion.li
                      key="ev2"
                      ref={ev2Ref}
                      initial={{ opacity: 0, x: 24 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: reduceMotion ? 0 : 0.4, ease: [0.22, 1, 0.36, 1] }}
                      className="rounded-2xl border border-[#E09A7C]/60 bg-white/[0.07] p-4"
                    >
                      <p className="flex items-start gap-2 text-[16px] font-medium leading-snug text-white">
                        <MessageSquareQuote
                          className="mt-0.5 size-4 shrink-0 text-[#F0B29A]"
                          aria-hidden="true"
                        />
                        {t("story.proof.ev2.quote")}
                      </p>
                      <p className="mt-2 text-[14px] font-semibold text-white/65">
                        {t("story.proof.ev2.meta")}
                      </p>
                      {states.payment === "contradicted" && (
                        <motion.button
                          type="button"
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          onClick={() => scrollToSection("ask-sol-demo")}
                          className="mt-3 inline-flex min-h-10 items-center rounded-full border border-sol-champagne/60 bg-sol-champagne/10 px-4 text-[14px] font-semibold text-sol-champagne transition-colors duration-150 hover:border-sol-champagne hover:bg-sol-champagne/20"
                          data-testid="proof-ask-sol"
                        >
                          {t("story.proof.askSol")}
                        </motion.button>
                      )}
                    </motion.li>
                  )}
                </AnimatePresence>
              </ul>
            </div>
          </div>

          {/* Evidence particle: stream → assumption node. */}
          {trip && !reduceMotion && (
            <motion.span
              key={trip.id}
              aria-hidden="true"
              className="pointer-events-none absolute left-0 top-0 z-20 size-3.5 rounded-full bg-sol-champagne shadow-[0_0_0_6px_rgba(195,160,100,0.25)]"
              initial={{ x: trip.from.x - 7, y: trip.from.y - 7, opacity: 0, scale: 0.6 }}
              animate={{
                x: trip.to.x - 7,
                y: trip.to.y - 7,
                opacity: [0, 1, 1, 0],
                scale: [0.6, 1, 1, 0.8],
              }}
              transition={{
                duration: 1,
                ease: "easeInOut",
                opacity: { times: [0, 0.2, 0.8, 1] },
                scale: { times: [0, 0.2, 0.8, 1] },
              }}
            />
          )}
        </motion.div>
      </div>
    </section>
  );
}
