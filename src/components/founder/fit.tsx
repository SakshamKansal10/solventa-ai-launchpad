import { useLocale } from "@/lib/i18n/LocaleProvider";
import type { MessageKey } from "@/lib/i18n";
import { formatMoney } from "@/lib/country-currency";
import { skillSlug } from "@/lib/consultation/options";
import type { FitReason, FitStatus } from "@/lib/fit/matrix";
import { Pill, type PillTone } from "./ui";

export const FIT_TONE: Record<FitStatus, PillTone> = {
  strong: "champagne",
  moderate: "violet",
  conditional: "neutral",
};

export function FitStatusPill({ status }: { status: FitStatus }) {
  const { t } = useLocale();
  return <Pill tone={FIT_TONE[status]}>{t(`fit.status.${status}` as const)}</Pill>;
}

/** Turns a matrix reason ({ code, params, lists }) into one plain sentence in
 * the reader's language — numbers and names come from the founder's own data. */
export function useFitReasonText() {
  const { locale, td } = useLocale();
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
    const money = (n: unknown) => formatMoney(Number(n), currency);
    const params = {
      ...p,
      capital: money(p.capital),
      capitalNeeded: money(p.capitalNeeded),
      owned: list(reason.lists?.owned, skill),
      missing:
        reason.code === "acc_missing"
          ? list(reason.lists?.missing, (m) => td(`fit.need.${m}`, undefined, m))
          : list(reason.lists?.missing, skill),
      access: list(reason.lists?.access),
      ceiling: td(`fit.ceiling.${p.ceiling}`, undefined, String(p.ceiling ?? "")),
      wants: td(`fit.ceiling.${p.wants}`, undefined, String(p.wants ?? "")),
    };
    const code =
      reason.code === "acc_covered" && !reason.lists?.access?.length
        ? "acc_covered_plain"
        : reason.code;
    return td(`fit.reason.${code}` as MessageKey, params as Record<string, string | number>, code);
  };
}
