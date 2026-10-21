import type { ReactNode } from "react";
import { motion } from "motion/react";
import {
  ArrowRight,
  Compass,
  Flame,
  GraduationCap,
  HeartPulse,
  Monitor,
  Newspaper,
  Package,
  Rocket,
  Sparkles,
  Store,
  Truck,
  Users,
  UtensilsCrossed,
  Wrench,
  type LucideIcon,
} from "lucide-react";

import type { OpportunityBrief } from "@/lib/actions/founder";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { useTranslatedBrief } from "@/lib/use-translation";
import { Fact, LinkButton, Pill, Button } from "./ui";

/** Customer → problem → product, as three connected stops rather than three
 * paragraphs. Each is clamped to a few lines; the full text is one click away. */
export function BriefChain({ brief }: { brief: OpportunityBrief }) {
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
    <ol className="relative grid gap-5 @2xl:grid-cols-3 md:gap-4" data-testid="brief-chain">
      <motion.span
        aria-hidden="true"
        className="absolute left-[17%] right-[17%] top-[27px] hidden h-0.5 origin-left rounded-full bg-gradient-to-r from-sol-champagne via-sol-cobalt to-sol-champagne md:block"
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
            <n.icon className="size-6 text-sol-cobalt-deep" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-[0.9375rem] font-bold uppercase tracking-[0.1em] text-sol-champagne-deep">
              {n.label}
            </p>
            <p className="mt-1 line-clamp-4 text-[1.0625rem] leading-snug text-sol-ink">{n.text}</p>
          </div>
        </motion.li>
      ))}
    </ol>
  );
}

/** One icon per KIND of direction, from its category — never the same icon for every idea. */
const CATEGORY_ICONS: [RegExp, LucideIcon][] = [
  [/newsletter|content|media|blog|video|podcast|course/i, Newspaper],
  [/tutor|education|teach|coaching|school|learning/i, GraduationCap],
  [/health|clinic|fitness|wellness|care/i, HeartPulse],
  [/food|restaurant|catering|bakery|kitchen|agri/i, UtensilsCrossed],
  [/delivery|logistic|transport|courier|supply|procure|broker|trading/i, Truck],
  [/digital|software|app|web|online|saas|tech/i, Monitor],
  [/product|template|goods|retail|e-?commerce|craft/i, Package],
  [/repair|install|maintenance|service/i, Wrench],
  [/shop|store|local/i, Store],
];

export function directionIcon(category: string | null | undefined, title = ""): LucideIcon {
  const text = `${category ?? ""} ${title}`;
  return CATEGORY_ICONS.find(([re]) => re.test(text))?.[1] ?? Compass;
}

