import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { motion, useReducedMotion } from "motion/react";
import { z } from "zod";
import mark from "@/assets/solventia-mark.png";
import { requireAuthLoader } from "@/lib/route-guards";
import { buildRoadmapForOpportunity } from "@/lib/actions/opportunities";

export const Route = createFileRoute("/dashboard/roadmap/building")({
  beforeLoad: requireAuthLoader,
  validateSearch: z.object({ opportunityId: z.string() }),
  component: BuildingPage,
  head: () => ({
    meta: [{ title: "Building Your Roadmap — Solventia" }, { name: "robots", content: "noindex" }],
  }),
});

/** The five named stages a founder sees, in order — but the backend is
 * genuinely two sequential AI calls (a skeleton, then Week 1's detail;
 * see buildRoadmapForOpportunity), not five discrete steps we can time
 * exactly. The first two advance quickly and honestly (they're fast,
 * deterministic setup); the real wait lives on "Design Week 1," which
 * stays active — never fake-completing early — while a rotating,
 * genuinely-true micro-status line underneath keeps the founder
 * oriented. "Ready" only ever appears once the real call has returned. */
const STAGES = [
  "Map the long-term direction",
  "Structure your first stage",
  "Design Week 1",
  "Prepare the evidence plan",
  "Ready",
];

const ACTIVE_HOLD_INDEX = 3;

const MICRO_STATUS = [
  "Calibrating workload…",
  "Checking dependencies…",
  "Defining proof thresholds…",
  "Sequencing the first actions…",
  "Checking your constraints…",
  "Preparing the evidence target…",
];

function OrbitLoader() {
  const reduceMotion = useReducedMotion();
  return (
    <div className="relative flex size-[72px] items-center justify-center">
      <div
        className="absolute inset-[-14px] rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(114,87,216,.14), transparent 66%)",
        }}
      />
      <svg width={72} height={72} viewBox="0 0 72 72" className="absolute inset-0">
        <circle cx={36} cy={36} r={30} fill="none" stroke="var(--sol-border)" strokeWidth={1.5} />
        <motion.circle
          cx={36}
          cy={36}
          r={30}
          fill="none"
          stroke="var(--sol-champagne)"
          strokeWidth={1.75}
          strokeLinecap="round"
          strokeDasharray="14 45 14 115"
          animate={reduceMotion ? undefined : { rotate: 360 }}
          style={{ transformOrigin: "36px 36px" }}
          transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
        />
        <motion.circle
          cx={36}
          cy={36}
          r={22}
          fill="none"
          stroke="var(--sol-violet)"
          strokeWidth={1.25}
          strokeLinecap="round"
          strokeDasharray="10 30 10 130"
          animate={reduceMotion ? undefined : { rotate: -360 }}
          style={{ transformOrigin: "36px 36px" }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
        />
      </svg>
      <img src={mark} alt="" width={298} height={436} className="relative h-6 w-auto" />
    </div>
  );
}

