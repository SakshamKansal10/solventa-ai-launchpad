import { motion } from "motion/react";
import { HelpCircle } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const FAQS = [
  {
    q: "What is Solventia?",
    a: "Solventia is an AI-powered companion for young entrepreneurs. It helps you discover business ideas suited to your skills and goals, validate them with real market data, and follow a step-by-step roadmap from idea to launch.",
  },
  {
    q: "Who is Solventia built for?",
    a: "Young dreamers — students, first-time founders, and anyone with an idea and no clear starting point — as well as the mentors and NGOs who support them.",
  },
  {
    q: "How does the AI actually find ideas for me?",
    a: "You share your background, skills, budget, and interests through a guided consultation. Solventia's AI analyzes that full profile — not just a few keywords — to surface opportunities suited to you specifically, instead of a generic list everyone sees.",
  },
  {
    q: "What does “validated” mean?",
    a: "Solventia reasons through each idea against your own constraints — skills, capital, time, and risk appetite — and shows you why it fits before you commit time or money to it. It's a structured matching framework, not a guarantee of market success.",
  },
  {
    q: "What do I actually get at the end of the process?",
    a: "A step-by-step roadmap broken into clear milestones — the concrete actions to take, in order, to move from idea to a launch-ready venture.",
  },
  {
    q: "Can NGOs or mentors get involved?",
    a: "That's the direction we're building toward — letting NGOs and mentor networks bring the young dreamers they support through the same structured process with added guidance. Reach out through the NGO section below and we'll follow up as that opens up.",
  },
  {
    q: "Is my information kept private?",
    a: "The details you share are used to personalize your recommendations and roadmap, not sold to third parties. Full details are available in our privacy policy.",
  },
  {
    q: "Do I need business experience to start?",
    a: "No. Most people who start a Solventia consultation have never run a business before — the process begins by understanding where you are today, not where an “ideal” founder would be, and the questions are designed to work with that starting point rather than against it.",
  },
  {
    q: "Can students use Solventia?",
    a: "Yes. School and college students are one of the core groups Solventia is built for. The consultation adapts its questions for students automatically — no income or investment questions, just your time, skills, and interests.",
  },
  {
    q: "How personalized are the recommendations?",
    a: "Every recommendation is generated from your own answers — your skills, location, budget, risk appetite, and goals — not a generic list. Two people with different profiles get different ideas.",
  },
];

export function FAQ() {
  return (
    <section id="faq" className="mx-auto max-w-[820px] px-6 py-16 lg:px-10 scroll-mt-24">
      <div className="flex items-center justify-center gap-3">
        <HelpCircle className="size-5 text-accent" aria-hidden="true" />
        <h2 className="text-center text-[clamp(1.4rem,2.4vw,1.9rem)] font-semibold tracking-[-0.01em] text-primary">
          Frequently Asked Questions
        </h2>
      </div>
      <p className="mt-4 text-center text-[0.95rem] leading-[1.9] text-muted-foreground">
        Everything you need to know before you get started.
      </p>

      <motion.div
        initial={{ opacity: 0, y: 28 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "200px" }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="mt-10 rounded-3xl border border-border/70 bg-card px-6 shadow-[0_20px_60px_-50px_oklch(0.245_0.055_268_/_0.6)] lg:px-10"
      >
        <Accordion type="single" collapsible className="w-full">
          {FAQS.map((item, i) => (
            <AccordionItem key={item.q} value={`item-${i}`} className="border-border/60">
              <AccordionTrigger className="py-5 text-left text-[0.95rem] font-semibold text-primary hover:no-underline">
                {item.q}
              </AccordionTrigger>
              <AccordionContent className="text-[0.9rem] leading-[1.85] text-muted-foreground">
                {item.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </motion.div>
    </section>
  );
}
