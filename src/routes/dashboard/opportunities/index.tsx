import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Check,
  Compass,
  FileText,
  PlayCircle,
  ShoppingCart,
  Smartphone,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";

import workspaceImage from "@/assets/hero-founder-workspace.png";
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
import { chooseDirection, exploreMoreOpportunities } from "@/lib/actions/opportunities";
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

/** One opportunity: title, status, a two-line description, the four-row fit strip
 * (drawn from the same deterministic matrix as the opportunity page) and one
 * primary action. The selected one is highlighted in lavender. */
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
  return (
    <Card
      as="article"
      className={cn(
        "flex h-full flex-col gap-4 p-5 sm:p-6",
        selected &&
          "border-sol-violet/40 bg-sol-violet-ultralight sm:flex-row sm:items-center sm:justify-between sm:gap-8 sm:p-5",
      )}
      data-testid={`opp-${section}`}
    >
      {showThumb && (
        <div
          className={cn(
            "shrink-0 overflow-hidden rounded-xl border border-sol-border",
            selected ? "h-36 w-full sm:h-24 sm:w-40 sm:order-first" : "h-16 w-24 self-start",
          )}
          data-testid="opp-thumb"
        >
          <OpportunityPhoto image={image} title={brief.title} compact={!selected} />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2.5">
          <h3 className="sol-h3">{brief.title}</h3>
          {selected ? (
            <Pill tone="violet">{t("opp.status.selected")}</Pill>
          ) : section === "previous" ? (
            <Pill tone="neutral">
              {brief.status === "dismissed" ? t("opp.status.dismissed") : t("opp.status.previous")}
            </Pill>
          ) : (
            <FitPill fit={brief.fit} />
          )}
        </div>
        {description && (
          <p className="mt-2 line-clamp-2 text-[0.9375rem] leading-snug text-sol-secondary">
            {description}
          </p>
        )}
      </div>
      <div className={cn("flex shrink-0 flex-wrap gap-3", !selected && "mt-auto [&>*]:flex-1")}>
        <LinkButton
          to="/dashboard/opportunities/$id"
          params={{ id: brief.id }}
          variant={selected ? "primary" : "secondary"}
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

/** Compact hero: heading, subtitle, the explore action and one workspace photo that
 * fades into the page background. The photo is decorative, so it is hidden on small
 * screens and never pushes content below the fold. */
function Hero({ action }: { action?: ReactNode }) {
  const { t } = useLocale();
  return (
    <header className="relative overflow-hidden rounded-[1.25rem] border border-sol-border bg-gradient-to-br from-sol-violet-ultralight via-sol-pearl to-sol-ivory-light">
      <div className="relative z-10 flex flex-col items-start gap-4 p-6 sm:py-8 sm:pl-8 md:max-w-[62%]">
        <div>
          <h1 className="sol-page-title sol-h-hero">{t("opp.list.heroTitle")}</h1>
          <p className="mt-2 max-w-[48ch] text-[0.9375rem] leading-snug text-sol-secondary sm:text-[1rem]">
            {t("opp.list.heroSubtitle")}
          </p>
        </div>
        {action}
      </div>
      <div className="absolute inset-y-0 right-0 hidden w-[38%] md:block">
        <img
          src={workspaceImage}
          alt={t("opp.list.imageAlt")}
          loading="eager"
          width={1774}
          height={887}
          className="size-full object-cover object-[70%_60%] opacity-95 [mask-image:linear-gradient(to_right,transparent,black_45%)]"
        />
      </div>
    </header>
  );
}

function OpportunitiesPage() {
  const { t, locale } = useLocale();
  const founder = useFounderState();
  const invalidate = useInvalidateFounder();
  const navigate = useNavigate();

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
  const explore = useMutation({
    mutationFn: () => exploreMoreOpportunities({ data: { locale } }),
    onSuccess: async (res) => {
      await invalidate();
      toast.success(t("cc.explore.done", { n: res.added }));
    },
    onError: (err) => {
      console.error("[opportunities] explore more failed:", err);
      toast.error(t("cc.explore.error"));
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

  return (
    <div className="flex flex-col gap-8" data-testid="opportunities-page">
      <Hero
        action={
          canChoose && all.length > 0 ? (
            <Button
              variant="soft"
              onClick={() => explore.mutate()}
              loading={explore.isPending}
              disabled={choose.isPending}
              data-testid="explore-more"
            >
              <Compass className="size-5" aria-hidden="true" />
              {t("cc.exploreMore")}
            </Button>
          ) : undefined
        }
      />

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
        <section aria-labelledby="sel-h" className="flex flex-col gap-3">
          <h2 id="sel-h" className="sol-h-sm !text-[1.125rem]">
            {t("opp.list.selected")}
          </h2>
          <OpportunityRow brief={selected} section="selected" canChoose={false} />
        </section>
      )}

      {alternatives.length > 0 && (
        <section aria-labelledby="alt-h" className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <h2 id="alt-h" className="sol-h-sm !text-[1.125rem]">
              {t("opp.list.alternatives")}
            </h2>
            <span className="rounded-full bg-sol-ivory px-3 py-0.5 text-[0.875rem] font-semibold text-sol-secondary">
              {alternatives.length}
            </span>
          </div>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {alternatives.map((b) => (
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

      {previous.length > 0 && (
        <section aria-labelledby="prev-h" className="flex flex-col gap-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-3">
                <h2 id="prev-h" className="sol-h-sm !text-[1.375rem]">
                  {t("opp.list.previous")}
                </h2>
                <span className="rounded-full bg-sol-violet-soft px-3 py-0.5 text-[0.9375rem] font-medium text-sol-violet-deep">
                  {previous.length}
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
            {previous.map((b, i) => (
              <PreviousCard key={b.id} brief={b} index={i} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
