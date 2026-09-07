import type { ReactNode } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, History, LogOut, Map, PencilLine, Sparkles, UserRound } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { SolventiaLoadingState } from "@/components/dashboard/SolventiaLoadingState";
import { Button } from "@/components/ui/button";
import { requireAuthLoader } from "@/lib/route-guards";
import { getSettingsData } from "@/lib/actions/dashboard";
import { signOut } from "@/lib/actions/auth";

export const Route = createFileRoute("/dashboard/settings")({
  beforeLoad: requireAuthLoader,
  component: SettingsPage,
  head: () => ({
    meta: [{ title: "Settings — Solventia" }, { name: "robots", content: "noindex" }],
  }),
});

function initials(name: string | null, email: string | null): string {
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/);
    return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
  }
  if (email) return email[0].toUpperCase();
  return "S";
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

  async function handleSignOut() {
    try {
      await signOut();
    } finally {
      queryClient.clear();
      navigate({ to: "/" });
    }
  }

  const data = query.data;
  // undefined while loading (nav stays in its normal, un-locked state until
  // we actually know) — never a false "locked" flash before data arrives.
  const hasRoadmap = data ? data.hasActiveRoadmap : undefined;

  if (query.isLoading) {
    return (
      <DashboardShell>
        <div className="flex min-h-[50vh] items-center justify-center">
          <SolventiaLoadingState message="Opening your settings…" />
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell hasRoadmap={hasRoadmap} pageTitle="Settings">
      <div className="flex items-center gap-4">
        <div
          className="flex size-16 shrink-0 items-center justify-center rounded-full font-display text-[1.4rem] font-semibold text-white"
          style={{
            background: "linear-gradient(135deg, var(--sol-champagne), var(--sol-violet))",
            boxShadow: "0 10px 28px -10px rgba(86,62,183,.28)",
          }}
        >
          {initials(data?.fullName ?? null, data?.email ?? null)}
        </div>
        <div>
          <h1 className="font-display text-[clamp(1.8rem,3.2vw,2.3rem)] font-semibold text-sol-ink">
            {data?.fullName || "Your Profile"}
          </h1>
          <p className="mt-0.5 text-[0.92rem] text-sol-secondary">{data?.email}</p>
        </div>
      </div>

      <div className="mt-8 grid gap-5 sm:grid-cols-2">
        <SettingsCard icon={UserRound} title="Profile">
          <dl className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <dt className="text-[0.85rem] text-sol-secondary">Name</dt>
              <dd className="text-[0.9rem] font-medium text-sol-ink">
                {data?.fullName || "Not set"}
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-[0.85rem] text-sol-secondary">Email</dt>
              <dd className="text-[0.9rem] font-medium text-sol-ink">{data?.email}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-[0.85rem] text-sol-secondary">Founder status</dt>
              <dd className="text-[0.9rem] font-medium text-sol-ink">
                {data?.currentStatus || "Not set"}
              </dd>
            </div>
          </dl>
          <p className="mt-4 text-[0.78rem] leading-relaxed text-sol-secondary">
            A profile picture upload is coming soon — for now Solventia uses your initials.
          </p>
          <Button asChild variant="outline" size="sm" className="mt-4 justify-start">
            <Link to="/consultation" search={{ edit: true }}>
              <PencilLine className="size-4" aria-hidden="true" />
              Edit Founder Profile
            </Link>
          </Button>
          <p className="mt-2 text-[0.76rem] leading-relaxed text-sol-secondary">
            Update individual answers from your last consultation without starting over. Your
            current ideas and roadmap aren&rsquo;t touched until you finish and submit.
          </p>
        </SettingsCard>

        <SettingsCard icon={Sparkles} title="Your Founder Journey">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-[0.85rem] text-sol-secondary">Ideas generated</span>
              <span className="text-[0.9rem] font-medium text-sol-ink">{data?.ideaCount ?? 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[0.85rem] text-sol-secondary">Roadmaps built</span>
              <span className="text-[0.9rem] font-medium text-sol-ink">
                {data?.roadmapCount ?? 0}
              </span>
            </div>
          </div>
          <div className="mt-5 flex flex-col gap-2.5">
            <Button asChild variant="outline" size="sm" className="justify-start">
              <Link to="/dashboard/history">
                <History className="size-4" aria-hidden="true" />
                View Idea History
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="justify-start">
              <Link to="/dashboard/roadmap">
                <Map className="size-4" aria-hidden="true" />
                View Current Roadmap
              </Link>
            </Button>
          </div>
        </SettingsCard>

        <SettingsCard icon={Sparkles} title="Start Fresh">
          <p className="text-[0.88rem] leading-relaxed text-sol-ink">
            Want Sol to find you a new set of directions? Redo the consultation any time — your
            current ideas and roadmap stay exactly where they are.
          </p>
          <button
            type="button"
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-sol-navy px-5 py-2.5 text-[0.85rem] font-semibold text-white transition-colors hover:bg-sol-navy-soft"
            onClick={() => navigate({ to: "/consultation" })}
          >
            Start New Consultation
          </button>
        </SettingsCard>

        <SettingsCard icon={Bell} title="Notifications">
          <p className="text-[0.88rem] leading-relaxed text-sol-ink">
            Email reminders for pending roadmap actions are coming soon.
          </p>
          <span className="mt-3 inline-block rounded-full border border-sol-border bg-sol-ivory px-3 py-1 text-[0.72rem] font-semibold text-sol-muted">
            Coming soon
          </span>
        </SettingsCard>
      </div>

      <section className="mt-6 rounded-[18px] border border-sol-danger/25 bg-sol-danger/[0.04] p-6 sm:p-7">
        <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-sol-danger/80">
          Account
        </p>
        <p className="mt-2 text-[0.88rem] leading-relaxed text-sol-ink">
          Sign out of Solventia on this device.
        </p>
        <Button variant="outline" className="mt-4" onClick={handleSignOut}>
          <LogOut className="size-4" aria-hidden="true" />
          Sign Out
        </Button>
      </section>
    </DashboardShell>
  );
}
