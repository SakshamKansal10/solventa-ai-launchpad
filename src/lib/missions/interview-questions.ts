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
