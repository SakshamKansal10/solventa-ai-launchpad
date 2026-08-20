import { z } from "zod";

const skillLevelEnum = z.enum([
  "never_tried",
  "beginner",
  "intermediate",
  "advanced",
  "professional",
]);
const riskLevelEnum = z.enum(["cautious", "balanced", "experimental"]);

export const FitFactorsSchema = z.object({
  requiredSkills: z
    .array(z.object({ name: z.string(), minLevel: skillLevelEnum }))
    .describe("Skills genuinely needed to start, with the minimum comfort level required."),
  startupCapitalINR: z
    .number()
    .min(0)
    .describe("Realistic rupee amount needed to start, not scale."),
  weeklyHoursNeeded: z.number().min(0).describe("Realistic hours/week to get this moving."),
  riskLevel: riskLevelEnum,
  motivationAlignment: z
    .enum(["high", "medium", "low"])
    .describe(
      "How well this matches the founder's stated motivation/interests — a judgment call, not a score.",
    ),
  requiresLeadership: z.boolean(),
  requiresSales: z.boolean(),
  soloFriendly: z.boolean(),
  relevantExperienceYears: z.number().min(0),
  requiresDigitalAssets: z.boolean(),
  locationFlexible: z
    .boolean()
    .describe(
      "True if this can be run from wherever the founder already lives. False only if it genuinely requires being physically present somewhere specific (a shop, a client's site, a particular city).",
    ),
});
export type FitFactors = z.infer<typeof FitFactorsSchema>;

export const OpportunityCandidateSchema = z.object({
  title: z.string().describe("Short, concrete name for the opportunity."),
  oneLiner: z.string().describe("One plain-language sentence: what is it."),
  whoFor: z.string().describe("One plain-language sentence: who would pay for this."),
  category: z
    .string()
    .describe("e.g. local service, digital service, product, content — plain words."),
  howToStart: z
    .array(z.string())
    .length(3)
    .describe("Exactly three simple, concrete first actions."),
  whyYou: z
    .array(z.string())
    .length(3)
    .describe(
      "Exactly three specific reasons this fits THIS founder, referencing their actual profile.",
    ),
  fitFactors: FitFactorsSchema,
});
export type OpportunityCandidate = z.infer<typeof OpportunityCandidateSchema>;

export const StartingRequirementsSchema = z.object({
  capital: z.string(),
  time: z.string(),
  skills: z.array(z.string()),
  equipment: z.array(z.string()),
});

export const OpportunityDetailSchema = z.object({
  theOpportunity: z.string().describe("Simple explanation, 2-3 sentences, no jargon."),
  theProblem: z.string().describe("What real problem this solves, in plain language."),
  whoItIsFor: z.string(),
  whyThisFitsYou: z
    .array(z.string())
    .min(2)
    .max(5)
    .describe("Reasons that explicitly reference the founder's real profile signals."),
  whatYouAlreadyHave: z.array(z.string()),
  whatYouStillNeed: z.array(z.string()),
  startingRequirements: StartingRequirementsSchema,
  difficulty: z
    .enum(["Beginner-friendly", "Moderate", "Challenging"])
    .describe(
      "Honest difficulty for THIS founder given their real skills/experience — not generic.",
    ),
  howItCanMakeMoney: z.string().describe("Plain-language explanation of the money mechanics."),
  competition: z.string().describe("Who else does something similar, described honestly."),
  risks: z.array(z.string()).describe("What can realistically go wrong."),
  needsValidation: z
    .array(z.string())
    .describe("Explicit open questions/uncertainties the founder still needs to test."),
  firstExperiment: z
    .string()
    .describe(
      "One concrete, low-cost, doable-this-week action to test the idea before committing real time/money — specific, not 'validate the market'.",
    ),
});
export type OpportunityDetail = z.infer<typeof OpportunityDetailSchema>;

export const EvidenceLabelEnum = z.enum([
  "strong_signal",
  "early_signal",
  "emerging",
  "competitive",
  "needs_validation",
  "limited_evidence",
]);

