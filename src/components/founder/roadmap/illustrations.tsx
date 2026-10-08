/** Flat, brand-colored scene illustrations for the roadmap — real pictures in
 * place of a bare icon, drawn as inline SVG (no image files) so they stay
 * crisp, themeable, and dependency-free. Never a photoreal/generated image. */

/** The week banner: a founder at a desk, working. */
export function WeekHeroScene({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 640 220" className={className} preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <rect width="640" height="220" className="fill-sol-violet-soft" />
      <rect y="150" width="640" height="70" className="fill-sol-champagne-soft" />
      <circle cx="560" cy="48" r="34" className="fill-sol-champagne" opacity={0.4} />
      <circle cx="600" cy="100" r="10" className="fill-sol-violet" opacity={0.25} />
      <circle cx="40" cy="40" r="6" className="fill-sol-violet" opacity={0.25} />
      <circle cx="80" cy="70" r="3.5" className="fill-sol-violet" opacity={0.25} />

      {/* desk */}
      <rect x="40" y="168" width="560" height="10" rx="5" className="fill-sol-ink" opacity={0.1} />

      {/* plant */}
      <rect x="486" y="140" width="34" height="28" rx="6" className="fill-sol-champagne-deep" />
      <path d="M503 140 C 480 118, 480 96, 503 80" fill="none" strokeWidth="7" strokeLinecap="round" className="stroke-sol-champagne" />
      <path d="M503 140 C 526 120, 528 100, 503 86" fill="none" strokeWidth="7" strokeLinecap="round" className="stroke-sol-champagne-deep" />
      <circle cx="503" cy="80" r="9" className="fill-sol-champagne-deep" />

      {/* laptop */}
      <path d="M200 168 L430 168 L450 108 L180 108 Z" className="fill-sol-surface stroke-sol-border-strong" strokeWidth="2" />
      <rect x="210" y="118" width="210" height="40" rx="4" className="fill-sol-violet-soft stroke-sol-violet" strokeWidth="2" />
      <rect x="226" y="128" width="80" height="6" rx="3" className="fill-sol-violet" />
      <rect x="226" y="140" width="130" height="6" rx="3" className="fill-sol-violet" opacity={0.5} />

      {/* founder */}
      <circle cx="300" cy="64" r="22" className="fill-sol-ink" />
      <path d="M254 140 C254 104, 346 104, 346 140 L346 168 L254 168 Z" className="fill-sol-violet" />

      {/* sticky note */}
      <g transform="rotate(-4 556 150)">
        <rect x="506" y="118" width="100" height="64" rx="4" className="fill-sol-champagne-soft stroke-sol-champagne-deep" strokeWidth="1.5" />
        <rect x="520" y="136" width="70" height="5" rx="2.5" className="fill-sol-champagne-deep" opacity={0.7} />
        <rect x="520" y="148" width="58" height="5" rx="2.5" className="fill-sol-champagne-deep" opacity={0.7} />
        <rect x="520" y="160" width="44" height="5" rx="2.5" className="fill-sol-champagne-deep" opacity={0.7} />
      </g>
    </svg>
  );
}

type Scene = "search" | "wallet" | "route" | "loop" | "tag" | "shields" | "compass";

const CATEGORY_SCENE: Record<string, Scene> = {
  problem: "search",
  willingness_to_pay: "wallet",
  distribution: "route",
  delivery: "route",
  retention: "loop",
  pricing: "tag",
  competition: "shields",
  other: "compass",
};

const SCENE_TONE: Record<Scene, "violet" | "champagne"> = {
  search: "champagne",
  wallet: "violet",
  route: "champagne",
  loop: "violet",
  tag: "champagne",
  shields: "violet",
  compass: "champagne",
};

