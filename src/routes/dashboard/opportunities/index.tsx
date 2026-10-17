import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Check,
  Compass,
  Search,
  FileText,
  PlayCircle,
  ShoppingCart,
  Smartphone,
  type LucideIcon,
} from "lucide-react";
import { useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

import { OpportunityPhoto, useOpportunityImage } from "@/components/founder/OpportunityImage";
import { FitPill } from "@/components/founder/OpportunityCards";
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

type Section = "selected" | "alternative" | "previous";

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
  const showThumb = selected ? !image.unavailable : image.url !== null && section === "alternative";

  if (selected) {
    return (
      <article className="sol-atmosphere" data-testid="opp-selected" aria-label={brief.title}>
        <div className="relative z-10 flex flex-col justify-center gap-4 p-6 sm:p-8">
          <div className="flex flex-wrap items-center gap-2.5">
            <p className="sol-eyebrow flex items-center gap-2 !text-[0.6875rem] !uppercase !tracking-[0.14em]">
              <span className="h-3 w-0.5 rounded-full bg-sol-violet" aria-hidden="true" />
              {t("opp.list.featured")}
            </p>
            <Pill tone="violet">{t("opp.status.selected")}</Pill>
          </div>
          <h3 className="max-w-[24ch] font-display text-[clamp(1.5rem,1.2rem+1.2vw,2.125rem)] font-medium leading-[1.12] text-sol-ink">
            {brief.title}
          </h3>
          {description && (
            <p className="line-clamp-3 max-w-[56ch] text-[0.9375rem] leading-snug text-sol-secondary">
              {description}
            </p>
          )}
          <div>
            <LinkButton to="/dashboard/opportunities/$id" params={{ id: brief.id }} size="md">
              {t("common.open")}
              <ArrowRight className="size-4" aria-hidden="true" />
            </LinkButton>
          </div>
        </div>
      </article>
    );
  }

  return (
    <Card
      as="article"
      className="group flex h-full flex-col overflow-hidden p-0 transition-colors hover:border-sol-violet/40"
      data-testid={`opp-${section}`}
    >
      {showThumb && (
        <div
          className="h-36 w-full overflow-hidden border-b border-sol-border"
          data-testid="opp-thumb"
        >
          <OpportunityPhoto image={image} title={brief.title} compact />
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="sol-h3 min-w-0">{brief.title}</h3>
          {section === "previous" ? (
            <Pill tone="neutral">
              {brief.status === "dismissed" ? t("opp.status.dismissed") : t("opp.status.previous")}
            </Pill>
          ) : (
            <FitPill fit={brief.fit} />
          )}
        </div>
        {description && (
          <p className="line-clamp-3 text-[0.9375rem] leading-snug text-sol-secondary">
            {description}
          </p>
        )}
        <div className="mt-auto flex flex-wrap items-center gap-3 pt-2">
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
      </div>
    </Card>
  );
}

const PREVIOUS_TILES: { icon: LucideIcon; tone: string }[] = [
  { icon: FileText, tone: "bg-sol-violet-soft text-sol-violet-deep" },
  { icon: BarChart3, tone: "bg-sky-50 text-sky-600" },
  { icon: Smartphone, tone: "bg-emerald-50 text-emerald-600" },
  { icon: BookOpen, tone: "bg-rose-50 text-rose-500" },
  { icon: ShoppingCart, tone: "bg-amber-50 text-amber-500" },
  { icon: PlayCircle, tone: "bg-fuchsia-50 text-fuchsia-500" },
];

/** A past idea: coloured tile, name, status, a short line and one Revisit action. */
function PreviousCard({ brief: raw, index }: { brief: OpportunityBrief; index: number }) {
  const { t } = useLocale();
  const brief = useTranslatedBrief(raw) ?? raw;
  const tile = PREVIOUS_TILES[index % PREVIOUS_TILES.length];
  const Icon = tile.icon;
  const description = brief.oneLiner || brief.customer;
  return (
    <Card as="article" className="flex h-full flex-col gap-4 p-5" data-testid="opp-previous">
      <div className="flex items-start gap-4">
        <span
          className={cn("flex size-14 shrink-0 items-center justify-center rounded-2xl", tile.tone)}
        >
          <Icon className="size-6" strokeWidth={1.75} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h3 className="truncate text-[1.125rem] font-medium text-sol-ink">{brief.title}</h3>
          <Pill tone={brief.status === "dismissed" ? "neutral" : "violet"} className="mt-2">
            {brief.status === "dismissed" ? (
              t("opp.status.dismissed")
            ) : (
              <>
                <Check className="size-3.5" aria-hidden="true" />
                {t("opp.status.consulted")}
              </>
            )}
          </Pill>
        </div>
      </div>
      {description && (
        <p className="line-clamp-2 text-[0.9375rem] leading-snug text-sol-secondary">
          {description}
        </p>
      )}
      <LinkButton
        to="/dashboard/opportunities/$id"
        params={{ id: brief.id }}
        variant="secondary"
        size="md"
        className="mt-auto w-full"
      >
        {t("opp.revisit")}
        <ArrowRight className="size-4" aria-hidden="true" />
      </LinkButton>
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
  const previous = all
    .filter(
      (b) =>
        b.id !== selected?.id &&
        (b.consultationId !== direction.consultationId || b.status === "dismissed"),
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const canChoose = direction.isLatestConsultation;
  const q = query.trim().toLowerCase();
  const textMatch = (b: OpportunityBrief) =>
    q === "" || `${b.title} ${b.oneLiner ?? ""} ${b.customer ?? ""}`.toLowerCase().includes(q);
  const shownAlternatives = alternatives.filter(
    (b) => (fitFilter === "all" || b.fit === fitFilter) && textMatch(b),
  );
  const shownPrevious = previous.filter(textMatch);
  const filtering = q !== "" || fitFilter !== "all";
  const fitOptions = (["strong", "moderate", "conditional"] as const).filter((f) =>
    alternatives.some((b) => b.fit === f),
  );
  const showToolbar = alternatives.length + previous.length > 2;

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
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <label className="relative block w-full sm:max-w-sm">
            <span className="sr-only">{t("opp.list.search")}</span>
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-sol-secondary"
              aria-hidden="true"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("opp.list.searchPlaceholder")}
              data-testid="opp-search"
              className="h-11 w-full rounded-full border border-sol-border bg-sol-surface pl-10 pr-4 text-[0.9375rem] text-sol-ink outline-none placeholder:text-sol-secondary/70 focus-visible:border-sol-violet/60 focus-visible:ring-2 focus-visible:ring-sol-violet/30"
            />
          </label>
          {fitOptions.length > 1 && (
            <div
              role="group"
              aria-label={t("opp.list.filterAria")}
              className="flex flex-wrap gap-2"
            >
              {(["all", ...fitOptions] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  aria-pressed={fitFilter === f}
                  onClick={() => setFitFilter(f)}
                  className={cn(
                    "min-h-9 cursor-pointer rounded-full border px-3.5 text-[0.8125rem] font-medium transition-colors",
                    fitFilter === f
                      ? "border-sol-violet/50 bg-sol-violet-soft text-sol-violet-deep"
                      : "border-sol-border bg-sol-surface text-sol-secondary hover:border-sol-violet/40",
                  )}
                >
                  {f === "all" ? t("opp.list.filterAll") : t(`fit.${f}` as const)}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {filtering && shownAlternatives.length === 0 && shownPrevious.length === 0 && (
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
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
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

      {shownPrevious.length > 0 && (
        <section aria-labelledby="prev-h" className="flex flex-col gap-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-3">
                <h2 id="prev-h" className="sol-h-sm !text-[1.0625rem]">
                  {t("opp.list.previous")}
                </h2>
                <span className="rounded-full bg-sol-violet-soft px-2.5 py-0.5 text-[0.8125rem] font-medium text-sol-violet-deep">
                  {shownPrevious.length}
                </span>
              </div>
              <p className="mt-1 text-[0.9375rem] text-sol-secondary">
                {t("opp.list.previousSub")}
              </p>
            </div>
            <LinkButton
              to="/dashboard/history"
              variant="ghost"
              size="sm"
              className="text-sol-violet-deep"
            >
              {t("cc.viewAll")}
              <ArrowRight className="size-4" aria-hidden="true" />
            </LinkButton>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {shownPrevious.map((b, i) => (
              <PreviousCard key={b.id} brief={b} index={i} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
