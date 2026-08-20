import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, Loader2, XCircle } from "lucide-react";
import { requireReviewerLoader } from "@/lib/route-guards";
import {
  runReviewAnalysis,
  runTwoProfileTest,
  getReviewerIdentity,
  type ReviewRunResult,
  type TwoProfileTestResult,
  type FailureInjection,
  type PipelineStep,
} from "@/lib/actions/review";
import {
  STATUS_OPTIONS,
  SKILL_LEVELS,
  INVESTMENT_BRACKETS,
  WEEKLY_HOURS,
} from "@/lib/onboarding-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/review")({
  beforeLoad: requireReviewerLoader,
  component: ReviewPage,
  head: () => ({ meta: [{ name: "robots", content: "noindex, nofollow" }] }),
});

const RISK_OPTIONS = ["Very cautious", "Balanced", "Comfortable experimenting"];
const WORK_LOCATION_OPTIONS = ["Remote", "In person", "A mix of both", "No strong preference"];

const NAV_SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "profile", label: "Processing" },
  { id: "opportunity", label: "Opportunity" },
  { id: "market", label: "Market" },
  { id: "personalization", label: "Personalization" },
  { id: "diagnostics", label: "Diagnostics" },
];

interface FormState {
  age: string;
  country: string;
  state: string;
  city: string;
  postalCode: string;
  currentStatus: string;
  skillName: string;
  skillLevel: string;
  investmentBudget: string;
  timeAvailableWeekly: string;
  riskAppetite: string;
  workLocation: string;
  biggestMotivation: string;
  goals: string;
}

const DEFAULT_FORM: FormState = {
  age: "24",
  country: "India",
  state: "Karnataka",
  city: "Bengaluru",
  postalCode: "",
  currentStatus: "Working Professional",
  skillName: "Coding",
  skillLevel: "intermediate",
  investmentBudget: "₹50,000 – ₹2,00,000",
  timeAvailableWeekly: "10–20 hrs",
  riskAppetite: "Balanced",
  workLocation: "Remote",
  biggestMotivation: "I want to build a side income using my technical skills.",
  goals: "A second income stream",
};

function formToAnswers(form: FormState): Record<string, unknown> {
  return {
    age: form.age || undefined,
    country: form.country || undefined,
    state: form.state || undefined,
    city: form.city || undefined,
    postalCode: form.postalCode || undefined,
    currentStatus: form.currentStatus || undefined,
    skills: form.skillName ? [{ name: form.skillName, level: form.skillLevel }] : [],
    investmentBudget: form.investmentBudget || undefined,
    timeAvailableWeekly: form.timeAvailableWeekly || undefined,
    riskAppetite: form.riskAppetite || undefined,
    workLocation: form.workLocation || undefined,
    biggestMotivation: form.biggestMotivation || undefined,
    goals: form.goals
      ? form.goals
          .split(",")
          .map((g) => g.trim())
          .filter(Boolean)
      : undefined,
  };
}

function StepStatusIcon({ status }: { status: PipelineStep["status"] }) {
  if (status === "success")
    return <CheckCircle2 className="size-4 text-accent" aria-hidden="true" />;
  if (status === "error") return <XCircle className="size-4 text-destructive" aria-hidden="true" />;
  return <span className="size-4 rounded-full border border-border" aria-hidden="true" />;
}

