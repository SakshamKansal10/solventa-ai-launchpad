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
  untested: "border-sol-border-strong bg-sol-hp-surface text-sol-muted",
  testing: "border-sol-violet bg-sol-violet-soft text-sol-violet-deep",
  supported: "border-sol-champagne bg-sol-champagne-soft text-sol-champagne-deep",
  contradicted: "border-sol-warning bg-sol-warning-soft text-sol-warning",
};
const DOT: Record<State, string> = {
  untested: "bg-sol-border-strong",
  testing: "bg-sol-violet",
  supported: "bg-sol-champagne-deep",
  contradicted: "bg-sol-warning",
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
      className="scroll-mt-[76px] bg-sol-hp-pearl px-[18px] py-[72px] sm:px-6 lg:px-9 lg:py-[96px]"
    >
      <div className="mx-auto max-w-[1180px]">
        <p className="text-[14px] font-semibold uppercase tracking-[0.14em] text-sol-champagne-deep">
          {t("story.proof.eyebrow")}
        </p>
        <h2
          className={cn(
            "mt-4 max-w-[20ch] font-display text-[34px] font-semibold text-sol-ink sm:text-[40px] lg:text-[48px]",
            locale === "hi" ? "leading-[1.35]" : "leading-[1.1]",
          )}
        >
          {t("story.proof.headline")}
        </h2>
        <p className="mt-4 max-w-[600px] text-[18px] leading-[28px] text-sol-secondary">
          {t("story.proof.subhead")}
        </p>

        <motion.div
          onViewportEnter={() => setEntered(true)}
          viewport={{ once: true, margin: "-100px" }}
          ref={stageRef}
          animate={{ opacity: fading ? 0.35 : 1 }}
          transition={{ duration: 0.45 }}
          className="relative mt-12 rounded-[32px] border border-sol-hp-border bg-sol-hp-surface p-5 sm:p-8"
          data-testid="proof-demo"
        >
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex min-h-8 items-center rounded-full border border-sol-violet/30 bg-sol-violet-soft px-4 text-[14px] font-bold tracking-[0.1em] text-sol-violet-deep">
              {t("adaptiveRoadmap.demoLabel")}
            </span>
            <span className="text-[15px] text-sol-secondary">{t("adaptiveRoadmap.demoNote")}</span>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-8">
            {/* The assumption map */}
            <div>
              <div className="relative">
                <span
                  aria-hidden="true"
                  className="absolute left-[10%] right-[10%] top-[31px] hidden h-0.5 rounded-full bg-sol-hp-ivory-deep sm:block"
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
                        <span className="text-[16px] font-semibold text-sol-ink">
                          {t(`story.proof.node.${id}` as MessageKey)}
                        </span>
                        <span
                          className={cn(
                            "text-[13.5px] font-semibold",
                            state === "contradicted" ? "text-sol-warning" : "text-sol-secondary",
                          )}
                        >
                          {stateWord(state)}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>

              <ul className="mt-7 flex flex-wrap gap-x-5 gap-y-2 border-t border-sol-border pt-5">
                {STATES.map((s) => (
                  <li key={s} className="flex items-center gap-2 text-[14px] text-sol-secondary">
                    <span className={cn("size-2.5 rounded-full", DOT[s])} aria-hidden="true" />
                    {stateWord(s)}
                  </li>
                ))}
              </ul>
            </div>

            {/* The evidence stream */}
            <div className="rounded-3xl border border-sol-border bg-sol-hp-pearl p-5">
              <p className="text-[14px] font-bold uppercase tracking-[0.1em] text-sol-champagne-deep">
                {t("story.proof.stream")}
              </p>
              <ul className="mt-4 flex min-h-[210px] flex-col gap-3" data-testid="proof-stream">
                <AnimatePresence initial={false}>
                  {!ev1 && !ev2 && (
                    <motion.li
                      key="wait"
                      exit={{ opacity: 0 }}
                      className="text-[15px] text-sol-muted"
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
                      className="rounded-2xl border border-sol-champagne/60 bg-sol-hp-surface p-4"
                    >
                      <p className="flex items-start gap-2 text-[16px] font-medium leading-snug text-sol-ink">
                        <MessageSquareQuote
                          className="mt-0.5 size-4 shrink-0 text-sol-champagne-deep"
                          aria-hidden="true"
                        />
                        {t("story.proof.ev1.quote")}
                      </p>
                      <p className="mt-2 text-[13.5px] font-semibold text-sol-secondary">
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
                      className="rounded-2xl border border-sol-warning/50 bg-sol-hp-surface p-4"
                    >
                      <p className="flex items-start gap-2 text-[16px] font-medium leading-snug text-sol-ink">
                        <MessageSquareQuote
                          className="mt-0.5 size-4 shrink-0 text-sol-warning"
                          aria-hidden="true"
                        />
                        {t("story.proof.ev2.quote")}
                      </p>
                      <p className="mt-2 text-[13.5px] font-semibold text-sol-secondary">
                        {t("story.proof.ev2.meta")}
                      </p>
                      {states.payment === "contradicted" && (
                        <motion.button
                          type="button"
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          onClick={() => scrollToSection("ask-sol-demo")}
                          className="mt-3 inline-flex min-h-10 items-center rounded-full border border-sol-violet/40 bg-sol-violet-soft px-4 text-[14px] font-semibold text-sol-violet-deep transition-colors hover:border-sol-violet"
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
