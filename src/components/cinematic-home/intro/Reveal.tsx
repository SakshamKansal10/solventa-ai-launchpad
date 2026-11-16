import logo from "@/assets/brand/s-logo.svg?inline";
import { BrandMark, BrandSignature, BrandWordmark } from "@/components/brand/Brand";

/**
 * The Solventia reveal (owner, 2026-11-16): the answer to every opening. CSS only — transform,
 * opacity and clip-path on the REAL lockup (the film's first frame), no layout work, no per-frame
 * JS. It plays while `main[data-intro-state=reveal]` (or, for the still version, inside
 * `[data-reveal-run]`); the stylesheet is in IntroShared. Timeline (ms from the start):
 *   0–350     the lead-in line lifts 12 px and fades (the opening's own layer)
 *   300–700   a champagne hairline draws from the centre outwards
 *   650–1150  the S: its two halves slide in from opposite sides and lock (slight overshoot)
 *   1150–1600 a gold glint sweeps once across the mark
 *   900–1760  SOLVENTIA: letters rise from behind a clip line, 45 ms apart, spacing settling
 *   1450–2150 VALIDATE · BUILD · ELEVATE word by word, the gold dots last
 *   2000–2200 the hairline fades; hold to 2400, then the film (or the lockup's hold)
 * Reduced motion: a 300 ms fade.
 */
export const LEAD_OUT_MS = 350;
export const REVEAL_MS = 2_400;
export const REVEAL_REDUCED_MS = 300;

/** The emblem as two halves (the same image, clipped), which assemble into one mark. */
export function RevealMark({ height }: { height?: number }) {
  return (
    <span className="relative block" data-rv-mark>
      <span data-rv="top" className="block [clip-path:inset(0_0_50%_0)]">
        <BrandMark height={height} />
      </span>
      <span data-rv="bottom" className="absolute inset-0 block [clip-path:inset(50%_0_0_0)]">
        <BrandMark height={height} />
      </span>
      {/* The glint is masked to the emblem's own shape: a plain composited sweep, no blending. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 block overflow-hidden"
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
  );
}

/** The champagne hairline the lockup assembles on (centred in its positioned parent). */
export function RevealLine() {
  return (
    <span
      data-rv="line"
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-[max(6vw,calc(50%-380px))] top-1/2 block h-px"
      style={{ background: "#C9AA79" }}
    />
  );
}

/** For the still version (it has no film first frame): the same lockup, revealed in place. */
export function RevealLockup() {
  return (
    <div
      data-reveal-run
      aria-hidden="true"
      className="relative flex w-full max-w-[min(820px,100%)] flex-col items-center justify-center gap-[clamp(0.55rem,1.4vw,1.2rem)] px-4"
    >
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
  );
}
