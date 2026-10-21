import type { NormalizedProfile } from "@/lib/profile/normalize";
import { formatMoney } from "@/lib/country-currency";
import { computeFounderGenome, computeFounderPersona } from "@/lib/profile/founder-genome";
import { computeAmbitionCalibration, formatAmbitionContextForPrompt } from "@/lib/profile/ambition";
import { statedCapital, statedHours, type Range } from "@/lib/fit/model";

export const PLAIN_LANGUAGE_RULE = `Never use unexplained jargon (SaaS, B2B, B2C, TAM, CAC, LTV, go-to-market, vertical integration, product-market fit, acquisition funnel, infrastructure layer). If a concept is needed, explain it in one plain clause the same sentence. Write for someone who has never studied business. Never say a business idea is "validated" unless real evidence justifies that — prefer "strong signal", "early signal", "emerging", "needs validation", or "limited evidence". Never invent statistics, customer counts, testimonials, or sources. If you don't know something, say so plainly instead of guessing confidently.

TRUTHFULNESS (non-negotiable): Every statement about the founder must come from the profile below — never infer a city, town, local market, physical access, network, skill gap or ambition they did not state. A range the founder gave stays a range: never restate their budget or weekly time as one number ("you have ₹30,000", "your 35 hours"); when a plan needs a number, use the lower end and say it is a planning assumption. Something marked unknown or not stated is unknown — never say they lack it and never say it matches. Never state market facts (supplier or competitor counts, market size, prices, commissions, conversion rates, demand, margins, legal requirements, odds of success) as true; present any such figure as an estimate or a hypothesis to test, and say what would confirm it. Never guarantee earnings, customers or commissions.`;

/** The product's selected-language surface — currently English and Hindi
 * (see src/lib/i18n/dictionary.ts's Locale type, which this deliberately
 * mirrors rather than imports, since this file must stay usable from
 * server-only code with zero risk of pulling client i18n state in). */
export type GenerationLocale = "en" | "hi";

/** Empty for English (the model's own default needs no extra instruction).
 * For Hindi, this is deliberately explicit about WHICH fields change and
 * which never do — enum values, booleans, and numbers are part of the
 * app's typed contract (difficulty, riskLevel, motivationAlignment,
 * minLevel, currency codes) and would break validation or silently
 * confuse downstream code if translated; only prose meant for the founder
 * to read changes language. Appended to each call's own `prompt` string,
 * never baked into a shared SYSTEM_INSTRUCTION constant, so it never
 * leaks into a request made for a different founder's chosen language. */
export function buildLanguageRule(locale: GenerationLocale): string {
  if (locale !== "hi") return "";
  return `\n\nLANGUAGE: Write every field meant for the founder to read (titles, summaries, descriptions, reasons, task/mission text, everything prose) in natural, professional Hindi (Devanagari script) — write as a fluent Hindi business document would, never a stiff word-for-word translation from English. Common English business/technical terms that are normally used as-is in professional Hindi (e.g. "SaaS", "founder", product/technology names) may stay in English within Hindi sentences where that reads naturally. NEVER translate: any enum value (difficulty must stay exactly "Beginner-friendly"/"Moderate"/"Challenging"; riskLevel must stay exactly "cautious"/"balanced"/"experimental"; motivationAlignment must stay exactly "high"/"medium"/"low"; minLevel must stay exactly "never_tried"/"beginner"/"comfortable"/"advanced"), any boolean or numeric field, any currency code, or any JSON key name. Only the prose content of string fields changes language.`;
}

/** Profile block for founders who completed the rebuilt (v2) consultation.
 * Same purpose as the legacy block below, but it states each signal's TRUE
 * weight: skills carry their declared level and whether they were ever used
 * for real, execution evidence outranks self-description, interests are soft,
 * and the minimum-income answer is a constraint — never a target size. */
function rangeWords(r: Range, fmt: (n: number) => string, unit = ""): string {
  if (r.max === null) return `more than ${fmt(r.min)}${unit}`;
  if (r.min <= 0) return `under ${fmt(r.max)}${unit}`;
  if (r.min === r.max) return `${fmt(r.min)}${unit}`;
  return `${fmt(r.min)}–${fmt(r.max)}${unit}`;
}

