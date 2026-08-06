import { motion, AnimatePresence } from "motion/react";
import { Compass, Sparkles, Target, Wallet } from "lucide-react";
import { useOnboarding } from "@/lib/onboarding-store";

function DNARing({ progress }: { progress: number }) {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  return (
    <div className="relative flex size-28 shrink-0 items-center justify-center">
      <svg viewBox="0 0 100 100" className="size-28 -rotate-90">
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="7"
          className="text-secondary"
        />
        <motion.circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="7"
          strokeLinecap="round"
          className="text-accent"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference * (1 - progress / 100) }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-xl font-bold text-primary">{progress}%</span>
      </div>
    </div>
  );
}

export function FounderProfilePanel({ className }: { className?: string }) {
  const { answers, progress } = useOnboarding();

  const skills = answers.skills ?? [];
  const goals = answers.goals ?? [];
  const hasResources = answers.investmentBudget || answers.assets?.length;

  return (
    <aside
      className={`flex flex-col gap-8 rounded-3xl border border-border/70 bg-card/90 p-7 shadow-[0_30px_70px_-45px_oklch(0.245_0.055_268_/_0.3)] backdrop-blur-xl ${className ?? ""}`}
    >
      <div className="flex items-center gap-5">
        <DNARing progress={progress} />
        <div>
          <p className="text-[0.72rem] font-bold uppercase tracking-[0.15em] text-accent">
            Business DNA
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {progress === 0
              ? "Not started yet"
              : progress === 100
                ? "Profile complete"
                : "Building your profile…"}
          </p>
        </div>
      </div>

      <AnimatePresence>
        {skills.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <p className="flex items-center gap-2 text-[0.72rem] font-bold uppercase tracking-[0.1em] text-muted-foreground">
              <Sparkles className="size-3.5 text-accent" aria-hidden="true" />
              Skills Identified
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {skills.map((s) => (
                <span
                  key={s.name}
                  className="rounded-full bg-accent/15 px-3 py-1 text-[0.75rem] font-medium text-primary"
                >
                  {s.name}
                </span>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {hasResources && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <p className="flex items-center gap-2 text-[0.72rem] font-bold uppercase tracking-[0.1em] text-muted-foreground">
              <Wallet className="size-3.5 text-accent" aria-hidden="true" />
              Resources
            </p>
            <p className="mt-2 text-[0.85rem] leading-[1.6] text-foreground">
              {answers.investmentBudget ?? "Budget not shared yet"}
              {answers.assets?.length ? ` · ${answers.assets.length} assets available` : ""}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {goals.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <p className="flex items-center gap-2 text-[0.72rem] font-bold uppercase tracking-[0.1em] text-muted-foreground">
              <Target className="size-3.5 text-accent" aria-hidden="true" />
              Goals
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {goals.map((g) => (
                <span
                  key={g}
                  className="rounded-full bg-secondary px-3 py-1 text-[0.75rem] font-medium text-primary"
                >
                  {g}
                </span>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="border-t border-border/70 pt-6">
        <p className="flex items-center gap-2 text-[0.72rem] font-bold uppercase tracking-[0.1em] text-muted-foreground">
          <Compass className="size-3.5 text-accent" aria-hidden="true" />
          Current Assessment
        </p>
        <p className="mt-2 text-[0.85rem] leading-[1.7] text-foreground">
          {progress === 0
            ? "I'll build your profile as you answer — nothing to assess yet."
            : progress < 40
              ? "Early picture forming. Keep going — every answer sharpens the recommendations."
              : progress < 80
                ? "Solid picture forming. I can already rule out a lot of generic ideas that wouldn't fit you."
                : "Strong, detailed profile. Almost ready to generate your personalized recommendations."}
        </p>
      </div>
    </aside>
  );
}
