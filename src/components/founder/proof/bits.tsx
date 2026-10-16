import { useLocale } from "@/lib/i18n/LocaleProvider";
import type { MessageKey } from "@/lib/i18n";
import type { ProofState } from "@/lib/proof/state";
import { Pill, type PillTone } from "../ui";

export const STATE_TONE: Record<ProofState, PillTone> = {
  untested: "neutral",
  weak: "violet",
  mixed: "violet",
  supported: "champagne",
  contradicted: "warning",
};

export function StateBadge({ state }: { state: ProofState }) {
  const { t } = useLocale();
  return (
    <Pill tone={STATE_TONE[state]} data-testid={`state-${state}`}>
      {t(`pf.state.${state}` as const)}
    </Pill>
  );
}

const SIGNAL_TONE = { supports: "champagne", neutral: "neutral", contradicts: "warning" } as const;

export function SignalBadge({ signal }: { signal: "supports" | "neutral" | "contradicts" }) {
  const { t } = useLocale();
  return <Pill tone={SIGNAL_TONE[signal]}>{t(`pf.signal.${signal}` as const)}</Pill>;
}

/** "Why is it in this state?" — one plain sentence from the deterministic reason. */
export function useReasonText() {
  const { td } = useLocale();
  return (reason: { code: string; params: Record<string, number> }) =>
    td(`pf.reason.${reason.code}` as MessageKey, reason.params, reason.code);
}

export function formatDate(iso: string, locale: "en" | "hi"): string {
  try {
    return new Intl.DateTimeFormat(locale === "hi" ? "hi-IN" : "en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}
