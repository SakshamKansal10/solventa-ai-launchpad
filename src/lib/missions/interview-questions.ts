/**
 * Interview questions ask about past behaviour, never about opinions of the idea (part 4,
 * feature 4). The generator is told so; this check enforces it on what comes back: a question
 * that asks for an opinion of the idea is dropped (the founder would only hear politeness).
 */
const OPINION = [
  /\bwould you (use|buy|pay|try|recommend|switch|sign up)\b/i,
  /\bwill you (use|buy|pay|try)\b/i,
  /\b(do|did) you like (the|this|my|our) (idea|product|service|app)\b/i,
  /\bwhat do you think (of|about) (the|this|my|our) (idea|product|service|app)\b/i,
  /\bhow much would you pay\b/i,
  /\bwould this (help|be useful)\b/i,
  /क्या आप .*(इस्तेमाल|ख़रीद|खरीद|पैसे).*(करेंगे|देंगे|लेंगे)/,
];

export const isOpinionQuestion = (q: string) => OPINION.some((r) => r.test(q));

export function keepBehaviourQuestions(questions: readonly string[]): string[] {
  return questions.map((q) => q.trim()).filter((q) => q && !isOpinionQuestion(q));
}

/** Safe, open questions about what already happened, used only when the generator's own
 * questions fall below three after the opinion check. Hindi written as it would be said. */
export const DEFAULT_BEHAVIOUR_QUESTIONS: Record<"en" | "hi", readonly string[]> = {
  en: [
    "Tell me about the last time this problem came up for you. What happened?",
    "How do you handle it today, step by step?",
    "What have you already tried, and what did it cost you in time or money?",
  ],
  hi: [
    "पिछली बार यह दिक़्क़त कब आई थी? क्या हुआ था, बताइए।",
    "आज आप इसे कैसे संभालते हैं? शुरू से बताइए।",
    "अब तक आपने क्या-क्या आज़माया है, और उसमें कितना समय या पैसा लगा?",
  ],
};

/** The generator's questions with opinion questions dropped, topped up to at least three and
 * capped at five. */
export function interviewQuestionsFor(
  questions: readonly string[] | null | undefined,
  locale: "en" | "hi" = "en",
): string[] {
  const kept = keepBehaviourQuestions(questions ?? []);
  for (const q of DEFAULT_BEHAVIOUR_QUESTIONS[locale]) {
    if (kept.length >= 3) break;
    if (!kept.includes(q)) kept.push(q);
  }
  return kept.slice(0, 5);
}