export const MarketEvidenceItemSchema = z.object({
  claim: z.string(),
  label: EvidenceLabelEnum,
  sourceTitle: z.string().nullable(),
  sourceUrl: z.string().nullable(),
});
export type MarketEvidenceItem = z.infer<typeof MarketEvidenceItemSchema>;

export const MarketEvidenceResultSchema = z.object({
  items: z.array(MarketEvidenceItemSchema).max(8),
});
export type MarketEvidenceResult = z.infer<typeof MarketEvidenceResultSchema>;

export const RoadmapTaskSchema = z.object({
  what: z.string(),
  why: z.string(),
  how: z.string(),
  resource: z
    .string()
    .nullable()
    .describe("A specific, real, current learning resource if relevant."),
  timeEstimate: z.string().describe("e.g. '2-3 hours', '1 week'."),
  deadlineDaysFromStart: z
    .number()
    .min(0)
    .describe("Days from roadmap start this should be done by."),
  doneWhen: z.string().describe("A clear, measurable completion condition."),
  required: z
    .boolean()
    .describe("False for a genuinely optional/nice-to-have task, true otherwise."),
  dependsOn: z
    .string()
    .nullable()
    .describe(
      "The exact 'what' text of a prior task this depends on, or null if it can start independently.",
    ),
});
export type RoadmapTaskPlan = z.infer<typeof RoadmapTaskSchema>;

export const RoadmapPhaseSchema = z.object({
  key: z
    .enum(["understand", "explore", "validate", "build", "launch", "improve"])
    .describe("Only include phases that genuinely apply to this opportunity."),
  title: z.string(),
  description: z.string(),
  // Capped at 2-3 (not the originally-allowed 8): three full roadmaps
  // nested inside one intelligence-package response empirically hit
  // Gemini's structured-output complexity ceiling twice — first at 1-8
  // tasks/phase (fixed by capping to 2-4), then again at the FULL nested
  // package with 2-4 (a live 400 INVALID_ARGUMENT each time, on the real
  // combined schema, not just this array in isolation). Cut further here
  // rather than guessed at — this is the second empirical reduction.
  tasks: z.array(RoadmapTaskSchema).min(2).max(3),
});
export type RoadmapPhasePlan = z.infer<typeof RoadmapPhaseSchema>;

export const RoadmapPlanSchema = z.object({
  // Capped at 3-4 (not the originally-allowed 6) for the same reason.
  phases: z.array(RoadmapPhaseSchema).min(3).max(4),
});
export type RoadmapPlan = z.infer<typeof RoadmapPlanSchema>;

export const MentorResponseSchema = z.object({
  message: z
    .string()
    .describe(
      "Direct, honest, beginner-friendly reply. No clichés, no corporate language, no emoji spam.",
    ),
  nextActions: z
    .array(z.string())
    .max(3)
    .describe(
      "Up to three concrete next actions, only when genuinely useful — omit if not needed.",
    ),
  isRecommendation: z
    .boolean()
    .describe(
      "True if this response is Sol's opinion/recommendation rather than a statement of fact/evidence.",
    ),
});
export type MentorResponse = z.infer<typeof MentorResponseSchema>;

/** @deprecated superseded by FounderDNASchema (the one-call architecture) —
 * kept only so pre-migration business_dna rows still deserialize. */
export const FounderAnalysisSchema = z.object({
  summary: z.string().describe("2-3 sentence honest synthesis of who this founder is right now."),
  strengths: z.array(z.string()).min(2).max(6),
  constraints: z
    .array(z.string())
    .describe("Real limits to design around, stated plainly, never as criticism."),
  reflection: z
    .string()
    .describe(
      "One grounded reflection sentence referencing specific real answers, e.g. 'You have strong X but limited Y, so I'll prioritize Z.'",
    ),
});
export type FounderAnalysis = z.infer<typeof FounderAnalysisSchema>;

// ============================================================
// ONE-CALL ARCHITECTURE — the complete Solventia Intelligence Package.
// A single Gemini request after Stage 7 produces all of this at once:
// founder synthesis + exactly 3 opportunities, each with its full detail
// AND its full roadmap already generated. Fit scores are never part of
// this schema — those are always computed deterministically app-side
// from fitSignals (see profile/scoring.ts).
// ============================================================

