import { useState } from "react";

import { formatMoney, parseCurrencyAmount } from "@/lib/country-currency";
import { useLocale } from "@/lib/i18n/LocaleProvider";

/** Free-form amount input (understands "2.5k", "1.2m", plain digits, and for
 * INR "25 lakh" / "2 crore"). Shows what it understood, and stores the raw
 * numeric amount as a string — never the text that was typed. */
export function CurrencyField({
  value,
  onChange,
  placeholder,
  currencyCode,
  currencySymbol,
}: {
  value?: string;
  onChange: (raw: string | undefined) => void;
  placeholder?: string;
  currencyCode: string;
  currencySymbol: string;
}) {
  const { t } = useLocale();
  const [text, setText] = useState(value ?? "");
  const parsed = text.trim() ? parseCurrencyAmount(text, currencyCode) : null;

  return (
    <div>
      <div className="flex h-12 items-center gap-2 rounded-2xl border border-sol-border bg-sol-surface px-4 focus-within:border-sol-violet focus-within:ring-2 focus-within:ring-sol-violet/30">
        <span className="text-[1.125rem] font-medium text-sol-secondary">{currencySymbol}</span>
        <input
          type="text"
          inputMode="decimal"
          value={text}
          aria-label={placeholder}
          placeholder={placeholder}
          onChange={(e) => {
            const next = e.target.value;
            setText(next);
            const num = next.trim() ? parseCurrencyAmount(next, currencyCode) : null;
            onChange(num !== null ? String(num) : undefined);
          }}
          className="h-full w-full bg-transparent text-[1rem] text-sol-ink outline-none placeholder:text-sol-secondary/70"
        />
      </div>
      {parsed !== null && (
        <p className="mt-2 text-[0.9375rem] text-sol-secondary" aria-live="polite">
          {t("q.capitalPrecise.understood", { amount: formatMoney(parsed, currencyCode) })}
        </p>
      )}
      {text.trim().length > 0 && parsed === null && (
        <p className="mt-2 text-[0.9375rem] text-sol-warning" role="alert">
          {t("q.capitalPrecise.invalid")}
        </p>
      )}
    </div>
  );
}
