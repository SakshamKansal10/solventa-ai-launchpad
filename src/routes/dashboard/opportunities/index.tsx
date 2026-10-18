import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowRight,
  Check,
  Hammer,
  Lightbulb,
  Map as MapIcon,
  Search,
  SlidersHorizontal,
  Target,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

import { OpportunityPhoto, useOpportunityImage } from "@/components/founder/OpportunityImage";
import { FitPill } from "@/components/founder/OpportunityCards";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Button,
  Card,
  EmptyState,
  ErrorPanel,
  LinkButton,
  PageSkeleton,
  Pill,
} from "@/components/founder/ui";
import type { OpportunityBrief } from "@/lib/actions/founder";
import { chooseDirection } from "@/lib/actions/opportunities";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { useFounderState, useInvalidateFounder } from "@/lib/queries";
import { useTranslatedBrief } from "@/lib/use-translation";
import { z } from "zod";

export const Route = createFileRoute("/dashboard/opportunities/")({
  validateSearch: z.object({ consultation: z.string().uuid().optional() }),
  component: OpportunitiesPage,
  head: () => ({
    meta: [{ title: "Opportunities — Solventia" }, { name: "robots", content: "noindex" }],
  }),
});

type Section = "selected" | "alternative";

/** One opportunity. The selected one is a featured hero with its photo; the
 * alternatives are image cards: photo (only if one already exists), name, short
 * description, fit, and the Open / Choose actions. */
