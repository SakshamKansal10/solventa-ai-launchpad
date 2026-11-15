import { describe, expect, it } from "vitest";

import {
  DEFAULT_BEHAVIOUR_QUESTIONS,
  interviewQuestionsFor,
  isOpinionQuestion,
  keepBehaviourQuestions,
} from "./interview-questions";

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

describe("an interview mission always has three to five behaviour questions", () => {
  it("tops up with safe questions in the founder's language when too few survive", () => {
    const qs = interviewQuestionsFor(["Would you use this?", "आज आप बुकिंग कैसे करते हैं?"], "hi");
    expect(qs).toHaveLength(3);
    expect(qs[0]).toBe("आज आप बुकिंग कैसे करते हैं?");
    expect(qs.slice(1)).toEqual(DEFAULT_BEHAVIOUR_QUESTIONS.hi.slice(0, 2));
  });

  it("keeps the generator's own questions when there are enough, at most five", () => {
    const six = Array.from({ length: 6 }, (_, i) => `Tell me about the last time (${i}).`);
    expect(interviewQuestionsFor(six)).toEqual(six.slice(0, 5));
    expect(interviewQuestionsFor(null)).toEqual([...DEFAULT_BEHAVIOUR_QUESTIONS.en]);
    for (const q of [...DEFAULT_BEHAVIOUR_QUESTIONS.en, ...DEFAULT_BEHAVIOUR_QUESTIONS.hi])
      expect(isOpinionQuestion(q)).toBe(false);
  });
});
