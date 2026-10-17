import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";
import { ArrowLeft, ExternalLink, Loader2 } from "lucide-react";

import { EconomicsTab } from "@/components/founder/EconomicsTab";
import { useAskSol } from "@/components/founder/DashboardShell";
import { useFitReasonText } from "@/components/founder/fit";
import { ErrorPanel, PageSkeleton } from "@/components/founder/ui";
import { BusinessGraphic } from "@/components/os/graphics";
import { modelKindOf, type GraphicNode } from "@/components/os/model";
import {
  ActionArrow,
  FlashCard,
  OsDisplay,
  OsEyebrow,
  OsFrame,
  OsLead,
  OsPoints,
  primaryActionClass,
  textActionClass,
} from "@/components/os/os";
import {
  chooseDirection,
  getOpportunityDetail,
  refreshMarketEvidence,
  type OpportunityDetailDTO,
} from "@/lib/actions/opportunities";
import type { FitStatus } from "@/lib/fit/matrix";
import type { MessageKey } from "@/lib/i18n";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import type { OpportunityDisplayDetail } from "@/lib/opportunity-display";
import { qk, useInvalidateFounder } from "@/lib/queries";
import { useTranslatedEntity, type OpportunityOverlay } from "@/lib/use-translation";
import { cn } from "@/lib/utils";

/** The five sections — one question each. Older links (fit, market, economics, proof) land on
 * the section that now answers them. */
const SECTIONS = ["overview", "customer", "money", "offer", "risks"] as const;
type Section = (typeof SECTIONS)[number];
const LEGACY: Record<string, Section> = {
  fit: "overview",
  market: "customer",
  economics: "money",
  proof: "risks",
};
const SECTION_LABEL: Record<Section, MessageKey> = {
  overview: "os.opp.tab.overview",
  customer: "os.opp.tab.customer",
  money: "os.opp.tab.money",
  offer: "os.opp.tab.offer",
  risks: "os.opp.tab.risks",
};

export const Route = createFileRoute("/dashboard/opportunities/$id")({
  validateSearch: z.object({
    tab: z.enum([...SECTIONS, "fit", "market", "economics", "proof"]).optional(),
  }),
  component: OpportunityPage,
  head: () => ({
    meta: [{ title: "Opportunity — Solventia" }, { name: "robots", content: "noindex" }],
  }),
});

/**
 * OPPORTUNITY DETAIL — "Is this my business, and how would it actually work?"
 * Opening: the name, why it fits, one action (Build my roadmap), and the model as a picture.
 * Then five sections, one open at a time: Overview · Customer · Money · First offer · Risks.
 */
function OpportunityPage() {
  const { id } = Route.useParams();
  const search = Route.useSearch();
  const section: Section = search.tab
    ? ((LEGACY[search.tab] ?? search.tab) as Section)
    : "overview";
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
  const title = overlay.data?.title ?? dto.brief.title;
  const oneLiner = overlay.data?.oneLiner ?? dto.brief.oneLiner;
  const detail: OpportunityDisplayDetail = { ...dto.detail, ...(overlay.data?.detail ?? {}) };
  const setSection = (next: Section) =>
    navigate({
      to: "/dashboard/opportunities/$id",
      params: { id },
      search: { tab: next },
      replace: true,
    });

  return (
    <div className="flex flex-col gap-14 sm:gap-20" data-testid="opportunity-page">
      <Link
        to="/dashboard/opportunities"
        className="inline-flex min-h-10 w-fit items-center gap-2 text-[1rem] font-semibold text-[#171A27] hover:underline"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        {t("opp.back")}
      </Link>

      <Opening dto={dto} title={title} oneLiner={oneLiner} detail={detail} />

      <section className="flex flex-col gap-10">
        <div
          role="tablist"
          aria-label={t("opp.tabs.aria")}
          className="-mx-1 flex gap-1 overflow-x-auto border-b border-[#171A27]/10 px-1"
        >
          {SECTIONS.map((key) => {
            const active = key === section;
            return (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={active}
                data-testid={`tab-${key}`}
                onClick={() => setSection(key)}
                className={cn(
                  "relative min-h-12 shrink-0 px-4 text-[1rem] font-semibold uppercase tracking-[0.06em] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2F62D9] sm:px-5",
                  active
                    ? "text-[#171A27] after:absolute after:inset-x-3 after:-bottom-px after:h-[2px] after:bg-[#171A27]"
                    : "text-[#454B59] hover:text-[#171A27]",
                )}
              >
                {t(SECTION_LABEL[key])}
              </button>
            );
          })}
        </div>
        <div role="tabpanel" data-testid={`section-${section}`}>
          {section === "overview" && <Overview dto={dto} detail={detail} />}
          {section === "customer" && <Customer dto={dto} detail={detail} opportunityId={id} />}
          {section === "money" && <Money detail={detail} opportunityId={id} />}
          {section === "offer" && <FirstOffer detail={detail} title={title} />}
          {section === "risks" && <Risks detail={detail} title={title} />}
        </div>
      </section>
    </div>
  );
}

