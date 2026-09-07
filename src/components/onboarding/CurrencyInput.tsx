import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { formatMoney, parseCurrencyAmount } from "@/lib/country-currency";

/** Free-form currency input — understands "2.5k", "1.2m", plain digits,
 * and (for INR specifically) Indian lakh/crore shorthand, then shows a
 * live formatted preview in the founder's own currency so they can see
 * it was understood correctly. Stores the raw numeric amount (as a
 * string) via onChange, not the text they typed. */
export function CurrencyInput({
  value,
  onChange,
  placeholder,
  currencyCode = "INR",
  currencySymbol = "₹",
}: {
  value?: string;
  onChange: (raw: string | undefined) => void;
  placeholder?: string;
  currencyCode?: string;
  currencySymbol?: string;
}) {
  const [text, setText] = useState(value ?? "");
  const parsed = text.trim() ? parseCurrencyAmount(text, currencyCode) : null;
  const example = currencyCode === "INR" ? "e.g. 25 lakh" : "e.g. 25,000";

  return (
    <div>
      <div className="flex h-16 items-center gap-2 rounded-xl border border-border bg-card px-5 shadow-sm transition-colors focus-within:border-accent/50">
        <span className="text-xl font-medium text-muted-foreground">{currencySymbol}</span>
        <input
          type="text"
          inputMode="decimal"
          autoFocus
          value={text}
          placeholder={placeholder ?? example}
          onChange={(e) => {
            const next = e.target.value;
            setText(next);
            const num = next.trim() ? parseCurrencyAmount(next, currencyCode) : null;
            onChange(num !== null ? String(num) : undefined);
          }}
          className="h-full w-full bg-transparent text-lg text-foreground outline-none placeholder:text-muted-foreground/60"
        />
      </div>
      <AnimatePresence>
        {parsed !== null && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-3 text-[0.88rem] text-muted-foreground"
          >
            That&rsquo;s{" "}
            <span className="font-semibold text-primary">{formatMoney(parsed, currencyCode)}</span>.
          </motion.p>
        )}
        {text.trim().length > 0 && parsed === null && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mt-3 text-[0.88rem] text-muted-foreground/70"
          >
            Try a number{currencyCode === "INR" ? ', or something like "25 lakh"' : ' like "25000"'}
            .
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
