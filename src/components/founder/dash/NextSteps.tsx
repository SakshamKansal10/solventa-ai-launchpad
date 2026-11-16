import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

/** "What happens next": choose a direction → get a roadmap → test it. The active step is a
 * filled ink circle; done steps are champagne. */
export function NextSteps({ active }: { active: 1 | 2 | 3 }) {
  const { t } = useLocale();
  const steps = [t("v2.steps.1"), t("v2.steps.2"), t("v2.steps.3")];
  return (
    <ol
      aria-label={t("v2.steps.aria")}
      data-testid="next-steps"
      className="grid gap-4 pt-3 [grid-template-columns:repeat(auto-fit,minmax(min(280px,100%),1fr))]"
    >
      {steps.map((label, i) => {
        const n = i + 1;
        const state = n < active ? "done" : n === active ? "current" : "future";
        return (
          <li
            key={n}
            className="flex items-center gap-4"
            aria-current={state === "current" ? "step" : undefined}
            data-state={state}
          >
            <span
              aria-hidden="true"
              className={cn(
                "inline-flex size-[52px] shrink-0 items-center justify-center rounded-full text-[20px] font-semibold",
                state === "current" && "bg-sol-ink text-white",
                state === "done" && "bg-sol-champagne text-sol-ink",
                state === "future" && "border border-sol-ink/35 text-sol-ink",
              )}
            >
              {n}
            </span>
            <span
              className={cn(
                "text-[19px] leading-[1.35]",
                state === "current" ? "font-medium text-sol-ink" : "text-sol-secondary",
              )}
            >
              {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
