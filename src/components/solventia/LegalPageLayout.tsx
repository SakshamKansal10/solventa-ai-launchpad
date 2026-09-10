import type { ReactNode } from "react";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { PageBreadcrumb } from "./PageBreadcrumb";

export interface LegalSection {
  id: string;
  title: string;
  body: ReactNode;
}

/** Shared structure for /privacy and /terms — a real legal/information
 * page prioritizes readability over decoration: pearl background, navy
 * text, a narrow ~860px reading column, generous spacing, and a
 * section-jump list on desktop (a genuine navigation aid on a long page,
 * not decorative chrome). */
export function LegalPageLayout({
  pageLabel,
  title,
  lastUpdated,
  intro,
  sections,
}: {
  pageLabel: string;
  title: string;
  lastUpdated: string;
  intro?: ReactNode;
  sections: LegalSection[];
}) {
  return (
    <div className="min-h-screen bg-sol-page">
      <Header />
      <main className="pt-[68px] md:pt-[84px]">
        <div className="mx-auto max-w-[1100px] px-[18px] pb-24 pt-12 sm:px-6 lg:px-10">
          <PageBreadcrumb page={pageLabel} />

          <h1 className="font-display text-[2rem] font-semibold leading-[1.15] text-sol-ink sm:text-[2.5rem]">
            {title}
          </h1>
          <p className="mt-3 text-[0.85rem] text-sol-secondary">Last updated: {lastUpdated}</p>
          {intro && (
            <p className="mt-6 max-w-[820px] text-[1rem] leading-[1.8] text-sol-secondary">
              {intro}
            </p>
          )}

          <div className="mt-12 grid gap-10 lg:grid-cols-[200px_1fr]">
            <nav
              aria-label="Sections"
              className="hidden self-start rounded-2xl border border-sol-border bg-sol-surface p-4 lg:sticky lg:top-24 lg:block"
            >
              <p className="text-[0.68rem] font-semibold uppercase tracking-wide text-sol-muted">
                On this page
              </p>
              <ol className="mt-3 flex flex-col gap-2">
                {sections.map((s) => (
                  <li key={s.id}>
                    <a
                      href={`#${s.id}`}
                      className="text-[0.82rem] leading-snug text-sol-secondary transition-colors hover:text-sol-violet-deep"
                    >
                      {s.title}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>

            <div className="flex max-w-[820px] flex-col gap-12">
              {sections.map((s) => (
                <section key={s.id} id={s.id} className="scroll-mt-24">
                  <h2 className="font-display text-[1.3rem] font-semibold text-sol-ink sm:text-[1.5rem]">
                    {s.title}
                  </h2>
                  <div className="prose-legal mt-3 flex flex-col gap-3 text-[1rem] leading-[1.8] text-sol-secondary">
                    {s.body}
                  </div>
                </section>
              ))}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
