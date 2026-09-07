import { Check, X } from "lucide-react";

/** Exactly three rows each side — compressed from the old five, and with
 * every unsupported claim removed (no "mentor marketplace", "funding
 * signal validation", or "direct connections to mentors & NGOs" — none
 * of that is real, running infrastructure yet). Only what the product
 * actually does. */
const GENERIC = ["One-off advice", "No execution memory", "No proof loop"];
const SOLVENTIA = ["Living founder profile", "Real-world evidence", "Adaptive weekly execution"];

export function WhySolventia() {
  return (
    <section className="bg-sol-page px-[18px] py-[100px] sm:px-6 lg:px-9">
      <div className="mx-auto max-w-[1120px]">
        <h2 className="text-center font-display text-[32px] font-semibold leading-[1.15] text-sol-ink sm:text-[40px]">
          Why not just ask a chatbot?
        </h2>

        <div
          className="relative mt-12 grid overflow-hidden rounded-[28px] border border-sol-border sm:grid-cols-2"
          style={{ minHeight: 360 }}
        >
          <div className="flex flex-col justify-center bg-[oklch(0.9649_0.0045_78.3)] px-8 py-10 lg:px-12">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-sol-muted">
              Generic AI
            </p>
            <ul className="mt-7 flex flex-col gap-5">
              {GENERIC.map((row) => (
                <li key={row} className="flex items-start gap-3">
                  <X className="mt-0.5 size-4 shrink-0 text-sol-muted" aria-hidden="true" />
                  <span className="text-[15px] leading-[24px] text-sol-secondary">{row}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col justify-center bg-sol-navy px-8 py-10 lg:px-12">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-sol-champagne">
              Solventia
            </p>
            <ul className="mt-7 flex flex-col gap-5">
              {SOLVENTIA.map((row) => (
                <li key={row} className="flex items-start gap-3">
                  <Check className="mt-0.5 size-4 shrink-0 text-sol-champagne" aria-hidden="true" />
                  <span className="text-[15px] leading-[24px] text-white/90">{row}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
