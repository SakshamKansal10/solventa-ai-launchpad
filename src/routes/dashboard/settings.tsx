import { type ReactNode, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Bell, History, Loader2, LogOut, Map, PencilLine, Sparkles, UserRound } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { SolventiaLoadingState } from "@/components/dashboard/SolventiaLoadingState";
import { AvatarUploader } from "@/components/dashboard/AvatarUploader";
import {
  FounderProfileEditSheet,
  type FounderProfileRow,
} from "@/components/dashboard/FounderProfileEditSheet";
import { Button } from "@/components/ui/button";
import { requireAuthLoader } from "@/lib/route-guards";
import { getSettingsData } from "@/lib/actions/dashboard";
import {
  getLatestBusinessDna,
  updateFounderProfileAnswers,
  reanalyzeFromCurrentProfile,
} from "@/lib/actions/profile";
import { signOut } from "@/lib/actions/auth";
import { formatMoney } from "@/lib/country-currency";
import type { NormalizedProfile } from "@/lib/profile/normalize";
import type { OnboardingAnswers } from "@/lib/onboarding-types";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { translateDashboardText } from "@/lib/i18n/dashboard-dictionary";

export const Route = createFileRoute("/dashboard/settings")({
  beforeLoad: requireAuthLoader,
  component: SettingsPage,
  head: () => ({
    meta: [{ title: "Settings — Solventia" }, { name: "robots", content: "noindex" }],
  }),
});

const RISK_LABEL: Record<string, string> = {
  cautious: "Cautious",
  balanced: "Balanced",
  experimental: "Comfortable experimenting",
};

/** Six compact rows, each mapped to the exact onboarding question(s) that
 * produced it — the same MCQ/search/select controls every founder
 * already used once, reused for editing, never a bespoke free-text
 * regression. */
const FOUNDER_PROFILE_ROWS: FounderProfileRow[] = [
  { key: "location", label: "Location", stepIds: ["country", "city"] },
  { key: "education", label: "Education", stepIds: ["education", "educationOther"] },
  { key: "time", label: "Time available", stepIds: ["timeAvailableWeekly"] },
  { key: "capital", label: "Starting capital", stepIds: ["investmentBudget", "preciseCapital"] },
  { key: "skills", label: "Skills", stepIds: ["skills"] },
  { key: "risk", label: "Risk appetite", stepIds: ["riskAppetite"] },
];

function founderProfileRowValue(
  row: FounderProfileRow,
  signals: NormalizedProfile,
  tr: (s: string) => string,
): string {
  switch (row.key) {
    case "location":
      return (
        [signals.identity.city, signals.identity.state, signals.identity.country]
          .filter(Boolean)
          .join(", ") || tr("Not set")
      );
    case "education":
      return signals.identity.education ?? tr("Not set");
    case "time":
      return signals.time.weeklyHours
        ? `${signals.time.weeklyHours} ${tr("hrs/week")}`
        : tr("Not set");
    case "capital":
      return formatMoney(signals.resources.capitalAmount, signals.identity.currency);
    case "skills":
      return `${signals.skills.length} ${tr("selected")}`;
    case "risk":
      return signals.risk.appetite
        ? (tr(RISK_LABEL[signals.risk.appetite]) ?? tr("Not set"))
        : tr("Not set");
    default:
      return tr("Not set");
  }
}

function FounderProfileRowItem({
  row,
  signals,
  onEdit,
  tr,
}: {
  row: FounderProfileRow;
  signals: NormalizedProfile;
  onEdit: () => void;
  tr: (s: string) => string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-sol-border/70 py-3.5 last:border-b-0">
      <div className="min-w-0">
        <p className="text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-sol-muted">
          {tr(row.label)}
        </p>
        <p className="mt-0.5 truncate text-[0.92rem] font-medium text-sol-ink">
          {founderProfileRowValue(row, signals, tr)}
        </p>
      </div>
      <button
        type="button"
        onClick={onEdit}
        className="shrink-0 text-[0.82rem] font-semibold text-sol-violet-deep hover:underline"
      >
        {tr("Edit")}
      </button>
    </div>
  );
}

