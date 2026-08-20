import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowRight, Compass, Loader2, Sparkles } from "lucide-react";
import { DashboardShell, useOpenMentor } from "@/components/dashboard/DashboardShell";
import {
  FitRing,
  FitScoreBreakdownList,
  fitQualitativeLabel,
} from "@/components/dashboard/FitScore";
import { RoadmapStageTimeline } from "@/components/dashboard/RoadmapStageTimeline";
import { BusinessDnaPanel } from "@/components/dashboard/BusinessDnaPanel";
import { PremiumButton } from "@/components/solventia/PremiumButton";
import { Button } from "@/components/ui/button";
import { requireAuthLoader } from "@/lib/route-guards";
import { getDashboard } from "@/lib/actions/dashboard";
import { exploreMoreOpportunities, switchSelectedOpportunity } from "@/lib/actions/opportunities";
import { getFitFactors, getWhyReasons } from "@/lib/opportunity-display";
import { getConstraintWarnings, type FitScoreResult } from "@/lib/profile/scoring";
import type { OpportunityCandidate, OpportunityPackage } from "@/lib/ai/schemas";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dashboard/")({
  beforeLoad: requireAuthLoader,
  component: DashboardHome,
  head: () => ({
    meta: [{ title: "Dashboard — Solventia" }, { name: "robots", content: "noindex" }],
  }),
});

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function DashboardHome() {
  const queryClient = useQueryClient();
  const dashboardQuery = useQuery({ queryKey: ["dashboard"], queryFn: () => getDashboard() });
  const [exploring, setExploring] = useState(false);
  const [switching, setSwitching] = useState<string | null>(null);
  const [showBreakdown, setShowBreakdown] = useState(false);

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  }

  async function handleExploreMore() {
    setExploring(true);
    try {
      await exploreMoreOpportunities();
      await refresh();
      toast.success("Sol found a few more directions worth considering.");
    } catch (err) {
      console.error("[dashboard] explore more failed:", err);
      toast.error("Sol couldn't find more opportunities right now — try again in a moment.");
    } finally {
      setExploring(false);
    }
  }

  async function handleSwitch(opportunityId: string) {
    setSwitching(opportunityId);
    try {
      await switchSelectedOpportunity({ data: { opportunityId } });
      await refresh();
    } catch (err) {
      console.error("[dashboard] switch opportunity failed:", err);
      toast.error("Couldn't switch opportunities — try again.");
    } finally {
      setSwitching(null);
    }
  }

  if (dashboardQuery.isLoading) {
    return (
      <DashboardShell>
        <div className="flex min-h-[50vh] items-center justify-center text-muted-foreground">
          <Loader2 className="mr-2 size-5 animate-spin" aria-hidden="true" />
          Loading your dashboard…
        </div>
      </DashboardShell>
    );
  }

  const data = dashboardQuery.data;
  if (!data) {
    return (
      <DashboardShell>
        <p className="text-muted-foreground">Something went wrong loading your dashboard.</p>
      </DashboardShell>
    );
  }

  const displayName =
    data.profile?.full_name?.split(" ")[0] || data.profile?.email?.split("@")[0] || "there";
  const primary = data.primary;
  const alternatives = data.alternatives;
  const primaryCandidate = primary
    ? (primary.candidate as unknown as OpportunityPackage | OpportunityCandidate)
    : null;
  const constraintWarnings =
    primaryCandidate && data.businessDna
      ? getConstraintWarnings(data.businessDna.signals, getFitFactors(primaryCandidate))
      : [];

  return (
    <DashboardShell opportunityId={data.selected?.id ?? primary?.id ?? null}>
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-[clamp(1.7rem,3vw,2.2rem)] font-semibold leading-tight text-primary">
          {greeting()}, {displayName}.
        </h1>
        <p className="text-[0.95rem] text-muted-foreground">
          {primary ? `You're currently validating ${primary.title}.` : "Your next move is ready."}
        </p>
      </div>

      {!primary && !data.selected ? (
        <section className="mt-10 rounded-[1.75rem] border border-border/70 bg-card/80 px-8 py-12 text-center">
          <Compass className="mx-auto size-8 text-accent" aria-hidden="true" />
          <h2 className="mt-4 font-display text-xl font-semibold text-primary">
            We haven&rsquo;t found a strong enough match yet.
          </h2>
          <p className="mx-auto mt-2 max-w-md text-[0.9rem] text-muted-foreground">
            We can explore a wider set of possibilities or refine your profile.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <PremiumButton
              tone="solid"
              shape="rounded"
              size="sm"
              onClick={handleExploreMore}
              disabled={exploring}
            >
              {exploring && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
              Explore More Ideas
            </PremiumButton>
            <Button asChild variant="outline">
              <Link to="/consultation">Refine My Profile</Link>
            </Button>
          </div>
        </section>
      ) : (
        <>
          {/* ===== PRIMARY OPPORTUNITY HERO ===== */}
          {primary && (
            <section className="mt-8 rounded-[1.75rem] border border-border/70 bg-card/90 p-7 shadow-[0_30px_80px_-45px_oklch(0.245_0.055_268_/_0.18)] sm:p-10">
              <p className="eyebrow text-accent">Your Strongest Opportunity</p>
              <div className="mt-5 flex flex-col items-start gap-8 sm:flex-row sm:items-center">
                <div className="flex flex-col items-center gap-2">
                  <FitRing score={primary.fit_score} />
                  <span className="text-[0.72rem] font-medium text-muted-foreground">
                    {fitQualitativeLabel(primary.fit_score)}
                  </span>
                </div>
                <div className="flex-1">
                  <h2 className="font-display text-[1.7rem] font-semibold leading-tight text-primary sm:text-[2rem]">
                    {primary.title}
                  </h2>
                  <p className="mt-2.5 max-w-xl text-[0.98rem] leading-relaxed text-muted-foreground">
                    {primary.one_liner}
                  </p>
                </div>
              </div>

              {constraintWarnings.length > 0 && (
                <div className="mt-6 rounded-xl border border-accent/40 bg-[oklch(0.745_0.132_72_/_0.07)] px-4 py-3">
                  <p className="text-[0.82rem] text-foreground">{constraintWarnings[0]}</p>
                </div>
              )}

              <div className="mt-7 border-t border-border/60 pt-6">
                <p className="text-[0.78rem] font-semibold uppercase tracking-wide text-muted-foreground">
                  Why this fits you
                </p>
                <ul className="mt-2.5 flex flex-col gap-2">
                  {primaryCandidate &&
                    getWhyReasons(primaryCandidate).map((reason) => (
                      <li key={reason} className="flex gap-2.5 text-[0.92rem] text-foreground">
                        <span className="mt-1.5 size-1 shrink-0 rounded-full bg-accent" />
                        {reason}
                      </li>
                    ))}
                </ul>
              </div>

              <button
                type="button"
                onClick={() => setShowBreakdown((v) => !v)}
                className="mt-5 text-[0.82rem] font-medium text-accent hover:underline"
              >
                {showBreakdown ? "Hide the breakdown" : `Why ${primary.fit_score}?`}
              </button>
              {showBreakdown && (
                <div className="mt-3 max-w-sm rounded-xl border border-border/60 bg-secondary/30 p-4">
                  <FitScoreBreakdownList
                    breakdown={(primary.score_breakdown as unknown as FitScoreResult).breakdown}
                  />
                </div>
              )}

              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Button asChild>
                  <Link to="/dashboard/opportunities/$id" params={{ id: primary.id }}>
                    Explore Opportunity
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </Link>
                </Button>
              </div>
            </section>
          )}

          {/* ===== NEXT MOVE ===== */}
          {data.roadmap?.nextTask && (
            <section className="mt-6 rounded-[1.5rem] border border-accent/30 bg-[oklch(0.745_0.132_72_/_0.06)] p-6 sm:p-7">
              <p className="eyebrow text-accent">Your Next Move</p>
              <h3 className="mt-2 font-display text-[1.2rem] font-semibold text-primary">
                {data.roadmap.nextTask.what}
              </h3>
              <p className="mt-1.5 max-w-xl text-[0.88rem] leading-relaxed text-muted-foreground">
                <span className="font-medium text-foreground">Why: </span>
                {data.roadmap.nextTask.why}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-[0.78rem] text-muted-foreground">
                {data.roadmap.nextTask.timeEstimate && (
                  <span>{data.roadmap.nextTask.timeEstimate}</span>
                )}
                {data.roadmap.nextTask.deadline && (
                  <span>Due {data.roadmap.nextTask.deadline}</span>
                )}
              </div>
              <Button asChild size="sm" className="mt-4">
                <Link to="/dashboard/roadmap">
                  Start this task
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </Button>
            </section>
          )}

          {/* ===== ROADMAP PREVIEW ===== */}
          {data.roadmap && data.roadmap.phases.length > 0 && (
            <section className="mt-6 rounded-[1.5rem] border border-border/70 bg-card/70 p-6 sm:p-7">
              <div className="flex items-center justify-between">
                <p className="eyebrow text-accent">Your Path</p>
                <Link
                  to="/dashboard/roadmap"
                  className="text-[0.78rem] font-medium text-muted-foreground hover:text-primary"
                >
                  Continue Roadmap →
                </Link>
              </div>
              <div className="mt-5 overflow-x-auto">
                <RoadmapStageTimeline
                  phases={data.roadmap.phases.map((p) => ({
                    key: p.key,
                    title: p.title,
                    isCurrent: p.isCurrent,
                    isDone: p.isDone,
                  }))}
                />
              </div>
            </section>
          )}

          {/* ===== OTHER STRONG MATCHES ===== */}
          {alternatives.length > 0 && (
            <section className="mt-9">
              <p className="eyebrow text-muted-foreground">Other Strong Matches</p>
              <div className="mt-3 flex flex-col divide-y divide-border/60 rounded-2xl border border-border/70 bg-card/60">
                {alternatives.map((opp, i) => (
                  <div
                    key={opp.id}
                    className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex items-start gap-4">
                      <span className="mt-0.5 font-display text-[1.2rem] font-semibold text-muted-foreground/50">
                        {String(i + 2).padStart(2, "0")}
                      </span>
                      <div>
                        <div className="flex items-center gap-2.5">
                          <h3 className="font-display text-[1.05rem] font-semibold text-primary">
                            {opp.title}
                          </h3>
                          <span className="text-[0.8rem] font-medium text-accent">
                            {opp.fit_score}/100
                          </span>
                        </div>
                        <p className="mt-1 max-w-md text-[0.85rem] text-muted-foreground">
                          {opp.one_liner}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-2 pl-9 sm:pl-0">
                      <Button asChild variant="outline" size="sm">
                        <Link to="/dashboard/opportunities/$id" params={{ id: opp.id }}>
                          Explore
                        </Link>
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleSwitch(opp.id)}
                        disabled={switching === opp.id}
                      >
                        {switching === opp.id && (
                          <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                        )}
                        Make Primary
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="mt-6 text-center">
            <button
              type="button"
              onClick={handleExploreMore}
              disabled={exploring}
              className={cn(
                "text-[0.82rem] font-medium text-muted-foreground hover:text-primary",
                exploring && "opacity-60",
              )}
            >
              {exploring && (
                <Loader2 className="mr-1.5 inline size-3.5 animate-spin" aria-hidden="true" />
              )}
              Not seeing yourself in these? Explore More Opportunities
            </button>
          </section>

          {/* ===== YOUR BUSINESS DNA ===== */}
          {data.businessDna && (
            <div className="mt-9">
              <BusinessDnaPanel
                analysis={data.businessDna.analysis}
                signals={data.businessDna.signals}
              />
            </div>
          )}

          {/* ===== ASK SOL ===== */}
          <AskSolCta opportunityTitle={primary?.title ?? null} />
        </>
      )}
    </DashboardShell>
  );
}

function AskSolCta({ opportunityTitle }: { opportunityTitle: string | null }) {
  const openMentor = useOpenMentor();
  return (
    <section className="mt-6 flex flex-col items-center gap-2.5 rounded-[1.5rem] border border-[oklch(0.606_0.19_292.7_/_0.18)] bg-[oklch(0.606_0.19_292.7_/_0.04)] px-6 py-8 text-center">
      <Sparkles className="size-5 text-[oklch(0.55_0.16_292.7)]" aria-hidden="true" />
      <p className="font-display text-[1.05rem] font-semibold text-primary">
        Need help with your next step?
      </p>
      <p className="max-w-md text-[0.86rem] text-muted-foreground">
        {opportunityTitle
          ? `Sol is working with you on ${opportunityTitle} — ask anything.`
          : "Sol knows your full profile — ask anything."}
      </p>
      <Button onClick={openMentor} variant="outline" className="mt-1 border-accent/40">
        Ask Sol
        <ArrowRight className="size-4" aria-hidden="true" />
      </Button>
    </section>
  );
}
