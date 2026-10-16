import type { CSSProperties } from "react";

import logo from "@/assets/brand/s-logo.svg";

/**
 * THE Solventia identity — one emblem, one wordmark, one signature — used everywhere:
 *
 *   BrandMark       the approved emblem (src/assets/brand/s-logo.svg), the asset itself
 *   BrandWordmark   SOLVENTIA in the canonical face (Montserrat, medium, wide tracking)
 *   BrandSignature  VALIDATE • BUILD • ELEVATE — three equal words, champagne separators
 *   BrandLockup     the three together, in a row (navigation) or stacked (brand moments)
 *
 * The emblem is never redrawn, recoloured, blurred or faded. The asset carries its own white
 * canvas; it is composited with `multiply`, so on the light fields it is designed for that canvas
 * becomes the page itself while the navy S and its gold edge stay exactly as drawn. (On a dark
 * field the emblem is not shown — the wordmark carries the identity there.) Its layout box hugs
 * the S (negative margins over the canvas' empty border) — the asset is rendered whole.
 *
 * Compositing rule: a transform or a fade on an ANCESTOR isolates the blend (the white canvas
 * would show). Whatever element moves or fades the emblem must itself carry `mix-blend-multiply`
 * (the lockup's emblem slot does; so do the film's moving parts).
 */

/** Where the S sits inside the asset's 1254 × 1254 canvas (for the hugging layout box). */
const CANVAS = 1254;
const S_BOX = { left: 395, right: 884, top: 272, bottom: 972 } as const;
const S_HEIGHT = (S_BOX.bottom - S_BOX.top) / CANVAS;
/** Width of the S relative to its height. */
export const MARK_ASPECT = (S_BOX.right - S_BOX.left) / (S_BOX.bottom - S_BOX.top);

export const BRAND_INK = "#15181F";
const SIGNATURE_INK = "#262B36";
const SEPARATOR = "#B8924F";

/**
 * The approved emblem. `height` is the height of the S itself: a number (px), or omitted to
 * read the CSS variable --mark-h (responsive sizes set by the caller).
 */
export function BrandMark({
  height,
  className = "",
  style,
  alt = "",
}: {
  height?: number;
  className?: string;
  style?: CSSProperties;
  alt?: string;
}) {
  const h = height === undefined ? "var(--mark-h, 34px)" : `${height}px`;
  const box = `calc(${h} / ${S_HEIGHT.toFixed(5)})`;
  const edge = (n: number) => `calc(${box} * ${(-n / CANVAS).toFixed(5)})`;
  const intrinsic = Math.round((height ?? 34) / S_HEIGHT);
  return (
    <img
      src={logo}
      alt={alt}
      aria-hidden={alt ? undefined : true}
      width={intrinsic}
      height={intrinsic}
      draggable={false}
      className={`block max-w-none shrink-0 select-none ${className}`}
      style={{
        width: box,
        height: box,
        margin: `${edge(S_BOX.top)} ${edge(CANVAS - S_BOX.right)} ${edge(CANVAS - S_BOX.bottom)} ${edge(S_BOX.left)}`,
        mixBlendMode: "multiply",
        ...style,
      }}
    />
  );
}

/** SOLVENTIA — the canonical wordmark. Size by font-size (className or style). */
export function BrandWordmark({
  className = "",
  style,
  color = BRAND_INK,
}: {
  className?: string;
  style?: CSSProperties;
  color?: string;
}) {
  return (
    <span
      className={`block font-wordmark font-medium uppercase leading-none tracking-[0.13em] [margin-right:-0.13em] ${className}`}
      style={{ color, ...style }}
    >
      Solventia
    </span>
  );
}

/** VALIDATE • BUILD • ELEVATE — readable, secondary to the wordmark, never faint. */
export function BrandSignature({
  className = "",
  style,
  color = SIGNATURE_INK,
  separator = SEPARATOR,
}: {
  className?: string;
  style?: CSSProperties;
  color?: string;
  separator?: string;
}) {
  const dot = (
    <span aria-hidden="true" className="mx-[0.75em]" style={{ color: separator }}>
      •
    </span>
  );
  return (
    <span
      className={`block whitespace-nowrap font-wordmark font-medium uppercase leading-none tracking-[0.3em] [margin-right:-0.3em] ${className}`}
      style={{ color, ...style }}
    >
      Validate{dot}Build{dot}Elevate
    </span>
  );
}

/**
 * Lockup presets. `row`: emblem beside SOLVENTIA with the signature under the wordmark (site
 * bars, sidebars, footer). `stack`: emblem above, wordmark, signature (brand moments).
 */
const PRESETS = {
  /** The site bar: SOLVENTIA 26px on desktop, 20px on phones (signature hidden < 400px). */
  nav: { mark: 36, word: "text-[20px] sm:text-[26px]", sig: "text-[9.5px] sm:text-[11px]" },
  /** Product sidebars and compact bars. */
  compact: { mark: 28, word: "text-[18px]", sig: "text-[9px]" },
  footer: { mark: 36, word: "text-[22px]", sig: "text-[10px]" },
} as const;

export function BrandLockup({
  preset = "nav",
  signature = true,
  emblem = true,
  className = "",
  wordColor,
  signatureColor,
}: {
  preset?: keyof typeof PRESETS;
  signature?: boolean;
  emblem?: boolean;
  className?: string;
  wordColor?: string;
  signatureColor?: string;
}) {
  const p = PRESETS[preset];
  return (
    <span className={`inline-flex items-center gap-3 ${className}`}>
      {emblem && (
        <span data-brand-part="mark" className="block mix-blend-multiply">
          <BrandMark height={p.mark} />
        </span>
      )}
      <span className="flex flex-col gap-2">
        <span data-brand-part="word" className="block">
          <BrandWordmark className={p.word} color={wordColor} />
        </span>
        {signature && (
          <span
            data-brand-part="sig"
            className={`block ${preset === "nav" ? "max-[400px]:hidden" : ""}`}
          >
            <BrandSignature className={p.sig} color={signatureColor} />
          </span>
        )}
      </span>
    </span>
  );
}
