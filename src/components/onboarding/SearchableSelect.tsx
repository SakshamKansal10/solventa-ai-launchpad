import { useState } from "react";
import { Check, ChevronDown } from "lucide-react";
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

/** Single-value searchable combobox — premium alternative to a native
 * <select> for long option lists (countries, states). Closes itself and
 * hands back the chosen value on select. */
export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Search…",
}: {
  options: string[];
  value?: string;
  onChange: (next: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex h-14 w-full items-center justify-between rounded-xl border px-5 text-left text-[1.05rem] shadow-sm transition-colors",
            value
              ? "border-accent/50 bg-card text-foreground"
              : "border-border bg-card text-muted-foreground",
            "hover:border-accent/40",
          )}
        >
          {value ?? placeholder}
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder={placeholder} value={query} onValueChange={setQuery} />
          <CommandList>
            <CommandEmpty>No matches.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option}
                  value={option}
                  onSelect={() => {
                    onChange(option);
                    setQuery("");
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn("size-4", value === option ? "opacity-100" : "opacity-0")}
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
  );
}
