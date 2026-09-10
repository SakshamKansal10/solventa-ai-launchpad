/** A reusable 64px gradient bridge between two section backgrounds —
 * used ONLY at three specific seams (see index.tsx), never everywhere,
 * so consecutive sections never read as one large rectangular block but
 * the page also never fills up with visible decorative separators. */
export function SectionTransition({
  from,
  to,
  line,
}: {
  from: string;
  to: string;
  line?: "violet" | "champagne";
}) {
  return (
    <div
      className="relative h-16 w-full overflow-hidden"
      style={{ background: `linear-gradient(180deg, ${from} 0%, ${to} 100%)` }}
      aria-hidden="true"
    >
      {line && (
        <svg
          viewBox="0 0 1200 64"
          className="absolute inset-0 h-full w-full"
          preserveAspectRatio="none"
        >
          <path
            d="M -20,10 C 300,60 900,-10 1220,40"
            fill="none"
            stroke={line === "violet" ? "rgba(114,87,216,.08)" : "rgba(197,163,106,.09)"}
            strokeWidth={1}
          />
        </svg>
      )}
    </div>
  );
}
