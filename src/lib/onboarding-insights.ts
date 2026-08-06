import type { OnboardingAnswers } from "./onboarding-types";

const PROCESSING_LINES: Record<number, string[]> = {
  1: ["Analyzing your entrepreneurial profile…", "Mapping your starting point…"],
  3: ["Understanding your strengths…", "Cross-referencing your skills against real opportunities…"],
  5: [
    "Eliminating unsuitable business models…",
    "Identifying opportunities unique to your location…",
  ],
  7: ["Bringing your founder profile together…", "Weighing what actually drives you…"],
};

export function getProcessingLine(afterSection: number): string {
  const options = PROCESSING_LINES[afterSection] ?? ["Thinking…"];
  return options[0];
}

/** A genuine, template-based reflection of the user's own answers so far —
 * never a fabricated business recommendation. Only reflects what they
 * actually told us. */
export function getPersonalizedInsight(afterSection: number, a: OnboardingAnswers): string {
  if (afterSection === 1) {
    const statusPhrase =
      a.currentStatus === "School Student"
        ? `a ${a.currentGrade ?? "school"} student`
        : a.currentStatus === "College Student"
          ? `a college student${a.major ? ` studying ${a.major}` : ""}`
          : a.currentStatus === "Working Professional"
            ? `a working professional${a.industry ? ` in ${a.industry}` : ""}`
            : a.currentStatus === "Business Owner"
              ? "already running a business"
              : a.currentStatus === "Freelancer"
                ? "working as a freelancer"
                : "getting started";

    const timePhrase = a.timeAvailableWeekly
      ? `with ${a.timeAvailableWeekly.toLowerCase()} a week to give this`
      : "";

    return `Interesting. Since you're ${statusPhrase}${timePhrase ? `, ${timePhrase}` : ""}, I'm already narrowing toward opportunities that fit that reality — not generic advice.`;
  }

  if (afterSection === 3) {
    const topSkills = (a.skills ?? []).slice(0, 2).map((s) => s.name);
    if (topSkills.length > 0) {
      return `Noted — ${topSkills.join(" and ")} stand out. I'll weight opportunities that put those to work early, rather than ones that need skills you'd have to build from zero.`;
    }
    return "No strong skills listed yet, and that's genuinely fine — plenty of successful founders started by learning on the job. I'll prioritize ideas with a shallow learning curve.";
  }

  if (afterSection === 5) {
    const budgetPhrase = a.investmentBudget?.startsWith("₹0")
      ? "with little to no starting capital"
      : a.investmentBudget
        ? `with ${a.investmentBudget.toLowerCase()} to work with`
        : "";
    return `Got it. ${budgetPhrase ? `Working ${budgetPhrase}, ` : ""}I'm filtering out anything that needs capital or connections you don't have — and keeping what's actually reachable from where you stand today.`;
  }

  if (afterSection === 7) {
    return "This is the part most tools skip. Understanding what's actually holding you back — and what's pulling you forward — is what turns a generic idea into one you'll actually follow through on.";
  }

  return "Thanks — that helps a lot.";
}
