import { useId, useState, type ReactNode } from "react";
import { Check, ChevronDown, Plus, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

/** One question inside a screen. A real <fieldset>/<legend> so screen readers
 * announce the question with its options, and the helper is linked with
 * aria-describedby. 16px helper, 20px legend inside a multi-question card. */
export function Question({
  label,
  helper,
  optional,
  children,
  className,
}: {
  label: string;
  helper?: string;
  optional?: boolean;
  children: ReactNode;
  className?: string;
}) {
  const { t } = useLocale();
  const helperId = useId();
  return (
    <fieldset
      className={cn("min-w-0 border-0 p-0", className)}
      aria-describedby={helper ? helperId : undefined}
    >
      <legend className="mb-1 text-[1.1875rem] font-semibold leading-snug text-sol-ink">
        {label}
        {optional && (
          <span className="ml-2 text-[0.9375rem] font-medium text-sol-secondary">
            ({t("common.optional")})
          </span>
        )}
      </legend>
      {helper && (
        <p
          id={helperId}
          className="mb-3 max-w-[60ch] text-[1rem] leading-relaxed text-sol-secondary"
        >
          {helper}
        </p>
      )}
      {!helper && <div className="h-2" />}
      {children}
    </fieldset>
  );
}

/** Page-level wrapper for one consultation screen: the screen's H1 (30–34px
 * serif), an optional 16px helper, then the questions. Single-question
 * screens use the H1 as their question — no repeated label. */
export function ScreenBody({
  title,
  helper,
  optional,
  children,
}: {
  title: string;
  helper?: string;
  optional?: boolean;
  children: ReactNode;
}) {
  const { t } = useLocale();
  const id = useId();
  return (
    <section aria-labelledby={id} className="flex flex-col gap-7">
      <header>
        <h1
          id={id}
          className="font-display text-[clamp(1.875rem,1.55rem+1vw,2.125rem)] font-semibold leading-[1.15] text-sol-ink"
        >
          {title}
        </h1>
        {(helper || optional) && (
          <p className="mt-3 max-w-[60ch] text-[1rem] leading-relaxed text-sol-secondary">
            {optional && (
              <span className="mr-2 font-semibold text-sol-ink">{t("common.optional")}.</span>
            )}
            {helper}
          </p>
        )}
      </header>
      {children}
    </section>
  );
}

/** ≥48px tall, whole row clickable. `selected` = violet (current answer). */
export function OptionButton({
  selected,
  onClick,
  children,
  role,
  disabled,
  className,
  testId,
}: {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
  role: "radio" | "checkbox";
  disabled?: boolean;
  className?: string;
  testId?: string;
}) {
  return (
    <button
      type="button"
      role={role}
      aria-checked={selected}
      disabled={disabled}
      onClick={onClick}
      data-testid={testId}
      className={cn(
        "flex min-h-[3rem] w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left text-[1rem] font-medium leading-snug transition-colors duration-[180ms] ease-[var(--sol-ease)] disabled:opacity-50",
        selected
          ? "border-sol-violet bg-sol-violet-soft text-sol-ink"
          : "border-sol-border bg-sol-surface text-sol-ink hover:border-sol-violet/45",
        className,
      )}
    >
      <span className="min-w-0">{children}</span>
      <span
        aria-hidden="true"
        className={cn(
          "flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors",
          role === "checkbox" && "rounded-md",
          selected
            ? "border-sol-violet bg-sol-violet text-white"
            : "border-sol-border-strong bg-transparent",
        )}
      >
        {selected && <Check className="size-3.5" strokeWidth={3} />}
      </span>
    </button>
  );
}

export interface Opt {
  id: string;
  label: string;
}

export function ChoiceGrid({
  options,
  value,
  onChange,
  columns = 2,
  name,
}: {
  options: Opt[];
  value: string | undefined;
  onChange: (id: string) => void;
  columns?: 1 | 2 | 3;
  name: string;
}) {
  return (
    <div
      role="radiogroup"
      className={cn(
        "grid gap-2.5",
        columns === 1 && "grid-cols-1",
        columns === 2 && "grid-cols-1 sm:grid-cols-2",
        columns === 3 && "grid-cols-2 sm:grid-cols-3",
      )}
    >
      {options.map((o) => (
        <OptionButton
          key={o.id}
          role="radio"
          selected={value === o.id}
          onClick={() => onChange(o.id)}
          testId={`opt-${name}-${o.id}`}
        >
          {o.label}
        </OptionButton>
      ))}
    </div>
  );
}

export function MultiGrid({
  options,
  value,
  onToggle,
  columns = 2,
  name,
}: {
  options: Opt[];
  value: string[] | undefined;
  onToggle: (id: string) => void;
  columns?: 1 | 2 | 3;
  name: string;
}) {
  const list = value ?? [];
  return (
    <div
      role="group"
      className={cn(
        "grid gap-2.5",
        columns === 1 && "grid-cols-1",
        columns === 2 && "grid-cols-1 sm:grid-cols-2",
        columns === 3 && "grid-cols-2 sm:grid-cols-3",
      )}
    >
      {options.map((o) => (
        <OptionButton
          key={o.id}
          role="checkbox"
          selected={list.includes(o.id)}
          onClick={() => onToggle(o.id)}
          testId={`opt-${name}-${o.id}`}
        >
          {o.label}
        </OptionButton>
      ))}
    </div>
  );
}

/** Labelled text input with a 48px+ target and inline error. */
export function TextField({
  id,
  label,
  value,
  onChange,
  placeholder,
  inputMode,
  type = "text",
  error,
  maxLength,
  autoFocus,
  autoComplete,
  hideLabel,
  testId,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  inputMode?: "numeric" | "text" | "decimal";
  type?: "text" | "number";
  error?: string | null;
  maxLength?: number;
  autoFocus?: boolean;
  autoComplete?: string;
  hideLabel?: boolean;
  testId?: string;
}) {
  const errId = `${id}-err`;
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label
        htmlFor={id}
        className={cn("text-[0.9375rem] font-semibold text-sol-ink", hideLabel && "sr-only")}
      >
        {label}
      </label>
      <input
        id={id}
        data-testid={testId}
        type={type}
        inputMode={inputMode}
        value={value}
        maxLength={maxLength}
        autoFocus={autoFocus}
        autoComplete={autoComplete}
        placeholder={placeholder}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errId : undefined}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "h-12 w-full rounded-2xl border bg-sol-surface px-4 text-[1rem] text-sol-ink placeholder:text-sol-secondary/70 transition-colors focus-visible:border-sol-violet focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sol-violet/30",
          error ? "border-sol-warning" : "border-sol-border",
        )}
      />
      {error && (
        <p id={errId} role="alert" className="text-[0.9375rem] text-sol-warning">
          {error}
        </p>
      )}
    </div>
  );
}

