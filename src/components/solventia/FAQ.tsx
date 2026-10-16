import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import type { MessageKey } from "@/lib/i18n";
import { useLocale } from "@/lib/i18n/LocaleProvider";

/** Exactly five — the remaining questions from the old ten-item list move to
 * /about rather than disappearing outright. */
const FAQS: { q: MessageKey; a: MessageKey }[] = [
  { q: "faq.q1", a: "faq.a1" },
  { q: "faq.q2", a: "faq.a2" },
  { q: "faq.q3", a: "faq.a3" },
  { q: "faq.q4", a: "faq.a4" },
  { q: "faq.q5", a: "faq.a5" },
];

export function FAQ() {
  const { t } = useLocale();
  return (
    <section
      id="faq"
      className="scroll-mt-[76px] bg-sol-hp-pearl px-[18px] pb-16 pt-[96px] sm:px-6"
    >
      <div className="mx-auto max-w-[840px]">
        <h2 className="text-center font-display text-[32px] font-semibold leading-[1.15] text-sol-ink sm:text-[36px]">
          {t("faq.title")}
        </h2>

        <div className="mt-10 rounded-[24px] border border-sol-border bg-sol-hp-faq-panel px-6 lg:px-10">
          <Accordion type="single" collapsible className="w-full">
            {FAQS.map((item, i) => (
              <AccordionItem key={item.q} value={`item-${i}`} className="border-sol-border">
                <AccordionTrigger className="min-h-[70px] rounded-[10px] px-3.5 py-5 text-left text-[17px] font-medium text-sol-ink transition-colors duration-[180ms] hover:bg-[rgba(247,244,255,.50)] hover:no-underline [&[data-state=open]]:rounded-b-none">
                  {t(item.q)}
                </AccordionTrigger>
                <AccordionContent className="max-w-[700px] px-3.5 text-[17px] leading-[28px] text-sol-secondary">
                  {t(item.a)}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
}
