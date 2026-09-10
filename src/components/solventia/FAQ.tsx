import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

/** Exactly five — the remaining questions from the old ten-item list
 * move to /about rather than disappearing outright. */
const FAQS = [
  {
    q: "What exactly does Solventia do?",
    a: "Solventia turns your background, skills, capital, and time into a small set of business directions matched to you specifically — then gives you a week-by-week roadmap to actually test and build one.",
  },
  {
    q: "How personalized are the recommendations?",
    a: "Every direction is generated from your own answers, not a shared list. Two people with different profiles get different results, and the fit score behind each one is computed from your real, stored profile.",
  },
  {
    q: "Do I need business experience?",
    a: "No. The consultation starts from where you actually are today — your skills, time, and resources — not from an assumed baseline of prior experience.",
  },
  {
    q: "What happens after I choose an idea?",
    a: "Solventia builds a roadmap for it, broken into weeks. Only the current week is ever fully detailed — the next one is generated once you've actually made progress on the one before it.",
  },
  {
    q: "Is my information private?",
    a: "The details you share are used to personalize your recommendations and roadmap, not sold to third parties. Full details are in our privacy policy.",
  },
];

export function FAQ() {
  return (
    <section
      id="faq"
      className="scroll-mt-[84px] bg-sol-hp-pearl px-[18px] pb-16 pt-[96px] sm:px-6"
    >
      <div className="mx-auto max-w-[840px]">
        <h2 className="text-center font-display text-[32px] font-semibold leading-[1.15] text-sol-ink sm:text-[36px]">
          Questions before you start?
        </h2>

        <div className="mt-10 rounded-[24px] border border-sol-border bg-sol-hp-faq-panel px-6 lg:px-10">
          <Accordion type="single" collapsible className="w-full">
            {FAQS.map((item, i) => (
              <AccordionItem key={item.q} value={`item-${i}`} className="border-sol-border">
                <AccordionTrigger className="min-h-[70px] rounded-[10px] px-3.5 py-5 text-left text-[16px] font-medium text-sol-ink transition-colors duration-[180ms] hover:bg-[rgba(247,244,255,.50)] hover:no-underline [&[data-state=open]]:rounded-b-none">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="max-w-[700px] px-3.5 text-[16px] leading-[26px] text-sol-secondary">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
}
