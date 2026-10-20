import { useQuery } from "@tanstack/react-query";
import { motion, useReducedMotion } from "motion/react";

import type { OpportunityBrief } from "@/lib/actions/founder";
import { getDirectionFits } from "@/lib/actions/opportunities";
import type { FactorScore, FitLabel } from "@/lib/fit/model";
import type { MessageKey } from "@/lib/i18n";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { qk } from "@/lib/queries";
import { useTranslatedBrief } from "@/lib/use-translation";
import { cn } from "@/lib/utils";
import { Card } from "../ui";
import { FIT_ICONS, FIT_ORDER } from "./fit-constants";

/** A cell's surface follows the factor level, so the grid reads before a single label
 * is read: gold = clear fit, plain = manageable, dashed = a gap, warning = critical. */
const CELL_TONE: Record<0 | 1 | 2 | 3, string> = {
  3: "border-sol-champagne/55 bg-sol-champagne-soft",
  2: "border-sol-border bg-sol-surface",
  1: "border-dashed border-sol-border-strong bg-sol-pearl",
  0: "border-dashed border-sol-warning/40 bg-sol-warning-soft",
};
const OVERALL_TONE: Record<FitLabel, string> = {
  strong: "text-sol-champagne-deep",
  moderate: "text-sol-ink",
  conditional: "text-sol-secondary",
  weak: "text-sol-warning",
  provisional: "text-sol-secondary",
};

function DirectionHead({ brief: raw, rank }: { brief: OpportunityBrief; rank: number }) {
  const brief = useTranslatedBrief(raw) ?? raw;
  const lead = rank === 1;
  return (
    <div
      data-testid="compare-column"
      data-lead={lead}
      className={cn(
        "flex h-full flex-col items-start gap-2 rounded-xl border p-2.5 text-left sm:p-3.5",
        lead
          ? "border-sol-champagne/60 bg-sol-champagne-soft/50"
          : "border-sol-border bg-sol-surface",
      )}
    >
      <span
        className={cn(
          "flex size-7 items-center justify-center rounded-full font-display text-[0.9375rem] font-semibold",
          lead ? "bg-sol-champagne text-sol-ink" : "bg-sol-ivory-depth text-sol-secondary",
        )}
        aria-hidden="true"
      >
        {rank}
      </span>
      <span className="line-clamp-3 min-w-0 break-words text-[0.875rem] font-semibold leading-snug text-sol-ink sm:text-[0.9375rem]">
        {brief.title}
      </span>
    </div>
  );
}

function Cell({
  score,
  loading,
  order,
  label,
}: {
  /** undefined = no assessment loaded; null = assessed as not known yet. */
  score: FactorScore | undefined;
  loading: boolean;
  order: number;
  label: string;
}) {
  const reduceMotion = useReducedMotion();
  const { t } = useLocale();
  if (loading) {
    return (
      <span
        className="block h-12 animate-pulse rounded-xl bg-sol-ivory-depth/70"
        aria-hidden="true"
      />
    );
  }
  if (score === undefined || score === null) {
    return (
      <span className="grid h-12 place-items-center rounded-xl border border-dashed border-sol-border text-[0.8125rem] font-semibold text-sol-muted">
        <span aria-hidden="true">{score === null ? t("fit2.level.unknown") : "—"}</span>
        <span className="sr-only">{label}</span>
      </span>
    );
  }
  return (
    <motion.span
      className={cn("flex h-12 items-center justify-center rounded-xl border", CELL_TONE[score])}
      data-status={score}
      initial={reduceMotion ? false : { opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.35, delay: 0.05 * order, ease: [0.22, 1, 0.36, 1] }}
    >
      <span className="text-[0.8125rem] font-semibold">
        {t(`fit2.level.${score}` as MessageKey)}
      </span>
    </motion.span>
  );
}

