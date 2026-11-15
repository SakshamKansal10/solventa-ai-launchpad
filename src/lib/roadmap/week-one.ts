/**
 * Week 1 never needs money, registration or a website (redesign-v2 part 5, step 4). The week-
 * detail prompt says so; this checks what comes back. A mission that asks for any of them is
 * dropped from week 1 as long as at least two missions remain (a week is never left empty) — the
 * same rule as the hours budget (fitTasksToBudget).
 */
const NEEDS_MONEY_REGISTRATION_OR_WEBSITE = [
  // money
  /\b(buy|purchase|pay for|spend|invest in|order stock|stock up|inventory|paid (ad|ads|tool|plan|subscription)|run (ads|an ad)|boost (a )?post|advertis)/i,
  // registration
  /\b(register|registration|udyam|gst|incorporat|trademark|licen[cs]e|company formation|open a (current|business) account)/i,
  // a website
  /\b(website|web ?site|domain|landing page|online store|e-?commerce store|build (an|a) app|shopify|wordpress)/i,
];

/** Hindi mission text: the same three, in the words a Hindi plan would use. */
const HINDI = /(ख़रीद|खरीद|पैसे लगा|विज्ञापन|रजिस्ट्रेशन|पंजीकरण|लाइसेंस|वेबसाइट|डोमेन)/;

export function needsMoneyRegistrationOrWebsite(text: string): boolean {
  return NEEDS_MONEY_REGISTRATION_OR_WEBSITE.some((r) => r.test(text)) || HINDI.test(text);
}

export function keepWeekOneFree<T extends { what: string; how?: string; steps?: string[] }>(
  tasks: T[],
): { tasks: T[]; removed: T[] } {
  const text = (t: T) => [t.what, t.how ?? "", ...(t.steps ?? [])].join(" ");
  const removed = tasks.filter((t) => needsMoneyRegistrationOrWebsite(text(t)));
  const kept = tasks.filter((t) => !removed.includes(t));
  return kept.length >= 2 ? { tasks: kept, removed } : { tasks, removed: [] };
}
