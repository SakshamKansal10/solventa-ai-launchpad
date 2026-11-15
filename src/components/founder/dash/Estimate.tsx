import { Tag } from "@/components/founder/dash/ui";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

/** The warning token, lifted to read on navy. */
const AMBER_ON_NAVY = "color-mix(in oklab, var(--sol-warning) 45%, white)";

/**
 * The amber Estimate tag and its line (redesign-v2 part 4, feature 6). Every number the AI gives
 * about the market or income that has no source shows this, wherever it appears.
 */
export function EstimateTag({
  onNavy = false,
  className,
}: {
  onNavy?: boolean;
  className?: string;
}) {
  const { t } = useLocale();
  return (
    <span
      className={cn("inline-flex flex-wrap items-center gap-x-3 gap-y-1", className)}
      data-testid="estimate-tag"
    >
      {onNavy ? (
        <span
          className="inline-flex min-h-[34px] items-center rounded-full border px-3.5 text-[15px] font-semibold"
          style={{ color: AMBER_ON_NAVY, borderColor: AMBER_ON_NAVY }}
        >
          {t("v2.est.tag")}
        </span>
      ) : (
        <Tag tone="warning">{t("v2.est.tag")}</Tag>
      )}
      <span className={cn("text-[17px]", onNavy ? "text-white/80" : "text-sol-secondary")}>
        {t("v2.est.line")}
      </span>
    </span>
  );
}
