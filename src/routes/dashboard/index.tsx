import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
  ArrowRight,
  Clock,
  Compass,
  GraduationCap,
  Loader2,
  Gauge,
  Sparkles,
  Wallet,
} from "lucide-react";
import { DashboardShell, useOpenMentor } from "@/components/dashboard/DashboardShell";
import { FitRing, fitQualitativeLabel } from "@/components/dashboard/FitScore";
import { RoadmapStageTimeline } from "@/components/dashboard/RoadmapStageTimeline";
import { AttributeBadge } from "@/components/dashboard/AttributeBadge";
import { ProgressMap } from "@/components/dashboard/ProgressMap";
import { BusinessDnaPanel } from "@/components/dashboard/BusinessDnaPanel";
import { SolventiaLoadingState } from "@/components/dashboard/SolventiaLoadingState";
import { PremiumButton } from "@/components/solventia/PremiumButton";
import { Button } from "@/components/ui/button";
import { requireAuthLoader } from "@/lib/route-guards";
import { getDashboard } from "@/lib/actions/dashboard";
import {
  exploreMoreOpportunities,
  switchSelectedOpportunity,
  buildRoadmapForOpportunity,
} from "@/lib/actions/opportunities";
import { getFitFactors, getWhyReasons } from "@/lib/opportunity-display";
import { getConstraintWarnings } from "@/lib/profile/scoring";
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

/** Four badges instead of a paragraph — capital/time/risk only exist on
 * the current one-call OpportunityPackage shape, not pre-migration
 * OpportunityCandidate rows, so each is included only when present. */
function getIdeaBadges(
  candidate: Candidate,
  riskLevel: string,
): { icon: typeof Wallet; label: string; value: string }[] {
  const badges: { icon: typeof Wallet; label: string; value: string }[] = [];
  if ("startingCapital" in candidate) {
    badges.push({ icon: Wallet, label: "Capital", value: candidate.startingCapital });
  }
  if ("weeklyTime" in candidate) {
    badges.push({ icon: Clock, label: "Time", value: candidate.weeklyTime });
  }
  badges.push({
    icon: Gauge,
    label: "Risk",
    value: riskLevel.charAt(0).toUpperCase() + riskLevel.slice(1),
  });
  if ("skillsToLearn" in candidate && candidate.skillsToLearn.length > 0) {
    badges.push({
      icon: GraduationCap,
      label: "Skill Gap",
      value: `${candidate.skillsToLearn.length} to learn`,
    });
  }
  return badges;
}

/** Idea -> Validation -> First Offer -> First Users -> Growth, derived
 * from real state, never asserted. No roadmap yet = still at "Idea". Once
 * a roadmap exists, position scales with how far through its phases the
 * founder actually is. */
function deriveActiveStage(
  hasRoadmap: boolean,
  phases: { isCurrent: boolean }[] | undefined,
): number {
  if (!hasRoadmap || !phases || phases.length === 0) return 0;
  const currentIndex = phases.findIndex((p) => p.isCurrent);
  if (currentIndex === -1) return 4; // every phase done
  const ratio = phases.length <= 1 ? 1 : currentIndex / (phases.length - 1);
  return 1 + Math.round(ratio * 3);
}