function OpportunityRow({
  brief: raw,
  section,
  onChoose,
  choosing,
  canChoose,
}: {
  brief: OpportunityBrief;
  section: Section;
  onChoose?: () => void;
  choosing?: boolean;
  canChoose: boolean;
}) {
  const { t } = useLocale();
  const brief = useTranslatedBrief(raw) ?? raw;
  const selected = section === "selected";
  const description = brief.oneLiner || brief.customer;
  // The chosen idea gets its photo (generated once, then cached). Alternatives
  // only show a thumbnail if one already exists — browsing never spends credits.
  const image = useOpportunityImage(raw.id, { generate: selected });

  if (selected) {
    const facts: { key: string; icon: LucideIcon; label: string; value: string | null }[] = [
      { key: "customer", icon: Users, label: t("opp.fact.customer"), value: brief.customer },
      { key: "problem", icon: Target, label: t("opp.fact.problem"), value: brief.problem },
      { key: "product", icon: Hammer, label: t("opp.ov.groupWhat"), value: brief.product },
    ];
    const shownFacts = facts.filter((f) => f.value);
    return (
      <article className="sol-atmosphere" data-testid="opp-selected" aria-label={brief.title}>
        <div className="relative z-10 grid gap-6 p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:items-center lg:gap-10">
          <div className="flex flex-col justify-center gap-5">
            <div className="flex flex-wrap items-center gap-2.5">
              <p className="sol-eyebrow flex items-center gap-2 !text-[0.6875rem] !uppercase !tracking-[0.14em]">
                <span className="h-3 w-0.5 rounded-full bg-sol-violet" aria-hidden="true" />
                {t("opp.list.featured")}
              </p>
              <Pill tone="violet">{t("opp.status.selected")}</Pill>
            </div>
            <h3 className="max-w-[16ch] font-display text-[clamp(1.75rem,1.3rem+1.6vw,2.75rem)] font-medium leading-[1.1] text-sol-ink">
              {brief.title}
            </h3>
            <div className="flex flex-wrap items-center gap-3">
              <LinkButton to="/dashboard/opportunities/$id" params={{ id: brief.id }} size="md">
                {t("common.open")}
                <ArrowRight className="size-4" aria-hidden="true" />
              </LinkButton>
              <LinkButton to="/dashboard/roadmap" variant="secondary" size="md">
                <MapIcon className="size-4" aria-hidden="true" />
                {t("cc.hero.viewRoadmap")}
              </LinkButton>
            </div>
          </div>
          {(description || shownFacts.length > 0) && (
            <div className="rounded-3xl border border-sol-border bg-white/70 p-5 backdrop-blur sm:p-6">
              <p className="flex items-center gap-2.5 text-[1rem] font-medium text-sol-violet-deep">
                <span className="flex size-8 items-center justify-center rounded-full bg-sol-champagne-soft">
                  <Lightbulb className="size-4" aria-hidden="true" />
                </span>
                {t("opp.hero.simply")}
              </p>
              {description && (
                <p className="mt-3 line-clamp-4 text-[0.9375rem] leading-relaxed text-sol-secondary">
                  {description}
                </p>
              )}
              {shownFacts.length > 0 && (
                <ul className="mt-4 flex flex-col gap-3.5">
                  {shownFacts.map((f) => (
                    <li key={f.key} className="flex items-start gap-3.5">
                      <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-sol-champagne-soft text-sol-champagne-deep">
                        <f.icon className="size-5" aria-hidden="true" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-[0.9375rem] font-medium text-sol-ink">{f.label}</p>
                        <p className="line-clamp-2 text-[0.875rem] leading-snug text-sol-secondary">
                          {f.value}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </article>
    );
  }

  return (
    <Card
      as="article"
      className="group flex h-full flex-col p-5 transition-colors hover:border-sol-violet/40 sm:p-6"
      data-testid={`opp-${section}`}
    >
      <div className="flex items-start gap-4">
        <span
          className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-sol-violet-soft text-sol-violet-deep"
          data-testid={image.url ? "opp-thumb" : undefined}
        >
          {image.url ? (
            <img src={image.url} alt="" className="size-full object-cover" draggable={false} />
          ) : (
            <Lightbulb className="size-6" strokeWidth={1.75} aria-hidden="true" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <h3 className="sol-h3 min-w-0">{brief.title}</h3>
            <FitPill fit={brief.fit} />
          </div>
          {description && (
            <p className="mt-1.5 line-clamp-3 text-[0.9375rem] leading-snug text-sol-secondary">
              {description}
            </p>
          )}
        </div>
      </div>
      {brief.whyFit.length > 0 && (
        <ul className="mt-4 flex flex-col gap-2.5 border-t border-sol-border pt-4 sm:pl-[4.5rem]">
          {brief.whyFit.slice(0, 3).map((reason) => (
            <li key={reason} className="flex items-start gap-3 text-[0.9375rem] text-sol-secondary">
              <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-sol-violet-soft text-sol-violet-deep">
                <Check className="size-3" strokeWidth={3} aria-hidden="true" />
              </span>
              <span className="min-w-0">{reason}</span>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-auto flex flex-wrap items-center gap-3 pt-5 sm:pl-[4.5rem]">
        <LinkButton
          to="/dashboard/opportunities/$id"
          params={{ id: brief.id }}
          variant="secondary"
          size="sm"
        >
          {t("common.open")}
          <ArrowRight className="size-4" aria-hidden="true" />
        </LinkButton>
        {section === "alternative" && canChoose && onChoose && (
          <Button variant="soft" size="sm" onClick={onChoose} loading={choosing}>
            {t("cc.choose")}
          </Button>
        )}
      </div>
    </Card>
  );
}

function OpportunitiesPage() {
  const { t, locale } = useLocale();
  const founder = useFounderState();
  const invalidate = useInvalidateFounder();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [fitFilter, setFitFilter] = useState<OpportunityBrief["fit"] | "all">("all");

  const choose = useMutation({
    mutationFn: (opportunityId: string) => chooseDirection({ data: { opportunityId } }),
    onSuccess: async () => {
      await invalidate();
      toast.success(t("cc.chosen.toast"));
      void navigate({ to: "/dashboard" });
    },
    onError: (err) => {
      console.error("[opportunities] choose failed:", err);
      toast.error(t("cc.chosen.error"));
    },
  });

  if (founder.isPending) return <PageSkeleton label={t("shell.skeleton.loading")} />;
  if (founder.isError || !founder.data) {
    return <ErrorPanel onRetry={() => void founder.refetch()} retrying={founder.isFetching} />;
  }

  const { direction, briefs } = founder.data;
  const all = Object.values(briefs);
  const inView = all.filter((b) => b.consultationId === direction.consultationId);
  const selected = direction.selectedId ? briefs[direction.selectedId] : null;
  const alternatives = inView
    .filter((b) => b.id !== selected?.id && b.status !== "dismissed")
    .sort((a, b) => direction.viewedIds.indexOf(a.id) - direction.viewedIds.indexOf(b.id));
  const canChoose = direction.isLatestConsultation;
  const q = query.trim().toLowerCase();
  const textMatch = (b: OpportunityBrief) =>
    q === "" || `${b.title} ${b.oneLiner ?? ""} ${b.customer ?? ""}`.toLowerCase().includes(q);
  const shownAlternatives = alternatives.filter(
    (b) => (fitFilter === "all" || b.fit === fitFilter) && textMatch(b),
  );
  const filtering = q !== "" || fitFilter !== "all";
  const fitOptions = (["strong", "moderate", "conditional"] as const).filter((f) =>
    alternatives.some((b) => b.fit === f),
  );
  const showToolbar = alternatives.length > 0;

  return (
    <div className="flex flex-col gap-8" data-testid="opportunities-page">
      <h1 className="sr-only">{t("shell.nav.opportunities")}</h1>

      {all.length === 0 && (
        <EmptyState
          title={t("cc.none.cardTitle")}
          body={t("cc.none.cardBody")}
          action={
            <LinkButton to="/consultation" variant="primary" size="lg">
              {t("nav.findMyBusinessIdea")}
            </LinkButton>
          }
        />
      )}

      {selected && (
        <section aria-label={t("opp.list.selected")} className="flex flex-col gap-3">
          <OpportunityRow brief={selected} section="selected" canChoose={false} />
        </section>
      )}

      {showToolbar && (
        <div className="flex items-center gap-3">
          <label className="relative block min-w-0 flex-1">
            <span className="sr-only">{t("opp.list.search")}</span>
            <Search
              className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-sol-secondary"
              aria-hidden="true"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("opp.list.searchPlaceholder")}
              data-testid="opp-search"
              className="h-12 w-full rounded-full border border-sol-border bg-sol-surface pl-11 pr-4 text-[0.9375rem] text-sol-ink outline-none placeholder:text-sol-secondary/70 focus-visible:border-sol-violet/60 focus-visible:ring-2 focus-visible:ring-sol-violet/30"
            />
          </label>
          {fitOptions.length > 1 && (
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  data-testid="opp-filters"
                  className="flex h-12 shrink-0 cursor-pointer items-center gap-2.5 rounded-full border border-sol-border bg-sol-surface px-5 text-[0.9375rem] font-medium text-sol-ink transition-colors hover:border-sol-violet/40"
                >
                  <SlidersHorizontal className="size-4" aria-hidden="true" />
                  {t("opp.list.filters")}
                  {fitFilter !== "all" && (
                    <span className="size-2 rounded-full bg-sol-violet" aria-hidden="true" />
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-56 p-2">
                <div role="group" aria-label={t("opp.list.filterAria")} className="flex flex-col">
                  {(["all", ...fitOptions] as const).map((f) => (
                    <button
                      key={f}
                      type="button"
                      aria-pressed={fitFilter === f}
                      onClick={() => setFitFilter(f)}
                      className={cn(
                        "flex min-h-10 cursor-pointer items-center justify-between rounded-xl px-3 text-left text-[0.9375rem] transition-colors",
                        fitFilter === f
                          ? "bg-sol-violet-soft font-medium text-sol-violet-deep"
                          : "text-sol-ink hover:bg-sol-ivory",
                      )}
                    >
                      {f === "all" ? t("opp.list.filterAll") : t(`fit.${f}` as const)}
                      {fitFilter === f && <Check className="size-4" aria-hidden="true" />}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          )}
        </div>
      )}

      {filtering && shownAlternatives.length === 0 && (
        <p className="text-[0.9375rem] text-sol-secondary" role="status">
          {t("opp.list.noMatch")}
        </p>
      )}

      {shownAlternatives.length > 0 && (
        <section aria-labelledby="alt-h" className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <h2 id="alt-h" className="sol-h-sm !text-[1.0625rem]">
              {t("opp.list.alternatives")}
            </h2>
            <span className="rounded-full bg-sol-ivory px-2.5 py-0.5 text-[0.8125rem] font-medium text-sol-secondary">
              {shownAlternatives.length}
            </span>
          </div>
          <div className="grid gap-5 lg:grid-cols-2">
            {shownAlternatives.map((b) => (
              <OpportunityRow
                key={b.id}
                brief={b}
                section="alternative"
                canChoose={canChoose}
                choosing={choose.isPending && choose.variables === b.id}
                onChoose={() => choose.mutate(b.id)}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