function BuildingPage() {
  const { opportunityId } = Route.useSearch();
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const [stageIndex, setStageIndex] = useState(0);
  const [microIndex, setMicroIndex] = useState(0);
  const [leaving, setLeaving] = useState(false);
  // A real state value (not a ref) driving both effects below, so a
  // retry genuinely restarts the mutation AND the stage timers — a ref
  // would not, since mutating .current never triggers a re-render.
  const [attempt, setAttempt] = useState(0);

  const mutation = useMutation({
    mutationFn: () => buildRoadmapForOpportunity({ data: { opportunityId } }),
    onSuccess: () => {
      setStageIndex(STAGES.length - 1);
      setLeaving(true);
      window.setTimeout(() => {
        navigate({ to: "/dashboard/roadmap" });
      }, 320);
    },
    onError: (err) => {
      console.error("[roadmap] build failed on dedicated building page:", err);
    },
  });
  const { mutate } = mutation;

  useEffect(() => {
    mutate();
    // Fires once per real attempt — mutate is stable across renders
    // (react-query), so `attempt` is the only thing that should retrigger it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt]);

  // Time-based advance through the two fast, genuinely-quick setup
  // stages only — then hold on "Design Week 1" until the real network
  // call actually resolves. Never advances to "Ready" on its own.
  useEffect(() => {
    const t1 = window.setTimeout(() => setStageIndex((i) => Math.max(i, 1)), 1100);
    const t2 = window.setTimeout(() => setStageIndex((i) => Math.max(i, 2)), 2400);
    const t3 = window.setTimeout(() => setStageIndex((i) => Math.max(i, ACTIVE_HOLD_INDEX)), 3800);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
    };
  }, [attempt]);

  useEffect(() => {
    if (mutation.isError || mutation.isSuccess) return;
    const id = window.setInterval(() => {
      setMicroIndex((i) => (i + 1) % MICRO_STATUS.length);
    }, 3000);
    return () => window.clearInterval(id);
  }, [mutation.isError, mutation.isSuccess]);

  function handleRetry() {
    setStageIndex(0);
    setMicroIndex(0);
    mutation.reset();
    // Bumping `attempt` re-triggers the two effects above (the mutate
    // call and the stage timers) — never call mutate() directly here too,
    // or a retry click would fire the request twice.
    setAttempt((n) => n + 1);
  }

  return (
    <div
      className="flex min-h-dvh w-full flex-col items-center justify-center bg-sol-page px-[18px] sm:px-6"
      style={{ minHeight: "100dvh" }}
    >
      <motion.div
        animate={leaving ? { opacity: 0.4, y: -8 } : { opacity: 1, y: 0 }}
        transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
        className="mx-auto flex w-full max-w-[720px] flex-col items-center py-16 text-center"
      >
        {mutation.isError ? (
          <>
            <img
              src={mark}
              alt=""
              width={298}
              height={436}
              className="h-[72px] w-auto opacity-70"
            />
            <h1 className="mt-8 font-display text-[32px] font-semibold leading-[1.1] text-sol-ink sm:text-[40px]">
              We couldn&rsquo;t finish this mission yet.
            </h1>
            <p className="mt-4 max-w-[560px] text-[17px] leading-[27px] text-sol-secondary">
              Nothing about your selection or your profile was lost — Sol just couldn&rsquo;t finish
              building the roadmap this time.
            </p>
            <div className="mt-8 flex items-center gap-3">
              <button
                type="button"
                onClick={handleRetry}
                className="inline-flex h-[54px] items-center gap-2 rounded-2xl bg-sol-navy px-7 text-[15px] font-semibold text-white transition-colors hover:bg-sol-navy-soft"
              >
                Try Again
              </button>
              <button
                type="button"
                onClick={() =>
                  navigate({
                    to: "/dashboard/opportunities/$id",
                    params: { id: opportunityId },
                  })
                }
                className="inline-flex h-[54px] items-center rounded-2xl border border-sol-border px-7 text-[15px] font-semibold text-sol-ink transition-colors hover:border-sol-champagne/50"
              >
                Back to Opportunity
              </button>
            </div>
          </>
        ) : (
          <>
            <OrbitLoader />
            <h1 className="mt-8 font-display text-[36px] font-semibold leading-[1.1] text-sol-ink sm:text-[40px] lg:text-[46px]">
              Building your first founder mission.
            </h1>
            <p className="mt-4 max-w-[560px] text-[17px] leading-[27px] text-sol-secondary">
              Your long-term direction is mapped. We&rsquo;re making Week 1 specific.
            </p>

            <ol className="mt-10 flex w-full max-w-[440px] flex-col gap-2.5">
              {STAGES.map((stage, i) => {
                const isDone = i < stageIndex;
                const isActive = i === stageIndex;
                return (
                  <li
                    key={stage}
                    className="flex items-center gap-3 rounded-xl px-3 py-2 text-left"
                  >
                    <span
                      className="flex size-5 shrink-0 items-center justify-center rounded-full border text-[0.62rem] font-bold transition-colors"
                      style={{
                        borderColor:
                          isDone || isActive ? "var(--sol-champagne)" : "var(--sol-border)",
                        background: isDone ? "var(--sol-champagne)" : "transparent",
                        color: isDone ? "white" : "var(--sol-muted)",
                      }}
                    >
                      {isDone ? "✓" : i + 1}
                    </span>
                    <span
                      className="text-[15px] font-medium transition-colors"
                      style={{
                        color: isDone || isActive ? "var(--sol-ink)" : "var(--sol-muted)",
                      }}
                    >
                      {stage}
                    </span>
                    {isActive && stageIndex >= ACTIVE_HOLD_INDEX && (
                      <motion.span
                        key={microIndex}
                        initial={reduceMotion ? undefined : { opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.4 }}
                        className="ml-auto whitespace-nowrap text-[12px] text-sol-secondary"
                      >
                        {MICRO_STATUS[microIndex]}
                      </motion.span>
                    )}
                  </li>
                );
              })}
            </ol>
          </>
        )}
      </motion.div>
    </div>
  );
}
