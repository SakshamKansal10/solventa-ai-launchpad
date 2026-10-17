import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useReducedMotion } from "motion/react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import type { OpportunityBrief } from "@/lib/actions/founder";
import { chooseDirection, exploreMoreOpportunities } from "@/lib/actions/opportunities";
import type { FitStatus } from "@/lib/fit/matrix";
import type { MessageKey } from "@/lib/i18n";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { qk, useInvalidateFounder } from "@/lib/queries";
import { cn } from "@/lib/utils";

import {
  DIFFICULTY_WORD,
  FIT_WORD,
  useDirection,
  useFounderFits,
  type Direction,
} from "./direction";
import { BusinessGraphic, FilterVisual } from "./graphics";
import {
  ActionArrow,
  OsDisplay,
  OsEyebrow,
  OsFrame,
  OsLead,
  OsPoints,
  primaryActionClass,
  textActionClass,
} from "./os";

/**
 * THE FIRST IDEA REVEAL — the moment the founder decides whether to believe Solventia.
 *
 *   1. a short transition: their reality filtering possibilities down to three paths
 *   2. the STRONGEST direction gets the first moment, alone: why it fits, its own model,
 *      the first offer, and one action — Build my roadmap
 *   3. only then, smaller, the two alternatives (each with its own mini model)
 *   4. a plain-language comparison on demand (no scores)
 *
 * Choosing is never a trap: the others stay saved, and the founder can switch later.
 */
export function IdeaReveal({
  flagship,
  alternatives,
  consultationId,
  readOnly,
}: {
  flagship: OpportunityBrief;
  alternatives: OpportunityBrief[];
  consultationId: string;
  readOnly: boolean;
}) {
  const reduced = useReducedMotion() === true;
  const seenKey = `solventia:reveal-seen:${consultationId}`;
  const [intro, setIntro] = useState<"pending" | "show" | "done">("pending");

  // The transition plays once per consultation (this device), and never under reduced motion.
  useEffect(() => {
    let seen = reduced;
    try {
      seen = seen || window.localStorage.getItem(seenKey) === "1";
    } catch {
      /* storage unavailable: show it once per visit */
    }
    setIntro(seen ? "done" : "show");
  }, [seenKey, reduced]);
  const finishIntro = () => {
    try {
      window.localStorage.setItem(seenKey, "1");
    } catch {
      /* fine: it simply shows again next time */
    }
    setIntro("done");
  };

  if (intro === "pending") return <div className="min-h-[60vh]" aria-hidden="true" />;
  if (intro === "show")
    return <RevealIntro count={1 + alternatives.length} onContinue={finishIntro} />;
  return <RevealMain flagship={flagship} alternatives={alternatives} readOnly={readOnly} />;
}

/** "We found 3 directions that fit your reality." — a few seconds, or one click. */
function RevealIntro({ count, onContinue }: { count: number; onContinue: () => void }) {
  const { t } = useLocale();
  useEffect(() => {
    const id = window.setTimeout(onContinue, 3600);
    return () => window.clearTimeout(id);
  }, [onContinue]);
  return (
    <section
      data-testid="reveal-intro"
      aria-label={t("os.reveal.intro.aria")}
      className="relative flex min-h-[calc(100dvh-72px-5rem)] flex-col justify-center gap-10 py-6"
    >
      <div className="motion-safe:animate-[os-rise_0.8s_cubic-bezier(0.22,1,0.36,1)_both]">
        <OsEyebrow tone="blue">{t("os.reveal.intro.found")}</OsEyebrow>
        <OsDisplay className="mt-4">
          {t("os.reveal.intro.count", { n: count })}
          <span className="block text-[#454B59]">{t("os.reveal.intro.fit")}</span>
        </OsDisplay>
      </div>
      <FilterVisual className="h-[clamp(140px,26vh,260px)] w-full" />
      <div>
        <button
          type="button"
          onClick={onContinue}
          className={primaryActionClass}
          data-testid="reveal-continue"
        >
          {t("os.reveal.intro.continue")}
          <ActionArrow />
        </button>
      </div>
    </section>
  );
}

function useChooseAndBuild() {
  const { t } = useLocale();
  const navigate = useNavigate();
  const invalidate = useInvalidateFounder();
  return useMutation({
    mutationFn: (opportunityId: string) => chooseDirection({ data: { opportunityId } }),
    onSuccess: async (_res, opportunityId) => {
      await invalidate().catch(() => {});
      void navigate({ to: "/dashboard/roadmap/building", search: { opportunityId } });
    },
    onError: (err) => {
      console.error("[idea-reveal] choose failed:", err);
      toast.error(t("cc.chosen.error"));
    },
  });
}

