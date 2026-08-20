import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, Loader2, Send, Sparkles, XCircle } from "lucide-react";
import {
  runPublicAnalysis,
  runPublicMarketResearch,
  runPublicRoadmap,
  runPublicMentorReply,
  runPublicTwoProfileTest,
  PUBLIC_REVIEW_PROFILE_ANSWERS,
  type PublicRunResult,
  type OpportunityDiagnostic,
  type PublicMarketResult,
  type PublicRoadmapResult,
  type PublicTwoProfileResult,
  type PipelineStep,
} from "@/lib/actions/review-public";
import { FitRing, FitScoreBreakdownList } from "@/components/dashboard/FitScore";
import { RoadmapStageTimeline } from "@/components/dashboard/RoadmapStageTimeline";
import { BusinessDnaPanel } from "@/components/dashboard/BusinessDnaPanel";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import type { MarketEvidenceItem } from "@/lib/ai/schemas";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/review-public")({
  // Intentionally NO beforeLoad guard — this route must be reachable by
  // anyone, with no Supabase session, so external reviewers can see the
  // real pipeline without an account. It never touches /dashboard, never
  // reads/writes real user rows, and never weakens auth or RLS elsewhere.
  component: ReviewPublicPage,
  head: () => ({
    meta: [
      { title: "Public Review — Solventia" },
      { name: "robots", content: "noindex, nofollow" },
      {
        name: "description",
        content: "A public, unauthenticated preview of the real Solventia pipeline.",
      },
    ],
  }),
});

const NAV_SECTIONS = [
  { id: "synthesis", label: "Synthesis" },
  { id: "opportunity", label: "Opportunity" },
  { id: "market", label: "Market" },
  { id: "roadmap", label: "Roadmap" },
  { id: "dashboard", label: "Dashboard" },
  { id: "sol", label: "Sol" },
  { id: "diagnostics", label: "Diagnostics" },
];

const EVIDENCE_LABELS: Record<MarketEvidenceItem["label"], string> = {
  strong_signal: "Strong signal",
  early_signal: "Early signal",
  emerging: "Emerging",
  competitive: "Competitive",
  needs_validation: "Needs validation",
  limited_evidence: "Limited evidence",
};

function StepStatusIcon({ status }: { status: PipelineStep["status"] }) {
  if (status === "success")
    return <CheckCircle2 className="size-4 text-accent" aria-hidden="true" />;
  if (status === "error") return <XCircle className="size-4 text-destructive" aria-hidden="true" />;
  return <span className="size-4 rounded-full border border-border" aria-hidden="true" />;
}

