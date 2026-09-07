import { motion } from "motion/react";
import type { FounderGenome, FounderPersona, GenomeDimension } from "@/lib/profile/founder-genome";
import { cn } from "@/lib/utils";

const DOT_COUNT = 5;

/** score (0-100) -> how many of 5 dots are filled. Rounds to the nearest
 * dot rather than floor/ceil, so a 79 and an 81 don't visually disagree
 * with which side of "4 dots" they're on more than they should. */
function filledDots(score: number): number {
  return Math.min(DOT_COUNT, Math.max(0, Math.round((score / 100) * DOT_COUNT)));
}

function DimensionRow({
  dimension,
  index,
  color,
}: {
  dimension: GenomeDimension;
  index: number;
  color: string;
}) {
  const filled = filledDots(dimension.score);
  return (
    <motion.div
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.06, duration: 0.35 }}
      className="flex items-center justify-between gap-3"
    >
      <span className="text-[0.8rem] text-dashboard-body">{dimension.label}</span>
      <span className="flex items-center gap-1" aria-hidden="true">
        {Array.from({ length: DOT_COUNT }).map((_, i) => (
          <span
            key={i}
            className="size-2 rounded-full transition-colors duration-300"
            style={{ backgroundColor: i < filled ? color : "var(--border)" }}
          />
        ))}
      </span>
      <span className="sr-only">{dimension.score}/100</span>
    </motion.div>
  );
}

/** The compact, dashboard-scoped genome card — dot rows + persona, no
 * expandable narrative (that's what BusinessDnaPanel is for). Every dot
 * row is deterministically derived (see founder-genome.ts), never an AI
 * guess dressed up as a visual. */
export function FounderGenomeCard({
  genome,
  persona,
  color = "var(--gold)",
}: {
  genome: FounderGenome;
  persona?: FounderPersona;
  color?: string;
}) {
  return (
    <div className="rounded-[1.5rem] border border-border/70 bg-card/70 p-6 sm:p-7">
      <p className="eyebrow text-dashboard-muted">Founder Genome</p>
      {persona && (
        <div className="mt-2 flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
          <h3 className="font-display text-[1.3rem] font-semibold text-dashboard-heading">
            {persona.name}
          </h3>
        </div>
      )}
      {persona && persona.attributes.length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {persona.attributes.map((attr) => (
            <span
              key={attr}
              className="rounded-full border border-border/70 bg-secondary/60 px-2.5 py-1 text-[0.74rem] font-medium text-dashboard-muted"
            >
              {attr}
            </span>
          ))}
        </div>
      )}
      <div className="mt-5 flex flex-col gap-2.5">
        {genome.dimensions.map((d, i) => (
          <DimensionRow key={d.key} dimension={d} index={i} color={color} />
        ))}
      </div>
      <div className="mt-4 flex flex-wrap gap-1.5 border-t border-border/50 pt-4">
        <span className="rounded-full bg-violet/10 px-2.5 py-1 text-[0.72rem] font-medium text-violet">
          {genome.executionStyle}
        </span>
        <span className="rounded-full bg-econ-green-soft px-2.5 py-1 text-[0.72rem] font-medium text-econ-green-deep">
          {genome.independence}
        </span>
      </div>
    </div>
  );
}

/** The live, in-progress version shown during onboarding's thinking
 * pauses — same dot visual, no persona yet (that only makes sense once
 * enough signals exist), plus the "X% mapped" headline the founder sees
 * forming instead of a raw question counter. */
export function FounderGenomeForming({
  genome,
  progress,
  color,
}: {
  genome: FounderGenome;
  progress: number;
  color: string;
}) {
  return (
    <div className="mx-auto flex w-full max-w-xs flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-[0.78rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          Founder Profile
        </p>
        <p className="text-[0.78rem] font-semibold" style={{ color }}>
          {progress}% mapped
        </p>
      </div>
      <div className={cn("flex flex-col gap-2")}>
        {genome.dimensions.map((d, i) => (
          <DimensionRow key={d.key} dimension={d} index={i} color={color} />
        ))}
      </div>
    </div>
  );
}
