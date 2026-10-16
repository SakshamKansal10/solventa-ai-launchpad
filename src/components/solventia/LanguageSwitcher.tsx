import { Languages } from "lucide-react";
import { useLocale } from "@/lib/i18n/LocaleProvider";

/** EN ⇄ हिन्दी toggle. Shows the language you would switch TO, written in
 * that language, so it is always readable to the person who needs it. The
 * choice persists (cookie for SSR, localStorage fallback, and the profile
 * once signed in) — see LocaleProvider. */
export function LanguageSwitcher({
  className,
  compact = false,
}: {
  className?: string;
  /** Icon only on phones (the label returns from the `sm` breakpoint up). */
  compact?: boolean;
}) {
  const { locale, setLocale, t } = useLocale();
  return (
    <button
      type="button"
      onClick={() => setLocale(locale === "en" ? "hi" : "en")}
      aria-label={t("lang.switchTo")}
      data-testid="language-switch"
      className={
        className ??
        "inline-flex min-h-10 items-center gap-1.5 rounded-full px-2.5 text-[0.9375rem] font-medium text-sol-secondary transition-colors hover:text-sol-ink"
      }
    >
      <Languages className="size-4" aria-hidden="true" />
      <span className={compact ? "hidden sm:inline" : undefined}>
        {locale === "en" ? t("lang.switchToHindi") : t("lang.switchToEnglish")}
      </span>
    </button>
  );
}
