import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronDown } from "lucide-react";
import type { FounderDNA, FounderAnalysis } from "@/lib/ai/schemas";
import type { NormalizedProfile } from "@/lib/profile/normalize";
import { toDisplayFounderDNA } from "@/lib/founder-dna-display";
import { formatCompactMoney } from "@/lib/country-currency";
import { cn } from "@/lib/utils";

interface BusinessDnaPanelProps {
  analysis: FounderDNA | FounderAnalysis | null;
  signals: NormalizedProfile;
}

const RISK_LABEL: Record<string, string> = {
  cautious: "Cautious",
  balanced: "Balanced",
  experimental: "Comfortable experimenting",
};

/** A short list of facts rendered as chips, not a dot-joined sentence —
 * scans in under a second instead of being read word by word. */
function DnaBlock({ label, items }: { label: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className="text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-dashboard-muted">
        {label}
      </p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {items.map((item) => (
          <span
            key={item}
            className="rounded-full border border-border/70 bg-card px-3 py-1.5 text-[0.82rem] font-medium text-dashboard-body"
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

/** A compact, honest reflection of what Sol actually knows — structured
 * chip rows, not a founder-profile essay. Every value shown here is a
 * real stored signal, traceable back to a specific consultation answer.
 * The full narrative is one click away, never the default view. */
export function BusinessDnaPanel({ analysis, signals }: BusinessDnaPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const dna = toDisplayFounderDNA(analysis);

  const resourceChips = [
    `${signals.time.weeklyHours} hrs/week`,
    `~${formatCompactMoney(signals.resources.capitalAmount, signals.identity.currency)}`,
    ...(dna?.resources.slice(0, 2) ?? signals.resources.assets.slice(0, 2)),
  ].filter(Boolean);

  const directionChips = dna?.direction ? [dna.direction] : signals.direction.goals.slice(0, 3);
  const solNote = dna?.strategicSignals[0];

  return (
    <section
      id="business-dna"
      className="scroll-mt-24 rounded-[1.75rem] border border-border/70 bg-card/70 p-6 sm:p-8"
    >
      <div className="flex items-center justify-between">
        <p className="eyebrow text-gold">Your Business DNA</p>
        <Link
          to="/consultation"
          className="text-[0.8rem] font-medium text-dashboard-muted hover:text-dashboard-heading"
        >
          Update
        </Link>
      </div>

      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        {dna && <DnaBlock label="Your Edge" items={dna.strengths.slice(0, 3)} />}
        <DnaBlock label="Your Resources" items={resourceChips} />
        {dna && <DnaBlock label="Your Constraints" items={dna.constraints.slice(0, 3)} />}
        <DnaBlock label="Your Direction" items={directionChips} />
      </div>

      {solNote && (
        <div className="mt-6 rounded-xl border border-violet/18 bg-violet/5 p-4">
          <p className="text-[0.7rem] font-semibold uppercase tracking-wide text-violet">
            Sol Noticed
          </p>
          <p className="mt-1.5 text-[0.9rem] leading-relaxed text-dashboard-body">{solNote}</p>
        </div>
      )}

      {dna && (
        <>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="mt-6 flex items-center gap-1.5 text-[0.82rem] font-medium text-dashboard-muted hover:text-dashboard-heading"
          >
            <ChevronDown
              className={cn("size-3.5 transition-transform", expanded && "rotate-180")}
              aria-hidden="true"
            />
            {expanded ? "Hide full analysis" : "View full analysis"}
          </button>

          {expanded && (
            <div className="mt-4 flex flex-col gap-4 border-t border-border/60 pt-4">
              {dna.narrativeSummary && (
                <p className="text-[0.92rem] leading-relaxed text-dashboard-body">
                  {dna.narrativeSummary}
                </p>
              )}
              <dl className="grid gap-4 sm:grid-cols-2">
                {dna.workStyle && (
                  <div>
                    <dt className="text-[0.7rem] font-semibold uppercase tracking-wide text-dashboard-muted">
                      Work Style
                    </dt>
                    <dd className="mt-1 text-[0.87rem] text-dashboard-body">{dna.workStyle}</dd>
                  </div>
                )}
                {(dna.riskProfile || signals.risk.appetite) && (
                  <div>
                    <dt className="text-[0.7rem] font-semibold uppercase tracking-wide text-dashboard-muted">
                      Risk Profile
                    </dt>
                    <dd className="mt-1 text-[0.87rem] text-dashboard-body">
                      {dna.riskProfile ??
                        (signals.risk.appetite ? RISK_LABEL[signals.risk.appetite] : "Unknown")}
                    </dd>
                  </div>
                )}
              </dl>
              {dna.strategicSignals.length > 1 && (
                <div>
                  <p className="text-[0.7rem] font-semibold uppercase tracking-wide text-dashboard-muted">
                    More From Sol
                  </p>
                  <ul className="mt-2 flex flex-col gap-1.5">
                    {dna.strategicSignals.slice(1).map((s) => (
                      <li key={s} className="text-[0.87rem] leading-relaxed text-dashboard-body">
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}
