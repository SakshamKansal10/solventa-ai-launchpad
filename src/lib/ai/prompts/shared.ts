import type { NormalizedProfile } from "@/lib/profile/normalize";

export const PLAIN_LANGUAGE_RULE = `Never use unexplained jargon (SaaS, B2B, B2C, TAM, CAC, LTV, go-to-market, vertical integration, product-market fit, acquisition funnel, infrastructure layer). If a concept is needed, explain it in one plain clause the same sentence. Write for someone who has never studied business. Never say a business idea is "validated" unless real evidence justifies that — prefer "strong signal", "early signal", "emerging", "needs validation", or "limited evidence". Never invent statistics, customer counts, testimonials, or sources. If you don't know something, say so plainly instead of guessing confidently.`;

export function formatProfileForPrompt(profile: NormalizedProfile): string {
  const lines: string[] = [];

  lines.push(
    `Identity: ${profile.identity.age ?? "unknown"} years old, ${profile.identity.currentStatus ?? "status unknown"}, based in ${[profile.identity.city, profile.identity.state, profile.identity.country].filter(Boolean).join(", ") || "unknown location"}. Education: ${profile.identity.education ?? "unknown"}. Languages: ${profile.identity.languages.join(", ") || "unknown"}.`,
  );

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
    `Resources: about ₹${profile.resources.capitalINR.toLocaleString("en-IN")} available to start. Assets available: ${profile.resources.assets.join(", ") || "none listed"}. Internet: ${profile.resources.internetQuality ?? "unknown"}. Transportation: ${profile.resources.transportation ?? "unknown"}.`,
  );
  if (profile.resources.annualIncomeINR) {
    lines.push(
      `Existing annual income: about ₹${profile.resources.annualIncomeINR.toLocaleString("en-IN")} — this is ongoing earning capacity, separate from the capital available to invest above. A side-income idea should feel meaningful relative to this, not trivial.`,
    );
  }
  lines.push(`Time: about ${profile.time.weeklyHours} hours/week realistically available.`);
  lines.push(
    `Work style: prefers ${profile.workStyle.location ?? "no stated preference"} work, drawn to ${profile.workStyle.type ?? "unspecified"} ventures, leadership comfort "${profile.workStyle.leadership ?? "unknown"}", sales comfort "${profile.workStyle.salesComfort ?? "unknown"}", ${profile.workStyle.soloOrTeam ?? "unspecified"} preference.`,
  );
  lines.push(`Risk appetite: ${profile.risk.appetite ?? "unknown"}.`);

  if (profile.motivation.biggestMotivation) {
    lines.push(`What they want to build/change: "${profile.motivation.biggestMotivation}"`);
  }
  if (profile.motivation.dailyFrustration) {
    lines.push(`Real-world problem that bothers them: "${profile.motivation.dailyFrustration}"`);
  }

  const constraints = [
    ...profile.constraints.industryRestrictions,
    profile.constraints.relocation ? `relocation: ${profile.constraints.relocation}` : null,
    profile.constraints.health ? `health/physical: ${profile.constraints.health}` : null,
    profile.constraints.other,
  ].filter(Boolean);
  if (constraints.length > 0) {
    lines.push(
      `Real constraints that MUST be respected — never suggest anything that conflicts with these: ${constraints.join("; ")}.`,
    );
  }

  lines.push(
    `Direction: goals = ${profile.direction.goals.join(", ") || "unspecified"}; monthly income goal ≈ ${profile.direction.monthlyIncomeGoalINR ? `₹${profile.direction.monthlyIncomeGoalINR.toLocaleString("en-IN")}` : "not focused on income"}; timeline = ${profile.direction.timeline ?? "unspecified"}.`,
  );

  return lines.join("\n");
}
