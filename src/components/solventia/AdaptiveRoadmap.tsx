import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Check, Lock } from "lucide-react";
import mark from "@/assets/solventia-mark.png";

const WEEK_1_TASKS = [
  "Draft your 8-question interview script",
  "Recruit 8 people who fit your target customer",
  "Log every answer in your evidence vault",
];

const FUTURE_WEEKS = ["Week 03", "Week 04", "Stage II"];

const TARGET_COUNT = 6;
const EVIDENCE_TOTAL = 8;
const THRESHOLD = 5;

/** The proof that Solventia continues past idea generation — a small,
 * honestly-labeled product demonstration (not a real founder's actual
 * data) showing evidence accumulating until a real threshold is met,
 * at which point the next week generates and unlocks. This is the
 * exact "just-in-time" mechanism the real product roadmap runs on.
 *
 * Never green, anywhere — violet marks the intelligent/progress state,
 * champagne marks completion, navy marks structure. */
export function AdaptiveRoadmap() {
  const reduceMotion = useReducedMotion();
  const [entered, setEntered] = useState(false);
  const [count, setCount] = useState(0);
  const [pulsing, setPulsing] = useState(false);
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => {
    if (!entered) return;
    if (reduceMotion) {
      setCount(TARGET_COUNT);
      setUnlocked(true);
      return;
    }
    const countStart = setTimeout(() => {
      let n = 0;
      const id = setInterval(() => {
        n += 1;
        setCount(n);
        if (n >= TARGET_COUNT) clearInterval(id);
      }, 110);
    }, 700);
    return () => clearTimeout(countStart);
  }, [entered, reduceMotion]);

  // Threshold reached -> pause 180ms -> one 700ms halo pulse -> unlock.
  // A single causal sequence, never two independent flat timers, and
  // never more than one pulse.
  useEffect(() => {
    if (count < THRESHOLD || unlocked) return;
    if (reduceMotion) {
      setUnlocked(true);
      return;
    }
    const pauseTimer = setTimeout(() => setPulsing(true), 180);
    const unlockTimer = setTimeout(() => {
      setPulsing(false);
      setUnlocked(true);
    }, 180 + 700);
    return () => {
      clearTimeout(pauseTimer);
      clearTimeout(unlockTimer);
    };
  }, [count, unlocked, reduceMotion]);

  return (
    <section className="bg-sol-hp-pearl px-[18px] py-[96px] sm:px-6 lg:px-9 lg:py-[120px]">
      <div className="mx-auto max-w-[1180px]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sol-champagne-deep">
          Adaptive Execution
        </p>
        <h2 className="mt-4 max-w-[600px] font-display text-[32px] font-semibold leading-[1.15] text-sol-ink sm:text-[40px] sm:leading-[46px]">
          Your plan changes when reality does.
        </h2>
        <p className="mt-4 max-w-[600px] text-[17px] leading-[27px] text-sol-secondary">
          Solventia generates the next mission from what you actually learn.
        </p>

        <motion.div
          onViewportEnter={() => setEntered(true)}
          viewport={{ once: true, margin: "-100px" }}
          className="relative mt-16 grid gap-8 lg:grid-cols-[55%_45%] lg:items-center"
        >
          {/* LEFT — Week 01 */}
          <div
            className="rounded-[24px] p-[34px]"
            style={{
              background: "linear-gradient(135deg, #F7F4FF, #F4F0FC)",
              border: "1px solid rgba(114,87,216,.24)",
              boxShadow: "0 14px 40px rgba(86,62,183,.055)",
            }}
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-sol-violet-deep">
              Week 01
            </p>
            <p className="mt-1 text-[13px] font-semibold uppercase tracking-[0.1em] text-sol-secondary">
              Prove the Problem
            </p>
            <p className="mt-4 font-display text-[26px] font-semibold leading-tight text-sol-ink">
              Interview 8 customers.
            </p>

            <div className="mt-5 flex flex-col gap-2.5">
              {WEEK_1_TASKS.map((task) => (
                <div key={task} className="flex items-center gap-2.5">
                  <span className="flex size-4 shrink-0 items-center justify-center rounded-full border border-sol-violet/50" />
                  <span className="text-[14px] text-sol-ink">{task}</span>
                </div>
              ))}
            </div>

            <div className="mt-6">
              <div className="flex items-center justify-between text-[13px] font-medium text-sol-secondary">
                <span>
                  {count} / {EVIDENCE_TOTAL} interviews
                </span>
                <span>{Math.round((count / EVIDENCE_TOTAL) * 100)}%</span>
              </div>
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white/70">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: "linear-gradient(90deg, #C5A36A, #7257D8)" }}
                  animate={{ width: `${(count / EVIDENCE_TOTAL) * 100}%` }}
                  transition={{ duration: 0.15 }}
                />
              </div>
            </div>

            {count >= THRESHOLD && (
              <motion.p
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="mt-4 text-[13px] font-semibold text-sol-violet-deep"
              >
                5+ report the same pain — signal reached.
              </motion.p>
            )}
          </div>

          {/* CENTER — Solventia Adapts node (overlaid on lg, stacked otherwise) */}
          <div className="pointer-events-none absolute inset-0 hidden items-center justify-center lg:flex">
            <div className="pointer-events-auto relative flex flex-col items-center gap-2.5">
              <div
                className="relative flex items-center justify-center"
                style={{ width: 128, height: 128 }}
              >
                <motion.span
                  className="absolute rounded-full"
                  style={{
                    width: 128,
                    height: 128,
                    background: "radial-gradient(circle, rgba(114,87,216,.11), transparent 68%)",
                  }}
                  animate={
                    pulsing && !reduceMotion
                      ? { scale: [1, 1.15], opacity: [0.4, 0] }
                      : { scale: 1, opacity: 0.7 }
                  }
                  transition={{ duration: 0.7, ease: "easeOut" }}
                />
                <span
                  className="relative flex items-center justify-center rounded-full"
                  style={{ width: 104, height: 104, background: "var(--sol-violet)" }}
                >
                  <img src={mark} alt="" width={298} height={436} className="h-9 w-auto" />
                </span>
              </div>
              <p className="text-center text-[11px] font-semibold uppercase tracking-[0.08em] text-sol-violet-deep">
                Solventia Adapts
              </p>
              <p className="max-w-[130px] text-center text-[13px] leading-tight text-sol-secondary">
                Evidence changed the plan.
              </p>
            </div>
          </div>

          {/* RIGHT — Week 02 (locked -> unlocked) + future preview */}
          <div>
            <motion.div
              animate={
                unlocked
                  ? { opacity: 1, x: 0, borderColor: "rgba(197,163,106,0.55)" }
                  : { opacity: 0.54, x: reduceMotion ? 0 : 8, borderColor: "#E4DDD4" }
              }
              transition={{ duration: 0.46, ease: [0.22, 1, 0.36, 1] }}
              className="rounded-[24px] border bg-sol-hp-surface p-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-sol-champagne-deep">
                    Week 02
                  </p>
                  <p className="mt-1 text-[13px] font-semibold uppercase tracking-[0.1em] text-sol-secondary">
                    Test Willingness to Pay
                  </p>
                </div>
                {!unlocked && <Lock className="size-4 text-sol-muted" aria-hidden="true" />}
                {unlocked && (
                  <span className="flex size-6 items-center justify-center rounded-full bg-sol-violet text-white">
                    <Check className="size-3.5" aria-hidden="true" />
                  </span>
                )}
              </div>
              <p className="mt-3 text-[15px] leading-[24px] text-sol-secondary">
                {unlocked
                  ? "Generated from what Week 01 actually found — not the original template."
                  : "Unlocks once Week 01's evidence threshold is reached."}
              </p>
            </motion.div>

            <div className="mt-3 flex flex-col gap-2">
              {FUTURE_WEEKS.map((label) => (
                <div
                  key={label}
                  className="flex items-center justify-between rounded-xl border border-dashed px-4 py-3"
                  style={{ background: "rgba(255,253,249,.58)", borderColor: "#D8D0C6" }}
                >
                  <span className="text-[14px] text-[#8A858D]">{label}</span>
                  <Lock className="size-3.5 text-[#8A858D]" aria-hidden="true" />
                </div>
              ))}
            </div>
            <p className="mt-4 text-[12px] text-sol-muted">
              Product demonstration — future weeks are generated only once the week before them is
              actually complete.
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
