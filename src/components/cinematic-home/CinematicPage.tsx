import type { CSSProperties } from "react";

import { Footer } from "@/components/solventia/Footer";

import { CinematicHome } from "./CinematicHome";
import { CinematicNav } from "./nav/CinematicNav";
import { PEARL_DEFAULTS } from "./overlay/palette";
import { PEARL_WORLD } from "./world/tone";

/**
 * The cinematic homepage as a page: its own navigation, the film and the shared footer.
 *
 * `data-cine-tone` is where the film writes its tone every frame (the overlay and the site bar
 * read the same variables). Its defaults are the pearl world — the opening, the still version and
 * any device without WebGL all start in clarity.
 */
const TECH_TYPE = {
  "--font-tech": '"Geist", var(--font-sans)',
  "--font-mono": '"Geist Mono", ui-monospace, SFMono-Regular, Menlo, monospace',
  ...PEARL_DEFAULTS,
} as CSSProperties;

export function CinematicPage({
  tier,
  debug,
  freeze,
  pendingNext,
}: {
  tier?: "high" | "medium" | "low" | "fallback";
  debug?: boolean;
  freeze?: boolean;
  /** A same-origin destination to sign in toward (the `/?next=` redirect from a protected route). */
  pendingNext?: string | null;
}) {
  return (
    <div className="min-h-screen" style={{ backgroundColor: PEARL_WORLD.sky }}>
      {/* Technical typography is scoped to the experience; the shared footer keeps its own. */}
      <div data-cine-tone style={TECH_TYPE}>
        <CinematicNav pendingNext={pendingNext} />
        <CinematicHome tierOverride={tier} debug={debug} freeze={freeze} />
      </div>
      {/* Opaque and stacked above the fixed WebGL stage: the footer slides over it. */}
      <div className="relative z-20">
        <Footer />
      </div>
    </div>
  );
}
