import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import {
  Check,
  ChevronDown,
  Compass,
  ExternalLink,
  Loader2,
  Repeat,
  Route as RouteIcon,
  Search,
  ShieldCheck,
  Tag,
  Wallet,
  type LucideIcon,
} from "lucide-react";

import { PageHero } from "@/components/founder/proof/PageHero";
import { useAskSol } from "@/components/founder/DashboardShell";
import { FIT_ICONS } from "@/components/founder/dashboard/fit-constants";
import { FitStatusPill, useFitReasonText } from "@/components/founder/fit";
import {
  Card,
  EmptyState,
  ErrorPanel,
  LinkButton,
  PageSkeleton,
  Pill,
} from "@/components/founder/ui";
import { getOpportunityDetail } from "@/lib/actions/opportunities";
import { generateAssumptions, getProofOverview, type AssumptionDTO } from "@/lib/actions/proof";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { qk, useFounderState, useInvalidateFounder } from "@/lib/queries";
import {
  useTranslatedEntity,
  useTranslatedTitle,
  type OpportunityOverlay,
} from "@/lib/use-translation";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dashboard/proof")({
  validateSearch: z.object({
    /** Which opportunity to explain (defaults to the current direction). */
    opportunity: z.string().uuid().optional().catch(undefined),
  }),
  component: ProofPage,
  head: () => ({
    meta: [{ title: "Proof — Solventia" }, { name: "robots", content: "noindex" }],
  }),
});

const CATEGORY_ICON: Record<string, LucideIcon> = {
  problem: Search,
  willingness_to_pay: Wallet,
  distribution: RouteIcon,
  delivery: RouteIcon,
  retention: Repeat,
  pricing: Tag,
  competition: ShieldCheck,
};

interface ProofOverlay {
  assumptions?: Record<string, { title?: string; whyItMatters?: string; nextTest?: string }>;
}

function ProofPage() {
  const { t } = useLocale();
  const search = Route.useSearch();
  const founder = useFounderState();

  if (founder.isPending) return <PageSkeleton label={t("shell.skeleton.loading")} />;
  if (founder.isError || !founder.data) {
    return <ErrorPanel onRetry={() => void founder.refetch()} retrying={founder.isFetching} />;
  }
  const opportunityId = search.opportunity ?? founder.data.direction.selectedId ?? null;

  if (!opportunityId) {
    return (
      <div className="flex flex-col gap-8">
        <PageHero title={t("pf.title")} subtitle={t("pf.subtitle")} />
        <EmptyState
          title={t("pf.noDirection.title")}
          body={t("pf.noDirection.body")}
          action={
            <LinkButton to="/dashboard/opportunities" variant="primary" size="lg">
              {t("shell.nav.opportunities")}
            </LinkButton>
          }
        />
      </div>
    );
  }
  return <ProofWorkspace opportunityId={opportunityId} />;
}

/** Proof explains the idea to the founder: why Solventia suggested it for them,
 * what has to be true for it to work, and where the market numbers come from.
 * Nothing here asks the founder to enter anything. */