function SettingsCard({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof UserRound;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[18px] border border-sol-border bg-sol-surface p-6 sm:p-7">
      <div className="flex items-center gap-2.5">
        <Icon className="size-4 text-sol-champagne-deep" aria-hidden="true" />
        <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-sol-muted">
          {title}
        </p>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function SettingsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ["settings-data"], queryFn: () => getSettingsData() });
  const dnaQuery = useQuery({
    queryKey: ["latest-business-dna-settings"],
    queryFn: () => getLatestBusinessDna(),
  });

  const { locale } = useLocale();
  const tr = (s: string) => translateDashboardText(s, locale) ?? s;
  const [editingRow, setEditingRow] = useState<FounderProfileRow | null>(null);
  const [profileChanged, setProfileChanged] = useState(false);
  const [reanalyzing, setReanalyzing] = useState(false);

  async function handleSignOut() {
    try {
      await signOut();
    } finally {
      queryClient.clear();
      navigate({ to: "/" });
    }
  }

  async function handleSaved(patch: Partial<OnboardingAnswers>) {
    try {
      await updateFounderProfileAnswers({ data: { answers: patch } });
      await queryClient.invalidateQueries({ queryKey: ["latest-business-dna-settings"] });
      await queryClient.invalidateQueries({ queryKey: ["settings-data"] });
      setProfileChanged(true);
      toast.success(tr("Saved."));
    } catch (err) {
      console.error("[settings] founder profile edit failed:", err);
      toast.error(tr("Couldn't save that change — try again."));
    }
  }

  async function handleReanalyze() {
    setReanalyzing(true);
    try {
      await reanalyzeFromCurrentProfile({ data: { locale } });
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      setProfileChanged(false);
      toast.success(tr("Sol is generating new directions from your updated profile."));
      navigate({ to: "/dashboard" });
    } catch (err) {
      console.error("[settings] re-analyze failed:", err);
      toast.error(tr("Sol couldn't re-analyze right now — try again."));
    } finally {
      setReanalyzing(false);
    }
  }

  const data = query.data;
  const signals = dnaQuery.data?.normalized_signals as unknown as NormalizedProfile | undefined;
  const rawAnswers = (dnaQuery.data?.onboarding_answers ?? {}) as OnboardingAnswers;
  // undefined while loading (nav stays in its normal, un-locked state until
  // we actually know) — never a false "locked" flash before data arrives.
  const hasRoadmap = data ? data.hasActiveRoadmap : undefined;
  const opportunityId = data?.activeOpportunityId ?? null;

  if (query.isLoading) {
    return (
      <DashboardShell>
        <div className="flex min-h-[50vh] items-center justify-center">
          <SolventiaLoadingState message={tr("Opening your settings…")} />
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell hasRoadmap={hasRoadmap} opportunityId={opportunityId} pageTitle={tr("Settings")}>
      <div className="mx-auto flex w-full max-w-[1120px] flex-col">
        <div className="flex items-center gap-4">
          <AvatarUploader
            avatarUrl={data?.avatarUrl ?? null}
            name={data?.fullName ?? null}
            email={data?.email ?? null}
          />
          <div>
            <h1 className="font-display text-[clamp(1.8rem,3.2vw,2.3rem)] font-semibold text-sol-ink">
              {data?.fullName || tr("Your Profile")}
            </h1>
            <p className="mt-0.5 text-[0.92rem] text-sol-secondary">{data?.email}</p>
          </div>
        </div>

        <div className="mt-8 grid gap-5 sm:grid-cols-2">
          <SettingsCard icon={UserRound} title={tr("Profile")}>
            <dl className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <dt className="text-[0.85rem] text-sol-secondary">{tr("Name")}</dt>
                <dd className="text-[0.9rem] font-medium text-sol-ink">
                  {data?.fullName || tr("Not set")}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-[0.85rem] text-sol-secondary">{tr("Email")}</dt>
                <dd className="text-[0.9rem] font-medium text-sol-ink">{data?.email}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-[0.85rem] text-sol-secondary">{tr("Founder status")}</dt>
                <dd className="text-[0.9rem] font-medium text-sol-ink">
                  {data?.currentStatus || tr("Not set")}
                </dd>
              </div>
            </dl>
          </SettingsCard>

          <SettingsCard icon={Sparkles} title={tr("Your Founder Journey")}>
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-[0.85rem] text-sol-secondary">{tr("Ideas generated")}</span>
                <span className="text-[0.9rem] font-medium text-sol-ink">
                  {data?.ideaCount ?? 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[0.85rem] text-sol-secondary">{tr("Roadmaps built")}</span>
                <span className="text-[0.9rem] font-medium text-sol-ink">
                  {data?.roadmapCount ?? 0}
                </span>
              </div>
            </div>
            <div className="mt-5 flex flex-col gap-2.5">
              <Button asChild variant="outline" size="sm" className="justify-start">
                <Link to="/dashboard/history">
                  <History className="size-4" aria-hidden="true" />
                  {tr("View Idea History")}
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="justify-start">
                <Link to="/dashboard/roadmap">
                  <Map className="size-4" aria-hidden="true" />
                  {tr("View Current Roadmap")}
                </Link>
              </Button>
            </div>
          </SettingsCard>
        </div>

        {/* ===== FOUNDER PROFILE — compact rows, per-field edit sheets ===== */}
        <section className="mt-5 rounded-[18px] border border-sol-border bg-sol-surface p-6 sm:p-7">
          <div className="flex items-center gap-2.5">
            <PencilLine className="size-4 text-sol-champagne-deep" aria-hidden="true" />
            <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-sol-muted">
              {tr("Founder Profile")}
            </p>
          </div>

          {dnaQuery.isLoading ? (
            <p className="mt-5 text-[0.85rem] text-sol-secondary">{tr("Loading…")}</p>
          ) : signals ? (
            <>
              <div className="mt-4 flex flex-col">
                {FOUNDER_PROFILE_ROWS.map((row) => (
                  <FounderProfileRowItem
                    key={row.key}
                    row={row}
                    signals={signals}
                    onEdit={() => setEditingRow(row)}
                    tr={tr}
                  />
                ))}
              </div>

              {profileChanged && (
                <div className="mt-5 rounded-xl border border-sol-champagne/30 bg-sol-champagne-soft/40 p-4">
                  <p className="text-[0.88rem] font-semibold text-sol-ink">
                    {tr("Your founder profile changed.")}
                  </p>
                  <p className="mt-1 text-[0.82rem] leading-relaxed text-sol-secondary">
                    {tr("Your current ideas are preserved.")}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setProfileChanged(false)}
                      className="rounded-lg border border-sol-border px-3.5 py-2 text-[0.8rem] font-semibold text-sol-ink transition-colors hover:border-sol-champagne/50"
                    >
                      {tr("Keep Current Ideas")}
                    </button>
                    <button
                      type="button"
                      onClick={handleReanalyze}
                      disabled={reanalyzing}
                      className="inline-flex items-center gap-2 rounded-lg bg-sol-navy px-3.5 py-2 text-[0.8rem] font-semibold text-white transition-colors hover:bg-sol-navy-soft disabled:opacity-60"
                    >
                      {reanalyzing && (
                        <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                      )}
                      {tr("Re-analyze Directions")}
                    </button>
                  </div>
                </div>
              )}

              <p className="mt-5 text-[0.76rem] leading-relaxed text-sol-secondary">
                {tr(
                  "Editing a field above updates your stored profile immediately and never touches your current ideas or roadmap on its own.",
                )}
              </p>
            </>
          ) : (
            <p className="mt-5 text-[0.85rem] text-sol-secondary">
              {tr("Complete a consultation to build your founder profile.")}
            </p>
          )}
        </section>

        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <SettingsCard icon={Sparkles} title={tr("Start Fresh")}>
            <p className="text-[0.88rem] leading-relaxed text-sol-ink">
              {tr(
                "Want Sol to find you a new set of directions from scratch? Redo the full consultation any time — your current ideas and roadmap stay exactly where they are.",
              )}
            </p>
            <button
              type="button"
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-sol-navy px-5 py-2.5 text-[0.85rem] font-semibold text-white transition-colors hover:bg-sol-navy-soft"
              onClick={() => navigate({ to: "/consultation" })}
            >
              {tr("Start New Consultation")}
            </button>
          </SettingsCard>

          <SettingsCard icon={Bell} title={tr("Notifications")}>
            <p className="text-[0.88rem] leading-relaxed text-sol-ink">
              {tr("Email reminders for pending roadmap actions are coming soon.")}
            </p>
            <span className="mt-3 inline-block rounded-full border border-sol-border bg-sol-ivory px-3 py-1 text-[0.72rem] font-semibold text-sol-muted">
              {tr("Coming soon")}
            </span>
          </SettingsCard>
        </div>

        <section className="mt-5 rounded-[18px] border border-sol-danger/25 bg-sol-danger/[0.04] p-6 sm:p-7">
          <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-sol-danger/80">
            {tr("Account")}
          </p>
          <p className="mt-2 text-[0.88rem] leading-relaxed text-sol-ink">
            {tr("Sign out of Solventia on this device.")}
          </p>
          <Button variant="outline" className="mt-4" onClick={handleSignOut}>
            <LogOut className="size-4" aria-hidden="true" />
            {tr("Sign Out")}
          </Button>
        </section>
      </div>

      <FounderProfileEditSheet
        open={editingRow !== null}
        onOpenChange={(open) => {
          if (!open) setEditingRow(null);
        }}
        row={editingRow}
        currentAnswers={rawAnswers}
        onSaved={handleSaved}
      />
    </DashboardShell>
  );
}
