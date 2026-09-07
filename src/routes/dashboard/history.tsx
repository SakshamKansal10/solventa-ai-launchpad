import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { History } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { SolventiaLoadingState } from "@/components/dashboard/SolventiaLoadingState";
import { requireAuthLoader } from "@/lib/route-guards";
import { getConsultationHistory, getSettingsData } from "@/lib/actions/dashboard";

export const Route = createFileRoute("/dashboard/history")({
  beforeLoad: requireAuthLoader,
  component: HistoryPage,
  head: () => ({
    meta: [{ title: "Idea History — Solventia" }, { name: "robots", content: "noindex" }],
  }),
});

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function HistoryPage() {
  const query = useQuery({
    queryKey: ["consultation-history"],
    queryFn: () => getConsultationHistory(),
  });
  // Same "settings-data" query key Settings itself uses — often already
  // warm from navigating between the two, and keeps the Roadmap nav's
  // locked/unlocked state consistent across every dashboard page.
  const settingsQuery = useQuery({ queryKey: ["settings-data"], queryFn: () => getSettingsData() });
  const hasRoadmap = settingsQuery.data ? settingsQuery.data.hasActiveRoadmap : undefined;

  return (
    <DashboardShell hasRoadmap={hasRoadmap} pageTitle="History">
      <div className="flex items-center gap-3">
        <History className="size-6 text-sol-champagne-deep" aria-hidden="true" />
        <div>
          <h1 className="font-display text-[clamp(1.8rem,3.2vw,2.3rem)] font-semibold text-sol-ink">
            Idea History
          </h1>
          <p className="mt-1 text-[0.92rem] text-sol-secondary">
            How your direction has evolved over time. Your latest consultation is always the current
            dashboard view.
          </p>
        </div>
      </div>

      {query.isLoading && (
        <div className="mt-10 flex justify-center">
          <SolventiaLoadingState message="Gathering your past consultations…" />
        </div>
      )}

      {query.data && query.data.length === 0 && (
        <div className="mt-10 rounded-[18px] border border-sol-border bg-sol-surface px-8 py-14 text-center">
          <p className="text-[0.95rem] text-sol-secondary">
            You don&rsquo;t have any past consultations yet — this is your first one.
          </p>
        </div>
      )}

      {query.data && query.data.length > 0 && (
        <div className="relative mt-10 flex flex-col gap-10">
          {/* The connecting timeline rail — one continuous line behind every
           * consultation's dot, so the page reads as a single evolving path
           * rather than a stack of unrelated cards. */}
          <div
            className="absolute left-[7px] top-2 bottom-2 w-px bg-sol-border"
            aria-hidden="true"
          />
          {query.data.map((entry) => (
            <div key={entry.businessDnaId} className="relative pl-9">
              <span
                className="absolute left-0 top-1.5 flex size-[15px] items-center justify-center rounded-full border-2 border-sol-champagne bg-sol-surface"
                aria-hidden="true"
              >
                <span className="size-1.5 rounded-full bg-sol-champagne" />
              </span>
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.1em] text-sol-muted">
                Consultation — {formatDate(entry.createdAt)}
              </p>
              <section className="mt-3 rounded-[18px] border border-sol-border bg-sol-surface p-6">
                <div className="flex flex-col divide-y divide-sol-border">
                  {entry.opportunities.map((opp) => (
                    <div
                      key={opp.id}
                      className="flex flex-col gap-2 py-3.5 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-display text-[1rem] font-semibold text-sol-ink">
                            {opp.title}
                          </h3>
                          {opp.status === "selected" && (
                            <span className="rounded-full border border-econ-green-active/30 bg-econ-green-soft px-2 py-0.5 text-[0.68rem] font-semibold text-econ-green-active">
                              Previously selected
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 line-clamp-1 text-[0.82rem] text-sol-secondary">
                          {opp.oneLiner}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        <span className="text-[0.8rem] font-semibold text-sol-champagne-deep">
                          {opp.fitScore}/100
                        </span>
                        <Link
                          to="/dashboard/opportunities/$id"
                          params={{ id: opp.id }}
                          className="rounded-full border border-sol-border px-3.5 py-1.5 text-[0.78rem] font-medium text-sol-ink hover:border-sol-champagne/50"
                        >
                          View
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          ))}
        </div>
      )}
    </DashboardShell>
  );
}
