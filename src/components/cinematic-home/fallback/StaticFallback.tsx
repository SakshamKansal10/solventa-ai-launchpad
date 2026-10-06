import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

import { ProductPreview } from "../overlay/ProductPreview";

/**
 * The same story without WebGL or motion — for prefers-reduced-motion, devices
 * without WebGL2 or with a software GPU, and any WebGL failure. Each chapter is
 * a still composition rendered from the real scene (public/cinematic/*.webp),
 * with the same words. Semantic, readable, keyboard-operable; the product
 * preview is the same real, interactive DOM.
 */
interface Chapter {
  still?: string;
  title: string;
  line?: string;
  alt?: string;
  product?: boolean;
  cta?: boolean;
}

const CHAPTERS: Chapter[] = [
  {
    still: "core",
    title: "Every founder begins with uncertainty.",
    line: "There is a direction hidden inside your reality.",
    alt: "The Solventia Intelligence Core: curved ceramic blades in an S around a dark spine, inlaid with champagne metal.",
  },
  {
    still: "context",
    title: "Solventia starts with you.",
    line: "Illustrative profile — ₹50,000 · digital development · India · 12 hours a week · beginner · limited customer access.",
    alt: "Six signals — capital, skills, location, time, experience and customer access — arriving at the core.",
  },
  {
    still: "universe",
    title: "Hundreds of possible directions.",
    line: "Your context reshapes every one of them.",
    alt: "A universe of small engineered opportunity objects in composed territories, linked by fine gold filaments.",
  },
  {
    still: "nine",
    title: "360 → 120 → 36 → 9 → 3 → 1",
    line: "Directions that don’t fit you lose energy; the ones that do come into alignment.",
    alt: "Nine remaining opportunities joined in one elliptical orbit.",
  },
  {
    still: "one",
    title: "One direction worth testing.",
    alt: "A single sculpture of nested, twisting ceramic arches, connected to the core by a gold filament.",
  },
  {
    still: "build",
    title: "Validate · Build · Elevate",
    line: "Discover what reality supports. Turn evidence into execution. Improve what proves valuable.",
    alt: "The opportunity unfolded into a path of ceramic arches with gold rails running through them.",
  },
  {
    still: "crisis",
    title: "Plans are assumptions until reality responds.",
    line: "“I wouldn’t pay for this version.” — an illustrative customer response.",
    alt: "Arches ahead on the path losing alignment after contradictory evidence.",
  },
  {
    still: "adapted",
    title: "The path changes when the evidence changes.",
    alt: "The arches rebuilt along a new direction.",
  },
  {
    product: true,
    title: "A chatbot answers. Solventia carries the journey forward.",
    line: "Context, opportunity, evidence, path and progress — connected in one workspace.",
  },
  {
    still: "identity",
    title: "Find the direction worth building.",
    line: "Your reality. Your evidence. Your path forward.",
    alt: "The Intelligence Core again, far away and still.",
    cta: true,
  },
];

export function StaticFallback() {
  return (
    <div
      data-testid="cinematic-fallback"
      className="bg-[#070B13] px-5 pb-24 pt-[112px] text-[#F1EEE6] sm:px-10"
    >
      <ol className="mx-auto flex max-w-6xl flex-col gap-24 sm:gap-32">
        {CHAPTERS.map((c, i) => {
          const Heading = i === 0 ? "h1" : "h2";
          return (
            <li key={c.title} className="flex flex-col gap-7">
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
                  className="aspect-[16/9] w-full rounded-[20px] object-cover"
                />
              )}
              <div className={c.cta ? "text-center" : "max-w-3xl"}>
                <Heading className="font-display text-[clamp(1.9rem,4vw,3.4rem)] leading-[1.08] text-[#F1EEE6]">
                  {c.title}
                </Heading>
                {c.line && (
                  <p className="mt-4 text-[clamp(1rem,1.5vw,1.2rem)] text-[#cfc6b6]">{c.line}</p>
                )}
                {c.cta && (
                  <Link
                    to="/consultation"
                    className="mt-9 inline-flex h-14 items-center gap-3 rounded-full bg-[linear-gradient(135deg,#FFFDFB_0%,#F2ECE2_55%,#DCC08B_100%)] px-8 text-[1.0625rem] font-semibold text-sol-navy"
                  >
                    Find My Business Idea
                    <ArrowRight className="size-5" aria-hidden="true" />
                  </Link>
                )}
              </div>
              {c.product && (
                <div className="h-[min(620px,80svh)] w-full">
                  <ProductPreview />
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