function Opening({
  dto,
  title,
  oneLiner,
  detail,
}: {
  dto: OpportunityDetailDTO;
  title: string;
  oneLiner: string;
  detail: OpportunityDisplayDetail;
}) {
  const { t } = useLocale();
  const navigate = useNavigate();
  const invalidate = useInvalidateFounder();
  const choose = useMutation({
    mutationFn: () => chooseDirection({ data: { opportunityId: dto.brief.id } }),
    onSuccess: async () => {
      await invalidate().catch(() => {});
      void navigate({
        to: "/dashboard/roadmap/building",
        search: { opportunityId: dto.brief.id },
      });
    },
    onError: (err) => {
      console.error("[opportunity] choose failed:", err);
      toast.error(t("cc.chosen.error"));
    },
  });
  const why = (detail.whyThisFounder.length > 0 ? detail.whyThisFounder : dto.fit.advantages).slice(
    0,
    4,
  );
  const nodes: GraphicNode[] = [
    { role: t("os.graphic.whoPays"), text: detail.customerHeadline },
    { role: t("os.graphic.offer"), text: detail.solutionHeadline },
    { role: t("os.graphic.earns"), text: detail.moneyHeadline },
    { role: t("os.graphic.outcome"), text: t("os.graphic.paidCustomer") },
  ].filter((n) => n.text);
  const kind = modelKindOf(dto.brief.title, [dto.detail.summary, detail.businessModel].join(" "));

  const action = dto.isSelected ? (
    dto.roadmapStatus === "active" || dto.roadmapStatus === "completed" ? (
      <Link to="/dashboard/roadmap" className={primaryActionClass}>
        {t("os.opp.openRoadmap")}
        <ActionArrow />
      </Link>
    ) : (
      <button
        type="button"
        className={primaryActionClass}
        onClick={() =>
          navigate({ to: "/dashboard/roadmap/building", search: { opportunityId: dto.brief.id } })
        }
        data-testid="build-roadmap"
      >
        {dto.roadmapStatus === "archived" ? t("cc.b.resumeCta") : t("os.reveal.build")}
        <ActionArrow />
      </button>
    )
  ) : dto.isCurrentConsultation ? (
    <button
      type="button"
      className={primaryActionClass}
      onClick={() => choose.mutate()}
      disabled={choose.isPending}
      data-testid="choose-direction"
    >
      {choose.isPending && <Loader2 className="size-5 animate-spin" aria-hidden="true" />}
      {t("os.reveal.build")}
      <ActionArrow />
    </button>
  ) : (
    <div className="flex flex-col items-start gap-3">
      <p className="text-[1.0625rem] text-[#2A2F3B]">{t("opp.earlierNote")}</p>
      <Link to="/dashboard/history" className={textActionClass}>
        {t("cc.earlier.history")}
        <ActionArrow />
      </Link>
    </div>
  );

  return (
    <header className="grid items-center gap-10 @4xl:grid-cols-[1.12fr_1fr] @4xl:gap-14">
      <div className="flex flex-col gap-7">
        <OsEyebrow tone="champagne" data-testid="opportunity-fit">
          {dto.isSelected ? t("os.opp.chosen") : t(`fit.overall.${dto.fit.matrix.overall}`)}
        </OsEyebrow>
        <OsDisplay size="title" data-testid="opportunity-title">
          {title}
        </OsDisplay>
        <OsLead>{oneLiner}</OsLead>
        {why.length > 0 && (
          <div className="flex flex-col gap-3.5" data-testid="why-fits">
            <OsEyebrow>{t("os.opp.whyFits")}</OsEyebrow>
            <OsPoints points={why} />
          </div>
        )}
        <div className="pt-1">{action}</div>
      </div>
      <OsFrame className="p-4 sm:p-6">
        <BusinessGraphic
          kind={kind}
          nodes={nodes}
          label={t("os.graphic.aria", {
            title,
            a: detail.customerHeadline,
            b: detail.solutionHeadline,
            c: detail.moneyHeadline,
            d: t("os.graphic.paidCustomer"),
          })}
          testId="opportunity-graphic"
        />
      </OsFrame>
    </header>
  );
}

