import type { FactorScore, FitFactorKey } from "@/lib/fit/model";
import type { MessageKey } from "@/lib/i18n";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

/**
 * Five-segment fit bar — one segment per fit factor (from `assessFit`, never a percentage),
 * clear fits first. Status never relies on colour alone:
 *   clear fit          solid cobalt
 *   any gap (1–2)      diagonal amber hatch
 *   critical mismatch  solid ink
 *   not known yet      dashed outline
 */

export interface FitFactorScore {
  key: FitFactorKey;
  score: FactorScore;
}
export type FitKind = "clear" | "gap" | "critical" | "unknown";

export function kindOf(score: FactorScore): FitKind {
  if (score === null) return "unknown";
  if (score === 3) return "clear";
  if (score === 0) return "critical";
  return "gap";
}

const ORDER: Record<FitKind, number> = { clear: 0, gap: 1, critical: 2, unknown: 3 };

export function sortFactors<T extends FitFactorScore>(factors: T[]): T[] {
  return [...factors].sort((a, b) => ORDER[kindOf(a.score)] - ORDER[kindOf(b.score)]);
}

const ON_NAVY_LIGHT = "color-mix(in oklab, var(--sol-cobalt) 55%, white)";
const ON_NAVY_AMBER = "color-mix(in oklab, var(--sol-warning) 45%, white)";

function Swatch({
  kind,
  onNavy,
  className,
}: {
  kind: FitKind;
  onNavy?: boolean;
  className?: string;
}) {
  const base = "block h-3.5 rounded-full";
  return (
    <span data-kind={kind} className={cn("contents")}>
      <SwatchInner kind={kind} onNavy={onNavy} className={className} base={base} />
    </span>
  );
}

function SwatchInner({
  kind,
  onNavy,
  className,
  base,
}: {
  kind: FitKind;
  onNavy?: boolean;
  className?: string;
  base: string;
}) {
  if (kind === "clear")
    return (
      <span
        className={cn(base, !onNavy && "bg-sol-cobalt", className)}
        style={onNavy ? { background: ON_NAVY_LIGHT } : undefined}
      />
    );
  if (kind === "gap")
    return (
      <span
        className={cn(base, "dash-hatch", className)}
        style={
          onNavy
            ? {
                backgroundImage: `repeating-linear-gradient(-45deg, ${ON_NAVY_AMBER} 0 3px, transparent 3px 7px)`,
                boxShadow: `inset 0 0 0 1.5px ${ON_NAVY_AMBER}`,
              }
            : undefined
        }
      />
    );
  if (kind === "critical")
    return <span className={cn(base, onNavy ? "bg-white" : "bg-sol-ink", className)} />;
  return (
    <span
      className={cn(
        base,
        "border-2 border-dashed",
        onNavy ? "border-white/60" : "border-sol-muted",
        className,
      )}
    />
  );
}

export function FitBar({
  factors,
  onNavy = false,
  className,
}: {
  factors: FitFactorScore[];
  onNavy?: boolean;
  className?: string;
}) {
  const { t } = useLocale();
  const sorted = sortFactors(factors);
  const label = sorted
    .map(
      (f) =>
        `${t(`fit2.factor.${f.key}` as MessageKey)}: ${t(`fit2.level.${f.score ?? "unknown"}` as MessageKey)}`,
    )
    .join(", ");
  return (
    <span
      role="img"
      aria-label={label}
      data-testid="fit-bar"
      className={cn("flex w-full gap-1.5", className)}
    >
      {sorted.map((f) => (
        <Swatch key={f.key} kind={kindOf(f.score)} onNavy={onNavy} className="flex-1" />
      ))}
    </span>
  );
}

/** Shown once per page, under the cards that use the bar. */
export function FitLegend({ className }: { className?: string }) {
  const { t } = useLocale();
  const items: { kind: FitKind; label: string }[] = [
    { kind: "clear", label: t("fit2.level.3") },
    { kind: "gap", label: t("v2.fit.gap") },
    { kind: "critical", label: t("fit2.level.0") },
    { kind: "unknown", label: t("fit2.level.unknown") },
  ];
  return (
    <ul
      className={cn("flex flex-wrap gap-x-6 gap-y-3 text-[17px] text-sol-secondary", className)}
      aria-label={t("v2.fit.legend")}
      data-testid="fit-legend"
    >
      {items.map((i) => (
        <li key={i.kind} className="flex items-center gap-2.5">
          <Swatch kind={i.kind} className="w-8" />
          {i.label}
        </li>
      ))}
    </ul>
  );
}

/** "4 clear · 1 gap" — the counts behind an overall fit label. */
export function useFitCounts() {
  const { t } = useLocale();
  return (factors: FitFactorScore[]) => {
    const n = (k: FitKind) => factors.filter((f) => kindOf(f.score) === k).length;
    const parts: string[] = [];
    if (n("clear")) parts.push(t("v2.fit.countClear", { n: n("clear") }));
    if (n("gap"))
      parts.push(
        t(n("gap") === 1 ? "v2.fit.countGap.one" : "v2.fit.countGap.other", { n: n("gap") }),
      );
    if (n("critical")) parts.push(t("v2.fit.countCritical", { n: n("critical") }));
    if (n("unknown")) parts.push(t("v2.fit.countUnknown", { n: n("unknown") }));
    return parts.join(" · ");
  };
}

/** "How it fits you": N of M fit clearly, the bar, and each factor's level (gaps in amber). */
export function FitSummaryCard({
  factors,
  className,
}: {
  factors: FitFactorScore[];
  className?: string;
}) {
  const { t } = useLocale();
  const sorted = sortFactors(factors);
  const clear = factors.filter((f) => kindOf(f.score) === "clear").length;
  return (
    <aside
      aria-labelledby="fit-title"
      data-testid="fit-summary"
      className={cn(
        "flex min-w-0 flex-col gap-5 rounded-[32px] bg-sol-ivory p-[clamp(24px,2.8vw,32px)]",
        className,
      )}
    >
      <div className="flex flex-col gap-2.5">
        <h2 id="fit-title" className="dash-label">
          {t("v2.fit.title")}
        </h2>
        <p className="font-display text-[clamp(28px,2.6vw,36px)] font-medium leading-[1.05] tracking-[-0.02em] text-sol-ink">
          {t("v2.fit.clearOf", { x: clear, y: factors.length })}
        </p>
      </div>
      <FitBar factors={factors} className="[&_span]:h-4" />
      <ul className="flex flex-col gap-3">
        {sorted.map((f) => {
          const kind = kindOf(f.score);
          return (
            <li
              key={f.key}
              className="flex items-baseline justify-between gap-3 text-[18px] text-sol-ink"
            >
              <span className="min-w-0">{t(`fit2.factor.${f.key}` as MessageKey)}</span>
              <span
                className={cn(
                  "shrink-0 text-right",
                  kind === "gap" || kind === "critical"
                    ? "dash-warn-text font-semibold"
                    : "text-sol-muted",
                )}
              >
                {t(`fit2.level.${f.score ?? "unknown"}` as MessageKey)}
              </span>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
