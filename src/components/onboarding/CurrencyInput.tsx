import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { formatIndianCurrency, parseIndianCurrency, toIndianShorthand } from "@/lib/currency";

/** Free-form Indian currency input — understands "2.5 lakh", "2 crore",
 * "2,50,000", or plain digits, and shows a live normalized preview so
 * the user can see it was understood correctly. Stores the raw rupee
 * number (as a string) via onChange, not the text they typed. */
export function CurrencyInput({
  value,
  onChange,
  placeholder,
}: {
  value?: string;
  onChange: (raw: string | undefined) => void;
  placeholder?: string;
}) {
  const [text, setText] = useState(value ?? "");
  const parsed = text.trim() ? parseIndianCurrency(text) : null;

  return (
    <div>
      <div className="flex h-16 items-center gap-2 rounded-xl border border-border bg-card px-5 shadow-sm transition-colors focus-within:border-accent/50">
        <span className="text-xl font-medium text-muted-foreground">₹</span>
        <input
          type="text"
          inputMode="decimal"
          autoFocus
          value={text}
          placeholder={placeholder ?? "e.g. 25 lakh"}
          onChange={(e) => {
            const next = e.target.value;
            setText(next);
            const num = next.trim() ? parseIndianCurrency(next) : null;
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
            That's{" "}
            <span className="font-semibold text-primary">{formatIndianCurrency(parsed)}</span>
            {toIndianShorthand(parsed) ? ` (${toIndianShorthand(parsed)})` : ""}.
          </motion.p>
        )}
        {text.trim().length > 0 && parsed === null && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mt-3 text-[0.88rem] text-muted-foreground/70"
          >
            Try a number, or something like &ldquo;25 lakh&rdquo; or &ldquo;2 crore&rdquo;.
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