const FIT_STATUS_WORD: Record<FitStatus, MessageKey> = {
  strong: "os.level.strong",
  moderate: "os.level.medium",
  conditional: "os.level.weak",
};

/** A large editorial fact: a readable label, the opportunity's own phrase, one sentence. */
function Fact({ label, value, sentence }: { label: string; value: string; sentence?: string }) {
  if (!value) return null;
  return (
    <div className="flex min-w-0 flex-col gap-2 border-t border-[#171A27]/10 pt-5">
      <OsEyebrow>{label}</OsEyebrow>
      <p className="text-[clamp(1.25rem,1.05rem+0.6vw,1.6rem)] font-semibold leading-snug text-[#171A27]">
        {value}
      </p>
      {sentence && sentence !== value && (
        <p className="max-w-[52ch] text-[1.0625rem] leading-relaxed text-[#2A2F3B]">{sentence}</p>
      )}
    </div>
  );
}

function Overview({
  dto,
  detail,
}: {
  dto: OpportunityDetailDTO;
  detail: OpportunityDisplayDetail;
}) {
  const { t } = useLocale();
  const reasonText = useFitReasonText();
  const { matrix } = dto.fit;
  return (
    <div className="flex flex-col gap-14" data-testid="overview-flow">
      <div className="grid gap-x-12 gap-y-10 @2xl:grid-cols-2">
        <Fact
          label={t("os.opp.problem")}
          value={detail.problemHeadline}
          sentence={detail.problem}
        />
        <Fact
          label={t("os.opp.solution")}
          value={detail.solutionHeadline}
          sentence={detail.solution}
        />
        <Fact
          label={t("os.opp.money.model")}
          value={detail.moneyHeadline}
          sentence={detail.businessModel}
        />
        <Fact label={t("os.opp.money.grows")} value={detail.revenuePath} />
      </div>
      <div className="flex flex-col gap-6" data-testid="founder-fit">
        <div className="flex flex-wrap items-baseline gap-x-5 gap-y-2">
          <OsEyebrow>{t("opp.fit.overall")}</OsEyebrow>
          <p
            className="font-os text-[clamp(1.6rem,1.2rem+1.2vw,2.3rem)] font-medium uppercase leading-none tracking-[-0.02em] text-[#171A27]"
            data-testid="fit-overall"
          >
            {t(`fit.overall.${matrix.overall}` as const)}
          </p>
        </div>
        <div className="grid gap-3 @2xl:grid-cols-2">
          {matrix.rows.map((row) => (
            <FlashCard
              key={row.key}
              testId={`fit-row-${row.key}`}
              label={t(`fit.row.${row.key}` as const)}
              headline={t(FIT_STATUS_WORD[row.status])}
              points={[reasonText(row.reason, dto.fit.currency)]}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function Customer({
  dto,
  detail,
  opportunityId,
}: {
  dto: OpportunityDetailDTO;
  detail: OpportunityDisplayDetail;
  opportunityId: string;
}) {
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
    <div className="flex flex-col gap-14" data-testid="market-tab">
      <div className="grid gap-10 @4xl:grid-cols-[1.1fr_1fr]">
        <div className="flex flex-col gap-5">
          <OsEyebrow>{t("os.opp.whoPays")}</OsEyebrow>
          <OsDisplay as="h2" size="section">
            {detail.customerHeadline}
          </OsDisplay>
          {detail.customer !== detail.customerHeadline && <OsLead>{detail.customer}</OsLead>}
        </div>
        <div className="flex flex-col gap-3 rounded-[24px] border border-[#B8924F]/40 bg-[#FBF8F2] p-6 sm:p-7">
          <OsEyebrow tone="champagne">{t("os.opp.findThem")}</OsEyebrow>
          <p className="text-[1.1875rem] font-semibold leading-snug text-[#171A27]">
            {detail.firstExperiment}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-5">
        <h3 className="font-os text-[1.375rem] font-medium uppercase tracking-[-0.01em] text-[#171A27]">
          {hasSources ? t("opp.market.sourcesTitle") : t("opp.market.none")}
        </h3>
        {!hasSources && (
          <p className="max-w-[60ch] text-[1.0625rem] text-[#2A2F3B]">{t("opp.market.noneBody")}</p>
        )}
        {hasSources && (
          <ul className="flex flex-col divide-y divide-[#171A27]/10 border-y border-[#171A27]/10">
            {dto.sources.map((s) => (
              <li key={s.id} className="flex flex-col gap-2 py-5">
                <p className="text-[1.0625rem] leading-snug text-[#171A27]">{s.claim}</p>
                <div className="flex flex-wrap items-center gap-3 text-[0.9375rem]">
                  <span className="font-semibold uppercase tracking-[0.1em] text-[#3C4250]">
                    {t(`opp.market.label.${s.label}` as const)}
                  </span>
                  {s.sourceUrl && (
                    <a
                      href={s.sourceUrl}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="inline-flex items-center gap-1.5 font-semibold text-[#2448A8] hover:underline"
                    >
                      {s.sourceTitle ?? s.sourceUrl}
                      <ExternalLink className="size-3.5" aria-hidden="true" />
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <button
            type="button"
            onClick={() => research.mutate()}
            disabled={research.isPending}
            className={cn(
              primaryActionClass,
              "bg-transparent text-[#0B1F3B] ring-1 ring-[#0B1F3B]/25 hover:bg-[#0B1F3B]/[0.04]",
            )}
            data-testid="look-for-sources"
          >
            {research.isPending && <Loader2 className="size-5 animate-spin" aria-hidden="true" />}
            {hasSources ? t("opp.market.refresh") : t("opp.market.lookFor")}
          </button>
          <Link
            to="/dashboard/proof"
            search={{ opportunity: opportunityId }}
            className={textActionClass}
            data-testid="start-validation"
          >
            {t("opp.market.start")}
            <ActionArrow />
          </Link>
        </div>
        <p className="text-[0.9375rem] text-[#454B59]">{t("opp.market.sourcesNote")}</p>
      </div>
    </div>
  );
}

function Money({
  detail,
  opportunityId,
}: {
  detail: OpportunityDisplayDetail;
  opportunityId: string;
}) {
  const { t } = useLocale();
  return (
    <div className="flex flex-col gap-14">
      <div className="grid gap-x-12 gap-y-10 @2xl:grid-cols-2">
        <Fact label={t("os.opp.money.start")} value={detail.startingCapital} />
        <Fact label={t("os.opp.money.time")} value={detail.weeklyTime} />
        <Fact
          label={t("os.opp.money.model")}
          value={detail.moneyHeadline}
          sentence={detail.businessModel}
        />
        <Fact label={t("os.opp.money.grows")} value={detail.revenuePath} />
      </div>
      <div className="flex flex-col gap-4">
        <h3 className="font-os text-[1.375rem] font-medium uppercase tracking-[-0.01em] text-[#171A27]">
          {t("os.opp.money.yours")}
        </h3>
        <p className="max-w-[60ch] text-[1.0625rem] text-[#2A2F3B]">
          {t("os.opp.money.yoursBody")}
        </p>
        <div className="pt-2">
          <EconomicsTab opportunityId={opportunityId} />
        </div>
      </div>
    </div>
  );
}

function FirstOffer({ detail, title }: { detail: OpportunityDisplayDetail; title: string }) {
  const { t } = useLocale();
  const ask = useAskSol();
  const needs = [...detail.resourceRequirements].slice(0, 5);
  return (
    <div className="grid gap-12 @4xl:grid-cols-[1.1fr_1fr]" data-testid="first-offer-section">
      <div className="flex flex-col gap-6">
        <OsEyebrow tone="champagne">{t("os.opp.offer.title")}</OsEyebrow>
        <OsDisplay as="h2" size="section">
          {detail.solutionHeadline}
        </OsDisplay>
        <OsLead>{detail.solution}</OsLead>
        <dl className="grid gap-8 sm:grid-cols-2">
          <div>
            <dt className="text-[0.875rem] font-semibold uppercase tracking-[0.12em] text-[#3C4250]">
              {t("os.reveal.sellTo")}
            </dt>
            <dd className="mt-2 text-[1.1875rem] font-semibold leading-snug text-[#171A27]">
              {detail.customerHeadline}
            </dd>
          </div>
          <div>
            <dt className="text-[0.875rem] font-semibold uppercase tracking-[0.12em] text-[#3C4250]">
              {t("os.reveal.startingCost")}
            </dt>
            <dd className="mt-2 text-[1.1875rem] font-semibold leading-snug text-[#171A27]">
              {detail.startingCapital}
            </dd>
          </div>
        </dl>
        <div className="pt-2">
          <button
            type="button"
            className={primaryActionClass}
            data-testid="create-outreach"
            onClick={() =>
              ask.open(
                t("os.opp.offer.ask", {
                  offer: detail.solutionHeadline || title,
                  customer: detail.customerHeadline,
                }),
              )
            }
          >
            {t("os.opp.offer.cta")}
            <ActionArrow />
          </button>
        </div>
      </div>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 rounded-[24px] border border-[#B8924F]/40 bg-[#FBF8F2] p-6 sm:p-7">
          <OsEyebrow tone="champagne">{t("os.opp.offer.startWith")}</OsEyebrow>
          <p className="text-[1.1875rem] font-semibold leading-snug text-[#171A27]">
            {detail.firstExperiment}
          </p>
        </div>
        {needs.length > 0 && (
          <div className="flex flex-col gap-4 rounded-[24px] border border-[#171A27]/10 bg-white/70 p-6 sm:p-7">
            <OsEyebrow>{t("os.opp.offer.needs")}</OsEyebrow>
            <OsPoints points={needs} />
          </div>
        )}
      </div>
    </div>
  );
}

function Risks({ detail, title }: { detail: OpportunityDisplayDetail; title: string }) {
  const { t } = useLocale();
  const ask = useAskSol();
  return (
    <div className="flex flex-col gap-12" data-testid="risks-section">
      <div className="flex flex-col gap-5">
        <h2 className="font-os text-[clamp(1.4rem,1.1rem+1vw,2rem)] font-medium uppercase tracking-[-0.02em] text-[#171A27]">
          {t("os.opp.risks.title")}
        </h2>
        <div className="grid gap-3 @2xl:grid-cols-2">
          {detail.risks.map((risk, i) => (
            <FlashCard
              key={risk}
              testId="risk-card"
              label={t("os.opp.risk.n", { n: String(i + 1).padStart(2, "0") })}
              headline={risk}
              points={detail.tradeoffs[i] ? [detail.tradeoffs[i]] : []}
              action={
                <button
                  type="button"
                  className={textActionClass}
                  onClick={() => ask.open(t("os.opp.risk.ask", { title, risk }))}
                >
                  {t("os.opp.risk.solve")}
                  <ActionArrow />
                </button>
              }
            />
          ))}
        </div>
      </div>
      {detail.unknowns.length > 0 && (
        <div className="flex flex-col gap-4">
          <OsEyebrow>{t("os.opp.risks.unknowns")}</OsEyebrow>
          <OsPoints points={detail.unknowns} />
        </div>
      )}
    </div>
  );
}
