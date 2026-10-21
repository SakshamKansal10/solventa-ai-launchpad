import { useLocale } from "@/lib/i18n/LocaleProvider";
import type { MessageKey } from "@/lib/i18n";
import { formatMoney } from "@/lib/country-currency";
import { skillSlug } from "@/lib/consultation/options";
import type { FactorScore, FitLabel, FitReason } from "@/lib/fit/model";
import { Pill, type PillTone } from "./ui";

/** Overall founder fit — one label from the canonical assessment, never a number. */
export const FIT_LABEL_TONE: Record<FitLabel, PillTone> = {
  strong: "champagne",
  moderate: "neutral",
  conditional: "neutral",
  weak: "warning",
  provisional: "neutral",
};

export function FitLabelPill({ label, short = false }: { label: FitLabel; short?: boolean }) {
  const { t } = useLocale();
  const key =
    short && label === "provisional"
      ? "fit2.labelShort.provisional"
      : (`fit2.label.${label}` as const);
  return <Pill tone={FIT_LABEL_TONE[label]}>{t(key)}</Pill>;
}

/** One factor's level (Clear fit … Critical mismatch, or Not known yet). */
export function FitStatusPill({ score }: { score: FactorScore }) {
  const { t } = useLocale();
  const tone: PillTone = score === 3 ? "champagne" : score === 0 ? "warning" : "neutral";
  return <Pill tone={tone}>{t(`fit2.level.${score ?? "unknown"}` as MessageKey)}</Pill>;
}

/** A stated range in the founder's own words ("₹10,000–₹50,000", "30–40 hours"). */
export function useRangeText() {
  const { t } = useLocale();
  const pick = (min: number, max: number) =>
    max === -1 ? "over" : min <= 0 ? "under" : min === max ? "exact" : "between";
  return {
    money: (min: number, max: number, currency: string) => {
      const p = {
        min: formatMoney(min, currency),
        max: max === -1 ? "" : formatMoney(max, currency),
      };
      return t(`fit2.range.${pick(min, max)}` as MessageKey, p);
    },
    hours: (min: number, max: number) => {
      const kind = pick(min, max);
      return t(`fit2.hours.${kind === "exact" ? "between" : kind}` as MessageKey, { min, max });
    },
  };
}

/** Turns a factor reason ({ code, params, lists }) into one plain sentence in the
 * reader's language — every number and name comes from the founder's own answers. */
export function useFitReasonText() {
  const { locale, td } = useLocale();
  const range = useRangeText();
  const list = (items: string[] | undefined, map?: (s: string) => string) => {
    const shown = (items ?? []).map((i) => (map ? map(i) : i));
    try {
      return new Intl.ListFormat(locale, { style: "long", type: "conjunction" }).format(shown);
    } catch {
      return shown.join(", ");
    }
  };
  const skill = (n: string) => td(`skill.${skillSlug(n)}`, undefined, n);

  return (reason: FitReason, currency: string): string => {
    const p = reason.params;
    const min = Number(p.min ?? 0);
    const max = Number(p.max ?? -1);
    const isMoney = reason.code.startsWith("res_");
    const params: Record<string, string | number> = {
      ...p,
      budget: isMoney ? range.money(min, max, currency) : "",
      hours: reason.code.startsWith("time_") ? range.hours(min, max) : "",
      need: isMoney ? formatMoney(Number(p.need ?? 0), currency) : Number(p.need ?? 0),
      owned: list(reason.lists?.owned, skill),
      missing: list(reason.lists?.missing, skill),
      have: list(reason.lists?.have),
    };
    return td(`fit2.reason.${reason.code}` as MessageKey, params, reason.code);
  };
}
