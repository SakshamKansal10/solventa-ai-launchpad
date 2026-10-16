import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

import { BrandMark, BrandSignature, BrandWordmark } from "@/components/brand/Brand";

import { Signature } from "../overlay/CinematicOverlay";
import { ProductPreview } from "../overlay/ProductPreview";
import { SIGNALS } from "../world/context/context-model";

/**
 * The same story without WebGL or motion — for prefers-reduced-motion, devices
 * without WebGL2 or with a software GPU, and any WebGL failure. The same editorial
 * system as the film (pearl ground, very large type, one idea per block); each
 * chapter's image is a still rendered from the real scene (public/cinematic/*.webp),
 * set in a hairline frame. Semantic, readable, keyboard-operable; the product
 * preview is the same real, interactive DOM.
 */
interface Chapter {
  still?: string;
  /** The statement, one entry per deliberate line. */
  lines: string[];
  line?: string;
  alt?: string;
  signals?: boolean;
  signature?: boolean;
  product?: boolean;
  cta?: boolean;
}

const CHAPTERS: Chapter[] = [
  {
    still: "core",
    lines: ["Your reality.", "Made actionable."],
    line: "Every founder begins with uncertainty. Solventia turns it into direction.",
    alt: "The Solventia S Engine: two machined channels traced from the Solventia S, a fine champagne edge along their inner curves, around a smoked-glass computing kernel.",
  },
  {
    still: "context",
    lines: ["It starts with", "your real situation."],
    signals: true,
    alt: "Six founder signals — capital, skills, location, time, experience and customer access — each acquired by a port on the S Engine's outer edge.",
  },
  {
    still: "universe",
    lines: ["360", "possibilities."],
    line: "Your reality narrows them: 360 → 120 → 36 → 9 → 3 directions.",
    alt: "The opportunity universe: five territories of engineered decision modules linked by weighted routes.",
  },
  {
    still: "one",
    lines: ["One worth", "testing."],
    alt: "The chosen direction: a woven ring of portal frames, joined to the system by an S-shaped pathway.",
  },
  {
    still: "build",
    lines: ["Prove it", "before you build it."],
    signature: true,
    line: "Discover what reality supports, then build on the evidence.",
    alt: "The opportunity unfolded into a path of machined portal gates locking together over a deck.",
  },
  {
    still: "crisis",
    lines: ["“I wouldn’t pay", "for this version.”"],
    line: "An illustrative customer response — the evidence that contradicts an assumption.",
    alt: "Gates ahead on the path unlocking and losing alignment after contradictory evidence.",
  },
  {
    still: "adapted",
    lines: ["Evidence changes.", "Your path adapts."],
    alt: "The gates rebuilt along a new direction.",
  },
  {
    product: true,
    lines: ["Your next move,", "always clear."],
    line: "Your context, evidence and progress stay connected — so you never have to guess what to build next.",
  },
  {
    lines: ["Find the direction", "worth building."],
    cta: true,
  },
];

const MAJOR =
  "text-[clamp(2.3rem,9vw,3.4rem)] font-medium uppercase leading-[0.95] tracking-[-0.045em] text-balance sm:text-[clamp(3rem,6.6vw,6.75rem)]";

export function StaticFallback() {
  return (
    <div
      data-testid="cinematic-fallback"
      className="px-5 pb-24 pt-[124px] sm:px-[clamp(1.25rem,4.4vw,4.5rem)]"
      style={{ color: "var(--ink)", fontFamily: "var(--font-tech)" }}
    >
      <ol className="mx-auto flex max-w-6xl flex-col gap-24 sm:gap-36">
        {CHAPTERS.map((c, i) => {
          const Heading = i === 0 ? "h1" : "h2";
          return (
            <li key={c.lines.join(" ")} className="flex flex-col gap-8">
              <div className={c.cta ? "text-center" : ""}>
                {c.signature && <Signature className="mb-5" />}
                {/* The film’s face (the site’s headings default to the display serif). */}
                <Heading className={MAJOR} style={{ fontFamily: "var(--font-tech)" }}>
                  {/* One line per span, read as one sentence (spaces between the lines). */}
                  {c.lines.map((l, k) => (
                    <span key={k} className="block">
                      {l}
                      {k < c.lines.length - 1 ? " " : ""}
                    </span>
                  ))}
                </Heading>
                {c.line && (
                  <p
                    className="mt-5 max-w-2xl text-[clamp(1.05rem,1.5vw,1.3rem)]"
                    style={{ color: "var(--quiet)" }}
                  >
                    {c.line}
                  </p>
                )}
              </div>
              {c.signals && (
                <div className="border-t border-[color:var(--hair)] pt-8">
                  <dl className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3">
                    {SIGNALS.map((s) => (
                      <div key={s.id}>
                        <dt
                          className="font-mono text-[11.5px] uppercase tracking-[0.26em]"
                          style={{ color: "var(--label)" }}
                        >
                          {s.label}
                        </dt>
                        <dd className="mt-2 text-[clamp(1.5rem,3.2vw,2.6rem)] font-normal leading-none tracking-[-0.04em]">
                          {s.value}
                        </dd>
                      </div>
                    ))}
                  </dl>
                  <p
                    className="mt-8 font-mono text-[11px] uppercase tracking-[0.26em]"
                    style={{ color: "var(--label)" }}
                  >
                    Illustrative founder profile
                  </p>
                </div>
              )}
              {c.still && (
                <img
                  src={`/cinematic/${c.still}-1600.webp`}
                  srcSet={`/cinematic/${c.still}-960.webp 960w, /cinematic/${c.still}-1600.webp 1600w`}
                  sizes="(min-width: 1200px) 1152px, 100vw"
                  width={1600}
                  height={900}
                  alt={c.alt ?? ""}
                  loading={i === 0 ? "eager" : "lazy"}
                  decoding="async"
                  className="aspect-[16/9] w-full rounded-[18px] object-cover ring-1 ring-[#15181F]/12"
                />
              )}
              {c.product && (
                <div className="h-[min(620px,80svh)] w-full">
                  <ProductPreview />
                </div>
              )}
              {c.cta && (
                <div className="flex flex-col items-center gap-7 text-center">
                  {/* The identity, as in the film's finale: the approved emblem, whole. */}
                  <div aria-hidden="true" className="flex flex-col items-center gap-5 py-6">
                    <BrandMark height={112} />
                    <BrandWordmark className="mt-4 text-[clamp(34px,8vw,64px)]" />
                    <BrandSignature className="text-[clamp(9.5px,2.4vw,13px)]" />
                  </div>
                  <Link
                    to="/consultation"
                    className="inline-flex h-14 items-center gap-3 rounded-full bg-[#15181F] px-8 text-[1.0625rem] font-semibold text-[#F4F2ED] shadow-[inset_0_0_0_1px_rgba(201,170,121,0.6)] transition-colors hover:bg-[#0B1F3B] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#B8924F]"
                  >
                    Find My Business Idea
                    <ArrowRight className="size-5" aria-hidden="true" />
                  </Link>
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
