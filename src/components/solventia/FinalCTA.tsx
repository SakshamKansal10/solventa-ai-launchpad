import { useNavigate, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import mark from "@/assets/solventia-mark.png";

/** The one closing dark section — deliberately the only major dark block
 * on the whole page, so it reads as a real ending rather than one of
 * several similar-weight dark surfaces. */
export function FinalCTA() {
  const navigate = useNavigate();

  return (
    <section
      className="relative flex items-center justify-center overflow-hidden bg-sol-navy px-[18px] text-center sm:px-6"
      style={{ minHeight: 440 }}
    >
      <div
        className="pointer-events-none absolute left-1/2 top-[42%] h-[240px] w-[420px] -translate-x-1/2 -translate-y-1/2"
        style={{
          background:
            "radial-gradient(ellipse 420px 240px at 50% 42%, rgba(114,87,216,.16), transparent 72%)",
        }}
        aria-hidden="true"
      />
      <svg
        viewBox="0 0 300 300"
        className="pointer-events-none absolute left-1/2 top-[120px] h-[220px] w-[220px] -translate-x-1/2 -translate-y-1/2 opacity-[0.18]"
        aria-hidden="true"
      >
        <circle
          cx={150}
          cy={150}
          r={120}
          fill="none"
          stroke="var(--sol-champagne)"
          strokeWidth={1}
          strokeDasharray="220 80"
        />
      </svg>

      <div className="relative mx-auto flex max-w-[560px] flex-col items-center py-16">
        <img src={mark} alt="" width={298} height={436} className="h-10 w-auto" />
        <h2 className="mt-6 font-display text-[36px] font-semibold leading-[1.1] text-white sm:text-[48px]">
          Find the direction
          <br />
          worth building.
        </h2>
        <p className="mt-4 text-[16px] text-white/70">
          Your Founder Genome starts with a few structured questions.
        </p>
        <button
          type="button"
          onClick={() => navigate({ to: "/consultation" })}
          className="group mt-8 inline-flex h-14 items-center gap-2.5 rounded-2xl bg-sol-champagne px-7 text-[15px] font-semibold text-sol-ink transition-all duration-200 hover:-translate-y-0.5 hover:bg-[oklch(0.7809_0.0814_81.8)] hover:shadow-[0_10px_26px_rgba(197,163,106,.20)]"
        >
          Build My Founder Profile
          <ArrowRight
            className="size-4 transition-transform duration-200 group-hover:translate-x-[3px]"
            aria-hidden="true"
          />
        </button>

        <p className="mt-6 text-[13px] text-white/55">
          Building a founder program?{" "}
          <Link to="/for-organizations" className="font-medium text-white/80 hover:text-white">
            Solventia for Organizations →
          </Link>
        </p>
      </div>
    </section>
  );
}
