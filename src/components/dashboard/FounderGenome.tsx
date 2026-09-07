import { motion } from "motion/react";
import type { FounderGenome, GenomeDimension } from "@/lib/profile/founder-genome";
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
