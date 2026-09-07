import { createFileRoute, Link } from "@tanstack/react-router";
import { Header } from "@/components/solventia/Header";
import { Footer } from "@/components/solventia/Footer";
import { MissionVision } from "@/components/solventia/MissionVision";
import { FoundersStory } from "@/components/solventia/FoundersStory";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export const Route = createFileRoute("/about")({
  component: AboutPage,
  head: () => ({
    meta: [
      { title: "About — Solventia" },
      {
        name: "description",
        content: "Why Solventia exists, who built it, and how it works.",
      },
    ],
  }),
});

/** The remaining questions from the homepage's original ten-item FAQ —
 * moved here rather than deleted, per "relocate, don't delete content
 * that has value." */
const MORE_FAQS = [
  {
    q: "Who is Solventia built for?",
    a: "Anyone with real ambition and no clear starting point — students, first-time founders, and career changers — as well as the organizations that support them.",
  },
  {
    q: "How does the AI actually find ideas for me?",
    a: "You share your background, skills, budget, and interests through a guided consultation. Solventia analyzes that full profile — not just a few keywords — to surface directions suited to you specifically.",
  },
  {
    q: "What does “validated” mean?",
    a: "Solventia reasons through each idea against your own constraints — skills, capital, time, and risk appetite — and shows you why it fits before you commit time or money to it. It's a structured matching framework, not a guarantee of market success.",
  },
  {
    q: "Can NGOs or mentors get involved?",
    a: (
      <>
        Yes — see{" "}
        <Link to="/for-organizations" className="font-medium text-sol-violet-deep hover:underline">
          Solventia for Organizations
        </Link>{" "}
        for how schools, NGOs, and incubator programs can bring the people they support through the
        same process.
      </>
    ),
  },
  {
    q: "Can students use Solventia?",
    a: "Yes. Students are one of the core groups Solventia is built for — the consultation adapts its questions automatically, with no income or investment questions for that path.",
  },
];

function AboutPage() {
  return (
    <div className="min-h-screen bg-sol-page">
      <Header />
      <main className="pt-[68px] md:pt-[84px]">
        <div className="mx-auto max-w-[1180px] px-[18px] pt-16 text-center sm:px-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sol-champagne-deep">
            About Solventia
          </p>
          <h1 className="mx-auto mt-4 max-w-[720px] font-display text-[32px] font-semibold leading-[1.2] text-sol-ink sm:text-[40px]">
            Why we built this, and who it&rsquo;s for.
          </h1>
        </div>

        <MissionVision />
        <FoundersStory />

        <section className="mx-auto max-w-[840px] px-[18px] py-16 sm:px-6">
          <h2 className="text-center font-display text-[28px] font-semibold text-sol-ink">
            More Questions
          </h2>
          <div className="mt-8 rounded-[24px] border border-sol-border bg-sol-surface px-6 lg:px-10">
            <Accordion type="single" collapsible className="w-full">
              {MORE_FAQS.map((item, i) => (
                <AccordionItem key={item.q} value={`item-${i}`} className="border-sol-border">
                  <AccordionTrigger className="min-h-[68px] py-5 text-left text-[16px] font-medium text-sol-ink hover:no-underline">
                    {item.q}
                  </AccordionTrigger>
                  <AccordionContent className="max-w-[700px] text-[16px] leading-[26px] text-sol-secondary">
                    {item.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