/** The founder's stated budget and weekly time, as the ranges they picked. */
export function formatStatedResources(profile: NormalizedProfile): string[] {
  const money = (amount: number) => formatMoney(amount, profile.identity.currency);
  const cap = statedCapital(profile);
  const hours = statedHours(profile);
  return [
    cap
      ? `Starting budget the founder STATED: ${rangeWords(cap, money)} — a range; never restate it as one amount.`
      : "Starting budget: not stated (unknown — never assume an amount).",
    hours
      ? `Weekly time the founder STATED: ${rangeWords(hours, String, " hours")} — a range; never restate it as one number. Plan around the lower end and say so.`
      : "Weekly time: not stated (unknown — never assume a number).",
  ];
}

/** The hours a plan is designed around: the LOWER end of the stated range, named as
 * a planning assumption so it is never mistaken for the founder's own number. */
export function planningHoursPhrase(profile: NormalizedProfile): string {
  const hours = statedHours(profile);
  if (!hours)
    return "an unstated number of hours a week (assume a light part-time load and say so)";
  const plan = Math.max(hours.min, hours.min === 0 ? Math.min(3, hours.max ?? 3) : hours.min);
  return `${plan} hrs/week — a planning assumption at the lower end of the founder's stated ${rangeWords(hours, String, " hours")}`;
}

