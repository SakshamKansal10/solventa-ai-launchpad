import { Check, Compass, GraduationCap, Sparkles } from "lucide-react";

import { CONTACT_EMAIL } from "@/lib/contact";
import type { MessageKey } from "@/lib/i18n";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { PageBreadcrumb } from "./PageBreadcrumb";
import { PremiumButton } from "./PremiumButton";

/** Only real, supportable claims — no "mentor network" or cross-organization
 * impact tracking, which are not running product features. What is true:
 * anyone referred in goes through the same real consultation, gets their own
 * profile and roadmap, and partnership enquiries are handled directly. */
const BENEFITS: MessageKey[] = ["orgs.benefit1", "orgs.benefit2", "orgs.benefit3"];
const AUDIENCES: MessageKey[] = [
  "orgs.aud.schools",
  "orgs.aud.colleges",
  "orgs.aud.universities",
  "orgs.aud.ngos",
  "orgs.aud.incubators",
  "orgs.aud.programs",
];

export function ForOrganizations() {
  const { t } = useLocale();
  return (
    <section className="relative mx-auto max-w-[1180px] px-[18px] py-20 sm:px-6 lg:px-10">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 mx-auto h-[320px] max-w-[1180px]"
        style={{
          background:
            "radial-gradient(ellipse 500px 320px at 50% 25%, rgba(114,87,216,.08), transparent 70%)",
        }}
        aria-hidden="true"
      />
      <div className="relative text-left">
        <PageBreadcrumb page={t("orgs.crumb")} />
      </div>
      <div className="relative text-center">
        <p className="text-[14px] font-semibold uppercase tracking-[0.14em] text-sol-champagne-deep">
          {t("orgs.eyebrow")}
        </p>
        <h1 className="mx-auto mt-4 max-w-[760px] font-display text-[30px] font-semibold leading-[1.25] text-sol-ink sm:text-[40px]">
          {t("orgs.h1")}
        </h1>
        <p className="mx-auto mt-5 max-w-[600px] text-[17px] leading-[28px] text-sol-secondary">
          {t("orgs.sub")}
        </p>
      </div>

      <ul className="relative mt-12 flex flex-wrap items-center justify-center gap-2.5">
        {AUDIENCES.map((a) => (
          <li
            key={a}
            className="flex items-center gap-2 rounded-full border border-sol-border bg-sol-surface px-4 py-2 text-[0.9375rem] font-medium text-sol-secondary"
          >
            <GraduationCap className="size-4 text-sol-champagne-deep" aria-hidden="true" />
            {t(a)}
          </li>
        ))}
      </ul>

      <div
        className="relative mt-14 overflow-hidden rounded-[28px] bg-sol-navy px-8 py-14 lg:px-16"
        style={{
          backgroundImage:
            "radial-gradient(circle at 90% 15%, rgba(114,87,216,.20), transparent 48%)",
        }}
      >
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -right-10 -top-10 font-display text-[11rem] font-bold leading-none text-white/[0.05]"
        >
          S
        </span>

        <div className="relative grid gap-12 lg:grid-cols-[1.1fr_1fr] lg:items-center lg:gap-16">
          <div>
            <p className="flex items-center gap-2 text-[14px] font-semibold uppercase tracking-[0.12em] text-sol-champagne">
              <Compass className="size-4" aria-hidden="true" />
              {t("orgs.benefitsTitle")}
            </p>
            <ul className="mt-6 flex flex-col gap-4">
              {BENEFITS.map((b) => (
                <li key={b} className="flex items-start gap-3">
                  <Check className="mt-1.5 size-4 shrink-0 text-sol-champagne" aria-hidden="true" />
                  <span className="text-[1.0625rem] leading-[1.7] text-white/90">{t(b)}</span>
                </li>
              ))}
            </ul>
            <PremiumButton
              href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("Solventia partnership")}`}
              tone="solid"
              shape="rounded"
              size="lg"
              className="mt-9 bg-sol-champagne text-sol-ink hover:bg-sol-champagne"
            >
              {t("orgs.cta")}
            </PremiumButton>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-6 py-7">
            <p className="flex items-center gap-2 text-[14px] font-semibold uppercase tracking-wide text-sol-champagne">
              <Sparkles className="size-4" aria-hidden="true" />
              {t("orgs.honestTitle")}
            </p>
            <p className="mt-3 text-[1rem] leading-[1.8] text-white/80">{t("orgs.honestBody")}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
