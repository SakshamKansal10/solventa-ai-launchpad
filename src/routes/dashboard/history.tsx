import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { History } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { SolventiaLoadingState } from "@/components/dashboard/SolventiaLoadingState";
import { requireAuthLoader } from "@/lib/route-guards";
import { getConsultationHistory } from "@/lib/actions/dashboard";

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

  return (
    <DashboardShell>
      <div className="flex items-center gap-3">
        <History className="size-6 text-gold" aria-hidden="true" />
        <div>
          <h1 className="font-display text-[clamp(1.8rem,3.2vw,2.3rem)] font-semibold text-dashboard-heading">
            Idea History
          </h1>
          <p className="mt-1 text-[0.92rem] text-dashboard-muted">
            Every direction Sol has ever found for you. Your latest consultation is always the
            current dashboard view.
          </p>
        </div>
      </div>

      {query.isLoading && (
        <div className="mt-10 flex justify-center">
          <SolventiaLoadingState message="Gathering your past consultations…" />
        </div>
      )}

      {query.data && query.data.length === 0 && (
        <div className="mt-10 rounded-[1.5rem] border border-border/70 bg-card/70 px-8 py-14 text-center">
          <p className="text-[0.95rem] text-dashboard-muted">
            You don&rsquo;t have any past consultations yet — this is your first one.
          </p>
        </div>
      )}

      {query.data && query.data.length > 0 && (
        <div className="mt-8 flex flex-col gap-5">
          {query.data.map((entry) => (
            <section
              key={entry.businessDnaId}
              className="rounded-[1.5rem] border border-border/70 bg-card/60 p-6"
            >
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.1em] text-dashboard-muted">
                Consultation — {formatDate(entry.createdAt)}
              </p>
              <div className="mt-4 flex flex-col divide-y divide-border/60">
                {entry.opportunities.map((opp) => (
                  <div
                    key={opp.id}
                    className="flex flex-col gap-2 py-3.5 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-display text-[1rem] font-semibold text-dashboard-heading">
                          {opp.title}
                        </h3>
                        {opp.status === "selected" && (
                          <span className="rounded-full border border-econ-green-active/30 bg-econ-green-soft px-2 py-0.5 text-[0.68rem] font-semibold text-econ-green-active">
                            Previously selected
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 line-clamp-1 text-[0.82rem] text-dashboard-muted">
                        {opp.oneLiner}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="text-[0.8rem] font-semibold text-gold">
                        {opp.fitScore}/100
                      </span>
                      <Link
                        to="/dashboard/opportunities/$id"
                        params={{ id: opp.id }}
                        className="rounded-full border border-border/70 px-3.5 py-1.5 text-[0.78rem] font-medium text-dashboard-heading hover:border-gold/50"
                      >
                        View
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </DashboardShell>
  );
}
