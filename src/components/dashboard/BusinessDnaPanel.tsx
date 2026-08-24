import { Link } from "@tanstack/react-router";
import type { FounderDNA, FounderAnalysis } from "@/lib/ai/schemas";
import type { NormalizedProfile } from "@/lib/profile/normalize";
import { toDisplayFounderDNA } from "@/lib/founder-dna-display";
import { formatIndianCurrency, toIndianShorthand } from "@/lib/currency";

interface BusinessDnaPanelProps {
  analysis: FounderDNA | FounderAnalysis | null;
  signals: NormalizedProfile;
}

function capitalLabel(inr: number): string {
  const shorthand = toIndianShorthand(inr);
  return shorthand ? `~${shorthand}` : formatIndianCurrency(inr);
}

const RISK_LABEL: Record<string, string> = {
  cautious: "Cautious",
  balanced: "Balanced",
  experimental: "Comfortable experimenting",
};

/** A compact, honest reflection of what Sol actually knows — not a
 * dashboard filler card. Every value shown here is a real stored signal,
 * traceable back to a specific consultation answer. */
export function BusinessDnaPanel({ analysis, signals }: BusinessDnaPanelProps) {
  const dna = toDisplayFounderDNA(analysis);

  const facts = [
    { label: "Time", value: `${signals.time.weeklyHours} hrs/week` },
    { label: "Capital", value: capitalLabel(signals.resources.capitalINR) },
    { label: "Risk", value: signals.risk.appetite ? RISK_LABEL[signals.risk.appetite] : "Unknown" },
    { label: "Direction", value: dna?.direction ?? signals.direction.goals[0] ?? "Unspecified" },
  ];

  return (
    <section className="rounded-[1.5rem] border border-border/70 bg-card/70 p-6 sm:p-7">
      <div className="flex items-center justify-between">
        <p className="eyebrow text-econ-green-active">Your Business DNA</p>
        <Link
          to="/consultation"
          className="text-[0.78rem] font-medium text-muted-foreground hover:text-primary"
        >
          Review & update
        </Link>
      </div>

      {dna?.narrativeSummary && (
        <p className="mt-3 text-[0.92rem] leading-relaxed text-foreground">
          {dna.narrativeSummary}
        </p>
      )}

      <dl className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {facts.map((f) => (
          <div key={f.label}>
            <dt className="text-[0.7rem] font-semibold uppercase tracking-wide text-muted-foreground">
              {f.label}
            </dt>
            <dd className="mt-1 text-[0.88rem] font-medium text-foreground">{f.value}</dd>
          </div>
        ))}
      </dl>

      {dna && (dna.strengths.length > 0 || dna.constraints.length > 0) && (
        <div className="mt-6 grid gap-5 border-t border-border/60 pt-5 sm:grid-cols-2">
          {dna.strengths.length > 0 && (
            <div>
              <p className="text-[0.7rem] font-semibold uppercase tracking-wide text-muted-foreground">
                Your Edge
              </p>
              <ul className="mt-2 flex flex-col gap-1.5">
                {dna.strengths.slice(0, 3).map((s) => (
                  <li key={s} className="flex gap-2 text-[0.85rem] text-foreground">
                    <span className="mt-1.5 size-1 shrink-0 rounded-full bg-econ-green-active" />
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {dna.constraints.length > 0 && (
            <div>
              <p className="text-[0.7rem] font-semibold uppercase tracking-wide text-muted-foreground">
                Your Constraints
              </p>
              <ul className="mt-2 flex flex-col gap-1.5">
                {dna.constraints.slice(0, 3).map((c) => (
                  <li key={c} className="flex gap-2 text-[0.85rem] text-foreground">
                    <span className="mt-1.5 size-1 shrink-0 rounded-full bg-muted-foreground" />
                    {c}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {dna?.strategicSignals && dna.strategicSignals.length > 0 && (
        <div className="mt-5 rounded-xl border border-[oklch(0.606_0.19_292.7_/_0.18)] bg-[oklch(0.606_0.19_292.7_/_0.05)] p-4">
          <p className="text-[0.7rem] font-semibold uppercase tracking-wide text-[oklch(0.55_0.16_292.7)]">
            What Sol noticed
          </p>
          <ul className="mt-2 flex flex-col gap-1.5">
            {dna.strategicSignals.slice(0, 2).map((s) => (
              <li key={s} className="text-[0.85rem] leading-relaxed text-foreground">
                {s}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
