import type { NormalizedProfile } from "@/lib/profile/normalize";
import { formatMoney } from "@/lib/country-currency";

export const PLAIN_LANGUAGE_RULE = `Never use unexplained jargon (SaaS, B2B, B2C, TAM, CAC, LTV, go-to-market, vertical integration, product-market fit, acquisition funnel, infrastructure layer). If a concept is needed, explain it in one plain clause the same sentence. Write for someone who has never studied business. Never say a business idea is "validated" unless real evidence justifies that — prefer "strong signal", "early signal", "emerging", "needs validation", or "limited evidence". Never invent statistics, customer counts, testimonials, or sources. If you don't know something, say so plainly instead of guessing confidently.`;

export function formatProfileForPrompt(profile: NormalizedProfile): string {
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
      "Skills: none formally listed yet — do not assume competence, but do not treat this as disqualifying.",
    );
  }

  lines.push(`Relevant experience: ~${profile.experienceYears} years.`);
  lines.push(
    `Resources: about ${money(profile.resources.capitalAmount)} available to start. Assets available: ${profile.resources.assets.join(", ") || "none listed"}. Internet: ${profile.resources.internetQuality ?? "unknown"}. Transportation: ${profile.resources.transportation ?? "unknown"}.`,
  );
  if (profile.resources.annualIncomeAmount) {
    lines.push(
      `Existing annual income: about ${money(profile.resources.annualIncomeAmount)} — this is ongoing earning capacity, separate from the capital available to invest above. A side-income idea should feel meaningful relative to this, not trivial.`,
    );
  }
  lines.push(`Time: about ${profile.time.weeklyHours} hours/week realistically available.`);
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
