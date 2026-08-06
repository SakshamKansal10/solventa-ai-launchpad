import { useState } from "react";
import { ChevronDown, Plus, X } from "lucide-react";
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
import {
  SKILL_LEVELS,
  SKILL_LIBRARY,
  type SkillEntry,
  type SkillLevel,
} from "@/lib/onboarding-types";

export function SkillPicker({
  value,
  onChange,
}: {
  value: SkillEntry[];
  onChange: (next: SkillEntry[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selectedNames = new Set(value.map((s) => s.name));
  const available = SKILL_LIBRARY.filter((s) => !selectedNames.has(s));

  function addSkill(name: string) {
    if (!name.trim() || selectedNames.has(name)) return;
    onChange([...value, { name: name.trim(), level: "beginner" }]);
    setQuery("");
  }

  function removeSkill(name: string) {
    onChange(value.filter((s) => s.name !== name));
  }

  function setLevel(name: string, level: SkillLevel) {
    onChange(value.map((s) => (s.name === name ? { ...s, level } : s)));
  }

  const showAddCustom =
    query.trim().length > 0 &&
    !SKILL_LIBRARY.some((s) => s.toLowerCase() === query.trim().toLowerCase());

  return (
    <div className="flex flex-col gap-4">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex h-12 w-full items-center justify-between rounded-xl border border-border bg-card px-4 text-left text-[0.95rem] text-muted-foreground transition-colors hover:border-accent/40"
          >
            Search or add a skill…
            <ChevronDown className="size-4" aria-hidden="true" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command>
            <CommandInput placeholder="e.g. Video Editing" value={query} onValueChange={setQuery} />
            <CommandList>
              <CommandEmpty>
                {showAddCustom ? (
                  <button
                    type="button"
                    onClick={() => addSkill(query)}
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
                {available.map((skill) => (
                  <CommandItem key={skill} value={skill} onSelect={() => addSkill(skill)}>
                    <Plus className="size-3.5 text-muted-foreground" aria-hidden="true" />
                    {skill}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {value.length > 0 && (
        <ul className="flex flex-col gap-2.5">
          {value.map((skill) => (
            <li
              key={skill.name}
              className="flex flex-col gap-2.5 rounded-xl border border-border/70 bg-card p-3.5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-center gap-2">
                <span className="text-[0.9rem] font-semibold text-primary">{skill.name}</span>
                <button
                  type="button"
                  onClick={() => removeSkill(skill.name)}
                  aria-label={`Remove ${skill.name}`}
                  className="flex size-5 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary hover:text-primary"
                >
                  <X className="size-3.5" aria-hidden="true" />
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {SKILL_LEVELS.map((lvl) => (
                  <button
                    key={lvl.value}
                    type="button"
                    onClick={() => setLevel(skill.name, lvl.value)}
                    className={cn(
                      "rounded-full px-3 py-1.5 text-[0.72rem] font-semibold transition-colors",
                      skill.level === lvl.value
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-muted-foreground hover:bg-secondary/70",
                    )}
                  >
                    {lvl.label}
                  </button>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