function formatProfileV2ForPrompt(profile: NormalizedProfile): string {
  const v2 = profile.v2!;
  const money = (amount: number) => formatMoney(amount, profile.identity.currency);
  const lines: string[] = [];

  const status =
    profile.identity.currentStatus === "Other" && profile.identity.currentStatusDetail
      ? profile.identity.currentStatusDetail
      : (v2.status ?? "status unknown");
  lines.push(
    `Identity: ${profile.identity.age ?? "unknown"} years old, ${status}, based in ${[profile.identity.city, profile.identity.state, profile.identity.country].filter(Boolean).join(", ") || "unknown location"}. Languages: ${profile.identity.languages.join(", ") || "unknown"} (not a founder-potential signal).`,
  );
  if (!profile.identity.city) {
    lines.push(
      "City: not stated. Never name or assume a specific city, town or local market for this founder; if a local advantage could matter, say it needs confirming.",
    );
  }
  lines.push(
    `Currency: every monetary figure below, and every monetary figure you generate for this founder, must be in ${profile.identity.currency} (${profile.identity.currencySymbol}) — never rupees/lakh/crore unless that is genuinely their currency.`,
  );

  const edu = [
    v2.education.level,
    v2.education.major,
    v2.education.institution,
    v2.education.studyYear,
  ]
    .filter(Boolean)
    .join(" · ");
  lines.push(
    `Education: ${edu || "not stated"} (completion level only — never institution prestige).`,
  );

  const business = v2.position.business;
  if (business) {
    lines.push(
      `ESTABLISHED OPERATOR — already runs a business in ${business.sector ?? "an unstated sector"} with annual turnover ${business.turnoverLabel ?? "unstated"} and a team of ${business.teamLabel ?? "unstated size"}. Recommend opportunities that use this business's distribution, capital, team, brand or customer access; never a tiny owner-operated side business, and never treat this founder as a first-time starter.`,
    );
  } else if (v2.position.annualIncomeLabel) {
    lines.push(
      `Current annual income: ${v2.position.annualIncomeLabel} — this is their opportunity cost. An idea below what they could realistically earn elsewhere must justify itself as a validation wedge into something larger.`,
    );
  }

  if (profile.skills.length > 0) {
    lines.push(
      `Skills (declared level · used on a real project/job?): ${profile.skills
        .map(
          (s) =>
            `${s.name} (${s.declaredLevel ?? s.level} · ${s.usedInReal ? "used for real" : "not used in real work yet"})`,
        )
        .join(", ")}. A basic/unused skill is a weak signal and must not anchor an idea.`,
    );
  } else {
    lines.push(
      "Skills: none recorded — UNKNOWN, not absent. Never say they lack a skill; say the skills information is incomplete.",
    );
  }
  if (v2.domains.length > 0) lines.push(`Experience domains: ${v2.domains.join(", ")}.`);
  lines.push(
    `Execution evidence (what they have actually done — outranks self-description): ${v2.executionSignals.join(", ") || "nothing yet"}. Estimated relevant experience ≈ ${profile.experienceYears} years (a derived estimate from age, status and the evidence above — never present it as their stated experience).`,
  );

  lines.push(...formatStatedResources(profile));
  lines.push(
    `Access the founder STATED: ${v2.access.join(", ") || (v2.accessNone ? "none of the listed options" : "not stated (unknown)")}. Having a network is not proof it contains this direction's buyers.`,
  );
  lines.push(
    `Risk tolerance: ${v2.execution.riskTolerance ?? "unknown"}. Early-stage roles they can realistically handle: ${v2.execution.roles.join(", ") || "not stated"}. Team preference: ${v2.execution.teamPreference ?? "not stated"}.`,
  );

  if (v2.commitment) lines.push(`What would keep them committed for years: ${v2.commitment}.`);
  if (v2.interests.length > 0) {
    lines.push(
      `Areas of interest (SOFT signal only — never reason "likes X, therefore an X business"; choose the strongest opportunity for this founder's capability, resources and ambition, and treat interest as a minor tiebreaker at most): ${v2.interests.join(", ")}.`,
    );
  }

  const constraints = [
    ...profile.constraints.industryRestrictions.map((r) => `refuses to enter: ${r}`),
    profile.constraints.relocation ? `relocation: ${profile.constraints.relocation}` : null,
    ...v2.hardConstraints,
  ].filter(Boolean);
  if (constraints.length > 0) {
    lines.push(
      `Hard constraints that MUST be respected — never suggest anything that conflicts with these: ${constraints.join("; ")}.`,
    );
  }

  const a = v2.ambition;
  if (a.scaleId === "not_sure") {
    lines.push(
      "Ambition is NOT SURE YET — undefined. Never say a direction matches their ambition; you may note that local and larger paths can be compared as they learn.",
    );
  }
  lines.push(
    `Ambition: wants ${a.scale ?? "scale not stated"}; will give a serious opportunity ${a.horizon ?? "an unstated time horizon"}; ultimately hoping for ${a.hope ?? "not stated"}.${a.minimumMonthlyIncome ? ` Needs at least ~${money(a.minimumMonthlyIncome)}/month of personal income within 12 months — a CONSTRAINT on the plan, never the target size of the company.` : ""}`,
  );

  return lines.join("\n");
}

