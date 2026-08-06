import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Github, Instagram, Linkedin, Mail, Sparkles, X } from "lucide-react";
import mark from "@/assets/solventia-mark.png";

const SOCIALS = [
  { Icon: Linkedin, label: "LinkedIn", href: "#" },
  { Icon: Instagram, label: "Instagram", href: "#" },
  { Icon: X, label: "X (Twitter)", href: "#" },
  { Icon: Github, label: "GitHub", href: "#" },
];

export function Footer() {
  return (
    <footer className="mx-auto max-w-[1320px] px-6 pb-10 pt-6 lg:px-10">
      <div className="relative flex flex-col gap-8 overflow-hidden rounded-2xl border border-border/60 bg-secondary/60 px-8 py-8 sm:flex-row sm:items-center sm:justify-between">
        <svg
          viewBox="0 0 400 120"
          className="pointer-events-none absolute inset-y-0 right-1/3 h-full w-[400px] text-primary/10"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M-20 100C60 100 90 20 170 20s110 80 190 80"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <path
            d="M-20 118C60 118 90 38 170 38s110 80 190 80"
            stroke="currentColor"
            strokeWidth="1.5"
          />
        </svg>

        <div className="relative flex items-center gap-5">
          <img
            src={mark}
            alt="Solventia"
            width={298}
            height={436}
            loading="lazy"
            className="h-11 w-auto drop-shadow-[0_2px_6px_oklch(0.245_0.055_268_/_0.25)]"
          />
          <p className="max-w-[32ch] text-[0.9rem] leading-[1.8] text-muted-foreground">
            Empowering young dreamers to build meaningful impact with AI.{" "}
            <Sparkles className="inline size-3.5 -translate-y-px text-accent" aria-hidden="true" />
          </p>
        </div>

        <div className="relative flex items-center gap-6">
          {SOCIALS.map(({ Icon, label, href }) => (
            <a
              key={label}
              href={href}
              aria-label={label}
              className="text-primary transition-all duration-300 hover:-translate-y-0.5 hover:text-accent"
            >
              <Icon className="size-5" aria-hidden="true" />
            </a>
          ))}
          <button
            type="button"
            aria-label="Email"
            onClick={() =>
              toast("Contact details coming soon", {
                description: "We're setting up direct email — check back shortly.",
              })
            }
            className="text-primary transition-all duration-300 hover:-translate-y-0.5 hover:text-accent"
          >
            <Mail className="size-5" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="relative mt-6 flex flex-col items-center gap-3 px-2 text-[0.78rem] text-muted-foreground sm:flex-row sm:justify-between">
        <p>© {new Date().getFullYear()} Solventia. All rights reserved.</p>
        <div className="flex items-center gap-6">
          <Link to="/privacy" className="transition-colors hover:text-primary">
            Privacy
          </Link>
          <Link to="/terms" className="transition-colors hover:text-primary">
            Terms
          </Link>
        </div>
      </div>
    </footer>
  );
}
