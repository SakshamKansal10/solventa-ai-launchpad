import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  ExternalLink,
  FlaskConical,
  Flame,
  Package,
  TrendingUp,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";

import { EconomicsTab } from "@/components/founder/EconomicsTab";
import { FIT_ICONS } from "@/components/founder/dashboard/fit-constants";
import { FitPips } from "@/components/founder/dashboard/fit-visual";
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

      <HeaderBlock dto={dto} title={brief.title} />

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
          className="h-auto w-full justify-start gap-1 overflow-x-auto rounded-2xl bg-sol-ivory p-1.5 sm:w-fit"
        >
          {TABS.map((key) => (
            <TabsTrigger
              key={key}
              value={key}
              data-testid={`tab-${key}`}
              className="min-h-11 rounded-xl px-5 text-[1rem] font-semibold text-sol-secondary data-[state=active]:bg-sol-surface data-[state=active]:text-sol-violet-deep data-[state=active]:shadow-sm"
            >
              {t(`opp.tab.${key}` as const)}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview" className="mt-8">
          <Overview detail={detail} />
        </TabsContent>
        <TabsContent value="fit" className="mt-8">
          <FounderFit dto={dto} detail={detail} />
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
      {tiles.map((tile, i) => {
        const Icon = tile.icon;
        // A headline that fell back to its own full sentence (older rows) must not be
        // shown twice — the sentence is only offered when it adds something.
        const more = tile.sentence && tile.sentence !== tile.headline;
        return (
          <li key={tile.key} className="relative">
            <Card className="flex h-full flex-col gap-4 p-6" data-testid={`block-${tile.key}`}>
              <div className="flex items-center justify-between gap-3">
                <span className="flex size-12 items-center justify-center rounded-2xl bg-sol-champagne-soft text-sol-champagne-deep">
                  <Icon className="size-6" aria-hidden="true" />
                </span>
                <span
                  className="flex size-8 items-center justify-center rounded-full bg-sol-violet-soft font-display text-[1rem] font-semibold text-sol-violet-deep"
                  aria-hidden="true"
                >
                  {i + 1}
                </span>
              </div>
              <div>
                <p className="text-[0.875rem] font-bold uppercase tracking-[0.1em] text-sol-champagne-deep">
                  {tile.label}
                </p>
                <p
                  className={cn(
                    "mt-1.5 font-display font-semibold text-sol-ink",
                    // A headline that is really a sentence (the first test, the growth path)
                    // is set smaller so it doesn't swamp its tile.
                    tile.headline.length > 70
                      ? "text-[1.1875rem] leading-snug"
                      : "text-[1.5rem] leading-[1.2]",
                  )}
                >
                  {tile.headline}
                </p>
              </div>
              {more && (
                <details className="group mt-auto">
                  <summary className="flex min-h-10 w-fit cursor-pointer list-none items-center gap-1.5 rounded-lg text-[0.9375rem] font-semibold text-sol-violet-deep outline-none focus-visible:ring-2 focus-visible:ring-sol-violet/50 [&::-webkit-details-marker]:hidden">
                    <ChevronDown
                      className="size-4 transition-transform duration-200 group-open:rotate-180"
                      aria-hidden="true"
                    />
                    {t("opp.ov.detail")}
                  </summary>
                  <p className="mt-2 text-[1.0625rem] leading-relaxed text-sol-secondary">
                    {tile.sentence}
                  </p>
                </details>
              )}
            </Card>
            {/* The flow arrow between neighbouring tiles (three to a row). */}
            {i % 3 !== 2 && i < tiles.length - 1 && (
              <span
                aria-hidden="true"
                className="absolute -right-[1.65rem] top-1/2 z-10 hidden size-8 -translate-y-1/2 items-center justify-center rounded-full border border-sol-border bg-sol-surface text-sol-violet shadow-sm xl:flex"
              >
                <ArrowRight className="size-4" />
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}

function FounderFit({
  dto,
  detail,
}: {
  dto: OpportunityDetailDTO;
  detail: OpportunityDisplayDetail;
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

  return (
    <div className="flex flex-col gap-8" data-testid="founder-fit">
      <div className="flex flex-col gap-3">
        <Eyebrow>{t("opp.fit.overall")}</Eyebrow>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
          <p
            className="font-display text-[clamp(2rem,1.6rem+1.6vw,2.75rem)] font-semibold leading-none text-sol-ink"
            data-testid="fit-overall"
          >
            {t(`fit.overall.${matrix.overall}` as const)}
          </p>
          <FitPips status={matrix.overall} pipClassName="h-3.5 w-10" />
        </div>
        <p className="sol-body sol-prose text-sol-secondary">
          {t(`fit.overallBody.${matrix.overall}` as const)}
        </p>
      </div>

      <ul className="flex flex-col gap-3">
        {matrix.rows.map((row) => (
          <li key={row.key} data-testid={`fit-row-${row.key}`}>
            <Card className="flex flex-col gap-3 p-5 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
              <div className="flex min-w-0 items-start gap-4 sm:w-1/3">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-sol-champagne-soft text-sol-champagne-deep">
                  {(() => {
                    const Icon = FIT_ICONS[row.key];
                    return <Icon className="size-5" aria-hidden="true" />;
                  })()}
                </span>
                <div className="min-w-0">
                  <p className="text-[1.125rem] font-semibold text-sol-ink">
                    {t(`fit.row.${row.key}` as const)}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    <FitPips status={row.status} />
                    <FitStatusPill status={row.status} />
                  </div>
                </div>
              </div>
              <p className="text-[1.0625rem] leading-relaxed text-sol-ink sm:w-2/3">
                {reasonText(row.reason, dto.fit.currency)}
              </p>
            </Card>
          </li>
        ))}
      </ul>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="p-6">
          <h3 className="sol-h3">{t("opp.fit.advantages")}</h3>
          <ul className="mt-4 flex flex-col gap-3">
            {advantages.map((a) => (
              <li key={a} className="flex gap-3 text-[1.0625rem] leading-snug text-sol-ink">
                <span
                  className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-sol-champagne-soft text-sol-champagne-deep"
                  aria-hidden="true"
                >
                  <Check className="size-3.5" strokeWidth={3} />
                </span>
                {a}
              </li>
            ))}
          </ul>
        </Card>
        <Card className="p-6">
          <h3 className="sol-h3">{t("opp.fit.gaps")}</h3>
          {gaps.length === 0 ? (
            <p className="mt-4 text-[1.0625rem] text-sol-secondary">{t("opp.fit.noGaps")}</p>
          ) : (
            <ul className="mt-4 flex flex-col gap-3">
              {gaps.map((g) => (
                <li key={g} className="flex gap-3 text-[1.0625rem] leading-snug text-sol-ink">
                  <span
                    className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-sol-warning-soft text-sol-warning"
                    aria-hidden="true"
                  >
                    <ArrowUpRight className="size-3.5" strokeWidth={3} />
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
