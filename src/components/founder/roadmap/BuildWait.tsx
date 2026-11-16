import { useQuery } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { useState } from "react";

import { Label, MistCard } from "@/components/founder/dash/ui";
import { getBuildProgress, type BuildProgress } from "@/lib/actions/roadmap";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { readWarmupNames, saveWarmupNames } from "@/lib/roadmap/warmup";
import { cn } from "@/lib/utils";

const STEPS = ["read", "plan", "week1", "open"] as const;
const ORDER: Record<BuildProgress["stage"], number> = {
  read: 0,
  plan: 1,
  week1: 2,
  done: 3,
  failed: 0,
};

/**
 * The roadmap wait (go-live step 3), all of it real: the steps tick as the database shows them
 * done, the plan's phases appear the moment the skeleton is saved, week 1's missions the moment
 * they exist — and meanwhile one useful task whose answer goes into the first mission.
 */
export function BuildWait({ opportunityId, active }: { opportunityId: string; active: boolean }) {
  const { t } = useLocale();
  const progress = useQuery({
    queryKey: ["build-progress", opportunityId],
    queryFn: () => getBuildProgress({ data: { opportunityId } }),
    refetchInterval: active ? 1500 : false,
  });
  const p = progress.data;
  // At least "read" is under way the moment the request is.
  const at = Math.max(ORDER[p?.stage ?? "read"], 0);

  return (
    <div className="grid gap-8 min-[1280px]:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="flex flex-col gap-7">
        <ol className="flex flex-col gap-3" data-testid="build-steps">
          {STEPS.map((s, i) => {
            const done = i < at;
            const current = i === at;
            return (
              <li
                key={s}
                data-state={done ? "done" : current ? "current" : "next"}
                className={cn(
                  "flex min-h-11 items-center gap-3.5 text-[19px]",
                  done ? "text-sol-ink" : current ? "font-semibold text-sol-ink" : "text-sol-muted",
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "grid size-7 shrink-0 place-items-center rounded-full border",
                    done
                      ? "border-sol-navy bg-sol-navy text-white"
                      : current
                        ? "border-sol-cobalt"
                        : "border-sol-ink/20",
                  )}
                >
                  {done ? (
                    <Check className="size-4" />
                  ) : current ? (
                    <span className="size-2 animate-pulse rounded-full bg-sol-cobalt motion-reduce:animate-none" />
                  ) : null}
                </span>
                {t(`v2.build.step.${s}` as const)}
              </li>
            );
          })}
        </ol>

        {p && p.phases.length > 0 && (
          <MistCard className="gap-4" data-testid="build-plan">
            <Label as="p">{t("v2.build.planSoFar")}</Label>
            <ol className="flex flex-col gap-2.5">
              {p.phases.map((ph, i) => (
                <li
                  key={i}
                  className="flex flex-wrap items-baseline justify-between gap-x-4 text-[18px]"
                >
                  <span className="text-sol-ink">{ph.title}</span>
                  <span className="text-[17px] text-sol-secondary">
                    {t("v2.build.phaseWeeks", { n: ph.weeks })}
                  </span>
                </li>
              ))}
            </ol>
          </MistCard>
        )}

        {p && p.missions.length > 0 && (
          <MistCard className="gap-4" data-testid="build-missions">
            <Label as="p">{t("v2.build.missions")}</Label>
            <ol className="flex list-decimal flex-col gap-2 pl-6 text-[18px] text-sol-ink">
              {p.missions.map((m, i) => (
                <li key={i}>{m}</li>
              ))}
            </ol>
          </MistCard>
        )}
      </div>

      <WarmupTask />
    </div>
  );
}

/** "Write down 5 people you could ask…" — kept in this browser for Week 1's first list. */
function WarmupTask() {
  const { t } = useLocale();
  const [names, setNames] = useState<string[]>(() => {
    const saved = readWarmupNames();
    return Array.from({ length: 5 }, (_, i) => saved[i] ?? "");
  });
  const filled = names.filter((n) => n.trim()).length;
  return (
    <MistCard className="gap-4 self-start" data-testid="build-warmup">
      <p className="text-[clamp(22px,2.3vw,28px)] font-medium leading-[1.25] text-sol-ink">
        {t("v2.build.task.title")}
      </p>
      <p className="max-w-[60ch] text-[18px] leading-[1.5] text-sol-secondary">
        {t("v2.build.task.hint")}
      </p>
      <div className="flex flex-col gap-2.5">
        {names.map((n, i) => (
          <input
            key={i}
            value={n}
            aria-label={t("v2.build.task.name", { n: i + 1 })}
            placeholder={t("v2.build.task.name", { n: i + 1 })}
            onChange={(e) => {
              const next = names.map((x, k) => (k === i ? e.target.value : x));
              setNames(next);
              saveWarmupNames(next);
            }}
            data-testid={`warmup-name-${i + 1}`}
            className="min-h-12 w-full rounded-2xl border border-sol-ink/20 bg-white px-4 text-[18px] text-sol-ink placeholder:text-sol-muted focus-visible:border-sol-cobalt focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-sol-cobalt"
          />
        ))}
      </div>
      {filled > 0 && (
        <p role="status" className="text-[17px] text-sol-secondary" data-testid="warmup-saved">
          {t("v2.build.task.saved")}
        </p>
      )}
    </MistCard>
  );
}