export function FitPill({ fit }: { fit: OpportunityBrief["fit"] }) {
  const { t } = useLocale();
  const tone = fit === "strong" ? "champagne" : fit === "weak" ? "warning" : "neutral";
  return (
    <Pill tone={tone} className="shrink-0">
      {t(fit === "provisional" ? "fit2.labelShort.provisional" : (`fit2.label.${fit}` as const))}
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
          ? "grid gap-x-8 gap-y-6 @2xl:grid-cols-3"
          : "grid gap-x-8 gap-y-6 @2xl:grid-cols-2"
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

/** The Command Center's recommended direction: what it is, why it may fit, how it
 * would work — and one next step (review it), with a way to compare every direction.
 * Choosing happens after review, on the direction itself. */
export function FlagshipCard({
  brief: raw,
  compareCount,
}: {
  brief: OpportunityBrief;
  /** How many directions this consultation produced (for "Compare all N"). */
  compareCount: number;
}) {
  const { t } = useLocale();
  const brief = useTranslatedBrief(raw) ?? raw;
  return (
    <article
      className="relative overflow-hidden rounded-[28px] border border-sol-border bg-sol-surface p-6 shadow-[0_24px_60px_rgba(16,28,50,0.08)] sm:p-10"
      data-testid="flagship-card"
      aria-labelledby="flagship-title"
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 520px 300px at 92% -8%, rgba(49,94,219,0.1), transparent 70%), radial-gradient(ellipse 420px 260px at -4% 108%, rgba(195,160,100,0.14), transparent 70%)",
        }}
        aria-hidden="true"
      />
      <div
        className="absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-sol-cobalt to-sol-champagne"
        aria-hidden="true"
      />
      <div className="relative flex flex-wrap items-center justify-between gap-3">
        <p className="sol-eyebrow flex items-center gap-2">
          <Sparkles className="size-4 text-sol-champagne-deep" aria-hidden="true" />
          {t("cc2.recommended")}
        </p>
        <FitPill fit={brief.fit} />
      </div>
      {brief.fit === "provisional" && (
        <p
          className="relative mt-3 text-[0.9375rem] text-sol-secondary"
          data-testid="flagship-preliminary"
        >
          {t("cc2.preliminary")}
        </p>
      )}
      <h2
        id="flagship-title"
        className="relative mt-4 max-w-[24ch] font-display text-[clamp(2.25rem,1.7rem+2vw,3.25rem)] font-semibold leading-[1.06] text-sol-ink"
      >
        {brief.title}
      </h2>
      <div className="relative mt-9">
        <BriefChain brief={brief} />
      </div>
      {brief.whyFit.length > 0 && (
        <div className="relative mt-8" data-testid="flagship-why">
          <p className="text-[0.9375rem] font-semibold text-sol-secondary">{t("cc2.whyHeading")}</p>
          <ul className="mt-3 flex flex-col gap-2.5">
            {brief.whyFit.map((reason) => (
              <li key={reason} className="flex gap-3 text-[1.0625rem] leading-snug text-sol-ink">
                <span
                  className="mt-2 size-1.5 shrink-0 rounded-full bg-sol-champagne"
                  aria-hidden="true"
                />
                <span className="min-w-0">{reason}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="relative mt-9 flex flex-wrap items-center gap-3">
        <LinkButton
          to="/dashboard/opportunities/$id"
          params={{ id: brief.id }}
          variant="primary"
          size="lg"
          data-testid="flagship-explore"
        >
          {t("cc2.review")}
          <ArrowRight className="size-4" aria-hidden="true" />
        </LinkButton>
        {compareCount > 1 && (
          <LinkButton
            to="/dashboard/opportunities"
            hash="compare"
            variant="secondary"
            size="lg"
            data-testid="explore-more"
          >
            {t("cc2.compare", { n: compareCount })}
          </LinkButton>
        )}
      </div>
    </article>
  );
}

export function AlternativeCard({
  brief: raw,
  rank,
  onChoose,
  choosing,
  disabled,
  readOnly,
}: {
  brief: OpportunityBrief;
  /** Position among the directions (the flagship is 1). */
  rank?: number;
  onChoose: () => void;
  choosing: boolean;
  disabled: boolean;
  readOnly: boolean;
}) {
  const { t } = useLocale();
  const brief = useTranslatedBrief(raw) ?? raw;
  const lines: { icon: LucideIcon; label: string; text: string }[] = [];
  if (brief.customer)
    lines.push({ icon: Users, label: t("opp.fact.customer"), text: brief.customer });
  if (brief.problem) lines.push({ icon: Flame, label: t("opp.fact.problem"), text: brief.problem });
  return (
    <article
      className="sol-card flex flex-col gap-4 p-6"
      data-testid="alternative-card"
      aria-label={brief.title}
    >
      <div className="flex items-start gap-3">
        {rank != null && (
          <span
            className="flex size-8 shrink-0 items-center justify-center rounded-full bg-sol-ivory-depth font-display text-[1rem] font-semibold text-sol-secondary"
            aria-hidden="true"
          >
            {rank}
          </span>
        )}
        <h3 className="sol-h3 min-w-0 flex-1">{brief.title}</h3>
        <FitPill fit={brief.fit} />
      </div>
      <ul className="flex flex-col gap-3">
        {lines.map((l) => (
          <li key={l.label} className="flex items-start gap-3">
            <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-sol-champagne-soft text-sol-champagne-deep">
              <l.icon className="size-4" aria-hidden="true" />
            </span>
            <span className="line-clamp-2 min-w-0 text-[1rem] leading-snug text-sol-ink">
              <span className="sr-only">{l.label}: </span>
              {l.text}
            </span>
          </li>
        ))}
      </ul>
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
