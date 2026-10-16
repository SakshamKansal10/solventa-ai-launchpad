import { motion } from "motion/react";
import { User } from "lucide-react";

import { useLocale } from "@/lib/i18n/LocaleProvider";

export function FoundersStory() {
  const { t } = useLocale();
  return (
    <section className="mx-auto max-w-[1180px] px-[18px] py-16 sm:px-6 lg:px-10">
      <div className="flex items-center gap-6">
        <User className="size-5 text-sol-champagne-deep" aria-hidden="true" />
        <h2 className="shrink-0 text-[26px] font-semibold tracking-[-0.01em] text-sol-ink">
          {t("story.title")}
        </h2>
        <span className="h-px flex-1 bg-linear-to-r from-sol-champagne/40 to-transparent" />
      </div>

      <div className="mt-10 flex flex-col gap-10 lg:flex-row lg:items-center lg:gap-16">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "200px" }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="flex shrink-0 flex-col items-center text-center lg:w-56"
        >
          <span className="flex size-28 items-center justify-center rounded-full border-2 border-sol-champagne/30 bg-sol-ivory text-sol-secondary">
            <User className="size-10 stroke-[1.4]" aria-hidden="true" />
          </span>
          <p className="mt-4 text-[1.0625rem] font-semibold text-sol-ink">{t("story.name")}</p>
          <p className="mt-1 text-[0.9375rem] text-sol-secondary">{t("story.role")}</p>
        </motion.div>

        <motion.p
          initial={{ opacity: 0, x: 16 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "200px" }}
          transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-[56ch] text-[1.0625rem] leading-[1.85] text-sol-secondary"
        >
          {t("story.body")}
        </motion.p>
      </div>
    </section>
  );
}
