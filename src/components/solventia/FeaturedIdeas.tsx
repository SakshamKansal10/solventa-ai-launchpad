import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Bot, Building2, HeartPulse, Landmark, Leaf, Plus, Sparkles, Sprout } from "lucide-react";
import { cn } from "@/lib/utils";

const IDEAS = [
  {
    icon: Bot,
    category: "AI & Automation",
    title: "AI Study Buddy for Regional Languages",
    hook: "Personalized tutoring that explains concepts in a student's mother tongue.",
    difficulty: "Beginner-friendly",
    detail:
      "Pairs an AI tutor with locally-sourced curricula so students in non-English-medium schools get explanations, practice questions, and doubt-solving in their own language, on any low-end smartphone.",
  },
  {
    icon: Landmark,
    category: "FinTech",
    title: "Micro-Savings Circles App",
    hook: "A digital twist on rotating savings groups for first-time savers.",
    difficulty: "Intermediate",
    detail:
      "Digitizes the trusted rotating-savings-club model with automated contributions, transparent payout schedules, and a credit history that members can use to unlock future micro-loans.",
  },
  {
    icon: Leaf,
    category: "Clean Energy",
    title: "Solar Cold-Chain for Smallholder Farmers",
    hook: "Pay-as-you-go solar cold storage that cuts post-harvest loss.",
    difficulty: "Advanced",
    detail:
      "Deploys shared, solar-powered cold storage units near farm clusters on a pay-per-use model, cutting spoilage between harvest and market and letting farmers time their sales for better prices.",
  },
  {
    icon: HeartPulse,
    category: "Healthcare",
    title: "Rural Telehealth Triage Kiosk",
    hook: "A village kiosk that connects patients to remote doctors in minutes.",
    difficulty: "Advanced",
    detail:
      "A staffed kiosk with basic vitals equipment and video-link access to licensed doctors, routing patients to the right level of care and reducing unnecessary travel to distant hospitals.",
  },
  {
    icon: Sprout,
    category: "Agri & Food Tech",
    title: "Direct-to-Consumer Farm Produce Network",
    hook: "Connects farms directly to households, cutting out layers of middlemen.",
    difficulty: "Intermediate",
    detail:
      "A logistics-light marketplace that batches nearby household orders into single farm pickups, giving farmers a fairer price and households fresher produce at a lower cost.",
  },
  {
    icon: Building2,
    category: "Smart Cities",
    title: "Community Waste-to-Value Exchange",
    hook: "Turns household recycling into redeemable neighborhood rewards.",
    difficulty: "Beginner-friendly",
    detail:
      "Residents drop sorted recyclables at a neighborhood point and earn credits redeemable with local shops, while the venture resells sorted material to recyclers at a better margin.",
  },
];

export function FeaturedIdeas() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section id="explore-ideas" className="mx-auto max-w-[1320px] scroll-mt-24 px-6 py-16 lg:px-10">
      <div className="flex items-center gap-6">
        <Sparkles className="size-5 text-accent" aria-hidden="true" />
        <h2 className="shrink-0 text-[clamp(1.4rem,2.4vw,1.9rem)] font-semibold tracking-[-0.01em] text-primary">
          Featured Startup Ideas
        </h2>
        <span className="h-px flex-1 bg-linear-to-r from-accent/40 to-transparent" />
      </div>
      <p className="mt-4 max-w-[62ch] text-[0.95rem] leading-[1.9] text-muted-foreground">
        A sample of the kind of tailored, validated ideas Solventia surfaces. Tap a card for the
        full picture.
      </p>

      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {IDEAS.map((idea, i) => {
          const open = openIndex === i;
          return (
            <motion.button
              key={idea.title}
              type="button"
              layout
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "200px" }}
              transition={{ duration: 0.6, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
              whileHover={{ y: open ? 0 : -5 }}
              onClick={() => setOpenIndex(open ? null : i)}
              aria-expanded={open}
              className={cn(
                "group flex flex-col rounded-2xl border p-7 text-left shadow-[0_10px_30px_-26px_oklch(0.245_0.055_268_/_0.6)] transition-[box-shadow,border-color] duration-300",
                open
                  ? "border-accent/40 bg-card shadow-[0_34px_60px_-38px_oklch(0.245_0.055_268_/_0.55)]"
                  : "border-border/70 bg-card hover:shadow-[0_34px_60px_-38px_oklch(0.245_0.055_268_/_0.55)]",
              )}
            >
              <div className="flex items-start justify-between gap-4">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent/12 transition-transform duration-300 group-hover:scale-110">
                  <idea.icon className="size-5 stroke-[1.6] text-accent" aria-hidden="true" />
                </span>
                <span className="rounded-full border border-border/70 px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                  {idea.category}
                </span>
              </div>

              <h3 className="mt-6 font-sans text-[0.98rem] font-bold leading-[1.5] text-primary">
                {idea.title}
              </h3>
              <p className="mt-3 text-[0.88rem] leading-[1.8] text-muted-foreground">{idea.hook}</p>

              <AnimatePresence initial={false}>
                {open && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    className="overflow-hidden"
                  >
                    <p className="mt-4 border-t border-border/60 pt-4 text-[0.85rem] leading-[1.8] text-muted-foreground">
                      {idea.detail}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="mt-7 flex items-center justify-between">
                <span className="text-[0.8rem] font-semibold text-accent">{idea.difficulty}</span>
                <span
                  className={cn(
                    "flex size-9 items-center justify-center rounded-full border border-border text-primary transition-all duration-300",
                    open
                      ? "border-primary/30 bg-primary text-primary-foreground"
                      : "group-hover:border-primary/30 group-hover:bg-primary group-hover:text-primary-foreground",
                  )}
                >
                  <Plus
                    className={cn("size-4 transition-transform duration-300", open && "rotate-45")}
                    aria-hidden="true"
                  />
                </span>
              </div>
            </motion.button>
          );
        })}
      </div>
    </section>
  );
}
