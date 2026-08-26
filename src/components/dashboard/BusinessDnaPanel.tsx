import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronDown } from "lucide-react";
import type { FounderDNA, FounderAnalysis } from "@/lib/ai/schemas";
import type { NormalizedProfile } from "@/lib/profile/normalize";
import { toDisplayFounderDNA } from "@/lib/founder-dna-display";
import { formatIndianCurrency, toIndianShorthand } from "@/lib/currency";
import { cn } from "@/lib/utils";

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

function DnaBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
        {label}
      </p>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

/** A compact, honest reflection of what Sol actually knows — structured
 * blocks, not a founder-profile essay. Every value shown here is a real
 * stored signal, traceable back to a specific consultation answer. The
 * full narrative is one click away, never the default view. */
export function BusinessDnaPanel({ analysis, signals }: BusinessDnaPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const dna = toDisplayFounderDNA(analysis);

  const resourceChips = [
    `${signals.time.weeklyHours} hrs/week`,
    capitalLabel(signals.resources.capitalINR),
    ...(dna?.resources.slice(0, 2) ?? signals.resources.assets.slice(0, 2)),
  ].filter(Boolean);

  const direction = dna?.direction ?? signals.direction.goals[0] ?? "Not yet specified";
  const solNote = dna?.strategicSignals[0];

  return (
    <section
      id="business-dna"
      className="scroll-mt-24 rounded-[1.5rem] border border-border/70 bg-card/70 p-6 sm:p-7"
    >
      <div className="flex items-center justify-between">
        <p className="eyebrow text-econ-green-active">Your Business DNA</p>
        <Link
          to="/consultation"
          className="text-[0.78rem] font-medium text-muted-foreground hover:text-primary"
        >
          Update
        </Link>
      </div>

      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        {dna && dna.strengths.length > 0 && (
          <DnaBlock label="Your Edge">
            <p className="text-[0.88rem] leading-relaxed text-foreground">
              {dna.strengths.slice(0, 3).join(" · ")}
            </p>
          </DnaBlock>
        )}

        <DnaBlock label="Your Resources">
          <p className="text-[0.88rem] leading-relaxed text-foreground">
            {resourceChips.join(" · ")}
          </p>
        </DnaBlock>

        {dna && dna.constraints.length > 0 && (
          <DnaBlock label="Your Constraints">
            <p className="text-[0.88rem] leading-relaxed text-foreground">
              {dna.constraints.slice(0, 3).join(" · ")}
            </p>
          </DnaBlock>
        )}

        <DnaBlock label="Your Direction">
          <p className="text-[0.88rem] leading-relaxed text-foreground">{direction}</p>
        </DnaBlock>
      </div>

      {solNote && (
        <div className="mt-5 rounded-xl border border-[oklch(0.606_0.19_292.7_/_0.18)] bg-[oklch(0.606_0.19_292.7_/_0.05)] p-4">
          <p className="text-[0.68rem] font-semibold uppercase tracking-wide text-[oklch(0.55_0.16_292.7)]">
            Sol Noticed
          </p>
          <p className="mt-1.5 text-[0.88rem] leading-relaxed text-foreground">{solNote}</p>
        </div>
      )}

      {dna && (
        <>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="mt-5 flex items-center gap-1.5 text-[0.8rem] font-medium text-muted-foreground hover:text-primary"
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
                <p className="text-[0.9rem] leading-relaxed text-foreground">
                  {dna.narrativeSummary}
                </p>
              )}
              <dl className="grid gap-4 sm:grid-cols-2">
                {dna.workStyle && (
                  <div>
                    <dt className="text-[0.68rem] font-semibold uppercase tracking-wide text-muted-foreground">
                      Work Style
                    </dt>
                    <dd className="mt-1 text-[0.85rem] text-foreground">{dna.workStyle}</dd>
                  </div>
                )}
                {(dna.riskProfile || signals.risk.appetite) && (
                  <div>
                    <dt className="text-[0.68rem] font-semibold uppercase tracking-wide text-muted-foreground">
                      Risk Profile
                    </dt>
                    <dd className="mt-1 text-[0.85rem] text-foreground">
                      {dna.riskProfile ??
                        (signals.risk.appetite ? RISK_LABEL[signals.risk.appetite] : "Unknown")}
                    </dd>
                  </div>
                )}
              </dl>
              {dna.strategicSignals.length > 1 && (
                <div>
                  <p className="text-[0.68rem] font-semibold uppercase tracking-wide text-muted-foreground">
                    More From Sol
                  </p>
                  <ul className="mt-2 flex flex-col gap-1.5">
                    {dna.strategicSignals.slice(1).map((s) => (
                      <li key={s} className="text-[0.85rem] leading-relaxed text-foreground">
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
