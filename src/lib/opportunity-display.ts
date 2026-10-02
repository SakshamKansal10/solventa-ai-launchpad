import type {
  OpportunityPackage,
  OpportunityDetail,
  OpportunityCandidate,
  FitFactors,
} from "@/lib/ai/schemas";

/** New packages store their scoring inputs as `fitSignals`; pre-migration
 * candidates stored the same shape as `fitFactors`. */
export function getFitFactors(candidate: OpportunityPackage | OpportunityCandidate): FitFactors {
  return "fitSignals" in candidate ? candidate.fitSignals : candidate.fitFactors;
}

/** New packages call this `whyThisFounder`; pre-migration candidates
 * called the same field `whyYou`. */
export function getWhyReasons(candidate: OpportunityPackage | OpportunityCandidate): string[] {
  return "whyThisFounder" in candidate ? candidate.whyThisFounder : candidate.whyYou;
}

/** The three facts that answer "what is this, concretely" in one glance —
 * who actually pays, the first real step, and how revenue grows past the
 * first customer. Pre-migration candidates never captured a revenue path
 * at all (howItGrows degrades to null, not a guess), and used a 3-step
 * plan instead of a single first move (its first step stands in here). */
export interface FlagshipEssentials {
  whoPays: string;
  startWith: string;
  howItGrows: string | null;
}

export function getFlagshipEssentials(
  candidate: OpportunityPackage | OpportunityCandidate,
): FlagshipEssentials {
  if ("customer" in candidate) {
    return {
      whoPays: candidate.customer,
      startWith: candidate.firstExperiment,
      howItGrows: candidate.revenuePath,
    };
  }
  return { whoPays: candidate.whoFor, startWith: candidate.howToStart[0], howItGrows: null };
}

/** A single shape the UI renders from, regardless of whether the
 * underlying stored data is a new one-call OpportunityPackage or a
 * pre-migration OpportunityDetail — see profile.ts / opportunities.ts for
 * why both can exist side by side. */
export interface OpportunityDisplayDetail {
  summary: string;
  customer: string;
  problem: string;
  solution: string;
  // Short scannable phrases for the Overview blocks — a row saved before
  // these fields existed falls back to its own full sentence rather than
  // a truncated, grammatically-broken guess (see toDisplayDetail); the UI
  // detects that case and simply doesn't duplicate the sentence below it.
  problemHeadline: string;
  solutionHeadline: string;
  customerHeadline: string;
  moneyHeadline: string;
  whyThisFounder: string[];
  businessModel: string;
  startingCapital: string;
  weeklyTime: string;
  difficulty: "Beginner-friendly" | "Moderate" | "Challenging";
  skillsAlreadyOwned: string[];
  skillsToLearn: string[];
  resourceRequirements: string[];
  advantages: string[];
  tradeoffs: string[];
  risks: string[];
  unknowns: string[];
  validationNeeded: string[];
  revenuePath: string;
  firstExperiment: string;
}

function isPackageShape(
  detail: OpportunityPackage | OpportunityDetail,
): detail is OpportunityPackage {
  return Boolean(detail) && "plainEnglishSummary" in detail;
}

const FALLBACK_DIFFICULTY: OpportunityDisplayDetail["difficulty"] = "Moderate";

/** A row's stored `candidate`/`detail` JSON is only as trustworthy as whatever
 * schema was live the day it was written — a founder-profile field like
 * `capital` can be absent on a genuinely old row, and nothing here should
 * ever throw because of it. Every read below tolerates a missing/null value
 * with the same plain-language "not recorded" fallback the UI already shows
 * for other optional facts, instead of crashing the page that renders it. */
export function toDisplayDetail(
  detail: OpportunityPackage | OpportunityDetail | null | undefined,
): OpportunityDisplayDetail {
  detail ??= {} as OpportunityDetail;
  if (isPackageShape(detail)) {
    const problem = detail.problem ?? "";
    const solution = detail.solution ?? "";
    const customer = detail.customer ?? "";
    const businessModel = detail.businessModelPlainEnglish ?? "";
    return {
      summary: detail.plainEnglishSummary ?? "",
      customer,
      problem,
      solution,
      problemHeadline: detail.problemHeadline || problem,
      solutionHeadline: detail.solutionHeadline || solution,
      customerHeadline: detail.customerHeadline || customer,
      moneyHeadline: detail.moneyHeadline || businessModel,
      whyThisFounder: detail.whyThisFounder ?? [],
      businessModel,
      startingCapital: detail.startingCapital ?? "",
      weeklyTime: detail.weeklyTime ?? "",
      difficulty: detail.difficulty ?? FALLBACK_DIFFICULTY,
      skillsAlreadyOwned: detail.skillsAlreadyOwned ?? [],
      skillsToLearn: detail.skillsToLearn ?? [],
      resourceRequirements: detail.resourceRequirements ?? [],
      advantages: detail.advantages ?? [],
      tradeoffs: detail.tradeoffs ?? [],
      risks: detail.risks ?? [],
      unknowns: detail.unknowns ?? [],
      validationNeeded: detail.validationNeeded ?? [],
      revenuePath: detail.revenuePath ?? "",
      firstExperiment: detail.firstExperiment ?? "",
    };
  }

  // Legacy pre-migration shape — mapped onto the same display contract so
  // old founders' saved analyses keep rendering correctly. `startingRequirements`
  // itself (and every field inside it) predates several later columns and can
  // be entirely absent on the oldest rows.
  const requirements = detail.startingRequirements ?? undefined;
  const theOpportunity = detail.theOpportunity ?? "";
  const theProblem = detail.theProblem ?? "";
  const whoItIsFor = detail.whoItIsFor ?? "";
  const howItCanMakeMoney = detail.howItCanMakeMoney ?? "";
  return {
    summary: theOpportunity,
    customer: whoItIsFor,
    problem: theProblem,
    solution: theOpportunity,
    problemHeadline: theProblem,
    solutionHeadline: theOpportunity,
    customerHeadline: whoItIsFor,
    moneyHeadline: howItCanMakeMoney,
    whyThisFounder: detail.whyThisFitsYou ?? [],
    businessModel: howItCanMakeMoney,
    startingCapital: requirements?.capital ?? "",
    weeklyTime: requirements?.time ?? "",
    difficulty: detail.difficulty ?? FALLBACK_DIFFICULTY,
    skillsAlreadyOwned: detail.whatYouAlreadyHave ?? [],
    skillsToLearn: [...(detail.whatYouStillNeed ?? []), ...(requirements?.skills ?? [])],
    resourceRequirements: requirements?.equipment ?? [],
    advantages: [],
    tradeoffs: [],
    risks: detail.risks ?? [],
    unknowns: [],
    validationNeeded: detail.needsValidation ?? [],
    revenuePath: howItCanMakeMoney,
    firstExperiment: detail.firstExperiment ?? "",
  };
}
