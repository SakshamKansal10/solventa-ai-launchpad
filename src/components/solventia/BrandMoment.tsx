/** The homepage's one emotional mission statement — deliberately just
 * this, nothing else. Mission & Vision's fuller panels and the
 * Founder's Story now live on /about, not stacked underneath this. */
export function BrandMoment() {
  return (
    <section
      className="relative flex items-center justify-center overflow-hidden bg-sol-page px-[18px] sm:px-6"
      style={{ minHeight: 560 }}
    >
      <svg
        viewBox="0 0 800 800"
        className="pointer-events-none absolute left-1/2 top-1/2 h-[900px] w-[900px] -translate-x-1/2 -translate-y-1/2 opacity-[0.06]"
        aria-hidden="true"
      >
        <circle
          cx={400}
          cy={400}
          r={360}
          fill="none"
          stroke="var(--sol-violet)"
          strokeWidth={1.5}
        />
        <circle
          cx={400}
          cy={400}
          r={280}
          fill="none"
          stroke="var(--sol-champagne)"
          strokeWidth={1.5}
        />
        <circle
          cx={400}
          cy={400}
          r={200}
          fill="none"
          stroke="var(--sol-violet)"
          strokeWidth={1.5}
        />
      </svg>

      <div className="relative mx-auto max-w-[980px] text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sol-champagne-deep">
          Why Solventia Exists
        </p>
        <p className="mx-auto mt-6 font-display text-[36px] font-medium leading-[1.2] text-sol-ink sm:text-[48px] lg:text-[56px] lg:leading-[1.15]">
          Millions have ideas.{" "}
          <span className="italic text-sol-champagne-deep">Few have the clarity</span> to turn them
          into something real.
        </p>
      </div>
    </section>
  );
}
