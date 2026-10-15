import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useId, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import {
  ArrowLeft,
  ArrowRight,
  CalendarCheck,
  Check,
  ChevronDown,
  ExternalLink,
  FlaskConical,
  Flame,
  Minus,
  Package,
  Star,
  TrendingUp,
  TriangleAlert,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";

import { EconomicsTab } from "@/components/founder/EconomicsTab";
import { FIT_ICONS } from "@/components/founder/dashboard/fit-constants";
import { FitPill } from "@/components/founder/OpportunityCards";
import { FitStatusPill, useFitReasonText } from "@/components/founder/fit";
import {
  Button,
  Card,
  ErrorPanel,
  Eyebrow,
  LinkButton,
  PageSkeleton,
  Pill,
} from "@/components/founder/ui";
import {
  chooseDirection,
  getOpportunityDetail,
  refreshMarketEvidence,
  type OpportunityDetailDTO,
} from "@/lib/actions/opportunities";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { qk, useInvalidateFounder } from "@/lib/queries";
import { useTranslatedEntity, type OpportunityOverlay } from "@/lib/use-translation";
import type { OpportunityDisplayDetail } from "@/lib/opportunity-display";
import { cn } from "@/lib/utils";

const TABS = ["overview", "fit", "market", "economics", "proof"] as const;
type Tab = (typeof TABS)[number];

export const Route = createFileRoute("/dashboard/opportunities/$id")({
  validateSearch: z.object({ tab: z.enum(TABS).optional() }),
  component: OpportunityPage,
  head: () => ({
    meta: [{ title: "Opportunity — Solventia" }, { name: "robots", content: "noindex" }],
  }),
});

function OpportunityPage() {
  const { id } = Route.useParams();
  const { tab = "overview" } = Route.useSearch();
  const navigate = useNavigate();
  const { t } = useLocale();

  const query = useQuery({
    queryKey: qk.opportunity(id),
    queryFn: () => getOpportunityDetail({ data: { id } }),
    staleTime: 15_000,
  });
  const overlay = useTranslatedEntity<OpportunityOverlay>("opportunity", id);

  if (query.isPending) return <PageSkeleton label={t("shell.skeleton.loading")} />;
  if (query.isError || !query.data) {
    return <ErrorPanel onRetry={() => void query.refetch()} retrying={query.isFetching} />;
  }
  const dto = query.data;
  const brief = {
    ...dto.brief,
    title: overlay.data?.title ?? dto.brief.title,
  };
  const detail: OpportunityDisplayDetail = { ...dto.detail, ...(overlay.data?.detail ?? {}) };

  return (
    <div className="flex flex-col gap-8" data-testid="opportunity-page">
      <Link
        to="/dashboard/opportunities"
        className="inline-flex min-h-10 w-fit items-center gap-2 text-[1rem] font-semibold text-sol-violet-deep hover:underline"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        {t("opp.back")}
      </Link>

      {tab === "fit" ? (
        <header className="flex flex-col gap-2">
          <h1 className="sol-page-title">{t("opp.tab.fit")}</h1>
          <p className="sol-body text-sol-secondary">
            {t("opp.fit.subtitle", { title: brief.title })}
          </p>
        </header>
      ) : (
        <HeaderBlock dto={dto} title={brief.title} />
      )}

      <Tabs
        value={tab}
        onValueChange={(next) =>
          navigate({
            to: "/dashboard/opportunities/$id",
            params: { id },
            search: { tab: next as Tab },
            replace: true,
          })
        }
      >
        <TabsList
          aria-label={t("opp.tabs.aria")}
          className="h-auto w-full justify-start gap-1 overflow-x-auto rounded-2xl border border-sol-border bg-sol-surface p-1.5 sm:w-fit"
        >
          {TABS.map((key) => (
            <TabsTrigger
              key={key}
              value={key}
              data-testid={`tab-${key}`}
              className="min-h-11 rounded-xl px-5 text-[1rem] font-semibold text-sol-secondary transition-colors duration-200 data-[state=active]:bg-sol-violet-soft data-[state=active]:text-sol-violet-deep"
            >
              {t(`opp.tab.${key}` as const)}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview" className="mt-8">
          <Overview detail={detail} />
        </TabsContent>
        <TabsContent value="fit" className="mt-8">
          <FounderFit dto={dto} detail={detail} title={brief.title} />
        </TabsContent>
        <TabsContent value="market" className="mt-8">
          <Market dto={dto} opportunityId={id} />
        </TabsContent>
        <TabsContent value="economics" className="mt-8">
          <EconomicsTab opportunityId={id} />
        </TabsContent>
        <TabsContent value="proof" className="mt-8">
          <ProofTab dto={dto} opportunityId={id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function HeaderBlock({ dto, title }: { dto: OpportunityDetailDTO; title: string }) {
  const { t } = useLocale();
  const navigate = useNavigate();
  const invalidate = useInvalidateFounder();
  const choose = useMutation({
    mutationFn: () => chooseDirection({ data: { opportunityId: dto.brief.id } }),
    onSuccess: async () => {
      await invalidate();
      toast.success(t("cc.chosen.toast"));
    },
    onError: (err) => {
      console.error("[opportunity] choose failed:", err);
      toast.error(t("cc.chosen.error"));
    },
  });

  return (
    <header className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-2.5">
        {dto.isSelected ? (
          <Pill tone="violet">{t("opp.status.selected")}</Pill>
        ) : (
          <FitPill fit={dto.brief.fit} />
        )}
        {!dto.isCurrentConsultation && <Pill tone="neutral">{t("opp.status.previous")}</Pill>}
      </div>
      <h1 className="sol-page-title max-w-[26ch]" data-testid="opportunity-title">
        {title}
      </h1>
      <div className="flex flex-wrap gap-3">
        {dto.isSelected ? (
          dto.roadmapStatus === "active" || dto.roadmapStatus === "completed" ? (
            <LinkButton to="/dashboard/roadmap" variant="primary" size="lg">
              {t("opp.openRoadmap")}
            </LinkButton>
          ) : (
            <Button
              size="lg"
              onClick={() =>
                navigate({
                  to: "/dashboard/roadmap/building",
                  search: { opportunityId: dto.brief.id },
                })
              }
              data-testid="build-roadmap"
            >
              {dto.roadmapStatus === "archived" ? t("cc.b.resumeCta") : t("cc.b.buildCta")}
            </Button>
          )
        ) : dto.isCurrentConsultation ? (
          <Button
            size="lg"
            onClick={() => choose.mutate()}
            loading={choose.isPending}
            data-testid="choose-direction"
          >
            {t("cc.chooseDirection")}
          </Button>
        ) : (
          <p className="text-[1.0625rem] text-sol-secondary sol-prose">{t("opp.earlierNote")}</p>
        )}
        {!dto.isCurrentConsultation && (
          <LinkButton to="/dashboard/history" variant="secondary" size="lg">
            {t("cc.earlier.history")}
          </LinkButton>
        )}
      </div>
    </header>
  );
}

/** The whole business as six connected tiles — customer, pain, product, revenue,
 * first test, growth. Each shows only its one-line headline; the longer
 * explanation is one tap away, so the page reads in ten seconds. */
function Overview({ detail }: { detail: OpportunityDisplayDetail }) {
  const { t } = useLocale();
  const tiles: {
    key: string;
    icon: LucideIcon;
    label: string;
    headline: string;
    sentence: string;
  }[] = [
    {
      key: "customer",
      icon: Users,
      label: t("opp.ov.customer"),
      headline: detail.customerHeadline,
      sentence: detail.customer,
    },
    {
      key: "pain",
      icon: Flame,
      label: t("opp.ov.pain"),
      headline: detail.problemHeadline,
      sentence: detail.problem,
    },
    {
      key: "product",
      icon: Package,
      label: t("opp.ov.product"),
      headline: detail.solutionHeadline,
      sentence: detail.solution,
    },
    {
      key: "revenue",
      icon: Wallet,
      label: t("opp.ov.revenue"),
      headline: detail.moneyHeadline,
      sentence: detail.businessModel,
    },
    {
      key: "wedge",
      icon: FlaskConical,
      label: t("opp.ov.wedge"),
      headline: detail.firstExperiment,
      sentence: "",
    },
    {
      key: "scale",
      icon: TrendingUp,
      label: t("opp.ov.scale"),
      headline: detail.revenuePath,
      sentence: "",
    },
  ];
  return (
    <ol className="grid gap-5 md:grid-cols-2 xl:grid-cols-3" data-testid="overview-flow">
      {tiles.map((tile, i) => (
        <li key={tile.key} className="relative">
          <OverviewTile tile={tile} step={i + 1} />
          {/* The flow arrow between neighbouring tiles (three to a row). */}
          {i % 3 !== 2 && i < tiles.length - 1 && (
            <span
              aria-hidden="true"
              className="absolute -right-[1.65rem] top-1/2 z-10 hidden size-7 -translate-y-1/2 items-center justify-center rounded-full border border-sol-border bg-sol-surface text-sol-violet xl:flex"
            >
              <ArrowRight className="size-3.5" />
            </span>
          )}
        </li>
      ))}
    </ol>
  );
}

function OverviewTile({
  tile,
  step,
}: {
  tile: { key: string; icon: LucideIcon; label: string; headline: string; sentence: string };
  step: number;
}) {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const Icon = tile.icon;
  const panelId = useId();
  // A headline that fell back to its own full sentence (older rows) must not be
  // shown twice — the sentence is only offered when it adds something.
  const more = tile.sentence && tile.sentence !== tile.headline;
  return (
    <Card className="sol-lift flex h-full flex-col gap-3 p-5" data-testid={`block-${tile.key}`}>
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-xl bg-sol-violet-soft text-sol-violet-deep">
            <Icon className="size-[18px]" aria-hidden="true" />
          </span>
          <span className="text-[0.875rem] font-bold uppercase tracking-[0.1em] text-sol-champagne-deep">
            {tile.label}
          </span>
        </span>
        <span
          className="flex size-7 items-center justify-center rounded-full border border-sol-border font-display text-[0.9375rem] font-semibold text-sol-secondary"
          aria-hidden="true"
        >
          {step}
        </span>
      </div>
      <p
        className={cn(
          "font-display font-semibold text-sol-ink",
          // A headline that is really a sentence (the first test, the growth path)
          // is set smaller so it doesn't swamp its tile.
          tile.headline.length > 70
            ? "line-clamp-3 text-[1.0625rem] leading-snug"
            : "text-[1.3125rem] leading-[1.2]",
        )}
      >
        {tile.headline}
      </p>
      {more && (
        <div className="mt-auto">
          <button
            type="button"
            aria-expanded={open}
            aria-controls={panelId}
            onClick={() => setOpen((v) => !v)}
            className="flex min-h-10 w-fit cursor-pointer items-center gap-1.5 rounded-lg text-[0.9375rem] font-semibold text-sol-violet-deep outline-none transition-colors hover:text-sol-violet focus-visible:ring-2 focus-visible:ring-sol-violet/50"
          >
            <ChevronDown
              className={cn("size-4 transition-transform duration-200", open && "rotate-180")}
              aria-hidden="true"
            />
            {t("opp.ov.detail")}
          </button>
          <div
            id={panelId}
            className={cn(
              "grid transition-[grid-template-rows,opacity] duration-200 ease-[var(--sol-ease)]",
              open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
            )}
          >
            <p
              className="overflow-hidden text-[1rem] leading-relaxed text-sol-secondary"
              inert={!open}
            >
              <span className="block pt-2">{tile.sentence}</span>
            </p>
          </div>
        </div>
      )}
    </Card>
  );
}

function FounderFit({
  dto,
  detail,
  title,
}: {
  dto: OpportunityDetailDTO;
  detail: OpportunityDisplayDetail;
  title: string;
}) {
  const { t } = useLocale();
  const reasonText = useFitReasonText();
  const { matrix } = dto.fit;
  const advantages = (
    detail.whyThisFounder.length > 0 ? detail.whyThisFounder : dto.fit.advantages
  ).slice(0, 4);
  const gaps = [
    ...dto.fit.matrix.rows
      .filter((r) => r.status !== "strong")
      .map((r) => reasonText(r.reason, dto.fit.currency)),
    ...detail.skillsToLearn.map((s) => t("opp.fit.learn", { skill: s })),
  ].slice(0, 3);
  // Next steps are the gaps, to be worked through; ticks are a local aid only.
  const [done, setDone] = useState<Set<string>>(new Set());
  const toggle = (g: string) =>
    setDone((prev) => {
      const next = new Set(prev);
      if (!next.delete(g)) next.add(g);
      return next;
    });

  return (
    <div className="flex flex-col gap-6" data-testid="founder-fit">
      <Card className="flex flex-col gap-6 border-sol-violet/30 bg-sol-violet-ultralight p-6 md:flex-row md:items-center md:justify-between md:p-7">
        <div className="flex min-w-0 flex-col gap-3">
          <Eyebrow>{t("opp.fit.overall")}</Eyebrow>
          <p
            className="font-display text-[clamp(2rem,1.6rem+1.6vw,2.75rem)] font-semibold leading-none text-sol-ink"
            data-testid="fit-overall"
          >
            {t(`fit.overall.${matrix.overall}` as const)}
          </p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <Pill tone="champagne">
              {t("opp.fit.counts", { s: advantages.length, g: gaps.length })}
            </Pill>
          </div>
          <p className="sol-prose text-[1rem] text-sol-secondary">
            {t(`fit.overallBody.${matrix.overall}` as const)}
          </p>
        </div>
        <div className="flex min-w-0 flex-col gap-2 md:max-w-xs md:text-left">
          <div className="flex flex-wrap items-center gap-2.5">
            <p className="sol-h3" data-testid="opportunity-title">
              {title}
            </p>
            {dto.isSelected && <Pill tone="violet">{t("opp.status.selected")}</Pill>}
          </div>
          {dto.brief.oneLiner && (
            <p className="line-clamp-3 text-[0.9375rem] leading-snug text-sol-secondary">
              {dto.brief.oneLiner}
            </p>
          )}
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-3">
        <ul className="grid gap-5 sm:grid-cols-2 lg:col-span-2">
          {matrix.rows.map((row) => {
            const Icon = FIT_ICONS[row.key];
            return (
              <li key={row.key} data-testid={`fit-row-${row.key}`}>
                <Card className="sol-lift flex h-full gap-4 p-5">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-sol-champagne-soft text-sol-champagne-deep">
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <p className="text-[1.0625rem] font-semibold text-sol-ink">
                        {t(`fit.row.${row.key}` as const)}
                      </p>
                      <FitStatusPill status={row.status} />
                    </div>
                    <p className="mt-2 text-[0.9375rem] leading-snug text-sol-secondary">
                      {reasonText(row.reason, dto.fit.currency)}
                    </p>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>

        <Card className="flex flex-col gap-3 p-5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="sol-h3 flex items-center gap-2.5">
              <CalendarCheck className="size-5 text-sol-violet" aria-hidden="true" />
              {t("opp.fit.nextSteps")}
            </h3>
            {gaps.length > 0 && (
              <span className="rounded-full bg-sol-violet-soft px-2.5 py-0.5 text-[0.875rem] font-semibold text-sol-violet-deep">
                {done.size}/{gaps.length}
              </span>
            )}
          </div>
          <p className="text-[0.9375rem] text-sol-secondary">{t("opp.fit.nextStepsBody")}</p>
          {gaps.length === 0 ? (
            <p className="text-[1rem] text-sol-secondary">{t("opp.fit.noGaps")}</p>
          ) : (
            <ul className="flex flex-col divide-y divide-sol-border">
              {gaps.map((g) => (
                <li key={g}>
                  <label className="flex min-h-12 cursor-pointer items-start gap-3 py-3 text-[0.9375rem] leading-snug text-sol-ink">
                    <input
                      type="checkbox"
                      checked={done.has(g)}
                      onChange={() => toggle(g)}
                      className="mt-0.5 size-5 shrink-0 accent-[var(--sol-violet)]"
                    />
                    <span className={cn(done.has(g) && "text-sol-secondary line-through")}>
                      {g}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <Card className="p-6">
          <h3 className="sol-h3 flex items-center justify-between gap-3">
            <span className="flex items-center gap-3">
              <Star className="size-5 text-sol-champagne-deep" aria-hidden="true" />
              {t("opp.fit.advantages")}
            </span>
            <span className="rounded-full bg-sol-violet-soft px-2.5 py-0.5 font-sans text-[0.875rem] font-semibold text-sol-violet-deep">
              {advantages.length}
            </span>
          </h3>
          <ul className="mt-4 flex flex-col gap-3">
            {advantages.map((a) => (
              <li key={a} className="flex gap-3 text-[1rem] leading-snug text-sol-ink">
                <span
                  className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-sol-champagne-deep text-white"
                  aria-hidden="true"
                >
                  <Check className="size-3" strokeWidth={3} />
                </span>
                {a}
              </li>
            ))}
          </ul>
        </Card>
        <Card className="p-6">
          <h3 className="sol-h3 flex items-center justify-between gap-3">
            <span className="flex items-center gap-3">
              <TriangleAlert className="size-5 text-sol-warning" aria-hidden="true" />
              {t("opp.fit.gaps")}
            </span>
            <span className="rounded-full bg-sol-violet-soft px-2.5 py-0.5 font-sans text-[0.875rem] font-semibold text-sol-violet-deep">
              {gaps.length}
            </span>
          </h3>
          {gaps.length === 0 ? (
            <p className="mt-4 text-[1rem] text-sol-secondary">{t("opp.fit.noGaps")}</p>
          ) : (
            <ul className="mt-4 flex flex-col gap-3">
              {gaps.map((g) => (
                <li key={g} className="flex gap-3 text-[1rem] leading-snug text-sol-ink">
                  <span
                    className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-sol-warning text-white"
                    aria-hidden="true"
                  >
                    <Minus className="size-3" strokeWidth={3} />
                  </span>
                  {g}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

function Market({ dto, opportunityId }: { dto: OpportunityDetailDTO; opportunityId: string }) {
  const { t } = useLocale();
  const invalidate = useInvalidateFounder();
  const research = useMutation({
    mutationFn: () => refreshMarketEvidence({ data: { opportunityId } }),
    onSuccess: async (res) => {
      await invalidate();
      toast.success(t("opp.market.found", { n: res.count }));
    },
    onError: (err) => {
      console.error("[opportunity] market research failed:", err);
      toast.error(t("opp.market.error"));
    },
  });
  const hasSources = dto.sources.length > 0;

  return (
    <div className="flex flex-col gap-8" data-testid="market-tab">
      <div className="flex flex-col gap-2">
        <h2 className="sol-h2">
          {hasSources ? t("opp.market.sourcesTitle") : t("opp.market.none")}
        </h2>
        {!hasSources && (
          <p className="sol-body sol-prose text-sol-secondary">{t("opp.market.noneBody")}</p>
        )}
      </div>

      {hasSources && (
        <ul className="flex flex-col gap-3">
          {dto.sources.map((s) => (
            <li key={s.id}>
              <Card className="flex flex-col gap-2 p-5">
                <p className="text-[1.0625rem] leading-snug text-sol-ink">{s.claim}</p>
                <div className="flex flex-wrap items-center gap-3">
                  <Pill tone="neutral">{t(`opp.market.label.${s.label}` as const)}</Pill>
                  {s.sourceUrl && (
                    <a
                      href={s.sourceUrl}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="inline-flex items-center gap-1.5 text-[0.9375rem] font-semibold text-sol-violet-deep hover:underline"
                    >
                      {s.sourceTitle ?? s.sourceUrl}
                      <ExternalLink className="size-3.5" aria-hidden="true" />
                    </a>
                  )}
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <Card className="flex flex-col gap-4 p-6">
        <h3 className="sol-h3">{t("opp.market.learnTitle")}</h3>
        <ul className="flex flex-col gap-2.5">
          {(["q1", "q2", "q3"] as const).map((q) => (
            <li key={q} className="flex gap-3 text-[1.0625rem] leading-snug text-sol-ink">
              <span
                className="mt-2 size-1.5 shrink-0 rounded-full bg-sol-violet"
                aria-hidden="true"
              />
              {t(`opp.market.${q}` as const)}
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap gap-3">
          <LinkButton
            to="/dashboard/proof"
            search={{ opportunity: opportunityId }}
            variant="primary"
            size="lg"
            data-testid="start-validation"
          >
            {t("opp.market.start")}
          </LinkButton>
          <Button
            variant="secondary"
            size="lg"
            onClick={() => research.mutate()}
            loading={research.isPending}
            data-testid="look-for-sources"
          >
            {hasSources ? t("opp.market.refresh") : t("opp.market.lookFor")}
          </Button>
        </div>
        <p className="text-[0.9375rem] text-sol-secondary">{t("opp.market.sourcesNote")}</p>
      </Card>
    </div>
  );
}

function ProofTab({ dto, opportunityId }: { dto: OpportunityDetailDTO; opportunityId: string }) {
  const { t } = useLocale();
  const { proof } = dto;
  const supported = proof.counts.supported;
  const untested = proof.counts.untested;
  return (
    <Card className="flex flex-col gap-5 p-6 sm:p-8" data-testid="proof-tab">
      {!proof.available ? (
        <p className="sol-body text-sol-secondary">{t("opp.proof.unavailable")}</p>
      ) : proof.total === 0 ? (
        <>
          <h2 className="sol-h2">{t("opp.proof.noneTitle")}</h2>
          <p className="sol-body sol-prose text-sol-secondary">{t("opp.proof.noneBody")}</p>
        </>
      ) : (
        <>
          <h2 className="sol-h2">{t("opp.proof.assumptions", { n: proof.total })}</h2>
          <p className="text-[1.25rem] leading-snug text-sol-ink">
            {t("opp.proof.summary", { supported, untested })}
          </p>
        </>
      )}
      <div>
        <LinkButton
          to="/dashboard/proof"
          search={{ opportunity: opportunityId }}
          variant="primary"
          size="lg"
          data-testid="open-proof-workspace"
        >
          {t("opp.proof.open")}
        </LinkButton>
      </div>
    </Card>
  );
}