/** A searchable single-select (cmdk in a popover) — keyboard and screen-reader
 * friendly, used for countries, states, majors and sectors. */
export function ComboboxField({
  id,
  label,
  options,
  value,
  onChange,
  placeholder,
  searchPlaceholder,
  emptyLabel,
  testId,
}: {
  id: string;
  label: string;
  options: Opt[];
  value: string | undefined;
  onChange: (id: string) => void;
  placeholder: string;
  searchPlaceholder: string;
  emptyLabel: string;
  testId?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.id === value);
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={id} className="text-[0.9375rem] font-semibold text-sol-ink">
        {label}
      </label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            id={id}
            type="button"
            role="combobox"
            aria-expanded={open}
            data-testid={testId}
            className="flex h-12 w-full items-center justify-between gap-2 rounded-2xl border border-sol-border bg-sol-surface px-4 text-left text-[1rem] text-sol-ink transition-colors hover:border-sol-violet/45"
          >
            <span className={cn("truncate", !selected && "text-sol-secondary/80")}>
              {selected?.label ?? placeholder}
            </span>
            <ChevronDown className="size-4 shrink-0 text-sol-secondary" aria-hidden="true" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command>
            <CommandInput placeholder={searchPlaceholder} />
            <CommandList>
              <CommandEmpty>{emptyLabel}</CommandEmpty>
              <CommandGroup>
                {options.map((o) => (
                  <CommandItem
                    key={o.id}
                    value={`${o.label} ${o.id}`}
                    onSelect={() => {
                      onChange(o.id);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn("size-4", value === o.id ? "text-sol-violet" : "opacity-0")}
                      aria-hidden="true"
                    />
                    {o.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

/** Compact segmented control (used for skill level / yes-no). */
export function Segmented({
  options,
  value,
  onChange,
  label,
  invalid,
}: {
  options: Opt[];
  value: string | undefined;
  onChange: (id: string) => void;
  label: string;
  invalid?: boolean;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn(
        "inline-flex flex-wrap gap-1.5 rounded-2xl p-1",
        invalid ? "bg-sol-warning-soft" : "bg-sol-ivory",
      )}
    >
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={value === o.id}
          onClick={() => onChange(o.id)}
          className={cn(
            "min-h-10 rounded-xl px-3.5 text-[0.9375rem] font-semibold transition-colors duration-[180ms]",
            value === o.id ? "bg-sol-violet text-white" : "text-sol-ink hover:bg-sol-violet-soft",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Chip({
  children,
  onRemove,
  removeLabel,
}: {
  children: ReactNode;
  onRemove?: () => void;
  removeLabel?: string;
}) {
  return (
    <span className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-sol-border bg-sol-surface px-3.5 text-[0.9375rem] font-medium text-sol-ink">
      {children}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={removeLabel}
          className="flex size-6 items-center justify-center rounded-full text-sol-secondary hover:bg-sol-ivory hover:text-sol-ink"
        >
          <X className="size-3.5" aria-hidden="true" />
        </button>
      )}
    </span>
  );
}

export { Plus };
