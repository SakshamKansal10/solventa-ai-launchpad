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

/** A single shape the UI renders from, regardless of whether the
 * underlying stored data is a new one-call OpportunityPackage or a
 * pre-migration OpportunityDetail — see profile.ts / opportunities.ts for
 * why both can exist side by side. */
export interface OpportunityDisplayDetail {
  summary: string;
  customer: string;
  problem: string;
  solution: string;
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
  return "plainEnglishSummary" in detail;
}

export function toDisplayDetail(
  detail: OpportunityPackage | OpportunityDetail,
): OpportunityDisplayDetail {
  if (isPackageShape(detail)) {
    return {
      summary: detail.plainEnglishSummary,
      customer: detail.customer,
      problem: detail.problem,
      solution: detail.solution,
      whyThisFounder: detail.whyThisFounder,
      businessModel: detail.businessModelPlainEnglish,
      startingCapital: detail.startingCapital,
      weeklyTime: detail.weeklyTime,
      difficulty: detail.difficulty,
      skillsAlreadyOwned: detail.skillsAlreadyOwned,
      skillsToLearn: detail.skillsToLearn,
      resourceRequirements: detail.resourceRequirements,
      advantages: detail.advantages,
      tradeoffs: detail.tradeoffs,
      risks: detail.risks,
      unknowns: detail.unknowns,
      validationNeeded: detail.validationNeeded,
      revenuePath: detail.revenuePath,
      firstExperiment: detail.firstExperiment,
    };
  }

  // Legacy pre-migration shape — mapped onto the same display contract so
  // old founders' saved analyses keep rendering correctly.
  return {
    summary: detail.theOpportunity,
    customer: detail.whoItIsFor,
    problem: detail.theProblem,
    solution: detail.theOpportunity,
    whyThisFounder: detail.whyThisFitsYou,
    businessModel: detail.howItCanMakeMoney,
    startingCapital: detail.startingRequirements.capital,
    weeklyTime: detail.startingRequirements.time,
    difficulty: detail.difficulty,
    skillsAlreadyOwned: detail.whatYouAlreadyHave,
    skillsToLearn: [...detail.whatYouStillNeed, ...detail.startingRequirements.skills],
    resourceRequirements: detail.startingRequirements.equipment,
    advantages: [],
    tradeoffs: [],
    risks: detail.risks,
    unknowns: [],
    validationNeeded: detail.needsValidation,
    revenuePath: detail.howItCanMakeMoney,
    firstExperiment: detail.firstExperiment,
  };
}