function TelemetryTable({ telemetry }: { telemetry: PipelineStep[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border/70">
      <table className="w-full text-left text-[0.82rem]">
        <thead className="bg-secondary/60 text-muted-foreground">
          <tr>
            <th className="px-3 py-2 font-medium">Step</th>
            <th className="px-3 py-2 font-medium">Status</th>
            <th className="px-3 py-2 font-medium">Duration</th>
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

function OpportunityResultCard({ result }: { result: ReviewRunResult }) {
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
      <p className="text-[0.9rem] font-medium text-accent">Fit: {top.fitScore}/100</p>
      <dl className="grid grid-cols-3 gap-1.5 text-[0.76rem] text-muted-foreground">
        {Object.entries(top.breakdown).map(([k, v]) => (
          <div key={k}>
            {k}: <span className="text-foreground">{v}</span>
          </div>
        ))}
      </dl>
    </div>
  );
}

function ReviewPage() {
  const identity = useQuery({
    queryKey: ["reviewer-identity"],
    queryFn: () => getReviewerIdentity(),
  });

  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [injectFailure, setInjectFailure] = useState<FailureInjection>("none");
  const [persist, setPersist] = useState(true);
  const [running, setRunning] = useState(false);
  const [runResult, setRunResult] = useState<ReviewRunResult | null>(null);

  const [runningTwoProfile, setRunningTwoProfile] = useState(false);
  const [twoProfileResult, setTwoProfileResult] = useState<TwoProfileTestResult | null>(null);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleRunAnalysis() {
    setRunning(true);
    setRunResult(null);
    try {
      const result = await runReviewAnalysis({
        data: { answers: formToAnswers(form), injectFailure, persist },
      });
      setRunResult(result);
      if (result.failed) {
        toast.error(`Pipeline failed at: ${result.failureStep}`);
      } else {
        toast.success(`Run complete in ${result.totalDurationMs}ms`);
      }
    } catch (err) {
      console.error("[review] run analysis failed:", err);
      toast.error("Run failed unexpectedly — check server logs.");
    } finally {
      setRunning(false);
    }
  }

  async function handleTwoProfileTest() {
    setRunningTwoProfile(true);
    setTwoProfileResult(null);
    try {
      const result = await runTwoProfileTest();
      setTwoProfileResult(result);
      if (result.personalizationPassed) {
        toast.success("Personalization check passed — recommendations genuinely differ.");
      } else {
        toast.error(result.reason);
      }
    } catch (err) {
      console.error("[review] two-profile test failed:", err);
      toast.error("Two-profile test failed unexpectedly — check server logs.");
    } finally {
      setRunningTwoProfile(false);
    }
  }

  return (
    <div className="min-h-screen w-full bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/90 px-6 py-4 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-display text-lg font-semibold text-primary">
              Solventia Review &amp; Diagnostics
            </p>
            <p className="text-[0.76rem] text-muted-foreground">
              Reviewer: {identity.data?.email ?? "…"} · id·{identity.data?.userIdHash ?? "…"} · real
              pipeline, isolated account
            </p>
          </div>
          <nav className="flex flex-wrap gap-4 text-[0.82rem] font-medium text-muted-foreground">
            {NAV_SECTIONS.map((s) => (
              <a key={s.id} href={`#${s.id}`} className="hover:text-primary">
                {s.label}
              </a>
            ))}
            <Link to="/dashboard" className="text-accent hover:underline">
              Real Dashboard →
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto flex max-w-[1200px] flex-col gap-12 px-6 py-10">
        <section id="overview">
          <h1 className="font-display text-2xl font-semibold text-primary">Overview</h1>
          <p className="mt-2 max-w-2xl text-[0.9rem] leading-relaxed text-muted-foreground">
            This page runs the exact production pipeline (
            <code className="text-foreground">
              normalizeProfile → generateIntelligencePackage (ONE Gemini call) → computeFitScore →
              persistence
            </code>
            ) against your own isolated reviewer account. Nothing here is mocked; every run makes
            real Gemini calls and (when "Persist" is checked) writes real rows under your own
            account, visible afterward on the real dashboard.
          </p>
          <p className="mt-2 max-w-2xl text-[0.8rem] text-muted-foreground">
            Access is gated by a real Supabase session plus an email allowlist — this route behaves
            like any other protected route to anyone not on that list.
          </p>
        </section>

        <section id="profile" className="flex flex-col gap-6">
          <h2 className="font-display text-xl font-semibold text-primary">
            Processing — Editable Profile
          </h2>
          <div className="grid gap-4 rounded-2xl border border-border/70 bg-card/70 p-6 sm:grid-cols-2 lg:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <Label>Age</Label>
              <Input value={form.age} onChange={(e) => updateField("age", e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Country</Label>
              <Input
                value={form.country}
                onChange={(e) => updateField("country", e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Region / State</Label>
              <Input value={form.state} onChange={(e) => updateField("state", e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>City</Label>
              <Input value={form.city} onChange={(e) => updateField("city", e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Postal code</Label>
              <Input
                value={form.postalCode}
                onChange={(e) => updateField("postalCode", e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Status</Label>
              <Select
                value={form.currentStatus}
                onValueChange={(v) => updateField("currentStatus", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((o) => (
                    <SelectItem key={o} value={o}>
                      {o}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Skill</Label>
              <Input
                value={form.skillName}
                onChange={(e) => updateField("skillName", e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Skill level</Label>
              <Select value={form.skillLevel} onValueChange={(v) => updateField("skillLevel", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SKILL_LEVELS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Capital</Label>
              <Select
                value={form.investmentBudget}
                onValueChange={(v) => updateField("investmentBudget", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INVESTMENT_BRACKETS.map((o) => (
                    <SelectItem key={o} value={o}>
                      {o}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Time / week</Label>
              <Select
                value={form.timeAvailableWeekly}
                onValueChange={(v) => updateField("timeAvailableWeekly", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WEEKLY_HOURS.map((o) => (
                    <SelectItem key={o} value={o}>
                      {o}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Risk</Label>
              <Select
                value={form.riskAppetite}
                onValueChange={(v) => updateField("riskAppetite", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RISK_OPTIONS.map((o) => (
                    <SelectItem key={o} value={o}>
                      {o}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Work preference</Label>
              <Select
                value={form.workLocation}
                onValueChange={(v) => updateField("workLocation", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WORK_LOCATION_OPTIONS.map((o) => (
                    <SelectItem key={o} value={o}>
                      {o}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2 lg:col-span-3">
              <Label>Motivation</Label>
              <Textarea
                value={form.biggestMotivation}
                onChange={(e) => updateField("biggestMotivation", e.target.value)}
                className="min-h-20"
              />
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2 lg:col-span-3">
              <Label>Goals (comma-separated)</Label>
              <Input value={form.goals} onChange={(e) => updateField("goals", e.target.value)} />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-border/70 bg-card/50 p-4">
            <div className="flex items-center gap-2">
              <Label className="text-[0.82rem]">Inject failure</Label>
              <Select
                value={injectFailure}
                onValueChange={(v) => setInjectFailure(v as FailureInjection)}
              >
                <SelectTrigger className="w-56">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (real run)</SelectItem>
                  <SelectItem value="gemini_timeout">Gemini timeout</SelectItem>
                  <SelectItem value="gemini_429">Gemini 429 rate limit</SelectItem>
                  <SelectItem value="gemini_malformed">Gemini malformed output</SelectItem>
                  <SelectItem value="research_failure">Research provider unavailable</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <label className="flex items-center gap-2 text-[0.82rem] text-foreground">
              <input
                type="checkbox"
                checked={persist}
                onChange={(e) => setPersist(e.target.checked)}
              />
              Persist to database (so it appears on the real dashboard)
            </label>
            <Button onClick={handleRunAnalysis} disabled={running}>
              {running && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
              Run Analysis
            </Button>
          </div>

          {runResult && (
            <div className="rounded-2xl border border-border/70 bg-card/70 p-6">
              <p className="text-[0.82rem] font-semibold uppercase tracking-wide text-accent">
                Last run — {runResult.totalDurationMs}ms total
              </p>
              <div className="mt-3">
                <TelemetryTable telemetry={runResult.telemetry} />
              </div>
              {runResult.normalizedProfile && (
                <div className="mt-5">
                  <p className="text-[0.78rem] font-semibold uppercase tracking-wide text-muted-foreground">
                    Founder DNA sent to Gemini
                  </p>
                  <pre className="mt-2 max-h-64 overflow-auto rounded-xl bg-secondary/50 p-3 text-[0.76rem] text-foreground">
                    {JSON.stringify(runResult.normalizedProfile, null, 2)}
                  </pre>
                </div>
              )}
              {runResult.businessDnaId && (
                <p className="mt-3 text-[0.8rem] text-muted-foreground">
                  Persisted — view it on the{" "}
                  <Link to="/dashboard" className="text-accent hover:underline">
                    real dashboard
                  </Link>
                  .
                </p>
              )}
            </div>
          )}
        </section>

        <section id="opportunity" className="flex flex-col gap-4">
          <h2 className="font-display text-xl font-semibold text-primary">Opportunity Results</h2>
          {!runResult || runResult.opportunities.length === 0 ? (
            <p className="text-[0.85rem] text-muted-foreground">
              Run analysis to see generated opportunities.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-3">
              {runResult.opportunities.map((opp, i) => (
                <div
                  key={opp.id}
                  className={cn(
                    "rounded-xl border p-4",
                    i === 0
                      ? "border-accent/50 bg-[oklch(0.745_0.132_72_/_0.06)]"
                      : "border-border/60 bg-card/60",
                  )}
                >
                  <p className="text-[0.72rem] font-semibold uppercase text-muted-foreground">
                    {i === 0 ? "Primary" : `Alternative #${i + 1}`}
                  </p>
                  <p className="mt-1 font-display text-[1.05rem] font-semibold text-primary">
                    {opp.title}
                  </p>
                  <p className="mt-1 text-[0.82rem] text-muted-foreground">{opp.oneLiner}</p>
                  <p className="mt-2 text-[0.88rem] font-medium text-accent">
                    Fit: {opp.fitScore}/100
                  </p>
                  <dl className="mt-2 flex flex-col gap-0.5 text-[0.74rem] text-muted-foreground">
                    {Object.entries(opp.breakdown).map(([k, v]) => (
                      <div key={k} className="flex justify-between">
                        <span>{k}</span>
                        <span className="text-foreground">{v}</span>
                      </div>
                    ))}
                  </dl>
                  {opp.id && !opp.id.startsWith("preview-") && (
                    <Link
                      to="/dashboard/opportunities/$id"
                      params={{ id: opp.id }}
                      className="mt-3 inline-block text-[0.78rem] text-accent hover:underline"
                    >
                      View real detail page →
                    </Link>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        <section id="market" className="flex flex-col gap-3">
          <h2 className="font-display text-xl font-semibold text-primary">Market / Evidence</h2>
          <p className="max-w-2xl text-[0.85rem] text-muted-foreground">
            Market evidence is generated lazily on first view of an opportunity's real detail page
            (and cached across users by category+title for 30 days) — it's not part of the initial
            generation batch, so it isn't re-run here. Open a "View real detail page" link above to
            trigger and inspect it live, including real source citations.
          </p>
        </section>

        <section id="personalization" className="flex flex-col gap-4">
          <h2 className="font-display text-xl font-semibold text-primary">Personalization Test</h2>
          <p className="max-w-2xl text-[0.85rem] text-muted-foreground">
            Runs two deliberately opposite profiles (17yo cautious student, ₹0 capital vs. 35yo
            experienced business owner, ₹10L, high risk) through the real pipeline sequentially and
            checks whether the recommendations actually differ.
          </p>
          <Button onClick={handleTwoProfileTest} disabled={runningTwoProfile} className="w-fit">
            {runningTwoProfile && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
            Run Two-Profile Test
          </Button>

          {twoProfileResult && (
            <div className="flex flex-col gap-4">
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
                {twoProfileResult.reason}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-border/70 bg-card/60 p-4">
                  <p className="text-[0.78rem] font-semibold uppercase text-muted-foreground">
                    Profile A — 17yo student, ₹0, cautious
                  </p>
                  <div className="mt-2">
                    <OpportunityResultCard result={twoProfileResult.profileA} />
                  </div>
                </div>
                <div className="rounded-xl border border-border/70 bg-card/60 p-4">
                  <p className="text-[0.78rem] font-semibold uppercase text-muted-foreground">
                    Profile B — 35yo business owner, ₹10L, high risk
                  </p>
                  <div className="mt-2">
                    <OpportunityResultCard result={twoProfileResult.profileB} />
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>

        <section id="diagnostics" className="flex flex-col gap-3 pb-20">
          <h2 className="font-display text-xl font-semibold text-primary">
            Cache &amp; Session Diagnostics
          </h2>
          <div className="max-w-2xl rounded-xl border border-border/70 bg-card/60 p-4 text-[0.85rem] leading-relaxed text-muted-foreground">
            <p>
              <span className="font-medium text-foreground">Reviewer identity:</span>{" "}
              {identity.data?.email} (hash <code>{identity.data?.userIdHash}</code>) — every write
              from this page is scoped to this account by Postgres row-level security, the same as
              any real user. There is no shared "sandbox" table and no special-cased bypass.
            </p>
            <p className="mt-2">
              <span className="font-medium text-foreground">Client cache isolation:</span> the app's
              React Query cache is explicitly cleared (<code>queryClient.clear()</code>) on every
              sign-in, sign-up, and OAuth callback (see <code>DashboardShell.tsx</code>,{" "}
              <code>SignInDialog.tsx</code>, <code>AccountGate.tsx</code>,{" "}
              <code>routes/auth/callback.tsx</code>) — this was a real bug found and fixed earlier:
              a second account signing in on the same tab used to see the first account's cached
              dashboard data until a query happened to refetch on its own.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
