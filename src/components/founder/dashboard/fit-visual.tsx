import type { FactorAssessment } from "@/lib/fit/model";
import type { MessageKey } from "@/lib/i18n";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { FitStatusPill } from "../fit";
import { FIT_ICONS } from "./fit-constants";

/* Founder fit is shown as levels per factor — never a number. Each row shows its level word. */

/** Capability / Resources / Access / Ambition, each an icon tile + label + pips.
 * `tiles` lays the four out as a row of cards instead of a list. */
export function FitSignals({
  rows,
  layout = "list",
}: {
  rows: FactorAssessment[];
  layout?: "list" | "tiles" | "chips";
}) {
  const { t } = useLocale();
  if (layout === "chips") {
    return (
      <ul className="grid grid-cols-2 gap-2" data-testid="fit-signals">
        {rows.map((row) => {
          const Icon = FIT_ICONS[row.key];
          return (
            <li
              key={row.key}
              className="flex min-w-0 items-center gap-2 rounded-xl border border-sol-border bg-sol-surface/90 py-1.5 pl-2 pr-2.5 shadow-sm backdrop-blur"
            >
              <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-sol-champagne-soft text-sol-champagne-deep">
                <Icon className="size-4" aria-hidden="true" />
              </span>
              <span className="flex min-w-0 flex-col items-start gap-0.5">
                <span className="max-w-full truncate text-[0.9375rem] font-medium leading-none text-sol-ink">
                  {t(`fit2.factor.${row.key}` as MessageKey)}
                </span>
                <FitStatusPill score={row.score} />
              </span>
            </li>
          );
        })}
      </ul>
    );
  }
  if (layout === "tiles") {
    return (
      <div className="@container">
        <ul className="grid grid-cols-2 gap-3 @[40rem]:grid-cols-5" data-testid="fit-signals">
          {rows.map((row) => {
            const Icon = FIT_ICONS[row.key];
            return (
              <li
                key={row.key}
                className="flex min-w-0 flex-col items-start gap-3 rounded-2xl border border-sol-border bg-sol-pearl p-4"
              >
                <span className="flex size-10 items-center justify-center rounded-xl bg-sol-champagne-soft text-sol-champagne-deep">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <span className="max-w-full truncate text-[1rem] font-medium text-sol-ink">
                  {t(`fit2.factor.${row.key}` as MessageKey)}
                </span>
                <FitStatusPill score={row.score} />
              </li>
            );
          })}
        </ul>
      </div>
    );
  }
  return (
    <ul className="flex flex-col gap-3" data-testid="fit-signals">
      {rows.map((row) => {
        const Icon = FIT_ICONS[row.key];
        return (
          <li key={row.key} className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-3 text-[0.9375rem] font-semibold text-sol-ink">
              <span className="flex size-8 items-center justify-center rounded-lg bg-sol-champagne-soft text-sol-champagne-deep">
                <Icon className="size-4" aria-hidden="true" />
              </span>
              {t(`fit2.factor.${row.key}` as MessageKey)}
            </span>
            <FitStatusPill score={row.score} />
          </li>
        );
      })}
    </ul>
  );
}
