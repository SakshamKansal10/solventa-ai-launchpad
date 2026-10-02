import { useState } from "react";

import { useLocale } from "@/lib/i18n/LocaleProvider";
import type { AssumptionDTO } from "@/lib/actions/proof";
import type { ProofState } from "@/lib/proof/state";
import { cn } from "@/lib/utils";

/** The spec's 4 map states (Untested/Testing/Supported/Contradicted) are a
 * coarser view than the engine's 5 real ones — weak and mixed both read as
 * "actively being tested" here. The underlying state (shown on hover/focus
 * and reachable via the assumption card below) stays the real, precise one;
 * this view is a map, not a replacement. */
const MAP_TONE: Record<ProofState, { ring: string; fill: string; dot: string }> = {
  untested: { ring: "border-sol-border-strong", fill: "bg-sol-surface", dot: "bg-sol-muted" },
  weak: { ring: "border-sol-violet", fill: "bg-sol-violet-soft", dot: "bg-sol-violet" },
  mixed: { ring: "border-sol-violet", fill: "bg-sol-violet-soft", dot: "bg-sol-violet" },
  supported: {
    ring: "border-sol-champagne",
    fill: "bg-sol-champagne-soft",
    dot: "bg-sol-champagne-deep",
  },
  contradicted: {
    ring: "border-sol-warning",
    fill: "bg-sol-warning-soft",
    dot: "bg-sol-warning",
  },
};

/** Problem / Customer / Payment / Channel / Delivery, visually — except built
 * from each founder's REAL assumption categories rather than a fixed 5-name
 * list, since the real schema has 8 (problem, willingness_to_pay,
 * distribution, delivery, retention, pricing, competition, other) and a
 * founder's generated set rarely covers exactly 5. Forcing a fixed taxonomy
 * onto real data that doesn't match it would be the fabrication the rest of
 * Proof explicitly refuses to do — so this maps every real assumption, not
 * a canonical subset.
 *
 * Hover or focus (mouse / keyboard) shows an evidence summary under the map; a
 * click opens the assumption. On touch the first tap shows the summary and a
 * second tap on the same node opens it. */
export function EvidenceMap({
  assumptions,
  onSelect,
}: {
  assumptions: AssumptionDTO[];
  onSelect: (id: string) => void;
}) {
  const { t } = useLocale();
  const [active, setActive] = useState<string | null>(null);
  if (assumptions.length === 0) return null;

  const coarse = typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;
  const current = assumptions.find((a) => a.id === active) ?? null;
  const latest = current
    ? [...current.evidence].sort((x, y) => y.createdAt.localeCompare(x.createdAt))[0]
    : undefined;

  return (
    <div
      className="flex flex-col gap-4 rounded-[1.25rem] border border-sol-border bg-sol-surface p-5 sm:p-6"
      data-testid="evidence-map"
      role="group"
      aria-label={t("pf.map.aria")}
    >
      <div className="flex flex-wrap gap-4" onMouseLeave={() => setActive(null)}>
        {assumptions.map((a) => {
          const tone = MAP_TONE[a.state];
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => {
                if (coarse && active !== a.id) {
                  setActive(a.id);
                  return;
                }
                onSelect(a.id);
              }}
              onMouseEnter={() => setActive(a.id)}
              onFocus={() => setActive(a.id)}
              data-testid="evidence-map-node"
              data-state={a.state}
              aria-label={`${a.title} — ${t(`pf.state.${a.state}` as const)} — ${t("pf.evidenceCount", { n: a.evidence.length })}`}
              className="flex w-[84px] flex-col items-center gap-2 rounded-xl text-center transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sol-violet/50"
            >
              <span
                className={cn(
                  "flex size-14 items-center justify-center rounded-full border-2 text-[0.9375rem] font-bold text-sol-ink transition-shadow",
                  tone.ring,
                  tone.fill,
                  active === a.id && "shadow-[0_0_0_4px_rgba(114,87,216,0.18)]",
                )}
                aria-hidden="true"
              >
                {a.evidence.length > 0 ? a.evidence.length : ""}
                {a.evidence.length === 0 && (
                  <span className={cn("size-2 rounded-full", tone.dot)} />
                )}
              </span>
              <span className="line-clamp-2 text-[0.875rem] font-medium leading-tight text-sol-secondary">
                {a.title}
              </span>
            </button>
          );
        })}
      </div>

      <div
        className="min-h-[4.75rem] rounded-2xl bg-sol-ivory px-4 py-3"
        aria-live="polite"
        data-testid="evidence-map-summary"
      >
        {current ? (
          <>
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[1rem] font-semibold text-sol-ink">
              <span
                className={cn(
                  "inline-flex min-h-6 items-center rounded-full border px-2.5 text-[0.875rem] font-semibold",
                  MAP_TONE[current.state].ring,
                  MAP_TONE[current.state].fill,
                )}
              >
                {t(`pf.state.${current.state}` as const)}
              </span>
              <span className="min-w-0">{current.title}</span>
            </p>
            <p className="mt-1 line-clamp-2 text-[0.9375rem] text-sol-secondary">
              {t("pf.evidenceCount", { n: current.evidence.length })}
              {latest ? ` · ${latest.summary}` : ""}
            </p>
          </>
        ) : (
          <p className="text-[0.9375rem] text-sol-secondary">{t("pf.map.hint")}</p>
        )}
      </div>
    </div>
  );
}
