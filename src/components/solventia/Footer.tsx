import { Instagram, Linkedin, Youtube, Twitter, Sparkles } from "lucide-react";
import mark from "@/assets/solventia-mark.png.asset.json";

const SOCIALS = [
  { Icon: Instagram, label: "Instagram" },
  { Icon: Linkedin, label: "LinkedIn" },
  { Icon: Youtube, label: "YouTube" },
  { Icon: Twitter, label: "Twitter" },
];

export function Footer() {
  return (
    <footer className="mx-auto max-w-[1320px] px-6 pb-16 pt-6 lg:px-10">
      <div className="relative flex flex-col gap-8 overflow-hidden rounded-2xl border border-border/60 bg-secondary/60 px-8 py-8 sm:flex-row sm:items-center sm:justify-between">
        <svg
          viewBox="0 0 400 120"
          className="pointer-events-none absolute inset-y-0 right-1/3 h-full w-[400px] text-[oklch(0.62_0.19_300_/_0.14)]"
          fill="none"
          aria-hidden="true"
        >
          <path d="M-20 100C60 100 90 20 170 20s110 80 190 80" stroke="currentColor" strokeWidth="1.5" />
          <path d="M-20 118C60 118 90 38 170 38s110 80 190 80" stroke="currentColor" strokeWidth="1.5" />
        </svg>

        <div className="relative flex items-center gap-5">
          <img src={mark.url} alt="Solventia" width={320} height={450} loading="lazy" className="h-11 w-auto" />
          <p className="max-w-[32ch] text-[0.9rem] leading-[1.8] text-muted-foreground">
            Empowering young dreamers to build meaningful impact with AI.{" "}
            <Sparkles className="inline size-3.5 -translate-y-px text-accent" aria-hidden="true" />
          </p>
        </div>

        <div className="relative flex items-center gap-7">
          {SOCIALS.map(({ Icon, label }) => (
            <a
              key={label}
              href="#"
              aria-label={label}
              className="text-primary transition-all duration-300 hover:-translate-y-0.5 hover:text-accent"
            >
              <Icon className="size-5" aria-hidden="true" />
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}
