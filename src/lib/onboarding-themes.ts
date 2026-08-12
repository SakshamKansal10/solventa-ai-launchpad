import type { LucideIcon } from "lucide-react";
import { Sparkles, Zap, Wallet, Scale, HeartHandshake, Compass, Gem } from "lucide-react";

/** Seven chapters, one Solventia environment. Each stage gets a real
 * atmosphere — a saturated corner light that diffuses into the same
 * pearl-white canvas everywhere else — not a tinted background and not
 * a decorative dot. The gradient recipe (five stops: deep core, rich
 * color, soft mid, pale fade, transparent) is shared across all seven
 * so only the hue changes — this is a system, not per-page styling. */
export interface StageTheme {
  section: number;
  name: string;
  opener: string;
  feeling: string;
  hue: number;
  /** Solid color for small UI (icons, borders, selected states). */
  color: string;
  /** Softer tint for selected-state fills. */
  colorSoft: string;
  icon: LucideIcon;
  /** Full corner-atmosphere gradient — the primary light source. */
  atmosphere: string;
  /** Much fainter echo in the opposite corner, for depth. */
  atmosphereEcho: string;
}

function primaryAtmosphere(hue: number, chroma = 0.23): string {
  return `radial-gradient(ellipse 560px 380px at -8% -10%, oklch(0.66 ${chroma} ${hue} / 1), oklch(0.6 ${chroma + 0.02} ${hue} / 0.72) 38%, oklch(0.6 ${chroma + 0.02} ${hue} / 0.32) 60%, transparent 78%)`;
}

function echoAtmosphere(hue: number, chroma = 0.16): string {
  return `radial-gradient(
    ellipse 460px 340px at 108% 112%,
    oklch(0.7 ${chroma} ${hue} / 0.22),
    oklch(0.82 ${chroma * 0.5} ${hue} / 0.1) 45%,
    transparent 75%
  )`;
}

export const STAGE_THEMES: Record<number, StageTheme> = {
  1: {
    section: 1,
    name: "Foundation",
    opener: "Let's understand you.",
    feeling: "Discovery",
    hue: 292.7,
    color: "oklch(0.55 0.2 292.7)",
    colorSoft: "oklch(0.55 0.2 292.7 / 0.14)",
    icon: Sparkles,
    atmosphere: primaryAtmosphere(292.7, 0.2),
    atmosphereEcho: echoAtmosphere(292.7, 0.18),
  },
  2: {
    section: 2,
    name: "Your Edge",
    opener: "Let's uncover your strengths.",
    feeling: "Potential",
    hue: 253,
    color: "oklch(0.5 0.17 253)",
    colorSoft: "oklch(0.5 0.17 253 / 0.14)",
    icon: Zap,
    atmosphere: primaryAtmosphere(253, 0.16),
    atmosphereEcho: echoAtmosphere(253, 0.14),
  },
  3: {
    section: 3,
    name: "Your Resources",
    opener: "Let's understand your resources.",
    feeling: "Growth",
    hue: 153,
    color: "oklch(0.48 0.13 153)",
    colorSoft: "oklch(0.48 0.13 153 / 0.14)",
    icon: Wallet,
    atmosphere: primaryAtmosphere(153, 0.15),
    atmosphereEcho: echoAtmosphere(153, 0.13),
  },
  4: {
    section: 4,
    name: "Your Risk",
    opener: "Let's understand how you make decisions.",
    feeling: "Decision",
    hue: 55,
    color: "oklch(0.52 0.17 55)",
    colorSoft: "oklch(0.52 0.17 55 / 0.14)",
    icon: Scale,
    atmosphere: primaryAtmosphere(55, 0.17),
    atmosphereEcho: echoAtmosphere(55, 0.15),
  },
  5: {
    section: 5,
    name: "Your Motivation",
    opener: "Let's talk about what's really driving you.",
    feeling: "Inner Drive",
    hue: 340,
    color: "oklch(0.5 0.18 340)",
    colorSoft: "oklch(0.5 0.18 340 / 0.14)",
    icon: HeartHandshake,
    atmosphere: primaryAtmosphere(340, 0.19),
    atmosphereEcho: echoAtmosphere(340, 0.17),
  },
  6: {
    section: 6,
    name: "Your Capacity",
    opener: "Let's get practical about your capacity.",
    feeling: "Clarity",
    hue: 197,
    color: "oklch(0.5 0.13 197)",
    colorSoft: "oklch(0.5 0.13 197 / 0.14)",
    icon: Compass,
    atmosphere: primaryAtmosphere(197, 0.15),
    atmosphereEcho: echoAtmosphere(197, 0.13),
  },
  7: {
    section: 7,
    name: "Your Direction",
    opener: "Let's define where you want to go.",
    feeling: "Elevation",
    hue: 72,
    color: "oklch(0.6 0.14 72)",
    colorSoft: "oklch(0.6 0.14 72 / 0.16)",
    icon: Gem,
    atmosphere: primaryAtmosphere(72, 0.16),
    atmosphereEcho: echoAtmosphere(72, 0.14),
  },
};

export const STAGE_COUNT = Object.keys(STAGE_THEMES).length;

export function getStageTheme(section: number): StageTheme {
  return STAGE_THEMES[section] ?? STAGE_THEMES[1];
}
