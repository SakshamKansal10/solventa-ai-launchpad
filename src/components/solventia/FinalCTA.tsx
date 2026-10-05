import { useNavigate, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import mark from "@/assets/solventia-mark.png";
import { useLocale } from "@/lib/i18n/LocaleProvider";

/** The closing dark section: one headline, one action. (The Proof engine is the
 * page's other dark moment; everything between them stays light.) */
export function FinalCTA() {
  const navigate = useNavigate();
  const { t } = useLocale();

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
        <h2 className="mt-6 font-display text-[36px] font-semibold leading-[1.1] text-white sm:text-[52px]">
          {t("finalCta.headline")}
        </h2>
        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          {/* One action to end on — the same ivory-champagne surface as the hero's. */}
          <button
            type="button"
            onClick={() => navigate({ to: "/consultation" })}
            className="group relative inline-flex h-[60px] items-center gap-3 overflow-hidden rounded-2xl px-[34px] text-[16.5px] font-bold text-sol-navy shadow-[0_16px_40px_rgba(0,0,0,.38),inset_0_1px_0_rgba(255,255,255,.9)] ring-1 ring-white/50 transition-[transform,box-shadow] duration-150 ease-[cubic-bezier(.22,1,.36,1)] hover:-translate-y-0.5 hover:shadow-[0_20px_52px_rgba(220,192,139,.42),inset_0_1px_0_rgba(255,255,255,.9)] active:translate-y-0 active:scale-[0.985] active:duration-100"
            style={{
              background: "linear-gradient(135deg, #FFFDFB 0%, #F2ECE2 55%, #DCC08B 100%)",
            }}
          >
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 -left-2/3 w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-white/70 to-transparent transition-[left] duration-700 ease-[cubic-bezier(.22,1,.36,1)] group-hover:left-[130%]"
            />
            <span className="relative">{t("finalCta.cta")}</span>
            <span className="sol-nudge relative flex" aria-hidden="true">
              <ArrowRight className="size-[19px] text-sol-violet-deep transition-transform duration-150 group-hover:translate-x-[5px]" />
            </span>
          </button>
        </div>

        <p className="mt-6 text-[14px] text-white/70">
          {t("finalCta.orgPrompt")}{" "}
          <Link to="/for-organizations" className="font-medium text-white/80 hover:text-white">
            {t("finalCta.orgLink")}
          </Link>
        </p>
      </div>
    </section>
  );
}