/** The factor levels — the only key the grid needs. */
function Legend() {
  const { t } = useLocale();
  return (
    <ul className="flex flex-wrap items-center gap-x-5 gap-y-2" aria-label={t("cc.compare.legend")}>
      {([3, 2, 1, 0] as const).map((s) => (
        <li
          key={s}
          className="flex items-center gap-2 text-[0.875rem] font-semibold text-sol-secondary"
        >
          {t(`fit2.level.${s}` as MessageKey)}
        </li>
      ))}
    </ul>
  );
}

/** The three directions side by side on the five founder-fit factors. Real fit
 * statuses only (the same ones shown on each opportunity); a direction whose
 * detail hasn't loaded shows a placeholder, never an invented level. */
export function DirectionCompare({ briefs }: { briefs: OpportunityBrief[] }) {
  const { t } = useLocale();
  const ids = briefs.map((b) => b.id);
  const fits = useQuery({
    queryKey: qk.directionFits(ids),
    queryFn: () => getDirectionFits({ data: { ids } }),
    staleTime: 30_000,
    enabled: ids.length > 1,
  });
  if (briefs.length < 2) return null;

  return (
    <Card className="flex flex-col gap-4 p-4 sm:p-6" data-testid="direction-compare">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <h2 className="sol-eyebrow">{t("cc.compare.heading")}</h2>
        <Legend />
      </div>
      <table className="w-full table-fixed border-separate border-spacing-1.5 sm:border-spacing-2">
        <caption className="sr-only">{t("cc.compare.aria")}</caption>
        <thead>
          <tr>
            <th scope="col" className="w-11 sm:w-36">
              <span className="sr-only">{t("cc.compare.fit")}</span>
            </th>
            {briefs.map((b, i) => (
              <th key={b.id} scope="col" className="align-top font-normal">
                <DirectionHead brief={b} rank={i + 1} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {FIT_ORDER.map((key, r) => {
            const Icon = FIT_ICONS[key];
            return (
              <tr key={key}>
                <th scope="row" className="text-left font-normal">
                  <span className="flex items-center gap-2.5 text-[0.9375rem] font-semibold text-sol-ink">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sol-champagne-soft text-sol-champagne-deep">
                      <Icon className="size-4" aria-hidden="true" />
                    </span>
                    <span className="hidden sm:inline">
                      {t(`fit2.factor.${key}` as MessageKey)}
                    </span>
                    <span className="sr-only sm:hidden">
                      {t(`fit2.factor.${key}` as MessageKey)}
                    </span>
                  </span>
                </th>
                {briefs.map((b, c) => {
                  const assessed = fits.data?.[b.id];
                  const score = assessed
                    ? (assessed.factors.find((x) => x.key === key)?.score ?? null)
                    : undefined;
                  return (
                    <td key={b.id}>
                      <Cell
                        score={score}
                        loading={fits.isLoading}
                        order={r * briefs.length + c}
                        label={
                          score === undefined
                            ? t("cc.compare.unavailable")
                            : `${t(`fit2.factor.${key}` as MessageKey)}: ${t(`fit2.level.${score ?? "unknown"}` as MessageKey)}`
                        }
                      />
                    </td>
                  );
                })}
              </tr>
            );
          })}
          <tr>
            <th
              scope="row"
              className="text-left text-[0.875rem] font-bold uppercase tracking-[0.08em] text-sol-secondary"
            >
              <span className="hidden sm:inline">{t("cc.compare.overall")}</span>
              <span className="sr-only sm:hidden">{t("cc.compare.overall")}</span>
            </th>
            {briefs.map((b) => (
              <td
                key={b.id}
                className={cn(
                  "text-center text-[0.875rem] font-bold leading-tight sm:text-[0.9375rem]",
                  OVERALL_TONE[b.fit],
                )}
                data-testid="compare-overall"
              >
                {t(`fit2.label.${b.fit}` as MessageKey)}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </Card>
  );
}