function TelemetryTable({ telemetry }: { telemetry: PipelineStep[] }) {
  if (telemetry.length === 0)
    return <p className="text-[0.82rem] text-muted-foreground">No steps recorded yet.</p>;
  return (
    <div className="overflow-x-auto rounded-xl border border-border/70">
      <table className="w-full text-left text-[0.82rem]">
        <thead className="bg-secondary/60 text-muted-foreground">
          <tr>
            <th className="px-3 py-2 font-medium">Step</th>
            <th className="px-3 py-2 font-medium">Status</th>
            <th className="px-3 py-2 font-medium">Duration</th>
            <th className="px-3 py-2 font-medium">Cache</th>
            <th className="px-3 py-2 font-medium">Detail</th>
          </tr>
        </thead>
        <tbody>
          {telemetry.map((t, i) => (
            <tr key={i} className="border-t border-border/50">
              <td className="px-3 py-2 text-foreground">{t.step}</td>
              <td className="px-3 py-2">
                <span className="flex items-center gap-1.5">
                  <StepStatusIcon status={t.status} />
                  {t.status}
                  {t.errorCategory && (
                    <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[0.7rem] text-destructive">
                      {t.errorCategory}
                    </span>
                  )}
                </span>
              </td>
              <td className="px-3 py-2 text-muted-foreground">{t.durationMs}ms</td>
              <td className="px-3 py-2 text-muted-foreground">{t.cacheStatus ?? "n/a"}</td>
              <td className="max-w-xs truncate px-3 py-2 text-muted-foreground" title={t.detail}>
                {t.detail ?? "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function OpportunitySummaryCard({ result }: { result: PublicRunResult }) {
  if (result.failed) {
    return (
      <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4">
        <p className="flex items-center gap-2 text-[0.9rem] font-medium text-destructive">
          <AlertTriangle className="size-4" aria-hidden="true" />
          Processing failed at: {result.failureStep}
        </p>
      </div>
    );
  }
  const top = result.opportunities[0];
  if (!top)
    return <p className="text-[0.85rem] text-muted-foreground">No opportunities generated.</p>;
  return (
    <div className="flex flex-col gap-2">
      <p className="font-display text-lg font-semibold text-primary">{top.title}</p>
      <p className="text-[0.85rem] text-muted-foreground">{top.oneLiner}</p>
      <p className="text-[0.72rem] uppercase tracking-wide text-muted-foreground">{top.category}</p>
      <p className="text-[0.9rem] font-medium text-accent">Fit: {top.fitScore}/100</p>
    </div>
  );
}

function ProfileSummaryCard() {
  const answers = PUBLIC_REVIEW_PROFILE_ANSWERS as Record<string, unknown>;
  const skills = (answers.skills as { name: string; level: string }[] | undefined) ?? [];
  return (
    <div className="rounded-2xl border border-border/70 bg-card/70 p-6">
      <p className="text-[0.78rem] font-semibold uppercase tracking-wide text-muted-foreground">
        Fixed reviewer identity — entirely fictional, never a real user
      </p>
      <dl className="mt-3 grid grid-cols-2 gap-3 text-[0.85rem] sm:grid-cols-4">
        <div>
          <dt className="text-muted-foreground">Age</dt>
          <dd className="text-foreground">{String(answers.age)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Location</dt>
          <dd className="text-foreground">
            {String(answers.city)}, {String(answers.state)}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Status</dt>
          <dd className="text-foreground">{String(answers.currentStatus)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Capital</dt>
          <dd className="text-foreground">{String(answers.investmentBudget)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Time / week</dt>
          <dd className="text-foreground">{String(answers.timeAvailableWeekly)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Risk</dt>
          <dd className="text-foreground">{String(answers.riskAppetite)}</dd>
        </div>
        <div className="col-span-2">
          <dt className="text-muted-foreground">Skills</dt>
          <dd className="text-foreground">{skills.map((s) => s.name).join(", ")}</dd>
        </div>
      </dl>
    </div>
  );
}

function ReviewPublicPage() {
  const [runResult, setRunResult] = useState<PublicRunResult | null>(null);
  const [running, setRunning] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const [marketResult, setMarketResult] = useState<PublicMarketResult | null>(null);
  const [marketLoading, setMarketLoading] = useState(false);

  const [roadmapResult, setRoadmapResult] = useState<PublicRoadmapResult | null>(null);
  const [roadmapLoading, setRoadmapLoading] = useState(false);

  const [mentorMessages, setMentorMessages] = useState<
    { role: "user" | "assistant"; content: string }[]
  >([]);
  const [mentorDraft, setMentorDraft] = useState("");
  const [mentorSending, setMentorSending] = useState(false);

  const [twoProfileResult, setTwoProfileResult] = useState<PublicTwoProfileResult | null>(null);
  const [runningTwoProfile, setRunningTwoProfile] = useState(false);

  const selected: OpportunityDiagnostic | null = runResult?.opportunities[selectedIndex] ?? null;

  async function handleRunAnalysis() {
    setRunning(true);
    try {
      const result = await runPublicAnalysis();
      setRunResult(result);
      setSelectedIndex(0);
      setMarketResult(null);
      setRoadmapResult(null);
      setMentorMessages([]);
      if (result.failed) {
        toast.error(`Pipeline failed at: ${result.failureStep}`);
      } else {
        toast.success(`Run complete in ${result.totalDurationMs}ms`);
      }
    } catch (err) {
      console.error("[review-public] run analysis failed:", err);
      toast.error(err instanceof Error ? err.message : "Run failed unexpectedly.");
    } finally {
      setRunning(false);
    }
  }

  function handleSelectOpportunity(i: number) {
    setSelectedIndex(i);
    setMarketResult(null);
    setRoadmapResult(null);
  }

  async function handleLoadMarket() {
    if (!selected) return;
    setMarketLoading(true);
    try {
      const result = await runPublicMarketResearch({
        data: { title: selected.title, oneLiner: selected.oneLiner, category: selected.category },
      });
      setMarketResult(result);
      if (result.failed) toast.error("Market research failed — see diagnostics.");
    } catch (err) {
      console.error("[review-public] market research failed:", err);
      toast.error(err instanceof Error ? err.message : "Market research failed unexpectedly.");
    } finally {
      setMarketLoading(false);
    }
  }

  async function handleGenerateRoadmap() {
    if (!selected) return;
    setRoadmapLoading(true);
    try {
      const result = await runPublicRoadmap({ data: { candidate: selected.candidate } });
      setRoadmapResult(result);
      if (result.failed) toast.error(`Roadmap generation failed at: ${result.failureStep}`);
    } catch (err) {
      console.error("[review-public] roadmap generation failed:", err);
      toast.error(err instanceof Error ? err.message : "Roadmap generation failed unexpectedly.");
    } finally {
      setRoadmapLoading(false);
    }
  }

  async function handleSendMentor(override?: string) {
    const message = (override ?? mentorDraft).trim();
    if (!message || mentorSending) return;
    setMentorDraft("");
    const nextHistory = [...mentorMessages, { role: "user" as const, content: message }];
    setMentorMessages(nextHistory);
    setMentorSending(true);
    try {
      const result = await runPublicMentorReply({
        data: {
          message,
          opportunityTitle: selected?.title ?? null,
          history: mentorMessages,
        },
      });
      if (result.reply) {
        setMentorMessages((prev) => [
          ...prev,
          { role: "assistant", content: result.reply!.message },
        ]);
      } else {
        setMentorMessages((prev) => [
          ...prev,
          { role: "assistant", content: "Sol couldn't respond just now — try again in a moment." },
        ]);
      }
    } catch (err) {
      console.error("[review-public] mentor reply failed:", err);
      toast.error(err instanceof Error ? err.message : "Sol couldn't respond unexpectedly.");
    } finally {
      setMentorSending(false);
    }
  }

  async function handleTwoProfileTest() {
    setRunningTwoProfile(true);
    setTwoProfileResult(null);
    try {
      const result = await runPublicTwoProfileTest();
      setTwoProfileResult(result);
      if (result.personalizationPassed) {
        toast.success("Personalization check passed — recommendations genuinely differ.");
      } else {
        toast.error(result.reason);
      }
    } catch (err) {
      console.error("[review-public] two-profile test failed:", err);
      toast.error(err instanceof Error ? err.message : "Two-profile test failed unexpectedly.");
    } finally {
      setRunningTwoProfile(false);
    }
  }

  return (
    <div className="min-h-screen w-full bg-background text-foreground">
      <div className="bg-accent/15 px-6 py-2.5 text-center text-[0.8rem] font-medium text-primary">
        REVIEW MODE — Public, unauthenticated preview. Fixed fictional profile, no login, nothing
        written to any real account.
      </div>

      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/90 px-6 py-4 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-display text-lg font-semibold text-primary">
              Solventia Public Review
            </p>
            <p className="text-[0.76rem] text-muted-foreground">
              Real pipeline, fixed fictional identity, no authentication
            </p>
          </div>
          <nav className="flex flex-wrap gap-4 text-[0.82rem] font-medium text-muted-foreground">
            {NAV_SECTIONS.map((s) => (
              <a key={s.id} href={`#${s.id}`} className="hover:text-primary">
                {s.label}
              </a>
            ))}
            <Link to="/" className="text-accent hover:underline">
              Home →
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto flex max-w-[1200px] flex-col gap-12 px-6 py-10">
        <section id="synthesis" className="flex flex-col gap-6">
          <div>
            <h1 className="font-display text-2xl font-semibold text-primary">
              Synthesis — Real Pipeline Run
            </h1>
            <p className="mt-2 max-w-2xl text-[0.9rem] leading-relaxed text-muted-foreground">
              This page runs the exact production pipeline (
              <code className="text-foreground">
                normalizeProfile → generateIntelligencePackage (ONE Gemini call) → computeFitScore →
                ranking
              </code>
              ) against a fixed, clearly fictional reviewer profile. Nothing here is mocked and
              nothing is written to Supabase — every run is ephemeral and lives only in this page
              view.
            </p>
          </div>

          <ProfileSummaryCard />

          <div className="flex items-center gap-4">
            <Button onClick={handleRunAnalysis} disabled={running}>
              {running && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
              {runResult ? "Run Analysis Again" : "Run Analysis"}
            </Button>
            {runResult && !runResult.failed && (
              <p className="text-[0.82rem] text-muted-foreground">
                Completed in {runResult.totalDurationMs}ms
              </p>
            )}
          </div>

          {runResult?.founderAnalysis && (
            <div className="rounded-2xl border border-border/70 bg-card/70 p-6">
              <p className="text-[0.78rem] font-semibold uppercase tracking-wide text-accent">
                Founder DNA — Sol's synthesis
              </p>
              <p className="mt-2 text-[0.92rem] leading-relaxed text-foreground">
                {runResult.founderAnalysis.narrativeSummary}
              </p>
              {runResult.founderAnalysis.strategicSignals[0] && (
                <p className="mt-2 text-[0.85rem] italic text-muted-foreground">
                  {runResult.founderAnalysis.strategicSignals[0]}
                </p>
              )}
            </div>
          )}
        </section>

        <section id="opportunity" className="flex flex-col gap-4">
          <h2 className="font-display text-xl font-semibold text-primary">Opportunity Results</h2>
          {!runResult || runResult.opportunities.length === 0 ? (
            <p className="text-[0.85rem] text-muted-foreground">
              Run analysis above to see generated opportunities.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-3">
              {runResult.opportunities.map((opp, i) => (
                <button
                  key={opp.title}
                  type="button"
                  onClick={() => handleSelectOpportunity(i)}
                  className={cn(
                    "rounded-xl border p-4 text-left transition-colors",
                    i === selectedIndex
                      ? "border-accent/60 bg-[oklch(0.745_0.132_72_/_0.07)]"
                      : "border-border/60 bg-card/60 hover:border-accent/30",
                  )}
                >
                  <p className="text-[0.72rem] font-semibold uppercase text-muted-foreground">
                    {i === 0 ? "Primary" : `Alternative #${i + 1}`}
                    {i === selectedIndex ? " · selected" : ""}
                  </p>
                  <p className="mt-1 font-display text-[1.05rem] font-semibold text-primary">
                    {opp.title}
                  </p>
                  <p className="mt-1 text-[0.82rem] text-muted-foreground">{opp.oneLiner}</p>
                  <p className="mt-2 text-[0.88rem] font-medium text-accent">
                    Fit: {opp.fitScore}/100
                  </p>
                </button>
              ))}
            </div>
          )}

          {selected && (
            <div className="mt-4 grid gap-6 rounded-2xl border border-border/70 bg-card/70 p-6 sm:grid-cols-[auto_1fr]">
              <FitRing score={selected.fitScore} />
              <div className="flex flex-col gap-4">
                <FitScoreBreakdownList breakdown={selected.breakdown} />
                <div>
                  <p className="text-[0.78rem] font-semibold uppercase tracking-wide text-muted-foreground">
                    Why this fits
                  </p>
                  <ul className="mt-1.5 flex flex-col gap-1 text-[0.85rem] text-foreground">
                    {selected.whyYou.map((w) => (
                      <li key={w} className="flex gap-2">
                        <span className="mt-1.5 size-1 shrink-0 rounded-full bg-accent" />
                        {w}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </section>

        <section id="market" className="flex flex-col gap-4">
          <h2 className="font-display text-xl font-semibold text-primary">Market / Evidence</h2>
          <p className="max-w-2xl text-[0.85rem] text-muted-foreground">
            Generated on demand for the selected opportunity, exactly like the real detail page —
            grounded in live Google Search, with source citations mapped from the model's real
            output, never invented.
          </p>
          <Button
            onClick={handleLoadMarket}
            disabled={!selected || marketLoading}
            className="w-fit"
          >
            {marketLoading && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
            Load market research for selected opportunity
          </Button>
          {marketResult && (
            <div className="grid gap-3 sm:grid-cols-2">
              {marketResult.items.map((item, i) => (
                <div key={i} className="rounded-xl border border-border/60 bg-card/60 p-4">
                  <Badge variant="secondary" className="mb-2">
                    {EVIDENCE_LABELS[item.label]}
                  </Badge>
                  <p className="text-[0.85rem] text-foreground">{item.claim}</p>
                  {item.sourceUrl && (
                    <a
                      href={item.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-block truncate text-[0.76rem] text-accent hover:underline"
                    >
                      {item.sourceTitle ?? item.sourceUrl}
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        <section id="roadmap" className="flex flex-col gap-4">
          <h2 className="font-display text-xl font-semibold text-primary">Roadmap</h2>
          <p className="max-w-2xl text-[0.85rem] text-muted-foreground">
            Solventia's one-call architecture generates every opportunity's complete roadmap up
            front, in the same request as the analysis above — selecting or switching between
            opportunities costs zero further Gemini calls.
          </p>
          <Button
            onClick={handleGenerateRoadmap}
            disabled={!selected || roadmapLoading}
            className="w-fit"
          >
            {roadmapLoading && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
            View roadmap for selected opportunity (0 Gemini calls — already generated)
          </Button>

          {roadmapResult?.detail && (
            <div className="rounded-2xl border border-border/70 bg-card/70 p-6">
              <p className="text-[0.78rem] font-semibold uppercase tracking-wide text-accent">
                Difficulty: {roadmapResult.detail.difficulty}
              </p>
              <p className="mt-2 text-[0.9rem] leading-relaxed text-foreground">
                {roadmapResult.detail.plainEnglishSummary}
              </p>
              <p className="mt-3 text-[0.85rem] font-medium text-foreground">
                First experiment:{" "}
                <span className="font-normal">{roadmapResult.detail.firstExperiment}</span>
              </p>
            </div>
          )}

          {roadmapResult?.plan && (
            <>
              <div className="overflow-x-auto rounded-[1.5rem] border border-border/70 bg-card/60 p-6">
                <RoadmapStageTimeline
                  phases={roadmapResult.plan.phases.map((p, i) => ({
                    key: p.key,
                    title: p.title,
                    isCurrent: i === 0,
                    isDone: false,
                  }))}
                />
              </div>
              <div className="flex flex-col gap-6">
                {roadmapResult.plan.phases.map((phase, i) => (
                  <div
                    key={phase.key}
                    className="rounded-2xl border border-border/60 bg-card/50 p-5"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-secondary text-[0.75rem] font-semibold text-muted-foreground">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <h3 className="font-display text-lg font-semibold text-primary">
                        {phase.title}
                      </h3>
                    </div>
                    <p className="mt-1.5 pl-10 text-[0.85rem] text-muted-foreground">
                      {phase.description}
                    </p>
                    <div className="mt-3 flex flex-col gap-2 pl-0 sm:pl-10">
                      {phase.tasks.map((task) => (
                        <div
                          key={task.what}
                          className="rounded-xl border border-border/50 bg-background/60 p-3 text-[0.85rem]"
                        >
                          <p className="font-medium text-foreground">{task.what}</p>
                          <p className="mt-1 text-[0.78rem] text-muted-foreground">{task.why}</p>
                          <div className="mt-1.5 flex items-center gap-3 text-[0.74rem] text-muted-foreground">
                            <span>{task.timeEstimate}</span>
                            <span>Day {task.deadlineDaysFromStart}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>

        <section id="dashboard" className="flex flex-col gap-4">
          <h2 className="font-display text-xl font-semibold text-primary">Dashboard Preview</h2>
          <p className="max-w-2xl text-[0.85rem] text-muted-foreground">
            The same components the real dashboard renders, fed with this run's ephemeral data
            instead of a database read.
          </p>
          {runResult?.normalizedProfile && (
            <BusinessDnaPanel
              analysis={runResult.founderAnalysis}
              signals={runResult.normalizedProfile}
            />
          )}
          {selected && (
            <div className="rounded-2xl border border-border/70 bg-card/70 p-6">
              <p className="eyebrow text-accent">Your Next Move</p>
              <p className="mt-2 font-display text-xl font-semibold text-primary">
                {selected.title}
              </p>
              <p className="mt-1 text-[0.85rem] text-muted-foreground">{selected.oneLiner}</p>
              {roadmapResult?.plan?.phases[0]?.tasks[0] && (
                <p className="mt-3 text-[0.85rem] text-foreground">
                  Next task: {roadmapResult.plan.phases[0].tasks[0].what}
                </p>
              )}
            </div>
          )}
        </section>

        <section id="sol" className="flex flex-col gap-4">
          <h2 className="font-display text-xl font-semibold text-primary">Ask Sol</h2>
          <p className="max-w-2xl text-[0.85rem] text-muted-foreground">
            Sol replies using the real mentor prompt and the fixed reviewer profile above — nothing
            is persisted, this conversation only lives in this browser tab.
          </p>
          <div className="rounded-2xl border border-border/70 bg-card/60">
            <div className="flex max-h-96 flex-col gap-3 overflow-y-auto p-5">
              {mentorMessages.length === 0 ? (
                <p className="flex items-center gap-2 text-[0.85rem] text-muted-foreground">
                  <Sparkles className="size-4 text-accent" aria-hidden="true" />
                  Ask Sol anything about the selected opportunity or the fixed profile above.
                </p>
              ) : (
                mentorMessages.map((m, i) => (
                  <div
                    key={i}
                    className={cn(
                      "max-w-[85%] rounded-2xl px-4 py-2.5 text-[0.88rem] leading-relaxed",
                      m.role === "user"
                        ? "ml-auto bg-primary text-primary-foreground"
                        : "bg-secondary text-foreground",
                    )}
                  >
                    {m.content}
                  </div>
                ))
              )}
              {mentorSending && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                  <span className="text-[0.8rem]">Sol is thinking…</span>
                </div>
              )}
            </div>
            <div className="flex items-end gap-2 border-t border-border/60 p-4">
              <Textarea
                value={mentorDraft}
                onChange={(e) => setMentorDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMentor();
                  }
                }}
                placeholder="Ask Sol something specific…"
                className="min-h-[44px] flex-1 resize-none"
              />
              <Button
                size="icon"
                onClick={() => handleSendMentor()}
                disabled={mentorSending || !mentorDraft.trim()}
              >
                <Send className="size-4" aria-hidden="true" />
              </Button>
            </div>
          </div>
        </section>

        <section id="diagnostics" className="flex flex-col gap-6 pb-20">
          <h2 className="font-display text-xl font-semibold text-primary">Diagnostics</h2>

          <div className="max-w-2xl rounded-xl border border-border/70 bg-card/60 p-4 text-[0.85rem] leading-relaxed text-muted-foreground">
            <p>
              <span className="font-medium text-foreground">Persistence:</span> nothing on this page
              is written to Supabase. Every run's data lives only in this server response and this
              browser tab's React state — closing the tab discards it completely.
            </p>
            <p className="mt-2">
              <span className="font-medium text-foreground">Rate limiting:</span> each action is
              cooled down per-IP for a few seconds to blunt casual repeated clicking. This is
              best-effort only (in-memory, per server instance) and does not stop a determined
              distributed abuser.
            </p>
            <p className="mt-2">
              <span className="font-medium text-foreground">Never shown here:</span> API keys,
              service-role credentials, real user data, or anything from a real account.
            </p>
          </div>

          {runResult && (
            <div>
              <p className="mb-2 text-[0.78rem] font-semibold uppercase tracking-wide text-muted-foreground">
                Last analysis run — {runResult.totalDurationMs}ms total
              </p>
              <TelemetryTable telemetry={runResult.telemetry} />
              {runResult.opportunities.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2 text-[0.76rem] text-muted-foreground">
                  {runResult.opportunities.map((o, i) => (
                    <span key={o.title} className="rounded-full bg-secondary px-2.5 py-1">
                      ephemeral id opp-{i} · fit {o.fitScore}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {marketResult && (
            <div>
              <p className="mb-2 mt-4 text-[0.78rem] font-semibold uppercase tracking-wide text-muted-foreground">
                Last market research call
              </p>
              <TelemetryTable telemetry={marketResult.telemetry} />
            </div>
          )}

          {roadmapResult && (
            <div>
              <p className="mb-2 mt-4 text-[0.78rem] font-semibold uppercase tracking-wide text-muted-foreground">
                Last roadmap generation call
              </p>
              <TelemetryTable telemetry={roadmapResult.telemetry} />
            </div>
          )}

          <div className="border-t border-border/60 pt-6">
            <h3 className="font-display text-lg font-semibold text-primary">
              Personalization Test
            </h3>
            <p className="mt-2 max-w-2xl text-[0.85rem] text-muted-foreground">
              Runs two deliberately opposite profiles (17yo cautious student, ₹0 capital vs. 35yo
              experienced business owner, ₹10L, high risk) through the real pipeline sequentially,
              including each one's first roadmap action, and checks whether the recommendations
              actually differ.
            </p>
            <Button
              onClick={handleTwoProfileTest}
              disabled={runningTwoProfile}
              className="mt-3 w-fit"
            >
              {runningTwoProfile && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
              Run Personalization Test
            </Button>

            {twoProfileResult && (
              <div className="mt-4 flex flex-col gap-4">
                <div
                  className={cn(
                    "flex items-center gap-2 rounded-xl border p-4 text-[0.9rem] font-medium",
                    twoProfileResult.personalizationPassed
                      ? "border-accent/40 bg-accent/5 text-primary"
                      : "border-destructive/40 bg-destructive/5 text-destructive",
                  )}
                >
                  {twoProfileResult.personalizationPassed ? (
                    <CheckCircle2 className="size-4" aria-hidden="true" />
                  ) : (
                    <AlertTriangle className="size-4" aria-hidden="true" />
                  )}
                  {twoProfileResult.personalizationPassed ? "PASS — " : "FAIL — "}
                  {twoProfileResult.reason}
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-xl border border-border/70 bg-card/60 p-4">
                    <p className="text-[0.78rem] font-semibold uppercase text-muted-foreground">
                      Profile A — 17yo student, ₹0, cautious
                    </p>
                    <div className="mt-2">
                      <OpportunitySummaryCard result={twoProfileResult.profileA} />
                    </div>
                    {twoProfileResult.profileAFirstAction && (
                      <p className="mt-3 text-[0.82rem] text-foreground">
                        First roadmap action: {twoProfileResult.profileAFirstAction}
                      </p>
                    )}
                  </div>
                  <div className="rounded-xl border border-border/70 bg-card/60 p-4">
                    <p className="text-[0.78rem] font-semibold uppercase text-muted-foreground">
                      Profile B — 35yo business owner, ₹10L, high risk
                    </p>
                    <div className="mt-2">
                      <OpportunitySummaryCard result={twoProfileResult.profileB} />
                    </div>
                    {twoProfileResult.profileBFirstAction && (
                      <p className="mt-3 text-[0.82rem] text-foreground">
                        First roadmap action: {twoProfileResult.profileBFirstAction}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
