/** The kinds of business mechanics the business graphic can draw, and how to tell them apart. */
export type ModelKind =
  "service" | "product" | "marketplace" | "content" | "education" | "physical";

const KINDS: [ModelKind, RegExp][] = [
  ["marketplace", /\b(market ?place|platform|matching|two-sided|booking network)/],
  ["content", /\b(newsletter|content|media|blog|youtube|podcast|channel|community)/],
  ["education", /\b(tutor|course|coach|teach|class|lesson|learning|training|academy)/],
  [
    "product",
    /\b(saas|software|apps?|tools?|templates?|digital products?|subscriptions?|automation)\b/,
  ],
  [
    "physical",
    /\b(food|bakery|restaurant|cafe|café|catering|kitchen|snacks?|grocery|retail|shop|store)\b/,
  ],
];

/** A title that names a service ("Freelance website builds…") is one, whatever tools it uses. */
const SERVICE =
  /\b(freelance|agency|services?|consulting|consultancy|studio|done-for-you|repairs?|cleaning)\b/;

const kindIn = (text: string) => KINDS.find(([, re]) => re.test(text.toLowerCase()))?.[0] ?? null;

/**
 * Which mechanics this business runs on, from its own words: the direction's title decides when
 * it names the model ("Digital product: templates…") or a service ("Freelance website builds…");
 * otherwise its wider description does (whole words only — "storefront tools" is not a shop);
 * otherwise it is a service.
 */
export function modelKindOf(title: string, context = ""): ModelKind {
  return (
    kindIn(title) ??
    (SERVICE.test(title.toLowerCase()) ? "service" : null) ??
    kindIn(context) ??
    "service"
  );
}

export interface GraphicNode {
  /** Small readable role ("Who pays"). */
  role: string;
  /** The opportunity's own short phrase. */
  text: string;
}
