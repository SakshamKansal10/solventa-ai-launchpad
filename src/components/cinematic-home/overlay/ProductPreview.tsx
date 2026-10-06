import { useId, useRef, useState, type KeyboardEvent } from "react";

import { FitSignals } from "@/components/founder/dashboard/fit-visual";
import { StepPath, type PathStep } from "@/components/founder/dashboard/graphics";
import type { FitRow } from "@/lib/fit/matrix";

/**
 * ILLUSTRATIVE, READ-ONLY preview of the Solventia workspace — built from the
 * product's own presentational components (Founder Fit signals, the step path)
 * with sample content for the demonstration founder. It is real, semantic,
 * keyboard-operable HTML; it does not read or write any account data.
 */
const reason = { code: "illustrative", params: {} };
const FIT: FitRow[] = [
  { key: "capability", status: "strong", reason },
  { key: "resources", status: "strong", reason },
  { key: "access", status: "moderate", reason },
  { key: "ambition", status: "moderate", reason },
];

const STEPS: PathStep[] = [
  { id: "speak", label: "Speak to potential customers", state: "done" },
  { id: "problem", label: "Test the problem", state: "done" },
  { id: "pay", label: "Test willingness to pay", state: "current", note: "Revised after evidence" },
  { id: "prototype", label: "Create first prototype", state: "future" },
];

const TABS = [
  { id: "direction", label: "Direction" },
  { id: "week", label: "This week" },
  { id: "evidence", label: "Evidence" },
] as const;

export function ProductPreview() {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("direction");
  const base = useId();
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const onKey = (e: KeyboardEvent, i: number) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const next = (i + (e.key === "ArrowRight" ? 1 : TABS.length - 1)) % TABS.length;
    setTab(TABS[next].id);
    tabRefs.current[next]?.focus();
  };

  return (
    <section
      aria-label="Illustrative Solventia workspace preview"
      data-testid="product-preview"
      className="flex h-full w-full flex-col overflow-hidden rounded-[22px] border border-[#d9cfbe] bg-[#F7F3EC] text-sol-ink shadow-[0_18px_48px_rgba(0,0,0,0.35)]"
    >
      <header className="flex flex-col-reverse items-start gap-2 border-b border-[#e4dccd] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-7">
        <div>
          <p className="font-mono text-[10.5px] uppercase tracking-[0.3em] text-sol-champagne-deep">
            Command Center
          </p>
          <h3 className="mt-1 font-display text-[1.35rem] leading-tight text-sol-ink sm:text-[1.65rem]">
            Direction 02 · a digital service for local businesses
          </h3>
        </div>
        <p className="shrink-0 rounded-full border border-[#d9cfbe] px-3 py-1 text-[11.5px] font-semibold text-sol-secondary">
          Illustrative preview · sample founder
        </p>
      </header>
      <div role="tablist" aria-label="Workspace views" className="flex gap-1 px-6 pt-3">
        {TABS.map((t, i) => (
          <button
            key={t.id}
            ref={(el) => {
              tabRefs.current[i] = el;
            }}
            role="tab"
            type="button"
            id={`${base}-tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls={`${base}-panel-${t.id}`}
            tabIndex={tab === t.id ? 0 : -1}
            onClick={() => setTab(t.id)}
            onKeyDown={(e) => onKey(e, i)}
            className={`rounded-full px-4 py-2 text-[0.9375rem] font-semibold transition-colors ${
              tab === t.id
                ? "bg-sol-navy text-white"
                : "text-sol-secondary hover:bg-[#ece5d8] hover:text-sol-ink"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-auto px-5 py-5 sm:px-7">
        {tab === "direction" && (
          <div
            role="tabpanel"
            id={`${base}-panel-direction`}
            aria-labelledby={`${base}-tab-direction`}
            className="grid gap-6 sm:grid-cols-[1.1fr_1fr]"
          >
            <div>
              <h4 className="text-[0.95rem] font-semibold text-sol-ink">Why it fits you</h4>
              <ul className="mt-3 space-y-2 text-[0.95rem] text-sol-secondary">
                <li>Starts within ₹50,000</li>
                <li>Uses your digital development skills</li>
                <li>Fits 12 hours a week</li>
              </ul>
              <p className="mt-5 text-[0.9rem] text-sol-secondary">
                Chosen from 360 possibilities against your context — then tested, not assumed.
              </p>
            </div>
            <div>
              <h4 className="mb-3 text-[0.95rem] font-semibold text-sol-ink">Founder fit</h4>
              <FitSignals rows={FIT} />
            </div>
          </div>
        )}
        {tab === "week" && (
          <div role="tabpanel" id={`${base}-panel-week`} aria-labelledby={`${base}-tab-week`}>
            <div className="rounded-2xl bg-workspace px-6 py-5 text-workspace-foreground">
              <p className="font-mono text-[10.5px] uppercase tracking-[0.3em] text-[#d9c39b]">
                Validate · this week
              </p>
              <div className="mt-4">
                <StepPath steps={STEPS} ariaLabel="Validation path" />
              </div>
            </div>
            <p className="mt-4 text-[0.95rem] text-sol-secondary">
              Today’s move: ask three clinic owners what a lighter starter version would need to do.
            </p>
          </div>
        )}
        {tab === "evidence" && (
          <div
            role="tabpanel"
            id={`${base}-panel-evidence`}
            aria-labelledby={`${base}-tab-evidence`}
            className="grid gap-5 sm:grid-cols-2"
          >
            <div className="rounded-2xl border border-[#e4dccd] bg-white/60 p-5">
              <p className="text-[0.8rem] font-semibold uppercase tracking-[0.18em] text-sol-secondary">
                Assumption
              </p>
              <p className="mt-2 text-[1rem] font-semibold text-sol-ink">
                Owners will pay for the full version
              </p>
              <p className="mt-3 inline-flex rounded-full bg-sol-warning-soft px-3 py-1 text-[0.8rem] font-semibold text-[#8a4a30]">
                Contradicted
              </p>
            </div>
            <div className="rounded-2xl border border-[#e4dccd] bg-white/60 p-5">
              <p className="text-[0.8rem] font-semibold uppercase tracking-[0.18em] text-sol-secondary">
                Evidence
              </p>
              <blockquote className="mt-2 font-display text-[1.3rem] italic leading-snug text-sol-ink">
                “I wouldn’t pay for this version.”
              </blockquote>
              <p className="mt-3 text-[0.9rem] text-sol-secondary">
                Path updated: test a lighter starter offer first.
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
