import type { ReactNode } from "react";

import type { OpportunityBrief } from "@/lib/actions/founder";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { useTranslatedBrief } from "@/lib/use-translation";
import { Fact, LinkButton, Pill, Button } from "./ui";

export function FitPill({ fit }: { fit: OpportunityBrief["fit"] }) {
  const { t } = useLocale();
  const tone = fit === "strong" ? "champagne" : fit === "moderate" ? "violet" : "neutral";
  return (
    <Pill tone={tone} className="shrink-0">
      {t(`fit.${fit}` as const)}
    </Pill>
  );
}

/** The plain facts that answer "what is this, concretely?" — the same five on
 * every card, in the same order, in large type. */
export function BriefFacts({ brief, columns = 2 }: { brief: OpportunityBrief; columns?: 2 | 3 }) {
  const { t } = useLocale();
  const items: { label: string; value: ReactNode }[] = [
    { label: t("opp.fact.customer"), value: brief.customer },
    { label: t("opp.fact.problem"), value: brief.problem },
    { label: t("opp.fact.product"), value: brief.product },
    {
      label: t("opp.fact.whyFit"),
      value: brief.whyFit.length > 0 ? brief.whyFit[0] : null,
    },
    { label: t("opp.fact.scale"), value: brief.scalePath },
  ].filter((i) => i.value);
  return (
    <dl
      className={
        columns === 3
          ? "grid gap-x-8 gap-y-6 md:grid-cols-3"
          : "grid gap-x-8 gap-y-6 md:grid-cols-2"
      }
    >
      {items.map((i) => (
        <Fact key={i.label} label={i.label}>
          {i.value}
        </Fact>
      ))}
    </dl>
  );
}

export function FlagshipCard({
  brief: raw,
  onChoose,
  choosing,
  disabled,
  readOnly,
}: {
  brief: OpportunityBrief;
  onChoose: () => void;
  choosing: boolean;
  disabled: boolean;
  readOnly: boolean;
}) {
  const { t } = useLocale();
  const brief = useTranslatedBrief(raw) ?? raw;
  return (
    <article
      className="sol-card-feature relative overflow-hidden p-6 sm:p-10"
      data-testid="flagship-card"
      aria-labelledby="flagship-title"
    >
      <div className="absolute inset-y-0 left-0 w-1.5 bg-sol-violet" aria-hidden="true" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="sol-eyebrow">{t("cc.flagshipLabel")}</p>
        <FitPill fit={brief.fit} />
      </div>
      <h2
        id="flagship-title"
        className="mt-4 max-w-[24ch] font-display text-[clamp(2rem,1.6rem+1.6vw,2.75rem)] font-semibold leading-[1.08] text-sol-ink"
      >
        {brief.title}
      </h2>
      <p className="sol-body sol-prose mt-4 text-sol-secondary">{brief.oneLiner}</p>
      <div className="mt-8">
        <BriefFacts brief={brief} />
      </div>
      <div className="mt-9 flex flex-wrap items-center gap-3">
        <LinkButton
          to="/dashboard/opportunities/$id"
          params={{ id: brief.id }}
          variant="primary"
          size="lg"
          data-testid="flagship-explore"
        >
          {t("cc.exploreDirection")}
        </LinkButton>
        {!readOnly && (
          <Button
            variant="secondary"
            size="lg"
            onClick={onChoose}
            loading={choosing}
            disabled={disabled}
            data-testid="flagship-choose"
          >
            {t("cc.chooseDirection")}
          </Button>
        )}
      </div>
    </article>
  );
}

export function AlternativeCard({
  brief: raw,
  onChoose,
  choosing,
  disabled,
  readOnly,
}: {
  brief: OpportunityBrief;
  onChoose: () => void;
  choosing: boolean;
  disabled: boolean;
  readOnly: boolean;
}) {
  const { t } = useLocale();
  const brief = useTranslatedBrief(raw) ?? raw;
  return (
    <article
      className="sol-card flex flex-col gap-4 p-6"
      data-testid="alternative-card"
      aria-label={brief.title}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="sol-h3 min-w-0">{brief.title}</h3>
        <FitPill fit={brief.fit} />
      </div>
      <p className="text-[1rem] leading-relaxed text-sol-secondary">{brief.oneLiner}</p>
      <dl className="grid gap-4">
        {brief.customer && <Fact label={t("opp.fact.customer")}>{brief.customer}</Fact>}
        {brief.whyFit[0] && <Fact label={t("opp.fact.whyFit")}>{brief.whyFit[0]}</Fact>}
      </dl>
      <div className="mt-auto flex flex-wrap gap-3 pt-2">
        <LinkButton
          to="/dashboard/opportunities/$id"
          params={{ id: brief.id }}
          variant="secondary"
          size="sm"
        >
          {t("cc.explore")}
        </LinkButton>
        {!readOnly && (
          <Button
            variant="primary"
            size="sm"
            onClick={onChoose}
            loading={choosing}
            disabled={disabled}
          >
            {t("cc.choose")}
          </Button>
        )}
      </div>
    </article>
  );
}
