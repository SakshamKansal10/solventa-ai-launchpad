import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useLocale } from "@/lib/i18n/LocaleProvider";

/** Exactly five — the remaining questions from the old ten-item list
 * move to /about rather than disappearing outright. */
const FAQS = [
  { qKey: "faq.q1.q", aKey: "faq.q1.a" },
  { qKey: "faq.q2.q", aKey: "faq.q2.a" },
  { qKey: "faq.q3.q", aKey: "faq.q3.a" },
  { qKey: "faq.q4.q", aKey: "faq.q4.a" },
  { qKey: "faq.q5.q", aKey: "faq.q5.a" },
];

export function FAQ() {
  const { t } = useLocale();
  return (
    <section
      id="faq"
      className="scroll-mt-[84px] bg-sol-hp-pearl px-[18px] pb-16 pt-[96px] sm:px-6"
    >
      <div className="mx-auto max-w-[840px]">
        <h2 className="text-center font-display text-[32px] font-semibold leading-[1.15] text-sol-ink sm:text-[36px]">
          {t("faq.title")}
        </h2>

        <div className="mt-10 rounded-[24px] border border-sol-border bg-sol-hp-faq-panel px-6 lg:px-10">
          <Accordion type="single" collapsible className="w-full">
            {FAQS.map((item, i) => (
              <AccordionItem key={item.qKey} value={`item-${i}`} className="border-sol-border">
                <AccordionTrigger className="min-h-[70px] rounded-[10px] px-3.5 py-5 text-left text-[16px] font-medium text-sol-ink transition-colors duration-[180ms] hover:bg-[rgba(247,244,255,.50)] hover:no-underline [&[data-state=open]]:rounded-b-none">
                  {t(item.qKey)}
                </AccordionTrigger>
                <AccordionContent className="max-w-[700px] px-3.5 text-[16px] leading-[26px] text-sol-secondary">
                  {t(item.aKey)}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
}
