import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowRight, Loader2, RefreshCw } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { SolventiaLoadingState } from "@/components/dashboard/SolventiaLoadingState";
import { FitRing, FitScoreMatrix, fitQualitativeLabel } from "@/components/dashboard/FitScore";
import { EvidenceVault } from "@/components/dashboard/EvidenceVault";
import { PremiumButton } from "@/components/solventia/PremiumButton";
import { Button } from "@/components/ui/button";
import { requireAuthLoader } from "@/lib/route-guards";
import {
  getOpportunity,
  refreshMarketEvidence,
  submitIdeaFeedback,
  switchSelectedOpportunity,
} from "@/lib/actions/opportunities";
import { toDisplayDetail, getFitFactors } from "@/lib/opportunity-display";
import type { OpportunityPackage, OpportunityDetail, MarketEvidenceItem } from "@/lib/ai/schemas";
import type { FitScoreResult } from "@/lib/profile/scoring";
import { formatCompactMoney } from "@/lib/country-currency";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dashboard/opportunities/$id")({
  beforeLoad: requireAuthLoader,
  component: OpportunityDetailPage,
  head: () => ({ meta: [{ name: "robots", content: "noindex" }] }),
});

const EVIDENCE_TONE: Record<MarketEvidenceItem["label"], { label: string; dot: string }> = {
  strong_signal: { label: "Strong", dot: "bg-econ-green-active" },
  early_signal: { label: "Early signal", dot: "bg-econ-green" },
  emerging: { label: "Emerging", dot: "bg-sol-champagne" },
  competitive: { label: "Competitive", dot: "bg-sol-violet" },
  needs_validation: { label: "Needs validation", dot: "bg-sol-muted" },
  limited_evidence: { label: "Limited evidence", dot: "bg-sol-muted/50" },
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

// Five views, exactly: Overview / Founder Fit / Market / Economics / Proof.
// Still a single scrolling page with a sticky jump nav (not hide/show
// tabs) — DashboardShell's own "Proof" nav item already links here via
// `#evidence`, so the Proof view keeps that exact id rather than
// introducing a second, disconnected id for the same destination.
const SECTION_NAV = [
  { id: "overview", label: "Overview" },
  { id: "founder-fit", label: "Founder Fit" },
  { id: "market", label: "Market" },
  { id: "economics", label: "Economics" },
  { id: "evidence", label: "Proof" },
];

function FlowStep({ label, value, isLast }: { label: string; value: string; isLast?: boolean }) {
  return (
    <div className="flex flex-1 flex-col items-center gap-2 sm:flex-row sm:items-stretch">
      <div className="flex w-full flex-col items-center rounded-xl border border-sol-border bg-sol-surface px-4 py-4 text-center">
        <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-sol-muted">
          {label}
        </p>
        <p className="mt-1.5 text-[0.88rem] font-medium leading-snug text-sol-ink">{value}</p>
      </div>
      {!isLast && (
        <div className="flex items-center justify-center py-1 sm:py-0">
          <ArrowRight
            className="size-4 rotate-90 text-sol-champagne-deep sm:rotate-0"
            aria-hidden="true"
          />
        </div>
      )}
    </div>
  );
}

function BulletList({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  return (
    <ul className="flex flex-col gap-1.5">
      {items.map((item) => (
        <li key={item} className="flex gap-2 text-[0.9rem] leading-relaxed text-sol-ink">
          <span className="mt-1.5 size-1 shrink-0 rounded-full bg-sol-champagne" />
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

  const refreshEvidenceMutation = useMutation({
    mutationFn: () => refreshMarketEvidence({ data: { opportunityId: id } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["opportunity", id] });
      toast.success("Market evidence refreshed.");
    },
    onError: (err) => {
      console.error("[opportunity] refresh evidence failed:", err);
      toast.error("Couldn't refresh market evidence — try again.");
    },
  });

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

  // Selecting an idea costs zero Gemini calls — it only changes which
  // opportunity is primary and archives whatever roadmap was active
  // (never deletes it — it can be revisited later). Building a roadmap
  // for THIS idea is a separate, explicit next step (buildRoadmap below),
  // so a founder never pays AI cost for switching their mind.
  async function selectThisOpportunity() {
    setBusy("select");
    try {
      await switchSelectedOpportunity({ data: { opportunityId: id } });
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      await queryClient.invalidateQueries({ queryKey: ["opportunity", id] });
      toast.success(
        "Set as your primary direction. Your previous roadmap, if any, has been archived — you can revisit it anytime.",
      );
    } catch (err) {
      console.error("[opportunity] select failed:", err);
      toast.error("Sol couldn't select this opportunity right now — try again.");
    } finally {
      setBusy(null);
    }
  }

  // Generation itself happens on its own dedicated full-page route, not
  // inline here — see /dashboard/roadmap/building.
  function buildRoadmap() {
    navigate({ to: "/dashboard/roadmap/building", search: { opportunityId: id } });
  }

  if (query.isLoading) {
    return (
      <DashboardShell opportunityId={id}>
        <div className="flex min-h-[50vh] items-center justify-center">
          <SolventiaLoadingState message="Opening this opportunity…" />
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

  const { opportunity, detail: detailJson, evidence, founderSummary, hasRoadmap } = query.data;
  const detail = toDisplayDetail(detailJson as unknown as OpportunityPackage | OpportunityDetail);
  const candidate = opportunity.candidate as unknown as OpportunityPackage;
  const score = opportunity.score_breakdown as unknown as FitScoreResult;
  const isSelected = opportunity.status === "selected";
  const fitFactors = getFitFactors(candidate);

  // "Why You" match rows — every value is real, already-stored data, never
  // fabricated: the founder's own signals against this opportunity's real
  // fitSignals (the same numbers the deterministic fit score is computed
  // from — see profile/scoring.ts).
  const matchRows: { you: string; match: "yes" | "gap"; needs: string }[] = [];
  if (founderSummary) {
    matchRows.push({
      you: `${founderSummary.weeklyHours || "0"} hrs/week available`,
      match: founderSummary.weeklyHours >= fitFactors.weeklyHoursNeeded ? "yes" : "gap",
      needs: `Needs ~${fitFactors.weeklyHoursNeeded} hrs/week`,
    });
    matchRows.push({
      you: `${formatCompactMoney(founderSummary.capitalAmount, founderSummary.currency)} available`,
      match: founderSummary.capitalAmount >= fitFactors.startupCapitalAmount ? "yes" : "gap",
      needs: `Needs ~${formatCompactMoney(fitFactors.startupCapitalAmount, founderSummary.currency)}`,
    });
    for (const req of fitFactors.requiredSkills.slice(0, 3)) {
      const owned = founderSummary.skills.some(
        (s) => s.toLowerCase().trim() === req.name.toLowerCase().trim(),
      );
      matchRows.push({
        you: owned ? req.name : `${req.name} — not yet listed`,
        match: owned ? "yes" : "gap",
        needs: `Needs ${req.name}`,
      });
    }
  }

  return (
    <DashboardShell opportunityId={id} opportunityTitle={candidate.title} hasRoadmap={hasRoadmap}>
      {/* ===== TOP ===== */}
      <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-sol-champagne-deep">
        {candidate.category}
      </p>
      <h1 className="mt-2 font-display text-[clamp(1.9rem,3.4vw,2.5rem)] font-semibold leading-tight text-sol-ink">
        {opportunity.title}
      </h1>
      <p className="mt-2.5 max-w-2xl text-[1.02rem] leading-relaxed text-sol-secondary">
        {opportunity.one_liner}
      </p>

      <div className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-sol-border bg-sol-border sm:grid-cols-4">
        {[
          { label: "Fit", value: `${opportunity.fit_score}/100` },
          { label: "Capital", value: detail.startingCapital },
          { label: "Time", value: detail.weeklyTime },
          { label: "Difficulty", value: detail.difficulty },
        ].map((cell) => (
          <div key={cell.label} className="bg-sol-surface px-4 py-3.5">
            <p className="text-[0.6rem] font-semibold uppercase tracking-[0.1em] text-sol-muted">
              {cell.label}
            </p>
            <p className="mt-1 truncate text-[0.9rem] font-semibold text-sol-ink">{cell.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        {isSelected ? (
          <button
            type="button"
            onClick={buildRoadmap}
            className="inline-flex items-center gap-2 rounded-xl bg-sol-navy px-5 py-2.5 text-[0.85rem] font-semibold text-white transition-colors hover:bg-sol-navy-soft"
          >
            Build My Roadmap
            <ArrowRight className="size-4 text-sol-champagne" aria-hidden="true" />
          </button>
        ) : (
          <PremiumButton
            tone="outline"
            shape="rounded"
            size="sm"
            onClick={selectThisOpportunity}
            disabled={busy === "select"}
          >
            {busy === "select" && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
            Select this as my opportunity
          </PremiumButton>
        )}
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
              className="rounded-full border border-sol-border px-3 py-1.5 text-[0.8rem] text-sol-secondary hover:border-sol-champagne/50 hover:text-sol-ink"
            >
              {reason}
            </button>
          ))}
        </div>
      )}

      {/* ===== 5-VIEW JUMP NAV — Overview / Founder Fit / Market /
       * Economics / Proof, exactly. Still one scrolling page (not
       * hide/show tabs) so DashboardShell's own Proof nav item, which
       * links straight to #evidence, keeps working unchanged. ===== */}
      <nav className="sticky top-[69px] z-10 -mx-5 mt-8 flex gap-1 overflow-x-auto border-b border-sol-border bg-sol-pearl/95 px-5 py-2 backdrop-blur-xl sm:-mx-8 sm:px-8 lg:sticky lg:top-0 lg:-mx-12 lg:px-12">
        {SECTION_NAV.map((s) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            className="shrink-0 rounded-full px-3.5 py-1.5 text-[0.82rem] font-medium text-sol-secondary transition-colors hover:bg-sol-violet-mist hover:text-sol-violet-deep"
          >
            {s.label}
          </a>
        ))}
      </nav>

      {/* ===== 1. OVERVIEW — what this is ===== */}
      <section id="overview" className="scroll-mt-24 pt-8">
        <h2 className="font-display text-[1.2rem] font-semibold text-sol-ink">Overview</h2>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:gap-3">
          <FlowStep label="Problem" value={detail.problem} />
          <FlowStep label="Your Service" value={detail.solution} />
          <FlowStep label="Customer" value={detail.customer} />
          <FlowStep label="Revenue" value={detail.revenuePath} isLast />
        </div>
      </section>

      {/* ===== 2. FOUNDER FIT — why this fits you specifically ===== */}
      <section id="founder-fit" className="scroll-mt-24 border-t border-sol-border pt-8 mt-8">
        <h2 className="font-display text-[1.2rem] font-semibold text-sol-ink">Founder Fit</h2>
        <div className="mt-4 flex flex-col gap-6 rounded-2xl border border-sol-border bg-sol-surface p-6 sm:flex-row sm:items-start sm:gap-10">
          <div className="flex shrink-0 flex-col items-center gap-2 sm:items-start">
            <FitRing score={opportunity.fit_score} size={112} />
            <span className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-sol-champagne-deep">
              {fitQualitativeLabel(opportunity.fit_score)}
            </span>
          </div>
          <div className="w-full sm:border-l sm:border-sol-border sm:pl-10">
            <FitScoreMatrix breakdown={score.breakdown} />
          </div>
        </div>

        {matchRows.length > 0 && (
          <div className="mt-5 overflow-hidden rounded-2xl border border-sol-border">
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 bg-sol-ivory px-4 py-2 text-[0.65rem] font-semibold uppercase tracking-wide text-sol-muted sm:gap-4">
              <span>You</span>
              <span />
              <span className="text-right">This Business</span>
            </div>
            {matchRows.map((row, i) => (
              <div
                key={i}
                className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 border-t border-sol-border px-4 py-3 text-[0.85rem] sm:gap-4"
              >
                <span className="text-sol-ink">{row.you}</span>
                <span
                  className={cn(
                    "flex size-5 shrink-0 items-center justify-center rounded-full text-[0.7rem] font-bold",
                    row.match === "yes"
                      ? "bg-econ-green-active/15 text-econ-green-active"
                      : "bg-sol-champagne/15 text-sol-champagne-deep",
                  )}
                >
                  {row.match === "yes" ? "✓" : "△"}
                </span>
                <span className="text-right text-sol-secondary">{row.needs}</span>
              </div>
            ))}
          </div>
        )}
        <div className="mt-5">
          <BulletList items={detail.whyThisFounder} />
        </div>
      </section>

      {/* ===== 3. MARKET — real external signal, never invented ===== */}
      <section id="market" className="scroll-mt-24 border-t border-sol-border pt-8 mt-8">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-[1.2rem] font-semibold text-sol-ink">Market</h2>
          <button
            type="button"
            onClick={() => refreshEvidenceMutation.mutate()}
            disabled={refreshEvidenceMutation.isPending}
            className="flex items-center gap-1.5 text-[0.78rem] font-medium text-sol-violet-deep hover:underline disabled:opacity-50"
          >
            {refreshEvidenceMutation.isPending ? (
              <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <RefreshCw className="size-3.5" aria-hidden="true" />
            )}
            Refresh Market Evidence
          </button>
        </div>
        <div className="mt-4 flex flex-col gap-2.5">
          {evidence.length === 0 && (
            <p className="text-[0.85rem] text-sol-secondary">
              No external evidence yet — click "Refresh Market Evidence" to have Sol search for real
              signals.
            </p>
          )}
          {evidence.map((item) => {
            const tone = EVIDENCE_TONE[item.label];
            return (
              <div key={item.id} className="rounded-xl border border-sol-border p-3.5">
                <div className="flex items-start gap-2.5">
                  <span
                    className={cn("mt-1.5 size-1.5 shrink-0 rounded-full", tone.dot)}
                    aria-hidden="true"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[0.68rem] font-semibold uppercase tracking-wide text-sol-muted">
                      {tone.label}
                    </p>
                    <p className="mt-0.5 text-[0.88rem] text-sol-ink">{item.claim}</p>
                    {item.source_url && (
                      <a
                        href={item.source_url}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="mt-1 inline-block text-[0.76rem] text-sol-violet-deep hover:underline"
                      >
                        {item.source_title ?? item.source_url}
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ===== 4. ECONOMICS — how the money works ===== */}
      <section id="economics" className="scroll-mt-24 border-t border-sol-border pt-8 mt-8">
        <h2 className="font-display text-[1.2rem] font-semibold text-sol-ink">Economics</h2>
        <p className="mt-3 text-[0.92rem] leading-relaxed text-sol-ink">{detail.businessModel}</p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:gap-3">
          <FlowStep label="Start" value={detail.startingCapital} />
          <FlowStep label="First Move" value={detail.firstExperiment} />
          <FlowStep label="Revenue" value={detail.revenuePath} isLast />
        </div>
        {(detail.advantages.length > 0 || detail.tradeoffs.length > 0) && (
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            {detail.advantages.length > 0 && (
              <div>
                <p className="text-[0.7rem] font-semibold uppercase tracking-wide text-sol-muted">
                  Advantages
                </p>
                <div className="mt-2">
                  <BulletList items={detail.advantages} />
                </div>
              </div>
            )}
            {detail.tradeoffs.length > 0 && (
              <div>
                <p className="text-[0.7rem] font-semibold uppercase tracking-wide text-sol-muted">
                  Trade-offs
                </p>
                <div className="mt-2">
                  <BulletList items={detail.tradeoffs} />
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* ===== 5. PROOF — is this actually working / what's the risk ===== */}
      <section id="evidence" className="scroll-mt-24 border-t border-sol-border pt-8 mt-8">
        <h2 className="font-display text-[1.2rem] font-semibold text-sol-ink">
          Proof &amp; What Still Needs Validation
        </h2>
        <div className="mt-4 grid gap-5 sm:grid-cols-2">
          {detail.risks.length > 0 && (
            <div>
              <p className="text-[0.7rem] font-semibold uppercase tracking-wide text-sol-muted">
                Risks
              </p>
              <div className="mt-2">
                <BulletList items={detail.risks} />
              </div>
            </div>
          )}
          {detail.validationNeeded.length > 0 && (
            <div>
              <p className="text-[0.7rem] font-semibold uppercase tracking-wide text-sol-muted">
                Needs Validation
              </p>
              <div className="mt-2">
                <BulletList items={detail.validationNeeded} />
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 rounded-[18px] border border-sol-champagne/25 bg-sol-champagne-soft/40 p-6 sm:p-7">
          <p className="text-[0.78rem] font-semibold uppercase tracking-wide text-sol-champagne-deep">
            Your First Experiment
          </p>
          <p className="mt-2 text-[0.95rem] leading-relaxed text-sol-ink">
            {detail.firstExperiment}
          </p>
        </div>

        <div className="mt-6">
          <EvidenceVault opportunityId={id} />
        </div>
      </section>

      <div className="mt-8 flex flex-col items-center gap-3 text-center">
        <p className="text-[0.85rem] text-sol-secondary">
          {isSelected
            ? "This is your primary direction — build a roadmap to start executing."
            : "Ready to commit to this opportunity?"}
        </p>
        {isSelected && (
          <button
            type="button"
            onClick={buildRoadmap}
            className="inline-flex items-center gap-2 rounded-xl bg-sol-navy px-6 py-3.5 text-[0.92rem] font-semibold text-white transition-colors hover:bg-sol-navy-soft"
          >
            Build My Roadmap
            <ArrowRight className="size-4 text-sol-champagne" aria-hidden="true" />
          </button>
        )}
        {!isSelected && (
          <PremiumButton
            tone="solid"
            shape="rounded"
            size="lg"
            onClick={selectThisOpportunity}
            disabled={busy === "select"}
          >
            {busy === "select" && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
            Select this as my opportunity
          </PremiumButton>
        )}
      </div>
    </DashboardShell>
  );
}
