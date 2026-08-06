import { Link } from "@tanstack/react-router";
import { ArrowLeft, PenLine } from "lucide-react";

export function LegalPlaceholder({ title, description }: { title: string; description: string }) {
  return (
    <section className="mx-auto max-w-[760px] px-6 pb-24 pt-40 lg:px-10 lg:pt-48">
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-[0.85rem] font-medium text-muted-foreground transition-colors hover:text-primary"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to Solventia
      </Link>

      <h1 className="mt-8 font-display text-[clamp(2rem,4vw,2.8rem)] font-semibold tracking-[-0.01em] text-primary">
        {title}
      </h1>
      <p className="mt-3 text-[1rem] leading-[1.8] text-muted-foreground">{description}</p>

      <div className="mt-10 flex items-start gap-3 rounded-2xl border border-dashed border-accent/40 bg-accent/[0.06] px-5 py-4">
        <PenLine className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden="true" />
        <p className="text-[0.88rem] leading-[1.8] text-muted-foreground">
          <span className="font-semibold text-primary">This page isn&rsquo;t final yet.</span> The
          full {title.toLowerCase()} is being finalized with legal review and will be published here
          before Solventia is publicly available. In the meantime, reach out via the contact details
          in the footer with any questions.
        </p>
      </div>
    </section>
  );
}
