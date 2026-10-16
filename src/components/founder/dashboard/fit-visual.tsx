import type { FitRow, FitStatus } from "@/lib/fit/matrix";
import type { MessageKey } from "@/lib/i18n";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { FIT_ICONS, FIT_PIPS } from "./fit-constants";

/* Founder fit is a qualitative matrix — never a number. These pieces draw it as
 * filled pips (one / two / three) so the level reads without colour or words. */

const PIP_TONE: Record<FitStatus, string> = {
  strong: "bg-sol-champagne-deep",
  moderate: "bg-sol-violet",
  conditional: "bg-sol-border-strong",
};

/** Three pips, filled to the status. Decorative — pair it with a text label. */
export function FitPips({
  status,
  className,
  pipClassName,
}: {
  status: FitStatus;
  className?: string;
  pipClassName?: string;
}) {
  return (
    <span className={cn("flex items-center gap-1", className)} aria-hidden="true">
      {[1, 2, 3].map((n) => (
        <span
          key={n}
          className={cn(
            "h-2.5 w-6 rounded-full",
            n <= FIT_PIPS[status] ? PIP_TONE[status] : "bg-sol-ivory-depth",
            pipClassName,
          )}
        />
      ))}
    </span>
  );
}

/** The four fit rows as a compact strip of chips — icon + pips — for list rows
 * where a full matrix would be too much. Labels are for screen readers. */
export function FitStrip({ rows }: { rows: FitRow[] }) {
  const { t } = useLocale();
  return (
    <ul className="flex flex-wrap gap-2" data-testid="fit-strip">
      {rows.map((row) => {
        const Icon = FIT_ICONS[row.key];
        const label = `${t(`fit.row.${row.key}` as MessageKey)}: ${t(`fit.status.${row.status}` as MessageKey)}`;
        return (
          <li
            key={row.key}
            title={label}
            className="flex items-center gap-2 rounded-lg border border-sol-border bg-sol-pearl px-2.5 py-1.5"
          >
            <Icon className="size-4 text-sol-champagne-deep" aria-hidden="true" />
            <FitPips status={row.status} pipClassName="h-2 w-3.5" />
            <span className="sr-only">{label}</span>
          </li>
        );
      })}
    </ul>
  );
}

/** Capability / Resources / Access / Ambition, each an icon tile + label + pips.
 * `tiles` lays the four out as a row of cards instead of a list. */
export function FitSignals({
  rows,
  layout = "list",
}: {
  rows: FitRow[];
  layout?: "list" | "tiles";
}) {
  const { t } = useLocale();
  if (layout === "tiles") {
    return (
      <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4" data-testid="fit-signals">
        {rows.map((row) => {
          const Icon = FIT_ICONS[row.key];
          const status = t(`fit.status.${row.status}` as MessageKey);
          return (
            <li
              key={row.key}
              className="flex flex-col gap-3 rounded-2xl border border-sol-border bg-sol-pearl p-4"
            >
              <span className="flex size-10 items-center justify-center rounded-xl bg-sol-champagne-soft text-sol-champagne-deep">
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <span className="text-[1rem] font-semibold text-sol-ink">
                {t(`fit.row.${row.key}` as MessageKey)}
              </span>
              <span role="img" aria-label={status} title={status}>
                <FitPips status={row.status} pipClassName="h-3 w-8 sm:w-9" />
              </span>
            </li>
          );
        })}
      </ul>
    );
  }
  return (
    <ul className="flex flex-col gap-3" data-testid="fit-signals">
      {rows.map((row) => {
        const Icon = FIT_ICONS[row.key];
        const status = t(`fit.status.${row.status}` as MessageKey);
        return (
          <li key={row.key} className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-3 text-[0.9375rem] font-semibold text-sol-ink">
              <span className="flex size-8 items-center justify-center rounded-lg bg-sol-champagne-soft text-sol-champagne-deep">
                <Icon className="size-4" aria-hidden="true" />
              </span>
              {t(`fit.row.${row.key}` as MessageKey)}
            </span>
            <span
              className="flex items-center gap-2.5"
              role="img"
              aria-label={status}
              title={status}
            >
              <FitPips status={row.status} pipClassName="w-7" />
            </span>
          </li>
        );
      })}
    </ul>
  );
}
