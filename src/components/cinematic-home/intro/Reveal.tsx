import logo from "@/assets/brand/s-logo.svg?inline";
import { BrandMark, BrandSignature, BrandWordmark } from "@/components/brand/Brand";

/**
 * The Solventia reveal (owner, 2026-11-16): the answer to every opening. CSS only — transform,
 * opacity and clip-path — on the REAL lockup (the film's first frame), no layout work, no per-frame
 * JS. It plays while `main[data-intro-state=reveal]` (or, for the still version, inside
 * `[data-reveal-run]`); the stylesheet is in IntroShared. Timeline (ms from the start):
 *   0–600     the opening's text tightens and a thin gold scan line wipes it away, left to
 *             right; a faint navy hairline grid draws behind the sweep (ScanExit)
 *   600–900   the scan line shrinks into the centre of the screen; the grid fades
 *   900–1300  from that point, the champagne hairline draws outwards
 *   1300–1700 a still beat on the hairline
 *   1700–2200 the S: its two halves slide in from opposite sides and lock (slight overshoot)
 *   2200–2650 a gold glint sweeps once across the mark
 *   1950–2810 SOLVENTIA: letters rise from behind a clip line, 45 ms apart
 *   2500–3200 VALIDATE · BUILD · ELEVATE word by word, the gold dots last
 *   3050–3250 the hairline fades; hold to 3450, then the film (or the lockup's hold)
 * Reduced motion: a 300 ms fade.
 */
export const REVEAL_MS = 3_450;
export const REVEAL_REDUCED_MS = 300;

/** The brand's two colours for the transition. */
export const BRAND_GOLD = "#C9AA79";
const NAVY_HAIR = "rgba(11,31,59,0.09)";

/**
 * The emblem. At rest it is ONE whole copy of the original logo (`data-rv-whole`). Only while the
 * reveal runs, two clipped halves drawn in exactly the same box assemble over it
 * (`data-rv-half`, with the glint); when the reveal ends — or with reduced motion, or a skip —
 * the halves and the glint are hidden and the whole logo is what stays on screen, so no seam
 * between the halves can ever remain, at any size or zoom (owner, 2026-11-16).
 */
export function RevealMark({ height }: { height?: number }) {
  return (
    <span className="relative block" data-rv-mark>
      <span data-rv-whole className="block">
        <BrandMark height={height} />
      </span>
      <span data-rv-half aria-hidden="true" className="pointer-events-none absolute inset-0 block">
        <span data-rv="top" className="absolute inset-0 block [clip-path:inset(0_0_50%_0)]">
          <BrandMark height={height} />
        </span>
        <span data-rv="bottom" className="absolute inset-0 block [clip-path:inset(50%_0_0_0)]">
          <BrandMark height={height} />
        </span>
        {/* The glint, masked to the emblem's own shape: a plain composited sweep, no blending. */}
        <span
          className="absolute inset-0 block overflow-hidden"
          style={{
            maskImage: `url("${logo}")`,
            WebkitMaskImage: `url("${logo}")`,
            maskSize: "100% 100%",
            WebkitMaskSize: "100% 100%",
          }}
        >
          <span
            data-rv="glint"
            className="absolute inset-y-0 left-0 block w-1/2"
            style={{
              background:
                "linear-gradient(90deg, transparent, rgba(243,226,184,0.55) 45%, rgba(255,255,255,0.7) 50%, rgba(243,226,184,0.55) 55%, transparent)",
            }}
          />
        </span>
      </span>
    </span>
  );
}

/** The champagne hairline the lockup assembles on (centred in its positioned parent). */
export function RevealLine() {
  return (
    <span
      data-rv="line"
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-[max(6vw,calc(50%-380px))] top-1/2 block h-px"
      style={{ background: BRAND_GOLD }}
    />
  );
}

/**
 * The opening's exit, inside its full-screen layer: the faint navy grid that draws behind the
 * sweep, and the gold scan line, which ends as a point at the centre of the screen — exactly
 * where the hairline then starts to draw, so the exit and the reveal are one motion.
 */
export function ScanExit() {
  const grid = `repeating-linear-gradient(90deg, ${NAVY_HAIR} 0 1px, transparent 1px 56px), repeating-linear-gradient(0deg, ${NAVY_HAIR} 0 1px, transparent 1px 56px)`;
  return (
    <>
      <span
        data-rv="grid"
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 block"
        style={{ backgroundImage: grid }}
      />
      <span
        data-rv="scan"
        aria-hidden="true"
        className="pointer-events-none absolute left-0 top-0 z-10 block h-full w-[2px]"
        style={{ background: BRAND_GOLD }}
      />
    </>
  );
}

/** For the still version (it has no film first frame): the same lockup, revealed in place. */
export function RevealLockup() {
  return (
    <div
      data-reveal-run
      aria-hidden="true"
      className="absolute inset-0 flex items-center justify-center"
    >
      <div className="relative flex w-full max-w-[min(820px,100%)] flex-col items-center justify-center gap-[clamp(0.55rem,1.4vw,1.2rem)] self-stretch px-4">
        <RevealLine />
        <div className="relative flex items-center gap-[clamp(0.8rem,2.4vw,2rem)] [--mark-h:clamp(48px,13vw,120px)]">
          <RevealMark />
          <div className="flex flex-col gap-[clamp(0.5rem,1.2vw,1rem)]">
            <BrandWordmark split className="text-[clamp(30px,9vw,92px)]" color="var(--ink)" />
            <BrandSignature
              split
              className="text-[clamp(8.5px,2.4vw,20px)]"
              color="var(--ink)"
              separator="var(--accent-soft)"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