function DashboardHome() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const dashboardQuery = useQuery({ queryKey: ["dashboard"], queryFn: () => getDashboard() });
  const [exploring, setExploring] = useState(false);
  const [switching, setSwitching] = useState<string | null>(null);
  const [buildingRoadmap, setBuildingRoadmap] = useState(false);

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

  async function handleBuildRoadmap(opportunityId: string) {
    setBuildingRoadmap(true);
    try {
      await buildRoadmapForOpportunity({ data: { opportunityId } });
      await refresh();
      navigate({ to: "/dashboard/roadmap" });
    } catch (err) {
      console.error("[dashboard] build roadmap failed:", err);
      toast.error("Sol couldn't build your roadmap right now — try again.");
    } finally {
      setBuildingRoadmap(false);
    }
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
  const ideaBadges =
    primaryCandidate && fitFactors ? getIdeaBadges(primaryCandidate, fitFactors.riskLevel) : [];
  const topReason = primaryCandidate ? getWhyReasons(primaryCandidate)[0] : null;
  const whyNow = primaryCandidate && "whyNow" in primaryCandidate ? primaryCandidate.whyNow : null;
  const firstStep =
    primaryCandidate && "firstExperiment" in primaryCandidate
      ? primaryCandidate.firstExperiment
      : null;
  const activeStage = deriveActiveStage(Boolean(data.roadmap), data.roadmap?.phases);

  return (
    <DashboardShell
      opportunityId={data.selected?.id ?? primary?.id ?? null}
      opportunityTitle={primary?.title ?? null}
      hasRoadmap={primary ? Boolean(data.roadmap) : undefined}
    >
      {/* ===== COMMAND CENTER HEADER — minimal, one line ===== */}
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-[clamp(2rem,3.6vw,2.6rem)] font-semibold leading-tight text-dashboard-heading">
          {greeting()}, {displayName}.
        </h1>
        <p className="text-[1.02rem] text-dashboard-muted">
          {primary ? primary.title : "Your founder operating system is ready."}
        </p>
      </div>

      {!primary && !data.selected ? (
        <section className="mt-10 rounded-[1.75rem] border border-border/70 bg-card/80 px-8 py-14 text-center">
          <Compass className="mx-auto size-9 text-gold" aria-hidden="true" />
          <h2 className="mt-5 font-display text-[1.4rem] font-semibold text-dashboard-heading">
            We haven&rsquo;t found a strong enough match yet.
          </h2>
          <p className="mx-auto mt-2.5 max-w-md text-[1rem] text-dashboard-muted">
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
          {primary && (
            <div className="mt-7 overflow-x-auto rounded-2xl border border-border/60 bg-card/50 px-6 py-4">
              <ProgressMap activeStage={activeStage} />
            </div>
          )}

          {/* ===== FLAGSHIP IDEA — visually dominant, badge-driven ===== */}
          {primary && (
            <section
              className="relative mt-6 overflow-hidden rounded-[1.75rem] bg-workspace shadow-[0_40px_90px_-50px_oklch(0.16_0.02_260/_0.55)]"
              style={{
                backgroundImage:
                  "radial-gradient(ellipse 60% 50% at 12% -10%, var(--workspace-green-glow), transparent 70%), radial-gradient(ellipse 50% 45% at 100% 110%, var(--workspace-violet-glow), transparent 70%)",
              }}
            >
              <div className="relative p-7 sm:p-10">
                <p className="eyebrow text-gold">Your Strongest Founder Match</p>

                <div className="mt-5 flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
                  <h2 className="max-w-xl font-display text-[clamp(2.1rem,4vw,3rem)] font-semibold leading-[1.05] text-workspace-foreground">
                    {primary.title}
                  </h2>
                  <div className="flex shrink-0 flex-col items-center gap-2">
                    <FitRing score={primary.fit_score} size={112} variant="dark" />
                    <span className="text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-econ-green-active">
                      {fitQualitativeLabel(primary.fit_score)}
                    </span>
                  </div>
                </div>

                {ideaBadges.length > 0 && (
                  <div className="mt-6 flex flex-wrap gap-2.5">
                    {ideaBadges.map((b) => (
                      <AttributeBadge key={b.label} {...b} variant="dark" />
                    ))}
                  </div>
                )}

                {topReason && (
                  <p className="mt-5 max-w-2xl text-[0.92rem] leading-relaxed text-workspace-foreground/90">
                    {topReason}
                  </p>
                )}

                {constraintWarnings.length > 0 && (
                  <div className="mt-5 rounded-xl border border-gold/25 bg-gold/[0.08] px-4 py-3">
                    <p className="text-[0.85rem] text-workspace-foreground">
                      {constraintWarnings[0]}
                    </p>
                  </div>
                )}

                {whyNow && (
                  <p className="mt-6 max-w-2xl text-[0.95rem] leading-relaxed text-workspace-muted">
                    <span className="font-semibold text-gold">Why now — </span>
                    {whyNow}
                  </p>
                )}

                {firstStep && (
                  <div className="mt-5 max-w-2xl rounded-xl border border-econ-green-active/25 bg-white/[0.03] px-4 py-3.5">
                    <p className="text-[0.68rem] font-semibold uppercase tracking-[0.1em] text-econ-green-active">
                      First Validation Step
                    </p>
                    <p className="mt-1 text-[0.9rem] leading-relaxed text-workspace-foreground">
                      {firstStep}
                    </p>
                  </div>
                )}

                <div className="mt-7 flex flex-wrap items-center gap-4">
                  <Button
                    asChild
                    className="bg-econ-green-active text-white hover:bg-econ-green-deep"
                  >
                    <Link to="/dashboard/opportunities/$id" params={{ id: primary.id }}>
                      View Full Opportunity
                      <ArrowRight className="size-4" aria-hidden="true" />
                    </Link>
                  </Button>
                </div>
              </div>
            </section>
          )}

          {/* ===== BUILD MY ROADMAP — primary is selected but has no roadmap yet ===== */}
          {primary && !data.roadmap && (
            <section className="mt-6 rounded-[1.5rem] border border-econ-green/25 bg-econ-green-soft/50 p-6 text-center sm:p-7">
              {buildingRoadmap ? (
                <SolventiaLoadingState
                  message={`Sol is building your week-by-week roadmap for ${primary.title}…`}
                />
              ) : (
                <>
                  <p className="eyebrow text-econ-green-deep">Ready to Execute</p>
                  <h3 className="mt-2.5 font-display text-[1.35rem] font-semibold text-dashboard-heading">
                    Turn this into a week-by-week plan.
                  </h3>
                  <p className="mx-auto mt-2 max-w-md text-[0.92rem] leading-relaxed text-dashboard-muted">
                    Sol designs it around your real time and capital — it unlocks one week at a time
                    as you make progress.
                  </p>
                  <Button
                    className="mt-5 bg-econ-green-active text-white hover:bg-econ-green-deep"
                    onClick={() => handleBuildRoadmap(primary.id)}
                  >
                    Build My Roadmap
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </Button>
                </>
              )}
            </section>
          )}

          {/* ===== WEEKLY MISSION — only once a roadmap actually exists ===== */}
          {data.roadmap && data.roadmap.phases.length > 0 && (
            <section className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
              <div className="rounded-[1.5rem] border border-gold/25 bg-gold/[0.05] p-6 sm:p-7">
                <div className="flex items-center justify-between gap-2">
                  <p className="eyebrow text-dashboard-heading">
                    {data.roadmap.currentWeek
                      ? `This Week — ${data.roadmap.currentWeek.title}`
                      : "Your Next Move"}
                  </p>
                </div>
                {data.roadmap.currentWeek && (
                  <p className="mt-2 text-[0.9rem] leading-relaxed text-dashboard-body">
                    {data.roadmap.currentWeek.objective}
                  </p>
                )}
                {data.roadmap.nextTask && (
                  <div className="mt-4 rounded-xl border border-border/60 bg-card/70 p-4">
                    <p className="text-[0.68rem] font-semibold uppercase tracking-wide text-dashboard-muted">
                      Next action
                    </p>
                    <p className="mt-1 text-[1rem] font-semibold text-dashboard-heading">
                      {data.roadmap.nextTask.what}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-[0.78rem] text-dashboard-muted">
                      {data.roadmap.nextTask.timeEstimate && (
                        <span>{data.roadmap.nextTask.timeEstimate}</span>
                      )}
                      {data.roadmap.nextTask.deadline && (
                        <span>Due {data.roadmap.nextTask.deadline}</span>
                      )}
                    </div>
                  </div>
                )}
                <Button
                  asChild
                  size="sm"
                  className="mt-5 bg-econ-green-active text-white hover:bg-econ-green-deep"
                >
                  <Link to="/dashboard/roadmap">
                    Continue in Roadmap
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </Link>
                </Button>
              </div>

              <div className="rounded-[1.5rem] border border-border/70 bg-card/70 p-6 sm:p-7">
                <p className="eyebrow text-dashboard-muted">Your Path</p>
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
              </div>
            </section>
          )}

          {/* ===== ALTERNATIVE FOUNDER PATHS — real cards, side by side ===== */}
          {alternatives.length > 0 && (
            <section className="mt-9">
              <p className="eyebrow text-dashboard-muted">Alternative Founder Paths</p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {alternatives.map((opp) => (
                  <div
                    key={opp.id}
                    className="flex flex-col gap-4 rounded-2xl border border-border/70 bg-card/60 p-5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-display text-[1.1rem] font-semibold leading-tight text-dashboard-heading">
                        {opp.title}
                      </h3>
                      <span className="shrink-0 rounded-full border border-gold/30 bg-gold/[0.08] px-2.5 py-1 text-[0.72rem] font-semibold text-dashboard-heading">
                        {opp.fit_score}/100
                      </span>
                    </div>
                    <p className="line-clamp-2 text-[0.85rem] leading-relaxed text-dashboard-muted">
                      {opp.one_liner}
                    </p>
                    <div className="mt-auto flex gap-2">
                      <Button asChild variant="outline" size="sm" className="flex-1">
                        <Link to="/dashboard/opportunities/$id" params={{ id: opp.id }}>
                          Explore
                        </Link>
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1 bg-econ-green-active text-white hover:bg-econ-green-deep"
                        onClick={() => handleSwitch(opp.id)}
                        disabled={switching === opp.id}
                      >
                        {switching === opp.id && (
                          <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                        )}
                        Select This Direction
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
                "text-[0.85rem] font-medium text-dashboard-muted hover:text-dashboard-heading",
                exploring && "opacity-60",
              )}
            >
              {exploring && (
                <Loader2 className="mr-1.5 inline size-3.5 animate-spin" aria-hidden="true" />
              )}
              Not seeing yourself in these? Explore More Opportunities
            </button>
          </section>

          {/* ===== FOUNDER INTELLIGENCE ===== */}
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
    <section className="mt-6 flex flex-col items-center gap-2.5 rounded-[1.5rem] border border-violet/18 bg-violet/4 px-6 py-8 text-center">
      <Sparkles className="size-5 text-violet" aria-hidden="true" />
      <p className="font-display text-[1.1rem] font-semibold text-dashboard-heading">
        Need help with your next step?
      </p>
      <p className="max-w-md text-[0.9rem] text-dashboard-muted">
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
