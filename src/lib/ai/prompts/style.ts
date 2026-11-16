/**
 * How Solventia writes (owner, go-live step 5) — ONE rule per language, used by every generator
 * and by the translator, plus a checker the tests run over examples and the UI catalogue.
 */

export const HINDI_STYLE_RULE = `Write simple, spoken Hindi, the way people talk in Haryana and Punjab, in Devanagari script. Everyday English words stay as people say them, written in Devanagari: बिज़नेस, कस्टमर, ऑनलाइन, ऑर्डर, सेल, प्रॉफ़िट, मार्केटिंग, प्लान. Brand, app and tax names stay as they are: WhatsApp, Instagram, Google, GST, UPI. Short sentences, one idea each. No Sanskrit-heavy or formal words — not उद्यमी, प्रतिस्पर्धा, सत्यापन, राजस्व, उपभोक्ता, विपणन, रणनीति, क्रियान्वयन; say बिज़नेस करने वाला, मुकाबला, जाँच, कमाई, कस्टमर, मार्केटिंग, प्लान, काम. Example of the right tone: "अंबाला की दुकानों को ऑनलाइन बेचने में मदद करें। पहले 5 दुकानदारों से बात करें।"`;

export const ENGLISH_STYLE_RULE = `Use words a 14-year-old understands, in short sentences. Every title is at most 6 plain words (e.g. "Help Ambala shops sell online").`;

/** Words that make a sentence harder than it needs to be. Matched as whole words. */
export const ENGLISH_JARGON = [
  "SaaS",
  "B2B",
  "B2C",
  "TAM",
  "CAC",
  "LTV",
  "go-to-market",
  "leverage",
  "synergy",
  "scalable",
  "monetize",
  "monetise",
  "stakeholder",
  "ecosystem",
  "value proposition",
  "product-market fit",
  "optimize",
  "optimise",
  "utilize",
  "utilise",
  "paradigm",
  "vertical integration",
  "acquisition funnel",
];

export const HINDI_JARGON = [
  // Not "उद्यम": Udyam Registration is the government scheme's own name.
  "उद्यमी",
  "प्रतिस्पर्धा",
  "प्रतिस्पर्धी",
  "सत्यापन",
  "सत्यापित",
  "राजस्व",
  "लाभप्रदता",
  "उपभोक्ता",
  "विपणन",
  "रणनीति",
  "क्रियान्वयन",
  "कार्यान्वयन",
  "अवधारणा",
  "परिप्रेक्ष्य",
  "प्रौद्योगिकी",
  "अनुकूलन",
];

/** The longest sentence the product writes (words). */
export const MAX_SENTENCE_WORDS = 25;

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function plainLanguageIssues(
  text: string,
  locale: "en" | "hi",
): { jargon: string[]; longSentences: string[] } {
  const list = locale === "hi" ? [...HINDI_JARGON, ...ENGLISH_JARGON] : ENGLISH_JARGON;
  const jargon = list.filter((w) =>
    // Whole words: Latin uses \b; Devanagari has no \b, so a space, punctuation or edge.
    /^[\x20-\x7E]+$/.test(w)
      ? new RegExp(`\\b${escape(w)}\\b`, "i").test(text)
      : new RegExp(`(^|[\\s"'(,।.!?])${escape(w)}($|[\\s"'),।.!?])`).test(text),
  );
  const longSentences = text
    .split(/(?<=[.!?।])\s+/)
    .map((s) => s.trim())
    // Words are tokens with a letter or digit in them: dashes and bullets are not words.
    .filter(
      (s) => s.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length > MAX_SENTENCE_WORDS,
    );
  return { jargon, longSentences };
}