export function formatProfileForPrompt(profile: NormalizedProfile): string {
  if (profile.v2) return formatProfileV2ForPrompt(profile);
  const lines: string[] = [];
  const money = (amount: number) => formatMoney(amount, profile.identity.currency);

  const status =
    profile.identity.currentStatus === "Other" && profile.identity.currentStatusDetail
      ? profile.identity.currentStatusDetail
      : (profile.identity.currentStatus ?? "status unknown");
  lines.push(
    `Identity: ${profile.identity.age ?? "unknown"} years old, ${status}, based in ${[profile.identity.city, profile.identity.state, profile.identity.country].filter(Boolean).join(", ") || "unknown location"}. Education: ${profile.identity.education ?? "unknown"}. Languages: ${profile.identity.languages.join(", ") || "unknown"}.`,
  );
  lines.push(
    `Currency: this founder's monetary figures below, and every monetary figure you generate for them, must be in ${profile.identity.currency} (${profile.identity.currencySymbol}) — never rupees/lakh/crore unless that is genuinely their currency.`,
  );
  if (profile.identity.currentBusiness) {
    lines.push(
      `Already runs a business/freelance practice — revenue: ${profile.identity.currentBusiness.revenueBracket ?? "not shared"}, customers: ${profile.identity.currentBusiness.customers ?? "not shared"}. Consider whether extending this existing business fits better than starting something unrelated.`,
    );
  }

  if (profile.skills.length > 0) {
    lines.push(
      `Skills: ${profile.skills.map((s) => `${s.name} (${s.level.replace("_", " ")})`).join(", ")}.`,
    );
  } else {
    lines.push(
      "Skills: none recorded — UNKNOWN, not absent. Never say they lack a skill; say the skills information is incomplete.",
    );
  }

  lines.push(`Relevant experience: ~${profile.experienceYears} years (a derived estimate).`);
  lines.push(...formatStatedResources(profile));
  lines.push(
    `Assets available: ${profile.resources.assets.join(", ") || "none listed"}. Internet: ${profile.resources.internetQuality ?? "unknown"}. Transportation: ${profile.resources.transportation ?? "unknown"}.`,
  );
  if (profile.resources.annualIncomeAmount) {
    lines.push(
      `Existing annual income: about ${money(profile.resources.annualIncomeAmount)} — this is ongoing earning capacity, separate from the capital available to invest above. A side-income idea should feel meaningful relative to this, not trivial.`,
    );
  }
  lines.push(
    `Work style: prefers ${profile.workStyle.location ?? "no stated preference"} work, drawn to ${profile.workStyle.type ?? "unspecified"} ventures, leadership comfort "${profile.workStyle.leadership ?? "unknown"}", sales comfort "${profile.workStyle.salesComfort ?? "unknown"}", ${profile.workStyle.soloOrTeam ?? "unspecified"} preference.`,
  );
  lines.push(`Risk appetite: ${profile.risk.appetite ?? "unknown"}.`);

  if (profile.motivation.biggestMotivation.length > 0) {
    lines.push(
      `What drives them to build this: ${profile.motivation.biggestMotivation.join(", ")}.`,
    );
  }
  if (profile.motivation.dailyFrustration.length > 0) {
    lines.push(
      `Problem areas that resonate with them: ${profile.motivation.dailyFrustration.join(", ")}.`,
    );
  }

  const constraints = [
    ...profile.constraints.industryRestrictions,
    profile.constraints.relocation ? `relocation: ${profile.constraints.relocation}` : null,
    ...profile.constraints.other,
  ].filter(Boolean);
  if (constraints.length > 0) {
    lines.push(
      `Real constraints that MUST be respected — never suggest anything that conflicts with these: ${constraints.join("; ")}.`,
    );
  }

  lines.push(
    `Direction: goals = ${profile.direction.goals.join(", ") || "unspecified"}; monthly income goal ≈ ${profile.direction.monthlyIncomeGoalAmount ? money(profile.direction.monthlyIncomeGoalAmount) : "not focused on income"}; timeline = ${profile.direction.timeline ?? "unspecified"}.`,
  );
  if (profile.direction.willingToLeaveJob) {
    lines.push(
      `Willingness to eventually leave their job for this: ${profile.direction.willingToLeaveJob}.`,
    );
  }

  return lines.join("\n");
}

/** Founder Genome + Ambition Calibration, both deterministic and
 * pre-computed from the same normalized signals as formatProfileForPrompt
 * above — never re-derived or second-guessed by the model. Used by
 * roadmap generation (skeleton and per-week detail alike) so plan scale
 * stays calibrated to this specific founder: never a ceiling-scraping
 * venture plan for someone with no capital or time, and never a
 * timid side-hustle plan for someone with real capability and capacity. */
export function formatGenomeAndAmbitionForPrompt(profile: NormalizedProfile): string {
  const genome = computeFounderGenome(profile);
  const persona = computeFounderPersona(profile, genome);
  const ambition = computeAmbitionCalibration(profile, genome);
  const sorted = [...genome.dimensions].sort((a, b) => b.score - a.score);
  const strongest = sorted.slice(0, 2).map((d) => d.label);
  const weakest = sorted[sorted.length - 1]?.label;

  return `Founder Genome (deterministic, not your opinion): ${persona.name} — ${persona.attributes.join("; ")}. Strongest: ${strongest.join(", ")}. Weakest: ${weakest ?? "none flagged"}.
${formatAmbitionContextForPrompt(ambition)}`;
}
