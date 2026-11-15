import { describe, expect, it } from "vitest";

import { isOpinionQuestion, keepBehaviourQuestions } from "./interview-questions";

describe("interview questions ask about past behaviour", () => {
  it("drops questions asking for an opinion of the idea", () => {
    for (const q of [
      "Would you use an app that books your equipment?",
      "How much would you pay for this?",
      "What do you think of my idea?",
      "Would this help you?",
      "क्या आप इसका इस्तेमाल करेंगे?",
    ])
      expect(isOpinionQuestion(q)).toBe(true);
  });

  it("keeps questions about what already happened", () => {
    const kept = keepBehaviourQuestions([
      "Tell me about the last time you booked a generator for an event.",
      "Would you use our booking desk?",
      "How do you find suppliers today?",
    ]);
    expect(kept).toEqual([
      "Tell me about the last time you booked a generator for an event.",
      "How do you find suppliers today?",
    ]);
  });
});
