import { toast } from "sonner";
import { Check, Compass, GraduationCap, Sparkles } from "lucide-react";
import { PremiumButton } from "./PremiumButton";

/** Only real, supportable claims — the old version advertised a "mentor
 * network" and cross-organization impact tracking that don't exist as
 * running product features. What's actually true: anyone referred in
 * goes through the same real consultation, gets their own profile and
 * roadmap, and partnership inquiries are handled directly (not an
 * automated dashboard). */
const BENEFITS = [
  "Refer the people you support into the same structured, personalized process every founder gets",
  "Each participant gets their own founder profile, ranked directions, and adaptive weekly roadmap",
  "Partnership details — pricing, co-branding, reporting — are worked out directly with our team",
];

const AUDIENCES = [
  "Schools",
  "Colleges",
  "Universities",
  "NGOs",
  "Incubators",
  "Entrepreneurship Programs",
];

export function ForOrganizations() {
  return (
    <section className="mx-auto max-w-[1180px] px-[18px] py-20 sm:px-6 lg:px-10">
      <div className="text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sol-champagne-deep">
          For Organizations
        </p>
        <h1 className="mx-auto mt-4 max-w-[720px] font-display text-[32px] font-semibold leading-[1.2] text-sol-ink sm:text-[40px]">
          Bring the people you support into a real, structured path to execution.
        </h1>
        <p className="mx-auto mt-5 max-w-[560px] text-[17px] leading-[27px] text-sol-secondary">
          Solventia works alongside schools, colleges, NGOs, and incubators — not around them —
          giving the people you support a personalized direction and a roadmap they can actually
          follow.
        </p>
      </div>

      <div className="mt-12 flex flex-wrap items-center justify-center gap-2">
        {AUDIENCES.map((a) => (
          <span
            key={a}
            className="flex items-center gap-1.5 rounded-full border border-sol-border bg-sol-surface px-3.5 py-1.5 text-[0.8rem] font-medium text-sol-secondary"
          >
            <GraduationCap className="size-3.5 text-sol-champagne-deep" aria-hidden="true" />
            {a}
          </span>
        ))}
      </div>

      <div className="relative mt-14 overflow-hidden rounded-[28px] bg-sol-navy px-8 py-14 lg:px-16">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -right-10 -top-10 font-display text-[11rem] font-bold leading-none text-white/[0.05]"
        >
          S
        </span>

        <div className="relative grid gap-12 lg:grid-cols-[1.1fr_1fr] lg:items-center lg:gap-16">
          <div>
            <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-sol-champagne">
              <Compass className="size-4" aria-hidden="true" />
              What Partnering Actually Gets You
            </p>
            <ul className="mt-6 flex flex-col gap-4">
              {BENEFITS.map((b) => (
                <li key={b} className="flex items-start gap-3">
                  <Check className="mt-1 size-4 shrink-0 text-sol-champagne" aria-hidden="true" />
                  <span className="text-[0.92rem] leading-[1.7] text-white/85">{b}</span>
                </li>
              ))}
            </ul>
            <PremiumButton
              type="button"
              tone="solid"
              shape="rounded"
              size="lg"
              className="mt-9 bg-sol-champagne text-sol-ink hover:bg-sol-champagne"
              onClick={() =>
                toast("Partnership inquiries aren't connected yet", {
                  description:
                    "This will route to our partnerships team soon — check back shortly.",
                })
              }
            >
              Partner With Us
            </PremiumButton>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-6 py-7">
            <p className="flex items-center gap-2 text-[0.78rem] font-semibold uppercase tracking-wide text-sol-champagne">
              <Sparkles className="size-4" aria-hidden="true" />
              Honest, Right Now
            </p>
            <p className="mt-3 text-[0.88rem] leading-[1.8] text-white/75">
              There is no automated cohort dashboard or mentor-matching system live yet. What's real
              today is the consultation, the personalized directions, and the adaptive roadmap — the
              same product every individual founder uses. Reach out and we'll figure out the rest
              together.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