function SceneArt({ scene }: { scene: Scene }) {
  switch (scene) {
    case "search":
      return (
        <g>
          <g transform="rotate(-8 130 70)">
            <rect x="100" y="56" width="80" height="56" rx="6" className="fill-sol-surface stroke-sol-border-strong" strokeWidth="2" />
            <rect x="114" y="70" width="52" height="5" rx="2.5" className="fill-sol-border-strong" />
            <rect x="114" y="82" width="38" height="5" rx="2.5" className="fill-sol-border-strong" />
            <rect x="114" y="94" width="44" height="5" rx="2.5" className="fill-sol-border-strong" />
          </g>
          <circle cx="206" cy="108" r="34" fill="none" strokeWidth="9" className="stroke-sol-violet" />
          <line x1="230" y1="132" x2="252" y2="154" strokeWidth="10" strokeLinecap="round" className="stroke-sol-violet" />
        </g>
      );
    case "wallet":
      return (
        <g>
          <rect x="90" y="78" width="140" height="86" rx="14" className="fill-sol-surface stroke-sol-violet" strokeWidth="3" />
          <path d="M90 108 H230" strokeWidth="3" className="stroke-sol-violet" />
          <circle cx="206" cy="94" r="12" className="fill-sol-champagne stroke-sol-champagne-deep" strokeWidth="2" />
          <circle cx="150" cy="140" r="17" className="fill-sol-champagne" />
          <circle cx="188" cy="150" r="12" className="fill-sol-champagne-deep" />
          <path d="M60 60 l16 -20 M76 40 h-16 M76 40 v16" fill="none" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" className="stroke-sol-violet" />
        </g>
      );
    case "route":
      return (
        <g>
          <path
            d="M40 150 C 90 90, 150 170, 220 100"
            fill="none"
            strokeWidth="5"
            strokeDasharray="2 14"
            strokeLinecap="round"
            className="stroke-sol-champagne-deep"
            opacity={0.7}
          />
          <circle cx="40" cy="150" r="8" className="fill-sol-champagne-deep" />
          <g transform="translate(150 86)">
            <rect x="0" y="18" width="70" height="34" rx="6" className="fill-sol-surface stroke-sol-champagne-deep" strokeWidth="2.5" />
            <path d="M70 26 h22 l14 14 v12 h-36 Z" className="fill-sol-champagne stroke-sol-champagne-deep" strokeWidth="2.5" />
            <circle cx="20" cy="56" r="9" className="fill-sol-ink" />
            <circle cx="86" cy="56" r="9" className="fill-sol-ink" />
          </g>
        </g>
      );
    case "loop":
      return (
        <g>
          <rect x="112" y="60" width="76" height="68" rx="10" className="fill-sol-surface stroke-sol-violet" strokeWidth="3" />
          <rect x="112" y="60" width="76" height="20" rx="8" className="fill-sol-violet" />
          <circle cx="150" cy="104" r="16" fill="none" strokeWidth="5" className="stroke-sol-champagne-deep" />
          <path
            d="M74 94 A56 56 0 1 1 90 148"
            fill="none"
            strokeWidth="7"
            strokeLinecap="round"
            className="stroke-sol-champagne"
          />
          <path d="M84 134 L90 150 L104 142" fill="none" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" className="stroke-sol-champagne" />
        </g>
      );
    case "tag":
      return (
        <g>
          <path d="M70 70 H150 L198 118 L150 166 H70 Z" className="fill-sol-surface stroke-sol-champagne-deep" strokeWidth="3" />
          <circle cx="104" cy="118" r="10" className="fill-sol-champagne" />
          <rect x="160" y="58" width="16" height="42" rx="4" className="fill-sol-violet" />
          <rect x="184" y="40" width="16" height="60" rx="4" className="fill-sol-violet-deep" />
          <rect x="208" y="70" width="16" height="30" rx="4" className="fill-sol-violet" />
        </g>
      );
    case "shields":
      return (
        <g>
          <path d="M96 56 L140 44 L140 104 C140 130, 118 146, 96 154 C74 146, 52 130, 52 104 L52 44 Z" className="fill-sol-violet-soft stroke-sol-violet" strokeWidth="3" />
          <path d="M182 72 L218 62 L218 112 C218 132, 202 144, 182 150 C162 144, 146 132, 146 112 L146 62 Z" className="fill-sol-surface stroke-sol-border-strong" strokeWidth="3" />
          <path d="M84 100 L94 110 L112 86" fill="none" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" className="stroke-sol-violet" />
        </g>
      );
    case "compass":
    default:
      return (
        <g>
          <path d="M40 150 C 90 160, 140 120, 190 130" fill="none" strokeWidth="4" strokeDasharray="1 12" strokeLinecap="round" className="stroke-sol-border-strong" />
          <circle cx="40" cy="150" r="7" className="fill-sol-border-strong" />
          <circle cx="155" cy="96" r="46" className="fill-sol-surface stroke-sol-champagne-deep" strokeWidth="4" />
          <path d="M155 68 L168 96 L155 124 L142 96 Z" className="fill-sol-violet" />
          <circle cx="155" cy="96" r="5" className="fill-sol-champagne-deep" />
        </g>
      );
  }
}

/** A thumbnail "scene" for a mission's assumption category — the same role
 * MissionCard's lucide icon badge played, as an actual small picture. */
export function MissionScene({
  category,
  className,
}: {
  category: string | null;
  className?: string;
}) {
  const scene = CATEGORY_SCENE[category ?? "other"] ?? "compass";
  const tone = SCENE_TONE[scene];
  return (
    <svg viewBox="0 0 280 180" className={className} preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <rect
        width="280"
        height="180"
        className={tone === "violet" ? "fill-sol-violet-soft" : "fill-sol-champagne-soft"}
      />
      <SceneArt scene={scene} />
    </svg>
  );
}
