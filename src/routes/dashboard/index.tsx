import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowRight, Compass, Loader2 } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { FounderFitOrbit } from "@/components/dashboard/FounderFitOrbit";
import { FounderPathJourney } from "@/components/dashboard/FounderPathJourney";
import { FounderGenomeCardV2 } from "@/components/dashboard/FounderGenomeRadar";
import { BusinessDnaQuadrant } from "@/components/dashboard/BusinessDnaPanel";
import { SolventiaLoadingState } from "@/components/dashboard/SolventiaLoadingState";
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

type Candidate = OpportunityPackage | OpportunityCandidate;

/** Four plain values read left to right with separators, not icon badges —
 * capital/time/skill-gap only exist on the current one-call
 * OpportunityPackage shape, not pre-migration OpportunityCandidate rows,
 * so each is included only when present. */
function getIdeaMetrics(
  candidate: Candidate,
  riskLevel: string,
): { label: string; value: string }[] {
  const metrics: { label: string; value: string }[] = [];
  if ("startingCapital" in candidate) {
    metrics.push({ label: "Capital", value: candidate.startingCapital });
  }
  if ("weeklyTime" in candidate) {
    metrics.push({ label: "Time", value: candidate.weeklyTime });
  }
  metrics.push({ label: "Risk", value: riskLevel.charAt(0).toUpperCase() + riskLevel.slice(1) });
  if ("skillsToLearn" in candidate && candidate.skillsToLearn.length > 0) {
    metrics.push({ label: "Skill Gap", value: `${candidate.skillsToLearn.length} to learn` });
  }
  return metrics;
}

/** Idea -> Proof -> Offer -> First Users -> Repeatability -> Growth,
 * derived from real state, never asserted. No roadmap yet = still at
 * "Idea". Once a roadmap exists, position scales with how far through
 * its phases the founder actually is. */
function deriveActiveStage(
  hasRoadmap: boolean,
  phases: { isCurrent: boolean }[] | undefined,
): number {
  if (!hasRoadmap || !phases || phases.length === 0) return 0;
  const currentIndex = phases.findIndex((p) => p.isCurrent);
  if (currentIndex === -1) return 5; // every phase done
  const ratio = phases.length <= 1 ? 1 : currentIndex / (phases.length - 1);
  return 1 + Math.round(ratio * 4);
}

/** A small SVG orbit motif — the flagship card's only decoration, built
 * from plain circles/arcs (never stock imagery), positioned to sit behind
 * the fit orbit without competing with the real content. */
function FlagshipOrbitMotif() {
  return (
    <svg
      className="pointer-events-none absolute -right-16 -top-16 opacity-[0.35]"
      width={360}
      height={360}
      viewBox="0 0 360 360"
      aria-hidden="true"
    >
      <circle cx={180} cy={180} r={160} fill="none" stroke="var(--sol-champagne)" strokeWidth={1} />
      <circle cx={180} cy={180} r={120} fill="none" stroke="var(--sol-violet)" strokeWidth={1} />
      <circle cx={180} cy={180} r={80} fill="none" stroke="var(--sol-champagne)" strokeWidth={1} />
      <circle cx={340} cy={180} r={4} fill="var(--sol-champagne)" />
      <circle cx={180} cy={20} r={3} fill="var(--sol-violet)" />
    </svg>
  );
}

