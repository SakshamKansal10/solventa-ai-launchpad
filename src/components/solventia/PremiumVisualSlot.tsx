import { cn } from "@/lib/utils";

interface PremiumVisualSlotProps {
  /** Path to an approved, professionally-produced image asset — landscape
   * (16:9 or 4:3), at least 1600px wide, WebP or well-optimized JPEG.
   * Subject guidance for whoever supplies it: founder-intelligence /
   * business-building oriented, premium and editorial in tone, genuinely
   * connected to what Solventia does — never a generic stock photo
   * (laptop-on-desk, handshake, "team celebrating"), never sci-fi/neon/
   * crypto/robot iconography or a cliché "futuristic dashboard" render.
   * It should feel like it belongs next to the Hero's violet/champagne
   * intelligence-field motif (see Hero.tsx's HeroIntelligenceField), not
   * like a stock photo dropped in beside it. */
  image?: string;
  alt?: string;
  /** Shown only in the unfilled placeholder state, to explain what this
   * space is reserved for — never shown once a real `image` is supplied. */
  caption?: string;
  className?: string;
}

/** A real, reusable slot for a premium photographic/rendered visual
 * asset — deliberately built empty rather than filled with a stock photo
 * or an AI-faked image. This environment has no image-generation
 * capability, and dropping in a generic stock photo "to fill the space"
 * would be worse than leaving it honestly unfilled: it would misrepresent
 * what Solventia actually does (the Hero's own SVG intelligence field
 * already carries that weight faithfully — see the module comment there)
 * and risk landing on exactly the "generic AI imagery" / "cliché
 * futuristic dashboard" look this was explicitly asked to avoid.
 *
 * Until `image` is supplied, this renders a calm, honestly-abstract
 * placeholder — never pretending to be a finished photo — so wherever
 * it's placed still reads as intentional, premium design rather than a
 * broken or empty box. Swap in a real asset later by passing `image`;
 * no other code changes needed anywhere this component is used. */
export function PremiumVisualSlot({ image, alt = "", caption, className }: PremiumVisualSlotProps) {
  if (image) {
    return (
      <div className={cn("overflow-hidden rounded-[28px]", className)}>
        <img src={image} alt={alt} className="h-full w-full object-cover" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center gap-3 overflow-hidden rounded-[28px] border border-dashed border-sol-violet/25 px-8 py-16 text-center",
        className,
      )}
      style={{
        background:
          "radial-gradient(ellipse 70% 60% at 30% 20%, rgba(114,87,216,.10), transparent 65%), radial-gradient(ellipse 60% 55% at 80% 85%, rgba(197,163,106,.09), transparent 60%), var(--sol-page)",
      }}
      aria-hidden="true"
    >
      <p className="text-[0.66rem] font-semibold uppercase tracking-[0.16em] text-sol-violet-deep/70">
        Reserved — premium visual asset
      </p>
      {caption && (
        <p className="max-w-xs text-[0.85rem] leading-relaxed text-sol-secondary">{caption}</p>
      )}
    </div>
  );
}
