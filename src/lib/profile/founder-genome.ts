import type { NormalizedProfile } from "@/lib/profile/normalize";
import { SKILL_CATEGORIES } from "@/lib/onboarding-types";
import { getInvestmentBrackets } from "@/lib/country-currency";

export interface GenomeDimension {
  key: string;
  label: string;
  /** 0-100, always derived deterministically from stored profile signals
   * — never an AI-invented number. Rendered as a 5-dot scale in the UI
   * (see FounderGenome.tsx), never shown as a bare precise percentage —
   * the precision is real but the DISPLAY deliberately stays coarse so
   * it never reads as more exact than a self-reported profile can be. */
  score: number;
}

export interface FounderGenome {
  dimensions: GenomeDimension[];
  executionStyle: string;
  independence: string;
}

function clamp01to100(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

const SALES_COMFORT_SCORE: Record<string, number> = {
  "I enjoy it": 100,
  "I can do it if needed": 65,
  "It makes me uneasy": 30,
  "Never tried": 15,
};

const RISK_SCORE: Record<string, number> = {
  cautious: 30,
  balanced: 60,
  experimental: 95,
};

const INTERNET_SCORE: Record<string, number> = {
  "Excellent, always on": 100,
  "Good, mostly reliable": 75,
  Patchy: 40,
  "Very limited": 15,
};

const TRANSPORT_SCORE: Record<string, number> = {
  "Very easily": 100,
  "With some planning": 70,
  Difficult: 35,
  "Not able to travel much": 15,
};

/**
 * Deterministic, explainable "Founder Genome" — six dimensions that
 * progressively form as onboarding sections complete, each a plain
 * function of already-collected signals (skills, resources, risk
 * appetite, time, work style). No AI call, no invented precision: two
 * founders with identical answers always get identical genomes, and
 * every number here can be traced back to a specific answer.
 */
export function computeFounderGenome(profile: NormalizedProfile): FounderGenome {
  // --- Skill Leverage: how much real, rated capability the founder
  // already has, not just how many skills they listed. ---
  const skillLeverage =
    profile.skills.length === 0
      ? 20
      : clamp01to100(
          (profile.skills.reduce((sum, s) => sum + s.levelScore, 0) / (profile.skills.length * 3)) *
            65 +
            Math.min(profile.skills.length, 6) * (35 / 6),
        );

  // --- Resource Leverage: position within the founder's OWN currency's
  // investment brackets (never the raw amount — that would unfairly
  // favor founders in high-denomination currencies), plus tangible
  // assets already owned. ---
  const brackets = getInvestmentBrackets(profile.identity.currency);
  const bracketIndex = Math.max(
    0,
    brackets.findIndex((b) => b.label === profile.resources.capitalBracket),
  );
  const resourceLeverage = clamp01to100(
    (bracketIndex / Math.max(1, brackets.length - 1)) * 65 +
      Math.min(profile.resources.assets.length, 4) * (35 / 4),
  );

  // --- Commercial Confidence: comfort actually selling/pitching, plus a
  // real boost for founders already running a business or freelancing —
  // that's commercial confidence already proven in the real world, not
  // self-reported. ---
  const commercialConfidence = clamp01to100(
    (SALES_COMFORT_SCORE[profile.workStyle.salesComfort ?? ""] ?? 40) * 0.7 +
      (profile.identity.currentBusiness ? 30 : 0),
  );

  // --- Risk Appetite: the founder's own stated spectrum position. ---
  const riskAppetite = clamp01to100(RISK_SCORE[profile.risk.appetite ?? "balanced"] ?? 55);

  // --- Time Capacity: weekly hours against a realistic full-time-side-
  // venture ceiling (45h — Solventia's own top WEEKLY_HOURS bracket
  // midpoint), not an arbitrary round number. ---
  const timeCapacity = clamp01to100((profile.time.weeklyHours / 45) * 100);

  // --- Market Accessibility: how easily this founder can actually reach
  // and serve customers given their real connectivity/mobility/work-
  // style constraints — never a guess about their country's economy. A
  // remote-preferring founder isn't penalized for low mobility, since
  // travel isn't part of how they intend to reach customers anyway. */
  const internetScore = INTERNET_SCORE[profile.resources.internetQuality ?? ""] ?? 55;
  const transportScore = TRANSPORT_SCORE[profile.resources.transportation ?? ""] ?? 55;
  const marketAccessibility = clamp01to100(
    profile.workStyle.location === "Remote"
      ? internetScore
      : internetScore * 0.5 + transportScore * 0.5,
  );

  const executionStyle =
    profile.workStyle.soloOrTeam === "With a co-founder"
      ? "Co-founder Seeker"
      : profile.workStyle.soloOrTeam === "With a small team"
        ? "Team Builder"
        : "Solo Builder";

  const independence = profile.identity.currentBusiness
    ? "Already Independent"
    : profile.direction.willingToLeaveJob === "Yes, if it replaced my income"
      ? "Ready to Leap"
      : profile.identity.currentStatus === "Working Professional"
        ? "Employed & Exploring"
        : profile.identity.currentStatus === "School Student" ||
            profile.identity.currentStatus === "College Student"
          ? "Building Alongside Studies"
          : "Open to Direction";

  return {
    dimensions: [
      { key: "skills", label: "Skill Leverage", score: skillLeverage },
      { key: "resources", label: "Resource Leverage", score: resourceLeverage },
      { key: "commercial", label: "Commercial Confidence", score: commercialConfidence },
      { key: "risk", label: "Risk Appetite", score: riskAppetite },
      { key: "time", label: "Time Capacity", score: timeCapacity },
      { key: "market", label: "Market Accessibility", score: marketAccessibility },
    ],
    executionStyle,
    independence,
  };
}

export interface FounderPersona {
  name: string;
  /** 3-4 short, real reasons — each traceable to an actual profile
   * signal, never generic flavor text. */
  attributes: string[];
}

function dominantSkillCategory(profile: NormalizedProfile): string | null {
  if (profile.skills.length === 0) return null;
  const counts = new Map<string, number>();
  for (const skill of profile.skills) {
    const category = SKILL_CATEGORIES.find((c) =>
      c.skills.some((s) => s.toLowerCase() === skill.name.toLowerCase()),
    );
    const label = category?.label ?? "Other";
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

/**
 * A sophisticated, non-childish persona name plus a short list of real
 * reasons — a rule-based classification over the same genome dimensions
 * above, never an AI guess. Deliberately a small, curated set of names
 * (not a combinatorial explosion) so each one stays meaningful.
 */
export function computeFounderPersona(
  profile: NormalizedProfile,
  genome: FounderGenome,
): FounderPersona {
  const dim = (key: string) => genome.dimensions.find((d) => d.key === key)?.score ?? 50;
  const category = dominantSkillCategory(profile);
  const attributes: string[] = [];

  let name: string;

  if (category && ["Technology", "AI and Automation", "Engineering"].includes(category)) {
    name = "Technical Problem Solver";
    attributes.push(`Skills concentrated in ${category.toLowerCase()}`);
  } else if (
    category &&
    ["Content and Media", "Design", "Creative Arts"].includes(category) &&
    dim("commercial") >= 55
  ) {
    name = "Creative Commercializer";
    attributes.push(`Strong ${category.toLowerCase()} skills paired with real sales comfort`);
  } else if (dim("commercial") >= 70 && genome.executionStyle !== "Solo Builder") {
    name = "Network-Driven Builder";
    attributes.push("High comfort selling and pitching");
    attributes.push(`Prefers building with others (${genome.executionStyle.toLowerCase()})`);
  } else if (
    profile.direction.goals.includes("Social impact") ||
    profile.motivation.biggestMotivation.includes("Making an impact in my community")
  ) {
    name = "Community-Led Founder";
    attributes.push("Motivated by community/social impact, not just income");
  } else if (dim("resources") >= 65) {
    name = "Resourceful Builder";
    attributes.push("Real capital and assets already in hand to start");
  } else if (dim("risk") <= 40) {
    name = "Analytical Operator";
    attributes.push("Cautious, methodical risk profile");
  } else {
    name = "Resourceful Builder";
  }

  if (attributes.length < 3 && dim("skills") >= 60) {
    attributes.push(
      `${profile.skills.length} rated skill${profile.skills.length === 1 ? "" : "s"}, several above beginner`,
    );
  }
  if (attributes.length < 3 && profile.time.weeklyHours >= 15) {
    attributes.push(`${profile.time.weeklyHours}+ hrs/week realistically available`);
  }
  if (attributes.length < 3) {
    attributes.push(`${genome.independence} founder path`);
  }
  if (attributes.length < 4 && profile.identity.currentBusiness) {
    attributes.push("Already running a business or freelance practice");
  }

  return { name, attributes: attributes.slice(0, 4) };
}
