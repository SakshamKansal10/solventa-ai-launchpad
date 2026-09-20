import type { z } from "zod";
import { generateJSON } from "@/lib/ai/gemini.server";
import { OpportunityPackageSchema, type OpportunityPackage } from "@/lib/ai/schemas";
import type { GenerationLocale } from "@/lib/ai/prompts/shared";

/** Every founder-facing prose field on an OpportunityPackage — everything
 * EXCEPT `difficulty` (a fixed enum), `fitSignals` (typed scoring inputs:
 * enums/numbers/booleans), and `roadmap` (its own, much larger translation
 * surface, out of scope here). Reusing `.pick()` off the real schema keeps
 * this list from silently drifting out of sync with OpportunityPackageSchema
 * as new prose fields get added there. */
export const OpportunityProseSchema = OpportunityPackageSchema.pick({
  title: true,
  category: true,
  plainEnglishSummary: true,
  customer: true,
  problem: true,
  solution: true,
  problemHeadline: true,
  solutionHeadline: true,
  customerHeadline: true,
  moneyHeadline: true,
  whyThisFounder: true,
  businessModelPlainEnglish: true,
  startingCapital: true,
  weeklyTime: true,
  skillsAlreadyOwned: true,
  skillsToLearn: true,
  resourceRequirements: true,
  advantages: true,
  tradeoffs: true,
  risks: true,
  unknowns: true,
  validationNeeded: true,
  revenuePath: true,
  firstExperiment: true,
  whyNow: true,
});
export type OpportunityProse = z.infer<typeof OpportunityProseSchema>;

const LOCALE_NAME: Record<GenerationLocale, string> = {
  en: "English",
  hi: "Hindi (Devanagari script, natural professional tone — common English business/technical terms that are normally used as-is in professional Hindi, e.g. \"SaaS\", product/technology names, may stay in English within Hindi sentences)",
};

const SYSTEM_INSTRUCTION = `You are a precise translator for a startup-advice app. You are given a JSON object describing one business opportunity for a founder. Translate every string value (including every string inside an array) into the target language. Never add, remove, reinterpret, summarize, or "improve" the content — a faithful, natural-sounding translation only. Keep every JSON key exactly as given, and keep every array the exact same length as given.`;

/** Translates the prose subset of an already-generated OpportunityPackage
 * into a different locale — used to display an opportunity that was
 * generated in one language (see `opportunities.origin_locale`) correctly
 * after the founder later switches the app's UI locale. Never regenerates
 * or reinterprets the opportunity itself, only its wording. Callers are
 * responsible for caching the result (see opportunity-translation.server.ts)
 * so this never runs twice for the same (opportunity, locale) pair. */
export async function translateOpportunityProse(
  prose: OpportunityProse,
  targetLocale: GenerationLocale,
  route: string,
): Promise<OpportunityProse> {
  const prompt = `Target language: ${LOCALE_NAME[targetLocale]}.

Translate every string field in this JSON object into the target language, keeping the exact same keys and array lengths. Return ONLY the translated JSON object, matching this exact shape:
${JSON.stringify(prose, null, 2)}`;

  return generateJSON(OpportunityProseSchema, {
    systemInstruction: SYSTEM_INSTRUCTION,
    prompt,
    callSite: "translateOpportunityProse",
    purpose: "TRANSLATE_OPPORTUNITY",
    route,
  });
}

/** Convenience wrapper for the common case: translate an entire
 * OpportunityPackage's prose in place, leaving difficulty/fitSignals/
 * roadmap untouched. */
export async function translateOpportunityPackage(
  pkg: OpportunityPackage,
  targetLocale: GenerationLocale,
  route: string,
): Promise<OpportunityPackage> {
  const prose: OpportunityProse = {
    title: pkg.title,
    category: pkg.category,
    plainEnglishSummary: pkg.plainEnglishSummary,
    customer: pkg.customer,
    problem: pkg.problem,
    solution: pkg.solution,
    problemHeadline: pkg.problemHeadline,
    solutionHeadline: pkg.solutionHeadline,
    customerHeadline: pkg.customerHeadline,
    moneyHeadline: pkg.moneyHeadline,
    whyThisFounder: pkg.whyThisFounder,
    businessModelPlainEnglish: pkg.businessModelPlainEnglish,
    startingCapital: pkg.startingCapital,
    weeklyTime: pkg.weeklyTime,
    skillsAlreadyOwned: pkg.skillsAlreadyOwned,
    skillsToLearn: pkg.skillsToLearn,
    resourceRequirements: pkg.resourceRequirements,
    advantages: pkg.advantages,
    tradeoffs: pkg.tradeoffs,
    risks: pkg.risks,
    unknowns: pkg.unknowns,
    validationNeeded: pkg.validationNeeded,
    revenuePath: pkg.revenuePath,
    firstExperiment: pkg.firstExperiment,
    whyNow: pkg.whyNow,
  };

  const translated = await translateOpportunityProse(prose, targetLocale, route);
  return { ...pkg, ...translated };
}