function DashboardHome() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const dashboardQuery = useQuery({ queryKey: ["dashboard"], queryFn: () => getDashboard() });
  const [exploring, setExploring] = useState(false);
  const [switching, setSwitching] = useState<string | null>(null);

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
      toast.success(
        "Set as your primary direction. Your previous roadmap, if any, has been archived — you can revisit it anytime.",
      );
    } catch (err) {
      console.error("[dashboard] switch opportunity failed:", err);
      toast.error("Couldn't switch opportunities — try again.");
    } finally {
      setSwitching(null);
    }
  }

  // The actual generation now happens on its own dedicated full-page
  // route (branded, no dashboard chrome) rather than inline here — see
  // /dashboard/roadmap/building.
  function handleBuildRoadmap(opportunityId: string) {
    navigate({ to: "/dashboard/roadmap/building", search: { opportunityId } });
  }

  if (dashboardQuery.isLoading) {
    return (
      <DashboardShell>
        <div className="flex min-h-[50vh] items-center justify-center">
          <SolventiaLoadingState message="Opening your workspace…" />
        </div>
      </DashboardShell>
    );
  }

  const data = dashboardQuery.data;
  if (!data) {
    return (
      <DashboardShell>
        <p className="text-dashboard-body">Something went wrong loading your dashboard.</p>
      </DashboardShell>
    );
  }

  const displayName =
    data.profile?.full_name?.split(" ")[0] || data.profile?.email?.split("@")[0] || "there";
  const primary = data.primary;
  const alternatives = data.alternatives;
  const primaryCandidate: Candidate | null = primary
    ? (primary.candidate as unknown as Candidate)
    : null;
  const fitFactors = primaryCandidate ? getFitFactors(primaryCandidate) : null;
  const constraintWarnings =
    primaryCandidate && data.businessDna
      ? getConstraintWarnings(data.businessDna.signals, getFitFactors(primaryCandidate))
      : [];
  const ideaMetrics =
    primaryCandidate && fitFactors ? getIdeaMetrics(primaryCandidate, fitFactors.riskLevel) : [];
  const topReason = primaryCandidate ? getWhyReasons(primaryCandidate)[0] : null;
  const whyNow = primaryCandidate && "whyNow" in primaryCandidate ? primaryCandidate.whyNow : null;
  const primaryScore = primary?.score_breakdown
    ? (primary.score_breakdown as unknown as FitScoreResult)
    : null;
  const activeStage = deriveActiveStage(Boolean(data.roadmap), data.roadmap?.phases);
  const currentPhase = data.roadmap?.phases.find((p) => p.isCurrent) ?? null;
  const missionProgress =
    currentPhase && currentPhase.totalTasks > 0
      ? currentPhase.doneTasks / currentPhase.totalTasks
      : 0;

  const headline = !primary
    ? "Let's find your direction."
    : !data.roadmap
      ? "Time to build your roadmap."
      : "Your next move is clear.";
  const subheading = !primary
    ? "Sol has a set of directions worth considering below."
    : !data.roadmap
      ? `${primary.title} is selected — turn it into a week-by-week plan.`
      : data.roadmap.currentWeek
        ? data.roadmap.currentWeek.objective
        : `Keep moving on ${primary.title}.`;

  return (
    <DashboardShell
      opportunityId={data.selected?.id ?? primary?.id ?? null}
      opportunityTitle={primary?.title ?? null}
      hasRoadmap={primary ? Boolean(data.roadmap) : undefined}
      pageTitle="Command Center"
    >
      {/* ===== HEADER — small label, then a real headline, then one line ===== */}
      <div className="flex flex-col gap-2">
        <p className="text-[16px] font-semibold uppercase tracking-[0.1em] text-sol-champagne-deep">
          {greeting()}, {displayName}
        </p>
        <h1 className="font-display text-[clamp(2rem,3.6vw,2.75rem)] font-semibold leading-[1.08] text-sol-ink">
          {headline}
        </h1>
        <p className="max-w-2xl text-[1.02rem] text-sol-secondary">{subheading}</p>
      </div>

      {!primary && !data.selected ? (
        <section className="mt-10 rounded-[24px] border border-sol-border bg-sol-surface px-8 py-14 text-center">
          <Compass className="mx-auto size-9 text-sol-champagne-deep" aria-hidden="true" />
          <h2 className="mt-5 font-display text-[1.4rem] font-semibold text-sol-ink">
            We haven&rsquo;t found a strong enough match yet.
          </h2>
          <p className="mx-auto mt-2.5 max-w-md text-[1rem] text-sol-secondary">
            Let&rsquo;s explore a wider set of possibilities, or refine your profile.
          </p>
          <div className="mt-7 flex justify-center gap-3">
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
          {/* ===== FLAGSHIP IDEA — light gradient card, badge-free ===== */}
          {primary && (
            <section
              className="relative mt-8 overflow-hidden rounded-[28px] p-8 sm:p-10"
              style={{
                background: "linear-gradient(135deg, #FFFDF9 0%, #F8F3FF 55%, #F4EBDD 100%)",
                border: "1px solid rgba(197,163,106,0.35)",
                minHeight: 440,
              }}
            >
              <FlagshipOrbitMotif />

              <div className="relative flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-sol-champagne-deep">
                    Your Strongest Founder Match
                  </p>
                  <h2 className="mt-4 max-w-xl font-display text-[clamp(1.9rem,3.4vw,2.6rem)] font-semibold leading-[1.12] text-sol-ink">
                    {primary.title}
                  </h2>
                  {(topReason || primary.one_liner) && (
                    <p className="mt-4 max-w-xl text-[0.98rem] leading-relaxed text-sol-secondary">
                      {topReason ?? primary.one_liner}
                    </p>
                  )}

                  {ideaMetrics.length > 0 && (
                    <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2">
                      {ideaMetrics.map((m, i) => (
                        <span key={m.label} className="flex items-center gap-5">
                          {i > 0 && (
                            <span className="text-sol-border-strong" aria-hidden="true">
                              |
                            </span>
                          )}
                          <span className="text-[0.85rem] text-sol-secondary">
                            <span className="font-semibold text-sol-ink">{m.value}</span> {m.label}
                          </span>
                        </span>
                      ))}
                    </div>
                  )}

                  {constraintWarnings.length > 0 && (
                    <div className="mt-5 max-w-xl rounded-xl border border-sol-champagne/30 bg-sol-champagne-soft/40 px-4 py-3">
                      <p className="text-[0.85rem] text-sol-ink">{constraintWarnings[0]}</p>
                    </div>
                  )}

                  {whyNow && (
                    <p className="mt-5 max-w-xl text-[0.92rem] leading-relaxed text-sol-secondary">
                      <span className="font-semibold text-sol-violet-deep">Why now — </span>
                      {whyNow}
                    </p>
                  )}

                  <div className="mt-8">
                    <Link
                      to="/dashboard/opportunities/$id"
                      params={{ id: primary.id }}
                      className="inline-flex items-center gap-2 rounded-xl bg-sol-navy px-6 py-3.5 text-[0.92rem] font-semibold text-white transition-colors hover:bg-sol-navy-soft"
                    >
                      View Full Opportunity
                      <ArrowRight className="size-4 text-sol-champagne" aria-hidden="true" />
                    </Link>
                  </div>
                </div>

                {primaryScore && (
                  <div className="mx-auto shrink-0 lg:mx-0">
                    <FounderFitOrbit score={primary.fit_score} breakdown={primaryScore.breakdown} />
                  </div>
                )}
              </div>
            </section>
          )}

          {/* ===== BUILD MY ROADMAP — primary selected but no roadmap yet ===== */}
          {primary && !data.roadmap && (
            <section className="mt-6 rounded-[18px] border border-sol-border bg-sol-surface p-6 text-center sm:p-7">
              <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-sol-champagne-deep">
                Ready to Execute
              </p>
              <h3 className="mt-2.5 font-display text-[1.35rem] font-semibold text-sol-ink">
                Turn this into a week-by-week plan.
              </h3>
              <p className="mx-auto mt-2 max-w-md text-[0.92rem] leading-relaxed text-sol-secondary">
                Sol designs it around your real time and capital — it unlocks one week at a time as
                you make progress.
              </p>
              <button
                type="button"
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-sol-navy px-6 py-3 text-[0.9rem] font-semibold text-white transition-colors hover:bg-sol-navy-soft"
                onClick={() => handleBuildRoadmap(primary.id)}
              >
                Build My Roadmap
                <ArrowRight className="size-4 text-sol-champagne" aria-hidden="true" />
              </button>
            </section>
          )}

          {/* ===== CURRENT MISSION STRIP — deliberately dark, full-width focal point ===== */}
          {data.roadmap && data.roadmap.currentWeek && (
            <section
              className="relative mt-8 flex flex-col items-start gap-5 overflow-hidden rounded-[24px] px-7 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-10"
              style={{ background: "#17203D", minHeight: 180 }}
            >
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sol-champagne">
                  This Week
                </p>
                <h3 className="mt-3 max-w-xl font-display text-[1.5rem] font-semibold leading-snug text-white sm:text-[1.7rem]">
                  {data.roadmap.currentWeek.title}
                </h3>
                <p className="mt-2 max-w-lg text-[0.92rem] leading-relaxed text-white/70">
                  {data.roadmap.currentWeek.objective}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-6">
                <div className="relative flex size-16 items-center justify-center">
                  <svg width={64} height={64} viewBox="0 0 64 64" className="-rotate-90">
                    <circle
                      cx={32}
                      cy={32}
                      r={27}
                      fill="none"
                      stroke="rgba(255,255,255,0.14)"
                      strokeWidth={5}
                    />
                    <circle
                      cx={32}
                      cy={32}
                      r={27}
                      fill="none"
                      stroke="var(--sol-champagne)"
                      strokeWidth={5}
                      strokeLinecap="round"
                      strokeDasharray={2 * Math.PI * 27}
                      strokeDashoffset={2 * Math.PI * 27 * (1 - missionProgress)}
                      className="transition-[stroke-dashoffset] duration-700 ease-out"
                    />
                  </svg>
                  <span className="absolute text-[0.78rem] font-semibold text-white">
                    {Math.round(missionProgress * 100)}%
                  </span>
                </div>
                <Link
                  to="/dashboard/roadmap"
                  className="inline-flex items-center gap-1.5 whitespace-nowrap text-[0.92rem] font-semibold text-sol-champagne hover:text-white"
                >
                  Continue {data.roadmap.currentWeek.title}
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </div>
            </section>
          )}

          {/* ===== ALTERNATIVE FOUNDER PATHS — minimal cards, no paragraphs ===== */}
          {alternatives.length > 0 && (
            <section className="mt-9">
              <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-sol-muted">
                Alternative Founder Paths
              </p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {alternatives.map((opp) => {
                  const candidate = opp.candidate as unknown as Candidate;
                  const capital = "startingCapital" in candidate ? candidate.startingCapital : null;
                  const time = "weeklyTime" in candidate ? candidate.weeklyTime : null;
                  return (
                    <div
                      key={opp.id}
                      className="flex min-h-[205px] flex-col justify-between gap-4 rounded-[18px] border border-sol-border bg-sol-surface p-5"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-3">
                          <h3 className="font-display text-[1.05rem] font-semibold leading-tight text-sol-ink">
                            {opp.title}
                          </h3>
                          <span className="shrink-0 rounded-full border border-sol-champagne/30 bg-sol-champagne-soft/50 px-2.5 py-1 text-[0.72rem] font-semibold text-sol-champagne-deep">
                            {opp.fit_score}/100
                          </span>
                        </div>
                        {(capital || time) && (
                          <div className="mt-3 flex items-center gap-4 text-[0.8rem] text-sol-secondary">
                            {capital && <span>{capital}</span>}
                            {capital && time && <span className="text-sol-border-strong">|</span>}
                            {time && <span>{time}</span>}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button asChild variant="outline" size="sm" className="flex-1">
                          <Link to="/dashboard/opportunities/$id" params={{ id: opp.id }}>
                            Explore
                          </Link>
                        </Button>
                        <button
                          type="button"
                          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-sol-navy px-3 py-2 text-[0.82rem] font-semibold text-white transition-colors hover:bg-sol-navy-soft disabled:opacity-60"
                          onClick={() => handleSwitch(opp.id)}
                          disabled={switching === opp.id}
                        >
                          {switching === opp.id && (
                            <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                          )}
                          Choose Direction
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          <section className="mt-6 text-center">
            <button
              type="button"
              onClick={handleExploreMore}
              disabled={exploring}
              className={cn(
                "text-[0.85rem] font-medium text-sol-secondary hover:text-sol-ink",
                exploring && "opacity-60",
              )}
            >
              {exploring && (
                <Loader2 className="mr-1.5 inline size-3.5 animate-spin" aria-hidden="true" />
              )}
              Not seeing yourself in these? Explore More Opportunities
            </button>
          </section>

          {/* ===== PROGRESS JOURNEY ===== */}
          {primary && (
            <section className="mt-9 rounded-[24px] border border-sol-border bg-sol-surface p-6 sm:p-8">
              <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-sol-muted">
                Progress Journey
              </p>
              <div className="mt-6 overflow-x-auto">
                <FounderPathJourney activeStage={activeStage} />
              </div>
            </section>
          )}

          {/* ===== FOUNDER INTELLIGENCE ===== */}
          {data.businessDna && (
            <div className="mt-6 grid gap-6 lg:grid-cols-2 lg:items-start">
              {data.genome && (
                <FounderGenomeCardV2 genome={data.genome} persona={data.persona ?? undefined} />
              )}
              <BusinessDnaQuadrant
                analysis={data.businessDna.analysis}
                signals={data.businessDna.signals}
              />
            </div>
          )}
        </>
      )}
    </DashboardShell>
  );
}
