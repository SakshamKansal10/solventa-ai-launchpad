import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { FitScoreMatrix, fitQualitativeLabel } from "@/components/dashboard/FitScore";
import { PremiumButton } from "@/components/solventia/PremiumButton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { requireAuthLoader } from "@/lib/route-guards";
import {
  getOpportunity,
  submitIdeaFeedback,
  switchSelectedOpportunity,
} from "@/lib/actions/opportunities";
import { toDisplayDetail } from "@/lib/opportunity-display";
import type { OpportunityPackage, OpportunityDetail, MarketEvidenceItem } from "@/lib/ai/schemas";
import type { FitScoreResult } from "@/lib/profile/scoring";

export const Route = createFileRoute("/dashboard/opportunities/$id")({
  beforeLoad: requireAuthLoader,
  component: OpportunityDetailPage,
  head: () => ({ meta: [{ name: "robots", content: "noindex" }] }),
});

const EVIDENCE_LABELS: Record<MarketEvidenceItem["label"], string> = {
  strong_signal: "Strong signal",
  early_signal: "Early signal",
  emerging: "Emerging",
  competitive: "Competitive",
  needs_validation: "Needs validation",
  limited_evidence: "Limited evidence",
};

const DISMISS_REASONS = [
  "Too expensive",
  "Doesn't interest me",
  "Too difficult",
  "Doesn't fit my time",
  "Doesn't fit my location",
  "Not aligned with my goals",
  "Other",
];

function Section({
  title,
  id,
  children,
}: {
  title: string;
  id?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className="scroll-mt-24 border-t border-border/60 py-6 first:border-t-0 first:pt-0"
    >
      <h2 className="text-[0.82rem] font-semibold uppercase tracking-wide text-accent">{title}</h2>
      <div className="mt-2.5 text-[0.95rem] leading-relaxed text-foreground">{children}</div>
    </section>
  );
}

