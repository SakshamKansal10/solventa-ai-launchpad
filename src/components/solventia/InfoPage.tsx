import type { ReactNode } from "react";

import { Footer } from "@/components/solventia/Footer";
import { Header } from "@/components/solventia/Header";
import { PageBreadcrumb } from "@/components/solventia/PageBreadcrumb";
import { breadcrumbJsonLd } from "@/lib/breadcrumb-jsonld";

/** A public, server-rendered information page: header, breadcrumb, one H1, the content, footer. */
export function InfoPage({
  crumb,
  title,
  lead,
  children,
}: {
  crumb: string;
  title: string;
  lead: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-sol-page">
      <Header />
      <main className="pt-[76px]">
        <section className="mx-auto max-w-[1040px] px-4 pb-16 pt-10 sm:px-8 sm:pt-14">
          <PageBreadcrumb page={crumb} />
          <h1 className="max-w-[18em] font-display text-[clamp(32px,4.4vw,52px)] font-semibold leading-[1.12] tracking-[-0.02em] text-sol-ink">
            {title}
          </h1>
          <p className="mt-5 max-w-[40em] text-[19px] leading-relaxed text-sol-secondary">{lead}</p>
          <div className="mt-10 flex flex-col gap-6">{children}</div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

/** "<Page> — Solventia", description, canonical and the breadcrumb JSON-LD for a public page. */
export function infoHead(
  siteUrl: string | undefined,
  path: string,
  page: string,
  description: string,
) {
  const url = siteUrl ?? "/";
  return {
    meta: [
      { title: `${page} — Solventia` },
      { name: "description", content: description },
      { property: "og:title", content: `${page} — Solventia` },
      { property: "og:description", content: description },
    ],
    links: [{ rel: "canonical", href: `${url.replace(/\/$/, "")}${path}` }],
    scripts: [
      { type: "application/ld+json", children: JSON.stringify(breadcrumbJsonLd(page, path, url)) },
    ],
  };
}

export function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <article className="rounded-[28px] border border-sol-border bg-white p-[clamp(20px,3vw,32px)]">
      <h2 className="text-[clamp(20px,2.2vw,26px)] font-semibold leading-snug text-sol-ink">
        {title}
      </h2>
      <div className="mt-3 flex flex-col gap-2 text-[17px] leading-relaxed text-sol-secondary">
        {children}
      </div>
    </article>
  );
}
