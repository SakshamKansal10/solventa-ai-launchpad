import { motion } from "motion/react";
import { Target, Telescope } from "lucide-react";

import type { MessageKey } from "@/lib/i18n";
import { useLocale } from "@/lib/i18n/LocaleProvider";

const PANELS: {
  icon: typeof Target;
  eyebrow: MessageKey;
  statement: MessageKey;
  body: MessageKey;
}[] = [
  {
    icon: Target,
    eyebrow: "mv.mission.eyebrow",
    statement: "mv.mission.statement",
    body: "mv.mission.body",
  },
  {
    icon: Telescope,
    eyebrow: "mv.vision.eyebrow",
    statement: "mv.vision.statement",
    body: "mv.vision.body",
  },
];

/** Company / mission content — kept off the homepage, which leads with the
 * product demonstration. */
export function MissionVision() {
  const { t } = useLocale();
  return (
    <section className="mx-auto max-w-[1180px] px-[18px] py-16 sm:px-6 lg:px-10">
      <div className="flex items-center gap-6">
        <Target className="size-5 text-sol-champagne-deep" aria-hidden="true" />
        <h2 className="shrink-0 text-[26px] font-semibold tracking-[-0.01em] text-sol-ink">
          {t("mv.title")}
        </h2>
        <span className="h-px flex-1 bg-linear-to-r from-sol-champagne/40 to-transparent" />
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        {PANELS.map((panel, i) => (
          <motion.div
            key={panel.eyebrow}
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "200px" }}
            transition={{ duration: 0.7, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="relative overflow-hidden rounded-[24px] border border-sol-border bg-sol-surface px-8 py-12 lg:px-10 lg:py-14"
          >
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -right-8 -top-8 font-display text-[9rem] font-bold leading-none text-sol-ivory"
            >
              S
            </span>
            <span className="relative flex size-12 items-center justify-center rounded-full border border-sol-champagne/25 bg-sol-page">
              <panel.icon className="size-5 text-sol-champagne-deep" aria-hidden="true" />
            </span>
            <p className="relative mt-6 text-[14px] font-semibold uppercase tracking-[0.14em] text-sol-champagne-deep">
              {t(panel.eyebrow)}
            </p>
            <p className="relative mt-4 font-display text-[1.5rem] font-medium leading-[1.4] text-sol-ink lg:text-[1.65rem]">
              {t(panel.statement)}
            </p>
            <p className="relative mt-5 text-[1.0625rem] leading-[1.8] text-sol-secondary">
              {t(panel.body)}
            </p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
