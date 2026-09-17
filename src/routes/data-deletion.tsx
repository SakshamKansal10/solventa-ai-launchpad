import { createFileRoute } from "@tanstack/react-router";
import { Mail } from "lucide-react";
import { Header } from "@/components/solventia/Header";
import { Footer } from "@/components/solventia/Footer";
import { PageBreadcrumb } from "@/components/solventia/PageBreadcrumb";
import { getSiteUrl } from "@/lib/actions/site-url.server";
import { breadcrumbJsonLd } from "@/lib/breadcrumb-jsonld";

export const Route = createFileRoute("/data-deletion")({
  component: DataDeletionPage,
  loader: () => getSiteUrl(),
  head: ({ loaderData: siteUrl }) => {
    const url = siteUrl ?? "/";
    const canonical = `${url.replace(/\/$/, "")}/data-deletion`;
    return {
      meta: [
        { title: "Delete Your Solventia Data" },
        {
          name: "description",
          content: "How to request deletion of your Solventia account and personal data.",
        },
      ],
      links: [{ rel: "canonical", href: canonical }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify(breadcrumbJsonLd("Delete Your Data", "/data-deletion", url)),
        },
      ],
    };
  },
});

const CONTACT_EMAIL = "solventia.in@gmail.com";

const STEPS = [
  {
    n: "1",
    title: "Email us from your account address",
    body: `Write to ${CONTACT_EMAIL} from the email address on your Solventia account.`,
  },
  {
    n: "2",
    title: "Ask for your account and data to be deleted",
    body: "State clearly that you want your Solventia account and associated personal data deleted.",
  },
  {
    n: "3",
    title: "We verify it's really you",
    body: "We may need to confirm you're the account owner before completing the request — this protects your data from being deleted by someone else.",
  },
];

function DataDeletionPage() {
  return (
    <div className="min-h-screen bg-sol-page">
      <Header />
      <main className="pt-[68px] md:pt-[84px]">
        <section className="mx-auto max-w-[720px] px-[18px] py-20 sm:px-6 lg:px-10">
          <PageBreadcrumb page="Delete Your Data" />
          <h1 className="font-display text-[2rem] font-semibold leading-[1.15] text-sol-ink sm:text-[2.5rem]">
            Delete Your Solventia Data
          </h1>
          <p className="mt-4 max-w-[560px] text-[1rem] leading-[1.8] text-sol-secondary">
            You can request deletion of your Solventia account and the personal data associated with
            it at any time.
          </p>

          <ol className="mt-10 flex flex-col gap-6">
            {STEPS.map((s) => (
              <li key={s.n} className="flex items-start gap-4">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-sol-champagne text-[0.85rem] font-semibold text-sol-champagne-deep">
                  {s.n}
                </span>
                <div>
                  <p className="font-display text-[1.05rem] font-semibold text-sol-ink">
                    {s.title}
                  </p>
                  <p className="mt-1 text-[0.95rem] leading-relaxed text-sol-secondary">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>

          <div className="mt-10 rounded-2xl border border-sol-border bg-sol-surface px-5 py-5">
            <p className="text-[0.9rem] leading-relaxed text-sol-secondary">
              Please never include your password, OTP code, or other sign-in credentials in a
              deletion request — we will never ask you for these, and Solventia can verify your
              account without them.
            </p>
          </div>

          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="mt-10 inline-flex items-center gap-2 rounded-xl bg-sol-navy px-6 py-3.5 text-[0.9rem] font-semibold text-white transition-colors hover:bg-sol-navy-soft"
          >
            <Mail className="size-4 text-sol-champagne" aria-hidden="true" />
            Email {CONTACT_EMAIL}
          </a>

          <p className="mt-8 text-[0.85rem] text-sol-secondary">
            See our{" "}
            <a href="/privacy" className="text-sol-violet-deep underline">
              Privacy Policy
            </a>{" "}
            for more on what we collect and how it's used.
          </p>
        </section>
      </main>
      <Footer />
    </div>
  );
}