function BulletList({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  return (
    <ul className="flex flex-col gap-1.5">
      {items.map((item) => (
        <li key={item} className="flex gap-2">
          <span className="mt-1.5 size-1 shrink-0 rounded-full bg-accent" />
          {item}
        </li>
      ))}
    </ul>
  );
}

function OpportunityDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["opportunity", id],
    queryFn: () => getOpportunity({ data: { id } }),
  });

  const [showReasons, setShowReasons] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  async function giveFeedback(
    feedback: "interested" | "maybe_later" | "not_for_me" | "saved",
    reason?: string,
  ) {
    setBusy(feedback);
    try {
      await submitIdeaFeedback({ data: { opportunityId: id, feedback, reason } });
      setShowReasons(false);
      await queryClient.invalidateQueries({ queryKey: ["opportunity", id] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    } catch (err) {
      console.error("[opportunity] feedback failed:", err);
      toast.error("Couldn't save your feedback — try again.");
    } finally {
      setBusy(null);
    }
  }

  async function selectThisOpportunity() {
    setBusy("select");
    try {
      // Switching opportunities costs zero Gemini calls — this
      // opportunity's roadmap was already fully built when it was
      // generated (see roadmap-persistence.server.ts's activateRoadmap).
      await switchSelectedOpportunity({ data: { opportunityId: id } });
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      navigate({ to: "/dashboard/roadmap" });
    } catch (err) {
      console.error("[opportunity] select failed:", err);
      toast.error("Sol couldn't select this opportunity right now — try again.");
    } finally {
      setBusy(null);
    }
  }

  if (query.isLoading) {
    return (
      <DashboardShell opportunityId={id}>
        <div className="flex min-h-[50vh] items-center justify-center text-muted-foreground">
          <Loader2 className="mr-2 size-5 animate-spin" aria-hidden="true" />
          Loading opportunity…
        </div>
      </DashboardShell>
    );
  }

  if (!query.data) {
    return (
      <DashboardShell opportunityId={id}>
        <p className="text-muted-foreground">Couldn&rsquo;t load this opportunity.</p>
      </DashboardShell>
    );
  }

  const { opportunity, detail: detailJson, evidence } = query.data;
  const detail = toDisplayDetail(detailJson as unknown as OpportunityPackage | OpportunityDetail);
  const score = opportunity.score_breakdown as unknown as FitScoreResult;
  const isSelected = opportunity.status === "selected";

  return (
    <DashboardShell opportunityId={id}>
      <p className="eyebrow text-accent">
        {(opportunity.candidate as unknown as OpportunityPackage).category}
      </p>
      <h1 className="mt-2 font-display text-[clamp(1.8rem,3vw,2.4rem)] font-semibold text-primary">
        {opportunity.title}
      </h1>
      <p className="mt-2 text-[1.02rem] text-muted-foreground">{opportunity.one_liner}</p>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <PremiumButton
          tone={isSelected ? "outline" : "solid"}
          shape="rounded"
          size="sm"
          onClick={selectThisOpportunity}
          disabled={busy === "select" || isSelected}
        >
          {busy === "select" && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
          {isSelected ? "This is your selected opportunity" : "Select this as my opportunity"}
        </PremiumButton>
        <Button
          variant="outline"
          size="sm"
          disabled={busy === "interested"}
          onClick={() => giveFeedback("interested")}
        >
          Interested
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={busy === "maybe_later"}
          onClick={() => giveFeedback("maybe_later")}
        >
          Maybe later
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={busy === "saved"}
          onClick={() => giveFeedback("saved")}
        >
          Save
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setShowReasons((v) => !v)}>
          Not for me
        </Button>
      </div>

      {showReasons && (
        <div className="mt-3 flex flex-wrap gap-2">
          {DISMISS_REASONS.map((reason) => (
            <button
              key={reason}
              type="button"
              onClick={() => giveFeedback("not_for_me", reason)}
              className="rounded-full border border-border px-3 py-1.5 text-[0.8rem] text-muted-foreground hover:border-primary/30 hover:text-primary"
            >
              {reason}
            </button>
          ))}
        </div>
      )}

      <div className="mt-8 flex flex-col gap-6 rounded-2xl border border-border/70 bg-card/70 p-6 sm:flex-row sm:items-start sm:gap-10">
        <div className="flex shrink-0 flex-col items-center sm:items-start">
          <span className="font-display text-[2.75rem] font-semibold leading-none text-primary">
            {opportunity.fit_score}
          </span>
          <span className="mt-1.5 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-econ-green-active">
            {fitQualitativeLabel(opportunity.fit_score)}
          </span>
        </div>
        <div className="w-full sm:border-l sm:border-border/60 sm:pl-10">
          <FitScoreMatrix breakdown={score.breakdown} />
        </div>
      </div>

      <div className="mt-8 rounded-[1.5rem] border border-border/70 bg-card/60 p-6">
        <Section title="The Opportunity">{detail.summary}</Section>
        <Section title="The Problem">{detail.problem}</Section>
        <Section title="Who It Is For">{detail.customer}</Section>
        <Section title="Why This Fits You">
          <BulletList items={detail.whyThisFounder} />
        </Section>
        <Section title="What You Already Have">
          <BulletList items={detail.skillsAlreadyOwned} />
        </Section>
        <Section title="What You Still Need">
          <BulletList items={detail.skillsToLearn} />
        </Section>
        <Section title="Starting Requirements">
          <dl className="grid grid-cols-2 gap-3 text-[0.9rem] sm:grid-cols-4">
            <div>
              <dt className="text-muted-foreground">Capital</dt>
              <dd className="font-medium">{detail.startingCapital}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Time</dt>
              <dd className="font-medium">{detail.weeklyTime}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Difficulty</dt>
              <dd className="font-medium">{detail.difficulty}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Equipment</dt>
              <dd className="font-medium">{detail.resourceRequirements.join(", ") || "—"}</dd>
            </div>
          </dl>
        </Section>
        <Section title="How It Can Make Money">{detail.businessModel}</Section>
        {(detail.advantages.length > 0 || detail.tradeoffs.length > 0) && (
          <Section title="Advantages & Trade-offs">
            <div className="grid gap-4 sm:grid-cols-2">
              <BulletList items={detail.advantages} />
              <BulletList items={detail.tradeoffs} />
            </div>
          </Section>
        )}
        <Section title="Market Signals" id="market-signals">
          <div className="flex flex-col gap-3">
            {evidence.length === 0 && (
              <p className="text-[0.85rem] text-muted-foreground">
                Current external evidence has not been fetched yet.
              </p>
            )}
            {evidence.map((item) => (
              <div key={item.id} className="rounded-xl border border-border/60 p-3.5">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-[0.9rem] text-foreground">{item.claim}</p>
                  <Badge variant="secondary" className="shrink-0">
                    {EVIDENCE_LABELS[item.label]}
                  </Badge>
                </div>
                {item.source_url && (
                  <a
                    href={item.source_url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="mt-1.5 inline-block text-[0.78rem] text-accent hover:underline"
                  >
                    {item.source_title ?? item.source_url}
                  </a>
                )}
              </div>
            ))}
          </div>
        </Section>
        <Section title="Risks">
          <BulletList items={detail.risks} />
        </Section>
        <Section title="What Still Needs Validation">
          <BulletList items={detail.validationNeeded} />
        </Section>
      </div>

      <div className="mt-6 rounded-[1.5rem] border border-econ-green/25 bg-econ-green-soft/50 p-6 sm:p-7">
        <p className="text-[0.78rem] font-semibold uppercase tracking-wide text-econ-green-deep">
          Your First Experiment
        </p>
        <p className="mt-2 text-[0.95rem] leading-relaxed text-foreground">
          {detail.firstExperiment}
        </p>
      </div>

      <div className="mt-8 flex flex-col items-center gap-3 text-center">
        <p className="text-[0.85rem] text-muted-foreground">
          {isSelected ? "This is your current path." : "Ready to commit to this opportunity?"}
        </p>
        <PremiumButton
          tone={isSelected ? "outline" : "solid"}
          shape="rounded"
          size="lg"
          onClick={selectThisOpportunity}
          disabled={busy === "select" || isSelected}
        >
          {busy === "select" && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
          {isSelected ? "This is your selected opportunity" : "Select this as my opportunity"}
        </PremiumButton>
      </div>
    </DashboardShell>
  );
}
