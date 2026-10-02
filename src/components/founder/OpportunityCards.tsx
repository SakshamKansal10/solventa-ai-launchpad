import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { Flame, Rocket, Sparkles, Users, type LucideIcon } from "lucide-react";

import type { OpportunityBrief } from "@/lib/actions/founder";
import { getOpportunityDetail } from "@/lib/actions/opportunities";
import type { FitStatus } from "@/lib/fit/matrix";
import type { MessageKey } from "@/lib/i18n";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { qk } from "@/lib/queries";
import { useTranslatedBrief } from "@/lib/use-translation";
import { cn } from "@/lib/utils";
import { Fact, LinkButton, Pill, Button, Skeleton } from "./ui";

const PIPS: Record<FitStatus, number> = { strong: 3, moderate: 2, conditional: 1 };
const PIP_TONE: Record<FitStatus, string> = {
  strong: "bg-sol-champagne-deep",
  moderate: "bg-sol-violet",
  conditional: "bg-sol-border-strong",
};

/** Customer → problem → product, as three connected stops rather than three
 * paragraphs. Each is clamped to a few lines; the full text is one click away. */
function BriefChain({ brief }: { brief: OpportunityBrief }) {
  const { t } = useLocale();
  const all: { icon: LucideIcon; label: string; text: string | null }[] = [
    { icon: Users, label: t("opp.fact.customer"), text: brief.customer },
    { icon: Flame, label: t("opp.fact.problem"), text: brief.problem },
    { icon: Rocket, label: t("opp.fact.product"), text: brief.product },
  ];
  const nodes = all.filter((n): n is { icon: LucideIcon; label: string; text: string } =>
    Boolean(n.text),
  );
  return (
    <ol className="relative grid gap-5 md:grid-cols-3 md:gap-4" data-testid="brief-chain">
      <motion.span
        aria-hidden="true"
        className="absolute left-[17%] right-[17%] top-[27px] hidden h-0.5 origin-left rounded-full bg-gradient-to-r from-sol-champagne via-sol-violet to-sol-champagne md:block"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.7, delay: 0.15 }}
      />
      {nodes.map((n, i) => (
        <motion.li
          key={n.label}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 + i * 0.1 }}
          className="relative flex gap-4 md:flex-col md:items-center md:text-center"
        >
          <span className="relative z-10 flex size-[54px] shrink-0 items-center justify-center rounded-full border border-sol-champagne/60 bg-sol-surface shadow-[0_8px_20px_rgba(23,26,39,0.08)]">
            <n.icon className="size-6 text-sol-violet-deep" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-[0.8125rem] font-bold uppercase tracking-[0.1em] text-sol-champagne-deep">
              {n.label}
            </p>
            <p className="mt-1 line-clamp-4 text-[1.0625rem] leading-snug text-sol-ink">{n.text}</p>
          </div>
        </motion.li>
      ))}
    </ol>
  );
}

/** The founder's four real fit rows (capability, resources, access, ambition),
 * each as a labelled categorical bar — never a number. */
function FlagshipFit({ opportunityId }: { opportunityId: string }) {
  const { t } = useLocale();
  const detail = useQuery({
    queryKey: qk.opportunity(opportunityId),
    queryFn: () => getOpportunityDetail({ data: { id: opportunityId } }),
    staleTime: 30_000,
  });
  if (detail.isPending) return <Skeleton className="h-24" />;
  const matrix = detail.data?.fit.matrix;
  if (!matrix) return null;
  return (
    <ul className="grid gap-2.5 sm:grid-cols-2" data-testid="flagship-fit">
      {matrix.rows.map((row) => (
        <li
          key={row.key}
          className="flex items-center justify-between gap-3 rounded-xl border border-sol-border bg-sol-pearl px-4 py-2.5"
        >
          <span className="text-[0.9375rem] font-semibold text-sol-ink">
            {t(`fit.row.${row.key}` as MessageKey)}
          </span>
          <span className="flex items-center gap-2.5">
            <span className="flex gap-1" aria-hidden="true">
              {[1, 2, 3].map((n) => (
                <span
                  key={n}
                  className={cn(
                    "h-2 w-5 rounded-full",
                    n <= PIPS[row.status] ? PIP_TONE[row.status] : "bg-sol-ivory-depth",
                  )}
                />
              ))}
            </span>
            <span className="min-w-[5.25rem] text-right text-[0.875rem] font-semibold text-sol-secondary">
              {t(`fit.status.${row.status}` as MessageKey)}
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}

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
export function BriefFacts({
  brief,
  columns = 2,
  limit,
}: {
  brief: OpportunityBrief;
  columns?: 2 | 3;
  /** Show only the first N facts (a compact summary). */
  limit?: number;
}) {
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
  ]
    .filter((i) => i.value)
    .slice(0, limit ?? 5);
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
      className="relative overflow-hidden rounded-[28px] border border-sol-champagne/55 bg-sol-surface p-6 shadow-[0_28px_70px_rgba(114,87,216,0.14)] sm:p-10"
      data-testid="flagship-card"
      aria-labelledby="flagship-title"
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 520px 300px at 92% -8%, rgba(114,87,216,0.1), transparent 70%), radial-gradient(ellipse 420px 260px at -4% 108%, rgba(195,160,100,0.14), transparent 70%)",
        }}
        aria-hidden="true"
      />
      <div
        className="absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-sol-violet to-sol-champagne"
        aria-hidden="true"
      />
      <div className="relative flex flex-wrap items-center justify-between gap-3">
        <p className="sol-eyebrow flex items-center gap-2">
          <Sparkles className="size-4 text-sol-champagne-deep" aria-hidden="true" />
          {t("cc.flagshipLabel")}
        </p>
        <FitPill fit={brief.fit} />
      </div>
      <h2
        id="flagship-title"
        className="relative mt-4 max-w-[24ch] font-display text-[clamp(2.25rem,1.7rem+2vw,3.25rem)] font-semibold leading-[1.06] text-sol-ink"
      >
        {brief.title}
      </h2>
      <p className="sol-body sol-prose relative mt-4 text-sol-secondary">{brief.oneLiner}</p>
      <div className="relative mt-9">
        <BriefChain brief={brief} />
      </div>
      <div className="relative mt-8">
        <FlagshipFit opportunityId={brief.id} />
      </div>
      {brief.whyFit[0] && (
        <p
          className="relative mt-6 rounded-2xl border-l-4 border-sol-champagne bg-sol-champagne-soft/50 px-5 py-4 text-[1.0625rem] leading-snug text-sol-ink"
          data-testid="flagship-why"
        >
          <span className="font-semibold">{t("opp.fact.whyFit")}: </span>
          {brief.whyFit[0]}
        </p>
      )}
      <div className="relative mt-9 flex flex-wrap items-center gap-3">
        {!readOnly && (
          <Button
            variant="primary"
            size="lg"
            onClick={onChoose}
            loading={choosing}
            disabled={disabled}
            data-testid="flagship-choose"
          >
            {t("cc.chooseDirection")}
          </Button>
        )}
        <LinkButton
          to="/dashboard/opportunities/$id"
          params={{ id: brief.id }}
          variant={readOnly ? "primary" : "secondary"}
          size="lg"
          data-testid="flagship-explore"
        >
          {t("cc.exploreDirection")}
        </LinkButton>
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
      <p className="line-clamp-3 text-[1rem] leading-relaxed text-sol-secondary">
        {brief.oneLiner}
      </p>
      <dl className="grid gap-4">
        {brief.customer && (
          <Fact label={t("opp.fact.customer")}>
            <span className="line-clamp-2">{brief.customer}</span>
          </Fact>
        )}
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
