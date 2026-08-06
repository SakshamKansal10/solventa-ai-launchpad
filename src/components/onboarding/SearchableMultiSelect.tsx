import { useState } from "react";
import { Check, ChevronDown, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

export function SearchableMultiSelect({
  options,
  value,
  onChange,
  placeholder = "Search…",
}: {
  options: string[];
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  function toggle(item: string) {
    onChange(value.includes(item) ? value.filter((v) => v !== item) : [...value, item]);
  }

  function addCustom() {
    const trimmed = query.trim();
    if (!trimmed) return;
    if (!value.includes(trimmed)) onChange([...value, trimmed]);
    setQuery("");
  }

  const showAddCustom =
    query.trim().length > 0 &&
    !options.some((o) => o.toLowerCase() === query.trim().toLowerCase()) &&
    !value.some((v) => v.toLowerCase() === query.trim().toLowerCase());

  return (
    <div className="flex flex-col gap-3">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex h-12 w-full items-center justify-between rounded-xl border border-border bg-card px-4 text-left text-[0.95rem] text-muted-foreground transition-colors hover:border-accent/40"
          >
            {value.length > 0 ? `${value.length} selected` : placeholder}
            <ChevronDown className="size-4" aria-hidden="true" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command>
            <CommandInput placeholder={placeholder} value={query} onValueChange={setQuery} />
            <CommandList>
              <CommandEmpty>
                {showAddCustom ? (
                  <button
                    type="button"
                    onClick={addCustom}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-accent hover:bg-accent/10"
                  >
                    <Plus className="size-4" aria-hidden="true" />
                    Add &ldquo;{query.trim()}&rdquo;
                  </button>
                ) : (
                  "No matches."
                )}
              </CommandEmpty>
              <CommandGroup>
                {options.map((option) => (
                  <CommandItem key={option} value={option} onSelect={() => toggle(option)}>
                    <Check
                      className={cn("size-4", value.includes(option) ? "opacity-100" : "opacity-0")}
                      aria-hidden="true"
                    />
                    {option}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((item) => (
            <span
              key={item}
              className="flex items-center gap-1.5 rounded-full bg-accent/15 py-1.5 pl-3 pr-2 text-[0.82rem] font-medium text-primary"
            >
              {item}
              <button
                type="button"
                onClick={() => toggle(item)}
                aria-label={`Remove ${item}`}
                className="flex size-4 items-center justify-center rounded-full text-primary/60 hover:bg-accent/30 hover:text-primary"
              >
                <X className="size-3" aria-hidden="true" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