export const FounderDNASchema = z.object({
  narrativeSummary: z
    .string()
    .describe("2-3 sentence honest synthesis of who this founder is right now."),
  strengths: z.array(z.string()).min(2).max(5).describe("What gives this founder an advantage."),
  resources: z
    .array(z.string())
    .min(1)
    .max(5)
    .describe("What they can actually use — capital, time, assets, skills, network."),
  constraints: z
    .array(z.string())
    .min(1)
    .max(5)
    .describe("Real limits every recommendation must respect, stated plainly, never as criticism."),
  workStyle: z.string().describe("One sentence: how this founder is most likely to execute well."),
  riskProfile: z
    .string()
    .describe("One sentence: how much uncertainty/capital exposure genuinely fits them."),
  direction: z.string().describe("One sentence: what outcome they're actually seeking."),
  strategicSignals: z
    .array(z.string())
    .min(1)
    .max(4)
    .describe(
      "Less-obvious insights created by COMBINING multiple answers together — never a restatement of one single answer.",
    ),
});
export type FounderDNA = z.infer<typeof FounderDNASchema>;

export const OpportunityPackageSchema = z.object({
  title: z.string().describe("Short, concrete name for the opportunity."),
  category: z
    .string()
    .describe("e.g. local service, digital service, product, content — plain words."),
  plainEnglishSummary: z.string().describe("1-2 sentences: what is it, no jargon."),
  customer: z.string().describe("Who specifically would pay for this."),
  problem: z.string().describe("The real problem this solves, plainly."),
  solution: z.string().describe("How this opportunity solves that problem, plainly."),
  whyThisFounder: z
    .array(z.string())
    .length(3)
    .describe(
      "Exactly three specific reasons this fits THIS founder, referencing their actual profile.",
    ),
  businessModelPlainEnglish: z
    .string()
    .describe("Plain-language explanation of how this makes money."),
  startingCapital: z
    .string()
    .describe("Realistic starting range in plain words, e.g. '₹5,000–15,000 to start'."),
  weeklyTime: z.string().describe("Realistic weekly time commitment in plain words."),
  difficulty: z
    .enum(["Beginner-friendly", "Moderate", "Challenging"])
    .describe("Honest difficulty for THIS founder given their real skills/experience."),
  skillsAlreadyOwned: z.array(z.string()).max(5),
  skillsToLearn: z.array(z.string()).max(5),
  resourceRequirements: z
    .array(z.string())
    .max(4)
    .describe("Concrete equipment/tools/accounts needed to start."),
  advantages: z.array(z.string()).min(2).max(4),
  tradeoffs: z.array(z.string()).min(1).max(4),
  risks: z.array(z.string()).min(1).max(4).describe("What can realistically go wrong."),
  unknowns: z.array(z.string()).max(3).describe("Open questions not yet answered."),
  validationNeeded: z
    .array(z.string())
    .max(3)
    .describe("What must be tested before committing real time/money."),
  revenuePath: z
    .string()
    .describe("How revenue realistically grows from the first customer onward."),
  firstExperiment: z
    .string()
    .describe(
      "One concrete, low-cost, doable-this-week action to test the idea — specific, never 'validate the market'.",
    ),
  fitSignals: FitFactorsSchema,
  roadmap: RoadmapPlanSchema,
});
export type OpportunityPackage = z.infer<typeof OpportunityPackageSchema>;

export const SolventiaIntelligencePackageSchema = z.object({
  founderDNA: FounderDNASchema,
  opportunities: z
    .array(OpportunityPackageSchema)
    .length(3)
    .describe(
      "Exactly 3 genuinely different strategic options for this founder — never near-duplicates of the same idea.",
    ),
});
export type SolventiaIntelligencePackage = z.infer<typeof SolventiaIntelligencePackageSchema>;

/** Used by the explicit "Explore More Opportunities" action — same rich
 * per-opportunity shape as the one-call package, without regenerating
 * founder DNA (the profile hasn't changed). */
export const OpportunityPackageBatchSchema = z.object({
  opportunities: z.array(OpportunityPackageSchema).min(1).max(4),
});
export type OpportunityPackageBatch = z.infer<typeof OpportunityPackageBatchSchema>;
