import type { CSSProperties } from "react";

import { Footer } from "@/components/solventia/Footer";

import { CinematicHome } from "./CinematicHome";
import { CinematicNav } from "./nav/CinematicNav";

/** The cinematic homepage as a page: its own navigation, the film and the shared footer. */
const TECH_TYPE = {
  "--font-tech": '"Geist", var(--font-sans)',
  "--font-mono": '"Geist Mono", ui-monospace, SFMono-Regular, Menlo, monospace',
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
    <div className="min-h-screen bg-[#070B13]">
      {/* Technical typography is scoped to the experience; the shared footer keeps its own. */}
      <div style={TECH_TYPE}>
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
