import type { CSSProperties } from "react";

import { Footer } from "@/components/solventia/Footer";
import { useLocale } from "@/lib/i18n/LocaleProvider";

import { CinematicHome } from "./CinematicHome";
import { normalizeOverrides } from "./device/capabilities";
import { CinematicNav } from "./nav/CinematicNav";
import { PEARL_DEFAULTS } from "./overlay/palette";
import { PEARL_WORLD } from "./world/tone";

/**
 * The cinematic homepage as a page: its own navigation, the film and the shared footer.
 *
 * `data-cine-tone` is where the film writes its tone every frame (the overlay and the site bar
 * read the same variables). Its defaults are the pearl world — the opening, and every rendering
 * path, start in clarity.
 */
const TECH_TYPE = {
  "--font-tech": '"Geist", var(--font-sans)',
  "--font-mono": '"Geist Mono", ui-monospace, SFMono-Regular, Menlo, monospace',
  ...PEARL_DEFAULTS,
} as CSSProperties;

export function CinematicPage({
  tier,
  film,
  debug,
  freeze,
  pendingNext,
}: {
  tier?: "full" | "lite" | "fallback" | "high" | "medium" | "low";
  /** ?film=live|recorded|reduced forces a rendering path; ?film=debug shows the path overlay. */
  film?: "live" | "recorded" | "reduced" | "debug";
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
        <CinematicHome
          override={normalizeOverrides(tier, film)}
          filmDebug={film === "debug"}
          debug={debug}
          freeze={freeze}
        />
      </div>
      {/* Opaque and stacked above the fixed WebGL stage: the footer slides over it. */}
      <div className="relative z-20">
        {/* Solventia in brief: real text and plain links, server-rendered under the film. */}
        <SiteSummary />
        <Footer />
      </div>
    </div>
  );
}

const SUMMARY_LINKS = [
  ["/how-it-works", "pub.nav.how"],
  ["/ideas", "pub.nav.ideas"],
  ["/for-founders", "pub.nav.founders"],
  ["/about", "pub.nav.about"],
  ["/faq", "pub.nav.faq"],
] as const;

function SiteSummary() {
  const { t } = useLocale();
  return (
    <section
      aria-labelledby="site-summary"
      className="bg-sol-page px-4 py-14 sm:px-8"
      data-testid="site-summary"
    >
      <div className="mx-auto flex max-w-[1040px] flex-col gap-4">
        <h2 id="site-summary" className="text-[clamp(24px,2.6vw,32px)] font-semibold text-sol-ink">
          {t("pub.home.title")}
        </h2>
        <p className="max-w-[46em] text-[18px] leading-relaxed text-sol-secondary">
          {t("pub.home.body")}
        </p>
        <ul className="flex flex-wrap gap-x-6 gap-y-2">
          {SUMMARY_LINKS.map(([href, key]) => (
            <li key={href}>
              <a
                href={href}
                className="text-[17px] font-semibold text-sol-cobalt-deep hover:underline"
              >
                {t(key)}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
