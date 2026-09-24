import { useNavigate } from "@tanstack/react-router";

import type { ProofOverview } from "@/lib/actions/proof";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import type { RoadmapView } from "@/lib/roadmap/view";
import { Card, EmptyState } from "../ui";
import type { useRoadmapText } from "./text";

type RoadmapText = ReturnType<typeof useRoadmapText>;

/** A chart always ships with a real table for the same numbers. */
function TableAlternative({
  caption,
  head,
  rows,
}: {
  caption: string;
  head: string[];
  rows: (string | number)[][];
}) {
  const { t } = useLocale();
  return (
    <details className="mt-3">
      <summary className="cursor-pointer text-[0.9375rem] font-semibold text-sol-violet-deep">
        {t("rm.progress.viewTable")}
      </summary>
      <table className="mt-3 w-full text-left text-[0.9375rem]">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b border-sol-border text-sol-secondary">
            {head.map((h) => (
              <th key={h} scope="col" className="py-2 pr-4 font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-sol-border last:border-0">
              {r.map((c, j) => (
                <td key={j} className="py-2 pr-4 text-sol-ink">
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}

/** Only REAL data, and only once there is enough of it to mean something: no
 * fake analytics, no gauges, no 3-D. Every bar is a link to the week or
 * evidence behind it. */
export function ProgressTab({
  view,
  text,
  proof,
  opportunityId,
}: {
  view: RoadmapView;
  text: RoadmapText;
  proof: ProofOverview | undefined;
  opportunityId: string;
}) {
  const { t } = useLocale();
  const navigate = useNavigate();

  if (view.totals.completedWeeks < 2) {
    return (
      <div data-testid="progress-empty">
        <EmptyState title={t("rm.progress.emptyTitle")} body={t("rm.progress.emptyBody")} />
      </div>
    );
  }

  const worked = view.weeks.filter((w) => w.state !== "locked" && w.hasDetail);
  const maxMissions = Math.max(1, ...worked.map((w) => w.progress.total));
  const goWeek = (n: number) =>
    navigate({ to: "/dashboard/roadmap", search: { tab: "week", week: n } });

  const assumptions = proof?.available ? proof.assumptions : [];
  const maxEvidence = Math.max(1, ...assumptions.map((a) => a.evidence.length));

  return (
    <div className="grid gap-6" data-testid="progress-tab">
      <Card className="p-6" aria-labelledby="chart-missions">
        <h3 id="chart-missions" className="sol-h3">
          {t("rm.progress.missionsByWeek")}
        </h3>
        <ul className="mt-5 flex flex-col gap-2.5" role="list">
          {worked.map((w) => (
            <li key={w.id}>
              <button
                type="button"
                onClick={() => goWeek(w.number)}
                data-testid={`bar-week-${w.number}`}
                aria-label={t("rm.progress.barAria", {
                  n: w.number,
                  x: w.progress.completed,
                  y: w.progress.total,
                })}
                className="group flex w-full items-center gap-3 rounded-xl px-2 py-1 text-left hover:bg-sol-violet-soft/50"
              >
                <span className="w-20 shrink-0 text-[0.9375rem] font-semibold text-sol-secondary">
                  {t("common.weekN", { n: String(w.number).padStart(2, "0") })}
                </span>
                <span className="relative h-5 flex-1 overflow-hidden rounded-full bg-sol-ivory-depth">
                  <span
                    className="absolute inset-y-0 left-0 rounded-full bg-sol-champagne"
                    style={{ width: `${(w.progress.completed / maxMissions) * 100}%` }}
                  />
                  <span
                    className="absolute inset-y-0 left-0 rounded-full border-2 border-sol-violet/40"
                    style={{ width: `${(w.progress.total / maxMissions) * 100}%` }}
                  />
                </span>
                <span className="w-14 shrink-0 text-right text-[0.9375rem] font-semibold text-sol-ink">
                  {w.progress.completed}/{w.progress.total}
                </span>
              </button>
            </li>
          ))}
        </ul>
        <TableAlternative
          caption={t("rm.progress.missionsByWeek")}
          head={[
            t("common.weekN", { n: "" }).trim(),
            t("rm.progress.completedCol"),
            t("rm.progress.totalCol"),
          ]}
          rows={worked.map((w) => [w.number, w.progress.completed, w.progress.total])}
        />
      </Card>

      <Card className="p-6" aria-labelledby="chart-evidence">
        <h3 id="chart-evidence" className="sol-h3">
          {t("rm.progress.evidenceByAssumption")}
        </h3>
        {assumptions.length === 0 ? (
          <p className="mt-3 text-[1.0625rem] text-sol-secondary">
            {t("rm.progress.noAssumptions")}
          </p>
        ) : (
          <>
            <ul className="mt-5 flex flex-col gap-3" role="list">
              {assumptions.map((a) => {
                const s = a.evidence.filter((e) => e.signal === "supports").length;
                const c = a.evidence.filter((e) => e.signal === "contradicts").length;
                const n = a.evidence.length - s - c;
                const pct = (x: number) => `${(x / maxEvidence) * 100}%`;
                return (
                  <li key={a.id}>
                    <button
                      type="button"
                      onClick={() =>
                        navigate({
                          to: "/dashboard/proof",
                          search: { opportunity: opportunityId, assumption: a.id },
                        })
                      }
                      aria-label={t("rm.progress.evidenceAria", {
                        title: a.title,
                        n: a.evidence.length,
                      })}
                      className="flex w-full flex-col gap-1.5 rounded-xl px-2 py-1.5 text-left hover:bg-sol-violet-soft/50"
                    >
                      <span className="text-[1rem] font-medium leading-snug text-sol-ink">
                        {a.title}
                      </span>
                      <span className="flex h-4 w-full overflow-hidden rounded-full bg-sol-ivory-depth">
                        <span className="bg-sol-champagne" style={{ width: pct(s) }} />
                        <span className="bg-sol-border-strong" style={{ width: pct(n) }} />
                        <span className="bg-sol-warning" style={{ width: pct(c) }} />
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
            <TableAlternative
              caption={t("rm.progress.evidenceByAssumption")}
              head={[
                t("pf.dialog.assumption"),
                t("pf.signal.supports"),
                t("pf.signal.neutral"),
                t("pf.signal.contradicts"),
              ]}
              rows={assumptions.map((a) => [
                a.title,
                a.evidence.filter((e) => e.signal === "supports").length,
                a.evidence.filter((e) => e.signal === "neutral").length,
                a.evidence.filter((e) => e.signal === "contradicts").length,
              ])}
            />
          </>
        )}
      </Card>

      <Card className="p-6" aria-labelledby="chart-phases">
        <h3 id="chart-phases" className="sol-h3">
          {t("rm.progress.phaseCompletion")}
        </h3>
        <ul className="mt-5 flex flex-col gap-3" role="list">
          {view.phases.map((p, i) => {
            const weeks = view.weeks.filter((w) => w.phaseId === p.id);
            const done = weeks.filter((w) => w.state === "completed").length;
            return (
              <li key={p.id} className="flex flex-col gap-1.5">
                <span className="text-[1rem] font-medium text-sol-ink">
                  {i + 1}. {text.phaseTitle(p.id, p.title)}
                </span>
                <span
                  className="flex gap-1"
                  role="img"
                  aria-label={t("rm.phase.progress", { x: done, y: weeks.length })}
                >
                  {weeks.map((w) => (
                    <span
                      key={w.id}
                      className={
                        w.state === "completed"
                          ? "h-3 flex-1 rounded-full bg-sol-champagne"
                          : w.state === "locked"
                            ? "h-3 flex-1 rounded-full bg-sol-ivory-depth"
                            : "h-3 flex-1 rounded-full bg-sol-violet"
                      }
                    />
                  ))}
                </span>
              </li>
            );
          })}
        </ul>
        <TableAlternative
          caption={t("rm.progress.phaseCompletion")}
          head={[
            t("rm.progress.phaseCol"),
            t("rm.progress.completedCol"),
            t("rm.progress.totalCol"),
          ]}
          rows={view.phases.map((p) => {
            const weeks = view.weeks.filter((w) => w.phaseId === p.id);
            return [
              text.phaseTitle(p.id, p.title),
              weeks.filter((w) => w.state === "completed").length,
              weeks.length,
            ];
          })}
        />
      </Card>
    </div>
  );
}
