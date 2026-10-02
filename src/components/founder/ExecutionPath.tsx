import { useNavigate } from "@tanstack/react-router";
import { motion, useReducedMotion } from "motion/react";
import { Check, TriangleAlert } from "lucide-react";

import type { AssumptionDTO } from "@/lib/actions/proof";
import type { MessageKey } from "@/lib/i18n";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

type NodeId =
  "direction" | "problem" | "payment" | "offer" | "delivery" | "repeatability" | "growth";
type Category = AssumptionDTO["category"];
type Status = "completed" | "testing" | "contradicted" | "untested" | "none";

/** The route from "a direction was chosen" to "it grows", read off the founder's
 * REAL assumptions. Each stop owns the assumption categories that belong to it,
 * so its state is whatever the evidence says — never a score or a percentage. */
const NODES: { id: NodeId; categories: Category[] }[] = [
  { id: "direction", categories: [] },
  { id: "problem", categories: ["problem"] },
  { id: "payment", categories: ["willingness_to_pay", "pricing"] },
  { id: "offer", categories: ["competition", "other"] },
  { id: "delivery", categories: ["delivery"] },
  { id: "repeatability", categories: ["retention"] },
  { id: "growth", categories: ["distribution"] },
];

function statusOf(items: AssumptionDTO[]): Status {
  if (items.length === 0) return "none";
  if (items.some((a) => a.state === "contradicted")) return "contradicted";
  if (items.every((a) => a.state === "supported")) return "completed";
  if (items.some((a) => a.state !== "untested")) return "testing";
  return "untested";
}

export function ExecutionPath({
  opportunityId,
  assumptions,
  loading,
}: {
  opportunityId: string;
  assumptions: AssumptionDTO[];
  loading: boolean;
}) {
  const { t } = useLocale();
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();

  const stops = NODES.map((n) => {
    const items = assumptions.filter((a) => n.categories.includes(a.category));
    const status: Status = n.id === "direction" ? "completed" : statusOf(items);
    return { ...n, items, status };
  });
  // "You are here": the first stop after the direction that is not yet supported.
  const currentIndex = stops.findIndex((s, i) => i > 0 && s.status !== "completed");

  const go = (stop: (typeof stops)[number]) => {
    if (stop.id === "direction") {
      void navigate({ to: "/dashboard/opportunities/$id", params: { id: opportunityId } });
      return;
    }
    const target = stop.items.find((a) => a.state !== "supported") ?? stop.items[0];
    void navigate({
      to: "/dashboard/proof",
      search: { opportunity: opportunityId, ...(target ? { assumption: target.id } : {}) },
    });
  };

  if (loading) {
    return (
      <div
        className="flex gap-3 overflow-hidden py-1"
        aria-busy="true"
        data-testid="execution-path-loading"
      >
        {NODES.map((n) => (
          <span key={n.id} className="flex flex-1 flex-col items-center gap-2">
            <span className="size-9 animate-pulse rounded-full bg-white/10" />
            <span className="h-2.5 w-14 animate-pulse rounded-full bg-white/10" />
          </span>
        ))}
      </div>
    );
  }

  const hasAssumptions = assumptions.length > 0;

  return (
    <div data-testid="execution-path">
      <nav aria-label={t("cc.path.aria")} className="-mx-1 overflow-x-auto px-1 pb-1">
        <ol className="flex min-w-[40rem] snap-x items-start sm:min-w-0">
          {stops.map((stop, i) => {
            const isCurrent = i === currentIndex;
            const done = stop.status === "completed";
            const warn = stop.status === "contradicted";
            const next = stops[i + 1];
            const segment = !next
              ? null
              : done
                ? next.status === "completed"
                  ? "bg-sol-champagne"
                  : "bg-gradient-to-r from-sol-champagne to-sol-violet"
                : "bg-white/15";
            const supported = stop.items.filter((a) => a.state === "supported").length;
            const stateKey: MessageKey = isCurrent
              ? "cc.path.state.current"
              : (`cc.path.state.${stop.status}` as MessageKey);
            const detail =
              stop.items.length > 0
                ? t("cc.path.count", { supported, total: stop.items.length })
                : stop.id === "direction"
                  ? t("cc.path.chosen")
                  : t("cc.path.state.none");
            return (
              <li
                key={stop.id}
                className="relative flex min-w-0 flex-1 snap-start flex-col items-center"
                data-testid={`path-node-${stop.id}`}
                data-status={isCurrent ? "current" : stop.status}
              >
                {segment && (
                  <motion.span
                    aria-hidden="true"
                    className={cn(
                      "absolute left-1/2 top-[21px] h-[3px] w-full origin-left rounded-full",
                      segment,
                    )}
                    initial={{ scaleX: reduceMotion ? 1 : 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: 0.45, delay: 0.1 + i * 0.09, ease: "easeOut" }}
                  />
                )}
                <button
                  type="button"
                  onClick={() => go(stop)}
                  aria-label={`${t(`cc.path.${stop.id}` as MessageKey)}: ${t(stateKey)}`}
                  title={`${t(`cc.path.${stop.id}` as MessageKey)} — ${detail}`}
                  className="group relative z-10 flex h-11 w-11 items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-sol-champagne"
                >
                  {isCurrent && !reduceMotion && (
                    <motion.span
                      aria-hidden="true"
                      className="absolute inset-0.5 rounded-full border-2 border-sol-violet/70"
                      animate={{ scale: [1, 1.35], opacity: [0.7, 0] }}
                      transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
                    />
                  )}
                  <motion.span
                    initial={{ scale: reduceMotion ? 1 : 0.6, opacity: reduceMotion ? 1 : 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.35, delay: 0.05 + i * 0.09 }}
                    className={cn(
                      "relative flex size-9 items-center justify-center rounded-full border-2 transition-transform duration-200 group-hover:scale-110",
                      done
                        ? "border-sol-champagne bg-sol-champagne text-sol-navy"
                        : isCurrent
                          ? "border-sol-violet bg-sol-violet text-white shadow-[0_0_0_4px_rgba(114,87,216,0.28)]"
                          : "border-white/25 bg-transparent text-white/55",
                    )}
                  >
                    {done ? (
                      <Check className="size-4" strokeWidth={3} aria-hidden="true" />
                    ) : (
                      <span className="text-[0.8125rem] font-bold">{i + 1}</span>
                    )}
                  </motion.span>
                  {warn && (
                    <span
                      className="absolute -right-0.5 -top-0.5 flex size-[18px] items-center justify-center rounded-full bg-sol-warning text-white ring-2 ring-sol-navy"
                      data-testid={`path-warning-${stop.id}`}
                    >
                      <TriangleAlert className="size-2.5" aria-hidden="true" />
                    </span>
                  )}
                </button>
                <span
                  className={cn(
                    "mt-1.5 text-center text-[0.8125rem] font-semibold leading-tight",
                    done || isCurrent ? "text-white" : "text-white/60",
                  )}
                >
                  {t(`cc.path.${stop.id}` as MessageKey)}
                </span>
                <span
                  className={cn(
                    "mt-0.5 text-center text-[0.75rem] leading-tight",
                    isCurrent ? "font-semibold text-sol-champagne" : "text-white/45",
                  )}
                >
                  {isCurrent
                    ? t("cc.path.state.current")
                    : warn
                      ? t("cc.path.state.contradicted")
                      : ""}
                </span>
              </li>
            );
          })}
        </ol>
      </nav>
      {!hasAssumptions && (
        <p className="mt-2 text-[0.9375rem] text-white/60" data-testid="execution-path-empty">
          {t("cc.path.empty")}
        </p>
      )}
    </div>
  );
}
