import { Languages } from "lucide-react";
import { useLocale } from "@/lib/i18n/LocaleProvider";

/** A real, working EN/HI toggle — not decoration. Persists to
 * localStorage (see LocaleProvider) so the choice survives a reload. */
export function LanguageSwitcher({ className }: { className?: string }) {
  const { locale, setLocale, t } = useLocale();
  return (
    <button
      type="button"
      onClick={() => setLocale(locale === "en" ? "hi" : "en")}
      aria-label="Switch language"
      className={
        className ??
        "flex items-center gap-1.5 text-[0.85rem] font-medium text-sol-secondary transition-colors hover:text-sol-ink"
      }
    >
      <Languages className="size-4" aria-hidden="true" />
      {t("language.switch")}
    </button>
  );
}