function RevealMain({
  flagship: flagshipBrief,
  alternatives,
  readOnly,
}: {
  flagship: OpportunityBrief;
  alternatives: OpportunityBrief[];
  readOnly: boolean;
}) {
  const { t, locale } = useLocale();
  const navigate = useNavigate();
  const invalidate = useInvalidateFounder();
  const { direction: flagship } = useDirection(flagshipBrief);
  const choose = useChooseAndBuild();
  const [comparing, setComparing] = useState(false);
  const explore = useMutation({
    mutationFn: () => exploreMoreOpportunities({ data: { locale } }),
    onSuccess: async (res) => {
      await invalidate();
      toast.success(t("cc.explore.done", { n: res.added }));
      void navigate({ to: "/dashboard/opportunities" });
    },
    onError: (err) => {
      console.error("[idea-reveal] explore more failed:", err);
      toast.error(t("cc.explore.error"));
    },
  });
  if (!flagship) return null;
  const d = flagship.detail;
  const busy = choose.isPending || explore.isPending;

  return (
    <div className="flex flex-col gap-20 sm:gap-28" data-testid="idea-reveal">
      {/* 1 — The strongest direction, alone. */}
      <section
        data-testid="flagship"
        className="grid items-center gap-10 @4xl:min-h-[calc(100dvh-72px-6rem)] @4xl:grid-cols-[1.12fr_1fr] @4xl:gap-14"
      >
        <div className="flex flex-col gap-7 motion-safe:animate-[os-rise_0.7s_cubic-bezier(0.22,1,0.36,1)_both]">
          <OsEyebrow tone="champagne">{t("os.reveal.strongest")}</OsEyebrow>
          <OsDisplay size="title" data-testid="flagship-title">
            {flagship.title}
          </OsDisplay>
          <OsLead>{flagship.oneLiner}</OsLead>
          {flagship.why.length > 0 && (
            <div className="flex flex-col gap-3.5">
              <OsEyebrow>{t("os.reveal.whyFits")}</OsEyebrow>
              <OsPoints points={flagship.why} />
            </div>
          )}
          {!readOnly && (
            <div className="flex flex-col items-start gap-4 pt-1">
              <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                <button
                  type="button"
                  className={primaryActionClass}
                  onClick={() => choose.mutate(flagship.id)}
                  disabled={busy}
                  data-testid="flagship-choose"
                >
                  {choose.isPending && choose.variables === flagship.id ? (
                    <Loader2 className="size-5 animate-spin" aria-hidden="true" />
                  ) : null}
                  {t("os.reveal.build")}
                  <ActionArrow />
                </button>
                <Link
                  to="/dashboard/opportunities/$id"
                  params={{ id: flagship.id }}
                  search={{ tab: "offer" }}
                  className={textActionClass}
                  data-testid="flagship-explore"
                >
                  {t("os.reveal.seeHow")}
                  <ActionArrow />
                </Link>
              </div>
              <p className="text-[0.9375rem] text-[#454B59]">{t("os.reveal.notTrapped")}</p>
            </div>
          )}
        </div>
        <OsFrame className="p-4 sm:p-6">
          <BusinessGraphic
            kind={flagship.kind}
            nodes={flagship.nodes}
            label={flagship.graphicLabel}
            testId="flagship-graphic"
          />
        </OsFrame>
      </section>

      {/* 2 — Make it real: the first offer. */}
      {d && (
        <section
          data-testid="first-offer"
          className="grid gap-10 border-t border-[#171A27]/10 pt-14 @4xl:grid-cols-[1fr_1.1fr] @4xl:gap-14"
        >
          <div className="flex flex-col gap-5">
            <OsEyebrow tone="champagne">{t("os.reveal.firstOffer")}</OsEyebrow>
            <OsDisplay as="h2" size="section">
              {d.solutionHeadline}
            </OsDisplay>
            <OsLead>{d.solution}</OsLead>
            <div>
              <Link
                to="/dashboard/opportunities/$id"
                params={{ id: flagship.id }}
                search={{ tab: "offer" }}
                className={cn(
                  primaryActionClass,
                  "bg-transparent text-[#0B1F3B] ring-1 ring-[#0B1F3B]/25 hover:bg-[#0B1F3B]/[0.04]",
                )}
              >
                {t("os.reveal.seeHow")}
                <ActionArrow />
              </Link>
            </div>
          </div>
          <dl className="grid gap-x-10 gap-y-8 sm:grid-cols-2">
            <OfferFact label={t("os.reveal.sellTo")} value={d.customerHeadline} sub={d.customer} />
            <OfferFact label={t("os.reveal.earns")} value={d.moneyHeadline} />
            <OfferFact label={t("os.reveal.startingCost")} value={d.startingCapital} />
            <OfferFact label={t("os.reveal.time")} value={d.weeklyTime} />
            <OfferFact
              label={t("os.reveal.startWith")}
              value={d.firstExperiment}
              className="sm:col-span-2"
            />
          </dl>
        </section>
      )}

      {/* 3 — Then, smaller: the alternatives. */}
      {alternatives.length > 0 && (
        <section data-testid="alternatives" className="flex flex-col gap-10">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <OsDisplay as="h2" size="section">
              {alternatives.length === 1
                ? t("os.reveal.alsoFit.title.one")
                : t("os.reveal.alsoFit.title")}
              <span className="block text-[#454B59]">{t("os.reveal.alsoFit.sub")}</span>
            </OsDisplay>
            <button
              type="button"
              onClick={() => setComparing(true)}
              className={textActionClass}
              data-testid="compare-all"
            >
              {t("os.reveal.compare", { n: 1 + alternatives.length })}
              <ActionArrow />
            </button>
          </div>
          <div className="grid gap-6 @2xl:grid-cols-2">
            {alternatives.map((alt) => (
              <AlternativeTile
                key={alt.id}
                brief={alt}
                readOnly={readOnly}
                busy={busy}
                choosing={choose.isPending && choose.variables === alt.id}
                onChoose={() => choose.mutate(alt.id)}
              />
            ))}
          </div>
        </section>
      )}

      {!readOnly && (
        <div className="flex flex-col items-start gap-2 border-t border-[#171A27]/10 pt-8">
          <button
            type="button"
            onClick={() => explore.mutate()}
            disabled={busy}
            className={textActionClass}
            data-testid="explore-more"
          >
            {explore.isPending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
            {t("os.reveal.more")}
            <ActionArrow />
          </button>
          {explore.isPending && (
            <p role="status" className="text-[1rem] text-[#454B59]">
              {t("cc.explore.working")}
            </p>
          )}
        </div>
      )}

      <CompareSheet
        open={comparing}
        onOpenChange={setComparing}
        briefs={[flagshipBrief, ...alternatives]}
      />
    </div>
  );
}

function OfferFact({
  label,
  value,
  sub,
  className,
}: {
  label: string;
  value: string;
  sub?: string;
  className?: string;
}) {
  if (!value) return null;
  return (
    <div className={cn("min-w-0", className)}>
      <dt className="text-[0.875rem] font-semibold uppercase tracking-[0.12em] text-[#3C4250]">
        {label}
      </dt>
      <dd className="mt-2 text-[1.25rem] font-semibold leading-snug text-[#171A27]">{value}</dd>
      {sub && sub !== value && (
        <dd className="mt-1.5 text-[1rem] leading-snug text-[#454B59]">{sub}</dd>
      )}
    </div>
  );
}

function AlternativeTile({
  brief,
  readOnly,
  busy,
  choosing,
  onChoose,
}: {
  brief: OpportunityBrief;
  readOnly: boolean;
  busy: boolean;
  choosing: boolean;
  onChoose: () => void;
}) {
  const { t } = useLocale();
  const { direction } = useDirection(brief);
  if (!direction) return null;
  return (
    <article
      data-testid="alternative"
      className="flex flex-col gap-5 rounded-[24px] border border-[#171A27]/10 bg-white/70 p-6 sm:p-7"
    >
      <BusinessGraphic
        kind={direction.kind}
        nodes={direction.nodes}
        size="mini"
        label={direction.graphicLabel}
        className="rounded-xl border border-[#171A27]/[0.06] bg-[#FCFAF7]"
      />
      <div className="flex flex-col gap-2">
        <h3 className="font-os text-[1.5rem] font-medium uppercase leading-[1.05] tracking-[-0.02em] text-[#171A27]">
          {direction.title}
        </h3>
        <p className="text-[1rem] leading-snug text-[#2A2F3B]">{direction.oneLiner}</p>
      </div>
      <OsPoints points={direction.why} />
      <div className="mt-auto flex flex-wrap items-center gap-x-6 gap-y-2 pt-2">
        <Link
          to="/dashboard/opportunities/$id"
          params={{ id: direction.id }}
          className={textActionClass}
          data-testid="alternative-explore"
        >
          {t("os.reveal.explore")}
          <ActionArrow />
        </Link>
        {!readOnly && (
          <button
            type="button"
            onClick={onChoose}
            disabled={busy}
            className={cn(textActionClass, "text-[#454B59]")}
            data-testid="alternative-choose"
          >
            {choosing && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
            {t("os.reveal.chooseThis")}
          </button>
        )}
      </div>
    </article>
  );
}

const STATUS_WORD: Record<FitStatus, MessageKey> = {
  strong: "os.level.strong",
  moderate: "os.level.medium",
  conditional: "os.level.weak",
};

/** The three directions side by side, in plain words — no scores. */
function CompareSheet({
  open,
  onOpenChange,
  briefs,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  briefs: OpportunityBrief[];
}) {
  const { t } = useLocale();
  const ids = briefs.map((b) => b.id);
  const fits = useFounderFits(ids, open);
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        data-testid="compare-sheet"
        className="w-full max-w-[min(100vw,60rem)] overflow-y-auto border-[#171A27]/10 bg-[#FCFAF7] p-6 sm:max-w-[min(100vw,60rem)] sm:p-10"
      >
        <SheetTitle className="font-os text-[clamp(1.6rem,1.2rem+1.4vw,2.4rem)] font-medium uppercase leading-[1] tracking-[-0.03em] text-[#171A27]">
          {t("os.reveal.compareTitle")}
        </SheetTitle>
        <SheetDescription className="mt-3 text-[1.0625rem] text-[#2A2F3B]">
          {t("os.reveal.compareBody")}
        </SheetDescription>
        <div className="mt-8 overflow-x-auto">
          <table
            className="w-full min-w-[36rem] border-collapse text-left"
            data-testid="compare-table"
          >
            <thead>
              <tr>
                <th className="w-[11rem]" />
                {briefs.map((b, i) => (
                  <CompareHead
                    key={b.id}
                    brief={b}
                    lead={i === 0}
                    fit={fits.data?.[b.id]?.overall}
                  />
                ))}
              </tr>
            </thead>
            <tbody>
              <CompareRow
                label={t("os.reveal.compare.cost")}
                briefs={briefs}
                pick={(d) => d.detail?.startingCapital}
              />
              <CompareRow
                label={t("os.reveal.compare.time")}
                briefs={briefs}
                pick={(d) => d.detail?.weeklyTime}
              />
              <CompareRow
                label={t("os.reveal.compare.difficulty")}
                briefs={briefs}
                pick={(d) => (d.detail ? t(DIFFICULTY_WORD[d.detail.difficulty]) : null)}
              />
              {(
                [
                  ["capability", "os.reveal.compare.skills"],
                  ["resources", "os.reveal.compare.money"],
                  ["access", "os.reveal.compare.access"],
                ] as const
              ).map(([key, label]) => (
                <tr key={key} className="border-t border-[#171A27]/10">
                  <th
                    scope="row"
                    className="py-4 pr-4 text-[0.875rem] font-semibold uppercase tracking-[0.1em] text-[#3C4250]"
                  >
                    {t(label)}
                  </th>
                  {briefs.map((b) => {
                    const status = fits.data?.[b.id]?.rows.find((r) => r.key === key)?.status;
                    return (
                      <td
                        key={b.id}
                        className="py-4 pr-4 text-[1.0625rem] font-semibold text-[#171A27]"
                      >
                        {status ? (
                          <span className="inline-flex items-center gap-2">
                            <span
                              aria-hidden="true"
                              className={cn(
                                "size-2 rounded-full",
                                status === "strong" && "bg-[#B8924F]",
                                status === "moderate" && "bg-[#2F62D9]",
                                status === "conditional" && "border border-[#454B59]",
                              )}
                            />
                            {t(STATUS_WORD[status])}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function CompareHead({
  brief,
  lead,
  fit,
}: {
  brief: OpportunityBrief;
  lead: boolean;
  fit: FitStatus | undefined;
}) {
  const { t } = useLocale();
  const { direction } = useDirection(brief);
  return (
    <th scope="col" className="pb-5 pr-4 align-bottom">
      {lead && (
        <span className="mb-2 block text-[0.875rem] font-semibold uppercase tracking-[0.12em] text-[#7A5B2B]">
          {t("os.reveal.recommended")}
        </span>
      )}
      <span className="block text-[1.0625rem] font-semibold leading-snug text-[#171A27]">
        {direction?.title ?? brief.title}
      </span>
      {fit && (
        <span className="mt-1 block text-[0.875rem] font-medium text-[#454B59]">
          {t(FIT_WORD[fit])}
        </span>
      )}
    </th>
  );
}

function CompareRow({
  label,
  briefs,
  pick,
}: {
  label: string;
  briefs: OpportunityBrief[];
  pick: (d: Direction) => string | null | undefined;
}) {
  return (
    <tr className="border-t border-[#171A27]/10">
      <th
        scope="row"
        className="py-4 pr-4 text-[0.875rem] font-semibold uppercase tracking-[0.1em] text-[#3C4250]"
      >
        {label}
      </th>
      {briefs.map((b) => (
        <CompareCell key={b.id} brief={b} pick={pick} />
      ))}
    </tr>
  );
}

function CompareCell({
  brief,
  pick,
}: {
  brief: OpportunityBrief;
  pick: (d: Direction) => string | null | undefined;
}) {
  const { direction } = useDirection(brief);
  return (
    <td className="py-4 pr-4 text-[1.0625rem] font-semibold leading-snug text-[#171A27]">
      {(direction && pick(direction)) || "—"}
    </td>
  );
}