function ProofWorkspace({ opportunityId }: { opportunityId: string }) {
  const { t, locale } = useLocale();
  const invalidate = useInvalidateFounder();
  const askSol = useAskSol();
  const reasonText = useFitReasonText();

  const overview = useQuery({
    queryKey: qk.proof(opportunityId),
    queryFn: () => getProofOverview({ data: { opportunityId } }),
    staleTime: 10_000,
  });
  const detailQuery = useQuery({
    queryKey: qk.opportunity(opportunityId),
    queryFn: () => getOpportunityDetail({ data: { id: opportunityId } }),
    staleTime: 15_000,
  });
  const overlay = useTranslatedEntity<ProofOverlay>(
    "proof",
    opportunityId,
    String(overview.data?.assumptions.length ?? 0),
  );
  const oppOverlay = useTranslatedEntity<OpportunityOverlay>("opportunity", opportunityId);
  const opportunityTitle = useTranslatedTitle(opportunityId, overview.data?.opportunity?.title);
  const [openId, setOpenId] = useState<string | null>(null);

  // The founder's first visit: set up the key assumptions exactly once.
  const generate = useMutation({
    mutationFn: () => generateAssumptions({ data: { opportunityId, locale } }),
    onSuccess: async () => {
      await invalidate();
    },
  });
  const generatedRef = useRef(false);
  const needsGeneration = overview.data?.available && overview.data.needsGeneration;
  useEffect(() => {
    if (needsGeneration && !generatedRef.current && !generate.isPending) {
      generatedRef.current = true;
      generate.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needsGeneration]);

  // Ask Sol shows which assumption is open, so its suggestions are about that one.
  const openAssumptionTitle =
    overview.data?.assumptions.find((a) => a.id === openId)?.title ?? null;
  useEffect(() => {
    askSol.setAssumption(openAssumptionTitle);
    return () => askSol.setAssumption(null);
  }, [openAssumptionTitle, askSol]);

  if (overview.isPending) return <PageSkeleton label={t("shell.skeleton.loading")} />;
  if (overview.isError || !overview.data) {
    return <ErrorPanel onRetry={() => void overview.refetch()} retrying={overview.isFetching} />;
  }
  const data = overview.data;

  if (!data.available) {
    return (
      <div className="flex flex-col gap-8">
        <PageHero title={t("pf.title")} subtitle={t("pf.subtitle")} />
        <ErrorPanel title={t("pf.unavailable.title")} body={t("pf.unavailable.body")} />
      </div>
    );
  }

  const applyOverlay = (a: AssumptionDTO): AssumptionDTO => {
    const o = overlay.data?.assumptions?.[a.id];
    return o
      ? {
          ...a,
          title: o.title ?? a.title,
          whyItMatters: o.whyItMatters ?? a.whyItMatters,
          nextTest: o.nextTest ?? a.nextTest,
        }
      : a;
  };
  const assumptions = data.assumptions.map(applyOverlay);

  const dto = detailQuery.data;
  const detail = dto ? { ...dto.detail, ...(oppOverlay.data?.detail ?? {}) } : null;
  const advantages = dto
    ? (detail && detail.whyThisFounder.length > 0
        ? detail.whyThisFounder
        : dto.fit.advantages
      ).slice(0, 4)
    : [];
  const rows = dto?.fit.assessment.factors ?? [];
  const sources = dto?.sources ?? [];

  return (
    <div className="flex flex-col gap-8" data-testid="proof-page">
      <PageHero title={opportunityTitle ?? t("pf.title")} subtitle={t("pf.subtitle")} />

      {(advantages.length > 0 || rows.length > 0) && dto && (
        <section aria-labelledby="fit-h" className="flex flex-col gap-4" data-testid="proof-fit">
          <div>
            <h2 id="fit-h" className="sol-h-sm !text-[1.0625rem]">
              {t("pf.fit.title")}
            </h2>
            <p className="mt-1 text-[0.9375rem] text-sol-secondary">{t("pf.fit.sub")}</p>
          </div>
          {advantages.length > 0 && (
            <Card className="p-5 sm:p-6">
              <ul className="grid gap-3 sm:grid-cols-2">
                {advantages.map((reason) => (
                  <li
                    key={reason}
                    className="flex items-start gap-3 text-[0.9375rem] leading-snug text-sol-ink"
                  >
                    <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-sol-cobalt-soft text-sol-cobalt-deep">
                      <Check className="size-3" strokeWidth={3} aria-hidden="true" />
                    </span>
                    <span className="min-w-0">{reason}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
          {rows.length > 0 && (
            <ul className="grid gap-4 sm:grid-cols-2">
              {rows.map((row) => {
                const Icon = FIT_ICONS[row.key];
                return (
                  <li key={row.key} data-testid={`fit-row-${row.key}`}>
                    <Card className="flex h-full gap-4 p-5">
                      <span className="flex size-11 shrink-0 items-center justify-center rounded-full border border-sol-champagne/40 bg-sol-champagne-soft text-sol-champagne-deep">
                        <Icon className="size-5" aria-hidden="true" />
                      </span>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2.5">
                          <p className="text-[1rem] font-medium text-sol-ink">
                            {t(`fit2.factor.${row.key}` as const)}
                          </p>
                          <FitStatusPill score={row.score} />
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
          )}
        </section>
      )}

      {generate.isPending || (needsGeneration && !generate.isError) ? (
        <div
          role="status"
          className="flex items-center gap-3 rounded-2xl border border-sol-cobalt/25 bg-sol-cobalt-soft px-5 py-4 text-[1.0625rem] text-sol-ink"
        >
          <Loader2 className="size-5 animate-spin text-sol-cobalt" aria-hidden="true" />
          {t("pf.generating")}
        </div>
      ) : generate.isError ? (
        <ErrorPanel
          title={t("pf.generateError.title")}
          body={t("pf.generateError.body")}
          onRetry={() => generate.mutate()}
          retrying={generate.isPending}
        />
      ) : null}

      {assumptions.length > 0 && (
        <section aria-labelledby="assume-h" className="flex flex-col gap-4">
          <div>
            <h2 id="assume-h" className="sol-h-sm !text-[1.0625rem]">
              {t("pf.assume.title")}
            </h2>
            <p className="mt-1 text-[0.9375rem] text-sol-secondary">{t("pf.assume.sub")}</p>
          </div>
          <ul className="flex flex-col gap-3">
            {assumptions.map((a) => {
              const Icon = CATEGORY_ICON[a.category] ?? Compass;
              const open = openId === a.id;
              return (
                <li key={a.id}>
                  <Card
                    as="article"
                    className="border-sol-border p-0 shadow-none transition-colors hover:border-sol-cobalt/40"
                    data-testid="assumption-card"
                  >
                    <button
                      type="button"
                      aria-expanded={open}
                      aria-controls={`assume-${a.id}`}
                      onClick={() => setOpenId(open ? null : a.id)}
                      data-testid="view-details"
                      className="flex w-full cursor-pointer items-center gap-4 rounded-2xl px-5 py-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sol-cobalt/50"
                    >
                      <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-sol-cobalt-soft text-sol-cobalt-deep">
                        <Icon className="size-5" strokeWidth={1.75} aria-hidden="true" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <Pill tone="neutral">{t(`pf.category.${a.category}` as const)}</Pill>
                        <span className="sol-h-sm mt-1.5 block text-sol-ink">{a.title}</span>
                      </span>
                      <ChevronDown
                        className={cn(
                          "size-5 shrink-0 text-sol-secondary transition-transform duration-200",
                          open && "rotate-180",
                        )}
                        aria-hidden="true"
                      />
                    </button>
                    {open && (
                      <div
                        id={`assume-${a.id}`}
                        className="flex flex-col gap-4 border-t border-sol-border px-5 py-5 sm:pl-[5.25rem]"
                      >
                        {a.whyItMatters && (
                          <div>
                            <p className="sol-eyebrow">{t("pf.detail.whyMatters")}</p>
                            <p className="mt-1.5 text-[1rem] leading-relaxed text-sol-ink">
                              {a.whyItMatters}
                            </p>
                          </div>
                        )}
                        {a.nextTest && (
                          <div className="rounded-2xl bg-sol-cobalt-soft px-4 py-3.5">
                            <p className="text-[0.875rem] font-medium text-sol-cobalt-deep">
                              {t("pf.detail.nextTest")}
                            </p>
                            <p className="mt-1 text-[1rem] leading-relaxed text-sol-ink">
                              {a.nextTest}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </Card>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {sources.length > 0 && (
        <section aria-labelledby="sources-h" className="flex flex-col gap-4">
          <h2 id="sources-h" className="sol-h-sm !text-[1.0625rem]">
            {t("opp.market.sourcesTitle")}
          </h2>
          <ul className="flex flex-col gap-3">
            {sources.map((s) => (
              <li key={s.id}>
                <Card className="flex flex-col gap-1.5 p-5 shadow-none">
                  <p className="text-[1rem] leading-snug text-sol-ink">{s.claim}</p>
                  {s.sourceUrl ? (
                    <a
                      href={s.sourceUrl}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="inline-flex w-fit items-center gap-1.5 text-[0.9375rem] font-medium text-sol-cobalt-deep hover:underline"
                    >
                      {s.sourceTitle ?? s.sourceUrl}
                      <ExternalLink className="size-3.5" aria-hidden="true" />
                    </a>
                  ) : (
                    s.sourceTitle && (
                      <p className="text-[0.9375rem] text-sol-secondary">{s.sourceTitle}</p>
                    )
                  )}
                </Card>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
