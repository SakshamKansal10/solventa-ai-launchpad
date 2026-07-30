import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";
import mark from "@/assets/solventia-mark.png.asset.json";

const NAV = [
  "How It Works",
  "Explore Ideas",
  "Roadmaps",
  "For NGOs",
  "Resources",
  "About Us",
];

export function Header() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${
        scrolled
          ? "border-b border-border/60 bg-background/70 backdrop-blur-xl"
          : "border-b border-transparent"
      }`}
    >
      <div className="mx-auto flex h-24 max-w-[1320px] items-center gap-10 px-6 lg:px-10">
        <a href="/" className="flex shrink-0 items-center gap-4" aria-label="Solventia home">
          <img
            src={mark.url}
            alt="Solventia logo"
            width={320}
            height={450}
            className="h-12 w-auto"
          />
          <span className="hidden leading-none sm:block">
            <span className="block font-display text-[1.6rem] font-semibold tracking-[0.22em] text-primary">
              SOLVENTIA
            </span>
            <span className="mt-1 block text-[0.58rem] font-semibold tracking-[0.34em] text-accent">
              VALIDATE • BUILD • ELEVATE
            </span>
          </span>
        </a>

        <nav className="mx-auto hidden items-center gap-8 xl:flex">
          {NAV.map((item) => (
            <a
              key={item}
              href="#"
              className="group relative text-[0.82rem] font-medium text-muted-foreground transition-colors hover:text-primary"
            >
              {item}
              <span className="absolute -bottom-1.5 left-0 h-px w-0 bg-accent transition-all duration-300 group-hover:w-full" />
            </a>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-3 xl:ml-0">
          <motion.a
            href="#"
            whileHover={{ y: -1 }}
            className="hidden rounded-full border border-border bg-card/70 px-6 py-3 text-[0.82rem] font-semibold text-primary transition-colors hover:border-primary/30 sm:block"
          >
            Sign In
          </motion.a>
          <motion.a
            href="#"
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
            className="group flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-[0.82rem] font-semibold text-primary-foreground shadow-[0_10px_30px_-12px_oklch(0.245_0.055_268_/_0.6)]"
          >
            Get Started
            <ArrowRight className="size-4 text-accent transition-transform duration-300 group-hover:translate-x-1" />
          </motion.a>
        </div>
      </div>
    </header>
  );
}
