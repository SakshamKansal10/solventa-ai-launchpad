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
    <section className="rounded-[1.5rem] border border-border/70 bg-card/70 p-6 sm:p-7">
      <div className="flex items-center gap-2.5">
        <Icon className="size-4 text-gold" aria-hidden="true" />
        <p className="eyebrow text-dashboard-muted">{title}</p>
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
    <DashboardShell hasRoadmap={hasRoadmap}>
      <div className="flex items-center gap-4">
        <div className="flex size-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-gold to-violet font-display text-[1.4rem] font-semibold text-white shadow-[0_10px_28px_-10px_oklch(0.606_0.19_292.7_/_0.4)]">
          {initials(data?.fullName ?? null, data?.email ?? null)}
        </div>
        <div>
          <h1 className="font-display text-[clamp(1.8rem,3.2vw,2.3rem)] font-semibold text-dashboard-heading">
            {data?.fullName || "Your Profile"}
          </h1>
          <p className="mt-0.5 text-[0.92rem] text-dashboard-muted">{data?.email}</p>
        </div>
      </div>

      <div className="mt-8 grid gap-5 sm:grid-cols-2">
        <SettingsCard icon={UserRound} title="Profile">
          <dl className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <dt className="text-[0.85rem] text-dashboard-muted">Name</dt>
              <dd className="text-[0.9rem] font-medium text-dashboard-heading">
                {data?.fullName || "Not set"}
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-[0.85rem] text-dashboard-muted">Email</dt>
              <dd className="text-[0.9rem] font-medium text-dashboard-heading">{data?.email}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-[0.85rem] text-dashboard-muted">Founder status</dt>
              <dd className="text-[0.9rem] font-medium text-dashboard-heading">
                {data?.currentStatus || "Not set"}
              </dd>
            </div>
          </dl>
          <p className="mt-4 text-[0.78rem] leading-relaxed text-dashboard-muted">
            A profile picture upload is coming soon — for now Solventia uses your initials.
          </p>
          <Button asChild variant="outline" size="sm" className="mt-4 justify-start">
            <Link to="/consultation" search={{ edit: true }}>
              <PencilLine className="size-4" aria-hidden="true" />
              Edit Founder Profile
            </Link>
          </Button>
          <p className="mt-2 text-[0.76rem] leading-relaxed text-dashboard-muted">
            Update individual answers from your last consultation without starting over. Your
            current ideas and roadmap aren&rsquo;t touched until you finish and submit.
          </p>
        </SettingsCard>

        <SettingsCard icon={Sparkles} title="Your Founder Journey">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-[0.85rem] text-dashboard-muted">Ideas generated</span>
              <span className="text-[0.9rem] font-medium text-dashboard-heading">
                {data?.ideaCount ?? 0}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[0.85rem] text-dashboard-muted">Roadmaps built</span>
              <span className="text-[0.9rem] font-medium text-dashboard-heading">
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
          <p className="text-[0.88rem] leading-relaxed text-dashboard-body">
            Want Sol to find you a new set of directions? Redo the consultation any time — your
            current ideas and roadmap stay exactly where they are.
          </p>
          <Button asChild className="mt-4 bg-econ-green-active text-white hover:bg-econ-green-deep">
            <Link to="/consultation">Start New Consultation</Link>
          </Button>
        </SettingsCard>

        <SettingsCard icon={Bell} title="Notifications">
          <p className="text-[0.88rem] leading-relaxed text-dashboard-body">
            Email reminders for pending roadmap actions are coming soon.
          </p>
          <span className="mt-3 inline-block rounded-full border border-border/70 bg-secondary px-3 py-1 text-[0.72rem] font-semibold text-dashboard-muted">
            Coming soon
          </span>
        </SettingsCard>
      </div>

      <section className="mt-6 rounded-[1.5rem] border border-destructive/25 bg-destructive/[0.04] p-6 sm:p-7">
        <p className="eyebrow text-destructive/80">Account</p>
        <p className="mt-2 text-[0.88rem] leading-relaxed text-dashboard-body">
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
