import { useNavigate, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import mark from "@/assets/solventia-mark.png";
import { scrollToSection } from "@/hooks/use-active-section";
import { useLocale } from "@/lib/i18n/LocaleProvider";

/** The one closing dark section — deliberately the only major dark block
 * on the whole page, so it reads as a real ending rather than one of
 * several similar-weight dark surfaces. */
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
        <h2 className="mt-6 font-display text-[36px] font-semibold leading-[1.1] text-white sm:text-[48px]">
          {t("finalCta.headline")}
        </h2>
        <p className="mt-4 max-w-[46ch] text-[17px] leading-relaxed text-white/75">
          {t("finalCta.subhead")}
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => navigate({ to: "/consultation" })}
            className="group inline-flex h-14 items-center gap-2.5 rounded-2xl bg-sol-champagne px-7 text-[16px] font-semibold text-sol-ink transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_26px_rgba(197,163,106,.20)]"
          >
            {t("finalCta.cta")}
            <ArrowRight
              className="size-4 transition-transform duration-200 group-hover:translate-x-[3px]"
              aria-hidden="true"
            />
          </button>
          <button
            type="button"
            onClick={() => scrollToSection("how-it-works")}
            className="inline-flex h-14 items-center rounded-2xl border border-white/30 px-7 text-[16px] font-semibold text-white transition-colors hover:border-white/60"
          >
            {t("finalCta.secondary")}
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
